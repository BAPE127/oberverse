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
    name: 'Rook & Rifle Firearms', owner: null, restockAt: '09:00',
    stock: { item_revolver: 2, item_pistol: 2, item_shotgun: 1, item_rifle: 1, item_smg: 1, item_ammo_38: 10, item_ammo_9mm: 10, item_ammo_shells: 8, item_ammo_rifle: 6, item_knuckles: 2, item_bat: 2, item_machete: 1 },
    buys: { item_revolver: 45, item_pistol: 60, item_shotgun: 90, item_rifle: 110, item_smg: 160, item_bat: 10, item_machete: 18, item_knuckles: 8, item_fire_axe: 20, item_baton: 12 },
  },
  shop_hollow: {
    name: 'Hollow Fixings', owner: 'npc_tibbs',
    stock: { item_crowbar: 1, item_bolts: 3, item_fire_axe: 1 },
    buys: { item_brass_cog: 3, item_bolts: 1, item_rubber_stamp: 1, item_gull_feather: 1 },
  },
};
