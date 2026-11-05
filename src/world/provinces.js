// The provinces of the world (v0.103.0): the strategic layer's ground. Each atlas state is cut into provinces by a jittered lattice of seeds about 1.7 degrees apart (the mock-up's cut:
// docs/mockups/atlas-src/render.mjs), each half-degree cell of land going to the nearest seed of its own state. Pure and deterministic: nothing here is saved, and a province's id never
// changes (it is the lattice cell it grew from, or `H_<state>` for a state too small to catch a seed).
//
//   provinces()            every province, in id order: { id, name, n, state, country, lat, lon, cells, terrain, coast, infra, vp, port, airfield, fort, capital, rail, road, places, neighbours, width } (rail and road list the provinces joined by a main road or any road)
//   provinceById(id)       one province or null
//   provinceAt(lat, lon)   the province of a point of land, or null at sea / unclaimed / the southern ice
//   provinceGrid()         { w, h, grid: Int16Array of province index per half-degree cell (-1 none) }
//   provinceOfPlace(name)  the province a named place of the atlas is in
//   TERRAIN                the nine ground kinds with names (a province also carries a `coast` flag; src/content/strategic.js owns the numbers they give)
import { ATLAS } from '../content/atlas.js';
import { atlasGrids, atlasStates, atlasPlaces, biomeAt } from './atlas.js';
import { GRID_RES } from './globe.js';
import { relief as reliefAt, elevation } from './geography.js';

const SP = 1.7; // degrees between seeds
const D = Math.PI / 180;
const hsh = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

let CACHE = null;

function build() {
  const G = atlasGrids(); const W = G.w; const H = G.h; const STATES = atlasStates();
  const ICE = STATES.findIndex((s) => s.id === 'fr_southern_ice');
  const stateAtCell = (i, j) => G.state[j * W + i];
  const cellLat = (j) => 90 - j / GRID_RES; const cellLon = (i) => i / GRID_RES - 180;
  const cellIdx = (lat, lon) => { const j = Math.max(0, Math.min(H - 1, Math.round((90 - lat) * GRID_RES))); const i = ((Math.round((((lon + 180) % 360) + 360) % 360 * GRID_RES)) % W + W) % W; return [i, j]; };

  // ---- seeds: the lattice, jittered; a seed counts if it falls on a state's land
  const seeds = [];
  for (let a = Math.floor(-64 / SP); a <= Math.ceil(84 / SP); a++) for (let b = Math.floor(-180 / SP); b < Math.ceil(180 / SP); b++) {
    const lat = a * SP + (hsh(a, b, 1) - 0.5) * SP * 0.8; const lon = b * SP + (hsh(a, b, 2) - 0.5) * SP * 0.8;
    if (lat > 89 || lat < -64) continue;
    const [i, j] = cellIdx(lat, lon); const k = stateAtCell(i, j); if (k === 255 || k === ICE) continue;
    seeds.push({ id: `P${a}_${b}`, lat, lon, k });
  }
  // a state too small for the lattice gets one province at its heart (snapped to its own land)
  const have = new Set(seeds.map((s) => s.k));
  STATES.forEach((s, k) => {
    if (k === ICE || have.has(k)) return;
    let best = null; let bd = 1e9;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (stateAtCell(i, j) === k) { const d = Math.hypot(cellLat(j) - s.seed[0], (cellLon(i) - s.seed[1]) * Math.cos(cellLat(j) * D)); if (d < bd) { bd = d; best = [cellLat(j), cellLon(i)]; } }
    if (best) seeds.push({ id: `H_${s.id}`, lat: best[0], lon: best[1], k });
  });
  seeds.sort((x, y) => (x.id < y.id ? -1 : 1));
  seeds.forEach((s, n) => { s.n = n; });
  const byState = new Map(); for (const s of seeds) { if (!byState.has(s.k)) byState.set(s.k, []); byState.get(s.k).push(s); }

  // ---- each cell of land to the nearest seed of its own state
  const grid = new Int16Array(W * H).fill(-1);
  const cells = new Int32Array(seeds.length);
  for (let j = 0; j < H; j++) { const lat = cellLat(j); const cl = Math.cos(lat * D);
    for (let i = 0; i < W; i++) {
      const k = stateAtCell(i, j); if (k === 255 || k === ICE) continue;
      const lon = cellLon(i); let best = -1; let bd = 1e9;
      for (const s of byState.get(k) || []) { const dl = ((((lon - s.lon) + 540) % 360) - 180) * cl; const d = Math.hypot(lat - s.lat, dl); if (d < bd) { bd = d; best = s.n; } }
      if (best >= 0) { grid[j * W + i] = best; cells[best]++; }
    } }

  // ---- what each province is made of: its climate, its relief, the sea beside it, the places in it
  const stat = seeds.map(() => ({ bio: {}, rel: 0, el: 0, n: 0, sea: 0 }));
  for (let j = 0; j < H; j += 2) { const lat = cellLat(j);
    for (let i = 0; i < W; i += 2) {
      const p = grid[j * W + i]; if (p < 0) continue; const lon = cellLon(i); const st = stat[p]; const b = biomeAt(lat, lon); st.bio[b] = (st.bio[b] || 0) + 1; const el = elevation(lat, lon); st.rel += reliefAt(lat, lon, el); st.el += el; st.n++;
      const jn = Math.min(H - 1, j + 2); const jp = Math.max(0, j - 2); const ie = (i + 2) % W; const iw = (i - 2 + W) % W;
      if (G.state[jn * W + i] === 255 || G.state[jp * W + i] === 255 || G.state[j * W + ie] === 255 || G.state[j * W + iw] === 255) st.sea++;
    } }
  const placeOf = new Map(); // name -> province n
  const inProv = seeds.map(() => []);
  for (const pl of atlasPlaces()) { const [i, j] = cellIdx(pl.lat, pl.lon); let p = grid[j * W + i]; if (p < 0) { let bd = 1e9; for (const s of seeds) { const d = Math.hypot(pl.lat - s.lat, (pl.lon - s.lon) * Math.cos(pl.lat * D)); if (d < bd) { bd = d; p = s.n; } } } placeOf.set(pl.name, p); inProv[p].push(pl); }
  const milIn = seeds.map(() => []);
  for (const m of ATLAS.military) { const [i, j] = cellIdx(m.lat, m.lon); let p = grid[j * W + i]; if (p < 0) { let bd = 1e9; for (const s of seeds) { const d = Math.hypot(m.lat - s.lat, (m.lon - s.lon) * Math.cos(m.lat * D)); if (d < bd) { bd = d; p = s.n; } } } milIn[p].push(m); }

  // ---- neighbours: provinces whose cells touch
  const nb = seeds.map(() => new Set());
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = grid[j * W + i]; if (p < 0) continue; const ie = (i + 1) % W; const q1 = grid[j * W + ie]; if (q1 >= 0 && q1 !== p) { nb[p].add(q1); nb[q1].add(p); } if (j + 1 < H) { const q2 = grid[(j + 1) * W + i]; if (q2 >= 0 && q2 !== p) { nb[p].add(q2); nb[q2].add(p); } } }

  const pv = seeds.map((s, n) => {
    const st = stat[n]; const state = STATES[s.k]; const total = st.n || 1; const places = inProv[n]; const mil = milIn[n];
    const topBio = Object.entries(st.bio).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] || 'grassland';
    const rel = st.rel / total; const el = st.el / total; const coastShare = st.sea / total;
    const city = places.some((p) => p.kind === 'c' || p.kind === 't');
    let terrain = topBio === 'mountain' || topBio === 'volcanic' ? 'mountains' : topBio === 'forest' || topBio === 'taiga' ? 'forest' : topBio === 'jungle' ? 'jungle' : topBio === 'desert' ? 'desert' : 'plains';
    if ((terrain === 'plains' || terrain === 'forest') && rel > 0.38) terrain = 'hills';
    else if (terrain === 'plains' && (topBio === 'grassland' || topBio === 'savanna') && state.wet >= 0.5 && rel < 0.2) terrain = 'farmland';
    else if (terrain === 'plains' && el < 0.12 && coastShare > 0.35 && (topBio === 'grassland' || topBio === 'tundra')) terrain = 'marsh';
    if (city) terrain = 'urban';
    const port = places.some((p) => p.kind === 'p') || mil.some((m) => m.kind === 'naval');
    const airfield = places.some((p) => p.kind === 'a') || mil.some((m) => m.kind === 'air');
    const capital = places.some((p) => p.kind === 'c');
    const fort = Math.min(5, mil.reduce((a, m) => a + (m.kind === 'fort' ? 3 : m.kind === 'hq' ? 3 : m.kind === 'army' ? 2 : 1), 0) + (places.some((p) => p.kind === 'f') ? 2 : 0));
    const vp = places.reduce((a, p) => a + (p.kind === 'c' ? 3 : p.kind === 't' ? 1 : p.kind === 'p' ? 2 : p.kind === 'r' || p.kind === 'm' ? 1 : 0), 0);
    return { id: s.id, n, state: state.id, country: state.country, lat: +s.lat.toFixed(2), lon: +s.lon.toFixed(2), cells: cells[n], terrain, coast: coastShare > 0.12, infra: 1, vp, port, airfield, fort, capital, rail: [], road: [], places: places.map((p) => p.name), neighbours: [...nb[n]].sort((a, b) => a - b), width: Math.max(8, Math.round(Math.sqrt(cells[n]) * 6)) };
  });
  // infrastructure: a town or a port lifts it, a capital more; a main road between two places puts a rail line between their provinces (and lifts both)
  for (const p of pv) { const here = p.places.map((nm) => ATLAS.places.find((q) => q.name === nm)); p.infra = Math.min(5, 1 + (here.some((q) => q.kind === 't') ? 1 : 0) + (p.port ? 1 : 0) + (p.capital ? 2 : 0) + (p.airfield ? 1 : 0)); }
  for (const p of pv) p.road = [];
  for (const [a, b, kind] of ATLAS.roads) { // walk the road's line: every province it crosses is joined to the next (a main road is a railway), and lifted
    const A = ATLAS.places[a]; const B = ATLAS.places[b]; const steps = Math.max(2, Math.ceil(Math.hypot(B.lat - A.lat, (B.lon - A.lon) * Math.cos(((A.lat + B.lat) / 2) * D)) / 0.25)); const seq = [];
    for (let k = 0; k <= steps; k++) { const lat = A.lat + ((B.lat - A.lat) * k) / steps; const lon = A.lon + ((B.lon - A.lon) * k) / steps; const [i, j] = cellIdx(lat, lon); const q = grid[j * W + i]; if (q >= 0 && q !== seq[seq.length - 1]) seq.push(q); }
    for (let k = 0; k < seq.length; k++) { const P = pv[seq[k]]; P.infra = Math.min(5, Math.max(P.infra, kind === 1 ? 3 : 2)); if (k) { const Q = pv[seq[k - 1]]; if (!P.road.includes(Q.n)) P.road.push(Q.n); if (!Q.road.includes(P.n)) Q.road.push(P.n); if (kind === 1) { if (!P.rail.includes(Q.n)) P.rail.push(Q.n); if (!Q.rail.includes(P.n)) Q.rail.push(P.n); } } }
  }
  // a name: the main place in it (a capital, then a town, a port, a works), else its state's name and a number
  const RANK = { c: 6, t: 5, p: 4, r: 3, m: 3, b: 2, f: 2, a: 1 }; const seen = new Map();
  for (const p of pv) { const pl = p.places.map((nm) => ATLAS.places.find((q) => q.name === nm)).sort((a, b) => (RANK[b.kind] || 0) - (RANK[a.kind] || 0) || (a.name < b.name ? -1 : 1))[0]; if (pl) p.name = pl.name; else { const st = STATES.find((x) => x.id === p.state); const k = (seen.get(p.state) || 0) + 1; seen.set(p.state, k); p.name = `${st.name} ${k}`; } }
  const index = new Map(pv.map((p) => [p.id, p]));
  return { list: pv, index, grid, w: W, h: H, placeOf };
}

const cache = () => (CACHE ||= build());
export const provinces = () => cache().list;
export const provinceById = (id) => cache().index.get(id) || null;
export const provinceGrid = () => { const c = cache(); return { w: c.w, h: c.h, grid: c.grid }; };
export function provinceAt(lat, lon) {
  const c = cache(); const j = Math.max(0, Math.min(c.h - 1, Math.round((90 - lat) * GRID_RES))); const i = ((Math.round((((lon + 180) % 360) + 360) % 360 * GRID_RES)) % c.w + c.w) % c.w;
  const p = c.grid[j * c.w + i]; return p < 0 ? null : c.list[p];
}
export const provinceOfPlace = (name) => { const c = cache(); const n = c.placeOf.get(name); return n === undefined ? null : c.list[n]; };

export const TERRAIN = {
  plains: { name: 'Plains' }, farmland: { name: 'Farmland' }, forest: { name: 'Forest' }, hills: { name: 'Hills' }, mountains: { name: 'Mountains' }, marsh: { name: 'Marsh' },
  urban: { name: 'Urban' }, desert: { name: 'Desert' }, jungle: { name: 'Jungle' },
};
