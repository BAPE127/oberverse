// The aerospace catalogue's rules (v0.55.0): pure functions over the content in
// src/content/aerospace.js. No game state, no DOM — the simulation
// (src/systems/aerospace.js), the terminal and the tests all use these.

/** Owner's rule: an aircraft contract is for 1–5 aircraft. Rockets, missiles and satellites aren't capped here. */
export function quantityError(A, product, qty) {
  if (!product) return 'no such product';
  if (!Number.isInteger(qty) || qty < 1) return 'a contract is for at least one unit';
  if (product.line === 'aircraft' && qty > A.maxAircraftPerContract) return `an aircraft contract may be for at most ${A.maxAircraftPerContract} aircraft (this is for ${qty})`;
  if (product.line !== 'aircraft' && qty > 12) return `at most 12 units per contract (this is for ${qty})`;
  return null;
}

/** The research a company still needs for a product (empty when it can build it). */
export function missingTech(C, company, product) {
  const out = [];
  const seen = new Set();
  const need = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (!company.research.includes(id)) out.push(id);
  };
  need(product.tech);
  return out;
}

/** Bay types able to build a product (its own type; a secure hall can also do non-military aircraft of its size). */
export function baysFor(C, product) {
  const own = C.bays[product.bay];
  const out = [product.bay];
  if (product.line === 'aircraft' && product.bay !== 'secure' && C.bays.secure.size >= own.size) out.push('secure');
  if (product.line === 'aircraft' && product.bay === 'light') out.push('heavy');
  if (product.line === 'aircraft' && ['light', 'heavy'].includes(product.bay)) out.push('wide');
  return [...new Set(out)];
}

/** Cargo units a unit's materials take. */
export function bomVolume(C, product) {
  return Object.entries(product.bom).reduce((a, [m, n]) => a + n * (C.materials[m]?.volume || 1), 0);
}

/** The materials' value at reference prices. */
export function bomValue(C, product) {
  return Object.entries(product.bom).reduce((a, [m, n]) => a + n * C.materials[m].price, 0);
}

/** Daily cost of running a bay: its crew's wages plus its upkeep. */
export function bayDayCost(C, bayType) {
  const b = C.bays[bayType];
  return b.crew * C.aero.wage + b.upkeep;
}

/**
 * What one unit costs to build, roughly (shown to the player before bidding,
 * used by the rival to price its bids): materials at reference prices ×
 * `materialMult`, freight at `freightShare` of their value, the bay-days at
 * `speed`, inspection rework expected at `failChance`, launch costs.
 */
export function unitCost(C, product, { materialMult = 1, freightShare = 0.07, speed = 1, failChance = 0.2, launchMult = 1 } = {}) {
  const materials = Math.round(bomValue(C, product) * materialMult);
  const freight = Math.round(materials * freightShare);
  const days = product.days / Math.max(0.2, speed);
  const labour = Math.round(days * bayDayCost(C, product.bay));
  const rework = Math.round(failChance * C.aero.reworkShare * labour);
  const launch = product.line === 'rocket' ? Math.round((product.launchCost || 0) * launchMult) : 0;
  const total = materials + freight + labour + rework + launch;
  return { materials, freight, labour, rework, launch, total, days, margin: product.price - total, marginShare: (product.price - total) / product.price };
}

/** Apron slots an aircraft takes (0 for anything else). */
export function apronSize(product) {
  return product.line === 'aircraft' ? product.apron || 1 : 0;
}

/** A launch vehicle can carry a satellite when its lift class is at least the satellite's mass class. */
export function canLift(rocket, satellite) {
  return rocket?.line === 'rocket' && satellite?.line === 'satellite' && rocket.lift >= satellite.mass;
}

/** Products in a class/line, cheapest first. */
export function productsOf(C, pred) {
  return Object.entries(C.products).filter(([, p]) => pred(p)).sort((a, b) => a[1].price - b[1].price).map(([id]) => id);
}

/** A tidy price: 3 significant figures. */
export function tidy(n) {
  if (n <= 0) return 0;
  const k = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 2);
  return Math.round(n / k) * k;
}

/** Days → "3 d 4 h". */
export function fmtDays(d) {
  if (d <= 0) return 'now';
  let dd = Math.floor(d);
  let hh = Math.round((d - dd) * 24);
  if (hh === 24) { dd += 1; hh = 0; }
  return dd ? `${dd} d${hh ? ` ${hh} h` : ''}` : `${hh} h`;
}

/** Big numbers for the terminal: 1,250,000 → "1.25M". */
export function fmtMoney(n) {
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${s}${Math.round(a / 1000)}k`;
  return `${s}${Math.round(a).toLocaleString()}`;
}
