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

// ------------------------------------------------------------ v0.33.0: the bus network
const watch = (g, npc, minutes) => {
  const phases = [];
  for (let i = 0; i < minutes; i++) {
    run(g, 1);
    const ph = npc.trip?.phase || '-';
    if (phases[phases.length - 1] !== ph) phases.push(ph);
  }
  return phases;
};

test('two bus lines: every stop is on its line\'s route; the No. 2 reaches Lariat and keeps hours', () => {
  const g = newGame();
  const T = g.transit;
  T.setup();
  assert.deepEqual(Object.keys(T.lines), ['r1', 'r2']);
  for (const L of Object.values(T.lines)) for (const s of L.cfg.stops) {
    assert.ok(L.stops.some((x) => x.id === s.id), `${L.cfg.id} calls at ${s.id}`);
    assert.ok(g.maps.get(s.sign.map).spot(`wait_${s.id}`), `${s.id} has a place to wait`);
  }
  assert.ok(T.lines.r2.cfg.stops.some((s) => s.sign.map === 'lariat') && T.lines.r2.cfg.stops.some((s) => s.sign.map === 'halvermouth'));
  assert.equal(T.followers.filter((f) => f.kind === 'bus' && f.line === 'r2').length, 2);
  setTime(g, 1, '23:30');
  assert.equal(T.eta('stop_lariat_main')?.minutes > 6 * 60 || !T.eta('stop_lariat_main'), true, 'no No. 2 until the morning');
  setTime(g, 2, '10:00');
  assert.ok(T.eta('stop_lariat_main').minutes < 120);
});

test('an older save (with one line of buses) gains the new line\'s buses; the No. 1 keeps its places', () => {
  const g = newGame();
  const s = JSON.parse(JSON.stringify(g.serialize()));
  s.world.transit = { buses: [{ dist: 100, slot: 0, dwellUntil: 0 }, { dist: 5000, slot: 1, dwellUntil: 0 }, { dist: 9000, slot: 2, dwellUntil: 0 }] };
  const g2 = new Game(CONTENT, { seed: 3 });
  g2.loadState(s);
  g2.transit.setup();
  const buses = g2.transit.followers.filter((f) => f.kind === 'bus');
  assert.equal(buses.filter((f) => f.line === 'r1').length, 3);
  assert.equal(buses.filter((f) => f.line === 'r2').length, 2);
  assert.equal(Math.round(buses.find((f) => f.idx === 1).dist), 5000);
});

test('Wade rides the No. 2 into the city of an evening: walks to the stop, waits, rides, gets off, walks on — and home again', () => {
  const g = newGame();
  setTime(g, 1, '18:30');
  g.changeMap('lariat', 'town_square'); // (not standing in the road: buses wait for you)
  const wade = g.npcs.get('npc_wade');
  const out = watch(g, wade, 120);
  assert.deepEqual(out.filter((p) => p !== '-'), ['to_stop', 'waiting', 'riding', 'to_dest'].filter((p) => out.includes(p)));
  assert.ok(out.includes('riding') && out.includes('to_dest'), `rode the bus (${out.join(' → ')})`);
  assert.equal(wade.map, 'halvermouth');
  const back = watch(g, wade, 240);
  assert.ok(back.includes('riding'), `rode home (${back.join(' → ')})`);
  assert.notEqual(wade.map, 'halvermouth');
});

test('a passenger on a bus survives a save — once, not twice — and gets off at their stop', () => {
  const g = newGame();
  setTime(g, 1, '18:30');
  g.changeMap('lariat', 'town_square');
  const wade = g.npcs.get('npc_wade');
  for (let i = 0; i < 120 && wade.trip?.phase !== 'riding'; i++) run(g, 1);
  assert.equal(wade.trip.phase, 'riding');
  const g2 = reload(g);
  const w2 = g2.npcs.get('npc_wade');
  assert.equal(w2.trip.phase, 'riding');
  assert.equal(w2.riding, wade.riding);
  assert.equal([...g2.npcs.values()].filter((n) => n.id === 'npc_wade').length, 1);
  assert.equal(g2.interactables().some((t) => t.kind === 'npc' && t.id === 'npc_wade'), false, 'not someone you can talk to through the bus wall');
  for (let i = 0; i < 90 && w2.trip?.phase === 'riding'; i++) run(g2, 1);
  assert.notEqual(w2.trip?.phase, 'riding', 'got off');
  assert.equal(w2.riding, null);
});

test('Quinn takes the No. 1 the quick way, both ways; a passenger only boards a bus going their way', () => {
  const g = newGame();
  setTime(g, 1, '12:00');
  g.changeMap('halvermouth', 'plaza_center');
  const q = g.npcs.get('npc_quinn');
  watch(g, q, 120);
  assert.equal(q.map, 'halvermouth');
  const t0 = g.clock.total;
  setTime(g, 1, '15:00');
  let maps = new Set();
  for (let i = 0; i < 150; i++) { run(g, 1); if (q.riding != null) maps.add(q.map); }
  assert.ok(!maps.has('yards'), `never via the Yards (${[...maps].join(', ')})`);
  assert.ok(['westbrook', 'mason_office'].includes(q.map), `back in Westbrook (${q.map})`);
  void t0;
});

test('the player can ride the No. 2 to Lariat: board at Justice Way, pay the fare, get off in Lariat', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  const T = g.transit;
  T.setup();
  const sign = T.lines.r2.cfg.stops.find((s) => s.id === 'stop_justice').sign;
  g.changeMap('halvermouth', null, { x: (sign.x + 1.5) * TILE, y: (sign.y + 0.5) * TILE });
  assert.ok(T.waitFor('stop_justice').ok);
  const bus = T.boardable();
  assert.ok(bus && bus.line === 'r2', 'a No. 2 is waiting');
  const m0 = g.player.money = 100;
  assert.ok(T.board(bus.idx).ok);
  assert.equal(g.player.money, m0 - 3);
  for (let i = 0; i < 120 && !(g.player.map === 'lariat' && T.dwelling(bus)); i++) run(g, 0.5);
  assert.equal(g.player.map, 'lariat');
  assert.ok(T.alight().ok);
  assert.equal(g.player.riding, null);
});
