// Air power on the strategic map (v0.103.9; src/content/airpower.js): wings raised from the company's real aircraft, based at an airfield the employer's side holds, flying one mission a day. Nothing is
// spawned: an aircraft is a saved record locked to its wing (`wing`, status 'deployed'), a strike spends a real missile, and a loss is permanent. Satellites the company owns (Aerospace's network)
// raise the fog over the whole theatre. Pure rules over `world.military.war` (`wings`, `air`) and the clock.
//
//   raiseWing(game, { name, aircraft })   disbandWing(game, id)        aircraft from the hangars into a wing, and back
//   deployWing(game, id, provinceId) / recallWing(game, id)            to an airfield province of the employer's, and home
//   mission(game, id, { type, to })       recon | cas | interdict | strike, one a day, within range
//   takeCut(game, prov, side)             what air power takes off a force before a fight at a province (used once), 0 to 0.4
//   wingsView(game)                       everything the screen shows
// Saved: war.wings = [{ id, name, aircraft:[ids], base, status:'home'|'abroad', flown }], war.air = { recon: { prov: untilHour }, cas: { prov: cut }, strike: { prov: cut }, interdict: { prov: untilDay } }
import { peekMilitary } from './state.js';
import { warOf, controllerOf, nowHour, note, nextId, countryName } from './strategic.js';
import { provinces, provinceById } from '../world/provinces.js';
import { AIR } from '../content/airpower.js';
import { hooks } from './hooks.js';
import { VEHICLES } from '../content/procurement.js';

const km = (a, b) => { const R = 6371; const D = Math.PI / 180; const x = Math.sin(((b.lat - a.lat) * D) / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(((b.lon - a.lon) * D) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const provinceKm = km;
const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const company = (g) => peekMilitary(g)?.company || null;
const lookOf = (game, x) => game.aero?.cfg?.products?.[x.type]?.look || null;
const kindOf = (game, x) => lookOf(game, x)?.kind || 'fighter';
const alive = (game, w) => w.aircraft.map((id) => company(game).equipment.find((e) => e.id === id)).filter((e) => e && e.status !== 'destroyed');
export const wingsOf = (game) => (warOf(game)?.wings || []);

/** A wing's reach from its airfield: that of its shortest-legged aircraft. */
export const reachOf = (game, w) => Math.min(...alive(game, w).map((x) => AIR.range[kindOf(game, x)] || 600), Infinity);
const weightOf = (game, w) => alive(game, w).reduce((a, x) => a + (AIR.weight[kindOf(game, x)] || 1), 0);

export function raiseWing(game, { name, aircraft } = {}) {
  const w = warOf(game); const C = company(game); if (!w || !C?.identity) return { ok: false, text: 'You have no company.' };
  const ids = [...new Set(aircraft || [])]; if (!ids.length) return { ok: false, text: 'Choose at least one aircraft.' };
  const picked = [];
  for (const id of ids) {
    const x = C.equipment.find((e) => e.id === id);
    if (!x || x.kind !== 'aircraft') return { ok: false, text: `${id} is not an aircraft of the company.` };
    if (x.status !== 'stored') return { ok: false, text: `${x.name} ${id} is ${x.status}: only an aircraft in the hangars can join a wing.` };
    picked.push(x);
  }
  const id = nextId(w, 'W'); const n = w.wings.length + 1;
  const wing = { id, name: String(name || '').trim().slice(0, 28) || `${n}${[, 'st', 'nd', 'rd'][n % 10] && ![11, 12, 13].includes(n % 100) ? [, 'st', 'nd', 'rd'][n % 10] : 'th'} Air Wing`, aircraft: ids, base: null, status: 'home', flown: 0 };
  w.wings.push(wing); for (const x of picked) { x.status = 'deployed'; x.wing = id; }
  C.log.push({ day: game.clock.day, text: `${wing.name} raised from ${ids.length} aircraft.` });
  return { ok: true, text: `${wing.name} is raised: ${ids.length} aircraft.`, id };
}

export function disbandWing(game, id) {
  const w = warOf(game); const C = company(game); const wing = w?.wings.find((x) => x.id === id); if (!wing) return { ok: false, text: 'No such wing.' };
  if (wing.status !== 'home') return { ok: false, text: `${wing.name} is abroad: recall it first.` };
  for (const x of alive(game, wing)) { x.status = 'stored'; delete x.wing; }
  w.wings = w.wings.filter((x) => x !== wing); C.log.push({ day: game.clock.day, text: `${wing.name} stood down.` });
  return { ok: true, text: `${wing.name} is stood down; the aircraft are in the hangars.` };
}

/** Where a wing can be based: any ground the employer's side holds in its theatre (the atlas models only two airfields in the whole world, none in a theatre, so an expeditionary wing uses a strip on held ground; a province with an airfield, a port or a capital is simply the sensible place). */
export const hasStrip = () => true;

/** The places the employer's side holds in its theatre where a wing can be based, by name. */
export function airfields(game) {
  const w = warOf(game); const e = w?.employer; if (!e) return [];
  return provinces().filter((p) => hasStrip(p) && controllerOf(game, p) === e.side && theatreHas(game, p)).sort((a, b) => a.name.localeCompare(b.name));
}
const theatreHas = (game, p) => { const e = warOf(game)?.employer; return !e || hooks.inEmployerTheatre?.(game, p) !== false; };

export function deployWing(game, id, provinceId) {
  const w = warOf(game); const wing = w?.wings.find((x) => x.id === id); if (!wing) return { ok: false, text: 'No such wing.' };
  if (!w.employer) return { ok: false, text: 'Enlist in a theatre first: a wing flies for the side you serve.' };
  if (wing.status === 'abroad') return { ok: false, text: `${wing.name} is already abroad.` };
  const p = provinceById(provinceId); if (!p || !hasStrip(p)) return { ok: false, text: 'No such province.' };
  if (controllerOf(game, p) !== w.employer.side) return { ok: false, text: 'That airfield is not held by the side you serve.' };
  wing.status = 'abroad'; wing.base = p.id; note(w, game, `${wing.name} flies out to ${p.name}.`);
  return { ok: true, text: `${wing.name} deploys to ${p.name}.` };
}
export function recallWing(game, id) {
  const w = warOf(game); const wing = w?.wings.find((x) => x.id === id); if (!wing) return { ok: false, text: 'No such wing.' };
  if (wing.status !== 'abroad') return { ok: false, text: `${wing.name} is at home.` };
  wing.status = 'home'; wing.base = null; note(w, game, `${wing.name} flies home.`);
  return { ok: true, text: `${wing.name} is home.` };
}

/** Provinces a wing could be sent against from where it is, with the distance: the enemy's, within reach, nearest first. */
export function targets(game, id, limit = 24) {
  const w = warOf(game); const wing = w?.wings.find((x) => x.id === id); if (!wing || wing.status !== 'abroad' || !w.employer) return [];
  const base = provinceById(wing.base); const reach = reachOf(game, wing);
  return provinces().filter((p) => controllerOf(game, p) === w.employer.enemy).map((p) => ({ p, d: km(base, p) })).filter((x) => x.d <= reach).sort((a, b) => a.d - b.d).slice(0, limit).map((x) => ({ id: x.p.id, name: x.p.name, km: Math.round(x.d), fort: x.p.fort }));
}

export function mission(game, id, { type, to } = {}) {
  const w = warOf(game); const C = company(game); const wing = w?.wings.find((x) => x.id === id); if (!wing) return { ok: false, text: 'No such wing.' };
  if (!AIR.missions[type]) return { ok: false, text: 'No such mission.' };
  if (wing.status !== 'abroad' || !w.employer) return { ok: false, text: `${wing.name} is not abroad: deploy it to an airfield first.` };
  if (wing.flown >= game.clock.day) return { ok: false, text: `${wing.name} has flown today: the aircraft need a night's work.` };
  const air = alive(game, wing); if (!air.length) return { ok: false, text: `${wing.name} has no aircraft left.` };
  const target = provinceById(to); if (!target) return { ok: false, text: 'No such province.' };
  if (controllerOf(game, target) !== w.employer.enemy) return { ok: false, text: 'A wing flies against the enemy only.' };
  const base = provinceById(wing.base); const d = km(base, target); const reach = reachOf(game, wing);
  if (d > reach) return { ok: false, text: `${target.name} is ${Math.round(d)} km from ${base.name}; the wing reaches ${Math.round(reach)} km.` };
  let missile = null;
  if (type === 'strike') { missile = C.equipment.find((e) => e.kind === 'missile' && e.status === 'stored' && e.assignedTo == null); if (!missile) return { ok: false, text: 'A strike spends a strategic missile, and the stores have none.' }; }
  // every check passed: now the changes. A strike spends its missile; each aircraft may be lost (permanently).
  if (missile) { missile.status = 'destroyed'; missile.expended = game.clock.day; }
  wing.flown = game.clock.day;
  const day = game.clock.day; const lost = [];
  for (const x of air) { const p = (AIR.loss.base + AIR.loss.perFort * (target.fort || 0)) * (AIR.loss[type] ?? 1); if (unit(`air|${wing.id}|${x.id}|${day}|${type}`) < p) { x.status = 'destroyed'; x.lostDay = day; lost.push(x); } }
  for (const x of lost) { wing.aircraft = wing.aircraft.filter((i) => i !== x.id); delete x.wing; }
  const survivors = air.filter((x) => !lost.includes(x)); const wt = survivors.reduce((a, x) => a + (AIR.weight[kindOf(game, x)] || 1), 0);
  let effect = '';
  if (type === 'recon') { w.air.recon[target.id] = nowHour(game) + AIR.recon.hours; effect = `${target.name} and its neighbours are seen for a day.`; }
  else if (type === 'cas') { const cut = Math.min(AIR.cas.max, AIR.cas.cut * wt); w.air.cas[target.id] = Math.max(w.air.cas[target.id] || 0, cut); effect = `the next fight at ${target.name} meets ${Math.round(cut * 100)}% fewer of the enemy.`; }
  else if (type === 'interdict') { w.air.interdict[target.id] = day + AIR.interdict.days; effect = `${target.name}'s garrison is cut by ${Math.round(AIR.interdict.cut * 100)}% for ${AIR.interdict.days} days.`; }
  else if (type === 'strike') { w.air.strike[target.id] = AIR.strike.cut; effect = `a missile strikes ${target.name}: ${Math.round(AIR.strike.cut * 100)}% fewer of the enemy in the next fight there.`; }
  if (type !== 'recon' && !survivors.length) effect = 'the wing was lost before it could do anything.';
  const text = `${wing.name}: ${AIR.missions[type]} over ${target.name}; ${effect}${lost.length ? ` Lost: ${lost.map((x) => `${x.name} ${x.id}`).join(', ')}.` : ''}`;
  note(w, game, text); if (lost.length) game.notify?.(`${wing.name} lost ${lost.length} aircraft over ${target.name}.`, 'warn');
  return { ok: true, text, lost: lost.length };
}

/** What air power takes off the enemy before a fight at a province (the cut is used up by the fight). For a battle against our own province, `ours` is true and it is our cover that counts. */
export function takeCut(game, prov) {
  const w = warOf(game); if (!w?.air) return 0;
  const cas = w.air.cas[prov.id] || 0; const strike = w.air.strike[prov.id] || 0; delete w.air.cas[prov.id]; delete w.air.strike[prov.id];
  return Math.min(0.7, cas + strike);
}
/** The share of a province's garrison cut by interdiction today. */
export function interdiction(game, prov) {
  const w = warOf(game); const until = w?.air?.interdict?.[prov.id]; return until && until >= game.clock.day ? AIR.interdict.cut : 0;
}

/** The intel sources air power gives (used by intelLevels): working satellites cover the whole theatre, a recon pass the target and what is next to it. */
hooks.airSources = (game) => {
  const w = warOf(game); const e = w?.employer; if (!e) return [];
  const out = []; const A = game.aero?.state?.satellites || {};
  let level = 0;
  for (const s of Object.values(A)) if (s.own && (s.status === 'operational' || s.status === 'degraded')) level = Math.max(level, AIR.satellites[s.product] || 0);
  if (level) for (const p of provinces()) if (hooks.inEmployerTheatre?.(game, p) !== false) out.push(level >= 2 ? { n: p.n, known: 0, spotted: 0 } : { n: p.n, known: -1, spotted: 0 });
  const h = nowHour(game);
  for (const [pid, until] of Object.entries(w.air?.recon || {})) if (until >= h) { const p = provinceById(pid); if (p) out.push({ n: p.n, known: 0, spotted: 1 }); }
  return out;
};

hooks.airCut = (game, prov) => takeCut(game, prov);
hooks.airInterdiction = (game, prov) => interdiction(game, prov);
hooks.airPay = (game) => dailyPay(game);

/** The daily retainer for the aircraft of wings abroad, at the helicopter's vehicle rate (the owner's rule: the vehicle scale), and a clean-up of old effects. */
export function dailyPay(game) {
  const w = warOf(game); if (!w) return 0; let pay = 0;
  for (const wing of w.wings) if (wing.status === 'abroad' && w.employer) pay += alive(game, wing).length * AIR.perAircraft;
  const day = game.clock.day; const h = nowHour(game);
  for (const k of Object.keys(w.air.recon)) if (w.air.recon[k] < h) delete w.air.recon[k];
  for (const k of Object.keys(w.air.interdict)) if (w.air.interdict[k] < day) delete w.air.interdict[k];
  return pay;
}

export function wingsView(game) {
  const w = warOf(game); const C = company(game); if (!w || !C?.identity) return null;
  const free = C.equipment.filter((e) => e.kind === 'aircraft' && e.status === 'stored').map((e) => ({ id: e.id, name: e.name, kind: kindOf(game, e) }));
  const missiles = C.equipment.filter((e) => e.kind === 'missile' && e.status === 'stored' && e.assignedTo == null).length;
  const sats = Object.values(game.aero?.state?.satellites || {}).filter((s) => s.own && (s.status === 'operational' || s.status === 'degraded') && AIR.satellites[s.product]).map((s) => ({ name: game.aero.cfg.products[s.product].name, level: AIR.satellites[s.product] }));
  return { free, missiles, satellites: sats, airfields: airfields(game).map((p) => ({ id: p.id, name: p.name, country: countryName(p.country) })), missions: AIR.missions,
    wings: w.wings.map((x) => ({ ...x, aircraftNow: alive(game, x).map((e) => ({ id: e.id, name: e.name, kind: kindOf(game, e) })), reach: Math.round(reachOf(game, x)), weight: Math.round(weightOf(game, x) * 10) / 10, baseName: x.base ? provinceById(x.base).name : null, canFly: x.status === 'abroad' && x.flown < game.clock.day })) };
}
