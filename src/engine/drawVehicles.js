// Cars, drawn top-down and rotated (v0.16.0). Since v0.38.0 ordinary cars and the bus are
// pixel art (src/engine/drawPixelCars.js); this file dispatches, and keeps the tractors,
// the bus stop and the showroom display.
import { shade, rrect } from './drawCharacter.js';
import { drawSignatureCar } from './drawSignatureCars.js';
import { drawPixelCar, drawPixelBus } from './drawPixelCars.js';


/**
 * Draw a car centred on (x, y) pointing along `angle` (0 = east).
 * opts: color, braking, lit (headlights on), time, id (for wear), siren.
 */
export function drawCar(ctx, model, x, y, angle, opts = {}) {
  if (model.body === 'tractor') return drawTractor(ctx, model, x, y, angle, opts);
  if (model.sig && drawSignatureCar(ctx, model, x, y, angle, opts)) return; // v0.34.0
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
