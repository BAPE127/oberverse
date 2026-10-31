// People for hire (v0.89.0). Pure functions — no game state, no DOM, no RNG: a person is a hash of the saved salt and their number, so
// the same save always hires the same people. There are no skills and no candidates any more: only a name, to put on a door and a payslip.
//
//   makePerson(P, { salt, n })    a name: first, last
//   migratePeople(P, old)         a v0.62–v0.88 save's people turned into the three flat jobs (see the function)
// P is src/content/personnel.js.
import { hashUnit } from '../aero/config.js';

export function makePerson(P, { salt, n }) {
  const h = (k) => hashUnit(`${salt}|person${n}|${k}`);
  const first = P.FIRST[Math.floor(h('fn') * P.FIRST.length)];
  const last = P.LAST[Math.floor(h('ln') * P.LAST.length)];
  return { first, last, name: `${first} ${last}` };
}

/**
 * An old save's people (skills, a market of candidates, nine executive and manager titles, staff jobs) become the three flat jobs.
 * Per employer, the longest-serving manager keeps the job (as the one Manager) and the longest-serving executive becomes the Group
 * manager; the other executives become Office staff at the parent; everyone else (the second manager, staff jobs at a business) is
 * let go with no payment either way. Wages become the new flat wages. Returns { staff, kept, released } — a new people record's staff.
 */
export function migratePeople(P, old) {
  const staff = {};
  const released = [];
  const list = Object.values(old.staff || {}).filter((x) => x.status === 'active').sort((a, b) => (a.hiredDay ?? 0) - (b.hiredDay ?? 0) || (a.id < b.id ? -1 : 1));
  let group = false;
  const manager = {};
  for (const x of list) {
    let role = null;
    let employer = x.employer;
    if (x.tier === 'manager' && employer !== 'parent' && !manager[employer]) { role = 'manager'; manager[employer] = true; }
    else if (x.tier === 'executive' && employer === 'parent') { if (!group) { role = 'group_manager'; group = true; } else role = 'office'; }
    if (!role) { released.push(x.id); continue; }
    const a = x.authority || {};
    const perm = {};
    for (const k of P.permsFor(role, employer)) perm[k] = k === 'expand' ? Boolean(a.canExpand) : k === 'transfer' ? Boolean(a.canTransfer) : k === 'bid' ? a.canContract !== false : true;
    staff[x.id] = { id: x.id, name: x.name, first: x.first, last: x.last, employer, role, tier: P.ROLES[role].tier, salary: P.wageOf(role, employer), hiredDay: x.hiredDay, startDay: Math.min(x.startDay ?? x.hiredDay, x.hiredDay ?? 0) || x.hiredDay, status: 'active', unpaid: x.unpaid || 0, perm, log: [{ day: x.hiredDay, type: 'moved', text: 'Moved to the flat jobs of v0.89.0: one wage for everyone, no skills.' }] };
  }
  for (const id of released) { const x = old.staff[id]; staff[id] = { ...x, status: 'let go', endDay: x.endDay ?? null, skills: undefined, authority: undefined }; }
  return { staff, released };
}
