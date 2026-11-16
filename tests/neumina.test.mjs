// Neumina, a city in levels (v0.107.0): every level lines up with the one below, the stairs and the lift are walked through both ways (no bouncing
// back), nothing stands on a drop or a tower shaft, and the city is abroad (not on Sund's map, no seams into Sund).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';

const LEVELS = ['neumina_street', 'neumina_skyway', 'neumina_terrace'];

test('each level lies over the one below: same size, a drop between them, and the towers\' shafts in the same place on every level', () => {
  const g = newGame(); const M = LEVELS.map((id) => g.maps.get(id));
  for (const m of M) { assert.equal(m.width, M[0].width); assert.equal(m.height, M[0].height); assert.ok(m.def.abroad && m.def.megacity); }
  assert.deepEqual(M[1].def.below && [M[1].def.below.map, M[1].def.below.drop > 0], ['neumina_street', true]);
  assert.deepEqual(M[2].def.below && [M[2].def.below.map, M[2].def.below.drop > 0], ['neumina_skyway', true]);
  for (const b of M[0].buildings.filter((q) => q.tower)) for (const m of M.slice(1)) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) assert.equal(m.tileAt(x, y), 'B', `${b.name} rises through ${m.id} at ${x},${y}`);
  for (const m of M.slice(1)) assert.ok(m.grid.some((r) => r.includes('O')), `${m.id} has drops to look down through`);
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

test('the stairs and the lift are walked through, both ways, and you stay where you arrive', () => {
  const g = newGame();
  for (const [map, x, y, dx, dy, want] of [
    ['neumina_street', 36, 26, 0, -1, 'neumina_skyway'], ['neumina_skyway', 36, 30, 0, 1, 'neumina_street'],
    ['neumina_skyway', 42, 24, 1, 0, 'neumina_terrace'], ['neumina_terrace', 44, 24, 0, -1, 'neumina_skyway'],
  ]) { const r = walk(g, map, x, y, dx, dy, want); assert.equal(r.arrived, want, `${map} → ${want}`); assert.ok(r.stayed, `no bounce back to ${map}`); }
});

test('Neumina is abroad: no seam or gate joins it to Sund, and nothing in Sund\'s regions lists it', () => {
  const g = newGame();
  for (const id of LEVELS) { assert.equal(g.neighbors(id).length, 0); for (const d of g.maps.get(id).doors) assert.ok(LEVELS.includes(d.to?.map), `${id}: ${d.id} leads within Neumina`); }
  for (const r of Object.values(CONTENT.regions)) for (const id of LEVELS) assert.ok(!r.maps[id]);
});
