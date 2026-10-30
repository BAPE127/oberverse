// Geopolitics (v0.75.0): game.corp.geo — the arms market's wars and embargoes as persistent events, and what they do to the economy.
//
// The arms market still decides when a war or an embargo begins and ends (so the arms trade plays as it always did). Each morning this
// service reads what the market says is happening and keeps a record of every war and embargo: an id that never changes, a status, a
// start and an end, how severe it is, and a timeline of what happened and when. Everything the economy takes from an event is worked
// out from that record and the day (see src/corp/geo.js): the wider world's costs and demand, and the price the market expects its
// companies to earn. An event's effect ramps in over ten days and fades over thirty after it ends; it is never applied "once", so it
// cannot repeat on a reload or be lost by one. Nothing is created until the market has begun to run.
import { GEO as G } from '../content/geo.js';
import { CORP } from '../content/corporate.js';
import { severityOf, phaseOf, indices, sentimentOf, bondPremium } from '../corp/geo.js';

export class Geo {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.geo || null; }
  ensure() { return (this.K.state.geo ||= { v: 1, events: [], nextId: 1, lastDay: 0, log: [] }); }
  events() { return this.peek()?.events || []; }
  active() { return this.events().filter((e) => e.status === 'active'); }
  find(id) { return this.events().find((e) => e.id === id) || null; }
  name(c) { return this.g.content.arms.countries[c]?.name || c; }
  note(e, text) { e.timeline.push({ day: this.day, text }); }
  log(text) { const s = this.ensure(); s.log.push({ day: this.day, text }); while (s.log.length > 60) s.log.shift(); }

  income(c) { return this.g.content.arms.countries[c]?.income || 0; }
  incomes() { return Object.fromEntries(Object.keys(this.g.content.arms.countries).map((c) => [c, this.income(c)])); }

  // ------------------------------------------------------------- the morning
  /** Once a day: record what the arms market says has begun or ended. (The market is read as it stands, never started from here.) */
  dailyTick() {
    const m = this.g.world.market;
    if (!m?.countries) return;
    const s = this.peek();
    if (s && s.lastDay >= this.day) return;
    const st = this.ensure();
    st.lastDay = this.day;
    const A = this.g.content.arms.countries;
    // wars
    for (const w of m.wars || []) {
      const key = `war|${w.a}|${w.b}|${w.since}`;
      if (st.events.some((e) => e.key === key)) continue;
      const e = { id: `ev_${st.nextId++}`, key, kind: 'war', parties: [w.a, w.b], start: w.since, registered: this.day, end: null, status: 'active', severity: severityOf('war', [this.income(w.a), this.income(w.b)], G), goods: [], timeline: [], milestone: 0 };
      this.note(e, w.since > 0 ? `${A[w.a].name} and ${A[w.b].name} are at war.` : `${A[w.a].name} and ${A[w.b].name} are at war (it was under way when the record began).`);
      st.events.push(e);
      this.log(`WAR: ${A[w.a].name} and ${A[w.b].name}.`);
    }
    for (const e of st.events) {
      if (e.status !== 'active' || e.kind !== 'war') continue;
      const [a, b] = e.parties;
      const still = (m.wars || []).some((w) => `war|${w.a}|${w.b}|${w.since}` === e.key);
      if (!still) { e.status = 'resolved'; e.end = this.day; this.note(e, `Ceasefire: ${A[a].name} and ${A[b].name} stop fighting.`); this.log(`Ceasefire: ${A[a].name} and ${A[b].name}.`); continue; }
      const age = this.day - e.start;
      while (e.milestone < G.milestones.length && age >= G.milestones[e.milestone]) { this.note(e, `The war between ${A[a].name} and ${A[b].name} has gone on for ${G.milestones[e.milestone]} days.`); e.milestone++; }
    }
    // embargoes
    for (const [cid, c] of Object.entries(m.countries)) {
      const open = st.events.find((e) => e.kind === 'embargo' && e.target === cid && e.status === 'active');
      if (c.embargo && !open) {
        const war = st.events.find((e) => e.kind === 'war' && e.status === 'active' && e.parties.includes(cid));
        const e = { id: `ev_${st.nextId++}`, key: `embargo|${cid}|${this.day}`, kind: 'embargo', target: cid, parties: [cid], imposer: c.embargoReason === 'war' ? 'the arms-exporting nations' : 'international coalition', cause: c.embargoReason === 'war' && war ? war.id : null, start: this.day, registered: this.day, end: null, status: 'active', severity: severityOf('embargo', [this.income(cid)], G), goods: ['arms'], timeline: [] };
        this.note(e, `${A[cid].name} is placed under an arms embargo (${c.embargoReason === 'war' ? 'for going to war' : c.embargoReason || 'international sanctions'}).`);
        st.events.push(e);
        this.log(`Embargo: ${A[cid].name}.`);
      } else if (!c.embargo && open) {
        open.status = 'resolved'; open.end = this.day; this.note(open, `The embargo on ${A[cid].name} is lifted.`); this.log(`The embargo on ${A[cid].name} is lifted.`);
      }
    }
    // keep the newest resolved ones
    const done = st.events.filter((e) => e.status === 'resolved');
    if (done.length > G.keepResolved) { const drop = new Set(done.sort((a, b) => a.end - b.end).slice(0, done.length - G.keepResolved).map((e) => e.id)); st.events = st.events.filter((e) => !drop.has(e.id)); }
  }

  // ------------------------------------------------------------- what the economy takes from them
  ctx(salt) { return { sectors: CORP.sectors, incomes: this.incomes(), salt: salt ?? (this.K.state.gen?.salt || '') }; }
  phase(e, day = this.day) { return phaseOf(e, day, G); }

  /** { demand: {sector: ×}, cost: {sector: ×} } for a day — the wider world's customers and costs. Empty with no events. */
  indices(day = this.day) { return this.events().length ? indices(this.events(), day, this.ctx(), G) : { demand: {}, cost: {} }; }

  /** What the Economy app shows: the events, what they do to each sector, who is exposed, and the rest of the news — facts as they stand, never what comes next. */
  overview() {
    const K = this.K;
    const day = this.day;
    const ctx = this.ctx();
    const evs = this.events();
    const describe = (e) => {
      const idx = indices([e], day, ctx, G);
      const eff = [];
      for (const [s, v] of Object.entries(idx.demand)) eff.push({ sector: s, kind: 'demand', pct: (v - 1) * 100 });
      for (const [s, v] of Object.entries(idx.cost)) eff.push({ sector: s, kind: 'cost', pct: (v - 1) * 100 });
      eff.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
      return { ...e, phase: phaseOf(e, day, G), names: e.parties.map((c) => this.name(c)), age: day - e.start, effects: eff.slice(0, 4) };
    };
    const live = evs.map(describe);
    const idx = this.indices();
    const sectors = Object.keys(CORP.sectors).map((s) => ({ sector: s, demand: ((idx.demand[s] ?? 1) - 1) * 100, cost: ((idx.cost[s] ?? 1) - 1) * 100 })).filter((r) => Math.abs(r.demand) >= 0.05 || Math.abs(r.cost) >= 0.05);
    const reg = new Map(K.registry().map((r) => [r.id, r]));
    const rows = K.exchange.board().filter((r) => (r.status ?? 'listed') === 'listed').map((r) => {
      const row = reg.get(r.ticker) || [...reg.values()].find((x) => x.ticker === r.ticker);
      const util = r.source === 'generated' ? K.exchange.record(row?.id)?.util : undefined;
      const s = this.sentiment({ id: row?.id || r.ticker, sector: r.sector, country: row?.country || 'home', util });
      return { ticker: r.ticker, name: r.name, sector: r.sector, sentiment: s, change: r.change, price: r.price };
    });
    const exposed = rows.filter((r) => Math.abs(r.sentiment) >= 0.005);
    const bank = (K.state.bank?.decisions || []).slice(-3).reverse();
    return {
      wars: live.filter((e) => e.kind === 'war' && e.status === 'active'),
      embargoes: live.filter((e) => e.kind === 'embargo' && e.status === 'active'),
      ended: live.filter((e) => e.status === 'resolved').sort((a, b) => b.end - a.end).slice(0, 6),
      sectors,
      lifted: exposed.filter((r) => r.sentiment > 0).sort((a, b) => b.sentiment - a.sentiment).slice(0, 4),
      pressed: exposed.filter((r) => r.sentiment < 0).sort((a, b) => a.sentiment - b.sentiment).slice(0, 4),
      movers: rows.filter((r) => r.change != null && r.change !== 0).sort((a, b) => b.change - a.change),
      bank,
      yields: K.bonds.offers().map((o) => ({ years: o.years, yield: o.yield })),
      rate: K.bank.rate(),
      premium: this.premium(),
      sovereign: K.sovereign.offers().map((o) => ({ country: o.country, name: o.name, rating: o.rating, status: o.status, yield: o.yield, strain: o.strain })),
      bondNews: (K.state.sovereign?.log || []).slice(-6).reverse(),
      headlines: (this.g.world.market?.news || []).slice(0, 8),
      log: (this.peek()?.log || []).slice(-8).reverse(),
    };
  }

  /** What the wars and embargoes add to the yield of Halvermouth's government bonds today (a rate, to the basis point; 0 with no events). */
  premium(day = this.day) { return this.events().length ? bondPremium(this.events(), day, G) : 0; }

  /** What wars and embargoes do to the price of what a sector buys today: 1 with no events, at most 1.12 (v0.76.0: your own purchases carry it). */
  costFactor(sector, day = this.day) { return this.events().length ? (indices(this.events(), day, this.ctx(), G).cost[sector] ?? 1) : 1; }

  /** The expected-earnings change the market prices into a company's fair price today (a fraction; 0 with no events). */
  sentiment(company, day = this.day) { return this.events().length ? sentimentOf(this.events(), company, day, this.ctx(), G) : 0; }
}
