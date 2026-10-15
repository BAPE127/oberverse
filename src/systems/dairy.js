// Chuckie's Cheese (v0.29.0): the dairy at Lariat, the company on the
// exchange (CHZ), and the five talking lead cows of q_lost_herd.
//
// State: game.world.dairy (created on first use, so older saves pick it up
// with every lead cow still loose, no shares and nothing paid out):
//   cows        { id: { status: 'loose' | 'roped' | 'home', homeDay } }
//   rewarded    the herd reward has been paid (once, ever)
//   sharesOwned the player's CHZ shares (Chuckie keeps the rest)
//   sharePrice, index (milk-price index), lastDay, dividendsPaid, history
//
// The lead cows are ordinary NPCs. This system holds their intent ('dairy',
// one of npcSystem's HELD_INTENTS) while they're loose (standing at their
// hideout) or roped (walking after you); once home they return to their
// paddock schedule. Nothing here moves a cow faster than she can walk:
// a roped cow follows you on foot, crosses a gate or a map edge with you
// only when she's right behind you, waits outside interiors, and stands
// still if you drive off or get too far ahead.
import { TILE } from '../core/util.js';
import { findPath } from '../world/pathfinding.js';

const STEP = 0.4; // real seconds between follow updates
const FOLLOW_GAP = 1.6; // tiles: close enough, stop walking
const LOSE_TILES = 30; // further than this and she just waits for you
const CROSS_TILES = 7; // she comes through a gate or over a map edge with you if this close
const HELD = 1e9;

export function freshDairy(content) {
  const d = content.dairy;
  const cows = {};
  for (const id of Object.keys(d?.cows || {})) cows[id] = { status: 'loose' };
  return { cows, rewarded: false, sharesOwned: 0, sharePrice: d?.config.startPrice ?? 100, index: 1, lastDay: 0, dividendsPaid: 0, history: [] };
}

export class Dairy {
  constructor(game) {
    this.game = game;
    this.acc = 0;
    this.lastPos = null;
    game.bus.on('map:entered', (e) => this.onMapEntered(e));
  }

  get def() {
    return this.game.content.dairy;
  }
  get cfg() {
    return this.def.config;
  }
  get state() {
    const g = this.game;
    if (!g.world.dairy) {
      g.world.dairy = freshDairy(g.content);
      this.placeLoose();
    }
    const s = g.world.dairy;
    for (const id of Object.keys(this.def.cows)) if (!s.cows[id]) s.cows[id] = { status: 'loose' };
    return s;
  }

  status(id) {
    return this.state.cows[id]?.status || 'loose';
  }
  count(status) {
    return Object.values(this.state.cows).filter((c) => c.status === status).length;
  }
  get questState() {
    return this.game.quests.state('q_lost_herd').state;
  }

  // -------------------------------------------------------------- production
  /** Share of the parlour's capacity the herd is giving (each missing lead cow costs leadPenalty). */
  capacity() {
    const missing = Object.keys(this.def.cows).length - this.count('home');
    return Math.max(0, 1 - this.cfg.leadPenalty * missing);
  }

  /** A day's numbers at a given capacity (default: today's). */
  numbers(capacity = this.capacity(), index = this.state.index) {
    const c = this.cfg;
    const litres = Math.round(c.herd * c.litresPerCow * capacity);
    const cheese = Math.round(litres / c.litresPerKg);
    const revenue = Math.round(cheese * c.cheesePrice * index);
    const costs = Math.round(c.fixedCosts + litres * c.costPerLitre);
    return { capacity, litres, cheese, revenue, costs, profit: revenue - costs };
  }

  dividendPerShare(n = this.numbers()) {
    return (Math.max(0, n.profit) * this.cfg.payout) / this.cfg.shares;
  }

  /**
   * What the market thinks a share is worth: the book value plus a multiple of
   * earnings, where earnings are mostly the dairy's normal earnings — the town
   * knows the cows will be found sooner or later, so the round-up is largely
   * priced in already and knowing about it is no edge.
   */
  fairValue() {
    const c = this.cfg;
    const now = this.numbers().profit;
    const normal = this.numbers(1, 1).profit;
    const w = c.recoveryWeight;
    return c.bookPerShare + (c.pe * 365 * ((1 - w) * now + w * normal)) / c.shares;
  }

  /** 18:00: the day's milk is sold, dividends paid, and CHZ moves toward its fair value. */
  dailyTick() {
    const g = this.game;
    const s = this.state;
    const c = this.cfg;
    if (s.lastDay === g.clock.day) return;
    s.lastDay = g.clock.day;
    const n = this.numbers();
    const dps = this.dividendPerShare(n);
    const pay = Math.floor(dps * s.sharesOwned);
    if (pay > 0) {
      g.player.money += pay;
      s.dividendsPaid += pay;
      g.bus.emit('money:changed', { delta: pay, total: g.player.money });
      g.notify(`Chuckie's Cheese paid a dividend: ${pay} obols.`, 'good');
    }
    const fair = this.fairValue();
    const mood = 1 + (g.rng.next() * 2 - 1) * c.noise;
    s.sharePrice = Math.max(5, Math.round((s.sharePrice + (fair - s.sharePrice) * c.priceAdjust) * mood));
    s.index = Math.round(Math.min(1.2, Math.max(0.8, s.index + (g.rng.next() * 2 - 1) * c.indexDrift)) * 1000) / 1000;
    s.history.push({ day: g.clock.day, litres: n.litres, cheese: n.cheese, profit: n.profit, price: s.sharePrice, dividend: Math.round(dps * 1000) / 1000 });
    if (s.history.length > 14) s.history.shift();
  }

  // ------------------------------------------------------------------ shares
  holdingsValue() {
    const s = this.game.world.dairy;
    return s ? s.sharesOwned * s.sharePrice : 0;
  }

  quote(n) {
    const s = this.state;
    const gross = s.sharePrice * n;
    return { gross, fee: Math.ceil(gross * this.cfg.fee) };
  }

  buyShares(n = 1) {
    const g = this.game;
    const s = this.state;
    const room = this.cfg.maxPlayerShares - s.sharesOwned;
    if (n <= 0) return { ok: false, text: 'Buy how many?' };
    if (n > room) return { ok: false, text: room > 0 ? `Chuckie's Cheese only floats so many shares: you can buy ${room} more.` : 'You hold as much of Chuckie\'s Cheese as the exchange will let one investor own. Chuckie keeps the rest.' };
    const q = this.quote(n);
    if (g.player.money < q.gross + q.fee) return { ok: false, text: 'You cannot afford that many shares (with the broker\'s fee).' };
    g.player.money -= q.gross + q.fee;
    s.sharesOwned += n;
    g.bus.emit('money:changed', { delta: -(q.gross + q.fee), total: g.player.money });
    return { ok: true, text: `Bought ${n} CHZ for ${q.gross} obols (+${q.fee} fee).` };
  }

  sellShares(n = 1) {
    const g = this.game;
    const s = this.state;
    if (n <= 0 || s.sharesOwned < n) return { ok: false, text: 'You do not own that many shares.' };
    const q = this.quote(n);
    const value = Math.max(0, q.gross - q.fee);
    s.sharesOwned -= n;
    g.player.money += value;
    g.bus.emit('money:changed', { delta: value, total: g.player.money });
    return { ok: true, text: `Sold ${n} CHZ for ${value} obols (after a ${q.fee} fee).` };
  }

  // ------------------------------------------------------------- the round-up
  /** Throw the lasso at a lead cow (from her dialogue). */
  rope(id) {
    const g = this.game;
    const s = this.state;
    const cow = this.def.cows[id];
    const npc = g.npcs.get(id);
    if (!cow || !npc) return { ok: false, text: 'That\'s not one of Chuckie\'s lead cows.' };
    if (s.cows[id].status !== 'loose') return { ok: false, text: `${cow.name} is already ${s.cows[id].status === 'home' ? 'home' : 'on a rope'}.` };
    if (!g.inventory.count(this.def.lasso)) return { ok: false, text: 'You need a lasso. Lariat Mercantile sells them.' };
    if (this.questState === 'not_started') g.quests.start('q_lost_herd');
    s.cows[id] = { status: 'roped' };
    this.syncQuest();
    this.hold(npc);
    g.bus.emit('sfx', { id: 'sfx_quest' });
    g.notify(`You roped ${cow.name}. Lead her back to the paddock by Chuckie's barns.`, 'good');
    return { ok: true };
  }

  /** The intent for a lead cow, from her status. */
  hold(npc) {
    const g = this.game;
    const st = this.status(npc.id);
    const cow = this.def.cows[npc.id];
    if (st === 'home') {
      npc.speedMul = 1;
      if (npc.intent?.source === 'dairy') {
        npc.intent = null;
        g.npcSystem.think(npc, true);
      }
      return;
    }
    if (st !== 'roped') npc.speedMul = 1;
    const spot = st === 'loose' ? `lariat:${cow.hide}` : null;
    const now = g.clock.total;
    if (npc.intent?.source === 'dairy' && npc.intent.spot === spot && npc.intent.status === st) return;
    npc.intent = { activity: st === 'loose' ? 'graze' : 'idle', spot, source: 'dairy', status: st, until: now + HELD };
    npc.activity = npc.intent.activity;
    npc.chat = null;
    npc.arrived = false;
    g.npcSystem.plan(npc);
  }

  /** New state: the loose cows start out at their hideouts. */
  placeLoose() {
    const g = this.game;
    for (const [id, cow] of Object.entries(this.def.cows)) {
      const npc = g.npcs.get(id);
      const pos = g.maps.get('lariat')?.spotPx(cow.hide);
      if (!npc || !pos) continue;
      Object.assign(npc, { map: 'lariat', x: pos.x, y: pos.y, path: null, travel: null, pendingRoute: null, arrived: true });
    }
  }

  /** Keep every lead cow doing what her status says (each minute, and after a load). */
  enforce() {
    if (!this.def) return;
    for (const id of Object.keys(this.def.cows)) {
      const npc = this.game.npcs.get(id);
      if (npc) this.hold(npc);
    }
  }

  afterLoad() {
    this.lastPos = null;
    this.enforce();
  }

  /** Quest bookkeeping: the lasso stage, and the finish (once). */
  syncQuest() {
    const g = this.game;
    const s = this.state;
    if (g.quests.matches({ id: 'q_lost_herd', stage: 'lasso' }) && (g.inventory.count(this.def.lasso) || this.count('loose') < 5)) g.quests.setStage('q_lost_herd', 'roundup');
    if (this.count('home') === Object.keys(this.def.cows).length && !s.rewarded) {
      if (this.questState === 'not_started') g.quests.start('q_lost_herd');
      if (g.quests.complete('q_lost_herd', 'home')) s.rewarded = true;
    }
  }

  minuteTick() {
    if (!this.def) return;
    const g = this.game;
    this.state; // eslint-disable-line no-unused-expressions -- create on first use
    this.enforce();
    this.syncQuest();
    // Opal always keeps a lasso on the peg.
    for (const [shopId, shop] of Object.entries(g.content.shops)) {
      for (const [item, min] of Object.entries(shop.minStock || {})) {
        const st = g.world.shops[shopId];
        if (st && (st.stock[item] ?? 0) < min) st.stock[item] = min;
      }
    }
    if (Math.floor(g.clock.total) % 1440 === 18 * 60) this.dailyTick();
  }

  /** Physical: roped cows follow you; a roped cow in the paddock is home. dt in real seconds. */
  update(dt) {
    if (!this.def || !this.game.world.dairy) return;
    const g = this.game;
    const p = g.player;
    this.lastPos = { map: p.map, x: p.x, y: p.y };
    this.acc += dt;
    if (this.acc < STEP) return;
    this.acc = 0;
    const roped = this.ropedNpcs();
    let slot = 0;
    for (const npc of roped) {
      if (npc.map === 'lariat' && this.inPaddock(npc)) {
        this.bringHome(npc);
        continue;
      }
      if (npc.map !== p.map || npc.inDialogue) continue;
      this.follow(npc, slot++);
    }
  }

  ropedNpcs() {
    return Object.keys(this.def.cows).filter((id) => this.status(id) === 'roped').map((id) => this.game.npcs.get(id)).filter(Boolean);
  }

  inPaddock(npc) {
    const r = this.game.maps.get('lariat')?.def.paddock;
    if (!r) return false;
    const tx = Math.floor(npc.x / TILE);
    const ty = Math.floor(npc.y / TILE);
    return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
  }

  bringHome(npc) {
    const g = this.game;
    const cow = this.def.cows[npc.id];
    this.state.cows[npc.id] = { status: 'home', homeDay: g.clock.day };
    npc.path = null;
    this.hold(npc);
    const left = Object.keys(this.def.cows).length - this.count('home');
    g.bus.emit('sfx', { id: 'sfx_quest' });
    g.notify(left ? `${cow.name} is home! ${left} lead cow${left > 1 ? 's' : ''} still out. The dairy is at ${Math.round(this.capacity() * 100)}%.` : `${cow.name} is home — the whole lead herd is back! Go and see Chuckie.`, 'good');
    this.syncQuest();
  }

  follow(npc, slot) {
    const g = this.game;
    const p = g.player;
    const d = Math.hypot(npc.x - p.x, npc.y - p.y) / TILE;
    if (p.driving || d > LOSE_TILES) {
      // She won't run after a truck, and she won't go looking for you.
      npc.path = null;
      npc.speedMul = 1;
      return;
    }
    if (d <= FOLLOW_GAP + slot * 0.8) {
      npc.path = null;
      npc.speedMul = 1;
      return;
    }
    // a walk when she's close, a trot to catch up (about your sprint, never faster)
    npc.speedMul = d > 3 + slot ? 2 : 1.35;
    const map = g.maps.get(npc.map);
    const path = findPath(map, Math.floor(npc.x / TILE), Math.floor(npc.y / TILE), Math.floor(p.x / TILE), Math.floor(p.y / TILE), g.npcSystem.actorFor(npc), 4000);
    if (!path) return;
    const keep = Math.max(0, path.length - 1 - slot);
    npc.path = path.slice(0, keep).map((t) => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE }));
    npc.pendingRoute = null;
    npc.arrived = false;
  }

  /** You went through a gate or over a map edge: a roped cow right behind you comes too. Never indoors. */
  onMapEntered({ map, from }) {
    const g = this.game;
    const last = this.lastPos;
    this.lastPos = null;
    if (!this.def || !g.world.dairy || !last || last.map !== from || g.player.driving) return;
    const dest = g.maps.get(map);
    const src = g.maps.get(from);
    if (!dest || !src || dest.kind === 'interior' || src.kind === 'interior') return;
    for (const npc of this.ropedNpcs()) {
      if (npc.map !== from) continue;
      if (Math.hypot(npc.x - last.x, npc.y - last.y) / TILE > CROSS_TILES) continue;
      npc.map = map;
      npc.x = g.player.x;
      npc.y = g.player.y;
      npc.path = null;
      npc.travel = null;
      npc.pendingRoute = null;
      g.bus.emit('npc:moved', { npcId: npc.id, from, to: map });
    }
  }

  // ------------------------------------------------------------ journal/map
  /** Map markers: each loose or roped lead cow while the round-up is on, and the paddock when one is on a rope. */
  markers() {
    const g = this.game;
    if (!this.def || !g.world.dairy) return [];
    const on = this.questState === 'active' || (this.questState === 'not_started' && g.knowledge.knows(g.player, 'fact_lead_cows_escaped'));
    if (!on) return [];
    const out = [];
    for (const id of Object.keys(this.def.cows)) {
      if (this.status(id) === 'home') continue;
      const npc = g.npcs.get(id);
      if (npc) out.push({ questId: 'q_lost_herd', map: npc.map, x: npc.x / TILE, y: npc.y / TILE, cow: id });
    }
    if (this.count('roped')) {
      const s = g.maps.get('lariat')?.spot('paddock_centre');
      if (s) out.push({ questId: 'q_lost_herd', map: 'lariat', x: s.x + 0.5, y: s.y + 0.5 });
    }
    return out;
  }

  report() {
    const n = this.numbers();
    this.game.notify(`Chuckie's Cheese: ${this.count('home')}/5 lead cows home · parlour at ${Math.round(n.capacity * 100)}% · ${n.litres} L milk, ${n.cheese} kg cheese a day · CHZ ${this.state.sharePrice}.`, 'info');
  }

  interact(prop) {
    if (prop.interact.action === 'board') return { type: 'panel', panel: 'exchange', opts: { company: 'chz' } };
    return { type: 'message', text: prop.examine || 'Cheese.' };
  }

  // --------------------------------------------------------------- content
  /** { dairy: … } conditions. */
  check(val, npc) {
    const self = (id) => (id === 'self' ? npc?.id : id);
    return Object.entries(val).every(([k, v]) => {
      switch (k) {
        case 'cow': return this.status(self(v)) === (val.status ?? 'loose');
        case 'status': return true; // read with 'cow'
        case 'loose': case 'roped': case 'home': return compareCount(this.count(k), v);
        case 'rewarded': return Boolean(this.state.rewarded) === v;
        default: return false;
      }
    });
  }

  /** { dairy: … } effects. */
  effect(val, npc) {
    if (val === 'report') return this.report();
    if (val === 'accept') return this.syncQuest();
    if (val?.rope) {
      const r = this.rope(val.rope === 'self' ? npc?.id : val.rope);
      if (!r.ok) this.game.notify(r.text, 'warn');
    }
  }
}

function compareCount(n, v) {
  if (typeof v === 'number') return n === v;
  const m = /^(>=|<=|>|<|==)?\s*(\d+)$/.exec(String(v));
  if (!m) return false;
  const x = Number(m[2]);
  return { '>=': n >= x, '<=': n <= x, '>': n > x, '<': n < x }[m[1]] ?? n === x;
}
