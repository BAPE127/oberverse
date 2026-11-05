// The one aggregate combat function (v0.100.0 stage 9): what happens when a force meets an enemy and nobody plays it out. Pure: every number comes from its arguments, and "chance" is a hash
// of the engagement's key, so a result can never be re-rolled by loading a save. The estimate on the screen is the SAME function with the luck term set to zero and losses as expected values;
// the later tactical and strategic engines resolve the fights you do not play with this too (docs/PROPOSAL_WAR.md 3.7), so the two can never disagree about what a force is worth.
//
//   resolve(input)               → the result: odds, outcome, who is dead, wounded or lost, what was used, and the parts of the calculation (so it can be explained)
//   estimate(input)              → the same, with the luck taken out and the losses as expected counts, and the chance of each outcome
//   input: { key, days, terrain, goal, enemy:{troops,armour,air,skill}, people:[{id,role,tier,armour,exp,morale,fatigue,armed}], vehicles:[{id,cls,armour,firepower,speed}],
//            general: null | {offence,defence,logistics,air,intel,risk,bonus}, supplies:{fuel,rockets} }
import { ENGAGE } from '../content/generals.js';
import { ARMOUR } from '../content/troops.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const normal = (key) => ((unit(`${key}|a`) + unit(`${key}|b`) + unit(`${key}|c`) + unit(`${key}|d`)) - 2) * 1.732;
const cdf = (z) => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z))); // a normal curve, close enough for a shown percentage

export const CLASS_POWER = { rifleman: 1, machine_gunner: 1.6, anti_tank: 1.2, marksman: 1.4, medic: 0.4, engineer: 0.9, signaller: 0.7, officer: 0.9, recon: 0.9, uav: 0.9 };
const TERRAIN_DEFENCE = { forest: 1.12, mountain: 1.2, urban: 1.15, industrial: 1.1, rural: 1, desert: 0.95 };
const VEHICLE_WEIGHT = { tank: 1.4, helicopter: 1.55, artillery: 1.0, antiair: 0.5, carrier: 0.45, recon: 0.25, logistics: 0.1, medical: 0.1 };
const VEHICLE_LOSS = { tank: 1, helicopter: 1.3, artillery: 0.7, antiair: 0.6, carrier: 0.6, recon: 0.5, logistics: 0.4, medical: 0.4 };
export const THRESHOLDS = [0.55, 0.15, -0.2]; // the score for 3, 2 and 1 objectives; below the last is a loss
export const OUTCOMES = ['lost', 'partial', 'held', 'held_well'];

const personPower = (p, sup) => {
  const tier = p.armed ? (p.tier === 2 ? 1.25 : 1) : 0.25;
  const ammo = p.role === 'anti_tank' ? 1 - 0.5 * sup.rocketShort : 1;
  return (CLASS_POWER[p.role] ?? 0.8) * tier * ammo * (0.6 + 0.4 * (p.morale ?? 70) / 100) * (1 - (p.fatigue ?? 0) / 250) * (1 + 0.04 * Math.min(10, p.exp ?? 0));
};
const vehiclePower = (v, sup) => (v.firepower * 1.6 + v.armour * 0.9 + v.speed * 0.2) * (VEHICLE_WEIGHT[v.cls] ?? 0.2) * (1 - 0.4 * sup.fuelShort);

function parts(input) {
  const { days, terrain, goal, enemy, people, vehicles, general, supplies } = input;
  const fuelNeed = Math.ceil(vehicles.length * days * 0.3);
  const rocketNeed = Math.ceil(people.filter((p) => p.role === 'anti_tank').length * Math.min(days, 6) * 0.5);
  const sup = { fuelNeed, rocketNeed, fuelShort: fuelNeed ? clamp(1 - (supplies?.fuel ?? 0) / fuelNeed, 0, 1) : 0, rocketShort: rocketNeed ? clamp(1 - (supplies?.rockets ?? 0) / rocketNeed, 0, 1) : 0 };
  const troops = people.reduce((a, p) => a + personPower(p, sup), 0);
  const armour = vehicles.reduce((a, v) => a + vehiclePower(v, sup), 0);
  const t = TERRAIN_DEFENCE[terrain] ?? 1;
  const terrainMult = goal === 'defence' ? t : goal === 'offence' ? 1 / t : 1;
  let generalMult = 1;
  if (general) {
    const trait = goal === 'defence' ? general.defence : goal === 'offence' ? general.offence : general.logistics;
    generalMult = clamp(1 + 0.045 * (trait - 3) + (enemy.air > 0 ? 0.015 * (general.air - 3) : 0) + 0.01 * (general.intel - 3) + 0.03 * (general.bonus || 0), 0.85, 1.2);
  }
  const our = (troops + armour) * terrainMult * generalMult;
  const theirs = Math.max(0.5, (enemy.troops + enemy.armour * 5.5 + enemy.air * 6) * (enemy.skill ?? 1));
  return { troops, armour, terrainMult, generalMult, our, theirs, sup };
}

/** The odds, outcome and consequences. `expected` (used by estimate) takes the luck out and counts losses as expected values. */
export function resolve(input, { expected = false } = {}) {
  const P = parts(input);
  const { people, vehicles, general, days } = input;
  const ratio = P.our / P.theirs;
  const luck = expected ? 0 : normal(`${input.key}|luck`) * ENGAGE.luckSd;
  const score = Math.log(Math.max(0.01, ratio)) + luck;
  const objectives = score >= THRESHOLDS[0] ? 3 : score >= THRESHOLDS[1] ? 2 : score >= THRESHOLDS[2] ? 1 : 0;
  // losses: a share of the people, more when the odds are bad, scaled by days and by how readily the general accepts them; medics save some; armour stops some
  const r = 1 / Math.max(0.2, ratio);
  const risk = general ? general.risk : 0.5;
  const rate = clamp((0.03 + 0.06 * r) * (1 + 0.4 * (risk - 0.5)) * Math.sqrt(days / 14), 0.02, 0.45);
  const medics = people.filter((p) => p.role === 'medic').length;
  const deadShare = rate * 0.35 * (1 - Math.min(0.4, 0.08 * medics));
  const woundShare = rate * 0.65;
  const dead = []; const wounded = [];
  let eDead = 0; let eWounded = 0;
  for (const p of people) {
    const protect = ARMOUR[p.armour || 1]?.protection ?? 1;
    const pd = clamp(deadShare / protect, 0, 0.9); const pw = clamp(woundShare / Math.sqrt(protect), 0, 0.9);
    if (expected) { eDead += pd; eWounded += (1 - pd) * pw; continue; }
    const u = unit(`${input.key}|p|${p.id}`);
    if (u < pd) dead.push(p.id);
    else if (u < pd + (1 - pd) * pw) wounded.push({ id: p.id, wounds: 1 + Math.floor(unit(`${input.key}|w|${p.id}`) * 4) });
  }
  const vShare = clamp(0.04 + 0.12 * r, 0.03, 0.5);
  const lost = []; let eLost = 0;
  for (const v of vehicles) {
    const pl = clamp(vShare * (VEHICLE_LOSS[v.cls] ?? 0.5), 0, 0.9);
    if (expected) { eLost += pl; continue; }
    if (unit(`${input.key}|v|${v.id}`) < pl) lost.push(v.id);
  }
  const used = { fuel: Math.min(P.sup.fuelNeed, input.supplies?.fuel ?? 0), rockets: Math.min(P.sup.rocketNeed, input.supplies?.rockets ?? 0) };
  return { ratio, score, luck, objectives, outcome: OUTCOMES[objectives], dead, wounded, lost, used,
    expected: expected ? { dead: eDead, wounded: eWounded, lost: eLost } : null,
    parts: { ours: P.our, theirs: P.theirs, troops: P.troops, armour: P.armour, terrain: P.terrainMult, general: P.generalMult, fuelShort: P.sup.fuelShort, rocketShort: P.sup.rocketShort, lossRate: rate } };
}

/** What the screen shows before you commit: the same function with no luck, and the chance of each result given the uncertainty. */
export function estimate(input) {
  const r = resolve(input, { expected: true });
  const sd = ENGAGE.luckSd;
  const base = Math.log(Math.max(0.01, r.ratio));
  const p = THRESHOLDS.map((t) => 1 - cdf((t - base) / sd)); // chance of at least 3, 2, 1 objectives
  return { ...r, chance: { atLeast: { 3: p[0], 2: p[1], 1: p[2] }, lose: 1 - p[2] }, words: p[2] > 0.85 ? 'likely win' : p[2] > 0.55 ? 'likely hold, with losses' : p[2] > 0.3 ? 'a coin toss' : 'likely loss' };
}
