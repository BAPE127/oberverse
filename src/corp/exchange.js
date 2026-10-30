// The exchange (v0.66.0). Pure functions — no game state, no DOM, no RNG: a day's mood is a hash the caller supplies.
//
//   listingShares(value, price)      how many shares a company of this worth has at its first price
//   fairPrice(value, shares)         what a share is worth on the company's own books
//   nextPrice(X, price, fair, mood)  tomorrow's price: part of the way to fair value, times the day's mood
//   quote(X, price, n)               what n shares cost or fetch, and the broker's fee
//   roomFor(X, shares, held)         how many more one investor may hold
//   spark(prices)                    a line of blocks showing a run of prices
//
// A valuation is an opinion: nothing here makes money. A share's price is the company's worth divided by the shares it has.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const listingShares = (value, price) => Math.max(1000, Math.round(value / Math.max(1, price)));
export const fairPrice = (value, shares) => (shares > 0 && value >= 0 ? value / shares : null);

/** The same step Meridian's shares have always taken: part of the way to fair value, times a mood in ±noise. */
export function nextPrice(X, price, fair, mood) {
  const p = (price + (fair - price) * X.priceAdjust) * (1 + (mood * 2 - 1) * X.noise);
  return Math.max(X.minPrice, Math.round(p * 100) / 100);
}

export function quote(X, price, n) {
  const gross = Math.round(price * n);
  return { gross, fee: Math.ceil(gross * X.fee) };
}

export const maxHold = (X, shares) => Math.floor(shares * X.maxShare);
export const roomFor = (X, shares, held) => Math.max(0, maxHold(X, shares) - held);

const BLOCKS = '▁▂▃▄▅▆▇█';
/** A run of prices as blocks, scaled to its own low and high. */
export function spark(prices) {
  if (!prices.length) return '';
  const lo = Math.min(...prices); const hi = Math.max(...prices);
  if (hi === lo) return BLOCKS[3].repeat(prices.length);
  return prices.map((p) => BLOCKS[clamp(Math.round(((p - lo) / (hi - lo)) * 7), 0, 7)]).join('');
}
