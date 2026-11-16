// Neumina, a city in five levels (v0.107.0): the Sump at the bottom to the Crown at the top, each with its own ground, light and landmarks; the
// middle three line up (the Skyway and the Terraces look down through their drops); every way between levels is walked both ways (no bouncing
// back); nothing stands on a drop or a tower shaft; and the city is abroad (not on Sund's map, no seams into Sund).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';

const LEVELS = ['neumina_sump', 'neumina_street', 'neumina_skyway', 'neumina_terrace', 'neumina_crown'];
const MID = LEVELS.slice(1, 4); // (the three that are drawn over each other)

test('the middle levels lie over each other: same size, a drop between them, and the towers\' shafts in the same place on every level', () => {
  const g = newGame(); const M = MID.map((id) => g.maps.get(id));
  for (const m of M) { assert.equal(m.width, M[0].width); assert.equal(m.height, M[0].height); assert.ok(m.def.abroad && m.def.megacity); }
  assert.deepEqual(M[1].def.below && [M[1].def.below.map, M[1].def.below.drop > 0], ['neumina_street', true]);
  assert.deepEqual(M[2].def.below && [M[2].def.below.map, M[2].def.below.drop > 0], ['neumina_skyway', true]);
  for (const b of M[0].buildings.filter((q) => q.tower)) for (const m of M.slice(1)) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) assert.equal(m.tileAt(x, y), 'B', `${b.name} rises through ${m.id} at ${x},${y}`);
  for (const m of M.slice(1)) assert.ok(m.grid.some((r) => r.includes('O')), `${m.id} has drops to look down through`);
});

test('five levels from slum to cloud: numbered in order, the Sump always dark and the Crown always lit, each with its own ground and named landmarks', () => {
  const g = newGame(); const M = LEVELS.map((id) => g.maps.get(id));
  M.forEach((m, i) => { assert.equal(m.def.level, i + 1, m.id); assert.ok(m.def.megacity && m.def.abroad === 'neumina'); assert.ok(m.buildings.filter((b) => b.mapLabel).length >= 3, `${m.id} has landmarks`); });
  const [sump, , , , crown] = M;
  assert.ok(sump.def.atmos.dark[0] > 0.5, 'no daylight in the Sump'); assert.ok(crown.def.atmos.dark[1] < 0.3, 'no night in the Crown'); assert.ok(crown.def.atmos.clouds);
  const share = (m, c) => m.grid.join('').split(c).length - 1;
  assert.ok(share(sump, 'q') > 800, 'the Sump is grime'); assert.ok(share(crown, 'Q') > 600, 'the Crown is marble');
  assert.ok(crown.buildings.some((b) => b.name === 'The Spire'), 'the gala has its venue');
});

test('nothing stands on a drop or in a shaft, and every spot can be stood on', () => {
  const g = newGame();
  for (const id of LEVELS) {
    const m = g.maps.get(id);
    for (const p of m.props) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) assert.ok(!['O', 'B'].includes(m.tileAt(x, y)), `${id}: ${p.type} at ${x},${y} stands on ${m.tileAt(x, y)}`);
    for (const [name, s] of Object.entries(m.spots)) assert.ok(!m.blockedTile(s.x, s.y), `${id}:${name} is free`);
  }
});

const walk = (g, map, x, y, dx, dy, want) => {
  g.changeMap(map, Object.keys(g.maps.get(map).spots)[0]); g.player.x = (x + 0.5) * 32; g.player.y = (y + 0.5) * 32 + (dy < 0 ? 6 : 0);
  for (let i = 0; i < 150 && g.player.map === map; i++) g.update(1 / 30, { x: dx, y: dy, sprint: false });
  const arrived = g.player.map; for (let i = 0; i < 60; i++) g.update(1 / 30, { x: 0, y: 0, sprint: false });
  return { arrived, stayed: g.player.map === arrived && arrived === want };
};

test('the Chain Lift, the stairs, the lifts and the Crown lift are walked through, both ways, and you stay where you arrive', () => {
  const g = newGame();
  for (const [map, x, y, dx, dy, want] of [
    ['neumina_street', 36, 26, 0, -1, 'neumina_skyway'], ['neumina_skyway', 36, 30, 0, 1, 'neumina_street'],
    ['neumina_skyway', 42, 24, 1, 0, 'neumina_terrace'], ['neumina_terrace', 44, 24, 0, -1, 'neumina_skyway'],
    ['neumina_street', 24, 25, 1, 0, 'neumina_sump'], ['neumina_sump', 28, 32, 1, 0, 'neumina_street'],
    ['neumina_terrace', 38, 39, 1, 0, 'neumina_crown'], ['neumina_crown', 29, 38, 1, 0, 'neumina_terrace'],
  ]) { const r = walk(g, map, x, y, dx, dy, want); assert.equal(r.arrived, want, `${map} → ${want}`); assert.ok(r.stayed, `no bounce back to ${map}`); }
});

test('Neumina is abroad: no seam or gate joins it to Sund, and nothing in Sund\'s regions lists it', () => {
  const g = newGame();
  for (const id of LEVELS) { assert.equal(g.neighbors(id).length, 0); for (const d of g.maps.get(id).doors) assert.ok(LEVELS.includes(d.to?.map), `${id}: ${d.id} leads within Neumina`); }
  for (const r of Object.values(CONTENT.regions)) for (const id of LEVELS) assert.ok(!r.maps[id]);
});
