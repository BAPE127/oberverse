import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, TILE, setTime } from './helpers.mjs';
import { findPath, routeBetweenMaps } from '../src/world/pathfinding.js';

test('A* finds a path inside the café around the counter', () => {
  const g = newGame();
  const cafe = g.maps.get('cafe');
  const path = findPath(cafe, 6, 8, 4, 2, null);
  assert.ok(path && path.length > 0);
  for (const p of path) assert.ok(!cafe.blockedTile(p.x, p.y), `path crosses blocked tile ${p.x},${p.y}`);
});

test('routing between maps goes through Lanternside', () => {
  const g = newGame();
  const route = routeBetweenMaps(g.maps, 'cafe', 'civic_office', { canPass: () => true });
  assert.deepEqual(route.map((r) => r.map), ['cafe', 'lanternside']);
});

test('the player cannot walk through walls', () => {
  const g = newGame();
  const startX = g.player.x;
  for (let i = 0; i < 240; i++) g.update(1 / 60, { x: -1, y: 0 });
  assert.ok(g.player.x < startX, 'moved left');
  assert.ok(g.player.x >= TILE + 7, 'stopped at the wall');
  assert.equal(g.player.map, 'player_flat');
});

test('walking through the flat door reaches Lanternside', () => {
  const g = newGame();
  for (let i = 0; i < 180 && g.player.map === 'player_flat'; i++) g.update(1 / 60, { x: 0, y: 1 });
  assert.equal(g.player.map, 'lanternside');
  assert.ok(g.player.discovered.areas.area_brindle, 'area discovered');
});

test('locked doors block the player and closing hours apply', () => {
  const g = newGame();
  const door = g.maps.get('lanternside').doors.find((d) => d.id === 'door_b_civic');
  g.clock.total = 10 * 60;
  assert.ok(g.playerCanPass(door), 'civic office open at 10:00');
  g.clock.total = 20 * 60;
  assert.ok(!g.playerCanPass(door), 'civic office closed at 20:00');
  const lh = g.maps.get('lanternside').doors.find((d) => d.id === 'door_b_lighthouse');
  assert.ok(!g.playerCanPass(lh));
  g.inventory.add('item_lighthouse_key');
  assert.ok(g.playerCanPass(lh), 'key opens the lighthouse');
  const osric = g.npcs.get('npc_osric');
  assert.ok(g.npcCanPass(osric, door), 'owner can pass after hours');
});

test('interactables prefer what the player faces', () => {
  const g = newGame();
  g.player.x = 4.5 * TILE;
  g.player.y = 1.8 * TILE;
  g.player.facing = 'right';
  const top = g.interactables()[0];
  assert.equal(top.id, 'flat_desk');
});

test('Lanternside and the Ober Fields are one continuous space: walk straight across', () => {
  const g = newGame();
  g.changeMap('lanternside', 'east_road');
  g.player.y = 13.6 * TILE; // the north lane of the (four-tile) road
  const seen = [];
  const off = g.mapOffset('lanternside', 'ober_fields');
  assert.equal(off.x, (g.maps.get('lanternside').width - 1) * TILE);
  const worldX = () => g.player.x + (g.player.map === 'ober_fields' ? off.x : 0);
  let maxStep = 0;
  for (let i = 0; i < 600 && g.player.map === 'lanternside'; i++) {
    const before = worldX();
    g.update(1 / 60, { x: 1, y: 0 });
    maxStep = Math.max(maxStep, Math.abs(worldX() - before));
  }
  assert.equal(g.player.map, 'ober_fields');
  // the player's world position is continuous across the seam (no jump to a spawn spot)
  assert.ok(maxStep < 6, `largest single-frame move was ${maxStep}px`);
  for (let i = 0; i < 60; i++) { g.update(1 / 60, { x: 1, y: 0 }); seen.push(g.player.map); }
  assert.ok(seen.every((m) => m === 'ober_fields'), 'no bouncing back at the seam');
  for (let i = 0; i < 400 && g.player.map === 'ober_fields'; i++) g.update(1 / 60, { x: -1, y: 0 });
  assert.equal(g.player.map, 'lanternside', 'and back again');
  // seams are walked, never offered as "Enter …" prompts
  g.player.x = (g.maps.get('lanternside').width - 1.5) * TILE;
  assert.ok(!g.interactables().some((t) => t.kind === 'door'));
});

test('the seam follows walkable ground only (no crossing on water)', () => {
  const g = newGame();
  const L = g.maps.get('lanternside');
  const seams = L.doors.filter((d) => d.seamless && !d.portal && d.x === 0).map((d) => d.y);
  const rows = (ch) => [...Array(L.height).keys()].filter((y) => L.tileAt(0, y) === ch);
  assert.equal(rows('=').length, 4, 'a four-tile road at the west edge');
  assert.ok(rows('=').every((y) => seams.includes(y)), 'the (four-tile) road crosses');
  assert.ok(rows('~').length && !rows('~').some((y) => seams.includes(y)), 'canal and harbour do not');
  assert.deepEqual(g.neighbors('lanternside').filter((n) => n.map.kind !== 'interior').map((n) => n.map.id).sort(), ['ober_fields', 'westbrook']);
  assert.ok(g.neighbors('cafe').some((n) => n.map.id === 'lanternside'), 'v0.47.0: the café sits on Canal Row, seen around you');
});

test('NPCs walk across the seam physically when the player is watching', () => {
  const g = newGame(6);
  setTime(g, 2, '15:25'); // Sir Moneybucks heads home from the Quay at 15:30
  g.changeMap('lanternside', 'east_road');
  const mb = g.npcs.get('npc_moneybucks');
  assert.equal(mb.map, 'lanternside');
  let crossedAt = null;
  for (let i = 0; i < 3000 && !crossedAt; i++) {
    const before = { map: mb.map, x: mb.x, y: mb.y };
    g.update(0.1, { x: 0, y: 0 });
    if (before.map === 'lanternside' && mb.map === 'ober_fields') crossedAt = { before, after: { x: mb.x, y: mb.y } };
  }
  assert.ok(crossedAt, 'he walked into the Ober Fields');
  const off = g.mapOffset('lanternside', 'ober_fields');
  assert.ok(Math.abs(crossedAt.after.x + off.x - crossedAt.before.x) < 40, 'no teleport across the seam');
  assert.ok(Math.abs(crossedAt.after.y - crossedAt.before.y) < 40);
});
