import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, TILE, noImpulses } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';

const say = (g, npc, ...choices) => {
  const s = new DialogueSession(g, npc);
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return node;
};

function atLighthouseDoor(g) {
  g.changeMap('lanternside', 'lighthouse_door_out');
  g.player.facing = 'up';
}
function walkUpIntoDoor(g) {
  for (let i = 0; i < 120 && g.player.map === 'lanternside'; i++) g.update(1 / 60, { x: 0, y: -1 });
}

test('Approach 1 — permission: earn Osric\'s trust and file a formal request', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  say(g, 'npc_mags', 'topic:t_mags_lighthouse');
  g.inventory.add('item_honey_bun', 1);
  say(g, 'npc_osric', 'gift:item_honey_bun');
  // Build further trust through the daily coffee job
  g.quests.start('job_cafe_delivery');
  g.inventory.add('item_coffee_order');
  say(g, 'npc_osric', 'topic:t_osric_coffee');
  assert.equal(g.quests.state('job_cafe_delivery').state, 'completed');
  const osric = g.npcs.get('npc_osric');
  g.relationships.adjust(osric, 'player', { trust: 25 - osric.relationships.player.trust });
  const node = say(g, 'npc_osric', 'topic:t_osric_request', 'choice:c_formal');
  assert.match(node.pages.join(' '), /Form 12-C/);
  assert.ok(g.getFlag('lighthouse_permission'));
  assert.equal(g.inventory.count('item_lighthouse_key'), 1);
  assert.ok(!g.player.stolen.item_lighthouse_key, 'key was given, not stolen');
  atLighthouseDoor(g);
  walkUpIntoDoor(g);
  assert.equal(g.player.map, 'lighthouse');
  assert.equal(g.quests.state('q_dark_lamp').stage, 'search');
  assert.ok(!g.getFlag('trespassed_lighthouse'), 'legal entry is not trespass');
});

test('Approach 2 — stealth: take the key while Osric is at lunch; he notices later', () => {
  const g = newGame(5);
  setTime(g, 1, '09:30');
  g.changeMap('civic_office', 'entry');
  run(g, 2); // Osric sees the player in the office
  setTime(g, 1, '12:20');
  run(g, 1);
  assert.equal(g.npcs.get('npc_osric').map, 'cafe', 'Osric is at lunch');
  const r = g.takeFromContainer('ct_civic_desk', 'item_lighthouse_key');
  assert.ok(r.ok && r.stolen);
  assert.equal(g.player.stolen.item_lighthouse_key, 'npc_osric');
  // Leave and wait for Osric to come back to his desk
  g.changeMap('lanternside', 'square_bench');
  run(g, 90, 1);
  const osric = g.npcs.get('npc_osric');
  assert.ok(g.knowledge.knows(osric, 'fact_key_missing'), 'Osric discovered the missing key');
  assert.ok(g.knowledge.knows(osric, 'fact_player_suspected_key'), 'he remembers seeing the player in the office');
  assert.ok(osric.relationships.player.suspicion > 10);
  // Recoverable: confess and return it
  const node = say(g, 'npc_osric', 'topic:t_osric_return_stolen', 'choice:c_confess');
  assert.match(node.pages.join(' '), /Mitigating/);
  assert.equal(g.world.containers.ct_civic_desk.items.item_lighthouse_key, 1);
});

test('Approach 2b — caught in the act: the owner blocks theft', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  run(g, 1);
  g.changeMap('civic_office', 'entry');
  g.player.x = 9 * TILE; g.player.y = 4.6 * TILE;
  const r = g.takeFromContainer('ct_civic_desk', 'item_lighthouse_key');
  assert.ok(!r.ok);
  assert.equal(g.inventory.count('item_lighthouse_key'), 0);
  assert.ok(g.npcs.get('npc_osric').relationships.player.suspicion > 5);
});

test('Approach 3 — the maintenance hatch with a crowbar (noisy, may be witnessed)', () => {
  const g = newGame();
  setTime(g, 1, '14:00');
  g.inventory.add('item_crowbar');
  g.changeMap('lanternside', 'lighthouse_gate');
  g.player.x = 13.5 * TILE; g.player.y = 38.6 * TILE; g.player.facing = 'left';
  const target = g.interactables().find((t) => t.id === 'lighthouse_hatch');
  assert.ok(target, 'hatch is interactable');
  const res = g.interact(target);
  assert.match(res.text, /gives way/);
  g.interact(target);
  assert.equal(g.player.map, 'lighthouse');
  assert.equal(g.quests.state('q_dark_lamp').state, 'active', 'entering starts the quest if needed');
  assert.ok(g.getFlag('trespassed_lighthouse'));
});

test('Approach 3b — prying the hatch in front of Osric on patrol is witnessed', () => {
  const g = newGame(2);
  noImpulses(g, ['npc_osric']); // he sometimes stays late instead; this test needs him on patrol
  setTime(g, 1, '17:10');
  g.changeMap('lanternside', 'lighthouse_gate');
  const osric = g.npcs.get('npc_osric');
  run(g, 25, 0.25);
  assert.equal(osric.map, 'lanternside');
  g.inventory.add('item_crowbar');
  g.player.x = 13.5 * TILE; g.player.y = 38.6 * TILE;
  const before = g.player.reputation.fac_civic;
  g.interact({ kind: 'prop', id: 'lighthouse_hatch' });
  assert.ok(g.knowledge.knows(osric, 'fact_player_trespassed_lighthouse'));
  assert.ok(g.player.reputation.fac_civic < before);
});

test('The Dark Lamp resolves through either Mags or Osric', () => {
  for (const [npc, topic, outcome] of [['npc_mags', 't_mags_logbook', 'told_mags'], ['npc_osric', 't_osric_logbook', 'told_osric']]) {
    const g = newGame();
    setTime(g, 1, '10:00');
    g.quests.start('q_dark_lamp');
    g.changeMap('lighthouse', 'entry');
    const r = g.interact({ kind: 'prop', id: 'lh_lectern' });
    assert.equal(r.type, 'read');
    assert.equal(g.quests.state('q_dark_lamp').stage, 'decide');
    const money = g.player.money;
    say(g, npc, `topic:${topic}`);
    assert.equal(g.quests.state('q_dark_lamp').state, 'completed');
    assert.equal(g.quests.state('q_dark_lamp').outcome, outcome);
    assert.ok(g.player.money > money);
    assert.ok(g.knowledge.knows(g.npcs.get(npc), 'fact_keeper_log'));
  }
});

test('The Lucky Spanner: find it in the park and choose how to return it', () => {
  const g = newGame();
  say(g, 'npc_tibbs', 'topic:t_tibbs_spanner');
  assert.equal(g.quests.state('q_lucky_spanner').stage, 'find');
  g.changeMap('lanternside', 'park_pond');
  const res = g.interact({ kind: 'prop', id: 'spanner_spot' });
  assert.match(res.text, /Lucky Spanner/);
  assert.equal(g.quests.state('q_lucky_spanner').stage, 'return');
  say(g, 'npc_tibbs', 'topic:t_tibbs_spanner_return', 'choice:c_give_spanner');
  assert.equal(g.quests.state('q_lucky_spanner').state, 'completed');
  assert.equal(g.inventory.count('item_crowbar'), 1);
  assert.ok(g.knowledge.knows(g.player, 'fact_hatch_exists'));
  assert.ok(g.player.reputation.fac_quay > 0);
});

test('Jobs expire and failure is recoverable', () => {
  const g = newGame();
  setTime(g, 1, '09:00');
  g.quests.start('job_cafe_delivery');
  g.inventory.add('item_coffee_order');
  setTime(g, 1, '16:58');
  run(g, 5);
  assert.equal(g.quests.state('job_cafe_delivery').state, 'failed');
  assert.equal(g.inventory.count('item_coffee_order'), 0);
  // next day the job is available again
  setTime(g, 2, '09:00');
  assert.ok(g.quests.start('job_cafe_delivery'));
});

test('Buying and selling use money and shop stock; prices respond to friendship', () => {
  const g = newGame();
  const price = g.priceFor('shop_kettle', 'item_honey_bun');
  const stock = g.world.shops.shop_kettle.stock.item_honey_bun;
  const r = g.buy('shop_kettle', 'item_honey_bun');
  assert.ok(r.ok);
  assert.equal(g.world.shops.shop_kettle.stock.item_honey_bun, stock - 1);
  assert.equal(g.player.money, 12 - price);
  g.relationships.adjust(g.npcs.get('npc_mags'), 'player', { trust: 60, affection: 60 });
  assert.ok(g.priceFor('shop_kettle', 'item_coffee') <= 3);
  g.inventory.add('item_brass_cog');
  const s = g.sell('shop_hollow', 'item_brass_cog');
  assert.ok(s.ok);
});
