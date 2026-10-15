// Cows (v0.29.0): Chuckie's Cheese's herd, drawn in the world's 3/4 style.
// A cow is an actor whose appearance has species: 'cow' — so the five special
// cows (who talk) use the same NPC pipeline as everyone else, and drawCharacter
// / drawPortrait hand them here. appearance: { coat, patches, muzzle, bell,
// ribbon, seed } — the patches are placed from `seed`, so each cow keeps hers.
import { hash2 } from '../core/rng.js';

const darker = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** Patches on a body ellipse (cx, cy, rx, ry). */
function patches(ctx, a, cx, cy, rx, ry, n = 4) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = a.patches || '#2a2420';
  const seed = a.seed || 1;
  for (let i = 0; i < n; i++) {
    const px = cx + (hash2(seed, i) - 0.5) * rx * 1.7;
    const py = cy + (hash2(seed + 7, i) - 0.5) * ry * 1.6;
    const r = (0.25 + hash2(seed + 3, i) * 0.35) * rx;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * (0.6 + hash2(seed, i + 9) * 0.5), hash2(seed, i + 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A cow at (s.x, s.y) (her feet), facing s.facing; s like drawCharacter's. */
export function drawCow(ctx, a, s) {
  const facing = s.facing || 'down';
  const scale = (s.scale || 1) * (a.height || 1);
  const t = s.animTime || 0;
  const walk = s.moving ? Math.sin(t * 9) : 0;
  const idle = s.idleTime || 0;
  const coat = a.coat || '#f2ece0';
  const muzzle = a.muzzle || '#e8a8a0';
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(scale, scale);
  // shadow
  ctx.fillStyle = 'rgba(20,20,35,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (s.sleeping) {
    // lying down, legs tucked, eyes shut
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, -7, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    patches(ctx, a, 0, -7, 16, 8, 3);
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(13, -10, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = muzzle;
    ctx.beginPath(); ctx.ellipse(17, -8, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(14, -12); ctx.stroke();
    ctx.restore();
    return;
  }
  const side = facing === 'left' || facing === 'right';
  const dir = facing === 'left' ? -1 : 1;
  const legC = darker(coat, 0.82);
  const hoof = '#3a2e28';
  const leg = (x, y, sw) => {
    ctx.fillStyle = legC;
    ctx.fillRect(x - 1.8, y - 9 + sw, 3.6, 9);
    ctx.fillStyle = hoof;
    ctx.fillRect(x - 2, y - 1.6 + sw, 4, 1.8);
  };
  if (side) {
    // body side-on, head at the front
    leg(-10 * dir, 0, walk * 1.4); leg(-6 * dir, 0, -walk * 1.4); leg(7 * dir, 0, -walk * 1.4); leg(11 * dir, 0, walk * 1.4);
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, -14, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
    patches(ctx, a, 0, -14, 15, 8, 4);
    ctx.strokeStyle = 'rgba(30,24,40,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -14, 15, 8, 0, 0, Math.PI * 2); ctx.stroke();
    // udder
    ctx.fillStyle = muzzle;
    ctx.beginPath(); ctx.ellipse(-3 * dir, -6.5, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    // tail
    ctx.strokeStyle = coat; ctx.lineWidth = 1.4;
    const sw = Math.sin(idle * 2.4) * 2;
    ctx.beginPath(); ctx.moveTo(-15 * dir, -18); ctx.quadraticCurveTo(-18 * dir, -12, -17 * dir + sw, -6); ctx.stroke();
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(-17 * dir + sw, -5.5, 1.4, 0, Math.PI * 2); ctx.fill();
    // head
    const hx = 15 * dir;
    const hy = -19 + Math.sin(idle * 1.3) * 0.6;
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(hx, hy, 6, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = muzzle;
    ctx.beginPath(); ctx.ellipse(hx + 4 * dir, hy + 2.5, 3.8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a34'; ctx.beginPath(); ctx.arc(hx + 5.6 * dir, hy + 2, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1414'; ctx.beginPath(); ctx.arc(hx + 1.2 * dir, hy - 1.2, 1.1, 0, Math.PI * 2); ctx.fill();
    // horns and ear
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(hx - 1 * dir, hy - 4.5); ctx.lineTo(hx - 2.5 * dir, hy - 9); ctx.lineTo(hx + 0.8 * dir, hy - 5); ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(hx - 4.5 * dir, hy - 2, 3.2, 1.6, -0.4 * dir, 0, Math.PI * 2); ctx.fill();
    if (a.bell) { ctx.fillStyle = '#e0b84a'; ctx.beginPath(); ctx.arc(hx - 1 * dir, hy + 6, 2, 0, Math.PI * 2); ctx.fill(); }
    if (a.ribbon) { ctx.fillStyle = a.ribbon; ctx.fillRect(hx - 2.5 * dir - 1.2, hy - 6.5, 2.4, 2.4); }
  } else {
    // facing the viewer (down) or walking away (up)
    const front = facing === 'down';
    leg(-7, 0, walk * 1.4); leg(7, 0, -walk * 1.4); leg(-6, -4, -walk * 1.2); leg(6, -4, walk * 1.2);
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, -14, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
    patches(ctx, a, 0, -14, 11, 10, 4);
    ctx.strokeStyle = 'rgba(30,24,40,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -14, 11, 10, 0, 0, Math.PI * 2); ctx.stroke();
    if (front) {
      const hy = -20 + Math.sin(idle * 1.3) * 0.6;
      // ears and horns
      ctx.fillStyle = coat;
      ctx.beginPath(); ctx.ellipse(-8, hy - 3, 3.6, 1.8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, hy - 3, 3.6, 1.8, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath(); ctx.moveTo(-4, hy - 5); ctx.lineTo(-6.5, hy - 10); ctx.lineTo(-2, hy - 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, hy - 5); ctx.lineTo(6.5, hy - 10); ctx.lineTo(2, hy - 6); ctx.fill();
      // head
      ctx.fillStyle = coat;
      ctx.beginPath(); ctx.ellipse(0, hy, 6.5, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (a.blaze) { ctx.fillStyle = a.patches || '#2a2420'; ctx.beginPath(); ctx.ellipse(0, hy - 3, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = muzzle;
      ctx.beginPath(); ctx.ellipse(0, hy + 4, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a34';
      ctx.beginPath(); ctx.arc(-1.8, hy + 4, 0.8, 0, Math.PI * 2); ctx.arc(1.8, hy + 4, 0.8, 0, Math.PI * 2); ctx.fill();
      const blink = Math.sin(idle * 0.9 + (a.seed || 0)) > 0.97;
      ctx.fillStyle = '#1a1414';
      if (blink) { ctx.fillRect(-3.6, hy - 1.2, 2.2, 0.7); ctx.fillRect(1.4, hy - 1.2, 2.2, 0.7); } else {
        ctx.beginPath(); ctx.arc(-2.5, hy - 1, 1.1, 0, Math.PI * 2); ctx.arc(2.5, hy - 1, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      if (a.bell) { ctx.fillStyle = '#e0b84a'; ctx.beginPath(); ctx.arc(0, hy + 9.5, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(-0.5, hy + 10.5, 1, 1.5); }
      if (a.ribbon) { ctx.fillStyle = a.ribbon; ctx.beginPath(); ctx.moveTo(4, hy - 6); ctx.lineTo(8, hy - 8); ctx.lineTo(8, hy - 4); ctx.closePath(); ctx.moveTo(4, hy - 6); ctx.lineTo(0, hy - 8); ctx.lineTo(0, hy - 4); ctx.closePath(); ctx.fill(); }
      if (a.hat) { ctx.fillStyle = a.hat; ctx.fillRect(-7, hy - 7.5, 14, 2); ctx.fillRect(-4, hy - 12, 8, 5); }
    } else {
      // from behind: rump and tail
      const sw = Math.sin(idle * 2.4) * 2;
      ctx.strokeStyle = coat; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(sw, -10, sw * 1.2, -5); ctx.stroke();
      ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(sw * 1.2, -4.5, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** A cow's portrait for the dialogue box: her face, big. */
export function drawCowPortrait(ctx, a, size, opts = {}) {
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, opts.bgTop || '#d8eef8');
  g.addColorStop(1, opts.bgBottom || '#a8d48a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const s = size / 34;
  ctx.save();
  ctx.translate(size / 2, size * 0.58);
  ctx.scale(s, s);
  const coat = a.coat || '#f2ece0';
  const muzzle = a.muzzle || '#e8a8a0';
  // ears, horns
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(-12, -6, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -6, 6, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-10, -18); ctx.lineTo(-3, -11); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -10); ctx.lineTo(10, -18); ctx.lineTo(3, -11); ctx.fill();
  // head
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, -2, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  patches(ctx, a, 0, -2, 10, 12, 3);
  ctx.fillStyle = muzzle;
  ctx.beginPath(); ctx.ellipse(0, 7, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3a34';
  ctx.beginPath(); ctx.ellipse(-3, 7, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.ellipse(3, 7, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4, -3, 2.4, 0, Math.PI * 2); ctx.arc(4, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1414';
  ctx.beginPath(); ctx.arc(-3.6, -2.8, 1.4, 0, Math.PI * 2); ctx.arc(4.4, -2.8, 1.4, 0, Math.PI * 2); ctx.fill();
  if (a.ribbon) { ctx.fillStyle = a.ribbon; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(11, -15); ctx.lineTo(11, -9); ctx.closePath(); ctx.moveTo(6, -12); ctx.lineTo(1, -15); ctx.lineTo(1, -9); ctx.closePath(); ctx.fill(); }
  if (a.hat) { ctx.fillStyle = a.hat; ctx.fillRect(-11, -15, 22, 2.5); ctx.fillRect(-6, -21, 12, 6.5); }
  if (a.bell) { ctx.fillStyle = '#e0b84a'; ctx.beginPath(); ctx.arc(0, 15, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
