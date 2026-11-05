// Your own party (v0.97.0): the rules, pure.
//
//   needsOf(x)                 the five founding needs with whether each is met
//   considerShare(platform)    how many voters would consider a platform (0 … PARTY.consider.max): read-only, never enters an election
//   staffName(i, salt)         a name for the next staff record (a hash)
import { PARTY as P } from '../content/party.js';
import { BLOCS, REGIONS } from '../content/opinion.js';
import { affinity } from './opinion.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** x: { office (the tier owned, or null), rep, platform, staff (count), paidFee }. */
export function needsOf(x) {
  const N = P.needs;
  const prio = Object.values(x.platform || {}).filter((v) => v).length;
  const list = [
    { id: 'office', name: 'An office', met: Boolean(x.office), text: x.office ? `Your company's ${x.office === 'tower' ? 'Tower' : 'Corporate Centre'} serves.` : 'The Corporate Centre or the Tower, bought by your company (Group → Headquarters).' },
    { id: 'fee', name: 'Registration fee', met: Boolean(x.paidFee), text: `${N.fee.toLocaleString('en-US')} obols, paid to the state.` },
    { id: 'reputation', name: 'Reputation', met: x.rep >= N.reputation, text: `${N.reputation} with the Civic Office (you have ${x.rep}).` },
    { id: 'platform', name: 'Platform', met: prio >= N.priorities, text: `At least ${N.priorities} priorities (you have ${prio}).` },
    { id: 'staff', name: `${N.staff} staff`, met: x.staff >= N.staff, text: `You have ${x.staff}.` },
  ];
  return { list, met: list.filter((n) => n.met).length, total: list.length, ready: list.every((n) => n.met) };
}

/** Voters who would consider the platform: each bloc's share of Sund times how well the platform suits it (only where it suits), up to `consider.max`. */
export function considerShare(platform) {
  const share = {};
  let wsum = 0;
  for (const R of Object.values(REGIONS)) { wsum += R.weight; for (const [b, v] of Object.entries(R.shares)) share[b] = (share[b] || 0) + R.weight * v; }
  let t = 0;
  for (const b of Object.keys(BLOCS)) t += (share[b] / wsum) * clamp(affinity(b, platform || {}), 0, 1);
  return Math.round(clamp(t, 0, 1) * P.consider.max * 1000) / 1000;
}

export const staffName = (i, salt) => { let h = 2166136261; const s = `${salt}|staff|${i}`; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return P.staff.names[(h >>> 0) % P.staff.names.length]; };
