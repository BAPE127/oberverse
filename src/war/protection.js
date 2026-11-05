// Base protection (v0.98.0): the invariant. One function answers "is the company's base protected?", and it reads one flag.
//
//   baseProtected(game)            true while world.military.coup.state === 'none'   (the only place that answers the question)
//   setCoupState(game, state, why) the ONLY writer of the flag: none → staged → ended
//   settle(game, how)              the ONLY way protection comes back: an explicit settlement after a coup has ended
//
// Staging a coup makes the base vulnerable by that one flag; it damages nothing. Ending a coup does NOT restore protection and does NOT undo damage.
// Equipment and people away from the base are never protected (the gate only ever asks about structures).
import { ensureMilitary, peekMilitary } from './state.js';
import { COUP_STATES } from '../content/military.js';

export function baseProtected(game) {
  return (peekMilitary(game)?.coup?.state ?? 'none') === 'none';
}

const NEXT = { none: ['staged'], staged: ['ended'], ended: [] };

/** none → staged → ended. Returns { ok, text }. Any other move is refused (a coup cannot be un-staged, and ending one does not restore anything). */
export function setCoupState(game, state, why = '') {
  const m = ensureMilitary(game);
  if (!COUP_STATES.includes(state)) return { ok: false, text: `No such coup state "${state}".` };
  if (m.coup.state === state) return { ok: true, text: `Already ${state}.` };
  if (!NEXT[m.coup.state].includes(state)) return { ok: false, text: `A coup cannot go from ${m.coup.state} to ${state}.` };
  const day = game.clock?.day ?? 0;
  m.coup = { state, since: day, outcome: state === 'ended' ? (why || 'ended') : null };
  m.protection = { baseProtected: state === 'none', reason: state === 'staged' ? `a coup is staged (${why || 'no reason given'})` : 'the coup has ended, but protection is not restored until a settlement', since: day };
  m.log.push({ day, text: `Coup ${state}${why ? `: ${why}` : ''}.` });
  return { ok: true, text: `Coup ${state}.` };
}

/** An explicit settlement (you win and govern, or you surrender and are granted terms) restores protection. Never automatic; damage stays. */
export function settle(game, how) {
  const m = ensureMilitary(game);
  if (m.coup.state !== 'ended') return { ok: false, text: 'There is nothing to settle: no coup has ended.' };
  if (!how) return { ok: false, text: 'A settlement says how it was settled.' };
  const day = game.clock?.day ?? 0;
  m.coup = { state: 'none', since: day, outcome: `settled: ${how}` };
  m.protection = { baseProtected: true, reason: `settled: ${how}`, since: day };
  m.log.push({ day, text: `Settlement (${how}): the base is protected again; what was destroyed stays destroyed until rebuilt.` });
  return { ok: true, text: 'Settled. The base is protected again.' };
}
