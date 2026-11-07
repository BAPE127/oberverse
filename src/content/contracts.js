// Early contracts (v0.99.0 stage 6): the ordinary work of a security firm. Pure data. A contract asks for guards (and nothing heavy: never a tank, a helicopter or a loadout), a pistol each
// and a radio, for a few days; it pays only when it ends well, and a failure costs money (owed, never taken from you) and a client. Figures are starting figures to calibrate against
// the wages (120 obols a day for a guard) and what a guard shift earns.
import { INCOME } from './income.js';
export const CLIENTS = {
  fish_coop: { name: 'Lanternside Fish Co-op', place: 'the cold store on the quay' },
  oil: { name: 'Ober\'s Oil', place: 'the refinery gate' },
  masons: { name: 'Mason\'s Os', place: 'a building site' },
  cheese: { name: 'Chuckie\'s Cheese', place: 'the Lariat dairy' },
  grand: { name: 'The Phonograph Grand', place: 'the resort' },
  treasury: { name: 'The Sund Treasury', place: 'Halvermouth' },
};

/** What a kind of job is: how many guards, how long, how risky, and the words. `rate` is obols per guard per day at the risk's rate. */
export const KINDS = {
  watch: { title: 'Guard {place}', guards: [2, 4], days: [3, 6], risk: ['low', 'low', 'medium'], clients: ['fish_coop', 'masons', 'cheese'], text: 'Stand the post, walk the fence and call someone if anything moves.' },
  patrol: { title: 'Patrol {place}', guards: [2, 3], days: [4, 7], risk: ['low', 'medium'], clients: ['oil', 'masons', 'cheese'], text: 'Walk the same circuit all night. It is the walking that keeps people away.' },
  event: { title: 'Secure an event at {place}', guards: [3, 5], days: [1, 2], risk: ['low', 'medium'], clients: ['grand', 'treasury'], text: 'Stand at the doors, look at the guests and say very little.' },
  escort: { title: 'Escort a cargo from {place}', guards: [3, 4], days: [2, 3], risk: ['medium', 'medium', 'high'], clients: ['oil', 'treasury', 'fish_coop'], text: 'A van, a route and a client who would like it to arrive.' },
  recover: { title: 'Recover stolen goods near {place}', guards: [3, 5], days: [2, 4], risk: ['medium', 'high'], clients: ['masons', 'cheese', 'oil'], text: 'Someone took something. Someone knows who.' },
};

/** Obols per guard per day by risk, the chance of success before extra hands and reputation, and what a failure costs (a share of the pay). */
export const RISK = {
  low: { rate: INCOME.war.guardDay.low, success: 0.9 },
  medium: { rate: INCOME.war.guardDay.medium, success: 0.78 },
  high: { rate: INCOME.war.guardDay.high, success: 0.62 },
};

export const CONTRACTS = {
  open: 3,              // offers open at once, before reputation
  perRep: 15,           // one more open offer for each this much reputation (to a cap)
  maxOpen: 6,
  chance: 0.4,          // the chance, each day, that a new offer turns up while there is room
  lasts: [4, 8],        // days an offer stays open
  extraHand: 0.04,      // success chance for each guard beyond what the job needs
  repGuards: 10,        // jobs may ask for one more guard for each this much reputation
  repBonus: 0.002,      // success chance for each point of reputation (to a cap)
  repBonusMax: 0.1,
  moraleBonus: 0.002,   // success chance for each point of the crew's morale above or below 70 (v0.100.0)
  penalty: 0.4,         // a failure costs this share of the pay
  repWin: 3, repLose: -6,
  ban: 30,              // days a client who was let down will not offer
  kept: 30,             // finished contracts kept in the record
  radio: 1,             // radios a job needs (one per contract)
};
