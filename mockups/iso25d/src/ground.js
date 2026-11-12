// CONCEPT STUDY ONLY — the ground: one textured height-stepped mesh built from the game's tile grid.
import { THREE, hash, canvas, tex, shade, mix, mute, hexRgb } from './lib.js';

export const PPT = 32; // texture pixels per tile

/** how high each tile type sits (world units; a tile is 1 unit) — kerbs, quays and banks become real steps */
export const HEIGHT = { '.': 0.05, ',': 0.1, '=': 0, ':': 0.035, '~': -0.34, b: 0.14, p: 0.14, s: 0.0, r: 0.42, B: 0.1, D: 0.1, W: 0.12, f: 0.12, t: 0.12, c: 0.12, g: 0.07, m: 0.1, u: 0.02, k: 0.03, R: 0.85, a: 0.01, x: -0.34 };
const SIDE = { ',': '#8f8a80', m: '#8f8a80', b: '#6d4c33', p: '#6d4c33', r: '#6c6e73', R: '#5d6a45', '.': '#5d5140', ':': '#7c6647', g: '#7d7f7c', B: '#77726a', D: '#77726a', W: '#77726a', f: '#77726a', t: '#77726a', c: '#77726a', s: '#bfae82', u: '#5c5040', k: '#6c5637', a: '#33353b', '=': '#3b3d44' };

/** Build the composite tile grid for a window of the region: streets, then cut-away rooms over their footprints. */
export function composite(data, win, cutIds) {
  const { x0, y0, w, h } = win;
  const grid = Array.from({ length: h }, () => Array(w).fill('x'));
  const interior = Array.from({ length: h }, () => Array(w).fill(false));
  const put = (L, onlyInterior) => {
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const gx = x + L.ox - x0, gy = y + L.oy - y0;
      if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
      grid[gy][gx] = L.rows[y][x];
      if (onlyInterior) interior[gy][gx] = true;
    }
  };
  const M = data.layers[0];
  for (let gy = 0; gy < h; gy++) for (let gx = 0; gx < w; gx++) { const mx = Math.max(0, Math.min(M.w - 1, gx + x0 - M.ox)), my = Math.max(0, Math.min(M.h - 1, gy + y0 - M.oy)); const ch = M.rows[my][mx]; const out = mx !== gx + x0 - M.ox || my !== gy + y0 - M.oy; grid[gy][gx] = ch === 'B' || ch === 'D' || (out && 'rR=,m:gabp'.includes(ch)) ? '.' : ch; }
  for (const L of data.layers) if (L.kind !== 'interior') put(L, false);
  for (const L of data.layers) if (L.kind === 'interior' && cutIds.has(L.id)) put(L, true);
  return { grid, interior };
}

const PAL = {
  clear: { '.': '#6a8c52', ',': '#b3ab9b', '=': '#4a4d55', ':': '#ad9166', '~': '#3b7c96', b: '#8d6442', p: '#96704c', s: '#dbc896', r: '#85878c', B: '#8a857c', D: '#8a857c', W: '#3a3530', f: '#ad8258', t: '#d2ccc0', c: '#84566a', g: '#9c9e9b', m: '#cbc4b4', u: '#75675a', k: '#8f7149', R: '#66783f', a: '#3c3e46', x: '#2b6d8c' },
  snow: { '.': '#e9eef3', ',': '#dfe4ea', '=': '#6f747e', ':': '#dcdfe2', '~': '#5e8ea2', b: '#b9b3ad', p: '#c6c0b8', s: '#e6e8ea', r: '#c9ced4', B: '#8a857c', D: '#8a857c', W: '#3a3530', f: '#ad8258', t: '#d2ccc0', c: '#84566a', g: '#d5d9de', m: '#e2e6ea', u: '#c9c7c4', k: '#e4e8ec', R: '#dfe6ea', a: '#70757e', x: '#5e8ea2' },
};

function roadRuns(grid, w, h) {
  const H = new Int16Array(w * h), V = new Int16Array(w * h), HI = new Int16Array(w * h), VI = new Int16Array(w * h);
  const isR = (x, y) => grid[y]?.[x] === '=';
  for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!isR(x, y)) { x++; continue; } let e = x; while (e < w && isR(e, y)) e++; for (let k = x; k < e; k++) { H[y * w + k] = e - x; HI[y * w + k] = k - x; } x = e; } }
  for (let x = 0; x < w; x++) { let y = 0; while (y < h) { if (!isR(x, y)) { y++; continue; } let e = y; while (e < h && isR(x, e)) e++; for (let k = y; k < e; k++) { V[k * w + x] = e - y; VI[k * w + x] = k - y; } y = e; } }
  return { H, V, HI, VI };
}

/** Paint the ground texture (and a roughness map) for the window. */
export function paintGround(C, win, opts) {
  const { grid, interior } = C; const { w, h, x0, y0 } = win; const T = PPT;
  const snow = opts.weather === 'snow', rain = opts.weather === 'rain';
  const pal = snow ? PAL.snow : PAL.clear;
  const cv = canvas(w * T, h * T); const c = cv.getContext('2d');
  const rv = canvas(w * T / 2, h * T / 2); const r = rv.getContext('2d'); r.scale(0.5, 0.5); // roughness (green channel)
  const rough = (v) => { const k = Math.round(v * 255); return `rgb(${k},${k},${k})`; };
  const runs = roadRuns(grid, w, h);
  const R = (px, py, pw, ph, col) => { c.fillStyle = col; c.fillRect(px, py, pw, ph); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = grid[y][x]; const px = x * T, py = y * T; const inn = interior[y][x];
    const wx = x + x0, wy = y + y0; const k = hash(wx, wy, 1), k2 = hash(wx, wy, 2);
    let base = pal[ch] || '#555';
    if (inn && ch === 'g') base = '#9c9e9b';
    R(px, py, T, T, shade(base, Math.round((k - 0.5) * 8)));
    let ro = 0.95;
    if (inn) {
      if (ch === 'f') { // wood planks, running east–west
        for (let j = 0; j < 4; j++) { const kk = hash(wx, wy * 4 + j, 3); R(px, py + j * 8, T, 8, shade('#a87d54', Math.round((kk - 0.5) * 30))); R(px, py + j * 8 + 7, T, 1, '#6e4f33'); const jx = Math.floor(hash(wx, wy * 4 + j, 4) * T); R(px + jx, py + j * 8, 1, 7, '#6e4f33'); }
        ro = 0.6;
      } else if (ch === 't') { // checker tiles
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { R(px + i * 16, py + j * 16, 16, 16, (i + j) % 2 ? '#cfc8ba' : '#e3ddd0'); R(px + i * 16, py + j * 16, 16, 1, '#a9a295'); R(px + i * 16, py + j * 16, 1, 16, '#a9a295'); }
        ro = 0.35;
      } else if (ch === 'c') { // carpet with a woven fleck
        R(px, py, T, T, '#7c5063'); for (let i = 0; i < 26; i++) R(px + Math.floor(hash(wx, wy, i + 10) * T), py + Math.floor(hash(wx, wy, i + 60) * T), 2, 1, i % 3 ? '#8d6075' : '#6a4254'); if ((wx + wy) % 2 === 0) { c.strokeStyle = 'rgba(210,170,120,0.25)'; c.strokeRect(px + 6.5, py + 6.5, T - 13, T - 13); }
        ro = 1;
      } else if (ch === 'g') { R(px, py, T, T, shade('#9a9c99', Math.round((k - 0.5) * 10))); if (wx % 3 === 0) R(px, py, 1, T, '#7f817e'); if (wy % 3 === 0) R(px, py, T, 1, '#7f817e'); if (k2 > 0.86) { c.fillStyle = 'rgba(40,40,40,0.18)'; c.beginPath(); c.ellipse(px + 16, py + 16, 9 + k * 5, 6 + k2 * 4, k * 3, 0, 7); c.fill(); } ro = 0.7; }
      else if (ch === 'W' || ch === 'D') { R(px, py, T, T, ch === 'D' ? '#9a8a74' : '#4a433c'); }
    } else if (ch === '.') {
      if (!snow) { for (let i = 0; i < 16; i++) { const tx = px + hash(wx, wy, i + 5) * T, ty = py + hash(wx, wy, i + 25) * T; R(tx | 0, ty | 0, 1, 3, i % 2 ? '#86b36a' : '#5a8648'); } if (k > 0.93) { R(px + 10, py + 12, 2, 2, '#f1e9a0'); R(px + 20, py + 22, 2, 2, '#f4f1e4'); } }
      else { for (let i = 0; i < 4; i++) R(px + (hash(wx, wy, i + 5) * T | 0), py + (hash(wx, wy, i + 25) * T | 0), 3, 2, '#d5dde8'); if (k > 0.8) R(px + 8 + (k2 * 12 | 0), py + 10, 1, 4, '#7d8b5c'); }
    } else if (ch === ',' || ch === 'm') {
      const S = ch === 'm' ? 32 : 16;
      for (let j = 0; j < T / S; j++) for (let i = 0; i < T / S; i++) { const kk = hash(wx * 2 + i, wy * 2 + j, 7); const col = snow ? (kk > 0.3 ? shade(base, (kk - 0.5) * 10 | 0) : mix(base, '#9a968e', 0.55)) : shade(base, Math.round((kk - 0.5) * 16)); R(px + i * S, py + j * S, S, S, col); R(px + i * S, py + j * S, S, 1, snow ? '#c5ccd4' : shade(base, -34)); R(px + i * S + (j % 2 ? S / 2 : 0), py + j * S, 1, S, snow ? '#c5ccd4' : shade(base, -30)); }
      if (!snow && k > 0.9) { c.strokeStyle = 'rgba(60,55,50,0.45)'; c.beginPath(); c.moveTo(px + 4, py + 6); c.lineTo(px + 14, py + 15); c.lineTo(px + 12, py + 27); c.stroke(); }
      ro = rain ? 0.4 : 0.9;
    } else if (ch === '=' || ch === 'a') {
      for (let i = 0; i < 14; i++) R(px + (hash(wx, wy, i + 5) * T | 0), py + (hash(wx, wy, i + 45) * T | 0), 1, 1, i % 2 ? shade(base, 16) : shade(base, -14));
      if (!snow && k > 0.9) R(px + 4, py + 6, 18, 12, shade(base, -10));
      if (!snow && k2 > 0.95) { c.fillStyle = '#3a3c42'; c.beginPath(); c.arc(px + 16, py + 16, 7, 0, 7); c.fill(); c.strokeStyle = '#6a6c72'; c.stroke(); }
      if (ch === '=') {
        const i = y * w + x; const hr = runs.H[i], vr = runs.V[i]; const horiz = hr >= vr; const wid = horiz ? vr : hr; const idx = horiz ? runs.VI[i] : runs.HI[i];
        const junction = hr > 6 && vr > 6 ? false : (hr <= 6 && vr <= 6);
        if (!junction && wid >= 3 && wid <= 6) {
          const line = snow ? 'rgba(235,238,242,0.35)' : '#d9cf9a'; const edge = snow ? 'rgba(235,238,242,0.3)' : 'rgba(225,225,220,0.75)';
          if (idx === Math.floor(wid / 2) && wid % 2 === 0) { if ((horiz ? wx : wy) % 2 === 0) { if (horiz) R(px + 4, py - 1, 22, 3, line); else R(px - 1, py + 4, 3, 22, line); } }
          if (idx === 0) { if (horiz) R(px, py + 3, T, 2, edge); else R(px + 3, py, 2, T, edge); }
          if (idx === wid - 1) { if (horiz) R(px, py + T - 5, T, 2, edge); else R(px + T - 5, py, 2, T, edge); }
          if (snow) { // slush with two wheel tracks per lane, snow banked at the kerbs
            const tr = 'rgba(58,62,70,0.55)'; if (horiz) { R(px, py + 6, T, 5, tr); R(px, py + 20, T, 5, tr); } else { R(px + 6, py, 5, T, tr); R(px + 20, py, 5, T, tr); }
            if (idx === 0 || idx === wid - 1) { const g = horiz ? c.createLinearGradient(0, py, 0, py + T) : c.createLinearGradient(px, 0, px + T, 0); const a = idx === 0 ? 0 : 1; g.addColorStop(a, 'rgba(236,240,245,0.95)'); g.addColorStop(0.5, 'rgba(236,240,245,0)'); g.addColorStop(1 - a, 'rgba(236,240,245,0)'); c.fillStyle = g; c.fillRect(px, py, T, T); }
          }
        }
      }
      ro = rain ? 0.22 : snow ? 0.7 : 0.88;
    } else if (ch === ':' || ch === 'u' || ch === 's') {
      for (let i = 0; i < 10; i++) R(px + (hash(wx, wy, i + 5) * T | 0), py + (hash(wx, wy, i + 45) * T | 0), 2, 1, i % 2 ? shade(base, 14) : shade(base, -16));
      if (ch === 'u' && k > 0.7 && !snow) { c.fillStyle = 'rgba(40,36,34,0.35)'; c.beginPath(); c.ellipse(px + 16, py + 18, 10, 6, 0, 0, 7); c.fill(); }
    } else if (ch === '~' || ch === 'x') {
      const g = c.createLinearGradient(px, py, px + T, py + T); g.addColorStop(0, shade(base, 6)); g.addColorStop(1, shade(base, -6)); c.fillStyle = g; c.fillRect(px, py, T, T);
      for (let i = 0; i < 3; i++) R(px + (hash(wx, wy, i + 5) * 22 | 0), py + (hash(wx, wy, i + 45) * T | 0), 8, 1, 'rgba(200,232,240,0.28)');
      ro = 0.12;
    } else if (ch === 'b' || ch === 'p') {
      for (let i = 0; i < 4; i++) { R(px + i * 8, py, 8, T, shade(base, Math.round((hash(wx * 4 + i, wy, 3) - 0.5) * 26))); R(px + i * 8, py, 1, T, shade(base, -40)); }
    } else if (ch === 'g') {
      if (wx % 4 === 0) R(px, py, 1, T, shade(base, -22)); if (wy % 4 === 0) R(px, py, T, 1, shade(base, -22));
      if (k > 0.88 && !snow) { c.fillStyle = 'rgba(30,30,34,0.2)'; c.beginPath(); c.ellipse(px + 16, py + 16, 10, 7, k * 3, 0, 7); c.fill(); }
      ro = rain ? 0.35 : 0.85;
    } else if (ch === 'k') {
      for (let j = 0; j < 4; j++) { R(px, py + j * 8, T, 3, shade(base, -22)); if (!snow) for (let i = 0; i < 4; i++) R(px + i * 8 + 2, py + j * 8 + 4, 3, 3, hash(wx * 4 + i, wy * 4 + j, 9) > 0.25 ? '#6f9a4a' : '#8bb05a'); }
    } else if (ch === 'r' || ch === 'R') {
      for (let i = 0; i < 6; i++) R(px + (hash(wx, wy, i + 5) * 26 | 0), py + (hash(wx, wy, i + 45) * 26 | 0), 6, 4, i % 2 ? shade(base, 14) : shade(base, -18));
    }
    r.fillStyle = rough(ro); r.fillRect(px, py, T, T);
  }
  // rain: standing water on roads and paving
  if (rain) {
    for (let i = 0; i < w * h / 5; i++) { const x = hash(i, 11) * w, y = hash(i, 12) * h; const ch = grid[y | 0]?.[x | 0]; if (ch !== '=' && ch !== ',' && ch !== 'g' && ch !== 'm') continue; const rx = 8 + hash(i, 13) * 26, ry = 5 + hash(i, 14) * 12; c.fillStyle = 'rgba(20,24,34,0.32)'; c.beginPath(); c.ellipse(x * T, y * T, rx, ry, hash(i, 15) * 3, 0, 7); c.fill(); r.fillStyle = rough(0.04); r.beginPath(); r.ellipse(x * T, y * T, rx, ry, hash(i, 15) * 3, 0, 7); r.fill(); }
    c.fillStyle = 'rgba(18,22,34,0.22)'; c.fillRect(0, 0, cv.width, cv.height);
  }
  // soft contact shading where the land meets water, and foam on the shore
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== '~') continue; const px = x * T, py = y * T;
    const land = (dx, dy) => { const n = grid[y + dy]?.[x + dx]; return n && n !== '~' && n !== 'x'; };
    if (land(0, -1)) { const g = c.createLinearGradient(0, py, 0, py + 20); g.addColorStop(0, 'rgba(10,30,45,0.55)'); g.addColorStop(1, 'rgba(10,30,45,0)'); c.fillStyle = g; c.fillRect(px, py, T, 20); }
    if (land(-1, 0)) { const g = c.createLinearGradient(px, 0, px + 20, 0); g.addColorStop(0, 'rgba(10,30,45,0.55)'); g.addColorStop(1, 'rgba(10,30,45,0)'); c.fillStyle = g; c.fillRect(px, py, 20, T); }
    if (land(0, 1)) R(px, py + T - 3, T, 2, 'rgba(225,240,244,0.5)');
    if (land(1, 0)) R(px + T - 3, py, 2, T, 'rgba(225,240,244,0.5)');
  }
  // broad natural variation: two octaves of value noise over everything outdoors
  const img = c.getImageData(0, 0, cv.width, cv.height); const d = img.data;
  const lat = (x, y, s) => hash(Math.floor(x / s), Math.floor(y / s), s);
  const vn = (x, y, s) => { const fx = (x / s) % 1, fy = (y / s) % 1; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); const a = lat(x, y, s), b = lat(x + s, y, s), e = lat(x, y + s, s), f = lat(x + s, y + s, s); return a + (b - a) * ux + (e - a) * uy + (a - b - e + f) * ux * uy; };
  for (let y = 0; y < cv.height; y++) { const ty = y / T | 0; for (let x = 0; x < cv.width; x++) { const tx = x / T | 0; if (interior[ty][tx]) continue; const ch = grid[ty][tx]; const amp = ch === '.' || ch === 'k' || ch === 'R' ? 0.3 : ch === '~' ? 0.1 : 0.12; const n = (vn(x + x0 * T + 1e5, y + y0 * T + 1e5, 90) - 0.5) * amp + (vn(x + x0 * T + 1e5, y + y0 * T + 1e5, 19) - 0.5) * amp * 0.6; const i = (y * cv.width + x) * 4; const m = 1 + n; d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; } }
  c.putImageData(img, 0, 0);
  return { cv, rv };
}

/** Darken the ground under and around things (painted contact shadows — cheap ambient occlusion). */
export function paintContact(cv, win, rects, alpha = 0.3, spread = 12) {
  const c = cv.getContext('2d'); const T = PPT;
  for (const q of rects) {
    const x = (q.x - win.x0) * T, y = (q.y - win.y0) * T, w = q.w * T, h = q.h * T;
    for (let i = spread; i > 0; i -= 2) { c.strokeStyle = `rgba(12,12,22,${alpha / (spread / 2) * 0.9})`; c.lineWidth = i * 2; c.strokeRect(x, y, w, h); }
  }
}

/** The stepped ground mesh: textured tops, coloured risers (kerbs, quay walls, banks). */
export function buildGround(C, win, textures, opts) {
  const { grid, interior } = C; const { w, h, x0, y0 } = win;
  const pos = [], uv = [], idx = []; const spos = [], scol = [], sidx = [], snor = [];
  const H = (x, y) => { const ch = grid[y]?.[x]; if (ch === undefined) return null; return HEIGHT[ch] ?? 0; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ht = H(x, y); const X = x + x0, Z = y + y0; const b = pos.length / 3;
    pos.push(X, ht, Z, X + 1, ht, Z, X + 1, ht, Z + 1, X, ht, Z + 1);
    uv.push(x / w, 1 - y / h, (x + 1) / w, 1 - y / h, (x + 1) / w, 1 - (y + 1) / h, x / w, 1 - (y + 1) / h);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    const ch = grid[y][x]; const col = new THREE.Color(opts.weather === 'snow' && !interior[y][x] && '.,m:sRrg'.includes(ch) ? '#aab4c0' : (SIDE[ch] || '#666'));
    const side = (nx, ny, ax, az, bx, bz, n) => { const nh = H(nx, ny); if (nh === null || nh >= ht - 0.001) return; const s = spos.length / 3; spos.push(ax, ht, az, bx, ht, bz, bx, nh, bz, ax, nh, az); for (let i = 0; i < 4; i++) { scol.push(col.r, col.g, col.b); snor.push(...n); } sidx.push(s, s + 1, s + 2, s, s + 2, s + 3); };
    side(x, y + 1, X + 1, Z + 1, X, Z + 1, [0, 0, 1]); side(x + 1, y, X + 1, Z, X + 1, Z + 1, [1, 0, 0]); side(x, y - 1, X, Z, X + 1, Z, [0, 0, -1]); side(x - 1, y, X, Z + 1, X, Z, [-1, 0, 0]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const top = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex(textures.cv), roughnessMap: tex(textures.rv, { srgb: false }), roughness: 1, metalness: 0 }));
  top.receiveShadow = true;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3)); sg.setAttribute('normal', new THREE.Float32BufferAttribute(snor, 3)); sg.setIndex(sidx);
  const sides = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ vertexColors: true })); sides.receiveShadow = true; sides.castShadow = true;
  const grp = new THREE.Group(); grp.add(top, sides); return grp;
}
