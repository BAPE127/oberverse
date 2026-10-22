// Card magic (v0.52.0): Morganius Spade's playing cards, and everything he makes them do —
// orbit his fingertips, run up one arm and down the other, open into fans, wind into spirals,
// scatter and snap back together, trail behind him. One set of effects, drawn at any size, used
// in the world (a card is a few pixels tall), in the Wrath (a storm of them) and at the tables
// (src/ui/casinoTable.js, where they're big). Pure drawing: every effect is a function of time.
//
// An effect is { fx, ...params } and runs through EFFECTS[fx](ctx, params, t). The host's
// animation states (HOST_FX) are lists of effects — data, so a new state is a new list.
import { rank, suit, rankLabel, SUITS, isRed } from '../casino/cards.js';

export const PURPLE = '#b05af0';
const PURPLE_HI = '#e2b8ff';
const BACK = '#4a1e6a';
const BACK_HI = '#7a3aa8';
const GOLD = '#d9b24a';
const INK = '#1b1a24';

// ------------------------------------------------------------------ one card
/**
 * A card centred on (x, y), `h` px tall (width 0.7 h), turned `rot` radians. `card` 0–51 shows
 * the face (null: the back); `flip` from -1 to 1 squashes it sideways (turning over: the back
 * shows while flip < 0). `glow` adds a purple halo.
 */
export function drawCard(ctx, x, y, h, rot = 0, opts = {}) {
  const w = h * 0.7;
  const flip = opts.flip ?? 1;
  const sx = Math.max(0.06, Math.abs(flip));
  const face = opts.card != null && flip >= 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, 1);
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  if (opts.glow) { ctx.shadowColor = PURPLE; ctx.shadowBlur = Math.max(4, h * 0.35); }
  if (h < 9) {
    // a few pixels: a flat card with a pip
    ctx.fillStyle = face ? '#f6f2e8' : BACK;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowBlur = 0;
    if (face) { ctx.fillStyle = isRed(opts.card) ? '#c8242c' : INK; ctx.fillRect(-w * 0.18, -h * 0.18, Math.max(1, w * 0.36), Math.max(1, h * 0.36)); }
    else { ctx.fillStyle = GOLD; ctx.fillRect(-0.5, -h * 0.25, 1, h * 0.5); }
    ctx.restore();
    return;
  }
  const r = h * 0.08;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
  ctx.fillStyle = face ? '#f8f4ea' : BACK;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(0.6, h * 0.02);
  ctx.strokeStyle = face ? 'rgba(40,30,50,0.45)' : GOLD;
  ctx.stroke();
  if (face) {
    const c = opts.card;
    const red = isRed(c);
    ctx.fillStyle = red ? '#c8242c' : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = rankLabel(rank(c));
    const st = SUITS[suit(c)];
    ctx.font = `bold ${Math.round(h * 0.2)}px Georgia, serif`;
    ctx.fillText(lab, -w * 0.3, -h * 0.34);
    ctx.font = `${Math.round(h * 0.16)}px Georgia, serif`;
    ctx.fillText(st, -w * 0.3, -h * 0.17);
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.font = `bold ${Math.round(h * 0.2)}px Georgia, serif`;
    ctx.fillText(lab, -w * 0.3, -h * 0.34);
    ctx.font = `${Math.round(h * 0.16)}px Georgia, serif`;
    ctx.fillText(st, -w * 0.3, -h * 0.17);
    ctx.restore();
    const big = rank(c) >= 11 && rank(c) <= 13;
    if (big) {
      // a court card: a framed panel with a little crowned figure
      ctx.strokeStyle = red ? 'rgba(200,36,44,0.6)' : 'rgba(27,26,36,0.6)';
      ctx.strokeRect(-w * 0.26, -h * 0.3, w * 0.52, h * 0.6);
      ctx.fillStyle = GOLD;
      ctx.fillRect(-w * 0.1, -h * 0.2, w * 0.2, h * 0.06);
      ctx.fillStyle = red ? '#c8242c' : '#3a3a6a';
      ctx.fillRect(-w * 0.12, -h * 0.13, w * 0.24, h * 0.32);
      ctx.fillStyle = '#f0d2b0';
      ctx.beginPath(); ctx.arc(0, -h * 0.07, w * 0.08, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.font = `${Math.round(h * (rank(c) === 14 ? 0.5 : 0.34))}px Georgia, serif`;
      ctx.fillStyle = red ? '#c8242c' : INK;
      ctx.fillText(st, 0, h * 0.03);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  } else {
    // the back: deep purple, a gold border and a spade in a diamond — the house's own deck
    ctx.strokeStyle = BACK_HI;
    ctx.lineWidth = Math.max(0.8, h * 0.03);
    ctx.strokeRect(-w / 2 + h * 0.07, -h / 2 + h * 0.07, w - h * 0.14, h - h * 0.14);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.22); ctx.lineTo(w * 0.22, 0); ctx.lineTo(0, h * 0.22); ctx.lineTo(-w * 0.22, 0); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BACK;
    ctx.font = `${Math.round(h * 0.2)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♠', 0, h * 0.01);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// ------------------------------------------------------------------ helpers
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
/** A point `k` (0–1) along a polyline. */
function along(pts, k) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); total += l; }
  let d = ((k % 1) + 1) % 1 * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const u = segs[i] ? d / segs[i] : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * u, y: pts[i].y + (pts[i + 1].y - pts[i].y) * u, a: Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) };
    }
    d -= segs[i];
  }
  return { ...pts[0], a: 0 };
}

/** A runic circle on the floor (or, squash 1, in the air): two rings, a star, little glyph ticks. */
export function magicCircle(ctx, x, y, r, t, { squash = 0.45, alpha = 1, col = PURPLE } = {}) {
  if (r <= 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = col;
  ctx.shadowBlur = Math.max(3, r * 0.4);
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(0.8, r * 0.06);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(0.6, r * 0.035);
  ctx.strokeStyle = PURPLE_HI;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = t * 0.8 + (i * 2 * Math.PI * 2) / 5;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76);
  }
  ctx.stroke();
  ctx.strokeStyle = col;
  for (let i = 0; i < 16; i++) {
    const a = -t * 0.5 + (i / 16) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.beginPath(); ctx.moveTo(c * r * 0.82, s * r * 0.82); ctx.lineTo(c * r * 0.95, s * r * 0.95); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the effects
/** Each takes (ctx, params, t) — t in seconds. Positions are in whatever space ctx is in. */
export const EFFECTS = {
  /** n cards circling a point (a fingertip), tipped like little moons. p: x, y, r, n, h, speed, tilt */
  orbit(ctx, p, t) {
    const n = p.n || 3;
    for (let i = 0; i < n; i++) {
      const a = t * (p.speed || 2.6) + (i / n) * Math.PI * 2;
      const x = p.x + Math.cos(a) * p.r;
      const y = p.y + Math.sin(a) * p.r * (p.tilt ?? 0.45);
      drawCard(ctx, x, y, p.h, a + Math.PI / 2, { card: p.faces ? (p.seed || 0) * 7 + i * 13 : null, flip: Math.cos(a * 1.3), glow: p.glow });
    }
  },
  /** a fan opening in the hand. p: x, y, n, h, spread (radians), open 0–1, rot (the hand's angle), cards */
  fan(ctx, p) {
    const n = p.n || 5;
    const open = p.open ?? 1;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : i / (n - 1) - 0.5;
      const a = (p.rot || 0) + k * (p.spread || 1.4) * open;
      drawCard(ctx, p.x + Math.sin(a) * p.h * 0.45, p.y - Math.cos(a) * p.h * 0.45, p.h, a, { card: p.cards ? p.cards[i % p.cards.length] : null, glow: p.glow });
    }
  },
  /** a rising spiral round a column. p: x, y (the bottom), height, r, n, h, speed */
  spiral(ctx, p, t) {
    const n = p.n || 10;
    for (let i = 0; i < n; i++) {
      const k = ((t * (p.speed || 0.5)) + i / n) % 1;
      const a = k * Math.PI * 6;
      const r = p.r * (1 - k * 0.4);
      drawCard(ctx, p.x + Math.cos(a) * r, p.y - k * p.height + Math.sin(a) * r * 0.35, p.h * (0.7 + 0.3 * Math.sin(k * Math.PI)), a, { flip: Math.cos(a), alpha: Math.sin(k * Math.PI), glow: p.glow });
    }
  },
  /** cards running along a path — up one arm, over the shoulders, down the other. p: pts, n, h, speed */
  path(ctx, p, t) {
    const n = p.n || 6;
    for (let i = 0; i < n; i++) {
      const at = along(p.pts, t * (p.speed || 0.6) + i / n * (p.gap ?? 0.5));
      drawCard(ctx, at.x, at.y, p.h, at.a + Math.PI / 2, { flip: Math.cos(t * 8 + i), glow: p.glow });
    }
  },
  /** burst apart and snap back: k 0 → 0.5 flying out, 0.5 → 1 coming home. p: x, y, n, r, h, k, seed */
  scatter(ctx, p) {
    const n = p.n || 16;
    const out = p.k < 0.5 ? ease(p.k / 0.5) : 1 - ease((p.k - 0.5) / 0.5);
    for (let i = 0; i < n; i++) {
      const a = hash(i, p.seed || 1) * Math.PI * 2;
      const d = p.r * (0.4 + hash(p.seed || 1, i) * 0.6) * out;
      drawCard(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7 - out * p.r * 0.2, p.h, a * 3 * out, { flip: Math.cos(a + out * 6), glow: p.glow });
    }
  },
  /** a trail of cards behind a moving point, fluttering down. p: hist [{x,y,t}], now, h */
  trail(ctx, p) {
    for (let i = 0; i < p.hist.length; i++) {
      const q = p.hist[i];
      const age = p.now - q.t;
      if (age > 1.2 || age < 0) continue;
      drawCard(ctx, q.x + Math.sin(age * 5 + i) * 3, q.y + age * 6, p.h, age * 4 + i, { flip: Math.cos(age * 9 + i), alpha: 1 - age / 1.2 });
    }
  },
  /** a magic circle. p: x, y, r, squash, alpha */
  circle(ctx, p, t) {
    magicCircle(ctx, p.x, p.y, p.r, t, p);
  },
};

/** Run a list of effects. */
export function runEffects(ctx, list, t) {
  for (const e of list) EFFECTS[e.fx]?.(ctx, e, t);
}

// ------------------------------------------------------------------ the host in the world
/**
 * Morganius's animation states, as what his cards do around him. `x, y` are his feet (already
 * lifted off the floor), `s` the state's age in seconds, `t` the clock. Hands sit at about
 * (±7, -10) on a person 28 px tall.
 */
export const HOST_FX = {
  idle: (x, y, s, t) => [
    { fx: 'orbit', x: x - 8, y: y - 11, r: 4, n: 2, h: 3.4, speed: 2.4 },
    { fx: 'orbit', x: x + 8, y: y - 11, r: 4, n: 2, h: 3.4, speed: -2.1 },
  ],
  perform: (x, y, s, t) => {
    // he cycles through his repertoire: arms, a fan, a spiral, a scatter
    const act = Math.floor(t / 4) % 4;
    const k = (t % 4) / 4;
    if (act === 0) return [{ fx: 'path', pts: [{ x: x - 9, y: y - 10 }, { x: x - 6, y: y - 18 }, { x: x, y: y - 20 }, { x: x + 6, y: y - 18 }, { x: x + 9, y: y - 10 }], n: 6, h: 3.6, speed: 0.8, gap: 0.6 }];
    if (act === 1) return [{ fx: 'fan', x: x + 8, y: y - 12, n: 6, h: 5, spread: 1.6, open: Math.sin(k * Math.PI), rot: -0.3 }];
    if (act === 2) return [{ fx: 'spiral', x, y: y - 4, height: 30, r: 9, n: 10, h: 3.6, speed: 0.6 }];
    return [{ fx: 'scatter', x, y: y - 16, n: 14, r: 16, h: 3.4, k, seed: Math.floor(t / 16) + 3 }];
  },
  approach: (x, y, s, t) => [{ fx: 'spiral', x, y: y + 2, height: 26, r: 8, n: 8, h: 3.6, speed: 1.2, glow: true }],
  arrive: (x, y, s, t) => [
    { fx: 'circle', x, y: y + 6, r: 14 * ease(s / 0.4) * (1 - ease((s - 1.4) / 0.5)), squash: 0.42, alpha: 1 - ease((s - 1.4) / 0.5) },
    { fx: 'scatter', x, y: y - 14, n: 16, r: 22, h: 3.8, k: Math.min(1, s / 1.2), seed: 9, glow: true },
  ],
  flourish: (x, y, s, t) => [{ fx: 'fan', x: x + 8, y: y - 12, n: 7, h: 5.2, spread: 1.8, open: Math.sin(Math.min(1, s / 1.4) * Math.PI), rot: -0.2, glow: true }],
  leave: (x, y, s, t) => [{ fx: 'scatter', x, y: y - 14, n: 10, r: 14, h: 3.4, k: 0.5 + Math.min(0.5, s / 2), seed: 5 }],
};

/** Which state to show for the host now: an explicit one (npc.anim) while it lasts, else what he's doing. */
export function hostState(npc, realTime) {
  const a = npc.anim;
  if (a && a.state === 'approach' && npc.moving) return { state: 'approach', s: realTime - a.t0 };
  if (a && a.state === 'arrive' && realTime - a.t0 < 2) return { state: 'arrive', s: realTime - a.t0 };
  if (a && a.state === 'flourish' && realTime - a.t0 < 1.5) return { state: 'flourish', s: realTime - a.t0 };
  if (a && a.state === 'leave' && realTime - a.t0 < 1) return { state: 'leave', s: realTime - a.t0 };
  if (npc.activity === 'perform' && !npc.moving) return { state: 'perform', s: 0 };
  return { state: 'idle', s: 0 };
}

/** How high a floating person hovers: a slow bob, higher while gliding. */
export function floatLift(npc, t) {
  return 7 + Math.sin(t * 2.1 + (npc.x || 0) * 0.01) * 2 + (npc.moving ? 2 : 0);
}

/** The glow on the floor under a floating person. */
export function drawFloatShadow(ctx, x, y, lift, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(16,10,30,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y, 7 - lift * 0.15, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3);
  ctx.fillStyle = PURPLE;
  ctx.beginPath(); ctx.ellipse(x, y, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ sparks (v0.54.0)
/**
 * Little lights for the table scenes: a trail behind a card in flight, a burst where it lands, a
 * shimmer where a spell takes. Each spark drifts, twinkles and fades; `draw` sweeps away the dead.
 */
export class Sparks {
  constructor() {
    this.list = [];
  }

  add(x, y, t, opts = {}) {
    this.list.push({ x, y, t0: t + (opts.delay || 0), life: opts.life || 0.6, vx: opts.vx || 0, vy: opts.vy || 0, r: opts.r || 2, col: opts.col || '220,160,255' });
    if (this.list.length > 600) this.list.splice(0, this.list.length - 600);
  }

  /** A few sparks shed where a moving thing is now. */
  trail(x, y, t, size = 1) {
    for (let i = 0; i < 2; i++) this.add(x + (Math.random() - 0.5) * 8 * size, y + (Math.random() - 0.5) * 8 * size, t, { life: 0.45 + Math.random() * 0.3, vy: -10 * size, r: (1 + Math.random() * 1.6) * size, col: Math.random() < 0.3 ? '255,240,180' : '220,160,255' });
  }

  /** A ring of sparks flying out from a point (after `delay` seconds). */
  burst(x, y, t, { n = 18, size = 1, delay = 0, col = null } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = (40 + Math.random() * 70) * size;
      this.add(x, y, t, { delay, life: 0.5 + Math.random() * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 20 * size, r: (1.2 + Math.random() * 1.8) * size, col: col || (i % 3 ? '220,160,255' : '255,240,180') });
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.list = this.list.filter((p) => t - p.t0 < p.life);
    for (const p of this.list) {
      const age = t - p.t0;
      if (age < 0) continue;
      const k = age / p.life;
      const x = p.x + p.vx * age;
      const y = p.y + p.vy * age + 30 * age * age;
      const a = (1 - k) * (0.6 + 0.4 * Math.sin(age * 30 + p.x));
      ctx.fillStyle = `rgba(${p.col},${a.toFixed(2)})`;
      const r = p.r * (1 - k * 0.5);
      ctx.fillRect(x - r, y - r * 0.3, r * 2, r * 0.6);
      ctx.fillRect(x - r * 0.3, y - r, r * 0.6, r * 2);
    }
    ctx.restore();
  }
}
