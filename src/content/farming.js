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
