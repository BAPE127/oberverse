// The strategic war's numbers (v0.103.0): pure data, all starting figures to calibrate (docs/PROPOSAL_WAR_STRATEGIC.md). The rules that read them are in src/war/strategic.js.
//
//   TERRAIN_FX     what ground does to a march and to a defender
//   INFRA_SPEED    what a province's infrastructure (1 to 5) does to a march
//   MARCH          speeds on foot and by vehicle, the detour of a road over a straight line, the bonus along a railway
//   SEALIFT        the employer carries your battalions to the theatre and home: days by distance
//   RETAINER       what the employer pays while you serve, and for ground taken
//   BATTALION      organisation (cohesion): what it costs to move and attack, what a day's rest gives back, what a battle takes
//   GARRISON       the force an enemy-held province holds, from what is in it
//   SLOTS          what each slot of a battalion template asks the chosen squads to bring
import { INCOME } from './income.js';
export const TERRAIN_FX = {
  plains: { speed: 1, def: 1 }, farmland: { speed: 1, def: 1 }, forest: { speed: 0.7, def: 1.12 }, hills: { speed: 0.7, def: 1.1 }, mountains: { speed: 0.4, def: 1.25 },
  marsh: { speed: 0.5, def: 1 }, urban: { speed: 0.8, def: 1.15 }, desert: { speed: 0.8, def: 0.95 }, jungle: { speed: 0.5, def: 1.12 },
};
export const INFRA_SPEED = [0, 0.6, 0.75, 0.9, 1.05, 1.2];
export const MARCH = { foot: 6, perBar: 3, base: 6, detour: 1.25, rail: 1.5 }; // km an hour: a vehicle with speed bar b does base + perBar * b
export const SEALIFT = { kmPerDay: 700, minDays: 2 };
// v0.103.5: the figures are the owner's income rules (src/content/income.js `war`): a soldier in a theatre earns `soldierDay`, vehicles `vehicleScale` times their old value, a victory point `vpBonus`
const VS = INCOME.war.vehicleScale;
export const RETAINER = { perTrooper: INCOME.war.soldierDay, perVehicle: { tank: 1400 * VS, helicopter: 1800 * VS, artillery: 900 * VS, antiair: 500 * VS, carrier: 400 * VS, recon: 250 * VS, logistics: 100 * VS, medical: 100 * VS }, perVP: INCOME.war.vpBonus, rep: 1 };
export const BATTALION = { orgMax: 100, moveCost: 2, attackMin: 30, restPerDay: 12, afterBattle: { 3: 12, 2: 22, 1: 40, 0: 65 }, entrenchHours: 12, entrenchMax: 5, expiresDays: 3 };
export const GARRISON = { base: 5, perFort: 3, perVP: 2, urban: 4, perInfra: 2, max: 60, spread: 0.3, rebuildDays: 10 };

/** A template slot: `line` slots are the battalion's body, `support` and `attach` its companies. Each asks what the chosen squads must hold between them. */
export const SLOTS = {
  line: {
    inf: { name: 'Rifle section', icon: '🪖', need: { squads: 1 } },
    at: { name: 'Anti-tank', icon: '🚀', need: { role: 'anti_tank' } },
    tank: { name: 'Tank', icon: '🛡️', need: { cls: 'tank' } },
    apc: { name: 'Carrier', icon: '🚙', need: { cls: 'carrier' } },
  },
  support: {
    recon: { name: 'Recon', icon: '🔭', need: { either: [{ cls: 'recon' }, { role: 'recon' }] } },
    antiair: { name: 'Anti-air', icon: '🎯', need: { cls: 'antiair' } },
    engineers: { name: 'Engineers', icon: '🛠️', need: { role: 'engineer' } },
    medical: { name: 'Medical', icon: '➕', need: { role: 'medic' } },
    signals: { name: 'Signals', icon: '📡', need: { role: 'signaller' } },
    logistics: { name: 'Logistics', icon: '🚚', need: { cls: 'logistics' } },
  },
  attach: {
    spg: { name: 'Artillery', icon: '💥', need: { cls: 'artillery' } },
    heli: { name: 'Helicopter', icon: '🚁', need: { cls: 'helicopter' } },
  },
};
export const MAX_LINE = 25;

// ---- v0.103.1: supply, weather, intelligence (src/war/supply.js)
export const WEATHER = {
  clear: { name: 'Clear', speed: 1, flow: 1, org: 0, colour: '#e8d878' }, rain: { name: 'Rain', speed: 0.85, flow: 1.15, org: 0, colour: '#6fa8dc' }, mud: { name: 'Mud', speed: 0.6, flow: 1.45, org: 1, colour: '#8a6a44' },
  snow: { name: 'Snow', speed: 0.65, flow: 1.35, org: 2, colour: '#f0f4ff' }, heat: { name: 'Heat', speed: 0.9, flow: 1.1, org: 2, colour: '#e8884a' },
};
/** Supply level 0 to 100 at a hub; what each step across ground loses (by the infrastructure of the province entered), what a railway and a plain road make of it, and rough ground. */
export const SUPPLY = { hub: 100, loss: [0, 24, 18, 13, 9, 6], rail: 0.5, road: 0.8, trackless: 1.6, ground: { mountains: 1.6, marsh: 1.4, jungle: 1.4, forest: 1.2, hills: 1.2, desert: 1.15 } };
/** What a shortage of supply does (it only weakens): below `full` an army recovers less each day, below `low` it loses organisation, and fights with less morale and more fatigue. */
export const WEAKEN = { full: 70, low: 25, restFloor: 0.25, drain: 3, speedFloor: 0.8, morale: 0.45, fatigue: 30 };
export const FUEL = { perVehicleDay: 0.3 };
/** What a report says: its error at each level of intelligence, and how far your battalions see (steps of provinces) without and with a recon company. */
export const INTEL = { error: { 0: 0.7, 1: 0.35, 2: 0.08 }, reach: { plain: { known: 0, spotted: 1 }, recon: { known: 1, spotted: 2 } } };

// ---- v0.103.1: the nations at war (src/war/strategicAI.js)
/** How each country fights. `skill` (0.8 to 1.3) multiplies its power in an exchange and sets how well it chooses; `doctrine` is how it chooses: blunt (the nearest ground, whatever the odds), methodical (the best prize it
 * can beat, never at poor odds), cunning (methodical, and it hunts what is weak: an empty province, a battalion low on supply or organisation). Its means are its income; its temper is `aggression` in src/content/arms.js. */
export const COUNTRY_AI = {
  varn: { skill: 0.9, doctrine: 'blunt', text: 'Throws what it has at the nearest ground.' },
  ostmark: { skill: 1.2, doctrine: 'methodical', text: 'Slow, well drilled, and never attacks at poor odds.' },
  caldera: { skill: 1.0, doctrine: 'blunt', text: 'Hard-hitting and not subtle.' },
  sund: { skill: 0.95, doctrine: 'methodical', text: 'Careful with a small army.' },
  pallas: { skill: 0.85, doctrine: 'blunt', text: 'Reckless, with little behind it.' },
  teshvar: { skill: 1.15, doctrine: 'cunning', text: 'Rich and patient: it finds the weak spot.' },
  morrow: { skill: 1.1, doctrine: 'cunning', text: 'Quick to see a gap and to use it.' },
  lirre: { skill: 1.0, doctrine: 'methodical', text: 'Cautious.' },
};
export const COUNTRY_AI_DEFAULT = { skill: 0.9, doctrine: 'blunt', text: 'A small army with plain ideas.' };
/** The mobile reserve a country can put in the field is its income over `poolPer`; it refills by `regen` of that a week. A level is a kind of counter-attack: a probe (a few men at the weakest point), a counter-attack
 * (to retake what was lost, after the country's reaction time) and an offensive (a large force, only by an aggressive or an opportunistic country). */
export const AI = {
  thinkHours: 12, poolPer: 300, startShare: 0.8, regen: 0.12, maxFormations: 3, speedFoot: 6, speedArmour: 12, odds: { blunt: 0.3, methodical: 1.0, cunning: 0.9 }, abort: 0.6,
  react: { blunt: 48, methodical: 24, cunning: 12 },
  probe: { min: 6, max: 14, share: 0.1, cooldownDays: 4, base: 0.06, perAggression: 0.25 },
  counter: { min: 8, share: 0.35, cooldownDays: 3, expireDays: 8, factor: 1.5, keep: 0.25 },
  offensive: { aggression: 0.45, poolShare: 0.5, share: 0.6, max: 70, cooldownDays: 10, chance: 0.35, ratio: 1.4 },
  idleHours: 24, rebuildDays: 10,
};
export const EXCHANGE = { hours: 36, breakAt: 25, rate: 0.018, armour: 5.5, fort: 0.07, entrench: 0.05, luck: 0.2 };
