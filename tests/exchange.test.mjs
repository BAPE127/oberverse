// The exchange (v0.66.0): every listed company on one board. The wider world's shares trade under one set of rules —
// prices that follow the company's own books, a broker's fee, a cap on one investor, dividends really paid — and the three
// shares the game already had are read through as they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { CORP } from '../src/content/corporate.js';
import { listingShares, fairPrice, nextPrice, quote, maxHold, roomFor, spark } from '../src/corp/exchange.js';
import { OIL_LISTED } from '../src/systems/oilCompany.js';

const X = CORP.exchange;
const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
/** A game with the wider world made and the exchange open on day 2. */
function open(seed) {
  const g = newGame(seed);
  g.corp.ensureWorld();
  day(g, 2); g.corp.dailyTick();
  return g;
}
const first = (g) => g.corp.exchange.board().find((r) => r.source === 'generated');

test('pure: the shares a worth fits at a price, the step toward fair value, the fee, the cap and the blocks', () => {
  assert.equal(listingShares(5_000_000, 50), 100000);
  assert.equal(listingShares(10, 50), 1000, 'never fewer than a thousand');
  assert.equal(fairPrice(5_000_000, 100000), 50);
  assert.equal(fairPrice(-1, 100), null);
  const p = nextPrice(X, 50, 80, 0.5);
  assert.equal(p, Math.round((50 + 30 * X.priceAdjust) * 100) / 100, 'part of the way, no mood at 0.5');
  assert.ok(nextPrice(X, 50, 50, 1) <= 50 * (1 + X.noise) + 0.01 && nextPrice(X, 50, 50, 0) >= 50 * (1 - X.noise) - 0.01);
  assert.equal(nextPrice(X, 0.5, 0.01, 0), X.minPrice, 'never below the least');
  assert.deepEqual(quote({ fee: 0.01 }, 41.5, 100), { gross: 4150, fee: 42 });
  assert.equal(maxHold(X, 1_000_000), 50000);
  assert.equal(roomFor(X, 1_000_000, 49000), 1000); assert.equal(roomFor(X, 1_000_000, 60000), 0);
  assert.equal(spark([1, 2, 3, 4]).length, 4); assert.equal(spark([5, 5]), '▄▄'); assert.equal(spark([]), '');
  assert.equal(spark([1, 10])[0], '▁'); assert.equal(spark([1, 10])[1], '█');
});

test('listings: every priced listed company of the wider world gets one, once, at a price that fits its worth', () => {
  const g = open(2001);
  const ex = g.corp.exchange; const st = ex.peek();
  const rows = ex.board().filter((r) => r.source === 'generated');
  const listed = (g.corp.state.generated || []).filter((c) => c.ticker && (c.status === 'active' || c.status === 'distressed'));
  assert.ok(rows.length >= 10 && rows.length <= listed.length);
  for (const r of rows) {
    assert.ok(r.price >= X.minPrice && r.price < 500, `${r.ticker} ${r.price}`);
    const l = st.listings[r.ticker];
    assert.ok(Math.abs(l.price - l.fair) / l.fair < 0.01, 'first listed at its worth');
    assert.equal(l.history.length, 1);
    assert.ok(r.cap === maxHold(X, l.shares));
  }
  const prices = rows.map((r) => r.price); const shares = rows.map((r) => st.listings[r.ticker].shares);
  day(g, 2); g.corp.dailyTick();
  assert.deepEqual(ex.board().filter((r) => r.source === 'generated').map((r) => r.price), prices, 'a day is only counted once');
  assert.deepEqual(Object.values(st.listings).map((l) => l.shares), shares, 'a listing is made once');
});

test('prices follow the company\'s books a little each day, with no RNG, the same in two games from one save', () => {
  const a = open(2002); const b = open(2002);
  const rng = a.rng.state;
  for (let d = 3; d <= 40; d++) { day(a, d); day(b, d); a.corp.dailyTick(); b.corp.dailyTick(); }
  const pa = a.corp.exchange.board().filter((r) => r.source === 'generated').map((r) => [r.ticker, r.price]);
  const pb = b.corp.exchange.board().filter((r) => r.source === 'generated').map((r) => [r.ticker, r.price]);
  assert.deepEqual(pa, pb);
  for (const l of Object.values(a.corp.exchange.peek().listings)) {
    assert.ok(Number.isFinite(l.price) && l.price >= X.minPrice, l.ticker);
    assert.ok(l.history.length <= X.historyDays);
    for (let i = 1; i < l.history.length; i++) {
      const prev = l.history[i - 1].price; const fair = l.history[i].fair;
      const lo = Math.min(prev, prev + (fair - prev) * X.priceAdjust) * (1 - X.noise) - 0.02;
      const hi = Math.max(prev, prev + (fair - prev) * X.priceAdjust) * (1 + X.noise) + 0.02;
      assert.ok(l.history[i].price >= lo && l.history[i].price <= hi, `${l.ticker} day ${l.history[i].day}`);
    }
  }
  void rng;
});

test('buying and selling: the broker\'s fee each way, the cap, the wallet, the cost kept — and a refusal changes nothing', () => {
  const g = open(2003); const ex = g.corp.exchange;
  const r = first(g);
  g.player.money = 1_000_000;
  const q = quote(X, r.price, 100);
  const b = ex.buy(r.ticker, 100);
  assert.ok(b.ok, b.text);
  assert.equal(g.player.money, 1_000_000 - q.gross - q.fee);
  const h = ex.peek().holdings[r.ticker];
  assert.equal(h.n, 100); assert.equal(h.cost, q.gross + q.fee);
  const s = ex.sell(r.ticker, 40);
  assert.ok(s.ok, s.text);
  assert.equal(g.player.money, 1_000_000 - q.gross - q.fee + (quote(X, r.price, 40).gross - quote(X, r.price, 40).fee));
  assert.equal(h.n, 60); assert.equal(h.cost, Math.round((q.gross + q.fee) * 0.6));
  // refusals
  const before = JSON.stringify([g.player.money, ex.peek().holdings]);
  assert.match(ex.buy(r.ticker, 0).text, /how many/);
  assert.match(ex.sell(r.ticker, 61).text, /do not own/);
  assert.match(ex.buy(r.ticker, r.cap + 1).text, /at most/);
  g.player.money = 5;
  assert.match(ex.buy(r.ticker, 10).text, /cannot afford/);
  assert.equal(JSON.stringify([g.player.money === 5 ? 1_000_000 - q.gross - q.fee + (quote(X, r.price, 40).gross - quote(X, r.price, 40).fee) : 0, ex.peek().holdings]), before.replace(/^\[\d+/, `[${1_000_000 - q.gross - q.fee + (quote(X, r.price, 40).gross - quote(X, r.price, 40).fee)}`));
  assert.match(ex.buy('NOPE', 1).text, /No such company/);
  // the cap is on the investor, not the order
  g.player.money = 1e12;
  assert.ok(ex.buy(r.ticker, r.cap - 60).ok);
  assert.match(ex.buy(r.ticker, 1).text, /as much .* as one investor may/);
});

test('dividends: what the company really paid out of a closed month, to the shares held, once — and none for shares not held', () => {
  const g = open(2004); const ex = g.corp.exchange; const st = ex.peek();
  const r = first(g); const l = st.listings[r.ticker]; const c = ex.record(l.id);
  g.player.money = 1e9;
  assert.ok(ex.buy(r.ticker, 1000).ok);
  const other = Object.values(st.listings).find((x) => x.ticker !== r.ticker);
  const month = Math.floor((g.clock.day - 1) / 30);
  // a dividend of 100,000 declared for the month that just closed
  const mrow = c.months.find((m) => m[0] === month - 1) || (c.months.push([month - 1, 0, 0, 0, 0, 0, 0, 0]), c.months.at(-1));
  mrow[7] = 100000;
  const oc = ex.record(other.id); const orow = oc.months.find((m) => m[0] === month - 1); if (orow) orow[7] = 50000;
  st.divMonth = month - 2;
  const money = g.player.money;
  ex.payDividends();
  const expect = Math.floor((100000 / l.shares) * 1000);
  assert.equal(g.player.money - money, expect);
  assert.equal(st.holdings[r.ticker].divs, expect);
  ex.payDividends(); ex.payDividends();
  assert.equal(g.player.money - money, expect, 'a month is paid once');
  assert.equal(st.holdings[other.ticker], undefined, 'nothing for shares not held');
  assert.match(st.log.at(-1).text, /paid a dividend/);
});

test('a company that fails leaves its shares worthless; one that is taken over buys them out at the last price', () => {
  const g = open(2005); const ex = g.corp.exchange; const st = ex.peek();
  const rows = ex.board().filter((r) => r.source === 'generated');
  const [a, b] = rows;
  g.player.money = 1e9;
  ex.buy(a.ticker, 500); ex.buy(b.ticker, 500);
  const ca = ex.record(st.listings[a.ticker].id); const cb = ex.record(st.listings[b.ticker].id);
  ca.status = 'closed'; cb.status = 'merged';
  const money = g.player.money;
  const priceB = st.listings[b.ticker].price;
  day(g, 3); g.corp.dailyTick();
  assert.equal(st.listings[a.ticker].status, 'failed'); assert.equal(ex.find(a.ticker).value, 0); assert.equal(st.holdings[a.ticker].n, 0);
  assert.equal(st.listings[b.ticker].status, 'bought out'); assert.equal(g.player.money - money, Math.round(500 * priceB));
  assert.equal(ex.sell(a.ticker, 1).ok, false);
  assert.match(ex.buy(a.ticker, 1).text, /no longer traded/);
  day(g, 4); g.corp.dailyTick();
  assert.equal(g.player.money - money, Math.round(500 * priceB), 'settled once');
});

test('the three older shares are on the board, and trading them goes through their own services', () => {
  const g = open(2006); const ex = g.corp.exchange;
  const board = ex.board();
  for (const t of ['OBRO', 'CHZ', 'MRDN']) assert.ok(board.find((r) => r.ticker === t), t);
  assert.equal(board.find((r) => r.ticker === 'OBRO').price, g.oil.state.sharePrice);
  assert.equal(board.find((r) => r.ticker === 'MRDN').price, g.aero.state.market.price);
  assert.equal(board.find((r) => r.ticker === 'MRDN').fee, g.aero.A.exchange.fee);
  assert.equal(board.find((r) => r.ticker === 'OBRO').fee, X.fee, 'since v0.67.0');
  assert.equal(board.find((r) => r.ticker === 'OBRO').cap, maxHold(X, OIL_LISTED));
  assert.equal(board.find((r) => r.ticker === 'CHZ').fee, g.dairy.cfg.fee, 'it has always had one');
  assert.equal(board.find((r) => r.ticker === 'CHZ').cap, g.dairy.cfg.maxPlayerShares);
  const twin = open(2006); twin.player.money = g.player.money = 100000; // v0.75.0: the same day as g (a share's price now moves with the wars of the day, so a twin a day behind no longer matches)
  const a = ex.buy('OBRO', 5); const b = twin.oil.buyShares(5);
  assert.deepEqual(a, b); assert.equal(g.player.money, twin.player.money); assert.equal(g.oil.state.sharesOwned, 5);
  const c = ex.buy('MRDN', 100); const d = twin.aero.buyShares(100);
  assert.deepEqual(c, d); assert.equal(g.player.money, twin.player.money);
  assert.ok(ex.sell('OBRO', 5).ok);
  const p = ex.portfolio();
  assert.ok(p.rows.some((r) => r.ticker === 'MRDN') && !p.rows.some((r) => r.ticker === 'OBRO'));
  assert.equal(p.unknownCost, false, 'MRDN keeps its cost, and so now do the others for shares bought here');
});

test('the portfolio adds up what is held; a holding whose cost is not kept is said so, not guessed', () => {
  const g = open(2007); const ex = g.corp.exchange;
  g.player.money = 1e9;
  const r = first(g);
  g.dairy.state.sharesOwned = 7; // held before v0.67.0: no cost on record
  ex.buy(r.ticker, 200); ex.buy('OBRO', 10); ex.buy('CHZ', 3);
  const p = ex.portfolio();
  assert.equal(p.rows.length, 3);
  assert.equal(p.value, p.rows.reduce((a, x) => a + x.value, 0));
  assert.equal(p.unknownCost, true);
  const known = ex.peek().holdings[r.ticker].cost + g.oil.state.costBasis;
  assert.equal(p.cost, known, 'only the holdings whose cost is known: the wider-world shares and the Ober\'s Oil bought here');
  assert.equal(p.gain, p.knownValue - known);
  assert.equal(p.knownValue, p.rows.filter((x) => x.cost !== null).reduce((a, x) => a + x.value, 0));
});

test('saves keep listings, holdings and history; a day after loading is not counted twice; an old save has none until the world is made', () => {
  const g = open(2008); const ex = g.corp.exchange;
  g.player.money = 1e9; const r = first(g);
  ex.buy(r.ticker, 50);
  const snap = JSON.parse(JSON.stringify(g.corp.state.exchange));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.exchange)), snap);
  g2.corp.dailyTick();
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.exchange)), snap, 'the same day again changes nothing');
  const old = newGame(2009);
  assert.equal(old.corp.state.exchange, undefined, 'nothing until the wider world exists');
  const money = old.player.money;
  old.corp.ensureWorld(); day(old, 2); old.corp.dailyTick();
  assert.equal(old.player.money, money); assert.ok(old.corp.state.exchange);
  assert.deepEqual(old.corp.state.exchange.holdings, {}, 'no one is given a share');
});

test('Ober\'s Oil under the exchange\'s rules (v0.67.0): the fee each way, the 5% cap, the cost kept, the price a step toward what the refinery says', () => {
  const g = newGame(2010); g.player.money = 1e9;
  const oil = g.oil; const s = oil.state;
  assert.equal(s.sharePrice, 30, 'it starts where it always did');
  const q = quote(X, 30, 100);
  const m0 = g.player.money;
  assert.ok(oil.buyShares(100).ok);
  assert.equal(m0 - g.player.money, q.gross + q.fee); assert.equal(s.costBasis, q.gross + q.fee);
  assert.ok(oil.sellShares(40).ok);
  assert.equal(g.player.money, m0 - q.gross - q.fee + (quote(X, 30, 40).gross - quote(X, 30, 40).fee));
  assert.equal(s.costBasis, Math.round((q.gross + q.fee) * 0.6)); assert.equal(s.sharesOwned, 60);
  const cap = maxHold(X, OIL_LISTED);
  assert.match(oil.buyShares(cap).text, /at most 5,000 shares of Ober's Oil: you can buy 4,940 more/);
  assert.ok(oil.buyShares(cap - 60).ok);
  assert.match(oil.buyShares(1).text, /as much of Ober's Oil as one investor may/);
  const before = g.player.money;
  g.player.money = 3; assert.match(oil.sellShares(0).text, /do not own/);
  assert.match(oil.buyShares(1).text, /as much|cannot afford/);
  g.player.money = before;
  // a project's bonus shares were not bought: the cost is no longer the whole story
  const h = newGame(2011); h.player.money = 1e6; h.oil.buyShares(5); assert.ok(h.oil.state.costBasis > 0);
  assert.ok(h.oil.fundProject('derrick').ok); assert.equal(h.oil.state.costBasis, undefined);
  // the price takes a part of the way to what the output says each evening, with no RNG, the same in two games
  const a = newGame(2012); const b = newGame(2012);
  const rng = a.rng.state;
  const day1 = (gm, d) => { gm.clock.total = (d - 1) * 1440 + 18 * 60; gm.oil.dailyTick(); };
  const out = a.oil.computeOutput(); const fair = Math.max(5, 20 + out / 8);
  day1(a, 2); day1(b, 2);
  const p1 = a.oil.state.sharePrice;
  assert.equal(p1, b.oil.state.sharePrice);
  assert.equal(a.rng.state, rng, 'no game RNG');
  assert.ok(Math.abs(p1 - (30 + (fair - 30) * X.priceAdjust)) <= 30 * X.noise + 0.01, 'by the exchange\'s step');
  a.oil.state.strike = true;
  for (let d = 3; d < 40; d++) day1(a, d);
  const struck = Math.max(5, 20 + a.oil.computeOutput() / 8 - 6);
  assert.ok(Math.abs(a.oil.state.sharePrice - struck) < 3, `a strike takes the price down over days toward ${struck}: ${a.oil.state.sharePrice}`);
  assert.equal(a.oil.state.fair, Math.round(struck * 100) / 100);
});

test('Chuckie\'s Cheese keeps what you pay from now on; what you held before has no cost on record', () => {
  const g = newGame(2013); g.player.money = 1e9;
  const D = g.dairy; const s = D.state;
  s.sharesOwned = 20; // held before
  assert.ok(D.buyShares(10).ok); assert.equal(s.costBasis, undefined);
  const g2 = newGame(2014); g2.player.money = 1e9;
  const q = g2.dairy.quote(10);
  assert.ok(g2.dairy.buyShares(10).ok);
  assert.equal(g2.dairy.state.costBasis, q.gross + q.fee);
  assert.ok(g2.dairy.sellShares(5).ok);
  assert.equal(g2.dairy.state.costBasis, Math.round((q.gross + q.fee) * 0.5));
  assert.equal(g2.corp.exchange.find('CHZ').cost, g2.dairy.state.costBasis);
});

test('an old save with Ober\'s Oil shares keeps its price and its holding; nothing is charged or given on loading', () => {
  const g = newGame(2015); g.player.money = 1e6;
  g.oil.state.sharesOwned = 12; g.oil.state.sharePrice = 31;
  delete g.oil.state.costBasis;
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.equal(g2.oil.state.sharePrice, 31); assert.equal(g2.oil.state.sharesOwned, 12); assert.equal(g2.player.money, 1e6);
  assert.equal(g2.corp.exchange.find('OBRO').cost, null, 'no cost on record');
});
