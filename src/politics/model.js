// The political record (v0.93.0): what `world.politics` holds when it is made, and the checks every later release relies on. Pure.
//
//   freshPolitics(P, { day, governs })  → the record: constitution, two parties with funds and vacant staff records, the government and its term
//   OTHER_PARTY(id)                    → the other of the two parties
//   stanceDistance(a, b, issues)       → how far apart two platforms are (0 = identical), a number the later systems can read
import { termOf } from './calendar.js';

export const PARTY_IDS = ['order', 'liberty'];
export const OTHER_PARTY = (id) => (id === 'order' ? 'liberty' : 'order');

export function freshPolitics(P, { day = 1, governs = 'order' } = {}) {
  const C = P.constitution;
  const t = termOf(day, C);
  const parties = {};
  for (const id of PARTY_IDS) {
    const def = P.parties[id];
    parties[id] = {
      id, name: def.name, leaderId: def.leader, platform: { ...def.platform }, funds: P.funds[id], support: 0,
      staff: P.staffRoles.map((r) => ({ role: r.id, personId: null })),
    };
  }
  return {
    v: 1,
    constitution: { termDays: C.termDays, electionDays: C.electionDays, assemblySeats: { ...C.assemblySeats }, electionsHeld: false },
    government: { partyId: governs, presidentId: P.parties[governs].leader, term: t.index, termStart: t.start, termEnd: t.end },
    parties,
    history: [{ day, kind: 'government', text: `${P.parties[governs].name} governs: ${P.parties[governs].short} leader in Halver House.` }],
  };
}

export function stanceDistance(a, b, issues) {
  const keys = Object.keys(issues);
  return keys.reduce((s, k) => s + Math.abs((a[k] ?? 0) - (b[k] ?? 0)), 0) / keys.length;
}
