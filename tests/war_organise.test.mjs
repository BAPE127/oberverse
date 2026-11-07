// Organising the troops (v0.103.3): one tap puts every free soldier in a squad and arms them; with the automatic setting it happens each morning; and the stores hold any amount.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, cageGoods, days } from './war_helpers.mjs';

function troops(seed, auto) {
  const g = warGame(seed, { cash: 20_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 40); g.war.buySupply('rations', 500);
  cageGoods(g, 'aw1', { item_smg: 30, item_pistol: 10, item_assault_rifle: 30 });
  for (const item of ['item_smg', 'item_pistol', 'item_assault_rifle']) g.war.transfer({ source: 'arms', works: 'aw1', item, qty: 30 });
  if (auto) g.war.setAutoSquads(true);
  for (const role of ['officer', ...Array(14).fill('rifleman'), 'medic']) assert.ok(g.war.hire(role).ok, role);
  return g;
}

test('organise places every trained, free soldier in a squad (an officer leads one, squads hold twelve, new squads are formed) and arms them from the stores, and moves no one who is already placed', () => {
  const g = troops(961, false); days(g, 12);
  assert.equal(g.war.squads().length, 0);
  const r = g.war.organise(); assert.ok(r.ok, r.text);
  const S = g.war.squads();
  assert.equal(S.length, 2, 'sixteen people need two squads of at most twelve'); assert.ok(S.every((s) => s.size <= 12));
  assert.ok(S.some((s) => s.leader), 'the officer leads one');
  assert.ok(g.war.people().filter((p) => p.role === 'rifleman').every((p) => p.assignedTo != null && p.weapon), 'all placed and armed');
  const before = JSON.stringify(g.war.squads().map((s) => [s.id, s.members]));
  assert.equal(g.war.organise().placed, 0); assert.equal(JSON.stringify(g.war.squads().map((s) => [s.id, s.members])), before, 'a second tap changes nothing');
  assert.deepEqual(g.war.check(), []);
});

test('with the automatic setting soldiers join a squad when their training ends, and without it nobody is placed for you', () => {
  const off = troops(962, false); days(off, 12); assert.equal(off.war.squads().length, 0, 'off: nothing happens by itself');
  const on = troops(963, true); assert.equal(on.war.autoSquads(), true); days(on, 12);
  assert.ok(on.war.squads().length >= 1 && on.war.people().filter((p) => p.role === 'rifleman').every((p) => p.assignedTo != null), 'on: placed each morning');
  assert.ok(on.war.setAutoSquads(false).ok); assert.equal(on.war.autoSquads(), false);
});

test('the stores hold any amount: a thousand of something is not refused, with or without a storehouse built', () => {
  const g = warGame(964); assert.ok(g.war.buySupply('uniform', 1000).ok); assert.equal(g.war.stock()['supply:uniform'], 1000);
  assert.deepEqual(g.war.check(), []);
});
