// TARGET ART (mock-up only). Detailed ground vehicles, painted nose-up as a top face, then rotated, extruded (side walls) and lit from the upper left.
// A tank is a hull plus a separate turret so the turret can turn on its own. Heights give the 2.5D look: turrets sit above hulls, pods above chassis.
import { INK, hash, shade, mix, rgba, mk, rng, R, outline, lit, extrude, silhouette, blob, ell, poly } from './d_util.js';
const cache = new Map();
export const PAINT = {
  company: { hull: '#55703f', hull2: '#3e5430', det: '#2a3a22', accent: '#f0ecd8', pat: ['#6e8a4a', '#34482a', '#8a7a52'], track: '#26262c' },
  varn: { hull: '#a58b5c', hull2: '#85703f', det: '#5e4c2c', accent: '#c83a2a', pat: ['#bba06c', '#7a6438', '#9a8456'], track: '#2e2822' },
  ostmark: { hull: '#6a7a58', hull2: '#4c5c3e', det: '#34402a', accent: '#c83a2a', pat: ['#7e8e66', '#46563a', '#9a8a60'], track: '#26262a' },
  sund: { hull: '#6c7a8c', hull2: '#4e5c70', det: '#38445a', accent: '#e8c84a', pat: ['#7a8a9e', '#46546a', '#5e6e86'], track: '#26282e' },
};
const plate = (g, x, y, w, h, c, k = 24) => { R(g, x, y, w, h, c); R(g, x, y, w, 2, shade(c, k)); R(g, x, y, 2, h, shade(c, k * 0.7)); R(g, x + w - 2, y, 2, h, shade(c, -k)); R(g, x, y + h - 2, w, 2, shade(c, -k * 1.1)); };
const bolts = (g, x, y, w, c, step = 6) => { for (let i = 0; i < w; i += step) R(g, x + i, y, 2, 2, c); };
const camoFill = (g, x, y, w, h, P, seed) => { const q = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); for (let n = 0; n < w * h / 120; n++) { g.fillStyle = P.pat[Math.floor(q() * 3)]; const bw = 8 + q() * 18, bh = 6 + q() * 12; g.beginPath(); g.ellipse(x + q() * w, y + q() * h, bw, bh, q() * 3, 0, 7); g.fill(); } g.restore(); };

/** the hull: tracks, fenders, glacis, deck. 200 x 240 canvas, nose up, centre (100,120). */
function tankHull(P, o) {
  const [c, g] = mk(200, 240); const cx = 100, cy = 120; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col); const L = o.long || 188, HW = o.wide || 70;
  // tracks: black rubber with link ribs, road-wheel hints, drive sprockets
  for (const sx of [-1, 1]) { const x0 = sx < 0 ? -HW / 2 - 18 : HW / 2 - 6; r(x0 - 1, -L / 2 - 2, 26, L + 4, INK); r(x0, -L / 2, 24, L, P.track); for (let y = -L / 2 + 2; y < L / 2 - 2; y += 4) { r(x0 + 1, y, 22, 2, '#454550'); r(x0 + 1, y + 2, 22, 1, '#18181c'); } r(x0, -L / 2, 2, L, '#5a5a64'); r(x0 + 22, -L / 2, 2, L, '#101014'); for (const yy of [-L / 2 + 12, L / 2 - 14]) { r(x0 + 4, yy - 7, 16, 16, '#3a3a42'); r(x0 + 8, yy - 3, 8, 8, '#6a6a74'); } }
  // fenders over the tracks with stowage
  for (const sx of [-1, 1]) { const x0 = sx < 0 ? -HW / 2 - 20 : HW / 2 - 4; plate(g, cx + x0, cy - L / 2 + 6, 24, L - 24, shade(P.hull2, -6), 16); bolts(g, cx + x0 + 3, cy - L / 2 + 10, 20, '#00000066'); }
  r(-HW / 2 - 17, -30, 10, 26, '#6a6a40'); r(-HW / 2 - 17, -30, 10, 3, '#8a8a58'); r(-HW / 2 - 16, 6, 8, 22, '#5a5a62'); r(HW / 2 + 3, -34, 14, 12, '#7a6a3a'); r(HW / 2 + 4, 10, 12, 30, '#4a3a2a'); r(HW / 2 + 4, 10, 12, 3, '#6a5a3a'); // jerrycans, tool box, tow cable, spare track
  // hull body
  plate(g, cx - HW / 2 - 2, cy - L / 2 + 2, HW + 4, L - 8, P.hull, 22); camoFill(g, cx - HW / 2, cy - L / 2 + 6, HW, L - 16, P, o.seed || 1);
  // glacis (front slope) lighter, with driver hatch and headlights
  const gl = g.createLinearGradient(0, cy - L / 2, 0, cy - L / 2 + 52); gl.addColorStop(0, 'rgba(255,250,230,.38)'); gl.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = gl; g.fillRect(cx - HW / 2, cy - L / 2 + 2, HW, 52);
  r(-HW / 2 + 2, -L / 2 + 20, HW - 4, 2, shade(P.hull, -34)); r(-HW / 2 + 2, -L / 2 + 21, HW - 4, 1, shade(P.hull, 30)); r(-HW / 2 + 6, -L / 2 + 6, 12, 8, '#e8e4c0'); r(HW / 2 - 18, -L / 2 + 6, 12, 8, '#e8e4c0'); r(-HW / 2 + 6, -L / 2 + 6, 12, 2, '#fff');
  ell(g, cx - 14, cy - L / 2 + 34, 11, 8, '#1c1c22'); ell(g, cx - 14, cy - L / 2 + 34, 9, 6, shade(P.hull2, -4)); r(-16, -L / 2 + 31, 5, 4, '#7ac8e8'); r(12, -L / 2 + 28, 5, 12, '#1c1c22'); r(10, -L / 2 + 26, 9, 4, '#2c2c34');
  // engine deck: louvres and exhausts
  const ey = L / 2 - 66; plate(g, cx - HW / 2 + 6, cy + ey, HW - 12, 58, shade(P.hull, -10), 18); for (let k = 0; k < 8; k++) { r(-HW / 2 + 10, ey + 6 + k * 6, HW - 20, 2, '#1e1e24'); r(-HW / 2 + 10, ey + 8 + k * 6, HW - 20, 1, shade(P.hull, 22)); } r(-HW / 2 + 8, ey + 52, 14, 4, '#2a2a30'); r(HW / 2 - 22, ey + 52, 14, 4, '#2a2a30'); r(-8, ey + 4, 16, 5, '#c8a84a'); ell(g, cx + HW / 2 - 12, cy + ey + 14, 5, 5, '#2a2a30');
  r(-HW / 2 + 4, L / 2 - 8, HW - 8, 6, shade(P.hull2, -22)); r(-10, L / 2 - 10, 20, 4, '#9a9aa6'); // rear plate, tow hook
  if (o.blade) { // dozer blade: a wide ribbed plate on hydraulic arms
    const bw = HW + 52; plate(g, cx - bw / 2, cy - L / 2 - 20, bw, 26, '#6a6a72', 22); for (let k = 8; k < bw - 8; k += 14) r(-bw / 2 + k, -L / 2 - 18, 3, 22, '#3a3a42'); r(-bw / 2, -L / 2 - 22, bw, 3, '#9a9aa4'); r(-bw / 2, -L / 2 + 3, bw, 3, '#2a2a30'); for (const sx of [-1, 1]) { r(sx * 24 - 3, -L / 2 + 2, 6, 24, '#c8a02a'); r(sx * 24 - 2, -L / 2 + 2, 2, 24, '#e8c84a'); } r(-bw / 2 - 3, -L / 2 - 20, 4, 30, '#4a4a52'); r(bw / 2 - 1, -L / 2 - 20, 4, 30, '#4a4a52'); }
  if (o.skirts) for (const sx of [-1, 1]) { r(sx * (HW / 2 + 6) - 2, -L / 2 + 20, 4, L - 50, shade(P.hull2, -30)); }
  return c;
}
function tankTurret(P, o) {
  const [c, g] = mk(200, 300); const cx = 100, cy = 160; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col); const W = o.tw || 66, Lt = o.tl || 76; const gun = o.gun || 120;
  // gun barrel first (it sits under the mantlet)
  const gw = o.gunw || 10; r(-gw / 2 - 1, -Lt / 2 - gun, gw + 2, gun + 6, INK); const bg = g.createLinearGradient(cx - gw / 2, 0, cx + gw / 2, 0); bg.addColorStop(0, '#6a6a76'); bg.addColorStop(0.5, '#4a4a56'); bg.addColorStop(1, '#2a2a32'); g.fillStyle = bg; g.fillRect(cx - gw / 2, cy - Lt / 2 - gun, gw, gun + 4);
  r(-gw / 2 - 3, -Lt / 2 - gun * 0.4, gw + 6, 10, '#3a3a44'); r(-gw / 2 - 3, -Lt / 2 - gun * 0.4, gw + 6, 2, '#7a7a86'); // fume extractor
  if (o.brake !== false) { r(-gw / 2 - 5, -Lt / 2 - gun - 2, gw + 10, 14, '#2a2a32'); r(-gw / 2 - 5, -Lt / 2 - gun - 2, gw + 10, 2, '#6a6a76'); for (let k = 0; k < 3; k++) r(-gw / 2 - 5, -Lt / 2 - gun + 2 + k * 4, gw + 10, 1, '#101014'); }
  // turret body: a rounded octagon bevelled by shade
  const pts = (k) => [[-W / 2 + 14, -Lt / 2 + k], [W / 2 - 14, -Lt / 2 + k], [W / 2 - k, -Lt / 2 + 18], [W / 2 - k, Lt / 2 - 14], [W / 2 - 14, Lt / 2 - k], [-W / 2 + 14, Lt / 2 - k], [-W / 2 + k, Lt / 2 - 14], [-W / 2 + k, -Lt / 2 + 18]].map(([x, y]) => [cx + x, cy + y]);
  poly(g, pts(-2), INK); poly(g, pts(0), P.hull); poly(g, pts(5), shade(P.hull, 18)); poly(g, pts(9), P.hull); camoFill(g, cx - W / 2 + 8, cy - Lt / 2 + 8, W - 16, Lt - 20, P, (o.seed || 1) + 3);
  const tg = g.createLinearGradient(cx - W / 2, cy - Lt / 2, cx + W / 2, cy + Lt / 2); tg.addColorStop(0, 'rgba(255,250,230,.26)'); tg.addColorStop(1, 'rgba(10,12,40,.28)'); g.fillStyle = tg; g.fillRect(cx - W / 2, cy - Lt / 2, W, Lt);
  // mantlet and sights
  plate(g, cx - 22, cy - Lt / 2 - 6, 44, 20, shade(P.hull2, -8), 18); r(-14, -Lt / 2 + 12, 28, 3, '#101014'); r(-19, -Lt / 2 + 2, 8, 6, '#101014'); r(-18, -Lt / 2 + 3, 5, 3, '#7ac8e8'); r(11, -Lt / 2 + 2, 8, 6, '#101014'); r(12, -Lt / 2 + 3, 5, 3, '#7ac8e8');
  // hatches: commander cupola with ring MG, loader hatch
  ell(g, cx + 14, cy + 4, 13, 13, INK); ell(g, cx + 14, cy + 4, 11, 11, shade(P.hull, -14)); ell(g, cx + 14, cy + 4, 7, 7, '#16161c'); r(18, -4, 4, 2, '#6a6a74'); r(12, -14, 3, 10, '#2a2a32'); r(10, -16, 8, 3, '#2a2a32'); r(14, 4, 14, 3, '#2a2a32'); // cupola MG
  ell(g, cx - 14, cy + 16, 11, 9, INK); ell(g, cx - 14, cy + 16, 9, 7, shade(P.hull, -8)); ell(g, cx - 14, cy + 16, 6, 4, '#16161c'); r(-22, 2, 4, 6, '#2a2a30');
  // smoke dischargers, antenna, stowage bustle, rear bin
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { r(sx * (W / 2 - 1) - 3, -8 + k * 7, 6, 5, '#2a2a30'); r(sx * (W / 2 - 1) - 2, -8 + k * 7, 4, 1, '#6a6a74'); }
  plate(g, cx - W / 2 + 6, cy + Lt / 2 - 12, W - 12, 20, shade(P.hull2, -14), 16); bolts(g, cx - W / 2 + 10, cy + Lt / 2 - 8, W - 20, '#00000055'); r(-22, Lt / 2 - 4, 16, 8, '#5a4a30'); r(6, Lt / 2 - 4, 16, 8, '#4a5a30');
  r(W / 2 - 14, Lt / 2 - 10, 2, 40, '#2a2a30'); r(W / 2 - 16, Lt / 2 + 28, 6, 3, '#2a2a30');
  if (o.react) for (let k = 0; k < 6; k++) { plate(g, cx - W / 2 - 4 + (k % 2) * (W + 2), cy - 24 + Math.floor(k / 2) * 22, 6, 18, '#5a6a50', 18); }
  if (o.number) { g.fillStyle = P.accent; g.font = '800 15px system-ui'; g.fillText(String(o.number), cx - 3, cy + 20); }
  r(-30, -Lt / 2 + 22, 5, 14, P.accent); r(25, -Lt / 2 + 22, 5, 14, P.accent);
  return c;
}
/** artillery & carriers share a chassis painter: kind = mlrs | spg | apc | truck | dozer | tank */
function wheeledBody(P, o) {
  const [c, g] = mk(200, 300); const cx = 100, cy = 150; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col); const L = o.L || 220, W = o.W || 74; const n = o.axles || 4;
  for (let k = 0; k < n; k++) for (const sx of [-1, 1]) { const y = -L / 2 + 22 + k * ((L - 50) / (n - 1)); r(sx * (W / 2 + 8) - 8, y - 14, 16, 30, INK); r(sx * (W / 2 + 8) - 6, y - 12, 12, 26, '#1c1c22'); for (let t = 0; t < 26; t += 4) r(sx * (W / 2 + 8) - 6, y - 12 + t, 12, 1, '#34343c'); r(sx * (W / 2 + 8) - 6, y - 12, 2, 26, '#4a4a54'); }
  plate(g, cx - W / 2, cy - L / 2 + 6, W, L - 12, P.hull, 22); camoFill(g, cx - W / 2 + 2, cy - L / 2 + 10, W - 4, L - 20, P, o.seed || 2);
  r(-W / 2 + 2, -L / 2 + 28, W - 4, 3, shade(P.hull, -34)); r(-W / 2 + 4, -L / 2 + 8, 14, 8, '#e8e4c0'); r(W / 2 - 18, -L / 2 + 8, 14, 8, '#e8e4c0');
  return [c, g, cx, cy, r, L, W];
}
function mlrs(P, o) {
  const [c, g, cx, cy, r, L, W] = wheeledBody(P, { L: 250, W: 80, axles: 4, seed: 5 });
  // cab: windscreen and roof
  plate(g, cx - W / 2 + 2, cy - L / 2 + 30, W - 4, 52, shade(P.hull, 6), 22); r(-W / 2 + 8, -L / 2 + 34, W - 16, 14, '#1a2a3e'); r(-W / 2 + 10, -L / 2 + 35, W - 22, 4, '#7ac8e8'); r(-W / 2 + 10, -L / 2 + 40, 16, 3, 'rgba(255,255,255,.45)'); r(W / 2 - 14, -L / 2 + 58, 8, 14, '#2a2a30'); r(-W / 2 + 6, -L / 2 + 82, W - 12, 3, shade(P.hull, -30));
  // the pod: 2 x 6 tubes in a raised frame
  plate(g, cx - W / 2 + 4, cy - L / 2 + 92, W - 8, L - 112, shade(P.hull2, 6), 20); const ph = 28;
  for (let col = 0; col < 2; col++) for (let row = 0; row < 6; row++) { const x = -W / 2 + 12 + col * 30, y = -L / 2 + 100 + row * 20; ell(g, cx + x + 12, cy + y + 9, 12, 9, INK); ell(g, cx + x + 12, cy + y + 9, 10, 7, '#2a2a30'); ell(g, cx + x + 12, cy + y + 9, 6, 4.5, o.loaded === false ? '#0c0c10' : '#c8c0a0'); if (o.loaded !== false) { ell(g, cx + x + 11, cy + y + 8, 3, 2.5, '#d83a2a'); } }
  r(-W / 2 + 6, -L / 2 + 94, W - 12, 4, '#3a3a42'); r(-W / 2 + 6, L / 2 - 20, W - 12, 4, '#3a3a42'); r(-4, -L / 2 + 94, 8, L - 114, '#2a2a30');
  for (const sx of [-1, 1]) { r(sx * (W / 2 + 12) - 4, L / 2 - 40, 8, 26, '#6a6a72'); r(sx * (W / 2 + 12) - 6, L / 2 - 16, 12, 5, '#8a8a92'); } // outriggers
  return { top: c, depth: 18, w: 200, h: 300, ox: 100, oy: 150 };
}
function spg(P, o) {
  const hull = tankHull(P, { long: 170, wide: 76, seed: 7, skirts: true }); const [c, g] = mk(200, 400); g.drawImage(hull, 0, 80); const cx = 100, cy = 200; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  // a big open-topped fighting compartment at the rear, a long barrel forward with fume extractor and muzzle brake
  const gun = 222; r(-7, -192, 14, 236, INK); const bg = g.createLinearGradient(cx - 5, 0, cx + 5, 0); bg.addColorStop(0, '#6a6a76'); bg.addColorStop(0.5, '#4a4a56'); bg.addColorStop(1, '#2a2a32'); g.fillStyle = bg; g.fillRect(cx - 5, cy - 190, 10, 232);
  r(-9, -130, 18, 14, '#34343c'); r(-9, -130, 18, 2, '#7a7a86'); r(-10, -196, 20, 20, '#2a2a32'); r(-10, -196, 20, 2, '#7a7a86'); for (let k = 0; k < 4; k++) r(-10, -192 + k * 4, 20, 1, '#101014');
  plate(g, cx - 40, cy - 70, 80, 120, P.hull, 22); camoFill(g, cx - 38, cy - 66, 76, 112, P, 11); plate(g, cx - 34, cy - 24, 68, 66, shade(P.hull2, -16), 14); // open top: dark floor with shells
  for (let k = 0; k < 6; k++) { r(-30 + k * 11, -16, 8, 40, '#c8a84a'); r(-30 + k * 11, -16, 8, 6, '#e8c870'); r(-30 + k * 11, 24, 8, 4, '#7a5a1a'); }
  plate(g, cx - 40, cy - 70, 80, 36, shade(P.hull, 8), 22); r(-26, -62, 52, 3, '#101014'); r(-12, -56, 24, 14, '#2a2a30'); ell(g, cx - 8, cy - 48, 8, 8, '#16161c');
  plate(g, cx - 44, cy + 42, 88, 16, shade(P.hull2, -22), 14); r(-30, 62, 60, 6, '#4a4a52'); r(-4, 62, 8, 14, '#6a6a72'); // spade
  r(36, -50, 3, 36, '#2a2a30');
  return { top: c, depth: 16, w: 200, h: 400, ox: 100, oy: 200 };
}
function apc(P, o) {
  const [c, g, cx, cy, r, L, W] = wheeledBody(P, { L: 236, W: 84, axles: 4, seed: 9 });
  plate(g, cx - W / 2 + 2, cy - L / 2 + 34, W - 4, 40, shade(P.hull, 12), 22); r(-W / 2 + 8, -L / 2 + 38, W - 16, 12, '#1a2a3e'); r(-W / 2 + 10, -L / 2 + 39, W - 24, 4, '#7ac8e8'); // sloped glacis and driver vision
  plate(g, cx - W / 2 + 4, cy - L / 2 + 80, W - 8, L - 100, shade(P.hull, -2), 18); r(-W / 2 + 10, -L / 2 + 100, 22, 22, '#16161c'); r(W / 2 - 32, -L / 2 + 100, 22, 22, '#16161c'); r(-W / 2 + 10, L / 2 - 52, 28, 6, '#2a2a30'); // troop hatches
  for (let k = 0; k < 4; k++) { r(-W / 2 + 6, -L / 2 + 130 + k * 12, 3, 8, '#2a2a30'); } r(W / 2 - 10, -L / 2 + 132, 5, 40, '#2a2a30');
  // turret with autocannon and a smoke launcher
  ell(g, cx, cy - 6, 24, 26, INK); ell(g, cx, cy - 6, 22, 24, P.hull); ell(g, cx - 4, cy - 10, 12, 12, 'rgba(255,250,230,.22)'); const bg = g.createLinearGradient(cx - 3, 0, cx + 3, 0); bg.addColorStop(0, '#6a6a76'); bg.addColorStop(1, '#2a2a32'); g.fillStyle = bg; g.fillRect(cx - 3, cy - 58, 6, 40); r(-4, -60, 8, 6, '#2a2a32'); r(-14, -20, 8, 6, '#101014'); r(-13, -19, 5, 3, '#7ac8e8'); r(6, -4, 10, 10, '#16161c'); r(-18, -2, 6, 12, '#3a3a42');
  return { top: c, depth: 14, w: 200, h: 300, ox: 100, oy: 150 };
}
function truck(P, o) {
  const [c, g, cx, cy, r, L, W] = wheeledBody(P, { L: 230, W: 76, axles: 3, seed: 13 });
  plate(g, cx - W / 2 + 2, cy - L / 2 + 20, W - 4, 56, shade(P.hull, 8), 22); r(-W / 2 + 8, -L / 2 + 24, W - 16, 14, '#1a2a3e'); r(-W / 2 + 10, -L / 2 + 25, W - 22, 4, '#7ac8e8'); r(-W / 2 + 4, -L / 2 + 44, W - 8, 3, '#101014');
  // tarp-covered cargo bed with ribs and ropes
  plate(g, cx - W / 2 + 2, cy - L / 2 + 82, W - 4, L - 96, o.cargo || '#7a7a52', 18); for (let k = 0; k < L - 100; k += 14) { r(-W / 2 + 4, -L / 2 + 86 + k, W - 8, 2, shade(o.cargo || '#7a7a52', -28)); r(-W / 2 + 4, -L / 2 + 88 + k, W - 8, 1, shade(o.cargo || '#7a7a52', 24)); } r(-2, -L / 2 + 84, 4, L - 100, shade(o.cargo || '#7a7a52', 18));
  if (o.cross) { ell(g, cx, cy + 20, 18, 18, '#f4f4f0'); r(-4, 8, 8, 24, '#d83a3a'); r(-12, 16, 24, 8, '#d83a3a'); }
  return { top: c, depth: 16, w: 200, h: 300, ox: 100, oy: 150 };
}
export function vehicleParts(kind, faction = 'company', o = {}) {
  const key = `${kind}|${faction}|${JSON.stringify(o)}`; if (cache.has(key)) return cache.get(key); const P = PAINT[faction] || PAINT.company; let res;
  if (kind === 'tank' || kind === 'dozer') { res = { hull: tankHull(P, { seed: o.seed || 1, blade: kind === 'dozer', skirts: o.skirts }), turret: tankTurret(P, { seed: o.seed || 1, number: o.number, gun: kind === 'dozer' ? 70 : o.gun || 124, react: kind === 'dozer', tw: kind === 'dozer' ? 62 : 66, brake: kind !== 'dozer' }), depth: 16, tdepth: 14, hox: 100, hoy: 120, tox: 100, toy: 160 }; }
  else { const f = { mlrs, spg, apc, truck }[kind](P, o); res = { hull: f.top, depth: f.depth, hox: f.ox, hoy: f.oy }; }
  cache.set(key, res); return res;
}
/** draw a vehicle: heading in radians (0 = nose up/north); turretAngle is absolute */
export function drawVehicle(g, kind, faction, x, y, heading, o = {}) {
  const s = o.scale || 1; const parts = vehicleParts(kind, faction, o); const hk = `${kind}|${faction}|${Math.round(heading * 24)}|${JSON.stringify(o)}`;
  const layer = (src, ox, oy, ang, depth) => { const D = Math.ceil(Math.hypot(src.width, src.height)) + 8; const [t, tg] = mk(D, D); tg.translate(D / 2, D / 2); tg.rotate(ang); tg.drawImage(src, -ox, -oy); let e = outline(lit(t, 0.26), INK, 2); e = extrude(e, depth, 'rgba(8,10,26,.62)', 0, 1); return { c: e, D }; };
  let H = cache.get('h' + hk); if (!H) { H = layer(parts.hull, parts.hox, parts.hoy, heading, parts.depth); cache.set('h' + hk, H); }
  const alt = o.alt || 0; blob(g, x + 18 * s + alt, y + 26 * s + alt, 62 * s, 40 * s, 0.4, heading * 0.0);
  if (o.wreck) { g.save(); g.filter = 'grayscale(1) brightness(.42)'; g.drawImage(H.c, x - (H.D / 2 + 3) * s, y - (H.D / 2 + 3) * s, H.c.width * s, H.c.height * s); g.restore(); return; }
  g.drawImage(H.c, x - (H.D / 2 + 3) * s, y - (H.D / 2 + 3) * s, H.c.width * s, H.c.height * s);
  if (parts.turret) { const ta = o.turret ?? heading; const tk = `t${kind}|${faction}|${Math.round(ta * 24)}|${JSON.stringify(o)}`; let T = cache.get(tk); if (!T) { T = layer(parts.turret, parts.tox, parts.toy, ta, parts.tdepth); cache.set(tk, T); } const lift = 12; g.drawImage(T.c, x - (T.D / 2 + 3) * s, y - (T.D / 2 + 3) * s - lift * s, T.c.width * s, T.c.height * s); }
}
