// The company's facilities (v0.98.0): what Mason's Os can build on Hollowmoor Lot, in three stages (mock-up `proposal-war-merc-hq.png`: a security firm, a small army, a
// military company). Pure data. A facility has a FUNCTION, not just a label: capacity is a real field (beds, meals, treatment places, stores, lines, hangar bays), so a base that
// is too small loses morale and readiness later; it does not magically hold more. Nothing here produces anything yet: factories and the base's daily life come in later releases.
//
//   slot      a fixed place on the lot (x, y, w, h in tiles, final coordinates of src/content/maps/hollowmoor.js); one facility per slot
//   stage     1 | 2 | 3: when it is offered (a stage opens when every facility of the stage before has been built)
//   core      protected by the damage gate before a coup (src/war/protection.js): the heart of the base
//   days      Mason's Os's work: days in each of foundation, frame and fitting-out (the permit waits one day, once the company is licensed)
//   hp        hit points at the damage gate
//   capacity  what it gives the base
const F = (id, name, stage, slot, kind, cost, days, hp, capacity, o = {}) => ({ id, name, stage, slot, kind, cost, days, hp, capacity, core: o.core ?? true, text: o.text, trade: o.trade || 'office', sign: o.sign || name.toUpperCase(), roof: o.roof, wall: o.wall });

export const LOT = {
  id: 'hollowmoor',
  name: 'Hollowmoor Lot',
  price: 60000,        // the lot, from the Land Registry (paid once, with the company's licence)
  licence: 5000,       // the Civic Office's licence for a private security company (the company's founding fee)
  map: 'hollowmoor_lot',
  fenceHp: 300, gateHp: 200,
};

export const FACILITIES = {
  // ---- stage 1: a security firm
  site_office: F('site_office', 'Site office', 1, 'office', 'office', 20000, [1, 2, 1], 120, { desks: 3 }, { text: 'The company\'s front door: a counter, three desks and a radio. Where contracts are signed.', sign: 'SITE OFFICE' }),
  bunkhouse: F('bunkhouse', 'Bunkhouse', 1, 'bunk', 'barracks', 35000, [1, 3, 2], 140, { beds: 12 }, { text: 'Twelve bunks, a stove and a lot of boots.', trade: 'house', sign: 'BUNKHOUSE' }),
  range: F('range', 'Shooting range', 1, 'range', 'range', 25000, [1, 2, 1], 90, { training: 6 }, { core: false, text: 'A firing line, a berm and a sign about hearing protection.', trade: 'storage', sign: 'RANGE' }),
  cage: F('cage', 'Armoury cage', 1, 'cage', 'armoury', 15000, [1, 1, 1], 100, { stores: 60, racks: 24 }, { text: 'A cage with a lock, a ledger and a person who counts.', trade: 'storage', sign: 'ARMOURY' }),
  // ---- stage 2: a small army
  command: F('command', 'Command HQ & briefing room', 2, 'command', 'command', 90000, [2, 4, 3], 200, { desks: 10, briefing: 24 }, { text: 'Maps, a table for planning and a coffee machine that has seen things.', sign: 'COMMAND HQ' }),
  barracks_a: F('barracks_a', 'Barracks A', 2, 'barracks_a', 'barracks', 70000, [2, 4, 3], 170, { beds: 30 }, { trade: 'house', text: 'Thirty beds in a long hall. Lights out is at ten and nobody keeps it.', sign: 'BARRACKS A' }),
  barracks_b: F('barracks_b', 'Barracks B', 2, 'barracks_b', 'barracks', 70000, [2, 4, 3], 170, { beds: 30 }, { trade: 'house', text: 'Thirty more beds, a little further from the kitchen.', sign: 'BARRACKS B' }),
  mess: F('mess', 'Mess hall', 2, 'mess', 'mess', 60000, [2, 3, 2], 150, { meals: 90 }, { trade: 'diner', text: 'Long tables, a hatch and a rota that is a source of grievance.', sign: 'MESS HALL' }),
  medical: F('medical', 'Medical centre', 2, 'medical', 'medical', 80000, [2, 4, 3], 160, { treat: 8 }, { trade: 'office', text: 'Eight beds, a locked cabinet and a medic who has opinions about boots.', sign: 'MEDICAL' }),
  motor_pool: F('motor_pool', 'Motor pool & tank workshop', 2, 'motor', 'motor_pool', 120000, [2, 5, 3], 190, { bays: 6, repair: 6 }, { trade: 'storage', text: 'Six bays, a pit and the smell of diesel that never leaves a coat.', sign: 'MOTOR POOL' }),
  armoury: F('armoury', 'Armoury', 2, 'armoury', 'armoury', 60000, [2, 3, 2], 160, { stores: 400, racks: 120 }, { trade: 'storage', text: 'Racks, crates and a steel door with two keys, held by two different people.', sign: 'ARMOURY' }),
  depot: F('depot', 'Supply depot', 2, 'depot', 'depot', 50000, [2, 3, 2], 140, { stores: 800 }, { trade: 'storage', text: 'Rations, fuel, parts and the paperwork to match.', sign: 'DEPOT' }),
  // ---- stage 3: a military company
  tank_factory: F('tank_factory', 'Tank factory', 3, 'factory', 'tank_factory', 900000, [4, 9, 6], 320, { lines: 2 }, { trade: 'storage', text: 'Two lines for tanks and only tanks. Planes, missiles, guns and ships come from your other companies.', sign: 'TANK FACTORY', roof: '#5a5e68', wall: '#8a909c' }),
  helicopter_works: F('helicopter_works', 'Helicopter works', 3, 'works', 'helicopter_works', 1100000, [4, 9, 6], 300, { lines: 2 }, { trade: 'storage', text: 'Two lines for helicopters and only helicopters.', sign: 'HELICOPTER WORKS', roof: '#4a5a68', wall: '#7a8a9a' }),
  hangars: F('hangars', 'Aircraft hangars', 3, 'hangars', 'hangar', 400000, [3, 7, 5], 260, { bays: 6 }, { trade: 'storage', text: 'Six bays for aircraft transferred from Aerospace.', sign: 'HANGARS' }),
  barracks_c: F('barracks_c', 'Barracks C', 3, 'barracks_c', 'barracks', 90000, [2, 4, 3], 170, { beds: 40 }, { trade: 'house', text: 'Forty beds. The company is growing.', sign: 'BARRACKS C' }),
  hospital: F('hospital', 'Hospital', 3, 'hospital', 'medical', 220000, [3, 6, 4], 200, { treat: 30, surgery: 2 }, { trade: 'office', text: 'Thirty beds and two theatres. It would rather not be busy.', sign: 'HOSPITAL' }),
  training: F('training', 'Training ground', 3, 'training', 'range', 150000, [2, 4, 3], 120, { training: 40 }, { core: false, trade: 'storage', text: 'An obstacle course, a mock village and a lot of mud.', sign: 'TRAINING GROUND' }),
  depot_b: F('depot_b', 'Supply depot (large)', 3, 'depot_b', 'depot', 120000, [2, 4, 3], 160, { stores: 2400 }, { trade: 'storage', text: 'A second, larger depot beside the first.', sign: 'DEPOT B' }),
};

export const FACILITY_STATES = ['permit', 'foundation', 'frame', 'fitted', 'built'];
export const stageOf = (id) => FACILITIES[id].stage;
export const facilityBySlot = (slot) => Object.values(FACILITIES).find((f) => f.slot === slot) || null;
