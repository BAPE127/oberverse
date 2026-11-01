// TARGET ART (mock-up only). Fire, smoke and explosions that look like the rest of the game's pixel art. The particle shapes come from d_fx.js, but they are drawn at art-pixel
// resolution (1 art px = 2 world px) onto a transparent canvas and then QUANTISED: fire is mapped onto a 7-colour ramp, smoke onto 5 greys with an ordered (Bayer) dither where it is
// translucent, and every blob gets a 1-px dark rim, like the 1-px ink outline on the game's sprites. No smooth gradients survive.
import * as F from './d_fx.js';
const FIRE = ['#2a0a08', '#6a1408', '#b02a12', '#e8581a', '#ff9a24', '#ffd24a', '#fff4b8'];
const SMOKE = ['#1e1e26', '#383842', '#585864', '#7e7e8c', '#a8a8b6'];
const DUST = ['#4a3c2c', '#6e5c44', '#98826a', '#c0aa8c', '#e0cdb0'];
const GREEN = ['#143a1c', '#2e8a3e', '#7af08a', '#e4ffe4'];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FR = FIRE.map(hex), SR = SMOKE.map(hex), DR = DUST.map(hex), GR = GREEN.map(hex);
/** turns a smooth RGBA particle canvas into palette-quantised, dithered, rimmed pixel art, in place */
export function quantise(c, o = {}) {
  const g = c.getContext('2d'); const w = c.width, h = c.height; const img = g.getImageData(0, 0, w, h); const d = img.data; const kind = new Uint8Array(w * h); const lvl = new Uint8Array(w * h); const on = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = y * w + x, i = n * 4; const a = d[i + 3] / 255; if (a < 0.06) continue; const r = d[i], gg = d[i + 1], b = d[i + 2];
    const warm = r - b > 46, green = gg - r > 30 && gg - b > 20; const lum = (r * 0.45 + gg * 0.4 + b * 0.15) / 255;
    if (warm) { const v = Math.min(1, lum * 1.12 + (a > 0.9 ? 0.05 : 0)); const k = Math.min(6, Math.floor(v * 7)); if (a < BAYER[y & 3][x & 3] * 0.9 + 0.08) continue; kind[n] = 1; lvl[n] = k; on[n] = 1; }
    else if (green) { const k = Math.min(3, Math.floor(lum * 4.4)); if (a < BAYER[y & 3][x & 3] * 0.8 + 0.1) continue; kind[n] = 3; lvl[n] = k; on[n] = 1; }
    else { const dusty = r > b + 14 && r > 120; const k = Math.min(4, Math.max(0, Math.floor((lum - 0.12) * 5.6))); if (a < BAYER[y & 3][x & 3] * 0.95 + 0.04) continue; kind[n] = dusty || o.dust ? 2 : 0; lvl[n] = k; on[n] = 1; }
  }
  const out = g.createImageData(w, h); const od = out.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = y * w + x; if (!on[n]) continue; const edge = !on[n - 1] || !on[n + 1] || !on[n - w] || !on[n + w] || x === 0 || y === 0; const k = kind[n]; const ramp = k === 1 ? FR : k === 2 ? DR : k === 3 ? GR : SR; let l = lvl[n];
    if (edge && k !== 3) l = k === 1 ? Math.max(0, l - 3) : 0; else if (edge) l = 0;
    const col = ramp[Math.min(ramp.length - 1, l)]; const i = n * 4; od[i] = col[0]; od[i + 1] = col[1]; od[i + 2] = col[2]; od[i + 3] = 255;
  }
  g.putImageData(out, 0, 0); return c;
}
/** draw effects into a pixel layer over the world. fn(og) draws with the d_fx functions in WORLD coordinates (the layer applies the camera); smoke and fire share the pass. */
export function pixelFx(g, cam, view, fn, o = {}) {
  const z = cam.z || 1; const w = Math.ceil(view.w / 2), h = Math.ceil(view.h / 2); const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const og = oc.getContext('2d');
  og.imageSmoothingEnabled = false; og.setTransform(z / 2, 0, 0, z / 2, -cam.x * z / 2, -cam.y * z / 2); fn(og); og.setTransform(1, 0, 0, 1, 0, 0); quantise(oc, o);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(oc, 0, 0, w * 2, h * 2); g.restore();
}
export { F };
