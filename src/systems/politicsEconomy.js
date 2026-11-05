// The economy hooks (v0.96.0): what the policies in force do to farms, arms, aerospace tenders, shipping, the exchange and the state's bond. Added to the Politics service.
// Each hook is a bounded multiplier or a named levy read where a price or a cost is already worked out (src/politics/effects.js, src/content/effects.js). A levy you pay
// is the state's revenue: it reduces the state's debt (in thousands), so nothing is made from nowhere; nothing here ever pays you.
import { EFFECTS as E } from '../content/effects.js';
import { effectsOf, sentimentFor, debtPremium } from '../politics/effects.js';
import { POLICIES, GOVERNMENT as G } from '../content/policies.js';
import { monthly } from '../politics/budget.js';

const NEUTRAL = effectsOf([], { ...E, enabled: false });

export const economyMethods = {
  /** The effects of the policies in force today (neutral until the government exists, or with the knob off). Cached on the policies' own states. */
  fx() {
    const s = this.peek();
    if (!E.enabled || !s?.policies) return NEUTRAL;
    const active = s.policies.filter((p) => p.state === 'active').map((p) => p.key);
    const key = active.join(',');
    if (this._fxKey !== key) { this._fxKey = key; this._fx = effectsOf(active, E); }
    return this._fx;
  },

  /** The share of a sector's expected earnings the policies add or take away (bounded). */
  sectorSentiment(sector) { return sentimentFor(this.fx(), sector); },

  /** A farm sale's inspection fee: returns the fee for a gross sale (and gives it to the state). */
  farmFee(gross) {
    const rate = this.fx().farmFee;
    if (!(rate > 0) || !(gross > 0)) return 0;
    const fee = Math.round(gross * rate);
    this.collectLevy(fee, 'farm inspection');
    return fee;
  },

  /** Port and licensing fees on a voyage: the base fees × (1 + the policies' change). Not a levy collected here: the voyage's own fees already pay the harbours. */
  portFeeFactor() { return 1 + this.fx().portFees; },

  /** The multiplier on how fast Sund's own arms budget refills. */
  sundArmsFactor() { return 1 + this.fx().sundArms; },

  /** The multiplier on how fast Sund's public customers' tender budgets refill. */
  publicBudgetFactor() { return 1 + this.fx().publicBudgets; },

  /** What a levy you paid does: it is the state's revenue (the debt, in thousands, falls). */
  collectLevy(amount, kind) {
    const s = this.peek();
    if (!s || !(amount > 0)) return;
    s.levies ||= { total: 0, by: {} };
    s.levies.total += amount;
    s.levies.by[kind] = (s.levies.by[kind] || 0) + amount;
    if (s.budget) s.budget.debt = Math.max(0, s.budget.debt - amount / 1000);
  },

  /** What the state's debt and deficit add to the yield of its bond (the one bond): a rate, bounded; 0 while comfortable or with the knob off. */
  bondPremium() {
    const s = this.peek();
    if (!s?.budget) return 0;
    const active = s.policies.filter((p) => p.state === 'active').map((p) => POLICIES[p.key]);
    const m = monthly(G.budget, { policies: active, wars: this.wars(), embargoes: this.embargoes(), debt: s.budget.debt, rate: this.rate() }); // without the premium itself
    return debtPremium(s.budget.debt, m.revenue, s.budget.last ? s.budget.last.deficit : m.deficit, E);
  },

  /** The lines the Government page shows: what each policy in force does to you, and what you have paid. */
  effectLines() {
    const s = this.ensure();
    const fx = this.fx();
    return { enabled: E.enabled, lines: fx.lines.map((l) => ({ ...l, name: POLICIES[l.policy].name })), paid: s.levies || { total: 0, by: {} }, premium: this.bondPremium() };
  },
};
