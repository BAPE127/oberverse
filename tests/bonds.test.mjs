// Government bonds (v0.69.0): three terms at the policy rate plus a premium, monthly coupons, the face at the end, and a market
// value that follows the yield — an investment of your own, priced from the First Bank's rate, creating nothing until bought.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { premium, yieldFor, couponAt, cashFlows, valueOf, YEAR, MONTH } from '../src/corp/bonds.js';
import { BONDS } from '../src/systems/bonds.js';

const dayAt = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.bonds.dailyTick(); };
const setRate = (g, r) => { (g.corp.state.bank ||= { v: 1, rate: r, since: 1, decisions: [], lastMeeting: 99 }).rate = r; };

test('pure: the premium and yield curve, the coupon to the quarter-point, the cash a bond pays and what it is worth', () => {
  assert.equal(premium(0), 0); assert.equal(premium(1), 0.0025); assert.equal(premium(3), 0.0075); assert.equal(premium(5), 0.0125); assert.equal(premium(9), 0.0125);
  assert.ok(Math.abs(premium(2) - 0.005) < 1e-12, 'between the points: a straight line');
  assert.equal(yieldFor(0.05, 5), 0.0625); assert.equal(couponAt(0.05, 1), 0.0525); assert.equal(couponAt(0.0507, 3), 0.0575);
  assert.ok(yieldFor(0, 1) >= 0.0025, 'never nothing');
  const lot = { face: 12000, coupon: 0.06, due: 31, end: 31 + 2 * MONTH };
  const f = cashFlows(lot, 1);
  assert.deepEqual(f.map((x) => x.amount), [60, 60, 12060]);
  assert.deepEqual(f.map((x) => x.months), [1, 2, 3], 'months from today');
  // new at par when the coupon is the yield, worth less when yields rise, more when they fall
  const par = { face: 100000, coupon: yieldFor(0.05, 3), due: 31, end: 1 + 3 * YEAR };
  const v0 = valueOf({ ...par, due: 31 }, 1, 0.05);
  assert.ok(Math.abs(v0 - 100000) < 600, `par ${v0}`);
  assert.ok(valueOf(par, 1, 0.08) < v0 && valueOf(par, 1, 0.02) > v0);
  assert.ok(valueOf(par, 1, 0.08) > 100000 * 0.85 && valueOf(par, 1, 0.02) < 100000 * 1.12, 'a few points of rate move it a few percent, not wildly');
  assert.equal(valueOf({ ...par, end: 0, due: 31 }, 1, 0.05), 0, 'nothing left to pay');
});

test('nothing is made before the first purchase; buying: par, bounds, refusals change nothing', () => {
  const g = newGame(2201);
  assert.equal(g.corp.state.bonds, undefined);
  assert.deepEqual(g.corp.bonds.offers().map((o) => [o.years, o.coupon]), [[1, 0.0525], [3, 0.0575], [5, 0.0625]]);
  g.player.money = 500000;
  const b = g.corp.bonds.buy(3, 100000);
  assert.ok(b.ok, b.text);
  assert.equal(g.player.money, 400000, 'par: you pay the face');
  const l = g.corp.bonds.lots()[0];
  assert.deepEqual([l.face, l.coupon, l.due, l.end], [100000, 0.0575, 31, 1 + 3 * YEAR]);
  const keep = JSON.stringify([g.player.money, g.corp.state.bonds]);
  assert.match(g.corp.bonds.buy(2, 5000).text, /No such bond/);
  assert.match(g.corp.bonds.buy(1, 500).text, /at least 1,000/);
  assert.match(g.corp.bonds.buy(1, 1050).text, /in hundreds/);
  assert.match(g.corp.bonds.buy(1, 2_000_100).text, /at most 2,000,000/);
  g.player.money = 100;
  assert.match(g.corp.bonds.buy(1, 1000).text, /cannot afford/);
  g.player.money = 400000;
  assert.equal(JSON.stringify([g.player.money, g.corp.state.bonds]), keep);
});

test('coupons: a month\'s each thirty days, once, nothing early; the face and the last coupon at the end; the lot goes', () => {
  const g = newGame(2202); g.player.money = 1_000_000;
  g.corp.bonds.buy(1, 120000);
  const m0 = g.player.money; const per = Math.round(120000 * 0.0525 / 12);
  dayAt(g, 30); assert.equal(g.player.money, m0, 'not due yet');
  dayAt(g, 31); assert.equal(g.player.money - m0, per);
  dayAt(g, 31); assert.equal(g.player.money - m0, per, 'once');
  dayAt(g, 45); assert.equal(g.player.money - m0, per);
  dayAt(g, 91); assert.equal(g.player.money - m0, 3 * per, 'two more, after a gap of sixty days, each once');
  assert.equal(g.corp.bonds.peek().earned, 3 * per);
  dayAt(g, 361);
  assert.equal(g.corp.bonds.lots().length, 0, 'matured');
  assert.equal(g.player.money - m0, 12 * per + 120000, 'twelve coupons and the face, no more');
  dayAt(g, 400); assert.equal(g.player.money - m0, 12 * per + 120000);
  assert.match(g.corp.bonds.peek().log.at(-1).text, /matured/);
});

test('value and sale: the yield decides; a sale is worth the market value less the spread, and you may sell at any time', () => {
  const g = newGame(2203); g.player.money = 1_000_000;
  setRate(g, 0.05);
  g.corp.bonds.buy(5, 200000);
  const id = g.corp.bonds.lots()[0].id;
  const v5 = g.corp.bonds.view(g.corp.bonds.lots()[0]);
  assert.ok(Math.abs(v5.value - 200000) < 1500);
  setRate(g, 0.08);
  const v8 = g.corp.bonds.view(g.corp.bonds.lots()[0]);
  assert.ok(v8.value < v5.value * 0.9, `${v8.value}`);
  setRate(g, 0.02);
  const v2 = g.corp.bonds.view(g.corp.bonds.lots()[0]);
  assert.ok(v2.value > 200000);
  assert.equal(v2.sale, Math.round(v2.value * (1 - BONDS.spread)));
  const m0 = g.player.money;
  const r = g.corp.bonds.sell(id);
  assert.ok(r.ok, r.text); assert.equal(g.player.money - m0, v2.sale);
  assert.equal(g.corp.bonds.lots().length, 0);
  assert.match(g.corp.bonds.sell(id).text, /do not hold/);
  // a round trip with no change in the rate costs the spread and nothing more
  const h = newGame(2204); h.player.money = 1_000_000; setRate(h, 0.05);
  h.corp.bonds.buy(3, 100000); const before = h.player.money; h.corp.bonds.sell(h.corp.bonds.lots()[0].id);
  assert.ok(100000 - (h.player.money - before) <= 100000 * BONDS.spread + 700, `cost of a round trip: ${100000 - (h.player.money - before)}`);
});

test('saves keep the lots and the coupons already paid; nothing is paid twice after loading; an old save has none', () => {
  const g = newGame(2205); g.player.money = 1_000_000;
  g.corp.bonds.buy(3, 60000); dayAt(g, 31);
  const snap = JSON.parse(JSON.stringify(g.corp.state.bonds));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.bonds)), snap);
  const money = g2.player.money;
  g2.clock.total = g.clock.total; g2.corp.bonds.dailyTick();
  assert.equal(g2.player.money, money, 'the same day again pays nothing');
  assert.equal(newGame(2206).corp.state.bonds, undefined);
  assert.equal(newGame(2206).corp.bonds.holdingsValue(), 0);
});

test('the policy rate moves what new bonds pay and what old ones are worth, and a bond bought dear is not repriced', () => {
  const g = newGame(2207); g.player.money = 2_000_000; setRate(g, 0.03);
  assert.equal(g.corp.bonds.offers().find((o) => o.years === 3).coupon, 0.0375);
  g.corp.bonds.buy(3, 100000);
  setRate(g, 0.07);
  assert.equal(g.corp.bonds.offers().find((o) => o.years === 3).coupon, 0.0775);
  assert.equal(g.corp.bonds.lots()[0].coupon, 0.0375, 'the coupon was fixed at issue');
  assert.ok(g.corp.bonds.holdingsValue() < 100000, 'and so it is worth less');
});
