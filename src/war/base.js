// The living base (v0.100.0 stage 8): what each day does to the company's people, from what the base really has. Beds, meals, treatment places and stores are real capacity; a base that is too
// small loses morale and readiness. It runs the same whether or not you are there (it is records and counts, not bodies: the bodies in src/war/bodies.js follow the records).
//   dayTick(game)   once a day: rations eaten, meals served, morale and fatigue, the wounded treated, readiness worked out and explained
//   view(game)      what the Base screen shows
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { stockOf, takeStock } from './equipment.js';
import { BASE } from '../content/base.js';
import { CLASSES } from '../content/troops.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const alive = (C) => C.personnel.filter((p) => p.status !== 'dead' && p.status !== 'captured').sort((a, b) => (a.id < b.id ? -1 : 1));

function note(game, C, key, text, kind = 'warn') {
  C.base.noticed ||= {};
  const day = game.clock.day;
  if (day - (C.base.noticed[key] ?? -99) < BASE.noticeEvery) return;
  C.base.noticed[key] = day;
  C.log.push({ day, text });
  game.notify?.(text, kind);
}

export function dayTick(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return;
  C.days ||= {};
  const day = game.clock.day;
  if ((C.days.base || 0) >= day) return;
  C.days.base = day;
  C.base ||= { day: 0, readiness: 0, factors: {}, noticed: {} };
  const people = alive(C);
  if (!people.length) { C.base = { ...C.base, day, readiness: 0, factors: {}, short: [] }; return; }
  const cap = capacity(game);
  const acct = game.corp.account('security');
  // beds and meals go to people in order; rations come out of the stores one each while they last
  const housed = new Set(people.slice(0, cap.beds).map((p) => p.id));
  const hot = new Set(people.slice(0, cap.meals).map((p) => p.id));
  const fed = new Set();
  for (const p of people) if (takeStock(game, 'supply:rations', BASE.food.perPerson)) fed.add(p.id);
  // the wounded: treatment places, a medicine each, a medic on the books heals one point more
  const wounded = people.filter((p) => (p.wounds || 0) > 0).sort((a, b) => b.wounds - a.wounds || (a.id < b.id ? -1 : 1));
  const medic = people.some((p) => p.role === 'medic' && p.status === 'active') ? BASE.medical.medicBonus : 0;
  let treated = 0;
  wounded.forEach((p, i) => {
    if (i < cap.treat && takeStock(game, 'supply:medicine', BASE.medical.medicine)) { p.wounds = Math.max(0, p.wounds - BASE.medical.perPlace - medic); treated++; }
    else if (day % BASE.medical.slow === 0) p.wounds = Math.max(0, p.wounds - 1);
    if (p.wounds <= 0 && p.status === 'wounded') p.status = 'active';
    else if (p.wounds > 0 && p.status === 'active') p.status = 'wounded';
  });
  // morale and fatigue, one person at a time
  for (const p of people) {
    const M = BASE.morale;
    let target = M.start;
    if (!housed.has(p.id)) target += M.overcrowded;
    target += fed.has(p.id) ? (hot.has(p.id) ? BASE.food.hot : 0) : BASE.food.hungry;
    if (acct.arrears > 0) target += M.unpaid;
    if ((p.wounds || 0) > 0) target += M.wounded;
    const tired = (p.fatigue ?? 0) > BASE.fatigue.tired;
    if (tired) target += M.tired; else if ((p.fatigue ?? 0) < BASE.fatigue.rested) target += M.rested;
    p.morale = clamp(Math.round((p.morale ?? M.start) + (target - (p.morale ?? M.start)) * M.settle), 0, 100);
    const working = p.post || (p.status === 'active' && p.assignedTo != null && p.role !== 'guard' && p.role !== 'technician');
    const d = p.status === 'training' ? BASE.fatigue.training : p.post ? BASE.fatigue.post : (p.wounds || 0) > 0 ? BASE.fatigue.rest : working ? BASE.fatigue.post / 2 : BASE.fatigue.rest;
    p.fatigue = clamp((p.fatigue ?? 0) + d, 0, 100);
  }
  // readiness, with its parts
  const active = people.filter((p) => p.status === 'active').length;
  const armedKinds = people.filter((p) => CLASSES[p.role]?.tiers && Object.keys(CLASSES[p.role].tiers).length);
  const f = {
    strength: active / people.length,
    morale: people.reduce((a, p) => a + p.morale, 0) / people.length / 100,
    armed: armedKinds.length ? armedKinds.filter((p) => p.weapon).length / armedKinds.length : 1,
    fed: fed.size / people.length,
    housed: housed.size / people.length,
  };
  const R = BASE.readiness;
  const readiness = Math.round(100 * (f.strength * R.strength + f.morale * R.morale + f.armed * R.armed + f.fed * R.fed + f.housed * R.housed));
  const short = [];
  if (fed.size < people.length) short.push(`${people.length - fed.size} unfed: ${stockOf(game, 'supply:rations') ? '' : 'no rations in the stores'}`.trim());
  if (housed.size < people.length) short.push(`${people.length - housed.size} without a bed (${cap.beds} beds)`);
  if (wounded.length > cap.treat) short.push(`${wounded.length - cap.treat} wounded beyond the ${cap.treat} treatment places`);
  C.base = { ...C.base, day, readiness, factors: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Math.round(v * 100) / 100])), fedCount: fed.size, hotCount: hot.size, housedCount: housed.size, treated, wounded: wounded.length, short };
  if (fed.size < people.length) note(game, C, 'hunger', `The base is short of rations: ${people.length - fed.size} went hungry today. Buy rations from the suppliers.`);
  if (housed.size < people.length) note(game, C, 'beds', `The base is overcrowded: ${people.length - housed.size} of ${people.length} have no bed. Build another barracks.`);
  if (readiness < 40) note(game, C, 'readiness', `The company's readiness has fallen to ${readiness}%.`);
}

/** What the Base screen shows (null when there is no company). */
export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  const B = C.base || {};
  const cap = capacity(game);
  return { readiness: B.readiness ?? 0, factors: B.factors || {}, short: B.short || [], people: alive(C).length, beds: cap.beds, meals: cap.meals, treat: cap.treat, training: cap.training, stores: cap.stores, treated: B.treated || 0, wounded: B.wounded || 0,
    rations: stockOf(game, 'supply:rations'), medicine: stockOf(game, 'supply:medicine'), morale: alive(C).length ? Math.round(alive(C).reduce((a, p) => a + (p.morale ?? 70), 0) / alive(C).length) : 0, day: B.day || 0 };
}
