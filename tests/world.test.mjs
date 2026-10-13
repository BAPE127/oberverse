import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, TILE } from './helpers.mjs';
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
