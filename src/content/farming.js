// Farming (v0.30.0 "Sowing Season"): the land for sale at Lariat, the crops,
// and what the equipment does. The simulation is src/systems/farm.js; the
// tractors are vehicles (src/content/vehicles.js, dealer 'reddirt').
//
// Work on a plot is measured in field tiles: by hand you manage HAND_RATE
// tiles a game hour; a tractor of tier t manages its model's farm.rate.
// Growth runs on the world clock (06:00 each day). Prices are mid-game:
// a plot pays for itself in a month or so of steady farming.

/** The plots for sale: each is one of the Lariat map's `fields` (same id). */
export const FARM_PLOTS = {
  plot_east_1: { name: 'East Plot 1 (Mesquite Lane)', map: 'lariat', price: 6000, sign: { x: 80, y: 79 } },
  plot_east_2: { name: 'East Plot 2 (by Caddo Creek)', map: 'lariat', price: 6000, sign: { x: 110, y: 79 } },
  plot_east_3: { name: 'East Plot 3 (the south forty)', map: 'lariat', price: 11000, sign: { x: 80, y: 95 } },
};

/**
 * Crops. days: from planting to ready; yieldPer: tiles per unit harvested
 * (a bale, a wagon-load…); seedPer: field tiles one bag of seed plants;
 * price: what the Co-op pays per unit (before the day's price index).
 */
export const FARM_CROPS = {
  wheat: { name: 'Wheat', seed: 'item_seed_wheat', crop: 'item_crop_wheat', days: 4, yieldPer: 9, seedPer: 60, price: 30 },
  sorghum: { name: 'Sorghum', seed: 'item_seed_sorghum', crop: 'item_crop_sorghum', days: 5, yieldPer: 9, seedPer: 60, price: 36 },
  corn: { name: 'Corn', seed: 'item_seed_corn', crop: 'item_crop_corn', days: 6, yieldPer: 8, seedPer: 50, price: 40 },
  cotton: { name: 'Cotton', seed: 'item_seed_cotton', crop: 'item_crop_cotton', days: 8, yieldPer: 8, seedPer: 50, price: 58 },
};

export const FARM = {
  handRate: 24, // field tiles worked by hand per game hour (a 324-tile plot: half a day and more)
  tractorRange: 10, // tiles: your tractor must be parked this close to the plot's sign to work it
  fertilizer: { item: 'item_fertilizer', per: 80, bonus: 0.25 }, // a bag covers 80 tiles; +25% yield
  witherDays: 3, // days a ready crop waits before it starts to spoil (yield halves)
  priceDrift: 0.04, // ± daily wobble of the Co-op's price index (0.85–1.15)
};

/**
 * Livestock (v0.31.0): kept on a plot you've fenced as pasture, one kind per
 * plot. per: pasture tiles each head needs; feed: bags of feed a head eats a
 * day (from the plot's feeder); product: what each head gives a day (collected
 * at the plot's sign); value: what Hoof & Horn pays for a grown animal; cattle
 * put on value as they grow (grow: obols a day, up to maxDays).
 */
export const LIVESTOCK = {
  chickens: { name: 'Laying hens', one: 'hen', price: 12, per: 2, feed: 0.05, product: { item: 'item_eggs', perDay: 0.8 }, value: 8, prop: 'chicken' },
  goats: { name: 'Dairy goats', one: 'goat', price: 140, per: 8, feed: 0.25, product: { item: 'item_goat_milk', perDay: 1 }, value: 110, prop: 'goat' },
  cattle: { name: 'Beef calves', one: 'calf', price: 450, per: 20, feed: 0.6, value: 450, grow: 30, maxDays: 25, prop: 'cow' },
};

/** Market demand (v0.31.0): selling floods the buyer; each unit sold today lowers the next price, and demand recovers overnight. */
export const FARM_MARKET = {
  floor: 0.55, // prices never fall below this share of the day's price
  recover: 0.4, // share of today's sales the market forgets by the next morning
  demand: { // units a day before the price has fallen by half the way to the floor
    item_crop_wheat: 90, item_crop_sorghum: 80, item_crop_corn: 80, item_crop_cotton: 60,
    item_eggs: 240, item_goat_milk: 120, chickens: 120, goats: 16, cattle: 8,
  },
  products: { item_eggs: 3, item_goat_milk: 9 }, // base prices the Co-op pays for eggs and goat milk
};

export const PASTURE = { fencing: 400 }; // obols to fence a fallow plot as pasture (and back again is free)
