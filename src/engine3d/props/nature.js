// Plants, rocks, animals and ground cover.
import { bx, cy, cn, bl, cyx, cyz, flat, sphere, dome, glass, M, mat, shade, mix, mute, group, done, noBake, size, rnd, pick, night, clockOf, hash, strHash, run, arms, WOOD, DWOOD, IRON, CONC, RED } from './kit.js';

function leaf(p, def) { return typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? mute(p.color, 0.22) : def; }

export function tree(p) {
  const k = rnd(p, 1); const k2 = rnd(p, 2); const v = Math.floor(k * 3);
  const c = leaf(p, '#4f8a4a');
  const g = group(0.5, 0, 0.5);
  const lights = [shade(c, 14), c, shade(c, -16)];
  if (v === 0) { // tall and round
    g.add(cy(0.13, 1.1, '#5e4633', 0, 0, 0, { rt: 0.09, seg: 7 }), cy(0.2, 0.2, '#4e3a2a', 0, 0, 0, { rt: 0.13, seg: 7 }));
    g.add(bl(0.52, lights[1], 0, 1.4, 0, { seed: 1, sy: 1.0 }), bl(0.42, lights[2], 0.14, 1.15, 0.12, { seed: 2, sy: 1.0 }), bl(0.42, lights[2], -0.14, 1.2, -0.1, { seed: 3, sy: 1.0 }), bl(0.44, lights[0], 0.02, 1.9, 0, { seed: 0, sy: 1.0 }), bl(0.32, lights[0], 0.1, 2.35, 0.04, { seed: 1, sy: 1.0 }));
  } else if (v === 1) { // broad
    g.add(cy(0.14, 1.0, '#6b4a32', 0, 0, 0, { rt: 0.1, seg: 7 }), bx(0.06, 0.4, 0.06, '#6b4a32', 0.12, 0.8, 0, { rz: -0.7 }));
    g.add(bl(0.5, lights[2], 0, 1.2, 0, { seed: 2, sy: 0.85 }), bl(0.44, lights[1], 0.14, 1.5, 0.12, { seed: 1, sy: 0.9 }), bl(0.44, lights[1], -0.14, 1.45, -0.12, { seed: 3, sy: 0.9 }), bl(0.38, lights[0], 0.04, 1.85, -0.04, { seed: 0, sy: 0.9 }), bl(0.3, lights[0], -0.16, 1.8, 0.16, { seed: 2, sy: 0.9 }));
  } else { // poplar
    g.add(cy(0.1, 1.0, '#7a6a54', 0, 0, 0, { rt: 0.08, seg: 6 }));
    g.add(bl(0.46, lights[2], 0, 1.15, 0, { seed: 1, sy: 1.25 }), bl(0.42, lights[1], 0.04, 1.8, 0.03, { seed: 2, sy: 1.25 }), bl(0.34, lights[0], -0.03, 2.4, 0, { seed: 3, sy: 1.25 }), bl(0.22, lights[0], 0, 2.9, 0, { seed: 0, sy: 1.2 }));
  }
  void k2;
  return done(g);
}

export function pine(p) {
  const k = rnd(p, 3);
  const cols = ['#2f5d46', '#386b51', '#41795b'];
  const g = group(0.5, 0, 0.5, cy(0.1, 0.9, '#5a3d2a', 0, 0, 0, { seg: 6 }));
  const H = 3.3 + k * 0.8;
  for (let i = 0; i < 4; i++) { const r = 0.62 - i * 0.12; g.add(cn(r, 1.2, cols[i % 3], 0, 0.55 + i * (H - 1.5) / 4, 0, { seg: 7, flat: true })); }
  g.add(cn(0.08, 0.3, '#41795b', 0, H - 0.1, 0, { seg: 5 }));
  return done(g);
}

export function bush(p, ctx) {
  const c = leaf(p, pick(['#4a7f45', '#55864a', '#3f6e40'], rnd(p)));
  return run(p, ctx, (m, cx, cz, t) => {
    const g = group();
    const x0 = m & 8 ? 0 : 0.1; const x1 = m & 2 ? 1 : 0.9; const z0 = m & 1 ? 0 : 0.1; const z1 = m & 4 ? 1 : 0.9;
    g.add(bx(x1 - x0, 0.45, z1 - z0, shade(c, -14), (x0 + x1) / 2, 0, (z0 + z1) / 2));
    const k = hash(t.gx, t.gy, 7);
    g.add(bl(0.36, c, 0.3 + k * 0.1, 0.42, 0.35, { seed: 1, sy: 0.8 }), bl(0.34, shade(c, 12), 0.7 - k * 0.1, 0.4, 0.62, { seed: 2, sy: 0.8 }), bl(0.28, shade(c, 6), 0.5, 0.58, 0.5, { seed: 3, sy: 0.8 }));
    return g;
  });
}

export function flowerbed(p) {
  const [w, h] = size(p, 2, 1);
  const g = group(0, 0, 0, bx(w - 0.08, 0.16, h - 0.1, '#7a5a3e', w / 2, 0, h / 2), bx(w - 0.2, 0.08, h - 0.22, '#4a3a2c', w / 2, 0.16, h / 2));
  const n = Math.max(3, Math.round(w * h * 4));
  const cols = ['#e8556a', '#f2c84e', '#f4f1e4', '#c070d8', '#ee8a3a'];
  for (let i = 0; i < n; i++) {
    const x = 0.25 + hash(p.x, p.y, i) * (w - 0.5); const z = 0.22 + hash(p.x, p.y, i + 40) * (h - 0.44);
    g.add(bl(0.11, hash(i, 3) > 0.5 ? '#4e8a48' : '#5c9a50', x, 0.22, z, { detail: 0, sy: 0.9 }), bl(0.07, cols[(i + p.x) % 5], x + 0.03, 0.36, z, { detail: 0, cast: false }));
  }
  return done(g);
}

export function rock(p) {
  const k = rnd(p);
  return done(group(0.5, 0, 0.5, bl(0.4, '#84868b', 0, 0.34, 0, { sy: 0.7, seed: Math.floor(k * 4) }), bl(0.26, '#74767b', 0.28, 0.24, 0.12, { sy: 0.7, seed: 2 }), bl(0.18, '#92949a', -0.25, 0.18, -0.15, { sy: 0.7, seed: 1 })));
}

export function plant(p) {
  const k = rnd(p);
  const g = group(0.5, 0, 0.5, cy(0.2, 0.34, '#b8734a', 0, 0, 0, { rt: 0.26, seg: 9 }), cy(0.22, 0.04, '#8a5a3a', 0, 0.32, 0, { seg: 9 }));
  for (let i = 0; i < 5; i++) g.add(bl(0.17, pick(['#3f7a44', '#4f8f50', '#2f6a3a'], hash(p.x, p.y, i)), Math.cos(i * 1.3 + k * 6) * 0.14, 0.52 + i * 0.12, Math.sin(i * 1.3 + k * 6) * 0.14, { detail: 0, sy: 1.4 }));
  if (k > 0.6) g.add(bl(0.06, '#e8556a', 0.1, 1.05, 0.05, { detail: 0, cast: false }));
  return done(g);
}

export function stake(p, ctx) {
  const ph = rnd(p) * 6;
  const rib = noBake(bx(0.24, 0.11, 0.02, '#ff7a2a', 0.13, 0.55, 0, { double: true, cast: false }));
  const g = group(0.5, 0, 0.5, bx(0.06, 0.7, 0.06, '#a07a50'), bx(0.1, 0.04, 0.1, '#7a5a38', 0, 0.68, 0), rib);
  done(g);
  g.userData.update = (q, c) => { rib.rotation.y = Math.sin(clockOf(c) * 4 + ph) * 0.35; };
  return g;
}

export function trench(p) {
  const [w, h] = size(p, 2, 1);
  return done(group(0, 0, 0, flat(w - 0.1, h - 0.3, '#3a2a1c', w / 2, h / 2, 0.02), flat(w - 0.3, h - 0.5, '#241a12', w / 2, h / 2, 0.03), bx(w - 0.1, 0.14, 0.18, '#7a5a3a', w / 2, 0, 0.12), bx(w - 0.1, 0.14, 0.18, '#7a5a3a', w / 2, 0, h - 0.12), bx(0.5, 0.04, 0.12, WOOD, w * 0.3, 0.02, h / 2, { cast: false }), bx(0.12, 0.2, 0.12, '#d9c48a', 0.1, 0, 0.1), bx(0.12, 0.2, 0.12, '#d9c48a', w - 0.1, 0, h - 0.1)));
}

// ---- animals ---------------------------------------------------------------------------------------
export function cow(p) {
  const seed = p.seed || Math.round(rnd(p) * 100);
  const coat = typeof p.coat === 'string' ? mute(p.coat, 0.2) : '#f1ece0';
  const spot = typeof p.patches === 'string' ? mute(p.patches, 0.2) : '#3a3230';
  const body = group(0, 0, 0, bx(0.5, 0.48, 0.95, coat, 0, 0.42, 0), bx(0.34, 0.34, 0.34, coat, 0, 0.62, 0.6), bx(0.26, 0.17, 0.14, '#e8b8a8', 0, 0.6, 0.8), bx(0.06, 0.1, 0.06, '#e8e2d0', -0.13, 0.94, 0.62), bx(0.06, 0.1, 0.06, '#e8e2d0', 0.13, 0.94, 0.62), bx(0.04, 0.34, 0.04, coat, 0, 0.55, -0.5, { rx: 0.2 }),
    bx(0.14, 0.14, 0.14, '#e8b8a8', 0, 0.42, 0.0, { cast: false }));
  for (const [x, z] of [[-0.16, 0.34], [0.16, 0.34], [-0.16, -0.34], [0.16, -0.34]]) body.add(bx(0.12, 0.45, 0.12, shade(coat, -16), x, 0, z));
  for (let i = 0; i < 3; i++) body.add(bx(0.2 + hash(seed, i) * 0.12, 0.04, 0.22, spot, (hash(seed, i, 5) - 0.5) * 0.22, 0.9, -0.25 + i * 0.28, { cast: false }), bx(0.02, 0.2, 0.2, spot, i % 2 ? 0.255 : -0.255, 0.5, -0.2 + i * 0.2, { cast: false }));
  const g = group(0.5, 0, 0.5, body);
  body.scale.setScalar(0.7);
  body.rotation.y = Math.floor(hash(seed, 9) * 4) * Math.PI / 2;
  return done(g);
}

export function chicken(p) {
  const seed = p.seed || Math.round(rnd(p) * 100);
  const col = seed % 3 ? '#b8743a' : '#f2ece0';
  const body = group(0, 0, 0, bl(0.15, col, 0, 0.22, 0, { detail: 0, sy: 0.8 }), bl(0.09, col, 0.0, 0.38, 0.13, { detail: 0 }), bx(0.03, 0.05, 0.06, '#c8302a', 0, 0.44, 0.13, { cast: false }), bx(0.03, 0.03, 0.06, '#e8a83a', 0, 0.38, 0.22, { cast: false }), bx(0.08, 0.12, 0.04, shade(col, -30), 0, 0.28, -0.15, { rx: -0.5 }), bx(0.02, 0.1, 0.02, '#e8a83a', -0.05, 0.02, 0), bx(0.02, 0.1, 0.02, '#e8a83a', 0.05, 0.02, 0));
  body.rotation.y = hash(seed, 3) * 6.28;
  return done(group(0.5, 0, 0.5, body));
}

export function goat(p) {
  const seed = p.seed || Math.round(rnd(p) * 100);
  const col = seed % 2 ? '#e8e2d4' : '#9a7a5a';
  const body = group(0, 0, 0, bx(0.28, 0.3, 0.6, col, 0, 0.3, 0), bx(0.2, 0.22, 0.24, col, 0, 0.52, 0.34), bx(0.12, 0.06, 0.1, shade(col, -30), 0, 0.5, 0.48), bx(0.03, 0.14, 0.03, '#6a5a4a', -0.06, 0.72, 0.3, { rx: -0.3 }), bx(0.03, 0.14, 0.03, '#6a5a4a', 0.06, 0.72, 0.3, { rx: -0.3 }), bx(0.05, 0.1, 0.05, shade(col, -10), 0, 0.3, 0.46, { cast: false }), bx(0.05, 0.16, 0.05, col, 0, 0.45, -0.32, { rx: 0.7 }));
  for (const [x, z] of [[-0.08, 0.22], [0.08, 0.22], [-0.08, -0.22], [0.08, -0.22]]) body.add(bx(0.06, 0.3, 0.06, '#3a3028', x, 0, z));
  body.rotation.y = Math.floor(hash(seed, 4) * 4) * Math.PI / 2;
  return done(group(0.5, 0, 0.5, body));
}

export const BUILDERS = { tree, pine, bush, flowerbed, rock, plant, stake, trench, cow, chicken, goat };
