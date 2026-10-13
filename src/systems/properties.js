// Properties: the player pays Mason's Os to build on a surveyed plot.
// Flow: commission (pay land + build cost, minus crew goodwill discount)
//   → 'permit'   (needs a building permit, Form 22-B, from the Civic Office)
//   → 'building' (the crew works for N days; counts down at 18:00)
//   → 'built'    (the building appears on the map; home/rental/business pay off)
// State lives in game.world.properties.owned[plotId] (saved). Plots and
// blueprints are content (src/content/properties.js); there are none yet.
import { plotBuilding } from '../world/plots.js';

export const PERMIT_FEE = 10;

export function freshProperties() {
  return { owned: {}, lastTickDay: 0, income: 0 };
}

export class Properties {
  constructor(game) {
    this.game = game;
  }

  get state() {
    if (!this.game.world.properties) this.game.world.properties = freshProperties();
    return this.game.world.properties;
  }

  get plots() {
    return this.game.content.plots || {};
  }

  get blueprints() {
    return this.game.content.blueprints || {};
  }

  /** 'none' | 'permit' | 'building' | 'built' */
  status(plotId) {
    return this.state.owned[plotId]?.state || 'none';
  }

  list() {
    return Object.entries(this.plots).map(([id, plot]) => ({ id, plot, status: this.status(id), record: this.state.owned[id] || null }));
  }

  quote(id, bpId) {
    const plot = this.plots[id];
    const bp = this.blueprints[bpId];
    if (!plot || !bp) return null;
    const discount = this.game.construction.discount();
    const build = Math.round(bp.cost * (1 - discount));
    const land = this.state.owned[id] ? 0 : plot.landPrice || 0;
    const days = Math.max(1, bp.days - this.game.construction.speedup());
    return { land, build, discount, total: land + build, days };
  }

  commission(id, bpId) {
    const g = this.game;
    const plot = this.plots[id];
    if (!plot) return { ok: false, text: 'No such plot.' };
    if (!(plot.allowed || Object.keys(this.blueprints)).includes(bpId)) return { ok: false, text: 'That can\'t be built there.' };
    if (this.status(id) !== 'none') return { ok: false, text: 'Mason\'s Os already has a contract on that plot.' };
    const q = this.quote(id, bpId);
    if (!q) return { ok: false, text: 'No such blueprint.' };
    if (g.player.money < q.total) return { ok: false, text: `That comes to ${q.total} obols. You're a little short — no shame in it, pal.` };
    g.player.money -= q.total;
    g.bus.emit('money:changed', { delta: -q.total, total: g.player.money });
    this.state.owned[id] = { blueprint: bpId, state: 'permit', paid: q.total, days: q.days, daysLeft: q.days, commissionedDay: g.clock.day };
    g.setFlag('property_commissioned', true);
    g.bus.emit('property:changed', { plot: id, state: 'permit' });
    return { ok: true, text: `Contract signed: ${this.blueprints[bpId].name} on ${plot.name}, ${q.total} obols. Next: a building permit (Form 22-B) from the Civic Office.` };
  }

  /** Issue permits for every contract waiting on one. Returns how many. */
  grantPermits() {
    let n = 0;
    for (const [id, rec] of Object.entries(this.state.owned)) {
      if (rec.state !== 'permit') continue;
      rec.state = 'building';
      rec.startedDay = this.game.clock.day;
      n++;
      this.game.bus.emit('property:changed', { plot: id, state: 'building' });
    }
    return n;
  }

  /** 18:00: building countdown, completion, rent and income. */
  dailyTick() {
    const g = this.game;
    const s = this.state;
    if (s.lastTickDay === g.clock.day) return;
    s.lastTickDay = g.clock.day;
    let rebuilt = false;
    for (const [id, rec] of Object.entries(s.owned)) {
      const plot = this.plots[id];
      const bp = this.blueprints[rec.blueprint];
      if (!plot || !bp) continue;
      if (rec.state === 'building') {
        rec.daysLeft -= 1;
        if (rec.daysLeft <= 0) {
          rec.state = 'built';
          rec.builtDay = g.clock.day;
          rebuilt = true;
          g.notify(`Mason's Os finished your ${bp.name.toLowerCase()} on ${plot.name}! "It's a home run — well, a home, anyway."`, 'good');
          g.bus.emit('property:changed', { plot: id, state: 'built' });
        }
      } else if (rec.state === 'built') {
        const pay = bp.rent || bp.income || 0;
        if (pay > 0) {
          g.player.money += pay;
          s.income += pay;
          g.bus.emit('money:changed', { delta: pay, total: g.player.money });
          g.notify(`${plot.name}: +${pay} obols ${bp.rent ? 'rent' : 'takings'}.`, 'good');
        }
      }
    }
    if (rebuilt) g.rebuildMaps();
  }

  /** Exterior buildings for finished properties, by map id. */
  builtBuildings() {
    const out = [];
    for (const [id, rec] of Object.entries(this.state.owned)) {
      const plot = this.plots[id];
      const bp = this.blueprints[rec.blueprint];
      if (rec.state === 'built' && plot && bp) out.push({ map: plot.map, building: plotBuilding(id, plot, bp) });
    }
    return out;
  }
}
