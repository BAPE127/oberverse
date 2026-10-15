// NPCs on the buses (v0.33.0). A character whose occupation (or LIFE entry)
// prefers transit and who is going to another region plans a bus trip: walk
// to the best stop, wait, board a bus of the chosen line when it stands at
// the stop, ride it (aboard, hidden, moving with the bus — on screen or off),
// get off at the stop nearest the destination, and walk the rest. A missed
// connection is given up after MAX_WAIT minutes and they walk instead.
//
// npc.trip = { line, from, to, target, waitRef, phase: 'to_stop' | 'waiting' | 'riding' | 'to_dest', since }
// npc.riding = the bus's index while aboard. Both are saved.
import { parseSpotRef, TILE } from '../core/util.js';
import { mapToWorld } from '../world/layout.js';

const MAX_WAIT = 120; // game minutes before giving up on the bus
const NO_BUS_AFTER_GIVING_UP = 240;

/** The outdoor map and tile a spot is at, or leads out to (interiors: their exit door's far side). */
export function outdoorPoint(g, ref) {
  let { map, spot } = parseSpotRef(ref);
  let m = g.maps.get(map);
  let s = m?.spot(spot);
  for (let i = 0; i < 4 && m && m.kind === 'interior'; i++) {
    const exit = m.doors.find((d) => d.to && !d.to.map.startsWith('__'));
    if (!exit) return null;
    map = exit.to.map;
    m = g.maps.get(map);
    s = m?.spot(exit.to.spot);
  }
  return m && s ? { map, x: s.x, y: s.y } : null;
}

export function regionOf(g, mapId) {
  for (const [id, r] of Object.entries(g.content.regions || {})) if (r.maps[mapId]) return id;
  return null;
}

function worldTiles(g, pt) {
  const w = mapToWorld(g, pt.map, pt.x * TILE, pt.y * TILE);
  return w ? { x: w.x, y: w.y } : null;
}

/** How this character gets about: their LIFE override, else their occupation's. */
export function transportOf(g, npc) {
  const life = g.content.life?.homes?.[npc.id] || g.content.life?.exceptions?.[npc.id];
  if (!life) return 'walk';
  return life.transport || g.content.life.occupations[life.occupation]?.transport || 'walk';
}

/** Plan a bus trip to a spot in another region, or null (walk). */
export function planTrip(g, npc, targetRef) {
  if (transportOf(g, npc) !== 'transit') return null;
  if ((npc.noTransitUntil || 0) > g.clock.total) return null;
  const here = g.maps.get(npc.map)?.kind === 'interior' ? outdoorPoint(g, `${npc.map}:${Object.keys(g.maps.get(npc.map).def.spots)[0]}`) : { map: npc.map, x: npc.x / TILE, y: npc.y / TILE };
  const there = outdoorPoint(g, targetRef);
  if (!here || !there) return null;
  const rFrom = regionOf(g, here.map);
  const rTo = regionOf(g, there.map);
  if (!rFrom || !rTo || rFrom === rTo) return null;
  const wHere = worldTiles(g, here);
  const wThere = worldTiles(g, there);
  if (!wHere || !wThere) return null;
  let best = null;
  for (const L of Object.values(g.transit.lines || (g.transit.setup(), g.transit.lines))) {
    const stops = L.cfg.stops;
    const near = (w, region) => {
      let b = null;
      for (const s of stops) {
        if (regionOf(g, s.sign.map) !== region) continue;
        const ws = worldTiles(g, { map: s.sign.map, x: s.sign.x, y: s.sign.y });
        const d = Math.hypot(ws.x - w.x, ws.y - w.y);
        if (!b || d < b.d) b = { s, d };
      }
      return b;
    };
    const a = near(wHere, rFrom);
    const b = near(wThere, rTo);
    if (!a || !b) continue;
    const walk = a.d + b.d;
    if (!best || walk < best.walk) best = { line: L.cfg.id, from: a.s, to: b.s, walk };
  }
  if (!best) return null;
  return { line: best.line, from: best.from.id, to: best.to.id, target: targetRef, waitRef: `${best.from.sign.map}:wait_${best.from.id}`, phase: 'to_stop', since: g.clock.total };
}

/** Each game minute: waiting passengers board, riding passengers get off at their stop, the impatient give up. */
export function transitTick(g, sys) {
  const T = g.transit;
  T.setup();
  for (const npc of g.npcs.values()) {
    const trip = npc.trip;
    if (!trip) continue;
    if (trip.phase === 'waiting') {
      const bus = T.followers.find((f) => f.kind === 'bus' && f.line === trip.line && T.dwelling(f) && T.stopFor(f).id === trip.from && rightWay(T, f, trip));
      if (bus) {
        trip.phase = 'riding';
        npc.riding = bus.idx;
        npc.path = null;
        npc.travel = null;
        g.bus.emit('npc:boarded', { npcId: npc.id, bus: bus.idx, stop: trip.from });
      } else if (g.clock.total - trip.since > MAX_WAIT) {
        npc.trip = null;
        npc.noTransitUntil = g.clock.total + NO_BUS_AFTER_GIVING_UP;
        npc.arrived = false;
        sys.plan(npc);
      }
    } else if (trip.phase === 'riding') {
      const bus = T.bus(npc.riding);
      if (!bus) { npc.riding = null; npc.trip = null; npc.arrived = false; sys.plan(npc); continue; }
      carry(npc, bus);
      if (T.dwelling(bus) && T.stopFor(bus).id === trip.to) alight(g, sys, npc, trip);
    }
  }
}

/** Keep a passenger with their bus (called every frame for the visible ones, and each minute). */
export function carry(npc, bus) {
  if (!bus.map) return; // on the road between regions
  npc.map = bus.map;
  npc.x = bus.x;
  npc.y = bus.y;
}

function alight(g, sys, npc, trip) {
  const stop = g.transit.lines[trip.line].cfg.stops.find((s) => s.id === trip.to);
  const m = g.maps.get(stop.sign.map);
  const w = m.spotPx(`wait_${stop.id}`) || { x: (stop.sign.x + 1.5) * TILE, y: (stop.sign.y + 0.5) * TILE };
  npc.riding = null;
  npc.map = m.id;
  npc.x = w.x;
  npc.y = w.y;
  trip.phase = 'to_dest';
  npc.arrived = false;
  g.bus.emit('npc:alighted', { npcId: npc.id, stop: stop.id });
  sys.plan(npc);
}

/** Is this bus going the quicker way round to the passenger's stop? (A loop calls at most stops in both directions.) */
function rightWay(T, bus, trip) {
  const L = T.lines[trip.line];
  const fwd = (d) => Math.min(...L.stops.filter((s) => s.id === trip.to).map((s) => L.route.wrap(s.dist - d)));
  const best = Math.min(...L.stops.filter((s) => s.id === trip.from).map((s) => fwd(s.dist)));
  return fwd(bus.dist) <= best + 64;
}
