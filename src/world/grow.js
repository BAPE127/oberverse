// Seamless buildings, part 1 (v0.47.0): grow the towns so every building holds its interior.
//
// Owner: "walk straight into buildings on the street … like Streets of Rogue." Each building's
// interior is laid over its footprint in world space (see world/interiors.js), so the footprint
// must be exactly the interior's size. The towns were drawn with small buildings, so here they
// grow: whole columns and rows are duplicated inside buildings — never through a road — until
// every building is wide and deep enough, the same way v0.20.0 widened the roads. Neighbours in
// the same band grow too (their spare ground becomes a yard). A coastal region's maps share rows,
// so a row added to one is added to all of them.
//
//   growStreets(maps, regions, interiorOf) → { [mapId]: { fx, fy } } (widened → grown tile coords)
import { widenMap } from './widen.js';

const ROADS = new Set(['=']);
const MAX_STEPS = 400;

/** Horizontal and vertical run lengths of road tiles through each road tile. */
function roadRuns(tiles) {
  const H = tiles.length;
  const W = tiles[0].length;
  const h = new Int16Array(W * H);
  const v = new Int16Array(W * H);
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (!ROADS.has(tiles[y][x])) { x++; continue; }
      let e = x;
      while (e < W && ROADS.has(tiles[y][e])) e++;
      for (let k = x; k < e; k++) h[y * W + k] = e - x;
      x = e;
    }
  }
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (!ROADS.has(tiles[y][x])) { y++; continue; }
      let e = y;
      while (e < H && ROADS.has(tiles[e][x])) e++;
      for (let k = y; k < e; k++) v[k * W + x] = e - y;
      y = e;
    }
  }
  return { h, v, W, H };
}

/** Columns a north–south road runs down (duplicating one would widen the road), and rows an east–west one runs along. */
function forbidden(def) {
  const { h, v, W, H } = roadRuns(def.tiles);
  const cols = new Set([0, W - 1]);
  const rows = new Set([0, H - 1]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!h[i]) continue;
    if (h[i] <= 6 && v[i] > 6) { cols.add(x); cols.add(x - 1); } // a road running north–south
    if (v[i] <= 6 && h[i] > 6) { rows.add(y); rows.add(y - 1); } // …east–west
  }
  // never through a door: the copy would be a second, false doorway in a wall
  for (const d of def.doors || []) if (!d.seamless) { cols.add(d.x); rows.add(d.y); } // (seams are re-stitched afterwards)
  // (a building's own door column may be copied — its footprint is rebuilt afterwards — but not its row,
  // which would leave a stray doorway in the pavement below it)
  for (const b of def.buildings || []) if (b.door) rows.add(b.door.y);
  return { cols, rows };
}

/** What each building still lacks: columns left and right of its door, rows above it. */
function deficits(def, interiorOf) {
  const out = [];
  for (const b of def.buildings || []) {
    const I = interiorOf(def.id, b);
    if (!I || !b.door) continue;
    const left = I.ex - (b.door.x - b.x);
    const right = (I.W - 1 - I.ex) - (b.x + b.w - 1 - b.door.x);
    const up = I.H - b.h;
    out.push({ b, left, right, up });
  }
  return out;
}

/**
 * Grow every street map (in place) so each building with an interior is at least as big as it.
 * `interiorOf(mapId, building)` → { W, H, ex } (interior size and its street door's column) or null.
 */
export function growStreets(maps, regions, interiorOf, streetIds) {
  const shifts = {};
  const compose = (id, f, g) => {
    const s = shifts[id] || { fx: (x) => x, fy: (y) => y };
    shifts[id] = { fx: f ? ((x) => f(s.fx(x))) : s.fx, fy: g ? ((y) => g(s.fy(y))) : s.fy };
  };
  for (const id of streetIds) shifts[id] = { fx: (x) => x, fy: (y) => y };
  const fieldSize = new Map(streetIds.flatMap((id) => (maps[id].fields || []).map((f) => [f.id, { w: f.w, h: f.h }])));
  const insert = (id, { cols = [], rows = [] }) => {
    const { def, fx, fy } = widenMap(maps[id], { cols, rows, by: 1 });
    maps[id] = def;
    compose(id, cols.length ? fx : null, rows.length ? fy : null);
  };
  // maps tied together by shared rows (side by side in a region)
  const groupOf = (id) => {
    for (const r of Object.values(regions)) {
      const ids = Object.keys(r.maps).filter((m) => streetIds.includes(m));
      if (ids.includes(id) && ids.length > 1 && ids.every((m) => (r.maps[m].y || 0) === (r.maps[id].y || 0))) return ids;
    }
    return [id];
  };

  // columns: per map
  for (const id of streetIds) {
    for (let step = 0; step < MAX_STEPS; step++) {
      const def = maps[id];
      const need = deficits(def, interiorOf).filter((d) => d.left > 0 || d.right > 0);
      if (!need.length) break;
      const { cols } = forbidden(def);
      // candidate columns and how many buildings each one helps
      const score = new Map();
      for (const d of need) {
        const ranges = [];
        if (d.left > 0) ranges.push([d.b.x, d.b.door.x - 1]);
        if (d.right > 0) ranges.push([d.b.door.x, Math.max(d.b.door.x, d.b.x + d.b.w - 2)]);
        for (const [a, z] of ranges) for (let c = a; c <= z; c++) if (!cols.has(c)) score.set(c, (score.get(c) || 0) + 1 + (d.left + d.right) / 100);
      }
      if (!score.size) throw new Error(`grow: no room to widen ${need.map((d) => d.b.id).join(', ')} on ${id}`);
      // keep clear of farm fields where we can (their size is their price and their yield)
      for (const f of [...(def.fields || []), ...(def.paddock ? [def.paddock] : [])]) for (const c of score.keys()) if (c >= f.x - 1 && c < f.x + f.w) score.set(c, score.get(c) - 0.9);
      const best = [...score.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0];
      insert(id, { cols: [best] });
    }
  }
  // rows: per group of side-by-side maps (a row added to one is added to all)
  const done = new Set();
  for (const id of streetIds) {
    if (done.has(id)) continue;
    const group = groupOf(id);
    group.forEach((g) => done.add(g));
    const gy = (m) => (Object.values(regions).find((r) => r.maps[m])?.maps[m].y) || 0;
    for (let step = 0; step < MAX_STEPS; step++) {
      const need = group.flatMap((m) => deficits(maps[m], interiorOf).filter((d) => d.up > 0).map((d) => ({ ...d, m })));
      if (!need.length) break;
      const bad = new Set();
      for (const m of group) for (const r of forbidden(maps[m]).rows) bad.add(r + gy(m));
      const score = new Map();
      for (const d of need) for (let r = d.b.y; r <= d.b.y + d.b.h - 2; r++) {
        const R = r + gy(d.m);
        if (!bad.has(R)) score.set(R, (score.get(R) || 0) + 1 + d.up / 100);
      }
      if (!score.size) throw new Error(`grow: no room to deepen ${need.map((d) => d.b.id).join(', ')}`);
      for (const m of group) for (const f of [...(maps[m].fields || []), ...(maps[m].paddock ? [maps[m].paddock] : [])]) for (const r of score.keys()) if (r - gy(m) >= f.y - 1 && r - gy(m) < f.y + f.h) score.set(r, score.get(r) - 0.9);
      const best = [...score.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0][0];
      for (const m of group) insert(m, { rows: [best - gy(m)] });
    }
  }
  // anything else a street map carries with coordinates (Lariat's fields and paddock, …) moves too
  const HANDLED = new Set(['tiles', 'doors', 'buildings', 'spots', 'areas', 'props', 'keepClear']);
  for (const id of streetIds) {
    const def = maps[id];
    for (const [k, v] of Object.entries(def)) if (!HANDLED.has(k) && v && typeof v === 'object') shiftContent(v, { [id]: shifts[id] }, id);
  }
  // a farm field keeps its size (its price, seed and yield go by its area): the extra rows and
  // columns that ran through it become grass at its far edges
  for (const id of streetIds) {
    const def = maps[id];
    if (!def.fields) continue;
    const grid = def.tiles.map((r) => r.split(''));
    for (const f of def.fields) {
      const o = fieldSize.get(f.id);
      if (!o) continue;
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        if ((x >= f.x + o.w || y >= f.y + o.h) && grid[y]?.[x] === 'k') grid[y][x] = '.';
      }
      f.w = o.w;
      f.h = o.h;
    }
    def.tiles = grid.map((r) => r.join(''));
  }
  return shifts;
}

/** Shift every { map, x, y [, w, h] } inside `obj` that names a grown map (in place). */
export function shiftContent(obj, shifts, ctx = null, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);
  if (Array.isArray(obj)) { for (const v of obj) shiftContent(v, shifts, ctx, seen); return; }
  const m = typeof obj.map === 'string' ? obj.map : ctx;
  const s = m && shifts[m];
  if (s && typeof obj.x === 'number' && typeof obj.y === 'number') {
    if (typeof obj.w === 'number' && typeof obj.h === 'number') {
      const x = s.fx(obj.x);
      const y = s.fy(obj.y);
      obj.w = s.fx(obj.x + obj.w - 1) + 1 - x;
      obj.h = s.fy(obj.y + obj.h - 1) + 1 - y;
      obj.x = x;
      obj.y = y;
    } else {
      obj.x = s.fx(obj.x);
      obj.y = s.fy(obj.y);
    }
  }
  for (const [k, v] of Object.entries(obj)) if (k !== 'tiles' && v && typeof v === 'object') shiftContent(v, shifts, m, seen);
}
