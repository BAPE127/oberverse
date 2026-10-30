// Foreign government bonds (v0.77.0). Pure functions — no game state, no DOM, no RNG.
//
//   debtTrait(id, income, hash)    how heavily a country is in debt: a fixed trait
//   strainOf(...)                  how strained its finances are today, from the trait, its wars, an embargo and its treasury
//   ratingOf(strain, S)            the rating that strain means
//   distressStep(days, strain, S)  the days-in-distress counter and what state it puts the debt in: normal, delayed, restructure
//   recoveryOf(strain, S)          what lenders get back of the face when it is restructured
//   issueFace(income, S)           how big a country's issue is
//
// No country is given a chance of defaulting. Its rating moves with its strain, its bond's price moves with the rating, delayed payments
// begin only after ten days of the worst strain in a row and a restructuring only after forty.
import { RATINGS } from './credit.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 0..0.8: a fixed trait of the country — some hash of its name, less for a rich one. hash: a number 0..1 from the country's id. */
export const debtTrait = (hash, income, richest = 48000) => clamp(0.2 + 0.5 * hash - 0.3 * (income / richest), 0, 0.8);

/** war, embargo: the sum of severity × phase of the events the country is in. treasury: its budget over the budget it started with. */
export function strainOf({ trait, war, embargo, treasury }, S) {
  const t = S.base + S.debtWeight * trait + Math.min(S.warCap, S.war * war) + Math.min(S.embargoCap, S.embargo * embargo) + S.treasury * clamp(1 - treasury, 0, 1);
  return Math.round(t * 1000) / 1000;
}

export const ratingOf = (strain, S) => RATINGS[S.bands.findIndex((b) => strain < b) === -1 ? RATINGS.length - 1 : S.bands.findIndex((b) => strain < b)];

/** One day: strain at the distress line counts a day; below it, the count falls by two. */
export function distressStep(days, strain, S) {
  const d = strain >= S.distress ? days + 1 : Math.max(0, days - 2);
  return { days: d, state: d >= S.restructureAfter ? 'restructure' : d >= S.delayAfter ? 'delayed' : 'normal' };
}

export const recoveryOf = (strain, S) => Math.round(clamp(S.recovery[1] - (strain - S.distress) * 1.5, S.recovery[0], S.recovery[1]) * 100) / 100;

export const issueFace = (income, S) => Math.max(1000000, Math.round((income * S.issuePerIncome) / 1000000) * 1000000);
