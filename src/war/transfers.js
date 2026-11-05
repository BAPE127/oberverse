// Transfers (v0.99.0 stage 4): moving real things between your other companies and the war company. The rules, all of them tested:
//   free         no money moves: not your wallet, not any company's account, not Aerospace's or the Arms works' books
//   atomic       every check first, then the change; a refusal leaves every system exactly as it was
//   real stock   what leaves a source is gone from it (a stored jet cannot also fill an Aerospace contract; a rifle cannot also be sold), and what comes back goes to where it came from
//   audited      each move is a line in `world.military.transfers` (capped), never a money entry
//   only free    an item that is assigned, deployed or destroyed cannot be returned
// Sources: Aerospace (military aircraft and strategic missile products kept in storage), the Arms works (guns, rounds, rockets, missiles and drones, from a named works' export cage).
// Ships stay with the shipping company (see docs/WAR.md).
import { ensureMilitary, peekMilitary } from './state.js';
import { addRecord, addStock, takeStock, stockOf, nextId, roomFor, stockName } from './equipment.js';
import { ARMS_TRANSFERABLE, TRANSFER_LOG } from '../content/procurement.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const cageOf = (game, works) => { const def = game.arms?.def?.(works); return def ? game.world.containers[def.outCrate] || null : null; };

function note(game, entry) {
  const m = ensureMilitary(game);
  m.transfers.push({ id: nextId(m.company, 'T'), day: game.clock.day, ...entry });
  while (m.transfers.length > TRANSFER_LOG) m.transfers.shift();
}

/** What of Aerospace's storage may move: military aircraft, and strategic missile products. */
const movable = (A, r) => { const P = A.cfg.products[r.product]; return P && ((P.line === 'aircraft' && P.spec?.military) || P.line === 'missile'); };
function aeroStored(game) {
  const A = game.aero;
  return (A.state.storage || []).filter((r) => movable(A, r)).map((r) => ({ source: 'aero', ref: r.id, name: A.cfg.products[r.product].name, product: r.product, quality: r.quality, line: A.cfg.products[r.product].line }));
}

/** What could move now, by source. */
export function offers(game) {
  const out = { aero: aeroStored(game), arms: [], ships: [] };
  for (const works of game.arms.ownedIds()) {
    const cage = cageOf(game, works);
    for (const item of ARMS_TRANSFERABLE) {
      const have = cage?.items?.[item] || 0;
      if (have > 0) out.arms.push({ source: 'arms', works, item, name: game.content.items[item]?.name || item, have, from: game.arms.def(works).name });
    }
  }
  return out;
}

/** Take something in. `spec`: { source:'aero', ref } or { source:'arms', works, item, qty }. */
export function transfer(game, spec) {
  const m = peekMilitary(game);
  const C = m?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (spec.source === 'aero') {
    const A = game.aero;
    const rec = (A.state.storage || []).find((r) => r.id === spec.ref);
    if (!rec) return { ok: false, text: 'That aircraft is not in Aerospace\'s storage.' };
    const P = A.cfg.products[rec.product];
    if (!movable(A, rec)) return { ok: false, text: 'Only military aircraft and strategic missile products move to the company.' };
    const kind = P.line === 'missile' ? 'missile' : 'aircraft';
    const why = roomFor(game, kind);
    if (why) return { ok: false, text: why };
    A.state.storage = A.state.storage.filter((r) => r !== rec);
    const r = addRecord(game, { kind, type: rec.product, name: P.name, source: 'aero', origin: { system: 'aero', rec: clone(rec) } });
    note(game, { from: 'aerospace', to: 'company', what: rec.product, name: P.name, qty: 1, ref: r.rec.id, status: 'done' });
    return { ok: true, text: `${P.name} moves from Aerospace to the company's ${kind === 'missile' ? 'secure stores' : 'hangars'}. Free: no sale, no entry.`, id: r.rec.id };
  }
  if (spec.source === 'arms') {
    const qty = Math.floor(Number(spec.qty) || 0);
    if (qty < 1) return { ok: false, text: 'Move at least one.' };
    if (!ARMS_TRANSFERABLE.includes(spec.item)) return { ok: false, text: 'The company takes weapons, rounds, missiles and drones from the Arms works, nothing else.' };
    if (!game.arms.ownedIds().includes(spec.works)) return { ok: false, text: 'You do not own that works.' };
    const cage = cageOf(game, spec.works);
    const have = cage?.items?.[spec.item] || 0;
    if (have < qty) return { ok: false, text: `The export cage holds ${have}.` };
    const why = roomFor(game, 'stock', qty);
    if (why) return { ok: false, text: why };
    cage.items[spec.item] -= qty;
    addStock(game, `arms:${spec.works}:${spec.item}`, qty);
    game.bus.emit('container:changed', { id: game.arms.def(spec.works).outCrate });
    const name = game.content.items[spec.item]?.name || spec.item;
    note(game, { from: `arms:${spec.works}`, to: 'company', what: spec.item, name, qty, status: 'done' });
    return { ok: true, text: `${qty} × ${name} move from ${game.arms.def(spec.works).name} to the company's stores. Free.` };
  }
  return { ok: false, text: 'Ships stay with the shipping company this release.' };
}

/** Send something back to where it came from. `spec`: { id } for a record, { key, qty } for stock. */
export function giveBack(game, spec) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (spec.id) {
    const x = C.equipment.find((e) => e.id === spec.id);
    if (!x) return { ok: false, text: 'No such item.' };
    if (!x.origin) return { ok: false, text: `${x.name} was bought or built here: it has nowhere to go back to.` };
    if (x.status !== 'stored' || x.assignedTo != null) return { ok: false, text: `${x.name} is ${x.status === 'stored' ? 'assigned' : x.status}: only a free item can be returned.` };
    const A = game.aero;
    if ((A.state.storage || []).some((r) => r.id === x.origin.rec.id)) return { ok: false, text: 'Aerospace already has a record with that number.' };
    (A.state.storage ||= []).push(clone(x.origin.rec));
    C.equipment = C.equipment.filter((e) => e !== x);
    note(game, { from: 'company', to: 'aerospace', what: x.type, name: x.name, qty: 1, ref: x.id, status: 'returned' });
    return { ok: true, text: `${x.name} is back in Aerospace's storage.` };
  }
  const qty = Math.floor(Number(spec.qty) || 0);
  const m = /^arms:([^:]+):(.+)$/.exec(spec.key || '');
  if (!m) return { ok: false, text: 'Only what came from the Arms works goes back.' };
  if (qty < 1) return { ok: false, text: 'Move at least one.' };
  if (stockOf(game, spec.key) < qty) return { ok: false, text: `The company holds ${stockOf(game, spec.key)}.` };
  if (!game.arms.ownedIds().includes(m[1])) return { ok: false, text: 'You no longer own the works it came from.' };
  const cage = cageOf(game, m[1]);
  if (!cage) return { ok: false, text: 'That works has no export cage.' };
  takeStock(game, spec.key, qty);
  cage.items[m[2]] = (cage.items[m[2]] || 0) + qty;
  game.bus.emit('container:changed', { id: game.arms.def(m[1]).outCrate });
  note(game, { from: 'company', to: `arms:${m[1]}`, what: m[2], name: stockName(game, spec.key), qty, status: 'returned' });
  return { ok: true, text: `${qty} × ${game.content.items[m[2]]?.name || m[2]} go back to ${game.arms.def(m[1]).name}.` };
}
