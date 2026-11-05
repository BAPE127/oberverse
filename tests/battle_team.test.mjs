// The team in the field (v0.102.1): medics stabilise the downed so they are wounded rather than dead (and a medevac helicopter takes them off), engineers plant breaching charges (an Arms works item),
// the UAV team's scout drone spots and its FPV drone dives. Used only under rules 3, held for the battle, spent once on the end day, in the order log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, outcome, replay } from '../src/battle/sim.js';
import { TILE, TEND, CHARGE, UAV } from '../src/content/battle.js';
import { idx } from '../src/battle/map.js';

const roles = (list) => list.map((role, i) => ({ id: `p${i}`, name: `P${i}`, role, tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const mk = (o = {}) => buildSetup({ key: o.key || 'T1|x', eng: { goal: 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 6, armour: 0, air: 0, aa: o.aa || 0, skill: 1 } }, people: roles(o.roles || ['rifleman', 'rifleman', 'rifleman', 'medic']), vehicles: o.vehicles || [], support: o.support, ai: { p: false, e: false } });
function stretch(B, len = 40) { const m = B.map; for (let y = 2; y < m.h - 2; y++) { let r = 0; for (let x = 1; x < m.w - 1; x++) { const t = m.tiles[idx(m, x, y)]; if ((t === TILE.GROUND || t === TILE.ROAD) && m.bid[idx(m, x, y)] < 0) { r++; if (r >= len) return { y, x0: x - len + 1 }; } else r = 0; } } throw new Error('no stretch'); }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const calm = (B) => { for (const u of B.units) if (!u.W.airOnly) u.W = { ...u.W, range: 0 }; };
const far = (B) => { B.units.filter((u) => u.side === 'e').forEach((u, i) => put(u, 100 + (i % 6), 3 + Math.floor(i / 6))); };
const down = (u) => { u.alive = false; u.hp = 0; };

test('a medic stabilises a downed soldier on his own (six seconds beside him) and he is counted wounded, not dead; without a medic some of the same soldiers die', () => {
  let deadWith = 0; let deadWithout = 0; let stabs = 0;
  for (let k = 0; k < 12; k++) for (const medic of [true, false]) {
    const B = createBattle(mk({ key: `T2|${k}`, roles: ['rifleman', 'rifleman', 'rifleman', 'rifleman', medic ? 'medic' : 'rifleman'] })); const s = stretch(B); calm(B); far(B);
    const downed = ['p0', 'p1', 'p2', 'p3'].map((id) => B.byId.get(id)); downed.forEach((u, i) => { put(u, s.x0 + 10 + i * 0.5, s.y + 0.5); down(u); }); put(B.byId.get('p4'), s.x0 + 14, s.y + 1.5);
    run(B, 420); const o = outcome(B); const d = o.dead.length; if (medic) { deadWith += d; stabs += B.events.filter((e) => e.k === 'stabilised').length; assert.equal(o.wounded.length >= 4, true, 'all four are wounded'); } else deadWithout += d;
  }
  assert.equal(deadWith, 0); assert.ok(stabs >= 40, `a medic tends them all (${stabs})`); assert.ok(deadWithout >= 3, `and without one some die (${deadWithout})`);
  const old = mk({ roles: ['rifleman', 'medic'] }); delete old.rules; old.map.ver = 2; const O = createBattle(old); const s = stretch(O); calm(O); far(O); put(O.byId.get('p0'), s.x0 + 10, s.y + 0.5); down(O.byId.get('p0')); put(O.byId.get('p1'), s.x0 + 12, s.y + 0.5); run(O, 200); assert.ok(!O.byId.get('p0').stab, 'under the older rules a medic does not go looking');
});

test('a tend order sends a medic to a soldier far off; a medevac helicopter over the downed takes him off the field; both are in the log and replay', () => {
  const setup = mk({ key: 'T3|x', roles: ['rifleman', 'medic', 'rifleman'], vehicles: [{ id: 'H1', name: 'Mercy', cls: 'helicopter', type: 'mercy', armour: 1, firepower: 1, speed: 5 }] }); const B = createBattle(setup); const s = stretch(B); calm(B); far(B);
  const a = B.byId.get('p0'); put(a, s.x0 + 25, s.y + 0.5); down(a); const m = B.byId.get('p1'); put(m, s.x0 + 2, s.y + 0.5); const b = B.byId.get('p2'); put(b, s.x0 + 30, s.y + 0.5); down(b); put(B.byId.get('H1'), s.x0 + 30.5, s.y + 0.5);
  run(B, 12); assert.ok(b.evac && b.stab && b.fled, 'the medevac helicopter lifts him'); assert.equal(B.events.filter((e) => e.k === 'evac').length, 1);
  issue(B, ['p1'], { type: 'tend' }); run(B, 700); assert.ok(a.stab, 'the medic walked the length of the stretch and did it'); const R = replay(setup, B.log, B.tick); assert.ok(R.tick === B.tick);
});

test('an engineer plants a breaching charge (a few seconds, exposed), it goes off after its fuse and opens the wall; it is counted once and used up', () => {
  const B = createBattle(mk({ recipe: 'city', roles: ['engineer', 'rifleman'], support: { items: { item_breach_charge: 2 }, air: [] } })); calm(B); far(B); const b = B.map.buildings[0]; const wall = [...Array(b.w).keys()].map((i) => ({ x: b.x + i, y: b.y })).find((p) => B.map.tiles[idx(B.map, p.x, p.y)] === TILE.WALL);
  const E = B.byId.get('p0'); put(E, wall.x + 0.5, wall.y - 6); issue(B, ['p0'], { type: 'charge', x: wall.x + 0.5, y: wall.y + 0.5 }); run(B, 60); assert.equal(B.map.tiles[idx(B.map, wall.x, wall.y)], TILE.WALL, 'not yet'); run(B, (CHARGE.plant + CHARGE.fuse + 3) * 10);
  assert.equal(B.map.tiles[idx(B.map, wall.x, wall.y)], TILE.FLOOR, 'the wall is a doorway'); assert.ok(B.events.some((e) => e.k === 'plant')); assert.deepEqual(outcome(B).used.items, { item_breach_charge: 1 }); assert.equal(B.sup.items.item_breach_charge, 1);
  const none = createBattle(mk({ recipe: 'city', roles: ['engineer'], support: { items: {}, air: [] } })); issue(none, ['p0'], { type: 'charge', x: 20, y: 20 }); assert.equal(none.byId.get('p0').order.type, 'hold', 'no charge, no order');
  const rifle = createBattle(mk({ recipe: 'city', roles: ['rifleman'], support: { items: { item_breach_charge: 2 }, air: [] } })); issue(rifle, ['p0'], { type: 'charge', x: 20, y: 20 }); assert.equal(rifle.byId.get('p0').order.type, 'hold', 'only an engineer plants');
});

test('the UAV team: a scout drone flies to a point and spots what comes within its reach for as long as its battery lasts (then the operator waits to send it again); spotted stays spotted for a while; an FPV drone is one of the stores\' drones and dives on the nearest enemy', () => {
  const B = createBattle(mk({ key: 'T5|x', roles: ['uav', 'rifleman'], support: { items: { item_drone_attack: 2 }, air: [] }, enemy: { troops: 4, armour: 0, air: 0, skill: 1 } })); const s = stretch(B, 60); calm(B); const U = B.byId.get('p0'); put(U, s.x0 + 2, s.y + 0.5);
  const foes = B.units.filter((u) => u.side === 'e'); foes.forEach((u, i) => put(u, s.x0 + 40 + (i % 2), s.y + 0.5 + Math.floor(i / 2) * 0.8)); put(B.byId.get('p1'), s.x0 + 2, s.y + 3);
  issue(B, ['p0'], { type: 'scout', x: s.x0 + 38, y: s.y + 0.5 }); run(B, 20); assert.equal(B.drones.length, 1); assert.equal(Object.keys(B.spotted).length, 0, 'still on its way'); run(B, 60); assert.ok(foes.every((u) => B.spotted[u.id] > 0), 'it sees them'); issue(B, ['p0'], { type: 'scout', x: s.x0 + 38, y: s.y + 0.5 }); run(B, 5); assert.equal(B.drones.length, 1, 'one drone at a time');
  run(B, UAV.battery * 10); assert.equal(B.drones.length, 0, 'the battery is flat'); assert.ok(U.recharge > 0, 'and the operator waits');
  const e = foes[0]; put(e, s.x0 + 30, s.y + 0.5); const hp = e.hp; issue(B, ['p0'], { type: 'fpv', x: s.x0 + 30, y: s.y + 0.5 }); run(B, 2); assert.equal(B.sup.items.item_drone_attack, 1, 'a drone from the stores'); run(B, 140); assert.ok(e.hp < hp || !e.alive, 'it dived onto the enemy'); assert.deepEqual(outcome(B).used.items, { item_drone_attack: 1 });
  const R = replay(createBattle(mk({ key: 'T5|x' })).setup, B.log, 0); assert.equal(R.tick, 0);
  const aa = createBattle(mk({ key: 'T6|x', roles: ['uav'], support: { items: { item_drone_attack: 2 }, air: [] }, aa: 3 })); const s2 = stretch(aa, 60); calm(aa); put(aa.byId.get('p0'), s2.x0 + 2, s2.y + 0.5); aa.units.filter((u) => u.W.airOnly).forEach((g, i) => put(g, s2.x0 + 20 + i, s2.y + 0.5)); aa.units.filter((u) => u.side === 'e' && !u.W.airOnly).forEach((u) => put(u, s2.x0 + 50, s2.y + 5));
  issue(aa, ['p0'], { type: 'scout', x: s2.x0 + 21, y: s2.y + 0.5 }); run(aa, 400); assert.ok(aa.events.some((v) => v.k === 'dronedown'), 'anti-air brings a scout drone down');
});

test('the new Arms works items (shells, breaching charges) go to the company, are offered to a battle, held while it lasts and spent once, by name, on the end day', async () => {
  const { armedCompany, days, cageGoods } = await import('./war_helpers.mjs'); const { createBattle: cb, issue: iss, run: rn, outcome: oc } = await import('../src/battle/sim.js'); const { supportOf } = await import('../src/war/engagements.js');
  const { g, C, eng, squads } = armedCompany(1301); cageGoods(g, 'aw1', { item_artillery_shell: 30, item_breach_charge: 9 });
  assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_artillery_shell', qty: 30 }).ok); assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_breach_charge', qty: 9 }).ok);
  assert.deepEqual(supportOf(C, 'Nx').items, { item_artillery_shell: 24, item_breach_charge: CHARGE.cap }); assert.ok(g.war.playEngagement(eng.id, squads).ok); assert.deepEqual(eng.battle.setup.support.items, { item_artillery_shell: 24, item_breach_charge: CHARGE.cap });
  const key = Object.keys(C.stock).find((k) => k.endsWith(':item_breach_charge')); const back = g.war.giveBack({ key, qty: 5 }); assert.ok(!back.ok && /set aside/.test(back.text)); assert.ok(g.war.giveBack({ key, qty: 3 }).ok, 'the part nobody was offered can go back');
  const B = cb({ ...eng.battle.setup, ai: { p: true, e: true } }); B.counts.items.item_artillery_shell = 5; B.counts.items.item_breach_charge = 2; B.over = true; B.why = 'time'; const o = oc(B);
  const held = (item) => Object.entries(C.stock).filter(([k]) => k.endsWith(`:${item}`)).reduce((a, [, n]) => a + n, 0); assert.ok(g.war.fileBattle(eng.id, o).ok); days(g, 8); assert.equal(eng.state, 'resolved');
  assert.equal(held('item_artillery_shell'), 25); assert.equal(held('item_breach_charge'), 4); assert.equal(eng.result.used['Artillery Shell'], 5); assert.equal(eng.result.used['Breaching Charge'], 2); assert.deepEqual(g.war.check(), []);
  void iss; void rn;
});
