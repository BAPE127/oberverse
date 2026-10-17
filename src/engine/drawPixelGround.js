// Pixel-art ground (v0.39.0, art revamp stage 2). The ground of a map is drawn once, at art
// resolution — 16 art pixels a tile (one art pixel = 2 world pixels) — on a whole-pixel grid, and
// copied 1:1 into the renderer's low-resolution canvas, so it is perfectly crisp.
//
// Grass with blades and flowers; grey slab pavements with seams and kerbs (a light lip and a dark
// face) where they meet the road; asphalt with grit, oil and cracks, a yellow dashed centre line
// down the true middle of every road (measured, so 4-lane roads are right) and nothing in the
// junction boxes; plaza slabs, concrete, dirt, sand, mud, fields; planked piers and bridges; water
// with a stone lip; wood, tile and carpet floors; interior walls (a light top, a tall face).
import { TILE_TYPES } from '../world/tiles.js';
import { hash2 } from '../core/rng.js';

const A = 16; // art pixels per tile
const INK = '#1b1a24';

const PAL = {
  grass: ['#4f7a3e', '#4d783c', '#5a8a46', '#6aa04f'],
  walk: ['#8d8b95', '#86848e', '#74727c'],
  curbTop: '#cfc8c0', curbFace: '#5e5a66',
  road: ['#3e3c48', '#43414d', '#36343f'],
  line: '#e8b83a',
  plaza: ['#d8d2c4', '#cfc8b8', '#bdb6a6'],
  concrete: ['#9a9ca0', '#929498', '#7e8084'],
  dirt: ['#b8956a', '#a8865e', '#c8a678'],
  sand: ['#e2cc98', '#d8c08a', '#ecdaa8'],
  mud: ['#6e604e', '#645646', '#7e705c'],
  field: ['#8a6a44', '#7a5c3a', '#9a7a50'],
  water: ['#3a7ea0', '#357594'],
  stone: '#8b8b86',
  plank: ['#9a6b45', '#8a5e3c', '#6a4428'],
  pier: ['#a27650', '#946a46', '#6e4a2c'],
  wood: ['#b0805a', '#a47652', '#7c5436'],
  tile: ['#dcd6cc', '#ccc6bc', '#b8b2a8'],
  carpet: ['#8e5a6e', '#7e4e60'],
  rock: ['#8d8f94', '#a5a7ab', '#6e7076'],
  ridge: ['#5f6d40', '#6f7d4f', '#8d8f84'],
  wallTop: '#5b4a45', wallFace: '#e9dcc3', wallWains: '#d2c2a5', wallLine: '#a89878',
};

/** Build the ground canvas for a map at art resolution. `extra(ctx)` draws anything else into it (at world scale ½). */
export function buildPixelGround(map, makeCanvas, extra) {
  // v0.46.0: built at world resolution — two canvas pixels to each art unit — so details can be
  // drawn in fine single pixels (half units: grass blades, grit, grout, seams, highlights)
  const cv = makeCanvas(map.width * A * 2, map.height * A * 2);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const at = (x, y) => map.tileAt(x, y);
  const roadRun = roadRuns(map);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) tile(R, map, x, y, at, roadRun);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) edges(R, map, x, y, at);
  if (map.kind === 'interior') interiorWalls(R, map, at);
  if (extra) { ctx.save(); ctx.scale(0.5, 0.5); extra(ctx); ctx.restore(); }
  return cv;
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

function speckle(R, px, py, x, y, cols, n, seed = 1) {
  for (let i = 0; i < n; i++) {
    const a = hash2(x * 31 + i * 7 + seed, y * 17 + i * 3);
    const b = hash2(y * 13 + i * 5 + seed, x * 29 + i);
    R(px + Math.floor(a * A * 2) / 2, py + Math.floor(b * A * 2) / 2, 0.5, 0.5, cols[i % cols.length]);
    R(px + Math.floor(b * A * 2) / 2, py + Math.floor(a * A * 2) / 2, 0.5, 0.5, cols[(i + 1) % cols.length]);
  }
}

function tile(R, map, x, y, at, run) {
  const ch = at(x, y);
  const px = x * A;
  const py = y * A;
  const r = hash2(x, y);
  switch (ch) {
    case '.': {
      R(px, py, A, A, r < 0.5 ? PAL.grass[0] : PAL.grass[1]);
      for (let i = 0; i < 12; i++) {
        const gx = px + Math.floor(hash2(x * 7 + i, y * 3) * 31) / 2;
        const gy = py + Math.floor(hash2(x * 5, y * 11 + i) * 28) / 2;
        R(gx, gy, 0.5, 1.5, i % 3 ? PAL.grass[2] : '#3f6a33');
        if (i % 4 === 0) R(gx, gy, 0.5, 0.5, PAL.grass[3]);
      }
      if (r > 0.9) { const c = ['#f6e27a', '#f2a7c3', '#ffffff'][Math.floor(r * 100) % 3]; R(px + 5 + Math.floor(r * 6), py + 6, 2, 2, c); R(px + 5 + Math.floor(r * 6), py + 8, 1, 1, PAL.grass[3]); }
      break;
    }
    case ',': case 'B': case 'D': {
      if ((ch === 'B' || ch === 'D') && map.kind === 'interior') { floorWood(R, px, py, x, y); break; }
      // grey slabs, 8×8, with seams; one in three a shade darker; the odd gum spot
      R(px, py, A, A, PAL.walk[0]);
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        if (hash2(x * 2 + sx, y * 2 + sy) > 0.66) R(px + sx * 8 + 1, py + sy * 8 + 1, 7, 7, PAL.walk[1]);
        R(px + sx * 8, py + sy * 8, 8, 0.5, PAL.walk[2]);
        R(px + sx * 8, py + sy * 8, 0.5, 8, PAL.walk[2]);
        R(px + sx * 8 + 0.5, py + sy * 8 + 0.5, 7.5, 0.5, '#9c9aa4');
        R(px + sx * 8 + 0.5, py + sy * 8 + 0.5, 0.5, 7.5, '#9c9aa4');
      }
      if (r > 0.92) R(px + 4 + Math.floor(r * 7), py + 11, 2, 1, '#6c6a74');
      break;
    }
    case '=': {
      R(px, py, A, A, PAL.road[0]);
      speckle(R, px, py, x, y, [PAL.road[1], PAL.road[2]], 10);
      if (r > 0.85) { const cy = py + 6 + Math.floor(r * 6); R(px + 3, cy, 3, 0.5, PAL.road[2]); R(px + 5.5, cy + 0.5, 3, 0.5, PAL.road[2]); R(px + 8, cy + 1, 2, 0.5, PAL.road[2]); } // a crack
      if (r < 0.04) { R(px + 6, py + 7, 4, 2, '#302e38'); R(px + 7, py + 6, 2, 1, '#302e38'); } // oil
      // the centre line: down the middle of a road, never inside a junction
      const i = y * run.W + x;
      const across = run.v[i];
      const along = run.h[i];
      if (along > across && across <= 8 && across >= 2) {
        // an east–west road: the centre is `across / 2` tiles below its top edge
        const cy = run.top[i] * A + (across * A) / 2;
        if (cy >= py && cy < py + A) for (let k = 0; k < A; k++) if (((px + k) % 14) < 7) R(px + k, Math.round(cy) - 1, 1, 2, PAL.line);
      } else if (across > along && along <= 8 && along >= 2) {
        const cx = run.left[i] * A + (along * A) / 2;
        if (cx >= px && cx < px + A) for (let k = 0; k < A; k++) if (((py + k) % 14) < 7) R(Math.round(cx) - 1, py + k, 2, 1, PAL.line);
      }
      break;
    }
    case ':': R(px, py, A, A, PAL.dirt[0]); speckle(R, px, py, x, y, [PAL.dirt[1], PAL.dirt[2]], 8); break;
    case 's': R(px, py, A, A, PAL.sand[0]); speckle(R, px, py, x, y, [PAL.sand[1], PAL.sand[2]], 9); break;
    case 'u': {
      R(px, py, A, A, PAL.mud[0]);
      speckle(R, px, py, x, y, [PAL.mud[1], PAL.mud[2]], 9);
      if (r > 0.9) { R(px + 3, py + 6, 9, 3, '#4e5a66'); R(px + 4, py + 5, 7, 1, '#4e5a66'); R(px + 5, py + 6, 3, 1, '#6e7a86'); } // a puddle
      if (r < 0.06) R(px + 6, py + 7, 3, 2, '#d8d0c0'); // litter
      break;
    }
    case 'k': {
      R(px, py, A, A, PAL.field[0]);
      for (let k = 0; k < A; k += 4) { R(px, py + k, A, 1, PAL.field[1]); R(px, py + k + 2, A, 1, PAL.field[2]); }
      break;
    }
    case 'g': {
      R(px, py, A, A, r < 0.5 ? PAL.concrete[0] : PAL.concrete[1]);
      R(px, py, A, 0.5, PAL.concrete[2]); R(px, py, 0.5, A, PAL.concrete[2]);
      if (r > 0.8) { R(px + 4, py + 5, 5, 3, 'rgba(40,40,50,0.18)'); }
      speckle(R, px, py, x, y, [PAL.concrete[1]], 4, 3);
      break;
    }
    case 'm': {
      R(px, py, A, A, r < 0.5 ? PAL.plaza[0] : PAL.plaza[1]);
      if (x % 2 === 0) R(px, py, 0.5, A, PAL.plaza[2]);
      if (y % 2 === 0) R(px, py, A, 0.5, PAL.plaza[2]);
      if (r > 0.6) R(px + 3, py + 7, 6, 1, PAL.plaza[1]);
      break;
    }
    case '~': {
      R(px, py, A, A, r < 0.5 ? PAL.water[0] : PAL.water[1]);
      if (r > 0.6) R(px + 3 + Math.floor(r * 6), py + 5 + Math.floor(r * 5), 4, 1, '#5aa0c0');
      break;
    }
    case 'b': case 'p': {
      const pal = ch === 'b' ? PAL.plank : PAL.pier;
      R(px, py, A, A, pal[0]);
      const across = ch === 'b' && at(x, y - 1) !== '~' && at(x, y + 1) !== '~';
      for (let k = 0; k < A; k += 4) {
        if (across) R(px, py + k, A, 1, pal[2]); else R(px + k, py, 1, A, pal[2]);
        if (hash2(x + k, y) > 0.6) { if (across) R(px, py + k + 1, A, 1, pal[1]); else R(px + k + 1, py, 1, A, pal[1]); }
      }
      R(px + 2, py + 2, 1, 1, pal[2]); R(px + 13, py + 12, 1, 1, pal[2]); // nails
      break;
    }
    case 'r': {
      R(px, py, A, A, PAL.water[0]);
      R(px + 2, py + 3, 12, 11, INK); R(px + 3, py + 4, 10, 9, PAL.rock[0]); R(px + 4, py + 5, 5, 3, PAL.rock[1]); R(px + 9, py + 10, 3, 2, PAL.rock[2]);
      break;
    }
    case 'R': {
      R(px, py, A, A, PAL.ridge[0]);
      R(px, py + A - 3, A, 3, '#4e5a34');
      for (let i = 0; i < 3; i++) {
        const sx = px + 1 + Math.floor(hash2(x * 3 + i, y) * 10);
        const sy = py + 1 + Math.floor(hash2(x, y * 5 + i) * 10);
        R(sx, sy, 5, 4, INK); R(sx + 1, sy + 1, 3, 2, PAL.ridge[2]); R(sx + 1, sy + 1, 2, 1, '#a9aa9e');
      }
      speckle(R, px, py, x, y, [PAL.ridge[1]], 5, 7);
      break;
    }
    case 'f': floorWood(R, px, py, x, y); break;
    case 't': {
      R(px, py, A, A, (x + y) % 2 ? PAL.tile[0] : PAL.tile[1]);
      R(px, py, A, 0.5, PAL.tile[2]); R(px, py, 0.5, A, PAL.tile[2]); R(px + 0.5, py + 0.5, A - 0.5, 0.5, '#ece6dc');
      break;
    }
    case 'c': {
      R(px, py, A, A, PAL.carpet[0]);
      for (let k = 0; k < A; k += 1) for (let j = (k % 2) / 2; j < A; j += 2) R(px + j, py + k, 0.5, 0.5, PAL.carpet[1]);
      break;
    }
    case 'W': if (!(map.def?.aloft && map.def.roof)) R(px, py, A, A, PAL.wallTop); break; // a roof's edge is open to the drop
    default: {
      const tt = TILE_TYPES[ch] || TILE_TYPES.x;
      R(px, py, A, A, r < 0.5 ? tt.color : tt.alt || tt.color);
    }
  }
}

/** One 16×16 tile of an indoor floor (wood, tile, carpet or concrete) at art (px, py). Used by the roofless buildings too. */
export function paintFloor(R, ch, px, py, x, y) {
  if (ch === 't') { R(px, py, A, A, (x + y) % 2 ? PAL.tile[0] : PAL.tile[1]); R(px, py, A, 0.5, PAL.tile[2]); R(px, py, 0.5, A, PAL.tile[2]); R(px + 0.5, py + 0.5, A - 0.5, 0.5, '#ece6dc'); return; }
  if (ch === 'c') { R(px, py, A, A, PAL.carpet[0]); for (let k = 0; k < A; k += 1) for (let j = (k % 2) / 2; j < A; j += 2) R(px + j, py + k, 0.5, 0.5, PAL.carpet[1]); return; }
  if (ch === 'g') { R(px, py, A, A, (x + y) % 2 ? PAL.concrete[0] : PAL.concrete[1]); R(px, py, A, 0.5, PAL.concrete[2]); R(px, py, 0.5, A, PAL.concrete[2]); return; }
  floorWood(R, px, py, x, y);
}

function floorWood(R, px, py, x, y) {
  // long planks, four to a tile, each a slightly different shade; an end joint now and then
  R(px, py, A, A, PAL.wood[0]);
  for (let k = 0; k < A; k += 4) {
    const r = hash2(x * 3 + 1, y * 4 + k);
    if (r > 0.66) R(px, py + k, A, 4, PAL.wood[1]);
    else if (r < 0.2) R(px, py + k, A, 4, '#b8885f');
    R(px, py + k + 3.5, A, 0.5, '#8e6040');
    R(px, py + k, A, 0.5, '#c4946a');
    if (hash2(x * 7 + k, y * 5) > 0.75) R(px + 4 + Math.floor(r * 8), py + k, 0.5, 3.5, '#8e6040');
  }
}

const SIDEWALK = new Set([',', 'm', 'g', 'B', 'D']);
function edges(R, map, x, y, at) {
  const ch = at(x, y);
  const px = x * A;
  const py = y * A;
  if (SIDEWALK.has(ch) && map.kind !== 'interior') {
    // kerbs: a light lip and a dark face, on the edge facing the road
    if (at(x, y + 1) === '=') { R(px, py + A - 3, A, 2, PAL.curbTop); R(px, py + A - 1, A, 1, PAL.curbFace); }
    if (at(x, y - 1) === '=') { R(px, py, A, 1, PAL.curbFace); R(px, py + 1, A, 2, PAL.curbTop); }
    if (at(x + 1, y) === '=') { R(px + A - 3, py, 2, A, PAL.curbTop); R(px + A - 1, py, 1, A, PAL.curbFace); }
    if (at(x - 1, y) === '=') { R(px, py, 1, A, PAL.curbFace); R(px + 1, py, 2, A, PAL.curbTop); }
  }
  if (ch === '.') {
    // a dark edge where the grass meets anything paved
    for (const [dx, dy, ex, ey, w, h] of [[0, 1, 0, A - 1, A, 1], [0, -1, 0, 0, A, 1], [1, 0, A - 1, 0, 1, A], [-1, 0, 0, 0, 1, A]]) {
      const n = at(x + dx, y + dy);
      if (n && n !== '.' && n !== 'k' && n !== 'R' && n !== '~') R(px + ex, py + ey, w, h, '#3e6430');
    }
  }
  if (ch === '~') {
    // a stone lip against the land
    const land = (n) => n && !['~', 'x', 'r', 'b', 'p'].includes(n);
    if (land(at(x, y - 1)) && y > 0) { R(px, py, A, 2, at(x, y - 1) === 's' ? '#f2ecd8' : PAL.stone); R(px, py + 2, A, 2, 'rgba(0,0,0,0.18)'); }
    if (land(at(x, y + 1)) && y < map.height - 1) R(px, py + A - 2, A, 2, PAL.stone);
    if (land(at(x - 1, y)) && x > 0) R(px, py, 2, A, PAL.stone);
    if (land(at(x + 1, y)) && x < map.width - 1) R(px + A - 2, py, 2, A, PAL.stone);
  }
}

function interiorWalls(R, map, at) {
  const aloft = map.def?.aloft;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const ch = at(x, y);
    const px = x * A;
    const py = y * A;
    if (ch === 'W' && aloft && map.def.roof) {
      // v0.41.0: a roof's parapet — a low concrete lip, the drop beyond it
      const n = y === 0 ? [0, A - 5, A, 5] : y === map.height - 1 ? [0, 0, A, 5] : x === 0 ? [A - 5, 0, 5, A] : [0, 0, 5, A];
      R(px + n[0], py + n[1], n[2], n[3], INK);
      R(px + n[0] + (n[2] > 5 ? 0 : 1), py + n[1] + (n[3] > 5 ? 0 : 1), n[2] - (n[2] > 5 ? 0 : 2), n[3] - (n[3] > 5 ? 0 : 2), '#b8b6ae');
      continue;
    }
    if (ch === 'W' && aloft) {
      // v0.41.0: a floor high up has glass walls — sky beyond the mullions
      if (y === 0) {
        R(px, py, A, 3, '#3a3e48'); R(px, py + 3, A, 1, INK);
        R(px, py + 4, A, 11, '#9cc8e0'); R(px + 2, py + 5, 3, 8, '#c8e4f0'); R(px + A - 1, py + 4, 1, 11, '#3a3e48');
        R(px, py + 15, A, 1, '#3a3e48');
      } else {
        R(px, py, A, A, '#3a3e48');
        R(px + 1, py + 1, A - 2, A - 2, '#8fb8d0');
        R(px + 2, py + 2, 2, A - 4, '#c8e4f0');
      }
      continue;
    }
    if (ch === 'W') {
      if (y === 0) {
        // the back wall: a dark top, then a tall face with a dado rail and wainscot
        R(px, py, A, 3, PAL.wallTop); R(px, py + 3, A, 1, INK);
        R(px, py + 4, A, 6, PAL.wallFace); R(px, py + 10, A, 1, PAL.wallLine); R(px, py + 11, A, 5, PAL.wallWains);
        if (x % 2 === 0) R(px, py + 11, 1, 5, PAL.wallLine);
      } else {
        // side and front walls: seen from above, a light top edge on a dark body
        R(px, py, A, A, PAL.wallTop);
        R(px + 1, py + 1, A - 2, 2, '#7a6660');
        if (at(x, y + 1) !== 'W' && y < map.height - 1) { R(px, py + A - 4, A, 4, PAL.wallFace); R(px, py + A - 1, A, 1, INK); }
      }
    } else if (ch === 'D') {
      R(px + 2, py, A - 4, A, '#3d2f28'); R(px + 3, py + 3, A - 6, A - 5, '#8f5e3d'); R(px + 3, py + 3, A - 6, 1, '#b07a4e'); R(px + A - 5, py + 9, 1, 1, '#f2d060');
    } else if (y === 1 && at(x, 0) === 'W') {
      R(px, py, A, 3, 'rgba(0,0,0,0.14)'); // the back wall's shadow
    }
  }
}
