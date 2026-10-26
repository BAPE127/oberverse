// The launch complex in motion (v0.58.0): the crawler rolling a rocket out to the pad, the
// countdown board, the ignition, the ascent and its trail, a vehicle lost. Everything is drawn
// from a launch description the simulation gives (Aerospace.launches(): see src/aero/launch.js) —
// no particles are kept between frames; each puff is a function of the clock.
import { rocketCanvas } from './drawAero.js';
import { puffs, debris, clockText, height } from '../aero/launch.js';

const T = 32;
const INK = '#1b1a24';
const rnd = (a, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** One puff of smoke or steam: three nested discs (shaded dark at the foot, bright at the crown), so a pile of them reads as a cloud. */
function puff(ctx, x, y, r, a, hot) {
  if (a <= 0.01 || r < 1) return;
  const warm = hot > 0.05;
  const tones = warm
    ? [`rgb(${Math.round(150 + hot * 80)},${Math.round(110 + hot * 30)},${Math.round(90 - hot * 30)})`, `rgb(${Math.round(210 + hot * 40)},${Math.round(170 + hot * 30)},${Math.round(120 - hot * 20)})`, `rgb(255,${Math.round(214 + hot * 20)},${Math.round(140 + hot * 40)})`]
    : ['#aaa9ad', '#cfced0', '#ebeae8'];
  ctx.globalAlpha = Math.min(1, a);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = tones[i];
    ctx.beginPath();
    ctx.arc(Math.round(x - r * 0.16 * i), Math.round(y - r * 0.14 * i), Math.max(1, Math.round(r * (1 - i * 0.3))), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** An engine flame: a ragged cone downward from (x, y), len and wid in pixels, flickering with `t`. */
function flame(ctx, x, y, len, wid, t, seed = 0) {
  if (len < 2) return;
  const flick = 0.85 + 0.15 * Math.sin(t * 38 + seed) + 0.1 * Math.sin(t * 71 + seed * 2);
  const L = len * flick;
  const layers = [['#e8542a', 1, 1], ['#ff9a2a', 0.78, 0.82], ['#ffd860', 0.55, 0.62], ['#fffbe8', 0.3, 0.4]];
  for (const [c, w, l] of layers) {
    ctx.fillStyle = c;
    const ww = wid * w;
    const ll = L * l;
    const j = (rnd(Math.floor(t * 30), seed) - 0.5) * wid * 0.25;
    ctx.beginPath();
    ctx.moveTo(Math.round(x - ww / 2), Math.round(y));
    ctx.lineTo(Math.round(x + ww / 2), Math.round(y));
    ctx.lineTo(Math.round(x + ww * 0.28 + j), Math.round(y + ll * 0.7));
    ctx.lineTo(Math.round(x + j * 1.5), Math.round(y + ll));
    ctx.lineTo(Math.round(x - ww * 0.28 + j), Math.round(y + ll * 0.7));
    ctx.closePath();
    ctx.fill();
  }
}

/** A glow: many faint discs from wide to small, added to what's under them, so it falls off smoothly. */
function glow(ctx, x, y, r, a, rgb = '255,170,70') {
  if (a <= 0.01) return;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgb(${rgb})`;
  for (let i = 0; i < 9; i++) {
    ctx.globalAlpha = a * 0.065;
    ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r * (1 - i * 0.1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}

/** The standing rocket's picture (the bottom of the picture is the engines). */
const rocketImg = (look) => rocketCanvas(look, { stages: 1 });

// ------------------------------------------------------------------ the crawler
/** The crawler-transporter with the rocket standing on it, at (x, y) tiles (the foot of the rocket). */
export function drawCrawler(ctx, c, time) {
  const x = Math.round(c.x * T);
  const y = Math.round(c.y * T);
  const W = 4.6 * T;
  const H = 3.4 * T;
  const rock = Math.sin(time * 9) * (c.moving ? 0.5 : 0);
  // a long soft shadow of the rocket on the ground, then the platform
  ctx.fillStyle = 'rgba(16,14,36,0.28)';
  ctx.fillRect(x + 8, y + 2, 36, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x - W / 2 - 1, y - H / 2 - 1, W + 2, H + 2);
  // four track units at the corners, treads moving with the road
  for (const [tx, ty] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x + tx * (W / 2 - 14) - 14;
    const py = y + ty * (H / 2 - 12) - 10;
    ctx.fillStyle = '#26282e'; ctx.fillRect(px, py, 28, 20);
    ctx.fillStyle = '#3a3c44'; ctx.fillRect(px, py, 28, 3);
    const off = Math.floor(c.u * 60) % 4;
    for (let k = 0; k < 7; k++) { ctx.fillStyle = '#4a4c56'; ctx.fillRect(px + 1 + ((k * 4 + off) % 26), py + 6, 2, 11); }
  }
  // the deck, striped at its edges
  ctx.fillStyle = '#9a9a92'; ctx.fillRect(x - W / 2 + 8, y - H / 2 + 6, W - 16, H - 12);
  ctx.fillStyle = '#b8b8ae'; ctx.fillRect(x - W / 2 + 8, y - H / 2 + 6, W - 16, 3);
  for (let k = 0; k < W - 16; k += 12) { ctx.fillStyle = '#e8c040'; ctx.fillRect(x - W / 2 + 8 + k, y + H / 2 - 12, 6, 4); ctx.fillStyle = INK; ctx.fillRect(x - W / 2 + 14 + k, y + H / 2 - 12, 6, 4); }
  ctx.fillStyle = '#5a5e66'; ctx.fillRect(x - 22, y - 12, 44, 22); // the launch mount
  ctx.fillStyle = '#7a7e86'; ctx.fillRect(x - 22, y - 12, 44, 3);
  // the rocket, standing, a little unsteady on its way
  const img = rocketImg(c.look);
  if (img) ctx.drawImage(img, Math.round(x - img.width / 2 + rock), Math.round(y - 6 - img.height));
  // the beacon on the crawler
  if (Math.floor(time * 2) % 2) { ctx.fillStyle = '#ff9a2a'; ctx.fillRect(x + W / 2 - 14, y - H / 2 + 8, 4, 4); }
}

// ------------------------------------------------------------------ the countdown board
/** The pad's countdown board: amber on black, "T-00:12", standing beside the pad. */
export function drawBoard(ctx, l, L) {
  const ph = l.ph;
  if (ph.phase === 'done') return;
  const x = Math.round((l.base.x + 3.4) * T);
  const y = Math.round((l.base.y + 2.7) * T);
  ctx.fillStyle = INK; ctx.fillRect(x - 31, y - 17, 62, 21);
  ctx.fillStyle = '#2a2c34'; ctx.fillRect(x - 29, y - 15, 58, 17);
  ctx.fillStyle = '#5a5e66'; ctx.fillRect(x - 21, y + 4, 3, 10); ctx.fillRect(x + 18, y + 4, 3, 10);
  const lost = ph.phase === 'lost';
  const text = lost ? 'ABORT' : clockText(ph.t);
  ctx.save();
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = lost ? '#ff4a3a' : ph.t >= 0 ? '#5fe07a' : ph.t > -L.ignitionMin ? '#ffb040' : '#ffd860';
  ctx.fillText(text, x, y - 6);
  ctx.restore();
}

// ------------------------------------------------------------------ the launch itself
/** Smoke and fire on the ground at the foot of the pad: the cloud blown across the deck and the engines' flames. */
export function drawPadFx(ctx, l, L, time) {
  const bx = l.base.x * T;
  const by = l.base.y * T;
  const ph = l.ph;
  const t = ph.t;
  if (ph.phase === 'done' && t > L.cloudLife) return;
  for (const p of puffs(L, l.seq, t, l.wind)) if (p.kind === 'ground') puff(ctx, bx + p.dx * T, by + p.dy * T + 6, p.r, p.a, p.hot);
  // the flame under the rocket while it is on the pad, and the glare it throws
  if ((ph.phase === 'ignition' || (ph.phase === 'ascent' && ph.h < 6)) && l.look) {
    const power = ph.phase === 'ignition' ? ph.burn : 1;
    const rise = ph.h * T;
    const width = (Math.max(10, l.look.w * 14) + (l.look.boosters ? 30 : 0)) * 1.15;
    flame(ctx, bx, by - rise, (30 + power * 90) * power, width, time, 1);
    glow(ctx, bx, by - rise + 14, 70 + power * 60, power);
  }
}

/** The rocket in the air and what it leaves in the sky: trail, flame, stage separation; or the moment it is lost. */
export function drawSky(ctx, l, L, time, night) {
  const bx = l.base.x * T;
  const by = l.base.y * T;
  const ph = l.ph;
  const t = ph.t;
  if (t < 0) return;
  for (const p of puffs(L, l.seq, t, l.wind)) if (p.kind === 'trail') puff(ctx, bx + p.dx * T, by + p.dy * T, p.r, p.a, p.hot);
  const img = rocketImg(l.look);
  const lost = ph.phase === 'lost' || (ph.phase === 'done' && l.seq.failT != null);
  if (!lost && img && ph.phase !== 'done') {
    const rise = ph.h * T;
    const s = 1 / (1 + ph.h / 70);
    const x = Math.round(bx);
    const y = Math.round(by - rise);
    const w = Math.round(img.width * s);
    const h = Math.round(img.height * s);
    if (ph.h >= 6) {
      const power = 1;
      flame(ctx, x, y, 110 * s + 24, (Math.max(10, l.look.w * 14) + (l.look.boosters ? 30 : 0)) * 1.15 * s, time, 2);
      glow(ctx, x, y + 10, 70 * s + 30, power);
    }
    ctx.drawImage(img, x - (w >> 1), y - h, w, h);
    if (ph.sep) {
      // the spent stage falling away behind it, and a flash where it let go
      const ts = t - L.sepAt;
      const sh = height(L, L.sepAt) * T;
      const sx = x + Math.round(l.wind * ts * 9);
      const sy = Math.round(by - sh + ts * ts * 18);
      if (ts < 2.2) { ctx.globalAlpha = Math.max(0, 1 - ts / 0.5); ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, Math.round(by - sh), 14 + ts * 20, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      if (sy < by) { ctx.fillStyle = INK; ctx.fillRect(sx - 6, sy - 17, 13, 31); ctx.fillStyle = l.look.color; ctx.fillRect(sx - 5, sy - 16, 11, 29); ctx.fillStyle = l.look.band; ctx.fillRect(sx - 5, sy - 6, 11, 3); }
    }
  }
  if (lost && ph.boom != null) {
    const b = ph.boom;
    const cy = by - height(L, l.seq.failT) * T;
    // flash, then the fireball, with burning pieces thrown out of it
    if (b < 0.45) { ctx.globalAlpha = 1 - b / 0.45; ctx.fillStyle = '#fffdf0'; ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(cy), 24 + b * 160, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    const fr = 16 + Math.min(b, 1.6) * 52;
    if (b < 2.2) {
      const a = Math.max(0, 1 - b / 2.2);
      for (const [c, k] of [['#c8402a', 1], ['#ff7a2a', 0.78], ['#ffc040', 0.5], ['#fff0b0', 0.24]]) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(Math.round(bx), Math.round(cy), fr * k, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    for (const d of debris(L, l.seq, b)) {
      const dxp = bx + d.dx * T;
      const dyp = by + d.dy * T;
      ctx.fillStyle = INK; ctx.fillRect(Math.round(dxp) - 1, Math.round(dyp) - 1, d.size + 2, d.size + 2);
      ctx.fillStyle = Math.floor(time * 10 + d.spin * 7) % 2 ? '#ff9a2a' : '#8a8478'; ctx.fillRect(Math.round(dxp), Math.round(dyp), d.size, d.size);
    }
    glow(ctx, bx, cy, 130, Math.max(0, 1 - b / 1.6), '255,150,60');
  }
}

/** The light a launch throws on the night around it: { x, y, r } in tiles (and a strength 0–1), or null. */
export function launchLight(l, L) {
  const ph = l.ph;
  const bx = l.base.x;
  const by = l.base.y;
  if (ph.phase === 'ignition') return { x: bx, y: by - 1, r: 5 + ph.burn * 8, s: 0.5 + 0.4 * ph.burn };
  if (ph.phase === 'ascent') return { x: bx, y: by - ph.h - 1, r: 16 + Math.min(ph.h, 20) * 0.6, s: 0.95 };
  if (ph.phase === 'lost' && ph.boom < 2) return { x: bx, y: by - height(L, l.seq.failT), r: 24, s: 1 - ph.boom / 2 };
  return null;
}
