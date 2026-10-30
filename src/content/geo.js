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
  /** An arms embargo shuts a market: the lawful arms trade loses the target's share of the world's arms income (× this), at severity 1. */
  embargo: { armsShare: 0.8, partyHit: 0.4 }, // a company from the embargoed country loses this × severity × phase of its profit expectation
  /** How severe: the countries' combined income, over this, within these limits. */
  severity: { warIncome: 60000, embargoIncome: 50000, min: 0.25, max: 1, embargoMin: 0.2, embargoMax: 0.8 },
};
