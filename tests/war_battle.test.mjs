// Leading an engagement yourself (v0.101.0): the battle is taken to the field with the real forces, played (here headless), filed, and applied once on the engagement's last day, exactly as a
// general's result is; delegating and playing close each other; a save in the middle of a battle replays it; the places an engagement can be at give both recipes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany, days, build, STAGE2, buildAll, warGame } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { createBattle, issue, run, runToEnd, outcome, replay, step } from '../src/battle/sim.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const snap = (B) => JSON.stringify(B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), u.z, Math.round(u.hp), u.alive, u.fled]));

test('Lead it yourself takes the real forces to the field: the state moves to tactical, the squads, people, tank and (no) general are held, a battle is set up from exactly those units and the engagement\'s enemy, and a general can no longer have it', () => {
  const { g, C, eng, squads, general } = armedCompany(1001);
  assert.ok(!g.war.playEngagement(eng.id, []).ok); assert.ok(!g.war.playEngagement(eng.id, [squads[0]]).ok, 'one squad is not enough for this one');
  const r = g.war.playEngagement(eng.id, squads); assert.ok(r.ok, r.text);
  assert.equal(eng.state, 'tactical'); assert.ok(C.squads.every((s) => s.status === 'away')); assert.equal(C.equipment.find((x) => x.id === 'Ex1').status, 'deployed');
  assert.ok(C.personnel.filter((p) => p.role !== 'guard').every((p) => p.post === `engagement:${eng.id}`)); assert.equal(C.generals[0].status, 'home', 'no general is involved');
  const setup = eng.battle.setup; const mine = setup.units.filter((u) => u.side === 'p'); const foes = setup.units.filter((u) => u.side === 'e');
  assert.equal(mine.length, 16 + 1 - 0, '16 soldiers and a tank'); assert.ok(mine.every((u) => u.rec)); assert.equal(foes.filter((u) => u.kind === 'inf').length, eng.enemy.troops); assert.equal(foes.filter((u) => u.kind === 'tank').length, eng.enemy.armour);
  assert.deepEqual(mine.map((u) => u.rec.id).sort(), [...C.personnel.filter((p) => p.role !== 'guard').map((p) => p.id), 'Ex1'].sort(), 'exactly your units, none made up');
  assert.ok(!g.war.delegate(eng.id, { squads, general }).ok && /already been given out/.test(g.war.delegate(eng.id, { squads, general }).text), 'delegating is closed');
  assert.ok(g.war.playEngagement(eng.id, squads).resume, 'asking again just resumes');
  assert.ok(!g.war.dismiss(C.personnel[0].id).ok); assert.deepEqual(g.war.check(), []); assert.ok(g.war.baseProtected(), 'and the base gate is untouched');
});

test('a played battle is applied once, on the engagement\'s last day, like a general\'s: nothing changes in the records until then, the money arrives only then, and the report says it was played', () => {
  const { g, C, eng, squads } = armedCompany(1002, { rocket: 6 });
  assert.ok(g.war.playEngagement(eng.id, squads).ok);
  const setup = eng.battle.setup; const B = createBattle({ ...setup, ai: { p: true, e: true } }); runToEnd(B); const o = outcome(B);
  assert.ok(g.war.fileBattle(eng.id, o).ok); assert.ok(!g.war.fileBattle(eng.id, o).ok, 'a result is filed once');
  const before = JSON.stringify([C.personnel, C.equipment, C.stock]); const cash = g.war.cash(); const wallet = g.player.money;
  days(g, 3); assert.equal(eng.state, 'tactical'); assert.equal(g.war.cash() <= cash, true, 'only wages'); assert.ok(C.personnel.every((p) => p.status !== 'dead'), 'nobody has died yet');
  days(g, 3); assert.equal(eng.state, 'resolved'); const R = eng.result; assert.equal(R.how, 'played'); assert.equal(R.objectives, o.objectives); assert.equal(R.dead.length, o.dead.length); assert.equal(R.wounded.length, o.wounded.length); assert.equal(R.lost.length, o.lost.length);
  assert.equal(g.player.money, wallet, 'never your wallet'); assert.equal(R.paid, Math.round(eng.pay * [0, 0.45, 0.9, 1][o.objectives]));
  for (const d of R.dead) { const p = C.personnel.find((x) => x.id === d.id); assert.equal(p.status, 'dead'); assert.ok(!C.squads.some((s) => s.members.includes(d.id))); }
  for (const v of R.lost) assert.equal(C.equipment.find((x) => x.id === v.id).status, 'destroyed');
  assert.ok(C.squads.every((s) => s.status === 'home')); assert.deepEqual(g.war.check(), []); assert.ok(g.corp.reconciles());
  const snapR = JSON.stringify(eng.result); days(g, 4); assert.equal(JSON.stringify(eng.result), snapR, 'applied once'); void before;
});

test('a battle in progress is saved as its setup, its orders and its tick, and a reload replays it to where it was and carries on to the same end', () => {
  const { g, eng, squads } = armedCompany(1003);
  assert.ok(g.war.playEngagement(eng.id, squads).ok);
  const setup = eng.battle.setup; const B = createBattle(setup); const ids = B.units.filter((u) => u.side === 'p').map((u) => u.id);
  run(B, 120); issue(B, ids, { type: 'amove', x: B.map.objective.x, y: B.map.objective.y }); run(B, 200); issue(B, ids.slice(0, 5), { type: 'hold' }); run(B, 150);
  assert.ok(g.war.saveBattle(eng.id, B.tick, B.log));
  const g2 = roundtrip(g); const bt = g2.war.battle(eng.id); assert.equal(bt.tick, B.tick); assert.equal(bt.log.length, 2);
  const R = replay(bt.setup, bt.log, bt.tick); assert.equal(snap(R), snap(B), 'replayed to the same moment');
  runToEnd(B); runToEnd(R); assert.deepEqual(outcome(R), outcome(B), 'and to the same end');
  assert.ok(JSON.stringify(g2.world.military).length < 120_000, 'the saved battle is small');
  assert.ok(!g2.war.saveBattle('nope', 1, []));
  // a filed battle is no longer saved over
  g.war.fileBattle(eng.id, outcome(B)); assert.ok(!g.war.saveBattle(eng.id, 1, []));
});

test('a battle nobody fights by the last day is fought by the aggregate function, with no general, and applied once', () => {
  const { g, C, eng, squads } = armedCompany(1004); assert.ok(g.war.playEngagement(eng.id, squads).ok);
  days(g, 6); assert.equal(eng.state, 'resolved'); assert.equal(eng.result.how, 'general'); assert.equal(eng.result.general, null);
  assert.ok(C.squads.every((s) => s.status === 'home')); assert.deepEqual(g.war.check(), []);
});

test('the place of an engagement is a real place in the atlas: a city or a town makes a street fight and anywhere else open country, and both come up from real offers', () => {
  const seen = { city: 0, fields: 0, trench: 0, compound: 0, forest: 0 }; const kinds = new Set();
  for (let seed = 1100; seed < 1106 && (seen.city < 2 || seen.fields < 2); seed++) {
    const g = warGame(seed, { cash: 8_000_000 }); buildAll(g, 2);
    for (let d = 0; d < 260; d++) { days(g, 1); for (const e of g.war.engagements().open) { if (e._seen) continue; e._seen = true; seen[e.recipe]++; kinds.add(`${e.recipe}:${e.placeKind}`); assert.ok(['city', 'fields', 'trench', 'compound', 'forest'].includes(e.recipe)); if (e.recipe === 'city') assert.ok(['c', 't'].includes(e.placeKind), `a ${e.placeKind} is not a city`); else assert.ok(!['c', 't'].includes(e.placeKind)); if (e.recipe === 'compound') assert.ok(['b', 'r'].includes(e.placeKind)); if (e.recipe === 'forest') assert.equal(e.terrain, 'forest'); assert.ok(['rural', 'forest', 'mountain', 'desert'].includes(e.terrain)); } }
  }
  assert.ok(seen.city >= 1 && seen.fields >= 1, `both recipes: ${JSON.stringify(seen)} ${[...kinds]}`);
});

test('a sandbox skirmish is a real tactical engagement whose units are not the company\'s: it runs, files and applies, changes nothing and pays nothing', () => {
  const g = warGame(1006, { cash: 3_000_000 }); const cash = g.war.cash(); const before = JSON.stringify(g.war.state().company.personnel);
  const sk = g.war.skirmish('city'); assert.ok(sk.ok); const eng = g.war.engagement(sk.id); assert.equal(eng.state, 'tactical');
  const B = createBattle({ ...eng.battle.setup, ai: { p: true, e: true } }); runToEnd(B); const o = outcome(B); assert.deepEqual([o.dead, o.wounded, o.lost], [[], [], []]);
  g.war.fileBattle(sk.id, o); days(g, 2); assert.equal(eng.state, 'resolved'); assert.equal(eng.result.paid, 0); assert.equal(JSON.stringify(g.war.state().company.personnel), before); assert.ok(g.war.cash() <= cash);
  assert.deepEqual(g.war.check(), []);
});
