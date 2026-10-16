// The works, more Factorio (v0.37.0): walk-through inserters, placeable storage
// chests, filter inserters, belt sorters (filtered and splitting), belts that
// carry you; saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
import { findPath } from '../src/world/pathfinding.js';

const works = () => {
  const g = newGame(4);
  setTime(g, 1, '08:00');
  noImpulses(g);
  runCommand(g, 'works aw1');
  g.changeMap('aw1', 'entry');
  g.player.x = 2.5 * TILE; // out of the way of the build area
  g.player.y = 2.5 * TILE;
  for (const id of ['item_belt', 'item_inserter', 'item_filter_inserter', 'item_sorter', 'item_chest_wood', 'item_chest_iron']) g.inventory.add(id, 20, { silent: true });
  return g;
};
const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };
const A = (g) => g.arms;
const items = (g, e) => g.world.containers[e.container].items;
/** Somewhere on the works floor with room for a little line (x0..x0+6, y0..y0+2). */
const spot = (g) => {
  const m = g.maps.get('aw1');
  for (let y = 3; y < m.height - 6; y++) for (let x = 3; x < m.width - 9; x++) {
    let ok = true;
    for (let yy = y - 1; yy <= y + 2 && ok; yy++) for (let xx = x; xx <= x + 7 && ok; xx++) if (A(g).blockReason('aw1', xx, yy, 1, 1)) ok = false;
    if (ok) return { x, y };
  }
  throw new Error('no room');
};

test('inserters (and sorters and belts) are walked through — by you and by the workers', () => {
  const g = works();
  const { x, y } = spot(g);
  const ins = A(g).place('aw1', 'item_inserter', x, y, 0).entity;
  const so = A(g).place('aw1', 'item_sorter', x + 1, y, 0).entity;
  const box = A(g).place('aw1', 'item_chest_wood', x + 2, y, 0).entity;
  const m = g.maps.get('aw1');
  assert.equal(m.blockedTile(ins.x, ins.y, g.playerActor()), false, 'inserter');
  assert.equal(m.blockedTile(so.x, so.y, g.playerActor()), false, 'sorter');
  assert.equal(m.blockedTile(box.x, box.y, g.playerActor()), true, 'a chest is solid');
  // an older save's solid inserter is made walkable on load
  const s = JSON.parse(JSON.stringify(g.serialize()));
  for (const e of s.world.arms.warehouses.aw1.entities) if (e.type === 'inserter') e.solid = true;
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(s);
  assert.equal(g2.maps.get('aw1').blockedTile(ins.x, ins.y, g2.playerActor()), false);
  const path = findPath(g2.maps.get('aw1'), ins.x, ins.y - 1, ins.x, ins.y + 1);
  assert.ok(path?.some((q) => q.x === ins.x && q.y === ins.y), 'a worker\'s path goes straight over it');
});

test('a storage chest: inserters fill it from the dock up to its size, you can open it, and picking it up gives back what\'s inside', () => {
  const g = works();
  const { x, y } = spot(g);
  const def = A(g).def('aw1');
  // dock → chest via a belt + inserter: put a chest, an inserter feeding it from a second chest we stock by hand
  const src = A(g).place('aw1', 'item_chest_iron', x, y, 0).entity;
  A(g).place('aw1', 'item_inserter', x + 1, y, 0);
  const dst = A(g).place('aw1', 'item_chest_wood', x + 2, y, 0).entity;
  items(g, src).item_ap_steel = 150;
  minutes(g, 130);
  assert.equal(items(g, dst).item_ap_steel, 100, 'a wooden chest holds 100');
  assert.equal(items(g, src).item_ap_steel, 50);
  const view = g.containerView(dst.container);
  assert.match(view.name, /Wooden Chest \(100 items\)/);
  assert.ok(g.takeFromContainer(dst.container, 'item_ap_steel', 5).ok, 'yours to take from');
  const before = g.inventory.count('item_ap_steel');
  assert.ok(A(g).remove('aw1', dst.x, dst.y).ok);
  assert.equal(g.inventory.count('item_ap_steel'), before + 95, 'its contents come back with it');
  assert.equal(g.world.containers[dst.container], undefined);
  assert.ok(def.inBay);
});

test('a filter inserter moves only its item; with no filter it waits', () => {
  const g = works();
  const { x, y } = spot(g);
  const src = A(g).place('aw1', 'item_chest_iron', x, y, 0).entity;
  const fi = A(g).place('aw1', 'item_filter_inserter', x + 1, y, 0).entity;
  const dst = A(g).place('aw1', 'item_chest_wood', x + 2, y, 0).entity;
  Object.assign(items(g, src), { item_ap_steel: 5, item_ap_springs: 5 });
  minutes(g, 4);
  assert.deepEqual(items(g, dst), {}, 'no filter: nothing moves');
  const p = A(g).entityPrompt(fi);
  assert.equal(p.type, 'choices');
  assert.ok(p.options.some((o) => o.call?.[3] === 'item_ap_springs'), 'offers what the chests hold');
  assert.ok(A(g).setFilter(fi.id, 'item_ap_springs').ok);
  minutes(g, 10);
  assert.equal(items(g, dst).item_ap_springs, 5);
  assert.ok(!items(g, dst).item_ap_steel, 'and nothing else');
});

test('a belt sorter: matching items turn right, the rest go straight on; unfiltered, it splits evenly', () => {
  const g = works();
  const { x, y } = spot(g);
  // chest → inserter → belt → sorter(east) → straight: chest at x+4 ; right (south): chest at (x+3, y+1)
  const src = A(g).place('aw1', 'item_chest_iron', x, y, 0).entity;
  A(g).place('aw1', 'item_inserter', x + 1, y, 0);
  A(g).place('aw1', 'item_belt', x + 2, y, 0);
  const so = A(g).place('aw1', 'item_sorter', x + 3, y, 0).entity;
  const straight = A(g).place('aw1', 'item_chest_wood', x + 4, y, 0).entity;
  const right = A(g).place('aw1', 'item_chest_wood', x + 3, y + 1, 0).entity;
  Object.assign(items(g, src), { item_ap_steel: 6, item_ap_springs: 6 });
  A(g).setFilter(so.id, 'item_ap_springs');
  minutes(g, 40);
  assert.deepEqual(items(g, right), { item_ap_springs: 6 });
  assert.deepEqual(items(g, straight), { item_ap_steel: 6 });
  // no filter: a splitter
  A(g).setFilter(so.id, null);
  items(g, src).item_ap_steel = 10;
  minutes(g, 40);
  assert.equal(items(g, right).item_ap_steel, 5);
  assert.equal(items(g, straight).item_ap_steel, 11);
});

test('a belt carries you along it; filters, chests and their contents survive a save', () => {
  const g = works();
  const { x, y } = spot(g);
  for (let k = 0; k < 6; k++) A(g).place('aw1', 'item_belt', x + k, y, 0);
  g.player.x = (x + 0.5) * TILE;
  g.player.y = (y + 0.6) * TILE;
  const x0 = g.player.x;
  for (let t = 0; t < 1.5; t += 0.05) g.update(0.05, { x: 0, y: 0, sprint: false });
  assert.ok(g.player.x - x0 > 50, `carried ${Math.round(g.player.x - x0)} px`);
  const box = A(g).place('aw1', 'item_chest_wood', x, y + 2, 0).entity;
  const fi = A(g).place('aw1', 'item_filter_inserter', x + 1, y + 2, 0).entity;
  items(g, box).item_ap_springs = 7;
  A(g).setFilter(fi.id, 'item_ap_springs');
  const g2 = new Game(CONTENT, { seed: 3 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.equal(g2.world.containers[box.container].items.item_ap_springs, 7);
  assert.equal(g2.arms.findEntity(fi.id).filter, 'item_ap_springs');
  assert.ok(g2.containerDef(box.container));
});
