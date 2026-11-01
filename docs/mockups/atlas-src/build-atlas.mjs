// Proposal tooling: assign every land cell to a state (a weighted nearest-seed Voronoi cut by country limits), snap places to land, pick biomes, report problems.
import { readFileSync, writeFileSync } from 'node:fs';
import { STATES, COUNTRIES, MIL } from './atlas.mjs';
const grid = JSON.parse(readFileSync(new URL('./grid.json', import.meta.url)));
const { W, H, elev, relief, biome } = grid;
const D = Math.PI / 180;
const latOf = (j) => 90 - j / 2, lonOf = (i) => i / 2 - 180;
const idxOf = (lat, lon) => Math.max(0, Math.min(H - 1, Math.round((90 - lat) * 2))) * W + (((Math.round((lon + 180) * 2)) % W) + W) % W;
const isLand = (lat, lon) => elev[idxOf(lat, lon)] >= 0;
const dist = (a, b, c, d) => { const x = ((((b - d) + 540) % 360) - 180) * Math.cos(((a + c) / 2) * D); return Math.hypot(a - c, x); };
// snap a point to the nearest land cell within r degrees
function snap(lat, lon, r = 4) {
  if (isLand(lat, lon)) return { lat, lon, moved: 0 };
  let best = null;
  for (let dj = -r * 2; dj <= r * 2; dj++) for (let di = -r * 2; di <= r * 2; di++) {
    const la = lat + dj / 2, lo = lon + di / 2;
    if (la < -90 || la > 90 || !isLand(la, lo)) continue;
    const d = dist(lat, lon, la, lo); if (!best || d < best.d) best = { d, la, lo };
  }
  return best ? { lat: best.la, lon: best.lo, moved: best.d } : null;
}
const problems = [];
const seeds = STATES.map((s, k) => { const p = snap(s.seed[0], s.seed[1], 6); if (!p) problems.push(`seed off land: ${s.id}`); else if (p.moved > 3) problems.push(`seed ${s.id} moved ${p.moved.toFixed(1)}°`); return { ...s, k, lat: p ? p.lat : s.seed[0], lon: p ? p.lon : s.seed[1] }; });
// state of each land cell: nearest seed by (distance ÷ weight), within a limit; country borders are the edges between states of different countries
const MAXD = 22;
const state = new Int16Array(W * H).fill(-1);
for (let j = 0; j < H; j++) { const lat = latOf(j); for (let i = 0; i < W; i++) {
  const e = elev[j * W + i]; if (e < 0) continue; const lon = lonOf(i);
  let best = -1, bd = 1e9;
  for (const s of seeds) { const d = dist(lat, lon, s.lat, s.lon) / s.w; if (d < bd) { bd = d; best = s.k; } }
  if (lat < -64) { best = seeds.find((s) => s.id === 'fr_southern_ice').k; state[j * W + i] = best; continue; }
  // southern ice only below -64; every other state claims land within MAXD × its weight (so a heavy state never swallows its neighbours' coasts)
  let b2 = -1, d2 = 1e9; for (const s of seeds) { if (s.id === 'fr_southern_ice') continue; const d = dist(lat, lon, s.lat, s.lon) / s.w; if (d < d2) { d2 = d; b2 = s.k; } }
  if (b2 >= 0 && d2 < MAXD) state[j * W + i] = b2;
} }
// biomes (9 kinds): the game's own climate (ice/tundra/desert/forest/grass) refined by relief and the state's own character
const BIOMES = ['sea', 'ice', 'tundra', 'taiga', 'forest', 'grassland', 'steppe', 'desert', 'savanna', 'jungle', 'mountain', 'volcanic'];
const BI = Object.fromEntries(BIOMES.map((b, n) => [b, n]));
const out = new Uint8Array(W * H);
for (let j = 0; j < H; j++) { const lat = latOf(j); const a = Math.abs(lat); for (let i = 0; i < W; i++) {
  const n = j * W + i; if (elev[n] < 0) continue;
  const s = state[n] >= 0 ? seeds[state[n]] : null; let b;
  if (a > 72) b = 'ice';
  else if ((elev[n] > 2.1 || (relief[n] > 0.95 && elev[n] > 1.1)) && a < 70) b = 'mountain';
  else if (s?.biome && !(s.biome === 'mountain' && relief[n] < 0.12)) b = s.biome === 'mountain' ? 'mountain' : s.biome;
  else { const g = biome[n]; b = g === 1 ? 'ice' : g === 2 ? 'tundra' : g === 3 ? 'desert' : g === 4 ? (a > 48 ? 'taiga' : a < 14 ? 'jungle' : 'forest') : (a < 22 ? 'savanna' : 'grassland'); }
  if (s?.biome === 'volcanic' && relief[n] > 0.25) b = 'volcanic';
  else if (s?.biome === 'volcanic' && b !== 'mountain') b = 'savanna';
  if (b === 'steppe' && s?.biome !== 'steppe') b = 'grassland';
  out[n] = BI[b];
} }
// places
const places = [];
for (const s of seeds) for (const p of s.places || []) {
  const [name, ll, k] = p.split('|'); const [la, lo] = ll.split(',').map(Number); const sn = snap(la, lo, 3);
  if (!sn) { problems.push(`place off land: ${name} (${s.id})`); continue; }
  if (sn.moved > 1.6) problems.push(`place ${name} moved ${sn.moved.toFixed(1)}°`);
  places.push({ name, lat: sn.lat, lon: sn.lon, k, state: s.id, country: s.country });
}
const mil = MIL.map(([name, la, lo, country, kind]) => { const sn = snap(la, lo, 3); if (!sn) problems.push(`mil off land: ${name}`); return { name, lat: sn?.lat ?? la, lon: sn?.lon ?? lo, country, kind }; });
// per-state areas, to check no state is a sliver and every state exists
const area = new Array(seeds.length).fill(0); for (let n = 0; n < W * H; n++) if (state[n] >= 0) area[state[n]] += Math.cos(latOf(Math.floor(n / W)) * D);
seeds.forEach((s) => { if (area[s.k] < 15) problems.push(`state ${s.id} tiny (${area[s.k].toFixed(0)})`); });
let unclaimed = 0; for (let n = 0; n < W * H; n++) if (elev[n] >= 0 && state[n] < 0) unclaimed++;
problems.push(`unclaimed land cells: ${unclaimed}`);
writeFileSync(new URL('./atlas-out.json', import.meta.url), JSON.stringify({ W, H, elev: grid.elev, relief: grid.relief, state: Array.from(state), biome: Array.from(out), BIOMES, states: seeds.map(({ k, id, name, country, lat, lon, tag, w, biome }) => ({ k, id, name, country, lat, lon, tag, w, biome: biome || null, area: Math.round(area[k]) })), places, mil, countries: COUNTRIES }));
console.log(problems.join('\n') || 'no problems');
console.log('states', seeds.length, 'places', places.length, 'mil', mil.length);
