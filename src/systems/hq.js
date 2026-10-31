// The headquarters (v0.86.0): game.hq. The parent company can buy any of three offices (src/content/hq.js), paying from its own account
// only; from then on it pays their upkeep each morning. Owning one opens its door and its hall. Buying is an asset bought and a cost paid,
// never a source of money, and an office is only ever a place: its seats and desks come into use when officers work there (v0.87.0).
//
// State (world.hq, created on first use, saved): { v: 1, owned: { tier: { day, paid } }, lastDay, log: [{ day, text }] }
import { HQ_TIERS, HQ_ORDER } from '../content/hq.js';

const money = (n) => `${Math.round(n).toLocaleString('en-US')} obols`;

export class Headquarters {
  constructor(game) { this.game = game; }

  get K() { return this.game.corp; }
  peek() { return this.game.world?.hq || null; }
  get state() { return (this.game.world.hq ||= { v: 1, owned: {}, lastDay: 0, log: [] }); }
  owns(tier) { return Boolean(this.peek()?.owned?.[tier]); }
  owned() { return HQ_ORDER.filter((t) => this.owns(t)); }
  /** The biggest office the parent owns (where its officers will work), or null. */
  best() { return [...this.owned()].pop() || null; }

  /** Can the parent buy this office now, and if not, why. */
  canBuy(tier) {
    const T = HQ_TIERS[tier];
    if (!T) return { ok: false, why: 'There is no such office.' };
    if (this.owns(tier)) return { ok: false, why: 'The parent already owns it.' };
    if (!this.K.group.parent) return { ok: false, why: 'Found a parent company first: it is the parent that owns an office.' };
    const a = this.K.account('parent');
    if (!a.funded) return { ok: false, why: 'The parent has no money of its own yet: pay into it first.' };
    if (a.cash < T.price) return { ok: false, why: `The parent holds ${money(a.cash)}; it needs ${money(T.price)}.` };
    return { ok: true, why: '' };
  }

  /** What the Group app shows: each office with its state. */
  view() {
    return HQ_ORDER.map((id) => ({ ...HQ_TIERS[id], owned: this.owns(id), since: this.peek()?.owned?.[id]?.day ?? null, ...this.canBuy(id) }));
  }

  buy(tier) {
    const c = this.canBuy(tier);
    if (!c.ok) return { ok: false, text: c.why };
    const T = HQ_TIERS[tier];
    const g = this.game;
    if (!this.K.pay('parent', T.price, { cat: 'capex' })) return { ok: false, text: `The parent cannot pay ${money(T.price)}.` };
    const s = this.state;
    s.owned[tier] = { day: g.clock.day, paid: T.price };
    this.note(`Bought ${T.name} for ${money(T.price)}.`);
    g.tablet.post('news', `🏢 ${this.K.nameOf('parent')} bought ${T.name}.`, 'good');
    g.bus.emit('hq:bought', { tier });
    return { ok: true, text: `${this.K.nameOf('parent')} now owns ${T.name}. Its door is open; upkeep is ${money(T.upkeep)} a day.` };
  }

  note(text) {
    const s = this.state;
    s.log.push({ day: this.game.clock.day, text });
    if (s.log.length > 40) s.log.shift();
  }

  /** Each morning, once: the parent pays to keep what it owns open. A day it cannot pay in full becomes arrears, as for any company. */
  dailyTick() {
    const s = this.peek();
    if (!s || !Object.keys(s.owned).length) return;
    const day = this.game.clock.day;
    if (s.lastDay >= day) return;
    s.lastDay = day;
    for (const t of this.owned()) this.K.pay('parent', HQ_TIERS[t].upkeep, { cat: 'upkeep', owe: true, quiet: true });
  }

  /** What owning costs a day, all offices together. */
  upkeepPerDay() { return this.owned().reduce((a, t) => a + HQ_TIERS[t].upkeep, 0); }
}
