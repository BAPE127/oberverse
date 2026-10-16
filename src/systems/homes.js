// Homes (v0.36.0): breaking in, and being invited in.
//
// Every home's doors carry `lock.home` (its residents). The player can:
//  - be INVITED: a resident who trusts you enough (talk to them: "Could I visit
//    you at home some time?") opens their doors to you, 08:00–22:00;
//  - PICK the lock (a Lockpick Set from Sal's Surplus): a few seconds standing
//    still at the door, quiet — only someone who can see you notices — and the
//    pick may snap; the door then stays open for an hour;
//  - FORCE the door (a crowbar): instant and loud (heard down the street); the
//    door is broken until it's mended next day, and when a resident comes home
//    to it they call the police (an incident, with nobody to name you — unless
//    somebody saw);
// and inside, a resident who catches you in their home (not invited) shouts and
// it's burglary. The dresser in each flat is theirs: what you take is marked as
// stolen from them (for a pawnshop, later).
//
// State (saved): game.world.homes = { open: { doorId: { until, forced, noticed } }, invited: { npcId: true } }.
import { TILE, dist } from '../core/util.js';
import { inWindow } from '../world/clock.js';
import { remember } from '../sim/memory.js';

const PICK_SECONDS = 4.5;
const PICK_SNAP = 0.22; // chance a pick snaps (and the attempt fails)
const PICKED_MINUTES = 60;
const FORCED_MINUTES = 24 * 60;
const INVITE_TRUST = 25; // or affection
const INVITE_AFFECTION = 30;
const VISITING = { from: '08:00', to: '22:00' };

export class Homes {
  constructor(game) {
    this.game = game;
    this.picking = null;
    this.caughtOn = null; // the visit (map + entry time) a resident already caught you on
    game.bus.on('map:entered', ({ map }) => { this.enteredAt = game.clock.total; this.enteredMap = map; });
  }

  get state() {
    const w = this.game.world;
    if (!w.homes) w.homes = { open: {}, invited: {} };
    return w.homes;
  }

  /** Residents whose home this door is (null if it isn't a home's door). */
  residents(door) {
    return door?.lock?.home || null;
  }

  invited(npcId) {
    return Boolean(this.state.invited[npcId]);
  }

  /** Called from Game.doorLockReason: is this home door open to the player right now? */
  opensFor(door) {
    const who = this.residents(door);
    if (!who) return false;
    const o = this.state.open[door.id];
    if (o && o.until > this.game.clock.total) return true;
    return who.some((id) => this.invited(id)) && inWindow(this.game.clock.minuteOfDay, VISITING.from, VISITING.to);
  }

  /** Where a character lives: their home's front-door residence id, or null. */
  homeOf(npcId) {
    return this.game.content.life?.homes?.[npcId]?.home || null;
  }

  // ------------------------------------------------------------- break in
  /** E at a locked home door: what you can do about it. */
  inspect(doorId) {
    const g = this.game;
    const door = g.currentMap().doors.find((d) => d.id === doorId);
    if (!door) return { type: 'none' };
    const names = this.residents(door).map((id) => g.npcs.get(id)?.profile.shortName).filter(Boolean).join(' & ');
    const options = [];
    if (g.inventory.count('item_lockpick')) options.push({ label: 'Pick the lock (quiet, takes a moment — burglary)', call: ['homes', 'startPick', doorId] });
    if (g.inventory.count('item_crowbar')) options.push({ label: 'Force the door with the crowbar (loud — burglary)', call: ['homes', 'force', doorId] });
    options.push({ label: 'Leave it', call: ['vehicles', 'noop'] });
    const how = options.length > 1 ? '' : ' You\'d need a lockpick (Sal\'s Surplus sells them, no questions asked) or a crowbar.';
    return { type: 'choices', title: door.label || 'A locked door', text: `${names ? `${names} live${names.includes('&') ? '' : 's'} here. ` : ''}The door is locked.${how}`, options };
  }

  startPick(doorId) {
    if (!this.game.inventory.count('item_lockpick')) return { ok: false, text: 'You need a lockpick.' };
    this.picking = { doorId, t: 0, need: PICK_SECONDS * (1.3 - 0.1 * this.game.stat('finesse')) };
    this.game.bus.emit('sfx', { id: 'sfx_locked' });
    return { ok: true, text: 'You kneel at the lock and go to work with the picks…' };
  }

  /** Runs while picking: stand still at the door or it's abandoned. */
  updatePick(dt, input) {
    const g = this.game;
    const p = this.picking;
    const door = g.currentMap().doors.find((d) => d.id === p.doorId);
    if (!door || Math.hypot(input.x || 0, input.y || 0) > 0.2 || dist((door.x + 0.5) * TILE, (door.y + 0.5) * TILE, g.player.x, g.player.y) > 2.2 * TILE) {
      this.picking = null;
      g.notify('You leave the lock alone.', 'info');
      return;
    }
    p.t += dt;
    if (p.t < p.need) return;
    this.picking = null;
    if (g.rng.chance(PICK_SNAP)) {
      g.inventory.remove('item_lockpick', 1);
      g.bus.emit('sfx', { id: 'sfx_fail' });
      g.notify('Snap. The pick breaks off in the lock. (Lockpick Set lost.)', 'warn');
      return;
    }
    this.state.open[door.id] = { until: g.clock.total + PICKED_MINUTES, forced: false };
    g.bus.emit('sfx', { id: 'sfx_door' });
    g.reportCrime({ fact: 'fact_player_burglary', map: g.player.map, x: g.player.x, y: g.player.y, radius: 5 });
    g.bus.emit('home:broken', { door: door.id, how: 'picked' });
    g.notify('Click. The lock gives. (It\'ll stay unlocked for about an hour.)', 'warn');
  }

  force(doorId) {
    const g = this.game;
    const door = g.currentMap().doors.find((d) => d.id === doorId);
    if (!door || !g.inventory.count('item_crowbar')) return { ok: false, text: 'You need a crowbar.' };
    this.state.open[door.id] = { until: g.clock.total + FORCED_MINUTES, forced: true, noticed: false, map: g.player.map, x: g.player.x, y: g.player.y };
    g.bus.emit('sfx', { id: 'sfx_pry' });
    g.reportCrime({ fact: 'fact_player_burglary', map: g.player.map, x: g.player.x, y: g.player.y, radius: 14 });
    g.bus.emit('home:broken', { door: door.id, how: 'forced' });
    return { ok: true, text: 'CRACK. The frame splinters and the door swings in. Everyone on the street heard that.' };
  }

  // ------------------------------------------------------------- invitations
  /** Talking to someone: "Could I visit you at home some time?" Returns what they say (and invites you, if they trust you). */
  askInvite(npc) {
    const g = this.game;
    if (!this.homeOf(npc.id)) return { ok: false, text: 'I\'d rather keep that to myself.' };
    if (this.invited(npc.id)) return { ok: true, text: 'You know where I live. Door\'s open — daytime, mind.' };
    const rel = g.relationships.get(npc, 'player');
    const lines = g.content.dialogues[npc.profile.dialogue]?.homeInvite;
    if (rel.trust >= INVITE_TRUST || rel.affection >= INVITE_AFFECTION) {
      this.state.invited[npc.id] = true;
      remember(npc, { text: 'Told the newcomer they could come round to mine.', tag: 'invited_home', about: 'player', importance: 4 }, g.clock.total);
      g.bus.emit('home:invited', { npcId: npc.id });
      return { ok: true, invited: true, text: lines?.yes || 'Why not? Come round some time — eight till ten. Wipe your feet.' };
    }
    return { ok: false, text: lines?.no || 'My home? We\'re not there yet, friend.' };
  }

  // ------------------------------------------------------------- each minute
  minuteTick() {
    const g = this.game;
    const now = g.clock.total;
    const s = this.state;
    for (const [id, o] of Object.entries(s.open)) {
      if (o.until <= now) { delete s.open[id]; continue; }
      // a resident comes home to a forced door: they call the police
      if (o.forced && !o.noticed) {
        const door = this.findDoor(id);
        if (!door) continue;
        const home = door.lock.home.map((r) => g.npcs.get(r)).find((n) => n && (n.map === door.to.map || (n.map === o.map && dist(n.x, n.y, o.x, o.y) < 3 * TILE)));
        if (home) {
          o.noticed = true;
          g.bark(home, 'Someone\'s broken into my home!');
          remember(home, { text: 'Came home to find my door forced.', tag: 'burgled', importance: 8 }, now);
          g.police?.placeCall(3, { map: o.map, x: o.x, y: o.y }, { fact: 'fact_player_burglary', witnesses: [] });
        }
      }
    }
    this.catchIntruder();
  }

  /** You're in a home that isn't yours, uninvited, and a resident is there: "GET OUT!" */
  catchIntruder() {
    const g = this.game;
    const map = g.currentMap();
    const who = map.def.home;
    if (!who || who.some((id) => this.invited(id))) return;
    const visit = `${map.id}@${this.enteredAt}`;
    if (this.caughtOn === visit) return;
    const r = who.map((id) => g.npcs.get(id)).find((n) => n && n.map === map.id && n.activity !== 'sleep' && g.canSee(n, g.player.x, g.player.y, map, 12));
    const sleeper = who.map((id) => g.npcs.get(id)).find((n) => n && n.map === map.id && n.activity === 'sleep');
    // a sleeper wakes if you're close (or unlucky)
    const woken = !r && sleeper && dist(sleeper.x, sleeper.y, g.player.x, g.player.y) < 2.5 * TILE && g.rng.chance(0.25) ? sleeper : null;
    const n = r || woken;
    if (!n) return;
    this.caughtOn = visit;
    g.bark(n, woken ? 'Wha— WHO\'S THERE?! GET OUT!' : 'What are you doing in my home?! GET OUT!');
    g.relationships.adjust(n, 'player', { trust: -20, affection: -15, suspicion: 30 }, 'caught_burgling');
    remember(n, { text: 'Caught the newcomer inside my home.', tag: 'caught_burgling', about: 'player', importance: 9 }, g.clock.total);
    g.reportCrime({ fact: 'fact_player_burglary', map: map.id, x: g.player.x, y: g.player.y, radius: 12 });
  }

  findDoor(id) {
    for (const m of this.game.maps.values()) {
      const d = m.doors.find((x) => x.id === id);
      if (d) return d;
    }
    return null;
  }

  /** The locked home door you're standing at, facing (for the E prompt), or null. */
  doorAhead() {
    const g = this.game;
    const p = g.player;
    const map = g.currentMap();
    const fx = p.facing === 'left' ? -1 : p.facing === 'right' ? 1 : 0;
    const fy = p.facing === 'up' ? -1 : p.facing === 'down' ? 1 : 0;
    for (const k of [0.6, 1]) {
      const d = map.doorAt(Math.floor((p.x + fx * k * TILE) / TILE), Math.floor((p.y + fy * k * TILE) / TILE));
      if (d?.lock?.home && !g.playerCanPass(d)) return d;
    }
    return null;
  }
}
