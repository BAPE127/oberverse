import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { check } from '../src/sim/conditions.js';

const talk = (g, id) => {
  const s = new DialogueSession(g, id);
  return { s, node: s.start() };
};
const optionIds = (node) => node.options.map((o) => o.id);

test('first meeting greeting differs from later greetings', () => {
  const g = newGame();
  const { node } = talk(g, 'npc_mags');
  assert.match(node.pages.join(' '), /new face/i);
  const again = talk(g, 'npc_mags').node;
  assert.doesNotMatch(again.pages.join(' '), /new face/i);
  assert.ok(g.npcs.get('npc_mags').met);
});

test('each character speaks with a distinct voice', () => {
  const g = newGame();
  const lines = ['npc_mags', 'npc_osric', 'npc_tibbs'].map((id) => talk(g, id).node.pages.join(' '));
  assert.match(lines[0], /petal|duck|love/);
  assert.match(lines[1], /Clerk|state your business|patio permit/i);
  assert.match(lines[2], /Duchess|Hi!|Hello!/);
  assert.equal(new Set(lines).size, 3);
});

test('topics run effects: Mags starts The Dark Lamp', () => {
  const g = newGame();
  const { s, node } = talk(g, 'npc_mags');
  assert.ok(optionIds(node).includes('topic:t_mags_lighthouse'));
  s.choose('topic:t_mags_lighthouse');
  assert.equal(g.quests.state('q_dark_lamp').state, 'active');
  assert.ok(g.knowledge.knows(g.player, 'fact_lighthouse_dark'));
  const next = talk(g, 'npc_mags').node;
  assert.ok(!optionIds(next).includes('topic:t_mags_lighthouse'), 'topic hidden once quest started');
  assert.ok(optionIds(next).includes('topic:t_mags_lighthouse_help'));
});

test('ask about: topics, opinions, secrets and unknown subjects stay bounded', () => {
  const g = newGame();
  const { s } = talk(g, 'npc_osric');
  const opinion = s.ask('what about Mags?');
  assert.match(opinion.pages[0], /Mrs\. Pell/);
  // The permission topic is hidden (no quest yet), so "key" falls through to facts: the key's location is a secret.
  const secret = s.ask('the desk key');
  assert.ok(/restricted|record|jurisdiction|Decommissioned/i.test(secret.pages.join(' ')));
  assert.ok(!g.knowledge.knows(g.player, 'fact_osric_has_key'), 'secret not revealed to a stranger');
  const unknown = s.ask('quantum chromodynamics');
  assert.ok(unknown.pages.length === 1);
  assert.ok(!Object.keys(g.player.knowledge).some((k) => k.includes('quantum')));
});

test('characters only share facts they actually know', () => {
  const g = newGame();
  const { s } = talk(g, 'npc_osric');
  const hatch = s.ask('hatch');
  assert.ok(!g.knowledge.knows(g.player, 'fact_hatch_exists'), 'Osric does not know about the hatch');
  assert.ok(hatch.pages.length >= 1);
  const t = talk(g, 'npc_tibbs').s;
  t.ask('hatch');
  // Tibbs's lighthouse topic matches "hatch"; at low trust he rations secrets
  assert.ok(!g.knowledge.knows(g.player, 'fact_hatch_exists'));
  g.relationships.adjust(g.npcs.get('npc_tibbs'), 'player', { trust: 20 });
  talk(g, 'npc_tibbs').s.ask('hatch');
  assert.ok(g.knowledge.knows(g.player, 'fact_hatch_exists'));
});

test('gifts change relationships with diminishing returns', () => {
  const g = newGame();
  g.inventory.add('item_honey_bun', 3);
  const osric = g.npcs.get('npc_osric');
  const before = osric.relationships.player.affection;
  const { s } = talk(g, 'npc_osric');
  const r1 = s.choose('gift:item_honey_bun');
  assert.match(r1.pages.join(' '), /honey bun/i);
  const after1 = osric.relationships.player.affection;
  s.choose('gift:item_honey_bun');
  const after2 = osric.relationships.player.affection;
  assert.ok(after1 - before >= 10, 'loved gift');
  assert.ok(after2 - after1 < after1 - before, 'second gift worth less');
});

test('gossip broker trades information both ways', () => {
  const g = newGame();
  const { s } = talk(g, 'npc_mags');
  const n = s.choose('gossip');
  assert.ok(Object.keys(g.player.knowledge).length >= 1, 'Mags told the player something');
  g.knowledge.learn(g.player, 'fact_tibbs_lost_spanner', { kind: 'fact', at: 0 });
  const opts = s.choose('gossip').options.map((o) => o.id);
  assert.ok(opts.includes('tell:fact_tibbs_lost_spanner'));
  s.choose('tell:fact_tibbs_lost_spanner');
  assert.ok(g.knowledge.knows(g.npcs.get('npc_mags'), 'fact_tibbs_lost_spanner'));
  assert.equal(g.npcs.get('npc_mags').knowledge.fact_tibbs_lost_spanner.kind, 'rumor');
  assert.ok(n);
});

test('locked choices explain their requirement', () => {
  const g = newGame();
  g.quests.start('q_dark_lamp');
  const { s } = talk(g, 'npc_osric');
  const node = s.choose('topic:t_osric_request');
  const formal = node.options.find((o) => o.id === 'choice:c_formal');
  assert.ok(formal.disabled);
  assert.ok(formal.hint.length > 10);
  const persuade = node.options.find((o) => o.id === 'choice:c_persuade');
  assert.match(persuade.label, /\[Wits \d+%\]/);
});

test('moods change greetings and persuasion odds', () => {
  const g = newGame();
  const osric = g.npcs.get('npc_osric');
  g.quests.start('q_dark_lamp');
  const base = new DialogueSession(g, 'npc_osric');
  base.start();
  const chk = { stat: 'wits', base: 0.32 };
  const p0 = base.successChance(chk);
  g.setMood(osric, 'irritable', 60);
  const p1 = base.successChance(chk);
  assert.ok(p1 < p0);
  const greet = new DialogueSession(g, 'npc_osric').start();
  assert.match(greet.pages.join(' '), /deficit|mood/);
});

test('unknown condition keys fail closed', () => {
  const g = newGame();
  assert.equal(check({ notARealKey: true }, g), false);
  assert.equal(check({}, g), true);
  assert.equal(check({ any: [{ money: '>=1000' }, { money: '>=1' }] }, g), true);
  assert.equal(check({ not: { money: '>=1' } }, g), false);
  setTime(g, 1, '12:30');
  assert.equal(check({ time: { from: '12:00', to: '13:00' } }, g), true);
});
