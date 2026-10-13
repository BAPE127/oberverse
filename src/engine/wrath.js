// "The Oberverse Protects Its Own" — the cutscene that plays when the player
// attacks an imported (protected) character. Pure drawing, driven by the time
// since Combat.smite() and the WRATH timeline; the music (sfx_wrath) and the
// thunder (sfx_thunder) are scheduled on the same clock.
//
//   0.0  impact — the world freezes, the camera pushes in, the sky darkens
//   0.3  three rings of runes unfold around the victim, who rises off the ground
//   1.0  the banner: THE OBERVERSE PROTECTS ITS OWN
//   3.0  the runes converge on the player; a sigil opens beneath their feet
//   3.4  lightning — five strikes, white-out flashes, the screen shakes
//   5.0  a pillar of light; the player comes apart into embers and rises
//   6.6  fade to black; the victim has the last word
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

// -------------------------------------------------------------- draw
export function drawWrath(renderer, g, w) {
  const ctx = renderer.ctx;
  const e = since(g, w);
  const W = renderer.canvas.width;
  const H = renderer.canvas.height;
  const dpr = renderer.dpr;
  const { zoom } = renderer.cam;
  const victim = g.npcs.get(w.npcId);
  const p = g.player;
  const col = w.color;
  const toWorld = () => ctx.setTransform(zoom, 0, 0, zoom, -renderer.cam.x * zoom, -renderer.cam.y * zoom);

  // 1. the sky darkens toward the victim's colour (stronger away from the light)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dark = 0.8 * ease(e / 1.2);
  const vs = victim ? renderer.toScreen(victim.x, victim.y - 30) : { x: W / 2, y: H / 2 };
  const grad = ctx.createRadialGradient(vs.x, vs.y, 30 * dpr, vs.x, vs.y, Math.max(W, H));
  grad.addColorStop(0, `rgba(40,12,60,${dark * 0.3})`);
  grad.addColorStop(1, `rgba(8,2,20,${dark})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  toWorld();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const vx = victim?.x ?? p.x;
  const vy = (victim?.y ?? p.y) - wrathLift(g, w);
  const conv = ease((e - WRATH.converge) / 0.4);
  const centre = { x: lerp(vx, p.x, conv), y: lerp(vy - 24, p.y - 22, conv) };

  // 2. swirling motes drawn in toward the victim
  if (e > 0.3 && e < WRATH.lightning) {
    const R = rng(w.seed + 11);
    for (let i = 0; i < 70; i++) {
      const a0 = R() * Math.PI * 2;
      const r0 = 90 + R() * 160;
      const sp = 0.6 + R() * 1.4;
      const k = ((e * sp + R()) % 1);
      const r = r0 * (1 - k);
      const a = a0 + k * 4;
      ctx.fillStyle = `rgba(255,240,210,${0.7 * Math.sin(k * Math.PI)})`;
      ctx.beginPath(); ctx.arc(centre.x + Math.cos(a) * r, centre.y + Math.sin(a) * r * 0.7, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 3. ground sigils: under the victim from the start, under the player from the convergence
  const sigil = (x, y, radius, alpha, spin) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.42);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); // a heptagram
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
    ctx.restore();
  };
  sigil(vx, (victim?.y ?? p.y) - 2, 46 * ease((e - 0.2) / 0.8), 0.9 * (1 - conv), e * 0.9);
  sigil(p.x, p.y - 2, 58 * ease((e - WRATH.converge) / 0.5), 1 - ease((e - WRATH.fade) / 0.6), -e * 1.4);

  // 4. three standing rings of runes, counter-rotating, accelerating, then converging on the player
  const unfold = ease((e - WRATH.runes) / 0.9);
  const rings = [{ r: 44, n: 8, sp: 0.9, size: 7 }, { r: 68, n: 12, sp: -1.4, size: 6.5 }, { r: 94, n: 16, sp: 2.1, size: 6 }];
  if (unfold > 0 && e < WRATH.ascend + 0.3) {
    const shrink = lerp(1, 0.55, conv) * (1 - ease((e - WRATH.lightning) / 0.5) * 0.4);
    const fadeOut = 1 - ease((e - WRATH.ascend) / 0.3);
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = fadeOut;
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
        const pulse = 1 + 0.25 * Math.sin(e * 6 + i);
        drawGlyph(ctx, i * 5 + ri * 3, centre.x + Math.cos(a) * rad, centre.y + Math.sin(a) * rad * 0.86, ring.size * pulse * unfold, a + Math.PI / 2);
      }
    });
    ctx.restore();
  }

  // 5. the victim's eyes burn
  if (victim && e > 0.6 && e < WRATH.fade) {
    const hx = victim.x;
    const hy = vy - 37 * (victim.profile.appearance.height || 1);
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fffbe8';
    const glow = 0.6 + 0.4 * Math.sin(e * 10);
    ctx.globalAlpha = glow * ease((e - 0.6) / 0.5);
    for (const dx of victim.facing === 'left' ? [-4.5] : victim.facing === 'right' ? [4.5] : victim.facing === 'up' ? [] : [-3.6, 3.6]) {
      ctx.beginPath(); ctx.arc(hx + dx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // 6. lightning
  for (let i = 0; i < WRATH.strikes.length; i++) {
    const s = WRATH.strikes[i];
    const age = e - s;
    if (age < 0 || age > 0.22) continue;
    const top = renderer.cam.y - 40;
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
    // scorch and sparks where it lands
    ctx.fillStyle = `rgba(255,250,220,${a})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 26 * (1 - a * 0.5), 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (e > WRATH.lightning) {
    ctx.fillStyle = `rgba(20,14,20,${0.5 * ease((e - WRATH.lightning) / 0.3) * (1 - ease((e - WRATH.fade) / 0.5))})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 30, 10, 0, 0, Math.PI * 2); ctx.fill(); // scorch mark
  }

  // 7. the pillar of light and the embers
  if (e > WRATH.ascend - 0.2 && e < WRATH.end) {
    const k = ease((e - (WRATH.ascend - 0.2)) / 0.4) * (1 - ease((e - WRATH.fade) / 0.8));
    const top = renderer.cam.y - 40;
    const pg = ctx.createLinearGradient(p.x - 30, 0, p.x + 30, 0);
    pg.addColorStop(0, 'rgba(255,255,255,0)');
    pg.addColorStop(0.5, `rgba(255,250,230,${0.85 * k})`);
    pg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - 30, top, 60, p.y - top);
    const R = rng(w.seed + 5);
    for (let i = 0; i < 90; i++) {
      const delay = R() * 1.2;
      const age = e - WRATH.ascend - delay;
      if (age < 0) { R(); R(); continue; }
      const ox = (R() - 0.5) * 26;
      const sp = 40 + R() * 90;
      const y = p.y - 10 - (R() * 30) - age * sp;
      const x = p.x + ox + Math.sin(age * 4 + i) * 6;
      const life = clamp(1 - age / 1.8, 0, 1);
      ctx.fillStyle = i % 3 ? `rgba(255,${150 + (i % 5) * 20},60,${life})` : `rgba(255,255,230,${life})`;
      ctx.fillRect(x, y, 2.2, 2.2);
    }
  }

  // 8. screen-space: flashes, letterbox, banner, the last word
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let flash = e < 0.12 ? 0.6 * (1 - e / 0.12) : 0;
  for (const s of WRATH.strikes) if (e >= s && e < s + 0.16) flash = Math.max(flash, 0.9 * (1 - (e - s) / 0.16));
  if (e >= WRATH.ascend && e < WRATH.ascend + 0.3) flash = Math.max(flash, 0.7 * (1 - (e - WRATH.ascend) / 0.3));
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  const bars = ease(e / 0.6) * H * 0.1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, bars);
  ctx.fillRect(0, H - bars, W, bars);

  const bannerA = ease((e - WRATH.banner) / 0.6) * (1 - ease((e - (WRATH.fade - 0.4)) / 0.5));
  if (bannerA > 0) {
    const title = 'THE OBERVERSE PROTECTS ITS OWN';
    const sz = Math.min(46 * dpr, W / 18);
    ctx.save();
    ctx.globalAlpha = bannerA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${sz}px Georgia, "Times New Roman", serif`;
    const y = bars + sz * 1.2;
    // letters drift in from wide spacing
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
    ctx.fillStyle = `rgba(255,243,207,${0.85})`;
    ctx.fillText(`${victim?.profile.name || 'They'} cannot be harmed by mortal hands.`, W / 2, y + sz * 0.95);
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


