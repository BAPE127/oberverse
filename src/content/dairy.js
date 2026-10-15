// Chuckie's Cheese (v0.29.0): the dairy, the cheese plant, the company on the
// exchange, and the five lead cows. Every tunable number lives here; the
// simulation is src/systems/dairy.js. Prices are in obols, quantities per day.
//
// The lead cows are the herd's bosses: the other two hundred and forty follow
// them to the parlour, to the feed, to bed. Without them the girls mill about,
// let down less milk and the parlour runs half empty — so each missing lead cow
// costs the dairy LEAD_PENALTY of its capacity until she's home.
export const DAIRY = {
  company: 'Chuckie\'s Cheese Co.',
  ticker: 'CHZ',
  shares: 150000, // outstanding, fixed (no new issues)
  herd: 240, // ordinary milking cows (they don't talk)
  litresPerCow: 28, // per day, at full capacity
  litresPerKg: 10, // milk → cheese
  leadPenalty: 0.09, // capacity lost per missing lead cow (all five out: −45%)
  cheesePrice: 14, // per kg, wholesale, before the milk-price index
  fixedCosts: 4200, // per day: wages, feed contracts, power, the bank
  costPerLitre: 0.25, // per litre milked: feed, vet, cleaning
  payout: 0.5, // share of a day's profit paid as dividends
  bookPerShare: 40, // what the land, herd and plant are worth per share
  pe: 12, // what the market pays for a year's earnings
  recoveryWeight: 0.9, // how much the market already prices in the herd coming home (no free lunch for knowing the quest)
  priceAdjust: 0.15, // the share price moves this share of the way to fair value each day
  noise: 0.03, // ± daily wobble in the price (market mood)
  indexDrift: 0.03, // ± daily change in the milk-price index (bounded 0.8–1.2)
  startPrice: 132, // ≈ fair value with all five lead cows out
  fee: 0.01, // broker's commission on every trade, each way
  maxPlayerShares: 1500, // 1% of the company: Chuckie keeps control, and no corner on CHZ
};

/** The five lead cows: their hideouts and their places in the paddock (spots on the lariat map). */
export const LEAD_COWS = {
  cow_bessie: { name: 'Bessie Mae', hide: 'hide_bessie', pen: 'pen_bessie', where: 'out behind the Mesquite Diner, eyeing the pie window' },
  cow_clementine: { name: 'Dr. Clementine', hide: 'hide_clementine', pen: 'pen_clementine', where: 'up by the old windmill, thinking' },
  cow_duchess: { name: 'Duchess', hide: 'hide_duchess', pen: 'pen_duchess', where: 'on a sandbar in Caddo Creek, keeping watch' },
  cow_patsy: { name: 'Patsy', hide: 'hide_patsy', pen: 'pen_patsy', where: 'by the Co-op elevator, for the acoustics' },
  cow_daisy: { name: 'Little Daisy', hide: 'hide_daisy', pen: 'pen_daisy', where: 'way out in the east fields, having an adventure' },
};

/** The lasso: sold at Lariat Mercantile (always one in stock), needed to rope a lead cow. */
export const LASSO = 'item_lasso';

/** What you get for bringing the whole herd home (once). */
export const HERD_REWARD = { money: 2500, cheese: 2 };
