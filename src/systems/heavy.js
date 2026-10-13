// Heavy weapons in the field (v0.14.0): RPG rockets, Skylance guided
// missiles, Longbow cruise missiles, and Hornet / Kestrel drones.
//
// Owner's rules: explosions never harm imported (protected) characters, and
// drones never target them; only a DIRECT attack — a rocket or missile that
// actually hits one of them — calls down their Wrath. Setting off explosives
// is a major crime (record +10, Wanted ★★★).
//
// Projectiles, drones and scorch marks are runtime-only (not saved); they
// live on the player's current map and are dropped if you leave it.
import { TILE, clamp, dist } from '../core/util.js';
import { isProtected, isDown } from './combat.js';

const BLAST_WEAPON = { id: 'item_rpg', name: 'explosion', weapon: { kind: 'gun', knockback: 34, lethal: true } };
const ROCKET_SPEED = 320; // px per real second
const MISSILE_SPEED = 240;
const HIT = 16;

export class Heavy {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
    this.drones = [];
    this.decals = [];
    this.strikes = [];
    this.shakeUntil = 0;
    game.bus.on('map:entered', () => { this.projectiles = []; this.drones = []; this.strikes = []; });
  }

  /** Valid targets for missiles and drones: conscious, on this map, never imported characters. */
  targets() {
    return this.game.combat.targets().filter((n) => !isProtected(n) && !n.dead);
  }

  nearest(x, y, maxTiles, pred = () => true) {
    let best = null;
    let bd = maxTiles * TILE;
    for (const n of this.targets()) {
      if (!pred(n)) continue;
      const d = dist(n.x, n.y, x, y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // ------------------------------------------------------------- launching
  /** An RPG rocket (Combat.fire, for weapons with `projectile`). */
  launchRocket(ox, oy, dir, wp) {
    const g = this.game;
    this.projectiles.push({ kind: 'rocket', x: ox, y: oy + 18, vx: dir.x * ROCKET_SPEED, vy: dir.y * ROCKET_SPEED, travelled: 0, range: wp.range * TILE, damage: wp.damage, blast: wp.blast, born: g.realTime, by: 'player' });
  }

  /** Use a missile or drone from the inventory (item use: { heavy: type }). */
  use(type) {
    const g = this.game;
    const p = g.player;
    const aim = p.aim && Math.hypot(p.aim.x, p.aim.y) > 1 ? { x: p.aim.x, y: p.aim.y } : null;
    const facing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 1];
    if (type === 'guided') {
      const target = this.nearest(p.x, p.y, 16);
      const d = aim ? norm(aim) : { x: facing[0], y: facing[1] };
      this.projectiles.push({ kind: 'missile', x: p.x + d.x * 14, y: p.y + d.y * 10, vx: d.x * MISSILE_SPEED, vy: d.y * MISSILE_SPEED, travelled: 0, range: 18 * TILE, damage: 140, blast: 3.5, target: target?.id || null, born: g.realTime, by: 'player' });
      g.bus.emit('sfx', { id: 'sfx_rocket' });
      return { ok: true, text: target ? `Skylance away — locked on ${target.profile.shortName}.` : 'Skylance away — no lock, flying straight.' };
    }
    if (type === 'cruise') {
      const tx = aim ? p.x + aim.x : p.x + facing[0] * 8 * TILE;
      const ty = aim ? p.y - 18 + aim.y + 18 : p.y + facing[1] * 8 * TILE;
      this.strikes.push({ x: tx, y: ty, at: g.realTime + 2.5, born: g.realTime, damage: 250, blast: 5 });
      g.bus.emit('sfx', { id: 'sfx_rocket' });
      return { ok: true, text: 'Longbow inbound. Get clear of the reticle.' };
    }
    if (type === 'drone_attack' || type === 'drone_strike') {
      const kestrel = type === 'drone_strike';
      this.drones.push({ kind: kestrel ? 'kestrel' : 'hornet', x: p.x, y: p.y - 10, until: g.realTime + (kestrel ? 90 : 60), target: null, cooldown: 1, ammo: kestrel ? 4 : 1, born: g.realTime });
      g.bus.emit('sfx', { id: 'sfx_drone' });
      return { ok: true, text: kestrel ? 'The Kestrel climbs into the air above you. It will strike whoever you fight.' : 'The Hornet whirs up beside you. It will dive at whoever you fight.' };
    }
    return { ok: false, text: 'Nothing happens.' };
  }

  // --------------------------------------------------------------- blasts
  crime(x, y) {
    const g = this.game;
    g.reportCrime({ fact: 'fact_player_explosion', map: g.player.map, x, y, radius: 16 });
  }

  /** An explosion. Imported characters are never harmed by it. */
  explode(x, y, radiusTiles, damage) {
    const g = this.game;
    const R = radiusTiles * TILE;
    g.combat.fx.push({ type: 'blast', x, y, r: R, until: g.realTime + 0.9, start: g.realTime });
    this.decals.push({ map: g.player.map, x, y, r: R * 0.7, until: g.realTime + 120 });
    if (this.decals.length > 30) this.decals.shift();
    this.shakeUntil = g.realTime + 0.45;
    g.bus.emit('sfx', { id: 'sfx_explosion' });
    for (const npc of g.combat.targets()) {
      if (isProtected(npc)) continue;
      const d = dist(npc.x, npc.y, x, y);
      if (d > R) {
        // close enough to see it: run
        if (d < R * 3 && !npc.hostile && !npc.profile.staff) g.combat.react(npc, null, false);
        continue;
      }
      const k = 1 - 0.6 * (d / R);
      const dir = d > 1 ? { x: (npc.x - x) / d, y: (npc.y - y) / d } : { x: 0, y: 1 };
      g.combat.hitNpc(npc, damage * k, { weapon: BLAST_WEAPON, dir, lethal: true });
    }
    const pd = dist(g.player.x, g.player.y, x, y);
    if (pd <= R) g.combat.damagePlayer(damage * 0.6 * (1 - 0.6 * (pd / R)), null);
    this.crime(x, y);
  }

  // --------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    if (g.combat.wrath) return;
    const map = g.currentMap();
    const now = g.realTime;
    // rockets and missiles
    for (const pr of [...this.projectiles]) {
      if (pr.kind === 'missile' && pr.target) {
        const t = g.npcs.get(pr.target);
        if (t && t.map === g.player.map && !t.dead && !isDown(t, g.clock.total)) {
          const d = norm({ x: t.x - pr.x, y: t.y - pr.y });
          const sp = Math.hypot(pr.vx, pr.vy);
          pr.vx += (d.x * sp - pr.vx) * clamp(dt * 4, 0, 1);
          pr.vy += (d.y * sp - pr.vy) * clamp(dt * 4, 0, 1);
        }
      }
      const step = Math.hypot(pr.vx, pr.vy) * dt;
      const n = Math.max(1, Math.ceil(step / 8));
      let done = false;
      for (let i = 0; i < n && !done; i++) {
        pr.x += (pr.vx * dt) / n;
        pr.y += (pr.vy * dt) / n;
        pr.travelled += step / n;
        // a direct hit on someone
        for (const npc of g.combat.targets()) {
          if (dist(npc.x, npc.y, pr.x, pr.y) > HIT) continue;
          if (isProtected(npc)) {
            // a direct attack on an imported character: the Wrath, not an explosion
            g.combat.smite(npc, BLAST_WEAPON);
            this.projectiles = [];
            return;
          }
          this.explode(pr.x, pr.y, pr.blast, pr.damage);
          done = true;
          break;
        }
        if (done) break;
        if (map.blockedTile(Math.floor(pr.x / TILE), Math.floor(pr.y / TILE)) || pr.travelled >= pr.range) {
          this.explode(pr.x, pr.y, pr.blast, pr.damage);
          done = true;
        }
      }
      if (done) this.projectiles = this.projectiles.filter((x) => x !== pr);
    }
    // cruise missile strikes
    for (const s of [...this.strikes]) {
      if (now >= s.at) {
        this.strikes = this.strikes.filter((x) => x !== s);
        this.explode(s.x, s.y, s.blast, s.damage);
      }
    }
    // drones
    for (const d of [...this.drones]) {
      if (now >= d.until || d.ammo <= 0) { this.drones = this.drones.filter((x) => x !== d); continue; }
      let t = d.target ? g.npcs.get(d.target) : null;
      const valid = (n) => n && n.map === g.player.map && !n.dead && !isDown(n, g.clock.total) && !isProtected(n);
      if (!valid(t)) {
        // whoever is fighting you; else whoever you last hit
        t = this.nearest(g.player.x, g.player.y, 14, (n) => n.hostile?.mode === 'fight');
        const last = g.combat.lastTarget ? g.npcs.get(g.combat.lastTarget) : null;
        if (!t && valid(last) && dist(last.x, last.y, g.player.x, g.player.y) < 14 * TILE) t = last;
        d.target = t?.id || null;
      }
      const goal = t ? (d.kind === 'hornet' ? { x: t.x, y: t.y } : { x: t.x + Math.cos(now) * 70, y: t.y - 30 + Math.sin(now) * 30 }) : { x: g.player.x + Math.cos(now * 1.3) * 40, y: g.player.y - 30 + Math.sin(now * 1.3) * 16 };
      const v = norm({ x: goal.x - d.x, y: goal.y - d.y });
      const gd = dist(goal.x, goal.y, d.x, d.y);
      const sp = (d.kind === 'hornet' && t ? 200 : 150) * dt;
      d.x += v.x * Math.min(sp, gd);
      d.y += v.y * Math.min(sp, gd);
      if (!t) continue;
      if (d.kind === 'hornet' && dist(t.x, t.y, d.x, d.y) < HIT) {
        this.drones = this.drones.filter((x) => x !== d);
        this.explode(d.x, d.y, 2, 90);
        continue;
      }
      if (d.kind === 'kestrel') {
        d.cooldown -= dt;
        if (d.cooldown <= 0 && dist(t.x, t.y, d.x, d.y) < 10 * TILE) {
          d.cooldown = 4;
          d.ammo -= 1;
          const dir = norm({ x: t.x - d.x, y: t.y - d.y });
          this.projectiles.push({ kind: 'missile', x: d.x, y: d.y, vx: dir.x * MISSILE_SPEED, vy: dir.y * MISSILE_SPEED, travelled: 0, range: 12 * TILE, damage: 80, blast: 2, target: t.id, born: now, by: 'drone' });
          g.bus.emit('sfx', { id: 'sfx_rocket' });
        }
      }
    }
    if (this.decals.length) this.decals = this.decals.filter((x) => x.until > now);
  }
}

function norm(v) {
  const d = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / d, y: v.y / d };
}
