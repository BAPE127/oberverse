// Comparing companies (v0.60.0). Pure functions over plain figures — no game state, no DOM.
//
//   figures(rows)             one period's figures from a list of month rows
//   growth(now, before)       change between two periods (null when there is nothing to compare)
//   value(K, sector, inputs)  what a company is worth: its net assets plus a multiple of a year's profit
//   rank(entries, key)        entries ordered by a figure, ranks given, those without it left unranked
//   shares(entries)           each one's share of what the tracked companies sold
//
// A figure that a company's books do not have is `null`, never zero or a guess; the screens say
// "not available". A valuation is a statement about worth, not money: nothing here moves a coin.

const sum = (a, f) => a.reduce((x, r) => x + (f(r) ?? 0), 0);
const has = (a, f) => a.some((r) => f(r) !== null && f(r) !== undefined);

/**
 * Figures for a period from month rows { revenue, cogs|null, opex, capex, interest, net }. Operating
 * profit is revenue less cost of goods (if kept apart) and operating expenses.
 */
export function figures(rows) {
  if (!rows.length) return null;
  const revenue = sum(rows, (r) => r.revenue);
  const cogs = has(rows, (r) => r.cogs) ? sum(rows, (r) => r.cogs) : null;
  const opex = sum(rows, (r) => r.opex);
  const capex = sum(rows, (r) => r.capex);
  const interest = sum(rows, (r) => r.interest);
  const operating = revenue - (cogs ?? 0) - opex;
  const net = has(rows, (r) => r.net) ? sum(rows, (r) => r.net) : operating - interest;
  return { revenue, cogs, opex, operating, interest, net, capex, margin: revenue > 0 ? net / revenue : null, months: rows.length };
}

export const growth = (now, before) => (now && before && before > 0 ? now / before - 1 : null);

/**
 * What a company is worth: its net assets, plus a multiple (`pe`) of a year's profit — a loss counts
 * for half as much against it. Never below a third of its net assets (what its plant would fetch
 * if it were sold), nor below zero. `annualProfit` may be null (no history yet): then it is worth
 * its net assets.
 */
export function value(K, sector, { netAssets, annualProfit }) {
  const pe = K.sectors[sector].pe;
  const earnings = annualProfit === null || annualProfit === undefined ? 0 : annualProfit >= 0 ? pe * annualProfit : 0.5 * pe * annualProfit;
  return Math.max(0, Math.round(Math.max(netAssets + earnings, Math.max(0, netAssets) / 3)));
}

/** Order entries by `key(entry)` (a number, or null for "not available"); the ranked ones get rank 1..n. */
export function rank(entries, key, { ascending = false } = {}) {
  const ok = entries.filter((e) => Number.isFinite(key(e)));
  ok.sort((a, b) => (ascending ? key(a) - key(b) : key(b) - key(a)) || String(a.id).localeCompare(String(b.id)));
  const out = ok.map((e, i) => ({ ...e, rank: i + 1 }));
  for (const e of entries) if (!Number.isFinite(key(e))) out.push({ ...e, rank: null });
  return out;
}

/** Share of the revenue that the tracked companies made. */
export function shares(entries) {
  const total = sum(entries, (e) => (Number.isFinite(e.revenue) ? e.revenue : 0));
  return Object.fromEntries(entries.map((e) => [e.id, total > 0 && Number.isFinite(e.revenue) ? e.revenue / total : null]));
}
