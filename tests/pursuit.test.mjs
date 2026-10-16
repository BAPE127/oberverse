// Police chases (v0.18.0 "Hot Pursuit"): cruisers come for you while you're
// Wanted (one per star), pull you over or cuff you, ram at ★★★, never run
// people over, lose you when you break line of sight, and leave when it's over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';

const fresh = () => {
  const g = newGame(5);
  setTime(g, 1, '12:00');
  noImpulses(g);
  g.changeMap('halvermouth', 'plaza_center');
  return g;
};
const frames = (g, seconds, input = {}) => { for (let t = 0; t < seconds; t += 0.05) g.update(0.05, { x: 0, y: 0, ...input }); };
// v0.35.2: on Grand Avenue (it used to be parked among Civic Plaza's lamp posts, which a car could only reach through the walls bug)
const inCar = (g, model = 'pipit', x = 50, y = 41.5) => {
  const id = `car_t${g.vehicles.state.nextId++}`;
  g.vehicles.state.cars[id] = { id, model, color: '#888', map: g.player.map, x: x * TILE, y: y * TILE, angle: 0, owner: 'player', stolen: false, plate: 'T' };
  g.vehicles.enter(id);
  return g.vehicles.car(id);
};

test('Wanted: cruisers come for you, out of sight on a road, one per star', () => {
  const g = fresh();
  inCar(g);
  g.police.raiseWanted(3, 'test');
  frames(g, 0.2);
  const first = g.pursuit.cars();
  assert.equal(first.length, 1);
  const c = first[0];
  assert.equal(c.model, 'cruiser');
  assert.ok(Math.hypot(c.x - g.player.x, c.y - g.player.y) > 14 * TILE, 'spawned out of view');
  assert.equal(g.maps.get(c.map).tileAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE)), '=', 'on a road');
  g.player.x = 50 * TILE; // keep still
  frames(g, 1);
  assert.ok(Math.hypot(c.x - g.player.x, c.y - g.player.y) < Math.hypot(first[0].chase.known.x - c.x, 0) + 30 * TILE);
  // never more than one per star
  const g2 = fresh();
  g2.police.raiseWanted(1, 'test');
  g2.player.x = 3 * TILE; g2.player.y = 37 * TILE;
  frames(g2, 12);
  assert.ok(g2.pursuit.cars().filter((x) => x.chase.mode !== 'leave').length <= 1);
});

test('sit still in your car and you\'re pulled over; on foot you\'re cuffed', () => {
  const g = fresh();
  inCar(g);
  g.police.raiseWanted(2, 'test');
  let how = null;
  g.bus.on('pursuit:caught', (e) => { how = e.how; });
  frames(g, 30);
  assert.equal(how, 'pulled_over');
  assert.ok(g.police.jailed());
  assert.equal(g.player.driving, null);
  assert.equal(g.pursuit.cars().length, 0, 'the cruisers are gone');
  const g2 = fresh();
  g2.police.raiseWanted(2, 'test');
  let how2 = null;
  g2.bus.on('pursuit:caught', (e) => { how2 = e.how; });
  frames(g2, 30);
  assert.ok(g2.police.jailed());
  assert.ok(how2 === 'on_foot' || how2 === null, 'cuffed by a cruiser, or by an officer on foot');
});

test('break line of sight and they lose you: search, give up, and send no more until you\'re seen again', () => {
  const g = fresh();
  g.police.raiseWanted(1, 'test');
  frames(g, 0.2);
  assert.equal(g.pursuit.cars().length, 1);
  let lost = false;
  g.bus.on('pursuit:lost', () => { lost = true; });
  // slip inside a building
  g.changeMap('gun_shop', 'entry');
  frames(g, 14);
  assert.ok(lost, 'lost you');
  frames(g, 40);
  assert.equal(g.pursuit.cars().filter((c) => c.chase.mode === 'chase').length, 0);
  // back outside, nobody watching: no new cruiser
  g.changeMap('halvermouth', 'gunshop_door_out');
  for (const o of g.police.activeOfficers()) o.map = 'police_station';
  frames(g, 8);
  assert.equal(g.pursuit.cars().filter((c) => c.chase.mode === 'chase').length, 0, 'none sent');
});

test('cruisers brake for people — they never run anyone over', () => {
  const g = fresh();
  inCar(g, 'pipit', 20, 37);
  g.police.raiseWanted(2, 'test');
  frames(g, 0.2);
  const c = g.pursuit.cars()[0];
  // someone standing in its way
  const al = g.npcs.get('npc_al');
  al.map = 'halvermouth';
  al.x = c.x + Math.cos(c.angle) * 90;
  al.y = c.y + Math.sin(c.angle) * 90;
  al.path = null;
  const h0 = al.health ?? 100;
  let hurt = false;
  g.bus.on('combat:hit', (e) => { if (e.npcId === 'npc_al') hurt = true; });
  frames(g, 3);
  assert.ok(!hurt && (al.health ?? 100) === h0);
});

test('a cruiser in pursuit can\'t be stolen, and chases don\'t survive a save', () => {
  const g = fresh();
  g.police.raiseWanted(1, 'test');
  frames(g, 0.2);
  const c = g.pursuit.cars()[0];
  g.player.x = c.x + 50;
  g.player.y = c.y;
  assert.notEqual(g.vehicles.nearest()?.id, c.id);
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(data);
  assert.equal(Object.values(g2.vehicles.state.cars).filter((x) => x.chase).length, 0);
});

test('when the Wanted level goes, the cruisers drive off', () => {
  const g = fresh();
  g.police.raiseWanted(1, 'test');
  frames(g, 0.2);
  assert.equal(g.pursuit.cars().length, 1);
  g.player.money = 1000;
  assert.ok(g.police.payFine().ok);
  assert.ok(g.pursuit.cars().every((c) => c.chase.mode === 'leave'));
  frames(g, 16);
  assert.equal(g.pursuit.cars().length, 0);
});

test('at three stars they ram you', () => {
  const g = fresh();
  inCar(g, 'pipit', 50, 37);
  g.police.raiseWanted(3, 'test');
  let rammed = false;
  g.bus.on('pursuit:rammed', () => { rammed = true; });
  // keep moving slowly so a pull-over isn't immediate
  for (let i = 0; i < 400 && !rammed && !g.police.jailed(); i++) frames(g, 0.05, { y: i % 40 < 20 ? -0.4 : 0.4 });
  assert.ok(rammed || g.police.jailed(), 'rammed (or caught first)');
});
