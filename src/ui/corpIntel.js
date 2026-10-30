// The Intelligence app (v0.60.0): every company, ranked, from the books each one keeps. Nothing
// here is its own number — it is all read from game.corp (src/systems/corporate.js), which reads
// the companies' own records. A figure a company's books do not have shows as "—", not as zero.
import { h } from './panels.js';
import { SECTORS } from '../corp/identity.js';
import { countryName } from '../corp/registry.js';

const money = (n) => (n === null || n === undefined ? '—' : Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e4 ? `${Math.round(n / 1e3)}k` : Math.round(n).toLocaleString());
const pct = (n) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(Math.abs(n) < 0.1 ? 1 : 0)}%`);
const BY = { revenue: 'Revenue', net: 'Net income', margin: 'Margin', growth: 'Growth', valuation: 'Value', share: 'Share' };
const PERIODS = { month: 'Last month', current: 'This month so far', year: 'Last 12 months' };
const BASIS = { books: 'its full books', cash: 'cash that moved through the company', model: 'its own books', 'run-rate': 'today\'s run-rate', none: 'no figures kept' };
const STATUS = { distressed: 'in distress', closed: 'closed', merged: 'merged' };

export function intelFull(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const S = (ui.corpIntel ||= { sector: null, by: 'revenue', period: 'month', sel: null });
  const mine = K.registry().filter((r) => r.kind === 'player');
  S.sector ||= mine[0]?.sector || 'arms';
  const go = (patch) => { Object.assign(S, patch); open('Intelligence'); };
  const chip = (label, active, onclick) => h('button', { class: `small${active ? ' primary' : ''}`, onclick }, label);
  const mySectors = new Set(mine.map((r) => r.sector));

  body.append(
    h('p', { class: 'muted' }, 'How every company in a line of business is doing, from the books each keeps. Your own businesses are private: they are compared here, and never listed on the exchange.'),
    h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;margin-bottom:6px' }, ...Object.entries(SECTORS).map(([id, s]) => chip(`${mySectors.has(id) ? '★ ' : ''}${s.name}`, S.sector === id, () => go({ sector: id, sel: null })))),
    h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;margin-bottom:6px' }, ...Object.entries(PERIODS).map(([id, l]) => chip(l, S.period === id, () => go({ period: id }))), h('span', { style: 'width:14px' }), ...Object.entries(BY).map(([id, l]) => chip(l, S.by === id, () => go({ by: id })))),
  );

  const table = K.sectorTable(S.sector, { by: S.by, period: S.period });
  const th = (t, extra = '') => h('th', { style: `text-align:right;padding:2px 6px;${extra}` }, t);
  const td = (t, extra = '') => h('td', { style: `text-align:right;padding:2px 6px;${extra}` }, t);
  const head = h('tr', {}, th('#', 'text-align:left'), th('Company', 'text-align:left'), th('From', 'text-align:left'), th('Revenue'), th('Net'), th('Margin'), th('Growth'), th('Share'), th('Value'));
  const rows = table.map((m) => h('tr', { style: `cursor:pointer;${m.mine ? 'background:rgba(255,200,80,0.14);font-weight:600' : ''}${S.sel === m.key ? ';outline:1px solid #ffb547' : ''}`, onclick: () => go({ sel: m.key }) },
    td(m.rank ? String(m.rank) : '—', 'text-align:left'),
    td(`${m.mine ? '★ ' : ''}${m.name}${m.ticker ? ` · ${m.ticker}` : ''}${STATUS[m.status] ? ` (${STATUS[m.status]})` : ''}`, 'text-align:left'),
    td(countryName(g.content, m.country), 'text-align:left'),
    td(money(m.revenue)), td(money(m.net)), td(pct(m.margin)), td(pct(m.growth)), td(pct(m.share)), td(money(m.valuation))));
  body.append(h('div', { style: 'overflow-x:auto' }, h('table', { style: 'width:100%;border-collapse:collapse;font-size:13px' }, h('thead', {}, head), h('tbody', {}, ...rows))),
    h('p', { class: 'muted', style: 'font-size:12px' }, `Ranked by ${BY[S.by].toLowerCase()}, ${PERIODS[S.period].toLowerCase()}. “Value” is an estimate (net assets plus a multiple of a year's profit) — it is not cash. “—”: that company's books do not keep it.`));

  const sel = table.find((m) => m.key === S.sel);
  if (sel) {
    const me = table.find((m) => m.mine);
    const reg = K.registry().find((r) => r.id === sel.key);
    const gen = (K.state.generated || []).find((c) => c.id === sel.key);
    const cmp = me && me.key !== sel.key ? K.compare(me.key, sel.key, S.period) : null;
    body.append(h('h3', { style: 'margin:12px 0 4px' }, sel.name),
      h('div', { class: 'desc' }, `${SECTORS[sel.sector].name} · ${countryName(g.content, sel.country)}${gen ? ` · ${gen.size} company, ${gen.age} years old · known for ${gen.speciality} · a ${gen.strategy} strategy` : ''}${reg?.ticker ? ` · listed as ${reg.ticker}` : ''}`),
      h('div', { class: 'grid2', style: 'margin:6px 0' },
        ...[['Revenue', money(sel.revenue)], ['Net income', money(sel.net)], ['Cash', money(sel.cash)], ['Debt', money(sel.debt)], ['Estimated value', money(sel.valuation)], ['Counted from', BASIS[sel.basis]]].map(([a, b]) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b)))));
    if (cmp) {
      body.append(h('h4', { style: 'margin:8px 0 4px' }, `${me.name} against ${sel.name}`),
        h('div', { class: 'list' }, ...cmp.lines.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${l.label}: you ${l.key === 'margin' || l.key === 'growth' ? pct(l.a) : money(l.a)} · them ${l.key === 'margin' || l.key === 'growth' ? pct(l.b) : money(l.b)}`)), h('span', { class: `tag ${l.lead === 1 ? 'good' : ''}` }, l.lead === null ? 'n/a' : l.lead === 1 ? 'you lead' : l.lead === -1 ? 'they lead' : 'level')))));
    }
  }
  const news = (K.state.gen?.news || []).slice(0, 6);
  if (news.length) body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Business news'), h('div', { class: 'list' }, ...news.map((n) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${n.day} — ${n.text}`))))));
}
