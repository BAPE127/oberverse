// Street furniture and signs: lamps, benches, bins, signs, traffic lights, bus stops, flags, statues, tents.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, oriented, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS, CREAM, GREEN } from './kit.js';
import { lightState, walkSignal } from '../../world/lights.js';

const LAMP_ON = '#fff3cf';

export function streetlamp(p, ctx) {
  const on = night(ctx);
  const head = bx(0.26, 0.09, 0.3, LAMP_ON, 0.5, 2.88, 0.84, { cast: false });
  const g = group(0, 0, 0,
    cy(0.13, 0.28, IRON, 0.5, 0, 0.5, { seg: 8 }), cy(0.05, 3.0, IRON, 0.5, 0, 0.5, { seg: 6 }), cy(0.075, 0.12, '#2a2d33', 0.5, 2.9, 0.5, { seg: 6 }),
    bx(0.07, 0.07, 0.4, IRON, 0.5, 2.98, 0.68), bx(0.34, 0.07, 0.36, '#2a2d33', 0.5, 2.96, 0.84), head);
  head.material = mat(on ? LAMP_ON : '#cfd6dc', on ? { emissive: '#ffd27a', ei: 3 } : {});
  noBake(head);
  done(g);
  const lit = mat(LAMP_ON, { emissive: '#ffd27a', ei: 3 }); const dim = mat('#cfd6dc');
  g.userData.update = (q, c) => { const m = c.night ? lit : dim; if (head.material !== m) head.material = m; };
  g.userData.lights = [{ x: 0.5, y: 2.75, z: 0.84, color: '#ffd9a0', intensity: 9, distance: 9 }];
  return g;
}

export function bench(p) {
  return done(oriented(p, 2, 1, (L) => {
    const w = '#a0704a'; const dw = '#8a5e3c';
    return [bx(0.07, 0.45, 0.4, IRON, -L / 2 + 0.12, 0, 0), bx(0.07, 0.45, 0.4, IRON, L / 2 - 0.12, 0, 0),
      bx(L - 0.04, 0.06, 0.2, w, 0, 0.44, 0.12), bx(L - 0.04, 0.06, 0.2, w, 0, 0.44, -0.1),
      bx(L - 0.04, 0.12, 0.05, dw, 0, 0.7, -0.22), bx(L - 0.04, 0.12, 0.05, dw, 0, 0.88, -0.22),
      bx(0.06, 0.5, 0.06, IRON, -L / 2 + 0.12, 0.45, -0.22), bx(0.06, 0.5, 0.06, IRON, L / 2 - 0.12, 0.45, -0.22)];
  }));
}

export function hydrant() {
  return done(group(0.5, 0, 0.5, cy(0.14, 0.52, '#c0414a', 0, 0, 0, { seg: 8 }), cy(0.18, 0.07, '#a8301e', 0, 0.5, 0, { seg: 8 }), bl(0.13, '#c0414a', 0, 0.58, 0, { detail: 0 }),
    cyx(0.07, 0.5, '#d8d4c8', 0, 0.3, 0, { seg: 6 }), cy(0.04, 0.1, IRON, 0, 0.7, 0, { seg: 6 })));
}

export function mailbox() {
  return done(group(0.5, 0, 0.5, cy(0.05, 0.85, IRON, 0, 0, 0, { seg: 6 }), bx(0.34, 0.3, 0.3, '#2f4a8a', 0, 0.8, 0), cy(0.17, 0.3, '#2f4a8a', 0, 0.95, 0, { seg: 8, rx: Math.PI / 2 }).translateY(0), bx(0.2, 0.03, 0.04, '#111', 0, 1.0, 0.16, { cast: false }), bx(0.04, 0.2, 0.04, RED, 0.2, 1.05, 0.05)));
}

export function trash(p) {
  const k = rnd(p);
  const g = group(0.5, 0, 0.5,
    bl(0.28, '#2c3a30', -0.15, 0.2, 0.0, { sy: 0.8, seed: 1 }), bl(0.24, '#3a3a3e', 0.18, 0.18, 0.1, { sy: 0.8, seed: 2 }), bl(0.2, '#4a5a4a', 0.0, 0.18, -0.25, { sy: 0.8, seed: 3 }),
    bl(0.18, '#2c3a30', 0.2, 0.15, -0.2, { sy: 0.8, seed: 0 }), bx(0.3, 0.05, 0.22, '#d8d2c0', -0.25, 0.0, 0.3, { ry: 0.5, cast: false }), bx(0.3, 0.14, 0.24, '#9a7a52', 0.1, 0.0, 0.3, { ry: k * 0.5 }));
  return done(g);
}

export function dumpster(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.3) : '#3f6a4a';
  return done(oriented(p, 2, 1, (L, D) => [bx(L - 0.1, 0.78, D - 0.2, col, 0, 0.12, 0), bx(L - 0.04, 0.08, D - 0.12, shade(col, -26), 0, 0.9, -0.04, { rx: -0.06 }),
    bx(L - 0.1, 0.1, 0.05, shade(col, -24), 0, 0.45, (D - 0.2) / 2 + 0.01), cy(0.07, 0.08, IRON, -L / 2 + 0.18, 0.02, D / 2 - 0.15), cy(0.07, 0.08, IRON, L / 2 - 0.18, 0.02, D / 2 - 0.15), bx(L - 0.3, 0.06, 0.03, shade(col, 20), 0, 0.72, (D - 0.2) / 2 + 0.01)]));
}

export function bollard() {
  return done(group(0.5, 0, 0.5, cy(0.13, 0.8, '#55585e', 0, 0, 0, { seg: 8 }), cy(0.135, 0.1, '#e8d76a', 0, 0.55, 0, { seg: 8 }), cy(0.14, 0.04, '#44474c', 0, 0.8, 0, { seg: 8 })));
}

export function crate(p) {
  const w = p.w || 1; const h = p.h || 1;
  const g = group();
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const k = hash(strHash(p.type), p.x + i, p.y + j);
    const col = shade('#9a7448', Math.round((k - 0.5) * 30)); const s = 0.8;
    const c = group(i + 0.5, 0, j + 0.5, bx(s, s, s, col), bx(s + 0.03, 0.08, s + 0.03, shade(col, -30), 0, 0, 0), bx(s + 0.03, 0.08, s + 0.03, shade(col, -30), 0, s - 0.08, 0), bx(0.07, s, s + 0.03, shade(col, -18), 0, 0, 0), bx(s + 0.03, s, 0.07, shade(col, -18), 0, 0, 0));
    c.rotation.y = (k - 0.5) * 0.35;
    g.add(c);
    if (k > 0.78) g.add(bx(0.5, 0.45, 0.5, shade(col, 10), i + 0.5, s, j + 0.5, { ry: k }));
  }
  return done(g);
}

export function barrel(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.3) : hash(strHash(p.type), p.x, p.y) > 0.5 ? '#3f6a8a' : '#8a4a3a';
  return done(group(0.5, 0, 0.5, cy(0.3, 0.9, col, 0, 0, 0, { seg: 12 }), cy(0.31, 0.05, shade(col, -30), 0, 0.22, 0, { seg: 12 }), cy(0.31, 0.05, shade(col, -30), 0, 0.62, 0, { seg: 12 }), cy(0.27, 0.02, shade(col, -40), 0, 0.9, 0, { seg: 12, cast: false })));
}

export function barrelfire(p, ctx) {
  const flame = bl(0.2, '#ffb03a', 0, 0.98, 0, { detail: 0, emissive: '#ff7a1a', ei: 2.5, cast: false });
  const flame2 = bl(0.13, '#ffe08a', 0.04, 1.14, 0, { detail: 0, emissive: '#ffc04a', ei: 2.5, cast: false });
  noBake(flame); noBake(flame2);
  const g = group(0.5, 0, 0.5, cy(0.3, 0.85, '#4a3a34', 0, 0, 0, { seg: 10 }), cy(0.31, 0.05, '#2a2220', 0, 0.2, 0, { seg: 10 }), cy(0.31, 0.05, '#2a2220', 0, 0.6, 0, { seg: 10 }), cy(0.27, 0.04, '#1a1210', 0, 0.84, 0, { seg: 10 }), bx(0.22, 0.12, 0.02, '#c8c0a8', 0, 0.35, 0.3, { cast: false }), flame, flame2);
  done(g);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { const t = clockOf(c) * 9 + ph; const s = 1 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.08; flame.scale.set(s, 1 + Math.sin(t * 1.3) * 0.25, s); flame2.scale.set(1 / s, 1.2 + Math.sin(t * 2) * 0.3, 1 / s); };
  g.userData.lights = [{ x: 0.5, y: 1.4, z: 0.5, color: '#ff8a3a', intensity: 8, distance: 8 }];
  return g;
}

function textSign(ctx, text, bg, fg, h, w) { return plate(ctx, text, { bg, fg, border: '#e8dcc0', h: 72, font: 'bold 40px "Trebuchet MS", sans-serif' }); }

export function sign(p, ctx) {
  const w = p.w || 1;
  const label = p.label || p.text || '';
  const bw = Math.min(w * 0.9, 0.94 + (w - 1) * 0.5);
  const t = label ? plate(ctx, label, { bg: '#e6dcc3', fg: '#3a2a1e', border: '#5a3d2a', h: 64, font: 'bold 38px "Trebuchet MS", sans-serif' }) : null;
  const bh = Math.min(0.5, bw / (t ? Math.max(1.6, t.aspect) : 2));
  const g = group(w / 2, 0, 0.5, cy(0.045, 1.35, DWOOD, 0, 0, 0, { seg: 6 }), bx(bw, bh + 0.08, 0.07, '#5a3d2a', 0, 1.0, -0.02));
  if (w > 1.5) g.add(cy(0.045, 1.35, DWOOD, bw / 2 - 0.1, 0, 0, { seg: 6 }), cy(0.045, 1.35, DWOOD, -bw / 2 + 0.1, 0, 0, { seg: 6 }));
  if (t) g.add(panel(bw - 0.06, bh, t.material, 0, 1.04, 0.025, { cast: false }));
  else g.add(bx(bw - 0.08, bh - 0.04, 0.02, '#e9dfc7', 0, 1.02, 0.02, { cast: false }), bx(bw * 0.7, 0.06, 0.02, '#9a3530', 0, 1.14, 0.035, { cast: false }), bx(bw * 0.5, 0.06, 0.02, '#9a3530', -bw * 0.1, 1.04, 0.035, { cast: false }));
  return done(g);
}

function bigBoard(p, ctx, color, hmax) {
  const w = p.w || 4; const h = p.h || 2;
  const bw = Math.min(w - 0.2, 3.7); const bh = Math.min(hmax, bw * 0.34);
  const t1 = plate(ctx, p.text || 'WELCOME', { bg: color, fg: '#f4ecd8', border: '#e8dcc0', h: 84, font: 'bold 50px "Trebuchet MS", sans-serif' });
  const g = group(w / 2, 0, h / 2,
    cy(0.08, 2.4, DWOOD, -bw / 2 + 0.25, 0, 0, { seg: 6 }), cy(0.08, 2.4, DWOOD, bw / 2 - 0.25, 0, 0, { seg: 6 }),
    bx(bw + 0.12, bh + 0.12, 0.12, '#2a2622', 0, 1.35, 0), panel(bw, bh, t1.material, 0, 1.38, 0.07, { cast: false }), panel(bw, bh, mat('#2a2622'), 0, 1.38, -0.07, { cast: false, ry: Math.PI }));
  if (p.sub) { const t2 = plate(ctx, p.sub, { bg: '#e6dcc3', fg: '#3a2a1e', h: 56, font: 'bold 32px "Trebuchet MS", sans-serif' }); const sw = Math.min(bw * 0.9, 0.34 * t2.aspect); g.add(bx(sw + 0.08, 0.34, 0.08, '#2a2622', 0, 0.55, 0), panel(sw, 0.28, t2.material, 0, 0.58, 0.05, { cast: false })); }
  return done(g);
}
export const bigsign = (p, ctx) => bigBoard(p, ctx, typeof p.color === 'string' ? mute(p.color, 0.45) : '#2f4a3a', 1.25);
export const roadsign = (p, ctx) => {
  const w = p.w || 4; const h = p.h || 1;
  const bw = Math.min(w - 0.2, 3.2); const bh = Math.min(0.9, bw * 0.3);
  const t1 = plate(ctx, p.text || 'ROAD', { bg: '#2f5a44', fg: '#f4f1e4', border: '#f4f1e4', h: 84, font: 'bold 50px "Trebuchet MS", sans-serif' });
  const g = group(w / 2, 0, h / 2, cy(0.06, 2.0, IRON, -bw / 2 + 0.3, 0, 0, { seg: 6 }), cy(0.06, 2.0, IRON, bw / 2 - 0.3, 0, 0, { seg: 6 }), bx(bw + 0.08, bh + 0.08, 0.08, '#d8d4c8', 0, 1.0, 0), panel(bw, bh, t1.material, 0, 1.04, 0.05, { cast: false }), panel(bw, bh, mat('#2f5a44'), 0, 1.04, -0.05, { cast: false, ry: Math.PI }));
  if (p.sub) { const t2 = plate(ctx, p.sub, { bg: '#d8d4c8', fg: '#2a2a2a', h: 56, font: 'bold 32px "Trebuchet MS", sans-serif' }); const sw = Math.min(bw, 0.3 * t2.aspect); g.add(bx(sw + 0.06, 0.3, 0.07, '#8d9297', 0, 1.95, 0), panel(sw, 0.26, t2.material, 0, 1.97, 0.045, { cast: false })); }
  return done(g);
};

export function noticeboard(p) {
  const w = p.w || 1;
  const bw = Math.min(1.4, w * 0.9 + 0.1);
  const g = group(w / 2, 0, 0.5, cy(0.05, 1.6, DWOOD, -bw / 2 + 0.1, 0, 0, { seg: 6 }), cy(0.05, 1.6, DWOOD, bw / 2 - 0.1, 0, 0, { seg: 6 }), bx(bw, 0.85, 0.08, '#7a5a3e', 0, 0.7, 0), bx(bw - 0.14, 0.7, 0.09, '#b89a6a', 0, 0.77, 0, { cast: false }), bx(bw + 0.1, 0.07, 0.24, '#5a4030', 0, 1.55, 0));
  for (let i = 0; i < Math.max(3, Math.round(bw * 4)); i++) g.add(bx(0.2, 0.26, 0.1, pick(['#f4f1e4', '#f2e6a0', '#cfe0f0', '#f0c8c0'], hash(i, p.x, p.y)), -bw / 2 + 0.28 + (i % Math.max(3, Math.round(bw * 2.5))) * 0.3, 0.95 - Math.floor(i / 3) * 0.3, 0.02, { cast: false }));
  return done(g);
}

export function busstop(p, ctx) {
  const g = group(0.5, 0, 0.5, bx(1.2, 0.08, 0.9, '#3f5a4a', 0, 2.1, 0), bx(1.24, 0.05, 0.94, shade('#3f5a4a', 12), 0, 2.18, 0, { cast: false }),
    cy(0.04, 2.1, IRON, -0.55, 0, -0.38, { seg: 5 }), cy(0.04, 2.1, IRON, 0.55, 0, -0.38, { seg: 5 }), cy(0.04, 2.1, IRON, -0.55, 0, 0.38, { seg: 5 }), cy(0.04, 2.1, IRON, 0.55, 0, 0.38, { seg: 5 }),
    panel(1.06, 1.5, glass(), 0, 0.4, -0.38, { cast: false }), panel(1.06, 1.5, glass(), 0, 0.4, -0.38, { cast: false, ry: Math.PI }),
    bx(0.9, 0.07, 0.3, WOOD, 0, 0.46, -0.2), bx(0.07, 0.46, 0.07, IRON, -0.38, 0, -0.2), bx(0.07, 0.46, 0.07, IRON, 0.38, 0, -0.2));
  const t = plate(ctx, String(p.lines || '1'), { bg: '#2f6b4f', fg: '#fff', font: 'bold 54px sans-serif', pad: 22 });
  g.add(bx(0.4, 0.4, 0.05, '#2f6b4f', 0.55, 1.5, 0.4), panel(0.34, 0.34, t.material, 0.55, 1.53, 0.43, { cast: false }));
  return done(g, { lights: [{ x: 0, y: 1.9, z: 0, color: '#dfeaff', intensity: 3, distance: 5 }] });
}

export function trafficlight(p, ctx) {
  const axis = p.corner === 'nw' || p.corner === 'se' ? 'ew' : 'ns';
  const names = ['red', 'amber', 'green'];
  const cols = { red: '#ff3b2f', amber: '#ffb02e', green: '#3fe07a' };
  const mats = {}; for (const n of names) mats[n] = [mat(shade(cols[n], -140)), mat(cols[n], { emissive: cols[n], ei: 2.4 })];
  const lamps = names.map((n, i) => noBake(bx(0.17, 0.15, 0.17, mats[n][0], 0, 2.38 - i * 0.24 - 0.02, 0, { cast: false })));
  // the lamp boxes poke through both the south and the east face of the head
  const heads = lamps.map((l) => { l.scale.set(0.39, 0.15, 0.39); return l; });
  const walk = noBake(bx(0.14, 0.14, 0.14, mat('#2a2c30'), 0.2, 1.62, 0.06, { cast: false }));
  const g = group(0.5, 0, 0.5, cy(0.12, 0.22, IRON, 0, 0, 0, { seg: 8 }), cy(0.045, 2.6, '#3a3e44', 0, 0, 0, { seg: 6 }), bx(0.3, 0.82, 0.3, '#1c1f24', 0, 2.0, 0), bx(0.34, 0.05, 0.34, '#e8c35a', 0, 2.8, 0), bx(0.18, 0.2, 0.18, '#1c1f24', 0.1, 1.55, 0.06), ...heads, walk);
  done(g);
  g.userData.update = (q, c) => {
    const t = c.game?.realTime ?? clockOf(c);
    const s = lightState(q, t)[axis];
    for (let i = 0; i < 3; i++) { const m = mats[names[i]][s === names[i] ? 1 : 0]; if (lamps[i].material !== m) lamps[i].material = m; }
    const w = walkSignal(q, axis, t); const lit = w === 'walk' || (w === 'flash' && Math.floor(t * 3) % 2 === 0);
    const wm = w === 'wait' ? WAIT : lit ? WALK : OFF; if (walk.material !== wm) walk.material = wm;
  };
  g.userData.lights = [{ x: 0.5, y: 2.2, z: 0.5, color: '#ffb02e', intensity: 1.5, distance: 4 }];
  g.userData.update(p, ctx || {}, 0);
  return g;
}
const WAIT = mat('#ff6a3a', { emissive: '#ff6a3a', ei: 2 }); const WALK = mat('#f2f2e8', { emissive: '#f2f2e8', ei: 2 }); const OFF = mat('#2a2c30');

export function flagpole(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.3) : pick(['#2f4a8a', '#8a2f3a', '#2f6b4f', '#c9a43a'], rnd(p));
  return done(group(0.5, 0, 0.5, cy(0.15, 0.2, CONC, 0, 0, 0, { seg: 8 }), cy(0.045, 5.0, '#c9ccd0', 0, 0, 0, { seg: 6 }), sphere(0.07, BRASS, 0, 5.0, 0, { seg: 6 }),
    bx(0.7, 0.45, 0.03, col, 0.38, 4.4, 0, { double: true }), bx(0.7, 0.12, 0.035, '#f0ead8', 0.38, 4.62, 0, { double: true })));
}

export function gatepost() {
  return done(group(0.5, 0, 0.5, bx(0.5, 1.6, 0.5, '#a59a86'), bx(0.64, 0.12, 0.64, '#8f8572', 0, 1.6, 0), bl(0.2, '#8f8572', 0, 1.78, 0, { detail: 0 }), bx(0.56, 0.1, 0.56, '#8f8572', 0, 0, 0)));
}

export function ranchpost() {
  return done(group(0.5, 0, 0.5, bx(0.3, 2.4, 0.3, '#6a4a2e'), bx(0.12, 2.4, 0.3, '#7e5a38', -0.1, 0, 0), bx(0.4, 0.1, 0.4, '#4a3420', 0, 2.4, 0), bx(0.06, 0.06, 0.5, '#4a3420', 0, 1.9, 0.3, { rx: 0.6 }), bx(0.5, 0.16, 0.5, '#5a3e26', 0, 0, 0)));
}

export function statue(p) {
  const [w, h] = size(p, 2, 2);
  const br = '#6f8573'; const stone = '#aaa59a';
  const bw = Math.min(w, h) - 0.3;
  const g = group(w / 2, 0, h / 2, bx(Math.min(w, bw + 0.3) - 0.1, 0.12, Math.min(h, bw + 0.3) - 0.1, '#98938a'), bx(bw, 0.85, bw, stone, 0, 0.12, 0), bx(bw + 0.1, 0.1, bw + 0.1, '#98938a', 0, 0.97, 0),
    bx(0.22, 0.65, 0.22, br, -0.1, 1.07, 0), bx(0.22, 0.65, 0.22, br, 0.1, 1.07, 0), bx(0.48, 0.7, 0.3, br, 0, 1.72, 0), bx(0.28, 0.3, 0.28, br, 0, 2.42, 0), bx(0.16, 0.5, 0.16, br, -0.32, 1.9, 0, { rz: 0.1 }), bx(0.16, 0.7, 0.16, br, 0.32, 1.85, 0, { rz: -0.35 }), bx(0.1, 0.1, 0.1, '#d9c07a', 0.5, 2.5, 0),
    bx(0.4, 0.2, 0.03, BRASS, 0, 0.55, bw / 2 + 0.02, { cast: false }));
  return done(g);
}

export function tent(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.35) : pick(['#7a8a5a', '#6a7a8a', '#a08a5a'], rnd(p));
  return done(oriented(p, 2, 1, (L, D) => [prism(L - 0.1, 0.95, D - 0.1, col, 0, 0), prism(L - 0.04, 0.12, D * 0.4, shade(col, -40), 0, 0, D / 2 - 0.06, { cast: false }), bx(0.04, 0.5, 0.04, '#5a4a3a', -L / 2 + 0.08, 0, D / 2 - 0.02), bx(0.04, 0.5, 0.04, '#5a4a3a', L / 2 - 0.08, 0, D / 2 - 0.02), bx(0.5, 0.35, 0.03, '#2a2622', 0, 0, (D - 0.1) / 4 + 0.03, { cast: false })]));
}

export function laundry(p) {
  const [w, h] = size(p, 3, 1);
  const g = group(0, 0, h / 2, bx(0.07, 1.9, 0.07, '#5a4a3a', 0.1, 0, 0), bx(0.07, 1.9, 0.07, '#5a4a3a', w - 0.1, 0, 0), bx(w - 0.2, 0.02, 0.02, '#d8d0c0', w / 2, 1.8, 0, { cast: false }));
  const colors = ['#c0614a', '#e8e2d4', '#4a6a8a', '#d9a23a', '#6a8a5a'];
  for (let i = 0; i < Math.floor(w * 1.4); i++) g.add(bx(0.24, 0.3 + (i % 3) * 0.08, 0.03, colors[(i + p.x) % 5], 0.35 + i * (w - 0.7) / Math.max(1, Math.floor(w * 1.4)), 1.45 - (i % 3) * 0.08, 0, { double: true, cast: false }));
  return done(g);
}

export function crosswalk(p) {
  const [w, h] = size(p, 1, 4);
  const g = group();
  const m = mat('#eeece2', { opacity: 0.8 });
  if (p.vertical) for (let i = 0.15; i < w - 0.1; i += 0.25) g.add(flat(0.14, h - 0.1, m, i + 0.07, h / 2, 0.025));
  else for (let j = 0.15; j < h - 0.1; j += 0.25) g.add(flat(w - 0.1, 0.14, m, w / 2, j + 0.07, 0.025));
  return done(g);
}

export function booth(p, ctx) {
  const g = group(0.5, 0, 0.5, bx(0.96, 0.9, 0.96, '#d6d0c0'), bx(0.9, 0.04, 0.9, '#a8a294', 0, 0.9, 0), panel(0.84, 0.7, glass('#9fc0d0', 0.45), 0, 0.94, 0.46, { cast: false }), panel(0.84, 0.7, glass('#9fc0d0', 0.45), 0, 0.94, 0.46, { cast: false, ry: Math.PI }),
    bx(0.04, 0.7, 0.04, '#5a4a3e', -0.45, 0.94, 0.46), bx(0.04, 0.7, 0.04, '#5a4a3e', 0.45, 0.94, 0.46), bx(0.04, 0.7, 0.04, '#5a4a3e', -0.45, 0.94, -0.46), bx(0.04, 0.7, 0.04, '#5a4a3e', 0.45, 0.94, -0.46),
    bx(1.1, 0.1, 1.1, '#5a4a3e', 0, 1.64, 0), bx(0.5, 0.1, 0.02, '#c9a43a', 0, 0.5, 0.49, { cast: false }));
  return done(g, { lights: [{ x: 0.5, y: 1.4, z: 0.5, color: '#ffe0a8', intensity: 3, distance: 5 }] });
}

export function fountain(p) {
  const [w, h] = size(p, 2, 2);
  const r = Math.min(w, h) / 2 - 0.04;
  const g = group(w / 2, 0, h / 2, cy(r, 0.4, '#b9b3a6', 0, 0, 0, { seg: 20 }), cy(r - 0.12, 0.06, '#4f93ad', 0, 0.36, 0, { seg: 20, cast: false, opacity: 0.9 }), cy(r * 0.12 + 0.05, 1.0, '#a9a396', 0, 0.3, 0, { seg: 10 }),
    cy(r * 0.42, 0.12, '#b9b3a6', 0, 1.15, 0, { seg: 14 }), cy(r * 0.34, 0.04, '#6fb0c8', 0, 1.27, 0, { seg: 14, cast: false }), cy(0.07, 0.4, '#9fd0e4', 0, 1.3, 0, { seg: 8, opacity: 0.7, cast: false }), bl(0.14, '#cfe8f0', 0, 1.75, 0, { detail: 0, opacity: 0.8, cast: false }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.add(bl(0.07, '#cfe8f0', Math.cos(a) * r * 0.55, 0.5, Math.sin(a) * r * 0.55, { detail: 0, opacity: 0.7, cast: false })); }
  return done(g);
}

export function boat(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.3) : rnd(p) > 0.5 ? '#3d6a8a' : '#a04a3a';
  return done(oriented(p, 2, 1, (L, D) => [bx(L - 0.1, 0.36, D - 0.2, col, 0, 0.0, 0), bx(L - 0.3, 0.1, D - 0.4, '#d9cfb8', 0, 0.34, 0), bx(0.18, 0.05, D - 0.34, WOOD, -L * 0.15, 0.4, 0), bx(0.18, 0.05, D - 0.34, WOOD, L * 0.15, 0.4, 0),
    bx(0.4, 0.3, D - 0.2, shade(col, -14), L / 2 - 0.1, 0.05, 0), cyx(0.025, 0.9, DWOOD, 0.0, 0.62, D / 2 - 0.05, { seg: 4, rz: 0.2 })]));
}

export function marquee_pylon(p, ctx) {
  const t = plate(ctx, p.text || 'GRAND', { bg: '#1a1620', fg: '#ffd24a', border: '#ffd24a', h: 72, font: 'bold 44px Georgia, serif', glow: 0.8 });
  const g = group(0.5, 0, 0.5, bx(0.5, 0.3, 0.5, '#2a2630'), bx(0.34, 3.0, 0.26, '#1a1620', 0, 0.3, 0), bx(0.5, 0.08, 0.4, BRASS, 0, 3.3, 0), panel(0.9, 0.5, t.material, 0, 2.6, 0.17, { cast: false }));
  g.add(bx(0.95, 0.56, 0.1, '#14101a', 0, 2.57, 0.0), panel(0.84, 0.46, t.material, 0, 2.62, 0.06, { cast: false }));
  for (let i = 0; i < 5; i++) g.add(bl(0.06, '#ffd24a', -0.42 + i * 0.21, 3.25, 0.06, { detail: 0, emissive: '#ffd24a', ei: 2, cast: false }));
  return done(g, { lights: [{ x: 0.5, y: 2.8, z: 1.0, color: '#ffd080', intensity: 6, distance: 6 }] });
}

export function valet_stand() {
  return done(group(0.5, 0, 0.5, bx(0.7, 0.9, 0.5, '#2a2630'), bx(0.76, 0.06, 0.56, BRASS, 0, 0.9, 0), bx(0.5, 0.04, 0.3, '#14101a', 0, 0.96, 0, { rx: -0.3 }), bx(0.06, 0.3, 0.03, '#5a4a3a', 0.3, 0.55, 0.28), bx(0.05, 0.1, 0.03, BRASS, 0.3, 0.45, 0.3), bx(0.6, 0.18, 0.03, '#d9c07a', 0, 0.55, 0.26, { cast: false }), cy(0.03, 1.2, BRASS, -0.3, 0.9, -0.2, { seg: 6 })));
}

export function pillar(p) {
  return done(group(0.5, 0, 0.5, bx(0.86, 0.22, 0.86, '#14101a'), bx(0.7, 0.1, 0.7, BRASS, 0, 0.22, 0), cy(0.3, 3.0, '#1c1822', 0, 0.32, 0, { seg: 14 }), cy(0.31, 0.12, BRASS, 0, 1.0, 0, { seg: 14 }), cy(0.31, 0.12, BRASS, 0, 2.2, 0, { seg: 14 }), cy(0.36, 0.1, BRASS, 0, 3.3, 0, { seg: 14 }), bx(0.86, 0.14, 0.86, '#14101a', 0, 3.4, 0)));
}

export function fence(p, ctx) {
  return run(p, ctx, (m) => {
    const a = arms(m, p);
    const g = group();
    const post = () => g.add(bx(0.1, 1.05, 0.1, '#ded7c6', 0.5, 0, 0.5), bx(0.13, 0.04, 0.13, '#f0ead8', 0.5, 1.05, 0.5));
    if (a.ew) { for (const y of [0.3, 0.72]) g.add(bx(a.x1 - a.x0, 0.07, 0.05, '#d5cebd', (a.x0 + a.x1) / 2, y, 0.5)); for (let x = Math.ceil((a.x0 + 0.05) * 4) / 4; x < a.x1; x += 0.25) g.add(bx(0.13, 0.86, 0.035, '#ebe5d6', x, 0, 0.5 + 0.045), bx(0.13, 0.05, 0.035, '#f6f0e2', x, 0.86, 0.545)); }
    if (a.ns) { for (const y of [0.3, 0.72]) g.add(bx(0.05, 0.07, a.z1 - a.z0, '#d5cebd', 0.5, y, (a.z0 + a.z1) / 2)); for (let z = Math.ceil((a.z0 + 0.05) * 4) / 4; z < a.z1; z += 0.25) g.add(bx(0.035, 0.86, 0.13, '#ebe5d6', 0.5 + 0.045, 0, z), bx(0.035, 0.05, 0.13, '#f6f0e2', 0.545, 0.86, z)); }
    if (a.end || (p.x + p.y) % 3 === 0) post();
    return g;
  });
}

export function chainfence(p, ctx) {
  const mesh = mat('#c4c8d0', { opacity: 0.32, double: true });
  return run(p, ctx, (m, cx, cz, t) => {
    const a = arms(m, p);
    const g = group();
    if (a.ew) { g.add(bx(a.x1 - a.x0, 1.55, 0.02, mesh, (a.x0 + a.x1) / 2, 0.1, 0.5, { cast: false }), bx(a.x1 - a.x0, 0.05, 0.05, '#9aa0aa', (a.x0 + a.x1) / 2, 1.65, 0.5), bx(a.x1 - a.x0, 0.03, 0.03, '#7a808a', (a.x0 + a.x1) / 2, 0.1, 0.5)); if (p.razor) for (let x = a.x0 + 0.1; x < a.x1; x += 0.2) g.add(bx(0.16, 0.12, 0.02, '#c4c8d0', x, 1.7, 0.5, { cast: false })); }
    if (a.ns) { g.add(bx(0.02, 1.55, a.z1 - a.z0, mesh, 0.5, 0.1, (a.z0 + a.z1) / 2, { cast: false }), bx(0.05, 0.05, a.z1 - a.z0, '#9aa0aa', 0.5, 1.65, (a.z0 + a.z1) / 2), bx(0.03, 0.03, a.z1 - a.z0, '#7a808a', 0.5, 0.1, (a.z0 + a.z1) / 2)); if (p.razor) for (let z = a.z0 + 0.1; z < a.z1; z += 0.2) g.add(bx(0.02, 0.12, 0.16, '#c4c8d0', 0.5, 1.7, z, { cast: false })); }
    if (a.end || (t.gx + t.gy) % 3 === 0) g.add(bx(0.08, 1.75, 0.08, '#6e747e', 0.5, 0, 0.5));
    return g;
  });
}

export const BUILDERS = { fence, chainfence, streetlamp, bench, hydrant, mailbox, trash, dumpster, bollard, crate, barrel, barrelfire, sign, bigsign, roadsign, noticeboard, busstop, trafficlight, flagpole, gatepost, ranchpost, statue, tent, laundry, crosswalk, booth, fountain, boat, marquee_pylon, valet_stand, pillar };
