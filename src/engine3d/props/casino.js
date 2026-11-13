// The Phonograph Grand: tables, machines, rooms' dressing; plus parked cars and the odd bits.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, oriented, vmesh, THREE, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS, CREAM } from './kit.js';

const col = (p, def, k = 0.15) => (typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? mute(p.color, k) : def);
const chips = (g, n, x0, z0, seed, y = 0.78) => { for (let i = 0; i < n; i++) g.add(cy(0.045, 0.045, pick(['#c8402e', '#f4f1e4', '#2a2a2a', '#3f6a8a', '#c9a43a'], hash(seed, i, 5)), x0 + (hash(seed, i, 1) - 0.5) * 0.7, y, z0 + (hash(seed, i, 2) - 0.5) * 0.35, { seg: 8, cast: false })); };

export function roulette_table(p) {
  const [w, h] = size(p, 4, 2);
  const felt = col(p, '#1e6a3a');
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.72, h - 0.3, '#5a2e1e'), bx(w - 0.04, 0.08, h - 0.22, '#7a4a2e', 0, 0.72, 0), bx(w - 0.3, 0.02, h - 0.5, felt, 0, 0.8, 0, { cast: false }));
  g.add(cy(0.4, 0.1, '#7a4a2a', -w / 2 + 0.8, 0.8, 0, { seg: 18 }), cy(0.3, 0.03, '#c8402e', -w / 2 + 0.8, 0.9, 0, { seg: 18 }), cy(0.14, 0.06, BRASS, -w / 2 + 0.8, 0.92, 0, { seg: 10 }), cy(0.3, 0.02, '#14101a', -w / 2 + 0.8, 0.93, 0, { seg: 18, cast: false }));
  g.add(vmesh((m) => { for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) m.box(0.2, 0.02, 0.2, (i + j) % 3 === 0 ? '#c8402e' : (i + j) % 3 === 1 ? '#1a1a1a' : '#e8e2d0', -w / 2 + 1.5 + i * 0.22, 0.82, -0.3 + j * 0.24); }));
  chips(g, 6, 0.8, 0, p.x);
  return done(g);
}

export function blackjack_table(p) {
  const [w, h] = size(p, 3, 2);
  const felt = col(p, '#1e6a3a');
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 0.72, h - 0.4, '#4a2418', 0, 0, -0.05));
  g.add(bx(w - 0.1, 0.08, h - 0.3, '#6a3a28', 0, 0.72, -0.05), bx(w - 0.3, 0.02, h - 0.5, felt, 0, 0.8, -0.05, { cast: false }));
  for (let i = 0; i < 5; i++) g.add(cy(0.17, 0.015, '#e8e2d0', -w * 0.34 + i * (w * 0.17), 0.815, 0.2, { seg: 12, cast: false }));
  g.add(bx(0.3, 0.12, 0.2, '#14101a', w * 0.3, 0.82, -0.4), bx(0.2, 0.02, 0.28, '#f4f1e4', -0.1, 0.82, -0.3, { ry: 0.2, cast: false }));
  chips(g, 5, 0, 0.2, p.x);
  return done(g);
}

export function poker_table(p) {
  const [w, h] = size(p, 4, 3);
  const felt = col(p, '#1e6a3a');
  const g = group(w / 2, 0, h / 2, bx(w - 0.8, 0.72, h - 0.5, '#3a2a1c'), bx(w - 0.2, 0.72, h - 1.1, '#3a2a1c'), bx(w - 0.6, 0.08, h - 0.5, '#5a3a28', 0, 0.72, 0), bx(w - 0.1, 0.08, h - 1.1, '#5a3a28', 0, 0.72, 0), bx(w - 0.8, 0.02, h - 0.7, felt, 0, 0.8, 0, { cast: false }), bx(w - 0.4, 0.02, h - 1.3, felt, 0, 0.8, 0, { cast: false }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.add(cy(0.05, 0.04, '#e8e2d0', Math.cos(a) * (w / 2 - 0.4), 0.82, Math.sin(a) * (h / 2 - 0.3), { seg: 8, cast: false })); }
  chips(g, 8, 0, 0, p.x);
  g.add(bx(0.5, 0.02, 0.18, '#f4f1e4', 0, 0.82, 0, { cast: false }));
  return done(g);
}

export function spade_table(p) {
  const [w, h] = size(p, 4, 2);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 0.72, h - 0.3, '#1e1620'), bx(w - 0.04, 0.08, h - 0.22, '#c9a24a', 0, 0.72, 0), bx(w - 0.3, 0.02, h - 0.5, '#4a1e6a', 0, 0.8, 0, { cast: false }));
  g.add(bl(0.2, '#c9a24a', 0, 0.9, 0.0, { detail: 0, sy: 0.4, emissive: '#c9a24a', ei: 0.6 }), cn(0.12, 0.3, '#c9a24a', 0, 0.9, 0.0, { seg: 3 }), bx(0.05, 0.2, 0.05, '#c9a24a', 0, 0.8, 0.18, { cast: false }));
  for (let i = 0; i < 4; i++) g.add(bx(0.2, 0.01, 0.28, '#f4f1e4', -1 + i * 0.5, 0.82, 0.28, { ry: i * 0.3, cast: false }));
  chips(g, 5, 0.6, -0.2, p.x);
  return done(g, { lights: [{ x: w / 2, y: 1.6, z: h / 2, color: '#9a6aff', intensity: 2, distance: 4 }] });
}

export function cashier_cage(p) {
  const [w, h] = size(p, 6, 1);
  const g = group(w / 2, 0, h / 2, bx(w - 0.1, 1.0, 0.7, '#4a3224'), bx(w, 0.08, 0.8, BRASS, 0, 1.0, 0.0), bx(w - 0.1, 0.1, 0.7, '#2a1e16', 0, 2.3, 0));
  const n = Math.max(2, Math.round(w / 1.2));
  for (let i = 0; i <= n; i++) g.add(bx(0.07, 1.2, 0.07, BRASS, -w / 2 + 0.1 + i * (w - 0.2) / n, 1.08, 0.3));
  g.add(bx(w - 0.2, 1.2, 0.03, glass('#bfe0ea', 0.3), 0, 1.08, 0.3, { cast: false }), bx(w - 0.1, 0.08, 0.08, BRASS, 0, 1.2, 0.3));
  for (let i = 0; i < n; i++) g.add(bx(0.5, 0.3, 0.04, '#14101a', -w / 2 + 0.1 + (i + 0.5) * (w - 0.2) / n, 1.1, 0.3, { cast: false }));
  for (let i = 0; i < n; i++) g.add(bx(0.4, 0.2, 0.3, '#6a6e72', -w / 2 + 0.1 + (i + 0.5) * (w - 0.2) / n, 1.08, -0.1));
  return done(g);
}

export function slot_machine(p) {
  const c = pick(['#a8303a', '#3a4aa8', '#a8843a'], rnd(p));
  const g = group(0.5, 0, 0.5, bx(0.7, 0.5, 0.6, shade(c, -30)), bx(0.66, 1.0, 0.5, c, 0, 0.5, -0.04), bx(0.6, 0.35, 0.1, '#14101a', 0, 1.3, -0.1), bx(0.5, 0.3, 0.04, '#ffd24a', 0, 1.34, -0.04, { emissive: '#ffb02a', ei: 1.6, cast: false }), bx(0.5, 0.3, 0.03, '#f4f1e4', 0, 0.9, 0.23, { emissive: '#ffe08a', ei: 1.0, cast: false }), bx(0.46, 0.05, 0.1, '#ffffff', 0, 0.7, 0.28, { cast: false }), cy(0.025, 0.4, STEEL, 0.4, 0.7, 0, { seg: 5 }), sphere(0.06, '#c8402e', 0.4, 1.1, 0, { seg: 6 }));
  return done(g, { lights: [{ x: 0.5, y: 1.2, z: 1.0, color: '#ffc04a', intensity: 1.5, distance: 3 }] });
}

export function velvet_rope(p, ctx) {
  const [w, h] = size(p, 2, 1);
  const along = w >= h; const L = along ? w : h;
  const g = group();
  const post = (x, z) => g.add(cy(0.12, 0.04, BRASS, x, 0, z, { seg: 8 }), cy(0.03, 0.9, BRASS, x, 0.04, z, { seg: 6 }), sphere(0.06, BRASS, x, 0.96, z, { seg: 6 }));
  const x0 = 0.3; const x1 = L - 0.3;
  const at = (u) => (along ? [u, h / 2] : [w / 2, u]);
  post(...at(x0)); post(...at(x1));
  const n = 6;
  for (let i = 0; i < n; i++) { const u = x0 + (i + 0.5) * (x1 - x0) / n; const sag = Math.sin((i + 0.5) / n * Math.PI) * 0.12; const [x, z] = at(u); g.add(bx(along ? (x1 - x0) / n + 0.02 : 0.05, 0.05, along ? 0.05 : (x1 - x0) / n + 0.02, '#a8202a', x, 0.9 - sag, z, { cast: false })); }
  return done(g);
}

export function magic_circle(p) {
  const [w, h] = size(p, 5, 5);
  const g = group(w / 2, 0, h / 2);
  const disc = (r, c, y, o) => { const m = cy(r, 0.01, c, 0, y, 0, { seg: 28, cast: false, ...o }); m.scale.set(1, 1, h / w); return m; };
  g.add(disc(w / 2 - 0.1, '#3a1e5a', 0.012), disc(w / 2 - 0.25, '#14101a', 0.018, { emissive: '#000' }), disc(w / 2 - 0.4, '#3a1e5a', 0.024, {}), disc(w / 2 - 0.55, '#14101a', 0.03));
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const rx = (w / 2 - 0.33) * Math.cos(a); const rz = (h / 2 - 0.33) * Math.sin(a); g.add(bx(0.14, 0.012, 0.05, '#c9a0ff', rx, 0.034, rz, { ry: -a, emissive: '#c9a0ff', ei: 0.9, cast: false })); }
  g.add(bx(0.7, 0.012, 0.08, '#c9a0ff', 0, 0.036, 0, { emissive: '#c9a0ff', ei: 0.8, cast: false }), bx(0.08, 0.012, 0.7, '#c9a0ff', 0, 0.036, 0, { emissive: '#c9a0ff', ei: 0.8, cast: false }));
  return done(g);
}

export function floating_cards(p) {
  const cards = group();
  for (let i = 0; i < 5; i++) { const c = bx(0.18, 0.01, 0.26, i % 2 ? '#f4f1e4' : '#e8e2d0', 0, 0, 0, { cast: false }); const a = group(Math.cos(i * 1.26) * 0.28, 0.9 + i * 0.12, Math.sin(i * 1.26) * 0.28, c); a.rotation.set(0.5, i * 1.26, 0.2); a.children.forEach((m) => { m.userData.noBake = true; }); cards.add(a); }
  const g = group(0.5, 0, 0.5);
  g.add(cards);
  g.userData.update = (q, c) => { const t = clockOf(c); cards.rotation.y = t * 0.7; cards.position.y = Math.sin(t * 1.3) * 0.06; };
  return g;
}

export function crystal_ball(p) {
  return done(group(0.5, 0, 0.5, cy(0.2, 0.12, BRASS, 0, 0, 0, { seg: 8 }), cy(0.1, 0.5, '#2a1e3a', 0, 0.12, 0, { seg: 8, rt: 0.18 }), cy(0.26, 0.06, BRASS, 0, 0.62, 0, { seg: 10, rt: 0.2 }), sphere(0.26, '#b8a0ff', 0, 0.9, 0, { seg: 12, opacity: 0.75, emissive: '#7a5ae0', ei: 0.9 }), sphere(0.1, '#f0e6ff', 0.04, 0.92, 0.02, { seg: 6, emissive: '#d8c8ff', ei: 1.5, cast: false })), { lights: [{ x: 0.5, y: 1.0, z: 0.5, color: '#b8a0ff', intensity: 1.5, distance: 3 }] });
}

export function candelabra(p) {
  const flames = [];
  const g = group(0.5, 0, 0.5, cy(0.16, 0.06, BRASS, 0, 0, 0, { seg: 8 }), cy(0.03, 1.0, BRASS, 0, 0.06, 0, { seg: 6 }), bx(0.8, 0.04, 0.04, BRASS, 0, 1.0, 0));
  for (let i = 0; i < 7; i++) { const x = -0.36 + i * 0.12; const y = 1.0 + (3 - Math.abs(i - 3)) * 0.1; g.add(cy(0.025, 0.2, '#f4ecd8', x, y + 0.04, 0, { seg: 6 }), cy(0.035, 0.03, BRASS, x, y, 0, { seg: 6 })); const f = bl(0.04, '#ffd060', x, y + 0.27, 0, { detail: 0, emissive: '#ffa030', ei: 2.5, cast: false, sy: 1.5 }); f.userData.noBake = true; flames.push(f); g.add(f); }
  done(g);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { const t = clockOf(c) * 8; flames.forEach((f, i) => { const s = 1 + Math.sin(t + i * 1.7 + ph) * 0.15; f.scale.set(s, 1 + Math.sin(t * 1.3 + i) * 0.2, s); }); };
  g.userData.lights = [{ x: 0.5, y: 1.5, z: 0.5, color: '#ffb060', intensity: 2, distance: 4 }];
  return g;
}

export function piano(p) {
  const [w, h] = size(p, 3, 2);
  const g = group(w / 2, 0, h / 2, bx(w - 0.3, 0.12, h - 0.7, '#14101a', -0.05, 0.62, -0.18), bx(w - 0.5, 0.1, h - 1.0, '#1c1822', -0.1, 0.74, -0.24, { rz: 0 }));
  g.add(bx(w - 0.1, 0.08, 0.4, '#1c1822', 0, 0.6, h / 2 - 0.3), bx(w - 0.3, 0.06, 0.34, '#f4f1e4', 0, 0.68, h / 2 - 0.28), bx(w - 0.4, 0.2, h - 0.8, '#1c1822', -0.05, 0.84, -0.2, { cast: false }));
  g.add(vmesh((m) => { for (let i = 0; i < 7; i++) m.box(0.06, 0.04, 0.2, '#1a1a1e', -w / 2 + 0.55 + i * 0.3, 0.74, h / 2 - 0.4); }));
  for (const [x, z] of [[-w / 2 + 0.25, -h / 2 + 0.3], [w / 2 - 0.3, -h / 2 + 0.3], [w / 2 - 0.3, h / 2 - 0.3], [-w / 2 + 0.25, h / 2 - 0.3]]) g.add(bx(0.1, 0.6, 0.1, '#14101a', x, 0, z));
  g.add(bx(0.6, 0.06, 0.34, '#3a2a1c', 0, 0.42, h / 2 + 0.0 - 0.05, { cast: false }), bx(0.6, 0.42, 0.04, '#3a2a1c', 0, 0, h / 2 - 0.0 - 0.05, { cast: false }));
  return done(g);
}

export function phone_dock(p) {
  return done(group(0.5, 0, 0.5, bx(0.5, 0.8, 0.4, '#2a2630'), bx(0.56, 0.05, 0.46, BRASS, 0, 0.8, 0), bx(0.18, 0.3, 0.03, '#14101a', 0, 0.9, 0.0, { rx: -0.2 }), bx(0.14, 0.24, 0.01, '#5ac0e8', 0, 0.93, 0.02, { rx: -0.2, emissive: '#5ac0e8', ei: 1.2, cast: false })));
}

export function monitor_wall(p) {
  const [w, h] = size(p, 4, 1);
  const g = group(0, 0, h / 2, bx(w - 0.1, 0.9, 0.5, '#2a2c32', w / 2, 0, -0.1), bx(w - 0.1, 0.05, 0.56, '#44474c', w / 2, 0.9, -0.1));
  const rows = w >= 3 ? 2 : 1;
  g.add(vmesh((m) => { for (let r = 0; r < rows; r++) for (let i = 0; i < Math.floor(w / 0.6); i++) { const s = (i * 3 + r) % 4; m.box(0.5, 0.36, 0.05, '#0a0a10', 0.35 + i * 0.6, 0.95 + r * 0.42, -0.1); m.box(0.44, 0.3, 0.03, s === 0 ? '#2a5a4a' : s === 1 ? '#3a4a6a' : s === 2 ? '#4a3a5a' : '#6ac8a0', 0.35 + i * 0.6, 0.98 + r * 0.42, -0.07); } }));
  return done(g);
}

export function luggage_cart(p) {
  const g = group(0.5, 0, 0.5, bx(0.7, 0.05, 0.5, BRASS, 0, 0.14, 0), bx(0.04, 1.2, 0.04, BRASS, -0.34, 0.14, -0.22), bx(0.04, 1.2, 0.04, BRASS, -0.34, 0.14, 0.22), bx(0.04, 0.04, 0.48, BRASS, -0.34, 1.3, 0), bx(0.04, 1.0, 0.04, BRASS, 0.34, 0.14, -0.22), bx(0.04, 1.0, 0.04, BRASS, 0.34, 0.14, 0.22), bx(0.04, 0.04, 0.48, BRASS, 0.34, 1.1, 0), bx(0.04, 0.04, 0.48, BRASS, 0.0, 0.7, 0, { cast: false }));
  for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) g.add(cyz(0.06, 0.03, '#1c1c20', x, 0.08, z, { seg: 8 }));
  g.add(bx(0.4, 0.3, 0.3, '#6a2a2a', 0.0, 0.19, 0.0, { ry: 0.1 }), bx(0.34, 0.24, 0.26, '#3a4a5a', 0.05, 0.49, 0.0, { ry: -0.1 }), bx(0.3, 0.2, 0.2, '#8a6a3a', 0.0, 0.73, 0.0, { ry: 0.2 }));
  return done(g);
}

// ---- cars standing about -----------------------------------------------------------------------------------
function carBody(L, D, color, o = {}) {
  const c = mute(color, 0.1);
  const g = [bx(L - 0.1, 0.34, D - 0.2, c, 0, 0.2, 0), bx(L * 0.5, 0.3, D - 0.3, shade(c, 14), -L * 0.04, 0.54, 0), bx(L * 0.5 + 0.02, 0.2, D - 0.26, glass('#a8c8d6', 0.6), -L * 0.04, 0.6, 0, { cast: false }), bx(0.06, 0.1, D - 0.4, '#f2e6a0', L / 2 - 0.08, 0.34, 0, { cast: false, emissive: '#f2e6a0', ei: 0.4 }), bx(0.06, 0.1, D - 0.4, '#a83030', -L / 2 + 0.08, 0.34, 0, { cast: false })];
  for (const x of [-L * 0.3, L * 0.3]) for (const z of [-1, 1]) g.push(cyz(0.17, 0.12, '#1c1c20', x, 0.17, z * (D / 2 - 0.1), { seg: 10 }));
  if (o.sport) g.push(bx(L * 0.28, 0.06, D - 0.5, shade(c, -30), -L * 0.4, 0.62, 0));
  return g;
}
export function car(p) {
  const wrecked = Boolean(p.wrecked);
  const c = col(p, '#3a5a8a', 0.1);
  const g = oriented(p, 2, 1, (L, D) => {
    const o = carBody(L, D, wrecked ? shade(c, -30) : c);
    if (p.police) o.push(bx(0.34, 0.08, 0.16, '#3a5aff', 0, 0.82, 0.0, { emissive: '#3a5aff', ei: 1 }), bx(0.34, 0.08, 0.16, '#ff3a3a', 0, 0.82, -0.14, { emissive: '#ff3a3a', ei: 1 }), bx(L * 0.4, 0.1, 0.02, '#f2efe6', 0, 0.32, D / 2 - 0.09, { cast: false }));
    if (wrecked) o.push(bx(L * 0.4, 0.2, D - 0.4, '#5a3a24', L * 0.2, 0.45, 0, { rz: 0.2 }), bl(0.25, '#2a2420', -0.3, 0.9, 0, { opacity: 0.5, cast: false }));
    return o;
  });
  // the long way is the front: cars face east when lying along x (oriented turns the other way along z)
  return done(g);
}
export function car_display(p) {
  const [w, h] = size(p, 3, 2);
  const c = col(p, '#b8402e', 0.05);
  const g = group(w / 2, 0, h / 2, bx(w - 0.2, 0.12, h - 0.2, '#2a2630'), bx(w - 0.4, 0.03, h - 0.4, '#d9d2c0', 0, 0.12, 0, { cast: false }));
  const car2 = oriented({ ...p, w: w - 0.6, h: h - 0.6 }, 2, 1, (L, D) => carBody(L, D, c, { sport: true }));
  car2.position.set(0, 0.15, 0);
  g.add(car2);
  return done(g, { lights: [{ x: w / 2, y: 2.0, z: h / 2, color: '#fff0d0', intensity: 2, distance: 5 }] });
}

export const BUILDERS = { roulette_table, blackjack_table, poker_table, spade_table, cashier_cage, slot_machine, velvet_rope, magic_circle, floating_cards, crystal_ball, candelabra, piano, phone_dock, monitor_wall, luggage_cart, car, car_display };
