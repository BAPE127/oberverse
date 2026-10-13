// Halvermouth (v0.5.0, map-only): a separate region entered through gateways,
// with its key civic buildings, districts and interiors reachable on foot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game, TILE } from './helpers.mjs';
import { findPath } from '../src/world/pathfinding.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { readFileSync } from 'node:fs';

const walk = (g, dir, seconds, until) => {
  for (let i = 0; i < seconds * 20; i++) {
    g.update(0.05, dir);
    if (until && until()) return true;
  }
  return until ? until() : true;
};
const tile = (p) => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)];

test('Halvermouth is its own big region, not stitched to the coast', () => {
  const g = newGame();
  const city = g.maps.get('halvermouth');
  assert.ok(city.width >= 100 && city.height >= 70, 'a sprawling map');
  assert.equal(CONTENT.regions.city.name, 'Halvermouth');
  assert.equal(g.neighbors('halvermouth').length, 0);
  assert.ok(!g.neighbors('westbrook').some((n) => n.map.id === 'halvermouth'));
  assert.ok(!city.doors.some((d) => d.seamless));
});

test('the road west from Westbrook loads the city; the East Gate leads back', () => {
  const g = newGame();
  g.changeMap('westbrook', 'west_gate');
  assert.ok(walk(g, { x: -1, y: 0 }, 6, () => g.player.map === 'halvermouth'), 'walked into Halvermouth');
  assert.deepEqual(tile(g.player), [109, 36]);
  assert.ok(walk(g, { x: 1, y: 0 }, 6, () => g.player.map === 'westbrook'), 'walked back out to Westbrook');
  assert.equal(tile(g.player)[0], 1);
});

test('it has skyscrapers, the requested civic buildings and the slums', () => {
  const city = CONTENT.maps.halvermouth;
  const towers = city.buildings.filter((b) => b.tower);
  assert.ok(towers.length >= 10, `${towers.length} skyscrapers`);
  assert.ok(towers.some((b) => b.tower >= 25), 'at least one very tall tower');
  const byId = Object.fromEntries(city.buildings.map((b) => [b.id, b]));
  assert.equal(byId.b_hall_of_justice.door.to.map, 'hall_of_justice');
  assert.match(byId.b_hall_of_justice.mapLabel, /Mayor/);
  assert.equal(byId.b_police.door.to.map, 'police_station');
  assert.equal(byId.b_gun_shop.door.to.map, 'gun_shop');
  const areas = city.areas.map((a) => a.name);
  for (const name of ['The Sumps', 'Civic Plaza', 'The Financial District', 'Precinct Row', 'Iron Row']) assert.ok(areas.includes(name), name);
  // the Hall of Justice sits in the middle of the city
  const hall = byId.b_hall_of_justice;
  assert.ok(Math.abs(hall.x + hall.w / 2 - city.tiles[0].length / 2) < 12);
  // the Sumps really are run-down: mud ground, shacks, fires, tents
  const sumps = city.areas.find((a) => a.name === 'The Sumps');
  const inSumps = (o) => o.x >= sumps.x && o.x < sumps.x + sumps.w && o.y >= sumps.y && o.y < sumps.y + sumps.h;
  assert.ok(city.buildings.filter((b) => b.shabby && inSumps(b)).length >= 12);
  for (const t of ['barrelfire', 'tent', 'trash']) assert.ok(city.props.some((p) => p.type === t && inSumps(p)), t);
});

test('every open building in the city can be reached on foot from the East Gate, and back', () => {
  const g = newGame();
  const city = g.maps.get('halvermouth');
  const actor = { canPass: () => true };
  const gate = city.spot('east_gate');
  for (const d of city.doors.filter((x) => x.to && !x.gateway)) {
    const path = findPath(city, gate.x, gate.y, d.x, d.y, actor, 20000);
    assert.ok(path, `door ${d.id} reachable`);
    const inside = g.maps.get(d.to.map);
    const entry = inside.spot(d.to.spot);
    const exit = inside.doors.find((x) => x.to?.map === 'halvermouth');
    assert.ok(exit, `${inside.id} has a way out`);
    assert.ok(findPath(inside, entry.x, entry.y, exit.x, exit.y, actor), `${inside.id}: entry to exit`);
    assert.ok(city.spot(exit.to.spot), `${inside.id} exits to a real spot`);
  }
  // the Sumps and the docks are reachable too
  for (const s of ['mission_front', 'docks_quay', 'park_center', 'sumps_gate']) {
    const t = city.spot(s);
    assert.ok(findPath(city, gate.x, gate.y, t.x, t.y, actor, 20000), s);
  }
});

test('opening hours: the Hall of Justice and gun shop keep hours; the police never close', () => {
  const g = newGame();
  const doorTo = (map) => g.maps.get('halvermouth').doors.find((d) => d.to?.map === map);
  g.clock.total = 1440 + 3 * 60; // 03:00
  assert.ok(!g.playerCanPass(doorTo('hall_of_justice')));
  assert.ok(!g.playerCanPass(doorTo('gun_shop')));
  assert.ok(g.playerCanPass(doorTo('police_station')));
  g.clock.total = 1440 + 11 * 60;
  assert.ok(g.playerCanPass(doorTo('hall_of_justice')));
  assert.ok(g.playerCanPass(doorTo('gun_shop')));
  // the skyscrapers are closed for now, with a reason
  const ober = g.maps.get('halvermouth').doors.find((d) => d.building === 't_ober');
  assert.match(g.doorLockReason(ober, () => false), /Appointments only/);
});

test('saving in the city and loading old saves both work', () => {
  const g = newGame();
  g.changeMap('halvermouth', 'plaza_center');
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT, { seed: 2 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(g2.player.map, 'halvermouth');
  const raw = readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8');
  assert.ok(sm.importToSlot('slot2', raw).ok);
  const g3 = new Game(CONTENT, { seed: 3 });
  assert.ok(sm.load('slot2', g3).ok);
  assert.ok(g3.maps.get('halvermouth'));
});
