// The financial reports of the aerospace terminal (v0.59.0): month by month, how cash moved,
// what the company owns and owes, and which line of work pays. Read from src/aero/reports.js.
import { ACCOUNTS } from '../aero/books.js';
import { toCsv } from '../aero/reports.js';
import { fmtMoney } from '../aero/catalog.js';

export const BOOK_TABS = [['statement', 'Statement'], ['months', 'Month by month'], ['cash', 'Cash flow'], ['balance', 'Balance sheet'], ['lines', 'By line of work']];

const n0 = (v) => Math.round(v).toLocaleString();
const neg = (v) => (Math.round(v) ? `−${n0(v)}` : '—');
const pct = (v) => `${(v * 100).toFixed(1)}%`;

/** Download text as a file (a spreadsheet opens a .csv). */
function download(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* a browser that will not */ }
}

export function booksReport(env, tab) {
  const { A, C, h, btn, kpi, section, muted, COL, AO, refresh, co } = env;
  const c = co();
  const head = A.headlineReport(c);
  const kpis = h('div', { class: 'ao-kpis' }, kpi('Revenue, all time', fmtMoney(head.revenue), 'pos'), kpi('Profit, all time', fmtMoney(head.profit), head.profit >= 0 ? 'pos' : 'neg', `${pct(head.margin)} of revenue`), kpi('Gross margin on units', pct(head.grossMargin), head.grossMargin > 0.25 ? 'pos' : '', 'before wages and running costs'), kpi('Revenue, 30 days', fmtMoney(head.revenue30), '', `${fmtMoney(head.perTechnician)} a technician`));
  const exportBtn = (name, rows) => h('div', { class: 'ao-exportrow' }, btn('⬇ Export CSV', () => download(`${name}.csv`, toCsv(rows)), 'small'));

  if (tab === 'months') {
    const rows = A.monthlyReport(c, 6);
    const accts = Object.keys(ACCOUNTS).filter((k) => rows.some((r) => r.acc[k]));
    const chart = h('canvas', { width: 1400, height: 240, class: 'ao-chart' });
    const x = chart.getContext('2d');
    const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.costs)));
    const bw = 1400 / Math.max(6, rows.length);
    rows.forEach((r, i) => {
      x.fillStyle = 'rgba(94,224,138,0.85)'; x.fillRect(i * bw + bw * 0.14, 205 - (r.revenue / max) * 180, bw * 0.34, (r.revenue / max) * 180);
      x.fillStyle = 'rgba(255,107,107,0.8)'; x.fillRect(i * bw + bw * 0.52, 205 - (r.costs / max) * 180, bw * 0.34, (r.costs / max) * 180);
      x.fillStyle = r.profit >= 0 ? '#9be8b4' : '#ffa3a3'; x.font = '20px system-ui'; x.textAlign = 'center';
      x.fillText(`${r.profit >= 0 ? '+' : ''}${fmtMoney(r.profit)}`, i * bw + bw / 2, 30 + 0 * i);
      x.fillStyle = '#8fa3bf'; x.font = '18px system-ui'; x.fillText(`${r.short}${r.partial ? ' (so far)' : ''}`, i * bw + bw / 2, 232);
    });
    const csv = [['Account', ...rows.map((r) => r.label)], ...accts.map((k) => [ACCOUNTS[k].name, ...rows.map((r) => Math.round(r.acc[k] || 0))]), ['Revenue', ...rows.map((r) => Math.round(r.revenue))], ['Costs', ...rows.map((r) => Math.round(r.costs))], ['Profit', ...rows.map((r) => Math.round(r.profit))]];
    return h('div', {}, kpis,
      section('Month by month — thirty-day months', exportBtn('roost-months', csv), rows.length ? chart : muted('The first month is still being written.'),
        h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
          h('tr', {}, h('th', {}, 'Account'), ...rows.map((r) => h('th', { class: 'r', title: r.label }, `${r.short}${r.partial ? '*' : ''}`))),
          ...accts.map((k) => h('tr', { class: ACCOUNTS[k].kind === 'revenue' ? 'pos' : '' }, h('td', {}, ACCOUNTS[k].name), ...rows.map((r) => h('td', { class: 'r' }, r.acc[k] ? `${ACCOUNTS[k].kind === 'revenue' ? '' : '−'}${n0(r.acc[k])}` : '—')))),
          h('tr', { class: 'total' }, h('td', {}, 'Operating profit'), ...rows.map((r) => h('td', { class: `r ${r.profit >= 0 ? 'pos' : 'neg'}` }, n0(r.profit)))))),
        muted('* the month in progress. Depreciation of the satellite fleet is a cost here that never left your account; the cash flow report shows what did.')));
  }

  if (tab === 'cash') {
    const periods = [['7 days', 7], ['30 days', 30], ['Since the beginning', null]];
    const flows = periods.map(([, n]) => A.cashFlowReport(c, n));
    const keys = (dir) => [...new Set(flows.flatMap((f) => f[dir].map((r) => r.key)))];
    const label = (dir, key) => flows.map((f) => f[dir].find((r) => r.key === key)).find(Boolean).label;
    const csv = [['', ...periods.map(([l]) => l)], ...keys('in').map((k) => [label('in', k), ...flows.map((f) => Math.round(f.in.find((r) => r.key === k)?.value || 0))]), ...keys('out').map((k) => [label('out', k), ...flows.map((f) => -Math.round(f.out.find((r) => r.key === k)?.value || 0))]), ['Net', ...flows.map((f) => Math.round(f.net))]];
    return h('div', {}, kpis,
      section('How cash moved', exportBtn('roost-cashflow', csv), h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
        h('tr', {}, h('th', {}, ''), ...periods.map(([l]) => h('th', { class: 'r' }, l))),
        h('tr', { class: 'sub' }, h('td', { colspan: 4 }, 'Cash in')),
        ...keys('in').map((k) => h('tr', { class: 'pos' }, h('td', {}, label('in', k)), ...flows.map((f) => h('td', { class: 'r' }, f.in.find((r) => r.key === k)?.value ? n0(f.in.find((r) => r.key === k).value) : '—')))),
        h('tr', { class: 'sub' }, h('td', { colspan: 4 }, 'Cash out')),
        ...keys('out').map((k) => h('tr', {}, h('td', {}, label('out', k)), ...flows.map((f) => h('td', { class: 'r' }, neg(f.out.find((r) => r.key === k)?.value || 0))))),
        h('tr', { class: 'total' }, h('td', {}, 'Net cash movement'), ...flows.map((f) => h('td', { class: `r ${f.net >= 0 ? 'pos' : 'neg'}` }, n0(f.net)))),
        h('tr', {}, h('td', {}, '…of which before halls, bays and facilities'), ...flows.map((f) => h('td', { class: `r ${f.operating >= 0 ? 'pos' : 'neg'}` }, n0(f.operating)))))),
      muted(c.kind === 'player' ? 'Roost draws on your own account, so this is what moved in and out of it on the firm\'s behalf. A deposit is cash in the day it is paid and revenue only when the unit is delivered.' : '')));
  }

  if (tab === 'balance') {
    const b = A.balanceReport(c);
    const csv = [['', 'Obols'], ...b.assets.map((r) => [r.label, r.value]), ['Total assets', b.totalAssets], ...b.liabilities.map((r) => [r.label, -r.value]), ['Net assets', b.net], ['Result since the beginning', b.result], ['Capital put in (net assets less the result)', b.capital]];
    const col = (title, rows, total, totalLabel) => h('div', { class: 'ao-bs-col' }, h('h5', {}, title), ...rows.map((r) => h('div', { class: 'ao-bs-row' }, h('span', {}, r.label), h('b', {}, n0(r.value)))), h('div', { class: 'ao-bs-row total' }, h('span', {}, totalLabel), h('b', {}, n0(total))));
    return h('div', {}, kpis,
      section('What the company owns and owes — now', exportBtn('roost-balance', csv),
        h('div', { class: 'ao-two' }, col('Owns', b.assets, b.totalAssets, 'Total assets'), col('Owes', b.liabilities, b.totalLiabilities, 'Total liabilities')),
        h('div', { class: 'ao-kpis' }, kpi('Net assets', fmtMoney(b.net), b.net >= 0 ? 'pos' : 'neg'), kpi('Result since the beginning', fmtMoney(b.result), b.result >= 0 ? 'pos' : 'neg'), kpi('Capital put in', fmtMoney(b.capital), '', 'net assets less the result'), kpi('Satellite fleet', fmtMoney(c.books.fleet || 0), '', 'book value')),
        muted(c.kind === 'player' ? 'Cash is not on the sheet: Roost spends from your own account. Work in progress is what the open units have cost in materials and freight so far; plant is counted at 60% of what the halls, bays and facilities cost.' : 'Meridian\'s own cash is in the assets.')));
  }

  // by line of work
  const seg = A.segmentReport(c);
  const csv = [['Line', 'Units', 'Revenue', 'Direct cost', 'Contribution', 'Margin'], ...seg.rows.map((r) => [r.name, r.units, Math.round(r.revenue), Math.round(r.cost), Math.round(r.contribution), pct(r.margin)]), [], ['Product', 'Units', 'Revenue', 'Direct cost', 'Contribution', 'Margin', 'Late'], ...seg.products.map((r) => [r.name, r.units, Math.round(r.revenue), Math.round(r.cost), Math.round(r.contribution), pct(r.margin), r.late])];
  const marginBar = (m) => h('div', { class: 'ao-meter', title: pct(m) }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, m)) * 100)}%;background:${m > 0.3 ? COL.green : m > 0.1 ? COL.amber : COL.red}` }));
  return h('div', {}, kpis,
    section('By line of work', exportBtn('roost-lines', csv), h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
      h('tr', {}, h('th', {}, 'Line'), h('th', { class: 'r' }, 'Units'), h('th', { class: 'r' }, 'Revenue'), h('th', { class: 'r' }, 'Direct cost'), h('th', { class: 'r' }, 'Contribution'), h('th', {}, 'Margin')),
      ...seg.rows.map((r) => h('tr', {}, h('td', {}, r.name), h('td', { class: 'r' }, r.units ? String(r.units) : '—'), h('td', { class: 'r' }, n0(r.revenue)), h('td', { class: 'r' }, n0(r.cost)), h('td', { class: `r ${r.contribution >= 0 ? 'pos' : 'neg'}` }, n0(r.contribution)), h('td', {}, r.revenue ? [marginBar(r.margin), pct(r.margin)] : '—'))),
      h('tr', { class: 'total' }, h('td', {}, 'All lines'), h('td', {}), h('td', { class: 'r' }, n0(seg.total.revenue)), h('td', { class: 'r' }, n0(seg.total.cost)), h('td', { class: `r ${seg.total.contribution >= 0 ? 'pos' : 'neg'}` }, n0(seg.total.contribution)), h('td', {})))),
      muted('Direct cost is the materials and freight in the units delivered (for satellite services: running costs, depreciation and insurance). Wages, upkeep and overhead are shared by all of it and are in the statement.')),
    seg.products.length ? section('By product', h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
      h('tr', {}, h('th', {}, 'Product'), h('th', { class: 'r' }, 'Units'), h('th', { class: 'r' }, 'Revenue'), h('th', { class: 'r' }, 'Contribution'), h('th', {}, 'Margin'), h('th', { class: 'r' }, 'Late')),
      ...seg.products.map((r) => h('tr', {}, h('td', {}, r.name), h('td', { class: 'r' }, String(r.units)), h('td', { class: 'r' }, n0(r.revenue)), h('td', { class: `r ${r.contribution >= 0 ? 'pos' : 'neg'}` }, n0(r.contribution)), h('td', {}, [marginBar(r.margin), pct(r.margin)]), h('td', { class: 'r' }, r.late ? String(r.late) : '—')))))) : muted('Deliver something and it appears here.'));
}
