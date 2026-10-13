// Emergent event director. Event templates (src/content/events.js) describe
// situations that may arise from world state: who is involved, when they are
// checked, conditions, probability, cooldowns, effects and follow-up events.
// Follow-ups form event chains (a bang today -> a noise citation tomorrow).
import { check } from '../sim/conditions.js';
import { MINUTES_PER_DAY, parseTime } from '../world/clock.js';

export class EventDirector {
  constructor(game) {
    this.game = game;
    game.bus.on('npc:arrived', (e) => this.onArrive(e));
  }
  get templates() {
    return this.game.content.events;
  }
  get state() {
    return this.game.world.events;
  }

  /** Called once per game hour. */
  hourly() {
    for (const t of Object.values(this.templates)) {
      if (t.check === 'hourly') this.consider(t);
    }
    this.runPending();
  }

  /** Called every game minute for pending chained events. */
  runPending() {
    const now = this.game.clock.total;
    const due = this.state.pending.filter((p) => p.at <= now);
    if (!due.length) return;
    this.state.pending = this.state.pending.filter((p) => p.at > now);
    for (const p of due) {
      const t = this.templates[p.id];
      if (t) this.consider(t, { forced: true });
    }
  }

  onArrive({ npcId, map, activity }) {
    for (const t of Object.values(this.templates)) {
      if (t.check !== 'onArrive' || t.npc !== npcId) continue;
      if (t.activity && t.activity !== activity) continue;
      if (t.map && t.map !== map) continue;
      this.consider(t);
    }
  }

  consider(t, { forced = false } = {}) {
    const g = this.game;
    const now = g.clock.total;
    const last = this.state.lastFired[t.id];
    if (t.once && last !== undefined) return false;
    if (last !== undefined && t.cooldownMinutes && now - last < t.cooldownMinutes) return false;
    const npc = t.npc ? g.npcs.get(t.npc) : undefined;
    if (t.npc && !npc) return false;
    if (t.when && !check(t.when, g, npc)) return false;
    if (!forced && t.chance !== undefined && !g.rng.chance(t.chance)) return false;
    this.fire(t, npc);
    return true;
  }

  fire(t, npc) {
    const g = this.game;
    const now = g.clock.total;
    this.state.lastFired[t.id] = now;
    this.state.log.push({ id: t.id, at: now });
    if (this.state.log.length > 50) this.state.log.shift();
    g.bus.emit('event:fired', { id: t.id, name: t.name });
    g.applyEffects(t.effects, npc);
    for (const f of t.followUps || []) {
      let at = now + (f.delayMinutes ?? 0);
      if (f.at) {
        const target = parseTime(f.at);
        const dayStart = Math.floor(at / MINUTES_PER_DAY) * MINUTES_PER_DAY;
        at = dayStart + target;
        if (at <= now) at += MINUTES_PER_DAY;
      }
      this.state.pending.push({ id: f.id, at });
    }
  }
}
