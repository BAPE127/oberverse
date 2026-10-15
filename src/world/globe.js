// The world globe's geography (v0.15.1; shared since v0.21.0; real-looking
// continents since v0.28.0 — src/world/geography.js). Used by the arms
// terminal's globe, Fleet Command's chart (src/engine/drawGlobeSurface.js) and
// the sea routes ships follow (src/world/seaRoutes.js). Pure functions.
import { elevation } from './geography.js';

export const D2R = Math.PI / 180;
export const wrapLon = (d) => ((d + 540) % 360) - 180;

/**
 * v0.28.0: the world's land comes from src/world/geography.js — fictional
 * continents and islands with real coastlines — sampled once onto a
 * half-degree grid (720 × 361) that everything reads: the terminals' globe
 * and chart, sea routes, ports. `countries` is kept in the signatures for
 * compatibility; capitals are on land by design (tested).
 */
export const GRID_RES = 2; // samples per degree
const GW = 360 * GRID_RES;
const GH = 180 * GRID_RES + 1;
let GRID = null;

/** The elevation grid: rows from 90°N (row 0) to 90°S, columns from 180°W. */
export function landGrid() {
  if (!GRID) {
    GRID = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) GRID[j * GW + i] = elevation(90 - j / GRID_RES, i / GRID_RES - 180);
  }
  return { data: GRID, w: GW, h: GH, res: GRID_RES };
}

/** Elevation at any point, smoothly between grid samples (> 0 is land). */
export function elevationAt(lat, lon) {
  const g = landGrid().data;
  const fy = Math.max(0, Math.min(GH - 1.001, (90 - lat) * GRID_RES));
  const fx = (wrapLon(lon) + 180) * GRID_RES;
  const j = Math.floor(fy);
  const i = Math.floor(fx);
  const ty = fy - j;
  const tx = fx - i;
  const i0 = ((i % GW) + GW) % GW;
  const i1 = (i0 + 1) % GW;
  const a = g[j * GW + i0] + (g[j * GW + i1] - g[j * GW + i0]) * tx;
  const b = g[(j + 1) * GW + i0] + (g[(j + 1) * GW + i1] - g[(j + 1) * GW + i0]) * tx;
  return a + (b - a) * ty;
}

/** Old name, same idea: land strength at a point (land from LAND_AT up). */
export function landNoise(lat, lon) {
  return elevationAt(lat, lon) + LAND_AT;
}

const LAND_AT = 0.12;

/** Land strength at a point (land from LAND_AT up). */
export function landValue(lat, lon) {
  return elevationAt(lat, lon) + LAND_AT;
}

export const isLand = (lat, lon, countries) => landValue(lat, lon, countries) >= LAND_AT;

/** Great-circle distance in km between [lat, lon] points (globe radius 6371 km). */
export function gcKm(a, b) {
  const p1 = a[0] * D2R;
  const p2 = b[0] * D2R;
  const dp = p2 - p1;
  const dl = wrapLon(b[1] - a[1]) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
