// The strategic war (v0.103.0): battalions raised from the company's real squads and vehicles, enlisted for one side in a theatre, carried there by the employer's sealift, and ordered across
// the provinces of src/world/provinces.js. Attacking an enemy-held province opens an engagement (src/war/engagements.js), played or fought by a general like any other; its result is written
// once and moves the front. The saved record is `world.military.war`:
//     { v, control: { provinceId: country } (only provinces that changed hands), templates, battalions, employer, hour, battles, log, next }
// Pure rules over that record and the game's clock. Nothing is spawned: a battalion is the squads and vehicles it was raised from, and they are locked to it while it stands.
//
//   templates(game) / saveTemplate / removeTemplate     the recipes (built-in and your own)
//   needsOf(template) / providedBy(game, squadIds)      what a recipe asks and what chosen squads bring
//   raise(game, {template, name, squads}) / disband(game, id)
//   theatres(game) / enlist(game, {theatre, side}) / discharge(game)
//   deploy(game, id) / recall(game, id)                 sealift out and home
//   order(game, id, {type, to})                         move, attack, defend, hold, withdraw
//   advance(game)                                       the hours since last time (orders, marches, sealift, contact)
//   dayTick(game)                                       retainer, rest
//   view(game)                                          everything the map screen shows
import { peekMilitary } from './state.js';
import { provinces, provinceById, provinceAt } from '../world/provinces.js';
import { atlasTheatres } from '../world/atlas.js';
import { ATLAS } from '../content/atlas.js';
import { VEHICLES } from '../content/procurement.js';
import { CLASSES } from '../content/troops.js';
import { CARRY, styleOf } from '../content/battle.js';
import { TERRAIN_FX, INFRA_SPEED, MARCH, SEALIFT, RETAINER, BATTALION, GARRISON, SLOTS, MAX_LINE } from '../content/strategic.js';
import { CLASS_POWER } from './combat.js';
import { hooks } from './hooks.js';
import { openStrategic } from './engagements.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const nowHour = (game) => Math.floor(game.clock.total / 60);
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const countryName = (id) => ATLAS.countries[id]?.name || id;

/** The war record, with its defaults (an older save simply gains them). */
export function warOf(game) {
  const m = peekMilitary(game); if (!m) return null;
  const w = (m.war ||= {});
  w.v ||= 1; w.control ||= {}; w.templates ||= []; w.battalions ||= []; w.employer ??= null; w.hour ??= null; w.log ||= []; w.next ||= {}; w.battles ||= [];
  return w;
}
const touch = (w, game) => { if (w.hour === null) w.hour = nowHour(game); };
const nextId = (w, kind) => { w.next[kind] = (w.next[kind] || 0) + 1; return `${kind}${w.next[kind]}`; };
const note = (w, game, text) => { w.log.push({ day: game.clock.day, text }); while (w.log.length > 60) w.log.shift(); };

// ---- the ground: who holds what
export const controllerOf = (game, p) => warOf(game)?.control?.[p.id] ?? p.country;
const homeProvince = () => provinceAt(52.6, -21.5); // Fort Gullcrest's province: where a battalion is raised
const km = (a, b) => { const R = 6371; const D = Math.PI / 180; const x = Math.sin(((b.lat - a.lat) * D) / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(((b.lon - a.lon) * D) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

/** What an enemy-held province holds: from its fort, its victory points, its size and its infrastructure, with a spread by the province's own hash. Taken ground holds nothing. */
export function garrisonOf(game, p) {
  const w = warOf(game); const e = w?.employer; if (!e || controllerOf(game, p) === e.side) return { troops: 0, armour: 0, air: 0, aa: 0, battery: 0, skill: 1 };
  const spread = 1 - GARRISON.spread / 2 + GARRISON.spread * unit(`garrison|${p.id}`);
  const troops = Math.min(GARRISON.max, Math.round((GARRISON.base + GARRISON.perFort * p.fort + GARRISON.perVP * p.vp + (p.terrain === 'urban' ? GARRISON.urban : 0) + GARRISON.perInfra * p.infra) * spread));
  const armour = (p.fort >= 2 ? 1 : 0) + (p.capital ? 1 : 0) + (p.fort >= 4 ? 1 : 0);
  return { troops, armour, air: 0, aa: 0, battery: troops >= 28 ? 2 : troops >= 16 ? 1 : 0, skill: 1 };
}

// ---- templates
export const DEFAULT_TEMPLATES = [
  { id: 'tpl_rifle', name: 'Rifle Bn', line: ['inf', 'inf', 'inf', 'inf', 'at'], support: ['medical', 'signals'], attach: [], builtin: true },
  { id: 'tpl_armour', name: 'Armoured Bn', line: ['tank', 'tank', 'tank', 'tank', 'apc', 'apc', 'inf', 'inf'], support: ['recon', 'engineers', 'medical', 'logistics'], attach: ['spg'], builtin: true },
  { id: 'tpl_combined', name: 'Combined Arms Bn', line: ['tank', 'tank', 'apc', 'inf', 'inf', 'inf', 'at'], support: ['recon', 'antiair', 'engineers', 'medical', 'signals', 'logistics'], attach: ['spg', 'heli'], builtin: true },
];
export const templates = (game) => [...DEFAULT_TEMPLATES, ...(warOf(game)?.templates || [])];
const slotOk = (t) => Array.isArray(t.line) && t.line.length >= 1 && t.line.length <= MAX_LINE && t.line.every((s) => SLOTS.line[s]) && (t.support || []).every((s) => SLOTS.support[s]) && (t.attach || []).every((s) => SLOTS.attach[s]);
export function saveTemplate(game, t) {
  const w = warOf(game); if (!w) return { ok: false, text: 'You have no company.' };
  const name = String(t?.name || '').trim(); if (!name || name.length > 24) return { ok: false, text: 'Give the template a name of up to 24 letters.' };
  const tpl = { name, line: [...(t.line || [])], support: [...(t.support || [])], attach: [...(t.attach || [])] };
  if (!slotOk(tpl)) return { ok: false, text: `A template has one to ${MAX_LINE} line slots, and only slots the company may field.` };
  if (templates(game).some((x) => x.name === name && x.id !== t.id)) return { ok: false, text: 'There is already a template with that name.' };
  const old = t.id && w.templates.find((x) => x.id === t.id);
  if (old) { Object.assign(old, tpl); return { ok: true, text: `${name} is saved.`, id: old.id }; }
  tpl.id = nextId(w, 'T'); w.templates.push(tpl); return { ok: true, text: `${name} is saved.`, id: tpl.id };
}
export function removeTemplate(game, id) {
  const w = warOf(game); const t = w?.templates.find((x) => x.id === id); if (!t) return { ok: false, text: 'No such template of yours.' };
  if (w.battalions.some((b) => b.template === id)) return { ok: false, text: 'A battalion stands on it.' };
  w.templates = w.templates.filter((x) => x !== t); return { ok: true, text: 'Removed.' };
}

/** What a recipe asks, as rows: { key, label, icon, need }. */
export function needsOf(t) {
  const rows = new Map(); const add = (key, label, icon, n = 1) => { const r = rows.get(key) || { key, label, icon, need: 0 }; r.need += n; rows.set(key, r); };
  for (const s of t.line) { const d = SLOTS.line[s]; if (s === 'inf') add('squads', 'Squads with soldiers', d.icon); else if (d.need.role) add(`role:${d.need.role}`, CLASSES[d.need.role]?.name || d.name, d.icon); else add(`cls:${d.need.cls}`, d.need.cls === 'tank' ? 'Tanks' : 'Armoured carriers', d.icon); }
  for (const [group, list] of [['support', t.support || []], ['attach', t.attach || []]]) for (const s of list) {
    const d = SLOTS[group][s]; const nd = d.need;
    if (nd.either) add('recon', 'Recon (vehicle or soldier)', d.icon); else if (nd.role) add(`role:${nd.role}`, CLASSES[nd.role]?.name || d.name, d.icon); else add(`cls:${nd.cls}`, { antiair: 'Anti-air vehicles', logistics: 'Supply trucks', artillery: 'Artillery', helicopter: 'Helicopters', carrier: 'Armoured carriers', tank: 'Tanks' }[nd.cls] || d.name, d.icon);
  }
  return [...rows.values()];
}
const clsOf = (x) => VEHICLES[x.type]?.class || null;
/** What squads really bring: counts of soldiers by role, vehicles by class, and squads with someone in them. */
export function providedBy(game, squadIds) {
  const C = peekMilitary(game)?.company; const out = { squads: 0, role: {}, cls: {}, people: 0, vehicles: 0, carriage: 0, hulls: [] };
  for (const sid of squadIds) {
    const s = C?.squads.find((q) => q.id === sid); if (!s) continue;
    const ppl = s.members.map((m) => C.personnel.find((p) => p.id === m)).filter((p) => p && p.status === 'active');
    if (ppl.length) out.squads++;
    for (const p of ppl) { out.role[p.role] = (out.role[p.role] || 0) + 1; out.people++; }
    for (const e of s.equipment) { const x = C.equipment.find((q) => q.id === e); if (!x || x.status === 'destroyed') continue; const c = clsOf(x); if (c) out.cls[c] = (out.cls[c] || 0) + 1; out.vehicles++; if (c === 'carrier') out.carriage += CARRY[x.type] || 6; out.hulls.push(x); }
  }
  return out;
}
const supplyOf = (key, P) => (key === 'squads' ? P.squads : key === 'recon' ? (P.cls.recon || 0) + (P.role.recon || 0) : key.startsWith('role:') ? P.role[key.slice(5)] || 0 : P.cls[key.slice(4)] || 0);

// ---- raising a battalion
export function raise(game, { template, name, squads }) {
  const w = warOf(game); const C = peekMilitary(game)?.company;
  if (!w || !C?.identity) return { ok: false, text: 'You have no company.' };
  const tpl = templates(game).find((t) => t.id === template); if (!tpl) return { ok: false, text: 'Choose a template.' };
  if (!squads?.length) return { ok: false, text: 'Choose the squads it is made of.' };
  const chosen = squads.map((id) => C.squads.find((s) => s.id === id));
  if (chosen.some((s) => !s)) return { ok: false, text: 'No such squad.' };
  const busy = chosen.find((s) => s.status !== 'home'); if (busy) return { ok: false, text: busy.battalion ? `${busy.name} is already in a battalion.` : `${busy.name} is away.` };
  const P = providedBy(game, squads); const short = needsOf(tpl).filter((r) => supplyOf(r.key, P) < r.need).map((r) => `${r.need - supplyOf(r.key, P)} more of ${r.label.toLowerCase()} (${r.need} needed, ${supplyOf(r.key, P)} in these squads)`);
  if (short.length) return { ok: false, text: `These squads do not make a ${tpl.name}: ${short.join('; ')}. Nothing is invented to make up the difference.` };
  const leader = chosen.map((s) => C.personnel.find((p) => p.id === s.leader)).find((p) => p && p.status === 'active' && CLASSES[p.role]?.leads);
  if (!leader) return { ok: false, text: 'A battalion needs a commander: an officer who leads one of its squads.' };
  touch(w, game); const id = nextId(w, 'B'); const n = w.battalions.length + 1;
  const bn = { id, name: String(name || '').trim().slice(0, 28) || `${ordinal(n)} ${tpl.name}`, template: tpl.id, squads: [...squads], commander: leader.id, home: homeProvince().id, pos: homeProvince().id, status: 'home', org: BATTALION.orgMax, entrench: 0, start: { people: P.people, vehicles: P.vehicles }, order: { type: 'hold' }, moving: null, path: [], engaged: null, arrive: null, since: game.clock.day };
  for (const s of chosen) { s.status = 'battalion'; s.battalion = id; for (const e of s.equipment) { const x = C.equipment.find((q) => q.id === e); if (x && x.status === 'assigned') x.status = 'deployed'; } }
  w.battalions.push(bn); note(w, game, `${bn.name} is raised: ${P.people} soldiers, ${P.vehicles} vehicles, ${leader.name} commanding.`);
  return { ok: true, text: `${bn.name} is raised under ${leader.name}.`, id };
}
/** Soldiers of a battalion that is away are on a post (not drawn at the base, not for dismissal); at home they are not. */
function posting(game, bn, on) {
  const C = peekMilitary(game)?.company; if (!C) return;
  for (const sid of bn.squads) for (const m of C.squads.find((q) => q.id === sid)?.members || []) { const p = C.personnel.find((x) => x.id === m); if (p) { if (on) p.post = `battalion:${bn.id}`; else if (String(p.post).startsWith('battalion:')) p.post = null; } }
}
function release(game, bn) {
  const C = peekMilitary(game)?.company; if (!C) return;
  for (const sid of bn.squads) { const s = C.squads.find((q) => q.id === sid); if (!s) continue; s.status = 'home'; delete s.battalion; for (const e of s.equipment) { const x = C.equipment.find((q) => q.id === e); if (x && x.status === 'deployed') x.status = 'assigned'; } }
}
export function disband(game, id) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === id); if (!bn) return { ok: false, text: 'No such battalion.' };
  if (bn.status !== 'home') return { ok: false, text: `${bn.name} is ${bn.status === 'theatre' ? 'in the theatre' : bn.status}: bring it home first.` };
  release(game, bn); w.battalions = w.battalions.filter((b) => b !== bn); note(w, game, `${bn.name} is stood down.`); return { ok: true, text: `${bn.name} is stood down; its squads and vehicles are free.` };
}

/** What a battalion is, from what it is made of now. */
export function statsOf(game, bn) {
  const C = peekMilitary(game)?.company; const P = providedBy(game, bn.squads); const people = []; const hulls = P.hulls;
  for (const sid of bn.squads) { const s = C?.squads.find((q) => q.id === sid); for (const m of s?.members || []) { const p = C.personnel.find((q) => q.id === m); if (p && p.status === 'active') people.push(p); } }
  const soft = Math.round(people.reduce((a, p) => a + (CLASS_POWER[p.role] ?? 0.8) * 10, 0) + hulls.reduce((a, x) => a + ((VEHICLES[x.type]?.firepower || 0) * 8), 0));
  const hard = Math.round(people.filter((p) => p.role === 'anti_tank').length * 40 + hulls.reduce((a, x) => a + (['tank', 'artillery'].includes(clsOf(x)) ? (VEHICLES[x.type]?.firepower || 0) * 40 : clsOf(x) === 'helicopter' ? (VEHICLES[x.type]?.firepower || 0) * 25 : 0), 0));
  const armour = hulls.length ? Math.round(hulls.reduce((a, x) => a + (VEHICLES[x.type]?.armour || 0), 0) / hulls.length * 20) : 0;
  const mounted = P.carriage >= people.length; const speeds = hulls.map((x) => MARCH.base + MARCH.perBar * (VEHICLES[x.type]?.speed || 2));
  let speed = Math.min(mounted ? Infinity : MARCH.foot, speeds.length ? Math.min(...speeds) : Infinity); if (!Number.isFinite(speed)) speed = MARCH.foot; speed = Math.round(speed);
  const parts = P.people + P.vehicles; const start = bn.start.people + bn.start.vehicles;
  return { strength: Math.round(100 * Math.min(1, parts / Math.max(1, start))), org: Math.round(bn.org), soft, hard, defence: Math.round(people.length * 3 + armour), armour, speed, width: Math.min(60, P.squads * 4 + P.vehicles * 2), people: people.length, vehicles: P.vehicles, mounted, entrench: bn.entrench, hardness: parts ? Math.round((100 * P.vehicles) / parts) : 0 };
}

// ---- theatres and employers
const warBetween = (game, a, b) => (game.corp?.geo?.peek?.()?.events || []).some((e) => e.kind === 'war' && e.status === 'active' && e.parties.includes(a) && e.parties.includes(b));
export function theatres(game) {
  return atlasTheatres().filter((t) => t.between.length === 2).map((t) => ({ id: t.id, name: t.name, between: t.between, kind: t.kind, note: t.note, states: t.states, hot: t.kind.split(/\s*\+\s*/).includes('land') || warBetween(game, t.between[0], t.between[1]), provinces: provinces().filter((p) => t.states.includes(p.state)).length }));
}
const theatreOf = (game, id) => theatres(game).find((t) => t.id === id) || null;
const inTheatre = (th) => (p) => th.states.includes(p.state);
function staging(game, th, side) {
  const here = provinces().filter((p) => inTheatre(th)(p) && controllerOf(game, p) === side && p.country === side);
  here.sort((a, b) => ((b.port ? 2 : 0) + (b.capital ? 2 : 0) + b.infra) - ((a.port ? 2 : 0) + (a.capital ? 2 : 0) + a.infra) || (a.id < b.id ? -1 : 1));
  return here[0] || null;
}
export function enlist(game, { theatre, side }) {
  const w = warOf(game); const C = peekMilitary(game)?.company;
  if (!w || !C?.identity) return { ok: false, text: 'You have no company.' };
  if (!C.licensed) return { ok: false, text: 'A private security company needs the Civic Office\'s licence before it takes a flag\'s coin.' };
  if (w.employer) return { ok: false, text: `You already serve ${countryName(w.employer.side)} in ${theatreOf(game, w.employer.theatre)?.name}. Discharge first.` };
  const th = theatreOf(game, theatre); if (!th) return { ok: false, text: 'No such theatre.' };
  if (!th.between.includes(side)) return { ok: false, text: 'That nation is not fighting there.' };
  if (!th.hot) return { ok: false, text: `${th.name}: nobody is fighting there yet.` };
  const st = staging(game, th, side); if (!st) return { ok: false, text: `${countryName(side)} holds no ground in ${th.name} to land you on.` };
  const enemy = th.between.find((c) => c !== side);
  w.employer = { theatre: th.id, side, enemy, since: game.clock.day, staging: st.id }; note(w, game, `You enlist with ${countryName(side)} in ${th.name} (against ${countryName(enemy)}).`);
  return { ok: true, text: `You serve ${countryName(side)} against ${countryName(enemy)} in ${th.name}. Landing at ${st.name}.` };
}
export function discharge(game) {
  const w = warOf(game); if (!w?.employer) return { ok: false, text: 'You serve no one.' };
  if (w.battalions.some((b) => b.status !== 'home')) return { ok: false, text: 'Bring every battalion home first.' };
  const e = w.employer; w.employer = null; note(w, game, `You leave ${countryName(e.side)}'s service.`); return { ok: true, text: `You leave ${countryName(e.side)}'s service. The ground keeps the owners it has now.` };
}

// ---- sealift
const sealDays = (from, to) => Math.max(SEALIFT.minDays, Math.ceil(km(from, to) / SEALIFT.kmPerDay));
export function deploy(game, id) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === id); if (!bn) return { ok: false, text: 'No such battalion.' };
  if (!w.employer) return { ok: false, text: 'Enlist in a theatre first.' };
  if (bn.status !== 'home') return { ok: false, text: `${bn.name} is ${bn.status}.` };
  const to = provinceById(w.employer.staging); const days = sealDays(provinceById(bn.home), to);
  posting(game, bn, true); bn.status = 'deploying'; bn.arrive = nowHour(game) + days * 24; bn.target = to.id; note(w, game, `${bn.name} sails for ${to.name}: ${days} days.`);
  return { ok: true, text: `${countryName(w.employer.side)}'s ships carry ${bn.name}: ${days} days.`, days };
}
export function recall(game, id) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === id); if (!bn) return { ok: false, text: 'No such battalion.' };
  if (bn.status !== 'theatre' || bn.engaged || bn.moving) return { ok: false, text: bn.status !== 'theatre' ? `${bn.name} is ${bn.status}.` : `${bn.name} is busy.` };
  const days = sealDays(provinceById(bn.pos), provinceById(bn.home)); bn.status = 'returning'; bn.arrive = nowHour(game) + days * 24; bn.target = bn.home; bn.order = { type: 'hold' };
  return { ok: true, text: `${bn.name} is on its way home: ${days} days.`, days };
}

// ---- orders and marches
const friendly = (game, p) => controllerOf(game, p) === warOf(game).employer.side;
function legHours(game, bn, from, to) {
  const st = statsOf(game, bn); const d = km(from, to) * MARCH.detour; const fx = TERRAIN_FX[to.terrain]?.speed ?? 1; const infra = INFRA_SPEED[Math.min(from.infra, to.infra)] ?? 0.6; const rail = from.rail.includes(to.n) ? MARCH.rail : 1;
  return Math.max(1, d / (Math.max(1, st.speed) * fx * infra * rail));
}
function route(game, bn, to) { // the cheapest way through ground the employer holds, inside the theatre
  const w = warOf(game); const th = theatreOf(game, w.employer.theatre); const P = provinces(); const here = provinceById(bn.pos);
  const dist = new Map([[here.n, 0]]); const prev = new Map(); const open = [here.n];
  while (open.length) {
    open.sort((a, b) => dist.get(a) - dist.get(b)); const c = open.shift(); if (c === to.n) break;
    for (const q of P[c].neighbours) { const Q = P[q]; if (!inTheatre(th)(Q) || !friendly(game, Q)) continue; const d = dist.get(c) + legHours(game, bn, P[c], Q); if (d < (dist.get(q) ?? 1e9)) { dist.set(q, d); prev.set(q, c); open.push(q); } }
  }
  if (!dist.has(to.n)) return null; const path = []; for (let c = to.n; c !== here.n; c = prev.get(c)) path.unshift(P[c].id); return { path, hours: Math.round(dist.get(to.n)) };
}
export function order(game, id, o) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === id); if (!bn) return { ok: false, text: 'No such battalion.' };
  if (bn.status !== 'theatre') return { ok: false, text: bn.status === 'home' ? `${bn.name} is at home: send it to the theatre first.` : `${bn.name} is at sea.` };
  if (bn.engaged) return { ok: false, text: `${bn.name} is in a battle: choose how to fight it first.` };
  const e = w.employer; const here = provinceById(bn.pos);
  if (o.type === 'hold' || o.type === 'defend') { bn.order = { type: o.type }; bn.moving = null; bn.path = []; return { ok: true, text: o.type === 'defend' ? `${bn.name} digs in at ${here.name}.` : `${bn.name} holds.` }; }
  if (o.type === 'withdraw') o = { type: 'move', to: e.staging };
  if (o.type === 'move') {
    const to = provinceById(o.to); if (!to) return { ok: false, text: 'No such province.' };
    if (to.id === bn.pos) return { ok: false, text: 'It is already there.' };
    if (!friendly(game, to)) return { ok: false, text: 'That ground is not yours: attack it from a province next to it.' };
    const r = route(game, bn, to); if (!r) return { ok: false, text: 'There is no way there through ground you hold.' };
    bn.order = { type: 'move', to: to.id }; bn.path = r.path.slice(1); const first = provinceById(r.path[0]); bn.moving = { to: first.id, left: legHours(game, bn, here, first), attack: false }; bn.entrench = 0;
    return { ok: true, text: `${bn.name} sets out for ${to.name}: about ${r.hours} hours.`, hours: r.hours };
  }
  if (o.type === 'attack') {
    const to = provinceById(o.to); if (!to) return { ok: false, text: 'No such province.' };
    if (friendly(game, to)) return { ok: false, text: 'That ground is already yours.' };
    if (controllerOf(game, to) !== e.enemy) return { ok: false, text: 'You fight only the nation you came to fight.' };
    if (!here.neighbours.includes(to.n)) return { ok: false, text: 'Move next to it first: an attack goes into the next province.' };
    if (bn.org < BATTALION.attackMin) return { ok: false, text: `${bn.name} has no stomach for it: its organisation is ${Math.round(bn.org)} (it needs ${BATTALION.attackMin}).` };
    bn.order = { type: 'attack', to: to.id }; bn.path = []; bn.moving = { to: to.id, left: legHours(game, bn, here, to), attack: true }; bn.entrench = 0;
    return { ok: true, text: `${bn.name} moves on ${to.name}: contact in about ${Math.round(bn.moving.left)} hours.` };
  }
  return { ok: false, text: 'No such order.' };
}

// ---- time
function arrive(game, w, bn, hour) {
  if (bn.status === 'deploying') { bn.status = 'theatre'; bn.pos = bn.target; bn.arrive = null; bn.order = { type: 'hold' }; note(w, game, `${bn.name} lands at ${provinceById(bn.pos).name}.`); game.notify?.(`${bn.name} has landed at ${provinceById(bn.pos).name}.`, 'info'); }
  else if (bn.status === 'returning') { posting(game, bn, false); bn.status = 'home'; bn.pos = bn.home; bn.arrive = null; note(w, game, `${bn.name} is home.`); game.notify?.(`${bn.name} is home.`, 'info'); }
  void hour;
}
function contact(game, w, bn, prov) {
  const C = peekMilitary(game)?.company; const g = garrisonOf(game, prov);
  bn.moving = null; bn.order = { type: 'hold' };
  const id = openStrategic(game, { battalion: bn, province: prov, enemy: g, recipe: recipeOf(prov), terrain: battleTerrain(prov), style: styleOf(prov.country), title: `${bn.name} attacks ${prov.name}` });
  if (id) { bn.engaged = id; note(w, game, `${bn.name} meets the enemy at ${prov.name}.`); game.notify?.(`${bn.name} is in contact at ${prov.name}: choose how to fight it.`, 'warn'); }
  void C;
}
export const recipeOf = (p) => (p.terrain === 'urban' ? 'city' : p.fort >= 3 ? 'compound' : p.fort >= 2 ? 'trench' : p.terrain === 'forest' || p.terrain === 'jungle' ? 'forest' : 'fields');
export const battleTerrain = (p) => (p.terrain === 'forest' || p.terrain === 'jungle' ? 'forest' : p.terrain === 'hills' || p.terrain === 'mountains' ? 'mountain' : p.terrain === 'desert' ? 'desert' : p.terrain === 'urban' ? 'urban' : 'rural');
/** Catch up the hours since last time: sealift lands, marches finish, contact opens battles, digging in builds up. */
export function advance(game) {
  const w = warOf(game); if (!w) return;
  const now = nowHour(game); if (w.hour === null) { w.hour = now; return; }
  const to = Math.min(now, w.hour + 24 * 40);
  for (let h = w.hour + 1; h <= to; h++) {
    for (const bn of w.battalions) {
      if ((bn.status === 'deploying' || bn.status === 'returning') && bn.arrive !== null && h >= bn.arrive) arrive(game, w, bn, h);
      else if (bn.status === 'theatre' && !bn.engaged) {
        if (bn.moving) {
          bn.moving.left -= 1;
          if (bn.moving.left <= 0) {
            const dest = provinceById(bn.moving.to);
            if (bn.moving.attack) contact(game, w, bn, dest);
            else { bn.pos = dest.id; bn.org = Math.max(0, bn.org - BATTALION.moveCost); const nx = bn.path.shift(); if (nx) { const nxt = provinceById(nx); bn.moving = { to: nx, left: legHours(game, bn, dest, nxt), attack: false }; } else { bn.moving = null; bn.order = { type: 'hold' }; game.notify?.(`${bn.name} has arrived at ${dest.name}.`, 'info'); } }
          }
        } else if (bn.order.type === 'defend' && h % BATTALION.entrenchHours === 0) bn.entrench = Math.min(BATTALION.entrenchMax, bn.entrench + 1);
      }
    }
  }
  w.hour = to;
}

/** Once a day: the employer's retainer for every battalion in the theatre, and rest for those not on the move. */
export function dayTick(game) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity) return;
  advance(game);
  const day = game.clock.day; w.day ||= 0; if (w.day >= day) return; w.day = day;
  let pay = 0;
  for (const bn of w.battalions) {
    if (bn.status === 'theatre' && w.employer) { const P = providedBy(game, bn.squads); pay += P.people * RETAINER.perTrooper + P.hulls.reduce((a, x) => a + (RETAINER.perVehicle[clsOf(x)] || 0), 0); }
    if (!bn.moving && !bn.engaged) bn.org = Math.min(BATTALION.orgMax, bn.org + BATTALION.restPerDay);
  }
  if (pay > 0) { game.corp.receive('security', pay, { cat: 'contract' }); w.paid = (w.paid || 0) + pay; note(w, game, `${countryName(w.employer.side)} pays ${pay.toLocaleString('en-US')} obols for the day.`); }
}

// ---- a battle on the map ends (called from src/war/engagements.js)
function resolved(game, C, eng, R) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === eng.strategic?.bn); if (!bn) return;
  const prov = provinceById(eng.strategic.prov); const obj = R.objectives; bn.engaged = null; bn.order = { type: 'hold' }; bn.org = Math.max(0, bn.org - BATTALION.afterBattle[obj]);
  let line = `${bn.name} at ${prov.name}: `;
  if (obj >= 2) {
    w.control[prov.id] = w.employer.side; bn.pos = prov.id; const bonus = prov.vp * RETAINER.perVP;
    if (bonus > 0) game.corp.receive('security', bonus, { cat: 'contract' });
    const rep = (C.rep ||= { score: 0, done: 0, failed: 0, clients: {}, ban: {} }); rep.score += RETAINER.rep * Math.max(1, prov.vp);
    line += `taken${bonus ? `; ${countryName(w.employer.side)} pays ${bonus.toLocaleString('en-US')} for it` : ''}.`;
  } else line += obj === 1 ? 'a stalemate: the enemy still holds.' : 'repulsed.';
  // the squads came back from the field: they belong to the battalion again
  const live = []; for (const sid of bn.squads) { const s = C.squads.find((q) => q.id === sid); if (!s) continue; if (!s.members.length && !s.equipment.length) { C.squads = C.squads.filter((q) => q !== s); continue; } live.push(sid); s.status = 'battalion'; s.battalion = bn.id; for (const e of s.equipment) { const x = C.equipment.find((q) => q.id === e); if (x && x.status === 'assigned') x.status = 'deployed'; } }
  bn.squads = live; posting(game, bn, true); const cmd = C.personnel.find((p) => p.id === bn.commander);
  if (!cmd || cmd.status !== 'active') { const next = bn.squads.map((sid) => C.personnel.find((p) => p.id === C.squads.find((q) => q.id === sid)?.leader)).find((p) => p && p.status === 'active'); bn.commander = next?.id || null; if (!next) line += ' It has lost its commander.'; }
  if (!bn.squads.length) { w.battalions = w.battalions.filter((b) => b !== bn); line += ' Nothing is left of it.'; }
  note(w, game, line);
}
function withdrawn(game, C, eng) {
  const w = warOf(game); const bn = w?.battalions.find((b) => b.id === eng.strategic?.bn); if (!bn) return;
  bn.engaged = null; bn.org = Math.max(0, bn.org - BATTALION.afterBattle[1] / 2); bn.order = { type: 'hold' }; note(w, game, `${bn.name} breaks off at ${provinceById(eng.strategic.prov).name}.`);
}
hooks.strategicResolved = resolved; hooks.strategicWithdrawn = withdrawn;

// ---- what the screen shows
export function view(game) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity) return null;
  advance(game);
  const th = w.employer ? theatreOf(game, w.employer.theatre) : null; const P = provinces();
  const area = th ? P.filter(inTheatre(th)) : []; const ids = new Set(area.map((p) => p.id));
  const bns = w.battalions.map((b) => ({ ...b, stats: statsOf(game, b), commanderName: C.personnel.find((p) => p.id === b.commander)?.name || null, template: templates(game).find((t) => t.id === b.template) || null, squadNames: b.squads.map((s) => C.squads.find((q) => q.id === s)?.name).filter(Boolean) }));
  return {
    hour: nowHour(game), employer: w.employer ? { ...w.employer, sideName: countryName(w.employer.side), enemyName: countryName(w.employer.enemy), theatreName: th?.name } : null, theatre: th, theatres: theatres(game),
    provinces: area.map((p) => ({ ...p, controller: controllerOf(game, p), garrison: garrisonOf(game, p) })), neighbourIds: ids,
    battalions: bns, templates: templates(game), log: w.log.slice(-12).reverse(), paid: w.paid || 0,
    squadsFree: C.squads.filter((s) => s.status === 'home').map((s) => ({ id: s.id, name: s.name, size: s.members.length, vehicles: s.equipment.length })),
  };
}

export const SOLDIER_RETAINER = (game, bn) => { const P = providedBy(game, bn.squads); return P.people * RETAINER.perTrooper + P.hulls.reduce((a, x) => a + (RETAINER.perVehicle[clsOf(x)] || 0), 0); };
