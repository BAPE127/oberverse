// Unrest (v0.97.0): the rules, pure. Chance comes only from a hash of the demonstration and the day.
//
//   tensionOf(x)                    0..1: how much of the country is angry
//   startChance(tension, U)         the daily chance a demonstration begins
//   causeOf(policies, key)          what this one is about: a bloc against a policy in force (or the war, or the state's books)
//   policeLevel(x)                  0..1 and its name ('light' | 'firm' | 'heavy')
//   newDemo(...)                    a demonstration record
//   stepDemo(d, day, ctx)           one day: { demo, events }  events: peaceful | cleared | riot | ended
//   hooksOf(x)                      read-only state for later systems: legitimacy, stability, factions, emergency powers, succession
import { UNREST as U } from '../content/unrest.js';
import { BLOCS } from '../content/opinion.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

/** x: { approval, deficitRatio, wars, embargoes, scandal (0..1), dislike (0..1: the worst a bloc thinks of a policy in force), heat }. */
export function tensionOf(x) {
  const T = U.tension;
  return clamp(T.disapproval * (1 - x.approval) + T.deficit * clamp(x.deficitRatio, 0, 1) + T.war * x.wars + T.embargo * x.embargoes + T.scandal * clamp(x.scandal, 0, 1) + T.dislike * clamp(x.dislike, 0, 1) + T.heatWeight * (x.heat || 0), 0, 1);
}

export const startChance = (tension) => clamp(U.start.base + U.start.perTension * Math.max(0, tension - U.start.from), 0, U.start.cap);

/** policies: the definitions in force ({ id, name, blocs }). Returns { kind, bloc, policy?, text } — weighted by how much a bloc dislikes a policy; the war or the books if none. */
export function causeOf(policies, key, ctx = {}) {
  const cands = [];
  for (const p of policies) for (const [b, v] of Object.entries(p.blocs || {})) if (v < 0) cands.push({ kind: 'policy', bloc: b, policy: p.id, w: -v, text: `${BLOCS[b].name} against "${p.name}"` });
  if (ctx.wars) cands.push({ kind: 'war', bloc: 'civil_liberties', w: 0.8 * ctx.wars, text: `${BLOCS.civil_liberties.name} against the war abroad` });
  if (ctx.deficit > 0.15) cands.push({ kind: 'books', bloc: 'public_servants', w: 1.2, text: `${BLOCS.public_servants.name} against the cuts the deficit brings` });
  if (!cands.length) cands.push({ kind: 'mood', bloc: 'urban', w: 1, text: `${BLOCS.urban.name} on a general discontent` });
  cands.sort((a, b) => (a.text < b.text ? -1 : 1));
  const total = cands.reduce((a, c) => a + c.w, 0);
  let r = unit(`${key}|cause`) * total;
  for (const c of cands) { r -= c.w; if (r <= 0) { const { w, ...rest } = c; return rest; } }
  const { w, ...rest } = cands[cands.length - 1];
  return rest;
}

/** x: { active: ids of policies in force, officers (on duty) }. */
export function policeLevel(x) {
  const P = U.police;
  const has = (id) => (x.active.includes(id) ? 1 : 0);
  const level = clamp(P.base + P.up * has('police_up') + P.down * has('police_down') + P.strict * has('enforce_strict') + P.light * has('enforce_light') + P.staffing * clamp(x.officers / P.staffBaseline - 1, -1, 1), 0, 1);
  return { level, name: level < P.lightBelow ? 'light' : level >= P.heavyFrom ? 'heavy' : 'firm' };
}

export function newDemo({ id, day, key, cause, tension }) {
  const size = Math.round(U.size[0] + unit(`${key}|size`) * (U.size[1] - U.size[0]) * (0.5 + tension));
  const anger = U.anger[0] + unit(`${key}|anger`) * (U.anger[1] - U.anger[0]);
  const days = U.days.min + Math.floor(unit(`${key}|days`) * (U.days.max - U.days.min + 1));
  return { id, day, cause, size: Math.min(900, size), anger: Math.round(anger * 1000) / 1000, days, stage: 'gathering', organisers: BLOCS[cause.bloc].name, spot: U.crowd.spot, supported: 0, spoke: -1, funded: false, riotUntil: null };
}

/**
 * One day of a demonstration. ctx: { salt, tension, police: { level, name }, intelligence (0..1: surveillance) }.
 * Anger drifts with the country's tension, decays, and rises under a heavy response and falls under a light one. A riot is a hash chance that grows with anger, a heavy hand on an
 * angry crowd and size; the police may clear a modest crowd; otherwise it ends peacefully when its time is up or its anger spent. Most end peacefully.
 */
export function stepDemo(d, day, ctx) {
  const D = { ...d };
  const events = [];
  const key = `${ctx.salt}|demo|${d.id}|${day}`;
  if (D.stage === 'riot') {
    if (day >= D.riotUntil) { D.stage = 'ended'; D.anger = Math.round(D.anger * U.after.riot * 1000) / 1000; events.push({ kind: 'ended', how: 'the riot burns out' }); }
    return { demo: D, events };
  }
  const age = day - D.day;
  const heavy = ctx.police.name === 'heavy' ? 1 : 0; const light = ctx.police.name === 'light' ? 1 : 0;
  D.anger = clamp(D.anger + U.drift.pressure * (ctx.tension - 0.3) - U.drift.decay + U.drift.heavy * heavy * (D.anger > 0.4 ? 1 : 0) + U.drift.light * light, 0, 1);
  D.anger = Math.round(D.anger * 1000) / 1000;
  if (D.stage === 'gathering' && age >= 1) D.stage = 'march';
  const R = U.riot;
  const p = clamp((R.base + R.perAnger * Math.max(0, D.anger - 0.55) + R.heavy * heavy * Math.max(0, D.anger - 0.4) + R.perSize * (D.size / 400) * (D.anger > 0.5 ? 1 : 0.3)) * (1 - R.intelligence * (ctx.intelligence || 0)), 0, R.cap);
  if (age >= 1 && unit(`${key}|riot`) < p) {
    D.stage = 'riot'; D.riotUntil = day + R.days[0] + Math.floor(unit(`${key}|rlen`) * (R.days[1] - R.days[0] + 1));
    events.push({ kind: 'riot' });
    return { demo: D, events };
  }
  if (heavy && age >= 1 && D.anger < U.clear.angerBelow && D.size < U.clear.sizeBelow && unit(`${key}|clear`) < U.clear.chance) {
    D.stage = 'ended'; D.anger = Math.round(D.anger * U.after.cleared * 1000) / 1000;
    events.push({ kind: 'cleared' });
    return { demo: D, events };
  }
  if (age >= D.days || (age >= U.days.min && D.anger < 0.12)) { D.stage = 'ended'; events.push({ kind: 'peaceful' }); }
  return { demo: D, events };
}

/** x: { approval, tension, heat, margin (the last election's, 0..1), demos (active count), wars }. Read-only: later systems may use it; nothing here acts on it. */
export function hooksOf(x) {
  const H = U.hooks;
  const legitimacy = clamp(H.legitimacyApproval * x.approval + H.legitimacyCalm * (1 - clamp(x.heat, 0, 1)) + H.legitimacyMandate * clamp(0.5 + x.margin * 4, 0, 1), 0, 1);
  const stability = clamp(1 - x.tension * 0.6 - clamp(x.heat, 0, 1) * 0.3 - 0.03 * x.wars - 0.04 * x.demos, 0, 1);
  return { legitimacy: Math.round(legitimacy * 1000) / 1000, stability: Math.round(stability * 1000) / 1000, factions: ['the Order Party', 'the Liberty League', 'the Assembly\'s independents', 'the crown'], emergencyPowers: false, succession: { head: 'the king', age: 11, heir: null, note: 'a regency would be the Assembly\'s to name' } };
}
