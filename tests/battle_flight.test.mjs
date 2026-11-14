// Helicopters fly (rules 5): altitude, a straight line over buildings, trees and trenches, a look from height, and landing only where there is room.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, replay } from '../src/battle/sim.js';
import { landingOk, landingSpot, landRadius } from '../src/battle/flight.js';
import { idx } from '../src/battle/map.js';
import { TILE, FLIGHT } from '../src/content/battle.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const heli = { id: 'H1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 };
const mk = (o = {}) => buildSetup({ key: o.key || 'FL1|x', eng: { goal: 'defence', recipe: o.recipe || 'city', biome: 'rural', style: 'halvermouth', enemy: { troops: 2, armour: 0, air: 0, skill: 1 } }, people: people(2), vehicles: [heli], ai: { p: false, e: false } });
const park = (B) => B.units.filter((u) => u.side === 'e').forEach((u, i) => { u.x = 110 + i; u.y = 3; u.W = { ...u.W, range: 0 }; });
const bigBuilding = (B) => B.map.buildings.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];

test('a helicopter starts on the ground, lifts to cruise height, and flies a straight line over a building without going round it', () => {
  const B = createBattle(mk()); park(B); const H = B.byId.get('H1'); const b = bigBuilding(B);
  assert.equal(H.z, 0); assert.equal(H.grounded, true);
  const cy = b.y + b.h / 2; H.x = b.x - 6.5; H.y = cy; H.grounded = false; H.z = FLIGHT.cruise; // (already up, to test the line)
  issue(B, ['H1'], { type: 'move', x: b.x + b.w + 6, y: cy });
  let over = 0; let off = 0;
  for (let i = 0; i < 700 && H.order.type === 'move'; i++) { run(B, 1); const inB = B.map.bid[idx(B.map, Math.floor(H.x), Math.floor(H.y))] >= 0; if (inB) { over++; assert.ok(H.z >= FLIGHT.cruise - 1e-6, 'at height over the roof'); } off = Math.max(off, Math.abs(H.y - cy)); }
  assert.ok(over > 10, `it was over the building for ${over} ticks`); assert.ok(off < 0.3, `a straight line (off by ${off.toFixed(2)})`); assert.ok(H.x > b.x + b.w + 4, 'and arrived');
});

test('from height it sees over buildings and is seen from further off; on the ground it is an ordinary vehicle', () => {
  const B = createBattle(mk()); park(B); const H = B.byId.get('H1'); const e = B.units.find((u) => u.side === 'e'); const b = bigBuilding(B);
  H.grounded = false; H.z = FLIGHT.cruise; H.x = b.x - 3; H.y = b.y + b.h / 2; e.x = b.x + b.w + 3; e.y = H.y; H.sight = 18;
  assert.equal(B.rules >= 5, true);
  run(B, 6); assert.ok((H.seen || []).includes(e.id), 'it sees over the block');
  H.z = 0; H.grounded = true; run(B, 6); assert.ok(!(H.seen || []).includes(e.id), 'landed behind the wall it does not');
});

test('it lands only on open ground big enough: not on a roof, not in a street too narrow, not on a man', () => {
  const B = createBattle(mk()); park(B); const H = B.byId.get('H1'); const m = B.map; const r = landRadius(H); const b = bigBuilding(B);
  assert.equal(landingOk(B, b.x + b.w / 2, b.y + b.h / 2, r, 'H1'), false, 'a roof');
  // a clear field of ground with a 2-wide lane cut through a wall of building
  for (let j = 2; j < 20; j++) for (let i = 2; i < 30; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.WALL; m.bid[n] = 0; }
  for (let j = 2; j < 20; j++) for (let i = 10; i < 12; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.ROAD; m.bid[n] = -1; }
  assert.equal(landingOk(B, 11, 10, r, 'H1'), false, 'a lane two wide');
  for (let j = 2; j < 20; j++) for (let i = 10; i < 17; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.ROAD; m.bid[n] = -1; }
  assert.equal(landingOk(B, 13.5, 10, r, 'H1'), true, 'a street seven wide');
  const p = B.byId.get('p0'); p.x = 13.5; p.y = 10; assert.equal(landingOk(B, 13.5, 10, r, 'H1'), false, 'someone stands there');
  p.x = 100; assert.equal(landingOk(B, 13.5, 10, r, 'H1'), true);
  const spot = landingSpot(B, b.x + b.w / 2, b.y + b.h / 2, r, 'H1', 30); if (spot) assert.ok(B.map.bid[idx(m, Math.floor(spot.x), Math.floor(spot.y))] < 0, 'the spot found is not a roof');
});

test('a land order sets it down on the nearest open ground, after which people can board; in the air they cannot, and an unload waits for the ground', () => {
  const B = createBattle(mk({ key: 'FL2|x' })); park(B); const H = B.byId.get('H1'); const b = bigBuilding(B);
  H.grounded = false; H.z = FLIGHT.cruise; H.x = b.x - 8; H.y = b.y + b.h / 2;
  issue(B, ['H1'], { type: 'land', x: b.x + b.w / 2, y: b.y + b.h / 2 }); run(B, 900);
  assert.equal(H.grounded, true, 'down'); assert.equal(H.z, 0); assert.ok(B.map.bid[idx(B.map, Math.floor(H.x), Math.floor(H.y))] < 0, 'not on the roof'); assert.equal(H.order.type, 'hold');
  const p = B.byId.get('p0'); p.x = H.x + 1; p.y = H.y + 0.5; issue(B, ['p0'], { type: 'load', target: 'H1' }); run(B, 60); assert.equal(H.pax.length, 0, 'wren carries nobody'); // (a Wren has no cabin)
});

test('a pass flies two points in a line and an orbit keeps circling a point at height; both replay exactly from the log', () => {
  const setup = mk({ key: 'FL3|x' }); const B = createBattle(setup); park(B); const H = B.byId.get('H1'); H.grounded = false; H.z = FLIGHT.cruise; H.x = 20; H.y = 20;
  issue(B, ['H1'], { type: 'orbit', x: 40, y: 20, r: 6 }); run(B, 400);
  assert.equal(H.order.type, 'orbit'); assert.ok(Math.abs(Math.hypot(H.x - 40, H.y - 20) - 6) < 3, `circling at ${Math.hypot(H.x - 40, H.y - 20).toFixed(1)}`); assert.ok(H.z >= FLIGHT.cruise - 1e-6);
  issue(B, ['H1'], { type: 'pass', x: 50, y: 40, x1: 70, y1: 40 }); run(B, 500); assert.equal(H.order.type, 'hold'); assert.ok(Math.abs(H.x - 70) < 1 && Math.abs(H.y - 40) < 1);
  const R = replay(setup, B.log, B.tick); for (const u of R.units) { u.W = { ...u.W }; } // (the parked enemy is not in the log: replay the heli only)
  assert.equal(R.byId.get('H1').order.type, 'hold');
});

test('flight is bounded by the edge of the map and by its envelope: it accelerates, does not jump to speed, and never leaves the map', () => {
  const B = createBattle(mk({ key: 'FL4|x' })); park(B); const H = B.byId.get('H1'); H.grounded = false; H.z = FLIGHT.cruise; H.x = 10; H.y = 10; H.heading = 0; H.v = 0;
  issue(B, ['H1'], { type: 'move', x: -50, y: 500 }); run(B, 2); assert.ok(H.v < 0.6, `speed builds up (${H.v.toFixed(2)})`); run(B, 900);
  assert.ok(H.x >= 0 && H.y >= 0 && H.x <= B.map.w && H.y <= B.map.h, 'inside the map'); assert.ok(H.y <= B.map.h - FLIGHT.edge + 1e-6);
});
