// The company's works (v0.99.0 stage 5): pure data. The company builds TANKS and HELICOPTERS and nothing else: the catalog below is the whole of it, and a test looks for anything more.
// A model's price in src/content/procurement.js is the whole cost of one: the parts (bought, in the stores) plus the works' fee (paid when the unit is started).
//
//   WORKS      the two buildings that make things, and what a shift of crew is
//   MODELS     what each model needs and how long a line takes at one shift
//   UPGRADE / WEAR   the works' own condition and the money to improve it
import { VEHICLES, SUPPLIES } from './procurement.js';

export const WORKS = {
  tank_factory: { name: 'Tank factory', makes: 'tank', crewPerShift: 6, maxShifts: 3 },
  helicopter_works: { name: 'Helicopter works', makes: 'helicopter', crewPerShift: 5, maxShifts: 3 },
};

const M = (id, days, parts) => ({ id, days, parts });
export const MODELS = Object.fromEntries([
  M('lancer', 3, { plate: 8, engine: 1, optics: 1 }),
  M('anvil', 4, { plate: 12, engine: 1, optics: 1 }),
  M('hound', 5, { plate: 9, engine: 1, optics: 2 }),
  M('breacher', 5, { plate: 18, engine: 1, optics: 1 }),
  M('cinder', 6, { plate: 16, engine: 1, optics: 1, hardpoint: 1 }),
  M('bulwark', 7, { plate: 22, engine: 1, optics: 2 }),
  M('wren', 4, { plate: 2, engine: 1, rotor: 1, avionics: 1 }),
  M('drover', 5, { plate: 4, engine: 2, rotor: 1, avionics: 1 }),
  M('mercy', 5, { plate: 4, engine: 2, rotor: 1, avionics: 1 }),
  M('viper', 7, { plate: 6, engine: 2, rotor: 1, avionics: 2, hardpoint: 2 }),
  M('ox', 7, { plate: 4, engine: 2, rotor: 2, avionics: 1 }),
  M('talon', 8, { plate: 8, engine: 2, rotor: 1, avionics: 2, hardpoint: 3 }),
].map((m) => [m.id, m]));

export const partsValue = (id) => Object.entries(MODELS[id].parts).reduce((a, [k, n]) => a + SUPPLIES[k].price * n, 0);
/** The works' fee for one unit: the model's whole cost less its parts. */
export const feeOf = (id) => VEHICLES[id].price - partsValue(id);
export const worksOf = (id) => (VEHICLES[id].class === 'tank' ? 'tank_factory' : 'helicopter_works');

/** A works can be improved twice (each level builds 15% faster) and wears with use: slower when worn, and mending costs by the point of wear. */
export const UPGRADE = { max: 2, cost: [150000, 300000], boost: 0.15 };
export const WEAR = { perLine: 2, slow: 30, bad: 60, slowMult: 0.8, badMult: 0.5, fixPerPoint: 1500 };

/** The people the company employs (v0.99.0: a recruit is a record with a wage and a bed; v0.100.0 adds roles, training and squads). Wages are obols a day. */
export const PEOPLE = { guard: { name: 'Guard', wage: 120, text: 'Stands a post and watches a door.' }, technician: { name: 'Technician', wage: 160, text: 'Works a line at the tank factory or the helicopter works.' } };
