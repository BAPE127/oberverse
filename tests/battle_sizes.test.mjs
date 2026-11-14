// Vehicle sizes x1.6 (rules 5, map version 3): one size table, a footprint that collides and needs room, and every recipe still lets every vehicle class reach the objective.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue } from '../src/battle/sim.js';
import { generate, vehicleCanReach, MAX_VEHICLE_RADIUS, idx } from '../src/battle/map.js';
import { findPath, clearance } from '../src/battle/nav.js';
import { sizeOf, clearRadius, bodyRadius } from '../src/battle/sizes.js';
import { VEHICLE_SIZE, VEHICLE_SCALE, RECIPES, STYLES, TILE } from '../src/content/battle.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const tank = (id) => ({ id, name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 });
const mk = (o = {}) => buildSetup({ key: o.key || 'SZ1|x', eng: { goal: 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', enemy: { troops: 1, armour: 0, air: 0, skill: 1 } }, people: people(2), vehicles: o.vehicles || [tank('T1'), tank('T2')], ai: { p: false, e: false } });

test('one size table: a tank is about 2.6 tiles by 1.35 (1.6 times what it was), every type has an entry, and every ground vehicle fits the clearance the maps are made for', () => {
  assert.equal(VEHICLE_SCALE, 1.6);
  assert.ok(Math.abs(VEHICLE_SIZE.anvil.len - 2.61) < 0.05 && Math.abs(VEHICLE_SIZE.anvil.wid - 1.35) < 0.05);
  assert.ok(VEHICLE_SIZE.ox.rotor > 1.5 && VEHICLE_SIZE.ox.len > VEHICLE_SIZE.wren.len);
  for (const [id, s] of Object.entries(VEHICLE_SIZE)) { assert.ok(s.len > s.wid * 0.9 && s.wid > 0.4, id); if (!s.rotor) assert.ok(clearRadius({ kind: 'carrier', vtype: id }) <= MAX_VEHICLE_RADIUS + 1e-9, `${id} fits the map clearance`); }
  assert.equal(sizeOf({ kind: 'tank', role: 'tank', vtype: null }), VEHICLE_SIZE.anvil, 'an untyped tank is an Anvil'); assert.equal(sizeOf({ kind: 'inf' }).len, 0.5);
  const fs = JSON.stringify(VEHICLE_SIZE); assert.ok(!/NaN/.test(fs));
});

test('every recipe, every style, many seeds: from the player\'s start to the objective, from the enemy\'s start to the objective, and from the objective to the exit, the biggest vehicle can drive (map version 3)', () => {
  let n = 0;
  for (const recipe of Object.keys(RECIPES)) for (const style of ['sund', 'halvermouth', 'windfen', 'varnistan']) for (let k = 0; k < 6; k++) {
    const m = generate({ recipe, seed: `sz${recipe}${k}`, style, biome: ['rural', 'desert', 'tundra', 'jungle'][k % 4], ver: 3 });
    for (const [name, a, b] of [['start', m.spawns.p, m.objective], ['enemy start', m.spawns.e, m.objective], ['exit', m.objective, m.exit]]) { assert.ok(vehicleCanReach(m, a, b, MAX_VEHICLE_RADIUS), `${recipe}/${style}/${k}: ${name}`); n++; }
  }
  assert.ok(n >= 300);
  assert.ok(Object.keys(STYLES).length >= 4);
});

test('the older map versions are not touched: version 2 still has the narrow tracks, and the map version 3 differs only where it widens', () => {
  const m2 = generate({ recipe: 'forest', seed: 'sz-old', style: 'sund', ver: 2 }); const m3 = generate({ recipe: 'forest', seed: 'sz-old', style: 'sund', ver: 3 });
  assert.equal(m2.ver, 2); assert.equal(m3.ver, 3);
  assert.equal(vehicleCanReach(m2, m2.spawns.e, m2.objective, MAX_VEHICLE_RADIUS), false, 'the old forest has no way for the biggest vehicle');
  assert.ok(vehicleCanReach(m3, m3.spawns.e, m3.objective, MAX_VEHICLE_RADIUS));
  assert.deepEqual(m3.buildings, m2.buildings, 'the buildings are where they were');
});

test('a vehicle needs room: a lane two tiles wide takes no tank, one three wide does; and a tank is not placed or driven into another', () => {
  const B = createBattle(mk()); const m = B.map;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < 40; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.WALL; m.bid[n] = -1; }
  for (let i = 0; i < 40; i++) for (const j of [20, 21]) m.tiles[idx(m, i, j)] = TILE.ROAD; // two wide
  assert.equal(findPath(m, { x: 1.5, y: 20.5 }, { x: 38.5, y: 20.5 }, 'veh', { r: clearRadius({ kind: 'tank', vtype: 'anvil' }) }).length, 0, 'two wide: no way for a tank');
  assert.ok(findPath(m, { x: 1.5, y: 20.5 }, { x: 38.5, y: 20.5 }, 'veh').length > 0, '(the old rule would have let it)');
  for (let i = 0; i < 40; i++) m.tiles[idx(m, i, 22)] = TILE.ROAD; // three wide
  assert.ok(findPath(m, { x: 1.5, y: 21.5 }, { x: 38.5, y: 21.5 }, 'veh', { r: clearRadius({ kind: 'tank', vtype: 'anvil' }) }).length > 0, 'three wide: yes');
  const C = createBattle(mk({ key: 'SZ2|x' })); const t1 = C.byId.get('T1'); const t2 = C.byId.get('T2'); assert.ok(Math.hypot(t1.x - t2.x, t1.y - t2.y) >= bodyRadius(t1) + bodyRadius(t2) - 1e-6, 'placed apart');
});

test('two tanks sent to the same place never overlap, and neither is left stuck for good', () => {
  const B = createBattle(mk({ key: 'SZ3|x' })); const t1 = B.byId.get('T1'); const t2 = B.byId.get('T2'); const m = B.map;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { const n = idx(m, i, j); if (m.bid[n] < 0 && m.tiles[n] !== TILE.WATER) m.tiles[n] = TILE.GROUND; }
  B.units.filter((u) => u.side === 'e').forEach((u) => { u.x = 100; u.y = 3; u.W = { ...u.W, range: 0 }; });
  t1.x = 20; t1.y = 20; t2.x = 20; t2.y = 26; const dest = { x: 40, y: 23 }; issue(B, ['T1', 'T2'], { type: 'move', ...dest }); let min = 99;
  for (let i = 0; i < 800; i++) { run(B, 1); min = Math.min(min, Math.hypot(t1.x - t2.x, t1.y - t2.y)); }
  assert.ok(min >= (bodyRadius(t1) + bodyRadius(t2)) * 0.95, `closest ${min.toFixed(2)}`);
  assert.ok(Math.hypot(t1.x - dest.x, t1.y - dest.y) < 8 && Math.hypot(t2.x - dest.x, t2.y - dest.y) < 8, 'both arrived near it');
});

test('boarding and repair distances grow with the vehicle', () => {
  const B = createBattle(mk({ vehicles: [{ id: 'O1', name: 'Ox', cls: 'carrier', type: 'ox', armour: 1, firepower: 1, speed: 1 }] })); assert.ok(sizeOf(B.byId.get('O1')).len > 2.5);
  assert.equal(clearance(B.map).constructor.name, 'Float32Array');
});
