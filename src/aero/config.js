// Product configuration (v0.57.0). Pure functions over the content in src/content/aerospace.js
// (OPTIONS): no game state, no DOM — the simulation, the terminal, the rival and the tests all
// use these. A configuration is a small object { group: choice } holding only what differs from
// the standard product; `configure` turns a product and a configuration into the product as it
// would really be built — its bill of materials, days, price, quality, flight spec and effects —
// and that is the one thing every other calculation reads.
//
//   optionGroupsOf(C, product)   which option groups a product offers
//   configError(C, product, cfg) why a configuration isn't valid (or null)
//   configure(C, product, cfg)   the configured product (the product itself for the standard one)
//   pickConfig(C, product, …)    the configuration a customer asks for (from its kind, by a hash, never the RNG)
//   configLabel(C, product, cfg) the options in words
//   optionEffect(C, product, g, choice)  what one option does to a product, for the terminal
import { bomValue, bayDayCost } from './catalog.js';
import { stagesOf } from './pipeline.js';

/** A stable number in [0, 1) from a string (FNV-1a), so a tender's wishes are fixed by what it is, not by the dice. */
export function hashUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000003) / 1000003;
}

/** Groups a product offers: by its id, else its class, else its line. */
export function optionGroupsOf(C, product, productId = null) {
  const O = C.options;
  if (!O) return [];
  const id = productId || Object.keys(C.products).find((k) => C.products[k] === product);
  return (id && O.byProduct[id]) || O.byClass[product.cls] || O.byLine[product.line] || [];
}

/** Only what differs from standard, in a stable order. */
export function cleanConfig(config) {
  const out = {};
  for (const k of Object.keys(config || {}).sort()) if (config[k] && config[k] !== 'standard') out[k] = config[k];
  return out;
}

export const configKey = (config) => Object.entries(cleanConfig(config)).map(([g, c]) => `${g}=${c}`).join(';');

/** Why a configuration can't be made for this product (or null). */
export function configError(C, product, config, productId = null) {
  const groups = optionGroupsOf(C, product, productId);
  for (const [g, choice] of Object.entries(cleanConfig(config))) {
    if (!groups.includes(g)) return `this product has no "${g}" option`;
    if (!C.options.groups[g]?.choices[choice]) return `there is no "${choice}" choice for ${C.options.groups[g]?.name || g}`;
  }
  return null;
}

/** The materials a product's line really consumes, stage by stage (an option may only add these). */
function usedMaterials(C, product) {
  const out = new Set();
  for (const s of stagesOf(C, product)) for (const m of s.uses || []) out.add(m);
  return out;
}

const scaleNumbers = (obj, mult) => (obj ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? v * mult : v])) : obj);

/**
 * The product as built with this configuration. Each option adds materials (its `cost` share of
 * the product's own materials, spread over the materials it lists that the line really uses; at
 * least one lot), adds build days, and raises the price by what it costs the builder times its
 * markup — so an option is worth having for the customer and for the builder, and never free.
 */
export function configure(C, product, config, productId = null) {
  const cfg = cleanConfig(config);
  const keys = Object.keys(cfg);
  if (!keys.length) return product;
  const id = productId || Object.keys(C.products).find((k) => C.products[k] === product);
  const used = usedMaterials(C, product);
  const baseValue = bomValue(C, product);
  const dayCost = bayDayCost(C, product.bay);
  const bom = { ...product.bom };
  let extraMaterials = 0;
  let extraDays = 0;
  let premium = 0;
  let quality = product.quality;
  const needs = [...(product.needs || [])];
  const effects = {};
  const tags = [...(product.tags || [])];
  let spec = product.spec ? { ...product.spec } : undefined;
  for (const g of keys) {
    const opt = C.options.groups[g]?.choices[cfg[g]];
    if (!opt) continue;
    // the extra materials: whole lots, going round the listed materials that still fit in what's left to spend
    // (at least one lot — the cheapest — however small the product)
    const pool = opt.into.filter((m) => used.has(m));
    let remaining = baseValue * opt.cost;
    let added = 0;
    for (let n = 0; n < 80 && pool.length; n++) {
      const fit = pool.filter((m) => C.materials[m].price <= remaining * 1.25);
      let m;
      if (fit.length) m = fit[n % fit.length];
      else if (added === 0) m = [...pool].sort((x, y) => C.materials[x].price - C.materials[y].price)[0];
      else break;
      bom[m] = (bom[m] || 0) + 1;
      remaining -= C.materials[m].price;
      added += C.materials[m].price;
      if (remaining <= 0) break;
    }
    const days = product.days * (opt.days || 0);
    extraMaterials += added;
    extraDays += days;
    premium += (added * 1.07 + days * dayCost) * (opt.markup || 1.5);
    quality += opt.quality || 0;
    if (opt.needs && !needs.includes(opt.needs)) needs.push(opt.needs);
    for (const [k, v] of Object.entries(opt.effects || {})) effects[k] = (effects[k] ?? 1) * v;
    for (const t of opt.tags || []) if (!tags.includes(t)) tags.push(t);
    if (spec && opt.spec) for (const [k, mult] of Object.entries(opt.spec)) if (typeof spec[k] === 'number' && spec[k] > 0) spec[k] = Math.round(spec[k] * mult * 100) / 100;
  }
  const out = {
    ...product,
    bom,
    days: Math.round((product.days + extraDays) * 100) / 100,
    price: Math.round((product.price + premium) / 100) * 100,
    quality,
    needs,
    tags,
    effects,
    spec,
    config: cfg,
    configKey: configKey(cfg),
    extra: { materials: extraMaterials, days: Math.round(extraDays * 100) / 100, price: Math.round((product.price + premium) / 100) * 100 - product.price },
  };
  if (effects.life && product.life) out.life = Math.round(product.life * effects.life);
  if (effects.service && product.service) out.service = scaleNumbers(product.service, effects.service);
  void id;
  return out;
}

/** What one option does to a product by itself (for showing the choice before it's made). */
export function optionEffect(C, product, group, choice, productId = null) {
  const P = configure(C, product, { [group]: choice }, productId);
  return { price: P.price - product.price, days: Math.round((P.days - product.days) * 100) / 100, quality: P.quality - product.quality, needs: (P.needs || []).filter((n) => !(product.needs || []).includes(n)), materials: P.extra?.materials || 0, effects: P.effects || {}, spec: P.spec, base: product.spec };
}

/** The configuration a customer asks for in a tender: by its kind's habits, fixed by `key` (the tender's id). */
export function pickConfig(C, product, customer, productId, key) {
  const demand = C.options?.demand?.[customer.kind] || {};
  const out = {};
  for (const g of optionGroupsOf(C, product, productId)) {
    const probs = demand[g];
    if (!probs) continue;
    const r = hashUnit(`${key}|${productId}|${g}`);
    let acc = 0;
    for (const [choice, p] of Object.entries(probs)) {
      acc += p;
      if (r < acc) { out[g] = choice; break; }
    }
  }
  return out;
}

/** The options in words ("High-density cabin · Extended-range tanks"), or "Standard". */
export function configLabel(C, product, config) {
  const parts = Object.entries(cleanConfig(config)).map(([g, c]) => C.options.groups[g]?.choices[c]?.name).filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Standard';
}
