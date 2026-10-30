// What the game pays (v0.82.0). One place for the figures that decide how fast a new player gets from 12 obols to a
// first business, and how much the first businesses earn. Change a number here and the game, the journal texts and the
// tests that read them follow. Nothing in the game creates money from nothing: these are the prices of work and sales.
//
// The target the owner set: a first arms works by day 3 (a 500 licence, a 2,500 works, parts), a second company by day 15.
// Before this, the early shifts paid 5–8 obols and the first quests 12–20: reaching 3,000 took months. Shifts now pay
// about 50 times what they did; the one-off quests pay what they are worth to someone with nothing.
export const INCOME = {
  /** Wages for the early shifts, in obols a shift. (Were 6, 6 and 5 per wage level + 2 per corner worked.) */
  shift: { construction: 300, coffee: 300, refineryPerLevel: 250, refineryPerCorner: 100 },
  /** One-off rewards of the first quests. (Were 12 and 20.) The Lost Herd (2,500) is unchanged, and so is Tibbs's 8 obols for his spanner ("it's all I've got"). */
  quest: { darkLamp: 600, sealOfM: 1000 },
  /** What the first businesses pay, as a multiplier on what they paid before. */
  business: {
    wholesaleShare: 0.65, // Lucas buys your arms at this share of an item's value (was 0.5)
    crops: 1.5, // the Co-op's price for crops (the index still moves it day to day)
    contracts: 1.5, // what shipping clients pay for a delivery
  },
};
