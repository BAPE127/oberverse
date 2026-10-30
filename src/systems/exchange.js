// The exchange (v0.66.0): game.corp.exchange — every listed company on one board.
//
// The three shares the game already had (Ober's Oil, Chuckie's Cheese, Meridian Aerospace) are read through as
// they are: their own prices, dividends and rules, unchanged. The listed companies of the wider world are
// traded here under one set of rules (CORP.exchange): a price that moves part of the way each day to what the
// company's own books say a share is worth, a broker's fee each way, a cap on what one investor may hold, and
// the dividends the company really pays out of its profit. Nothing here uses the game's RNG, creates a share
// outside a listing, or moves money except a purchase, a sale or a dividend the player is owed.
import { CORP } from '../content/corporate.js';
import { OIL_LISTED } from './oilCompany.js';
import { listingShares, fairPrice, nextPrice, quote, maxHold, roomFor } from '../corp/exchange.js';
import { hashUnit } from '../aero/config.js';

const X = CORP.exchange;
const money = (n) => Math.round(n).toLocaleString();

export class Exchange {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.exchange || null; }

  /** Created together with the wider world, so every price has a history from the first day. */
  ensure() {
    return (this.K.state.exchange ||= { v: 1, listings: {}, holdings: {}, log: [], lastDay: 0, divMonth: Math.floor((this.day - 1) / 30) - 1 });
  }

  note(text) {
    const s = this.ensure();
    s.log.push({ day: this.day, text });
    while (s.log.length > X.logKept) s.log.shift();
  }

  // ------------------------------------------------------------- the companies of the wider world
  rowsById() {
    const m = new Map();
    for (const r of this.K.registry()) if (r.kind === 'generated') m.set(r.id, r);
    return m;
  }

  record(id) { return (this.K.state.generated || []).find((c) => c.id === id) || null; }

  /** What one share of a company is worth on its own books today: its estimated value over its listed shares. */
  fairOf(l, row) {
    const v = this.K.metricsOf(row).valuation;
    return v === null || v === undefined ? null : fairPrice(v, l.shares);
  }

  /** Once a day: list what has just become priced, move every price, settle what has closed, and pay what is owed. */
  dailyTick() {
    const K = this.K;
    if (!K.state.generated?.length) return;
    const s = this.ensure();
    if (s.lastDay >= this.day) return;
    s.lastDay = this.day;
    const salt = K.state.gen.salt;
    const rows = this.rowsById();
    for (const c of K.state.generated) {
      if (!c.ticker) continue;
      const live = c.status === 'active' || c.status === 'distressed';
      let l = s.listings[c.ticker];
      if (!l) {
        if (!live) continue;
        const v = K.metricsOf(rows.get(c.id)).valuation;
        if (v === null || v === undefined || v <= 0) continue; // not priced until its books say something
        const target = X.target[0] + hashUnit(`${salt}|${c.ticker}|px`) * (X.target[1] - X.target[0]);
        const shares = listingShares(v, target);
        l = s.listings[c.ticker] = { id: c.id, ticker: c.ticker, shares, price: Math.max(X.minPrice, Math.round((v / shares) * 100) / 100), fair: v / shares, since: this.day, status: 'listed', history: [] };
        l.history.push({ day: this.day, price: l.price, fair: Math.round(l.fair * 100) / 100 });
        continue;
      }
      if (l.status !== 'listed') continue;
      if (!live) { this.delist(l, c); continue; }
      const fair = this.fairOf(l, rows.get(c.id));
      if (fair === null) continue;
      l.fair = fair;
      l.price = nextPrice(X, l.price, fair, hashUnit(`${salt}|${c.ticker}|${this.day}`));
      l.history.push({ day: this.day, price: l.price, fair: Math.round(fair * 100) / 100 });
      if (l.history.length > X.historyDays) l.history.shift();
    }
    this.payDividends();
  }

  /** A company that has closed or been bought: a failure's shares are worth nothing; a takeover pays out at the last price. */
  delist(l, c) {
    const s = this.ensure();
    l.status = c.status === 'merged' ? 'bought out' : 'failed';
    const h = s.holdings[l.ticker];
    if (h?.n > 0) {
      const g = this.g;
      if (l.status === 'bought out') {
        const pay = Math.round(h.n * l.price);
        g.player.money += pay;
        g.bus.emit('money:changed', { delta: pay, total: g.player.money });
        this.note(`${c.name} (${l.ticker}) was taken over: your ${h.n.toLocaleString()} shares were bought at ${l.price.toFixed(2)} for ${money(pay)} obols.`);
        g.tablet.post('stocks', `${c.name} was taken over: your ${h.n.toLocaleString()} ${l.ticker} shares were bought out for ${money(pay)} obols.`, 'good');
      } else {
        this.note(`${c.name} (${l.ticker}) failed: your ${h.n.toLocaleString()} shares are worth nothing.`);
        g.tablet.post('stocks', `${c.name} failed. Your ${h.n.toLocaleString()} ${l.ticker} shares are worth nothing.`, 'warn');
      }
      h.closed = { day: this.day, status: l.status, shares: h.n };
      h.n = 0; h.cost = 0;
    }
    if (l.status === 'failed') l.price = 0;
  }

  /** Each closed month's dividend (what the company paid out of that month's profit) to the player's shares, once. */
  payDividends() {
    const s = this.ensure();
    const month = Math.floor((this.day - 1) / 30);
    for (let m = Math.max(s.divMonth + 1, month - 3); m <= month - 1; m++) {
      for (const l of Object.values(s.listings)) {
        const h = s.holdings[l.ticker];
        if (l.status !== 'listed' || !(h?.n > 0)) continue;
        const c = this.record(l.id);
        const row = c?.months.find((x) => x[0] === m);
        const total = row ? row[7] : 0;
        const pay = Math.floor((total / l.shares) * h.n);
        if (pay <= 0) continue;
        const g = this.g;
        g.player.money += pay; h.divs = (h.divs || 0) + pay;
        g.bus.emit('money:changed', { delta: pay, total: g.player.money });
        this.note(`${c.name} (${l.ticker}) paid a dividend: ${money(pay)} obols on your ${h.n.toLocaleString()} shares.`);
        g.tablet.post('stocks', `${c.name} paid a dividend: +${money(pay)} obols on your ${h.n.toLocaleString()} ${l.ticker}.`, 'good');
      }
    }
    s.divMonth = Math.max(s.divMonth, month - 1);
  }

  // ------------------------------------------------------------- the board
  /** Every listed company, the three old ones as they are and the wider world's under the exchange's own rules. */
  board() {
    const g = this.g;
    const out = [];
    const oil = g.oil.state;
    out.push({ ticker: 'OBRO', name: 'Ober\'s Oil', sector: 'energy', source: 'oil', price: oil.sharePrice, prev: oil.history.at(-2)?.price ?? null, held: oil.sharesOwned, cost: oil.costBasis ?? null, divs: oil.dividendsPaid, fee: X.fee, cap: maxHold(X, OIL_LISTED), shares: OIL_LISTED, fair: oil.fair, history: oil.history.map((h) => h.price), own: 'Ober\'s Oil is worth what the refinery\'s output says (that is its "worth on its books"), pays a dividend every evening from real output, and follows the exchange\'s rules since v0.67.0. Its expansion projects, which bring bonus shares, are in the Stocks app; shares from a project have no cost on record, so a gain is not shown once you hold some.' });
    const dc = g.content.dairy.config; const dz = g.dairy.state;
    out.push({ ticker: dc.ticker, name: dc.company, sector: 'agriculture', source: 'dairy', price: dz.sharePrice, prev: dz.history.at(-2)?.price ?? null, held: dz.sharesOwned, cost: dz.costBasis ?? null, divs: dz.dividendsPaid, fee: dc.fee ?? g.dairy.cfg.fee, cap: g.dairy.cfg.maxPlayerShares, shares: g.dairy.cfg.shares, fair: g.dairy.fairValue(), history: dz.history.map((h) => h.price), own: 'Chuckie\'s Cheese has always had a broker\'s fee and a cap (1% of the company: Chuckie keeps control); its price follows its milk and cheese toward what its books are worth, and it pays a dividend every evening. Shares you held before v0.67.0 have no cost on record.' });
    const mk = g.aero.state.market; const mer = g.aero.meridian;
    out.push({ ticker: g.aero.A.meridian.ticker, name: mer.name, sector: 'aerospace', source: 'aero', price: mk.price, prev: mk.history.at(-2)?.price ?? null, held: mk.sharesOwned, cost: mk.costBasis, divs: mk.dividendsPaid, fee: g.aero.A.exchange.fee, cap: g.aero.maxShares(), shares: mer.shares, history: mk.history.map((h) => h.price), own: 'Meridian\'s shares follow its books under the exchange\'s rules: a broker\'s fee each way, and no investor may hold more than 5%; it pays a dividend on Moondays.' });
    const s = this.peek();
    for (const l of Object.values(s?.listings || {})) {
      const c = this.record(l.id);
      const h = s.holdings[l.ticker] || { n: 0, cost: 0, divs: 0 };
      out.push({ ticker: l.ticker, name: c?.name || l.ticker, sector: c?.sector, source: 'generated', price: l.price, prev: l.history.at(-2)?.price ?? null, held: h.n, cost: h.cost, divs: h.divs || 0, fee: X.fee, cap: maxHold(X, l.shares), shares: l.shares, fair: l.fair, status: l.status, history: l.history.map((x) => x.price), closed: h.closed || null });
    }
    return out.map((r) => ({ ...r, value: Math.round(r.held * r.price), change: r.prev ? (r.price - r.prev) / r.prev : null }));
  }

  /** Totals over every share the player holds. `cost` and `gain` count only holdings whose cost is known. */
  portfolio() {
    const rows = this.board().filter((r) => r.held > 0);
    const value = rows.reduce((a, r) => a + r.value, 0);
    const known = rows.filter((r) => r.cost !== null);
    const cost = known.reduce((a, r) => a + r.cost, 0);
    return { rows, value, cost, gain: known.reduce((a, r) => a + r.value - r.cost, 0), knownValue: known.reduce((a, r) => a + r.value, 0), divs: rows.reduce((a, r) => a + r.divs, 0), unknownCost: rows.some((r) => r.cost === null) };
  }

  find(ticker) { return this.board().find((r) => r.ticker === ticker) || null; }

  // ------------------------------------------------------------- trading
  quoteFor(ticker, n) {
    const r = this.find(ticker);
    if (!r) return null;
    const q = quote({ fee: r.fee }, r.price, n);
    return { ...q, total: q.gross + q.fee };
  }

  /** Buy or sell. The three old shares go through their own rules; a wider-world listing through the exchange's. */
  buy(ticker, n) {
    const r = this.find(ticker);
    n = Math.floor(n);
    if (!r) return { ok: false, text: 'No such company is listed.' };
    if (r.source === 'oil') return this.g.oil.buyShares(n);
    if (r.source === 'dairy') return this.g.dairy.buyShares(n);
    if (r.source === 'aero') return this.g.aero.buyShares(n);
    const s = this.ensure();
    const l = s.listings[ticker];
    if (l.status !== 'listed') return { ok: false, text: `${ticker} is no longer traded.` };
    if (!(n > 0)) return { ok: false, text: 'Buy how many?' };
    const h = (s.holdings[ticker] ||= { n: 0, cost: 0, divs: 0 });
    const room = roomFor(X, l.shares, h.n);
    if (n > room) return { ok: false, text: room > 0 ? `One investor may hold at most ${maxHold(X, l.shares).toLocaleString()} ${ticker}: you can buy ${room.toLocaleString()} more.` : `You hold as much ${ticker} as one investor may.` };
    const q = quote(X, l.price, n);
    const g = this.g;
    if (g.player.money < q.gross + q.fee) return { ok: false, text: 'You cannot afford that many shares (with the broker\'s fee).' };
    g.player.money -= q.gross + q.fee;
    h.n += n; h.cost += q.gross + q.fee; delete h.closed;
    g.bus.emit('money:changed', { delta: -(q.gross + q.fee), total: g.player.money });
    return { ok: true, text: `Bought ${n.toLocaleString()} ${ticker} for ${money(q.gross)} obols (+${money(q.fee)} fee).` };
  }

  sell(ticker, n) {
    const r = this.find(ticker);
    n = Math.floor(n);
    if (!r) return { ok: false, text: 'No such company is listed.' };
    if (r.source === 'oil') return this.g.oil.sellShares(n);
    if (r.source === 'dairy') return this.g.dairy.sellShares(n);
    if (r.source === 'aero') return this.g.aero.sellShares(n);
    const s = this.ensure();
    const l = s.listings[ticker];
    const h = s.holdings[ticker];
    if (l.status !== 'listed') return { ok: false, text: `${ticker} is no longer traded.` };
    if (!(n > 0) || !h || h.n < n) return { ok: false, text: 'You do not own that many shares.' };
    const q = quote(X, l.price, n);
    const g = this.g;
    const lock = g.corp.lending.checkRelease({ kind: 'share', value: q.gross });
    if (!lock.ok) return lock; // v0.73.0: shares pledged to a loan cannot be sold
    const value = Math.max(0, q.gross - q.fee);
    h.cost = Math.round(h.cost * (1 - n / h.n));
    h.n -= n;
    g.player.money += value;
    g.bus.emit('money:changed', { delta: value, total: g.player.money });
    return { ok: true, text: `Sold ${n.toLocaleString()} ${ticker} for ${money(value)} obols (after a ${money(q.fee)} fee).` };
  }
}
