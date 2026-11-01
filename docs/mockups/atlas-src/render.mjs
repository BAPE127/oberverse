// Proposal tooling: renders the atlas base layer at pixel resolution straight from the game's own terrain function (no upscaling, so coasts stay sharp).
// usage: node render.mjs <name> <latMin> <latMax> <lonMin> <lonMax> <pixelsPerDegree> [mode: political|biome|theatres]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { THEATRES } from './atlas.mjs';
const geo = await import('./geography.patched.mjs');
const [, , name, a0, a1, o0, o1, ppdArg, mode = 'political'] = process.argv;
const la0 = +a0, la1 = +a1, lo0 = +o0, lo1 = +o1, ppd = +ppdArg;
const atlas = JSON.parse(readFileSync(new URL('./atlas-out.json', import.meta.url)));
const W = Math.round((lo1 - lo0) * ppd), H = Math.round((la1 - la0) * ppd);
const D = Math.PI / 180;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BC = { ice: '#e9f0f5', tundra: '#b6c2a8', taiga: '#3f6a4e', forest: '#4a8a48', grassland: '#8fbc58', steppe: '#c8b668', desert: '#e2c27c', savanna: '#c9a24a', jungle: '#2a7a46', mountain: '#8d877b', volcanic: '#6e4a44' };
const BIDX = Object.fromEntries(atlas.BIOMES.map((b, n) => [b, n]));
const lat = new Float32Array(H), lon = new Float32Array(W);
for (let y = 0; y < H; y++) lat[y] = la1 - (y + 0.5) / ppd;
for (let x = 0; x < W; x++) lon[x] = lo0 + (x + 0.5) / ppd;
const PAD = 1, PW = W + 2 * PAD;
const elev = new Float32Array(PW * (H + 2 * PAD));
for (let y = -PAD; y < H + PAD; y++) for (let x = -PAD; x < W + PAD; x++) elev[(y + PAD) * PW + x + PAD] = geo.elevation(la1 - (y + 0.5) / ppd, lo0 + (x + 0.5) / ppd);
const E = (x, y) => elev[(y + PAD) * PW + x + PAD];
// states: weighted nearest seed (the same rule as the 0.5° atlas, now per pixel)
const seeds = atlas.states; const southIce = seeds.find((s) => s.id === 'fr_southern_ice').k;
const state = new Int16Array(W * H).fill(-1), bio = new Uint8Array(W * H);
const theatreOf = {}; THEATRES.forEach((t, n) => t.states.forEach((s) => { if (theatreOf[s] === undefined) theatreOf[s] = n; }));
const near = seeds.filter((s) => s.id !== 'fr_southern_ice');
for (let y = 0; y < H; y++) { const la = lat[y]; const cl = Math.cos(la * D);
  for (let x = 0; x < W; x++) { if (E(x, y) < 0) continue; const lo = lon[x];
    if (la < -64) { state[y * W + x] = southIce; continue; }
    let best = -1, bd = 1e9;
    const wl = la + 0.55 * Math.sin(lo * 0.9 + la * 0.55) + 0.2 * Math.sin(lo * 2.3 - la * 1.7), wo = lo + (0.55 * Math.sin(la * 0.8 - lo * 0.45) + 0.2 * Math.sin(la * 2.1 + lo * 1.9)) / Math.max(0.3, cl);
    for (const s of near) { const dl = ((((wo - s.lon) + 540) % 360) - 180) * cl; const d = Math.hypot(wl - s.lat, dl) / s.w; if (d < bd) { bd = d; best = s.k; } }
    if (bd < 22) state[y * W + x] = best;
  } }
// biome per pixel: the game's climate refined by height and the state's own character (same rules as the atlas)
for (let y = 0; y < H; y++) { const la = lat[y], a = Math.abs(la); for (let x = 0; x < W; x++) { const e = E(x, y); if (e < 0) continue; const lo = lon[x]; const s = state[y * W + x] >= 0 ? seeds[state[y * W + x]] : null; let b;
  const rel = geo.relief(la, lo, e);
  if (a > 72) b = 'ice';
  else if ((e > 2.1 || (rel > 0.95 && e > 1.1)) && a < 70) b = 'mountain';
  else if (s?.biome && s.biome !== 'mountain' && s.biome !== 'volcanic') { b = s.biome; const g0 = geo.biome(la, lo, e); if ((b === 'taiga' || b === 'jungle' || b === 'forest') && g0 === 'grass') b = b === 'jungle' ? 'savanna' : 'grassland'; else if (b === 'desert' && g0 !== 'desert') b = 'steppe'; else if (b === 'steppe' && g0 === 'forest') b = 'grassland'; }
  else if (s?.biome === 'mountain' && rel > 0.12) b = 'mountain';
  else { const g = geo.biome(la, lo, e); const aw = Math.abs(la + 3.2 * Math.sin(lo * 0.31 + la * 0.2) + 2 * Math.sin(lo * 0.9 - la * 0.7) + 1.2 * Math.sin(lo * 2.3 + la * 1.9)); b = aw >= 62 && aw < 72 ? 'tundra' : g === 'ice' ? 'ice' : g === 'tundra' ? (aw > 48 ? 'taiga' : 'forest') : g === 'desert' ? 'desert' : g === 'forest' ? (aw > 48 ? 'taiga' : aw < 14 ? 'jungle' : 'forest') : (aw < 22 ? 'savanna' : 'grassland'); }
  if (s?.biome === 'volcanic') b = rel > 0.25 ? 'volcanic' : 'savanna';
  if (b === 'steppe' && s?.biome !== 'steppe') b = 'grassland';
  bio[y * W + x] = BIDX[b] ?? 0; } }
// borders (state: thin, country: thick), found as differences between neighbours and widened a little
const bw = Math.max(1, Math.round(ppd / 14)), cw = bw + Math.max(1, Math.round(ppd / 12));
const edge = new Uint8Array(W * H); // 1 state edge, 2 country edge, 3 free-territory edge
const cOf = (k) => (k < 0 ? 'x' : seeds[k].country);
for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const k = state[y * W + x]; if (k < 0) continue; for (const m of [state[y * W + x + 1], state[(y + 1) * W + x]]) { if (m < 0 || m === k) continue; const cA = cOf(k), cB = cOf(m); const v = cA === cB ? 1 : (cA === 'free' || cB === 'free' ? 3 : 2); edge[y * W + x] = Math.max(edge[y * W + x], v); } }
function widen(src, r) { const out = new Uint8Array(src); if (r <= 0) return out; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = src[y * W + x]; if (!v) continue; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r * r + 1) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (state[yy * W + xx] < 0) continue; out[yy * W + xx] = Math.max(out[yy * W + xx], v); } } return out; }
const e1 = widen(edge.map((v) => (v === 1 ? 1 : 0)), Math.floor(bw / 2)), e2 = widen(edge.map((v) => (v === 2 || v === 3 ? v : 0)), Math.floor(cw / 2));
// colour
const rgb = Buffer.alloc(W * H * 3);
const K = ppd >= 20 ? 1.1 : 0.7; // hillshade strength
const seaDeep = hex('#08203a'), seaMid = hex('#124a72'), seaShallow = hex('#2a86a8'), seaCoast = hex('#7cc8d4');
const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = y * W + x; const e = E(x, y); let c;
  if (e < 0) { const d = Math.min(1, -e / 1.1); c = d < 0.35 ? mix(seaShallow, seaMid, d / 0.35) : mix(seaMid, seaDeep, (d - 0.35) / 0.65);
    // depth contours and a pale rim of shallows near the coast
    const cl = Math.floor(-e * 5); if (cl !== Math.floor(-E(x + 1, y) * 5) || cl !== Math.floor(-E(x, y + 1) * 5)) c = c.map((v) => Math.min(255, v + 10));
    if (e > -0.08) c = mix(c, seaCoast, 0.45 * (1 + e / 0.08)); }
  else { const b = atlas.BIOMES[bio[n]]; c = hex(BC[b]); const s = state[n];
    // hillshade (light from the north-west) + slope-darkened ridges
    const dx = E(x + 1, y) - E(x - 1, y), dy = E(x, y + 1) - E(x, y - 1); const rel = geo.relief(lat[y], lon[x], e); const sh = 1 + Math.max(-0.5, Math.min(0.5, (-dx - dy) * ppd * 0.11 * K)) + (rel - 0.5) * (b === 'mountain' ? 0.5 : 0.16); c = c.map((v) => v * sh);
    // texture: tree stipple in the woods and jungle, speckle on grass and sand, so large areas are not flat colour
    const hh = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
    if ((b === 'forest' || b === 'taiga' || b === 'jungle') && hh < (ppd >= 20 ? 0.2 : 0.1)) c = c.map((v) => v * 0.78);
    else if ((b === 'grassland' || b === 'steppe' || b === 'savanna') && hh < 0.1) c = c.map((v) => v * 0.93);
    else if (b === 'desert' && hh < 0.08) c = c.map((v) => v * 1.06);
    if (b !== 'ice') c = c.map((v) => v * (0.97 + 0.06 * Math.min(1, e / 3)));
    if (mode !== 'biome' && s >= 0) { const st = seeds[s]; const t = hex(atlas.countries[st.country].color); const a = mode === 'political' ? 0.30 : 0.14; const vv = 0.93 + 0.14 * ((((s * 2654435761) >>> 0) % 100) / 100); c = c.map((v, k) => (v * (1 - a) + t[k] * a) * vv);
      if (mode === 'theatres') { const th = theatreOf[st.id]; if (th !== undefined) { const col = hex(['#ff6a5a', '#4ab4ff', '#ffb04a', '#c58aff', '#5fe08a', '#ffe14a', '#cfcfcf'][th % 7]); c = c.map((v, k) => v * 0.45 + col[k] * 0.55); } else c = c.map((v) => v * 0.62); } }
    // coast line: land beside the sea gets a dark rim
    if (E(x + 1, y) < 0 || E(x - 1, y) < 0 || E(x, y + 1) < 0 || E(x, y - 1) < 0) c = c.map((v) => v * 0.55);
    if (e1[n] && !e2[n]) c = mix(c, [8, 16, 26], 0.55);
    if (e2[n]) c = mix(c, e2[n] === 2 ? [255, 244, 200] : [235, 240, 250], 0.85);
  }
  rgb[n * 3] = c[0]; rgb[n * 3 + 1] = c[1]; rgb[n * 3 + 2] = c[2]; }
// PNG
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
const crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cc = Buffer.alloc(4); cc.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cc]); };
const raw = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
mkdirSync(new URL('./base/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./base/${name}.png`, import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]));
writeFileSync(new URL(`./base/${name}.meta.js`, import.meta.url), 'window.META=' + JSON.stringify({ name, la0, la1, lo0, lo1, ppd, W, H, mode }) + ';');
if (mode === 'political') { const st = {}; for (let y = 0; y < H; y++) { const w = Math.cos(lat[y] * D); for (let x = 0; x < W; x++) { const k = state[y * W + x]; if (k < 0) continue; const id = seeds[k].id, b = atlas.BIOMES[bio[y * W + x]]; st[id] = st[id] || {}; st[id][b] = (st[id][b] || 0) + w; } } writeFileSync(new URL(`./base/${name}.stats.json`, import.meta.url), JSON.stringify(st)); }
console.log(name, W + 'x' + H);
