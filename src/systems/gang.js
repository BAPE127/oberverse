// The Sums of Anarchy and the calculator trade (v0.11.0).
//
//   customers ── start out buying from the gang ('gang'); some only talk to you
//   once a friend vouches for you ('locked'). A free sample may win one over
//   ('player') — which steals them from the gang.
//   your customers ── page you orders (type, quantity, price, a meeting spot
//   and a two-hour window). Deliver on time: money, satisfaction, habit, and
//   after three good deals a referral. Miss it and they sour; sour enough and
//   they go back to the gang.
//   gang anger 0–100 ── rises with every stolen customer and deal, and with
//   violence against the crew; fades on quiet days. 25+ a warning, 50+ the
//   crew jump you in the Sumps, 75+ they hunt you across Halvermouth.
//   A truce (tribute, or handing back half your customers) cools it down.
//   Dealing is a crime: an officer who sees it comes for you.
//
// State: game.world.gang (saved).
import { TILE, clamp, dist } from '../core/util.js';
import { remember } from '../sim/memory.js';
import { isDown, isProtected } from './combat.js';
import { CALC_TYPES } from './calculators.js';

export const CHIEF = 'npc_arthur';
export const ENFORCER = 'npc_al';
/** Meeting spots for orders. */
export const DEAL_SPOTS = ['sumps_corner', 'sumps_fire_n', 'sumps_fire_w', 'sumps_fire_s', 'sumps_fire_e', 'sumps_fire_mill', 'sumps_lane', 'sumps_wreck', 'sumps_mill_road', 'sumps_south', 'sumps_shore', 'sumps_east'];
export const TIERS = [
  { min: 0, name: 'calm' },
  { min: 25, name: 'warned' },
  { min: 50, name: 'hostile' },
  { min: 75, name: 'war' },
];
const STEAL_ANGER = 12;
const DEAL_ANGER = 2;
const TRUCE_BREAK_ANGER = 40;
const TRUCE_DAYS = 7;
const AMBUSH_COOLDOWN = 120;
const HUNT_EVERY = 180;
const REFERRAL_AFTER = 3;

export const calcItem = (type) => `item_calc_${type}`;

export function freshGang(content) {
  const customers = {};
  for (const c of Object.values(content.characters)) {
    if (!c.customer) continue;
    customers[c.id] = { status: c.customer.startsKnown ? 'gang' : 'locked', addiction: 0.25, satisfaction: 50, orders: 0, misses: 0, warmth: 0, order: null };
  }
  return { anger: 0, warned: false, truceUntilDay: 0, stolen: 0, lastStealDay: 0, lastDecayDay: 1, lastOrdersDay: 0, lastHunt: 0, ambush: {}, brawl: {}, tributes: 0, customers };
}

export class Gang {
  constructor(game) {
    this.game = game;
    game.bus.on('crime', (e) => this.onCrime(e));
  }

  get state() {
    const g = this.game;
    if (!g.world.gang) g.world.gang = freshGang(g.content);
    const s = g.world.gang;
    // customers added by newer content
    for (const c of Object.values(g.content.characters)) if (c.customer && !s.customers[c.id]) s.customers[c.id] = freshGang({ characters: { [c.id]: c } }).customers[c.id];
    return s;
  }

  isGang(npc) {
    return npc?.profile.faction === 'fac_sums';
  }

  crew() {
    const now = this.game.clock.total;
    return [...this.game.npcs.values()].filter((n) => this.isGang(n) && !isDown(n, now));
  }

  customer(id) {
    return this.state.customers[id] || null;
  }

  tier() {
    const a = this.state.anger;
    let t = 0;
    TIERS.forEach((x, i) => { if (a >= x.min) t = i; });
    return t;
  }

  truce() {
    return this.state.truceUntilDay >= this.game.clock.day;
  }

  playerCustomers() {
    return Object.entries(this.state.customers).filter(([, c]) => c.status === 'player').map(([id]) => id);
  }

  // ---------------------------------------------------------------- anger
  addAnger(n, why) {
    const g = this.game;
    const s = this.state;
    const before = this.tier();
    s.anger = clamp(s.anger + n, 0, 100);
    const after = this.tier();
    if (after > before) {
      const lines = [
        null,
        'Al Gebra finds you. "Arthur\'s been doing some maths about you. He doesn\'t like the answer. Stay off our corners." (Sums of Anarchy: WARNED)',
        'Word comes through the Sumps: the Sums of Anarchy want you gone. Their crew will jump you on sight in the Sumps. (HOSTILE)',
        'Arthur Anderson has declared war on you. His crew will hunt you anywhere in Halvermouth. (WAR)',
      ];
      g.notify(lines[after], 'warn');
      if (after >= 1) s.warned = true;
      const al = g.npcs.get(ENFORCER);
      if (al && after === 1) remember(al, { text: `Warned ${g.player.name} off our corners.`, tag: 'warned_player', about: 'player', importance: 6 }, g.clock.total);
      g.bus.emit('gang:tier', { tier: after, why });
    } else if (after < before) {
      g.notify(after === 0 ? 'The Sums of Anarchy seem to have calmed down about you. For now.' : `The Sums of Anarchy are cooling off a little. (${TIERS[after].name.toUpperCase()})`, 'good');
      g.bus.emit('gang:tier', { tier: after, why });
    }
  }

  onCrime(e) {
    const victim = e.victim ? this.game.npcs.get(e.victim) : null;
    if (!this.isGang(victim)) return;
    if (e.fact === 'fact_player_murder') this.addAnger(40, 'murder');
    else if (e.fact === 'fact_player_assault') this.addAnger(10, 'assault');
  }

  /** Taking one of their customers. */
  steal(npc) {
    const g = this.game;
    const s = this.state;
    s.stolen += 1;
    s.lastStealDay = g.clock.day;
    if (this.truce()) {
      s.truceUntilDay = 0;
      g.notify('You broke the truce. Arthur will have heard by now. He hears everything.', 'warn');
      this.addAnger(TRUCE_BREAK_ANGER, 'truce broken');
    } else this.addAnger(STEAL_ANGER, 'stolen customer');
    const arthur = g.npcs.get(CHIEF);
    if (arthur) {
      remember(arthur, { text: `${g.player.name} took ${npc.profile.name} off us. In the ledger. In red.`, tag: 'stole_customer', about: 'player', importance: 7 }, g.clock.total);
      g.knowledge.learn(arthur, 'fact_player_stole_customer', { kind: 'fact', source: 'gang', at: g.clock.total });
    }
  }

  // -------------------------------------------------------------- dealing
  /** Report a deal as a crime: officers who see it come for you. Finesse shrinks who notices. */
  dealt() {
    const g = this.game;
    const p = g.player;
    const radius = Math.max(3, 9 - (g.stat('finesse') - 2) * 1.5);
    g.reportCrime({ fact: 'fact_player_dealing', map: p.map, x: p.x, y: p.y, radius });
  }

  /** Best calculator to offer this customer as a sample (their favourite if you have it). */
  sampleFor(npc) {
    const fav = npc.profile.customer?.favourite;
    if (fav && this.game.inventory.count(calcItem(fav))) return fav;
    return CALC_TYPES.find((t) => this.game.inventory.count(calcItem(t))) || null;
  }

  sampleChance(npc, type) {
    const c = this.customer(npc.id);
    const fav = npc.profile.customer.favourite === type;
    return clamp(0.3 + (fav ? 0.3 : 0) + (this.game.stat('charm') - 2) * 0.07 + (c?.warmth || 0), 0.05, 0.95);
  }

  /** Give a free sample. Returns {ok, text}. */
  sample(npc) {
    const g = this.game;
    const c = this.customer(npc.id);
    if (!c) return { ok: false, text: '' };
    if (c.status === 'player') return { ok: false, text: `${npc.profile.shortName} already buys from you.` };
    if (c.status === 'locked') return { ok: false, text: `${npc.profile.shortName} doesn't know you. Someone they trust will have to vouch for you.` };
    const type = this.sampleFor(npc);
    if (!type) return { ok: false, text: 'You don\'t have any calculators to offer.' };
    const chance = this.sampleChance(npc, type);
    g.inventory.remove(calcItem(type), 1);
    this.dealt();
    const name = g.content.items[calcItem(type)].name;
    if (g.rng.next() < chance) {
      c.status = 'player';
      c.addiction = Math.max(c.addiction, 0.3);
      c.satisfaction = 60;
      c.warmth = 0;
      this.steal(npc);
      g.bark(npc, npc.profile.customer.favourite === type ? 'Oh, that\'s the good stuff.' : 'Huh. Not bad.');
      remember(npc, { text: `${g.player.name} gave me a ${name}. Better than Minnie's.`, tag: 'sampled', about: 'player', importance: 5 }, g.clock.total);
      g.bus.emit('gang:customer', { npcId: npc.id, status: 'player' });
      return { ok: true, text: `${npc.profile.shortName} tries the ${name}… and likes it. They'll buy from you now — they'll page you when they want more. (The Sums of Anarchy won't be happy.)` };
    }
    c.warmth = Math.min(0.4, (c.warmth || 0) + 0.15);
    g.bark(npc, 'Nah. I\'ll stick with Minnie.');
    return { ok: false, text: `${npc.profile.shortName} tries the ${name} but isn't convinced. They warm to you a little. (${Math.round(chance * 100)}% chance; better with their favourite and more Charm.)` };
  }

  // --------------------------------------------------------------- orders
  placeOrders() {
    const g = this.game;
    const s = this.state;
    s.lastOrdersDay = g.clock.day;
    for (const id of this.playerCustomers()) {
      const c = s.customers[id];
      if (c.order) continue;
      const npc = g.npcs.get(id);
      if (!npc || npc.dead) continue;
      if (g.rng.next() > 0.3 + c.addiction * 0.6) continue;
      this.newOrder(npc);
    }
  }

  newOrder(npc) {
    const g = this.game;
    const c = this.customer(npc.id);
    const prof = npc.profile.customer;
    const type = g.rng.next() < 0.8 ? prof.favourite : g.rng.pick(CALC_TYPES);
    const qty = 1 + (c.addiction > 0.5 ? 1 : 0) + (g.rng.next() < 0.3 ? 1 : 0);
    const base = g.content.items[calcItem(type)].price;
    const price = Math.round(Math.min(prof.budget, base * (1 + c.addiction * 0.4)));
    const startHour = 10 + g.rng.int(0, 10);
    const dayStart = (g.clock.day - 1) * 1440;
    let from = dayStart + startHour * 60;
    if (from < g.clock.total + 30) from = Math.ceil((g.clock.total + 30) / 60) * 60;
    const spot = g.rng.pick(DEAL_SPOTS);
    c.order = { type, qty, price, spot, from, until: from + 120, day: g.clock.day };
    const where = g.maps.get('halvermouth').def.spots[spot] ? spotName(spot) : spot;
    g.notify(`📟 ${npc.profile.shortName}: ${qty}× ${g.content.items[calcItem(type)].name} at ${price} obols each — ${where}, ${hhmm(from)}–${hhmm(from + 120)}.`, 'quest');
    g.bus.emit('gang:order', { npcId: npc.id, order: c.order });
    return c.order;
  }

  orderDue(npc) {
    const c = this.customer(npc.id);
    const now = this.game.clock.total;
    return Boolean(c?.order && now >= c.order.from && now < c.order.until);
  }

  /** Hand over an order. */
  deliver(npc) {
    const g = this.game;
    const c = this.customer(npc.id);
    const o = c?.order;
    if (!o) return { ok: false, text: `${npc.profile.shortName} hasn't ordered anything.` };
    const item = calcItem(o.type);
    const name = g.content.items[item].name;
    if (g.inventory.count(item) < o.qty) return { ok: false, text: `${npc.profile.shortName} wants ${o.qty}× ${name}. You have ${g.inventory.count(item)}.` };
    g.inventory.remove(item, o.qty);
    const total = o.qty * o.price;
    g.player.money += total;
    g.bus.emit('money:changed', { delta: total, total: g.player.money });
    c.order = null;
    c.orders += 1;
    c.satisfaction = Math.min(100, c.satisfaction + 15);
    c.addiction = Math.min(1, c.addiction + 0.07);
    npc.intent = null;
    g.npcSystem.think(npc, true);
    this.dealt();
    if (!this.truce()) this.addAnger(DEAL_ANGER, 'deal');
    let text = `Sold ${o.qty}× ${name} to ${npc.profile.shortName} for ${total} obols.`;
    const ref = npc.profile.customer.refers;
    if (ref && c.orders >= REFERRAL_AFTER && this.customer(ref)?.status === 'locked') {
      this.customer(ref).status = 'gang';
      const who = g.npcs.get(ref);
      text += ` ${npc.profile.shortName} says they'll put in a word for you with ${who?.profile.name || 'a friend'}.`;
      g.bus.emit('gang:referral', { from: npc.id, to: ref });
    }
    return { ok: true, text };
  }

  // ------------------------------------------------------------- truce
  tributePrice() {
    return 30 + Math.round(this.state.anger * 2);
  }

  tribute() {
    const g = this.game;
    const price = this.tributePrice();
    if (g.player.money < price) return { ok: false, text: `Arthur wants ${price} obols. You don't have it.` };
    g.player.money -= price;
    g.bus.emit('money:changed', { delta: -price, total: g.player.money });
    this.state.tributes += 1;
    this.addAnger(-35, 'tribute');
    return { ok: true, text: `You pay Arthur ${price} obols. He counts it twice. The Sums of Anarchy cool off.` };
  }

  /** Hand back half your customers (rounded up) for a week's truce. */
  split() {
    const g = this.game;
    const s = this.state;
    const mine = this.playerCustomers();
    if (!mine.length) return { ok: false, text: 'You don\'t have any customers to give back.' };
    const back = mine.slice(0, Math.ceil(mine.length / 2));
    for (const id of back) {
      const c = s.customers[id];
      c.status = 'gang';
      c.order = null;
      c.warmth = 0;
      const npc = g.npcs.get(id);
      if (npc?.intent?.source === 'deal') { npc.intent = null; g.npcSystem.think(npc, true); }
    }
    s.anger = Math.min(s.anger, 10);
    s.truceUntilDay = g.clock.day + TRUCE_DAYS;
    g.bus.emit('gang:tier', { tier: this.tier(), why: 'truce' });
    const names = back.map((id) => g.npcs.get(id)?.profile.shortName).join(', ');
    return { ok: true, text: `You hand ${names} back to the Sums of Anarchy. Truce until the end of Day ${s.truceUntilDay}. Steal from them before then and it's war.` };
  }

  // ---------------------------------------------------------- per minute
  minuteTick() {
    const g = this.game;
    const s = this.state;
    const now = g.clock.total;
    // a new day: anger fades if you kept your head down; customers page orders at 08:00
    if (g.clock.day > s.lastDecayDay) {
      s.lastDecayDay = g.clock.day;
      if (s.lastStealDay < g.clock.day - 1 && s.anger > 0) this.addAnger(-4, 'quiet day');
    }
    if (s.lastOrdersDay < g.clock.day && g.clock.minuteOfDay >= 8 * 60) this.placeOrders();
    // orders: customers head to the meeting spot during the window; missed orders sour them
    for (const [id, c] of Object.entries(s.customers)) {
      const o = c.order;
      if (!o) continue;
      const npc = g.npcs.get(id);
      if (!npc || npc.dead) { c.order = null; continue; }
      if (now >= o.until) {
        c.order = null;
        c.misses += 1;
        c.satisfaction -= 20;
        if (npc.intent?.source === 'deal') { npc.intent = null; g.npcSystem.think(npc, true); }
        if (c.satisfaction <= 0 && c.status === 'player') {
          c.status = 'gang';
          c.satisfaction = 30;
          g.notify(`📟 ${npc.profile.shortName}: "Forget it. I'm going back to Minnie." (Lost a customer.)`, 'warn');
        } else g.notify(`📟 ${npc.profile.shortName} gave up waiting for you.`, 'warn');
        continue;
      }
      if (now >= o.from && npc.intent?.source !== 'deal' && npc.activity !== 'sleep' && !isDown(npc, now)) {
        npc.intent = { source: 'deal', activity: 'wait', spot: `halvermouth:${o.spot}`, until: o.until, label: 'waiting for you' };
        npc.activity = 'wait';
        npc.arrived = false;
        g.npcSystem.plan(npc);
      }
    }
    // war: the crew go looking for you
    if (this.tier() >= 3 && g.player.map === 'halvermouth' && now - s.lastHunt >= HUNT_EVERY && !g.police?.jailed()) {
      s.lastHunt = now;
      const hunters = this.crew().filter((n) => n.profile.combat?.fights && !isProtected(n) && n.activity !== 'sleep' && !n.hostile)
        .sort((a, b) => (a.map === 'halvermouth' ? dist(a.x, a.y, g.player.x, g.player.y) : 1e9) - (b.map === 'halvermouth' ? dist(b.x, b.y, g.player.x, g.player.y) : 1e9))
        .slice(0, 2);
      const map = g.maps.get('halvermouth');
      let best = null;
      let bd = Infinity;
      for (const [name, sp] of Object.entries(map.spots)) {
        const d = Math.hypot(sp.x * TILE - g.player.x, sp.y * TILE - g.player.y);
        if (d < bd) { bd = d; best = name; }
      }
      for (const h of hunters) {
        h.intent = { source: 'hunt', activity: 'hunt', spot: `halvermouth:${best}`, until: now + 90, label: 'hunting you' };
        h.activity = 'hunt';
        h.arrived = false;
        g.npcSystem.plan(h);
      }
      if (hunters.length) g.notify(`${hunters.map((h) => h.profile.shortName).join(' and ')} are out looking for you.`, 'warn');
    }
    this.brawls();
  }

  /** The gang and the police don't mix: insults fly whenever they cross paths. */
  brawls() {
    const g = this.game;
    const s = this.state;
    const now = g.clock.total;
    if (!g.police) return;
    const officers = g.police.activeOfficers().filter((o) => o.activity !== 'sleep' && !o.inDialogue);
    if (!officers.length) return;
    for (const m of this.crew()) {
      if (m.activity === 'sleep' || m.inDialogue || (s.brawl[m.id] || 0) > now) continue;
      const cop = officers.find((o) => o.map === m.map && dist(o.x, o.y, m.x, m.y) < 4 * TILE);
      if (!cop) continue;
      s.brawl[m.id] = now + 60;
      g.bark(m, g.rng.pick(['Oi! Pig! This is OUR street.', 'Smell that? Bacon.', 'Go back to your doughnuts.', 'No cops in the Sumps!']));
      g.bark(cop, g.rng.pick(['Watch your mouth.', 'Move along.', 'I\'ve got my eye on you.', 'One day, Sums. One day.']));
      g.bus.emit('gang:brawl', { gang: m.id, cop: cop.id });
    }
  }

  // ------------------------------------------------------------ per frame
  /** Hostile crew jump you when they see you on their turf (or anywhere in the city at war). */
  update() {
    const g = this.game;
    const t = this.tier();
    if (t < 2 || g.combat.wrath || g.police?.jailed()) return;
    const p = g.player;
    const map = g.currentMap();
    const onTurf = p.map === 'abacus' || (p.map === 'halvermouth' && (t >= 3 || /Sumps/.test(p.areaName || '')));
    if (!onTurf) return;
    const now = g.clock.total;
    const s = this.state;
    for (const m of this.crew()) {
      if (m.map !== p.map || m.hostile || m.inDialogue || m.activity === 'sleep' || isProtected(m) || !m.profile.combat?.fights) continue;
      if ((s.ambush[m.id] || 0) > now) continue;
      if (!g.canSee(m, p.x, p.y, map, 7)) continue;
      s.ambush[m.id] = now + AMBUSH_COOLDOWN;
      m.hostile = { mode: 'fight', until: now + 20 };
      m.activity = 'fight';
      g.bark(m, g.rng.pick(['That\'s the one stealing our customers!', 'Arthur says hello.', 'Time to settle the account!', 'You owe us. With interest.']));
      g.bus.emit('gang:ambush', { npcId: m.id });
    }
  }
}

const hhmm = (total) => {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const SPOT_NAMES = {
  sumps_corner: 'the corner by the shacks', sumps_fire_n: 'the north fire barrel', sumps_fire_w: 'the west fire barrel', sumps_fire_s: 'the south fire barrel',
  sumps_fire_e: 'the east fire barrel', sumps_fire_mill: 'the fire barrel off Mill Road', sumps_lane: 'the west lane', sumps_wreck: 'the burnt-out car',
  sumps_mill_road: 'Mill Road in the Sumps', sumps_south: 'the south shacks', sumps_shore: 'the shore', sumps_east: 'the east wreck',
};
export const spotName = (spot) => SPOT_NAMES[spot] || spot.replace(/_/g, ' ');
export { hhmm };
