// The political calendar (v0.93.0): pure functions of the day and the constitution. No saved state, no randomness.
//
//   termOf(day, C)    → { index, start, end, electionFrom, electionDay }  the term a day falls in (terms are consecutive, from day 1)
//   phaseOf(day, C)   → 'term' | 'campaign' | 'polling'                   what the political year is doing that day
//   daysTo(day, C)    → days until polling day (0 on it)

export function termOf(day, C) {
  const d = Math.max(1, Math.floor(day));
  const index = Math.floor((d - 1) / C.termDays);
  const start = index * C.termDays + 1;
  const end = start + C.termDays - 1;
  return { index, start, end, electionFrom: end - C.electionDays + 1, electionDay: end };
}

export function phaseOf(day, C) {
  const t = termOf(day, C);
  if (Math.floor(day) === t.electionDay) return 'polling';
  return day >= t.electionFrom ? 'campaign' : 'term';
}

export const daysTo = (day, C) => termOf(day, C).electionDay - Math.floor(day);
