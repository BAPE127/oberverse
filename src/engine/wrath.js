// The Wrath — the cutscene that plays when the player attacks an imported
// (protected) character. Pure drawing, driven by the time since
// Combat.smite() and the WRATH timeline; the score (sfx_wrath) and the strike
// sounds are scheduled on the same clock. Every protected character has a
// theme (profile.wrath.theme) that dresses the same five beats:
//
//   0.0  impact — the world freezes, the camera pushes in, the sky darkens
//   0.3  the AURA unfolds around the victim, who rises off the ground
//   1.0  the banner (profile.wrath.banner / subtitle)
//   3.0  the aura converges on the player; their ground is marked
//   3.4  five STRIKES hit the player, with flashes and shake
//   5.0  the FINALE takes the player apart
//   6.6  fade to black; the victim has the last word
//
// Themes: arcane (default: runes and lightning), oil (Sir Moneybucks: coins,
// derricks, gushers, burning oil), construction (Mason: blueprints, hazard
// tape, tools, falling I-beams, a wrecking ball, a brick wall), law (Chief
// Lawrence Order: sirens, searchlights, badges and handcuffs, ramming squad
// cars, a giant gavel, a paperwork avalanche stamped GUILTY, cell bars), maths
// (Arthur Anderson: graph paper, orbiting calculator keys and bad sums, steam,
// falling digits, a giant calculator reading ERROR, division by zero), arms
// (Lucas Eastrise: a showroom spotlight, orbiting guns, bullets and price
// tags, crates of guns bursting, a missile strike, a drone swarm, a SOLD tag),
// kraken (Captain Ober: seawater floods the cobbles, tentacles burst up and
// slam down, a whirlpool, the kraken's eye opens in it, a great tentacle drags you under).
import { clamp, lerp } from '../core/util.js';
import { hash2 } from '../core/rng.js';
import { WRATH } from '../systems/combat.js';

const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const since = (g, w) => g.realTime - w.start;

/** Deterministic pseudo-random sequence. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rune glyph k as line strokes in a unit cell (a stave and angular branches). */
const GLYPHS = Array.from({ length: 24 }, (_, k) => {
  const r = (i) => hash2(k * 7 + i, k * 13 + i * 3);
  const strokes = [[0, -1, 0, 1]];
  const n = 1 + Math.floor(r(1) * 3);
  for (let i = 0; i < n; i++) {
    const y = r(i + 2) * 1.4 - 0.7;
    const side = r(i + 5) > 0.5 ? 1 : -1;
    const kind = r(i + 9);
    if (kind < 0.35) strokes.push([0, y, 0.6 * side, y - 0.5]);
    else if (kind < 0.7) strokes.push([0, y, 0.6 * side, y + 0.5]);
    else if (kind < 0.85) strokes.push([0, y - 0.3, 0.6 * side, y, 0, y + 0.3]);
    else strokes.push([-0.5, y, 0.5, y]);
  }
  return strokes;
});

function drawGlyph(ctx, k, x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (const s of GLYPHS[k % GLYPHS.length]) {
    ctx.moveTo(s[0] * size, s[1] * size);
    for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i] * size, s[i + 1] * size);
  }
  ctx.stroke();
  ctx.restore();
}

/** Jagged lightning polyline from (x1,y1) to (x2,y2), with a couple of forks. */
function bolt(x1, y1, x2, y2, seed) {
  const R = rng(seed);
  let pts = [[x1, y1], [x2, y2]];
  for (let it = 0; it < 6; it++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / (len || 1);
      const ny = (bx - ax) / (len || 1);
      const off = (R() - 0.5) * len * 0.42;
      next.push([(ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off], pts[i]);
    }
    pts = next;
  }
  const forks = [];
  for (let f = 0; f < 3; f++) {
    const i = 8 + Math.floor(R() * (pts.length - 20));
    const [sx, sy] = pts[i];
    const ang = (R() - 0.5) * 1.6 + Math.PI / 2;
    const L = 40 + R() * 80;
    forks.push(bolt2(sx, sy, sx + Math.cos(ang) * L * (R() > 0.5 ? 1 : -1), sy + Math.sin(ang) * L * 0.6, R));
  }
  return { pts, forks };
}

function bolt2(x1, y1, x2, y2, R) {
  let pts = [[x1, y1], [x2, y2]];
  for (let it = 0; it < 4; it++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      const off = (R() - 0.5) * len * 0.5;
      next.push([(ax + bx) / 2 - ((by - ay) / (len || 1)) * off, (ay + by) / 2 + ((bx - ax) / (len || 1)) * off], pts[i]);
    }
    pts = next;
  }
  return pts;
}

function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// ------------------------------------------------------------- hooks
export function wrathLift(g, w) {
  const e = since(g, w);
  if (e > WRATH.fade) return 0;
  return ease((e - 0.2) / 1.0) * 16 + Math.sin(e * 2.2) * 2 * ease((e - 0.6) / 0.6);
}

export function wrathPlayerAlpha(g, w) {
  const e = since(g, w);
  if (e < WRATH.ascend) return 1;
  return clamp(1 - (e - WRATH.ascend) / 1.2, 0, 1);
}

/** Camera: push in on the victim and the player, shake with the thunder. */
export function wrathCamera(g, w, vw, vh, baseZoom) {
  const e = since(g, w);
  const victim = g.npcs.get(w.npcId);
  const p = g.player;
  const cx = lerp(p.x, victim?.x ?? p.x, e < WRATH.converge ? 0.55 : lerp(0.55, 0.1, ease((e - WRATH.converge) / 0.6)));
  const cy = lerp(p.y, victim?.y ?? p.y, 0.5) - 26;
  const push = 1 + 0.4 * ease(e / 1.2) + 0.15 * ease((e - WRATH.lightning) / 0.4) - 0.2 * ease((e - WRATH.ascend) / 1.2);
  const zoom = baseZoom * push;
  const W = (vw * baseZoom) / zoom;
  const H = (vh * baseZoom) / zoom;
  let shake = 0;
  if (e > 0.3 && e < WRATH.converge) shake = 1.2 * ease((e - 0.3) / 2.7);
  for (const s of WRATH.strikes) if (e >= s && e < s + 0.35) shake = Math.max(shake, 9 * (1 - (e - s) / 0.35));
  if (e < 0.25) shake = Math.max(shake, 6 * (1 - e / 0.25));
  const sx = (hash2(Math.floor(e * 60), 3) - 0.5) * 2 * shake;
  const sy = (hash2(Math.floor(e * 60), 7) - 0.5) * 2 * shake;
  return { x: cx - W / 2 + sx, y: cy - H / 2 + sy, zoom };
}

// ------------------------------------------------------------ shared bits
/** Flattened ground ellipse helper: draw `fn` in a squashed space centred at (x, y). */
function onGround(ctx, x, y, fn, squash = 0.42) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  fn();
  ctx.restore();
}

function particlesRising(ctx, I, x, y, count, colours, spread = 26) {
  const R = rng(I.w.seed + 5);
  for (let i = 0; i < count; i++) {
    const delay = R() * 1.2;
    const ox = (R() - 0.5) * spread;
    const sp = 40 + R() * 90;
    const lift = R() * 30;
    const age = I.e - WRATH.ascend - delay;
    if (age < 0) continue;
    const life = clamp(1 - age / 1.8, 0, 1);
    ctx.fillStyle = colours[i % colours.length].replace('A', life.toFixed(2));
    ctx.fillRect(x + ox + Math.sin(age * 4 + i) * 6, y - 10 - lift - age * sp, 2.2, 2.2);
  }
}

// ================================================================= ARCANE
const ARCANE = {
  banner: 'THE OBERVERSE PROTECTS ITS OWN',
  sky: [40, 12, 60, 8, 2, 20],
  flash: '255,255,255',
  ground(I) {
    const { ctx, e, conv, col, p } = I;
    const sigil = (x, y, radius, alpha, spin) => {
      if (alpha <= 0) return;
      onGround(ctx, x, y, () => {
        ctx.globalAlpha = alpha;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i <= 7; i++) {
          const a = spin + (i * 3 * Math.PI * 2) / 7;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * radius * 0.8, Math.sin(a) * radius * 0.8);
        }
        ctx.stroke();
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 14; i++) {
          const a = -spin * 0.6 + (i / 14) * Math.PI * 2;
          drawGlyph(ctx, i + 3, Math.cos(a) * radius * 0.91, Math.sin(a) * radius * 0.91, 4.5, a + Math.PI / 2);
        }
      });
    };
    sigil(I.vx, I.vfeet - 2, 46 * ease((e - 0.2) / 0.8), 0.9 * (1 - conv), e * 0.9);
    sigil(p.x, p.y - 2, 58 * ease((e - WRATH.converge) / 0.5), 1 - ease((e - WRATH.fade) / 0.6), -e * 1.4);
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv, col } = I;
    if (e > 0.3 && e < WRATH.lightning) {
      const R = rng(I.w.seed + 11);
      for (let i = 0; i < 70; i++) {
        const a0 = R() * Math.PI * 2;
        const r0 = 90 + R() * 160;
        const sp = 0.6 + R() * 1.4;
        const k = (e * sp + R()) % 1;
        ctx.fillStyle = `rgba(255,240,210,${0.7 * Math.sin(k * Math.PI)})`;
        ctx.beginPath(); ctx.arc(centre.x + Math.cos(a0 + k * 4) * r0 * (1 - k), centre.y + Math.sin(a0 + k * 4) * r0 * (1 - k) * 0.7, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const rings = [{ r: 44, n: 8, sp: 0.9, size: 7 }, { r: 68, n: 12, sp: -1.4, size: 6.5 }, { r: 94, n: 16, sp: 2.1, size: 6 }];
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    rings.forEach((ring, ri) => {
      const spin = ring.sp * (e + e * e * 0.35);
      const rad = ring.r * unfold * shrink;
      ctx.strokeStyle = ri === 1 ? '#ffffff' : col;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = fadeOut * 0.35;
      ctx.beginPath(); ctx.ellipse(centre.x, centre.y, rad, rad * 0.86, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fadeOut;
      ctx.lineWidth = 2;
      for (let i = 0; i < ring.n; i++) {
        const a = spin + (i / ring.n) * Math.PI * 2;
        drawGlyph(ctx, i * 5 + ri * 3, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.86, ring.size * (1 + 0.25 * Math.sin(e * 6 + i)) * unfold, a + Math.PI / 2);
      }
    });
    ctx.restore();
  },
  strike(I, i, age) {
    if (age < 0 || age > 0.22) return;
    const { ctx, p, col, top, w } = I;
    const b = bolt(p.x + (hash2(i, w.seed) - 0.5) * 120, top, p.x + (hash2(w.seed, i) - 0.5) * 8, p.y - 20, w.seed + i * 97);
    const a = 1 - age / 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = col;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = col;
    ctx.globalAlpha = a * 0.55;
    ctx.lineWidth = 18;
    strokePath(ctx, b.pts);
    ctx.globalAlpha = a * 0.9;
    ctx.lineWidth = 8;
    strokePath(ctx, b.pts);
    ctx.lineWidth = 3;
    for (const f of b.forks) strokePath(ctx, f);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = a;
    ctx.lineWidth = 4;
    strokePath(ctx, b.pts);
    ctx.lineWidth = 1.6;
    for (const f of b.forks) strokePath(ctx, f);
    ctx.restore();
    ctx.fillStyle = `rgba(255,250,220,${a})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 26 * (1 - a * 0.5), 9, 0, 0, Math.PI * 2); ctx.fill();
  },
  after(I) {
    const { ctx, e, p } = I;
    if (e <= WRATH.lightning) return;
    ctx.fillStyle = `rgba(20,14,20,${0.5 * ease((e - WRATH.lightning) / 0.3) * (1 - ease((e - WRATH.fade) / 0.5))})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
  },
  finale(I) {
    const { ctx, e, p, top } = I;
    if (e < WRATH.ascend - 0.2 || e > WRATH.end) return;
    const k = ease((e - (WRATH.ascend - 0.2)) / 0.4) * (1 - ease((e - WRATH.fade) / 0.8));
    const pg = ctx.createLinearGradient(p.x - 30, 0, p.x + 30, 0);
    pg.addColorStop(0, 'rgba(255,255,255,0)');
    pg.addColorStop(0.5, `rgba(255,250,230,${0.85 * k})`);
    pg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - 30, top, 60, p.y - top);
    particlesRising(ctx, I, p.x, p.y, 90, ['rgba(255,170,60,A)', 'rgba(255,200,80,A)', 'rgba(255,255,230,A)']);
  },
};

// ==================================================================== OIL
function coin(ctx, x, y, r, flip, gold = '#f2c14e') {
  const wdt = Math.max(0.6, Math.abs(Math.cos(flip)) * r);
  ctx.fillStyle = '#9a6a14';
  ctx.beginPath(); ctx.ellipse(x + 1, y, wdt, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.ellipse(x, y, wdt, r, 0, 0, Math.PI * 2); ctx.fill();
  if (wdt > r * 0.55) {
    ctx.fillStyle = '#9a6a14';
    ctx.font = `bold ${Math.round(r * 1.3)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 0.5);
  }
}

function barrel(ctx, x, y, s) {
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(x - 4 * s, y - 6 * s, 8 * s, 12 * s);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(x - 4 * s, y - 3.5 * s, 8 * s, 1.4 * s);
  ctx.fillRect(x - 4 * s, y + 2 * s, 8 * s, 1.4 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x - 3 * s, y - 6 * s, 1.5 * s, 12 * s);
}

function derrick(ctx, x, y, h) {
  if (h <= 2) return;
  ctx.strokeStyle = '#2a2a30';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 9, y); ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) {
    const yy = y - (h * k) / 5;
    const half = 9 * (1 - k / 5);
    ctx.beginPath(); ctx.moveTo(x - half, yy); ctx.lineTo(x + half, yy); ctx.stroke();
  }
  ctx.fillStyle = '#c0614a';
  ctx.fillRect(x - 2, y - h - 3, 4, 3);
}

function gusher(ctx, x, yBottom, yTop, wdt, t, seed) {
  const wob = Math.sin(t * 18) * 1.5;
  const grad = ctx.createLinearGradient(x - wdt, 0, x + wdt, 0);
  grad.addColorStop(0, '#0d0907');
  grad.addColorStop(0.45, '#3a2a1a');
  grad.addColorStop(0.55, '#5a4128');
  grad.addColorStop(1, '#0d0907');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - wdt * 0.7 + wob, yTop);
  ctx.lineTo(x + wdt * 0.7 + wob, yTop);
  ctx.lineTo(x + wdt, yBottom);
  ctx.lineTo(x - wdt, yBottom);
  ctx.closePath();
  ctx.fill();
  const R = rng(seed);
  for (let i = 0; i < 18; i++) {
    const k = (t * (1.5 + R()) + R()) % 1;
    const side = R() > 0.5 ? 1 : -1;
    const vx = side * (20 + R() * 40);
    ctx.fillStyle = '#120c08';
    ctx.beginPath(); ctx.arc(x + vx * k, yTop + 60 * k * k - 20 * k, 2 + R() * 2, 0, Math.PI * 2); ctx.fill();
  }
}

function flames(ctx, x, y, wdt, h, t, seed, alpha = 1) {
  const R = rng(seed);
  for (let i = 0; i < 14; i++) {
    const fx = x + (R() - 0.5) * wdt;
    const fh = h * (0.5 + R() * 0.6) * (0.8 + 0.25 * Math.sin(t * (10 + R() * 8) + i));
    const fw = 6 + R() * 10;
    ctx.fillStyle = i % 3 === 0 ? `rgba(255,230,120,${alpha})` : i % 3 === 1 ? `rgba(255,140,40,${alpha})` : `rgba(220,60,20,${alpha * 0.85})`;
    ctx.beginPath(); ctx.moveTo(fx - fw / 2, y); ctx.quadraticCurveTo(fx - fw * 0.2, y - fh * 0.6, fx + Math.sin(t * 7 + i) * 3, y - fh); ctx.quadraticCurveTo(fx + fw * 0.2, y - fh * 0.6, fx + fw / 2, y); ctx.fill();
  }
}

const OIL = {
  banner: 'YOU CANNOT AFFORD THIS',
  sky: [30, 20, 6, 10, 6, 2],
  flash: '255,196,110',
  ground(I) {
    const { ctx, e, conv, col, vx, vfeet } = I;
    const r = 52 * ease((e - 0.2) / 0.8);
    if (r > 1 && conv < 1) {
      onGround(ctx, vx, vfeet - 2, () => {
        ctx.globalAlpha = 1 - conv;
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 48; i++) { // milled coin edge
          const a = (i / 48) * Math.PI * 2 + e * 0.6;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
        }
        ctx.font = `bold ${r * 0.9}px Georgia, serif`;
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      });
    }
    // a ring of derricks punches up out of the ground and starts spouting
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const x = vx + Math.cos(a) * 120;
      const y = vfeet + Math.sin(a) * 50;
      const h = 70 * ease((e - 0.4 - i * 0.08) / 0.6) * (1 - ease((e - WRATH.fade) / 0.5));
      derrick(ctx, x, y, h);
      if (e > 1.4 && h > 40) {
        const R = rng(I.w.seed + i);
        for (let k = 0; k < 6; k++) {
          const t = ((e - 1.4) * (1.2 + R()) + R()) % 1;
          ctx.fillStyle = '#120c08';
          ctx.beginPath(); ctx.arc(x + (R() - 0.5) * 30 * t, y - h - 30 * t + 50 * t * t, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv, vx, vy, vfeet } = I;
    // he rides a gusher of crude
    if (e > 0.3 && e < WRATH.fade) gusher(ctx, vx, vfeet + 4, vy + 2, 12 * ease((e - 0.3) / 0.4), e, I.w.seed + 3);
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.shadowColor = '#f2c14e';
    ctx.shadowBlur = 10;
    const ringDefs = [{ r: 46, n: 10, sp: 1.1, kind: 'coin' }, { r: 72, n: 8, sp: -0.8, kind: 'barrel' }, { r: 98, n: 16, sp: 1.8, kind: 'coin' }];
    ringDefs.forEach((ring, ri) => {
      const spin = ring.sp * (e + e * e * 0.35);
      const rad = ring.r * unfold * shrink;
      for (let i = 0; i < ring.n; i++) {
        const a = spin + (i / ring.n) * Math.PI * 2;
        const x = centre.x + Math.cos(a) * rad;
        const y = centre.y + Math.sin(a) * rad * 0.8;
        if (ring.kind === 'coin') coin(ctx, x, y, 6 * unfold, e * 6 + i + ri);
        else barrel(ctx, x, y, unfold);
      }
    });
    ctx.restore();
  },
  strike(I, i, age) {
    if (age < 0 || age > 1.6) return;
    const { ctx, p, top, w } = I;
    // an oil geyser erupts beneath the player; from the third strike on, it burns
    const x = p.x + (hash2(i, w.seed) - 0.5) * 24;
    const rise = ease(age / 0.12);
    const life = 1 - ease((age - 0.5) / 0.5);
    if (life <= 0) return;
    ctx.save();
    ctx.globalAlpha = life;
    gusher(ctx, x, p.y + 4, lerp(p.y, top, rise), 16 + (1 - rise) * 10, I.e, w.seed + i * 31);
    if (i >= 2) flames(ctx, x, p.y + 4, 36, lerp(20, 120, rise), I.e, w.seed + i, life);
    ctx.restore();
  },
  after(I) {
    const { ctx, e, p } = I;
    if (e <= WRATH.lightning) return;
    const r = 34 * ease((e - WRATH.lightning) / 0.8);
    const fade = 1 - ease((e - WRATH.fade) / 0.6);
    ctx.fillStyle = `rgba(14,10,8,${0.9 * fade})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, r + 10, r * 0.36 + 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(160,140,200,${0.25 * fade})`; // oily sheen
    ctx.beginPath(); ctx.ellipse(p.x - r * 0.3, p.y, r * 0.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (e > WRATH.strikes[2]) flames(ctx, p.x, p.y + 2, r * 2, 26, e, I.w.seed + 77, fade);
  },
  finale(I) {
    const { ctx, e, p, top, w } = I;
    if (e < WRATH.ascend - 0.2 || e > WRATH.end) return;
    const k = ease((e - (WRATH.ascend - 0.2)) / 0.4) * (1 - ease((e - WRATH.fade) / 0.8));
    // a pillar of burning oil and black smoke
    const pg = ctx.createLinearGradient(p.x - 40, 0, p.x + 40, 0);
    pg.addColorStop(0, 'rgba(255,120,30,0)');
    pg.addColorStop(0.5, `rgba(255,190,80,${0.85 * k})`);
    pg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - 40, top, 80, p.y - top);
    flames(ctx, p.x, p.y + 4, 60, 110 * k, e, w.seed + 99, k);
    const R = rng(w.seed + 41);
    for (let i = 0; i < 16; i++) {
      const t = ((e - WRATH.ascend) * (0.4 + R() * 0.4) + R()) % 1;
      ctx.fillStyle = `rgba(20,16,14,${0.55 * k * (1 - t)})`;
      ctx.beginPath(); ctx.arc(p.x + (R() - 0.5) * 50 + t * 20, p.y - 90 - t * 160, 12 + t * 26, 0, Math.PI * 2); ctx.fill();
    }
    // and it rains money
    for (let i = 0; i < 40; i++) {
      const sx = p.x + (R() - 0.5) * 420;
      const sp = 140 + R() * 120;
      const t0 = R() * 1.2;
      const age = e - WRATH.ascend - t0;
      if (age < 0) continue;
      const y = top + age * sp;
      if (y > p.y + 60) continue;
      coin(ctx, sx + Math.sin(age * 3 + i) * 10, y, 5, age * 9 + i);
    }
    particlesRising(ctx, I, p.x, p.y, 60, ['rgba(255,190,70,A)', 'rgba(255,120,40,A)', 'rgba(242,193,78,A)']);
  },
};

// =========================================================== CONSTRUCTION
function hazardRing(ctx, x, y, rad, spin, wdt) {
  ctx.lineWidth = wdt;
  ctx.strokeStyle = '#f2c14e';
  ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#1e1b18';
  ctx.setLineDash([9, 9]);
  ctx.lineDashOffset = -spin * 40;
  ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
}

function tool(ctx, kind, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  if (kind === 0) { // hammer
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-1.5, -2, 3, 14);
    ctx.fillStyle = '#9aa3ab'; ctx.fillRect(-6, -6, 12, 5);
  } else if (kind === 1) { // wrench
    ctx.strokeStyle = '#b8c0c8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7, 4, 0.6, Math.PI * 2 - 0.6); ctx.stroke();
  } else if (kind === 2) { // trowel
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-1.2, 2, 2.4, 8);
    ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 2); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fill();
  } else { // brick
    ctx.fillStyle = '#b4553a'; ctx.fillRect(-6, -3, 12, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-6, 1.5, 12, 1.5);
  }
  ctx.restore();
}

function nail(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#d8dde2';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
  ctx.fillStyle = '#d8dde2';
  ctx.fillRect(-2.5, -7, 5, 1.6);
  ctx.restore();
}

function ibeam(ctx, x, y, len, rot, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#8a3b2b';
  ctx.fillRect(-len / 2, -7, len, 4);
  ctx.fillRect(-len / 2, 3, len, 4);
  ctx.fillStyle = '#6a2b20';
  ctx.fillRect(-len / 2, -3, len, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-len / 2, -7, len, 1.2);
  for (let k = -len / 2 + 6; k < len / 2; k += 12) { ctx.fillStyle = '#3a1a14'; ctx.fillRect(k, -6, 1.5, 1.5); }
  ctx.restore();
}

function dust(ctx, x, y, age, seed, scale = 1) {
  const R = rng(seed);
  for (let i = 0; i < 10; i++) {
    const a = R() * Math.PI;
    const d = (20 + R() * 40) * scale * ease(age / 0.6);
    ctx.fillStyle = `rgba(200,190,170,${0.55 * (1 - ease(age / 0.9))})`;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d * (R() > 0.5 ? 1 : -1), y - Math.sin(a) * d * 0.4, (8 + R() * 10) * scale * (0.5 + age), 0, Math.PI * 2); ctx.fill();
  }
}

const CONSTRUCTION = {
  banner: 'DEMOLITION ORDER APPROVED',
  sky: [10, 22, 44, 4, 10, 24],
  flash: '235,225,205',
  ground(I) {
    const { ctx, e, conv, vx, vfeet, p } = I;
    // the blueprint spreads across the ground
    const r = 170 * ease((e - 0.2) / 1.0) * (1 - ease((e - WRATH.fade) / 0.6));
    if (r > 2) {
      onGround(ctx, vx, vfeet, () => {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(20,60,120,0.35)';
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = 'rgba(140,210,255,0.55)';
        ctx.lineWidth = 1;
        for (let k = -r; k < r; k += 16) {
          ctx.beginPath(); ctx.moveTo(k, -r); ctx.lineTo(k, r); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-r, k); ctx.lineTo(r, k); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200,240,255,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-60, -60, 120, 120);
        ctx.beginPath(); ctx.moveTo(-60, -76); ctx.lineTo(60, -76); ctx.stroke();
        ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
        ctx.fillStyle = 'rgba(200,240,255,0.95)';
        ctx.textAlign = 'center';
        ctx.fillText('LOAD-BEARING · M.N.', 0, -84);
      });
    }
    // orange spray-paint X under Mason, then under the player
    const mark = (x, y, a, label) => {
      if (a <= 0) return;
      onGround(ctx, x, y, () => {
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ff7a2a';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke();
        if (label) {
          ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
          ctx.fillStyle = '#ff7a2a';
          ctx.textAlign = 'center';
          ctx.fillText(label, 0, 64);
        }
      }, 0.45);
    };
    mark(vx, vfeet, ease((e - 0.3) / 0.4) * (1 - conv), '');
    mark(p.x, p.y, ease((e - WRATH.converge) / 0.4) * (1 - ease((e - WRATH.fade) / 0.5)), 'DEMOLISH');
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv, vx, vy, top } = I;
    // Mason rides an I-beam up on a crane cable
    if (e > 0.2 && e < WRATH.fade) {
      const a = ease((e - 0.2) / 0.4);
      ctx.strokeStyle = `rgba(40,40,46,${a})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(vx - 18, vy + 2); ctx.lineTo(vx, vy - 70); ctx.lineTo(vx + 18, vy + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx, vy - 70); ctx.lineTo(vx, top); ctx.stroke();
      ctx.fillStyle = `rgba(242,193,78,${a})`;
      ctx.fillRect(vx - 4, vy - 76, 8, 8); // the hook block
      ibeam(ctx, vx, vy + 6, 60, 0, a);
    }
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    const spinBase = e + e * e * 0.35;
    ctx.save();
    ctx.globalAlpha = fadeOut;
    hazardRing(ctx, centre.x, centre.y, 46 * unfold * shrink, spinBase * 1.2, 6);
    for (let i = 0; i < 8; i++) {
      const a = -spinBase * 0.9 + (i / 8) * Math.PI * 2;
      const rad = 72 * unfold * shrink;
      tool(ctx, i % 4, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, unfold * 1.1, a + spinBase * 2);
    }
    hazardRing(ctx, centre.x, centre.y, 98 * unfold * shrink, -spinBase * 1.6, 4);
    for (let i = 0; i < 18; i++) {
      const a = spinBase * 1.8 + (i / 18) * Math.PI * 2;
      const rad = 112 * unfold * shrink;
      nail(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, a + Math.PI / 2);
    }
    ctx.restore();
  },
  strike(I, i, age) {
    const { ctx, p, top, w } = I;
    if (i < 4) {
      // a steel I-beam drops out of the sky onto the player
      if (age < -0.25 || age > 2.5) return;
      const rot = (hash2(i, w.seed) - 0.5) * 1.6;
      const tx = p.x + (hash2(w.seed, i) - 0.5) * 20;
      const ty = p.y - 10 - i * 7;
      const k = ease((age + 0.25) / 0.25);
      const fade = 1 - ease((I.e - WRATH.fade) / 0.4);
      ibeam(ctx, tx, lerp(top - 20, ty, k), 74, rot + (1 - k) * 0.6, fade);
      if (age >= 0) {
        dust(ctx, tx, p.y, age, w.seed + i * 13);
        if (age < 0.15) {
          ctx.fillStyle = `rgba(255,220,140,${1 - age / 0.15})`;
          for (let s = 0; s < 8; s++) ctx.fillRect(tx + Math.cos(s * 0.8) * 30 * (age / 0.15), ty + Math.sin(s * 0.8) * 12 * (age / 0.15), 2, 2);
        }
      }
      return;
    }
    // the last one: a wrecking ball
    if (age < -0.35 || age > 2.5) return;
    const pivot = { x: p.x - 130, y: p.y - 270 };
    const L = Math.hypot(130, 270 - 22);
    const th0 = Math.atan2(130, 270 - 22);
    let th;
    if (age < 0) th = th0 - 1.15 * (1 - ease((age + 0.35) / 0.35));
    else th = th0 - 0.18 * Math.sin(age * 5) * Math.exp(-age * 2.5);
    const bx = pivot.x + Math.sin(th) * L;
    const by = pivot.y + Math.cos(th) * L;
    const fade = 1 - ease((I.e - WRATH.fade) / 0.4);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(pivot.x, top - 40); ctx.lineTo(pivot.x, pivot.y); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1e1e24';
    ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(bx - 8, by - 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (age >= 0) dust(ctx, p.x, p.y, age, w.seed + 501, 1.6);
  },
  after() {},
  finale(I) {
    const { ctx, e, p, w } = I;
    if (e < WRATH.ascend - 0.1 || e > WRATH.end) return;
    // a brick wall builds itself over the player, is condemned, and comes down
    const rows = 10;
    const built = Math.floor(ease((e - WRATH.ascend) / 1.0) * rows);
    const collapse = ease((e - (WRATH.fade - 0.3)) / 0.9);
    const R = rng(w.seed + 61);
    for (let row = 0; row < built; row++) {
      for (let c = 0; c < 6; c++) {
        const bx = p.x - 33 + c * 11 + (row % 2 ? 5.5 : 0);
        if (bx > p.x + 30) continue;
        const by = p.y + 2 - (row + 1) * 7;
        const fall = collapse * (40 + R() * 70) * (1 + row * 0.15);
        const drift = collapse * (R() - 0.5) * 60;
        ctx.save();
        ctx.translate(bx + drift, by + fall);
        ctx.rotate(collapse * (R() - 0.5) * 3);
        ctx.globalAlpha = 1 - ease((e - WRATH.fade - 0.6) / 0.5);
        ctx.fillStyle = (row + c) % 3 ? '#b4553a' : '#9a4a32';
        ctx.fillRect(0, 0, 10, 6);
        ctx.fillStyle = 'rgba(230,220,200,0.5)';
        ctx.fillRect(0, 5, 10, 1);
        ctx.restore();
      }
    }
    if (e > WRATH.ascend + 1.1 && collapse < 0.2) {
      const s = 1 + 0.4 * (1 - ease((e - WRATH.ascend - 1.1) / 0.15));
      ctx.save();
      ctx.translate(p.x, p.y - 38);
      ctx.rotate(-0.18);
      ctx.scale(s, s);
      ctx.strokeStyle = '#d0302a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-38, -10, 76, 20);
      ctx.fillStyle = '#d0302a';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CONDEMNED', 0, 1);
      ctx.restore();
    }
    if (collapse > 0) dust(ctx, p.x, p.y, (e - (WRATH.fade - 0.3)), w.seed + 777, 2);
  },
};

// ================================================================= LAW
function badge(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = '#e8c35a';
  ctx.beginPath();
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? 4.2 : 9;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1e2a44';
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function cuffs(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.strokeStyle = '#c9ced4';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(-6, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(6, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.stroke();
  ctx.restore();
}

function stamp(ctx, x, y, text, s, rot, colour = '#d0302a', alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.globalAlpha *= alpha;
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  const tw = ctx.measureText(text).width;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.strokeRect(-tw / 2 - 5, -9, tw + 10, 18);
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/** A squad car seen from above-ish, facing +x (flip with dir). */
function squadCar(ctx, x, y, dir, t, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-30, 4, 62, 8);
  ctx.fillStyle = '#1e2a44';
  rrect(ctx, -32, -14, 64, 22, 5); ctx.fill();
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(-14, -14, 26, 22);
  ctx.fillStyle = '#9ec4e8';
  ctx.fillRect(12, -11, 9, 16); // windscreen
  ctx.fillStyle = '#1e2a44';
  ctx.font = 'bold 6px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', -1, 0);
  const on = Math.floor(t * 12) % 2;
  ctx.fillStyle = on ? '#ff2a2a' : '#5a1010';
  ctx.fillRect(-6, -18, 5, 4);
  ctx.fillStyle = on ? '#1a2a5a' : '#3a7aff';
  ctx.fillRect(0, -18, 5, 4);
  ctx.fillStyle = '#111';
  for (const wx of [-22, 20]) { ctx.fillRect(wx, 6, 9, 4); ctx.fillRect(wx, -16, 9, 3); }
  ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const LAW = {
  banner: 'YOU HAVE THE RIGHT TO REMAIN SILENT',
  sky: [10, 16, 40, 2, 4, 14],
  flash: '220,230,255',
  ground(I) {
    const { ctx, e, conv, vx, vfeet, p, top } = I;
    const life = ease((e - 0.2) / 0.6) * (1 - ease((e - WRATH.fade) / 0.6));
    // sirens: alternating red/blue wash around the scene
    if (life > 0) {
      const red = Math.floor(e * 5) % 2 === 0;
      const cx = lerp(vx, p.x, 0.5);
      const g2 = ctx.createRadialGradient(cx, vfeet, 10, cx, vfeet, 320);
      g2.addColorStop(0, red ? `rgba(255,40,40,${0.22 * life})` : `rgba(60,110,255,${0.22 * life})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(cx - 320, vfeet - 320, 640, 640);
      // two searchlights sweep down from the sky and lock onto the player
      for (let k = 0; k < 2; k++) {
        const sweep = Math.sin(e * 1.6 + k * 2.4) * 120 * (1 - conv);
        const tx = lerp(vx + sweep + (k ? 40 : -40), p.x, conv);
        const ty = lerp(vfeet, p.y, conv);
        const sx = tx + (k ? 160 : -160);
        ctx.fillStyle = `rgba(255,250,220,${0.13 * life})`;
        ctx.beginPath(); ctx.moveTo(sx - 6, top); ctx.lineTo(tx - 34, ty); ctx.lineTo(tx + 34, ty); ctx.lineTo(sx + 6, top); ctx.closePath(); ctx.fill();
        onGround(ctx, tx, ty, () => {
          ctx.fillStyle = `rgba(255,250,220,${0.22 * life})`;
          ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
        });
      }
    }
    // a ring of police tape around Lawrence, then a chalk outline under the player
    const tape = ease((e - 0.3) / 0.6) * (1 - conv);
    if (tape > 0) {
      onGround(ctx, vx, vfeet, () => {
        ctx.globalAlpha = tape;
        ctx.strokeStyle = '#f2d23a';
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.font = 'bold 7px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + e * 0.4;
          ctx.save();
          ctx.translate(Math.cos(a) * 70, Math.sin(a) * 70);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillText('POLICE LINE', 0, 0);
          ctx.restore();
        }
      }, 0.45);
    }
    const chalk = ease((e - WRATH.converge) / 0.5) * (1 - ease((e - WRATH.fade) / 0.5));
    if (chalk > 0) {
      onGround(ctx, p.x, p.y, () => {
        ctx.globalAlpha = chalk;
        ctx.strokeStyle = '#f4f4ee';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -40, 10, 0, Math.PI * 2); // head
        ctx.moveTo(0, -30); ctx.lineTo(0, 10); // body
        ctx.moveTo(0, -20); ctx.lineTo(-24, -32); ctx.moveTo(0, -20); ctx.lineTo(22, -6); // arms
        ctx.moveTo(0, 10); ctx.lineTo(-16, 36); ctx.moveTo(0, 10); ctx.lineTo(18, 34); // legs
        ctx.stroke();
      }, 0.5);
    }
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv } = I;
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    const spin = e + e * e * 0.35;
    ctx.save();
    ctx.globalAlpha = fadeOut;
    for (let i = 0; i < 8; i++) {
      const a = spin * 1.1 + (i / 8) * Math.PI * 2;
      const rad = 48 * unfold * shrink;
      badge(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, unfold * 1.1, a);
    }
    for (let i = 0; i < 10; i++) {
      const a = -spin * 1.4 + (i / 10) * Math.PI * 2;
      const rad = 80 * unfold * shrink;
      cuffs(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, unfold, a * 2);
    }
    for (let i = 0; i < 6; i++) {
      const a = spin * 0.8 + (i / 6) * Math.PI * 2;
      const rad = 116 * unfold * shrink;
      stamp(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, i % 2 ? 'CASE CLOSED' : 'DENIED', 0.8 * unfold, Math.sin(a) * 0.3);
    }
    ctx.restore();
  },
  strike(I, i, age) {
    const { ctx, p, top, w } = I;
    const fade = 1 - ease((I.e - WRATH.fade) / 0.4);
    if (i < 4) {
      // squad cars ram in from alternating sides, skid, and stay parked with lights going
      if (age < -0.3) return;
      const dir = i % 2 ? -1 : 1;
      const rest = p.x - dir * (30 + i * 4);
      const ty = p.y - 4 + (i - 1.5) * 10;
      const x = age < 0 ? lerp(rest - dir * 360, rest, ease((age + 0.3) / 0.3)) : rest - dir * 6 * Math.exp(-age * 6) * Math.sin(age * 30);
      squadCar(ctx, x, ty, dir, I.e + i, fade);
      if (age >= 0 && age < 0.5) {
        dust(ctx, p.x, p.y, age, w.seed + i * 17, 0.8);
        ctx.fillStyle = `rgba(255,230,160,${1 - age / 0.5})`;
        for (let s = 0; s < 6; s++) ctx.fillRect(p.x - dir * 10 + Math.cos(s) * 18 * (age / 0.3), ty - 6 + Math.sin(s * 1.7) * 10, 2, 2);
      }
      return;
    }
    // the last one: a giant gavel comes down from the sky
    if (age < -0.4) return;
    const k = age < 0 ? ease((age + 0.4) / 0.4) : 1;
    const bounce = age >= 0 ? Math.sin(age * 9) * 6 * Math.exp(-age * 4) : 0;
    const head = { x: p.x, y: lerp(top - 30, p.y - 26, k) - Math.abs(bounce) };
    const handleRot = lerp(-1.1, 0, k);
    ctx.save();
    ctx.globalAlpha = fade * (1 - ease((age - 1.0) / 0.4));
    ctx.translate(head.x, head.y);
    ctx.rotate(handleRot);
    ctx.fillStyle = '#6a3a1e';
    ctx.fillRect(-4, -110, 8, 100); // handle up into the sky
    ctx.fillStyle = '#8a5230';
    rrect(ctx, -42, -16, 84, 32, 6); ctx.fill();
    ctx.fillStyle = '#e8c35a';
    ctx.fillRect(-30, -16, 6, 32); ctx.fillRect(24, -16, 6, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-42, -16, 84, 5);
    ctx.restore();
    if (age >= 0) {
      dust(ctx, p.x, p.y, age, w.seed + 911, 1.8);
      if (age < 0.25) {
        onGround(ctx, p.x, p.y, () => {
          ctx.strokeStyle = `rgba(255,240,200,${1 - age / 0.25})`;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 30 + age * 400, 0, Math.PI * 2); ctx.stroke();
        });
      }
    }
  },
  after() {},
  finale(I) {
    const { ctx, e, p, w } = I;
    if (e < WRATH.ascend - 0.1 || e > WRATH.end) return;
    // a blizzard of paperwork buries the player…
    const R = rng(w.seed + 303);
    const pile = ease((e - WRATH.ascend) / 1.1);
    const out = 1 - ease((e - WRATH.fade - 0.6) / 0.5);
    ctx.save();
    ctx.globalAlpha = out;
    for (let i = 0; i < 70; i++) {
      const delay = R() * 1.1;
      const age = e - WRATH.ascend - delay;
      const fx = (R() - 0.5) * 60;
      const restY = p.y + 2 - R() * 46 * pile;
      const rot0 = (R() - 0.5) * 2;
      if (age < 0) continue;
      const fall = ease(age / 0.6);
      const x = p.x + fx * (0.4 + 0.6 * fall) + Math.sin(age * 6 + i) * 10 * (1 - fall);
      const y = lerp(p.y - 220, restY, fall);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot0 + (1 - fall) * Math.sin(age * 5 + i) * 1.5);
      ctx.fillStyle = i % 5 ? '#f4f1e6' : '#f0e2a8';
      ctx.fillRect(-7, -9, 14, 18);
      ctx.fillStyle = 'rgba(40,40,60,0.45)';
      for (let l = 0; l < 4; l++) ctx.fillRect(-5, -6 + l * 4, 10 - (l % 2) * 3, 1);
      ctx.restore();
    }
    ctx.restore();
    // …is stamped GUILTY…
    if (e > WRATH.ascend + 1.0) {
      const s = 1 + 0.6 * (1 - ease((e - WRATH.ascend - 1.0) / 0.15));
      stamp(ctx, p.x, p.y - 34, 'GUILTY', 1.6 * s, -0.16, '#d0302a', out);
    }
    // …and the cell bars come down
    const drop = ease((e - (WRATH.ascend + 1.3)) / 0.35);
    if (drop > 0) {
      const by = lerp(p.y - 260, p.y - 70, drop);
      ctx.save();
      ctx.globalAlpha = out;
      ctx.fillStyle = '#3a3e46';
      ctx.fillRect(p.x - 48, by, 96, 6);
      ctx.fillRect(p.x - 48, by + 76, 96, 6);
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = '#5a5e66';
        ctx.fillRect(p.x - 44 + k * 11, by, 4, 82);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(p.x - 44 + k * 11, by, 1, 82);
      }
      ctx.restore();
    }
  },
};

// ================================================================= MATHS
const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
const SUMS = ['2+2=5', 'x÷0', '∑', 'π≠3', '√−1', '∞', '1/0', '%', 'NaN', 'ERR'];

function calcKey(ctx, x, y, s, label, rot, hot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = hot ? '#ff4a3a' : '#3a3a40';
  rrect(ctx, -7, -7, 14, 14, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-6, -6, 12, 3);
  ctx.fillStyle = '#f4efe6';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

/** A seven-segment LCD readout. */
function lcd(ctx, x, y, w, h, text, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#2a2a2e';
  rrect(ctx, x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 5); ctx.fill();
  ctx.fillStyle = '#9fb48a';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = '#1e2a14';
  ctx.font = `bold ${Math.round(h * 0.7)}px "Courier New", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2 - 4, y + 1);
  ctx.restore();
}

const MATHS = {
  banner: 'YOU DON\'T ADD UP',
  sky: [60, 6, 4, 18, 2, 2],
  flash: '255,110,90',
  ground(I) {
    const { ctx, e, conv, vx, vfeet, p } = I;
    // graph paper spreads out from Arthur, axes and all
    const r = 180 * ease((e - 0.2) / 1.0) * (1 - ease((e - WRATH.fade) / 0.6));
    if (r > 2) {
      onGround(ctx, vx, vfeet, () => {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(250,240,230,0.12)';
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = 'rgba(255,90,70,0.35)';
        ctx.lineWidth = 1;
        for (let k = -r; k < r; k += 12) {
          ctx.beginPath(); ctx.moveTo(k, -r); ctx.lineTo(k, r); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-r, k); ctx.lineTo(r, k); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,200,180,0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
        // y = 1/x, plotted in anger
        ctx.strokeStyle = 'rgba(255,60,40,0.9)';
        ctx.lineWidth = 3;
        for (const sgn of [1, -1]) {
          ctx.beginPath();
          for (let x = 4; x < r; x += 4) ctx.lineTo(sgn * x, -sgn * (900 / x));
          ctx.stroke();
        }
      });
    }
    // under the player: the target — a ring with ÷0
    const mark = ease((e - WRATH.converge) / 0.4) * (1 - ease((e - WRATH.fade) / 0.5));
    if (mark > 0) {
      onGround(ctx, p.x, p.y, () => {
        ctx.globalAlpha = mark;
        ctx.strokeStyle = '#ff3a2a';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke();
        ctx.font = 'bold 30px Georgia, serif';
        ctx.fillStyle = '#ff3a2a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('÷0', 0, 2);
      }, 0.45);
    }
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv, vx, vy } = I;
    // his anger, made visible: steam jets
    if (e > 0.3 && e < WRATH.fade) {
      for (let k = 0; k < 8; k++) {
        const ph = (e * 1.4 + k / 8) % 1;
        ctx.fillStyle = `rgba(255,${120 + k * 10},${100},${0.35 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(vx + (k - 3.5) * 5 + Math.sin(e * 4 + k) * 4, vy - 50 - ph * 70, 4 + ph * 9, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    const spin = e + e * e * 0.35;
    ctx.save();
    ctx.globalAlpha = fadeOut;
    for (let i = 0; i < 16; i++) {
      const a = spin * 1.2 + (i / 16) * Math.PI * 2;
      const rad = 60 * unfold * shrink;
      calcKey(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, unfold * 1.05, KEYS[i], a * 0.5, Math.floor(e * 6) % 16 === i);
    }
    ctx.font = 'italic bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < SUMS.length; i++) {
      const a = -spin * 0.8 + (i / SUMS.length) * Math.PI * 2;
      const rad = 112 * unfold * shrink;
      ctx.fillStyle = i % 3 ? '#ffd8c8' : '#ff4a3a';
      ctx.fillText(SUMS[i], centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8);
    }
    ctx.restore();
  },
  strike(I, i, age) {
    const { ctx, p, top, w } = I;
    const fade = 1 - ease((I.e - WRATH.fade) / 0.4);
    if (i < 4) {
      // giant digits fall out of the sky and slam down on the player
      if (age < -0.25 || age > 2.5) return;
      const digit = ['7', '3', '9', '1'][i];
      if (I.e > WRATH.ascend + 0.4) return; // cleared away for the finale
      const k = ease((age + 0.25) / 0.25);
      const tx = p.x + (hash2(w.seed, i) - 0.5) * 40;
      const ty = lerp(top - 30, p.y - 4 - i * 4, k);
      ctx.save();
      ctx.globalAlpha = fade * (1 - ease((I.e - WRATH.ascend) / 0.4));
      ctx.translate(tx, ty);
      ctx.rotate((hash2(i, w.seed) - 0.5) * 0.5 * (1 - k * 0.6));
      ctx.font = 'bold 70px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2a0a08';
      ctx.strokeText(digit, 0, 0);
      ctx.fillStyle = '#ff3a2a';
      ctx.fillText(digit, 0, 0);
      ctx.restore();
      if (age >= 0) dust(ctx, tx, p.y, age, w.seed + i * 19, 0.9);
      return;
    }
    // the last one: a giant calculator comes down like a stamp, reading ERROR
    if (age < -0.35 || age > 2.5) return;
    const k = age < 0 ? ease((age + 0.35) / 0.35) : 1;
    const bounce = age >= 0 ? Math.abs(Math.sin(age * 10)) * 6 * Math.exp(-age * 5) : 0;
    const cy = lerp(top - 120, p.y - 60, k) - bounce;
    ctx.save();
    ctx.globalAlpha = fade * (1 - ease((age - 1.1) / 0.4));
    ctx.fillStyle = '#2a2a30';
    rrect(ctx, p.x - 50, cy - 70, 100, 136, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(p.x - 50, cy - 70, 100, 8);
    lcd(ctx, p.x, cy - 44, 80, 24, Math.floor(I.e * 8) % 2 ? 'ERROR' : 'E', 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) calcKey(ctx, p.x - 33 + c * 22, cy - 6 + r * 18, 1.15, KEYS[r * 4 + c], 0, r === 0 && c === 3);
    ctx.restore();
    if (age >= 0) {
      dust(ctx, p.x, p.y, age, w.seed + 913, 1.8);
      if (age < 0.25) {
        onGround(ctx, p.x, p.y, () => {
          ctx.strokeStyle = `rgba(255,140,110,${1 - age / 0.25})`;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 30 + age * 420, 0, Math.PI * 2); ctx.stroke();
        });
      }
    }
  },
  after() {},
  finale(I) {
    const { ctx, e, p, w } = I;
    if (e < WRATH.ascend - 0.1 || e > WRATH.end) return;
    // the player is divided by zero: they come apart into pixels and numbers…
    const age = e - WRATH.ascend;
    const out = 1 - ease((e - WRATH.fade - 0.6) / 0.5);
    const R = rng(w.seed + 707);
    const cols = ['#c9302a', '#f2efe8', '#2a2224', '#e2b896', '#3a6a8a'];
    ctx.save();
    ctx.globalAlpha = out;
    for (let i = 0; i < 90; i++) {
      const ox = (R() - 0.5) * 22;
      const oy = -R() * 46;
      const a = Math.atan2(oy + 23, ox) + (R() - 0.5) * 0.8;
      const sp = 30 + R() * 110;
      const d = sp * ease(age / 1.4);
      const x = p.x + ox + Math.cos(a) * d;
      const y = p.y + oy + Math.sin(a) * d * 0.7 - age * 12;
      if (i % 3 === 0) {
        ctx.fillStyle = '#ff6a50';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillText(String(Math.floor(R() * 10)), x, y);
      } else {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(x, y, 3, 3);
      }
    }
    ctx.restore();
    // …and the readout says what they are now
    if (age > 0.6) {
      const text = age < 1.1 ? (Math.floor(e * 12) % 2 ? '÷0' : '1/0') : 'UNDEFINED';
      lcd(ctx, p.x, p.y - 70, 120, 26, text, out * ease((age - 0.6) / 0.2));
    }
  },
};

// ================================================================= ARMS
function gunShape(ctx, x, y, s, rot, colour = '#2a2a2e') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = colour;
  ctx.fillRect(-8, -3, 16, 4); // slide/barrel
  ctx.fillRect(-7, 0, 5, 7); // grip
  ctx.fillRect(-2, 1, 3, 2); // trigger guard
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-8, -3, 16, 1);
  ctx.restore();
}

function bullet(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#d8a83a';
  ctx.fillRect(-3, -1.5, 5, 3);
  ctx.fillStyle = '#b87a3a';
  ctx.beginPath(); ctx.arc(2, 0, 1.5, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.restore();
}

function crate(ctx, x, y, s, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(-14, -12, 28, 24);
  ctx.strokeStyle = '#5a3e22';
  ctx.lineWidth = 2;
  ctx.strokeRect(-13, -11, 26, 22);
  ctx.beginPath(); ctx.moveTo(-13, -11); ctx.lineTo(13, 11); ctx.stroke();
  ctx.fillStyle = '#2a2a2e';
  ctx.font = 'bold 6px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NOT GUNS', 0, 2);
  ctx.restore();
}

function quad(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#1e1e22';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(-4, -3, 8, 6);
  ctx.fillStyle = Math.floor(t * 10) % 2 ? '#ff3a2a' : '#3aff6a';
  ctx.fillRect(-1, -1, 2, 2);
  ctx.fillStyle = 'rgba(200,200,210,0.5)';
  for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { ctx.beginPath(); ctx.ellipse(dx, dy, 5, 1.5, t * 30, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function priceTag(ctx, x, y, s, rot, text) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = '#f4e6b8';
  ctx.strokeStyle = '#6a4a1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, -10); ctx.lineTo(18, -10); ctx.lineTo(28, 0); ctx.lineTo(18, 10); ctx.lineTo(-26, 10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6a4a1e';
  ctx.beginPath(); ctx.arc(19, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c0302a';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, -4, 1);
  ctx.restore();
}

function fireball(ctx, x, y, age, seed) {
  const R = rng(seed);
  const life = 1 - ease(age / 1.2);
  if (life <= 0) return;
  for (let i = 0; i < 16; i++) {
    const a = R() * Math.PI * 2;
    const d = (10 + R() * 50) * ease(age / 0.5);
    const rr = (8 + R() * 16) * (0.6 + age);
    ctx.fillStyle = i % 3 === 0 ? `rgba(60,50,45,${0.6 * life})` : i % 3 === 1 ? `rgba(255,${120 + Math.floor(R() * 80)},40,${0.8 * life})` : `rgba(255,230,140,${0.7 * life})`;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - Math.abs(Math.sin(a)) * d * 0.8 - 10, rr, 0, Math.PI * 2); ctx.fill();
  }
}

const ARMS = {
  banner: 'EVERYTHING IS FOR SALE',
  sky: [40, 30, 8, 8, 6, 2],
  flash: '255,225,160',
  ground(I) {
    const { ctx, e, conv, vx, vfeet, p } = I;
    // a showroom spotlight under Lucas: velvet and gold
    const r = 120 * ease((e - 0.2) / 0.9) * (1 - conv * 0.6) * (1 - ease((e - WRATH.fade) / 0.6));
    if (r > 2) {
      onGround(ctx, vx, vfeet, () => {
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gr.addColorStop(0, 'rgba(255,220,140,0.45)');
        gr.addColorStop(1, 'rgba(120,20,30,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(216,168,58,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.stroke();
      });
    }
    // under the player: a red reticle
    const mark = ease((e - WRATH.converge) / 0.4) * (1 - ease((e - WRATH.fade) / 0.5));
    if (mark > 0) {
      onGround(ctx, p.x, p.y, () => {
        ctx.globalAlpha = mark;
        ctx.strokeStyle = '#ff3a2a';
        ctx.lineWidth = 3;
        for (const rr of [16, 30, 44]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-56, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(56, 0); ctx.moveTo(0, -56); ctx.lineTo(0, -8); ctx.moveTo(0, 8); ctx.lineTo(0, 56); ctx.stroke();
      }, 0.45);
    }
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv } = I;
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    const spin = e + e * e * 0.35;
    ctx.save();
    ctx.globalAlpha = fadeOut;
    for (let i = 0; i < 8; i++) {
      const a = spin * 1.1 + (i / 8) * Math.PI * 2;
      const rad = 54 * unfold * shrink;
      gunShape(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, unfold * 1.3, a + Math.PI / 2, i % 2 ? '#2a2a2e' : '#5a4a3a');
    }
    for (let i = 0; i < 20; i++) {
      const a = -spin * 1.6 + (i / 20) * Math.PI * 2;
      const rad = 86 * unfold * shrink;
      bullet(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, a + Math.PI / 2);
    }
    for (let i = 0; i < 6; i++) {
      const a = spin * 0.7 + (i / 6) * Math.PI * 2;
      const rad = 118 * unfold * shrink;
      priceTag(ctx, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.8, 0.7 * unfold, Math.sin(a) * 0.4, ['$$$', 'SALE', '50% OFF', 'NO REFUNDS', 'AS IS', 'FINAL'][i]);
    }
    ctx.restore();
  },
  strike(I, i, age) {
    const { ctx, p, top, w } = I;
    const fade = 1 - ease((I.e - WRATH.fade) / 0.4);
    if (i < 4) {
      // crates of guns drop out of the sky and burst
      if (age < -0.25 || I.e > WRATH.ascend + 0.4) return;
      const tx = p.x + (hash2(w.seed, i) - 0.5) * 50;
      const ty = p.y - 6 - i * 3;
      if (age < 0) { crate(ctx, tx, lerp(top - 20, ty, ease((age + 0.25) / 0.25)), 1.2, fade); return; }
      const R = rng(w.seed + i * 31);
      const life = 1 - ease(age / 1.0);
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI * (0.15 + R() * 0.7);
        const sp = 60 + R() * 70;
        const gx = tx + Math.cos(a) * sp * age;
        const gy = ty + Math.sin(a) * sp * age + 160 * age * age;
        ctx.globalAlpha = life * fade;
        gunShape(ctx, gx, gy, 1.1, age * 8 + k);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(tx + Math.cos(a + 1) * sp * age * 0.6 - 4, ty + Math.sin(a) * sp * age * 0.6 + 100 * age * age - 2, 8, 3); // splinters
      }
      ctx.globalAlpha = 1;
      if (age < 0.4) dust(ctx, tx, p.y, age, w.seed + i * 7, 0.7);
      return;
    }
    // the last one: a missile streaks in
    if (age < -0.4 || I.e > WRATH.end) return;
    if (age < 0) {
      const k = ease((age + 0.4) / 0.4);
      const sx = p.x + 260;
      const sy = top - 40;
      const mx = lerp(sx, p.x, k);
      const my = lerp(sy, p.y - 10, k);
      ctx.strokeStyle = 'rgba(220,220,220,0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(p.y - 10 - sy, p.x - sx));
      ctx.fillStyle = '#c9ced4';
      ctx.fillRect(-14, -3, 22, 6);
      ctx.fillStyle = '#c0302a';
      ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 0); ctx.lineTo(8, 3); ctx.fill();
      ctx.fillStyle = '#ffb84a';
      ctx.beginPath(); ctx.arc(-15, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    fireball(ctx, p.x, p.y, age, w.seed + 55);
    dust(ctx, p.x, p.y, age, w.seed + 66, 1.8);
  },
  after() {},
  finale(I) {
    const { ctx, e, p, w } = I;
    if (e < WRATH.ascend - 0.1 || e > WRATH.end) return;
    const age = e - WRATH.ascend;
    const out = 1 - ease((e - WRATH.fade - 0.6) / 0.5);
    // a drone swarm circles in…
    ctx.save();
    ctx.globalAlpha = out;
    for (let i = 0; i < 8; i++) {
      const a = age * 2.2 + (i / 8) * Math.PI * 2;
      const rad = lerp(160, 46, ease(age / 1.2));
      quad(ctx, p.x + Math.cos(a) * rad, p.y - 30 + Math.sin(a) * rad * 0.5 - 20, 1, e + i);
    }
    ctx.restore();
    // …and a giant price tag swings down on its string: SOLD
    const drop = ease((age - 0.8) / 0.5);
    if (drop > 0) {
      const ty = lerp(I.top - 60, p.y - 70, drop);
      const swing = Math.sin(age * 5) * 0.25 * Math.exp(-(age - 0.8) * 2);
      ctx.save();
      ctx.globalAlpha = out;
      ctx.strokeStyle = '#6a4a1e';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x, I.top - 60); ctx.lineTo(p.x, ty - 26); ctx.stroke();
      priceTag(ctx, p.x, ty, 2.4, Math.PI / 2 + swing, 'SOLD');
      ctx.restore();
    }
  },
};


// ================================================================= KRAKEN
// Captain Ober: the cobbles flood, tentacles burst up round the attacker, a
// whirlpool opens, the kraken's eye rises — and drags them under.
const SEA = '#1e5a6a';

/** A tapered tentacle along a quadratic curve from its root (bx, by) to its tip; suckers on the inside. */
function tentacle(ctx, bx, by, cx, cy, tx, ty, thick, alpha = 1) {
  const n = 22;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx;
    const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ty;
    const r = thick * (1 - t * 0.85);
    ctx.fillStyle = i % 2 ? '#7a2a4a' : '#8a3456';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (i % 3 === 0 && t < 0.9) {
      ctx.fillStyle = '#e8b8c8';
      ctx.beginPath(); ctx.arc(x + r * 0.45, y + r * 0.2, r * 0.32, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function splash(ctx, x, y, age, seed, scale = 1) {
  const R = rng(seed);
  const life = 1 - ease(age / 0.9);
  if (life <= 0) return;
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI * (0.1 + R() * 0.8);
    const sp = (60 + R() * 120) * scale;
    const px = x + Math.cos(a) * sp * age;
    const py = y + Math.sin(a) * sp * age + 220 * age * age;
    ctx.fillStyle = `rgba(${170 + Math.floor(R() * 60)},230,245,${0.8 * life})`;
    ctx.beginPath(); ctx.arc(px, py, (2 + R() * 3) * scale, 0, Math.PI * 2); ctx.fill();
  }
  onGround(ctx, x, y, () => {
    ctx.strokeStyle = `rgba(220,245,255,${0.7 * life})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 10 + age * 70 * scale, 0, Math.PI * 2); ctx.stroke();
  });
}

const KRAKEN = {
  banner: 'THE DEEP REMEMBERS',
  sky: [8, 40, 52, 2, 14, 22],
  flash: '200,240,255',
  ground(I) {
    const { ctx, e, conv, vx, vfeet, p } = I;
    // seawater wells up through the cobbles around the Captain
    const r = 130 * ease((e - 0.2) / 1.0) * (1 - ease((e - WRATH.fade) / 0.7));
    if (r > 2) {
      onGround(ctx, vx, vfeet, () => {
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gr.addColorStop(0, 'rgba(30,90,106,0.75)');
        gr.addColorStop(0.8, 'rgba(30,90,106,0.45)');
        gr.addColorStop(1, 'rgba(30,90,106,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,240,255,0.5)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { const rr = ((e * 40 + k * 40) % r); ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
      });
    }
    // under the player: a whirlpool
    const w = ease((e - WRATH.converge) / 0.5) * (1 - ease((e - WRATH.end + 0.4) / 0.5));
    if (w > 0) {
      onGround(ctx, p.x, p.y, () => {
        ctx.fillStyle = `rgba(10,40,52,${0.8 * w})`;
        ctx.beginPath(); ctx.arc(0, 0, 70 * w, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(180,235,250,${0.6 * w})`;
        ctx.lineWidth = 2.5;
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) {
            const t = k / 40;
            const a = arm * (Math.PI * 2 / 3) + t * 5 + e * 4;
            const rr = 70 * w * (1 - t);
            if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.stroke();
        }
      }, 0.45);
    }
  },
  aura(I) {
    const { ctx, e, centre, unfold, conv } = I;
    if (unfold <= 0 || e > WRATH.ascend + 0.3) return;
    const fade = 1 - ease((e - WRATH.ascend) / 0.3);
    // three small tentacles curl up around the Captain, and bubbles rise
    const R = rng(I.w.seed + 11);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + e * 0.6;
      const bx = centre.x + Math.cos(a) * 46 * (1 - conv * 0.4);
      const by = centre.y + 30 + Math.sin(a) * 16;
      const sway = Math.sin(e * 3 + i * 2) * 14;
      tentacle(ctx, bx, by, bx + sway, by - 40 * unfold, bx + sway * 1.8, by - 70 * unfold, 6, fade);
    }
    for (let i = 0; i < 24; i++) {
      const ph = (e * 0.8 + R()) % 1;
      ctx.fillStyle = `rgba(200,240,255,${0.6 * (1 - ph) * fade})`;
      ctx.beginPath(); ctx.arc(centre.x + (R() - 0.5) * 120, centre.y + 30 - ph * 110, 1.5 + R() * 3, 0, Math.PI * 2); ctx.fill();
    }
  },
  strike(I, i, age) {
    const { ctx, p, w } = I;
    if (age < 0 || I.e > WRATH.ascend + 0.4) return;
    // tentacles burst up through the cobbles round the player and slam down
    const side = i % 2 ? 1 : -1;
    const off = (40 + hash2(w.seed, i) * 30) * side;
    const bx = p.x + off;
    const by = p.y + 8 + (i % 3) * 4;
    const rise = ease(age / 0.25);
    const slam = ease((age - 0.25) / 0.2);
    const tx = lerp(bx + off * 0.3, p.x + side * 6, slam);
    const ty = lerp(by - 120 * rise, p.y - 16, slam);
    const out = 1 - ease((age - 0.7) / 0.4);
    if (out <= 0) return;
    tentacle(ctx, bx, by, bx + off * 0.5, by - 90 * rise, tx, ty, 11 + (i === 4 ? 6 : 0), out);
    if (age < 0.4) splash(ctx, bx, by, age, w.seed + i * 13, 0.9);
    if (age > 0.25 && age < 1.0) splash(ctx, p.x, p.y, age - 0.25, w.seed + i * 17, 0.7);
  },
  after() {},
  finale(I) {
    const { ctx, e, p, w } = I;
    if (e < WRATH.ascend - 0.1 || e > WRATH.end) return;
    const age = e - WRATH.ascend;
    const out = 1 - ease((e - WRATH.fade - 0.6) / 0.5);
    // the eye opens in the whirlpool beneath the player…
    const eye = ease(age / 0.8) * out;
    if (eye > 0) {
      ctx.save();
      ctx.globalAlpha = eye;
      ctx.fillStyle = '#5a1e3a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 62, 24 * eye, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8d84a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 44, 16 * eye, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0c10';
      ctx.beginPath(); ctx.ellipse(p.x + Math.sin(age * 2) * 6, p.y + 6, 6, 15 * eye, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // …and the great tentacle wraps the player and pulls them under
    const wrap = ease((age - 0.5) / 0.6);
    if (wrap > 0) {
      const sink = ease((age - 1.1) / 0.6);
      tentacle(ctx, p.x - 90, p.y + 20, p.x - 120, p.y - 90 * wrap, p.x + 8, p.y - 24 + sink * 30, 18, out);
      if (sink > 0) {
        ctx.fillStyle = `rgba(10,40,52,${0.9 * sink * out})`;
        ctx.fillRect(p.x - 40, p.y - 50 + (1 - sink) * 50, 80, 60 * sink);
        splash(ctx, p.x, p.y, (age - 1.1) * 0.8, w.seed + 99, 1.5);
      }
    }
  },
};

export const THEMES = { arcane: ARCANE, oil: OIL, construction: CONSTRUCTION, law: LAW, maths: MATHS, arms: ARMS, kraken: KRAKEN };

// -------------------------------------------------------------- draw
export function drawWrath(renderer, g, w) {
  const theme = THEMES[w.theme] || ARCANE;
  const ctx = renderer.ctx;
  const e = since(g, w);
  const W = renderer.canvas.width;
  const H = renderer.canvas.height;
  const dpr = renderer.dpr;
  const { zoom } = renderer.cam;
  const victim = g.npcs.get(w.npcId);
  const p = g.player;
  const col = w.color;

  // 1. the sky darkens toward the theme's colour
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dark = 0.8 * ease(e / 1.2);
  const [r1, g1, b1, r2, g2, b2] = theme.sky;
  const vs = victim ? renderer.toScreen(victim.x, victim.y - 30) : { x: W / 2, y: H / 2 };
  const grad = ctx.createRadialGradient(vs.x, vs.y, 30 * dpr, vs.x, vs.y, Math.max(W, H));
  grad.addColorStop(0, `rgba(${r1},${g1},${b1},${dark * 0.3})`);
  grad.addColorStop(1, `rgba(${r2},${g2},${b2},${dark})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. the world-space layers
  ctx.setTransform(zoom, 0, 0, zoom, -renderer.cam.x * zoom, -renderer.cam.y * zoom);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const vx = victim?.x ?? p.x;
  const vfeet = victim?.y ?? p.y;
  const vy = vfeet - wrathLift(g, w);
  const conv = ease((e - WRATH.converge) / 0.4);
  const I = {
    ctx, e, g, w, p, victim, col, vx, vy, vfeet, conv, dpr,
    centre: { x: lerp(vx, p.x, conv), y: lerp(vy - 24, p.y - 22, conv) },
    unfold: ease((e - WRATH.runes) / 0.9),
    top: renderer.cam.y - 40,
  };
  theme.ground(I);
  theme.after(I);
  theme.aura(I);
  // the victim's eyes burn
  if (victim && e > 0.6 && e < WRATH.fade) {
    const hy = vy - 37 * (victim.profile.appearance.height || 1);
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fffbe8';
    ctx.globalAlpha = (0.6 + 0.4 * Math.sin(e * 10)) * ease((e - 0.6) / 0.5);
    for (const dx of victim.facing === 'left' ? [-4.5] : victim.facing === 'right' ? [4.5] : victim.facing === 'up' ? [] : [-3.6, 3.6]) {
      ctx.beginPath(); ctx.arc(vx + dx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  WRATH.strikes.forEach((s, i) => theme.strike(I, i, e - s));
  theme.finale(I);

  // 3. screen-space: flashes, letterbox, banner, the last word
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let flash = e < 0.12 ? 0.6 * (1 - e / 0.12) : 0;
  for (const s of WRATH.strikes) if (e >= s && e < s + 0.16) flash = Math.max(flash, 0.85 * (1 - (e - s) / 0.16));
  if (e >= WRATH.ascend && e < WRATH.ascend + 0.3) flash = Math.max(flash, 0.7 * (1 - (e - WRATH.ascend) / 0.3));
  if (flash > 0) {
    ctx.fillStyle = `rgba(${theme.flash},${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  const bars = ease(e / 0.6) * H * 0.1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, bars);
  ctx.fillRect(0, H - bars, W, bars);

  const bannerA = ease((e - WRATH.banner) / 0.6) * (1 - ease((e - (WRATH.fade - 0.4)) / 0.5));
  if (bannerA > 0) {
    const title = victim?.profile.wrath?.banner || theme.banner;
    const sub = victim?.profile.wrath?.subtitle || `${victim?.profile.name || 'They'} cannot be harmed by mortal hands.`;
    const sz = Math.min(46 * dpr, W / (title.length * 0.72)); // leaves room for the letter-spacing settle
    ctx.save();
    ctx.globalAlpha = bannerA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${sz}px Georgia, "Times New Roman", serif`;
    const y = bars + sz * 1.2;
    const spacing = lerp(sz * 0.9, sz * 0.18, ease((e - WRATH.banner) / 1.2));
    const widths = [...title].map((ch) => ctx.measureText(ch).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let x = W / 2 - total / 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 22 * dpr;
    ctx.fillStyle = '#fff3cf';
    [...title].forEach((ch, i) => {
      const jitter = e > WRATH.lightning && e < WRATH.ascend ? (hash2(i, Math.floor(e * 30)) - 0.5) * 4 * dpr : 0;
      ctx.fillText(ch, x + widths[i] / 2 - spacing / 2, y + jitter);
      x += widths[i];
    });
    ctx.shadowBlur = 0;
    ctx.font = `italic ${Math.max(13 * dpr, sz * 0.38)}px Georgia, serif`;
    ctx.fillStyle = 'rgba(255,243,207,0.9)';
    ctx.fillText(sub, W / 2, y + sz * 0.95);
    ctx.restore();
  }

  const black = ease((e - WRATH.fade) / 1.0);
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`;
    ctx.fillRect(0, 0, W, H);
    const qa = ease((e - WRATH.fade - 0.4) / 0.8);
    if (qa > 0 && victim) {
      ctx.save();
      ctx.globalAlpha = qa;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sz = Math.min(24 * dpr, W / 36);
      ctx.font = `italic ${sz}px Georgia, serif`;
      ctx.fillStyle = '#efe6d2';
      const words = `“${w.line}”`.split(' ');
      const lines = [];
      let line = '';
      for (const wd of words) {
        const t = line ? `${line} ${wd}` : wd;
        if (ctx.measureText(t).width > Math.min(W * 0.7, 820 * dpr) && line) { lines.push(line); line = wd; } else line = t;
      }
      lines.push(line);
      const y0 = bars + sz * 1.6; // above the card that follows
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * sz * 1.4));
      ctx.font = `${sz * 0.75}px Georgia, serif`;
      ctx.fillStyle = col;
      ctx.fillText(`— ${victim.profile.name}`, W / 2, y0 + lines.length * sz * 1.4 + sz * 0.6);
      ctx.restore();
    }
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
