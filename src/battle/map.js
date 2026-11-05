// Battle maps (v0.101.0): a grid made from a seed, never from chance. Two recipes this release: CITY (avenues, blocks of buildings with floors, a plaza) and FIELDS (a patchwork of fields
// with hedgerows, a river and a ford, two villages). A building has a wall all round, windows, one door and a stair; its floors are all the same plan (the stair is how you change floor).
// Every building is reachable on foot from where the player starts; a test checks it.
//   generate({ recipe, biome, style, seed })   → the map
//   walkable(map, x, y)                        whether a person can stand on the tile
//   blocksSight(map, x, y, z)                  whether the tile stops a look from floor z
import { TILE, RECIPES, STYLES } from '../content/battle.js';
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

function blank(recipe, biome, style, seed) {
  const { w, h } = RECIPES[recipe];
  return { recipe, biome, style, seed, w, h, tiles: new Uint8Array(w * h), bfloors: new Uint8Array(w * h), bid: new Int16Array(w * h).fill(-1), buildings: [], objective: null, exit: null, spawns: { p: null, e: null } };
}
const free = (m, x, y, w, h, pad = 1) => { for (let j = y - pad; j < y + h + pad; j++) for (let i = x - pad; i < x + w + pad; i++) { if (!inb(m, i, j)) return false; const t = m.tiles[idx(m, i, j)]; if (t !== TILE.GROUND || m.bid[idx(m, i, j)] >= 0) return false; } return true; };

/** A building: wall all round, windows every third tile, a door in the middle of the south wall, a stair inside, `floors` floors. */
function building(m, x, y, w, h, floors) {
  if (!free(m, x, y, w, h)) return null;
  const id = m.buildings.length;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const n = idx(m, i, j); m.bid[n] = id; m.bfloors[n] = floors;
    const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1;
    m.tiles[n] = edge ? W : TILE.FLOOR;
    if (edge && (i - x + j - y) % 3 === 1 && i !== x && i !== x + w - 1 && !(j === y + h - 1 && i === x + Math.floor(w / 2))) m.tiles[n] = TILE.WINDOW;
  }
  const door = { x: x + Math.floor(w / 2), y: y + h - 1 };
  m.tiles[idx(m, door.x, door.y)] = TILE.DOOR;
  const stairs = { x: x + 1, y: y + 1 };
  if (w >= 5 && h >= 4) m.tiles[idx(m, stairs.x, stairs.y)] = TILE.STAIRS;
  m.buildings.push({ id, x, y, w, h, floors, door, stairs, style: m.style });
  return id;
}
const road = (m, x0, y0, x1, y1) => { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (inb(m, i, j) && m.tiles[idx(m, i, j)] !== TILE.WALL && m.bid[idx(m, i, j)] < 0) m.tiles[idx(m, i, j)] = TILE.ROAD; };

function city(m) {
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

function fields(m) {
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

export function generate({ recipe = 'fields', biome = 'rural', style = 'sund', seed = 'seed' } = {}) {
  const m = blank(recipe, biome, style, String(seed));
  if (recipe === 'city') city(m); else fields(m);
  // make sure nothing is cut off: link any building whose door cannot be reached to the objective by a road
  for (let pass = 0; pass < 3; pass++) {
    const r = reachable(m); if (r.ok) break;
    for (const b of m.buildings) if (!r.seen[idx(m, b.door.x, b.door.y)]) carve(m, { x: b.door.x, y: b.door.y + 1 }, m.objective);
    carve(m, m.spawns.p, m.objective); carve(m, m.spawns.e, m.objective);
  }
  // the spawn tiles themselves are ground
  for (const s of [m.spawns.p, m.spawns.e, m.objective]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const n = idx(m, s.x + i, s.y + j); if (inb(m, s.x + i, s.y + j) && m.bid[n] < 0 && m.tiles[n] !== TILE.ROAD) m.tiles[n] = TILE.GROUND; }
  return m;
}
