// The global arms market (v0.14.0): eight fictional countries with budgets,
// wants and rivals; wars that break out and end over weeks; embargoes;
// shipping companies that don't always deliver; insurance; heat.
//
//   daily (06:00): budgets grow · saturation and hostility fade · wars end or start
//   ship(): cargo from a works' export cage → a country, by a shipper
//     fee + optional insurance paid up front; the country reserves the price
//     on arrival: delivered (paid) — or lost: sunk, hijacked, seized
//     seized + embargoed  → customs trace it to you (police heat)
//     seized by a country → that country turns hostile
//     insured and not smuggling → part of the value back
//
// State: game.world.market. Prices: arms value (with research) × the
// country's want × war boost × (1 − saturation) × (1 − hostility/200).
import { clamp } from '../core/util.js';

export function freshMarket(content) {
  const c = content.arms;
  const countries = {};
  for (const [id, def] of Object.entries(c.countries)) countries[id] = { budget: def.budget, sat: {}, hostility: 0, embargo: c.market.initialEmbargoes.includes(id), embargoReason: c.market.initialEmbargoes.includes(id) ? 'international sanctions' : null };
  const wars = c.market.initialWars.map(([a, b]) => ({ a, b, since: 0 }));
  return { countries, wars, news: [{ day: 1, text: 'Varnistan and the Republic of Caldera remain at war over the Kestrel Pass.' }, { day: 1, text: 'The Free State of Pallas is under international embargo.' }], shipments: [], nextShip: 1, lastDay: 1, earned: 0 };
}

export class Market {
  constructor(game) {
    this.game = game;
  }

  get cfg() {
    return this.game.content.arms;
  }

  get state() {
    const g = this.game;
    if (!g.world.market) g.world.market = freshMarket(g.content);
    return g.world.market;
  }

  country(id) {
    return this.state.countries[id];
  }

  warOf(id) {
    return this.state.wars.find((w) => w.a === id || w.b === id) || null;
  }

  enemyOf(id) {
    const w = this.warOf(id);
    return w ? (w.a === id ? w.b : w.a) : null;
  }

  news(text) {
    const s = this.state;
    s.news.unshift({ day: this.game.clock.day, text });
    s.news = s.news.slice(0, 12);
    this.game.tablet.post('news', text, 'event');
    this.game.bus.emit('market:news', { text });
  }

  /** What a country pays for one unit of an item right now (0 = won't buy). */
  price(countryId, itemId) {
    const g = this.game;
    const it = g.content.items[itemId];
    const def = this.cfg.countries[countryId];
    const c = this.country(countryId);
    if (!it?.arms || !def || !c) return 0;
    if (c.hostility >= this.cfg.market.refuseHostility) return 0;
    const fam = it.arms.family;
    const war = this.warOf(countryId) ? this.cfg.market.warMult[fam] : 1;
    const v = g.arms.value(itemId) * (def.wants[fam] ?? 1) * war * (1 - (c.sat[fam] || 0)) * (1 - c.hostility / 200);
    return Math.max(1, Math.round(v));
  }

  quote(countryId, items) {
    let value = 0;
    for (const [id, n] of Object.entries(items)) value += this.price(countryId, id) * n;
    return value;
  }

  fee(shipperId, value, insured) {
    const sh = this.cfg.shippers[shipperId];
    return Math.round(value * sh.fee) + (insured ? Math.round(value * this.cfg.market.insuranceRate) : 0);
  }

  /** Book a shipment from a works' export cage. items: {itemId: qty}. */
  ship({ wh, country, shipper, insured = false, items }) {
    const g = this.game;
    const c = this.country(country);
    const def = this.cfg.countries[country];
    const sh = this.cfg.shippers[shipper];
    if (!c || !sh) return { ok: false, text: 'Pick a country and a shipper.' };
    if (!g.arms.licensed()) return { ok: false, text: 'You need an arms licence to export.' };
    const cage = g.world.containers[g.arms.def(wh)?.outCrate]?.items;
    if (!cage) return { ok: false, text: 'No export cage.' };
    const list = Object.entries(items || {}).filter(([, n]) => n > 0);
    if (!list.length) return { ok: false, text: 'Choose what to ship.' };
    for (const [id, n] of list) if ((cage[id] || 0) < n) return { ok: false, text: `Only ${cage[id] || 0}× ${g.content.items[id]?.name} in the export cage.` };
    if (c.embargo && !sh.embargo) return { ok: false, text: `${sh.name} won't touch embargoed cargo for ${def.name}.` };
    const value = this.quote(country, Object.fromEntries(list));
    if (value <= 0) return { ok: false, text: `${def.name} won't buy from you right now.` };
    if (value > c.budget) return { ok: false, text: `${def.name} can only afford ${c.budget} obols of weapons right now; this lot is worth ${value}.` };
    const fee = this.fee(shipper, value, insured);
    if (g.player.money < fee) return { ok: false, text: `Shipping costs ${fee} obols up front.` };
    g.player.money -= fee;
    g.bus.emit('money:changed', { delta: -fee, total: g.player.money });
    for (const [id, n] of list) cage[id] -= n;
    c.budget -= value;
    const s = this.state;
    const now = g.clock.total;
    const shp = { id: s.nextShip++, wh, country, shipper, insured, items: Object.fromEntries(list), value, fee, embargo: c.embargo, departs: now, arrives: now + sh.days * 1440 };
    s.shipments.push(shp);
    // selling to one side of a war annoys the other
    const enemy = this.enemyOf(country);
    if (enemy) this.country(enemy).hostility = clamp(this.country(enemy).hostility + 5, 0, 100);
    g.bus.emit('market:shipped', { shipment: shp });
    return { ok: true, shipment: shp, text: `${sh.name} will deliver to ${def.name} in ${sh.days} day${sh.days === 1 ? '' : 's'}: worth ${value} obols on arrival. (Paid ${fee} for shipping${insured ? ' and insurance' : ''}.)` };
  }

  /** Roll a shipment's fate on arrival. */
  resolve(shp) {
    const g = this.game;
    const sh = this.cfg.shippers[shp.shipper];
    const def = this.cfg.countries[shp.country];
    const c = this.country(shp.country);
    const R = g.rng;
    const pOk = sh.reliability - (shp.embargo ? sh.embargoRisk || 0 : 0);
    if (R.next() < pOk) {
      g.player.money += shp.value;
      g.bus.emit('money:changed', { delta: shp.value, total: g.player.money });
      this.state.earned += shp.value;
      for (const [id, n] of Object.entries(shp.items)) {
        const fam = g.content.items[id].arms.family;
        c.sat[fam] = clamp((c.sat[fam] || 0) + n * this.cfg.market.saturationPerUnit, 0, this.cfg.market.saturationMax);
      }
      g.tablet.post('market', `Delivered to ${def.name}: ${shp.value} obols received.`, 'good');
      g.bus.emit('market:delivered', { shipment: shp });
      return 'delivered';
    }
    // lost
    c.budget += shp.value; // they never paid
    const kinds = shp.embargo ? ['seized', 'seized', 'seized', 'hijacked'] : ['sunk', 'hijacked', 'seized'];
    const fate = kinds[Math.floor(R.next() * kinds.length)];
    const lines = {
      sunk: `🌊 ${sh.name}'s ship went down in a storm with your cargo for ${def.name}.`,
      hijacked: `🏴 Pirates hijacked your cargo for ${def.name} off the coast.`,
      seized: `⚓ Your cargo for ${def.name} was seized and impounded.`,
    };
    let text = lines[fate];
    if (shp.insured && !(fate === 'seized' && shp.embargo)) {
      const payout = Math.round(shp.value * this.cfg.market.insurancePayout);
      g.player.money += payout;
      g.bus.emit('money:changed', { delta: payout, total: g.player.money });
      text += ` Insurance paid out ${payout} obols.`;
    } else if (shp.insured) text += ' The insurers don\'t cover smuggling.';
    if (fate === 'seized') {
      if (shp.embargo) {
        // customs trace an embargo run back to you
        g.police?.onCrime({ fact: 'fact_player_embargo', witnesses: [], map: g.player.map, x: g.player.x, y: g.player.y });
        g.police?.raiseWanted(3, 'Customs traced an embargo run to you.');
        text += ' Customs traced the paperwork back to Halvermouth — to you.';
      } else {
        const enemy = this.enemyOf(shp.country);
        if (enemy) {
          this.country(enemy).hostility = clamp(this.country(enemy).hostility + 30, 0, 100);
          text += ` ${this.cfg.countries[enemy].name} seized it, and they're furious with you.`;
        }
      }
    }
    g.tablet.post('market', text, 'warn');
    g.bus.emit('market:lost', { shipment: shp, fate });
    return fate;
  }

  /** The world turns: budgets, saturation, hostility, wars, embargoes. */
  dailyTick() {
    const g = this.game;
    const m = this.cfg.market;
    const s = this.state;
    for (const [id, c] of Object.entries(s.countries)) {
      const def = this.cfg.countries[id];
      c.budget = Math.min(def.budget * 3, c.budget + def.income * (this.warOf(id) ? 1.5 : 1));
      for (const k of Object.keys(c.sat)) c.sat[k] = Math.max(0, c.sat[k] * (1 - m.saturationDecay));
      c.hostility = Math.max(0, c.hostility - 5);
    }
    // wars end…
    for (const w of [...s.wars]) {
      if (g.clock.day - w.since >= m.minWarDays && g.rng.next() < m.warEndChance) {
        s.wars = s.wars.filter((x) => x !== w);
        const A = this.cfg.countries[w.a].name;
        const B = this.cfg.countries[w.b].name;
        this.news(`Ceasefire: ${A} and ${B} sign a truce.`);
        for (const id of [w.a, w.b]) if (s.countries[id].embargoReason === 'war') { s.countries[id].embargo = false; s.countries[id].embargoReason = null; this.news(`The embargo on ${this.cfg.countries[id].name} is lifted.`); }
      }
    }
    // …and start
    for (const [id, def] of Object.entries(this.cfg.countries)) {
      if (this.warOf(id)) continue;
      for (const r of def.rivals) {
        if (this.warOf(r) || this.warOf(id)) continue;
        if (g.rng.next() < m.warStartChance * def.aggression) {
          s.wars.push({ a: id, b: r, since: g.clock.day });
          this.news(`WAR: ${def.name} attacks ${this.cfg.countries[r].name}.`);
          if (!s.countries[id].embargo && g.rng.next() < m.embargoOnAggressor) {
            s.countries[id].embargo = true;
            s.countries[id].embargoReason = 'war';
            this.news(`${def.name} is placed under an arms embargo.`);
          }
        }
      }
    }
    // standing sanctions are occasionally lifted
    for (const [id, c] of Object.entries(s.countries)) {
      if (c.embargo && c.embargoReason !== 'war' && g.rng.next() < 0.02) { c.embargo = false; c.embargoReason = null; this.news(`Sanctions on ${this.cfg.countries[id].name} are lifted.`); }
    }
  }

  minuteTick() {
    const g = this.game;
    const s = this.state;
    if (g.clock.day > s.lastDay && g.clock.minuteOfDay >= 6 * 60) {
      s.lastDay = g.clock.day;
      this.dailyTick();
    }
    if (s.shipments.length) {
      const now = g.clock.total;
      const due = s.shipments.filter((x) => x.arrives <= now);
      if (due.length) {
        s.shipments = s.shipments.filter((x) => x.arrives > now);
        for (const shp of due) this.resolve(shp);
      }
    }
  }
}
