// Living World stage 3 (v0.35.0): errands and meet-ups in free time, and the
// police incident lifecycle (reported → responding → investigating → closed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, run, CONTENT, Game, TILE } from './helpers.mjs';
import { errandFor, regionOfSpot } from '../src/sim/errands.js';
import { blockAt } from '../src/sim/schedule.js';
import { validateContent } from '../tools/validate-content.mjs';

const blockOf = (g, id, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return blockAt(g.npcs.get(id).profile.schedule, h * 60 + m);
};

test('errands: some days elsewhere, always in the same region, and the same answer every time it is asked', () => {
  const g = newGame();
  const spots = new Set();
  let away = 0;
  for (let day = 1; day <= 40; day++) {
    setTime(g, day, '18:30');
    const b = blockOf(g, 'npc_quinn', '18:30');
    const e = errandFor(g, g.npcs.get('npc_quinn'), b);
    assert.deepEqual(errandFor(g, g.npcs.get('npc_quinn'), b), e, 'deterministic');
    if (!e) { spots.add(b.spot); continue; }
    away++;
    spots.add(e.spot);
    assert.equal(regionOfSpot(g, e.spot), regionOfSpot(g, b.spot), `${e.spot} is in Quinn's region`);
    assert.ok(!e.spot.startsWith('cafe:'), 'the Kettle & Crumb is shut by then');
  }
  assert.ok(away > 8 && away < 32, `away on ${away} of 40 days`);
  assert.ok(spots.size >= 4, `${spots.size} different places`);
});

test('friends meet up: on a meet day Rosa and Lorna pick the same place, and both walk there', () => {
  const g = newGame();
  let day = 0;
  for (let d = 1; d <= 30 && !day; d++) {
    setTime(g, d, '19:30');
    const a = errandFor(g, g.npcs.get('npc_rosa'), blockOf(g, 'npc_rosa', '19:30'));
    const b = errandFor(g, g.npcs.get('npc_lorna'), blockOf(g, 'npc_lorna', '19:30'));
    assert.equal(Boolean(a), Boolean(b), `day ${d}: both or neither`);
    if (a) { assert.equal(a.spot, b.spot); assert.match(a.label, /with Lorna/); day = d; }
  }
  assert.ok(day, 'they meet within a month');
  setTime(g, day, '18:40');
  run(g, 100);
  const rosa = g.npcs.get('npc_rosa');
  const lorna = g.npcs.get('npc_lorna');
  assert.equal(rosa.map, lorna.map, `${rosa.map} / ${lorna.map}`);
  assert.ok(Math.hypot(rosa.x - lorna.x, rosa.y - lorna.y) < 3 * TILE, 'together');
  assert.equal(rosa.intent.spot, errandFor(g, rosa, blockOf(g, 'npc_rosa', '20:20')).spot);
});

test('a call becomes an incident: officers sent, witnesses questioned at the scene, the all-clear, back to the beat — and it survives a save', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  g.changeMap('lanternside', 'start'); // the player is nowhere near
  const P = g.police;
  const o = P.activeOfficers().find((n) => n.map === 'halvermouth' && n.activity !== 'sleep');
  assert.ok(o, 'an officer on duty in the city');
  // the scene: the nearest named place to the officer; a witness waits there to be asked
  const H = g.maps.get('halvermouth');
  const [spot, sp] = Object.entries(H.spots).filter(([k]) => !k.startsWith('wait_')).sort(([, a], [, b]) => Math.hypot(a.x * TILE - o.x, a.y * TILE - o.y) - Math.hypot(b.x * TILE - o.x, b.y * TILE - o.y))[0];
  const w = g.npcs.get('npc_quinn');
  Object.assign(w, { map: 'halvermouth', x: (sp.x + 0.5) * TILE, y: (sp.y + 1.5) * TILE });
  g.sendOnErrand(w, { spot: `halvermouth:${spot}`, minutes: 300 });
  g.knowledge.learn(w, 'fact_player_car_theft', { kind: 'fact', source: 'witnessed', at: g.clock.total });
  P.placeCall(3, { map: 'halvermouth', x: (sp.x + 0.5) * TILE, y: (sp.y + 0.5) * TILE }, { fact: 'fact_player_car_theft', witnesses: [w.id] });
  const inc = P.state.incidents.at(-1);
  assert.equal(inc.status, 'reported');
  const seen = new Set();
  let g2 = g;
  for (let t = 0; t < 240; t++) {
    run(g2, 1);
    const cur = g2.police.state.incidents.find((x) => x.id === inc.id);
    seen.add(cur.status);
    if (cur.status === 'investigating' && !seen.has('saved')) {
      seen.add('saved');
      g2 = new Game(CONTENT, { seed: 3 });
      g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
    }
    if (cur.status === 'closed') break;
  }
  const done = g2.police.state.incidents.find((x) => x.id === inc.id);
  assert.ok(seen.has('responding') && seen.has('investigating'), [...seen].join(','));
  assert.equal(done.status, 'closed');
  assert.ok(done.officers.length >= 1);
  assert.ok(done.named, 'the witness told them');
  assert.ok(g2.knowledge.knows(g2.npcs.get(done.officers[0]), 'fact_player_car_theft'), 'the officer learned what the witness saw');
  for (const id of done.officers) assert.notEqual(g2.npcs.get(id).intent?.source, 'dispatch', `${id} is back on the beat`);
  assert.equal(g2.police.openIncidents().length, 0);
});

test('the checker catches a one-sided meet-up and an unknown errand', () => {
  const ch = (id, f) => ({ ...CONTENT.characters[id], schedule: CONTENT.characters[id].schedule.map(f) });
  const oneSided = ch('npc_lorna', (b) => (b.meet ? { ...b, meet: undefined } : b));
  let r = validateContent({ ...CONTENT, characters: { ...CONTENT.characters, npc_lorna: oneSided } });
  assert.ok(r.errors.some((e) => /npc_rosa.*meets npc_lorna/.test(e)), r.errors.join('\n'));
  const odd = ch('npc_quinn', (b) => (b.errand ? { ...b, errand: 'skydiving' } : b));
  r = validateContent({ ...CONTENT, characters: { ...CONTENT.characters, npc_quinn: odd } });
  assert.ok(r.errors.some((e) => /unknown errand skydiving/.test(e)));
});
