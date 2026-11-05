// Shared setup for the war update's tests (v0.99.0): a game with a registered, licensed, funded company that owns Hollowmoor Lot and has built what the test asks for.
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { FACILITIES } from '../src/content/facilities.js';

export const days = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.war.dailyTick(); } };
export const topUp = (g, n) => { g.player.money += n; assert.ok(g.war.fund(n).ok); };

/** A company with the licence and the lot, `cash` in its account. */
export function warGame(seed, { cash = 6_000_000 } = {}) {
  const g = newGame(seed);
  g.player.money = 100_000_000;
  assert.ok(g.war.found('Ironclad Company').ok);
  topUp(g, cash);
  assert.ok(g.war.buyLicence().ok); assert.ok(g.war.buyLot().ok);
  return g;
}

/** Build these facilities (their stages must be open: build stage by stage) and let Mason's Os finish. */
export function build(g, ids) {
  for (const id of ids) { if (g.war.cash() < FACILITIES[id].cost) topUp(g, FACILITIES[id].cost); assert.ok(g.war.commission(id).ok, id); }
  days(g, 60);
}
export const STAGE1 = ['site_office', 'bunkhouse', 'range', 'cage'];
export const STAGE2 = ['command', 'barracks_a', 'barracks_b', 'mess', 'medical', 'motor_pool', 'armoury', 'depot'];
export const STAGE3 = ['tank_factory', 'helicopter_works', 'hangars', 'barracks_c', 'hospital', 'training', 'depot_b'];
export function buildAll(g, upTo = 3) { build(g, STAGE1); if (upTo >= 2) build(g, STAGE2); if (upTo >= 3) build(g, STAGE3); }

/** Own a works and put goods in its export cage. */
export function cageGoods(g, works, items) {
  g.setFlag(g.arms.def(works).flag, true);
  const cage = g.world.containers[g.arms.def(works).outCrate];
  for (const [id, n] of Object.entries(items)) cage.items[id] = (cage.items[id] || 0) + n;
  return cage;
}
/** A military aircraft in Aerospace's storage. */
export function storeJet(g, pid = 'af_kestrel') {
  const A = g.aero;
  const rec = { id: A.nextId('S'), product: pid, line: 'aircraft', cost: { materials: 1000, freight: 0, freightInt: 0 }, quality: 70, day: A.day, config: null };
  A.state.storage.push(rec);
  return rec;
}

/** A strategic missile product in Aerospace's storage. */
export function storeMissile(g, pid = 'ms_sentinel') {
  const A = g.aero;
  const rec = { id: A.nextId('S'), product: pid, line: 'missile', cost: { materials: 1000, freight: 0, freightInt: 0 }, quality: 70, day: A.day, config: null };
  A.state.storage.push(rec);
  return rec;
}

/**
 * A company at war strength (v0.101.0): stages 1 to 3 built, an officer, twelve riflemen, two medics and an anti-tank soldier equipped and in two squads (A has the tank and the medics),
 * a general, and an engagement made to order (hold, rural, six days) that the two squads together meet. Returns { g, C, a, b, eng, squads, general }.
 */
export function armedCompany(seed, { engagement = {}, rocket = 0 } = {}) {
  const g = warGame(seed, { cash: 20_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 40); g.war.buySupply('rations', 2000); g.war.buySupply('fuel', 40); g.war.buySupply('medicine', 20);
  cageGoods(g, 'aw1', { item_smg: 30, item_assault_rifle: 30, item_pistol: 10, item_rpg: 4, item_rpg_rocket: rocket });
  for (const [item, n] of [['item_smg', 30], ['item_assault_rifle', 30], ['item_pistol', 10], ['item_rpg', 4]]) g.war.transfer({ source: 'arms', works: 'aw1', item, qty: n });
  if (rocket) g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_rpg_rocket', qty: rocket });
  for (const role of ['officer', ...Array(12).fill('rifleman'), 'medic', 'medic', 'anti_tank']) assert.ok(g.war.hire(role).ok, role);
  days(g, 10);
  for (const role of ['rifleman', 'medic', 'officer', 'anti_tank']) { g.war.setTier(role, role === 'rifleman' ? 2 : 1); g.war.equipClass(role); }
  const a = g.war.squadCreate().id; const b = g.war.squadCreate().id;
  assert.ok(g.war.squadLeader(a, g.war.people().find((p) => p.role === 'officer').id).ok);
  let rifles = 0;
  for (const p of g.war.people().filter((x) => x.role !== 'officer')) assert.ok(g.war.squadAssign(p.role === 'anti_tank' || p.role === 'medic' ? a : (rifles++ < 6 ? a : b), p.id).ok);
  const C = g.war.state().company;
  C.equipment.push({ id: 'Ex1', kind: 'vehicle', type: 'anvil', name: 'Anvil Mk1 tank', source: 'works', origin: null, location: 'facility:motor_pool', status: 'stored', assignedTo: null, day: 1 });
  assert.ok(g.war.squadVehicle(a, 'Ex1').ok); assert.ok(g.war.hireGeneral('odalys').ok);
  const eng = { id: 'Nt1', kind: 'hold', title: 'Hold Test Crossing', text: 'x', client: 'The Ostmark Union', clientName: 'The Ostmark Union', place: 'Test Crossing', terrain: 'rural', biome: 'rural', recipe: 'fields', style: 'sund', goal: 'defence', days: 6, needs: { troops: 12, tanks: 1, helicopters: 0, medics: 2 }, enemy: { troops: 10, armour: 1, air: 0, skill: 1 }, pay: 90_000, state: 'open', offered: g.clock.day, expires: g.clock.day + 30, order: null, result: null, ...engagement };
  (C.engagements ||= []).push(eng);
  return { g, C, a, b, eng, squads: [a, b], general: g.war.generals().hired[0].id };
}
