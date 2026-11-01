// Proposal tooling (not game code): the world's geography with the proposed Sund redraw, sampled onto the same half-degree grid the game uses.
// The redraw adds one chain of land (the "Hald Reach") joining Sund's southern tip to the Halvermouth island, so the capital sits at the south-west end of one kingdom.
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
let src = readFileSync(new URL('../../../src/world/geography.js', import.meta.url), 'utf8');
const old = "  [[52, -27, 3.4], [49, -25, 3], [46, -23, 2.2]],";
if (!src.includes(old)) throw new Error('home island chain not found');
// the Hald Reach: from Sund's southern tip west-south-west to the home island's north end
src = src.replace(old, old + "\n  [[53, -6, 2.2], [52.5, -12, 2.1], [51.5, -19, 2.3], [52, -27, 3.4]],");
// the open ocean is left clear: no scatter of lone islands, and only the Morrow Isles keep their archipelago noise
const scatter = /  \/\/ a scatter of lone islands in the open ocean\n  if \(h < -0\.15\) \{[\s\S]*?\n  \}\n/;
if (!scatter.test(src)) throw new Error('scatter block not found');
src = src.replace(scatter, '');
const arch = /const ARCHIPELAGOS = \[[\s\S]*?\n\];/;
src = src.replace(arch, "const ARCHIPELAGOS = [\n  [-44, -18, 134, 168, 0.62], // the Morrow Isles (the only archipelago kept)\n];");
writeFileSync(here + 'geography.patched.mjs', src);
const geo = await import('./geography.patched.mjs');
const W = 720, H = 361;
const elev = new Float32Array(W * H), relief = new Float32Array(W * H), biome = new Uint8Array(W * H);
const B = { ice: 1, tundra: 2, desert: 3, forest: 4, grass: 5 };
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const lat = 90 - j / 2, lon = i / 2 - 180;
  const e = geo.elevation(lat, lon); elev[j * W + i] = e;
  if (e >= 0) { relief[j * W + i] = geo.relief(lat, lon, e); biome[j * W + i] = B[geo.biome(lat, lon, e)] || 5; }
}
// drop what is left of the specks: land pieces under 15 cells (about 3,500 km2 at 0.5 degrees) unless a port sits on them
const { PORTS } = await import('../../../src/content/logistics.js');
const comp = new Int32Array(W * H).fill(-1); const sizes = [];
for (let s0 = 0; s0 < W * H; s0++) { if (elev[s0] < 0 || comp[s0] >= 0) continue; const id = sizes.length; const st = [s0]; comp[s0] = id; let n = 0; while (st.length) { const c = st.pop(); n++; const j = (c / W) | 0, i = c % W; for (const [dj, di] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) { const jj = j + dj; if (jj < 0 || jj >= H) continue; const m = jj * W + ((i + di + W) % W); if (elev[m] >= 0 && comp[m] < 0) { comp[m] = id; st.push(m); } } } sizes.push(n); }
const keep = new Set(); sizes.forEach((n, id) => { if (n >= 15) keep.add(id); });
for (const p of Object.values(PORTS)) { const j = Math.round((90 - p.lat) * 2), i = Math.round((p.lon + 180) * 2) % W; let f = null; for (let r = 0; r <= 8 && f === null; r++) for (let dj = -r; dj <= r && f === null; dj++) for (let di = -r; di <= r; di++) { const jj = j + dj; if (jj < 0 || jj >= H) continue; const m = jj * W + ((i + di + W) % W); if (comp[m] >= 0) { f = comp[m]; break; } } if (f !== null) keep.add(f); }
const speck = new Uint8Array(W * H); let removed = 0;
for (let n = 0; n < W * H; n++) if (comp[n] >= 0 && !keep.has(comp[n])) { speck[n] = 1; elev[n] = -0.2; relief[n] = 0; biome[n] = 0; removed++; }
const specks = new Uint8Array(W * H); for (let n = 0; n < W * H; n++) if (speck[n]) { const j = (n / W) | 0, i = n % W; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj >= 0 && jj < H) specks[jj * W + ((i + di + W) % W)] = 1; } }
console.log('components', sizes.length, 'kept', keep.size, 'speck cells removed', removed);
writeFileSync(here + 'grid.json', JSON.stringify({ W, H, elev: Array.from(elev, (v) => Math.round(v * 100) / 100), relief: Array.from(relief, (v) => Math.round(v * 100) / 100), biome: Array.from(biome), specks: Array.from(specks) }));
let land = 0; for (const v of elev) if (v >= 0) land++;
console.log('grid written; land cells', land);
