// Generals and engagements (v0.100.0 stage 9): pure data. A general is a person with real differences; an engagement is a heavy contract (a crossing to hold, a depot to defend) that asks
// for squads, tanks and medics you really own, and is fought by a general you assign. Nothing is spawned to meet a requirement. Figures are starting figures to calibrate (the estimate on the
// screen and the result come from the same function, src/war/combat.js).
//
// Traits are 1 to 5 (3 is average). `risk` (0 to 1) is how readily they accept losses for a win; `aversion` is the reverse and shrinks casualties at the cost of results.
import { INCOME } from './income.js';
const G = (id, name, fee, style, t, risk, terrain, text) => ({ id, name, fee, style, offence: t[0], defence: t[1], logistics: t[2], air: t[3], intel: t[4], risk, terrain, text });
export const GENERALS = Object.fromEntries([
  G('odalys', 'Gen. Mira Odalys', 1900, 'Defence · careful · air coordination', [2, 5, 3, 5, 3], 0.2, { urban: 1, forest: 0, rural: 0, desert: -1, industrial: 1 }, 'Never gives up a position she can hold, and calls the aircraft in before the shells land.'),
  G('rostrov', 'Gen. Pell Rostrov', 2300, 'Offence · bold · armour', [5, 2, 3, 2, 3], 0.85, { rural: 1, desert: 1, urban: -1, forest: -1, industrial: 0 }, 'Wants the tanks forward and the enemy off balance. Wins big or loses big.'),
  G('vance', 'Gen. Hale Vance', 1700, 'Logistics · steady', [3, 3, 5, 2, 3], 0.35, { rural: 1, industrial: 1, urban: 0, desert: 0, forest: 0 }, 'Counts the fuel before the men. His columns arrive with something left.'),
  G('thorne', 'Gen. Iris Thorne', 2100, 'Intelligence · cautious', [3, 3, 3, 3, 5], 0.3, { urban: 1, forest: 1, desert: 0, rural: 0, industrial: 0 }, 'Knows what is on the other side of the hill, and says so before anyone moves.'),
  G('koval', 'Gen. Dmitri Koval', 1500, 'Offence · reckless', [4, 2, 2, 2, 2], 0.95, { rural: 1, forest: 0, urban: -1, desert: 0, industrial: 0 }, 'Cheap and fast, and he leaves a trail of other people\'s mud.'),
  G('marsh', 'Gen. Ada Marsh', 2000, 'Defence · patient · terrain', [2, 5, 4, 2, 3], 0.15, { forest: 2, urban: 1, rural: 0, desert: -1, industrial: 0 }, 'Digs in, waits, and lets the other side tire.'),
  G('oyelaran', 'Gen. Tobi Oyelaran', 2200, 'All-round · air', [4, 3, 3, 5, 3], 0.55, { desert: 1, rural: 1, urban: 0, forest: 0, industrial: 0 }, 'Believes the war is won from above, and has the habit of being right.'),
  G('brandt', 'Gen. Ilse Brandt', 1800, 'Industrial · methodical', [3, 4, 4, 3, 2], 0.3, { industrial: 2, urban: 1, rural: 0, desert: 0, forest: 0 }, 'Takes a factory the way others take a cup of tea: carefully, and all the way through.'),
].map((g) => [g.id, g]));

/** How many generals the company can keep: one for each this many desks in the command post. */
export const GENERAL_SEATS = { perDesks: 5 };

/**
 * Engagements. `needs` are [low, high] and rise with reputation; `enemy` is the force against you (a strength in "troop equivalents" and a skill 0.8 to 1.3). `objectives` is how many
 * parts the result pays for (as in the mock-up: "2 of 3 objectives · paid 88,000 of 95,000").
 */
export const ENGAGEMENTS = {
  hold: { title: 'Hold {place}', text: 'A crossing the other side wants. Stay on it until the time is up.', days: [14, 24], troops: [10, 24], tanks: [0, 2], helicopters: [0, 1], medics: [1, 2], enemy: [0.8, 1.15], terrains: ['rural', 'forest', 'mountain'], goal: 'defence' },
  defend: { title: 'Defend {place}', text: 'A depot, a port or a pumping station, and a client who would like to keep it.', days: [10, 20], troops: [8, 20], tanks: [0, 1], helicopters: [0, 1], medics: [1, 2], enemy: [0.7, 1.05], terrains: ['rural', 'forest'], goal: 'defence' },
  retake: { title: 'Retake {place}', text: 'A post that was lost last month. The client wants it back.', days: [8, 16], troops: [14, 30], tanks: [1, 3], helicopters: [0, 2], medics: [2, 3], enemy: [0.9, 1.25], terrains: ['rural', 'desert', 'mountain'], goal: 'offence' },
  raid: { title: 'Raid {place}', text: 'Get in, hit the marked ground, hold it a few seconds, and the client is satisfied. Nobody is asking you to keep it.', days: [3, 6], troops: [6, 14], tanks: [0, 1], helicopters: [0, 1], medics: [0, 1], enemy: [0.7, 1.0], terrains: ['rural', 'forest', 'desert', 'mountain'], goal: 'raid' },
  extract: { title: 'Bring an officer out of {place}', text: 'A friendly officer is cut off at the marked ground. Reach them and bring them back to your lines alive.', days: [3, 7], troops: [6, 12], tanks: [0, 1], helicopters: [0, 1], medics: [1, 1], enemy: [0.6, 0.95], terrains: ['rural', 'forest', 'mountain', 'desert'], goal: 'extract' },
  rescue: { title: 'Recover a downed pilot near {place}', text: 'A pilot is down, hurt, and walking slowly. The other side knows where.', days: [2, 5], troops: [5, 10], tanks: [0, 0], helicopters: [0, 1], medics: [1, 2], enemy: [0.5, 0.85], terrains: ['rural', 'forest', 'mountain', 'desert'], goal: 'rescue' },
  escort: { title: 'Escort a heavy convoy through {place}', text: 'Fuel, shells and a long road with other people on it.', days: [6, 12], troops: [8, 16], tanks: [1, 2], helicopters: [0, 1], medics: [1, 1], enemy: [0.6, 0.95], terrains: ['rural', 'desert', 'forest'], goal: 'logistics' },
};

/** The battle terrain of an atlas state's biome (the atlas has ten; a fight has five kinds of ground, and a state with no biome is farmland and villages). */
export const TERRAIN_OF = { taiga: 'forest', jungle: 'forest', mountain: 'mountain', volcanic: 'mountain', tundra: 'rural', ice: 'rural', steppe: 'rural', savanna: 'rural', desert: 'desert' };
export const terrainOf = (biome) => TERRAIN_OF[biome] || 'rural';

export const ENGAGE = {
  open: 2,              // offers open at once, before reputation
  perRep: 30,           // one more for each this much reputation (to the cap)
  maxOpen: 4,
  chance: 0.22,         // the chance each day that a new offer turns up while there is room (a command post must stand)
  lasts: [6, 12],       // days an offer stays open
  repScale: 0.012,      // how much bigger a job's needs get for each point of reputation (0.012 × 50 = +60%)
  payPerTroopDay: INCOME.war.engageTroopDay,  // obols a troop-equivalent a day, on top of vehicles (see tank/helicopter below); v0.103.5: the owner's income rule, one figure for a soldier in the field (was 340)
  payTank: 2800 * INCOME.war.vehicleScale, payHelicopter: 3600 * INCOME.war.vehicleScale,
  penalty: 0.35,
  repWin: 6, repHold: 2, repLose: -10,
  ban: 40,
  kept: 12,
  luckSd: 0.14,         // the seeded uncertainty in a result (a share of the log of the odds)
};
