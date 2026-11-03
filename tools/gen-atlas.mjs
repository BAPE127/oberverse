// Builds src/content/atlas.js from the authored Atlas data (docs/mockups/atlas-src/atlas.mjs) and the game's own geography:
// snaps seeds, places and military sites to land, traces rivers (priority flood on a quarter-degree grid) into simplified
// polylines, and joins places by road. Run: node tools/gen-atlas.mjs   (the output is committed; this is the source of its numbers).
import { writeFileSync } from 'node:fs';
import { STATES, COUNTRIES, MIL, THEATRES } from '../docs/mockups/atlas-src/atlas.mjs';
import { elevation } from '../src/world/geography.js';

const W = 720, H = 361, D = Math.PI / 180;
const E = new Float32Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) E[j * W + i] = elevation(90 - j / 2, i / 2 - 180);
const idxOf = (lat, lon) => Math.max(0, Math.min(H - 1, Math.round((90 - lat) * 2))) * W + ((Math.round((lon + 180) * 2) % W) + W) % W;
const isLand = (lat, lon) => elevation(lat, lon) >= 0.02; // the exact point, not its grid cell: places must stand on dry land
const dist = (a, b, c, d) => { const x = ((((b - d) + 540) % 360) - 180) * Math.cos(((a + c) / 2) * D); return Math.hypot(a - c, x); };
function snap(lat, lon, r) {
  if (isLand(lat, lon)) return { lat, lon, moved: 0 };
  let best = null;
  for (let dj = -r * 4; dj <= r * 4; dj++) for (let di = -r * 4; di <= r * 4; di++) {
    const la = lat + dj / 4, lo = lon + di / 4;
    if (la < -90 || la > 90 || !isLand(la, lo)) continue;
    const d = dist(lat, lon, la, lo); if (!best || d < best.d) best = { d, la, lo };
  }
  return best ? { lat: best.la, lon: best.lo, moved: best.d } : null;
}
const r1 = (v) => Math.round(v * 10) / 10;
const problems = [];
const states = STATES.map((s) => {
  const p = snap(s.seed[0], s.seed[1], 6);
  if (!p) { problems.push(`seed off land: ${s.id}`); return null; }
  return { id: s.id, name: s.name, country: s.country, seed: [r1(p.lat), r1(p.lon)], w: s.w, biome: s.biome || null, tag: s.tag, wet: s.wet || 0 };
});
const places = [];
STATES.forEach((s, k) => { for (const p of s.places || []) {
  const [name, ll, kind] = p.split('|'); const [la, lo] = ll.split(',').map(Number); const sn = snap(la, lo, 3);
  if (!sn) { problems.push(`place off land: ${name}`); continue; }
  places.push({ name, lat: r1(sn.lat), lon: r1(sn.lon), kind, state: s.id });
} });
const military = MIL.map(([name, la, lo, country, kind]) => { const sn = snap(la, lo, 3); if (!sn) problems.push(`military off land: ${name}`); return { name, lat: r1(sn?.lat ?? la), lon: r1(sn?.lon ?? lo), country, kind }; });

// ---- rivers: every land cell drains to a coast; cells that many others drain into are river
const RES = 4, RW = 360 * RES, RH = 180 * RES + 1;
const RE = new Float32Array(RW * RH);
for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) RE[j * RW + i] = elevation(90 - j / RES, i / RES - 180);
const filled = new Float32Array(RE), parent = new Int32Array(RW * RH).fill(-1), done = new Uint8Array(RW * RH);
class Heap { constructor() { this.a = []; } push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }
const nb = (n) => { const j = (n / RW) | 0, i = n % RW; const out = []; for (const [dj, di] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) { const jj = j + dj; if (jj < 0 || jj >= RH) continue; out.push(jj * RW + ((i + di + RW) % RW)); } return out; };
const heap = new Heap();
for (let n = 0; n < RW * RH; n++) if (RE[n] < 0) { done[n] = 1; heap.push(RE[n], n); }
while (heap.size) { const [, n] = heap.pop(); for (const m of nb(n)) { if (done[m]) continue; done[m] = 1; parent[m] = n; filled[m] = Math.max(RE[m], filled[n] + 1e-4); heap.push(filled[m], m); } }
const order = [...Array(RW * RH).keys()].filter((n) => RE[n] >= 0).sort((a, b) => filled[b] - filled[a]);
const acc = new Float32Array(RW * RH).fill(1);
for (const n of order) if (parent[n] >= 0 && RE[parent[n]] >= 0) acc[parent[n]] += acc[n];
const T = 120; // cells draining into a point before it counts as a river (a quarter-degree cell)
const isRiver = (n) => RE[n] >= 0.02 && acc[n] >= T && parent[n] >= 0;
const hasUp = new Uint8Array(RW * RH); // is some river cell flowing into this one
for (let n = 0; n < RW * RH; n++) if (isRiver(n) && parent[n] >= 0) hasUp[parent[n]] = 1;
const ll = (n) => [90 - ((n / RW) | 0) / RES, (n % RW) / RES - 180];
const seen = new Uint8Array(RW * RH);
const lines = [];
for (let n = 0; n < RW * RH; n++) {
  if (!isRiver(n) || hasUp[n]) continue; // start at each source
  const pts = []; let c = n; let peak = 0;
  for (;;) {
    pts.push(c); peak = Math.max(peak, acc[c]);
    const p = parent[c]; if (p < 0) break;
    if (RE[p] < 0) { pts.push(p); break; } // reached the sea
    if (seen[c]) break; // joined an earlier river
    seen[c] = 1; c = p;
    if (!isRiver(c)) { pts.push(c); break; }
  }
  if (pts.length < 4) continue;
  lines.push({ pts, peak });
}
// simplify (Douglas–Peucker, 0.12°) and quantise to 0.1°
function rdp(pts, eps) { if (pts.length < 3) return pts; const [ay, ax] = pts[0], [by, bx] = pts[pts.length - 1]; let md = 0, mi = 0; for (let i = 1; i < pts.length - 1; i++) { const [py, px] = pts[i]; const num = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)); const den = Math.hypot(bx - ax, by - ay) || 1e-9; const d = num / den; if (d > md) { md = d; mi = i; } } if (md > eps) { const l = rdp(pts.slice(0, mi + 1), eps), r = rdp(pts.slice(mi), eps); return l.slice(0, -1).concat(r); } return [pts[0], pts[pts.length - 1]]; }
const rivers = [];
for (const { pts, peak } of lines) {
  const coords = pts.map(ll); // wrap-safe: drop any line that crosses the antimeridian
  let cross = false; for (let i = 1; i < coords.length; i++) if (Math.abs(coords[i][1] - coords[i - 1][1]) > 20) cross = true;
  if (cross) continue;
  if (coords.reduce((a, c) => a + Math.abs(c[0]), 0) / coords.length > 66) continue; // the polar ice sheets drain nowhere worth drawing
  const s = rdp(coords, 0.14);
  rivers.push({ w: peak >= 2500 ? 3 : peak >= 700 ? 2 : 1, p: s.flatMap(([la, lo]) => [r1(la), r1(lo)]) });
}
rivers.sort((a, b) => b.w - a.w);

const countries = Object.fromEntries(Object.entries(COUNTRIES).map(([id, c]) => [id, { name: c.name, color: c.color, gov: c.gov, capital: c.capital, pop: c.pop, ...(c.royal ? { royal: c.royal } : {}) }]));
// ---- roads: each place to its state's hub; the hubs of a country joined (Prim) wherever the straight line stays on land
const landLine = (a, b) => { const d = Math.hypot(a.lat - b.lat, a.lon - b.lon); const k = Math.max(2, Math.ceil(d * 4)); for (let t = 0; t <= k; t++) { if (elevation(a.lat + (b.lat - a.lat) * t / k, a.lon + (b.lon - a.lon) * t / k) < 0.01) return false; } return true; };
function makeRoads() {
const idx = new Map(places.map((p, i) => [p, i]));
const byState = {}; places.forEach((p) => (byState[p.state] = byState[p.state] || []).push(p));
const roads = []; const hubs = {};
for (const [st, ps] of Object.entries(byState)) {
  const hub = ps.find((p) => p.kind === 'c') || ps.find((p) => p.kind === 't') || ps[0];
  const cs = STATES.find((s) => s.id === st).country; (hubs[cs] = hubs[cs] || []).push(hub);
  for (const p of ps) if (p !== hub && landLine(p, hub)) roads.push([idx.get(p), idx.get(hub), 0]);
}
for (const [c, hs] of Object.entries(hubs)) {
  if (c === 'free') continue;
  const cap = hs.find((h) => h.kind === 'c') || hs[0]; const inT = [cap]; const rest = hs.filter((h) => h !== cap);
  for (let guard = 0; rest.length && guard < 50; guard++) {
    let best = null;
    for (const r of rest) for (const t of inT) { const d = Math.hypot(r.lat - t.lat, r.lon - t.lon); if ((!best || d < best.d) && landLine(r, t)) best = { d, r, t }; }
    if (!best) break; roads.push([idx.get(best.r), idx.get(best.t), 1]); inT.push(best.r); rest.splice(rest.indexOf(best.r), 1);
  }
}
return roads;
}

const out = `// THE WORLD ATLAS (v0.92.0) — generated by tools/gen-atlas.mjs from docs/mockups/atlas-src/atlas.mjs and src/world/geography.js; do not hand-edit.
// Countries, their states (a weighted nearest-seed cut of the land: src/world/atlas.js), named places, military sites, theatres, rivers and roads.
// Place kinds: c capital · t city/town · p port · a airfield · b base · f fort/pass · m mine/oil/resource · r research/industry.
export const ATLAS = ${JSON.stringify({ countries, states, places, military, theatres: THEATRES, rivers, roads: [] })};
`;
const target = new URL('../src/content/atlas.js', import.meta.url);
writeFileSync(target, out);
// the lookup in src/world/atlas.js is geometric (nearest heart), so a place belongs to the state it actually stands in: settle that now
const { stateAt } = await import('../src/world/atlas.js');
let moved = 0;
for (const p of places) { const st = stateAt(p.lat, p.lon); if (st && st.id !== p.state) { p.state = st.id; moved++; } }
console.log('places settled into the state they stand in:', moved);
const roads = makeRoads();
writeFileSync(target, out.replace(/export const ATLAS = .*;\n$/s, `export const ATLAS = ${JSON.stringify({ countries, states, places, military, theatres: THEATRES, rivers, roads })};\n`));
console.log(problems.join('\n') || 'no problems');
console.log('states', states.length, 'places', places.length, "military", military.length, "rivers", rivers.length, "roads", roads.length);
