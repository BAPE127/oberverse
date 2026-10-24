// Tenders and bids (v0.55.0). Customers post tenders out of finite budgets;
// both companies may bid; when the tender closes the customer compares the
// valid bids by its own priorities (price, delivery, quality, reputation) and
// awards one contract — or lets it lapse. Pure functions; the simulation
// (src/systems/aerospace.js) stores tenders and turns awards into contracts.
import { quantityError } from './catalog.js';
import { configure, pickConfig } from './config.js';

/** Quantity for a tender: aircraft 1–5 (never more), others by product. */
export function tenderQty(C, product, rng) {
  const r = rng.next();
  if (product.line === 'aircraft') {
    const top = product.price > 1500000 ? 2 : product.price > 500000 ? 3 : product.price > 150000 ? 4 : C.aero.maxAircraftPerContract;
    return Math.min(C.aero.maxAircraftPerContract, 1 + Math.floor(r * r * top));
  }
  if (product.line === 'rocket') return 1 + Math.floor(r * r * 3);
  if (product.line === 'missile') return 1 + Math.floor(r * 3);
  // satellites: small constellations are common for comms and navigation
  const many = ['comms', 'nav', 'earthobs'].includes(product.role);
  return 1 + Math.floor(r * (many ? 5 : 2));
}

/** The cheapest launch vehicle that can lift a satellite (its share of the launch is part of a delivered-on-orbit price). */
export function launchAllowance(C, product) {
  if (product.line !== 'satellite') return 0;
  const rockets = Object.values(C.products).filter((p) => p.line === 'rocket' && !p.crew && p.lift >= product.mass).sort((a, b) => a.price / a.lift - b.price / b.lift);
  const r = rockets[0];
  return r ? Math.round((r.price * product.mass) / r.lift) : 0;
}

/** The days a customer allows for delivery of `qty` units. */
export function allowedDays(product, qty, rng) {
  return Math.ceil(product.days * (1 + 0.6 * (qty - 1)) + 5 + rng.next() * 5 + (product.line === 'satellite' ? 4 : 0) + (product.line === 'rocket' ? 3 : 0));
}

/**
 * Make a tender for a customer, or null if it can't afford one now. state:
 * the customer's live record ({ budget }). The customer's budget is
 * committed for the tender's ceiling and given back by the award or lapse.
 */
export function makeTender(C, rng, { id, customerId, state, day, embargoed = false, force = null }) {
  const cu = C.customers[customerId];
  const wants = Object.entries(cu.wants).filter(([pid]) => C.products[pid]);
  const total = wants.reduce((a, [, w]) => a + w, 0);
  let r = rng.next() * total;
  let pid = wants[0][0];
  for (const [p, w] of wants) { r -= w; if (r <= 0) { pid = p; break; } }
  if (force?.product) pid = force.product; // an event's tender names what it wants (v0.57.0)
  const base = C.products[pid];
  // v0.57.0: what the customer wants the product to be (fixed by the tender's id and its habits — no dice, so the rest is as it was)
  const config = pickConfig(C, base, cu, pid, id);
  const product = configure(C, base, config, pid);
  let qty = force?.qty ?? tenderQty(C, base, rng);
  const unit = Math.round((product.price + launchAllowance(C, product)) * (0.97 + rng.next() * 0.14) / 100) * 100;
  while (qty > 1 && unit * qty > state.budget) qty--;
  if (unit * qty > state.budget || quantityError(C.aero, base, qty)) return null;
  const pickiness = cu.priority.quality;
  return {
    id, customer: customerId, product: pid, ...(Object.keys(config).length ? { config } : {}), qty, ceiling: unit,
    days: allowedDays(product, qty, rng),
    quality: Math.round(product.quality + pickiness * 10 * rng.next()), // (the configured product's: an option can ask for more)
    deposit: cu.kind === 'government' || cu.kind === 'defence' || cu.kind === 'agency' ? 0.3 : 0.2,
    posted: day, closes: day + C.aero.tenderDays, status: 'open', bids: [], embargoed, defence: cu.kind === 'defence',
  };
}

/** Why a bid isn't valid (or null). bidder: { quality, reputation, cleared, canBuild }. */
export function bidError(C, tender, bid, bidder) {
  if (tender.status !== 'open') return 'the tender has closed';
  if (tender.embargoed) return 'the buyer is under an international embargo: no lawful supplier may bid';
  if (!(bid.unitPrice > 0)) return 'no price';
  if (bid.unitPrice > tender.ceiling) return `the price is over the customer's ceiling (${tender.ceiling.toLocaleString()} a unit)`;
  if (!(bid.days > 0) || bid.days > tender.days) return `delivery must be within ${tender.days} days`;
  if (bidder.quality < tender.quality) return `the customer requires quality ${tender.quality} (yours: ${Math.round(bidder.quality)})`;
  if (tender.defence && !bidder.cleared) return 'defence work needs a secure hall and security clearance';
  if (tender.minReputation && bidder.reputation < tender.minReputation) return `this customer wants a supplier with a reputation of ${tender.minReputation}+ (yours: ${Math.round(bidder.reputation)})`;
  if (!bidder.canBuild) return bidder.missing?.length ? `it needs research you don't have yet: ${bidder.missing.join(', ')}` : 'you can\'t build this product (research or a suitable bay)';
  const err = quantityError(C.aero, C.products[tender.product], tender.qty);
  if (err) return err;
  return null;
}

/**
 * Score the valid bids on a tender by the customer's priorities; best first.
 * Each score is relative to the best bid on that criterion. bidders: id → { quality, reputation }.
 */
export function rankBids(C, tender, bidders) {
  const cu = C.customers[tender.customer];
  const w = cu.priority;
  const bids = tender.bids.filter((b) => b.valid);
  if (!bids.length) return [];
  const minPrice = Math.min(...bids.map((b) => b.unitPrice));
  const minDays = Math.min(...bids.map((b) => b.days));
  const maxQ = Math.max(...bids.map((b) => bidders[b.company].quality));
  const maxR = Math.max(1, ...bids.map((b) => bidders[b.company].reputation));
  return bids.map((b) => {
    const q = bidders[b.company];
    const parts = { price: minPrice / b.unitPrice, time: minDays / b.days, quality: q.quality / maxQ, reputation: q.reputation / maxR };
    const score = w.price * parts.price + w.time * parts.time + w.quality * parts.quality + w.reputation * parts.reputation;
    return { ...b, parts, score: Math.round(score * 1000) / 1000 };
  }).sort((a, b) => b.score - a.score || a.at - b.at);
}
