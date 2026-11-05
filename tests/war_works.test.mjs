// Manufacturing (v0.99.0 stage 5): the tank factory and the helicopter works. Tanks and helicopters only; lines, shifts, crew, parts, cash and bays; blocked orders say why; the works wear and can be improved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, days, topUp } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { VEHICLES, SUPPLIES } from '../src/content/procurement.js';
import { MODELS, feeOf, partsValue, WORKS } from '../src/content/production.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** A company with all three stages built, parts for `n` of a model in the stores, and `crew` technicians. */
function works(seed, { crew = 12, cash = 40_000_000 } = {}) {
  const g = warGame(seed, { cash }); buildAll(g, 3);
  for (let i = 0; i < crew; i++) assert.ok(g.war.hire('technician').ok);
  return g;
}
const stockUp = (g, model, n) => { for (const [k, q] of Object.entries(MODELS[model].parts)) assert.ok(g.war.buySupply(k, q * n).ok, k); };
const units = (g, type) => g.war.equipment().filter((e) => e.type === type).length;

test('the catalogue is tanks and helicopters and nothing else: nothing here can build a plane, a missile, a gun or a ship, and each unit\'s parts and fee add up to its price', () => {
  for (const [id, m] of Object.entries(MODELS)) {
    const V = VEHICLES[id];
    assert.ok(V.source === 'works' && ['tank', 'helicopter'].includes(V.class), `${id} is a tank or a helicopter`);
    assert.ok(feeOf(id) > 0 && feeOf(id) + partsValue(id) === V.price, `${id}: the parts and the fee are the price`);
    assert.ok(V.price >= 210_000 && V.price <= 2_600_000, `${id} sits on the Aerospace ladder (210,000 to 2,600,000)`);
    for (const k of Object.keys(m.parts)) assert.ok(SUPPLIES[k]?.group === 'part', `${id} needs ${k}, a bought part`);
  }
  assert.deepEqual(Object.values(WORKS).map((w) => w.makes).sort(), ['helicopter', 'tank']);
  const g = works(401, { crew: 0 });
  for (const bad of ['af_kestrel', 'ms_sentinel', 'item_assault_rifle', 'marten', 'galleon', 'wolf']) { const r = g.war.order(bad, 1); assert.ok(!r.ok, bad); }
  assert.ok(g.war.order('anvil', 1).ok); assert.ok(g.war.order('wren', 1).ok);
  assert.ok(!g.war.order('anvil', 0).ok && !g.war.order('anvil', 21).ok);
  assert.ok(!warGame(402).war.order('anvil', 1).ok, 'no factory, no tanks');
});

test('a unit is built from bought parts and the works\' fee, all from the company\'s own money: the stores and the account fall by exactly that, the wallet does not move, and it rolls out in the model\'s days', () => {
  const g = works(403); stockUp(g, 'anvil', 1);
  const w0 = g.player.money; const c0 = g.war.cash(); const s0 = { ...g.war.stock() };
  assert.ok(g.war.order('anvil', 1).ok);
  days(g, 1);
  assert.equal(g.war.cash(), c0 - feeOf('anvil') - 12 * 160 /* the day's wages for 12 technicians */, 'the fee, and the day\'s wages');
  for (const [k, q] of Object.entries(MODELS.anvil.parts)) assert.equal(g.war.stock()[`supply:${k}`] || 0, (s0[`supply:${k}`] || 0) - q, `${k} consumed`);
  assert.equal(units(g, 'anvil'), 0);
  days(g, 3); assert.equal(units(g, 'anvil'), 1, 'four days at one shift');
  assert.equal(g.player.money, w0, 'never your wallet');
  const x = g.war.equipment().find((e) => e.type === 'anvil');
  assert.deepEqual([x.source, x.location, x.status, x.kind], ['works', 'facility:motor_pool', 'stored', 'vehicle']);
  assert.deepEqual(g.war.check(), []); assert.ok(g.corp.reconciles());
  assert.equal(g.war.production().orders.length, 0);
});

test('shifts scale output: three shifts finish a unit in about a third of the days, and need three times the crew', () => {
  const a = works(404, { crew: 6 }); stockUp(a, 'anvil', 1); a.war.order('anvil', 1);
  const b = works(405, { crew: 18 }); stockUp(b, 'anvil', 1); b.war.order('anvil', 1); assert.ok(b.war.shifts('T1', 3).ok);
  let da = 0; let db = 0;
  for (let i = 1; i <= 12; i++) { days(a, 1); days(b, 1); if (!da && units(a, 'anvil')) da = i; if (!db && units(b, 'anvil')) db = i; }
  assert.equal(da, 4); assert.equal(db, 2);
  assert.ok(!a.war.shifts('T1', 4).ok && !a.war.shifts('T1', 0).ok);
  // not enough crew for three shifts: the line says so and does nothing
  const c = works(406, { crew: 6 }); stockUp(c, 'anvil', 2); c.war.order('anvil', 2); c.war.shifts('T1', 3); days(c, 3);
  const L = c.war.production().lines.find((l) => l.id === 'T1'); assert.match(L.blocked, /needs 18 technicians \(6 free\)/); assert.equal(units(c, 'anvil'), 0, 'the other line, with its one shift, is still building');
});

test('a blocked order says why, and starts the day the reason is gone: parts, crew, cash and a free bay', () => {
  const g = works(407, { crew: 0 }); g.war.order('anvil', 1);
  days(g, 1); const why = () => g.war.production().lines.find((l) => l.id === 'T1').blocked;
  assert.match(why(), /waiting for parts: 12 armour plate/);
  stockUp(g, 'anvil', 1); days(g, 1); assert.match(why(), /needs 6 technicians \(0 free\)/);
  for (let i = 0; i < 6; i++) g.war.hire('technician');
  const keep = g.war.cash(); // cash: pay in less than the fee is held
  g.corp.account('security').cash = 1000; days(g, 1); assert.match(why(), /cannot pay the works' fee/);
  g.corp.account('security').cash = keep; days(g, 1); assert.equal(why(), null, 'it starts');
  // a full motor pool holds the finished unit on the line
  for (let i = 0; i < 6; i++) assert.ok(g.war.buyVehicle('buggy').ok);
  days(g, 5); assert.equal(units(g, 'anvil'), 0); assert.match(why(), /finished, but no free bay in the motor pool/);
  assert.ok(g.war.production().lines.find((l) => l.id === 'T1').progress >= 1);
  assert.deepEqual(g.war.check(), []);
});

test('lines come from the works\' capacity: two when whole, one when damaged (the unit in progress waits), none for a ruin; repair brings them back', () => {
  const g = works(408, { crew: 12 }); stockUp(g, 'anvil', 2); g.war.order('anvil', 2);
  days(g, 1); const L = (id) => g.war.production().lines.find((l) => l.id === id);
  assert.ok(L('T1').model && L('T2').model, 'both lines are building');
  g.war.setCoup('staged', 'a test: the base is only vulnerable after a coup');
  const hp = g.war.structures().find((s) => s.id === 'fac_tank_factory'); g.war.hit('fac_tank_factory', Math.ceil(hp.hpMax * 0.4), 'bombing');
  assert.equal(g.war.capacity('tank_factory').lines, 1);
  days(g, 1); assert.match(L('T2').blocked, /damaged/); const p = L('T2').progress; days(g, 1); assert.equal(L('T2').progress, p, 'it waits');
  assert.ok(g.war.repairFacility('tank_factory').ok); assert.equal(g.war.capacity('tank_factory').lines, 2);
  days(g, 1); assert.ok(L('T2').progress > p, 'it carries on');
  g.war.hit('fac_tank_factory', 9999, 'bombing'); assert.equal(g.war.capacity('tank_factory').lines, 0);
  days(g, 1); assert.match(L('T1').blocked, /ruin/);
});

test('the works wear with use and slow down; maintenance mends them; an upgrade builds faster; the company pays for both', () => {
  const g = works(409, { crew: 12 }); const C = g.war.state().company;
  stockUp(g, 'lancer', 2); g.war.order('lancer', 2); days(g, 1);
  const wear = () => g.war.production().works.find((w) => w.id === 'tank_factory').wear;
  assert.ok(wear() > 0); const c0 = g.war.cash();
  C.works.tank_factory.wear = 70; assert.equal(g.war.production().works[0].eff, 0.5, 'a worn works builds at half speed');
  const cost = g.war.production().works[0].maintain; assert.equal(cost, 70 * 1500);
  assert.ok(g.war.maintain('tank_factory').ok); assert.equal(wear(), 0); assert.equal(g.war.cash(), c0 - cost); assert.ok(!g.war.maintain('tank_factory').ok, 'in good order');
  assert.ok(g.war.upgrade('tank_factory').ok); assert.ok(g.war.upgrade('tank_factory').ok); assert.ok(!g.war.upgrade('tank_factory').ok);
  assert.equal(Math.round(g.war.production().works[0].eff * 100), 130);
});

test('wages are paid every day from the company\'s own account, and what it cannot pay is owed, never taken from you; dismissing works only for someone on no post', () => {
  const g = works(410, { crew: 2 }); const w0 = g.player.money;
  const pay0 = g.war.cash(); days(g, 1); assert.equal(g.war.cash(), pay0 - 2 * 160);
  days(g, 1); days(g, 1); assert.equal(g.war.cash(), pay0 - 6 * 160);
  g.corp.account('security').cash = 100; days(g, 1);
  assert.equal(g.player.money, w0); assert.ok(g.corp.account('security').arrears > 0, 'owed, not borrowed from you');
  const tech = g.war.people().find((p) => p.role === 'technician'); tech.post = 'line:T1';
  assert.ok(!g.war.dismiss(tech.id).ok); tech.post = null; assert.ok(g.war.dismiss(tech.id).ok);
  // beds are real: a bunkhouse of 12 holds twelve, the barracks more
  const h = warGame(411); assert.ok(!h.war.hire('guard').ok, 'no bunkhouse, nowhere to sleep');
});

test('a save in the middle of a build carries on from where it was, and running the same day twice changes nothing', () => {
  const g = works(412); stockUp(g, 'bulwark', 1); g.war.order('bulwark', 1); days(g, 3);
  const mid = g.war.production().lines.find((l) => l.id === 'T1').progress; assert.ok(mid > 0.3 && mid < 1);
  const g2 = roundtrip(g); assert.equal(g2.war.production().lines.find((l) => l.id === 'T1').progress, mid);
  const snap = JSON.stringify(g2.world.military); g2.war.dailyTick(); assert.equal(JSON.stringify(g2.world.military), snap, 'the same day again: no change');
  days(g2, 5); assert.equal(units(g2, 'bulwark'), 1);
});
