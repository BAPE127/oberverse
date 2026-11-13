// The farm town of Lariat and Chuckie's Cheese: towers, silos, mills, machines, crops, the ranch fences.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, oriented, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS } from './kit.js';

export function ranchfence(p, ctx) {
  const post = (g) => g.add(bx(0.13, 1.0, 0.13, '#7b6248', 0.5, 0, 0.5), bx(0.17, 0.04, 0.17, '#5e4228', 0.5, 1.0, 0.5));
  return run(p, ctx, (m) => {
    const a = arms(m, p);
    const g = group();
    if (a.ew) for (const y of [0.4, 0.74]) g.add(bx(a.x1 - a.x0, 0.09, 0.05, '#8f7556', (a.x0 + a.x1) / 2, y, 0.5));
    if (a.ns) for (const y of [0.4, 0.74]) g.add(bx(0.05, 0.09, a.z1 - a.z0, '#8f7556', 0.5, y, (a.z0 + a.z1) / 2));
    if (a.end || ((p.x + p.y) % 3) === 0) post(g);
    return g;
  });
}
export function ranchgate(p, ctx) {
  const [w, h] = size(p, 6, 2);
  const t = plate(ctx, p.text || 'LARIAT', { bg: '#e6dcc3', fg: '#2a2420', border: '#2a2420', h: 80, font: 'bold 46px Georgia, serif' });
  const tw = Math.min(w - 2, 0.55 * t.aspect + 0.2);
  const z = h - 0.5;
  const g = group(0, 0, 0, bx(w - 0.2, 0.3, 0.32, '#5a3e26', w / 2, 2.4, z), bx(w - 0.2, 0.08, 0.34, '#6e4e30', w / 2, 2.7, z, { cast: false }), bx(0.03, 0.4, 0.03, IRON, w / 2 - tw / 2 + 0.1, 1.95, z), bx(0.03, 0.4, 0.03, IRON, w / 2 + tw / 2 - 0.1, 1.95, z),
    bx(tw, 0.58, 0.07, '#2a2420', w / 2, 1.78, z), panel(tw - 0.06, 0.52, t.material, w / 2, 1.8, z + 0.045, { cast: false }), panel(tw - 0.06, 0.52, mat('#e6dcc3'), w / 2, 1.8, z - 0.045, { cast: false, ry: Math.PI }));
  for (let k = 0; k < 6; k++) g.add(bx(Math.max(0.2, w - 2.4), 0.03, 0.07, '#2a2c32', w / 2, 0.0, z - 0.1 + k * 0.1 - 0.25, { cast: false }));
  return done(g);
}

export function haybale(p) {
  const k = rnd(p);
  const g = group(0.5, 0, 0.5, cyx(0.42, 0.8, '#d8b860', 0, 0.44, 0, { seg: 14 }), cyx(0.43, 0.04, '#b89840', -0.2, 0.44, 0, { seg: 14 }), cyx(0.43, 0.04, '#b89840', 0.2, 0.44, 0, { seg: 14 }), cyx(0.435, 0.03, '#8a7a50', 0, 0.44, 0, { seg: 14 }));
  g.rotation.y = Math.floor(k * 2) * Math.PI / 2;
  return done(g);
}

export function trough(p) {
  return done(oriented(p, 2, 1, (L, D) => [bx(L - 0.1, 0.4, D - 0.3, '#7a7e86', 0, 0, 0), bx(L - 0.24, 0.05, D - 0.44, '#4a8ab0', 0, 0.34, 0, { cast: false }), bx(0.08, 0.45, D - 0.2, '#6a6e76', -L / 2 + 0.1, 0, 0), bx(0.08, 0.45, D - 0.2, '#6a6e76', L / 2 - 0.1, 0, 0), bx(0.12, 0.08, 0.1, '#5a9a4a', 0.3, 0.4, 0.05, { cast: false })]));
}

export function silo(p) {
  const [w, h] = size(p, 2, 3);
  const r = Math.min(w, h) / 2 - 0.08; const c = typeof p.color === 'string' ? mute(p.color, 0.25) : '#c2c6c9';
  const g = group(w / 2, 0, h / 2, cy(r + 0.06, 0.25, '#8a8e92', 0, 0, 0, { seg: 18 }), cy(r, 4.6, c, 0, 0.2, 0, { seg: 18 }), dome(r, shade(c, -14), 0, 4.8, 0, { seg: 18 }), cn(0.12, 0.25, '#7a7e82', 0, 5.7, 0, { seg: 6 }));
  for (let i = 1; i < 5; i++) g.add(cy(r + 0.02, 0.07, shade(c, -26), 0, i * 0.9, 0, { seg: 18 }));
  g.add(bx(0.14, 4.8, 0.05, '#6a6e72', 0, 0.2, r + 0.03), bx(0.5, 0.35, 0.3, '#8a8e92', r * 0.6, 0.2, r * 0.7));
  for (let i = 0; i < 8; i++) g.add(bx(0.22, 0.03, 0.03, IRON, 0, 0.5 + i * 0.52, r + 0.07, { cast: false }));
  return done(g);
}

export function watertower(p, ctx) {
  const [w, h] = size(p, 4, 5);
  const t = plate(ctx, 'LARIAT', { bg: '#c8ccd2', fg: '#7a2a24', h: 70, font: 'bold 46px Georgia, serif' });
  const g = group(w / 2, 0, h / 2);
  const lx = Math.min(w, h) * 0.3;
  for (const [x, z] of [[-lx, -lx], [lx, -lx], [lx, lx], [-lx, lx]]) g.add(cy(0.07, 5.3, '#6a7078', x, 0, z, { seg: 5 }));
  for (const y of [1.2, 2.6, 4.0]) {
    g.add(bx(2 * lx, 0.05, 0.05, '#6a7078', 0, y, -lx), bx(2 * lx, 0.05, 0.05, '#6a7078', 0, y, lx), bx(0.05, 0.05, 2 * lx, '#6a7078', -lx, y, 0), bx(0.05, 0.05, 2 * lx, '#6a7078', lx, y, 0));
  }
  for (const y of [0.0, 1.4, 2.8]) { g.add(bx(0.04, 1.5, 0.04, '#6a7078', 0, y, lx, { rz: 0.7 }), bx(0.04, 1.5, 0.04, '#6a7078', 0, y, lx, { rz: -0.7 })); }
  g.add(cy(0.9, 0.12, '#8a8e96', 0, 5.3, 0, { seg: 16 }), cy(0.9, 1.5, '#c8ccd2', 0, 5.4, 0, { seg: 16 }), cn(0.95, 0.7, '#9aa0a8', 0, 6.9, 0, { seg: 16 }), cy(0.92, 0.06, '#8a8e96', 0, 6.0, 0, { seg: 16 }), cy(0.92, 0.06, '#8a8e96', 0, 5.7, 0, { seg: 16 }), bx(0.05, 1.7, 0.05, IRON, 0.7, 4.0, 0.7));
  g.add(panel(1.2, 0.5, t.material, 0, 5.8, 0.93, { cast: false }));
  return done(g);
}

export function windmill(p) {
  const [w, h] = size(p, 3, 4);
  const hub = group(0, 5.6, 0.45);
  for (let i = 0; i < 12; i++) { const b = bx(0.2, 0.9, 0.02, '#c8ccd2', 0, 0.12, 0, { double: true }); const a = group(0, 0, 0, b); a.rotation.z = i / 12 * 6.283; a.children[0].rotation.z = 0.15; hub.add(a); }
  hub.add(cy(0.08, 0.14, '#5a5e66', 0, 0, 0, { seg: 8, rx: Math.PI / 2 }), cy(0.5, 0.03, '#c8ccd2', 0, 0, 0, { seg: 12, rx: Math.PI / 2 }));
  const g = group(w / 2, 0, h / 2);
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]]) { g.add(cy(0.045, 5.7, '#7a7e86', x * 0.75, 0, z * 0.75, { seg: 5, rz: -x * 0.07, rx: z * 0.07 })); }
  for (let k = 0; k < 5; k++) { const s = 1.05 - k * 0.15; g.add(bx(2 * s * 0.75, 0.04, 0.04, '#7a7e86', 0, 0.6 + k * 1.05, s * 0.75), bx(2 * s * 0.75, 0.04, 0.04, '#7a7e86', 0, 0.6 + k * 1.05, -s * 0.75), bx(0.04, 0.04, 2 * s * 0.75, '#7a7e86', s * 0.75, 0.6 + k * 1.05, 0), bx(0.04, 0.04, 2 * s * 0.75, '#7a7e86', -s * 0.75, 0.6 + k * 1.05, 0)); }
  g.add(bx(0.3, 0.3, 0.8, '#8a8e96', 0, 5.5, 0.05), bx(0.04, 0.5, 0.9, RED, 0, 5.45, -0.7, { cast: false }), cy(0.02, 0.7, '#5a5e66', 0, 5.7, -0.35, { seg: 4, rx: Math.PI / 2 }));
  done(g);
  g.add(hub);
  g.userData.update = (q, c) => { hub.rotation.z = -clockOf(c) * 1.4; };
  return g;
}

export function tractor(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.25) : '#c8402a';
  const wheel = (r, x, z) => [cyz(r, 0.24, '#1a1a1e', x, r, z, { seg: 14 }), cyz(r * 0.45, 0.26, '#e8c04a', x, r, z, { seg: 10 })];
  return done(oriented(p, 3, 2, (L, D) => [
    bx(L * 0.62, 0.45, 0.62, col, L * 0.12, 0.55, 0), bx(L * 0.34, 0.55, 0.56, shade(col, 10), L * 0.28, 0.6, 0), bx(0.04, 0.4, 0.04, IRON, L * 0.4, 1.15, 0.0),
    bx(L * 0.3, 0.05, 0.7, shade(col, -30), -L * 0.2, 1.75, 0), bx(0.05, 0.75, 0.05, col, -L * 0.34, 1.0, 0.3), bx(0.05, 0.75, 0.05, col, -L * 0.34, 1.0, -0.3), bx(0.05, 0.75, 0.05, col, -L * 0.06, 1.0, 0.3), bx(0.05, 0.75, 0.05, col, -L * 0.06, 1.0, -0.3),
    bx(L * 0.28, 0.6, 0.58, glass('#9fc0d0', 0.5), -L * 0.2, 1.1, 0, { cast: false }), bx(0.4, 0.1, 0.7, IRON, L * 0.44, 0.45, 0),
    ...wheel(0.6, -L * 0.28, 0.5), ...wheel(0.6, -L * 0.28, -0.5), ...wheel(0.32, L * 0.32, 0.45), ...wheel(0.32, L * 0.32, -0.45)]));
}

export function crops(p) {
  const [w, h] = size(p, 2, 1);
  const stage = p.stage ?? 2;
  const g = group(0, 0, 0, bx(w - 0.1, 0.1, 0.3, '#8a6a44', w / 2, 0, h - 0.2));
  if (stage <= 0) return done(g);
  const ht = [0, 0.18, 0.42, 0.62][stage] || 0.5;
  const ripe = stage >= 3;
  const col = ripe && p.crop === 'wheat' ? '#c8a848' : '#4a8a3a';
  for (let x = 0.2; x < w - 0.1; x += 0.24) {
    const k = hash(p.x, p.y, Math.round(x * 10));
    g.add(bx(0.07, ht * (0.85 + k * 0.3), 0.07, col, x, 0.1, h - 0.2 + (k - 0.5) * 0.06));
    if (stage >= 2) g.add(bx(0.2, 0.05, 0.04, col, x, 0.1 + ht * 0.55, h - 0.2, { rz: 0.4 }));
    if (ripe) {
      const top = 0.1 + ht;
      if (p.crop === 'cotton') g.add(bl(0.08, '#f8f6f0', x, top, h - 0.2, { detail: 0 }));
      else if (p.crop === 'corn') g.add(bx(0.09, 0.2, 0.09, '#e8c04a', x + 0.05, top - 0.18, h - 0.2));
      else if (p.crop === 'sorghum') g.add(bl(0.08, '#a84a2a', x, top, h - 0.2, { detail: 0 }));
      else if (p.crop === 'wheat') g.add(bx(0.08, 0.2, 0.08, '#d8b850', x, top - 0.02, h - 0.2));
    }
  }
  return done(g);
}

export function milktank(p) {
  return done(oriented(p, 2, 2, (L, D) => {
    const R = Math.min(D, L) / 2 - 0.15;
    return [bx(0.12, 0.34, D - 0.4, '#55585e', -L / 2 + 0.3, 0, 0), bx(0.12, 0.34, D - 0.4, '#55585e', L / 2 - 0.3, 0, 0), cyx(R, L - 0.3, '#d6dadc', 0, R + 0.3, 0, { seg: 16 }), cyx(R * 1.02, 0.05, '#aab2b8', -L * 0.25, R + 0.3, 0, { seg: 16 }), cyx(R * 1.02, 0.05, '#aab2b8', L * 0.25, R + 0.3, 0, { seg: 16 }),
      cy(0.12, 0.1, '#9aa4b0', 0, R * 2 + 0.28, 0, { seg: 8 }), bx(0.3, 0.2, 0.05, '#2a3440', 0, R + 0.2, D / 2 - 0.2, { cast: false }), bx(0.18, 0.08, 0.05, '#4ade9a', -0.03, R + 0.22, D / 2 - 0.17, { cast: false, emissive: '#4ade9a', ei: 0.8 })];
  }));
}

export function milkstall(p) {
  const [w, h] = size(p, 2, 2);
  const g = group(0, 0, 0, bx(w - 0.2, 0.08, h - 0.3, '#9aa0a8', w / 2, 0, h / 2));
  for (const x of [0.15, w / 2, w - 0.15]) g.add(bx(0.06, 1.0, 0.06, '#cfd4da', x, 0, 0.2), bx(0.06, 1.0, 0.06, '#cfd4da', x, 0, h - 0.15));
  for (const y of [0.45, 0.9]) g.add(bx(w - 0.2, 0.05, 0.05, '#cfd4da', w / 2, y, 0.2), bx(w - 0.2, 0.05, 0.05, '#cfd4da', w / 2, y, h - 0.15), bx(0.05, 0.05, h - 0.4, '#cfd4da', 0.15, y, h / 2), bx(0.05, 0.05, h - 0.4, '#cfd4da', w - 0.15, y, h / 2));
  g.add(bx(0.4, 0.3, 0.3, '#2a3440', w / 2, 0.4, h - 0.3), bx(0.24, 0.06, 0.04, '#4ade9a', w / 2, 0.55, h - 0.14, { emissive: '#4ade9a', ei: 0.9, cast: false }), cy(0.14, 0.3, '#d6dadc', w * 0.22, 0.1, 0.4, { seg: 8 }));
  return done(g);
}

export function cheesevat(p) {
  const [w, h] = size(p, 3, 2);
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 0.5, h - 0.2, '#b8c0c8'), bx(w - 0.1, 0.1, h - 0.1, '#d8e0e6', 0, 0.5, 0), bx(w - 0.5, 0.08, h - 0.5, '#f2e6b8', 0, 0.58, 0, { cast: false }));
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) g.add(bx(0.12, 0.3, 0.12, IRON, x, 0, h / 2 - 0.2), bx(0.12, 0.3, 0.12, IRON, x, 0, -h / 2 + 0.2));
  g.add(bx(0.1, 0.1, w - 1, '#5a6068', 0, 0.82, 0, { ry: 0 }), bx(w - 1.2, 0.1, 0.1, '#5a6068', 0, 0.9, 0), bx(0.12, 0.35, 0.12, '#5a6068', -w / 2 + 0.6, 0.6, 0));
  for (let k = 0; k < 6; k++) g.add(bl(0.08, '#e8c85a', -w / 2 + 0.5 + hash(p.x, p.y, k) * (w - 1), 0.62, -h / 2 + 0.4 + hash(p.x, p.y, k + 9) * (h - 0.8), { detail: 0, cast: false }));
  return done(g);
}

export function cheesepress(p) {
  const [w, h] = size(p, 2, 2);
  const g = group(w / 2, 0, h / 2, bx(w - 0.3, 0.12, h - 0.3, '#6a7078'), bx(0.2, 1.5, 0.2, '#6a7078', -w / 2 + 0.3, 0.12, 0), bx(0.2, 1.5, 0.2, '#6a7078', w / 2 - 0.3, 0.12, 0), bx(w - 0.3, 0.2, 0.3, '#5a6068', 0, 1.5, 0), cy(0.1, 0.9, '#9aa4b0', 0, 0.75, 0, { seg: 8 }), cy(0.4, 0.2, '#b8c0c8', 0, 0.5, 0, { seg: 12 }),
    cy(0.44, 0.38, '#e8c04a', 0, 0.12, 0, { seg: 14 }), cy(0.45, 0.04, '#c8a03a', 0, 0.28, 0, { seg: 14 }), cy(0.2, 0.18, '#e8c04a', 0.3, 0.12, 0.5, { seg: 10 }));
  return done(g);
}

export function cheeserack(p) {
  const [w, h] = size(p, 6, 2);
  const g = group(0, 0, 0);
  for (let i = 0; i <= Math.round(w / 1.5); i++) g.add(bx(0.12, 1.8, h - 0.4, '#7a5a3a', 0.1 + i * (w - 0.2) / Math.round(w / 1.5), 0, h / 2));
  for (const y of [0.3, 0.85, 1.4]) { g.add(bx(w - 0.1, 0.06, h - 0.4, '#8a6a46', w / 2, y, h / 2)); for (let c = 0; c < w - 0.5; c += 0.62) for (const z of [h / 2 - 0.35, h / 2 + 0.35]) g.add(cy(0.27, 0.22, hash(c * 10, y * 10, z * 10) > 0.5 ? '#e8c04a' : '#dcb43c', 0.45 + c, y + 0.06, z, { seg: 12 })); }
  return done(g);
}

export const BUILDERS = { ranchfence, ranchgate, haybale, trough, silo, watertower, windmill, tractor, crops, milktank, milkstall, cheesevat, cheesepress, cheeserack };
