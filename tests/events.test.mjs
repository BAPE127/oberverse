import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime } from './helpers.mjs';

test('event chain: a workshop bang leads to a citation only if Osric hears of it', () => {
  const g = newGame();
  setTime(g, 1, '21:30');
  run(g, 1);
  const tibbs = g.npcs.get('npc_tibbs');
  const osric = g.npcs.get('npc_osric');
  assert.equal(tibbs.activity, 'tinker');
  g.events.fire(g.content.events.ev_workshop_bang, tibbs);
  assert.ok(g.knowledge.knows(tibbs, 'fact_workshop_bang'));
  assert.equal(g.moodOf(tibbs), 'sheepish');
  assert.equal(g.world.events.pending.length, 1);
  // Osric did not hear it: the chained citation fizzles
  setTime(g, 2, '09:58');
  run(g, 4);
  assert.ok(!g.knowledge.knows(osric, 'fact_osric_citation'));
  // Again, but this time Osric is told
  g.events.fire(g.content.events.ev_workshop_bang, tibbs);
  g.knowledge.learn(osric, 'fact_workshop_bang', { kind: 'rumor', source: 'told:npc_mags', at: g.clock.total });
  setTime(g, 3, '09:58');
  g.world.events.lastFired.ev_workshop_bang = g.clock.total; // no second (random) bang to muddy the mood
  run(g, 4);
  assert.ok(g.knowledge.knows(osric, 'fact_osric_citation'));
  assert.ok(g.knowledge.knows(tibbs, 'fact_osric_citation'));
  assert.equal(g.moodOf(tibbs), 'grumpy');
  assert.equal(osric.intent.source, 'errand', 'Osric walks over to deliver it');
  assert.ok(g.getFlag('citation_posted'));
});

test('buying out the honey buns spoils Osric\'s lunch (emergent mood)', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  g.player.money = 100;
  while (g.world.shops.shop_kettle.stock.item_honey_bun > 0) g.buy('shop_kettle', 'item_honey_bun');
  run(g, 90, 1);
  const osric = g.npcs.get('npc_osric');
  assert.equal(g.moodOf(osric), 'irritable');
  assert.ok(osric.memory.recent.some((m) => m.tag === 'no_buns'));
});

test('with buns in stock Osric enjoys lunch', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  run(g, 90, 1);
  assert.equal(g.moodOf(g.npcs.get('npc_osric')), 'content');
  assert.ok(g.world.shops.shop_kettle.stock.item_honey_bun < 5);
});

test('gull heists only happen outdoors to players carrying food', () => {
  const g = newGame();
  const ev = g.content.events.ev_gull_heist;
  setTime(g, 1, '10:00');
  assert.ok(!g.events.consider(ev, { forced: true }), 'not while indoors without food');
  g.changeMap('lanternside', 'park_bench');
  g.inventory.add('item_scone', 1);
  assert.ok(g.events.consider(ev, { forced: true }));
  assert.equal(g.inventory.count('item_scone'), 0);
  assert.deepEqual(g.warnings, []);
});

test('crimes are only known by witnesses', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  g.changeMap('lanternside', 'lighthouse_gate');
  const seen = g.reportCrime({ fact: 'fact_player_trespassed_lighthouse', map: 'lanternside', x: g.player.x, y: g.player.y });
  assert.equal(seen.length, 0);
  for (const n of g.npcs.values()) assert.ok(!g.knowledge.knows(n, 'fact_player_trespassed_lighthouse'));
});
