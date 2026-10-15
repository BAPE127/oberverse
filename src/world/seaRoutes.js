// Sea routes (v0.21.0). Ships sail between ports along lanes found by A* over
// the globe's 3° sea cells (src/world/globe.js), so a route never cuts across
// a continent just because two ports are close on the map. Routes are
// deterministic, cached per pair, and smoothed (straight runs where the sea
// allows). Pure: no game state.
//
//   seaRoute(from, to, countries) → { pts: [[lat, lon], …], km } | null
//   pointAlong(route, f)           → [lat, lon] at fraction f (0–1) of its length
import { isLand, gcKm, wrapLon } from './globe.js';

const STEP = 3;
const LAT0 = -78;
const LAT1 = 78;
const ROWS = (LAT1 - LAT0) / STEP + 1;
const COLS = 360 / STEP;

let GRID = null;
let GRID_FOR = null;
const CACHE = new Map();

const cellLat = (r) => LAT0 + r * STEP;
const cellLon = (c) => -180 + c * STEP;

function grid(countries) {
  if (GRID && GRID_FOR === countries) return GRID;
  GRID = new Uint8Array(ROWS * COLS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) GRID[r * COLS + c] = isLand(cellLat(r), cellLon(c), countries) ? 1 : 0;
  GRID_FOR = countries;
  CACHE.clear();
  return GRID;
}

const sea = (G, r, c) => r >= 0 && r < ROWS && G[r * COLS + (((c % COLS) + COLS) % COLS)] === 0;

/** The sea cell nearest a coastal point (ports sit on the coast). */
export function nearestSea(lat, lon, countries) {
  const G = grid(countries);
  const r0 = Math.round((lat - LAT0) / STEP);
  const c0 = Math.round((wrapLon(lon) + 180) / STEP);
  let best = null;
  let bd = Infinity;
  for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++) {
    const r = r0 + dr;
    const c = (((c0 + dc) % COLS) + COLS) % COLS;
    if (!sea(G, r, c)) continue;
    const d = gcKm([lat, lon], [cellLat(r), cellLon(c)]);
    if (d < bd) { bd = d; best = { r, c }; }
  }
  return best;
}

/** Is the straight run between two points clear of land? (sampled every ~100 km) */
function clearRun(a, b, countries) {
  const km = gcKm(a, b);
  const n = Math.max(2, Math.ceil(km / 100));
  const dl = wrapLon(b[1] - a[1]);
  for (let i = 1; i < n; i++) {
    const f = i / n;
    if (isLand(a[0] + (b[0] - a[0]) * f, wrapLon(a[1] + dl * f), countries)) return false;
  }
  return true;
}

/** A sea route between two coastal points, or null if none (landlocked). */
export function seaRoute(from, to, countries) {
  const key = `${from[0]},${from[1]}>${to[0]},${to[1]}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const G = grid(countries);
  const s = nearestSea(from[0], from[1], countries);
  const t = nearestSea(to[0], to[1], countries);
  let result = null;
  if (s && t) {
    const id = (r, c) => r * COLS + c;
    const ll = (r, c) => [cellLat(r), cellLon(c)];
    const goal = ll(t.r, t.c);
    const g = new Map([[id(s.r, s.c), 0]]);
    const came = new Map();
    const open = [{ r: s.r, c: s.c, f: gcKm(ll(s.r, s.c), goal) }];
    const closed = new Set();
    let found = false;
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      const ck = id(cur.r, cur.c);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (cur.r === t.r && cur.c === t.c) { found = true; break; }
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = cur.r + dr;
        const c = (((cur.c + dc) % COLS) + COLS) % COLS;
        if (!sea(G, r, c)) continue;
        // no squeezing diagonally between two land cells
        if (dr && dc && !sea(G, cur.r + dr, cur.c) && !sea(G, cur.r, cur.c + dc)) continue;
        const nk = id(r, c);
        if (closed.has(nk)) continue;
        const ng = g.get(ck) + gcKm(ll(cur.r, cur.c), ll(r, c));
        if (ng < (g.get(nk) ?? Infinity)) {
          g.set(nk, ng);
          came.set(nk, ck);
          open.push({ r, c, f: ng + gcKm(ll(r, c), goal) });
        }
      }
    }
    if (found) {
      const cells = [];
      for (let k = id(t.r, t.c); k !== undefined; k = came.get(k)) cells.unshift(ll(Math.floor(k / COLS), k % COLS));
      const raw = [from, ...cells, to];
      // string-pull: keep only the turns the coastline forces
      const pts = [raw[0]];
      let i = 0;
      while (i < raw.length - 1) {
        let j = raw.length - 1;
        while (j > i + 1 && !clearRun(raw[i], raw[j], countries)) j--;
        pts.push(raw[j]);
        i = j;
      }
      let km = 0;
      for (let k = 1; k < pts.length; k++) km += gcKm(pts[k - 1], pts[k]);
      result = { pts, km: Math.round(km) };
    }
  }
  CACHE.set(key, result);
  return result;
}

/** The point a fraction f (0–1) of the way along a route. */
export function pointAlong(route, f) {
  const pts = route.pts;
  if (f <= 0) return pts[0];
  if (f >= 1) return pts[pts.length - 1];
  let want = route.km * f;
  for (let k = 1; k < pts.length; k++) {
    const seg = gcKm(pts[k - 1], pts[k]);
    if (want <= seg || k === pts.length - 1) {
      const t = seg ? Math.min(1, want / seg) : 0;
      const a = pts[k - 1];
      const b = pts[k];
      return [a[0] + (b[0] - a[0]) * t, wrapLon(a[1] + wrapLon(b[1] - a[1]) * t)];
    }
    want -= seg;
  }
  return pts[pts.length - 1];
}
