// The oil field, the factory floor and the building site.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, oriented, vmesh, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS } from './kit.js';

// ---- Ober's Oil ----------------------------------------------------------------------------------------
export function derrick(p) {
  const [w, h] = size(p, 2, 2);
  const H = 6.0;
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.3, h - 0.1, '#6d6258'));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const l = cy(0.05, H, IRON, sx * 0.45, 0.3, sz * 0.45, { seg: 5, rz: -sx * 0.085, rx: sz * 0.085 }); g.add(l); }
  for (let i = 1; i < 6; i++) { const s = 0.9 - i * 0.12; const y = 0.3 + i * 0.95; g.add(bx(2 * s, 0.04, 0.04, IRON, 0, y, s), bx(2 * s, 0.04, 0.04, IRON, 0, y, -s), bx(0.04, 0.04, 2 * s, IRON, s, y, 0), bx(0.04, 0.04, 2 * s, IRON, -s, y, 0)); g.add(bx(0.03, 0.9, 0.03, IRON, 0, y, s, { rz: 0.9, cast: false })); }
  g.add(bx(0.5, 0.3, 0.5, '#8a3a2e', 0, H + 0.05, 0), cy(0.07, H - 0.6, '#b3aa8e', 0, 0.3, 0, { seg: 6 }), bx(0.6, 0.4, 0.5, '#4a5a6a', 0.0, 0.3, 0.0), cy(0.12, 0.2, '#c8402e', 0, H + 0.35, 0, { seg: 6 }));
  return done(g, { lights: [{ x: w / 2, y: 5.8, z: h / 2, color: '#ffb060', intensity: 4, distance: 6 }] });
}

export function pumpjack(p) {
  const [w, h] = size(p, 2, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.2, 0.9, '#6d6258'), bx(0.14, 1.6, 0.12, IRON, 0.05, 0.2, 0.28, { rz: 0.12 }), bx(0.14, 1.6, 0.12, IRON, -0.25, 0.2, 0.28, { rz: -0.12 }), bx(0.14, 1.6, 0.12, IRON, 0.05, 0.2, -0.28, { rz: 0.12 }), bx(0.14, 1.6, 0.12, IRON, -0.25, 0.2, -0.28, { rz: -0.12 }), bx(0.5, 0.7, 0.5, '#4a5a6a', -0.6, 0.2, 0), cy(0.04, 1.4, STEEL, w / 2 - 0.25, 0.2, 0, { seg: 5 }), bx(0.3, 0.06, 0.3, IRON, w / 2 - 0.25, 0.2, 0));
  const beam = group(-0.1, 1.8, 0, bx(1.9, 0.18, 0.2, '#b8402e', 0.1, -0.09, 0), bx(0.3, 0.55, 0.28, '#b8402e', 1.0, -0.4, 0), bx(0.4, 0.4, 0.26, '#3c4046', -0.8, -0.35, 0));
  beam.traverse((o) => { o.userData.noBake = true; });
  done(g);
  g.add(beam);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { beam.rotation.z = Math.sin(clockOf(c) * 1.3 + ph) * 0.2; };
  return g;
}

export function tank(p, ctx) {
  const [w, h] = size(p, 2, 2);
  const r = Math.min(w, h) / 2 - 0.08; const hh = 2.4 + (strHash(p.x + ',' + p.y) % 3) * 0.3;
  const t = plate(ctx, "OBER'S OIL", { bg: '#c9cbc6', fg: '#8a2a20', h: 56, font: 'bold 34px "Trebuchet MS", sans-serif' });
  const g = group(w / 2, 0, h / 2, cy(r + 0.03, 0.1, '#7a7e82', 0, 0, 0, { seg: 22 }), cy(r, hh, '#c9cbc6', 0, 0.1, 0, { seg: 22 }), cy(r + 0.02, 0.14, '#9a3a2e', 0, hh * 0.7, 0, { seg: 22 }), cy(r * 0.97, 0.12, '#aeb0ab', 0, hh + 0.1, 0, { seg: 22, rt: r * 0.55 }), cy(0.1, 0.18, IRON, 0.2, hh + 0.22, 0.1, { seg: 6 }), bx(0.05, hh, 0.05, IRON, r * 0.88, 0.1, r * 0.4));
  for (let i = 0; i < 8; i++) g.add(bx(0.3, 0.04, 0.14, IRON, r * 0.7, 0.3 + i * (hh - 0.3) / 8, r * 0.7, { ry: -0.8, cast: false }));
  g.add(bx(0.06, hh * 0.5, 0.05, '#6a6e72', -r * 0.9, 0.1, 0.0));
  g.add(panel(Math.min(1.1, r * 1.2), 0.3, t.material, 0, hh * 0.45, r - 0.02, { cast: false }));
  return done(g);
}

export function pipe(p, ctx) {
  return run(p, ctx, (m) => {
    const a = arms(m, p, 0.2);
    const g = group();
    const c = '#b3aa8e';
    if (a.ew) g.add(cyx(0.15, a.x1 - a.x0, c, (a.x0 + a.x1) / 2, 0.55, 0.5, { seg: 10 }));
    if (a.ns) g.add(cyz(0.15, a.z1 - a.z0, c, 0.5, 0.55, (a.z0 + a.z1) / 2, { seg: 10 }));
    if (a.ew && a.ns) g.add(sphere(0.17, c, 0.5, 0.55, 0.5, { seg: 8 }));
    g.add(bx(0.3, 0.42, 0.3, CONC, 0.5, 0, 0.5), cy(0.2, 0.05, '#8a3a2e', 0.5, 0.4, 0.5, { seg: 10 }));
    if ((p.x + p.y) % 2 === 0) g.add(cy(0.19, 0.08, '#8a3a2e', 0.5, 0.55, 0.5, { seg: 10, rx: a.ew && !a.ns ? 0 : Math.PI / 2, rz: a.ew && !a.ns ? Math.PI / 2 : 0 }).translateY(0));
    return g;
  });
}

export function valve(p) {
  const [w, h] = size(p, 3, 1);
  const g = group(0, 0, h / 2, cyx(0.12, w - 0.1, '#7a7e82', w / 2, 0.5, 0, { seg: 10 }));
  for (let i = 0; i < w; i++) {
    const x = i + 0.5;
    g.add(bx(0.3, 0.45, 0.3, '#5a6068', x, 0, 0), cy(0.17, 0.3, '#6a7078', x, 0.4, 0, { seg: 10 }), cy(0.04, 0.34, IRON, x, 0.7, 0, { seg: 6 }), cyz(0.16, 0.04, '#c8402e', x, 1.05, 0, { seg: 12 }).rotateX(0), bx(0.34, 0.04, 0.04, '#c8402e', x, 1.03, 0), bx(0.04, 0.04, 0.34, '#c8402e', x, 1.03, 0));
  }
  return done(g);
}

export function gauge(p, ctx) {
  const [w, h] = size(p, 3, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 1.2, 0.34, '#4a5058'), bx(w - 0.1, 0.06, 0.4, '#3a3e44', 0, 1.2, 0), bx(w - 0.3, 0.08, 0.26, '#2a2e34', 0, 0.35, 0.2, { rx: -0.3 }));
  for (let i = 0; i < w; i++) { const x = -w / 2 + 0.5 + i; g.add(cyz(0.22, 0.04, '#e8e2d4', x, 0.85, 0.18, { seg: 14 }), cyz(0.18, 0.045, '#1a1e24', x, 0.85, 0.185, { seg: 14 }), bx(0.03, 0.15, 0.02, '#ff5a3a', x + 0.04, 0.88, 0.22, { rz: -0.5, emissive: '#ff3a1a', ei: 0.5, cast: false }), bx(0.08, 0.08, 0.04, i % 2 ? '#5ac08a' : '#ffb02e', x, 0.4, 0.25, { emissive: i % 2 ? '#5ac08a' : '#ffb02e', ei: 1, cast: false })); }
  return done(g);
}

export function barrelline(p) {
  const [w, h] = size(p, 3, 1);
  const g = group(0, 0, h / 2, bx(w - 0.1, 0.12, 0.76, '#3a3a40', w / 2, 0.4, 0), bx(w - 0.1, 0.08, 0.1, '#2a2a2e', w / 2, 0.52, -0.33), bx(w - 0.1, 0.08, 0.1, '#2a2a2e', w / 2, 0.52, 0.33));
  for (let i = 0; i < w; i += 1) g.add(bx(0.1, 0.4, 0.7, IRON, i + 0.5, 0, 0, { cast: false }));
  for (let i = 0; i < w - 0.5; i++) g.add(cy(0.24, 0.5, i % 2 ? '#3f6a8a' : '#8a4a3a', i + 0.6, 0.52, 0, { seg: 10 }), cy(0.25, 0.04, '#2a2a2e', i + 0.6, 0.72, 0, { seg: 10 }));
  g.add(bx(0.6, 1.0, 0.5, '#5a6068', w - 0.3, 0.4, 0.0, { cast: false }), bx(0.3, 0.1, 0.52, '#c9a43a', w - 0.3, 1.4, 0));
  return done(g);
}

export function column(p) {
  const [w, h] = size(p, 2, 3);
  const r = Math.min(w, h) / 2 - 0.35;
  const g = group(w / 2, 0, h / 2, cy(r + 0.15, 0.2, '#7a7e82', 0, 0, 0, { seg: 16 }), cy(r, 4.6, '#b8bcc0', 0, 0.2, 0, { seg: 16 }), dome(r, '#9a9ea2', 0, 4.8, 0, { seg: 16 }), cy(0.07, 0.5, IRON, 0, 5.5, 0, { seg: 6 }));
  for (let i = 1; i < 5; i++) g.add(cy(r + 0.03, 0.08, '#6a6e72', 0, i * 0.9, 0, { seg: 16 }));
  g.add(cy(0.09, 4.0, '#8a8e92', r + 0.18, 0.4, 0, { seg: 6 }), cyx(0.07, r + 0.3, '#8a8e92', r / 2 + 0.1, 3.8, 0, { seg: 6 }), cyx(0.07, r + 0.3, '#8a8e92', r / 2 + 0.1, 1.2, 0, { seg: 6 }), bx(0.06, 4.4, 0.3, '#5a5e62', -r * 0.2, 0.3, r + 0.1), bx(0.4, 0.06, 0.3, IRON, 0, 2.8, r + 0.2, { cast: false }));
  return done(g, { lights: [{ x: w / 2, y: 5.6, z: h / 2, color: '#ff6a3a', intensity: 2, distance: 4 }] });
}

// ---- the factory floor --------------------------------------------------------------------------------------
export function loadingbay(p, ctx) {
  const [w, h] = size(p, 2, 2);
  const g = group(0, 0, 0, flat(w - 0.06, h - 0.06, '#2a2a2e', w / 2, h / 2, 0.014));
  const y = mat('#f2c14e');
  for (let x = 0.2; x < w - 0.3; x += 0.4) g.add(flat(0.22, 0.06, y, x + 0.1, 0.14, 0.02), flat(0.22, 0.06, y, x + 0.1, h - 0.14, 0.02));
  for (let z = 0.2; z < h - 0.3; z += 0.4) g.add(flat(0.06, 0.22, y, 0.14, z + 0.1, 0.02), flat(0.06, 0.22, y, w - 0.14, z + 0.1, 0.02));
  g.add(bx(w - 0.6, 0.1, h - 0.7, '#9a6b45', w / 2, 0, h / 2 + 0.1));
  for (let i = 0; i < Math.max(2, Math.round(w * h / 2)); i++) g.add(bx(0.4, 0.28, 0.34, pick(['#c8b08a', '#b89a74', '#d2bc96'], hash(p.x, p.y, i)), 0.5 + (i * 0.6) % Math.max(0.5, w - 1), 0.1 + (i > 3 ? 0.28 : 0), 0.55 + Math.floor(i * 0.6 / Math.max(0.5, w - 1)) * 0.5, { ry: hash(i, 2, 2) * 0.4 }));
  return done(g);
}

export function outbin(p, ctx) {
  const [w, h] = size(p, 2, 2);
  const t = plate(ctx, 'OUT', { bg: '#2a5a3a', fg: '#e8f2e0', h: 60, font: 'bold 44px "Trebuchet MS", sans-serif' });
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 0.7, h - 0.3, '#3a7a4a'), bx(w - 0.1, 0.08, h - 0.2, '#2a5a3a', 0, 0.7, 0), bx(w - 0.5, 0.05, h - 0.6, '#1c3a26', 0, 0.76, 0, { cast: false }), panel(0.7, 0.28, t.material, 0, 0.3, (h - 0.3) / 2 + 0.01, { cast: false }));
  for (let i = 0; i < 3; i++) g.add(bx(0.3, 0.2, 0.26, pick(['#c8b08a', '#b89a74', '#9a6b45'], hash(p.x, i, 3)), -0.3 + i * 0.3, 0.74, (i % 2) * 0.2 - 0.1, { ry: i }));
  return done(g);
}

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const arrowAt = (dir, x, z, c, s = 1) => {
  const [dx, dz] = DIRS[dir % 4];
  const a = Math.atan2(-dz, dx); // heading in the xz plane (ry rotates +x toward -z)
  return [bx(0.2 * s, 0.025, 0.05 * s, c, x - dx * 0.04, 0.12, z - dz * 0.04, { ry: a + 0.7, cast: false }), bx(0.2 * s, 0.025, 0.05 * s, c, x - dx * 0.04, 0.12, z - dz * 0.04, { ry: a - 0.7, cast: false })].map((m, i) => { m.position.x += Math.cos(a + (i ? -0.7 : 0.7)) * 0.07 * s * 0 + 0; return m; });
};

export function belt(p) {
  const [w, h] = size(p, 1, 1);
  const dir = p.dir || 0; const horiz = dir % 2 === 0;
  const g = group(0, 0, 0, bx(w - 0.02, 0.08, h - 0.02, '#3a3a40', w / 2, 0, h / 2));
  if (horiz) g.add(bx(w - 0.02, 0.08, 0.1, '#2a2a2e', w / 2, 0.08, 0.1), bx(w - 0.02, 0.08, 0.1, '#2a2a2e', w / 2, 0.08, h - 0.1));
  else g.add(bx(0.1, 0.08, h - 0.02, '#2a2a2e', 0.1, 0.08, h / 2), bx(0.1, 0.08, h - 0.02, '#2a2a2e', w - 0.1, 0.08, h / 2));
  const [dx, dz] = DIRS[dir % 4];
  const n = Math.max(1, Math.round((horiz ? w : h) * 2));
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const x = horiz ? u * w : w / 2; const z = horiz ? h / 2 : u * h; g.add(...arrowAt(dir, x, z, '#6a6a72')); }
  void dx; void dz;
  return done(g);
}

export function sorter(p) {
  const dir = p.dir || 0; const [dx, dz] = DIRS[dir % 4]; const rt = DIRS[(dir + 1) % 4];
  const g = group(0.5, 0, 0.5, bx(0.92, 0.18, 0.92, '#5a5e66'), bx(0.7, 0.04, 0.7, '#7a7e86', 0, 0.18, 0), bx(0.18, 0.12, 0.18, '#f2c14e', 0, 0.22, 0));
  g.add(...arrowAt(dir, dx * 0.2, dz * 0.2, '#e8e2d4', 1.3).map((m) => { m.position.y = 0.24; return m; }));
  for (const s of [1, -1]) g.add(bx(0.12, 0.06, 0.12, s > 0 ? '#5ac08a' : '#c85a4a', rt[0] * s * 0.32, 0.22, rt[1] * s * 0.32));
  return done(g);
}

export function inserter(p, ctx) {
  const dir = p.dir || 0; const [dx, dz] = DIRS[dir % 4];
  const filt = p.filterable;
  const arm = group(0, 0, 0, bx(0.12, 0.1, 0.44, filt ? '#a86ad8' : '#f2c14e', 0, 0, 0.0), bx(0.18, 0.06, 0.18, '#4a4a50', 0, 0.02, 0.22));
  arm.children.forEach((c) => { c.userData.noBake = true; });
  const g = group(0.5, 0, 0.5, cy(0.18, 0.2, '#4a4a50', 0, 0, 0, { seg: 10 }), cy(0.1, 0.06, filt ? '#a86ad8' : '#f2c14e', 0, 0.2, 0, { seg: 8 }), bx(0.1, 0.14, 0.1, '#6a6a72', 0, 0.26, 0));
  done(g);
  const pivot = group(0, 0.3, 0, arm);
  pivot.rotation.y = Math.atan2(dx, dz); // the arm points along its direction (local +z)
  g.add(pivot);
  arm.position.z = 0.22;
  g.userData.update = (q, c) => { const swing = q.busy ? Math.cos(((c.game?.clock?.total || 0) % 1) * Math.PI) : 1; arm.position.z = 0.22 * swing; };
  return g;
}

const MACHINE = { solderer: ['#4a6a8a', 'SOLDER', '#ffb84a'], press: ['#7a5a3a', 'PRESS', '#e8e2d4'], assembler: ['#3a6a5a', 'ASSEMBLE', '#7ad0b0'], tuner: ['#6a3a6a', 'TUNE', '#f08ab0'], lathe: ['#5a6a7a', 'LATHE', '#ffd27a'], assembly: ['#7a5a3a', 'ASSEMBLY', '#f2e2b8'], electronics: ['#2a5a4a', 'ELECTRONICS', '#7affc8'], explosives: ['#7a3a22', 'EXPLOSIVES', '#ff9a3a', true], rocket: ['#5a2e2e', 'ROCKETS', '#ff6a3a', true], drone: ['#2e3a5a', 'DRONES', '#7ab4ff'], lab: ['#3e2e5a', 'RESEARCH', '#c8a8ff'] };
export function machine(p, ctx) {
  const [w, h] = size(p, 2, 2);
  const m = MACHINE[p.kind] || MACHINE.press;
  const lab = String(p.kind ? (m[1]) : 'MACHINE');
  const t = plate(ctx, lab, { bg: shade(m[0], -30), fg: '#f4efe6', h: 48, font: 'bold 30px "Trebuchet MS", sans-serif' });
  const win = noBake(bx(w - 0.8, 0.4, 0.04, '#1e1e22', 0, 0.9, h / 2 - 0.2, { cast: false }));
  const on = mat(m[2], { emissive: m[2], ei: 1.6 }); const off = mat('#1e1e22');
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 1.3, h - 0.3, m[0], 0, 0, 0), bx(w - 0.1, 0.08, h - 0.3, shade(m[0], 20), 0, 1.3, 0), panel(Math.min(w - 0.4, 1.4), 0.24, t.material, 0, 1.0, h / 2 - 0.14, { cast: false }), win, bx(0.3, 0.3, 0.3, shade(m[0], -20), w / 2 - 0.5, 1.38, 0), cy(0.08, 0.35, STEEL, -w / 2 + 0.4, 1.38, 0, { seg: 8 }), bx(w - 0.7, 0.08, 0.04, '#1e1e22', 0, 0.3, h / 2 - 0.14, { cast: false }));
  if (m[3]) for (let k = 0; k < w * 2 - 1; k++) g.add(bx(0.2, 0.06, 0.03, k % 2 ? '#f2c14e' : '#1a1a1a', -w / 2 + 0.3 + k * 0.25, 0.08, h / 2 - 0.13, { cast: false }));
  done(g);
  win.position.y = 0.68;
  g.userData.update = (q) => { const working = q.progress > 0 && q.powered !== false; const mm = working ? on : off; if (win.material !== mm) win.material = mm; };
  g.userData.update(p);
  return g;
}

export function generator(p) {
  const [w, h] = size(p, 2, 2);
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 0.15, h - 0.2, '#4a4e56'), bx(w - 0.4, 0.8, h - 0.5, '#8a9098', 0, 0.15, 0), bx(w - 0.4, 0.06, h - 0.5, '#6a7078', 0, 0.95, 0), cy(0.12, 1.0, '#4a4e56', w / 2 - 0.5, 0.95, -h / 2 + 0.4, { seg: 8 }), cy(0.15, 0.04, IRON, w / 2 - 0.5, 1.95, -h / 2 + 0.4, { seg: 8 }), bx(0.4, 0.3, 0.05, '#1e1e22', -0.3, 0.45, (h - 0.5) / 2 + 0.01, { cast: false }), bx(0.12, 0.08, 0.04, '#5ac08a', -0.3, 0.52, (h - 0.5) / 2 + 0.03, { emissive: '#5ac08a', ei: 1.2, cast: false }));
  for (let k = 0; k < 6; k++) g.add(bx((w - 0.4) / 6, 0.12, 0.04, k % 2 ? '#f2c14e' : '#1a1a1a', -w / 2 + 0.2 + (k + 0.5) * (w - 0.4) / 6, 0.15, (h - 0.5) / 2 + 0.02, { cast: false }));
  return done(g);
}

export function storage(p, ctx) {
  if (p.drone) {
    const launch = p.drone.role === 'launch'; const c1 = launch ? '#e8903a' : '#4aa0d8';
    const g = group(0.5, 0, 0.5, bx(0.94, 0.14, 0.94, '#3a3e4a'), bx(0.8, 0.02, 0.06, c1, 0, 0.14, 0.38, { emissive: c1, ei: 0.8, cast: false }), bx(0.8, 0.02, 0.06, c1, 0, 0.14, -0.38, { emissive: c1, ei: 0.8, cast: false }), bx(0.06, 0.02, 0.8, c1, 0.38, 0.14, 0, { cast: false }), bx(0.06, 0.02, 0.8, c1, -0.38, 0.14, 0, { cast: false }));
    if (!p.flight || !launch) g.add(bx(0.2, 0.08, 0.2, '#c9ced8', 0, 0.2, 0), ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => cy(0.09, 0.03, '#8a909c', x, 0.24, z, { seg: 8 })));
    return done(g);
  }
  const iron = (p.cap || 0) > 100;
  const body = iron ? '#6a6e78' : '#8a5a32';
  const bar = bx(0.8, 0.07, 0.04, '#7ac86a', 0, 0.1, 0.4, { cast: false });
  noBake(bar);
  const g = group(0.5, 0, 0.5, bx(0.84, 0.58, 0.64, body), bx(0.88, 0.1, 0.68, iron ? '#4a4e58' : '#6a4222', 0, 0.58, 0), bx(0.88, 0.08, 0.68, iron ? '#4a4e58' : '#6a4222', 0, 0.0, 0), bx(0.12, 0.16, 0.04, iron ? '#9aa0aa' : '#c8a060', 0, 0.36, 0.33, { cast: false }), bx(0.8, 0.08, 0.02, '#1e1e22', 0, 0.1, 0.33, { cast: false }), bar);
  done(g);
  bar.position.set(0, 0.14, 0.345);
  const mats = [mat('#7ac86a'), mat('#d8604a')];
  g.userData.update = (q, c) => {
    const items = c.game?.world?.containers?.[q.container]?.items;
    const n = items ? Object.values(items).reduce((a, b) => a + b, 0) : 0;
    const f = Math.max(0.02, Math.min(1, n / (q.cap || 1)));
    bar.scale.set(0.8 * f, 0.07, 0.04); bar.position.x = -0.4 + 0.4 * f;
    bar.material = mats[n >= (q.cap || 1) ? 1 : 0];
  };
  g.userData.update(p, {});
  return g;
}

// ---- the building site --------------------------------------------------------------------------------------
export function scaffold(p) {
  const [w, h] = size(p, 2, 2);
  const g = group();
  const nx = Math.max(1, Math.round(w / 2)); const nz = Math.max(1, Math.round(h / 2));
  const xs = Array.from({ length: nx + 1 }, (_, i) => 0.08 + i * (w - 0.16) / nx); const zs = Array.from({ length: nz + 1 }, (_, i) => 0.08 + i * (h - 0.16) / nz);
  const levels = h > 4 || w > 4 ? 3 : 2; const LH = 1.8;
  for (const x of xs) for (const z of zs) { if (x > 0.5 && x < w - 0.5 && z > 0.5 && z < h - 0.5) continue; g.add(cy(0.04, levels * LH, STEEL, x, 0, z, { seg: 5 })); }
  for (let l = 1; l <= levels; l++) {
    const y = l * LH - 0.1;
    for (const z of [0.08, h - 0.08]) g.add(bx(w - 0.1, 0.05, 0.05, STEEL, w / 2, y, z), bx(w - 0.1, 0.05, 0.05, STEEL, w / 2, y - 0.9, z));
    for (const x of [0.08, w - 0.08]) g.add(bx(0.05, 0.05, h - 0.1, STEEL, x, y, h / 2), bx(0.05, 0.05, h - 0.1, STEEL, x, y - 0.9, h / 2));
    if (l >= levels - 1) g.add(bx(w - 0.1, 0.07, Math.min(h - 0.1, 1.2), '#a58a5c', w / 2, y - 0.04, h - Math.min(h - 0.1, 1.2) / 2 - 0.05));
  }
  for (let i = 0; i < nx; i++) g.add(bx(0.04, LH * 1.2, 0.04, '#7a7e82', xs[i] + (xs[i + 1] - xs[i]) / 2, 0.1, h - 0.08, { rz: 0.75, cast: false }));
  for (let j = 0; j < nz; j++) g.add(bx(0.04, 0.04, 0.001, '#000', 0, 0, 0, { cast: false }));
  return done(g);
}

export function excavator(p) {
  const [w, h] = size(p, 2, 2);
  const y = '#d9a82a';
  const arm = group(0.6, 0.9, 0, bx(0.9, 0.14, 0.14, y, 0.35, 0, 0, { rz: 0.5 }));
  arm.add(bx(0.8, 0.12, 0.12, shade(y, -10), 0.95, 0.55, 0, { rz: -0.6 }), bx(0.28, 0.22, 0.3, '#5a5e66', 1.3, 0.25, 0));
  arm.traverse((o) => { o.userData.noBake = false; });
  const g = group(w / 2, 0, h / 2, bx(w - 0.3, 0.3, 0.55, '#2a2a2e', 0, 0, -0.35), bx(w - 0.3, 0.3, 0.55, '#2a2a2e', 0, 0, 0.35), bx(w - 0.5, 0.25, 0.9, '#44474c', 0, 0.3, 0), bx(0.8, 0.8, 0.8, y, -0.2, 0.55, 0), bx(0.82, 0.06, 0.82, shade(y, -30), -0.2, 1.35, 0), bx(0.5, 0.55, 0.04, glass('#9fc0d0', 0.5), -0.1, 0.7, 0.42, { cast: false }), bx(0.5, 0.3, 0.7, '#44474c', -0.5, 0.55, 0), bx(0.04, 0.55, 0.04, y, 0.15, 0.8, 0.35), bx(0.04, 0.55, 0.04, y, 0.15, 0.8, -0.35), bx(0.34, 0.1, 0.1, '#3a3e44', -0.2, 0.9, 0.5), arm);
  void h;
  return done(g);
}

export const BUILDERS = { derrick, pumpjack, tank, pipe, valve, gauge, barrelline, column, loadingbay, outbin, belt, sorter, inserter, machine, generator, storage, scaffold, excavator };
