// Diplomacy (v0.96.0): relations with the ten other countries, the quarrels between them, and the one writer of wars and embargoes. Added to the Politics service.
//
// The arms market (src/systems/market.js) no longer decides when a war starts or ends: its daily tick calls diplomacyDay(), which moves each pair of rivals along
// the chain peace → dispute → tension → sanctions → war → ceasefire (src/politics/diplomacy.js) and writes `world.market.wars` and the embargo flags. Everything that reads
// them (geo, the arms market's demand, shipping, bonds, the exchange) is unchanged. Every chance is a hash of the day and the pair: a reload cannot change a quarrel.
import { DIPLOMACY as D } from '../content/diplomacy.js';
import { AMBASSADORS } from '../content/capital.js';
import { pairKey, bandOf, baseline, stepPair, targetScore, stepToward, unit } from '../politics/diplomacy.js';

export const diplomacyMethods = {
  /** The diplomatic record, made on first use from what the world already holds (a running game keeps its wars and embargoes). */
  ensureDiplomacy(s) {
    if (s.diplomacy) return s.diplomacy;
    const g = this.g;
    const countries = g.content.arms.countries;
    const salt = String(g.rng.state);
    const pairs = {};
    for (const [id, def] of Object.entries(countries)) for (const r of def.rivals || []) {
      const key = pairKey(id, r);
      if (!pairs[key]) { const [a, b] = key.split('|'); pairs[key] = { key, a, b, stage: 'peace', since: 0, until: null, cause: null, aggressor: null, settledDay: null }; }
    }
    const market = g.market.state;
    for (const w of market.wars) {
      const key = pairKey(w.a, w.b);
      pairs[key] ||= { key, a: w.a < w.b ? w.a : w.b, b: w.a < w.b ? w.b : w.a, stage: 'peace', since: 0, until: null, cause: null, aggressor: null, settledDay: null };
      Object.assign(pairs[key], { stage: 'war', since: w.since ?? this.day, aggressor: w.a, cause: 'an old quarrel' });
    }
    const relations = {};
    for (const id of Object.keys(countries)) if (id !== 'sund') relations[id] = { score: baseline(id, salt) };
    s.diplomacy = { v: 1, salt, pairs, relations, log: [], lastDay: this.day - 1 };
    return s.diplomacy;
  },

  name(id) { return this.g.content.arms.countries[id]?.name || id; },
  note(d, text) { d.log.unshift({ day: this.day, text }); d.log = d.log.slice(0, D.log); },
  countryState(id) { return this.g.market.state.countries[id]; },

  /** Once a day, from the arms market's daily tick: the quarrels move on. Idempotent per day. */
  diplomacyDay() {
    const s = this.ensure();
    const d = this.ensureDiplomacy(s);
    const day = this.g.clock.day;
    if (d.lastDay >= day) return;
    for (let k = Math.max(d.lastDay + 1, day - 9); k <= day; k++) this.diplomacyStep(s, d, k);
    d.lastDay = day;
  },

  diplomacyStep(s, d, day) {
    const g = this.g;
    const M = g.market;
    const ms = M.state;
    const agg = Object.fromEntries(Object.entries(g.content.arms.countries).map(([id, c]) => [id, c.aggression]));
    const saved = this.dayOverride; this.dayOverride = day;
    // what the market holds is the truth readers see: a war added or removed from outside (a debug command) is taken as it stands
    for (const p of Object.values(d.pairs)) {
      const live = ms.wars.some((w) => pairKey(w.a, w.b) === p.key);
      if (live && p.stage !== 'war') Object.assign(p, { stage: 'war', since: day, until: null, aggressor: ms.wars.find((w) => pairKey(w.a, w.b) === p.key).a });
      if (!live && p.stage === 'war') Object.assign(p, { stage: 'peace', settledDay: day, until: null });
    }
    // a standing embargo is lifted now and then
    for (const [id, c] of Object.entries(ms.countries)) {
      if (c.embargo && c.embargoReason !== 'war' && c.embargoReason !== 'sanctions' && unit(`${d.salt}|lift|${id}|${day}`) < D.standingLift) { c.embargo = false; c.embargoReason = null; M.news(`Sanctions on ${this.name(id)} are lifted.`); this.note(d, `Sanctions on ${this.name(id)} are lifted.`); }
    }
    const fx = this.fx();
    const wars = ms.wars.length;
    const busy = (p) => Object.values(d.pairs).some((q) => q !== p && q.stage !== 'peace' && (q.a === p.a || q.b === p.a || q.a === p.b || q.b === p.b));
    for (const key of Object.keys(d.pairs).sort()) {
      const p = d.pairs[key];
      if (p.stage === 'peace' && busy(p)) continue; // a country has one quarrel at a time
      const other = p.a === 'sund' ? p.b : p.b === 'sund' ? p.a : null;
      const ctx = { salt: d.salt, wars, sundMod: fx.sundDisputes, worldMod: fx.worldTension, agg, relation: other ? d.relations[other]?.score || 0 : 0, name: (id) => this.name(id) };
      const r = stepPair(p, day, ctx);
      d.pairs[key] = r.pair;
      for (const e of r.events) this.applyEvent(d, r.pair, e, day);
    }
    // relations drift toward what the quarrels and the policies make of them
    for (const [id, rel] of Object.entries(d.relations)) {
      const quarrels = { dispute: 0, sanctions: 0, war: 0 };
      for (const p of Object.values(d.pairs)) if ((p.a === 'sund' && p.b === id) || (p.b === 'sund' && p.a === id)) { if (p.stage === 'dispute' || p.stage === 'tension') quarrels.dispute++; else if (p.stage === 'sanctions') quarrels.sanctions++; else if (p.stage === 'war') quarrels.war++; }
      const target = targetScore({ base: baseline(id, d.salt), policy: fx.relations, quarrels, embargoed: Boolean(ms.countries[id]?.embargo), neutral: id === 'lirre' });
      rel.score = stepToward(rel.score, target);
    }
    this.dayOverride = saved;
  },

  /** What a step of a quarrel does to the world: the one writer. */
  applyEvent(d, p, e, day) {
    const M = this.g.market;
    const ms = M.state;
    const other = (id) => (id === p.a ? p.b : p.a);
    const lift = (id, reason) => {
      const c = ms.countries[id];
      if (c?.embargo && c.embargoReason === reason && !Object.values(d.pairs).some((q) => q !== p && q.stage !== 'peace' && (q.aggressor === id) && (reason === 'war' ? q.stage === 'war' : q.stage === 'sanctions' || q.stage === 'war'))) { c.embargo = false; c.embargoReason = null; M.news(`The embargo on ${this.name(id)} is lifted.`); }
    };
    this.note(d, e.text);
    if (e.kind === 'sanctions') {
      const c = ms.countries[e.aggressor];
      if (c && !c.embargo) { c.embargo = true; c.embargoReason = 'sanctions'; }
      M.news(e.text);
    } else if (e.kind === 'war') {
      ms.wars.push({ a: e.aggressor, b: other(e.aggressor), since: day });
      const c = ms.countries[e.aggressor];
      if (c) { c.embargo = true; c.embargoReason = 'war'; }
      M.news(e.text);
    } else if (e.kind === 'ceasefire') {
      ms.wars = ms.wars.filter((w) => pairKey(w.a, w.b) !== p.key);
      M.news(e.text);
      for (const id of [p.a, p.b]) lift(id, 'war');
    } else if (e.kind === 'settled') {
      M.news(e.text);
      lift(p.aggressor, 'sanctions');
    }
  },

  // ---------------------------------------------------------------- views
  /** What the Diplomacy page shows. */
  diplomacy() {
    const s = this.ensure();
    const d = this.ensureDiplomacy(s);
    const ms = this.g.market.state;
    const fx = this.fx();
    const amb = Object.fromEntries(AMBASSADORS.map((a) => [a.id.replace('npc_amb_', ''), a.name]));
    const rows = Object.entries(d.relations).map(([id, rel]) => {
      const c = ms.countries[id];
      const def = this.g.content.arms.countries[id];
      const quarrel = Object.values(d.pairs).find((p) => p.stage !== 'peace' && (p.a === id || p.b === id));
      const flags = [];
      if (rel.score >= D.relations.trade && !c?.embargo) flags.push('trade agreement');
      if (rel.score >= D.relations.military) flags.push('military cooperation');
      if (c?.embargo) flags.push(c.embargoReason === 'war' ? 'embargo (for war)' : c.embargoReason === 'sanctions' ? 'sanctions' : 'embargo');
      if (quarrel) flags.push(quarrel.stage === 'war' ? 'at war' : quarrel.stage === 'sanctions' ? 'sanctions talks' : `dispute (${quarrel.stage})`);
      return { id, name: def.name, color: def.color, score: rel.score, band: bandOf(rel.score), flags, ambassador: amb[id] || null, note: quarrel ? (quarrel.stage === 'war' ? `At war with ${this.name(quarrel.a === id ? quarrel.b : quarrel.a)}` : `${quarrel.cause} with ${this.name(quarrel.a === id ? quarrel.b : quarrel.a)}`) : (c?.embargo ? 'Embargoed' : 'Embassy open') };
    }).sort((a, b) => (a.name < b.name ? -1 : 1));
    const wars = ms.wars.map((w) => ({ a: w.a, b: w.b, names: [this.name(w.a), this.name(w.b)], since: w.since, days: this.g.clock.day - w.since }));
    const disputes = Object.values(d.pairs).filter((p) => p.stage !== 'peace' && p.stage !== 'war').map((p) => ({ a: p.a, b: p.b, names: [this.name(p.a), this.name(p.b)], stage: p.stage, cause: p.cause, since: p.since, until: p.until }));
    return { countries: rows, wars, disputes, log: d.log, stance: { sundDisputes: fx.sundDisputes, relations: fx.relations, worldTension: fx.worldTension } };
  },
};
