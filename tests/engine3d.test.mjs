// The 3D renderer's pure parts (src/engine3d): the camera against the 2D mapping, the registries, the fallbacks'
// numbers, building heights, a person's facing, the bundled library. No WebGL (three's maths run in Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import { cameraFrame, applyFrame, toTile } from '../src/engine3d/camera3d.js';
import { project } from '../src/engine/iso.js';

// the 2D renderer's own mapping (src/engine/renderer.js toScreen, iso branch)
const toScreen2d = (cam, wx, wy, z = 0) => ({ x: (wx - wy - cam.x) * cam.zoom, y: ((wx + wy) / 2 - z - cam.y) * cam.zoom });

function toScreen3d(cam, W, H, wx, wy, z, shake) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
  applyFrame(camera, cameraFrame(cam, W, H, shake));
  const p = new THREE.Vector3(...toTile(wx, wy, z)).project(camera);
  return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
}

test('the 3D camera lands every world point on the pixel toScreen gives, at every zoom and height', () => {
  const sizes = [[1280, 800], [1920, 1080], [800, 600]];
  let worst = 0;
  for (const [W, H] of sizes) for (const zoom of [1, 1.5, 2, 3, 4]) for (const [cx, cy] of [[0, 0], [-1234.5, 87.25], [4000, 2500]]) {
    const cam = { x: cx, y: cy, zoom };
    for (const [wx, wy, z] of [[0, 0, 0], [640, 480, 0], [123.4, 987.6, 18], [3000, 200, 46], [77, 15, 420], [1500.5, 1500.5, 200]]) {
      const a = toScreen2d(cam, wx, wy, z);
      const b = toScreen3d(cam, W, H, wx, wy, z);
      worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  assert.ok(worst < 0.5, `worst error ${worst} device px`);
});

test('the 3D camera follows the camera shake and the Wrath camera (any cam.x, cam.y, non-integer zoom)', () => {
  const W = 1280; const H = 800;
  const cam = { x: 512.25, y: 99.5, zoom: 2.6 }; // (the Wrath camera pushes in by a fractional factor)
  const shake = { x: 3.7, y: -2.2 };
  for (const [wx, wy, z] of [[100, 100, 0], [900, 300, 32], [2000, 1200, 150]]) {
    // the iso pass slides the finished picture by +shake, i.e. it is drawn with the camera at cam - shake
    const a = toScreen2d({ ...cam, x: cam.x - shake.x, y: cam.y - shake.y }, wx, wy, z);
    const b = toScreen3d(cam, W, H, wx, wy, z, shake);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.5, JSON.stringify([a, b]));
  }
});

test('a tile is a 64 x 32 diamond on screen and a tile of height is 32 px, as in the 2D view', () => {
  const cam = { x: 0, y: 0, zoom: 1 };
  const p0 = toScreen3d(cam, 1000, 800, 0, 0, 0);
  const pe = toScreen3d(cam, 1000, 800, 32, 0, 0);
  const ps = toScreen3d(cam, 1000, 800, 32, 32, 0);
  const pu = toScreen3d(cam, 1000, 800, 0, 0, 32);
  assert.ok(Math.abs(pe.x - p0.x - 32) < 0.01 && Math.abs(pe.y - p0.y - 16) < 0.01);
  assert.ok(Math.abs(ps.y - p0.y - 32) < 0.01 && Math.abs(ps.x - p0.x) < 0.01);
  assert.ok(Math.abs(p0.y - pu.y - 32) < 0.01 && Math.abs(pu.x - p0.x) < 0.01);
  const q = project(32, 0);
  assert.equal(q.x, 32);
});

test('the bundled three.js has the classes the renderer uses', () => {
  for (const k of ['WebGLRenderer', 'Scene', 'OrthographicCamera', 'MeshLambertMaterial', 'CanvasTexture', 'DirectionalLight', 'HemisphereLight', 'PointLight', 'BufferGeometry', 'NearestFilter', 'SRGBColorSpace']) assert.ok(k in THREE, k);
  assert.equal(THREE.REVISION, '160');
});

// ---- the registries (the contract other files code against) ---------------------------------------------------
import { PROPS, VEHICLES, registerProp, registerVehicle } from '../src/engine3d/registry3d.js';
import { fallbackProp, fallbackVehicle, propSize, vehicleSize, PROP_HEIGHT, FLAT_HEIGHT } from '../src/engine3d/fallbacks3d.js';
import { height3d, buildingKind, wallRuns, wallClass, STOREY } from '../src/engine3d/buildings3d.js';
import { personKey, yawOf, angleDiff, stepFacing, newMotion } from '../src/engine3d/people3d.js';
import { presetFor, lampFactor, PRESETS } from '../src/engine3d/light3d.js';
import { facingVector } from '../src/engine/iso.js';
import { buildingHeight } from '../src/engine/isoBuildings.js';

test('registry3d: registerProp and registerVehicle fill PROPS and VEHICLES and refuse bad arguments', () => {
  const build = () => new THREE.Group();
  registerProp('__test_prop', build);
  registerVehicle('__test_body', build);
  assert.equal(PROPS.get('__test_prop'), build);
  assert.equal(VEHICLES.get('__test_body'), build);
  assert.throws(() => registerProp(5, build), TypeError);
  assert.throws(() => registerVehicle('x', null), TypeError);
  PROPS.delete('__test_prop');
  VEHICLES.delete('__test_body');
});

test('fallbacks: a prop is a box of its footprint 0.6 tile tall (a flat prop a thin slab), origin at the north-west corner', () => {
  const p = { type: 'desk', x: 3, y: 4, w: 2, h: 3 };
  const s = propSize(p, false);
  assert.deepEqual([s.w, s.d, s.height], [2, 3, PROP_HEIGHT]);
  assert.equal(PROP_HEIGHT, 0.6);
  assert.ok(propSize(p, true).height <= 0.1 && FLAT_HEIGHT < PROP_HEIGHT);
  const g = fallbackProp(p, false);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.x >= 0 && box.min.z >= 0 && box.max.x <= 2.0001 && box.max.z <= 3.0001, 'inside the footprint, from the NW corner');
  assert.ok(Math.abs(box.max.y - PROP_HEIGHT) < 1e-6 && box.min.y === 0);
  assert.ok(g.userData.fallback);
});

test('fallbacks: a vehicle is a two-box car of the model\'s length and width, +x forward, and the y-rotation -angle turns +x onto the world heading', () => {
  const m = { len: 73, wid: 38, colors: ['#c8b98f'] };
  assert.deepEqual(vehicleSize(m), { len: 73 / 32, wid: 38 / 32 });
  const car = fallbackVehicle(m, '#5a3a24');
  const bb = new THREE.Box3().setFromObject(car);
  assert.ok(Math.abs((bb.max.x - bb.min.x) - 73 / 32) < 1e-6, 'long along x');
  assert.ok(Math.abs((bb.max.z - bb.min.z) - 38 / 32) < 1e-6, 'wide along z');
  assert.equal(typeof car.userData.setColor, 'function');
  // the simulation's angle is the direction of travel (x east, y south = three's z): rotation.y = -angle sends +x there
  for (const a of [0, 0.4, Math.PI / 2, 2.5, -1.2, Math.PI]) {
    const v = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, -a, 0));
    assert.ok(Math.abs(v.x - Math.cos(a)) < 1e-9 && Math.abs(v.z - Math.sin(a)) < 1e-9, `angle ${a}`);
  }
});

test('buildings: the 3D height follows the 2D buildingHeight (capped for towers), by storeys for the small ones', () => {
  assert.ok(Math.abs(height3d({ w: 5, h: 5 }) - (0.3 + STOREY)) < 1e-9, 'one storey');
  assert.ok(Math.abs(height3d({ w: 10, h: 8 }) - (0.3 + 2 * STOREY)) < 1e-9, 'a big building: two');
  assert.ok(Math.abs(height3d({ tower: 3, w: 5, h: 5 }) - (0.3 + 3 * STOREY)) < 1e-9);
  let prev = 0;
  for (const t of [1, 2, 3, 4, 6, 10, 22, 40, 90]) { const h = height3d({ tower: t, w: 8, h: 8 }); assert.ok(h >= prev, `monotonic at ${t}`); prev = h; }
  assert.ok(height3d({ tower: 90, w: 8, h: 8 }) < 16, 'a 90-storey tower is capped like the 2D view');
  assert.ok(Math.abs(height3d({ tower: 22, w: 9, h: 7 }) - (7.2 + (buildingHeight({ tower: 22 }) - 152) / 32)) < 1e-9);
  assert.equal(buildingKind({ id: 'x', tower: 22 }), 'tower');
  assert.equal(buildingKind({ id: 'x', round: true }), 'lighthouse');
  assert.equal(buildingKind({ id: 'b', name: 'The Kettle & Crumb' }), 'shop');
  assert.equal(buildingKind({ id: 'b', name: 'Mason Warehouse' }), 'industrial');
});

test('rooms: wall runs merge W tiles into long walls; north and west stand, south and east are a kerb, partitions by direction', () => {
  const rows = ['WWWWWWW', 'W..W..W', 'W..W..W', 'W.....W', 'WWWWWWW'].map((r) => [...r]);
  const map = { width: 7, height: 5, tileAt: (x, y) => rows[y]?.[x] };
  const runs = wallRuns(map);
  const tiles = runs.reduce((n, r) => n + r.len, 0);
  assert.equal(tiles, rows.flat().filter((c) => c === 'W').length, 'every W tile is in exactly one run');
  assert.ok(runs.length <= 6, `merged (${runs.length} runs)`);
  const cls = (r) => wallClass(r.x, r.y, 7, 5, r.horizontal, false);
  const north = runs.find((r) => r.y === 0 && r.horizontal);
  assert.equal(cls(north), 'tall');
  assert.equal(cls(runs.find((r) => r.y === 4 && r.horizontal)), 'low');
  assert.equal(cls(runs.find((r) => r.x === 0 && !r.horizontal)), 'tall');
  assert.equal(cls(runs.find((r) => r.x === 6 && !r.horizontal)), 'low');
  assert.equal(cls(runs.find((r) => r.x === 3 && !r.horizontal)), 'low', 'a vertical partition would hide the next room: kerb');
  assert.equal(wallClass(0, 0, 7, 5, true, true), 'low', 'a roofed upper floor: everything a kerb');
});

test('people: personKey changes with the look, yaw faces the direction of travel, turns take the short way round', () => {
  const a = { skin: '#d9a77c', hair: '#2f2a35', hairStyle: 'short', outfit: '#3f7f8f' };
  assert.equal(personKey(a, null), personKey({ ...a }, null));
  assert.notEqual(personKey(a, null), personKey({ ...a, hair: '#ffffff' }, null));
  assert.notEqual(personKey(a, null), personKey(a, 'rifle'), 'a held weapon changes the figure');
  // yaw 0 faces south (+z); east is +pi/2, north pi, west -pi/2
  assert.ok(Math.abs(yawOf(0, 1)) < 1e-9);
  assert.ok(Math.abs(yawOf(1, 0) - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(Math.abs(yawOf(0, -1)) - Math.PI) < 1e-9);
  assert.ok(Math.abs(yawOf(-1, 0) + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(angleDiff(3, -3) - (2 * Math.PI - 6)) < 1e-9, 'the short way across the seam');
  // an actor that walks east turns to face east within a few frames; one that stops keeps the way it was walking
  const actor = { x: 0, y: 0, facing: 'down' };
  const m = newMotion(actor);
  let yaw = 0;
  for (let i = 0; i < 30; i++) { actor.x += 2; yaw = stepFacing(m, actor, i * 0.016, 0.016, facingVector, null); }
  assert.ok(Math.abs(yaw - Math.PI / 2) < 0.05, `east (${yaw})`);
  actor.facing = 'right';
  for (let i = 30; i < 90; i++) yaw = stepFacing(m, actor, i * 0.016, 0.016, facingVector, null);
  assert.ok(Math.abs(yaw - Math.PI / 2) < 0.05, 'standing still keeps the facing');
  // a held gun aimed north-east turns the figure that way whatever it was doing
  for (let i = 90; i < 150; i++) yaw = stepFacing(m, actor, i * 0.016, 0.016, facingVector, { x: 1, y: -1 });
  assert.ok(Math.abs(yaw - yawOf(1, -1)) < 0.05, `aim (${yaw})`);
});

test('light: day, dusk and night presets, interpolated by darkness; lamps burn only by night', () => {
  assert.equal(presetFor(0).sun, PRESETS.day.sun);
  assert.ok(Math.abs(presetFor(0.5).sunI - PRESETS.dusk.sunI) < 1e-9);
  assert.equal(presetFor(1).sky, PRESETS.night.sky);
  assert.ok(presetFor(0.25).sunI < PRESETS.day.sunI && presetFor(0.25).sunI > PRESETS.dusk.sunI);
  assert.equal(presetFor(0.3, false).sky, PRESETS.indoor.sky.length ? presetFor(0, false).sky : '');
  assert.equal(lampFactor(0), 0);
  assert.equal(lampFactor(0.2), 0);
  assert.equal(lampFactor(1), 1);
  assert.ok(lampFactor(0.45) > 0 && lampFactor(0.45) < 1);
});

// ---- a building's materials are its own: the see-through hole of one building must not reach another's parts --------------
import { buildRoofed, buildOpen, buildRoom, seeThrough, makeHole } from '../src/engine3d/buildings3d.js';

function withFakeDom(fn) {
  const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 40 }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const had = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = { createElement: () => ({ width: 8, height: 8, getContext: () => ctx }) };
  try { return fn(); } finally { if (had) Object.defineProperty(globalThis, 'document', had); else delete globalThis.document; }
}

test('buildings: every material of a roofed building is its own (none shared with another building), so a hole never leaks', () => {
  withFakeDom(() => {
    const shared = { roofTex: new Map(), wallMat: new Map() };
    const mk = (id, x) => ({ id, x, y: 5, w: 6, h: 5, wall: '#cfc4ae', trim: '#5a4a3e', roof: '#a04a3a', sign: id.toUpperCase(), door: { x: x + 2, y: 9 }, awning: '#d9826a', columns: id === 'b' });
    const a = buildRoofed(mk('a', 2), shared);
    const b = buildRoofed(mk('b', 12), shared);
    const ids = new Set(a.mats.map((m) => m.uuid));
    assert.ok(a.mats.length > 5 && b.mats.length > 5);
    assert.ok(b.mats.every((m) => !ids.has(m.uuid)), 'no material is common to two buildings');
    assert.ok([...a.mats, ...b.mats].every((m) => !m.userData.keep), 'none is one of the shared cached materials');
    // patch one building: only its materials carry the hole
    const hole = makeHole();
    for (const m of a.mats) seeThrough(m, hole);
    assert.ok(a.mats.every((m) => m.userData.seeThrough));
    assert.ok(b.mats.every((m) => !m.userData.seeThrough && !m.onBeforeCompile.toString().includes('uHole')));
    assert.equal(a.group.position.x, 2 + 3);
    assert.ok(a.lights.some((l) => l.door), 'a door lamp is a candidate light');
  });
});

test('buildings: an open room has its walls, a doorway and the sign post, and is not a roofed box', () => {
  withFakeDom(() => {
    const shared = { roofTex: new Map(), wallMat: new Map() };
    const rows = ['WWWWWW', 'W....W', 'W....W', 'WW.WWW'].map((r) => [...r]);
    const I = { width: 6, height: 4, tileAt: (x, y) => rows[y]?.[x], doors: [{ x: 2, y: 3 }], props: [{ type: 'window', x: 2, y: 0 }] };
    const o = buildOpen({ id: 'o', x: 3, y: 4, w: 6, h: 4, trim: '#5a4a3e', wall: '#cfc4ae', sign: 'OPEN' }, I, shared);
    assert.equal(o.position.x, 3);
    assert.equal(o.position.z, 4);
    const walls = o.userData.room;
    assert.ok(walls.userData.windows.length === 1 && walls.children.length >= 4);
    const room = buildRoom(I, { wall: '#cfc4ae', trim: '#5a4a3e' }, { H: 2.3 }, shared);
    const tallest = new THREE.Box3().setFromObject(room).max.y;
    assert.ok(tallest > 2 && tallest < 2.5, `north and west walls stand one storey (${tallest})`);
    const roofedRoom = buildRoom(I, { wall: '#cfc4ae', trim: '#5a4a3e' }, { H: 2.3, roofed: true }, shared);
    assert.ok(new THREE.Box3().setFromObject(roofedRoom).max.y < 2, 'a roofed floor: every wall a kerb (and the window frames)');
  });
});
