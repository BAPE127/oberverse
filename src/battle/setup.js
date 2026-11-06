// A battle's setup (v0.101.0): everything a battle needs, as plain data, made once when an engagement is taken to the field and kept with it. The battle is a pure function of this, the
// order log and the tick, so nothing that happens to the company's records afterwards (a day's wages, a morale drift) can change it, and a reload replays it.
//   buildSetup({ key, eng, people, vehicles, ai })
import { UNITS, SPEED, STYLES, MAP_VER, RULES, VIPS } from '../content/battle.js';
import { CLASSES, ARMOUR } from '../content/troops.js';
import { unit, pick } from './hash.js';

const KIND = { tank: 'tank', helicopter: 'helicopter', carrier: 'carrier' };
const VWEAPON = { tank: 'tank_gun', helicopter: 'heli_gun', carrier: 'vehicle_mg', recon: 'vehicle_mg', artillery: 'tank_gun', antiair: 'aa_gun' }; // (rules 3: anti-air fires at aircraft; under rules 1 and 2 it was a machine gun, and a saved setup keeps its own weapon string)

/** `eng`: { id, goal, enemy:{troops,armour,air,skill}, recipe, biome, style }. `people`: [{id,name,role,tier,armour,exp,morale,fatigue,armed}]. `vehicles`: [{id,name,cls,armour,firepower,speed}]. */
export function buildSetup({ key, eng, people, vehicles, support = null, ai = {}, reserve = [] }) {
  const units = [];
  for (const p of people) {
    const tiers = CLASSES[p.role]?.tiers || {};
    const weapon = p.armed ? (tiers[p.tier] || tiers[1] || 'item_pistol') : 'none';
    units.push({ id: p.id, side: 'p', kind: 'inf', role: p.role, name: p.name, rec: { t: 'person', id: p.id }, weapon, hp: UNITS.infantry.hp, accMult: 1 + 0.02 * Math.min(10, p.exp || 0), prot: ARMOUR[p.armour || 1]?.protection || 1, morale: p.morale ?? 70, fatigue: p.fatigue || 0, sight: UNITS.infantry.sight, speed: SPEED.infantry });
  }
  for (const v of vehicles) {
    const kind = KIND[v.cls] || 'other'; const T = UNITS[kind === 'helicopter' ? 'helicopter' : kind] || UNITS.other;
    units.push({ id: v.id, side: 'p', kind, role: v.cls, vtype: v.type || null, name: v.name, rec: { t: 'vehicle', id: v.id }, weapon: VWEAPON[v.cls] || 'none', hp: T.hp + T.perArmour * v.armour, accMult: 0.9 + 0.05 * v.firepower, armourBar: v.armour, morale: 80, sight: T.sight, speed: kind === 'helicopter' ? SPEED.helicopter : SPEED.vehicleBase + SPEED.vehiclePerBar * v.speed });
  }
  // the enemy: made from what the engagement says is against you (a count, a skill), nothing else
  const E = eng.enemy; const skill = E.skill ?? 1;
  for (let i = 0; i < Math.min(60, E.troops); i++) {
    const u = unit(`${key}|enemy|role|${i}`);
    const role = u < 0.55 ? 'rifleman' : u < 0.7 ? 'machine_gunner' : u < 0.8 ? 'anti_tank' : u < 0.86 ? 'marksman' : u < 0.91 ? 'medic' : u < 0.96 ? 'officer' : 'recon';
    const weapon = role === 'rifleman' || role === 'recon' ? (skill >= 0.95 ? 'item_assault_rifle' : 'item_smg') : role === 'machine_gunner' ? 'item_lmg' : role === 'anti_tank' ? 'item_rpg' : role === 'marksman' ? 'item_sniper_rifle' : 'item_pistol';
    units.push({ id: `e${i}`, side: 'e', kind: 'inf', role, name: `Enemy ${i + 1}`, rec: null, weapon, hp: UNITS.infantry.hp, accMult: skill, prot: 1, morale: 65 + Math.floor(unit(`${key}|enemy|m|${i}`) * 25), sight: UNITS.infantry.sight, speed: SPEED.infantry });
  }
  for (let i = 0; i < Math.round(E.armour); i++) units.push({ id: `et${i}`, side: 'e', kind: 'tank', role: 'tank', name: 'Enemy tank', rec: null, weapon: 'tank_gun', hp: UNITS.tank.hp + UNITS.tank.perArmour * 3, accMult: skill, armourBar: 3, morale: 80, sight: UNITS.tank.sight, speed: SPEED.vehicleBase + SPEED.vehiclePerBar * 3 });
  for (let i = 0; i < Math.round(E.aa || 0); i++) units.push({ id: `ea${i}`, side: 'e', kind: 'other', role: 'antiair', name: 'Enemy anti-air gun', rec: null, weapon: 'aa_gun', hp: UNITS.other.hp + UNITS.other.perArmour * 2, accMult: skill, armourBar: 2, morale: 80, sight: UNITS.other.sight, speed: SPEED.vehicleBase });
  for (let i = 0; i < Math.round(E.battery || 0); i++) units.push({ id: `eb${i}`, side: 'e', kind: 'other', role: 'artillery', vtype: 'battery', battery: true, name: 'Enemy battery', rec: null, weapon: 'none', hp: UNITS.other.hp + UNITS.other.perArmour * 2, accMult: skill, armourBar: 2, morale: 90, sight: UNITS.other.sight, speed: 0 });
  for (let i = 0; i < Math.round(E.air); i++) units.push({ id: `eh${i}`, side: 'e', kind: 'helicopter', role: 'helicopter', name: 'Enemy helicopter', rec: null, weapon: 'heli_gun', hp: UNITS.helicopter.hp + UNITS.helicopter.perArmour * 2, accMult: skill, armourBar: 2, morale: 80, sight: UNITS.helicopter.sight, speed: SPEED.helicopter });
  const held = new Set(reserve); if (held.size) for (const u of units) if (u.side === 'p' && held.has(u.id)) u.reserve = true;
  if (eng.goal === 'extract' || eng.goal === 'rescue') { const V = VIPS[eng.goal === 'extract' ? 'officer' : 'pilot']; units.push({ id: 'vip', side: 'p', kind: 'inf', role: 'officer', vip: eng.goal === 'extract' ? 'officer' : 'pilot', name: V.name, rec: null, weapon: V.weapon, hp: Math.round(UNITS.infantry.hp * V.hp), accMult: 0.8, prot: 1, morale: 60, sight: UNITS.infantry.sight, speed: SPEED.infantry * V.speed }); }
  return { key, map: { recipe: eng.recipe || 'fields', biome: eng.biome || 'rural', style: eng.style || 'sund', seed: key, ver: MAP_VER }, goal: eng.goal, intel: eng.intel, rules: RULES, units, support: support || { items: {}, air: [] }, ai: { p: Boolean(ai.p), e: ai.e !== false } };
}
export { STYLES, pick };
