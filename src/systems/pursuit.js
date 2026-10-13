// Police chases (v0.18.0 "Hot Pursuit"). While you're Wanted and the police
// know where you are, cruisers come after you: one per star. They are real
// cars (owner 'police', chase: true) driven by the same physics as yours,
// steering along an A* route over the tiles toward you.
//
//   spawn   — off-screen on a road, 16–28 tiles away, while you were seen in the last minute
//   chase   — drive at you; ★★★ rams; anyone who sees you keeps the Wanted level fresh
//   caught  — in a car: stopped (or boxed in) beside a cruiser for 2 s → pulled over
//             on foot: a cruiser stops beside you, an officer gets out → cuffed
//             on the bus: they wait for it to stop
//   escape  — out of every cruiser's sight for 12 s: they drive to where they last
//             saw you, search, and give up; no new cruisers until you're spotted again
//   over    — Wanted gone, or you're arrested: they leave (despawn out of view)
//
// Cruisers never hurt pedestrians (they brake), never take region gates, and
// aren't stealable while chasing. Runtime only: chase cars are removed on load.
import { TILE, clamp, dist } from '../core/util.js';
import { isDown } from './combat.js';

const LOSE_SECONDS = 12;
const SEARCH_SECONDS = 20;
const SPAWN_COOLDOWN = 4;
const RECENT_SIGHTING = 60; // game minutes: the police only send cars when they know where you are
const PULL_OVER_SECONDS = 2;
const CUFF_SECONDS = 1.6;
const SIGHT_TILES = 12;
/** Path costs per tile: cruisers keep to the roads. */
const COST = { '=': 1, b: 1, ',': 2.5, ':': 2.5, g: 3, m: 4, p: 3, u: 4, s: 5 };
const STOP = ['Pull over!', 'Halvermouth Police — stop the vehicle!', 'Stop the car! Now!', 'You\'re not getting away!'];

/** A* over tiles a car can fit through; roads are cheaper. Returns [{x, y}] tile centres in px. */
function carPath(map, sx, sy, gx, gy, actor, maxNodes = 5000) {
  const W = map.width;
  const H = map.height;
  const open = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H || map.blockedTile(x, y, actor)) return false;
    // clearance: a car is wider than a tile, so it can't squeeze between two obstacles
    const l = map.blockedTile(x - 1, y, actor);
    const r = map.blockedTile(x + 1, y, actor);
    const u = map.blockedTile(x, y - 1, actor);
    const d = map.blockedTile(x, y + 1, actor);
    return !((l && r) || (u && d));
  };
  if (!open(gx, gy)) {
    // aim for the nearest open tile instead
    let best = null;
    for (let r = 1; r < 5 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!best && open(gx + dx, gy + dy)) best = [gx + dx, gy + dy];
    if (!best) return null;
    [gx, gy] = best;
  }
  const key = (x, y) => y * W + x;
  const g = new Map([[key(sx, sy), 0]]);
  const prev = new Map();
  const heap = [[Math.hypot(gx - sx, gy - sy), sx, sy]];
  let n = 0;
  while (heap.length && n++ < maxNodes) {
    // a small binary-ish pop: the open list stays short on these maps
    let bi = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
    const [, x, y] = heap[bi];
    heap[bi] = heap[heap.length - 1];
    heap.pop();
    if (x === gx && y === gy) {
      const out = [];
      let k = key(x, y);
      while (k !== undefined) { out.push({ x: ((k % W) + 0.5) * TILE, y: (Math.floor(k / W) + 0.5) * TILE }); k = prev.get(k); }
      return out.reverse();
    }
    const base = g.get(key(x, y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!open(nx, ny)) continue;
      if (dx && dy && (!open(x + dx, y) || !open(x, y + dy))) continue; // no corner cutting
      const cost = base + (dx && dy ? 1.42 : 1) * (COST[map.tileAt(nx, ny)] ?? 6);
      const k = key(nx, ny);
      if (cost >= (g.get(k) ?? Infinity)) continue;
      g.set(k, cost);
      prev.set(k, key(x, y));
      heap.push([cost + Math.hypot(gx - nx, gy - ny), nx, ny]);
    }
  }
  return null;
}

export class Pursuit {
  constructor(game) {
    this.game = game;
    this.lostAt = null;
    this.spawnCd = 0;
    this.nextId = 1;
    this.arrestT = 0;
    game.bus.on('police:jailed', () => this.endAll(true));
    game.bus.on('police:wanted', ({ level }) => { if (level <= 0) this.endAll(false); });
  }

  get V() {
    return this.game.vehicles;
  }

  /** Cruisers chasing you (or searching, or leaving). */
  cars() {
    return Object.values(this.V.state.cars).filter((c) => c.chase);
  }

  active() {
    return this.cars().filter((c) => c.chase.mode === 'chase' || c.chase.mode === 'search');
  }

  /** Where the player is, in a map's pixel space (null if they're not in that map's region). */
  playerIn(mapId) {
    const g = this.game;
    const p = g.player;
    if (p.map === mapId) return { x: p.x, y: p.y };
    const off = g.mapOffset(mapId, p.map);
    return off ? { x: p.x + off.x, y: p.y + off.y } : null;
  }

  wanted() {
    const pol = this.game.police;
    return pol && !pol.jailed() ? pol.state.wanted : 0;
  }

  // -------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game;
    const lvl = this.wanted();
    const outdoor = g.currentMap().kind !== 'interior';
    if (lvl > 0 && outdoor && !g.combat.wrath) this.maybeSpawn(dt, lvl);
    let seen = false;
    for (const car of this.cars()) {
      if (this.drive(car, dt, lvl)) seen = true;
    }
    if (lvl > 0) {
      const active = this.active();
      if (seen) {
        this.lostAt = null;
        this.lostAnnounced = false;
        g.police.state.lastSeen = g.clock.total;
      } else if (active.length && this.lostAt === null) this.lostAt = g.realTime;
      if (active.length && this.lostAt !== null && g.realTime - this.lostAt > LOSE_SECONDS && !this.lostAnnounced) {
        this.lostAnnounced = true;
        for (const c of active) if (c.chase.mode === 'chase') { c.chase.mode = 'search'; c.chase.until = g.realTime + SEARCH_SECONDS; c.chase.path = null; }
        this.lostMark = g.police.state.lastSeen; // no more cruisers until someone sees you again
        g.notify('The cruisers have lost sight of you. Keep your head down.', 'good');
        g.bus.emit('pursuit:lost', {});
      }
      this.checkArrest(dt);
    }
  }

  maybeSpawn(dt, lvl) {
    const g = this.game;
    this.spawnCd -= dt;
    if (this.spawnCd > 0) return;
    // only while the police know where you are
    if (g.clock.total - g.police.state.lastSeen > RECENT_SIGHTING) return;
    if (this.lostMark !== null && this.lostMark !== undefined && g.police.state.lastSeen <= this.lostMark) return;
    const here = this.cars().filter((c) => c.chase.mode !== 'leave' && this.playerIn(c.map));
    if (here.length >= lvl) return;
    this.spawnCd = SPAWN_COOLDOWN;
    const map = g.currentMap();
    const p = g.player;
    const actor = this.V.actor();
    const model = this.V.cfg.models.cruiser;
    // a road tile out of view, 16–28 tiles away
    const tries = [];
    for (let i = 0; i < 80; i++) {
      const a = g.rng.next() * Math.PI * 2;
      const r = (16 + g.rng.next() * 12) * TILE;
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (!map.inBounds(tx, ty) || map.tileAt(tx, ty) !== '=') continue;
      const cx = (tx + 0.5) * TILE;
      const cy = (ty + 0.5) * TILE;
      const angle = Math.atan2(p.y - cy, p.x - cx);
      if (this.V.blocked(map, cx, cy, angle, model.len, model.wid)) continue;
      tries.push({ x: cx, y: cy, angle });
      break;
    }
    const s = tries[0];
    if (!s) return;
    const id = `chase_${this.nextId++}`;
    this.V.state.cars[id] = { id, model: 'cruiser', color: model.colors[0], map: map.id, x: s.x, y: s.y, angle: s.angle, owner: 'police', stolen: false, plate: `HPD ${10 + this.nextId}`, chase: { mode: 'chase', path: null, repath: 0, stuck: 0, reverse: 0, lastX: s.x, lastY: s.y, known: { map: map.id, x: p.x, y: p.y } } };
    if (!this.announced) {
      this.announced = true;
      g.notify('🚓 Sirens! A police cruiser is coming for you.', 'warn');
    }
    g.bus.emit('pursuit:spawned', { car: id });
  }

  /** Drive one cruiser. Returns true if it can see you. */
  drive(car, dt, lvl) {
    const g = this.game;
    const V = this.V;
    const c = car.chase;
    const map = g.maps.get(car.map);
    const me = this.playerIn(car.map);
    const p = g.player;
    const riding = p.riding !== null && p.riding !== undefined;
    let sees = false;
    if (me && c.mode !== 'leave' && g.currentMap().kind !== 'interior') {
      const d = dist(car.x, car.y, me.x, me.y);
      sees = d < SIGHT_TILES * TILE && map.lineOfSight(Math.floor(car.x / TILE), Math.floor(car.y / TILE), Math.floor(me.x / TILE), Math.floor(me.y / TILE));
      if (sees) {
        c.known = { map: car.map, x: me.x, y: me.y };
        if (c.mode === 'search') c.mode = 'chase';
        if ((c.shoutAt || 0) < g.realTime && d < 9 * TILE) { c.shoutAt = g.realTime + 7; this.shout(car, g.rng.pick(STOP)); }
      }
    }
    // you've left its region (it can't follow through the gates): it searches, then gives up
    if (!me && c.mode === 'chase') { c.mode = 'search'; c.until = g.realTime + SEARCH_SECONDS; }
    // where to go
    let target = null;
    if (c.mode === 'chase') target = me || (c.known?.map === car.map ? c.known : null);
    else if (c.mode === 'search') {
      target = c.known?.map === car.map ? c.known : null;
      if (g.realTime > c.until) { c.mode = 'leave'; c.until = g.realTime + 15; }
    } else if (c.mode === 'leave') {
      // drive off; vanish once out of view (or after a while)
      const off = !me || dist(car.x, car.y, me.x, me.y) > 22 * TILE;
      if (off || g.realTime > c.until) { delete V.state.cars[car.id]; return false; }
      target = me ? { x: car.x + (car.x - me.x), y: car.y + (car.y - me.y) } : null;
    }
    const input = { x: 0, y: 0, sprint: false };
    if (target) {
      const td = dist(car.x, car.y, target.x, target.y);
      // route: straight at you when close, along an A* path otherwise
      let aim = target;
      const close = td < 8 * TILE && sees;
      if (!close) {
        c.repath -= dt;
        if (c.repath <= 0 || !c.path) {
          c.repath = 0.6;
          c.path = carPath(map, Math.floor(car.x / TILE), Math.floor(car.y / TILE), clamp(Math.floor(target.x / TILE), 0, map.width - 1), clamp(Math.floor(target.y / TILE), 0, map.height - 1), V.actor());
        }
        if (c.path) {
          while (c.path.length > 1 && dist(c.path[0].x, c.path[0].y, car.x, car.y) < 52) c.path.shift();
          // look a little further ahead for smoother lines
          aim = c.path[Math.min(1, c.path.length - 1)] || target;
        }
      } else if (lvl >= 3 && p.driving) {
        // ★★★: ram — aim where your car is going
        const pc = V.driving();
        aim = { x: target.x + Math.cos(pc.angle) * pc.speed * 0.35, y: target.y + Math.sin(pc.angle) * pc.speed * 0.35 };
      }
      const want = Math.atan2(aim.y - car.y, aim.x - car.x);
      let diff = ((want - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (c.reverse > 0) {
        c.reverse -= dt;
        input.y = 1; // back up
        input.x = diff > 0 ? -1 : 1;
      } else {
        input.x = clamp(diff * 2.2, -1, 1);
        // speed: slow into corners; ease up beside you unless ramming
        let throttle = Math.abs(diff) > 1.1 ? 0.35 : Math.abs(diff) > 0.6 ? 0.7 : 1;
        if (close && !(lvl >= 3 && p.driving)) throttle = td < 70 ? -0.6 : td < 120 ? 0.25 : 0.8;
        if (c.mode === 'search' && td < 2 * TILE) throttle = -0.4;
        if (lvl <= 1 && car.speed > 320) throttle = 0; // ★: no reckless driving
        input.y = -throttle;
        if (Math.abs(diff) > 1.2 && car.speed > 180) input.sprint = true;
      }
      // brake for pedestrians: the police don't run people over
      if (this.personAhead(car)) { input.y = Math.max(input.y, 0.8); input.sprint = car.speed > 60; }
      // stuck against something (trying to go, but not getting anywhere): back up and try again
      const moved = dist(car.x, car.y, c.lastX, c.lastY);
      c.lastX = car.x;
      c.lastY = car.y;
      const wantsToGo = input.y < -0.2 && !(close && td < 130);
      if (wantsToGo && c.reverse <= 0 && moved < 40 * dt) {
        c.stuck += dt;
        if (c.stuck > 1.1) { c.stuck = 0; c.reverse = 0.9; c.path = null; }
      } else c.stuck = Math.max(0, c.stuck - dt);
    } else input.y = car.speed > 0 ? 1 : 0; // nowhere to go: stop
    const before = car.speed;
    const hit = V.physics(car, input, dt);
    if (hit && p.driving && before > 120) {
      // contact with your car: a ram
      const pc = V.driving();
      if (pc && pc.map === car.map && dist(pc.x, pc.y, car.x, car.y) < (V.model(pc).len + V.model(car).len) / 2 + 12) {
        pc.speed *= 0.45;
        pc.angle += (g.rng.next() - 0.5) * 0.5;
        pc.rammed = true;
        V.crash(pc);
        pc.rammed = false;
        g.bus.emit('pursuit:rammed', { car: car.id });
      }
    }
    V.crossings(car, false);
    return sees;
  }

  personAhead(car) {
    const g = this.game;
    const m = this.V.model(car);
    const cs = Math.cos(car.angle) * Math.sign(car.speed || 1);
    const sn = Math.sin(car.angle) * Math.sign(car.speed || 1);
    for (const n of g.npcs.values()) {
      if (n.map !== car.map || n.dead || isDown(n, g.clock.total)) continue;
      const rx = n.x - car.x;
      const ry = n.y - car.y;
      const along = rx * cs + ry * sn;
      const lat = Math.abs(-rx * sn + ry * cs);
      if (along > 0 && along < m.len / 2 + 30 + Math.abs(car.speed) * 0.3 && lat < m.wid / 2 + 10) return true;
    }
    return false;
  }

  shout(car, text) {
    const g = this.game;
    g.bus.emit('pursuit:shout', { car: car.id, text });
    if (car.map === g.player.map) g.notify(`🚓 "${text}"`, 'warn');
  }

  /** Caught: pulled over in a car, cuffed on foot, or met at the bus stop. */
  checkArrest(dt) {
    const g = this.game;
    const p = g.player;
    const riding = p.riding !== null && p.riding !== undefined;
    const pc = this.V.driving();
    const near = this.cars().filter((c) => c.chase.mode === 'chase' && c.map === p.map && Math.abs(c.speed) < 90 && dist(c.x, c.y, p.x, p.y) < (pc ? this.V.model(pc).len / 2 + 70 : 150)); // on foot: an officer gets out and walks over
    let caught = false;
    if (near.length) {
      if (pc) caught = (pc.moved ?? Math.abs(pc.speed)) < 40; // stopped — or pinned against something
      else if (riding) caught = g.transit.dwelling(g.transit.bus(p.riding));
      else caught = Math.hypot(p.vx || 0, p.vy || 0) < 150 || near.length > 1;
    }
    if (!caught) { this.arrestT = Math.max(0, this.arrestT - dt * 2); return; }
    this.arrestT += dt;
    const need = pc ? PULL_OVER_SECONDS : CUFF_SECONDS;
    if (this.arrestT < need) return;
    this.arrestT = 0;
    const officer = g.police.activeOfficers().find((o) => o.id !== 'npc_hugh') || null;
    g.notify(pc ? '🚓 Boxed in. An officer yanks your door open: "Out of the car. Hands where I can see them."' : riding ? '🚓 Two officers step onto the bus and walk straight to your seat.' : '🚓 The cruiser door flies open and an officer tackles you to the pavement.', 'warn');
    if (riding) p.riding = null;
    g.bus.emit('pursuit:caught', { how: pc ? 'pulled_over' : riding ? 'bus' : 'on_foot' });
    g.police.arrest(officer);
  }

  /** The cuffing / pull-over bar (0–1). */
  progress() {
    return clamp(this.arrestT / (this.V.driving() ? PULL_OVER_SECONDS : CUFF_SECONDS), 0, 1);
  }

  /** The chase is over: cruisers drive away (or vanish, if you're off to jail). */
  endAll(now) {
    this.arrestT = 0;
    this.lostAt = null;
    this.lostMark = null;
    this.announced = false;
    for (const c of this.cars()) {
      if (now) delete this.V.state.cars[c.id];
      else { c.chase.mode = 'leave'; c.chase.until = this.game.realTime + 15; }
    }
  }

  /** On load: chases don't survive a save. */
  clear() {
    for (const c of this.cars()) delete this.V.state.cars[c.id];
  }
}
