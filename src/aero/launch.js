// Launches (v0.58.0). Pure functions — no game state, no DOM. A launch is a *sequence* the
// simulation starts when a rocket reaches its launch step, and the renderer draws from the clock:
//
//   rollout   the crawler takes the rocket, standing, from the integration building to the pad
//   countdown T-minus (the clock shows minutes as seconds: T-20 is twenty minutes of game time)
//   ignition  the last minutes before lift-off: engines lit, the deck blown with smoke, the ground shaking
//   ascent    lift-off and climb, the trail it leaves, stage separation
//   lost      (failures only) the moment it goes wrong, and what falls
//
// The outcome (success or not, and when) is fixed when the sequence starts, from the unit's own
// rolls, so what you watch is what is booked. Everything drawn is a function of the time since
// lift-off — no particles are stored — so a reload mid-countdown, or skipping the night, lands in
// exactly the right place.
import { hashUnit } from './config.js';
import { route, along } from './flight.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (u) => { const c = clamp(u, 0, 1); return c * c * (3 - 2 * c); };

/** The foot of a pad (tile coordinates), where the rocket's base stands: the pad prop's centre, a little up the deck. */
export const padBase = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 - 0.9375 });

/** The crawler's route from a company's rollout waypoints (map data) to the foot of its pad. */
export function rolloutPath(waypoints, base) {
  return route([...waypoints, [base.x, base.y]], 2);
}

/** How far along its rollout the crawler is (0–1), with a gentle start and stop; and where it is. */
export function rolloutAt(path, r, now) {
  const u = clamp((now - r.t0) / Math.max(1e-6, r.t1 - r.t0), 0, 1);
  const p = along(path, path.len * smooth(u));
  return { u, x: p.x, y: p.y, a: p.a, moving: u > 0 && u < 1 };
}

/** The sequence a launch begins: fixed from the unit's own roll, so the show is the outcome. */
export function startSequence(L, unit, now, success, chance) {
  const lift = now + L.countdownMin;
  const failT = success ? null : Math.round((L.failFrom + hashUnit(`fail|${unit.id}`) * L.failSpan) * 100) / 100;
  return { t0: now, lift, end: success ? lift + L.ascentMin : lift + failT + L.aftermath, success, chance, failT, seed: unit.id };
}

/** How high the rocket is (tiles above the pad) `t` minutes after lift-off. */
export const height = (L, t) => (t > 0 ? L.accel * t * t : 0);

/** The sequence at `now`: its phase, the minutes to (or from) lift-off, the rocket's height, and what has happened. */
export function phaseAt(L, seq, now) {
  const t = now - seq.lift;
  const out = { t, count: Math.max(0, -t), h: height(L, t), sep: false, boom: null };
  if (t < -L.ignitionMin) return { ...out, phase: 'countdown' };
  if (t < 0) return { ...out, phase: 'ignition', burn: (t + L.ignitionMin) / L.ignitionMin };
  if (seq.failT != null && t >= seq.failT) return { ...out, phase: t >= seq.failT + L.aftermath ? 'done' : 'lost', h: height(L, seq.failT), boom: t - seq.failT, burn: 1 };
  if (now >= seq.end) return { ...out, phase: 'done', sep: seq.success && t >= L.sepAt, burn: 1 };
  return { ...out, phase: 'ascent', sep: t >= L.sepAt, burn: 1 };
}

/** "T-00:12" for the clock on the pad (a minute of game time is a second on the clock) — "T+00:07" after lift-off. */
export function clockText(t) {
  const s = Math.round(Math.abs(t));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `T${t > 0.5 ? '+' : '-'}${mm}:${ss}`;
}

/**
 * The smoke and steam of a launch at `t` (minutes from lift-off), as offsets from the foot of the
 * pad in tiles — dx across, dy down the screen (negative = up) — with a radius in pixels, an
 * opacity and how hot it still is (0–1). A cloud blown out along the deck, and a trail up the sky.
 */
export function puffs(L, seq, t, wind = 1) {
  const out = [];
  const gEnd = Math.min(t, L.cloudMin);
  for (let te = -L.ignitionMin; te <= gEnd; te += L.puffGround) {
    const age = t - te;
    if (age > L.cloudLife || age < 0) continue;
    const k = Math.round((te + 10) * 100);
    const ang = hashUnit(`${seq.seed}|g|${k}`) * Math.PI * 2;
    const spread = 0.45 + hashUnit(`${seq.seed}|s|${k}`) * 1.3;
    const power = clamp((te + L.ignitionMin) / L.ignitionMin, 0.25, 1);
    const r = (0.4 + age * L.cloudSpeed) * spread;
    const f = age / L.cloudLife;
    out.push({ dx: Math.cos(ang) * r + wind * age * 0.1, dy: Math.sin(ang) * r * 0.5 - age * 0.12, r: (7 + age * 5.5) * (0.6 + power * 0.5), a: 0.62 * (1 - f) * (1 - f * 0.4) * (0.4 + power * 0.6), hot: Math.max(0, 1 - age / 1.6) * power, kind: 'ground' });
  }
  const tEnd = Math.min(t, seq.failT ?? L.ascentMin);
  for (let te = 0.05; te <= tEnd; te += L.puffTrail) {
    const age = t - te;
    if (age > L.trailLife || age < 0) continue;
    const k = Math.round(te * 100);
    const j = hashUnit(`${seq.seed}|t|${k}`) - 0.5;
    out.push({ dx: wind * age * 0.16 + j * (0.2 + age * 0.06), dy: -height(L, te) + age * 0.05, r: 5 + age * 3.4, a: 0.58 * (1 - age / L.trailLife), hot: Math.max(0, 1 - age / 0.5), kind: 'trail' });
  }
  return out;
}

/** The pieces thrown out when a vehicle is lost: offsets from the foot of the pad (tiles), at `boom` minutes after it happened. */
export function debris(L, seq, boom) {
  const out = [];
  const h0 = height(L, seq.failT);
  for (let i = 0; i < 16; i++) {
    const ang = hashUnit(`${seq.seed}|d|${i}`) * Math.PI * 2;
    const sp = 0.8 + hashUnit(`${seq.seed}|v|${i}`) * 2.4;
    const x = Math.cos(ang) * sp * boom;
    const y = -h0 + Math.sin(ang) * sp * boom * 0.8 + 0.5 * 0.9 * boom * boom;
    if (y > 1.5) continue; // down past the ground: it has landed somewhere out of sight
    out.push({ dx: x, dy: y, size: 2 + (i % 3), spin: ang });
  }
  return out;
}

/** How hard the ground shakes at a distance of `d` tiles from the pad (screen pixels of shake; 0 when it is quiet or far). */
export function shakeAt(L, ph, d) {
  let mag = 0;
  if (ph.phase === 'ignition') mag = 1.2 + 3 * ph.burn;
  else if (ph.phase === 'ascent') mag = Math.max(0, 5.5 - ph.t * 0.45);
  else if (ph.phase === 'lost') mag = ph.boom < 0.6 ? 9 * (1 - ph.boom / 0.6) : 0;
  return mag * clamp(1 - d / L.shakeRange, 0, 1);
}
