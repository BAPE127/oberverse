// Government bonds (v0.69.0): game.corp.bonds — what the First Bank of Halvermouth sells on behalf of the government.
//
// Three terms (1, 3, 5 years) on offer at any time, issued at par with a coupon equal to the policy rate plus the term's premium.
// Coupons come every thirty days and the face at the end. A bond can be sold back at any time for what it is worth at today's
// yield, less a half-percent spread. They are your own investment, paid for from your wallet like shares; the money is not any
// company's. Nothing is created until the first purchase.
import { TERMS, YEAR, MONTH, couponAt, yieldFor, valueOf } from '../corp/bonds.js';

export const BONDS = { minFace: 1000, step: 100, maxFacePerTerm: 2_000_000, spread: 0.005, logKept: 40 };
const money = (n) => Math.round(n).toLocaleString();

export class Bonds {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.bonds || null; }
  ensure() { return (this.K.state.bonds ||= { v: 1, lots: [], nextId: 1, log: [], earned: 0, lastDay: 0 }); }
  rate() { return this.K.bank.rate(); }
  /** What yields are built on: the policy rate and what the wars of the day add (v0.76.0). */
  base() { return this.rate() + this.K.geo.premium() + this.K.game.robbery.premium(); }
  /** What lending counts: the same without a robbery's market reaction (a robbery of the central bank never changes what you may borrow) — v0.79.0. */
  collateral() { return this.lots().map((l) => ({ years: l.years, value: valueOf(l, this.day, this.rate() + this.K.geo.premium()) })); }

  note(text) {
    const s = this.ensure();
    s.log.push({ day: this.day, text });
    while (s.log.length > BONDS.logKept) s.log.shift();
  }

  /** What is on offer today: each term's yield and coupon, and how much more of it you may hold. */
  offers() {
    const r = this.base();
    return TERMS.map((years) => ({ years, yield: yieldFor(r, years), coupon: couponAt(r, years), room: BONDS.maxFacePerTerm - this.faceHeld(years) }));
  }

  lots() { return this.peek()?.lots || []; }
  faceHeld(years) { return this.lots().filter((l) => l.years === years).reduce((a, l) => a + l.face, 0); }

  /** A lot as the screens show it. */
  view(l) {
    const value = valueOf(l, this.day, this.base());
    return { ...l, value, sale: Math.round(value * (1 - BONDS.spread)), daysLeft: l.end - this.day, perMonth: Math.round((l.face * l.coupon) / 12) };
  }

  portfolio() {
    const rows = this.lots().map((l) => this.view(l));
    return { rows, face: rows.reduce((a, r) => a + r.face, 0), value: rows.reduce((a, r) => a + r.value, 0), paid: rows.reduce((a, r) => a + r.cost, 0), earned: this.peek()?.earned || 0 };
  }

  holdingsValue() { return this.lots().reduce((a, l) => a + valueOf(l, this.day, this.base()), 0); }

  buy(years, face) {
    face = Math.floor(Number(face));
    if (!TERMS.includes(years)) return { ok: false, text: 'No such bond.' };
    if (!(face >= BONDS.minFace) || face % BONDS.step) return { ok: false, text: `A bond is for at least ${money(BONDS.minFace)} obols, in hundreds.` };
    const room = BONDS.maxFacePerTerm - this.faceHeld(years);
    if (face > room) return { ok: false, text: room > 0 ? `One investor may hold at most ${money(BONDS.maxFacePerTerm)} of ${years}-year bonds: you can buy ${money(room)} more.` : `You hold as many ${years}-year bonds as one investor may.` };
    const g = this.g;
    if (g.player.money < face) return { ok: false, text: 'You cannot afford that.' };
    const s = this.ensure();
    const coupon = couponAt(this.base(), years);
    g.player.money -= face;
    const lot = { id: `bond_${s.nextId++}`, years, face, coupon, issued: this.day, due: this.day + MONTH, end: this.day + years * YEAR, cost: face, coupons: 0 };
    s.lots.push(lot);
    g.bus.emit('money:changed', { delta: -face, total: g.player.money });
    this.note(`Bought ${money(face)} of ${years}-year government bonds at ${(coupon * 100).toFixed(2)}%.`);
    return { ok: true, lot, text: `Bought ${money(face)} obols of ${years}-year bonds: ${(coupon * 100).toFixed(2)}% a year, ${money((face * coupon) / 12)} a month, paid back on day ${lot.end}.` };
  }

  sell(id) {
    const s = this.peek();
    const l = s?.lots.find((x) => x.id === id);
    if (!l) return { ok: false, text: 'You do not hold that bond.' };
    const v = this.view(l);
    const g = this.g;
    const lock = g.corp.lending.checkRelease({ kind: 'govBond', value: v.value });
    if (!lock.ok) return lock; // v0.73.0: bonds pledged to a loan cannot be sold
    s.lots = s.lots.filter((x) => x !== l);
    g.player.money += v.sale;
    g.bus.emit('money:changed', { delta: v.sale, total: g.player.money });
    this.note(`Sold ${money(l.face)} of ${l.years}-year bonds for ${money(v.sale)} (worth ${money(v.value)} at today's yield, less a ${BONDS.spread * 100}% spread; paid ${money(l.cost)}).`);
    return { ok: true, text: `Sold for ${money(v.sale)} obols (${v.sale >= l.cost ? 'a gain' : 'a loss'} of ${money(Math.abs(v.sale - l.cost))} on what you paid, not counting the coupons you received).` };
  }

  /** Each coupon that has fallen due, once; the face when a bond ends. */
  dailyTick() {
    const s = this.peek();
    if (!s || s.lastDay >= this.day) return;
    s.lastDay = this.day;
    const g = this.g;
    for (const l of [...s.lots]) {
      let paid = 0;
      while (l.due <= this.day && l.due <= l.end) {
        const last = l.due + MONTH > l.end;
        const c = Math.round((l.face * l.coupon) / 12);
        paid += c + (last ? l.face : 0);
        l.coupons += 1; s.earned += c;
        l.due += MONTH;
        if (last) break;
      }
      if (paid > 0) {
        g.player.money += paid;
        g.bus.emit('money:changed', { delta: paid, total: g.player.money });
        if (l.due > l.end) { s.lots = s.lots.filter((x) => x !== l); this.note(`${l.years}-year bonds matured: ${money(l.face)} repaid.`); g.tablet.post('stocks', `Your ${l.years}-year government bonds matured: ${money(paid)} obols paid (${money(l.face)} of it the face).`, 'good'); }
        else g.tablet.post('stocks', `Government bond coupon: +${money(paid)} obols.`, 'good');
      }
    }
  }
}
