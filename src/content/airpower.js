// Air power on the strategic map (v0.103.9): pure data, all starting figures to calibrate (docs/PROPOSAL_WAR_STRATEGIC.md section 5). The rules that read them are in src/war/airpower.js.
//
//   range / weight   by the aircraft's look (src/content/aerospace.js): how far a wing's shortest-legged aircraft reaches from its airfield (km), and its weight in close air support
//   cas / strike     the share of the enemy force a wing removes from the next fight at the target, per weight point (to a cap), and what a missile strike removes
//   interdict        the share of a province's garrison cut while its roads are being bombed, and for how many days
//   recon / loss     how long a recon pass keeps a province seen, and the chance per aircraft that a mission loses it (permanently): a base, plus the fort's anti-air, times a factor for the mission
//   lift             a helicopter lift: range and speed (km, km/h) and the organisation it costs
//   satellites       the intel level an owned, working satellite gives over the whole theatre (1 spotted, 2 known), by product
import { RETAINER } from './strategic.js';
export const AIR = {
  range: { trainer: 500, fighter: 900, twinfighter: 1100, stealthfighter: 1200, futurefighter: 1400, tacbomber: 1600, stratbomber: 4000, flyingwing: 3500, futurebomber: 5000 },
  weight: { trainer: 0.5, fighter: 1, twinfighter: 1.2, stealthfighter: 1.4, futurefighter: 1.8, tacbomber: 2, stratbomber: 3, flyingwing: 2.6, futurebomber: 3.6 },
  cas: { cut: 0.07, max: 0.4 }, strike: { cut: 0.35 },
  interdict: { cut: 0.15, days: 3 },
  recon: { hours: 24, known: 1, spotted: 2 },
  loss: { base: 0.03, perFort: 0.025, cas: 1.5, strike: 1.2, interdict: 1, recon: 0.6 },
  lift: { range: 400, speed: 200, orgCost: 4 },
  satellites: { st_cartographer: 1, st_watchtower: 2 },
  perAircraft: RETAINER.perVehicle.helicopter,
  missions: { recon: 'Reconnaissance', cas: 'Close air support', interdict: 'Interdiction', strike: 'Missile strike' },
};
