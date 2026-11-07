// What the game pays (v0.82.0). One place for the figures that decide how fast a new player gets from 12 obols to a
// first business, and how much the first businesses earn. Change a number here and the game, the journal texts and the
// tests that read them follow. Nothing in the game creates money from nothing: these are the prices of work and sales.
//
// The target the owner set: a first arms works by day 3 (a 500 licence, a 2,500 works, parts), a second company by day 15.
// Before this, the early shifts paid 5–8 obols and the first quests 12–20: reaching 3,000 took months. Shifts now pay
// about 50 times what they did; the one-off quests pay what they are worth to someone with nothing.
export const INCOME = {
  /** Wages for the early shifts, in obols a shift. (Were 6, 6 and 5 per wage level + 2 per corner worked.) */
  shift: { construction: 330, coffee: 330, refineryPerLevel: 275, refineryPerCorner: 110 }, // (v0.91.0: +10%)
  /** One-off rewards of the first quests. (Were 12 and 20.) The Lost Herd (2,500) is unchanged, and so is Tibbs's 8 obols for his spanner ("it's all I've got"). */
  quest: { darkLamp: 660, sealOfM: 1100 }, // (v0.91.0: +10%)
  /** What the first businesses pay, as a multiplier on what they paid before. */
  business: {
    wholesaleShare: 0.715, // Lucas buys your arms at this share of an item's value (was 0.5; 0.65 before v0.91.0)
    crops: 5.1, // the Co-op's price for crops (the index still moves it day to day) (1.5 before v0.91.0, 1.65 until v0.91.3)
    contracts: 140, // what shipping clients pay for a delivery (1.5 before v0.91.0, 1.65 until v0.91.0, 6.6 until v0.91.3; v0.91.4: sized so one ship earns ~500,000 in 5 days, see tools/econ-audit.mjs)
  },
  /** v0.91.0: what a business pays to run — wages, parts and materials, upkeep, port and freight charges, repairs — as a multiplier (it was 1). Buying a business or its big assets is not in it. */
  cost: 0.5,
  /** v0.91.0: more for what a business sells that has no figure above (arms export orders, aerospace deliveries and services). The figures above already carry the same +10%. */
  revenue: 1.1,
  /** v0.91.0, widened in v0.92.0: owning the shipping company is enough for everything you buy to arrive free: no freight, no handling, no duty, and no ship needed. You pay for the goods only. */
  /** v0.91.1: on top of `revenue`, what the aerospace firm's own sales (contracts, planes built for stock) are multiplied by, so a bay with a standing plane out-earns a small arms line. */
  aerospace: 27,
  /** v0.91.4: on top of `revenue`, what the arms export market pays for your crates (the figures a country pays are already in obols of that size; this scales them to what a works makes in a day). */
  arms: 7.4,
  /** v0.91.4: how much of each country's daily budget growth the arms market keeps (1 = all of it). It caps what a works can sell in a day: the eight countries' growth is 182,000 a day at 1. */
  armsDemand: 0.45,
  /** v0.91.4: freight rates fall as you flood the lanes: a contract pays 1 ÷ (1 + n ÷ this) of its price, n = contracts you sent a ship on in the last 10 days. 0 switches it off. */
  freightSaturation: 4,
  ownShippingFree: true,
  /**
   * v0.103.5: what the mercenary company earns. The owner's rule: with the bare minimum built (site office, bunkhouse, range, cage: twelve beds, so twelve soldiers) the company earns at least
   * 2,000,000 obols in 5 days while those soldiers serve; with every facility built (112 beds, a full motor pool, four tanks, two helicopters, two guns, two carriers) about 20,000,000 in 5 days.
   * So a soldier in the field is worth one figure whichever way they are sent: the employer's retainer in a theatre, or an engagement's pay per troop-day. Vehicles are worth `vehicleScale` times
   * what they were. Soldiers who stay at the base earn nothing. Costs (wages, supplies, fuel, upkeep) are unchanged. tests/war_income.test.mjs holds the rule; tools/econ-audit-war.mjs prints it.
   */
  war: {
    soldierDay: 33_500,      // the retainer for each soldier in a theatre, a day (was 170)
    engageTroopDay: 34_000,  // an engagement pays this for each troop it asks for, each day (was 340)
    vehicleScale: 21,        // vehicles in the retainer and in engagement pay are worth this many times what they were
    vpBonus: 500_000,        // the employer's bonus for each victory point of ground taken (was 25,000)
    guardDay: { low: 30_000, medium: 38_000, high: 55_000 }, // a security contract pays this for each guard, each day (was 400, 550, 800)
    target: { days: 5, bare: 2_000_000, full: 20_000_000 },
  },
};
