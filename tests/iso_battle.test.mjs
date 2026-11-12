// The battle screen's isometric camera and picking (src/engine/drawBattle.js, docs/RENDERING.md 2.6): the iso inverse, screen-space
// picking, the building fade rule, the prism hit. Pure maths: the view is built on a stub canvas, nothing is drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleView, TP, needsFade } from '../src/engine/drawBattle.js';
import { project, prismHit, hidesPoint } from '../src/engine/iso.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const stub = (w = 1200, h = 700, left = 40, top = 30) => ({ width: w, height: h, getContext: () => ({}), getBoundingClientRect: () => ({ left, top, width: w, height: h }) });
function view(zoom = 1, map = { w: 96, h: 64, buildings: [] }) {
  const v = new BattleView(stub());
  v.map = map; v.cam.zoom = zoom; v.scene = { recs: new Map() };
  return v;
}
const inf = (id, x, y) => ({ id, side: 'p', kind: 'inf', alive: true, x, y });

test('toWorld inverts toScreen at every zoom tier, on the ground and at height', () => {
  for (const zoom of [0.4, 1, 3]) {
    const v = view(zoom);
    v.center(40, 30);
    for (const [x, y, z] of [[1200, 900, 0], [640, 1111, 0], [2500, 1700, 18], [95, 40, 46]]) {
      const s = v.toScreen(x, y, z);
      const w = v.toWorld(s.x, s.y, z);
      near(w.x, x); near(w.y, y);
    }
  }
});

test('the tier follows the zoom, and the zoom steps keep the point under the cursor fixed', () => {
  const v = view(1); v.center(40, 30);
  assert.equal(new BattleView(stub()).tier(), 'command');
  for (const [z, tier] of [[0.4, 'far'], [1, 'command'], [3, 'close']]) { v.cam.zoom = z; assert.equal(v.tier(), tier); }
  v.cam.zoom = 1; v.center(40, 30);
  const sx = 300; const sy = 250; const before = v.toWorld(sx, sy);
  v.zoomBy(1.25, sx, sy); v.zoomBy(1.25, sx, sy);
  const after = v.toWorld(sx, sy);
  near(after.x, before.x, 1e-6); near(after.y, before.y, 1e-6);
});

test('the screen axes: moving the camera right moves the world point along (+x, -y)', () => {
  const v = view(1); v.center(40, 30);
  const a = v.toWorld(300, 300); v.cam.x += 64; const b = v.toWorld(300, 300);
  near(b.x - a.x, 32); near(b.y - a.y, -32); // screen-right is world (+x, -y)
  v.cam.y += 32; const c = v.toWorld(300, 300);
  near(c.x - b.x, 32); near(c.y - b.y, 32); // screen-down is world (+x, +y)
});

test('clamp keeps the middle of the view over the map', () => {
  const v = view(1);
  for (const [x, y] of [[-9000, -9000], [90000, 0], [0, 90000], [1e5, 1e5]]) {
    v.cam.x = x; v.cam.y = y; v.clamp();
    const c = v.toWorld(v.cv.getBoundingClientRect().left + v.cv.width / 2, v.cv.getBoundingClientRect().top + v.cv.height / 2);
    assert.ok(c.x >= -40 - 1e-6 && c.x <= v.map.w * TP + 40 + 1e-6, `x ${c.x}`);
    assert.ok(c.y >= -40 - 1e-6 && c.y <= v.map.h * TP + 40 + 1e-6, `y ${c.y}`);
  }
});

test('picking is by the screen position: the unit under the pointer, not a world neighbour', () => {
  const v = view(1); v.center(30, 20);
  // two units one tile apart along the screen's vertical axis (world +x +y): the pointer on the upper one picks the upper one
  const a = inf('a', 30, 20); const b = inf('b', 31, 21); const c = inf('c', 60, 40);
  const pa = v.chest(a); const pb = v.chest(b);
  assert.ok(pb.y > pa.y + 20);
  assert.equal(v.unitAt([a, b, c], pa.x, pa.y).id, 'a');
  assert.equal(v.unitAt([a, b, c], pb.x + 2, pb.y - 3).id, 'b');
  assert.equal(v.unitAt([a, b, c], pa.x + 300, pa.y + 300), null);
});

test('a dragged screen rectangle selects the units whose screen positions are in it', () => {
  const v = view(1); v.center(30, 20);
  const us = [inf('a', 28, 18), inf('b', 30, 20), inf('c', 32, 22), inf('d', 36, 14), inf('e', 24, 26)];
  const P = Object.fromEntries(us.map((u) => [u.id, v.chest(u)]));
  // a rectangle round b and c only (they lie on the vertical screen line; d and e are far to the right and left)
  const x0 = Math.min(P.b.x, P.c.x) - 12; const x1 = Math.max(P.b.x, P.c.x) + 12; const y0 = Math.min(P.b.y, P.c.y) - 12; const y1 = Math.max(P.b.y, P.c.y) + 12;
  assert.deepEqual(v.unitsIn(us, x0, y0, x1, y1).map((u) => u.id).sort(), ['b', 'c']);
  assert.deepEqual(v.unitsIn(us, x1, y1, x0, y0).map((u) => u.id).sort(), ['b', 'c']); // (the drag may run any way)
  // a tiny screen box round one unit catches only that unit
  const strip = v.unitsIn(us, P.a.x - 6, P.a.y - 6, P.a.x + 6, P.a.y + 6).map((u) => u.id);
  assert.deepEqual(strip, ['a']);
  assert.deepEqual(v.unitsIn(us, -1e5, -1e5, 1e5, 1e5).length, us.length);
});

test('a unit behind a building is reported as needing the fade; beside, in front or inside it is not', () => {
  const box = { x0: 640, y0: 640, x1: 800, y1: 800 }; // 5 x 5 tiles
  const H = 104;
  assert.equal(needsFade(box, H, { x: 700, y: 610, z: 14 }), true); // just north of it, within the height's reach
  assert.equal(needsFade(box, H, { x: 610, y: 700, z: 14 }), true); // just west
  assert.equal(needsFade(box, H, { x: 640 + 80, y: 800 + 20, z: 14 }), false); // in front (south)
  assert.equal(needsFade(box, H, { x: 800 + 20, y: 700, z: 14 }), false); // beside, east
  assert.equal(needsFade(box, H, { x: 720, y: 720, z: 0 }), false); // inside the footprint
  assert.equal(needsFade(box, H, { x: 100, y: 100, z: 14 }), false); // far behind: the building does not reach over it
  // the cursor on the ground: z defaults to 0
  assert.equal(needsFade(box, H, { x: 700, y: 620 }), true);
  assert.equal(hidesPoint(box, H, 700, 620, 0), true);
});

test('prismHit: the screen point on a box shows its roof at the top and the nearest face below', () => {
  const box = { x0: 640, y0: 640, x1: 800, y1: 800 }; const H = 104;
  const roof = project(720, 720, H); // the middle of the roof
  assert.equal(prismHit(box, H, roof.x, roof.y), H);
  const face = project(720, 800, 40); // on the south face, 40 px up
  near(prismHit(box, H, face.x, face.y), 40, 1e-6);
  const ground = project(720, 720, 0); // the middle of the footprint is covered by the roof above it
  assert.ok(prismHit(box, H, ground.x, ground.y) >= 0);
  assert.equal(prismHit(box, H, project(300, 300, 0).x, project(300, 300, 0).y), -1);
  assert.equal(prismHit(box, H, project(720, 600, 200).x, project(720, 600, 200).y), -1); // above and behind
});

test('buildingAt finds the building the pointer is on, by its picture, not by the ground tile beneath', () => {
  const b = { id: 7, x: 20, y: 20, w: 5, h: 5, floors: 2 };
  const v = view(1, { w: 96, h: 64, buildings: [b] });
  v.scene.recs.set(7, { id: 7, x: 20, y: 20, w: 5, h: 5, storeys: 2 });
  v.center(22, 22);
  const roof = v.toScreen(22.5 * TP, 22.5 * TP, 104); // a point on the roof (8 + 2 * 48 high)
  assert.equal(v.buildingAt(roof.x, roof.y)?.id, 7);
  assert.equal(v.toTile(roof.x, roof.y).x < 22.5, true); // (the ground under that screen point lies well to the north-west)
  const far = v.toScreen(60 * TP, 10 * TP, 0);
  assert.equal(v.buildingAt(far.x, far.y), null);
  v.opened = { 7: { floor: 0 } };
  assert.equal(v.buildingAt(roof.x, roof.y), null); // an open building's plan is on the ground: it is not "the roof"
});
