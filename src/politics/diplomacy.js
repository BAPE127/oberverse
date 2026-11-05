// Diplomacy (v0.96.0): the rules, pure. Chance comes only from a hash of the day and the pair (never a random draw), so a reload cannot change a quarrel.
//
//   pairKey(a, b)                       the unordered key of two countries
//   bandOf(score)                       the word for a relation score
//   baseline(id, salt)                  a country's own starting relation with Sund (a hash)
//   startChance(a, b, agg, ctx)         the chance a pair of rivals falls out on a day of peace
//   stepPair(pair, day, ctx)            one day of a quarrel: { pair, events }, events being what to announce and what to write
//   targetScore(...)                    the relation a country drifts toward
import { DIPLOMACY as D } from '../content/diplomacy.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function bandOf(score) {
  for (const [hi, label] of D.bands) if (score < hi) return label;
  return D.bands[D.bands.length - 1][1];
}

export const baseline = (id, salt) => Math.round(D.relations.baseline[0] + unit(`${salt}|base|${id}`) * (D.relations.baseline[1] - D.relations.baseline[0]));

/** ctx: { salt, wars (how many are on in the world), sundMod (the policies' change in disputes that Sund is party to), worldMod }. agg: { [id]: aggression }. */
export function startChance(a, b, agg, ctx) {
  const S = D.start;
  const mean = ((agg[a] ?? 0.2) + (agg[b] ?? 0.2)) / 2;
  const sund = a === 'sund' || b === 'sund' ? (ctx.sundMod || 0) : 0;
  const world = clamp(S.perWar * ctx.wars + (ctx.worldMod || 0), -S.worldCap, S.worldCap);
  return clamp((S.base * mean) / 0.3 * (1 + world + sund), 0, 0.5);
}

const range = ([lo, hi], u) => lo + Math.floor(u * (hi - lo + 1));
const cause = (key, day, salt) => D.causes[Math.floor(unit(`${salt}|cause|${key}|${day}`) * D.causes.length)];

/**
 * One day of a quarrel between a and b (a is the aggressor of a dispute: the one whose hash of the day is the lower). pair: { key, a, b, stage, since, until, cause, settledDay }.
 * ctx: { salt, wars, sundMod, worldMod, agg, relation (the relation with Sund of the other party when Sund is in the pair: -100..100) }.
 * Returns { pair, events: [{ kind: 'dispute' | 'tension' | 'sanctions' | 'war' | 'ceasefire' | 'settled' | 'lift', text, aggressor? }] }.
 */
export function stepPair(pair, day, ctx) {
  const p = { ...pair };
  const events = [];
  const key = p.key;
  const u = (tag) => unit(`${ctx.salt}|${tag}|${key}|${day}`);
  const sundIn = p.a === 'sund' || p.b === 'sund';
  const talksBonus = sundIn ? (ctx.relation || 0) * D.talks.perRelation : 0;
  if (p.stage === 'peace') {
    if (p.settledDay != null && day - p.settledDay < D.start.cooldown) return { pair: p, events };
    if (u('start') < startChance(p.a, p.b, ctx.agg, ctx)) {
      const aggressor = unit(`${ctx.salt}|aggressor|${key}|${day}`) * ((ctx.agg[p.a] ?? 0.2) + (ctx.agg[p.b] ?? 0.2)) < (ctx.agg[p.a] ?? 0.2) ? p.a : p.b;
      Object.assign(p, { stage: 'dispute', since: day, until: day + range(D.stage.dispute, u('len')), cause: cause(key, day, ctx.salt), aggressor });
      events.push({ kind: 'dispute', aggressor, text: `A dispute: ${ctx.name(p.a)} and ${ctx.name(p.b)} fall out over ${p.cause}.` });
    }
    return { pair: p, events };
  }
  if (p.stage === 'war') {
    if (day - p.since >= D.war.minDays && u('end') < D.war.endChance) {
      Object.assign(p, { stage: 'peace', settledDay: day, until: null });
      events.push({ kind: 'ceasefire', text: `Ceasefire: ${ctx.name(p.a)} and ${ctx.name(p.b)} sign a truce.` });
    }
    return { pair: p, events };
  }
  // dispute, tension, sanctions: at the end of the stage, talks may settle it, or it escalates
  if (day < p.until) return { pair: p, events };
  const settle = clamp(D.talks[p.stage] + talksBonus, 0, D.talks.cap);
  if (u('talks') < settle) {
    Object.assign(p, { stage: 'peace', settledDay: day, until: null });
    events.push({ kind: 'settled', text: `Talks succeed: the quarrel between ${ctx.name(p.a)} and ${ctx.name(p.b)} over ${p.cause} is settled.` });
    return { pair: p, events };
  }
  if (p.stage === 'dispute') {
    Object.assign(p, { stage: 'tension', since: day, until: day + range(D.stage.tension, u('len')) });
    events.push({ kind: 'tension', text: `Tension: ${ctx.name(p.a)} and ${ctx.name(p.b)} recall their ambassadors over ${p.cause}.` });
  } else if (p.stage === 'tension') {
    Object.assign(p, { stage: 'sanctions', since: day, until: day + range(D.stage.sanctions, u('len')) });
    events.push({ kind: 'sanctions', aggressor: p.aggressor, text: `Sanctions: ${ctx.name(p.aggressor)} is placed under an arms embargo as the quarrel with ${ctx.name(p.aggressor === p.a ? p.b : p.a)} deepens.` });
  } else {
    Object.assign(p, { stage: 'war', since: day, until: null });
    events.push({ kind: 'war', aggressor: p.aggressor, text: `WAR: ${ctx.name(p.aggressor)} attacks ${ctx.name(p.aggressor === p.a ? p.b : p.a)}.` });
  }
  return { pair: p, events };
}

/**
 * The relation a country drifts toward (with Sund): its own baseline, what the policies add, a trade agreement or military cooperation when it is warm enough
 * (flags, not a cause), minus what the quarrels it is in do. quarrels: { dispute, sanctions, war } counts of its pairs in each stage that involve Sund or that put it under embargo.
 */
export function targetScore({ base, policy = 0, quarrels = { dispute: 0, sanctions: 0, war: 0 }, embargoed = false, neutral = false }) {
  const R = D.relations;
  let t = base + policy + quarrels.dispute * R.perDispute + quarrels.sanctions * R.perSanction + quarrels.war * R.perWar + (embargoed ? R.embargoOnThem : 0) + (neutral ? R.lirre : 0);
  return clamp(Math.round(t), -100, 100);
}

export const stepToward = (score, target) => score + clamp(target - score, -D.relations.step, D.relations.step);
