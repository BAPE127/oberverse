// The Game object owns all simulation state and wires the systems together.
// It is deliberately free of DOM/Canvas/Audio code: the browser layers
// (src/engine, src/ui, src/audio) read its state and call its methods, and the
// test suite drives it headlessly.
import { EventBus } from '../core/eventBus.js';
import { Rng } from '../core/rng.js';
import { TILE, clamp, deepClone, dist, parseSpotRef, interpolate } from '../core/util.js';
import { WorldClock, MINUTES_PER_DAY, inWindow } from '../world/clock.js';
import { GameMap } from '../world/gameMap.js';
import { Relationships } from '../sim/relationships.js';
import { Knowledge } from '../sim/knowledge.js';
import { remember, recall, emptyMemory } from '../sim/memory.js';
import { NpcSystem } from '../sim/npcSystem.js';
import { blockAt } from '../sim/schedule.js';
import { check } from '../sim/conditions.js';
import { Inventory } from '../systems/inventory.js';
import { QuestSystem } from '../systems/quests.js';
import { EventDirector } from '../systems/eventDirector.js';
import { OilCompany, freshOil } from '../systems/oilCompany.js';
import { Construction, freshConstruction } from '../systems/construction.js';
import { Properties, freshProperties } from '../systems/properties.js';
import { Combat, isDown } from '../systems/combat.js';
import { Police, freshPolice } from '../systems/police.js';
import { Calculators } from '../systems/calculators.js';
import { Gang, freshGang } from '../systems/gang.js';
import { Factory, freshFactory } from '../systems/factory.js';
import { Arms, freshArms } from '../systems/arms.js';
import { Market, freshMarket } from '../systems/market.js';
import { Heavy } from '../systems/heavy.js';
import { Tablet } from '../systems/tablet.js';
import { Vehicles } from '../systems/vehicles.js';
import { Homes } from '../systems/homes.js';
import { Casino } from '../systems/casino.js';
import { Transit } from '../systems/transit.js';
import { Pursuit } from '../systems/pursuit.js';
import { Logistics } from '../systems/logistics.js';
import { Dairy } from '../systems/dairy.js';
import { Aerospace } from '../systems/aerospace.js';
import { Farm } from '../systems/farm.js';
import { Corporate } from '../systems/corporate.js'; // v0.60.0: company accounts
import { newLedgerMatch, playLedgerRound, ledgerWinner, LEDGER_STAKE } from '../systems/ledgerGame.js';
import { applyEffects } from './effects.js';
import { regionOffsetPx } from '../world/regions.js';
import { GAME_VERSION, olderThan } from '../core/version.js';

export const PLAYER_SPEED = 128;
export const PLAYER_SPRINT = 196;
export const PLAYER_BOX = { w: 16, h: 8 }; // feet hitbox, centred on x, bottom at y+2
const INTERACT_RANGE = 46;
const WITNESS_RANGE_TILES = 9;

export const DEFAULT_REPUTATION = { lanternside: 0, fac_civic: 0, fac_merchants: 0, fac_quay: 0, fac_oil: 0, fac_builders: 0 };

export class Game {
  constructor(content, { seed } = {}) {
    this.content = content;
    this.bus = new EventBus();
    this.maps = new Map(Object.values(content.maps).map((d) => [d.id, new GameMap(d, content.propTypes)]));
    this.relationships = new Relationships(this.bus);
    this.knowledge = new Knowledge(this.bus, content.facts);
    this.inventory = new Inventory(this);
    this.quests = new QuestSystem(this);
    this.events = new EventDirector(this);
    this.npcSystem = new NpcSystem(this);
    this.oil = new OilCompany(this);
    this.corp = new Corporate(this); // v0.60.0: the businesses' accounts (before any business is built)
    this.construction = new Construction(this);
    this.properties = new Properties(this);
    this.combat = new Combat(this);
    this.police = new Police(this);
    this.calculators = new Calculators(this);
    this.gang = new Gang(this);
    this.factory = new Factory(this);
    this.arms = new Arms(this);
    this.market = new Market(this);
    this.heavy = new Heavy(this);
    this.tablet = new Tablet(this);
    this.vehicles = new Vehicles(this);
    this.homes = new Homes(this); // v0.36.0: break-ins and invitations
    this.casino = new Casino(this); // v0.52.0: the Phonograph Grand
    this.transit = new Transit(this);
    this.pursuit = new Pursuit(this);
    this.logistics = new Logistics(this);
    this.dairy = new Dairy(this);
    this.aero = new Aerospace(this); // v0.55.0: Starling Flats Aerospace Park
    this.farm = new Farm(this);
    this.rng = new Rng(seed ?? 0x0b3e);
    this.clock = new WorldClock();
    this.paused = false;
    this.skipping = false;
    this.realTime = 0;
    this.warnings = [];
    this.lockMessageAt = -10;
    this.bus.on('fact:learned', (e) => this.onFactLearned(e));
  }

  /** Effective stat (base + calculator highs and comedowns). Use this, not player.stats, for checks. */
  stat(name) {
    return this.calculators.stat(name);
  }

  warn(msg) {
    this.warnings.push(msg);
    if (this.warnings.length > 50) this.warnings.shift();
  }

  // ------------------------------------------------------------- lifecycle
  newGame({ playerName = 'Wren', appearance = null, seed } = {}) {
    if (seed !== undefined) this.rng = new Rng(seed);
    this.clock = new WorldClock();
    const start = this.maps.get(this.content.startingMap).spotPx(this.content.startingSpot);
    this.player = {
      id: 'player',
      name: String(playerName).trim().slice(0, 20) || 'Wren',
      appearance: appearance || defaultPlayerAppearance(),
      map: this.content.startingMap,
      x: start.x,
      y: start.y,
      facing: 'up',
      vx: 0,
      vy: 0,
      health: 100,
      energy: 85,
      money: 12,
      inventory: { item_flat_key: 1 },
      stolen: {},
      knowledge: {},
      reputation: { ...DEFAULT_REPUTATION },
      stats: { charm: 2, wits: 2, grit: 2, finesse: 2 },
      buffs: [],
      tolerance: {},
      discovered: { maps: { [this.content.startingMap]: true }, areas: {} },
    };
    this.world = this.freshWorld();
    this.rebuildMaps();
    this.questState = {};
    this.npcs = new Map();
    for (const profile of Object.values(this.content.characters)) this.npcs.set(profile.id, this.createNpc(profile));
    this.afterLoad();
    this.notify(`Day ${this.clock.day}, ${this.clock.weekday}. Welcome to Lanternside, ${this.player.name}.`, 'info');
    return this;
  }

  freshWorld() {
    const containers = {};
    for (const [id, c] of Object.entries(this.content.containers)) containers[id] = { items: { ...c.items }, money: c.money || 0 };
    const shops = {};
    for (const [id, s] of Object.entries(this.content.shops)) shops[id] = { stock: { ...s.stock } };
    return {
      containers,
      shops,
      props: {},
      flags: {},
      publicFacts: {},
      oil: freshOil(),
      construction: freshConstruction(),
      properties: freshProperties(),
      police: freshPolice(),
      gang: freshGang(this.content),
      factory: freshFactory(this.content),
      arms: freshArms(this.content),
      market: freshMarket(this.content),
      events: { lastFired: {}, pending: [], log: [] },
      lastHour: Math.floor(this.clock.total / 60),
    };
  }

  /** Build a fresh NPC runtime record from its content profile. */
  createNpc(profile) {
    const block = blockAt(profile.schedule, this.clock.minuteOfDay);
    const target = block ? parseSpotRef(block.spot) : { map: 'lanternside', spot: 'start' };
    const pos = this.maps.get(target.map)?.spotPx(target.spot) || { x: TILE * 2, y: TILE * 2 };
    const npc = {
      id: profile.id,
      profile,
      map: target.map,
      x: pos.x,
      y: pos.y,
      facing: pos.facing || 'down',
      activity: block?.activity || 'idle',
      intent: null,
      arrived: true,
      mood: null,
      met: false,
      relationships: deepClone(profile.relationships || {}),
      knowledge: {},
      memory: emptyMemory(),
      topicsUsed: {},
      recentLines: [],
      gifts: null,
      chat: null,
      chatCooldownUntil: 0,
      hooksRun: {},
    };
    for (const f of profile.knowledge || []) npc.knowledge[f] = { kind: 'fact', source: 'innate', at: 0, confidence: 1 };
    return npc;
  }

  afterLoad() {
    for (const npc of this.npcs.values()) this.npcSystem.think(npc, true);
    this.dairy.afterLoad();
    this.farm.sync();
    this.corp.afterLoad(); // v0.60.0 (a new game)
    this.updateDiscovery();
  }

  // ------------------------------------------------------------------ query
  currentMap() {
    return this.maps.get(this.player.map);
  }

  getFlag(name) {
    return this.world.flags[name];
  }

  setFlag(name, value) {
    const v = value === '$day' ? this.clock.day : value;
    this.world.flags[name] = v;
    this.bus.emit('flag:set', { name, value: v });
  }

  moodOf(npc) {
    if (npc.mood && this.clock.total < npc.mood.until) return npc.mood.id;
    return 'neutral';
  }

  moodModifier(npc) {
    return this.content.moods[this.moodOf(npc)]?.persuasion ?? 0;
  }

  setMood(npc, id, minutes) {
    if (!this.content.moods[id]) return;
    npc.mood = { id, until: this.clock.total + minutes };
    this.bus.emit('npc:mood', { npcId: npc.id, mood: id });
  }

  applyEffects(effects, npc) {
    return applyEffects(this, effects, npc);
  }

  notify(text, kind = 'info') {
    this.bus.emit('notify', { text, kind });
  }

  bark(npc, text) {
    const t = interpolate(text, { player: this.player.name });
    npc.bubble = { text: t, until: this.realTime + 3.8 };
    this.bus.emit('npc:bark', { npcId: npc.id, text: t, physical: npc.map === this.player.map });
  }

  adjustReputation(fac, delta) {
    if (!delta) return;
    const rep = this.player.reputation;
    rep[fac] = clamp((rep[fac] || 0) + delta, -100, 100);
    const name = this.content.factions[fac]?.name || fac;
    this.bus.emit('rep:changed', { faction: fac, delta, value: rep[fac] });
    this.notify(`${name} reputation ${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? 'good' : 'warn');
  }

  // ------------------------------------------------------------ doors/locks
  doorLockReason(door, holder) {
    if (!door.to) return door.lock?.message || 'It won\'t open.';
    const lock = door.lock;
    if (!lock) return null;
    if (lock.aeroHall && !this.aero.hallBuilt(lock.aeroHall)) return 'Still a building site — Roost Aeroworks hasn\'t built it yet.'; // v0.57.0
    if (holder(lock.key)) return null;
    if (lock.home && this.homes?.opensFor(door)) return null; // v0.36.0: invited, or the lock's been picked / the door forced
    if (lock.flag && !this.getFlag(lock.flag)) return lock.flagMessage || lock.message || 'Locked. You are not expected here.';
    if (lock.hours && inWindow(this.clock.minuteOfDay, lock.hours.from, lock.hours.to)) return null;
    if (lock.flag && !lock.hours) return null;
    if (lock.message) return lock.message;
    if (lock.hours) return `Locked. Open ${lock.hours.from}–${lock.hours.to}.`;
    return 'Locked.';
  }

  playerCanPass(door) {
    return this.doorLockReason(door, (key) => this.inventory.count(key) > 0) === null;
  }

  npcCanPass(npc, door) {
    if (!door.to) return false;
    if (door.lock?.aeroHall && !this.aero.hallBuilt(door.lock.aeroHall)) return false;
    if (!door.lock || (door.lock.owners || []).includes(npc.id)) return true;
    if (door.lock.staff && npc.profile.staff) return true; // v0.36.0: the Lodging House lets its lodgers in
    if (npc.profile.worksMap && door.to.map === npc.profile.worksMap) return true; // …and the works its hands, for their shifts
    // Non-owners use public opening hours only (invitations are for the player).
    return Boolean(door.lock.hours && !door.lock.flag && inWindow(this.clock.minuteOfDay, door.lock.hours.from, door.lock.hours.to));
  }

  playerActor() {
    return { kind: 'player', canPass: (door) => this.playerCanPass(door) };
  }

  // ----------------------------------------------------------------- update
  /**
   * @param {number} dt real seconds since last frame (clamped by caller)
   * @param {{x:number,y:number,sprint:boolean}} input
   */
  update(dt, input = { x: 0, y: 0, sprint: false }) {
    if (this.paused) return;
    if (this.combat.wrath) {
      // The world holds its breath while the Oberverse protects its own.
      this.realTime += dt;
      this.combat.update(dt);
      return;
    }
    this.realTime += dt;
    const minutes = this.clock.tick(dt);
    const riding = this.player.riding !== null && this.player.riding !== undefined;
    if (riding) { /* the bus carries you (Transit.update) */ } else if (this.player.driving) this.vehicles.update(dt, input);
    else {
      if (this.vehicles.hotwire) this.vehicles.updateHotwire(dt, input);
      if (this.homes.picking) this.homes.updatePick(dt, input);
      this.updatePlayer(dt, input);
      this.factory.carryPlayer(dt); // v0.37.0: belts carry you
      this.arms.carryPlayer(dt);
    }
    this.combat.update(dt);
    this.police.update(dt);
    this.gang.update(dt);
    this.heavy.update(dt);
    this.transit.update(dt);
    this.pursuit.update(dt);
    const now = this.clock.total;
    const live = this.physicalMaps();
    for (const npc of this.npcs.values()) {
      if (!live.has(npc.map)) continue;
      if (npc.inDialogue || npc.hostile || npc.pursuit || isDown(npc, now)) {
        if (!npc.hostile && !npc.pursuit) npc.moving = false;
        continue;
      }
      this.npcSystem.updatePhysical(npc, dt);
      this.ambientBarks(npc);
    }
    this.dairy.update(dt);
    this.casino.update(); // v0.52.0: the host's flight to your table
    for (let i = 0; i < Math.min(minutes, 30); i++) this.minuteTick();
  }

  minuteTick() {
    this.combat.minuteTick();
    this.homes.minuteTick();
    this.police.minuteTick();
    this.calculators.minuteTick();
    this.gang.minuteTick();
    this.factory.minuteTick();
    this.arms.minuteTick();
    this.market.minuteTick();
    this.transit.minuteTick();
    this.logistics.minuteTick();
    this.dairy.minuteTick();
    this.aero.minuteTick();
    this.farm.minuteTick();
    if (this.clock.minuteOfDay === 6 * 60 + 7) this.corp.dailyTick(); // v0.60.0: the wider world's day
    if (this.clock.minuteOfDay === 19 * 60 + 5) this.corp.personnel.payroll(); // v0.62.0: the people you employ are paid, once a day
    this.casino.minuteTick();
    for (const npc of this.npcs.values()) {
      this.npcSystem.think(npc);
      if (this.skipping || !this.physicalMaps().has(npc.map)) this.npcSystem.updateAbstract(npc);
    }
    this.npcSystem.transitTick(); // v0.33.0: passengers board and get off
    this.npcSystem.socialTick();
    this.observe();
    this.quests.tick();
    this.events.runPending();
    const hour = Math.floor(this.clock.total / 60);
    if (hour !== this.world.lastHour) {
      this.world.lastHour = hour;
      this.events.hourly();
    }
    if (Math.floor(this.clock.total) % 1440 === 18 * 60 && this.world.oil.lastDividendDay !== this.clock.day) this.oil.dailyTick();
    if (Math.floor(this.clock.total) % 1440 === 18 * 60) this.properties.dailyTick();
    if (Math.floor(this.clock.total) % 1440 === 6 * 60) this.vehicles.dailyTick();
    for (const [id, shop] of Object.entries(this.content.shops)) {
      if (shop.restockAt && this.clock.timeString === shop.restockAt) this.restockShop(id);
    }
    if (Math.floor(this.clock.total) % 12 === 0) this.player.energy = Math.max(0, this.player.energy - 1);
  }

  /** Let NPCs notice the player in places they care about (profile.notices). */
  observe() {
    if (this.skipping) return;
    const p = this.player;
    const now = this.clock.total;
    const map = this.currentMap();
    for (const npc of this.npcs.values()) {
      if (npc.map !== p.map || npc.activity === 'sleep') continue;
      for (const n of npc.profile.notices || []) {
        if (n.map !== p.map) continue;
        if (!this.canSee(npc, p.x, p.y, map, 10)) continue;
        if (!recall(npc, n.tag, now, 60)) remember(npc, { text: n.text, tag: n.tag, about: 'player', importance: n.importance ?? 3 }, now);
      }
    }
  }

  canSee(npc, x, y, map, rangeTiles) {
    if (dist(npc.x, npc.y, x, y) > rangeTiles * TILE) return false;
    return map.lineOfSight(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE), Math.floor(x / TILE), Math.floor(y / TILE));
  }

  ambientBarks(npc) {
    if (npc.bubble && this.realTime < npc.bubble.until) return;
    const dlg = this.content.dialogues[npc.profile.dialogue];
    if (!dlg?.barks) return;
    const near = dist(npc.x, npc.y, this.player.x, this.player.y) < TILE * 5;
    if (npc.chat) {
      if ((npc.nextChatLine || 0) < this.realTime) {
        const pool = dlg.barks[npc.chat.tone === 'argue' ? 'argue' : 'chat'] || [];
        if (pool.length) this.bark(npc, this.rng.pick(pool));
        npc.nextChatLine = this.realTime + 2.4 + this.rng.next() * 2;
      }
      return;
    }
    if (!near || (npc.nextBarkAt || 0) > this.realTime) return;
    npc.nextBarkAt = this.realTime + 9 + this.rng.next() * 10;
    const mood = this.moodOf(npc);
    const pool = (mood !== 'neutral' && dlg.barks.moods?.[mood]) || dlg.barks[npc.activity] || dlg.barks.greet || [];
    if (pool.length && this.rng.chance(0.65)) this.bark(npc, this.rng.pick(pool));
  }

  // ------------------------------------------------------------- the player
  updatePlayer(dt, input) {
    const p = this.player;
    const map = this.currentMap();
    let ix = input.x || 0;
    let iy = input.y || 0;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const tired = p.energy <= 5;
    const sprinting = input.sprint && p.energy > 10 && len > 0;
    const speed = (sprinting ? PLAYER_SPRINT : PLAYER_SPEED) * (tired ? 0.7 : 1);
    const k = Math.min(1, dt * 14);
    p.vx += (ix * speed - p.vx) * k;
    p.vy += (iy * speed - p.vy) * k;
    if (Math.abs(p.vx) < 1 && !ix) p.vx = 0;
    if (Math.abs(p.vy) < 1 && !iy) p.vy = 0;
    if (sprinting) p.sprintAcc = (p.sprintAcc || 0) + dt;
    if (p.sprintAcc > 3) {
      p.sprintAcc = 0;
      p.energy = Math.max(0, p.energy - 1);
    }
    if (len > 0.1) p.facing = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : iy > 0 ? 'down' : 'up';

    const actor = this.playerActor();
    const box = (x, y) => [x - PLAYER_BOX.w / 2, y - PLAYER_BOX.h + 2, PLAYER_BOX.w, PLAYER_BOX.h];
    const blocked = (x, y) => map.rectBlocked(...box(x, y), actor) || this.vehicles.carAt(map, x, y - 2, 0, 14, 10);
    const startX = p.x;
    const startY = p.y;

    const dx = p.vx * dt;
    if (dx) {
      if (!blocked(p.x + dx, p.y)) p.x += dx;
      else {
        const nudge = this.cornerNudge(p.x + dx, p.y, 'y', blocked);
        if (nudge !== null) p.y += Math.sign(nudge) * Math.min(Math.abs(nudge), 90 * dt);
        else this.bumped(p.x + dx + Math.sign(dx) * PLAYER_BOX.w / 2, p.y);
        p.vx = 0;
      }
    }
    const dy = p.vy * dt;
    if (dy) {
      if (!blocked(p.x, p.y + dy)) p.y += dy;
      else {
        const nudge = this.cornerNudge(p.x, p.y + dy, 'x', blocked);
        if (nudge !== null) p.x += Math.sign(nudge) * Math.min(Math.abs(nudge), 90 * dt);
        else this.bumped(p.x, p.y + dy + (dy > 0 ? 2 : -PLAYER_BOX.h));
        p.vy = 0;
      }
    }
    p.moving = Math.hypot(p.x - startX, p.y - startY) > 0.05;
    if (p.moving) {
      p.animTime = (p.animTime || 0) + dt * (sprinting ? 1.5 : 1);
      p.stepAcc = (p.stepAcc || 0) + Math.hypot(p.x - startX, p.y - startY);
      if (p.stepAcc > 30) {
        p.stepAcc = 0;
        this.bus.emit('player:step', { surface: map.tileType(Math.floor(p.x / TILE), Math.floor(p.y / TILE)).name });
      }
    }

    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    const seam = map.doorAt(tx, ty);
    if (seam?.seamless) {
      // Seams are checked every frame: cross as soon as we are heading that way
      // and our feet fit inside the neighbouring map (an exact, jump-free handover).
      if (this.trySeam(seam, box)) return;
    }
    if (tx !== p.lastTx || ty !== p.lastTy) {
      p.lastTx = tx;
      p.lastTy = ty;
      const door = map.doorAt(tx, ty);
      if (door && door.to && !door.seamless) this.useDoor(door);
      else this.updateDiscovery();
    }
  }

  trySeam(door, box) {
    const p = this.player;
    const off = this.mapOffset(p.map, door.to.map);
    if (!off) return false;
    // v0.47.0: a building's front door (a portal) is crossed walking through it — in on the
    // street side, out on the room side; a map edge is crossed walking towards the neighbour
    const way = door.portal ? this.portalWay(door) : { x: Math.sign(off.x), y: Math.sign(off.y) };
    const heading = way.x * p.vx + way.y * p.vy;
    if (heading <= 0) return false;
    const nx = p.x - off.x;
    const ny = p.y - off.y;
    const dest = this.maps.get(door.to.map);
    // leaving a building you're already inside is always allowed (the lock is on the street side)
    const actor = door.portal && this.currentMap().kind === 'interior' ? { kind: 'player', canPass: (d) => d.portal || this.playerCanPass(d) } : this.playerActor();
    if (dest.rectBlocked(...box(nx, ny), actor)) return false;
    this.changeMap(door.to.map, null, { x: nx, y: ny, keepVelocity: true, seamless: true });
    return true;
  }

  /** Which way through a portal door leads: into the building from the street, out of it from inside. */
  portalWay(door) {
    if (door.way) return door.way;
    const map = this.currentMap();
    const inside = map.kind === 'interior';
    // a door on the bottom wall: in is up, out is down (and so on for the other walls)
    const edge = inside ? { x: door.x === 0 ? -1 : door.x === map.width - 1 ? 1 : 0, y: door.y === 0 ? -1 : door.y === map.height - 1 ? 1 : 0 } : null;
    if (inside) door.way = edge.x || edge.y ? edge : { x: 0, y: 1 };
    else {
      const I = this.maps.get(door.to.map);
      const off = this.mapOffset(map.id, I.id);
      const cx = off.x + (I.width * TILE) / 2 - (door.x + 0.5) * TILE;
      const cy = off.y + (I.height * TILE) / 2 - (door.y + 0.5) * TILE;
      door.way = Math.abs(cy) >= Math.abs(cx) ? { x: 0, y: Math.sign(cy) || -1 } : { x: Math.sign(cx), y: 0 };
    }
    return door.way;
  }

  /** Small sideways nudge that lets the player slide around corners and into doorways. */
  cornerNudge(x, y, axis, blocked) {
    for (let off = 1; off <= 9; off++) {
      for (const s of [-1, 1]) {
        const ox = axis === 'x' ? x + s * off : x;
        const oy = axis === 'y' ? y + s * off : y;
        if (!blocked(ox, oy)) return s * off;
      }
    }
    return null;
  }

  bumped(px, py) {
    const map = this.currentMap();
    const door = map.doorAt(Math.floor(px / TILE), Math.floor(py / TILE));
    if (!door) return;
    if (this.realTime - this.lockMessageAt < 2.5) return;
    this.lockMessageAt = this.realTime;
    const reason = this.doorLockReason(door, (key) => this.inventory.count(key) > 0);
    if (reason) {
      this.bus.emit('sfx', { id: 'sfx_locked' });
      this.notify(`${door.label ? door.label + ': ' : ''}${reason}`, 'warn');
    }
  }

  /**
   * v0.47.0: the maps whose people walk step by step — where you are and everything joined to it
   * seamlessly (the streets either side, every building on them), since you can see into them all.
   */
  physicalMaps() {
    if (this._physKey !== this.player.map) {
      this._physKey = this.player.map;
      this._phys = new Set([this.player.map, ...this.neighbors(this.player.map).map((n) => n.map.id)]);
    }
    return this._phys;
  }

  /** Pixel offset of another map in the same region (null if not connected seamlessly). */
  mapOffset(fromId, toId) {
    return regionOffsetPx(this.content.regions || {}, fromId, toId, TILE);
  }

  /** Maps drawn around the current one, with pixel offsets (the continuous outdoors). */
  neighbors(mapId = this.player.map) {
    const out = [];
    for (const region of Object.values(this.content.regions || {})) {
      if (!region.maps[mapId]) continue;
      for (const id of Object.keys(region.maps)) {
        if (id === mapId || !this.maps.has(id)) continue;
        out.push({ map: this.maps.get(id), ...this.mapOffset(mapId, id) });
      }
    }
    return out;
  }

  /** v0.41.0: a tower's lift — every floor but this one. */
  liftPanel(towerId) {
    const t = this.content.towers[towerId];
    const here = this.player.map;
    // v0.52.0: a private floor's button won't light without its owner's leave (rideLift checks too)
    const options = t.floors.filter((f) => f.map !== here).map((f) => ({ label: `${f.n} — ${f.name}${this.floorOpen(f) ? '' : ' 🔒'}`, call: ['game', 'rideLift', towerId, f.map] }));
    options.push({ label: 'Stay here', call: ['vehicles', 'noop'] });
    const cur = t.floors.find((f) => f.map === here);
    return { type: 'choices', title: `${t.name} — lift`, text: `The doors slide open. ${cur ? `You're on ${cur.n === 'G' ? 'the ground floor' : cur.n === 'R' ? 'the roof' : `floor ${cur.n}`}. ` : ''}Which floor?`, options };
  }

  rideLift(towerId, mapId) {
    const f = this.content.towers[towerId]?.floors.find((x) => x.map === mapId);
    if (!f) return { ok: false };
    if (!this.floorOpen(f)) {
      this.bus.emit('sfx', { id: 'sfx_locked' });
      return { ok: false, text: f.private.message || 'That floor is private.' };
    }
    this.bus.emit('sfx', { id: 'sfx_door' });
    this.changeMap(f.map, 'lift');
    return { ok: true, text: `Ding. ${f.n === 'G' ? 'Ground floor' : f.n === 'R' ? 'The roof' : `Floor ${f.n}`} — ${f.name}.` };
  }

  /** v0.52.0: may the player ride the lift to this floor? (a private floor needs its flag) */
  floorOpen(f) {
    return !f.private || Boolean(f.private.flag && this.getFlag(f.private.flag));
  }

  useDoor(door) {
    if (door.npcOnly || !this.playerCanPass(door)) return false; // v0.52.0: lift shafts are for those who live upstairs
    const lock = door.lock;
    if (lock?.trespass && !this.getFlag(`${lock.trespass}_permission`)) {
      this.reportCrime({ fact: `fact_player_trespassed_${lock.trespass}`, map: this.player.map, x: this.player.x, y: this.player.y });
    }
    this.bus.emit('sfx', { id: 'sfx_door' });
    this.changeMap(door.to.map, door.to.spot);
    return true;
  }

  changeMap(mapId, spotName, pos = null) {
    const map = this.maps.get(mapId);
    const s = pos || map?.spotPx(spotName);
    if (!map || !s) {
      this.warn(`changeMap: bad target ${mapId}:${spotName}`);
      return false;
    }
    const from = this.player.map;
    const p = this.player;
    p.map = mapId;
    p.x = s.x;
    p.y = s.y;
    if (!pos?.keepVelocity) {
      p.vx = 0;
      p.vy = 0;
    }
    if (s.facing) p.facing = s.facing;
    p.lastTx = Math.floor(p.x / TILE);
    p.lastTy = Math.floor(p.y / TILE);
    p.discovered.maps[mapId] = true;
    if (map.kind !== 'interior') this.lastOutdoorMap = mapId;
    if (map.def.restricted && !this.getFlag(`${map.def.restricted}_permission`)) this.setFlag(`trespassed_${map.def.restricted}`, true);
    this.npcSystem.onPlayerMapChanged();
    this.bus.emit('map:entered', { map: mapId, from, seamless: Boolean(pos?.seamless) });
    this.updateDiscovery();
    return true;
  }

  updateDiscovery() {
    const p = this.player;
    const map = this.currentMap();
    const area = map.areaAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    const key = area ? area.id : `map:${map.id}`;
    p.areaName = area ? area.name : map.name;
    if (!p.discovered.areas[key]) {
      p.discovered.areas[key] = true;
      this.bus.emit('area:discovered', { id: key, name: p.areaName });
      if (area) this.notify(`Discovered: ${area.name}`, 'discover');
    }
  }

  // --------------------------------------------------------------- crimes
  witnesses(mapId, x, y, rangeTiles = WITNESS_RANGE_TILES) {
    const map = this.maps.get(mapId);
    const out = [];
    for (const npc of this.npcs.values()) {
      if (npc.map !== mapId || npc.activity === 'sleep' || isDown(npc, this.clock.total)) continue;
      if (this.canSee(npc, x, y, map, rangeTiles)) out.push(npc);
    }
    return out;
  }

  reportCrime({ fact, map, x, y, radius = WITNESS_RANGE_TILES }) {
    const seen = this.witnesses(map, x, y, radius);
    for (const npc of seen) this.knowledge.learn(npc, fact, { kind: 'fact', source: 'witnessed', at: this.clock.total });
    if (seen.length) this.notify(`${seen.map((n) => n.profile.shortName).join(' and ')} saw that!`, 'warn');
    this.bus.emit('crime', { fact, witnesses: seen.map((n) => n.id), map, x, y });
    return seen;
  }

  makeNoise({ sources = [], radius = 12, fact, sfx, text }) {
    let playerHeard = false;
    const heard = new Set();
    for (const ref of sources) {
      const { map: mapId, spot } = parseSpotRef(ref);
      const pos = this.maps.get(mapId)?.spotPx(spot);
      if (!pos) continue;
      for (const npc of this.npcs.values()) {
        if (npc.map !== mapId || npc.activity === 'sleep' || heard.has(npc.id)) continue;
        if (dist(npc.x, npc.y, pos.x, pos.y) <= radius * TILE) heard.add(npc.id);
      }
      if (this.player.map === mapId && dist(this.player.x, this.player.y, pos.x, pos.y) <= radius * TILE) playerHeard = true;
    }
    for (const id of heard) this.knowledge.learn(this.npcs.get(id), fact, { kind: 'fact', source: 'heard', at: this.clock.total });
    if (playerHeard) {
      if (sfx) this.bus.emit('sfx', { id: sfx });
      if (text) this.notify(text, 'event');
      if (fact) this.knowledge.learn(this.player, fact, { kind: 'fact', source: 'heard', at: this.clock.total });
    }
    return [...heard];
  }

  sendOnErrand(npc, { spot, activity = 'errand', minutes = 30 }) {
    const now = this.clock.total;
    const block = blockAt(npc.profile.schedule, this.clock.minuteOfDay + (npc.profile.punctuality ?? 0));
    npc.intent = { activity, spot, source: 'errand', until: now + minutes, fromBlock: block?.index };
    npc.activity = activity;
    npc.arrived = false;
    npc.chat = null;
    this.npcSystem.plan(npc);
  }

  // ---------------------------------------------------------- knowledge
  onFactLearned({ who, factId, kind, source }) {
    const def = this.content.facts[factId];
    if (!def) return;
    if (who === 'player') {
      this.notify(`New information: ${def.text}`, 'info');
      return;
    }
    const npc = this.npcs.get(who);
    if (!npc) return;
    const reaction = npc.profile.reactions?.[factId];
    if (def.aboutPlayer) {
      const scale = kind === 'rumor' ? 0.5 : 1;
      const base = reaction?.relOverride || def.relImpact || {};
      const deltas = {};
      for (const [dim, v] of Object.entries(base)) deltas[dim] = Math.round(v * scale);
      this.relationships.adjust(npc, 'player', deltas, `learned:${factId}`);
      remember(npc, { text: def.text, tag: factId, about: 'player', importance: def.importance ?? 4 }, this.clock.total);
      if (!this.world.publicFacts[factId]) {
        this.world.publicFacts[factId] = true;
        for (const [fac, d] of Object.entries(def.reputation || {})) this.adjustReputation(fac, d);
      }
    }
    if (reaction) {
      if (reaction.rel) this.relationships.adjust(npc, 'player', reaction.rel, `reaction:${factId}`);
      if (reaction.mood) this.setMood(npc, reaction.mood.id, reaction.mood.minutes);
      if (reaction.bark && npc.map === this.player.map) this.bark(npc, reaction.bark);
    }
    if (source !== 'innate' && npc.map === this.player.map && source?.startsWith('told:')) {
      this.bus.emit('npc:heard', { npcId: npc.id, factId });
    }
  }

  // --------------------------------------------------------- interaction
  /** Things the player could interact with right now, best first. */
  interactables() {
    const p = this.player;
    const map = this.currentMap();
    const out = [];
    if (p.driving) return [{ kind: 'car_exit', id: p.driving, label: 'Get out of the car', score: -999 }];
    if (p.riding !== null && p.riding !== undefined) {
      const bus = this.transit.bus(p.riding);
      return bus && this.transit.dwelling(bus) ? [{ kind: 'bus_off', id: p.riding, label: `Get off at ${this.transit.stopFor(bus).name}`, score: -999 }] : [];
    }
    const bus = this.transit.boardable();
    if (bus) out.push({ kind: 'bus_on', id: bus.idx, label: `Board the ${this.transit.lineOf(bus).cfg.name} bus ${this.transit.heading(bus)} (${this.transit.lineOf(bus).cfg.fare} obols)`, score: -30 });
    const jack = this.transit.carjackable();
    if (jack) out.push({ kind: 'carjack', id: jack.id, label: `Carjack the ${this.content.vehicles.models[jack.model].name}`, score: dist(p.x, p.y, jack.x, jack.y) - 10 });
    const car = this.vehicles.nearest();
    if (car) out.push({ kind: 'car', id: car.id, label: this.vehicles.label(car), score: dist(p.x, p.y, car.x, car.y) - 20 });
    const homeDoor = this.homes.doorAhead(); // v0.36.0
    if (homeDoor) out.push({ kind: 'home_door', id: homeDoor.id, label: `${homeDoor.label || 'A locked door'}: break in…`, score: -5 });
    const fx = p.facing === 'left' ? -1 : p.facing === 'right' ? 1 : 0;
    const fy = p.facing === 'up' ? -1 : p.facing === 'down' ? 1 : 0;
    const score = (x, y) => {
      const d = dist(p.x, p.y, x, y);
      const dot = ((x - p.x) * fx + (y - p.y) * fy) / (d || 1);
      return d - dot * 14;
    };
    const now = this.clock.total;
    for (const npc of this.npcs.values()) {
      if (npc.map !== p.map || npc.riding != null) continue;
      const d = dist(p.x, p.y, npc.x, npc.y);
      if (d > INTERACT_RANGE) continue;
      const name = npc.profile.shortName;
      const label = npc.dead ? `Look at ${name}'s body` : isDown(npc, now) ? `${name} (unconscious)` : npc.activity === 'sleep' ? `${name} (asleep)` : `Talk to ${name}`;
      out.push({ kind: 'npc', id: npc.id, label, score: score(npc.x, npc.y) - 6 });
    }
    for (const prop of map.props) {
      if (!prop.interact && !prop.examine) continue;
      if (prop.hiddenUnless && !check(prop.hiddenUnless, this)) continue;
      if (prop.type === 'item' && this.world.props[prop.id]?.taken) continue;
      const cx = clamp(p.x, prop.x * TILE, (prop.x + prop.w) * TILE);
      const cy = clamp(p.y, prop.y * TILE, (prop.y + prop.h) * TILE);
      const d = dist(p.x, p.y, cx, cy);
      if (d > INTERACT_RANGE - 12) continue;
      out.push({ kind: 'prop', id: prop.id, label: this.propLabel(prop), score: score(cx, cy) });
    }
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    for (const door of map.doors) {
      if (door.npcOnly) continue; // v0.52.0: the residents' way through the lift shafts
      if (door.seamless && !(door.portal && !this.playerCanPass(door))) continue; // map edges and open front doors are walked through, not "entered" (a locked front door still says why)
      if (Math.abs(door.x - tx) + Math.abs(door.y - ty) !== 1) continue;
      const cx = (door.x + 0.5) * TILE;
      const cy = (door.y + 0.5) * TILE;
      const locked = !this.playerCanPass(door);
      out.push({ kind: 'door', id: door.id, label: locked ? `${door.label || 'Door'} (locked)` : `Enter ${door.label || 'door'}`, score: score(cx, cy) + 4 });
    }
    return out.sort((a, b) => a.score - b.score);
  }

  propLabel(prop) {
    const type = this.content.propTypes[prop.type];
    const name = prop.interact?.name || prop.name || type?.label || 'Object';
    switch (prop.interact?.kind) {
      case 'container': return `Search ${this.containerDef(prop.interact.container)?.name || name}`;
      case 'read': return `Read ${this.content.docs[prop.interact.doc]?.title || name}`;
      case 'sleep': return 'Sleep';
      case 'sit': return 'Sit and rest';
      case 'noticeboard': return 'Read the notice board';
      case 'obstacle': return this.world.props[prop.id]?.open ? `Climb through the ${name.toLowerCase()}` : `Examine ${name.toLowerCase()}`;
      case 'forage': return 'Pick wildflowers';
      case 'workstation': return `Work the ${name.toLowerCase()}`;
      case 'shop': return `Browse the ${name.toLowerCase()}`;
      case 'arms': return { buy: this.arms.owns(prop.interact.warehouse) ? 'Read the SOLD sign' : 'Read the FOR SALE sign', terminal: 'Use the terminal', bench: 'Use the armourer\'s workbench', entity: `Check the ${name.toLowerCase()}` }[prop.interact.action] || `Examine ${name.toLowerCase()}`;
      case 'factory': return { buy: this.factory.owns(prop.interact.warehouse) ? 'Read the SOLD sign' : 'Read the FOR SALE sign', workbench: 'Use the workbench', entity: `Check the ${name.toLowerCase()}` }[prop.interact.action] || `Examine ${name.toLowerCase()}`;
      case 'jail': return { serve: 'Lie on the cot', tray: 'Check the meal tray', dig: this.getFlag('jail_tunnel_open') ? 'Crawl into the tunnel' : 'Work at the loose brick', vent: 'Try the air vent', whisper: 'Whisper through the crack', bars: 'Grip the bars' }[prop.interact.action] || `Examine ${name.toLowerCase()}`;
      case 'contracts': return 'Look at the contracts board';
      case 'busstop': return 'Check the bus times';
      case 'logistics': return { terminal: 'Use the logistics terminal', berth: `Read the ${name}`, wheel: 'Take the wheel', logbook: 'Read the logbook' }[prop.interact.action] || `Examine ${name.toLowerCase()}`;
      case 'casino': { const t = this.content.casino.tables[prop.interact.table]; return `Sit down — ${t?.name || name} (${t?.min}–${t?.max})`; } // v0.52.0
      case 'casino_cashier': return 'Change money at the cage';
      case 'useItem': return this.inventory.count(prop.interact.item) && !(prop.interact.doneFlag && this.getFlag(prop.interact.doneFlag)) ? prop.interact.verb || `Use ${name.toLowerCase()}` : `Examine ${name.toLowerCase()}`;
      case 'lift': return 'Call the lift';
      case 'stockcheck': return 'Look at the display case';
      case 'dairy': return 'Read the company board';
      case 'aerospace': return { terminal: 'Use the aerospace terminal', board: 'Read the share board', sale: 'Read the sale notice' }[prop.interact.action] || `Examine ${name.toLowerCase()}`;
      case 'farm': return this.farm.label(prop);
      default: return prop.type === 'item' ? 'Pick up' : `Examine ${name.toLowerCase()}`;
    }
  }

  /**
   * Perform an interaction. Returns a UI action descriptor:
   * {type:'dialogue'|'message'|'container'|'read'|'sleep'|'none', ...}
   */
  interact(target) {
    if (!target) return { type: 'none' };
    if (target.kind === 'car') return this.vehicles.inspect(target.id);
    if (target.kind === 'bus_on') { const r = this.transit.board(target.id); return { type: 'message', text: r.text }; }
    if (target.kind === 'bus_off') { const r = this.transit.alight(); return r.ok ? { type: 'none' } : { type: 'message', text: r.text }; }
    if (target.kind === 'carjack') { this.transit.carjack(target.id); return { type: 'none' }; }
    if (target.kind === 'home_door') return this.homes.inspect(target.id);
    if (target.kind === 'car_exit') {
      const r = this.vehicles.exit();
      return r.ok ? { type: 'none' } : { type: 'message', text: r.text || 'You can\'t get out here.' };
    }
    if (target.kind === 'npc') {
      const npc = this.npcs.get(target.id);
      if (!npc) return { type: 'none' };
      if (npc.dead) return { type: 'message', text: `${npc.profile.shortName} is dead. There is nothing more to say.` };
      if (isDown(npc, this.clock.total)) return { type: 'message', text: `${npc.profile.shortName} is out cold, breathing shallowly.` };
      if (this.police.isOfficer(npc) && this.police.state.wanted > 0 && !this.police.jailed() && npc.id !== 'npc_lawrence') {
        this.bark(npc, 'Well, well. Saves me a walk. You\'re under arrest.');
        this.police.arrest(npc, true);
        return { type: 'none' };
      }
      if (npc.hostile) return { type: 'message', text: npc.hostile.mode === 'fight' ? `${npc.profile.shortName} is in no mood to talk — they're trying to hit you!` : `${npc.profile.shortName} backs away from you, terrified.` };
      if (npc.activity === 'sleep') {
        const pool = this.content.dialogues[npc.profile.dialogue]?.barks?.sleep || ['Zzz…'];
        this.bark(npc, this.rng.pick(pool));
        return { type: 'message', text: `${npc.profile.shortName} is fast asleep.` };
      }
      return { type: 'dialogue', npcId: npc.id };
    }
    if (target.kind === 'door') {
      const door = this.currentMap().doors.find((d) => d.id === target.id);
      if (!door || door.npcOnly) return { type: 'none' };
      if (!this.playerCanPass(door)) {
        this.lockMessageAt = -10;
        const reason = this.doorLockReason(door, (key) => this.inventory.count(key) > 0);
        this.bus.emit('sfx', { id: 'sfx_locked' });
        return { type: 'message', text: reason };
      }
      this.useDoor(door);
      return { type: 'none' };
    }
    const prop = this.currentMap().prop(target.id);
    if (!prop) return { type: 'none' };
    this.bus.emit('prop:used', { id: prop.id, kind: prop.interact?.kind || 'examine' });
    const act = prop.interact;
    if (prop.type === 'item' && prop.item) {
      this.world.props[prop.id] = { ...(this.world.props[prop.id] || {}), taken: true };
      this.inventory.add(prop.item, 1);
      return { type: 'message', text: `You found: ${this.content.items[prop.item].name}.` };
    }
    if (!act) {
      if (prop.onExamine) this.applyEffects(prop.onExamine);
      return { type: 'message', text: prop.examine };
    }
    switch (act.kind) {
      case 'lift': return this.liftPanel(act.tower);
      case 'casino': { // v0.52.0: sit at a table; the host flies over, then the table opens
        const r = this.casino.sit(act.table);
        return r.ok ? { type: 'casino', table: act.table } : { type: 'message', text: r.text };
      }
      case 'bank': return { type: 'panel', panel: 'tablet', opts: { tab: act.tab } }; // v0.70.0: the First Bank's desks open the tablet at that app
      case 'casino_cashier': return this.casino.cashier() ? { type: 'panel', panel: 'cashier' } : { type: 'message', text: 'The cage is shut: a brass bell, a sign — "BACK SHORTLY. — V." — and nobody behind the bars.' };
      case 'container': {
        const cdef = this.containerDef(act.container);
        if (cdef?.lockedBy && !this.inventory.count(cdef.lockedBy)) {
          this.bus.emit('sfx', { id: 'sfx_locked' });
          return { type: 'message', text: cdef.lockedText || 'It is locked.' };
        }
        return { type: 'container', containerId: act.container };
      }
      case 'shop': {
        // a staffed counter: the owner has to be behind it (and willing to serve you)
        const shop = this.content.shops[act.shop];
        const owner = act.staffed && shop?.owner ? this.npcs.get(shop.owner) : null;
        if (act.staffed) {
          const here = owner && owner.map === this.player.map && owner.activity !== 'sleep' && !isDown(owner, this.clock.total) && Math.hypot(owner.x - this.player.x, owner.y - this.player.y) < 4 * TILE;
          if (!here) return { type: 'message', text: act.closed || 'Nobody is behind the counter.' };
          if (act.shop === 'shop_sums' && this.gang.tier() >= 2) {
            this.bark(owner, 'We don\'t sell to rats.');
            return { type: 'message', text: `${owner.profile.shortName} folds her arms. Arthur's orders: nothing for you.` };
          }
        }
        return { type: 'shop', shopId: act.shop };
      }
      case 'jail':
        return this.police.jailInteract(prop);
      case 'factory':
        return this.factory.interact(prop);
      case 'arms':
        return this.arms.interact(prop);
      case 'busstop':
        return this.transit.stopInfo(act.stop);
      case 'logistics':
        return this.logistics.interact(prop);
      case 'dairy':
        return this.dairy.interact(prop);
      case 'aerospace':
        return this.aero.interact(prop);
      case 'farm':
        return this.farm.interact(prop);
      case 'workstation':
        return act.company === 'construction' ? this.construction.stationPrompt(prop) : this.oil.stationPrompt(prop);
      case 'contracts':
        return { type: 'contracts' };
      case 'read': {
        if (act.private) {
          const owner = this.npcs.get(act.private);
          if (owner && owner.map === this.player.map && owner.activity !== 'sleep' && this.canSee(owner, this.player.x, this.player.y, this.currentMap(), 8)) {
            this.bark(owner, act.caughtBark || 'Those are private.');
            this.relationships.adjust(owner, 'player', { suspicion: 8, trust: -3 }, 'snooping');
            remember(owner, { text: 'Caught the newcomer reading my private papers.', tag: 'caught_snooping', about: 'player', importance: 6 }, this.clock.total);
            return { type: 'message', text: `${owner.profile.shortName} sees you reaching for the papers and closes them firmly.` };
          }
        }
        const doc = this.content.docs[act.doc];
        this.applyEffects(doc?.effects);
        this.bus.emit('doc:read', { id: act.doc });
        return { type: 'read', title: doc.title, body: doc.body };
      }
      case 'noticeboard':
        return this.readNoticeboard();
      case 'sleep':
        return { type: 'sleep' };
      case 'sit':
        this.player.energy = Math.min(100, this.player.energy + 3);
        return { type: 'message', text: 'You sit for a moment and watch Lanternside go by. (+3 energy)' };
      case 'forage': {
        const st = this.world.props[prop.id] || {};
        if (st.day === this.clock.day) return { type: 'message', text: 'You\'ve already picked what\'s blooming today.' };
        this.world.props[prop.id] = { ...st, day: this.clock.day };
        this.inventory.add(act.item, 1);
        return { type: 'message', text: 'You pick a small bunch of wildflowers.' };
      }
      case 'stockcheck': {
        const stock = this.world.shops[act.shop]?.stock || {};
        const lines = Object.entries(stock).map(([id, n]) => `${this.content.items[id]?.name}: ${n > 0 ? n : 'sold out'}`);
        return { type: 'message', text: `In the display case — ${lines.join(', ')}.` };
      }
      case 'obstacle':
        return this.useObstacle(prop);
      case 'useItem': {
        if (act.doneFlag && this.getFlag(act.doneFlag)) return { type: 'message', text: act.doneText || prop.examine };
        if (this.inventory.count(act.item) > 0) {
          this.applyEffects(act.effects);
          return { type: 'message', text: act.text };
        }
        if (prop.onExamine) this.applyEffects(prop.onExamine);
        return { type: 'message', text: act.missingText || prop.examine };
      }
      default:
        return { type: 'message', text: prop.examine || 'Nothing happens.' };
    }
  }

  readNoticeboard() {
    const posts = [];
    for (const n of this.content.notices || []) {
      if (n.if && !check(n.if, this)) continue;
      posts.push(n.text);
      if (n.learn) this.knowledge.learn(this.player, n.learn, { kind: 'fact', source: 'notice', at: this.clock.total });
    }
    return { type: 'read', title: 'Civic Square Notice Board', body: posts };
  }

  useObstacle(prop) {
    const act = prop.interact;
    const st = this.world.props[prop.id] || {};
    if (st.open) {
      const enter = act.enter;
      if (enter.trespass && !this.getFlag(`${enter.trespass}_permission`)) {
        this.reportCrime({ fact: `fact_player_trespassed_${enter.trespass}`, map: this.player.map, x: this.player.x, y: this.player.y });
      }
      this.changeMap(enter.map, enter.spot);
      return { type: 'none' };
    }
    if (act.requires?.item && this.inventory.count(act.requires.item) > 0) {
      this.world.props[prop.id] = { ...st, open: true };
      this.bus.emit('sfx', { id: 'sfx_pry' });
      if (act.noise) {
        this.reportCrime({ fact: 'fact_player_trespassed_lighthouse', map: this.player.map, x: this.player.x, y: this.player.y, radius: act.noise.radius });
      }
      this.bus.emit('prop:opened', { id: prop.id });
      return { type: 'message', text: `${act.verb || 'Open'}: with a shriek of rust, the hatch gives way. ${act.openedText}` };
    }
    return { type: 'message', text: act.closedText };
  }

  // ------------------------------------------------------------ containers
  /** A container's definition: from content, or a chest you placed in a works (v0.37.0). */
  containerDef(id) {
    const def = this.content.containers[id];
    if (def) return def;
    if (!/^ct_fx_/.test(id) || !this.world.containers[id]) return null;
    for (const sys of [this.factory, this.arms]) {
      const e = sys?.findEntity(id.slice(3));
      if (e) return { name: `${this.content.items[e.item].name} (${e.cap} items)`, owner: 'player', items: {}, money: 0 };
    }
    return null;
  }

  containerView(id) {
    const def = this.containerDef(id);
    const st = this.world.containers[id];
    return {
      id,
      name: def.name,
      owner: def.owner,
      ownerName: this.npcs.get(def.owner)?.profile.shortName || this.content.factions[def.owner]?.name || (def.owner === 'player' ? 'you' : def.owner),
      items: Object.entries(st.items).filter(([, n]) => n > 0).map(([itemId, count]) => ({ id: itemId, count, def: this.content.items[itemId] })),
      money: st.money,
    };
  }

  /**
   * Take an item (or 'money') from a container. Ownership and witnesses decide
   * whether this is allowed, theft, or blocked.
   * @returns {{ok:boolean, text:string, stolen?:boolean}}
   */
  takeFromContainer(id, itemId, count = 1) {
    const def = this.containerDef(id);
    const st = this.world.containers[id];
    if (!def || !st) return { ok: false, text: 'Nothing there.' };
    const isMoney = itemId === 'money';
    if (isMoney ? st.money <= 0 : !(st.items[itemId] > 0)) return { ok: false, text: 'Nothing there.' };
    let stolen = false;
    const permitted = def.owner === 'player' || def.owner == null || // unowned (abandoned) containers are fair game
       (itemId === 'item_lighthouse_key' && this.getFlag('lighthouse_permission'));
    if (!permitted) {
      const seen = this.witnesses(this.player.map, this.player.x, this.player.y, 8);
      const owner = seen.find((n) => n.id === def.owner);
      if (owner) {
        this.bark(owner, 'Hands OFF. That is not yours.');
        this.relationships.adjust(owner, 'player', { trust: -6, suspicion: 12 }, 'caught_theft');
        remember(owner, { text: 'Caught the newcomer rummaging in my things.', tag: 'caught_theft', about: 'player', importance: 7 }, this.clock.total);
        this.bus.emit('sfx', { id: 'sfx_fail' });
        return { ok: false, text: `${owner.profile.shortName} catches you reaching in. You pull your hand back.` };
      }
      stolen = true;
      if (seen.length && def.theftFact) this.reportCrime({ fact: def.theftFact, map: this.player.map, x: this.player.x, y: this.player.y, radius: 8 });
    }
    if (isMoney) {
      const amount = st.money;
      st.money = 0;
      this.player.money += amount;
      this.bus.emit('money:changed', { delta: amount, total: this.player.money });
      return { ok: true, stolen, text: `You take ${amount} obols${stolen ? ' that aren\'t yours' : ''}.` };
    }
    const n = Math.max(1, Math.min(count, st.items[itemId]));
    st.items[itemId] -= n;
    this.inventory.add(itemId, n, { stolenFrom: stolen ? def.owner : null });
    return { ok: true, stolen, text: `Taken: ${this.content.items[itemId].name}${n > 1 ? ` ×${n}` : ''}${stolen ? ' (not yours)' : ''}.` };
  }

  putInContainer(id, itemId, count = 1) {
    const def = this.containerDef(id);
    const st = this.world.containers[id];
    if (!def || !st || !this.inventory.count(itemId)) return { ok: false, text: 'You can\'t put that there.' };
    if (def.owner !== 'player' && !this.player.stolen[itemId]) return { ok: false, text: 'That isn\'t your storage.' };
    const wasStolenFrom = this.player.stolen[itemId];
    const n = Math.max(1, Math.min(count, this.inventory.count(itemId)));
    this.inventory.remove(itemId, n);
    st.items[itemId] = (st.items[itemId] || 0) + n;
    if (wasStolenFrom === def.owner && itemId === 'item_lighthouse_key') this.setFlag('key_returned', true);
    this.bus.emit('container:changed', { id });
    return { ok: true, text: `${def.owner === 'player' ? 'Stored' : 'Put back'}: ${this.content.items[itemId].name}${n > 1 ? ` ×${n}` : ''}.` };
  }

  // ----------------------------------------------------------------- shops
  priceFor(shopId, itemId, selling = false) {
    const shop = this.content.shops[shopId];
    const owner = this.npcs.get(shop.owner);
    if (selling) {
      // Lucas buys arms-works output wholesale (src/systems/arms.js)
      if (shop.armsBuyer && this.content.items[itemId]?.arms && this.arms.licensed()) return this.arms.wholesale(itemId);
      return shop.buys?.[itemId] ?? 0;
    }
    const base = shop.prices?.[itemId] ?? this.content.items[itemId]?.price ?? 0;
    const disp = owner ? this.relationships.disposition(owner, 'player') : 0;
    const rep = this.player.reputation[owner?.profile.faction] || 0;
    const discount = clamp(disp / 250 + rep / 400, -0.25, 0.2);
    return Math.max(1, Math.round(base * (1 - discount)));
  }

  buy(shopId, itemId) {
    const st = this.world.shops[shopId];
    if (!st || !(st.stock[itemId] > 0)) return { ok: false, text: 'Sold out.' };
    const price = this.priceFor(shopId, itemId);
    if (this.player.money < price) return { ok: false, text: 'You can\'t afford that.' };
    this.player.money -= price;
    st.stock[itemId]--;
    this.inventory.add(itemId, this.content.items[itemId].bundle || 1);
    this.bus.emit('money:changed', { delta: -price, total: this.player.money });
    this.bus.emit('shop:stock', { shopId, item: itemId, stock: st.stock[itemId], by: 'player' });
    return { ok: true, text: `Bought ${this.content.items[itemId].name} for ${price} obols.` };
  }

  sell(shopId, itemId) {
    const price = this.priceFor(shopId, itemId, true);
    if (!price || !this.inventory.count(itemId)) return { ok: false, text: 'They won\'t buy that.' };
    const owner = this.content.shops[shopId].owner;
    if (this.player.stolen[itemId] === owner) return { ok: false, text: 'Selling someone their own things back is a bold move. Too bold.' };
    let toArms = false;
    if (this.content.shops[shopId].armsBuyer && this.content.items[itemId]?.arms && this.arms.licensed()) {
      const r = this.arms.sellToLucas(itemId, price);
      if (!r.ok) return r;
      toArms = true; // v0.60.0: the arms company's wholesale sale
    }
    this.inventory.remove(itemId, 1);
    if (toArms) this.corp.receive('arms', price, { cat: 'wholesale' });
    else {
      this.player.money += price;
      this.bus.emit('money:changed', { delta: price, total: this.player.money });
    }
    return { ok: true, text: `Sold ${this.content.items[itemId].name} for ${price} obols.` };
  }

  restockShop(shopId) {
    const def = this.content.shops[shopId];
    const st = this.world.shops[shopId];
    if (!def || !st) return;
    for (const [item, base] of Object.entries(def.stock)) {
      if (def.restock === false) continue;
      st.stock[item] = Math.max(st.stock[item] || 0, base);
    }
    this.bus.emit('shop:restocked', { shopId });
  }

  // ------------------------------------------------------- the Ledger wager
  startLedger() {
    if (this.player.money < LEDGER_STAKE) return { ok: false, text: `The stake is ${LEDGER_STAKE} obols.` };
    this.player.money -= LEDGER_STAKE;
    this.bus.emit('money:changed', { delta: -LEDGER_STAKE, total: this.player.money });
    this.setFlag('ledger_played', '$day');
    const mb = this.npcs.get('npc_moneybucks');
    this.ledger = newLedgerMatch(this.rng, { wits: this.player.stats.wits, bluffiness: mb?.profile.personality.competitiveness * 0.45 || 0.4 });
    return { ok: true, match: this.ledger };
  }

  playLedger(card) {
    if (!this.ledger) return null;
    return playLedgerRound(this.ledger, card, this.rng);
  }

  finishLedger() {
    const m = this.ledger;
    this.ledger = null;
    const mb = this.npcs.get('npc_moneybucks');
    if (!m?.finished || !mb) return null;
    const won = ledgerWinner(m) === 'player';
    if (won) {
      this.player.money += LEDGER_STAKE * 2;
      this.bus.emit('money:changed', { delta: LEDGER_STAKE * 2, total: this.player.money });
      this.setFlag('ledger_won', true);
      this.knowledge.learn(mb, 'fact_player_won_ledger', { kind: 'fact', source: 'witnessed', at: this.clock.total });
      this.relationships.adjust(mb, 'player', { respect: 8 }, 'ledger_won');
      remember(mb, { text: `${this.player.name} beat me at the Ledger. Luck. Surely luck.`, tag: 'ledger_lost', about: 'player', importance: 6 }, this.clock.total);
      this.bark(mb, 'Luck. Pure luck. Again tomorrow, my good fellow.');
    } else {
      this.relationships.adjust(mb, 'player', { respect: 1 }, 'ledger_lost');
      remember(mb, { text: `Took ${this.player.name}'s money at the Ledger. As is proper.`, tag: 'ledger_won', about: 'player', importance: 3 }, this.clock.total);
      this.bark(mb, 'Ties, losses and stakes go to the house. Thank you for your custom.');
    }
    return { won, playerPoints: m.playerPoints, housePoints: m.housePoints };
  }

  // ------------------------------------------------------------- time skip
  /** Advance the world by `minutes`, simulating every NPC abstractly. */
  skipTime(minutes) {
    this.skipping = true;
    for (const npc of this.npcs.values()) {
      npc.path = null;
      npc.inDialogue = false;
      if (!npc.arrived) this.npcSystem.plan(npc);
    }
    for (let i = 0; i < minutes; i++) {
      this.clock.total += 1;
      this.minuteTick();
    }
    this.skipping = false;
    this.npcSystem.onPlayerMapChanged();
    this.bus.emit('time:skipped', { minutes });
  }

  sleep() {
    const m = this.clock.minuteOfDay;
    const night = m >= 20 * 60 || m < 5 * 60;
    const minutes = night ? this.clock.minutesUntil('07:00') : 120;
    this.skipTime(Math.round(minutes));
    const p = this.player;
    p.energy = night ? 100 : Math.min(100, p.energy + 30);
    p.health = Math.min(100, p.health + (night ? 30 : 10));
    this.bus.emit('sfx', { id: 'sfx_sleep' });
    return night
      ? `You sleep soundly. It is ${this.clock.weekday} morning, ${this.clock.timeString}.`
      : `You nap for two hours. It is now ${this.clock.timeString}.`;
  }

  // ------------------------------------------------------------- save/load
  serialize() {
    const npcs = {};
    for (const [id, n] of this.npcs) {
      npcs[id] = {
        map: n.map, x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10, facing: n.facing,
        activity: n.activity, mood: n.mood, met: n.met, relationships: n.relationships, knowledge: n.knowledge,
        memory: n.memory, topicsUsed: n.topicsUsed, recentLines: n.recentLines, gifts: n.gifts,
        chatCooldownUntil: n.chatCooldownUntil, hooksRun: n.hooksRun, impulseCooldowns: n.impulseCooldowns || {},
        patrolBlock: n.patrolBlock, patrolIdx: n.patrolIdx, // v0.32.0: where on their beat
        trip: n.trip || undefined, riding: n.riding ?? undefined, // v0.33.0: a bus journey under way
        health: n.health, dead: n.dead || undefined, downUntil: n.downUntil || undefined, diedAt: n.diedAt,
        intent: n.intent && n.intent.source === 'errand' ? { activity: n.intent.activity, spot: n.intent.spot, source: 'errand', until: n.intent.until, fromBlock: n.intent.fromBlock } : null,
      };
    }
    const { vx, vy, moving, animTime, stepAcc, sprintAcc, lastTx, lastTy, areaName, aim, attackAnim, hurtAt, ...player } = this.player;
    return deepClone({
      clock: this.clock.serialize(),
      rng: this.rng.serialize(),
      player,
      npcs,
      world: this.world,
      quests: this.questState,
      gameVersion: GAME_VERSION,
    });
  }

  /** Load a validated, migrated state object (see src/save/). */
  loadState(state) {
    this.clock = WorldClock.from(state.clock);
    this.rng = Rng.from(state.rng);
    this.player = { vx: 0, vy: 0, ...deepClone(state.player) };
    this.player.reputation = { ...DEFAULT_REPUTATION, ...(this.player.reputation || {}) };
    const fresh = this.freshWorld();
    this.world = { ...fresh, ...deepClone(state.world) };
    this.world.events = { ...fresh.events, ...(this.world.events || {}) };
    // Containers/shops added in newer content versions get defaults.
    this.world.containers = { ...fresh.containers, ...(this.world.containers || {}) };
    this.world.shops = { ...fresh.shops, ...(this.world.shops || {}) };
    this.world.oil = { ...fresh.oil, ...(this.world.oil || {}) };
    this.world.construction = { ...fresh.construction, ...(this.world.construction || {}) };
    this.world.properties = { ...fresh.properties, ...(this.world.properties || {}) };
    this.world.police = { ...fresh.police, ...(this.world.police || {}) };
    // police chases don't survive a save (v0.18.0)
    if (this.world.vehicles?.cars) for (const [id, c] of Object.entries(this.world.vehicles.cars)) if (c.chase) delete this.world.vehicles.cars[id];
    this.world.gang = { ...fresh.gang, ...(this.world.gang || {}) };
    this.world.gang.customers = { ...fresh.gang.customers, ...(this.world.gang.customers || {}) };
    this.world.factory = { ...fresh.factory, ...(this.world.factory || {}) };
    this.world.factory.warehouses = { ...fresh.factory.warehouses, ...(this.world.factory.warehouses || {}) };
    this.world.arms = { ...fresh.arms, ...(this.world.arms || {}) };
    this.world.arms.warehouses = { ...fresh.arms.warehouses, ...(this.world.arms.warehouses || {}) };
    this.world.arms.research = { ...fresh.arms.research, ...(this.world.arms.research || {}) };
    this.world.market = this.world.market ? { ...fresh.market, ...this.world.market, countries: { ...fresh.market.countries, ...this.world.market.countries } } : fresh.market;
    if (olderThan(state.gameVersion, '0.20.0')) {
      state = { ...state, npcs: deepClone(state.npcs || {}) };
      this.widenSave(state);
    }
    if (olderThan(state.gameVersion, '0.47.0')) {
      state = { ...state, npcs: deepClone(state.npcs || {}) };
      this.growSave(state);
    }
    this.rebuildMaps();
    this.questState = deepClone(state.quests || {});
    this.npcs = new Map();
    for (const profile of Object.values(this.content.characters)) {
      const npc = this.createNpc(profile);
      const saved = state.npcs?.[profile.id];
      if (saved && this.maps.has(saved.map)) {
        Object.assign(npc, deepClone(saved));
        npc.relationships = { ...deepClone(profile.relationships || {}), ...(saved.relationships || {}) };
        npc.memory = saved.memory || emptyMemory();
      }
      npc.profile = profile;
      npc.arrived = false;
      npc.path = null;
      this.npcs.set(profile.id, npc);
    }
    if (!this.maps.has(this.player.map)) {
      this.warn(`Saved map ${this.player.map} no longer exists; moving player home.`);
      const s = this.maps.get(this.content.startingMap).spotPx(this.content.startingSpot);
      Object.assign(this.player, { map: this.content.startingMap, x: s.x, y: s.y });
    }
    for (const npc of this.npcs.values()) {
      if (npc.intent?.source === 'errand' && this.clock.total < npc.intent.until) {
        this.npcSystem.plan(npc);
      } else {
        npc.intent = null;
        this.npcSystem.think(npc, true);
      }
    }
    this.arms.spawnStaff();
    this.dairy.afterLoad();
    this.farm.sync();
    this.casino.afterLoad(); // v0.52.0: nobody is still at a table after a load
    this.aero.afterLoad(); // v0.55.0
    this.corp.afterLoad(); // v0.60.0: identity for each business owned; the other countries' companies, made once
    this.updateDiscovery();
    return this;
  }

  /**
   * v0.20.0 widened the roads, so everything outdoors moved along: shift what a
   * save from before then put on those maps (you, the residents, the cars), and
   * start the buses afresh on the new route.
   */
  widenSave(state) {
    const S = this.content.roadShifts || {};
    const move = (o) => {
      const s = o && S[o.map];
      if (!s || typeof o.x !== 'number') return;
      o.x = s.fx(o.x / TILE) * TILE;
      o.y = s.fy(o.y / TILE) * TILE;
    };
    move(this.player);
    for (const n of Object.values(state.npcs || {})) move(n);
    for (const c of Object.values(this.world.vehicles?.cars || {})) move(c);
    delete this.world.transit;
    this.player.riding = null;
  }

  /**
   * v0.47.0 grew the towns so every building holds its room: move what a save from before then
   * put on the streets (you, the residents, the cars, a forced door) to the same place in the
   * grown street, and start the buses afresh.
   */
  growSave(state) {
    const S = this.content.growShifts || {};
    const move = (o) => {
      const s = o && S[o.map];
      if (!s || typeof o.x !== 'number') return;
      o.x = s.fx(o.x / TILE) * TILE;
      o.y = s.fy(o.y / TILE) * TILE;
    };
    move(this.player);
    for (const n of Object.values(state.npcs || {})) move(n);
    for (const c of Object.values(this.world.vehicles?.cars || {})) move(c);
    for (const o of Object.values(this.world.homes?.open || {})) move(o);
    delete this.world.transit;
    this.player.riding = null;
  }

  /**
   * Recreate runtime maps from content, then add finished property buildings.
   * Called on new game, on load and when a property completes.
   */
  rebuildMaps() {
    this.maps = new Map(Object.values(this.content.maps).map((d) => [d.id, new GameMap(d, this.content.propTypes)]));
    if (this.world?.properties) for (const { map, building } of this.properties.builtBuildings()) this.maps.get(map)?.addBuilding(building);
    this.bus.emit('maps:rebuilt', {});
  }

  /** Mason's pun of the day: the same all day, different tomorrow. */
  dailyPun() {
    const puns = this.content.puns || [];
    if (!puns.length) return { setup: '', punchline: '' };
    return puns[(this.clock.day * 7 + 3) % puns.length];
  }

  /** Short metadata for save slot listings. */
  saveMeta() {
    return {
      playerName: this.player.name,
      day: this.clock.day,
      weekday: this.clock.weekday,
      time: this.clock.timeString,
      location: this.player.areaName || this.currentMap().name,
    };
  }

  /** Map markers for active quest stages (tile coordinates). */
  questMarkers() {
    const out = [];
    for (const [id, st] of Object.entries(this.questState)) {
      if (st.state !== 'active') continue;
      const ref = this.content.quests[id]?.stages[st.stage]?.marker;
      if (!ref) continue;
      const { map, spot } = parseSpotRef(ref);
      const s = this.maps.get(map)?.spot(spot);
      if (s) out.push({ questId: id, map, x: s.x + 0.5, y: s.y + 0.5 });
    }
    out.push(...this.dairy.markers());
    return out;
  }

  // ---------------------------------------------------------------- debug
  /** Snap every NPC to where their schedule says they should be right now. */
  settleNpcs() {
    for (const npc of this.npcs.values()) this.npcSystem.settle(npc);
  }

  /** Snapshot used by the debug overlay and tests. */
  npcSummary() {
    return [...this.npcs.values()].map((n) => ({
      id: n.id,
      map: n.map,
      tile: [Math.floor(n.x / TILE), Math.floor(n.y / TILE)],
      activity: n.activity,
      intent: n.intent?.source,
      mood: this.moodOf(n),
      travelling: Boolean(n.travel || (n.path && n.path.length)),
      chat: n.chat?.with || null,
    }));
  }
}

export function defaultPlayerAppearance() {
  return { skin: '#d9a77c', hair: '#2f2a35', hairStyle: 'short', outfit: '#3f7f8f', accent: '#f2c14e', accessory: 'scarf', build: 'average', height: 1 };
}

export { MINUTES_PER_DAY };
