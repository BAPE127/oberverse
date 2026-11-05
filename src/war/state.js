// The one saved record of the war update (v0.98.0): `world.military`. Made lazily (an old save simply gains it); read through here, never built elsewhere.
//
//   ensureMilitary(game)   the record, with its defaults
//   peekMilitary(game)     the record or null (a read that must not create it)
// Protection and damage are written only by src/war/protection.js and src/war/damage.js.
export function freshMilitary() {
  return {
    v: 1,
    coup: { state: 'none', since: null, outcome: null },        // the ONE flag base protection reads
    protection: { baseProtected: true, reason: 'no coup', since: 0 }, // derived from coup.state by src/war/protection.js
    gov: { id: 'sund', units: [], inventory: {}, bases: ['fort_gullcrest'], readiness: 0.7, orders: [] }, // the national military, separate from the company
    company: null,                                               // the player's company (v0.98.0 stage 3): identity, facilities, personnel, squads, equipment
    transfers: [],                                               // an audit trail, never money
    war: { theatres: {}, provinces: {}, battles: [], orders: [], reports: [] },
    damage: { structures: {}, log: [] },                         // written only by src/war/damage.js
    log: [],
  };
}

export const peekMilitary = (game) => game.world?.military || null;

export function ensureMilitary(game) {
  if (!game.world.military) game.world.military = freshMilitary();
  return game.world.military;
}
