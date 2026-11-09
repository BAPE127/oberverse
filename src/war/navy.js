// Fleets on the strategic map (v0.103.10; src/content/navy.js): ships lent by the shipping company, never copied. A fleet is a list of the company's own vessels (warships, and cargo ships as transports)
// held with a reserved marker on the vessel (`cargo: { type: 'war', fleet, reserved: true }`, the way Aerospace holds a ship), based at a coastal province the employer holds. It bombards and blockades the
// enemy's coasts, and it carries a battalion: over the sea between coastal provinces ("sail") or onto an enemy coast ("landing", which meets a contested beach and risks the ships). A ship lost is lost for good
// in the shipping company's books. The atlas has no sea zones, so a fleet works the waters off the coastal provinces of its theatre (a stated limit).
//
//   raiseFleet(game, { name, ships }) / disbandFleet(game, id)     ships out of the shipping company's yards into a fleet, and back
//   deployFleet(game, id, provinceId) / recallFleet(game, id)      to a coastal province the employer holds, and home
//   mission(game, id, { type, to })                                bombard | blockade, one a day, within reach of the base
//   landingPlan(game, bn, to, fleetId)                             what an order of the 'land' kind needs: a fleet, the room in its holds, the hours (used by strategic.order through a hook)
//   takeCut(game, prov) / blockaded(game, prov)                    what bombardment took off a force before a fight (used once) / the share of a garrison cut by a blockade today
//   fleetsView(game)                                               everything the screen shows
// Saved: war.fleets = [{ id, name, ships:[vesselIds], base, status:'home'|'abroad', acted }], war.navy = { bombard: { prov: cut }, blockade: { prov: untilDay } }
import { peekMilitary } from './state.js';
import { warOf, controllerOf, nowHour, note, nextId, countryName, unit, providedBy } from './strategic.js';
import { provinces, provinceById } from '../world/provinces.js';
import { NAVY } from '../content/navy.js';
import { hooks } from './hooks.js';

const km = (a, b) => { const R = 6371; const D = Math.PI / 180; const x = Math.sin(((b.lat - a.lat) * D) / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(((b.lon - a.lon) * D) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const Lg = (game) => game.logistics;
const vesselOf = (game, id) => Lg(game)?.vessel?.(id) || null;
const isWar = (v) => v.kind === 'warship';
export const fleetsOf = (game) => (warOf(game)?.fleets || []);
const live = (game, f) => f.ships.map((id) => vesselOf(game, id)).filter((v) => v && v.status !== 'lost' && v.status !== 'retired');
const attackOf = (game, v) => Lg(game).stats(v).combat.attack || 0;
const defenceOf = (game, v) => Lg(game).stats(v).combat.defense || 0;
/** Firepower of a fleet's warships (a point is 50 attack). */
export const firepower = (game, f) => live(game, f).filter(isWar).reduce((a, v) => a + attackOf(game, v) / 50, 0);
/** Escort strength: the warships' attack and defence together (a point is 100). */
export const escortOf = (game, f) => live(game, f).filter(isWar).reduce((a, v) => a + (attackOf(game, v) + defenceOf(game, v)) / 100, 0);
/** Places in the holds of the fleet's ships (a soldier takes one, a vehicle five). */
export const holdOf = (game, f) => live(game, f).reduce((a, v) => a + (Lg(game).stats(v).capacity || 0), 0);
/** A fleet's slowest ship, in km an hour. */
const speedOf = (game, f) => Math.max(1, Math.min(...live(game, f).map((v) => Lg(game).stats(v).speed * NAVY.knot), Infinity));
/** A fleet on a landing or a sea passage: its battalion is on the water. */
export const busy = (game, f) => (warOf(game)?.battalions || []).some((b) => b.moving?.sea && b.moving.fleet === f.id);

const lend = (v, f) => { v.cargo = { type: 'war', fleet: f.id, reserved: true }; };
const free = (v) => { if (v?.cargo?.type === 'war') v.cargo = null; };
const loseShip = (game, f, v, why) => {
  f.ships = f.ships.filter((i) => i !== v.id); free(v);
  try { Lg(game).setStatus(v, 'lost'); } catch { v.status = 'lost'; }
  Lg(game).report?.('mission', `⚓ The ${v.name} is lost ${why}.`, 'warn');
};

export function raiseFleet(game, { name, ships } = {}) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity) return { ok: false, text: 'You have no company.' };
  const ids = [...new Set(ships || [])]; if (!ids.length) return { ok: false, text: 'Choose at least one ship.' };
  const picked = [];
  for (const id of ids) {
    const v = vesselOf(game, id); if (!v) return { ok: false, text: `${id} is not a ship of the shipping company.` };
    if (v.status !== 'docked') return { ok: false, text: `The ${v.name} is ${v.status}: only a ship docked in a port can be lent.` };
    if (v.contract || v.cargo) return { ok: false, text: `The ${v.name} is on a contract or held for other cargo.` };
    if (!isWar(v) && !(Lg(game).stats(v).capacity > 0)) return { ok: false, text: `The ${v.name} is neither a warship nor a ship with holds.` };
    picked.push(v);
  }
  const id = nextId(w, 'F'); const n = w.fleets.length + 1;
  const fleet = { id, name: String(name || '').trim().slice(0, 28) || `${n}${[, 'st', 'nd', 'rd'][n % 10] && ![11, 12, 13].includes(n % 100) ? [, 'st', 'nd', 'rd'][n % 10] : 'th'} Fleet`, ships: ids, base: null, status: 'home', acted: 0 };
  w.fleets.push(fleet); for (const v of picked) lend(v, fleet);
  C.log.push({ day: game.clock.day, text: `${fleet.name} formed from ${ids.length} ship${ids.length === 1 ? '' : 's'} lent by the shipping company.` });
  return { ok: true, text: `${fleet.name} is formed: ${ids.length} ship${ids.length === 1 ? '' : 's'}, lent by the shipping company.`, id };
}
export function disbandFleet(game, id) {
  const w = warOf(game); const f = w?.fleets.find((x) => x.id === id); if (!f) return { ok: false, text: 'No such fleet.' };
  if (f.status !== 'home') return { ok: false, text: `${f.name} is abroad: recall it first.` };
  for (const v of live(game, f)) free(v);
  w.fleets = w.fleets.filter((x) => x !== f); return { ok: true, text: `${f.name} is stood down; the ships are back with the shipping company.` };
}

/** The coastal ground the employer's side holds in its theatre, where a fleet can be based. */
export function bases(game) {
  const w = warOf(game); const e = w?.employer; if (!e) return [];
  return provinces().filter((p) => p.coast && controllerOf(game, p) === e.side && hooks.inEmployerTheatre?.(game, p) !== false).sort((a, b) => a.name.localeCompare(b.name));
}
export function deployFleet(game, id, provinceId) {
  const w = warOf(game); const f = w?.fleets.find((x) => x.id === id); if (!f) return { ok: false, text: 'No such fleet.' };
  if (!w.employer) return { ok: false, text: 'Enlist in a theatre first: a fleet sails for the side you serve.' };
  if (f.status === 'abroad') return { ok: false, text: `${f.name} is already abroad.` };
  const p = provinceById(provinceId); if (!p || !p.coast) return { ok: false, text: 'A fleet is based on a coast.' };
  if (controllerOf(game, p) !== w.employer.side) return { ok: false, text: 'That coast is not held by the side you serve.' };
  const ships = live(game, f); if (!ships.length) return { ok: false, text: `${f.name} has no ships left.` };
  for (const v of ships) try { Lg(game).setStatus(v, 'mission'); } catch { return { ok: false, text: `The ${v.name} cannot put to sea (${v.status}).` }; }
  f.status = 'abroad'; f.base = p.id; note(w, game, `${f.name} sails for ${p.name}.`);
  return { ok: true, text: `${f.name} sails for ${p.name}.` };
}
export function recallFleet(game, id) {
  const w = warOf(game); const f = w?.fleets.find((x) => x.id === id); if (!f) return { ok: false, text: 'No such fleet.' };
  if (f.status !== 'abroad') return { ok: false, text: `${f.name} is at home.` };
  if (busy(game, f)) return { ok: false, text: `${f.name} has a battalion aboard: let it land first.` };
  for (const v of live(game, f)) if (v.status === 'mission') try { Lg(game).setStatus(v, 'docked'); } catch { /* already home */ }
  f.status = 'home'; f.base = null; note(w, game, `${f.name} comes home.`); return { ok: true, text: `${f.name} is home.` };
}

/** Enemy coasts a fleet could be sent against from its base: within reach, nearest first. */
export function targets(game, id, limit = 24) {
  const w = warOf(game); const f = w?.fleets.find((x) => x.id === id); if (!f || f.status !== 'abroad' || !w.employer) return [];
  const base = provinceById(f.base);
  return provinces().filter((p) => p.coast && controllerOf(game, p) === w.employer.enemy).map((p) => ({ p, d: km(base, p) })).filter((x) => x.d <= NAVY.reach).sort((a, b) => a.d - b.d).slice(0, limit).map((x) => ({ id: x.p.id, name: x.p.name, km: Math.round(x.d), fort: x.p.fort, vp: x.p.vp }));
}

function wearAndLose(game, f, kind, fort, escorted) {
  const day = game.clock.day; const lost = [];
  const esc = escorted ? 1 - NAVY.loss.escortCut * Math.min(1, escortOf(game, f) / NAVY.landing.escortFull) : 1;
  for (const v of live(game, f)) {
    v.condition = Math.max(0, Math.round(((v.condition ?? 100) - NAVY.wear[kind]) * 10) / 10);
    const p = (NAVY.loss.base + NAVY.loss.perFort * fort) * (NAVY.loss[kind] ?? 1) * esc;
    if (unit(`navy|${f.id}|${v.id}|${day}|${kind}`) < p) lost.push(v);
  }
  for (const v of lost) loseShip(game, f, v, `off the enemy coast (${kind})`);
  return lost;
}

export function mission(game, id, { type, to } = {}) {
  const w = warOf(game); const f = w?.fleets.find((x) => x.id === id); if (!f) return { ok: false, text: 'No such fleet.' };
  if (!NAVY.missions[type]) return { ok: false, text: 'No such mission.' };
  if (f.status !== 'abroad' || !w.employer) return { ok: false, text: `${f.name} is not abroad: base it on a coast first.` };
  if (f.acted >= game.clock.day) return { ok: false, text: `${f.name} has acted today: the ships need a night in port.` };
  if (busy(game, f)) return { ok: false, text: `${f.name} has a battalion aboard.` };
  const guns = live(game, f).filter(isWar); if (!guns.length) return { ok: false, text: `${f.name} has no warship left.` };
  const target = provinceById(to); if (!target) return { ok: false, text: 'No such province.' };
  if (controllerOf(game, target) !== w.employer.enemy) return { ok: false, text: 'A fleet acts against the enemy only.' };
  if (!target.coast) return { ok: false, text: `${target.name} has no coast.` };
  const d = km(provinceById(f.base), target); if (d > NAVY.reach) return { ok: false, text: `${target.name} is ${Math.round(d)} km from ${provinceById(f.base).name}; the fleet reaches ${NAVY.reach} km.` };
  f.acted = game.clock.day; const day = game.clock.day;
  const lost = wearAndLose(game, f, type, target.fort || 0, false); const left = live(game, f).filter(isWar);
  let effect;
  if (!left.length) effect = 'the fleet was beaten off before it could do anything.';
  else if (type === 'bombard') { const cut = Math.min(NAVY.bombard.max, NAVY.bombard.cut * firepower(game, f)); w.navy.bombard[target.id] = Math.max(w.navy.bombard[target.id] || 0, cut); effect = `the next fight at ${target.name} meets ${Math.round(cut * 100)}% fewer of the enemy.`; }
  else { w.navy.blockade[target.id] = day + NAVY.blockade.days; effect = `${target.name}'s port is shut: its garrison is cut by ${Math.round(NAVY.blockade.cut * 100)}% for ${NAVY.blockade.days} days.`; }
  const text = `${f.name}: ${NAVY.missions[type].toLowerCase()} off ${target.name}; ${effect}${lost.length ? ` Lost: ${lost.map((v) => v.name).join(', ')}.` : ''}`;
  note(w, game, text); if (lost.length) game.notify?.(`${f.name} lost ${lost.length} ship${lost.length === 1 ? '' : 's'} off ${target.name}.`, 'warn');
  return { ok: true, text, lost: lost.length };
}

/** What bombardment took off the enemy before a fight at a province (used up by the fight). */
export function takeCut(game, prov) {
  const w = warOf(game); if (!w?.navy) return 0; const cut = w.navy.bombard[prov.id] || 0; delete w.navy.bombard[prov.id]; return Math.min(0.6, cut);
}
/** The share of a province's garrison cut by a blockade today. */
export function blockaded(game, prov) {
  const w = warOf(game); const until = w?.navy?.blockade?.[prov.id]; return until && until >= game.clock.day ? NAVY.blockade.cut : 0;
}
hooks.navalCut = (game, prov) => takeCut(game, prov);
hooks.navalBlockade = (game, prov) => blockaded(game, prov);

/** An order of the 'land' kind (strategic.js asks through a hook): onto an enemy coast it is a landing, to a coast the employer holds it is a passage by sea. */
export function landingPlan(game, bn, to, fleetId) {
  const w = warOf(game); const e = w?.employer; const here = provinceById(bn.pos);
  if (!here.coast) return { ok: false, text: `${here.name} has no coast to embark from: move to a coastal province first.` };
  if (!to.coast) return { ok: false, text: `${to.name} has no coast.` };
  if (to.id === bn.pos) return { ok: false, text: 'It is already there.' };
  const mine = controllerOf(game, to) === e.side; const foe = controllerOf(game, to) === e.enemy;
  if (!mine && !foe) return { ok: false, text: 'You sail only to ground you hold, or land on ground the enemy holds.' };
  const P = providedBy(game, bn.squads); const need = P.people * NAVY.landing.perSoldier + P.vehicles * NAVY.landing.perVehicle;
  const d = km(here, to); if (d > NAVY.landing.range) return { ok: false, text: `${to.name} is ${Math.round(d)} km away; a fleet carries a battalion ${NAVY.landing.range} km.` };
  const cand = w.fleets.filter((f) => f.status === 'abroad' && (!fleetId || f.id === fleetId) && !busy(game, f) && live(game, f).length && km(provinceById(f.base), here) <= NAVY.meet);
  if (!cand.length) return { ok: false, text: fleetId ? 'That fleet cannot take the battalion aboard (it is not abroad, busy, or too far from where the battalion stands).' : `No fleet of yours is abroad within ${NAVY.meet} km of ${here.name}: lend ships from the shipping company and base them on a coast near it (Base Operations, Fleets).` };
  const fit = cand.filter((f) => holdOf(game, f) >= need).sort((a, b) => escortOf(game, b) - escortOf(game, a));
  if (!fit.length) return { ok: false, text: `${bn.name} needs room for ${need} (${P.people} soldiers and ${P.vehicles} vehicles); the best fleet has ${Math.max(...cand.map((f) => holdOf(game, f)))}. Add cargo ships.` };
  const f = fit[0]; const hours = Math.max(NAVY.landing.minHours, Math.ceil(d * 1.1 / speedOf(game, f)));
  const relief = Math.min(NAVY.landing.escortShare, NAVY.landing.escortShare * escortOf(game, f) / NAVY.landing.escortFull);
  return { ok: true, fleet: f.id, hours, foe, penalty: foe ? Math.round(NAVY.landing.penalty * (1 - relief) * 100) / 100 : 0, org: foe ? NAVY.landing.orgCost : 2, text: `${bn.name} embarks in ${f.name}: ${foe ? `a landing at ${to.name}, about ${hours} hours; the beach gives the enemy ${Math.round(NAVY.landing.penalty * (1 - relief) * 100)}% more${relief > 0 ? ` (escorts take ${Math.round(relief * 100)}% of that off)` : ''}` : `a passage to ${to.name}, about ${hours} hours`}.` };
}
hooks.landingPlan = landingPlan;

/** Called when a landing meets the beach: the fleet pays for it. Returns the ships lost. */
hooks.landingContact = (game, w, bn, prov, sea) => {
  const f = w.fleets.find((x) => x.id === sea.fleet); if (!f) return [];
  const lost = wearAndLose(game, f, 'landing', prov.fort || 0, true);
  if (lost.length) { note(w, game, `${f.name} loses ${lost.map((v) => v.name).join(', ')} covering the landing at ${prov.name}.`); game.notify?.(`${f.name} lost ${lost.length} ship${lost.length === 1 ? '' : 's'} at ${prov.name}.`, 'warn'); }
  return lost;
};

/** Once a day: a fleet abroad is paid like the other vehicles in the theatre (its ships on a contract at the contract's rate), and old effects are cleared. */
export function dailyPay(game) {
  const w = warOf(game); if (!w) return 0; let pay = 0;
  for (const f of w.fleets) {
    if (f.status !== 'abroad' || !w.employer) continue;
    const c = (w.intl?.active || []).find((x) => (x.fleets || []).includes(f.id)); const rate = c ? c.rate : 1;
    for (const v of live(game, f)) pay += (isWar(v) ? NAVY.pay.warship : NAVY.pay.transport) * rate;
  }
  const day = game.clock.day; for (const k of Object.keys(w.navy.blockade)) if (w.navy.blockade[k] < day) delete w.navy.blockade[k];
  return Math.round(pay);
}
hooks.navyPay = (game) => dailyPay(game);

/** A ship the shipping company lost or retired some other way drops out of its fleet. */
export function sweep(game) {
  const w = warOf(game); if (!w) return;
  for (const f of w.fleets) f.ships = f.ships.filter((id) => { const v = vesselOf(game, id); return v && v.status !== 'lost' && v.status !== 'retired'; });
}

export function fleetsView(game) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity || !Lg(game)) return null;
  sweep(game);
  const row = (v) => { const s = Lg(game).stats(v); return { id: v.id, name: v.name, model: v.model, role: isWar(v) ? 'warship' : 'transport', attack: s.combat.attack || 0, defense: s.combat.defense || 0, hold: s.capacity || 0, speed: Math.round(s.speed * NAVY.knot), condition: Math.round(v.condition ?? 100), port: v.port }; };
  const freeShips = Lg(game).vessels().filter((v) => v.status === 'docked' && !v.contract && !v.cargo && (isWar(v) || Lg(game).stats(v).capacity > 0)).map(row);
  return {
    free: freeShips, bases: bases(game).map((p) => ({ id: p.id, name: p.name, country: countryName(p.country) })), missions: NAVY.missions, reach: NAVY.reach,
    fleets: w.fleets.map((f) => ({ id: f.id, name: f.name, status: f.status, base: f.base, baseName: f.base ? provinceById(f.base).name : null, ships: live(game, f).map(row), firepower: Math.round(firepower(game, f) * 10) / 10, escort: Math.round(escortOf(game, f) * 10) / 10, hold: holdOf(game, f), busy: busy(game, f), contract: f.contract || null, canAct: f.status === 'abroad' && f.acted < game.clock.day && !busy(game, f) })),
    hour: nowHour(game),
  };
}

/** The shipping company's side of the books: every ship in a fleet exists and is held by that fleet; no ship is held by a fleet that is gone. */
export function checkFleets(game) {
  const w = warOf(game); const out = []; if (!w || !Lg(game)) return out;
  for (const f of w.fleets) for (const id of f.ships) { const v = vesselOf(game, id); if (!v) out.push({ kind: 'missing_reference', id: f.id, text: `fleet ${f.id} lists ${id}, which is not a ship of the shipping company` }); else if (v.status !== 'lost' && (v.cargo?.type !== 'war' || v.cargo.fleet !== f.id)) out.push({ kind: 'double_assignment', id, text: `${id} is in fleet ${f.id} but is not held by it` }); }
  for (const v of Lg(game).vessels()) if (v.cargo?.type === 'war' && !w.fleets.some((f) => f.id === v.cargo.fleet && f.ships.includes(v.id))) out.push({ kind: 'missing_reference', id: v.id, text: `the ${v.name} is held for fleet ${v.cargo.fleet}, which does not list it` });
  return out;
}
