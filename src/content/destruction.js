// Destruction in the open world (v0.106.0, owner's decision of 2026-11-15): explosions, heavy weapons and vehicle rams blow holes in the walls
// of ordinary buildings. A hole is a way in and out, rubble lies outside it, it stays after a reload, and Mason's Os bricks it up for a fee.
// A building never collapses. Never damaged: buildings where an imported character lives or works (worked out from the characters, not
// listed here), government buildings while no coup has been staged, and the core of your company's base while it is protected (the one
// flag, src/war/protection.js). Every hole goes through the damage gate (src/war/damage.js), the only writer of a structure's state.

/** Street maps whose every building belongs to the state. */
export const GOVERNMENT_STREETS = ['crown_quarter', 'fort_gullcrest', 'ironcrest_grounds', 'willowmere_grounds'];
/** Government buildings standing on ordinary streets. */
export const GOVERNMENT_BUILDINGS = ['b_hall_of_justice', 'b_police'];

export const BREACH = {
  /** A blast reaches walls within this share of its radius. */
  reach: 0.85,
  /** At most this many wall tiles open per blast (a hole one or two tiles wide). */
  perBlast: 2,
  /** The least blast (a heavy-weapons blast's damage) that opens a wall; a grenade-sized one only scorches it. */
  minDamage: 60,
  /** A wall tile's share of its building's structure points (the gate keeps the building's state: intact, damaged; never destroyed). */
  hpPerTile: 6,
  /** Hit points of a building in the gate. */
  hp: 100,
  /** A vehicle ramming a wall at this speed or more (px a second) breaks through. */
  ramSpeed: 230,
  /** Mason's Os's price to brick up one hole: labour and materials. */
  repairCost: 180,
  /** How many holes the world keeps (the oldest are bricked up by their owners when there are more). */
  keep: 120,
};
