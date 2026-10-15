// World simulation rules (v0.32.0): homes for everyone, real apartment units,
// walking police beats (near and far), the patrol cruiser, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, run, CONTENT, Game, TILE } from './helpers.mjs';
import { validateContent } from '../tools/validate-content.mjs';

const reload = (g) => { const g2 = new Game(CONTENT, { seed: 2 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };

test('every character has a home (or a justified exception) and sleeps in it; the checker catches a homeless resident', () => {
  const L = CONTENT.life;
  for (const id of Object.keys(CONTENT.characters)) assert.ok(L.homes[id] || L.exceptions[id], `${id} has a life configuration`);
  assert.equal(validateContent().errors.length, 0);
  const stray = { ...CONTENT.characters.npc_ray, id: 'npc_stray' };
  const bad = validateContent({ ...CONTENT, characters: { ...CONTENT.characters, npc_stray: stray } });
  assert.ok(bad.errors.some((e) => /npc_stray: no home/.test(e)));
  const crowded = validateContent({ ...CONTENT, life: { ...L, homes: { ...L.homes, npc_dee: { home: 'res_plumb_line/apt_1', occupation: 'tradesperson' } } } });
  assert.ok(crowded.errors.some((e) => /private unit shared|not in their home/.test(e)));
});

test('the Plumb Line is four flats off a shared hall; each tenant sleeps in their own, and walks home to it', () => {
  for (let n = 1; n <= 4; n++) assert.ok(CONTENT.maps[`plumb_unit_${n}`], `flat ${n}`);
  const g = newGame();
  setTime(g, 1, '23:30');
  for (const [id, n] of [['npc_mason', 1], ['npc_dee', 2], ['npc_barnaby', 3], ['npc_quinn', 4]]) assert.equal(g.npcs.get(id).map, `plumb_unit_${n}`, `${id} is in flat ${n}`);
  // a flat is private: the player can't walk in
  const door = g.maps.get('apartments').doors.find((d) => d.id === 'door_plumb_1');
  assert.equal(g.playerCanPass(door), false);
  assert.equal(g.npcCanPass(g.npcs.get('npc_mason'), door), true);
});

test('a police officer walks a beat — waypoint to waypoint, stopping a while at each — on screen and off', () => {
  const g = newGame();
  setTime(g, 1, '07:00');
  const sgt = g.npcs.get('npc_justin');
  const route = CONTENT.life.patrolRoutes.beat_civic;
  assert.equal(sgt.intent.block.patrol, 'beat_civic');
  // on screen: the player stands in Halvermouth
  g.changeMap('halvermouth', 'plaza_center');
  const seen = new Set();
  const spots = new Set();
  for (let i = 0; i < 240; i++) {
    run(g, 0.5);
    seen.add(sgt.patrolIdx);
    spots.add(`${Math.floor(sgt.x / TILE)},${Math.floor(sgt.y / TILE)}`);
  }
  assert.ok(seen.size >= 3, `visited ${seen.size} waypoints`);
  assert.ok(spots.size > 20, 'and walked between them (not standing at one point)');
  assert.ok(route.every((r) => r.startsWith('halvermouth:patrol_beat_civic_')));
  // off screen: the beat still goes on
  g.changeMap('lariat', 'south_gate');
  const before = sgt.patrolIdx;
  run(g, 90);
  assert.notEqual(sgt.patrolIdx, before, 'the beat continues while you are away');
});

test('a conversation pauses a patrol, which resumes from the same waypoint; a save keeps the officer on the beat', () => {
  const g = newGame();
  setTime(g, 1, '08:00');
  g.changeMap('halvermouth', 'plaza_center');
  const sgt = g.npcs.get('npc_justin');
  run(g, 30);
  const idx = sgt.patrolIdx;
  sgt.inDialogue = true;
  run(g, 20);
  sgt.inDialogue = false;
  assert.equal(sgt.intent.block.patrol, 'beat_civic', 'still on duty');
  assert.ok(sgt.patrolIdx === idx || sgt.patrolIdx === (idx + 1) % CONTENT.life.patrolRoutes.beat_civic.length, 'picks up where they were');
  const g2 = reload(g);
  const s2 = g2.npcs.get('npc_justin');
  assert.equal(s2.patrolIdx, sgt.patrolIdx);
  assert.equal(s2.intent.spot, CONTENT.life.patrolRoutes.beat_civic[sgt.patrolIdx]);
});

test('every officer has a beat; a cruiser patrols the city through the traffic system', () => {
  const officers = Object.values(CONTENT.characters).filter((c) => CONTENT.life.homes[c.id]?.occupation === 'police');
  assert.equal(officers.length, 6);
  const beats = officers.filter((c) => c.schedule.some((b) => b.patrol));
  assert.ok(beats.length >= 4, `${beats.length} officers walk beats`);
  const g = newGame();
  const cruiser = g.transit.followers?.find?.((f) => f.loop === 'police_cruiser') || (g.transit.setup(), g.transit.followers.find((f) => f.loop === 'police_cruiser'));
  assert.ok(cruiser && cruiser.model === 'cruiser' && cruiser.police);
});
