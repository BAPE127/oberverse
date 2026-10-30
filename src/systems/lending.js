// Lariat State Bank (v0.73.0): game.corp.lending — loans for you, secured on the shares and bonds you hold.
//
// What the bank will lend is a share of what you hold (shares half, government bonds nine tenths, corporate bonds by rating) scaled
// by your borrowing record. A loan is paid back in equal parts every thirty days with the month's interest, at a rate fixed when it
// is signed. If your wallet cannot cover an instalment it becomes arrears that grow at a penalty rate — nothing is taken from you —
// but you cannot borrow again while you are in arrears, your record falls (so the next loan is smaller and dearer), and the holdings
// pledged against what you owe cannot be sold. Wallet loans only: no company account is touched. Nothing is created until a loan.
import { advance, secured, limitFactor, rateFor, quote, dueMonth, TERMS, MIN_LOAN, START_STANDING, PENALTY } from '../corp/lending.js';

const money = (n) => Math.round(n).toLocaleString();
const LOG = 40;

export class Lending {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.lending || null; }
  ensure() { return (this.K.state.lending ||= { v: 1, loans: [], nextId: 1, standing: START_STANDING, onTime: 0, missed: 0, log: [], lastDay: 0 }); }
  standing() { return this.peek()?.standing ?? START_STANDING; }
  note(text) { const s = this.ensure(); s.log.push({ day: this.day, text }); while (s.log.length > LOG) s.log.shift(); }

  // ------------------------------------------------------------- what you hold
  /** Every holding the bank would lend against, at today's value. */
  holdings() {
    const out = [];
    for (const r of this.K.exchange.board()) if (r.held > 0 && r.value > 0 && (r.status ?? 'listed') === 'listed') out.push({ kind: 'share', name: `${r.ticker} · ${r.name}`, value: r.value });
    for (const r of this.K.bonds.portfolio().rows) out.push({ kind: 'govBond', name: `${r.years}-year government bond`, value: r.value });
    for (const r of this.K.credit.portfolio().rows) if (r.issueStatus === 'open') out.push({ kind: 'corpBond', name: `${r.ticker} bond`, value: r.value, rating: r.rating });
    for (const r of this.K.sovereign.portfolio().rows) if (r.issueStatus === 'open' && r.value > 0) out.push({ kind: 'sovBond', name: `${r.name} bond`, value: r.value, rating: r.rating });
    return out.map((i) => ({ ...i, advance: advance(i), secures: Math.round(i.value * advance(i)) }));
  }

  owed() { return this.loans().reduce((a, l) => a + l.outstanding + l.arrears, 0); }
  /** Your own loans (a company's are in `game.corp.business`). */
  loans(all = false) { return (this.peek()?.loans || []).filter((l) => (!l.borrower || l.borrower === 'you') && (all || l.status !== 'repaid')); }
  inArrears() { return this.loans().some((l) => l.arrears > 0); }

  /** What your holdings secure (scaled by your record), what you owe, and what you may still borrow. */
  capacity() {
    const items = this.holdings();
    const total = Math.round(secured(items) * limitFactor(this.standing()));
    const owed = this.owed();
    return { items, total, owed, free: Math.max(0, total - owed), over: Math.max(0, owed - total) };
  }

  // ------------------------------------------------------------- the sale lock
  /** A sale of pledged holdings is refused if it would leave more owed than the rest secures. `item`: { kind, value, rating? }. */
  checkRelease(item) {
    if (!this.owed()) return { ok: true };
    const c = this.capacity();
    const after = c.total - Math.round(Math.max(0, item.value) * advance(item) * limitFactor(this.standing()));
    if (after >= c.owed) return { ok: true };
    return { ok: false, text: `Pledged to Lariat State Bank: you owe ${money(c.owed)} and what you would still hold secures ${money(Math.max(0, after))}. Repay some of the loan first.` };
  }

  // ------------------------------------------------------------- loans
  offer(amount, months) {
    const c = this.capacity();
    const util = c.total ? (c.owed + amount) / c.total : 1;
    const rate = rateFor({ policy: this.K.bank.rate(), util, standing: this.standing() });
    return { rate, months, ...quote(amount, months, rate), free: c.free };
  }

  borrow(amount, months) {
    amount = Math.floor(Number(amount));
    if (!TERMS.includes(months)) return { ok: false, text: 'Choose 6, 12, 24 or 36 months.' };
    if (!(amount >= MIN_LOAN)) return { ok: false, text: `A loan is for at least ${money(MIN_LOAN)} obols.` };
    if (this.inArrears()) return { ok: false, text: 'You are behind on a loan: clear the arrears first.' };
    if (this.standing() < 20) return { ok: false, text: 'Your borrowing record is too poor for another loan.' };
    const c = this.capacity();
    if (amount > c.free) return { ok: false, text: c.items.length ? `Your holdings secure ${money(c.total)} and you owe ${money(c.owed)}: you may borrow up to ${money(c.free)}.` : 'You hold no shares or bonds to borrow against.' };
    const o = this.offer(amount, months);
    const s = this.ensure();
    const g = this.g;
    const loan = { id: `ln_${s.nextId++}`, borrower: 'you', principal: amount, outstanding: amount, rate: o.rate, months, left: months, signed: this.day, due: this.day + 30, arrears: 0, missed: 0, paid: 0, interestPaid: 0, status: 'open' };
    s.loans.push(loan);
    g.player.money += amount;
    g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    this.note(`Borrowed ${money(amount)} over ${months} months at ${(o.rate * 100).toFixed(2)}%.`);
    return { ok: true, loan, text: `Lariat State Bank lent you ${money(amount)} obols over ${months} months at ${(o.rate * 100).toFixed(2)}% (fixed): ${money(o.first)} the first month.` };
  }

  /** Repay early (to the arrears first, then the principal). */
  repay(id, amount) {
    const s = this.peek();
    const l = this.loans().find((x) => x.id === id);
    if (!l) return { ok: false, text: 'No such loan.' };
    const g = this.g;
    amount = Math.min(Math.floor(Number(amount)), l.arrears + l.outstanding);
    if (!(amount > 0)) return { ok: false, text: 'Repay how much?' };
    if (g.player.money < amount) return { ok: false, text: 'You do not have that much.' };
    g.player.money -= amount;
    g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    let left = amount;
    const toArrears = Math.min(l.arrears, left); l.arrears -= toArrears; left -= toArrears;
    l.outstanding -= left;
    if (l.outstanding <= 0 && l.arrears <= 0) { l.status = 'repaid'; l.outstanding = 0; l.closed = this.day; this.note(`Repaid a loan of ${money(l.principal)} in full.`); }
    return { ok: true, text: l.status === 'repaid' ? 'The loan is repaid in full.' : `${money(amount)} repaid. You still owe ${money(l.outstanding + l.arrears)}.` };
  }

  /** Each instalment that has fallen due, once; arrears grow at the penalty rate; the record moves. */
  dailyTick() {
    const s = this.peek();
    if (!s || s.lastDay >= this.day) return;
    s.lastDay = this.day;
    const g = this.g;
    for (const l of this.loans()) {
      if (l.status === 'repaid') continue;
      let guard = 0;
      while (l.due <= this.day && l.status !== 'repaid' && guard++ < 48) {
        const d = dueMonth(l);
        // arrears grow first, on what was owed before this month
        if (l.arrears > 0) l.arrears += d.penalty;
        if (l.left > 0) {
          if (g.player.money >= d.instalment) {
            g.player.money -= d.instalment;
            g.bus.emit('money:changed', { delta: -d.instalment, total: g.player.money });
            l.outstanding -= d.principal; l.interestPaid += d.interest; l.paid += 1;
            s.onTime += 1; s.standing = Math.min(100, s.standing + 0.5);
          } else {
            l.outstanding -= d.principal; l.arrears += d.instalment; l.missed += 1;
            s.missed += 1; s.standing = Math.max(0, s.standing - 8);
            this.note(`Missed an instalment of ${money(d.instalment)}: it is now arrears at ${((l.rate + PENALTY) * 100).toFixed(2)}%.`);
            g.tablet.post('bank', `You missed a loan instalment of ${money(d.instalment)} obols. It is in arrears at ${((l.rate + PENALTY) * 100).toFixed(1)}% and your record has fallen.`, 'warn');
          }
          l.left -= 1;
        }
        l.due += 30;
        if (l.left <= 0 && l.outstanding <= 0 && l.arrears <= 0) { l.status = 'repaid'; l.outstanding = 0; l.closed = this.day; this.note(`Repaid a loan of ${money(l.principal)}.`); g.tablet.post('bank', `Your loan of ${money(l.principal)} is repaid in full.`, 'good'); }
        else if (l.left <= 0 && (l.outstanding > 0 || l.arrears > 0)) l.status = 'overdue';
        if (l.arrears > 0) s.standing = Math.max(0, s.standing - 1);
      }
    }
  }
}
