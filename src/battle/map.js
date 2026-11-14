// Battle maps (v0.101.0, remade in v0.102.0 on the mock-up's look): a grid made from a seed, never from chance. Two recipes: CITY (avenues and streets with pavements, blocks of shops and flats,
// a plaza with a fountain, lamps, crossings and parked cars) and FIELDS (a patchwork of fields with bush hedgerows, dirt tracks, a river with a bridge, two villages round their greens).
// A building has a wall all round, windows, one door and a stair; its floors are all the same plan (the stair is how you change floor). Every building is reachable on foot from where the player
// starts; a test checks it. The map is a ground-glyph grid (`surf`, the characters the game's own ground painter reads) plus props and cars; the sim's tiles are derived from them.
// A map's `ver` is 2 from v0.102.0: a battle saved by v0.101.0 has no `ver` in its setup and is replayed on the first generation of maps, kept here (cityV1, fieldsV1).
//   generate({ recipe, biome, style, seed, ver })   → the map
//   walkable(map, x, y)                        whether a person can stand on the tile
//   blocksSight(map, x, y, z)                  whether the tile stops a look from floor z
import { TILE, RECIPES, RECIPES_V1, ENTRIES, STYLES, ART_STYLE, ART_BIOME, minTiles, MAP_VER } from '../content/battle.js';
import { unit, pick, between } from './hash.js';
import { clearance } from './nav.js';

const W = TILE.WALL;
export const idx = (m, x, y) => y * m.w + x;
export const inb = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export const tileAt = (m, x, y) => (inb(m, x, y) ? m.tiles[idx(m, x, y)] : TILE.WALL);
export const walkable = (m, x, y) => { const t = tileAt(m, Math.floor(x), Math.floor(y)); return t === TILE.GROUND || t === TILE.ROAD || t === TILE.HEDGE || t === TILE.CROP || t === TILE.FLOOR || t === TILE.DOOR || t === TILE.STAIRS || t === TILE.TRENCH || t === TILE.WIRE; };
/** A wall (or a tree) stops a look unless the viewer is above it: a building of f floors blocks a look from any floor below f. */
export function blocksSight(m, x, y, z) {
  const i = idx(m, x, y); const t = m.tiles[i];
  if (t === TILE.WALL) return m.bfloors[i] > z;
  if (t === TILE.TREE) return z === 0;
  return false;
}

function blank(recipe, biome, style, seed, ver = 1) {
  const { w, h } = (ver >= 2 ? RECIPES : RECIPES_V1)[recipe];
  return { ver, recipe, biome, style, seed, w, h, tiles: new Uint8Array(w * h), bfloors: new Uint8Array(w * h), bid: new Int16Array(w * h).fill(-1), buildings: [], objective: null, exit: null, spawns: { p: null, e: null } };
}
export const free = (m, x, y, w, h, pad = 1) => { for (let j = y - pad; j < y + h + pad; j++) for (let i = x - pad; i < x + w + pad; i++) { if (!inb(m, i, j)) return false; const t = m.tiles[idx(m, i, j)]; if (t !== TILE.GROUND || m.bid[idx(m, i, j)] >= 0) return false; } return true; };

/** A building: wall all round, windows every third tile, a door in the middle of the south wall, a stair inside, `floors` floors. */
function building(m, x, y, w, h, floors, extra = null, pad = 1) {
  if (!free(m, x, y, w, h, pad)) return null;
  const id = m.buildings.length;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const n = idx(m, i, j); m.bid[n] = id; m.bfloors[n] = floors;
    const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1;
    m.tiles[n] = edge ? W : TILE.FLOOR;
    if (edge && (i - x + j - y) % (m.ver >= 2 && w < 7 ? 2 : 3) === 1 && i !== x && i !== x + w - 1 && !(j === y + h - 1 && i === x + Math.floor(w / 2))) m.tiles[n] = TILE.WINDOW;
  }
  const door = { x: x + Math.floor(w / 2), y: y + h - 1 };
  m.tiles[idx(m, door.x, door.y)] = TILE.DOOR;
  const stairs = { x: x + 1, y: y + 1 };
  if (w >= 5 && h >= 4) m.tiles[idx(m, stairs.x, stairs.y)] = TILE.STAIRS;
  m.buildings.push({ id, x, y, w, h, floors, door, stairs, style: m.style, ...(extra || {}) });
  return id;
}
const road = (m, x0, y0, x1, y1) => { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (inb(m, i, j) && m.tiles[idx(m, i, j)] !== TILE.WALL && m.bid[idx(m, i, j)] < 0) m.tiles[idx(m, i, j)] = TILE.ROAD; };

function cityV1(m) {
  const u = (tag, i = 0) => unit(`${m.seed}|city|${tag}|${i}`);
  const S = STYLES[m.style] || STYLES.halvermouth;
  const xs = [Math.floor(m.w * 0.25), Math.floor(m.w * 0.5), Math.floor(m.w * 0.75)];
  const ys = [Math.floor(m.h * 0.34), Math.floor(m.h * 0.68)];
  for (const x of xs) road(m, x - 1, 0, x + 1, m.h - 1);
  for (const y of ys) road(m, 0, y - 1, m.w - 1, y + 1);
  road(m, xs[1] - 4, ys[0] + 2, xs[1] + 4, ys[1] - 2); // a plaza where the avenues meet the middle
  // blocks: pack buildings along each block's rows
  const bx = [0, ...xs.map((x) => x + 2)]; const bxe = [...xs.map((x) => x - 2), m.w - 1];
  const by = [0, ...ys.map((y) => y + 2)]; const bye = [...ys.map((y) => y - 2), m.h - 1];
  let n = 0;
  for (let a = 0; a < bx.length; a++) for (let b = 0; b < by.length; b++) {
    for (let row = by[b] + 1; row < bye[b] - 4; row += 8) {
      let x = bx[a] + 1;
      while (x < bxe[a] - 5) {
        const bw = between(6, 10, u('bw', n)); const bh = between(5, 7, u('bh', n)); const f = between(S.floors[0], Math.min(S.floors[1], 6), u('f', n)); n++;
        if (x + bw < bxe[a] && row + bh < bye[b] && building(m, x, row, bw, bh, f) !== null) x += bw + 2; else x += 3;
      }
    }
  }
  for (let i = 0; i < 40; i++) { const x = between(1, m.w - 2, u('tx', i)); const y = between(1, m.h - 2, u('ty', i)); if (m.tiles[idx(m, x, y)] === TILE.GROUND && m.bid[idx(m, x, y)] < 0) m.tiles[idx(m, x, y)] = TILE.TREE; }
  m.objective = { x: xs[1], y: Math.floor((ys[0] + ys[1]) / 2) };
  m.spawns = { p: { x: 4, y: ys[0] }, e: { x: m.w - 5, y: ys[1] } };
  m.exit = { x: m.w - 2, y: ys[0] };
}

function fieldsV1(m) {
  const u = (tag, i = 0) => unit(`${m.seed}|fields|${tag}|${i}`);
  const S = STYLES[m.style] || STYLES.sund;
  // fields: vertical strips of crop and bare ground, a hedgerow between each with a gap every few tiles
  let x = 2; let k = 0;
  while (x < m.w - 6) {
    const fw = between(8, 13, u('fw', k)); const crop = u('crop', k) < 0.55; k++;
    for (let j = 1; j < m.h - 1; j++) for (let i = x; i < Math.min(m.w - 1, x + fw); i++) if (crop && (i + j) % 7 !== 0) m.tiles[idx(m, i, j)] = TILE.CROP;
    for (let j = 1; j < m.h - 1; j++) if (j % 9 < 7) m.tiles[idx(m, Math.min(m.w - 2, x + fw), j)] = TILE.HEDGE;
    x += fw + 1;
  }
  // a river down the middle with a ford and a bridge, and a track across
  const rx = Math.floor(m.w * 0.5);
  for (let j = 0; j < m.h; j++) for (let i = rx - 1; i <= rx + 1; i++) m.tiles[idx(m, i, j)] = TILE.WATER;
  const ty = Math.floor(m.h / 2);
  road(m, 0, ty - 1, m.w - 1, ty);
  for (let i = rx - 1; i <= rx + 1; i++) for (const j of [ty - 1, ty, ty + 9, ty + 10]) m.tiles[idx(m, i, j)] = TILE.ROAD; // the ford, and a bridge below it
  road(m, rx - 3, ty + 9, rx + 3, ty + 10);
  // two villages round greens, and a tree line
  const clear = (cx, cy, r) => { for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) if (inb(m, i, j) && m.tiles[idx(m, i, j)] !== TILE.WATER) m.tiles[idx(m, i, j)] = TILE.GROUND; };
  const village = (cx, cy, tag) => {
    clear(cx, cy, 9);
    const spots = [[-8, -7], [3, -7], [-8, 2], [3, 3], [-2, -2]];
    spots.forEach(([dx, dy], i) => { const f = between(S.floors[0], Math.min(S.floors[1], 2), u(`vf${tag}`, i)); const bw = between(5, 7, u(`vw${tag}`, i)); const bh = between(5, 6, u(`vh${tag}`, i)); building(m, cx + dx, cy + dy, bw, bh, f); });
    road(m, cx - 9, cy - 1, cx + 9, cy + 1); road(m, cx - 1, cy - 9, cx + 1, cy + 9);
  };
  village(Math.floor(m.w * 0.24), Math.floor(m.h * 0.3), 'a'); village(Math.floor(m.w * 0.74), Math.floor(m.h * 0.68), 'b');
  for (let i = 0; i < 70; i++) { const tx = between(1, m.w - 2, u('tx', i)); const tyy = between(1, m.h - 2, u('ty', i)); if (m.tiles[idx(m, tx, tyy)] === TILE.GROUND && m.bid[idx(m, tx, tyy)] < 0 && (i % 3 === 0 || tx % 11 === 0)) m.tiles[idx(m, tx, tyy)] = TILE.TREE; }
  m.objective = { x: rx, y: ty };
  m.spawns = { p: { x: 3, y: ty }, e: { x: m.w - 4, y: ty } };
  m.exit = { x: m.w - 2, y: ty };
}

/** Whether every building's door can be reached on foot from the player's start. (Used by the generator, and by the tests.) */
export function reachable(m) {
  const seen = new Uint8Array(m.w * m.h); const q = [[m.spawns.p.x, m.spawns.p.y]]; seen[idx(m, m.spawns.p.x, m.spawns.p.y)] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx; const ny = y + dy; if (inb(m, nx, ny) && !seen[idx(m, nx, ny)] && walkable(m, nx, ny)) { seen[idx(m, nx, ny)] = 1; q.push([nx, ny]); } } }
  return { seen, ok: m.buildings.every((b) => seen[idx(m, b.door.x, b.door.y)]) && seen[idx(m, m.objective.x, m.objective.y)] === 1 && seen[idx(m, m.spawns.e.x, m.spawns.e.y)] === 1 };
}

/** A path of road from a to b, used if the generator left a building cut off (it rarely does). */
function carve(m, a, b) {
  let x = a.x; let y = a.y;
  const clear = (i) => { if (m.bid[i] < 0 && (m.tiles[i] === TILE.WALL || m.tiles[i] === TILE.WINDOW || m.tiles[i] === TILE.TREE || m.tiles[i] === TILE.WATER)) m.tiles[i] = TILE.ROAD; };
  clear(idx(m, x, y)); // (the start itself: a tree can stand in front of a door)
  while (x !== b.x || y !== b.y) { if (x !== b.x) x += Math.sign(b.x - x); else y += Math.sign(b.y - y); const i = idx(m, x, y); if (m.tiles[i] === TILE.WALL || m.tiles[i] === TILE.WINDOW || m.tiles[i] === TILE.TREE || m.tiles[i] === TILE.WATER) { if (m.bid[i] < 0) m.tiles[i] = TILE.ROAD; } }
}

// ------------------------------------------------------------------------------------------------- generation 2 (v0.102.0): the mock-up's maps
const BASE = { temperate: '.', snow: '.', desert: 's', steppe: '.', mud: '.' };
const TREES = { temperate: [['tree', '#4f7a4a'], ['pine', '#4f7a4a'], ['tree', '#5a8a4a'], ['tree', '#468a52']], snow: [['pine', '#2f5a46']], desert: [], steppe: [['tree', '#8a9a3a'], ['tree', '#9aa04a']], mud: [['tree', '#2f6a3a'], ['tree', '#3a7a3a'], ['pine', '#276028']] };
const GROUND = { halver: ',', ostmark: 'm', varn: ':', sund: '.', windfen: 'g' };
const WIDTHS = { halver: [5, 9], ostmark: [5, 8], varn: [5, 9], sund: [5, 7], windfen: [7, 11] };
const SHOPS = ['BAKERY', 'MARKET', 'CAFE', 'PHARMACY', 'BOOKS', 'TAILOR', 'DELI', 'HARDWARE'];
const AWNINGS = ['#c8402a', '#e8c04a', '#3a8a4a', '#3a6a8a'];
const CAR_KINDS = ['sedan', 'hatch', 'van', 'pickup', 'taxi', 'sedan', 'sedan', 'hatch', 'police', 'ambulance', 'jeep', 'truck', 'bus'];
const KIND_COLOUR = { police: '#1f2f56', ambulance: '#f4f2ee', jeep: '#566a3e', taxi: '#e8c02a', bus: '#4a8a6a', truck: '#3a5a8a' };
const CAR_COLOURS = ['#b8483a', '#3a5a8a', '#2a2a2e', '#4a7a4a', '#c8b848', '#e8e2d4', '#a8a8a8'];
const rngOf = (str) => { let s = Math.floor(unit(`${str}|rng`) * 4294967296) >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const ch = (c) => c.charCodeAt(0);
const sset = (m, x, y, c) => { if (inb(m, x, y)) m.surf[idx(m, x, y)] = ch(c); };
const rect = (m, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) sset(m, i, j, c); };
const sget = (m, x, y) => (inb(m, x, y) ? String.fromCharCode(m.surf[idx(m, x, y)]) : 'x');
const prop = (m, type, x, y, extra = {}) => { if (inb(m, x, y)) m.props.push({ type, x, y, ...extra }); };
/** A building plan: placed once the ground is laid (the sim's `building` puts walls, windows, door and stair on the tiles). */
const plan = (m, x, y, w, h, floors, extra = {}) => { m.plans.push({ x, y, w, h, floors, extra: { seed: Math.floor(unit(`${m.seed}|b|${x}|${y}`) * 1e6), ...extra } }); };
const car = (m, kind, color, dir, x, y) => m.cars.push({ kind, color, dir, x, y });

/** A row of buildings along a line (the mock-up's `row`): widths by style, floors by style but no taller than the depth allows. */
function row(m, R, x0, x1, yb, maxH, o = {}) {
  const S = STYLES[m.style] || STYLES.halvermouth; const [wa, wb] = WIDTHS[m.art.style]; let x = x0;
  while (x + wa <= x1) {
    let w = wa + Math.floor(R() * (wb - wa + 1)); if (x + w > x1) w = x1 - x; if (w < wa) break;
    let floors = S.floors[0] + Math.floor(R() * (Math.min(S.floors[1], 6) - S.floors[0] + 1)); let h = Math.max(4, minTiles(floors) + 1 + Math.floor(R() * 3));
    while (minTiles(floors) > maxH && floors > 1) floors--; if (h > maxH) h = maxH;
    const shop = o.shops && floors <= 3 && R() < 0.6;
    plan(m, x, yb - h, w, h, floors, { sign: shop ? SHOPS[Math.floor(R() * SHOPS.length)] : undefined, awning: shop && R() < 0.7 ? AWNINGS[Math.floor(R() * 4)] : undefined, shop });
    x += w + (m.art.style === 'sund' ? 2 : m.art.style === 'windfen' ? 3 : 0);
  }
}
const scatter = (m, R, count, test) => { const T = TREES[m.art.biome]; if (!T.length) return; for (let i = 0; i < count; i++) { const x = Math.floor(R() * m.w); const y = Math.floor(R() * m.h); if (!test(x, y)) continue; const [type, color] = T[Math.floor(R() * T.length)]; prop(m, type, x, y, { color }); } };

function cityV2(m) {
  const R = rngOf(`${m.seed}|city`); const { w: W, h: H } = m; const A = m.art; const base = BASE[A.biome];
  const AV = [4, 30]; const ST = [6, 28, 50, 72]; const BG = GROUND[A.style];
  rect(m, 0, 0, W, H, base); rect(m, 4, 0, 80, H, ',');
  for (const y of AV) rect(m, 0, y, W, 4, '='); for (const x of ST) rect(m, x, 0, 4, H, '=');
  if (A.style === 'varn') { for (const x of ST) rect(m, x, 0, 4, H, ':'); rect(m, 0, AV[1], W, 4, '='); rect(m, 0, AV[0], W, 4, ':'); }
  if (A.style === 'ostmark') { for (const y of AV) rect(m, 0, y, W, 4, 'm'); for (const x of ST) rect(m, x, 0, 4, H, 'm'); rect(m, 0, AV[1], W, 4, '='); }
  let plaza = null;
  for (let r = 0; r < AV.length; r++) for (let c = 0; c < ST.length - 1; c++) {
    const x0 = ST[c] + 5; const x1 = ST[c + 1] - 1; const y0 = AV[r] + 5; const y1 = (AV[r + 1] ?? H) - 1; const bh = y1 - y0; if (bh < 16) continue;
    rect(m, x0, y0, x1 - x0, bh, BG); const mid = y0 + Math.min(12, Math.floor(bh / 2));
    row(m, R, x0 + 1, x1 - 1, mid, 12);
    if (r === 0 && c === 1) { // the plaza: a stone square with a fountain, benches and trees, where the objective is
      rect(m, x0, mid, x1 - x0, y1 - mid, 'm'); const cx = Math.floor((x0 + x1) / 2); const cy = mid + 4;
      prop(m, 'fountain', cx - 1, cy - 1); prop(m, 'bench', cx - 5, cy + 3); prop(m, 'bench', cx + 4, cy + 3); prop(m, 'bench', cx - 5, cy - 3); prop(m, 'bench', cx + 4, cy - 3);
      for (let i = 0; i < 5; i++) { prop(m, 'tree', x0 + 1 + i * 4, y1 - 2, { color: TREES[A.biome][0]?.[1] || '#4f7a4a' }); } prop(m, 'flowerbed', cx - 2, cy + 6, { w: 4 });
      plaza = { x: cx, y: cy + 3 };
    } else {
      row(m, R, x0 + 1, x1 - 1, y1 - 1, bh - (mid - y0) - 3, { shops: true });
      for (let i = 0; i < 3; i++) { const px = x0 + 3 + Math.floor(R() * (x1 - x0 - 8)); prop(m, A.style === 'varn' ? 'booth' : R() < 0.4 ? 'bench' : 'tree', px, mid + 1, { color: TREES[A.biome][0]?.[1] || '#4f7a4a' }); }
      if (A.style === 'windfen') { rect(m, x0 + 2, mid, x1 - x0 - 4, 2, '.'); for (let i = 0; i < 4; i++) prop(m, 'tree', x0 + 3 + i * 4, mid, { color: '#4f7a4a' }); }
      if (A.style === 'ostmark' && R() < 0.6) prop(m, 'fountain', Math.floor((x0 + x1) / 2), mid + 1);
    }
  }
  // street furniture and traffic
  for (const y of AV) for (let x = 6; x < W - 4; x += 8) {
    if (A.style !== 'varn') prop(m, 'streetlamp', x, y - 1); if (x % 16 === 6) prop(m, 'streetlamp', x + 4, y + 4);
    const kind = CAR_KINDS[Math.floor(R() * CAR_KINDS.length)]; car(m, kind, KIND_COLOUR[kind] || CAR_COLOURS[Math.floor(R() * CAR_COLOURS.length)], R() < 0.5 ? 'E' : 'W', x * 32 + 20, (y + (R() < 0.5 ? 0.9 : 2.9)) * 32);
  }
  for (const x of ST) for (let y = 12; y < H - 6; y += 12) if (R() < 0.6) car(m, 'sedan', CAR_COLOURS[Math.floor(R() * 3)], R() < 0.5 ? 'N' : 'S', (x + (R() < 0.5 ? 0.9 : 2.9)) * 32, y * 32);
  for (const y of AV) for (const x of ST) { prop(m, 'crosswalk', x, y - 2, { w: 4, h: 1 }); prop(m, 'crosswalk', x, y + 5, { w: 4, h: 1 }); }
  for (let i = 0; i < 16; i++) { const x = 1 + Math.floor(R() * (W - 2)); const y = 1 + Math.floor(R() * (H - 2)); if ((x < 4 || x > 82) && sget(m, x, y) === base) { const T = TREES[A.biome]; if (T.length) { const [type, color] = T[Math.floor(R() * T.length)]; prop(m, type, x, y, { color }); } } }
  m.objective = plaza || { x: ST[1] + 6, y: AV[0] + 12 };
  m.spawns = { p: { x: 3, y: AV[0] + 2 }, e: { x: W - 4, y: AV[1] + 2 } }; m.exit = { x: W - 2, y: AV[0] + 2 };
}

function fieldsV2(m) {
  const R = rngOf(`${m.seed}|fields`); const { w: W, h: H } = m; const A = m.art; const base = BASE[A.biome]; const B = TREES[A.biome]; const tc = B[0]?.[1] || '#4f7a4a';
  rect(m, 0, 0, W, H, base);
  const rx = Math.floor(W / 2) - 1; const ty = 38; const blocks = [];
  const track = (x, y, w, h) => { rect(m, x, y, w, h, ':'); blocks.push({ x, y, w, h }); };
  // tracks first, so the fields sit between them: the main track through both villages, a north and a south track, and three that run down the map
  track(0, ty, W, 3); track(0, 60, W, 2); track(0, 2, W, 2); for (const x of [3, W - 5]) track(x, 0, 2, H);
  // the river runs down the middle; a bridge on the main track and another on the south track
  for (let j = 0; j < H; j++) { const off = Math.round(1.6 * Math.sin(j / 7)); rect(m, rx + off, j, 3, 1, '~'); } blocks.push({ x: rx - 2, y: 0, w: 8, h: H });
  rect(m, rx - 2, ty, 7, 3, 'b'); rect(m, rx - 2, 60, 7, 2, 'b');
  // the villages: a green with a fountain, trees and benches, a ring of houses and a church on the north side
  const village = (vx, vy, tag) => {
    blocks.push({ x: vx - 3, y: vy - 12, w: 30, h: 32 });
    rect(m, vx - 3, vy - 4, 29, 24, ':'); rect(m, vx, vy, 22, 10, '.');
    const floors = (k) => Math.min(1 + (k % 2), STYLES[m.style].floors[1]);
    [[-1, 7], [16, 7]].forEach(([dx, w], k) => plan(m, vx + dx, vy - 10, w, 6, floors(k + 1), { shop: false }));
    plan(m, vx + 7, vy - 11, 8, 7, 2, { name: 'Church', roofKind: A.style === 'varn' || A.style === 'halver' ? 'dome' : 'gable', wall: '#efe8d8' });
    [[-1, 8], [8, 7], [16, 7]].forEach(([dx, w], k) => plan(m, vx + dx, vy + 13, w, 6, floors(k), { shop: false }));
    prop(m, 'fountain', vx + 10, vy + 4); for (let i = 0; i < 6; i++) prop(m, 'tree', vx + 2 + i * 3, vy + 8, { color: tc }); prop(m, 'bench', vx + 5, vy + 5); prop(m, 'bench', vx + 15, vy + 5); for (const [dx, dy] of [[2, 2], [4, 2], [18, 3], [20, 2]]) prop(m, 'pine', vx + dx, vy + dy, { color: '#3a6a46' });
    if (tag === 'b') prop(m, 'watertower', vx + 23, vy + 3, { w: 4, h: 5 }); else { prop(m, 'haybale', vx - 2, vy + 20); prop(m, 'tractor', vx + 17, vy + 21, { w: 3, h: 2 }); }
  };
  village(26, 28, 'a'); village(72, 28, 'b');
  // fields between: patches of crop with a bush hedgerow round each
  const crops = A.biome === 'desert' ? ['fallow', 'sorghum'] : ['wheat', 'corn', 'cotton', 'sorghum', 'fallow'];
  const hit = (x, y, w, h, o) => x < o.x + o.w + 1 && x + w > o.x - 1 && y < o.y + o.h + 1 && y + h > o.y - 1;
  for (let tries = 0; tries < 400 && m.fields.length < 18; tries++) {
    const w = 10 + Math.floor(R() * 8); const h = 6 + Math.floor(R() * 7); const x = 2 + Math.floor(R() * (W - w - 4)); const y = 5 + Math.floor(R() * (H - h - 6));
    if (blocks.some((o) => hit(x, y, w, h, o)) || m.fields.some((f) => hit(x, y, w, h, f))) continue;
    m.fields.push({ x, y, w, h, crop: crops[Math.floor(R() * crops.length)] }); rect(m, x, y, w, h, 'k');
    for (let i = x; i < x + w; i += 2) { prop(m, 'bush', i, y - 1); prop(m, 'bush', i, y + h); } for (let j = y; j < y + h; j += 2) { prop(m, 'bush', x - 1, j); prop(m, 'bush', x + w, j); }
  }
  scatter(m, R, 120, (x, y) => sget(m, x, y) === base && !m.fields.some((f) => hit(x, y, 1, 1, f)) && !blocks.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h));
  for (const [kind, color, dir, x, y] of [['pickup', '#4a6a4a', 'E', 22, ty + 1.2], ['truck', '#3a5a8a', 'W', 74, ty + 1.8], ['sedan', '#b8483a', 'E', 30, 60.7]]) car(m, kind, color, dir, x * 32, y * 32);
  prop(m, 'windmill', 24, 50, { w: 4, h: 5 });
  m.objective = { x: rx + 1, y: ty + 1 }; m.spawns = { p: { x: 3, y: ty + 1 }, e: { x: W - 4, y: ty + 1 } }; m.exit = { x: W - 2, y: ty + 1 };
}


// ------------------------------------------------------------------------------------------------- the other recipes (v0.102.1): the trench line, the compound and the forest, from the mock-up's generator
// New functions: the city and the fields above are never touched (a saved map must stay what it was; see tests/battle_frozen.test.mjs).
const ih = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y, sd) => { const xi = Math.floor(x); const yi = Math.floor(y); const xf = x - xi; const yf = y - yi; const sm = (t) => t * t * (3 - 2 * t); const a = ih(xi, yi, sd); const b = ih(xi + 1, yi, sd); const c = ih(xi, yi + 1, sd); const d = ih(xi + 1, yi + 1, sd); const u = sm(xf); const v = sm(yf); return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v; };
const fbm = (x, y, sd) => 0.55 * vnoise(x, y, sd) + 0.3 * vnoise(x * 2.1, y * 2.1, sd + 5) + 0.15 * vnoise(x * 4.3, y * 4.3, sd + 9);
const seedOf = (m) => Math.floor(unit(`${m.seed}|n`) * 1e6);

function trenchV2(m) {
  const R = rngOf(`${m.seed}|trench`); const { w: W, h: H } = m; const A = m.art; const base = BASE[A.biome]; const sd = seedOf(m);
  rect(m, 0, 0, W, H, base); if (A.biome === 'mud') rect(m, 0, 0, W, H, 'u');
  const cells = new Set(); const gap = (y) => (y >= 18 && y <= 21) || (y >= 52 && y <= 55); // crossings, so a tank can get over a line
  const add = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H && !(gap(y) && (x === 36 || x === 37 || x === 82 || x === 83 || x === 33 || x === 39 || x === 81 || x === 85 || x === 14 || x === 106))) cells.add(`${x},${y}`); };
  for (const [X, dir] of [[36, 1], [84, -1]]) { let x = X; for (let y = 6; y < H - 6; y++) { add(x, y); add(x + dir, y); if ((y - 6) % 8 === 7) { const jog = (Math.floor((y - 6) / 8) % 2) ? -3 : 3; for (let k = 0; k <= 3; k++) add(x + (jog > 0 ? k : -k) * dir, y); x += jog * dir; } } } // front lines with bays
  for (const X of [14, 106]) for (let y = 6; y < H - 6; y++) add(X, y); // support lines
  for (const y of [14, 30, 44, 60]) { for (let x = 14; x <= 36; x++) add(x, y); for (let x = 84; x <= 106; x++) add(x, y); } // communication trenches
  for (const y of [22, 38, 52]) { for (let x = 36; x <= 44; x++) add(x, y); for (let x = 76; x <= 84; x++) add(x, y); } // saps into no man's land
  for (const k of cells) { const [cx, cy] = k.split(',').map(Number); for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) { const x = cx + dx; const y = cy + dy; if (inb(m, x, y) && sget(m, x, y) === base && ih(x, y, sd) < 0.9 - (Math.abs(dx) + Math.abs(dy)) * 0.12) sset(m, x, y, A.biome === 'snow' ? 'u' : ':'); } }
  for (let y = 0; y < H; y++) for (let x = 36; x < 86; x++) if (sget(m, x, y) === base && fbm(x / 6, y / 6, sd) > 0.56) sset(m, x, y, 'u');
  rect(m, 4, 36, 4, 3, ':'); rect(m, 0, 36, 14, 2, ':'); rect(m, 110, 36, 10, 2, ':');
  // wire across no man's land (with two gaps in each line) and craters
  const wires = []; for (const X of [48, 52, 68, 72]) { const pts = []; for (let y = 2; y < H - 2; y += 5.5) pts.push([X + Math.round(Math.sin(y + X) * 0.6), y]); wires.push(pts); for (let y = 2; y < H - 2; y++) if (!((y >= 17 && y <= 21) || (y >= 54 && y <= 58))) m.wire.push([X, y]); }
  const crater = (x0, x1, n, k0, rmax) => Array.from({ length: n }, (_, i) => [Math.round((x0 + R() * (x1 - x0)) * 16) * 2, Math.round((3 + R() * (H - 6)) * 16) * 2, rmax > 12 ? 8 + Math.floor(R() * 14) : 6 + Math.floor(R() * 8), k0 + i]);
  m.decor = { trench: [...cells], wires, craters: [...crater(40, 80, 90, 0, 22), ...crater(18, 38, 40, 100, 14)], seed: sd };
  // dugouts, a ruined farm in no man's land, dead trees, supply
  for (const [x, y] of [[8, 20], [8, 48], [108, 22], [108, 50]]) plan(m, x, y, 4, 4, 1, { wall: '#5a4a34', roof: '#5a4a34', roofKind: 'flat', name: 'Dugout', astyle: 'halver' });
  plan(m, 56, 30, 7, 6, 1, { wall: '#a09070', roofKind: 'gable', dmg: 'hole', astyle: 'ostmark' }); plan(m, 62, 42, 5, 5, 1, { wall: '#8a7e66', roofKind: 'gable', dmg: 'burn', astyle: 'ostmark' });
  for (let i = 0; i < 26; i++) prop(m, 'tree', 42 + Math.floor(R() * 36), 3 + Math.floor(R() * (H - 8)), { color: '#6a5a48' });
  for (let i = 0; i < 8; i++) prop(m, i % 2 ? 'barrel' : 'crate', 8 + i, 40); for (let i = 0; i < 10; i++) prop(m, 'barrel', 104 + (i % 5), 56 + Math.floor(i / 5));
  prop(m, 'tent', 6, 30, { color: '#5a7a6a' }); prop(m, 'tent', 8, 33, { color: '#5a7a6a' }); prop(m, 'tent', 112, 32, { color: '#7a6a5a' });
  m.objective = { x: 60, y: 37 }; m.spawns = { p: { x: 10, y: 37 }, e: { x: W - 11, y: 37 } }; m.exit = { x: W - 2, y: 37 };
}

function compoundV2(m) {
  const R = rngOf(`${m.seed}|compound`); const { w: W, h: H } = m; const A = m.art; const base = BASE[A.biome]; const tc = TREES[A.biome][0]?.[1] || '#4f7a4a';
  rect(m, 0, 0, W, H, base); const cx0 = 26; const cy0 = 14; const cw = 44; const ch = 34;
  rect(m, cx0 - 3, cy0 - 3, cw + 6, ch + 6, A.biome === 'desert' ? 's' : '.'); rect(m, cx0, cy0, cw, ch, 'g'); rect(m, cx0 + 18, cy0 + ch, 6, H - cy0 - ch, ':'); rect(m, cx0 + 20, cy0 + ch, 2, H - cy0 - ch, ':');
  for (let x = 0; x < cw; x++) if (x < 20 || x > 23) { sset(m, cx0 + x, cy0, 'W'); sset(m, cx0 + x, cy0 + ch - 1, 'W'); } for (let y = 0; y < ch; y++) { sset(m, cx0, cy0 + y, 'W'); sset(m, cx0 + cw - 1, cy0 + y, 'W'); }
  const B = (x, y, w, h, floors, e = {}) => plan(m, x, y, w, h, floors, { astyle: A.style, ...e });
  B(cx0 + 14, cy0 + 5, 10, 11, 3, { name: 'Main house' }); B(cx0 + 2, cy0 + 8, 9, 7, 1, { name: 'Barracks' }); B(cx0 + 2, cy0 + 18, 9, 7, 1, { name: 'Barracks' }); B(cx0 + 32, cy0 + 8, 9, 7, 2, { name: 'Garage' }); B(cx0 + 24, cy0 + 19, 11, 7, 1, { name: 'Store' }); B(cx0 + 14, cy0 + 21, 6, 6, 1, { name: 'Generator' });
  for (const [bx, by] of [[cx0 + 1, cy0 + 1], [cx0 + cw - 6, cy0 + 1], [cx0 + 1, cy0 + ch - 9], [cx0 + cw - 6, cy0 + ch - 9]]) B(bx, by, 5, 5, 2, { roofKind: 'flat', wall: '#a8a498', astyle: 'halver', name: 'Guard tower' });
  B(cx0 + 24, cy0 + ch + 2, 4, 5, 1, { wall: '#a8a498', astyle: 'halver', name: 'Gatehouse' });
  for (let i = 0; i < 4; i++) prop(m, 'streetlamp', cx0 + 4 + i * 11, cy0 + 16); prop(m, 'helipad', cx0 + 32, cy0 + 12, { w: 4, h: 4 }); prop(m, 'watertower', cx0 + 40, cy0 + 28, { w: 4, h: 5 }); for (let i = 0; i < 5; i++) prop(m, i % 2 ? 'crate' : 'barrel', cx0 + 31 + i, cy0 + 28); prop(m, 'flagpole', cx0 + 17, cy0 + 17, { color: '#8a2a2a' });
  rect(m, 0, 62, W, 4, '='); rect(m, cx0 + 18, cy0 + ch + 6, 6, 62 - cy0 - ch - 6, '=');
  for (let x = cx0 - 6; x < cx0 + cw + 6; x += 2) prop(m, 'chainfence', x, cy0 - 6); for (let y = cy0 - 6; y < cy0 + ch + 6; y += 2) { prop(m, 'chainfence', cx0 - 6, y); prop(m, 'chainfence', cx0 + cw + 5, y); } for (let x = cx0 - 6; x < cx0 + cw + 6; x += 2) if (x < cx0 + 17 || x > cx0 + 28) prop(m, 'chainfence', x, cy0 + ch + 5);
  scatter(m, R, 120, (x, y) => sget(m, x, y) === base && (x < cx0 - 8 || x > cx0 + cw + 8 || y < cy0 - 8)); for (let i = 0; i < 12; i++) prop(m, 'rock', Math.floor(R() * W), Math.floor(R() * H));
  void tc; for (let i = 0; i < 4; i++) car(m, ['jeep', 'truck', 'sedan', 'van'][i], ['#566a3e', '#3a5a8a', '#2a2a2e', '#a8a8a8'][i], ['E', 'E', 'W', 'N'][i], (cx0 + 34 + (i % 3) * 3) * 32, (cy0 + 11 + Math.floor(i / 3) * 3 + (i === 3 ? 6 : 0)) * 32);
  m.objective = { x: cx0 + 19, y: cy0 + 17 }; m.spawns = { p: { x: cx0 + 21, y: 67 }, e: { x: W - 4, y: 63 } }; m.exit = { x: W - 2, y: 63 };
}

function forestV2(m) {
  const R = rngOf(`${m.seed}|forest`); const { w: W, h: H } = m; const A = m.art; const base = BASE[A.biome]; const sd = seedOf(m); const B = TREES[A.biome].length ? TREES[A.biome] : [['pine', '#4f7a4a']];
  rect(m, 0, 0, W, H, base); if (A.biome === 'mud') rect(m, 0, 0, W, H, 'u');
  const sy = (x) => 34 + Math.round(8 * Math.sin(x / 11) + 3 * Math.sin(x / 4)); for (let x = 0; x < W; x++) rect(m, x, sy(x) - 1, 1, 3, '~'); for (let x = 54; x < 60; x++) rect(m, x, sy(x) - 1, 1, 3, 'b');
  const trail = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i]; const [x2, y2] = pts[i + 1]; const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); for (let k = 0; k <= n; k++) { const x = Math.round(x1 + ((x2 - x1) * k) / n); const y = Math.round(y1 + ((y2 - y1) * k) / n); const c = sget(m, x, y); if (c !== '~' && c !== 'b') rect(m, x, y, 2, 2, ':'); } } };
  trail([[0, 62], [30, 56], [56, 46], [57, 36], [60, 20], [90, 12], [119, 8]]); trail([[56, 46], [80, 58], [119, 62]]); trail([[60, 20], [40, 10], [10, 6]]);
  rect(m, 16, 54, 14, 10, ':'); rect(m, 86, 14, 12, 9, ':');
  for (const [bx, by, w, h] of [[18, 52, 5, 5], [24, 56, 5, 5], [88, 14, 6, 5], [93, 19, 5, 5]]) plan(m, bx, by, w, h, 1, { wall: '#7a5a3a', roof: '#3a3436', roofKind: 'gable', astyle: 'sund', name: 'Cabin' });
  plan(m, 58, 8, 9, 7, 2, { wall: '#6a4a2a', roofKind: 'gable', roof: '#3a3436', astyle: 'sund', name: 'Lodge' });
  const clear = (x, y) => (x > 14 && x < 32 && y > 50 && y < 66) || (x > 84 && x < 100 && y > 12 && y < 26) || (x > 55 && x < 70 && y > 5 && y < 17) || (x > 54 && x < 62 && y > 32 && y < 42);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = sget(m, x, y); if (c !== base && c !== 'u') continue; if (clear(x, y)) continue; const d = fbm(x / 9, y / 9, sd); if (d > 0.36 && ih(x, y, sd) < (d - 0.22) * 1.25) { const [type, color] = B[Math.floor(ih(x, y, 9) * B.length)]; prop(m, type, x, y, { color }); } }
  for (let i = 0; i < 40; i++) { const x = Math.floor(R() * W); const y = Math.floor(R() * H); const c = sget(m, x, y); if (c === base || c === 'u') prop(m, ['bush', 'rock', 'lumber'][i % 3], x, y, i % 3 === 2 ? { w: 2 } : {}); }
  for (let i = 0; i < 5; i++) prop(m, 'lumber', 18 + i * 2, 51, { w: 2 }); prop(m, 'barrelfire', 25, 54); prop(m, 'tent', 30, 55, { color: '#5a7a6a' });
  m.objective = { x: 57, y: 38 }; m.spawns = { p: { x: 3, y: 62 }, e: { x: W - 4, y: 8 } }; m.exit = { x: W - 2, y: 8 };
}

/** The sim's tiles from the glyph ground, the props and the planned buildings; props that sit on a wall, a road or the water are dropped. */
function finish2(m) {
  const { w, h } = m;
  for (let i = 0; i < w * h; i++) { const c = String.fromCharCode(m.surf[i]); m.tiles[i] = c === '=' || c === 'b' ? TILE.ROAD : c === '~' ? TILE.WATER : c === 'k' ? TILE.CROP : c === 'W' ? TILE.WALL : TILE.GROUND; if (c === 'W') m.bfloors[i] = 1; }
  for (const k of m.decor?.trench || []) { const [x, y] = k.split(',').map(Number); if (inb(m, x, y) && m.tiles[idx(m, x, y)] === TILE.GROUND) m.tiles[idx(m, x, y)] = TILE.TRENCH; }
  for (const [x, y] of m.wire) if (inb(m, x, y) && m.tiles[idx(m, x, y)] === TILE.GROUND) m.tiles[idx(m, x, y)] = TILE.WIRE;
  for (const p of m.plans) building(m, p.x, p.y, p.w, p.h, p.floors, { astyle: m.art.style, ...p.extra }, 0);
  const keep = [];
  for (const p of m.props) {
    const i = idx(m, p.x, p.y); const c = sget(m, p.x, p.y); const flat = p.type === 'crosswalk';
    if (m.bid[i] >= 0 || c === '~') continue;
    if (!flat && (c === '=' || c === 'b')) continue;
    const big = (p.w || 1) > 1 || (p.h || 1) > 1; if (big && !flat) { let ok = true; for (let j = 0; j < (p.h || 1); j++) for (let k = 0; k < (p.w || 1); k++) if (!inb(m, p.x + k, p.y + j) || m.bid[idx(m, p.x + k, p.y + j)] >= 0) ok = false; if (!ok) continue; }
    if (p.type === 'tree' || p.type === 'pine') { if (m.tiles[i] === TILE.GROUND) m.tiles[i] = TILE.TREE; else continue; }
    else if (p.type === 'bush') { if (m.tiles[i] === TILE.GROUND) m.tiles[i] = TILE.HEDGE; else continue; }
    else if (p.type === 'chainfence') { if (m.tiles[i] === TILE.GROUND) m.tiles[i] = TILE.WIRE; else continue; }
    keep.push({ id: `p${keep.length}`, ...p });
  }
  m.props = keep; delete m.plans; delete m.wire;
}

/** The clearance radius of the biggest ground vehicle (src/battle/sizes.js): every way a map offers a vehicle is checked and made for this. */
export const MAX_VEHICLE_RADIUS = 1.2;
/** Whether a ground vehicle of clearance radius `r` can drive from `a` to within three tiles of `b` (rules 5, map version 3). */
export function vehicleCanReach(m, a, b, r = MAX_VEHICLE_RADIUS) {
  const cl = clearance(m); const fit = (x, y) => inb(m, x, y) && cl[idx(m, x, y)] >= r - 1e-6; const seen = new Uint8Array(m.w * m.h); const q = [];
  let sx = -1; let sy = -1; for (let k = 0; k < 6 && sx < 0; k++) for (let j = -k; j <= k && sx < 0; j++) for (let i = -k; i <= k && sx < 0; i++) if (Math.max(Math.abs(i), Math.abs(j)) === k && fit(Math.floor(a.x) + i, Math.floor(a.y) + j)) { sx = Math.floor(a.x) + i; sy = Math.floor(a.y) + j; }
  if (sx < 0) return false; seen[idx(m, sx, sy)] = 1; q.push(sx, sy);
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h]; const y = q[h + 1]; if (Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) < 3) return true;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const nx = x + di; const ny = y + dj; if (!fit(nx, ny) || seen[idx(m, nx, ny)]) continue; if (di && dj && (!fit(x + di, y) || !fit(x, y + dj))) continue; seen[idx(m, nx, ny)] = 1; q.push(nx, ny); }
  }
  return false;
}
/**
 * Map version 3: vehicles are 1.6 times the size, so (1) the ground round a start, the objective and the exit is cleared of trees, hedges, wire and trench for a radius of three, and (2) every
 * start and the exit must have a way to the objective that the biggest vehicle fits: if there is none, a road six wide is cut along the nearest line (round buildings and over a bridge).
 */
function fitForVehicles(m) {
  const pts = [m.spawns.p, m.spawns.e, m.objective, m.exit];
  for (const c of pts) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const x = c.x + i; const y = c.y + j; if (!inb(m, x, y) || Math.hypot(i, j) > 3.2 || m.bid[idx(m, x, y)] >= 0) continue; const t = m.tiles[idx(m, x, y)]; if (t === TILE.TREE || t === TILE.HEDGE || t === TILE.WIRE || t === TILE.TRENCH) m.tiles[idx(m, x, y)] = TILE.GROUND; }
  m.entries = (ENTRIES[m.recipe] || ENTRIES.fields).map((e) => ({ ...e, zone: { ...e.zone } }));
  const links = [[m.spawns.p, m.objective], [m.spawns.e, m.objective], [m.objective, m.exit], ...m.entries.map((e) => [{ x: Math.floor(e.zone.x + e.zone.w / 2), y: Math.floor(e.zone.y + e.zone.h / 2) }, m.objective])];
  for (let pass = 0; pass < 4; pass++) {
    let ok = true;
    for (const [a, b] of links) if (!vehicleCanReach(m, a, b)) { ok = false; cutRoad(m, a, b); }
    if (ok) break;
  }
}
/** Cut a road six wide from a to b: the cheapest way over ground that is not a building (a way a vehicle already fits is nearly free, water costs most so a bridge is used), paved six tiles wide (four of them fit the biggest vehicle). */
export function cutRoad(m, a, b) {
  const N = m.w * m.h; const cl = clearance(m); const dist = new Float64Array(N).fill(1e9); const prev = new Int32Array(N).fill(-1); const heap = [];
  const push = (d, n) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1; const r = l + 1; let k = i; if (l < heap.length && heap[l][0] < heap[k][0]) k = l; if (r < heap.length && heap[r][0] < heap[k][0]) k = r; if (k === i) break; [heap[k], heap[i]] = [heap[i], heap[k]]; i = k; } } return top; };
  const nearB = (n) => { const x = n % m.w; const y = (n / m.w) | 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (inb(m, x + i, y + j) && m.bid[idx(m, x + i, y + j)] >= 0) return true; return false; };
  const tileCost = (n) => { if (m.bid[n] >= 0) return 1e9; const t = m.tiles[n]; if (nearB(n)) return 6; if (t === TILE.WATER) return 2000; if (cl[n] >= MAX_VEHICLE_RADIUS) return 0.2; return t === TILE.TREE ? 1.6 : t === TILE.WALL ? 3 : 1; };
  const s0 = idx(m, a.x, a.y); const g0 = idx(m, Math.max(0, Math.min(m.w - 1, b.x)), Math.max(0, Math.min(m.h - 1, b.y))); dist[s0] = 0; push(0, s0);
  while (heap.length) {
    const [d, cur] = pop(); if (d > dist[cur]) continue; if (cur === g0) break;
    const cx = cur % m.w; const cy = (cur / m.w) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const nx = cx + di; const ny = cy + dj; if (!inb(m, nx, ny)) continue; const n = idx(m, nx, ny); const c = tileCost(n); if (c >= 1e9) continue; if (di && dj && (m.bid[idx(m, cx + di, cy)] >= 0 || m.bid[idx(m, cx, cy + dj)] >= 0)) continue; const nd = d + (di && dj ? 1.41 : 1) * c; if (nd < dist[n]) { dist[n] = nd; prev[n] = cur; push(nd, n); } }
  }
  if (prev[g0] < 0 && g0 !== s0) return;
  for (let c = g0; c >= 0; c = prev[c]) {
    const cx = c % m.w; const cy = (c / m.w) | 0;
    for (let j = -2; j <= 3; j++) for (let i = -2; i <= 3; i++) { const px = cx + i; const py = cy + j; if (!inb(m, px, py) || m.bid[idx(m, px, py)] >= 0) continue; const t = m.tiles[idx(m, px, py)]; if (t !== TILE.WATER && t !== TILE.ROAD) m.tiles[idx(m, px, py)] = TILE.ROAD; }
    if (c === s0) break;
  }
}

export function generate({ recipe = 'fields', biome = 'rural', style = 'sund', seed = 'seed', ver = MAP_VER } = {}) {
  const m = blank(recipe, biome, style, String(seed), ver);
  if (ver >= 2) { m.surf = new Uint8Array(m.w * m.h).fill(46); m.props = []; m.cars = []; m.fields = []; m.plans = []; m.wire = []; m.art = { style: ART_STYLE[style] || 'halver', biome: ART_BIOME[biome] || 'temperate' }; ({ city: cityV2, trench: trenchV2, compound: compoundV2, forest: forestV2 }[recipe] || fieldsV2)(m); finish2(m); }
  else if (recipe === 'city') cityV1(m); else fieldsV1(m);
  // make sure nothing is cut off: link any building whose door cannot be reached to the objective by a road
  for (let pass = 0; pass < 3; pass++) {
    const r = reachable(m); if (r.ok) break;
    for (const b of m.buildings) if (!r.seen[idx(m, b.door.x, b.door.y)]) carve(m, { x: b.door.x, y: b.door.y + 1 }, m.objective);
    carve(m, m.spawns.p, m.objective); carve(m, m.spawns.e, m.objective);
  }
  if (ver >= 3) fitForVehicles(m);
  // the spawn tiles themselves are ground
  for (const s of [m.spawns.p, m.spawns.e, m.objective]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const n = idx(m, s.x + i, s.y + j); if (inb(m, s.x + i, s.y + j) && m.bid[n] < 0 && m.tiles[n] !== TILE.ROAD) m.tiles[n] = TILE.GROUND; }
  if (m.props) m.props = m.props.filter((p) => !((p.type === 'tree' || p.type === 'pine') && m.tiles[idx(m, p.x, p.y)] !== TILE.TREE) && !(p.type === 'bush' && m.tiles[idx(m, p.x, p.y)] !== TILE.HEDGE)); // a road carved or a start cleared took the tile
  return m;
}
