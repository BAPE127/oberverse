// The coup (v0.106.0; src/war/coup.js). Every number that shapes it is here.
export const COUP = {
  /** Battalions raised and at home before a coup can be staged. */
  battalions: 2,
  /** The government's exposed flank: approval below this, or unrest at this level or more. */
  flank: { approval: 0.45, unrest: 2 },
  /** A heavy-weapons team counts as this many troops in the government's field army. */
  heavyAsTroops: 3,
  /** Damage each of your base's structures takes when the government takes your home province (the gate's points, out of 100). */
  baseDamage: 45,
  /** A coup still going after this many days fails. */
  maxDays: 60,
  /** What a failed or surrendered coup costs: a fine from the company and the licence suspended. */
  terms: { fine: 500000, licenceDays: 30 },
};
