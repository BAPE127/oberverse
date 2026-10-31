// The people who run your companies (v0.62.0): game.corp.personnel.
//
//   candidates() / offer() / dismiss() / reassign() / promote() / raise() / setAuthority()
//   payroll()                     once a day at 19:05, from each employer's own account
//   effect(employer, key)         what the good people at an employer do for it (bounded, cached by day)
//   openings()                    the jobs there is a case for filling, with the reason
//   all()                         every person: your hires, and the arms works' floor staff as a view
//
// A market of about two dozen candidates is kept in the save and made once from a salt (hashes, never
// the game's dice): reopening the screen or loading never reshuffles it, and each week a few leave and a
// few arrive. Hiring takes the candidate out of the market, pays the fee once, and makes a person with
// ONE job at ONE employer (the parent company or a business). Wages are an expense of that employer, paid
// daily if it can afford them; a person unpaid two days running resigns. Skills grow only from good
// results. The arms works' own staff (src/systems/arms.js) are not copied: they are listed here as they
// are, and the arms works still hires, pays and dismisses them.
//
// Authority (what a person may spend, approve or do) is what managers' own decisions are held to (src/systems/management.js).
//
// State: world.corp.people = { v, salt, nextCand, nextStaff, lastWeek, reviewMonth, pool, staff, pay, log }.
// Created by ensure() on first use — never by a getter the hooks call.
import { SKILLS, GRADES, AUTHORITY, ROLES, EFFECT_CAPS, EXEC_REACH, MARKET, FIRST, LAST, EDUCATION, STYLES } from '../content/personnel.js';
import { makeCandidate, rolesFor, roleFit, evaluateOffer, floorPay, effectsOf, needsFor, grow, avgOf, MIN_FIT } from '../corp/people.js';
import { monthTotals } from '../corp/ledger.js';

const LOG = 100;

// the bundler has no `import * as`, so the content is gathered into one object here
const P = { SKILLS, GRADES, AUTHORITY, ROLES, EFFECT_CAPS, EXEC_REACH, MARKET, FIRST, LAST, EDUCATION, STYLES };

export class Personnel {
  constructor(corp) {
    this.K = corp;
    this.cache = new Map();
    this.epoch = 0;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  /** The saved market, or null if nothing has opened it yet (the hooks use this: it creates nothing). */
  peek() { return this.K.state.people || null; }

  /** Open the market: made once, from a salt kept in the save. */
  ensure() {
    const st = this.K.state;
    if (st.people) return st.people;
    const people = { v: 1, salt: String(this.g.rng.state), nextCand: 1, nextStaff: 1, lastWeek: Math.floor((this.day - 1) / 7), reviewMonth: Math.floor((this.day - 1) / 30) - 1, pool: [], staff: {}, pay: {}, log: [] };
    st.people = people;
    this.fill();
    return people;
  }

  priorNames() {
    const st = this.K.state;
    return [...(st.generated || []).map((c) => c.name), ...Object.values(this.g.content.arms.shippers).map((s) => s.name)];
  }

  /** Top the market up to its size with new candidates (numbered, never reused). */
  fill() {
    const p = this.peek();
    const prior = this.priorNames();
    while (p.pool.length < P.MARKET.pool) p.pool.push(makeCandidate(P, { salt: p.salt, n: p.nextCand++, day: this.day, prior }));
  }

  /** Each week a few take other jobs and a few new ones appear; after a long gap at most four weeks are run. */
  weekly() {
    const p = this.peek();
    if (!p) return;
    const week = Math.floor((this.day - 1) / 7);
    for (let w = Math.max(p.lastWeek + 1, week - 3); w <= week; w++) {
      const [lo, hi] = P.MARKET.weekLeave;
      const k = lo + Math.floor(hashU(`${p.salt}|leave${w}`) * (hi - lo + 1));
      for (let i = 0; i < k && p.pool.length > 6; i++) p.pool.splice(Math.floor(hashU(`${p.salt}|w${w}|${i}`) * p.pool.length), 1);
      this.fill();
    }
    p.lastWeek = week;
  }

  // ------------------------------------------------------------- employers
  /** Whether a business or the parent can employ people now, and the account it pays from. */
  employerOk(id) {
    if (id === 'parent') return Boolean(this.K.state.parent);
    return this.K.established(id);
  }

  employerName(id) { return id === 'parent' ? this.K.nameOf('parent') : this.K.nameOf(id); }

  roleAllowed(role, employer) {
    const R = P.ROLES[role];
    return Boolean(R && R.employers.includes(employer));
  }

  holders(employer, role = null, except = null) {
    const p = this.peek();
    return p ? Object.values(p.staff).filter((x) => x.employer === employer && x.status === 'active' && (role === null || x.role === role) && x.id !== except) : [];
  }

  // ------------------------------------------------------------- the market
  /** Every candidate, with what they would take and the jobs they suit. */
  candidates() {
    const p = this.ensure();
    return p.pool.map((c) => ({ ...c, roles: rolesFor(P, c), floor: floorPay(c) }));
  }

  candidate(id) { return this.peek()?.pool.find((c) => c.id === id) || null; }

  /** What hiring this person into that job there would be, and whether it would pay for itself on today's figures. */
  benefit(cand, role, employer) {
    const eff = effectsOf(P, [{ role, skills: cand.skills, reliability: cand.reliability, unpaid: 0 }], employer === 'parent' ? P.EXEC_REACH : 1);
    const spend = (id, key) => this.spendPerDay(id, key);
    let perDay = 0;
    const targets = employer === 'parent' ? this.K.group.subs() : [employer];
    for (const t of targets) for (const [k, v] of Object.entries(eff)) perDay += spend(t, k) * v;
    return { effects: eff, perDay: Math.round(perDay) };
  }

  /** What a business spends (or sells, or produces) per day that an effect applies to: from its own recent books. */
  spendPerDay(id, key) {
    const g = this.g;
    if (!this.K.established(id)) return 0;
    const a = this.K.account(id);
    const m = Math.floor((this.day - 1) / 30);
    const days = Math.min(60, ((this.day - 1) % 30) + 31);
    const out = (cat) => ((a.months[m]?.out[cat] || 0) + (a.months[m - 1]?.out[cat] || 0)) / days;
    const rev = () => (monthTotals(a, m).revenue + monthTotals(a, m - 1).revenue) / days;
    switch (key) {
      case 'materials': return id === 'aerospace' ? out('materials') : 0;
      case 'parts': return id === 'arms' ? out('parts') : 0;
      case 'overhead': return id === 'aerospace' ? g.aero.roost.overhead : 0;
      case 'upkeep': return id === 'shipping' ? g.logistics.dailyUpkeep() : 0;
      case 'farmPrice': return id === 'farming' ? rev() : 0;
      case 'armsSpeed': return id === 'arms' ? rev() : 0;
      default: return 0;
    }
  }

  // ------------------------------------------------------------- hiring
  checkPlacement(cand, role, employer, except = null, { promotion = false } = {}) {
    const R = P.ROLES[role];
    if (!R) return 'No such job.';
    if (!this.employerOk(employer)) return employer === 'parent' ? 'There is no parent company yet.' : 'You do not own that business yet.';
    if (!this.roleAllowed(role, employer)) return `${R.name} is not a job at ${employer === 'parent' ? 'the parent company' : 'that kind of business'}.`;
    if (promotion ? roleFit(P, cand, role) < MIN_FIT : !rolesFor(P, cand).includes(role)) return `${cand.first}'s skills do not suit ${R.name} (they average ${Math.round(roleFit(P, cand, role))}; the job needs ${MIN_FIT}).`;
    if (employer === 'parent') { const seat = this.g.hq?.seatError(except); if (seat) return seat; } // v0.87.0: an office has only so many seats (no office, no limit)
    if (this.holders(employer, role, except).length >= R.limit) return `${this.employerName(employer)} already has ${R.limit === 1 ? 'a' : R.limit} ${R.name}${R.limit > 1 ? 's' : ''}.`;
    return null;
  }

  /** Pay a wage bill or a fee out of an employer, in the way that employer's own books record it. One call, one notice. */
  payFor(employer, amount, cat, actor) {
    amount = Math.round(amount);
    if (amount <= 0) return true;
    const g = this.g;
    switch (employer) {
      case 'aerospace': g.aero.pay(g.aero.roost, amount, cat === 'wages' ? 'wages' : 'hiring'); this.K.noteActor('aerospace', actor, amount); return true;
      case 'shipping': g.logistics.spend(amount, cat); this.K.noteActor('shipping', actor, amount); return true;
      case 'farming': this.K.pay('farming', amount, { cat, actor }); g.farm.record(cat === 'wages' ? 'Wages' : 'Hiring', -amount); return true;
      default: return this.K.pay(employer, amount, { cat, actor });
    }
  }

  /** Make an offer: they accept at or above their floor; the fee (days of the wage) is paid once; they start when their notice is served. */
  offer(candId, { role, employer, pay, unit = null }) {
    const p = this.ensure();
    const c = this.candidate(candId);
    if (!c) return { ok: false, text: 'That candidate has gone.' };
    const why = this.checkPlacement(c, role, employer);
    if (why) return { ok: false, text: why };
    pay = Math.round(Number(pay));
    const ev = evaluateOffer(c, pay);
    if (!ev.ok) return { ok: false, text: ev.why, floor: ev.floor };
    const fee = pay * P.MARKET.fee;
    if (!this.K.canAfford(employer, fee)) return { ok: false, text: `${this.employerName(employer)} cannot pay the recruiting fee of ${fee.toLocaleString()} obols.` };
    const id = `per_${p.nextStaff++}`;
    this.payFor(employer, fee, 'hiring', id);
    const R = P.ROLES[role];
    const person = { ...c, id, employer, role, tier: R.tier, salary: pay, hiredDay: this.day, startDay: Math.max(this.day, c.availableDay), status: 'active', unpaid: 0, loyalty: ev.loyalty, xp: 0, gains: 0, unit, authority: { ...P.AUTHORITY[R.tier] }, log: [], reviews: [], skills0: { ...c.skills } };
    p.staff[id] = person;
    p.pool = p.pool.filter((x) => x.id !== candId);
    this.note(person, 'hired', `Hired as ${R.name} at ${this.employerName(employer)} for ${pay.toLocaleString()} a day${person.startDay > this.day ? `, starting day ${person.startDay}` : ''}.`);
    this.epoch++;
    this.g.bus.emit('corp:hired', { id });
    return { ok: true, person, text: `${c.name} is ${R.name} at ${this.employerName(employer)}: ${pay.toLocaleString()} a day${person.startDay > this.day ? `, starting on day ${person.startDay} when their notice ends` : ''}. Recruiting fee ${fee.toLocaleString()}.` };
  }

  note(person, type, text) {
    person.log.push({ day: this.day, type, text });
    if (person.log.length > 30) person.log.shift();
    const p = this.peek();
    p.log.push({ day: this.day, id: person.id, name: person.name, type, text });
    if (p.log.length > LOG) p.log.shift();
  }

  person(id) { return this.peek()?.staff[id] || null; }

  /** End a job. Severance (days of wage) is paid once; the record is kept. */
  dismiss(id, reason = 'dismissed') {
    const x = this.person(id);
    if (!x || x.status !== 'active') return { ok: false, text: 'No such employee.' };
    const sev = x.salary * P.MARKET.severance;
    if (reason === 'dismissed') {
      if (!this.K.canAfford(x.employer, sev)) return { ok: false, text: `${this.employerName(x.employer)} cannot pay ${sev.toLocaleString()} obols of severance.` };
      this.payFor(x.employer, sev, 'wages', id);
    }
    x.status = reason;
    x.endDay = this.day;
    this.note(x, reason, reason === 'dismissed' ? `Dismissed; ${sev.toLocaleString()} of severance paid.` : 'Resigned.');
    this.epoch++;
    return { ok: true, text: reason === 'dismissed' ? `${x.name} is dismissed with ${sev.toLocaleString()} obols of severance.` : `${x.name} has resigned.` };
  }

  /** Move a person to another job or employer (one assignment at a time); their wage goes with them. */
  reassign(id, { role = null, employer = null, unit = null } = {}) {
    const x = this.person(id);
    if (!x || x.status !== 'active') return { ok: false, text: 'No such employee.' };
    const r = role || x.role;
    const e = employer || x.employer;
    const why = this.checkPlacement(x, r, e, id);
    if (why) return { ok: false, text: why };
    if (r === x.role && e === x.employer && unit === x.unit) return { ok: false, text: 'They are already there.' };
    const from = `${P.ROLES[x.role].name} at ${this.employerName(x.employer)}`;
    x.role = r; x.employer = e; x.tier = P.ROLES[r].tier; x.unit = unit; x.unpaid = 0;
    this.note(x, 'moved', `Moved from ${from} to ${P.ROLES[r].name} at ${this.employerName(e)}.`);
    this.epoch++;
    return { ok: true, text: `${x.name} is now ${P.ROLES[r].name} at ${this.employerName(e)}.` };
  }

  /** Promotion: long enough in the job, results that held up, and skills that suit the higher one; with a raise. */
  promoteCheck(id, role) {
    const x = this.person(id);
    if (!x || x.status !== 'active') return 'No such employee.';
    const R = P.ROLES[role];
    const rank = { staff: 0, manager: 1, executive: 2 };
    if (!R || rank[R.tier] <= rank[x.tier]) return 'That is not a step up.';
    if (this.day - x.startDay < P.MARKET.promoteDays) return `They need ${P.MARKET.promoteDays} days in the job first (${Math.max(0, P.MARKET.promoteDays - (this.day - x.startDay))} to go).`;
    if (x.reviews.filter((r) => r.good).length < 2) return 'Their results have not yet earned it (two good months).';
    if (roleFit(P, x, role) < MIN_FIT + 10) return `Their skills (${Math.round(roleFit(P, x, role))}) are short of what ${R.name} needs (${MIN_FIT + 10}).`;
    return null;
  }

  promote(id, role, employer = null) {
    const why = this.promoteCheck(id, role);
    if (why) return { ok: false, text: why };
    const x = this.person(id);
    const e = employer || x.employer;
    const place = this.checkPlacement(x, role, e, id, { promotion: true });
    if (place) return { ok: false, text: place };
    const R = P.ROLES[role];
    const raise = Math.max(Math.round((x.salary * 1.15) / 5) * 5, R.pay[0]);
    const from = P.ROLES[x.role].name;
    x.role = role; x.employer = e; x.tier = R.tier; x.salary = raise; x.authority = { ...P.AUTHORITY[R.tier] }; x.unpaid = 0; x.loyalty = Math.min(95, x.loyalty + 10);
    this.note(x, 'promoted', `Promoted from ${from} to ${R.name} at ${this.employerName(e)}; wage ${raise.toLocaleString()} a day.`);
    this.epoch++;
    return { ok: true, text: `${x.name} is promoted to ${R.name}, on ${raise.toLocaleString()} a day.` };
  }

  raise(id, pay) {
    const x = this.person(id);
    pay = Math.round(Number(pay));
    if (!x || x.status !== 'active') return { ok: false, text: 'No such employee.' };
    if (!(pay > x.salary)) return { ok: false, text: 'A raise must be more than they earn now.' };
    x.loyalty = Math.min(95, x.loyalty + 5);
    this.note(x, 'raise', `Wage raised from ${x.salary.toLocaleString()} to ${pay.toLocaleString()} a day.`);
    x.salary = pay;
    return { ok: true, text: `${x.name} now earns ${pay.toLocaleString()} a day.` };
  }

  /** Set what a person may spend and do. Bounded by their level; managers' decisions are judged against it (v0.63.0). */
  setAuthority(id, patch) {
    const x = this.person(id);
    if (!x || x.status !== 'active') return { ok: false, text: 'No such employee.' };
    const max = { executive: 500000, manager: 100000, staff: 10000 }[x.tier];
    const a = { ...x.authority };
    for (const k of ['spendLimit', 'approvalAbove']) if (k in patch) a[k] = Math.max(0, Math.min(max, Math.round(Number(patch[k]) || 0)));
    for (const k of ['canHire', 'canBorrow', 'canTransfer', 'canContract', 'canExpand']) if (k in patch) a[k] = Boolean(patch[k]);
    if (a.approvalAbove > a.spendLimit) a.approvalAbove = a.spendLimit;
    if (x.tier === 'staff') { a.canBorrow = false; a.canTransfer = false; }
    x.authority = a;
    this.note(x, 'authority', 'Authority changed.');
    return { ok: true, text: `${x.name}'s authority is set: a manager's own decisions are held to it.` };
  }

  // ------------------------------------------------------------- payroll
  /**
   * Once a day: each employer pays the people it can afford, in order of engagement; anyone it cannot pay goes
   * unpaid and loses heart, and two unpaid days running they resign. Whether it could is a question of the
   * employer's own cash — a short business cannot simply borrow its way into paying.
   */
  payroll() {
    const p = this.peek();
    if (!p) return { paid: 0 };
    const day = this.day;
    const byEmp = {};
    for (const x of Object.values(p.staff)) if (x.status === 'active' && x.startDay <= day) (byEmp[x.employer] ||= []).push(x);
    let paidTotal = 0;
    for (const [emp, list] of Object.entries(byEmp)) {
      if (p.pay[emp] >= day) continue; // this employer's day is done
      if (!this.employerOk(emp)) continue;
      let cash = this.K.cashOf(emp);
      let total = 0;
      for (const x of list.sort((a, b) => a.hiredDay - b.hiredDay || a.id.localeCompare(b.id))) {
        if (cash >= x.salary) { cash -= x.salary; total += x.salary; x.unpaid = 0; x.paidDays = (x.paidDays || 0) + 1; }
        else {
          x.unpaid += 1; x.loyalty = Math.max(0, x.loyalty - 12);
          this.note(x, 'unpaid', `Unpaid today (${this.employerName(emp)} could not afford ${x.salary.toLocaleString()}).`);
          if (x.unpaid >= P.MARKET.resignUnpaid) { this.dismiss(x.id, 'resigned'); this.g.notify?.(`${x.name} has resigned from ${this.employerName(emp)}: unpaid twice.`, 'warn'); }
        }
      }
      if (total > 0) this.payFor(emp, total, 'wages', 'payroll');
      p.pay[emp] = day;
      paidTotal += total;
    }
    this.epoch++;
    return { paid: paidTotal };
  }

  // ------------------------------------------------------------- effects
  /** Everyone at an employer now at work (the notice served, wages not owed): what the effects read. */
  roster(employer) {
    const day = this.day;
    return this.holders(employer).filter((x) => x.startDay <= day).map((x) => ({ role: x.role, skills: x.skills, reliability: x.reliability, unpaid: x.unpaid }));
  }

  /** What the good people at an employer do for it: a number to multiply by, bounded, and cached for the day. */
  effects(employer) {
    const p = this.peek();
    if (!p) return {};
    const key = `${this.day}|${this.epoch}|${employer}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    if (this.cache.size > 40) this.cache.clear();
    const own = effectsOf(P, this.roster(employer));
    const out = { ...own };
    if (employer !== 'parent' && this.K.group.isSub(employer)) {
      const up = effectsOf(P, this.roster('parent'), P.EXEC_REACH);
      for (const [k, v] of Object.entries(up)) out[k] = Math.min(P.EFFECT_CAPS[k] ?? 0, (out[k] || 0) + v);
    }
    this.cache.set(key, out);
    return out;
  }

  effect(employer, key) { return this.peek() ? (this.effects(employer)[key] || 0) : 0; }

  // ------------------------------------------------------------- time
  dailyTick() {
    const p = this.peek();
    if (!p) return;
    this.weekly();
    const cur = Math.floor((this.day - 1) / 30);
    for (let m = Math.max(p.reviewMonth + 1, cur - 3); m <= cur - 1; m++) this.review(m);
    p.reviewMonth = Math.max(p.reviewMonth, cur - 1);
  }

  /** The business's trading result for a closed month. */
  resultOf(employer, m) {
    if (employer === 'parent') return this.K.group.subs().reduce((a, id) => a + this.resultOf(id, m), 0);
    const reg = this.K.registry().find((r) => r.playerId === employer);
    return this.K.rowsOf(reg).rows.find((r) => r.m === m)?.net ?? 0;
  }

  /**
   * Month's end: each person's employer against its own recent form. A month better than the average of the
   * three before it, with the person paid in full, is a good one; skills grow from good months and from nothing else.
   */
  review(m) {
    const p = this.peek();
    for (const x of Object.values(p.staff)) {
      if (x.status !== 'active' || x.startDay > m * 30 + 30) continue;
      if (!this.employerOk(x.employer)) continue;
      const net = this.resultOf(x.employer, m);
      const prev = [m - 1, m - 2, m - 3].map((k) => this.resultOf(x.employer, k));
      const base = prev.reduce((a, b) => a + b, 0) / 3;
      const good = net > base && x.unpaid === 0 && net > 0;
      const r = grow(P, x, good);
      if (r.gained) { x.skills[r.gained] += 1; x.gains += 1; this.note(x, 'skill', `${P.SKILLS[r.gained].name} rises to ${x.skills[r.gained]} on a good run.`); }
      x.xp = r.xp;
      x.reviews.push({ m, net: Math.round(net), base: Math.round(base), good });
      if (x.reviews.length > 12) x.reviews.shift();
      this.epoch++;
    }
  }

  // ------------------------------------------------------------- what to show
  /** What a business or the parent has a case for hiring, with the reason and what it costs. */
  openings() {
    const g = this.g;
    const out = [];
    const heldOf = (e) => Object.fromEntries(this.holders(e).map((x) => [x.role, true]));
    const people = this.peek() ? Object.values(this.peek().staff).filter((x) => x.status === 'active').length : 0;
    if (this.K.state.parent) {
      for (const n of needsFor(P, { kind: 'parent', subs: this.K.group.subs().length, loans: (this.K.state.loans || []).some((l) => l.status === 'open'), people, held: heldOf('parent') })) out.push({ employer: 'parent', ...n });
    }
    for (const id of ['arms', 'shipping', 'aerospace', 'farming']) {
      if (!this.K.established(id)) continue;
      const f = { kind: id, held: heldOf(id) };
      if (id === 'arms') { f.works = g.arms.ownedIds().length; f.staff = g.arms.state.staff.length; }
      if (id === 'aerospace') f.bays = g.aero.roost.bays.length;
      if (id === 'shipping') { f.vessels = g.logistics.vessels().length; f.ports = g.logistics.ownedPorts().length; }
      if (id === 'farming') f.plots = g.farm.owned().length;
      for (const n of needsFor(P, f)) out.push({ employer: id, ...n });
    }
    return out.map((o) => ({ ...o, roleName: P.ROLES[o.role].name, employerName: this.employerName(o.employer), pay: P.ROLES[o.role].pay }));
  }

  /** The arms works' staff, as they are (not copies): named people at stations, paid and dismissed by the works. */
  armsFloor() {
    const g = this.g;
    return g.arms.state.staff.map((s) => ({ id: s.id, name: s.name, employer: 'arms', role: 'station worker', roleName: 'Station worker', tier: 'floor', salary: s.wage, unpaid: s.unpaid, loyalty: Math.round(s.morale), floor: true, skills: s.skills, main: s.main, hiredDay: s.hiredDay, status: 'active' }));
  }

  /** Everyone: the people you hired (current), and the arms works' floor staff. */
  all() {
    const p = this.peek();
    const mine = p ? Object.values(p.staff).filter((x) => x.status === 'active') : [];
    return [...mine, ...this.armsFloor()];
  }

  /** What each employer pays each day in wages that this system pays, and — for information — what the old systems pay on their own. */
  payrollSummary() {
    const p = this.peek();
    const rows = {};
    for (const x of p ? Object.values(p.staff).filter((y) => y.status === 'active') : []) { const r = (rows[x.employer] ||= { employer: x.employer, name: this.employerName(x.employer), people: 0, perDay: 0 }); r.people++; if (x.startDay <= this.day) r.perDay += x.salary; }
    const g = this.g;
    const floor = this.armsFloor().reduce((a, x) => a + x.salary, 0);
    const crews = g.aero.owned ? (() => { const F = g.aero.fixedCosts(g.aero.roost); return F.wages + F.training; })() : 0;
    return { rows: Object.values(rows), total: Object.values(rows).reduce((a, r) => a + r.perDay, 0), armsFloorPerDay: floor, aerospaceCrewsPerDay: crews };
  }
}

function hashU(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000003) / 1000003;
}
