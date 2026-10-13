// "The Oberverse Protects Its Own" (v0.6.1): imported characters cannot be
// hurt or killed unless their profile says killable; attacking one calls down
// the Wrath cutscene, which strikes the player down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, besideNpc, noImpulses, CONTENT, Game } from './helpers.mjs';
import { isProtected, WRATH } from '../src/systems/combat.js';

const tick = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) g.update(0.05, { x: 0, y: 0 }); };
const hit = (g, npc, weapon = 'item_machete') => g.combat.hitNpc(npc, 999, { weapon: g.combat.weaponDef(weapon), dir: { x: -1, y: 0 }, lethal: true });

test('every imported character is protected; generated and original ones are not', () => {
  const g = newGame();
  for (const npc of g.npcs.values()) {
    assert.equal(isProtected(npc), npc.profile.origin === 'imported', npc.id);
  }
  assert.ok(isProtected(g.npcs.get('npc_moneybucks')));
  assert.ok(isProtected(g.npcs.get('npc_mason')));
  assert.ok(!isProtected(g.npcs.get('npc_gideon')), 'his employees are fair game');
  for (const id of ['npc_moneybucks', 'npc_mason']) assert.ok(CONTENT.characters[id].wrath?.line, `${id} has a last word`);
});

test('attacking an imported character: no damage, the world freezes, the Wrath plays out', () => {
  const g = newGame(3);
  setTime(g, 2, '11:00'); // Mason in the excavator
  noImpulses(g);
  const mason = besideNpc(g, 'npc_mason');
  g.player.facing = 'left';
  g.player.money = 40;
  const events = [];
  for (const ev of ['combat:wrath', 'combat:lightning', 'combat:wrathEnd']) g.bus.on(ev, (e) => events.push(ev));
  const r = g.combat.attack();
  assert.deepEqual(r.hits, ['npc_mason']);
  assert.equal(mason.health, undefined, 'not a scratch on him');
  assert.ok(g.combat.wrath, 'the Wrath begins');
  assert.ok(!g.combat.attack().ok, 'no more attacking');
  const clock = g.clock.total;
  const pos = { x: g.player.x, y: g.player.y };
  for (let i = 0; i < 40; i++) g.update(0.05, { x: 1, y: 0 });
  assert.equal(g.clock.total, clock, 'time stands still');
  assert.deepEqual({ x: g.player.x, y: g.player.y }, pos, 'the player cannot move');
  tick(g, WRATH.end + 0.5);
  assert.equal(events.filter((e) => e === 'combat:lightning').length, WRATH.strikes.length, 'five strikes');
  assert.ok(events.includes('combat:wrathEnd'));
  assert.ok(g.combat.wrath.over);
  g.combat.riseAgain();
  assert.equal(g.combat.wrath, null);
  assert.equal(g.player.map, 'player_flat', 'you wake at home');
  assert.equal(g.clock.timeString, '08:00');
  assert.equal(g.clock.day, 3, 'the next morning');
  assert.equal(g.player.money, 20, 'half your money');
  assert.equal(g.player.health, 100);
  assert.ok(!mason.dead && !mason.downUntil);
  assert.ok(g.knowledge.knows(mason, 'fact_player_smitten'));
  assert.equal(g.getFlag('smitten_by_npc_mason'), 1);
});

test('guns, fists and knock-out weapons all call down the Wrath on Sir Moneybucks', () => {
  for (const weapon of [null, 'item_baton', 'item_rifle']) {
    const g = newGame(4);
    setTime(g, 1, '09:00');
    noImpulses(g);
    const mb = besideNpc(g, 'npc_moneybucks');
    g.combat.hitNpc(mb, 999, { weapon: g.combat.weaponDef(weapon), dir: { x: -1, y: 0 }, lethal: weapon === 'item_rifle' });
    assert.ok(g.combat.wrath, String(weapon));
    assert.ok(!mb.dead && !mb.downUntil && mb.health === undefined);
  }
});

test('"unless I say so": killable: true lifts the protection', () => {
  const content = { ...CONTENT, characters: { ...CONTENT.characters, npc_mason: { ...CONTENT.characters.npc_mason, killable: true } } };
  const g = new Game(content, { seed: 5 });
  g.newGame({ playerName: 'Tester', seed: 5 });
  setTime(g, 2, '11:00');
  noImpulses(g);
  const mason = besideNpc(g, 'npc_mason');
  assert.ok(!isProtected(mason));
  hit(g, mason);
  assert.ok(mason.dead);
  assert.equal(g.combat.wrath, undefined);
});

test('ordinary characters can still be killed', () => {
  const g = newGame(6);
  setTime(g, 1, '08:00');
  noImpulses(g);
  const gideon = besideNpc(g, 'npc_gideon');
  hit(g, gideon);
  assert.ok(gideon.dead);
  assert.ok(!g.combat.wrath);
});
