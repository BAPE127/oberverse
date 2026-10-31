// The people who run your companies (v0.89.0): game.corp.personnel.
//
//   quote(role, employer)         what hiring one costs, or why not
//   hire(role, employer)          one tap: a flat wage, a signing fee, no skills and no candidates
//   dismiss(id) / setPerm(id, key, on)
//   payroll()                     once a day at 19:05, from each employer's own account
//   effect(employer, key)         what a manager does for their business (the same for every manager; cached by day)
//   vacancies()                   the jobs worth filling now
//   all()                         every person: your hires, and the arms works' floor staff as a view
//
// There are three jobs (src/content/personnel.js): a Manager for each business, one Group manager at the parent, and Office staff for the
// headquarters' desks. A person has ONE job at ONE employer, is paid a flat wage out of that employer's own account each day (unpaid two
// days running, they resign), and has a tick-box for each thing they may decide for themselves (src/systems/management.js). The arms
// works' own staff (src/systems/arms.js) are not copied: they are listed here as they are.
//
// State: world.corp.people = { v: 2, salt, nextStaff, staff, pay, log }. Created by ensure() on first use — never by a getter the hooks
// call. A save from v0.62–v0.88 is converted the first time it is read (migrate()).
import { ROLES, MARKET, PERKS, FIRST, LAST, PERM_NAMES, wageOf, permsFor } from '../content/personnel.js';
import { makePerson, migratePeople } from '../corp/people.js';

const LOG = 100;
const P = { ROLES, MARKET, PERKS, FIRST, LAST, PERM_NAMES, wageOf, permsFor };

export class Personnel {
  constructor(corp) {
    this.K = corp;
    this.cache = new Map();
    this.epoch = 0;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  /** The saved people, or null if nothing has opened it yet (the hooks use this: it creates nothing). */
  peek() {
    const p = this.K.state.people || null;
    if (p && p.v !== 2) this.migrate(p);
    return this.K.state.people || null;
  }

  ensure() {
    const st = this.K.state;
    if (st.people) return this.peek();
    st.people = { v: 2, salt: String(this.g.rng.state), nextStaff: 1, staff: {}, pay: {}, log: [] };
    return st.people;
  }

  /** A v0.62–v0.88 save: the market and the skills go, the people become the three flat jobs (src/corp/people.js says how). */
  migrate(old) {
    const { staff, released } = migratePeople(P, old);
    this.K.state.people = { v: 2, salt: old.salt, nextStaff: old.nextStaff || 1, staff, pay: old.pay || {}, log: (old.log || []).slice(-LOG), migrated: { day: this.day, released: released.length } };
    this.epoch++;
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

  // ------------------------------------------------------------- hiring
  /** Why this job cannot be filled at that employer now, or null. */
  checkPlacement(role, employer, except = null) {
    const R = P.ROLES[role];
    if (!R) return 'No such job.';
    if (!this.employerOk(employer)) return employer === 'parent' ? 'There is no parent company yet.' : 'You do not own that business yet.';
    if (!this.roleAllowed(role, employer)) return `${R.name} is not a job at ${employer === 'parent' ? 'the parent company' : 'that kind of business'}.`;
    if (employer === 'parent') { const seat = this.g.hq?.seatError(except); if (seat) return seat; } // an office has only so many seats (no office, no limit)
    if (this.holders(employer, role, except).length >= R.limit) return `${this.employerName(employer)} already has ${R.limit === 1 ? 'a' : R.limit} ${R.name}${R.limit > 1 ? 's' : ''}.`;
    return null;
  }

  /** What hiring costs: { ok, why, wage, fee }. Nothing changes. */
  quote(role, employer) {
    const wage = P.wageOf(role, employer);
    const fee = wage * P.MARKET.fee;
    const why = this.checkPlacement(role, employer);
    if (why) return { ok: false, why, wage, fee };
    if (!this.K.canAfford(employer, fee)) return { ok: false, why: `${this.employerName(employer)} cannot pay the signing fee of ${fee.toLocaleString()} obols.`, wage, fee };
    return { ok: true, why: '', wage, fee };
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


  /** One tap: the fee (days of the wage) is paid once from the employer's own account; they start at once, with every box ticked. */
  hire(role, employer) {
    const q = this.quote(role, employer);
    if (!q.ok) return { ok: false, text: q.why };
    const p = this.ensure();
    this.K.management.ensure(); // from now on managers' decisions run
    const n = p.nextStaff++;
    const id = `per_${n}`;
    this.payFor(employer, q.fee, 'hiring', id);
    const R = P.ROLES[role];
    const perm = Object.fromEntries(P.permsFor(role, employer).map((k) => [k, true]));
    const person = { id, ...makePerson(P, { salt: p.salt, n }), employer, role, tier: R.tier, salary: q.wage, hiredDay: this.day, startDay: this.day, status: 'active', unpaid: 0, perm, log: [] };
    p.staff[id] = person;
    this.note(person, 'hired', `Hired as ${R.name} at ${this.employerName(employer)} for ${q.wage.toLocaleString()} a day.`);
    this.epoch++;
    this.g.bus.emit('corp:hired', { id });
    return { ok: true, person, text: `${person.name} is ${R.name} at ${this.employerName(employer)}: ${q.wage.toLocaleString()} a day (${q.fee.toLocaleString()} to sign).` };
  }

  /** Tick or untick one thing a person may do on their own. */
  setPerm(id, key, on) {
    const x = this.person(id);
    if (!x || x.status !== 'active') return { ok: false, text: 'No such employee.' };
    if (!P.permsFor(x.role, x.employer).includes(key)) return { ok: false, text: `${x.name} has no say in that.` };
    x.perm = { ...x.perm, [key]: Boolean(on) };
    this.note(x, 'perm', `${P.PERM_NAMES[key].name}: ${on ? 'allowed' : 'not allowed'}.`);
    return { ok: true, text: `${x.name}: ${P.PERM_NAMES[key].name} ${on ? 'allowed' : 'switched off'}.` };
  }

  /** Whether a person may decide this on their own (an old record without ticks counts as all ticked). */
  may(x, key) { return x.perm ? x.perm[key] !== false : true; }

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


  // ------------------------------------------------------------- what a manager does just by being there
  /** Everyone at an employer now at work (wages not owed): what the perks read. */
  roster(employer) {
    return this.holders(employer).filter((x) => x.startDay <= this.day).map((x) => ({ role: x.role, unpaid: x.unpaid }));
  }

  /** The perk of a manager at work: the same for everyone, because nobody has a skill. Cached for the day. */
  effects(employer) {
    const p = this.peek();
    if (!p) return {};
    const key = `${this.day}|${this.epoch}|${employer}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    if (this.cache.size > 40) this.cache.clear();
    const out = this.roster(employer).some((x) => x.role === 'manager' && !x.unpaid) ? { ...(P.PERKS[employer] || {}) } : {};
    this.cache.set(key, out);
    return out;
  }

  effect(employer, key) { return this.peek() ? (this.effects(employer)[key] || 0) : 0; }

  /** Kept so the day's hook stays: there is no market to refresh and no review to hold any more. */
  dailyTick() {}

  // ------------------------------------------------------------- what to show
  /** The jobs worth filling now: a business with no manager, a group with no group manager. */
  vacancies() {
    const out = [];
    const add = (role, employer, why) => { if (this.employerOk(employer) && !this.holders(employer, role).length) out.push({ role, employer, why, roleName: P.ROLES[role].name, employerName: this.employerName(employer), wage: P.wageOf(role, employer) }); };
    for (const id of ['arms', 'shipping', 'aerospace', 'farming']) if (this.K.established(id)) add('manager', id, 'Nobody is minding the business.');
    if (this.K.state.parent && this.K.group.subs().length) add('group_manager', 'parent', 'Nobody keeps the group\'s cash where it should be.');
    return out;
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
