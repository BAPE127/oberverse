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
  return { plots, priceIndex: 1, lastDay: 0 };
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
  buy(id) {
    const g = this.game;
    const d = this.plotDef(id);
    if (!d) return { ok: false, text: 'No such plot.' };
    const st = this.plot(id);
    if (st.owned) return { ok: false, text: `${d.name} is already yours.` };
    if (g.player.money < d.price) return { ok: false, text: `You need ${d.price.toLocaleString()} obols for ${d.name}.` };
    g.player.money -= d.price;
    g.bus.emit('money:changed', { delta: -d.price, total: g.player.money });
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
    if (!st.owned) return [{ action: 'buy', label: `Buy it — ${d.price.toLocaleString()} obols`, ok: g.player.money >= d.price, why: 'Not enough obols.' }];
    const C = this.def.crops;
    if (st.state === 'fallow') out.push({ action: 'till', label: 'Till the field', ok: true });
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
      (byMap[p.map] ||= {})[id] = st.state === 'planted' ? { crop: this.withered(id) ? 'fallow' : st.crop, stage: st.stage } : { crop: 'fallow', stage: 0, tilled: st.state === 'tilled' };
    }
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
  coopPrice(itemId) {
    const c = Object.values(this.def.crops).find((x) => x.crop === itemId);
    return c ? Math.max(1, Math.round(c.price * this.state.priceIndex)) : 0;
  }

  sellAtCoop(itemId, count = 1) {
    const g = this.game;
    const price = this.coopPrice(itemId);
    const have = g.inventory.count(itemId);
    if (!price) return { ok: false, text: 'The Co-op only buys grain and cotton.' };
    const n = Math.min(count, have);
    if (n <= 0) return { ok: false, text: 'You have none of that to sell.' };
    g.inventory.remove(itemId, n);
    g.player.money += price * n;
    g.bus.emit('money:changed', { delta: price * n, total: g.player.money });
    return { ok: true, text: `The Co-op weighs it in: ${n} × ${g.content.items[itemId].name} for ${(price * n).toLocaleString()} obols.` };
  }

  interact(prop) {
    const act = prop.interact;
    if (act.action === 'office') return { type: 'panel', panel: 'farmland', opts: {} };
    if (act.action === 'coop') return { type: 'panel', panel: 'coop', opts: {} };
    if (act.action === 'plot') return { type: 'panel', panel: 'farmplot', opts: { plot: act.plot } };
    return { type: 'message', text: prop.examine || 'Farmland.' };
  }

  label(prop) {
    const act = prop.interact;
    if (act.action === 'office') return 'Look at the land listings';
    if (act.action === 'coop') return 'Weigh in a harvest at the Co-op';
    if (act.action === 'plot') return this.plot(act.plot)?.owned ? 'Work your field' : 'Read the FOR SALE sign';
    return 'Examine';
  }
}
