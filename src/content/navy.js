// Sea power and international contracts on the strategic map (v0.103.10): pure data, all starting figures to calibrate. The rules that read them are in src/war/navy.js and src/war/intl.js.
//
//   NAVY.reach        how far from its base a fleet's guns and blockade reach (km); the atlas has no sea zones, so a fleet works the waters off the coastal provinces of its theatre
//   NAVY.meet         how far a fleet may be from a battalion and still take it aboard (km)
//   NAVY.knot         km an hour for one knot of the catalogue's speed
//   NAVY.bombard      the share of the enemy force a bombardment removes from the next fight at a coastal province, per point of firepower (attack / 50), to a cap
//   NAVY.blockade     the share of a coastal garrison cut while its port is shut, and for how many days
//   NAVY.landing      a landing: farthest voyage, quickest, the places a soldier and a vehicle take in the holds, the extra strength the enemy has on a contested beach (before escorts), the share
//                     of that the escorts can take off, the escort strength that takes all of it, and the organisation it costs
//   NAVY.loss         the chance per ship that a bombardment or a landing loses it for good: a base, plus the coast's fort, times a factor; escorts lower the landing's
//   NAVY.wear         the condition a ship loses on a mission (the shipping company's own scale, 0 to 100)
//   NAVY.pay          a fleet's daily pay in a theatre, per ship, at the same vehicle scale as the ground vehicles
//   INTL              international contracts: how warm a country must be, how often the offers change, how many, the three kinds with their term and size rules, and the rate by relation
import { RETAINER } from './strategic.js';

export const NAVY = {
  reach: 900, meet: 400, knot: 1.85,
  bombard: { cut: 0.05, max: 0.35 },
  blockade: { cut: 0.12, days: 4 },
  landing: { range: 1500, minHours: 6, perSoldier: 1, perVehicle: 5, penalty: 0.6, escortShare: 0.7, escortFull: 3, orgCost: 12 },
  loss: { base: 0.02, perFort: 0.02, bombard: 1.3, landing: 1, blockade: 0.6, escortCut: 0.5 },
  wear: { bombard: 3, blockade: 2, landing: 4 },
  pay: { warship: RETAINER.perVehicle.tank, transport: RETAINER.perVehicle.carrier },
  missions: { bombard: 'Bombardment', blockade: 'Blockade' },
};

export const INTL = {
  minScore: 10, refreshDays: 3, max: 5, offerDays: 6,
  rate: [1.0, 1.4],
  rep: { done: 2, failed: 3 },
  kinds: {
    take: { name: 'Take a province', text: 'Take the named enemy province by the end of the term.', days: [10, 6], people: 10, hulls: { tank: 1, from: 2 } },
    hold: { name: 'Hold a province', text: 'Keep the named province in the client\'s hands to the end of the term, with a battalion of yours on it.', days: [8, 4], people: 8, hulls: { tank: 1, from: 3 } },
    blockade: { name: 'Blockade a port', text: 'Keep the named coast under blockade for the term (a bombardment or blockade mission flown by a fleet of yours there).', days: [8, 3], ships: 1 },
  },
};
