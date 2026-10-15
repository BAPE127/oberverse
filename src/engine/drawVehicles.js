// Cars, drawn top-down and rotated (v0.16.0). A two-pass drawing gives a hint
// of height to match the world's 3/4 view: the chassis on the ground, then the
// cabin a few pixels "up" the screen. Body styles: hatch, estate, pickup,
// saloon, gt, coupe, limo, police.
import { shade, rrect } from './drawCharacter.js';
import { drawSignatureCar } from './drawSignatureCars.js';

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
  if (model.body === 'tractor') return drawTractor(ctx, model, x, y, angle, opts);
  if (model.sig && drawSignatureCar(ctx, model, x, y, angle, opts)) return; // v0.34.0
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
  for (const sx of [-0.31, 0.3]) for (const sy of [-1, 1]) {
    // front wheels turn with the steering
    const a = sx > 0 ? (opts.wheel || 0) * 0.5 : 0;
    ctx.save();
    ctx.translate(sx * L, sy * (W / 2));
    ctx.rotate(a);
    ctx.fillRect(-ww / 2, -wh / 2, ww, wh);
    ctx.restore();
  }
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

/**
 * The No. 1 bus (v0.17.0): a long single-decker, top-down — a cream roof
 * stripe, a row of windows down each side, roof vents, and the route number.
 */
export function drawBus(ctx, x, y, angle, opts = {}) {
  const L = opts.len || 150;
  const W = opts.wid || 46;
  const color = opts.color || '#2f6b4f';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // shadow and wheels
  ctx.fillStyle = 'rgba(10,10,20,0.3)';
  rrect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 8);
  ctx.fill();
  ctx.fillStyle = '#18181c';
  for (const sx of [-0.33, 0.3]) for (const sy of [-1, 1]) ctx.fillRect(sx * L - 9, sy * (W / 2) - 4, 18, 8);
  // body
  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -45);
  ctx.lineWidth = 1.5;
  rrect(ctx, -L / 2, -W / 2, L, W, 7);
  ctx.fill();
  ctx.stroke();
  // lights
  ctx.fillStyle = opts.lit ? '#fff6c0' : '#e8e0b0';
  ctx.fillRect(L / 2 - 4, -W / 2 + 4, 4, 7);
  ctx.fillRect(L / 2 - 4, W / 2 - 11, 4, 7);
  ctx.fillStyle = opts.braking ? '#ff3a2a' : '#a8241c';
  ctx.fillRect(-L / 2, -W / 2 + 4, 4, 7);
  ctx.fillRect(-L / 2, W / 2 - 11, 4, 7);
  ctx.restore();
  // the roof, lifted
  ctx.save();
  ctx.translate(x, y - 7);
  ctx.rotate(angle);
  const rw = W - 6;
  ctx.fillStyle = shade(color, -18);
  rrect(ctx, -L / 2 + 3, -rw / 2, L - 6, rw, 6);
  ctx.fill();
  // windows down both sides and the windscreen
  ctx.fillStyle = 'rgba(150,190,210,0.95)';
  for (let wx = -L / 2 + 14; wx < L / 2 - 22; wx += 17) {
    ctx.fillRect(wx, -rw / 2 + 1, 13, 5);
    ctx.fillRect(wx, rw / 2 - 6, 13, 5);
  }
  ctx.fillStyle = '#cfe6f0';
  rrect(ctx, L / 2 - 14, -rw / 2 + 2, 10, rw - 4, 3);
  ctx.fill();
  // roof: a cream stripe, vents, and the route number
  ctx.fillStyle = '#efe6cc';
  ctx.fillRect(-L / 2 + 8, -5, L - 26, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (const vx of [-0.25, 0.1]) ctx.fillRect(vx * L - 8, -rw / 2 + 8, 16, 6);
  ctx.save();
  ctx.translate(-L / 2 + 22, 0);
  ctx.rotate(-angle); // keep the number upright
  ctx.fillStyle = color;
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.number || '1', 0, 1);
  ctx.restore();
  ctx.restore();
}

/** A bus-stop sign with a little shelter roof (prop 'busstop'). */
export function drawBusStop(ctx, x, y, number = '1') {
  ctx.fillStyle = 'rgba(20,20,30,0.25)';
  ctx.fillRect(x + 4, y + 26, 26, 5);
  ctx.fillStyle = '#4a4a52';
  ctx.fillRect(x + 15, y - 12, 3, 40);
  ctx.fillStyle = '#2f6b4f';
  ctx.beginPath(); ctx.arc(x + 16.5, y - 16, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#efe6cc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#efe6cc';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, x + 16.5, y - 15.5);
  ctx.fillStyle = '#f2efe6';
  ctx.fillRect(x + 19, y + 2, 9, 12); // the timetable
  ctx.fillStyle = '#7a8a8a';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 20.5, y + 4 + i * 2.5, 6, 1);
}

/** v0.30.0: a farm tractor from above — big rear wheels, small front ones, a long hood and a cab (or a seat and a roll bar). */
function drawTractor(ctx, model, x, y, angle, opts = {}) {
  const L = model.len;
  const W = model.wid;
  const color = opts.color || model.colors[0];
  const tier = model.farm?.tier || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(10,10,20,0.28)';
  rrect(ctx, -L / 2 + 2, -W / 2 + 3, L, W, 6);
  ctx.fill();
  // wheels: big lugged rear tyres, small fronts that steer
  ctx.fillStyle = '#18181c';
  const rw = L * 0.32;
  const rh = W * 0.24;
  for (const sy of [-1, 1]) {
    ctx.fillRect(-L / 2, sy * (W / 2) - (sy > 0 ? rh : 0), rw, rh);
    ctx.fillStyle = '#2e2e34';
    for (let i = 0; i < rw; i += 5) ctx.fillRect(-L / 2 + i, sy * (W / 2) - (sy > 0 ? rh : 0), 2, rh);
    ctx.fillStyle = '#18181c';
    ctx.save();
    ctx.translate(L * 0.3, sy * (W / 2 - rh * 0.35));
    ctx.rotate((opts.wheel || 0) * 0.5);
    ctx.fillRect(-L * 0.08, -rh * 0.35, L * 0.16, rh * 0.7);
    ctx.restore();
  }
  // the hood, running forward
  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -45);
  ctx.lineWidth = 1.2;
  rrect(ctx, -L * 0.08, -W * 0.18, L * 0.56, W * 0.36, 4);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 4; i++) ctx.fillRect(L * 0.32 + i * 3, -W * 0.12, 1.5, W * 0.24);
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(L * 0.02, -W * 0.22, 3, 6); // the exhaust stack
  // fenders over the rear wheels
  ctx.fillStyle = color;
  for (const sy of [-1, 1]) { rrect(ctx, -L / 2 + 1, sy > 0 ? W / 2 - rh - 2 : -W / 2 + 2, rw - 2, rh, 3); ctx.fill(); }
  // the cab (tier 2+) or a seat under a roll bar
  if (tier >= 2) {
    ctx.fillStyle = shade(color, -25);
    rrect(ctx, -L * 0.42, -W * 0.3, L * 0.34, W * 0.6, 4); ctx.fill();
    ctx.fillStyle = 'rgba(180,215,235,0.75)';
    ctx.fillRect(-L * 0.38, -W * 0.24, L * 0.26, W * 0.48);
    ctx.fillStyle = '#e8e2d4';
    ctx.fillRect(-L * 0.42, -W * 0.3, L * 0.34, 3);
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(-L * 0.3, -W * 0.12, L * 0.14, W * 0.24);
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-L * 0.36, -W * 0.3); ctx.lineTo(-L * 0.36, W * 0.3); ctx.stroke();
  }
  if (opts.lit) {
    ctx.fillStyle = 'rgba(255,240,190,0.9)';
    for (const sy of [-1, 1]) ctx.fillRect(L / 2 - 3, sy * W * 0.12 - 2, 3, 4);
  }
  ctx.restore();
}
