// The Exchange app (v0.66.0): every listed company on one board, with what you hold. Read from game.corp.exchange;
// every button calls it. The three older shares keep their own rules (the app says so); Stocks has their projects.
import { h } from './panels.js';
import { spark } from '../corp/exchange.js';

const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString());
const px = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(2));
const pct = (x) => (x === null ? '—' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`);
const SORTS = { ticker: 'Ticker', change: 'Day change', value: 'Held', price: 'Price' };

export function exchangeApp(ui, body, open) {
  const g = ui.game;
  const E = g.corp.exchange;
  const S = (ui.corpExchange ||= { sel: null, sector: '', sort: 'ticker' });
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Exchange'); };
  const view = (patch) => { Object.assign(S, patch); open('Exchange'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));

  const P = E.portfolio();
  body.append(h('div', { class: 'grid2' }, stat('Your obols', n(g.player.money)), stat('Shares held, at today\'s prices', n(P.value)),
    stat('Gain on holdings whose cost is kept', P.cost || P.rows.some((r) => r.cost !== null) ? `${P.gain >= 0 ? '+' : '−'}${n(Math.abs(P.gain))}` : '—'), stat('Dividends received', n(P.divs))));
  if (P.unknownCost) body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'Ober\'s Oil and Chuckie\'s Cheese have never kept what you paid, so their gains are not shown rather than guessed.'));

  let rows = E.board();
  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort();
  const sector = h('select', { class: 'debug-input' }, h('option', { value: '' }, 'All sectors'), ...sectors.map((s) => h('option', { value: s, selected: s === S.sector }, s)));
  const sort = h('select', { class: 'debug-input' }, ...Object.entries(SORTS).map(([v, t]) => h('option', { value: v, selected: v === S.sort }, `Sort: ${t}`)));
  body.append(h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin:8px 0' }, sector, sort, h('button', { class: 'small', onclick: () => view({ sector: sector.value, sort: sort.value }) }, 'Apply')));
  if (S.sector) rows = rows.filter((r) => r.sector === S.sector);
  const key = { ticker: (a, b) => (a.ticker < b.ticker ? -1 : 1), change: (a, b) => (b.change ?? -9) - (a.change ?? -9), value: (a, b) => b.value - a.value || (a.ticker < b.ticker ? -1 : 1), price: (a, b) => b.price - a.price }[S.sort];
  rows = [...rows].sort(key);

  body.append(h('div', { class: 'list' }, ...rows.map((r) => h('div', { class: 'item-row', style: `align-items:flex-start;cursor:pointer;${S.sel === r.ticker ? 'outline:1px solid #8ab' : ''}`, onclick: () => view({ sel: S.sel === r.ticker ? null : r.ticker }) },
    h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${r.ticker} · ${r.name}`, r.sector ? h('span', { class: 'tag' }, r.sector) : null, r.status && r.status !== 'listed' ? h('span', { class: 'tag neg' }, r.status) : null, r.held > 0 ? h('span', { class: 'tag good' }, `hold ${n(r.held)}`) : null),
      h('div', { class: 'desc' }, `${px(r.price)} obols`, ' ', h('span', { style: `color:${r.change === null ? 'inherit' : r.change >= 0 ? '#7c7' : '#e66'}` }, pct(r.change)), `  ${spark(r.history.slice(-30))}`)),
    h('div', { class: 'desc' }, r.held > 0 ? `worth ${n(r.value)}` : '')))));

  if (!rows.some((x) => x.source === 'generated') && !S.sector) body.append(h('p', { class: 'muted' }, 'The other companies are listed once the wider world has opened its books, after the first morning.'));

  const r = S.sel && E.find(S.sel);
  if (r) body.append(detail(r));

  const log = (E.peek()?.log || []).slice(-6).reverse();
  if (log.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`))))));
  body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'A share\'s price moves a part of the way each day toward what the company\'s own books say it is worth; it never follows what you buy or sell. A broker\'s fee is charged each way, and no investor may hold more than 5% of a company. Dividends are what the company really paid out of a month\'s profit, once a month. Nothing here is advice: a company can fail, and then its shares are worth nothing.'));

  function detail(r) {
    const hist = r.history;
    const lo = hist.length ? Math.min(...hist) : r.price; const hi = hist.length ? Math.max(...hist) : r.price;
    const row = (label, val) => h('div', { class: 'desc' }, `${label}: ${val}`);
    const trade = (qty, buy) => {
      const q = E.quoteFor(r.ticker, qty);
      const cost = q ? (buy ? q.total : q.gross - q.fee) : 0;
      return h('button', { class: `small${buy ? ' primary' : ''}`, disabled: r.status && r.status !== 'listed' || (buy ? g.player.money < cost : r.held < qty), onclick: () => go(buy ? E.buy(r.ticker, qty) : E.sell(r.ticker, qty)) }, `${buy ? 'Buy' : 'Sell'} ${qty} (${n(cost)})`);
    };
    return h('div', { style: 'margin-top:8px;padding:8px;border:1px solid #556;border-radius:4px' },
      h('h3', { style: 'margin:0 0 4px' }, `${r.ticker} · ${r.name}`),
      h('div', { class: 'desc', style: 'font-family:monospace;font-size:15px' }, spark(hist)),
      row('Price', `${px(r.price)} obols (${hist.length} days: low ${px(lo)}, high ${px(hi)})`),
      r.fair !== undefined ? row('Worth on its books', `${px(r.fair)} a share`) : null,
      r.shares ? row('Shares', `${n(r.shares)}${r.cap ? `, you may hold ${n(r.cap)}` : ''}`) : null,
      row('Broker\'s fee', r.fee ? `${(r.fee * 100).toFixed(0)}% each way` : 'none'),
      row('You hold', `${n(r.held)} (worth ${n(r.value)}${r.cost !== null && r.held > 0 ? `; cost ${n(r.cost)}, ${r.value - r.cost >= 0 ? 'up' : 'down'} ${n(Math.abs(r.value - r.cost))}` : ''}); dividends received ${n(r.divs)}`),
      r.own ? h('p', { class: 'muted', style: 'font-size:12px' }, r.own) : null,
      r.closed ? h('p', { class: 'muted' }, `Your ${n(r.closed.shares)} shares ended on day ${r.closed.day}: ${r.closed.status}.`) : null,
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:6px;flex-wrap:wrap' }, ...[1, 10, 100].map((q) => trade(q, true)), ...[1, 10, 100].map((q) => trade(q, false))));
  }
}
