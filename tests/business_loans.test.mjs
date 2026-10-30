// Loans to companies (v0.74.0): a funded company borrows on its own books; the money is a loan (never revenue), interest is a
// cost and principal is not, a missed instalment is arrears with nothing seized and freezes its managers' hiring, bids and
// expansion, and guarantees do exactly what they say before they are signed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { monthTotals, balanceOk } from '../src/corp/ledger.js';
import { companyLimit, companyRate, GUARANTEE_DISCOUNT, START_STANDING } from '../src/corp/lending.js';
import { judge } from '../src/corp/management.js';

const dayAt = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.business.dailyTick(); };
const arms = (seed) => {
  const g = newGame(seed);
  g.player.money = 40_000_000;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.ok(g.corp.contribute('arms', 800000).ok);
  return g;
};
/** The company spends everything it holds, through the real payer so its account still reconciles. */
const drain = (g, id) => assert.ok(g.corp.pay(id, g.corp.account(id).cash, { cat: 'wages' }));
const monthIdx = (g) => Math.floor((g.clock.day - 1) / 30);

test('pure: the limit grows with assets and profit and the record; the rate follows policy, use, record and guarantee', () => {
  assert.equal(companyLimit({ assets: 0, monthlyNet: 0, standing: 60 }), 0);
  assert.equal(companyLimit({ assets: 1_000_000, monthlyNet: 0, standing: 60 }), 400000);
  assert.equal(companyLimit({ assets: 1_000_000, monthlyNet: 50000, standing: 60 }), 700000);
  assert.ok(companyLimit({ assets: 1e6, monthlyNet: 0, standing: 100 }) > 400000 && companyLimit({ assets: 1e6, monthlyNet: 0, standing: 0 }) < 400000);
  assert.equal(companyLimit({ assets: -5, monthlyNet: -5, standing: 60 }), 0, 'losses do not make a limit');
  const base = companyRate({ policy: 0.05, util: 0, standing: 60 });
  assert.equal(base, 0.08);
  assert.ok(companyRate({ policy: 0.05, util: 0, standing: 60, guarantee: 'personal' }) < base);
  assert.ok(Math.abs(base - companyRate({ policy: 0.05, util: 0, standing: 60, guarantee: 'personal' }) - GUARANTEE_DISCOUNT.personal) < 1e-9);
  assert.ok(companyRate({ policy: 0.05, util: 1, standing: 60 }) > base);
});

test('only a funded company; nothing exists before a loan; refusals change nothing', () => {
  const g = newGame(2401);
  g.player.money = 5_000_000;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.deepEqual(g.corp.business.eligible(), [], 'unfunded: it spends your wallet, so there is nothing to lend to');
  const keep = JSON.stringify([g.player.money, g.corp.state.lending]);
  assert.equal(g.corp.business.borrow('arms', 20000, 12).ok, false);
  assert.equal(JSON.stringify([g.player.money, g.corp.state.lending]), keep);
  assert.ok(g.corp.contribute('arms', 100000).ok);
  assert.deepEqual(g.corp.business.eligible(), ['arms']);
  const v = g.corp.business.view('arms');
  assert.ok(v.total > 0 && v.free === v.total, `the bank sees its works: limit ${v.total}`);
  assert.equal(g.corp.business.borrow('arms', v.free + 5000, 12).ok, false, 'more than the limit');
  assert.equal(g.corp.business.borrow('arms', 20000, 7).ok, false);
  assert.equal(g.corp.business.borrow('arms', 20000, 12, { guarantee: 'parent' }).ok, false, 'no parent, no parent guarantee');
  assert.equal(g.corp.state.lending, undefined);
});

test('a loan is cash but never revenue; interest is a cost, principal is not; assets net of debt do not move; accounts still reconcile', () => {
  const g = arms(2402);
  const before = g.corp.metricsOf(g.corp.registry().find((r) => r.playerId === 'arms')).netAssets;
  const wallet = g.player.money;
  const cash0 = g.corp.account('arms').cash;
  const r = g.corp.business.borrow('arms', 100000, 12, { purpose: 'Material procurement' });
  assert.ok(r.ok, r.text);
  const l = g.corp.business.loans('arms')[0];
  assert.equal(g.player.money, wallet, 'your wallet is untouched');
  assert.equal(g.corp.account('arms').cash, cash0 + 100000);
  const t = monthTotals(g.corp.account('arms'), monthIdx(g));
  assert.equal(t.revenue, 0, 'borrowing is not revenue'); assert.equal(t.otherIn, 100000);
  assert.equal(g.corp.metricsOf(g.corp.registry().find((r) => r.playerId === 'arms')).netAssets, before, 'what it owns less what it owes is unchanged by a loan');
  assert.equal(g.corp.metricsOf(g.corp.registry().find((r) => r.playerId === 'arms')).debt, 100000);
  for (let d = 31; d <= 31 + 30 * 12; d += 30) dayAt(g, d);
  assert.equal(l.status, 'repaid');
  assert.equal(l.paid, 12);
  const acct = g.corp.account('arms');
  let opexInterest = 0; let principal = 0;
  for (const m of Object.values(acct.months)) { opexInterest += m.out.interest || 0; principal += m.out.loan_principal || 0; }
  assert.equal(opexInterest, l.interestPaid, 'interest posted as a cost');
  assert.equal(principal, 100000, 'principal posted as repayment, not a cost');
  assert.ok(balanceOk(acct), 'the account still reconciles');
  assert.ok(g.corp.business.standing('arms') > START_STANDING);
  assert.equal(g.corp.lending.loans().length, 0, 'none of it is yours');
  assert.equal(g.corp.lending.owed(), 0);
});

test('a missed instalment is arrears with nothing seized; managers freeze; borrowing is closed; only the company repaying clears it', () => {
  const g = arms(2403);
  assert.ok(g.corp.business.borrow('arms', 150000, 12).ok);
  const l = g.corp.business.loans('arms')[0];
  drain(g, 'arms'); // the company has spent it all
  const wallet = g.player.money;
  dayAt(g, 31);
  assert.equal(l.missed, 1);
  assert.ok(l.arrears > 12000);
  assert.ok(g.corp.business.inArrears('arms'));
  assert.ok(g.corp.business.standing('arms') < START_STANDING - 5);
  assert.equal(g.player.money, wallet, 'nothing is taken from you');
  assert.ok(balanceOk(g.corp.account('arms')));
  assert.equal(g.corp.business.borrow('arms', 5000, 6).ok, false, 'no new loan while behind');
  // the judgement
  const base = { kind: 'hire', atWork: true, allowed: true, canHire: true, canContract: true, canExpand: true, funded: true, cost: 100, spendLimit: 1000, approvalAbove: 1000, cap: 1000, spent: 0, affordable: true, hiresLeft: 2 };
  assert.equal(judge(base).verdict, 'execute');
  for (const kind of ['hire', 'bid', 'expand']) { const r = judge({ ...base, kind, frozen: true }); assert.equal(r.verdict, 'refuse'); assert.match(r.reason, /behind on a bank loan/); }
  assert.equal(judge({ ...base, kind: 'order', frozen: true }).verdict, 'execute', 'buying materials to keep running is not frozen');
  // cash arrives: nothing is taken from it — the company clears the arrears by repaying, and only then are its managers free again
  g.corp.receive('arms', 50000, { cat: 'sales' });
  const owed = l.arrears;
  const cash = g.corp.account('arms').cash;
  dayAt(g, 32);
  assert.ok(l.arrears >= owed, 'they do not shrink on their own');
  assert.equal(g.corp.account('arms').cash, cash, 'no cash is swept from the account');
  assert.ok(g.corp.business.inArrears('arms'), 'still behind, still frozen');
  const r = g.corp.business.repay(l.id, l.arrears);
  assert.ok(r.ok, r.text);
  assert.equal(g.corp.business.inArrears('arms'), false, 'repaid: the managers are free again');
  assert.ok(balanceOk(g.corp.account('arms')));
});

test('a personal guarantee costs your record; stated before signing', () => {
  const g = arms(2404);
  const me = g.corp.lending.standing();
  const plain = g.corp.business.offer('arms', 100000, 12, 'none');
  const gu = g.corp.business.offer('arms', 100000, 12, 'personal');
  assert.ok(gu.rate < plain.rate);
  assert.match(g.corp.business.guaranteeText('arms', 'personal'), /your own borrowing record falls/);
  assert.ok(g.corp.business.borrow('arms', 100000, 12, { guarantee: 'personal' }).ok);
  drain(g, 'arms');
  dayAt(g, 31);
  assert.ok(g.corp.lending.standing() < me, 'you guaranteed it');
  assert.equal(g.corp.lending.inArrears(), false, 'but you owe the bank nothing yourself');
});

test('a parent guarantee: the parent pays what it can and the subsidiary then owes it as an intercompany loan', () => {
  const g = arms(2405);
  assert.ok(g.corp.group.form().ok, 'a parent company');
  assert.ok(g.corp.group.join('arms').ok, 'arms joins the parent');
  assert.ok(g.corp.group.isSub('arms'));
  assert.ok(g.corp.contribute('parent', 500000).ok, 'the parent holds cash of its own');
  assert.deepEqual(g.corp.business.guarantees('arms'), ['none', 'personal', 'parent']);
  assert.ok(g.corp.business.borrow('arms', 100000, 12, { guarantee: 'parent' }).ok);
  const parentBefore = g.corp.account('parent').cash;
  drain(g, 'arms');
  dayAt(g, 31);
  const l = g.corp.business.loans('arms')[0];
  assert.ok(l.called > 8000, `the parent was called: ${l.called}`);
  assert.equal(g.corp.account('parent').cash, parentBefore - l.called);
  assert.equal(g.corp.group.payableOf('arms'), l.called, 'the subsidiary now owes the parent');
  assert.ok(balanceOk(g.corp.account('parent')) && balanceOk(g.corp.account('arms')));
  assert.equal(g.corp.group.consolidated('month').debt.bank, g.corp.business.totalOwed());
});
