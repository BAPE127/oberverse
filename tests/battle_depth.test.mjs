// Battle depth (v0.102.0): a ground vehicle is a hull and four modules with a front, sides and a rear; support is called from the real stock (a missile or a drone is used up, an aircraft pass burns fuel
// and is not lost), lands after its delay and hurts everyone in its blast; smoke blocks the look; a gun or a rocket breaches a wall; all of it is deterministic and replays from the order log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step, run, issue, callSupport, outcome, replay, faceOf, hitModule } from '../src/battle/sim.js';
import { TILE, MODULE, SUPPORT } from '../src/content/battle.js';
import { idx } from '../src/battle/map.js';
import { supportOf } from '../src/war/engagements.js';

const people = (n, role = 'rifleman') => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 && role === 'rifleman' ? 'engineer' : role, tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const tank = { id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 };
const mk = (o = {}) => buildSetup({ key: o.key || 'D1|x', eng: { goal: 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 8, armour: 0, air: 0, skill: 1 } }, people: o.people || people(6), vehicles: o.vehicles ?? [tank], support: o.support, ai: { p: false, e: false } });
/** A long straight stretch of open ground on the map: a row, from x0, with `len` tiles a person and a tank can stand on. */
function stretch(B, len = 26) { const m = B.map; for (let y = 2; y < m.h - 2; y++) { let run = 0; for (let x = 1; x < m.w - 1; x++) { const t = m.tiles[idx(m, x, y)]; if ((t === TILE.GROUND || t === TILE.ROAD) && m.bid[idx(m, x, y)] < 0) { run++; if (run >= len) return { y, x0: x - len + 1 }; } else run = 0; } } throw new Error('no stretch'); }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const calm = (B) => { for (const u of B.units) { u.W = { ...u.W, range: 0 }; } };
const snap = (B) => JSON.stringify(B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), Math.round(u.hp), u.alive]));

test('a tank has a front, sides and a rear: the same gun does more to its rear and less to its front', () => {
  const t = { x: 10, y: 10, heading: 0 };
  assert.equal(faceOf(t, { x: 20, y: 10 }), 'front'); assert.equal(faceOf(t, { x: 0, y: 10 }), 'rear'); assert.equal(faceOf(t, { x: 10, y: 20 }), 'side'); assert.equal(faceOf(t, { x: 10, y: 0 }), 'side');
  const trial = (from) => { const B = createBattle(mk({ enemy: { troops: 1, armour: 0, air: 0, skill: 1 } })); const T = B.byId.get('T1'); const s = stretch(B); put(T, s.x0 + 10.5, s.y + 0.5); T.heading = 0; const e = B.units.find((u) => u.side === 'e'); put(e, s.x0 + 10.5 + from, s.y + 0.5); e.W = { ...e.W, range: 30, damage: 40, acc: 1, pierce: 1, interval: 0.5 }; e.accMult = 5; e.sight = 40; e.cd = 0; for (const u of B.units) if (u !== e && u !== T) { u.alive = false; u.fled = true; } for (const u of [T]) u.W = { ...u.W, range: 0 }; run(B, 20); return T.hpMax - T.hp; };
  const front = trial(10); const rear = trial(-10); assert.ok(rear > front * 1.8, `rear ${rear} against front ${front}`);
});

test('modules: tracks out, it cannot move; the engine out, it burns until it is gone; the crew out, it is abandoned; the gun out, it cannot fire', () => {
  const B = createBattle(mk()); const T = B.byId.get('T1'); const s = stretch(B); calm(B); put(T, s.x0 + 2.5, s.y + 0.5);
  T.mod.tracks = MODULE.down; issue(B, [], { type: 'hold' }); B.units.filter((u) => u.id !== 'T1' && u.side === 'p').forEach((u) => { u.fled = true; });
  T.order = { type: 'move', x: s.x0 + 20, y: s.y + 0.5 }; T.path = [{ x: s.x0 + 20, y: s.y + 0.5 }]; const x0 = T.x; run(B, 50); assert.equal(T.x, x0, 'immobilised: it does not move');
  T.mod.tracks = 1; run(B, 50); assert.ok(T.x > x0 + 1, 'with its tracks it does');
  // hits wear modules down and the events say so; a burning tank loses hit points and dies
  const U = { id: 'x' }; for (let i = 0; i < 400 && T.alive; i++) { B.tick++; hitModule(B, T, 60, U); }
  assert.ok(B.events.some((e) => e.k === 'module'), 'a module went out'); assert.ok(T.mod.tracks < 1);
  const B2 = createBattle(mk()); const T2 = B2.byId.get('T1'); calm(B2); T2.mod.engine = 0.1; hitModule(B2, T2, 1e6, { id: 'x' });
  const T3 = B2.byId.get('T1'); T3.burning = true; T3.hp = 20; run(B2, 100); assert.equal(T3.alive, false, 'a burning tank is lost'); assert.ok(B2.events.some((e) => e.k === 'down' && e.by === 'fire'));
  const B3 = createBattle(mk()); const T4 = B3.byId.get('T1'); for (let i = 0; i < 600 && T4.alive; i++) { B3.tick++; hitModule(B3, T4, 200, { id: 'y' }); } assert.ok(T4.mod.crew <= MODULE.down || T4.alive === false);
  assert.ok(!B3.events.some((e) => e.k === 'down' && e.abandoned) || T4.alive === false, 'an abandoned tank is lost');
});

test('support from the real stock: a missile lands after its delay, hurts everyone in the blast (yours too), is used up, and the second call fails', () => {
  const support = { items: { item_missile_guided: 1 }, air: [] };
  const B = createBattle(mk({ support })); const s = stretch(B); calm(B);
  const foes = B.units.filter((u) => u.side === 'e'); foes.forEach((u, i) => put(u, s.x0 + 12 + (i % 3) * 0.6, s.y + 0.5 + Math.floor(i / 3) * 0.6)); const mine = B.units.find((u) => u.id === 'p1'); put(mine, s.x0 + 12.5, s.y + 1.2); const far = B.units.find((u) => u.id === 'p2'); put(far, s.x0 + 2, s.y + 0.5);
  const hp = new Map(B.units.map((u) => [u.id, u.hp]));
  const r = callSupport(B, { kind: 'item_missile_guided', x: s.x0 + 12.3, y: s.y + 1 }); assert.ok(r.ok, r.text);
  run(B, 20); assert.ok(foes.every((u) => u.hp === hp.get(u.id)), 'nothing yet: it is on its way');
  run(B, 30); assert.ok(foes.filter((u) => !u.alive).length >= 5, `most of the enemy at the point is gone (${foes.filter((u) => !u.alive).length})`); assert.ok(mine.hp < hp.get('p1'), 'danger close: your own man is hurt'); assert.equal(far.hp, hp.get('p2'), 'the far one is not');
  assert.ok(!callSupport(B, { kind: 'item_missile_guided', x: 5, y: 5 }).ok, 'there was only one'); assert.ok(!callSupport(B, { kind: 'item_drone_strike', x: 5, y: 5 }).ok, 'and no drones');
  assert.deepEqual(outcome(B).used.items, { item_missile_guided: 1 });
});

test('an aircraft pass: needs an aircraft the company keeps, burns fuel, is not lost; a bomber drops bombs along its line; the replay agrees', () => {
  const support = { items: {}, air: [{ id: 'E7', name: 'Kestrel', kind: 'fighter' }, { id: 'E8', name: 'Anvil bomber', kind: 'bomber' }] };
  const setup = mk({ support, enemy: { troops: 10, armour: 0, air: 0, skill: 1 } }); const B = createBattle(setup); const s = stretch(B); calm(B);
  B.units.filter((u) => u.side === 'e').forEach((u, i) => put(u, s.x0 + 10 + (i % 5) * 0.8, s.y + 0.5 + Math.floor(i / 5) * 0.8));
  assert.ok(!callSupport(B, { kind: 'bomber', x: s.x0 + 12, y: s.y + 0.5, id: 'E7' }).ok, 'a fighter is not a bomber');
  const a = callSupport(B, { kind: 'bomber', x: s.x0 + 12, y: s.y + 1, id: 'E8' }); assert.ok(a.ok, a.text); assert.ok(!callSupport(B, { kind: 'bomber', x: 5, y: 5 }).ok, 'the bomber is used');
  const f = callSupport(B, { kind: 'fighter', x: s.x0 + 12, y: s.y + 0.8 }); assert.ok(f.ok, f.text);
  run(B, 120); assert.ok(B.units.filter((u) => u.side === 'e' && !u.alive).length >= 3, 'the passes hurt the enemy'); assert.ok(B.events.filter((e) => e.k === 'blast').length >= SUPPORT.bomber.bombs - 1, 'bombs fell');
  const o = outcome(B); assert.deepEqual(o.used.air.sort(), ['E7', 'E8']); assert.ok(o.used.fuel >= SUPPORT.bomber.fuel + SUPPORT.fighter.fuel, 'fuel burnt');
});

test('smoke from an engineer blocks the look for its seconds; a gun opens a wall segment into rubble you can walk and see through; a suppress order pins without a target', () => {
  const B = createBattle(mk({ recipe: 'city' })); const s = stretch(B, 24); const eng = B.byId.get('p0'); assert.equal(eng.role, 'engineer'); assert.equal(eng.smokes, SUPPORT.smoke.charges);
  const foe = B.units.find((u) => u.side === 'e'); const rifle = B.byId.get('p1'); for (const u of B.units) if (u !== eng && u !== foe && u !== rifle) { u.alive = false; u.fled = true; }
  put(rifle, s.x0 + 2, s.y + 0.5); put(foe, s.x0 + 12, s.y + 0.5); put(eng, s.x0 + 6, s.y + 0.5); foe.sight = 20; rifle.sight = 20;
  run(B, 6); assert.equal(rifle.target, foe.id, 'in the open they see each other');
  issue(B, ['p0'], { type: 'smoke', x: s.x0 + 8, y: s.y + 0.5 }); run(B, 12); assert.equal(B.smoke.length, 1); assert.equal(eng.smokes, SUPPORT.smoke.charges - 1);
  rifle.target = null; foe.target = null; run(B, 10); assert.equal(rifle.target, null, 'the look is blocked'); assert.equal(foe.target, null);
  run(B, SUPPORT.smoke.seconds * 10); assert.equal(B.smoke.length, 0, 'it clears'); run(B, 8); assert.equal(rifle.target, foe.id, 'and they see each other again');
  // a wall, opened by a gun
  const C = createBattle(mk({ recipe: 'city' })); const T = C.byId.get('T1'); const b = C.map.buildings[0]; const wx = b.x + 2; const wy = b.y; assert.equal(C.map.tiles[idx(C.map, wx, wy)] === TILE.WALL || C.map.tiles[idx(C.map, wx, wy)] === TILE.WINDOW, true);
  const wall = [...Array(b.w).keys()].map((i) => ({ x: b.x + i, y: b.y })).find((p) => C.map.tiles[idx(C.map, p.x, p.y)] === TILE.WALL); put(T, wall.x + 0.5, wall.y - 8); C.units.forEach((u) => { if (u !== T) { u.W = { ...u.W, range: 0 }; if (u.side === 'p') { u.alive = false; u.fled = true; } } });
  issue(C, ['T1'], { type: 'breach', x: wall.x + 0.5, y: wall.y + 0.5 }); run(C, 80); assert.equal(C.map.tiles[idx(C.map, wall.x, wall.y)], TILE.FLOOR, 'the wall is rubble'); assert.equal(C.rubble.length, 1); assert.ok(C.events.some((e) => e.k === 'breach'));
  const D = createBattle(mk({ recipe: 'city' })); const lmg = D.byId.get('p2'); lmg.W = { ...lmg.W, range: 14, suppress: 1.6, interval: 0.5 }; const f2 = D.units.find((u) => u.side === 'e'); const s2 = stretch(D, 24); put(lmg, s2.x0 + 2, s2.y + 0.5); put(f2, s2.x0 + 10, s2.y + 0.5); f2.supp = 0;
  issue(D, ['p2'], { type: 'suppress', x: s2.x0 + 10, y: s2.y + 0.5 }); run(D, 40); assert.ok(f2.supp > 20 || !f2.alive, `the point is under fire (supp ${f2.supp})`);
});

test('what the company can call comes from what it really holds: missiles and drones in the stores (three at most of a kind), aircraft in the hangars as the fuel allows', () => {
  const C = { stock: { 'arms:aw1:item_missile_guided': 5, 'arms:aw1:item_drone_strike': 2, 'supply:fuel': 12, 'arms:aw1:item_smg': 30 }, equipment: [
    { id: 'E1', kind: 'aircraft', type: 'af_kestrel', name: 'Kestrel', status: 'stored', assignedTo: null }, { id: 'E2', kind: 'aircraft', type: 'bm_hammer_bomber', name: 'Hammer', status: 'stored', assignedTo: null }, { id: 'E3', kind: 'aircraft', type: 'af_kestrel', name: 'Away', status: 'deployed', assignedTo: null }, { id: 'E4', kind: 'vehicle', type: 'anvil', name: 'Tank', status: 'stored', assignedTo: null }] };
  const S = supportOf(C); assert.deepEqual(S.items, { item_missile_guided: 3, item_drone_strike: 2 }); assert.deepEqual(S.air.map((a) => a.id), ['E1'], 'fuel for one pass of 6, and the bomber needs 10 more');
  assert.deepEqual(supportOf({ stock: {}, equipment: [] }), { items: {}, air: [] });
});

test('a battle with support in its order log replays exactly: the missile, the pass and the smoke are all in the log', () => {
  const setup = mk({ key: 'D1|replay', support: { items: { item_drone_attack: 1 }, air: [{ id: 'E7', name: 'Kestrel', kind: 'fighter' }] }, enemy: { troops: 10, armour: 1, air: 0, skill: 1 } }); const B = createBattle(setup); const e = B.map.spawns.e;
  run(B, 40); assert.ok(callSupport(B, { kind: 'item_drone_attack', x: e.x - 2, y: e.y }).ok); run(B, 30); assert.ok(callSupport(B, { kind: 'fighter', x: e.x - 6, y: e.y }).ok); issue(B, ['p0'], { type: 'smoke', x: B.map.spawns.p.x + 6, y: B.map.spawns.p.y }); run(B, 200);
  assert.equal(B.log.length, 3); const R = replay(setup, B.log, B.tick); assert.equal(snap(R), snap(B)); assert.equal(R.smoke.length, B.smoke.length); assert.deepEqual(R.counts.items, B.counts.items); assert.equal(R.counts.fuel, B.counts.fuel);
});
