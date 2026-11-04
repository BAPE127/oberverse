// The election model (v0.95.0). Pure: every function is a function of its arguments (a "key" string stands in for chance, so a result can never be re-rolled).
//
//   staffStrength(party, roles)           how well a party's staff work a role (a vacant role works at `vacant` of its strength)
//   campaignEffect(spent, party, E)       the swing that a party's spending bought, by channel: cap × (1 − e^(−spent ÷ scale)), times its staff's strength
//   scandalWeight(list, party, day, ...)  what the scandals of a party still weigh on the vote today (severity × credibility × attention, fading)
//   manifestoOf(platform, policies, n)    the policies a party promises: the ones it believes in most
//   promisesKept(manifesto, active)       the share of a manifesto that is in force
//   debate(...)                           the one debate: who won, from the leaders' standing and the communications staff
//   tally(input)                          the result: each state's vote and turnout, the national vote, the seats (D'Hondt) and the winner
//   dhondt(votes, seats)                  seats from votes
import { ELECTIONS as E } from '../content/elections.js';
import { REGIONS } from '../content/opinion.js';
import { fitOf } from './policy.js';
import { PARTY_IDS } from './model.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
/** An approximately normal deviate (sd 1) from a hash. */
const normal = (key) => ((unit(`${key}|a`) + unit(`${key}|b`) + unit(`${key}|c`) + unit(`${key}|d`)) - 2) * 1.732;
export const hashUnit = unit;

/** How well a party's staff work a set of roles (0.6 … 1): each filled role counts, a vacant one works at `vacant`. */
export function staffStrength(party, roles) {
  if (!roles.length) return 1;
  const filled = (r) => (party.staff.some((s) => s.role === r && s.personId) ? 1 : E.vacant);
  return roles.reduce((a, r) => a + filled(r), 0) / roles.length;
}

/** The swing a party's spending bought: { ads, rallies, ground, total }. `spent` is what it spent on each channel. */
export function campaignEffect(spent, party) {
  const out = { total: 0 };
  for (const [ch, def] of Object.entries(E.channels)) {
    const eff = def.cap * (1 - Math.exp(-(spent?.[ch] || 0) / def.scale)) * staffStrength(party, def.staff);
    out[ch] = eff; out.total += eff;
  }
  return out;
}

/** What a party's scandals weigh today (0 … about 1): each fades with a half-life that the press secretary shortens. */
export function scandalWeight(scandals, party, day, pressStrength = E.vacant) {
  const half = E.scandals.halfLife * (1 - E.scandals.pressCut * (pressStrength - E.vacant) / (1 - E.vacant));
  let w = 0;
  for (const s of scandals) {
    if (s.party !== party || s.day > day) continue;
    w += s.severity * s.credibility * s.attention * Math.pow(0.5, (day - s.day) / half) * (s.quieted ? 0.5 : 1);
  }
  return Math.min(1.2, w);
}

/** A party's manifesto for a term: the `n` policies it believes in most that are not already in force or on their way (platform fit, then the cheaper, then by id). Fixed when the term begins. */
export function manifestoOf(platform, policies, n = E.manifesto, exclude = []) {
  const skip = new Set(exclude);
  return Object.values(policies)
    .map((p) => ({ id: p.id, fit: fitOf(platform, p), cost: p.cost }))
    .filter((r) => r.fit > 0 && !skip.has(r.id))
    .sort((a, b) => b.fit - a.fit || a.cost - b.cost || (a.id < b.id ? -1 : 1))
    .slice(0, n).map((r) => r.id);
}

/** The share of a manifesto in force (or on its way: approved or being set up counts half). */
export function promisesKept(manifesto, policies) {
  if (!manifesto.length) return 0.5;
  const got = (id) => { const p = policies.find((q) => q.key === id && q.state !== 'ended'); return !p ? 0 : p.state === 'active' ? 1 : p.state === 'approved' || p.state === 'implementing' ? 0.5 : 0; };
  return manifesto.reduce((a, id) => a + got(id), 0) / manifesto.length;
}

/** The debate: each leader's standing (the approval they carry) and their communications staff decide it, with a seeded flourish. Returns { winner, margin }. */
export function debate({ standing, comms, key }) {
  const score = (p) => standing[p] * 0.6 + comms[p] * 0.25 + normal(`${key}|${p}`) * 0.12;
  const [a, b] = PARTY_IDS;
  const d = score(a) - score(b);
  return { winner: d >= 0 ? a : b, margin: Math.abs(d) };
}

/** Seats by the D'Hondt method from the votes of each list. Ties go to the larger list, then by id. */
export function dhondt(votes, seats) {
  const out = Object.fromEntries(Object.keys(votes).map((k) => [k, 0]));
  for (let i = 0; i < seats; i++) {
    let best = null; let bq = -1;
    for (const k of Object.keys(votes).sort()) { const q = votes[k] / (out[k] + 1); if (q > bq + 1e-12) { bq = q; best = k; } }
    out[best]++;
  }
  return out;
}

/**
 * The result of a vote.
 *   input: {
 *     key                  the election's own key (its id and the world's salt): all of the "chance" in the result is hashed from it
 *     truth                opinion today (src/politics/opinion.js compute): { regions, support, approval, gov }
 *     campaign             { order: effect, liberty: effect }  the swings that spending bought (campaignEffect().total, plus the debate's)
 *     scandals             { order, liberty }  scandalWeight today
 *     promises             how much of the governing manifesto was kept (0 … 1)
 *     terms                how many terms the governing party has already held in a row (1 = its first)
 *   }
 * Returns { regions: { id: { order, liberty, other, turnout } }, national: { order, liberty, other }, turnout, seats, winner, margin, swing }.
 * A swing moves votes between the two parties only (the independents hold): positive favours Order.
 */
export function tally({ key, truth, campaign, scandals, promises, terms }) {
  const W = E.weights;
  const gov = truth.gov;
  const sign = gov === 'order' ? 1 : -1; // + favours Order
  const fatigue = -sign * (W.fatigue * terms + W.fatigueLate * Math.max(0, terms - 2)); // a long-serving government wears out
  const kept = sign * (promises - 0.5) * 2 * W.promises;
  const camp = (campaign.order || 0) - (campaign.liberty || 0);
  const scand = (scandals.liberty || 0) - (scandals.order || 0);
  const nationalNoise = normal(`${key}|national`) * W.national;
  const base = camp + scand * W.scandal + fatigue + kept + nationalNoise;
  const regions = {};
  const tot = { order: 0, liberty: 0, other: 0, w: 0 };
  let turnoutSum = 0;
  const intensity = clamp((Math.abs(campaign.order || 0) + Math.abs(campaign.liberty || 0)) / 0.05, 0, 1);
  for (const [rid, R] of Object.entries(REGIONS)) {
    const t = truth.regions[rid];
    const decided = t.order + t.liberty;
    const lean = decided > 0 ? t.order / decided : 0.5; // among those who have decided
    // the undecided who vote lean to the party ahead among the decided, a little
    const ahead = (lean - 0.5) * 2 * W.undecidedToLeader;
    const share = clamp(lean + ahead * 0.5, 0.02, 0.98);
    const pool = t.undecided;
    let order = t.order + pool * share;
    let liberty = t.liberty + pool * (1 - share);
    const swing = clamp(base + normal(`${key}|${rid}`) * W.regional, -W.swingCap, W.swingCap);
    order = Math.max(0.01, order + swing / 2);
    liberty = Math.max(0.01, liberty - swing / 2);
    const other = t.other;
    const sum = order + liberty + other;
    const close = 1 - clamp(Math.abs(order - liberty) / sum * 4, 0, 1);
    const turnout = clamp(E.turnout.base + E.turnout.campaign * intensity + E.turnout.close * close + normal(`${key}|turn|${rid}`) * E.turnout.noise, 0.3, 0.9);
    regions[rid] = { order: order / sum, liberty: liberty / sum, other: other / sum, turnout };
    tot.order += R.weight * turnout * regions[rid].order; tot.liberty += R.weight * turnout * regions[rid].liberty; tot.other += R.weight * turnout * regions[rid].other; tot.w += R.weight * turnout;
    turnoutSum += R.weight * turnout;
  }
  const national = { order: tot.order / tot.w, liberty: tot.liberty / tot.w, other: tot.other / tot.w };
  const seats = dhondt(national, E.seats);
  const winner = national.order === national.liberty ? gov : national.order > national.liberty ? 'order' : 'liberty';
  const wr = Object.values(REGIONS).reduce((a, R) => a + R.weight, 0);
  return { regions, national, turnout: turnoutSum / wr, seats, winner, margin: Math.abs(national.order - national.liberty), swing: base, parts: { campaign: camp, scandal: scand * W.scandal, fatigue, promises: kept, chance: nationalNoise } };
}
