// Transit (v0.17.0 "Route 1"): the No. 1 bus (route, stops, fare, riding it
// for real, waiting at a stop) and NPC traffic (lanes, stopping for people,
// carjacking), saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { worldToMap } from '../src/world/layout.js';
import { TILE_TYPES } from '../src/world/tiles.js';

const fresh = (hhmm = '10:00') => {
  const g = newGame(3);
  setTime(g, 1, hhmm);
  noImpulses(g);
  g.player.money = 100;
  g.transit.setup();
  return g;
};
/** The first distance along a route where pred(point, mapPoint) holds. */
const findOn = (route, pred, g) => {
  for (let d = 0; d < route.length; d += 8) {
    const p = route.at(d);
    if (pred(p, worldToMap(g, p.x / TILE, p.y / TILE))) return d;
  }
  throw new Error('not on this route');
};
const frames = (g, seconds, input = {}) => { for (let t = 0; t < seconds; t += 0.05) g.update(0.05, { x: 0, y: 0, ...input }); };
/** Stand by a stop's sign. */
const atStop = (g, id) => {
  const s = CONTENT.transit.bus.stops.find((x) => x.id === id);
  g.changeMap(s.sign.map, Object.keys(g.maps.get(s.sign.map).spots)[0]);
  g.player.x = (s.sign.x + 1.5) * TILE;
  g.player.y = (s.sign.y + 0.5) * TILE;
  return s;
};

test('the No. 1 bus: one loop through every region, a stop in every district, both ways; 2 obols', () => {
  const g = fresh();
  const T = g.transit;
  assert.equal(CONTENT.transit.bus.fare, 2);
  for (const s of CONTENT.transit.bus.stops) assert.equal(T.stops.filter((x) => x.id === s.id).length, s.id === 'stop_yards' || s.id === 'stop_ober' ? 2 : 2, `${s.id} both ways`);
  const maps = new Set();
  // the route stays on roads wherever it's on a map
  for (let d = 0; d < T.busRoute.length; d += 16) {
    const p = T.busRoute.at(d);
    const m = worldToMap(g, p.x / TILE, p.y / TILE);
    if (!m) continue;
    maps.add(m.map);
    const ch = g.maps.get(m.map).tileAt(Math.floor(m.x / TILE), Math.floor(m.y / TILE));
    assert.ok(!TILE_TYPES[ch]?.solid, `route on ${m.map} ${Math.floor(m.x / TILE)},${Math.floor(m.y / TILE)} is passable (${ch})`);
  }
  for (const id of ['yards', 'halvermouth', 'westbrook', 'lanternside', 'ober_fields']) assert.ok(maps.has(id), `the bus reaches ${id}`);
  // every stop has a sign
  for (const s of CONTENT.transit.bus.stops) assert.ok(g.maps.get(s.sign.map).props.some((p) => p.type === 'busstop' && p.interact.stop === s.id));
});

test('riding the bus: wait at a stop, pay the fare, ride for real, get off at a later stop', () => {
  const g = fresh();
  const T = g.transit;
  atStop(g, 'stop_westbrook');
  const r = T.waitFor('stop_westbrook');
  assert.ok(r.ok, r.text);
  const bus = T.boardable();
  assert.ok(bus, 'a bus is waiting');
  const b = g.interactables()[0];
  assert.equal(b.kind, 'bus_on');
  g.interact(b);
  assert.equal(g.player.riding, bus.idx);
  assert.equal(g.player.money, 98, 'two obols');
  const passed = [];
  g.bus.on('transit:stop', (e) => passed.push(e.name));
  const map0 = g.player.map;
  frames(g, 60);
  assert.ok(passed.length >= 1, 'it stopped somewhere');
  assert.notEqual(g.player.map === map0 && passed.length === 0, true);
  // get off at the next stop it waits at
  for (let i = 0; i < 2000 && !T.dwelling(T.bus(g.player.riding)); i++) frames(g, 0.05);
  const at = T.stopFor(T.bus(g.player.riding));
  const off = g.interactables()[0];
  assert.equal(off.kind, 'bus_off');
  g.interact(off);
  assert.equal(g.player.riding, null);
  assert.equal(g.player.map, at.sign.map);
  assert.ok(Math.hypot(g.player.x - (at.sign.x + 0.5) * TILE, g.player.y - (at.sign.y + 0.5) * TILE) < 3 * TILE, 'beside the sign');
});

test('no fare, no ride', () => {
  const g = fresh();
  atStop(g, 'stop_civic');
  g.transit.waitFor('stop_civic');
  g.player.money = 1;
  const bus = g.transit.boardable();
  assert.match(g.transit.board(bus.idx).text, /FARE 2/);
  assert.equal(g.player.riding ?? null, null);
});

test('the bus waits for someone standing in the road, and honks at you', () => {
  const g = fresh();
  const T = g.transit;
  const bus = T.bus(0);
  // a stretch of the coast road in Lanternside, heading east (west of the lights at Lamplighter Lane)
  bus.dist = findOn(T.busRoute, (p, m) => m?.map === 'lanternside' && m.x / TILE > 4 && m.x / TILE < 8 && Math.cos(p.angle) > 0.99, g);
  bus.state.dwellUntil = 0;
  bus.state.lastStop = null;
  T.place(bus);
  g.changeMap('lanternside', 'east_road');
  g.player.x = bus.x + 220;
  g.player.y = bus.y;
  let honked = false;
  g.bus.on('transit:honk', () => { honked = true; });
  const d0 = bus.dist;
  frames(g, 7);
  assert.ok(bus.dist - d0 < 220, 'it stopped short of you');
  assert.ok(honked, 'and (after a while) honked — once');
  g.player.y += 3 * TILE; // step onto the pavement
  frames(g, 3);
  assert.ok(bus.dist - d0 > 300, 'then carried on');
});

test('traffic circles the city and the coast road, and stops for people', () => {
  const g = fresh();
  const T = g.transit;
  const cars = T.followers.filter((f) => f.kind === 'traffic' && !f.loop.startsWith('lariat'));
  assert.ok(cars.length >= 5 && cars.length <= 8, `${cars.length} cars: fewer than before`);
  assert.equal(T.followers.filter((f) => f.kind === 'traffic' && f.loop.startsWith('lariat')).length, 3, 'and three round Lariat\'s blocks (v0.29.1)');
  assert.ok(cars.some((f) => f.map === 'halvermouth') && cars.some((f) => ['westbrook', 'lanternside', 'ober_fields'].includes(f.map)));
  g.changeMap('halvermouth', 'east_gate');
  const before = cars.map((f) => f.dist);
  frames(g, 3);
  assert.ok(cars.filter((f, i) => f.dist !== before[i]).length >= cars.length - 3, 'they drive (some may be at a red light)');
  // carjack one that has stopped
  const f = cars.find((c) => c.map === 'halvermouth');
  f.speed = 0;
  f.max = 0;
  g.player.x = f.x + Math.cos(f.angle + Math.PI / 2) * 40;
  g.player.y = f.y + Math.sin(f.angle + Math.PI / 2) * 40;
  const crimes = [];
  g.bus.on('crime', (e) => crimes.push(e.fact));
  const t = g.interactables().find((x) => x.kind === 'carjack');
  assert.ok(t, 'carjack offered');
  g.interact(t);
  assert.ok(g.player.driving, 'you\'re driving it');
  assert.ok(g.vehicles.driving().stolen);
  assert.ok(crimes.includes('fact_player_car_theft'));
  assert.ok(!T.followers.includes(f), 'it left the traffic');
});

test('your car can\'t drive through traffic', () => {
  const g = fresh();
  const f = g.transit.followers.find((x) => x.kind === 'traffic' && x.map === 'halvermouth');
  assert.ok(g.vehicles.carAt(g.maps.get('halvermouth'), f.x, f.y, f.angle, 60, 30));
});

test('buses keep running while you\'re away, and survive save/load (with you on board)', () => {
  const g = fresh();
  const T = g.transit;
  const d0 = T.bus(1).dist;
  g.skipTime(30);
  assert.notEqual(T.bus(1).dist, d0);
  atStop(g, 'stop_lanternside');
  T.waitFor('stop_lanternside');
  T.board(T.boardable().idx);
  frames(g, 12);
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(data);
  g2.transit.setup();
  assert.equal(g2.player.riding, g.player.riding);
  assert.equal(Math.round(g2.transit.bus(g.player.riding).dist), Math.round(T.bus(g.player.riding).dist));
});
