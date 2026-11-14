// How big a unit is (rules 5): the size table is in src/content/battle.js (VEHICLE_SIZE); this reads it.
import { VEHICLE_SIZE, VEHICLE_BY_CLASS } from '../content/battle.js';

const PERSON = { len: 0.5, wid: 0.5 };
/** { len, wid, rotor? } in tiles for a unit: a person, a vehicle by its type, else by its class. */
export function sizeOf(u) {
  if (u.kind === 'inf') return PERSON;
  return VEHICLE_SIZE[u.vtype] || VEHICLE_SIZE[VEHICLE_BY_CLASS[u.role]] || VEHICLE_SIZE[VEHICLE_BY_CLASS[u.kind]] || VEHICLE_SIZE.truck;
}
/** The radius of the disc a ground vehicle needs clear to stand or pass: half its width and a quarter of what its length adds (it can turn in a corridor a little narrower than its length). */
export function clearRadius(u) { const s = sizeOf(u); return s.wid / 2 + 0.25 * (s.len - s.wid); }
/** The radius with which two vehicles keep apart (centre to centre, each): the mean of half the length and half the width. */
export function bodyRadius(u) { const s = sizeOf(u); return (s.len + s.wid) / 4; }
