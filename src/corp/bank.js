// The central bank's rule (v0.68.0). Pure functions — no game state, no DOM, no RNG.
//
//   target(ind)                 where the policy rate would sit for what the economy is doing
//   decide(rate, ind)           what the bank does this month: hold, or move one step toward it — and why, in words
//   valuationFactor(rate)       how much a year's profit is worth at this rate, against the neutral one
//   investShift(rate)           how much busier a company must be before it builds, at this rate
//   entryFactor(rate)           how likely a new company is to appear, at this rate
//
// The rate is nobody's to set: it follows the economy by this rule once a month, and every decision is written down.
// At the neutral rate every effect is exactly nothing.

export const NEUTRAL = 0.05;
export const STEP = 0.0025;
export const FLOOR = 0.01;
export const CEILING = 0.12;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pc = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const sgn = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(d)}%`;

/**
 * ind: { util, growth, stress } — how busy the world's companies are (0–1, capacity-weighted), how much their sales grew last month,
 * and the share of them in distress. Busy and growing: the rate rises toward 'cooling' it; in distress it falls.
 */
export function target(ind) {
  const t = NEUTRAL + 0.06 * (ind.util - 0.75) + 0.3 * clamp(ind.growth, -0.1, 0.1) - 0.1 * ind.stress;
  return clamp(Math.round(t / STEP) * STEP, FLOOR, CEILING);
}

/** One monthly decision: a quarter-point step toward the target (a half when it is a point or more away), or a hold within a quarter-point of it. */
export function decide(rate, ind) {
  const goal = target(ind);
  const gap = goal - rate;
  let to = rate;
  if (Math.abs(gap) >= STEP - 1e-9) to = rate + Math.sign(gap) * (Math.abs(gap) >= 0.01 - 1e-9 ? 2 * STEP : STEP);
  to = clamp(Math.round(to / STEP) * STEP, FLOOR, CEILING);
  const why = [`capacity in use ${pc(ind.util, 0)} (neutral 75%)`, `sales ${sgn(ind.growth)} on the month before`, `${pc(ind.stress, 0)} of companies in distress`];
  const verb = to > rate ? `raised the policy rate from ${pc(rate, 2)} to ${pc(to, 2)}` : to < rate ? `lowered the policy rate from ${pc(rate, 2)} to ${pc(to, 2)}` : `held the policy rate at ${pc(rate, 2)}`;
  return { to, target: goal, text: `The First Bank of Halvermouth ${verb}: ${why.join('; ')}.` };
}

/** A year's profit is worth less when money costs more: 3% off the multiple for each point above neutral, within ±15%. */
export const valuationFactor = (rate) => clamp(1 - 3 * (rate - NEUTRAL), 0.85, 1.15);
/** Companies build later when borrowing costs more: half a point of utilisation for each point, within ±3 points. */
export const investShift = (rate) => clamp(0.5 * (rate - NEUTRAL), -0.03, 0.03);
/** Fewer newcomers when money is dear: 4% fewer for each point above neutral, within 0.7–1.3. */
export const entryFactor = (rate) => clamp(1 - 4 * (rate - NEUTRAL), 0.7, 1.3);
