// The Bank app (v0.68.0; the OberPad's "Rates", v0.83.0): the First Bank of Halvermouth's policy rate — one figure, three tiles,
// the last few decisions; how it works and what it does are behind the "?". Read-only: nobody sets the rate, and nothing here moves money.
import { h } from './panels.js';
import { spark } from '../corp/exchange.js';
import { NEUTRAL } from '../corp/bank.js';
import { hero, tiles, row, help, pc } from './tabletKit.js';

const sgn = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(d)}`;

export function bankApp(ui, body) {
  const g = ui.game;
  const B = g.corp.bank;
  const st = B.peek();
  const E = B.effects();
  const month = Math.floor((g.clock.day - 1) / 30);
  const next = Math.max(month + 1, 3) * 30 + 1;
  const rates = (st?.decisions || []).map((d) => d.to);
  body.append(
    hero({ label: 'Policy rate', value: pc(E.rate), sub: rates.length > 1 ? `${spark(rates)}  ${pc(Math.min(...rates))} – ${pc(Math.max(...rates))}` : 'the rate it has always been' }),
    tiles([{ n: pc(NEUTRAL, 1), t: 'neutral rate' }, { n: st ? `day ${st.since}` : 'the start', t: 'held since' }, { n: `day ${next}`, t: 'next meeting' }]));
  const rows = (st?.decisions || []).slice(-3).reverse();
  body.append(h('div', { class: 'tb-card list' }, ...(rows.length ? rows.map((d) => row({ icon: d.to > d.from ? '▲' : d.to < d.from ? '▼' : '＝', title: `Day ${d.day}: ${d.to > d.from ? 'raised' : d.to < d.from ? 'lowered' : 'held'} at ${pc(d.to)}`, sub: d.text })) : [row({ icon: '🏦', title: 'No meeting yet', sub: 'The first is on day 91; until then the rate is the 5% it has always been.' })])));
  const ind = B.indicators();
  body.append(
    help('How the rate is set ›', 'The First Bank of Halvermouth sets one rate for the whole economy. It is nobody\'s to set: once a month, from the fourth month of the game, it follows how busy the world\'s companies are, how fast their sales are growing and how many are in distress, a quarter-point at a time, and writes down why.',
      ...(ind ? [`Looking at now: capacity in use ${pc(ind.util, 0)}, sales last month on the month before ${sgn(ind.growth)}%, companies in distress ${pc(ind.stress, 0)}.`] : [])),
    help('What the rate does ›',
      `Loans inside your group: the parent lends its subsidiaries at the policy rate plus a point: ${pc(g.corp.group.defaultRate(), 1)} now.`,
      `The world's companies: they borrow at the policy rate plus a point and their risk; they build when busier than ${pc(0.8 + E.invest, 1)} of capacity (usually 80%), and new ones appear ${E.entry >= 1 ? `${((E.entry - 1) * 100).toFixed(0)}% more` : `${((1 - E.entry) * 100).toFixed(0)}% less`} often than at the neutral rate.`,
      `What companies are worth: a year's profit counts for ${(E.valuation * 100).toFixed(1)}% of its usual multiple: every estimated value, yours and theirs, and so the exchange's prices. It never creates money.`),
    ...((st?.decisions.length || 0) > 3 ? [help('The whole record ›', ...(st.decisions.slice(-12).reverse().map((d) => `Day ${d.day}: ${d.to > d.from ? 'raised' : d.to < d.from ? 'lowered' : 'held'} at ${pc(d.to)}. ${d.text}`)))] : []));
}
