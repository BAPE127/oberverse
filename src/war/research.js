// The company's research (v0.103.8; src/content/warResearch.js): one project at a time, paid by the company when it starts, finished on a morning, needing the Command HQ. What it unlocks is read
// by the rules that equip, arm and order (`has`, `weaponTierOpen`, `armourEraOpen`, `vehicleEraOpen`); nothing here creates an item.
//
//   view(game)              the tree for the screen: each node's state, what it needs, the project under way
//   start(game, id)         every check first (the HQ stands, the node is open and not done, nothing else under way, the company can pay), then the money moves once
//   dayTick(game)           a project whose last day has come is finished (once)
//   has(game, id)           is a node finished
//   weaponTierOpen(game, t) / armourEraOpen / vehicleEraOpen    tiers up to 2 are always open
// Saved: company.research = { done: { nodeId: day }, active: { id, start, end, paid } | null, log }
import { peekMilitary } from './state.js';
import { WAR_RESEARCH, GATE, RESEARCH_FACILITY } from '../content/warResearch.js';
import { facilityState } from './facilities.js';
import { pay, fundingMode } from './company.js';
import { cash } from './company.js';

const rs = (C) => (C.research ||= { done: {}, active: null, log: [] });
export const researchOf = (game) => { const C = peekMilitary(game)?.company; return C?.identity ? rs(C) : null; };

export const has = (game, id) => Boolean(researchOf(game)?.done?.[id]);
const open = (game, gate, t) => t <= 2 || !gate[t] || has(game, gate[t]);
export const weaponTierOpen = (game, t) => open(game, GATE.weaponTier, t);
export const armourEraOpen = (game, e) => open(game, GATE.armourEra, e);
export const vehicleEraOpen = (game, e) => open(game, GATE.vehicleEra, e);
/** The highest weapon tier, armour era and vehicle era the company may use now. */
export const reach = (game) => ({ weapon: [4, 3].find((t) => weaponTierOpen(game, t)) || 2, armour: [4, 3].find((e) => armourEraOpen(game, e)) || 2, vehicle: [4, 3].find((e) => vehicleEraOpen(game, e)) || 2 });

/** Why a project cannot start now, or null. */
export function why(game, id) {
  const C = peekMilitary(game)?.company; const N = WAR_RESEARCH[id];
  if (!C?.identity) return 'You have no company.';
  if (!N) return 'No such project.';
  const r = rs(C);
  if (r.done[id]) return 'Already finished.';
  if (r.active) return r.active.id === id ? 'Already under way.' : `${WAR_RESEARCH[r.active.id].name} is under way: one project at a time.`;
  if (facilityState(game, RESEARCH_FACILITY) !== 'built') return 'Research needs the Command HQ built (and standing).';
  const lack = N.requires.filter((q) => !r.done[q]);
  if (lack.length) return `Needs ${lack.map((q) => WAR_RESEARCH[q].name).join(' and ')} first.`;
  if (!game.corp.canAfford('security', N.cost)) return `The project costs ${N.cost.toLocaleString('en-US')} obols; ${fundingMode(game) === 'wallet' ? 'you hold' : fundingMode(game) === 'group' ? 'the group holds' : 'the company holds'} ${Math.floor(cash(game)).toLocaleString('en-US')}.`;
  return null;
}

export function start(game, id) {
  const bad = why(game, id); if (bad) return { ok: false, text: bad };
  const C = peekMilitary(game).company; const N = WAR_RESEARCH[id]; const r = rs(C); const day = game.clock.day;
  const p = pay(game, N.cost, `Research: ${N.name}`, 'research'); if (!p.ok) return p;
  r.active = { id, start: day, end: day + N.days, paid: N.cost };
  r.log.push({ day, text: `Began research: ${N.name} (${N.cost.toLocaleString('en-US')} obols, ${N.days} days).` }); while (r.log.length > 30) r.log.shift();
  C.log.push({ day, text: `Began research: ${N.name}.` });
  return { ok: true, text: `Research begun: ${N.name}, ${N.days} days.` };
}

/** Every morning: a project whose last day has come is finished, once. */
export function dayTick(game) {
  const C = peekMilitary(game)?.company; if (!C?.identity) return;
  const r = rs(C); const a = r.active; const day = game.clock.day;
  if (!a || day < a.end) return;
  r.done[a.id] = day; r.active = null;
  const N = WAR_RESEARCH[a.id];
  r.log.push({ day, text: `Finished research: ${N.name}.` }); while (r.log.length > 30) r.log.shift();
  C.log.push({ day, text: `Research finished: ${N.name}.` });
  game.notify?.(`Research finished: ${N.name}. ${N.text}`, 'good');
}

export function view(game) {
  const C = peekMilitary(game)?.company; if (!C?.identity) return null;
  const r = rs(C); const day = game.clock.day; const hq = facilityState(game, RESEARCH_FACILITY) === 'built';
  const nodes = Object.entries(WAR_RESEARCH).map(([id, N]) => {
    const state = r.done[id] ? 'done' : r.active?.id === id ? 'active' : N.requires.every((q) => r.done[q]) ? 'open' : 'locked';
    return { id, ...N, state, why: state === 'open' || state === 'locked' ? why(game, id) : null, daysLeft: state === 'active' ? Math.max(0, r.active.end - day) : null, finished: r.done[id] ?? null };
  });
  return { hq, active: r.active ? { ...r.active, name: WAR_RESEARCH[r.active.id].name, daysLeft: Math.max(0, r.active.end - day) } : null, nodes, reach: reach(game), log: r.log.slice(-8), total: Object.values(WAR_RESEARCH).reduce((a, n) => a + n.cost, 0), spent: Object.keys(r.done).reduce((a, id) => a + WAR_RESEARCH[id].cost, 0) };
}
