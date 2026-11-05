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
