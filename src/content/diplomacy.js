// Diplomacy (v0.96.0): the one writer of wars and embargoes. Pure data; every figure the model uses is here (calibrated by simulation, tests/diplomacy.test.mjs).
//
// A quarrel between two countries that the arms market lists as rivals moves along a chain, never by a single roll:
//   peace → dispute → tension → sanctions (the aggressor is embargoed) → war → ceasefire → peace.
// At the end of each stage before war the quarrel may be settled by talks. Every "chance" is a hash of the day and the pair, so a reload cannot change it.
// The arms market's rival list and aggression values are the INPUT; the President's stance (commitments abroad) and the state of the world are modifiers.

export const DIPLOMACY = {
  /** Chance a pair of rivals starts a dispute on a day of peace: base × the pair's mean aggression ÷ 0.3, × what the world and the President's stance add. */
  start: { base: 0.12, cooldown: 10, perWar: 0.12, worldCap: 0.4 },
  /** Days in each stage before it ends (inclusive range, hashed): dispute, tension, sanctions. */
  stage: { dispute: [3, 7], tension: [3, 6], sanctions: [2, 5] },
  /** At the end of a stage: the chance that talks settle the quarrel (before war). Better relations with Sund help when Sund is party to it. */
  talks: { dispute: 0.28, tension: 0.20, sanctions: 0.10, perRelation: 0.003, cap: 0.75 },
  /** The war: the least it lasts, and the daily chance of a ceasefire after that. */
  war: { minDays: 5, endChance: 0.15 },
  /** Sanctions on an aggressor are lifted when the quarrel ends; a standing embargo (international sanctions) may be lifted now and then. */
  standingLift: 0.02,
  /** Relations with Sund (−100 … +100): each country's own baseline from a hash, moved toward a target by a point a day. */
  relations: { baseline: [-22, 28], step: 1, trade: 25, military: 45, perDispute: -14, perSanction: -22, perWar: -30, embargoOnThem: -12, lirre: 8 },
  /** Names for a relation score, from the worst: [upper bound (exclusive), label]. */
  bands: [[-60, 'Hostile'], [-30, 'Tense'], [-8, 'Cool'], [12, 'Neutral'], [40, 'Warm'], [101, 'Friendly']],
  /** What the quarrels are about (a hash picks one; it is only a name). */
  causes: ['a border incident', 'a fishing-rights dispute', 'a failed round of trade talks', 'a sunk patrol boat', 'an expelled attaché', 'a shipping toll nobody agreed', 'a disputed island', 'a leaked cable'],
  log: 14, historyKept: 6,
};
