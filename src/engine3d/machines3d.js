// Everything big that is not a car or a bus but must stand in the 3D world (phase 3D-3): the aircraft on Starling Field (on their stands,
// pushed back, taxiing, rolling, climbing away with real height), the launch complex (the crawler with its rocket, the rocket on the pad, flame,
// lift-off, smoke, the spent stage falling away, a vehicle lost), the secure convoys on the road, and the mercenary company's machines parked
// at Hollowmoor Lot (ground vehicles in the yard, helicopters on the pads, aircraft on the apron stands).
//
// It reads the same game state the 2D helpers read (game.aero.movers() / launches() / convoys(), game.war.equipment()) and draws it; it never
// writes to the game. world3d.js calls syncMachines() once a frame (after the people and cars) and disposeMachines() when it resets.
// Objects live in the map's own group (tile units, like the cars), are made when first in view and freed after a while out of sight.
import { THREE } from './three.js';
import { disposeTree } from './lib3d.js';
import { VEHICLES } from './registry3d.js';
import { buildAircraft } from './vehicles/aircraft.js';
import { buildRocket, buildCrawler, flameParts, puffGeometry, STAGE_SPLIT } from './vehicles/rocket.js';
import { buildWarVehicle, buildHelicopter, sizeScale } from './vehicles/military.js';
import { specId, isHeli } from '../engine/drawParked.js';
import { PARK } from '../content/maps/hollowmoor.js';
import { puffs, debris, clockText, height } from '../aero/launch.js';
import { materialFor } from './vehicles/geo.js';

const TILE = 32;
const KEEP = 240; // frames a machine out of view is kept before it is freed
const MAP_FIELD = 'starling_flats';
const MAP_LOT = 'hollowmoor_lot';
const STATES_PARKED = new Set(['stored', 'assigned']);

const states = new WeakMap();
const stateOf = (world) => { let s = states.get(world); if (!s) states.set(world, (s = { entries: new Map(), frame: 0, fx: new Map() })); return s; };

/** Where the company's machines stand at Hollowmoor: the same stands and the same order as src/engine/drawParked.js parkedMachines(). */
export function parkedList(game) {
  const eq = (game.war?.equipment?.() || []).filter((e) => STATES_PARKED.has(e.status)).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const out = [];
  let yard = 0; let pad = 0; let apron = 0;
  for (const e of eq) {
    if (e.kind === 'vehicle') { const s = PARK.ground[yard++]; if (s) out.push({ id: e.id, kind: 'vehicle', type: e.type, x: s[0], y: s[1], heading: Math.PI / 2, scale: 1 }); }
    else if (e.kind === 'helicopter') { const s = pad < PARK.helipads.length ? PARK.helipads[pad++] : PARK.apron[apron++]; if (s) out.push({ id: e.id, kind: 'helicopter', type: e.type, x: s[0], y: s[1], heading: 0, scale: 0.8 }); }
    else if (e.kind === 'aircraft') {
      const s = PARK.apron[apron++]; const look = game.aero?.cfg?.products?.[e.type]?.look;
      if (s && look) out.push({ id: e.id, kind: 'aircraft', type: e.type, look, x: s[0], y: s[1], heading: 0, scale: Math.min(1, 11 / Math.max(look.len, look.span)) });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ entries
function touch(world, st, key, ms, make) {
  let e = st.entries.get(key);
  if (e && e.ms !== ms) { drop(st, key); e = null; }
  if (!e) {
    let obj = null;
    try { obj = make(); } catch (err) { console.warn('[oberverse] 3D machine builder failed', key, err); }
    if (!obj) return null;
    e = { obj, ms, last: 0, sig: null, key, extra: {} };
    st.entries.set(key, e);
    ms.dynGroup.add(obj);
  }
  e.last = st.frame;
  e.obj.visible = true;
  return e;
}
function drop(st, key) {
  const e = st.entries.get(key);
  if (!e) return;
  e.obj.removeFromParent();
  disposeTree(e.obj);
  if (e.extra.dispose) e.extra.dispose();
  st.entries.delete(key);
}

/** Free everything this module made (a new game, a load): world3d calls it from reset(). */
export function disposeMachines(world) {
  const st = states.get(world);
  if (!st) return;
  for (const k of [...st.entries.keys()]) drop(st, k);
  for (const k of [...st.fx.keys()]) dropFx(st, k);
  states.delete(world);
}

const near = (world, ms, x, z, pad) => world.nearView(x + ms.group.position.x, z + ms.group.position.z, pad);

// ------------------------------------------------------------------------------------------------ the sky and the pad
function makeFlame() {
  const g = flameParts();
  const grp = new THREE.Group();
  for (const [name, geo] of Object.entries(g)) { const m = new THREE.Mesh(geo, materialFor(name, '#fff')); m.castShadow = false; grp.add(m); }
  grp.visible = false;
  return grp;
}

function makePuffs(max) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' }); // (unlit: a soft pale cloud; its brightness follows the daylight, see syncLaunches)
  const mesh = new THREE.InstancedMesh(puffGeometry(), mat, max);
  mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color('#ffffff'));
  mesh.userData.keep = false;
  return mesh;
}

const tmpM = new THREE.Matrix4(); const tmpC = new THREE.Color(); const tmpQ = new THREE.Quaternion(); const tmpP = new THREE.Vector3(); const tmpS = new THREE.Vector3();
const GREY = new THREE.Color('#e4e2e0'); const WARM = new THREE.Color('#ffc880'); const DEBRIS = new THREE.Color('#8a8478');

function boardTexture() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 44;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.keep = false;
  return { cv, tex, text: null };
}
function paintBoard(b, text, color) {
  if (!b || b.text === text + color) return;
  const c = b.cv.getContext('2d');
  c.fillStyle = '#1b1a24'; c.fillRect(0, 0, 128, 44);
  c.fillStyle = '#2a2c34'; c.fillRect(3, 3, 122, 38);
  c.font = 'bold 26px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = color; c.fillText(text, 64, 23);
  b.tex.needsUpdate = true; b.text = text + color;
}

function makeBoard() {
  const grp = new THREE.Group();
  const b = boardTexture();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.65), new THREE.MeshLambertMaterial({ map: b?.tex || null, color: b ? '#ffffff' : '#2a2c34', emissive: new THREE.Color('#ffffff'), emissiveMap: b?.tex || null, emissiveIntensity: 0.9 }));
  plate.position.y = 1.0;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.7, 0.05), new THREE.MeshLambertMaterial({ color: '#1b1a24' }));
  back.position.set(0, 1.0, -0.03);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), new THREE.MeshLambertMaterial({ color: '#5a5e66' })); post.position.set(s * 0.7, 0.35, -0.03); grp.add(post); }
  grp.add(plate, back);
  grp.rotation.y = Math.PI / 4;
  grp.userData.board = b;
  grp.userData.dispose = () => { if (b) b.tex.dispose(); };
  return grp;
}

function syncLaunches(world, game, ctx, dt, st, ms) {
  const aero = game.aero;
  if (!aero?.launches) return;
  const L = game.content.aerospace?.flight?.launch;
  const time = game.realTime || 0;
  for (const l of aero.launches()) {
    const bx = l.base.x; const bz = l.base.y;
    if (l.kind === 'rollout') {
      if (!near(world, ms, l.x, l.y, 12)) continue;
      const e = touch(world, st, `lc|${l.company}|crawler`, ms, () => { const g = new THREE.Group(); const c = buildCrawler(); g.add(c); g.userData.crawler = c; return g; });
      if (!e) continue;
      const rk = touch(world, st, `lc|${l.company}|crawlerrocket`, ms, () => buildRocket({ ...l.look }));
      e.obj.position.set(l.x, 0, l.y);
      if (rk) {
        rk.obj.position.set(l.x, 1.34, l.y);
        rk.obj.rotation.z = Math.sin(time * 9) * (l.moving ? 0.5 : 0) * 0.004;
        rk.obj.userData.subs.lower.visible = true;
      }
      const c = e.obj.userData.crawler;
      c.userData.subs.treads.position.x = (((Math.floor((l.u || 0) * 60) % 4) / 4) * 0.2);
      c.userData.subs.beacon.visible = Math.floor(time * 2) % 2 === 1;
      continue;
    }
    // a launch sequence
    const ph = l.ph;
    if (!near(world, ms, bx, bz, 40)) continue;
    const tag = `lc|${l.company}`;
    const t = ph.t;
    const lost = ph.phase === 'lost' || (ph.phase === 'done' && l.seq.failT != null);
    // the countdown board
    if (ph.phase !== 'done') {
      const e = touch(world, st, `${tag}|board`, ms, makeBoard);
      if (e) {
        e.obj.position.set(bx + 3.4, 0, bz + 2.7);
        e.extra.dispose = e.obj.userData.dispose;
        paintBoard(e.obj.userData.board, lost ? 'ABORT' : clockText(t), lost ? '#ff4a3a' : t >= 0 ? '#5fe07a' : t > -L.ignitionMin ? '#ffb040' : '#ffd860');
      }
    }
    // the rocket: on the pad, then climbing; the first stage drops at separation
    const showRocket = l.look && !lost && ph.phase !== 'done';
    if (showRocket) {
      const e = touch(world, st, `${tag}|rocket`, ms, () => buildRocket({ ...l.look }));
      if (e) {
        e.obj.position.set(bx, ph.h, bz);
        e.obj.userData.subs.lower.visible = !ph.sep;
        e.obj.userData.subs.upper.visible = true;
        if (ph.sep) { // the second stage carries on, a little off the vertical as the wind takes it
          e.obj.rotation.z = Math.min(0.06, (t - L.sepAt) * 0.01) * (l.wind || 1);
        } else e.obj.rotation.z = 0;
      }
      // the flame and the glare
      const onPad = ph.phase === 'ignition' || (ph.phase === 'ascent' && ph.h < 6);
      const inSky = ph.phase === 'ascent' && ph.h >= 6;
      const fe = touch(world, st, `${tag}|flame`, ms, makeFlame);
      if (fe) {
        const power = ph.phase === 'ignition' ? ph.burn : 1;
        const width = ((Math.max(10, l.look.w * 14) + (l.look.boosters ? 30 : 0)) * 1.15) / TILE;
        let len = 0;
        if (onPad) len = (30 + power * 90) * power / TILE;
        else if (inSky) len = (110 / (1 + ph.h / 70) + 24) / TILE;
        const flick = 0.85 + 0.15 * Math.sin(time * 38) + 0.1 * Math.sin(time * 71);
        fe.obj.visible = len > 0.05;
        fe.obj.position.set(bx, ph.h + 0.14, bz);
        fe.obj.scale.set(width * (ph.sep ? 0.55 : 1), len * flick, width * (ph.sep ? 0.55 : 1));
        if (len > 0.05) world.cands.push({ x: bx + (world.mapScenes.get(MAP_FIELD)?.group.position.x || 0), y: ph.h + 1.5, z: bz + (world.mapScenes.get(MAP_FIELD)?.group.position.z || 0), color: '#ffb060', intensity: 30 + 40 * power, distance: 18 + ph.h * 0.3, prio: 3 });
      }
    }
    // the spent first stage, tumbling down after separation
    if (!lost && ph.sep && l.look && ph.phase !== 'done') {
      const ts = t - L.sepAt;
      const sepH = height(L, L.sepAt);
      const sy = sepH - (ts * ts * 18) / TILE;
      const e = touch(world, st, `${tag}|spent`, ms, () => { const r = buildRocket({ ...l.look }); r.userData.subs.upper.visible = false; return r; });
      if (e) {
        e.obj.visible = sy > 0 && ts < 8;
        e.obj.position.set(bx + ((l.wind || 1) * ts * 9) / TILE, Math.max(0, sy), bz);
        e.obj.rotation.z = Math.min(1.4, ts * 0.35) * (l.wind || 1);
        e.obj.scale.setScalar(1);
      }
    }
    // smoke (a pool of instanced balls) and fire
    const fx = st.fx.get(tag) || (() => { const o = { puffs: makePuffs(320), debris: makePuffs(24), ball: [] }; o.puffs.name = 'puffs'; ms.dynGroup.add(o.puffs, o.debris); st.fx.set(tag, o); return o; })();
    fx.last = st.frame;
    { const day = 1 - Math.min(0.75, game.clock.darkness * 0.8); fx.puffs.material.color.setScalar(day); fx.debris.material.color.setScalar(1); }
    if (fx.puffs.parent !== ms.dynGroup) ms.dynGroup.add(fx.puffs, fx.debris);
    let n = 0;
    if (!(ph.phase === 'done' && t > L.cloudLife)) {
      for (const p of puffs(L, l.seq, t, l.wind)) {
        if (n >= 320) break;
        const a = Math.min(1, p.a);
        if (a <= 0.02) continue;
        const rad = (p.r / TILE) * (0.7 + 0.9 * Math.sqrt(a));
        if (p.kind === 'ground') tmpP.set(bx + p.dx, 0.12 + rad * 0.55, bz + p.dy * 0.9);
        else tmpP.set(bx + p.dx, Math.max(0.1, -p.dy), bz + ((n * 0.37) % 1 - 0.5) * 0.3);
        tmpS.set(rad, rad * 0.85, rad);
        tmpQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, n * 1.7);
        tmpM.compose(tmpP, tmpQ, tmpS);
        fx.puffs.setMatrixAt(n, tmpM);
        tmpC.copy(GREY).multiplyScalar(0.7 + 0.3 * a);
        if (p.hot > 0.05) tmpC.lerp(WARM, Math.min(1, p.hot));
        fx.puffs.setColorAt(n, tmpC);
        n++;
      }
    }
    fx.puffs.count = n;
    fx.puffs.instanceMatrix.needsUpdate = true;
    if (fx.puffs.instanceColor) fx.puffs.instanceColor.needsUpdate = true;
    // a vehicle lost: the flash, the fireball, the pieces
    let nd = 0;
    if (lost && ph.boom != null && l.seq.failT != null) {
      const b = ph.boom;
      const cy = height(L, l.seq.failT);
      const fe = touch(world, st, `${tag}|ball`, ms, () => {
        const grp = new THREE.Group();
        for (const [c, k] of [['#c8402a', 1], ['#ff7a2a', 0.78], ['#ffc040', 0.5], ['#fff0b0', 0.24]]) { const m = new THREE.Mesh(puffGeometry(), materialFor(`glow:${c}`, '#fff')); m.userData.k = k; m.castShadow = false; grp.add(m); }
        return grp;
      });
      if (fe) {
        fe.obj.position.set(bx, cy, bz);
        const fr = (16 + Math.min(b, 1.6) * 52) / TILE;
        const alive = b < 2.2;
        fe.obj.visible = alive || b < 0.45;
        for (const m of fe.obj.children) m.scale.setScalar(Math.max(0.01, alive ? fr * m.userData.k * Math.max(0.2, 1 - b / 2.2) : 0.01));
        if (b < 0.45) { const fl = (24 + b * 160) / TILE * (1 - b / 0.45); fe.obj.children[3].scale.setScalar(Math.max(fl, 0.01)); }
        if (alive) world.cands.push({ x: bx + (world.mapScenes.get(MAP_FIELD)?.group.position.x || 0), y: cy + 1, z: bz + (world.mapScenes.get(MAP_FIELD)?.group.position.z || 0), color: '#ff9a50', intensity: 60 * (1 - b / 2.2), distance: 24, prio: 3 });
      }
      for (const d of debris(L, l.seq, b)) {
        if (nd >= 24) break;
        tmpP.set(bx + d.dx, -d.dy, bz + ((nd * 0.53) % 1 - 0.5) * 1.2);
        const sz = (d.size + 1) / TILE * 1.8;
        tmpS.set(sz, sz, sz);
        tmpQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, d.spin + b * 6);
        tmpM.compose(tmpP, tmpQ, tmpS);
        fx.debris.setMatrixAt(nd, tmpM);
        fx.debris.setColorAt(nd, Math.floor(time * 10 + d.spin * 7) % 2 ? tmpC.set('#ff9a2a') : tmpC.copy(DEBRIS));
        nd++;
      }
    }
    fx.debris.count = nd;
    fx.debris.instanceMatrix.needsUpdate = true;
    if (fx.debris.instanceColor) fx.debris.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------ the frame
/**
 * Create, move and free the large machines. world: the World3D; game: the Game; ctx: the builders' context (night, time ...); dt: seconds.
 * Reads only (game.aero, game.war): it never touches the simulation.
 */
export function syncMachines(world, game, ctx, dt) {
  // (a fault in here must never take the whole 3D frame down with it: world3d would fall back to the 2D view for good)
  try { sync(world, game, ctx, dt); } catch (err) { if (!warned) { warned = true; console.warn('[oberverse] 3D machines failed', err); } }
}
let warned = false;

function sync(world, game, ctx, dt) {
  const st = stateOf(world);
  st.frame++;
  dt = Math.min(dt || 0.016, 0.1);
  const night = Boolean(ctx?.night) || game.clock.darkness > 0.45;
  const c2 = { ...(ctx || {}), night, game, time: world.host?.time || 0 };
  const budget = world.deadline ? world.deadline + 10 : Infinity;
  // Starling Field: aircraft, the launch complex, convoys
  const field = world.mapScenes.get(MAP_FIELD);
  if (field && field.group.visible && game.aero) {
    for (const m of game.aero.movers?.() || []) {
      if (!near(world, field, m.x, m.y, Math.max(m.look.len, m.look.span) * 0.6 + 6 + m.alt)) { const e0 = st.entries.get(`ac|${m.id}`); if (e0) e0.obj.visible = false; continue; }
      if (performance.now() > budget && !st.entries.has(`ac|${m.id}`)) continue;
      const lk = `${m.look.kind}|${m.look.len}|${m.look.span}|${m.look.color}|${m.livery || ''}`;
      let e = touch(world, st, `ac|${m.id}`, field, () => buildAircraft(m.look, m.livery));
      if (!e) continue;
      if (e.sig && e.sig !== lk) { drop(st, `ac|${m.id}`); e = touch(world, st, `ac|${m.id}`, field, () => buildAircraft(m.look, m.livery)); }
      e.sig = lk;
      e.obj.position.set(m.x, Math.max(0, m.alt || 0), m.y);
      e.obj.rotation.y = Math.PI / 2 - m.a; // 0 = nose north, clockwise: the model's +x is the nose
      e.obj.userData.update(m, c2, dt);
    }
    syncLaunches(world, game, c2, dt, st, field);
    const models = game.content.vehicles?.models || {};
    for (const v of game.aero.convoys?.() || []) {
      const mdl = models[v.model];
      if (!mdl || !near(world, field, v.x, v.y, 8)) { const e0 = st.entries.get(`cv|${v.id}`); if (e0) e0.obj.visible = false; continue; }
      const e = touch(world, st, `cv|${v.id}`, field, () => {
        const build = VEHICLES.get(v.model) || VEHICLES.get(mdl.body);
        return build ? build({ ...mdl, id: v.model }, c2) : null;
      });
      if (!e) continue;
      const px = v.x * TILE; const py = v.y * TILE;
      const last = e.extra.last;
      const speed = last && dt > 0 ? Math.min(400, Math.hypot(px - last.x, py - last.y) / dt) : 0;
      e.extra.last = { x: px, y: py };
      e.obj.position.set(v.x, 0, v.y);
      e.obj.rotation.y = -v.angle;
      if (e.extra.color !== v.color && e.obj.userData.setColor) { e.obj.userData.setColor(v.color); e.extra.color = v.color; }
      e.obj.userData.update?.({ id: v.id, x: px, y: py, angle: v.angle, speed, wheel: 0, kind: 'convoy' }, c2, dt);
    }
  }
  // Hollowmoor Lot: the machines at home
  const lot = world.mapScenes.get(MAP_LOT);
  if (lot && lot.group.visible && game.war) {
    for (const p of parkedList(game)) {
      if (!near(world, lot, p.x, p.y, 10)) { const e0 = st.entries.get(`pm|${p.id}`); if (e0) e0.obj.visible = false; continue; }
      const sig = `${p.kind}|${p.type}`;
      let e = touch(world, st, `pm|${p.id}`, lot, () => makeParked(p));
      if (!e) continue;
      if (e.sig && e.sig !== sig) { drop(st, `pm|${p.id}`); e = touch(world, st, `pm|${p.id}`, lot, () => makeParked(p)); if (!e) continue; }
      e.sig = sig;
      e.obj.position.set(p.x, 0, p.y);
      e.obj.rotation.y = Math.PI / 2 - p.heading; // (the 2D heading: 0 = nose up; the models' +x is the nose)
      e.obj.scale.setScalar(p.kind === 'aircraft' ? p.scale : sizeScale(specId(p.type))); // (the simulation's footprint table, rules 5: a machine at home is as big as it is in the field)
      e.obj.userData.update?.(p.kind === 'aircraft' ? { v: 0, alt: 0, gear: true, state: 'parked' } : { running: false, speed: 0 }, c2, dt);
    }
  }
  // free what has been out of sight a long while; a map that is gone takes its machines with it
  for (const [k, e] of [...st.entries]) {
    if (e.last < st.frame) e.obj.visible = false;
    if (e.last < st.frame - KEEP || world.mapScenes.get(e.ms.id) !== e.ms) drop(st, k);
  }
  for (const [k, fx] of [...st.fx]) {
    if (fx.last < st.frame) { fx.puffs.count = 0; fx.debris.count = 0; }
    if (fx.last < st.frame - KEEP) dropFx(st, k);
  }
}

function dropFx(st, k) {
  const fx = st.fx.get(k);
  if (!fx) return;
  fx.puffs.removeFromParent(); fx.debris.removeFromParent();
  fx.puffs.dispose(); fx.debris.dispose(); fx.puffs.material.dispose(); fx.debris.material.dispose();
  st.fx.delete(k);
}

function makeParked(p) {
  if (p.kind === 'aircraft') return buildAircraft(p.look, null);
  if (p.kind === 'helicopter' || isHeli(p.type)) return buildHelicopter(specId(p.type));
  return buildWarVehicle(specId(p.type));
}
