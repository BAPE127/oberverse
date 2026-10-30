// The physical First Bank of Halvermouth (v0.70.0): a real building on the street with a banking hall the size of its footprint
// (so the street does not move), open 09:00–17:00, with a bond desk and a rate board that open the tablet at Bonds and Bank, and a vault.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT } from './helpers.mjs';

const bank = () => CONTENT.maps.halvermouth.buildings.find((b) => b.id === 'b_bank');

test('the building leads to the hall, which is exactly the size of the building, with its way out back to the door', () => {
  const b = bank();
  assert.equal(b.door.to.map, 'first_bank');
  const I = CONTENT.maps.first_bank;
  assert.equal(I.kind, 'interior');
  assert.equal(I.tiles.length, b.h); assert.equal(I.tiles[0].length, b.w);
  const exit = I.doors.find((d) => d.to.map === 'halvermouth');
  assert.equal(exit.x, b.door.x - b.x); assert.equal(exit.y, I.tiles.length - 1);
  assert.ok(CONTENT.maps.halvermouth.spots[exit.to.spot], 'and a place to stand outside');
  assert.ok(b.door.portal && b.door.seamless, 'a seamless crossing like every other building');
});

test('open from nine to five, locked at night with the hours in the message', () => {
  const g = newGame(3001);
  g.changeMap('halvermouth', 'b_bank_out');
  const d = g.currentMap().doors.find((x) => x.to?.map === 'first_bank');
  assert.ok(d, 'the door is on the street');
  setTime(g, 1, '10:00'); assert.equal(g.playerCanPass(d), true);
  setTime(g, 1, '18:30'); assert.equal(g.playerCanPass(d), false);
  assert.match(g.doorLockReason(d, () => false), /open 09:00 to 17:00/);
  setTime(g, 1, '08:59'); assert.equal(g.playerCanPass(d), false);
});

test('the bond desk and the rate board open the tablet at Bonds and at Bank; the vault is a locked fixture', () => {
  const g = newGame(3002);
  g.changeMap('first_bank', 'entry');
  const m = g.currentMap();
  const desk = m.prop('bank_bond_desk'); const board = m.prop('bank_rate_board'); const vault = m.prop('bank_vault');
  assert.deepEqual(g.interact({ id: desk.id }), { type: 'panel', panel: 'tablet', opts: { tab: 'Bonds' } });
  assert.deepEqual(g.interact({ id: board.id }), { type: 'panel', panel: 'tablet', opts: { tab: 'Bank' } });
  const v = g.interact({ id: vault.id });
  assert.equal(v.type, 'message'); assert.match(v.text, /shut/);
  assert.ok(vault.type === 'vault');
  const t = g.interact({ id: 'bank_tellers' });
  assert.equal(t.type, 'message');
});

test('walking out puts you back on the street at the door, and the street around the bank has not moved', () => {
  const g = newGame(3003);
  g.changeMap('first_bank', 'entry');
  const exit = g.currentMap().doors.find((d) => d.to.map === 'halvermouth');
  assert.ok(exit);
  g.changeMap(exit.to.map, exit.to.spot);
  assert.equal(g.currentMap().id, 'halvermouth');
  // the signature cars and the street cars sit where they did (their own tests say they are on clear ground); the hall added no growth
  assert.equal(CONTENT.maps.halvermouth.buildings.find((b) => b.id === 'b_bank').x, 57);
  assert.equal(CONTENT.maps.halvermouth.buildings.find((b) => b.id === 'b_bank').w, 11);
});
