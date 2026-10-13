// Calculator production (v0.12.0): warehouses at the docks, Sal's parts and
// deliveries, hand-crafting, and the grid factory (machines, belts, inserter
// arms, power) — running on game time, on or off the map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { check } from '../src/sim/conditions.js';
import { runCommand } from '../src/game/debugCommands.js';
import { CALC_TYPES } from '../src/systems/calculators.js';

const PARTS = ['item_part_casing', 'item_part_keypad', 'item_part_screen', 'item_part_board', 'item_part_battery'];
const fresh = (seed = 1, hhmm = '10:00') => {
  const g = newGame(seed);
  setTime(g, 1, hhmm);
  noImpulses(g);
  return g;
};
/** A game with a warehouse you own, standing inside it. */
const owned = (wh = 'wh7', seed = 1) => {
  const g = fresh(seed);
  g.setFlag(CONTENT.warehouses[wh].flag, true);
  g.changeMap(CONTENT.warehouses[wh].map, 'entry');
  return g;
};
const give = (g, id, n) => g.inventory.add(id, n, { silent: true });
const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };

test('content: three warehouses for sale at the docks, a recipe chain that ends in every calculator, Sal\'s two shops', () => {
  const ws = Object.entries(CONTENT.warehouses);
  assert.equal(ws.length, 3);
  for (const [id, w] of ws) {
    assert.ok(CONTENT.maps[w.map], `${id} map`);
    assert.ok(CONTENT.containers[w.inBay] && CONTENT.containers[w.outCrate], `${id} crates`);
    assert.ok(CONTENT.maps.halvermouth.props.some((p) => p.id === w.sign), `${id} FOR SALE sign`);
    assert.ok(w.price > 0);
  }
  assert.ok(CONTENT.warehouses.wh12.price > CONTENT.warehouses.wh9.price && CONTENT.warehouses.wh9.price > CONTENT.warehouses.wh7.price);
  for (const r of Object.values(CONTENT.recipes)) for (const id of Object.keys(r.in)) assert.ok(CONTENT.items[id], id);
  for (const id of PARTS) assert.ok(CONTENT.shops.shop_surplus.stock[id] > 0, id);
  for (const t of CALC_TYPES) assert.ok(CONTENT.shops.shop_surplus.buys[`item_calc_${t}`] > 0, `Sal buys ${t}`);
  for (const id of ['item_machine_solderer', 'item_machine_press', 'item_machine_assembler', 'item_machine_tuner', 'item_belt', 'item_inserter', 'item_generator']) {
    assert.ok(CONTENT.items[id].build, id);
    assert.ok(CONTENT.shops.shop_machines.stock[id] > 0, id);
  }
  assert.equal(CONTENT.characters.npc_sal.schedule[0].spot, 'surplus:counter_back');
});

test('buying a warehouse at its FOR SALE sign unlocks the door', () => {
  const g = fresh(2);
  const map = g.maps.get('halvermouth');
  const door = map.doors.find((d) => d.to?.map === 'wh7');
  assert.ok(!g.playerCanPass(door), 'padlocked');
  const sign = map.props.find((p) => p.id === 'hv_wh7_sale');
  g.changeMap('halvermouth', 'wh7_door_out');
  const prompt = g.interact({ kind: 'prop', id: sign.id });
  assert.equal(prompt.type, 'choices');
  g.player.money = 100;
  assert.ok(!g.factory.buy('wh7').ok, 'too poor');
  g.player.money = 1000;
  assert.ok(g.factory.buy('wh7').ok);
  assert.equal(g.player.money, 1000 - CONTENT.warehouses.wh7.price);
  assert.ok(g.playerCanPass(door));
  assert.ok(check({ factory: { owns: true } }, g));
});

test('hand-crafting at the workbench: core, shell, blank, tune — from your pockets and the input bay; it takes time', () => {
  const g = owned('wh7', 3);
  give(g, 'item_part_board', 2);
  give(g, 'item_part_battery', 2);
  g.world.containers.ct_wh7_in.items = { item_part_casing: 2, item_part_keypad: 2, item_part_screen: 2 };
  const bench = g.currentMap().props.find((p) => p.id === 'wh7_bench');
  const menu = g.interact({ kind: 'prop', id: bench.id });
  assert.equal(menu.type, 'choices');
  assert.ok(menu.options.some((o) => o.call[3] === 'solderer'));
  const t0 = g.clock.total;
  assert.ok(g.factory.craft('wh7', 'solderer', null, 2).ok);
  assert.equal(g.clock.total - t0, 20, 'ten minutes each by hand');
  assert.ok(g.factory.craft('wh7', 'press', null, 2).ok, 'shell parts come from the input bay');
  assert.equal(g.world.containers.ct_wh7_in.items.item_part_casing, 0);
  assert.ok(g.factory.craft('wh7', 'assembler', null, 2).ok);
  assert.equal(g.inventory.count('item_calc_blank'), 2);
  assert.ok(g.factory.craft('wh7', 'tuner', 'wits', 2).ok);
  assert.equal(g.inventory.count('item_calc_wits'), 2);
  assert.equal(g.factory.state.made, 2);
  assert.ok(!g.factory.craft('wh7', 'solderer', null, 1).ok, 'out of parts');
});

test('Factorio progression: Sal sells machinery after 5 made, and delivery contracts after 10', () => {
  const g = fresh(4);
  const sal = g.npcs.get('npc_sal');
  const topic = CONTENT.dialogues.dlg_sal.topics.find((t) => t.id === 't_sal_machines');
  const opens = () => g.applyEffects(topic.effects, sal).actions.some((a) => a.type === 'shop' && a.shopId === 'shop_machines');
  assert.ok(!opens());
  g.factory.madeOne(5);
  assert.ok(opens());
  const deliv = CONTENT.dialogues.dlg_sal.topics.find((t) => t.id === 't_sal_deliveries');
  const small = deliv.choices.find((c) => c.id === 'c_sal_small');
  g.setFlag('owns_wh7', true);
  assert.ok(!check(small.if, g, sal));
  g.factory.madeOne(5);
  assert.ok(check(small.if, g, sal));
});

test('building: only your warehouse, only on the floor, never on fixtures, the doorway or yourself; picking up returns everything', () => {
  const g = owned('wh7', 5);
  give(g, 'item_machine_solderer', 1);
  give(g, 'item_belt', 5);
  assert.match(g.factory.place('wh7', 'item_belt', 0, 3).text, /floor/, 'not in a wall');
  assert.match(g.factory.place('wh7', 'item_belt', 1, 1).text, /already/, 'not on the input bay');
  const keep = g.currentMap().def.keepClear[0];
  assert.match(g.factory.place('wh7', 'item_belt', keep[0], keep[1]).text, /doorway/);
  const ptx = Math.floor(g.player.x / TILE);
  const pty = Math.floor(g.player.y / TILE);
  assert.ok(!g.factory.place('wh7', 'item_belt', ptx, pty - 0).ok);
  const r = g.factory.place('wh7', 'item_machine_solderer', 2, 4);
  assert.ok(r.ok, r.text);
  assert.equal(g.inventory.count('item_machine_solderer'), 0);
  const map = g.currentMap();
  assert.ok(map.blockedTile(3, 5), 'machines are solid');
  assert.match(g.factory.place('wh7', 'item_belt', 3, 5).text, /already/);
  r.entity.in.item_part_board = 2;
  assert.ok(g.factory.remove('wh7', 3, 5).ok);
  assert.equal(g.inventory.count('item_machine_solderer'), 1);
  assert.equal(g.inventory.count('item_part_board'), 2, 'its contents come back');
  assert.ok(!map.blockedTile(3, 5));
  const g2 = fresh(6);
  give(g2, 'item_belt', 1);
  assert.match(g2.factory.place('wh7', 'item_belt', 3, 4).text, /isn't your/);
});

test('a machine fed by an inserter from the input bay, emptied by another onto a belt that runs into the output crate', () => {
  const g = owned('wh7', 7);
  runCommand(g, 'machines');
  g.world.containers.ct_wh7_in.items = { item_part_board: 3, item_part_battery: 3, item_part_casing: 5 };
  // input bay (1–2, 1–2) ─▶ arm (1,3)↓ ─▶ solderer (1–2, 4–5) ─▶ arm (3,4)→ ─▶ belts (4,4)→ … (12,4)↑? no: route to the output crate (13–14, 1–2)
  assert.ok(g.factory.place('wh7', 'item_inserter', 1, 3, 1).ok);
  assert.ok(g.factory.place('wh7', 'item_machine_solderer', 1, 4).ok);
  assert.ok(g.factory.place('wh7', 'item_inserter', 3, 4, 0).ok);
  for (let x = 4; x <= 13; x++) assert.ok(g.factory.place('wh7', 'item_belt', x, 4, x === 13 ? 3 : 0).ok, `belt ${x}`);
  assert.ok(g.factory.place('wh7', 'item_belt', 13, 3, 3).ok);
  minutes(g, 60);
  const sold = g.factory.cells('wh7').machines[0];
  assert.equal(g.world.containers.ct_wh7_in.items.item_part_board, 0, 'the arm only takes what the machine wants');
  assert.equal(g.world.containers.ct_wh7_in.items.item_part_casing, 5);
  assert.equal(g.world.containers.ct_wh7_out.items.item_calc_core, 3, 'three cores rode the belt into the output crate');
  assert.equal(sold.progress, 0);
});

test('the full line, end to end: parts in, finished calculators out — and it counts towards "made"', () => {
  const g = owned('wh12', 8);
  runCommand(g, 'machines');
  give(g, 'item_inserter', 10);
  give(g, 'item_belt', 40);
  // Lay out: solderer S(3,4) and press P(3,7) fed by hand; both empty via arms onto belts that run east into the assembler A(9,5);
  // A empties via an arm into the tuner T(13,5); T empties via an arm onto a belt north into the output crate (23–24, 1–2).
  const place = (item, x, y, d = 0) => { const r = g.factory.place('wh12', item, x, y, d); assert.ok(r.ok, `${item} @${x},${y}: ${r.text}`); return r.entity; };
  const S = place('item_machine_solderer', 3, 4);
  const P = place('item_machine_press', 3, 7);
  place('item_inserter', 5, 4, 0); // S → belt
  for (let x = 6; x <= 8; x++) place('item_belt', x, 4, x === 8 ? 1 : 0); // → (8,4)↓ into A at (8,5)? A occupies 9–10
  place('item_belt', 8, 5, 0); // (8,5) → A(9,5)
  place('item_inserter', 5, 8, 0); // P → belt
  for (let x = 6; x <= 8; x++) place('item_belt', x, 8, x === 8 ? 3 : 0);
  place('item_belt', 8, 7, 3); place('item_belt', 8, 6, 0); // up to (8,6) → A(9,6)
  const A = place('item_machine_assembler', 9, 5);
  place('item_inserter', 11, 5, 0); // A → T
  const T = place('item_machine_tuner', 12, 5);
  place('item_generator', 15, 9);
  g.factory.setTuner(T.id, 'charm');
  place('item_inserter', 14, 5, 0); // T → belt
  for (let x = 15; x <= 23; x++) place('item_belt', x, 5, x === 23 ? 3 : 0);
  place('item_belt', 23, 4, 3); place('item_belt', 23, 3, 3); // into the output crate at (23,2)
  S.in = { item_part_board: 4, item_part_battery: 4 };
  P.in = { item_part_casing: 4, item_part_keypad: 4, item_part_screen: 4 };
  const before = g.factory.state.made;
  minutes(g, 120);
  assert.equal(g.world.containers.ct_wh12_out.items.item_calc_charm, 4, 'four Rose-Gold Sums in the output crate');
  assert.equal(g.factory.state.made - before, 4);
  void A;
});

test('power: the wall socket runs the first machines; a generator powers four more', () => {
  const g = owned('wh7', 9);
  runCommand(g, 'machines');
  const S1 = g.factory.place('wh7', 'item_machine_solderer', 2, 4).entity;
  g.factory.place('wh7', 'item_machine_solderer', 5, 4);
  const P3 = g.factory.place('wh7', 'item_machine_press', 8, 4).entity;
  assert.equal(g.factory.power('wh7').capacity, 2);
  P3.in = { item_part_casing: 1, item_part_keypad: 1, item_part_screen: 1 };
  minutes(g, 10);
  assert.equal(P3.powered, false);
  assert.equal(P3.in.item_part_casing, 1, 'no power, no work');
  assert.ok(g.factory.place('wh7', 'item_generator', 11, 5).ok);
  assert.equal(g.factory.power('wh7').capacity, 6);
  minutes(g, 10);
  assert.equal(P3.out.item_calc_shell, 1);
  void S1;
});

test('belts back up instead of losing items; a machine stops when its output is full', () => {
  const g = owned('wh7', 10);
  runCommand(g, 'machines');
  give(g, 'item_belt', 10);
  for (let x = 3; x <= 6; x++) g.factory.place('wh7', 'item_belt', x, 6, 0); // dead end at (6,6) → (7,6) empty floor
  const belts = g.factory.cells('wh7').belts;
  belts.forEach((b) => { b.carry = 'item_part_board'; });
  minutes(g, 5);
  assert.equal(belts.filter((b) => b.carry).length, 4, 'nothing falls off the end');
  const S = g.factory.place('wh7', 'item_machine_solderer', 9, 3).entity;
  S.in = { item_part_board: 4, item_part_battery: 4 };
  S.out = { item_calc_core: 10 };
  minutes(g, 10);
  assert.equal(S.in.item_part_board, 4, 'output full: it waits');
});

test('Sal\'s daily delivery lands in the input bay at 07:00, paid on delivery — or goes back on the van', () => {
  const g = fresh(11, '06:00');
  g.setFlag('owns_wh7', true);
  g.setFlag('owns_wh9', true);
  g.factory.setContract('small');
  g.player.money = 1000;
  run(g, 61, 1);
  assert.equal(g.player.money, 1000 - CONTENT.deliveries.small.price);
  assert.equal(g.world.containers.ct_wh9_in.items.item_part_board, 5, 'to the bigger warehouse');
  setTime(g, 2, '06:59');
  g.player.money = 10;
  run(g, 2, 1);
  assert.equal(g.world.containers.ct_wh9_in.items.item_part_board, 5, 'unpaid: nothing delivered');
});

test('the factory keeps running while you\'re away or asleep, and survives save/load as props on the map', () => {
  const g = owned('wh7', 12);
  runCommand(g, 'machines');
  const S = g.factory.place('wh7', 'item_machine_solderer', 2, 4).entity;
  S.in = { item_part_board: 3, item_part_battery: 3 };
  g.changeMap('halvermouth', 'wh7_door_out');
  g.skipTime(30);
  assert.equal(S.out.item_calc_core, 3, 'made while you were out');
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(state);
  const map = g2.maps.get('wh7');
  const e = g2.world.factory.warehouses.wh7.entities[0];
  assert.equal(map.propIndex.get(e.id), e, 'reinstalled as a prop');
  assert.ok(map.blockedTile(2, 4));
  assert.equal(e.out.item_calc_core, 3);
  delete state.world.factory;
  const g3 = new Game(CONTENT, { seed: 1 });
  g3.loadState(state);
  assert.equal(g3.factory.state.made, 0);
  assert.deepEqual(g3.world.factory.warehouses.wh7.entities, []);
});

test('machine panel: set the tuner, load from your pockets, collect the output', () => {
  const g = owned('wh7', 13);
  runCommand(g, 'machines');
  const T = g.factory.place('wh7', 'item_machine_tuner', 2, 4).entity;
  const prompt = g.interact({ kind: 'prop', id: T.id });
  assert.equal(prompt.type, 'choices');
  assert.match(prompt.text, /choose what to make/);
  g.factory.setTuner(T.id, 'energy');
  give(g, 'item_calc_blank', 2);
  g.factory.load(T.id);
  assert.equal(g.inventory.count('item_calc_blank'), 0);
  minutes(g, 10);
  g.factory.collect(T.id);
  assert.equal(g.inventory.count('item_calc_energy'), 2);
});

test('debug commands: warehouse, parts, machines, made', () => {
  const g = fresh(14);
  runCommand(g, 'warehouse wh9');
  assert.ok(g.factory.owns('wh9'));
  runCommand(g, 'parts 3');
  assert.equal(g.inventory.count('item_part_screen'), 3);
  runCommand(g, 'machines');
  assert.equal(g.inventory.count('item_machine_assembler'), 2);
  runCommand(g, 'made 7');
  assert.equal(g.factory.state.made, 7);
});
