// Engagements (v0.100.0 stage 9): heavy contracts. A client offers a job that needs squads, tanks and medics you really own (nothing is spawned to meet it); you assign squads and a general,
// see an ESTIMATE from the same function that will decide the result (src/war/combat.js), and delegate. The one state field is
//     open → delegated | tactical → resolved        (or: expired, declined)
// and it only moves forward: once a general has it, you cannot also play it (the overhead battle itself arrives in v0.101.0, so `play` refuses for now). The result is applied ONCE to the
// real records (the dead, the wounded, the vehicles lost, the stock used) and written down in an after-action report built from what was actually applied.
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { nextId, takeStock } from './equipment.js';
import { reputation } from './contracts.js';
import { leave } from './squads.js';
import { resolve, estimate } from './combat.js';
import { ATLAS } from '../content/atlas.js';
import { styleOf, SUPPORT } from '../content/battle.js';
import { buildSetup } from '../battle/setup.js';
import { reserved } from './reserve.js';
import { ENGAGEMENTS as KINDS, ENGAGE as E, GENERALS, terrainOf } from '../content/generals.js';
import { VEHICLES } from '../content/procurement.js';
import { CLASSES } from '../content/troops.js';
import { SUPPLIES } from '../content/procurement.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const salt = (game) => String(game.world.salt || game.rng?.state || 0);
const pick = (arr, u) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];
const between = ([a, b], u) => a + Math.floor(u * (b - a + 1));
const ensure = (C) => { C.engagements ||= []; return C.engagements; };
const find = (game, id) => ensure(peekMilitary(game).company).find((x) => x.id === id);
const maxOpen = (rep) => Math.min(E.maxOpen, E.open + Math.floor(Math.max(0, rep) / E.perRep));

// ---- the real forces behind an assignment
const tierHeld = (p) => (p.weapon && CLASSES[p.role]?.tiers?.[2] && p.weapon.endsWith(`:${CLASSES[p.role].tiers[2]}`) ? 2 : 1);
function forces(game, squadIds) {
  const C = peekMilitary(game).company;
  const squads = squadIds.map((id) => C.squads.find((s) => s.id === id)).filter(Boolean);
  const people = []; const vehicles = [];
  for (const s of squads) {
    for (const m of s.members) { const p = C.personnel.find((x) => x.id === m); if (p && p.status === 'active') people.push({ id: p.id, name: p.name, role: p.role, tier: tierHeld(p), armour: p.armour || 1, exp: p.exp || 0, morale: p.morale ?? 70, fatigue: p.fatigue || 0, armed: Boolean(p.weapon) }); }
    for (const e of s.equipment) { const x = C.equipment.find((q) => q.id === e); const V = x && VEHICLES[x.type]; if (V && (x.status === 'assigned' || x.status === 'deployed')) vehicles.push({ id: x.id, name: x.name, cls: V.class, armour: V.armour, firepower: V.firepower, speed: V.speed }); }
  }
  return { squads, people, vehicles };
}
const stockSum = (C, suffix) => Object.entries(C.stock).filter(([k]) => k === suffix || k.endsWith(`:${suffix}`)).reduce((a, [, n]) => a + n, 0);

/** What an engagement asks that the chosen squads do not give (empty = they meet it). Counted from the real records. */
export function lacks(game, eng, squadIds) {
  const F = forces(game, squadIds);
  const have = { troops: F.people.length, tanks: F.vehicles.filter((v) => v.cls === 'tank').length, helicopters: F.vehicles.filter((v) => v.cls === 'helicopter').length, medics: F.people.filter((p) => p.role === 'medic').length };
  return Object.entries(eng.needs).filter(([k, n]) => have[k] < n).map(([k, n]) => `${n - have[k]} more ${k === 'troops' ? 'soldier' : k.slice(0, -1)}${n - have[k] === 1 ? '' : 's'} (${n} needed, ${have[k]} sent)`);
}

function inputFor(game, eng, squadIds, generalId) {
  const C = peekMilitary(game).company;
  const F = forces(game, squadIds);
  const G = generalId ? GENERALS[C.generals.find((x) => x.id === generalId)?.gen] : null;
  return { F, input: { key: `${eng.id}|${salt(game)}`, days: eng.days, terrain: eng.terrain, goal: eng.goal, enemy: eng.enemy, people: F.people, vehicles: F.vehicles,
    general: G ? { ...G, bonus: G.terrain?.[eng.terrain] ?? 0 } : null, supplies: { fuel: stockSum(C, 'supply:fuel'), rockets: stockSum(C, 'item_rpg_rocket') } } };
}

/** The estimate before you commit: the same function that will decide it, with the luck taken out. */
export function assess(game, id, squadIds, generalId) {
  const eng = find(game, id);
  if (!eng) return { ok: false, text: 'No such engagement.' };
  const { input } = inputFor(game, eng, squadIds, generalId);
  const e = estimate(input);
  return { ok: true, lacks: lacks(game, eng, squadIds), estimate: { words: e.words, ratio: e.ratio, chance: e.chance, lossPeople: Math.round(e.expected.dead + e.expected.wounded), deadExpected: Math.round(e.expected.dead * 10) / 10, vehiclesExpected: Math.round(e.expected.lost * 10) / 10, parts: e.parts } };
}

export function delegate(game, id, { squads, general }) {
  const C = peekMilitary(game)?.company;
  const eng = C && find(game, id);
  if (!eng) return { ok: false, text: 'No such engagement.' };
  if (eng.state !== 'open') return { ok: false, text: eng.state === 'delegated' || eng.state === 'tactical' ? 'That one has already been given out: once a way is chosen, the other is closed.' : `That engagement is ${eng.state}.` };
  const gen = C.generals.find((x) => x.id === general);
  if (!gen) return { ok: false, text: 'Choose a general.' };
  if (gen.status !== 'home') return { ok: false, text: `${gen.name} is away.` };
  if (!squads?.length) return { ok: false, text: 'Choose at least one squad.' };
  const chosen = squads.map((sid) => C.squads.find((s) => s.id === sid));
  if (chosen.some((s) => !s)) return { ok: false, text: 'No such squad.' };
  const away = chosen.find((s) => s.status !== 'home'); if (away) return { ok: false, text: `${away.name} is away.` };
  const miss = lacks(game, eng, squads);
  if (miss.length) return { ok: false, text: `Your forces do not meet this one: ${miss.join('; ')}. Nothing is spawned to make up the difference.` };
  // every check passed: now the changes
  const F = commitForces(game, C, eng, squads, gen);
  eng.state = 'delegated'; eng.order = { squads: [...squads], general: gen.id, generalName: gen.name, day: game.clock.day, end: game.clock.day + eng.days };
  C.log.push({ day: game.clock.day, text: `${gen.name} takes ${eng.title} for ${eng.client}.` });
  return { ok: true, text: `${gen.name} will fight it with ${F.people.length} soldiers and ${F.vehicles.length} vehicles. The result comes in ${eng.days} days.` };
}

/** Hold everything an engagement sends: the squads go away, their people are on a post, the vehicles are deployed and the general (if any) is away. Both ways of fighting use this. */
function commitForces(game, C, eng, squads, gen) {
  const F = forces(game, squads);
  for (const s of F.squads) s.status = 'away';
  for (const p of F.people) C.personnel.find((x) => x.id === p.id).post = `engagement:${eng.id}`;
  for (const v of F.vehicles) C.equipment.find((x) => x.id === v.id).status = 'deployed';
  if (gen) gen.status = 'away';
  return F;
}

/**
 * Lead it yourself (v0.101.0): the forces go to the field exactly as for a general, the state moves to `tactical` (so a general can never also have it), and a battle is set up from the real forces
 * and the engagement. The battle itself runs in the panel (src/ui/battle.js) and files its result here; the result is applied on the end day, like a delegated one (playing it is not a shortcut
 * to the money). Until then the battle is saved as its setup, its order log and its tick, and a reload replays it.
 */
export function play(game, id, squads) {
  const C = peekMilitary(game)?.company;
  const eng = C && find(game, id);
  if (!eng) return { ok: false, text: 'No such engagement.' };
  if (eng.state === 'tactical') return { ok: true, text: 'The battle is waiting for you.', resume: true };
  if (eng.state !== 'open') return { ok: false, text: 'That one has already been given out: once a way is chosen, the other is closed.' };
  if (!squads?.length) return { ok: false, text: 'Choose at least one squad.' };
  const chosen = squads.map((sid) => C.squads.find((s) => s.id === sid));
  if (chosen.some((s) => !s)) return { ok: false, text: 'No such squad.' };
  const away = chosen.find((s) => s.status !== 'home'); if (away) return { ok: false, text: `${away.name} is away.` };
  const miss = lacks(game, eng, squads);
  if (miss.length) return { ok: false, text: `Your forces do not meet this one: ${miss.join('; ')}. Nothing is spawned to make up the difference.` };
  const F = commitForces(game, C, eng, squads, null);
  const key = `${eng.id}|${salt(game)}`;
  eng.state = 'tactical'; eng.order = { squads: [...squads], general: null, generalName: null, day: game.clock.day, end: game.clock.day + eng.days };
  eng.battle = { key, setup: buildSetup({ key, eng: { goal: eng.goal, enemy: eng.enemy, recipe: eng.recipe || 'fields', biome: eng.terrain || 'rural', style: eng.style || 'sund' }, people: F.people, vehicles: F.vehicles, support: supportOf(C, eng.id), ai: { p: false, e: true } }), tick: 0, log: [], result: null };
  C.log.push({ day: game.clock.day, text: `You take ${eng.title} to the field.` });
  return { ok: true, text: `${F.people.length} soldiers and ${F.vehicles.length} vehicles go to the field.` };
}

/**
 * A sandbox fight (the debug command `mil skirmish`, and the smoke test): a battle of twelve made-up soldiers and a tank against the engagement's enemy, on either recipe. It is a real tactical
 * engagement in every way except that none of the units is a record of the company, so applying its result changes nothing and pays nothing.
 */
export function skirmish(game, recipe = 'fields', enemy = { troops: 10, armour: 1, air: 0, skill: 1 }) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'Register the company first.' };
  const id = nextId(C, 'N');
  const key = `${id}|${salt(game)}`;
  const people = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `Recruit ${i + 1}`, role: i === 0 ? 'officer' : i % 6 === 1 ? 'machine_gunner' : i % 6 === 2 ? 'anti_tank' : i % 6 === 3 ? 'medic' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const vehicles = [{ id: 'sv0', name: 'Anvil Mk1 tank', cls: 'tank', armour: 3, firepower: 3, speed: 3 }];
  const setup = buildSetup({ key, eng: { goal: 'defence', enemy, recipe: recipe === 'city' ? 'city' : 'fields', biome: 'rural', style: recipe === 'city' ? 'halvermouth' : 'sund' }, people, vehicles, ai: { p: false, e: true } });
  for (const u of setup.units) if (u.side === 'p') u.rec = null; // nothing here is a record of the company
  ensure(C).push({ id, kind: 'hold', title: 'Skirmish', text: 'A sandbox fight.', client: 'Nobody', clientName: 'Nobody', place: 'the practice ground', terrain: 'rural', goal: 'defence', days: 1, needs: { troops: 0, tanks: 0, helicopters: 0, medics: 0 }, enemy, pay: 0, state: 'tactical', offered: game.clock.day, expires: game.clock.day + 1, order: { squads: [], general: null, generalName: null, day: game.clock.day, end: game.clock.day + 1 }, battle: { key, setup, tick: 0, log: [], result: null }, result: null, recipe, style: 'sund' });
  return { ok: true, id, text: `Skirmish ${id} is ready.` };
}

/** The battle's saved state: the setup, the tick and the order log (small). A battle in progress is never re-rolled: it is replayed. */
export function battleOf(game, id) { const e = peekMilitary(game)?.company && find(game, id); return e?.battle || null; }
export function saveBattle(game, id, tick, log) { const e = find(game, id); if (!e?.battle || e.battle.result) return false; e.battle.tick = tick; e.battle.log = log.map((x) => ({ t: x.t, ids: x.ids, order: x.order })); return true; }
/** The played battle is over: file its result (once). It is applied on the engagement's end day. */
export function fileBattle(game, id, result) {
  const e = find(game, id);
  if (!e?.battle) return { ok: false, text: 'There is no battle.' };
  if (e.battle.result) return { ok: false, text: 'That battle has already been filed.' };
  e.battle.result = result; e.battle.tick = result.parts?.ticks ?? e.battle.tick;
  return { ok: true, text: `The result is filed. Your people return on day ${e.order.end}.` };
}

export function decline(game, id) {
  const eng = find(game, id);
  if (!eng || eng.state !== 'open') return { ok: false, text: 'That offer is no longer open.' };
  eng.state = 'declined'; eng.ended = game.clock.day;
  return { ok: true, text: 'Turned down.' };
}

/** What the company can call in a played battle, from what it really holds: missiles and drones in the stores (at most three of each kind), and the aircraft in its hangars (as many as the fuel allows). */
export function supportOf(C, exceptId = null) {
  const items = {}; const held = reserved(C, exceptId);
  const stock = {}; for (const k of Object.keys(C.stock)) { const m = /:(item_missile_guided|item_missile_cruise|item_drone_attack|item_drone_strike)$/.exec(k); if (m) stock[m[1]] = (stock[m[1]] || 0) + C.stock[k]; }
  for (const [item, n] of Object.entries(stock)) { const free = n - (held.items[item] || 0); if (free > 0) items[item] = Math.min(3, free); }
  let fuel = C.stock['supply:fuel'] || 0; const air = [];
  for (const x of C.equipment || []) {
    if (x.kind !== 'aircraft' || x.status !== 'stored' || x.assignedTo != null || air.length >= 3 || held.air.has(x.id)) continue;
    const kind = /bomb/i.test(x.type) ? 'bomber' : 'fighter'; if (fuel < SUPPORT[kind].fuel) continue; fuel -= SUPPORT[kind].fuel; air.push({ id: x.id, name: x.name, kind });
  }
  return { items, air };
}
const rocketKeys = (C) => Object.keys(C.stock).filter((k) => k.endsWith(':item_rpg_rocket')).sort();

/**
 * Apply an outcome to the real records, ONCE, and write the after-action report from what was applied. Both ways of fighting end here: a general's aggregate result (resolve) and a played
 * battle's (src/battle/sim.js); they return the same shape: { objectives, outcome, ratio, parts, dead:[ids], wounded:[{id,wounds}], lost:[ids], used:{fuel,rockets} }.
 */
export function applyOutcome(game, C, eng, R) {
  if (eng.result || eng.state === 'resolved') return eng.result;
  const squadIds = eng.order.squads;
  const day = game.clock.day;
  const lines = [];
  const name = (id) => C.personnel.find((p) => p.id === id)?.name || id;
  const dead = []; const hurt = []; const lostV = [];
  for (const id of R.dead) { const p = C.personnel.find((x) => x.id === id); if (!p) continue; leave(C, p); p.status = 'dead'; p.post = null; p.weapon = null; p.gadget = null; dead.push({ id, name: p.name, role: p.role }); }
  for (const w of R.wounded) { const p = C.personnel.find((x) => x.id === w.id); if (!p) continue; p.status = 'wounded'; p.wounds = w.wounds; hurt.push({ id: w.id, name: p.name, role: p.role, wounds: w.wounds }); }
  for (const id of R.lost) {
    const x = C.equipment.find((q) => q.id === id); if (!x) continue;
    const s = C.squads.find((q) => q.id === x.assignedTo); if (s) s.equipment = s.equipment.filter((e) => e !== id);
    x.status = 'destroyed'; x.assignedTo = null; lostV.push({ id, name: x.name });
  }
  for (const s of C.squads) if (squadIds.includes(s.id)) s.status = 'home';
  for (const p of C.personnel) if (p.post === `engagement:${eng.id}`) { p.post = null; if (p.status === 'active') { p.exp = (p.exp || 0) + 1; p.morale = Math.max(0, Math.min(100, (p.morale ?? 70) + (R.objectives >= 2 ? 6 : R.objectives === 0 ? -12 : -2))); } }
  for (const x of C.equipment) if (x.status === 'deployed' && x.assignedTo != null && squadIds.includes(x.assignedTo)) x.status = 'assigned';
  // stock used
  const used = {};
  if (R.used.fuel) { let left = R.used.fuel; const k = 'supply:fuel'; const t = Math.min(left, C.stock[k] || 0); if (t) { takeStock(game, k, t); used[SUPPLIES.fuel.name] = t; } }
  if (R.used.rockets) { let left = R.used.rockets; for (const k of rocketKeys(C)) { const t = Math.min(left, C.stock[k]); if (t) { takeStock(game, k, t); left -= t; used['RPG rockets'] = (used['RPG rockets'] || 0) + t; } if (!left) break; } }
  for (const [item, n] of Object.entries(R.used.items || {})) { let left = n; for (const k of Object.keys(C.stock).filter((q) => q.endsWith(`:${item}`)).sort()) { const t = Math.min(left, C.stock[k]); if (t) { takeStock(game, k, t); left -= t; const nm = SUPPORT[item]?.name || item; used[nm] = (used[nm] || 0) + t; } if (!left) break; } }
  if (R.used.air?.length) used['Air passes'] = R.used.air.length;
  // the general and the money
  const gen = eng.order.general ? C.generals.find((x) => x.id === eng.order.general) : null;
  if (gen) { gen.status = 'home'; if (R.objectives >= 2) gen.wins++; else if (R.objectives === 0) gen.losses++; }
  const rep = C.rep ||= { score: 0, done: 0, failed: 0, clients: {}, ban: {} };
  const share = [0, 0.45, 0.9, 1][R.objectives];
  let paid = 0; let fine = 0;
  if (share > 0) { paid = Math.round(eng.pay * share); game.corp.receive('security', paid, { cat: 'contract' }); }
  if (R.objectives === 0) { fine = Math.round(eng.pay * E.penalty); game.corp.pay('security', fine, { cat: 'penalty', owe: true }); rep.ban[eng.client] = day + E.ban; }
  rep.score += R.objectives === 3 ? E.repWin : R.objectives === 2 ? E.repHold : R.objectives === 0 ? E.repLose : 0;
  const cl = (rep.clients[eng.client] ||= { done: 0, failed: 0 });
  if (R.objectives >= 1) { rep.done++; cl.done++; } else { rep.failed++; cl.failed++; }
  lines.push(`${R.objectives} of 3 objectives. ${dead.length} killed, ${hurt.length} wounded, ${lostV.length} vehicle${lostV.length === 1 ? '' : 's'} lost.`);
  if (Object.keys(used).length) lines.push(`Used: ${Object.entries(used).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')}.`);
  lines.push(R.objectives ? `Paid ${paid.toLocaleString('en-US')} of ${eng.pay.toLocaleString('en-US')} obols.` : `Failed: fined ${fine.toLocaleString('en-US')} obols; ${eng.client} will not call for ${E.ban} days.`);
  eng.result = { day, outcome: R.outcome, objectives: R.objectives, ratio: Math.round((R.ratio || 0) * 100) / 100, parts: R.parts || null, how: R.how || 'general', dead, wounded: hurt, lost: lostV, used, general: eng.order.generalName || null, paid, fine, lines };
  eng.state = 'resolved'; eng.ended = day;
  C.log.push({ day, text: `${eng.title}: ${R.outcome.replace('_', ' ')} (${R.objectives} of 3). ${dead.length} killed.` });
  game.notify?.(`${eng.title} is over: ${R.outcome.replace('_', ' ')}. ${dead.length} killed, ${hurt.length} wounded.`, R.objectives >= 2 ? 'good' : 'warn');
  return eng.result;
}

/** The end day of a delegated engagement (or a played one): the result is worked out by the general, or the one the played battle filed is used, and applied. */
function finish(game, C, eng) {
  if (eng.result || eng.state === 'resolved') return eng.result;
  const { F, input } = inputFor(game, eng, eng.order.squads, eng.order.general);
  const R = eng.battle?.result ? { ...eng.battle.result, how: 'played' } : resolve({ ...input, people: F.people.length ? F.people : input.people });
  return applyOutcome(game, C, eng, R);
}

function offerOne(game, C, day) {
  const rep = reputation(game);
  const s = `${salt(game)}|eng|${day}`;
  const kindId = pick(Object.keys(KINDS), unit(`${s}|k`));
  const K = KINDS[kindId];
  const states = Object.values(ATLAS.states).filter((st) => (C.rep?.ban?.[ATLAS.countries[st.country]?.name] || 0) <= day);
  const fit = states.filter((st) => K.terrains.includes(terrainOf(st.biome)));
  const pool = fit.length ? fit : states;
  if (!pool.length) return;
  const st = pick(pool, unit(`${s}|place`));
  // a place inside that state: a city or a town makes a street fight, anything else the open country (docs/WAR.md: Battles)
  const here = ATLAS.places.filter((pl) => pl.state === st.id);
  const spot = here.length ? pick(here, unit(`${s}|spot`)) : null;
  const recipe = spot && (spot.kind === 'c' || spot.kind === 't') ? 'city' : 'fields';
  const scale = 1 + Math.max(0, rep) * E.repScale;
  const needs = { troops: Math.min(60, Math.round(between(K.troops, unit(`${s}|t`)) * scale)), tanks: Math.min(6, Math.round(between(K.tanks, unit(`${s}|tk`)) * Math.sqrt(scale))), helicopters: Math.min(4, Math.round(between(K.helicopters, unit(`${s}|h`)) * Math.sqrt(scale))), medics: Math.min(4, between(K.medics, unit(`${s}|m`))) };
  const mult = K.enemy[0] + unit(`${s}|e`) * (K.enemy[1] - K.enemy[0]);
  const enemy = { troops: Math.round(needs.troops * mult * 1.1), armour: Math.round(needs.tanks * mult * 0.9 * 10) / 10, air: needs.helicopters ? Math.round(needs.helicopters * 0.5 * 10) / 10 : 0, skill: Math.round((0.9 + 0.3 * unit(`${s}|sk`)) * 100) / 100 };
  const days = between(K.days, unit(`${s}|d`));
  const pay = Math.round((needs.troops * days * E.payPerTroopDay + needs.tanks * days * E.payTank + needs.helicopters * days * E.payHelicopter) / 500) * 500;
  const client = ATLAS.countries[st.country]?.name || 'A client';
  ensure(C).push({ id: nextId(C, 'N'), kind: kindId, title: K.title.replace('{place}', spot ? spot.name : st.name), text: K.text, client, place: spot ? spot.name : st.name, region: st.name, placeKind: spot?.kind || null, recipe, style: styleOf(st.country), terrain: terrainOf(st.biome), biome: st.biome || 'rural', goal: K.goal, days, needs, enemy, pay, state: 'open', offered: day, expires: day + between(E.lasts, unit(`${s}|x`)), order: null, result: null });
}

export function dayTick(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity || !C.licensed) return;
  const day = game.clock.day;
  C.days ||= {};
  if ((C.days.eng || 0) >= day) return;
  C.days.eng = day;
  const list = ensure(C);
  for (const eng of list) {
    if (eng.state === 'open' && eng.expires <= day) { eng.state = 'expired'; eng.ended = day; eng.why = 'The client found someone else.'; }
    else if ((eng.state === 'delegated' || eng.state === 'tactical') && eng.order.end <= day) finish(game, C, eng);
  }
  const built = C.facilities.some((f) => f.id === 'command' && f.state === 'built');
  const open = list.filter((x) => x.state === 'open').length;
  if (built && open < maxOpen(reputation(game)) && unit(`${salt(game)}|engday|${day}`) < E.chance) offerOne(game, C, day);
  const ended = list.filter((x) => !['open', 'delegated', 'tactical'].includes(x.state));
  if (ended.length > E.kept) { const drop = new Set(ended.slice(0, ended.length - E.kept)); C.engagements = list.filter((x) => !drop.has(x)); }
}

export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  const list = ensure(C);
  return { open: list.filter((x) => x.state === 'open'), active: list.filter((x) => x.state === 'delegated' || x.state === 'tactical').map((x) => ({ ...x, daysLeft: Math.max(0, x.order.end - game.clock.day) })), done: list.filter((x) => !['open', 'delegated', 'tactical'].includes(x.state)).slice().reverse() };
}
export const get = (game, id) => (peekMilitary(game)?.company ? find(game, id) || null : null);
