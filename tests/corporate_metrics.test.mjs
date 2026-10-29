// Comparing companies (v0.60.0 part E): the figures come from the books each company keeps, a
// valuation is an opinion and never money, and a ranking says why.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { CORP } from '../src/content/corporate.js';
import { figures, growth, value, rank, shares } from '../src/corp/metrics.js';

const atDay = (g, d) => { g.clock.total = (d - 1) * 1440 + 9 * 60; };

test('figures add the months, keep what a book does not have as null, and growth needs something to grow from', () => {
  const f = figures([{ revenue: 100, cogs: 40, opex: 30, capex: 5, interest: 2, net: 28 }, { revenue: 200, cogs: 90, opex: 30, capex: 0, interest: 2, net: 78 }]);
  assert.equal(f.revenue, 300); assert.equal(f.cogs, 130); assert.equal(f.operating, 110); assert.equal(f.net, 106); assert.equal(f.months, 2);
  assert.ok(Math.abs(f.margin - 106 / 300) < 1e-9);
  const cash = figures([{ revenue: 50, cogs: null, opex: 20, capex: 0, interest: 0, net: 30 }]);
  assert.equal(cash.cogs, null, 'cost of goods is not separated on a cash basis');
  assert.equal(cash.operating, 30);
  assert.equal(figures([]), null);
  assert.equal(growth(150, 100), 0.5);
  assert.equal(growth(150, 0), null);
  assert.equal(growth(null, 100), null);
});

test('a valuation is net assets plus a multiple of a year\'s profit — halved for a loss, floored, never negative', () => {
  assert.equal(value(CORP, 'arms', { netAssets: 1000, annualProfit: 100 }), 1000 + 11 * 100);
  assert.equal(value(CORP, 'arms', { netAssets: 1000, annualProfit: null }), 1000);
  assert.equal(value(CORP, 'arms', { netAssets: 1000, annualProfit: -100 }), Math.round(1000 - 0.5 * 11 * 100));
  assert.equal(value(CORP, 'arms', { netAssets: 1000, annualProfit: -1e6 }), Math.round(1000 / 3), 'never below a third of net assets');
  assert.equal(value(CORP, 'arms', { netAssets: -500, annualProfit: 10 }), Math.max(0, -500 + 110));
});

test('rank orders by a figure, gives ranks to those that have it, and leaves the rest unranked', () => {
  const es = [{ id: 'a', v: 5 }, { id: 'b', v: null }, { id: 'c', v: 9 }, { id: 'd', v: 5 }];
  const r = rank(es, (e) => e.v);
  assert.deepEqual(r.map((e) => [e.id, e.rank]), [['c', 1], ['a', 2], ['d', 3], ['b', null]]);
  assert.deepEqual(rank(es, (e) => e.v, { ascending: true }).map((e) => e.id).slice(0, 3), ['a', 'd', 'c']);
  const s = shares([{ id: 'a', revenue: 30 }, { id: 'b', revenue: 70 }, { id: 'c', revenue: null }]);
  assert.equal(s.a, 0.3); assert.equal(s.b, 0.7); assert.equal(s.c, null);
});

test('what the owner\'s business really took in is its revenue — and what its sister company paid it is not', () => {
  const g = newGame(1001);
  g.player.money = 5_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  atDay(g, 5);
  g.logistics.earn(10_000, 'contract');
  g.logistics.earn(4_000, 'internal'); // the aerospace division paying its sister
  g.logistics.spend(3_000, 'upkeep');
  atDay(g, 40);
  const reg = g.corp.registry().find((r) => r.playerId === 'shipping');
  const m = g.corp.metricsOf(reg, 'month');
  assert.equal(m.revenue, 10_000, 'the internal charge is eliminated');
  assert.equal(m.net, 7_000);
  assert.equal(m.basis, 'cash');
  assert.equal(m.operating, 7_000);
  assert.equal(g.corp.metricsOf(reg, 'current').revenue, 0, 'the month so far has sold nothing');
  assert.equal(g.corp.metricsOf(reg, 'year').revenue, 10_000);
});

test('the aerospace figures are the aerospace books\' own', () => {
  const g = newGame(1002);
  g.player.money = 30_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero;
  A.hire(A.roost, 20);
  for (let i = 0; i < 1440 * 40; i++) { g.clock.total += 1; A.minuteTick(); }
  const reg = g.corp.registry().find((r) => r.playerId === 'aerospace');
  const m = g.corp.metricsOf(reg, 'year');
  assert.equal(m.basis, 'books');
  const rows = A.monthlyReport(A.roost, 24).filter((x) => x.m < Math.floor((g.clock.day - 1) / 30));
  assert.equal(Math.round(m.revenue), Math.round(rows.reduce((a, x) => a + x.revenue, 0)));
  assert.equal(Math.round(m.net), Math.round(rows.reduce((a, x) => a + x.profit, 0)));
});

test('a valuation never makes money: paying cash in moves it, and values change only by what moved', () => {
  const g = newGame(1003);
  g.player.money = 3_000_000;
  assert.ok(g.arms.buyLicence().ok);
  assert.ok(g.arms.buy('aw1').ok);
  const reg = g.corp.registry().find((r) => r.playerId === 'arms');
  const wallet0 = g.player.money;
  const v0 = g.corp.metricsOf(reg, 'month').valuation;
  for (let i = 0; i < 20; i++) g.corp.metricsOf(reg, 'year');
  assert.equal(g.player.money, wallet0, 'reading a valuation costs and pays nothing');
  assert.ok(g.corp.contribute('arms', 500_000).ok);
  const m1 = g.corp.metricsOf(reg, 'month');
  assert.equal(g.player.money, wallet0 - 500_000);
  assert.equal(m1.cash, 500_000, 'spendable cash is the account\'s cash alone');
  assert.equal(m1.valuation - v0, 500_000, 'the company is worth what was put in — and the owner is worth the same in all');
  assert.equal(g.player.money + m1.cash, wallet0, 'no obol appeared');
});

test('data a company does not keep is shown as missing, not as zero', () => {
  const g = newGame(1004);
  const t = g.corp.sectorTable('energy', { by: 'revenue' });
  const oil = t.find((m) => m.key === 'ober_oil');
  assert.ok(oil, 'Ober\'s Oil is in the table');
  assert.equal(oil.revenue, null); assert.equal(oil.net, null); assert.equal(oil.rank, null);
  assert.equal(oil.basis, 'none');
  const ship = g.corp.sectorTable('shipping', { by: 'revenue' }).find((m) => m.key === 'carrier_halver');
  assert.ok(ship && ship.revenue === null && ship.rank === null);
  const ranked = t.filter((m) => m.rank);
  assert.deepEqual(ranked.map((m) => m.rank), ranked.map((_, i) => i + 1), 'ranks are 1..n with no gaps');
  assert.ok(t.indexOf(oil) >= ranked.length, 'unranked rows come last');
});

test('a business that has sold nothing has sold nothing — zero, ranked last, not missing', () => {
  const g = newGame(1005);
  g.player.money = 5_000_000;
  assert.ok(g.arms.buyLicence().ok);
  const t = g.corp.sectorTable('arms', { by: 'revenue' });
  const me = t.find((m) => m.mine);
  assert.ok(me);
  assert.equal(me.revenue, 0);
  assert.equal(me.rank, t.filter((m) => m.rank).length, 'last of those with figures');
});

test('the sector table lists the companies of that sector only, and flags the owner\'s', () => {
  const g = newGame(1006);
  g.player.money = 10_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  for (const sector of Object.keys(CORP.sectors)) {
    const t = g.corp.sectorTable(sector);
    assert.ok(t.length >= CORP.sectors[sector].count, sector);
    assert.ok(t.every((m) => m.sector === sector));
    assert.equal(t.filter((m) => m.mine).length, sector === 'shipping' ? 1 : 0);
  }
});

test('the owner\'s revenue is taken from the others: their share of the sector falls as the player sells', () => {
  const g = newGame(1007);
  g.player.money = 5_000_000;
  assert.ok(g.farm.buy(Object.keys(g.farm.def.plots)[0]).ok);
  const sum = () => g.corp.state.generated.filter((c) => c.sector === 'agriculture').reduce((a, c) => a + c.totals.revenue, 0);
  const run = (days, from) => { for (let d = from; d < from + days; d++) { atDay(g, d); g.corp.dailyTick(); } };
  atDay(g, 2); g.corp.dailyTick();
  const a0 = sum(); run(20, 3); const free = sum() - a0;
  // the farm now sells 60% of the sector's pool each day
  const h = { month: 0 };
  void h;
  const g2 = newGame(1007); g2.player.money = 5_000_000; g2.farm.buy(Object.keys(g2.farm.def.plots)[0]);
  const sum2 = () => g2.corp.state.generated.filter((c) => c.sector === 'agriculture').reduce((a, c) => a + c.totals.revenue, 0);
  atDay(g2, 2); g2.corp.dailyTick();
  const b0 = sum2();
  g2.corp.receive('farming', 125000 * 30 * 0.6, { cat: 'crops' });
  for (let d = 3; d < 23; d++) { atDay(g2, d); g2.corp.dailyTick(); }
  const squeezed = sum2() - b0;
  assert.ok(squeezed < free * 0.85, `rivals sold ${Math.round(squeezed)} against ${Math.round(free)} when the farm took the market`);
});

test('compare says, figure by figure, who leads', () => {
  const g = newGame(1008);
  g.player.money = 5_000_000;
  assert.ok(g.arms.buyLicence().ok);
  atDay(g, 5); g.corp.receive('arms', 50_000, { cat: 'exports' });
  for (let d = 2; d <= 40; d++) { atDay(g, d); g.corp.dailyTick(); }
  const top = g.corp.sectorTable('arms').find((m) => !m.mine);
  const c = g.corp.compare('player_arms', top.key);
  assert.equal(c.a.name, g.corp.nameOf('arms'));
  const rev = c.lines.find((l) => l.key === 'revenue');
  assert.equal(rev.a, 50_000);
  assert.equal(rev.lead, -1, 'the leader out-sells a new works');
  assert.ok(c.lines.every((l) => ['revenue', 'net', 'margin', 'growth', 'valuation', 'cash', 'debt'].includes(l.key)));
  assert.equal(g.corp.compare('player_arms', 'nobody'), null);
});

test('each month\'s standing is written down, once', () => {
  const g = newGame(1009);
  g.player.money = 5_000_000;
  assert.ok(g.arms.buyLicence().ok);
  for (let d = 2; d <= 100; d++) { atDay(g, d); g.corp.dailyTick(); }
  const h = g.corp.state.rankHistory.arms;
  assert.ok(h.length >= 2);
  assert.deepEqual(h.map((x) => x.m), [...new Set(h.map((x) => x.m))], 'no month twice');
  assert.ok(h.every((x) => x.of >= 1));
  const n = h.length;
  g.corp.recordRanks();
  assert.equal(g.corp.state.rankHistory.arms.length, n);
});

test('an old save can be compared and ranked at once, with no money changed', () => {
  const raw = readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), raw);
  const g = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g).ok);
  const money = g.player.money;
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) {
    const p = g.corp.placeOf(id);
    assert.ok(p && p.valuation.rank, `${id} has a place`);
    const reg = g.corp.registry().find((r) => r.playerId === id);
    for (const period of ['month', 'current', 'year']) assert.ok(g.corp.metricsOf(reg, period));
  }
  assert.equal(g.player.money, money);
});
