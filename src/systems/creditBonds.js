// Corporate bonds (v0.71.0): game.corp.credit — bonds issued by the wider world's listed companies.
//
// Each listed company, once the exchange can price it, issues one 3-year bond (a twentieth of its worth) at par with a coupon of
// the policy rate plus a spread for its rating, and issues another a month after the last is repaid. You may buy lots of an issue (a
// twentieth of it at most), collect a month's coupon every thirty days and the face at the end, or sell at what the bond is worth at
// the company's rating today, less a 1% spread. A company's rating follows its own books every day, so its bond's price does. It
// defaults only when the world's simulation closes it: lenders then get the world's recovery rate, once; if it is taken over, the
// bonds are repaid at par. The issue is a market of its own beside the company's books — it does not change them.
import { MONTH, YEAR, yieldFor, valueOf } from '../corp/bonds.js';
import { rate as rateOf, spreadOf, recovery, issueFace, RATINGS } from '../corp/credit.js';

export const CREDIT = { years: 3, minFace: 1000, step: 100, maxShare: 0.05, spread: 0.01, reissueDays: 30, logKept: 40 };
const money = (n) => Math.round(n).toLocaleString();

export class Credit {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.credit || null; }
  ensure() { return (this.K.state.credit ||= { v: 1, issues: {}, lots: [], nextId: 1, nextIssue: 1, log: [], earned: 0, lastDay: 0 }); }
  policy() { return this.K.bank.rate(); }

  note(text) {
    const s = this.ensure();
    s.log.push({ day: this.day, text });
    while (s.log.length > CREDIT.logKept) s.log.shift();
  }

  record(ticker) { return (this.K.state.generated || []).find((c) => c.ticker === ticker) || null; }

  // ------------------------------------------------------------- the issues
  /** An issue as the screens show it: its rating and what a bond is worth today. */
  view(i) {
    const lot = { face: 100, coupon: i.coupon, due: this.nextDue(i), end: i.end };
    const price = valueOf(lot, this.day, this.policy(), spreadOf(i.rating));
    const held = this.lots().filter((l) => l.issue === i.id).reduce((a, l) => a + l.face, 0);
    return { ...i, price, yield: yieldFor(this.policy(), Math.max(0, (i.end - this.day) / YEAR)) + spreadOf(i.rating), held, room: Math.max(0, Math.floor(i.face * CREDIT.maxShare) - held) };
  }

  /** Issues you can buy now, best rating first. */
  offers() {
    const s = this.peek();
    return Object.values(s?.issues || {}).filter((i) => i.status === 'open' && i.end > this.day).map((i) => this.view(i)).sort((a, b) => a.spreadRank - b.spreadRank || (a.ticker < b.ticker ? -1 : 1));
  }

  lots() { return this.peek()?.lots || []; }

  lotView(l) {
    const i = this.peek().issues[l.issue];
    const value = l.status === 'open' ? valueOf(l, this.day, this.policy(), spreadOf(i.rating)) : 0;
    return { ...l, rating: i.rating, name: i.name, ticker: i.ticker, issueStatus: i.status, value, sale: Math.round(value * (1 - CREDIT.spread)), daysLeft: l.end - this.day, perMonth: Math.round((l.face * l.coupon) / 12) };
  }

  portfolio() {
    const rows = this.lots().map((l) => this.lotView(l));
    return { rows, face: rows.reduce((a, r) => a + r.face, 0), value: rows.reduce((a, r) => a + r.value, 0), earned: this.peek()?.earned || 0 };
  }

  holdingsValue() { return this.lots().reduce((a, l) => a + this.lotView(l).value, 0); }

  // ------------------------------------------------------------- trading
  buy(issueId, face) {
    face = Math.floor(Number(face));
    const s = this.peek();
    const i = s?.issues[issueId];
    if (!i || i.status !== 'open') return { ok: false, text: 'That bond is no longer on offer.' };
    if (!(face >= CREDIT.minFace) || face % CREDIT.step) return { ok: false, text: `A bond is for at least ${money(CREDIT.minFace)} obols, in hundreds.` };
    const v = this.view(i);
    if (face > v.room) return { ok: false, text: v.room > 0 ? `One investor may hold at most a twentieth of an issue: you can buy ${money(v.room)} more of ${i.ticker}.` : `You hold as much of ${i.ticker}'s bond as one investor may.` };
    const g = this.g;
    const cost = Math.round((face * v.price) / 100);
    if (g.player.money < cost) return { ok: false, text: 'You cannot afford that.' };
    g.player.money -= cost;
    const lot = { id: `cb_${s.nextId++}`, issue: i.id, face, coupon: i.coupon, bought: this.day, due: this.nextDue(i), end: i.end, cost, coupons: 0, status: 'open' };
    s.lots.push(lot);
    g.bus.emit('money:changed', { delta: -cost, total: g.player.money });
    this.note(`Bought ${money(face)} of ${i.ticker}'s bond (${i.rating}) for ${money(cost)}.`);
    return { ok: true, lot, text: `Bought ${money(face)} of ${i.name}'s bond (${i.rating}) for ${money(cost)} obols: ${(i.coupon * 100).toFixed(2)}% a year, repaid on day ${i.end}.` };
  }

  /** The issue's coupon days are every thirty days from its issue day. */
  nextDue(i) { return i.issued + Math.ceil((this.day - i.issued + 1) / MONTH) * MONTH; }

  sell(id) {
    const s = this.peek();
    const l = s?.lots.find((x) => x.id === id);
    if (!l) return { ok: false, text: 'You do not hold that bond.' };
    const v = this.lotView(l);
    if (v.issueStatus !== 'open') return { ok: false, text: 'That bond can no longer be sold.' };
    const g = this.g;
    const lock = g.corp.lending.checkRelease({ kind: 'corpBond', value: v.value, rating: v.rating });
    if (!lock.ok) return lock; // v0.73.0: bonds pledged to a loan cannot be sold
    s.lots = s.lots.filter((x) => x !== l);
    g.player.money += v.sale;
    g.bus.emit('money:changed', { delta: v.sale, total: g.player.money });
    this.note(`Sold ${money(l.face)} of ${v.ticker}'s bond for ${money(v.sale)} (worth ${money(v.value)} at its ${v.rating} rating, less a ${CREDIT.spread * 100}% spread; paid ${money(l.cost)}).`);
    return { ok: true, text: `Sold for ${money(v.sale)} obols (${v.sale >= l.cost ? 'a gain' : 'a loss'} of ${money(Math.abs(v.sale - l.cost))} on what you paid, not counting coupons).` };
  }

  // ------------------------------------------------------------- each day
  dailyTick() {
    const K = this.K;
    const ex = K.exchange.peek();
    if (!ex) return;
    const s = this.ensure();
    if (s.lastDay >= this.day) return;
    s.lastDay = this.day;
    const policy = this.policy();
    // issues: ratings follow the books; a company issues once it can be priced, and again a month after its bond is repaid
    for (const l of Object.values(ex.listings)) {
      const c = this.record(l.ticker);
      if (!c) continue;
      const live = c.status === 'active' || c.status === 'distressed';
      const cur = s.issues[l.ticker];
      if (cur && cur.status === 'open') {
        cur.lastDebt = c.debt || cur.lastDebt; cur.lastPlant = c.plantValue || cur.lastPlant;
        if (live) { cur.rating = rateOf(c); cur.spreadRank = RATINGS.indexOf(cur.rating); }
        else this.settle(cur, c);
        continue;
      }
      if (!live || l.status !== 'listed') continue;
      if (cur && this.day < cur.closedDay + CREDIT.reissueDays) continue;
      const rating = rateOf(c);
      const coupon = Math.round((yieldFor(policy, CREDIT.years) + spreadOf(rating)) / 0.0025) * 0.0025;
      const face = issueFace(l.price * l.shares);
      s.issues[l.ticker] = { id: l.ticker, ticker: l.ticker, name: c.name, face, years: CREDIT.years, coupon, rating, spreadRank: RATINGS.indexOf(rating), issued: this.day, end: this.day + CREDIT.years * YEAR, due: this.day + MONTH, status: 'open', serial: s.nextIssue++, lastDebt: c.debt, lastPlant: c.plantValue };
    }
    // coupons and the face for the lots you hold; a lot of a repaid issue goes
    const g = this.g;
    for (const l of [...s.lots]) {
      const i = s.issues[l.issue];
      if (!i || i.status !== 'open') continue;
      let paid = 0;
      while (l.due <= this.day && l.due <= l.end) {
        const last = l.due + MONTH > l.end;
        const cpn = Math.round((l.face * l.coupon) / 12);
        paid += cpn + (last ? l.face : 0);
        l.coupons += 1; s.earned += cpn;
        l.due += MONTH;
        if (last) break;
      }
      if (paid > 0) {
        g.player.money += paid;
        g.bus.emit('money:changed', { delta: paid, total: g.player.money });
        if (l.due > l.end) { s.lots = s.lots.filter((x) => x !== l); this.note(`${i.ticker}'s bond matured: ${money(l.face)} repaid.`); g.tablet.post('stocks', `${i.name}'s bond matured: ${money(paid)} obols paid.`, 'good'); } else g.tablet.post('stocks', `${i.ticker} bond coupon: +${money(paid)} obols.`, 'good');
      }
    }
    // matured issues are closed (the next is made a month later)
    for (const i of Object.values(s.issues)) if (i.status === 'open' && i.end <= this.day && !s.lots.some((l) => l.issue === i.id)) { i.status = 'matured'; i.closedDay = this.day; }
  }

  /** The issuer has closed or been taken over: lenders get the recovery rate (or par), once, and the issue ends. */
  settle(i, c) {
    const s = this.ensure();
    const g = this.g;
    const defaulted = c.status !== 'merged';
    const frac = defaulted ? recovery(i.lastPlant, i.lastDebt) : 1;
    for (const l of [...s.lots].filter((x) => x.issue === i.id)) {
      const pay = Math.round(l.face * frac);
      g.player.money += pay;
      g.bus.emit('money:changed', { delta: pay, total: g.player.money });
      s.lots = s.lots.filter((x) => x !== l);
      this.note(defaulted ? `${i.name} failed: its bond defaulted and you recovered ${money(pay)} of ${money(l.face)} (${Math.round(frac * 100)}%).` : `${i.name} was taken over: its bond was repaid at par (${money(pay)}).`);
      g.tablet.post('stocks', defaulted ? `${i.name} defaulted. Your bond recovered ${money(pay)} of ${money(l.face)}.` : `${i.name} was taken over; its bond was repaid: ${money(pay)}.`, defaulted ? 'warn' : 'good');
    }
    i.status = defaulted ? 'defaulted' : 'repaid'; i.closedDay = this.day; i.recovery = frac;
  }
}
