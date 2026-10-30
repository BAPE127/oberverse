// Lending (v0.73.0): personal loans from Lariat State Bank secured on shares and bonds, repaid monthly at a rate fixed at signing;
// a missed instalment is arrears at a penalty rate and nothing else; pledged holdings cannot be sold out from under a loan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { advance, secured, rateFor, quote, dueMonth, limitFactor, standingRate, PENALTY, START_STANDING } from '../src/corp/lending.js';

const dayAt = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.lending.dailyTick(); };
const setRate = (g, r) => { (g.corp.state.bank ||= { v: 1, rate: r, since: 1, decisions: [], lastMeeting: 99 }).rate = r; };
const withBonds = (g, face = 100000) => { g.player.money = 1_000_000; assert.ok(g.corp.bonds.buy(3, face).ok); };

test('pure: advance rates, rate to the quarter-point from policy, utilisation and record, the quote and one month\'s accounts', () => {
  assert.equal(advance({ kind: 'share' }), 0.5); assert.equal(advance({ kind: 'govBond' }), 0.9);
  assert.equal(advance({ kind: 'corpBond', rating: 'AA' }), 0.7); assert.equal(advance({ kind: 'corpBond', rating: 'CCC' }), 0.2); assert.equal(advance({ kind: 'corpBond', rating: '?' }), 0);
  assert.equal(secured([{ kind: 'share', value: 1000 }, { kind: 'govBond', value: 1000 }, { kind: 'share', value: -5 }]), 1400);
  assert.equal(limitFactor(START_STANDING), 1); assert.ok(limitFactor(100) > 1 && limitFactor(0) < 1 && limitFactor(0) >= 0.8 && limitFactor(100) <= 1.2);
  assert.equal(standingRate(START_STANDING), 0); assert.ok(standingRate(0) > 0 && standingRate(100) < 0);
  assert.equal(rateFor({ policy: 0.05, util: 0, standing: START_STANDING }), 0.075);
  assert.equal(rateFor({ policy: 0.05, util: 1, standing: START_STANDING }), 0.095);
  assert.ok(rateFor({ policy: 0.05, util: 0.5, standing: 20 }) > rateFor({ policy: 0.05, util: 0.5, standing: 90 }), 'a better record pays less');
  const odd = rateFor({ policy: 0.0537, util: 0.3, standing: 60 }) / 0.0025;
  assert.ok(Math.abs(odd - Math.round(odd)) < 1e-9, 'always a whole number of quarter-points');
  const q = quote(12000, 12, 0.06);
  assert.deepEqual([q.part, q.first], [1000, 1060]);
  assert.equal(q.interest, Math.round(12000 * 0.06 / 12 * 6.5), 'interest on a falling balance');
  assert.deepEqual(dueMonth({ outstanding: 12000, rate: 0.06, left: 12, arrears: 0 }), { interest: 60, principal: 1000, instalment: 1060, penalty: 0 });
  assert.equal(dueMonth({ outstanding: 900, rate: 0.06, left: 1, arrears: 0 }).principal, 900, 'the last instalment clears it');
  assert.equal(dueMonth({ outstanding: 0, rate: 0.06, left: 1, arrears: 12000 }).penalty, Math.round(12000 * (0.06 + PENALTY) / 12));
});

test('nothing exists before the first loan; refusals change nothing', () => {
  const g = newGame(2301);
  assert.equal(g.corp.state.lending, undefined);
  assert.equal(g.corp.lending.capacity().total, 0);
  const keep = JSON.stringify([g.player.money, g.corp.state.lending]);
  assert.equal(g.corp.lending.borrow(5000, 12).ok, false, 'nothing to borrow against');
  assert.equal(g.corp.lending.borrow(5000, 7).ok, false, 'a term the bank does not offer');
  assert.equal(JSON.stringify([g.player.money, g.corp.state.lending]), keep);
  assert.equal(g.corp.state.lending, undefined, 'a refusal creates no state');
  withBonds(g);
  const c = g.corp.lending.capacity();
  assert.ok(c.total > 80000 && c.total < 91000, `nine-tenths of a par bond, about ${c.total}`);
  assert.equal(g.corp.lending.borrow(c.free + 1000, 12).ok, false, 'more than the holdings secure');
  assert.equal(g.corp.lending.borrow(500, 12).ok, false, 'below the smallest loan');
});

test('a loan: cash arrives, the rate is policy + spread and stays fixed when the policy rate moves, and it is repaid to the obol over its term', () => {
  const g = newGame(2302);
  withBonds(g);
  const before = g.player.money;
  const o = g.corp.lending.offer(40000, 12);
  const r = g.corp.lending.borrow(40000, 12);
  assert.ok(r.ok, r.text);
  const l = g.corp.lending.loans()[0];
  assert.equal(g.player.money, before + 40000);
  assert.equal(l.rate, o.rate); assert.ok(l.rate >= 0.075 && l.rate <= 0.095);
  setRate(g, 0.09);
  assert.equal(g.corp.lending.loans()[0].rate, o.rate, 'fixed for life');
  g.player.money = 500000;
  for (let d = 31; d <= 31 + 30 * 12; d += 30) dayAt(g, d);
  assert.equal(g.corp.lending.loans().length, 0, 'repaid');
  const done = g.corp.lending.loans(true)[0];
  assert.equal(done.status, 'repaid');
  assert.equal(done.paid, 12);
  assert.equal(500000 - g.player.money, 40000 + done.interestPaid, 'principal plus interest, nothing else');
  assert.ok(Math.abs(done.interestPaid - quote(40000, 12, o.rate).interest) <= 12, 'what the quote said');
  assert.ok(g.corp.lending.standing() > START_STANDING, 'on-time payments build the record');
});

test('a missed instalment is arrears at the penalty rate and nothing is seized; the record falls; borrowing is closed until it is cleared', () => {
  const g = newGame(2303);
  withBonds(g, 200000);
  assert.ok(g.corp.lending.borrow(100000, 12).ok);
  const L = g.corp.lending.loans()[0];
  const lots = JSON.stringify(g.corp.bonds.lots());
  g.player.money = 0;
  dayAt(g, 31);
  assert.equal(L.missed, 1);
  assert.ok(L.arrears > 8000, `a month's instalment is arrears: ${L.arrears}`);
  assert.equal(g.player.money, 0, 'no money appears or disappears');
  assert.equal(JSON.stringify(g.corp.bonds.lots()), lots, 'the bonds are untouched');
  assert.ok(g.corp.lending.standing() < START_STANDING - 5);
  const a1 = L.arrears;
  dayAt(g, 61);
  assert.ok(L.arrears > 2 * a1 - 1000 && L.missed === 2, 'arrears grow with the next miss and the penalty');
  assert.equal(g.corp.lending.borrow(5000, 6).ok, false, 'no new loan in arrears');
  assert.equal(g.corp.lending.inArrears(), true);
  g.player.money = 1_000_000;
  const owed = L.arrears;
  assert.ok(g.corp.lending.repay(L.id, owed).ok);
  assert.equal(L.arrears, 0);
  assert.equal(g.corp.lending.inArrears(), false);
  assert.equal(g.corp.lending.borrow(5000, 6).ok, g.corp.lending.capacity().free >= 5000, 'allowed again if it fits the holdings');
});

test('the sale lock: pledged holdings cannot be sold below what secures the debt; repaying releases them', () => {
  const g = newGame(2304);
  withBonds(g, 100000);
  const free = g.corp.lending.capacity().free;
  assert.ok(g.corp.lending.borrow(Math.floor(free * 0.9), 12).ok);
  const id = g.corp.bonds.lots()[0].id;
  const s = g.corp.bonds.sell(id);
  assert.equal(s.ok, false); assert.match(s.text, /Pledged to Lariat State Bank/);
  assert.equal(g.corp.bonds.lots().length, 1);
  // shares count too: with the loan taken against bonds and shares together, selling the shares is refused, and selling a few is allowed
  // only while the rest still secures the debt
  g.oil.state.sharesOwned = 1000;
  const c = g.corp.lending.capacity();
  const sharePart = c.items.find((i) => i.kind === 'share');
  assert.ok(sharePart && sharePart.secures > 0, 'oil shares are on the list');
  const more = g.corp.lending.capacity().free;
  assert.ok(more > 0 && g.corp.lending.borrow(Math.floor(more), 12).ok, 'borrow up to the limit against everything');
  const sh = g.oil.sellShares(1000);
  assert.equal(sh.ok, false); assert.match(sh.text, /Pledged to Lariat State Bank/);
  assert.equal(g.oil.state.sharesOwned, 1000, 'a refused sale changes nothing');
  assert.equal(g.corp.exchange.sell('OBRO', 1000).ok, false, 'the exchange route is locked too');
  g.player.money = 5_000_000;
  for (const L of g.corp.lending.loans()) assert.ok(g.corp.lending.repay(L.id, L.outstanding).ok);
  assert.equal(g.corp.lending.owed(), 0);
  assert.ok(g.corp.bonds.sell(id).ok, 'free once the loans are repaid');
  assert.ok(g.oil.sellShares(1000).ok);
});

test('a worse record means a smaller limit and a higher rate; the save round-trips', () => {
  const g = newGame(2305);
  withBonds(g);
  const hi = g.corp.lending.capacity().total; const rHi = g.corp.lending.offer(20000, 12).rate;
  g.corp.lending.ensure().standing = 10;
  assert.ok(g.corp.lending.capacity().total < hi);
  assert.ok(g.corp.lending.offer(20000, 12).rate > rHi);
  g.corp.lending.ensure().standing = START_STANDING;
  assert.ok(g.corp.lending.borrow(20000, 6).ok);
  const copy = JSON.parse(JSON.stringify(g.corp.state.lending));
  assert.deepEqual(copy, g.corp.state.lending);
  assert.equal(g.corp.lending.owed(), 20000);
});
