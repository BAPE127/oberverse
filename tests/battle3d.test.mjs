// The battle in 3D (src/engine3d/battle3d.js, docs/RENDERING.md 7, phase 3D-4): the pure parts, with no WebGL. The 3D camera must land every point on the
// pixel BattleView.toCanvas gives (so picking, boxes and orders are the 2D battle's), the view rectangle must cover the canvas, the hole shader patch takes
// several holes, the soldier kit takes the battle's side colours, the 3D height is what picking uses, and with no WebGL the layer is simply absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import { cameraFrame, applyFrame } from '../src/engine3d/camera3d.js';
import { Battle3D, viewTiles, hides } from '../src/engine3d/battle3d.js';
import { makeHoles, seeThroughN, HOLES, height3d } from '../src/engine3d/buildings3d.js';
import { personKey, personGeometry } from '../src/engine3d/people3d.js';
import { BattleView, TP, needsFade } from '../src/engine/drawBattle.js';
import { unproject } from '../src/engine/iso.js';

const stub = (w = 1280, h = 800, left = 0, top = 0) => ({ width: w, height: h, getContext: () => ({}), getBoundingClientRect: () => ({ left, top, width: w, height: h }) });
function view(zoom = 1, map = { w: 120, h: 76, buildings: [] }) {
  const v = new BattleView(stub());
  v.map = map; v.cam.zoom = zoom; v.scene = { recs: new Map() };
  return v;
}
function project3d(cam, W, H, wx, wy, z) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
  applyFrame(camera, cameraFrame(cam, W, H));
  const p = new THREE.Vector3(wx / TP, z / TP, wy / TP).project(camera);
  return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
}

test('the 3D camera lands every point where BattleView.toCanvas puts it, at every zoom tier and pan', () => {
  let worst = 0;
  for (const zoom of [0.3, 0.4, 0.55, 1, 1.25, 1.8, 2.37, 3, 4]) {
    const v = view(zoom);
    for (const [tx, ty] of [[10, 10], [60, 38], [110, 70]]) {
      v.center(tx, ty);
      for (const [wx, wy, z] of [[10 * TP, 10 * TP, 0], [60 * TP + 13.5, 38 * TP - 7.25, 0], [90 * TP, 50 * TP, 10], [40 * TP, 20 * TP, 46], [200, 3000, 120]]) {
        const a = v.toCanvas(wx, wy, z);
        const b = project3d(v.cam, v.cv.width, v.cv.height, wx, wy, z);
        worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
  }
  assert.ok(worst < 0.01, `worst error ${worst} px`);
});

test('a pixel picked on the ground under the 3D camera is the tile the 2D battle reports (the click -> order path)', () => {
  const v = view(1.8); v.center(50, 30);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
  applyFrame(camera, cameraFrame(v.cam, v.cv.width, v.cv.height));
  for (const [sx, sy] of [[100, 100], [640, 400], [1100, 700]]) {
    // the ray through the pixel meets the ground plane y = 0 at the world point toTile reports
    const ndc = new THREE.Vector3((sx / v.cv.width) * 2 - 1, 1 - (sy / v.cv.height) * 2, 0).unproject(camera);
    const dir = new THREE.Vector3(-1, -1, -1).normalize();
    const k = -ndc.y / dir.y; const hit = ndc.clone().addScaledVector(dir, k);
    const t = v.toTile(sx, sy);
    assert.ok(Math.abs(hit.x - t.x) < 1e-6 && Math.abs(hit.z - t.y) < 1e-6, `${hit.x},${hit.z} vs ${t.x},${t.y}`);
  }
});

test('viewTiles covers every ground point the canvas shows, and only a little more', () => {
  for (const zoom of [0.4, 1, 3]) {
    const v = view(zoom); v.center(60, 38);
    const W = v.cv.width; const H = v.cv.height; const r = viewTiles(v.cam, W, H, 0);
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2], [10, H - 10]]) {
      const w = unproject(v.cam.x + sx / zoom, v.cam.y + sy / zoom, 0);
      assert.ok(w.x / TP >= r.x0 - 1e-9 && w.x / TP <= r.x1 + 1e-9 && w.y / TP >= r.y0 - 1e-9 && w.y / TP <= r.y1 + 1e-9);
    }
    const p = viewTiles(v.cam, W, H, 2); assert.ok(Math.abs(p.x1 - p.x0 - (r.x1 - r.x0 + 4)) < 1e-9);
  }
});

test('the 3D hole rule is the 2D battle\'s needsFade: a building hides a focus behind it', () => {
  const box = { x0: 10 * TP, y0: 10 * TP, x1: 16 * TP, y1: 16 * TP };
  for (const h of [60, 120, 400]) for (const f of [{ x: 12 * TP, y: 8 * TP, z: 14 }, { x: 18 * TP, y: 18 * TP, z: 14 }, { x: 13 * TP, y: 13 * TP, z: 0 }, { x: 4 * TP, y: 15 * TP, z: 22 }, { x: 12 * TP, y: 6 * TP, z: 22 }]) assert.equal(hides(box, h, f), needsFade(box, h, f));
  assert.equal(hides(box, 120, { x: 12 * TP, y: 9 * TP, z: 14 }), true); // (just behind the north face, under the roof's shadow on screen)
});

test('the hole shader takes several holes at once and skips the loop when none is active', () => {
  const u = makeHoles();
  assert.equal(u.value.length, HOLES); assert.ok(HOLES >= 6);
  assert.equal(u.on.value, 0);
  const m = new THREE.MeshLambertMaterial();
  seeThroughN(m, u); seeThroughN(m, u); // (twice: patched once)
  const shader = { uniforms: {}, fragmentShader: 'void main() {\n  gl_FragColor = vec4(1.0);\n}' };
  m.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uHoles, u); assert.equal(shader.uniforms.uHoleOn, u.on);
  assert.match(shader.fragmentShader, /uniform vec4 uHoles\[6\]/);
  assert.match(shader.fragmentShader, /if \(uHoleOn > 0\.5\) for \(int i = 0; i < 6; i\+\+\)/);
  assert.match(shader.fragmentShader, /discard/);
  assert.equal(m.userData.seeThrough, true);
  // one hole's uniform is { x, y, r, on } in gl_FragCoord pixels
  u.value[3].set(400, 300, 90, 1); assert.equal(u.value[3].w, 1);
});

test('soldiers take the battle\'s side colours; the world\'s soldier kit is unchanged without them', () => {
  const app = { skin: '#e2b896', hair: '#3a2f2a', hairStyle: 'short', outfit: '#8a3a30', seed: 's0' };
  const mine = { ...app, uniform: { top: '#5e7a46', legs: '#3c5a34', helm: '#4f6a3e' } };
  const theirs = { ...app, uniform: { top: '#a8453a', legs: '#6a3028', helm: '#7a3a30' } };
  assert.notEqual(personKey(mine, 'ar', 'soldier'), personKey(theirs, 'ar', 'soldier'));
  assert.notEqual(personKey(mine, 'ar', 'soldier'), personKey(app, 'ar', 'soldier'));
  const has = (geo, hex) => { const c = new THREE.Color(hex); const a = geo.attributes.color; for (let i = 0; i < a.count; i++) if (Math.abs(a.getX(i) - c.r) < 1e-4 && Math.abs(a.getY(i) - c.g) < 1e-4 && Math.abs(a.getZ(i) - c.b) < 1e-4) return true; return false; };
  assert.ok(has(personGeometry(mine, 'ar', 'soldier').body, '#5e7a46'));
  assert.ok(has(personGeometry(theirs, 'ar', 'soldier').body, '#a8453a'));
  assert.ok(has(personGeometry(theirs, 'ar', 'soldier').body, '#7a3a30')); // the helmet
  assert.ok(has(personGeometry(app, 'ar', 'soldier').body, '#59633f')); // the world's own soldier green
  assert.ok(!has(personGeometry(app, 'ar', 'soldier').body, '#a8453a'));
});

test('the 3D battle building is taller than its picture, and picking uses the height that is drawn', () => {
  const rec = (floors) => ({ id: 1, x: 10, y: 10, w: 6, h: 6, storeys: floors, floors, wall: '#a9564a', roof: '#6a6e74', trim: '#d8c8a8', glass: '#7aa3b8', door: { x: 13, y: 15 } });
  const self = { rec3: Battle3D.prototype.rec3 };
  for (const n of [1, 2, 4, 6]) {
    const r3 = Battle3D.prototype.rec3.call({}, rec(n));
    assert.equal(r3.glass, undefined); // (the glass flag would paint the whole facade as a glass tower)
    assert.equal(r3.tower, n > 1 ? n : 0);
    assert.ok(Math.abs(Battle3D.prototype.heightPx.call(self, rec(n)) - height3d(r3) * TP) < 1e-9);
    assert.ok(Math.abs(height3d(r3) - (0.3 + n * 2.3)) < 1e-9);
  }
  // a click above the 2D roof but on the 3D wall picks the building when the 3D layer is on
  const b = { id: 1, x: 10, y: 10, w: 6, h: 6, floors: 4 };
  const v = view(1, { w: 40, h: 30, buildings: [b] }); v.center(13, 13); v.scene = { recs: new Map([[1, rec(4)]]) };
  const top2d = v.toScreen(10 * TP, 10 * TP, 8 + 4 * 48); // the north corner of the 2D roof
  const above = { x: top2d.x, y: top2d.y - 40 };
  assert.equal(v.buildingAt(above.x, above.y), null);
  v.r3 = { heightPx: (r) => Battle3D.prototype.heightPx.call(self, r) };
  assert.equal(v.buildingAt(above.x, above.y)?.id, 1);
});

test('with no WebGL (no DOM) there is no 3D layer: the 2D battle is the picture', () => {
  const warn = console.warn; let said = '';
  console.warn = (...a) => { said += a.join(' '); };
  try { assert.equal(Battle3D.create({ cv: stub() }), null); } finally { console.warn = warn; }
  assert.match(said, /2D isometric battle/);
  assert.equal(Battle3D.stats(), null);
});
