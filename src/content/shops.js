// Shops. Prices come from items.js, modified by the owner's disposition toward
// the player (see game.priceFor). Stock is persistent and restocked by the
// owner's schedule (onArrive: restock).
export const SHOPS = {
  shop_kettle: {
    name: 'The Kettle & Crumb', owner: 'npc_mags',
    stock: { item_honey_bun: 5, item_scone: 4, item_coffee: 8 },
    buys: {},
  },
  shop_hollow: {
    name: 'Hollow Fixings', owner: 'npc_tibbs',
    stock: { item_crowbar: 1, item_bolts: 3 },
    buys: { item_brass_cog: 3, item_bolts: 1, item_rubber_stamp: 1, item_gull_feather: 1 },
  },
};
