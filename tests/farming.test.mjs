// Farming (v0.30.0): land, work by hand and by tractor, growth on the clock, the Co-op, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game, TILE } from './helpers.mjs';

const P = 'plot_east_1';
const morning = (g, day) => { g.clock.total = (day - 1) * 1440 + 6 * 60; g.farm.dailyTick(); };
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 2 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };

test('three plots for sale, each one of Lariat\'s fields; bought once, at the listed price', () => {
  const g = newGame();
  const F = g.farm;
  assert.deepEqual(Object.keys(CONTENT.farming.plots).sort(), ['plot_east_1', 'plot_east_2', 'plot_east_3']);
  for (const id of Object.keys(CONTENT.farming.plots)) assert.ok(F.plotDef(id).tiles > 200, `${id} is a real field`);
  assert.equal(F.work(P, 'till').ok, false, 'not yours yet');
  g.player.money = 5000;
  assert.equal(F.buy(P).ok, false, 'too poor');
  g.player.money = 7000;
  assert.ok(F.buy(P).ok);
  assert.equal(g.player.money, 1000);
  assert.equal(F.buy(P).ok, false, 'only once');
});

test('by hand: a job takes most of a day and tires you; a tractor of yours parked by the field does it fast', () => {
  const g = newGame();
  const F = g.farm;
  g.player.money = 20000;
  F.buy(P);
  g.player.energy = 100;
  const t0 = g.clock.total;
  assert.ok(F.work(P, 'till').ok);
  assert.ok(g.clock.total - t0 >= 12 * 60, 'by hand: twelve hours or more');
  assert.ok(g.player.energy < 50, `tired out (${g.player.energy})`);
  // buy a Workhorse at Red Dirt and drive it to the field
  const r = g.vehicles.buy('reddirt', 'workhorse');
  assert.ok(r.ok, r.text);
  const car = g.vehicles.ownedCars().find((c) => c.model === 'workhorse');
  assert.equal(car.map, 'lariat');
  assert.equal(F.workPlan(P).byHand, true, 'still on the lot: too far away');
  Object.assign(car, { x: 90 * TILE, y: 79 * TILE });
  const plan = F.workPlan(P);
  assert.equal(plan.byHand, false);
  assert.ok(plan.minutes < 120, `${plan.minutes} minutes with the Workhorse`);
  g.inventory.add('item_seed_corn', 7);
  const t1 = g.clock.total;
  assert.ok(F.work(P, 'plant', 'corn').ok);
  assert.ok(g.clock.total - t1 < 120);
  assert.equal(g.inventory.count('item_seed_corn'), 0, 'seed used up');
});

test('crops grow each morning, are harvested once, and sell at the Co-op; a ready crop left too long spoils', () => {
  const g = newGame();
  const F = g.farm;
  g.player.money = 20000;
  F.buy(P);
  F.plot(P).state = 'tilled';
  g.inventory.add('item_seed_wheat', 10);
  g.inventory.add('item_fertilizer', 10);
  g.player.energy = 100;
  assert.ok(F.work(P, 'plant', 'wheat').ok);
  g.player.energy = 100;
  assert.ok(F.work(P, 'fertilize').ok);
  const day0 = F.plot(P).plantedDay;
  assert.ok(!F.actions(P).some((a) => a.action === 'harvest'), 'not ready');
  morning(g, day0 + 2);
  assert.ok(F.plot(P).stage > 0 && F.plot(P).stage < 3, 'growing');
  morning(g, day0 + 4);
  assert.equal(F.plot(P).stage, 3, 'ready after four days');
  const expect = Math.floor((F.plotDef(P).tiles / 9) * 1.25);
  assert.equal(F.expectedYield(P), expect);
  g.player.energy = 100;
  assert.ok(F.work(P, 'harvest').ok);
  assert.equal(g.inventory.count('item_crop_wheat'), expect);
  assert.equal(F.plot(P).state, 'fallow');
  assert.equal(F.work(P, 'harvest').ok, false, 'nothing left to harvest');
  const m0 = g.player.money;
  const price = F.coopPrice('item_crop_wheat');
  assert.ok(F.sellAtCoop('item_crop_wheat', expect).ok);
  assert.equal(g.player.money - m0, price * expect);
  assert.equal(g.inventory.count('item_crop_wheat'), 0);
  assert.equal(F.sellAtCoop('item_crop_wheat', 1).ok, false);
  // spoiling
  F.plot(P).state = 'tilled';
  g.inventory.add('item_seed_wheat', 6);
  g.player.energy = 100;
  F.work(P, 'plant', 'wheat');
  const d1 = F.plot(P).plantedDay;
  morning(g, d1 + 4);
  assert.equal(F.expectedYield(P), Math.floor(F.plotDef(P).tiles / 9));
  morning(g, d1 + 8);
  assert.equal(F.expectedYield(P), Math.floor((F.plotDef(P).tiles / 9) * 0.5), 'spoiling: half');
});

test('the field shows the crop: planting and growth redraw the ground; prices stay in their band', () => {
  const g = newGame();
  const F = g.farm;
  const map = g.maps.get('lariat');
  g.player.money = 20000;
  F.buy(P);
  F.plot(P).state = 'tilled';
  g.inventory.add('item_seed_cotton', 10);
  g.player.energy = 100;
  const v0 = map.fieldsVersion || 0;
  F.work(P, 'plant', 'cotton');
  assert.ok(map.fieldsVersion > v0);
  assert.equal(map.fieldState[P].crop, 'cotton');
  for (let d = 1; d < 60; d++) { morning(g, F.plot(P).plantedDay + d); assert.ok(F.state.priceIndex >= 0.85 && F.state.priceIndex <= 1.15); }
});

test('farms survive a save; an older save starts with no land; Red Dirt sells three tiers; the shops and people are there', () => {
  const g = newGame();
  g.player.money = 20000;
  g.farm.buy(P);
  g.farm.plot(P).state = 'tilled';
  const g2 = reload(g);
  assert.equal(g2.farm.plot(P).owned, true);
  assert.equal(g2.farm.plot(P).state, 'tilled');
  const s = JSON.parse(JSON.stringify(g.serialize()));
  delete s.world.farm;
  const g3 = new Game(CONTENT, { seed: 3 });
  g3.loadState(s);
  assert.equal(g3.farm.owned().length, 0);
  const d = CONTENT.vehicles.dealers.reddirt;
  assert.deepEqual(d.models.map((m) => CONTENT.vehicles.models[m].farm.tier), [1, 2, 3]);
  assert.ok(CONTENT.shops.shop_feedseed.stock.item_seed_cotton > 0);
  assert.ok(CONTENT.characters.npc_dale && CONTENT.characters.npc_lorna);
  assert.ok(CONTENT.maps.land_office && CONTENT.maps.feed_seed);
});
