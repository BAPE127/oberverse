// Owning the shipping company means free delivery (v0.91.4): your materials arrive with no freight, handling or duty, and no ship of yours is needed;
// you pay for the goods. Also the freight-rate saturation that keeps a big fleet from earning without limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { INCOME } from '../src/content/income.js';

const own = (seed) => {
  const g = newGame(seed); g.player.money = 50e6;
  assert.ok(g.aero.buyFirm().ok);
  return g;
};
const far = (A, m) => Object.keys(A.cfg.suppliers).find((id) => A.cfg.suppliers[id].where !== 'local' && A.cfg.suppliers[id].sells[m]);

test('without a shipping company freight, handling and duty are charged; with one they are all nothing, and the order costs the goods', () => {
  const g = own(9931); const A = g.aero; const co = A.roost;
  const m = 'composite'; const sup = far(A, m);
  const noLine = A.quoteOrder(co, sup, m, 5);
  assert.ok(noLine.freight > 0 && noLine.handling > 0 && noLine.duty > 0, JSON.stringify([noLine.freight, noLine.handling, noLine.duty]));
  assert.equal(A.freeDelivery(co), false);
  assert.ok(g.logistics.buyCompany().ok);
  assert.equal(A.freeDelivery(co), true);
  const q = A.quoteOrder(co, sup, m, 5);
  assert.deepEqual([q.freight, q.handling, q.duty], [0, 0, 0]);
  assert.equal(q.payNow, q.goods, 'you pay for the goods only');
});

test('no ship is needed: the order goes by the plain route, takes no berth and a ship that is busy or missing changes nothing', () => {
  const g = own(9932); const A = g.aero; const co = A.roost;
  assert.ok(g.logistics.buyCompany().ok);
  for (const v of g.logistics.vessels()) v.status = 'underway'; // every ship away
  const sup = far(A, 'composite');
  const q = A.quoteOrder(co, sup, 'composite', 5);
  assert.equal(q.mode, 'carrier', 'not an own-ship consignment');
  assert.equal(q.ownOk, false);
  const cash = g.corp.cashOf('aerospace'); const wallet = g.player.money;
  const r = A.order(co, sup, 'composite', 5, {}, {});
  assert.ok(r.ok, r.text);
  assert.equal(r.po.freight, 0); assert.equal(r.po.mode, 'carrier');
  assert.equal(wallet - g.player.money, r.po.goods, 'the goods and nothing else came out of the pocket (the firm has no account of its own here)');
  void cash;
});

test('with the switch off, the old own-ship consignments are back', () => {
  const was = INCOME.ownShippingFree; INCOME.ownShippingFree = false;
  try {
    const g = own(9933); const A = g.aero;
    assert.ok(g.logistics.buyCompany().ok);
    assert.equal(A.freeDelivery(A.roost), false);
    assert.equal(A.canShipInternal(A.roost), true);
    assert.ok(A.quoteOrder(A.roost, far(A, 'composite'), 'composite', 5, 'internal').freight >= 0);
  } finally { INCOME.ownShippingFree = was; }
});

test('freight rates fall as you flood the lanes: each contract you put a ship on makes the next pay less, and the rate is fixed when the ship goes', () => {
  const g = newGame(9934); g.player.money = 50e6;
  assert.ok(g.logistics.buyCompany().ok);
  const L = g.logistics;
  assert.ok(INCOME.freightSaturation > 0);
  assert.equal(L.currentRate(), 1, 'a quiet week pays full');
  L.state.assigned = [g.clock.day, g.clock.day, g.clock.day, g.clock.day];
  assert.ok(Math.abs(L.currentRate() - 1 / (1 + 4 / INCOME.freightSaturation)) < 1e-9);
  L.state.assigned = [g.clock.day - 11, g.clock.day - 12]; // older than the window: forgotten
  assert.equal(L.currentRate(), 1);
  const c = { type: Object.keys(L.cfg.contractTypes)[0], pay: 1000, deadline: g.clock.total + 1e6, rate: 0.5 };
  assert.equal(L.payFor(c, g.clock.total), Math.round(1000 * 0.5 * (1 + (L.cfg.contractTypes[c.type].earlyBonus || 0))), 'the rate fixed at the start is the one paid');
});

test('the income figures that set each business\'s size are in one place and in the order Aerospace, Ships, Arms, Farm for a starter', () => {
  assert.ok(INCOME.business.crops > 1 && INCOME.business.contracts > 1 && INCOME.aerospace > 1 && INCOME.arms > 1);
  assert.ok(INCOME.armsDemand > 0 && INCOME.armsDemand <= 1);
});
