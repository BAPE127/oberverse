// Intercompany loans and distributions (v0.61.0 part B): money lent is not revenue, repayment and
// interest follow the terms once a month, a distribution comes only from profit that is in cash above
// the reserve, and every monthly job runs once however the game is saved, loaded or slept through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { monthTotals, icTotals } from '../src/corp/ledger.js';

const atDay = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);
/** A group with the farm as its subsidiary and `cash` in the parent. */
const farmGroup = (seed, { parentCash = 1_000_000, opening = 0 } = {}) => {
  const g = newGame(seed); g.player.money = 30_000_000;
  assert.ok(g.farm.buy(Object.keys(g.farm.def.plots)[0]).ok);
  g.corp.group.form();
  g.corp.contribute('parent', parentCash);
  assert.ok(g.corp.group.join('farming', { opening }).ok);
  return g;
};

test('a loan moves money, is not revenue, and is owed back', () => {
  const g = farmGroup(1301);
  const t0 = total(g);
  const r = g.corp.group.lend('farming', 240_000, { termMonths: 12, rate: 0.06 });
  assert.ok(r.ok, r.text);
  const loan = r.loan;
  assert.equal(loan.outstanding, 240_000); assert.equal(loan.instalment, 20_000);
  assert.equal(total(g), t0);
  assert.equal(g.corp.account('farming').cash, 240_000);
  assert.equal(monthTotals(g.corp.account('farming'), 0).revenue, 0, 'borrowing is not income');
  assert.equal(g.corp.externalSales().agriculture, 0);
  const reg = g.corp.registry().find((x) => x.playerId === 'farming');
  assert.equal(g.corp.metricsOf(reg, 'current').net, 0, 'nor profit');
  assert.equal(g.corp.state.transfers.at(-1).kind, 'loan');
  assert.equal(g.corp.state.transfers.at(-1).loan, loan.id);
});

test('a loan is refused for what is not allowed', () => {
  const g = farmGroup(1302, { parentCash: 50_000 });
  assert.ok(!g.corp.group.lend('farming', 60_000).ok, 'more than the parent holds');
  assert.ok(!g.corp.group.lend('arms', 10).ok, 'not a subsidiary');
  assert.ok(!g.corp.group.lend('farming', 1000, { termMonths: 0 }).ok);
  assert.ok(!g.corp.group.lend('farming', 1000, { termMonths: 100 }).ok);
  assert.ok(!g.corp.group.lend('farming', 1000, { rate: 0.9 }).ok);
  assert.ok(!g.corp.group.lend('farming', -5).ok);
  assert.equal(g.corp.state.loans.length, 0);
});

test('each month the borrower pays the interest and an instalment; the parent earns the interest; both sides\' books agree', () => {
  const g = farmGroup(1303);
  const loan = g.corp.group.lend('farming', 240_000, { termMonths: 12, rate: 0.06 }).loan;
  const t0 = total(g);
  atDay(g, 31); g.corp.dailyTick(); // month 1 opens: month 0 closes
  assert.equal(loan.outstanding, 240_000, 'interest and instalments begin the month after the loan');
  atDay(g, 61); g.corp.dailyTick(); // month 1 closes
  assert.equal(loan.outstanding, 220_000, 'one equal instalment of principal');
  assert.equal(loan.interestPaid, 1200, '240,000 at 6% for a month');
  assert.equal(loan.paid, 20_000);
  assert.equal(total(g), t0, 'interest and repayment move money, they do not make it');
  const pa = g.corp.account('parent');
  assert.equal(icTotals(pa, 2).interestIn, 1200, 'income to the parent, in the month it was paid');
  assert.equal(icTotals(g.corp.account('farming'), 2).icOut, 1200, 'a cost to the farm');
  assert.equal(g.corp.state.transfers.filter((t) => t.kind === 'interest').length, 1);
  assert.ok(g.corp.reconciles());
  atDay(g, 61); g.corp.dailyTick();
  assert.equal(loan.outstanding, 220_000, 'the same month again changes nothing');
});

test('a loan runs its term and is cleared', () => {
  const g = farmGroup(1304);
  const loan = g.corp.group.lend('farming', 30_000, { termMonths: 3, rate: 0.05 }).loan;
  assert.ok(g.corp.group.capitalise('farming', 5_000).ok, 'a farm with some money of its own, for the interest');
  for (let m = 1; m <= 6; m++) { atDay(g, 1 + m * 30); g.corp.dailyTick(); }
  assert.equal(loan.status, 'repaid');
  assert.equal(loan.outstanding, 0);
  assert.equal(loan.paid, 30_000);
  assert.ok(loan.interestPaid > 0 && loan.interestPaid < 400);
  assert.equal(g.corp.group.loansOf('farming').length, 0);
  assert.ok(g.corp.group.spinOut('farming').ok, 'it can leave now');
});

test('a borrower with debts to others pays the others first, and the missed payment is recorded', () => {
  const g = farmGroup(1305);
  const loan = g.corp.group.lend('farming', 60_000, { termMonths: 6, rate: 0.06 }).loan;
  g.corp.account('farming').arrears = 500;
  atDay(g, 31); g.corp.dailyTick();
  atDay(g, 61); g.corp.dailyTick();
  assert.equal(loan.outstanding, 60_000);
  assert.equal(loan.missed, 1);
  assert.ok(g.corp.group.alerts().some((a) => a.kind === 'loan' && a.id === 'farming'));
  assert.ok(!g.corp.group.repayLoan(loan.id, 100).ok, 'while it owes others it cannot repay');
});

test('an early repayment cannot exceed what is owed', () => {
  const g = farmGroup(1306);
  const loan = g.corp.group.lend('farming', 50_000, { termMonths: 10 }).loan;
  assert.ok(!g.corp.group.repayLoan(loan.id, 50_001).ok);
  assert.ok(g.corp.group.repayLoan(loan.id, 20_000).ok);
  assert.equal(loan.outstanding, 30_000);
  assert.ok(g.corp.group.repayLoan(loan.id, 30_000).ok);
  assert.equal(loan.status, 'repaid');
  assert.ok(!g.corp.group.repayLoan(loan.id, 1).ok, 'a cleared loan');
  assert.ok(!g.corp.group.spinOut('arms').ok);
});

test('a subsidiary with an open loan cannot leave', () => {
  const g = farmGroup(1307);
  g.corp.group.lend('farming', 10_000);
  assert.ok(!g.corp.group.spinOut('farming').ok);
});

/** A farm that sold 100,000, bought 8,000 of feed and 20,000 of animals in month 0, and holds 172,000 of cash. */
const profitableFarm = (seed, opening = 100_000) => {
  const g = farmGroup(seed, { opening });
  atDay(g, 5);
  g.corp.receive('farming', 100_000, { cat: 'crops' });
  g.corp.pay('farming', 8_000, { cat: 'feed' });
  g.corp.pay('farming', 20_000, { cat: 'animals' });
  return g;
};

test('a distribution is a share of the month\'s profit, from cash above the reserve — once', () => {
  const g = profitableFarm(1308);
  const plan = g.corp.group.distributionPlan('farming', 0);
  assert.equal(plan.net, 92_000, 'sales less running costs (the animals are capital)');
  assert.equal(plan.cash, 172_000);
  assert.equal(plan.send, 46_000, 'half of the profit, by the default policy');
  const parent = g.corp.account('parent').cash;
  const t0 = total(g);
  atDay(g, 31); g.corp.dailyTick();
  assert.equal(g.corp.account('parent').cash, parent + 46_000);
  assert.equal(g.corp.account('farming').cash, 126_000);
  assert.equal(total(g), t0, 'moved, not made');
  assert.equal(g.corp.state.transfers.at(-1).kind, 'distribution');
  assert.equal(icTotals(g.corp.account('parent'), 1).dividendIn, 46_000, 'the parent\'s income');
  assert.equal(monthTotals(g.corp.account('farming'), 1).opex, 0, 'and not a cost to the farm');
  atDay(g, 31); g.corp.dailyTick(); atDay(g, 40); g.corp.dailyTick();
  assert.equal(g.corp.account('parent').cash, parent + 46_000, 'once a month');
  assert.equal(g.corp.state.group.dist.farming.sent, 46_000);
});

test('a distribution survives a save in the middle: it runs once, whenever the game was saved', () => {
  const sm = new SaveManager(new MemoryStorage());
  const make = () => profitableFarm(1309);
  // saved BEFORE the month turns, loaded, and then the month turns
  const a = make();
  assert.ok(sm.save('slot1', a).ok);
  const a2 = new Game(CONTENT, { seed: 2 });
  assert.ok(sm.load('slot1', a2).ok);
  const p0 = a2.corp.account('parent').cash;
  atDay(a2, 31); a2.corp.dailyTick(); atDay(a2, 31); a2.corp.dailyTick();
  assert.equal(a2.corp.account('parent').cash, p0 + 46_000);
  // saved AFTER it ran, loaded, and the same day ticks again
  assert.ok(sm.save('slot2', a2).ok);
  const a3 = new Game(CONTENT, { seed: 3 });
  assert.ok(sm.load('slot2', a3).ok);
  atDay(a3, 31); a3.corp.dailyTick();
  assert.equal(a3.corp.account('parent').cash, p0 + 46_000, 'not twice');
  assert.equal(a3.corp.state.transfers.filter((t) => t.kind === 'distribution').length, 1);
  assert.ok(a3.corp.reconciles());
});

test('the group\'s monthly jobs are not held up by the wider world being absent', () => {
  const g = profitableFarm(1310);
  delete g.corp.state.generated; delete g.corp.state.gen;
  atDay(g, 31); g.corp.dailyTick();
  assert.equal(g.corp.state.group.dist.farming.sent, 46_000);
});

test('profit that is not in cash is not distributed, and the reason is written down', () => {
  const g = farmGroup(1311, { opening: 0 });
  atDay(g, 5);
  g.corp.receive('farming', 60_000, { cat: 'crops' });
  g.corp.pay('farming', 58_000, { cat: 'animals' }); // the money went into stock
  atDay(g, 31); g.corp.dailyTick();
  const d = g.corp.state.group.dist.farming;
  assert.equal(d.sent, 0);
  assert.match(d.why, /not in cash/);
  assert.equal(g.corp.account('farming').cash, 2_000);
});

test('a subsidiary that owes sends nothing up', () => {
  const g = profitableFarm(1312);
  g.corp.account('farming').arrears = 700;
  const plan = g.corp.group.distributionPlan('farming', 0);
  assert.equal(plan.send, 0);
  assert.match(plan.why, /owes/);
  assert.ok(!g.corp.group.distributeNow('farming', 100, { override: true }).ok, 'not even with an override');
});

test('loans are repaid first when the policy says so, and the reserve grows by what the loan will cost next month', () => {
  const g = profitableFarm(1313, 0);
  const loan = g.corp.group.lend('farming', 120_000, { termMonths: 12, rate: 0.06 }).loan;
  const plan = g.corp.group.distributionPlan('farming', 0);
  assert.ok(plan.reserve > 5_000 + 10_000, 'the reserve includes the instalment and interest due');
  assert.ok(plan.repay > 0 && plan.repay <= loan.outstanding);
  g.corp.group.setPolicy(null, { debtFirst: false });
  assert.equal(g.corp.group.distributionPlan('farming', 0).repay, 0);
  g.corp.group.setPolicy(null, { debtFirst: true });
  atDay(g, 31); g.corp.dailyTick();
  assert.ok(loan.outstanding < 120_000);
  assert.ok(g.corp.reconciles());
});

test('policies: the group default, a subsidiary\'s own, and nothing out of bounds', () => {
  const g = farmGroup(1314);
  const G = g.corp.group;
  assert.equal(G.policyOf('farming').distributePct, 50);
  assert.ok(G.setPolicy(null, { distributePct: 80, retainPct: 20 }).ok);
  assert.equal(G.policyOf('farming').distributePct, 80);
  assert.ok(G.setPolicy('farming', { distributePct: 10, targetReserve: 40_000 }).ok);
  assert.equal(G.policyOf('farming').distributePct, 10);
  assert.equal(G.policyOf('farming').retainPct, 20, 'what it does not set follows the default it was made from');
  assert.ok(!G.setPolicy('arms', {}).ok, 'not a subsidiary');
  assert.ok(G.setPolicy('farming', { retainPct: 999, distributePct: 999 }).ok);
  const p = G.policyOf('farming');
  assert.ok(p.retainPct <= 100 && p.retainPct + p.distributePct <= 100);
  G.clearPolicy('farming');
  assert.equal(G.policyOf('farming').distributePct, 80);
  const send = (pol) => { const x = profitableFarm(1315); x.corp.group.setPolicy('farming', pol); return x.corp.group.distributionPlan('farming', 0).send; };
  assert.equal(send({ distributePct: 100, retainPct: 0 }), 92_000);
  assert.equal(send({ distributePct: 0, retainPct: 100 }), 0);
  assert.ok(send({ targetReserve: 160_000, minLiquidity: 100_000 }) <= 12_000, 'a high reserve leaves little to send');
});

test('protected liquidity holds unless the owner overrides, and the override is recorded and has consequences', () => {
  const g = profitableFarm(1316);
  g.corp.group.setPolicy('farming', { minLiquidity: 150_000, targetReserve: 150_000 });
  const r = g.corp.group.distributeNow('farming', 100_000);
  assert.ok(!r.ok && r.breach);
  assert.equal(g.corp.account('farming').cash, 172_000);
  const o = g.corp.group.distributeNow('farming', 100_000, { override: true });
  assert.ok(o.ok);
  assert.equal(g.corp.account('farming').cash, 72_000);
  assert.equal(g.corp.state.group.breaches.length, 1);
  assert.ok(g.corp.group.alerts().some((a) => a.kind === 'breach'));
  assert.ok(g.corp.group.alerts().some((a) => a.kind === 'liquidity'), 'and it is below its minimum now');
  assert.equal(g.corp.account('farming').log.at(-1).type, 'breach');
  assert.ok(g.corp.reconciles());
});

test('after a long gap each closed month runs once, in order, and only the last three', () => {
  const g = profitableFarm(1317);
  g.corp.group.lend('farming', 12_000, { termMonths: 12, rate: 0.12 });
  const runs = [];
  const orig = g.corp.group.runMonth.bind(g.corp.group);
  g.corp.group.runMonth = (m) => { runs.push(m); return orig(m); };
  atDay(g, 30 * 10 + 1); g.corp.dailyTick();
  assert.deepEqual(runs, [7, 8, 9], 'month 9 is the last closed; of a long gap only the last three run');
});
