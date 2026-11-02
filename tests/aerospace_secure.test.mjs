// More secure integration halls (v0.91.2): the Widebody hall had the only secure slot, so a firm could build one fighter or bomber at a time.
// The Secure integration complex adds two more, in a hall of their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';

const DAY = 1440;
const H = CONTENT.aerospace.halls;

test('three secure slots in all: one in the Widebody hall and two in the Secure integration complex; nothing else takes a secure bay', () => {
  const secure = Object.entries(H).flatMap(([hid, hall]) => hall.slots.filter((s) => s.fits.includes('secure')).map((s) => `${hid}:${s.id}`));
  assert.deepEqual(secure.sort(), ['secure:hx_a', 'secure:hx_b', 'wide:hw_b']);
  assert.ok(H.secure.slots.every((s) => s.fits.length === 1), 'the complex is for secure bays only');
  assert.ok(H.secure.build > 0 && H.secure.upkeep > 0 && H.secure.buildDays > 0);
});

test('build the complex, then fit a secure bay in each slot (paid from the firm, in days), and run out of free slots', () => {
  const g = newGame(9921); g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero; const co = A.roost;
  assert.equal(A.hallState(co, 'secure').state, 'site');
  assert.equal(A.buildBay(co, 'secure', 'hx_a').ok, false, 'no bay in a hall that is not there');
  const r = A.buildHall(co, 'secure');
  assert.ok(r.ok, r.text);
  for (let i = 0; i < (H.secure.buildDays + 1) * DAY; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(A.hallState(co, 'secure').state, 'built');
  assert.ok(A.buildBay(co, 'secure', 'hx_a').ok);
  assert.ok(A.buildBay(co, 'secure', 'hx_b').ok);
  assert.equal(A.buildBay(co, 'secure', 'hx_b').ok, false, 'the slot is taken');
  assert.equal(co.bays.filter((b) => b.type === 'secure').length, 2);
  assert.equal(A.buildBay(co, 'light', 'hx_a').ok, false, 'a light bay does not fit a secure slot');
});
