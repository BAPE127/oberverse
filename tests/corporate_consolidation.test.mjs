// Consolidation (v0.61.0 part C): the group's statements, with what is inside the group taken out —
// and no way to make a profit by moving money about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { icStep } from '../src/corp/consolidate.js';

const atDay = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);
const tick = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total += 1; g.aero.minuteTick(); g.logistics.minuteTick(); g.arms.minuteTick(); } };

test('icStep: a charge with nothing used stays deferred; once it is all used the group has deferred nothing in all', () => {
  // the day both are in the group: what is held is from before
  let s = icStep(null, { R: 0, U: 1000, active: true });
  assert.deepEqual(s.state, { active: true, U: 1000, P: 1000, G: 0 });
  assert.equal(s.R + s.E, 0);
  // a charge of 300; nothing used
  s = icStep(s.state, { R: 300, U: 1300, active: true });
  assert.equal(s.R, 300); assert.equal(s.E, 0); assert.equal(s.state.G, 300, 'deferred in full: not group profit');
  const deferred1 = s.R - s.E;
  // the old stock is used first (oldest first): the new charge is still deferred
  s = icStep(s.state, { R: 0, U: 700, active: true });
  assert.equal(s.E, 0); assert.equal(s.state.P, 400, 'the 600 used came out of the 1000 held before');
  assert.equal(s.state.G, 300);
  // everything used up
  const last = icStep(s.state, { R: 0, U: 0, active: true });
  assert.equal(last.E, 300, 'now expensed by aerospace: released');
  assert.equal(last.state.G, 0); assert.equal(last.state.P, 0);
  assert.equal(deferred1 - last.E, 0, 'over the whole run, charges less releases is nothing');
  // not in the group (or one side left): nothing is eliminated and the pool resets
  const out = icStep(last.state, { R: 50, U: 80, active: false });
  assert.equal(out.R, 0); assert.equal(out.E, 0); assert.deepEqual(out.state, { active: false, U: 80, P: 80, G: 0 });
  assert.equal(icStep(out.state, { R: 10, U: 90, active: true }).R, 0, 'activation month: baseline only');
});

/** Shipping and aerospace as subsidiaries with money, the parent funded; the freight charge between them is real. */
function sisters(seed) {
  const g = newGame(seed);
  g.player.money = 30_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  co.autoProcure = false;
  for (const c of g.aero.contractsOf(co, 'active')) g.aero.cancelContract('roost', c.id);
  g.corp.group.form();
  g.corp.contribute('parent', 6_000_000);
  assert.ok(g.corp.group.join('shipping', { opening: 1_500_000 }).ok);
  assert.ok(g.corp.group.join('aerospace', { opening: 3_000_000 }).ok);
  return { g, A: g.aero, L: g.logistics, co };
}

test('a freight charge between the two sister subsidiaries is eliminated, and the part aerospace has not used is not group profit', () => {
  const { g, A, co } = sisters(1401);
  atDay(g, 31); g.corp.dailyTick(); // the first month closes: both are in the group from here
  const ic0 = g.corp.state.group.ic.state;
  assert.equal(ic0.active, true);
  const r = A.order(co, 'sup_sund_alloys', 'alu', 12);
  assert.ok(r.ok, r.text);
  const job = A.job(r.po.job);
  for (let i = 0; i < 6 * 1440 && job.status !== 'delivered'; i += 30) tick(g, 30);
  assert.equal(job.status, 'delivered');
  const charge = job.charge;
  assert.ok(charge > 0, 'there was an internal charge');
  assert.equal(co.inv.alu.qty, 12);
  assert.equal(g.corp.group.unrealisedFreight(), charge, 'it sits in aerospace\'s stores');
  const month = Math.floor((g.clock.day - 1) / 30);
  const S = g.corp.group.consolidated('current');
  assert.equal(S.eliminations.internalSales, charge, 'shipping\'s charge to its sister is eliminated');
  assert.equal(S.eliminations.internalCost, 0, 'and aerospace has expensed none of it');
  assert.equal(S.eliminations.deferred, charge);
  const ship = S.separate.find((x) => x.id === 'shipping');
  assert.equal(ship.icIn, charge, 'in shipping\'s own statement it is income');
  assert.equal(ship.revenue, 0, 'but not trading revenue');
  assert.equal(S.consolidated.revenue, S.separate.reduce((a, x) => a + x.revenue, 0));
  // net: the companies' own results, less dividends, less what is still deferred
  assert.equal(Math.round(S.reconciliation.equals), Math.round(S.consolidated.net));
  void month;
  // a charge with nothing consumed leaves consolidated net as if it had not been made: net = trading results
  const trading = S.separate.reduce((a, x) => a + x.revenue - x.opex, 0);
  assert.equal(Math.round(S.consolidated.net), Math.round(trading), 'no profit from billing yourself');
});

test('when aerospace uses the materials the deferred charge is released, and over the run nothing was made', () => {
  const { g, A, co } = sisters(1402);
  atDay(g, 31); g.corp.dailyTick();
  const r = A.order(co, 'sup_sund_alloys', 'alu', 12);
  const job = A.job(r.po.job);
  for (let i = 0; i < 6 * 1440 && job.status !== 'delivered'; i += 30) tick(g, 30);
  const charge = job.charge;
  atDay(g, 61); g.corp.dailyTick(); // the month with the charge closes
  const gs = g.corp.state.group.ic;
  assert.equal(gs.state.G, charge, 'deferred');
  // aerospace uses every bit of it: a unit takes the stores, and is delivered
  const u = { id: 'x1', company: co.id, finished: false, cost: { materials: 0, freight: 0, freightInt: 0 }, reserved: { alu: 12 } };
  A.state.units.x1 = u;
  co.inv.alu.reserved = 12;
  A.consume(co, u, { alu: 12 });
  assert.equal(g.corp.group.unrealisedFreight(), Math.round(u.cost.freightInt), 'still held: in an unfinished unit');
  u.finished = true; // delivered
  assert.equal(g.corp.group.unrealisedFreight(), 0);
  atDay(g, 91); g.corp.dailyTick();
  assert.equal(gs.state.G, 0);
  const cumR = Object.values(gs.months).reduce((a, x) => a + x.R, 0);
  const cumE = Object.values(gs.months).reduce((a, x) => a + x.E, 0);
  assert.equal(cumR, charge);
  assert.equal(cumE, charge, 'every charge eliminated was released: the group made nothing on it');
});

test('moving money inside the group never changes the group\'s result: capital, loans, repayments, interest, dividends', () => {
  const { g } = sisters(1403);
  const before = g.corp.group.consolidated('current');
  const t0 = total(g);
  assert.ok(g.corp.group.capitalise('shipping', 100_000).ok);
  const loan = g.corp.group.lend('aerospace', 400_000, { termMonths: 6, rate: 0.08 }).loan;
  assert.ok(g.corp.group.repayLoan(loan.id, 50_000).ok);
  assert.ok(g.corp.group.payInterest(loan, 2_000) > 0);
  assert.ok(g.corp.group.distributeNow('shipping', 300_000).ok);
  assert.ok(g.corp.group.returnCapital('shipping', 20_000).ok);
  const after = g.corp.group.consolidated('current');
  assert.equal(total(g), t0, 'no obol made');
  assert.equal(Math.round(after.consolidated.net), Math.round(before.consolidated.net), 'net unchanged');
  assert.equal(after.consolidated.revenue, before.consolidated.revenue);
  assert.equal(after.consolidated.costs, before.consolidated.costs);
  assert.equal(after.eliminations.dividends, 300_000, 'the parent\'s dividend income is shown and eliminated');
  assert.equal(after.eliminations.interest, 2_000);
  const ship = after.separate.find((x) => x.id === 'shipping');
  assert.equal(ship.net, 0, 'shipping\'s own result did not move: a dividend is not a cost');
  const par = after.separate.find((x) => x.id === 'parent');
  assert.equal(par.net, 302_000, 'the parent\'s own statement shows what it was sent');
  const aero = after.separate.find((x) => x.id === 'aerospace');
  assert.equal(aero.icOut, 2_000);
  assert.equal(Math.round(after.reconciliation.equals), Math.round(after.consolidated.net));
});

test('intercompany balances show both ends and cancel', () => {
  const { g } = sisters(1404);
  g.corp.group.lend('aerospace', 300_000);
  g.corp.group.lend('shipping', 100_000);
  const S = g.corp.group.consolidated('current');
  assert.equal(S.intercompany.receivable, 400_000);
  assert.equal(S.intercompany.payable, 400_000);
  assert.equal(S.intercompany.afterElimination, 0);
  assert.equal(S.debt.external, 0, 'no outside debt: loans inside the group are not the group\'s debt');
});

test('cash is shown for each company, in all, and what could be distributed — and they are not the same thing', () => {
  const { g } = sisters(1405);
  const S = g.corp.group.consolidated('current');
  assert.equal(S.cash.parent, 1_500_000, 'the parent\'s own, spendable');
  assert.equal(S.cash.subs.shipping, 1_500_000);
  assert.equal(S.cash.consolidated, S.cash.parent + S.cash.subs.shipping + S.cash.subs.aerospace);
  assert.ok(S.cash.availableToDistribute <= S.cash.consolidated);
  assert.notEqual(S.cash.parent, S.cash.consolidated, 'the group\'s cash is not the parent\'s to spend');
});

test('group value counts nothing twice and a valuation is not money', () => {
  const g = newGame(1406);
  g.player.money = 30_000_000;
  g.farm.buy(Object.keys(g.farm.def.plots)[0]);
  g.farm.buy(Object.keys(g.farm.def.plots)[1]);
  g.corp.group.form();
  g.corp.contribute('parent', 2_000_000);
  g.corp.group.join('farming', { opening: 100_000 });
  const v0 = g.corp.group.groupValue();
  const t0 = total(g);
  for (let i = 0; i < 5; i++) g.corp.group.groupValue();
  assert.equal(total(g), t0, 'reading a value moves nothing');
  g.corp.group.capitalise('farming', 400_000);
  assert.equal(g.corp.group.groupValue().group, v0.group, 'cash moved to a subsidiary: the group is worth the same');
  g.corp.group.lend('farming', 300_000);
  const v2 = g.corp.group.groupValue();
  assert.equal(v2.group, v0.group, 'a loan inside the group: the parent\'s claim and the subsidiary\'s debt cancel');
  assert.equal(v2.loansToSubsidiaries, 300_000);
  assert.equal(v2.parentCash, 2_000_000 - 100_000 - 400_000 - 300_000);
  assert.equal(v2.spendableCash, v2.parentCash, 'spendable cash is the parent\'s alone');
  const farmValue = v2.subsidiaries[0].value;
  assert.ok(farmValue > 0 && v2.stakes === farmValue);
  // paying the owner a dividend takes value out of the group by exactly that much
  g.corp.distribute('parent', 100_000);
  assert.equal(g.corp.group.groupValue().group, v0.group - 100_000);
});

test('who contributes what, and which carry risk', () => {
  const { g } = sisters(1407);
  g.corp.account('aerospace').arrears = 900;
  const rows = g.corp.group.contribution();
  assert.equal(rows.length, 2);
  assert.ok(Math.abs(rows.reduce((a, x) => a + x.valueShare, 0) - 1) < 1e-9);
  assert.ok(rows.find((x) => x.id === 'aerospace').risks.includes('owes others'));
  assert.ok(rows.every((x) => x.name && Number.isFinite(x.cashSentUp)));
});

test('the parent\'s own ledger: what came up, what went down, what the owner did', () => {
  const { g } = sisters(1408);
  g.corp.group.lend('shipping', 200_000);
  g.corp.group.distributeNow('aerospace', 100_000);
  g.corp.group.capitalise('shipping', 50_000);
  const L = g.corp.group.parentLedger('current');
  assert.equal(L.received.distributions, 100_000);
  assert.equal(L.paid.loans, 200_000);
  assert.equal(L.paid.capital, 50_000 + 1_500_000 + 3_000_000, 'including the opening capital');
  assert.equal(L.owner.contributed, 6_000_000);
  assert.equal(L.cash, Math.round(g.corp.account('parent').cash));
  assert.equal(L.managementExpenses, 0);
});

test('a group of all four: run for two months on the real systems, every ledger honest, nothing made, and a save in the middle changes nothing', () => {
  const g = newGame(1409);
  g.player.money = 40_000_000;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.farm.buy(Object.keys(g.farm.def.plots)[0]).ok);
  g.arms.hire(0, 'aw1');
  g.corp.group.form();
  g.corp.contribute('parent', 6_000_000);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.join(id, { opening: Math.max(g.corp.group.joinPreview(id).suggested * 2, 50_000) }).ok);
  assert.deepEqual(g.corp.group.subs().sort(), ['aerospace', 'arms', 'farming', 'shipping']);
  const wallet = g.player.money;
  const t0 = total(g);
  const cash0 = Object.fromEntries(g.corp.group.members().map((id) => [id, g.corp.account(id).cash]));
  let inflow = 0;
  for (let d = 1; d <= 65; d++) {
    for (let i = 0; i < 1440; i++) { g.clock.total += 1; g.minuteTick(); }
    if (d === 10) { g.inventory.add('item_assault_rifle', 3); for (let k = 0; k < 3; k++) { const s = g.sell('shop_rook', 'item_assault_rifle'); if (s.ok) inflow += 1; } }
    if (d === 20) { const crop = Object.values(g.farm.def.crops)[0].crop; g.inventory.add(crop, 6); g.farm.sellAtCoop(crop, 6); }
    if (d === 22) assert.ok(g.corp.group.capitalise('farming', 10_000).ok, 'the parent allocates more capital, on the record');
    if (d === 40) assert.ok(g.corp.group.lend('shipping', 100_000, { termMonths: 6 }).ok);
  }
  assert.ok(inflow >= 1, 'arms products were really sold to Lucas');
  assert.equal(g.player.money, wallet, 'the owner\'s wallet paid for nothing and received nothing');
  assert.ok(g.corp.reconciles(), 'every account reconciles with its own history');
  // arms: payroll came out of the arms account
  assert.ok(g.corp.account('arms').months[0] || g.corp.account('arms').months[1]);
  assert.equal(g.arms.state.staff[0]?.unpaid ?? 0, 0);
  assert.ok(g.corp.account('arms').cash < cash0.arms + 1_000_000);
  // what the parent received is what the transfers say, and only that
  const up = g.corp.state.transfers.filter((t) => t.to === 'parent').reduce((a, t) => a + t.amount, 0);
  const down = g.corp.state.transfers.filter((t) => t.from === 'parent').reduce((a, t) => a + t.amount, 0);
  const pa = g.corp.account('parent');
  assert.equal(pa.xferIn, up); assert.equal(pa.xferOut, down);
  assert.equal(Math.round(pa.cash), Math.round(pa.contributed - pa.distributed + pa.xferIn - pa.xferOut + pa.flowIn - pa.flowOut));
  // the statements: one for each company, and the group's, with the identity holding
  for (const period of ['month', 'current', 'year']) {
    const S = g.corp.group.consolidated(period);
    assert.equal(S.separate.length, 5);
    assert.ok(Math.abs(S.reconciliation.equals - S.consolidated.net) < 1.5, period);
    assert.ok(S.cash.consolidated >= 0);
  }
  // save and load in the middle of it all: every balance, record and obligation as it was
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT, { seed: 6 });
  assert.ok(sm.load('slot1', g2).ok);
  for (const id of g.corp.group.members()) assert.equal(g2.corp.account(id).cash, g.corp.account(id).cash, id);
  assert.equal(JSON.stringify(g2.corp.state.transfers), JSON.stringify(g.corp.state.transfers));
  assert.equal(JSON.stringify(g2.corp.state.loans), JSON.stringify(g.corp.state.loans));
  assert.equal(JSON.stringify(g2.corp.state.group.ic), JSON.stringify(g.corp.state.group.ic));
  assert.equal(total(g2), total(g));
  assert.ok(Math.abs(g2.corp.group.consolidated('year').consolidated.net - g.corp.group.consolidated('year').consolidated.net) < 1.5);
  assert.equal(t0 > 0, true);
});
