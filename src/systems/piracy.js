// Piracy and dangerous routes (v0.23.0). Pure functions — no game state is
// changed here. Danger comes from the world as it is: named pirate waters
// (content), plus zones round the main ports of countries at war and under
// embargo (the arms market's own politics). A voyage's risk is decided once,
// at departure, and stored with the voyage (src/systems/logistics.js), so a
// reload never re-rolls it.
//
//   zones(content, market)           → [{ id, name, lat, lon, radius, danger }]
//   exposure(route, zones)           → { dangerKm, maxDanger, names }
//   assess(ctx)                      → { chance, category, worst, exposure }
//   roll(rng, risk, defence)         → null | { outcome, … }   (an encounter)
import { gcKm } from '../world/globe.js';
import { pointAlong } from '../world/seaRoutes.js';

export function zones(content, market, { suppressed = {}, now = 0 } = {}) {
  const L = content.logistics;
  const out = Object.entries(L.pirateWaters).map(([id, z]) => ({ id, ...z, danger: z.danger * (suppressed[id] > now ? 0.5 : 1) }));
  const mainPort = (cid) => Object.values(L.ports).find((p) => p.country === cid);
  for (const w of market?.wars || []) {
    for (const cid of [w.a, w.b]) {
      const p = mainPort(cid);
      if (p) out.push({ id: `war_${cid}`, name: `the ${content.arms.countries[cid].name} war zone`, lat: p.lat, lon: p.lon, radius: L.risk.warZone.radius, danger: L.risk.warZone.danger, war: true });
    }
  }
  for (const [cid, c] of Object.entries(market?.countries || {})) {
    if (!c.embargo) continue;
    const p = mainPort(cid);
    if (p) out.push({ id: `emb_${cid}`, name: `the ${content.arms.countries[cid].name} blockade`, lat: p.lat, lon: p.lon, radius: L.risk.embargoZone.radius, danger: L.risk.embargoZone.danger, embargo: true });
  }
  return out;
}

/** How much dangerous water a route crosses (sampled every ~100 km). */
export function exposure(route, zs) {
  if (!route || !zs.length) return { dangerKm: 0, maxDanger: 0, names: [] };
  const n = Math.max(2, Math.ceil(route.km / 100));
  const step = route.km / n;
  let dangerKm = 0;
  let maxDanger = 0;
  const names = new Set();
  for (let i = 0; i <= n; i++) {
    const p = pointAlong(route, i / n);
    let d = 0;
    for (const z of zs) {
      if (gcKm(p, [z.lat, z.lon]) > z.radius) continue;
      if (z.danger > d) d = z.danger;
      names.add(z.name);
    }
    dangerKm += d * step;
    if (d > maxDanger) maxDanger = d;
  }
  return { dangerKm, maxDanger, names: [...names] };
}

/**
 * A voyage's risk. ctx: { R (content risk rules), route, zones, cargo ('arms' |
 * contract type | null), speed, stealth, escortStrength (0–1), chanceMod (sum
 * of bonuses, e.g. −0.25) }.
 */
export function assess({ R, route, zones: zs, cargo = null, speed = 14, stealth = 10, escortStrength = 0, chanceMod = 0 }) {
  const ex = exposure(route, zs);
  let chance = R.base + R.perDangerKkm * (ex.dangerKm / 1000);
  chance *= R.cargoValue[cargo] || (cargo ? 1 : 0.6); // empty ships are dull prey
  chance *= Math.sqrt(15 / Math.max(5, speed));
  chance *= 1 - Math.min(0.9, stealth / 200);
  chance *= 1 - Math.min(0.75, escortStrength);
  chance *= Math.max(0.1, 1 + chanceMod);
  chance = Math.min(R.maxChance, Math.max(0, chance));
  const worst = R.severity.find(([d]) => ex.maxDanger < d)?.[1] || 'captured';
  const category = chance < 0.03 ? 'low' : chance < 0.1 ? 'moderate' : chance < 0.25 ? 'high' : 'extreme';
  return { chance, category, worst, exposure: ex };
}

const ORDER = ['repelled', 'delay', 'ransom', 'cargo', 'captured'];

/**
 * Roll whether pirates strike, and how it goes. defence: { defense (ship +
 * escorts + guards), escorted (bool), cargo (bool), value (cargo value for the ransom) }.
 * Returns null (no encounter) or { outcome, at (fraction of the voyage), hours, cost, damage, pirates }.
 */
export function roll(rng, risk, R, defence) {
  if (rng.next() >= risk.chance) return null;
  const danger = Math.max(0.15, risk.exposure.maxDanger);
  const pirates = 30 + danger * 80 + rng.next() * 30;
  const margin = defence.defense - pirates;
  let outcome = margin > 20 ? 'repelled' : margin > 0 ? 'delay' : margin > -20 ? 'ransom' : margin > -40 ? 'cargo' : 'captured';
  // what the water allows: safe water never costs you a cargo or a ship; escorts never let a ship be taken
  let cap = ORDER.indexOf(risk.worst);
  if (defence.escorted) cap = Math.min(cap, ORDER.indexOf('cargo'));
  if (ORDER.indexOf(outcome) > cap) outcome = ORDER[cap];
  if (outcome === 'cargo' && !defence.cargo) outcome = 'ransom';
  const at = 0.2 + rng.next() * 0.6;
  const hours = outcome === 'repelled' ? 0 : Math.round(6 + rng.next() * 18);
  const damage = { repelled: 0, delay: 6, ransom: 4, cargo: 15, captured: 0 }[outcome] + Math.round(rng.next() * 8);
  const cost = outcome === 'ransom' ? Math.max(R.ransom.min, Math.round((defence.value || 0) * R.ransom.share)) : 0;
  return { outcome, at, hours, cost, damage, pirates: Math.round(pirates) };
}
