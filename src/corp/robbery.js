// Bank robbery (v0.79.0). Pure functions — no game state, no DOM, no RNG.
//
//   STATES, EDGES, step(state, event)      the explicit state machine: normal → alert → robbery → police → recovery → reopening → normal
//   lootOf(stock, haul)                    what one robbery can take: the haul, never more than the vault holds
//   restockOf(stock, full, perDay)         the vault refilled a day's worth, never past full
//   premiumOf(events, day, R)              the bounded market reaction to a robbery of the central bank (a rate)
//
// Nothing here knows anything about credit, loans, ratings, valuations, rankings or anyone's wallet. That is the point: it cannot affect them.
export const STATES = ['normal', 'alert', 'robbery', 'police', 'recovery', 'reopening'];

/** The only moves there are. An event that is not on this list for the state does nothing: that is what stops a repeat from paying twice. */
export const EDGES = {
  normal: { warn: 'alert' },
  alert: { stand_down: 'normal', strike: 'robbery' },
  robbery: { alarm: 'police' },
  police: { seal: 'recovery' },
  recovery: { restocked: 'reopening' },
  reopening: { open: 'normal' },
};

/** The state after an event, or null if that event means nothing in this state. */
export const step = (state, event) => EDGES[state]?.[event] ?? null;

/** What one robbery takes: its defined haul, limited to what the vault actually holds. */
export function lootOf(stock, haul) {
  return { cash: Math.max(0, Math.min(stock.cash, haul.cash)), gold: Math.max(0, Math.min(stock.gold, haul.gold)) };
}

/** The vault, refilled by a day's worth (never past full). */
export function restockOf(stock, full, perDay) {
  return { cash: Math.min(full.cash, stock.cash + perDay.cash), gold: Math.min(full.gold, stock.gold + perDay.gold) };
}

export const isFull = (stock, full) => stock.cash >= full.cash && stock.gold >= full.gold;

/**
 * What the central bank's loss does to government bond yields: a premium that is largest the day after and falls to nothing in `days`,
 * scaled by how much was taken against the biggest haul possible. events: [{ day, share }] where share = taken value / the haul's value.
 */
export function premiumOf(events, day, R) {
  let p = 0;
  for (const e of events) {
    const age = day - e.day;
    if (age < 0 || age >= R.days) continue;
    p += R.max * Math.min(1, e.share) * (1 - age / R.days);
  }
  return Math.round(Math.min(R.max, p) / 0.0001) * 0.0001;
}
