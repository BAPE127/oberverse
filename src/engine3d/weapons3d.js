// Weapons as real low-poly models for the 3D scene. One model per weapon `look` (src/engine/drawPixelWeapons.js), built from a
// few boxes and tubes in one vertex-coloured geometry (plus an optional emissive one), cached per look.
//
// Model frame (units: tiles, as the rest of engine3d): the origin is where the hand closes on it, the barrel or business
// end points along +z, up is +y, the stock or handle's end lies toward -z. A model record:
//   { look, kind: 'one' | 'two' | 'launcher' | 'melee', geo, glow, muzzle: [x,y,z], fore: [x,y,z] | null, eject: [x,y,z], tip: [x,y,z], len, glowColor }
// `muzzle` is where flash and tracer start (guns); `fore` is where the other hand rests on a long gun; `tip` is the business
// end of a melee weapon. `poseOf` says where the hand holds it for walking, aiming and swinging; people3d.js poses the arms.
//
// DOM-free: nothing here touches `document` (the test builds every model in Node).
import { THREE, Mesher } from './lib3d.js';
import { lookOf, weaponLooks } from '../engine/drawPixelWeapons.js';
import { FUTURE_LOOKS } from '../content/futureArms.js';

export { lookOf };

const STEEL = '#4a4a56';
const DARK = '#2a2a32';
const GUN = '#3a3a44';
const HI = '#8a8a98';
const WOOD = '#7a4a2a';
const WOOD_HI = '#a87448';
const GOLD = '#e8b830';

/** A box/tube builder with centre-based boxes that may be tilted about x then y. */
class Parts {
  constructor() { this.m = new Mesher(); }

  /** Append another mesher's triangles, turned (rx about x, then ry about y) and moved to (x, y, z). */
  add(t, x, y, z, rx = 0, ry = 0) {
    const cx = Math.cos(rx); const sx = Math.sin(rx); const cy = Math.cos(ry); const sy = Math.sin(ry);
    const rot = (px, py, pz) => { const y1 = py * cx - pz * sx; const z1 = py * sx + pz * cx; return [px * cy + z1 * sy, y1, -px * sy + z1 * cy]; };
    for (let i = 0; i < t.pos.length; i += 3) {
      const p = rot(t.pos[i], t.pos[i + 1], t.pos[i + 2]);
      const n = rot(t.nor[i], t.nor[i + 1], t.nor[i + 2]);
      this.m.pos.push(x + p[0], y + p[1], z + p[2]);
      this.m.nor.push(n[0], n[1], n[2]);
      this.m.col.push(t.col[i], t.col[i + 1], t.col[i + 2]);
    }
    return this;
  }

  /** A box w (x) × h (y) × d (z) centred on (x, y, z). */
  b(w, h, d, color, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
    const t = new Mesher();
    t.box(w, h, d, color, 0, -h / 2, 0);
    return this.add(t, x, y, z, rx, ry);
  }

  /** A tube along z, radius r at the back and r2 at the front, centred on (x, y, z). */
  tube(r, len, color, x = 0, y = 0, z = 0, o = {}) {
    const seg = o.seg || 8; const r2 = o.r2 ?? r; const h = len / 2;
    const t = new Mesher();
    t.c.set(color);
    const tri = (a, b, c, n) => {
      const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
      const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
      const cr = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0; // (wound so the front face looks outward)
      for (const q of flip ? [a, c, b] : [a, b, c]) { t.pos.push(q[0], q[1], q[2]); t.nor.push(n[0], n[1], n[2]); t.col.push(t.c.r, t.c.g, t.c.b); }
    };
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2; const a1 = ((i + 1) / seg) * Math.PI * 2; const am = (a0 + a1) / 2;
      const n = [Math.cos(am), Math.sin(am), 0];
      const B0 = [Math.cos(a0) * r, Math.sin(a0) * r, -h]; const B1 = [Math.cos(a1) * r, Math.sin(a1) * r, -h];
      const F0 = [Math.cos(a0) * r2, Math.sin(a0) * r2, h]; const F1 = [Math.cos(a1) * r2, Math.sin(a1) * r2, h];
      tri(B0, B1, F1, n); tri(B0, F1, F0, n);
      if (r2 > 0.0005) tri([0, 0, h], F0, F1, [0, 0, 1]);
      tri([0, 0, -h], B1, B0, [0, 0, -1]);
    }
    return this.add(t, x, y, z, o.rx || 0, o.ry || 0);
  }

  build() { return this.m.pos.length ? this.m.build() : null; }
}

// ---------------------------------------------------------------------------------------------------------------- the models
// Each builder gets (p = body parts, g = emissive parts) and returns { kind, muzzle?, fore?, eject?, tip?, len }.
const BUILD = {
  // ---- one-handed guns
  pistol: (p) => {
    p.b(0.05, 0.075, 0.27, STEEL, 0, 0.05, 0.11).b(0.045, 0.04, 0.22, DARK, 0, 0.0, 0.1);
    p.b(0.048, 0.13, 0.065, DARK, 0, -0.06, -0.01, 0.2).b(0.03, 0.03, 0.05, DARK, 0, -0.025, 0.07).b(0.012, 0.045, 0.012, DARK, 0, -0.03, 0.07);
    p.b(0.014, 0.022, 0.016, DARK, 0, 0.1, 0.235).b(0.026, 0.022, 0.016, DARK, 0, 0.1, -0.005).b(0.02, 0.02, 0.012, '#1a1a22', 0, 0.05, 0.25);
    return { kind: 'one', muzzle: [0, 0.055, 0.255], eject: [0.03, 0.08, 0.06], len: 0.27 };
  },
  revolver: (p) => {
    p.tube(0.024, 0.22, STEEL, 0, 0.05, 0.14, { seg: 8 }).tube(0.05, 0.07, '#6a6a78', 0, 0.045, 0.02, { seg: 8 });
    p.b(0.034, 0.05, 0.1, STEEL, 0, 0.06, 0.02).b(0.022, 0.04, 0.025, DARK, 0, 0.1, -0.03, -0.4).b(0.012, 0.016, 0.012, DARK, 0, 0.082, 0.245);
    p.b(0.044, 0.13, 0.06, WOOD, 0, -0.055, -0.02, 0.3).b(0.046, 0.016, 0.062, WOOD_HI, 0, -0.01, -0.03, 0.3);
    return { kind: 'one', muzzle: [0, 0.05, 0.255], eject: [0.03, 0.05, 0.0], len: 0.26 };
  },
  goldenhandshake: (p, g) => {
    p.tube(0.03, 0.2, GOLD, 0, 0.05, 0.14, { seg: 8 }).tube(0.052, 0.07, GOLD, 0, 0.045, 0.02, { seg: 8 });
    p.b(0.04, 0.05, 0.1, GOLD, 0, 0.06, 0.02).b(0.044, 0.12, 0.06, '#f2efe6', 0, -0.055, -0.02, 0.3).b(0.05, 0.03, 0.07, GOLD, 0, 0.01, -0.03, 0.3);
    p.b(0.07, 0.05, 0.08, '#f2efe6', 0, -0.13, -0.045).b(0.074, 0.01, 0.084, GOLD, 0, -0.105, -0.045);
    g.b(0.016, 0.016, 0.016, '#ff4a8a', 0, 0.105, 0.0);
    return { kind: 'one', muzzle: [0, 0.05, 0.255], eject: [0.03, 0.05, 0.0], len: 0.27 };
  },
  nailgun: (p) => {
    p.b(0.07, 0.1, 0.26, '#f2c14e', 0, 0.045, 0.06).b(0.04, 0.05, 0.1, DARK, 0, 0.04, 0.22).b(0.014, 0.014, 0.05, '#c9ced4', 0, 0.045, 0.3);
    p.b(0.05, 0.12, 0.06, DARK, 0, -0.06, -0.01, 0.2).b(0.045, 0.14, 0.07, '#c9ced4', 0, -0.05, 0.12, -0.2).b(0.047, 0.016, 0.072, '#8a9098', 0, -0.1, 0.13, -0.2);
    return { kind: 'one', muzzle: [0, 0.045, 0.33], eject: [0.04, 0.06, 0.05], len: 0.33 };
  },
  goldphone: (p, g) => {
    p.b(0.07, 0.025, 0.13, GOLD, 0, 0.0, 0.05).b(0.05, 0.005, 0.1, '#1a1a22', 0, 0.015, 0.05).b(0.012, 0.012, 0.05, '#fff0a0', 0, 0.02, 0.135);
    g.b(0.05, 0.006, 0.095, '#6ac8f0', 0, 0.018, 0.05);
    return { kind: 'one', muzzle: [0, 0.01, 0.13], eject: [0, 0, 0], len: 0.13 };
  },
  phone: (p, g) => {
    p.b(0.065, 0.02, 0.12, '#16161e', 0, 0.0, 0.05);
    g.b(0.05, 0.006, 0.09, '#6ac8f0', 0, 0.012, 0.05);
    return { kind: 'one', muzzle: [0, 0.01, 0.12], eject: [0, 0, 0], len: 0.12 };
  },
  // ---- two-handed guns
  smg: (p) => {
    p.b(0.065, 0.1, 0.34, GUN, 0, 0.05, 0.18).b(0.05, 0.1, 0.07, DARK, 0, -0.045, 0.0, 0.15).b(0.04, 0.17, 0.05, DARK, 0, -0.1, 0.22, 0.05);
    p.b(0.03, 0.025, 0.18, STEEL, 0, 0.07, 0.4).tube(0.014, 0.12, DARK, 0, 0.07, 0.5, { seg: 6 }).b(0.03, 0.03, 0.05, DARK, 0, 0.015, 0.4);
    p.b(0.012, 0.026, 0.3, DARK, 0, 0.0, -0.17).b(0.035, 0.06, 0.012, DARK, 0, 0.0, -0.32).b(0.014, 0.022, 0.016, DARK, 0, 0.115, 0.3);
    return { kind: 'two', muzzle: [0, 0.07, 0.565], fore: [0, -0.015, 0.4], eject: [0.035, 0.09, 0.14], len: 0.56 };
  },
  shotgun: (p) => {
    p.b(0.06, 0.1, 0.34, WOOD, 0, 0.0, -0.22, 0.12).b(0.05, 0.02, 0.34, WOOD_HI, 0, 0.05, -0.22, 0.12);
    p.b(0.065, 0.09, 0.2, GUN, 0, 0.045, 0.05).tube(0.026, 0.62, STEEL, 0, 0.055, 0.42, { seg: 8 }).tube(0.02, 0.5, DARK, 0, 0.0, 0.36, { seg: 6 });
    p.b(0.055, 0.06, 0.18, WOOD, 0, 0.005, 0.32).b(0.057, 0.014, 0.18, WOOD_HI, 0, 0.037, 0.32).b(0.012, 0.02, 0.014, '#c9ced4', 0, 0.092, 0.7);
    p.b(0.03, 0.03, 0.05, DARK, 0, -0.03, 0.07);
    return { kind: 'two', muzzle: [0, 0.055, 0.73], fore: [0, -0.03, 0.32], eject: [0.035, 0.07, 0.05], len: 0.8 };
  },
  rifle: (p) => {
    p.b(0.06, 0.11, 0.36, WOOD, 0, -0.005, -0.22, 0.1).b(0.05, 0.02, 0.36, WOOD_HI, 0, 0.05, -0.22, 0.1);
    p.b(0.058, 0.09, 0.3, WOOD, 0, 0.03, 0.12).b(0.052, 0.014, 0.3, WOOD_HI, 0, 0.078, 0.12).tube(0.02, 0.5, STEEL, 0, 0.06, 0.55, { seg: 8 });
    p.tube(0.028, 0.2, DARK, 0, 0.12, 0.12, { seg: 8 }).b(0.014, 0.05, 0.014, DARK, 0, 0.09, 0.05).b(0.014, 0.05, 0.014, DARK, 0, 0.09, 0.2);
    p.b(0.02, 0.016, 0.07, '#c9ced4', 0.04, 0.06, 0.02).b(0.03, 0.03, 0.06, DARK, 0, -0.02, 0.06);
    return { kind: 'two', muzzle: [0, 0.06, 0.8], fore: [0, 0.0, 0.34], eject: [0.035, 0.08, 0.05], len: 1.0 };
  },
  ar: (p) => {
    p.b(0.055, 0.1, 0.3, DARK, 0, 0.0, -0.2, 0.08).b(0.05, 0.012, 0.3, STEEL, 0, 0.055, -0.2, 0.08);
    p.b(0.07, 0.115, 0.34, GUN, 0, 0.05, 0.1).b(0.075, 0.03, 0.2, '#7a7a88', 0, 0.115, 0.1).b(0.014, 0.03, 0.014, DARK, 0, 0.145, 0.19).b(0.02, 0.035, 0.02, DARK, 0, 0.145, -0.02);
    p.b(0.075, 0.075, 0.3, '#4a4a3a', 0, 0.05, 0.4).b(0.077, 0.014, 0.3, '#6a6a52', 0, 0.093, 0.4).tube(0.015, 0.2, DARK, 0, 0.05, 0.64, { seg: 6 }).tube(0.02, 0.05, DARK, 0, 0.05, 0.74, { seg: 6 });
    p.b(0.04, 0.17, 0.06, DARK, 0, -0.09, 0.2, 0.3).b(0.036, 0.1, 0.05, DARK, 0, -0.07, 0.01, 0.25);
    return { kind: 'two', muzzle: [0, 0.05, 0.77], fore: [0, 0.0, 0.42], eject: [0.04, 0.09, 0.08], len: 0.82 };
  },
  sniper: (p) => {
    p.b(0.06, 0.11, 0.38, '#3a4a3a', 0, 0.0, -0.24, 0.08).b(0.05, 0.02, 0.38, '#5a6a52', 0, 0.056, -0.24, 0.08).b(0.04, 0.05, 0.1, '#3a4a3a', 0, -0.05, -0.38);
    p.b(0.065, 0.1, 0.34, '#3a4a3a', 0, 0.04, 0.12).tube(0.016, 0.8, STEEL, 0, 0.06, 0.7, { seg: 8 }).tube(0.026, 0.07, DARK, 0, 0.06, 1.12, { seg: 8 });
    p.tube(0.038, 0.36, DARK, 0, 0.155, 0.12, { seg: 10 }).tube(0.05, 0.05, DARK, 0, 0.155, 0.32, { seg: 10 }).tube(0.045, 0.05, DARK, 0, 0.155, -0.08, { seg: 10 });
    p.b(0.02, 0.07, 0.025, DARK, 0, 0.1, 0.0).b(0.02, 0.07, 0.025, DARK, 0, 0.1, 0.25);
    p.b(0.012, 0.13, 0.012, DARK, -0.03, -0.05, 0.62, 0, 0.2, ).b(0.012, 0.13, 0.012, DARK, 0.03, -0.05, 0.62);
    return { kind: 'two', muzzle: [0, 0.06, 1.16], fore: [0, 0.0, 0.42], eject: [0.035, 0.09, 0.05], len: 1.18 };
  },
  lmg: (p) => {
    p.b(0.065, 0.1, 0.3, DARK, 0, -0.005, -0.2, 0.06).b(0.075, 0.12, 0.42, GUN, 0, 0.055, 0.1).b(0.078, 0.02, 0.4, '#7a7a88', 0, 0.12, 0.1);
    p.tube(0.034, 0.34, STEEL, 0, 0.06, 0.48, { seg: 8 }).tube(0.015, 0.18, DARK, 0, 0.06, 0.72, { seg: 6 }).tube(0.022, 0.05, DARK, 0, 0.06, 0.83, { seg: 6 });
    p.b(0.09, 0.12, 0.14, '#5a5a3a', 0, -0.09, 0.14).b(0.092, 0.014, 0.14, '#7a7a52', 0, -0.03, 0.14).b(0.05, 0.03, 0.04, '#c9a24a', -0.065, -0.02, 0.1);
    p.b(0.012, 0.15, 0.012, DARK, -0.035, -0.04, 0.68).b(0.012, 0.15, 0.012, DARK, 0.035, -0.04, 0.68).b(0.03, 0.035, 0.1, DARK, 0, 0.155, 0.12);
    p.b(0.04, 0.1, 0.06, DARK, 0, -0.06, 0.0, 0.25);
    return { kind: 'two', muzzle: [0, 0.06, 0.86], fore: [0, -0.01, 0.4], eject: [-0.04, 0.06, 0.1], len: 0.9 };
  },
  // ---- launchers
  rpg: (p) => {
    p.tube(0.058, 0.95, '#5a6a3a', 0, 0.1, 0.27, { seg: 10 }).tube(0.062, 0.12, DARK, 0, 0.1, -0.2, { seg: 10, r2: 0.09 }).tube(0.07, 0.04, '#7a8a52', 0, 0.1, 0.5, { seg: 10 });
    p.tube(0.082, 0.17, '#c0302a', 0, 0.1, 0.76, { seg: 10, r2: 0.03 }).tube(0.03, 0.08, DARK, 0, 0.1, 0.89, { seg: 6, r2: 0.01 });
    p.b(0.04, 0.12, 0.06, DARK, 0, -0.01, 0.0, 0.2).b(0.035, 0.12, 0.05, DARK, 0, 0.0, 0.26, -0.15).b(0.03, 0.04, 0.12, DARK, 0.05, 0.19, 0.24).b(0.012, 0.05, 0.014, DARK, 0.05, 0.22, 0.31);
    return { kind: 'launcher', muzzle: [0, 0.1, 0.94], fore: [0, -0.02, 0.28], eject: [0, 0.1, -0.28], len: 1.2 };
  },
  // ---- melee (handle at the grip, head along +z)
  crowbar: (p) => {
    p.tube(0.016, 0.62, '#c03030', 0, 0, 0.2, { seg: 6 }).tube(0.02, 0.06, '#e86060', 0, 0, -0.1, { seg: 6 });
    p.b(0.03, 0.03, 0.12, '#c03030', 0, 0.035, 0.5, -0.45).b(0.026, 0.024, 0.07, '#a02424', 0, 0.07, 0.56, -0.9).b(0.03, 0.02, 0.06, '#8a1c1c', 0, -0.012, -0.12);
    return { kind: 'melee', tip: [0, 0.05, 0.56], len: 0.62 };
  },
  baton: (p) => {
    p.tube(0.02, 0.5, '#1e1e26', 0, 0, 0.15, { seg: 8 }).tube(0.026, 0.14, '#2a2a34', 0, 0, -0.04, { seg: 8 }).b(0.012, 0.07, 0.012, '#1e1e26', 0, 0.04, 0.03);
    return { kind: 'melee', tip: [0, 0, 0.4], len: 0.5 };
  },
  bat: (p) => {
    p.tube(0.016, 0.28, '#d0d0d8', 0, 0, -0.02, { seg: 6 }).tube(0.022, 0.2, WOOD_HI, 0, 0, 0.21, { seg: 8, r2: 0.034 }).tube(0.034, 0.3, WOOD_HI, 0, 0, 0.46, { seg: 8, r2: 0.044 });
    p.tube(0.03, 0.04, '#8a5a34', 0, 0, 0.63, { seg: 8, r2: 0.01 });
    return { kind: 'melee', tip: [0, 0, 0.62], len: 0.66 };
  },
  machete: (p) => {
    p.b(0.03, 0.036, 0.15, '#3a2a1e', 0, 0, 0.0).b(0.012, 0.07, 0.014, '#c9a24a', 0, 0, 0.08);
    p.b(0.012, 0.075, 0.5, '#c9ced4', 0, 0.01, 0.34).b(0.012, 0.09, 0.14, '#c9ced4', 0, 0.015, 0.64, 0.1).b(0.004, 0.012, 0.42, '#ffffff', 0, 0.045, 0.34);
    return { kind: 'melee', tip: [0, 0.02, 0.72], len: 0.72 };
  },
  fireaxe: (p) => {
    p.tube(0.02, 0.62, WOOD_HI, 0, 0, 0.2, { seg: 8 }).tube(0.026, 0.08, '#8a5a34', 0, 0, -0.08, { seg: 8 });
    p.b(0.05, 0.2, 0.16, '#c0302a', 0, 0.015, 0.5).b(0.012, 0.25, 0.08, '#c9ced4', 0, 0.015, 0.6).b(0.05, 0.05, 0.1, '#c0302a', 0, -0.1, 0.44).b(0.03, 0.04, 0.04, '#8a1c1c', 0, 0.115, 0.46);
    return { kind: 'melee', tip: [0, 0.01, 0.64], len: 0.66 };
  },
  knuckles: (p) => {
    p.b(0.1, 0.045, 0.06, '#c9a24a', 0, 0.0, 0.07).b(0.1, 0.01, 0.06, '#f0d070', 0, 0.026, 0.07);
    for (let i = -1; i <= 1; i++) p.tube(0.016, 0.04, '#c9a24a', i * 0.032, 0.0, 0.1, { seg: 6 });
    return { kind: 'melee', tip: [0, 0, 0.11], len: 0.12, fist: true };
  },
  rollingpin: (p) => {
    p.tube(0.03, 0.3, '#e8c898', 0, 0, 0.2, { seg: 10 }).tube(0.012, 0.1, WOOD, 0, 0, 0.0, { seg: 6 }).tube(0.012, 0.1, WOOD, 0, 0, 0.4, { seg: 6 });
    p.tube(0.034, 0.02, '#d8b888', 0, 0, 0.12, { seg: 10 });
    return { kind: 'melee', tip: [0, 0, 0.44], len: 0.46 };
  },
  plunger: (p) => {
    p.tube(0.014, 0.5, GOLD, 0, 0, 0.18, { seg: 6 }).tube(0.018, 0.06, '#fff0a0', 0, 0, -0.06, { seg: 6 });
    p.tube(0.07, 0.07, '#c03030', 0, 0, 0.5, { seg: 10, r2: 0.025 }).tube(0.075, 0.015, '#e86060', 0, 0, 0.545, { seg: 10 });
    return { kind: 'melee', tip: [0, 0, 0.56], len: 0.58 };
  },
  tuningfork: (p) => {
    p.tube(0.016, 0.22, '#c9ced4', 0, 0, 0.03, { seg: 6 });
    p.b(0.012, 0.012, 0.3, '#e8eef4', 0, 0.04, 0.3).b(0.012, 0.012, 0.3, '#e8eef4', 0, -0.04, 0.3).b(0.012, 0.1, 0.012, '#c9ced4', 0, 0, 0.14);
    return { kind: 'melee', tip: [0, 0, 0.45], len: 0.46 };
  },
  gavel: (p) => {
    p.tube(0.02, 0.4, WOOD, 0, 0, 0.12, { seg: 8 }).tube(0.026, 0.06, WOOD_HI, 0, 0, -0.06, { seg: 8 });
    p.b(0.12, 0.1, 0.2, '#5a3420', 0, 0, 0.36, 0, 1.5708).b(0.124, 0.014, 0.05, GOLD, 0, 0, 0.28, 0, 1.5708).b(0.124, 0.014, 0.05, GOLD, 0, 0, 0.44, 0, 1.5708).b(0.1, 0.02, 0.2, '#8a5a34', 0, 0.055, 0.36, 0, 1.5708);
    return { kind: 'melee', tip: [0, 0, 0.46], len: 0.5 };
  },
  // ---- the special weapons
  confetti: (p) => {
    p.b(0.07, 0.09, 0.2, '#e86ab0', 0, 0.0, -0.04).b(0.072, 0.014, 0.2, '#ff9ad0', 0, 0.05, -0.04).tube(0.045, 0.3, '#6ad0e8', 0, 0.04, 0.2, { seg: 10 });
    p.tube(0.049, 0.02, '#f2e05a', 0, 0.04, 0.12, { seg: 10 }).tube(0.049, 0.02, '#f2e05a', 0, 0.04, 0.26, { seg: 10 }).tube(0.075, 0.12, '#f2a33a', 0, 0.04, 0.41, { seg: 10, r2: 0.045 });
    p.b(0.04, 0.12, 0.06, '#7a3a9a', 0, -0.06, -0.02, 0.2);
    return { kind: 'two', muzzle: [0, 0.04, 0.5], fore: [0, -0.01, 0.2], eject: [0, 0.06, 0.0], len: 0.52 };
  },
  pigeon: (p) => {
    p.b(0.09, 0.09, 0.3, '#8a8a96', 0, 0.04, 0.15).b(0.092, 0.012, 0.3, '#b0b0ba', 0, 0.09, 0.15).b(0.07, 0.07, 0.07, '#9a9aa6', 0, 0.09, 0.34).b(0.012, 0.014, 0.05, '#e8a040', 0, 0.085, 0.4);
    p.b(0.012, 0.012, 0.012, '#2a2a32', 0.033, 0.11, 0.37).b(0.012, 0.012, 0.012, '#2a2a32', -0.033, 0.11, 0.37).b(0.2, 0.012, 0.12, '#6a6a76', 0, 0.08, 0.12).b(0.05, 0.05, 0.1, '#5a5a66', 0, 0.0, -0.1);
    p.b(0.04, 0.12, 0.06, DARK, 0, -0.06, -0.01, 0.2).b(0.014, 0.02, 0.02, '#6ab08a', 0, 0.025, 0.4);
    return { kind: 'two', muzzle: [0, 0.07, 0.43], fore: [0, 0.0, 0.2], eject: [0, 0.07, 0.0], len: 0.46 };
  },
  mackerel: (p) => {
    p.b(0.07, 0.11, 0.42, '#8ab0c8', 0, 0.05, 0.2).b(0.072, 0.014, 0.42, '#d0e8f0', 0, 0.11, 0.2).b(0.06, 0.08, 0.1, '#8ab0c8', 0, 0.05, 0.46).b(0.012, 0.012, 0.012, '#14141e', 0.036, 0.08, 0.5);
    p.b(0.01, 0.12, 0.08, '#4a7aa8', 0, 0.05, -0.08, 0.5).b(0.01, 0.12, 0.08, '#4a7aa8', 0, 0.05, -0.08, -0.5).b(0.014, 0.05, 0.07, '#4a7aa8', 0, 0.14, 0.12);
    p.b(0.04, 0.12, 0.06, DARK, 0, -0.06, -0.01, 0.2);
    return { kind: 'two', muzzle: [0, 0.05, 0.52], fore: [0, -0.02, 0.2], eject: [0, 0.05, 0.0], len: 0.55 };
  },
  pythagorean: (p) => {
    p.b(0.05, 0.05, 0.18, '#2a3028', 0, 0.0, -0.02).b(0.04, 0.25, 0.04, '#2a3028', 0, 0.14, 0.05).b(0.04, 0.04, 0.5, '#2a3028', 0, 0.025, 0.28).b(0.03, 0.03, 0.3, '#2a3028', 0, 0.16, 0.2, -0.76);
    for (let i = 0; i < 4; i++) p.b(0.012, 0.012, 0.2 - i * 0.04, '#e8e8e0', 0.026, 0.06 + i * 0.045, 0.1 + (0.2 - i * 0.04) / 2 - 0.1);
    p.b(0.03, 0.03, 0.05, DARK, 0, 0.01, 0.56).b(0.04, 0.12, 0.06, WOOD, 0, -0.06, 0.0, 0.2);
    return { kind: 'two', muzzle: [0, 0.03, 0.56], fore: [0, 0.03, 0.3], eject: [0, 0.05, 0.1], len: 0.6 };
  },
  tinfoil: (p, g) => {
    p.b(0.08, 0.1, 0.28, '#c9ced4', 0, 0.04, 0.06).b(0.082, 0.014, 0.28, '#ffffff', 0, 0.094, 0.06).b(0.06, 0.08, 0.12, '#9aa0a8', 0, 0.04, 0.26).b(0.04, 0.12, 0.06, '#9aa0a8', 0, -0.06, -0.01, 0.2);
    p.tube(0.03, 0.12, '#c9ced4', 0, 0.04, 0.37, { seg: 8 }).b(0.012, 0.1, 0.012, '#c9ced4', 0, 0.14, 0.0).b(0.014, 0.014, 0.014, '#ff5a5a', 0, 0.19, 0.0);
    g.tube(0.022, 0.03, '#5aff8a', 0, 0.04, 0.43, { seg: 8 });
    return { kind: 'two', muzzle: [0, 0.04, 0.45], fore: [0, -0.01, 0.2], eject: [0, 0.06, 0.0], len: 0.46 };
  },
  harpoon: (p) => {
    p.b(0.07, 0.11, 0.3, '#8a5a34', 0, 0.0, -0.1, 0.1).b(0.07, 0.1, 0.26, '#c9a24a', 0, 0.04, 0.18).b(0.072, 0.012, 0.26, '#f0d070', 0, 0.092, 0.18);
    p.tube(0.012, 0.5, '#c9ced4', 0, 0.06, 0.55, { seg: 6 }).b(0.014, 0.08, 0.04, '#c9ced4', 0, 0.06, 0.82, 0, 0, ).tube(0.022, 0.07, '#c9ced4', 0, 0.06, 0.84, { seg: 6, r2: 0.002 });
    p.b(0.04, 0.12, 0.05, DARK, 0, -0.06, 0.12, 0.1);
    return { kind: 'two', muzzle: [0, 0.06, 0.88], fore: [0, -0.01, 0.34], eject: [0, 0.06, 0.1], len: 0.9 };
  },
  cheddar: (p) => {
    p.b(0.05, 0.1, 0.18, WOOD, 0, -0.01, -0.06, 0.1).b(0.11, 0.12, 0.22, '#f2c14e', 0, 0.05, 0.14).b(0.112, 0.014, 0.22, '#ffe08a', 0, 0.112, 0.14);
    p.b(0.114, 0.03, 0.03, '#c8902a', 0, 0.08, 0.1).b(0.114, 0.03, 0.03, '#c8902a', 0, 0.03, 0.2).b(0.114, 0.025, 0.025, '#c8902a', 0, 0.06, 0.04);
    p.tube(0.025, 0.2, STEEL, 0, 0.05, 0.36, { seg: 8 }).b(0.04, 0.12, 0.06, DARK, 0, -0.06, 0.0, 0.2);
    return { kind: 'two', muzzle: [0, 0.05, 0.47], fore: [0, 0.0, 0.2], eject: [0, 0.07, 0.1], len: 0.5 };
  },
  deadmanshand: (p, g) => {
    p.b(0.1, 0.09, 0.26, '#4a1e6a', 0, 0.02, 0.06).b(0.102, 0.014, 0.26, '#7a3aa8', 0, 0.068, 0.06).b(0.104, 0.014, 0.26, GOLD, 0, -0.02, 0.06);
    p.b(0.06, 0.14, 0.04, GOLD, 0, 0.09, 0.2);
    for (let i = -2; i <= 2; i++) p.b(0.1, 0.12, 0.008, '#f6f2e8', 0, 0.22, 0.22, i * 0.1, 0).b(0.03, 0.03, 0.01, i % 2 ? '#c8242c' : '#14141e', 0, 0.22 + Math.cos(i * 0.1) * 0.0, 0.226, i * 0.1);
    p.b(0.04, 0.12, 0.06, DARK, 0, -0.06, 0.0, 0.2);
    return { kind: 'two', muzzle: [0, 0.14, 0.26], fore: [0, 0.0, 0.16], eject: [0, 0.07, 0.0], len: 0.32 };
  },
};

// the energy families (pulse, plasma, rail, ion; src/content/futureArms.js): the same hands-and-body proportions, a glowing element in the family colour
function energyGun(spec, p, g) {
  const heavy = spec.kind === 'heavy';
  const L = Math.max(0.66, Math.min(1.12, (spec.len / 24) * 1.0));
  const body = heavy ? '#5a6274' : spec.body || '#8e96a6';
  const dark = heavy ? '#3a4050' : '#5a6274';
  const w = heavy ? 0.095 : 0.075;
  p.b(0.055, 0.1, 0.26, dark, 0, 0.0, -0.18, 0.08);
  p.b(w, 0.12, L * 0.46, body, 0, 0.05, L * 0.1).b(w + 0.004, 0.014, L * 0.4, '#c8ced8', 0, 0.115, L * 0.1);
  p.tube(heavy ? 0.052 : 0.036, L * 0.5, dark, 0, 0.05, L * 0.62, { seg: 8, r2: heavy ? 0.04 : 0.028 });
  p.b(0.04, 0.16, 0.06, dark, 0, -0.085, 0.16, 0.3).b(0.046, 0.1, 0.07, '#3a3f4a', 0, -0.07, L * 0.22);
  if (spec.scope) p.tube(0.03, 0.26, DARK, 0, 0.17, L * 0.18, { seg: 8 });
  g.b(w + 0.01, 0.014, L * 0.34, spec.glow, 0, 0.082, L * 0.18);
  g.tube(heavy ? 0.056 : 0.04, 0.03, spec.glow, 0, 0.05, L * 0.4, { seg: 8 });
  g.tube(heavy ? 0.045 : 0.032, 0.025, spec.glow, 0, 0.05, L * 0.98, { seg: 8 });
  g.b(0.05, 0.05, 0.012, spec.glow, 0, -0.07, L * 0.22 + 0.04);
  return { kind: 'two', muzzle: [0, 0.05, L * 0.98 + 0.03], fore: [0, 0.0, L * 0.46], eject: [0.04, 0.09, 0.06], len: L };
}
function energyLauncher(spec, p, g) {
  const L = Math.max(0.9, Math.min(1.2, spec.len / 22 * 1.0));
  p.tube(spec.tubes === 2 ? 0.045 : 0.062, L, '#5a6274', spec.tubes === 2 ? -0.05 : 0, 0.1, L * 0.28, { seg: 10 });
  if (spec.tubes === 2) p.tube(0.045, L, '#5a6274', 0.05, 0.1, L * 0.28, { seg: 10 });
  p.tube(0.075, 0.12, DARK, 0, 0.1, -0.2, { seg: 10, r2: 0.1 }).tube(0.07, 0.14, '#8e96a6', 0, 0.1, L * 0.5, { seg: 10 });
  p.b(0.04, 0.12, 0.06, DARK, 0, -0.01, 0.0, 0.2).b(0.035, 0.12, 0.05, DARK, 0, 0.0, 0.26, -0.15).b(0.03, 0.04, 0.12, DARK, 0.06, 0.2, 0.24);
  g.tube(0.07, 0.03, spec.glow, 0, 0.1, -0.25, { seg: 10 });
  g.tube(0.072, 0.03, spec.glow, 0, 0.1, L * 0.5 + 0.1, { seg: 10 });
  g.tube(0.05, 0.03, spec.glow, 0, 0.1, L * 0.28 + L / 2, { seg: 10 });
  return { kind: 'launcher', muzzle: [0, 0.1, L * 0.28 + L / 2 + 0.03], fore: [0, -0.02, 0.28], eject: [0, 0.1, -0.28], len: L + 0.25 };
}

// ---------------------------------------------------------------------------------------------------------------- hold keys
/**
 * The key a figure holds: the item's `look`, plus the future arms' family when the item is one (the open world gives them the
 * 'ar' and 'rpg' looks, so the item id says which glow, size and scope). null when nothing is equipped.
 */
export function holdKeyOf(item, id = null) {
  const look = lookOf(item);
  if (!look) return null;
  const f = FUTURE_LOOKS[id ?? item?.id];
  if (f && (look === 'ar' || look === 'rpg')) return [look, f.kind, f.glow, f.len, f.scope ? 1 : 0, f.tubes || 1].join('~');
  return look;
}

/** { look, spec }: spec is set for an energy family key. */
export function parseHold(key) {
  const [look, kind, glow, len, scope, tubes] = String(key).split('~');
  if (kind === undefined) return { look, spec: null };
  return { look, spec: { kind, glow, len: Number(len), scope: scope === '1', tubes: Number(tubes) || 1, body: kind === 'heavy' ? '#6a7284' : '#8e96a6' } };
}

// ---------------------------------------------------------------------------------------------------------------- cache
const cache = new Map();
let glowMaterial = null;
/** The one emissive material of every model's glowing parts (shared, never disposed). */
export function glowMat() {
  if (!glowMaterial) { glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); glowMaterial.userData.keep = true; }
  return glowMaterial;
}

const finish = (geo) => { if (geo) geo.userData.keep = true; return geo; };

/** The model of a hold key (a look, or an energy family key). Always returns a model: an unknown look is a plain club. */
export function modelFor(key) {
  let m = cache.get(key);
  if (m) return m;
  const { look, spec } = parseHold(key);
  const p = new Parts(); const g = new Parts();
  let info;
  if (spec) info = look === 'rpg' ? energyLauncher(spec, p, g) : energyGun(spec, p, g);
  else info = (BUILD[look] || BUILD.baton)(p, g);
  const geo = finish(p.build()); const glow = finish(g.build());
  const kind = info.kind;
  m = {
    key, look, kind, geo, glow, glowColor: spec?.glow || null, len: info.len,
    muzzle: info.muzzle || null, fore: info.fore || null, eject: info.eject || info.muzzle || [0, 0.06, 0],
    tip: info.tip || info.muzzle || [0, 0, info.len], fist: Boolean(info.fist), grip: [0, 0, 0],
  };
  cache.set(key, m);
  return m;
}

/** The bare hand (nothing equipped): only the swing pose uses it. */
export const FIST = Object.freeze({ kind: 'melee', fist: true, look: null });

/** Every look that has a hand-built model (the test compares this with `weaponLooks()`). */
export const modelledLooks = () => Object.keys(BUILD);
export { weaponLooks };

// ---------------------------------------------------------------------------------------------------------------- how it is held
const ease = (t) => t * t * (3 - 2 * t);

/**
 * Where the main hand holds the model, in the figure's body frame (x to the side the weapon arm is on, y up from the feet,
 * z forward; the shoulder is at (0.27 W, 0.86, 0)). Returns { g: [x, y, z] the hand, yaw, pitch (about y, then up), two: the other hand takes the fore grip }.
 *   mode 'carry'  walking or standing: one-handers low, long guns across the hip, launchers on the shoulder, melee at the side
 *   mode 'aim'    raised and pointing along the figure's facing
 *   mode 'swing'  melee: `t` 0..1 through the swing, `arc` the half-angle (radians); a fist punches
 */
export function poseOf(model, mode, o = {}) {
  const W = o.W || 1;
  const sx = 0.27 * W;
  switch (model.kind) {
    case 'one':
      if (mode === 'aim') return { g: [sx - 0.1, 0.78, 0.4], yaw: -0.04, pitch: 0, two: false };
      return { g: [sx - 0.04, 0.54, 0.24], yaw: 0, pitch: -0.5, two: false };
    case 'two':
      if (mode === 'aim') return { g: [sx - 0.17, 0.8, 0.17], yaw: -0.02, pitch: 0, two: true };
      return { g: [sx - 0.11, 0.58, 0.12], yaw: -0.28, pitch: 0.5, two: true };
    case 'launcher':
      if (mode === 'aim') return { g: [sx - 0.06, 0.74, 0.12], yaw: 0, pitch: 0.04, two: true };
      return { g: [sx - 0.02, 0.72, 0.1], yaw: -0.1, pitch: 0.3, two: true };
    default: { // melee
      if (mode === 'swing') {
        const t = ease(Math.max(0, Math.min(1, o.t ?? 0)));
        const half = Math.min(1.35, (o.arc ?? 0.8) * 0.95);
        const th = half * (1 - 2 * t); // from the weapon side across the front
        if (model.fist) return { g: [sx - 0.14 * (1 - t) - 0.02, 0.84, 0.26 + 0.2 * Math.sin(t * Math.PI)], yaw: 0, pitch: 0, two: false };
        return { g: [sx - 0.18 + 0.2 * Math.sin(th), 0.8, 0.12 + 0.16 * Math.cos(th)], yaw: th, pitch: 0.18 - 0.5 * Math.sin(t * Math.PI) * 0.3, two: false };
      }
      if (model.fist) return { g: [sx, 0.43, 0.05], yaw: 0, pitch: 0.3, two: false };
      return { g: [sx + 0.0, 0.54, 0.1], yaw: 0, pitch: 1.0, two: false };
    }
  }
}
