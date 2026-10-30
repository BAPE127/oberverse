// Geopolitics (v0.75.0): how wars and embargoes touch the economy. Every figure is the change at full severity and full phase, before a company's own
// exposure; the indices that result are bounded (see `bounds`). Nothing here is a headline: each number is read by `src/corp/geo.js` and ends up in
// the wider world's costs, its customers' demand, or the price the market expects a company to earn.
export const GEO = {
  rampDays: 10, // an event reaches its full effect over this many days from the day it is first seen (never a day-one jump)
  recoverDays: 30, // after a ceasefire or a lifting, the effect fades out over this many days
  prolongedDays: 60, // a war this old has escalated: its severity counts 15% more
  milestones: [30, 60, 120], // days into a war when the timeline records that it goes on
  keepResolved: 40, // resolved events kept in the save (newest)
  bounds: { demand: [0.75, 1.3], cost: [1, 1.12], sentiment: 0.12 },
  sentimentWeight: 0.45, // of the expected change in a year's profit, how much the market prices ahead of the books
  expo: [0.5, 1.5], // a company's own exposure to a sector's effect (a hash of its id): not everyone in a sector is hit alike
  /** What a war does to a sector's customers' demand and its costs, at severity 1. (Arms demand already follows the war count in the arms market's own pool.) */
  war: {
    demand: { arms: 0, aerospace: 0.06, satellites: 0.1, energy: 0.06, shipping: 0.04, agriculture: -0.03, industrial: 0.04, finance: -0.02, transport: -0.03, communications: 0.02 },
    cost: { shipping: 0.08, agriculture: 0.04, industrial: 0.05, transport: 0.05, aerospace: 0.03, arms: 0.02, energy: 0.01, satellites: 0.01, communications: 0.01, finance: 0 },
    oil: { countries: ['teshvar'], demand: 0.2 }, // a war with an oil state in it moves energy prices (revenue) much more
    partyHit: 0.2, // a company from a country at war: its expected profit falls by this × severity × phase (before the market's weight)
  },
  /** What wars and embargoes add to Halvermouth's government bond yields: uncertainty and defence borrowing, at severity 1 (bounded). */
  bond: { war: 0.004, embargo: 0.0005, max: 0.01 },
  /** An arms embargo shuts a market: the lawful arms trade loses the target's share of the world's arms income (× this), at severity 1. */
  embargo: { armsShare: 0.8, partyHit: 0.4 }, // a company from the embargoed country loses this × severity × phase of its profit expectation
  /** How severe: the countries' combined income, over this, within these limits. */
  severity: { warIncome: 60000, embargoIncome: 50000, min: 0.25, max: 1, embargoMin: 0.2, embargoMax: 0.8 },
};

/**
 * Foreign government bonds (v0.77.0): the eight countries each issue a three-year bond. A country's *strain* comes from what it owes (a fixed
 * trait of the country), its wars, an embargo on it, and how far its treasury has fallen below what it started with; the rating follows the strain.
 * Nothing is random: a country goes into distress only if its strain stays at the top for weeks.
 */
export const SOVEREIGN = {
  years: 3, minFace: 1000, step: 100, maxShare: 0.05, spread: 0.015, reissueDays: 90, logKept: 40,
  issuePerIncome: 500, // an issue is this many days of the country's income, to the nearest million (at least a million)
  base: 0.15, debtWeight: 0.35, // strain: a floor of 0.15, plus up to this × the country's debt trait
  war: 0.25, warCap: 0.35, // plus this × the severity and phase of each war it is in (capped)
  embargo: 0.3, embargoCap: 0.3, // plus this × an embargo on it
  treasury: 0.3, // plus up to this for a treasury that has fallen below its starting level
  bands: [0.2, 0.3, 0.42, 0.55, 0.7], // strain below each is AA, A, BBB, BB, B; at or above the last, CCC
  distress: 0.85, // a strain at or above this counts a day towards distress
  delayAfter: 10, restructureAfter: 40, // days in a row: coupons are delayed, then the debt is restructured
  recovery: [0.35, 0.6], // lenders get back this share of the face when it is restructured (the worse the strain, the less)
};
