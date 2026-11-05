// Fire, smoke, dust and tracers in the game's pixel look (v0.101.0, the look renderer). Every particle is drawn as hard art pixels (two screen pixels each) from a small palette ramp: fire on seven
// colours from near white to deep red, smoke on five greys, dust on five browns, translucent areas dithered with a 4x4 ordered pattern, and a dark rim on each blob, like the 1-px ink on the
// game's sprites. No gradients. There are at most `CAP` particles; the oldest go first. This is only paint: the simulation never reads it, and its few "random" numbers are hashes.
import { unit } from '../battle/hash.js';

const FIRE = ['#fff4b8', '#ffd24a', '#ff9a24', '#e8581a', '#b02a12', '#6a1408', '#2a0a08'];
const SMOKE = ['#a8a8b6', '#7e7e8c', '#585864', '#383842', '#1e1e26'];
const DUST = ['#e0cdb0', '#c0aa8c', '#98826a', '#6e5c44', '#4a3c2c'];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const CAP = 600;
const PX = 2; // one art pixel is two screen pixels

export class FxLayer {
  constructor(seed = 'fx') { this.seed = seed; this.p = []; this.lines = []; this.n = 0; }
  h(k) { return unit(`${this.seed}|${this.n}|${k}`); }
  add(q) { this.p.push(q); if (this.p.length > CAP) this.p.shift(); }
  muzzle(x, y, dx, dy) { this.n++; this.add({ k: 'flash', x: x + dx * 10, y: y + dy * 10, vx: 0, vy: 0, age: 0, life: 3, s: 2 }); }
  tracer(x0, y0, x1, y1, side) { this.lines.push({ x0, y0, x1, y1, side, age: 0, life: 3 }); if (this.lines.length > 80) this.lines.shift(); }
  hit(x, y) { this.n++; for (let i = 0; i < 4; i++) this.add({ k: 'spark', x, y, vx: (this.h(`a${i}`) - 0.5) * 3, vy: (this.h(`b${i}`) - 0.5) * 3 - 0.6, age: 0, life: 6 + Math.floor(this.h(`c${i}`) * 4), s: 1 }); this.add({ k: 'dust', x, y, vx: 0, vy: -0.2, age: 0, life: 14, s: 2 }); }
  blast(x, y, big = false) {
    this.n++; const m = big ? 2 : 1;
    this.add({ k: 'fire', x, y, vx: 0, vy: 0, age: 0, life: 12 * m, s: 5 * m });
    for (let i = 0; i < 7 * m; i++) this.add({ k: 'fire', x: x + (this.h(`x${i}`) - 0.5) * 12 * m, y: y + (this.h(`y${i}`) - 0.5) * 10 * m, vx: (this.h(`vx${i}`) - 0.5) * 1.2, vy: -0.4 - this.h(`vy${i}`) * 0.8, age: 0, life: 9 + Math.floor(this.h(`l${i}`) * 8), s: 3 * m });
    for (let i = 0; i < 5 * m; i++) this.add({ k: 'smoke', x: x + (this.h(`sx${i}`) - 0.5) * 10, y: y - 4, vx: (this.h(`svx${i}`) - 0.5) * 0.5, vy: -0.5 - this.h(`svy${i}`) * 0.4, age: 0, life: 40 + Math.floor(this.h(`sl${i}`) * 30), s: 4 * m });
  }
  smoke(x, y) { this.n++; this.add({ k: 'smoke', x: x + (this.h('sx') - 0.5) * 8, y, vx: (this.h('sv') - 0.3) * 0.6, vy: -0.6, age: 0, life: 50, s: 4 }); }
  step() {
    for (const q of this.p) { q.age++; q.x += q.vx; q.y += q.vy; if (q.k === 'smoke') { q.vx += 0.01; q.s += 0.05; } if (q.k === 'spark') q.vy += 0.25; }
    this.p = this.p.filter((q) => q.age < q.life);
    for (const l of this.lines) l.age++;
    this.lines = this.lines.filter((l) => l.age < l.life);
  }
  /** Draw in world pixels (the caller has applied the camera). */
  draw(ctx) {
    for (const l of this.lines) { ctx.fillStyle = l.side === 'p' ? '#e8ffe0' : '#ffd9a0'; const n = 6; for (let i = 0; i < n; i++) { const t = (i + l.age * 0.9) / (n + 3); if (t > 1) continue; ctx.fillRect(Math.round((l.x0 + (l.x1 - l.x0) * t) / PX) * PX, Math.round((l.y0 + (l.y1 - l.y0) * t) / PX) * PX, PX, PX); } }
    for (const q of this.p) {
      const f = q.age / q.life; const r = Math.max(1, Math.round(q.s));
      let ramp; let level;
      if (q.k === 'fire' || q.k === 'flash' || q.k === 'spark') { ramp = FIRE; level = Math.min(6, Math.floor(f * 7)); if (q.k === 'flash') level = f > 0.5 ? 2 : 0; if (q.k === 'spark') level = Math.min(3, Math.floor(f * 4)); }
      else if (q.k === 'dust') { ramp = DUST; level = Math.min(4, Math.floor(f * 5)); } else { ramp = SMOKE; level = Math.min(4, Math.floor(0.4 * 5 + f * 2)); }
      const alpha = q.k === 'smoke' || q.k === 'dust' ? 1 - f : 1;
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r * r + 1) continue;
        const px = Math.round(q.x / PX) * PX + i * PX; const py = Math.round(q.y / PX) * PX + j * PX;
        if (alpha < 1 && alpha < BAYER[(py / PX) & 3 & 3][(px / PX) & 3 & 3]) continue;
        const rim = i * i + j * j > (r - 1) * (r - 1);
        ctx.fillStyle = rim && q.k !== 'spark' && q.k !== 'flash' ? ramp[Math.min(ramp.length - 1, level + 2)] : ramp[level];
        ctx.fillRect(px, py, PX, PX);
      }
    }
  }
}
