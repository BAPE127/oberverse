// What a soldier carries (v0.100.0 stage 7): a weapon (by the class's tier), a gadget, and armour (era 1 or 2). Everything comes from the stores, one item to one pair of hands: a weapon in a
// soldier's hand is not in the stores, and a weapon is never in two hands. Items keep their origin in the stock key (`arms:<works>:<item>`) so a return goes where it came from.
//
//   equip(game, pid)            take the weapon and gadget for the class's tier from the stores (swapping the old one back first)
//   equipClass(game, role)      everyone of a class: how many were equipped and how many are still short of stock
//   setTier(game, role, tier)   the tier for a whole class (re-equips them, from the stores); a person may be set apart with `tierOf`
//   setArmour(game, pid, era)   era 1 (the uniform they were issued) or era 2 (a plate carrier from the stores)
//   release(game, person)       everything they hold goes back to the stores (a person let go, or a squad stood down)
//   carried(game)               a count of what is in hands, by stock key (for the conservation tests)
import { peekMilitary } from './state.js';
import { addStock, takeStock } from './equipment.js';
import { CLASSES, ARMOUR } from '../content/troops.js';

export const tierOf = (C, p) => p.tier ?? C.tiers?.[p.role] ?? 1;
/** The best item a class has at or below a tier. */
export function itemFor(role, tier) {
  const T = CLASSES[role]?.tiers || {};
  for (let t = tier; t >= 1; t--) if (T[t]) return T[t];
  return null;
}
/** The stock keys that hold an item, in a steady order (`arms:aw1:item_smg`). A key for a supply is itself. */
const keysFor = (C, item) => (item.startsWith('supply:') ? [item] : Object.keys(C.stock).filter((k) => k.endsWith(`:${item}`) && k.startsWith('arms:')).sort());
const have = (C, item) => keysFor(C, item).reduce((a, k) => a + (C.stock[k] || 0), 0);
/** How many of an item (a weapon, or a supply key) the stores hold. */
export const inStores = (game, item) => have(peekMilitary(game).company, item);
const itemOfKey = (key) => (key.startsWith('supply:') ? key : key.split(':')[2]);

function takeOne(game, C, item) {
  const key = keysFor(C, item).find((k) => (C.stock[k] || 0) > 0);
  if (!key) return null;
  takeStock(game, key, 1);
  return key;
}

function give(game, p) {
  for (const slot of ['weapon', 'gadget']) if (p[slot]) { addStock(game, p[slot], 1); p[slot] = null; }
}
export function release(game, p) {
  give(game, p);
  if (p.armour === 2) { addStock(game, ARMOUR[2].supply, 1); p.armour = 1; }
}

/** What this person is missing for their class and tier: the items, in order. */
export function wanted(C, p) {
  const K = CLASSES[p.role];
  if (!K) return [];
  const w = itemFor(p.role, tierOf(C, p));
  return [w && { slot: 'weapon', item: w }, K.gadget && { slot: 'gadget', item: K.gadget }].filter(Boolean);
}

export function equip(game, pid) {
  const C = peekMilitary(game)?.company;
  const p = C?.personnel.find((x) => x.id === pid);
  if (!p) return { ok: false, text: 'No such person.' };
  if (p.status === 'dead' || p.status === 'captured') return { ok: false, text: `${p.name} cannot be equipped.` };
  const want = wanted(C, p);
  if (!want.length) return { ok: true, text: `${p.name} carries nothing in this job.`, short: 0 };
  // work out everything first: what is already right stays, what is wrong goes back, what is missing must be in the stores
  const need = [];
  for (const { slot, item } of want) {
    if (p[slot] && itemOfKey(p[slot]) === item) continue;
    need.push({ slot, item });
  }
  const counts = {};
  for (const n of need) counts[n.item] = (counts[n.item] || 0) + 1;
  const short = Object.entries(counts).filter(([item, q]) => have(C, item) < q).map(([item]) => item);
  if (short.length) return { ok: false, text: `${p.name} has to wait: the stores have no ${short.map((i) => nameOf(game, i)).join(' or ')}.`, short: short.length };
  for (const { slot, item } of need) {
    if (p[slot]) addStock(game, p[slot], 1);
    p[slot] = takeOne(game, C, item);
  }
  return { ok: true, text: `${p.name} is equipped.`, short: 0 };
}

const nameOf = (game, item) => (item.startsWith('supply:') ? item.slice(7) : game.content.items[item]?.name || item);

export function equipClass(game, role) {
  const C = peekMilitary(game)?.company;
  if (!C || !CLASSES[role]) return { ok: false, text: 'No such class.' };
  const people = C.personnel.filter((p) => p.role === role && p.status !== 'dead');
  let done = 0; let short = 0;
  for (const p of people) { const r = equip(game, p.id); if (r.ok) done++; else short++; }
  return { ok: true, equipped: done, short, text: `${CLASSES[role].name}: ${done} equipped${short ? `, ${short} waiting for stock` : ''}.` };
}

export function setTier(game, role, tier) {
  const C = peekMilitary(game)?.company;
  const K = CLASSES[role];
  if (!C || !K) return { ok: false, text: 'No such class.' };
  tier = Math.floor(Number(tier) || 0);
  if (!K.tiers[tier]) return { ok: false, text: `${K.name} has no tier ${tier} yet: tiers 3 to 5 are future research.` };
  C.tiers ||= {};
  C.tiers[role] = tier;
  const r = equipClass(game, role);
  return { ok: true, text: `${K.name}: tier ${tier}. ${r.text}` };
}

export function setArmour(game, pid, era) {
  const C = peekMilitary(game)?.company;
  const p = C?.personnel.find((x) => x.id === pid);
  if (!p) return { ok: false, text: 'No such person.' };
  if (CLASSES[p.role]?.group !== 'troop') return { ok: false, text: `${p.name} wears no armour.` };
  if (!ARMOUR[era]) return { ok: false, text: 'Armour eras 3 and 4 are future research.' };
  if ((p.armour || 1) === era) return { ok: false, text: `${p.name} already wears that.` };
  if (era === 2) { if (!takeStock(game, ARMOUR[2].supply, 1)) return { ok: false, text: 'There is no plate carrier in the stores: buy one from the suppliers.' }; }
  else addStock(game, ARMOUR[2].supply, 1);
  p.armour = era;
  return { ok: true, text: `${p.name} wears the ${ARMOUR[era].name.toLowerCase()}.` };
}

export function carried(game) {
  const C = peekMilitary(game)?.company;
  const out = {};
  for (const p of C?.personnel || []) for (const slot of ['weapon', 'gadget']) if (p[slot]) out[p[slot]] = (out[p[slot]] || 0) + 1;
  return out;
}
