// Battle maps (v0.101.0, remade in v0.102.0 on the mock-up's look): a grid made from a seed, never from chance. Two recipes: CITY (avenues and streets with pavements, blocks of shops and flats,
// a plaza with a fountain, lamps, crossings and parked cars) and FIELDS (a patchwork of fields with bush hedgerows, dirt tracks, a river with a bridge, two villages round their greens).
// A building has a wall all round, windows, one door and a stair; its floors are all the same plan (the stair is how you change floor). Every building is reachable on foot from where the player
// starts; a test checks it. The map is a ground-glyph grid (`surf`, the characters the game's own ground painter reads) plus props and cars; the sim's tiles are derived from them.
// A map's `ver` is 2 from v0.102.0: a battle saved by v0.101.0 has no `ver` in its setup and is replayed on the first generation of maps, kept here (cityV1, fieldsV1).
//   generate({ recipe, biome, style, seed, ver })   → the map
//   walkable(map, x, y)                        whether a person can stand on the tile
//   blocksSight(map, x, y, z)                  whether the tile stops a look from floor z
import { TILE, RECIPES, RECIPES_V1, STYLES, ART_STYLE, ART_BIOME, minTiles, MAP_VER } from '../content/battle.js';
import { unit, pick, between } from './hash.js';

const W = TILE.WALL;
export const idx = (m, x, y) => y * m.w + x;
export const inb = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export const tileAt = (m, x, y) => (inb(m, x, y) ? m.tiles[idx(m, x, y)] : TILE.WALL);
export const walkable = (m, x, y) => { const t = tileAt(m, Math.floor(x), Math.floor(y)); return t === TILE.GROUND || t === TILE.ROAD || t === TILE.HEDGE || t === TILE.CROP || t === TILE.FLOOR || t === TILE.DOOR || t === TILE.STAIRS; };
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
const CAR_KINDS = ['sedan', 'hatch', 'van', 'pickup', 'taxi', 'sedan'];
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
    car(m, CAR_KINDS[Math.floor(R() * CAR_KINDS.length)], CAR_COLOURS[Math.floor(R() * CAR_COLOURS.length)], R() < 0.5 ? 'E' : 'W', x * 32 + 20, (y + (R() < 0.5 ? 0.9 : 2.9)) * 32);
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
  track(0, ty, W, 3); track(0, 60, W, 2); track(0, 2, W, 2); for (const x of [3, 92]) track(x, 0, 2, H);
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
    prop(m, 'fountain', vx + 10, vy + 4); for (let i = 0; i < 6; i++) prop(m, 'tree', vx + 2 + i * 3, vy + 8, { color: tc }); prop(m, 'bench', vx + 5, vy + 5); prop(m, 'bench', vx + 15, vy + 5);
    if (tag === 'b') prop(m, 'watertower', vx + 23, vy + 3, { w: 4, h: 5 }); else { prop(m, 'haybale', vx - 2, vy + 20); prop(m, 'tractor', vx + 17, vy + 21, { w: 3, h: 2 }); }
  };
  village(10, 28, 'a'); village(62, 28, 'b');
  // fields between: patches of crop with a bush hedgerow round each
  const crops = A.biome === 'desert' ? ['fallow', 'sorghum'] : ['wheat', 'corn', 'cotton', 'sorghum', 'fallow'];
  const hit = (x, y, w, h, o) => x < o.x + o.w + 1 && x + w > o.x - 1 && y < o.y + o.h + 1 && y + h > o.y - 1;
  for (let tries = 0; tries < 220 && m.fields.length < 14; tries++) {
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

/** The sim's tiles from the glyph ground, the props and the planned buildings; props that sit on a wall, a road or the water are dropped. */
function finish2(m) {
  const { w, h } = m;
  for (let i = 0; i < w * h; i++) { const c = String.fromCharCode(m.surf[i]); m.tiles[i] = c === '=' || c === 'b' ? TILE.ROAD : c === '~' ? TILE.WATER : c === 'k' ? TILE.CROP : TILE.GROUND; }
  for (const p of m.plans) building(m, p.x, p.y, p.w, p.h, p.floors, { astyle: m.art.style, ...p.extra }, 0);
  const keep = [];
  for (const p of m.props) {
    const i = idx(m, p.x, p.y); const c = sget(m, p.x, p.y); const flat = p.type === 'crosswalk';
    if (m.bid[i] >= 0 || c === '~') continue;
    if (!flat && (c === '=' || c === 'b')) continue;
    const big = (p.w || 1) > 1 || (p.h || 1) > 1; if (big && !flat) { let ok = true; for (let j = 0; j < (p.h || 1); j++) for (let k = 0; k < (p.w || 1); k++) if (!inb(m, p.x + k, p.y + j) || m.bid[idx(m, p.x + k, p.y + j)] >= 0) ok = false; if (!ok) continue; }
    if (p.type === 'tree' || p.type === 'pine') { if (m.tiles[i] === TILE.GROUND) m.tiles[i] = TILE.TREE; else continue; }
    else if (p.type === 'bush') { if (m.tiles[i] === TILE.GROUND) m.tiles[i] = TILE.HEDGE; else continue; }
    keep.push({ id: `p${keep.length}`, ...p });
  }
  m.props = keep; delete m.plans;
}

export function generate({ recipe = 'fields', biome = 'rural', style = 'sund', seed = 'seed', ver = MAP_VER } = {}) {
  const m = blank(recipe, biome, style, String(seed), ver);
  if (ver >= 2) { m.surf = new Uint8Array(m.w * m.h).fill(46); m.props = []; m.cars = []; m.fields = []; m.plans = []; m.art = { style: ART_STYLE[style] || 'halver', biome: ART_BIOME[biome] || 'temperate' }; if (recipe === 'city') cityV2(m); else fieldsV2(m); finish2(m); }
  else if (recipe === 'city') cityV1(m); else fieldsV1(m);
  // make sure nothing is cut off: link any building whose door cannot be reached to the objective by a road
  for (let pass = 0; pass < 3; pass++) {
    const r = reachable(m); if (r.ok) break;
    for (const b of m.buildings) if (!r.seen[idx(m, b.door.x, b.door.y)]) carve(m, { x: b.door.x, y: b.door.y + 1 }, m.objective);
    carve(m, m.spawns.p, m.objective); carve(m, m.spawns.e, m.objective);
  }
  // the spawn tiles themselves are ground
  for (const s of [m.spawns.p, m.spawns.e, m.objective]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const n = idx(m, s.x + i, s.y + j); if (inb(m, s.x + i, s.y + j) && m.bid[n] < 0 && m.tiles[n] !== TILE.ROAD) m.tiles[n] = TILE.GROUND; }
  if (m.props) m.props = m.props.filter((p) => !((p.type === 'tree' || p.type === 'pine') && m.tiles[idx(m, p.x, p.y)] !== TILE.TREE) && !(p.type === 'bush' && m.tiles[idx(m, p.x, p.y)] !== TILE.HEDGE)); // a road carved or a start cleared took the tile
  return m;
}
