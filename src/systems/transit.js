// Transit (v0.17.0 "Route 1"): the No. 1 bus and the traffic.
//
// Everything here drives along fixed lanes in WORLD space (src/world/layout.js),
// so a bus can run from the Yards through Halvermouth and along the coast road
// to the Ober Fields, crossing maps and region gates without caring which map
// it's on. Near you (same region), vehicles move every frame and stop for
// whatever is in front of them — you, people, other vehicles, parked cars;
// elsewhere (or while time skips) they move once a game minute and never stop.
//
// The bus: three buses on one loop, 2 obols a ride, a stop in every district.
// Board one that's waiting at a stop (E), ride it for real while it drives,
// and get off (E) at any stop. Bus-stop signs show the next buses and let you
// wait for one. Traffic: cars circling Halvermouth's blocks and running the
// coast road; carjack one that's stopped (a crime).
//
// State: game.world.transit = { buses: [{ dist, dwellUntil }] } — traffic is
// regenerated each session. Runtime: this.followers (buses + traffic).
import { TILE, clamp, dist } from '../core/util.js';
import { worldLayout, worldToMap, mapToWorld } from '../world/layout.js';
import { isDown } from './combat.js';

/** A closed polyline in world pixels with arc-length lookup. */
class Route {
  constructor(points) {
    this.pts = points.map(([x, y]) => ({ x: x * TILE, y: y * TILE }));
    this.cum = [0];
    for (let i = 0; i < this.pts.length; i++) {
      const a = this.pts[i];
      const b = this.pts[(i + 1) % this.pts.length];
      this.cum.push(this.cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cum[this.pts.length];
  }

  wrap(d) {
    return ((d % this.length) + this.length) % this.length;
  }

  at(d) {
    d = this.wrap(d);
    let i = 0;
    while (i < this.pts.length - 1 && this.cum[i + 1] <= d) i++;
    const a = this.pts[i];
    const b = this.pts[(i + 1) % this.pts.length];
    const seg = this.cum[i + 1] - this.cum[i] || 1;
    const t = (d - this.cum[i]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x), seg: i };
  }

  /** Distances along the route where a horizontal segment on `road` (a tile row; lanes road+0.5 and road+1.5) passes world tile x. */
  crossings(x, road) {
    const out = [];
    const px = x * TILE;
    for (let i = 0; i < this.pts.length; i++) {
      const a = this.pts[i];
      const b = this.pts[(i + 1) % this.pts.length];
      if (Math.abs(a.y - b.y) > 1) continue;
      const row = a.y / TILE;
      if (row < road || row > road + 2) continue;
      if (px < Math.min(a.x, b.x) || px > Math.max(a.x, b.x)) continue;
      out.push(this.cum[i] + Math.abs(px - a.x));
    }
    return out;
  }
}

export function freshTransit(content) {
  const B = content.transit.bus;
  const r = new Route(B.route);
  return { buses: Array.from({ length: B.buses }, (_, i) => ({ dist: (r.length * i) / B.buses, dwellUntil: 0 })) };
}

export class Transit {
  constructor(game) {
    this.game = game;
    this.followers = [];
    this.ready = false;
    this.nextId = 1;
  }

  get cfg() {
    return this.game.content.transit;
  }

  get state() {
    const g = this.game;
    if (!g.world.transit) g.world.transit = freshTransit(g.content);
    return g.world.transit;
  }

  /** Build routes, stops, buses and traffic (lazily: the maps must exist). */
  setup() {
    if (this.ready) return;
    const g = this.game;
    const B = this.cfg.bus;
    this.busRoute = new Route(B.route);
    // each stop, at its distance along the loop in each direction
    this.stops = [];
    for (const s of B.stops) for (const d of this.busRoute.crossings(s.x, s.road)) this.stops.push({ ...s, dist: d });
    this.stops.sort((a, b) => a.dist - b.dist);
    this.turn = this.busRoute.cum[B.route.findIndex(([x]) => x >= 270)]; // the far end of the line
    this.followers = this.state.buses.map((b, i) => ({ id: `bus${i + 1}`, kind: 'bus', idx: i, route: this.busRoute, dist: b.dist, speed: 0, max: B.speed, len: B.len, wid: B.wid, color: B.color, state: b }));
    // traffic, spread round each loop
    const T = this.cfg.traffic;
    let n = 0;
    for (const loop of T.loops) {
      const route = new Route(loop.path);
      for (let i = 0; i < loop.cars; i++) {
        const model = T.models[(n * 3 + i) % T.models.length];
        const m = g.content.vehicles.models[model];
        const max = loop.speed[0] + ((n * 37 + i * 53) % 100) / 100 * (loop.speed[1] - loop.speed[0]);
        this.followers.push({ id: `tr${this.nextId++}`, kind: 'traffic', loop: loop.id, route, dist: (route.length * (i + 0.3 * ((n % 3) / 3))) / loop.cars, speed: max, max, len: m.len, wid: m.wid, model, color: T.colors[(n * 5 + i * 2) % T.colors.length] });
        n++;
      }
    }
    this.ready = true;
    for (const f of this.followers) this.place(f);
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

  // ------------------------------------------------------------- driving
  /** Per frame: everything near you moves carefully; the bus you're on carries you. */
  update(dt) {
    this.setup();
    for (const f of this.followers) {
      if (!this.near(f) && !(f.kind === 'bus' && this.game.player.riding === f.idx)) continue;
      this.step(f, dt, true);
    }
    if (this.game.player.riding !== null && this.game.player.riding !== undefined) this.carryRider();
  }

  /** Per game minute: everything else moves, without looking. */
  minuteTick() {
    this.setup();
    const g = this.game;
    for (const f of this.followers) {
      if (this.near(f) && !g.skipping) continue;
      if (f.kind === 'bus' && g.player.riding === f.idx && !g.skipping) continue;
      this.step(f, 1, false);
    }
    if (g.skipping && g.player.riding !== null && g.player.riding !== undefined) this.carryRider();
    // carjacked cars come back to the roads after a while
    if (this.respawn?.length) {
      const due = this.respawn.filter((r) => r.at <= g.clock.total);
      this.respawn = this.respawn.filter((r) => r.at > g.clock.total);
      for (const r of due) { r.f.dist = r.f.route.wrap(r.f.dist + r.f.route.length / 2); r.f.speed = 0; this.followers.push(r.f); this.place(r.f); }
    }
  }

  step(f, dt, careful) {
    const g = this.game;
    const B = this.cfg.bus;
    if (f.kind === 'bus') {
      if (g.clock.total < f.state.dwellUntil) { f.speed = 0; return; }
    }
    let target = f.max;
    // ease into the next stop
    let toStop = Infinity;
    let stop = null;
    if (f.kind === 'bus') {
      stop = this.stops.find((s) => s.dist > f.dist + 0.5 && f.state.lastStop !== `${s.id}@${Math.round(s.dist)}`) || this.stops.find((s) => f.state.lastStop !== `${s.id}@${Math.round(s.dist)}`);
      if (stop) toStop = f.route.wrap(stop.dist - f.dist);
      if (careful) target = Math.min(target, 30 + toStop * 1.6);
    }
    // slow for corners
    const ahead = f.route.at(f.dist + f.len);
    const turn = Math.abs(((ahead.angle - f.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (turn > 0.3) target = Math.min(target, careful ? 110 : target);
    if (careful) {
      let ob = this.obstacleAhead(f);
      if (ob) { f.holdUntil = g.realTime + 0.6; f.holdFor = ob; } else if ((f.holdUntil || 0) > g.realTime) ob = f.holdFor; // don't creep and lurch
      if (ob) {
        target = 0;
        f.waitT = (f.waitT || 0) + dt;
        if (ob === 'player' && f.waitT > 1.5 && (f.honkAt || 0) < g.realTime) {
          f.honkAt = g.realTime + 4;
          g.bus.emit('sfx', { id: 'sfx_horn' });
          g.bus.emit('transit:honk', { id: f.id });
        }
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
    f.dist = f.route.wrap(f.dist + move);
    if (f.kind === 'bus') f.state.dist = f.dist;
    this.place(f);
  }

  /** What's in front of a follower: 'player', 'npc', 'car' or null. */
  obstacleAhead(f) {
    const g = this.game;
    if (!f.map || (f.ghostUntil || 0) > g.realTime) return null;
    const cs = Math.cos(f.angle);
    const sn = Math.sin(f.angle);
    const reach = f.len / 2 + 44 + (Math.max(0, f.speed) ** 2) / 1100; // a steady gap plus braking distance
    const test = (wx, wy, r) => {
      const rx = wx - f.wx;
      const ry = wy - f.wy;
      const along = rx * cs + ry * sn;
      const lat = Math.abs(-rx * sn + ry * cs);
      return along > 0 && along < reach + r && lat < 12 + r;
    };
    const p = g.player;
    const riding = p.riding !== null && p.riding !== undefined;
    if (!riding) {
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
    if (p.driving || (p.riding !== null && p.riding !== undefined)) return null;
    return this.on(p.map).find((f) => this.dwelling(f) && dist(f.x, f.y, p.x, p.y) < f.len / 2 + 70) || null;
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
    if (p.driving || (p.riding !== null && p.riding !== undefined)) return null;
    return this.on(p.map).find((f) => f.kind === 'traffic' && f.speed < 40 && dist(f.x, f.y, p.x, p.y) < f.len / 2 + 28) || null;
  }

  carjack(id) {
    const g = this.game;
    const f = this.followers.find((x) => x.id === id);
    if (!f || f.kind !== 'traffic' || !f.map) return { ok: false, text: '' };
    this.followers = this.followers.filter((x) => x !== f);
    (this.respawn ||= []).push({ f, at: g.clock.total + 120 });
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
