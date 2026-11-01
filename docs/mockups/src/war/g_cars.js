// TARGET ART (mock-up only). Car models in the game's pixel idiom: painted on an art-pixel grid (1 art px = 2 world px), a 1-px ink outline, light from the upper left,
// wheels that stick out of the body, glass with a glint, lights that glow, and per-model shapes (sedan, hatchback, taxi, police, van, pickup, ambulance, bus, box truck, jeep).
// A car is painted once facing east, then turned by whole quarter turns (exact, no smoothing). Sizes: a car is 2 tiles long and 1 tile wide (32 x 16 art px).
const INK = '#1b1a24';
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const sh = (h, k) => { const c = hex(h).map((v) => Math.max(0, Math.min(255, v + k))); return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const cache = new Map();
function ink(src) { const [c, g] = mk(src.width + 2, src.height + 2); const [s, sg] = mk(src.width, src.height); sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = INK; sg.fillRect(0, 0, s.width, s.height); for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy); g.drawImage(src, 1, 1); return c; }
const GLASS = '#33506a', GLASS_L = '#8ab6d0';
/** model: { kind, color, L (art px length), roof } */
function paint(kind, color) {
  const L = { bus: 62, truck: 44, van: 34, ambulance: 34, pickup: 34, jeep: 30 }[kind] || 32; const Wd = 16; const [c, g] = mk(L, Wd); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const body = color, lo = sh(color, -34), hi = sh(color, 30), dk = sh(color, -60);
  const wheel = (x) => { R(x, 0, 5, 3, '#14141a'); R(x, 13, 5, 3, '#14141a'); R(x + 1, 0, 3, 1, '#3a3a44'); R(x + 1, 13, 3, 1, '#3a3a44'); };
  const bodyBox = (x0, x1, y0 = 2, y1 = 14) => { R(x0, y0, x1 - x0, y1 - y0, body); R(x0, y0, x1 - x0, 1, hi); R(x0, y1 - 1, x1 - x0, 1, lo); R(x0 + 1, y0 + 1, x1 - x0 - 2, 1, sh(color, 12)); R(x0, y0, 1, 1, dk); R(x0, y1 - 1, 1, 1, dk); R(x1 - 1, y0, 1, 1, dk); R(x1 - 1, y1 - 1, 1, 1, dk); };
  const lights = (xf, xr) => { R(xf - 1, 3, 1, 2, '#fff3b0'); R(xf - 1, 11, 1, 2, '#fff3b0'); R(xf - 2, 3, 1, 1, '#ffe27a'); R(xf - 2, 12, 1, 1, '#ffe27a'); R(xr, 3, 1, 2, '#e83a2a'); R(xr, 11, 1, 2, '#e83a2a'); };
  const mirror = (x) => { R(x, 1, 2, 1, dk); R(x, 14, 2, 1, dk); };
  if (kind === 'sedan' || kind === 'taxi' || kind === 'police') {
    wheel(5); wheel(22); bodyBox(1, 31); R(21, 3, 9, 10, sh(color, 6)); R(22, 7, 7, 1, hi); // hood
    R(16, 3, 5, 10, GLASS); R(17, 4, 3, 1, GLASS_L); R(17, 5, 2, 1, '#6a96b2'); R(15, 3, 1, 10, dk); // windscreen
    R(7, 3, 8, 10, kind === 'police' ? '#e8ecf0' : sh(color, 16)); R(8, 4, 6, 1, sh(color, 40)); R(7, 12, 8, 1, lo); // roof
    R(4, 3, 3, 10, GLASS); R(4, 4, 2, 1, GLASS_L); R(3, 3, 1, 10, dk); // rear window
    R(11, 2, 1, 12, lo); // door seam
    lights(31, 1); mirror(18); R(1, 7, 1, 2, '#e8e2d4'); R(30, 7, 1, 2, '#e8e2d4'); // plates
    if (kind === 'taxi') { R(10, 6, 4, 4, '#fff3b0'); R(10, 6, 4, 1, '#ffe27a'); R(7, 2, 8, 1, '#17161f'); R(12, 12, 2, 1, '#17161f'); for (let i = 0; i < 4; i++) { R(12 + i * 2, 13, 1, 1, '#17161f'); R(13 + i * 2, 2, 1, 1, '#17161f'); } }
    if (kind === 'police') { R(7, 3, 8, 10, '#e8ecf0'); R(21, 3, 9, 10, '#1f2f56'); R(7, 2, 9, 1, '#1f2f56'); R(9, 6, 2, 4, '#e83a2a'); R(11, 6, 2, 4, '#3a6ae8'); R(9, 5, 4, 1, '#14141a'); R(9, 10, 4, 1, '#14141a'); R(2, 4, 4, 8, '#1f2f56'); }
  } else if (kind === 'hatch') {
    wheel(5); wheel(21); bodyBox(2, 30); R(22, 3, 8, 10, sh(color, 6)); R(22, 7, 6, 1, hi); R(17, 3, 4, 10, GLASS); R(18, 4, 2, 1, GLASS_L); R(16, 3, 1, 10, dk); R(6, 3, 10, 10, sh(color, 16)); R(7, 4, 8, 1, sh(color, 40)); R(3, 3, 3, 10, GLASS); R(4, 4, 1, 1, GLASS_L); R(11, 2, 1, 12, lo); lights(30, 2); mirror(19);
  } else if (kind === 'van' || kind === 'ambulance') {
    wheel(5); wheel(24); bodyBox(1, 33); R(26, 3, 6, 10, sh(color, 6)); R(24, 3, 3, 10, GLASS); R(25, 4, 1, 1, GLASS_L); R(23, 3, 1, 10, dk); R(3, 3, 20, 10, sh(color, 18)); R(4, 4, 18, 1, sh(color, 44)); R(3, 12, 20, 1, lo); for (let x = 7; x < 22; x += 5) R(x, 3, 1, 10, sh(color, -6)); R(3, 7, 2, 2, sh(color, -20)); lights(33, 1); mirror(25);
    if (kind === 'ambulance') { R(8, 6, 8, 4, '#e83a2a'); R(11, 4, 2, 8, '#e83a2a'); R(23, 3, 1, 10, '#e83a2a'); R(4, 3, 3, 2, '#e83a2a'); R(4, 11, 3, 2, '#3a6ae8'); R(1, 6, 2, 4, '#fff'); }
  } else if (kind === 'pickup') {
    wheel(5); wheel(24); bodyBox(1, 33); R(26, 3, 6, 10, sh(color, 6)); R(21, 3, 5, 10, GLASS); R(22, 4, 2, 1, GLASS_L); R(20, 3, 1, 10, dk); R(13, 3, 7, 10, sh(color, 16)); R(14, 4, 5, 1, sh(color, 40)); R(2, 3, 11, 10, '#2a2a30'); R(3, 4, 9, 8, '#3a3a42'); R(2, 3, 11, 1, lo); R(4, 5, 4, 3, '#8a6a3a'); R(5, 6, 2, 1, '#b08a50'); R(8, 8, 3, 3, '#6a7a52'); R(9, 8, 1, 3, '#8a9a6a'); lights(33, 1); mirror(22);
  } else if (kind === 'jeep') {
    wheel(4); wheel(21); bodyBox(1, 29); R(20, 3, 8, 10, sh(color, 4)); R(17, 3, 2, 10, GLASS); R(17, 4, 1, 1, GLASS_L); R(16, 3, 1, 10, dk); R(4, 3, 12, 10, '#2e2e34'); R(5, 4, 10, 8, '#44444c'); R(7, 5, 3, 2, '#5a5a62'); R(11, 9, 4, 2, '#5a5a62'); R(3, 3, 1, 10, dk); R(10, 7, 6, 2, '#1a1a20'); R(14, 7, 6, 1, '#6a6a72'); R(27, 5, 2, 6, '#8a8a92'); lights(29, 1); R(1, 6, 1, 4, '#8a8a92'); // seats, mounted MG, bull bar
  } else if (kind === 'truck') {
    wheel(4); wheel(12); wheel(34); bodyBox(1, 43); R(33, 3, 9, 10, sh(color, 4)); R(36, 3, 4, 10, GLASS); R(37, 4, 2, 1, GLASS_L); R(35, 3, 1, 10, dk); R(2, 2, 29, 12, '#d8d4c8'); R(2, 2, 29, 1, '#f4f0e4'); R(2, 13, 29, 1, '#a8a498'); for (let x = 6; x < 30; x += 6) R(x, 2, 1, 12, '#a8a498'); R(8, 6, 14, 4, color); R(10, 7, 10, 2, sh(color, 30)); R(31, 3, 2, 10, dk); lights(43, 1); mirror(37);
  } else if (kind === 'bus') {
    wheel(6); wheel(14); wheel(46); bodyBox(1, 61); R(53, 3, 7, 10, sh(color, 4)); R(55, 3, 4, 10, GLASS); R(56, 4, 2, 1, GLASS_L); R(52, 3, 1, 10, dk); R(3, 3, 48, 10, sh(color, 14)); R(4, 4, 46, 1, sh(color, 40)); R(3, 12, 48, 1, lo); for (let x = 8; x < 48; x += 10) { R(x, 5, 6, 6, sh(color, 26)); R(x + 1, 6, 4, 4, sh(color, 6)); R(x + 2, 7, 2, 2, '#c8c4b8'); } R(3, 7, 48, 2, '#f4f0e4'); R(3, 7, 48, 1, '#fff'); lights(61, 1); mirror(55);
  }
  // wheels get a hub highlight
  return c;
}
/** a sprite facing dir ('E' | 'W' | 'N' | 'S'), outlined and scaled to world pixels (x2), with a hard 2-px shadow below-right */
export function car(kind, color, dir = 'E') {
  const key = `${kind}|${color}|${dir}`; if (cache.has(key)) return cache.get(key); const base = ink(paint(kind, color)); const w = base.width, h = base.height; let r;
  if (dir === 'E' || dir === 'W') { const [c, g] = mk(w * 2, h * 2); g.imageSmoothingEnabled = false; if (dir === 'W') { g.translate(w * 2, 0); g.scale(-1, 1); } g.drawImage(base, 0, 0, w * 2, h * 2); r = c; }
  else { const [c, g] = mk(h * 2, w * 2); g.imageSmoothingEnabled = false; g.translate(h * 2 / 2, w * 2 / 2); g.rotate(dir === 'S' ? Math.PI / 2 : -Math.PI / 2); g.drawImage(base, -w, -h, w * 2, h * 2); r = c; }
  // shadow
  const [o, og] = mk(r.width + 6, r.height + 6); og.imageSmoothingEnabled = false; const [s, sg] = mk(r.width, r.height); sg.drawImage(r, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(15,15,35,0.32)'; sg.fillRect(0, 0, s.width, s.height); og.drawImage(s, 4, 4); og.drawImage(r, 0, 0); cache.set(key, o); return o;
}
export const MODELS = [['sedan', '#b8483a'], ['sedan', '#3a5a8a'], ['sedan', '#2a2a2e'], ['hatch', '#4a7a4a'], ['hatch', '#c8b848'], ['sedan', '#e8e2d4'], ['taxi', '#e8c02a'], ['police', '#1f2f56'], ['van', '#a8a8a8'], ['van', '#6a4a8a'], ['ambulance', '#f4f2ee'], ['pickup', '#c8683a'], ['pickup', '#4a6a4a'], ['truck', '#3a5a8a'], ['bus', '#4a8a6a'], ['jeep', '#566a3e']];
export function drawCar(g, kind, color, dir, x, y) { const s = car(kind, color, dir); g.drawImage(s, Math.round(x - (s.width - 6) / 2), Math.round(y - (s.height - 6) / 2)); }
