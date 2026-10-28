// Achievements (v0.59.0). The metrics are plain reads of a company's own record; an achievement is
// earned the first time its metric reaches its goal, and pays once (a little reputation, a grant).
// The functions take the Aerospace system `A`, like events.js.
import { summarise } from './books.js';
import { networkOf } from './orbit.js';

const WIDEBODIES = ['ap_condor', 'ap_skyliner'];

/** What each metric reads for a company. */
export const METRICS = {
  delivered: (A, co) => co.stats.delivered || 0,
  bestStreak: (A, co) => co.stats.bestStreak || 0,
  flawless: (A, co) => co.stats.flawless || 0,
  classes: (A, co) => ['private', 'passenger', 'fighter', 'bomber'].filter((k) => (co.stats.byClass?.[k] || 0) > 0).length,
  bigContract: (A, co) => co.stats.bigContract || 0,
  widebodies: (A, co) => WIDEBODIES.reduce((a, id) => a + (co.stats.byProduct?.[id] || 0), 0),
  launches: (A, co) => Math.max(0, (co.stats.launches || 0) - (co.stats.launchFailures || 0)),
  launchRun: (A, co) => co.stats.launchBest || 0,
  satellites: (A, co) => Object.values(A.state.satellites).filter((s) => s.manufacturer === co.id).length,
  networks: (A, co) => {
    const S = A.cfg.services;
    const mine = Object.values(A.state.satellites).filter((s) => s.manufacturer === co.id && s.own && (s.status === 'operational' || s.status === 'degraded'));
    return Object.entries(S.roles).filter(([role, R]) => networkOf(S, mine, role, A.now, A.day).n >= R.full).length;
  },
  discoveries: (A, co) => co.stats.discoveries || 0,
  orbitIncome: (A, co) => co.books.totals.rev_services || 0,
  revenue: (A, co) => summarise(co.books, null).revenue,
  weekProfit: (A, co) => summarise(co.books, 7).profit,
  halls: (A, co) => Object.keys(A.cfg.halls).filter((id) => !A.cfg.halls[id].owned && A.hallState(co, id).state === 'built').length,
  researched: (A, co) => co.research.length,
  workforce: (A, co) => co.workforce,
  reputation: (A, co) => co.reputation,
  beatMeridian: (A, co) => ((A.meridian?.stats.delivered || 0) >= 10 && (co.stats.delivered || 0) > A.meridian.stats.delivered ? 1 : 0),
};

/** Every achievement with where the company stands on it: { …def, value, goal, frac, done, at }. */
export function progress(A, co) {
  return A.cfg.achievements.map((a) => {
    const value = METRICS[a.metric](A, co);
    const got = co.achieved?.[a.id];
    return { ...a, value, frac: Math.max(0, Math.min(1, value / a.goal)), done: Boolean(got), at: got?.at ?? null, day: got?.day ?? null };
  });
}

/** Award what has been reached since the last look. Returns the ones just earned. */
export function checkAchievements(A, co) {
  if (co.kind !== 'player') return [];
  co.achieved ||= {};
  const won = [];
  for (const a of A.cfg.achievements) {
    if (co.achieved[a.id] || METRICS[a.metric](A, co) < a.goal) continue;
    co.achieved[a.id] = { at: A.now, day: A.day };
    if (a.rep) A.repChange(co, a.rep, `Achievement: ${a.name}`);
    if (a.cash) A.receive(co, a.cash, null);
    A.report(co, 'event', `🏆 Achievement — ${a.name}: ${a.text}${a.cash ? ` The Park Authority sends ${a.cash.toLocaleString()} obols.` : ''}`, 'good');
    A.news(`🏆 ${co.name}: ${a.name}.`, 'good');
    won.push(a);
  }
  return won;
}
