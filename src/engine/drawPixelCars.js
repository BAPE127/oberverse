// Pixel-art cars (v0.38.0, the art revamp): top-down, drawn on an art-pixel grid (one art pixel =
// 2 world pixels) and rotated to the car's heading. A chamfered body with a 1-px outline, a lit
// left flank and a shaded right one, bumpers, head- and tail-lamps, a raked windscreen with a
// glint, roof, side and rear glass, mirrors and door seams; tyres that turn with the wheel.
// Body styles map from the models' `body`: hatch, estate, pickup, saloon, gt, coupe, limo, police;
// plus the bus (drawPixelBus). Signature cars and tractors keep their own art.

const INK = '#1b1a24';
const GLASS = '#26384e';
const GLINT = '#9ad0e8';

export function shadeHex(hex, k) {
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(hex);
  const n = m ? (+m[1] << 16) | (+m[2] << 8) | +m[3] : parseInt(hex.slice(1, 7), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Roof/glass layout per body style: front = bonnet length (art px), roof = where the roof starts from the tail. */
const STYLE = {
  hatch: { front: 7, rear: 4 },
  estate: { front: 8, rear: 3, wagon: true },
  pickup: { front: 8, bed: true },
  saloon: { front: 9, rear: 9 },
  gt: { front: 13, rear: 8 },
  coupe: { front: 11, rear: 8, stripes: true },
  limo: { front: 9, rear: 8, limo: true },
  police: { front: 9, rear: 9, police: true },
};

/**
 * Draw a car centred on (x, y) in world pixels, nose along `angle` (0 = east).
 * opts: color, braking, lit, wheel (−1..1), siren, time
 */
export function drawPixelCar(ctx, model, x, y, angle, opts = {}) {
  const st = STYLE[model.body] || STYLE.saloon;
  const L = Math.round(model.len / 2);
  const Wd = Math.round(model.wid / 2);
  const col = opts.color || model.colors[0];
  const hl = Math.floor(L / 2);
  const hw = Math.floor(Wd / 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle - Math.PI / 2); // local +y is the nose
  ctx.scale(2, 2);
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  // shadow
  ctx.fillStyle = 'rgba(10,8,20,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 2, hw + 2, hl + 1, 0, 0, Math.PI * 2); ctx.fill();
  // tyres (the front pair turns with the wheel)
  const wheel = (opts.wheel || 0) * 0.45;
  for (const [ty, front] of [[-hl + 4, false], [hl - 10, true]]) {
    for (const sx of [-hw - 1, hw - 2]) {
      ctx.save();
      ctx.translate(sx + 1.5, ty + 3.5);
      if (front) ctx.rotate(-wheel);
      R(-1.5, -3.5, 3, 7, INK); R(sx < 0 ? -1.5 : 0.5, -2.5, 1, 5, '#3a3a44');
      ctx.restore();
    }
  }
  const body = (x0, y0, w, h, c, k = 2) => { R(x0 + k, y0, w - 2 * k, h, c); R(x0 + 1, y0 + 1, w - 2, h - 2, c); R(x0, y0 + k, w, h - 2 * k, c); };
  body(-hw - 1, -hl - 1, Wd + 2, L + 2, INK, 3);
  body(-hw, -hl, Wd, L, col);
  R(-hw + 1, -hl + 2, 1, L - 4, shadeHex(col, 45));
  R(hw - 2, -hl + 2, 1, L - 4, shadeHex(col, -35));
  R(hw - 1, -hl + 3, 1, L - 6, shadeHex(col, -60));
  // bumpers and lamps
  R(-hw + 3, hl - 1, Wd - 6, 1, shadeHex(col, -70)); R(-hw + 3, -hl, Wd - 6, 1, shadeHex(col, -70));
  R(-hw + 1, hl - 3, 3, 2, opts.lit ? '#ffffff' : '#fff4c0'); R(hw - 4, hl - 3, 3, 2, opts.lit ? '#ffffff' : '#fff4c0');
  R(-hw + 1, -hl + 1, 3, 2, opts.braking ? '#ff4a3a' : '#b8281e'); R(hw - 4, -hl + 1, 3, 2, opts.braking ? '#ff4a3a' : '#b8281e');
  if (opts.braking) { ctx.fillStyle = 'rgba(255,60,40,0.35)'; ctx.fillRect(-hw, -hl - 2, Wd, 2); }
  if (st.stripes) { R(-3, -hl + 1, 2, L - 2, '#f8f8f0'); R(1, -hl + 1, 2, L - 2, '#f8f8f0'); }
  const ws = hl - st.front; // where the windscreen meets the bonnet
  const roofTop = st.bed ? ws - 13 : -hl + (st.rear ?? 6);
  // bonnet crease, boot line
  R(0, ws + 2, 1, st.front - 5, shadeHex(col, -18)); R(-hw + 3, ws + 1, Wd - 6, 1, shadeHex(col, -25));
  if (!st.wagon && !st.bed) R(-hw + 3, roofTop - 4, Wd - 6, 1, shadeHex(col, -25));
  if (st.police) { R(-hw + 1, ws + 1, Wd - 2, st.front - 2, '#1e2a3a'); R(-hw + 1, -hl + 1, Wd - 2, roofTop - 4 + hl, '#1e2a3a'); }
  // windscreen, raked (wider toward the bonnet), with a glint
  for (let r = 0; r < 6; r++) { const w = Wd - 8 + Math.min(4, r); R(-w / 2, ws - 6 + r, w, 1, GLASS); }
  R(-hw + 4, ws - 6, 4, 1, GLINT); R(-hw + 4, ws - 5, 2, 1, GLINT); R(-hw + 5, ws - 4, 1, 1, GLINT);
  // roof (lit toward the front), side glass, mirrors, door seams
  R(-hw + 3, roofTop, Wd - 6, ws - 6 - roofTop, shadeHex(col, 14));
  R(-hw + 3, roofTop, Wd - 6, 1, shadeHex(col, 34)); R(-hw + 3, ws - 7, Wd - 6, 1, shadeHex(col, 28));
  R(-hw + 3, roofTop + 1, 1, ws - 7 - roofTop, shadeHex(col, 30));
  R(-hw + 1, roofTop + 1, 2, ws - 7 - roofTop, GLASS); R(hw - 3, roofTop + 1, 2, ws - 7 - roofTop, GLASS);
  for (let k = roofTop + 3; k < ws - 7; k += 6) { R(-hw + 1, k, 2, 1, shadeHex(col, -30)); R(hw - 3, k, 2, 1, shadeHex(col, -40)); } // pillars
  R(-hw - 1, ws - 3, 1, 2, shadeHex(col, -40)); R(hw, ws - 3, 1, 2, shadeHex(col, -40));
  const mid = Math.round((ws + roofTop) / 2);
  R(-hw, mid, 2, 1, shadeHex(col, -50)); R(hw - 2, mid, 2, 1, shadeHex(col, -60));
  if (st.limo) { R(-hw + 2, mid - 6, 1, 3, shadeHex(col, -60)); R(hw - 3, mid - 6, 1, 3, shadeHex(col, -60)); R(-hw + 3, mid, Wd - 6, 1, 'rgba(0,0,0,0.25)'); }
  if (st.bed) {
    R(-hw + 3, roofTop - 3, Wd - 6, 2, GLASS);
    R(-hw + 2, -hl + 2, Wd - 4, roofTop - 4 - (-hl + 2), shadeHex(col, -45));
    for (let k = -hl + 4; k < roofTop - 5; k += 3) R(-hw + 3, k, Wd - 6, 1, shadeHex(col, -60));
  } else if (!st.wagon) {
    for (let r = 0; r < 4; r++) { const w = Wd - 6 - (r === 0 ? 2 : 0); R(-w / 2, roofTop - 4 + r, w, 1, GLASS); }
    R(-hw + 4, roofTop - 3, 2, 1, GLINT);
  } else {
    R(-(Wd - 8) / 2, roofTop - 1, Wd - 8, 2, GLASS); // the tailgate glass
    R(-hw + 3, roofTop + 4, Wd - 6, 1, shadeHex(col, 4)); // roof rails
  }
  if (st.police) {
    const on = opts.siren ? Math.sin((opts.time || 0) * 10) > 0 : false;
    ctx.fillStyle = INK; ctx.fillRect(-hw + 2, mid - 2, Wd - 4, 4);
    R(-hw + 3, mid - 1, (Wd - 6) / 2, 2, on ? '#ff3a3a' : '#8a2020'); R(0, mid - 1, (Wd - 6) / 2, 2, on ? '#4a7aff' : '#20307a');
    R(-hw, mid + 3, 1, 4, '#1e3a8a'); R(hw - 1, mid + 3, 1, 4, '#1e3a8a');
  }
  ctx.restore();
}

/** The bus, in the same style: cream body in the line's colour, windows down both sides, roof units, the route number. */
export function drawPixelBus(ctx, x, y, angle, opts = {}) {
  const L = Math.round((opts.len || 150) / 2);
  const Wd = Math.round((opts.wid || 46) / 2);
  const col = opts.color || '#2f6b4f';
  const hl = Math.floor(L / 2);
  const hw = Math.floor(Wd / 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle - Math.PI / 2);
  ctx.scale(2, 2);
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  ctx.fillStyle = 'rgba(10,8,20,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 2, hw + 2, hl + 1, 0, 0, Math.PI * 2); ctx.fill();
  for (const ty of [-hl + 6, hl - 14]) { R(-hw - 1, ty, 3, 8, INK); R(hw - 2, ty, 3, 8, INK); }
  const body = (x0, y0, w, h, c, k = 2) => { R(x0 + k, y0, w - 2 * k, h, c); R(x0 + 1, y0 + 1, w - 2, h - 2, c); R(x0, y0 + k, w, h - 2 * k, c); };
  body(-hw - 1, -hl - 1, Wd + 2, L + 2, INK, 3);
  body(-hw, -hl, Wd, L, col);
  body(-hw + 1, -hl + 1, Wd - 2, L - 2, '#ece4d0');
  R(-hw + 1, -hl + 2, 1, L - 4, '#fff8e8');
  for (let k = -hl + 8; k < hl - 10; k += 7) { R(-hw + 1, k, 2, 5, GLASS); R(hw - 3, k, 2, 5, GLASS); R(-hw + 1, k, 1, 1, GLINT); }
  R(-hw + 3, hl - 6, Wd - 6, 4, GLASS); R(-hw + 4, hl - 6, 4, 1, GLINT);
  R(-hw + 1, hl - 2, 3, 1, opts.lit ? '#ffffff' : '#fff4c0'); R(hw - 4, hl - 2, 3, 1, opts.lit ? '#ffffff' : '#fff4c0');
  R(-hw + 1, -hl + 1, 3, 1, opts.braking ? '#ff4a3a' : '#b8281e'); R(hw - 4, -hl + 1, 3, 1, opts.braking ? '#ff4a3a' : '#b8281e');
  for (const ay of [-hl + 12, -hl + 32]) { R(-5, ay - 1, 10, 9, INK); R(-4, ay, 8, 7, '#b8b4a8'); for (let k = 0; k < 3; k++) R(-3, ay + 2 + k * 2, 6, 1, '#8a8678'); }
  // the route number, in a plate behind the windscreen
  R(-5, hl - 13, 10, 6, INK); R(-4, hl - 12, 8, 4, col);
  ctx.save();
  ctx.translate(0, hl - 10);
  ctx.rotate(Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(opts.number || '1'), 0, 0.5);
  ctx.restore();
  ctx.restore();
}
