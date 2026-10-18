// Cars, drawn top-down and rotated (v0.16.0). Since v0.38.0 ordinary cars and the bus are
// pixel art (src/engine/drawPixelCars.js); this file dispatches, and keeps the tractors,
// the bus stop and the showroom display.
import { shade, rrect } from './drawCharacter.js';
import { drawSignatureCar } from './drawSignatureCars.js';
import { drawPixelCar, drawPixelBus } from './drawPixelCars.js';
import { drawCarSprite } from './carSprites.js';


/**
 * Draw a car centred on (x, y) pointing along `angle` (0 = east).
 * opts: color, braking, lit (headlights on), time, id (for wear), siren.
 */
let pixelSig = false;
/** v0.45.0: the renderer switches the signature cars to pixel art with the "Pixel-art look" setting. */
export function setPixelCars(on) { pixelSig = !!on; }

export function drawCar(ctx, model, x, y, angle, opts = {}) {
  if (model.body === 'tractor') return drawTractor(ctx, model, x, y, angle, opts);
  if (model.sig && pixelSig && typeof document !== 'undefined' && drawSignaturePixel(ctx, model, x, y, angle, opts)) return; // v0.45.0
  if (model.sig && drawSignatureCar(ctx, model, x, y, angle, opts)) return; // v0.34.0
  if (drawCarSprite(ctx, model, x, y, angle, opts)) return; // v0.50.0: drawn pixel by pixel at its heading
  drawPixelCar(ctx, model, x, y, angle, opts); // v0.38.0: the pixel-art revamp
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
  const len = opts.len || 150;
  const wid = opts.wid || 46;
  if (drawCarSprite(ctx, { body: 'bus', len, wid }, x, y, angle, { ...opts, color: opts.color || '#2f6b4f' })) {
    // v0.50.0: the route number in its plate behind the windscreen
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.fillStyle = '#1b1a24';
    ctx.fillRect(len / 2 - 22, -8, 12, 16);
    ctx.fillStyle = opts.color || '#2f6b4f';
    ctx.fillRect(len / 2 - 21, -7, 10, 14);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(opts.number || '1'), 0, -(len / 2 - 16));
    ctx.restore();
    return;
  }
  drawPixelBus(ctx, x, y, angle, opts); // v0.38.0: the pixel-art revamp
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

// v0.45.0: a signature car in the pixel look. Its own drawing (with everything it animates) is
// made at art resolution, then given hard edges, a short palette and a dark one-pixel outline,
// and laid down crisp with a hard shadow — the same style as the pixel cars.
let sigCv = null;
function drawSignaturePixel(ctx, model, x, y, angle, opts) {
  const R = Math.ceil(Math.hypot(model.len, model.wid) / 2) + 40; // world px around the centre
  const n = R * 2; // v0.46.0: at world resolution — fine pixels, like everything else
  sigCv = sigCv || document.createElement('canvas');
  if (sigCv.width !== n || sigCv.height !== n) { sigCv.width = n; sigCv.height = n; }
  const c = sigCv.getContext('2d', { willReadFrequently: true });
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, n, n);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (!drawSignatureCar(c, model, R, R, angle, opts)) return false;
  const img = c.getImageData(0, 0, n, n);
  const d = img.data;
  const solid = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const a = d[i * 4 + 3];
    if (a < 110) { d[i * 4 + 3] = 0; continue; }
    solid[i] = 1;
    const k = 255 / a; // un-premultiply the anti-aliased edge, then snap to a short palette
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.min(255, Math.round((d[i * 4 + ch] * k) / 20) * 20);
    d[i * 4 + 3] = 255;
  }
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) {
    const i = yy * n + xx;
    if (solid[i]) continue;
    if ((xx > 0 && solid[i - 1]) || (xx < n - 1 && solid[i + 1]) || (yy > 0 && solid[i - n]) || (yy < n - 1 && solid[i + n])) {
      d[i * 4] = 27; d[i * 4 + 1] = 26; d[i * 4 + 2] = 36; d[i * 4 + 3] = 255;
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.putImageData(img, 0, 0);
  const ox = Math.round(x - R);
  const oy = Math.round(y - R);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.28;
  ctx.filter = 'brightness(0)';
  ctx.drawImage(sigCv, ox + 4, oy + 6, n, n);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.drawImage(sigCv, ox, oy, n, n);
  ctx.restore();
  return true;
}
