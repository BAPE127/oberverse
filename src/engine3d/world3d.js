// The 3D scene manager (docs/RENDERING.md 7): a pure function of Game state, redrawn each frame. It owns the WebGL renderer,
// the scene, the camera and the per-map scenes (ground, buildings, props, people, vehicles); the 2D Renderer (`host`) owns
// the camera numbers, the building open/roofed state and the overlays, and asks this to draw the solid world.
//
// What is built lazily and dropped when far: ground quads (ground3d.js), buildings (buildings3d.js), props (the
// registry, else fallbacks3d.js), figures and vehicles. Nothing is created per frame beyond a few small arrays.
import { THREE } from './three.js';
import * as lib from './lib3d.js';
import { disposeTree } from './lib3d.js';
import { cameraFrame, applyFrame, TILE } from './camera3d.js';
import { Ground3D } from './ground3d.js';
import { buildRoofed, buildOpen, buildRoom, buildStreetWalls, seeThroughN, HOLES_SHARED, HOLES, setHole, endHoles, height3d } from './buildings3d.js';
import { Figure, stepFacing, newMotion, personKey } from './people3d.js';
import { LightRig, presetFor, lampFactor } from './light3d.js';
import { PROPS, VEHICLES } from './registry3d.js';
import './props3d.js';
import './vehicles3d.js';
import { syncMachines, disposeMachines } from './machines3d.js';
import { fallbackProp, fallbackVehicle } from './fallbacks3d.js';
import { behindBox, hidesPoint, facingVector } from '../engine/iso.js';
import { buildingBox } from '../engine/isoBuildings.js';
import { FLAT_PROPS } from '../engine/drawWorld.js';
import { lookOf, isGunLook } from '../engine/drawPixelWeapons.js';
import { isDown } from '../systems/combat.js';
import { wrathLift, wrathPlayerAlpha } from '../engine/wrath.js';
import { floatLift } from '../engine/cardMagic.js';

const KEEP_FRAMES = 360; // frames an unseen thing is kept before it is freed
const BUDGET_MS = 9; // building painting per frame (more on the first frames of a map)
const LAMP_RE = /lamp|lantern/;
const SEA = '#2d6f8f';

/** Is WebGL running on the CPU (SwiftShader, llvmpipe, a software rasteriser)? Then the shadow map and multisampling are too dear. */
export function softwareGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|softpipe/i.test(name);
  } catch { return false; }
}

class MapScene {
  constructor(map) {
    this.map = map;
    this.id = map.id;
    this.group = new THREE.Group();
    this.groundGroup = new THREE.Group();
    this.bldGroup = new THREE.Group();
    this.propGroup = new THREE.Group();
    this.dynGroup = new THREE.Group(); // people and vehicles
    this.group.add(this.groundGroup, this.bldGroup, this.propGroup, this.dynGroup);
    this.buildings = new Map(); // building record → entry
    this.props = new Map(); // prop record → entry
    this.walls = null; // street walls, or an interior's own walls
    this.last = 0;
  }
}

export class World3D {
  /** One WebGL context per canvas for the life of the page: a new Renderer (new game, load) reuses it. Returns null when WebGL is unavailable. */
  static get(canvas, host) {
    let w = canvas.__oberWorld;
    if (w && !w.lost) { w.reset(host); return w; }
    try {
      w = new World3D(canvas, host);
      canvas.__oberWorld = w;
      return w;
    } catch (err) {
      console.warn('[oberverse] WebGL is not available; using the 2D isometric view.', err?.message || err);
      return null;
    }
  }

  constructor(canvas, host) {
    this.canvas = canvas;
    this.software = softwareGL();
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: !this.software, alpha: false, powerPreference: 'high-performance' });
    if (!this.gl.getContext()) throw new Error('no WebGL context');
    this.gl.setPixelRatio(1);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.host?.glLost?.(); });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
    this.rig = new LightRig(this.scene);
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: SEA }));
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.y = -0.06;
    this.sea.receiveShadow = false;
    this.scene.add(this.sea);
    this.shared = { roofTex: new Map(), wallMat: new Map() };
    this.mapScenes = new Map();
    this.figures = new Map(); // actor → { fig, motion, key, last }
    this.vehicles = new Map(); // car object → { obj, key, last }
    this.cands = [];
    this.occluders = [];
    this.frameNo = 0;
    this.size = { w: 0, h: 0 };
    this.stats = { calls: 0, triangles: 0, quads: 0, buildings: 0, props: 0, figures: 0, lights: 0 };
    this.host = null;
    this.ground = null;
    this.reset(host);
  }

  /** Drop everything of the previous game and bind to the new Renderer. */
  reset(host) {
    this.host = host;
    if (this.software && host.quality === 'high' && !host.qualityChosen) host.quality = 'low'; // (a CPU rasteriser: no shadow map unless asked for)
    for (const ms of this.mapScenes.values()) this.disposeMap(ms);
    this.mapScenes.clear();
    for (const e of this.figures.values()) e.fig.dispose();
    this.figures.clear();
    for (const e of this.vehicles.values()) { e.obj.removeFromParent(); disposeTree(e.obj); }
    this.vehicles.clear();
    disposeMachines(this);
    if (this.ground) this.ground.dispose();
    this.ground = new Ground3D(host);
    this.freshFrames = 3;
  }

  resize(W, H) {
    if (this.size.w === W && this.size.h === H) return;
    this.size = { w: W, h: H };
    this.gl.setSize(W, H, false);
  }

  disposeMap(ms) {
    for (const b of ms.buildings.values()) this.disposeBuilding(b);
    for (const p of ms.props.values()) disposeTree(p.obj);
    if (ms.walls) disposeTree(ms.walls);
    this.scene.remove(ms.group);
    this.ground?.dropMap(ms.id);
  }

  disposeBuilding(e) {
    if (e.roofed) { e.roofed.group.removeFromParent(); disposeTree(e.roofed.group); }
    if (e.open) { e.open.removeFromParent(); disposeTree(e.open); }
  }

  dispose() {
    this.reset(this.host);
    this.rig.dispose();
  }

  sceneFor(map) {
    let ms = this.mapScenes.get(map.id);
    if (ms && ms.map !== map) { this.disposeMap(ms); this.mapScenes.delete(map.id); ms = null; }
    if (!ms) {
      ms = new MapScene(map);
      this.mapScenes.set(map.id, ms);
      this.scene.add(ms.group);
    }
    return ms;
  }

  // ------------------------------------------------------------------ the frame
  render(dt) {
    const host = this.host;
    const g = host.game;
    if (this.lost) return false;
    this.frameNo++;
    const W = host.canvas.width;
    const H = host.canvas.height;
    this.resize(W, H);
    applyFrame(this.camera, cameraFrame(host.cam, W, H, host.shk));
    const t0 = performance.now();
    this.deadline = t0 + (this.freshFrames > 0 ? 120 : BUDGET_MS);
    if (this.freshFrames > 0) this.freshFrames--;
    this.occluders = [];
    this.foci = this.buildFoci();
    this.cands.length = 0;
    this.count = { buildings: 0, props: 0, figures: 0, vehicles: 0 };
    const darkness = g.clock.darkness;
    const lamp = lampFactor(darkness);
    const outdoor = host.layers.some((L) => L.map.kind !== 'interior');
    const wv = host.worldBox(host.view, 80, 480); // (a tall building's foot is below the view)
    this.viewTiles = { x0: wv.x / TILE, y0: wv.y / TILE, x1: (wv.x + wv.w) / TILE, y1: (wv.y + wv.h) / TILE };
    for (const ms0 of this.mapScenes.values()) ms0.group.visible = false; // (a map that left the layers must not stay on screen at its old offset)
    const shown = new Set();
    for (const L of host.layers) {
      const lm = L.map;
      const ms = this.sceneFor(lm);
      if (host.hiddenMaps.has(lm.id)) { ms.group.visible = false; continue; }
      ms.group.visible = true;
      ms.last = this.frameNo;
      ms.group.position.set(L.x / TILE, 0, L.y / TILE);
      shown.add(ms);
      this.updateMap(ms, L, { x0: (wv.x - L.x) / TILE, y0: (wv.y - L.y) / TILE, x1: (wv.x + wv.w - L.x) / TILE, y1: (wv.y + wv.h - L.y) / TILE }, lamp);
    }
    this.updateActors(shown, lamp);
    this.updateHoles();
    syncMachines(this, g, this.propCtx || {}, Math.min(host.lastDt || 0.016, 0.1));
    this.ground.endFrame();
    // the world's background: the sea beyond a street's edge, a sky behind a room alone
    const P = presetFor(darkness, outdoor);
    const aloft = host.layers.some((L) => L.map.def?.aloft && !L.map.def.aloft.roof);
    this.scene.background = this.bgColor || (this.bgColor = new THREE.Color());
    this.bgColor.set(aloft ? '#6f8aa6' : outdoor ? P.bg : '#1b1620');
    if (aloft) this.bgColor.lerp(new THREE.Color('#10141e'), darkness * 0.8);
    const tx = this.camera.position.x - 200 / Math.sqrt(3);
    const tz = this.camera.position.z - 200 / Math.sqrt(3);
    this.sea.visible = outdoor;
    this.sea.position.x = tx; this.sea.position.z = tz;
    const p = g.player;
    this.rig.update(darkness, outdoor, [p.x / TILE, p.y / TILE], this.cands, host.quality);
    this.gl.render(this.scene, this.camera);
    const info = this.gl.info.render;
    const s = this.stats;
    s.calls = info.calls; s.triangles = info.triangles; s.quads = this.ground.size; s.lights = this.rig.used;
    Object.assign(s, this.count, { geometries: this.gl.info.memory.geometries, textures: this.gl.info.memory.textures, software: this.software });
    s.frameMs = performance.now() - t0;
    this.gl.info.reset();
    // drop what has been out of sight for a long while
    if (this.frameNo % 60 === 0) this.sweep();
    // a car or a person that was not placed this frame (removed, left the map, boarded) must not linger where it last stood
    for (const e of this.vehicles.values()) if (e.last !== this.frameNo) e.obj.visible = false;
    for (const e of this.figures.values()) if (e.last !== this.frameNo) e.fig.root.visible = false;
    host.occluders = this.occluders;
    return !this.gl.getContext().isContextLost();
  }

  sweep() {
    const limit = this.frameNo - KEEP_FRAMES;
    for (const [id, ms] of this.mapScenes) if (ms.last < limit && !ms.group.visible) { this.disposeMap(ms); this.mapScenes.delete(id); }
    for (const ms of this.mapScenes.values()) {
      for (const [b, e] of ms.buildings) if (e.last < limit) { this.disposeBuilding(e); ms.buildings.delete(b); }
      for (const [p, e] of ms.props) if (e.last < limit) { e.obj.removeFromParent(); disposeTree(e.obj); ms.props.delete(p); }
    }
    for (const [a, e] of this.figures) if (e.last < limit) { e.fig.dispose(); this.figures.delete(a); }
    for (const [c, e] of this.vehicles) if (e.last < limit) { e.obj.removeFromParent(); disposeTree(e.obj); this.vehicles.delete(c); }
  }

  // ------------------------------------------------------------------ one map
  updateMap(ms, L, r, lamp) {
    const host = this.host;
    const lm = ms.map;
    const g = host.game;
    const night = g.clock.darkness > 0.45;
    const interior = lm.kind === 'interior';
    this.ground.show(lm, ms.groundGroup, r, interior ? 0.045 : 0);
    const rec = host.overlaid.get(lm.id);
    const ox = L.x / TILE; const oz = L.y / TILE;
    // ---- buildings (a street's)
    if (!interior) {
      const focus = { x: g.player.x, y: g.player.y };
      for (const b of lm.buildings) {
        if (b.facility && g.war.facilityState(b.facility) !== 'built') continue;
        if (b.hall && !g.aero.hallBuilt(b.hall)) continue;
        if (b.x + b.w < r.x0 - 2 || b.x > r.x1 + 2 || b.y + b.h < r.y0 - 2 || b.y > r.y1 + 2) { const e0 = ms.buildings.get(b); if (e0) { if (e0.roofed) e0.roofed.group.visible = false; if (e0.open) e0.open.visible = false; } continue; }
        let e = ms.buildings.get(b);
        if (!e) { e = { b, roofed: null, open: null, last: 0, lit: 0, litAt: -9 }; ms.buildings.set(b, e); }
        e.last = this.frameNo;
        this.count.buildings++;
        const orec = b.interior ? host.overlaid.get(b.interior) : null;
        const t = orec ? orec.st.t : 0;
        const H3 = height3d(b);
        if (t < 1 && !e.roofed && performance.now() < this.deadline) {
          e.roofed = buildRoofed(b, this.shared);
          for (const m of e.roofed.mats) seeThroughN(m);
          ms.bldGroup.add(e.roofed.group);
        }
        if (t > 0 && !e.open) {
          const I = g.maps.get(b.interior);
          if (I) {
            e.open = buildOpen(b, I, this.shared);
            ms.bldGroup.add(e.open);
          }
        }
        if (e.roofed) {
          e.roofed.group.visible = t < 1;
          e.roofed.group.scale.y = t > 0 ? Math.max(0.02, 1 - t) : 1;
          // lit windows follow the night and whether anyone is home
          if (night || e.roofed.emissive[0]?.emissiveIntensity > 0) {
            if (this.frameNo - e.litAt > 30) { e.lit = e.roofed.kind === 'tower' ? 1 : host.buildingLit(b) ? 1 : 0; e.litAt = this.frameNo; }
            const k = lamp * e.lit;
            for (const m of e.roofed.emissive) m.emissiveIntensity = (m.userData.emissiveBase || 0.8) * k;
          }
          // the see-through hole (shader, shared): does this roofed building stand between the camera and a focus? (the hole itself is set in `updateHoles`)
          if (t < 0.01 && this.foci.length) {
            const box = buildingBox(b, L); const top = Math.max(H3, e.roofed.top - 0.5) * TILE;
            for (let k = 0; k < this.foci.length; k++) {
              const f = this.foci[k];
              if (!behindBox(f, box) || !hidesPoint(box, top, f.x, f.y, f.z)) continue;
              f.covered = true;
              if (k === 0) this.occluders.push({ box, h: top, fade: 0, hx: f.x - f.y, hy: (f.x + f.y) / 2 - f.z, r: f.rx, f });
            }
          }
          if (night && e.roofed.lights.length && t < 0.5) for (const l of e.roofed.lights) { if (l.door && !e.lit && !l.tower) continue; this.cands.push({ x: l.x + ox, y: l.y, z: l.z + oz, color: l.color, intensity: l.intensity, distance: l.distance, prio: l.prio }); }
        }
        if (e.open) {
          e.open.visible = t > 0;
          e.open.scale.y = Math.max(0.02, t);
          if (t > 0.5) this.roomLights(b.x + ox, b.y + oz, b.w, b.h);
        }
      }
      // free-standing wall tiles of the street, built once for the whole map
      if (host.hasWalls(lm) && !ms.walls) { ms.walls = buildStreetWalls(lm); ms.bldGroup.add(ms.walls); }
    } else if (!rec) {
      // a room entered as a scene change (or an aloft floor): drawn open and alone, its walls built once
      if (!ms.walls) {
        const aloft = lm.def?.aloft;
        const pal = aloft && !aloft.roof ? { wall: '#3a3e48', trim: '#3a3e48', glass: '#8fb8d0' } : { wall: '#d8cdb8', trim: '#5a4a3a' };
        ms.walls = buildRoom(lm, pal, { H: 2.3, roofed: Boolean(aloft?.roof) }, this.shared);
        ms.bldGroup.add(ms.walls);
      }
      this.roomLights(ox, oz, lm.width, lm.height);
    }
    // ---- props
    this.updateProps(ms, L, r, night, lamp, ox, oz);
  }

  /**
   * What must not stay hidden: the player (or the car being driven, with room for its length), and the person the player is
   * talking to or about to (the highlighted one). Positions are map-frame px, as the simulation has them; `rx`, `ry` the hole's
   * half sizes in iso px (an upright ellipse, scaled by the camera zoom when drawn).
   */
  buildFoci() {
    const host = this.host; const g = host.game; const p = g.player; const out = [];
    const mk = (key, x, y, z, rx, ry) => ({ key, x, y, z, rx, ry, covered: false, fade: 0 });
    const car = p.driving ? (g.vehicles?.carsOn(p.map) || []).find((c) => c.id === p.driving) : null;
    if (car) { const m = g.content.vehicles.models[car.model]; out.push(mk('car', car.x, car.y, 14, 56 + (m?.len || 73) * 0.9, 92)); }
    else if (!host.hidePlayer && p.riding == null) out.push(mk('player', p.x, p.y, 26, 64, 96));
    const h = host.highlight;
    if (h?.kind === 'npc' && out.length) { const n = g.npcs.get(h.id); if (n && n.map === p.map && n.riding == null && Math.hypot(n.x - p.x, n.y - p.y) < 8 * TILE) out.push(mk('npc', n.x, n.y, 26, 52, 84)); }
    return out;
  }

  /** The shared hole uniforms (smoke test and tools read them). */
  get holeUniforms() { return HOLES_SHARED; }

  /** Does a tall prop stand between the camera and a focus (the sight line runs up and to the south-east)? */
  propCovers(e, L) {
    const vb = e.vb;
    const box = { x0: L.x + vb.min.x * TILE, y0: L.y + vb.min.z * TILE, x1: L.x + vb.max.x * TILE, y1: L.y + vb.max.z * TILE };
    for (const f of this.foci) if (!f.covered && behindBox(f, box) && hidesPoint(box, vb.max.y * TILE, f.x, f.y, f.z)) f.covered = true;
  }

  /** Ease each focus's hole in and out over real time and hand the active ones to the shader. */
  updateHoles() {
    const host = this.host;
    const dt = Math.min(host.lastDt || 0.016, 0.1);
    const fades = this.fades || (this.fades = new Map());
    this.camera.updateMatrixWorld();
    const W = host.canvas.width; const H = host.canvas.height; const z = host.cam.zoom;
    let n = 0;
    for (const f of this.foci) {
      const s = fades.get(f.key) || { v: 0 }; fades.set(f.key, s);
      s.v = f.covered ? Math.min(1, s.v + dt / 0.2) : Math.max(0, s.v - dt / 0.3);
      f.fade = s.v;
      if (s.v > 0.01 && n < HOLES && !this.noHoles) { const k = s.v * s.v * (3 - 2 * s.v); setHole(HOLES_SHARED, n++, this.camera, W, H, f.x / TILE, f.z / TILE, f.y / TILE, f.rx * z * k, f.ry * z * k); }
    }
    for (const k of fades.keys()) if (!this.foci.some((f) => f.key === k)) fades.delete(k);
    endHoles(HOLES_SHARED, n);
    HOLES_SHARED.eps.value = 0.04 / (this.camera.far - this.camera.near);
    for (const o of this.occluders) o.fade = o.f ? o.f.fade : o.fade;
  }

  /** Lamps for an open room: more of them in a long room. */
  roomLights(x, z, w, h) {
    const n = Math.max(1, Math.round(w / 7));
    for (let i = 0; i < n; i++) this.cands.push({ x: x + (i + 0.5) * (w / n), y: 2.1, z: z + h / 2, color: '#ffd9a0', intensity: 14, distance: 10, prio: 6, always: true });
  }

  updateProps(ms, L, r, night, lamp, ox, oz) {
    const host = this.host;
    const g = host.game;
    const lm = ms.map;
    const ctx = this.propCtx || (this.propCtx = { THREE, lib, map: null, game: null, night: false, state: null, time: 0 });
    ctx.map = lm; ctx.game = g; ctx.night = night; ctx.time = host.time;
    for (const p of lm.props) {
      const w = p.w || 1; const h = p.h || 1;
      let e = ms.props.get(p);
      if (p.x + w < r.x0 - 3 || p.x > r.x1 + 3 || p.y + h < r.y0 - 3 || p.y > r.y1 + 3 || !host.propVisible(p)) { if (e) e.obj.visible = false; continue; }
      ctx.state = g.world.props[p.id];
      if (!e) {
        if (performance.now() > this.deadline) continue;
        e = this.makeProp(ms, p, ctx);
        ms.props.set(p, e);
      }
      e.last = this.frameNo;
      e.obj.visible = true;
      this.count.props++;
      if (e.vb && this.foci.length) this.propCovers(e, L);
      const u = e.obj.userData;
      if (u.update) {
        u.update(p, ctx, Math.min(host.lastDt || 0.016, 0.1));
        if (u.key !== undefined && u.key !== e.key) { e.obj.removeFromParent(); disposeTree(e.obj); e = this.makeProp(ms, p, ctx); ms.props.set(p, e); e.last = this.frameNo; }
      }
      if (night && lamp > 0.02) {
        for (const l of e.lights) this.cands.push({ x: e.obj.position.x + l.x + ox, y: l.y, z: e.obj.position.z + l.z + oz, color: l.color, intensity: l.intensity, distance: l.distance || l.dist || 8, prio: 0 });
      }
    }
  }

  makeProp(ms, p, ctx) {
    const build = PROPS.get(p.type);
    let obj = null;
    if (build) { try { obj = build(p, ctx); } catch (err) { console.warn(`[oberverse] prop builder ${p.type} failed`, err); } }
    const flat = FLAT_PROPS.has(p.type);
    if (!obj) obj = fallbackProp(p, flat);
    lib.placeProp(obj, p);
    obj.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) seeThroughN(m); });
    const animated = Boolean(obj.userData.update);
    if (!animated) obj.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
    else { obj.updateMatrix(); }
    ms.propGroup.add(obj);
    const lights = [].concat(obj.userData.lights || []);
    if (obj.userData.fallback && LAMP_RE.test(p.type)) lights.push({ x: (p.w || 1) / 2, y: 2.6, z: (p.h || 1) / 2, color: '#ffd9a0', intensity: 7, distance: 7 });
    // the model's whole box (canopies and arms included), for the see-through test: only things taller than a knee can hide anyone
    obj.updateMatrixWorld(true);
    const vb = new THREE.Box3().setFromObject(obj);
    return { obj, key: obj.userData.key, last: this.frameNo, lights, vb: vb.max.y > 0.9 ? vb : null };
  }

  // ------------------------------------------------------------------ people and vehicles
  updateActors(shown, lamp) {
    const host = this.host;
    const g = host.game;
    const dt = Math.min(host.lastDt || 0.016, 0.1);
    const now = host.time;
    const byMap = new Map();
    const layerOf = new Map();
    for (const L of host.layers) { const ms = this.mapScenes.get(L.map.id); layerOf.set(L.map.id, L); if (ms && shown.has(ms)) byMap.set(L.map.id, ms); }
    const clock = g.clock.total;
    for (const npc of g.npcs.values()) {
      const ms = byMap.get(npc.map);
      if (!ms || npc.riding != null) continue;
      const lay = layerOf.get(npc.map);
      const px = npc.x / TILE + lay.x / TILE; const pz = npc.y / TILE + lay.y / TILE;
      if (!this.nearView(px, pz)) { const e0 = this.figures.get(npc); if (e0) e0.fig.root.visible = false; continue; }
      const down = isDown(npc, clock);
      const fight = npc.hostile?.mode === 'fight' && npc.profile.combat?.weapon ? g.content.items[npc.profile.combat.weapon] : null;
      const nw = fight ? lookOf(fight) : null;
      const wrathVictim = g.combat.wrath?.npcId === npc.id;
      const app = npc.profile.appearance;
      let aim = null;
      if (nw && npc.hostile?.mode === 'fight' && isGunLook(nw)) aim = { x: g.player.x - npc.x, y: g.player.y - npc.y };
      let yawFacing = null;
      if (wrathVictim) yawFacing = facingVector(npc.facing);
      this.placeFigure(npc, ms, app, nw, null, { x: px, z: pz, down, sleeping: npc.activity === 'sleep', moving: wrathVictim ? false : Boolean(npc.moving), lift: wrathVictim ? wrathLift(g, g.combat.wrath) / TILE : npc.profile.float ? (npc.activity === 'sleep' ? 4 : floatLift(npc, now)) / TILE : 0, aim, facingVec: yawFacing, alpha: 1, now, dt });
    }
    // the player: alone in the street, or in the car (not drawn: the car is)
    const p = g.player;
    const pms = byMap.get(p.map);
    const aboard = p.driving || (p.riding !== null && p.riding !== undefined);
    const pAlpha = g.combat.wrath ? wrathPlayerAlpha(g, g.combat.wrath) : 1;
    const pe = this.figures.get(p);
    if (pms && !host.hidePlayer && !aboard && pAlpha > 0) {
      const held = lookOf(g.combat.equipped());
      let aim = null;
      if (p.aim && (g.combat.equipped().weapon.kind === 'gun' || g.combat.cooldown > 0)) aim = p.aim;
      this.placeFigure(p, pms, p.appearance, held, null, { x: p.x / TILE, z: p.y / TILE, down: false, sleeping: false, moving: Boolean(p.moving), lift: 0, aim, facingVec: null, alpha: pAlpha, now, dt });
    } else if (pe) pe.fig.root.visible = false;
    // vehicles
    if (g.vehicles) {
      const models = g.content.vehicles.models;
      for (const ms of byMap.values()) {
        const lm = ms.map;
        const lay = layerOf.get(lm.id);
        for (const car of g.vehicles.carsOn(lm.id)) {
          const m = models[car.model];
          if (!m || !this.nearView(car.x / TILE + lay.x / TILE, car.y / TILE + lay.y / TILE, 6)) { const e0 = this.vehicles.get(car); if (e0) e0.obj.visible = false; continue; }
          const driven = car.id === p.driving;
          this.placeVehicle(car, ms, this.modelRec(car.model, m), car.model, car.color, car, dt, driven || Boolean(car.chase), lay, lamp);
        }
      }
    }
    if (g.transit) {
      const models = g.content.vehicles.models;
      for (const ms of byMap.values()) {
        const lm = ms.map;
        const lay = layerOf.get(lm.id);
        for (const f of g.transit.on(lm.id)) {
          if (!this.nearView(f.x / TILE + lay.x / TILE, f.y / TILE + lay.y / TILE, 8)) { const e0 = this.vehicles.get(f); if (e0) e0.obj.visible = false; continue; }
          const isBus = f.kind === 'bus';
          const rec = isBus ? this.busRec(f) : this.modelRec(f.model, models[f.model]);
          if (!rec) continue;
          this.placeVehicle(f, ms, rec, isBus ? `bus:${f.line}` : f.model, f.color, f, dt, false, lay, lamp);
        }
      }
    }
  }

  nearView(x, z, pad = 3) {
    const r = this.viewTiles;
    if (!r) return true;
    return x > r.x0 - pad && x < r.x1 + pad && z > r.y0 - pad && z < r.y1 + pad;
  }

  modelRec(id, m) {
    if (!m) return null;
    const c = this.modelRecs || (this.modelRecs = new Map());
    let r = c.get(id);
    if (!r || r.__src !== m) { r = { ...m, id }; Object.defineProperty(r, '__src', { value: m, enumerable: false }); c.set(id, r); }
    return r;
  }

  busRec(f) {
    const c = this.modelRecs || (this.modelRecs = new Map());
    const key = `bus|${f.len}|${f.wid}|${f.color}`;
    let r = c.get(key);
    if (!r) { r = { body: 'bus', len: f.len || 150, wid: f.wid || 46, colors: [f.color || '#2f6b4f'] }; c.set(key, r); }
    return r;
  }

  placeFigure(actor, ms, app, holding, kit, s) {
    let e = this.figures.get(actor);
    const key = personKey(app, holding, kit);
    if (e && e.key !== key) { e.fig.dispose(); this.figures.delete(actor); e = null; }
    if (!e) {
      if (performance.now() > this.deadline + 10) return;
      e = { fig: new Figure(app, holding, kit), motion: newMotion(actor), key, last: 0 };
      this.figures.set(actor, e);
    }
    e.last = this.frameNo;
    const fig = e.fig;
    if (fig.root.parent !== ms.dynGroup) ms.dynGroup.add(fig.root);
    fig.root.visible = true;
    this.count.figures++;
    const yaw = stepFacing(e.motion, actor, s.now, s.dt, facingVector, s.aim || (s.facingVec ? { x: s.facingVec[0], y: s.facingVec[1] } : null));
    const walk = s.moving && !s.down ? (actor.animTime || s.now) * 11 : null;
    const lying = s.down || s.sleeping;
    fig.pose({ x: s.x - ms.group.position.x, y: 0, z: s.z - ms.group.position.z, yaw, phase: walk, lying, lift: s.lift });
    fig.setAlpha(s.alpha);
  }

  placeVehicle(v, ms, model, modelKey, color, live, dt, lamps, lay, lamp) {
    let e = this.vehicles.get(v);
    if (e && e.key !== modelKey) { e.obj.removeFromParent(); disposeTree(e.obj); this.vehicles.delete(v); e = null; }
    if (!e) {
      if (performance.now() > this.deadline + 10) return;
      const build = VEHICLES.get(model.id) || VEHICLES.get(model.body);
      let obj = null;
      if (build) { try { obj = build(model, this.propCtx || {}); } catch (err) { console.warn(`[oberverse] vehicle builder ${model.id || model.body} failed`, err); } }
      if (!obj) obj = fallbackVehicle(model, color);
      e = { obj, key: modelKey, last: 0, color: null };
      this.vehicles.set(v, e);
    }
    e.last = this.frameNo;
    const obj = e.obj;
    if (obj.parent !== ms.dynGroup) ms.dynGroup.add(obj);
    obj.visible = true;
    this.count.vehicles++;
    obj.position.set(live.x / TILE, 0, live.y / TILE);
    obj.rotation.y = -live.angle; // the model's +x is forward: a three.js y-rotation of -angle turns it to the simulation's angle (x east, y south)
    if (color && e.color !== color && obj.userData.setColor) { obj.userData.setColor(color); e.color = color; }
    if (obj.userData.update) obj.userData.update(live, this.propCtx || {}, dt);
    if (lamps && lamp > 0.02) {
      const len = (model.len || 73) / TILE;
      const c = Math.cos(live.angle); const s = Math.sin(live.angle);
      const ox = lay.x / TILE; const oz = lay.y / TILE;
      this.cands.push({ x: live.x / TILE + ox + c * (len / 2 + 2.2), y: 0.9, z: live.y / TILE + oz + s * (len / 2 + 2.2), color: '#fff0c8', intensity: 22, distance: 11, prio: 20 });
    }
  }
}

