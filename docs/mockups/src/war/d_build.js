// TARGET ART (mock-up only). Buildings drawn in an oblique 2.5D projection: the roof is lifted up and to the left, so the south and east walls show as
// real faces (windows, doors, bricks) while the map stays a flat 2D grid. Cast shadows fall to the south-east (sun in the north-west).
// States: 0 intact, 1 damaged, 2 breached (wall opened, roof partly gone), 3 rubble. A "cut" building has its roof removed to show the rooms inside.
import { INK, hash, shade, mix, rgba, mk, rng, clamp, R, poly, blob } from './d_util.js';

const hull = (pts) => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } const up = []; for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } up.pop(); lo.pop(); return lo.concat(up); };

export const PRESET = {
  house: { h: 118, rise: 46, roofKind: 'gable', wallTex: 'plaster', win: [34, 44], gap: 84 },
  row: { h: 124, rise: 40, roofKind: 'gable', wallTex: 'brick', win: [30, 46], gap: 70 },
  shop: { h: 108, rise: 0, roofKind: 'flat', wallTex: 'plaster', win: [58, 52], gap: 100, awning: true },
  flats: { h: 180, rise: 0, roofKind: 'flat', wallTex: 'brick', win: [30, 40], gap: 62 },
  warehouse: { h: 100, rise: 0, roofKind: 'flatcorr', wallTex: 'metal', win: [40, 18], gap: 130 },
  factory: { h: 126, rise: 0, roofKind: 'saw', wallTex: 'brick', win: [44, 50], gap: 90 },
};

/** the ground-plane to screen offset of a point lifted by height v */
const proj = (b) => ({ ox: -0.3 * b.h, oy: -0.86 * b.h });

function wallTexture(g, b, which, W, Hh, base, tex, seed) {
  // draws into the (u, v) space of a wall: u across (0..W), v up (0..Hh)
  const r = rng(seed);
  R(g, 0, 0, W, Hh, base);
  if (tex === 'brick') {
    for (let v = 0; v < Hh; v += 7) { R(g, 0, v, W, 1, shade(base, -34)); for (let u = ((v / 7) % 2) * 9; u < W; u += 18) R(g, u, v, 1, 7, shade(base, -26)); }
    for (let n = 0; n < W * Hh / 60; n++) { const u = r() * W, v = r() * Hh; R(g, u, v, 17, 6, rgba(r() > 0.5 ? '#ffffff' : '#000000', 0.07)); }
  } else if (tex === 'metal') {
    for (let u = 0; u < W; u += 9) { R(g, u, 0, 1, Hh, shade(base, -22)); R(g, u + 1, 0, 1, Hh, shade(base, 16)); }
    for (let n = 0; n < 40; n++) R(g, r() * W, r() * Hh, 3, 14 + r() * 30, rgba('#6a3a1a', 0.25));
  } else {
    for (let n = 0; n < W * Hh / 14; n++) R(g, r() * W, r() * Hh, 2 + r() * 3, 1 + r() * 3, rgba(r() > 0.5 ? '#ffffff' : '#000000', 0.06));
    for (let u = 0; u < W; u += 38) { const gr = g.createLinearGradient(0, Hh, 0, 0); gr.addColorStop(0, 'rgba(60,40,20,.22)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(u + r() * 20, 0, 3 + r() * 6, Hh * (0.3 + r() * 0.5)); }
  }
  // plinth and top shade
  R(g, 0, 0, W, 9, shade(base, -46)); R(g, 0, 9, W, 1, shade(base, 14)); const gt = g.createLinearGradient(0, 0, 0, Hh); gt.addColorStop(0, 'rgba(0,0,0,.24)'); gt.addColorStop(0.35, 'rgba(0,0,0,0)'); gt.addColorStop(1, 'rgba(255,255,255,.1)'); g.fillStyle = gt; g.fillRect(0, 0, W, Hh);
  R(g, 0, Hh - 5, W, 5, shade(base, -18)); R(g, 0, Hh - 5, W, 1, shade(base, 24)); // cornice and eaves shadow
}
function windowAt(g, u, v, ww, wh, o, seed) {
  const s = hash(seed, u, v);
  R(g, u - 3, v - 3, ww + 6, wh + 6, o.trim); R(g, u - 3, v - 3, ww + 6, 2, shade(o.trim, 26)); R(g, u - 3, v + wh + 1, ww + 6, 2, shade(o.trim, -36)); // frame and sill
  const gl = g.createLinearGradient(u, v + wh, u + ww, v); gl.addColorStop(0, '#1a2a3e'); gl.addColorStop(0.5, '#4a6a8a'); gl.addColorStop(1, '#8aaac4'); g.fillStyle = gl; g.fillRect(u, v, ww, wh);
  if (o.broken && s > 0.35) { R(g, u, v, ww, wh, '#0c0c14'); g.strokeStyle = '#d8d8e0'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(u + s * ww, v + wh * 0.5); g.lineTo(u + (k / 3) * ww, v + (k % 2) * wh); g.stroke(); } return; }
  if (s > 0.62) { R(g, u, v + wh * 0.45, ww, wh * 0.55, rgba(['#c85a4a', '#e8d8a0', '#6a8ac8'][Math.floor(s * 9) % 3], 0.65)); } // curtains
  g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(u + ww * 0.1, v); g.lineTo(u + ww * 0.45, v); g.lineTo(u + ww * 0.1, v + wh * 0.55); g.fill(); // sky glint
  R(g, u + ww / 2 - 1, v, 2, wh, o.trim); R(g, u, v + wh / 2 - 1, ww, 2, o.trim); // mullions
  if (o.shutters) { R(g, u - 3 - ww * 0.32, v - 3, ww * 0.3, wh + 6, shade(o.trim, -30)); R(g, u + ww + 3, v - 3, ww * 0.3, wh + 6, shade(o.trim, -30)); for (let k = 0; k < wh; k += 4) { R(g, u - 3 - ww * 0.32, v + k, ww * 0.3, 1, shade(o.trim, -60)); R(g, u + ww + 3, v + k, ww * 0.3, 1, shade(o.trim, -60)); } }
}
function door(g, u, v, w, h, o) {
  R(g, u - 4, 0, w + 8, h + 5, shade(o.trim, -10)); R(g, u, 0, w, h, '#4a3022'); for (let k = 0; k < w; k += 8) R(g, u + k, 0, 1, h, '#32201a');
  R(g, u + 5, h * 0.55, w - 10, h * 0.32, '#58708c'); R(g, u + w - 8, h * 0.4, 3, 3, '#d8b84a'); R(g, u - 7, 0, w + 14, 5, '#8c887c'); R(g, u - 3, -2, w + 6, 3, '#6c685e');
}

/** the wall damage overlay: soot, exposed brick, pocks, cracks */
function wallDamage(g, W, Hh, seed, amount) {
  const r = rng(seed + 90);
  for (let n = 0; n < 4 * amount; n++) { const u = r() * W, v = Hh * (0.3 + r() * 0.5); const gr = g.createRadialGradient(u, v, 0, u, v, 40 + r() * 40); gr.addColorStop(0, 'rgba(8,6,10,.62)'); gr.addColorStop(1, 'rgba(8,6,10,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(u, v, 30 + r() * 40, 36 + r() * 40, 0, 0, 7); g.fill(); }
  for (let n = 0; n < 3 * amount; n++) { const u = r() * (W - 40), v = r() * (Hh - 40) + 10; const w = 22 + r() * 36, h = 14 + r() * 24; R(g, u, v, w, h, '#8a4a3a'); for (let y = 0; y < h; y += 6) { R(g, u, v + y, w, 1, '#5a2a22'); for (let x = (y / 6 % 2) * 6; x < w; x += 12) R(g, u + x, v + y, 1, 6, '#5a2a22'); } g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(u, v, w, h); }
  for (let n = 0; n < 26 * amount; n++) { const u = r() * W, v = 8 + r() * (Hh - 14); R(g, u, v, 3, 3, '#1a1612'); R(g, u - 2, v - 1, 2, 1, '#d8cfc0'); R(g, u + 3, v + 2, 2, 1, '#d8cfc0'); }
  g.strokeStyle = 'rgba(12,10,12,.7)'; g.lineWidth = 1.5; for (let n = 0; n < 2 * amount; n++) { let u = r() * W, v = Hh * 0.9; g.beginPath(); g.moveTo(u, v); for (let k = 0; k < 8; k++) { u += (r() - 0.5) * 14; v -= 7 + r() * 5; g.lineTo(u, v); } g.stroke(); }
}

/** a blasted/rammed hole: jagged polygon (in wall u,v space) */
function holePoly(r, u, w, v0, v1, kind) {
  const pts = []; const n = 9; for (let i = 0; i <= n; i++) pts.push([u + (i / n) * w + (r() - 0.5) * 8, v1 + (r() - 0.3) * (kind === 'ram' ? 4 : 14) - (i > 1 && i < n - 1 ? 0 : 20)]);
  for (let i = n; i >= 0; i--) pts.push([u + (i / n) * w + (r() - 0.5) * 8, v0 + (r() - 0.2) * 6]);
  return pts;
}
function interiorView(g, u, w, v0, v1, seed) {
  const r = rng(seed); const gr = g.createLinearGradient(0, v0, 0, v1); gr.addColorStop(0, '#2b2018'); gr.addColorStop(1, '#0c0a10'); g.fillStyle = gr; g.fillRect(u - 6, v0 - 4, w + 12, v1 - v0 + 30);
  const lg = g.createRadialGradient(u + w / 2, v0 + 8, 4, u + w / 2, v0 + 8, w * 0.7); lg.addColorStop(0, 'rgba(255,200,120,.38)'); lg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = lg; g.fillRect(u - 6, v0 - 4, w + 12, v1 - v0 + 30);
  for (let k = 0; k < 6; k++) R(g, u - 6, v0 + k * 3, w + 12, 1, 'rgba(120,80,40,.5)'); // floorboards in perspective
  R(g, u + w * 0.12, v0 + 4, w * 0.3, 24, '#3a2a20'); R(g, u + w * 0.55, v0 + 4, w * 0.22, 36, '#2a2220'); R(g, u + w * 0.14, v0 + 26, w * 0.26, 3, '#5a4030'); // table and wardrobe silhouettes
  g.strokeStyle = '#5a3a24'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(u + r() * w, v1 + 6); g.lineTo(u + r() * w, v1 - 22 - r() * 20); g.stroke(); } // hanging beams
}
function rubblePile(g, cx, cy, rw, rh, seed, col1 = '#8a4a3a', col2 = '#b0a898') {
  const r = rng(seed); blob(g, cx + 6, cy + 6, rw * 0.9, rh * 0.9, 0.35);
  g.fillStyle = INK; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, 7); g.fill(); g.fillStyle = '#4a4036'; g.beginPath(); g.ellipse(cx, cy - 1, rw - 2, rh - 2, 0, 0, 7); g.fill();
  for (let n = 0; n < rw * rh / 14; n++) { const a = r() * 6.28, d = Math.sqrt(r()); const x = cx + Math.cos(a) * d * (rw - 4), y = cy + Math.sin(a) * d * (rh - 4); const w = 4 + r() * 11, h = 3 + r() * 6; const c = [col1, col2, '#6a5a4a', '#3a342e', '#c8b89a'][Math.floor(r() * 5)]; R(g, x, y, w, h, INK); R(g, x + 1, y + 1, w - 2, h - 2, c); R(g, x + 1, y + 1, w - 2, 1, shade(c, 36)); }
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 3; for (let n = 0; n < 6; n++) { const x = cx + (r() - 0.5) * rw * 1.4, y = cy + (r() - 0.5) * rh * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 14); g.stroke(); }
}

export function buildingAnchors(b) { b = { h: PRESET[b.kind || 'house'].h, ...b }; const { ox, oy } = proj(b); return { roofC: [b.x + b.w / 2 + ox, b.y + b.d / 2 + oy], base: [b.x + b.w / 2, b.y + b.d], south: (u, v = 0) => [b.x + u + ox * (v / b.h), b.y + b.d + oy * (v / b.h)], east: (u, v = 0) => [b.x + b.w + ox * (v / b.h), b.y + b.d - u + oy * (v / b.h)] }; }

export function drawBuilding(g, b) {
  const P = PRESET[b.kind || 'house']; b = { h: P.h, state: 0, ...b }; const { ox, oy } = proj(b); const x = b.x, y = b.y, w = b.w, d = b.d, h = b.h;
  const wallBase = b.wall || '#d6c9ae', roofBase = b.roof || '#9a4a3a', trim = b.trim || '#f0ece0'; const seed = b.seed || 1; const st = b.state;
  const tex = b.tex || P.wallTex; const rise = P.rise;
  // ---- cast shadow on the ground (long, soft, to the south-east)
  if (b.shadow !== false) { const sx = 0.62 * (h + rise), sy = 0.5 * (h + rise); const base = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]; const pts = hull(base.concat(base.map(([a, c]) => [a + sx, c + sy]))); g.save(); g.filter = 'blur(5px)'; poly(g, pts, 'rgba(8,10,28,.36)'); g.restore(); poly(g, hull(base.concat(base.map(([a, c]) => [a + sx * 0.5, c + sy * 0.5]))), 'rgba(8,10,28,.22)'); }
  if (st === 3) { // rubble: foundation, heaps, a broken wall stub
    g.fillStyle = '#5a5248'; g.fillRect(x - 2, y - 2, w + 4, d + 4); g.fillStyle = '#3e372f'; g.fillRect(x + 6, y + 6, w - 12, d - 12);
    rubblePile(g, x + w * 0.5, y + d * 0.55, w * 0.46, d * 0.4, seed, '#8a4a3a', '#b8ae9c'); rubblePile(g, x + w * 0.24, y + d * 0.72, w * 0.2, d * 0.22, seed + 3); rubblePile(g, x + w * 0.8, y + d * 0.42, w * 0.18, d * 0.2, seed + 5, '#9a5a4a');
    // stub of the south wall with a chimney still standing
    const sh = 26; R(g, x - 1, y + d - sh, w * 0.3, sh, INK); R(g, x, y + d - sh + 1, w * 0.3 - 2, sh - 2, shade(wallBase, -30)); R(g, x, y + d - sh + 1, w * 0.3 - 2, 4, shade(wallBase, 14)); if (P.rise) { R(g, x + w * 0.74, y + d * 0.1 - 46, 26, 70, INK); R(g, x + w * 0.74 + 1, y + d * 0.1 - 45, 24, 68, '#7a4034'); for (let k = 0; k < 68; k += 6) R(g, x + w * 0.74 + 1, y + d * 0.1 - 45 + k, 24, 1, '#4a2420'); R(g, x + w * 0.74 + 1, y + d * 0.1 - 45, 7, 68, 'rgba(255,255,255,.14)'); }
    return;
  }
  const Wv = (u0, v0) => [x + u0 + ox * (v0 / h), y + d + oy * (v0 / h)];
  // ---- east wall face (darkest), then south wall face
  g.save(); g.transform(0, -1, ox / h, oy / h, x + w, y + d);
  g.beginPath(); g.rect(0, 0, d, h); g.clip(); wallTexture(g, b, 'E', d, h, shade(wallBase, -44), tex, seed + 11);
  for (let u = P.gap * 0.5 + 10; u < d - P.win[0]; u += P.gap) for (let v = 30; v + P.win[1] < h - 14; v += (P.gap * 0.95)) windowAt(g, u, v, P.win[0], P.win[1], { trim: shade(trim, -52), broken: st >= 1 && hash(seed, u, v) > 0.6, shutters: b.kind === 'house' }, seed);
  if (st >= 1) wallDamage(g, d, h, seed + 5, st); g.fillStyle = 'rgba(8,10,40,.22)'; g.fillRect(0, 0, d, h);
  g.restore();
  const doorU = b.doorU ?? (w * 0.5 - 18);
  g.save(); g.transform(1, 0, ox / h, oy / h, x, y + d);
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  wallTexture(g, b, 'S', w, h, shade(wallBase, -16), tex, seed);
  for (let u = 14; u < w - P.win[0] - 8; u += P.gap) for (let v = 34; v + P.win[1] < h - 14; v += P.gap * 0.95) { if (v < 40 && Math.abs(u + P.win[0] / 2 - doorU - 18) < P.win[0]) continue; windowAt(g, u, v, P.win[0], P.win[1], { trim, broken: st >= 1 && hash(seed, u, v + 3) > 0.55, shutters: b.kind === 'house' }, seed); }
  if (b.kind === 'shop') { R(g, 10, 12, w - 20, 62, '#2a3a4e'); const gl = g.createLinearGradient(10, 12, w, 74); gl.addColorStop(0, '#2c4258'); gl.addColorStop(0.5, '#6a8aa4'); gl.addColorStop(1, '#2c4258'); g.fillStyle = gl; g.fillRect(14, 16, w - 28, 54); for (let k = 40; k < w - 40; k += 54) R(g, k, 16, 3, 54, trim); }
  door(g, doorU, 0, 36, b.kind === 'shop' || b.kind === 'warehouse' ? 56 : 54, { trim });
  if (P.awning) { for (let k = 0; k < w - 20; k += 22) { R(g, 10 + k, h - 36, 22, 22, (k / 22) % 2 ? '#e8e0d0' : (b.awning || '#b8483a')); } R(g, 10, h - 38, w - 20, 3, '#00000044'); }
  if (b.sign) { R(g, w / 2 - 70, h - 30, 140, 22, INK); R(g, w / 2 - 68, h - 28, 136, 18, b.signCol || '#2a5a8a'); g.fillStyle = '#fff'; g.font = '800 13px system-ui'; g.textAlign = 'center'; g.save(); g.scale(1, -1); g.fillText(b.sign, w / 2, -(h - 14)); g.restore(); g.textAlign = 'left'; }
  if (st >= 1) wallDamage(g, w, h, seed, st + (b.burning ? 1 : 0));
  // ---- breach holes through the south wall
  const r = rng(seed + 3);
  for (const br of b.breach || []) { const hp = holePoly(r, br.u, br.w, br.v0 ?? 0, br.v1 ?? (br.kind === 'ram' ? 56 : 62), br.kind); g.save(); g.beginPath(); hp.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v))); g.closePath(); g.clip(); interiorView(g, br.u, br.w, br.v0 ?? 0, br.v1 ?? 60, seed); g.restore(); g.beginPath(); hp.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v))); g.closePath(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.strokeStyle = '#d8c8a8'; g.lineWidth = 1.5; g.stroke(); for (let k = 0; k < 14; k++) { const [u, v] = hp[Math.floor(r() * hp.length)]; R(g, u - 4, v - 3, 8 + r() * 6, 5, r() > 0.5 ? '#8a4a3a' : '#c8b898'); } if (br.kind === 'blast') { const sg = g.createRadialGradient(br.u + br.w / 2, (br.v1 ?? 62) * 0.5, 4, br.u + br.w / 2, (br.v1 ?? 62) * 0.5, br.w * 0.9); sg.addColorStop(0, 'rgba(0,0,0,.0)'); sg.addColorStop(1, 'rgba(8,6,6,.55)'); g.fillStyle = sg; g.fillRect(br.u - br.w, 0, br.w * 3, h); } }
  g.fillStyle = 'rgba(8,10,40,.12)'; g.fillRect(0, 0, w, h);
  g.restore();
  // rubble at the foot of each breach
  for (const br of b.breach || []) { const [cx, cy] = Wv(br.u + br.w / 2, 0); rubblePile(g, cx, cy + 12, br.w * 0.62, 20, seed + Math.round(br.u), '#8a4a3a', '#c0b6a4'); }
  // wall outlines
  g.strokeStyle = INK; g.lineWidth = 2; poly(g, [[x, y + d], [x + w, y + d], [x + w + ox, y + d + oy], [x + ox, y + d + oy]], null, INK, 2); poly(g, [[x + w, y + d], [x + w, y], [x + w + ox, y + oy], [x + w + ox, y + d + oy]], null, INK, 2);
  // ---- roof
  const A = [x + ox, y + oy], B = [x + w + ox, y + oy], C = [x + w + ox, y + d + oy], D = [x + ox, y + d + oy];
  const roofC = b.roofShade ? b.roofShade : roofBase;
  const tiles = (poly_, base, rowH, light) => { g.save(); g.beginPath(); poly_.forEach(([a, c], i) => (i ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); g.clip(); const xs = poly_.map((p) => p[0]), ys = poly_.map((p) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); R(g, x0, y0, x1 - x0, y1 - y0, base); const rr = rng(seed + Math.round(y0)); for (let yy = y0; yy < y1; yy += rowH) { R(g, x0, yy + rowH - 2, x1 - x0, 2, shade(base, -34)); R(g, x0, yy, x1 - x0, 1, shade(base, 18)); for (let xx = x0 + ((Math.round((yy - y0) / rowH) % 2) * 7); xx < x1; xx += 14) { R(g, xx, yy, 1, rowH - 2, shade(base, -22)); if (rr() > 0.82) R(g, xx + 1, yy + 1, 12, rowH - 3, rgba(rr() > 0.5 ? '#ffffff' : '#000000', 0.12)); } } if (light) { g.fillStyle = light; g.fillRect(x0, y0, x1 - x0, y1 - y0); } g.restore(); };
  const roofHole = (cx, cy, rr, o = {}) => { const r2 = rng(seed + 44); const pts = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283; const rad = rr * (0.7 + r2() * 0.5); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.62]); } g.save(); g.beginPath(); pts.forEach(([a, c], i) => (i ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); g.fillStyle = '#120c0a'; g.fill(); g.clip(); const gr = g.createRadialGradient(cx, cy, 2, cx, cy, rr); gr.addColorStop(0, o.fire ? 'rgba(255,150,40,.85)' : 'rgba(255,190,110,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - rr * 1.3, cy - rr, rr * 2.6, rr * 2); g.strokeStyle = '#5a3a22'; g.lineWidth = 4; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx - rr + k * 16, cy - rr * 0.7); g.lineTo(cx + rr + k * 16, cy + rr * 0.7); g.stroke(); } g.restore(); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); pts.forEach(([a, c], i) => (i ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); g.stroke(); g.strokeStyle = '#b89a6a'; g.lineWidth = 1; g.stroke(); };
  if (b.cut) { // roof removed: the rooms inside, with furniture
    g.save(); g.beginPath(); [A, B, [x + w, y], [x, y]].forEach(() => {}); g.restore();
    // north wall inner face and the floor
    poly(g, [[x, y], [x + w, y], B, A], shade(wallBase, -8)); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(A[0], A[1], w, y - A[1]); poly(g, [[x, y], [x + ox * 0 + 0, y + d], [x + w, y + d], [x + w, y]], '#8a6a46');
    g.save(); g.beginPath(); g.rect(x, y, w, d); g.clip(); for (let k = 0; k < d; k += 9) { R(g, x, y + k, w, 1, '#6a4c30'); } for (let k = 0; k < w; k += 70) R(g, x + k + ((k / 70) % 2) * 20, y, 1, d, '#6a4c30');
    const rooms = [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]; g.strokeStyle = INK; g.lineWidth = 5; for (const [a, c, ww, hh] of rooms) g.strokeRect(x + a * w + 2, y + c * d + 2, ww * w - 4, hh * d - 4);
    g.restore(); const fur = (fx, fy, fw, fh, col, ex = 12) => { blob(g, fx + fw / 2 + 6, fy + fh + 4, fw * 0.6, 7, 0.3); R(g, fx, fy - ex, fw, fh + ex, INK); R(g, fx + 1, fy - ex + 1, fw - 2, ex - 1, shade(col, 18)); R(g, fx + 1, fy + 1, fw - 2, fh - 2, col); R(g, fx + 1, fy + 1, 3, fh - 2, shade(col, 26)); };
    fur(x + w * 0.08, y + d * 0.14, 70, 32, '#6a4a3a'); fur(x + w * 0.1, y + d * 0.62, 90, 40, '#4a6a8a', 8); fur(x + w * 0.62, y + d * 0.1, 60, 70, '#7a5a8a', 6); fur(x + w * 0.64, y + d * 0.62, 50, 44, '#8a6a3a'); R(g, x + w * 0.28, y + d * 0.4, 64, 40, '#a84a3a'); R(g, x + w * 0.29, y + d * 0.42, 62, 36, '#c86a4a');
    // wall rims
    R(g, A[0] - 4, A[1] - 4, w + 8, 8, shade(wallBase, 20)); R(g, A[0] - 4, A[1] - 4, 8, d + 8, shade(wallBase, 6)); R(g, D[0] - 4, D[1] - 4, w + 8, 8, shade(wallBase, 12)); R(g, B[0] - 4, B[1] - 4, 8, d + 8, shade(wallBase, -10));
    for (const q of [A, B, C, D]) { /* corners */ }
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(A[0] - 4, A[1] - 4, w + 8, d + 8);
    return;
  }
  const lightN = 'rgba(255,240,200,.16)', darkS = 'rgba(10,14,50,.2)';
  if (P.roofKind === 'gable') {
    const kk = (h + rise) / h; const R1 = [x + ox * kk, y + d / 2 + oy * kk], R2 = [x + w + ox * kk, y + d / 2 + oy * kk];
    poly(g, [B, C, R2], shade(wallBase, -56), INK, 2);
    tiles([A, B, R2, R1], roofC, 9, lightN); tiles([D, C, R2, R1], roofC, 11, darkS);
    g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.lineTo(...D); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(...R1); g.lineTo(...R2); g.stroke(); g.strokeStyle = shade(roofC, 34); g.lineWidth = 3; g.beginPath(); g.moveTo(R1[0], R1[1] - 2); g.lineTo(R2[0], R2[1] - 2); g.stroke();
    R(g, D[0] - 3, D[1], w + 6, 4, shade(roofC, -60)); // eaves shadow
    // chimney (a small extruded box) and a dormer
    const cx = x + w * 0.7 + ox, cy = y + d * 0.28 + oy - rise * 0.5; R(g, cx - 3, cy - 40, 28, 46, INK); R(g, cx - 1, cy - 38, 24, 42, '#8a4a3a'); for (let k = 0; k < 42; k += 6) R(g, cx - 1, cy - 38 + k, 24, 1, '#5a2a22'); R(g, cx - 1, cy - 38, 7, 42, 'rgba(255,255,255,.16)'); R(g, cx - 5, cy - 44, 32, 7, '#b0a898'); R(g, cx + 3, cy - 44, 14, 3, '#2a2420');
    if (b.kind === 'house') { const dx = x + w * 0.28 + ox, dy = y + d * 0.62 + oy - rise * 0.3; R(g, dx - 2, dy - 30, 50, 38, INK); R(g, dx, dy - 28, 46, 34, wallBase); R(g, dx + 10, dy - 20, 26, 20, '#5a7a9a'); R(g, dx - 4, dy - 36, 54, 10, roofC); R(g, dx - 4, dy - 36, 54, 2, shade(roofC, 30)); }
    if (st >= 1) for (let k = 0; k < 3; k++) { const rx = x + w * (0.25 + k * 0.25) + ox, ry = y + d * (0.4 + (k % 2) * 0.25) + oy - rise * 0.3; R(g, rx - 14, ry - 8, 30, 14, '#3a2a20'); R(g, rx - 14, ry - 8, 30, 3, '#6a4a2a'); }
    if (st >= 2) roofHole(x + w * 0.42 + ox, y + d * 0.6 + oy - rise * 0.3, 48, { fire: b.burning });
  } else if (P.roofKind === 'saw') {
    poly(g, [A, B, C, D], shade(roofBase, -4)); g.save(); g.beginPath(); g.rect(A[0], A[1], w, d); g.clip(); const n = Math.round(w / 90); for (let k = 0; k < n; k++) { const x0 = A[0] + (k / n) * w, x1 = A[0] + ((k + 1) / n) * w; poly(g, [[x0, D[1]], [x1, D[1]], [x1, A[1]], [x0, A[1]]], mix(roofBase, '#8a929a', 0.2)); poly(g, [[x0, A[1]], [x0 + 16, A[1] + 10], [x0 + 16, D[1]], [x0, D[1]]], '#7a9ab4'); for (let j = 0; j < d; j += 12) R(g, x0, A[1] + j, 16, 1, 'rgba(255,255,255,.35)'); R(g, x0 + 16, A[1], x1 - x0 - 16, 3, shade(roofBase, 30)); for (let j = 0; j < d; j += 9) R(g, x0 + 16, A[1] + j, x1 - x0 - 16, 1, shade(roofBase, -26)); } g.restore(); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(A[0], A[1], w, d);
    if (st >= 2) roofHole(x + w * 0.5 + ox, y + d * 0.5 + oy, 70, { fire: b.burning });
  } else {
    const base = P.roofKind === 'flatcorr' ? shade(roofBase, 0) : roofBase; poly(g, [A, B, C, D], base); g.save(); g.beginPath(); g.rect(A[0], A[1], w, d); g.clip();
    if (P.roofKind === 'flatcorr') { for (let k = 0; k < w; k += 12) { R(g, A[0] + k, A[1], 1, d, shade(base, -24)); R(g, A[0] + k + 1, A[1], 2, d, shade(base, 22)); } } else { const rr = rng(seed + 21); for (let k = 0; k < w * d / 40; k++) R(g, A[0] + rr() * w, A[1] + rr() * d, 2 + rr() * 4, 2 + rr() * 3, rgba(rr() > 0.5 ? '#ffffff' : '#000000', 0.09)); }
    const gl = g.createLinearGradient(A[0], A[1], C[0], C[1]); gl.addColorStop(0, 'rgba(255,240,200,.16)'); gl.addColorStop(1, 'rgba(10,14,50,.16)'); g.fillStyle = gl; g.fillRect(A[0], A[1], w, d);
    // rooftop kit: AC units, vents, skylights, a water tank, pipes
    const rr = rng(seed + 31); const box = (bx, by, bw, bh, col, hh = 12) => { blob(g, bx + bw / 2 + 5, by + bh + 3, bw * 0.7, 6, 0.3); R(g, bx - 1, by - hh - 1, bw + 2, bh + hh + 2, INK); R(g, bx, by - hh, bw, hh, shade(col, 22)); R(g, bx, by, bw, bh, col); R(g, bx + bw - 4, by - hh, 4, bh + hh, shade(col, -26)); };
    for (let k = 0; k < Math.max(2, Math.floor(w / 120)); k++) { const bx = A[0] + 30 + rr() * (w - 120), by = A[1] + 24 + rr() * (d - 90); const t = rr(); if (t < 0.4) { box(bx, by, 52, 30, '#8a9298', 16); for (let q = 0; q < 5; q++) R(g, bx + 5 + q * 9, by - 12, 5, 9, '#4a5258'); } else if (t < 0.7) { box(bx, by, 40, 30, '#a8b4bc', 8); R(g, bx + 6, by - 6, 28, 14, 'rgba(120,180,220,.8)'); } else { box(bx, by, 22, 22, '#6a7078', 24); } }
    g.restore();
    // parapet: a raised rim
    R(g, D[0] - 3, D[1] - 3, w + 6, 7, shade(wallBase, 14)); R(g, D[0] - 3, D[1] + 3, w + 6, 2, shade(wallBase, -30)); R(g, B[0] - 3, B[1] - 3, 7, d + 6, shade(wallBase, -16)); R(g, A[0] - 3, A[1] - 3, w + 6, 6, shade(wallBase, 30)); R(g, A[0] - 3, A[1] - 3, 6, d + 6, shade(wallBase, 22)); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(A[0] - 3, A[1] - 3, w + 6, d + 6);
    if (st >= 1) for (let k = 0; k < 2; k++) { const gr = g.createRadialGradient(A[0] + w * (0.3 + k * 0.4), A[1] + d * 0.5, 4, A[0] + w * (0.3 + k * 0.4), A[1] + d * 0.5, 60); gr.addColorStop(0, 'rgba(10,6,6,.6)'); gr.addColorStop(1, 'rgba(10,6,6,0)'); g.fillStyle = gr; g.fillRect(A[0], A[1], w, d); }
    if (st >= 2) roofHole(A[0] + w * 0.55, A[1] + d * 0.5, 62, { fire: b.burning });
  }
}
