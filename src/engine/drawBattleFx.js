// Fire, smoke, dust and tracers in the game's pixel look (v0.101.0, the look renderer). Every particle is drawn as hard art pixels (two screen pixels each) from a small palette ramp: fire on seven
// colours from near white to deep red, smoke on five greys, dust on five browns, translucent areas dithered with a 4x4 ordered pattern, and a dark rim on each blob, like the 1-px ink on the
// game's sprites. No gradients. There are at most `CAP` particles; the oldest go first. This is only paint: the simulation never reads it, and its few "random" numbers are hashes.
import { unit } from '../battle/hash.js';

const FIRE = ['#fff4b8', '#ffd24a', '#ff9a24', '#e8581a', '#b02a12', '#6a1408', '#2a0a08'];
const SMOKE = ['#a8a8b6', '#7e7e8c', '#585864', '#383842', '#1e1e26'];
const DUST = ['#e0cdb0', '#c0aa8c', '#98826a', '#6e5c44', '#4a3c2c'];
const SCREEN = ['#f6f6fa', '#dcdce6', '#c0c0ce', '#a2a2b2', '#84849a'];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const CAP = 600;
const PX = 2; // one art pixel is two screen pixels

const STAMPS = new Map();
/** One particle painted once to a small canvas and reused: a disc of art pixels on the ramp, a dark rim, the dither by the phase of its centre on the 4 by 4 pattern. (Thousands of one-pixel fills a frame were too slow.) */
function stamp(kind, ramp, level, r, alpha, ph, pv) {
  const key = `${kind}|${level}|${r}|${alpha}|${ph}|${pv}`; let c = STAMPS.get(key); if (c) return c;
  const n = (2 * r + 1) * PX; c = document.createElement('canvas'); c.width = n; c.height = n; const g = c.getContext('2d');
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (i * i + j * j > r * r + 1) continue;
    if (alpha < 1 && alpha < BAYER[(pv + j) & 3][(ph + i) & 3]) continue;
    const rim = i * i + j * j > (r - 1) * (r - 1);
    g.fillStyle = rim && kind !== 'spark' && kind !== 'flash' ? ramp[Math.min(ramp.length - 1, level + 2)] : ramp[level];
    g.fillRect((i + r) * PX, (j + r) * PX, PX, PX);
  }
  if (STAMPS.size > 4000) STAMPS.clear();
  STAMPS.set(key, c); return c;
}

/**
 * Particles in the isometric view: each sits at a ground point (x, y, world px) and a height z, plus a small screen-space offset
 * (ox, oy) that its own drift moves: smoke rises on the screen, sparks fall back. Callers pass the ground point and the height.
 */
export class FxLayer {
  constructor(seed = 'fx') { this.seed = seed; this.p = []; this.lines = []; this.n = 0; }
  h(k) { return unit(`${this.seed}|${this.n}|${k}`); }
  add(q) { q.z = q.z || 0; q.ox = q.ox || 0; q.oy = q.oy || 0; this.p.push(q); if (this.p.length > CAP) this.p.shift(); }
  muzzle(x, y, dx, dy, z = 0) { this.n++; this.add({ k: 'flash', x, y, z, ox: (dx - dy) * 10, oy: ((dx + dy) / 2) * 10, vx: 0, vy: 0, age: 0, life: 3, s: 2 }); }
  tracer(x0, y0, x1, y1, side, z = 0) { this.lines.push({ x0, y0, x1, y1, z, side, age: 0, life: 3 }); if (this.lines.length > 80) this.lines.shift(); }
  hit(x, y, z = 0) { this.n++; for (let i = 0; i < 4; i++) this.add({ k: 'spark', x, y, z, vx: (this.h(`a${i}`) - 0.5) * 3, vy: (this.h(`b${i}`) - 0.5) * 3 - 0.6, age: 0, life: 6 + Math.floor(this.h(`c${i}`) * 4), s: 1 }); this.add({ k: 'dust', x, y, z, vx: 0, vy: -0.2, age: 0, life: 14, s: 2 }); }
  blast(x, y, big = false, z = 0) {
    this.n++; const m = big ? 2 : 1;
    this.add({ k: 'fire', x, y, z, vx: 0, vy: 0, age: 0, life: 12 * m, s: 5 * m });
    for (let i = 0; i < 7 * m; i++) this.add({ k: 'fire', x, y, z, ox: (this.h(`x${i}`) - 0.5) * 12 * m, oy: (this.h(`y${i}`) - 0.5) * 10 * m, vx: (this.h(`vx${i}`) - 0.5) * 1.2, vy: -0.4 - this.h(`vy${i}`) * 0.8, age: 0, life: 9 + Math.floor(this.h(`l${i}`) * 8), s: 3 * m });
    for (let i = 0; i < 5 * m; i++) this.add({ k: 'smoke', x, y, z, ox: (this.h(`sx${i}`) - 0.5) * 10, oy: -4, vx: (this.h(`svx${i}`) - 0.5) * 0.5, vy: -0.5 - this.h(`svy${i}`) * 0.4, age: 0, life: 40 + Math.floor(this.h(`sl${i}`) * 30), s: 4 * m });
  }
  /** White-grey smoke screen: a long-lived puff that hardly rises. */
  cloud(x, y, z = 0) { this.n++; this.add({ k: 'screen', x, y, z, vx: (this.h('cx') - 0.5) * 0.15, vy: -0.05, age: 0, life: 90, s: 7 }); }
  /** A little flame and black smoke from a burning wreck or a burning engine. */
  flame(x, y, z = 0) { this.n++; this.add({ k: 'fire', x, y, z, ox: (this.h('fx') - 0.5) * 8, vx: 0, vy: -0.5, age: 0, life: 10, s: 2 }); this.add({ k: 'smoke', x, y, z, ox: (this.h('fy') - 0.5) * 6, oy: -6, vx: 0.05, vy: -0.6, age: 0, life: 46, s: 3 }); }
  smoke(x, y, z = 0) { this.n++; this.add({ k: 'smoke', x, y, z, ox: (this.h('sx') - 0.5) * 8, vx: (this.h('sv') - 0.3) * 0.6, vy: -0.6, age: 0, life: 50, s: 4 }); }
  step() {
    for (const q of this.p) { q.age++; q.ox += q.vx; q.oy += q.vy; if (q.k === 'smoke') { q.vx += 0.01; q.s += 0.05; } if (q.k === 'screen') q.s += 0.03; if (q.k === 'spark') q.vy += 0.25; }
    this.p = this.p.filter((q) => q.age < q.life);
    for (const l of this.lines) l.age++;
    this.lines = this.lines.filter((l) => l.age < l.life);
  }
  /** Draw in iso pixels (the caller has applied the camera); `pt(x, y, z)` gives the iso point of a world point (iso.project). */
  draw(ctx, pt) {
    for (const l of this.lines) {
      ctx.fillStyle = l.side === 'p' ? '#e8ffe0' : '#ffd9a0'; const n = 6; const a = pt(l.x0, l.y0, l.z); const b = pt(l.x1, l.y1, l.z);
      for (let i = 0; i < n; i++) { const t = (i + l.age * 0.9) / (n + 3); if (t > 1) continue; ctx.fillRect(Math.round((a.x + (b.x - a.x) * t) / PX) * PX, Math.round((a.y + (b.y - a.y) * t) / PX) * PX, PX, PX); }
    }
    for (const q of this.p) {
      const f = q.age / q.life; const r = Math.max(1, Math.round(q.s));
      let ramp; let level;
      if (q.k === 'fire' || q.k === 'flash' || q.k === 'spark') { ramp = FIRE; level = Math.min(6, Math.floor(f * 7)); if (q.k === 'flash') level = f > 0.5 ? 2 : 0; if (q.k === 'spark') level = Math.min(3, Math.floor(f * 4)); }
      else if (q.k === 'screen') { ramp = SCREEN; level = Math.min(3, Math.floor(f * 4)); }
      else if (q.k === 'dust') { ramp = DUST; level = Math.min(4, Math.floor(f * 5)); } else { ramp = SMOKE; level = Math.min(4, Math.floor(0.4 * 5 + f * 2)); }
      const alpha = q.k === 'screen' ? Math.min(0.9, 2.2 * (1 - f)) : q.k === 'smoke' || q.k === 'dust' ? 1 - f : 1;
      const p = pt(q.x, q.y, q.z);
      const cx = Math.round((p.x + q.ox) / PX) * PX; const cy = Math.round((p.y + q.oy) / PX) * PX;
      const st = stamp(q.k, ramp, level, r, Math.round(alpha * 8) / 8, (cx / PX) & 3, (cy / PX) & 3);
      ctx.drawImage(st, cx - r * PX, cy - r * PX);
    }
  }
}

/** An aircraft seen from above on the battle's pixel idiom: a fuselage, swept wings, a tail, a canopy, a shadow well below it. `ang` is its heading (east is zero); `bomber` is bigger with four engines. */
export function drawJet(g, x, y, ang, bomber = false, t = 0, part = 'all') {
  const INK = '#1b1a24'; const L = bomber ? 56 : 38; const Wd = bomber ? 62 : 34; const body = bomber ? '#6c7466' : '#7c8794'; const hi = bomber ? '#8c9486' : '#9eaab8'; const lo = bomber ? '#4c5446' : '#5a6572';
  g.save(); g.imageSmoothingEnabled = false;
  if (part !== 'body') { g.save(); g.translate(Math.round(x + (part === 'shadow' ? 0 : 18)), Math.round(y + (part === 'shadow' ? 0 : 30))); g.rotate(ang); g.fillStyle = 'rgba(16,14,36,0.28)'; g.fillRect(-L / 2, -3, L, 6); g.fillRect(-4, -Wd / 2 + 2, 10, Wd - 4); g.restore(); }
  if (part === 'shadow') { g.restore(); return; }
  g.translate(Math.round(x), Math.round(y)); g.rotate(ang);
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
  R(-L / 2 - 1, -4, L + 2, 8, INK); R(-6, -Wd / 2 - 1, 16, Wd + 2, INK);
  R(-L / 2, -3, L, 6, body); R(-L / 2, -3, L, 2, hi); R(-L / 2, 1, L, 2, lo); R(L / 2 - 8, -2, 8, 4, lo); R(L / 2 - 2, -1, 3, 2, body);
  R(-4, -Wd / 2, 12, Wd, body); R(-4, -Wd / 2, 12, 2, hi); R(-4, Wd / 2 - 2, 12, 2, lo); R(-8, -Wd / 2 + 2, 4, 5, lo); R(-8, Wd / 2 - 7, 4, 5, lo);
  R(-L / 2, -Wd / 5, 8, Wd * 0.4, body); R(-L / 2, -Wd / 5, 8, 2, hi);
  R(L / 2 - 14, -2, 6, 4, '#2a4a62'); R(L / 2 - 13, -2, 2, 1, '#9ad0ee');
  if (bomber) for (const dy of [-Wd / 3, -Wd / 8, Wd / 8, Wd / 3]) { R(-2, dy - 2, 8, 4, lo); R(-3, dy - 1, 2, 2, (Math.floor(t * 20) % 2) ? '#ffb43a' : '#ff7a2a'); } else { R(-L / 2 - 2, -1, 3, 2, (Math.floor(t * 20) % 2) ? '#ffd24a' : '#ff8a2a'); }
  g.restore();
}
