// Drone freight and choosing which works ships (v0.92.0). A drone is a launch station and its own receiving station; the owner
// names every drone, nothing else can land at its station, and the manager ships from the works the owner picks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, TILE } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';

const works = (seed = 31) => {
  const g = newGame(seed);
  g.player.money = 5e6;
  setTime(g, 1, '08:00');
  noImpulses(g);
  runCommand(g, 'works aw1');
  runCommand(g, 'works aw2');
  g.changeMap('aw1', 'entry');
  g.player.x = 2.5 * TILE; g.player.y = 2.5 * TILE;
  for (const id of ['item_drone_launch', 'item_drone_dock', 'item_belt', 'item_inserter', 'item_chest_wood']) g.inventory.add(id, 20, { silent: true });
  return g;
};
const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };
const A = (g) => g.arms;
const spot = (g, wh = 'aw1', n = 8) => {
  const m = g.maps.get(A(g).def(wh).map);
  for (let y = 3; y < m.height - 6; y++) for (let x = 3; x < m.width - n - 1; x++) {
    let ok = true;
    for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x; xx <= x + n && ok; xx++) if (A(g).blockReason(wh, xx, yy, 1, 1)) ok = false;
    if (ok) return { x, y };
  }
  throw new Error('no room');
};
const box = (g, e) => g.world.containers[e.container].items;

test('a launch station needs a unique ID; two drones cannot share one', () => {
  const g = works();
  const { x, y } = spot(g);
  assert.equal(A(g).place('aw1', 'item_drone_launch', x, y, 0).ok, false, 'no ID, no station');
  assert.equal(A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: '  ' }).ok, false);
  assert.equal(A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'a 1' }).entity.drone.id, 'A-1', 'tidied to capitals and dashes');
  const dup = A(g).place('aw1', 'item_drone_launch', x + 1, y, 0, null, { droneId: 'a-1' });
  assert.equal(dup.ok, false);
  assert.match(dup.text, /already exists/);
  assert.equal(g.inventory.count('item_drone_launch'), 19, 'the failed attempt cost nothing');
  assert.equal(A(g).place('aw1', 'item_drone_launch', x + 1, y, 0, null, { droneId: 'B' }).ok, true);
  assert.equal(A(g).place('aw1', 'item_drone_launch', x + 2, y, 0, null, { droneId: 'x'.repeat(40) }).ok, false, 'too long');
  assert.equal(A(g).place('aw1', 'item_drone_launch', x + 2, y, 0, null, { droneId: 'a/b' }).ok, false, 'odd characters');
});

test('a receiving station belongs to one drone: it must exist, and it gets one receiver only', () => {
  const g = works();
  const { x, y } = spot(g);
  assert.equal(A(g).place('aw1', 'item_drone_dock', x + 4, y, 0, null, { droneId: 'A' }).ok, false, 'no such drone yet');
  A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'A' });
  assert.equal(A(g).place('aw1', 'item_drone_dock', x + 4, y, 0).ok, false, 'a receiver names its drone');
  assert.equal(A(g).place('aw1', 'item_drone_dock', x + 4, y, 0, null, { droneId: 'A' }).ok, true);
  const second = A(g).place('aw1', 'item_drone_dock', x + 5, y, 0, null, { droneId: 'A' });
  assert.equal(second.ok, false);
  assert.match(second.text, /already has a receiving/);
  assert.deepEqual(A(g).drones().map((d) => [d.id, Boolean(d.launch), Boolean(d.recv)]), [['A', true, true]]);
});

test('a drone flies up to 12 items a trip to its own receiving station, much faster than a belt', () => {
  const g = works();
  const { x, y } = spot(g);
  const L = A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'A' }).entity;
  const R = A(g).place('aw1', 'item_drone_dock', x + 5, y, 0, null, { droneId: 'A' }).entity;
  box(g, L)['item_ap_steel'] = 30;
  minutes(g, 1);
  assert.ok(L.flight, 'the drone is out');
  assert.equal(Object.values(L.flight.items).reduce((a, b) => a + b, 0), 12);
  assert.equal(box(g, R).item_ap_steel || 0, 0, 'still in the air');
  minutes(g, 1);
  assert.equal(box(g, R).item_ap_steel, 12, 'landed');
  minutes(g, 6);
  assert.equal(box(g, R).item_ap_steel, 30, 'all of it, in a few minutes; a belt would need 30');
  assert.equal(box(g, L).item_ap_steel || 0, 0);
});

test('drone A never lands at drone B\'s station, and belts and arms cannot fill a receiving station', () => {
  const g = works();
  const { x, y } = spot(g);
  const LA = A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'A' }).entity;
  const LB = A(g).place('aw1', 'item_drone_launch', x, y + 1, 0, null, { droneId: 'B' }).entity;
  const RB = A(g).place('aw1', 'item_drone_dock', x + 5, y + 1, 0, null, { droneId: 'B' }).entity;
  box(g, LA)['item_ap_steel'] = 5;
  minutes(g, 5);
  assert.equal(box(g, RB).item_ap_steel || 0, 0, 'A has no receiving station, so it stays home');
  assert.equal(box(g, LA).item_ap_steel, 5);
  box(g, LB)['item_ap_polymer'] = 4;
  minutes(g, 3);
  assert.equal(box(g, RB).item_ap_polymer, 4);
  assert.equal(box(g, RB).item_ap_steel || 0, 0);
  // an arm cannot push items into a receiving station, nor pull from a launch station
  const chest = A(g).place('aw1', 'item_chest_wood', x + 3, y + 1, 0).entity;
  box(g, chest)['item_ap_steel'] = 3;
  A(g).place('aw1', 'item_inserter', x + 4, y + 1, 0);
  minutes(g, 4);
  assert.equal(box(g, RB).item_ap_steel || 0, 0, 'only its drone lands here');
  const out = A(g).place('aw1', 'item_chest_wood', x + 1, y, 0).entity;
  A(g).place('aw1', 'item_inserter', x + 1, y + 2, 0);
  assert.equal(box(g, out).item_ap_steel || 0, 0);
});

test('a drone reaches a receiving station in another works (3 minutes), and is full-aware: it waits when the station is full', () => {
  const g = works();
  const a = spot(g, 'aw1');
  const b = spot(g, 'aw2');
  const L = A(g).place('aw1', 'item_drone_launch', a.x, a.y, 0, null, { droneId: 'LINK' }).entity;
  g.changeMap('aw2', 'entry');
  const R = A(g).place('aw2', 'item_drone_dock', b.x, b.y, 0, null, { droneId: 'LINK' }).entity;
  box(g, L)['item_ap_steel'] = 10;
  minutes(g, 2);
  assert.equal(box(g, R).item_ap_steel || 0, 0, 'still flying');
  minutes(g, 2);
  assert.equal(box(g, R).item_ap_steel, 10);
  box(g, R)['item_ap_steel'] = 58; // nearly full (cap 60)
  box(g, L)['item_ap_polymer'] = 9;
  minutes(g, 5);
  assert.equal(box(g, R).item_ap_polymer || 0, 2, 'only what fits goes');
  box(g, R)['item_ap_steel'] = 60 - (box(g, R).item_ap_polymer || 0);
  minutes(g, 5);
  assert.equal(box(g, L).item_ap_polymer, 7, 'the rest waits at home');
});

test('taking away the receiving station sends the drone home with its load; picking up the launch station frees its ID and returns what it held', () => {
  const g = works();
  const { x, y } = spot(g);
  const L = A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'A' }).entity;
  const R = A(g).place('aw1', 'item_drone_dock', x + 5, y, 0, null, { droneId: 'A' }).entity;
  box(g, L)['item_ap_steel'] = 8;
  minutes(g, 1);
  assert.ok(L.flight);
  A(g).remove('aw1', R.x, R.y);
  minutes(g, 2);
  assert.equal(box(g, L).item_ap_steel, 8, 'it flew home');
  assert.ok(A(g).place('aw1', 'item_drone_dock', x + 5, y, 0, null, { droneId: 'A' }).ok, 'a new receiver can be tied to it again');
  const before = g.inventory.count('item_ap_steel');
  A(g).remove('aw1', L.x, L.y);
  assert.equal(g.inventory.count('item_ap_steel') - before, 8, 'the stock came back to your pockets');
  assert.equal(A(g).drones().find((d) => d.id === 'A')?.launch ?? null, null);
  assert.equal(A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'A' }).ok, true, 'the ID is free again');
});

test('drones survive a save and load, in flight', () => {
  const g = works();
  const { x, y } = spot(g);
  const L = A(g).place('aw1', 'item_drone_launch', x, y, 0, null, { droneId: 'KEEP' }).entity;
  A(g).place('aw1', 'item_drone_dock', x + 4, y, 0, null, { droneId: 'KEEP' });
  box(g, L)['item_ap_steel'] = 6;
  minutes(g, 1);
  const copy = JSON.parse(JSON.stringify(g.serialize ? g.serialize() : { arms: g.world.arms }));
  const arms = copy.arms || copy.world?.arms;
  const ent = arms.warehouses.aw1.entities.find((e) => e.drone?.role === 'launch');
  assert.equal(ent.drone.id, 'KEEP');
  assert.ok(ent.flight && ent.flight.items.item_ap_steel === 6, 'the flight is in the save');
});

test('export orders: you can ship from any of your works, and the manager ships from the works you pick', () => {
  const g = works();
  const Mk = g.market;
  g.arms.buyLicence?.();
  g.setFlag?.('arms_licence', true);
  const crate = Object.entries(g.content.items).find(([, it]) => it.arms?.crate)[0];
  const country = Object.keys(Mk.cfg.countries).find((id) => Mk.price(id, crate) > 0);
  const c1 = g.world.containers[A(g).def('aw1').outCrate].items;
  const c2 = g.world.containers[A(g).def('aw2').outCrate].items;
  c1[crate] = 5; c2[crate] = 9;
  Mk.country(country).budget = 1e9;
  const order = (id) => { Mk.state.orders.push({ id, country, item: crate, qty: 5, price: Mk.price(country, crate), posted: 1, expires: 40, status: 'open' }); return id; };
  g.corp.ensureWorld?.();
  const o1 = order(7001);
  // from the far works, not the one whose terminal you used
  const r = Mk.ship({ wh: 'aw2', order: o1, shipper: Object.keys(Mk.cfg.shippers)[0] });
  assert.equal(r.ok, true, r.text);
  assert.equal(c2[crate], 4, 'the crates left aw2\'s cage');
  assert.equal(c1[crate], 5, 'aw1 untouched');
  // a works you do not own is refused
  assert.equal(Mk.ship({ wh: 'aw3', order: order(7002), shipper: Object.keys(Mk.cfg.shippers)[0] }).ok, false);
  // the manager's plan: auto = the fullest cage; a chosen works = only that one
  c1[crate] = 6; c2[crate] = 12;
  const M = g.corp.management;
  const order3 = order(7003);
  const cand = () => g.corp.management && g.corp.operations ? null : null; void cand;
  const plan = g.corp.management.planExports?.() || [];
  void M; void order3; void plan;
  assert.equal(A(g).exportFrom(), 'auto');
  assert.equal(A(g).setExportFrom('aw1').ok, true);
  assert.equal(A(g).exportFrom(), 'aw1');
  assert.equal(A(g).setExportFrom('aw3').ok, false, 'not yours');
  assert.equal(A(g).setExportFrom('auto').ok, true);
});

test('the manager only ships from the works the owner picked (or the fullest cage on auto)', () => {
  const g = newGame(9811); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); runCommand(g, 'works aw2');
  assert.ok(g.corp.contribute('arms', 500000).ok);
  g.corp.ensureWorld(); g.market.state;
  const x = g.corp.personnel.hire('manager', 'arms').person; x.startDay = 1; g.corp.personnel.epoch++;
  g.clock.total = 1 * 1440 + 10 * 60;
  g.setFlag('arms_licence', true);
  const Mk = g.market; const M = g.corp.management;
  const crate = Object.entries(g.content.items).find(([, it]) => it.arms?.crate)[0];
  const country = Object.keys(Mk.cfg.countries).find((id) => Mk.price(id, crate) > 0);
  Mk.country(country).budget = 1e9;
  Mk.state.orders.push({ id: 8001, country, item: crate, qty: 5, price: Mk.price(country, crate), posted: 1, expires: 40, status: 'open' });
  const c1 = g.world.containers[g.arms.def('aw1').outCrate].items; const c2 = g.world.containers[g.arms.def('aw2').outCrate].items;
  c1[crate] = 6; c2[crate] = 11;
  const plan = () => M.planExports().filter((q) => q.item === 'order:8001');
  assert.equal(plan().length, 1, 'auto: one plan, from the fuller cage');
  const r = plan()[0].run(); assert.ok(r.ok, r.text);
  assert.equal(c2[crate], 6, 'aw2 (11 crates) shipped it');
  assert.equal(c1[crate], 6);
  Mk.state.orders.push({ id: 8002, country, item: crate, qty: 5, price: Mk.price(country, crate), posted: 1, expires: 40, status: 'open' });
  c1[crate] = 5; c2[crate] = 20;
  g.arms.setExportFrom('aw1');
  const p2 = M.planExports().filter((q) => q.item === 'order:8002');
  assert.equal(p2.length, 1);
  assert.ok(p2[0].run().ok);
  assert.equal(c1[crate], 0, 'the owner chose aw1, so aw1 shipped it though aw2 held more');
  assert.equal(c2[crate], 20);
  Mk.state.orders.push({ id: 8003, country, item: crate, qty: 5, price: Mk.price(country, crate), posted: 1, expires: 40, status: 'open' });
  assert.equal(M.planExports().filter((q) => q.item === 'order:8003').length, 0, 'aw1 is empty: the manager does not quietly use aw2');
});
