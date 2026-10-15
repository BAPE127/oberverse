// Captain Ober (imported character, v0.21.0): his look, his protection and
// kraken Wrath, his routine at the Yards docks, his sale of Ober & Sons
// Maritime through dialogue, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { isProtected } from '../src/systems/combat.js';
import { THEMES } from '../src/engine/wrath.js';
import { check } from '../src/sim/conditions.js';

const talk = (g, ...choices) => {
  const s = new DialogueSession(g, 'npc_ober');
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return node;
};
const text = (node) => node.pages.join(' ');

test('Captain Ober: imported, with his portrait, captain\'s cap, beard and glasses — and protected by the kraken', () => {
  const o = CONTENT.characters.npc_ober;
  assert.equal(o.origin, 'imported');
  assert.match(o.appearance.portrait, /^data:image\/jpeg;base64,/);
  assert.equal(o.appearance.hairStyle, 'captain');
  assert.ok(o.appearance.beard);
  assert.equal(o.appearance.accessory, 'glasses');
  assert.equal(o.wrath.theme, 'kraken');
  assert.ok(THEMES.kraken);
  assert.equal(o.motif, 'motif_ober');
  assert.equal(CONTENT.motifs.motif_ober.character, 'npc_ober');
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_ober')));
});

test('he talks like an old salt and treats you as crew', () => {
  const g = newGame();
  const first = text(talk(g));
  assert.match(first, /shipmate/i);
  assert.match(first, /Ober & Sons Maritime/);
  assert.match(text(talk(g, 'topic:t_ober_cargo')), /agricultural machinery/);
});

test('his day: the harbour office, the quay, and asleep aboard the Salty Ober', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  const o = g.npcs.get('npc_ober');
  assert.equal(o.map, 'ober_office');
  setTime(g, 1, '23:30');
  assert.equal(o.map, 'salty_ober');
  assert.equal(o.activity, 'sleep');
  setTime(g, 1, '19:00');
  assert.equal(o.map, 'yards');
});

test('he sells you Ober & Sons: the topic opens the sale sheet, and after you buy he gives advice instead', () => {
  const g = newGame();
  g.player.money = 50000;
  const sale = CONTENT.dialogues.dlg_ober.topics.find((t) => t.id === 't_ober_sale');
  const ober = g.npcs.get('npc_ober');
  assert.ok(check(sale.if, g, ober));
  const node = talk(g, 'topic:t_ober_sale');
  assert.match(text(node), /Forty thousand/);
  assert.equal(node.action?.type, 'panel');
  assert.equal(node.action.panel, 'logistics');
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.getFlag('owns_shipping'));
  assert.ok(!check(sale.if, g, ober), 'no second sale');
  const advice = CONTENT.dialogues.dlg_ober.topics.find((t) => t.id === 't_ober_advice');
  assert.ok(check(advice.if, g, ober));
});

test('the sale works whether or not the Captain is around, and survives a save', () => {
  const g = newGame();
  g.player.money = 45000;
  assert.ok(g.logistics.buyCompany().ok);
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.ok(g2.logistics.owned);
  assert.equal(g2.logistics.buyCompany().ok, false);
  assert.ok(g2.npcs.get('npc_ober'));
});
