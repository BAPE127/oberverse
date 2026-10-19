// Morganius Spade (imported character, v0.52.0): his look from the photo, his protection and
// storm-of-cards Wrath, how he floats and does card magic, his nights on the casino floor, his
// lines, his coach and his card-throwing deck, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { isProtected } from '../src/systems/combat.js';
import { THEMES } from '../src/engine/wrath.js';
import { HOST_FX, hostState, EFFECTS, floatLift } from '../src/engine/cardMagic.js';
import { paintPersonForTest } from '../src/engine/drawPeople.js';

const talk = (g, id, ...choices) => {
  const s = new DialogueSession(g, id);
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return node;
};
const text = (node) => node.pages.join(' ');

test('Morganius: imported from the photo — the pointed hat, the robe, the purple amulet — and protected by a storm of cards', () => {
  const m = CONTENT.characters.npc_morganius;
  assert.equal(m.origin, 'imported');
  assert.match(m.appearance.portrait, /^data:image\/jpeg;base64,/);
  assert.equal(m.appearance.hairStyle, 'wizard');
  assert.equal(m.appearance.robe, true);
  assert.ok(m.appearance.accessories.includes('amulet'));
  assert.equal(m.float, true);
  assert.equal(m.wrath.theme, 'cards');
  assert.ok(THEMES.cards);
  assert.equal(CONTENT.motifs.motif_morganius.character, 'npc_morganius');
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_morganius')));
  // the hat is painted, and stays inside the sprite
  const rects = paintPersonForTest(m.appearance, 'down', 0, 'head');
  assert.ok(rects.some(([, y]) => y <= -36), 'a tall hat');
});

test('he floats, and every one of his animation states has its card magic', () => {
  const g = newGame();
  const m = g.npcs.get('npc_morganius');
  const lifts = [0, 0.5, 1, 1.5].map((t) => floatLift(m, t));
  assert.ok(lifts.every((h) => h > 3 && h < 13), 'a hand off the floor');
  assert.ok(new Set(lifts.map((x) => x.toFixed(2))).size > 1, 'and bobbing');
  for (const [state, fx] of Object.entries(HOST_FX)) {
    const list = fx(100, 100, 0.5, 3);
    assert.ok(list.length, state);
    for (const e of list) assert.ok(EFFECTS[e.fx], `${state}: ${e.fx}`);
  }
  m.anim = { state: 'arrive', t0: 10 };
  assert.equal(hostState(m, 10.5).state, 'arrive');
  assert.equal(hostState(m, 20).state === 'arrive', false, 'states run out');
});

test('his day: rehearsing upstairs, lunch in the lounge, the casino floor all night, asleep in his rooms', () => {
  const g = newGame();
  const m = g.npcs.get('npc_morganius');
  setTime(g, 1, '12:00');
  assert.equal(m.map, 'phonograph_spade');
  setTime(g, 1, '13:30');
  assert.equal(m.map, 'phonograph_lobby');
  setTime(g, 1, '22:00');
  assert.equal(m.map, 'phonograph_casino');
  assert.equal(m.activity, 'perform');
  setTime(g, 2, '05:00');
  assert.equal(m.map, 'phonograph_spade');
  assert.equal(m.activity, 'sleep');
});

test('he talks in threes and tells you the odds exactly', () => {
  const g = newGame();
  assert.match(text(talk(g, 'npc_morganius')), /welcome, welcome, welcome/i);
  assert.match(text(talk(g, 'npc_morganius', 'topic:t_ms_odds')), /one chip in thirty-seven/);
});

test('The Last Trick and the Dead Man\'s Hand are his; a save keeps him', () => {
  const g = newGame();
  const car = g.vehicles.car('car_sig_lasttrick');
  assert.equal(car.owner, 'npc_morganius');
  assert.equal(g.vehicles.model(car).trail, 'cards');
  assert.ok(CONTENT.items.item_dead_mans_hand.weapon.fan.length === 5);
  assert.equal(CONTENT.containers.ct_spade_trunk.owner, 'npc_morganius');
  const s = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 3 });
  g2.loadState(s);
  assert.ok(g2.npcs.get('npc_morganius'));
});
