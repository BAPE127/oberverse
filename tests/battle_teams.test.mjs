// Teams (rules 5): a squad splits into smaller teams and merges again; orders can name a team; splits and merges are logged and replay exactly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, splitTeam, mergeTeams, teamOf, replay } from '../src/battle/sim.js';
import { TEAMS } from '../src/content/battle.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const tank = { id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 };
const mk = (o = {}) => buildSetup({ key: o.key || 'TM1|x', eng: { goal: 'defence', recipe: 'fields', biome: 'rural', style: 'sund', enemy: { troops: 10, armour: 0, air: 0, skill: 1 } }, people: people(o.n || 12), vehicles: o.vehicles ?? [tank], ai: { p: false, e: false } });
const park = (B) => B.units.filter((u) => u.side === 'e').forEach((u, i) => { u.x = 110 + (i % 5); u.y = 3 + Math.floor(i / 5); u.W = { ...u.W, range: 0 }; });

test('every soldier is in exactly one team, a squad is a team by default, a vehicle is a team of its own, and the enemy is in elements of three to six', () => {
  const B = createBattle(mk()); const mine = B.units.filter((u) => u.side === 'p' && u.kind === 'inf');
  for (const u of B.units) assert.equal(B.teams.filter((t) => t.members.includes(u.id)).length, 1, `${u.id} is in one team`);
  assert.equal(B.teams.filter((t) => t.side === 'p' && t.kind === 'inf').length, 2, 'twelve soldiers are two squads of six'); assert.ok(mine.every((u) => teamOf(B, u.id).side === 'p'));
  assert.deepEqual(teamOf(B, 'T1').members, ['T1']); assert.equal(teamOf(B, 'T1').kind, 'veh');
  const el = B.teams.filter((t) => t.side === 'e' && t.kind === 'inf'); assert.ok(el.every((t) => t.members.length >= TEAMS.minElement && t.members.length <= 6), el.map((t) => t.members.length).join());
  assert.equal(el.reduce((a, t) => a + t.members.length, 0), 10);
});

test('a squad is split into smaller teams and merged again; bad splits are refused and nothing is lost', () => {
  const B = createBattle(mk()); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const all = [...sq.members];
  assert.equal(splitTeam(B, sq.id, [], 'x').ok, false); assert.equal(splitTeam(B, sq.id, all, 'x').ok, false, 'someone must stay'); assert.equal(splitTeam(B, sq.id, ['p11'], 'x').ok, false, 'not his team'); assert.equal(splitTeam(B, 'nope', [all[0]]).ok, false);
  const r = splitTeam(B, sq.id, all.slice(0, 2), 'Scouts'); assert.ok(r.ok); assert.equal(r.team.name, 'Scouts'); assert.deepEqual(r.team.members, all.slice(0, 2)); assert.equal(sq.members.length, all.length - 2);
  assert.equal(B.teams.filter((t) => t.members.includes(all[0])).length, 1); assert.equal(teamOf(B, all[0]).id, r.team.id);
  const r2 = splitTeam(B, r.team.id, [all[0]]); assert.ok(r2.ok, 'a team of two splits into two ones'); assert.equal(r.team.members.length, 1);
  assert.equal(splitTeam(B, r2.team.id, [all[0]]).ok, false, 'a team of one cannot be split');
  assert.ok(mergeTeams(B, sq.id, r.team.id).ok); assert.ok(mergeTeams(B, sq.id, r2.team.id).ok);
  assert.deepEqual([...sq.members].sort(), [...all].sort()); assert.equal(B.teams.filter((t) => t.side === 'p' && t.kind === 'inf').length, 2);
  assert.equal(mergeTeams(B, sq.id, sq.id).ok, false); assert.equal(mergeTeams(B, sq.id, 'T1').ok, false, 'a vehicle is not merged into a squad');
  const e = B.teams.find((t) => t.side === 'e'); assert.equal(splitTeam(B, e.id, [e.members[0]]).ok, false, 'only your own');
});

test('an order may name a team: all its living members go, each to his own place in the formation round the point, and the old way of naming units still works', () => {
  const B = createBattle(mk()); park(B); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf');
  issue(B, [sq.id], { type: 'move', x: 40, y: 30 }); const us = sq.members.map((m) => B.byId.get(m)); assert.ok(us.every((u) => u.order.type === 'move'), 'all of them have the order');
  const spots = new Set(us.map((u) => `${u.order.x.toFixed(1)},${u.order.y.toFixed(1)}`)); assert.ok(spots.size >= us.length - 1, `each to his own place (${spots.size})`);
  run(B, 400); for (const u of us) assert.ok(Math.hypot(u.x - 40, u.y - 30) < 6, `${u.id} arrived near the point`);
  const other = B.byId.get('p11'); issue(B, ['p11'], { type: 'hold' }); assert.equal(other.order.type, 'hold');
  B.byId.get(sq.members[0]).alive = false; issue(B, [sq.id], { type: 'hold' }); assert.equal(B.byId.get(sq.members[1]).order.type, 'hold'); // (a dead man is not given orders)
});

test('in the battle a split needs the team close together and not pinned, and costs a few seconds of re-forming; a merge needs them near each other', () => {
  const B = createBattle(mk()); park(B); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const us = sq.members.map((m) => B.byId.get(m));
  run(B, 5); us.forEach((u, i) => { u.x = 20 + (i % 3) * 1.5; u.y = 20 + Math.floor(i / 3) * 1.5; });
  const far = B.byId.get(sq.members[0]); far.x += 20; assert.equal(splitTeam(B, sq.id, [sq.members[1]]).ok, false, 'too spread out'); far.x -= 20;
  us[2].state = 'pinned'; assert.equal(splitTeam(B, sq.id, [sq.members[1]]).ok, false, 'pinned'); us[2].state = 'steady';
  const r = splitTeam(B, sq.id, [sq.members[1], sq.members[2]], 'Fire team'); assert.ok(r.ok); assert.ok(us.every((u) => u.cd >= TEAMS.pause * 10 - 1), 'they are busy re-forming');
  const other = B.teams.find((t) => t.side === 'p' && t.kind === 'inf' && t !== sq && t !== r.team); B.byId.get(other.members[0]).x = 90; assert.equal(mergeTeams(B, r.team.id, other.id).ok, false, 'far apart');
});

test('splits, merges and team orders are in the log and replay to the same battle', () => {
  const setup = mk({ key: 'TM2|x' }); const B = createBattle(setup); park(B); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const ids = [...sq.members];
  const t = splitTeam(B, sq.id, ids.slice(0, 3), 'Alpha'); assert.ok(t.ok);
  issue(B, [t.team.id], { type: 'move', x: 40, y: 20 }); run(B, 150); issue(B, [sq.id], { type: 'amove', x: 42, y: 22 }); run(B, 300); assert.ok(mergeTeams(B, sq.id, t.team.id).ok); run(B, 50);
  assert.equal(B.log.filter((e) => e.order.type === 'split' || e.order.type === 'merge').length, 2);
  const R = replay(setup, B.log, B.tick);
  assert.deepEqual(R.teams.map((q) => [q.id, q.members]), B.teams.map((q) => [q.id, q.members]));
  assert.equal(R.tick, B.tick);
});
