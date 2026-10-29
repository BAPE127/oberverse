// The parent company and its subsidiaries (v0.61.0): game.corp.group.
//
//   form()                     found the parent company (free; it starts with nothing)
//   joinPreview(id) / join(id, { opening })   a business becomes a subsidiary — atomically, with what it needs to go on
//   spinOut(id)                a subsidiary leaves the group (never while it owes or is owed)
//   transfer(from, to, n, kind)   money between companies of the group: one step, logged, never trading income
//   capitalise(id, n)          the parent puts capital into a subsidiary
//
// Money reaches a subsidiary only through the parent: owner → parent (`corp.contribute('parent')`) →
// subsidiary (capital or an intercompany loan), and back by distributions and repayments. The owner's
// wallet never pays a subsidiary and never receives from one directly. A transfer moves cash between two
// accounts (`xferOut` / `xferIn`), is recorded in `state.transfers`, and is not counted as sales or costs.
//
// State (all created on forming, so an old save has none): world.corp.parent (identity, policies,
// investments), .ownership (edges), .transfers, .loans, .group (counters, the monthly jobs' keys).
import { logLine, freshAccount, monthTotals, post, icTotals } from '../corp/ledger.js';
import { CORP } from '../content/corporate.js';
import { icStep } from '../corp/consolidate.js';
import { value as worth } from '../corp/metrics.js';
import { canOwn, validPolicy, POLICY_DEFAULT } from '../corp/group.js';
import { validateName } from '../corp/identity.js';

const TRANSFERS_KEPT = 400;

export class Group {
  constructor(corp) {
    this.K = corp;
  }

  get game() { return this.K.game; }
  get st() { return this.K.state; }
  get parent() { return this.st.parent || null; }
  get edges() { return this.st.ownership || []; }
  get day() { return this.game.clock.day; }

  isSub(id) { return this.edges.some((e) => e.sub === id); }
  subs() { return this.edges.map((e) => e.sub); }
  /** Every account in the group: the parent and its subsidiaries. */
  members() { return this.parent ? ['parent', ...this.subs()] : []; }

  // ------------------------------------------------------------- forming
  defaultName() {
    return `${this.game.player.name} Holdings`;
  }

  /** Found the parent company: free, and with no money, no business and no employee of its own. */
  form() {
    if (this.parent) return { ok: false, text: 'You already have a parent company.' };
    const g = this.game;
    const st = this.st;
    const name = this.defaultName();
    st.parent = {
      id: 'parent', name, named: false, founded: this.day, status: 'active', names: [{ day: this.day, name }],
      strategy: 'balanced', policy: { ...POLICY_DEFAULT }, policies: {}, investments: {},
    };
    st.accounts.parent = { ...freshAccount('parent'), funded: true };
    st.ownership = [];
    st.transfers = [];
    st.loans = [];
    st.group = { v: 1, nextXfer: 1, nextLoan: 1, dist: {}, jobs: { month: Math.floor((this.day - 1) / 30) - 1 }, ic: null }; // the monthly jobs have run for every month before this one
    g.bus.emit('corp:founded', { id: 'parent' });
    return { ok: true, text: `${name} is founded. It holds nothing yet: pay money in, then bring your businesses under it.` };
  }

  /** Name or rename the parent company (same rules as any company's name). */
  rename(raw) {
    const p = this.parent;
    if (!p) return { ok: false, text: 'There is no parent company yet.' };
    const v = validateName(raw, this.K.takenNames('parent'));
    if (!v.ok) return { ok: false, text: v.error };
    p.named = true;
    if (v.name !== p.name) {
      p.name = v.name;
      p.names.push({ day: this.day, name: v.name });
      if (p.names.length > 12) p.names.splice(1, p.names.length - 12);
      this.game.bus.emit('corp:renamed', { id: 'parent', name: v.name });
    }
    return { ok: true, text: `Now trading as ${p.name}.`, name: p.name };
  }

  // ------------------------------------------------------------- joining and leaving
  /** What a business spends in a day, so the player can see what it will need from the parent. */
  runningPerDay(id) {
    const g = this.game;
    let n = 0;
    switch (id) {
      case 'arms': n = g.arms.state.staff.reduce((a, s) => a + s.wage, 0); break;
      case 'shipping': n = g.logistics.dailyUpkeep(); break;
      case 'aerospace': { const F = g.aero.fixedCosts(g.aero.roost); n = F.wages + F.training + F.upkeep + F.overhead; break; }
      case 'farming': {
        const m = Math.floor((this.day - 1) / 30);
        const a = this.K.account('farming');
        const cost = monthTotals(a, m).opex + monthTotals(a, m - 1).opex;
        n = cost / Math.min(60, ((this.day - 1) % 30) + 31);
        break;
      }
      default: n = 0;
    }
    return Math.max(0, Math.round(n));
  }

  joinPreview(id) {
    const blockers = [];
    const warnings = [];
    const K = this.K;
    if (!this.parent) blockers.push('Found the parent company first.');
    else if (!['arms', 'shipping', 'aerospace', 'farming'].includes(id)) blockers.push('No such business.');
    else {
      if (!K.established(id)) blockers.push('You do not own that business yet.');
      else if (id === 'arms' && !this.game.arms.ownedIds().length) blockers.push('Buy your first arms works before bringing the business into a group (it would otherwise be bought from your own wallet).');
      const c = canOwn(this.edges, 'parent', id);
      if (!c.ok) blockers.push(c.why);
    }
    const perDay = blockers.length ? 0 : this.runningPerDay(id);
    const suggested = Math.ceil((perDay * 30) / 100) * 100;
    const cash = this.parent ? K.account('parent').cash : 0;
    if (!blockers.length) {
      const a = K.account(id);
      if (!a.funded) warnings.push(`It will stop spending your wallet and use its own account, which starts at nothing. It spends about ${perDay.toLocaleString()} obols a day: with no opening capital its bills become debts${id === 'arms' ? ' and its staff go unpaid (they quit after two missed days)' : id === 'farming' ? ' and its purchases are refused' : ''}.`);
      if (cash < suggested) warnings.push(`The parent holds ${cash.toLocaleString()} obols; a month of running costs is about ${suggested.toLocaleString()}.`);
    }
    return { ok: blockers.length === 0, blockers, warnings, perDay, suggested, parentCash: cash };
  }

  /** A business becomes a subsidiary: one step, or nothing. `opening` is capital from the parent's cash, moved in the same step. */
  join(id, { opening = 0 } = {}) {
    const pre = this.joinPreview(id);
    if (!pre.ok) return { ok: false, text: pre.blockers[0] };
    opening = Math.floor(Number(opening) || 0);
    if (opening < 0) return { ok: false, text: 'The opening capital cannot be negative.' };
    const K = this.K;
    const pa = K.account('parent');
    if (opening > pa.cash) return { ok: false, text: `The parent holds ${Math.round(pa.cash).toLocaleString()} obols.` };
    const a = K.account(id);
    // the owner's stake in the business so far becomes the parent's investment, in kind (no cash moves)
    const brought = Math.max(0, Math.round(a.contributed - a.distributed + a.inKind));
    this.parent.investments[id] = { since: this.day, brought, capital: 0 };
    pa.inKind += brought;
    logLine(pa, { day: this.day, type: 'in-kind', amount: brought, memo: `${K.nameOf(id)}: the owner's existing stake brought in` });
    a.funded = true;
    this.st.ownership.push({ owner: 'parent', sub: id, stake: 1, since: this.day });
    logLine(a, { day: this.day, type: 'joined', amount: 0, memo: `Became a subsidiary of ${this.parent.name}` });
    if (opening > 0) { const t = this.transfer('parent', id, opening, 'capital', 'Opening capital'); if (t.ok) this.parent.investments[id].capital += t.rec.amount; }
    this.game.bus.emit('corp:joined', { id });
    return { ok: true, text: `${K.nameOf(id)} is now a subsidiary of ${this.parent.name}.` };
  }

  /** A subsidiary leaves the group and is the owner's again — its own cash stays in it. Refused while loans or arrears are open. */
  spinOut(id) {
    if (!this.isSub(id)) return { ok: false, text: 'It is not a subsidiary.' };
    const K = this.K;
    const a = K.account(id);
    if (a.arrears > 0) return { ok: false, text: `${K.nameOf(id)} owes ${Math.round(a.arrears).toLocaleString()} obols in arrears: clear that first.` };
    if (this.loansOf(id).length) return { ok: false, text: `${K.nameOf(id)} has an intercompany loan open: repay it first.` };
    const inv = this.parent.investments[id] || { brought: 0, capital: 0 };
    const pa = K.account('parent');
    const handed = Math.round(inv.brought + inv.capital);
    // an in-kind return: no cash moves, and the parent's cash is untouched — but what it counted as brought in leaves its books
    pa.inKind = Math.max(0, pa.inKind - Math.round(inv.brought));
    logLine(pa, { day: this.day, type: 'in-kind-out', amount: handed, memo: `${K.nameOf(id)} returned to the owner` });
    this.st.ownership = this.st.ownership.filter((e) => e.sub !== id);
    delete this.parent.investments[id];
    delete this.parent.policies[id];
    logLine(a, { day: this.day, type: 'left', amount: 0, memo: 'Left the group: the owner\'s company again' });
    this.game.bus.emit('corp:left', { id });
    return { ok: true, text: `${K.nameOf(id)} is out of the group. It keeps the ${Math.round(a.cash).toLocaleString()} obols it holds; you can take them out from the Companies app.` };
  }

  // ------------------------------------------------------------- money inside the group
  loansOf(id) {
    return (this.st.loans || []).filter((l) => l.status === 'open' && (l.borrower === id || l.lender === id));
  }

  /**
   * Cash from one company of the group to another, in one step. Not sales, not costs: it changes
   * which account holds the money, never how much exists.
   */
  transfer(from, to, amount, kind, memo = '', extra = {}) {
    amount = Math.round(amount);
    const ids = this.members();
    if (!ids.includes(from) || !ids.includes(to) || from === to) return { ok: false, text: 'Those two are not both in the group.' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, text: 'Enter an amount above zero.' };
    const src = this.K.account(from);
    const dst = this.K.account(to);
    if (src.cash < amount) return { ok: false, text: `${this.K.nameOf(from)} holds ${Math.round(src.cash).toLocaleString()} obols.` };
    src.cash -= amount; src.xferOut += amount;
    dst.cash += amount; dst.xferIn += amount;
    const gs = this.st.group;
    const rec = { id: gs.nextXfer++, day: this.day, from, to, amount, kind, memo, ...extra };
    this.st.transfers.push(rec);
    if (this.st.transfers.length > TRANSFERS_KEPT) this.st.transfers.shift();
    if (to !== 'parent') this.K.settleArrears(to); // what it owed is paid first
    return { ok: true, rec, text: `${amount.toLocaleString()} obols moved.` };
  }

  /** The parent puts capital into a subsidiary (a capital contribution, not a loan: it is never repaid, only distributed from). */
  capitalise(id, amount) {
    if (!this.isSub(id)) return { ok: false, text: 'Only a subsidiary can be capitalised from the parent.' };
    const r = this.transfer('parent', id, amount, 'capital', 'Capital contribution');
    if (r.ok) this.parent.investments[id].capital += r.rec.amount;
    return r;
  }

  /** A subsidiary returns capital to the parent (reduces the parent's investment, never below nothing). */
  returnCapital(id, amount) {
    if (!this.isSub(id)) return { ok: false, text: 'Only a subsidiary can return capital.' };
    amount = Math.round(amount);
    const a = this.K.account(id);
    if (a.arrears > 0) return { ok: false, text: `${this.K.nameOf(id)} owes ${Math.round(a.arrears).toLocaleString()} obols: it cannot send money up while it does.` };
    const inv = this.parent.investments[id];
    if (amount > inv.capital) return { ok: false, text: `The parent has put in ${Math.round(inv.capital).toLocaleString()} obols of capital.` };
    const r = this.transfer(id, 'parent', amount, 'capital-return', 'Capital returned');
    if (r.ok) inv.capital -= r.rec.amount;
    return r;
  }

  policyOf(id) {
    return validPolicy(this.parent?.policies[id] || this.parent?.policy || {});
  }

  // ------------------------------------------------------------- intercompany loans
  get month() { return Math.floor((this.day - 1) / 30); }

  /** The rate a parent charges its subsidiaries: the benchmark plus a point (the central bank sets the benchmark from a later stage). */
  defaultRate() { return Math.round((CORP.baseRate + 0.01) * 1000) / 1000; }

  /**
   * The parent lends a subsidiary money. It is a transfer of cash, never revenue: the subsidiary owes the
   * parent its principal back in equal instalments each month, with a month's interest on what is left.
   */
  lend(id, amount, { termMonths = 12, rate = this.defaultRate() } = {}) {
    if (!this.isSub(id)) return { ok: false, text: 'Only a subsidiary can borrow from the parent.' };
    amount = Math.round(amount);
    termMonths = Math.round(termMonths);
    if (!(termMonths >= 1 && termMonths <= 60)) return { ok: false, text: 'A loan runs from 1 to 60 months.' };
    if (!(Number(rate) >= 0 && Number(rate) <= 0.25)) return { ok: false, text: 'The rate must be between 0% and 25% a year.' };
    const t = this.transfer('parent', id, amount, 'loan', `Loan for ${termMonths} months`);
    if (!t.ok) return t;
    const gs = this.st.group;
    const loan = { id: gs.nextLoan++, lender: 'parent', borrower: id, principal: amount, outstanding: amount, rate: Number(rate), termMonths, instalment: Math.ceil(amount / termMonths), since: this.day, firstMonth: this.month + 1, lastMonth: this.month, status: 'open', paid: 0, interestPaid: 0, missed: 0 };
    this.st.loans.push(loan);
    t.rec.loan = loan.id;
    return { ok: true, loan, text: `${this.K.nameOf(id)} borrows ${amount.toLocaleString()} obols from ${this.parent.name}: ${termMonths} months at ${(loan.rate * 100).toFixed(1)}%.` };
  }

  /** Principal repaid early or on schedule: cash back to the parent. */
  repayLoan(loanId, amount) {
    const loan = (this.st.loans || []).find((l) => l.id === loanId && l.status === 'open');
    if (!loan) return { ok: false, text: 'No such open loan.' };
    amount = Math.round(amount);
    const a = this.K.account(loan.borrower);
    if (a.arrears > 0) return { ok: false, text: `${this.K.nameOf(loan.borrower)} owes ${Math.round(a.arrears).toLocaleString()} obols to others: those come first.` };
    if (amount > loan.outstanding) return { ok: false, text: `Only ${loan.outstanding.toLocaleString()} obols are outstanding.` };
    const t = this.transfer(loan.borrower, 'parent', amount, 'repayment', 'Loan repayment', { loan: loan.id });
    if (!t.ok) return t;
    loan.outstanding -= amount;
    loan.paid += amount;
    if (loan.outstanding <= 0) loan.status = 'repaid';
    return { ok: true, text: `${amount.toLocaleString()} obols repaid${loan.status === 'repaid' ? ' — the loan is cleared' : ''}.` };
  }

  /** Interest between group companies: cash moves, and each side's own books show it (income for the parent, a cost for the borrower). */
  payInterest(loan, amount) {
    amount = Math.round(amount);
    if (amount <= 0) return 0;
    const t = this.transfer(loan.borrower, 'parent', amount, 'interest', 'Interest', { loan: loan.id });
    if (!t.ok) return 0;
    post(this.K.account(loan.borrower), this.day, 'out', 'ic_interest', amount);
    post(this.K.account('parent'), this.day, 'in', 'ic_interest', amount);
    loan.interestPaid += amount;
    return amount;
  }

  // ------------------------------------------------------------- distributions
  /** The subsidiary's trading result for a closed month, less the interest it paid the parent: what a distribution may come from. */
  profitOf(id, m) {
    const reg = this.K.registry().find((r) => r.playerId === id);
    const row = this.K.rowsOf(reg).rows.find((r) => r.m === m);
    const interest = icTotals(this.K.account(id), m).icOut;
    return { net: row ? row.net : 0, interest, distributable: Math.max(0, (row ? row.net : 0) - interest) };
  }

  /** What the next month's loan service will need from a subsidiary (so a distribution never starves it). */
  serviceDue(id) {
    return this.loansOf(id).filter((l) => l.borrower === id).reduce((a, l) => a + Math.min(l.outstanding, l.instalment) + Math.round(l.outstanding * l.rate / 12), 0);
  }

  /**
   * What a distribution may be, by the subsidiary's policy and its actual cash: never from profit it has not got in
   * cash, never below its protected liquidity, never while it owes, loans first if the policy says so.
   */
  distributionPlan(id, m) {
    const K = this.K;
    const pol = this.policyOf(id);
    const a = K.account(id);
    const { net, interest, distributable } = this.profitOf(id, m);
    const owes = this.loansOf(id).some((l) => l.borrower === id);
    const reserve = Math.max(pol.targetReserve, pol.minLiquidity) + (owes ? pol.emergencyReserve : 0) + this.serviceDue(id);
    const plan = { id, m, net, interest, distributable, reserve, cash: Math.round(a.cash), avail: Math.max(0, Math.floor(a.cash - reserve)), repay: 0, send: 0, why: null };
    if (a.arrears > 0) { plan.why = `It owes ${Math.round(a.arrears).toLocaleString()} obols to others; nothing goes up until that is paid.`; plan.avail = 0; return plan; }
    if (distributable <= 0) { plan.why = net > 0 ? 'The month\'s profit went to the parent as interest.' : 'No profit that month.'; return plan; }
    if (plan.avail <= 0) { plan.why = 'The profit is not in cash above its reserve (it is tied up in stock, plant or what customers owe).'; return plan; }
    let avail = plan.avail;
    if (pol.debtFirst) {
      const owed = this.loansOf(id).filter((l) => l.borrower === id).reduce((x, l) => x + l.outstanding, 0);
      plan.repay = Math.min(avail, owed, Math.floor(distributable));
      avail -= plan.repay;
    }
    plan.send = Math.max(0, Math.floor(Math.min(avail, (distributable * pol.distributePct) / 100)));
    if (!plan.send && !plan.repay) plan.why = 'The policy sends none of it up.';
    return plan;
  }

  /** The month's distribution for a subsidiary, once: debts first (if the policy says), then the share the policy sends up. */
  distributeMonth(id, m) {
    const gs = this.st.group;
    gs.dist ||= {};
    if ((gs.dist[id]?.m ?? -1) >= m) return gs.dist[id]; // this month's is done
    const plan = this.distributionPlan(id, m);
    let repaid = 0;
    let sent = 0;
    if (plan.repay > 0) for (const l of this.loansOf(id).filter((x) => x.borrower === id)) {
      const n = Math.min(plan.repay - repaid, l.outstanding);
      if (n > 0 && this.repayLoan(l.id, n).ok) repaid += n;
    }
    if (plan.send > 0) {
      const t = this.transfer(id, 'parent', plan.send, 'distribution', `Distribution for month ${m + 1}`);
      if (t.ok) { sent = plan.send; post(this.K.account('parent'), this.day, 'in', 'dividend_in', sent); }
    }
    gs.dist[id] = { m, day: this.day, net: plan.net, distributable: plan.distributable, reserve: plan.reserve, repaid, sent, why: plan.why };
    gs.log ||= [];
    gs.log.push({ ...gs.dist[id], id });
    if (gs.log.length > 120) gs.log.shift();
    return gs.dist[id];
  }

  /**
   * The owner (or the parent's finance) sends money up outside the schedule. Protected liquidity holds unless the
   * owner overrides it — and then the breach is recorded, and the subsidiary's own bills face what is left.
   */
  distributeNow(id, amount, { override = false } = {}) {
    if (!this.isSub(id)) return { ok: false, text: 'It is not a subsidiary.' };
    amount = Math.round(amount);
    const a = this.K.account(id);
    const pol = this.policyOf(id);
    if (a.arrears > 0) return { ok: false, text: `${this.K.nameOf(id)} owes ${Math.round(a.arrears).toLocaleString()} obols: it cannot send money up while it does.` };
    if (!(amount > 0)) return { ok: false, text: 'Enter an amount above zero.' };
    const breach = a.cash - amount < pol.minLiquidity;
    if (breach && !override) return { ok: false, breach: true, text: `That would leave ${this.K.nameOf(id)} with ${Math.round(a.cash - amount).toLocaleString()} obols, below its protected minimum of ${pol.minLiquidity.toLocaleString()}. Override only if you mean it.` };
    const t = this.transfer(id, 'parent', amount, 'distribution', override && breach ? 'Distribution (liquidity protection overridden)' : 'Distribution');
    if (!t.ok) return t;
    post(this.K.account('parent'), this.day, 'in', 'dividend_in', amount);
    if (breach) {
      const gs = this.st.group;
      (gs.breaches ||= []).push({ day: this.day, id, left: Math.round(a.cash), min: pol.minLiquidity });
      if (gs.breaches.length > 20) gs.breaches.shift();
      logLine(a, { day: this.day, type: 'breach', amount, memo: 'Distribution above the protected liquidity, by the owner\'s override' });
    }
    return { ok: true, text: `${amount.toLocaleString()} obols sent up to ${this.parent.name}${breach ? ' — below its protected liquidity' : ''}.` };
  }

  /** Set the group's default policy (`id` null) or one subsidiary's own. Anything not named keeps its value. */
  setPolicy(id, patch) {
    if (!this.parent) return { ok: false, text: 'There is no parent company.' };
    if (id !== null && !this.isSub(id)) return { ok: false, text: 'It is not a subsidiary.' };
    const base = id === null ? this.parent.policy : this.policyOf(id);
    const next = validPolicy(patch, base);
    if (id === null) this.parent.policy = next; else this.parent.policies[id] = next;
    return { ok: true, policy: next, text: id === null ? 'The group\'s default policy is set.' : `${this.K.nameOf(id)} has its own policy now.` };
  }

  clearPolicy(id) {
    if (this.parent?.policies[id]) delete this.parent.policies[id];
    return { ok: true, text: 'It follows the group\'s default again.' };
  }

  // ------------------------------------------------------------- the month
  /**
   * Monthly jobs, once per closed month, keyed by the month in the save: loan interest and instalments,
   * then each subsidiary's distribution. A save loaded between two days, or a long sleep, runs each closed
   * month once and in order (the most recent three at most).
   */
  dailyTick() {
    if (!this.parent) return;
    const gs = this.st.group;
    const now = this.month;
    gs.jobs ||= { month: now };
    let from = gs.jobs.month + 1;
    if (now - 1 - from > 2) from = now - 3; // a very long gap: only the last three months are run
    for (let m = from; m <= now - 1; m++) {
      if (m <= gs.jobs.month) continue;
      this.runMonth(m);
      gs.jobs.month = m;
    }
    if (gs.jobs.month < now - 1) gs.jobs.month = now - 1;
  }

  runMonth(m) {
    for (const loan of this.st.loans.filter((l) => l.status === 'open' && l.firstMonth <= m && (l.lastMonth ?? -1) < m)) {
      const a = this.K.account(loan.borrower);
      const interest = Math.round((loan.outstanding * loan.rate) / 12);
      let owed = interest;
      let paid = 0;
      if (a.arrears > 0) loan.missed++; // its bills to others come first
      else {
        paid += this.payInterest(loan, Math.min(interest, Math.max(0, Math.floor(a.cash))));
        const inst = Math.min(loan.outstanding, loan.instalment);
        const can = Math.min(inst, Math.max(0, Math.floor(a.cash)));
        if (can > 0 && this.repayLoan(loan.id, can).ok) paid += can;
        owed += inst;
        if (paid < owed) loan.missed++;
      }
      loan.lastMonth = m;
    }
    for (const id of this.subs()) this.distributeMonth(id, m);
    this.recordIc(m);
  }

  /** What needs the owner's eye: each with the facts and what to do. */
  alerts() {
    const out = [];
    if (!this.parent) return out;
    const K = this.K;
    for (const id of this.subs()) {
      const a = K.account(id);
      const pol = this.policyOf(id);
      const per = this.runningPerDay(id);
      const name = K.nameOf(id);
      if (a.arrears > 0) out.push({ id, kind: 'arrears', text: `${name} owes ${Math.round(a.arrears).toLocaleString()} obols it could not pay.`, advice: 'Capitalise it from the parent, or lend it money; its bills come first.' });
      else if (a.cash < pol.minLiquidity) out.push({ id, kind: 'liquidity', text: `${name} holds ${Math.round(a.cash).toLocaleString()} obols, below its protected minimum of ${pol.minLiquidity.toLocaleString()}.`, advice: `It spends about ${per.toLocaleString()} a day: capitalise it from the parent.` });
      else if (per > 0 && a.cash < per * 7) out.push({ id, kind: 'runway', text: `${name} has under a week of running costs in cash (${Math.round(a.cash).toLocaleString()} against about ${per.toLocaleString()} a day).`, advice: 'Capitalise it before it runs dry.' });
    }
    for (const l of this.st.loans.filter((x) => x.status === 'open' && x.missed > 0)) out.push({ id: l.borrower, kind: 'loan', text: `${K.nameOf(l.borrower)} has missed ${l.missed} payment${l.missed > 1 ? 's' : ''} on loan ${l.id} (${l.outstanding.toLocaleString()} outstanding).`, advice: 'Fund it, or let it clear what it owes others first.' });
    for (const b of (this.st.group.breaches || []).filter((x) => this.day - x.day < 60)) out.push({ id: b.id, kind: 'breach', text: `On day ${b.day} ${K.nameOf(b.id)} was left with ${b.left.toLocaleString()} obols, below its protected ${b.min.toLocaleString()}, by override.`, advice: 'Watch its bills until it has rebuilt its reserve.' });
    return out;
  }

  // ------------------------------------------------------------- consolidation
  /** The intercompany freight charge aerospace still holds: in its stores, on the way, or in units not yet delivered (read from its own records). */
  unrealisedFreight() {
    const A = this.game.aero;
    const co = A?.roost;
    if (!co) return 0;
    let u = 0;
    for (const r of Object.values(co.inv || {})) u += r.freightInt || 0;
    for (const po of Object.values(A.state.pos || {})) if (po.company === co.id && !['received', 'lost'].includes(po.status)) u += po.freightInt || 0;
    for (const un of A.unitsOf(co)) u += un.cost?.freightInt || 0;
    return Math.round(u);
  }

  /** Both ends of the freight charge are in the group: only then is it inside the group. */
  icActive() { return this.isSub('aerospace') && this.isSub('shipping'); }

  /** Month's end: how much of the freight charge is still deferred. Kept for each month (two years). */
  recordIc(m) {
    const gs = this.st.group;
    const ic = (gs.ic ||= { state: null, months: {} });
    const R = this.icActive() ? icTotals(this.K.account('shipping'), m).internal : 0;
    const step = icStep(ic.state, { R, U: this.unrealisedFreight(), active: this.icActive() });
    ic.state = step.state;
    ic.months[m] = { R: step.R, E: step.E, G: step.state.G, P: step.state.P };
    const keys = Object.keys(ic.months).map(Number).sort((a, b) => a - b);
    while (keys.length > 24) delete ic.months[keys.shift()];
  }

  /** The eliminations for a month: stored for a closed one, projected from the live records for the month in progress. */
  icOf(m) {
    const ic = this.st.group.ic;
    if (ic?.months[m]) return ic.months[m];
    if (m !== this.month || !this.icActive()) return { R: 0, E: 0, G: ic?.state?.G || 0 };
    const R = icTotals(this.K.account('shipping'), m).internal;
    const step = icStep(ic?.state, { R, U: this.unrealisedFreight(), active: true });
    return { R: step.R, E: step.E, G: step.state.G, projected: true };
  }

  /** What a company's own books say for one month: trading and intercompany apart. */
  memberMonth(id, m) {
    const K = this.K;
    if (id === 'parent') {
      const t = icTotals(K.account('parent'), m);
      return { id, name: this.parent.name, revenue: 0, opex: 0, capex: 0, icIn: t.icIn, icOut: 0, interestIn: t.interestIn, dividendIn: t.dividendIn, internal: 0 };
    }
    const reg = K.registry().find((r) => r.playerId === id);
    const row = K.rowsOf(reg).rows.find((r) => r.m === m);
    const t = icTotals(K.account(id), m);
    return { id, name: K.nameOf(id), revenue: row?.revenue || 0, opex: row?.opex || 0, capex: row?.capex || 0, icIn: t.internal, icOut: t.icOut, interestIn: 0, dividendIn: 0, internal: t.internal };
  }

  /** Loans between group companies: what the parent is owed and what the subsidiaries owe — the same sum, seen from both ends. */
  receivables() {
    const open = (this.st.loans || []).filter((l) => l.status === 'open');
    return { receivable: open.reduce((a, l) => a + l.outstanding, 0), payable: open.reduce((a, l) => a + l.outstanding, 0), byBorrower: Object.fromEntries(open.map((l) => [l.borrower, 0]).map(([k]) => [k, open.filter((l) => l.borrower === k).reduce((a, l) => a + l.outstanding, 0)])) };
  }
  payableOf(id) { return (this.st.loans || []).filter((l) => l.status === 'open' && l.borrower === id).reduce((a, l) => a + l.outstanding, 0); }

  /** The months a period covers. */
  monthsOf(period) {
    const cur = this.month;
    return period === 'current' ? [cur] : period === 'year' ? Array.from({ length: 12 }, (_, i) => cur - 12 + i).filter((m) => m >= 0) : [cur - 1].filter((m) => m >= 0);
  }

  /**
   * The group's statements: each company's own, and the consolidated one with what is internal taken out —
   * the freight charge between sister companies (the part aerospace has not yet used stays deferred), the
   * interest a subsidiary paid its parent, and the dividends the parent was sent. Transfers of capital,
   * loans and their repayment are never in either: they move cash, not results.
   */
  consolidated(period = 'month') {
    if (!this.parent) return null;
    const K = this.K;
    const months = this.monthsOf(period);
    const ids = this.members();
    const sep = ids.map((id) => {
      const rows = months.map((m) => this.memberMonth(id, m));
      const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
      const x = { id, name: rows[0]?.name || K.nameOf(id), revenue: sum('revenue'), icIn: sum('icIn'), opex: sum('opex'), icOut: sum('icOut'), capex: sum('capex'), interestIn: sum('interestIn'), dividendIn: sum('dividendIn'), internal: sum('internal') };
      x.net = x.revenue + x.icIn - x.opex - x.icOut;
      return x;
    });
    const ics = months.map((m) => this.icOf(m));
    const R = ics.reduce((a, x) => a + x.R, 0);
    const E = ics.reduce((a, x) => a + x.E, 0);
    // shipping's charges to aerospace in months when they were not both in the group were sales to an outsider
    const ship = sep.find((x) => x.id === 'shipping');
    if (ship && ship.internal > R) { ship.revenue += ship.internal - R; ship.icIn -= ship.internal - R; ship.net = ship.revenue + ship.icIn - ship.opex - ship.icOut; }
    const interest = sep.reduce((a, x) => a + x.interestIn, 0);
    const dividends = sep.reduce((a, x) => a + x.dividendIn, 0);
    const revenue = sep.reduce((a, x) => a + x.revenue, 0);
    const opex = sep.reduce((a, x) => a + x.opex, 0);
    const capex = sep.reduce((a, x) => a + x.capex, 0);
    const cons = { revenue, costs: opex - E, capex };
    cons.net = cons.revenue - cons.costs;
    const sumNets = sep.reduce((a, x) => a + x.net, 0);
    const cash = Object.fromEntries(ids.map((id) => [id, Math.round(K.account(id).cash)]));
    const rec = this.receivables();
    const plans = this.subs().map((id) => this.distributionPlan(id, this.month - 1 >= 0 ? this.month - 1 : 0));
    return {
      period, months, separate: sep,
      eliminations: { internalSales: R, internalCost: E, deferred: R - E, interest, dividends },
      consolidated: cons,
      reconciliation: { sumOfSeparateNets: sumNets, lessDividends: dividends, lessDeferredFreight: R - E, equals: sumNets - dividends - (R - E) },
      cash: { parent: cash.parent, subs: Object.fromEntries(this.subs().map((id) => [id, cash[id]])), consolidated: ids.reduce((a, id) => a + cash[id], 0), availableToDistribute: plans.reduce((a, p) => a + p.send, 0) },
      debt: { external: this.subs().reduce((a, id) => a + Math.round(K.account(id).arrears), 0) },
      intercompany: { receivable: rec.receivable, payable: rec.payable, afterElimination: rec.receivable - rec.payable },
      distributionsReceived: dividends,
      value: this.groupValue(),
    };
  }

  /** The parent's own books: what came up from the subsidiaries and what went down to them. */
  parentLedger(period = 'year') {
    const months = this.monthsOf(period);
    const first = months.length ? months[0] * 30 + 1 : 1;
    const last = months.length ? months.at(-1) * 30 + 30 : this.day;
    const rows = (this.st.transfers || []).filter((t) => t.day >= first && t.day <= last);
    const sum = (f) => rows.filter(f).reduce((a, t) => a + t.amount, 0);
    const pa = this.K.account('parent');
    return {
      period, months,
      received: { distributions: sum((t) => t.to === 'parent' && t.kind === 'distribution'), interest: sum((t) => t.to === 'parent' && t.kind === 'interest'), repayments: sum((t) => t.to === 'parent' && t.kind === 'repayment'), capitalReturned: sum((t) => t.to === 'parent' && t.kind === 'capital-return') },
      paid: { capital: sum((t) => t.from === 'parent' && t.kind === 'capital'), loans: sum((t) => t.from === 'parent' && t.kind === 'loan') },
      owner: { contributed: pa.contributed, distributed: pa.distributed, inKind: pa.inKind },
      managementExpenses: 0, debt: 0, interestExpense: 0, restructuring: 0,
      cash: Math.round(pa.cash),
    };
  }

  /**
   * What the group is worth, without counting anything twice: the parent's cash and what it is owed, plus its
   * stake in each subsidiary at that subsidiary's value — which already takes off what it owes the parent. An
   * estimate, never money. (A value has a floor and cannot be negative, so the sum is exact only for companies
   * that are not near nothing.)
   */
  groupValue() {
    const K = this.K;
    const rec = this.receivables();
    const subs = this.subs().map((id) => {
      const reg = K.registry().find((r) => r.playerId === id);
      const m = K.metricsOf(reg, 'year');
      return { id, name: K.nameOf(id), value: m.valuation ?? 0, netAssets: m.netAssets ?? 0, payable: this.payableOf(id) };
    });
    const parentCash = Math.round(K.account('parent').cash);
    const stakes = subs.reduce((a, x) => a + x.value, 0);
    const parent = parentCash + rec.receivable + stakes;
    return { parentCash, loansToSubsidiaries: rec.receivable, subsidiaries: subs, stakes, parent, group: parent, intercompanyAfterElimination: rec.receivable - rec.payable, spendableCash: parentCash };
  }

  /** Who contributes what: share of the group's value, of its year's earnings, of the cash it makes, and what risks it carries. */
  contribution() {
    const K = this.K;
    const v = this.groupValue();
    const subs = this.subs().map((id) => {
      const reg = K.registry().find((r) => r.playerId === id);
      const m = K.metricsOf(reg, 'year');
      const a = K.account(id);
      const sent = (this.st.transfers || []).filter((t) => t.from === id && t.to === 'parent' && ['distribution', 'interest', 'repayment'].includes(t.kind) && t.day > this.day - 360).reduce((x, t) => x + t.amount, 0);
      const perDay = this.runningPerDay(id);
      const risks = [];
      if (a.arrears > 0) risks.push('owes others');
      if (perDay > 0 && a.cash < perDay * 7) risks.push('under a week of cash');
      if (this.payableOf(id) > a.cash) risks.push('owes the parent more than it holds');
      if ((m.net ?? 0) < 0) risks.push('losing money');
      return { id, name: K.nameOf(id), value: m.valuation ?? 0, valueShare: v.stakes ? (m.valuation ?? 0) / v.stakes : 0, net: m.net ?? 0, cashSentUp: Math.round(sent), cash: Math.round(a.cash), risks };
    });
    const totalNet = subs.reduce((a, x) => a + Math.max(0, x.net), 0);
    for (const x of subs) x.earningsShare = totalNet ? Math.max(0, x.net) / totalNet : 0;
    return subs;
  }
}
