// Furniture and room fittings: beds, desks, shelves, counters, rugs, wall items, lamps.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, oriented, vmesh, onWall, tilesOfTypes, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS, CREAM } from './kit.js';

const col = (p, def, k = 0.25) => (typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? mute(p.color, k) : def);

export function bed(p) {
  const [w, h] = size(p, 1, 2);
  const cover = col(p, pick(['#3f6a8a', '#8a4a4a', '#5a7a5a', '#7a5a8a'], rnd(p)));
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.3, h - 0.08, '#6a4a30', 0, 0.06, 0), bx(w - 0.18, 0.16, h - 0.2, '#e8e2d2', 0, 0.36, 0.02), bx(w - 0.16, 0.12, h * 0.62, cover, 0, 0.5, h * 0.17), bx(w - 0.1, 0.9, 0.08, '#5a3e28', 0, 0.06, -h / 2 + 0.07), bx(w - 0.1, 0.4, 0.06, '#5a3e28', 0, 0.06, h / 2 - 0.05));
  const n = w >= 1.8 ? 2 : 1;
  for (let i = 0; i < n; i++) g.add(bx((w - 0.3) / n - 0.06, 0.1, 0.34, '#f4f1e8', -((n - 1) / 2) * ((w - 0.3) / n) + i * ((w - 0.3) / n), 0.52, -h / 2 + 0.32));
  return done(g);
}
export function cot(p) {
  const [w, h] = size(p, 1, 2);
  return done(group(w / 2, 0, h / 2, bx(w - 0.2, 0.06, h - 0.1, '#5a6a4a', 0, 0.32, 0), bx(0.05, 0.34, h - 0.1, '#6d6f66', -w / 2 + 0.1, 0, 0), bx(0.05, 0.34, h - 0.1, '#6d6f66', w / 2 - 0.1, 0, 0), bx(w - 0.2, 0.05, 0.05, '#6d6f66', 0, 0.1, -h / 2 + 0.1), bx(w - 0.2, 0.05, 0.05, '#6d6f66', 0, 0.1, h / 2 - 0.1), bx(w - 0.4, 0.08, 0.3, '#d8d2c0', 0, 0.38, -h / 2 + 0.3), bx(w - 0.3, 0.05, h * 0.5, '#8a8a6a', 0, 0.38, h * 0.14)));
}

export function wardrobe(p) {
  const w = p.w || 1; const c = col(p, '#6a4a30');
  const g = group(w / 2, 0, 0.5, bx(w - 0.1, 1.95, 0.7, c, 0, 0, -0.1), bx(w - 0.06, 0.1, 0.74, shade(c, -22), 0, 1.95, -0.1), bx(0.025, 1.7, 0.03, shade(c, -50), 0, 0.12, 0.26, { cast: false }), bx(0.05, 0.14, 0.04, '#d9c07a', -0.08, 1.0, 0.27, { cast: false }), bx(0.05, 0.14, 0.04, '#d9c07a', 0.08, 1.0, 0.27, { cast: false }), bx(w - 0.3, 0.06, 0.03, shade(c, 12), 0, 0.12, 0.26, { cast: false }));
  return done(g);
}

export function desk(p, ctx) {
  const [w, h] = size(p, 2, 1);
  const wd = '#7a5638'; const dk = '#6a482e';
  const g = group(w / 2, 0, h / 2, bx(w - 0.06, 0.07, 0.8, wd, 0, 0.72, -0.05), bx(0.5, 0.72, 0.74, dk, -w / 2 + 0.3, 0, -0.05), bx(0.06, 0.72, 0.74, dk, w / 2 - 0.08, 0, -0.05), bx(w - 0.7, 0.4, 0.04, dk, 0.1, 0.3, -0.38), bx(0.4, 0.04, 0.02, BRASS, -w / 2 + 0.3, 0.5, 0.33, { cast: false }), bx(0.4, 0.04, 0.02, BRASS, -w / 2 + 0.3, 0.2, 0.33, { cast: false }));
  const k = rnd(p);
  if (w >= 2) g.add(bx(0.42, 0.3, 0.04, '#22262c', 0.1, 0.86, -0.25, { ry: -0.15 }), bx(0.12, 0.08, 0.1, '#22262c', 0.1, 0.79, -0.25), bx(0.42, 0.26, 0.02, '#4a7a9a', 0.1, 0.88, -0.225, { ry: -0.15, emissive: '#6fa8c8', ei: 0.5, cast: false }), bx(0.3, 0.02, 0.1, '#2a2c30', 0.1, 0.79, 0.0, { cast: false }));
  g.add(bx(0.28, 0.03, 0.36, '#f4f1e4', -w / 2 + 0.8, 0.79, 0.05, { ry: 0.2, cast: false }));
  if (k > 0.5 && w >= 2) g.add(cy(0.05, 0.3, '#3a3a3a', w / 2 - 0.3, 0.79, -0.28, { seg: 6 }), cn(0.12, 0.14, '#3f7a5a', w / 2 - 0.3, 1.05, -0.28, { seg: 8 }));
  return done(g);
}

export function table(p) {
  const [w, h] = size(p, 1, 1);
  const top = col(p, '#9a7450', 0.15);
  const g = group(w / 2, 0, h / 2);
  if (w * h <= 1.01) { g.add(cy(0.36, 0.06, top, 0, 0.68, 0, { seg: 12 }), cy(0.05, 0.68, shade(top, -34), 0, 0, 0, { seg: 6 }), cy(0.24, 0.05, shade(top, -34), 0, 0, 0, { seg: 8 })); }
  else {
    g.add(bx(w - 0.1, 0.07, h - 0.14, top, 0, 0.68, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.09, 0.68, 0.09, shade(top, -34), sx * (w / 2 - 0.12), 0, sz * (h / 2 - 0.12)));
    g.add(bx(w - 0.3, 0.05, h - 0.3, shade(top, -40), 0, 0.5, 0, { cast: false }));
  }
  const k = rnd(p);
  if (k > 0.3) g.add(cy(0.07, 0.1, '#f0ead8', 0.12, 0.75, 0.05, { seg: 8 }), bx(0.22, 0.02, 0.28, '#f4f1e4', -0.14, 0.75, 0.04, { ry: 0.3, cast: false }));
  if (w >= 3) for (let i = 1; i < w - 1; i += 2) g.add(cy(0.07, 0.1, '#f0ead8', -w / 2 + i + 0.5, 0.75, 0.1, { seg: 8 }));
  return done(g);
}

export function chair(p, ctx) {
  const c = col(p, pick(['#3f5a4a', '#6a4a36', '#7a3f3a'], rnd(p)), 0.2);
  const t = tilesOfTypes(ctx?.map, ['table', 'desk', 'counter']);
  let ry = 0;
  if (t) { const near = [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]].find(([dx, dy]) => t.has(`${p.x + dx},${p.y + dy}`)); if (near) ry = near[2]; }
  const r = group(0, 0, 0, bx(0.44, 0.07, 0.44, c, 0, 0.42, 0), bx(0.44, 0.5, 0.06, c, 0, 0.5, -0.19), bx(0.06, 0.42, 0.06, DWOOD, -0.17, 0, -0.17), bx(0.06, 0.42, 0.06, DWOOD, 0.17, 0, -0.17), bx(0.06, 0.42, 0.06, DWOOD, -0.17, 0, 0.17), bx(0.06, 0.42, 0.06, DWOOD, 0.17, 0, 0.17));
  r.rotation.y = ry;
  return done(group(0.5, 0, 0.5, r));
}

export function counter(p) {
  const [w, h] = size(p, 2, 1);
  const body = col(p, '#7d5a3c', 0.15);
  const g = group(w / 2, 0, h / 2, bx(w - 0.04, 0.92, 0.72, body, 0, 0, 0.04), bx(w, 0.07, 0.86, '#c9b48a', 0, 0.92, 0.04), bx(w - 0.2, 0.5, 0.02, shade(body, -20), 0, 0.2, 0.41, { cast: false }));
  for (let i = 1; i < w; i++) g.add(bx(0.03, 0.62, 0.02, shade(body, -40), -w / 2 + i, 0.15, 0.415, { cast: false }));
  if (w >= 2) {
    g.add(bx(0.36, 0.22, 0.3, '#3c4046', w / 2 - 0.45, 0.99, 0.05), bx(0.3, 0.14, 0.04, '#9fd0b0', w / 2 - 0.45, 1.2, -0.08, { emissive: '#6fc09a', ei: 0.6, cast: false }));
    for (let i = 0; i < Math.min(3, w - 1); i++) g.add(cy(0.12, 0.05, '#f4f1e4', -w / 2 + 0.5 + i * 0.9, 0.99, 0.1, { seg: 10 }), bl(0.08, '#c98a4a', -w / 2 + 0.5 + i * 0.9, 1.08, 0.1, { detail: 0, cast: false }));
  }
  return done(g);
}

export function stove(p) {
  const g = group();
  for (let i = 0; i < (p.w || 1); i++) {
    const c = i + 0.5;
    g.add(bx(0.9, 0.9, 0.72, '#2e3034', c, 0, 0.5), bx(0.92, 0.04, 0.74, '#1c1e22', c, 0.9, 0.5), bx(0.6, 0.4, 0.02, '#3c4046', c, 0.3, 0.87, { cast: false }), bx(0.5, 0.04, 0.03, '#b8bcc0', c, 0.74, 0.88, { cast: false }));
    for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.17], [0.2, 0.17]]) g.add(cy(0.11, 0.02, '#55585e', c + x, 0.94, 0.5 + z, { seg: 10, cast: false }));
    g.add(cy(0.12, 0.2, '#b8bcc0', c + 0.2, 0.96, 0.35, { seg: 10 }), bx(0.4, 0.1, 0.1, '#1c1e22', c, 0.94, 0.2));
  }
  return done(g);
}
export function oven(p, ctx) {
  const g = group(0.5, 0, 0.5, bx(0.9, 1.1, 0.82, '#8a5a48'), bx(0.5, 0.36, 0.04, '#1c1a1a', 0, 0.3, 0.42, { cast: false }), bx(0.4, 0.26, 0.02, '#ff9a4a', 0, 0.35, 0.435, { emissive: '#ff7a2a', ei: 1.2, cast: false }), bx(0.5, 0.05, 0.05, BRASS, 0, 0.76, 0.43, { cast: false }), bx(0.3, 1.0, 0.3, '#7a4a3a', 0, 1.1, -0.2), bx(0.2, 0.7, 0.2, '#6a3a2a', 0, 2.1, -0.2));
  return done(g, { lights: [{ x: 0.5, y: 0.7, z: 1.2, color: '#ff8a3a', intensity: 2.5, distance: 3.5 }] });
}

export function shelf(p) {
  const w = p.w || 1; const h = p.h || 1;
  const kind = /cafe|diner|kitchen|shop/.test(String(p.id || '')) ? 'jars' : 'books';
  const along = w >= h;
  const len = along ? w : h;
  const inner = group(0, 0, 0, bx(len - 0.08, 1.9, 0.42, '#4a3424', 0, 0, 0), bx(len - 0.04, 0.05, 0.46, '#5a4030', 0, 1.9, 0));
  for (let r = 0; r < 4; r++) inner.add(bx(len - 0.12, 0.04, 0.4, '#5a4030', 0, 0.32 + r * 0.42, 0.01));
  inner.add(vmesh((m) => {
    for (let r = 0; r < 4; r++) { let x = -len / 2 + 0.1; let i = 0; while (x < len / 2 - 0.12) { const bw = kind === 'jars' ? 0.12 : 0.04 + hash(p.x, r, i) * 0.06; const bh = kind === 'jars' ? 0.2 : 0.24 + hash(p.y, i, r) * 0.1; const c = kind === 'jars' ? pick(['#d9c48a', '#c98a4a', '#e8e0cf', '#a8603a'], hash(i, r, 7)) : pick(['#a8483a', '#3f6a8a', '#c9a43a', '#4f7f4f', '#7a4a7a', '#d9d2c0', '#5a4a3a'], hash(i, r, 9)); m.box(bw, bh, 0.28, c, x + bw / 2, 0.36 + r * 0.42, 0.07); x += bw + (kind === 'jars' ? 0.05 : 0.005); i++; } }
  }));
  if (!along) inner.rotation.y = Math.PI / 2;
  return done(group(w / 2, 0, h / 2, inner));
}

export function cabinet(p) {
  const w = p.w || 1; const h = p.h || 1;
  const c = col(p, pick(['#8a8f94', '#7a6a52', '#6f7a84'], rnd(p)), 0.3);
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 1.4, h - 0.3, c, 0, 0, 0));
  const n = Math.max(1, Math.round(w - 0.2));
  for (let j = 0; j < n; j++) for (let i = 0; i < 3; i++) { const x = -w / 2 + 0.1 + (j + 0.5) * ((w - 0.2) / n); g.add(bx((w - 0.2) / n - 0.1, 0.03, 0.02, shade(c, -45), x, 0.08 + i * 0.42, (h - 0.3) / 2 + 0.01, { cast: false }), bx(0.18, 0.04, 0.03, '#d0d0d0', x, 0.28 + i * 0.42, (h - 0.3) / 2 + 0.02, { cast: false })); }
  return done(g);
}

export function toolrack(p) {
  const [w, h] = size(p, 2, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 1.1, 0.08, '#6a4a30', 0, 0.7, -0.4), bx(w - 0.1, 0.06, 0.2, '#5a3e28', 0, 0.62, -0.32), bx(w - 0.1, 0.06, 0.2, '#5a3e28', 0, 1.3, -0.32), bx(w - 0.2, 0.5, 0.4, '#4a5a6a', 0, 0, -0.1), bx(w - 0.2, 0.04, 0.42, '#3a4a5a', 0, 0.5, -0.1));
  for (let i = 0; i < w * 3; i++) { const x = -w / 2 + 0.25 + i * (w - 0.5) / (w * 3 - 1); g.add(bx(0.05, 0.4 + (i % 3) * 0.1, 0.04, i % 2 ? STEEL : '#b8402e', x, 0.8, -0.34, { rz: (i % 3 - 1) * 0.08, cast: false }), bx(0.12, 0.08, 0.04, i % 2 ? '#8a6a48' : STEEL, x, 1.2 + (i % 2) * 0.05, -0.34, { cast: false }));
  }
  return done(g);
}

export function gunrack(p) {
  const [w, h] = size(p, 2, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 1.5, 0.1, '#3a2c20', 0, 0, -0.4), bx(w - 0.1, 0.07, 0.24, '#2a2018', 0, 0.45, -0.3), bx(w - 0.1, 0.07, 0.24, '#2a2018', 0, 1.15, -0.3), bx(w - 0.1, 0.3, 0.3, '#4a3a2c', 0, 0, -0.2));
  for (let i = 0; i < w * 2; i++) { const x = -w / 2 + 0.3 + i * (w - 0.6) / (w * 2 - 1); g.add(bx(0.05, 1.1, 0.05, '#2a2c30', x, 0.4, -0.28, { cast: false }), bx(0.07, 0.4, 0.07, '#6a4a2e', x, 0.4, -0.28, { cast: false })); }
  return done(g);
}

export function workbench(p) {
  const [w, h] = size(p, 3, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.04, 0.1, 0.8, '#8a6a48', 0, 0.8, 0), bx(w - 0.2, 0.05, 0.7, '#6a4a30', 0, 0.25, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bx(0.1, 0.8, 0.1, IRON, sx * (w / 2 - 0.14), 0, sz * 0.32));
  g.add(bx(0.3, 0.22, 0.22, '#b8402e', -w / 2 + 0.5, 0.9, -0.1), bx(0.5, 0.05, 0.1, STEEL, 0.1, 0.9, 0.1, { ry: 0.5 }), cy(0.1, 0.22, BRASS, w / 2 - 0.4, 0.9, 0, { seg: 8 }), bx(0.35, 0.18, 0.3, '#4a5a6a', 0, 0.9, -0.2));
  return done(g);
}

export function lectern(p) {
  return done(group((p.w || 1) / 2, 0, 0.5, bx(0.2, 0.9, 0.2, '#6a4a30', 0, 0, 0), bx(0.5, 0.1, 0.4, '#5a3e28', 0, 0, 0), bx(0.56, 0.05, 0.44, '#7a5638', 0, 0.98, 0, { rx: -0.35 }), bx(0.3, 0.02, 0.2, '#f4f1e4', 0, 1.04, 0.0, { rx: -0.35, cast: false })));
}

export function display(p) {
  const w = p.w || 2; const guns = p.variant === 'guns';
  const g = group(w / 2, 0, 0.5, bx(w - 0.1, 0.62, 0.56, '#7d5a3c'), bx(w - 0.14, 0.5, 0.52, glass('#bfe0ea', 0.3), 0, 0.62, 0, { cast: false }), bx(w - 0.1, 0.05, 0.58, '#5a4030', 0, 1.12, 0));
  if (guns) { for (let i = 0; i < Math.max(2, w - 0.5); i++) g.add(bx(0.7, 0.05, 0.05, '#2a2c30', -w / 2 + 0.5 + i * 0.9, 0.7, 0.05, { cast: false }), bx(0.28, 0.07, 0.07, '#6a4a2e', -w / 2 + 0.2 + i * 0.9, 0.67, 0.05, { cast: false })); }
  else g.add(vmesh((m) => { for (let i = 0; i < w * 3; i++) m.box(0.15, 0.1, 0.15, pick(['#c98a4a', '#e8c88a', '#a8603a', '#f0d8b0'], hash(i, p.x, 3)), -w / 2 + 0.25 + i * (w - 0.5) / (w * 3 - 1), 0.64, (i % 2) * 0.16 - 0.08); }));
  return done(g);
}

export function chest(p) {
  return done(group(0.5, 0, 0.5, bx(0.7, 0.4, 0.46, '#7a5638'), bx(0.72, 0.16, 0.48, '#6a482e', 0, 0.4, 0), bx(0.74, 0.06, 0.1, BRASS, 0, 0.3, 0.2, { cast: false }), bx(0.08, 0.14, 0.06, BRASS, 0, 0.34, 0.25, { cast: false }), bx(0.06, 0.58, 0.5, IRON, -0.22, 0, 0, { cast: false }), bx(0.06, 0.58, 0.5, IRON, 0.22, 0, 0, { cast: false })));
}

export function rug(p) {
  const [w, h] = size(p, 2, 2);
  const c = col(p, pick(['#8a3f3a', '#3f5a7a', '#6a5a3a', '#4f6a4a'], rnd(p)), 0.15);
  const g = group(0, 0, 0, flat(w - 0.1, h - 0.1, c, w / 2, h / 2, 0.012), flat(w - 0.3, h - 0.3, shade(c, 28), w / 2, h / 2, 0.016), flat(w - 0.45, h - 0.45, c, w / 2, h / 2, 0.02));
  const d = Math.min(w, h) * 0.22;
  g.add(flat(d * 1.4, d * 1.4, '#d9c48a', w / 2, h / 2, 0.025, { ry: Math.PI / 4 }), flat(d, d, c, w / 2, h / 2, 0.03, { ry: Math.PI / 4 }));
  return done(g);
}

export function window_(p, ctx) {
  const lit = night(ctx);
  const g = onWall(p, ctx, (L) => {
    const fw = Math.max(0.6, L - 0.2);
    const out = [bx(fw, 0.9, 0.06, '#5a4030', 0, 1.0, -0.02), bx(fw - 0.14, 0.76, 0.04, lit ? '#22304e' : '#9fd0e4', 0, 1.07, 0.02, lit ? { emissive: '#22304e', ei: 0.4 } : { emissive: '#7aa8c0', ei: 0.35 }), bx(0.05, 0.76, 0.05, '#5a4030', 0, 1.07, 0.04), bx(fw - 0.14, 0.05, 0.05, '#5a4030', 0, 1.42, 0.04), bx(fw + 0.1, 0.06, 0.14, '#7a5840', 0, 0.94, 0.05),
      bx(0.14, 0.78, 0.04, '#c86b6b', -fw / 2 + 0.12, 1.06, 0.05, { cast: false }), bx(0.14, 0.78, 0.04, '#c86b6b', fw / 2 - 0.12, 1.06, 0.05, { cast: false })];
    if (L > 1.5) for (let i = 1; i < Math.round(L); i++) out.push(bx(0.05, 0.76, 0.05, '#5a4030', -fw / 2 + i * fw / Math.round(L), 1.07, 0.04));
    return out;
  });
  return done(g);
}

export function painting(p, ctx) {
  const art = p.art || pick(['landscape', 'seascape', 'abstract'], rnd(p));
  const g = onWall(p, ctx, (L) => {
    const fw = Math.max(0.5, L - 0.2); const fh = Math.min(0.8, fw * 0.7);
    const y = 1.2;
    const o = [bx(fw, fh, 0.06, '#b8892e', 0, y, -0.01), bx(fw - 0.12, fh - 0.12, 0.03, '#8ab4d0', 0, y + 0.06, 0.03)];
    const iw = fw - 0.12; const ih = fh - 0.12;
    if (art === 'landscape') o.push(bx(iw, ih * 0.38, 0.035, '#5a8a4a', 0, y + 0.06, 0.035), bx(0.12, 0.12, 0.04, '#f2e080', iw * 0.25, y + ih * 0.6, 0.04, { cast: false }));
    else if (art === 'seascape') o.push(bx(iw, ih * 0.45, 0.035, '#2a5a8a', 0, y + 0.06, 0.035), bx(0.04, 0.22, 0.04, '#e8e4dc', -iw * 0.1, y + ih * 0.35, 0.045, { cast: false }), bx(0.18, 0.14, 0.04, '#e8e4dc', -iw * 0.1 + 0.1, y + ih * 0.4, 0.045, { cast: false }));
    else o.push(bx(iw, ih, 0.035, '#2a4a6a', 0, y + 0.06, 0.035), bx(iw * 0.4, ih * 0.5, 0.04, '#c8402e', -iw * 0.15, y + 0.12, 0.045), bx(iw * 0.25, ih * 0.7, 0.04, '#e8c84a', iw * 0.2, y + 0.1, 0.05));
    return o;
  });
  return done(g);
}

export function floorlamp(p, ctx) {
  const on = night(ctx) || Boolean(p.glow) || true;
  const c = col(p, '#f2e2b8', 0.1);
  const shadeMat = mat(c, { emissive: '#ffd58a', ei: 1.1 });
  const g = group(0.5, 0, 0.5, cy(0.15, 0.04, '#2a3a2a', 0, 0, 0, { seg: 10 }), cy(0.03, 1.4, BRASS, 0, 0.04, 0, { seg: 5 }), cy(0.2, 0.3, shadeMat, 0, 1.35, 0, { rt: 0.13, seg: 10, cast: false }), cy(0.05, 0.03, '#2a3a2a', 0, 1.64, 0, { seg: 6 }));
  void on;
  return done(g, { lights: [{ x: 0.5, y: 1.5, z: 0.5, color: '#ffd090', intensity: 4, distance: 6 }] });
}

export function stairs(p) {
  const g = group(0.5, 0, 0.5, cy(0.07, 2.3, IRON, 0, 0, 0, { seg: 6 }));
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; g.add(bx(0.4, 0.06, 0.16, i % 2 ? '#8a6a48' : '#9a7a56', Math.cos(a) * 0.24, 0.12 + i * 0.25, Math.sin(a) * 0.24, { ry: -a })); }
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; g.add(bx(0.03, 0.4, 0.03, IRON, Math.cos(a) * 0.46, 0.18 + i * 0.25, Math.sin(a) * 0.46, { cast: false })); }
  return done(g);
}

export function vault(p) {
  const w = p.w || 1;
  return done(group(w / 2, 0, 0.5, bx(w - 0.06, 1.7, 0.84, '#6a7078'), bx(w - 0.16, 1.55, 0.04, '#7c838b', 0, 0.08, 0.43, { cast: false }), cyz(0.34, 0.1, '#8d9297', 0, 0.85, 0.46, { seg: 16 }), cyz(0.1, 0.16, BRASS, 0, 0.85, 0.5, { seg: 10 }), bx(0.05, 0.5, 0.05, BRASS, 0.0, 0.85, 0.56, { cast: false }), bx(0.5, 0.05, 0.05, BRASS, 0, 0.85, 0.56, { cast: false }), bx(0.14, 0.28, 0.06, '#44484e', w / 2 - 0.2, 1.1, 0.46, { cast: false }), bx(0.1, 0.1, 0.1, '#2a2c30', -w / 2 + 0.15, 1.7, 0.1)));
}

export function lift(p, ctx) {
  const g = group(0.5, 0, 0.5, bx(1.0, 2.2, 0.16, '#6a7078', 0, 0, -0.38), bx(0.4, 1.9, 0.04, '#a8aeb4', -0.2, 0.05, -0.28, { cast: false }), bx(0.4, 1.9, 0.04, '#9aa0a8', 0.15, 0.05, -0.28, { cast: false }), bx(0.03, 1.9, 0.05, '#3a3e44', -0.025, 0.05, -0.285, { cast: false }), bx(0.8, 0.2, 0.08, '#2a2c30', 0, 2.0, -0.28, { cast: false }), bx(0.12, 0.06, 0.02, '#ffb02e', 0, 2.07, -0.235, { emissive: '#ffb02e', ei: 1.6, cast: false }), bx(0.1, 0.3, 0.04, '#44484e', 0.4, 1.0, -0.3), bx(0.05, 0.05, 0.02, '#ffb02e', 0.4, 1.1, -0.27, { emissive: '#ffb02e', ei: 1.2, cast: false }));
  return done(g);
}

export function vent(p) {
  const g = group(0.5, 0, 0.5, flat(0.7, 0.7, '#4a4e56', 0, 0, 0.012));
  for (let i = -2; i <= 2; i++) g.add(bx(0.62, 0.025, 0.05, '#2a2c32', 0, 0.02, i * 0.12, { cast: false }));
  g.add(bx(0.74, 0.03, 0.05, '#6a6e76', 0, 0.01, 0.36), bx(0.74, 0.03, 0.05, '#6a6e76', 0, 0.01, -0.36), bx(0.05, 0.03, 0.74, '#6a6e76', 0.36, 0.01, 0), bx(0.05, 0.03, 0.74, '#6a6e76', -0.36, 0.01, 0));
  return done(g);
}

export function engine(p) {
  return done(oriented(p, 2, 1, (L, D) => [bx(L - 0.2, 0.15, D - 0.2, '#4a4e56', 0, 0, 0), bx(L - 0.5, 0.55, D - 0.35, '#6a7a6a', 0, 0.15, 0), bx(L - 0.7, 0.12, D - 0.45, '#5a6a5a', 0, 0.7, 0), ...[-0.4, -0.15, 0.1, 0.35].map((x) => cy(0.08, 0.28, '#a8aeb4', x * (L / 2), 0.82, 0, { seg: 8 })), cyx(0.18, 0.2, '#3a3e44', -L / 2 + 0.25, 0.42, 0, { seg: 10 }), cyx(0.05, 0.8, '#8a6a48', L / 2 - 0.25, 0.5, D / 2 - 0.2, { seg: 6 }), bx(0.12, 0.12, 0.12, RED, L * 0.28, 0.72, -0.1)]));
}

export function scrap(p) {
  const [w, h] = size(p, 1, 1);
  const g = group(0, 0, 0);
  for (let i = 0; i < w * h * 3; i++) {
    const k = hash(p.x, p.y, i); const x = 0.25 + (k * 0.5 + i * 0.37) % (w - 0.5); const z = 0.25 + hash(i, p.y, 3) * (h - 0.5);
    if (i % 3 === 0) g.add(bx(0.4, 0.3, 0.3, '#7a7a74', x, 0, z, { ry: k * 3 }));
    else if (i % 3 === 1) g.add(cy(0.17, 0.4, '#8a4a3a', x, 0, z, { seg: 8 }));
    else g.add(bx(0.5, 0.06, 0.2, '#6a5a4a', x, 0.3, z, { ry: k * 2, rz: 0.2 }), bx(0.1, 0.5, 0.1, '#5a5a5e', x + 0.1, 0, z, { rz: 0.3 }));
  }
  return done(g);
}

export function wallcrack(p, ctx) {
  return done(onWall(p, ctx, () => [bx(0.08, 0.5, 0.03, '#26221e', 0, 0.9, 0, { rz: 0.2, cast: false }), bx(0.06, 0.4, 0.03, '#26221e', 0.07, 1.25, 0, { rz: -0.4, cast: false }), bx(0.05, 0.35, 0.03, '#26221e', -0.06, 1.35, 0, { rz: 0.5, cast: false }), bx(0.18, 0.1, 0.02, '#4a443c', 0, 0.82, 0, { cast: false })]));
}
export function loosebrick(p, ctx) {
  return done(onWall(p, ctx, () => [bx(0.28, 0.14, 0.1, '#a8603a', 0, 0.7, 0), bx(0.3, 0.02, 0.02, '#26221e', 0, 0.84, 0.05, { cast: false })]));
}

export function cellbars(p, ctx) {
  return run(p, ctx, (m) => {
    const g = group();
    const x0 = m & 8 ? 0 : 0.05; const x1 = m & 2 ? 1 : 0.95; const z0 = m & 1 ? 0 : 0.05; const z1 = m & 4 ? 1 : 0.95;
    const ns = (m & 5) && !(m & 10);
    const [a, b] = ns ? [z0, z1] : [x0, x1];
    g.add(ns ? bx(0.08, 0.08, b - a, '#2a2c32', 0.5, 2.0, (a + b) / 2) : bx(b - a, 0.08, 0.08, '#2a2c32', (a + b) / 2, 2.0, 0.5), ns ? bx(0.08, 0.08, b - a, '#2a2c32', 0.5, 0.08, (a + b) / 2) : bx(b - a, 0.08, 0.08, '#2a2c32', (a + b) / 2, 0.08, 0.5));
    for (let t = 0.1; t < 1; t += 0.2) { const u = a + t * (b - a); g.add(ns ? bx(0.04, 1.9, 0.04, '#3a3d44', 0.5, 0.1, u) : bx(0.04, 1.9, 0.04, '#3a3d44', u, 0.1, 0.5)); }
    return g;
  });
}

export function item(p) {
  const g = group(0.5, 0, 0.5, bx(0.34, 0.2, 0.26, '#8a6a42', 0, 0, 0, { ry: 0.3 }), bx(0.36, 0.04, 0.08, '#c8402e', 0, 0.1, 0, { ry: 0.3, cast: false }), bl(0.05, '#fff2b0', 0.12, 0.34, 0.0, { detail: 0, emissive: '#ffe48a', ei: 2, cast: false }));
  return done(g);
}

export function board(p, ctx) {
  const w = p.w || 1;
  const g = onWall(p, ctx, (L) => {
    const bw = Math.min(1.2, L + 0.1);
    const o = [bx(bw, 0.8, 0.06, '#8a6142', 0, 0.9, -0.02), bx(bw - 0.12, 0.68, 0.05, '#d9c9a0', 0, 0.96, 0.02, { cast: false })];
    for (let i = 0; i < 5; i++) o.push(bx(0.2, 0.26, 0.03, pick(['#6a8ac0', '#f2efe6', '#f2e6a0', '#f0c8c0'], hash(i, 4, p.x)), -bw / 2 + 0.22 + (i % 3) * 0.3, 1.15 - Math.floor(i / 3) * 0.32, 0.05, { cast: false }));
    return o;
  });
  void w;
  return done(g);
}

export function terminal(p) {
  const [w, h] = size(p, 2, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.07, 0.7, '#6a6e76', 0, 0.74, 0), bx(0.06, 0.74, 0.62, '#4a4e56', -w / 2 + 0.1, 0, 0), bx(0.06, 0.74, 0.62, '#4a4e56', w / 2 - 0.1, 0, 0), bx(0.5, 0.36, 0.1, '#22262c', 0, 0.9, -0.15), bx(0.44, 0.28, 0.02, '#5ac08a', 0, 0.94, -0.095, { emissive: '#5ac08a', ei: 0.9, cast: false }), bx(0.14, 0.1, 0.12, '#22262c', 0, 0.81, -0.15), bx(0.4, 0.03, 0.14, '#2a2c30', 0, 0.81, 0.1));
  if (w >= 2) g.add(bx(0.4, 0.5, 0.36, '#3a3e44', w / 2 - 0.4, 0.0, -0.05), bx(0.2, 0.06, 0.02, '#ffb02e', w / 2 - 0.4, 0.4, 0.14, { emissive: '#ffb02e', ei: 1.5, cast: false }));
  return done(g);
}

export function lumber(p) {
  return done(oriented(p, 2, 1, (L, D) => { const o = [bx(0.1, 0.12, D - 0.1, '#5a4a38', -L / 2 + 0.3, 0, 0), bx(0.1, 0.12, D - 0.1, '#5a4a38', L / 2 - 0.3, 0, 0), bx(0.1, 0.12, D - 0.1, '#5a4a38', 0, 0, 0)]; for (let i = 0; i < 6; i++) o.push(bx(L - 0.1, 0.12, D / 6 - 0.012, i % 2 ? '#c9a070' : '#b8905e', 0, 0.12, -D / 2 + 0.05 + (i + 0.5) * (D - 0.1) / 6)); for (let i = 0; i < 5; i++) o.push(bx(L - 0.14, 0.12, D / 5 - 0.012, i % 2 ? '#b8905e' : '#c9a070', 0, 0.26, -D / 2 + 0.08 + (i + 0.5) * (D - 0.16) / 5)); o.push(bx(L - 0.3, 0.12, D - 0.3, '#c9a070', 0, 0.4, 0)); return o; }));
}
export function bricks(p) {
  return done(oriented(p, 2, 1, (L, D) => { const o = [bx(L - 0.1, 0.1, D - 0.1, '#7a5a3a', 0, 0, 0)]; for (let r = 0; r < 4; r++) o.push(bx(L - 0.2 - (r % 2) * 0.1, 0.18, D - 0.24, r % 2 ? '#a8603a' : '#b8703f', 0, 0.1 + r * 0.19, 0), bx(L - 0.18, 0.02, 0.02, '#8a8a82', 0, 0.28 + r * 0.19, D / 2 - 0.12, { cast: false })); return o; }));
}
export function mixer(p) {
  const g = group(0.5, 0, 0.5, bx(0.5, 0.12, 0.6, '#4a5a6a', 0, 0.28, 0), bx(0.06, 0.5, 0.06, '#3a4a5a', -0.2, 0.2, 0.2), bx(0.06, 0.5, 0.06, '#3a4a5a', 0.2, 0.2, 0.2), cyx(0.1, 0.1, IRON, -0.25, 0.1, 0.3, { seg: 8 }), cyx(0.1, 0.1, IRON, 0.25, 0.1, 0.3, { seg: 8 }));
  const drum = group(0, 0.75, 0, cy(0.3, 0.38, '#c8a43a', 0, -0.1, 0, { seg: 12, rt: 0.2 }), cy(0.3, 0.3, '#c8a43a', 0, -0.4, 0, { seg: 12, rt: 0.2 }), cy(0.18, 0.12, '#3a3e44', 0, 0.26, 0, { seg: 10 }), cy(0.31, 0.04, '#6a5a2a', 0, -0.1, 0, { seg: 12 }));
  drum.rotation.z = 0.5; drum.position.set(0, 0.75, -0.02);
  g.add(drum, bx(0.2, 0.3, 0.1, '#c8402e', 0.0, 0.2, -0.28));
  return done(g);
}

export function lamp_mechanism(p) {
  const [w, h] = size(p, 2, 2);
  const lens = group(0, 0, 0, cy(0.5, 1.0, glass('#f2e2b8', 0.7), 0, 0, 0, { seg: 12, rt: 0.42, emissive: '#ffd58a', ei: 0.9 }), cy(0.1, 0.9, '#fff4cf', 0, 0.05, 0, { seg: 8, emissive: '#fff4cf', ei: 2 }), cy(0.56, 0.08, BRASS, 0, -0.04, 0, { seg: 12 }), cy(0.46, 0.08, BRASS, 0, 1.0, 0, { seg: 12 }));
  const g = group(w / 2, 0, h / 2, cy(0.7, 0.2, '#4a4e56', 0, 0, 0, { seg: 12 }), cy(0.5, 0.7, '#6a5a3a', 0, 0.2, 0, { seg: 12 }), cy(0.58, 0.06, BRASS, 0, 0.9, 0, { seg: 12 }), cn(0.52, 0.34, '#8a3a2a', 0, 2.1, 0, { seg: 12 }), bx(0.06, 0.4, 0.06, BRASS, 0, 2.4, 0), bx(0.5, 0.45, 0.3, '#2a2e34', -0.6, 0.2, 0.5));
  done(g);
  const turn = group(0, 0.96, 0, lens); g.add(turn);
  g.userData.update = (q, c) => { turn.rotation.y = clockOf(c) * 0.8; };
  g.userData.lights = [{ x: w / 2, y: 1.5, z: h / 2, color: '#ffe0a0', intensity: 3, distance: 6 }];
  return g;
}

export const BUILDERS = { lamp_mechanism, bed, cot, wardrobe, desk, table, chair, counter, stove, oven, shelf, cabinet, toolrack, gunrack, workbench, lectern, display, chest, rug, window: window_, painting, floorlamp, stairs, vault, lift, vent, engine, scrap, wallcrack, loosebrick, cellbars, item, board, terminal, lumber, bricks, mixer };
