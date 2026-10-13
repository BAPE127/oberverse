// Cars, drawn top-down and rotated (v0.16.0). A two-pass drawing gives a hint
// of height to match the world's 3/4 view: the chassis on the ground, then the
// cabin a few pixels "up" the screen. Body styles: hatch, estate, pickup,
// saloon, gt, coupe, limo, police.
import { shade, rrect } from './drawCharacter.js';

const CABIN = {
  // [rear edge, front edge] of the cabin along the car, as a share of length (front is +)
  hatch: [-0.4, 0.14], estate: [-0.44, 0.1], pickup: [-0.06, 0.24], saloon: [-0.26, 0.16],
  gt: [-0.36, -0.02], coupe: [-0.22, 0.1], limo: [-0.4, 0.2], police: [-0.26, 0.16],
};

/** Deterministic little number from a string (rust patches, dents). */
function seed(s) {
  let h = 3;
  for (const ch of String(s)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Draw a car centred on (x, y) pointing along `angle` (0 = east).
 * opts: color, braking, lit (headlights on), time, id (for wear), siren.
 */
export function drawCar(ctx, model, x, y, angle, opts = {}) {
  const L = model.len;
  const W = model.wid;
  const color = opts.color || model.colors[0];
  const body = model.body;
  const k = W / 30; // detail scale
  const lift = 5 * k; // how far "up" the cabin sits
  // ---- pass 1: shadow, wheels, chassis
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(10,10,20,0.28)';
  rrect(ctx, -L / 2 + 2, -W / 2 + 3, L, W, 8);
  ctx.fill();
  ctx.fillStyle = '#18181c';
  const ww = 13 * k;
  const wh = 7 * k;
  for (const sx of [-0.31, 0.3]) for (const sy of [-1, 1]) ctx.fillRect(sx * L - ww / 2, sy * (W / 2) - wh / 2, ww, wh);
  if (body === 'limo') for (const sy of [-1, 1]) ctx.fillRect(-0.05 * L - ww / 2, sy * (W / 2) - wh / 2, ww, wh);
  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -45);
  ctx.lineWidth = 1.2;
  rrect(ctx, -L / 2, -W / 2, L, W, body === 'coupe' || body === 'gt' ? 9 : 6);
  ctx.fill();
  ctx.stroke();
  // side shading for roundness
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-L / 2 + 3, W / 2 - 5, L - 6, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 2, L - 6, 2);
  // lights
  const lw = 4 * k;
  const lh = 6 * k;
  ctx.fillStyle = opts.lit ? '#fff6c0' : '#e8e0b0';
  ctx.fillRect(L / 2 - lw, -W / 2 + 3 * k, lw, lh);
  ctx.fillRect(L / 2 - lw, W / 2 - 3 * k - lh, lw, lh);
  ctx.fillStyle = opts.braking ? '#ff3a2a' : '#a8241c';
  ctx.fillRect(-L / 2, -W / 2 + 3 * k, lw, lh);
  ctx.fillRect(-L / 2, W / 2 - 3 * k - lh, lw, lh);
  if (opts.braking) {
    ctx.fillStyle = 'rgba(255,60,40,0.35)';
    ctx.fillRect(-L / 2 - 4, -W / 2 + 1, 5, 9);
    ctx.fillRect(-L / 2 - 4, W / 2 - 10, 5, 9);
  }
  // the pickup's open bed
  if (body === 'pickup') {
    ctx.fillStyle = shade(color, -35);
    ctx.fillRect(-L / 2 + 4, -W / 2 + 4, L * 0.4, W - 8);
    ctx.strokeStyle = shade(color, -55);
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-L / 2 + 4 + (i * L * 0.4) / 4, -W / 2 + 5); ctx.lineTo(-L / 2 + 4 + (i * L * 0.4) / 4, W / 2 - 5); ctx.stroke(); }
  }
  // wear on used cars: rust patches and a dent
  if (model.used) {
    const s = seed(opts.id || model.name);
    ctx.fillStyle = 'rgba(120,64,30,0.55)';
    for (let i = 0; i < 3; i++) {
      const px = (((s >>> (i * 5)) % 100) / 100 - 0.5) * 0.9;
      const py = ((s >>> (i * 7 + 3)) % 2) ? 1 : -1;
      ctx.beginPath(); ctx.ellipse(px * L * 0.8, py * (W / 2 - 3), 3 + (i % 2) * 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // police door stripe
  if (body === 'police') {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-L * 0.18, -W / 2, L * 0.36, 4);
    ctx.fillRect(-L * 0.18, W / 2 - 4, L * 0.36, 4);
  }
  ctx.restore();

  // ---- pass 2: the cabin, lifted
  const [r0, r1] = CABIN[body] || CABIN.saloon;
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.rotate(angle);
  const cw = W - (body === 'coupe' ? 12 : 9) * k;
  const cx0 = r0 * L;
  const cx1 = r1 * L;
  // pillars / sides
  ctx.fillStyle = shade(color, -22);
  rrect(ctx, cx0 - 1, -cw / 2 - 1, cx1 - cx0 + 2, cw + 2, 5);
  ctx.fill();
  // windscreen (front) and rear window
  const glass = ctx.createLinearGradient(cx1 - 11 * k, 0, cx1, 0);
  glass.addColorStop(0, '#8fb4c8');
  glass.addColorStop(1, '#d6ecf4');
  ctx.fillStyle = glass;
  rrect(ctx, cx1 - 11 * k, -cw / 2 + 1, 11 * k, cw - 2, 3);
  ctx.fill();
  ctx.fillStyle = '#7fa4b8';
  rrect(ctx, cx0, -cw / 2 + 2, 7 * k, cw - 4, 2);
  ctx.fill();
  // side windows
  ctx.fillStyle = 'rgba(120,160,185,0.85)';
  ctx.fillRect(cx0 + 8 * k, -cw / 2, cx1 - cx0 - 20 * k, 3 * k);
  ctx.fillRect(cx0 + 8 * k, cw / 2 - 3 * k, cx1 - cx0 - 20 * k, 3 * k);
  // roof
  ctx.fillStyle = shade(color, 10);
  rrect(ctx, cx0 + 7 * k, -cw / 2 + 3 * k, Math.max(4, cx1 - cx0 - 19 * k), cw - 6 * k, 4 * k);
  ctx.fill();
  if (body === 'limo') {
    ctx.fillStyle = 'rgba(30,30,40,0.5)';
    ctx.fillRect((cx0 + cx1) / 2 - 1, -cw / 2 + 3, 2, cw - 6); // the privacy screen
  }
  if (body === 'coupe') {
    // go-faster stripes, nose to tail
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-L / 2 + 2, -4 * k, L - 4, 2.5 * k);
    ctx.fillRect(-L / 2 + 2, 1.5 * k, L - 4, 2.5 * k);
  }
  if (body === 'police') {
    const on = opts.siren ? Math.sin((opts.time || 0) * 10) > 0 : true;
    const mid = (cx0 + cx1) / 2;
    ctx.fillStyle = on ? '#ff3a3a' : '#7a1a1a';
    ctx.fillRect(mid - 2, -cw / 2 + 3, 4, cw / 2 - 3);
    ctx.fillStyle = on ? '#3a5a8a' : '#3a6aff';
    ctx.fillRect(mid - 2, 0, 4, cw / 2 - 3);
  }
  ctx.restore();
}

/** A car on a showroom floor (prop 'car_display'), filling its tile rectangle. */
export function drawDisplayCar(ctx, model, x, y, w, h, opts = {}) {
  // a plinth, then the car on it
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rrect(ctx, x + 2, y + h - 10, w - 4, 8, 4);
  ctx.fill();
  drawCar(ctx, model, x + w / 2, y + h / 2 + 2, 0, opts);
}
