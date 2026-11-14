// The battle screen's pure parts and the simulation calls the planning screen makes (src/ui/battleTeams.js): a plan replays from its log, a reopened planning battle restores the plan, number keys
// bind to teams, and an order given to a team reaches exactly its members.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, replay, issue, run, splitTeam, mergeTeams, deploy, chooseEntry, beginBattle, autoPlan, currentEntry } from '../src/battle/sim.js';
import { myTeams, tagMap, tagOf, teamLetter, clickSelect, orderIds, teamsOfSelection, autoBind, bindTeam, recall, unplaced, intelText } from '../src/ui/battleTeams.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 5 === 3 ? 'medic' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const tank = { id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 };
const setup = () => buildSetup({ key: 'UI1|x', eng: { goal: 'defence', recipe: 'fields', biome: 'rural', style: 'sund', intel: 1, enemy: { troops: 8, armour: 1, air: 0, skill: 1 } }, people: people(12), vehicles: [tank], ai: { p: false, e: true }, plan: true });
const sig = (B) => JSON.stringify({ t: B.tick, teams: B.teams.map((t) => [t.id, t.name, t.members]), u: B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3)]) });

function makePlan(B) {
  const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const z = currentEntry(B).zone;
  const a = splitTeam(B, sq.id, sq.members.slice(0, 2), 'Alpha'); assert.ok(a.ok, a.text);
  const b = splitTeam(B, sq.id, sq.members.slice(0, 2), 'Bravo'); assert.ok(b.ok, b.text);
  deploy(B, a.team.id, z.x + z.w * 0.3, z.y + z.h * 0.3); deploy(B, b.team.id, z.x + z.w * 0.6, z.y + z.h * 0.6);
  return { a: a.team, b: b.team };
}

test('a plan of an entry, two splits, deploys and begin replays identically from the log', () => {
  const S = setup(); const B = createBattle(S); chooseEntry(B, B.map.entries[1].id); makePlan(B); beginBattle(B); run(B, 120);
  const R = replay(S, B.log, B.tick); assert.equal(sig(R), sig(B)); assert.equal(R.phase, 'live');
});

test('a battle reopened while still planning keeps the plan (teams, names, places) and is still paused', () => {
  const S = setup(); const B = createBattle(S); makePlan(B); const log = B.log.map((x) => ({ t: x.t, ids: x.ids, order: x.order }));
  const R = replay(S, log, 0); assert.equal(R.phase, 'plan'); assert.equal(sig(R), sig(B)); assert.ok(R.teams.some((t) => t.name === 'Alpha'));
  assert.equal(R.log.length, B.log.length, 'reopening does not grow the log');
});

test('number keys are bound to teams in order, rebind with Ctrl, and call up living members', () => {
  const B = createBattle(setup()); makePlan(B); const bind = autoBind(B); const teams = myTeams(B);
  assert.equal(bind.size, teams.length); assert.equal(bind.get('1'), teams[0].id); assert.equal(bind.get('2'), teams[1].id);
  bindTeam(bind, 5, teams[0].id); assert.equal(bind.get('5'), teams[0].id); assert.ok(![...bind].some(([k, v]) => k === '1' && v === teams[0].id));
  assert.deepEqual(recall(B, bind, 5), teams[0].members); assert.deepEqual(recall(B, bind, 9), []);
  const again = autoBind(B, bind); assert.equal(again.get('5'), teams[0].id, 'a binding is kept');
});

test('a click takes a soldier\'s team, a modified click only him; tags are lettered and coloured by team', () => {
  const B = createBattle(setup()); const { a } = makePlan(B); const m = a.members[0];
  assert.deepEqual(clickSelect(B, m), a.members); assert.deepEqual(clickSelect(B, m, true), [m]);
  const tg = tagOf(B, m); assert.equal(tg.letter, 'A'); assert.equal(teamLetter({ name: 'Squad 1 B' }), 'B');
  const map = tagMap(B, (i) => `c${i}`); assert.equal(map.get(m).team, a.id); assert.ok(map.size >= 12);
  assert.notEqual(tagOf(B, a.members[0], (i) => i).color, tagOf(B, myTeams(B).find((t) => t.id !== a.id && t.kind === 'inf').members[0], (i) => i).color);
});

test('an order given to a team reaches exactly its members, and a partial selection goes by unit', () => {
  const S = setup(); const B = createBattle(S); const { a, b } = makePlan(B); beginBattle(B);
  const ids = orderIds(B, a.members); assert.deepEqual(ids, [a.id]);
  issue(B, ids, { type: 'move', x: 40, y: 30 });
  for (const u of B.units.filter((q) => q.side === 'p' && q.kind === 'inf')) assert.equal(u.order.type === 'move', a.members.includes(u.id), u.id);
  const part = orderIds(B, [b.members[0]]); assert.deepEqual(part, [b.members[0]]);
  assert.deepEqual(teamsOfSelection(B, [...a.members, b.members[0]]).map((q) => [q.team.id, q.n]), [[a.id, a.members.length], [b.id, 1]]);
  const R = replay(S, B.log, B.tick); assert.deepEqual(R.byId.get(a.members[0]).order.type, 'move');
});

test('merge in the plan puts the soldiers back in one team; unplaced and the scout text read the simulation', () => {
  const B = createBattle(setup()); const { a, b } = makePlan(B); const r = mergeTeams(B, a.id, b.id); assert.ok(r.ok);
  assert.equal(myTeams(B).find((t) => t.id === a.id).members.length, 4); assert.equal(unplaced(B).count, 0);
  const u = B.byId.get(a.members[0]); u.x = 90; u.y = 90; assert.equal(unplaced(B).count, 1);
  const A = autoPlan(B); assert.ok(A.ok); assert.equal(unplaced(B).count, 0);
  assert.match(intelText({ level: 1, contacts: [{}, {}] }), /Spotted: 2/); assert.match(intelText({ level: 0, contacts: [] }), /Nothing is known/); assert.match(intelText({ level: 2, contacts: [{}] }), /Known/);
});
