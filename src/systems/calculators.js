// Calculators — the illicit substance of the Oberverse. Each stat has its own
// calculator (items with `calc: <stat>`). Consuming one gives a temporary boost
// followed by a comedown; repeated use builds tolerance, which weakens and
// shortens the effect and fades over time.
//
//   charm · wits · grit · finesse ─▶ +1 for ~4 h, then −1 for 1 h
//   health ─▶ heals                 energy ─▶ +energy now, −energy crash later
//
// State: player.buffs [{stat, delta, from, until, source}] and
// player.tolerance {type: n}. Game.stat(name) reads base + active buffs.
import { clamp } from '../core/util.js';

export const STATS = ['charm', 'wits', 'grit', 'finesse'];
export const CALC_TYPES = [...STATS, 'health', 'energy'];
const HIGH_MINUTES = 240;
const COMEDOWN_MINUTES = 60;
/** Minutes for one point of tolerance to fade. */
const TOLERANCE_FADE = 8 * 60;
export const STAT_MAX = 6;

export class Calculators {
  constructor(game) {
    this.game = game;
  }

  get player() {
    const p = this.game.player;
    if (!p.buffs) p.buffs = [];
    if (!p.tolerance) p.tolerance = {};
    return p;
  }

  /** 1 for a first use, falling with tolerance. */
  potency(type) {
    return 1 / (1 + 0.6 * (this.player.tolerance[type] || 0));
  }

  /** Effective stat: base plus whatever is in your system right now. */
  stat(name) {
    const p = this.player;
    const now = this.game.clock.total;
    let v = p.stats[name] ?? 2;
    for (const b of p.buffs) if (b.stat === name && now >= b.from && now < b.until) v += b.delta;
    return clamp(v, 1, STAT_MAX);
  }

  /** Active buffs for the HUD: [{stat, delta, minutesLeft}]. */
  active() {
    const now = this.game.clock.total;
    return this.player.buffs.filter((b) => STATS.includes(b.stat) && now >= b.from && now < b.until).map((b) => ({ stat: b.stat, delta: b.delta, minutesLeft: Math.ceil(b.until - now) }));
  }

  consume(type, def) {
    const g = this.game;
    const p = this.player;
    const now = g.clock.total;
    const pot = this.potency(type);
    p.tolerance[type] = (p.tolerance[type] || 0) + 1;
    p.lastToleranceTick = p.lastToleranceTick ?? now;
    const flavour = def?.use?.text ? `${def.use.text} ` : '';
    if (STATS.includes(type)) {
      if (pot < 0.3) return { ok: true, text: `${flavour}…Nothing. You've used too many ${def?.name || 'calculators'} lately. Your tolerance needs a day or two.` };
      const minutes = Math.round(HIGH_MINUTES * pot);
      // a fresh high replaces any running high of the same stat (and its comedown)
      p.buffs = p.buffs.filter((b) => b.stat !== type || b.until <= now);
      p.buffs.push({ stat: type, delta: 1, from: now, until: now + minutes, source: 'high' });
      p.buffs.push({ stat: type, delta: -1, from: now + minutes, until: now + minutes + COMEDOWN_MINUTES, source: 'comedown' });
      g.bus.emit('calc:used', { type, minutes });
      return { ok: true, text: `${flavour}+1 ${cap(type)} for ${fmt(minutes)}, then an hour's comedown.` };
    }
    if (type === 'health') {
      const heal = Math.round(40 * pot);
      p.health = Math.min(100, p.health + heal);
      g.bus.emit('calc:used', { type });
      return { ok: true, text: `${flavour}+${heal} health.` };
    }
    if (type === 'energy') {
      const boost = Math.round(45 * pot);
      p.energy = Math.min(100, p.energy + boost);
      p.buffs.push({ stat: 'energy', delta: -Math.round(15 * pot), from: now + 180, until: now + 181, source: 'crash' });
      g.bus.emit('calc:used', { type });
      return { ok: true, text: `${flavour}+${boost} energy. (You'll crash in about three hours.)` };
    }
    return { ok: false, text: 'Nothing happens.' };
  }

  minuteTick() {
    const g = this.game;
    const p = this.player;
    const now = g.clock.total;
    // energy crashes land
    for (const b of p.buffs) {
      if (b.source === 'crash' && !b.done && now >= b.from) {
        b.done = true;
        p.energy = Math.max(0, p.energy + b.delta);
        g.notify(`The Overclock wears off. You crash. (${b.delta} energy)`, 'warn');
      }
      if (b.source === 'comedown' && !b.announced && now >= b.from && now < b.until) {
        b.announced = true;
        g.notify(`The ${cap(b.stat)} high wears off. Comedown: −1 ${cap(b.stat)} for an hour.`, 'warn');
      }
    }
    if (p.buffs.length) p.buffs = p.buffs.filter((b) => b.until > now);
    // tolerance fades
    if (p.lastToleranceTick !== undefined && now - p.lastToleranceTick >= TOLERANCE_FADE) {
      p.lastToleranceTick = now;
      for (const k of Object.keys(p.tolerance)) {
        p.tolerance[k] = Math.max(0, p.tolerance[k] - 1);
        if (!p.tolerance[k]) delete p.tolerance[k];
      }
    }
  }
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
