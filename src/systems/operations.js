// What a manager does to run the business (v0.91.1). Until now only the arms works' manager ran anything: the shipping and farming managers
// were paid a wage and "asked about expansion", so they cost money and brought none in. Now each manager runs their business's day-to-day, through
// the business's own services and from its own account (never your wallet), at the business's own prices and with the business's own costs:
//
//   shipping   "Run the fleet"    every hour: each idle ship takes the best contract it can carry on time at a profit, within a safe risk
//   farming    "Work the land"    every morning: till, plant the best crop, fertilise, harvest and sell at the Co-op; feed herds, collect and sell
//   aerospace  "Keep the hangars busy" every morning: each bay builds its standing plane, and finished stock is sold (see the hangar settings)
//
// Each is one box on the manager's card (ticked by default, like the others). Nothing here runs until someone is hired and the business has an account of its own.
import { INCOME } from '../content/income.js';
import { OPS } from '../content/operations.js';

export class Operations {
  constructor(corp) { this.K = corp; }
  get g() { return this.K.game; }

  /** The manager who may do this and is at work, or null. */
  worker(target, perm) {
    if (!this.K.established(target) || !this.K.account(target).funded) return null;
    const people = this.K.personnel.peek();
    if (!people) return null;
    return Object.values(people.staff).find((x) => x.role === 'manager' && x.employer === target && this.K.management.atWork(x) && this.K.personnel.may(x, perm)) || null;
  }

  note(target, text) { this.K.management.log({ type: 'operation', employer: target, text }); }

  /** Cash the business keeps whatever the manager does: a week of its running costs. */
  reserve(target) { return Math.round(this.K.group.runningPerDay(target) * OPS.reserveDays); }

  // ------------------------------------------------------------------ shipping: every hour
  hourlyTick() {
    if (!this.worker('shipping', 'contracts')) return;
    this.runFleet();
  }

  /** Each idle ship, the best contract it can do on time, at a profit, with an acceptable chance of trouble. Returns the number sent. */
  runFleet() {
    const L = this.g.logistics;
    let sent = 0;
    for (let guard = 0; guard < OPS.shipping.perPass; guard++) {
      const best = L.opportunities(12).find((o) => {
        const q = o.quote;
        return q.onTime && q.profit >= OPS.shipping.minProfit && q.profit >= q.cost * OPS.shipping.minMargin && q.risk.chance <= OPS.shipping.maxRisk
          && this.K.canAfford('shipping', q.cost + this.reserve('shipping'));
      });
      if (!best) break;
      const c = best.contract;
      if (c.status === 'available') { const a = L.accept(c.id); if (!a.ok) break; }
      const insure = best.quote.risk.chance > OPS.shipping.insureAbove;
      const r = L.assign(c.id, best.vessel.id, { insure });
      if (!r.ok) break;
      sent++;
      this.note('shipping', `Sent the ${best.vessel.name} with ${c.units} units to ${L.port(c.to).name} (expected profit ${Math.round(best.quote.profit).toLocaleString()}).`);
    }
    return sent + this.bringHome();
  }

  /** A ship that finished a delivery stands at the client's port, where nobody offers it work: the manager sails it to the owned port with the best work it can carry. */
  bringHome() {
    const L = this.g.logistics;
    let moved = 0;
    for (const v of L.idle()) {
      if (v.kind !== 'cargo' || !v.port) continue;
      const st = L.stats(v);
      const board = L.contracts('available').filter((c) => st.capacity >= c.units && (!L.cfg.contractTypes[c.type].needs || st.tags.includes(L.cfg.contractTypes[c.type].needs)));
      if (board.some((c) => c.from === v.port)) continue; // work here: the pass above takes it if it is worth it
      const ports = [...new Set(L.ownedPorts())].filter((p) => p !== v.port);
      const options = ports.map((p) => {
        const pl = L.plan(v, p);
        const pay = board.filter((c) => c.from === p).reduce((a, c) => a + c.pay, 0);
        return { p, pl, score: pay - pl.cost - pl.hours * 2 };
      }).filter((o) => o.pl.ok && this.K.canAfford('shipping', o.pl.cost + this.reserve('shipping'))).sort((a, b) => b.score - a.score || (a.p < b.p ? -1 : 1));
      const go = options[0];
      if (!go) continue;
      if (L.sail(v.id, go.p).ok) { moved++; this.note('shipping', `The ${v.name} sails to ${L.port(go.p).name} to pick up work.`); }
    }
    return moved;
  }

  // ------------------------------------------------------------------ farming: every morning
  dailyTick() {
    if (this.worker('arms', 'bid')) this.sellOutput();
    if (this.worker('farming', 'land')) this.workLand();
    if (this.worker('aerospace', 'hangars')) this.g.aero.keepHangarsBusy?.('roost');
  }

  // ------------------------------------------------------------------ arms: the cage's surplus
  /** What export orders do not need, sold to Lucas at his wholesale price from the cage (up to a day's limit), into the arms account. Returns obols received. */
  sellOutput() {
    const A = this.g.arms;
    if (!A.licensed()) return 0;
    const need = {};
    for (const o of this.g.market.openOrders()) need[o.item] = Math.max(need[o.item] || 0, o.qty); // stock an open order may still call for stays in the cage
    let got = 0;
    let room = OPS.arms.wholesaleDaily;
    for (const wh of A.ownedIds()) {
      const cage = this.g.world.containers[A.def(wh)?.outCrate];
      if (!cage) continue;
      const list = Object.keys(cage.items).filter((id) => this.g.content.items[id]?.arms).sort((a, b) => A.wholesale(b) - A.wholesale(a) || (a < b ? -1 : 1));
      for (const id of list) {
        const price = A.wholesale(id);
        while (cage.items[id] > (need[id] || 0) && price > 0 && price <= room && A.sellToLucas(id, price).ok) {
          cage.items[id]--; room -= price; got += price;
          this.K.receive('arms', price, { cat: 'wholesale' });
        }
        if (!cage.items[id]) delete cage.items[id];
      }
      if (got) this.g.bus.emit('container:changed', { id: A.def(wh).outCrate });
    }
    if (got) this.note('arms', `Sold the cage's surplus to Lucas for ${got.toLocaleString()}.`);
    return got;
  }

  /** What one planting of a crop earns per tile per day, after seed (what a manager picks the crop by). */
  cropScore(cid) {
    const F = this.g.farm;
    const c = F.def.crops[cid];
    const seedItem = this.g.content.items[c.seed];
    const income = (c.price * INCOME.business.crops) / c.yieldPer; // per tile, at an average day's price
    const seed = (seedItem.price * INCOME.cost) / c.seedPer;
    return (income * OPS.farming.priceSoftening - seed) / (c.days + OPS.farming.turnaroundDays);
  }

  bestCrop() {
    const crops = Object.keys(this.g.farm.def.crops);
    return crops.sort((a, b) => this.cropScore(b) - this.cropScore(a))[0];
  }

  /** The hands: what the day's work on a field costs (so a field is never free to work). */
  labour(tiles, jobs) { return Math.round(tiles * jobs * OPS.farming.labourPerTile * INCOME.cost); }

  workLand() {
    const F = this.g.farm;
    const K = this.K;
    if (!F.def) return { harvested: 0, planted: 0, sold: 0 };
    const out = { harvested: 0, planted: 0, sold: 0, fed: 0 };
    const keep = () => this.reserve('farming');
    for (const id of F.owned()) {
      const st = F.plot(id);
      const d = F.plotDef(id);
      // --- fields
      if (st.state === 'planted' && st.stage >= 3) {
        const c = F.def.crops[st.crop];
        const n = F.expectedYield(id);
        const wage = this.labour(d.tiles, 1);
        if (K.canAfford('farming', wage)) {
          K.pay('farming', wage, { cat: 'labour' });
          const total = F.sellUnits(c.crop, c.price, n);
          K.receive('farming', total, { cat: 'crops' });
          F.record(this.g.content.items[c.crop].name, total);
          Object.assign(st, { state: 'fallow', crop: null, plantedDay: null, stage: 0, fertilized: false, readyDay: null });
          st.harvests = (st.harvests || 0) + 1;
          this.g.bus.emit('farm:harvest', { plot: id, crop: c.crop, count: n });
          out.harvested++; out.sold += total;
          this.note('farming', `Harvested ${d.name}: ${n} × ${this.g.content.items[c.crop].name} sold at the Co-op for ${total.toLocaleString()}.`);
        }
      }
      if (st.state === 'fallow') {
        const cid = this.bestCrop();
        const bags = F.seedBags(id, cid);
        const seedCost = Math.round(bags * this.g.content.items[F.def.crops[cid].seed].price * INCOME.cost);
        const wage = this.labour(d.tiles, 2); // tilling and planting
        if (K.canAfford('farming', seedCost + wage + keep())) {
          K.pay('farming', seedCost, { cat: 'seed' }); K.pay('farming', wage, { cat: 'labour' });
          Object.assign(st, { state: 'planted', crop: cid, plantedDay: this.g.clock.day, stage: 0, readyDay: null });
          out.planted++;
          this.note('farming', `Planted ${d.name} with ${F.def.crops[cid].name.toLowerCase()} (seed ${seedCost.toLocaleString()}).`);
        }
      }
      if (st.state === 'planted' && st.stage < 3 && !st.fertilized) {
        const bags = F.fertBags(id);
        const cost = Math.round(bags * this.g.content.items[F.def.config.fertilizer.item].price * INCOME.cost);
        const c = F.def.crops[st.crop];
        const gain = (d.tiles / c.yieldPer) * F.def.config.fertilizer.bonus * c.price * INCOME.business.crops * OPS.farming.priceSoftening;
        if (gain > cost * OPS.farming.fertiliseIfGainOver && K.canAfford('farming', cost + keep())) {
          K.pay('farming', cost, { cat: 'fertiliser' });
          st.fertilized = true;
        }
      }
      // --- pasture
      if (st.state === 'pasture' && st.herd?.count) {
        const L = F.def.livestock[st.herd.kind];
        const feedItem = this.g.content.items.item_feed;
        const wantFeed = st.herd.count * L.feed * OPS.farming.feedDays - (st.feed || 0);
        if (wantFeed >= 1) {
          const bags = Math.ceil(wantFeed);
          const cost = Math.round(bags * feedItem.price * INCOME.cost);
          if (K.canAfford('farming', cost)) { K.pay('farming', cost, { cat: 'feed' }); st.feed = (st.feed || 0) + bags; out.fed++; }
        }
        if (L.product && (st.produce || 0) >= 1) {
          const n = Math.floor(st.produce);
          const total = F.sellUnits(L.product.item, F.coopBase(L.product.item), n);
          st.produce -= n;
          K.receive('farming', total, { cat: 'crops' });
          F.record(this.g.content.items[L.product.item].name, total);
          out.sold += total;
        }
        if (L.grow && this.g.clock.day - st.herd.day >= L.maxDays) F.sellAnimals(id, st.herd.count); // beef are sold when fully grown
      }
    }
    F.sync();
    return out;
  }
}
