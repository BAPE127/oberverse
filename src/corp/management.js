// Managers deciding for themselves (v0.63.0). Pure functions — no game state, no DOM, no RNG.
//
//   judge(d)                    one decision, one answer: execute, queue for the owner, or refuse — with the reason
//   armsPar(stations, price)    what an arms works should hold of each bought part, and what it holds
//   planArmsOrders(...)         the orders that bring it back up
//   hireChoice(candidates, ...) who a manager would hire into a job: deterministic
//
// A decision is judged the same way when it is made and again when the owner approves it later.

/**
 * d: { kind, atWork, allowed, canHire, funded, cost, spendLimit, approvalAbove, cap, spent, affordable, hiresLeft }
 * `cost` is what the decision commits (for a hire: the fee and a month's wage). Order matters — the first failure is the reason.
 * `owner: true` is the owner's own approval: the ask-above limit no longer applies, everything else still does.
 */
export function judge(d) {
  const no = (reason) => ({ verdict: 'refuse', reason });
  if (!d.atWork) return no('They are not at work and paid.');
  if (!d.allowed) return no('Their job does not make this kind of decision.');
  if (d.kind === 'hire' && !d.canHire) return no('They are not authorised to hire.');
  if (!d.funded) return no('The business has no account of its own: fund it first.');
  if (!(d.cost > 0)) return no('There is nothing to spend.');
  if (d.kind === 'hire' && d.hiresLeft <= 0) return no('The most hires a month has been made.');
  const cap = Math.max(0, Number(d.cap) || 0);
  if (!cap) return no('No monthly budget is set for this.');
  const left = cap - (d.spent || 0);
  if (d.cost > left) return no(`It would pass the monthly budget (${Math.max(0, Math.round(left)).toLocaleString()} left of ${cap.toLocaleString()}).`);
  if (d.cost > d.spendLimit) return no(`It is above their spending limit of ${d.spendLimit.toLocaleString()}.`);
  if (!d.affordable) return no('The business\'s account cannot cover it.');
  if (!d.owner && d.cost > d.approvalAbove) return { verdict: 'queue', reason: `It is above the ${d.approvalAbove.toLocaleString()} they may spend without asking.` };
  return { verdict: 'execute', reason: '' };
}

/**
 * Arms: a part a staffed station uses is held at its works's dock at a par of `shiftHours` of continuous work.
 * stations: [{ in: { part: n per cycle }, minutes, staffed }]. Returns { part: par } for bought parts only.
 */
export function armsPar(stations, isPart, M) {
  const per = {};
  for (const s of stations) {
    if (!s.staffed || !(s.minutes > 0)) continue;
    for (const [id, n] of Object.entries(s.in)) if (isPart(id)) per[id] = (per[id] || 0) + (n * 60) / s.minutes;
  }
  const par = {};
  for (const [id, perHour] of Object.entries(per)) par[id] = Math.max(1, Math.ceil(perHour * M.shiftHours));
  return par;
}

/** Orders that bring the dock back to par when it (with what is on order) has fallen below `reorderAt` of it. One entry per part, sorted. */
export function planArmsOrders(par, held, price, M) {
  const out = [];
  for (const id of Object.keys(par).sort()) {
    const have = held[id] || 0;
    if (have >= par[id] * M.reorderAt) continue;
    const qty = Math.min(M.maxOrderQty, par[id] - have);
    if (qty > 0) out.push({ item: id, qty, cost: price(id) * qty });
  }
  return out;
}

/**
 * Who a manager would hire into a job: the job's own level first, then the best fit, ties by id. Offered the floor.
 * cands: [{ id, tier, floor, fit }] already limited to people who suit the job.
 */
export function hireChoice(cands, tier) {
  const own = cands.filter((c) => c.tier === tier);
  const pool = own.length ? own : cands;
  return [...pool].sort((a, b) => b.fit - a.fit || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] || null;
}
