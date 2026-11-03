// The Assembly's vote (v0.94.0): a tally of seats, not a simulated chamber. Pure; no randomness.
//
// Each party's seats vote yes in proportion to how far the policy's direction fits the party's stance on its issue (a party strongly for the
// issue's direction votes nearly all yes; strongly against, nearly all no); the governing party's discipline adds to its own; the independents
// follow the average of the two. A bill passes on more than half of all seats.
import { PARTY_IDS } from './model.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The share (0..1) of a party's seats voting yes. */
export function yesShare(stance, dir, governing, discipline) {
  const fit = (stance || 0) * dir; // -2 … +2
  return clamp(0.5 + 0.22 * fit + (governing ? discipline : 0), 0.04, 0.97);
}

/** The vote on `policy` ({ issue, dir }): { yes, no, seats, passed, byParty }. */
export function vote(policy, { seats, platforms, governing, discipline }) {
  const by = {};
  let yes = 0;
  for (const id of PARTY_IDS) {
    const s = seats[id];
    const y = Math.round(s * yesShare(platforms[id][policy.issue], policy.dir, id === governing, discipline));
    by[id] = { seats: s, yes: y, no: s - y }; yes += y;
  }
  const avg = PARTY_IDS.reduce((a, id) => a + (platforms[id][policy.issue] || 0), 0) / PARTY_IDS.length;
  const oy = Math.round(seats.other * yesShare(avg, policy.dir, false, 0));
  by.other = { seats: seats.other, yes: oy, no: seats.other - oy }; yes += oy;
  const total = PARTY_IDS.reduce((a, id) => a + seats[id], 0) + seats.other;
  return { yes, no: total - yes, seats: total, passed: yes * 2 > total, byParty: by };
}
