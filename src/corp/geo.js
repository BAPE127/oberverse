// Geopolitics (v0.75.0). Pure functions — no game state, no DOM, no RNG.
//
//   severityOf(kind, incomes, G)            how severe an event is, from the countries' income
//   phaseOf(e, day, G)                      how much of its effect an event has today: ramps in, escalates, fades out after it ends
//   indices(events, day, ctx, G)            { demand: {sector}, cost: {sector} } — what the sectors face (bounded)
//   sentimentOf(events, company, day, ctx, G)  the bounded change in the price the market expects a company to earn
//
// An event's effect is a function of its own saved record and the day — never a change applied once — so a save or a reload cannot repeat it or lose it.
import { hashUnit } from '../aero/config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function severityOf(kind, incomes, G) {
  const S = G.severity;
  const sum = incomes.reduce((a, b) => a + b, 0);
  return kind === 'war' ? clamp(sum / S.warIncome, S.min, S.max) : clamp(sum / S.embargoIncome, S.embargoMin, S.embargoMax);
}

/** 0..1.15: ramping in from the day it was first seen, 15% heavier once a war is prolonged, fading to nothing over `recoverDays` once it has ended. */
export function phaseOf(e, day, G) {
  const from = e.registered ?? e.start;
  if (day < from) return 0;
  const ramp = (d) => Math.min(1, (d - from + 1) / G.rampDays);
  if (e.status === 'resolved' && day >= e.end) return ramp(e.end) * Math.max(0, 1 - (day - e.end) / G.recoverDays);
  const long = e.kind === 'war' && day - e.start >= G.prolongedDays ? 1.15 : 1;
  return ramp(day) * long;
}

const live = (events, day, G) => events.filter((e) => phaseOf(e, day, G) > 0);

/** Sector indices: demand multipliers and cost multipliers, each bounded. ctx: { sectors: {sector: {margin}}, incomes: {country: obols a day} }. */
export function indices(events, day, ctx, G) {
  const demand = {};
  const cost = {};
  const total = Object.values(ctx.incomes).reduce((a, b) => a + b, 0) || 1;
  for (const e of live(events, day, G)) {
    const p = phaseOf(e, day, G) * e.severity;
    if (e.kind === 'war') {
      const oil = e.parties.some((c) => G.war.oil.countries.includes(c));
      for (const s of Object.keys(ctx.sectors)) {
        let d = G.war.demand[s] || 0;
        if (s === 'energy' && oil) d = G.war.demand.energy + G.war.oil.demand;
        demand[s] = (demand[s] || 0) + d * p;
        cost[s] = (cost[s] || 0) + (G.war.cost[s] || 0) * p;
      }
    } else if (e.kind === 'embargo' && e.goods.includes('arms')) {
      const share = (ctx.incomes[e.target] || 0) / total;
      demand.arms = (demand.arms || 0) - G.embargo.armsShare * share * phaseOf(e, day, G);
    }
  }
  const out = { demand: {}, cost: {} };
  for (const s of Object.keys(ctx.sectors)) {
    if (demand[s]) out.demand[s] = clamp(1 + demand[s], G.bounds.demand[0], G.bounds.demand[1]);
    if (cost[s]) out.cost[s] = clamp(1 + cost[s], G.bounds.cost[0], G.bounds.cost[1]);
  }
  return out;
}

/** What the live events add to the yield of Halvermouth's bonds (a rate; 0 with none), bounded, to the basis point. */
export function bondPremium(events, day, G) {
  let p = 0;
  for (const e of live(events, day, G)) p += (e.kind === 'war' ? G.bond.war : G.bond.embargo) * e.severity * phaseOf(e, day, G);
  return Math.round(clamp(p, 0, G.bond.max) / 0.0001) * 0.0001;
}

/** A company's own exposure: a stable hash of its id, so two companies of one sector are not hit alike. */
export const exposureOf = (id, salt, G) => G.expo[0] + hashUnit(`${salt}|${id}|geo`) * (G.expo[1] - G.expo[0]);

/**
 * What the market expects a company to earn differently because of the events live today, as a share of its price (bounded):
 * the change in a year's profit its sector's demand and cost indices imply (profit moves with sales, and with cost against the
 * sector's margin), times the company's exposure, more for one from a country in the event, less for an arms company with no room
 * to sell more. company: { id, sector, country, util? }.
 */
export function sentimentOf(events, company, day, ctx, G) {
  const idx = indices(events, day, ctx, G);
  const m = ctx.sectors[company.sector]?.margin || 0.2;
  const expo = exposureOf(company.id, ctx.salt || '', G);
  let d = ((idx.demand[company.sector] ?? 1) - 1);
  if (company.sector === 'arms' && d > 0 && company.util != null) d *= clamp(1.05 - company.util, 0, 1) / 0.3; // a works already full cannot sell more
  const c = ((idx.cost[company.sector] ?? 1) - 1) * (1 - m) / m;
  let delta = (d - c) * expo;
  for (const e of live(events, day, G)) {
    const p = phaseOf(e, day, G) * e.severity;
    if (e.kind === 'war' && e.parties.includes(company.country)) delta -= G.war.partyHit * p;
    if (e.kind === 'embargo' && e.target === company.country) delta -= G.embargo.partyHit * p;
  }
  return clamp(G.sentimentWeight * delta, -G.bounds.sentiment, G.bounds.sentiment);
}
