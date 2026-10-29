// People for hire (v0.62.0). Pure functions — no game state, no DOM, no RNG: a candidate is a hash of the
// market's saved salt and its number, so the same save always holds the same candidates.
//
//   makeCandidate(P, spec)      a candidate: skills with strengths and a weakness, traits, history, pay asked
//   roleFit(P, person, role)    how well their skills suit a job (the average of the job's key skills)
//   rolesFor(P, person)         the jobs they would take
//   evaluateOffer(person, pay)  accept, or what they would take
//   effectsOf(P, roster, reach) what the good people at a business do for it — bounded
//   needsFor(P, facts)          the jobs a business or the parent has a case for filling
//   grade(v)                    a skill in words
// P is src/content/personnel.js.
import { hashUnit } from '../aero/config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round5 = (v) => Math.round(v / 5) * 5;

export const grade = (P, v) => (P.GRADES.find(([min]) => v >= min) || [0, 'weak'])[1];
export const avgOf = (skills, keys) => (keys.length ? keys.reduce((a, k) => a + (skills[k] || 0), 0) / keys.length : 0);
export const roleFit = (P, person, role) => avgOf(person.skills, P.ROLES[role].keys);
export const MIN_FIT = 35;

/** The jobs a person would take: the ones their skills suit (a manager can take staff work; nobody below takes a tier above). */
export function rolesFor(P, person) {
  const tiers = { executive: ['executive', 'manager', 'staff'], manager: ['manager', 'staff'], staff: ['staff'] }[person.tier];
  return Object.keys(P.ROLES).filter((r) => tiers.includes(P.ROLES[r].tier) && roleFit(P, person, r) >= MIN_FIT).sort((a, b) => roleFit(P, person, b) - roleFit(P, person, a));
}

const TIER_WEIGHT = { executive: 1, manager: 2, staff: 1.5 };

/**
 * A candidate. spec: { salt, n, day, prior } — `prior` are names of companies they may have worked for
 * (kept as names: companies come and go). Strong in what the job asks, one key skill weak, one or two
 * skills outside it strong; traits and pay follow.
 */
export function makeCandidate(P, { salt, n, day, prior = [] }) {
  const h = (k) => hashUnit(`${salt}|cand${n}|${k}`);
  const ids = Object.keys(P.ROLES);
  const total = ids.reduce((a, r) => a + TIER_WEIGHT[P.ROLES[r].tier], 0);
  let acc = 0;
  let role = ids[0];
  const pick = h('role') * total;
  for (const r of ids) { acc += TIER_WEIGHT[P.ROLES[r].tier]; if (pick < acc) { role = r; break; } }
  const R = P.ROLES[role];
  const tier = R.tier;
  const age = tier === 'executive' ? 36 + Math.floor(h('age') * 28) : 24 + Math.floor(h('age') * 40);
  const experience = Math.max(1, age - 22 - Math.floor(h('gap') * 6));
  const quality = clamp(0.25 + h('q') * 0.7, 0, 1);
  const skills = {};
  for (const k of Object.keys(P.SKILLS)) skills[k] = 8 + Math.floor(h(`s_${k}`) * 26);
  for (const k of R.keys) skills[k] = Math.round(clamp(38 + quality * 47 + (h(`k_${k}`) - 0.5) * 14, 25, 95));
  const weak = R.keys[Math.floor(h('weak') * R.keys.length)];
  skills[weak] = Math.max(15, skills[weak] - (14 + Math.floor(h('wd') * 16)));
  // however weak, they must be fit for the job they came for
  while (avgOf(skills, R.keys) < MIN_FIT + 1) { const lowest = [...R.keys].sort((a, b) => skills[a] - skills[b])[0]; skills[lowest] += 4; }
  const others = Object.keys(P.SKILLS).filter((k) => !R.keys.includes(k));
  for (let i = 0; i < 1 + Math.floor(h('ns') * 2); i++) { const k = others[Math.floor(h(`st${i}`) * others.length)]; skills[k] = Math.min(95, skills[k] + 18 + Math.floor(h(`sv${i}`) * 14)); }
  const trait = (k, lo, hi) => Math.round(lo + h(k) * (hi - lo));
  const leader = tier === 'staff' ? [15, 65] : [35, 90];
  const traits = { workEthic: trait('we', 25, 95), reliability: trait('rel', 25, 95), leadership: trait('lead', ...leader), negotiation: trait('neg', 15, 95), financialDiscipline: trait('fd', 20, 95), riskTolerance: trait('risk', 5, 95) };
  const style = traits.riskTolerance > 68 ? 'aggressive' : traits.riskTolerance < 32 ? 'cautious' : traits.financialDiscipline > 75 ? 'meticulous' : traits.workEthic > 80 ? 'driven' : 'balanced';
  const keyAvg = avgOf(skills, R.keys);
  const ask = R.pay[0] + (R.pay[1] - R.pay[0]) * clamp(0.55 * ((keyAvg - 35) / 55) + 0.3 * Math.min(1, experience / 30) + 0.15 * h('ask'), 0, 1);
  const first = P.FIRST[Math.floor(h('fn') * P.FIRST.length)];
  const last = P.LAST[Math.floor(h('ln') * P.LAST.length)];
  const history = [];
  const jobs = 1 + Math.floor(h('jobs') * 3);
  for (let i = 0; i < jobs; i++) {
    const name = prior.length ? prior[Math.floor(h(`pc${i}`) * prior.length)] : 'a firm in the city';
    const rr = ids[Math.floor(h(`pr${i}`) * ids.length)];
    history.push({ employer: name, role: P.ROLES[tier === 'staff' ? role : rr].name, years: 1 + Math.floor(h(`py${i}`) * Math.max(1, experience / jobs)) });
  }
  const edu = P.EDUCATION[tier];
  const notice = P.MARKET.notice[h('notice') < 0.6 ? 0 : h('notice') < 0.85 ? 1 : 2];
  return {
    id: `cand_${n}`, n, name: `${first} ${last}`, first, last, age, tier, role, roles: null,
    skills, ...traits, style, experience, mgmtExperience: tier === 'staff' ? Math.floor(experience * 0.1) : Math.floor(experience * (0.2 + h('me') * 0.4)),
    education: edu[Math.floor(h('edu') * edu.length)], history,
    sector: R.sector || (h('sec') < 0.5 ? null : ['arms', 'shipping', 'aerospace', 'farming'][Math.floor(h('sec2') * 4)]),
    reputation: Math.round(clamp(20 + keyAvg * 0.6 + (h('rep') - 0.5) * 30, 5, 98)),
    expects: round5(ask), availableDay: day + notice, since: day,
  };
}

/** What a candidate will take for a job: accepted at the floor or above; below it, the lowest they would sign. */
export function floorPay(person) {
  return round5(person.expects * (0.85 + 0.15 * (person.negotiation / 100)));
}

export function evaluateOffer(person, pay) {
  const floor = floorPay(person);
  if (!Number.isFinite(pay) || pay <= 0) return { ok: false, floor, why: 'Offer a daily wage.' };
  if (pay < floor) return { ok: false, floor, why: `${person.first} would not sign for less than ${floor.toLocaleString()} a day.` };
  return { ok: true, floor, loyalty: Math.round(clamp(50 + (pay / person.expects - 1) * 100, 25, 90)) };
}

/**
 * What the people at a business do for it: sums each job's effect (cap × skill × dependability) — nobody who
 * is unpaid counts — and holds each total to its ceiling. `reach` scales it (a parent's executive reaches its
 * subsidiaries at half strength). roster: [{ role, skills, reliability, unpaid }].
 */
export function effectsOf(P, roster, reach = 1) {
  const out = {};
  for (const p of roster) {
    if (p.unpaid > 0) continue;
    const R = P.ROLES[p.role];
    if (!R) continue;
    for (const [key, [cap, ...keys]] of Object.entries(R.effects)) {
      const f = clamp((avgOf(p.skills, keys) - 20) / 70, 0, 1);
      const rel = 0.6 + 0.4 * ((p.reliability ?? 50) / 100);
      out[key] = (out[key] || 0) + cap * f * rel * reach;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.min(out[k], P.EFFECT_CAPS[k] ?? 0);
  return out;
}

/** The jobs there is a case for filling, with the reason — from plain numbers about the business. */
export function needsFor(P, f) {
  const out = [];
  const add = (role, why) => { if (!f.held?.[role]) out.push({ role, why }); };
  if (f.kind === 'parent') {
    if (f.subs >= 1) add('ceo', `The group has ${f.subs} subsidiar${f.subs > 1 ? 'ies' : 'y'} and nobody running it.`);
    if (f.subs >= 2 || f.loans) add('cfo', 'Cash and loans between companies need a financial head.');
    if (f.subs >= 3) { add('coo', 'Three or more subsidiaries need an operating head.'); add('controller', 'Three or more sets of books need a controller.'); add('cpo', 'Buying for several businesses is worth a chief of procurement.'); }
    if (f.people >= 6) add('hrd', `${f.people} people on the payroll: worth an HR director.`);
    return out;
  }
  add('gm', 'Every business runs better with someone in charge; a small one needs no one else.');
  if (f.kind === 'arms') { if (f.works >= 1 && f.staff >= 4) add('manufacturing_mgr', `${f.staff} staff on the floor.`); if (f.staff >= 6) add('procurement_mgr', 'Parts bought by the hour could be bought for less.'); if (f.staff >= 6) add('supervisor', `${f.staff} on the floor: a supervisor to run a shift.`); if (f.staff >= 8) add('procurement_spec', 'Many hands on the floor, many parts to chase.'); }
  if (f.kind === 'aerospace') { if (f.bays >= 3) add('aero_ops_mgr', `${f.bays} bays to keep busy.`); if (f.bays >= 3) add('supervisor', 'Bays running in shifts need someone to run them.'); if (f.bays >= 4) add('procurement_spec', 'Materials are bought by the lot; someone should chase the quotes.'); if (f.bays >= 4) add('procurement_mgr', 'Materials are the biggest bill.'); if (f.bays >= 5) add('finance_mgr', 'A business this size needs its own books kept.'); if (f.bays >= 6) add('maintenance_mgr', 'Many bays, much to keep sound.'); }
  if (f.kind === 'shipping') { if (f.vessels >= 2) add('coordinator', `${f.vessels} ships to keep loaded.`); if (f.vessels >= 3) add('logistics_mgr', `${f.vessels} ships and ${f.ports} ports.`); if (f.vessels >= 6) add('maintenance_mgr', 'A large fleet wears.'); }
  if (f.kind === 'farming') { if (f.plots >= 2) add('farm_mgr', `${f.plots} plots to work.`); if (f.plots >= 2) add('farm_supervisor', 'Hands in the field need someone to run them.'); }
  return out;
}

/** A skill grows from good work, never from time alone: `xp` gained a good month; every `xpPerSkill` is a point in the job's key skills. */
export function grow(P, person, good) {
  if (!good) return { gained: null, xp: person.xp };
  let xp = (person.xp || 0) + 1;
  let gained = null;
  if (xp >= P.MARKET.xpPerSkill && (person.gains || 0) < P.MARKET.maxGains) {
    const keys = P.ROLES[person.role].keys;
    const k = [...keys].sort((a, b) => person.skills[a] - person.skills[b])[0];
    if (person.skills[k] < P.MARKET.skillCap) { gained = k; xp = 0; }
  }
  return { gained, xp };
}
