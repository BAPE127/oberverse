// Buying from suppliers (v0.99.0): carriers, recon, artillery, anti-air, logistics and medical vehicles, and the supplies and parts. Paid by the company from its own account; the
// vehicle or the goods arrive at once (a supplier's lead time is a later refinement). Tanks and helicopters are NOT on this list: they are made at the company's own works.
import { peekMilitary } from './state.js';
import { addRecord, addStock, roomFor } from './equipment.js';
import { pay } from './company.js';
import { VEHICLES, SUPPLIES } from '../content/procurement.js';
import { armourEraOpen, vehicleEraOpen } from './research.js';
import { WAR_RESEARCH, GATE } from '../content/warResearch.js';
// v0.103.8: what a closed tier keeps out of the stores, by whichever route it is bought
const closed = (game, tech) => (tech?.armourEra && !armourEraOpen(game, tech.armourEra) ? WAR_RESEARCH[GATE.armourEra[tech.armourEra]].name : tech?.vehicleEra && !vehicleEraOpen(game, tech.vehicleEra) ? WAR_RESEARCH[GATE.vehicleEra[tech.vehicleEra]].name : null);

export function buyVehicle(game, id) {
  const V = VEHICLES[id];
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!V || V.source !== 'bought') return { ok: false, text: V ? `${V.name} is built at the company's own works, not bought.` : 'No such vehicle.' };
  if (V.era >= 3 && !vehicleEraOpen(game, V.era)) return { ok: false, text: `${V.name} needs research: ${WAR_RESEARCH[GATE.vehicleEra[V.era]].name} (Base Operations, Research).` };
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
  const need = closed(game, S.tech); if (need) return { ok: false, text: `${S.name} needs research: ${need} (Base Operations, Research).` };
  qty = Math.floor(Number(qty) || 0);
  if (qty < 1) return { ok: false, text: 'Order at least one.' };
  const why = roomFor(game, 'stock', qty);
  if (why) return { ok: false, text: why };
  const r = pay(game, S.price * qty, `Supplier: ${qty} × ${S.name}`);
  if (!r.ok) return r;
  addStock(game, `supply:${id}`, qty);
  return { ok: true, text: `${qty} × ${S.name} go into the stores (${(S.price * qty).toLocaleString('en-US')} obols).` };
}
