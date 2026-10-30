// Loans to companies (v0.74.0): game.corp.business — Lariat State Bank lends to a company that has its own funded account, on its
// own books alone (a share of what it owns and some months of what it has earned, scaled by its own record). The money goes into
// the company's account as a loan (never revenue), its instalments come out of that account (principal is not a cost, interest is),
// and a missed one is arrears at the penalty rate with nothing seized: the company's managers stop hiring, bidding and expanding
// until it is cleared — and it is cleared only by the company repaying, as with your own loans. An owner may *guarantee* a loan for a lower
// rate (a missed instalment then costs their own borrowing record); a parent may guarantee a subsidiary's (it is called, and what it
// pays becomes an intercompany loan to the subsidiary). Loans share `world.corp.lending` with your own, marked by `borrower`.
import { TERMS, MIN_LOAN, PENALTY, START_STANDING, limitFactor, quote, dueMonth, companyLimit, companyRate, PERSONAL_GUARANTEE_HIT, PURPOSES } from '../corp/lending.js';

const money = (n) => Math.round(n).toLocaleString();

export class BusinessLoans {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  get L() { return this.K.lending; }
  peek() { return this.L.peek(); }

  // ------------------------------------------------------------- who and how much
  loans(id, all = false) { return (this.peek()?.loans || []).filter((l) => l.borrower && l.borrower !== 'you' && (!id || l.borrower === id) && (all || l.status !== 'repaid')); }
  owedBy(id) { return this.loans(id).reduce((a, l) => a + l.outstanding + l.arrears, 0); }
  arrearsOf(id) { return this.loans(id).reduce((a, l) => a + l.arrears, 0); }
  inArrears(id) { return this.arrearsOf(id) > 0; }
  /** What a company owes the bank in all (the books' debt line). */
  totalOwed() { return this.loans().reduce((a, l) => a + l.outstanding + l.arrears, 0); }
  /** What the next instalment will take (so a distribution or a sweep never starves it). */
  dueNext(id) { return this.loans(id).reduce((a, l) => { const d = dueMonth(l); return a + (l.left > 0 ? d.instalment : 0); }, 0); }

  standing(id) { return this.peek()?.company?.[id]?.standing ?? START_STANDING; }
  setStanding(id, v) { const s = this.L.ensure(); ((s.company ||= {})[id] ||= { standing: START_STANDING }).standing = Math.max(0, Math.min(100, v)); }

  /** Companies that could borrow: owned, and holding their own cash. */
  eligible() { return ['arms', 'shipping', 'aerospace', 'farming', 'parent'].filter((id) => this.K.established(id) && this.K.account(id).funded); }

  /** What the bank sees of a company: what it is worth after all it owes, what it earns in a month, and so what it may owe in all. */
  view(id) {
    const K = this.K;
    const a = K.account(id);
    const reg = K.registry().find((r) => r.playerId === id);
    const m = reg ? K.metricsOf(reg) : null;
    const owed = this.owedBy(id);
    const net = m?.netAssets ?? Math.round(a.cash - a.arrears - K.group.payableOf(id) - owed);
    const assets = net; // what it owns less everything it owes, the bank included: borrowing adds cash and debt together, so a loan never raises the ceiling it was lent under
    const monthly = m?.annualProfit != null ? m.annualProfit / 12 : 0;
    const standing = this.standing(id);
    const total = companyLimit({ assets, monthlyNet: monthly, standing });
    return { id, name: K.nameOf(id), cash: Math.round(a.cash), assets: Math.round(assets), monthly: Math.round(monthly), standing, total, owed, free: Math.max(0, total - owed) };
  }

  guarantees(id) {
    const out = ['none', 'personal'];
    const G = this.K.group;
    if (G.isSub(id) && this.K.account('parent').funded) out.push('parent');
    return out;
  }

  offer(id, amount, months, guarantee = 'none') {
    const v = this.view(id);
    const util = v.total ? (v.owed + amount) / v.total : 1;
    const rate = companyRate({ policy: this.K.bank.rate(), util, standing: v.standing, guarantee });
    return { rate, months, guarantee, ...quote(amount, months, rate), free: v.free };
  }

  guaranteeText(id, guarantee) {
    if (guarantee === 'personal') return `You guarantee it: if ${this.K.nameOf(id)} misses an instalment, your own borrowing record falls by ${PERSONAL_GUARANTEE_HIT} points (nothing is taken from you).`;
    if (guarantee === 'parent') return `${this.K.nameOf('parent')} guarantees it: if ${this.K.nameOf(id)} misses an instalment, the parent pays it from its own cash if it can, and ${this.K.nameOf(id)} then owes the parent that sum as an intercompany loan.`;
    return 'Nobody guarantees it: only the company is liable.';
  }

  // ------------------------------------------------------------- borrowing
  borrow(id, amount, months, { guarantee = 'none', purpose = PURPOSES[0] } = {}) {
    amount = Math.floor(Number(amount));
    if (!this.eligible().includes(id)) return { ok: false, text: 'Only a company with its own funded account can borrow.' };
    if (!TERMS.includes(months)) return { ok: false, text: 'Choose 6, 12, 24 or 36 months.' };
    if (!this.guarantees(id).includes(guarantee)) return { ok: false, text: 'That guarantee is not available for this company.' };
    if (!PURPOSES.includes(purpose)) return { ok: false, text: 'Choose what the loan is for.' };
    if (!(amount >= MIN_LOAN)) return { ok: false, text: `A loan is for at least ${money(MIN_LOAN)} obols.` };
    if (this.inArrears(id) || this.K.account(id).arrears > 0) return { ok: false, text: `${this.K.nameOf(id)} is behind on what it owes: clear that first.` };
    if (this.standing(id) < 20) return { ok: false, text: `${this.K.nameOf(id)}'s borrowing record is too poor for another loan.` };
    const v = this.view(id);
    if (amount > v.free) return { ok: false, text: v.total ? `The bank would let ${v.name} owe ${money(v.total)} in all, and it owes ${money(v.owed)}: it may borrow up to ${money(v.free)}.` : `${v.name} has too little behind it (assets ${money(v.assets)}, profit ${money(v.monthly)} a month) to borrow.` };
    const o = this.offer(id, amount, months, guarantee);
    const s = this.L.ensure();
    const loan = { id: `bl_${s.nextId++}`, borrower: id, principal: amount, outstanding: amount, rate: o.rate, months, left: months, signed: this.day, due: this.day + 30, arrears: 0, missed: 0, paid: 0, interestPaid: 0, status: 'open', guarantee, purpose, called: 0 };
    s.loans.push(loan);
    this.K.receive(id, amount, { cat: 'loan' });
    this.L.note(`${v.name} borrowed ${money(amount)} (${purpose.toLowerCase()}) over ${months} months at ${(o.rate * 100).toFixed(2)}%${guarantee !== 'none' ? `, guaranteed by ${guarantee === 'parent' ? 'its parent' : 'you'}` : ''}.`);
    return { ok: true, loan, text: `Lariat State Bank lent ${v.name} ${money(amount)} obols over ${months} months at ${(o.rate * 100).toFixed(2)}% (fixed): ${money(o.first)} the first month.` };
  }

  /** The company repays early from its own account. */
  repay(loanId, amount) {
    const l = this.loans(null).find((x) => x.id === loanId);
    if (!l) return { ok: false, text: 'No such loan.' };
    amount = Math.min(Math.floor(Number(amount)), l.arrears + l.outstanding);
    if (!(amount > 0)) return { ok: false, text: 'Repay how much?' };
    const K = this.K;
    if (K.cashOf(l.borrower) < amount) return { ok: false, text: `${K.nameOf(l.borrower)} does not have that much.` };
    if (!K.pay(l.borrower, amount, { cat: 'loan_principal' })) return { ok: false, text: `${K.nameOf(l.borrower)} does not have that much.` };
    this.apply(l, amount);
    return { ok: true, text: l.status === 'repaid' ? 'The loan is repaid in full.' : `${money(amount)} repaid. ${K.nameOf(l.borrower)} still owes ${money(l.outstanding + l.arrears)}.` };
  }

  /** Money paid to the bank clears arrears first, then principal. */
  apply(l, amount) {
    let left = amount;
    const toArrears = Math.min(l.arrears, left); l.arrears -= toArrears; left -= toArrears;
    l.outstanding -= left;
    if (l.outstanding <= 0 && l.arrears <= 0) { l.status = 'repaid'; l.outstanding = 0; l.closed = this.day; this.L.note(`${this.K.nameOf(l.borrower)} repaid a loan of ${money(l.principal)}.`); }
  }

  // ------------------------------------------------------------- each day
  dailyTick() {
    const s = this.peek();
    if (!s || s.lastBusinessDay >= this.day) return;
    s.lastBusinessDay = this.day;
    const K = this.K;
    for (const l of this.loans()) {
      const id = l.borrower;
      let guard = 0;
      while (l.due <= this.day && l.status !== 'repaid' && guard++ < 48) {
        const d = dueMonth(l);
        if (l.arrears > 0) l.arrears += d.penalty;
        if (l.left > 0) {
          const a = K.account(id);
          if (a.funded && a.arrears <= 0 && a.cash >= d.instalment && K.pay(id, d.interest, { cat: 'interest' }) && K.pay(id, d.principal, { cat: 'loan_principal' })) {
            l.outstanding -= d.principal; l.interestPaid += d.interest; l.paid += 1;
            this.setStanding(id, this.standing(id) + 0.5);
          } else {
            l.outstanding -= d.principal; l.arrears += d.instalment; l.missed += 1;
            this.setStanding(id, this.standing(id) - 8);
            this.L.note(`${K.nameOf(id)} missed an instalment of ${money(d.instalment)}: arrears at ${((l.rate + PENALTY) * 100).toFixed(2)}%.`);
            this.g.tablet.post('bank', `${K.nameOf(id)} missed a loan instalment of ${money(d.instalment)} obols. It is in arrears and its managers have stopped hiring, bidding and expanding.`, 'warn');
            this.guaranteeCalled(l, d.instalment);
          }
          l.left -= 1;
        }
        l.due += 30;
        if (l.left <= 0 && l.outstanding <= 0 && l.arrears <= 0) { l.status = 'repaid'; l.outstanding = 0; l.closed = this.day; this.L.note(`${K.nameOf(id)} repaid a loan of ${money(l.principal)}.`); this.g.tablet.post('bank', `${K.nameOf(id)}'s loan of ${money(l.principal)} is repaid in full.`, 'good'); }
        else if (l.left <= 0) l.status = 'overdue';
        if (l.arrears > 0) this.setStanding(id, this.standing(id) - 1);
      }
    }
  }

  /** A guarantor is called for a missed instalment. */
  guaranteeCalled(l, amount) {
    const K = this.K;
    if (l.guarantee === 'personal') {
      this.L.ensure().standing = Math.max(0, this.L.standing() - PERSONAL_GUARANTEE_HIT);
      this.L.note(`You guaranteed ${K.nameOf(l.borrower)}'s loan: your borrowing record fell by ${PERSONAL_GUARANTEE_HIT}.`);
      return;
    }
    if (l.guarantee !== 'parent' || !K.group.isSub(l.borrower)) return;
    const G = K.group;
    const pay = Math.min(Math.round(amount), l.arrears, Math.max(0, Math.floor(K.account('parent').cash)));
    if (pay <= 0) { this.L.note(`${K.nameOf('parent')} was called to cover ${K.nameOf(l.borrower)}'s instalment but holds no cash.`); return; }
    if (!K.pay('parent', pay, { cat: 'guarantee' })) return;
    l.arrears -= pay; l.called += pay;
    const gs = G.st.group;
    G.st.loans.push({ id: gs.nextLoan++, lender: 'parent', borrower: l.borrower, principal: pay, outstanding: pay, rate: G.defaultRate(), termMonths: 6, instalment: Math.ceil(pay / 6), since: this.day, firstMonth: G.month + 1, lastMonth: G.month, status: 'open', paid: 0, interestPaid: 0, missed: 0, guarantee: l.id });
    this.L.note(`${K.nameOf('parent')} paid ${money(pay)} of ${K.nameOf(l.borrower)}'s instalment under its guarantee: now an intercompany loan.`);
  }
}
