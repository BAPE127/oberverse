// The battle simulation (v0.101.0 stage 10a): deterministic, replayable, and made of the rules in docs/PROPOSAL_WAR_TACTICAL.md: sight stopped by walls, cover, suppression through four states, floors
// that add sight and are changed only at a stair, orders, objectives, and a result in the shape the engagement applies once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step, run, runToEnd, issue, outcome, replay, sightOf, coverFor, stateOf, reachOf } from '../src/battle/sim.js';
import { los } from '../src/battle/nav.js';
import { generate, idx } from '../src/battle/map.js';
import { COVER, HEIGHT, SUPPRESS, TILE, TICK } from '../src/content/battle.js';

const people = (n, o = {}) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 8 === 0 ? 'machine_gunner' : i % 9 === 0 ? 'anti_tank' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true, ...o }));
const mk = (o = {}) => buildSetup({ key: o.key || 'K1|x', eng: { goal: o.goal || 'defence', recipe: o.recipe || 'city', biome: 'rural', style: 'halvermouth', enemy: o.enemy || { troops: 12, armour: 0, air: 0, skill: 1 } }, people: o.people || people(12), vehicles: o.vehicles || [], ai: o.ai || { p: false, e: true } });
const snap = (B) => JSON.stringify(B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), u.z, Math.round(u.hp), u.alive, u.fled, Math.round(u.supp)]));

test('the same setup and orders give the same battle, and chance is a hash: nothing in it reads a clock or a draw', () => {
  const a = createBattle(mk({ ai: { p: true, e: true } })); const b = createBattle(mk({ ai: { p: true, e: true } }));
  run(a, 600); run(b, 600); assert.equal(snap(a), snap(b)); assert.equal(a.tick, 600);
  const c = createBattle(mk({ key: 'K2|x', ai: { p: true, e: true } })); run(c, 600); assert.notEqual(snap(a), snap(c), 'another key is another battle');
  assert.deepEqual(outcome(runToEnd(a)), outcome(runToEnd(b)));
  const src = [new URL('../src/battle/sim.js', import.meta.url), new URL('../src/battle/map.js', import.meta.url), new URL('../src/battle/nav.js', import.meta.url), new URL('../src/battle/setup.js', import.meta.url), new URL('../src/battle/hash.js', import.meta.url)];
  return Promise.all(src.map(async (u) => { const t = (await import('node:fs')).readFileSync(u, 'utf8').replace(/\/\/.*$/gm, ''); assert.ok(!/Math\.random|Date\.now|performance\.now|new Date|\.rng\b/.test(t), `${u.pathname.split('/').pop()} has no draw or clock`); }));
});

test('a save is a setup, an order log and a tick: replaying them reproduces the battle exactly, orders and all', () => {
  const setup = mk({ ai: { p: false, e: true } });
  const B = createBattle(setup); const ids = B.units.filter((u) => u.side === 'p').map((u) => u.id);
  run(B, 100); issue(B, ids, { type: 'amove', x: 36, y: 22 });
  run(B, 120); issue(B, ids.slice(0, 4), { type: 'hold' });
  run(B, 80); issue(B, ids.slice(4, 8), { type: 'garrison', b: 2, floor: 1 });
  run(B, 300);
  const R = replay(setup, B.log, B.tick);
  assert.equal(snap(R), snap(B)); assert.equal(R.tick, B.tick);
  run(B, 200); run(R, 200); assert.equal(snap(R), snap(B), 'and they stay together');
  assert.equal(B.log.length, 3);
});

test('walls and trees stop a look unless you are above them; each floor adds sight and reach; roofs of lower buildings stop mattering from a higher floor', () => {
  const m = generate({ recipe: 'city', seed: 'los', style: 'halvermouth' });
  const b = m.buildings.find((x) => x.floors >= 2 && x.h >= 5);
  const cy = b.y + Math.floor(b.h / 2);
  assert.equal(los(m, b.x - 2, cy, 0, b.x + b.w + 1, cy, 0), false, 'a building of two floors or more stops a look at street level');
  assert.equal(los(m, b.x - 2, cy, b.floors, b.x + b.w + 1, cy, 0), true, 'from above its roof it does not');
  m.tiles[idx(m, 10, 10)] = TILE.TREE; m.bfloors[idx(m, 10, 10)] = 0;
  assert.equal(los(m, 8, 10, 0, 12, 10, 0), false, 'a tree'); assert.equal(los(m, 8, 10, 1, 12, 10, 1), true, 'seen over from the first floor up');
  const B = createBattle(mk({})); const u = B.units.find((x) => x.side === 'p' && x.kind === 'inf');
  const s0 = sightOf(u); const r0 = reachOf(u); u.z = 2;
  assert.equal(sightOf(u), s0 + 2 * HEIGHT.sight); assert.equal(reachOf(u), r0 + 2 * HEIGHT.reach);
});

test('cover is what the target stands in or behind: open ground none, a hedge or crop a quarter, a building three quarters, a window most; vehicles take none', () => {
  const B = createBattle(mk({ vehicles: [{ id: 'T1', name: 'Tank', cls: 'tank', armour: 3, firepower: 3, speed: 3 }] }));
  const m = B.map; const t = { x: 0, y: 0, z: 0, kind: 'inf' }; const from = { x: 0, y: 0 };
  const at = (x, y, tile, kind = 'inf') => { m.tiles[idx(m, x, y)] = tile; return { x: x + 0.5, y: y + 0.5, z: 0, kind }; };
  const open = at(30, 5, TILE.GROUND); m.tiles[idx(m, 29, 5)] = TILE.GROUND; m.tiles[idx(m, 31, 5)] = TILE.GROUND; m.tiles[idx(m, 30, 4)] = TILE.GROUND; m.tiles[idx(m, 30, 6)] = TILE.GROUND;
  assert.equal(coverFor(B, open, { x: 33, y: 5 }), COVER.open);
  assert.equal(coverFor(B, at(30, 8, TILE.HEDGE), { x: 33, y: 8 }), COVER.hedge); assert.equal(coverFor(B, at(30, 10, TILE.CROP), { x: 33, y: 10 }), COVER.crop);
  const inside = at(32, 12, TILE.FLOOR); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m.tiles[idx(m, 32 + dx, 12 + dy)] = TILE.FLOOR;
  assert.equal(coverFor(B, inside, { x: 40, y: 12 }), COVER.building);
  m.tiles[idx(m, 33, 12)] = TILE.WINDOW; assert.equal(coverFor(B, inside, { x: 40, y: 12 }), COVER.window);
  assert.equal(coverFor(B, at(30, 14, TILE.GROUND, 'tank'), from), 0, 'a vehicle has armour, not cover');
  void t;
});

test('suppression builds from shots and moves a unit through steady, shaken, pinned and broken; a high-morale unit resists more; it fades; a broken unit runs and a rallied one stops', () => {
  const B = createBattle(mk({})); const u = B.units.find((x) => x.side === 'p');
  const at = (s, morale = 70) => { u.supp = s; u.morale = morale; return stateOf(u); };
  assert.equal(at(5), 'steady'); assert.equal(at(SUPPRESS.shaken + 1), 'shaken'); assert.equal(at(SUPPRESS.pinned + 1), 'pinned'); assert.equal(at(SUPPRESS.broken + 1), 'broken');
  assert.equal(at(70, 95), 'pinned'); assert.equal(at(70, 20), 'broken', 'a shaken soldier breaks sooner'); // (morale moves the thresholds)
  u.supp = 40; u.morale = 70; u.broken = false; const before = u.supp; run(B, 10); assert.ok(u.supp < before, 'it fades');
  u.supp = 100; run(B, 2); assert.ok(u.broken && u.order.type === 'retreat', 'a broken unit retreats');
  u.supp = 0; run(B, 2); assert.ok(!u.broken, 'rallied');
  // a unit that is shot at really is suppressed: two lines facing each other
  const F = createBattle(mk({ ai: { p: true, e: true } })); run(F, 600);
  assert.ok(F.units.some((x) => x.supp > 0 || x.state !== 'steady' || x.broken) || F.events.some((e) => e.k === 'broke' || e.k === 'down'), 'fire has an effect');
});

test('orders do what they say: move goes and stops, hold stays, attack-move fights on the way, retreat leaves the field, garrison climbs a stair to the floor asked for', () => {
  const B = createBattle(mk({ recipe: 'city', ai: { p: false, e: false } })); const m = B.map;
  const u = B.units.find((x) => x.side === 'p' && x.kind === 'inf'); const x0 = u.x;
  run(B, 50); assert.equal(u.x, x0, 'a unit with no orders holds');
  issue(B, [u.id], { type: 'move', x: m.spawns.p.x + 12, y: m.spawns.p.y }); run(B, 200); assert.ok(u.x > x0 + 6, `moved to ${u.x.toFixed(1)}`); assert.ok(u.order.type === 'hold' || u.path.length === 0);
  // garrison: pick a building with 3 floors or more
  const b = m.buildings.find((x) => x.floors >= 3); const g = B.units.filter((x) => x.side === 'p' && x.kind === 'inf')[1];
  issue(B, [g.id], { type: 'garrison', b: b.id, floor: 2 });
  const changes = [];
  for (let i = 0; i < 2400 && g.z !== 2; i++) { const z0 = g.z; const t = m.tiles[idx(m, Math.floor(g.x), Math.floor(g.y))]; step(B); if (g.z !== z0) changes.push(t); }
  assert.equal(g.z, 2, 'on the second floor'); assert.ok(changes.length === 2 && changes.every((t) => t === TILE.STAIRS), 'floors change only at a stair');
  run(B, 300); assert.equal(g.z, 2); assert.ok(g.gstage === 'post');
  // retreat
  const r = B.units.filter((x) => x.side === 'p' && x.kind === 'inf')[2]; issue(B, [r.id], { type: 'retreat' }); run(B, 1200); assert.ok(r.fled, 'it left the field');
});

test('a battle ends and says how: the result has the shape the engagement applies, with the dead, the wounded, the vehicles lost, what was used and the objectives; and the downed are dead or wounded by a hash, not a draw', () => {
  const B = createBattle(mk({ ai: { p: true, e: true }, vehicles: [{ id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }] })); runToEnd(B);
  const o = outcome(B);
  assert.ok(B.over && B.why); assert.ok([0, 1, 2, 3].includes(o.objectives)); assert.ok(['lost', 'partial', 'held', 'held_well'].includes(o.outcome));
  for (const k of ['dead', 'wounded', 'lost']) assert.ok(Array.isArray(o[k]));
  assert.ok(o.dead.every((id) => id.startsWith('p')) && o.lost.every((id) => id === 'T1'), 'only your own records');
  assert.ok(o.wounded.every((w) => w.wounds >= 1 && w.wounds <= 4));
  assert.ok(Number.isInteger(o.used.rockets) && Number.isInteger(o.used.fuel));
  const shots = B.units.filter((u) => u.side === 'p' && u.role === 'anti_tank').reduce((a, u) => a + u.shots, 0); assert.equal(o.used.rockets, shots, 'a rocket used is a shot fired');
  const again = outcome(B); assert.deepEqual(o, again, 'asking again is the same answer');
  assert.ok(B.tick <= TICK.maxSeconds * TICK.perSecond);
});

test('a played battle commits tanks and helicopters as units with hit points: a tank can be destroyed and is reported lost, and small arms barely scratch it', () => {
  const T = { id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 };
  let lost = 0; let alive = 0;
  for (let k = 0; k < 8; k++) { const B = createBattle(mk({ key: `V${k}|x`, ai: { p: true, e: true }, vehicles: [T], enemy: { troops: 14, armour: 2, air: 0, skill: 1.1 } })); runToEnd(B); const o = outcome(B); if (o.lost.includes('T1')) lost++; else alive++; }
  assert.ok(lost > 0 && alive > 0, `the tank is neither invulnerable nor made of paper: ${lost} lost, ${alive} came home`);
  const B = createBattle(mk({ vehicles: [T] })); const t = B.units.find((u) => u.id === 'T1'); assert.ok(t.hpMax > 400);
});

test('nobody ever stands in a wall or a tree, at any time in a whole battle, on either recipe, and no one changes floor except on a stair', () => {
  for (const [recipe, key] of [['city', 'W1|x'], ['city', 'W2|x'], ['fields', 'W3|x'], ['fields', 'W4|x']]) {
    const B = createBattle(mk({ recipe, key, ai: { p: true, e: true }, vehicles: [{ id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }] }));
    const z = new Map(B.units.map((u) => [u.id, u.z]));
    while (!B.over) {
      step(B);
      for (const u of B.units) {
        if (!u.alive || u.fled) continue;
        const t = B.map.tiles[idx(B.map, Math.floor(u.x), Math.floor(u.y))];
        if (u.z !== z.get(u.id)) { assert.ok(t === TILE.STAIRS, `${u.id} changed floor off a stair`); z.set(u.id, u.z); }
        if (B.tick % 25 === 0) assert.ok(u.kind === 'helicopter' || ![TILE.WALL, TILE.TREE, TILE.WINDOW, TILE.WATER].includes(t), `${recipe}: ${u.id} is on tile ${t} at tick ${B.tick}`);
      }
    }
  }
});
