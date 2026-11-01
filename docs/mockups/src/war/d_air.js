// TARGET ART (mock-up only). Detailed air units seen from above: attack helicopter with a blurred rotor, strike jet, bomber, and the three drone types
// (quad scout drone, fixed-wing UAV, FPV strike drone). Shadows sit far off the craft to show altitude. Original designs.
import { INK, shade, mix, rgba, mk, rng, R, outline, lit, blob, ell, poly } from './d_util.js';
const cache = new Map();
const plate = (g, x, y, w, h, c, k = 24) => { R(g, x, y, w, h, c); R(g, x, y, w, 2, shade(c, k)); R(g, x, y, 2, h, shade(c, k * 0.7)); R(g, x + w - 2, y, 2, h, shade(c, -k)); R(g, x, y + h - 2, w, 2, shade(c, -k * 1.1)); };
const hullPath = (g, pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };

function heli(P) {
  const [c, g] = mk(260, 360); const cx = 130, cy = 150; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  // tail boom, fin and tail rotor
  r(-5, 40, 10, 130, P.hull2); r(-5, 40, 3, 130, shade(P.hull2, 24)); r(3, 40, 2, 130, shade(P.hull2, -26)); poly(g, [[cx - 4, cy + 140], [cx + 4, cy + 140], [cx + 4, cy + 176], [cx - 4, cy + 176]], P.hull); r(-22, 160, 44, 6, P.hull2); r(-22, 160, 44, 2, shade(P.hull2, 28)); r(8, 150, 3, 36, '#2a2a30');
  // fuselage: a teardrop with a glazed tandem canopy
  const pts = []; for (let t = 0; t <= 1; t += 0.05) { const y = -90 + t * 150; const w = 22 + 16 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.95); pts.push([cx - w, cy + y]); } for (let t = 1; t >= 0; t -= 0.05) { const y = -90 + t * 150; const w = 22 + 16 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.95); pts.push([cx + w, cy + y]); }
  hullPath(g, pts, INK); const pts2 = pts.map(([x, y]) => [cx + (x - cx) * 0.94, cy + (y - cy) * 0.97 + 1]); hullPath(g, pts2, P.hull);
  const fg = g.createLinearGradient(cx - 40, 0, cx + 40, 0); fg.addColorStop(0, 'rgba(255,250,230,.3)'); fg.addColorStop(0.5, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(10,12,40,.34)'); g.fillStyle = fg; g.fillRect(cx - 40, cy - 90, 80, 150);
  r(-14, -72, 28, 4, shade(P.hull, -28)); for (let k = 0; k < 6; k++) r(-26 + (k % 2) * 3, 10 + k * 8, 52 - (k % 2) * 6, 1, shade(P.hull, -30)); // panel lines
  poly(g, [[cx - 14, cy - 62], [cx + 14, cy - 62], [cx + 17, cy - 24], [cx - 17, cy - 24]], '#14202e'); poly(g, [[cx - 12, cy - 60], [cx + 12, cy - 60], [cx + 14, cy - 28], [cx - 14, cy - 28]], '#3a5a7e'); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(cx - 10, cy - 58); g.lineTo(cx - 2, cy - 58); g.lineTo(cx - 8, cy - 32); g.lineTo(cx - 12, cy - 32); g.fill(); r(-1, -62, 2, 38, '#14202e'); // canopy frame
  poly(g, [[cx - 12, cy - 22], [cx + 12, cy - 22], [cx + 14, cy + 8], [cx - 14, cy + 8]], '#14202e'); poly(g, [[cx - 10, cy - 20], [cx + 10, cy - 20], [cx + 12, cy + 6], [cx - 12, cy + 6]], '#2e4a6a');
  // nose sensor turret and chin gun
  ell(g, cx, cy - 86, 9, 9, '#16161c'); ell(g, cx, cy - 86, 6, 6, '#3a3a46'); r(-1, -86, 2, -22, '#2a2a30'); r(-2, -108, 4, 14, '#101014'); r(3, -90, 4, 4, '#e8c84a');
  // stub wings with two pods each and rockets
  for (const sx of [-1, 1]) { plate(g, cx + (sx < 0 ? -70 : 18), cy - 4, 52, 16, P.hull2, 22); for (let k = 0; k < 2; k++) { const px = cx + sx * (38 + k * 20) - 7; plate(g, px, cy - 18, 14, 38, '#4a4a54', 18); ell(g, px + 7, cy - 18, 7, 4, '#16161c'); for (let t = 0; t < 4; t++) R(g, px + 2 + (t % 2) * 6, cy - 14 + Math.floor(t / 2) * 6, 3, 3, '#c83a2a'); } r(sx * 70 + (sx < 0 ? 0 : -4), 0, 4, 8, '#c83a2a'); }
  // engines and exhausts
  for (const sx of [-1, 1]) { plate(g, cx + sx * 16 - 8, cy + 12, 16, 40, shade(P.hull2, -8), 16); ell(g, cx + sx * 16, cy + 54, 5, 3, '#101014'); }
  r(-2, -8, 4, 4, '#16161c');
  return c;
}
/** the main rotor as motion blur: a translucent disc with streaks, drawn above the craft */
export function rotorBlur(g, x, y, R_, ang = 0, blades = 4) {
  g.save(); g.translate(x, y); const gr = g.createRadialGradient(0, 0, R_ * 0.08, 0, 0, R_); gr.addColorStop(0, 'rgba(30,30,40,.36)'); gr.addColorStop(0.55, 'rgba(60,64,76,.16)'); gr.addColorStop(1, 'rgba(60,64,76,.05)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R_, 0, 7); g.fill();
  for (let k = 0; k < blades; k++) { const a = ang + (k / blades) * Math.PI * 2; for (let j = 0; j < 12; j++) { const aa = a - j * 0.05; g.strokeStyle = `rgba(20,20,28,${0.5 - j * 0.04})`; g.lineWidth = 5 - j * 0.3; g.beginPath(); g.moveTo(Math.cos(aa) * R_ * 0.1, Math.sin(aa) * R_ * 0.1); g.lineTo(Math.cos(aa) * R_, Math.sin(aa) * R_); g.stroke(); } }
  g.fillStyle = '#2a2a32'; g.beginPath(); g.arc(0, 0, R_ * 0.08, 0, 7); g.fill(); g.fillStyle = '#8a8a96'; g.beginPath(); g.arc(-1, -1, R_ * 0.04, 0, 7); g.fill(); g.restore();
}
function jet(P, o) {
  const [c, g] = mk(300, 360); const cx = 150, cy = 170; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  // swept wings
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 12, cy - 20], [cx + sx * 120, cy + 44], [cx + sx * 120, cy + 64], [cx + sx * 12, cy + 52]], INK); poly(g, [[cx + sx * 14, cy - 17], [cx + sx * 116, cy + 44], [cx + sx * 116, cy + 61], [cx + sx * 14, cy + 49]], P.hull); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(cx + sx * 14, cy - 17); g.lineTo(cx + sx * 116, cy + 44); g.lineTo(cx + sx * 116, cy + 50); g.lineTo(cx + sx * 14, cy - 8); g.fill(); g.strokeStyle = shade(P.hull, -34); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + sx * 30, cy + 8); g.lineTo(cx + sx * 112, cy + 50); g.stroke(); g.beginPath(); g.moveTo(cx + sx * 60, cy + 30); g.lineTo(cx + sx * 60, cy + 54); g.stroke(); poly(g, [[cx + sx * 80, cy + 44], [cx + sx * 116, cy + 61], [cx + sx * 80, cy + 56]], shade(P.hull2, -10)); r(sx * 118 - 3, 54, 6, 12, '#c83a2a');
    // under-wing stores (bombs and missiles), drawn as top views
    for (const [off, len] of o.stores || []) { r(sx * off - 5, 20 + (off - 40) * 0.1, 10, len, '#6a6a72'); r(sx * off - 5, 20 + (off - 40) * 0.1, 3, len, '#8a8a92'); r(sx * off - 4, 18 + (off - 40) * 0.1 + len, 8, 5, '#c83a2a'); } }
  // tail planes
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 8, cy + 98], [cx + sx * 58, cy + 140], [cx + sx * 58, cy + 152], [cx + sx * 8, cy + 134]], INK); poly(g, [[cx + sx * 10, cy + 100], [cx + sx * 54, cy + 140], [cx + sx * 54, cy + 149], [cx + sx * 10, cy + 132]], shade(P.hull, -6)); }
  // fuselage: a long spindle with a nose probe, intakes and a bubble canopy
  const body = (k) => { const pts = []; for (let t = 0; t <= 1; t += 0.04) { const y = -150 + t * 300; const w = (5 + 17 * Math.sin(Math.pow(t, 0.7) * Math.PI * 0.85)) * (t > 0.75 ? 1 - (t - 0.75) * 0.8 : 1) + k; pts.push([cx - w, cy + y]); } for (let t = 1; t >= 0; t -= 0.04) { const y = -150 + t * 300; const w = (5 + 17 * Math.sin(Math.pow(t, 0.7) * Math.PI * 0.85)) * (t > 0.75 ? 1 - (t - 0.75) * 0.8 : 1) + k; pts.push([cx + w, cy + y]); } return pts; };
  hullPath(g, body(2), INK); hullPath(g, body(0), P.hull); const fg = g.createLinearGradient(cx - 24, 0, cx + 24, 0); fg.addColorStop(0, 'rgba(255,250,230,.34)'); fg.addColorStop(0.5, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(10,12,40,.36)'); g.fillStyle = fg; g.fillRect(cx - 24, cy - 150, 48, 300);
  r(-1, -170, 2, 22, '#2a2a30'); r(-3, -152, 6, 6, '#3a3a44'); // pitot probe
  for (const sx of [-1, 1]) { plate(g, cx + sx * 20 - 6, cy - 6, 12, 44, '#3a3a44', 14); r(sx * 20 - 4, -4, 8, 6, '#101014'); }
  poly(g, [[cx - 9, cy - 82], [cx + 9, cy - 82], [cx + 12, cy - 30], [cx - 12, cy - 30]], '#14202e'); poly(g, [[cx - 7, cy - 80], [cx + 7, cy - 80], [cx + 10, cy - 32], [cx - 10, cy - 32]], '#4a7aa4'); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(cx - 5, cy - 78); g.lineTo(cx, cy - 78); g.lineTo(cx - 5, cy - 40); g.lineTo(cx - 8, cy - 40); g.fill(); r(-1, -82, 2, 50, '#14202e');
  for (let k = 0; k < 10; k++) r(-14 + (k % 2) * 2, -20 + k * 12, 28 - (k % 2) * 4, 1, shade(P.hull, -28)); // panel lines
  r(-18, 40, 36, 4, shade(P.hull, -22)); r(-3, 40, 6, 90, shade(P.hull, 10)); // spine
  // twin nozzles with afterburner glow
  for (const sx of [-1, 1]) { ell(g, cx + sx * 9, cy + 150, 8, 6, '#101014'); ell(g, cx + sx * 9, cy + 150, 5, 4, o.burn ? '#ffd88a' : '#3a2a22'); }
  // fins (twin vertical, seen as slim blades) and roundels
  for (const sx of [-1, 1]) { r(sx * 16 - 2, 100, 4, 40, shade(P.hull2, 4)); r(sx * 16 - 2, 100, 1, 40, shade(P.hull2, 30)); }
  for (const sx of [-1, 1]) { ell(g, cx + sx * 70, cy + 42, 8, 8, '#f0f0e8'); ell(g, cx + sx * 70, cy + 42, 5, 5, P.accent); }
  return c;
}
function bomber(P) {
  const [c, g] = mk(520, 360); const cx = 260, cy = 150; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 10, cy - 16], [cx + sx * 240, cy + 70], [cx + sx * 240, cy + 100], [cx + sx * 10, cy + 70]], INK); poly(g, [[cx + sx * 12, cy - 12], [cx + sx * 234, cy + 70], [cx + sx * 234, cy + 96], [cx + sx * 12, cy + 66]], P.hull); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(cx + sx * 12, cy - 12); g.lineTo(cx + sx * 234, cy + 70); g.lineTo(cx + sx * 234, cy + 80); g.lineTo(cx + sx * 12, cy + 4); g.fill(); for (let k = 1; k < 8; k++) { g.strokeStyle = shade(P.hull, -26); g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx + sx * (12 + k * 28), cy - 12 + k * 11); g.lineTo(cx + sx * (12 + k * 28), cy + 66 + k * 4); g.stroke(); }
    for (const off of [70, 130]) { plate(g, cx + sx * off - 12, cy + 4 + off * 0.25, 24, 80, '#4a4a56', 18); ell(g, cx + sx * off, cy + 4 + off * 0.25 + 80, 10, 5, '#101014'); ell(g, cx + sx * off, cy + 4 + off * 0.25 + 2, 9, 6, '#7a7a88'); for (let t = 0; t < 7; t++) { const a = t / 7 * 6.28; g.strokeStyle = 'rgba(20,20,26,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + sx * off, cy + 6 + off * 0.25); g.lineTo(cx + sx * off + Math.cos(a) * 16, cy + 6 + off * 0.25 + Math.sin(a) * 10); g.stroke(); } } }
  const body = (k) => { const pts = []; for (let t = 0; t <= 1; t += 0.04) { const y = -140 + t * 330; const w = (6 + 16 * Math.sin(Math.pow(t, 0.8) * Math.PI * 0.9)) * (t > 0.82 ? 1 - (t - 0.82) * 2 : 1) + k; pts.push([cx - w, cy + y]); } for (let t = 1; t >= 0; t -= 0.04) { const y = -140 + t * 330; const w = (6 + 16 * Math.sin(Math.pow(t, 0.8) * Math.PI * 0.9)) * (t > 0.82 ? 1 - (t - 0.82) * 2 : 1) + k; pts.push([cx + w, cy + y]); } return pts; };
  hullPath(g, body(2), INK); hullPath(g, body(0), P.hull); const fg = g.createLinearGradient(cx - 26, 0, cx + 26, 0); fg.addColorStop(0, 'rgba(255,250,230,.34)'); fg.addColorStop(1, 'rgba(10,12,40,.36)'); g.fillStyle = fg; g.fillRect(cx - 26, cy - 140, 52, 330);
  poly(g, [[cx - 10, cy - 100], [cx + 10, cy - 100], [cx + 12, cy - 64], [cx - 12, cy - 64]], '#14202e'); poly(g, [[cx - 8, cy - 98], [cx + 8, cy - 98], [cx + 10, cy - 66], [cx - 10, cy - 66]], '#4a7aa4');
  for (let k = 0; k < 14; k++) r(-18 + (k % 2) * 2, -50 + k * 12, 36 - (k % 2) * 4, 1, shade(P.hull, -26)); r(-8, -20, 16, 100, shade(P.hull, -14)); for (let k = 0; k < 4; k++) r(-6, -14 + k * 24, 12, 18, '#2a2a30'); // bomb bay doors
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 10, cy + 150], [cx + sx * 70, cy + 186], [cx + sx * 70, cy + 200], [cx + sx * 10, cy + 186]], INK); poly(g, [[cx + sx * 12, cy + 153], [cx + sx * 66, cy + 186], [cx + sx * 66, cy + 197], [cx + sx * 12, cy + 183]], shade(P.hull, -6)); }
  r(-3, 160, 6, 36, shade(P.hull2, 10)); for (const sx of [-1, 1]) { ell(g, cx + sx * 4, cy + 190, 3, 3, '#101014'); } r(-1, -148, 2, 14, '#2a2a30');
  for (const sx of [-1, 1]) { ell(g, cx + sx * 150, cy + 56, 9, 9, '#f0f0e8'); ell(g, cx + sx * 150, cy + 56, 5.5, 5.5, P.accent); }
  return c;
}
function quad(P) {
  const [c, g] = mk(120, 120); const cx = 60, cy = 60; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 36, cy - 36); g.lineTo(cx + 36, cy + 36); g.moveTo(cx + 36, cy - 36); g.lineTo(cx - 36, cy + 36); g.stroke(); g.strokeStyle = '#3a3a44'; g.lineWidth = 5; g.stroke();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ell(g, cx + sx * 36, cy + sy * 36, 8, 8, INK); ell(g, cx + sx * 36, cy + sy * 36, 6, 6, '#26262e'); r(sx * 36 - 2, sy * 36 - 2, 4, 4, sy < 0 ? '#e83a3a' : '#3ae85a'); }
  plate(g, cx - 14, cy - 14, 28, 28, '#4a4a54', 18); plate(g, cx - 8, cy - 22, 16, 10, '#2a2a32', 14); ell(g, cx, cy + 14, 8, 8, '#16161c'); ell(g, cx, cy + 14, 5, 5, '#2a3a5a'); r(-3, 12, 3, 3, '#8ac8e8'); // camera gimbal
  r(-10, -10, 20, 3, '#6a6a76'); return c;
}
function fixedUav(P) {
  const [c, g] = mk(420, 220); const cx = 210, cy = 100; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 6, cy - 10], [cx + sx * 196, cy - 4], [cx + sx * 196, cy + 14], [cx + sx * 6, cy + 28]], INK); poly(g, [[cx + sx * 8, cy - 7], [cx + sx * 192, cy - 1], [cx + sx * 192, cy + 11], [cx + sx * 8, cy + 24]], '#d8dad8'); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(Math.min(cx + sx * 8, cx + sx * 192), cy - 7, 184, 3); g.strokeStyle = '#9a9ca0'; g.lineWidth = 1; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(cx + sx * (8 + k * 31), cy - 5); g.lineTo(cx + sx * (8 + k * 31), cy + 24 - k * 2); g.stroke(); } }
  hullPath(g, [[cx - 8, cy - 40], [cx + 8, cy - 40], [cx + 10, cy + 30], [cx - 10, cy + 30]], INK); const bg = g.createLinearGradient(cx - 9, 0, cx + 9, 0); bg.addColorStop(0, '#f0f2f0'); bg.addColorStop(1, '#a8aaae'); g.fillStyle = bg; g.fillRect(cx - 8, cy - 38, 16, 66);
  ell(g, cx, cy - 36, 8, 8, '#e8eaea'); r(-4, -16, 8, 14, '#3a3a44'); r(-3, -14, 6, 6, '#6ac8e8'); // sensor ball and dome
  for (const sx of [-1, 1]) { poly(g, [[cx + sx * 8, cy + 24], [cx + sx * 44, cy + 56], [cx + sx * 44, cy + 66], [cx + sx * 8, cy + 38]], INK); poly(g, [[cx + sx * 9, cy + 26], [cx + sx * 40, cy + 56], [cx + sx * 40, cy + 63], [cx + sx * 9, cy + 36]], '#c8cac8'); }
  r(-2, 30, 4, 12, '#2a2a30'); ell(g, cx, cy + 46, 12, 12, 'rgba(60,60,70,.28)'); return c;
}
function fpv(P) {
  const [c, g] = mk(80, 80); const cx = 40, cy = 40; const r = (x, y, w, h, col) => R(g, cx + x, cy + y, w, h, col);
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 24, cy - 24); g.lineTo(cx + 24, cy + 24); g.moveTo(cx + 24, cy - 24); g.lineTo(cx - 24, cy + 24); g.stroke(); g.strokeStyle = '#26262c'; g.lineWidth = 3; g.stroke();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ell(g, cx + sx * 24, cy + sy * 24, 8, 8, 'rgba(40,40,50,.42)'); r(sx * 24 - 2, sy * 24 - 2, 4, 4, '#c8c8d0'); }
  plate(g, cx - 8, cy - 14, 16, 28, '#34343c', 14); r(-6, -12, 12, 6, '#8a2a2a'); r(-4, 4, 8, 4, '#c8a02a'); ell(g, cx, cy - 16, 4, 4, '#101014'); r(-1, -18, 2, 3, '#6ac8e8'); return c;
}
export const AIRCRAFT = { heli, jet, bomber, quad, uav: fixedUav, fpv };
export const PALETTE = { company: { hull: '#5c6c52', hull2: '#44543c', accent: '#f0ecd8' }, varn: { hull: '#a58b5c', hull2: '#85703f', accent: '#c83a2a' }, grey: { hull: '#8a929c', hull2: '#6a727c', accent: '#2a5a9a' }, sund: { hull: '#7a8a9e', hull2: '#5a6a80', accent: '#e8c84a' } };
/** draw an air unit at (x, y) at altitude (px of shadow offset), heading radians (0 = up) */
export function drawAir(g, kind, faction, x, y, heading, o = {}) {
  const P = PALETTE[faction] || PALETTE.company; const key = `${kind}|${faction}|${JSON.stringify(o.sprite || {})}`; let base = cache.get(key); if (!base) { base = AIRCRAFT[kind](P, o.sprite || {}); cache.set(key, base); }
  const s = o.scale || 1; const alt = o.alt ?? 60; const D = Math.ceil(Math.hypot(base.width, base.height)) + 6;
  const hk = key + '|' + Math.round(heading * 36); let spr = cache.get('r' + hk); if (!spr) { const [t, tg] = mk(D, D); tg.translate(D / 2, D / 2); tg.rotate(heading); tg.drawImage(base, -base.width / 2, -base.height / 2); spr = outline(lit(t, 0.24), INK, 2); cache.set('r' + hk, spr); }
  const [sh, sg] = mk(spr.width, spr.height); sg.drawImage(spr, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(8,12,26,.38)'; sg.fillRect(0, 0, sh.width, sh.height);
  g.drawImage(sh, x - spr.width / 2 * s + alt * 0.9 * s, y - spr.height / 2 * s + alt * 1.1 * s, spr.width * s, spr.height * s); // far shadow
  g.drawImage(spr, x - spr.width / 2 * s, y - spr.height / 2 * s - (o.lift || 0), spr.width * s, spr.height * s);
  if (kind === 'heli' && o.rotor !== false) rotorBlur(g, x + 0 * s, y - 6 * s - (o.lift || 0), 150 * s, o.phase || 0.6, 4);
  if (kind === 'quad' || kind === 'fpv') { const rr = kind === 'quad' ? 34 : 26; const off = kind === 'quad' ? 36 : 24; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const a = heading; const px = x + (sx * Math.cos(a) - sy * Math.sin(a)) * off * s, py = y + (sx * Math.sin(a) + sy * Math.cos(a)) * off * s - (o.lift || 0); g.save(); g.fillStyle = 'rgba(200,210,230,.22)'; g.beginPath(); g.arc(px, py, rr * 0.8 * s, 0, 7); g.fill(); g.strokeStyle = 'rgba(20,20,26,.55)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(px - rr * 0.8 * s, py); g.lineTo(px + rr * 0.8 * s, py); g.stroke(); g.restore(); } }
}
