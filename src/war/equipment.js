// What the company holds (v0.99.0): vehicles, helicopters and aircraft are RECORDS with ids (one location, one status, a remembered origin); guns, rounds, supplies and parts are
// COUNTS in `company.stock`, keyed by where they came from (`arms:<works>:<item>`, `supply:<id>`). Housing is real: a vehicle needs a bay in the motor pool, an aircraft or a helicopter
// a bay in the hangars, and stock a place in the stores. The consistency checker (src/war/check.js) reads all of it.
//
//   housing(game)                   { ground, air, stores }: places in total, used and free
//   addRecord(game, spec)           a new record, housed (or refused); the caller has already paid or moved the thing
//   stockOf(game, key) / addStock / takeStock
//   view(game)                      what the Equipment screen lists
import { ensureMilitary, peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { VEHICLES, SUPPLIES } from '../content/procurement.js';

export const nextId = (C, kind) => { C.next ||= {}; C.next[kind] = (C.next[kind] || 0) + 1; return `${kind}${C.next[kind]}`; };

/** A strategic missile product takes this many places in the stores (it is kept in the armoury or the depot, not a bay). */
export const MISSILE_STORES = 20;
const AIR = new Set(['helicopter', 'aircraft']);
export const isAir = (kind) => AIR.has(kind);
const storeFacility = (C) => (['armoury', 'depot', 'cage'].map((id) => C.facilities.find((f) => f.id === id && f.state === 'built')).find(Boolean) || {}).id;
const where = (kind, C) => (kind === 'missile' ? `facility:${storeFacility(C)}` : isAir(kind) ? 'facility:hangars' : 'facility:motor_pool');

export function housing(game) {
  const C = peekMilitary(game)?.company;
  const used = { ground: 0, air: 0 };
  let missiles = 0;
  for (const x of C?.equipment || []) if (x.status !== 'destroyed') { if (x.kind === 'missile') missiles++; else used[isAir(x.kind) ? 'air' : 'ground']++; }
  const stock = Object.values(C?.stock || {}).reduce((a, b) => a + b, 0) + missiles * MISSILE_STORES;
  const cap = { ground: capacity(game, 'motor_pool').bays, air: capacity(game, 'hangar').bays, stores: capacity(game).stores };
  return { ground: { total: cap.ground, used: used.ground, free: Math.max(0, cap.ground - used.ground) }, air: { total: cap.air, used: used.air, free: Math.max(0, cap.air - used.air) }, stores: { total: cap.stores, used: stock, free: Math.max(0, cap.stores - stock) } };
}

/** Whether there is room for one more of this kind of thing (`null` = yes, otherwise the reason). */
export function roomFor(game, kind, qty = 1) {
  const h = housing(game);
  if (kind === 'missile') return h.stores.free >= MISSILE_STORES * qty ? null : `A strategic missile product takes ${MISSILE_STORES} places in the stores; ${h.stores.free} are free.`;
  if (kind === 'stock') return h.stores.free >= qty ? null : `The stores have room for ${h.stores.free} more${h.stores.total ? '' : ' (build the armoury cage)'}.`;
  const side = isAir(kind) ? h.air : h.ground;
  if (side.free >= qty) return null;
  return isAir(kind) ? `No free bay in the hangars (${side.used} of ${side.total}).` : `No free bay in the motor pool (${side.used} of ${side.total}).`;
}

export function addRecord(game, { kind, type, name, source, origin = null }) {
  const m = ensureMilitary(game);
  const C = m.company;
  const why = roomFor(game, kind);
  if (why) return { ok: false, text: why };
  const rec = { id: nextId(C, 'E'), kind, type, name, source, origin, location: where(kind, C), status: 'stored', assignedTo: null, day: game.clock.day };
  C.equipment.push(rec);
  return { ok: true, rec };
}

export const stockOf = (game, key) => peekMilitary(game)?.company?.stock?.[key] || 0;
export function addStock(game, key, qty) { const C = ensureMilitary(game).company; C.stock[key] = (C.stock[key] || 0) + qty; }
export function takeStock(game, key, qty) {
  const C = peekMilitary(game)?.company;
  if (!C || (C.stock[key] || 0) < qty) return false;
  C.stock[key] -= qty;
  if (C.stock[key] === 0) delete C.stock[key];
  return true;
}

/** The name of a stock key: `arms:aw1:item_rpg` (an Arms works item), `supply:plate`. */
export function stockName(game, key) {
  const [kind, a, b] = key.split(':');
  if (kind === 'supply') return SUPPLY_NAME(a);
  const item = game.content?.items?.[b];
  return `${item?.name || b}${a ? ` (from ${game.arms?.def?.(a)?.name || a})` : ''}`;
}
let SUPPLIES_CACHE = SUPPLIES;
function SUPPLY_NAME(id) { return SUPPLIES_CACHE?.[id]?.name || id; }

export const typeOf = (id) => VEHICLES[id] || null;
