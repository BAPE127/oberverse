// Pixel-art props (v0.39.0, art revamp stage 2): the commonest street and interior props redrawn
// on the art-pixel grid (one art pixel = 2 world pixels, 16 to a tile), with a dark outline and
// a light top edge, like the mockup. Anything not here falls back to the old drawing.
import { hash2 } from '../core/rng.js';

const INK = '#1b1a24';
const SHADOW = 'rgba(10,10,20,0.28)';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** Draw `p` in pixel art; false when this prop has no pixel version. */
export function drawPixelProp(ctx, p, opts) {
  const x = Math.round(p.x * 32);
  const y = Math.round(p.y * 32);
  const W = Math.round(p.w * 16); // art pixels
  const H = Math.round(p.h * 16);
  const R = (ax, ay, aw, ah, c) => { ctx.fillStyle = c; ctx.fillRect(x + ax * 2, y + ay * 2, aw * 2, ah * 2); };
  /** an outlined block: ink border, body, light top lip */
  // v0.46.0: a one-pixel outline (half an art unit) and a hairline highlight — finer, cleaner edges
  const box = (ax, ay, aw, ah, c, lip = 1) => { R(ax, ay, aw, ah, INK); R(ax + 0.5, ay + 0.5, aw - 1, ah - 1, c); if (lip) { R(ax + 0.5, ay + 0.5, aw - 1, lip, shade(c, 28)); R(ax + 0.5, ay + 0.5, aw - 1, 0.5, shade(c, 48)); } };
  const time = opts.time || 0;
  switch (p.type) {
    case 'tree': {
      const c = p.color || '#4f8a4a';
      const sway = Math.round(Math.sin(time * 0.8 + p.x) * 0.6);
      R(2, 13, 12, 3, SHADOW);
      R(6, 6, 4, 9, INK); R(7, 6, 2, 9, '#6b4a32');
      const blob = (bx, by, bw, bh, col) => { R(bx + 2, by, bw - 4, bh, col); R(bx + 1, by + 1, bw - 2, bh - 2, col); R(bx, by + 2, bw, bh - 4, col); };
      const clumps = [[-3, -8, 12, 12], [6, -9, 12, 12], [1, -14, 14, 11]];
      for (const [bx, by, bw, bh] of clumps) blob(bx - 0.5 + sway, by - 0.5, bw + 1, bh + 1, INK);
      for (const [bx, by, bw, bh] of clumps) blob(bx + sway, by, bw, bh, shade(c, -18));
      blob(-2 + sway, -9, 9, 8, c); blob(7 + sway, -10, 9, 8, c); blob(2 + sway, -14, 11, 8, c);
      blob(4 + sway, -13, 6, 4, shade(c, 24));
      R(4 + sway, -2, 2, 1, shade(c, -30)); R(12 + sway, -4, 2, 1, shade(c, -30));
      return true;
    }
    case 'pine': {
      const sway = Math.round(Math.sin(time * 0.7 + p.y) * 0.5);
      R(3, 13, 10, 3, SHADOW);
      R(7, 9, 2, 6, '#5a3d2a');
      const tiers = [['#2f5d46', 3, 14], ['#386b51', -3, 12], ['#41795b', -9, 8]];
      for (const [col, ty, tw] of tiers) {
        for (let k = 0; k < 7; k++) {
          const ww = Math.max(2, Math.round(tw * (k + 1) / 7));
          R(8 - ww / 2 - 1 + sway, ty + k, ww + 2, 1, INK);
          R(8 - ww / 2 + sway, ty + k, ww, 1, col);
        }
      }
      R(7 + sway, -10, 2, 1, INK);
      return true;
    }
    case 'bush': {
      R(1, H - 3, W - 2, 3, SHADOW);
      R(1, 2, W - 2, H - 4, INK); R(0, 3, W, H - 6, INK);
      R(2, 3, W - 4, H - 6, '#4a7f45'); R(1, 4, W - 2, H - 8, '#4a7f45');
      R(3, 3, W - 8, 2, '#62994f');
      for (let i = 0; i < W / 4; i++) R(2 + Math.floor(hash2(p.x + i, p.y) * (W - 4)), 5 + (i % 3) * 2, 1, 1, '#3a6a38');
      return true;
    }
    case 'flowerbed': {
      box(1, 3, W - 2, H - 5, '#6b4a32', 0);
      R(2, 4, W - 4, H - 7, '#5a8f4a');
      const cols = ['#f2a7c3', '#f6e27a', '#ffffff', '#c792ea'];
      for (let i = 0; i < p.w * 5; i++) R(3 + ((i * 7) % Math.max(1, W - 7)), 5 + ((i * 5) % Math.max(1, H - 10)), 2, 2, cols[i % 4]);
      return true;
    }
    case 'bench': {
      R(1, 12, W - 2, 2, SHADOW);
      R(2, 8, 2, 5, INK); R(W - 4, 8, 2, 5, INK);
      box(0, 6, W, 3, '#a0704a', 0); R(1, 6, W - 2, 1, '#c08a5c');
      box(0, 1, W, 3, '#8a5e3c', 0); R(1, 1, W - 2, 1, '#a0704a');
      return true;
    }
    case 'streetlamp': {
      // the mock-up's long shadow, cast down and to the right
      if (!opts.night) for (let k = 0; k < 14; k++) R(9 + k, 13 - Math.floor(k * 0.55), 2, 1, 'rgba(10,10,20,0.16)');
      R(5, 13, 6, 2, SHADOW);
      R(5, 12, 6, 2, INK); R(6, 12, 4, 1, '#3a404c');
      R(7, -10, 2, 23, INK);
      R(4, -16, 8, 7, INK);
      R(5, -15, 6, 5, opts.night ? '#ffe6a3' : '#cfd6dc'); R(5, -15, 6, 1, opts.night ? '#fff6d0' : '#e8eef2');
      R(3, -17, 10, 2, INK);
      return true;
    }
    case 'rock': {
      R(1, 11, 14, 3, SHADOW);
      R(2, 4, 12, 9, INK); R(1, 6, 14, 5, INK);
      R(3, 5, 10, 7, '#8d8f94'); R(2, 7, 12, 3, '#8d8f94');
      R(4, 5, 5, 2, '#a5a7ab'); R(9, 10, 4, 1, '#6e7076');
      return true;
    }
    case 'crate': {
      R(1, H - 2, W - 1, 2, SHADOW);
      box(1, 1, W - 2, H - 2, '#9a6b45');
      R(2, 3, W - 4, 1, '#6b4a32'); R(2, H - 4, W - 4, 1, '#6b4a32');
      for (let k = 0; k < W - 6; k++) R(3 + k, 4 + Math.floor(k * (H - 8) / Math.max(1, W - 6)), 1, 1, '#6b4a32');
      return true;
    }
    case 'barrel': {
      R(3, H - 2, W - 5, 2, SHADOW);
      R(4, 1, W - 8, H - 2, INK); R(3, 2, W - 6, H - 4, INK);
      R(4, 2, W - 8, H - 4, '#7d5235'); R(5, 2, 2, H - 4, '#9a6a45');
      R(3, 4, W - 6, 1, '#4a4a50'); R(3, H - 5, W - 6, 1, '#4a4a50');
      R(5, 1, W - 10, 1, '#5a3a24');
      return true;
    }
    case 'hydrant': {
      R(4, 13, 8, 2, SHADOW);
      R(5, 4, 6, 10, INK); R(4, 7, 8, 3, INK);
      R(6, 5, 4, 8, '#c0414a'); R(5, 8, 6, 1, '#c0414a'); R(6, 5, 1, 8, '#e06a6a');
      R(6, 3, 4, 2, INK); R(7, 4, 2, 1, '#d8d0c0');
      return true;
    }
    case 'trash': {
      R(1, 13, 14, 2, SHADOW);
      box(1, 5, 9, 9, '#2a2a30'); box(8, 7, 7, 7, '#3a3a44');
      R(5, 4, 1, 1, INK); R(4, 4, 3, 1, '#4a4a54');
      R(2, 12, 4, 2, '#e6dcc8'); R(11, 6, 2, 3, '#c8503c');
      return true;
    }
    case 'dumpster': {
      const c = p.color || '#3f6a4a';
      R(2, H - 2, W - 1, 2, SHADOW);
      box(1, 2, W - 2, H - 3, c, 0);
      R(0, 0, W, 4, INK); R(1, 1, W - 2, 2, shade(c, -20)); R(1, 1, W - 2, 1, shade(c, 10));
      R(4, 6, W - 8, 1, shade(c, -30)); R(4, H - 4, 2, 1, '#c9ced4'); R(W - 6, H - 4, 2, 1, '#c9ced4');
      return true;
    }
    case 'bed': {
      const c = p.color || '#6f8fb5';
      R(1, H - 1, W - 1, 1, SHADOW);
      box(0, 0, W, H, '#6b4a32', 0);
      R(2, 2, W - 4, 6, '#f3efe6'); R(2, 7, W - 4, 1, '#cfc8b8');
      R(2, 8, W - 4, H - 10, c); R(2, 8, W - 4, 2, shade(c, 25)); R(2, H - 3, W - 4, 1, shade(c, -25));
      return true;
    }
    case 'cot': {
      box(1, 1, W - 2, H - 2, '#5b6b4a', 0);
      R(3, 2, W - 6, 4, '#d8d0b8'); R(2, 6, W - 4, 1, '#4a5a3c');
      return true;
    }
    case 'wardrobe': case 'shelf': case 'cabinet': case 'toolrack': case 'display': {
      if (p.type === 'display' && p.variant === 'guns') return false;
      const col = { wardrobe: '#7a5236', shelf: '#8a6142', cabinet: '#6f7a86', toolrack: '#6b5a48', display: '#a07850' }[p.type];
      R(1, H - 1, W, 2, SHADOW);
      box(0, -5, W, H + 4, col, 2);
      if (p.type === 'cabinet') {
        for (let i = 0; i < 3; i++) { R(2, -2 + i * 5, W - 4, 4, '#c9ced4'); R(2, 1 + i * 5, W - 4, 1, '#9aa0a8'); R(W / 2 - 1, i * 5, 3, 1, '#4a4f55'); }
      } else if (p.type === 'shelf') {
        const cols = ['#e7d7b0', '#c86b4a', '#6a8f6b', '#f2c14e', '#6a7fae'];
        R(1, 2, W - 2, 1, shade(col, -30)); R(1, H - 3, W - 2, 1, shade(col, -30));
        for (let i = 0; i < W - 3; i += 3) { R(2 + i, -2 + (hash2(p.x + i, p.y) > 0.5 ? 1 : 0), 2, 4 - (hash2(p.x + i, p.y) > 0.5 ? 1 : 0), cols[i % 5]); R(2 + i, 4, 2, H - 7, cols[(i + 2) % 5]); }
      } else if (p.type === 'toolrack') {
        for (let i = 0; i < p.w * 3; i++) { R(3 + i * 4, -2, 1, 8 - (i % 3) * 2, '#c9ced4'); R(2 + i * 4, -2, 3, 1, '#8a9098'); }
      } else if (p.type === 'display') {
        R(2, -3, W - 4, H, '#9cc8d8'); R(3, -3, 2, H, '#cfe8f0');
        for (let i = 0; i < Math.floor((W - 6) / 5); i++) { R(4 + i * 5, 1, 3, 3, '#d99a4e'); R(4 + i * 5, 1, 1, 1, '#f2c48a'); }
      } else {
        R(W / 2 - 1, -3, 1, H, INK); R(W / 2 - 3, 3, 1, 2, '#d8b060'); R(W / 2 + 1, 3, 1, 2, '#d8b060');
      }
      return true;
    }
    case 'desk': case 'table': case 'counter': case 'workbench': case 'lectern': {
      const col = p.color || { desk: '#7a5236', table: '#a0704a', counter: '#b07a52', workbench: '#7d6a55', lectern: '#6b4a32' }[p.type];
      R(2, H - 2, W - 1, 3, SHADOW);
      R(1, 3, W - 2, H - 3, INK); R(2, 4, W - 4, H - 5, shade(col, -28));
      box(0, 0, W, H - 5, col);
      if (p.type === 'desk') { R(4, 2, 6, 5, '#f3efe6'); R(5, 3, 4, 1, '#a8a29a'); R(5, 5, 3, 1, '#a8a29a'); R(W - 8, 2, 3, 4, '#3a3a45'); }
      if (p.type === 'lectern') { R(3, 2, 10, 5, '#e9dfc7'); R(8, 2, 1, 5, '#8a3b2b'); }
      if (p.type === 'workbench') { R(4, 2, 5, 2, '#c9ced4'); R(15, 2, 6, 3, '#c0614a'); R(W - 6, 2, 2, 2, '#e8b83a'); }
      if (p.type === 'table') { R(6, 2, 4, 3, '#f3efe6'); R(7, 3, 2, 1, '#c86b4a'); }
      if (p.type === 'counter') { for (let i = 4; i < W - 2; i += 8) R(i, 2, 3, 2, '#e7d7b0'); }
      return true;
    }
    case 'chair': {
      R(4, 13, 9, 2, SHADOW);
      box(4, 5, 8, 8, '#7a5236', 0);
      R(4, 2, 8, 4, INK); R(5, 3, 6, 2, '#5e3e28');
      return true;
    }
    case 'oven': case 'stove': {
      R(1, H - 1, W, 2, SHADOW);
      box(0, -3, W, H + 2, '#3c3c44', 2);
      R(3, 3, W - 6, 6, INK); R(4, 4, W - 8, 4, opts.night || p.type === 'oven' ? '#e07a3a' : '#555560');
      if (p.type === 'stove') for (let i = 0; i < 2; i++) R(3 + i * (W - 9), -1, 3, 2, '#20202a');
      return true;
    }
    case 'floorlamp': { // v0.88.0: the headquarters' brass lamps (the shade is the colour of their light)
      R(5, 13, 6, 2, SHADOW);
      R(5, 12, 6, 2, INK); R(6, 12, 4, 1, '#8a6a2a');
      R(8, 5, 1, 8, INK); R(7, 5, 1, 8, '#a8832e');
      R(4, 1, 9, 5, INK); R(5, 2, 7, 3, p.color || '#f2c870'); R(5, 2, 7, 1, opts.night ? '#ffffff' : '#fffaf0');
      return true;
    }
    case 'plant': {
      R(4, 13, 9, 2, SHADOW);
      box(5, 8, 6, 6, '#b5683f', 1);
      for (const [lx, ly] of [[3, 2], [7, 0], [10, 3], [5, 5], [9, 5]]) { R(lx, ly, 3, 4, INK); R(lx, ly, 2, 3, '#4f8a4a'); }
      R(7, 1, 1, 2, '#6aa860');
      return true;
    }
    case 'rug': {
      const c = p.color || '#8e5a6e';
      R(1, 1, W - 2, H - 2, shade(c, -30)); R(2, 2, W - 4, H - 4, c);
      R(4, 4, W - 8, 1, '#e8d8b8'); R(4, H - 5, W - 8, 1, '#e8d8b8'); R(4, 4, 1, H - 8, '#e8d8b8'); R(W - 5, 4, 1, H - 8, '#e8d8b8');
      for (let i = 2; i < W - 2; i += 2) { R(i, 0, 1, 1, '#e8d8b8'); R(i, H - 1, 1, 1, '#e8d8b8'); }
      return true;
    }
    case 'window': {
      const hh = Math.round(H / 2);
      R(1, 1, W - 2, hh + 2, '#5a3f2c');
      R(2, 2, W - 4, hh, opts.night ? '#2c3a5a' : '#a8cfe0');
      if (!opts.night) R(3, 3, 2, hh - 2, '#d8eef6');
      R(W / 2 - 1, 2, 1, hh, '#5a3f2c');
      return true;
    }
    case 'lift': {
      // brushed-steel doors in the back wall, a brass dial over them, a call button
      R(1, 0, 14, 16, INK);
      R(2, 1, 12, 15, '#5a5e68');
      R(3, 4, 10, 12, '#b8bec8'); R(3, 4, 1, 12, '#d8dee6'); R(8, 4, 1, 12, '#6a6e78'); R(12, 4, 1, 12, '#8a909a');
      R(5, 1, 6, 2, '#c9a24a'); R(7 + Math.round(Math.sin((opts.time || 0) * 0.7 + p.x) * 2), 1, 1, 1, INK);
      R(14, 8, 1, 2, '#e8b83a');
      return true;
    }
    case 'helipad': {
      R(0, 0, W, H, '#5a5c62');
      const r = W / 2 - 3;
      for (let yy = 0; yy < H; yy++) {
        const dy = yy - H / 2 + 0.5;
        const half = Math.sqrt(Math.max(0, r * r - dy * dy));
        if (half <= 0) continue;
        const x0 = Math.round(W / 2 - half);
        R(x0, yy, Math.round(half * 2), 1, '#e8b83a');
        const inner = Math.sqrt(Math.max(0, (r - 2) ** 2 - dy * dy));
        if (inner > 0) R(Math.round(W / 2 - inner), yy, Math.round(inner * 2), 1, '#4a4c52');
      }
      const hx = W / 2 - 8;
      const hy = H / 2 - 10;
      R(hx, hy, 4, 20, '#f2efe6'); R(hx + 12, hy, 4, 20, '#f2efe6'); R(hx + 4, hy + 8, 8, 4, '#f2efe6');
      for (let k = 2; k < W - 2; k += 6) { R(k, 1, 3, 1, '#f2efe6'); R(k, H - 2, 3, 1, '#f2efe6'); }
      return true;
    }
    // Neumina megacity kit: dark bodies with always-lit neon (no night test, the city never goes dark)
    case 'holo_billboard': {
      const c = p.color || '#ff3fb4';
      R(5, 13, 22, 2, SHADOW); R(14, -34, 4, 47, INK); R(15, -34, 2, 47, '#2a2d38');
      box(2, -34, 28, 18, '#14151d', 0); R(4, -32, 24, 14, c); R(4, -32, 24, 1, shade(c, 60));
      for (let k = 0; k < 3; k++) R(6, -29 + k * 4, 8 + k * 5, 2, shade(c, -70));
      R(4, -16, 24, 1, '#ffffff');
      return true;
    }
    case 'neon_sign': {
      const c = p.color || '#4dfcff';
      R(4, 13, 8, 2, SHADOW); R(3, -24, 2, 38, INK); R(3.5, -24, 1, 38, '#2a2d38'); R(5, -22, 3, 2, INK);
      box(7, -24, 6, 22, '#14151d', 0); R(7, -24, 6, 1, c); R(7, -3, 6, 1, c); R(7, -24, 1, 22, c); R(12, -24, 1, 22, c);
      for (let k = 0; k < 4; k++) R(9, -21 + k * 5, 2 + (k % 2) * 2, 1, c);
      return true;
    }
    case 'holo_ad': {
      const c = p.color || '#7af7ff';
      const ph = Math.sin(time * 2 + p.x) * 2;
      R(2, 12, 12, 2, SHADOW); box(3, 10, 10, 4, '#1d1f2a', 0); R(5, 10, 6, 1, c);
      ctx.globalAlpha = 0.6; R(5, -6 + ph, 6, 14, c); R(3, -2 + ph, 10, 3, c); R(6, -8 + ph, 4, 2, '#ffffff'); ctx.globalAlpha = 1;
      return true;
    }
    case 'data_pylon': {
      R(2, 12, 12, 2, SHADOW); box(3, 3, 10, 11, '#14151d'); R(5, 5, 6, 4, '#4dfcff'); R(5, 5, 6, 1, '#b8fdff');
      R(5, 10, 1, 1, '#ff3fb4'); R(7, 10, 1, 1, '#4dfcff'); R(9, 10, 1, 1, '#ff3fb4');
      return true;
    }
    case 'security_camera': {
      R(4, 13, 8, 2, SHADOW); R(7, -14, 2, 27, INK); R(7.5, -14, 1, 27, '#2a2d38');
      const sw = Math.round(Math.sin(time * 0.8 + p.y) * 2);
      box(4 + sw, -18, 8, 5, '#2a2d36', 0); R(11 + sw, -16, 1, 2, '#7a9fff');
      if (Math.floor(time * 1.2) % 3 === 0) R(5 + sw, -17, 1, 1, '#ff2a2a');
      return true;
    }
    case 'drone_pad': {
      R(1, 2, W - 2, H - 2, INK); R(2, 3, W - 4, H - 4, '#1d1f2a');
      for (const [ax, ay] of [[3, 4], [W - 5, 4], [3, H - 5], [W - 5, H - 5]]) R(ax, ay, 2, 2, '#ffb02e');
      R(W / 2 - 6, H / 2 - 1, 12, 2, '#ffb02e'); R(W / 2 - 1, H / 2 - 6, 2, 12, '#ffb02e');
      const bob = Math.round(Math.sin(time * 1.6 + p.x) * 1.5);
      R(W / 2 - 3, H / 2 - 10 + bob, 6, 3, INK); R(W / 2 - 2, H / 2 - 10 + bob, 4, 2, '#2a2d36'); R(W / 2 - 6, H / 2 - 11 + bob, 12, 1, '#7af7ff');
      return true;
    }
    case 'neon_lamp': {
      const c = p.color || '#9fdcff';
      R(5, 13, 6, 2, SHADOW); R(5, 12, 6, 2, INK); R(7, -8, 2, 21, INK); R(7.5, -8, 1, 21, '#2a2d38');
      R(3, -11, 10, 3, INK); R(4, -10, 8, 1, c); R(4, -10, 8, 0.5, '#ffffff');
      return true;
    }
    case 'glow_planter': {
      R(1, 11, W - 2, 3, SHADOW); box(1, 6, W - 2, 7, '#1d1f2a'); R(2, 7, W - 4, 1, '#0d0e14');
      for (let k = 0; k < W - 6; k += 3) { const c = ['#2ff5d0', '#a064ff', '#4dfcff'][(k / 3) % 3]; const h = 2 + (k * 7) % 4; R(3 + k, 6 - h, 1, h, '#1f5a52'); R(2.5 + k, 4 - h, 2, 2, c); }
      return true;
    }
    case 'vent_stack': {
      R(2, 12, 12, 2, SHADOW); box(3, 9, 10, 5, '#1d1f2a'); box(5, -6, 6, 16, '#2b2e38'); R(4, -8, 8, 3, INK); R(5, -7, 6, 1, '#0d0e14');
      R(6, 0, 4, 1, '#0d0e14'); R(6, 3, 4, 1, '#0d0e14'); R(6, 6, 4, 1, '#0d0e14');
      R(10, -3, 2, 2, '#ffb02e');
      ctx.globalAlpha = 0.35; const st = (time * 0.3) % 1; R(6 + Math.round(Math.sin(time) * 1), -14 - Math.round(st * 6), 4, 4, '#cfd8e0'); ctx.globalAlpha = 1;
      return true;
    }
    case 'transit_shelter': {
      R(1, H - 2, W - 2, 2, SHADOW);
      R(1, 2, 2, H - 4, INK); R(W - 3, 2, 2, H - 4, INK);
      ctx.globalAlpha = 0.4; R(2, 3, W - 4, H - 8, '#9fe8ff'); ctx.globalAlpha = 1;
      box(0, 0, W, 4, '#1d1f2a'); R(1, 3, W - 2, 1, '#4dfcff');
      box(6, H - 9, W / 2 - 4, 3, '#3a3d4a', 0);
      box(W - 14, 5, 11, 8, '#14151d', 0); R(W - 13, 6, 9, 6, '#4dfcff'); R(W - 12, 8, 4, 1, '#14151d'); R(W - 7, 8, 2, 1, '#ff3fb4');
      return true;
    }
    case 'vend_neo': {
      const c = ['#ff3fb4', '#4dfcff', '#ffb02e'][Math.abs(Math.round(p.x + p.y)) % 3];
      R(2, 13, 12, 2, SHADOW); box(2, -2, 12, 16, '#14151d'); R(3, -1, 8, 11, c); R(3, -1, 8, 1, shade(c, 60));
      for (let k = 0; k < 3; k++) { R(4, 1 + k * 3, 2, 1, '#ffffff'); R(7, 1 + k * 3, 2, 1, shade(c, -60)); }
      R(4, 11, 6, 2, '#0a0a10'); R(12, 2, 1, 6, '#2a2d38');
      return true;
    }
    case 'market_stall_neo': {
      const c = p.color || '#ff3fb4';
      R(1, H - 2, W - 2, 2, SHADOW);
      box(1, 7, W - 2, 7, '#2a2630'); R(2, 7, W - 4, 1, '#1d1f2a');
      box(0, -8, W, 6, '#1d1f2a', 0); R(0, -3, W, 1, c);
      for (let k = 2; k < W - 3; k += 4) R(k, -2, 2, 2, k % 8 === 2 ? '#ffd27a' : '#4dfcff');
      R(3, 5, 3, 2, '#a064ff'); R(W - 7, 5, 3, 2, '#2ff5d0');
      box(W - 4, 11, 3, 3, '#7a5a42', 0);
      return true;
    }
    default: return false;
  }
}
