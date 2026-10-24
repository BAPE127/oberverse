// The books (v0.55.0): one simple ledger per aerospace company. Cash moves
// once, where it's earned or spent; the books classify it. Revenue is
// recognised on delivery (a deposit is a liability until then); materials
// are an asset (inventory) until a unit consumes them and is delivered, when
// they become cost of sales. Internal shipping (v0.56.0) is booked as an
// intercompany charge and eliminated in the consolidated view.

/** Income-statement accounts, in report order. */
export const ACCOUNTS = {
  rev_aircraft: { name: 'Revenue — aircraft', kind: 'revenue' },
  rev_rocket: { name: 'Revenue — launch services', kind: 'revenue' },
  rev_missile: { name: 'Revenue — strategic products', kind: 'revenue' },
  rev_satellite: { name: 'Revenue — satellites', kind: 'revenue' },
  rev_services: { name: 'Revenue — satellite services', kind: 'revenue' },
  cogs_materials: { name: 'Materials (cost of units delivered)', kind: 'cost' },
  cogs_freight: { name: 'Freight & logistics (on units delivered)', kind: 'cost' },
  cogs_freight_internal: { name: 'Freight in your own ships (internal charge, on units delivered)', kind: 'cost', internal: true },
  losses: { name: 'Cargo lost in transit', kind: 'cost' },
  wages: { name: 'Wages (technicians, engineers, inspectors)', kind: 'cost' },
  training: { name: 'Training programme', kind: 'cost' },
  upkeep: { name: 'Facilities (upkeep)', kind: 'cost' },
  overhead: { name: 'Manufacturing & head-office overhead', kind: 'cost' },
  research: { name: 'Research & development', kind: 'cost' },
  rework: { name: 'Quality & rework', kind: 'cost' },
  launch: { name: 'Launch costs (range, refurbishment)', kind: 'cost' },
  sat_ops: { name: 'Satellite operations', kind: 'cost' },
  penalties: { name: 'Late penalties & cancellations', kind: 'cost' },
  interest: { name: 'Interest', kind: 'cost' },
  hiring: { name: 'Hiring & layoffs', kind: 'cost' },
  intercompany: { name: 'Internal shipping (intercompany)', kind: 'cost', internal: true },
};

export function freshBooks() {
  return { totals: {}, days: [], deferred: 0, inventoryValue: 0, capex: 0 };
}

/** Post an amount (positive) to an account on a day. */
export function post(books, day, account, amount, keep = 30) {
  if (!amount) return;
  books.totals[account] = (books.totals[account] || 0) + amount;
  let d = books.days[0];
  if (!d || d.day !== day) {
    d = { day, acc: {} };
    books.days.unshift(d);
    if (books.days.length > keep) books.days.length = keep;
  }
  d.acc[account] = (d.acc[account] || 0) + amount;
}

/** Sum the accounts over the last `n` days (or all time when n is null). */
export function summarise(books, n = null, { consolidated = false } = {}) {
  const acc = {};
  if (n === null) Object.assign(acc, books.totals);
  else for (const d of books.days.slice(0, n)) for (const [k, v] of Object.entries(d.acc)) acc[k] = (acc[k] || 0) + v;
  let revenue = 0;
  let costs = 0;
  for (const [k, v] of Object.entries(acc)) {
    const a = ACCOUNTS[k];
    if (!a) continue;
    if (consolidated && a.internal) continue;
    if (a.kind === 'revenue') revenue += v;
    else costs += v;
  }
  return { acc, revenue, costs, profit: revenue - costs };
}

/** The revenue account for a product line. */
export const revenueAccount = (line) => ({ aircraft: 'rev_aircraft', rocket: 'rev_rocket', missile: 'rev_missile', satellite: 'rev_satellite' }[line] || 'rev_aircraft');
