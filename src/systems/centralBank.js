// The First Bank of Halvermouth (v0.68.0): game.corp.bank — the policy rate everything else uses.
//
// The rate starts at the benchmark the game has always had (5%) and is the bank's, not yours: once a month, from the
// third month on, it follows what the wider world's companies are doing (src/corp/bank.js), a quarter-point at a
// time, and each decision is written down with its reasons. It sets the rate intercompany loans are made at, the
// interest the world's companies pay, how much a year's profit is worth (every valuation), how soon they build, and how
// many newcomers appear — each within fixed limits and exactly nothing at the neutral rate. Nothing is created until
// the first meeting; before it, the rate is the constant it always was.
import { CORP } from '../content/corporate.js';
import { decide, valuationFactor, investShift, entryFactor, NEUTRAL } from '../corp/bank.js';

const FIRST_MONTH = 3; // the bank meets from the fourth month of the game (day 91)
const KEPT = 36;

export class CentralBank {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.bank || null; }

  /** The policy rate now (a yearly fraction). */
  rate() { return this.peek()?.rate ?? CORP.baseRate; }

  /** What the bank's rate does to the world, now: nothing at the neutral rate. */
  effects() {
    const r = this.rate();
    return { rate: r, valuation: valuationFactor(r), invest: investShift(r), entry: entryFactor(r), neutral: NEUTRAL };
  }

  /** How the wider world is doing: capacity in use (weighted by capacity), last month's sales against the month before, and the share in distress. */
  indicators() {
    const live = (this.K.state.generated || []).filter((c) => c.status === 'active' || c.status === 'distressed');
    if (!live.length) return null;
    const month = Math.floor((this.day - 1) / 30);
    const cap = live.reduce((a, c) => a + c.capacity, 0) || 1;
    const util = live.reduce((a, c) => a + c.capacity * c.util, 0) / cap;
    let now = 0; let before = 0;
    for (const c of live) {
      const a = c.months.find((x) => x[0] === month - 1); const b = c.months.find((x) => x[0] === month - 2);
      if (a && b) { now += a[1]; before += b[1]; }
    }
    return { util, growth: before > 0 ? now / before - 1 : 0, stress: live.filter((c) => c.status === 'distressed').length / live.length };
  }

  /** Once a day: the first day of each month from the fourth, the bank decides (once, whatever is saved or slept through). */
  dailyTick() {
    const month = Math.floor((this.day - 1) / 30);
    if (month < FIRST_MONTH || (this.peek()?.lastMeeting ?? -1) >= month) return;
    const ind = this.indicators();
    if (!ind) return;
    const st = (this.K.state.bank ||= { v: 1, rate: CORP.baseRate, since: 1, decisions: [], lastMeeting: -1 });
    const d = decide(st.rate, ind);
    st.decisions.push({ day: this.day, month, from: st.rate, to: d.to, target: d.target, util: Math.round(ind.util * 1000) / 1000, growth: Math.round(ind.growth * 1000) / 1000, stress: Math.round(ind.stress * 1000) / 1000, text: d.text });
    while (st.decisions.length > KEPT) st.decisions.shift();
    if (d.to !== st.rate) { st.since = this.day; this.g.tablet.post('bank', d.text, 'info'); }
    st.rate = d.to;
    st.lastMeeting = month;
  }
}
