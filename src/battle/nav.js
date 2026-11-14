// Moving and seeing on a battle map (v0.101.0): A* on the tile grid, and a look along a line that walls and trees can stop. Pure: no canvas, no chance.
import { TILE } from '../content/battle.js';
import { idx, inb, tileAt, blocksSight } from './map.js';

/** Whether a unit of this kind can stand on a tile: people go anywhere a person can; vehicles stay off hedges and out of buildings; helicopters go over everything. */
export function canStand(m, x, y, kind) {
  if (!inb(m, x, y)) return false;
  const t = m.tiles[idx(m, x, y)];
  if (kind === 'heli') return true;
  if (kind === 'inf') return t === TILE.GROUND || t === TILE.ROAD || t === TILE.HEDGE || t === TILE.CROP || t === TILE.FLOOR || t === TILE.DOOR || t === TILE.STAIRS || t === TILE.TRENCH || t === TILE.WIRE;
  return t === TILE.GROUND || t === TILE.ROAD || t === TILE.CROP;
}
const cost = (t) => (t === TILE.WIRE ? 2.6 : t === TILE.TRENCH ? 1.2 : t === TILE.ROAD ? 1 : t === TILE.HEDGE ? 1.8 : t === TILE.CROP ? 1.3 : t === TILE.DOOR ? 1.4 : 1.1);

/** A* (eight directions; no cutting a corner past a wall). Returns [{x,y}...] from the next tile to the goal, or [] when there is no way. `kind` is 'inf', 'veh' or 'heli'. */
export function findPath(m, from, to, kind = 'inf', opts = null) {
  const R = opts?.r || 0; const avoid = opts?.avoid || null; const pen = opts?.penalty || null; const clr = R ? clearance(m) : null;
  const fits = (x, y) => canStand(m, x, y, kind) && (!clr || clr[idx(m, x, y)] >= R - 1e-6) && !(avoid && avoid.has(idx(m, x, y)));
  const sx = Math.floor(from.x); const sy = Math.floor(from.y); let gx = Math.floor(to.x); let gy = Math.floor(to.y);
  if (kind === 'heli') return [{ x: gx + 0.5, y: gy + 0.5 }];
  if (!fits(gx, gy)) { // the nearest tile that can be stood on
    let best = null;
    for (let r = 1; r < 8 && !best; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (fits(gx + i, gy + j) && (!best || Math.hypot(i, j) < best.d)) best = { x: gx + i, y: gy + j, d: Math.hypot(i, j) };
    if (!best) return []; gx = best.x; gy = best.y;
  }
  if (sx === gx && sy === gy) return [];
  const N = m.w * m.h; const g = new Float32Array(N).fill(1e9); const prev = new Int32Array(N).fill(-1); const closed = new Uint8Array(N);
  const open = [[0, idx(m, sx, sy)]]; g[idx(m, sx, sy)] = 0;
  const h = (x, y) => { const dx = Math.abs(x - gx); const dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  let found = false;
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, cur] = open.splice(bi, 1)[0];
    if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % m.w; const cy = (cur / m.w) | 0;
    if (cx === gx && cy === gy) { found = true; break; }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const nx = cx + di; const ny = cy + dj;
      if (!fits(nx, ny)) continue;
      if (di && dj && (!fits(cx + di, cy) || !fits(cx, cy + dj))) continue;
      const n = idx(m, nx, ny); if (closed[n]) continue;
      const ng = g[cur] + (di && dj ? 1.41 : 1) * cost(m.tiles[n]) + (pen ? pen[n] : 0);
      if (ng < g[n]) { g[n] = ng; prev[n] = cur; open.push([ng + h(nx, ny), n]); }
    }
  }
  if (!found) return [];
  const path = []; let c = idx(m, gx, gy);
  while (c !== idx(m, sx, sy)) { path.push({ x: (c % m.w) + 0.5, y: ((c / m.w) | 0) + 0.5 }); c = prev[c]; }
  return path.reverse();
}

/** A look from one tile to another along a straight line (Bresenham): stopped by a wall or tree that stands higher than the viewer. Neither end blocks. */
export function los(m, ax, ay, az, bx, by, bz) {
  let x0 = Math.floor(ax); let y0 = Math.floor(ay); const x1 = Math.floor(bx); const y1 = Math.floor(by);
  const z = Math.max(az, bz);
  const dx = Math.abs(x1 - x0); const dy = Math.abs(y1 - y0); const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
    if ((x0 !== x1 || y0 !== y1) && inb(m, x0, y0) && blocksSight(m, x0, y0, z)) return false;
  }
  return true;
}

/**
 * How much room a vehicle has at each tile (rules 5): the distance from the tile's centre to the nearest tile a vehicle cannot stand on (the map's edge counts), up to 3. A vehicle needs this to be at
 * least its clearance radius (src/battle/sizes.js) to stand there or pass; a corridor three tiles wide gives 1.5 in its middle. Made once for a map and kept on it (not enumerable, so it is not saved).
 */
export function clearance(m) {
  let key = 0; const T = m.tiles; for (let i = 0; i < T.length; i++) key = (Math.imul(key, 31) + T[i]) | 0; // (a map's tiles can change under it: a breach, a collapsed trench, a test)
  if (m.clr && m.clrKey === key) return m.clr;
  const N = m.w * m.h; const c = new Float32Array(N); const cap = 3;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!canStand(m, x, y, 'veh')) continue; let best = cap;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const bx = x + i; const by = y + j; if (inb(m, bx, by) && canStand(m, bx, by, 'veh')) continue;
      const dx = Math.max(Math.abs(i) - 0.5, 0); const dy = Math.max(Math.abs(j) - 0.5, 0); const d = Math.hypot(dx, dy); if (d < best) best = d; // (the nearest point of the blocked tile)
    }
    c[y * m.w + x] = best;
  }
  Object.defineProperty(m, 'clr', { value: c, enumerable: false, configurable: true, writable: true }); Object.defineProperty(m, 'clrKey', { value: key, enumerable: false, configurable: true, writable: true });
  return c;
}
export { tileAt };
