// Funding a company (v0.60.0 part B): the owner puts money in and takes it out, a funded company
// can never be paid for nothing, and the aerospace cash-flow reconciliation holds against the
// company's account (as the v0.59 one holds against the owner's wallet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { balanceOk } from '../src/corp/ledger.js';

const DAY = 1440;
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };

test('the owner can only fund a business they own, with money they have', () => {
  const g = newGame(701);
  g.player.money = 5000;
  assert.ok(!g.corp.contribute('arms', 100).ok, 'no licence, no works');
  assert.ok(!g.corp.contribute('casino', 100).ok);
  assert.ok(g.arms.buyLicence().ok);
  assert.ok(g.corp.established('arms'));
  const w = g.player.money;
  assert.ok(!g.corp.contribute('arms', w + 1).ok, 'more than the wallet');
  assert.ok(!g.corp.contribute('arms', 0).ok && !g.corp.contribute('arms', -5).ok && !g.corp.contribute('arms', 'x').ok);
  assert.equal(g.player.money, w);
  assert.equal(g.corp.funded('arms'), false, 'nothing happened');
});

test('a contribution moves wallet money into the account once, and is logged', () => {
  const g = newGame(702);
  g.player.money = 5000;
  assert.ok(g.arms.buyLicence().ok);
  const w = g.player.money;
  assert.ok(g.corp.contribute('arms', 1000).ok);
  const a = g.corp.account('arms');
  assert.equal(g.player.money, w - 1000);
  assert.equal(a.cash, 1000);
  assert.equal(a.contributed, 1000);
  assert.ok(a.funded);
  assert.equal(a.log.at(-1).type, 'contribution');
  assert.ok(balanceOk(a));
  const total = g.player.money + a.cash;
  assert.equal(total, w, 'no money made or lost');
});

test('a distribution returns only what the company holds, and never while it owes', () => {
  const g = newGame(703);
  g.player.money = 5000;
  assert.ok(g.arms.buyLicence().ok);
  g.corp.contribute('arms', 1000);
  const w = g.player.money;
  assert.ok(!g.corp.distribute('arms', 1001).ok);
  assert.ok(g.corp.distribute('arms', 400).ok);
  assert.equal(g.player.money, w + 400);
  assert.equal(g.corp.account('arms').cash, 600);
  g.corp.account('arms').arrears = 50;
  assert.ok(!g.corp.distribute('arms', 10).ok, 'it owes');
  assert.ok(!g.corp.unfund('arms').ok);
  g.corp.account('arms').arrears = 0;
  assert.ok(g.corp.reconciles());
  assert.ok(!g.corp.distribute('shipping', 5).ok, 'an unfunded company holds nothing');
});

test('closing the account hands the cash back and the business draws on the owner again', () => {
  const g = newGame(704);
  g.player.money = 5000;
  assert.ok(g.arms.buyLicence().ok);
  const w0 = g.player.money;
  g.corp.contribute('arms', 700);
  assert.ok(g.corp.unfund('arms').ok);
  const a = g.corp.account('arms');
  assert.equal(a.funded, false);
  assert.equal(a.cash, 0);
  assert.equal(g.player.money, w0, 'every obol came home');
  assert.ok(g.corp.canAfford('arms', w0));
  assert.deepEqual(a.log.map((l) => l.type).slice(-3), ['contribution', 'distribution', 'closed']);
});

test('a funded company that cannot cover a bill owes it, and its next income pays that first', () => {
  const g = newGame(705);
  g.player.money = 5_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  g.corp.contribute('shipping', 100);
  const a = g.corp.account('shipping');
  const wallet = g.player.money;
  g.logistics.spend(250, 'upkeep');
  assert.equal(a.cash, 0);
  assert.equal(a.arrears, 150, 'the rest is owed, not free');
  assert.equal(g.player.money, wallet, 'and the wallet is not raided');
  g.logistics.earn(400, 'contract');
  assert.equal(a.arrears, 0);
  assert.equal(a.cash, 250, '400 in, 150 of the debt out');
  assert.ok(g.corp.reconciles());
  assert.equal(g.player.money, wallet);
});

test('the shipping side is checked against the shipping account, not the wallet', () => {
  const g = newGame(706);
  g.player.money = 5_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  g.corp.contribute('shipping', 1000);
  const [pid] = Object.keys(g.logistics.state.ports);
  void pid;
  const m = g.logistics.models ? null : null; void m;
  assert.ok(!g.corp.canAfford('shipping', 5000), 'a funded firm with 1000 cannot buy a 5000 thing even though the owner is rich');
  assert.ok(g.player.money > 5000);
});

test('aerospace cash flow reconciles with the company\'s account when it is funded', () => {
  const g = newGame(707);
  g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero;
  const co = A.roost;
  assert.ok(g.corp.contribute('aerospace', 6_000_000).ok);
  const acct = g.corp.account('aerospace');
  const wallet = g.player.money;
  const base = { ...co.books.totals };
  const cash0 = acct.cash;
  const arrears0 = acct.arrears;
  A.hire(co, 20);
  assert.ok(A.buildHall(co, 'hangar2').ok);
  run(g, 12);
  const moved = (k) => (co.books.totals[k] || 0) - (base[k] || 0);
  const flows = Object.keys(co.books.totals).filter((k) => k.startsWith('cf_'));
  const into = flows.filter((k) => k.startsWith('cf_in_')).reduce((s, k) => s + moved(k), 0);
  const out = flows.filter((k) => k.startsWith('cf_out_')).reduce((s, k) => s + moved(k), 0);
  assert.equal(g.player.money, wallet, 'the owner\'s wallet never moved');
  // what the books say went out is what left the account, less anything still owed
  assert.equal(Math.round(acct.cash - cash0), Math.round(into - out + (acct.arrears - arrears0)), 'the books and the account agree');
  assert.ok(moved('cf_out_people') > 0 && moved('cf_out_capital') > 0);
  assert.ok(g.corp.reconciles());
  assert.ok(acct.cash >= 0);
});

test('a funded firm with too little cash owes rather than building for free', () => {
  const g = newGame(708);
  g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero;
  const co = A.roost;
  g.corp.contribute('aerospace', 1000);
  const wallet = g.player.money;
  const r = A.buildHall(co, 'hangar2');
  assert.ok(!r.ok, 'refused: the account cannot pay');
  assert.equal(g.player.money, wallet);
  assert.equal(g.corp.account('aerospace').cash, 1000);
});

test('funding survives a save and load', async () => {
  const { SaveManager, MemoryStorage } = await import('../src/save/saveManager.js');
  const { CONTENT } = await import('../src/content/index.js');
  const { Game } = await import('../src/game/game.js');
  const g = newGame(709);
  g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  g.corp.contribute('aerospace', 123456);
  g.corp.account('aerospace').arrears = 77;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT, { seed: 1 });
  const r = sm.load('slot1', g2);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const a = g2.corp.account('aerospace');
  assert.equal(a.cash, 123456);
  assert.equal(a.arrears, 77);
  assert.ok(a.funded);
  assert.equal(g2.player.money, g.player.money);
});
