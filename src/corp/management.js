// Managers deciding for themselves (v0.63.0, simplified in v0.89.0). Pure functions — no game state, no DOM, no RNG.
//
//   judge(d)                    one decision, one answer: execute, queue for the owner, or refuse — with the reason
//   armsPar(stations, price)    what an arms works should hold of each bought part, and what it holds
//   planArmsOrders(...)         the orders that bring it back up
//   nextPlot / nextPort / bidPrice / treasuryMove     the fixed rules for expansion, bids and cash moves
//   autoCap / autoReserve / autoTreasury             the limits the game works out when you set none
//
// A decision is judged the same way when it is made and again when the owner approves it later.

/**
 * d: { kind, owner, ask, atWork, allowed, permitted, funded, frozen, hold, cost, cap, spent, affordable }
 * `cost` is what the decision commits. Order matters — the first failure is the reason. The monthly cap holds what a manager does on
 * their own; moving cash and expanding are not held to it (cash moves stay inside the group; expansion is your call). `owner: true` is
 * your own approval of something a manager asked about: everything else still holds.
 * Expansion is always asked about first; a bid below the margin is too (d.ask); the rest is done and reported.
 */
export function judge(d) {
  const no = (reason) => ({ verdict: 'refuse', reason });
  if (!d.atWork) return no('They are not at work and paid.');
  if (!d.allowed) return no('Their job does not make this kind of decision.');
  if (!d.permitted) return no('You have switched this off for them.');
  if (!d.funded) return no('The business has no account of its own: fund it first.');
  if (d.hold && d.kind === 'expand') return no(d.hold);
  if (d.frozen && (d.kind === 'bid' || d.kind === 'expand' || d.kind === 'research')) return no('The company is behind on a bank loan: no bidding, research or expanding until it is cleared.');
  if (!(d.cost > 0) && d.kind !== 'research') return no('There is nothing to spend.');
  if (d.kind !== 'transfer' && d.kind !== 'expand' && !d.owner) { // (expansion is only ever asked about, so the monthly limit is not what stops it: your answer is)
    const cap = Math.max(0, Number(d.cap) || 0);
    const left = cap - (d.spent || 0);
    if (d.cost > left) return no(`It would pass the monthly limit (${Math.max(0, Math.round(left)).toLocaleString()} left of ${cap.toLocaleString()}).`);
  }
  if (!d.affordable) return no('The business\'s account cannot cover it.');
  if (!d.owner && d.kind === 'expand') return { verdict: 'queue', reason: 'Expanding is always your call.' };
  if (!d.owner && d.ask) return { verdict: 'queue', reason: d.ask };
  return { verdict: 'execute', reason: '' };
}

/** The monthly limit when you set none: about a quarter of the company's cash, to the nearest thousand, never under 5,000. */
export const autoCap = (cash) => Math.max(5000, Math.round(Math.max(0, cash) * 0.25 / 1000) * 1000);

/** The cash a manager always leaves in the account: fifteen days of its wages and running costs, never under 1,000. */
export const autoReserve = (runningPerDay) => Math.max(1000, Math.round(Math.max(0, runningPerDay) * 15));

/** The band the group manager keeps a subsidiary's cash in: from a month of its running costs to four times that (never under 2,000 and 10,000). */
export function autoTreasury(runningPerDay) {
  const floor = Math.max(2000, Math.round((runningPerDay * 30) / 500) * 500);
  return { floor, ceiling: Math.max(10000, floor * 4) };
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

// ------------------------------------------------------------------ bids and expansion (v0.64.0)

/** Tiles between two rectangles { x, y, w, h }: 0 where they touch or overlap. */
export function rectGap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.max(dx, dy);
}

/** The cheapest plot for sale next to one already owned (ties by id); nobody owns none, so a first plot is never chosen. */
export function nextPlot(plots, owned, maxGap) {
  const mine = plots.filter((p) => owned.includes(p.id));
  if (!mine.length) return null;
  return plots.filter((p) => !owned.includes(p.id) && mine.some((m) => rectGap(m.rect, p.rect) <= maxGap))
    .sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1))[0] || null;
}

/** The cheapest port for sale (ties by id). */
export function nextPort(ports, owned) {
  return ports.filter((p) => !owned.includes(p.id)).sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1))[0] || null;
}

/**
 * A bid: the price is the owner's minimum margin over the unit's cost (the floor), rounded up to 100.
 * Over the customer's ceiling it can only be bid at the ceiling — below the floor, which the owner must approve;
 * and never below cost. tender: { ceiling }, q: { cost } (per unit).
 */
export function bidPrice(cost, marginPct, ceiling) {
  const floor = Math.ceil((cost * (1 + marginPct / 100)) / 100) * 100;
  if (floor <= ceiling) return { price: floor, below: false };
  if (ceiling < cost) return { price: null, below: true, why: 'the customer\'s ceiling is below what it would cost' };
  return { price: ceiling, below: true };
}

// ------------------------------------------------------------------ treasury (v0.65.0)

/**
 * What a treasury decision would move for one subsidiary. policy: { floor, ceiling }, parentReserve: cash the parent keeps;
 * s: { cash, parentCash, arrears, minLiquidity, loans: [{ id, outstanding }], capital }. Returns null or
 * { kind: 'topup', amount } | { kind: 'sweep', steps: [{ loan, amount } | { capital: amount }], amount }.
 * Below the floor it is topped up from the parent (never below the parent's reserve); above the ceiling the surplus
 * repays what it owes the parent, then returns capital the parent put in — and nothing while it owes anyone else.
 */
export function treasuryMove(policy, parentReserve, s, minMove) {
  if (!policy) return null;
  if (s.cash < policy.floor) {
    const amount = Math.floor(Math.min(policy.floor - s.cash, s.parentCash - (parentReserve || 0)));
    return amount >= minMove ? { kind: 'topup', amount } : null;
  }
  const keep = Math.max(policy.ceiling, s.minLiquidity || 0);
  if (s.cash > keep && !(s.arrears > 0)) {
    let left = Math.floor(s.cash - keep);
    const steps = [];
    for (const l of [...s.loans].sort((a, b) => (a.id < b.id ? -1 : 1))) { const a = Math.min(l.outstanding, left); if (a > 0) { steps.push({ loan: l.id, amount: a }); left -= a; } }
    const c = Math.min(s.capital, left);
    if (c > 0) { steps.push({ capital: c }); left -= c; }
    const amount = Math.floor(steps.reduce((a, x) => a + (x.amount ?? x.capital), 0));
    return amount >= minMove ? { kind: 'sweep', steps, amount } : null;
  }
  return null;
}
