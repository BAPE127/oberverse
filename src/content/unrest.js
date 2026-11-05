// Unrest (v0.97.0): demonstrations as records, the police response, and what the player may do. Pure data; every figure the model uses is here.
//
// A demonstration is a record (a cause, a place, a size, an anger, organisers) with a small visible crowd when the player is on the Crown Quarter. It ends peacefully,
// is cleared by the police, or escalates, according to its anger, its size, how the police are set to respond (policies and how many officers are on duty) and what the player does.
// It never means every protest is a riot: nearly all end peacefully. Every chance is a hash of the day and the demonstration, never a random draw.

export const UNREST = {
  /** Tension (0..1) from the state of the country. */
  tension: { disapproval: 0.55, deficit: 0.25, war: 0.04, embargo: 0.02, scandal: 0.15, dislike: 0.30, heatWeight: 0.1 },
  /** The chance a demonstration begins on a day: base + per point of tension above `from`, hashed; at most `max` at once; a pause of `cooldown` days between starts. */
  start: { base: 0.006, from: 0.2, perTension: 0.09, cap: 0.09, max: 2, cooldown: 6 },
  /** A demonstration: its size (people, aggregate), its starting anger (0..1), and its length. */
  size: [30, 380], anger: [0.25, 0.6], days: { min: 2, max: 9 },
  /** How anger moves each day (0..1): pressure from the country's tension, a calming decay, and what the police response does. */
  drift: { pressure: 0.06, decay: 0.035, heavy: 0.05, light: -0.015 },
  /** The police response level (0..1) from the base, the policies and the officers on duty; below `light` the police only watch, above `heavy` they disperse. */
  police: { base: 0.45, up: 0.2, down: -0.2, strict: 0.2, light: -0.2, staffing: 0.1, staffBaseline: 6, lightBelow: 0.35, heavyFrom: 0.65 },
  /** Escalation (a riot): a daily hash chance, base + anger above 0.55 + a heavy-handed response against an angry crowd + size, less with surveillance; never above `cap`. */
  riot: { base: 0.006, perAnger: 0.2, heavy: 0.14, perSize: 0.05, cap: 0.3, intelligence: 0.3, days: [1, 2] },
  /** The police clear a modest crowd on a heavy response: a daily chance. */
  clear: { chance: 0.3, angerBelow: 0.6, sizeBelow: 220 },
  /** After a riot or a clearing the anger falls to this share. */
  after: { riot: 0.5, cleared: 0.4 },
  /** What a demonstration does to the country (opinion): heat is `perDemo` × size share while it lasts, `perRiot` for a riot, and fades by `fade` a day. */
  heat: { perDemo: 0.08, perRiot: 0.6, fade: 0.12, cap: 1 },
  /** What the player may do. */
  support: { min: 1000, cap: 20000, sizePer: 0.5, angerPer: 0.05 },        // an open donation to the organisers: size +0.5 per 1,000 (as a share of size / 100 each), anger a little
  speak: { base: 0.35, perRep: 0.01, perRel: 0.004, anger: -0.15, fail: 0.03, rep: 1 },
  fund: { price: 30000, size: 1.25, anger: 0.12, heat: 6 },                  // secret money: recorded as an illicit offer, found out like one
  /** The crowd you can see: the real people who come (party organisers and press), and how many officers are sent, on a firm or heavy response. */
  crowd: { from: 10, to: 18, errandMinutes: 40, officers: { light: 0, firm: 1, heavy: 2 }, spot: 'demonstration' },
  kept: 14, log: 12,
  /** Hooks left for later systems (a coup): read-only. */
  hooks: { legitimacyApproval: 0.5, legitimacyCalm: 0.3, legitimacyMandate: 0.2 },
};
