// Combat: melee weapons and guns, NPC health, injury, knock-outs and death,
// and how people react — victims and witnesses flee or fight back depending on
// personality (profile.combat overrides). Real-time parts run per frame on the
// player's map; consequences (memories, relationships, facts, reputation,
// quests) go through the same systems as everything else.
//
// State:
//   player.equipped      item id of the drawn weapon (null = fists)
//   player.mags          { weaponItemId: rounds loaded }
//   npc.health / npc.dead / npc.downUntil (game minute they wake) — saved
//   npc.hostile          { mode: 'fight' | 'flee', until } — runtime only
import { TILE, clamp, dist } from '../core/util.js';
import { remember } from '../sim/memory.js';
import { findPath } from '../world/pathfinding.js';

/** Bare hands: always available, never lethal. */
export const FISTS = { id: null, name: 'Fists', weapon: { kind: 'melee', damage: 8, range: 1.0, arc: 80, cooldown: 0.5, lethal: false, knockback: 14, sound: 'sfx_punch' } };

const HIT_RADIUS = 14; // px around an actor's body centre
const BODY_Y = 18; // body centre above the feet
const MOVE_FIGHT = 74; // px/s an angry NPC closes in
const MOVE_FLEE = 92; // px/s a frightened NPC runs
const HEALTH_BAR_SECONDS = 7;
const WALL = new Set(['B', 'W', 'x']);

export function npcMaxHealth(npc) {
  return npc.profile.combat?.maxHealth ?? 100;
}

/**
 * Imported characters are protected: they cannot be hurt, knocked out or
 * killed — unless their profile says `killable: true` (the project owner's call).
 * Attacking one calls down the Wrath (see Combat.smite).
 */
export function isProtected(npc) {
  return npc.profile.origin === 'imported' && !npc.profile.killable;
}

/** The Wrath cutscene timeline (real seconds). The renderer and music follow it. */
export const WRATH = { runes: 0.3, banner: 1.0, converge: 3.0, lightning: 3.4, strikes: [3.4, 3.62, 3.86, 4.25, 4.7], ascend: 5.0, fade: 6.6, end: 9.6 };

export function isDown(npc, now) {
  return Boolean(npc.dead || (npc.downUntil && now < npc.downUntil));
}

const HURT = ['Ow!', 'Argh!', 'Stop it!', 'What are you doing?!', 'Ugh!'];
const FLEE = ['Help! Help!', 'Somebody stop them!', 'Get away from me!', 'They\'re mad!', 'Run!'];
const FIGHT = ['Right, that\'s it!', 'You want a fight? You\'ve got one!', 'Big mistake.', 'Come on, then!'];
const GUNFIRE = ['Was that a gunshot?!', 'Get down!', 'Gun! GUN!'];

const faceTo = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
};

export class Combat {
  constructor(game) {
    this.game = game;
    this.cooldown = 0; // seconds until the player can attack again
    this.reloading = null; // { item, until }
    this.fx = []; // short-lived visual effects for the renderer (not saved)
    // v0.44.0, Streets of Rogue–style feel (none of it saved):
    this.bullets = []; // in flight: the player's are for show (hits resolve at once); NPCs' are real and can be dodged
    this.particles = []; // blood droplets and spent cases, flying
    this.decals = []; // ...and where they landed
    this.shake = { until: 0, mag: 0 };
    this.lastHostileAt = -1e9; // realTime of the last fight on this map
  }

  // ---------------------------------------------------------------- weapons
  weaponDef(itemId) {
    if (!itemId) return FISTS;
    const def = this.game.content.items[itemId];
    return def?.weapon ? { id: itemId, ...def } : FISTS;
  }

  equipped() {
    const p = this.game.player;
    if (p.equipped && !this.game.inventory.count(p.equipped)) p.equipped = null; // sold, dropped or taken
    return this.weaponDef(p.equipped);
  }

  /** Weapons the player owns, in a stable order (melee first). */
  owned() {
    const items = this.game.content.items;
    return Object.keys(this.game.player.inventory || {})
      .filter((id) => items[id]?.weapon && this.game.inventory.count(id) > 0)
      .sort((a, b) => (items[a].weapon.kind === items[b].weapon.kind ? items[a].price - items[b].price : items[a].weapon.kind === 'melee' ? -1 : 1));
  }

  equip(itemId) {
    const p = this.game.player;
    if (itemId && (!this.game.content.items[itemId]?.weapon || !this.game.inventory.count(itemId))) return { ok: false, text: 'You don\'t have that.' };
    p.equipped = itemId || null;
    this.reloading = null;
    p.mags = p.mags || {};
    const w = this.weaponDef(itemId).weapon;
    if (w.kind === 'gun' && p.mags[itemId] === undefined) p.mags[itemId] = 0;
    this.game.bus.emit('combat:equip', { item: p.equipped });
    return { ok: true, text: itemId ? `You ready the ${this.weaponDef(itemId).name.toLowerCase()}.` : 'You put your weapon away.' };
  }

  /** Cycle through fists and owned weapons. */
  cycle(dir = 1) {
    const list = [null, ...this.owned()];
    const i = list.indexOf(this.game.player.equipped ?? null);
    return this.equip(list[(i + dir + list.length) % list.length]);
  }

  /** Quick-select: 1 = fists, 2.. = owned weapons. */
  select(slot) {
    const list = [null, ...this.owned()];
    if (slot < 1 || slot > list.length) return { ok: false };
    return this.equip(list[slot - 1]);
  }

  ammoStatus() {
    const w = this.equipped();
    if (w.weapon.kind !== 'gun') return null;
    const p = this.game.player;
    return { loaded: p.mags?.[w.id] ?? 0, mag: w.weapon.mag, reserve: this.game.inventory.count(w.weapon.ammo), reloading: Boolean(this.reloading) };
  }

  reload() {
    const g = this.game;
    const w = this.equipped();
    if (w.weapon.kind !== 'gun' || this.reloading) return { ok: false };
    const p = g.player;
    const loaded = p.mags?.[w.id] ?? 0;
    const reserve = g.inventory.count(w.weapon.ammo);
    if (loaded >= w.weapon.mag) return { ok: false, text: 'Already loaded.' };
    if (!reserve) return { ok: false, text: `No ${g.content.items[w.weapon.ammo]?.name.toLowerCase() || 'ammunition'}.` };
    this.reloading = { item: w.id, until: g.realTime + w.weapon.reload };
    g.bus.emit('sfx', { id: 'sfx_reload' });
    return { ok: true, text: 'Reloading…' };
  }

  finishReload() {
    const g = this.game;
    const w = this.weaponDef(this.reloading.item);
    this.reloading = null;
    if (!w.id || g.player.equipped !== w.id) return;
    const p = g.player;
    p.mags = p.mags || {};
    const need = w.weapon.mag - (p.mags[w.id] ?? 0);
    const take = Math.min(need, g.inventory.count(w.weapon.ammo));
    if (take <= 0) return;
    g.inventory.remove(w.weapon.ammo, take);
    p.mags[w.id] = (p.mags[w.id] ?? 0) + take;
  }

  // ------------------------------------------------------------- attacking
  /** Unit aim vector: the UI's mouse aim if set, else facing with gentle auto-aim. */
  aimVector(w) {
    const p = this.game.player;
    if (p.aim && Math.hypot(p.aim.x, p.aim.y) > 0.01) {
      const d = Math.hypot(p.aim.x, p.aim.y);
      return { x: p.aim.x / d, y: p.aim.y / d };
    }
    const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 1];
    // auto-aim: the nearest standing person within reach and a forgiving cone
    const reach = (w.weapon.kind === 'gun' ? w.weapon.range : w.weapon.range + 0.6) * TILE;
    let best = null;
    let bestD = Infinity;
    for (const npc of this.targets()) {
      const dx = npc.x - p.x;
      const dy = npc.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > reach || d < 1) continue;
      const cos = (dx * f[0] + dy * f[1]) / d;
      if (cos < Math.cos((40 * Math.PI) / 180)) continue;
      if (d < bestD) { best = { x: dx / d, y: dy / d }; bestD = d; }
    }
    return best || { x: f[0], y: f[1] };
  }

  /** Living, conscious NPCs on the player's map. */
  targets() {
    const g = this.game;
    const now = g.clock.total;
    return [...g.npcs.values()].filter((n) => n.map === g.player.map && !isDown(n, now) && !n.inDialogue);
  }

  /** Player attack with the equipped weapon. Returns what happened (for tests/UI). */
  attack() {
    const g = this.game;
    if (this.cooldown > 0 || this.reloading || g.paused || this.wrath) return { ok: false, reason: 'busy' };
    if (g.player.driving || (g.player.riding !== null && g.player.riding !== undefined)) return { ok: false, reason: 'driving' };
    const w = this.equipped();
    const p = g.player;
    const dir = this.aimVector(w);
    p.facing = Math.abs(dir.x) > Math.abs(dir.y) ? (dir.x > 0 ? 'right' : 'left') : dir.y > 0 ? 'down' : 'up';
    p.attackAnim = { at: g.realTime, kind: w.weapon.kind, dir };
    if (w.weapon.kind === 'gun') return this.fire(w, dir);
    return this.swing(w, dir);
  }

  swing(w, dir) {
    const g = this.game;
    const p = g.player;
    const wp = w.weapon;
    this.cooldown = wp.cooldown;
    g.bus.emit('sfx', { id: 'sfx_swing' });
    const reach = wp.range * TILE + HIT_RADIUS;
    const half = ((wp.arc ?? 90) / 2) * (Math.PI / 180);
    // Raising a hand against a protected character is enough — even across a desk.
    const sacred = this.raisedAgainst(dir, Math.max(reach, 2.6 * TILE), Math.max(half, (50 * Math.PI) / 180));
    if (sacred) {
      this.fx.push({ type: 'swing', x: p.x, y: p.y - BODY_Y, dir, range: wp.range * TILE, arc: half, until: g.realTime + 0.18, start: g.realTime });
      this.smite(sacred, w);
      return { ok: true, kind: 'melee', hits: [sacred.id], wrath: true };
    }
    const hits = [];
    for (const npc of this.targets()) {
      const dx = npc.x - p.x;
      const dy = npc.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > reach) continue;
      const ang = d < 1 ? 0 : Math.acos(clamp((dx * dir.x + dy * dir.y) / d, -1, 1));
      if (ang > half) continue;
      hits.push(npc);
    }
    this.fx.push({ type: 'swing', x: p.x, y: p.y - BODY_Y, dir, range: wp.range * TILE, arc: half, until: g.realTime + 0.18, start: g.realTime });
    for (const npc of hits) this.hitNpc(npc, wp.damage, { weapon: w, dir, lethal: wp.lethal });
    if (hits.length) { g.bus.emit('sfx', { id: wp.sound || 'sfx_punch' }); this.kick(3, 0.12); }
    // v0.44.0: you step into the swing
    const map = g.currentMap();
    if (!map.rectBlocked(p.x + dir.x * 4 - 7, p.y + dir.y * 4 - 6, 14, 6, g.playerActor?.())) { p.x += dir.x * 4; p.y += dir.y * 4; }
    return { ok: true, kind: 'melee', hits: hits.map((n) => n.id) };
  }

  fire(w, dir) {
    const g = this.game;
    const p = g.player;
    const wp = w.weapon;
    p.mags = p.mags || {};
    if ((p.mags[w.id] ?? 0) <= 0) {
      this.cooldown = 0.25;
      g.bus.emit('sfx', { id: 'sfx_dryfire' });
      const r = this.reload();
      return { ok: false, reason: 'empty', text: r.ok ? 'Reloading…' : r.text || 'Click. Empty.' };
    }
    p.mags[w.id] -= 1;
    this.cooldown = wp.cooldown;
    g.bus.emit('sfx', { id: wp.sound || 'sfx_gunshot' });
    const ox = p.x + dir.x * 12;
    const oy = p.y - BODY_Y + dir.y * 8;
    if (wp.projectile && g.heavy) {
      // an RPG: the rocket flies, and explodes on whatever it meets (src/systems/heavy.js)
      g.heavy.launchRocket(ox, oy, dir, wp);
      this.fx.push({ type: 'flash', x: ox + dir.x * 8, y: oy + dir.y * 8, until: g.realTime + 0.12, start: g.realTime });
      if ((p.mags[w.id] ?? 0) <= 0 && g.inventory.count(wp.ammo)) this.reload();
      return { ok: true, kind: 'gun', projectile: true, hits: [] };
    }
    const hits = [];
    const pellets = wp.fan ? wp.fan.length : wp.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      // v0.45.0: a fan fires at fixed angles (the Pythagorean); everything else scatters
      const spread = ((wp.fan ? wp.fan[i] : (g.rng.next() - 0.5) * 2 * (wp.spread || 0)) * Math.PI) / 180;
      const c = Math.cos(spread);
      const s = Math.sin(spread);
      const d = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
      const r = this.raycast(ox, oy, d, wp.range * TILE);
      // a shot that so much as passes a protected character calls down the Wrath
      const sacred = this.protectedOnRay(ox, oy, d, r.t + (r.npc ? HIT_RADIUS : 0));
      if (sacred) {
        this.fx.push({ type: 'tracer', x1: ox, y1: oy, x2: ox + d.x * r.t, y2: oy + d.y * r.t, until: g.realTime + 0.09, start: g.realTime });
        this.smite(sacred, w);
        return { ok: true, kind: 'gun', hits: [sacred.id], wrath: true };
      }
      this.fx.push({ type: 'tracer', x1: ox, y1: oy, x2: ox + d.x * r.t, y2: oy + d.y * r.t, until: g.realTime + 0.09, start: g.realTime });
      this.spawnBullet(ox, oy, d, r.t, { kind: wp.bullet });
      if (r.npc && wp.pierce) {
        // v0.45.0: straight through everyone in a line, to the wall
        const line = this.raycastAll(ox, oy, d, wp.range * TILE);
        this.bullets[this.bullets.length - 1].left = line.t;
        for (const npc of line.npcs) { hits.push(npc); this.hitNpc(npc, wp.damage, { weapon: w, dir: d, lethal: wp.lethal !== false }); }
      } else if (r.npc) {
        hits.push(r.npc);
        // falloff beyond half range
        const fall = r.t > (wp.range * TILE) / 2 ? 0.7 : 1;
        this.hitNpc(r.npc, wp.damage * fall, { weapon: w, dir: d, lethal: wp.lethal !== false });
      } else if (r.wall) this.fx.push({ type: 'spark', x: ox + d.x * r.t, y: oy + d.y * r.t, until: g.realTime + 0.25, start: g.realTime });
    }
    this.fx.push({ type: 'flash', x: ox + dir.x * 8, y: oy + dir.y * 8, dir, until: g.realTime + 0.06, start: g.realTime });
    // v0.44.0: kick — the camera jolts, the shooter rocks back, a case flies
    const heavyGun = (wp.damage || 0) * pellets >= 60;
    this.kick(heavyGun ? 5 : wp.auto ? 1.6 : 2.6, heavyGun ? 0.2 : 0.1);
    if (!wp.bullet || wp.bullet === 'coin' || wp.bullet === 'nail' || wp.bullet === 'chalk') this.ejectCase(p.x, p.y - BODY_Y, dir);
    const map = g.currentMap();
    const back = heavyGun ? 5 : 2;
    if (!map.rectBlocked(p.x - dir.x * back - 7, p.y - dir.y * back - 6, 14, 6, g.playerActor?.())) { p.x -= dir.x * back; p.y -= dir.y * back; }
    this.gunfireNoise(wp.noise ?? 16);
    if ((p.mags[w.id] ?? 0) <= 0 && g.inventory.count(wp.ammo)) this.reload();
    return { ok: true, kind: 'gun', hits: [...new Set(hits.map((n) => n.id))] };
  }

  /** A protected character the player is clearly attacking with a melee swing (generous reach, line of sight). */
  raisedAgainst(dir, reach, half) {
    const g = this.game;
    const p = g.player;
    const map = g.currentMap();
    for (const npc of this.targets()) {
      if (!isProtected(npc)) continue;
      const dx = npc.x - p.x;
      const dy = npc.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > reach) continue;
      const ang = d < 1 ? 0 : Math.acos(clamp((dx * dir.x + dy * dir.y) / d, -1, 1));
      if (ang > half) continue;
      if (!map.lineOfSight(Math.floor(p.x / TILE), Math.floor(p.y / TILE), Math.floor(npc.x / TILE), Math.floor(npc.y / TILE))) continue;
      return npc;
    }
    return null;
  }

  /** A protected character within a near miss of a bullet's path (before it stopped). */
  protectedOnRay(ox, oy, d, maxT) {
    for (const npc of this.targets()) {
      if (!isProtected(npc)) continue;
      const cx = npc.x - ox;
      const cy = npc.y - BODY_Y - oy;
      const t = cx * d.x + cy * d.y;
      if (t <= 0 || t > maxT) continue;
      if (Math.abs(cx * d.y - cy * d.x) <= HIT_RADIUS * 2) return npc;
    }
    return null;
  }

  /** First person or wall along a ray from (ox, oy). */
  raycast(ox, oy, d, maxDist) {
    const map = this.game.currentMap();
    let wallT = maxDist;
    for (let t = 0; t < maxDist; t += 6) {
      const ch = map.tileAt(Math.floor((ox + d.x * t) / TILE), Math.floor((oy + d.y * t + BODY_Y) / TILE));
      if (WALL.has(ch)) { wallT = t; break; }
    }
    let best = null;
    let bestT = wallT;
    for (const npc of this.targets()) {
      const cx = npc.x - ox;
      const cy = npc.y - BODY_Y - oy;
      const t = cx * d.x + cy * d.y;
      if (t <= 0 || t >= bestT) continue;
      const perp = Math.abs(cx * d.y - cy * d.x);
      if (perp <= HIT_RADIUS) { best = npc; bestT = t; }
    }
    return { npc: best, t: bestT, wall: !best && wallT < maxDist };
  }

  /** Everyone along a ray up to the first wall (for weapons that pierce). */
  raycastAll(ox, oy, d, maxDist) {
    const map = this.game.currentMap();
    let wallT = maxDist;
    for (let t = 0; t < maxDist; t += 6) {
      if (WALL.has(map.tileAt(Math.floor((ox + d.x * t) / TILE), Math.floor((oy + d.y * t + BODY_Y) / TILE)))) { wallT = t; break; }
    }
    const npcs = [];
    for (const npc of this.targets()) {
      const cx = npc.x - ox;
      const cy = npc.y - BODY_Y - oy;
      const t = cx * d.x + cy * d.y;
      if (t > 0 && t < wallT && Math.abs(cx * d.y - cy * d.x) <= HIT_RADIUS) npcs.push(npc);
    }
    return { npcs, t: wallT };
  }

  // --------------------------------------------------------------- damage
  hitNpc(npc, amount, { weapon, dir, lethal = true }) {
    const g = this.game;
    const now = g.clock.total;
    if (isDown(npc, now) || this.wrath) return;
    if (isProtected(npc)) {
      this.smite(npc, weapon);
      return;
    }
    this.lastTarget = npc.id;
    const max = npcMaxHealth(npc);
    if (npc.health === undefined) npc.health = max;
    const before = npc.health;
    const dmg = Math.min(before, Math.max(1, Math.round(amount * (0.85 + g.rng.next() * 0.3))));
    npc.health = Math.max(0, npc.health - dmg);
    npc.healthBarUntil = g.realTime + HEALTH_BAR_SECONDS;
    npc.hurtAt = g.realTime;
    this.hitAt = g.realTime;
    this.fx.push({ type: 'damage', npcId: npc.id, amount: dmg, x: npc.x, y: npc.y - 46, until: g.realTime + 0.9, start: g.realTime });
    this.bleed(npc.x, npc.y - BODY_Y, dir, weapon.weapon.kind === 'gun' || weapon.weapon.lethal ? 7 : 3);
    this.lastHostileAt = g.realTime;
    // knockback
    const kb = weapon.weapon.knockback ?? (weapon.weapon.kind === 'gun' ? 6 : 18);
    const map = g.currentMap();
    // v0.45.0: in small steps, stopping at a wall (big knockbacks send people flying; negative ones pull them in)
    const actor = g.npcSystem.actorFor(npc);
    const sgn = Math.sign(kb);
    let reach = Math.abs(kb);
    if (sgn < 0) reach = Math.max(0, Math.min(reach, Math.hypot(npc.x - g.player.x, npc.y - g.player.y) - 22));
    for (let moved = 0; moved < reach; moved += 6) {
      const st = Math.min(6, reach - moved) * sgn;
      const nx = npc.x + dir.x * st;
      const ny = npc.y + dir.y * st;
      if (map.rectBlocked(nx - 7, ny - 6, 14, 6, actor)) break;
      npc.x = nx;
      npc.y = ny;
    }
    const fx = weapon.weapon.effect;
    if (fx === 'stun') npc.stunUntil = g.realTime + (weapon.weapon.stun || 2);
    if (fx === 'coins') { g.player.money += 2; g.bus.emit('money:changed', { delta: 2, total: g.player.money }); this.burst(npc.x, npc.y - BODY_Y, 'coin', 6); }
    if (fx === 'confetti') this.burst(npc.x, npc.y - BODY_Y, 'confetti', 10);
    npc.path = null;
    npc.chat = null;
    g.bus.emit('combat:hit', { npcId: npc.id, damage: dmg, health: npc.health, weapon: weapon.id });
    const firstBlow = !npc.hostile;
    if (firstBlow) {
      g.relationships.adjust(npc, 'player', { trust: -30, affection: -25, suspicion: 35, respect: -5 }, 'attacked');
      remember(npc, { text: `${g.player.name} attacked me${weapon.id ? ` with a ${weapon.name.toLowerCase()}` : ''}.`, tag: 'attacked_by_player', about: 'player', importance: 9 }, now);
      g.setMood(npc, 'frightened', 240);
      // anyone who saw it will talk
      const seen = g.witnesses(npc.map, npc.x, npc.y).filter((w) => w !== npc);
      for (const w of seen) g.knowledge.learn(w, 'fact_player_assault', { kind: 'fact', source: 'witnessed', at: now });
      g.knowledge.learn(npc, 'fact_player_assault', { kind: 'fact', source: 'witnessed', at: now });
      for (const w of seen) this.react(w, npc);
      if (seen.length) g.notify(`${seen.map((n) => n.profile.shortName).join(', ')} saw you attack ${npc.profile.shortName}!`, 'warn');
      g.bus.emit('crime', { fact: 'fact_player_assault', witnesses: seen.map((n) => n.id), victim: npc.id, map: npc.map, x: npc.x, y: npc.y });
    } else g.relationships.adjust(npc, 'player', { trust: -4, affection: -4 }, 'attacked');
    if (npc.health <= 0) {
      if (lethal) this.kill(npc, weapon);
      else this.knockOut(npc);
      return;
    }
    // fight or flight
    this.react(npc, null, true);
    if (weapon.weapon.effect === 'flee') { npc.hostile = { mode: 'flee', until: now + 30 }; npc.activity = 'flee'; } // the pigeons win
    if (g.rng.chance(0.6)) g.bark(npc, g.rng.pick(npc.hostile?.mode === 'fight' ? FIGHT : HURT));
  }

  /** Decide whether an NPC fights the player or flees. `victim` = someone else attacked. */
  react(npc, victim = null, isVictim = false) {
    const g = this.game;
    const now = g.clock.total;
    if (isDown(npc, now)) return;
    // Officers who merely witness something arrest rather than brawl (src/systems/police.js).
    if (!isVictim && g.police?.isOfficer(npc)) return;
    const c = npc.profile.combat || {};
    const pers = npc.profile.personality || {};
    const healthFrac = (npc.health ?? npcMaxHealth(npc)) / npcMaxHealth(npc);
    let fight;
    if (c.never) fight = false;
    else if (isVictim) fight = (c.fights || (pers.confidence ?? 0.5) + (pers.competitiveness ?? 0.3) * 0.5 > 0.95) && healthFrac > 0.35;
    else {
      const bond = victim ? g.relationships.get(npc, victim.id).affection : 0;
      fight = Boolean(c.defends && (c.defends === true || c.defends.includes(victim?.id))) || (c.fights && bond > 20);
      fight = fight && healthFrac > 0.35;
    }
    const mode = fight ? 'fight' : 'flee';
    const changed = npc.hostile?.mode !== mode;
    npc.hostile = { mode, until: now + (fight ? 30 : 45) };
    npc.intent = null;
    npc.travel = null;
    npc.path = null;
    npc.arrived = false;
    npc.activity = fight ? 'fight' : 'flee';
    if (!isVictim && changed) {
      g.bark(npc, g.rng.pick(fight ? FIGHT : FLEE));
      if (!fight) g.setMood(npc, 'frightened', 180);
    }
  }

  knockOut(npc) {
    const g = this.game;
    npc.health = 0;
    npc.downUntil = g.clock.total + 120;
    npc.hostile = null;
    npc.activity = 'unconscious';
    npc.path = null;
    npc.intent = null;
    npc.bubble = null;
    remember(npc, { text: `${g.player.name} knocked me out cold.`, tag: 'knocked_out_by_player', about: 'player', importance: 9 }, g.clock.total);
    g.notify(`${npc.profile.shortName} is out cold.`, 'warn');
    g.bus.emit('combat:knockout', { npcId: npc.id });
  }

  kill(npc, weapon) {
    const g = this.game;
    const now = g.clock.total;
    this.decals.push({ kind: 'pool', map: npc.map, x: npc.x, y: npc.y - 4, size: 1, at: g.realTime });
    this.kick(4, 0.18);
    npc.health = 0;
    npc.dead = true;
    npc.diedAt = now;
    npc.hostile = null;
    npc.activity = 'dead';
    npc.path = null;
    npc.intent = null;
    npc.travel = null;
    npc.chat = null;
    npc.bubble = null;
    const seen = g.witnesses(npc.map, npc.x, npc.y).filter((w) => w !== npc);
    for (const w of seen) {
      g.knowledge.learn(w, 'fact_player_murder', { kind: 'fact', source: 'witnessed', at: now });
      remember(w, { text: `I saw ${g.player.name} kill ${npc.profile.shortName}.`, tag: `saw_killing:${npc.id}`, about: 'player', importance: 10 }, now);
      this.react(w, npc);
    }
    g.notify(`${npc.profile.shortName} is dead.`, 'warn');
    g.bus.emit('npc:died', { npcId: npc.id, weapon: weapon?.id || null, witnesses: seen.map((n) => n.id) });
    g.bus.emit('crime', { fact: 'fact_player_murder', witnesses: seen.map((n) => n.id), victim: npc.id, map: npc.map, x: npc.x, y: npc.y });
    // Anything they were giving the player is over.
    for (const [qid, st] of Object.entries(g.questState)) {
      if (st.state === 'active' && g.content.quests[qid]?.giver === npc.id) g.quests.fail(qid, 'giver_died');
    }
  }

  /** Everyone within earshot of a shot: flee unless they're the fighting sort. */
  gunfireNoise(radiusTiles) {
    const g = this.game;
    const p = g.player;
    const now = g.clock.total;
    const heard = [];
    for (const npc of g.npcs.values()) {
      if (npc.map !== p.map || isDown(npc, now) || npc.hostile) continue;
      if (dist(npc.x, npc.y, p.x, p.y) > radiusTiles * TILE) continue;
      heard.push(npc.id);
      if (npc.activity === 'sleep') npc.activity = 'idle'; // woken by the bang
      if (g.police?.isOfficer(npc)) continue; // the police come running instead (src/systems/police.js)
      const c = npc.profile.combat || {};
      if (c.defends === true && g.canSee(npc, p.x, p.y, g.currentMap(), 12)) this.react(npc, null);
      else {
        npc.hostile = { mode: 'flee', until: now + 30 };
        npc.intent = null;
        npc.path = null;
        npc.activity = 'flee';
        g.setMood(npc, 'frightened', 180);
        if (g.rng.chance(0.5)) g.bark(npc, g.rng.pick(GUNFIRE));
      }
      remember(npc, { text: 'Heard gunshots nearby.', tag: 'heard_gunfire', about: null, importance: 5 }, now);
    }
    if (heard.length) g.bus.emit('crime', { fact: 'gunfire', witnesses: heard, map: p.map, x: p.x, y: p.y });
  }

  damagePlayer(amount, attacker) {
    const g = this.game;
    const p = g.player;
    if (this.playerDownUntil && g.realTime < this.playerDownUntil) return;
    if (p.god) return; // debug god mode
    // Grit soaks damage: 8% less per point above 2 (8% more at 1)
    const grit = g.stat ? g.stat('grit') : 2;
    const dmg = Math.max(1, Math.round(amount * (0.85 + g.rng.next() * 0.3) * (1 - (grit - 2) * 0.08)));
    p.health = Math.max(0, p.health - dmg);
    p.hurtAt = g.realTime;
    this.lastHostileAt = g.realTime;
    this.kick(4, 0.2);
    this.fx.push({ type: 'damage', player: true, amount: dmg, x: p.x, y: p.y - 46, until: g.realTime + 0.9, start: g.realTime });
    g.bus.emit('combat:playerHit', { damage: dmg, by: attacker?.id, health: p.health });
    if (p.health <= 0) this.playerKnockedOut(attacker);
  }

  /** The player blacks out: wake later at home, poorer and sore. */
  playerKnockedOut(attacker) {
    const g = this.game;
    const p = g.player;
    if (attacker) remember(attacker, { text: `I beat ${p.name} senseless.`, tag: 'beat_player', about: 'player', importance: 7 }, g.clock.total);
    if (g.police) {
      // Killed is killed: you wake up in a cell (v0.10.0).
      g.bus.emit('combat:playerDown', { lost: 0, by: attacker?.id || null });
      g.police.sendToJail('killed');
      return;
    }
    const lost = Math.floor(p.money * 0.25);
    p.money -= lost;
    for (const npc of g.npcs.values()) if (npc.hostile) { npc.hostile = null; npc.activity = 'idle'; }
    this.reloading = null;
    g.changeMap(g.content.startingMap, g.content.startingSpot);
    g.skipTime(6 * 60);
    p.health = 45;
    p.energy = Math.max(10, p.energy - 20);
    g.bus.emit('combat:playerDown', { lost, by: attacker?.id || null });
    g.notify(`Everything went black. You wake up at home, aching${lost ? `, ${lost} obols lighter` : ''}.`, 'warn');
  }

  // ------------------------------------------------------------ the Wrath
  /** Someone raised a hand against an imported character. The Oberverse answers. */
  smite(npc, weapon) {
    const g = this.game;
    const now = g.clock.total;
    const p = g.player;
    this.reloading = null;
    this.fx = [];
    for (const n of g.npcs.values()) n.hostile = null;
    npc.facing = faceTo(npc, p);
    this.wrath = {
      npcId: npc.id,
      start: g.realTime,
      seed: Math.floor(g.rng.next() * 1e6),
      color: npc.profile.wrath?.color || '#b98cff',
      theme: npc.profile.wrath?.theme || 'arcane',
      line: (npc.profile.wrath?.line || '{name} is beyond your reach.').replace('{name}', npc.profile.shortName).replace('{player}', p.name),
      weapon: weapon?.id || null,
      over: false,
      struck: 0,
    };
    remember(npc, { text: `${p.name} raised a hand against me. The heavens answered.`, tag: 'smote_player', about: 'player', importance: 10 }, now);
    g.relationships.adjust(npc, 'player', { trust: -10, respect: -5, suspicion: 20 }, 'attacked');
    const seen = g.witnesses(npc.map, npc.x, npc.y).filter((w) => w !== npc);
    for (const w of [npc, ...seen]) g.knowledge.learn(w, 'fact_player_smitten', { kind: 'fact', source: 'witnessed', at: now });
    g.setFlag(`smitten_by_${npc.id}`, (g.getFlag(`smitten_by_${npc.id}`) || 0) + 1);
    g.bus.emit('combat:wrath', { npcId: npc.id, color: this.wrath.color, theme: this.wrath.theme });
  }

  /** Advance the cutscene (the world is frozen while it plays). */
  updateWrath() {
    const g = this.game;
    const w = this.wrath;
    const e = g.realTime - w.start;
    while (w.struck < WRATH.strikes.length && e >= WRATH.strikes[w.struck]) {
      w.struck += 1;
      g.bus.emit('combat:lightning', { index: w.struck, theme: w.theme });
    }
    if (e >= WRATH.end && !w.over) {
      w.over = true;
      g.bus.emit('combat:wrathEnd', { npcId: w.npcId, line: w.line });
    }
  }

  /** After the Wrath: wake at home the next morning. You keep your life; not your dignity. */
  riseAgain() {
    const g = this.game;
    if (!this.wrath) return;
    const p = g.player;
    const victim = g.npcs.get(this.wrath.npcId);
    this.wrath = null;
    p.health = 100;
    if (victim?.profile.wrath?.after === 'jail' && g.police) {
      g.bus.emit('combat:risen', { lost: 0, jail: true });
      g.police.sendToJail('wrath');
      return;
    }
    const lost = Math.floor(p.money / 2);
    p.money -= lost;
    g.changeMap(g.content.startingMap, g.content.startingSpot);
    const toMorning = ((24 * 60 + 8 * 60) - g.clock.minuteOfDay) % (24 * 60) || 24 * 60;
    g.skipTime(toMorning);
    g.bus.emit('combat:risen', { lost });
    g.notify(`You wake at home, smelling faintly of ozone${lost ? `, ${lost} obols lighter` : ''}. Some people are not meant to be touched.`, 'warn');
  }

  // ---------------------------------------------------------------- update
  /** Per-frame update (real seconds). */
  // ------------------------------------------------------- game feel (v0.44.0)
  /** Shake the camera: `mag` px, for `secs`. */
  kick(mag, secs = 0.15) {
    const t = this.game.realTime;
    if (t + secs > this.shake.until || mag > this.shake.mag) this.shake = { until: t + secs, mag: Math.max(mag, t < this.shake.until ? this.shake.mag : 0) };
  }

  /** A bullet you can see, from (x, y) along d for `len` px. `hurts`: an NPC's shot that can hit the player. */
  spawnBullet(x, y, d, len, opts = {}) {
    const slow = { pigeon: 700, fish: 900, cheese: 650, harpoon: 1100, confetti: 900, coin: 1300, card: 1200, ring: 800 }[opts.kind];
    this.bullets.push({ map: this.game.player.map, x, y, dx: d.x, dy: d.y, left: len, speed: opts.speed || slow || 1700, kind: opts.kind || null, hurts: opts.hurts || null, born: this.game.realTime });
    if (this.bullets.length > 80) this.bullets.shift();
  }

  /** Blood: `n` droplets thrown along `dir` from someone's body. */
  bleed(x, y, dir, n = 6) {
    const g = this.game;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(dir.y, dir.x) + (g.rng.next() - 0.5) * 1.2;
      const v = 40 + g.rng.next() * 80;
      this.particles.push({ kind: 'blood', map: g.player.map, x, y: y + BODY_Y - 2, z: BODY_Y - 4 + g.rng.next() * 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 40 + g.rng.next() * 60, size: g.rng.next() < 0.3 ? 2 : 1 });
    }
  }

  /** A puff of coins or confetti from someone who's been hit. */
  burst(x, y, kind, n) {
    const g = this.game;
    for (let i = 0; i < n; i++) {
      const a = g.rng.next() * Math.PI * 2;
      const v = 30 + g.rng.next() * 70;
      this.particles.push({ kind, map: g.player.map, x, y: y + BODY_Y - 2, z: BODY_Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 60 + g.rng.next() * 60, size: 1, hue: Math.floor(g.rng.next() * 5) });
    }
  }

  /** A spent case flicked out of the gun, to the right of where it's pointing. */
  ejectCase(x, y, dir) {
    const g = this.game;
    const side = { x: -dir.y, y: dir.x };
    const v = 25 + g.rng.next() * 25;
    this.particles.push({ kind: 'case', map: g.player.map, x, y: y + BODY_Y - 2, z: BODY_Y - 4, vx: side.x * v - dir.x * 12, vy: side.y * v - dir.y * 12, vz: 50 + g.rng.next() * 25, size: 1 });
  }

  /** Move bullets and particles; an NPC's bullet that reaches the player hurts them. */
  updateFeel(dt) {
    const g = this.game;
    const p = g.player;
    const map = g.currentMap();
    for (const b of this.bullets) {
      const step = Math.min(b.left, b.speed * dt);
      const sub = Math.max(1, Math.ceil(step / 8));
      for (let k = 0; k < sub && b.left > 0; k++) {
        const st = step / sub;
        b.x += b.dx * st;
        b.y += b.dy * st;
        b.left -= st;
        if (!b.hurts) continue;
        if (b.map !== p.map) { b.left = 0; break; }
        if (WALL.has(map.tileAt(Math.floor(b.x / TILE), Math.floor((b.y + BODY_Y) / TILE)))) {
          b.left = 0;
          this.fx.push({ type: 'spark', x: b.x, y: b.y, until: g.realTime + 0.25, start: g.realTime });
          break;
        }
        if (!p.driving && Math.hypot(b.x - p.x, b.y - (p.y - BODY_Y)) <= HIT_RADIUS) {
          b.left = 0;
          const shooter = g.npcs.get(b.hurts.by);
          this.bleed(p.x, p.y - BODY_Y, { x: b.dx, y: b.dy }, 5);
          this.damagePlayer(b.hurts.damage, shooter);
        }
      }
    }
    if (this.bullets.length) this.bullets = this.bullets.filter((b) => b.left > 0.5);
    if (this.particles.length) {
      for (const q of this.particles) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vz -= 260 * dt;
        q.z += q.vz * dt;
        if (q.z <= 0) {
          if (q.kind === 'case' && q.vz < -40) { q.z = 0.1; q.vz = -q.vz * 0.35; q.vx *= 0.5; q.vy *= 0.5; continue; } // a little bounce
          q.done = true;
          this.decals.push({ kind: q.kind, map: q.map, x: q.x, y: q.y, size: q.size, hue: q.hue, at: g.realTime });
        }
      }
      this.particles = this.particles.filter((q) => !q.done);
      if (this.decals.length > 260) this.decals.splice(0, this.decals.length - 260);
    }
  }

  update(dt) {
    const g = this.game;
    if (this.wrath) return this.updateWrath();
    this.updateFeel(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloading && g.realTime >= this.reloading.until) this.finishReload();
    if (this.fx.length) this.fx = this.fx.filter((f) => f.until > g.realTime);
    for (const npc of g.npcs.values()) {
      if (!npc.hostile || npc.map !== g.player.map || npc.inDialogue) continue;
      if (npc.stunUntil > g.realTime) { npc.moving = false; continue; } // v0.45.0: stunned, pinned or reeled in
      if (npc.hostile.mode === 'fight') this.fightStep(npc, dt);
      else this.fleeStep(npc, dt);
    }
  }

  /** Per game minute: wake the knocked-out, calm the frightened, heal slowly. */
  minuteTick() {
    const g = this.game;
    const now = g.clock.total;
    const p = g.player;
    for (const npc of g.npcs.values()) {
      if (npc.dead) continue;
      if (npc.downUntil && now >= npc.downUntil) {
        npc.downUntil = 0;
        npc.health = Math.max(npc.health || 0, Math.round(npcMaxHealth(npc) * 0.3));
        npc.activity = 'idle';
        npc.hostile = npc.map === p.map ? { mode: 'flee', until: now + 40 } : null;
        g.setMood(npc, 'frightened', 300);
        g.bus.emit('combat:wake', { npcId: npc.id });
        continue;
      }
      if (npc.hostile && now >= npc.hostile.until) this.calm(npc);
      if (!npc.hostile && !npc.downUntil && npc.health !== undefined && npc.health < npcMaxHealth(npc) && Math.floor(now) % 10 === 0) npc.health += 1;
    }
    const fighting = g.realTime - this.lastHostileAt < 20;
    if (!fighting && p.health < 100 && Math.floor(now) % 5 === 0) p.health = Math.min(100, p.health + 1);
  }

  calm(npc) {
    npc.hostile = null;
    npc.activity = 'idle';
    this.game.npcSystem.think(npc, true);
  }

  /** Close in on the player and hit them. */
  fightStep(npc, dt) {
    const g = this.game;
    const p = g.player;
    const w = this.weaponDef(npc.profile.combat?.weapon);
    const wp = w.weapon;
    const dx = p.x - npc.x;
    const dy = p.y - npc.y;
    const d = Math.hypot(dx, dy);
    npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    npc.attackCd = Math.max(0, (npc.attackCd || 0) - dt);
    // running scared once badly hurt
    if ((npc.health ?? 100) / npcMaxHealth(npc) < 0.25) {
      npc.hostile = { mode: 'flee', until: g.clock.total + 45 };
      npc.activity = 'flee';
      g.bark(npc, g.rng.pick(FLEE));
      return;
    }
    const map = g.currentMap();
    const canShoot = wp.kind === 'gun' && d < wp.range * TILE * 0.8 && g.canSee(npc, p.x, p.y, map, wp.range);
    const inReach = wp.kind === 'melee' ? d < wp.range * TILE + 10 : canShoot;
    if (inReach) {
      npc.moving = false;
      if (npc.attackCd <= 0) {
        npc.attackCd = wp.cooldown * (wp.kind === 'gun' ? 2.2 : 1.6);
        npc.attackAnim = { at: g.realTime, kind: wp.kind, dir: { x: dx / d, y: dy / d } };
        if (wp.kind === 'gun') {
          g.bus.emit('sfx', { id: wp.sound || 'sfx_gunshot' });
          const ox = npc.x;
          const oy = npc.y - BODY_Y;
          // v0.44.0: a real bullet, aimed with a shooter's wobble — keep moving and it can miss you
          const ang = Math.atan2(p.y - BODY_Y - oy, p.x - ox) + (g.rng.next() - 0.5) * 0.22;
          const bd = { x: Math.cos(ang), y: Math.sin(ang) };
          this.spawnBullet(ox + bd.x * 12, oy + bd.y * 8, bd, wp.range * TILE, { speed: 620, hurts: { by: npc.id, damage: wp.damage * 0.8 } });
          this.fx.push({ type: 'flash', x: ox + (dx / d) * 14, y: oy + (dy / d) * 10, dir: bd, until: g.realTime + 0.06, start: g.realTime });
        } else {
          g.bus.emit('sfx', { id: 'sfx_punch' });
          this.fx.push({ type: 'swing', x: npc.x, y: npc.y - BODY_Y, dir: { x: dx / d, y: dy / d }, range: wp.range * TILE, arc: 0.6, until: g.realTime + 0.18, start: g.realTime });
          this.damagePlayer(wp.damage * 0.9, npc);
        }
      }
      return;
    }
    this.steer(npc, dx / d, dy / d, MOVE_FIGHT * (npc.profile.walkSpeed ?? 1), dt, true);
  }

  /** Run away from the player. */
  fleeStep(npc, dt) {
    const g = this.game;
    const p = g.player;
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 16 * TILE) { npc.moving = false; return; }
    this.steer(npc, dx / d, dy / d, MOVE_FLEE * (npc.profile.walkSpeed ?? 1), dt, false);
  }

  /** Move with collision, sliding along walls; chase uses A* when the way is blocked. */
  steer(npc, ux, uy, speed, dt, chasing) {
    const g = this.game;
    const map = g.currentMap();
    const actor = g.npcSystem.actorFor(npc);
    const step = speed * dt;
    const blocked = (x, y) => map.rectBlocked(x - 7, y - 6, 14, 6, actor);
    // follow a short A* path when chasing around obstacles
    if (chasing && npc.chasePath?.length) {
      const wp = npc.chasePath[0];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wd = Math.hypot(wx, wy);
      if (wd < step + 1) npc.chasePath.shift();
      else { ux = wx / wd; uy = wy / wd; }
    }
    let moved = false;
    const tries = [[ux, uy], [ux, 0], [0, uy], [-uy, ux], [uy, -ux]];
    for (const [tx, ty] of tries) {
      if (!tx && !ty) continue;
      const len = Math.hypot(tx, ty);
      const nx = npc.x + (tx / len) * step;
      const ny = npc.y + (ty / len) * step;
      if (!blocked(nx, ny)) {
        npc.x = nx;
        npc.y = ny;
        npc.facing = Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 'right' : 'left') : ty > 0 ? 'down' : 'up';
        moved = true;
        break;
      }
    }
    npc.moving = moved;
    if (moved) npc.animTime = (npc.animTime || 0) + dt * 1.4;
    if (chasing && (!moved || !npc.chasePath?.length) && g.realTime > (npc.chaseReplanAt || 0)) {
      npc.chaseReplanAt = g.realTime + 0.6;
      const p = g.player;
      const path = findPath(map, Math.floor(npc.x / TILE), Math.floor(npc.y / TILE), Math.floor(p.x / TILE), Math.floor(p.y / TILE), actor, 2500);
      npc.chasePath = path ? path.slice(0, 6).map((t) => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE })) : null;
    }
  }

  /** NPC health info for the renderer (null when the bar shouldn't show). */
  healthBar(npc) {
    const g = this.game;
    if (npc.health === undefined || npc.dead) return null;
    const max = npcMaxHealth(npc);
    const show = npc.hostile || (npc.healthBarUntil && g.realTime < npc.healthBarUntil) || (npc.downUntil && g.clock.total < npc.downUntil);
    if (!show) return null;
    return { frac: clamp(npc.health / max, 0, 1), health: Math.ceil(npc.health), max, hurt: npc.hurtAt && g.realTime - npc.hurtAt < 0.25 };
  }
}
