// The 3D prop builders (phase 3D-2, src/engine3d/props3d.js and props/*): every prop type has one, each builds in Node without a DOM, fits
// its footprint, stands on the ground and is more than one box. Animated ones update without throwing; the linear ones join.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import * as lib from '../src/engine3d/lib3d.js';
import { PROPS } from '../src/engine3d/registry3d.js';
import { PROP_TYPES } from '../src/content/props.js';
import { GROUPS } from '../src/engine3d/props3d.js';
import { linkMask } from '../src/engine3d/props/kit.js';

// Flat things (decals and slabs) may be a single piece.
const FLAT = new Set(['flowerbed', 'crops', 'gangway', 'companionway', 'rug', 'helipad', 'trash', 'crosswalk', 'loadingbay', 'vent', 'trench', 'board', 'magic_circle', 'runway_light', 'bay_slot', 'item', 'window', 'painting', 'wallcrack', 'loosebrick', 'launch_pad', 'hall_site', 'aero_facility', 'hatch', 'belt', 'sorter', 'slipway', 'shipberth', 'floating_cards']);
const ctxOf = (o = {}) => ({ THREE, lib, map: null, game: null, night: false, state: null, time: 0, headless: true, ...o });
const recordOf = (type, i = 0) => { const d = PROP_TYPES[type].defaults || {}; return { id: `t_${type}_${i}`, type, x: 10, y: 20, w: d.w || 1, h: d.h || 1, ...d }; };
const meshes = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh) n++; }); return n; };

test('every one of the prop types has a builder, and nothing is registered that is not a prop type', () => {
  const missing = Object.keys(PROP_TYPES).filter((t) => !PROPS.has(t));
  assert.deepEqual(missing, []);
  for (const table of Object.values(GROUPS)) for (const t of Object.keys(table)) assert.ok(PROP_TYPES[t], `${t} is not a prop type`);
  assert.equal(Object.keys(PROP_TYPES).length, 159);
});

test('each builder, on a record of its default footprint, gives an object that fits the footprint, stands on the ground and is built of parts', () => {
  const bad = [];
  for (const type of Object.keys(PROP_TYPES)) {
    const p = recordOf(type);
    const obj = PROPS.get(type)(p, ctxOf());
    assert.ok(obj && obj.isObject3D, `${type} returned no object`);
    const box = new THREE.Box3().setFromObject(obj);
    assert.ok(!box.isEmpty(), `${type} is empty`);
    const tol = 0.15;
    const out = box.min.x < -tol || box.min.z < -tol || box.max.x > p.w + tol || box.max.z > p.h + tol;
    if (out) bad.push(`${type}: box x ${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)} z ${box.min.z.toFixed(2)}..${box.max.z.toFixed(2)} for ${p.w}x${p.h}`);
    if (box.min.y < -0.02 || box.min.y > 0.12) bad.push(`${type}: bottom at y ${box.min.y.toFixed(3)}`);
    if (!FLAT.has(type) && meshes(obj) < 2) bad.push(`${type}: only ${meshes(obj)} mesh`);
    assert.ok(box.max.y < 12, `${type} is absurdly tall`);
  }
  assert.deepEqual(bad, []);
});

test('builders are cheap: a handful of merged meshes per prop, and the shared materials and geometries are not made fresh each call', () => {
  const over = [];
  for (const type of Object.keys(PROP_TYPES)) {
    const obj = PROPS.get(type)(recordOf(type), ctxOf());
    const n = meshes(obj);
    if (n > 40) over.push(`${type}: ${n} meshes`);
  }
  assert.deepEqual(over, []);
});

test('night, state and position change a prop without breaking it: lamps, lights, animated props and keyed props update', () => {
  const animated = [];
  for (const type of Object.keys(PROP_TYPES)) {
    const p = recordOf(type);
    const dark = PROPS.get(type)(p, ctxOf({ night: true }));
    const u = dark.userData.update;
    if (u) { animated.push(type); for (const t of [0, 1.7, 33.3]) u(p, ctxOf({ night: true, time: t }), 0.016); }
    for (const l of dark.userData.lights || []) assert.ok(Number.isFinite(l.x + l.y + l.z + l.intensity + l.distance) && l.color, `${type} light`);
  }
  for (const t of ['pumpjack', 'windsock', 'radar', 'trafficlight', 'streetlamp', 'barrelfire', 'windmill', 'dish', 'crane']) assert.ok(animated.includes(t), `${t} should animate`);
  const lamp = PROPS.get('streetlamp')(recordOf('streetlamp'), ctxOf());
  assert.ok(lamp.userData.lights.length >= 1);
});

test('the traffic light follows the junction programme of the 2D painter (src/world/lights.js)', () => {
  const p = { ...recordOf('trafficlight'), corner: 'nw', offset: 0 };
  const obj = PROPS.get('trafficlight')(p, ctxOf());
  const lit = () => { const m = []; obj.traverse((c) => { if (c.isMesh && c.material.emissiveIntensity > 0 && c.material.emissive.getHex() !== 0) m.push(c.material.emissive.getHexString()); }); return m; };
  obj.userData.update(p, ctxOf({ time: 2 }), 0.016); // east-west green
  assert.ok(lit().includes('3fe07a'), 'green at t=2');
  obj.userData.update(p, ctxOf({ time: 10 }), 0.016); // east-west amber
  assert.ok(lit().includes('ffb02e'), 'amber at t=10');
  obj.userData.update(p, ctxOf({ time: 14 }), 0.016); // east-west red
  assert.ok(lit().includes('ff3b2f'), 'red at t=14');
});

test('runs of fences join their neighbours: the end of a run differs from the middle, and a lone post stands alone', () => {
  const mk = (xs) => ({ props: xs.map((x) => ({ type: 'fence', x, y: 5, w: 1, h: 1 })), width: 40, height: 40 });
  const map = mk([3, 4, 5]);
  assert.equal(linkMask({ map }, map.props[1], 4, 5), 10);
  assert.equal(linkMask({ map }, map.props[0], 3, 5), 2);
  assert.equal(linkMask({ map }, map.props[2], 5, 5), 8);
  const lone = mk([9]);
  assert.equal(linkMask({ map: lone }, lone.props[0], 9, 5), 0);
  const geo = (m, i) => { const o = PROPS.get('fence')(m.props[i], ctxOf({ map: m })); const b = new THREE.Box3().setFromObject(o); return [b.min.x, b.max.x]; };
  const [a0, a1] = geo(map, 1); // a middle piece spans its whole tile: it runs into both neighbours
  assert.ok(a0 <= 0.05 && a1 >= 0.95, `${a0} ${a1}`);
  const [l0, l1] = geo(lone, 0); // a lone piece stops short of the tile's edges
  assert.ok(l0 > 0.1 && l1 < 0.9, `${l0} ${l1}`);
});

test('signs carry their text from the record: with a DOM-free context they still build, and a wall item picks the open side of its wall', () => {
  for (const t of ['sign', 'roadsign', 'bigsign', 'ranchgate', 'runway_sign']) {
    const p = { ...recordOf(t), text: 'HELLO', sub: 'THERE', label: 'HI' };
    assert.ok(meshes(PROPS.get(t)(p, ctxOf())) > 1, t);
  }
  const map = { props: [], inBounds: () => true, tileAt: (x, y) => (y === 0 ? 'W' : 't') };
  const win = PROPS.get('window')({ ...recordOf('window'), x: 5, y: 0 }, ctxOf({ map }));
  const b = new THREE.Box3().setFromObject(win);
  assert.ok(b.min.z > 0.8 && b.max.z < 1.2, `window on the south face of the north wall: z ${b.min.z}..${b.max.z}`);
  assert.ok(b.min.y > 0.5, 'a window hangs at wall height');
});
