// Managers deciding for themselves (v0.63.0): game.corp.management.
//
// Every thing a manager does on their own is a *decision*, judged by one pure function (src/corp/management.js):
// carried out through the business's own service and written to the log; or queued for the owner, who approves
// or refuses on the tablet; or refused with the reason. Nothing a manager does can exceed what the owner has
// authorised: a monthly budget per category (none set = none allowed), the person's own spending limit, and
// the business's own account (managers act only for a company with an account of its own, never your wallet).
//
// Nothing here runs, or is created, until the owner sets a budget.
import { DECIDES, CATEGORIES, MGMT, KINDS, PLAN_TYPES } from '../content/management.js';
import { judge, armsPar, planArmsOrders, hireChoice, nextPlot, nextPort, firstFreeCell, bidPrice, treasuryMove } from '../corp/management.js';
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
    const m = (st.management ||= { v: 1, budgets: {}, spent: {}, pending: [], log: [], last: { day: 0, refused: {} }, hires: {}, nextId: 1 });
    m.margins ||= {}; m.plans ||= []; m.nextPlan ||= 1; // v0.64.0: a v0.63 save gains them when next used
    m.treasury ||= {}; // v0.65.0
    return m;
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
    return Object.values(p.staff).filter((x) => this.mayDecide(x, kind, target) && this.atWork(x) && this.permitted(x, kind)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  }

  /** The permission a kind of decision needs, besides the job. */
  permitted(x, kind) {
    return kind === 'hire' ? Boolean(x.authority.canHire) : kind === 'bid' ? Boolean(x.authority.canContract) : kind === 'transfer' ? Boolean(x.authority.canTransfer) : kind === 'expand' ? Boolean(x.authority.canExpand) : true;
  }

  // ------------------------------------------------------------- judging
  hiresLeft(employer) {
    const h = this.peek()?.hires[employer];
    return MGMT.hiresPerMonth - (h && h.m === this.month ? h.n : 0);
  }

  judgeFor(x, kind, target, cat, cost, { owner = false, ask = null, reserve = 0, source = null } = {}) {
    return judge({
      kind, owner, ask, atWork: this.atWork(x), allowed: this.mayDecide(x, kind, target), canHire: Boolean(x.authority.canHire), canContract: Boolean(x.authority.canContract), canExpand: Boolean(x.authority.canExpand), canTransfer: Boolean(x.authority.canTransfer),
      funded: this.K.established(target) && this.K.account(target).funded, cost,
      spendLimit: x.authority.spendLimit, approvalAbove: x.authority.approvalAbove,
      cap: this.budgetOf(target, cat), spent: this.spentIn(target, cat), affordable: this.K.canAfford(source || target, cost + reserve), hiresLeft: this.hiresLeft(target),
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

  // ------------------------------------------------------------- bids (v0.64.0)
  /** Aerospace tenders worth a bid at the owner's minimum margin, best profit first. Nothing changes: the quotes are pure. */
  planBids() {
    const A = this.g.aero;
    const co = A.roost;
    const margin = this.peek()?.margins.aerospace;
    if (!A.owned || !co || margin === undefined) return [];
    const open = A.openTenders().filter((t) => t.bids.some((b) => b.company === co.id)).length;
    if (A.contractsOf(co, 'active').length + open >= MGMT.maxContracts) return [];
    const out = [];
    for (const t of A.openTenders().filter((q) => !q.bids.some((b) => b.company === co.id))) {
      const q0 = A.bidQuote(co.id, t.id);
      if (!q0.ok || !(q0.cost > 0)) continue;
      const bp = bidPrice(q0.cost, margin, t.ceiling);
      if (bp.price === null) continue;
      const q = A.bidQuote(co.id, t.id, bp.price, q0.days);
      if (!q.ok) continue;
      const p = A.pOf(t);
      out.push({ item: t.id, cost: Math.round(q.cost * t.qty), price: bp.price, days: q.days, profit: q.profit, ask: bp.below ? `The most this customer pays is below your minimum margin of ${margin}%.` : null, desc: `${t.qty} × ${p.name} at ${bp.price.toLocaleString()} each` });
    }
    return out.sort((x, y) => y.profit - x.profit || (x.item < y.item ? -1 : 1));
  }

  // ------------------------------------------------------------- plans (v0.64.0)
  plansOf(business) { return (this.peek()?.plans || []).filter((q) => q.business === business); }

  /** Add a plan the owner approves: a template with limits. Validated here, so no caller can bypass the rules. */
  addPlan(spec) {
    const T = PLAN_TYPES[spec.type];
    if (!T) return { ok: false, text: 'No such kind of plan.' };
    if (!this.K.established(T.business)) return { ok: false, text: 'You do not own that business.' };
    const limit = Math.round(Number(spec.limit)); const maxEach = Math.round(Number(spec.maxEach)); const reserve = Math.round(Number(spec.reserve) || 0);
    if (!(limit >= 1 && limit <= 10)) return { ok: false, text: 'A plan buys between 1 and 10.' };
    if (!(maxEach >= 1 && maxEach <= 5e6)) return { ok: false, text: 'The most to pay for each is between 1 and 5,000,000 obols.' };
    if (!(reserve >= 0 && reserve <= 5e6)) return { ok: false, text: 'The cash to leave in the account is between 0 and 5,000,000 obols.' };
    const params = {};
    const g = this.g;
    if (spec.type === 'arms_station') {
      const it = g.content.items[spec.item];
      if (!it?.build || it.build.domain !== 'arms' || it.build.type !== 'machine') return { ok: false, text: 'That is not an arms station.' };
      if (!g.arms.owns(spec.works)) return { ok: false, text: 'You do not own that works.' };
      if (spec.recipe) { const r = g.arms.cfg.recipes[spec.recipe]; if (!r || r.station !== it.build.kind) return { ok: false, text: 'That recipe is not made at that station.' }; params.recipe = spec.recipe; }
      Object.assign(params, { works: spec.works, item: spec.item });
    } else if (spec.type === 'aero_bay') {
      if (!g.aero.cfg.bays[spec.bay]) return { ok: false, text: 'No such bay.' };
      params.bay = spec.bay;
    } else if (spec.type === 'aero_facility') {
      if (!g.aero.cfg.facilities[spec.facility]?.build) return { ok: false, text: 'No such facility.' };
      params.facility = spec.facility;
    }
    const m = this.ensure();
    if (m.plans.length >= 12) return { ok: false, text: 'Twelve plans at most.' };
    const plan = { id: `plan_${m.nextPlan++}`, type: spec.type, business: T.business, params, limit, maxEach, reserve, bought: 0, placed: 0, since: this.day };
    m.plans.push(plan);
    this.log({ type: 'plan', employer: T.business, text: `Plan approved: up to ${limit} × ${this.planName(plan)} at ${this.Pe.employerName(T.business)}, at most ${maxEach.toLocaleString()} each, leaving ${reserve.toLocaleString()} in the account.` });
    return { ok: true, plan, text: `Plan approved: ${this.planName(plan)}, up to ${limit}.` };
  }

  removePlan(id) {
    const m = this.peek();
    const q = m?.plans.find((r) => r.id === id);
    if (!q) return { ok: false, text: 'No such plan.' };
    m.plans = m.plans.filter((r) => r !== q);
    this.log({ type: 'plan', employer: q.business, text: `Plan withdrawn: ${this.planName(q)} (${q.bought} of ${q.limit} bought).` });
    return { ok: true, text: 'Plan withdrawn.' };
  }

  planName(q) {
    const g = this.g;
    if (q.type === 'arms_station') return `${g.content.items[q.params.item]?.name || 'station'} in ${g.arms.def(q.params.works)?.name || 'a works'}`;
    if (q.type === 'aero_bay') return g.aero.cfg.bays[q.params.bay]?.name || 'bay';
    if (q.type === 'aero_facility') return g.aero.cfg.facilities[q.params.facility]?.name || 'facility';
    return PLAN_TYPES[q.type].name;
  }

  /** What the next purchase under a plan would be, or why there is none. { cost, desc, run } | { why }. Nothing changes. */
  evalPlan(q) {
    const g = this.g;
    if (q.bought >= q.limit) return { why: 'Done: all bought.' };
    const over = (price) => (price > q.maxEach ? `The next one costs ${price.toLocaleString()}, over the ${q.maxEach.toLocaleString()} limit.` : null);
    if (q.type === 'arms_station') {
      const A = g.arms; const wh = q.params.works;
      if (!A.owns(wh)) return { why: 'You no longer own that works.' };
      if (q.bought > q.placed) return { why: 'Waiting for the last one to arrive and be placed.' };
      const pw = A.power(wh);
      if (pw.machines >= pw.capacity) return { why: 'The works has no power left for another machine.' };
      const price = A.partPrice(q.params.item);
      return over(price) ? { why: over(price) } : { cost: price, desc: `a ${g.content.items[q.params.item].name} for ${A.def(wh).name}`, run: () => A.order(wh, q.params.item, 1) };
    }
    if (q.type === 'farm_plot') {
      const F = g.farm;
      const plots = Object.keys(F.def.plots).map((id) => ({ id, d: F.plotDef(id) })).filter((x) => x.d).map((x) => ({ id: x.id, price: x.d.price, rect: x.d.field }));
      const pick = nextPlot(plots, F.owned(), MGMT.plotGap);
      if (!pick) return { why: F.owned().length ? 'No plot for sale next to your land.' : 'You own no plot yet: the first is yours to buy.' };
      return over(pick.price) ? { why: over(pick.price) } : { cost: pick.price, desc: F.plotDef(pick.id).name, run: () => F.buy(pick.id) };
    }
    if (q.type === 'port') {
      const L = g.logistics;
      if (L.ownedPorts().length >= L.L.maxPorts) return { why: 'The fleet\'s port limit is reached.' };
      const pick = nextPort(Object.keys(L.cfg.ports).map((id) => ({ id, price: L.portType(id)?.price ?? Infinity })).filter((p) => Number.isFinite(p.price)), L.ownedPorts());
      if (!pick) return { why: 'No port for sale.' };
      return over(pick.price) ? { why: over(pick.price) } : { cost: pick.price, desc: L.port(pick.id).name, run: () => L.buyPort(pick.id) };
    }
    const A = g.aero; const co = A.roost;
    if (!A.owned || !co) return { why: 'You no longer own the firm.' };
    if (q.type === 'aero_bay') {
      const B = A.cfg.bays[q.params.bay];
      if (!A.freeSlot(co, q.params.bay)) return { why: 'No free slot in a hall you have built (managers never build a hall).' };
      return over(B.build) ? { why: over(B.build) } : { cost: B.build, desc: `a ${B.name.toLowerCase()}`, run: () => A.buildBay(co, q.params.bay) };
    }
    const F = A.cfg.facilities[q.params.facility];
    if ((q.params.facility === 'pad' ? co.pad : co.facilities[q.params.facility]) || co.building?.[q.params.facility]) return { why: 'Already built or being built.' };
    return over(F.build) ? { why: over(F.build) } : { cost: F.build, desc: F.name, run: () => A.buildFacility(co, q.params.facility) };
  }

  planExpansion(target) {
    const out = [];
    for (const q of this.plansOf(target)) {
      const e = this.evalPlan(q);
      if (e.cost) out.push({ item: q.id, cost: e.cost, reserve: q.reserve, desc: e.desc, run: e.run, plan: q });
    }
    return out;
  }

  /** Arms stations that were bought: when one is on the works's dock, it goes in at the first free cell (a fixed rule). Not a judged decision: it was paid for under the plan. */
  placeStations() {
    const m = this.peek();
    if (!m) return;
    const g = this.g; const A = g.arms;
    for (const q of m.plans.filter((r) => r.type === 'arms_station' && r.placed < r.bought)) {
      const wh = q.params.works;
      if (!A.owns(wh)) continue;
      const dock = A.def(wh).inBay;
      if (!(g.world.containers[dock]?.items[q.params.item] > 0)) continue;
      const it = g.content.items[q.params.item].build;
      const map = g.maps.get(A.def(wh).map);
      const cover = (x, y) => map.props.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || (map.def.keepClear || []).some(([kx, ky]) => kx === x && ky === y);
      const cell = firstFreeCell(it.w, it.h, map.width, map.height, (x, y) => map.inBounds(x, y) && map.grid[y][x] === 'g', (x, y) => map.inBounds(x, y) && cover(x, y));
      const name = this.planName(q);
      if (!cell) { if (q.blocked !== 'full') { q.blocked = 'full'; this.log({ type: 'failed', kind: 'expand', employer: 'arms', text: `${name} is on the dock but the works has no free place for it.` }); } continue; }
      const r = A.place(wh, q.params.item, cell.x, cell.y, 0, dock);
      if (!r.ok) { if (q.blocked !== r.text) { q.blocked = r.text; this.log({ type: 'failed', kind: 'expand', employer: 'arms', text: `${name} could not be placed: ${r.text}` }); } continue; }
      q.placed += 1; delete q.blocked;
      let said = '';
      if (q.params.recipe) { const rr = A.setRecipe(r.entity.id, q.params.recipe); said = rr.ok ? ` and set to make ${g.content.items[A.cfg.recipes[q.params.recipe].out].name}` : ` (the recipe could not be set: ${rr.text || 'not researched'})`; }
      this.log({ type: 'done', kind: 'expand', employer: 'arms', text: `${name} placed at (${cell.x}, ${cell.y})${said}. It needs a worker assigned.` });
    }
  }

  // ------------------------------------------------------------- treasury (v0.65.0)
  /** The owner's treasury policy for a subsidiary: keep its cash between a floor and a ceiling. Both are cash, not profit. */
  setTreasury(target, { floor, ceiling }) {
    const G = this.K.group;
    if (!G.isSub(target)) return { ok: false, text: 'Treasury moves cash only for a subsidiary of your group.' };
    floor = Math.round(Number(floor)); ceiling = Math.round(Number(ceiling));
    if (!(floor >= 0 && floor <= 5e7)) return { ok: false, text: 'The floor is between 0 and 50,000,000 obols.' };
    if (!(ceiling >= floor + MGMT.minMove && ceiling <= 5e7)) return { ok: false, text: `The ceiling must be at least ${MGMT.minMove.toLocaleString()} above the floor.` };
    if (ceiling < G.policyOf(target).minLiquidity) return { ok: false, text: `The ceiling is below the subsidiary's protected minimum (${G.policyOf(target).minLiquidity.toLocaleString()}).` };
    const m = this.ensure();
    m.treasury[target] = { floor, ceiling };
    this.log({ type: 'plan', employer: target, text: `Treasury policy for ${this.Pe.employerName(target)}: keep its cash between ${floor.toLocaleString()} and ${ceiling.toLocaleString()}.` });
    return { ok: true, text: `${this.Pe.employerName(target)}'s cash is kept between ${floor.toLocaleString()} and ${ceiling.toLocaleString()}.` };
  }

  clearTreasury(target) {
    const m = this.peek();
    if (!m?.treasury[target]) return { ok: false, text: 'No treasury policy there.' };
    delete m.treasury[target];
    this.log({ type: 'plan', employer: target, text: `Treasury policy for ${this.Pe.employerName(target)} withdrawn.` });
    return { ok: true, text: 'Withdrawn.' };
  }

  /** The cash the parent never lets a treasury top-up take. */
  setParentReserve(n) {
    if (!this.K.state.parent) return { ok: false, text: 'There is no parent company.' };
    n = Math.round(Number(n));
    if (!(n >= 0 && n <= 5e7)) return { ok: false, text: 'The reserve is between 0 and 50,000,000 obols.' };
    this.ensure().treasury.parent = { reserve: n };
    this.log({ type: 'plan', employer: 'parent', text: `The parent keeps at least ${n.toLocaleString()} obols: treasury top-ups never take it below that.` });
    return { ok: true, text: `Top-ups leave the parent at least ${n.toLocaleString()}.` };
  }

  parentReserve() { return this.peek()?.treasury.parent?.reserve || 0; }

  /** What the policy would move for a subsidiary now. Nothing changes. */
  planTreasury(target) {
    const G = this.K.group;
    const m = this.peek();
    if (!m || !G.isSub(target) || !m.treasury[target]) return [];
    const K = this.K;
    const inv = G.parent.investments[target];
    const mv = treasuryMove(m.treasury[target], this.parentReserve(), {
      cash: K.cashOf(target), parentCash: K.cashOf('parent'), arrears: K.account(target).arrears, minLiquidity: G.policyOf(target).minLiquidity,
      loans: G.loansOf(target).filter((l) => l.borrower === target).map((l) => ({ id: l.id, outstanding: l.outstanding })), capital: inv?.capital || 0,
    }, MGMT.minMove);
    if (!mv) return [];
    const name = this.Pe.employerName(target);
    if (mv.kind === 'topup') return [{ item: 'topup', cost: mv.amount, source: 'parent', reserve: this.parentReserve(), desc: `top ${name} up by ${mv.amount.toLocaleString()} from the parent`, run: () => { const r = G.capitalise(target, mv.amount); return { ...r, paid: r.ok ? mv.amount : 0, text: r.ok ? `${name} topped up by ${mv.amount.toLocaleString()} from the parent.` : r.text }; } }];
    return [{ item: 'sweep', cost: mv.amount, source: target, reserve: 0, desc: `bring ${mv.amount.toLocaleString()} up from ${name}`, run: () => {
      let paid = 0; const said = [];
      for (const s of mv.steps) {
        const r = s.loan ? G.repayLoan(s.loan, s.amount) : G.returnCapital(target, s.capital);
        if (!r.ok) { if (!paid) return { ok: false, paid: 0, text: r.text }; break; }
        const a = s.amount ?? s.capital; paid += a; said.push(s.loan ? `${a.toLocaleString()} repaid on a loan` : `${a.toLocaleString()} of capital returned`);
      }
      return { ok: true, paid, text: `${name}: ${said.join(', ')}.` };
    } }];
  }

  // ------------------------------------------------------------- the decision
  catOf(kind) { return { hire: 'hiring', bid: 'contracts', expand: 'expansion', transfer: 'treasury' }[kind] || 'materials'; }

  /** What a decision could be now: [{ item, cost, ... }]; the first is the one made. Nothing changes. */
  candidates(kind, target, x) {
    if (kind === 'reorder') { const c = (target === 'arms' ? this.planArms() : this.planAero()).reduce((a, o) => a + o.cost, 0); return c > 0 ? [{ item: null, cost: c }] : []; }
    if (kind === 'hire') { const h = this.planHire(target, x); return h ? [{ item: null, cost: h.cost }] : []; }
    if (kind === 'bid') return this.planBids();
    if (kind === 'transfer') return this.planTreasury(target);
    return this.planExpansion(target);
  }

  /** The text of what was done or asked, by kind. */
  verb(kind) { return { reorder: 'reorder', hire: 'hire', bid: 'bid', expand: 'expand', transfer: 'move cash' }[kind]; }

  /** Make a decision: execute, queue or refuse. `item` picks one candidate (an approval); without it the first the person may do, else the first. */
  decide(kind, target, x, { owner = false, item = undefined } = {}) {
    const m = this.ensure();
    const cat = this.catOf(kind);
    const all = this.candidates(kind, target, x);
    let cand;
    const judgeOf = (c) => this.judgeFor(x, kind, target, cat, c.cost, { owner, ask: c.ask || null, reserve: c.reserve || 0, source: c.source || null });
    if (item !== undefined) cand = all.find((c) => c.item === item);
    else cand = all.find((c) => judgeOf(c).verdict !== 'refuse') || all[0];
    if (!cand) return { verdict: 'none' };
    const cost = cand.cost;
    const key = `${kind}|${target}${cand.item ? `|${cand.item}` : ''}`;
    const j = judgeOf(cand);
    const who = `${x.name} (${ROLES[x.role].name})`;
    const at = this.Pe.employerName(target);
    if (j.verdict === 'refuse') {
      if (m.last.refused[key] !== j.reason) { m.last.refused[key] = j.reason; this.log({ type: 'refused', kind, employer: target, actor: x.id, cost, text: `${who} did not ${this.verb(kind)} for ${at}${cand.desc ? ` (${cand.desc})` : ''}: ${j.reason}` }); }
      return { ...j, cost };
    }
    if (j.verdict === 'queue') {
      if (m.pending.some((q) => q.key === key)) return { verdict: 'pending', cost };
      if (m.pending.length >= MGMT.maxPending) return { verdict: 'refuse', reason: 'Too many requests are waiting for you.', cost };
      const q = { id: `req_${m.nextId++}`, key, kind, employer: target, actor: x.id, cost, day: this.day, why: j.reason, ...(cand.item ? { item: cand.item, desc: cand.desc } : {}) };
      m.pending.push(q);
      this.log({ type: 'queued', kind, employer: target, actor: x.id, cost, text: `${who} asks to ${this.verb(kind)} for ${at}${cand.desc ? ` (${cand.desc})` : ''}, ${cost.toLocaleString()} obols. ${j.reason}` });
      this.g.notify?.(`${x.name} is waiting for your approval: ${this.verb(kind)} at ${at} (${cost.toLocaleString()} obols).`, 'info');
      return { ...j, cost, request: q };
    }
    delete m.last.refused[key];
    const r = this.carryOut(kind, target, x, cand);
    if (!r.ok) { this.log({ type: 'failed', kind, employer: target, actor: x.id, cost, text: `${who}: ${r.text}` }); return { verdict: 'failed', text: r.text, cost }; }
    const spend = kind === 'hire' || kind === 'bid' ? cost : r.paid;
    this.note(target, cat, spend);
    if (kind === 'hire') { const h = (m.hires[target] ||= { m: this.month, n: 0 }); if (h.m !== this.month) { h.m = this.month; h.n = 0; } h.n++; }
    else if (kind !== 'bid') this.K.noteActor(target, x.id, r.paid);
    this.log({ type: owner ? 'approved' : 'done', kind, employer: target, actor: x.id, cost: spend, text: `${who}: ${r.text}` });
    return { verdict: 'execute', cost: spend, text: r.text };
  }

  carryOut(kind, target, x, cand) {
    if (kind === 'reorder') return this.doReorder(target, x);
    if (kind === 'hire') return this.doHire(target, x);
    if (kind === 'bid') {
      const r = this.g.aero.placeBid(this.g.aero.roost.id, cand.item, cand.price, cand.days);
      return { ok: r.ok, paid: 0, text: r.text };
    }
    if (kind === 'transfer') { const r = cand.run(); return { ok: r.ok, paid: r.paid || 0, text: r.text }; }
    const before = this.g.corp.cashOf(target);
    const r = cand.run();
    if (!r.ok) return { ok: false, paid: 0, text: r.text };
    cand.plan.bought += 1;
    return { ok: true, paid: Math.max(0, before - this.g.corp.cashOf(target)) || cand.cost, text: r.text };
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
    const r = this.decide(q.kind, q.employer, x, { owner: true, item: q.item || (q.kind === 'bid' || q.kind === 'expand' ? undefined : null) });
    if (r.verdict === 'execute') return { ok: true, text: r.text };
    if (r.verdict === 'none') { this.log({ type: 'failed', kind: q.kind, employer: q.employer, actor: q.actor, text: 'Request lapsed: it is no longer needed.' }); return { ok: false, text: 'It is no longer needed.' }; }
    return { ok: false, text: r.reason || r.text || 'It could not be done now.' };
  }

  decline(id) {
    const m = this.peek();
    const q = m?.pending.find((r) => r.id === id);
    if (!q) return { ok: false, text: 'That request is gone.' };
    m.pending = m.pending.filter((r) => r !== q);
    this.log({ type: 'declined', kind: q.kind, employer: q.employer, actor: q.actor, cost: q.cost, text: `You declined ${this.Pe.person(q.actor)?.name || 'a request'}'s ${this.verb(q.kind)} at ${this.Pe.employerName(q.employer)}.` });
    return { ok: true, text: 'Declined.' };
  }

  // ------------------------------------------------------------- each day
  /** Once a day, after payroll's day: each business with a budget gets, at most, one reorder and one hire decision. Does nothing until a budget exists. */
  dailyTick() {
    const m = this.peek();
    if (!m || m.last.day >= this.day) return;
    m.last.day = this.day;
    const expired = m.pending.filter((q) => this.day - q.day >= MGMT.expireDays);
    for (const q of expired) this.log({ type: 'expired', kind: q.kind, employer: q.employer, actor: q.actor, cost: q.cost, text: `A ${this.verb(q.kind)} request at ${this.Pe.employerName(q.employer)} lapsed unanswered after ${MGMT.expireDays} days.` });
    m.pending = m.pending.filter((q) => !expired.includes(q));
    this.placeStations(); // what a plan bought earlier goes in first
    for (const target of BUSINESSES) {
      if (!this.K.established(target) || !this.K.account(target).funded) continue;
      for (const kind of KINDS[target]) {
        if (!this.budgetOf(target, this.catOf(kind))) continue;
        if (kind === 'reorder' && target === 'aerospace' && this.g.aero.roost?.autoProcure) continue; // auto-buy is the owner's own standing order, left as it is
        if (kind === 'transfer' && !this.K.group.isSub(target)) continue;
        const who = this.deciders(kind, target)[0];
        if (who) this.decide(kind, target, who);
      }
    }
  }

  /** The owner's minimum margin over cost for bids at a business (a percentage). Without one managers bid on nothing. */
  setMargin(employer, pct) {
    if (employer !== 'aerospace' || !this.K.established(employer)) return { ok: false, text: 'Managers bid only for the aerospace firm, once you own it.' };
    pct = Number(pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 300) return { ok: false, text: 'A minimum margin is between 0% and 300% over cost.' };
    const m = this.ensure();
    m.margins[employer] = Math.round(pct * 10) / 10;
    this.log({ type: 'budget', employer, text: `Minimum margin on bids at ${this.Pe.employerName(employer)} set to ${m.margins[employer]}% over cost.` });
    return { ok: true, text: `Managers bid at ${m.margins[employer]}% over cost or more.` };
  }

  /** What wants the owner's attention: waiting requests, recent refusals, budgets nearly used or with no one to use them. */
  alerts() {
    const m = this.peek();
    if (!m) return [];
    const out = [];
    if (m.pending.length) out.push({ text: `${m.pending.length} request${m.pending.length === 1 ? ' is' : 's are'} waiting for you.`, advice: 'Approve or decline them below; they lapse after a week.' });
    for (const target of BUSINESSES) {
      for (const kind of KINDS[target]) {
        const cat = this.catOf(kind);
        const cap = this.budgetOf(target, cat);
        if (!cap || !this.K.established(target)) continue;
        if (kind === 'transfer' && !this.K.group.isSub(target)) continue;
        const name = this.Pe.employerName(target);
        if (!this.K.account(target).funded) out.push({ text: `${name} has a ${CATEGORIES[cat].name.toLowerCase()} budget but no account of its own.`, advice: 'Fund it: managers never spend your wallet.' });
        else if (!this.deciders(kind, target).length) out.push({ text: `${name}: nobody at work may decide ${this.verb(kind)}s${kind === 'bid' ? ' (they need the permission to sign contracts)' : kind === 'expand' ? ' (they need the permission to expand)' : kind === 'transfer' ? ' (a chief financial officer with the permission to move cash)' : ''}.`, advice: 'Hire the right manager or give them the permission, or the budget goes unused.' });
        if (this.spentIn(target, cat) >= cap * 0.8) out.push({ text: `${name}: ${Math.round((this.spentIn(target, cat) / cap) * 100)}% of the month's ${CATEGORIES[cat].name.toLowerCase()} budget is used.`, advice: 'Raise the budget if more is wanted this month.' });
      }
    }
    for (const l of m.log.filter((e) => e.type === 'refused' && e.day >= this.day - 3).slice(-5)) out.push({ text: l.text, advice: 'Changing the budget, the person\'s limits or the business\'s cash would let it through.' });
    return out;
  }

  /** What the app shows for one kind of decision at a business: the budget, what is used, and plain notes where nothing is happening. */
  status(target, kind) {
    const cat = this.catOf(kind);
    const out = { budget: this.budgetOf(target, cat), spent: this.spentIn(target, cat), notes: [] };
    if (!this.K.established(target)) { out.notes.push('Not yet owned.'); return out; }
    if (!this.K.account(target).funded) out.notes.push('Fund this business first: managers never spend your personal wallet.');
    if (!out.budget) out.notes.push('No monthly budget is set, so managers here may not spend.');
    if (kind === 'reorder' && target === 'aerospace' && this.g.aero.roost?.autoProcure) out.notes.push('Auto-buy is on: the firm buys for itself. Turn it off to have a manager buy within budget.');
    if (kind === 'bid' && this.peek()?.margins.aerospace === undefined) out.notes.push('No minimum margin is set, so managers bid on nothing.');
    if (kind === 'expand' && !this.plansOf(target).length) out.notes.push('No plan is approved, so managers build and buy nothing.');
    if (kind === 'transfer') {
      if (!this.K.group.isSub(target)) out.notes.push('Not in your group: treasury moves cash only inside it.');
      else if (!this.peek()?.treasury[target]) out.notes.push('No treasury policy is set, so nothing is moved.');
    }
    if (!this.deciders(kind, target).length) out.notes.push(`Nobody at work who may decide ${this.verb(kind)}s here${kind === 'bid' ? ' (the permission to sign contracts is needed)' : kind === 'expand' ? ' (the permission to expand is needed)' : kind === 'transfer' ? ' (a chief financial officer with the permission to move cash)' : ''}.`);
    return out;
  }
}
