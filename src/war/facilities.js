// The company's construction (v0.98.0): Mason's Os builds the facilities of src/content/facilities.js on Hollowmoor Lot, in stages, on the existing building-contract model
// (permit → work → built), with real capacity and the same damage gate for everything that can be hurt.
//
//   commission(game, id)        order a facility: stage open, lot owned, not already ordered; paid up front (less the crew's goodwill discount)
//   dailyTick(game)             the permit waits a day; then foundation, frame and fitting-out take their days; built → registered with the damage gate
//   repairCost / repair         a damaged facility is mended through the gate (never by writing its state); a destroyed one is rebuilt
//   capacity(game)              what the base can hold: beds, meals, treatment places, stores, lines, bays — less for a damaged facility, none for a ruin
// A built facility is registered with the gate as `fac_<id>`; its state is read from the gate, never stored here.
import { ensureMilitary, peekMilitary } from './state.js';
import { register, repair as gateRepair, stateOf, hpOf } from './damage.js';
import { FACILITIES, FACILITY_STATES, LOT } from '../content/facilities.js';

const rec = (m, id) => m?.company?.facilities.find((f) => f.id === id) || null;
const sid = (id) => `fac_${id}`;

export const lotOwned = (game) => Boolean(peekMilitary(game)?.company?.lot?.owned);

/** 'none' | 'permit' | 'foundation' | 'frame' | 'fitted' | 'built' | 'ruin' (built, then destroyed). */
export function facilityState(game, id) {
  const f = rec(peekMilitary(game), id);
  if (!f) return 'none';
  if (f.state === 'built' && stateOf(game, sid(id)) === 'destroyed') return 'ruin';
  return f.state;
}

/** Is the stage this facility belongs to open? Stage 1 always; a later stage needs every facility of the stage before built. */
export function stageOpen(game, stage) {
  if (stage <= 1) return true;
  return Object.values(FACILITIES).filter((F) => F.stage === stage - 1).every((F) => facilityState(game, F.id) === 'built');
}

export function quote(game, id) {
  const F = FACILITIES[id];
  if (!F) return null;
  const disc = game.construction?.discount?.() || 0;
  return { cost: Math.round(F.cost * (1 - disc)), discount: disc, days: F.days.reduce((a, b) => a + b, 1) };
}

/** Order a facility. `pay(amount, note)` is the company's way of paying (it returns { ok, text }); nothing is spent unless every check has passed. */
export function commission(game, id, pay) {
  const F = FACILITIES[id];
  const m = peekMilitary(game);
  if (!F) return { ok: false, text: 'No such facility.' };
  if (!m?.company) return { ok: false, text: 'You have no company.' };
  if (!m.company.lot.owned) return { ok: false, text: 'You have no ground to build on: buy Hollowmoor Lot first.' };
  if (rec(m, id)) return { ok: false, text: `${F.name} is already ${facilityState(game, id) === 'built' ? 'built' : 'on order'}.` };
  if (!stageOpen(game, F.stage)) return { ok: false, text: `${F.name} is a stage ${F.stage} building: finish stage ${F.stage - 1} first.` };
  const q = quote(game, id);
  const r = pay(q.cost, `Mason's Os: ${F.name}`);
  if (!r.ok) return r;
  m.company.facilities.push({ id, slot: F.slot, kind: F.kind, state: 'permit', daysLeft: 1, stage: 0, paid: q.cost, since: game.clock.day });
  m.log.push({ day: game.clock.day, text: `${F.name} commissioned (${q.cost} obols).` });
  return { ok: true, text: `Mason's Os will build the ${F.name.toLowerCase()}: ${q.cost.toLocaleString('en-US')} obols, about ${q.days} days.` };
}

/** 06:11 each day: the work moves on. Idempotent per day. */
export function dailyTick(game) {
  const m = peekMilitary(game);
  const C = m?.company;
  if (!C) return;
  const day = game.clock.day;
  if (C.lastDay >= day) return;
  C.lastDay = day;
  for (const f of C.facilities) {
    if (f.state === 'built' || f.state === 'ruin') continue;
    if (f.state === 'permit' && C.licensed === false) continue; // no licence, no permit (the Civic Office will not stamp it)
    f.daysLeft -= 1;
    if (f.daysLeft > 0) continue;
    const F = FACILITIES[f.id];
    const i = FACILITY_STATES.indexOf(f.state);
    const next = FACILITY_STATES[i + 1];
    f.state = next;
    if (next === 'built') { finish(game, f, F); continue; }
    f.daysLeft = F.days[FACILITY_STATES.indexOf(next) - 1]; // foundation, frame, fitted in turn
    game.notify?.(`Mason's Os: the ${F.name.toLowerCase()} is at the ${next === 'foundation' ? 'foundations' : next === 'frame' ? 'frame' : 'fitting-out'} stage.`, 'info');
  }
}

function finish(game, f, F) {
  const m = peekMilitary(game);
  f.builtDay = game.clock.day;
  const existing = stateOf(game, sid(f.id));
  if (existing) gateRepair(game, sid(f.id), F.hp, 'rebuild'); // a rebuilt ruin: whole again, through the gate
  else register(game, sid(f.id), { owner: 'company', core: F.core, hp: F.hp, name: F.name });
  m.log.push({ day: game.clock.day, text: `${F.name} is built.` });
  game.notify?.(`Mason's Os finished your ${F.name.toLowerCase()}. "Built to last, as far as it is anyone's business to say."`, 'good');
  game.bus?.emit('war:facility', { id: f.id, state: 'built' });
}

/** What mending costs: half of what the damaged share of the building is worth (a ruin is rebuilt for most of its price, and goes through the stages again). */
export function repairCost(game, id) {
  const F = FACILITIES[id];
  const h = hpOf(game, sid(id));
  if (!F || !h) return null;
  const state = stateOf(game, sid(id));
  if (state === 'destroyed') return { kind: 'rebuild', cost: Math.round(F.cost * 0.8) };
  const lost = 1 - h.hp / h.hpMax;
  return { kind: 'repair', cost: Math.round(F.cost * 0.5 * lost) };
}

export function repair(game, id, pay) {
  const m = peekMilitary(game);
  const f = rec(m, id);
  const F = FACILITIES[id];
  const q = f && f.state === 'built' ? repairCost(game, id) : null;
  if (!q) return { ok: false, text: 'There is nothing to repair.' };
  if (q.cost <= 0) return { ok: false, text: `${F.name} is as good as new.` };
  const r = pay(q.cost, `Mason's Os: ${q.kind === 'rebuild' ? 'rebuilding' : 'repairing'} ${F.name}`);
  if (!r.ok) return r;
  if (q.kind === 'rebuild') { f.state = 'foundation'; f.daysLeft = F.days[0]; f.rebuild = true; return { ok: true, text: `Mason's Os will rebuild the ${F.name.toLowerCase()} from the foundations (${q.cost.toLocaleString('en-US')} obols).` }; }
  const h = hpOf(game, sid(id));
  gateRepair(game, sid(id), h.hpMax - h.hp, 'repair');
  return { ok: true, text: `Mason's Os mended the ${F.name.toLowerCase()} (${q.cost.toLocaleString('en-US')} obols).` };
}

/** What the base can hold, from the facilities that stand: a damaged one gives half, a ruin none. */
export function capacity(game) {
  const out = { beds: 0, meals: 0, treat: 0, stores: 0, desks: 0, lines: 0, bays: 0, training: 0, repair: 0, racks: 0, surgery: 0, briefing: 0 };
  const m = peekMilitary(game);
  for (const f of m?.company?.facilities || []) {
    if (f.state !== 'built') continue;
    const st = stateOf(game, sid(f.id));
    const k = st === 'destroyed' ? 0 : st === 'damaged' ? 0.5 : 1;
    for (const [key, v] of Object.entries(FACILITIES[f.id].capacity)) out[key] = (out[key] || 0) + Math.floor(v * k);
  }
  return out;
}

/** The offers: every facility with its state, cost and whether it can be ordered now. */
export function view(game) {
  const m = peekMilitary(game);
  return Object.values(FACILITIES).map((F) => {
    const st = facilityState(game, F.id);
    const r = rec(m, F.id);
    const q = quote(game, F.id);
    return { ...F, state: st, daysLeft: r?.daysLeft ?? null, cost: q.cost, open: stageOpen(game, F.stage), canOrder: st === 'none' && stageOpen(game, F.stage) && Boolean(m?.company?.lot.owned), gate: stateOf(game, sid(F.id)), repair: st === 'built' || st === 'ruin' ? repairCost(game, F.id) : null };
  });
}
