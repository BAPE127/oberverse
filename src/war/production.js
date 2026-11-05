// The works (v0.99.0 stage 5): the tank factory and the helicopter works. What they do and what stops them:
//   order(model, qty)      queue units of a model (only tanks and helicopters exist; nothing else is buildable)
//   a line builds one unit at a time: it starts when the parts are in the stores, the works' fee can be paid and the crew is there; it takes the model's days at one shift
//   shifts (1 to 3)        more shifts finish a unit sooner and need more technicians; wages are paid either way
//   blocked                a line that cannot start or finish says WHY (parts, cash, crew, a free bay, a damaged works) and is saved
//   upgrade / maintain     a works builds 15% faster per upgrade; it wears with use and slows when worn; mending costs by the point of wear
// The number of lines comes from the works' capacity (src/war/facilities.js): a damaged works has half its lines, a ruin none.
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { addRecord, nextId, stockOf, takeStock } from './equipment.js';
import { ofRole } from './people.js';
import { pay } from './company.js';
import { VEHICLES, SUPPLIES } from '../content/procurement.js';
import { WORKS, MODELS, UPGRADE, WEAR, feeOf, worksOf } from '../content/production.js';
import { FACILITIES } from '../content/facilities.js';

const built = (C, id) => C.facilities.some((f) => f.id === id && f.state === 'built');

function ensure(C) {
  C.lines ||= []; C.works ||= {};
  for (const w of Object.keys(WORKS)) {
    C.works[w] ||= { level: 0, wear: 0 };
    if (built(C, w)) for (let i = 0; i < FACILITIES[w].capacity.lines; i++) if (!C.lines.some((l) => l.works === w && l.n === i)) C.lines.push({ id: `${w === 'tank_factory' ? 'T' : 'H'}${i + 1}`, works: w, n: i, shifts: 1, unit: null, blocked: null });
  }
}

/** Why a model cannot start right now (or null). */
function startBlock(game, C, model, crewLeft, need) {
  const fee = feeOf(model);
  const missing = Object.entries(MODELS[model].parts).filter(([k, n]) => stockOf(game, `supply:${k}`) < n).map(([k, n]) => `${n - stockOf(game, `supply:${k}`)} ${SUPPLIES[k].name.toLowerCase()}`);
  if (missing.length) return `waiting for parts: ${missing.join(', ')}`;
  if (crewLeft < need) return `needs ${need} technicians (${crewLeft} free)`;
  if (game.corp.account('security').cash < fee) return `cannot pay the works' fee (${fee.toLocaleString('en-US')} obols)`;
  return null;
}

export function order(game, model, qty) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const V = VEHICLES[model];
  if (!V || !MODELS[model]) return { ok: false, text: 'The company builds tanks and helicopters, and nothing else.' };
  qty = Math.floor(Number(qty) || 0);
  if (qty < 1 || qty > 20) return { ok: false, text: 'Order between 1 and 20.' };
  const w = worksOf(model);
  if (!built(C, w)) return { ok: false, text: `Build the ${WORKS[w].name.toLowerCase()} first.` };
  const o = { id: nextId(C, 'O'), works: w, model, qty, left: qty, done: 0, day: game.clock.day };
  C.production.push(o);
  return { ok: true, text: `${qty} × ${V.name} on order at the ${WORKS[w].name.toLowerCase()}.`, id: o.id };
}

export function cancel(game, id) {
  const C = peekMilitary(game)?.company;
  const o = C?.production.find((x) => x.id === id);
  if (!o) return { ok: false, text: 'No such order.' };
  if (o.left < 1) return { ok: false, text: 'Everything on that order has been started.' };
  o.qty -= o.left; o.left = 0; // what is already on a line is finished
  if (o.qty === 0) C.production = C.production.filter((x) => x !== o);
  return { ok: true, text: 'The rest of that order is cancelled. Nothing had been paid for it.' };
}

export function setShifts(game, lineId, shifts) {
  const C = peekMilitary(game)?.company;
  const l = C?.lines?.find((x) => x.id === lineId);
  if (!l) return { ok: false, text: 'No such line.' };
  shifts = Math.floor(Number(shifts) || 0);
  if (shifts < 1 || shifts > WORKS[l.works].maxShifts) return { ok: false, text: `A line runs 1 to ${WORKS[l.works].maxShifts} shifts.` };
  l.shifts = shifts;
  return { ok: true, text: `Line ${l.id} runs ${shifts} shift${shifts > 1 ? 's' : ''}: it needs ${shifts * WORKS[l.works].crewPerShift} technicians.` };
}

export const efficiency = (C, works) => {
  const W = C.works?.[works] || { level: 0, wear: 0 };
  return (1 + UPGRADE.boost * W.level) * (W.wear >= WEAR.bad ? WEAR.badMult : W.wear >= WEAR.slow ? WEAR.slowMult : 1);
};

export function upgrade(game, works) {
  const C = peekMilitary(game)?.company;
  if (!C || !WORKS[works] || !built(C, works)) return { ok: false, text: 'Build it first.' };
  ensure(C);
  const W = C.works[works];
  if (W.level >= UPGRADE.max) return { ok: false, text: 'It is as good as it gets.' };
  const cost = UPGRADE.cost[W.level];
  const r = pay(game, cost, `Upgrade: ${WORKS[works].name}`);
  if (!r.ok) return r;
  W.level++;
  return { ok: true, text: `The ${WORKS[works].name.toLowerCase()} is upgraded (level ${W.level}, ${cost.toLocaleString('en-US')} obols): ${Math.round(UPGRADE.boost * W.level * 100)}% faster.` };
}

export const maintainCost = (C, works) => Math.round((C.works?.[works]?.wear || 0) * WEAR.fixPerPoint);
export function maintain(game, works) {
  const C = peekMilitary(game)?.company;
  if (!C || !WORKS[works] || !built(C, works)) return { ok: false, text: 'Build it first.' };
  ensure(C);
  const cost = maintainCost(C, works);
  if (C.works[works].wear < 5) return { ok: false, text: 'It is in good order.' };
  const r = pay(game, cost, `Maintenance: ${WORKS[works].name}`);
  if (!r.ok) return r;
  C.works[works].wear = 0;
  return { ok: true, text: `The ${WORKS[works].name.toLowerCase()} is overhauled (${cost.toLocaleString('en-US')} obols).` };
}

/** One day on every line. Idempotent per day. */
export function dayTick(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return;
  const day = game.clock.day;
  C.days ||= {};
  if ((C.days.prod || 0) >= day) return;
  C.days.prod = day;
  ensure(C);
  let crewLeft = ofRole(game, 'technician').length; // technicians are not tied to a line: each day, crew goes to the lines in order
  for (const l of C.lines) {
    const cap = capacity(game, l.works).lines;
    const per = WORKS[l.works].crewPerShift * l.shifts;
    if (l.n >= cap) { l.blocked = cap ? 'the works is damaged: this line is down' : 'the works is a ruin'; continue; }
    if (!l.unit) {
      const o = C.production.find((x) => x.works === l.works && x.left > 0);
      if (!o) { l.blocked = null; continue; }
      const why = startBlock(game, C, o.model, crewLeft, per);
      if (why) { l.blocked = why; continue; }
      for (const [k, n] of Object.entries(MODELS[o.model].parts)) takeStock(game, `supply:${k}`, n);
      pay(game, feeOf(o.model), `Fee: ${VEHICLES[o.model].name}`);
      o.left--;
      l.unit = { order: o.id, model: o.model, progress: 0, started: day };
    } else if (crewLeft < per) { l.blocked = `needs ${per} technicians (${crewLeft} free)`; continue; }
    crewLeft -= per;
    l.blocked = null;
    if (l.unit.progress < 1) {
      l.unit.progress += (l.shifts / MODELS[l.unit.model].days) * efficiency(C, l.works);
      C.works[l.works].wear = Math.min(100, C.works[l.works].wear + WEAR.perLine);
    }
    if (l.unit.progress >= 1) {
      const V = VEHICLES[l.unit.model];
      const r = addRecord(game, { kind: V.class === 'tank' ? 'vehicle' : 'helicopter', type: V.id, name: V.name, source: 'works' });
      if (!r.ok) { l.blocked = `finished, but ${r.text.charAt(0).toLowerCase()}${r.text.slice(1)}`; continue; }
      const o = C.production.find((x) => x.id === l.unit.order);
      if (o) { o.done++; if (o.done >= o.qty) C.production = C.production.filter((x) => x !== o); }
      C.log.push({ day, text: `${V.name} ${r.rec.id} rolls out of the ${WORKS[l.works].name.toLowerCase()}.` });
      game.notify?.(`Your ${V.name} ${r.rec.id} is finished.`, 'good');
      l.unit = null;
    }
  }
}

/** What the Production page shows. */
export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  ensure(C);
  const needs = {};
  for (const o of C.production) for (const [k, n] of Object.entries(MODELS[o.model].parts)) needs[k] = (needs[k] || 0) + n * o.left;
  return {
    works: Object.entries(WORKS).map(([id, W]) => ({ id, name: W.name, built: built(C, id), lines: capacity(game, id).lines, level: C.works[id].level, wear: C.works[id].wear, eff: efficiency(C, id), maintain: maintainCost(C, id), upgrade: C.works[id].level < UPGRADE.max ? UPGRADE.cost[C.works[id].level] : null, crewPerShift: W.crewPerShift })),
    lines: C.lines.map((l) => ({ ...l, progress: l.unit ? l.unit.progress : 0, model: l.unit?.model || null, crew: WORKS[l.works].crewPerShift * l.shifts })),
    orders: C.production.map((o) => ({ ...o, name: VEHICLES[o.model].name })),
    needs: Object.entries(needs).map(([k, n]) => ({ id: k, name: SUPPLIES[k].name, need: n, have: stockOf(game, `supply:${k}`) })),
    technicians: ofRole(game, 'technician').length,
    models: Object.values(MODELS).map((m) => ({ ...m, name: VEHICLES[m.id].name, class: VEHICLES[m.id].class, price: VEHICLES[m.id].price, fee: feeOf(m.id), works: worksOf(m.id) })),
  };
}
