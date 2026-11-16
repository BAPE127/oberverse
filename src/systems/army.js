// The government's response: the 4th wanted star (v0.106.0, owner's decision of 2026-11-15). When the police cannot stop you, Fort Gullcrest
// sends real soldiers, in waves (a patrol, then a road block, then a heavy-weapons team), from a finite stock that the defence budget pays
// for. Soldiers who die are lost to the Army until the budget refits them; soldiers still standing when the hunt ends go home to the fort.
//
//   raise(why)        the 4th star: three stars and (officers killed again and again, an attack on a government building, a coup staged)
//   update(dt)        per frame: the next wave, the soldiers out, who has fallen
//   minuteTick()      the star lapses when nobody has seen you for a long while; soldiers go home
//   surrender()       to a soldier near you: arrest, as with the police (your company is not seized)
//
// State: world.army (saved). The soldiers themselves are runtime characters (ids `army_*`, `profile.transient`): not saved; after a load
// the hunt goes on with fresh waves from what is left of the stock.
import { TILE, dist } from '../core/util.js';
import { ARMY } from '../content/army.js';

const isSoldier = (npc) => npc?.profile?.faction === 'fac_army' && npc.profile.transient;

export class Army {
  constructor(game) {
    this.game = game;
    game.bus.on('police:officerKilled', () => this.officerKilled());
  }

  get state() {
    const w = this.game.world;
    if (!w.army) w.army = { stock: null, lost: { soldiers: 0, heavy: 0 }, star4: false, since: 0, why: '', waves: 0, nextWaveAt: 0, lastSeen: 0, officerKills: 0, refitDay: 0, hunts: 0 };
    const s = w.army; if (!s.stock) s.stock = this.capacity();
    return s;
  }

  /** What the defence budget keeps at Fort Gullcrest for this work: a base, up or down a quarter for each defence policy in force. */
  capacity() {
    const g = this.game; let lvl = 0;
    try { for (const p of g.politics?.government?.().active || []) { if (p.key === 'defence_up') lvl += 1; if (p.key === 'defence_down') lvl -= 1; } } catch { /* politics not set up yet */ }
    const k = Math.max(0.5, 1 + ARMY.budgetStep * lvl);
    return { soldiers: Math.round(ARMY.base.soldiers * k), heavy: Math.round(ARMY.base.heavy * k) };
  }

  soldiers() { return [...this.game.npcs.values()].filter(isSoldier); }
  hunting() { return Boolean(this.state.star4); }

  /** The 4th star. Only with three already (the police have failed), or when a coup is staged. */
  raise(why, force = false) {
    const g = this.game; const s = this.state; const pol = g.police.state;
    if (s.star4 || g.police.jailed()) return false;
    if (!force && pol.wanted < 3) return false;
    pol.wanted = 3; pol.lastSeen = g.clock.total; s.star4 = true; s.since = g.clock.total; s.lastSeen = g.clock.total; s.why = why; s.waves = 0; s.hunts += 1;
    s.nextWaveAt = g.realTime + ARMY.firstWave;
    g.notify(`★★★★ The Army is coming: Fort Gullcrest is sending soldiers (${why}).`, 'warn');
    g.bus.emit('police:wanted', { level: 4 });
    return true;
  }

  officerKilled() {
    const g = this.game; const s = this.state;
    if (g.police.state.wanted >= 3) { s.officerKills += 1; if (s.officerKills >= ARMY.officerKills) this.raise('police officers killed'); }
  }

  /** A wave's make-up: patrol, road block, then heavy weapons; never more than the fort has left. */
  waveOf(n) {
    const W = ARMY.waves[Math.min(n, ARMY.waves.length - 1)]; const st = this.state.stock;
    return { kind: W.kind, soldiers: Math.min(W.soldiers, st.soldiers), heavy: Math.min(W.heavy, st.heavy) };
  }

  /** Where soldiers come in: open ground on your map, out of sight and well away from you, roads first. */
  entry(map, n) {
    const g = this.game; const p = g.player; const out = [];
    const tries = [];
    for (let y = 1; y < map.height - 1; y += 1) for (let x = 1; x < map.width - 1; x += 1) {
      const d = Math.hypot((x + 0.5) * TILE - p.x, (y + 0.5) * TILE - p.y) / TILE;
      if (d < ARMY.spawn.min || d > ARMY.spawn.max) continue;
      if (map.blockedTile(x, y) || map.doorAt(x, y)) continue;
      tries.push({ x, y, d, road: map.tileAt(x, y) === '=' ? 0 : 1 });
    }
    tries.sort((a, b) => a.road - b.road || a.d - b.d);
    const first = tries[Math.floor(g.rng.next() * Math.min(tries.length, 40))]; if (!first) return out;
    for (const t of tries) { if (out.length >= n) break; if (Math.hypot(t.x - first.x, t.y - first.y) < 4) out.push(t); }
    return out;
  }

  /** One soldier: a runtime character with a rifle (or a launcher), hostile to you and nobody else. */
  soldier(i, heavy, map, at) {
    const g = this.game; const base = g.content.characters.npc_fg_patrol_a;
    const id = `army_${g.clock.total | 0}_${i}`;
    const profile = {
      ...structuredClone(base), id, name: heavy ? 'Army Heavy Weapons Specialist' : 'Army Rifleman', shortName: heavy ? 'Specialist' : 'Soldier',
      faction: 'fac_army', transient: true, origin: 'army', schedule: [{ from: '00:00', to: '23:59', activity: 'patrol', spot: 'fort_gullcrest:parade' }],
      combat: { fights: true, defends: true, weapon: heavy ? ARMY.heavyWeapon : ARMY.weapon, maxHealth: heavy ? 170 : 150, maxRange: ARMY.fireRange, damageScale: ARMY.damageScale },
      appearance: { ...(base.appearance || {}), outfit: '#4f5d3a', accent: '#2f3a22', accessory: 'helmet' },
    };
    const npc = g.createNpc(profile);
    npc.map = map.id; npc.x = (at.x + 0.5) * TILE; npc.y = (at.y + 0.5) * TILE; npc.health = profile.combat.maxHealth;
    npc.hostile = { mode: 'fight', until: g.clock.total + 100000 }; npc.activity = 'fight'; npc.armyHeavy = heavy;
    g.npcs.set(id, npc);
    return npc;
  }

  sendWave() {
    const g = this.game; const s = this.state; const map = g.currentMap();
    if (map.kind === 'interior') return false; // (they come by the streets: the wave waits until you are out)
    const W = this.waveOf(s.waves); const n = W.soldiers + W.heavy; if (!n) return false;
    const spots = this.entry(map, n); if (spots.length < n) return false;
    for (let i = 0; i < n; i++) this.soldier(i, i >= W.soldiers, map, spots[i]);
    s.stock.soldiers -= W.soldiers; s.stock.heavy -= W.heavy; s.waves += 1;
    g.notify(W.kind === 'patrol' ? '★★★★ An Army patrol is on your street.' : W.kind === 'roadblock' ? '★★★★ Soldiers are closing the street: a road block.' : '★★★★ Heavy weapons: the Army has sent a launcher team.', 'warn');
    return true;
  }

  update() {
    const g = this.game; const s = this.state; const p = g.player;
    if (!s.star4 || g.police.jailed() || g.combat.wrath) return;
    const out = this.soldiers();
    for (const n of out) {
      if (n.map !== p.map) continue;
      if (!n.dead && !n.downUntil && g.canSee(n, p.x, p.y, g.currentMap(), 12)) { s.lastSeen = g.clock.total; g.police.state.lastSeen = g.clock.total; } // (seen by the Army is seen: the three stars do not lapse under fire)
      if (n.hostile?.mode !== 'fight' && !n.dead && !n.downUntil) n.hostile = { mode: 'fight', until: g.clock.total + 100000 }; // (soldiers do not run)
    }
    for (const n of out) if (n.dead && !n.counted) { n.counted = true; s.lost[n.armyHeavy ? 'heavy' : 'soldiers'] += 1; }
    const standing = out.filter((n) => !n.dead && !n.downUntil && n.map === p.map).length;
    if (g.realTime >= s.nextWaveAt && standing < ARMY.maxOut) { if (this.sendWave() || true) s.nextWaveAt = g.realTime + ARMY.waveEvery; }
  }

  minuteTick() {
    const g = this.game; const s = this.state;
    if (s.star4 && g.clock.total - s.lastSeen > ARMY.lapseMinutes) this.endHunt('They lost you. The Army has gone back to Fort Gullcrest.');
    if (g.clock.day - (s.refitDay || 0) >= ARMY.refitDays) { // the budget refits the fort: up to what it pays for now
      s.refitDay = g.clock.day; const cap = this.capacity();
      s.stock.soldiers = Math.min(cap.soldiers, s.stock.soldiers + Math.ceil(cap.soldiers * ARMY.refitShare));
      s.stock.heavy = Math.min(cap.heavy, s.stock.heavy + Math.ceil(cap.heavy * ARMY.refitShare));
    }
  }

  /** The hunt is over (lost you, arrested, or a settlement): the soldiers still standing go home, back into the stock. */
  endHunt(text = '') {
    const g = this.game; const s = this.state; if (!s.star4) return;
    s.star4 = false; s.officerKills = 0;
    for (const n of this.soldiers()) { if (!n.dead) s.stock[n.armyHeavy ? 'heavy' : 'soldiers'] += 1; g.npcs.delete(n.id); }
    if (text) g.notify(text, 'info');
  }

  /** Hands up to a soldier close by: arrested, as by the police. */
  surrender() {
    const g = this.game; const p = g.player;
    const near = this.soldiers().find((n) => !n.dead && !n.downUntil && n.map === p.map && dist(n.x, n.y, p.x, p.y) < 8 * TILE);
    if (!near) return null;
    g.bark(near, 'Down on the ground! Hands where I can see them!');
    this.endHunt();
    g.police.sendToJail('surrendered to the Army');
    return { ok: true, text: 'You surrender to the soldiers. They hand you to the police; your company is not touched.' };
  }
}
