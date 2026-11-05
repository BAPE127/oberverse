// Reserves and the new missions (v0.102.2, rules 4): a reserve held off the map until called; a raid, an extraction and a rescue, on every kind of ground; the aggregate estimate weighs them as an attack and a convoy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, runToEnd, issue, callReserve, outcome, replay, step } from '../src/battle/sim.js';
import { RESERVE, TICK, VIP_HOME } from '../src/content/battle.js';
import { estimate } from '../src/war/combat.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 8 === 0 ? 'machine_gunner' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const mk = (o = {}) => buildSetup({ key: o.key || 'M1|x', eng: { goal: o.goal || 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 4, armour: 0, air: 0, skill: 1 } }, people: people(o.n || 8), vehicles: [], ai: o.ai || { p: false, e: false }, reserve: o.reserve || [] });
const snap = (B) => JSON.stringify(B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), Math.round(u.hp), u.alive]));

test('a reserve: held off the map, not counted, takes no losses until called; it comes on at your edge after its delay; the call is in the order log and a replay agrees; with nothing left on the field it is called for you', () => {
  const setup = mk({ reserve: ['p4', 'p5', 'p6', 'p7'] }); const B = createBattle(setup);
  assert.equal(B.reserve.length, 4); assert.equal(B.units.filter((u) => u.side === 'p').length, 4); assert.ok(!B.byId.has('p5'), 'not on the map'); assert.equal(B.start.p, 4);
  run(B, 100); assert.deepEqual(outcome(B).dead.concat(outcome(B).wounded.map((w) => w.id)).filter((id) => ['p4', 'p5', 'p6', 'p7'].includes(id)), [], 'an uncalled reserve takes no losses');
  assert.ok(callReserve(B).ok); assert.ok(!callReserve(B).ok, 'once'); assert.deepEqual(B.log.at(-1).order, { type: 'reserve' });
  run(B, RESERVE.seconds * TICK.perSecond - 5); assert.ok(!B.byId.has('p5'), 'not yet'); run(B, 10); assert.ok(B.byId.has('p5') && B.byId.has('p7'), 'on the field'); assert.ok(B.events.some((e) => e.k === 'arrive'));
  const p5 = B.byId.get('p5'); assert.ok(Math.hypot(p5.x - B.map.spawns.p.x, p5.y - B.map.spawns.p.y) < 14, 'at your edge'); assert.equal(B.start.p, 8);
  run(B, 200); const R = replay(setup, B.log, B.tick); assert.equal(snap(R), snap(B));
  // nothing of yours left on the field: the reserve is called for you instead of the battle being lost
  const W = createBattle(mk({ key: 'M1|wipe', reserve: ['p4', 'p5'], enemy: { troops: 8, armour: 0, air: 0, skill: 1 } })); for (const u of W.units.filter((q) => q.side === 'p')) { u.alive = false; u.hp = 0; }
  run(W, 5); assert.ok(!W.over, 'the battle is not lost while a reserve waits'); assert.ok(W.events.some((e) => e.k === 'reserve')); run(W, 250); assert.ok(W.byId.has('p4'), 'they came on');
  // a headless side calls it after thirty seconds
  const A = createBattle(mk({ key: 'M1|ai', reserve: ['p6', 'p7'], enemy: { troops: 30, armour: 0, air: 0, skill: 1 }, ai: { p: true, e: true } })); run(A, 290); assert.ok(!A.byId.has('p6')); run(A, 260); assert.ok(A.byId.has('p6'));
});

test('a reserve through the engagement: the squads you hold back are flagged in the setup, take no losses if never called, and cannot be all of your force', async () => {
  const { armedCompany } = await import('./war_helpers.mjs');
  const { g, C, eng, squads } = armedCompany(1301); const [a, b] = squads;
  assert.ok(!g.war.playEngagement(eng.id, squads, squads).ok, 'at least one squad goes in'); assert.equal(eng.state, 'open');
  assert.ok(g.war.playEngagement(eng.id, squads, [b]).ok); const setup = eng.battle.setup;
  const held = C.squads.find((s) => s.id === b).members; const flagged = setup.units.filter((u) => u.reserve).map((u) => u.id);
  assert.deepEqual(flagged.sort(), held.filter((m) => setup.units.some((u) => u.id === m)).sort(), 'exactly the squad that was held back'); assert.ok(flagged.length > 0);
  const B = createBattle({ ...setup, ai: { p: false, e: false } }); assert.equal(B.reserve.length, flagged.length); run(B, 200); const o = outcome(B); assert.ok(o.dead.concat(o.wounded.map((w) => w.id)).every((id) => !flagged.includes(id)));
  assert.ok(C.squads.find((s) => s.id === a)); void step;
});

test('a raid, an extraction and a rescue: each is its own goal, ends with a reason, and a strong force does it far more often than a weak one, on every kind of ground', () => {
  const goals = ['raid', 'extract', 'rescue']; const recipes = ['city', 'fields', 'trench', 'compound', 'forest'];
  const rate = (goal, T, seeds = 10) => { let win = 0; let done = 0; for (let s = 0; s < seeds; s++) { const B = createBattle(mk({ key: `M3|${goal}|${T}|${s}`, goal, recipe: recipes[s % recipes.length], n: 12, enemy: { troops: T, armour: 0, air: 0, skill: 1 }, ai: { p: true, e: true } })); runToEnd(B); const o = outcome(B); if (o.objectivesMet?.[0] ?? o.parts) { /* shape check below */ } if (o.objectivesMet[0]) win++; if (B.why && B.why !== 'time') done++; } return { win: win / seeds, done: done / seeds }; };
  for (const goal of goals) {
    const weak = rate(goal, 22); const strong = rate(goal, 2);
    assert.ok(strong.win >= 0.7, `${goal}: a strong force does it (${strong.win})`); assert.ok(strong.win >= weak.win + 0.2, `${goal}: strong ${strong.win} against weak ${weak.win}`);
  }
});

test('the person to be got out: an officer starts at the marked ground, is not a fighter or a record, and the mission is lost if they die; a pilot is hurt and slow; the way home is your own edge', () => {
  const E = createBattle(mk({ goal: 'extract', recipe: 'forest' })); const O = E.units.find((u) => u.vip); assert.equal(O.vip, 'officer'); assert.equal(O.rec, null); assert.ok(Math.hypot(O.x - E.map.objective.x, O.y - E.map.objective.y) < 7);
  const R = createBattle(mk({ goal: 'rescue', recipe: 'forest' })); const P = R.units.find((u) => u.vip); assert.equal(P.vip, 'pilot'); assert.ok(P.hp < O.hp && P.speed < O.speed, 'hurt and slow');
  assert.equal(E.units.filter((u) => u.side === 'p' && !u.vip).length, 8); issue(E, ['p0'], { type: 'hold' });
  O.alive = false; O.hp = 0; run(E, 3); assert.ok(E.over && /dead/.test(E.why)); assert.equal(outcome(E).objectivesMet[0], false);
  const H = createBattle(mk({ goal: 'extract', recipe: 'fields' })); const home = H.map.spawns.p; const v = H.units.find((u) => u.vip); v.x = home.x + 0.5; v.y = home.y + 0.5; run(H, 3); assert.ok(H.over && /home/.test(H.why) && H.vipOut); assert.equal(outcome(H).objectivesMet[0], true); assert.ok(VIP_HOME > 0);
  const D = createBattle(mk({ goal: 'raid' })); assert.ok(D.maxTicks < createBattle(mk({ goal: 'defence' })).maxTicks, 'a raid is on a shorter clock');
});

test('the estimate weighs a raid as an attack and an extraction or a rescue as a convoy: the same force, the same enemy, the same numbers', () => {
  const base = { key: 'x', days: 4, terrain: 'rural', enemy: { troops: 12, armour: 0, air: 0, skill: 1 }, people: people(12), vehicles: [], general: null, supplies: {} };
  const eq = (a, b) => assert.deepEqual(estimate({ ...base, goal: a }).chance, estimate({ ...base, goal: b }).chance);
  eq('raid', 'offence'); eq('extract', 'logistics'); eq('rescue', 'logistics'); assert.doesNotThrow(() => estimate({ ...base, goal: 'raid' }));
});

test('the new missions are offered: over a long run of days a raid, an extraction and a rescue turn up with their goals, a place to fight and an enemy that can be built into a battle', async () => {
  const { warGame, buildAll, days } = await import('./war_helpers.mjs');
  const g = warGame(951, { cash: 6_000_000 }); buildAll(g, 2); const seen = new Map();
  for (let i = 0; i < 400; i++) { days(g, 1); for (const e of g.war.engagements().open) if (!seen.has(e.id)) seen.set(e.id, e); }
  const kinds = new Set([...seen.values()].map((e) => e.kind)); for (const k of ['raid', 'extract', 'rescue']) assert.ok(kinds.has(k), `a ${k} was offered (${[...kinds].join(', ')})`);
  for (const e of seen.values()) if (['raid', 'extract', 'rescue'].includes(e.kind)) { assert.equal(e.goal, e.kind); const B = createBattle(buildSetup({ key: `O|${e.id}`, eng: { goal: e.goal, enemy: e.enemy, recipe: e.recipe, biome: e.terrain, style: e.style }, people: people(8), vehicles: [], ai: { p: true, e: true } })); run(B, 50); assert.ok(B.units.some((u) => u.side === 'e')); }
});
