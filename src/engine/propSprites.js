// Prop sprites (v0.49.0, the art overhaul's phase 4): the props redrawn to the owner's mock-ups —
// one world pixel to a pixel, shaded as solid things lit from the top left, outlined, and casting a
// shadow down and to the right like everything else in the world.
//
// Each prop is painted once into a small offscreen canvas (a sprite) and copied from then on, so
// the detail costs nothing per frame. A sprite is made per look: type, size, colour, a variant
// (picked by where the prop stands, so a row of trees isn't a row of clones), day or night, and —
// for fences — which way its neighbours run. The outline is traced round the finished silhouette,
// and the shadow is the same silhouette moved down and to the right; the renderer draws the
// shadows first, on the ground, under everybody.
import { hash2 } from '../core/rng.js';
import { lightState, walkSignal } from '../world/lights.js';
import { EFFECTS } from './cardMagic.js';

const INK = '#1b1a24';
const SHADOW_RGB = '16,14,36';
const T = 32;

// ------------------------------------------------------------------ colour
const hexRgb = (h) => {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
/** Five shades of a colour, dark to light: shadows lean to ink-purple, lights to warm white. */
export function ramp(hex) {
  return [mix(hex, INK, 0.5), mix(hex, INK, 0.25), hex, mix(hex, '#fff6e0', 0.2), mix(hex, '#fffaf0', 0.42)];
}

// ------------------------------------------------------------------ the kit
function kit(ctx) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const P = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  /** A shaded ball (or egg): lit from the top left, a darker rim below. `rough` frays the edge. */
  const ball = (cx, cy, rx, ry, pal, rough = 0, seed = 0) => {
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
      for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        const edge = 1 + (rough ? (hash2(x * 3 + seed, y * 5 - seed) - 0.5) * rough : 0);
        if (d > edge) continue;
        let l = 0.52 - 0.34 * nx - 0.5 * ny + (1 - d) * 0.18 + (hash2(x + seed, y) - 0.5) * 0.1;
        if (d > 0.72 && ny > 0.15) l -= 0.18;
        P(x, y, pal[Math.max(0, Math.min(4, Math.floor(l * 5)))]);
      }
    }
  };
  /** A box seen from above and in front: a lit top `top` px deep, then a darker front. */
  const block = (x, y, w, h, top, pal, opts = {}) => {
    R(x, y, w, top, pal[3]);
    R(x, y, w, 1, pal[4]);
    R(x, y + top, w, h - top, pal[1]);
    R(x, y + top, w, 1, pal[0]);
    if (opts.edge !== false) { R(x, y, 1, h, pal[opts.leftLit ? 3 : 2]); R(x + w - 1, y, 1, h, pal[0]); }
  };
  /** A vertical cylinder: shaded across, a lit band left of centre. */
  const cyl = (x, y, w, h, pal) => {
    for (let i = 0; i < w; i++) {
      const t = (i + 0.5) / w;
      const l = t < 0.18 ? 2 : t < 0.42 ? 4 : t < 0.6 ? 3 : t < 0.82 ? 2 : 1;
      R(x + i, y, 1, h, pal[l]);
    }
  };
  /** A horizontal ellipse filled flat (lids, tops). */
  const ell = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const half = rx * Math.sqrt(1 - dy * dy);
      R(Math.round(cx - half), y, Math.max(1, Math.round(half * 2)), 1, c);
    }
  };
  const h = (a, b) => hash2(a, b);
  return { ctx, R, P, ball, block, cyl, ell, h };
}

// ------------------------------------------------------------------ painters
// Each: box(p) → [x0, y0, x1, y1] (the sprite's extent round the prop's top-left corner, in world
// px); shadow: [dx, dy] (0 for none); variants; night (looks different at night); paint(k, p, v, o).
const W = (p) => Math.round((p.w || 1) * T);
const H = (p) => Math.round((p.h || 1) * T);

const LEAVES = [
  ['#2f6b34', '#3f8a3e', '#55a24a', '#78c05a'], // deep green
  ['#3a7a32', '#4f9a3a', '#6ab446', '#94d05e'], // fresh
  ['#5a6a2a', '#7a8a32', '#a4a83e', '#d0c058'], // olive and gold, like the mock-up's woods
];

const PAINTERS = {
  tree: {
    box: () => [-16, -46, 50, 34], shadow: [16, 10], variants: 6,
    paint(k, p, v) {
      const { R, P, ball, h } = k;
      const kind = v % 3;
      const pal = p.color ? ramp(p.color) : (() => { const l = LEAVES[kind]; return [mix(l[0], INK, 0.35), l[0], l[1], l[2], l[3]]; })();
      const birch = kind === 2;
      // the trunk, flaring at the roots
      const bark = birch ? ['#5a5650', '#bdb8ac', '#e4e0d6', '#f4f2ea'] : ['#3e2a1c', '#5e4030', '#7a5640', '#94704e'];
      for (let y = -4; y < 30; y++) {
        const flare = y > 24 ? Math.floor((y - 24) / 2) : 0;
        const x0 = 13 - flare;
        const w = 6 + flare * 2;
        R(x0, y, w, 1, bark[1]);
        R(x0 + 1, y, 2, 1, bark[2]);
        R(x0 + 1, y, 1, 1, bark[3]);
        R(x0 + w - 2, y, 2, 1, bark[0]);
        if (birch && h(y, 7) > 0.78) R(x0 + 1 + Math.floor(h(y, 3) * 3), y, 2, 1, '#2a2622');
        if (!birch && h(y, 9) > 0.86) P(x0 + 3, y, bark[0]);
      }
      // the canopy: clumps of leaves, the far ones darker, each lit from the top left
      const jit = (i) => (h(v * 13 + i, 5) - 0.5) * 4;
      const clumps = [[-11, -10, 10], [12, -11, 10], [0, -21, 11], [-8, -22, 8], [9, -23, 8], [-10, 0, 9], [11, 0, 9], [0, -6, 12], [0, 3, 9]];
      const cx = 16;
      const cy = -12;
      for (let i = 0; i < clumps.length; i++) {
        const [dx, dy, r] = clumps[i];
        const far = i < 5 ? 1 : 0;
        const cp = far ? [pal[0], pal[0], pal[1], pal[2], pal[3]] : pal;
        ball(cx + dx + jit(i), cy + dy + jit(i + 9), r + 1, r, cp, 0.5, v * 31 + i);
      }
      // leaf flecks: a lit leaf here and there on the upper sides, dark gaps below
      for (let i = 0; i < 34; i++) {
        const x = Math.floor(cx - 18 + h(i, v + 3) * 36);
        const y = Math.floor(cy - 24 + h(v + 5, i) * 32);
        const up = y < cy - 4;
        R(x, y, 2, 1, up ? pal[4] : pal[1]);
        if (!up) P(x, y + 1, pal[0]);
      }
    },
  },
  pine: {
    box: () => [-10, -52, 44, 34], shadow: [14, 8], variants: 3,
    paint(k, p, v) {
      const { R, h } = k;
      const pal = ['#173a2c', '#22503a', '#2f6648', '#3f7e58', '#5e9a6a'];
      R(14, 14, 5, 16, '#4e3424'); R(15, 14, 2, 16, '#6e4a32'); R(18, 14, 1, 16, '#2e1e14');
      const tiers = [[16, 12, 17], [3, 10, 14], [-10, 9, 11], [-22, 8, 7], [-32, 7, 4]];
      for (const [ty, th, half] of tiers) {
        for (let r = 0; r < th; r++) {
          const w = Math.max(1, Math.round(half * (r + 1) / th));
          for (let x = -w; x <= w; x++) {
            const jag = r === th - 1 && h(x + v, ty) > 0.5 ? 1 : 0;
            const t = (x + w) / (2 * w + 1);
            const l = t < 0.3 ? 3 : t < 0.55 ? 2 : t < 0.8 ? 1 : 0;
            R(16 + x, ty + r + jag, 1, 1, pal[Math.min(4, l + (r < 2 ? 1 : 0))]);
          }
        }
        R(16 - half, ty + th - 1, half * 2 + 1, 1, pal[0]);
      }
    },
  },
  bush: {
    box: (p) => [-4, -10, W(p) + 6, H(p) + 4], shadow: [5, 4], variants: 3,
    paint(k, p, v) {
      const { ball, P, h } = k;
      const pal = [...ramp('#3f7f3c')];
      const n = Math.max(2, Math.round((p.w || 1) * 2.5));
      for (let i = 0; i < n; i++) {
        const x = 4 + (i + 0.5) * ((W(p) - 8) / n) + (h(i, v) - 0.5) * 4;
        ball(x, H(p) - 14 + (h(v, i) - 0.5) * 6, 9, 8, pal, 0.5, i * 7 + v);
      }
      if (v === 2) for (let i = 0; i < n * 3; i++) P(Math.floor(4 + h(i, 3) * (W(p) - 8)), Math.floor(H(p) - 22 + h(3, i) * 12), i % 2 ? '#f2f2ea' : '#f2b6cf');
    },
  },
  rock: {
    box: (p) => [-2, -6, W(p) + 2, H(p) + 2], shadow: [4, 3], variants: 3,
    paint(k, p, v) {
      const { ball, R, h } = k;
      const pal = ramp('#8a8c92');
      ball(W(p) / 2, H(p) - 12, W(p) / 2 - 3, 11, pal, 0.35, v * 17);
      ball(W(p) / 2 - 6, H(p) - 16, 7, 6, pal, 0.3, v * 3);
      for (let i = 0; i < 3; i++) R(Math.floor(8 + h(i, v) * (W(p) - 16)), Math.floor(H(p) - 18 + h(v, i) * 10), 4, 1, pal[0]); // cracks
      if (v === 1) for (let i = 0; i < 6; i++) R(Math.floor(6 + h(i + 9, v) * (W(p) - 12)), Math.floor(H(p) - 22 + h(v, i + 9) * 6), 2, 1, '#5a8a3a'); // moss
    },
  },
  bench: {
    box: (p) => [-1, -4, W(p) + 1, H(p) + 2], shadow: [3, 4],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const wood = ['#5a3a24', '#7a5034', '#9a6a44', '#b88456', '#d0a070'];
      const iron = '#2a2e34';
      // iron ends
      for (const x of [3, w - 6]) { R(x, 2, 3, 24, iron); R(x, 2, 1, 24, '#4a505a'); }
      // the back: two slats
      for (const y of [2, 7]) { R(1, y, w - 2, 4, wood[2]); R(1, y, w - 2, 1, wood[4]); R(1, y + 3, w - 2, 1, wood[0]); }
      // the seat: three slats, lit
      for (const y of [14, 18, 22]) { R(1, y, w - 2, 3, wood[3]); R(1, y, w - 2, 1, wood[4]); R(1, y + 2, w - 2, 1, wood[1]); }
      R(1, 25, w - 2, 1, wood[0]);
    },
  },
  streetlamp: {
    box: () => [-2, -52, 34, 34], shadow: [9, 3], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      const pole = ['#1e2622', '#2c3832', '#3e4c44', '#56665c'];
      // plinth
      R(10, 24, 12, 6, pole[1]); R(10, 24, 12, 1, pole[3]); R(11, 22, 10, 3, pole[2]); R(11, 22, 10, 1, pole[3]);
      // the post, a collar, the arm and the lantern
      R(14, -30, 4, 53, pole[1]); R(14, -30, 1, 53, pole[3]); R(17, -30, 1, 53, pole[0]);
      R(13, 4, 6, 3, pole[2]); R(13, 4, 6, 1, pole[3]);
      R(12, -34, 8, 4, pole[2]); R(12, -34, 8, 1, pole[3]);
      // the lantern head
      R(9, -46, 14, 3, pole[1]); R(10, -47, 12, 1, pole[3]); R(14, -49, 4, 2, pole[2]);
      R(10, -43, 12, 9, pole[0]);
      const glass = o.night ? ['#fff4c8', '#ffe08a', '#f2c060'] : ['#d8e4ea', '#b4c6d0', '#8ea4b0'];
      R(11, -42, 10, 7, glass[1]); R(11, -42, 4, 7, glass[0]); R(18, -42, 3, 7, glass[2]);
      R(15, -42, 1, 7, pole[0]);
    },
  },
  hydrant: {
    box: () => [4, 0, 28, 32], shadow: [4, 2],
    paint(k) {
      const { R, cyl, ell } = k;
      const red = ramp('#c23a3a');
      R(9, 26, 14, 3, '#4a4a52'); R(9, 26, 14, 1, '#6a6a74');
      cyl(11, 10, 10, 16, red);
      R(7, 14, 4, 5, red[1]); R(7, 14, 4, 1, red[3]); R(21, 14, 4, 5, red[0]); R(21, 14, 4, 1, red[2]); // side outlets
      ell(16, 10, 6, 3, red[3]); ell(16, 9, 4, 2, red[4]);
      R(15, 4, 2, 4, red[2]); R(14, 6, 4, 2, '#d8d0c0');
      R(11, 19, 10, 1, red[0]);
    },
  },
  mailbox: {
    box: () => [4, -6, 28, 32], shadow: [4, 3],
    paint(k) {
      const { R, cyl, ell } = k;
      const red = ramp('#c8352a');
      cyl(9, 2, 14, 24, red);
      ell(16, 2, 7, 4, red[3]); ell(15, 1, 4, 2, red[4]);
      R(11, 9, 10, 2, INK); R(11, 11, 10, 1, red[0]);
      R(13, 15, 6, 4, '#f2e6c8'); R(13, 15, 6, 1, '#fff8e8');
      R(9, 25, 14, 3, red[0]); R(8, 27, 16, 2, '#3a3a42');
    },
  },
  trash: {
    box: () => [0, -2, 32, 32], shadow: [3, 3], variants: 2,
    paint(k, p, v) {
      const { R, cyl, ell, ball } = k;
      const bin = ramp('#5a6068');
      // a bin with a lid, and black bags piled against it
      cyl(4, 8, 12, 18, bin);
      for (let y = 10; y < 26; y += 4) R(4, y, 12, 1, bin[1]);
      ell(10, 8, 7, 3, bin[3]); R(8, 5, 4, 2, bin[2]);
      ball(22, 22, 7, 6, ['#121218', '#1e1e26', '#2c2c36', '#44445a', '#5a5a74'], 0.3, v);
      if (v) ball(15, 25, 5, 4, ['#121218', '#1e1e26', '#2c2c36', '#44445a', '#5a5a74'], 0.3, 3);
      R(20, 15, 4, 2, '#e8e0cc'); R(6, 26, 5, 2, '#d8d0bc'); // litter
    },
  },
  dumpster: {
    box: (p) => [-1, -6, W(p) + 2, H(p) + 2], shadow: [4, 4],
    paint(k, p) {
      const { R, block } = k;
      const c = ramp(p.color || '#3f6a4a');
      const w = W(p);
      const hh = H(p);
      block(1, 6, w - 2, hh - 8, Math.round(hh * 0.45), c);
      // the two lids, a ridge between, rust streaks, wheels
      R(1, 3, w / 2 - 1, 4, c[2]); R(w / 2 + 1, 3, w / 2 - 2, 4, c[2]); R(1, 3, w - 2, 1, c[4]); R(w / 2, 3, 1, 4, c[0]);
      for (let i = 0; i < 3; i++) R(8 + i * Math.floor((w - 16) / 2), 14, 2, hh - 20, mix(c[1], '#8a4a2a', 0.4));
      R(6, hh - 3, 5, 3, '#1e1e24'); R(w - 11, hh - 3, 5, 3, '#1e1e24');
      R(4, Math.round(hh * 0.45) + 9, w - 8, 1, c[0]);
    },
  },
  bollard: {
    box: () => [8, 0, 26, 32], shadow: [3, 2],
    paint(k) {
      const { R, cyl, ell } = k;
      const g = ramp('#30363e');
      cyl(11, 12, 10, 15, g);
      ell(16, 12, 5, 2, g[3]);
      R(11, 16, 10, 2, '#d8b040');
      R(10, 26, 12, 2, g[0]);
    },
  },
  crate: {
    box: (p) => [-1, -4, W(p) + 1, H(p) + 1], shadow: [3, 3], variants: 2,
    paint(k, p, v) {
      const { R } = k;
      const w = W(p) - 4;
      const hh = H(p) - 4;
      const x = 2;
      const y = 0;
      const wood = v ? ['#5e4228', '#80603e', '#a07c52', '#bc9668', '#d4b282'] : ['#5a3c22', '#7e5634', '#9e7048', '#b88a5c', '#d0a676'];
      const top = Math.round(hh * 0.4);
      // the lid: planks, nails
      R(x, y, w, top, wood[3]);
      for (let i = 0; i < w; i += 6) { R(x + i, y, 1, top, wood[1]); R(x + i + 1, y, 1, top, wood[4]); }
      R(x, y, w, 1, wood[4]);
      // the front: a frame and a brace
      R(x, y + top, w, hh - top, wood[2]);
      R(x, y + top, w, 2, wood[0]); R(x, y + hh - 3, w, 3, wood[1]); R(x, y + top, 3, hh - top, wood[1]); R(x + w - 3, y + top, 3, hh - top, wood[0]);
      const fh = hh - top - 5;
      for (let i = 0; i < w - 6; i++) R(x + 3 + i, y + top + 2 + Math.floor(i * fh / Math.max(1, w - 6)), 2, 2, wood[1]);
      R(x + 4, y + top + 3, 1, 1, '#2a2a30'); R(x + w - 5, y + top + 3, 1, 1, '#2a2a30');
    },
  },
  barrel: {
    box: (p) => [2, -4, W(p) - 2, H(p) + 1], shadow: [3, 3], variants: 2,
    paint(k, p, v) {
      const { R, cyl, ell } = k;
      const w = W(p) - 12;
      const x = 6;
      const top = 3;
      const c = p.color ? ramp(p.color) : v ? ramp('#3a6a8a') : ramp('#8a5a34');
      cyl(x, top, w, H(p) - 6, c);
      // staves and hoops
      for (let i = 3; i < w; i += 4) R(x + i, top + 2, 1, H(p) - 9, c[1]);
      const hoop = v ? '#c9ced4' : '#3e3e46';
      for (const y of [top + 4, H(p) - 10]) { R(x, y, w, 2, hoop); R(x, y, w, 1, mix(hoop, '#ffffff', 0.3)); }
      ell(x + w / 2, top, w / 2, 3, c[3]); ell(x + w / 2, top, w / 2 - 2, 2, c[1]);
    },
  },
  bed: {
    box: (p) => [-1, -2, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp(p.color || '#6f8fb5');
      const wood = ['#3e2a1c', '#5e4030', '#7a5640', '#94704e'];
      R(1, 0, w - 2, 6, wood[2]); R(1, 0, w - 2, 1, wood[3]); R(1, 5, w - 2, 1, wood[0]); // headboard
      R(2, 6, w - 4, hh - 7, '#ece6da'); // sheet
      R(4, 7, w - 8, 8, '#fbf8f2'); R(4, 14, w - 8, 1, '#c8c0b0'); R(w / 2 - 1, 7, 1, 8, '#ded6c8'); // pillows
      R(2, 17, w - 4, hh - 19, c[2]); R(2, 17, w - 4, 2, c[3]); R(2, 17, w - 4, 1, c[4]); // the blanket, turned down
      for (let y = 22; y < hh - 3; y += 5) R(3, y, w - 6, 1, c[1]);
      R(2, hh - 3, w - 4, 2, c[0]);
      R(1, hh - 2, w - 2, 2, wood[1]);
    },
  },
  cot: {
    box: (p) => [0, 0, W(p), H(p)], shadow: [2, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      R(3, 2, w - 6, hh - 4, '#4a5a3a'); R(4, 3, w - 8, hh - 6, '#62724a'); R(4, 3, w - 8, 1, '#7a8a5a');
      R(6, 4, w - 12, 7, '#d8d0b8'); R(6, 10, w - 12, 1, '#a8a088');
      R(4, 18, w - 8, hh - 22, '#7a6a4a'); R(4, 18, w - 8, 1, '#9a8a62');
      R(2, 2, 2, hh - 4, '#3a3a40'); R(w - 4, 2, 2, hh - 4, '#3a3a40');
    },
  },
  chair: {
    box: () => [4, -4, 28, 32], shadow: [2, 3], variants: 3,
    paint(k, p, v) {
      const { R } = k;
      const wood = [['#3e2a1c', '#5e3e28', '#7a5236', '#96694a', '#b08460'], ['#1e3a2e', '#2e5440', '#3e6e54', '#548a6a', '#70a684'], ['#4a2a20', '#6e3e2c', '#8e5238', '#ac6a4a', '#c88a64']][v];
      // the back (a top rail and two posts), the seat (lit), the front legs
      R(8, 2, 16, 4, wood[2]); R(8, 2, 16, 1, wood[4]); R(8, 5, 16, 1, wood[0]);
      R(8, 6, 3, 8, wood[1]); R(21, 6, 3, 8, wood[0]);
      R(7, 13, 18, 10, wood[3]); R(7, 13, 18, 1, wood[4]); R(7, 22, 18, 2, wood[1]);
      for (let x = 10; x < 24; x += 4) R(x, 15, 1, 6, wood[2]);
      R(8, 24, 3, 5, wood[0]); R(21, 24, 3, 5, wood[0]);
    },
  },
  table: {
    box: (p) => [-1, -2, W(p) + 1, H(p) + 2], shadow: [3, 4], variants: 3,
    paint(k, p, v) {
      const { R, ell, P } = k;
      const w = W(p);
      const hh = H(p);
      const wood = p.color ? ramp(p.color) : ['#5a3a24', '#7a5034', '#9a6a44', '#b88456', '#d0a070'];
      const top = hh - 9;
      R(2, 1, w - 4, top, wood[3]); R(2, 1, w - 4, 1, wood[4]);
      for (let y = 4; y < top; y += 5) R(3, y, w - 6, 1, wood[2]); // grain
      R(2, top + 1, w - 4, 3, wood[1]); R(2, top + 1, w - 4, 1, wood[0]); // the edge
      R(4, top + 4, 3, hh - top - 5, wood[0]); R(w - 7, top + 4, 3, hh - top - 5, wood[0]);
      // on it: a cup and saucer, a plate, or a candle
      if (v === 0) { ell(w / 2, top / 2 + 1, 5, 3, '#f4f0e6'); ell(w / 2, top / 2 + 1, 2, 1, '#6a3a24'); }
      else if (v === 1) { ell(w / 2 - 2, top / 2 + 1, 6, 4, '#e8e4dc'); ell(w / 2 - 2, top / 2 + 1, 4, 2, '#c8b080'); }
      else { R(w / 2 - 1, top / 2 - 3, 3, 6, '#f2ecd8'); P(w / 2, top / 2 - 4, '#ffd24a'); }
    },
  },
  desk: {
    box: (p) => [-1, -4, W(p) + 1, H(p) + 2], shadow: [3, 4], variants: 2,
    paint(k, p, v) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const wood = p.color ? ramp(p.color) : ['#3a2418', '#54362a', '#6e4a34', '#8a5e40', '#a47454'];
      const top = hh - 12;
      R(1, 0, w - 2, top, wood[3]); R(1, 0, w - 2, 1, wood[4]); R(1, top - 1, w - 2, 1, wood[2]);
      R(1, top, w - 2, hh - top - 1, wood[1]); R(1, top, w - 2, 1, wood[0]);
      R(w - 14, top + 2, 11, hh - top - 5, wood[2]); R(w - 14, top + 2, 11, 1, wood[3]); R(w - 10, top + 5, 3, 1, '#c8a050'); // drawers
      // papers, a green-shaded lamp or a phone
      R(5, 3, 10, 7, '#f4f0e6'); R(6, 5, 7, 1, '#a8a29a'); R(6, 7, 5, 1, '#a8a29a'); R(8, 2, 9, 7, '#e8e2d4');
      if (v === 0) { R(w - 12, 2, 6, 3, '#2a7a4a'); R(w - 12, 2, 6, 1, '#4aa06a'); R(w - 10, 5, 2, 4, '#c9a24a'); }
      else { R(w - 13, 3, 8, 5, '#2a2a32'); R(w - 12, 4, 6, 1, '#4a4a56'); R(w - 7, 2, 2, 3, '#2a2a32'); }
    },
  },
  counter: {
    box: (p) => [-1, -2, W(p) + 1, H(p) + 2], shadow: [3, 4],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = p.color ? ramp(p.color) : ['#5a3a24', '#7e5234', '#a06e48', '#c08a5e', '#dcaa7c'];
      const top = Math.round(hh * 0.45);
      R(0, 1, w, top, c[3]); R(0, 1, w, 1, c[4]); R(0, top, w, 1, c[2]);
      R(0, top + 1, w, hh - top - 2, c[1]); R(0, top + 1, w, 1, c[0]);
      for (let x = 6; x < w - 4; x += 16) { R(x, top + 4, 12, hh - top - 8, c[2]); R(x, top + 4, 12, 1, c[3]); }
      // a till, a jar of something, a bell
      R(w - 18, 2, 12, 8, '#3a3a44'); R(w - 17, 3, 10, 3, '#6a9a7a'); R(w - 18, 9, 12, 1, '#2a2a32');
      R(8, 3, 6, 6, '#d8ecf2'); R(9, 5, 4, 3, '#e8a04a');
      if (w > 64) { R(w / 2, 4, 4, 3, '#d8b040'); R(w / 2 + 1, 3, 2, 1, '#f2d870'); }
    },
  },
  workbench: {
    box: (p) => [-1, -2, W(p) + 1, H(p) + 2], shadow: [3, 4],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ['#3e3024', '#5e4a36', '#7d6a55', '#9a8670', '#b4a088'];
      const top = hh - 10;
      R(0, 1, w, top, c[3]); R(0, 1, w, 1, c[4]);
      for (let i = 0; i < 6; i++) R(Math.floor(hash2(i, p.x) * (w - 6)), Math.floor(2 + hash2(p.y, i) * (top - 4)), 4, 1, c[1]); // gouges
      R(0, top + 1, w, hh - top - 2, c[1]); R(0, top + 1, w, 1, c[0]);
      R(3, top + 3, 3, hh - top - 4, c[0]); R(w - 6, top + 3, 3, hh - top - 4, c[0]);
      // a vice, a hammer, a spanner, a can of oil
      R(4, 2, 8, 6, '#5a6068'); R(4, 2, 8, 1, '#8a9098'); R(6, 8, 4, 2, '#3a3e44');
      R(16, 5, 10, 2, '#7a5034'); R(24, 3, 4, 6, '#9aa0a8');
      R(w - 14, 3, 9, 2, '#b8bec6'); R(w - 6, 2, 3, 4, '#b8bec6');
      R(w / 2, 3, 5, 6, '#c0614a'); R(w / 2, 3, 5, 1, '#e0816a');
    },
  },
  lectern: {
    box: (p) => [-1, -4, W(p) + 1, H(p) + 2], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const c = ['#3e2418', '#5a3424', '#74462e', '#905a3a', '#aa7050'];
      R(4, 0, w - 8, 14, c[3]); R(4, 0, w - 8, 1, c[4]);
      R(8, 2, w - 16, 10, '#ece2c8'); R(w / 2, 2, 1, 10, '#8a3b2b'); R(10, 4, w / 2 - 12, 1, '#a89a80'); R(w / 2 + 3, 4, w / 2 - 12, 1, '#a89a80');
      R(6, 14, w - 12, 16, c[1]); R(6, 14, w - 12, 1, c[0]); R(w / 2 - 3, 18, 6, 8, c[2]);
    },
  },
  cabinet: {
    box: (p) => [-1, -14, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p) - 2;
      const c = ramp('#7a8692');
      R(1, -12, w, 6, c[3]); R(1, -12, w, 1, c[4]); // the top
      R(1, -6, w, H(p) + 5, c[2]); R(w, -6, 1, H(p) + 5, c[0]);
      for (let i = 0; i < 3; i++) {
        const y = -4 + i * 11;
        R(3, y, w - 4, 9, c[3]); R(3, y + 8, w - 4, 1, c[1]); R(3, y, w - 4, 1, c[4]);
        R(w / 2 - 2, y + 3, 6, 2, c[0]); R(w / 2 - 1, y + 3, 4, 1, '#d8dce0');
      }
    },
  },
  wardrobe: {
    box: (p) => [-1, -18, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p) - 2;
      const c = ['#3a2418', '#5a3a26', '#7a5236', '#96694a', '#b08460'];
      R(1, -16, w, 6, c[3]); R(1, -16, w, 1, c[4]);
      R(1, -10, w, H(p) + 9, c[2]); R(w, -10, 1, H(p) + 9, c[0]);
      R(3, -8, w / 2 - 3, H(p) + 4, c[3]); R(w / 2 + 2, -8, w / 2 - 3, H(p) + 4, c[1]); R(w / 2 + 1, -8, 1, H(p) + 4, c[0]);
      R(w / 2 - 2, 2, 1, 5, '#d8b060'); R(w / 2 + 3, 2, 1, 5, '#d8b060');
      R(1, H(p) - 2, w, 2, c[0]);
    },
  },
  shelf: {
    box: (p) => [-1, -14, W(p) + 1, H(p) + 1], shadow: [3, 3], variants: 3,
    paint(k, p, v) {
      const { R, h } = k;
      const w = W(p) - 2;
      const c = ['#3e2a1c', '#5e4030', '#7a5640', '#94704e', '#ae8a62'];
      R(1, -12, w, 4, c[3]); R(1, -12, w, 1, c[4]);
      R(1, -8, w, H(p) + 7, c[0]);
      const goods = ['#e7d7b0', '#c86b4a', '#6a8f6b', '#f2c14e', '#6a7fae', '#a05a8a', '#e8e4dc'];
      for (let r = 0; r < 3; r++) {
        const y = -7 + r * 12;
        R(1, y + 10, w, 2, c[2]); R(1, y + 10, w, 1, c[3]);
        for (let x = 3; x < w - 2;) {
          const bw = 2 + Math.floor(h(x + v * 7, r) * 4);
          const bh = 6 + Math.floor(h(r, x + v) * 4);
          const col = goods[Math.floor(h(x, r * 3 + v) * goods.length)];
          R(x, y + 10 - bh, bw, bh, col); R(x, y + 10 - bh, 1, bh, mix(col, '#ffffff', 0.3)); R(x + bw - 1, y + 10 - bh, 1, bh, mix(col, INK, 0.3));
          x += bw + (h(x, 9) > 0.8 ? 2 : 0);
        }
      }
      R(1, -8, 2, H(p) + 7, c[2]); R(w - 1, -8, 2, H(p) + 7, c[1]);
    },
  },
  display: {
    box: (p) => [-1, -6, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p) - 2;
      const hh = H(p);
      const c = ['#4a3020', '#6a4630', '#8a6044', '#a87a58', '#c49470'];
      R(1, -4, w, hh + 2, c[1]); R(1, -4, w, 1, c[3]);
      R(3, -2, w - 4, hh - 8, '#a8d4e2'); R(3, -2, w - 4, 1, '#e4f6fc');
      for (let i = 0; i < 5; i++) R(5 + i * 4, -1 + i, 2, 1, '#e4f6fc'); // a glint
      for (let i = 0; i < Math.floor((w - 8) / 8); i++) { R(6 + i * 8, hh - 16, 5, 5, '#d99a4e'); R(6 + i * 8, hh - 16, 5, 1, '#f2c48a'); }
      R(1, hh - 6, w, 4, c[0]);
    },
  },
  stove: {
    box: (p) => [-1, -8, W(p) + 1, H(p) + 1], shadow: [3, 3], night: true,
    paint(k, p, v, o) {
      const { R, ell } = k;
      const w = W(p) - 2;
      const c = ramp('#4a4a54');
      R(1, -6, w, 14, c[3]); R(1, -6, w, 1, c[4]);
      for (const x of [w / 4 + 1, (w * 3) / 4 + 1]) { ell(x, -1, 5, 3, '#1e1e26'); ell(x, -1, 3, 2, '#3a3a44'); }
      R(1, 8, w, H(p) - 9, c[1]); R(1, 8, w, 1, c[0]);
      R(5, 11, w - 8, 12, INK); R(6, 12, w - 10, 10, o.night ? '#c0602a' : '#3a3a44'); R(6, 12, w - 10, 1, o.night ? '#f0a050' : '#5a5a66');
      R(5, 9, w - 8, 1, '#c9ced4');
    },
  },
  oven: { alias: 'stove' },
  plant: {
    box: () => [2, -14, 30, 32], shadow: [3, 3], variants: 3,
    paint(k, p, v) {
      const { R, ball, cyl } = k;
      const pot = ramp(['#b5683f', '#5a7a9a', '#d8d0c0'][v]);
      cyl(10, 18, 12, 10, pot); R(9, 17, 14, 3, pot[3]); R(9, 17, 14, 1, pot[4]); R(11, 20, 10, 1, '#3a2a1c');
      const leaf = ramp('#3f8a3e');
      const n = [5, 7, 4][v];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5;
        const L = 9 + (i % 2) * 4;
        for (let s = 0; s < L; s++) {
          const x = 16 + Math.cos(a) * s * 1.1;
          const y = 16 + Math.sin(a) * s;
          R(Math.round(x), Math.round(y), 2, 2, s > L - 3 ? leaf[3] : leaf[2]);
        }
        ball(16 + Math.cos(a) * L, 16 + Math.sin(a) * L, 3, 2, leaf, 0, i);
      }
    },
  },
  flowerbed: {
    box: (p) => [-1, -2, W(p) + 1, H(p) + 1], shadow: [2, 2], variants: 3,
    paint(k, p, v) {
      const { R, P, h } = k;
      const w = W(p);
      const hh = H(p);
      const box = ['#4a2e1c', '#6a4430', '#8a5c40', '#a87454'];
      R(1, 4, w - 2, hh - 7, box[1]); R(1, 4, w - 2, 1, box[3]); R(1, hh - 4, w - 2, 2, box[0]);
      R(3, 6, w - 6, hh - 11, '#4a3424');
      const leaf = ['#2f6b34', '#3f8a3e', '#55a24a'];
      for (let i = 0; i < w * 0.6; i++) R(Math.floor(3 + h(i, v) * (w - 8)), Math.floor(6 + h(v, i) * (hh - 14)), 3, 2, leaf[i % 3]);
      const cols = [['#f2a7c3', '#ffffff', '#f6dc6a'], ['#d84a4a', '#f6dc6a', '#ffffff'], ['#a87ae0', '#f2a7c3', '#ffffff']][v];
      for (let i = 0; i < w * 0.35; i++) {
        const x = Math.floor(4 + h(i + 50, v) * (w - 10));
        const y = Math.floor(7 + h(v + 50, i) * (hh - 15));
        const c = cols[i % 3];
        P(x, y - 1, c); P(x - 1, y, c); P(x + 1, y, c); P(x, y + 1, c); P(x, y, '#f2c832');
      }
    },
  },
  rug: {
    box: (p) => [0, 0, W(p), H(p)], shadow: [0, 0],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp(p.color || '#8e5a6e');
      R(2, 2, w - 4, hh - 4, c[1]);
      R(4, 4, w - 8, hh - 8, c[2]);
      R(7, 7, w - 14, hh - 14, c[1]);
      R(9, 9, w - 18, hh - 18, c[2]);
      for (let y = 10; y < hh - 10; y += 4) for (let x = 10 + ((y >> 2) & 1) * 2; x < w - 10; x += 4) R(x, y, 2, 2, c[3]);
      const fringe = '#e8d8b8';
      R(5, 5, w - 10, 1, fringe); R(5, hh - 6, w - 10, 1, fringe); R(5, 5, 1, hh - 10, fringe); R(w - 6, 5, 1, hh - 10, fringe);
      for (let x = 3; x < w - 3; x += 2) { R(x, 0, 1, 2, fringe); R(x, hh - 2, 1, 2, fringe); }
    },
  },
  window: {
    box: (p) => [0, 0, W(p), H(p)], shadow: [0, 0], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      const w = W(p);
      const hh = Math.round(H(p) * 0.62);
      const frame = ['#3a2a1e', '#5a4030', '#7a5840'];
      R(2, 1, w - 4, hh + 2, frame[1]); R(2, 1, w - 4, 1, frame[2]);
      R(4, 3, w - 8, hh - 2, o.night ? '#22304e' : '#9fd0e4');
      if (!o.night) { for (let i = 0; i < 6; i++) R(6 + i, hh - 2 - i, 1, 1, '#e4f6fc'); R(5, 4, w - 10, 1, '#d8f0fa'); }
      else R(6, 5, 3, 2, '#e8e0a0');
      R(w / 2 - 1, 3, 2, hh - 2, frame[1]); R(4, Math.round(hh / 2) + 1, w - 8, 1, frame[1]);
      R(1, hh + 2, w - 2, 2, frame[2]); // the sill
      R(3, 3, 3, hh - 1, '#c86b6b'); R(w - 6, 3, 3, hh - 1, '#c86b6b'); // curtains
    },
  },
  painting: {
    box: (p) => [0, 0, W(p), H(p)], shadow: [0, 0], variants: 3,
    paint(k, p, v) {
      const { R } = k;
      const w = W(p);
      const hh = Math.round(H(p) * 0.6);
      R(3, 3, w - 6, hh, '#8a6420'); R(3, 3, w - 6, 1, '#e0b84a'); R(4, 4, w - 8, hh - 2, '#b8892e');
      const x = 6;
      const y = 6;
      const iw = w - 12;
      const ih = hh - 6;
      if (v === 0) { R(x, y, iw, ih, '#8ab4d0'); R(x, y + ih * 0.6, iw, ih * 0.4, '#5a8a4a'); R(x + iw * 0.6, y + 2, 3, 3, '#f2e080'); } // a landscape
      else if (v === 1) { R(x, y, iw, ih, '#5a4a6a'); R(x + iw / 2 - 3, y + 3, 6, 6, '#e0b896'); R(x + iw / 2 - 5, y + 9, 10, ih - 9, '#3a2a4a'); } // a portrait
      else { R(x, y, iw, ih, '#2a4a6a'); R(x + 3, y + ih - 6, iw - 6, 3, '#e8e4dc'); R(x + iw / 2, y + 3, 1, ih - 8, '#e8e4dc'); } // a ship
    },
  },
  noticeboard: {
    box: (p) => [-1, -10, W(p) + 1, H(p) + 1], shadow: [4, 3],
    paint(k, p) {
      const { R, h } = k;
      const w = W(p);
      const post = ['#3e2a1c', '#5e4030', '#7a5640'];
      R(4, 10, 3, 20, post[1]); R(w - 7, 10, 3, 20, post[1]); R(4, 10, 1, 20, post[2]);
      R(0, -8, w, 20, '#6a4a30'); R(0, -8, w, 1, '#8a6442'); R(2, -6, w - 4, 16, '#b88a5a'); // cork
      const papers = ['#f4ecd8', '#f2d4c8', '#e4ecf4', '#f4f0a8'];
      for (let i = 0; i < Math.max(3, w / 9); i++) {
        const x = 3 + Math.floor(h(i, p.x) * (w - 12));
        const y = -5 + Math.floor(h(p.y, i) * 6);
        R(x, y, 8, 9, papers[i % 4]); R(x + 1, y + 2, 6, 1, '#a8a090'); R(x + 1, y + 4, 4, 1, '#a8a090'); R(x + 3, y, 2, 1, '#d84a4a');
      }
    },
  },
  sign: {
    box: () => [0, -2, 32, 32], shadow: [4, 3],
    paint(k) {
      const { R } = k;
      R(14, 10, 4, 20, '#5a3d2a'); R(14, 10, 1, 20, '#7a5a40');
      R(2, 0, 28, 14, '#5a3d2a'); R(3, 1, 26, 12, '#ece2c8'); R(3, 1, 26, 1, '#fffaf0');
      R(6, 4, 20, 2, '#9a3530'); R(6, 8, 14, 2, '#9a3530');
    },
  },
  fence: {
    box: () => [-2, -6, 34, 34], shadow: [3, 2], connect: true,
    paint(k, p, v, o) {
      // a white picket fence; it runs the way its neighbours do
      const { R } = k;
      const c = ['#8a8478', '#b8b2a4', '#e4dccb', '#f6f0e2'];
      const m = o.links;
      const ew = (m & 2) || (m & 8) || !(m & 5);
      const ns = (m & 1) || (m & 4);
      if (ew) {
        const x0 = m & 8 ? 0 : 12;
        const x1 = m & 2 ? 32 : 20;
        R(x0, 10, x1 - x0, 3, c[2]); R(x0, 10, x1 - x0, 1, c[3]); R(x0, 18, x1 - x0, 3, c[2]); R(x0, 18, x1 - x0, 1, c[3]);
        for (let x = x0 + 2; x < x1; x += 6) { R(x, 4, 4, 22, c[2]); R(x, 4, 1, 22, c[3]); R(x + 3, 4, 1, 22, c[1]); R(x + 1, 3, 2, 1, c[3]); }
      }
      if (ns) {
        const y0 = m & 1 ? -2 : 8;
        const y1 = m & 4 ? 30 : 24;
        R(13, y0, 3, y1 - y0, c[2]); R(17, y0, 3, y1 - y0, c[1]);
        for (let y = y0; y < y1; y += 6) { R(11, y, 10, 4, c[2]); R(11, y, 10, 1, c[3]); R(11, y + 3, 10, 1, c[1]); }
      }
    },
  },
  ranchfence: {
    box: () => [-2, -8, 34, 34], shadow: [3, 2], connect: true,
    paint(k, p, v, o) {
      // split rails on posts, weathered
      const { R } = k;
      const c = ['#3e2a1a', '#5e4228', '#7a5a3a', '#987452', '#b08c66'];
      const m = o.links;
      const ew = (m & 2) || (m & 8) || (!(m & 5) && !p.vertical);
      const ns = (m & 1) || (m & 4) || (p.vertical && !(m & 10));
      if (ew) {
        const x0 = m & 8 ? 0 : 10;
        const x1 = m & 2 ? 32 : 22;
        for (const y of [9, 17]) { R(x0, y, x1 - x0, 4, c[2]); R(x0, y, x1 - x0, 1, c[4]); R(x0, y + 3, x1 - x0, 1, c[0]); R(x0 + 5, y + 1, 6, 1, c[1]); }
        R(13, 3, 6, 25, c[1]); R(13, 3, 2, 25, c[3]); R(18, 3, 1, 25, c[0]); R(13, 2, 6, 2, c[4]);
      }
      if (ns) {
        const y0 = m & 1 ? -4 : 6;
        const y1 = m & 4 ? 30 : 24;
        for (const x of [11, 19]) { R(x, y0, 3, y1 - y0, c[2]); R(x, y0, 1, y1 - y0, c[4]); R(x + 2, y0, 1, y1 - y0, c[0]); }
        R(12, 6, 8, 18, c[1]); R(12, 6, 8, 2, c[3]);
      }
    },
  },
  chainfence: {
    box: (p) => [-2, -6, W(p) + 2, H(p) + 4], shadow: [3, 2], connect: true,
    paint(k, p, v, o) {
      // chain link on steel posts (razor wire along the top of a prison's); it runs the way its neighbours do
      const { R, P } = k;
      const steel = ['#4a4e56', '#6e747e', '#9aa0aa', '#c4c8d0'];
      const m = o.links;
      const ns = ((m & 1) || (m & 4)) && !((m & 2) || (m & 8));
      const mesh = (x0, y0, w, h) => { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) if ((x + y) % 5 === 0 || (x - y + 100) % 5 === 0) P(x, y, (x + y) % 2 ? steel[1] : steel[2]); };
      if (!ns) {
        const w = W(p);
        R(0, 3, w, 2, steel[2]); R(0, 3, w, 1, steel[3]);
        mesh(0, 6, w, 20);
        const posts = (m & 8) ? [w - 3] : [0, w - 3];
        for (const px of posts) { R(px, 0, 3, 28, steel[1]); R(px, 0, 1, 28, steel[3]); }
        if (p.razor) for (let x = 0; x + 6 <= w; x += 6) { R(x + 1, -4, 4, 1, steel[3]); R(x, -3, 1, 2, steel[3]); R(x + 5, -3, 1, 2, steel[3]); R(x + 1, -1, 4, 1, steel[2]); }
      } else {
        const hh = H(p);
        const y0 = m & 1 ? -2 : 4;
        mesh(13, y0, 6, hh - y0 + (m & 4 ? 2 : -4));
        R(12, y0, 1, hh - y0, steel[2]); R(19, y0, 1, hh - y0, steel[1]);
        R(13, 4, 6, 3, steel[1]); R(13, 4, 6, 1, steel[3]);
        if (p.razor) for (let y = y0; y < hh; y += 6) { R(10, y + 1, 1, 4, steel[3]); R(21, y + 1, 1, 4, steel[3]); }
      }
    },
  },
  trafficlight: {
    box: () => [4, -46, 30, 34], shadow: [8, 3],
    paint(k) {
      // the pole and the heads; the lamps themselves are lit live
      const { R } = k;
      const pole = ['#22262c', '#33383f', '#4a5058', '#646c76'];
      R(11, 22, 10, 6, pole[1]); R(11, 22, 10, 1, pole[3]);
      R(14, -24, 4, 47, pole[1]); R(14, -24, 1, 47, pole[3]); R(17, -24, 1, 47, pole[0]);
      R(9, -42, 14, 36, '#16181c'); R(9, -42, 14, 2, '#e8c35a'); R(10, -40, 12, 1, '#2a2e34');
      for (let i = 0; i < 3; i++) { R(11, -38 + i * 10, 10, 9, '#0e0f12'); R(10, -39 + i * 10, 12, 2, '#2a2e34'); }
      R(19, -4, 11, 11, '#16181c'); R(19, -4, 11, 1, '#3a3e46');
    },
  },
  busstop: {
    box: () => [4, -30, 32, 34], shadow: [7, 3],
    paint(k) {
      const { R, ell } = k;
      R(13, 24, 8, 4, '#3a3a42'); R(13, 24, 8, 1, '#5a5a64');
      R(15, -12, 3, 37, '#4a4a52'); R(15, -12, 1, 37, '#7a7a84');
      ell(16.5, -16, 10, 10, '#efe6cc'); ell(16.5, -16, 8, 8, '#2f6b4f'); ell(15, -18, 4, 3, '#3f8a62');
      R(19, 2, 10, 13, '#5a5a62'); R(20, 3, 8, 11, '#f2efe6');
      for (let i = 0; i < 4; i++) R(21, 5 + i * 2, 6, 1, '#7a8a8a');
    },
  },
  pipe: {
    box: (p) => [-1, -1, W(p) + 1, H(p) + 1], shadow: [2, 3],
    paint(k, p) {
      const { R } = k;
      const c = ramp('#6a7078');
      const w = W(p);
      const hh = H(p);
      if (w >= hh) {
        const y = Math.round(hh / 2) - 5;
        const rows = [2, 3, 4, 3, 3, 2, 2, 1, 1, 0];
        rows.forEach((l, i) => R(0, y + i, w, 1, c[l]));
        for (let x = 30; x < w; x += 32) { R(x - 2, y - 2, 5, 14, c[1]); R(x - 2, y - 2, 5, 1, c[3]); R(x - 1, y + 2, 1, 1, c[4]); }
      } else {
        const x = 11;
        const cols = [1, 2, 4, 3, 3, 2, 2, 1, 1, 0];
        cols.forEach((l, i) => R(x + i, 0, 1, hh, c[l]));
        for (let y = 30; y < hh; y += 32) { R(x - 2, y - 2, 14, 5, c[1]); R(x - 2, y - 2, 14, 1, c[3]); }
      }
    },
  },
  haybale: {
    box: (p) => [-1, -4, W(p) + 1, H(p) + 1], shadow: [4, 3], variants: 2,
    paint(k, p, v) {
      const { ball, P, h } = k;
      const straw = ['#8a6a24', '#b08a34', '#d2aa48', '#e6c464', '#f4dc8c'];
      const cx = W(p) / 2;
      const cy = H(p) / 2 - 2;
      const r = Math.min(W(p), H(p)) / 2 - 3;
      ball(cx, cy, r, r * 0.92, straw, 0.25, v * 9);
      for (let a = 0; a < 26; a += 0.15) { // the roll's spiral
        const rr = (a / 26) * r * 0.9;
        P(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.92), straw[1]);
      }
      for (let i = 0; i < 20; i++) P(Math.floor(cx - r + h(i, v) * r * 2), Math.floor(cy - r + h(v, i) * r * 2), straw[4]);
    },
  },
  gatepost: {
    box: () => [2, -40, 32, 34], shadow: [10, 4],
    paint(k) {
      const { R } = k;
      const st = ramp('#9a948a');
      R(6, -30, 20, 58, st[2]); R(6, -30, 3, 58, st[3]); R(23, -30, 3, 58, st[1]);
      for (let y = -24; y < 28; y += 8) R(6, y, 20, 1, st[1]);
      R(3, -36, 26, 7, st[3]); R(3, -36, 26, 1, st[4]); R(3, -30, 26, 1, st[0]);
      R(9, -22, 14, 30, '#22405e'); R(9, -22, 14, 1, '#3a5a7a'); R(10, -21, 12, 28, '#2a4a6a');
      R(4, 26, 24, 3, st[0]);
    },
  },
  statue: {
    box: (p) => [-1, -46, W(p) + 1, H(p) + 1], shadow: [12, 6],
    paint(k, p) {
      const { R, ball } = k;
      const w = W(p);
      const hh = H(p);
      const st = ramp('#c9c3b4');
      const br = ramp('#5f7a6a');
      const top = plinthTop(p);
      R(4, hh - 10, w - 8, 8, st[2]); R(4, hh - 10, w - 8, 1, st[4]); R(4, hh - 3, w - 8, 1, st[0]);
      R(8, top, w - 16, hh - 10 - top, st[2]); R(8, top, 2, hh - 10 - top, st[3]); R(w - 10, top, 2, hh - 10 - top, st[1]); R(8, top, w - 16, 1, st[4]);
      R(11, plaqueY(p) - 4, w - 22, 8, '#3a2c25'); // the plaque
      const cx = w / 2;
      const b = top; // the figure stands on the plinth
      R(cx - 7, b - 32, 14, 32, br[2]); R(cx - 7, b - 32, 3, 32, br[3]); R(cx + 4, b - 32, 3, 32, br[1]); // coat
      R(cx - 6, b - 4, 5, 4, br[1]); R(cx + 1, b - 4, 5, 4, br[1]);
      ball(cx, b - 38, 6, 6, br, 0, 2); // head
      R(cx + 6, b - 50 > -46 ? b - 50 : -45, 4, 22, br[2]); R(cx + 6, b - 50 > -46 ? b - 50 : -45, 1, 22, br[3]); // the raised arm
    },
  },
  tent: {
    box: (p) => [-1, -6, W(p) + 1, H(p) + 1], shadow: [6, 4],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp(p.color || '#5a7a6a');
      for (let y = 0; y < hh; y++) {
        const half = Math.round((y / hh) * (w / 2 - 2));
        R(w / 2 - half, y, half, 1, c[3]);
        R(w / 2, y, half, 1, c[1]);
        if (y % 5 === 0) { R(w / 2 - half, y, half, 1, c[2]); R(w / 2, y, half, 1, c[0]); }
      }
      R(w / 2, 0, 1, hh, c[4]);
      for (let y = 10; y < hh; y++) { const half = Math.round(((y - 10) / (hh - 10)) * 6); R(w / 2 - half, y, half * 2, 1, '#1a1612'); }
      R(Math.round(w * 0.66), Math.round(hh * 0.45), 7, 6, mix(c[2], '#a09670', 0.6)); // a patch
      R(2, hh - 2, 2, 3, '#5a4a3a'); R(w - 4, hh - 2, 2, 3, '#5a4a3a');
    },
  },
  vent: {
    box: () => [0, 0, 32, 22], shadow: [2, 2],
    paint(k) {
      const { R } = k;
      const c = ramp('#5a5e66');
      R(4, 2, 24, 16, c[1]); R(4, 2, 24, 1, c[3]);
      for (let i = 0; i < 4; i++) { R(6, 4 + i * 4, 20, 2, c[0]); R(6, 4 + i * 4, 20, 1, c[3]); }
      for (const [dx, dy] of [[5, 3], [25, 3], [5, 15], [25, 15]]) R(dx, dy, 2, 2, '#b8b4aa');
    },
  },
  chest: {
    box: (p) => [0, 2, W(p), H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ['#3e2416', '#5e3a22', '#7a5236', '#96694a', '#b08460'];
      R(3, 6, w - 6, 10, c[3]); R(3, 6, w - 6, 1, c[4]); // the lid
      R(3, 16, w - 6, hh - 19, c[1]); R(3, 16, w - 6, 1, c[0]);
      for (const x of [6, w - 9]) { R(x, 6, 3, hh - 9, '#c9a24a'); R(x, 6, 1, hh - 9, '#f2d27a'); }
      R(w / 2 - 3, 13, 6, 7, '#c9a24a'); R(w / 2 - 1, 16, 2, 2, '#2a1a10');
    },
  },
  cellbars: {
    box: (p) => [0, -2, W(p), H(p) + 1], shadow: [2, 2],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp('#5a5e66');
      R(0, 2, w, 3, c[2]); R(0, 2, w, 1, c[4]); R(0, hh - 4, w, 3, c[1]);
      for (let x = 2; x < w; x += 6) { R(x, 2, 2, hh - 4, c[2]); R(x, 2, 1, hh - 4, c[4]); }
    },
  },
  fountain: {
    box: (p) => [-2, -50, W(p) + 2, H(p) + 2], shadow: [8, 6],
    paint(k, p) {
      const { R, ell, ball } = k;
      const w = W(p);
      const hh = H(p);
      const st = ramp('#b9b3a6');
      ell(w / 2, hh / 2 + 2, w / 2 - 1, hh / 2.6, st[1]);
      ell(w / 2, hh / 2, w / 2 - 1, hh / 2.6, st[3]);
      ell(w / 2, hh / 2, w / 2 - 6, hh / 2.6 - 5, '#2a7a9a');
      ell(w / 2, hh / 2 + 1, w / 2 - 8, hh / 2.6 - 7, '#3a8ab0');
      // the bronze lamplighter in the middle, his pole and lantern
      const br = ramp('#7a6235');
      R(w / 2 - 6, hh / 2 - 6, 12, 6, st[2]); R(w / 2 - 6, hh / 2 - 6, 12, 1, st[4]);
      R(w / 2 - 4, hh / 2 - 28, 8, 22, br[2]); R(w / 2 - 4, hh / 2 - 28, 2, 22, br[3]);
      ball(w / 2, hh / 2 - 32, 5, 5, br, 0, 1);
      R(w / 2 + 4, hh / 2 - 46, 2, 26, br[1]); R(w / 2 + 2, hh / 2 - 50, 6, 5, br[3]);
    },
  },
  barrelfire: {
    box: () => [4, 0, 28, 32], shadow: [3, 2],
    paint(k) {
      const { R, cyl, ell } = k;
      const c = ramp('#4a4e54');
      cyl(8, 8, 16, 20, c);
      R(8, 12, 16, 3, '#8a3b2b'); R(8, 21, 16, 3, '#8a3b2b'); R(8, 12, 16, 1, '#aa5b3b');
      ell(16, 8, 8, 3, '#2a1a14'); ell(16, 8, 6, 2, '#ff8a2a');
    },
  },
  flagpole: {
    box: () => [8, -58, 26, 32], shadow: [12, 3],
    paint(k) {
      const { R } = k;
      R(12, 24, 9, 5, '#8a8a84'); R(12, 24, 9, 1, '#b4b4ac');
      R(15, -52, 3, 77, '#c9c6bd'); R(15, -52, 1, 77, '#f2f0e8'); R(17, -52, 1, 77, '#8a887e');
      R(14, -56, 5, 4, '#e8c35a'); R(15, -57, 3, 1, '#f6e08a');
    },
  },
  silo: {
    box: (p) => [-2, -54 - Math.round(W(p) / 2), W(p) + 2, H(p) + 2], shadow: [18, 8],
    paint(k, p) {
      const { R, cyl, ell } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp(p.color || '#b8bec6');
      const r = w / 2 - 3;
      const cx = w / 2;
      const top = -50;
      cyl(cx - r, top, r * 2, hh - 4 - top, c);
      for (let y = top + 8; y < hh - 6; y += 9) R(cx - r, y, r * 2, 1, c[1]); // the rings
      ell(cx, hh - 4, r, 4, c[1]);
      for (let y = top; y > top - r; y--) { const half = Math.round(r * Math.sqrt(1 - ((top - y) / r) ** 2)); R(cx - half, y, half, 1, c[3]); R(cx, y, half, 1, c[2]); } // the dome
      ell(cx - 3, top - r + 4, 3, 2, c[4]);
      for (let y = top + 2; y < hh - 6; y += 3) R(cx + r - 6, y, 4, 1, '#4a4e56'); // a ladder
      R(cx + r - 6, top + 2, 1, hh - 8 - top, '#4a4e56'); R(cx + r - 3, top + 2, 1, hh - 8 - top, '#4a4e56');
    },
  },
  watertower: {
    box: (p) => [-2, -84, W(p) + 2, H(p) + 2], shadow: [22, 8],
    paint(k, p) {
      const { R, cyl, ell } = k;
      const w = W(p);
      const hh = H(p);
      const steel = ['#3e444c', '#5a6068', '#7a8088', '#9aa0a8'];
      const cx = w / 2;
      for (const dx of [-0.34, 0.34]) for (let y = -20; y < hh - 2; y++) { const x = Math.round(cx + dx * w * (0.6 + 0.4 * (y + 20) / (hh + 18))); R(x - 1, y, 3, 1, steel[1]); R(x - 1, y, 1, 1, steel[3]); }
      for (let i = 0; i < 4; i++) { const y = -12 + i * 14; for (let t = 0; t < 1; t += 0.02) { R(Math.round(cx - w * 0.28 + t * w * 0.56), Math.round(y + t * 12), 1, 1, steel[2]); R(Math.round(cx + w * 0.28 - t * w * 0.56), Math.round(y + t * 12), 1, 1, steel[0]); } }
      const c = ramp('#c8ccd2');
      cyl(cx - w * 0.46, -66, w * 0.92, 44, c);
      ell(cx, -22, w * 0.46, 5, c[1]);
      for (let y = -66; y > -82; y--) { const half = Math.round(w * 0.48 * ((y + 82) / 16)); R(cx - half, y, half, 1, '#a8aeb6'); R(cx, y, half, 1, '#8a9098'); }
      R(cx - w * 0.46, -52, w * 0.92, 18, c[2]); R(cx - w * 0.46, -52, w * 0.92, 1, c[4]); R(cx - w * 0.46, -35, w * 0.92, 1, c[0]); // the band for the name
    },
  },
  windmill: {
    box: (p) => [-4, -40, W(p) + 4, H(p) + 2], shadow: [14, 6],
    paint(k, p) {
      // the lattice tower; the wheel turns live
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const cx = w / 2;
      const steel = ['#4a4e56', '#6a6e76', '#8a8e96', '#aab0b8'];
      for (let y = -30; y < hh; y++) {
        const sp = (w * 0.35) * ((y + 30) / (hh + 30));
        R(Math.round(cx - sp) - 1, y, 2, 1, steel[2]); R(Math.round(cx + sp) - 1, y, 2, 1, steel[1]);
        if ((y + 30) % 20 < 1) R(Math.round(cx - sp), y, Math.round(sp * 2), 1, steel[1]);
      }
      R(cx - 3, -34, 6, 6, steel[1]); R(cx - 3, -34, 6, 1, steel[3]);
      R(cx - 28, -34, 24, 3, steel[2]); R(cx - 30, -38, 4, 10, steel[1]); // the tail vane
    },
  },
  trough: {
    box: (p) => [-1, 4, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp('#7a7e86');
      R(2, 8, w - 4, hh - 10, c[1]); R(2, 8, w - 4, 2, c[3]); R(2, 8, w - 4, 1, c[4]);
      R(5, 11, w - 10, 7, '#2a6a8a'); R(5, 11, w - 10, 1, '#4a8ab0'); R(8, 13, 8, 1, '#8ac0d8');
      R(2, hh - 3, w - 4, 1, c[0]); R(4, hh - 2, 3, 2, c[0]); R(w - 7, hh - 2, 3, 2, c[0]);
    },
  },
  laundry: {
    box: (p) => [-1, -18, W(p) + 1, H(p) + 1], shadow: [6, 4],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const post = ['#3a2a1e', '#5a4a3a', '#7a6a58'];
      for (const x of [2, w - 5]) { R(x, -14, 3, 40, post[1]); R(x, -14, 1, 40, post[2]); }
      for (let x = 4; x < w - 4; x++) R(x, Math.round(-12 + Math.sin(((x - 4) / (w - 8)) * Math.PI) * 6), 1, 1, '#d8d0c0'); // the line
    },
  },  // ---------------------------------------------------------------- v0.52.0: the Phonograph Grand
  roulette_table: {
    box: (p) => [-2, -6, W(p) + 2, H(p) + 2], shadow: [4, 5],
    paint(k, p) {
      const { R, P, ell } = k;
      const w = W(p);
      const hh = H(p);
      const felt = ramp(p.color || '#1e6a3a');
      const wood = ramp('#5a2e1e');
      // the table: a wood rim round green baize, legs below
      R(0, 0, w, hh - 6, wood[2]); R(0, 0, w, 1, wood[4]); R(0, hh - 7, w, 1, wood[0]);
      R(3, 3, w - 6, hh - 12, felt[2]); R(3, 3, w - 6, 1, felt[3]);
      R(4, hh - 6, 3, 5, wood[0]); R(w - 7, hh - 6, 3, 5, wood[0]);
      // the wheel, sunk into the left end: a wooden bowl, a ring of red and black pockets, a gold turret
      const cx = 26;
      const cy = (hh - 6) / 2;
      ell(cx, cy, 23, 22, wood[1]); ell(cx, cy, 21, 20, wood[3]);
      for (let a = 0; a < 37; a++) {
        const t0 = (a / 37) * Math.PI * 2;
        const col = a === 0 ? '#1e8a3a' : a % 2 ? '#b8202a' : '#16141c';
        for (let r = 13; r < 18; r++) P(Math.round(cx + Math.cos(t0) * r), Math.round(cy + Math.sin(t0) * r * 0.95), col);
      }
      ell(cx, cy, 12, 11, '#6a3a22'); ell(cx, cy, 9, 8, '#8a5a32');
      for (let a = 0; a < 4; a++) { const t0 = a * Math.PI / 2 + 0.4; R(Math.round(cx + Math.cos(t0) * 6), Math.round(cy + Math.sin(t0) * 6), 2, 2, '#e8c35a'); }
      ell(cx, cy, 3, 3, '#e8c35a'); P(cx - 1, cy - 1, '#fff0a0');
      P(cx + 15, cy - 4, '#f8f8f0'); // the ball
      // the layout: zero, three rows of twelve, the outside bets beneath
      const lx = 54;
      const lw = w - lx - 8;
      const cw = Math.max(2, Math.floor(lw / 13));
      const top = 6;
      const ch = Math.max(3, Math.floor((hh - 22) / 4));
      R(lx, top, cw, ch * 3, '#1e8a3a');
      const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
        const n = c * 3 + (3 - r);
        R(lx + cw * (c + 1), top + r * ch, cw - 1, ch - 1, RED.includes(n) ? '#b8202a' : '#16141c');
      }
      for (let c = 0; c < 3; c++) { R(lx + cw * (1 + c * 4), top + ch * 3 + 1, cw * 4 - 1, ch - 1, felt[1]); R(lx + cw * (1 + c * 4) + 2, top + ch * 3 + 2, cw * 4 - 5, 1, '#e8e2d0'); }
      R(lx, top - 1, cw * 13, 1, '#e8e2d0'); R(lx, top + ch * 3, cw * 13, 1, '#e8e2d0');
      // chips on the layout
      for (const [x, y, c] of [[lx + cw * 4, top + 2, '#e8c35a'], [lx + cw * 8, top + ch + 2, '#3a6ad8'], [lx + cw * 2, top + ch * 3 + 2, '#d83a3a']]) { R(x, y, 4, 3, c); R(x, y, 4, 1, '#ffffff'); }
    },
  },
  blackjack_table: {
    box: (p) => [-2, -4, W(p) + 2, H(p) + 2], shadow: [4, 5],
    paint(k, p) {
      const { R, P, ell } = k;
      const w = W(p);
      const hh = H(p);
      const felt = ramp(p.color || '#1e6a3a');
      const wood = ramp('#4a2418');
      // a half-moon: flat edge at the back (the dealer's side), the curve towards the players
      const cx = w / 2;
      for (let y = 0; y < hh - 6; y++) {
        const t = y / (hh - 7);
        const half = (w / 2) * Math.sqrt(Math.max(0, 1 - Math.max(0, t - 0.35) ** 2 / 0.4225));
        R(Math.round(cx - half), y, Math.round(half * 2), 1, y < 3 ? wood[3] : wood[2]);
        const inner = Math.max(0, half - 4);
        if (y > 2 && y < hh - 10) R(Math.round(cx - inner), y, Math.round(inner * 2), 1, felt[2]);
      }
      R(cx - 18, 3, 36, 1, felt[3]);
      // the printed arc and three betting circles
      for (let a = 0; a <= 30; a++) { const t0 = Math.PI * (0.15 + 0.7 * (a / 30)); P(Math.round(cx + Math.cos(t0) * (w * 0.32)), Math.round(4 + Math.sin(t0) * (hh * 0.42)), '#e8c35a'); }
      for (const dx of [-0.3, 0, 0.3]) { const bx = Math.round(cx + dx * w); const by = Math.round(hh * (dx === 0 ? 0.68 : 0.55)); for (let a = 0; a < 16; a++) P(Math.round(bx + Math.cos(a / 16 * Math.PI * 2) * 4), Math.round(by + Math.sin(a / 16 * Math.PI * 2) * 3), '#e8e2d0'); }
      // the chip tray and the shoe on the dealer's side
      R(cx - 16, 1, 32, 5, '#2a1a12'); for (let i = 0; i < 7; i++) R(cx - 15 + i * 4.5, 2, 3, 3, ['#e8c35a', '#d83a3a', '#3a6ad8', '#1e1e24', '#e8e2d0', '#3aa84a', '#a84ad8'][i]);
      R(w - 20, 4, 9, 7, '#3a2a1e'); R(w - 20, 4, 9, 1, '#5a4a3a'); R(w - 18, 5, 5, 2, '#f6f2e8');
      ell(cx, hh - 4, 3, 2, wood[0]); R(Math.round(cx - w * 0.3), hh - 6, 3, 5, wood[0]); R(Math.round(cx + w * 0.3) - 3, hh - 6, 3, 5, wood[0]);
    },
  },
  poker_table: {
    box: (p) => [-2, -4, W(p) + 2, H(p) + 2], shadow: [5, 6],
    paint(k, p) {
      const { R, ell } = k;
      const w = W(p);
      const hh = H(p);
      const felt = ramp(p.color || '#1e6a3a');
      const cx = w / 2;
      const cy = (hh - 6) / 2;
      // a stadium-shaped table: a padded black rail, a wood trim, the felt
      ell(cx, cy, w / 2, (hh - 6) / 2, '#16141a');
      ell(cx, cy - 1, w / 2 - 2, (hh - 6) / 2 - 2, '#2a2630');
      ell(cx, cy, w / 2 - 6, (hh - 6) / 2 - 6, '#6a3a22');
      ell(cx, cy, w / 2 - 8, (hh - 6) / 2 - 8, felt[2]);
      ell(cx - 4, cy - 4, w / 2 - 20, (hh - 6) / 2 - 18, felt[3]);
      // five card places down the middle, the pot, the dealer button
      for (let i = 0; i < 5; i++) { R(cx - 26 + i * 11, cy - 6, 8, 11, felt[1]); R(cx - 26 + i * 11, cy - 6, 8, 1, felt[0]); }
      for (const [x, y, c] of [[cx - 6, cy + 8, '#e8c35a'], [cx, cy + 9, '#d83a3a'], [cx + 5, cy + 8, '#3a6ad8']]) { R(x, y, 5, 4, c); R(x, y, 5, 1, '#ffffff'); }
      R(cx + 22, cy + 10, 5, 4, '#f6f2e8'); R(cx + 23, cy + 11, 3, 1, '#1b1a24');
      R(cx - w / 2 + 12, hh - 6, 3, 5, '#0e0c10'); R(cx + w / 2 - 15, hh - 6, 3, 5, '#0e0c10');
    },
  },
  spade_table: {
    box: (p) => [-2, -4, W(p) + 2, H(p) + 2], shadow: [4, 5],
    paint(k, p) {
      const { R, ell, P } = k;
      const w = W(p);
      const hh = H(p);
      const felt = ramp('#4a1e6a');
      const wood = ramp('#1e1620');
      R(0, 0, w, hh - 6, wood[2]); R(0, 0, w, 1, '#c9a24a'); R(0, hh - 7, w, 1, '#c9a24a');
      R(3, 3, w - 6, hh - 12, felt[2]); R(3, 3, w - 6, 1, felt[3]);
      // the gold spade inlaid in the felt, and a deck that shuffles itself
      const cx = w / 2;
      const cy = (hh - 6) / 2;
      ell(cx, cy - 2, 6, 5, '#c9a24a'); ell(cx - 4, cy + 1, 4, 3, '#c9a24a'); ell(cx + 4, cy + 1, 4, 3, '#c9a24a');
      R(cx - 1, cy + 2, 2, 6, '#c9a24a'); R(cx - 3, cy + 7, 6, 1, '#c9a24a'); P(cx - 2, cy - 4, '#fff0a0');
      R(w - 22, 6, 8, 11, '#f6f2e8'); R(w - 21, 5, 8, 11, '#4a1e6a'); R(w - 20, 6, 6, 9, '#7a3aa8'); R(w - 18, 9, 2, 3, '#c9a24a');
      R(4, hh - 6, 3, 5, wood[0]); R(w - 7, hh - 6, 3, 5, wood[0]);
    },
  },
  cashier_cage: {
    box: (p) => [-1, -26, W(p) + 1, H(p) + 2], shadow: [3, 4], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      const w = W(p);
      const hh = H(p);
      const wood = ramp('#3a1e14');
      // the counter
      R(0, 6, w, hh - 7, wood[1]); R(0, 6, w, 1, wood[0]); R(0, 0, w, 7, wood[3]); R(0, 0, w, 1, wood[4]);
      for (let x = 6; x + 14 <= w - 2; x += 18) { R(x, 10, 14, hh - 14, wood[2]); R(x, 10, 14, 1, wood[3]); }
      // brass bars up to a cornice, a window every two tiles, green-shaded lamps
      R(0, -26, w, 4, '#2a1a12'); R(0, -26, w, 1, '#c9a24a'); R(0, -23, w, 1, '#8a6a1a');
      for (let x = 2; x < w; x += 4) R(x, -22, 1, 22, '#c9a24a');
      for (let x = 16; x < w - 16; x += 64) {
        R(x, -18, 32, 18, '#1a1612'); R(x + 1, -17, 30, 16, o.night ? '#d8b860' : '#c8a850'); R(x + 1, -17, 30, 3, '#f0d890');
        R(x + 4, -2, 24, 3, '#f4f0e6'); // the slot under the window
        R(x + 13, -24, 6, 3, '#2a7a4a'); R(x + 13, -24, 6, 1, '#4aa06a');
      }
      // chips stacked behind the glass
      for (let i = 0; i < 8; i++) R(8 + i * Math.floor((w - 16) / 8), 2, 4, 3, ['#e8c35a', '#d83a3a', '#3a6ad8', '#1e1e24'][i % 4]);
    },
  },
  slot_machine: {
    box: () => [2, -24, 30, 33], shadow: [3, 4], night: true, variants: 3,
    paint(k, p, v, o) {
      const { R } = k;
      const body = ramp(['#a81e2a', '#2a3a8a', '#7a2a8a'][v]);
      R(5, -22, 22, 50, body[2]); R(5, -22, 3, 50, body[3]); R(24, -22, 3, 50, body[1]); R(5, -22, 22, 2, body[4]);
      R(5, -22, 22, 6, '#c9a24a'); R(7, -21, 18, 4, o.night ? '#fff0a0' : '#e8c35a'); // the lit top
      R(8, -12, 16, 12, '#141418'); for (let i = 0; i < 3; i++) { R(9 + i * 5, -11, 4, 10, '#f6f2e8'); R(10 + i * 5, -7, 2, 2, ['#d83a3a', '#e8c35a', '#3a6ad8'][(i + v) % 3]); }
      R(8, 3, 16, 3, '#2a2630'); R(13, 4, 6, 1, '#c9a24a'); // the coin tray
      R(27, -14, 2, 12, '#9a9aa8'); R(26, -17, 4, 4, '#d83a3a'); R(26, -17, 2, 2, '#ff8a8a'); // the lever
      R(5, 24, 22, 3, body[0]);
    },
  },
  velvet_rope: {
    box: (p) => [-1, -14, W(p) + 1, H(p) + 1], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      for (const x of [4, w - 8]) { R(x, -10, 4, 34, '#c9a24a'); R(x, -10, 1, 34, '#fff0a0'); R(x - 2, -12, 8, 3, '#e8c35a'); R(x - 3, 22, 10, 4, '#8a6a1a'); }
      for (let x = 8; x < w - 8; x++) { const sag = Math.round(Math.sin(((x - 8) / (w - 16)) * Math.PI) * 8); R(x, -6 + sag, 1, 3, '#a81e2a'); R(x, -6 + sag, 1, 1, '#d8505a'); }
    },
  },
  pillar: {
    box: () => [-2, -44, 34, 33], shadow: [8, 5],
    paint(k) {
      const { R, cyl } = k;
      const m = ramp('#e8e0d4');
      R(0, 22, 32, 8, '#c9a24a'); R(0, 22, 32, 1, '#fff0a0'); R(0, 29, 32, 1, '#8a6a1a');
      cyl(5, -36, 22, 58, m);
      for (let x = 8; x < 26; x += 4) R(x, -34, 1, 54, m[1]); // the fluting
      R(1, -42, 30, 7, '#c9a24a'); R(1, -42, 30, 1, '#fff0a0'); R(3, -36, 26, 1, '#8a6a1a');
    },
  },
  magic_circle: {
    box: (p) => [0, 0, W(p), H(p)],
    paint(k, p) {
      const { P } = k;
      const w = W(p);
      const hh = H(p);
      const cx = w / 2;
      const cy = hh / 2;
      const ring = (rx, ry, c, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; P(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), c); } };
      ring(w / 2 - 4, hh / 2 - 4, '#c9c3d4', 600); ring(w / 2 - 5, hh / 2 - 5, '#8a6aa8', 600);
      ring(w / 2 - 14, hh / 2 - 12, '#c9c3d4', 480);
      // a five-pointed star and tick marks like letters round the rim
      for (let i = 0; i < 5; i++) {
        const a0 = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        const a1 = -Math.PI / 2 + ((i + 1) * 4 * Math.PI) / 5;
        for (let s = 0; s <= 60; s++) { const t = s / 60; P(Math.round(cx + (Math.cos(a0) * (1 - t) + Math.cos(a1) * t) * (w / 2 - 14)), Math.round(cy + (Math.sin(a0) * (1 - t) + Math.sin(a1) * t) * (hh / 2 - 12)), '#a88ac8'); }
      }
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * (w / 2 - 9)); const y = Math.round(cy + Math.sin(a) * (hh / 2 - 8)); P(x, y, '#e8c35a'); if (i % 3 === 0) P(x + 1, y, '#e8c35a'); }
    },
  },
  floating_cards: {
    box: () => [-6, -26, 38, 31], shadow: [0, 0],
    paint(k) {
      const { R } = k;
      for (const [x, y, face] of [[4, -18, 1], [14, -22, 0], [22, -14, 1], [10, -8, 0]]) { R(x, y, 7, 10, face ? '#f6f2e8' : '#4a1e6a'); R(x + 2, y + 3, 3, 3, face ? '#c8242c' : '#c9a24a'); }
    },
  },
  crystal_ball: {
    box: () => [2, -16, 30, 31], shadow: [3, 3],
    paint(k) {
      const { R, ball } = k;
      R(9, 14, 14, 12, '#3a2a1e'); R(7, 24, 18, 4, '#2a1e14'); R(9, 14, 14, 1, '#c9a24a');
      for (const x of [8, 22]) R(x, 8, 2, 8, '#c9a24a');
      ball(16, 2, 11, 11, ['#3a1e5a', '#5a3a8a', '#8a6ac0', '#c0a8e8', '#f0e8ff']);
      R(11, -4, 3, 2, '#ffffff');
    },
  },
  candelabra: {
    box: () => [4, -24, 28, 31], shadow: [4, 4], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      R(14, -6, 4, 32, '#9a9aa8'); R(14, -6, 1, 32, '#d8d8e0'); R(10, 24, 12, 4, '#6a6a78');
      R(6, -8, 20, 2, '#9a9aa8');
      for (const x of [6, 14, 22]) { R(x, -16, 4, 8, '#f0e8d0'); R(x + 1, -21, 2, 4, o.night ? '#ffd24a' : '#ffb84a'); R(x + 1, -19, 2, 1, '#fff6c0'); }
    },
  },
  piano: {
    box: (p) => [-1, -10, W(p) + 1, H(p) + 2], shadow: [5, 6],
    paint(k, p) {
      const { R, ell } = k;
      const w = W(p);
      const hh = H(p);
      const c = ramp(p.color || '#f2efe8');
      // a grand from above: the curved body, the lid propped open, the keyboard along the front
      ell(w * 0.55, hh * 0.42, w * 0.44, hh * 0.4, c[1]);
      ell(w * 0.53, hh * 0.4, w * 0.42, hh * 0.38, c[3]);
      R(4, hh * 0.45, w - 8, hh * 0.3, c[3]);
      R(w * 0.2, -8, w * 0.6, hh * 0.45, c[4]); R(w * 0.2, -8, w * 0.6, 1, '#ffffff'); R(w * 0.48, -8, 2, hh * 0.45 + 8, c[1]); // the lid
      R(4, hh - 18, w - 8, 9, '#141418');
      for (let x = 6; x < w - 6; x += 3) R(x, hh - 17, 2, 7, '#f8f6f0');
      for (let x = 7; x < w - 8; x += 7) R(x, hh - 17, 2, 4, '#141418');
      R(8, hh - 8, 3, 7, c[0]); R(w - 11, hh - 8, 3, 7, c[0]);
    },
  },
  phone_dock: {
    box: () => [0, 2, 32, 31], shadow: [2, 3], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      R(2, 10, 28, 18, '#8a6a1a'); R(2, 10, 28, 2, '#e8c35a'); R(2, 26, 28, 2, '#5a4a12');
      for (let i = 0; i < 9; i++) { const x = 4 + (i % 3) * 9; const y = 4 + Math.floor(i / 3) * 7; R(x, y, 6, 9, '#16161e'); R(x + 1, y + 1, 4, 6, i === 4 || o.night ? '#6ac8f0' : '#2a3a4a'); }
    },
  },
  monitor_wall: {
    box: (p) => [0, -20, W(p), H(p)], shadow: [0, 0], night: true,
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      R(0, -18, w, 40, '#16161c');
      for (let x = 2; x < w - 10; x += 16) for (let y = -16; y < 18; y += 12) {
        R(x, y, 14, 10, '#0a0a10');
        R(x + 1, y + 1, 12, 8, (x + y) % 3 ? '#2a5a4a' : '#3a4a6a');
        R(x + 2, y + 6, 6, 1, '#6ac8a0'); R(x + 9, y + 2, 2, 2, '#e8c35a');
        if ((x * 3 + y) % 7 === 0) { R(x + 1, y + 1, 12, 8, '#d8d8e0'); R(x + 3, y + 3, 7, 4, '#a0a0b0'); }
      }
    },
  },
  luggage_cart: {
    box: () => [0, -22, 32, 32], shadow: [4, 4],
    paint(k) {
      const { R } = k;
      for (const x of [3, 27]) R(x, -20, 2, 46, '#c9a24a');
      R(3, -20, 26, 2, '#e8c35a'); R(3, 20, 26, 3, '#8a6a1a');
      R(6, 4, 20, 16, '#4a2a1a'); R(6, 4, 20, 1, '#6a4a2a'); R(15, 3, 3, 2, '#c9a24a');
      R(8, -8, 16, 12, '#2a4a3a'); R(8, -8, 16, 1, '#4a6a5a'); R(14, -9, 3, 2, '#c9a24a');
      R(11, -18, 10, 9, '#d8d2c0'); for (let x = 12; x < 21; x += 2) R(x, -18, 1, 9, '#8a8a8a'); R(14, -15, 3, 3, '#4aa04a'); // the parrot in its cage
      R(4, 26, 4, 4, '#1a1a1e'); R(24, 26, 4, 4, '#1a1a1e');
    },
  },
  marquee_pylon: {
    box: () => [-4, -70, 36, 33], shadow: [10, 6], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      R(10, -10, 12, 40, '#1e1a24'); R(10, -10, 2, 40, '#3a3440'); R(6, 26, 20, 5, '#c9a24a');
      R(-2, -68, 36, 60, '#1e1a24'); R(-2, -68, 36, 2, '#c9a24a'); R(-2, -10, 36, 2, '#c9a24a');
      for (let y = -64; y < -12; y += 4) for (let x = 0; x < 32; x += 4) if (y === -64 || y === -16 || x === 0 || x === 28) R(x + 1, y + 1, 2, 2, o.night ? '#fff0a0' : '#c9a24a');
      R(6, -56, 20, 34, '#4a1a28'); R(9, -50, 14, 2, '#e8c35a'); R(9, -44, 14, 2, '#e8c35a'); R(11, -38, 10, 2, '#e8c35a'); R(13, -30, 6, 4, '#e8c35a');
    },
  },
  valet_stand: {
    box: () => [4, -16, 28, 31], shadow: [3, 3],
    paint(k) {
      const { R } = k;
      R(8, -12, 16, 34, '#2a1a12'); R(8, -12, 16, 2, '#c9a24a'); R(8, -12, 2, 34, '#4a3020');
      R(6, -14, 20, 4, '#3a2418'); R(6, -14, 20, 1, '#5a3a28');
      R(11, -4, 10, 6, '#f4f0e6'); R(12, -2, 8, 1, '#4a1a28');
      for (let i = 0; i < 4; i++) R(11 + i * 3, 6, 1, 4, '#c9a24a');
      R(6, 22, 20, 4, '#1a1012');
    },
  },
};

/** Where a statue's plinth starts, and its plaque's middle (prop coordinates). */
const plinthTop = (p) => Math.max(10, H(p) - 30);
const plaqueY = (p) => Math.round((plinthTop(p) + H(p) - 10) / 2);

/** Which way a fence's neighbours run: 1 north, 2 east, 4 south, 8 west. */
const linkCache = new WeakMap();
function links(map, p) {
  if (!map) return 0;
  let byTile = linkCache.get(map);
  if (!byTile) {
    byTile = new Map();
    for (const q of map.props) if (PAINTERS[q.type]?.connect) for (let y = q.y; y < q.y + (q.h || 1); y++) for (let x = q.x; x < q.x + (q.w || 1); x++) byTile.set(`${x},${y}`, q.type);
    linkCache.set(map, byTile);
  }
  const at = (x, y) => byTile.get(`${x},${y}`) === p.type;
  return (at(p.x, p.y - 1) ? 1 : 0) | (at(p.x + 1, p.y) ? 2 : 0) | (at(p.x, p.y + 1) ? 4 : 0) | (at(p.x - 1, p.y) ? 8 : 0);
}

// ------------------------------------------------------------------ making and drawing sprites
const sprites = new Map();
const canMake = () => typeof document !== 'undefined';
const painterOf = (type) => {
  const P = PAINTERS[type];
  return P?.alias ? PAINTERS[P.alias] : P;
};

function make(P, p, v, o) {
  const [x0, y0, x1, y1] = P.box(p);
  const w = x1 - x0 + 2;
  const h = y1 - y0 + 2;
  const body = document.createElement('canvas');
  body.width = w;
  body.height = h;
  const ctx = body.getContext('2d');
  ctx.translate(1 - x0, 1 - y0);
  P.paint(kit(ctx), p, v, o);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the outline: the silhouette in ink, one pixel out every way, under the body
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const oc = out.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) oc.drawImage(body, dx, dy);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = INK;
  oc.fillRect(0, 0, w, h);
  oc.globalCompositeOperation = 'source-over';
  oc.drawImage(body, 0, 0);
  // the shadow: the silhouette, flat dark
  let shadow = null;
  if (P.shadow && (P.shadow[0] || P.shadow[1])) {
    shadow = document.createElement('canvas');
    shadow.width = w;
    shadow.height = h;
    const sc = shadow.getContext('2d');
    sc.drawImage(out, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = `rgb(${SHADOW_RGB})`;
    sc.fillRect(0, 0, w, h);
  }
  return { cv: out, shadow, x: x0 - 1, y: y0 - 1, sx: P.shadow?.[0] || 0, sy: P.shadow?.[1] || 0 };
}

function spriteFor(p, opts) {
  const P = painterOf(p.type);
  if (!P || !canMake()) return null;
  const v = P.variants ? Math.floor(hash2(Math.round(p.x * 7) + 3, Math.round(p.y * 13) + 1) * P.variants) : 0;
  const night = P.night ? Boolean(opts.night) : false;
  const ln = P.connect ? links(opts.map, p) : 0;
  const key = `${p.type}|${p.w}|${p.h}|${p.color || ''}|${v}|${night ? 1 : 0}|${ln}|${p.razor ? 1 : 0}|${p.vertical ? 1 : 0}`;
  let s = sprites.get(key);
  if (!s) {
    s = make(P, p, v, { night, links: ln });
    sprites.set(key, s);
  }
  return s;
}

/** Draw `p` from its sprite; false when it has none (the caller draws it the old way). */
export function drawPropSprite(ctx, p, opts = {}) {
  if (p.type === 'display' && p.variant === 'guns') return false;
  const s = spriteFor(p, opts);
  if (!s) return false;
  ctx.drawImage(s.cv, Math.round(p.x * T) + s.x, Math.round(p.y * T) + s.y);
  if (p.type === 'barrelfire') flames(ctx, p, opts.time || 0);
  if (p.type === 'flagpole') flag(ctx, p, opts.time || 0);
  if (p.type === 'trafficlight') lamps(ctx, p, opts.realTime ?? opts.time ?? 0);
  if (p.type === 'fountain') ripple(ctx, p, opts.time || 0);
  if (p.type === 'busstop' || p.type === 'gatepost' || p.type === 'statue' || p.type === 'watertower') label(ctx, p);
  if (p.type === 'windmill') wheel(ctx, p, opts.time || 0);
  if (p.type === 'laundry') washing(ctx, p, opts.time || 0);
  if (p.type === 'floating_cards') EFFECTS.spiral(ctx, { x: p.x * T + 16, y: p.y * T + 6, height: 34, r: 10, n: 9, h: 6, speed: 0.35 }, opts.time || 0); // v0.52.0
  return true;
}

/** Draw `p`'s shadow on the ground (before anything stands on it). */
export function drawPropShadow(ctx, p, opts = {}, alpha = 0.3) {
  if (p.type === 'display' && p.variant === 'guns') return false;
  const s = spriteFor(p, opts);
  if (!s?.shadow) return false;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(s.shadow, Math.round(p.x * T) + s.x + s.sx, Math.round(p.y * T) + s.y + s.sy);
  ctx.globalAlpha = a;
  return true;
}

export const SPRITE_PROPS = new Set(Object.keys(PAINTERS));

// ------------------------------------------------------------------ the live bits
function flames(ctx, p, t) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  for (let i = 0; i < 4; i++) {
    const f = Math.sin(t * 9 + i * 2.1);
    const hgt = 8 + Math.round(Math.abs(f) * 6) + (i === 1 || i === 2 ? 4 : 0);
    const fx = x + 10 + i * 3;
    ctx.fillStyle = '#ff7a2a';
    ctx.fillRect(fx, y + 7 - hgt, 3, hgt);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(fx + 1, y + 7 - Math.round(hgt * 0.6), 1, Math.round(hgt * 0.6));
  }
}

function flag(ctx, p, t) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  const c = ramp(p.color || '#2a4a8a');
  for (let i = 0; i < 22; i++) {
    const wave = Math.round(Math.sin(t * 2.4 + p.x + i * 0.35) * 2);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 18 + i, y - 51 + wave, 1, 15);
    ctx.fillStyle = i % 6 < 3 ? c[2] : c[3];
    ctx.fillRect(x + 18 + i, y - 50 + wave, 1, 13);
  }
}

const LAMP = { red: ['#ff3b2f', '#4a1410'], amber: ['#ffb02e', '#4a3410'], green: ['#3fe07a', '#103a20'] };
/** The traffic light's lamps and its walk / wait box, as they are right now. */
function lamps(ctx, p, t) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  const s = lightState(p, t);
  const axis = p.corner === 'nw' || p.corner === 'se' ? 'ew' : 'ns';
  ['red', 'amber', 'green'].forEach((c, i) => {
    const on = s[axis] === c;
    const cy = y - 37 + i * 10;
    ctx.fillStyle = LAMP[c][on ? 0 : 1];
    ctx.fillRect(x + 13, cy, 6, 6); ctx.fillRect(x + 12, cy + 1, 8, 4);
    if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 14, cy + 1, 2, 2); ctx.fillStyle = `${LAMP[c][0]}44`; ctx.fillRect(x + 9, cy - 2, 14, 10); }
  });
  const w = walkSignal(p, axis, t);
  const lit = w === 'walk' || (w === 'flash' && Math.floor(t * 3) % 2 === 0);
  ctx.fillStyle = w === 'wait' ? '#ff6a3a' : lit ? '#f2f2e8' : '#2a2c30';
  if (w === 'wait') ctx.fillRect(x + 22, y - 2, 5, 6);
  else { ctx.fillRect(x + 24, y - 2, 2, 2); ctx.fillRect(x + 23, y, 4, 2); ctx.fillRect(x + 24, y + 2, 1, 3); ctx.fillRect(x + 26, y + 2, 1, 3); }
}

function ripple(ctx, p, t) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  const w = Math.round((p.w || 1) * T);
  const h = Math.round((p.h || 1) * T);
  for (let i = 0; i < 6; i++) {
    const a = t * 0.8 + i * 1.05;
    const rx = (w / 2 - 12) * (0.4 + 0.5 * ((Math.sin(a) + 1) / 2));
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(Math.round(x + w / 2 + Math.cos(i * 1.05) * rx), Math.round(y + h / 2 + Math.sin(i * 1.05) * rx * 0.45), 3, 1);
  }
}

/** Words on a prop are drawn live (and crisp, over the pixels). */
function label(ctx, p) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (p.type === 'busstop') { ctx.fillStyle = '#efe6cc'; ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.fillText(p.lines || '1', x + 16.5, y - 15.5); }
  else if (p.type === 'watertower') { ctx.fillStyle = '#7a2a24'; ctx.font = 'bold 14px Georgia, serif'; ctx.fillText('LARIAT', x + Math.round((p.w || 1) * T) / 2, y - 43); }
  else if (p.type === 'gatepost') { ctx.fillStyle = '#e8c35a'; ctx.font = 'bold 9px "Trebuchet MS", sans-serif'; ctx.fillText('H', x + 16, y - 7); }
  else { ctx.fillStyle = '#e8d8a8'; ctx.font = 'bold 6px "Trebuchet MS", sans-serif'; ctx.fillText(p.label || 'FOUNDER', x + Math.round((p.w || 1) * T) / 2, y + plaqueY(p), Math.round((p.w || 1) * T) - 24); }
  ctx.restore();
}

/** The windmill's wheel of blades, turning. */
function wheel(ctx, p, t) {
  const cx = Math.round(p.x * T + ((p.w || 1) * T) / 2);
  const cy = Math.round(p.y * T) - 31;
  const a0 = t * 1.4;
  for (let b = 0; b < 14; b++) {
    const a = a0 + (b * Math.PI * 2) / 14;
    for (let r = 4; r < 22; r++) {
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      ctx.fillStyle = r > 19 ? '#8a9098' : '#c8ccd2';
      ctx.fillRect(x, y, r > 10 ? 2 : 1, r > 10 ? 2 : 1);
    }
  }
  ctx.fillStyle = INK; ctx.fillRect(cx - 3, cy - 3, 6, 6);
  ctx.fillStyle = '#5a5e66'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
}

/** Washing on the line, stirring in the wind. */
function washing(ctx, p, t) {
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  const w = Math.round((p.w || 1) * T);
  const colors = ['#c0614a', '#e8e2d4', '#4a6a8a', '#d9a23a', '#6a8a5a'];
  for (let i = 0; i < Math.floor((w - 16) / 13); i++) {
    const sway = Math.round(Math.sin(t * 2 + i) * 1.5);
    const c = ramp(colors[(i + Math.round(p.x)) % colors.length]);
    const lx = x + 9 + i * 13 + sway;
    const ly = y - 10 + Math.round(Math.sin(((lx - x - 4) / (w - 8)) * Math.PI) * 6);
    const hh = 12 + (i % 3) * 3;
    ctx.fillStyle = INK; ctx.fillRect(lx - 1, ly, 11, hh + 1);
    ctx.fillStyle = c[2]; ctx.fillRect(lx, ly, 9, hh);
    ctx.fillStyle = c[3]; ctx.fillRect(lx, ly, 3, hh);
    ctx.fillStyle = c[1]; ctx.fillRect(lx + 7, ly, 2, hh);
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(lx + 1, ly - 1, 2, 2); ctx.fillRect(lx + 6, ly - 1, 2, 2);
  }
}

/** For the tests: paint `p` into a recorder; its box and every rectangle it filled (prop coordinates). */
export function paintPropForTest(p, opts = {}) {
  const P = painterOf(p.type);
  if (!P) return null;
  const rects = [];
  const ctx = { fillStyle: '', fillRect(x, y, w, h) { rects.push([x, y, w, h, this.fillStyle]); } };
  const v = P.variants ? Math.floor(hash2(Math.round(p.x * 7) + 3, Math.round(p.y * 13) + 1) * P.variants) : 0;
  P.paint(kit(ctx), p, v, { night: Boolean(opts.night), links: opts.links || 0 });
  return { box: P.box(p), rects };
}
