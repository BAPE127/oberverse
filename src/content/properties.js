// Property groundwork (v0.4.0). PLOTS are surveyed pieces of land the player
// can pay Mason's Os to build on; BLUEPRINTS are what can be built. There are
// deliberately NO plots yet — the player (project owner) will say where and
// when to create them. See docs/PROPERTIES.md for how to add one.
//
// Plot shape:
//   plot_example: {
//     name: 'Lot 1, Westbrook', map: 'westbrook', x: 6, y: 28, w: 6, h: 5,   // footprint in tiles
//     door: { x: 8, y: 32 },                    // on the footprint's bottom row
//     outside: { x: 8, y: 33, facing: 'up' },   // walkable tile below the door
//     landPrice: 40,                            // paid once, with the first contract
//     allowed: ['home', 'rental', 'business'],
//   }

export const PLOTS = {};

export const BLUEPRINTS = {
  home: {
    name: 'Cottage (personal home)', cost: 120, days: 3,
    text: 'A snug cottage with a bed you can sleep in and a storage chest that is yours alone.',
    roof: '#9a4a3a', wall: '#efe2c8', trim: '#5a3a2a',
  },
  rental: {
    name: 'Rental flats', cost: 200, days: 4, rent: 8,
    text: 'Two small flats. Tenants pay rent every evening at six. (Tenants are named but not simulated yet.)',
    roof: '#4a6a8a', wall: '#e8dccb', trim: '#2a3a4a',
  },
  business: {
    name: 'Shopfront', cost: 250, days: 5, income: 10,
    text: 'A shopfront with a counter and a back room. Pays a modest daily income for now; real businesses come later.',
    roof: '#3a7a5a', wall: '#f0e8d8', trim: '#2a4a3a',
  },
};
