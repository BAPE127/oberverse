// Helicopters in flight (rules 5): altitude, a straight line over everything, hover, orbit, a pass, and landing only where there is room. Pure; the simulation calls `flyTick` for a helicopter
// instead of walking it along a path.
import { FLIGHT, TICK, TILE } from '../content/battle.js';
import { idx, inb } from './map.js';
import { sizeOf } from './sizes.js';

const dt = 1 / TICK.perSecond;
/** Tiles that take a landing: open ground, a road, a field (not a roof, a wall, a tree, a hedge, water, a trench, wire, the floor of a building). */
const LAND = new Set([TILE.GROUND, TILE.ROAD, TILE.CROP]);
/** The radius of the disc a helicopter needs open to set down: half its length (the rotor is about as wide as it is long) and a margin. */
export const landRadius = (u) => { const s = sizeOf(u); return Math.max(s.len, s.rotor || 0) / 2 + 0.4; };

/** Whether a helicopter of radius `r` can set down at (x, y): every tile the disc touches is open ground outside any building, and no one on the ground stands in it. */
export function landingOk(B, x, y, r, selfId = null) {
  const m = B.map;
  for (let j = Math.floor(y - r); j <= Math.floor(y + r); j++) for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) {
    const nx = Math.max(i, Math.min(x, i + 1)); const ny = Math.max(j, Math.min(y, j + 1)); // (the nearest point of the tile to the centre)
    if (Math.hypot(nx - x, ny - y) >= r) continue;
    if (!inb(m, i, j) || !LAND.has(m.tiles[idx(m, i, j)]) || m.bid[idx(m, i, j)] >= 0) return false;
  }
  for (const o of B.units) if (o.id !== selfId && o.alive && !o.fled && !o.inside && o.kind !== 'helicopter' && Math.hypot(o.x - x, o.y - y) < r + 0.4) return false;
  return true;
}
/** The nearest place to (x, y) a helicopter can land, within `reach` tiles, or null. */
export function landingSpot(B, x, y, r, selfId = null, reach = 8) {
  let best = null; let bd = 1e9;
  for (let j = -reach; j <= reach; j += 0.5) for (let i = -reach; i <= reach; i += 0.5) { const d = Math.hypot(i, j); if (d > reach || d >= bd) continue; if (landingOk(B, x + i, y + j, r, selfId)) { best = { x: x + i, y: y + j }; bd = d; } }
  return best;
}

/** The map edge a helicopter keeps inside. */
export const clampFlight = (m, x, y) => ({ x: Math.max(FLIGHT.edge, Math.min(m.w - FLIGHT.edge, x)), y: Math.max(FLIGHT.edge, Math.min(m.h - FLIGHT.edge, y)) });

const turnTo = (a, to, rate) => { let d = to - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) <= rate ? to : a + Math.sign(d) * rate; };

/**
 * One tick of a helicopter's flight. `moves`: the order wants it to move this tick. Returns nothing; sets x, y, z, heading, v, moving, grounded. An order 'land' ends with the helicopter on the
 * ground and the order 'hold'; 'orbit' never ends by itself.
 */
export function flyTick(B, u, moves) {
  const o = u.order; const sfx = (e) => B.sfx.push(e);
  if (u.grounded === undefined) u.grounded = u.z === 0;
  if (o.type === 'orbit') { // a carrot on the circle, a little ahead of where it is (or the nearest point of the circle while it is still far off)
    const r = o.r || FLIGHT.orbitR; const ang = Math.atan2(u.y - o.y, u.x - o.x); const far = Math.hypot(u.x - o.x, u.y - o.y) > r * 1.6; const a2 = far ? ang : ang + 0.6;
    const w = clampFlight(B.map, o.x + Math.cos(a2) * r, o.y + Math.sin(a2) * r); u.path = [{ x: w.x, y: w.y }]; moves = true;
  }
  const has = u.path.length > 0;
  let tz = FLIGHT.cruise;
  if (u.grounded) { if (moves && has && !(o.type === 'land' && Math.hypot(u.path[0].x - u.x, u.path[0].y - u.y) < 0.3)) { u.grounded = false; sfx({ t: 'rotor', id: u.id, x: u.x, y: u.y, phase: 'start' }); } else tz = 0; }
  if (o.type === 'land' && !has && !u.grounded) { // over the spot: down
    const r = landRadius(u);
    if (!landingOk(B, u.x, u.y, r, u.id)) { u.order = { type: 'hold' }; B.events.push({ t: B.tick, k: 'nolanding', id: u.id }); }
    else tz = 0;
  }
  if (u.z < tz) u.z = Math.min(tz, u.z + FLIGHT.climb * dt); else if (u.z > tz) u.z = Math.max(tz, u.z - FLIGHT.descend * dt);
  if (tz === 0 && u.z === 0 && !u.grounded) { u.grounded = true; u.v = 0; u.moving = false; if (o.type === 'land') { u.order = { type: 'hold' }; B.events.push({ t: B.tick, k: 'landed', id: u.id }); } sfx({ t: 'rotor', id: u.id, x: u.x, y: u.y, phase: 'stop' }); return; }
  if (u.grounded) { u.moving = false; u.v = 0; return; }
  const vmax = u.speed * (u.mod ? 1 : 1);
  if (moves && has && u.z >= FLIGHT.cruise * 0.6 - 1e-9) {
    const nx = u.path[0]; const dx = nx.x - u.x; const dy = nx.y - u.y; const d = Math.hypot(dx, dy);
    const last = u.path.length === 1; const vt = last && o.type !== 'orbit' && o.type !== 'pass' ? Math.min(vmax, Math.sqrt(2 * FLIGHT.brake * d) + 0.2) : vmax;
    u.v = u.v ?? 0; u.v += Math.max(-FLIGHT.brake * dt, Math.min(FLIGHT.accel * dt, vt - u.v));
    if (d > 0.05) u.heading = turnTo(u.heading ?? 0, Math.atan2(dy, dx), FLIGHT.turn * dt);
    const step = u.v * dt;
    if (d <= Math.max(step, 0.12)) { u.x = nx.x; u.y = nx.y; u.travelled += d; u.path.shift(); if (!u.path.length) u.v = 0; } else { u.x += (dx / d) * step; u.y += (dy / d) * step; u.travelled += step; }
    u.moving = true;
  } else { u.v = Math.max(0, (u.v ?? 0) - FLIGHT.brake * dt); u.moving = u.v > 0.05; if (u.moving && u.path.length) { /* coasting */ } }
  if (B.tick % 10 === 0) sfx({ t: 'rotor', id: u.id, x: u.x, y: u.y, z: u.z, rpm: u.moving ? 'high' : 'idle' });
}
