// The government's response, the 4th wanted star (v0.106.0; src/systems/army.js). Every number that shapes it is here.
export const ARMY = {
  /** What the defence budget keeps ready at Fort Gullcrest for a hunt, before policies. */
  base: { soldiers: 36, heavy: 6 },
  /** Each defence policy in force moves that by this share (raise defence spending: +25%, cut it: −25%). */
  budgetStep: 0.25,
  /** Every this many days the budget refits the fort by this share of what it pays for (losses are not replaced at once). */
  refitDays: 30,
  refitShare: 0.25,
  /** With three stars, this many police officers killed brings the Army. */
  officerKills: 2,
  /** Real seconds before the first wave, and between waves. */
  firstWave: 20,
  waveEvery: 75,
  /** No new wave while this many soldiers are already on your street and on their feet. */
  maxOut: 6,
  /** The waves, in order (the last repeats): a patrol, a road block, heavy weapons. */
  waves: [
    { kind: 'patrol', soldiers: 3, heavy: 0 },
    { kind: 'roadblock', soldiers: 5, heavy: 0 },
    { kind: 'heavy', soldiers: 3, heavy: 1 },
  ],
  /** Where they come in, in tiles from you. */
  spawn: { min: 14, max: 24 },
  /** Game minutes unseen before the 4th star lapses. */
  lapseMinutes: 600,
  /** Soldiers open fire within this many tiles (about the width of the screen), and their rounds do this share of a rifle's damage (they shoot to stop you, and you should get a fight, not an execution). */
  fireRange: 9,
  damageScale: 0.55,
  weapon: 'item_rifle',
  heavyWeapon: 'item_rpg',
};
