// TARGET ART (mock-up only). Fire, smoke, explosions, tracers, muzzle flashes, debris, craters, rocket trails and dust, painted as layered particles
// with additive light. In the game each effect would be a short list of particles ticked once per frame and painted with these same layers.
import { INK, hash, shade, mix, rgba, rng, clamp, lerp, blob } from './d_util.js';

const add = (g, f) => { g.save(); g.globalCompositeOperation = 'screen'; f(); g.restore(); };
const over = (g, f) => { g.save(); f(); g.restore(); };
const radial = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([t, c]) => gr.addColorStop(t, c)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

/** a lit smoke puff: dark body, a lighter crescent on the sun side */
function puff(g, x, y, r, a, tone) {
  const t = tone; radial(g, x, y, r, [[0, `rgba(${t},${t},${t + 6},${a})`], [0.7, `rgba(${t - 10},${t - 10},${t - 4},${a * 0.8})`], [1, `rgba(${t - 20},${t - 20},${t - 14},0)`]]);
  radial(g, x - r * 0.3, y - r * 0.32, r * 0.7, [[0, `rgba(${Math.min(255, t + 60)},${Math.min(255, t + 56)},${Math.min(255, t + 52)},${a * 0.5})`], [1, 'rgba(255,255,255,0)']]);
}
/** a smoke column that leans downwind (to the right and up). base at (x,y); height in px; dark=0..1 */
export function smoke(g, x, y, height, o = {}) {
  const q = rng((o.seed || 1) * 97 + 3); const w = o.w || 34; const n = Math.round(height / 5); const lean = o.lean ?? 0.35; const tone = o.dark === undefined ? 74 : Math.round(150 - o.dark * 110);
  for (let i = 0; i < n; i++) { const t = i / n; const yy = y - t * height; const xx = x + t * t * height * lean + (q() - 0.5) * w * (0.5 + t); const r = (w * 0.45 + t * w * 1.3) * (0.7 + q() * 0.6); puff(g, xx, yy, r, (1 - t) * 0.5 * (o.alpha ?? 1) + 0.05, tone + t * 50); }
}
/** flames: layered tongues with an additive glow pool on the ground */
export function fire(g, x, y, w, h, o = {}) {
  const q = rng((o.seed || 1) * 31 + 7); const ph = o.phase || 0; const n = Math.max(5, Math.round(w / 7));
  add(g, () => { radial(g, x, y, w * 2.4, [[0, 'rgba(255,150,50,.30)'], [0.5, 'rgba(255,100,30,.12)'], [1, 'rgba(255,80,20,0)']]); });
  const tongue = (cx, base, hh, ww, col, a) => { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); g.moveTo(cx - ww, base); const sway = Math.sin(ph * 5 + cx * 0.3) * ww * 0.9; g.bezierCurveTo(cx - ww * 1.1, base - hh * 0.4, cx - ww * 0.3 + sway, base - hh * 0.75, cx + sway * 1.2, base - hh); g.bezierCurveTo(cx + ww * 0.4 + sway, base - hh * 0.7, cx + ww * 1.2, base - hh * 0.35, cx + ww, base); g.closePath(); g.fill(); g.globalAlpha = 1; };
  for (let i = 0; i < n; i++) { const cx = x + (q() - 0.5) * w, hh = h * (0.45 + q() * 0.7), ww = w / n * (0.9 + q() * 0.9); tongue(cx, y, hh, ww, '#a8240f', 0.95); }
  for (let i = 0; i < n; i++) { const cx = x + (q() - 0.5) * w * 0.85, hh = h * (0.38 + q() * 0.55), ww = w / n * (0.7 + q() * 0.6); tongue(cx, y, hh, ww, '#f2851c', 0.95); }
  for (let i = 0; i < n; i++) { const cx = x + (q() - 0.5) * w * 0.6, hh = h * (0.25 + q() * 0.4), ww = w / n * (0.5 + q() * 0.45); tongue(cx, y, hh, ww, '#ffd447', 0.95); }
  for (let i = 0; i < Math.max(2, n >> 1); i++) { const cx = x + (q() - 0.5) * w * 0.35; tongue(cx, y, h * (0.12 + q() * 0.2), w / n * 0.35, '#fff7d0', 0.95); }
  add(g, () => { for (let i = 0; i < n * 3; i++) { const ex = x + (q() - 0.5) * w * 1.1 + Math.sin(ph * 3 + i) * 6, ey = y - q() * h * 1.5; g.fillStyle = `rgba(255,${160 + q() * 80},60,${0.4 + q() * 0.6})`; g.fillRect(ex, ey, 2 + q() * 2, 2 + q() * 2); } });
}
/** burning wreck/building: fire plus a rising column */
export function blaze(g, x, y, size, o = {}) { smoke(g, x + size * 0.1, y - size * 0.4, size * (o.tall || 4.2), { seed: o.seed, w: size * 0.7, dark: 0.85, lean: 0.45 }); fire(g, x, y, size, size * 1.1, o); }

/** an explosion at (x,y); R is the blast radius in px; t 0 (flash) .. 1 (smoke head) */
export function explosion(g, x, y, R, t = 0.4, o = {}) {
  const q = rng((o.seed || 1) * 53 + 11);
  // ground scorch and dust ring
  blob(g, x, y + R * 0.1, R * 1.5, R * 0.9, 0.35 * (0.4 + t));
  // shockwave: a bright thin ellipse that expands fast, with a dust wall behind it
  const rr = R * (0.5 + t * 1.5); g.save(); g.translate(x, y); g.scale(1, 0.62); g.strokeStyle = `rgba(255,244,214,${0.7 * (1 - t)})`; g.lineWidth = 6 * (1 - t) + 1; g.beginPath(); g.arc(0, 0, rr, 0, 7); g.stroke(); g.strokeStyle = `rgba(190,170,130,${0.4 * (1 - t)})`; g.lineWidth = 22 * (1 - t) + 2; g.beginPath(); g.arc(0, 0, rr * 0.93, 0, 7); g.stroke(); g.restore();
  // dust and debris cloud around the base
  for (let i = 0; i < 18; i++) { const a = q() * 6.28, d = rr * (0.5 + q() * 0.6); puff(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, R * (0.28 + q() * 0.25), 0.5 * (1 - t * 0.6), 150 + q() * 30); }
  // rising smoke head (grows with t)
  const hd = R * (0.6 + t * 2.6); for (let i = 0; i < 26; i++) { const a = q() * 6.28, d = q() * R * (0.5 + t); puff(g, x + Math.cos(a) * d * 0.9 + t * R * 0.4, y - hd * (0.35 + q() * 0.65) * t - 6 + Math.sin(a) * d * 0.4, R * (0.4 + q() * 0.4 + t * 0.2), 0.62 * (1 - t * 0.4), 52 + q() * 26); }
  // fireball: stacked additive blobs from red through orange to white-hot
  const fb = R * 1.25 * (1.0 - t * 0.4) * (t < 0.15 ? 0.7 + t * 2 : 1);
  over(g, () => { radial(g, x, y - fb * 0.3, fb * 2.1, [[0, 'rgba(255,140,40,.30)'], [1, 'rgba(255,90,20,0)']]); for (let i = 0; i < 16; i++) { const a = q() * 6.28, d = q() * fb * 0.75; radial(g, x + Math.cos(a) * d, y - fb * 0.3 + Math.sin(a) * d * 0.7, fb * (0.42 + q() * 0.42), [[0, 'rgba(255,200,90,.9)'], [0.45, 'rgba(240,110,24,.85)'], [0.8, 'rgba(160,36,10,.55)'], [1, 'rgba(90,20,8,0)']]); } for (let i = 0; i < 8; i++) { const a = q() * 6.28, d = q() * fb * 0.45; radial(g, x + Math.cos(a) * d, y - fb * 0.3 + Math.sin(a) * d * 0.7, fb * (0.3 + q() * 0.25), [[0, 'rgba(255,248,210,.95)'], [0.6, 'rgba(255,200,90,.7)'], [1, 'rgba(255,150,40,0)']]); } });
  add(g, () => radial(g, x, y - fb * 0.3, fb * 0.5 * (1 - t * 0.6), [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,230,160,0)']]));
  // sparks and debris with motion streaks (bricks, planks, metal)
  for (let i = 0; i < 46; i++) { const a = q() * 6.28, sp = R * (0.5 + q() * 1.5) * (0.3 + t); const x1 = x + Math.cos(a) * sp, y1 = y - R * 0.2 + Math.sin(a) * sp * 0.65 - Math.sin(t * 3.1) * R * 0.5 * (0.4 + q()); const len = 10 + q() * 26 * (1 - t * 0.6); g.strokeStyle = i % 3 ? `rgba(255,${190 + q() * 60},90,${0.9 - t * 0.5})` : 'rgba(40,36,30,.8)'; g.lineWidth = 1.5 + q() * 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a) * len, y1 - Math.sin(a) * len * 0.65); g.stroke(); if (i % 4 === 0) { const c = ['#8a4a3a', '#c8b898', '#5a4630', '#6a6a72'][i % 4 + (q() > 0.5 ? 1 : 0)] || '#8a4a3a'; g.fillStyle = INK; g.fillRect(x1 - 1, y1 - 1, 9, 7); g.fillStyle = c; g.fillRect(x1, y1, 7, 5); } }
}
/** bricks and plaster flying out of a breached wall, towards direction dir (radians) */
export function wallBurst(g, x, y, R, dir = Math.PI / 2, seed = 1) {
  const q = rng(seed * 9 + 1);
  for (let i = 0; i < 30; i++) { const a = dir + (q() - 0.5) * 1.6, sp = R * (0.4 + q() * 1.3); const x1 = x + Math.cos(a) * sp, y1 = y + Math.sin(a) * sp * 0.7; g.strokeStyle = 'rgba(215,200,170,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + Math.cos(a) * sp * 0.4, y + Math.sin(a) * sp * 0.28); g.lineTo(x1, y1); g.stroke(); const w = 7 + q() * 10, h = 5 + q() * 6; g.save(); g.translate(x1, y1); g.rotate(q() * 6); g.fillStyle = INK; g.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2); g.fillStyle = ['#8a4a3a', '#a65a46', '#c8b898', '#7a7468', '#5a3a2a'][Math.floor(q() * 5)]; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-w / 2, -h / 2, w, 1.5); g.restore(); }
  for (let i = 0; i < 12; i++) puff(g, x + Math.cos(dir) * R * q() * 1.2 + (q() - 0.5) * R, y + Math.sin(dir) * R * q() * 0.8 + (q() - 0.5) * R * 0.5, R * (0.3 + q() * 0.35), 0.5, 170 + q() * 30);
}
export function muzzle(g, x, y, ang, s = 1) {
  add(g, () => { radial(g, x, y, 26 * s, [[0, 'rgba(255,230,160,.8)'], [1, 'rgba(255,160,40,0)']]); g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = 'rgba(255,240,190,.95)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(16 * s, -5 * s); g.lineTo(34 * s, 0); g.lineTo(16 * s, 5 * s); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(10 * s, -2.5 * s); g.lineTo(20 * s, 0); g.lineTo(10 * s, 2.5 * s); g.fill(); for (const k of [-0.6, 0.6]) { g.fillStyle = 'rgba(255,190,80,.8)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(10 * s, Math.sin(k) * 14 * s); g.lineTo(16 * s, Math.sin(k) * 4 * s); g.fill(); } g.restore(); });
}
/** a tank gun blast: big flash, a smoke ring and a dust burst below the barrel */
export function cannonBlast(g, x, y, ang, s = 1) { for (let i = 0; i < 8; i++) puff(g, x + Math.cos(ang) * (20 + i * 12) * s, y + Math.sin(ang) * (20 + i * 12) * s * 1, (10 + i * 3) * s, 0.4 - i * 0.03, 190); muzzle(g, x, y, ang, 2.2 * s); }
export function tracer(g, x1, y1, x2, y2, col = '#ffd868', w = 2.5) { add(g, () => { const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.7, rgba(col, 0.75)); gr.addColorStop(1, 'rgba(255,255,240,1)'); g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = rgba(col, 0.2); g.lineWidth = w * 4; g.stroke(); radial(g, x2, y2, 8, [[0, 'rgba(255,255,230,.9)'], [1, 'rgba(255,200,80,0)']]); }); }
/** a rocket or missile with its smoke trail (points from oldest to newest) */
export function rocket(g, pts, o = {}) {
  const n = pts.length; for (let i = 0; i < n - 1; i++) { const t = i / n; const [x, y] = pts[i]; puff(g, x, y, 7 + t * 12, 0.8 * t, 215 - (1 - t) * 30); }
  const [x, y] = pts[n - 1], [px, py] = pts[n - 3] || pts[0]; const a = Math.atan2(y - py, x - px);
  add(g, () => { radial(g, x - Math.cos(a) * 6, y - Math.sin(a) * 6, 20, [[0, 'rgba(255,230,160,.95)'], [0.4, 'rgba(255,150,40,.6)'], [1, 'rgba(255,100,20,0)']]); });
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = INK; g.fillRect(-14, -4, 26, 8); g.fillStyle = o.body || '#d8d8d0'; g.fillRect(-13, -3, 22, 6); g.fillStyle = '#c83a2a'; g.fillRect(9, -3, 5, 6); g.fillStyle = '#7a7a82'; g.fillRect(-13, -6, 5, 12); g.restore();
}
export function crater(g, x, y, r, seed = 1) {
  const q = rng(seed * 13 + 5); g.save(); g.translate(x, y); g.scale(1, 0.7);
  radial(g, 0, 0, r * 2, [[0.4, 'rgba(10,8,8,.55)'], [1, 'rgba(10,8,8,0)']]); radial(g, 0, 0, r * 1.5, [[0.55, 'rgba(120,96,62,.9)'], [0.85, 'rgba(150,120,80,.8)'], [1, 'rgba(150,120,80,0)']]);
  radial(g, -r * 0.1, -r * 0.1, r, [[0, '#17120e'], [0.75, '#2c221a'], [1, '#4a3a2a']]); g.strokeStyle = 'rgba(190,160,110,.5)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 0.98, Math.PI * 0.9, Math.PI * 1.6); g.stroke();
  for (let i = 0; i < 14; i++) { const a = q() * 6.28, d = r * (1.1 + q() * 0.7); g.fillStyle = ['#6a5438', '#3a2c20', '#8a6a46'][i % 3]; g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 3 + q() * 6, 2 + q() * 4); }
  g.restore();
}
export function scorch(g, x, y, r) { blob(g, x, y, r, r * 0.6, 0.5); }
export function dust(g, x, y, r, n = 8, seed = 1) { const q = rng(seed * 7); for (let i = 0; i < n; i++) puff(g, x + (q() - 0.5) * r * 2, y + (q() - 0.5) * r * 0.8, r * (0.5 + q() * 0.5), 0.34, 176 + q() * 24); }
/** dust trail behind a moving vehicle (from the vehicle backwards along heading) */
export function dustTrail(g, x, y, heading, len = 160, seed = 1) { const q = rng(seed * 3); const dx = -Math.sin(heading), dy = Math.cos(heading); for (let i = 0; i < 12; i++) { const t = i / 12; puff(g, x + dx * len * t + (q() - 0.5) * 20, y + dy * len * t * 0.8 + (q() - 0.5) * 12, 12 + t * 26, 0.45 * (1 - t), 170 + q() * 24); } }
/** a light pool, additive (for fires and flashes at night or in shade) */
export function glow(g, x, y, r, col = 'rgba(255,150,50,.3)') { add(g, () => radial(g, x, y, r, [[0, col], [1, 'rgba(255,100,20,0)']])); }
/** the strike marker: a red target ring that pulses (used by the UAV mock) */
export function targetRing(g, x, y, r, col = '#ff5a4a') { g.save(); g.translate(x, y); g.scale(1, 0.62); g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.62, 0, 7); g.stroke(); g.setLineDash([8, 8]); g.beginPath(); g.arc(0, 0, r * 1.25, 0, 7); g.stroke(); g.restore(); g.strokeStyle = col; g.lineWidth = 3; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.beginPath(); g.moveTo(x + dx * r * 0.4, y + dy * r * 0.25); g.lineTo(x + dx * r * 1.45, y + dy * r * 0.9); g.stroke(); } }
