// Public opinion (v0.94.0): blocs × the nine states of Sund; polls with margins. Pure; no randomness (a poll's noise comes from hashing its id).
//
//   affinity(bloc, platform)                        how well a platform suits a bloc (-1 … +1)
//   compute(ctx)                                    the truth: { approval, support, indices, regions, drivers }  — never shown to the player directly
//   poll(truth, { pollster, sample, salt, id })     a poll of it: results with sampling error, a house effect and a stated margin
import { BLOCS, REGIONS, OPINION as O } from '../content/opinion.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
/** An approximately normal deviate with sd 1, from a hash (sum of four uniforms). */
const normal = (key) => ((unit(`${key}|a`) + unit(`${key}|b`) + unit(`${key}|c`) + unit(`${key}|d`)) - 2) * 1.732;

export function affinity(bloc, platform) {
  const lean = BLOCS[bloc].lean;
  let num = 0; let den = 0;
  for (const [issue, l] of Object.entries(lean)) { num += l * (platform[issue] || 0); den += Math.abs(l) * 2; }
  return den ? num / den : 0;
}

/**
 * ctx: { gov, platforms: { order, liberty }, policies: [policy defs in force], deficitRatio (deficit ÷ revenue), wars, embargoes }
 * Returns approval and party support overall and by state, and the twelve indices.
 */
export function compute(ctx) {
  const W = O.weights;
  const opp = ctx.gov === 'order' ? 'liberty' : 'order';
  const sat = {};
  for (const b of Object.keys(BLOCS)) sat[b] = clamp(ctx.policies.reduce((a, p) => a + (p.blocs[b] || 0), 0) * W.policy, -W.policyCap, W.policyCap);
  const macro = -clamp(ctx.deficitRatio, -0.5, 1) * W.deficit * 0.5 - ctx.wars * W.war - ctx.embargoes * W.embargo;
  const regions = {};
  const tot = { approval: 0, order: 0, liberty: 0, other: 0, undecided: 0, w: 0 };
  for (const [rid, R] of Object.entries(REGIONS)) {
    const acc = { approval: 0, order: 0, liberty: 0, other: 0, undecided: 0 };
    for (const [b, share] of Object.entries(R.shares)) {
      const aG = affinity(b, ctx.platforms[ctx.gov]); const aO = affinity(b, ctx.platforms[opp]);
      const approval = clamp(0.5 + W.affinityGov * aG - W.affinityOpp * aO + sat[b] + macro + (ctx.gov === 'order' ? R.tilt : -R.tilt) * W.tilt, 0.05, 0.95);
      const raw = { order: 0, liberty: 0, other: W.other, undecided: W.undecided };
      for (const p of ['order', 'liberty']) raw[p] = Math.exp(W.softmax * affinity(b, ctx.platforms[p]) + (p === ctx.gov ? (approval - 0.5) * W.mood : 0) + (p === 'order' ? R.tilt : -R.tilt) * 4);
      const sum = raw.order + raw.liberty + raw.other + raw.undecided;
      acc.approval += share * approval;
      for (const k of ['order', 'liberty', 'other', 'undecided']) acc[k] += (share * raw[k]) / sum;
    }
    regions[rid] = acc;
    for (const k of Object.keys(acc)) tot[k] += R.weight * acc[k];
    tot.w += R.weight;
  }
  const p = (k) => tot[k] / tot.w;
  const has = (key) => (ctx.policies.some((x) => x.id === key) ? 1 : 0);
  const deficitRatio = clamp(ctx.deficitRatio, -0.5, 1);
  const approval = p('approval');
  const indices = {
    trust: clamp(approval * 0.8 + 0.1 - 0.1 * Math.max(0, deficitRatio), 0, 1),
    crimeConcern: clamp(0.5 - 0.08 * has('police_up') + 0.05 * has('enforce_light') + 0.03 * has('police_down') - 0.03 * has('enforce_strict'), 0, 1),
    economicConfidence: clamp(0.55 - 0.5 * deficitRatio - 0.03 * ctx.wars - 0.02 * ctx.embargoes + 0.05 * has('spend_up'), 0, 1),
    priceConcern: clamp(0.4 + 0.05 * ctx.wars + 0.04 * ctx.embargoes, 0, 1),
    warSupport: clamp(0.35 + 0.1 * has('abroad_up') - 0.1 * has('abroad_down') + 0.05 * has('defence_up'), 0, 1),
    employment: clamp(0.55 + 0.05 * has('spend_up') - 0.04 * has('spend_down') - 0.03 * has('defence_down'), 0, 1),
    regulationSupport: clamp(0.5 + 0.06 * has('reg_up') - 0.06 * has('reg_down'), 0, 1),
    services: clamp(0.5 + 0.08 * has('spend_up') - 0.08 * has('spend_down') + 0.04 * has('police_up'), 0, 1),
    scandal: 0,
  };
  return { gov: ctx.gov, approval, disapproval: (1 - approval) * 0.85, support: { order: p('order'), liberty: p('liberty'), other: p('other'), undecided: p('undecided') }, regions, indices,
    drivers: [{ id: 'policies', name: 'Policies in force', value: ctx.policies.length }, { id: 'deficit', name: 'The deficit (share of revenue)', value: Math.round(deficitRatio * 100) / 100 }, { id: 'wars', name: 'Wars', value: ctx.wars }, { id: 'embargoes', name: 'Embargoes', value: ctx.embargoes }] };
}

/** One poll of the truth: sampling error from the sample size, a house effect, and the margin the player is shown. `key` makes the noise (no randomness). */
export function poll(truth, { pollster, sample, key }) {
  const se = (v) => Math.sqrt((v * (1 - v)) / sample);
  const noisy = (v, tag, house = 0) => clamp(v + house + normal(`${key}|${tag}`) * se(clamp(v, 0.02, 0.98)), 0, 1);
  const h = pollster.house;
  const results = { order: noisy(truth.support.order, 'order', h.order), liberty: noisy(truth.support.liberty, 'liberty', h.liberty), other: noisy(truth.support.other, 'other'), undecided: noisy(truth.support.undecided, 'undecided') };
  const sum = results.order + results.liberty + results.other + results.undecided;
  for (const k of Object.keys(results)) results[k] /= sum;
  const approval = noisy(truth.approval, 'approval', truth.gov === 'order' ? h.order : h.liberty);
  const regional = {};
  for (const [rid, R] of Object.entries(truth.regions)) {
    const n = Math.max(60, Math.round(sample * REGIONS[rid].weight));
    const f = (v, tag) => clamp(v + normal(`${key}|${rid}|${tag}`) * Math.sqrt((v * (1 - v)) / n), 0, 1);
    regional[rid] = { order: f(R.order, 'o'), liberty: f(R.liberty, 'l'), n };
  }
  const indices = Object.fromEntries(Object.entries(truth.indices).map(([k, v]) => [k, k === 'scandal' ? 0 : noisy(v, k)]));
  return { results, approval, disapproval: clamp((1 - approval) * 0.85, 0, 1), regional, indices, sample, margin: 1.96 * Math.sqrt(0.25 / sample) };
}
