// Debug console commands (v0.7.1): testing tools reachable from the ` Debug menu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, besideNpc } from './helpers.mjs';
import { runCommand, findItem } from '../src/game/debugCommands.js';

const ok = (g, line) => {
  const r = runCommand(g, line);
  assert.ok(r.ok, `${line}: ${r.text}`);
  return r.text;
};

test('give and take items by id or by name, with counts', () => {
  const g = newGame();
  ok(g, 'give item_pistol');
  assert.equal(g.inventory.count('item_pistol'), 1);
  ok(g, 'give 9mm rounds 40');
  assert.equal(g.inventory.count('item_ammo_9mm'), 40);
  ok(g, 'give honey bun 3');
  assert.equal(g.inventory.count('item_honey_bun'), 3);
  ok(g, 'take honey bun 2');
  assert.equal(g.inventory.count('item_honey_bun'), 1);
  assert.ok(!runCommand(g, 'give unicorn').ok);
  assert.match(findItem(g, 'rounds').error, /matches \d+ items/);
  assert.equal(findItem(g, '9mm').id, 'item_ammo_9mm', 'an id match breaks the tie');
  assert.equal(g.getFlag('debug_used'), true, 'the save is marked');
});

test('money, health, energy, heal and god mode', () => {
  const g = newGame();
  ok(g, 'money 500');
  assert.equal(g.player.money, 500);
  ok(g, 'money +25');
  ok(g, 'money -100');
  assert.equal(g.player.money, 425);
  ok(g, 'health 20');
  ok(g, 'energy 5');
  assert.deepEqual([g.player.health, g.player.energy], [20, 5]);
  ok(g, 'heal');
  assert.deepEqual([g.player.health, g.player.energy], [100, 100]);
  ok(g, 'god');
  g.combat.damagePlayer(50, null);
  assert.equal(g.player.health, 100, 'god mode blocks damage');
  ok(g, 'god');
  g.combat.damagePlayer(50, null);
  assert.ok(g.player.health < 100);
});

test('weapons arms you fully loaded; ammo tops up every type', () => {
  const g = newGame();
  ok(g, 'weapons');
  for (const [id, it] of Object.entries(g.content.items)) if (it.weapon) assert.equal(g.inventory.count(id), 1, id);
  assert.equal(g.player.mags.item_shotgun, 5);
  g.combat.equip('item_smg');
  assert.equal(g.combat.ammoStatus().loaded, 30);
  ok(g, 'ammo 10');
  assert.ok(g.inventory.count('item_ammo_rifle') >= 10);
});

test('time, skip, teleport and stats', () => {
  const g = newGame();
  ok(g, 'time 22:30');
  assert.equal(g.clock.timeString, '22:30');
  const day = g.clock.day;
  ok(g, 'time 07:00');
  assert.equal(g.clock.day, day + 1, 'time only moves forward');
  ok(g, 'skip 90');
  assert.equal(g.clock.timeString, '08:30');
  ok(g, 'tp halvermouth plaza_center');
  assert.equal(g.player.map, 'halvermouth');
  assert.ok(!runCommand(g, 'tp atlantis').ok);
  ok(g, 'stat charm 5');
  assert.equal(g.player.stats.charm, 5);
  ok(g, 'rep fac_oil 30');
  assert.equal(g.player.reputation.fac_oil, 30);
  ok(g, 'flag test_flag 3');
  assert.equal(g.getFlag('test_flag'), 3);
});

test('revive brings back the dead and the knocked-out', () => {
  const g = newGame(4);
  setTime(g, 1, '09:00');
  const mags = besideNpc(g, 'npc_mags');
  g.combat.hitNpc(mags, 999, { weapon: g.combat.weaponDef('item_machete'), dir: { x: -1, y: 0 }, lethal: true });
  assert.ok(mags.dead);
  ok(g, 'revive mags');
  assert.ok(!mags.dead);
  assert.equal(mags.health, 100);
  const osric = g.npcs.get('npc_osric');
  g.combat.knockOut(osric);
  ok(g, 'revive all');
  assert.ok(!osric.downUntil);
  assert.match(ok(g, 'npcs'), /npc_mags/);
  assert.match(ok(g, 'help'), /give <item>/);
});
