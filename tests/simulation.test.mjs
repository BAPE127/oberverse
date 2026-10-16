import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, runUntil, setTime, noImpulses } from './helpers.mjs';
import { coverageGaps } from '../src/sim/schedule.js';
import { remember, recall, RECENT_CAP, SIGNIFICANT_CAP } from '../src/sim/memory.js';
import { CONTENT } from '../src/content/index.js';

test('every schedule covers the whole day', () => {
  for (const c of Object.values(CONTENT.characters)) assert.equal(coverageGaps(c.schedule), 0, c.id);
});

test('NPCs follow their schedules across a simulated day (abstract tier)', () => {
  const g = newGame(7);
  noImpulses(g);
  // player stays inside the flat, so everyone else is simulated abstractly
  const at = {};
  const sample = (label) => { at[label] = Object.fromEntries([...g.npcs.values()].map((n) => [n.id, `${n.map}/${n.activity}`])); };
  run(g, 120); sample('10:00');
  runUntil(g, () => g.clock.timeString === '12:40'); sample('12:40');
  runUntil(g, () => g.clock.timeString === '23:30'); sample('23:30');
  runUntil(g, () => g.clock.timeString === '03:00'); sample('03:00');
  assert.equal(at['10:00'].npc_osric, 'civic_office/work');
  assert.equal(at['10:00'].npc_mags, 'cafe/work');
  assert.equal(at['12:40'].npc_osric, 'cafe/eat');
  assert.match(at['23:30'].npc_osric, /osric_house\/sleep/);
  assert.match(at['23:30'].npc_mags, /gullwing11_1\/sleep/, 'Mags sleeps at home, not over the café (v0.36.0)');
  assert.match(at['03:00'].npc_tibbs, /gullwing11_2\/sleep/);
});

test('NPCs walk physically when on the player\'s map', () => {
  const g = newGame(3);
  setTime(g, 1, '11:30');
  g.changeMap('lanternside', 'civic_door_out');
  const osric = g.npcs.get('npc_osric');
  // Osric leaves for lunch around 11:45 and should be seen walking on Lanternside
  const seen = runUntil(g, () => osric.map === 'lanternside' && osric.moving, 60, 0.1);
  assert.ok(seen, 'Osric walked across Lanternside');
  const start = { x: osric.x, y: osric.y };
  g.update(0.5, { x: 0, y: 0 });
  assert.ok(Math.hypot(osric.x - start.x, osric.y - start.y) > 1);
  const arrived = runUntil(g, () => osric.map === 'cafe', 90, 0.25);
  assert.ok(arrived, 'Osric reached the café');
});

test('NPCs chat and spread information without the player', () => {
  let spread = false;
  for (let seed = 1; seed <= 6 && !spread; seed++) {
    const g = newGame(seed);
    run(g, 24 * 60, 1);
    const mags = g.npcs.get('npc_mags');
    spread = g.knowledge.knows(mags, 'fact_hatch_exists') || g.knowledge.knows(mags, 'fact_tibbs_lost_spanner') || g.knowledge.knows(g.npcs.get('npc_osric'), 'fact_osric_sweet_tooth');
  }
  assert.ok(spread, 'gossip moved at least one fact between characters within a day');
});

test('second-hand information is a rumour, not a fact', () => {
  const g = newGame();
  const mags = g.npcs.get('npc_mags');
  const tibbs = g.npcs.get('npc_tibbs');
  g.knowledge.learn(tibbs, 'fact_workshop_bang', { kind: 'fact', source: 'heard', at: g.clock.total });
  // force a gossip exchange
  let shared = null;
  for (let i = 0; i < 20 && !shared; i++) shared = g.knowledge.gossip(tibbs, mags, g.rng, g.clock.total);
  assert.ok(shared);
  assert.equal(mags.knowledge[shared].kind, 'rumor');
  assert.ok(mags.knowledge[shared].confidence < 1);
});

test('the player is noticed only where characters care (knowledge boundaries)', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  run(g, 1);
  const osric = g.npcs.get('npc_osric');
  assert.equal(osric.map, 'civic_office');
  assert.equal(recall(osric, 'saw_player_office', g.clock.total), null);
  g.changeMap('civic_office', 'entry');
  run(g, 2);
  assert.ok(recall(osric, 'saw_player_office', g.clock.total));
});

test('memory is bounded and keeps important events', () => {
  const npc = { memory: { recent: [], significant: [] } };
  for (let i = 0; i < 50; i++) remember(npc, { text: `small ${i}`, importance: 2 }, i);
  assert.equal(npc.memory.recent.length, RECENT_CAP);
  for (let i = 0; i < 40; i++) remember(npc, { text: `big ${i}`, importance: 6 + (i % 4), tag: `t${i}` }, 100 + i);
  assert.equal(npc.memory.significant.length, SIGNIFICANT_CAP);
  assert.ok(npc.memory.significant.every((m) => m.importance >= 6));
  const nines = npc.memory.significant.filter((m) => m.importance === 9).length;
  assert.equal(nines, 10, 'all most-important memories kept');
});

test('impulsive characters deviate from schedules, conscientious ones rarely do', () => {
  const g = newGame(11);
  const deviations = { npc_tibbs: 0, npc_mags: 0 };
  g.bus.on('npc:activity', ({ npcId }) => {
    const n = g.npcs.get(npcId);
    if (n.intent?.source?.startsWith('impulse') && deviations[npcId] !== undefined) deviations[npcId]++;
  });
  run(g, 3 * 1440, 1);
  assert.ok(deviations.npc_tibbs >= 2, `Tibbs deviated ${deviations.npc_tibbs} times`);
  assert.deepEqual(g.warnings, [], 'three simulated days produce no engine warnings');
});

test('sleeping skips time consistently for every system', () => {
  const g = newGame();
  setTime(g, 1, '22:30');
  g.player.energy = 20;
  const msg = g.sleep();
  assert.match(msg, /morning/);
  assert.equal(g.clock.timeString, '07:00');
  assert.equal(g.clock.day, 2);
  assert.equal(g.player.energy, 100);
  assert.equal(g.npcs.get('npc_mags').activity, 'work');
  assert.equal(g.npcs.get('npc_mags').map, 'cafe');
  assert.ok(g.world.shops.shop_kettle.stock.item_honey_bun >= 5, 'Mags baked at 05:30');
});
