// TARGET ART (mock-up only). Shared helpers for the "detail" renderer: noise, colour, canvases, 2.5D extrusion and lighting.
export const INK = '#17161f';
export const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const hexRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgbHex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const shade = (h, k) => { const [r, g, b] = hexRgb(h); return rgbHex(r + k, g + k, b + k); };
export const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
export const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
/** smooth value noise, 0..1 */
export function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
}
export function fbm(x, y, seed = 0, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2; } return s / n; }
export function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** ink outline traced round a sprite (silhouette dilation); width px */
export function outline(src, col = INK, w = 1) {
  const [c, g] = mk(src.width + 2 * w, src.height + 2 * w); const [s, sg] = mk(src.width, src.height);
  sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, src.width, src.height);
  for (let dx = -w; dx <= w; dx++) for (let dy = -w; dy <= w; dy++) if (Math.abs(dx) + Math.abs(dy) <= w + 0) g.drawImage(s, w + dx, w + dy);
  g.drawImage(src, w, w); return c;
}
/** a flat-colour copy of a sprite's silhouette */
export function silhouette(src, col) { const [c, g] = mk(src.width, src.height); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
/** side faces: stack darkened copies of the silhouette downwards (and a little right) so a flat sprite gains height */
export function extrude(src, depth, col = 'rgba(0,0,0,.45)', dx = 0.0, dy = 1) {
  const [c, g] = mk(src.width + Math.ceil(Math.abs(dx * depth)) + 2, src.height + Math.ceil(depth * Math.abs(dy)) + 2);
  const sil = silhouette(src, col); for (let i = depth; i >= 1; i--) g.drawImage(sil, Math.round(dx * i), Math.round(dy * i)); g.drawImage(src, 0, 0); return c;
}
/** light from the upper left: brighten the lit edge, darken the far one, only where the sprite has pixels */
export function lit(src, strength = 0.28) {
  const [c, g] = mk(src.width, src.height); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, src.width, src.height); gr.addColorStop(0, `rgba(255,248,225,${strength})`); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(10,12,40,${strength * 1.3})`);
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c;
}
export const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export function poly(g, pts, fill, stroke, lw = 1) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
export function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
/** soft contact/cast shadow blob */
export function blob(g, x, y, rx, ry, a = 0.35, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(6,8,20,${a})`); gr.addColorStop(0.65, `rgba(6,8,20,${a * 0.75})`); gr.addColorStop(1, 'rgba(6,8,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore(); }
