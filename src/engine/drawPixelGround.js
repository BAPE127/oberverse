// Pixel-art ground, v0.48.0: the Streets of Rogue look the owner drew.
//
// The ground is built in two passes at world resolution (one canvas pixel = one world pixel,
// 32 to a tile), in chunks of 16×16 tiles that the renderer builds as you come to them:
//
//  1. Pixels. Every pixel is coloured from what's under it, through noise: grass in big darker and
//     lighter patches, dirt, sand rippled by the wind, mud, rocky banks, asphalt grit, grimy
//     pavement. Where soft ground meets soft ground (grass and a path, sand and the sea) the edge
//     is ragged, not the tile grid. Water deepens away from the shore — white foam and turquoise
//     shallows on a beach, a dark bank on a pond, harbour blue by the quays — and sand is damp
//     where the sea reaches it. Indoor floors: big tiles with grout and grime, planks with grain,
//     woven carpet, stained concrete, each house its own; the walls shade the floor beside them.
//  2. Detail, drawn over that: tufts and daisies, pebbles and shells, cracked asphalt with weeds in
//     the cracks, patched repairs, manholes and drains, white edge lines and the yellow centre
//     line, brick pavers, kerbs with a gutter, planked piers, boulders; thick walls with a cap, a
//     brick (or plank, or plaster) face, windows and pillars; buildings' shadows on the street.
import { TILE_TYPES } from '../world/tiles.js';
import { hash2 } from '../core/rng.js';

export const CHUNK = 8; // tiles to a chunk side (small: one is built in a few milliseconds)
const T = 32; // world pixels to a tile
const INK = '#1b1a24';

// ------------------------------------------------------------------ noise
// Two tileable 256×256 value-noise textures (several octaves, then equalised so their values are
// spread evenly over 0..1), made once. N(x, y) has features from 2 to 128 px; big(x, y) samples the
// second one four times larger, for patches several tiles across.
const NS = 256;
function makeNoise(seed) {
  const out = new Float32Array(NS * NS);
  let amp = 1;
  for (let p = 128; p >= 2; p >>= 1) {
    const cells = NS / p;
    const lat = (i, j) => hash2(((i % cells) + cells) % cells + seed * 1013, ((j % cells) + cells) % cells + p * 7919);
    for (let y = 0; y < NS; y++) {
      const j = Math.floor(y / p);
      let fy = (y % p) / p;
      fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < NS; x++) {
        const i = Math.floor(x / p);
        let fx = (x % p) / p;
        fx = fx * fx * (3 - 2 * fx);
        const a = lat(i, j) + (lat(i + 1, j) - lat(i, j)) * fx;
        const b = lat(i, j + 1) + (lat(i + 1, j + 1) - lat(i, j + 1)) * fx;
        out[y * NS + x] += (a + (b - a) * fy) * amp;
      }
    }
    amp *= 0.55;
  }
  // equalise: rank → uniform
  const idx = Array.from(out.keys()).sort((a, b) => out[a] - out[b]);
  const eq = new Float32Array(NS * NS);
  idx.forEach((k, r) => { eq[k] = r / (NS * NS); });
  return eq;
}
let NA = null;
let NB = null;
function noise() {
  if (!NA) { NA = makeNoise(1); NB = makeNoise(2); }
}
const N = (x, y) => NA[((y & 255) << 8) | (x & 255)];
const N2 = (x, y) => NB[((y & 255) << 8) | (x & 255)];
function big(x, y) {
  const fx = x / 4;
  const fy = y / 4;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const ax = fx - ix;
  const ay = fy - iy;
  const a = N2(ix, iy) + (N2(ix + 1, iy) - N2(ix, iy)) * ax;
  const b = N2(ix, iy + 1) + (N2(ix + 1, iy + 1) - N2(ix, iy + 1)) * ax;
  return a + (b - a) * ay;
}
/** A fast per-pixel hash, 0..1. */
const ph = (x, y) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

// ------------------------------------------------------------------ colour
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
// packed for a little-endian Uint32 view of ImageData: 0xAABBGGRR
const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const P = (...hexes) => hexes.map((h) => pack(rgb(h)));
const shade = (c, k) => {
  const r = Math.min(255, (c & 255) * k) | 0;
  const g = Math.min(255, ((c >> 8) & 255) * k) | 0;
  const b = Math.min(255, ((c >> 16) & 255) * k) | 0;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
};
/** Pick from a dark→light palette by v (0..1), dithered at the boundaries. */
const pick = (pal, v, x, y) => {
  const n = pal.length;
  let i = Math.floor((v + BAYER[((y & 3) << 2) | (x & 3)] * (0.35 / n)) * n);
  if (i < 0) i = 0; else if (i >= n) i = n - 1;
  return pal[i];
};

const PX = {
  grass: P('#2c6430', '#377635', '#43883a', '#519841', '#62aa49'),
  grassEdge: pack(rgb('#2a5a2c')),
  dirt: P('#b27346', '#c4874f', '#d39a5f', '#dfad74'),
  sand: P('#dcc08a', '#e7cf9c', '#efdbad', '#f6e7c1'),
  damp: P('#c7a875', '#d2b583', '#dcc292'),
  mud: P('#56493a', '#64574a', '#726452', '#7e705c'),
  soil: P('#6a4a2c', '#7a5836', '#8a6640', '#98744c'),
  ridge: P('#34502c', '#405f33', '#4e6e3a', '#5d7d44'),
  road: P('#37393e', '#3c3e43', '#414348'),
  walk: P('#8a8890', '#919097', '#98969e'),
  plaza: P('#c8bfab', '#d1c9b6', '#dad3c2', '#e2dccd'),
  concrete: P('#86888c', '#909296', '#9a9ca0', '#a4a6aa'),
  // water: beach (foam → turquoise → blue), pond (dark, still), harbour (by the quays)
  foam: P('#e8f8f4', '#ffffff', '#c8f0ec'),
  beach: P('#86e6dc', '#5fd8dc', '#3cc4dc', '#2aaed2', '#2898c0', '#2784ad', '#26729a', '#25668a'),
  pond: P('#163a56', '#1b4664', '#215273', '#285f82'),
  harbour: P('#1f5574', '#245f7f', '#2a6a8a', '#317596'),
  pondEdge: pack(rgb('#3d7a8e')),
  void: pack(rgb('#14121a')),
};

// ------------------------------------------------------------------ tiles
const CODES = '.,=:~bpsrBDWftcgmukRx';
const CID = {};
[...CODES].forEach((c, i) => { CID[c] = i + 1; });
const SOFT = new Uint8Array(32);
const WATERY = new Uint8Array(32);
for (const c of ['.', ':', 's', 'u', 'R', '~', 'r']) SOFT[CID[c]] = 1;
WATERY[CID['~']] = 1;
WATERY[CID.r] = 1;
const SOFTISH = new Set([CID['.'], CID.R, CID.u, CID[':']]); // shores a pond has

/** Per-map facts the passes share (computed once a map). */
const facts = new WeakMap();
function factsOf(map) {
  let f = facts.get(map);
  if (f) return f;
  const W = map.width;
  const H = map.height;
  const code = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) code[y * W + x] = CID[map.tileAt(x, y)] || 0;
  f = { code, run: roadRuns(map), style: map.kind === 'interior' ? interiorStyle(map) : null };
  facts.set(map, f);
  return f;
}

/** For each road tile, the length of the run of road tiles through it, across and along. */
function roadRuns(map) {
  const W = map.width;
  const H = map.height;
  const v = new Int16Array(W * H);
  const h = new Int16Array(W * H);
  const top = new Int16Array(W * H);
  const left = new Int16Array(W * H);
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (map.tileAt(x, y) !== '=') { y++; continue; }
      let e = y;
      while (e < H && map.tileAt(x, e) === '=') e++;
      for (let k = y; k < e; k++) { v[k * W + x] = e - y; top[k * W + x] = y; }
      y = e;
    }
  }
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (map.tileAt(x, y) !== '=') { x++; continue; }
      let e = x;
      while (e < W && map.tileAt(e, y) === '=') e++;
      for (let k = x; k < e; k++) { h[y * W + k] = e - x; left[y * W + k] = x; }
      x = e;
    }
  }
  return { v, h, top, left, W };
}

// ------------------------------------------------------------------ buildings
// What a building is made of, by what it is: the cap (the top of the wall, seen from above), the
// face (its front: brick courses, planks or render) and the paint inside.
const WALLS = {
  brick: { cap: '#9a4a36', capLight: '#c0684c', capDark: '#6e2e22', face: '#8a3e2e', faceLight: '#a2503a', mortar: '#5a261c', paint: '#8a4434', inside: 'brick', pillar: '#b65e44' },
  plum: { cap: '#6e3f72', capLight: '#a06aa4', capDark: '#4a2650', face: '#c2607c', faceLight: '#d4788f', mortar: '#8e3e58', paint: '#d8a8b8', inside: 'stripes', pillar: '#e0d0d8' },
  teal: { cap: '#3a414c', capLight: '#3fc6c0', capDark: '#262b33', face: '#596370', faceLight: '#6b7684', mortar: '#3d4550', paint: '#cfd6dc', inside: 'plain', pillar: '#4a535e' },
  cream: { cap: '#8a7262', capLight: '#b49a86', capDark: '#5e4a40', face: '#e4d4b4', faceLight: '#f0e4c8', mortar: '#b8a384', paint: '#e9dcc3', inside: 'wainscot', pillar: '#a88e7a' },
  wood: { cap: '#7a4e2e', capLight: '#a06a40', capDark: '#4e301c', face: '#8e5c36', faceLight: '#a87044', mortar: '#5a381e', paint: '#9a6a44', inside: 'planks', pillar: '#6a4024' },
  stone: { cap: '#6e6c70', capLight: '#a4a2a6', capDark: '#4a484e', face: '#a8a49c', faceLight: '#bcb8b0', mortar: '#7a766e', paint: '#cec8bc', inside: 'stone', pillar: '#c4c0b8' },
  navy: { cap: '#323c56', capLight: '#5a6c94', capDark: '#1e2438', face: '#4a5672', faceLight: '#5e6a88', mortar: '#2e3850', paint: '#c8d0dc', inside: 'plain', pillar: '#8a96b0' },
};
const FLOORS = {
  t: [['#dcd6cc', '#ccc6bc', '#b8b2a8'], ['#3f9b98', '#2f8082', '#246466'], ['#5e6248', '#53573f', '#44482f'], ['#b8bcc4', '#a9aeb7', '#949aa4'], ['#d8d2c4', '#3a3a44', '#2a2a32']],
  f: [['#b0805a', '#a47652', '#7c5436'], ['#7a5034', '#6c462c', '#4e301c'], ['#c8a07a', '#bc946e', '#94704e']],
  c: [['#8e5a6e', '#7e4e60'], ['#8a2a30', '#741f26'], ['#33406a', '#2a3558'], ['#3e6a4a', '#33583d']],
};

function interiorStyle(map) {
  const d = map.def || {};
  const name = `${d.id} ${d.name || ''} ${d.trade || ''}`;
  const seed = [...String(d.id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  let wall = d.wallStyle;
  if (!wall) {
    if (/shack|barn|storage|warehouse|stable|shed|beach|hut|cabin|saloon|barrack/i.test(name)) wall = 'wood';
    else if (/gun|armory|workshop|works|factory|refinery|garage|repair/i.test(name)) wall = 'brick';
    else if (/church|chapel|mission|civic|bank|vault|court|hall\b|police|jail|museum|library|post office/i.test(name)) wall = 'stone';
    else if (/office|tower|lobby|exchange|trust|insurance|securities|ledger|herald|mutual|telephone/i.test(name)) wall = 'navy';
    else if (/shop|store|market|grocer|pharmac|hardware|feed|dealer|garage|repair|kiosk/i.test(name)) wall = 'teal';
    else if (/cafe|diner|kettle|bar|pub|grill|bakery|kitchen|works|factory|school|armory|gun/i.test(name)) wall = 'brick';
    else if (/hotel|cinema|rialto|club|lounge/i.test(name)) wall = 'plum';
    else wall = ['cream', 'plum', 'brick', 'cream'][seed % 4];
  }
  const fl = (ch, def) => {
    const list = FLOORS[ch];
    const i = d.floorStyle?.[ch] ?? (ch === 't' && /shop|store|market|pharmac/i.test(name) ? 3 : ch === 't' && /gun|armory|works/i.test(name) ? 2 : def ?? (seed >>> 3) % list.length);
    return list[i % list.length].map(rgb).map(pack);
  };
  // how worn the floor is: a workshop or a gun shop is filthy, a café is kept clean
  const grime = d.grime ?? (/gun|armory|works|garage|repair|storage|warehouse|jail|barn|shack|sump/i.test(name) ? 0.62 : /cafe|kettle|hotel|bank|office|lounge/i.test(name) ? 0.9 : 0.8);
  return { wall: WALLS[wall] || WALLS.cream, wallName: wall, grime, t: fl('t', /cafe|kettle|diner/i.test(name) ? 0 : undefined), f: fl('f'), c: fl('c') };
}

// ------------------------------------------------------------------ pass 1: pixels
const M = 64; // margin (px) around a chunk the shore distances look into (as far as a shore colours the water)

/** Fill the pixels of tiles [tx0, tx0+tw) × [ty0, ty0+th) into ctx (at its 0,0). */
function paintPixels(ctx, map, tx0, ty0, tw, th) {
  const img = typeof ctx.createImageData === 'function' ? ctx.createImageData(tw * T, th * T) : null;
  if (!img?.data) return false; // (a test's stand-in canvas)
  noise();
  const F = factsOf(map);
  const W = map.width;
  const H = map.height;
  const pw = tw * T;
  const phh = th * T;
  const X0 = tx0 * T;
  const Y0 = ty0 * T;
  // noise is sampled where the map sits in its region, so it runs on unbroken across a seam
  const OX = map.groundOrigin?.x || 0;
  const OY = map.groundOrigin?.y || 0;
  const S = pw + 2 * M; // stride of the margin grid
  const SH = phh + 2 * M;
  const code = F.code;
  // past the map's edge: the next map over (a street's neighbours, given by the renderer), else the ground carries on as at the edge
  const beyond = map.groundBeyond;
  const tileCode = (tx, ty) => {
    if (tx >= 0 && ty >= 0 && tx < W && ty < H) return code[ty * W + tx];
    const n = beyond ? beyond(tx, ty) : null;
    return n ? CID[n] || 0 : code[(ty < 0 ? 0 : ty >= H ? H - 1 : ty) * W + (tx < 0 ? 0 : tx >= W ? W - 1 : tx)];
  };
  // the tiles of the chunk and a ring round it
  const TW = tw + 2;
  const TC = new Uint8Array(TW * (th + 2));
  let waterNear = false;
  for (let y = 0; y < th + 2; y++) for (let x = 0; x < TW; x++) {
    const c = tileCode(tx0 - 1 + x, ty0 - 1 + y);
    TC[y * TW + x] = c;
    if (WATERY[c]) waterNear = true;
  }
  // what's under each pixel (ragged where soft meets soft); the margin only matters near water
  const C = new Uint8Array(S * SH);
  const m0 = waterNear ? 0 : M;
  for (let y = m0; y < SH - m0; y++) {
    const wy = Y0 - M + y;
    const row = y * S;
    for (let x = m0; x < S - m0; x++) {
      const wx = X0 - M + x;
      const tx = wx >> 5;
      const ty = wy >> 5;
      let c = tileCode(tx, ty);
      if (SOFT[c]) {
        const gx = wx + OX;
        const gy = wy + OY;
        const qx = (wx + Math.round((NA[(((gy + 31) & 255) << 8) | ((gx + 97) & 255)] - 0.5) * 14)) >> 5;
        const qy = (wy + Math.round((NA[(((gy + 177) & 255) << 8) | ((gx + 13) & 255)] - 0.5) * 14)) >> 5;
        const d = tileCode(qx, qy);
        if (SOFT[d]) c = d;
      }
      C[row + x] = c;
    }
  }
  // shore distances (×2, capped): land pixels to the water, water pixels to the land (and what land)
  let D = null;
  let LAB = null;
  let DS = null;
  if (waterNear) {
    const n = S * SH;
    const run = (isSource) => {
      const d = new Uint8Array(n).fill(255);
      const lab = new Uint8Array(n);
      for (let i = 0; i < n; i++) if (isSource(C[i])) { d[i] = 0; lab[i] = C[i]; }
      for (let y = 0; y < SH; y++) for (let x = 0; x < S; x++) {
        const i = y * S + x;
        let best = d[i];
        let l = lab[i];
        if (x > 0 && d[i - 1] + 2 < best) { best = d[i - 1] + 2; l = lab[i - 1]; }
        if (y > 0) {
          if (d[i - S] + 2 < best) { best = d[i - S] + 2; l = lab[i - S]; }
          if (x > 0 && d[i - S - 1] + 3 < best) { best = d[i - S - 1] + 3; l = lab[i - S - 1]; }
          if (x < S - 1 && d[i - S + 1] + 3 < best) { best = d[i - S + 1] + 3; l = lab[i - S + 1]; }
        }
        d[i] = best;
        lab[i] = l;
      }
      for (let y = SH - 1; y >= 0; y--) for (let x = S - 1; x >= 0; x--) {
        const i = y * S + x;
        let best = d[i];
        let l = lab[i];
        if (x < S - 1 && d[i + 1] + 2 < best) { best = d[i + 1] + 2; l = lab[i + 1]; }
        if (y < SH - 1) {
          if (d[i + S] + 2 < best) { best = d[i + S] + 2; l = lab[i + S]; }
          if (x < S - 1 && d[i + S + 1] + 3 < best) { best = d[i + S + 1] + 3; l = lab[i + S + 1]; }
          if (x > 0 && d[i + S - 1] + 3 < best) { best = d[i + S - 1] + 3; l = lab[i + S - 1]; }
        }
        d[i] = best;
        lab[i] = l;
      }
      return { d, lab };
    };
    const toWater = run((c) => WATERY[c] === 1);
    const toLand = run((c) => WATERY[c] !== 1);
    D = toWater.d;
    LAB = toLand.lab;
    for (let i = 0; i < n; i++) if (WATERY[C[i]]) D[i] = toLand.d[i];
    // and how far each pixel of water is from a beach (the shallows and the surf go by that alone)
    let sand = false;
    for (let i = 0; i < n && !sand; i++) if (C[i] === CID.s) sand = true;
    if (sand) DS = run((c) => c === CID.s).d;
  }
  const out = new Uint32Array(img.data.buffer);
  const st = F.style;
  const interior = map.kind === 'interior';
  const capCol = st ? pack(rgb(st.wall.cap)) : pack(rgb('#5b4a45'));
  const WALL = CID.W;
  for (let y = 0; y < phh; y++) {
    const ly = Y0 + y;
    const ty = ly >> 5;
    const iy = ly & 31;
    const wy = ly + OY; // (noise coordinates)
    const trow = ((y >> 5) + 1) * TW;
    for (let x = 0; x < pw; x++) {
      const lx = X0 + x;
      const tx = lx >> 5;
      const ix = lx & 31;
      const wx = lx + OX;
      const ti = trow + (x >> 5) + 1; // this tile in TC
      const k = (y + M) * S + (x + M);
      const c = C[k];
      let col;
      switch (c) {
        case CID['.']: {
          const v = 0.74 * big(wx, wy) + 0.26 * N(wx >> 1, wy >> 1);
          col = pick(PX.grass, v, wx, wy);
          if (D && D[k] < 4) col = PX.grassEdge; // a dark bank against the water
          else {
            // a dark seam against anything paved
            if (ix === 0 || ix === 31 || iy === 0 || iy === 31) {
              const l = TC[ti - 1]; const r = TC[ti + 1]; const u = TC[ti - TW]; const dn = TC[ti + TW];
              if ((ix === 0 && l && !SOFT[l]) || (ix === 31 && r && !SOFT[r]) || (iy === 0 && u && !SOFT[u]) || (iy === 31 && dn && !SOFT[dn])) col = PX.grassEdge;
            }
          }
          break;
        }
        case CID[':']: col = pick(PX.dirt, 0.6 * big(wx + 300, wy) + 0.4 * N(wx >> 1, wy >> 1), wx, wy); break;
        case CID.s: {
          if (D && D[k] < 5) { col = pick(PX.foam, N(wx * 3, wy * 3), wx, wy); break; } // the last of the surf
          const ripple = 0.5 + 0.5 * Math.sin(wx * 0.21 + wy * 0.07 + N2(wx, wy) * 7);
          const v = 0.25 * N(wx >> 1, wy >> 1) + 0.4 * ripple + 0.35 * big(wx, wy);
          col = D && D[k] < 26 + (N(wx + 50, wy) - 0.5) * 10 ? pick(PX.damp, v, wx, wy) : pick(PX.sand, v, wx, wy);
          break;
        }
        case CID.u: col = pick(PX.mud, 0.6 * big(wx, wy + 99) + 0.4 * N(wx >> 1, wy >> 1), wx, wy); break;
        case CID.k: col = pick(PX.soil, 0.6 * N(wx, wy) + ((wy >> 2) & 1) * 0.35 - 0.05, wx, wy); break;
        case CID.R: col = pick(PX.ridge, 0.6 * big(wx, wy) + 0.4 * N(wx >> 1, wy >> 1), wx, wy); break;
        case CID['~']: case CID.r: {
          const shore = LAB ? LAB[k] : 0;
          const dd = (D ? D[k] : 255) / 2 + (N(wx * 2, wy * 2) - 0.5) * 6;
          // all water is the same deep blue away from the shore; near a beach it's foam and turquoise
          // shallows (by the distance to the sand), by a bank dark, by a quay simply the deep
          const deep = pick(PX.harbour, 0.6 * big(wx, wy) + 0.4 * N(wx >> 1, wy >> 1), wx, wy);
          const jit = (BAYER[((wy & 3) << 2) | (wx & 3)] + 0.5) * 0.25 - 0.12;
          const ds = DS ? DS[k] / 2 + (N(wx * 2, wy * 2) - 0.5) * 6 : 999;
          const ts = ds / 54 + jit;
          if (ts < 1) {
            col = ds < 3 ? pick(PX.foam, N(wx * 3 + 7, wy * 3), wx, wy) : pick(PX.beach, Math.min(0.999, ts + 0.1 * (N2(wx, wy) - 0.5)), wx, wy);
          } else if (SOFTISH.has(shore) && dd / 14 + jit < 1) {
            col = dd < 2.5 ? PX.pondEdge : pick(PX.pond, 0.6 * big(wx, wy) + 0.4 * N(wx >> 1, wy >> 1), wx, wy);
          } else col = deep;
          break;
        }
        case CID['=']: col = pick(PX.road, 0.72 * big(wx, wy) + 0.28 * N(wx >> 1, wy >> 1), wx, wy); break;
        case CID[',']: case CID.B: case CID.D: {
          if (interior && c !== CID.B) { col = floorPx(st, 'f', wx, wy, tx, ty, ix, iy); break; }
          col = pick(PX.walk, 0.75 * big(wx + 200, wy) + 0.25 * N(wx >> 1, wy >> 1), wx, wy);
          break;
        }
        case CID.m: col = pick(PX.plaza, 0.7 * big(wx, wy) + 0.3 * N(wx >> 1, wy >> 1), wx, wy); break;
        case CID.g: {
          if (interior) { col = floorPx(st, 'g', wx, wy, tx, ty, ix, iy); break; }
          col = pick(PX.concrete, 0.7 * big(wx + 400, wy) + 0.3 * N(wx >> 1, wy >> 1), wx, wy);
          if (big(wx + 900, wy + 300) > 0.86) col = shade(col, 0.88); // stains
          break;
        }
        case CID.f: case CID.t: case CID.c: col = floorPx(st, CODES[c - 1], wx, wy, tx, ty, ix, iy); break;
        case WALL: col = capCol; break;
        case CID.x: col = PX.void; break;
        default: {
          const tt = TILE_TYPES[CODES[c - 1]] || TILE_TYPES.x;
          col = pack(rgb(hash2(tx, ty) < 0.5 ? tt.color : tt.alt || tt.color));
        }
      }
      // indoors, the walls shade the floor beside them
      if (interior && c !== WALL) {
        if (iy < 8 && TC[ti - TW] === WALL) col = shade(col, 0.68 + iy * 0.04);
        if (ix < 5 && TC[ti - 1] === WALL) col = shade(col, 0.8 + ix * 0.04);
        if (ix > 27 && TC[ti + 1] === WALL) col = shade(col, 0.92);
      }
      out[y * pw + x] = col;
    }
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

/** One pixel of an indoor floor. */
function floorPx(st, ch, wx, wy, tx, ty, ix, iy) {
  const grime = 0.5 * big(wx, wy) + 0.5 * N(wx * 2, wy * 2);
  if (ch === 't') {
    const pal = st ? st.t : P('#dcd6cc', '#ccc6bc', '#b8b2a8');
    // big square tiles, two to a side; a checker in two tones; grout, a light bevel; grime
    const sx = wx >> 4;
    const sy = wy >> 4;
    if ((wx & 15) === 0 || (wy & 15) === 0) return pal[2];
    let c = (sx + sy) & 1 ? pal[0] : pal[1];
    if ((wx & 15) === 1 || (wy & 15) === 1) c = shade(c, 1.07);
    const g0 = st ? st.grime : 0.8;
    if (grime > g0) c = shade(c, 0.95);
    if (grime > g0 + (1 - g0) * 0.6) c = shade(c, 0.94);
    return c;
  }
  if (ch === 'c') {
    const pal = st ? st.c : P('#8e5a6e', '#7e4e60');
    let c = ((wx + wy) & 1) ? pal[0] : pal[1];
    if (((wx >> 1) + (wy >> 1)) % 3 === 0) c = shade(c, 1.05);
    if (grime > (st ? st.grime : 0.8) + 0.04) c = shade(c, 0.95);
    return c;
  }
  if (ch === 'g') {
    let c = pick(PX.concrete, 0.5 * big(wx + 400, wy) + 0.5 * N(wx, wy), wx, wy);
    if ((wx & 63) === 0 || (wy & 63) === 0) c = shade(c, 0.82); // expansion joints
    if (big(wx + 900, wy + 300) > 0.84) c = shade(c, 0.88);
    return c;
  }
  // wood: planks 8 px wide running east–west, staggered ends, grain along the plank
  const pal = st ? st.f : P('#b0805a', '#a47652', '#7c5436');
  const row = wy >> 3;
  const off = Math.floor(hash2(row, 17) * 64);
  const seg = Math.floor((wx + off) / 64);
  if ((wy & 7) === 7) return pal[2];
  if (((wx + off) & 63) === 0) return pal[2];
  const tone = hash2(row, seg);
  let c = tone > 0.66 ? pal[1] : pal[0];
  if (tone < 0.18) c = shade(c, 1.06);
  const grain = N((wx >> 2) + row * 37, wy * 4 + row * 11);
  if (grain > 0.82) c = shade(c, 0.9);
  else if (grain < 0.1) c = shade(c, 1.05);
  if ((wy & 7) === 0) c = shade(c, 1.08);
  return c;
}

// ------------------------------------------------------------------ pass 2: detail
const ROADDARK = '#26282c';
const ROADLIT = '#55575c';
const LINE = '#e8b83a';
const EDGE = '#c9cccf';

function paintDetail(R, map, tx0, ty0, tw, th, pixelsDone) {
  const F = factsOf(map);
  const at = (x, y) => map.tileAt(x, y);
  // a tile's detail can spill a few pixels into its neighbours, so draw a ring of them too
  for (let y = ty0 - 1; y <= ty0 + th; y++) for (let x = tx0 - 1; x <= tx0 + tw; x++) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    detailTile(R, map, x, y, at, F, pixelsDone);
  }
  for (let y = ty0 - 1; y <= ty0 + th; y++) for (let x = tx0 - 1; x <= tx0 + tw; x++) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    edges(R, map, x, y, at);
  }
  if (map.kind === 'interior') {
    for (let y = ty0 - 1; y <= ty0 + th; y++) for (let x = tx0 - 1; x <= tx0 + tw; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      wallTile(R, map, x, y, at, F.style);
    }
  } else shadows(R, map, tx0, ty0, tw, th);
}

function detailTile(R, map, x, y, at, F, pixelsDone) {
  const ch = at(x, y);
  const px = x * T;
  const py = y * T;
  const r = hash2(x, y);
  const h = (i) => hash2(x * 31 + i * 7, y * 17 + i * 13);
  if (!pixelsDone) {
    // no pixel pass (a test's stand-in canvas): flat colours
    const tt = TILE_TYPES[ch] || TILE_TYPES.x;
    R(px, py, T, T, r < 0.5 ? tt.color : tt.alt || tt.color);
  }
  switch (ch) {
    case '.': {
      // tufts of long grass, three blades each; now and then a cluster of daisies or clover
      const n = 3 + Math.floor(r * 4);
      for (let i = 0; i < n; i++) {
        const gx = px + 3 + Math.floor(h(i) * 25);
        const gy = py + 4 + Math.floor(h(i + 9) * 24);
        const dark = h(i + 3) < 0.5;
        R(gx, gy, 1, 3, dark ? '#2c6430' : '#3d7c37');
        R(gx + 1, gy - 1, 1, 4, dark ? '#3d7c37' : '#5aa244');
        R(gx + 2, gy + 1, 1, 2, '#2c6430');
        R(gx + 1, gy - 1, 1, 1, '#7cc456');
      }
      if (r > 0.88) {
        for (let i = 0; i < 2 + Math.floor(h(20) * 3); i++) {
          const fx = px + 4 + Math.floor(h(30 + i) * 22);
          const fy = py + 4 + Math.floor(h(40 + i) * 22);
          const pet = h(50 + i) < 0.75 ? '#f4f4ee' : h(50 + i) < 0.9 ? '#f2b6cf' : '#f6dc6a';
          R(fx, fy - 1, 1, 1, pet); R(fx - 1, fy, 3, 1, pet); R(fx, fy + 1, 1, 1, pet); R(fx, fy, 1, 1, '#f2c832');
          R(fx + 1, fy + 2, 1, 1, '#2c6430');
        }
      } else if (r < 0.06) {
        R(px + 10, py + 12, 2, 2, '#3f8f6a'); R(px + 12, py + 11, 2, 2, '#4aa07a'); R(px + 11, py + 14, 2, 1, '#2f7050');
      }
      break;
    }
    case ':': case 'R': {
      // pebbles, lit from the top left
      const n = ch === 'R' ? 3 : 2 + Math.floor(r * 3);
      for (let i = 0; i < n; i++) {
        const sx = px + 2 + Math.floor(h(i) * 27);
        const sy = py + 2 + Math.floor(h(i + 5) * 27);
        const s = ch === 'R' ? 3 + Math.floor(h(i + 2) * 4) : 1 + Math.floor(h(i + 2) * 2);
        R(sx, sy, s + 1, s, ch === 'R' ? '#5a5c60' : '#9a6a44');
        R(sx, sy, s, s - (s > 1 ? 1 : 0) || 1, ch === 'R' ? '#9a9ca0' : '#e2b886');
        if (s > 2) R(sx + 1, sy + 1, s - 2, 1, ch === 'R' ? '#b8babe' : '#f0d0a4');
      }
      break;
    }
    case 's': {
      // pebbles and shells
      if (r > 0.55) { const sx = px + 4 + Math.floor(h(1) * 22); const sy = py + 4 + Math.floor(h(2) * 22); R(sx, sy, 2, 2, '#9c8aa0'); R(sx, sy, 1, 1, '#c4b6c8'); }
      if (r > 0.8) { const sx = px + 6 + Math.floor(h(3) * 18); const sy = py + 6 + Math.floor(h(4) * 18); R(sx, sy, 3, 2, '#f4e8dc'); R(sx + 1, sy + 1, 1, 1, '#d8a890'); }
      if (r < 0.25) R(px + Math.floor(h(5) * 30), py + Math.floor(h(6) * 30), 1, 1, '#8a7a6c');
      break;
    }
    case 'u': {
      if (r > 0.95) {
        // a puddle: rounded, the sky in it, a dark wet rim
        const rows = [10, 16, 20, 22, 20, 16, 10];
        const cx = px + 8 + Math.floor(h(1) * 14);
        rows.forEach((w, i) => { R(cx - w / 2 - 1, py + 10 + i, w + 2, 1, '#463a2e'); R(cx - w / 2, py + 10 + i, w, 1, i < 2 ? '#56687a' : '#465668'); });
        R(cx - 6, py + 12, 7, 1, '#8aa0b4'); R(cx + 2, py + 14, 3, 1, '#7a90a4');
      }
      if (r < 0.06) { R(px + 12, py + 14, 5, 3, '#d8d0c0'); R(px + 12, py + 14, 5, 1, '#f0ece4'); } // litter
      break;
    }
    case '=': road(R, map, x, y, at, F.run, r, h); break;
    case ',': case 'B': case 'D': {
      if (map.kind === 'interior' && ch !== 'B') break;
      // brick pavers in a running bond (16×8), mortar lines and a lit top edge; a dark one here and there
      for (let row = 0; row < 4; row++) {
        const yy = py + row * 8;
        const off = ((y * 4 + row) & 1) * 8;
        R(px, yy, T, 1, '#6c6a72');
        for (let bx = -off; bx < T; bx += 16) {
          const x0 = Math.max(0, bx);
          R(px + x0, yy + 1, Math.min(16, T - x0, bx + 16 - x0), 1, '#a8a6ae');
          if (bx > 0) R(px + bx, yy, 1, 8, '#6c6a72');
          if (hash2(x * 8 + Math.floor((bx + 16) / 16), y * 4 + row) > 0.86) R(px + x0 + 1, yy + 2, Math.min(14, T - x0 - 1, bx + 15 - x0), 5, 'rgba(40,36,48,0.10)');
        }
      }
      if (r > 0.93) { R(px + 6 + Math.floor(h(1) * 18), py + 12, 2, 2, '#5c5a62'); } // gum
      if (r < 0.04) { R(px + 8, py + 10, 1, 4, '#5c5a62'); R(px + 9, py + 13, 3, 1, '#5c5a62'); R(px + 12, py + 14, 1, 3, '#5c5a62'); } // a crack
      break;
    }
    case 'm': {
      // big slabs with joints and a bevel; a crack now and then
      R(px, py, T, 1, '#a8a092'); R(px, py, 1, T, '#a8a092'); R(px + 1, py + 1, T - 1, 1, '#ece6d8'); R(px + 1, py + 1, 1, T - 1, '#ece6d8');
      if (r > 0.88) { R(px + 6, py + 9, 6, 1, '#a8a092'); R(px + 12, py + 10, 5, 1, '#a8a092'); R(px + 17, py + 11, 4, 1, '#a8a092'); }
      break;
    }
    case 'g': {
      if (map.kind === 'interior') break;
      if (x % 2 === 0) R(px, py, 1, T, '#76787c');
      if (y % 2 === 0) R(px, py, T, 1, '#76787c');
      if (r > 0.9) { R(px + 8, py + 10, 12, 7, 'rgba(20,20,26,0.22)'); R(px + 11, py + 8, 7, 2, 'rgba(20,20,26,0.16)'); } // an oil stain
      break;
    }
    case 'k': break; // crops are drawn over it
    case 'b': case 'p': {
      const pal = ch === 'b' ? ['#9a6b45', '#8a5e3c', '#5e3c22', '#b48054'] : ['#a27650', '#946a46', '#62422a', '#bc8c60'];
      const across = ch === 'b' && at(x, y - 1) !== '~' && at(x, y + 1) !== '~';
      R(px, py, T, T, pal[0]);
      for (let k = 0; k < T; k += 8) {
        const tone = hash2(across ? y * 4 + k : x * 4 + k, across ? 3 : 5);
        const c = tone > 0.6 ? pal[1] : tone < 0.2 ? pal[3] : pal[0];
        if (across) { R(px, py + k, T, 7, c); R(px, py + k + 7, T, 1, pal[2]); R(px, py + k, T, 1, pal[3]); } else { R(px + k, py, 7, T, c); R(px + k + 7, py, 1, T, pal[2]); R(px + k, py, 1, T, pal[3]); }
        // grain and nails
        const g1 = Math.floor(hash2(x + k, y) * 24);
        if (across) { R(px + g1, py + k + 3, 6, 1, pal[1]); R(px + 2, py + k + 3, 1, 1, '#3a2a1c'); R(px + T - 3, py + k + 3, 1, 1, '#3a2a1c'); } else { R(px + k + 3, py + g1, 1, 6, pal[1]); R(px + k + 3, py + 2, 1, 1, '#3a2a1c'); R(px + k + 3, py + T - 3, 1, 1, '#3a2a1c'); }
      }
      break;
    }
    case 'r': {
      // a boulder in the water: round, lit from the top left, wet and dark below, a ring of foam
      const cx = px + 15 + Math.floor((h(1) - 0.5) * 4);
      const cy = py + 16;
      const rx = 11 + Math.floor(h(2) * 3);
      const ry = 9 + Math.floor(h(3) * 3);
      const pal = ['#3e4046', '#5e6066', '#7e8086', '#a2a4aa', '#c8cace'];
      for (let yy = -ry - 2; yy <= ry + 2; yy++) {
        const half = Math.round((rx + 2) * Math.sqrt(Math.max(0, 1 - (yy / (ry + 2)) ** 2)));
        if (half > 0) R(cx - half, cy + yy, half * 2, 1, 'rgba(255,255,255,0.35)');
      }
      for (let yy = -ry; yy <= ry; yy++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)));
        if (half <= 0) continue;
        R(cx - half - 1, cy + yy, half * 2 + 2, 1, INK);
        for (let xx = -half; xx < half; xx++) {
          const l = 0.55 - 0.4 * (xx / rx) - 0.55 * (yy / ry);
          R(cx + xx, cy + yy, 1, 1, pal[Math.max(0, Math.min(4, Math.floor(l * 4.2)))]);
        }
      }
      R(cx - 4, cy - ry + 3, 5, 1, '#e0e2e6');
      break;
    }
    case 'W': if (map.kind !== 'interior') R(px, py, T, T, '#5b4a45'); break;
    default:
  }
}

/** Asphalt: cracks with weeds, repairs, oil, debris, manholes, drains; the lines. */
function road(R, map, x, y, at, run, r, h) {
  const px = x * T;
  const py = y * T;
  const i = y * run.W + x;
  const across = run.v[i];
  const along = run.h[i];
  const junction = !(along > across && across <= 8 && across >= 2) && !(across > along && along <= 8 && along >= 2);
  // a patch: a repaired square of newer, darker asphalt
  if (h(40) > 0.97) {
    const w = 12 + Math.floor(h(41) * 14);
    const hh = 10 + Math.floor(h(42) * 12);
    const sx = px + Math.floor(h(43) * (T - w));
    const sy = py + Math.floor(h(44) * (T - hh));
    R(sx, sy, w, hh, '#34363a'); R(sx, sy, w, 1, '#2c2e32'); R(sx, sy, 1, hh, '#2c2e32'); R(sx, sy + hh - 1, w, 1, '#46484c'); R(sx + w - 1, sy, 1, hh, '#46484c');
  }
  // cracks: a wandering line, a lit edge under it, weeds in the wider ones
  if (r > 0.74) {
    let cx = px + 4 + Math.floor(h(1) * 20);
    let cy = py + 4 + Math.floor(h(2) * 20);
    const len = 6 + Math.floor(h(3) * 12);
    const dirx = h(4) < 0.5 ? 1 : -1;
    for (let k = 0; k < len; k++) {
      R(cx, cy, 1, 1, ROADDARK);
      R(cx, cy + 1, 1, 1, ROADLIT);
      if (h(10 + k) < 0.6) cx += dirx; else cy += h(30 + k) < 0.7 ? 1 : -1;
      if (h(50 + k) > 0.9) { R(cx + 1, cy, 2, 1, ROADDARK); } // a branch
      if (cx < px - 2 || cx > px + T + 1 || cy < py - 2 || cy > py + T + 1) break;
    }
    if (r > 0.86) { R(cx - 1, cy - 2, 1, 2, '#4f7a34'); R(cx, cy - 3, 1, 3, '#6a9a3e'); R(cx + 1, cy - 2, 1, 2, '#4f7a34'); R(cx, cy - 3, 1, 1, '#8cc050'); }
  }
  if (r < 0.02) { R(px + 9, py + 13, 12, 6, '#303136'); R(px + 11, py + 11, 8, 2, '#303136'); R(px + 12, py + 14, 4, 1, '#44425a'); } // oil, with a sheen
  // debris: grit and bits of brick
  for (let k = 0; k < 2; k++) if (h(60 + k) > 0.82) {
    const sx = px + Math.floor(h(62 + k) * 30);
    const sy = py + Math.floor(h(64 + k) * 30);
    R(sx, sy, 2, 1, h(66 + k) > 0.5 ? '#6a6c70' : '#8a5a44'); R(sx, sy, 1, 1, '#9a9ca0');
  }
  // a manhole cover now and then, away from the junctions
  if (!junction && h(70) > 0.985) {
    const sx = px + 8;
    const sy = py + 8;
    R(sx + 3, sy, 10, 16, '#2a2c30'); R(sx, sy + 3, 16, 10, '#2a2c30'); R(sx + 1, sy + 1, 14, 14, '#2a2c30');
    R(sx + 3, sy + 2, 10, 12, '#56585e'); R(sx + 2, sy + 3, 12, 10, '#56585e');
    for (let k = 4; k < 13; k += 3) R(sx + 3, sy + k, 10, 1, '#3e4046');
    R(sx + 4, sy + 3, 4, 1, '#7a7c82');
  }
  // the yellow centre line down the middle of a road (never in a junction), white lines by the kerbs
  if (along > across && across <= 8 && across >= 2) {
    const cy = run.top[i] * T + (across * T) / 2;
    if (cy >= py && cy < py + T) for (let k = 0; k < T; k++) if (((px + k) % 28) < 14) R(px + k, Math.round(cy) - 1, 1, 2, LINE);
    if (at(x, y - 1) !== '=' && across >= 4) R(px, py + 5, T, 1, EDGE);
    if (at(x, y + 1) !== '=' && across >= 4) R(px, py + T - 6, T, 1, EDGE);
  } else if (across > along && along <= 8 && along >= 2) {
    const cx = run.left[i] * T + (along * T) / 2;
    if (cx >= px && cx < px + T) for (let k = 0; k < T; k++) if (((py + k) % 28) < 14) R(Math.round(cx) - 1, py + k, 2, 1, LINE);
    if (at(x - 1, y) !== '=' && along >= 4) R(px + 5, py, 1, T, EDGE);
    if (at(x + 1, y) !== '=' && along >= 4) R(px + T - 6, py, 1, T, EDGE);
  }
  // a storm drain at the kerb, every few tiles
  if (!junction && (x * 7 + y * 3) % 9 === 0) {
    if (at(x, y - 1) === ',') { R(px + 10, py, 12, 4, '#1e2024'); for (let k = 11; k < 22; k += 2) R(px + k, py, 1, 4, '#5a5c62'); }
    else if (at(x, y + 1) === ',') { R(px + 10, py + T - 4, 12, 4, '#1e2024'); for (let k = 11; k < 22; k += 2) R(px + k, py + T - 4, 1, 4, '#5a5c62'); }
  }
}

const PAVED = new Set([',', 'm', 'g', 'B', 'D']);
function edges(R, map, x, y, at) {
  const ch = at(x, y);
  const px = x * T;
  const py = y * T;
  if (PAVED.has(ch) && map.kind !== 'interior') {
    // kerbs: a light lip, a dark face, and the gutter's shadow on the road
    if (at(x, y + 1) === '=') { R(px, py + T - 4, T, 2, '#d4cec6'); R(px, py + T - 2, T, 2, '#5e5a66'); R(px, py + T, T, 2, 'rgba(0,0,0,0.25)'); }
    if (at(x, y - 1) === '=') { R(px, py, T, 1, '#5e5a66'); R(px, py + 1, T, 2, '#d4cec6'); R(px, py - 2, T, 2, 'rgba(0,0,0,0.12)'); }
    if (at(x + 1, y) === '=') { R(px + T - 3, py, 2, T, '#d4cec6'); R(px + T - 1, py, 1, T, '#5e5a66'); R(px + T, py, 2, T, 'rgba(0,0,0,0.2)'); }
    if (at(x - 1, y) === '=') { R(px, py, 1, T, '#5e5a66'); R(px + 1, py, 2, T, '#d4cec6'); R(px - 2, py, 2, T, 'rgba(0,0,0,0.2)'); }
  }
  if (ch === '~') {
    // a stone lip against quays and pavements (soft shores are ragged and drawn by the pixels)
    const hard = (n) => n && !['~', 'x', 'r', 'b', 'p', '.', ':', 's', 'u', 'R'].includes(n);
    const lip = (x0, y0, w, h, n) => { R(x0, y0, w, h, '#8b8b86'); if (h <= 3) R(x0, y0 + (n === 'top' ? 0 : h - 1), w, 1, '#b4b2aa'); };
    if (hard(at(x, y - 1)) && y > 0) { lip(px, py, T, 3, 'top'); R(px, py + 3, T, 3, 'rgba(0,0,0,0.22)'); }
    if (hard(at(x, y + 1)) && y < map.height - 1) lip(px, py + T - 3, T, 3, 'bottom');
    if (hard(at(x - 1, y)) && x > 0) { R(px, py, 3, T, '#8b8b86'); R(px + 3, py, 2, T, 'rgba(0,0,0,0.18)'); }
    if (hard(at(x + 1, y)) && x < map.width - 1) R(px + T - 3, py, 3, T, '#8b8b86');
  }
}

/** Buildings throw a shadow to the lower right on the street (the light is from the top left). */
function shadows(R, map, tx0, ty0, tw, th) {
  const x0 = tx0 * T - T;
  const y0 = ty0 * T - T;
  const x1 = (tx0 + tw + 1) * T;
  const y1 = (ty0 + th + 1) * T;
  for (const b of map.buildings || []) {
    const bx = b.x * T;
    const by = b.y * T;
    const bw = b.w * T;
    const bh = b.h * T;
    if (bx > x1 || by > y1 || bx + bw + 12 < x0 || by + bh + 12 < y0) continue;
    R(bx + bw, by + 10, 10, bh, 'rgba(12,10,24,0.30)');
    R(bx + 10, by + bh, bw, 6, 'rgba(12,10,24,0.24)');
  }
}

// ------------------------------------------------------------------ walls
/** A wall tile indoors: a cap seen from above; where the floor (or the street) lies below it, its face. */
function wallTile(R, map, x, y, at, st) {
  const ch = at(x, y);
  const px = x * T;
  const py = y * T;
  if (ch === 'D') {
    // the doorway: posts either side, a worn threshold
    R(px, py, 3, T, INK); R(px + T - 3, py, 3, T, INK); R(px + 1, py, 2, T, '#6e4a30'); R(px + T - 3, py, 2, T, '#6e4a30');
    R(px + 3, py + T - 6, T - 6, 6, '#7a6a5a'); R(px + 3, py + T - 6, T - 6, 1, '#a89888');
    return;
  }
  if (ch !== 'W') return;
  const s = st.wall;
  const aloft = map.def?.aloft;
  if (aloft && map.def.roof) {
    // v0.41.0: a roof's parapet — a low concrete lip, the drop beyond it
    const n = y === 0 ? [0, T - 10, T, 10] : y === map.height - 1 ? [0, 0, T, 10] : x === 0 ? [T - 10, 0, 10, T] : [0, 0, 10, T];
    R(px + n[0], py + n[1], n[2], n[3], INK);
    R(px + n[0] + 1, py + n[1] + 1, n[2] - 2, n[3] - 2, '#b8b6ae');
    return;
  }
  if (aloft) {
    // v0.41.0: a floor high up has glass walls — sky beyond the mullions
    R(px, py, T, T, '#3a3e48'); R(px + 2, py + 2, T - 4, T - 4, '#8fb8d0'); R(px + 4, py + 4, 4, T - 8, '#c8e4f0');
    return;
  }
  const W = (dx, dy) => at(x + dx, y + dy) === 'W';
  const below = at(x, y + 1);
  const faced = below !== 'W' && below !== 'D'; // floor or street below: we see its face
  const outside = y === map.height - 1 || !below; // the face looks onto the street
  const capH = faced ? 12 : T;
  // the cap: outlined on its open sides, a lit edge, a groove along it
  R(px, py, T, capH, s.cap);
  if (!W(0, -1)) { R(px, py, T, 1, INK); R(px, py + 1, T, 2, s.capLight); }
  if (!W(-1, 0)) { R(px, py, 1, capH, INK); R(px + 1, py, 2, capH, s.capLight); }
  if (!W(1, 0)) { R(px + T - 1, py, 1, capH, INK); R(px + T - 3, py, 2, capH, s.capDark); }
  const horiz = W(-1, 0) || W(1, 0);
  const vert = W(0, -1) || W(0, 1);
  if (horiz && !vert) R(px, py + Math.floor(capH / 2), T, 1, s.capDark);
  else if (vert && !horiz) R(px + 15, py, 2, capH, s.capDark);
  // pillars at corners and every few tiles of a long run
  const corner = horiz && vert;
  if (corner || (horiz && !vert && x % 5 === 0) || (vert && !horiz && y % 5 === 0 && !faced)) {
    R(px + 4, py + 1, T - 8, Math.min(capH, T) - 2, INK);
    R(px + 5, py + 2, T - 10, Math.min(capH, T) - 4, s.pillar);
    R(px + 5, py + 2, T - 10, 1, '#ffffff22');
  }
  // windows set in the side walls of the building
  const perimeter = x === 0 || x === map.width - 1;
  if (!faced && perimeter && vert && !corner && y % 3 === 1 && W(0, -1) && W(0, 1)) {
    R(px + 11, py + 4, 10, 24, INK); R(px + 12, py + 5, 8, 22, '#9fd4ea'); R(px + 13, py + 6, 2, 10, '#e4f6fc'); R(px + 12, py + 20, 8, 7, '#7ab4ce');
  }
  if (!faced) return;
  // the face
  const fy = py + capH;
  const fh = T - capH;
  R(px, fy, T, 1, INK);
  if (outside) facade(R, px, fy + 1, fh - 1, s, x, map);
  else {
    const look = s.inside;
    if (look === 'brick' || look === 'stone') bricks(R, px, fy + 1, fh - 1, look === 'stone' ? { face: s.paint, faceLight: '#dcd6ca', mortar: '#a8a296' } : s, x, y);
    else if (look === 'planks') { R(px, fy + 1, T, fh - 1, s.paint); for (let k = 4; k < T; k += 6) R(px + k, fy + 1, 1, fh - 1, s.mortar); }
    else if (look === 'stripes') { R(px, fy + 1, T, fh - 1, s.paint); for (let k = 0; k < T; k += 8) R(px + k, fy + 1, 3, fh - 7, '#e8c0cc'); R(px, fy + fh - 6, T, 1, '#8e3e58'); R(px, fy + fh - 5, T, 5, '#b46a84'); }
    else if (look === 'wainscot') { R(px, fy + 1, T, fh - 1, s.paint); R(px, fy + 9, T, 1, '#a89878'); R(px, fy + 10, T, fh - 10, '#d2c2a5'); if (x % 2 === 0) R(px, fy + 10, 1, fh - 10, '#a89878'); }
    else { R(px, fy + 1, T, fh - 1, s.paint); R(px, fy + fh - 3, T, 3, shadeHex(s.paint, 0.8)); }
  }
  R(px, py + T - 1, T, 1, 'rgba(0,0,0,0.35)');
}

/** The front of a building as the street sees it: brick (or planks, or render), a window every third tile. */
function facade(R, px, fy, fh, s, x, map) {
  if (s === WALLS.wood) { R(px, fy, T, fh, s.face); for (let k = 0; k < fh; k += 4) R(px, fy + k, T, 1, s.mortar); }
  else if (s === WALLS.teal || s === WALLS.navy) { R(px, fy, T, fh, s.face); R(px, fy, T, 2, s.capLight); R(px, fy + fh - 3, T, 3, s.mortar); }
  else bricks(R, px, fy, fh, s, x, 0);
  const W = map.width;
  if (x > 0 && x < W - 1 && x % 3 === 1 && map.tileAt(x - 1, map.height - 1) !== 'D' && map.tileAt(x + 1, map.height - 1) !== 'D') {
    R(px + 8, fy + 3, 16, fh - 6, INK);
    R(px + 9, fy + 4, 14, fh - 8, '#9fd4ea');
    for (let k = 0; k < 6; k++) R(px + 10 + k, fy + fh - 6 - k, 1, 1, '#e8f8ff');
    R(px + 9, fy + 4, 14, 1, '#d8f0fa');
    R(px + 8, fy + fh - 3, 16, 2, s.capLight); // the sill
  }
}

function bricks(R, px, fy, fh, s, x, y) {
  R(px, fy, T, fh, s.face);
  for (let k = 0; k < fh; k += 4) {
    R(px, fy + k, T, 1, s.mortar);
    const off = ((k >> 2) + y) & 1 ? 4 : 0;
    for (let b = off; b < T; b += 8) {
      R(px + b, fy + k, 1, Math.min(4, fh - k), s.mortar);
      if (hash2(x * 4 + b, k + y * 9) > 0.7) R(px + b + 1, fy + k + 1, 7, Math.min(3, fh - k - 1), s.faceLight);
    }
  }
}

const shadeHex = (hex, k) => {
  const [r, g, b] = rgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
};

// ------------------------------------------------------------------ building it
function paint(ctx, map, tx0, ty0, tw, th, extra) {
  ctx.imageSmoothingEnabled = false;
  const done = paintPixels(ctx, map, tx0, ty0, tw, th);
  ctx.save();
  ctx.translate(-tx0 * T, -ty0 * T);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  paintDetail(R, map, tx0, ty0, tw, th, done);
  if (extra) extra(ctx);
  ctx.restore();
}

/** One chunk (CHUNK×CHUNK tiles) of a map's ground. `extra(ctx)` draws anything else (in world coordinates). */
export function buildGroundChunk(map, cx, cy, makeCanvas, extra) {
  const tx0 = cx * CHUNK;
  const ty0 = cy * CHUNK;
  const tw = Math.min(CHUNK, map.width - tx0);
  const th = Math.min(CHUNK, map.height - ty0);
  const cv = makeCanvas(tw * T, th * T);
  paint(cv.getContext('2d'), map, tx0, ty0, tw, th, extra);
  return cv;
}

/** A whole map's ground in one canvas (world resolution). */
export function buildPixelGround(map, makeCanvas, extra) {
  const cv = makeCanvas(map.width * T, map.height * T);
  paint(cv.getContext('2d'), map, 0, 0, map.width, map.height, extra);
  return cv;
}

/** A small picture of a whole map (8 px a tile), for the city far below a tower floor. */
export function buildGroundOverview(map, makeCanvas) {
  const k = 8;
  const cv = makeCanvas(map.width * k, map.height * k);
  const ctx = cv.getContext('2d');
  const MID = { '.': '#43883a', ',': '#8e8c94', '=': '#3a3c41', ':': '#c4874f', '~': '#2a6a8a', s: '#e7cf9c', m: '#d1c9b6', g: '#909296', B: '#6e3f4a', u: '#64574a', k: '#7a5836', R: '#405f33' };
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const ch = map.tileAt(x, y);
    ctx.fillStyle = MID[ch] || (TILE_TYPES[ch] || TILE_TYPES.x).color;
    ctx.fillRect(x * k, y * k, k, k);
  }
  return cv;
}

/** One 32×32 tile of an indoor floor (wood, tile, carpet or concrete) at world (px, py). Used by the roofless buildings. */
export function paintFloor(R, ch, px, py, x, y) {
  const f = ch === 't' ? FLOORS.t[0] : ch === 'c' ? FLOORS.c[0] : ch === 'g' ? ['#9a9ca0', '#929498', '#7e8084'] : FLOORS.f[0];
  if (ch === 't') { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { R(px + i * 16, py + j * 16, 16, 16, (i + j + x + y) % 2 ? f[0] : f[1]); R(px + i * 16, py + j * 16, 16, 1, f[2]); R(px + i * 16, py + j * 16, 1, 16, f[2]); } return; }
  if (ch === 'c') { R(px, py, T, T, f[0]); for (let k = 0; k < T; k += 2) for (let j = k % 4 ? 0 : 2; j < T; j += 4) R(px + j, py + k, 1, 1, f[1]); return; }
  if (ch === 'g') { R(px, py, T, T, (x + y) % 2 ? f[0] : f[1]); R(px, py, T, 1, f[2]); R(px, py, 1, T, f[2]); return; }
  R(px, py, T, T, f[0]);
  for (let k = 0; k < T; k += 8) {
    const r = hash2(x * 3 + 1, y * 4 + k);
    if (r > 0.66) R(px, py + k, T, 8, f[1]);
    R(px, py + k + 7, T, 1, f[2]);
    if (hash2(x * 7 + k, y * 5) > 0.75) R(px + 8 + Math.floor(r * 16), py + k, 1, 7, f[2]);
  }
}
