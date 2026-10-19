// Octavius Thomas Phonograph (imported character, v0.52.0): owner of the Phonograph Grand, on his
// phone, brief with you; his (temporary) look, his security-and-lawyers Wrath, his hours at the
// cage, the chips he changes, his limousine and his gold phone, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { isProtected } from '../src/systems/combat.js';
import { THEMES } from '../src/engine/wrath.js';
import { check } from '../src/sim/conditions.js';

const talk = (g, ...choices) => {
  const s = new DialogueSession(g, 'npc_octavius');
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return node;
};
const text = (node) => node.pages.join(' ');

test('Octavius: imported, protected by his security and his lawyers, always holding his phone — and a stand-in look until his picture comes', () => {
  const o = CONTENT.characters.npc_octavius;
  assert.equal(o.origin, 'imported');
  assert.equal(o.appearance.temporary, true);
  assert.equal(o.appearance.holding, 'phone');
  assert.equal(o.wrath.theme, 'security');
  assert.ok(THEMES.security);
  assert.equal(CONTENT.motifs.motif_octavius.character, 'npc_octavius');
  assert.ok(isProtected(newGame().npcs.get('npc_octavius')));
});

test('he barely looks up: short greetings, a word or two', () => {
  const g = newGame();
  talk(g); // the first meeting
  for (let i = 0; i < 8; i++) {
    const t = text(talk(g));
    assert.ok(t.length < 70, `brief: "${t}"`);
  }
});

test('at the cage (16:00–20:00) he changes your money; elsewhere he sends you to Vera', () => {
  const g = newGame();
  setTime(g, 1, '17:00');
  const o = g.npcs.get('npc_octavius');
  assert.equal(o.activity, 'cashier');
  const dlg = CONTENT.dialogues.dlg_octavius;
  const chips = dlg.topics.find((t) => t.id === 't_otp_chips');
  const away = dlg.topics.find((t) => t.id === 't_otp_chips_away');
  assert.ok(check(chips.if, g, o) && !check(away.if, g, o));
  assert.ok(chips.effects.some((e) => e.panel?.name === 'cashier'));
  setTime(g, 1, '09:00');
  assert.equal(o.map, 'phonograph_octavius');
  assert.ok(!check(chips.if, g, o) && check(away.if, g, o));
  setTime(g, 2, '03:00');
  assert.equal(o.activity, 'sleep');
});

test('as rich as Sir Moneybucks (which one is richer is never settled), and both of them know it', () => {
  const o = CONTENT.characters.npc_octavius;
  assert.ok(o.opinions.npc_moneybucks && o.relationships.npc_moneybucks);
  const g = newGame();
  assert.match(text(talk(g, 'topic:t_otp_moneybucks')), /Depends how you count/);
});

test('the Long Distance and Please Hold are his; a save keeps him', () => {
  const g = newGame();
  const car = g.vehicles.car('car_sig_longdistance');
  assert.equal(car.owner, 'npc_octavius');
  assert.equal(g.vehicles.model(car).horn, 'ringtone');
  assert.equal(CONTENT.items.item_please_hold.weapon.effect, 'stun');
  assert.equal(CONTENT.containers.ct_octavius_safe.owner, 'npc_octavius');
  const s = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 3 });
  g2.loadState(s);
  assert.equal(g2.vehicles.car('car_sig_longdistance').owner, 'npc_octavius');
});
