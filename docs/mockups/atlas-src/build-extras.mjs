// Proposal tooling: rivers (priority-flood on a quarter-degree grid of the game's own terrain), roads between places, and unlabelled villages.
import { readFileSync, writeFileSync } from 'node:fs';
const geo = await import('./geography.patched.mjs');
const atlas = JSON.parse(readFileSync(new URL('./atlas-out.json', import.meta.url)));
const RES = 4, W = 360 * RES, H = 180 * RES + 1;
const E = new Float32Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) E[j * W + i] = geo.elevation(90 - j / RES, i / RES - 180);
// priority flood from the sea: every land cell drains to a coast
const filled = new Float32Array(E), parent = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
class Heap { constructor() { this.a = []; } push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }
const heap = new Heap();
const nb = (n) => { const j = (n / W) | 0, i = n % W; const out = []; for (const [dj, di] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) { const jj = j + dj; if (jj < 0 || jj >= H) continue; out.push(jj * W + ((i + di + W) % W)); } return out; };
for (let n = 0; n < W * H; n++) if (E[n] < 0) { done[n] = 1; heap.push(E[n], n); }
while (heap.size) { const [, n] = heap.pop(); for (const m of nb(n)) { if (done[m]) continue; done[m] = 1; parent[m] = n; filled[m] = Math.max(E[m], filled[n] + 1e-4); heap.push(filled[m], m); } }
const order = [...Array(W * H).keys()].filter((n) => E[n] >= 0).sort((a, b) => filled[b] - filled[a]);
const acc = new Float32Array(W * H).fill(1);
for (const n of order) if (parent[n] >= 0 && E[parent[n]] >= 0) acc[parent[n]] += acc[n];
const rivers = [];
const T = 70;
for (let n = 0; n < W * H; n++) { if (E[n] < 0.02 || acc[n] < T) continue; const p = parent[n]; if (p < 0) continue; const a = [90 - ((n / W) | 0) / RES, (n % W) / RES - 180], b = [90 - ((p / W) | 0) / RES, (p % W) / RES - 180]; if (Math.abs(a[1] - b[1]) > 1) continue; rivers.push([+a[0].toFixed(2), +a[1].toFixed(2), +b[0].toFixed(2), +b[1].toFixed(2), Math.round(acc[n])]); }
// roads: each place to its state's hub; hubs of one country joined; only where the straight line is dry land
const landLine = (a, b) => { const d = Math.hypot(a.lat - b.lat, a.lon - b.lon); const k = Math.max(2, Math.ceil(d * 4)); for (let t = 0; t <= k; t++) { const la = a.lat + (b.lat - a.lat) * t / k, lo = a.lon + (b.lon - a.lon) * t / k; if (geo.elevation(la, lo) < 0.01) return false; } return true; };
const byState = {}; atlas.places.forEach((p) => (byState[p.state] = byState[p.state] || []).push(p));
const roads = [];
const hubs = {};
for (const [st, ps] of Object.entries(byState)) { const hub = ps.find((p) => p.k === 'c') || ps.find((p) => p.k === 't') || ps[0]; const cs = atlas.states.find((s) => s.id === st).country; (hubs[cs] = hubs[cs] || []).push(hub); for (const p of ps) if (p !== hub && landLine(p, hub)) roads.push({ a: [p.lat, p.lon], b: [hub.lat, hub.lon], kind: 'local' }); }
for (const [c, hs] of Object.entries(hubs)) { if (c === 'free') continue; const cap = hs.find((h) => h.k === 'c') || hs[0]; // minimum spanning tree over hubs (Prim), skipping sea crossings
  const inT = [cap]; const rest = hs.filter((h) => h !== cap); let guard = 0; while (rest.length && guard++ < 50) { let best = null; for (const r of rest) for (const t of inT) { const d = Math.hypot(r.lat - t.lat, r.lon - t.lon); if ((!best || d < best.d) && landLine(r, t)) best = { d, r, t }; } if (!best) break; roads.push({ a: [best.r.lat, best.r.lon], b: [best.t.lat, best.t.lon], kind: 'main' }); inT.push(best.r); rest.splice(rest.indexOf(best.r), 1); } }
// villages: deterministic dots on fertile land, away from named places (unlabelled: shows where people live, not who they are)
const FERT = { grassland: 0.16, forest: 0.12, savanna: 0.08, jungle: 0.07, steppe: 0.05, taiga: 0.03, tundra: 0.01, desert: 0.01, mountain: 0.015, volcanic: 0.03, ice: 0 };
const hash = (i, j, k) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const villages = []; const aW = atlas.W;
for (let j = 0; j < atlas.H; j++) for (let i = 0; i < aW; i++) { const n = j * aW + i; if (atlas.elev[n] < 0.05) continue; const f = FERT[atlas.BIOMES[atlas.biome[n]]] ?? 0; if (hash(i, j, 1) > f) continue; const lat = 90 - j / 2 + (hash(i, j, 2) - 0.5) * 0.5, lon = i / 2 - 180 + (hash(i, j, 3) - 0.5) * 0.5; if (geo.elevation(lat, lon) < 0.05) continue; if (atlas.places.some((p) => Math.abs(p.lat - lat) < 0.6 && Math.abs(p.lon - lon) < 0.9)) continue; villages.push([+lat.toFixed(2), +lon.toFixed(2)]); }
writeFileSync(new URL('./extras.json', import.meta.url), JSON.stringify({ rivers, roads, villages }));
console.log('rivers', rivers.length, 'roads', roads.length, 'villages', villages.length);
