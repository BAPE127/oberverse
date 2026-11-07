// Hire every class, and hire straight into a squad (v0.103.6): a recruit holds a place in the squad while training and joins it the morning training ends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, days } from './war_helpers.mjs';
import { CLASSES, TROOP_CLASSES, SQUAD } from '../src/content/troops.js';

const base = (seed) => { const g = warGame(seed, { cash: 30_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 80); g.war.buySupply('rations', 500); return g; };

test('every troop class can be hired, one after another as training places free up', () => {
  const g = base(1101);
  for (const role of TROOP_CLASSES) { for (let i = 0; i < 20 && g.war.hire(role).ok === false; i++) days(g, 1); }
  for (const role of TROOP_CLASSES) assert.ok(g.war.people().some((p) => p.role === role), `${role} was hired`);
  assert.deepEqual(g.war.check(), []);
});

test('hired into a squad: a place is held while training, the recruit joins on the morning training ends, and the squad counts held places as full', () => {
  const g = base(1102);
  const q = g.war.squadCreate('Alpha'); assert.ok(q.ok);
  const r = g.war.hire('marksman', q.id); assert.ok(r.ok, r.text);
  let S = g.war.squads()[0]; assert.equal(S.size, 0, 'not a member yet'); assert.equal(S.incoming.length, 1); assert.equal(S.incoming[0].role, 'marksman');
  assert.equal(g.war.people().find((p) => p.id === r.id).assignedTo, null);
  days(g, CLASSES.marksman.train + 1);
  S = g.war.squads()[0]; assert.equal(S.size, 1, 'joined when training ended'); assert.equal(S.incoming.length, 0);
  assert.equal(g.war.people().find((p) => p.id === r.id).assignedTo, q.id);
  assert.deepEqual(g.war.check(), []);
});

test('held places count against the twelve; a guard is never put in a squad; an away or unknown squad is refused; standing a squad down frees the places', () => {
  const g = base(1103);
  const q = g.war.squadCreate('Bravo'); assert.ok(q.ok);
  for (let i = 0; i < SQUAD.max; i++) { let r = g.war.hire('rifleman', q.id); for (let k = 0; !r.ok && k < 20; k++) { days(g, 1); r = g.war.hire('rifleman', q.id); } assert.ok(r.ok, r.text); }
  const full = g.war.hire('rifleman', q.id); assert.equal(full.ok, false); assert.match(full.text, /full/);
  assert.equal(g.war.hire('guard', q.id).ok, false); assert.equal(g.war.hire('rifleman', 'Q999').ok, false);
  assert.ok(g.war.squadDisband(q.id).ok);
  assert.ok(g.war.people().every((p) => p.joins == null), 'no held places remain');
  assert.deepEqual(g.war.check(), []);
});

test('a recruit whose squad was stood down while they trained is still a soldier, and is placed by the auto-squads', () => {
  const g = base(1104); g.war.setAutoSquads(true, false);
  const q = g.war.squadCreate('Charlie'); const r = g.war.hire('rifleman', q.id); assert.ok(r.ok);
  g.war.squadDisband(q.id); days(g, 8);
  const p = g.war.people().find((x) => x.id === r.id); assert.equal(p.status, 'active'); assert.ok(p.assignedTo != null, 'the morning placed them');
});
