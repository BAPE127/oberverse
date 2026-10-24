// Meridian's management (v0.55.0): what the rival decides each morning. It
// plays by the same rules as the player — the same tenders, suppliers, bays,
// research and books (src/systems/aerospace.js). It bids on what it can build
// in time at cost plus a markup that rises when it's busy; orders the
// materials its backlog needs from the cheapest supplier with stock; hires
// to crew its bays (technicians, engineers, inspectors); builds a bay of its busiest type when cash allows; and
// researches down its list. Nothing is free: every bid, lot and bay is paid for.
import { unitCost, baysFor } from './catalog.js';

/** Run the rival's morning. A: the Aerospace system; co: Meridian's company record. */
export function rivalMorning(A, co) {
  const M = A.cfg.aero.meridian;
  // 1. crew the bays it has (and the ones being built)
  const crew = A.crewNeeded(co, { all: true });
  if (co.workforce < crew) A.hire(co, crew - co.workforce);
  else if (co.workforce > crew * 1.15) A.layoff(co, Math.floor(co.workforce - crew * 1.05));
  // engineers and inspectors in proportion (a little over what's needed), and a training programme when it can afford one
  for (const role of ['engineer', 'inspector']) {
    const want = Math.ceil(A.staffNeeded(co, role) * 1.05);
    const have = A.staffCount(co, role);
    if (have < want) A.hire(co, want - have, role);
    else if (have > want * 1.3) A.layoff(co, Math.floor(have - want * 1.1), role);
  }
  A.setTraining(co, A.cash(co) > M.investAbove * 0.25 ? 'standard' : 'none');
  // 2. bid on open tenders it could deliver in time
  for (const t of A.openTenders()) {
    if (t.bids.some((b) => b.company === co.id)) continue;
    const bid = rivalBid(A, co, t);
    if (bid) A.placeBid(co.id, t.id, bid.unitPrice, bid.days);
  }
  // 3. materials for everything in hand
  A.autoProcure(co);
  // 4. invest when it can afford to
  const cash = A.cash(co);
  if (cash > M.investAbove) {
    const busy = busiestBayType(A, co);
    if (busy) A.buildBay(co, busy);
  }
  // 5. research, one project at a time
  // (only out of profits: the last fortnight must have been profitable, or it must be cash-rich)
  const fortnight = A.statement(co, 14).profit;
  if (!co.researching && (cash > M.investAbove || (fortnight > 0 && cash > M.investAbove * 0.5))) {
    const next = M.researchOrder.find((id) => !co.research.includes(id) && (A.cfg.research[id].requires || []).every((r) => co.research.includes(r)));
    if (next) A.startResearch(co, next);
  }
}

/** The bid Meridian would make on a tender, or null. */
export function rivalBid(A, co, t) {
  const C = A.cfg;
  const p = C.products[t.product];
  if (t.embargoed) return null;
  if (!A.canBuild(co, p) || (t.defence && !A.cleared(co))) return null;
  if (A.qualityOf(co) < t.quality) return null;
  const M = C.aero.meridian;
  const est = unitCost(C, p, { materialMult: A.materialMultiplier(co), freightShare: 0.08, speed: A.speedOf(co), failChance: 0.15 });
  const launch = p.line === 'satellite' ? A.launchShare(p) : 0;
  const cost = est.total + launch;
  const days = A.deliveryEstimate(co, p, t.qty);
  if (days > t.days || days > M.maxQueueDays + p.days * t.qty) return null;
  const util = A.utilisation(co, p);
  const cu = C.customers[t.customer];
  const [lo, hi] = M.markup;
  const markup = lo + (hi - lo) * Math.min(1, util) - 0.08 * (cu.priority.price - 0.3);
  const unitPrice = Math.min(t.ceiling, Math.round((cost * markup) / 100) * 100);
  if (unitPrice < cost * 1.05) return null;
  return { unitPrice, days };
}

/** The bay type Meridian is most short of (load per bay above 85%), or null. */
function busiestBayType(A, co) {
  let best = null;
  let load = 0.85;
  for (const type of Object.keys(A.cfg.bays)) {
    const n = co.bays.filter((b) => b.type === type).length;
    if (!n) continue;
    const queued = Object.values(A.state.units).filter((u) => u.company === co.id && !u.finished && baysFor(A.cfg, A.cfg.products[u.product])[0] === type).length;
    const l = queued / n;
    if (l > load) { load = l; best = type; }
  }
  return best;
}
