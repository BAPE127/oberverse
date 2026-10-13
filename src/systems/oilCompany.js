// Ober's Oil: a small company economy the player can work in, invest in and
// expand. State lives in game.world.oil (saved). Output depends on derricks,
// the pipeline, strikes, accidents and scandal; dividends are paid daily at
// 18:00 from real output. Expansion and corner-cutting feed emergent events
// (accidents, strikes, the canal slick) defined in src/content/events.js.
import { clamp } from '../core/util.js';
import { remember } from '../sim/memory.js';

export const OIL_PROJECTS = {
  derrick: { name: 'New derrick on the east field', cost: 60, bonusShares: 3, max: 3, text: 'Another derrick: more output, more noise, more risk.' },
  pipeline: { name: 'Pipeline to the Quay', cost: 150, bonusShares: 8, max: 1, text: 'Pipe crude straight to the harbour. Fast, cheap — and it runs under the Lantern Canal.' },
  safety: { name: 'Safety refit at the refinery', cost: 40, bonusShares: 1, max: 99, text: 'New valves and gauges. Lowers accident risk; Sir Moneybucks considers it sentimental.' },
};

export const STATIONS = {
  valves: { name: 'Valve bank', proper: 'You bleed each valve properly and log the pressures. (30 min)', corners: 'You crank them all open at once and hope. (10 min)' },
  gauges: { name: 'Gauge panel', proper: 'You calibrate every gauge against the master dial. (30 min)', corners: 'You tap the glass until the needles look about right. (10 min)' },
  barrels: { name: 'Barrel line', proper: 'You seal, label and stack every barrel. (30 min)', corners: 'You hammer the lids on and roll them all at once. (10 min)' },
};

export function freshOil() {
  return {
    sharesOwned: 0,
    sharePrice: 30,
    output: 100,
    morale: 55,
    risk: 0,
    strike: false,
    accidentDay: -1,
    derricks: 0,
    pipeline: false,
    safety: 0,
    wageLevel: 1,
    scandalDays: 0,
    dividendsPaid: 0,
    lastDividendDay: 0,
    history: [],
  };
}

export class OilCompany {
  constructor(game) {
    this.game = game;
  }

  get state() {
    if (!this.game.world.oil) this.game.world.oil = freshOil();
    return this.game.world.oil;
  }

  computeOutput() {
    const s = this.state;
    const day = this.game.clock.day;
    let out = 100 * (1 + 0.2 * s.derricks) * (s.pipeline ? 1.3 : 1);
    if (s.strike) out = 0;
    if (s.accidentDay === day) out *= 0.5;
    if (s.scandalDays > 0) out *= 0.6;
    return Math.round(out);
  }

  /** Dividend per share in obols for a given output. */
  dividendPerShare(output = this.computeOutput()) {
    const payout = this.state.wageLevel >= 2 ? 0.8 : 1;
    return (output / 100) * payout;
  }

  /** Total value of the player's shares. */
  holdingsValue() {
    return this.state.sharesOwned * this.state.sharePrice;
  }

  buyShares(n = 1) {
    const s = this.state;
    const cost = s.sharePrice * n;
    if (n <= 0 || this.game.player.money < cost) return { ok: false, text: 'You cannot afford that many shares.' };
    this.game.player.money -= cost;
    s.sharesOwned += n;
    this.game.bus.emit('money:changed', { delta: -cost, total: this.game.player.money });
    this.game.bus.emit('oil:shares', { owned: s.sharesOwned });
    if (!this.game.getFlag('oil_investor')) {
      this.game.setFlag('oil_investor', true);
      // The bookkeeper records every shareholder; word travels from there.
      const agnes = this.game.npcs.get('npc_agnes');
      if (agnes) this.game.knowledge.learn(agnes, 'fact_player_invested', { kind: 'fact', source: 'observed', at: this.game.clock.total });
    }
    return { ok: true, text: `Bought ${n} share${n > 1 ? 's' : ''} of Ober's Oil for ${cost} obols.` };
  }

  sellShares(n = 1) {
    const s = this.state;
    if (n <= 0 || s.sharesOwned < n) return { ok: false, text: 'You do not own that many shares.' };
    const value = s.sharePrice * n;
    s.sharesOwned -= n;
    this.game.player.money += value;
    this.game.bus.emit('money:changed', { delta: value, total: this.game.player.money });
    this.game.bus.emit('oil:shares', { owned: s.sharesOwned });
    return { ok: true, text: `Sold ${n} share${n > 1 ? 's' : ''} for ${value} obols.` };
  }

  projectCount(id) {
    const s = this.state;
    return id === 'derrick' ? s.derricks : id === 'pipeline' ? (s.pipeline ? 1 : 0) : s.safety;
  }

  fundProject(id) {
    const g = this.game;
    const p = OIL_PROJECTS[id];
    const s = this.state;
    if (!p) return { ok: false, text: 'No such project.' };
    if (this.projectCount(id) >= p.max) return { ok: false, text: 'That has already been done.' };
    if (g.player.money < p.cost) return { ok: false, text: 'You cannot afford to fund that.' };
    g.player.money -= p.cost;
    g.bus.emit('money:changed', { delta: -p.cost, total: g.player.money });
    s.sharesOwned += p.bonusShares;
    if (id === 'derrick') {
      s.derricks += 1;
      s.risk += 1;
      s.morale = clamp(s.morale - 4, 0, 100);
    } else if (id === 'pipeline') {
      s.pipeline = true;
      s.risk += 1;
      g.setFlag('player_funded_pipeline', true);
    } else if (id === 'safety') {
      s.safety += 1;
      s.risk = Math.max(0, s.risk - 2);
      s.morale = clamp(s.morale + 6, 0, 100);
    }
    const mb = g.npcs.get('npc_moneybucks');
    if (mb) {
      g.relationships.adjust(mb, 'player', id === 'safety' ? { respect: 1 } : { respect: 6, trust: 3 }, `funded:${id}`);
      remember(mb, { text: `The newcomer funded the ${p.name.toLowerCase()}.`, tag: `funded_${id}`, about: 'player', importance: 6 }, g.clock.total);
    }
    g.adjustReputation('fac_oil', id === 'safety' ? 2 : 5);
    g.bus.emit('oil:project', { id });
    return { ok: true, text: `Funded: ${p.name}. You receive ${p.bonusShares} bonus share${p.bonusShares > 1 ? 's' : ''}.` };
  }

  /** Daily close at 18:00: output, share price, dividends, morale drift. */
  dailyTick() {
    const g = this.game;
    const s = this.state;
    const output = this.computeOutput();
    s.output = output;
    s.sharePrice = Math.max(5, Math.round(20 + output / 8 - (s.strike ? 6 : 0)));
    const dividend = Math.floor(s.sharesOwned * this.dividendPerShare(output));
    if (dividend > 0) {
      g.player.money += dividend;
      s.dividendsPaid += dividend;
      g.bus.emit('money:changed', { delta: dividend, total: g.player.money });
      g.notify(`Ober's Oil dividend: +${dividend} obols (${output} barrels today).`, 'good');
    } else if (s.sharesOwned > 0) {
      g.notify(`Ober's Oil paid no dividend today (${s.strike ? 'strike' : 'no output'}).`, 'warn');
    }
    s.lastDividendDay = g.clock.day;
    s.morale = clamp(s.morale + (s.wageLevel >= 2 ? 5 : 1) - (s.derricks > 1 ? 1 : 0), 0, 100);
    if (s.scandalDays > 0) s.scandalDays -= 1;
    s.history.push({ day: g.clock.day, output, price: s.sharePrice, dividend });
    if (s.history.length > 14) s.history.shift();
    g.bus.emit('oil:daily', { output, dividend });
  }

  // ------------------------------------------------------- refinery shifts
  stationPrompt(prop) {
    const g = this.game;
    const station = prop.interact.station;
    const def = STATIONS[station];
    if (!g.quests.matches({ id: 'job_refinery_shift', stage: 'work' })) {
      return { type: 'message', text: `The ${def.name.toLowerCase()} hisses at you. Gideon would want you on the clock before you touch anything.` };
    }
    if (g.getFlag(`shift_${station}`) === g.clock.day) return { type: 'message', text: `You've already done the ${def.name.toLowerCase()} this shift.` };
    return {
      type: 'choices',
      title: def.name,
      text: 'How do you want to do this?',
      options: [
        { label: `Do it properly — ${def.proper}`, call: ['oil', 'work', prop.id, 'proper'] },
        { label: `Cut corners — ${def.corners}`, call: ['oil', 'work', prop.id, 'corners'] },
      ],
    };
  }

  work(propId, mode) {
    const g = this.game;
    const prop = g.currentMap().prop(propId);
    if (!prop) return { ok: false, text: 'Nothing to work on.' };
    const station = prop.interact.station;
    const s = this.state;
    g.skipTime(mode === 'proper' ? 30 : 10);
    g.setFlag(`shift_${station}`, g.clock.day);
    if (mode === 'corners') {
      g.setFlag('shift_corners', (g.getFlag('shift_corners_day') === g.clock.day ? g.getFlag('shift_corners') || 0 : 0) + 1);
      g.setFlag('shift_corners_day', g.clock.day);
      s.risk += 1;
      const ruby = g.npcs.get('npc_ruby');
      if (ruby && ruby.map === g.player.map && ruby.activity !== 'sleep' && g.canSee(ruby, g.player.x, g.player.y, g.currentMap(), 9)) {
        g.knowledge.learn(ruby, 'fact_player_cut_corners', { kind: 'fact', source: 'witnessed', at: g.clock.total });
        g.bark(ruby, 'Oi! That\'s how people lose fingers.');
      }
    }
    const done = ['valves', 'gauges', 'barrels'].every((st) => g.getFlag(`shift_${st}`) === g.clock.day);
    if (done) g.quests.setStage('job_refinery_shift', 'report');
    return { ok: true, text: mode === 'proper' ? STATIONS[station].proper.replace(/\s*\(.*\)$/, '') : STATIONS[station].corners.replace(/\s*\(.*\)$/, '') };
  }

  /** Wages owed for today's shift (paid by Gideon on report). */
  wagesOwed() {
    const g = this.game;
    const corners = g.getFlag('shift_corners_day') === g.clock.day ? g.getFlag('shift_corners') || 0 : 0;
    return 5 * this.state.wageLevel + 2 * corners;
  }
}
