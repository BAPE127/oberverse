// Shops. Prices come from items.js, modified by the owner's disposition toward
// the player (see game.priceFor). Stock is persistent and restocked by the
// owner's schedule (onArrive: restock).
export const SHOPS = {
  shop_kettle: {
    name: 'The Kettle & Crumb', owner: 'npc_mags',
    stock: { item_honey_bun: 5, item_scone: 4, item_coffee: 8 },
    buys: {},
  },
  shop_company: {
    name: 'Ober\'s Oil Company Store', owner: 'npc_gideon',
    stock: { item_coffee: 6, item_bandage: 3, item_cigar: 2 },
    prices: { item_coffee: 4, item_bandage: 7 },
    buys: { item_brass_cog: 2, item_bolts: 1 },
  },
  shop_rook: {
    // Pipecreek Armory (v0.13.0). Lucas also buys arms-works output wholesale (armsBuyer; see src/systems/arms.js).
    name: 'Pipecreek Armory', owner: 'npc_lucas', armsBuyer: true, restockAt: '09:00',
    stock: { item_revolver: 2, item_pistol: 2, item_shotgun: 1, item_rifle: 1, item_smg: 1, item_ammo_38: 10, item_ammo_9mm: 10, item_ammo_shells: 8, item_ammo_rifle: 6, item_knuckles: 2, item_bat: 2, item_machete: 1 },
    buys: { item_revolver: 45, item_pistol: 60, item_shotgun: 90, item_rifle: 110, item_smg: 160, item_bat: 10, item_machete: 18, item_knuckles: 8, item_fire_axe: 20, item_baton: 12 },
  },
  shop_sums: {
    name: 'The Abacus counter (Sums of Anarchy)', owner: 'npc_minnie', restockAt: '11:00',
    stock: { item_calc_charm: 6, item_calc_wits: 6, item_calc_grit: 6, item_calc_finesse: 6, item_calc_health: 6, item_calc_energy: 8 },
    buys: {},
  },
  shop_surplus: {
    name: 'Sal\'s Surplus — parts', owner: 'npc_sal', restockAt: '08:00',
    stock: { item_part_casing: 40, item_part_keypad: 40, item_part_screen: 40, item_part_board: 40, item_part_battery: 60, item_lockpick: 3 }, // v0.36.0: lockpicks, no questions asked
    buys: { item_calc_charm: 7, item_calc_wits: 7, item_calc_grit: 7, item_calc_finesse: 7, item_calc_health: 7, item_calc_energy: 7, item_calc_blank: 3 },
  },
  shop_machines: {
    name: 'Sal\'s Surplus — machinery', owner: 'npc_sal', restockAt: '08:00',
    stock: { item_machine_solderer: 3, item_machine_press: 3, item_machine_assembler: 3, item_machine_tuner: 6, item_generator: 3, item_belt: 200, item_inserter: 30 },
    buys: { item_machine_solderer: 60, item_machine_press: 75, item_machine_assembler: 110, item_machine_tuner: 90, item_generator: 125, item_belt: 1, item_inserter: 7 },
  },
  shop_hollow: {
    name: 'Hollow Fixings', owner: 'npc_tibbs',
    stock: { item_crowbar: 1, item_bolts: 3, item_fire_axe: 1 },
    buys: { item_brass_cog: 3, item_bolts: 1, item_rubber_stamp: 1, item_gull_feather: 1 },
  },
  // Lariat (v0.29.0). The Mercantile always keeps a lasso on the peg (see minStock and DairySystem).
  shop_mercantile: {
    name: 'Lariat Mercantile', owner: 'npc_opal', restockAt: '07:00',
    stock: { item_lasso: 2, item_jerky: 8, item_sweet_tea: 8, item_cowboy_hat: 2, item_bandage: 3 },
    minStock: { item_lasso: 1 },
    buys: { item_cheese_wheel: 35 },
  },
  shop_diner: {
    name: 'Mesquite Diner', owner: 'npc_lupe', restockAt: '06:00',
    stock: { item_pecan_pie: 6, item_chicken_fried_steak: 5, item_sweet_tea: 10, item_coffee: 10 },
    buys: {},
  },
  // Farming (v0.30.0)
  shop_feedseed: {
    name: 'Lone Star Feed & Seed', owner: 'npc_lorna', restockAt: '07:00',
    stock: { item_seed_wheat: 20, item_seed_sorghum: 20, item_seed_corn: 20, item_seed_cotton: 16, item_fertilizer: 24, item_feed: 60 },
    buys: {},
  },
};
