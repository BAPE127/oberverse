// Combat (v0.6.0): melee and guns, NPC health bars, fight-or-flight, knock-outs,
// death and its consequences, the gun shop, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, besideNpc, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { isDown, npcMaxHealth } from '../src/systems/combat.js';
import { readFileSync } from 'node:fs';

/** Stand right next to an NPC (to their right), facing them, with the clock frozen-ish. */
const faceNpc = (g, id) => {
  const n = besideNpc(g, id);
  g.player.facing = 'left';
  g.player.aim = null;
  return n;
};
const hit = (g, npc, amount, weapon = null, lethal = true) => g.combat.hitNpc(npc, amount, { weapon: g.combat.weaponDef(weapon), dir: { x: -1, y: 0 }, lethal });
const tick = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) g.update(0.05, { x: 0, y: 0 }); };

test('a variety of weapons: melee and guns, each with ammunition that exists', () => {
  const weapons = Object.entries(CONTENT.items).filter(([, it]) => it.weapon);
  const melee = weapons.filter(([, it]) => it.weapon.kind === 'melee');
  const guns = weapons.filter(([, it]) => it.weapon.kind === 'gun');
  assert.ok(melee.length >= 6, `${melee.length} melee weapons`);
  assert.ok(guns.length >= 5, `${guns.length} guns`);
  for (const [, it] of guns) assert.ok(CONTENT.items[it.weapon.ammo]?.bundle > 0);
  assert.ok(guns.some(([, it]) => it.weapon.pellets > 1), 'a shotgun');
  assert.ok(guns.some(([, it]) => it.weapon.auto), 'an automatic');
  assert.ok(melee.some(([, it]) => it.weapon.lethal === false), 'a non-lethal option');
});

test('punching anyone hurts them and shows their health bar', () => {
  const g = newGame(5);
  setTime(g, 1, '10:00');
  noImpulses(g);
  const mags = faceNpc(g, 'npc_mags');
  assert.equal(g.combat.healthBar(mags), null, 'no bar before a fight');
  const r = g.combat.attack();
  assert.deepEqual(r.hits, ['npc_mags']);
  assert.ok(mags.health < 100 && mags.health >= 90);
  const bar = g.combat.healthBar(mags);
  assert.ok(bar && bar.frac < 1 && bar.frac > 0.85);
  assert.ok(g.npcs.get('npc_mags').relationships.player.trust < -20, 'she will remember that');
  assert.equal(mags.hostile.mode, 'fight', 'Mags fights back');
  assert.ok(g.interact({ kind: 'npc', id: 'npc_mags' }).type === 'message', 'no chatting mid-fight');
});

test('the timid flee, fighters fight back, and the player can be beaten', () => {
  const g = newGame(6);
  setTime(g, 1, '10:00');
  noImpulses(g);
  const osric = faceNpc(g, 'npc_osric');
  hit(g, osric, 10);
  assert.equal(osric.hostile.mode, 'flee');
  const start = { x: osric.x, y: osric.y };
  tick(g, 1.5);
  assert.ok(Math.hypot(osric.x - g.player.x, osric.y - g.player.y) > Math.hypot(start.x - g.player.x, start.y - g.player.y), 'he runs away');

  const g2 = newGame(7);
  setTime(g2, 1, '08:00'); // Gideon at the refinery
  noImpulses(g2);
  const gideon = faceNpc(g2, 'npc_gideon');
  hit(g2, gideon, 5);
  assert.equal(gideon.hostile.mode, 'fight');
  tick(g2, 3);
  assert.ok(g2.player.health < 100, 'Gideon hits back');
  g2.player.money = 40;
  g2.player.health = 1;
  tick(g2, 3);
  assert.equal(g2.player.map, 'jail', 'killed is killed: you wake up in a cell (v0.10.0)');
  assert.equal(g2.player.money, 40, 'the police take your weapons, not your money');
  assert.ok(g2.player.health >= 40);
  assert.ok(g2.world.police.jail, 'serving a sentence');
  assert.equal(g2.npcs.get('npc_gideon').hostile, null, 'the fight is over');
});

test('witnesses see an assault, talk about it, and react', () => {
  const g = newGame(8);
  setTime(g, 1, '12:30'); // Osric lunches at the café with Mags
  noImpulses(g);
  const mags = g.npcs.get('npc_mags');
  const osric = g.npcs.get('npc_osric');
  assert.equal(mags.map, 'cafe');
  assert.equal(osric.map, 'cafe');
  faceNpc(g, 'npc_mags');
  g.combat.attack();
  assert.ok(g.knowledge.knows(osric, 'fact_player_assault'), 'Osric saw it');
  assert.equal(osric.hostile?.mode, 'flee', 'and he flees');
  assert.ok(g.player.reputation.lanternside < 0);
});

test('non-lethal weapons knock people out; they wake up later, sore and scared', () => {
  const g = newGame(9);
  setTime(g, 1, '10:00');
  noImpulses(g);
  const osric = faceNpc(g, 'npc_osric');
  hit(g, osric, 500, null, false);
  assert.ok(isDown(osric, g.clock.total));
  assert.ok(!osric.dead);
  assert.match(g.interact({ kind: 'npc', id: 'npc_osric' }).text, /out cold/);
  assert.ok(g.combat.healthBar(osric), 'the bar stays up while he is out');
  run(g, 125, 1);
  assert.ok(!isDown(osric, g.clock.total), 'he came round');
  assert.equal(osric.health, Math.round(npcMaxHealth(osric) * 0.3));
});

test('lethal weapons kill: the dead stay dead, quests they gave fail, and saves remember', () => {
  const g = newGame(10);
  setTime(g, 1, '09:00');
  noImpulses(g);
  g.quests.start('job_cafe_delivery');
  const mags = faceNpc(g, 'npc_mags');
  hit(g, mags, 500, 'item_machete', true);
  assert.ok(mags.dead);
  assert.equal(g.quests.state('job_cafe_delivery').state, 'failed');
  assert.match(g.interact({ kind: 'npc', id: 'npc_mags' }).text, /dead/);
  const pos = { map: mags.map, x: mags.x, y: mags.y };
  run(g, 240, 1);
  assert.deepEqual({ map: mags.map, x: mags.x, y: mags.y }, pos, 'no more schedule');
  assert.ok(!g.npcs.get('npc_osric').chat || g.npcs.get('npc_osric').chat.with !== 'npc_mags');
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.ok(g2.npcs.get('npc_mags').dead, 'still dead after loading');
  run(g2, 60, 1);
  assert.ok(g2.npcs.get('npc_mags').dead);
});

test('buying a gun and ammo at Pipecreek Armory, loading it and shooting', () => {
  const g = newGame(11);
  g.player.money = 500;
  setTime(g, 1, '11:00'); // Lucas behind the counter
  g.changeMap('gun_shop', 'counter_front');
  assert.equal(g.interact({ kind: 'prop', id: 'gs_counter' }).type, 'shop');
  assert.ok(g.buy('shop_rook', 'item_pistol').ok);
  assert.ok(g.buy('shop_rook', 'item_ammo_9mm').ok);
  assert.equal(g.inventory.count('item_ammo_9mm'), 20, 'a box of 20');
  assert.ok(g.combat.equip('item_pistol').ok);
  assert.equal(g.combat.attack().reason, 'empty', 'it starts unloaded (and starts reloading)');
  tick(g, 2);
  assert.deepEqual(g.combat.ammoStatus(), { loaded: 12, mag: 12, reserve: 8, reloading: false });
  // a target five tiles away, in the line of fire
  setTime(g, 1, '10:00');
  noImpulses(g);
  const osric = g.npcs.get('npc_osric');
  g.changeMap(osric.map, 'entry');
  g.player.x = osric.x - 5 * TILE; // across the Civic Office, clear line of fire
  g.player.y = osric.y;
  g.player.facing = 'right';
  g.player.aim = null;
  g.combat.cooldown = 0;
  const r = g.combat.attack();
  assert.deepEqual(r.hits, ['npc_osric']);
  assert.ok(osric.health <= 80);
  assert.equal(g.combat.ammoStatus().loaded, 11);
});

test('walls stop bullets', () => {
  const g = newGame(12);
  const map = g.maps.get('lanternside');
  const b = map.buildings.find((x) => x.id === 'b_cafe') || map.buildings[0];
  const osric = g.npcs.get('npc_osric');
  g.changeMap('lanternside', 'start');
  osric.map = 'lanternside';
  osric.x = (b.x + b.w / 2) * TILE;
  osric.y = (b.y - 1.5) * TILE;
  osric.path = null;
  osric.travel = null;
  g.player.x = osric.x;
  g.player.y = (b.y + b.h + 1.5) * TILE;
  const r = g.combat.raycast(g.player.x, g.player.y - 18, { x: 0, y: -1 }, 30 * TILE);
  assert.equal(r.npc, null);
  assert.ok(r.wall);
});

test('gunfire sends bystanders running', () => {
  const g = newGame(13);
  setTime(g, 1, '12:30');
  noImpulses(g);
  faceNpc(g, 'npc_mags');
  g.inventory.add('item_revolver', 1);
  g.inventory.add('item_ammo_38', 12);
  g.combat.equip('item_revolver');
  g.player.mags.item_revolver = 6;
  g.player.aim = { x: 0, y: -1 }; // fire into the ceiling
  const r = g.combat.attack();
  assert.ok(r.ok);
  const osric = g.npcs.get('npc_osric');
  assert.equal(osric.hostile?.mode, 'flee', 'Osric runs');
  if (!r.hits.includes('npc_osric')) assert.ok(JSON.stringify(osric.memory).includes('heard_gunfire'), 'and remembers the shot');
});

test('weapons are found in the world and equipping survives saving; old saves start with fists', () => {
  assert.ok(CONTENT.containers.ct_police_lockers.items.item_baton);
  assert.ok(CONTENT.containers.ct_sumps_crate.items.item_bat);
  assert.ok(CONTENT.shops.shop_hollow.stock.item_fire_axe);
  const g = newGame();
  g.inventory.add('item_bat', 1);
  g.combat.equip('item_bat');
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT, { seed: 1 });
  sm.load('slot1', g2);
  assert.equal(g2.combat.equipped().id, 'item_bat');
  const raw = readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8');
  assert.ok(sm.importToSlot('slot2', raw).ok);
  const g3 = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot2', g3).ok);
  assert.equal(g3.combat.equipped().name, 'Fists');
  assert.equal(g3.combat.attack().ok, true, 'and can still throw a punch');
});
