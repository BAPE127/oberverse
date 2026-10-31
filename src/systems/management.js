// Managers deciding for themselves (v0.63.0, simplified in v0.89.0): game.corp.management.
//
// Every thing a manager does on their own is a *decision*, judged by one pure function (src/corp/management.js): carried out through the
// business's own service and written to the log; or queued for the owner, who approves or declines it on the tablet; or refused with the reason.
// A manager acts in the business's own interest and only inside what you have ticked for them (Buy supplies, Take contracts, Research, Expand;
// the group manager: Move cash). Expansion is always asked first. Each business has one monthly limit (set by you, or about a quarter of its
// cash), a cash reserve the game keeps in its account, and nothing is ever spent from your wallet: managers act only for a company with an
// account of its own.
//
// Nothing here runs, or is created, until someone is hired.
import { MGMT, KINDS } from '../content/management.js';
import { PERM_NAMES } from '../content/personnel.js';
import { judge, armsPar, planArmsOrders, nextPlot, nextPort, bidPrice, treasuryMove, autoCap, autoReserve, autoTreasury } from '../corp/management.js';
import { monthOf } from '../corp/ledger.js';

const BUSINESSES = ['arms', 'shipping', 'aerospace', 'farming'];
const KIND_PERM = { reorder: 'reorder', bid: 'bid', research: 'research', expand: 'expand', transfer: 'transfer' };

export class Management {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  get month() { return monthOf(this.day); }
  get Pe() { return this.K.personnel; }
  peek() {
    const m = this.K.state.management || null;
    if (m && m.v !== 2) this.migrate(m);
    return this.K.state.management || null;
  }

  ensure() {
    const st = this.K.state;
    if (st.management) return this.peek();
    st.management = { v: 2, caps: {}, spent: {}, pending: [], log: [], last: { day: 0, refused: {}, asked: {} }, nextId: 1 };
    return st.management;
  }

  /** A v0.63–v0.88 save: budgets by category become one limit a business, plans and treasury bands go (the game works them out now), waiting requests lapse. */
  migrate(old) {
    const caps = {};
    for (const [e, cats] of Object.entries(old.budgets || {})) { const sum = Object.entries(cats).filter(([c]) => c !== 'treasury').reduce((a, [, v]) => a + (v || 0), 0); if (sum > 0) caps[e] = sum; }
    const spent = {};
    for (const [e, cats] of Object.entries(old.spent || {})) for (const [c, by] of Object.entries(cats)) if (c !== 'treasury') for (const [mo, v] of Object.entries(by)) ((spent[e] ||= {})[mo] = (spent[e][mo] || 0) + v);
    const log = (old.log || []).slice(-MGMT.logKept);
    if ((old.pending || []).length) log.push({ day: this.day, type: 'expired', text: `${old.pending.length} waiting request${old.pending.length === 1 ? '' : 's'} lapsed when managers were simplified (v0.89.0); managers will ask again if it is still wanted.` });
    this.K.state.management = { v: 2, caps, spent, pending: [], log, last: { day: old.last?.day || 0, refused: {}, asked: {} }, nextId: old.nextId || 1, migrated: { day: this.day, plans: (old.plans || []).length } };
  }

  // ------------------------------------------------------------- the monthly limit
  /** What a business's managers may spend this month: yours if you set one, else about a quarter of its cash. */
  capOf(employer) { const c = this.peek()?.caps[employer]; return c > 0 ? c : autoCap(this.K.cashOf(employer)); }
  customCap(employer) { return this.peek()?.caps[employer] || 0; }
  spentIn(employer, m = this.month) { return this.peek()?.spent[employer]?.[m] || 0; }
  remaining(employer) { return Math.max(0, this.capOf(employer) - this.spentIn(employer)); }

  /** Set the monthly limit (0 or null: back to automatic). */
  setCap(employer, cap) {
    if (!BUSINESSES.includes(employer) || !this.K.established(employer)) return { ok: false, text: 'You do not own that business.' };
    cap = Math.round(Number(cap) || 0);
    if (!Number.isFinite(cap) || cap < 0 || cap > 5e6) return { ok: false, text: 'The limit is between 0 and 5,000,000 obols a month.' };
    const m = this.ensure();
    if (cap) m.caps[employer] = cap; else delete m.caps[employer];
    const name = this.Pe.employerName(employer);
    this.log({ type: 'budget', employer, text: cap ? `Monthly limit for ${name} set to ${cap.toLocaleString()}.` : `Monthly limit for ${name} is automatic again.` });
    return { ok: true, text: cap ? `${name}: managers may spend up to ${cap.toLocaleString()} obols a month.` : `${name}: the limit is automatic (about a quarter of its cash).` };
  }

  note(employer, amount) {
    const m = this.ensure();
    const by = (m.spent[employer] ||= {});
    by[this.month] = (by[this.month] || 0) + Math.round(amount);
    for (const k of Object.keys(by).map(Number).sort((a, b) => a - b).slice(0, -MGMT.spentMonths)) delete by[k];
  }

  /** The cash the game leaves in a business's account whatever a manager wants: fifteen days of what it costs to run. */
  reserveOf(employer) { return autoReserve(this.K.group.runningPerDay(employer) + this.Pe.holders(employer).reduce((a, x) => a + (x.salary || 0), 0)); }

  /** The cash the group manager never takes out of the parent: a month of what the parent itself costs. */
  parentReserve() { return Math.max(5000, 30 * (this.Pe.holders('parent').reduce((a, x) => a + (x.salary || 0), 0) + this.g.hq.upkeepPerDay())); }

  // ------------------------------------------------------------- the log
  log(e) {
    const m = this.ensure();
    m.log.push({ day: this.day, ...e });
    while (m.log.length > MGMT.logKept) m.log.shift();
  }

  // ------------------------------------------------------------- who may decide
  /** A manager of that business with the box ticked, or the group manager for a subsidiary of the group. */
  mayDecide(x, kind, target) {
    if (kind === 'transfer') return x.role === 'group_manager' && this.K.group.isSub(target);
    return x.role === 'manager' && x.employer === target && (KINDS[target] || []).includes(kind);
  }

  atWork(x) { return x.status === 'active' && x.startDay <= this.day && x.unpaid === 0 && this.Pe.employerOk(x.employer); }

  /** Whether they may do this on their own (the box). */
  permitted(x, kind) { return this.Pe.may(x, KIND_PERM[kind]); }

  /** The people at work who may make this kind of decision for a business, in a fixed order. */
  deciders(kind, target) {
    const p = this.Pe.peek();
    if (!p) return [];
    return Object.values(p.staff).filter((x) => this.mayDecide(x, kind, target) && this.atWork(x) && this.permitted(x, kind)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  }

  // ------------------------------------------------------------- the world's events (v0.76.0)
  /** How much dearer what this business buys is, because of the wars and embargoes of the day (0 with none). */
  pressure(target) { return this.K.geo.costFactor({ arms: 'arms', aerospace: 'aerospace', shipping: 'shipping', farming: 'agriculture' }[target]) - 1; }

  // ------------------------------------------------------------- judging
  judgeFor(x, kind, target, cost, { owner = false, ask = null, source = null } = {}) {
    return judge({
      kind, owner, ask, atWork: this.atWork(x), allowed: this.mayDecide(x, kind, target), permitted: this.permitted(x, kind),
      funded: this.K.established(target) && this.K.account(target).funded, frozen: this.K.business.inArrears(target), cost,
      hold: kind === 'expand' && this.pressure(target) >= MGMT.costHold ? `Costs here are up ${(this.pressure(target) * 100).toFixed(1)}% because of the wars and embargoes: managers hold back expansion to keep cash.` : null,
      cap: this.capOf(target), spent: this.spentIn(target), affordable: this.K.canAfford(source || target, cost + (source ? this.parentReserve() : this.reserveOf(target))),
    });
  }

  // ------------------------------------------------------------- what they would do (nothing changes)
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

  /** Aerospace tenders worth a bid at the owner's minimum margin, best profit first. Nothing changes: the quotes are pure. */
  planBids() {
    const A = this.g.aero;
    const co = A.roost;
    const margin = MGMT.bidMargin;
    if (!A.owned || !co) return [];
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
      out.push({ item: t.id, cost: Math.round(q.cost * t.qty), price: bp.price, days: q.days, profit: q.profit, ask: bp.below ? `The most this customer pays is below the usual margin of ${margin}%.` : null, desc: `${t.qty} × ${p.name} at ${bp.price.toLocaleString()} each` });
    }
    return out.sort((x, y) => y.profit - x.profit || (x.item < y.item ? -1 : 1));
  }

  /** What the policy would move for a subsidiary now. Nothing changes. */
  planTreasury(target) {
    const G = this.K.group;
    if (!G.isSub(target) || !this.K.established(target)) return [];
    const K = this.K;
    const inv = G.parent.investments[target];
    const mv = treasuryMove(autoTreasury(G.runningPerDay(target)), this.parentReserve(), {
      cash: K.cashOf(target), parentCash: K.cashOf('parent'), arrears: K.account(target).arrears + K.business.arrearsOf(target), minLiquidity: G.policyOf(target).minLiquidity,
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

  /** Research: the cheapest project that can start now, when none is under way (and none is queued). */
  planResearch(target) {
    const g = this.g;
    if (target === 'arms') {
      const A = g.arms;
      if (A.state.research.current) return [];
      const open = Object.entries(A.cfg.research).filter(([id]) => A.available(id)).sort((a, b) => a[1].cost - b[1].cost || (a[0] < b[0] ? -1 : 1));
      return open.length ? [{ item: open[0][0], cost: 0, desc: open[0][1].name, run: () => A.selectResearch(open[0][0]) }] : [];
    }
    const A = g.aero; const co = A.roost;
    if (!A.owned || !co || co.researching || co.queue?.length) return [];
    const open = Object.entries(A.cfg.research).filter(([id, R]) => !co.research.includes(id) && (R.requires || []).every((r) => co.research.includes(r))).sort((a, b) => a[1].cost - b[1].cost || (a[0] < b[0] ? -1 : 1));
    return open.length ? [{ item: open[0][0], cost: open[0][1].cost, desc: open[0][1].name, run: () => { const before = this.K.cashOf('aerospace'); const r = A.startResearch(co, open[0][0]); return { ...r, paid: Math.max(0, before - this.K.cashOf('aerospace')) || open[0][1].cost }; } }] : [];
  }

  /** Expansion: what the business would buy or build next, by a fixed rule (cheapest first) — only ever proposed to you, never done unasked. */
  planExpansion(target) {
    const g = this.g;
    const out = [];
    if (target === 'arms') {
      const A = g.arms;
      if (!A.licensed()) return [];
      const next = Object.keys(g.content.armsWarehouses || {}).filter((id) => !A.owns(id)).map((id) => ({ id, price: A.def(id).price })).sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1))[0];
      if (next) out.push({ item: `works:${next.id}`, cost: next.price, desc: A.def(next.id).name, run: () => A.buy(next.id) });
    } else if (target === 'farming') {
      const F = g.farm;
      const plots = Object.keys(F.def.plots).map((id) => ({ id, d: F.plotDef(id) })).filter((x) => x.d).map((x) => ({ id: x.id, price: x.d.price, rect: x.d.field }));
      const pick = nextPlot(plots, F.owned(), MGMT.plotGap);
      if (pick) out.push({ item: `plot:${pick.id}`, cost: pick.price, desc: F.plotDef(pick.id).name, run: () => F.buy(pick.id) });
    } else if (target === 'shipping') {
      const L = g.logistics;
      if (L.ownedPorts().length < L.L.maxPorts) {
        const pick = nextPort(Object.keys(L.cfg.ports).map((id) => ({ id, price: L.portType(id)?.price ?? Infinity })).filter((p) => Number.isFinite(p.price)), L.ownedPorts());
        if (pick) out.push({ item: `port:${pick.id}`, cost: pick.price, desc: L.port(pick.id).name, run: () => L.buyPort(pick.id) });
      }
    } else if (target === 'aerospace') {
      const A = g.aero; const co = A.roost;
      if (!A.owned || !co) return [];
      for (const [id, B] of Object.entries(A.cfg.bays)) if (A.freeSlot(co, id)) out.push({ item: `bay:${id}`, cost: B.build, desc: `a ${B.name.toLowerCase()}`, run: () => A.buildBay(co, id) });
      for (const [id, F] of Object.entries(A.cfg.facilities)) { if (!F.build) continue; if ((id === 'pad' ? co.pad : co.facilities[id]) || co.building?.[id]) continue; out.push({ item: `facility:${id}`, cost: F.build, desc: F.name, run: () => A.buildFacility(co, id) }); }
      out.sort((a, b) => a.cost - b.cost || (a.item < b.item ? -1 : 1));
    }
    return out;
  }

  // ------------------------------------------------------------- the decision
  /** What a decision could be now: [{ item, cost, ... }]; the first is the one made. Nothing changes. */
  candidates(kind, target) {
    if (kind === 'reorder') { const c = (target === 'arms' ? this.planArms() : this.planAero()).reduce((a, o) => a + o.cost, 0); return c > 0 ? [{ item: null, cost: c }] : []; }
    if (kind === 'bid') return this.planBids();
    if (kind === 'research') return this.planResearch(target);
    if (kind === 'transfer') return this.planTreasury(target);
    return this.planExpansion(target);
  }

  /** The text of what was done or asked, by kind. */
  verb(kind) { return { reorder: 'buy supplies', bid: 'bid', research: 'start research', expand: 'expand', transfer: 'move cash' }[kind]; }

  /** Make a decision: execute, queue or refuse. `item` picks one candidate (an approval); without it the first the person may do, else the first. */
  decide(kind, target, x, { owner = false, item = undefined } = {}) {
    const m = this.ensure();
    const all = this.candidates(kind, target);
    let cand;
    const judgeOf = (c) => this.judgeFor(x, kind, target, c.cost, { owner, ask: c.ask || null, source: c.source || null });
    if (item !== undefined) cand = all.find((c) => c.item === item);
    else cand = all.find((c) => judgeOf(c).verdict !== 'refuse') || all[0];
    if (!cand) return { verdict: 'none' };
    const cost = cand.cost;
    const key = `${kind}|${target}${cand.item ? `|${cand.item}` : ''}`;
    const j = judgeOf(cand);
    const who = `${x.name} (${this.Pe.employerName(x.employer)} ${x.role === 'manager' ? 'manager' : 'group manager'})`;
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
      this.g.notify?.(`${x.name} would like to ${this.verb(kind)}${cand.desc ? `: ${cand.desc}` : ''} (${cost.toLocaleString()} obols). Your call.`, 'info');
      return { ...j, cost, request: q };
    }
    delete m.last.refused[key];
    const r = this.carryOut(kind, target, x, cand);
    if (!r.ok) { this.log({ type: 'failed', kind, employer: target, actor: x.id, cost, text: `${who}: ${r.text}` }); return { verdict: 'failed', text: r.text, cost }; }
    const spend = kind === 'bid' ? cost : r.paid;
    if (kind !== 'transfer' && !owner) this.note(target, spend);
    if (kind !== 'bid') this.K.noteActor(kind === 'transfer' ? 'parent' : target, x.id, r.paid);
    this.log({ type: owner ? 'approved' : 'done', kind, employer: target, actor: x.id, cost: spend, text: `${who}: ${r.text}` });
    if (!owner && (kind === 'bid' || kind === 'research')) this.g.notify?.(r.text, 'info');
    return { verdict: 'execute', cost: spend, text: r.text };
  }

  /** You do what a manager would: the first thing worth doing of that kind, now, from the business's own account. No limit applies: it is you. */
  doNow(kind, target) {
    const at = this.Pe.employerName(target);
    const c = this.candidates(kind, target)[0];
    if (!c) return { ok: false, text: 'Nothing to do right now.' };
    if (!this.K.canAfford(target, c.cost)) return { ok: false, text: `${at} cannot pay ${c.cost.toLocaleString()} obols.` };
    const r = this.carryOut(kind, target, null, c);
    if (r.ok) this.log({ type: 'owner', kind, employer: target, cost: r.paid, text: `You: ${r.text}` });
    return { ok: r.ok, text: r.text };
  }

  carryOut(kind, target, x, cand) {
    if (kind === 'reorder') return this.doReorder(target, x);
    if (kind === 'bid') {
      const r = this.g.aero.placeBid(this.g.aero.roost.id, cand.item, cand.price, cand.days);
      return { ok: r.ok, paid: 0, text: r.text };
    }
    if (kind === 'transfer' || kind === 'research') { const r = cand.run(); return { ok: r.ok, paid: r.paid || 0, text: r.text }; }
    const before = this.K.cashOf(target);
    const r = cand.run();
    if (!r.ok) return { ok: false, paid: 0, text: r.text };
    return { ok: true, paid: Math.max(0, before - this.K.cashOf(target)) || cand.cost, text: r.text };
  }

  // ------------------------------------------------------------- the owner's side
  /** Approve a waiting request: judged again from scratch (the world may have moved). */
  approve(id) {
    const m = this.peek();
    const q = m?.pending.find((r) => r.id === id);
    if (!q) return { ok: false, text: 'That request is gone.' };
    m.pending = m.pending.filter((r) => r !== q);
    const x = this.Pe.person(q.actor);
    if (!x || x.status !== 'active' || !this.mayDecide(x, q.kind, q.employer)) { this.log({ type: 'failed', kind: q.kind, employer: q.employer, actor: q.actor, text: 'Request lapsed: the person no longer works there.' }); return { ok: false, text: 'They no longer work there.' }; }
    const r = this.decide(q.kind, q.employer, x, { owner: true, item: q.item || (q.kind === 'bid' ? undefined : null) });
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
  /** Once a day, after payroll's day: each business gets, at most, one decision of each kind its manager may make. Does nothing until someone is hired. */
  dailyTick() {
    const m = this.peek();
    if (!m || m.last.day >= this.day) return;
    m.last.day = this.day;
    const expired = m.pending.filter((q) => this.day - q.day >= MGMT.expireDays);
    for (const q of expired) this.log({ type: 'expired', kind: q.kind, employer: q.employer, actor: q.actor, cost: q.cost, text: `A request to ${this.verb(q.kind)} at ${this.Pe.employerName(q.employer)} lapsed: you did not answer in ${MGMT.expireDays} days.` });
    m.pending = m.pending.filter((q) => !expired.includes(q));
    for (const target of BUSINESSES) {
      if (!this.K.established(target) || !this.K.account(target).funded) continue;
      for (const kind of KINDS[target]) {
        if (kind === 'reorder' && target === 'aerospace' && this.g.aero.roost?.autoProcure) continue; // auto-buy is the owner's own standing order, left as it is
        if (kind === 'transfer' && !this.K.group.isSub(target)) continue;
        const who = this.deciders(kind, target)[0];
        if (who) this.decide(kind, target, who);
      }
    }
  }

  // ------------------------------------------------------------- what to show
  /** What wants the owner's attention: waiting requests and the reasons nothing is happening. */
  alerts() {
    const m = this.peek();
    if (!m) return [];
    const out = [];
    if (m.pending.length) out.push({ text: `${m.pending.length} request${m.pending.length === 1 ? ' is' : 's are'} waiting for you.`, advice: 'Approve or decline them; they lapse after a week.' });
    for (const target of BUSINESSES) {
      if (!this.K.established(target) || !this.Pe.holders(target, 'manager').length) continue;
      if (!this.K.account(target).funded) out.push({ text: `${this.Pe.employerName(target)} has a manager but no account of its own.`, advice: 'Fund it: managers never spend your wallet.' });
    }
    for (const l of m.log.filter((e) => e.type === 'refused' && e.day >= this.day - 3).slice(-3)) out.push({ text: l.text, advice: 'A bigger limit, more cash in the business, or a ticked box would change this.' });
    return out;
  }

  /** What a business's manager card shows: who, what is ticked, the limit and what is used, and a plain note where nothing can happen. */
  card(target) {
    const x = this.Pe.holders(target, 'manager')[0] || null;
    const out = { target, name: this.Pe.employerName(target), manager: x, limit: this.capOf(target), custom: this.customCap(target), spent: this.spentIn(target), notes: [] };
    if (!this.K.established(target)) { out.notes.push('Not yet owned.'); return out; }
    if (x && !this.K.account(target).funded) out.notes.push('Fund this business first: managers never spend your wallet.');
    if (x && target === 'aerospace' && this.g.aero.roost?.autoProcure && this.Pe.may(x, 'reorder')) out.notes.push('Auto-buy is on, so the firm buys supplies itself.');
    return out;
  }
}
