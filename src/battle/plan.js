// The planning stage (rules 5): a battle made with `setup.plan` and a player at the controls begins in B.phase 'plan' and does not tick. The player may split squads (teams.js), choose an entry zone, place
// teams, vehicles and helicopters inside it, and read the scout picture (`planIntel`); `beginBattle` starts the clock. There are NO opening orders. Everything done here is logged for the replay.
// A headless or unattended battle (the enemy, a force on its own) plans itself and begins at once.
import { UAV, TICK, TILE } from '../content/battle.js';
import { canStand, clearance } from './nav.js';
import { idx, inb } from './map.js';
import { formationSpots } from './formation.js';
import { landingOk, landRadius } from './flight.js';
import { sizeOf, clearRadius, bodyRadius } from './sizes.js';
import { teamOf } from './teams.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** The entry zones of the map (a map without any, an older version, has one round the start). */
export function entriesOf(B) {
  const m = B.map; if (m.entries?.length) return m.entries;
  const s = m.spawns.p; return [{ id: 'main', name: 'Start', zone: { x: Math.max(0, s.x - 6), y: Math.max(0, s.y - 5), w: 12, h: 10 } }];
}
export const currentEntry = (B) => entriesOf(B).find((e) => e.id === B.entry) || entriesOf(B)[0];
const inZone = (z, x, y) => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h;
const kindOf = (u) => (u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh');
const mineOnMap = (B) => B.units.filter((u) => u.side === 'p' && u.alive);

/** Whether a unit of ours may stand at (x, y): ground it can stand on, outside every building, with room (a vehicle's clearance and no other vehicle on it; a helicopter's landing disc). */
function spotOk(B, u, x, y, ignore = null) {
  const m = B.map; const tx = Math.floor(x); const ty = Math.floor(y);
  if (!inb(m, tx, ty) || m.bid[idx(m, tx, ty)] >= 0 || !canStand(m, tx, ty, kindOf(u) === 'heli' ? 'veh' : kindOf(u))) return false;
  if (u.kind === 'inf') return true;
  if (u.kind === 'helicopter') return landingOk(B, x, y, landRadius(u), u.id);
  if (clearance(m)[idx(m, tx, ty)] < clearRadius(u) - 1e-6) return false;
  for (const o of B.units) if (o !== u && o !== ignore && o.alive && !o.inside && o.kind !== 'inf' && o.kind !== 'helicopter' && dist(o, { x, y }) < bodyRadius(o) + bodyRadius(u) + 0.1) return false;
  return true;
}
function put(u, x, y, heading) { u.x = x; u.y = y; u.z = 0; u.path = []; u.order = { type: 'hold' }; u.target = null; u.moving = false; u.v = 0; if (heading !== undefined) u.heading = heading; }

/** Where the front of a zone is: the point of it nearest the objective. */
const frontOf = (B, z) => ({ x: Math.max(z.x, Math.min(z.x + z.w - 1, B.map.objective.x)), y: Math.max(z.y, Math.min(z.y + z.h - 1, B.map.objective.y)) });
const headingTo = (B, p) => Math.atan2(B.map.objective.y - p.y, B.map.objective.x - p.x);

/**
 * The spots a team would take with its middle at (x, y): each member's place in the formation, brought inside the zone and, if that ground will not do, to the nearest ground that will (not one a
 * teammate has). Null if the middle itself is outside the zone or there is no room.
 */
function teamSpots(B, team, x, y, z) {
  if (!inZone(z, x, y)) return null;
  const us = team.members.map((m) => B.byId.get(m)).filter((u) => u && u.alive && !u.inside);
  const sp = formationSpots(us.length, x, y, headingTo(B, { x, y }), team.formation || 'line'); const out = []; const used = [];
  for (let i = 0; i < us.length; i++) {
    const cx = Math.max(z.x + 0.5, Math.min(z.x + z.w - 0.5, sp[i].x)); const cy = Math.max(z.y + 0.5, Math.min(z.y + z.h - 0.5, sp[i].y)); let at = null;
    for (let r = 0; r <= 4 && !at; r++) for (let j = -r; j <= r && !at; j++) for (let k = -r; k <= r && !at; k++) { if (Math.max(Math.abs(j), Math.abs(k)) !== r) continue; const px = Math.floor(cx) + k + 0.5; const py = Math.floor(cy) + j + 0.5; if (inZone(z, px, py) && spotOk(B, us[i], px, py) && !used.some((q) => dist(q, { x: px, y: py }) < 0.9)) at = { x: px, y: py }; }
    if (!at) return null; used.push(at); out.push([us[i], at]);
  }
  return out;
}

/** Place a team (an id of a team of yours) or a vehicle or helicopter (its unit id) with its middle at (x, y): inside the chosen entry zone, on ground it can stand on, in the planning stage only. Logged. */
export function deploy(B, id, x, y) {
  if (B.phase !== 'plan') return { ok: false, text: 'The battle has begun.' };
  const z = currentEntry(B).zone; const t = (B.teams || []).find((q) => q.id === id) || null; const u = B.byId.get(id);
  if (t && t.side === 'p') {
    if (t.kind === 'veh') return deploy(B, t.members[0], x, y);
    const spots = teamSpots(B, t, x, y, z); if (!spots) return { ok: false, text: 'There is no room for them there: keep inside the zone, on open ground.' };
    for (const [m, p] of spots) put(m, p.x, p.y, headingTo(B, p));
    B.log.push({ t: 0, ids: [], order: { type: 'deploy', id, x, y } }); return { ok: true, text: `${t.name} is in place.` };
  }
  if (u && u.side === 'p' && u.kind !== 'inf' && u.alive) {
    if (!inZone(z, x, y) || !spotOk(B, u, x, y)) return { ok: false, text: u.kind === 'helicopter' ? 'It needs open ground to land: nothing in the way, no roof, no narrow street.' : 'It does not fit there: keep inside the zone, on open ground with room for it.' };
    put(u, x, y, headingTo(B, { x, y })); if (u.kind === 'helicopter') { u.grounded = true; }
    B.log.push({ t: 0, ids: [], order: { type: 'deploy', id, x, y } }); return { ok: true, text: `${u.name} is in place.` };
  }
  return { ok: false, text: 'Nothing of yours has that name.' };
}

/** The sound default: teams in a row along the front of the zone, vehicles and helicopters behind them. Not logged (it follows from the state); `chooseEntry` and the headless start use it. */
export function autoPlan(B) {
  const z = currentEntry(B).zone; const f = frontOf(B, z); const spots = [];
  for (let j = z.y + 1; j < z.y + z.h - 1; j += 1) for (let i = z.x + 1; i < z.x + z.w - 1; i += 1) spots.push({ x: i + 0.5, y: j + 0.5, d: Math.hypot(i - f.x, j - f.y) });
  spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const placed = []; const teams = (B.teams || []).filter((t) => t.side === 'p' && t.members.some((m) => B.byId.get(m)?.alive && !B.byId.get(m).inside));
  for (const t of teams.filter((q) => q.kind === 'inf')) { for (const s of spots) { if (placed.some((p) => dist(p, s) < 3.4)) continue; const sp = teamSpots(B, t, s.x, s.y, z); if (!sp) continue; for (const [m, p] of sp) put(m, p.x, p.y, headingTo(B, p)); placed.push(s); break; } }
  for (const t of teams.filter((q) => q.kind === 'veh')) { const u = B.byId.get(t.members[0]); for (const s of [...spots].reverse()) { if (!spotOk(B, u, s.x, s.y)) continue; put(u, s.x, s.y, headingTo(B, s)); if (u.kind === 'helicopter') u.grounded = true; break; } }
}
/** Choose another entry zone (planning only): the force is laid out again in it. Logged. */
export function chooseEntry(B, entryId) {
  if (B.phase !== 'plan') return { ok: false, text: 'The battle has begun.' };
  const e = entriesOf(B).find((q) => q.id === entryId); if (!e) return { ok: false, text: 'No such entry.' };
  B.entry = e.id; autoPlan(B); B.log.push({ t: 0, ids: [], order: { type: 'entry', id: e.id } }); return { ok: true, text: `Entering by ${e.name.toLowerCase()}.` };
}
/** Start the clock. Logged. */
export function beginBattle(B) {
  if (B.phase !== 'plan') return { ok: false, text: 'The battle has already begun.' };
  B.phase = 'live'; B.log.push({ t: 0, ids: [], order: { type: 'begin' } }); return { ok: true, text: 'The battle begins.' };
}

/**
 * The scout picture: only what the province's intel and what was already scouted give (the setup's intel level: unseen, spotted, known; what a drone or a recon has marked), never an enemy that is not
 * marked. Contacts carry how sure we are; a force that is only spotted has no role. Strongpoints are the buildings and trench lines where a marked enemy stands; AA the marked guns.
 */
export function planIntel(B) {
  const level = B.setup?.intel ?? null; const seen = new Map();
  for (const [id, at] of Object.entries(B.spotted || {})) { const e = B.byId.get(id); if (e && e.side === 'e' && e.alive && !e.fled && B.tick - at < UAV.memory * TICK.perSecond) seen.set(id, e); }
  for (const c of B.per?.p?.values?.() || []) { const e = B.byId.get(c.id); if (e && e.side === 'e' && e.alive && !c.heard && c.vis) seen.set(c.id, e); }
  const known = level === 2; const contacts = []; const strongpoints = []; const aa = []; const used = new Set();
  for (const [id, e] of seen) {
    contacts.push({ id, x: e.x, y: e.y, kind: e.kind === 'inf' ? 'inf' : e.kind === 'helicopter' ? 'air' : 'veh', role: known ? e.role : null, conf: known ? 1 : 0.7 });
    if (e.W?.airOnly) aa.push({ x: e.x, y: e.y, conf: known ? 1 : 0.7 });
    const b = B.map.bid[idx(B.map, Math.floor(e.x), Math.floor(e.y))];
    if (b >= 0 && !used.has(`b${b}`)) { used.add(`b${b}`); const bd = B.map.buildings[b]; strongpoints.push({ kind: 'building', b, x: bd.x + bd.w / 2, y: bd.y + bd.h / 2, floors: bd.floors }); }
    else if (B.map.tiles[idx(B.map, Math.floor(e.x), Math.floor(e.y))] === TILE.TRENCH && !strongpoints.some((q) => q.kind === 'trench' && dist(q, e) < 6)) strongpoints.push({ kind: 'trench', x: e.x, y: e.y });
  }
  return { phase: B.phase, level, entry: currentEntry(B).id, entries: entriesOf(B).map((e) => ({ id: e.id, name: e.name, zone: { ...e.zone } })), objective: { ...B.map.objective }, exit: { ...B.map.exit }, contacts, strongpoints, aa };
}
export { mineOnMap };
