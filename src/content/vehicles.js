// Vehicles (v0.16.0 "On the Road"): car models, the two dealerships, and the
// cars parked around the world. Owner's answers: drive cars yourself (E to get
// in and out; they stay where you park them); running people over hurts them
// and is a crime (imported characters are never harmed); cars can be stolen
// and the police look for stolen cars; NPC traffic and the bus follow in v0.17.
//
// Model stats: price (obols); top (px/s — walking is 128, sprinting ~200);
// accel (px/s²); grip (steering, rad/s at speed); len × wid (px, drawn and
// collided); body (drawing style); colors (choices at the dealer, first is
// the default).
export const CAR_MODELS = {
  // ---- Fender's Pre-Loved Motors (Westbrook Row): boring, basic, used ----
  pipit: {
    name: 'Halver Pipit', dealer: 'fender', price: 420, top: 250, accel: 190, grip: 2.7, len: 73, wid: 38, body: 'hatch', used: true,
    colors: ['#c8b98f', '#7f8f6a', '#a35a48'],
    blurb: 'A three-door hatchback with one previous owner and several previous engines. The heater is stuck on. So is the radio.',
    pitch: 'The Pipit! Sensible! Economical! Ninety-three thousand miles, and I personally guarantee at least twelve of them were gentle.',
  },
  dray: {
    name: 'Morrow Dray Estate', dealer: 'fender', price: 680, top: 270, accel: 175, grip: 2.4, len: 84, wid: 40, body: 'estate', used: true,
    colors: ['#6f7f94', '#8a6a4a', '#d9d4c6'],
    blurb: 'A long beige-adjacent estate car. Fits a family, a dog, or a surprising number of unexplained boxes. Smells faintly of wet labrador.',
    pitch: 'Room for the whole family! Or one very large dog. The last owner was a priest. Or a pirate. Something with a P.',
  },
  mule: {
    name: 'Ostley Mule Pickup', dealer: 'fender', price: 900, top: 265, accel: 185, grip: 2.3, len: 86, wid: 40, body: 'pickup', used: true,
    colors: ['#3f5f7a', '#9a3b2f', '#5a5a52'],
    blurb: 'A rusty workhorse with an open bed. Starts first time on Tuesdays. The tailgate is held on with optimism and a bungee cord.',
    pitch: 'A working truck for a working person! The rust is structural. That\'s a selling point. Ask anyone. Don\'t ask anyone.',
  },
  // ---- Beaumont Motor Gallery (Halvermouth, the East End): high end ----
  aurelia: {
    name: 'Beaumont Aurelia', dealer: 'beaumont', price: 6500, top: 400, accel: 330, grip: 3.2, len: 89, wid: 40, body: 'saloon',
    colors: ['#1d2a3f', '#e8e4da', '#6a1f2a', '#2f3a33'],
    blurb: 'An executive saloon: quilted leather, a clock in the dashboard that is correct, and a ride so soft the potholes apologise.',
    pitch: 'The Aurelia. Understated. One doesn\'t arrive in an Aurelia; one is simply, suddenly, already there.',
  },
  tempest: {
    name: 'Halcyon Tempest GT', dealer: 'beaumont', price: 11000, top: 450, accel: 410, grip: 3.4, len: 89, wid: 40, body: 'gt',
    colors: ['#2a4a6a', '#b8892f', '#3a3a40', '#8c2a1e'],
    blurb: 'A long-bonneted grand tourer for crossing a country before lunch. Twin exhausts, walnut trim, a boot that holds exactly one weekend.',
    pitch: 'The Tempest. For when the journey must be the point, and the destination is merely where one stops being admired.',
  },
  corsair: {
    name: 'Vantaggio Corsair', dealer: 'beaumont', price: 18500, top: 480, accel: 520, grip: 3.8, len: 81, wid: 39, body: 'coupe',
    colors: ['#c8261e', '#f2c230', '#f4f4f0', '#1a1a1e'],
    blurb: 'A low, loud two-seat coupé that sounds like an argument. Go-faster stripes as standard; going faster is optional, but not really.',
    pitch: 'The Corsair. I would not normally sell one to a first-time client. But you have, how shall I put it, an appetite.',
  },
  cruiser: {
    name: 'Halvermouth Police Cruiser', dealer: null, price: 4000, top: 430, accel: 380, grip: 3.3, len: 86, wid: 40, body: 'police',
    colors: ['#e8e2d4', '#1e2a3a'],
    blurb: 'A police cruiser with a light bar, a radio full of static, and a cup holder with a doughnut-shaped stain.',
    pitch: '',
  },
  regent: {
    name: 'Sterling Regent Limousine', dealer: 'beaumont', price: 26000, top: 360, accel: 250, grip: 2.4, len: 119, wid: 43, body: 'limo',
    colors: ['#141418', '#e9e6df', '#2a2430'],
    blurb: 'A stretched limousine with a privacy screen, a drinks cabinet, and a horn that plays the first four notes of something stately.',
    pitch: 'The Regent. Sir Moneybucks owns two. He bought the second so the first would have company.',
  },
};

/** The dealerships. Display cars sit at `display` (tile x, y, angle in degrees; 0 = east, 90 = south). */
export const DEALERS = {
  fender: {
    name: 'Fender\'s Pre-Loved Motors', npc: 'npc_marty', map: 'westbrook', delivery: { x: 21, y: 17, angle: -90 },
    lot: { x: 17, y: 15, w: 19, h: 6 },
    models: ['pipit', 'dray', 'mule'],
    display: [{ model: 'pipit', x: 24, y: 17, angle: -90 }, { model: 'dray', x: 28, y: 17, angle: -90 }, { model: 'mule', x: 32, y: 17, angle: -90 }],
    tradeIn: 0.4, buysStolen: 0.3, plates: 150,
  },
  beaumont: {
    name: 'Beaumont Motor Gallery', npc: 'npc_julian', map: 'halvermouth', delivery: { x: 93, y: 22, angle: 0 },
    lot: { x: 88, y: 21, w: 14, h: 3 },
    models: ['aurelia', 'tempest', 'corsair', 'regent'],
    display: [{ model: 'corsair', x: 99, y: 22, angle: 0 }],
    tradeIn: 0.55, buysStolen: 0, plates: 0,
  },
};

/**
 * Cars parked around the world at the start. Owned by an NPC (stealing one is
 * a crime they take personally) or by nobody in particular.
 */
export const PARKED_CARS = [
  { id: 'car_moneybucks', model: 'regent', color: '#141418', map: 'ober_fields', x: 28, y: 11, angle: 0, owner: 'npc_moneybucks' },
  { id: 'car_mason', model: 'mule', color: '#d9a23a', map: 'westbrook', x: 36, y: 10, angle: 0, owner: 'npc_mason' },
  { id: 'car_lucas', model: 'tempest', color: '#5a3a24', map: 'halvermouth', x: 70, y: 50, angle: 0, owner: 'npc_lucas' },
  { id: 'car_osric', model: 'pipit', color: '#5a6a7a', map: 'lanternside', x: 27, y: 10, angle: 0, owner: 'npc_osric' },
];

/**
 * The parked cars that maps place as 'car' props (Halvermouth's avenues, the
 * Harbourline car park, the police cruisers, the Grand Hotel's limousines)
 * become real cars — every parked car can be driven off, at a price. Wrecks
 * and the Yards' forklift and flatbed stay scenery. Mutates `maps`.
 */
export function carPropsToVehicles(maps) {
  const out = [];
  const pick = ['pipit', 'dray', 'aurelia', 'mule', 'tempest', 'pipit', 'dray'];
  for (const map of Object.values(maps)) {
    if (map.id === 'yards') continue;
    const keep = [];
    for (const p of map.props || []) {
      if (p.type !== 'car' || p.wrecked) { keep.push(p); continue; }
      const w = p.w ?? 2;
      const h = p.h ?? 1;
      const vertical = h > w;
      const model = p.police ? 'cruiser' : /limousine/i.test(p.examine || '') ? 'regent' : pick[out.length % pick.length];
      out.push({ id: `car_${p.id}`, model, color: p.color || CAR_MODELS[model].colors[0], map: map.id, x: p.x + w / 2 - 0.5, y: p.y + h / 2 - 0.5, angle: vertical ? 90 : 0, owner: p.police ? 'police' : null });
    }
    map.props = keep;
  }
  return out;
}

/** Driving tuning shared by every car. */
export const DRIVING = {
  reverseShare: 0.35, // top speed in reverse, as a share of top
  brake: 520, // px/s² when braking against the direction of travel
  drag: 70, // px/s² rolling resistance (plus a share of speed)
  offRoad: 0.6, // top speed on grass, sand, mud, dirt
  hitSpeed: 70, // px/s: slower than this, people are just nudged
  lethalSpeed: 330, // px/s: faster than this and a hit can kill
  hitDamage: 0.26, // damage per px/s of speed
};
