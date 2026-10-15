// Signature cars (v0.34.0): one ridiculous, one-of-a-kind car for each
// imported character — parked by where they work, clear of every lane; no
// dealer will buy one; the Gavel gets salutes, the Paranoia goes unseen, the
// Landlubber drives on water; older saves gain them once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { mapToWorld } from '../src/world/layout.js';

const fresh = () => {
  const g = newGame(7);
  setTime(g, 1, '10:00');
  noImpulses(g);
  return g;
};
const drive = (g, seconds, input) => { for (let t = 0; t < seconds; t += 0.05) g.update(0.05, { x: 0, y: 0, sprint: false, ...input }); };
const sigCars = (g) => Object.values(g.vehicles.state.cars).filter((c) => g.vehicles.model(c).sig);
/** Take a signature car as stolen and get in. */
const steal = (g, id) => {
  const car = g.vehicles.car(id);
  g.changeMap(car.map, Object.keys(g.maps.get(car.map).spots)[0]);
  g.player.x = car.x;
  g.player.y = car.y + 60;
  g.vehicles.steal(car);
  return car;
};

test('every imported character has exactly one signature car, parked clear of walls, cars and every bus and traffic lane', () => {
  const g = fresh();
  const imported = Object.values(CONTENT.characters).filter((c) => c.origin === 'imported').map((c) => c.id).sort();
  const cars = sigCars(g);
  assert.deepEqual(cars.map((c) => c.owner).sort(), imported);
  assert.equal(new Set(cars.map((c) => c.plate)).size, cars.length, 'unique plates');
  const V = g.vehicles;
  const T = g.transit;
  T.setup();
  const routes = [...Object.values(T.lines).map((l) => l.route), ...Object.values(T.loops).map((l) => l.route)];
  for (const c of cars) {
    const m = V.model(c);
    assert.ok(m.blurb && m.lore && m.stolenLine && m.horn, `${m.name} is fully written`);
    assert.equal(m.dealer, null, 'not for sale anywhere');
    assert.ok(!V.blocked(g.maps.get(c.map), c.x, c.y, c.angle, m.len, m.wid, c), `${m.name} starts on clear ground`);
    const w = mapToWorld(g, c.map, c.x, c.y);
    for (const r of routes) assert.equal(r.near(w.x * TILE, w.y * TILE, m.len / 2 + 20).length, 0, `${m.name} is out of the traffic`);
  }
});

test('an older save gains the signature cars once; a stolen one is not put back', () => {
  const g = fresh();
  assert.equal(sigCars(g).length, 7);
  const s = JSON.parse(JSON.stringify(g.serialize()));
  for (const id of Object.keys(s.world.vehicles.cars)) if (id.startsWith('car_sig_')) delete s.world.vehicles.cars[id];
  delete s.world.vehicles.sigAdded;
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(s);
  assert.equal(sigCars(g2).length, 7);
  const cheese = steal(g2, 'car_sig_bigcheese');
  g2.vehicles.exit();
  delete g2.world.vehicles.cars[cheese.id]; // gone (say, scrapped)
  const g3 = new Game(CONTENT, { seed: 3 });
  g3.loadState(JSON.parse(JSON.stringify(g2.serialize())));
  assert.equal(g3.vehicles.car('car_sig_bigcheese'), null);
});

test('no dealer will buy one, stolen or not, and its owner takes the theft personally', () => {
  const g = fresh();
  const car = steal(g, 'car_sig_hypotenuse');
  assert.equal(g.player.driving, car.id);
  assert.equal(g.vehicles.offer('fender', car), 0);
  car.stolen = false;
  assert.equal(g.vehicles.offer('beaumont', car), 0);
  const d = g.vehicles.dealer('fender');
  g.vehicles.exit();
  Object.assign(car, { map: d.map, x: (d.lot.x + 4) * TILE, y: (d.lot.y + 3) * TILE });
  const r = g.vehicles.sell('fender', car.id);
  assert.equal(r.ok, false);
  assert.match(r.text, /Everybody knows whose that is/);
  assert.ok(g.relationships.get(g.npcs.get('npc_arthur'), 'player').trust < 0);
});

test('the Gavel: officers salute it instead of chasing; the Paranoia: they never see it', () => {
  for (const [id, salute] of [['car_sig_gavel', true], ['car_sig_paranoia', false]]) {
    const g = fresh();
    const car = steal(g, id);
    const barks = [];
    g.bus.on('npc:bark', (e) => barks.push(e.text));
    const o = g.npcs.get('npc_justin');
    o.map = car.map; o.activity = 'patrol'; o.path = null;
    const at = [[100, 0], [-100, 0], [0, 100], [0, -100], [140, 80], [-140, 80]].find(([dx, dy]) => g.canSee({ x: car.x + dx, y: car.y + dy }, car.x, car.y, g.maps.get(car.map), 9) && !g.maps.get(car.map).rectBlocked(car.x + dx - 8, car.y + dy - 6, 16, 8));
    o.x = car.x + at[0]; o.y = car.y + at[1];
    assert.ok(g.canSee(o, car.x, car.y, g.maps.get(car.map), 9), 'the officer is looking right at it');
    drive(g, 1.5, {});
    assert.equal(car.reported, false, `${id} isn't reported`);
    assert.ok((g.world.police.wanted || 0) < 3, `${id}: no pursuit (wanted ${g.world.police.wanted})`);
    assert.equal(barks.some((t) => /Chief/.test(t)), salute, `${id}: ${barks.join(' | ')}`);
  }
});

test('the Landlubber drives into the harbour and keeps going (faster); an ordinary car stops at the water', () => {
  const g = fresh();
  const m = g.maps.get('yards');
  let w = null;
  for (let y = 0; y < m.height && !w; y++) for (let x = 6; x < m.width - 34; x++) if ([...Array(32)].every((_, k) => m.tileAt(x + k, y) === '~' && m.tileAt(x + k, y + 2) === '~' && m.tileAt(x + k, y - 2) === '~')) { w = { x, y }; break; }
  assert.ok(w, 'open water at the Yards');
  const boat = g.vehicles.car('car_sig_landlubber');
  g.changeMap('yards', Object.keys(m.spots)[0]);
  Object.assign(boat, { map: 'yards', x: (w.x + 1.5) * TILE, y: (w.y + 0.5) * TILE, angle: 0, owner: 'player' });
  g.vehicles.enter(boat.id);
  const x0 = boat.x;
  drive(g, 3, { y: -1 });
  assert.ok(boat.x - x0 > 100, `it sailed ${Math.round(boat.x - x0)} px`);
  assert.ok(boat.speed > g.vehicles.model(boat).top, 'faster at sea than on the road');
  assert.ok(g.vehicles.trail.length > 0, 'leaving spray behind it');
  // a Pipit can't be put on the water at all
  const V = g.vehicles;
  assert.ok(V.blocked(m, (w.x + 6) * TILE, (w.y + 0.5) * TILE, 0, 73, 38, { model: 'pipit' }));
  assert.ok(!V.blocked(m, (w.x + 6) * TILE, (w.y + 0.5) * TILE, 0, 73, 38, { model: 'landlubber' }));
});
