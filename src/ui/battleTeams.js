// The battle screen's pure parts (no DOM): how teams are tagged and coloured, which team a click or a number key means, how a selection becomes the ids an order is issued to, and how the planning
// screen reads the simulation (what is unplaced, what the scouts' intelligence level says). The panel (battle.js) calls these; tests/battle_ui.test.mjs drives them with the simulation as the panel does.
import { currentEntry } from '../battle/plan.js';

/** The team palette: CSS variables `--bt-team-N` on `.bt` (styles.css); these are the fallbacks where there is no stylesheet. */
export const TEAM_VARS = ['--bt-team-0', '--bt-team-1', '--bt-team-2', '--bt-team-3', '--bt-team-4', '--bt-team-5', '--bt-team-6', '--bt-team-7'];
export const TEAM_FALLBACK = ['#5ec27a', '#6aa8ff', '#ffb43a', '#d98aff', '#4fd8d0', '#ff7a8a', '#d8e05a', '#b0b8c8'];

/** The player's teams in a stable order (the simulation's own: ids grow, so a team keeps its place for the whole battle). */
export const myTeams = (B) => (B.teams || []).filter((t) => t.side === 'p' && t.members.some((m) => B.byId.get(m)));
export const teamIndex = (B, teamId) => myTeams(B).findIndex((t) => t.id === teamId);
/** A team's letter: a trailing capital or digit of its name ("Squad 1 B" is B, "Alpha" is A), else its initial. */
export const teamLetter = (t) => { const m = /(?:^|\s)([A-Z0-9])$/.exec(t.name || ''); return m ? m[1] : String(t.name || '?')[0].toUpperCase(); };
/** The tag a figure carries over its head: { team, letter, color }; color is an index into the palette, resolved by the caller (`colorOf`). */
export function tagOf(B, unitId, colorOf = (i) => TEAM_FALLBACK[i % TEAM_FALLBACK.length]) {
  const t = (B.teams || []).find((q) => q.side === 'p' && q.members.includes(unitId)); if (!t) return null;
  const i = teamIndex(B, t.id); return { team: t.id, letter: teamLetter(t), color: colorOf(Math.max(0, i)) };
}
/** Every living figure of yours in a team that is not a lone vehicle: unit id -> tag (rebuilt when teams change, a few times a second at most). */
export function tagMap(B, colorOf) {
  const out = new Map();
  for (const t of myTeams(B)) { for (const m of t.members) { const u = B.byId.get(m); if (u && u.alive && !u.fled) out.set(m, { team: t.id, letter: teamLetter(t), color: colorOf(Math.max(0, teamIndex(B, t.id))) }); } }
  return out;
}

/** The living members of a team. */
export const liveMembers = (B, t) => t.members.filter((m) => { const u = B.byId.get(m); return u && u.alive && !u.fled; });

/**
 * What a click on a unit selects: its whole team, or, with the modifier, only that unit. A vehicle or a helicopter is a team of its own.
 * Returns unit ids (the selection is always unit ids: boxes and chips work on units).
 */
export function clickSelect(B, unitId, single = false) {
  if (single) return [unitId];
  const t = (B.teams || []).find((q) => q.side === 'p' && q.members.includes(unitId));
  return t ? liveMembers(B, t) : [unitId];
}

/** The ids an order is issued to for a set of selected units: a team id where all its living members are selected, else the unit ids (the simulation takes both). */
export function orderIds(B, selected) {
  const sel = new Set([...selected].filter((id) => { const u = B.byId.get(id); return u && u.alive && !u.fled; })); const out = []; const done = new Set();
  for (const t of myTeams(B)) { const live = liveMembers(B, t); if (live.length && live.every((m) => sel.has(m))) { out.push(t.id); for (const m of live) done.add(m); } }
  for (const id of sel) if (!done.has(id)) out.push(id);
  return out;
}

/** The teams the selected units belong to, with how many of each are selected: [{ team, n, of }]. */
export function teamsOfSelection(B, selected) {
  const by = new Map();
  for (const id of selected) { const t = (B.teams || []).find((q) => q.side === 'p' && q.members.includes(id)); if (!t) continue; const e = by.get(t.id) || { team: t, n: 0, of: liveMembers(B, t).length }; e.n++; by.set(t.id, e); }
  return [...by.values()];
}

// ---- number keys: teams are bound to 1..9 in order at the start, and Ctrl + number rebinds
/** The binding of number keys to team ids: a Map digit -> team id. */
export function autoBind(B, bind = new Map()) {
  const live = new Set(myTeams(B).map((t) => t.id));
  for (const [k, v] of [...bind]) if (!live.has(v)) bind.delete(k);
  const bound = new Set(bind.values());
  for (const t of myTeams(B)) { if (bound.has(t.id)) continue; for (let d = 1; d <= 9; d++) if (!bind.has(String(d))) { bind.set(String(d), t.id); break; } }
  return bind;
}
export function bindTeam(bind, digit, teamId) { for (const [k, v] of [...bind]) if (v === teamId) bind.delete(k); bind.set(String(digit), teamId); return bind; }
/** The living members a number key calls up (empty when the key is bound to nothing or to a dead team). */
export function recall(B, bind, digit) { const id = bind.get(String(digit)); const t = id && (B.teams || []).find((q) => q.id === id); return t ? liveMembers(B, t) : []; }

// ---- the planning stage
const inZone = (z, x, y) => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h;
/** Which of your units stand outside the chosen entry zone (a unit not yet placed there): { teams: [names], count }. A unit aboard a carrier is not unplaced. */
export function unplaced(B) {
  const z = currentEntry(B).zone; const names = []; let count = 0;
  for (const t of myTeams(B)) { const out = t.members.map((m) => B.byId.get(m)).filter((u) => u && u.alive && !u.inside && !inZone(z, u.x, u.y)); if (out.length) { names.push(t.name); count += out.length; } }
  return { teams: names, count };
}
/** A sentence for the scout picture: what level of intelligence this is, what is marked, and what would improve it. Only the planIntel result is read. */
export function intelText(intel) {
  const n = intel.contacts.length; const lv = intel.level;
  if (lv === 2) return `Known: the province's intelligence has marked ${n} enemy position${n === 1 ? '' : 's'} exactly, with what they are. Nothing more can be learned before the first shot; a scout drone would only watch them move.`;
  if (lv === 1) return `Spotted: ${n} enemy position${n === 1 ? '' : 's'} marked roughly (the rings show how far out they may be). A scout drone, a recon order or simply looking will firm them up; what is not marked is still a surprise.`;
  return n ? `Little is known: ${n} position${n === 1 ? ' is' : 's are'} marked from earlier scouting. Everything else is a guess. A scout drone or a recon patrol, sent at once, is the way to learn more.` : 'Nothing is known of the enemy. The objective and the exit are marked; the rest you will find in the field. A scout drone or a recon patrol, sent at once, is the way to learn more.';
}
