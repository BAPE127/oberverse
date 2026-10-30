// Corporate bonds (v0.71.0): issued by the wider world's listed companies, rated from their own books, paying coupons, defaulting
// only when the world's simulation closes the issuer, repaid at par if it is taken over — and creating nothing until bought.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { rate, spreadOf, recovery, issueFace, RATINGS } from '../src/corp/credit.js';
import { yieldFor } from '../src/corp/bonds.js';
import { CREDIT } from '../src/systems/creditBonds.js';

const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.dailyTick(); };
function open(seed) { const g = newGame(seed); g.corp.ensureWorld(); day(g, 2); return g; }
const first = (g) => g.corp.credit.offers()[0];

test('pure: rating from the books — leverage, losses, cash, distress — spreads that widen, recovery bounded, the issue size', () => {
  const base = { debt: 100, cash: 500, plantValue: 1000, lastNet: 10, status: 'active' };
  assert.equal(rate({ ...base, debt: 50 }), 'AA');
  assert.equal(rate({ ...base, debt: 200 }), 'A');
  assert.equal(rate({ ...base, debt: 400 }), 'BBB');
  assert.equal(rate({ ...base, debt: 800 }), 'BB');
  assert.equal(rate({ ...base, debt: 1400 }), 'B');
  assert.equal(rate({ ...base, debt: 50, lastNet: -1 }), 'A', 'losing money: a notch worse');
  assert.equal(rate({ ...base, debt: 50, cash: -10, lastNet: -1 }), 'BBB', 'and short of cash: another');
  assert.equal(rate({ ...base, debt: 0, status: 'distressed' }), 'CCC');
  assert.equal(rate({ ...base, debt: 9000, lastNet: -5, cash: -5 }), 'CCC', 'never worse than the last');
  for (let i = 1; i < RATINGS.length; i++) assert.ok(spreadOf(RATINGS[i]) > spreadOf(RATINGS[i - 1]), 'wider with every notch');
  assert.ok(spreadOf('nonsense') === spreadOf('CCC'));
  assert.equal(recovery(1000, 100), 0.9, 'never all'); assert.equal(recovery(10, 1e6), 0.05, 'never nothing'); assert.equal(recovery(1000, 1000), 0.4);
  assert.equal(issueFace(1_000_000), 100000); assert.equal(issueFace(20_000_000), 1_000_000); assert.equal(issueFace(10), 100000);
});

test('issues: one for each priced listed company, once, at the policy rate plus its term premium and credit spread — and nothing before the exchange', () => {
  const old = newGame(3101);
  assert.equal(old.corp.state.credit, undefined);
  old.corp.credit.dailyTick();
  assert.equal(old.corp.state.credit, undefined, 'no exchange, no issues');
  const g = open(3101);
  const offers = g.corp.credit.offers();
  const priced = Object.keys(g.corp.exchange.peek().listings).length;
  assert.equal(offers.length, priced);
  for (const o of offers) {
    const c = g.corp.credit.record(o.ticker);
    assert.equal(o.rating, rate(c));
    assert.equal(o.coupon, Math.round((yieldFor(0.05, 3) + spreadOf(o.rating)) / 0.0025) * 0.0025);
    assert.ok(Math.abs(o.price - 100) < 3, `par at issue: ${o.price}`);
    assert.equal(o.end, o.issued + 3 * 360);
  }
  day(g, 2); day(g, 3);
  assert.equal(Object.keys(JSON.parse(JSON.stringify(g.corp.state.credit.issues))).length, priced, 'once each');
  assert.deepEqual(offers.map((o) => o.spreadRank), [...offers.map((o) => o.spreadRank)].sort((a, b) => a - b), 'best rating first');
});

test('buying: par, a twentieth of an issue at most, refusals change nothing; coupons once a month; the face at the end', () => {
  const g = open(3102); g.player.money = 5_000_000;
  const o = first(g);
  const keep = JSON.stringify([g.player.money, g.corp.state.credit.lots]);
  assert.match(g.corp.credit.buy('NOPE', 1000).text, /no longer on offer/);
  assert.match(g.corp.credit.buy(o.id, 500).text, /at least 1,000/);
  assert.match(g.corp.credit.buy(o.id, 1050).text, /in hundreds/);
  assert.match(g.corp.credit.buy(o.id, o.room + 100).text, /twentieth of an issue/);
  g.player.money = 5; assert.match(g.corp.credit.buy(o.id, 1000).text, /cannot afford/);
  g.player.money = 5_000_000;
  assert.equal(JSON.stringify([g.player.money === 5_000_000 ? 5_000_000 : 0, g.corp.state.credit.lots]), keep.replace(/^\[\d+/, '[5000000'));
  const face = 20000;
  const m0 = g.player.money;
  const b = g.corp.credit.buy(o.id, face);
  assert.ok(b.ok, b.text);
  const cost = m0 - g.player.money;
  assert.ok(Math.abs(cost - face) < face * 0.03, 'about par');
  const lot = g.corp.credit.lots()[0];
  const per = Math.round((face * o.coupon) / 12);
  const m1 = g.player.money;
  day(g, 31); assert.equal(g.player.money, m1, 'the first coupon is thirty days after the issue');
  const due = lot.due;
  g.clock.total = (due - 1) * 1440 + 8 * 60; g.corp.credit.dailyTick();
  assert.equal(g.player.money - m1, per); g.corp.credit.dailyTick();
  assert.equal(g.player.money - m1, per, 'once');
  assert.equal(lot.coupons, 1);
  // to the end: thirty-six coupons and the face, no more
  g.clock.total = (lot.end - 1) * 1440 + 8 * 60; g.corp.credit.dailyTick();
  assert.equal(g.corp.credit.lots().length, 0, 'matured');
  assert.equal(g.player.money - m1, per * 36 + face, 'thirty-six coupons and the face, no more');
});

test('the rating follows the books and the bond follows the rating: a company that borrows more is cheaper to lend to', () => {
  const g = open(3103); g.player.money = 5_000_000;
  const o = first(g);
  assert.ok(g.corp.credit.buy(o.id, 20000).ok);
  const c = g.corp.credit.record(o.ticker);
  const lot = () => g.corp.credit.portfolio().rows[0];
  const v0 = lot().value; const r0 = lot().rating;
  c.debt = c.plantValue * 3; // far more than it owns
  day(g, 3);
  const r1 = lot().rating; const v1 = lot().value;
  assert.ok(RATINGS.indexOf(r1) > RATINGS.indexOf(r0) || r0 === 'CCC', `${r0} → ${r1}`);
  assert.ok(v1 < v0, `value falls: ${v0} → ${v1}`);
  assert.equal(lot().sale, Math.round(v1 * (1 - CREDIT.spread)));
  const m = g.player.money; assert.ok(g.corp.credit.sell(lot().id).ok); assert.equal(g.player.money - m, Math.round(v1 * (1 - CREDIT.spread)));
});

test('default: it happens only when the world closes the issuer — once, at the recovery rate; a takeover repays at par; neither pays again', () => {
  const a = open(3104); a.player.money = 5_000_000;
  const o = first(a);
  assert.ok(a.corp.credit.buy(o.id, 20000).ok);
  const c = a.corp.credit.record(o.ticker);
  day(a, 3);
  const plant = c.plantValue; const debt = c.debt;
  const expect = Math.round(20000 * recovery(plant, debt));
  const m = a.player.money;
  c.status = 'closed'; c.debt = 0; c.plantValue = 0; c.cash = 0;
  day(a, 4);
  assert.equal(a.player.money - m, expect);
  assert.equal(a.corp.state.credit.issues[o.id].status, 'defaulted');
  assert.equal(a.corp.credit.lots().length, 0);
  day(a, 5); day(a, 40);
  assert.equal(a.player.money - m, expect, 'paid once');
  assert.ok(!a.corp.credit.offers().some((x) => x.id === o.id), 'no longer on offer');
  assert.match(a.corp.credit.peek().log.at(-1).text, /defaulted and you recovered/);
  const b = open(3105); b.player.money = 5_000_000;
  const o2 = first(b); assert.ok(b.corp.credit.buy(o2.id, 20000).ok);
  const c2 = b.corp.credit.record(o2.ticker); const m2 = b.player.money;
  c2.status = 'merged';
  day(b, 3);
  assert.equal(b.player.money - m2, 20000, 'repaid at par');
  assert.equal(b.corp.state.credit.issues[o2.id].status, 'repaid');
});

test('a repaid issue is replaced a month later; saves keep issues and lots and pay nothing twice', () => {
  const g = open(3106); g.player.money = 5_000_000;
  const o = first(g);
  const s = g.corp.state.credit; const i = s.issues[o.id];
  i.end = g.clock.day; i.status = 'open';
  day(g, 3);
  assert.equal(s.issues[o.id].status, 'matured');
  day(g, 3 + CREDIT.reissueDays - 1); assert.equal(s.issues[o.id].status, 'matured', 'not yet');
  day(g, 3 + CREDIT.reissueDays + 1); assert.equal(s.issues[o.id].status, 'open'); assert.ok(s.issues[o.id].issued > i.issued);
  assert.ok(g.corp.credit.buy(o.id, 10000).ok);
  const snap = JSON.parse(JSON.stringify(g.corp.state.credit));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.credit)), snap);
  const money = g2.player.money; g2.clock.total = g.clock.total; g2.corp.credit.dailyTick();
  assert.equal(g2.player.money, money);
});
