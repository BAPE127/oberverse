// Proposal tooling (not game code): the world's geography with the proposed Sund redraw, sampled onto the same half-degree grid the game uses.
// The redraw adds one chain of land (the "Hald Reach") joining Sund's southern tip to the Halvermouth island, so the capital sits at the south-west end of one kingdom.
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
let src = readFileSync(new URL('../../../src/world/geography.js', import.meta.url), 'utf8');
const old = "  [[52, -27, 3.4], [49, -25, 3], [46, -23, 2.2]],";
if (!src.includes(old)) throw new Error('home island chain not found');
// the Hald Reach: from Sund's southern tip west-south-west to the home island's north end
src = src.replace(old, old + "\n  [[53, -6, 2.2], [52.5, -12, 2.1], [51.5, -19, 2.3], [52, -27, 3.4]],");
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
writeFileSync(here + 'grid.json', JSON.stringify({ W, H, elev: Array.from(elev, (v) => Math.round(v * 100) / 100), relief: Array.from(relief, (v) => Math.round(v * 100) / 100), biome: Array.from(biome) }));
let land = 0; for (const v of elev) if (v >= 0) land++;
console.log('grid written; land cells', land);
