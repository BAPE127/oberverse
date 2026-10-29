// Farming (v0.30.0 "Sowing Season"): the plots for sale at Lariat, the work
// on them, the crops growing on the world clock, and the Co-op that buys the
// harvest. Content: src/content/farming.js. Tractors are ordinary vehicles
// (dealer 'reddirt'); one of yours parked by a plot does the work fast.
//
// State: game.world.farm (created on first use, so older saves start with no
// land, no crops and nothing owed):
//   plots       { id: { owned, state: 'fallow' | 'tilled' | 'planted', crop, plantedDay, stage, fertilized, readyDay } }
//   priceIndex  the Co-op's price index (0.85–1.15), moved each morning
//   lastDay     the last day the 06:00 tick ran
//
// The fields are drawn into the map's ground layer: sync() writes each plot's
// crop and stage to map.fieldState and bumps map.fieldsVersion, and the
// renderer redraws the ground when the version changes.
import { TILE } from '../core/util.js';
import { hash2 } from '../core/rng.js';

const MINUTES_PER_DAY = 1440;

export function freshFarm(content) {
  const plots = {};
  for (const id of Object.keys(content.farming?.plots || {})) plots[id] = { owned: false, state: 'fallow' };
  return { plots, priceIndex: 1, lastDay: 0, market: {}, ledger: [] };
}

export class Farm {
  constructor(game) {
    this.game = game;
  }

  get def() {
    return this.game.content.farming;
  }
  get state() {
    const g = this.game;
    if (!g.world.farm) g.world.farm = freshFarm(g.content);
    const s = g.world.farm;
    for (const id of Object.keys(this.def.plots)) if (!s.plots[id]) s.plots[id] = { owned: false, state: 'fallow' };
    s.market ||= {}; // v0.31.0: today's sales (demand), and the farm's income
    s.ledger ||= [];
    return s;
  }

  plot(id) {
    return this.state.plots[id];
  }

  /** The plot's content and its field rectangle on the map. */
  plotDef(id) {
    const p = this.def.plots[id];
    if (!p) return null;
    const field = this.game.maps.get(p.map)?.def.fields?.find((f) => f.id === id);
    return field ? { ...p, id, field, tiles: field.w * field.h } : null;
  }

  owned() {
    return Object.keys(this.def.plots).filter((id) => this.plot(id).owned);
  }

  // ------------------------------------------------------------------ land
  /** Whether a plot at this price can be bought now: the first from the owner's wallet, later ones from the farm's account. */
  canBuy(price) {
    return this.owned().length === 0 ? this.game.player.money >= price : this.game.corp.canAfford('farming', price);
  }

  buy(id) {
    const g = this.game;
    const d = this.plotDef(id);
    if (!d) return { ok: false, text: 'No such plot.' };
    const st = this.plot(id);
    if (st.owned) return { ok: false, text: `${d.name} is already yours.` };
    if (!this.canBuy(d.price)) return { ok: false, text: `You need ${d.price.toLocaleString()} obols for ${d.name}.` };
    // v0.60.0: the first plot is the owner founding the farm (equity in kind); later plots are the farm's capital spending
    if (this.owned().length === 0) g.corp.found('farming', d.price, d.name);
    else g.corp.pay('farming', d.price, { cat: 'land' });
    st.owned = true;
    g.setFlag('farm_owner', true);
    g.bus.emit('farm:bought', { plot: id });
    this.sync();
    return { ok: true, text: `The deed to ${d.name} is yours: ${d.tiles} tiles of good black dirt, for ${d.price.toLocaleString()} obols.` };
  }

  // ------------------------------------------------------------------ work
  /** The best tractor of yours parked near the plot (on the same map), or null. */
  tractorFor(id) {
    const g = this.game;
    const d = this.plotDef(id);
    if (!d) return null;
    const f = d.field;
    const R = this.def.config.tractorRange;
    let best = null;
    for (const car of g.vehicles.ownedCars()) {
      const m = g.vehicles.model(car);
      if (!m.farm || car.map !== d.map) continue;
      const tx = car.x / TILE;
      const ty = car.y / TILE;
      const dx = Math.max(f.x - tx, 0, tx - (f.x + f.w));
      const dy = Math.max(f.y - ty, 0, ty - (f.y + f.h));
      if (Math.hypot(dx, dy) > R) continue;
      if (!best || m.farm.rate > best.model.farm.rate) best = { car, model: m };
    }
    return best;
  }

  /** How long a job on this plot takes (game minutes), and with what. */
  workPlan(id) {
    const d = this.plotDef(id);
    const t = this.tractorFor(id);
    const rate = t ? t.model.farm.rate : this.def.config.handRate;
    return { minutes: Math.ceil((d.tiles / rate) * 60), tractor: t, byHand: !t };
  }

  /** What can be done on a plot right now: [{ action, label, ok, why }]. */
  actions(id) {
    const g = this.game;
    const d = this.plotDef(id);
    const st = this.plot(id);
    const out = [];
    if (!st.owned) return [{ action: 'buy', label: `Buy it — ${d.price.toLocaleString()} obols`, ok: this.canBuy(d.price), why: 'Not enough obols.' }];
    const C = this.def.crops;
    if (st.state === 'fallow') {
      out.push({ action: 'till', label: 'Till the field', ok: true });
      const fee = this.def.pasture.fencing;
      out.push({ action: 'pasture', label: `Fence it as pasture for livestock (${fee} obols)`, ok: g.corp.canAfford('farming', fee), why: `Fencing costs ${fee} obols.` });
    }
    if (st.state === 'pasture') return this.pastureActions(id);
    if (st.state === 'tilled') {
      for (const [cid, c] of Object.entries(C)) {
        const bags = this.seedBags(id, cid);
        out.push({ action: 'plant', crop: cid, label: `Plant ${c.name.toLowerCase()} (${bags} bags of seed, ready in ${c.days} days)`, ok: g.inventory.count(c.seed) >= bags, why: `You need ${bags} bags of ${c.name.toLowerCase()} seed (Lone Star Feed & Seed).` });
      }
    }
    if ((st.state === 'tilled' || (st.state === 'planted' && st.stage < 3)) && !st.fertilized) {
      const bags = this.fertBags(id);
      out.push({ action: 'fertilize', label: `Fertilise (${bags} bags, +${Math.round(this.def.config.fertilizer.bonus * 100)}% yield)`, ok: g.inventory.count(this.def.config.fertilizer.item) >= bags, why: `You need ${bags} bags of fertiliser (Lone Star Feed & Seed).` });
    }
    if (st.state === 'planted' && st.stage >= 3) out.push({ action: 'harvest', label: `Harvest — about ${this.expectedYield(id)} ${C[st.crop].name.toLowerCase()}`, ok: true });
    return out;
  }

  seedBags(id, cid) {
    return Math.ceil(this.plotDef(id).tiles / this.def.crops[cid].seedPer);
  }
  fertBags(id) {
    return Math.ceil(this.plotDef(id).tiles / this.def.config.fertilizer.per);
  }
  withered(id) {
    const st = this.plot(id);
    return st.state === 'planted' && st.readyDay && this.game.clock.day - st.readyDay > this.def.config.witherDays;
  }
  expectedYield(id) {
    const st = this.plot(id);
    if (st.state !== 'planted') return 0;
    const c = this.def.crops[st.crop];
    let n = this.plotDef(id).tiles / c.yieldPer;
    if (st.fertilized) n *= 1 + this.def.config.fertilizer.bonus;
    if (this.withered(id)) n *= 0.5;
    return Math.floor(n);
  }

  /** Do a job on a plot. By hand it takes most of a day and tires you; a tractor parked by the field does it fast. */
  work(id, action, crop) {
    const g = this.game;
    const d = this.plotDef(id);
    if (!d) return { ok: false, text: 'No such plot.' };
    if (action === 'buy') return this.buy(id);
    if (['feed', 'collect', 'unfence'].includes(action)) return this.pastureWork(id, action);
    const st = this.plot(id);
    if (!st.owned) return { ok: false, text: 'That land isn\'t yours (yet). The Land Office on Main Street has the deeds.' };
    const a = this.actions(id).find((x) => x.action === action && (action !== 'plant' || x.crop === crop));
    if (!a) return { ok: false, text: 'That can\'t be done on this field right now.' };
    if (!a.ok) return { ok: false, text: a.why };
    const plan = this.workPlan(id);
    if (plan.byHand && g.player.energy < 30) return { ok: false, text: 'You\'re too tired to work a field by hand. Sleep, eat, or bring a tractor.' };
    let text;
    if (action === 'till') {
      st.state = 'tilled';
      text = `You till ${d.name}`;
    } else if (action === 'pasture') {
      const fee = this.def.pasture.fencing;
      g.corp.pay('farming', fee, { cat: 'fencing' });
      Object.assign(st, { state: 'pasture', herd: null, feed: 0, produce: 0, hunger: 0 });
      this.record('Fencing', -fee);
      text = `You fence ${d.name} as pasture, with a feeder and a water trough`;
    } else if (action === 'plant') {
      const c = this.def.crops[crop];
      g.inventory.remove(c.seed, this.seedBags(id, crop));
      Object.assign(st, { state: 'planted', crop, plantedDay: g.clock.day, stage: 0, readyDay: null });
      text = `You plant ${d.name} with ${c.name.toLowerCase()}`;
    } else if (action === 'fertilize') {
      g.inventory.remove(this.def.config.fertilizer.item, this.fertBags(id));
      st.fertilized = true;
      text = `You spread fertiliser on ${d.name}`;
    } else if (action === 'harvest') {
      const c = this.def.crops[st.crop];
      const n = this.expectedYield(id);
      g.inventory.add(c.crop, n);
      Object.assign(st, { state: 'fallow', crop: null, plantedDay: null, stage: 0, fertilized: false, readyDay: null });
      st.harvests = (st.harvests || 0) + 1;
      g.bus.emit('farm:harvest', { plot: id, crop: c.crop, count: n });
      text = `You harvest ${d.name}: ${n} × ${g.content.items[c.crop].name}`;
    }
    g.skipTime(plan.minutes);
    this.sync();
    const how = plan.byHand ? `by hand (${Math.round(plan.minutes / 60)} hours, and your back knows it)` : `with your ${plan.tractor.model.name} (${plan.minutes < 90 ? `${plan.minutes} minutes` : `${Math.round(plan.minutes / 60)} hours`})`;
    return { ok: true, text: `${text} ${how}.` };
  }

  // ---------------------------------------------------------------- growth
  /** 06:00 each day: crops grow a stage, ready crops start to wait, and the Co-op sets its prices. */
  dailyTick() {
    const g = this.game;
    const s = this.state;
    if (s.lastDay === g.clock.day) return;
    s.lastDay = g.clock.day;
    for (const [id, st] of Object.entries(s.plots)) {
      if (st.state !== 'planted') continue;
      const c = this.def.crops[st.crop];
      const days = g.clock.day - st.plantedDay;
      const stage = days >= c.days ? 3 : Math.min(2, Math.floor((days / c.days) * 3));
      if (stage === 3 && !st.readyDay) {
        st.readyDay = g.clock.day;
        g.notify(`${this.def.plots[id].name}: the ${c.name.toLowerCase()} is ready to harvest.`, 'good');
      }
      st.stage = stage;
    }
    this.livestockDay();
    const rec = this.def.market.recover;
    for (const key of Object.keys(s.market)) {
      s.market[key] = Math.round(s.market[key] * (1 - rec) * 100) / 100;
      if (s.market[key] < 0.5) delete s.market[key];
    }
    const k = this.def.config.priceDrift;
    // the day's news, from the day itself (not the game's shared dice, which other systems' outcomes depend on)
    s.priceIndex = Math.round(Math.min(1.15, Math.max(0.85, s.priceIndex + (hash2(g.clock.day, 8117) * 2 - 1) * k)) * 1000) / 1000;
    this.sync();
  }

  minuteTick() {
    if (!this.def) return;
    const g = this.game;
    if (Math.floor(g.clock.total) % MINUTES_PER_DAY === 6 * 60) this.dailyTick();
  }

  /** Catch up after skipping time (sleeping, long jobs): growth is by day, so one tick per missed morning is enough. */
  catchUp() {
    const s = this.state;
    const g = this.game;
    if (s.lastDay < g.clock.day && g.clock.minuteOfDay >= 6 * 60) this.dailyTick();
  }

  /** Write the plots onto the map's fields (crop and stage) for drawing. */
  sync() {
    if (!this.def) return;
    const byMap = {};
    for (const [id, p] of Object.entries(this.def.plots)) {
      const st = this.plot(id);
      (byMap[p.map] ||= {})[id] = st.state === 'planted' ? { crop: this.withered(id) ? 'fallow' : st.crop, stage: st.stage } : st.state === 'pasture' ? { crop: 'pasture', stage: 0 } : { crop: 'fallow', stage: 0, tilled: st.state === 'tilled' };
    }
    this.syncAnimals();
    for (const [mapId, fs] of Object.entries(byMap)) {
      const map = this.game.maps.get(mapId);
      if (!map) continue;
      const key = JSON.stringify(fs);
      if (map.fieldStateKey === key) continue;
      map.fieldState = fs;
      map.fieldStateKey = key;
      map.fieldsVersion = (map.fieldsVersion || 0) + 1;
    }
  }

  // ------------------------------------------------------------------ Co-op
  /** The base price of something the Co-op buys (crops, eggs, goat milk), before demand. */
  coopBase(itemId) {
    const c = Object.values(this.def.crops).find((x) => x.crop === itemId);
    return c ? c.price : this.def.market.products[itemId] || 0;
  }

  /** v0.31.0: what the next unit fetches — the day's index, less what's already been sold today. */
  unitPrice(key, base) {
    const M = this.def.market;
    const D = M.demand[key] || 100;
    const sold = this.state.market[key] || 0;
    const f = M.floor + ((1 - M.floor) * D) / (D + sold);
    return Math.max(1, Math.round(base * this.state.priceIndex * f * (1 + this.game.corp.personnel.effect('farming', 'farmPrice')))); // v0.62.0: the price actually paid
  }

  /** Sell n units into the market, one at a time (each sale lowers the next price). */
  sellUnits(key, base, n) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += this.unitPrice(key, base);
      this.state.market[key] = (this.state.market[key] || 0) + 1;
    }
    return total;
  }

  coopPrice(itemId) {
    const base = this.coopBase(itemId);
    return base ? this.unitPrice(itemId, base) : 0;
  }

  sellAtCoop(itemId, count = 1) {
    const g = this.game;
    const base = this.coopBase(itemId);
    const have = g.inventory.count(itemId);
    if (!base) return { ok: false, text: 'The Co-op only buys grain, cotton, eggs and goat milk.' };
    const n = Math.min(count, have);
    if (n <= 0) return { ok: false, text: 'You have none of that to sell.' };
    g.inventory.remove(itemId, n);
    const total = this.sellUnits(itemId, base, n);
    g.corp.receive('farming', total, { cat: 'crops' });
    this.record(g.content.items[itemId].name, total);
    return { ok: true, text: `The Co-op weighs it in: ${n} × ${g.content.items[itemId].name} for ${total.toLocaleString()} obols${n > 1 ? ` (the price softens as the bins fill — ${this.coopPrice(itemId)} for the next)` : ''}.` };
  }

  /** The farm's books: income and spending by day (the last two weeks). */
  record(what, amount) {
    const s = this.state;
    s.ledger.push({ day: this.game.clock.day, what, amount });
    while (s.ledger.length && s.ledger[0].day < this.game.clock.day - 14) s.ledger.shift();
  }

  // -------------------------------------------------------------- livestock
  capacity(id, kind) {
    return Math.floor(this.plotDef(id).tiles / this.def.livestock[kind].per);
  }

  pastureActions(id) {
    const g = this.game;
    const st = this.plot(id);
    const out = [];
    const bags = g.inventory.count('item_feed');
    out.push({ action: 'feed', label: `Fill the feeder (${bags} bags of feed with you; ${Math.floor(st.feed || 0)} in it)`, ok: bags > 0, why: 'You have no feed with you (Lone Star Feed & Seed).' });
    if ((st.produce || 0) >= 1) {
      const L = this.def.livestock[st.herd.kind];
      out.push({ action: 'collect', label: `Collect ${Math.floor(st.produce)} × ${g.content.items[L.product.item].name}`, ok: true });
    }
    if (!st.herd?.count) out.push({ action: 'unfence', label: 'Take the fences down (back to a field)', ok: true });
    return out;
  }

  pastureWork(id, action) {
    const g = this.game;
    const d = this.plotDef(id);
    const st = this.plot(id);
    if (!st.owned || st.state !== 'pasture') return { ok: false, text: 'That isn\'t one of your pastures.' };
    const a = this.pastureActions(id).find((x) => x.action === action);
    if (!a) return { ok: false, text: 'That can\'t be done here right now.' };
    if (!a.ok) return { ok: false, text: a.why };
    if (action === 'feed') {
      const n = g.inventory.count('item_feed');
      g.inventory.remove('item_feed', n);
      st.feed = (st.feed || 0) + n;
      return { ok: true, text: `You tip ${n} bags of feed into the feeder at ${d.name}.` };
    }
    if (action === 'collect') {
      const L = this.def.livestock[st.herd.kind];
      const n = Math.floor(st.produce);
      g.inventory.add(L.product.item, n);
      st.produce -= n;
      return { ok: true, text: `You collect ${n} × ${g.content.items[L.product.item].name}.` };
    }
    // unfence
    Object.assign(st, { state: 'fallow', herd: null, feed: 0, produce: 0, hunger: 0 });
    this.sync();
    return { ok: true, text: `${d.name} is a field again.` };
  }

  /** Buy animals at Hoof & Horn for one of your pastures. */
  buyAnimals(id, kind, n) {
    const g = this.game;
    const L = this.def.livestock[kind];
    const d = this.plotDef(id);
    const st = this.plot(id);
    if (!L || !d) return { ok: false, text: 'No such animal or plot.' };
    if (!st.owned || st.state !== 'pasture') return { ok: false, text: `${d.name} isn\'t a pasture of yours. Fence a plot first, at its sign.` };
    if (st.herd && st.herd.count && st.herd.kind !== kind) return { ok: false, text: `${d.name} already has ${this.def.livestock[st.herd.kind].name.toLowerCase()}; one kind to a pasture.` };
    const have = st.herd?.count || 0;
    const room = this.capacity(id, kind) - have;
    if (n <= 0 || n > room) return { ok: false, text: room > 0 ? `${d.name} has room for ${room} more.` : `${d.name} is full.` };
    const cost = L.price * n;
    if (!g.corp.canAfford('farming', cost)) return { ok: false, text: `That\'s ${cost.toLocaleString()} obols.` };
    g.corp.pay('farming', cost, { cat: 'animals' });
    // cattle: the herd's average purchase day, weighted by head
    const day = have ? Math.round((st.herd.day * have + g.clock.day * n) / (have + n)) : g.clock.day;
    st.herd = { kind, count: have + n, day };
    this.record(`${L.name} bought`, -cost);
    this.syncAnimals();
    return { ok: true, text: `${n} ${n > 1 ? L.name.toLowerCase() : L.one} delivered to ${d.name} for ${cost.toLocaleString()} obols. Keep the feeder full.` };
  }

  /** What one animal from this pasture fetches before demand (cattle put on value as they grow). */
  animalValue(id) {
    const st = this.plot(id);
    const L = this.def.livestock[st.herd.kind];
    if (!L.grow) return L.value;
    const age = Math.min(L.maxDays, this.game.clock.day - st.herd.day);
    return L.value + L.grow * Math.max(0, age);
  }

  /** Sell animals at the Hoof & Horn auction. */
  sellAnimals(id, n) {
    const g = this.game;
    const st = this.plot(id);
    if (!st?.herd?.count) return { ok: false, text: 'No animals there to sell.' };
    n = Math.min(n, st.herd.count);
    const L = this.def.livestock[st.herd.kind];
    const total = this.sellUnits(st.herd.kind, this.animalValue(id), n);
    st.herd.count -= n;
    if (!st.herd.count) st.herd = null;
    g.corp.receive('farming', total, { cat: 'livestock' });
    this.record(`${L.name} sold`, total);
    this.syncAnimals();
    return { ok: true, text: `Sold at auction: ${n} ${n > 1 ? L.name.toLowerCase() : L.one} for ${total.toLocaleString()} obols.` };
  }

  /** 06:00: the animals eat from the feeder and give their eggs and milk; hungry herds lose head. */
  livestockDay() {
    const g = this.game;
    for (const [id, st] of Object.entries(this.state.plots)) {
      if (st.state !== 'pasture' || !st.herd?.count) continue;
      const L = this.def.livestock[st.herd.kind];
      const need = st.herd.count * L.feed;
      if ((st.feed || 0) >= need) {
        st.feed = Math.round((st.feed - need) * 100) / 100;
        st.hunger = 0;
        if (L.product) st.produce = (st.produce || 0) + st.herd.count * L.product.perDay;
      } else {
        st.feed = 0;
        st.hunger = (st.hunger || 0) + 1;
        g.notify(`${this.def.plots[id].name}: the feeder is empty and the ${L.name.toLowerCase()} are hungry.`, 'warn');
        if (st.hunger >= 3) {
          const lost = Math.max(1, Math.ceil(st.herd.count * 0.2));
          st.herd.count -= lost;
          g.notify(`${this.def.plots[id].name}: ${lost} ${lost > 1 ? L.name.toLowerCase() : L.one} lost to hunger.`, 'warn');
          if (st.herd.count <= 0) st.herd = null;
        }
      }
    }
    this.syncAnimals();
  }

  /** Show each pasture's animals on the map (up to a dozen each; they wander about their spot). */
  syncAnimals() {
    if (!this.def) return;
    for (const [id, p] of Object.entries(this.def.plots)) {
      const map = this.game.maps.get(p.map);
      const d = this.plotDef(id);
      if (!map || !d) continue;
      const st = this.plot(id);
      const herd = st.state === 'pasture' && st.herd?.count ? st.herd : null;
      const show = herd ? Math.min(12, herd.count) : 0;
      const L = herd ? this.def.livestock[herd.kind] : null;
      for (let i = 0; i < 12; i++) {
        const pid = `farm_${id}_${i}`;
        if (i >= show) { if (map.prop(pid)) map.removeProp(pid); continue; }
        if (map.prop(pid)?.type === L.prop) continue;
        const f = d.field;
        const x = f.x + 1 + ((i * 7 + 3) % Math.max(1, f.w - 2));
        const y = f.y + 1 + ((i * 5 + 2) % Math.max(1, f.h - 2));
        map.addProp({ id: pid, type: L.prop, x, y, w: 1, h: 1, solid: false, seed: 41 + i * 7, coat: i % 3 ? '#8a4a2a' : '#2a2420', patches: '#f2ece0', examine: `One of your ${L.name.toLowerCase()} at ${this.def.plots[id].name}.` });
      }
    }
  }

  interact(prop) {
    const act = prop.interact;
    if (act.action === 'office') return { type: 'panel', panel: 'farmland', opts: {} };
    if (act.action === 'coop') return { type: 'panel', panel: 'coop', opts: {} };
    if (act.action === 'livestock') return { type: 'panel', panel: 'livestock', opts: {} };
    if (act.action === 'plot') return { type: 'panel', panel: 'farmplot', opts: { plot: act.plot } };
    return { type: 'message', text: prop.examine || 'Farmland.' };
  }

  label(prop) {
    const act = prop.interact;
    if (act.action === 'office') return 'Look at the land listings';
    if (act.action === 'coop') return 'Weigh in a harvest at the Co-op';
    if (act.action === 'livestock') return 'Look at the sale ledger';
    if (act.action === 'plot') return this.plot(act.plot)?.owned ? 'Work your field' : 'Read the FOR SALE sign';
    return 'Examine';
  }
}
