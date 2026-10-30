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
  if (d.kind === 'bid' && !d.canContract) return no('They are not authorised to sign contracts.');
  if (d.kind === 'transfer' && !d.canTransfer) return no('They are not authorised to move cash between companies.');
  if (d.kind === 'expand' && !d.canExpand) return no('They are not authorised to expand the business.');
  if (!d.funded) return no('The business has no account of its own: fund it first.');
  if (d.hold && d.kind === 'expand') return no(d.hold);
  if (d.frozen && (d.kind === 'hire' || d.kind === 'bid' || d.kind === 'expand')) return no('The company is behind on a bank loan: no hiring, bidding or expanding until it is cleared.');
  if (!(d.cost > 0)) return no('There is nothing to spend.');
  if (d.kind === 'hire' && d.hiresLeft <= 0) return no('The most hires a month has been made.');
  const cap = Math.max(0, Number(d.cap) || 0);
  if (!cap) return no('No monthly budget is set for this.');
  const left = cap - (d.spent || 0);
  if (d.cost > left) return no(`It would pass the monthly budget (${Math.max(0, Math.round(left)).toLocaleString()} left of ${cap.toLocaleString()}).`);
  if (d.cost > d.spendLimit) return no(`It is above their spending limit of ${d.spendLimit.toLocaleString()}.`);
  if (!d.affordable) return no('The business\'s account cannot cover it.');
  if (!d.owner && d.ask) return { verdict: 'queue', reason: d.ask };
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

/** The first cell, row by row, where a w×h item fits on the floor with a ring of cells around it free of anything built. */
export function firstFreeCell(w, h, W, H, floor, taken) {
  for (let y = 0; y + h <= H; y++) {
    for (let x = 0; x + w <= W; x++) {
      let ok = true;
      for (let yy = y - 1; yy <= y + h && ok; yy++) {
        for (let xx = x - 1; xx <= x + w && ok; xx++) {
          const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
          if (inside) { if (!floor(xx, yy) || taken(xx, yy)) ok = false; } else if (taken(xx, yy)) ok = false;
        }
      }
      if (ok) return { x, y };
    }
  }
  return null;
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
