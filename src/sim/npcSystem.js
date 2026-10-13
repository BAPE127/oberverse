// NPC simulation with two tiers:
//  - physical: NPCs on the player's current map walk A* paths every frame,
//    show speech bubbles and can witness the player.
//  - abstract: NPCs elsewhere advance once per game minute using travel-time
//    estimates and door-to-door hops. They still chat and spread information
//    with others on the same map.
// Both tiers share the same decision logic (npcBrain.js) and clock.
import { TILE, parseSpotRef, dist } from '../core/util.js';
import { findPath, routeBetweenMaps } from '../world/pathfinding.js';
import { decide, scheduleLead } from './npcBrain.js';
import { blockAt, blockInstanceKey } from './schedule.js';
import { remember } from './memory.js';

const incapacitated = (npc, now) => npc.dead || (npc.downUntil && now < npc.downUntil);

export const WALK_SPEED = 66; // px per real second
const TILES_PER_GAME_MINUTE = WALK_SPEED / TILE; // at clock rate 1
const CHAT_RANGE_TILES = 5;

/** Intents set by other systems (police dispatch, deal meetings, gang hunts) that the schedule must not override. */
const HELD_INTENTS = ['dispatch', 'deal', 'hunt', 'staff'];

export class NpcSystem {
  constructor(game) {
    this.game = game;
  }

  actorFor(npc) {
    return {
      kind: 'npc',
      id: npc.id,
      canPass: (door) => this.game.npcCanPass(npc, door),
    };
  }

  isPhysical(npc) {
    return npc.map === this.game.player.map;
  }

  // ---------------------------------------------------------------- planning
  /** Choose what the NPC wants to do; replan movement if the target changed. */
  think(npc, force = false) {
    const g = this.game;
    const now = g.clock.total;
    if (npc.hostile || npc.pursuit || incapacitated(npc, now)) return; // combat / police own them
    if (HELD_INTENTS.includes(npc.intent?.source) && now < npc.intent.until) return; // answering a call, meeting you for a deal, hunting you
    if (npc.chat && now < npc.chat.until) return;
    if (!force && npc.intent && now < npc.intent.until) {
      // Committed — unless the schedule moved on to a new block.
      const block = blockAt(npc.profile.schedule, g.clock.minuteOfDay + scheduleLead(npc.profile));
      const committedIndex = npc.intent.source === 'schedule' ? npc.intent.block?.index : npc.intent.fromBlock;
      if (!block || block.index === committedIndex) return;
    }
    const intent = decide(npc, g);
    intent.fromBlock = blockAt(npc.profile.schedule, g.clock.minuteOfDay + scheduleLead(npc.profile))?.index;
    if (intent.impulse) {
      npc.impulseCooldowns = npc.impulseCooldowns || {};
      npc.impulseCooldowns[intent.impulse.id] = now + intent.duration + (intent.impulse.cooldown ?? 180);
    }
    const changed = !npc.intent || intent.spot !== npc.intent.spot || intent.activity !== npc.intent.activity;
    npc.intent = intent;
    if (changed || force) {
      if (npc.activity !== intent.activity) g.bus.emit('npc:activity', { npcId: npc.id, from: npc.activity, to: intent.activity });
      npc.activity = intent.activity;
      npc.arrived = false;
      this.plan(npc);
    }
  }

  plan(npc) {
    const g = this.game;
    npc.path = null;
    npc.travel = null;
    if (!npc.intent?.spot) {
      npc.arrived = true;
      return;
    }
    const target = parseSpotRef(npc.intent.spot);
    const actor = this.actorFor(npc);
    const route = routeBetweenMaps(g.maps, npc.map, target.map, actor);
    if (!route) {
      npc.stuck = (npc.stuck || 0) + 1;
      return;
    }
    if (route.length && route[0].door.seamless) route[0] = { ...route[0], door: this.nearestSeam(npc, route[0].door.to.map, target) };
    if (this.isPhysical(npc)) {
      const map = g.maps.get(npc.map);
      const goal = route.length ? { x: route[0].door.x, y: route[0].door.y } : map.spot(target.spot);
      if (!goal) return;
      const tx = Math.floor(npc.x / TILE);
      const ty = Math.floor(npc.y / TILE);
      const path = findPath(map, tx, ty, goal.x, goal.y, actor);
      if (path === null) {
        // Unreachable from here: fall back to the abstract tier for this hop.
        this.startAbstractTravel(npc, route, target);
        return;
      }
      npc.path = path.map((t) => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE }));
      npc.pendingRoute = route;
      npc.pendingTarget = target;
      if (!npc.path.length) this.onPathEnd(npc);
    } else {
      this.startAbstractTravel(npc, route, target);
    }
  }

  /** Choose the seam crossing that best lines up with where the NPC is and where it is going. */
  nearestSeam(npc, toMap, target) {
    const g = this.game;
    const map = g.maps.get(npc.map);
    const tx = npc.x / TILE;
    const ty = npc.y / TILE;
    const goal = target.map === toMap ? g.maps.get(toMap)?.spot(target.spot) : null;
    const off = g.mapOffset(npc.map, toMap);
    let best = null;
    let bestCost = Infinity;
    for (const d of map.doors) {
      if (!d.seamless || d.to.map !== toMap) continue;
      let cost = Math.abs(d.x - tx) + Math.abs(d.y - ty);
      if (goal && off) cost += Math.abs(d.x - off.x / TILE - goal.x) + Math.abs(d.y - off.y / TILE - goal.y);
      if (cost < bestCost) {
        bestCost = cost;
        best = d;
      }
    }
    return best;
  }

  startAbstractTravel(npc, route, target) {
    const g = this.game;
    const map = g.maps.get(npc.map);
    const first = route.length ? route[0].door : map?.spot(target.spot);
    const fromT = { x: npc.x / TILE, y: npc.y / TILE };
    const est = first ? (Math.abs(first.x - fromT.x) + Math.abs(first.y - fromT.y)) * 1.15 : 0;
    npc.travel = {
      route: route.map((r) => ({ map: r.map, doorId: r.door.id })),
      target: `${target.map}:${target.spot}`,
      eta: g.clock.total + Math.max(1, est / TILES_PER_GAME_MINUTE),
    };
  }

  // --------------------------------------------------------------- movement
  /** Physical update for NPCs on the player's map. dt in real seconds. */
  updatePhysical(npc, dt) {
    const g = this.game;
    npc.moving = false;
    if (npc.chat && g.clock.total < npc.chat.until) return;
    if (!npc.path || !npc.path.length) return;
    const wp = npc.path[0];
    const dx = wp.x - npc.x;
    const dy = wp.y - npc.y;
    const d = Math.hypot(dx, dy);
    const speed = WALK_SPEED * (npc.profile.walkSpeed ?? 1) * (g.clock.rate || 1) ** 0.5;
    const step = speed * dt;
    if (d <= step) {
      npc.x = wp.x;
      npc.y = wp.y;
      npc.path.shift();
      if (!npc.path.length) this.onPathEnd(npc);
    } else {
      npc.x += (dx / d) * step;
      npc.y += (dy / d) * step;
      npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      npc.moving = true;
      npc.animTime = (npc.animTime || 0) + dt;
    }
  }

  onPathEnd(npc) {
    const route = npc.pendingRoute || [];
    if (route.length) {
      this.hop(npc, route[0].door);
      return;
    }
    this.arrive(npc);
  }

  /** Move an NPC through a door to the connected map. */
  hop(npc, door) {
    const g = this.game;
    const from = npc.map;
    const dest = g.maps.get(door.to.map);
    const off = door.seamless ? g.mapOffset(from, door.to.map) : null;
    // Seamless edges: arrive on the matching tile across the seam, not at a spot.
    const spot = off ? { x: (door.x + 0.5) * TILE - off.x, y: (door.y + 0.5) * TILE - off.y } : dest?.spotPx(door.to.spot);
    if (!dest || !spot) return;
    npc.map = dest.id;
    npc.x = spot.x;
    npc.y = spot.y;
    npc.path = null;
    g.bus.emit('npc:moved', { npcId: npc.id, from, to: dest.id });
    this.plan(npc);
  }

  arrive(npc) {
    const g = this.game;
    npc.path = null;
    npc.pendingRoute = null;
    const target = npc.intent?.spot ? parseSpotRef(npc.intent.spot) : null;
    if (target && target.map === npc.map) {
      const s = g.maps.get(npc.map).spotPx(target.spot);
      if (s) {
        npc.x = s.x;
        npc.y = s.y;
        if (s.facing) npc.facing = s.facing;
      }
    }
    npc.arrived = true;
    npc.stuck = 0;
    const block = npc.intent?.block;
    if (block?.onArrive) {
      const key = blockInstanceKey(block, g.clock.total);
      npc.hooksRun = npc.hooksRun || {};
      if (npc.hooksRun[block.index] !== key) {
        npc.hooksRun[block.index] = key;
        g.applyEffects(block.onArrive, npc);
      }
    }
    g.bus.emit('npc:arrived', { npcId: npc.id, map: npc.map, activity: npc.activity });
  }

  /** Per game-minute update for NPCs off the player's map. */
  updateAbstract(npc) {
    const g = this.game;
    const t = npc.travel;
    if (!t || npc.hostile || incapacitated(npc, g.clock.total)) return;
    if (g.clock.total < t.eta) return;
    if (t.route.length) {
      const hop = t.route.shift();
      const map = g.maps.get(hop.map);
      const door = map?.doors.find((d) => d.id === hop.doorId);
      if (!door) {
        npc.travel = null;
        return;
      }
      this.hop(npc, door); // hop() replans: physical if the destination is the player's map
      return;
    }
    // Arrived at the final spot on this map.
    npc.travel = null;
    this.arrive(npc);
  }

  /**
   * Place an NPC directly at the spot its current intent points to (used after
   * clock jumps by debugging tools and tests). Arrival hooks are skipped.
   */
  settle(npc) {
    const g = this.game;
    this.think(npc, true);
    const ref = npc.intent?.spot;
    if (!ref) return;
    const target = parseSpotRef(ref);
    const pos = g.maps.get(target.map)?.spotPx(target.spot);
    if (!pos) return;
    npc.map = target.map;
    npc.x = pos.x;
    npc.y = pos.y;
    if (pos.facing) npc.facing = pos.facing;
    npc.path = null;
    npc.travel = null;
    npc.pendingRoute = null;
    npc.arrived = true;
  }

  /** When the player changes maps, re-tier everyone. */
  onPlayerMapChanged() {
    for (const npc of this.game.npcs.values()) {
      if (npc.arrived) continue;
      this.plan(npc);
    }
  }

  // ----------------------------------------------------------------- social
  /** Called once per game minute. Starts and resolves NPC-to-NPC conversations. */
  socialTick() {
    const g = this.game;
    const now = g.clock.total;
    const list = [...g.npcs.values()];
    for (const npc of list) {
      if (npc.chat && now >= npc.chat.until) this.endChat(npc);
    }
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!this.canChat(a, now)) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (a.map !== b.map || !this.canChat(b, now)) continue;
        if (dist(a.x, a.y, b.x, b.y) > CHAT_RANGE_TILES * TILE) continue;
        const pa = a.profile.personality || {};
        const pb = b.profile.personality || {};
        const affection = (g.relationships.get(a, b.id).affection + g.relationships.get(b, a.id).affection) / 2;
        let desire = ((pa.sociability ?? 0.5) + (pb.sociability ?? 0.5)) / 2 + affection / 200;
        if (a.activity === 'work') desire -= (pa.conscientiousness ?? 0.5) * 0.25;
        if (b.activity === 'work') desire -= (pb.conscientiousness ?? 0.5) * 0.25;
        if (g.rng.chance(Math.max(0, desire) * 0.12)) {
          this.startChat(a, b);
          break;
        }
      }
    }
  }

  canChat(npc, now) {
    if (npc.chat || npc.activity === 'sleep' || npc.travel || npc.hostile || incapacitated(npc, now)) return false;
    if (npc.path && npc.path.length) return false;
    if (npc.inDialogue) return false;
    return now >= (npc.chatCooldownUntil || 0);
  }

  startChat(a, b) {
    const g = this.game;
    const now = g.clock.total;
    const len = g.rng.int(4, 8);
    const ra = g.relationships.get(a, b.id);
    const rb = g.relationships.get(b, a.id);
    const tone = ra.affection + rb.affection < -20 ? 'argue' : 'chat';
    a.chat = { with: b.id, until: now + len, tone };
    b.chat = { with: a.id, until: now + len, tone };
    if (this.isPhysical(a)) {
      a.facing = faceToward(a, b);
      b.facing = faceToward(b, a);
    }
    g.bus.emit('npc:chat', { a: a.id, b: b.id, tone, map: a.map });
  }

  endChat(npc) {
    const g = this.game;
    const now = g.clock.total;
    const other = g.npcs.get(npc.chat.with);
    const tone = npc.chat.tone;
    npc.chat = null;
    npc.chatCooldownUntil = now + 45 + g.rng.int(0, 60);
    if (!other) return;
    const shared = g.knowledge.gossip(npc, other, g.rng, now);
    if (tone === 'argue') {
      g.relationships.adjust(npc, other.id, { affection: -2 }, 'argument');
      remember(npc, { text: `Argued with ${other.profile.shortName}.`, tag: `argued:${other.id}`, about: other.id, importance: 4 }, now);
    } else {
      g.relationships.adjust(npc, other.id, { affection: 1 }, 'chat');
      remember(npc, { text: `Chatted with ${other.profile.shortName}.`, tag: `chatted:${other.id}`, about: other.id, importance: 2 }, now);
    }
    if (shared) g.bus.emit('npc:gossip', { from: npc.id, to: other.id, factId: shared });
  }
}

export function faceToward(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}
