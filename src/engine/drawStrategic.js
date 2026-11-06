// The strategic map's ground (v0.103.0): a theatre drawn from the world's own shape, as the mock-up (docs/mockups/proposal-war-strategic-map.png) draws it. Each pixel is asked what the world has
// there (sea or land, its height, its relief), which state's province it falls in (the nearest seed of its own state: the same cut as src/world/provinces.js), and is lit from the north-west;
// province borders and country borders are drawn into the pixels, and trees, peaks, hills and farm squares are scattered on the provinces that are woods, mountains, hills and farmland.
// A second layer tints the ground by who holds it and draws the front line. Both are cached; only the tint is redrawn when ground changes hands.
//
//   await bakeTheatre(theatre, ppd, progress) → { w, h, ppd, lat1, lon0, base (canvas), pm (province number per pixel, -1 none), toPx(lat, lon), fromPx(x, y) }
//   bakeControl(map, controllerOf)  → a canvas the size of the map: the tint and the front line
//   COUNTRY_RGB(id)                 → [r, g, b]
import { provinces, provinceGrid } from '../world/provinces.js';
import { stateAt } from '../world/atlas.js';
import { elevation, relief } from '../world/geography.js';
import { ATLAS } from '../content/atlas.js';

export const TERRAIN_RGB = { plains: [150, 176, 94], farmland: [186, 184, 98], forest: [88, 128, 72], hills: [160, 146, 98], mountains: [142, 136, 126], marsh: [104, 138, 112], urban: [158, 156, 168], desert: [214, 188, 124], jungle: [58, 112, 66] };
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const COUNTRY_RGB = (id) => hex(ATLAS.countries[id]?.color || '#888888');
const rnd = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const tick = () => new Promise((r) => setTimeout(r, 0));
async function bakeTheatre(th, ppd = 36, progress = () => {}) {
  const P = provinces(); const { w: GW, h: GH, grid } = provinceGrid(); const inTh = new Set(th.states);
  let la0 = 90; let la1 = -90; let lo0 = 360; let lo1 = -360;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const p = grid[j * GW + i]; if (p < 0 || !inTh.has(P[p].state)) continue; const lat = 90 - j / 2; const lon = i / 2 - 180; la0 = Math.min(la0, lat); la1 = Math.max(la1, lat); lo0 = Math.min(lo0, lon); lo1 = Math.max(lo1, lon); }
  la0 -= 2; la1 += 2; lo0 -= 2; lo1 += 2;
  const W = Math.round((lo1 - lo0) * ppd); const H = Math.round((la1 - la0) * ppd);
  const lat = (y) => la1 - (y + 0.5) / ppd; const lon = (x) => lo0 + (x + 0.5) / ppd;
  const PW = W + 2; const el = new Float32Array(PW * (H + 2)); const rel = new Float32Array(W * H);
  for (let y = -1; y <= H; y++) { for (let x = -1; x <= W; x++) el[(y + 1) * PW + x + 1] = elevation(lat(y), lon(x)); if (y % 60 === 0) { progress(0.05 + 0.3 * ((y + 1) / (H + 1))); await tick(); } }
  const byState = new Map(); for (const p of P) { if (!byState.has(p.state)) byState.set(p.state, []); byState.get(p.state).push(p); }
  const pm = new Int16Array(W * H).fill(-1); const cos = new Float32Array(H); for (let y = 0; y < H; y++) cos[y] = Math.cos(lat(y) * Math.PI / 180);
  const c = mk(W, H); const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data;
  const stateCache = new Map();
  for (let y = 0; y < H; y++) { if (y % 40 === 0) { progress(0.35 + 0.55 * (y / H)); await tick(); } for (let x = 0; x < W; x++) {
    const e = el[(y + 1) * PW + x + 1]; const o = (y * W + x) * 4;
    if (e < 0.02) { const t = Math.min(1, -e * 1.6 + 0.1); d[o] = 30 + 22 * (1 - t); d[o + 1] = 74 + 44 * (1 - t); d[o + 2] = 118 + 40 * (1 - t); d[o + 3] = 255; continue; }
    const la = lat(y); const lo = lon(x); const key = `${Math.round(la * 4)}|${Math.round(lo * 4)}`; let st = stateCache.get(key); if (st === undefined) { const s = stateAt(la, lo); st = s ? s.id : null; stateCache.set(key, st); }
    const seeds = st ? byState.get(st) : null; if (!seeds) { d[o] = 120; d[o + 1] = 120; d[o + 2] = 110; d[o + 3] = 255; continue; }
    let best = -1; let bd = 1e9; for (const s of seeds) { const dl = (lo - s.lon) * cos[y]; const dd = (la - s.lat) ** 2 + dl * dl; if (dd < bd) { bd = dd; best = s.n; } }
    pm[y * W + x] = best; const col = TERRAIN_RGB[P[best].terrain] || [140, 150, 100];
    const r = relief(la, lo, e); rel[y * W + x] = r;
    const sh = (el[y * PW + x] - el[(y + 2) * PW + x + 2]) * 5 + r * 0.25 + (rnd(x, y, 3) - 0.5) * 0.06; const k = 1 + Math.max(-0.35, Math.min(0.35, sh));
    d[o] = Math.min(255, col[0] * k); d[o + 1] = Math.min(255, col[1] * k); d[o + 2] = Math.min(255, col[2] * k); d[o + 3] = 255;
  } }
  progress(0.92); await tick();
  // coasts: a pale line where land meets sea; borders: province (thin), country (thick)
  const edge = (x, y, f) => { const o = (y * W + x) * 4; d[o] = d[o] * (1 - f) + 20 * f; d[o + 1] = d[o + 1] * (1 - f) + 20 * f; d[o + 2] = d[o + 2] * (1 - f) + 30 * f; };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = pm[y * W + x]; if (a < 0) { const r = pm[y * W + x + 1]; const b = pm[(y + 1) * W + x]; if (r >= 0 || b >= 0) { const q = (y * W + x) * 4; d[q] += (225 - d[q]) * 0.5; d[q + 1] += (232 - d[q + 1]) * 0.5; d[q + 2] += (238 - d[q + 2]) * 0.4; } continue; }
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) { const b = pm[ny * W + nx]; if (b < 0 || b === a) continue; const cross = P[a].country !== P[b].country; edge(x, y, cross ? 0.7 : 0.3); if (cross) { edge(nx, ny, 0.5); } }
  }
  g.putImageData(img, 0, 0);
  // scatter: trees on woods and jungle, peaks on mountains, hills on high ground, squares on farmland
  const byProv = new Map(); for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const p = pm[y * W + x]; if (p >= 0) { let l = byProv.get(p); if (!l) byProv.set(p, (l = [])); l.push(x, y); } }
  for (const [p, pts] of byProv) {
    const t = P[p].terrain; const n = pts.length / 2; const want = Math.min(80, Math.round(n / (t === 'farmland' ? 120 : 90)));
    for (let k = 0; k < want; k++) {
      const q = Math.floor(rnd(p, k, 7) * n) * 2; const x = pts[q] + (rnd(p, k, 8) - 0.5) * 2; const y = pts[q + 1] + (rnd(p, k, 9) - 0.5) * 2; if (pm[Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))] !== p) continue;
      const s = 3 + rnd(p, k, 10) * 3;
      if (t === 'forest' || t === 'jungle') { g.fillStyle = t === 'jungle' ? 'rgba(20,70,34,.85)' : 'rgba(34,82,40,.85)'; g.beginPath(); g.moveTo(x, y - s * 1.3); g.lineTo(x + s * 0.8, y + s * 0.5); g.lineTo(x - s * 0.8, y + s * 0.5); g.fill(); }
      else if (t === 'mountains') { g.fillStyle = 'rgba(98,92,86,.95)'; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * 1.2, y + s * 0.6); g.lineTo(x - s * 1.2, y + s * 0.6); g.fill(); g.fillStyle = 'rgba(236,236,240,.9)'; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * 0.45, y - s * 0.55); g.lineTo(x - s * 0.45, y - s * 0.55); g.fill(); }
      else if (t === 'hills') { g.strokeStyle = 'rgba(110,96,60,.8)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, s, Math.PI, 0); g.stroke(); }
      else if (t === 'farmland') { g.fillStyle = rnd(p, k, 11) < 0.5 ? 'rgba(208,206,120,.55)' : 'rgba(160,172,90,.5)'; g.fillRect(x - s, y - s * 0.7, s * 2, s * 1.4); }
      else if (t === 'marsh') { g.strokeStyle = 'rgba(70,110,100,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.stroke(); }
    }
  }
  return { w: W, h: H, ppd, lat1: la1, lon0: lo0, base: c, pm, toPx: (la, lo) => [(lo - lo0) * ppd, (la1 - la) * ppd], fromPx: (x, y) => [la1 - y / ppd, lo0 + x / ppd] };
}

/** The tint by who holds the ground, and the front line where the two sides meet. `controllerOf(province)` gives the country. */
export function bakeControl(map, controllerOf, side, enemy) {
  const P = provinces(); const { w: W, h: H, pm } = map; const c = mk(W, H); const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data;
  const ctl = P.map((p) => controllerOf(p)); const rgb = { [side]: COUNTRY_RGB(side), [enemy]: COUNTRY_RGB(enemy) };
  for (let i = 0; i < W * H; i++) { const p = pm[i]; if (p < 0) continue; const cc = ctl[p]; const col = rgb[cc]; const o = i * 4; if (col) { d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = cc === side ? 70 : 78; } else { d[o] = 90; d[o + 1] = 90; d[o + 2] = 96; d[o + 3] = 120; } }
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = pm[y * W + x]; if (a < 0) continue;
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) { const b = pm[ny * W + nx]; if (b < 0 || ctl[a] === ctl[b] || !((ctl[a] === side && ctl[b] === enemy) || (ctl[a] === enemy && ctl[b] === side))) continue; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; const yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const o = (yy * W + xx) * 4; d[o] = 230; d[o + 1] = 60; d[o + 2] = 60; d[o + 3] = 235; } }
  }
  g.putImageData(img, 0, 0); return c;
}
/** A tint over the ground by a number or a kind per province: `rgbaOf(province)` gives [r, g, b, a] (a 0 to 255) or null for none. Used by the Supply, Weather and Intel modes. */
export function bakeLayer(map, rgbaOf) {
  const P = provinces(); const { w: W, h: H, pm } = map; const c = mk(W, H); const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data; const col = P.map((p) => rgbaOf(p));
  for (let i = 0; i < W * H; i++) { const p = pm[i]; if (p < 0) continue; const k = col[p]; if (!k) continue; const o = i * 4; d[o] = k[0]; d[o + 1] = k[1]; d[o + 2] = k[2]; d[o + 3] = k[3]; }
  g.putImageData(img, 0, 0); return c;
}
export { bakeTheatre };
