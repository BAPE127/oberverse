// The financial reports (v0.59.0): months, cash flow, the balance sheet, the segments — and that
// they agree with each other and with the money that really moved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { freshBooks, post, flowOf, summarise, FLOW, ACCOUNTS } from '../src/aero/books.js';
import { toCsv } from '../src/aero/reports.js';

const DAY = 1440;
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const own = (seed = 111) => { const g = newGame(seed); g.player.money = 20_000_000; assert.ok(g.aero.buyFirm().ok); return { g, A: g.aero, co: g.aero.roost }; };

test('the books keep thirty-day months, newest first, two years of them', () => {
  const b = freshBooks();
  post(b, 1, 'rev_aircraft', 100); post(b, 30, 'rev_aircraft', 50); post(b, 31, 'rev_aircraft', 7); post(b, 31, 'wages', 3);
  assert.equal(b.months.length, 2);
  assert.deepEqual([b.months[0].m, b.months[1].m], [1, 0]);
  assert.equal(b.months[1].acc.rev_aircraft, 150);
  assert.equal(b.months[0].acc.rev_aircraft, 7);
  for (let d = 1; d <= 30 * 30; d += 30) post(b, d, 'wages', 1);
  assert.equal(b.months.length, 24, 'two years');
  assert.equal(b.totals.wages, 33);
});

test('every payment and receipt falls in a cash category that the report knows', () => {
  for (const [acc, d] of Object.entries(ACCOUNTS)) {
    const dir = d.kind === 'revenue' ? 'in' : 'out';
    assert.ok(FLOW[dir][flowOf(acc, dir)], `${acc}: ${flowOf(acc, dir)}`);
  }
  assert.equal(flowOf('wages', 'out'), 'people');
  assert.equal(flowOf('penalties', 'out'), 'customers');
  assert.equal(flowOf(null, 'in'), 'customers');
  assert.equal(flowOf('rev_claims', 'in'), 'other');
  assert.equal(flowOf('upkeep', 'out'), 'running');
});

test('cash flow adds up to what really left and entered the owner\'s account', () => {
  const { g, A, co } = own(112);
  const base = { ...co.books.totals };
  const cash0 = g.player.money;
  // things that cost money and things that bring it in
  A.hire(co, 20);
  assert.ok(A.buildHall(co, 'hangar2').ok);
  run(g, 12);
  const moved = (k) => (co.books.totals[k] || 0) - (base[k] || 0);
  const flows = Object.keys(co.books.totals).filter((k) => k.startsWith('cf_'));
  const into = flows.filter((k) => k.startsWith('cf_in_')).reduce((a, k) => a + moved(k), 0);
  const out = flows.filter((k) => k.startsWith('cf_out_')).reduce((a, k) => a + moved(k), 0);
  assert.equal(Math.round(g.player.money - cash0), Math.round(into - out), 'the books and the wallet agree');
  assert.ok(moved('cf_out_people') > 0 && moved('cf_out_capital') >= A.cfg.halls.hangar2.build * 0.99, 'hiring and the hall');
  assert.ok(moved('cf_out_materials') > 0, 'materials for the work in hand');
  const f = A.cashFlowReport(co, null);
  assert.equal(Math.round(f.net), Math.round(f.totalIn - f.totalOut));
  assert.equal(Math.round(f.operating), Math.round(f.net + f.capital));
  assert.ok(f.out.some((r) => r.key === 'capital'));
  const f7 = A.cashFlowReport(co, 7);
  assert.ok(f7.totalOut <= f.totalOut);
});

test('a month by month report reads the books', () => {
  const { g, A, co } = own(113);
  run(g, 12);
  const rows = A.monthlyReport(co, 6);
  assert.ok(rows.length >= 1);
  const last = rows.at(-1);
  assert.ok(last.partial, 'the month in progress is marked');
  assert.equal(Math.round(last.profit), Math.round(last.revenue - last.costs));
  const total = rows.reduce((a, r) => a + r.profit, 0);
  assert.ok(Math.abs(total - summarise(co.books, null).profit) < 2, 'the months add up to the whole');
});

test('the balance sheet balances what it shows, and net assets less the result is the capital put in', () => {
  const { g, A, co } = own(114);
  run(g, 6);
  A.state.satellites.BS = { id: 'BS', name: 'BS-1', product: 'st_relay', role: 'comms', service: { comms: 40 }, owner: co.id, manufacturer: co.id, own: true, status: 'operational', capability: 1, lifeDays: 60, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, price: 1, opex: 0, value: 400000, book: 400000, hardened: false, config: {} };
  co.books.fleet = 400000;
  const b = A.balanceReport(co);
  assert.equal(b.assets.reduce((a, r) => a + r.value, 0), b.totalAssets);
  assert.equal(b.totalAssets - b.totalLiabilities, b.net);
  assert.equal(b.net - b.result, b.capital);
  assert.ok(b.assets.some((r) => /fleet/i.test(r.label) && r.value === 400000));
  assert.equal(b.cash, null, 'Roost spends from the owner\'s account');
  const wip = b.assets.find((r) => /Work in progress/.test(r.label)).value;
  assert.ok(wip >= 0);
  const m = A.balanceReport(A.meridian);
  assert.ok(m.assets.some((r) => r.label === 'Cash') && m.cash > 0, 'Meridian has cash');
  assert.ok(m.liabilities[0].value > 0, 'and a book of deposits');
});

test('segments: units and revenue by line and by product add up to the deliveries', () => {
  const { g, A, co } = own(115);
  for (let i = 0; i < 12 * DAY && co.stats.delivered < 2; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.ok(co.stats.delivered >= 2);
  const seg = A.segmentReport(co);
  const air = seg.rows.find((r) => r.id === 'aircraft');
  assert.equal(air.units, co.stats.delivered);
  assert.ok(air.revenue > 0 && air.cost > 0 && air.contribution === air.revenue - air.cost);
  assert.ok(seg.products.find((p) => p.id === 'ap_skylark').units >= 2);
  assert.equal(seg.products.reduce((a, p) => a + p.revenue, 0), air.revenue);
  assert.ok(seg.rows.find((r) => r.id === 'services'));
  assert.equal(Math.round(seg.total.contribution), Math.round(seg.rows.reduce((a, r) => a + r.contribution, 0)));
});

test('the headline numbers are finite, and a fleet yield only exists with a fleet', () => {
  const { g, A, co } = own(116);
  run(g, 3);
  const h = A.headlineReport(co);
  for (const v of [h.revenue, h.profit, h.margin, h.grossMargin, h.revenue30, h.profit30, h.perTechnician]) assert.ok(Number.isFinite(v));
  assert.equal(h.fleetYield, null);
  co.books.fleet = 1000000;
  assert.ok(Number.isFinite(A.headlineReport(co).fleetYield));
});

test('CSV is quoted the way a spreadsheet wants', () => {
  assert.equal(toCsv([['a', 'b,c', 'say "hi"', null, 3]]), 'a,"b,c","say ""hi""",,3');
  assert.equal(toCsv([['x'], ['y']]), 'x\ny');
});

test('books from before v0.59.0 gain months, lines and products; and they survive a save', () => {
  const { g, A, co } = own(117);
  run(g, 3);
  delete co.books.months; delete co.books.lines; delete co.books.products;
  A.afterLoad();
  assert.deepEqual([Array.isArray(co.books.months), typeof co.books.lines, typeof co.books.products], [true, 'object', 'object']);
  post(co.books, A.day, 'wages', 5);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  assert.deepEqual(g2.aero.roost.books.months, co.books.months);
});
