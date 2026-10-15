// Transit (v0.17.0 "Route 1"; v0.20.0 "Streets"): the No. 1 bus and the traffic.
//
// Vehicles drive fixed lanes in WORLD space (src/world/layout.js), so a bus can
// run from the Yards through Halvermouth and along the coast road to the Ober
// Fields, crossing maps and region gates. Routes are authored per map
// (src/content/transit.js) and rounded at every corner, so vehicles swing
// through turns instead of pivoting on the spot.
//
// Near you (same region) vehicles move every frame and stop for whatever is in
// front of them — you, people, other vehicles, parked cars — and for red
// lights at the junctions (src/world/lights.js); elsewhere, or while time
// skips, they move once a game minute and never stop.
//
// The bus: three buses on one loop, 2 obols a ride. Traffic: rings round city
// blocks, plus through traffic that drives in through one gate and out through
// another (it leaves the map and new cars come in — no U-turns at the edges).
//
// State: game.world.transit = { buses: [{ dist, dwellUntil, lastStop }] } —
// traffic is regenerated each session. Runtime: this.followers.
import { TILE, clamp, dist } from '../core/util.js';
import { worldToMap, mapToWorld } from '../world/layout.js';
import { lightState } from '../world/lights.js';
import { isDown } from './combat.js';

const CORNER = 1.6 * TILE; // radius of the curve at each corner
const HONK_GAP = 9; // seconds between any two honks you hear
const BOX_PAD = 2; // px

/** A polyline in world pixels (closed, or open from a start to an end), rounded at the corners, with arc-length lookup. */
export class Route {
  constructor(pts, { closed = true } = {}) {
    this.closed = closed;
    this.pts = closed ? Route.round(pts, true) : Route.round(pts, false);
    const n = this.pts.length;
    this.cum = [0];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = this.pts[i];
      const b = this.pts[(i + 1) % n];
      this.cum.push(this.cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cum[segs];
  }

  /** Replace each sharp corner with a short curve (quadratic, sampled). */
  static round(pts, closed) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const prev = pts[(i - 1 + n) % n];
      const next = pts[(i + 1) % n];
      if (!closed && (i === 0 || i === n - 1)) { out.push(p); continue; }
      const a1 = Math.atan2(p.y - prev.y, p.x - prev.x);
      const a2 = Math.atan2(next.y - p.y, next.x - p.x);
      const turn = Math.abs(((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const l1 = Math.hypot(p.x - prev.x, p.y - prev.y);
      const l2 = Math.hypot(next.x - p.x, next.y - p.y);
      const r = Math.min(CORNER, l1 / 2.2, l2 / 2.2);
      if (turn < 0.15 || r < 4) { out.push(p); continue; }
      const s = { x: p.x - Math.cos(a1) * r, y: p.y - Math.sin(a1) * r };
      const e = { x: p.x + Math.cos(a2) * r, y: p.y + Math.sin(a2) * r };
      const steps = Math.max(3, Math.round(turn * 5));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        out.push({ x: (1 - t) ** 2 * s.x + 2 * (1 - t) * t * p.x + t * t * e.x, y: (1 - t) ** 2 * s.y + 2 * (1 - t) * t * p.y + t * t * e.y });
      }
    }
    return out;
  }

  wrap(d) {
    if (!this.closed) return clamp(d, 0, this.length);
    return ((d % this.length) + this.length) % this.length;
  }

  /** Forward distance from a to b along the route (Infinity if behind, on an open route). */
  ahead(a, b) {
    if (this.closed) return this.wrap(b - a);
    return b >= a ? b - a : Infinity;
  }

  at(d) {
    d = this.wrap(d);
    let lo = 0;
    let hi = this.cum.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.cum[mid] <= d) lo = mid; else hi = mid - 1;
    }
    const i = lo;
    const a = this.pts[i];
    const b = this.pts[(i + 1) % this.pts.length];
    const seg = this.cum[i + 1] - this.cum[i] || 1;
    const t = (d - this.cum[i]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x), seg: i };
  }

  /** Distances along the route where it passes within `r` px of a point (one per pass). */
  near(px, py, r) {
    const out = [];
    let run = null;
    for (let d = 0; d <= this.length; d += 8) {
      const p = this.at(d);
      const dd = Math.hypot(p.x - px, p.y - py);
      if (dd < r) {
        if (!run || dd < run.best) run = { ...(run || {}), best: dd, dist: d };
      } else if (run) { out.push(run.dist); run = null; }
    }
    if (run) out.push(run.dist);
    return out;
  }
}

export function freshTransit(content) {
  const B = content.transit.bus;
  return { buses: Array.from({ length: B.buses }, (_, i) => ({ dist: null, slot: i, dwellUntil: 0 })) };
}

export class Transit {
  constructor(game) {
    this.game = game;
    this.followers = [];
    this.ready = false;
    this.nextId = 1;
    this.respawn = [];
    this.honkAt = -100;
  }

  get cfg() {
    return this.game.content.transit;
  }

  get state() {
    const g = this.game;
    if (!g.world.transit) g.world.transit = freshTransit(g.content);
    return g.world.transit;
  }

  /** Map-local points → world pixels. */
  worldPts(points) {
    return points.map((p) => {
      const w = mapToWorld(this.game, p.map, p.x * TILE, p.y * TILE);
      return { x: w.x * TILE, y: w.y * TILE };
    });
  }

  /** Build routes, stops, junctions, buses and traffic (lazily: the maps must exist). */
  setup() {
    if (this.ready) return;
    const g = this.game;
    const B = this.cfg.bus;
    this.busRoute = new Route(this.worldPts(B.route));
    // junction boxes in world pixels, and where each route enters them (and along which axis)
    this.junctions = (this.cfg.junctions || []).map((j) => {
      const w = mapToWorld(g, j.map, j.x * TILE, j.y * TILE);
      return { ...j, wx: w.x * TILE, wy: w.y * TILE, ww: j.w * TILE, wh: j.h * TILE };
    });
    // each stop, at its distance along the loop in each direction
    this.stops = [];
    for (const s of B.stops) {
      const w = mapToWorld(g, s.sign.map, (s.sign.x + 0.5) * TILE, (s.sign.y + 0.5) * TILE);
      for (const d of this.busRoute.near(w.x * TILE, w.y * TILE, 5.5 * TILE)) this.stops.push({ ...s, dist: d });
    }
    this.stops.sort((a, b) => a.dist - b.dist);
    // the far end of the line: the route's easternmost point
    let far = 0;
    let fx = -Infinity;
    for (let d = 0; d < this.busRoute.length; d += 32) { const p = this.busRoute.at(d); if (p.x > fx) { fx = p.x; far = d; } }
    this.turn = far;
    this.entries(this.busRoute);
    const st = this.state;
    this.followers = st.buses.map((b, i) => {
      if (b.dist === null || b.dist === undefined || b.dist > this.busRoute.length) b.dist = (this.busRoute.length * i) / st.buses.length;
      return { id: `bus${i + 1}`, kind: 'bus', idx: i, route: this.busRoute, dist: b.dist, speed: 0, max: B.speed, len: B.len, wid: B.wid, color: B.color, state: b };
    });
    // traffic
    const T = this.cfg.traffic;
    let n = 0;
    this.loops = {};
    for (const loop of T.loops) {
      const route = new Route(this.worldPts(loop.path), { closed: !loop.open });
      this.entries(route);
      this.loops[loop.id] = { ...loop, route };
      for (let i = 0; i < loop.cars; i++) {
        const f = this.makeCar(loop, route, n++);
        f.dist = loop.open ? (route.length * (i + 0.5)) / (loop.cars + 0.5) : (route.length * (i + 0.3)) / loop.cars;
        this.followers.push(f);
      }
    }
    this.ready = true;
    for (const f of this.followers) this.place(f);
  }

  makeCar(loop, route, n) {
    const g = this.game;
    const T = this.cfg.traffic;
    const model = T.models[(n * 3 + this.nextId) % T.models.length];
    const m = g.content.vehicles.models[model];
    const max = loop.speed[0] + (((n * 37 + this.nextId * 53) % 100) / 100) * (loop.speed[1] - loop.speed[0]);
    return { id: `tr${this.nextId++}`, kind: 'traffic', loop: loop.id, route, dist: 0, speed: max * 0.6, max, len: m.len, wid: m.wid, model, color: T.colors[(n * 5 + this.nextId) % T.colors.length] };
  }

  /** Where a route enters each junction, and on which axis (for the lights). */
  entries(route) {
    const inside = (p) => this.junctions.find((j) => p.x >= j.wx - BOX_PAD && p.x < j.wx + j.ww + BOX_PAD && p.y >= j.wy - BOX_PAD && p.y < j.wy + j.wh + BOX_PAD) || null;
    route.lights = [];
    let prev = inside(route.at(0));
    for (let d = 8; d <= route.length; d += 8) {
      const p = route.at(d);
      const j = inside(p);
      if (j && j !== prev) route.lights.push({ dist: d, j, axis: Math.abs(Math.cos(p.angle)) > Math.abs(Math.sin(p.angle)) ? 'ew' : 'ns' });
      prev = j;
    }
  }

  /** Recompute a follower's world position, heading and map. */
  place(f) {
    const p = f.route.at(f.dist);
    f.wx = p.x;
    f.wy = p.y;
    f.angle = p.angle;
    const m = worldToMap(this.game, p.x / TILE, p.y / TILE);
    f.map = m?.map || null;
    f.x = m?.x;
    f.y = m?.y;
  }

  /** Followers drawn on a map, in its pixels. */
  on(mapId) {
    this.setup();
    return this.followers.filter((f) => f.map === mapId);
  }

  bus(i) {
    this.setup();
    return this.followers.find((f) => f.kind === 'bus' && f.idx === i);
  }

  dwelling(f) {
    return f.kind === 'bus' && this.game.clock.total < f.state.dwellUntil;
  }

  /** The stop a bus is at (while dwelling), or the next one ahead. */
  stopFor(f, ahead = false) {
    const d = f.dist;
    if (!ahead) {
      const here = this.stops.find((s) => Math.abs(s.dist - d) < 2);
      if (here) return here;
    }
    return this.stops.find((s) => s.dist > d + 2) || this.stops[0];
  }

  /** "towards the Ober Fields" or "towards the Yards". */
  heading(f) {
    return f.dist < this.turn ? 'towards the Ober Fields' : 'towards Mill Road Yards';
  }

  regionOf(mapId) {
    const regions = this.game.content.regions || {};
    for (const [id, r] of Object.entries(regions)) if (r.maps[mapId]) return id;
    return null;
  }

  /** Is this follower near enough to the player to drive carefully, every frame? */
  near(f) {
    const g = this.game;
    const pm = g.currentMap();
    if (pm.kind === 'interior' || !f.map) return false;
    return this.regionOf(f.map) === this.regionOf(pm.id);
  }

  riding() {
    const r = this.game.player.riding;
    return r !== null && r !== undefined;
  }

  // ------------------------------------------------------------- driving
  /** Per frame: everything near you moves carefully; the bus you're on carries you. */
  update(dt) {
    this.setup();
    for (const f of [...this.followers]) {
      if (!this.near(f) && !(f.kind === 'bus' && this.game.player.riding === f.idx)) continue;
      this.step(f, dt, true);
    }
    if (this.riding()) this.carryRider();
  }

  /** Per game minute: everything else moves, without looking. */
  minuteTick() {
    this.setup();
    const g = this.game;
    for (const f of [...this.followers]) {
      if (this.near(f) && !g.skipping) continue;
      if (f.kind === 'bus' && g.player.riding === f.idx && !g.skipping) continue;
      this.step(f, 1, false);
    }
    if (g.skipping && this.riding()) this.carryRider();
    // cars come back to the roads: a carjacked one later, a through car that left by the next
    if (this.respawn.length) {
      const due = this.respawn.filter((r) => r.at <= g.clock.total);
      this.respawn = this.respawn.filter((r) => r.at > g.clock.total);
      for (const r of due) {
        const f = r.f;
        f.dist = f.route.closed ? f.route.wrap(f.dist + f.route.length / 2) : 0;
        f.speed = f.max * 0.6;
        f.waitT = 0;
        this.followers.push(f);
        this.place(f);
      }
    }
  }

  step(f, dt, careful) {
    const g = this.game;
    const B = this.cfg.bus;
    if (f.kind === 'bus' && g.clock.total < f.state.dwellUntil) { f.speed = 0; return; }
    let target = f.max;
    // ease into the next stop
    let toStop = Infinity;
    let stop = null;
    if (f.kind === 'bus') {
      stop = this.stops.find((s) => s.dist > f.dist + 0.5 && f.state.lastStop !== `${s.id}@${Math.round(s.dist)}`) || this.stops.find((s) => f.state.lastStop !== `${s.id}@${Math.round(s.dist)}`);
      if (stop) toStop = f.route.wrap(stop.dist - f.dist);
      if (careful) target = Math.min(target, 30 + toStop * 1.6);
    }
    // slow for the bends
    const ahead = f.route.at(f.dist + f.len * 0.8);
    const turn = Math.abs(((ahead.angle - f.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (careful && turn > 0.25) target = Math.min(target, 150 - turn * 40);
    if (careful) {
      let ob = this.obstacleAhead(f);
      const light = ob ? null : this.redAhead(f);
      if (light) target = Math.min(target, Math.max(0, (light - 6) * 2.2));
      if (ob) { f.holdUntil = g.realTime + 0.6; f.holdFor = ob; } else if ((f.holdUntil || 0) > g.realTime) ob = f.holdFor; // don't creep and lurch
      if (ob) {
        target = 0;
        f.waitT = (f.waitT || 0) + dt;
        if (ob === 'player') this.honk(f);
        if (ob !== 'player' && f.waitT > 8) f.ghostUntil = g.realTime + 2; // never jam forever
      } else f.waitT = 0;
      f.speed += clamp(target - f.speed, -700 * dt, 260 * dt);
    } else f.speed = target;
    let move = Math.max(0, f.speed) * dt;
    if (f.kind === 'bus' && stop && move >= toStop) {
      // arrive: stop exactly at the sign and wait
      move = toStop;
      f.dist = f.route.wrap(f.dist + move);
      f.speed = 0;
      f.state.dwellUntil = g.clock.total + B.dwell;
      f.state.lastStop = `${stop.id}@${Math.round(stop.dist)}`;
      f.state.dist = f.dist;
      this.place(f);
      if (g.player.riding === f.idx) g.bus.emit('transit:stop', { stop: stop.id, name: stop.name });
      return;
    }
    // through traffic leaves at the end of its road; another car comes in later
    if (!f.route.closed && f.dist + move >= f.route.length) {
      this.followers = this.followers.filter((x) => x !== f);
      const loop = this.loops[f.loop];
      this.respawn.push({ f, at: g.clock.total + (loop?.gap ?? 40) });
      return;
    }
    f.dist = f.route.wrap(f.dist + move);
    if (f.kind === 'bus') f.state.dist = f.dist;
    this.place(f);
  }

  /** Distance (px) from the vehicle's nose to a red (or late amber) light ahead, or null. */
  redAhead(f) {
    const lights = f.route.lights || [];
    if (!lights.length) return null;
    const nose = f.dist + f.len / 2;
    const look = f.len / 2 + 40 + Math.max(0, f.speed) ** 2 / 1000;
    const t = this.game.realTime;
    for (const L of lights) {
      const gap = f.route.ahead(nose, L.dist);
      if (gap > look) continue;
      const s = lightState(L.j, t)[L.axis];
      if (s === 'green') return null;
      if (s === 'amber' && gap < 26) return null; // too late to stop: go
      return gap;
    }
    return null;
  }

  /** At most one honk every few seconds, only when you're actually in the way, nearby. */
  honk(f) {
    const g = this.game;
    if (f.waitT < 3 || (f.honkAt || 0) > g.realTime || g.realTime - this.honkAt < HONK_GAP) return;
    f.honkAt = g.realTime + 15;
    this.honkAt = g.realTime;
    g.bus.emit('sfx', { id: 'sfx_horn', opts: { quiet: true } });
    g.bus.emit('transit:honk', { id: f.id });
  }

  /** What's in front of a follower: 'player', 'npc', 'car' or null. */
  obstacleAhead(f) {
    const g = this.game;
    if (!f.map || (f.ghostUntil || 0) > g.realTime) return null;
    const cs = Math.cos(f.angle);
    const sn = Math.sin(f.angle);
    const reach = f.len / 2 + 44 + Math.max(0, f.speed) ** 2 / 1100; // a steady gap plus braking distance
    const test = (wx, wy, r) => {
      const rx = wx - f.wx;
      const ry = wy - f.wy;
      const along = rx * cs + ry * sn;
      const lat = Math.abs(-rx * sn + ry * cs);
      return along > 0 && along < reach + r && lat < 14 + r;
    };
    const p = g.player;
    if (!this.riding()) {
      const pw = mapToWorld(g, p.map, p.x, p.y);
      if (pw && test(pw.x * TILE, pw.y * TILE, p.driving ? 18 : 8)) return 'player';
    }
    for (const n of g.npcs.values()) {
      if (n.map !== f.map || n.dead || isDown(n, g.clock.total)) continue;
      const w = mapToWorld(g, n.map, n.x, n.y);
      if (w && test(w.x * TILE, w.y * TILE, 8)) return 'npc';
    }
    for (const o of this.followers) {
      if (o === f || !o.map) continue;
      if (Math.abs(o.wx - f.wx) > 400 || Math.abs(o.wy - f.wy) > 400) continue;
      if (!test(o.wx, o.wy, 6)) continue;
      // two that block each other: the older one goes first
      if (o.blockedBy === f.id && o.id < f.id) continue;
      f.blockedBy = o.id;
      return 'car';
    }
    for (const c of g.vehicles.carsOn(f.map)) {
      if (c.id === p.driving) continue; // the player's car counts as the player (above)
      const w = mapToWorld(g, c.map, c.x, c.y);
      if (w && test(w.x * TILE, w.y * TILE, 12)) return 'car';
    }
    f.blockedBy = null;
    return null;
  }

  /** Oriented boxes of moving vehicles on a map, in its pixels (for the player's car to collide with). */
  boxesOn(mapId) {
    return this.on(mapId).map((f) => ({ x: f.x, y: f.y, angle: f.angle, len: f.len, wid: f.wid, id: f.id }));
  }

  // ------------------------------------------------------------- the bus
  /** Buses waiting at a stop within reach of the player (on foot). */
  boardable() {
    const g = this.game;
    const p = g.player;
    if (p.driving || this.riding()) return null;
    return this.on(p.map).find((f) => this.dwelling(f) && dist(f.x, f.y, p.x, p.y) < f.len / 2 + 90) || null;
  }

  board(idx) {
    const g = this.game;
    const f = this.bus(idx);
    const fare = this.cfg.bus.fare;
    if (!f || !this.dwelling(f)) return { ok: false, text: 'The bus has gone.' };
    if (g.player.money < fare) return { ok: false, text: `The driver taps the sign: FARE ${fare} OBOLS. You can't afford it.` };
    g.player.money -= fare;
    g.bus.emit('money:changed', { delta: -fare, total: g.player.money });
    if (g.combat.equipped().id) g.combat.equip(null);
    g.player.riding = idx;
    g.player.vx = 0;
    g.player.vy = 0;
    this.carryRider();
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.bus.emit('transit:boarded', { bus: f.id });
    return { ok: true, text: `You pay ${fare} obols and find a seat on the ${this.cfg.bus.name}, ${this.heading(f)}. Next stop: ${this.stopFor(f, true).name}. (E to get off when it stops.)` };
  }

  /** Keep the rider on the bus, changing map as it does. */
  carryRider() {
    const g = this.game;
    const f = this.bus(g.player.riding);
    if (!f) { g.player.riding = null; return; }
    if (!f.map) return; // between regions: the road outside the maps
    const p = g.player;
    if (p.map !== f.map) {
      const seamless = Boolean(g.mapOffset(p.map, f.map));
      g.changeMap(f.map, null, { x: f.x, y: f.y, seamless });
    }
    p.x = f.x;
    p.y = f.y;
    const c = Math.cos(f.angle);
    const s = Math.sin(f.angle);
    p.facing = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
  }

  /** Get off at the stop the bus is waiting at: you step out beside the sign. */
  alight() {
    const g = this.game;
    const f = this.bus(g.player.riding);
    if (!f || !this.dwelling(f)) return { ok: false, text: 'Wait for the next stop.' };
    const stop = this.stopFor(f);
    const map = g.maps.get(stop.sign.map);
    let spot = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [2, 0]]) {
      const x = (stop.sign.x + dx + 0.5) * TILE;
      const y = (stop.sign.y + dy + 0.5) * TILE;
      if (!map.rectBlocked(x - 8, y - 6, 16, 8, g.playerActor())) { spot = { x, y }; break; }
    }
    g.player.riding = null;
    if (g.player.map !== map.id) g.changeMap(map.id, null, spot);
    else if (spot) { g.player.x = spot.x; g.player.y = spot.y; }
    g.player.lastTx = Math.floor(g.player.x / TILE);
    g.player.lastTy = Math.floor(g.player.y / TILE);
    g.updateDiscovery();
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.bus.emit('transit:alighted', { stop: stop.id });
    return { ok: true, text: `${stop.name}.` };
  }

  /** Minutes until a bus next stops at this stop (either direction), and which bus. */
  eta(stopId) {
    this.setup();
    const B = this.cfg.bus;
    let best = null;
    for (const f of this.followers.filter((x) => x.kind === 'bus')) {
      let t = Math.max(0, f.state.dwellUntil - this.game.clock.total);
      let d = f.dist;
      for (let k = 0; k < this.stops.length + 1; k++) {
        const next = this.stops.find((s) => s.dist > d + 0.5) || this.stops[0];
        const gap = f.route.wrap(next.dist - d) || f.route.length;
        t += gap / B.speed;
        if (next.id === stopId) {
          if (!best || t < best.minutes) best = { minutes: Math.ceil(t), bus: f.idx, dist: next.dist, heading: next.dist < this.turn ? 'towards the Ober Fields' : 'towards Mill Road Yards' };
          break;
        }
        t += B.dwell;
        d = next.dist;
      }
    }
    return best;
  }

  /** E on a bus-stop sign. */
  stopInfo(stopId) {
    const s = this.cfg.bus.stops.find((x) => x.id === stopId);
    const e = this.eta(stopId);
    const at = this.on(this.game.player.map).find((f) => this.dwelling(f) && this.stopFor(f).id === stopId);
    return {
      type: 'choices', title: `🚏 ${s.name}`,
      text: `${this.cfg.bus.name} bus — Mill Road Yards · Mill Road (the Sumps) · Civic Plaza · The East End · Westbrook Row · Gullwing Road · Ober's Oil Refinery. Fare ${this.cfg.bus.fare} obols. ${at ? 'A bus is waiting here now.' : e ? `Next bus: about ${e.minutes} min (${e.heading}).` : ''}`,
      options: at ? [{ label: 'OK', call: ['transit', 'noop'] }] : [
        { label: `Wait for the bus (about ${e?.minutes ?? '?'} min)`, call: ['transit', 'waitFor', stopId] },
        { label: 'Leave it', call: ['transit', 'noop'] },
      ],
    };
  }

  noop() {
    return { ok: true, text: '' };
  }

  /** Sit at the stop until a bus arrives (time passes). */
  waitFor(stopId) {
    const g = this.game;
    const e = this.eta(stopId);
    if (!e) return { ok: false, text: 'No buses today.' };
    g.skipTime(Math.max(0, e.minutes - 1));
    // make sure it's here and waiting, whatever happened on the way
    const f = this.bus(e.bus);
    f.dist = e.dist;
    f.state.dist = e.dist;
    f.speed = 0;
    f.state.dwellUntil = g.clock.total + this.cfg.bus.dwell;
    const stop = this.stops.find((s) => Math.abs(s.dist - e.dist) < 1);
    f.state.lastStop = `${stop.id}@${Math.round(stop.dist)}`;
    this.place(f);
    return { ok: true, text: `After about ${e.minutes} minutes the ${this.cfg.bus.name} pulls in, ${e.heading}.` };
  }

  // ------------------------------------------------------------ traffic
  /** A stopped (or crawling) traffic car beside you. */
  carjackable() {
    const g = this.game;
    const p = g.player;
    if (p.driving || this.riding()) return null;
    return this.on(p.map).find((f) => f.kind === 'traffic' && f.speed < 40 && dist(f.x, f.y, p.x, p.y) < f.len / 2 + 28) || null;
  }

  carjack(id) {
    const g = this.game;
    const f = this.followers.find((x) => x.id === id);
    if (!f || f.kind !== 'traffic' || !f.map) return { ok: false, text: '' };
    this.followers = this.followers.filter((x) => x !== f);
    this.respawn.push({ f, at: g.clock.total + 120 });
    const V = g.vehicles;
    const cid = `car_jack${V.state.nextId++}`;
    V.state.cars[cid] = { id: cid, model: f.model, color: f.color, map: f.map, x: f.x, y: f.y, angle: f.angle, owner: 'player', stolen: true, from: 'traffic', plate: 'JACKED' };
    g.reportCrime({ fact: 'fact_player_car_theft', map: f.map, x: f.x, y: f.y });
    g.bus.emit('vehicle:stolen', { car: cid, from: 'traffic' });
    g.notify(`You yank the door open. The driver scrambles out and runs. ${g.rng.pick(['"MY CAR!"', '"Take it! TAKE IT!"', '"I\'m calling my mum!"'])}`, 'warn');
    V.enter(cid);
    return { ok: true };
  }
}
