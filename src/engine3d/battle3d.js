// The war tactical battle in 3D (docs/RENDERING.md 7, phase 3D-4). A WebGL canvas under the battle's 2D canvas draws what is solid: the baked battle ground as
// textures on the ground plane (the world's Ground3D), the world's prop models, parked civilian cars, the world's roofed buildings (open to a floor plan when
// yours are inside, with see-through holes where a selected unit, an enemy in sight or the cursor stands behind one), soldiers as the world's box figures,
// the company's war machines, helicopters, jets, drones and falling shells. The 2D canvas (src/engine/drawBattle.js) stays on top for rings, bars, order
// lines, fire and smoke, text. The camera is the world's (camera3d.js): it lands every point on the pixel BattleView.toScreen gives, so picking, boxes and
// orders are the 2D battle's, unchanged.
// One WebGL context for the page (a new one per battle would leave each old one referenced by the shared cached geometries): the canvas and everything
// built on it are made when a battle opens and disposed when it closes; the context itself idles. If it cannot be made, or is lost, BattleView falls back to 2D.
import { THREE } from './three.js';
import * as lib from './lib3d.js';
import { disposeTree } from './lib3d.js';
import { cameraFrame, applyFrame } from './camera3d.js';
import { Ground3D } from './ground3d.js';
import { buildRoofed, height3d, STOREY, KERB, makeHoles, seeThroughN, HOLES } from './buildings3d.js';
import { Figure, personKey, yawOf, angleDiff } from './people3d.js';
import { LightRig, presetFor, lampFactor } from './light3d.js';
import { PROPS, VEHICLES } from './registry3d.js';
import './props3d.js';
import './vehicles3d.js';
import { fallbackProp, fallbackVehicle } from './fallbacks3d.js';
import { buildWarVehicle, buildHelicopter } from './vehicles/military.js';
import { buildAircraft } from './vehicles/aircraft.js';
import { softwareGL } from './world3d.js';
import { unproject, project, behindBox, hidesPoint } from '../engine/iso.js';
import { TICK, TILE as BT, SUPPORT } from '../content/battle.js';

const TP = 32;
const CHUNK = 8; // ground chunk, tiles (ground3d.js)
const PROP_CELL = 12; // props are baked into one mesh per material per 12 x 12 tiles
const HOLE_R = 90; // the see-through window, iso px (the 2D battle's)
const BUDGET_MS = 14;
const JETS = { fighter: { kind: 'fighter', len: 5, span: 4, color: '#8a929a', trim: '#5a626a' }, bomber: { kind: 'tacbomber', len: 7, span: 7, color: '#6a7064', trim: '#3a4034' } };
const CAR_BODY = { sedan: 'saloon', hatch: 'hatch', taxi: 'saloon', police: 'police', van: 'estate', ambulance: 'estate', pickup: 'pickup', jeep: 'pickup', truck: 'pickup', bus: 'bus' };
const CAR_LEN = { sedan: 66, hatch: 58, taxi: 66, police: 66, van: 72, ambulance: 74, pickup: 72, jeep: 62, truck: 80, bus: 150 };
const CAR_ANGLE = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };

/** The world rectangle (tiles) the canvas shows on the ground, padded: which ground chunks, props and buildings are wanted. Pure. */
export function viewTiles(cam, W, H, pad = 2) {
  const z = cam.zoom; const xs = []; const ys = [];
  for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) { const p = unproject(cam.x + sx / z, cam.y + sy / z, 0); xs.push(p.x / TP); ys.push(p.y / TP); }
  return { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad };
}

/** Does a roofed building (ground box, `h` px tall) hide the point from the camera? (BattleView's `needsFade`, on the shared iso maths.) */
export const hides = (box, h, f) => behindBox(f, box) && hidesPoint(box, h, f.x, f.y, f.z || 0);

let SHARED = null; // { canvas, gl, software, lost }
function sharedGL() {
  if (SHARED && !SHARED.lost) return SHARED;
  const canvas = document.createElement('canvas');
  canvas.className = 'bt-gl';
  const software = softwareGL();
  const gl = new THREE.WebGLRenderer({ canvas, antialias: !software, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!gl.getContext()) throw new Error('no WebGL context');
  gl.setPixelRatio(1);
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  const S = { canvas, gl, software, lost: false, size: { w: 0, h: 0 } };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); S.lost = true; });
  SHARED = S;
  return S;
}

const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const disposeTex = (m, keep) => { for (const k of ['map', 'emissiveMap']) if (m[k] && !keep.has(m[k])) m[k].dispose(); };

export class Battle3D {
  /** A 3D layer for a BattleView, its canvas inserted under the view's 2D canvas; null when WebGL is not available (the 2D battle is then the picture). */
  static create(view) {
    try {
      const S = sharedGL();
      const b = new Battle3D(S, view);
      view.cv.parentNode.insertBefore(S.canvas, view.cv);
      return b;
    } catch (err) {
      console.warn('[oberverse] WebGL is not available for the battle; using the 2D isometric battle.', err?.message || err);
      return null;
    }
  }

  /** The counts three.js keeps for the page's battle renderer (the leak check). */
  static stats() { return SHARED ? { geometries: SHARED.gl.info.memory.geometries, textures: SHARED.gl.info.memory.textures, programs: SHARED.gl.info.programs?.length || 0 } : null; }

  constructor(S, view) {
    this.S = S; this.gl = S.gl; this.canvas = S.canvas; this.view = view;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
    this.rig = new LightRig(this.scene);
    this.shared = { roofTex: new Map(), wallMat: new Map() };
    this.groundGroup = new THREE.Group(); this.propGroup = new THREE.Group(); this.carGroup = new THREE.Group(); this.bldGroup = new THREE.Group(); this.unitGroup = new THREE.Group(); this.fxGroup = new THREE.Group();
    this.scene.add(this.groundGroup, this.propGroup, this.carGroup, this.bldGroup, this.unitGroup, this.fxGroup);
    this.buildings = new Map(); this.units = new Map(); this.piles = new Map(); this.shots = new Map(); this.jets = new Map(); this.drones = new Map();
    this.chunks = new Map(); this.lamps = []; this.ground = null; this.decalSig = '';
    this.frame = 0; this.fresh = 3; this.lost = false; this.stats = {}; this.B = null; this.darkness = 0;
    this.software = S.software; this.quality = S.software ? 'low' : 'high';
    this.enemyMat = null; this.wreckMat = null; this.dead = false; this.hidden = null; this.noHoles = false;
    S.lost = false;
    this.onLost = () => { this.lost = true; };
    S.canvas.addEventListener('webglcontextlost', this.onLost);
  }

  heightPx(rec) { return height3d(this.rec3(rec)) * TP; }

  /** The 3D building record: the battle's iso record with its floors as the tower height (so the facade has a row of windows a floor). */
  rec3(rec) {
    if (rec.__r3) return rec.__r3;
    const r = { ...rec, glass: undefined, tower: rec.floors > 1 ? rec.floors : 0, storeys: Math.max(1, rec.floors || 1) };
    Object.defineProperty(rec, '__r3', { value: r, enumerable: false });
    return r;
  }

  // ------------------------------------------------------------------ the static scene
  attach(B, V) {
    this.B = B; this.V = V;
    const map = B.map; const sc = V.scene;
    this.mapStub = { id: 'battle', width: map.w, height: map.h };
    this.groundHost = { groundChunk: (m, cx, cy) => this.chunkCanvas(cx, cy), wantChunks: [] };
    this.ground = new Ground3D(this.groundHost);
    this.decalSig = this.decalKey(B);
    // props, baked into a few meshes per cell
    const ctx = { THREE, lib, map: sc.gm, game: null, night: false, state: null, time: 0 };
    const cells = new Map();
    for (const it of sc.items) {
      if (it.k !== 'prop') continue;
      const pp = it.pp; const build = PROPS.get(pp.type); let obj = null;
      if (build) { try { obj = build(pp, ctx); } catch (err) { obj = null; } }
      if (!obj) obj = fallbackProp(pp, false);
      obj.position.set(pp.x, 0, pp.y);
      for (const l of obj.userData.lights || []) this.lamps.push({ x: pp.x + l.x, y: l.y, z: pp.y + l.z, color: l.color, intensity: l.intensity, distance: l.distance || l.dist || 8, prio: 0 });
      const key = `${Math.floor(pp.x / PROP_CELL)},${Math.floor(pp.y / PROP_CELL)}`;
      let g = cells.get(key); if (!g) { g = new THREE.Group(); cells.set(key, g); }
      g.add(obj);
    }
    for (const g of cells.values()) { lib.bake(g); g.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); }); this.propGroup.add(g); }
    // parked civilian cars: the world's car models
    for (const it of sc.items) {
      if (it.k !== 'car') continue;
      const c = it.c; const len = CAR_LEN[c.kind] || 66; const model = { body: CAR_BODY[c.kind] || 'saloon', len, wid: len * 0.5, colors: [c.color || '#8a8f94'] };
      let obj = null;
      try { obj = c.kind === 'truck' ? buildWarVehicle('truck') : VEHICLES.get(model.body)?.(model, ctx); } catch (err) { obj = null; }
      if (!obj) obj = fallbackVehicle(model, c.color);
      if (obj.userData.setColor && c.kind !== 'truck') obj.userData.setColor(c.color || '#8a8f94');
      obj.position.set(c.x / TP, 0, c.y / TP); obj.rotation.y = -(CAR_ANGLE[c.dir] ?? 0);
      obj.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); }); obj.updateMatrix();
      this.carGroup.add(obj);
    }
  }

  decalKey(B) { return `${B.rubble.length}|${(B.collapsed || []).length}`; }

  /** A piece of the baked ground (8 x 8 tiles) with the flat props and the fight's marks on it, for Ground3D. */
  chunkCanvas(cx, cy) {
    const key = cy * 1000 + cx; let c = this.chunks.get(key); if (c) return c;
    const G = this.V.scene.ground; const x0 = cx * CHUNK * TP; const y0 = cy * CHUNK * TP; const w = Math.min(CHUNK * TP, G.width - x0); const h = Math.min(CHUNK * TP, G.height - y0);
    c = mkCanvas(Math.max(1, w), Math.max(1, h)); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(G, x0, y0, w, h, 0, 0, w, h);
    g.translate(-x0, -y0);
    this.V.paintFlat(g, x0, y0, w, h);
    this.V.paintDecals(g, this.B);
    this.chunks.set(key, c);
    return c;
  }

  // ------------------------------------------------------------------ the frame
  /**
   * Draw the solid battle. `f` = { units (the list to show), foci (what no building may hide), tier, dt, open (buildings opened to a floor) }. False when the context is lost.
   */
  render(B, ui, V, f) {
    if (this.lost || this.S.lost || this.dead) return false;
    this.frame++;
    const cv = V.cv; const W = cv.width; const H = cv.height;
    if (this.S.size.w !== W || this.S.size.h !== H) { this.S.size = { w: W, h: H }; this.gl.setSize(W, H, false); }
    applyFrame(this.camera, cameraFrame(V.cam, W, H));
    const t0 = performance.now();
    this.deadline = t0 + (this.fresh > 0 ? 200 : BUDGET_MS);
    if (this.fresh > 0) this.fresh--;
    this.darkness = ui.darkness ?? V.darkness ?? B.setup?.darkness ?? 0;
    const sig = this.decalKey(B);
    if (sig !== this.decalSig) { this.decalSig = sig; this.ground.dispose(); this.chunks.clear(); } // (a wall breached, a trench fallen in: the ground is repainted as it comes into view)
    const vt = viewTiles(V.cam, W, H, 2);
    this.groundHost.wantChunks.length = 0;
    this.ground.show(this.mapStub, this.groundGroup, vt, 0);
    this.ground.endFrame();
    this.syncBuildings(B, V, f, vt);
    this.syncPiles(B, V);
    this.syncUnits(B, V, f);
    this.syncFx(B, V, f);
    const P = presetFor(this.darkness, true);
    this.scene.background = this.bg || (this.bg = new THREE.Color());
    this.bg.set(P.bg);
    const c = { x: V.cam.x + W / (2 * V.cam.zoom), y: V.cam.y + H / (2 * V.cam.zoom) }; const mid = unproject(c.x, c.y, 0);
    const cands = this.darkness > 0.25 ? this.lamps.filter((l) => Math.abs(l.x - mid.x / TP) < 40 && Math.abs(l.z - mid.y / TP) < 40) : [];
    this.rig.update(this.darkness, true, [mid.x / TP, mid.y / TP], cands, this.quality);
    this.gl.render(this.scene, this.camera);
    const info = this.gl.info.render; const s = this.stats;
    s.calls = info.calls; s.triangles = info.triangles; s.geometries = this.gl.info.memory.geometries; s.textures = this.gl.info.memory.textures; s.frameMs = performance.now() - t0; s.software = this.software; s.units = this.units.size;
    this.gl.info.reset();
    return !this.gl.getContext().isContextLost();
  }

  // ------------------------------------------------------------------ buildings
  syncBuildings(B, V, f, vt) {
    const dt = f.dt; const holesNeeded = this.noHoles ? [] : f.foci; // (`noHoles` and `hidden` are for the smoke test: a unit's pixels with the hole on and off, shown and hidden)
    const hz = V.cam.zoom; const H = V.cv.height;
    for (const b of B.map.buildings) {
      let e = this.buildings.get(b.id);
      const rec = V.scene.recs.get(b.id); const r3 = this.rec3(rec);
      if (b.x + b.w < vt.x0 - 2 || b.x > vt.x1 + 2 || b.y + b.h < vt.y0 - 6 || b.y > vt.y1 + 2) { if (e) { if (e.roofed) e.roofed.group.visible = false; if (e.open) e.open.visible = false; } continue; }
      if (!e) { e = { b, rec, r3, roofed: null, open: null, openKey: '', hole: makeHoles() }; this.buildings.set(b.id, e); }
      const openV = f.open[b.id]; const st = V.bld.step(rec, Boolean(openV), V.t, dt); const t = st.t;
      const box = { x0: b.x * TP, y0: b.y * TP, x1: (b.x + b.w) * TP, y1: (b.y + b.h) * TP };
      if (t < 1 && !e.roofed && performance.now() < this.deadline) {
        const r = buildRoofed(r3, this.shared);
        for (const m of r.mats) seeThroughN(m, e.hole);
        e.roofed = r; e.litFor = -1; this.bldGroup.add(r.group);
      }
      if (e.roofed) {
        if (e.litFor !== this.darkness) { e.litFor = this.darkness; const k = lampFactor(this.darkness); for (const m of e.roofed.emissive) m.emissiveIntensity = (m.userData.emissiveBase || 0.8) * k; } // (windows glow by night)
        e.roofed.group.visible = t < 1;
        e.roofed.group.scale.y = t > 0 ? Math.max(0.02, 1 - t) : 1;
        let want = false; const hs = [];
        if (t < 0.01) {
          const Hp = this.heightPx(rec);
          for (const fo of holesNeeded) {
            if (!hides(box, Hp, fo)) continue;
            const p = V.toCanvas(fo.x, fo.y, fo.z); const q = { x: p.x, y: p.y };
            if (hs.length < HOLES && !hs.some((h) => Math.hypot(h.x - q.x, h.y - q.y) < HOLE_R * hz * 0.6)) hs.push(q);
          }
          want = hs.length > 0;
        }
        const fade = V.bld.stepFade(rec, want, dt);
        const u = e.hole.value;
        if (want) { e.holes = hs; }
        const use = e.holes || [];
        let any = 0; for (let i = 0; i < HOLES; i++) { if (i < use.length && fade > 0.01 && t < 0.01) { u[i].set(use[i].x, H - use[i].y, HOLE_R * fade * hz, 1); any = 1; } else u[i].w = 0; }
        e.hole.on.value = any;
      }
      if (t > 0) {
        const key = `${openV ? openV.floor : -1}|${B.rubble.length}|${(B.collapsed || []).length}`;
        if (openV && (!e.open || e.openKey !== key) && performance.now() < this.deadline + 30) {
          if (e.open) this.dropOpen(e);
          e.open = this.buildOpen(B, V, b, rec, openV.floor); e.openKey = key; this.bldGroup.add(e.open);
        }
        if (e.open) { e.open.visible = true; e.open.scale.y = Math.max(0.02, t); }
      } else if (e.open) e.open.visible = false;
    }
  }

  /** A building opened to one floor's plan: the plan on the ground, wall tiles standing (a storey at the back, a kerb elsewhere). */
  buildOpen(B, V, b, rec, floor) {
    const g = new THREE.Group();
    const cv = V.floorCanvas(b, floor, B);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshLambertMaterial({ map: t }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(b.x + b.w / 2, 0.03, b.y + b.h / 2); plane.receiveShadow = true; plane.userData.noBake = true;
    g.add(plane);
    const wall = lib.mat(lib.shade(rec.wall || '#a9564a', 0)); const glass = lib.mat(lib.mix(rec.wall || '#a9564a', rec.glass || '#7aa3b8', 0.55)); const cap = lib.mat('#2c2824');
    for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) {
      const tl = B.map.tiles[j * B.map.w + i]; if (tl !== BT.WALL && tl !== BT.WINDOW) continue;
      const tall = j === b.y || i === b.x; const h = tall ? STOREY : KERB;
      g.add(lib.box(1, h, 1, tl === BT.WINDOW && tall ? glass : wall, { x: i + 0.5, z: j + 0.5 }), lib.box(1.02, 0.06, 1.02, cap, { x: i + 0.5, z: j + 0.5, y: h, cast: false }));
    }
    lib.bake(g);
    g.userData.tex = t;
    return g;
  }

  dropOpen(e) {
    if (!e.open) return;
    e.open.removeFromParent();
    e.open.traverse((o) => { if (o.material?.map && !o.material.userData.keep) o.material.map.dispose(); });
    disposeTree(e.open);
    e.open.userData.tex?.dispose();
    e.open = null;
  }

  /** A heap of brick where a wall that still shows from outside was breached. */
  syncPiles(B, V) {
    for (const r of B.rubble) {
      const bi = B.map.bid[r.y * B.map.w + r.x]; if (bi < 0) continue;
      const k = r.y * 4096 + r.x; let e = this.piles.get(k);
      if (!e) {
        const g = new THREE.Group(); g.position.set(r.x + 0.5, 0, r.y + 0.5);
        const cols = ['#8a4a3a', '#a8604a', '#6a3a2a', '#c8b8a0'];
        for (let i = 0; i < 6; i++) g.add(lib.box(0.22 + (i % 3) * 0.08, 0.14 + (i % 2) * 0.1, 0.2, cols[i % 4], { x: ((i * 37) % 10) / 10 - 0.5, z: ((i * 53) % 10) / 10 - 0.5, ry: i }));
        lib.bake(g); this.fxGroup.add(g); e = { g, bi }; this.piles.set(k, e);
      }
      const be = this.buildings.get(bi);
      e.g.visible = !(be && be.open && be.open.visible && be.open.scale.y > 0.5);
    }
  }

  // ------------------------------------------------------------------ units
  tintAll(obj, mat) { obj.traverse((o) => { if (o.isMesh && o.material === lib.vertexMat()) o.material = mat; }); }
  tintMat(kind) {
    if (kind === 'enemy') { if (!this.enemyMat) { this.enemyMat = lib.vertexMat().clone(); this.enemyMat.color.set('#e8a898'); this.enemyMat.userData.keep = false; } return this.enemyMat; }
    if (!this.wreckMat) { this.wreckMat = lib.vertexMat().clone(); this.wreckMat.color.set('#4a4440'); this.wreckMat.userData.keep = false; }
    return this.wreckMat;
  }

  makeUnit(u, V) {
    if (performance.now() > this.deadline + 40) return null;
    if (u.kind === 'inf') {
      const L = V.soldierLook(u);
      const app = { skin: L.skin, hair: '#3a2f2a', hairStyle: 'short', outfit: L.cloth, build: 'average', seed: u.id, uniform: { top: L.cloth, legs: L.legs, helm: L.helm } };
      const fig = new Figure(app, L.gun || 'ar', 'soldier');
      fig.root.scale.setScalar(0.9);
      return { kind: 'inf', fig, obj: fig.root, yaw: u.side === 'p' ? Math.PI / 2 : -Math.PI / 2, hd: 0, key: personKey(app, L.gun || 'ar', 'soldier') };
    }
    const sid = V.specKey(u); const heli = u.kind === 'helicopter';
    let obj = null;
    try { obj = heli ? buildHelicopter(sid) : buildWarVehicle(sid); } catch (err) { obj = null; }
    if (!obj) obj = fallbackVehicle({ body: 'x', len: 60, wid: 30 }, u.side === 'p' ? '#4f6a3e' : '#7a4a3e');
    if (!u.alive) this.tintAll(obj, this.tintMat('wreck')); else if (u.side !== 'p') this.tintAll(obj, this.tintMat('enemy'));
    let shadow = null;
    if (heli) { shadow = new THREE.Mesh(lib.sharedGeometry('bshadow', () => new THREE.CircleGeometry(1, 16)), this.shadowMat()); shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.3, 1.3, 1.3); shadow.position.y = 0.04; this.unitGroup.add(shadow); }
    return { kind: heli ? 'heli' : 'veh', obj, shadow, alive: u.alive, hd: u.side === 'p' ? 0 : Math.PI, key: `${sid}|${u.alive}|${u.side}` };
  }

  shadowMat() { return this.shMat || (this.shMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false })); }

  dropUnit(e) {
    e.obj.removeFromParent();
    if (e.fig) e.fig.dispose(); else disposeTree(e.obj);
    if (e.shadow) e.shadow.removeFromParent();
  }

  syncUnits(B, V, f) {
    const dt = f.dt; const shown = new Set();
    for (const u of f.units) {
      if (this.hidden?.has(u.id)) continue;
      let e = this.units.get(u.id);
      const key = u.kind === 'inf' ? e?.key : `${V.specKey(u)}|${u.alive}|${u.side}`;
      if (e && e.key !== key) { this.dropUnit(e); this.units.delete(u.id); e = null; }
      if (!e) { e = this.makeUnit(u, V); if (!e) continue; this.units.set(u.id, e); this.unitGroup.add(e.obj); }
      shown.add(u.id);
      e.obj.visible = true;
      const t = u.target ? B.byId.get(u.target) : null; const to = u.path?.[0] || t;
      if (u.kind === 'inf') {
        if (to) e.yaw += angleDiff(e.yaw, yawOf(to.x - u.x, to.y - u.y)) * Math.min(1, dt * 14);
        const down = !u.alive; const crouch = u.state === 'pinned' || u.state === 'broken';
        e.fig.pose({ x: u.x, y: 0, z: u.y, yaw: e.yaw, phase: u.moving && !down ? V.t * 11 + u.id.length * 0.7 : null, lying: down, lift: 0 });
        e.fig.body.scale.y = e.fig.geo.height * (crouch && !down ? 0.74 : 1);
        continue;
      }
      // a war machine: the hull turns toward where it goes, the turret toward what it shoots at
      const want = to ? Math.atan2(to.y - u.y, to.x - u.x) : t ? Math.atan2(t.y - u.y, t.x - u.x) : (u.side === 'p' ? 0 : Math.PI);
      let d = want - e.hd; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (u.alive) e.hd += d * 0.12;
      const heli = e.kind === 'heli'; const lift = heli && u.alive ? 1.2 : 0;
      e.obj.position.set(u.x, lift, u.y); e.obj.rotation.y = -e.hd;
      if (e.obj.userData.update) e.obj.userData.update({ speed: u.moving && u.alive ? (u.speed || 2) * TP : 0, wheel: 0, running: u.alive }, null, dt);
      const tur = e.obj.userData.subs?.turret;
      if (tur && !heli) { const ta = t && u.alive ? Math.atan2(t.y - u.y, t.x - u.x) : e.hd; let r = e.hd - ta; while (r > Math.PI) r -= 2 * Math.PI; while (r < -Math.PI) r += 2 * Math.PI; tur.rotation.y = r; }
      if (e.shadow) { e.shadow.visible = u.alive; e.shadow.position.set(u.x, 0.04, u.y); }
    }
    for (const [id, e] of this.units) if (!shown.has(id)) e.obj.visible = false, e.shadow && (e.shadow.visible = false);
  }

  // ------------------------------------------------------------------ jets, drones, falling shells
  syncFx(B, V, f) {
    const far = f.tier === 'far';
    // drones and FPV drones: a small quadcopter hovering over its shadow
    const live = new Set();
    for (const [list, fpv] of [[B.drones, false], [B.fpvs, true]]) for (const d of list || []) {
      let e = this.drones.get(d); if (!e) { e = this.makeDrone(fpv); this.drones.set(d, e); }
      live.add(d); e.g.visible = !far; e.g.position.set(d.x, fpv ? 0.62 : 0.78, d.y); e.rot.rotation.y = V.t * 30; e.sh.position.set(d.x, 0.04, d.y);
    }
    for (const [d, e] of this.drones) if (!live.has(d)) { this.fxGroup.remove(e.g, e.sh); disposeTree(e.g); this.drones.delete(d); }
    // strikes on their way down: a shell or a missile falling onto its target
    const alive = new Set();
    for (const p of B.pend) {
      const S = SUPPORT[p.kind]; const missile = S && (S.group === 'missile' || S.group === 'strategic' || S.group === 'drone');
      if (p.kind !== 'shell' && !missile) continue;
      let m = this.shots.get(p); if (!m) { m = this.makeShot(missile, S?.group === 'strategic'); this.shots.set(p, m); }
      alive.add(p); const left = Math.max(0, p.at - B.tick) / TICK.perSecond; const h = Math.min(8, left * (missile ? 3.2 : 4.4));
      m.visible = !far && left < 3; m.position.set(p.x, 0.1 + h, p.y);
    }
    for (const [p, m] of this.shots) if (!alive.has(p)) { this.fxGroup.remove(m); this.shots.delete(p); disposeTree(m); }
    // the aircraft of a pass (V.air entries, as the 2D overlay drew them)
    const air = new Set();
    for (const a of V.air) {
      const fr = (B.tick - a.t0) / a.dur; if (fr < -0.1 || fr > 1.4) continue;
      let e = this.jets.get(a); if (!e) { const look = JETS[a.kind === 'bomber' ? 'bomber' : 'fighter']; let obj = null; try { obj = buildAircraft(look, null); } catch (err) { obj = null; } if (!obj) continue; obj.scale.setScalar(a.kind === 'bomber' ? 0.42 : 0.5); const sh = new THREE.Mesh(lib.sharedGeometry('bshadow', () => new THREE.CircleGeometry(1, 16)), this.shadowMat()); sh.rotation.x = -Math.PI / 2; sh.scale.set(1.6, 1.6, 1.6); this.fxGroup.add(obj, sh); e = { obj, sh }; this.jets.set(a, e); }
      air.add(a); const x = (a.x0 + (a.x1 - a.x0) * fr) / TP; const z = a.y / TP;
      e.obj.visible = !far; e.sh.visible = !far; e.obj.position.set(x, 2.6, z); e.obj.rotation.y = a.x1 >= a.x0 ? 0 : Math.PI; e.sh.position.set(x, 0.04, z);
      e.obj.userData.update?.({ v: 5, alt: 3, state: 'airborne', gear: false }, null, f.dt);
    }
    for (const [a, e] of this.jets) if (!air.has(a)) { this.fxGroup.remove(e.obj, e.sh); disposeTree(e.obj); this.jets.delete(a); }
  }

  makeDrone(fpv) {
    const g = new THREE.Group(); const rot = new THREE.Group(); g.add(rot);
    const col = fpv ? '#d8402e' : '#4a5a6a';
    rot.add(lib.box(0.26, 0.1, 0.26, col, { y: -0.05 }), lib.box(0.62, 0.03, 0.05, '#1b1a24', { y: 0.02, ry: Math.PI / 4 }), lib.box(0.62, 0.03, 0.05, '#1b1a24', { y: 0.02, ry: -Math.PI / 4 }));
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) rot.add(lib.cyl(0.12, 0.02, '#b8c4d0', { x, z, y: 0.06, seg: 8, cast: false }));
    const sh = new THREE.Mesh(lib.sharedGeometry('bshadow', () => new THREE.CircleGeometry(1, 16)), this.shadowMat()); sh.rotation.x = -Math.PI / 2; sh.scale.set(0.35, 0.35, 0.35);
    this.fxGroup.add(g, sh);
    return { g, rot, sh };
  }

  makeShot(missile, big) {
    const g = new THREE.Group();
    if (missile) g.add(lib.cyl(big ? 0.16 : 0.09, big ? 1.4 : 0.9, '#d8d8dc', { y: -0.4, seg: 8 }), lib.cone(big ? 0.16 : 0.09, 0.3, '#c0302a', { y: big ? 1.0 : 0.5, seg: 8 }), lib.box(0.4, 0.02, 0.05, '#4a4a54', { y: -0.35 }));
    else g.add(lib.cyl(0.07, 0.34, '#3a3a40', { seg: 8 }), lib.cone(0.07, 0.16, '#8a8a92', { y: 0.34, seg: 8 }));
    this.fxGroup.add(g);
    return g;
  }

  // ------------------------------------------------------------------ the end
  /** Free everything built for this battle and take the canvas out of the page; the page's WebGL context idles for the next battle. */
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.S.canvas.removeEventListener('webglcontextlost', this.onLost);
    for (const e of this.units.values()) this.dropUnit(e);
    this.units.clear();
    for (const e of this.buildings.values()) {
      if (e.roofed) { e.roofed.group.removeFromParent(); this.disposeRoofed(e.roofed.group); }
      this.dropOpen(e);
    }
    this.buildings.clear();
    this.ground?.dispose();
    this.chunks.clear();
    for (const g of [this.propGroup, this.carGroup, this.fxGroup, this.bldGroup, this.unitGroup, this.groundGroup]) { g.removeFromParent(); disposeTree(g); }
    for (const t of this.shared.roofTex.values()) t.dispose();
    for (const m of this.shared.wallMat.values()) { m.map?.dispose(); m.dispose(); }
    this.shared.roofTex.clear(); this.shared.wallMat.clear();
    for (const m of [this.enemyMat, this.wreckMat, this.shMat]) m?.dispose();
    this.rig.dispose();
    this.gl.renderLists.dispose();
    this.scene.clear();
    this.S.canvas.remove();
  }

  /** A roofed building's pieces: its own materials, and its textures including the clones of the cached roof textures. */
  disposeRoofed(root) {
    const keep = new Set(this.shared.roofTex.values());
    root.traverse((o) => { if (o.geometry && (!o.geometry.userData.keep || o.geometry.type === 'PlaneGeometry')) o.geometry.dispose(); // (a sign's plane is cached by its size for ever: free its buffers, the next use uploads it again)
      for (const m of [].concat(o.material || [])) if (!m.userData.keep) { disposeTex(m, keep); m.dispose(); } });
  }
}
