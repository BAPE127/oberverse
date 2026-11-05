// Buying from suppliers (v0.99.0): carriers, recon, artillery, anti-air, logistics and medical vehicles, and the supplies and parts. Paid by the company from its own account; the
// vehicle or the goods arrive at once (a supplier's lead time is a later refinement). Tanks and helicopters are NOT on this list: they are made at the company's own works.
import { peekMilitary } from './state.js';
import { addRecord, addStock, roomFor } from './equipment.js';
import { pay } from './company.js';
import { VEHICLES, SUPPLIES } from '../content/procurement.js';

export function buyVehicle(game, id) {
  const V = VEHICLES[id];
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!V || V.source !== 'bought') return { ok: false, text: V ? `${V.name} is built at the company's own works, not bought.` : 'No such vehicle.' };
  const why = roomFor(game, 'vehicle');
  if (why) return { ok: false, text: why };
  const r = pay(game, V.price, `Supplier: ${V.name}`);
  if (!r.ok) return r;
  const a = addRecord(game, { kind: 'vehicle', type: id, name: V.name, source: 'bought' });
  C.log.push({ day: game.clock.day, text: `Bought a ${V.name} (${V.price} obols).` });
  return { ok: true, text: `A ${V.name} arrives at the motor pool (${V.price.toLocaleString('en-US')} obols).`, id: a.rec.id };
}

export function buySupply(game, id, qty) {
  const S = SUPPLIES[id];
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!S) return { ok: false, text: 'No such supply.' };
  qty = Math.floor(Number(qty) || 0);
  if (qty < 1) return { ok: false, text: 'Order at least one.' };
  const why = roomFor(game, 'stock', qty);
  if (why) return { ok: false, text: why };
  const r = pay(game, S.price * qty, `Supplier: ${qty} × ${S.name}`);
  if (!r.ok) return r;
  addStock(game, `supply:${id}`, qty);
  return { ok: true, text: `${qty} × ${S.name} go into the stores (${(S.price * qty).toLocaleString('en-US')} obols).` };
}
