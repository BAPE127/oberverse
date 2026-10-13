import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage, loadSettings, saveSettings, DEFAULT_SETTINGS } from '../src/save/saveManager.js';
import { validateSave, makeEnvelope } from '../src/save/saveSchema.js';
import { migrate } from '../src/save/migrations.js';
import { SAVE_SCHEMA_VERSION } from '../src/core/version.js';
import { remember } from '../src/sim/memory.js';

function richGame() {
  const g = newGame(99);
  setTime(g, 1, '10:00');
  g.inventory.add('item_crowbar');
  g.player.money = 77;
  g.quests.start('q_dark_lamp');
  const osric = g.npcs.get('npc_osric');
  g.relationships.adjust(osric, 'player', { trust: 33 });
  remember(osric, { text: 'A significant thing.', tag: 'sig', importance: 9 }, g.clock.total);
  g.knowledge.learn(g.player, 'fact_hatch_exists', { kind: 'rumor', at: 1 });
  g.setFlag('test_flag', 3);
  g.world.shops.shop_kettle.stock.item_scone = 1;
  run(g, 30);
  return g;
}

test('save → load round trip preserves world state', () => {
  const g = richGame();
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  const r = sm.load('slot1', g2);
  assert.ok(r.ok, r.errors?.join());
  assert.equal(g2.player.money, 77);
  assert.equal(g2.inventory.count('item_crowbar'), 1);
  assert.equal(g2.clock.total, g.clock.total);
  assert.equal(g2.quests.state('q_dark_lamp').stage, 'find_way_in');
  assert.equal(g2.npcs.get('npc_osric').relationships.player.trust, g.npcs.get('npc_osric').relationships.player.trust);
  assert.ok(g2.npcs.get('npc_osric').memory.significant.some((m) => m.tag === 'sig'));
  assert.equal(g2.player.knowledge.fact_hatch_exists.kind, 'rumor');
  assert.equal(g2.getFlag('test_flag'), 3);
  assert.equal(g2.world.shops.shop_kettle.stock.item_scone, 1);
  assert.equal(g2.npcs.get('npc_osric').profile.id, 'npc_osric', 'profile reattached');
  // simulation continues after load
  run(g2, 120);
  assert.equal(g2.warnings.length, 0);
});

test('a corrupt save falls back to the backup instead of being destroyed', () => {
  const g = richGame();
  const storage = new MemoryStorage();
  const sm = new SaveManager(storage);
  sm.save('slot2', g);
  g.player.money = 5;
  sm.save('slot2', g); // previous save kept as .bak
  storage.setItem('oberverse.save.slot2', '{"format":"oberverse-save", "trunc');
  const g2 = new Game(CONTENT);
  const r = sm.load('slot2', g2);
  assert.ok(r.ok);
  assert.ok(r.usedBackup);
  assert.equal(g2.player.money, 77);
  assert.ok(storage.getItem('oberverse.save.slot2'), 'corrupt file left in place for inspection');
});

test('validation repairs optional fields and rejects broken essentials', () => {
  const g = richGame();
  const env = JSON.parse(JSON.stringify(makeEnvelope(g.serialize(), g.saveMeta(), '0.1.0')));
  delete env.state.player.inventory;
  delete env.state.npcs.npc_mags.memory;
  const r = validateSave(env);
  assert.ok(r.ok);
  assert.ok(r.warnings.length >= 2);
  assert.deepEqual(env.state.player.inventory, {});
  const bad = JSON.parse(JSON.stringify(env));
  bad.state.player.x = 'nowhere';
  assert.ok(!validateSave(bad).ok);
  assert.ok(!validateSave({ format: 'other' }).ok);
  const future = { ...env, saveVersion: SAVE_SCHEMA_VERSION + 1 };
  assert.match(validateSave(future).errors.join(), /newer/);
});

test('migrations run in order and are required', () => {
  const save = { saveVersion: 1, state: { player: {} } };
  const fake = [
    { from: 1, describe: 'add title', up: (s) => { s.state.player.title = 'none'; return s; } },
    { from: 2, describe: 'rename', up: (s) => { s.state.player.honorific = s.state.player.title; delete s.state.player.title; return s; } },
  ];
  const { save: out, applied } = migrate(save, 3, fake);
  assert.equal(out.saveVersion, 3);
  assert.equal(out.state.player.honorific, 'none');
  assert.equal(applied.length, 2);
  assert.throws(() => migrate({ saveVersion: 1, state: { player: {} } }, 3, [fake[0]]), /No migration/);
});

test('saves from a world missing new characters still load (forward-compatible content)', () => {
  const g = richGame();
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot3', g);
  const raw = JSON.parse(sm.storage.getItem('oberverse.save.slot3'));
  delete raw.state.npcs.npc_tibbs; // e.g. a save from before Tibbs existed
  delete raw.state.world.containers.ct_workshop_crate;
  sm.storage.setItem('oberverse.save.slot3', JSON.stringify(raw));
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot3', g2).ok);
  assert.ok(g2.npcs.get('npc_tibbs'), 'missing character rebuilt from content');
  assert.ok(g2.world.containers.ct_workshop_crate, 'missing container rebuilt');
});

test('import/export and slot listing', () => {
  const g = richGame();
  const sm = new SaveManager(new MemoryStorage());
  sm.save('auto', g);
  const raw = sm.exportSlot('auto');
  assert.ok(sm.importToSlot('slot1', raw).ok);
  assert.ok(!sm.importToSlot('slot2', 'not json').ok);
  const list = sm.list();
  assert.equal(list.find((s) => s.slot === 'slot1').meta.playerName, 'Tester');
  assert.ok(sm.mostRecent());
});

test('settings persist with defaults for missing keys', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
  saveSettings({ music: 0.1 }, storage);
  const s = loadSettings(storage);
  assert.equal(s.music, 0.1);
  assert.equal(s.sfx, DEFAULT_SETTINGS.sfx);
  storage.setItem('oberverse.settings', '{broken');
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
});

test('committed schema-1 fixture still loads with progress intact', async () => {
  const { readFileSync } = await import('node:fs');
  const raw = readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.importToSlot('slot1', raw).ok);
  const g = new Game(CONTENT);
  const r = sm.load('slot1', g);
  assert.ok(r.ok, r.errors?.join());
  assert.equal(g.player.name, 'Fixture');
  assert.equal(g.player.money, 31);
  assert.equal(g.inventory.count('item_lucky_spanner'), 1);
  assert.equal(g.quests.state('q_lucky_spanner').stage, 'return');
  assert.equal(g.quests.state('q_dark_lamp').state, 'active');
  assert.ok(g.npcs.get('npc_osric').relationships.player.trust >= 12);
  assert.ok(g.knowledge.knows(g.player, 'fact_osric_sweet_tooth'));
  run(g, 60);
  assert.equal(g.warnings.length, 0);
});
