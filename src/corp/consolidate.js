// Consolidation (v0.61.0). Pure functions — no game state, no DOM.
//
//   icStep(prev, { R, U, active })    the group's pool of unrealised intercompany freight, one month on
//
// When the shipping subsidiary carries the aerospace subsidiary's materials, aerospace puts the charge
// into its stores and expenses it only when the stores are used; shipping books it as revenue at once.
// Between the two the group has made no profit — the charge is a transfer inside it. So, month by month,
// the group keeps what it is still holding:
//
//   U   the charge still sitting in aerospace's stores, in transit and in unfinished units (read from its records)
//   P   the part of U that was there before both companies were in the group (never deferred: it was bought from an outsider)
//   G   the part charged since: deferred — not group profit yet
//
// Each month R (new charges) enters G; whatever left U (what aerospace used) is taken from P first (the
// oldest), then from G. What leaves G is E, the charge now expensed by aerospace: the group's cost to
// eliminate. Consolidated net = the companies' trading results − dividends within the group − (R − E).

/**
 * One month. `prev` is the state after the last month ({ active, U, P, G } or null). Returns
 * { state, R, E } — R the charges eliminated from revenue, E the matching cost released from the pool.
 */
export function icStep(prev, { R, U, active }) {
  if (!active) return { state: { active: false, U, P: U, G: 0 }, R: 0, E: 0 };
  if (!prev?.active) return { state: { active: true, U, P: U, G: 0 }, R: 0, E: 0 }; // the day both joined: all held is from before
  const released = Math.max(0, prev.U + R - U);
  const fromG = Math.min(prev.G + R, Math.max(0, released - prev.P));
  const fromP = Math.min(prev.P, released - fromG);
  const G = Math.max(0, prev.G + R - fromG);
  return { state: { active: true, U, P: prev.P - fromP, G }, R, E: fromG };
}
