// Production pipelines (v0.55.0): every aircraft, launch vehicle, strategic
// product and satellite is a persistent production unit that walks its line's
// stages (src/content/aerospace.js PIPELINES). Pure helpers — the simulation
// in src/systems/aerospace.js moves units; these say what a stage needs.

/** The stages of a product's line. */
export function stagesOf(C, product) {
  return C.pipelines[product.line];
}

/** Work days a stage takes at standard speed (0 for waits and events). */
export function stageDays(C, product, stage) {
  return Math.round(product.days * (stage.share || 0) * 1000) / 1000;
}

/** Materials (lots) a stage consumes for one unit: the product's lots of the stage's material groups. */
export function stageMaterials(product, stage) {
  const out = {};
  for (const m of stage.uses || []) if (product.bom[m]) out[m] = product.bom[m];
  return out;
}

/** The whole bill of materials still to be consumed from stage `from` on. */
export function remainingMaterials(C, product, from) {
  const out = {};
  const st = stagesOf(C, product);
  for (let i = from; i < st.length; i++) for (const [m, n] of Object.entries(stageMaterials(product, st[i]))) out[m] = (out[m] || 0) + n;
  return out;
}

/** Index of the stage with this id (or -1). */
export function stageIndex(C, product, id) {
  return stagesOf(C, product).findIndex((s) => s.id === id);
}

/** The last stage that occupies a bay (the unit leaves its bay after it). */
export function lastBayStage(C, product) {
  const st = stagesOf(C, product);
  let k = -1;
  st.forEach((s, i) => { if (s.bay) k = i; });
  return k;
}

/** Total work days still ahead of a unit (its current stage's remainder + later stages). */
export function workLeft(C, product, unit) {
  const st = stagesOf(C, product);
  let d = Math.max(0, (unit.need || 0) - (unit.work || 0));
  for (let i = unit.stage + 1; i < st.length; i++) d += stageDays(C, product, st[i]);
  return d;
}

/**
 * Chance an inspection fails: AERO.inspectionFailAtRequired when quality equals the
 * product's requirement, falling (to a floor of 3%) as quality exceeds it and
 * rising as it falls short; an engine test cell cuts it by a quarter (aircraft, rockets).
 */
export function failChance(C, product, quality, { engineCell = false } = {}) {
  const base = C.aero.inspectionFailAtRequired;
  const gap = quality - product.quality;
  let p = gap >= 0 ? base * Math.exp(-gap / 10) : Math.min(0.9, base + (-gap / 40));
  if (engineCell && ['aircraft', 'rocket'].includes(product.line)) p *= 0.75;
  return Math.max(0.03, Math.min(0.9, p));
}

/** Chance a launch fails (rocket quality above its requirement makes it safer; reusable vehicles a little safer still). */
export function launchFailChance(product, quality) {
  const gap = quality - product.quality;
  const p = 0.06 * Math.exp(-Math.max(0, gap) / 15) + Math.max(0, -gap) / 60;
  return Math.max(0.01, Math.min(0.5, p * (product.reusable ? 0.85 : 1)));
}

/** Chance a satellite fails commissioning (or commissions with reduced capability). */
export function commissionFailChance(product, quality) {
  const gap = quality - product.quality;
  return Math.max(0.02, Math.min(0.4, 0.08 * Math.exp(-Math.max(0, gap) / 14) + Math.max(0, -gap) / 70));
}

/**
 * Pre-roll everything random about a unit when it's created (kept with it,
 * so saving and reloading can't change an inspection, a launch or a
 * commissioning). rng: { next() }.
 */
export function rollUnit(rng) {
  return { inspect: [rng.next(), rng.next(), rng.next(), rng.next()], launch: rng.next(), commission: rng.next(), partial: rng.next(), departure: rng.next(), weather: rng.next() };
}

/** A fresh unit record. */
export function newUnit(C, { id, company, contract, productId, n, purpose = 'contract', rng, at }) {
  const product = C.products[productId];
  return {
    id, company, contract, product: productId, line: product.line, n, purpose,
    stage: 0, work: 0, need: 0, bay: null, status: 'queued', blocker: null,
    reserved: {}, cost: { materials: 0, freight: 0 }, inspections: [], rework: 0,
    rolls: rollUnit(rng), created: at, started: null, finished: null, log: [],
  };
}
