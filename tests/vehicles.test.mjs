// Cars (v0.16.0 "On the Road"): the dealerships, buying, driving, crashing,
// hitting people (never the protected), theft and the police, crossing the
// region gates, selling and fresh plates, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { isProtected } from '../src/systems/combat.js';
import { runCommand } from '../src/game/debugCommands.js';
const TILE_SOLID = new Set(['B', 'W', 'r', 'x', 'R']);

const fresh = (hhmm = '10:00') => {
  const g = newGame(7);
  setTime(g, 1, hhmm);
  noImpulses(g);
  g.player.money = 50000;
  return g;
};
/** Drive for `seconds` with the given input. */
const drive = (g, seconds, input) => { for (let t = 0; t < seconds; t += 0.05) g.update(0.05, { x: 0, y: 0, sprint: false, ...input }); };
/** An owned car of `model` on `map` at tile (x, y), angle in radians; the player gets in. */
const inCar = (g, map, x, y, angle = 0, model = 'pipit') => {
  g.changeMap(map, Object.keys(g.maps.get(map).spots)[0]);
  const id = `car_t${g.vehicles.state.nextId++}`;
  g.vehicles.state.cars[id] = { id, model, color: '#888', map, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, angle, owner: 'player', stolen: false, plate: 'TEST' };
  g.vehicles.enter(id);
  return g.vehicles.car(id);
};

test('two dealerships: three basic used cars on Westbrook Row, high-end cars in Halvermouth', () => {
  const V = CONTENT.vehicles;
  assert.equal(V.dealers.fender.models.length, 3);
  assert.equal(V.dealers.fender.map, 'westbrook', 'in the starting area');
  assert.ok(V.dealers.fender.models.every((m) => V.models[m].used && V.models[m].price < 1000), 'boring, basic and cheap');
  assert.equal(V.dealers.beaumont.map, 'halvermouth', 'in the main city');
  assert.ok(V.dealers.beaumont.models.every((m) => V.models[m].price >= 5000), 'high end');
  for (const d of Object.values(V.dealers)) assert.ok(CONTENT.characters[d.npc], `${d.npc} runs it`);
  assert.ok(CONTENT.characters.npc_marty.personality.traits.includes('sleazy'));
});

test('every parked car starts on clear ground, and the street cars are real cars', () => {
  const g = fresh();
  const V = g.vehicles;
  const cars = Object.values(V.state.cars);
  assert.ok(cars.length >= 18, `${cars.length} cars`);
  for (const c of cars) {
    const m = V.model(c);
    assert.ok(!V.blocked(g.maps.get(c.map), c.x, c.y, c.angle, m.len, m.wid, c), `${c.id} is clear`);
  }
  assert.ok(!Object.values(CONTENT.maps).some((m) => m.id !== 'yards' && (m.props || []).some((p) => p.type === 'car' && !p.wrecked)), 'no decorative cars left to confuse anyone');
  assert.ok(cars.some((c) => c.owner === 'police'), 'police cruisers');
});

test('buying a car: paid for, delivered to the forecourt, yours', () => {
  const g = fresh();
  const r = g.vehicles.buy('fender', 'pipit', '#7f8f6a');
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, 50000 - 420);
  const car = g.vehicles.car(r.car);
  assert.equal(car.owner, 'player');
  assert.equal(car.map, 'westbrook');
  assert.equal(car.color, '#7f8f6a', 'the colour you chose');
  assert.ok(!g.vehicles.buy('fender', 'corsair').ok, 'Marty doesn\'t sell Corsairs');
  g.player.money = 100;
  assert.match(g.vehicles.buy('beaumont', 'aurelia').text, /6500/);
});

test('driving: accelerate, steer, brake; walls stop you; get out beside the car', () => {
  const g = fresh();
  const car = inCar(g, 'yards', 20, 20, 0);
  const x0 = car.x;
  drive(g, 1.5, { y: -1 });
  assert.ok(car.x - x0 > 100, `moved ${car.x - x0}px`);
  assert.ok(car.speed > 150);
  assert.equal(g.player.x, car.x, 'you are in it');
  const a0 = car.angle;
  drive(g, 0.5, { y: -1, x: 1 });
  assert.ok(car.angle > a0 + 0.3, 'steered');
  drive(g, 1.5, { y: 1 });
  assert.ok(car.speed <= 0, 'braked (and started to reverse)');
  // into a wall: the map edge
  const c2 = inCar(g, 'yards', 3, 20, Math.PI);
  drive(g, 3, { y: -1 });
  assert.ok(c2.x > 40, 'stopped at the edge, not through it');
  g.vehicles.state.cars[c2.id].speed = 0;
  const r = g.vehicles.exit();
  assert.ok(r.ok);
  assert.equal(g.player.driving, null);
  assert.ok(Math.hypot(g.player.x - c2.x, g.player.y - c2.y) < 90, 'beside it');
});

test('running people over hurts them and is a crime; the protected are never harmed', () => {
  const g = fresh();
  const car = inCar(g, 'yards', 10, 20, 0, 'tempest');
  const al = g.npcs.get('npc_al');
  al.map = 'yards'; al.x = car.x + 260; al.y = car.y; al.path = null;
  const crimes = [];
  g.bus.on('crime', (e) => crimes.push(e.fact));
  drive(g, 2, { y: -1 });
  assert.ok(al.health < 100 || al.dead, `Al was hit (health ${al.health})`);
  assert.ok(crimes.includes('fact_player_assault'));
  // Mason Nails is protected: the car just stops
  const c2 = inCar(g, 'yards', 10, 28, 0, 'tempest');
  const mason = g.npcs.get('npc_mason');
  assert.ok(isProtected(mason));
  mason.map = 'yards'; mason.x = c2.x + 260; mason.y = c2.y; mason.path = null;
  const h0 = mason.health;
  drive(g, 2, { y: -1 });
  assert.equal(mason.health, h0, 'unharmed');
  assert.ok(!g.combat.wrath, 'no Wrath: it wasn\'t a direct attack');
});

test('hotwiring a car makes it yours (stolen) and is a crime; an officer who sees it comes after you', () => {
  const g = fresh();
  g.changeMap('halvermouth', 'east_gate');
  const V = g.vehicles;
  const target = Object.values(V.state.cars).find((c) => c.map === 'halvermouth' && c.owner === null);
  g.player.x = target.x;
  g.player.y = target.y + 40;
  const crimes = [];
  g.bus.on('crime', (e) => crimes.push(e.fact));
  assert.ok(V.startHotwire(target.id).ok);
  drive(g, 4, {});
  assert.equal(target.owner, 'player');
  assert.ok(target.stolen);
  assert.equal(g.player.driving, target.id, 'and you\'re in it');
  assert.ok(crimes.includes('fact_player_car_theft'));
  // an officer nearby recognises it
  const o = g.npcs.get('npc_justin');
  o.map = 'halvermouth'; o.x = target.x + 100; o.y = target.y; o.activity = 'patrol'; o.path = null;
  drive(g, 1, {});
  assert.ok(g.world.police.wanted >= 2, `wanted ${g.world.police.wanted}`);
  // moving cancels a hotwire
  const other = Object.values(V.state.cars).find((c) => c.map === 'halvermouth' && c.owner === null);
  V.exit();
  V.startHotwire(other.id);
  drive(g, 0.5, { x: 1 });
  assert.equal(V.hotwire, null);
  assert.equal(other.owner, null);
});

test('driving through the gate to Halvermouth takes the car with you', () => {
  const g = fresh();
  const car = inCar(g, 'westbrook', 3, 12.4, Math.PI);
  drive(g, 3, { y: -1 });
  assert.equal(g.player.map, 'halvermouth');
  assert.equal(car.map, 'halvermouth');
  assert.equal(g.player.driving, car.id);
});

test('selling: Marty buys anything (stolen at 30%) and sells fresh plates; Beaumont refuses stolen cars', () => {
  const g = fresh();
  const V = g.vehicles;
  const d = V.dealer('fender');
  const id = 'car_hot';
  V.state.cars[id] = { id, model: 'dray', color: '#888', map: 'westbrook', x: (d.lot.x + 3.5) * TILE, y: (d.lot.y + 4.5) * TILE, angle: 0, owner: 'player', stolen: true, plate: 'HOT 1' };
  assert.equal(V.offer('fender', V.car(id)), Math.round(680 * 0.3));
  const m0 = g.player.money;
  assert.ok(V.replate('fender', id).ok);
  assert.equal(g.player.money, m0 - 150);
  assert.equal(V.car(id).stolen, false, 'clean now');
  assert.equal(V.offer('fender', V.car(id)), Math.round(680 * 0.4));
  assert.ok(V.sell('fender', id).ok);
  assert.equal(V.car(id), null);
  // Beaumont
  const b = V.dealer('beaumont');
  V.state.cars.car_hot2 = { id: 'car_hot2', model: 'pipit', color: '#888', map: 'halvermouth', x: (b.lot.x + 2.5) * TILE, y: (b.lot.y + 1.5) * TILE, angle: 0, owner: 'player', stolen: true, plate: 'HOT 2' };
  assert.match(V.sell('beaumont', 'car_hot2').text, /provenance/);
});

test('a dealer restocks the display car you stole, the next morning', () => {
  const g = fresh();
  const V = g.vehicles;
  const display = Object.values(V.state.cars).find((c) => c.owner === 'dealer:fender');
  V.steal(display);
  assert.equal(display.owner, 'player');
  setTime(g, 2, '05:59');
  drive(g, 3, {});
  V.dailyTick();
  const now = Object.values(V.state.cars).filter((c) => c.owner === 'dealer:fender');
  assert.equal(now.length, CONTENT.vehicles.dealers.fender.display.length);
});

test('talking to Marty opens the dealership', () => {
  const g = fresh();
  const res = g.applyEffects([{ dealer: 'fender' }], g.npcs.get('npc_marty'));
  assert.deepEqual(res.actions, [{ type: 'dealer', dealer: 'fender' }]);
});

test('cars and the driver\'s seat survive save/load', () => {
  const g = fresh();
  const car = inCar(g, 'yards', 20, 20, 1);
  drive(g, 1, { y: -1 });
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(data);
  assert.equal(g2.player.driving, car.id);
  const c2 = g2.vehicles.car(car.id);
  assert.equal(Math.round(c2.x), Math.round(car.x));
  assert.equal(c2.owner, 'player');
});

test('the debug car command parks one beside you', () => {
  const g = fresh();
  g.changeMap('yards', Object.keys(g.maps.get('yards').spots)[0]);
  assert.ok(runCommand(g, 'car corsair').ok);
  assert.ok(g.vehicles.ownedCars().some((c) => c.model === 'corsair'));
});

test('v0.35.1: you can always get out — beside traffic queued on both sides, or hemmed in at the edge of the map', () => {
  const g = fresh();
  const car = inCar(g, 'lanternside', 10, 23, 0);
  // traffic stopped right alongside on both sides doesn't shut the doors
  const T = g.transit;
  const real = T.boxesOn.bind(T);
  T.boxesOn = (id) => (id === 'lanternside' ? [{ x: car.x, y: car.y - 44, angle: 0, len: 80, wid: 40 }, { x: car.x, y: car.y + 44, angle: 0, len: 80, wid: 40 }] : real(id));
  assert.ok(g.vehicles.exit().ok);
  T.boxesOn = real;
  // a spot that used to trap you: the Yards' western edge
  inCar(g, 'yards', 1, 20, Math.PI / 2);
  assert.ok(g.vehicles.exit().ok);
  assert.equal(g.player.driving, null);
  assert.equal(g.maps.get('yards').doorAt(Math.floor(g.player.x / TILE), Math.floor(g.player.y / TILE)), null, 'not in a doorway');
});

test('v0.35.2: a car shoved partly into a wall is eased out — it can never drive through buildings', () => {
  const g = fresh();
  const m = g.maps.get('lanternside');
  // nosed into the Kettle & Crumb's front wall, and floored
  const car = inCar(g, 'lanternside', 8, 21, 0);
  car.y = 21.6 * TILE;
  assert.ok(g.vehicles.inWalls(m, car.x, car.y, car.angle, 73, 38, car) > 0, 'starts in the wall');
  let inside = 0;
  for (let t = 0; t < 8; t += 0.05) {
    g.update(0.05, { x: 0, y: -1, sprint: false });
    if (TILE_SOLID.has(m.tileAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE)))) inside++;
  }
  assert.equal(inside, 0, 'never inside the building');
  assert.equal(g.vehicles.inWalls(m, car.x, car.y, car.angle, 73, 38, car), 0, 'clear of it');
  assert.ok(g.vehicles.exit().ok);
  // overlapping another car you can still pull apart — but not into a wall
  const c2 = inCar(g, 'lanternside', 20, 23, 0);
  const other = { id: 'car_x', model: 'pipit', color: '#888', map: 'lanternside', x: c2.x + 20, y: c2.y, angle: 0, owner: null, stolen: false, plate: 'X' };
  g.vehicles.state.cars.car_x = other;
  drive(g, 1.5, { y: 1 }); // reverse away from it
  assert.ok(c2.x < other.x - 60, 'backed out of the other car');
});
