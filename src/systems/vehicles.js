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
  for (const p of v.parked) cars[p.id] = { id: p.id, model: p.model, color: p.color, map: p.map, x: (p.x + 0.5) * TILE, y: (p.y + 0.5) * TILE, angle: (p.angle * Math.PI) / 180, owner: p.owner, stolen: false, plate: plateFor(p.id) };
  for (const [did, d] of Object.entries(v.dealers)) {
    d.display.forEach((s, i) => {
      const id = `car_${did}_${i}`;
      cars[id] = { id, model: s.model, color: v.models[s.model].colors[0], map: d.map, x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE, angle: (s.angle * Math.PI) / 180, owner: `dealer:${did}`, stolen: false, plate: 'FOR SALE' };
    });
  }
  return { cars, nextId: 1, restock: {} };
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
    return g.world.vehicles;
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
  actor() {
    return { kind: 'vehicle', canPass: (door) => Boolean(door.seamless || door.gateway) };
  }

  /** The car's body as three boxes along its length. */
  blocked(map, x, y, angle, len, wid, ignore) {
    const g = this.game;
    const a = this.actor();
    const half = len / 2 - wid / 2;
    const box = Math.max(16, wid - 8);
    for (const k of [-half, 0, half]) {
      const cx = x + Math.cos(angle) * k;
      const cy = y + Math.sin(angle) * k;
      if (map.rectBlocked(cx - box / 2, cy - box / 2, box, box, a)) return true;
    }
    return this.carAt(map, x, y, angle, len, wid, ignore);
  }

  /** Does a box (centre, angle, size) overlap a car on this map? */
  carAt(map, x, y, angle, len, wid, ignore) {
    for (const b of this.game.transit?.boxesOn(map.id) || []) {
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
    const whose = car.owner?.startsWith('dealer:') ? `On sale at ${this.cfg.dealers[car.owner.slice(7)].name} for ${m.price} obols. Talk to the salesman to buy one.`
      : car.owner === 'police' ? 'It belongs to the Halvermouth Police. Stealing it would be very bold and very stupid.'
        : car.owner ? `It belongs to ${this.game.npcs.get(car.owner)?.profile.name || 'someone'}.` : 'Nobody you know. The doors are locked.';
    return {
      type: 'choices', title: m.name,
      text: `${m.blurb} ${whose}`,
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
    let spot = null;
    for (const [u, v] of tries) {
      for (const extra of [10, 22, 36]) {
        const ox = u * (m.len / 2 + extra);
        const oy = v * (m.wid / 2 + extra);
        const x = car.x + cs * ox - sn * oy;
        const y = car.y + sn * ox + cs * oy;
        if (!map.rectBlocked(x - 8, y - 6, 16, 8, actor) && !this.blocked(map, x, y, 0, 8, 8)) { spot = { x, y }; break; }
      }
      if (spot) break;
    }
    if (!spot) return { ok: false, text: 'There\'s no room to open the door.' };
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
    const D = this.cfg.driving;
    let map = g.maps.get(car.map);
    const throttle = -(input.y || 0);
    const steer = input.x || 0;
    car.speed ||= 0;
    const tile = map.tileAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE));
    const top = m.top * (ROAD.has(tile) ? 1 : D.offRoad);
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
    car.speed = clamp(car.speed, -m.top * D.reverseShare, m.top);
    // steering bites harder at speed (up to a point); reversing turns the other way
    const bite = clamp(car.speed / 140, -1, 1);
    car.angle += steer * m.grip * bite * dt * (input.sprint ? 1.5 : 1);
    // move in small steps so nothing tunnels through a wall
    const total = car.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(total) / 6));
    for (let i = 0; i < steps; i++) {
      const nx = car.x + (Math.cos(car.angle) * total) / steps;
      const ny = car.y + (Math.sin(car.angle) * total) / steps;
      if (!this.blocked(map, nx, ny, car.angle, m.len, m.wid, car)) { car.x = nx; car.y = ny; continue; }
      // slide along the obstacle if we can
      if (!this.blocked(map, nx, car.y, car.angle, m.len, m.wid, car)) { car.x = nx; car.speed *= 0.92; continue; }
      if (!this.blocked(map, car.x, ny, car.angle, m.len, m.wid, car)) { car.y = ny; car.speed *= 0.92; continue; }
      this.crash(car);
      break;
    }
    this.hitPeople(car, m, dt);
    p.x = car.x;
    p.y = car.y;
    p.vx = Math.cos(car.angle) * car.speed;
    p.vy = Math.sin(car.angle) * car.speed;
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    p.facing = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
    p.moving = Math.abs(car.speed) > 5;
    // seams (by the car's centre) and region gates (by its nose, which reaches the edge first)
    const door = map.doorAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE));
    const dirn = Math.sign(car.speed) || 1;
    const nose = map.doorAt(clamp(Math.floor((car.x + Math.cos(car.angle) * dirn * (m.len / 2 + 4)) / TILE), 0, map.width - 1), clamp(Math.floor((car.y + Math.sin(car.angle) * dirn * (m.len / 2 + 4)) / TILE), 0, map.height - 1));
    if (door?.seamless) this.crossSeam(car, door);
    else if ((nose || door)?.gateway && Math.abs(car.speed) > 5) this.crossGate(car, (nose || door));
    map = g.maps.get(car.map);
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (tx !== p.lastTx || ty !== p.lastTy) {
      p.lastTx = tx;
      p.lastTy = ty;
      g.updateDiscovery();
    }
    this.watchForPolice(car);
  }

  crash(car) {
    const g = this.game;
    const hard = Math.abs(car.speed) > 160;
    if (hard && (car.crashAt || 0) < g.realTime - 0.6) {
      car.crashAt = g.realTime;
      g.bus.emit('sfx', { id: 'sfx_crash' });
      if (g.heavy) g.heavy.shakeUntil = g.realTime + Math.min(0.4, Math.abs(car.speed) / 900);
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

  crossSeam(car, door) {
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
    g.changeMap(car.map, null, { x: nx, y: ny, keepVelocity: true, seamless: true });
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
    car.speed = Math.min(Math.abs(car.speed), 160);
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.changeMap(dest.id, null, { x, y });
  }

  // ------------------------------------------------------------ the law
  /** An officer who sees you in a stolen car knows it. */
  watchForPolice(car) {
    const g = this.game;
    if (!car.stolen || car.reported || !g.police) return;
    if ((this.nextLook || 0) > g.realTime) return;
    this.nextLook = g.realTime + 0.5;
    const map = g.maps.get(car.map);
    for (const o of g.police.activeOfficers()) {
      if (o.map !== car.map || isDown(o, g.clock.total) || o.activity === 'sleep') continue;
      if (!g.canSee(o, car.x, car.y, map, 9)) continue;
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
    if (!price) return { ok: false, text: 'We do not handle vehicles of… uncertain provenance.' };
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
