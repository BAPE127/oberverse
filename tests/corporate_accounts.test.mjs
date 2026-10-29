// The company accounts (v0.60.0 part A): the four businesses move money through one place, an
// unfunded company draws on the owner's wallet exactly as before, a funded one pays from its own
// cash alone, and personal money (shares) never passes through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { freshAccount, post, monthTotals, monthOf, balanceOk, kindOf, MONTHS_KEPT } from '../src/corp/ledger.js';
import { COMPANY_IDS } from '../src/systems/corporate.js';

const fund = (g, id, cash) => { const a = g.corp.account(id); a.funded = true; a.cash = cash; a.contributed = cash; return a; };

test('a fresh account is unfunded, empty, and reconciles', () => {
  const a = freshAccount('arms');
  assert.equal(a.funded, false);
  assert.equal(a.cash, 0);
  assert.ok(balanceOk(a));
  const g = newGame(601);
  for (const id of COMPANY_IDS) { assert.equal(g.corp.funded(id), false); assert.equal(g.corp.cashOf(id), g.player.money); }
  assert.throws(() => g.corp.account('casino'));
});

test('months are thirty days, flows are classed, and only two years are kept', () => {
  assert.equal(monthOf(1), 0); assert.equal(monthOf(30), 0); assert.equal(monthOf(31), 1);
  const a = freshAccount('farming');
  post(a, 3, 'in', 'crops', 100); post(a, 4, 'out', 'animals', 40); post(a, 4, 'out', 'wages', 10); post(a, 5, 'in', 'refund', 7);
  assert.deepEqual(monthTotals(a, 0), { revenue: 100, opex: 10, capex: 40, otherIn: 7, otherOut: 0 });
  assert.equal(kindOf('machines', 'out'), 'capex');
  assert.equal(kindOf('customers', 'in'), 'revenue');
  for (let d = 1; d <= 40 * 30; d += 30) post(a, d, 'in', 'crops', 1);
  assert.equal(Object.keys(a.months).length, MONTHS_KEPT);
});

test('an unfunded company draws on the wallet, once, and its flows are counted', () => {
  const g = newGame(602);
  g.player.money = 1000;
  assert.ok(g.corp.canAfford('arms', 1000));
  assert.ok(!g.corp.canAfford('arms', 1001));
  assert.ok(g.corp.pay('arms', 300, { cat: 'parts' }));
  assert.equal(g.player.money, 700);
  assert.ok(g.corp.receive('arms', 50, { cat: 'wholesale' }));
  assert.equal(g.player.money, 750);
  const a = g.corp.account('arms');
  assert.equal(a.cash, 0, 'no cash of its own');
  assert.equal(a.flowOut, 0, 'only funded flows move the account');
  assert.equal(monthTotals(a, 0).opex, 300);
  assert.equal(monthTotals(a, 0).revenue, 50);
  assert.ok(g.corp.reconciles());
});

test('the HUD is told of a wallet change once; a batch can be announced by the caller', () => {
  const g = newGame(603);
  g.player.money = 500;
  const seen = [];
  g.bus.on('money:changed', (e) => seen.push(e.delta));
  g.corp.pay('arms', 10, { cat: 'wages', quiet: true });
  g.corp.pay('arms', 15, { cat: 'wages', quiet: true });
  assert.deepEqual(seen, []);
  g.corp.announce('arms', -25);
  g.corp.pay('arms', 5, { cat: 'parts' });
  assert.deepEqual(seen, [-25, -5]);
});

test('a funded company pays only from its own cash and refuses what it cannot cover', () => {
  const g = newGame(604);
  g.player.money = 777;
  const a = fund(g, 'shipping', 1000);
  assert.equal(g.corp.cashOf('shipping'), 1000);
  assert.ok(g.corp.pay('shipping', 400, { cat: 'voyage' }));
  assert.equal(g.player.money, 777, 'the wallet is untouched');
  assert.equal(a.cash, 600);
  assert.ok(!g.corp.pay('shipping', 601, { cat: 'voyage' }), 'refused');
  assert.equal(a.cash, 600, 'and nothing moved');
  assert.ok(g.corp.receive('shipping', 90, { cat: 'contract' }));
  assert.equal(a.cash, 690);
  assert.equal(g.player.money, 777);
  assert.ok(g.corp.reconciles());
  assert.ok(!g.corp.pay('shipping', -5) && !g.corp.pay('shipping', NaN), 'nonsense amounts are refused');
});

test('buying a business is the owner\'s equity in kind, not the company\'s spending', () => {
  const g = newGame(605);
  g.player.money = 100000;
  const r = g.logistics.buyCompany();
  assert.ok(r.ok);
  const a = g.corp.account('shipping');
  assert.equal(g.player.money, 100000 - g.logistics.L.price, 'out of the wallet exactly once');
  assert.equal(a.inKind, g.logistics.L.price);
  assert.equal(a.log.at(-1).type, 'in-kind');
  assert.equal(a.funded, false);
  assert.equal(a.cash, 0, 'the company holds no cash it did not have');
});

test('every business routes its money through its account', () => {
  const g = newGame(606);
  g.player.money = 30_000_000;
  assert.ok(g.arms.buyLicence().ok);
  assert.equal(g.corp.account('arms').inKind, g.arms.cfg.licencePrice);
  assert.ok(g.arms.buy('aw1').ok);
  const part = Object.keys(g.content.items).find((k) => g.content.items[k].category === 'arms_part');
  const before = g.player.money;
  assert.ok(g.arms.order('aw1', part, 2).ok);
  assert.equal(monthTotals(g.corp.account('arms'), 0).opex, before - g.player.money);
  assert.ok(g.aero.buyFirm().ok);
  assert.equal(g.corp.account('aerospace').inKind, g.aero.A.firm.price);
  const [p1, p2] = Object.keys(g.farm.def.plots);
  assert.ok(g.farm.buy(p1).ok);
  assert.equal(g.corp.account('farming').inKind, g.farm.plotDef(p1).price, 'the first plot founds the farm');
  const m = g.player.money;
  assert.ok(g.farm.buy(p2).ok);
  assert.equal(m - g.player.money, g.farm.plotDef(p2).price);
  assert.equal(monthTotals(g.corp.account('farming'), 0).capex, g.farm.plotDef(p2).price, 'later land is capital spending');
  assert.equal(g.corp.account('farming').inKind, g.farm.plotDef(p1).price, 'and not more equity');
});

test('a funded aerospace firm pays and is paid in its own account', () => {
  const g = newGame(607);
  g.player.money = 5_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  const a = fund(g, 'aerospace', 2_000_000);
  const wallet = g.player.money;
  g.aero.pay(co, 12345, 'wages');
  g.aero.receive(co, 500, 'rev_aircraft');
  assert.equal(g.player.money, wallet, 'the wallet is untouched');
  assert.equal(a.cash, 2_000_000 - 12345 + 500);
  assert.equal(g.aero.cash(co), a.cash);
  assert.ok(g.corp.reconciles());
});

test('a funded arms company pays wages from its own cash, and cannot when it has none', () => {
  const g = newGame(608);
  g.player.money = 50_000;
  assert.ok(g.arms.buyLicence().ok);
  assert.ok(g.arms.buy('aw1').ok);
  assert.ok(g.arms.hire(0, 'aw1').ok);
  const wage = g.arms.state.staff[0].wage;
  const a = fund(g, 'arms', 10_000);
  const wallet = g.player.money;
  g.arms.payroll();
  assert.equal(g.player.money, wallet, 'the wallet is untouched');
  assert.equal(a.cash, 10_000 - wage);
  assert.equal(g.arms.state.staff[0].unpaid, 0);
  a.cash = wage - 1; a.contributed = a.cash + a.distributed - a.flowIn + a.flowOut;
  g.arms.payroll();
  assert.equal(a.cash, wage - 1, 'it cannot pay, so it does not');
  assert.equal(g.arms.state.staff[0].unpaid, 1, 'and the worker goes unpaid');
  assert.equal(g.player.money, wallet, 'the wallet is still not drawn on');
  assert.ok(g.corp.reconciles());
});

test('shares are personal money: trading them never touches a company', () => {
  const g = newGame(609);
  g.player.money = 100_000;
  assert.ok(g.aero.buyFirm().ok);
  const months = JSON.stringify(g.corp.account('aerospace').months);
  const flows = g.corp.account('aerospace').flowOut;
  const r = g.aero.buyShares(10);
  assert.ok(r.ok);
  assert.equal(JSON.stringify(g.corp.account('aerospace').months), months);
  assert.equal(g.corp.account('aerospace').flowOut, flows);
});

test('an old save has no corp state; it comes up with every company unfunded and nothing moved', () => {
  const g = newGame(610);
  g.player.money = 4321;
  delete g.world.corp;
  assert.equal(g.corp.funded('arms') || g.corp.funded('shipping') || g.corp.funded('aerospace') || g.corp.funded('farming'), false);
  assert.equal(g.player.money, 4321);
  assert.equal(g.corp.state.v, 1);
});
