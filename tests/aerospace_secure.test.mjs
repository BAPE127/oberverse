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

// Carbon fibre had one supplier (50 lots, 9 a day): a fighter takes up to 27 lots, so standing orders drained it and the Supply page could only say "0 in stock".
test('carbon fibre has two suppliers, one near; a save from before gets the new shelf filled', () => {
  const g = newGame(9922); g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero;
  const sellers = Object.entries(A.cfg.suppliers).filter(([, sp]) => sp.sells.composite);
  assert.ok(sellers.length >= 2 && sellers.some(([, sp]) => sp.where === 'local'));
  for (const [, sp] of sellers) assert.ok(sp.stock * 1 >= 60 && sp.restock >= 12 - 0, 'a real shelf and a real restock');
  const fighter = Object.values(A.cfg.products).filter((p) => p.bom.composite).sort((a, b) => a.bom.composite - b.bom.composite).find((p) => p.line === 'aircraft' && p.bay === 'secure');
  assert.ok(sellers.reduce((t, [, sp]) => t + sp.stock, 0) >= 2 * fighter.bom.composite, 'two fighters\' worth on the shelves at once');
  // an old save: the new supplier is missing from the world's state
  delete A.state.suppliers.sup_halver_composites;
  A.afterLoad();
  assert.equal(A.state.suppliers.sup_halver_composites.stock.composite, A.cfg.suppliers.sup_halver_composites.stock);
  // and the new shelf can be bought from, and the stock ordered is taken from that shelf only
  const co = A.roost;
  const before = A.state.suppliers.sup_halver_composites.stock.composite;
  const r = A.order(co, 'sup_halver_composites', 'composite', 5, {}, {});
  assert.ok(r.ok, r.text);
  assert.equal(A.state.suppliers.sup_halver_composites.stock.composite, before - 5);
});
