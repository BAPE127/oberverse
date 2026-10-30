// Foreign government bonds (v0.77.0): game.corp.sovereign — a three-year bond from each of the eight countries.
//
// A country's rating comes from its own finances and its quarrels (see src/corp/sovereign.js): the more it owes, the more war it is in and
// the worse an embargo on it, the lower its treasury has fallen, the worse the rating, and the price of its bonds follows the rating. Coupons come
// every thirty days and the face at the end, as for every bond here. A country goes into distress only if its strain stays at the top for
// ten days (its coupons are then delayed — owed, not paid) and forty (the debt is restructured: lenders get a part of the face, once, and the
// issue ends); nothing about it is random, and a country that recovers pays what it delayed. The arms market's own wars, embargoes and treasuries
// are read as they stand; nothing here changes them. Nothing is made until the arms market is running.
import { SOVEREIGN as S } from '../content/geo.js';
import { MONTH, YEAR, yieldFor, valueOf } from '../corp/bonds.js';
import { spreadOf } from '../corp/credit.js';
import { debtTrait, strainOf, ratingOf, distressStep, recoveryOf, issueFace } from '../corp/sovereign.js';
import { hashUnit } from '../aero/config.js';

const money = (n) => Math.round(n).toLocaleString();

export class Sovereign {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.sovereign || null; }
  ensure() { return (this.K.state.sovereign ||= { v: 1, issues: {}, lots: [], nextId: 1, nextIssue: 1, log: [], earned: 0, lastDay: 0 }); }
  policy() { return this.K.bank.rate(); }
  cfg(id) { return this.g.content.arms.countries[id]; }
  note(text) { const s = this.ensure(); s.log.push({ day: this.day, text }); while (s.log.length > S.logKept) s.log.shift(); }

  // ------------------------------------------------------------- a country's finances
  /** The causes of a country's strain, today: what an owner of its bond can read (nothing hidden, nothing about tomorrow). */
  causes(id) {
    const def = this.cfg(id);
    const m = this.g.world.market?.countries?.[id];
    const geo = this.K.geo;
    let war = 0; let embargo = 0;
    for (const e of geo.events()) {
      const p = geo.phase(e) * e.severity;
      if (e.kind === 'war' && e.parties.includes(id)) war += p;
      if (e.kind === 'embargo' && e.target === id) embargo += p;
    }
    const incomes = Object.keys(this.g.content.arms.countries).map((c) => this.cfg(c).income);
    const trait = debtTrait(hashUnit(`sov|${id}`), def.income, Math.max(...incomes));
    const treasury = m ? m.budget / def.budget : 1;
    return { trait, war, embargo, treasury };
  }

  strain(id) { return strainOf(this.causes(id), S); }

  // ------------------------------------------------------------- the issues
  view(i) {
    const lot = { face: 100, coupon: i.coupon, due: this.nextDue(i), end: i.end };
    const spread = spreadOf(i.rating);
    const price = i.status === 'open' ? valueOf(lot, this.day, this.policy(), spread) : Math.min(valueOf(lot, this.day, this.policy(), spread), i.recoveryNow * 100);
    const held = this.lots().filter((l) => l.issue === i.id).reduce((a, l) => a + l.face, 0);
    return { ...i, price, yield: yieldFor(this.policy(), Math.max(0, (i.end - this.day) / YEAR)) + spread, held, room: Math.max(0, Math.floor(i.face * S.maxShare) - held), causes: this.causes(i.country) };
  }

  nextDue(i) { return i.issued + Math.ceil((this.day - i.issued + 1) / MONTH) * MONTH; }
  issues() { return Object.values(this.peek()?.issues || {}); }
  /** What you can buy now: open or delayed issues, by country name. */
  offers() { return this.issues().filter((i) => (i.status === 'open' || i.status === 'delayed') && i.end > this.day).map((i) => this.view(i)).sort((a, b) => a.name < b.name ? -1 : 1); }
  lots() { return this.peek()?.lots || []; }

  lotView(l) {
    const i = this.peek().issues[l.issue];
    const v = this.view(i);
    const value = l.status === 'open' ? Math.min(valueOf(l, this.day, this.policy(), spreadOf(i.rating)), i.status === 'delayed' ? i.recoveryNow * l.face : Infinity) + (l.owed || 0) * (i.status === 'delayed' ? i.recoveryNow : 1) : 0;
    return { ...l, rating: i.rating, name: i.name, country: i.country, issueStatus: i.status, value, sale: Math.round(value * (1 - S.spread)), daysLeft: l.end - this.day, perMonth: Math.round((l.face * l.coupon) / 12), owed: l.owed || 0, causes: v.causes };
  }

  portfolio() {
    const rows = this.lots().map((l) => this.lotView(l));
    return { rows, face: rows.reduce((a, r) => a + r.face, 0), value: rows.reduce((a, r) => a + r.value, 0), earned: this.peek()?.earned || 0 };
  }
  holdingsValue() { return this.lots().reduce((a, l) => a + this.lotView(l).value, 0); }

  // ------------------------------------------------------------- trading
  buy(country, face) {
    face = Math.floor(Number(face));
    const i = this.peek()?.issues[country];
    if (!i || (i.status !== 'open' && i.status !== 'delayed')) return { ok: false, text: 'That country has no bond on offer.' };
    if (i.status === 'delayed') return { ok: false, text: `${i.name} has delayed its payments: no new bonds are sold.` };
    if (!(face >= S.minFace) || face % S.step) return { ok: false, text: `A bond is for at least ${money(S.minFace)} obols, in hundreds.` };
    const v = this.view(i);
    if (face > v.room) return { ok: false, text: v.room > 0 ? `One investor may hold at most a twentieth of an issue: you can buy ${money(v.room)} more of ${i.name}'s.` : `You hold as much of ${i.name}'s bond as one investor may.` };
    const g = this.g;
    const cost = Math.round((face * v.price) / 100);
    if (g.player.money < cost) return { ok: false, text: 'You cannot afford that.' };
    g.player.money -= cost;
    const s = this.ensure();
    const lot = { id: `sb_${s.nextId++}`, issue: i.id, face, coupon: i.coupon, bought: this.day, due: this.nextDue(i), end: i.end, cost, coupons: 0, owed: 0, status: 'open' };
    s.lots.push(lot);
    g.bus.emit('money:changed', { delta: -cost, total: g.player.money });
    this.note(`Bought ${money(face)} of ${i.name}'s bond (${i.rating}) for ${money(cost)}.`);
    return { ok: true, lot, text: `Bought ${money(face)} obols of ${i.name}'s ${S.years}-year bond (${i.rating}) at ${v.price.toFixed(1)} per 100: ${(i.coupon * 100).toFixed(2)}% a year.` };
  }

  sell(id) {
    const s = this.peek();
    const l = s?.lots.find((x) => x.id === id);
    if (!l) return { ok: false, text: 'You do not hold that bond.' };
    const v = this.lotView(l);
    if (v.issueStatus === 'restructured') return { ok: false, text: 'That bond can no longer be sold.' };
    const g = this.g;
    if (v.issueStatus === 'open') { // a delayed bond is not counted as collateral, so selling it cannot take security away
      const lock = g.corp.lending.checkRelease({ kind: 'sovBond', value: v.value, rating: v.rating });
      if (!lock.ok) return lock;
    }
    s.lots = s.lots.filter((x) => x !== l);
    g.player.money += v.sale;
    g.bus.emit('money:changed', { delta: v.sale, total: g.player.money });
    this.note(`Sold ${money(l.face)} of ${v.name}'s bond for ${money(v.sale)} (worth ${money(v.value)} at its ${v.rating} rating, less a ${S.spread * 100}% spread; paid ${money(l.cost)}).`);
    return { ok: true, text: `Sold for ${money(v.sale)} obols (${v.sale >= l.cost ? 'a gain' : 'a loss'} of ${money(Math.abs(v.sale - l.cost))} on what you paid, not counting coupons).` };
  }

  // ------------------------------------------------------------- each day
  dailyTick() {
    if (!this.g.world.market?.countries) return; // the arms market has not started: there is no world to lend to
    const s = this.ensure();
    if (s.lastDay >= this.day) return;
    s.lastDay = this.day;
    const g = this.g;
    const policy = this.policy();
    for (const id of Object.keys(g.content.arms.countries)) {
      const def = this.cfg(id);
      const strain = this.strain(id);
      const rating = ratingOf(strain, S);
      let i = s.issues[id];
      if (!i || i.status === 'matured' || i.status === 'restructured') {
        if (i && this.day < i.closedDay + S.reissueDays) continue;
        if (i?.status === 'restructured' && strain >= S.distress) continue; // no new issue while it is still at the top of the strain
        const coupon = Math.round((yieldFor(policy, S.years) + spreadOf(rating)) / 0.0025) * 0.0025;
        i = s.issues[id] = { id, country: id, name: def.name, face: issueFace(def.income, S), years: S.years, coupon, rating, strain, issued: this.day, end: this.day + S.years * YEAR, status: 'open', distressDays: 0, serial: s.nextIssue++, recoveryNow: 1 };
        this.note(`${def.name} issued a ${S.years}-year bond (${rating}).`);
        continue;
      }
      // the rating follows the strain; a change is recorded, and told if you hold the bond
      i.strain = strain;
      if (rating !== i.rating) {
        const worse = ['AA', 'A', 'BBB', 'BB', 'B', 'CCC'].indexOf(rating) > ['AA', 'A', 'BBB', 'BB', 'B', 'CCC'].indexOf(i.rating);
        this.note(`${def.name} ${worse ? 'downgraded' : 'upgraded'} from ${i.rating} to ${rating}.`);
        if (s.lots.some((l) => l.issue === id)) g.tablet.post('stocks', `${def.name}'s bond was ${worse ? 'downgraded' : 'upgraded'} to ${rating}.`, worse ? 'warn' : 'good');
        i.rating = rating;
      }
      // distress: counted in days at the top of the strain; the state follows the count
      const st = distressStep(i.distressDays, strain, S);
      i.distressDays = st.days;
      i.recoveryNow = recoveryOf(strain, S);
      if (st.state === 'delayed' && i.status === 'open') { i.status = 'delayed'; this.note(`${def.name} has delayed its payments.`); if (s.lots.some((l) => l.issue === id)) g.tablet.post('stocks', `${def.name} has delayed the payments on its bond.`, 'warn'); }
      else if (st.state === 'normal' && i.status === 'delayed') { i.status = 'open'; this.note(`${def.name} is paying again.`); if (s.lots.some((l) => l.issue === id)) g.tablet.post('stocks', `${def.name} is paying its bond again.`, 'good'); }
      else if (st.state === 'restructure') { this.restructure(i); continue; }
      this.pay(i);
    }
    // a matured issue is closed once nobody holds it
    for (const i of Object.values(s.issues)) if (i.status === 'open' && i.end <= this.day && !s.lots.some((l) => l.issue === i.id)) { i.status = 'matured'; i.closedDay = this.day; }
  }

  /** Coupons and the face for the lots you hold: paid while the country pays; owed (and paid when it recovers) while it has delayed. */
  pay(i) {
    const s = this.peek();
    const g = this.g;
    for (const l of [...s.lots].filter((x) => x.issue === i.id)) {
      let paid = 0;
      while (l.due <= this.day && l.due <= l.end) {
        const last = l.due + MONTH > l.end;
        const cpn = Math.round((l.face * l.coupon) / 12);
        if (i.status === 'delayed') { l.owed = (l.owed || 0) + cpn + (last ? l.face : 0); l.due += MONTH; if (last) break; continue; }
        paid += cpn + (last ? l.face : 0);
        l.coupons += 1; s.earned += cpn;
        l.due += MONTH;
        if (last) break;
      }
      if (i.status === 'open' && l.owed > 0) { paid += l.owed; this.note(`${i.name} paid the ${money(l.owed)} it had delayed.`); l.owed = 0; }
      if (paid > 0) {
        g.player.money += paid;
        g.bus.emit('money:changed', { delta: paid, total: g.player.money });
        if (l.due > l.end && !(l.owed > 0)) { s.lots = s.lots.filter((x) => x !== l); this.note(`${i.name}'s bond matured: ${money(l.face)} repaid.`); g.tablet.post('stocks', `${i.name}'s bond matured: ${money(paid)} obols paid.`, 'good'); } else g.tablet.post('stocks', `${i.name} bond coupon: +${money(paid)} obols.`, 'good');
      }
    }
  }

  /** The debt is restructured: lenders get a part of the face, once, and what was delayed is written off; the issue ends. */
  restructure(i) {
    const s = this.peek();
    const g = this.g;
    const frac = recoveryOf(i.strain, S);
    for (const l of [...s.lots].filter((x) => x.issue === i.id)) {
      const pay = Math.round(l.face * frac);
      g.player.money += pay;
      g.bus.emit('money:changed', { delta: pay, total: g.player.money });
      s.lots = s.lots.filter((x) => x !== l);
      this.note(`${i.name} restructured its debt: your bond recovered ${money(pay)} of ${money(l.face)} (${Math.round(frac * 100)}%).`);
      g.tablet.post('stocks', `${i.name} restructured its debt. Your bond recovered ${money(pay)} of ${money(l.face)}.`, 'warn');
    }
    i.status = 'restructured'; i.closedDay = this.day; i.recovery = frac;
    this.note(`${i.name} restructured its debt: lenders recover ${Math.round(frac * 100)}% of the face.`);
  }
}
