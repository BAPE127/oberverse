// Procurement (v0.103.4): buying from outside suppliers, as a cart that becomes an order with a delivery day. It is separate from internal logistics (transfers.js), which moves the player's own
// goods free and never touches the supplier system. The rules:
//   one payment    the whole cart is paid once, from the company's own account, or nothing happens (no negative balance, no part-orders)
//   one order each a cart with several suppliers becomes one order per supplier, each with its own delivery day
//   no duplicates  a cart carries a token; placing the same cart twice is refused
//   delivery       on the due day (06:11) the goods arrive: supplies and weapons into the stores, vehicles into free bays; a vehicle with no bay waits at the gate, neither lost nor doubled
//   nothing early  until then the goods are in no inventory at all
// Reads `company.orders` (persisted) and the company's stock and equipment through equipment.js.
import { peekMilitary } from './state.js';
import { addRecord, addStock, roomFor, nextId } from './equipment.js';
import { pay } from './company.js';
import { unitPrice } from './link.js';
import { VEHICLES, SUPPLIES, ARMS_TRANSFERABLE } from '../content/procurement.js';
import { SUPPLIERS } from '../content/suppliers.js';
import { FUTURE_WEAPONS } from '../content/futureArms.js';
import { weaponTierOpen, armourEraOpen, vehicleEraOpen } from './research.js';

export const CATEGORIES = {
  smallarms: 'Small arms', ammo: 'Ammunition', heavy: 'Heavy weapons', missiles: 'Missiles', drones: 'Drones', energy: 'Energy weapons (researched)', carriers: 'Armoured carriers', recon: 'Recon vehicles', artillery: 'Artillery', antiair: 'Anti-air',
  logistics: 'Logistics vehicles', medicalveh: 'Medical and engineer vehicles', fuel: 'Fuel', uniforms: 'Uniforms and armour', medical: 'Medical supplies', comms: 'Communications', general: 'General supplies', parts: 'Construction and engineering parts',
};
const ARMS_CAT = { item_pistol: 'smallarms', item_smg: 'smallarms', item_shotgun: 'smallarms', item_assault_rifle: 'smallarms', item_sniper_rifle: 'smallarms', item_lmg: 'smallarms', item_rpg: 'heavy', item_rpg_rocket: 'ammo', item_artillery_shell: 'ammo', item_breach_charge: 'heavy', item_missile_guided: 'missiles', item_missile_cruise: 'missiles', item_drone_attack: 'drones', item_drone_strike: 'drones' };
const SUPPLY_CAT = { uniform: 'uniforms', plate_carrier: 'uniforms', hardsuit: 'uniforms', power_armour: 'uniforms', radio: 'comms', medicine: 'medical', rations: 'general', spares: 'general', fuel: 'fuel', plate: 'parts', engine: 'parts', optics: 'parts', rotor: 'parts', avionics: 'parts', hardpoint: 'parts', core: 'parts' };
const VEH_CAT = { carrier: 'carriers', recon: 'recon', artillery: 'artillery', antiair: 'antiair', logistics: 'logistics', medical: 'medicalveh' };
const LOG_KEEP = 60;
const company = (g) => peekMilitary(g)?.company || null;

/** Every item the game lets the company buy, with its base price, category and what it becomes on delivery. */
export function catalogue(game) {
  const out = [];
  for (const id of ARMS_TRANSFERABLE) { const it = game.content.items[id]; if (it) out.push({ id: `arms:${id}`, item: id, name: it.name, cat: ARMS_CAT[id] || 'heavy', kind: 'stock', key: `arms:bought:${id}`, base: unitPrice(game, id), text: it.description || it.desc || 'Bought from a manufacturer: it goes into the stores.' }); }
  // v0.103.8: the future weapons are for sale only once the company has researched their tier
  for (const w of Object.values(FUTURE_WEAPONS)) if (weaponTierOpen(game, w.tier)) out.push({ id: `arms:${w.id}`, item: w.id, name: w.name, cat: 'energy', kind: 'stock', key: `arms:bought:${w.id}`, base: unitPrice(game, w.id), text: `Tier ${w.tier}. ${w.text}` });
  for (const [id, S] of Object.entries(SUPPLIES)) if (!S.tech || (S.tech.armourEra ? armourEraOpen(game, S.tech.armourEra) : true) && (S.tech.vehicleEra ? vehicleEraOpen(game, S.tech.vehicleEra) : true)) out.push({ id: `supply:${id}`, item: id, name: S.name, cat: SUPPLY_CAT[id] || 'general', kind: 'stock', key: `supply:${id}`, base: S.price, text: S.text });
  for (const V of Object.values(VEHICLES)) if (V.source === 'bought' && (V.era <= 2 || vehicleEraOpen(game, V.era))) out.push({ id: `vehicle:${V.id}`, item: V.id, name: V.name, cat: VEH_CAT[V.class] || 'carriers', kind: 'vehicle', base: V.price, text: V.text, bars: { armour: V.armour, firepower: V.firepower, speed: V.speed, capacity: V.capacity } });
  return out;
}

/** What each supplier sells: the catalogue items of its categories, at its price and delivery time. */
export function market(game) {
  const cat = catalogue(game);
  return Object.values(SUPPLIERS).map((S) => ({ ...S, items: cat.filter((c) => S.cats.includes(c.cat)).map((c) => ({ ...c, supplier: S.id, price: Math.max(1, Math.round(c.base * S.mult)), days: S.days, max: c.kind === 'vehicle' ? Math.min(S.max, 20) : S.max })) }));
}
const find = (game, supplierId, id) => market(game).find((s) => s.id === supplierId)?.items.find((i) => i.id === id) || null;

/** Price a cart: `lines` are { supplier, id, qty }. Returns the checked lines (grouped by supplier) and what is wrong, if anything. */
export function quote(game, lines) {
  const bad = []; const ok = [];
  for (const l of lines || []) {
    const it = find(game, l.supplier, l.id); const qty = Math.floor(Number(l.qty) || 0);
    if (!it) { bad.push(`${l.id}: that supplier does not sell it.`); continue; }
    if (qty < 1) { bad.push(`${it.name}: order at least one.`); continue; }
    if (qty > it.max) { bad.push(`${it.name}: ${SUPPLIERS[l.supplier].name} ships at most ${it.max} in one order.`); continue; }
    const prev = ok.find((x) => x.supplier === l.supplier && x.id === l.id);
    if (prev) { prev.qty += qty; prev.total = prev.qty * prev.price; if (prev.qty > it.max) bad.push(`${it.name}: ${SUPPLIERS[l.supplier].name} ships at most ${it.max} in one order.`); continue; }
    ok.push({ supplier: l.supplier, supplierName: SUPPLIERS[l.supplier].name, id: it.id, item: it.item, name: it.name, kind: it.kind, key: it.key, qty, price: it.price, total: qty * it.price, days: it.days });
  }
  return { lines: ok, total: ok.reduce((a, x) => a + x.total, 0), bad, days: Math.max(0, ...ok.map((x) => x.days)) };
}

/** Pay for a cart and make its orders. `token` makes a repeated click harmless. */
export function place(game, lines, token = null) {
  const C = company(game); if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!C.licensed) return { ok: false, text: 'A private security company needs its licence before it can open accounts with suppliers.' };
  C.orders ||= []; C.orderTokens ||= [];
  if (token && C.orderTokens.includes(token)) return { ok: false, text: 'That order has already been placed.', duplicate: true };
  const q = quote(game, lines);
  if (q.bad.length) return { ok: false, text: q.bad[0] };
  if (!q.lines.length) return { ok: false, text: 'The cart is empty.' };
  const r = pay(game, q.total, 'Procurement', 'purchase');
  if (!r.ok) return r;
  if (token) { C.orderTokens.push(token); while (C.orderTokens.length > 30) C.orderTokens.shift(); }
  const day = game.clock.day; const made = [];
  for (const sid of [...new Set(q.lines.map((l) => l.supplier))]) {
    const ls = q.lines.filter((l) => l.supplier === sid);
    const o = { id: nextId(C, 'O'), supplier: sid, supplierName: SUPPLIERS[sid].name, lines: ls.map((l) => ({ id: l.id, item: l.item, name: l.name, kind: l.kind, key: l.key, qty: l.qty, left: l.qty, price: l.price })), total: ls.reduce((a, l) => a + l.total, 0), placed: day, due: day + SUPPLIERS[sid].days, state: 'transit', deliveredDay: null };
    C.orders.push(o); made.push(o);
  }
  trim(C);
  C.log.push({ day, text: `Ordered from ${made.map((o) => o.supplierName).join(', ')}: ${q.lines.reduce((a, l) => a + l.qty, 0)} items, ${q.total.toLocaleString('en-US')} obols.` });
  return { ok: true, text: `Ordered ${q.lines.reduce((a, l) => a + l.qty, 0)} items for ${q.total.toLocaleString('en-US')} obols; ${made.length === 1 ? `it arrives on day ${made[0].due}` : `${made.length} deliveries, the last on day ${Math.max(...made.map((o) => o.due))}`}.`, orders: made.map((o) => o.id), total: q.total };
}

function trim(C) {
  const done = C.orders.filter((o) => o.state === 'delivered');
  while (done.length > LOG_KEEP) { const old = done.shift(); C.orders = C.orders.filter((o) => o !== old); }
}

/** Deliver what is due: every morning, once a day. A vehicle with no free bay stays with its order (state `waiting`) and goes in on a later morning. */
export function dayTick(game) {
  const C = company(game); if (!C?.identity || !C.orders?.length) return;
  const day = game.clock.day;
  if ((C.days?.orders || 0) >= day) return; (C.days ||= {}).orders = day;
  for (const o of C.orders) {
    if (o.state === 'delivered' || o.due > day) continue;
    for (const l of o.lines) {
      if (l.left <= 0) continue;
      if (l.kind === 'stock') { addStock(game, l.key, l.left); l.left = 0; continue; }
      while (l.left > 0 && !roomFor(game, 'vehicle')) { const a = addRecord(game, { kind: 'vehicle', type: l.item, name: l.name, source: 'bought' }); if (!a.ok) break; l.left--; }
    }
    if (o.lines.every((l) => l.left <= 0)) { o.state = 'delivered'; o.deliveredDay = day; game.notify?.(`Order ${o.id} from ${o.supplierName} has arrived.`, 'good'); }
    else o.state = 'waiting';
  }
}

/** The orders as the terminal lists them. */
export function ordersView(game) {
  const C = company(game); const all = (C?.orders || []).slice().reverse();
  const day = game.clock.day;
  const row = (o) => ({ ...o, items: o.lines.reduce((a, l) => a + l.qty, 0), eta: Math.max(0, o.due - day), waitingFor: o.lines.filter((l) => l.left > 0).map((l) => `${l.left} × ${l.name}`) });
  return { pending: all.filter((o) => o.state === 'waiting').map(row), transit: all.filter((o) => o.state === 'transit').map(row), delivered: all.filter((o) => o.state === 'delivered').map(row), all: all.map(row) };
}
