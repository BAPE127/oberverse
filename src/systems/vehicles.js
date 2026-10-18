// Cars (v0.16.0 "On the Road"). Buy one at a dealership, get in with E and
// drive it yourself: W/↑ accelerate, S/↓ brake and reverse, A/D steer, Shift
// handbrake, E to get out. Cars stay where you leave them and cross the seams
// and region gates with you. Owner's rules: running people over hurts them and
// is a crime; imported (protected) characters are never harmed; cars can be
// stolen (a crime), and officers who see you in a stolen car come after you.
//
// State: game.world.vehicles = { cars: { id: car }, nextId, restock: {} }
//   car = { id, model, color, map, x, y (px, centre), angle (rad, 0 = east),
//           owner: 'player' | npcId | 'dealer:<id>' | null, stolen, from, plate }
// Runtime only: car.speed, car.braking, car.hitCd.
import { TILE, clamp, dist } from '../core/util.js';
import { isProtected, isDown } from './combat.js';

const CAR_WEAPON = { id: 'car', name: 'car', weapon: { kind: 'melee', knockback: 40, lethal: true } };
const ENTER_RANGE = 48;
const HOTWIRE_SECONDS = 2.5;
const ROAD = new Set(['=', ',', 'm', 'g', 'b', 'D', 'p', 't', 'f', 'c']);
const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTVWXYZ';

export function freshVehicles(content) {
  const v = content.vehicles;
  const cars = {};
  for (const p of v.parked) cars[p.id] = parkedCar(p);
  for (const [did, d] of Object.entries(v.dealers)) {
    d.display.forEach((s, i) => {
      const id = `car_${did}_${i}`;
      cars[id] = { id, model: s.model, color: v.models[s.model].colors[0], map: d.map, x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE, angle: (s.angle * Math.PI) / 180, owner: `dealer:${did}`, stolen: false, plate: 'FOR SALE' };
    });
  }
  return { cars, nextId: 1, restock: {} };
}

function parkedCar(p) {
  return { id: p.id, model: p.model, color: p.color, map: p.map, x: (p.x + 0.5) * TILE, y: (p.y + 0.5) * TILE, angle: (p.angle * Math.PI) / 180, owner: p.owner, stolen: false, plate: p.plate || plateFor(p.id) };
}

function plateFor(seed) {
  let h = 7;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const L = (k) => PLATE_LETTERS[(h >>> k) % PLATE_LETTERS.length];
  return `${L(0)}${L(5)}${(h % 90) + 10} ${L(11)}${L(17)}${L(23)}`;
}

export class Vehicles {
  constructor(game) {
    this.game = game;
    this.hotwire = null;
    game.bus.on('police:jailed', () => this.onJailed());
  }

  get cfg() {
    return this.game.content.vehicles;
  }

  get state() {
    const g = this.game;
    if (!g.world.vehicles) g.world.vehicles = freshVehicles(g.content);
    const s = g.world.vehicles;
    // v0.34.0: older saves gain the signature cars (once each — a stolen one stays stolen)
    if (!s.sigAdded) {
      s.sigAdded = [];
      for (const p of this.cfg.parked) if (this.cfg.models[p.model]?.sig && !s.cars[p.id]) s.cars[p.id] = parkedCar(p);
      for (const p of this.cfg.parked) if (this.cfg.models[p.model]?.sig) s.sigAdded.push(p.id);
    }
    return s;
  }

  model(car) {
    return this.cfg.models[car.model];
  }

  car(id) {
    return this.state.cars[id] || null;
  }

  carsOn(mapId) {
    return Object.values(this.state.cars).filter((c) => c.map === mapId);
  }

  driving() {
    const id = this.game.player.driving;
    return id ? this.car(id) : null;
  }

  ownedCars() {
    return Object.values(this.state.cars).filter((c) => c.owner === 'player');
  }

  /** Actor used for car collisions: building doors block, seams and region gates don't. */
  actor(amphibious = false) {
    return { kind: 'vehicle', amphibious, canPass: (door) => Boolean((door.seamless && !door.portal) || door.gateway) }; // v0.47.0: not through a building's front door
  }

  /** The car's body as three boxes along its length. */
  blocked(map, x, y, angle, len, wid, ignore) {
    return this.inWalls(map, x, y, angle, len, wid, ignore) > 0 || this.carAt(map, x, y, angle, len, wid, ignore);
  }

  /** How many of the body's three boxes are in a wall, a building or a solid prop (0–3). */
  inWalls(map, x, y, angle, len, wid, ignore) {
    const a = this.actor(Boolean(ignore?.model && this.model(ignore)?.amphibious));
    const half = len / 2 - wid / 2;
    const box = Math.max(16, wid - 8);
    let n = 0;
    const W = map.width * TILE;
    const H = map.height * TILE;
    for (const k of [-half, 0, half]) {
      const cx = x + Math.cos(angle) * k;
      const cy = y + Math.sin(angle) * k;
      // v0.46.0: the nose may poke out past a seam before the car's centre reaches it (and
      // the car crosses); off the map there is nothing to hit there — it used to be a wall
      const out = cx - box / 2 < 0 || cy - box / 2 < 0 || cx + box / 2 > W || cy + box / 2 > H;
      if (out) {
        const ex = clamp(Math.floor(cx / TILE), 0, map.width - 1);
        const ey = clamp(Math.floor(cy / TILE), 0, map.height - 1);
        if (map.doorAt(ex, ey)?.seamless && !map.doorAt(ex, ey).portal) {
          const ix = clamp(cx, box / 2, W - box / 2);
          const iy = clamp(cy, box / 2, H - box / 2);
          if (map.rectBlocked(ix - box / 2, iy - box / 2, box, box, a)) n++;
          continue;
        }
      }
      if (map.rectBlocked(cx - box / 2, cy - box / 2, box, box, a)) n++;
    }
    return n;
  }

  /**
   * v0.35.2: a car that has ended up partly in a wall (shoved by a car passing through it,
   * say) is eased out to the nearest clear spot; it used to be let move anywhere "to work
   * itself loose" — straight through buildings, and on across the map.
   */
  unstick(map, car, m) {
    if (!this.inWalls(map, car.x, car.y, car.angle, m.len, m.wid, car)) return true;
    for (let r = 4; r <= 8 * TILE; r += r < 64 ? 4 : 8) {
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8;
        const x = car.x + Math.cos(a) * r;
        const y = car.y + Math.sin(a) * r;
        if (!this.inWalls(map, x, y, car.angle, m.len, m.wid, car) && !this.carAt(map, x, y, car.angle, m.len, m.wid, car)) {
          car.x = x;
          car.y = y;
          car.speed = 0;
          return true;
        }
      }
    }
    return false;
  }

  /** Does a box (centre, angle, size) overlap a car on this map? */
  carAt(map, x, y, angle, len, wid, ignore) {
    // traffic pulls over for a police car on a chase
    if (!ignore?.chase) for (const b of this.game.transit?.boxesOn(map.id) || []) {
      if (dist(b.x, b.y, x, y) < (len + b.len) / 2 + 4 && this.overlapCars({ x, y, angle, len, wid }, b)) return true;
    }
    for (const c of this.carsOn(map.id)) {
      if (c === ignore) continue;
      const m = this.model(c);
      if (dist(c.x, c.y, x, y) < (len + m.len) / 2 + 4 && this.overlapCars({ x, y, angle, len, wid }, { ...c, len: m.len, wid: m.wid })) return true;
    }
    return false;
  }

  /** Oriented-box overlap (separating axis) between two cars. */
  overlapCars(A, B) {
    const corners = (c) => {
      const cs = Math.cos(c.angle);
      const sn = Math.sin(c.angle);
      return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => [c.x + (cs * u * c.len) / 2 - (sn * v * c.wid) / 2, c.y + (sn * u * c.len) / 2 + (cs * v * c.wid) / 2]);
    };
    const pa = corners(A);
    const pb = corners(B);
    for (const c of [A, B]) {
      for (const ax of [[Math.cos(c.angle), Math.sin(c.angle)], [-Math.sin(c.angle), Math.cos(c.angle)]]) {
        const pr = (pts) => pts.map(([x, y]) => x * ax[0] + y * ax[1]);
        const a = pr(pa);
        const b = pr(pb);
        if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------- in and out
  nearest(range = ENTER_RANGE) {
    const p = this.game.player;
    let best = null;
    let bd = Infinity;
    for (const c of this.carsOn(p.map)) {
      if (c.chase) continue; // a police car in pursuit has an officer in it
      const m = this.model(c);
      // distance to the car's body, not its centre
      const cs = Math.cos(c.angle);
      const sn = Math.sin(c.angle);
      const lx = (p.x - c.x) * cs + (p.y - c.y) * sn;
      const ly = -(p.x - c.x) * sn + (p.y - c.y) * cs;
      const d = Math.hypot(Math.max(0, Math.abs(lx) - m.len / 2), Math.max(0, Math.abs(ly) - m.wid / 2));
      if (d < range && d < bd) { bd = d; best = c; }
    }
    return best;
  }

  label(car) {
    const m = this.model(car);
    if (car.owner === 'player') return `Drive your ${m.name}`;
    if (car.owner?.startsWith('dealer:')) return `Look at the ${m.name}`;
    return `Look at the ${m.name}`;
  }

  /** E on a car that isn't yours: what it is, and the option to steal it. */
  inspect(id) {
    const car = this.car(id);
    if (!car) return { type: 'none' };
    if (car.owner === 'player') return this.enter(id);
    const m = this.model(car);
    const lore = m.sig ? ` ${m.lore} Plate: ${car.plate}.` : '';
    const whose = car.owner?.startsWith('dealer:') ? `On sale at ${this.cfg.dealers[car.owner.slice(7)].name} for ${m.price} obols. Talk to the salesman to buy one.`
      : car.owner === 'police' ? 'It belongs to the Halvermouth Police. Stealing it would be very bold and very stupid.'
        : car.owner ? `It belongs to ${this.game.npcs.get(car.owner)?.profile.name || 'someone'}.` : 'Nobody you know. The doors are locked.';
    return {
      type: 'choices', title: m.name,
      text: `${m.blurb}${lore} ${whose}`,
      options: [
        { label: 'Hotwire it (car theft — a crime)', call: ['vehicles', 'startHotwire', id] },
        { label: 'Leave it', call: ['vehicles', 'noop'] },
      ],
    };
  }

  noop() {
    return { ok: true, text: '' };
  }

  enter(id) {
    const g = this.game;
    const car = this.car(id);
    if (!car || car.owner !== 'player') return { type: 'message', text: 'It isn\'t your car.' };
    if (g.combat.equipped().id) g.combat.equip(null);
    g.player.driving = car.id;
    car.speed = 0;
    g.player.x = car.x;
    g.player.y = car.y;
    g.player.vx = 0;
    g.player.vy = 0;
    g.bus.emit('sfx', { id: 'sfx_car_start' });
    g.bus.emit('vehicle:entered', { car: car.id });
    return { type: 'message', text: `${this.model(car).name}${car.stolen ? ' (stolen)' : ''}. W accelerate · S brake/reverse · A/D steer · Shift handbrake · E get out.` };
  }

  /** Get out beside the car: driver's side first, then anywhere free. */
  exit() {
    const g = this.game;
    const car = this.driving();
    if (!car) return { ok: false };
    const map = g.maps.get(car.map);
    const m = this.model(car);
    const actor = g.playerActor();
    const cs = Math.cos(car.angle);
    const sn = Math.sin(car.angle);
    const tries = [[0, -1], [0, 1], [-1, 0], [1, 0], [-0.6, -1], [0.6, 1]];
    // somewhere to stand: not in a wall or a parked car, not in a doorway (v0.35.1: moving
    // traffic doesn't count — it stops for you — so a queue beside you can't shut you in)
    const free = (x, y) => !map.rectBlocked(x - 8, y - 6, 16, 8, actor) && !map.doorAt(Math.floor(x / TILE), Math.floor(y / TILE)) && !this.carsOn(map.id).some((c) => c !== car && dist(c.x, c.y, x, y) < (this.model(c).len + 20) / 2 && this.overlapCars({ x, y, angle: 0, len: 12, wid: 12 }, { ...c, len: this.model(c).len, wid: this.model(c).wid }));
    let spot = null;
    for (const [u, v] of tries) {
      for (const extra of [10, 22, 36]) {
        const ox = u * (m.len / 2 + extra);
        const oy = v * (m.wid / 2 + extra);
        const x = car.x + cs * ox - sn * oy;
        const y = car.y + sn * ox + cs * oy;
        if (free(x, y)) { spot = { x, y }; break; }
      }
      if (spot) break;
    }
    // v0.35.1: still nowhere? look all the way round the car, a little further out each time
    for (let extra = 12; !spot && extra <= 110; extra += 14) {
      for (let k = 0; k < 24 && !spot; k++) {
        const t = (k * Math.PI) / 12; // relative to the car's nose
        const edge = Math.min(m.len / 2 / Math.max(1e-6, Math.abs(Math.cos(t))), m.wid / 2 / Math.max(1e-6, Math.abs(Math.sin(t))));
        const x = car.x + Math.cos(car.angle + t) * (edge + extra);
        const y = car.y + Math.sin(car.angle + t) * (edge + extra);
        if (free(x, y) && map.lineOfSight(Math.floor(car.x / TILE), Math.floor(car.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE))) spot = { x, y };
      }
    }
    if (!spot) return { ok: false, text: map.tileAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE)) === '~' ? 'You\'re afloat — steer for the bank or a jetty to get out.' : 'There\'s no room to open the door.' };
    car.speed = 0;
    g.player.driving = null;
    g.player.x = spot.x;
    g.player.y = spot.y;
    g.player.lastTx = Math.floor(spot.x / TILE);
    g.player.lastTy = Math.floor(spot.y / TILE);
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.bus.emit('vehicle:exited', { car: car.id });
    return { ok: true };
  }

  // -------------------------------------------------------------- theft
  startHotwire(id) {
    const car = this.car(id);
    if (!car || car.owner === 'player') return { ok: false, text: '' };
    this.hotwire = { id, t: 0, need: HOTWIRE_SECONDS * (1.3 - 0.1 * this.game.stat('finesse')) };
    this.game.bus.emit('sfx', { id: 'sfx_locked' });
    return { ok: true, text: 'You jimmy the door and go for the wires under the dash…' };
  }

  /** Runs while hotwiring: stand still or it's abandoned. */
  updateHotwire(dt, input) {
    const g = this.game;
    const h = this.hotwire;
    const car = this.car(h.id);
    if (!car || car.map !== g.player.map || Math.hypot(input.x || 0, input.y || 0) > 0.2 || dist(car.x, car.y, g.player.x, g.player.y) > 120) {
      this.hotwire = null;
      g.notify('You leave the wires alone.', 'info');
      return;
    }
    h.t += dt;
    if (h.t >= h.need) {
      this.hotwire = null;
      this.steal(car);
    }
  }

  steal(car) {
    const g = this.game;
    const prev = car.owner;
    car.from = prev;
    car.owner = 'player';
    car.stolen = true;
    car.reported = false;
    if (prev?.startsWith('dealer:')) this.state.restock[prev.slice(7)] = g.clock.day; // the lot fills the gap tomorrow
    const owner = prev?.startsWith('dealer:') ? g.npcs.get(this.cfg.dealers[prev.slice(7)].npc) : prev ? g.npcs.get(prev) : null;
    if (owner && prev.startsWith('dealer:') && owner.map === car.map) g.bark(owner, owner.id === 'npc_marty' ? 'OI! That\'s STOCK! …Fair play, though.' : 'I beg your PARDON!');
    if (owner) g.relationships.adjust(owner, 'player', { trust: -20, affection: -15, suspicion: 30 }, 'stole my car');
    if (owner && this.model(car).sig) {
      g.relationships.adjust(owner, 'player', { trust: -10, affection: -10 }, `stole the ${this.model(car).name}`);
      if (owner.map === car.map && dist(owner.x, owner.y, car.x, car.y) < 400) g.bark(owner, this.model(car).stolenLine);
    }
    g.reportCrime({ fact: 'fact_player_car_theft', map: car.map, x: car.x, y: car.y });
    g.bus.emit('sfx', { id: 'sfx_car_start' });
    g.bus.emit('vehicle:stolen', { car: car.id, from: prev });
    g.notify(`The engine coughs into life. The ${this.model(car).name} is yours — as far as you're concerned.`, 'warn');
    this.enter(car.id);
  }

  // ------------------------------------------------------------- driving
  /** Called instead of Game.updatePlayer while the player is driving. */
  update(dt, input) {
    const g = this.game;
    const p = g.player;
    const car = this.driving();
    if (!car) return;
    const m = this.model(car);
    this.physics(car, input, dt);
    this.hitPeople(car, m, dt);
    p.x = car.x;
    p.y = car.y;
    p.vx = Math.cos(car.angle) * car.speed;
    p.vy = Math.sin(car.angle) * car.speed;
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    p.facing = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
    p.moving = Math.abs(car.speed) > 5;
    this.crossings(car, true);
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (tx !== p.lastTx || ty !== p.lastTy) {
      p.lastTx = tx;
      p.lastTy = ty;
      g.updateDiscovery();
    }
    this.watchForPolice(car);
    if (m.sig) this.signature(car, m, dt);
  }

  /** v0.34.0: a signature car leaves its trail, and its owner knows it when they see it go by. */
  signature(car, m, dt) {
    const g = this.game;
    const sp = Math.abs(car.moved || 0);
    if (m.trail && sp > 25) {
      this.trailAcc = (this.trailAcc || 0) + dt * Math.min(1, sp / 250) * 9;
      const list = (this.trail ||= []);
      while (this.trailAcc >= 1) {
        this.trailAcc -= 1;
        const back = -m.len / 2 - 4;
        const side = (Math.random() - 0.5) * m.wid * 0.8; // looks only: keep the shared rng out of it
        const c = Math.cos(car.angle);
        const s = Math.sin(car.angle);
        list.push({ kind: m.trail, map: car.map, x: car.x + c * back - s * side, y: car.y + s * back + c * side, t: g.realTime, r: Math.random() });
      }
      while (list.length > 160 || (list.length && g.realTime - list[0].t > 4)) list.shift();
    }
    if (!car.stolen) return;
    const owner = g.npcs.get(m.owner);
    if (!owner || owner.map !== car.map || owner.riding != null || dist(owner.x, owner.y, car.x, car.y) > 300) return;
    if ((car.spottedAt || -1e9) > g.realTime - 120) return;
    car.spottedAt = g.realTime;
    g.bark(owner, m.stolenLine);
    g.relationships.adjust(owner, 'player', { affection: -3 }, `saw you in the ${m.name}`);
  }

  /**
   * One frame of a car's physics from driver input { x: steer, y: −throttle, sprint: handbrake }.
   * Shared by you and by police drivers (src/systems/pursuit.js). Returns true if it hit something.
   */
  physics(car, input, dt) {
    const g = this.game;
    const m = this.model(car);
    const D = this.cfg.driving;
    const map = g.maps.get(car.map);
    let crashed = false;
    const throttle = -(input.y || 0);
    const steer = input.x || 0;
    car.speed ||= 0;
    const tile = map.tileAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE));
    const top = m.top * (ROAD.has(tile) ? 1 : tile === '~' && m.amphibious ? m.seaSpeed || 1 : m.offRoad ?? D.offRoad); // v0.30.0: tractors don't mind fields; v0.34.0: the Landlubber is faster at sea
    car.braking = false;
    if (throttle > 0.1) car.speed += (car.speed < 0 ? D.brake : m.accel) * throttle * dt;
    else if (throttle < -0.1) {
      if (car.speed > 0) { car.speed -= D.brake * -throttle * dt; car.braking = true; } else car.speed -= m.accel * 0.6 * -throttle * dt;
    } else {
      const drag = (D.drag + Math.abs(car.speed) * 0.5) * dt;
      car.speed = Math.abs(car.speed) <= drag ? 0 : car.speed - Math.sign(car.speed) * drag;
    }
    if (input.sprint) { car.speed *= Math.max(0, 1 - 3 * dt); car.braking = true; }
    if (car.speed > top) car.speed = Math.max(top, car.speed - D.brake * dt);
    car.speed = clamp(car.speed, -m.top * D.reverseShare, Math.max(m.top, top));
    // steering bites harder at speed (up to a point); reversing turns the other way
    const bite = clamp(car.speed / 140, -1, 1);
    // already in a wall? ease out first. Already overlapping a car? then other cars don't stop you
    // moving (so you can pull apart) — but walls always do
    this.unstick(map, car, m);
    const walls0 = this.inWalls(map, car.x, car.y, car.angle, m.len, m.wid, car);
    const wedged = this.carAt(map, car.x, car.y, car.angle, m.len, m.wid, car);
    const stopsAt = (x, y, ang) => {
      const w = this.inWalls(map, x, y, ang, m.len, m.wid, car);
      if (w > walls0 || (w && !walls0)) return true; // deeper into a wall (or into one at all)
      return !wedged && this.carAt(map, x, y, ang, m.len, m.wid, car);
    };
    // v0.20.0: the wheel turns in over a moment rather than snapping, and the car's
    // travel lags its nose a little (more on the handbrake), so turns carry weight
    car.wheel = (car.wheel || 0) + (steer - (car.wheel || 0)) * Math.min(1, dt * 7);
    const turned = car.angle + car.wheel * m.grip * bite * dt * (input.sprint ? 1.5 : 1);
    // turning swings the car's ends: don't rotate into a wall
    if (!stopsAt(car.x, car.y, turned)) car.angle = turned;
    if (car.travel === undefined || Math.abs(car.speed) < 30) car.travel = car.angle;
    const slip = Math.atan2(Math.sin(car.angle - car.travel), Math.cos(car.angle - car.travel));
    const hold = input.sprint ? 2.2 : 9 + 6 * (1 - Math.min(1, Math.abs(car.speed) / 400)); // how quickly the tyres pull the car into line
    car.travel += slip * Math.min(1, dt * hold);
    car.slip = Math.abs(slip);
    if (car.slip > 0.08) car.speed *= 1 - Math.min(0.5, car.slip * dt * 0.9); // scrubbing off speed in the slide
    car.skidding = car.slip > 0.22 && Math.abs(car.speed) > 110;
    if (car.skidding) this.skidMark(car, m);
    // move in small steps so nothing tunnels through a wall
    const x0 = car.x;
    const y0 = car.y;
    const total = car.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(total) / 6));
    for (let i = 0; i < steps; i++) {
      const nx = car.x + (Math.cos(car.travel) * total) / steps;
      const ny = car.y + (Math.sin(car.travel) * total) / steps;
      if (!stopsAt(nx, ny, car.angle)) { car.x = nx; car.y = ny; continue; }
      // slide along the obstacle if we can
      if (!stopsAt(nx, car.y, car.angle)) { car.x = nx; car.speed *= 0.92; continue; }
      if (!stopsAt(car.x, ny, car.angle)) { car.y = ny; car.speed *= 0.92; continue; }
      crashed = true;
      this.crash(car);
      break;
    }
    car.moved = dt > 0 ? Math.hypot(car.x - x0, car.y - y0) / dt : 0; // actual speed over the ground
    if (m.sig) car.odo = ((car.odo || 0) + car.moved * dt) % 1e6; // v0.34.0: the Paranoia's tracks turn
    return crashed;
  }

  /** Rear-tyre marks on the road (runtime only; they fade). */
  skidMark(car, m) {
    const g = this.game;
    const list = (this.skids ||= []);
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    const bx = car.x - c * m.len * 0.31;
    const by = car.y - s * m.len * 0.31;
    const at = g.realTime;
    for (const side of [-1, 1]) {
      const x = bx - s * side * m.wid / 2;
      const y = by + c * side * m.wid / 2;
      const key = `${car.id}${side}`;
      const prev = list.findLast?.((k) => k.key === key);
      if (prev && at - prev.t < 0.12) list.push({ key, map: car.map, x0: prev.x1, y0: prev.y1, x1: x, y1: y, t: at });
      else list.push({ key, map: car.map, x0: x, y0: y, x1: x, y1: y, t: at });
    }
    while (list.length > 600 || (list.length && at - list[0].t > 14)) list.shift();
  }

  /** Seams (by the car's centre) and region gates (by its nose, which reaches the edge first). Police drivers don't take gates. */
  crossings(car, isPlayer) {
    const map = this.game.maps.get(car.map);
    const m = this.model(car);
    const door = map.doorAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE));
    const dirn = Math.sign(car.speed) || 1;
    const nose = map.doorAt(clamp(Math.floor((car.x + Math.cos(car.angle) * dirn * (m.len / 2 + 4)) / TILE), 0, map.width - 1), clamp(Math.floor((car.y + Math.sin(car.angle) * dirn * (m.len / 2 + 4)) / TILE), 0, map.height - 1));
    if (door?.seamless && !door.portal) this.crossSeam(car, door, isPlayer);
    else if (isPlayer && (nose || door)?.gateway && Math.abs(car.speed) > 5) this.crossGate(car, (nose || door));
  }

  crash(car) {
    const g = this.game;
    const hard = Math.abs(car.speed) > 160;
    car.impact = Math.abs(car.speed);
    if (hard && (car.crashAt || 0) < g.realTime - 0.6) {
      car.crashAt = g.realTime;
      const near = car.map === g.player.map && dist(car.x, car.y, g.player.x, g.player.y) < 500;
      if (near) g.bus.emit('sfx', { id: 'sfx_crash' });
      if (g.heavy && (car.id === g.player.driving || car.rammed)) g.heavy.shakeUntil = g.realTime + Math.min(0.4, Math.abs(car.speed) / 900);
    }
    car.speed = -car.speed * 0.25;
  }

  hitPeople(car, m, dt) {
    const g = this.game;
    const D = this.cfg.driving;
    const now = g.clock.total;
    car.hitCd ||= {};
    const fx = car.x + Math.cos(car.angle) * (m.len / 2 - 8) * Math.sign(car.speed || 1);
    const fy = car.y + Math.sin(car.angle) * (m.len / 2 - 8) * Math.sign(car.speed || 1);
    for (const npc of g.npcs.values()) {
      if (npc.map !== car.map || npc.dead || isDown(npc, now)) continue;
      const d = Math.min(dist(npc.x, npc.y, fx, fy), dist(npc.x, npc.y, car.x, car.y));
      if (d > m.wid / 2 + 8) continue;
      if ((car.hitCd[npc.id] || 0) > g.realTime) continue;
      car.hitCd[npc.id] = g.realTime + 1;
      const speed = Math.abs(car.speed);
      if (isProtected(npc)) {
        // the Oberverse protects its own: the car simply stops
        car.speed = 0;
        g.bark(npc, g.rng.pick(['Watch where you\'re going!', 'Do you MIND?', 'Eyes on the road!']));
        continue;
      }
      if (speed < D.hitSpeed) {
        // a nudge: they step out of the way, annoyed
        car.speed *= 0.3;
        if (g.rng.chance(0.5)) g.bark(npc, g.rng.pick(['Oi!', 'Hey! Careful!', 'I\'m walking here!']));
        g.relationships.adjust(npc, 'player', { affection: -2 }, 'nudged by your car');
        continue;
      }
      const dir = { x: Math.cos(car.angle) * Math.sign(car.speed), y: Math.sin(car.angle) * Math.sign(car.speed) };
      g.combat.hitNpc(npc, speed * D.hitDamage, { weapon: { ...CAR_WEAPON, weapon: { ...CAR_WEAPON.weapon, knockback: Math.min(70, speed * 0.15) } }, dir, lethal: speed >= D.lethalSpeed });
      g.bus.emit('sfx', { id: 'sfx_crash' });
      g.bus.emit('vehicle:hit', { npc: npc.id, speed });
      car.speed *= 0.55;
    }
  }

  crossSeam(car, door, isPlayer = true) {
    const g = this.game;
    const off = g.mapOffset(car.map, door.to.map);
    if (!off) return;
    const heading = Math.sign(off.x) * Math.cos(car.angle) * car.speed + Math.sign(off.y) * Math.sin(car.angle) * car.speed;
    if (heading <= 0) return;
    const nx = car.x - off.x;
    const ny = car.y - off.y;
    const dest = g.maps.get(door.to.map);
    const m = this.model(car);
    if (this.blocked(dest, nx, ny, car.angle, m.len, m.wid, car)) return;
    car.map = door.to.map;
    car.x = nx;
    car.y = ny;
    if (isPlayer) g.changeMap(car.map, null, { x: nx, y: ny, keepVelocity: true, seamless: true });
  }

  /** Drive through a gate between regions: arrive on the other side, facing away from it. */
  crossGate(car, door) {
    const g = this.game;
    const dest = g.maps.get(door.to.map);
    const s = dest?.spotPx(door.to.spot);
    if (!s) return;
    // only when driving out through the edge
    const out = door.x === 0 ? Math.cos(car.angle) * car.speed < 0 : Math.cos(car.angle) * car.speed > 0;
    if (!out) return;
    const east = s.x < dest.width * TILE / 2; // arriving at the west edge: drive east
    const m = this.model(car);
    let x = s.x + (east ? m.len / 2 : -m.len / 2);
    const y = s.y;
    for (let k = 0; k < 6 && this.blocked(dest, x, y, east ? 0 : Math.PI, m.len, m.wid, car); k++) x += east ? 16 : -16;
    car.map = dest.id;
    car.x = x;
    car.y = y;
    car.angle = east ? 0 : Math.PI;
    car.travel = car.angle;
    car.speed = Math.min(Math.abs(car.speed), 160);
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.changeMap(dest.id, null, { x, y });
  }

  // ------------------------------------------------------------ the law
  /** An officer who sees you in a stolen car knows it. */
  watchForPolice(car) {
    const g = this.game;
    if (!car.stolen || car.reported || !g.police) return;
    const sus = this.model(car).unsuspected;
    if (sus === 'unseen') return; // v0.34.0: the Paranoia's tinfoil — the police look straight through it
    if ((this.nextLook || 0) > g.realTime) return;
    this.nextLook = g.realTime + 0.5;
    const map = g.maps.get(car.map);
    for (const o of g.police.activeOfficers()) {
      if (o.map !== car.map || isDown(o, g.clock.total) || o.activity === 'sleep') continue;
      if (!g.canSee(o, car.x, car.y, map, 9)) continue;
      if (sus === 'salute') {
        // v0.34.0: nobody would steal the Chief's car, so it must be the Chief
        if ((o.saluted || -1e9) < g.realTime - 90) { o.saluted = g.realTime; g.bark(o, g.rng.pick(['*salutes* Chief!', 'Morning, Chief! Out of the station? Blimey.', '*snaps to attention*'])); }
        continue;
      }
      car.reported = true;
      g.bark(o, 'That\'s a stolen car! Pull over!');
      g.police.raiseWanted(3, `${o.profile.shortName} recognised the stolen ${this.model(car).name}.`);
      g.police.startPursuit(o);
      return;
    }
  }

  onJailed() {
    const g = this.game;
    const car = this.driving();
    if (car) g.player.driving = null;
    g.player.riding = null;
    // stolen cars are impounded and go back to their owners
    for (const c of this.ownedCars()) {
      if (!c.stolen || !c.reported) continue;
      this.returnToOwner(c);
    }
  }

  returnToOwner(c) {
    const parked = this.cfg.parked.find((p) => p.id === c.id);
    if (parked) Object.assign(c, { map: parked.map, x: (parked.x + 0.5) * TILE, y: (parked.y + 0.5) * TILE, angle: (parked.angle * Math.PI) / 180, owner: parked.owner, stolen: false, reported: false, from: undefined, speed: 0 });
    else delete this.state.cars[c.id]; // a dealer's car goes back to the lot's stock
  }

  // ---------------------------------------------------------- dealerships
  dealer(id) {
    return this.cfg.dealers[id];
  }

  /** Buy a new (or new-to-you) car; it's waiting on the forecourt. */
  buy(dealerId, modelId, color) {
    const g = this.game;
    const d = this.dealer(dealerId);
    const m = this.cfg.models[modelId];
    if (!d || !m || !d.models.includes(modelId)) return { ok: false, text: 'That isn\'t for sale here.' };
    if (g.player.money < m.price) return { ok: false, text: `The ${m.name} is ${m.price} obols. You have ${g.player.money}.` };
    const map = g.maps.get(d.map);
    const angle = (d.delivery.angle * Math.PI) / 180;
    let x = (d.delivery.x + 0.5) * TILE;
    const y = (d.delivery.y + 0.5) * TILE;
    for (let k = 0; k < 8 && this.blocked(map, x, y, angle, m.len, m.wid); k++) x += 40;
    if (this.blocked(map, x, y, angle, m.len, m.wid)) return { ok: false, text: 'The forecourt is full. Move one of your cars first.' };
    g.player.money -= m.price;
    g.bus.emit('money:changed', { delta: -m.price, total: g.player.money });
    const s = this.state;
    const id = `car_p${s.nextId++}`;
    s.cars[id] = { id, model: modelId, color: m.colors.includes(color) ? color : m.colors[0], map: d.map, x, y, angle, owner: 'player', stolen: false, plate: plateFor(`${id}${g.clock.total}`) };
    g.setFlag('owns_car', true);
    g.bus.emit('vehicle:bought', { car: id, model: modelId, dealer: dealerId });
    return { ok: true, car: id, text: `The ${m.name} is yours. It's waiting on the forecourt — keys are in it.` };
  }

  /** Your cars parked on a dealer's lot (you can sell or re-plate those). */
  onLot(dealerId) {
    const d = this.dealer(dealerId);
    const L = d.lot;
    return this.ownedCars().filter((c) => c.map === d.map && c.x >= L.x * TILE - 32 && c.x <= (L.x + L.w) * TILE + 32 && c.y >= L.y * TILE - 32 && c.y <= (L.y + L.h) * TILE + 32 && c.id !== this.game.player.driving);
  }

  offer(dealerId, car) {
    if (this.model(car).sig) return 0; // everyone in the Oberverse knows whose that is
    const d = this.dealer(dealerId);
    const m = this.model(car);
    if (car.stolen) return d.buysStolen ? Math.round(m.price * d.buysStolen) : 0;
    return Math.round(m.price * d.tradeIn);
  }

  sell(dealerId, carId) {
    const g = this.game;
    const car = this.car(carId);
    if (!car || !this.onLot(dealerId).includes(car)) return { ok: false, text: 'Park it on the lot first.' };
    const price = this.offer(dealerId, car);
    if (!price) return { ok: false, text: this.model(car).sig ? `Sell you the ${this.model(car).name}? I'd sooner sell my own mother. Everybody knows whose that is.` : 'We do not handle vehicles of… uncertain provenance.' };
    delete this.state.cars[carId];
    g.player.money += price;
    g.bus.emit('money:changed', { delta: price, total: g.player.money });
    g.bus.emit('vehicle:sold', { car: carId, dealer: dealerId, stolen: car.stolen });
    return { ok: true, text: `Sold the ${this.model(car).name} for ${price} obols.` };
  }

  /** Marty's "fresh plates": a stolen car becomes yours on paper. */
  replate(dealerId, carId) {
    const g = this.game;
    const d = this.dealer(dealerId);
    const car = this.car(carId);
    if (!d.plates) return { ok: false, text: 'We don\'t do that here.' };
    if (!car || !car.stolen || !this.onLot(dealerId).includes(car)) return { ok: false, text: 'Bring the car onto the lot.' };
    if (g.player.money < d.plates) return { ok: false, text: `Fresh plates are ${d.plates} obols.` };
    g.player.money -= d.plates;
    g.bus.emit('money:changed', { delta: -d.plates, total: g.player.money });
    car.stolen = false;
    car.reported = false;
    car.from = undefined;
    car.plate = plateFor(`${car.id}x${g.clock.total}`);
    return { ok: true, text: `New plates (${car.plate}), new paperwork, new history. The ${this.model(car).name} has always been yours.` };
  }

  /** Daily: dealers put a fresh car where a stolen one stood. */
  dailyTick() {
    const s = this.state;
    for (const [did, day] of Object.entries(s.restock)) {
      if (day >= this.game.clock.day) continue;
      const d = this.dealer(did);
      d.display.forEach((sp, i) => {
        const id = `car_${did}_${i}`;
        const px = (sp.x + 0.5) * TILE;
        const py = (sp.y + 0.5) * TILE;
        if (Object.values(s.cars).some((c) => c.owner === `dealer:${did}` && c.map === d.map && dist(c.x, c.y, px, py) < 8)) return;
        const nid = s.cars[id] ? `car_${did}_${i}_${s.nextId++}` : id;
        s.cars[nid] = { id: nid, model: sp.model, color: this.cfg.models[sp.model].colors[0], map: d.map, x: (sp.x + 0.5) * TILE, y: (sp.y + 0.5) * TILE, angle: (sp.angle * Math.PI) / 180, owner: `dealer:${did}`, stolen: false, plate: 'FOR SALE' };
      });
      delete s.restock[did];
    }
  }
}
