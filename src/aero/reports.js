// The financial reports (v0.59.0), read from a company's books and its floor: the statement by
// month, how cash moved, what the company owns and owes, and which line of work makes the money.
// Everything here only reads; the books are written by src/systems/aerospace.js through
// src/aero/books.js. `A` is the Aerospace system.
import { ACCOUNTS, FLOW, summarise } from './books.js';

const sumKind = (acc, kind, { consolidated = false } = {}) => Object.entries(acc).reduce((a, [k, v]) => { const d = ACCOUNTS[k]; return d && d.kind === kind && !(consolidated && d.internal) ? a + v : a; }, 0);

/** The last `k` months (thirty-day periods), newest last: { m, label, acc, revenue, costs, profit }. */
export function monthly(A, co, k = 6) {
  const rows = (co.books.months || []).slice(0, k).reverse().map((x) => {
    const revenue = sumKind(x.acc, 'revenue');
    const costs = sumKind(x.acc, 'cost');
    return { m: x.m, label: `Days ${x.m * 30 + 1}–${x.m * 30 + 30}`, short: `M${x.m + 1}`, acc: x.acc, revenue, costs, profit: revenue - costs, partial: x.m === Math.floor((A.day - 1) / 30) };
  });
  return rows;
}

/** How cash moved over the last `n` days (null: since the beginning): receipts and payments by what they were for. */
export function cashFlow(A, co, n = null) {
  const acc = {};
  if (n === null) Object.assign(acc, co.books.totals);
  else for (const d of co.books.days.slice(0, n)) for (const [k, v] of Object.entries(d.acc)) acc[k] = (acc[k] || 0) + v;
  const rows = (dir) => Object.entries(FLOW[dir]).map(([key, label]) => ({ key, label, value: acc[`cf_${dir}_${key}`] || 0 })).filter((r) => r.value);
  const inRows = rows('in');
  const outRows = rows('out');
  const into = inRows.reduce((a, r) => a + r.value, 0);
  const out = outRows.reduce((a, r) => a + r.value, 0);
  return { in: inRows, out: outRows, totalIn: into, totalOut: out, net: into - out, operating: into - out + (acc.cf_out_capital || 0), capital: acc.cf_out_capital || 0 };
}

/** What the company owns and owes now. Cash is the owner's wallet for Roost (so it isn't counted); Meridian has its own. */
export function balanceSheet(A, co) {
  const C = A.cfg;
  const stores = Math.round(co.books.inventoryValue);
  const wip = Math.round(A.unitsOf(co).filter((u) => u.purpose !== 'launcher').reduce((a, u) => a + u.cost.materials + u.cost.freight + (u.cost.freightInt || 0), 0));
  let plant = co.bays.reduce((a, b) => a + C.bays[b.type].build, 0);
  for (const id of Object.keys(co.facilities || {})) if (co.facilities[id] && C.facilities[id]?.build) plant += C.facilities[id].build;
  if (co.pad) plant += C.facilities.pad.build;
  if (co.halls) for (const id of Object.keys(C.halls)) if (!C.halls[id].owned && A.hallState(co, id).state === 'built') plant += C.halls[id].build;
  plant = Math.round(plant * 0.6);
  const fleet = Math.round(co.books.fleet || 0);
  const cash = co.kind === 'rival' ? Math.round(co.cash) : null;
  const assets = stores + wip + plant + fleet + (cash ?? 0);
  const deposits = Math.round(co.books.deferred);
  const liabilities = deposits;
  const net = assets - liabilities;
  const result = Math.round(summarise(co.books, null).profit);
  return {
    assets: [
      ...(cash === null ? [] : [{ label: 'Cash', value: cash }]),
      { label: 'Materials in stores and on order', value: stores },
      { label: 'Work in progress (what open units have cost so far)', value: wip },
      { label: 'Plant: bays, halls and facilities, at 60% of cost', value: plant },
      { label: 'Satellite fleet (book value)', value: fleet },
    ],
    liabilities: [{ label: 'Deposits held — work still owed to customers', value: deposits }],
    totalAssets: assets, totalLiabilities: liabilities, net, result, capital: net - result, cash,
  };
}

/** Which line of work makes the money: revenue, direct cost (materials and freight), contribution and margin, per line and per product. */
export function segments(A, co) {
  const C = A.cfg;
  const L = co.books.lines || {};
  const names = { aircraft: 'Aircraft', rocket: 'Launch vehicles', missile: 'Strategic products', satellite: 'Satellites (built for customers)' };
  const rows = Object.keys(names).map((id) => { const x = L[id] || { units: 0, revenue: 0, cost: 0, late: 0 }; return { id, name: names[id], units: x.units, revenue: x.revenue, cost: x.cost, late: x.late, contribution: x.revenue - x.cost, margin: x.revenue ? (x.revenue - x.cost) / x.revenue : 0 }; });
  const t = co.books.totals;
  const servicesRev = (t.rev_services || 0) + (t.rev_claims || 0);
  const servicesCost = (t.sat_ops || 0) + (t.depreciation || 0) + (t.insurance || 0);
  rows.push({ id: 'services', name: 'Satellite services & support', units: Object.values(A.state.satellites).filter((s) => s.manufacturer === co.id).length, revenue: servicesRev, cost: servicesCost, late: 0, contribution: servicesRev - servicesCost, margin: servicesRev ? (servicesRev - servicesCost) / servicesRev : 0, services: true });
  const products = Object.entries(co.books.products || {}).map(([id, x]) => ({ id, name: C.products[id]?.name || id, line: C.products[id]?.line, units: x.units, revenue: x.revenue, cost: x.cost, late: x.late, contribution: x.revenue - x.cost, margin: x.revenue ? (x.revenue - x.cost) / x.revenue : 0 })).sort((a, b) => b.contribution - a.contribution);
  return { rows, products, total: rows.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, contribution: a.contribution + r.contribution }), { revenue: 0, cost: 0, contribution: 0 }) };
}

/** A few numbers that say how the year is going. */
export function headline(A, co) {
  const all = summarise(co.books, null);
  const m30 = summarise(co.books, 30);
  const t = co.books.totals;
  const cogs = (t.cogs_materials || 0) + (t.cogs_freight || 0) + (t.cogs_freight_internal || 0);
  const goods = (t.rev_aircraft || 0) + (t.rev_rocket || 0) + (t.rev_missile || 0) + (t.rev_satellite || 0);
  const fleet = Math.round(co.books.fleet || 0);
  const svc30 = summarise({ days: co.books.days }, 30).acc.rev_services || 0;
  return {
    revenue: all.revenue, profit: all.profit, margin: all.revenue ? all.profit / all.revenue : 0,
    grossMargin: goods ? (goods - cogs) / goods : 0, revenue30: m30.revenue, profit30: m30.profit,
    perTechnician: co.workforce ? Math.round(m30.revenue / co.workforce) : 0,
    fleetYield: fleet ? (svc30 / 30 * 365) / fleet : null,
  };
}

/** Rows (arrays of cells) to CSV text, with the quoting a spreadsheet expects. */
export function toCsv(rows) {
  return rows.map((r) => r.map((c) => { const v = c === null || c === undefined ? '' : String(c); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(',')).join('\n');
}
