// Corporate credit (v0.71.0). Pure functions — no game state, no DOM, no RNG.
//
//   rate(c)             a company's rating from its own books: how much it owes against what it owns, whether it earns, whether it is in distress
//   spreadOf(rating)    what it pays over the policy rate
//   recovery(plant, debt) what lenders get back when it fails (the world's own rule: the plant sold at 40% of book)
//   issueFace(value)    how big a bond issue is for a company of this worth
//
// "Default risk follows their books": a company is not given a chance of defaulting — its rating moves as its debt, earnings and
// distress move, a bond's price moves with the rating, and it defaults only when the world's simulation actually closes it.

export const RATINGS = ['AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
const SPREAD = { AA: 0.0075, A: 0.0125, BBB: 0.02, BB: 0.035, B: 0.055, CCC: 0.1 };

export const spreadOf = (rating) => SPREAD[rating] ?? SPREAD.CCC;

/** c: { debt, cash, plantValue, lastNet, status }. */
export function rate(c) {
  if (c.status === 'distressed') return 'CCC';
  const assets = Math.max(1, (c.plantValue || 0) + Math.max(0, c.cash || 0));
  const lev = (c.debt || 0) / assets;
  let i = lev < 0.1 ? 0 : lev < 0.25 ? 1 : lev < 0.45 ? 2 : lev < 0.7 ? 3 : 4;
  if ((c.lastNet ?? 0) < 0) i += 1; // a company that is losing money is a notch worse
  if ((c.cash || 0) < 0) i += 1;
  return RATINGS[Math.min(RATINGS.length - 1, i)];
}

/** What lenders get back of each obol owed when a company fails: its plant sold at 40% of its book value against its debt (never nothing, never all). */
export const recovery = (plantValue, debt) => Math.max(0.05, Math.min(0.9, (0.4 * (plantValue || 0)) / Math.max(1, debt || 0)));

/** A bond issue is a twentieth of what the company is worth, to the nearest hundred thousand (at least a hundred thousand). */
export const issueFace = (value) => Math.max(100000, Math.round((value * 0.05) / 100000) * 100000);
