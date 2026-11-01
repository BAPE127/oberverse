// TARGET ART (mock-up only). A hill-shaded battle map: a real height field lit from the upper left, posterised so it still reads as pixel art.
// The war update would build the same field from the atlas province (relief + biome) and cache it once per battle.
import { INK, hash, hexRgb, rgbHex, mix, shade, fbm, vnoise, mk, clamp, rng, R, ell, poly, blob } from './d_util.js';

export const K = { GRASS: 0, ROAD: 1, WALK: 2, WATER: 3, FIELD: 4, DIRT: 5, CLIFF: 6, SHORE: 7, MUD: 8, PAVED: 9 };

const dseg = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay; const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)); const cx = ax + vx * t - px, cy = ay + vy * t - py; return Math.hypot(cx, cy); };
const dpoly = (px, py, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, dseg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };

/**
 * spec: { W, H, seed, river: [[x,y]...], riverW, roads: [{pts, w}], hills: [{x,y,r,h}], fields: [{x,y,w,h,crop}], dirt: [{x,y,w,h}], paved: [{x,y,w,h}], mud: [{x,y,r}] }
 * returns { canvas, heightAt, kindAt, fieldRows }
 */
export function paintTerrain(spec) {
  const { W, H, seed = 3 } = spec; const [cv, g] = mk(W, H); const img = g.createImageData(W, H); const D = img.data;
  const GW = W >> 1, GH = H >> 1; const ht = new Float32Array(GW * GH); const kind = new Uint8Array(GW * GH);
  const riverX = (y) => spec.river ? null : null;
  const roads = spec.roads || [], hills = spec.hills || [];
  // ---- height field (0..1): low rolling noise + hills + a sunken river valley
  const heightRaw = (x, y) => { let h = 0.16 + 0.3 * fbm(x / 420, y / 420, seed, 3); for (const hl of hills) { const d = Math.hypot(x - hl.x, (y - hl.y) * (hl.sy || 1)) / hl.r; if (d < 1.6) { let k = Math.exp(-d * d * 2.1); if (hl.mesa) { const t = clamp((1.05 - d) / 0.5); k = t * t * (3 - 2 * t); } h += hl.h * k * (0.8 + 0.2 * fbm(x / 110, y / 110, seed + 9, 3)); } } return h; };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) ht[j * GW + i] = heightRaw(i * 2, j * 2);
  const hAt = (x, y) => ht[clamp((y >> 1), 0, GH - 1) * GW + clamp((x >> 1), 0, GW - 1)];
  // lights: a sun from the upper left
  const L = [-0.52, -0.62, 0.59]; const LN = Math.hypot(...L); L[0] /= LN; L[1] /= LN; L[2] /= LN;
  const PAL = { lush: '#4e8a3a', mid: '#6b9a45', dry: '#9da44d', hill: '#7f9a4a', dirt: '#8c6c44', mud: '#5d4731', rock: '#8c867a', rock2: '#6c675f', asph: '#3b3c46', walk: '#aaa79d', paved: '#8e8b84' };
  const P = {}; for (const k in PAL) P[k] = hexRgb(PAL[k]);
  const fieldAt = (x, y) => { for (const f of spec.fields || []) if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) return f; return null; };
  const inRect = (arr, x, y) => { for (const f of arr || []) if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) return f; return null; };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i * 2, y = j * 2; const h = ht[j * GW + i];
    // slope from the height field
    const hx = (hAt(x + 6, y) - hAt(x - 6, y)) / 12, hy = (hAt(x, y + 6) - hAt(x, y - 6)) / 12; const K_ = 150; let nx = -hx * K_, ny = -hy * K_, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const dot = clamp(nx * L[0] + ny * L[1] + nz * L[2], 0, 1); const slope = Math.hypot(hx, hy);
    // surface class
    let k = K.GRASS; const rdist = spec.river ? dpoly(x, y, spec.river) : 1e9; const rw = (spec.riverW || 160) / 2;
    let col; const moist = fbm(x / 340, y / 340, seed + 4, 3); const patch = fbm(x / 70, y / 70, seed + 7, 3);
    // roads, kerbs, pavements
    let rd = 1e9, wd = 1e9; for (const r of roads) { const d = dpoly(x, y, r.pts); if (d < rd) { rd = d; wd = r.w / 2; } }
    const roadHalf = wd; const paveBand = 34;
    if (rdist < rw) k = rdist > rw - 14 ? K.SHORE : K.WATER;
    else if (rd < roadHalf) k = K.ROAD;
    else if (rd < roadHalf + paveBand && rdist > rw + 6) k = K.WALK;
    else if (inRect(spec.paved, x, y)) k = K.PAVED;
    else if (fieldAt(x, y)) k = K.FIELD;
    else if (inRect(spec.dirt, x, y)) k = K.DIRT;
    else if (slope > 0.0042 && h > 0.5) k = K.CLIFF;
    for (const m of spec.mud || []) if (Math.hypot(x - m.x, y - m.y) < m.r * (0.75 + 0.5 * vnoise(x / 40, y / 40, 5)) && k === K.GRASS) k = K.MUD;
    kind[j * GW + i] = k;
    let c;
    const grain = (hash(i, j, seed) - 0.5) * 12;
    if (k === K.GRASS) {
      const t = clamp(moist * 1.7 - 0.35); c = P.lush.map((v, n) => v + (P.mid[n] - v) * t); const dr = clamp((patch - 0.55) * 3.2 + (h - 0.35) * 0.9); c = c.map((v, n) => v + (P.dry[n] - v) * dr * 0.7);
      const hl = clamp((h - 0.3) * 1.8); c = c.map((v, n) => v + (P.hill[n] - v) * hl * 0.5);
      // scattered dirt freckles and clover patches
      const fr = hash(i >> 1, j >> 1, seed + 3); if (fr > 0.965) c = c.map((v, n) => v + (P.dirt[n] - v) * 0.55);
    } else if (k === K.ROAD) { c = P.asph.slice(); const wear = fbm(x / 28, y / 28, seed + 11, 2); const tl = Math.abs(((spec.laneOf ? spec.laneOf(x, y) : 0)) % 1); c = c.map((v) => v + (wear - 0.5) * 22); }
    else if (k === K.WALK) { c = P.walk.slice(); const gx = (x % 38) < 2, gy = (y % 38) < 2; if (gx || gy) c = c.map((v) => v - 26); c = c.map((v) => v + (hash(i, j, 8) - 0.5) * 9 + (fbm(x / 60, y / 60, seed + 2, 2) - 0.5) * 18); }
    else if (k === K.PAVED) { c = P.paved.slice(); const gx = (x % 22) < 2, gy = (y % 22) < 2; if (gx || gy) c = c.map((v) => v - 22); c = c.map((v) => v + (hash(i, j, 9) - 0.5) * 10 + (fbm(x / 50, y / 50, seed + 5, 2) - 0.5) * 16); }
    else if (k === K.DIRT) { c = P.dirt.slice(); c = c.map((v) => v + (fbm(x / 36, y / 36, seed + 6, 3) - 0.5) * 38); }
    else if (k === K.MUD) { c = P.mud.slice(); c = c.map((v) => v + (fbm(x / 22, y / 22, seed + 8, 3) - 0.5) * 34); }
    else if (k === K.FIELD) { const f = fieldAt(x, y); const row = Math.floor((f.vert ? x - f.x : y - f.y) / 15); const ph = ((f.vert ? x - f.x : y - f.y) % 15) / 15; const base = hexRgb(f.crop === 'wheat' ? '#caa94c' : f.crop === 'green' ? '#6ea43c' : '#7a5a38'); c = base.map((v) => v + (ph < 0.3 ? -34 : ph > 0.75 ? 16 : 0) + (hash(row, 3, seed) - 0.5) * 16 + (fbm(x / 40, y / 40, seed, 2) - 0.5) * 30); const ed = Math.min(x - f.x, f.x + f.w - x, y - f.y, f.y + f.h - y); if (ed < 10) c = c.map((v, n) => v * 0.8 + P.lush[n] * 0.2); }
    else if (k === K.CLIFF) { const str = Math.sin(y * 0.16 + fbm(x / 24, y / 24, seed, 2) * 7); c = (str > 0.5 ? P.rock : P.rock2).map((v) => v + (hash(i, j, 4) - 0.5) * 16); }
    else if (k === K.WATER || k === K.SHORE) {
      const dep = clamp(1 - (rw - rdist) / 70, 0, 1); const deep = hexRgb('#235a86'), shal = hexRgb('#4aa0c4'); c = deep.map((v, n) => v + (shal[n] - v) * (k === K.SHORE ? 0.9 : dep * 0.85));
      const rip = Math.sin(x * 0.05 + vnoise(x / 40, y / 40, seed) * 9 + y * 0.03) * 0.5 + 0.5; c = c.map((v) => v + (rip - 0.5) * 22); if (hash(i, j, 13) > 0.992) c = [235, 245, 255];
      if (k === K.SHORE) c = c.map((v, n) => v * 0.7 + [200, 230, 240][n] * 0.3);
    }
    if (k !== K.WATER && k !== K.SHORE) {
      // hill-shading, posterised into soft bands
      const flat = k === K.ROAD || k === K.WALK || k === K.PAVED || k === K.FIELD; const dE = flat ? 0.8 + (dot - 0.8) * 0.2 : dot; const band = Math.round(dE * 7) / 7; const f = 0.5 + 0.8 * (band * 0.6 + dE * 0.4); c = c.map((v) => v * f * 1.05 + grain * 0.5);
      // cast shadow: march towards the sun; if ground rises above the sun ray, we are in shadow
      let sh = 0; for (let m = 1; m <= 16; m++) { const d = m * 14; const hs = hAt(Math.round(x - L[0] / Math.hypot(L[0], L[1]) * -d), Math.round(y - L[1] / Math.hypot(L[0], L[1]) * -d)); if ((hs - h) * 220 > d * 0.8) { sh = 1; break; } }
      if (sh && !flat) c = [c[0] * 0.62, c[1] * 0.68, c[2] * 0.86];
      if (k !== K.ROAD && k !== K.WALK && k !== K.PAVED) { const hi = clamp((h - 0.32) * 0.9); c = c.map((v) => v + hi * 18); }
    } else c = c.map((v) => v + grain * 0.4);
    // 2x2 blocks
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o = ((y + dy) * W + x + dx) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  const kindAt = (x, y) => kind[clamp(y >> 1, 0, GH - 1) * GW + clamp(x >> 1, 0, GW - 1)];
  const heightAt = (x, y) => hAt(Math.round(x), Math.round(y));
  // ---- ground clutter: tufts, stones, flowers
  const r = rng(seed * 31 + 5);
  for (let n = 0; n < 26000; n++) { const x = r() * W, y = r() * H; if (kindAt(x, y) !== K.GRASS) continue; const t = r(); const hh = 3 + r() * 6; const sh = heightAt(x, y); g.fillStyle = t < 0.5 ? 'rgba(30,70,30,.55)' : t < 0.85 ? 'rgba(170,200,90,.5)' : 'rgba(210,200,110,.5)'; g.fillRect(x, y - hh, 1.6, hh); if (t > 0.5) g.fillRect(x + 2, y - hh * 0.7, 1.6, hh * 0.7); if (sh > 0) { } }
  for (let n = 0; n < 1400; n++) { const x = r() * W, y = r() * H; const k = kindAt(x, y); if (k !== K.GRASS && k !== K.DIRT) continue; const s = 2 + r() * 5; g.fillStyle = 'rgba(10,10,20,.35)'; g.fillRect(x + 1, y + 1, s, s * 0.6); g.fillStyle = '#9a968c'; g.fillRect(x, y, s, s * 0.7); g.fillStyle = '#c9c5b8'; g.fillRect(x, y, s * 0.5, 1.4); }
  for (let n = 0; n < 900; n++) { const x = r() * W, y = r() * H; if (kindAt(x, y) !== K.GRASS) continue; g.fillStyle = ['#f2e86a', '#f4f0e8', '#e87aa0', '#8ab4ff'][Math.floor(r() * 4)]; g.fillRect(x, y, 2, 2); }
  // ---- river banks: reeds and a shaded far bank
  if (spec.river) for (let n = 0; n < 700; n++) { const x = r() * W, y = r() * H; const dd = dpoly(x, y, spec.river); const rw = (spec.riverW || 160) / 2; if (Math.abs(dd - rw) > 14 || (kindAt(x, y) !== K.GRASS && kindAt(x, y) !== K.SHORE)) continue; g.fillStyle = '#3a6a30'; g.fillRect(x, y - 12, 2, 12); g.fillStyle = '#9a7a46'; g.fillRect(x - 1, y - 16, 4, 6); }
  return { canvas: cv, heightAt, kindAt, W, H };
}

/** road furniture painted over the asphalt: lane lines, edge lines, crossings, manholes, cracks, patches, skid marks, puddles */
export function paintRoads(g, spec, T) {
  const r = rng(77);
  const dash = (x1, y1, x2, y2, col, w, on, off) => { g.save(); g.strokeStyle = col; g.lineWidth = w; g.setLineDash([on, off]); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore(); };
  for (const rd of spec.roads) {
    const p = rd.pts; for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i], [bx, by] = p[i + 1]; const dx = bx - ax, dy = by - ay; const len = Math.hypot(dx, dy); const nx = -dy / len, ny = dx / len; const half = rd.w / 2;
      // kerb: a bright lip and a dark drop on both sides, so the road sits below the pavement
      for (const s of [-1, 1]) { g.strokeStyle = 'rgba(235,232,220,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax + nx * (half + 1) * s, ay + ny * (half + 1) * s); g.lineTo(bx + nx * (half + 1) * s, by + ny * (half + 1) * s); g.stroke(); g.strokeStyle = 'rgba(8,8,20,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax + nx * (half - 2) * s, ay + ny * (half - 2) * s + 2); g.lineTo(bx + nx * (half - 2) * s, by + ny * (half - 2) * s + 2); g.stroke(); }
      if (!rd.nomark) { dash(ax, ay, bx, by, '#e6c53c', 4, 34, 26); for (const s of [-1, 1]) dash(ax + nx * (half - 14) * s, ay + ny * (half - 14) * s, bx + nx * (half - 14) * s, by + ny * (half - 14) * s, 'rgba(240,240,235,.8)', 3, 1000, 0); }
      // damage: cracks, patches, skid marks, oil
      for (let n = 0; n < len / 90; n++) { const t = r(); const x = ax + dx * t + nx * (r() - 0.5) * (rd.w - 30), y = ay + dy * t + ny * (r() - 0.5) * (rd.w - 30); g.strokeStyle = 'rgba(10,10,18,.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); let cx = x, cy = y; for (let k = 0; k < 5; k++) { cx += (r() - 0.4) * 14; cy += (r() - 0.5) * 12; g.lineTo(cx, cy); } g.stroke(); }
      for (let n = 0; n < len / 260; n++) { const t = r(); const x = ax + dx * t + nx * (r() - 0.5) * (rd.w - 40), y = ay + dy * t + ny * (r() - 0.5) * (rd.w - 40); g.fillStyle = 'rgba(70,72,84,.5)'; g.fillRect(x, y, 30 + r() * 40, 16 + r() * 20); }
      for (let n = 0; n < len / 300; n++) { const t = r(); const x = ax + dx * t + nx * (r() - 0.5) * (rd.w - 50), y = ay + dy * t + ny * (r() - 0.5) * (rd.w - 50); g.fillStyle = 'rgba(8,8,16,.22)'; g.beginPath(); g.ellipse(x, y, 16 + r() * 20, 6 + r() * 6, Math.atan2(dy, dx), 0, 7); g.fill(); }
      for (let n = 0; n < len / 420; n++) { const t = r(); const x = ax + dx * t + nx * (r() - 0.5) * (rd.w - 60), y = ay + dy * t + ny * (r() - 0.5) * (rd.w - 60); g.strokeStyle = 'rgba(8,8,16,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx / len * 120, y + dy / len * 120 + 6); g.stroke(); g.beginPath(); g.moveTo(x + nx * 12, y + ny * 12); g.lineTo(x + nx * 12 + dx / len * 120, y + ny * 12 + dy / len * 120 + 6); g.stroke(); }
      for (let n = 0; n < len / 560; n++) { const t = r(); const x = ax + dx * t + nx * (r() - 0.5) * (rd.w - 60), y = ay + dy * t + ny * (r() - 0.5) * (rd.w - 60); const w = 30 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(110,150,190,.55)'); gr.addColorStop(0.8, 'rgba(70,100,140,.35)'); gr.addColorStop(1, 'rgba(70,100,140,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w, w * 0.4, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - w * 0.4, y - 3, w * 0.5, 1.5); }
    }
  }
  // manholes and drains
  for (let n = 0; n < 16; n++) { const rd = spec.roads[n % spec.roads.length]; const t = r(), i = Math.min(rd.pts.length - 2, Math.floor(r() * (rd.pts.length - 1))); const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1]; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t + (r() - 0.5) * (rd.w - 60); g.fillStyle = INK; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.fillStyle = '#5a5a62'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.strokeStyle = '#3a3a42'; g.lineWidth = 1; for (let k = -6; k <= 6; k += 4) { g.beginPath(); g.moveTo(x - 7, y + k); g.lineTo(x + 7, y + k); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - 6, y - 7, 5, 2); }
}

/** a zebra crossing across a road at (x,y); vertical=true crosses a N-S road */
export function crossing(g, x, y, len, vertical) { g.save(); g.fillStyle = 'rgba(240,238,228,.85)'; for (let i = -len / 2; i < len / 2; i += 18) { if (vertical) g.fillRect(x - 40, y + i, 80, 9); else g.fillRect(x + i, y - 40, 9, 80); } g.restore(); }

/** a stone bridge over the river: deck, parapets, piers and shadows on the water */
export function bridge(g, x, y, w, h) {
  g.fillStyle = 'rgba(6,14,30,.45)'; g.fillRect(x + 8, y + h, w, 22); g.fillRect(x + 14, y + h + 10, w - 8, 14);
  g.fillStyle = INK; g.fillRect(x - 3, y - 3, w + 6, h + 6); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3b3c46'); gr.addColorStop(1, '#30313a'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = '#e6c53c'; for (let i = 0; i < w; i += 60) g.fillRect(x + i + 8, y + h / 2 - 2, 34, 4);
  for (const yy of [y - 12, y + h]) { g.fillStyle = INK; g.fillRect(x - 6, yy - 1, w + 12, 16); g.fillStyle = '#b4b0a4'; g.fillRect(x - 5, yy, w + 10, 13); g.fillStyle = '#d8d4c6'; g.fillRect(x - 5, yy, w + 10, 4); g.fillStyle = '#8c8a80'; g.fillRect(x - 5, yy + 9, w + 10, 4); for (let i = 0; i < w + 10; i += 36) { g.fillStyle = '#6a685e'; g.fillRect(x - 5 + i, yy, 2, 13); } }
  for (const px of [x - 4, x + w - 8]) { g.fillStyle = INK; g.fillRect(px - 2, y - 18, 16, 26); g.fillStyle = '#c7c3b6'; g.fillRect(px, y - 16, 12, 6); g.fillStyle = '#9d9a8d'; g.fillRect(px, y - 10, 12, 16); }
}
