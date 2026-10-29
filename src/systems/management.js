// Managers deciding for themselves (v0.63.0): game.corp.management.
//
// Every thing a manager does on their own is a *decision*, judged by one pure function (src/corp/management.js):
// carried out through the business's own service and written to the log; or queued for the owner, who approves
// or refuses on the tablet; or refused with the reason. Nothing a manager does can exceed what the owner has
// authorised: a monthly budget per category (none set = none allowed), the person's own spending limit, and
// the business's own account (managers act only for a company with an account of its own, never your wallet).
//
// Nothing here runs, or is created, until the owner sets a budget.
import { DECIDES, CATEGORIES, MGMT } from '../content/management.js';
import { judge, armsPar, planArmsOrders, hireChoice } from '../corp/management.js';
import { monthOf } from '../corp/ledger.js';
import { roleFit } from '../corp/people.js';
import { ROLES, MARKET } from '../content/personnel.js';

const BUSINESSES = ['arms', 'shipping', 'aerospace', 'farming'];
const P = { ROLES };

export class Management {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  get month() { return monthOf(this.day); }
  get Pe() { return this.K.personnel; }
  peek() { return this.K.state.management || null; }

  ensure() {
    const st = this.K.state;
    return (st.management ||= { v: 1, budgets: {}, spent: {}, pending: [], log: [], last: { day: 0, refused: {} }, hires: {}, nextId: 1 });
  }

  // ------------------------------------------------------------- budgets
  budgetOf(employer, cat) { return this.peek()?.budgets[employer]?.[cat] || 0; }

  spentIn(employer, cat, m = this.month) { return this.peek()?.spent[employer]?.[cat]?.[m] || 0; }

  remaining(employer, cat) { return Math.max(0, this.budgetOf(employer, cat) - this.spentIn(employer, cat)); }

  /** Set (or clear, with 0) what managers may spend on a category at a business in a month. An authorisation, not money. */
  setBudget(employer, cat, cap) {
    if (!BUSINESSES.includes(employer) || !this.K.established(employer)) return { ok: false, text: 'You do not own that business.' };
    if (!CATEGORIES[cat]) return { ok: false, text: 'No such budget.' };
    cap = Math.round(Number(cap));
    if (!Number.isFinite(cap) || cap < 0 || cap > 5e6) return { ok: false, text: 'A budget is between 0 and 5,000,000 obols a month.' };
    const m = this.ensure();
    (m.budgets[employer] ||= {})[cat] = cap;
    this.log({ type: 'budget', employer, text: `Monthly ${CATEGORIES[cat].name.toLowerCase()} budget for ${this.Pe.employerName(employer)} set to ${cap.toLocaleString()}.` });
    return { ok: true, text: `${CATEGORIES[cat].name} at ${this.Pe.employerName(employer)}: up to ${cap.toLocaleString()} obols a month.` };
  }

  note(employer, cat, amount) {
    const m = this.ensure();
    const by = ((m.spent[employer] ||= {})[cat] ||= {});
    by[this.month] = (by[this.month] || 0) + Math.round(amount);
    for (const k of Object.keys(by).map(Number).sort((a, b) => a - b).slice(0, -MGMT.spentMonths)) delete by[k];
  }

  // ------------------------------------------------------------- the log
  log(e) {
    const m = this.ensure();
    m.log.push({ day: this.day, ...e });
    while (m.log.length > MGMT.logKept) m.log.shift();
  }

  // ------------------------------------------------------------- who may decide
  mayDecide(x, kind, target) {
    const list = DECIDES[x.role]?.[kind];
    if (!list || !list.includes(target)) return false;
    return x.employer === target || (x.employer === 'parent' && this.K.group.isSub(target));
  }

  atWork(x) { return x.status === 'active' && x.startDay <= this.day && x.unpaid === 0 && this.Pe.employerOk(x.employer); }

  /** The people at work who may make this kind of decision for a business, in a fixed order. */
  deciders(kind, target) {
    const p = this.Pe.peek();
    if (!p) return [];
    return Object.values(p.staff).filter((x) => this.mayDecide(x, kind, target) && this.atWork(x) && (kind !== 'hire' || x.authority.canHire)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  }

  // ------------------------------------------------------------- judging
  hiresLeft(employer) {
    const h = this.peek()?.hires[employer];
    return MGMT.hiresPerMonth - (h && h.m === this.month ? h.n : 0);
  }

  judgeFor(x, kind, target, cat, cost, { owner = false } = {}) {
    return judge({
      kind, owner, atWork: this.atWork(x), allowed: this.mayDecide(x, kind, target), canHire: Boolean(x.authority.canHire),
      funded: this.K.established(target) && this.K.account(target).funded, cost,
      spendLimit: x.authority.spendLimit, approvalAbove: x.authority.approvalAbove,
      cap: this.budgetOf(target, cat), spent: this.spentIn(target, cat), affordable: this.K.canAfford(target, cost), hiresLeft: this.hiresLeft(target),
    });
  }

  // ------------------------------------------------------------- plans (nothing changes)
  /** Arms: what each works should order to bring its dock back to par. */
  planArms() {
    const A = this.g.arms;
    const items = this.g.content.items;
    const out = [];
    for (const wh of A.ownedIds()) {
      const stations = A.cells(wh).machines.map((m) => { const r = A.recipeOf(m); return r ? { in: r.in, minutes: r.minutes, staffed: Boolean(A.workerAt(m)) } : null; }).filter(Boolean);
      const par = armsPar(stations, (id) => items[id]?.category === 'arms_part', MGMT);
      const held = { ...(this.g.world.containers[A.def(wh).inBay]?.items || {}) };
      for (const o of A.state.orders) if (o.wh === wh) held[o.item] = (held[o.item] || 0) + o.qty;
      for (const o of planArmsOrders(par, held, (id) => A.partPrice(id), MGMT)) out.push({ wh, ...o });
    }
    return out;
  }

  /** Aerospace: one order a material, for what open units are short of after free stock — quoted, not placed. */
  planAero() {
    const A = this.g.aero;
    const co = A.roost;
    if (!A.owned || !co) return [];
    const need = {};
    for (const sf of A.shortfalls(co)) need[sf.material] = (need[sf.material] || 0) + sf.qty;
    const out = [];
    for (const m of Object.keys(need).sort()) {
      const n = need[m] - Math.max(0, A.free(co, m));
      if (n <= 0) continue;
      const best = A.bestSupplier(co, m, n);
      if (!best) continue;
      out.push({ material: m, supplier: best.id, n: best.n, cost: A.orderCost(co, best.id, m, best.n).total });
    }
    return out;
  }

  /** Who a manager would hire into which opening at a business (the job's own level first, the best fit, offered the least they accept). */
  planHire(target, x) {
    const Pe = this.Pe;
    const reach = x.role === 'hrd' ? ['staff', 'manager'] : ['staff'];
    for (const o of Pe.openings().filter((q) => q.employer === target)) {
      const R = ROLES[o.role];
      if (!reach.includes(R.tier)) continue;
      const cands = Pe.candidates().filter((c) => c.roles.includes(o.role) && c.availableDay <= this.day + 14 && !Pe.checkPlacement(c, o.role, target))
        .map((c) => ({ id: c.id, tier: c.tier, floor: c.floor, fit: roleFit(P, c, o.role), role: o.role }));
      const pick = hireChoice(cands, R.tier);
      if (pick) return { ...pick, target, cost: pick.floor * (MARKET.fee + MGMT.hireBand) };
    }
    return null;
  }

  // ------------------------------------------------------------- carrying out
  /** Carry out a reorder now: re-planned, so what is done is what is needed now. Returns { ok, text, paid }. */
  doReorder(target, x) {
    const A = this.g.arms;
    if (target === 'arms') {
      let paid = 0; const said = [];
      for (const o of this.planArms()) {
        const r = A.order(o.wh, o.item, o.qty);
        if (!r.ok) break;
        paid += o.cost; said.push(`${o.qty}× ${this.g.content.items[o.item].name}`);
      }
      return { ok: paid > 0, paid, text: paid > 0 ? `Ordered ${said.join(', ')} for ${this.Pe.employerName('arms')} (${paid.toLocaleString()} obols).` : 'Nothing to order.' };
    }
    const co = this.g.aero.roost;
    const aero = this.g.aero;
    aero.reserveShortfalls(co);
    let paid = 0; const said = [];
    for (const o of this.planAero()) {
      const forUnits = {};
      let left = o.n;
      for (const sf of aero.shortfalls(co).filter((s) => s.material === o.material)) { if (left <= 0) break; const k = Math.min(left, sf.qty); forUnits[sf.unit] = (forUnits[sf.unit] || 0) + k; left -= k; }
      const r = aero.order(co, o.supplier, o.material, o.n, forUnits);
      if (!r.ok) break;
      paid += o.cost; said.push(`${o.n}× ${aero.cfg.materials[o.material].name}`);
    }
    return { ok: paid > 0, paid, text: paid > 0 ? `Ordered ${said.join(', ')} for ${this.Pe.employerName('aerospace')} (${paid.toLocaleString()} obols).` : 'Nothing to order.' };
  }

  doHire(target, x) {
    const pick = this.planHire(target, x);
    if (!pick) return { ok: false, paid: 0, text: 'Nobody suitable to hire.' };
    const r = this.Pe.offer(pick.id, { role: pick.role, employer: target, pay: pick.floor });
    return { ok: r.ok, paid: r.ok ? pick.cost : 0, text: r.text, person: r.person };
  }

  /** The cost a decision would have now, or 0 if there is nothing to do. */
  quote(kind, target, x) {
    if (kind === 'reorder') return (target === 'arms' ? this.planArms() : this.planAero()).reduce((a, o) => a + o.cost, 0);
    return this.planHire(target, x)?.cost || 0;
  }

  catOf(kind) { return kind === 'hire' ? 'hiring' : 'materials'; }

  /** Make a decision: execute, queue or refuse. */
  decide(kind, target, x, { owner = false, pendingId = null } = {}) {
    const m = this.ensure();
    const cat = this.catOf(kind);
    const key = `${kind}|${target}`;
    const cost = this.quote(kind, target, x);
    if (cost <= 0) return { verdict: 'none' };
    const j = this.judgeFor(x, kind, target, cat, cost, { owner });
    const who = `${x.name} (${ROLES[x.role].name})`;
    if (j.verdict === 'refuse') {
      if (m.last.refused[key] !== j.reason) { m.last.refused[key] = j.reason; this.log({ type: 'refused', kind, employer: target, actor: x.id, cost, text: `${who} did not ${kind === 'hire' ? 'hire' : 'reorder'} for ${this.Pe.employerName(target)}: ${j.reason}` }); }
      return { ...j, cost };
    }
    if (j.verdict === 'queue') {
      if (m.pending.some((q) => q.key === key)) return { verdict: 'pending', cost };
      if (m.pending.length >= MGMT.maxPending) return { verdict: 'refuse', reason: 'Too many requests are waiting for you.', cost };
      const q = { id: `req_${m.nextId++}`, key, kind, employer: target, actor: x.id, cost, day: this.day, why: j.reason };
      m.pending.push(q);
      this.log({ type: 'queued', kind, employer: target, actor: x.id, cost, text: `${who} asks to ${kind === 'hire' ? 'hire' : 'reorder'} for ${this.Pe.employerName(target)}, ${cost.toLocaleString()} obols. ${j.reason}` });
      this.g.notify?.(`${x.name} is waiting for your approval: ${kind === 'hire' ? 'a hire' : 'a reorder'} at ${this.Pe.employerName(target)} (${cost.toLocaleString()} obols).`, 'info');
      return { ...j, cost, request: q };
    }
    delete m.last.refused[key];
    const r = kind === 'reorder' ? this.doReorder(target, x) : this.doHire(target, x);
    if (!r.ok) { this.log({ type: 'failed', kind, employer: target, actor: x.id, cost, text: `${who}: ${r.text}` }); return { verdict: 'failed', text: r.text, cost }; }
    const spend = kind === 'hire' ? cost : r.paid;
    this.note(target, cat, spend);
    if (kind === 'hire') { const h = (m.hires[target] ||= { m: this.month, n: 0 }); if (h.m !== this.month) { h.m = this.month; h.n = 0; } h.n++; }
    else this.K.noteActor(target, x.id, r.paid);
    this.log({ type: owner ? 'approved' : 'done', kind, employer: target, actor: x.id, cost: spend, text: `${who}: ${r.text}` });
    return { verdict: 'execute', cost: spend, text: r.text };
  }

  // ------------------------------------------------------------- the owner's side
  /** Approve a waiting request: judged again from scratch (the world may have moved); only the ask-above limit is lifted. */
  approve(id) {
    const m = this.peek();
    const q = m?.pending.find((r) => r.id === id);
    if (!q) return { ok: false, text: 'That request is gone.' };
    m.pending = m.pending.filter((r) => r !== q);
    const x = this.Pe.person(q.actor);
    if (!x || x.status !== 'active' || !this.mayDecide(x, q.kind, q.employer)) { this.log({ type: 'failed', kind: q.kind, employer: q.employer, actor: q.actor, text: 'Request lapsed: the person no longer holds that job.' }); return { ok: false, text: 'They no longer hold that job.' }; }
    const r = this.decide(q.kind, q.employer, x, { owner: true });
    if (r.verdict === 'execute') return { ok: true, text: r.text };
    if (r.verdict === 'none') { this.log({ type: 'failed', kind: q.kind, employer: q.employer, actor: q.actor, text: 'Request lapsed: it is no longer needed.' }); return { ok: false, text: 'It is no longer needed.' }; }
    return { ok: false, text: r.reason || r.text || 'It could not be done now.' };
  }

  decline(id) {
    const m = this.peek();
    const q = m?.pending.find((r) => r.id === id);
    if (!q) return { ok: false, text: 'That request is gone.' };
    m.pending = m.pending.filter((r) => r !== q);
    this.log({ type: 'declined', kind: q.kind, employer: q.employer, actor: q.actor, cost: q.cost, text: `You declined ${this.Pe.person(q.actor)?.name || 'a request'}'s ${q.kind === 'hire' ? 'hire' : 'reorder'} at ${this.Pe.employerName(q.employer)}.` });
    return { ok: true, text: 'Declined.' };
  }

  // ------------------------------------------------------------- each day
  /** Once a day, after payroll's day: each business with a budget gets, at most, one reorder and one hire decision. Does nothing until a budget exists. */
  dailyTick() {
    const m = this.peek();
    if (!m || m.last.day >= this.day) return;
    m.last.day = this.day;
    const expired = m.pending.filter((q) => this.day - q.day >= MGMT.expireDays);
    for (const q of expired) this.log({ type: 'expired', kind: q.kind, employer: q.employer, actor: q.actor, cost: q.cost, text: `A ${q.kind === 'hire' ? 'hire' : 'reorder'} request at ${this.Pe.employerName(q.employer)} lapsed unanswered after ${MGMT.expireDays} days.` });
    m.pending = m.pending.filter((q) => !expired.includes(q));
    for (const target of BUSINESSES) {
      if (!this.K.established(target) || !this.K.account(target).funded) continue;
      for (const kind of ['reorder', 'hire']) {
        if (!this.budgetOf(target, this.catOf(kind))) continue;
        if (kind === 'reorder' && target === 'aerospace' && this.g.aero.roost?.autoProcure) continue; // auto-buy is the owner's own standing order, left as it is
        if (kind === 'reorder' && !['arms', 'aerospace'].includes(target)) continue;
        const who = this.deciders(kind, target)[0];
        if (who) this.decide(kind, target, who);
      }
    }
  }

  /** What wants the owner's attention: waiting requests, recent refusals, budgets nearly used or with no one to use them. */
  alerts() {
    const m = this.peek();
    if (!m) return [];
    const out = [];
    if (m.pending.length) out.push({ text: `${m.pending.length} request${m.pending.length === 1 ? ' is' : 's are'} waiting for you.`, advice: 'Approve or decline them below; they lapse after a week.' });
    for (const target of BUSINESSES) {
      for (const kind of ['reorder', 'hire']) {
        const cat = this.catOf(kind);
        const cap = this.budgetOf(target, cat);
        if (!cap || !this.K.established(target)) continue;
        const name = this.Pe.employerName(target);
        if (!this.K.account(target).funded) out.push({ text: `${name} has a ${CATEGORIES[cat].name.toLowerCase()} budget but no account of its own.`, advice: 'Fund it: managers never spend your wallet.' });
        else if (!this.deciders(kind, target).length && !(kind === 'reorder' && !['arms', 'aerospace'].includes(target))) out.push({ text: `${name}: nobody at work may decide ${kind === 'hire' ? 'hires' : 'reorders'}.`, advice: 'Hire the right manager, or the budget goes unused.' });
        if (this.spentIn(target, cat) >= cap * 0.8) out.push({ text: `${name}: ${Math.round((this.spentIn(target, cat) / cap) * 100)}% of the month's ${CATEGORIES[cat].name.toLowerCase()} budget is used.`, advice: 'Raise the budget if more is wanted this month.' });
      }
    }
    for (const l of m.log.filter((e) => e.type === 'refused' && e.day >= this.day - 3).slice(-5)) out.push({ text: l.text, advice: 'Changing the budget, the person\'s limits or the business\'s cash would let it through.' });
    return out;
  }

  /** What the app shows: everything a manager is asked to watch, and why nothing is happening where that is the case. */
  status(target, kind) {
    const cat = this.catOf(kind);
    const out = { budget: this.budgetOf(target, cat), spent: this.spentIn(target, cat), notes: [] };
    if (!this.K.established(target)) { out.notes.push('Not yet owned.'); return out; }
    if (!this.K.account(target).funded) out.notes.push('Fund this business first: managers never spend your personal wallet.');
    if (!out.budget) out.notes.push('No monthly budget is set, so managers here may not spend.');
    if (kind === 'reorder' && target === 'aerospace' && this.g.aero.roost?.autoProcure) out.notes.push('Auto-buy is on: the firm buys for itself. Turn it off to have a manager buy within budget.');
    if (!this.deciders(kind, target).length) out.notes.push(`Nobody at work who may decide ${kind === 'hire' ? 'hires' : 'reorders'} here.`);
    return out;
  }
}
