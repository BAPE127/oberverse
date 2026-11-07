// The supply link between the Arms company and the war company (v0.103.2). The company keeps STANDING LEVELS of what the Arms works make (guns, rounds, rockets, shells, missiles, drones):
//   free        every morning each works ships what its export cage holds toward each level, at no charge. It is the same stock moving between your own companies: no sale, no entry, no money.
//   real stock  only what the cage actually holds moves (loose items, and crates opened for the purpose); a works that has made nothing ships nothing
//   dedicated   a works marked "makes for the company" retools its idle stations to the items the company is short of, and goes back to what they were making when the level is met
//   elsewhere   what the works cannot keep up with can be bought from other manufacturers at LINK.markup times the item's value, paid by the company from its own account, arriving in LINK.days days
// Reads and writes `company.link`, the company's stock (through equipment.js), the cages (through cage.js), and the Arms works' station settings (through game.arms.setRecipe).
import { peekMilitary } from './state.js';
import { addStock, nextId } from './equipment.js';
import { pay } from './company.js';
import { cageCount, cageTake } from './cage.js';
import { heldOf } from './reserve.js';
import { CRATE } from '../content/arms.js';
import { ARMS_TRANSFERABLE, LINK } from '../content/procurement.js';

const company = (game) => peekMilitary(game)?.company || null;
export function linkOf(C) {
  C.link ||= { want: {}, works: {}, inbound: [], flow: { since: 0, free: 0, bought: 0, spent: 0 }, log: [], day: 0 };
  return C.link;
}
const items = (game) => game.content.items;
const nameOf = (game, item) => items(game)[item]?.name || item;
const worksIds = (game) => (game.arms?.ownedIds?.() || []).slice().sort();
const cagesHold = (game, item) => worksIds(game).reduce((a, w) => a + cageCount(game, w, item), 0);
const inboundOf = (L, item) => L.inbound.filter((x) => x.item === item).reduce((a, x) => a + x.qty, 0);
const say = (L, game, text) => { L.log.push({ day: game.clock.day, text }); while (L.log.length > LINK.maxLog) L.log.shift(); };

/** What one unit costs from another manufacturer. */
export function unitPrice(game, item) {
  const v = game.arms?.value?.(item) || items(game)[item]?.arms?.value || items(game)[item]?.price || 0;
  return Math.max(1, Math.round(v * LINK.markup));
}

/** The recipes (by id) that make an item, with the station kind each needs. */
function recipesFor(game, item) {
  return Object.entries(game.content.arms.recipes).filter(([, r]) => r.single === item || r.out === item).map(([rid, r]) => ({ rid, station: r.station, manual: Boolean(r.manual) }));
}

/** How short the company is of an item: the level asked for, less what the stores hold, what is on its way, and what the cages will ship tomorrow. */
function shortOf(game, C, L, item) {
  const want = L.want[item] || 0;
  const have = heldOf(C, item);
  const inbound = inboundOf(L, item);
  const caged = cagesHold(game, item);
  return { want, have, inbound, caged, toShip: Math.max(0, Math.min(want - have, caged)), short: Math.max(0, want - have - inbound - caged) };
}

/** Which stations (machines) of the owned works make an item right now. */
function makers(game, item) {
  const A = game.arms; const out = [];
  for (const wh of worksIds(game)) for (const m of A.cells(wh).machines) { if (m.kind === 'lab') continue; const r = A.recipeOf(m); if (r && (r.single === item || r.out === item)) out.push({ wh, m, staffed: Boolean(A.workerAt(m)) }); }
  return out;
}

export function setWant(game, item, qty) {
  const C = company(game); if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!ARMS_TRANSFERABLE.includes(item)) return { ok: false, text: 'The company keeps weapons, rounds, rockets, shells, missiles and drones from the Arms works, nothing else.' };
  qty = Math.floor(Number(qty)); if (!(qty >= 0)) return { ok: false, text: 'That is not a number.' };
  if (qty > LINK.max) return { ok: false, text: `The highest level is ${LINK.max}.` };
  const L = linkOf(C);
  if (qty === 0) delete L.want[item]; else L.want[item] = qty;
  return { ok: true, text: qty ? `The company will keep ${qty} × ${nameOf(game, item)} in the stores.` : `The company no longer keeps ${nameOf(game, item)} in the stores.` };
}

/** Tell a works to make for the company (or stop). */
export function setDedicated(game, works, on) {
  const C = company(game); if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!worksIds(game).includes(works)) return { ok: false, text: 'You do not own that works.' };
  const L = linkOf(C);
  if (on) L.works[works] = true; else { delete L.works[works]; sweep(game, L, new Set()); for (const m of game.arms.cells(works).machines) delete m.linkSkip; }
  return { ok: true, text: on ? `${game.arms.def(works).name} will make what the company is short of when its stations are idle, and go back to what they made once the stores are full.` : `${game.arms.def(works).name} goes back to its own work.` };
}

/** A station the link retooled carries `forCompany: { was, set }`: the recipe it made before and the one the link put on. */
function release(A, m) {
  const f = m.forCompany; if (!f) { delete m.forCompany; return; }
  if (m.setting !== f.set) { delete m.forCompany; m.linkSkip = true; return; } // the player has taken the station back: it is theirs, and the link leaves it alone
  if (m.progress > 0) return; // finish the unit in hand first
  delete m.forCompany;
  if (f.was && A.cfg.recipes[f.was]) A.setRecipe(m.id, f.was); else { m.setting = null; m.progress = 0; }
}

/** Every owned works, dedicated or not: a retooled station goes back once its works is no longer dedicated or its item is no longer wanted. */
function sweep(game, L, wanted) {
  const A = game.arms;
  for (const wh of worksIds(game)) for (const m of A.cells(wh).machines) {
    if (m.forCompany === undefined) continue;
    const r = A.recipeOf(m); const out = r && (r.single || r.out);
    if (!L.works[wh] || !(out && wanted.has(out))) release(A, m);
  }
}

/** Buy what the works cannot make from other manufacturers: paid now, in the stores in LINK.days days. */
export function buyElsewhere(game, item, qty) {
  const C = company(game); if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!ARMS_TRANSFERABLE.includes(item)) return { ok: false, text: 'Not an item the company keeps.' };
  qty = Math.floor(Number(qty) || 0); if (qty < 1) return { ok: false, text: 'Buy at least one.' };
  const L = linkOf(C); const S = shortOf(game, C, L, item);
  if (!S.want) return { ok: false, text: `Set a level for ${nameOf(game, item)} first.` };
  if (S.have + S.inbound + qty > S.want) return { ok: false, text: `That is more than the level of ${S.want}: ${Math.max(0, S.want - S.have - S.inbound)} would fill it.` };
  const cost = unitPrice(game, item) * qty;
  const r = pay(game, cost, `Other manufacturers: ${qty} × ${nameOf(game, item)}`);
  if (!r.ok) return r;
  L.inbound.push({ id: nextId(C, 'B'), item, qty, due: game.clock.day + LINK.days });
  refreshFlow(game, L); L.flow.spent += cost;
  say(L, game, `Bought ${qty} × ${nameOf(game, item)} from other manufacturers (${cost.toLocaleString('en-US')} obols), due in ${LINK.days} days.`);
  return { ok: true, text: `${qty} × ${nameOf(game, item)} ordered from other manufacturers: ${cost.toLocaleString('en-US')} obols, in the stores in ${LINK.days} days.` };
}

function refreshFlow(game, L) {
  if (game.clock.day - L.flow.since >= LINK.flowDays) L.flow = { since: game.clock.day, free: 0, bought: 0, spent: 0 };
}

/** Every morning: the purchases that are due arrive, the dedicated works retool, and each works ships toward the levels. Marked per day, so a day run twice changes nothing. */
export function dayTick(game) {
  const C = company(game); if (!C?.identity) return;
  const L = linkOf(C); const day = game.clock.day;
  if (L.day >= day) return; L.day = day;
  refreshFlow(game, L);
  // purchases arriving 
  for (const b of L.inbound.slice()) {
    if (b.due > day) continue;
    addStock(game, `arms:bought:${b.item}`, b.qty); L.flow.bought += b.qty;
    L.inbound = L.inbound.filter((x) => x !== b);
    say(L, game, `${b.qty} × ${nameOf(game, b.item)} arrived from other manufacturers.`);
  }
  // the free shipment from the cages
  for (const item of Object.keys(L.want).sort()) {
    let need = L.want[item] - heldOf(C, item);
    if (need < 1) continue;
    let moved = 0;
    for (const wh of worksIds(game)) {
      if (need < 1) break;
      const take = Math.min(need, cageCount(game, wh, item));
      if (take < 1) continue;
      const got = cageTake(game, wh, item, take);
      addStock(game, `arms:${wh}:${item}`, got); need -= got; moved += got;
      const m = peekMilitary(game);
      m.transfers.push({ id: nextId(C, 'T'), day, from: `arms:${wh}`, to: 'company', what: item, name: nameOf(game, item), qty: got, status: 'done', by: 'supply link' });
    }
    if (moved) { L.flow.free += moved; say(L, game, `${moved} × ${nameOf(game, item)} shipped free from the Arms works.`); }
  }
  const m = peekMilitary(game); while (m.transfers.length > 80) m.transfers.shift();
  retool(game, C, L);
}

/** Dedicated works: idle stations make what the company is short of; when it is not, they go back. */
function retool(game, C, L) {
  const A = game.arms;
  const unmet = Object.keys(L.want).map((item) => ({ item, ...shortOf(game, C, L, item) })).filter((x) => x.want - x.have - x.inbound - x.caged > 0).sort((a, b) => (b.want - b.have) / b.want - (a.want - a.have) / a.want || (a.item < b.item ? -1 : 1));
  const wanted = new Set(unmet.map((x) => x.item));
  const assigned = {};
  for (const x of unmet) assigned[x.item] = makers(game, x.item).length;
  sweep(game, L, wanted);
  for (const wh of worksIds(game)) {
    if (!L.works[wh]) continue;
    const machines = A.cells(wh).machines.filter((m) => m.kind !== 'lab').sort((a, b) => (a.id < b.id ? -1 : 1));
    // take idle stations for the shortest items
    for (const m of machines) {
      if (m.forCompany !== undefined || m.progress > 0 || m.linkSkip) continue;
      const cur = A.recipeOf(m); const curOut = cur && (cur.single || cur.out);
      if (curOut && wanted.has(curOut)) continue;
      for (const x of unmet) {
        const enough = Math.max(1, Math.ceil((x.want - x.have - x.inbound - x.caged) / CRATE.units / 4));
        if (assigned[x.item] >= enough) continue;
        const rec = recipesFor(game, x.item).find((q) => q.station === m.kind && A.recipeUnlocked(q.rid));
        if (!rec) continue;
        const was = m.setting;
        const r = A.setRecipe(m.id, rec.rid);
        if (!r.ok) continue;
        m.forCompany = { was: was || '', set: rec.rid };
        assigned[x.item] += 1;
        break;
      }
    }
  }
}

/** Everything the Supply page shows. */
export function view(game) {
  const C = company(game); if (!C?.identity) return null;
  // read-only (v0.103.4): looking never creates the record or rolls the weekly figures over
  const L0 = C.link || { want: {}, works: {}, inbound: [], flow: { since: 0, free: 0, bought: 0, spent: 0 }, log: [], day: 0 };
  const L = game.clock.day - L0.flow.since >= LINK.flowDays ? { ...L0, flow: { since: game.clock.day, free: 0, bought: 0, spent: 0 } } : L0;
  const rows = ARMS_TRANSFERABLE.filter((item) => game.content.items[item]).map((item) => {
    const S = shortOf(game, C, L, item); const mk = makers(game, item);
    const recs = recipesFor(game, item); const can = recs.some((q) => game.arms.recipeUnlocked(q.rid));
    const buyQty = Math.max(0, S.want - S.have - S.inbound);
    const state = !S.want ? 'off' : S.have >= S.want ? 'full' : S.have + S.inbound >= S.want ? 'inbound' : S.have + S.inbound + S.caged >= S.want ? 'shipping' : mk.length ? 'making' : 'idle';
    return { item, name: nameOf(game, item), ...S, makers: mk.length, staffed: mk.filter((x) => x.staffed).length, canMake: can, unit: unitPrice(game, item), buyQty, buyCost: buyQty * unitPrice(game, item), state };
  });
  return {
    rows, flow: { ...L.flow }, inbound: L.inbound.map((b) => ({ ...b, name: nameOf(game, b.item) })), log: L.log.slice().reverse(),
    works: worksIds(game).map((w) => ({ id: w, name: game.arms.def(w).name, dedicated: Boolean(L.works[w]), stations: game.arms.cells(w).machines.filter((m) => m.kind !== 'lab').length, retooled: game.arms.cells(w).machines.filter((m) => m.forCompany !== undefined).length })),
    markup: LINK.markup, days: LINK.days,
  };
}
