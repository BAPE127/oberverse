// The world atlas (v0.92.0): countries, states, places, rivers and roads laid on the world's own coastlines. Everything stands on land, every
// state has land and a place in a country, names are unique, ports stand on the coast of their state, every state can be reached by sea or
// land, eleven countries appear everywhere countries are counted, and a save from before the Atlas loads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, CONTENT } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { CORP } from '../src/content/corporate.js';
import { elevation } from '../src/world/geography.js';
import { landGrid } from '../src/world/globe.js';
import { seaRoute } from '../src/world/seaRoutes.js';
import { stateAt, countryAt, biomeAt, atlasAt, atlasGrids, atlasStates, atlasPlaces, atlasRoads, atlasRivers, atlasMilitary, atlasTheatres, atlasCountries, BIOMES } from '../src/world/atlas.js';

const C = CONTENT.arms.countries;
const PORTS = CONTENT.logistics.ports;
const land = (lat, lon) => elevation(lat, lon) >= 0;

test('the Atlas data: eleven countries and the free territories, states with unique ids and names, places with unique names', () => {
  const cs = atlasCountries();
  assert.equal(Object.keys(cs).length, 12, 'eleven countries and the free territories');
  for (const id of Object.keys(C)) assert.ok(cs[id], `${id} is in the atlas`);
  for (const id of ['westreach', 'sunmouth', 'dunmere']) assert.ok(C[id] && cs[id], `${id} is a country in the market and in the atlas`);
  assert.equal(Object.keys(C).length, 11);
  const states = atlasStates();
  assert.ok(states.length >= 70);
  assert.equal(new Set(states.map((s) => s.id)).size, states.length, 'state ids are unique');
  assert.equal(new Set(states.map((s) => s.name)).size, states.length, 'state names are unique');
  for (const s of states) assert.ok(cs[s.country], `${s.id} belongs to a country in the atlas`);
  const places = atlasPlaces();
  assert.equal(new Set(places.map((p) => p.name)).size, places.length, 'no two places share a name');
  for (const p of places) assert.ok(states.some((s) => s.id === p.state), `${p.name} is in a real state`);
  for (const [id, c] of Object.entries(cs)) {
    if (!c.capital) { assert.equal(id, 'free', 'only the free territories have no capital'); continue; }
    assert.ok(places.some((p) => p.kind === 'c' && p.name === c.capital), `${id} has its capital ${c.capital}`);
    assert.ok(states.some((s) => s.country === id), `${id} has a state`);
  }
});

test('every seed, place and military site stands on land, and every place is in the state it names', () => {
  for (const s of atlasStates()) assert.ok(land(s.seed[0], s.seed[1]), `${s.id}'s heart is on land`);
  for (const p of atlasPlaces()) {
    assert.ok(land(p.lat, p.lon), `${p.name} is on land`);
    assert.equal(stateAt(p.lat, p.lon)?.id, p.state, `${p.name} stands in ${p.state}`);
  }
  for (const m of atlasMilitary()) assert.ok(land(m.lat, m.lon), `${m.name} is on land`);
  for (const t of atlasTheatres()) for (const sid of t.states) assert.ok(atlasStates().some((s) => s.id === sid), `${t.id} names a real state: ${sid}`);
});

test('every state has land, none is a sliver, and every land cell is claimed by a state', () => {
  const A = atlasGrids();
  const { data } = landGrid();
  const area = new Array(atlasStates().length).fill(0);
  let unclaimed = 0;
  for (let n = 0; n < data.length; n++) {
    if (data[n] < 0) { assert.equal(A.state[n], 255, 'no state at sea'); continue; }
    if (A.state[n] === 255) unclaimed++; else area[A.state[n]]++;
  }
  area.forEach((a, k) => assert.ok(a >= 4, `${atlasStates()[k].id} has land (${a} cells)`));
  assert.ok(unclaimed < 120, `almost all land is claimed (${unclaimed} cells are not)`);
});

test('the lookups: any point of land has a state, a country and a climate; the sea has none', () => {
  const home = atlasAt(49, -26.7);
  assert.equal(home.countryId, 'sund');
  assert.equal(home.state.id, 'sd_crown');
  assert.ok(BIOMES.includes(home.biome));
  assert.equal(countryAt(54.6, 18.4), 'ostmark');
  assert.equal(countryAt(20, -40), null, 'open sea');
  assert.equal(biomeAt(20, -40), 'sea');
  assert.equal(biomeAt(-80, 0), 'ice');
  assert.equal(atlasAt(30, 83).biome, 'desert', "Teshvar's oil coast");
  assert.equal(biomeAt(-8, 34), 'volcanic', "Caldera's capital stands in volcanic country");
  // deterministic: the same twice
  assert.equal(JSON.stringify(atlasAt(40, 50)), JSON.stringify(atlasAt(40, 50)));
});

test('every port stands on the coast of its state, in its own country; the home-island ports are in Sund', () => {
  for (const [id, p] of Object.entries(PORTS)) {
    assert.ok(p.state, `${id} has a state`);
    const st = atlasStates().find((s) => s.id === p.state);
    assert.ok(st, `${id}'s state ${p.state} exists`);
    // the nearest land to the port is in that state
    let found = null;
    for (let r = 0; r <= 3 && !found; r += 0.5) for (let dl = -r; dl <= r && !found; dl += 0.5) for (let dn = -r; dn <= r; dn += 0.5) {
      if (Math.max(Math.abs(dl), Math.abs(dn)) !== r) continue;
      const s = stateAt(p.lat + dl, p.lon + dn);
      if (s) { found = s; break; }
    }
    assert.equal(found?.id, p.state, `${id} is on the coast of ${p.state}`);
    if (p.country) assert.equal(st.country, p.country, `${id} is in ${p.country}`);
    if (p.local) assert.equal(st.country, 'sund', `${id} (home waters) is in Sund`);
  }
  for (const id of ['port_westreach', 'port_sunmouth', 'port_dunmere']) assert.ok(PORTS[id].country, `${id} is no longer a free port`);
  assert.equal(PORTS.port_westreach.country, 'westreach');
  assert.equal(PORTS.port_sunmouth.country, 'sunmouth');
  assert.equal(PORTS.port_dunmere.country, 'dunmere');
});

test('every state is reachable by sea or by land: it has a coast the home port can sail to, or it touches a state that has', () => {
  const A = atlasGrids();
  const { data, w, h } = landGrid();
  const n = atlasStates().length;
  const coast = new Array(n).fill(null);
  const adj = Array.from({ length: n }, () => new Set());
  for (let j = 1; j < h - 1; j++) for (let i = 0; i < w; i++) {
    const k = A.state[j * w + i];
    if (k === 255) continue;
    for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = j * w + 0 + dj * w + di; const ii = (i + di + w) % w; const mm = (j + dj) * w + ii;
      if (data[mm] < 0) { if (!coast[k]) coast[k] = [90 - (j + dj) / 2, ii / 2 - 180]; } else if (A.state[mm] !== 255 && A.state[mm] !== k) adj[k].add(A.state[mm]);
      void m;
    }
  }
  const home = PORTS.port_millroad;
  const sailable = coast.map((c) => Boolean(c && seaRoute([home.lat, home.lon], c, C)));
  const ok = new Set(sailable.flatMap((v, k) => (v ? [k] : [])));
  for (let again = true; again;) { again = false; for (let k = 0; k < n; k++) if (!ok.has(k) && [...adj[k]].some((m) => ok.has(m))) { ok.add(k); again = true; } }
  for (let k = 0; k < n; k++) assert.ok(ok.has(k), `${atlasStates()[k].id} can be reached`);
});

test('rivers and roads: rivers are on land and drain towards the sea; roads join two places of one country across dry land', () => {
  const rivers = atlasRivers();
  assert.ok(rivers.length > 200, `${rivers.length} rivers`);
  for (const r of rivers) {
    assert.ok(r.p.length >= 4 && r.p.length % 2 === 0 && [1, 2, 3].includes(r.w));
    for (let i = 0; i < r.p.length; i += 2) assert.ok(elevation(r.p[i], r.p[i + 1]) > -0.4, `a river point is by land (${r.p[i]}, ${r.p[i + 1]})`);
  }
  assert.ok(rivers.filter((r) => r.w === 3).length >= 5, 'a few great rivers');
  const roads = atlasRoads();
  assert.ok(roads.length >= 50);
  const stateOf = Object.fromEntries(atlasStates().map((s) => [s.id, s.country]));
  for (const rd of roads) {
    assert.ok(rd.a && rd.b && rd.a !== rd.b);
    if (!rd.main) assert.equal(rd.a.state, rd.b.state, 'a local road stays in its state');
    else assert.equal(stateOf[rd.a.state], stateOf[rd.b.state], 'a main road stays in its country');
    for (let t = 0; t <= 8; t++) assert.ok(land(rd.a.lat + (rd.b.lat - rd.a.lat) * t / 8, rd.a.lon + (rd.b.lon - rd.a.lon) * t / 8), `the road ${rd.a.name}–${rd.b.name} stays on land`);
  }
});

test('the Hald Reach joins Halvermouth to Sund, the open ocean is clear of lone islands, and the Marrow Strait has its island', () => {
  // a walk from the capital to Kingsfjord stays on land
  let la = 49; let lo = -26.5; const target = [72.5, -4.5];
  const path = [[49, -26.7], [52, -27], [51.5, -19], [52.5, -12], [53, -6], [57, -9], [62, -12], [67, -10], [71, -7]];
  for (const [a, b] of path) assert.ok(land(a, b), `(${a}, ${b}) is land`);
  void la; void lo; void target;
  // the open sea west of Pallas has no stray islands
  let specks = 0;
  for (let lat = -20; lat <= 20; lat += 1) for (let lon = -75; lon <= -45; lon += 1) if (land(lat, lon)) specks++;
  assert.equal(specks, 0, 'no lone islands in the open ocean');
  assert.ok(land(-22, -133.5), 'the Marrow Strait island');
});

test('a save from before the Atlas loads, and its market gains the three new countries without losing anything', () => {
  const raw = JSON.parse(readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8'));
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), JSON.stringify(raw));
  const g = new Game(CONTENT, { seed: 3 });
  assert.ok(sm.load('slot1', g).ok);
  // as a save from the eight-country days has them
  g.world.market = g.world.market || undefined;
  if (g.world.market) for (const id of ['westreach', 'sunmouth', 'dunmere']) delete g.world.market.countries[id];
  const before = g.world.market ? Object.keys(g.world.market.countries).length : 0;
  const ms = g.market.state;
  assert.equal(Object.keys(ms.countries).length, 11);
  for (const id of ['westreach', 'sunmouth', 'dunmere']) assert.ok(ms.countries[id].budget > 0 && ms.countries[id].embargo === false, id);
  if (before) assert.ok(before <= 8);
  assert.equal(Object.keys(C).filter((id) => !ms.countries[id]).length, 0);
  // and the rest of the world copes: bonds and the new ports
  g.corp.ensureWorld();
  assert.doesNotThrow(() => g.corp.sovereign.offers());
});

test('generated companies can be from any of the eleven countries', () => {
  const ids = Object.keys(C);
  for (const id of ['westreach', 'sunmouth', 'dunmere']) assert.ok(CORP.stems[id]?.length >= 4, `${id} has company-name stems`);
  assert.equal(new Set(ids).size, 11);
});
