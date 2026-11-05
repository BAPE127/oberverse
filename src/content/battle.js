// The tactical battle (v0.101.0 stage 10a): pure data. Every number the battle simulation reads, in one place, so the aggregate resolver (src/war/combat.js) and the played battle use the
// same tables where they overlap: the weapons, the armour eras (src/content/troops.js ARMOUR), the class powers (CLASS_POWER) and the cover values. The battle runs at a fixed ten steps a
// second; a second is ten ticks; chance is a hash of (the engagement's key, the tick, the unit), never a draw, so replaying the same orders gives the same battle.
export const TICK = { perSecond: 10, maxSeconds: 480, decide: 5 };

/** Tile kinds on a battle map. Walls block sight and movement; windows pass sight and shots but not people; trees block sight; hedges and crops give cover. */
export const TILE = { GROUND: 0, ROAD: 1, WALL: 2, WATER: 3, TREE: 4, HEDGE: 5, FLOOR: 6, DOOR: 7, WINDOW: 8, STAIRS: 9, CROP: 10 };

/** The chance a shot is absorbed by what the target stands in or behind (docs/PROPOSAL_WAR_TACTICAL.md section 5). */
export const COVER = { open: 0, hedge: 0.25, crop: 0.25, tree: 0.25, building: 0.75, window: 0.85 };

/** Each floor above the ground adds this much sight and reach (tiles); roofs and low walls stop blocking from above. */
export const HEIGHT = { sight: 3, reach: 1 };

/** Suppression (0 to 100): builds from incoming shots, fades, and moves a unit through four states. Thresholds rise with morale. */
export const SUPPRESS = { decay: 0.3, shaken: 25, pinned: 50, broken: 78, moraleShift: 0.2, rally: 40 };

/** Speeds in tiles a second. */
export const SPEED = { infantry: 1.8, indoors: 1.2, vehicleBase: 1.0, vehiclePerBar: 0.25, helicopter: 3.5 };

/**
 * Weapons as the battle uses them: an effective interval (the game's automatic weapons fire bursts; a burst is one decision here), a damage per decision, a hit chance at close range, a
 * reach, how hard it pins (suppression added per shot) and how well it pierces armour (1: full, 0: none). They follow the Arms works' own stats (src/content/arms.js ammo and damage) scaled
 * to a fight of a few minutes, and the calibration test (tests/battle_calibration.test.mjs) holds them to the aggregate resolver.
 */
export const WEAPONS = {
  item_pistol: { range: 8, damage: 18, interval: 1.2, acc: 0.5, suppress: 0.4, pierce: 0 },
  item_smg: { range: 9, damage: 20, interval: 0.9, acc: 0.55, suppress: 0.6, pierce: 0 },
  item_shotgun: { range: 6, damage: 40, interval: 1.5, acc: 0.6, suppress: 0.6, pierce: 0 },
  item_assault_rifle: { range: 14, damage: 24, interval: 1.0, acc: 0.6, suppress: 0.8, pierce: 0.05 },
  item_lmg: { range: 13, damage: 20, interval: 0.5, acc: 0.4, suppress: 1.6, pierce: 0.05 },
  item_sniper_rifle: { range: 26, damage: 90, interval: 3.0, acc: 0.85, suppress: 1.5, pierce: 0.2 },
  item_rpg: { range: 16, damage: 140, interval: 6.0, acc: 0.65, suppress: 8, pierce: 1, rocket: true },
  tank_gun: { range: 18, damage: 130, interval: 3.0, acc: 0.65, suppress: 10, pierce: 1 },
  heli_gun: { range: 14, damage: 55, interval: 1.4, acc: 0.6, suppress: 3, pierce: 0.5 },
  vehicle_mg: { range: 10, damage: 14, interval: 0.5, acc: 0.4, suppress: 1.2, pierce: 0.02 },
  none: { range: 0, damage: 0, interval: 99, acc: 0, suppress: 0, pierce: 0 },
};

/** What a unit is: hit points and how it sees. Vehicles' hit points come from their armour bar. */
export const UNITS = {
  infantry: { hp: 150, sight: 12, speed: SPEED.infantry },
  tank: { hp: 260, perArmour: 90, sight: 14 },
  helicopter: { hp: 220, perArmour: 40, sight: 18 },
  carrier: { hp: 180, perArmour: 50, sight: 12 },
  other: { hp: 120, perArmour: 30, sight: 12 },
};

/** Small arms do almost nothing to armour: a weapon's damage to a vehicle is its damage times this plus (1 - this) times its pierce. */
export const ARMOUR_FLOOR = 0.04;

/** What a role adds to its side: medics mend those near them, officers rally, signallers see further. */
export const ROLE = { medic: { heal: 3, radius: 3 }, officer: { rally: 6 }, signaller: { sight: 3 }, marksman: {}, anti_tank: {}, machine_gunner: {} };

/** Where a ground vehicle is hit decides how hard: its front is its thickest armour, its rear its thinnest (a multiplier on the damage). */
export const FACING = { front: 0.6, side: 1.0, rear: 1.4 };
/**
 * A ground vehicle is a hull and four modules (v0.102.0). A hit that lands on a module wears it down (its integrity is 1 at the start); a module under `hurt` works badly, one under `down` is out:
 * tracks out = it cannot move; the gun out = it cannot fire its main gun; the engine out = it burns; the crew out = it is abandoned (lost). `w` is the share of hits that land on each.
 */
export const MODULES = { tracks: { w: 0.30 }, gun: { w: 0.25 }, engine: { w: 0.20 }, crew: { w: 0.15 }, hull: { w: 0.10 } };
export const MODULE = { hpShare: 0.5, hurt: 0.5, down: 0.15, burn: 5, slow: 0.5, aimLoss: 0.8 };
/**
 * Support called from the real stock (v0.102.0): a battlefield missile or a drone (one item, used up when it is called), an aircraft pass (an aircraft the company keeps, which is not lost but burns
 * fuel), and smoke (carried by engineers and officers: two grenades each, a part of their kit). A strike takes `delay` seconds to land and hurts everyone in its blast, yours too.
 */
export const SUPPORT = {
  item_missile_guided: { name: 'Skylance guided missile', delay: 4, r: 3, dmg: 420, group: 'missile' },
  item_missile_cruise: { name: 'Longbow cruise missile', delay: 6, r: 4, dmg: 700, group: 'missile' },
  item_drone_attack: { name: 'Hornet attack drone', delay: 3, r: 1.6, dmg: 180, group: 'drone' },
  item_drone_strike: { name: 'Kestrel strike drone', delay: 3, r: 2.2, dmg: 280, group: 'drone' },
  fighter: { name: 'Fighter strafing pass', delay: 5, len: 22, width: 1.3, dmgTick: 6, fuel: 6, seconds: 3.5, group: 'air' },
  bomber: { name: 'Bomber run', delay: 6, len: 26, bombs: 4, r: 2.6, dmg: 360, fuel: 10, seconds: 4, group: 'air' },
  smoke: { name: 'Smoke', delay: 0.8, r: 2.6, seconds: 30, throw: 9, charges: 2, group: 'smoke' },
};
/** A wall segment holds this much damage before it is breached (a gun or a rocket opens it; the wall becomes rubble you can walk through and see through). */
export const BREACH = { wall: 260, blast: 1.4 };
/** A battle's length and how its objectives are scored (a share of the enemy put out of action, a ceiling on your own losses, a zone held or taken, a convoy through). */
/** A soldier put out of action (hit points gone) is dead with this chance (less with plate armour), else badly wounded: the same split the aggregate resolver uses (src/war/combat.js, a third of the casualties dead). */
export const DOWN = { dead: 0.38, woundsLow: 3, woundsHigh: 4 };

export const OBJECTIVE = { zone: 4, holdSeconds: 60, captureSeconds: 40, enemyShare: 0.6, ownLossCeiling: 0.35 };

/** The two battle recipes of this release (the other recipes come with the later sub-releases). */
export const RECIPES = { city: { w: 88, h: 56 }, fields: { w: 120, h: 64 } };
/** The sizes of the first generation of maps (v0.101.0), kept so a battle saved mid-way replays on the map it began on (setup.map.ver absent). */
export const RECIPES_V1 = { city: { w: 72, h: 44 }, fields: { w: 80, h: 48 } };
/** The map generator's version: 2 from v0.102.0 (the mock-up look: glyph ground, props, cars, roofed facades). */
export const MAP_VER = 2;

/** National architecture, as data (docs/PROPOSAL_WAR_MAPS.md): floors a building has, and the colours the roof painter uses. Other countries map to the nearest of the five. */
export const STYLES = {
  halvermouth: { floors: [2, 6], roof: '#6a6e74', wall: '#a9564a', trim: '#d8c8a8', window: 'square', note: 'flat and mansard roofs, red and tan brick' },
  ostmark: { floors: [2, 4], roof: '#a8442e', wall: '#e0d4b4', trim: '#5a4430', window: 'shuttered', note: 'steep red-tile roofs, cream plaster and dark timber' },
  varnistan: { floors: [1, 3], roof: '#c8b080', wall: '#d8bc88', trim: '#b8905a', window: 'arched', note: 'flat sand roofs, domes, ochre walls' },
  sund: { floors: [1, 3], roof: '#4a4a52', wall: '#a8503e', trim: '#e8e0d0', window: 'crossbar', note: 'steep tarred gables, painted planks' },
  windfen: { floors: [4, 6], roof: '#8a8e94', wall: '#b8bcc0', trim: '#4a8aa8', window: 'ribbon', note: 'concrete panels, ribbon windows, balconies' },
};
/** How tall a building's front face is drawn: 12 art pixels (a tile is 16) a floor and 4 more, with at least 14 art pixels of roof above it; a building must be tall enough on the map to show its floors. */
export const FACADE = { floor: 12, base: 4, roofMin: 14 };
export const faceH = (floors) => floors * FACADE.floor + FACADE.base;
export const minTiles = (floors) => Math.ceil((faceH(floors) + FACADE.roofMin) / 16);
/** The painter's own names for the five styles, and for the biomes (the atlas's seven land kinds fall on five palettes). */
export const ART_STYLE = { halvermouth: 'halver', ostmark: 'ostmark', varnistan: 'varn', sund: 'sund', windfen: 'windfen' };
export const ART_BIOME = { rural: 'temperate', taiga: 'snow', tundra: 'snow', snow: 'snow', desert: 'desert', steppe: 'steppe', jungle: 'mud' };
/** The style an atlas country's places use (the others take the nearest of the five until they get their own). */
export const STYLE_OF = { sund: 'sund', ostmark: 'ostmark', varn: 'varnistan', teshvar: 'varnistan', caldera: 'varnistan', lirre: 'ostmark', westreach: 'halvermouth', pallas: 'sund', windfen: 'windfen', morrow: 'windfen' };
export const styleOf = (country) => STYLE_OF[country] || 'halvermouth';
