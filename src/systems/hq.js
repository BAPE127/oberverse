// The headquarters (v0.86.0): game.hq. The parent company can buy any of three offices (src/content/hq.js), paying from its own account
// only; from then on it pays their upkeep each morning. Owning one opens its door and its hall. Buying is an asset bought and a cost paid,
// never a source of money, and an office is only ever a place: its seats and desks come into use when officers work there (v0.87.0).
//
// State (world.hq, created on first use, saved): { v: 1, owned: { tier: { day, paid } }, lastDay, log: [{ day, text }] }
import { HQ_TIERS, HQ_ORDER, hqMapId, hqQuartersId } from '../content/hq.js';
import { ROLES } from '../content/personnel.js';
import { hash2, hashString } from '../core/rng.js';
import { STYLE, STYLE_SLOTS, STYLE_DEFAULT, optionOf, priceOf } from '../content/hqStyle.js';

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

  // ------------------------------------------------------------- officers at work (v0.87.0)
  /** Everyone employed by the parent company, in the order they were taken on. */
  officers() {
    return Object.values(this.K.personnel.peek()?.staff || {}).filter((x) => x.employer === 'parent' && x.status === 'active').sort((a, b) => (a.hiredDay ?? 0) - (b.hiredDay ?? 0) || (a.id < b.id ? -1 : 1));
  }

  /** How many officers the biggest office you own holds (0: none owned, so no limit applies). */
  seats() { const t = this.best(); return t ? HQ_TIERS[t].seats : 0; }

  /** The officers who have a seat — the first ones taken on — and the rest, paid and without a desk. */
  seated() {
    const all = this.officers();
    const n = this.seats();
    return n ? all.slice(0, n) : [];
  }

  /** Why a parent-company hire cannot be made, or null. A company with no office has no limit. */
  seatError(exceptId = null) {
    const t = this.best();
    if (!t) return null;
    const n = this.officers().filter((x) => x.id !== exceptId).length;
    return n >= HQ_TIERS[t].seats ? `${HQ_TIERS[t].name} has seats for ${HQ_TIERS[t].seats} officers and they are all taken: buy a bigger office first.` : null;
  }

  /** A body for an officer: deterministic from their id (no random numbers are drawn), a suit, a desk, a cot. */
  profileOf(x, rank, tier) {
    const T = HQ_TIERS[tier];
    const h = (k) => hash2(hashString(x.id), k);
    const pick = (a, k) => a[Math.floor(h(k) * a.length)];
    const hall = hqMapId(tier);
    const quarters = hqQuartersId(tier);
    const desk = `${hall}:desk_${rank}`;
    const lunch = T.desks > 4 ? `${hall}:boardroom` : `${hall}:reception`;
    const common = `${quarters}:common`;
    const R = ROLES[x.role];
    return {
      id: x.id, name: x.name, shortName: x.first || x.name.split(' ')[0], tier: 'minor', origin: 'generated', faction: null, noSnitch: true, hqStaff: true,
      role: `${R?.name || 'Officer'} at ${this.K.nameOf('parent')}.`,
      dialogue: 'dlg_officer', voice: { wave: pick(['triangle', 'square', 'sine'], 1), pitch: 110 + Math.floor(h(2) * 200), variance: 20, rate: 0.95 + h(3) * 0.3 },
      appearance: { skin: pick(['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430', '#f0c8a8', '#d9a77c'], 4), hair: pick(['#1a1410', '#3a2a20', '#6a3a2a', '#c9813a', '#e8e2d4', '#8a7a6a', '#2a1e1a'], 5), hairStyle: pick(['short', 'messy', 'curly', 'parted', 'bun', 'ponytail', 'long'], 6), hatColor: null,
        outfit: pick(['#2a3550', '#3a3a44', '#5a2a34', '#2a4a4a', '#4a3a2a'], 7), legs: '#22222a', build: pick(['thin', 'average', 'broad', 'wiry'], 8), height: 0.94 + h(9) * 0.14, accessories: [], accent: '#c9a24a' },
      personality: { traits: ['punctual', x.style || 'steady'], sociability: 0.5, conscientiousness: 0.8, impulsiveness: 0.2, discretion: 0.8, honesty: 0.7, empathy: 0.5 },
      speech: { rumorPrefix: 'Around the office they say', factPrefix: 'Chief,', refuse: 'That is not something I can discuss, Chief.' },
      combat: { never: true, maxHealth: 90 }, walkSpeed: 1, punctuality: 10,
      schedule: [
        { from: '09:00', to: '12:30', activity: 'work', spot: desk },
        { from: '12:30', to: '13:30', activity: 'leisure', spot: lunch },
        { from: '13:30', to: '17:30', activity: 'work', spot: desk },
        { from: '17:30', to: '23:00', activity: 'leisure', spot: common },
        { from: '23:00', to: '07:00', activity: 'sleep', spot: `${quarters}:bed_${rank}` },
        { from: '07:00', to: '09:00', activity: 'leisure', spot: common },
      ],
      impulses: [], notices: [], knowledge: [], relationships: { player: { trust: 10, affection: 0, respect: 10, suspicion: 0 } }, giftPrefs: { item_coffee: 6, tags: { food: 3 } }, opinions: {},
    };
  }

  /**
   * Make the bodies match the books: one for each seated officer, none for anyone who has left or has no seat, and a body is replaced when
   * the office they work in changes (a bigger one is bought). Cheap, and safe to call as often as you like.
   */
  sync() {
    const g = this.game;
    const tier = this.best();
    const want = new Map(this.seated().map((x, i) => [x.id, { x, rank: i + 1 }]));
    for (const id of [...g.npcs.keys()]) if (g.npcs.get(id)?.profile.hqStaff && (!want.has(id) || g.npcs.get(id).profile.hqTier !== tier)) g.npcs.delete(id);
    for (const [id, { x, rank }] of want) {
      if (g.npcs.has(id)) continue;
      const profile = { ...this.profileOf(x, rank, tier), hqTier: tier };
      g.npcs.set(id, g.createNpc(profile));
    }
    this.seen = this.K.personnel.epoch;
    this.seenTier = tier;
  }

  /** Every minute: if the people or the office changed since last looked, make the bodies match. */
  minuteTick() {
    if (!this.peek() || !this.owned().length) return;
    if (this.seen !== this.K.personnel.epoch || this.seenTier !== this.best()) this.sync();
  }

  afterLoad() { this.seen = undefined; if (this.owned().length) this.sync(); for (const t of this.owned()) this.applyStyle(t); }

  // ------------------------------------------------------------- furnishing (v0.88.0)
  /** How an office is furnished now: a choice for every slot (what it came with, unless you changed it). */
  styleOf(tier) { return { ...STYLE_DEFAULT, ...(this.peek()?.style?.[tier] || {}) }; }

  /** Can the parent choose this option for this office now, and what it costs. */
  canStyle(tier, slot, id) {
    const o = optionOf(slot, id);
    if (!HQ_TIERS[tier] || !STYLE[slot] || !o) return { ok: false, why: 'There is no such choice.', price: 0 };
    if (!this.owns(tier)) return { ok: false, why: 'The parent does not own that office.', price: 0 };
    if (o.only && !o.only.includes(tier)) return { ok: false, why: `Only ${o.only.map((t) => HQ_TIERS[t].short).join(' and ')} has ${o.name.toLowerCase()}.`, price: 0 };
    if (this.styleOf(tier)[slot] === id) return { ok: false, why: 'It is already like that.', price: 0 };
    const price = priceOf(tier, slot, id);
    const cash = this.K.account('parent').cash;
    if (price > cash) return { ok: false, why: `The parent holds ${money(cash)}; this costs ${money(price)}.`, price };
    return { ok: true, why: '', price };
  }

  /** What the style screen shows for one office: each slot, its options, which one you have and what each would cost. */
  styleView(tier) {
    const now = this.styleOf(tier);
    return STYLE_SLOTS.map((slot) => ({ slot, name: STYLE[slot].name, icon: STYLE[slot].icon, text: STYLE[slot].text, current: now[slot],
      options: STYLE[slot].options.map((o) => ({ id: o.id, name: o.name, color: o.color, here: o.id === now[slot], ...this.canStyle(tier, slot, o.id), price: priceOf(tier, slot, o.id), locked: Boolean(o.only && !o.only.includes(tier)), only: o.only ? o.only.map((x) => HQ_TIERS[x].short).join(' and ') + ' only' : '', ...(o.id === now[slot] ? { why: '' } : {}) })) }));
  }

  /** Choose it: the parent pays once, from its own account, and the hall looks different from then on. Nothing here returns money. */
  setStyle(tier, slot, id) {
    const c = this.canStyle(tier, slot, id);
    if (!c.ok) return { ok: false, text: c.why };
    const o = optionOf(slot, id);
    if (c.price > 0 && !this.K.pay('parent', c.price, { cat: 'fitout' })) return { ok: false, text: `The parent cannot pay ${money(c.price)}.` };
    const s = this.state;
    ((s.style ||= {})[tier] ||= {})[slot] = id;
    this.note(`${HQ_TIERS[tier].short}: ${STYLE[slot].name.toLowerCase()} — ${o.name}${c.price ? ` (${money(c.price)})` : ''}.`);
    this.applyStyle(tier);
    this.game.bus.emit('hq:styled', { tier, slot, id });
    return { ok: true, text: `${STYLE[slot].name}: ${o.name}.${c.price ? ` ${money(c.price)} from the parent.` : ' The original, free.'}` };
  }

  /** Make a hall look as styled: the colours of its desks and rug, its floor and its walls. (Lamps, pictures and plants are props that show or hide themselves.) */
  applyStyle(tier) {
    const map = this.game.maps?.get(hqMapId(tier));
    if (!map) return;
    const now = this.styleOf(tier);
    const floor = optionOf('floor', now.floor);
    const walls = optionOf('walls', now.walls);
    const desks = optionOf('desks', now.desks);
    const plain = now.floor === STYLE_DEFAULT.floor && now.walls === STYLE_DEFAULT.walls;
    map.styleOverride = plain ? null : { wall: walls.wall, floor: { t: floor.tile } };
    for (const p of map.props) {
      if (p.type === 'desk') p.color = desks.color;
      else if (p.id === `hq_${tier}_rug`) p.color = floor.rug;
    }
    map.styleVersion = (map.styleVersion || 0) + 1; // the ground is painted again
    map.fieldsVersion = (map.fieldsVersion || 0) + 1;
  }

  /** What owning costs a day, all offices together. */
  upkeepPerDay() { return this.owned().reduce((a, t) => a + HQ_TIERS[t].upkeep, 0); }
}
