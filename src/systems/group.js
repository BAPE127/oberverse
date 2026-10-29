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
import { logLine, freshAccount, monthTotals } from '../corp/ledger.js';
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
    st.group = { v: 1, nextXfer: 1, nextLoan: 1, dist: {}, jobs: { month: Math.floor((this.day - 1) / 30) }, ic: null };
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
    // an in-kind return: no cash moves, and the parent's cash is untouched
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
}
