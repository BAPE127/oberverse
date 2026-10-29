// Company accounts (v0.60.0). Pure functions — no game state, no DOM. A company's *account* is
// the money it holds and the story of how it moved: what the owner put in or took out, and the
// cash that flowed through it month by month. Profit and loss stay in each business's own books
// (aerospace `books`, shipping `ledger`, …); this is the cash side, and the same shape for all four.
//
//   freshAccount(id)                  a new, unfunded account
//   monthOf(day)                      the 30-day month a day belongs to (0-based)
//   post(acct, day, dir, cat, amt)    count a flow: dir 'in' | 'out'
//   kindOf(cat, dir)                  how a flow is classed: revenue, opex, capex or other
//   balanceOk(acct)                   whether a funded account's cash reconciles with its history
//
// An UNFUNDED account has no cash of its own: the business draws on the owner's wallet, and the
// flows are only counted (so the books can still be told apart). A FUNDED account holds real cash
// and the business pays from it alone. Funding is an explicit, logged act of the owner.

export const MONTH_DAYS = 30;
export const MONTHS_KEPT = 24;
export const LOG_KEPT = 120;

export const monthOf = (day) => Math.floor((Math.max(1, day) - 1) / MONTH_DAYS);

/** How each flow category is classed in a cash-flow statement. Anything not listed: opex out, revenue in. */
const KINDS = {
  out: {
    machines: 'capex', ship: 'capex', port: 'capex', shipyard: 'capex', works: 'capex', shipbuilding: 'capex', capital: 'capex', company: 'capex', land: 'capex', fencing: 'capex',
    animals: 'capex', research: 'opex', capex: 'capex', equipment: 'capex', plant: 'capex', facility: 'capex', hall: 'capex',
    refund: 'other', deposit: 'other', transfer: 'other', interest: 'opex',
  },
  in: { refund: 'other', deposit: 'other', transfer: 'other', loan: 'other', grant: 'other', insurance: 'other', other: 'other', internal: 'other' },
};
export const kindOf = (cat, dir) => KINDS[dir]?.[cat] || (dir === 'in' ? 'revenue' : 'opex');

export function freshAccount(id) {
  return {
    id,
    funded: false, // true once the owner has put money in; from then on the business pays from `cash` alone
    cash: 0,
    contributed: 0, // money the owner put in (cash)
    distributed: 0, // money the owner took out
    arrears: 0, // bills a funded company could not cover when they fell due: owed, and paid first out of what comes in
    inKind: 0, // assets the owner brought in at cost (a works, a plot, the company itself) — equity, not cash
    flowIn: 0, // cash that came in through the business while funded
    flowOut: 0, // cash that went out through the business while funded
    log: [], // contributions, distributions and acquisitions, newest last
    months: {}, // { [monthIndex]: { in: { cat: amt }, out: { cat: amt } } } — every flow, funded or not
  };
}

const bump = (o, k, n) => { o[k] = (o[k] || 0) + n; };

/** Count a flow in the month it happened (funded or not); the oldest months drop off. */
export function post(acct, day, dir, cat, amount) {
  const m = (acct.months[monthOf(day)] ||= { in: {}, out: {} });
  bump(m[dir], cat, amount);
  const keys = Object.keys(acct.months).map(Number).sort((a, b) => a - b);
  while (keys.length > MONTHS_KEPT) delete acct.months[keys.shift()];
}

/** Add a line to the owner's log (capped). */
export function logLine(acct, line) {
  acct.log.push(line);
  while (acct.log.length > LOG_KEPT) acct.log.shift();
}

/** Totals of one month by class: { revenue, opex, capex, otherIn, otherOut }. */
export function monthTotals(acct, month) {
  const m = acct.months[month] || { in: {}, out: {} };
  const t = { revenue: 0, opex: 0, capex: 0, otherIn: 0, otherOut: 0 };
  for (const [cat, a] of Object.entries(m.in)) { const k = kindOf(cat, 'in'); if (k === 'revenue') t.revenue += a; else t.otherIn += a; }
  for (const [cat, a] of Object.entries(m.out)) { const k = kindOf(cat, 'out'); if (k === 'capex') t.capex += a; else if (k === 'opex') t.opex += a; else t.otherOut += a; }
  return t;
}

/** A funded account's cash must equal what the owner put in, less what was taken out, plus the net flow since. */
export const balanceOk = (acct) => !acct.funded || Math.abs(acct.cash - (acct.contributed - acct.distributed + acct.flowIn - acct.flowOut)) < 0.5;
