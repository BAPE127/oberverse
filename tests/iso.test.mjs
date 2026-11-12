// The isometric view's maths (src/engine/iso.js): projection, depth rule, sort, fade, input rotation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, inFront, sortItems, behindBox, hidesPoint, rotateInput, spriteFacing, pointBox, bodyBox } from '../src/engine/iso.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const wall = { x0: 320, y0: 320, x1: 352, y1: 352 }; // one tile
const idx = (list, it) => list.indexOf(it);

test('project and unproject round trip, with height', () => {
  for (const [x, y, z] of [[0, 0, 0], [123.5, 77.25, 0], [900, 40, 18], [31, 640, 46], [5000, 5000, 420]]) {
    const p = project(x, y, z);
    const q = unproject(p.x, p.y, z);
    near(q.x, x);
    near(q.y, y);
  }
  assert.deepEqual(project(64, 0), { x: 64, y: 32 });
  assert.deepEqual(project(0, 64), { x: -64, y: 32 });
  assert.deepEqual(project(32, 32, 10), { x: 0, y: 22 });
});

test('a tile is a 64 x 32 diamond', () => {
  const n = project(0, 0);
  const e = project(32, 0);
  const s = project(32, 32);
  const w = project(0, 32);
  assert.equal(e.x - w.x, 64);
  assert.equal(s.y - n.y, 32);
});

test('inFront: a person 2 px south of a wall tile is in front, 6 px north behind', () => {
  const south = pointBox(336, 352 + 2);
  const north = pointBox(336, 320 - 6);
  assert.equal(inFront(south, wall), true);
  assert.equal(inFront(wall, south), false);
  assert.equal(inFront(north, wall), false);
  assert.equal(inFront(wall, north), true);
});

test('inFront: a person beside a wall tile, west or east', () => {
  const east = pointBox(352 + 3, 336);
  const west = pointBox(320 - 3, 336);
  assert.equal(inFront(east, wall), true);
  assert.equal(inFront(wall, west), true);
});

test('inFront: a 60 px car beside a wall is ordered by the side it is on', () => {
  const carSouth = bodyBox(336, 352 + 17, 60, 30, 0); // rolling along x, just south of the wall
  const carNorth = bodyBox(336, 320 - 17, 60, 30, 0);
  assert.equal(inFront(carSouth, wall), true);
  assert.equal(inFront(wall, carNorth), true);
  // a car whose long box spans the wall's x range is not mistaken for being behind a wall it passes
  const carEast = bodyBox(352 + 20, 336, 60, 30, Math.PI / 2);
  assert.equal(inFront(carEast, wall), true);
});

test('inFront: a tree beside an east face', () => {
  const building = { x0: 100, y0: 100, x1: 300, y1: 250 };
  const tree = { x0: 300, y0: 150, x1: 332, y1: 182 }; // against the east face
  const treeNorthEast = { x0: 310, y0: 60, x1: 342, y1: 92 };
  assert.equal(inFront(tree, building), true);
  assert.equal(inFront(treeNorthEast, building), true);
});

test('inFront: an actor behind, in front of and beside a building', () => {
  const b = { x0: 100, y0: 100, x1: 300, y1: 250 };
  assert.equal(inFront(b, pointBox(200, 60)), true, 'behind (north): the building covers them');
  assert.equal(inFront(b, pointBox(60, 60)), true, 'behind (north-west)');
  assert.equal(inFront(pointBox(200, 280), b), true, 'in front (south)');
  assert.equal(inFront(pointBox(320, 200), b), true, 'beside (east)');
  assert.equal(inFront(b, pointBox(80, 200)), true, 'beside (west): the building is nearer');
});

test('sortItems never puts an item behind a box after the box that hides it', () => {
  const b = { box: { x0: 100, y0: 100, x1: 300, y1: 250 }, up: 120, name: 'building' };
  const behindN = { box: pointBox(200, 80), up: 48, name: 'behindN' };
  const behindW = { box: pointBox(70, 160), up: 48, name: 'behindW' };
  const front = { box: pointBox(200, 270), up: 48, name: 'front' };
  const east = { box: pointBox(320, 180), up: 48, name: 'east' };
  const out = sortItems([front, b, east, behindW, behindN]);
  assert.ok(idx(out, behindN) < idx(out, b));
  assert.ok(idx(out, behindW) < idx(out, b));
  assert.ok(idx(out, b) < idx(out, front));
  assert.ok(idx(out, b) < idx(out, east));
  assert.equal(out.length, 5);
});

test('sortItems: a person walking along a wall is ordered by the side they are on', () => {
  const wallItem = { box: wall, up: 56 };
  for (let y = 300; y <= 372; y += 4) {
    const p = { box: pointBox(336, y), up: 40 };
    const out = sortItems([p, wallItem]);
    const behind = y + 2 <= wall.y0;
    const infront = y - 2 >= wall.y1;
    if (behind) assert.ok(idx(out, p) < idx(out, wallItem), `y=${y}`);
    if (infront) assert.ok(idx(out, p) > idx(out, wallItem), `y=${y}`);
  }
});

test('sortItems: always a permutation, even with overlapping boxes and cycles', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const items = [];
  for (let i = 0; i < 160; i++) {
    const x = rnd() * 600;
    const y = rnd() * 600;
    const w = rnd() < 0.3 ? 20 + rnd() * 120 : 4;
    const h = rnd() < 0.3 ? 20 + rnd() * 120 : 4;
    items.push({ box: { x0: x, y0: y, x1: x + w, y1: y + h }, up: 30 + rnd() * 100, i });
  }
  const out = sortItems(items);
  assert.equal(out.length, items.length);
  assert.equal(new Set(out.map((o) => o.i)).size, items.length);
});

test('sortItems: with a clear rule, every decided pair on screen is in order', () => {
  // a row of separated items: nothing overlaps in a cycle, so the whole order must obey the rule
  const items = [];
  for (let i = 0; i < 8; i++) items.push({ box: { x0: i * 40, y0: 100, x1: i * 40 + 30, y1: 130 }, up: 50 });
  for (let i = 0; i < 8; i++) items.push({ box: { x0: i * 40, y0: 200, x1: i * 40 + 30, y1: 230 }, up: 50 });
  const out = sortItems(items.slice().reverse());
  for (const a of out) for (const b of out) {
    if (a === b) continue;
    const ra = { x0: a.box.x0 - a.box.y1, x1: a.box.x1 - a.box.y0, y0: (a.box.x0 + a.box.y0) / 2 - a.up, y1: (a.box.x1 + a.box.y1) / 2 };
    const rb = { x0: b.box.x0 - b.box.y1, x1: b.box.x1 - b.box.y0, y0: (b.box.x0 + b.box.y0) / 2 - b.up, y1: (b.box.x1 + b.box.y1) / 2 };
    const overlap = !(ra.x0 >= rb.x1 || rb.x0 >= ra.x1 || ra.y0 >= rb.y1 || rb.y0 >= ra.y1);
    if (overlap && (a.box.y0 >= b.box.y1 || a.box.x0 >= b.box.x1) && !(b.box.y0 >= a.box.y1 || b.box.x0 >= a.box.x1)) assert.ok(idx(out, a) > idx(out, b));
  }
});

test('behindBox is true only behind the footprint', () => {
  const box = { x0: 100, y0: 100, x1: 300, y1: 250 };
  assert.equal(behindBox({ x: 200, y: 60 }, box), true, 'north');
  assert.equal(behindBox({ x: 60, y: 60 }, box), true, 'north-west');
  assert.equal(behindBox({ x: 60, y: 180 }, box), true, 'west');
  assert.equal(behindBox({ x: 200, y: 180 }, box), false, 'inside');
  assert.equal(behindBox({ x: 200, y: 260 }, box), false, 'south');
  assert.equal(behindBox({ x: 310, y: 180 }, box), false, 'east');
  assert.equal(behindBox({ x: 310, y: 60 }, box), false, 'north-east');
  assert.equal(behindBox({ x: 310, y: 260 }, box), false, 'south-east');
});

test('hidesPoint: the building covers a person behind it, not one beside or in front', () => {
  const box = { x0: 100, y0: 100, x1: 300, y1: 250 };
  const h = 200;
  assert.equal(hidesPoint(box, h, 200, 60, 20), true, 'north, close: the wall is in the way');
  assert.equal(hidesPoint(box, h, 200, -400, 20), false, 'far north: the sight line clears the roof');
  assert.equal(hidesPoint(box, h, 200, 270, 20), false, 'south: in front');
  assert.equal(hidesPoint(box, h, 330, 150, 20), false, 'east: beside');
  assert.equal(hidesPoint(box, h, 60, 150, 20), true, 'west: the building hides what is beside its west face');
  assert.equal(hidesPoint(box, h, 200, 60, 260), false, 'a point above the roof');
});

test('rotateInput: the screen-cardinal keys give facing-consistent vectors', () => {
  const facing = (v) => {
    let { x, y } = v;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
  };
  assert.equal(facing(rotateInput({ x: 1, y: 0 })), 'right');
  assert.equal(facing(rotateInput({ x: -1, y: 0 })), 'left');
  assert.equal(facing(rotateInput({ x: 0, y: 1 })), 'down');
  assert.equal(facing(rotateInput({ x: 0, y: -1 })), 'up');
  // nearly unit length (speed is the same as before)
  for (const m of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
    const r = rotateInput(m);
    assert.ok(Math.abs(Math.hypot(r.x, r.y) - 1) < 0.03);
  }
});

test('rotateInput: screen diagonals are the world cardinals', () => {
  const up = rotateInput({ x: 1, y: -1 }); // up and right
  near(up.x, 0); near(up.y, -1);
  const right = rotateInput({ x: 1, y: 1 }); // down and right
  near(right.x, 1); near(right.y, 0);
  const down = rotateInput({ x: -1, y: 1 }); // down and left
  near(down.x, 0); near(down.y, 1);
  const left = rotateInput({ x: -1, y: -1 }); // up and left
  near(left.x, -1); near(left.y, 0);
  assert.equal(rotateInput({ x: 0, y: 0, sprint: true }).sprint, true);
  assert.deepEqual([rotateInput({ x: 0, y: 0 }).x, rotateInput({ x: 0, y: 0 }).y], [0, 0]);
});

test('rotateInput: screen up is north-west on the ground (and so is the sprite direction)', () => {
  const r = rotateInput({ x: 0, y: -1 });
  assert.ok(r.x < 0 && r.y < 0);
  assert.equal(spriteFacing(r.x, r.y), 'up');
  assert.equal(spriteFacing(1, -1), 'right');
  assert.equal(spriteFacing(-1, 1), 'left');
  assert.equal(spriteFacing(1, 1), 'down');
  assert.equal(spriteFacing(0, 1), 'down'); // south: screen down-left
  assert.equal(spriteFacing(1, 0), 'down'); // east: screen down-right
  assert.equal(spriteFacing(0, -1), 'up');
});
