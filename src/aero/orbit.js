// Satellite services and orbits (v0.59.0). Pure functions — no game state, no DOM. `S` is
// `SERVICES` from src/content/aerospace.js; a satellite is a record in `state.satellites`.
//
//   marketAt(S, role, day)             the demand and the rivals' capacity of a market on a day
//   networkOf(S, sats, role, …)        what a company's satellites of one role make together
//   sell(S, role, net, market, …)      what the network sells, and for how much
//   hazardOf / lostToday               the daily chance a satellite is lost, and whether it is, today
//   forecast(S, …)                     what one more satellite would add (for the ordering sheet)
//   orbitOf / look / subpoint          where a satellite is, and what the ground station sees
//
// Everything is arithmetic on the satellite's own facts and the day, so a reload — or a night of
// sleep — gives the same answer; the only random thing is the hash of (satellite, day).
import { hashUnit } from './config.js';

const DAY = 1440;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** The role a product serves (the first service it sells; the experimental satellite sells science). */
export const roleOf = (p) => Object.keys(p.service || {})[0] || p.role;

// ------------------------------------------------------------------ markets
const phaseOf = (role) => hashUnit(`mkt|${role}`) * Math.PI * 2;

/** A market on a day: how many service units it wants, and how many its other suppliers already carry. */
export function marketAt(S, role, day) {
  const R = S.roles[role];
  const wave = 1 + R.wave * Math.sin(day / 11 + phaseOf(role));
  return {
    demand: R.demand * Math.min(2.6, 1 + R.growth * day) * wave,
    rivals: R.rivals * Math.min(2.2, 1 + R.growth * 0.7 * day),
  };
}

/** How much of the sky a network of `n` satellites covers (a full network is 1). */
export function coverage(S, role, n) {
  const R = S.roles[role];
  if (n <= 0) return 0;
  return Math.min(1, n / R.full) ** R.exp;
}

// ------------------------------------------------------------------ satellites
/** A satellite's working capability now: what commissioning left it, ageing, and any storm damage. */
export function capabilityAt(S, sat, now, day) {
  if (sat.status === 'failed' || sat.status === 'decommissioned') return 0;
  const life = Math.max(1, sat.lifeDays * DAY);
  const age = clamp((now - sat.commissioned) / life, 0, 1);
  const hit = sat.hit && day <= sat.hit.untilDay ? 1 - sat.hit.amount : 1;
  return clamp((sat.capability ?? 1) * (1 - S.degrade * age) * hit, 0, 1);
}

/** Service units a satellite makes of `role` now (its configured service × its capability). */
export function unitsOf(S, sat, role, now, day) {
  return (sat.service?.[role] || 0) * capabilityAt(S, sat, now, day);
}

const live = (sat) => sat.status === 'operational' || sat.status === 'degraded';

/** The network a company's satellites of one role make: how many, the units they carry, the coverage, the capacity. */
export function networkOf(S, sats, role, now, day, { bonus = 0 } = {}) {
  const mine = sats.filter((s) => live(s) && s.service?.[role] > 0);
  const units = mine.reduce((a, s) => a + unitsOf(S, s, role, now, day), 0) * (1 + bonus);
  const cov = coverage(S, role, mine.length);
  return { role, n: mine.length, units, coverage: cov, capacity: units * cov, sats: mine };
}

/** What a network sells in a market: your share of the demand, never more than you can carry, at the day's price. */
export function sell(S, role, net, market, { mult = 1, priceBonus = 0 } = {}) {
  const R = S.roles[role];
  const cap = net.capacity;
  if (cap <= 0) return { sold: 0, revenue: 0, utilisation: 0, price: R.price * mult * (1 + priceBonus), share: 0 };
  const share = (market.demand * cap) / (cap + market.rivals);
  const sold = Math.min(cap, share);
  const price = R.price * mult * (1 + priceBonus);
  return { sold, revenue: Math.round(sold * price), utilisation: sold / cap, price, share: sold / Math.max(1e-9, market.demand) };
}

// ------------------------------------------------------------------ lifecycles
/** The daily chance a satellite is lost: hardened buses and a servicing platform halve it, old age raises it. */
export function hazardOf(S, sat, { platform = false, research = 0, now, quality = 60 } = {}) {
  const H = S.hazard;
  const age = clamp((now - sat.commissioned) / Math.max(1, sat.lifeDays * DAY), 0, 1);
  let p = H.base * (1.35 - quality / 200);
  if (sat.hardened) p *= H.hardened;
  if (platform) p *= H.platform;
  if (age > H.lateShare) p *= H.late;
  return Math.max(0, p * (1 + research));
}

/** Whether a satellite is lost on a day: a hash of the two, so the answer never changes. */
export const lostToday = (sat, day, p) => hashUnit(`sat|${sat.id}|${day}`) < p;

/** Days left in a satellite's life. */
export const daysLeft = (sat, now) => Math.max(0, (sat.endsAt - now) / DAY);

// ------------------------------------------------------------------ what one more would add
/**
 * What ordering one more satellite of a product would do, for the ordering sheet: the revenue a
 * day it would add to the company's network (today's market), what it would make over its life,
 * and how that compares with what it costs. `sats` are the company's live satellites already.
 */
export function forecast(S, product, sats, now, day, { cost = 0, bonus = 0, mult = {}, priceBonus = {} } = {}) {
  const role = roleOf(product);
  const R = S.roles[role];
  const svc = product.service?.[role] || 0;
  const market = marketAt(S, role, day);
  const before = networkOf(S, sats, role, now, day, { bonus });
  const fake = { id: 'new', status: 'operational', service: product.service, commissioned: now, lifeDays: product.life, capability: 1 };
  const after = networkOf(S, [...sats, fake], role, now, day, { bonus });
  const b = sell(S, role, before, market, { mult: mult[role] ?? 1, priceBonus: priceBonus[role] ?? 0 });
  const a = sell(S, role, after, market, { mult: mult[role] ?? 1, priceBonus: priceBonus[role] ?? 0 });
  const perDay = a.revenue - b.revenue;
  const opex = product.opex || 0;
  const lifetime = Math.round((perDay - opex) * product.life * (1 - S.degrade / 2));
  return { role, units: svc, perDay, opex, net: perDay - opex, lifetime, cost, ratio: cost ? lifetime / cost : 0, paybackDays: perDay - opex > 0 && cost ? Math.ceil(cost / (perDay - opex)) : null, n: after.n, coverage: after.coverage, saturated: a.utilisation < 0.95 };
}

// ------------------------------------------------------------------ orbits
/** A satellite's orbit, from its role and the hash of its id: period (game minutes), inclination, node and phase (degrees). */
export function orbitOf(S, sat) {
  const R = S.roles[sat.role] || S.roles.comms;
  const h = (k) => hashUnit(`orb|${sat.id}|${k}`);
  const geo = R.orbit.inc === 0;
  return {
    period: geo ? 1436 : R.orbit.period * (0.96 + 0.08 * h('p')),
    inc: geo ? 0 : R.orbit.inc + (h('i') - 0.5) * 8,
    raan: h('n') * 360,
    m0: h('m') * 360,
  };
}

const OMEGA = 360 / 1436; // the Earth's turn, degrees a minute

/** Position in the inertial frame (Earth radii) at `now` minutes. */
export function eci(o, now) {
  const a = (o.period / 84.4) ** (2 / 3);
  const M = rad(o.m0 + (360 * now) / o.period);
  const i = rad(o.inc);
  const W = rad(o.raan);
  const x = a * (Math.cos(M) * Math.cos(W) - Math.sin(M) * Math.cos(i) * Math.sin(W));
  const y = a * (Math.cos(M) * Math.sin(W) + Math.sin(M) * Math.cos(i) * Math.cos(W));
  const z = a * Math.sin(M) * Math.sin(i);
  return { x, y, z, a };
}

/** Where on the Earth it is over (degrees) at `now`. */
export function subpoint(o, now) {
  const p = eci(o, now);
  const lat = deg(Math.asin(p.z / p.a));
  let lon = deg(Math.atan2(p.y, p.x)) - OMEGA * now;
  lon = ((lon + 540) % 360) - 180;
  return { lat, lon, alt: p.a - 1 };
}

/** What a ground station at (lat, lon) sees: elevation and azimuth in degrees (negative elevation: below the horizon). */
export function look(o, now, station) {
  const p = eci(o, now);
  const phi = rad(station.lat);
  const th = rad(station.lon + OMEGA * now);
  const st = { x: Math.cos(phi) * Math.cos(th), y: Math.cos(phi) * Math.sin(th), z: Math.sin(phi) };
  const rel = { x: p.x - st.x, y: p.y - st.y, z: p.z - st.z };
  const d = Math.hypot(rel.x, rel.y, rel.z);
  const up = st;
  const east = { x: -Math.sin(th), y: Math.cos(th), z: 0 };
  const north = { x: -Math.sin(phi) * Math.cos(th), y: -Math.sin(phi) * Math.sin(th), z: Math.cos(phi) };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  return { el: deg(Math.asin(clamp(dot(rel, up) / d, -1, 1))), az: (deg(Math.atan2(dot(rel, east), dot(rel, north))) + 360) % 360, range: d };
}
