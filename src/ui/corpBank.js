// The Bank app (v0.68.0): the First Bank of Halvermouth's policy rate, how it was decided and what it does. Read-only:
// nobody sets the rate, and nothing here moves money.
import { h } from './panels.js';
import { spark } from '../corp/exchange.js';
import { NEUTRAL } from '../corp/bank.js';

const pc = (v, d = 2) => `${(v * 100).toFixed(d)}%`;
const sgn = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(d)}`;

export function bankApp(ui, body) {
  const g = ui.game;
  const B = g.corp.bank;
  const st = B.peek();
  const E = B.effects();
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));
  const month = Math.floor((g.clock.day - 1) / 30);
  const next = Math.max(month + 1, 3) * 30 + 1;
  body.append(
    h('p', { class: 'doc' }, '🏦 The First Bank of Halvermouth sets one rate for the whole economy. It is nobody\'s to set: once a month, from the fourth month of the game, it follows how busy the world\'s companies are, how fast their sales are growing and how many are in distress, a quarter-point at a time, and writes down why.'),
    h('div', { class: 'grid2' },
      stat('Policy rate', pc(E.rate)), stat('Neutral rate', pc(NEUTRAL)),
      stat('Held since', st ? `day ${st.since}` : 'the start'), stat('Next meeting', `day ${next}`)));
  if (st?.decisions.length) body.append(h('div', { class: 'desc', style: 'font-family:monospace;font-size:15px;margin:6px 0' }, `Rate over the meetings: ${spark(st.decisions.map((d) => d.to))}  (${pc(Math.min(...st.decisions.map((d) => d.to)))} – ${pc(Math.max(...st.decisions.map((d) => d.to)))})`));
  const ind = B.indicators();
  if (ind) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'What it is looking at now'), h('div', { class: 'grid2' }, stat('Capacity in use', pc(ind.util, 0)), stat('Sales, last month on the month before', `${sgn(ind.growth)}%`), stat('Companies in distress', pc(ind.stress, 0))));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'What the rate does'), h('div', { class: 'list' },
    h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, 'Loans inside your group'), h('div', { class: 'desc' }, `The parent lends its subsidiaries at the policy rate plus a point: ${pc(g.corp.group.defaultRate(), 1)} now.`))),
    h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, 'The world\'s companies'), h('div', { class: 'desc' }, `They borrow at the policy rate plus a point and their risk; they build when busier than ${pc(0.8 + E.invest, 1)} of capacity (usually 80%), and new ones appear ${E.entry >= 1 ? `${((E.entry - 1) * 100).toFixed(0)}% more` : `${((1 - E.entry) * 100).toFixed(0)}% less`} often than at the neutral rate.`))),
    h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, 'What companies are worth'), h('div', { class: 'desc' }, `A year's profit counts for ${(E.valuation * 100).toFixed(1)}% of its usual multiple: every estimated value, yours and theirs, and so the exchange's prices. It never creates money.`)))));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'The record'));
  const rows = (st?.decisions || []).slice(-12).reverse();
  if (!rows.length) body.append(h('p', { class: 'muted' }, 'The bank has not met yet. Its first meeting is on day 91; until then the rate is the 5% it has always been.'));
  else body.append(h('div', { class: 'list' }, ...rows.map((d) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `Day ${d.day}: ${d.to > d.from ? 'raised' : d.to < d.from ? 'lowered' : 'held'} at ${pc(d.to)}`), h('div', { class: 'desc' }, d.text))))));
}
