// War vehicles on the game's own pixel idiom (v0.101.0, the look renderer): a tank, a helicopter, a carrier and a plain truck, painted once facing east on a small canvas with a 1-px ink outline, lit
// from the upper left, shaded on the right, and turned by sixteenths of a turn (cached by kind, palette, state and heading, as src/engine/carSprites.js does). Sized to the game's tile (32 px):
// a tank is about a tile and a half long, a person is about one tile tall. Browser only (it makes canvases); nothing here is read by the simulation.
const INK = '#1b1a24';
const STEPS = 16;
const cache = new Map();

export const PALETTE = {
  p: { hull: '#5e7a46', hull2: '#46603a', dark: '#2e3e26', light: '#8aa264', track: '#2a2a30', accent: '#e8c84a' },
  e: { hull: '#8a5a48', hull2: '#6e4438', dark: '#3e2822', light: '#b08068', track: '#2a2628', accent: '#d8402e' },
};
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v + k))); return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** A 1-px ink outline round whatever is painted on the canvas (the game's sprites all have one). */
function outlined(src) {
  const w = src.width; const h = src.height; const out = mkCanvas(w, h); const g = out.getContext('2d'); g.imageSmoothingEnabled = false;
  const tmp = mkCanvas(w, h); const t = tmp.getContext('2d'); t.drawImage(src, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = INK; t.fillRect(0, 0, w, h);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) g.drawImage(tmp, dx, dy);
  g.drawImage(src, 0, 0);
  return out;
}
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

/** Painted facing east, centred on a 56 x 56 canvas. */
function paint(kind, P, state) {
  const c = mkCanvas(56, 56); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const dead = state === 'wreck';
  const hull = dead ? '#3a3638' : P.hull; const hull2 = dead ? '#2a2628' : P.hull2; const hi = dead ? '#4e4a4c' : P.light;
  if (kind === 'tank') {
    R(g, 8, 17, 38, 5, P.track); R(g, 8, 34, 38, 5, P.track); for (let x = 9; x < 46; x += 3) { R(g, x, 18, 1, 3, shade(P.track, 24)); R(g, x, 35, 1, 3, shade(P.track, 24)); }
    R(g, 10, 21, 34, 14, hull); R(g, 10, 21, 34, 2, hi); R(g, 10, 33, 34, 2, hull2); R(g, 40, 22, 4, 12, hull2); R(g, 12, 24, 4, 8, shade(hull, -14)); R(g, 41, 25, 2, 6, shade(hull, 18));
    if (!dead) { R(g, 21, 23, 14, 10, hull2); R(g, 22, 24, 12, 8, hull); R(g, 22, 24, 12, 2, hi); R(g, 24, 26, 4, 4, P.dark); R(g, 33, 27, 18, 2, P.dark); R(g, 33, 27, 18, 1, shade(P.dark, 30)); R(g, 28, 25, 2, 2, P.accent); }
    else { R(g, 22, 24, 12, 9, '#2c282a'); R(g, 30, 30, 14, 2, '#26222a'); R(g, 14, 25, 3, 3, '#c8541a'); }
  } else if (kind === 'carrier') {
    for (let k = 0; k < 3; k++) { R(g, 12 + k * 11, 15, 6, 3, P.track); R(g, 12 + k * 11, 38, 6, 3, P.track); }
    R(g, 10, 18, 36, 20, hull); R(g, 10, 18, 36, 2, hi); R(g, 10, 36, 36, 2, hull2); R(g, 40, 19, 6, 18, hull2); R(g, 14, 22, 18, 12, shade(hull, -10)); R(g, 20, 24, 8, 8, P.dark); R(g, 28, 27, 10, 2, P.dark); R(g, 42, 21, 3, 3, '#e8e4c0'); R(g, 42, 33, 3, 3, '#e8e4c0');
    if (dead) { R(g, 14, 22, 18, 12, '#2a2628'); }
  } else if (kind === 'helicopter') {
    R(g, 10, 25, 20, 6, hull); R(g, 8, 26, 4, 4, hull2); R(g, 28, 22, 14, 12, hull); R(g, 28, 22, 14, 2, hi); R(g, 32, 24, 8, 6, '#6ec8e8'); R(g, 32, 24, 8, 1, '#c8f0ff'); R(g, 10, 24, 2, 8, P.accent);
    R(g, 14, 21, 12, 14, hull2); R(g, 14, 21, 12, 1, hi); R(g, 24, 20, 6, 2, P.dark); R(g, 24, 34, 6, 2, P.dark); R(g, 6, 24, 2, 8, hull2); // skids/tail rotor
    if (dead) { R(g, 14, 21, 28, 14, '#3a3638'); R(g, 22, 25, 10, 6, '#c8541a'); }
  } else { // a truck or jeep
    R(g, 12, 18, 30, 20, hull); R(g, 12, 18, 30, 2, hi); R(g, 12, 36, 30, 2, hull2); R(g, 34, 20, 8, 16, shade(hull, -8)); R(g, 36, 22, 4, 12, '#6ec8e8'); R(g, 13, 21, 18, 14, hull2); R(g, 14, 22, 16, 12, shade(hull, -22));
    for (const [x, y] of [[14, 16], [14, 38], [34, 16], [34, 38]]) R(g, x, y, 6, 3, P.track);
    if (dead) R(g, 13, 21, 28, 14, '#2a2628');
  }
  return outlined(c);
}

/** A vehicle's sprite at a heading (radians, 0 = east), cached. `state`: 'ok' or 'wreck'. */
export function vehicleSprite(kind, side, heading, state = 'ok') {
  const step = ((Math.round(heading / (Math.PI * 2) * STEPS) % STEPS) + STEPS) % STEPS;
  const key = `${kind}|${side}|${state}|${step}`;
  let s = cache.get(key);
  if (!s) {
    const base = paint(kind === 'other' ? 'truck' : kind, PALETTE[side] || PALETTE.p, state);
    s = mkCanvas(64, 64); const g = s.getContext('2d'); g.imageSmoothingEnabled = false;
    g.translate(32, 32); g.rotate((step / STEPS) * Math.PI * 2); g.drawImage(base, -28, -28);
    cache.set(key, s);
  }
  return s;
}

/** A tank's turret turns on its own: the sprite above has it fixed; this draws a thin barrel line toward the target for emphasis. */
export function drawVehicle(ctx, kind, side, x, y, heading, { wreck = false, time = 0 } = {}) {
  const spr = vehicleSprite(kind, side, heading, wreck ? 'wreck' : 'ok');
  ctx.fillStyle = 'rgba(16,14,36,0.28)'; ctx.fillRect(Math.round(x) - 14, Math.round(y) + 4, 28, 6); // a flat shadow under it
  if (kind === 'helicopter' && !wreck) {
    ctx.fillStyle = 'rgba(16,14,36,0.22)'; ctx.fillRect(Math.round(x) - 10, Math.round(y) + 12, 22, 5); // the shadow falls away from it
    ctx.drawImage(spr, Math.round(x) - 32, Math.round(y) - 40);
    // the rotor: a live disc with two blades
    const a = time * 22; ctx.save(); ctx.translate(Math.round(x), Math.round(y) - 12); ctx.fillStyle = 'rgba(30,28,40,0.18)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineTo(-Math.cos(a) * 17, -Math.sin(a) * 17); ctx.moveTo(Math.cos(a + 1.57) * 17, Math.sin(a + 1.57) * 17); ctx.lineTo(-Math.cos(a + 1.57) * 17, -Math.sin(a + 1.57) * 17); ctx.stroke(); ctx.restore();
    return;
  }
  ctx.drawImage(spr, Math.round(x) - 32, Math.round(y) - 32);
}
