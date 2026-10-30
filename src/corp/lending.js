// Lending (v0.73.0). Pure functions — no game state, no DOM, no RNG.
//
//   advance(item)                 how much of a holding's value the bank will lend against
//   secured(items)                what a set of holdings secures in all
//   standingRate(s)               how a borrowing record moves the rate; limitFactor(s) how it moves the limit
//   quote(...)                    the rate, the first instalment and the interest over the life of a loan
//   dueMonth(loan)                one month's accounts: the instalment, and what is owed after
//
// A loan is repaid in equal principal parts with the month's interest on what is left. The rate is fixed when it is signed. A missed
// instalment becomes arrears that grow at a penalty rate; nothing is ever taken — the pressure is the penalty, a record that makes
// the next loan dearer and smaller, and holdings pledged against a loan that cannot be sold while it is owed.
// Nothing here knows about anything but borrowing: a loan's terms depend on what is held and how past loans were repaid, never on
// anything done to the borrower by anyone else.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const TERMS = [6, 12, 24, 36]; // months of thirty days
export const MIN_LOAN = 1000;
export const BASE_SPREAD = 0.025;
export const PENALTY = 0.05;
export const START_STANDING = 60;

const CORP = { AA: 0.7, A: 0.7, BBB: 0.6, BB: 0.4, B: 0.4, CCC: 0.2 };

/** item: { kind: 'share' | 'govBond' | 'corpBond', value, rating? } */
export function advance(item) {
  if (item.kind === 'govBond') return 0.9;
  if (item.kind === 'corpBond') return CORP[item.rating] ?? 0;
  return 0.5;
}

export const secured = (items) => items.reduce((a, i) => a + Math.max(0, i.value) * advance(i), 0);

/** Standing is 0–100 (60 at the start): on-time payments raise it, missed ones lower it. */
export const standingRate = (s) => clamp((0.01 * (START_STANDING - s)) / 40, -0.005, 0.02);
export const limitFactor = (s) => clamp(1 + (s - START_STANDING) / 200, 0.8, 1.2);

/** The rate a loan would be signed at: the policy rate, a base spread, more the more of the limit it uses, and the borrower's record; to the quarter-point. */
export function rateFor({ policy, util, standing }) {
  return Math.round((policy + BASE_SPREAD + 0.02 * clamp(util, 0, 1) + standingRate(standing)) / 0.0025) * 0.0025;
}

/** What a loan of `amount` over `months` at `rate` costs: the first instalment and the interest paid by the end. */
export function quote(amount, months, rate) {
  const part = amount / months;
  let owed = amount; let interest = 0;
  for (let i = 0; i < months; i++) { interest += (owed * rate) / 12; owed -= part; }
  return { part: Math.ceil(part), first: Math.round(part + (amount * rate) / 12), interest: Math.round(interest), total: Math.round(amount + interest) };
}

/** What falls due on a loan's day. loan: { outstanding, rate, left (instalments still to come, this one included), arrears }. */
export function dueMonth(loan) {
  const interest = Math.round((loan.outstanding * loan.rate) / 12);
  const principal = loan.left <= 1 ? loan.outstanding : Math.min(loan.outstanding, Math.ceil(loan.outstanding / loan.left));
  return { interest, principal, instalment: interest + principal, penalty: Math.round((loan.arrears * (loan.rate + PENALTY)) / 12) };
}

// ------------------------------------------------------------------ business loans (v0.74.0)
// A company is lent to on its own books alone: what it owns less what it owes, and what it has earned. A guarantee is a promise the
// borrower's owner (or a parent, for a subsidiary) makes in exchange for a lower rate; what it costs the guarantor is stated before signing.

export const CO_SPREAD = 0.03;
export const GUARANTEE_DISCOUNT = { none: 0, personal: 0.01, parent: 0.0075 };
export const CO_FACTOR = 0.4; // of what a company owns, net of other debt
export const CO_PROFIT_MONTHS = 6; // of its monthly profit
export const PERSONAL_GUARANTEE_HIT = 4; // record points the owner loses when a company they guaranteed misses an instalment
export const PURPOSES = ['Working capital', 'Material procurement', 'Factory or facility expansion', 'Ships and fleet', 'Farm land and equipment', 'Research and development', 'Acquisition or restructuring'];

/** What a company may owe the bank in all: a share of its assets (before this debt) and some months of its profit, scaled by its record. */
export function companyLimit({ assets, monthlyNet, standing }) {
  return Math.max(0, Math.round((CO_FACTOR * Math.max(0, assets) + CO_PROFIT_MONTHS * Math.max(0, monthlyNet)) * limitFactor(standing)));
}

export function companyRate({ policy, util, standing, guarantee = 'none' }) {
  return Math.max(0.0025, Math.round((policy + CO_SPREAD + 0.02 * clamp(util, 0, 1) + standingRate(standing) - (GUARANTEE_DISCOUNT[guarantee] || 0)) / 0.0025) * 0.0025);
}
