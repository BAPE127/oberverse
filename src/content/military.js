// The military (v0.98.0): pure data. The war update's one saved record is `world.military` (src/war/state.js); this file names its parts.
//
// Statuses and locations are closed lists so the consistency checker (src/war/check.js) can say exactly what is wrong. Nothing here creates a unit or a facility.

/** Every way a structure can be hurt. The damage gate (src/war/damage.js) takes one of these and nothing else: an unknown source is refused. */
export const DAMAGE_SOURCES = ['gunfire', 'explosion', 'vehicle', 'missile', 'bombing', 'artillery', 'tactical', 'strategic', 'scripted', 'environment', 'debug'];

/** Sources that repair (the same gate: a repair is the only way a structure gets better). */
export const REPAIR_SOURCES = ['repair', 'rebuild', 'debug'];

export const STRUCTURE_STATES = ['intact', 'damaged', 'destroyed'];
export const COUP_STATES = ['none', 'staged', 'ended'];
/** The lifecycle of any item or person the company holds. */
export const ITEM_STATUS = ['stored', 'assigned', 'deployed', 'damaged', 'destroyed', 'captured'];
export const PERSON_STATUS = ['active', 'wounded', 'training', 'leave', 'dead', 'captured'];

/** A structure at or below this share of its hit points is "damaged"; at zero it is destroyed. */
export const DAMAGE = { damagedBelow: 0.7, log: 40 };

/** The consistency checker's findings, by kind (so a test can say which corruption it planted). */
export const PROBLEMS = ['duplicate_id', 'negative_count', 'missing_reference', 'double_assignment', 'destroyed_deployable', 'bad_status', 'bad_coup', 'protection_mismatch'];
