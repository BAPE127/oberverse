// The provinces of the world (v0.103.0): a jittered lattice cut of every atlas state, stable ids, neighbours, terrain, infrastructure and the places in them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { provinces, provinceById, provinceAt, provinceOfPlace, provinceGrid, TERRAIN } from '../src/world/provinces.js';
import { atlasGrids, atlasStates, atlasPlaces, atlasTheatres, atlasMilitary } from '../src/world/atlas.js';

const hs = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; };

test('the provinces are the same every time: unique ids, pinned seeds (a province id never changes), about four thousand of them, built in a few seconds', () => {
  const t0 = Date.now(); const P = provinces(); const ms = Date.now() - t0;
  assert.ok(ms < 6000, `${ms} ms`); assert.equal(new Set(P.map((p) => p.id)).size, P.length); assert.ok(P.length > 3500 && P.length < 4800, `${P.length}`);
  assert.deepEqual(P.map((p) => p.id), P.map((p) => p.id).sort(), 'in id order'); P.forEach((p, n) => { assert.equal(p.n, n); assert.equal(provinceById(p.id), p); });
  assert.equal(hs(P.map((p) => `${p.id}:${p.state}:${p.lat}:${p.lon}`).join('|')) + ':' + P.length, '1713901536:4115', 'the seeds are what they were');
});

test('every state has provinces, every cell of land belongs to a province of its own state, and the southern ice has none', () => {
  const P = provinces(); const S = atlasStates(); const G = atlasGrids(); const { grid } = provinceGrid();
  for (const s of S) { const mine = P.filter((p) => p.state === s.id); if (s.id === 'fr_southern_ice') assert.equal(mine.length, 0); else assert.ok(mine.length >= 1, `${s.id} has a province`); }
  let bad = 0; for (let n = 0; n < G.state.length; n++) { const k = G.state[n]; if (k === 255 || S[k].id === 'fr_southern_ice') { if (S[k]?.id !== 'fr_southern_ice' && grid[n] >= 0) bad++; continue; } if (grid[n] < 0 || P[grid[n]].state !== S[k].id) bad++; }
  assert.equal(bad, 0, 'no cell of land is in a province of another state, or in none');
});

test('neighbours are symmetric and real, nearly everything has one, and a province knows its terrain, its infrastructure, its country and its width', () => {
  const P = provinces(); let alone = 0;
  for (const p of P) {
    for (const q of p.neighbours) { assert.ok(P[q].neighbours.includes(p.n), `${p.id} and ${P[q].id}`); assert.notEqual(q, p.n); }
    if (!p.neighbours.length) alone++;
    assert.ok(TERRAIN[p.terrain], p.terrain); assert.ok(p.infra >= 1 && p.infra <= 5); assert.ok(p.fort >= 0 && p.fort <= 5); assert.ok(p.cells >= 1); assert.ok(p.width >= 8); assert.ok(p.country);
    for (const r of p.rail) assert.ok(p.road.includes(r), 'a railway is a road'); for (const r of p.road) assert.ok(P[r].road.includes(p.n), 'roads are two-way');
  }
  assert.ok(alone <= 12, `${alone} islands of one province`); assert.ok(P.filter((p) => p.rail.length).length > 100, 'main roads give a railway network');
});

test('the named places are in provinces: a capital is urban with good infrastructure; ports are ports; a military site lifts the fort level; the Halden Front is about a hundred provinces', () => {
  const P = provinces();
  for (const pl of atlasPlaces()) { const p = provinceOfPlace(pl.name); assert.ok(p, pl.name); assert.ok(p.places.includes(pl.name)); if (pl.kind === 'c') { assert.equal(p.terrain, 'urban'); assert.ok(p.infra >= 3); assert.ok(p.vp >= 3); } if (pl.kind === 'p') assert.ok(p.port, pl.name); if (pl.kind === 'a') assert.ok(p.airfield, pl.name); }
  const at = provinceAt(49, -26.7); assert.equal(at, provinceOfPlace('Halvermouth')); assert.equal(provinceAt(0, -140), null, 'open sea');
  for (const m of atlasMilitary()) if (m.kind === 'fort' || m.kind === 'hq') assert.ok(provinceAt(m.lat, m.lon)?.fort >= 2 || P.some((p) => p.fort >= 2 && p.country === m.country), m.name);
  const hal = atlasTheatres().find((t) => t.id === 'th_halden'); const n = P.filter((p) => hal.states.includes(p.state)).length; assert.ok(n >= 60 && n <= 130, `${n}`);
  assert.ok(P.some((p) => p.coast) && P.some((p) => p.port), 'coasts and ports exist');
});
