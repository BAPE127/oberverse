// Neumina's megacity kit: neon signs, holograms, access nodes, drone pads, skybus shelters and night-market stalls.
// Neon is lit day and night here (no sun-tied glow), so every glowing part is simply emissive. Static parts are merged by
// `done`; the few animated ones are flagged noBake and move in userData.update. Visual randomness comes from the prop id.
import { bx, cy, sphere, panel, glass, mat, shade, group, done, noBake, plate, clockOf, hash, strHash, IRON, THREE } from './kit.js';
import { sharedGeometry } from '../lib3d.js';

const DARK = '#14151d';
const DARK2 = '#1d1f2a';
/** A glowing material of colour c. */
const E = (c, ei = 2.4) => mat(c, { emissive: c, ei });
const colorOf = (p, def) => (typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : def);
const idHash = (p, k = 0) => hash(strHash(String(p.id || p.type)), k + 3, 7);
const mesh = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = false; return noBake(o); };

export function holo_billboard(p, ctx) {
  const c = colorOf(p, '#ff3fb4');
  const g = group(1, 0, 0.5, bx(0.6, 0.18, 0.45, DARK2), bx(0.2, 4.5, 0.2, DARK, 0, 0.18, 0), bx(0.34, 0.1, 0.34, DARK2, 0, 4.5, 0),
    bx(1.9, 1.5, 0.1, DARK, 0, 2.85, 0), bx(0.06, 0.5, 0.06, IRON, -0.7, 2.4, 0), bx(0.06, 0.5, 0.06, IRON, 0.7, 2.4, 0));
  if (p.text) {
    const t = plate(ctx, p.text, { bg: '#0a0a14', fg: c, border: c, h: 72, font: 'bold 44px "Trebuchet MS", sans-serif', glow: 0.8 });
    g.add(panel(1.78, 1.38, t.material, 0, 2.91, 0.06, { cast: false }));
  } else {
    g.add(panel(1.78, 1.38, E(c, 1.8), 0, 2.91, 0.06, { cast: false }));
    for (let i = 0; i < 4; i++) { const w = 0.3 + hash(i, 5, 1) * 0.9; g.add(bx(w, 0.12, 0.02, shade(c, -90), -0.8 + w / 2 + hash(i, 9, 2) * 0.1, 3.35 - i * 0.28, 0.07, { cast: false })); }
  }
  g.add(bx(1.9, 0.04, 0.12, E(c), 0, 4.32, 0.01, { cast: false }), bx(1.9, 0.04, 0.12, E(c), 0, 2.82, 0.01, { cast: false }));
  const scan = noBake(bx(1.74, 0.05, 0.02, E('#ffffff', 1.6), 0, 2.95, 0.075, { cast: false }));
  g.add(scan);
  done(g);
  const ph = idHash(p) * 6;
  g.userData.update = (q, cx) => { const t = clockOf(cx) * 0.5 + ph; scan.position.y = 2.95 + (t % 1) * 1.3; scan.visible = Math.sin(clockOf(cx) * 23 + ph) > -0.85; };
  g.userData.lights = [{ x: 1, y: 3.6, z: 0.9, color: c, intensity: 4, distance: 7 }];
  return g;
}

export function neon_sign(p) {
  const c = colorOf(p, '#4dfcff'); const e = E(c);
  const g = group(0.5, 0, 0.5, cy(0.1, 0.12, DARK2, -0.3, 0, 0, { seg: 8 }), cy(0.04, 3.2, DARK, -0.3, 0, 0, { seg: 6 }),
    bx(0.38, 0.05, 0.05, IRON, -0.12, 2.75, 0), bx(0.38, 0.05, 0.05, IRON, -0.12, 1.55, 0),
    bx(0.4, 1.7, 0.08, DARK, 0.18, 1.2, 0),
    bx(0.46, 0.04, 0.12, e, 0.18, 2.9, 0, { cast: false }), bx(0.46, 0.04, 0.12, e, 0.18, 1.16, 0, { cast: false }),
    bx(0.04, 1.78, 0.12, e, -0.04, 1.14, 0, { cast: false }), bx(0.04, 1.78, 0.12, e, 0.4, 1.14, 0, { cast: false }));
  const n = 3 + Math.floor(idHash(p) * 3);
  for (let i = 0; i < n; i++) g.add(bx(0.1 + hash(i, 3, 4) * 0.16, 0.07, 0.12, e, 0.1 + hash(i, 6, 1) * 0.1, 1.45 + i * 0.28, 0, { cast: false }));
  return done(g);
}

export function holo_ad(p) {
  const c = colorOf(p, '#7af7ff');
  const hm = mat(c, { emissive: c, ei: 1.5, opacity: 0.5 }); hm.depthWrite = false;
  const k = Math.floor(idHash(p) * 3);
  const holo = group(0, 0.95, 0);
  const add = (geo, x, y, z, sx, sy, sz, rx = 0, rz = 0) => { const m = mesh(geo, hm, x, y, z, sx, sy, sz); m.rotation.x = rx; m.rotation.z = rz; holo.add(m); };
  if (k === 0) { const tor = sharedGeometry('neon_ring', () => new THREE.TorusGeometry(0.3, 0.03, 5, 18)); for (let i = 0; i < 3; i++) add(tor, 0, i * 0.24, 0, 1 - i * 0.18, 1 - i * 0.18, 1 - i * 0.18, Math.PI / 2); }
  else if (k === 1) add(sharedGeometry('neon_crystal', () => new THREE.OctahedronGeometry(0.28, 0)), 0, 0.3, 0, 0.8, 1.5, 0.8);
  else { add(sharedGeometry('neon_fishbody', () => new THREE.SphereGeometry(0.2, 8, 6)), 0, 0.3, 0, 1.5, 0.8, 0.5); add(sharedGeometry('neon_fishtail', () => new THREE.ConeGeometry(0.14, 0.26, 4)), -0.34, 0.3, 0, 1, 1, 0.3, 0, Math.PI / 2); }
  const g = group(0.5, 0, 0.5, cy(0.36, 0.1, DARK2, 0, 0, 0, { seg: 12 }), cy(0.28, 0.04, E(c, 1.8), 0, 0.1, 0, { seg: 12, cast: false }), cy(0.07, 0.2, DARK, 0, 0.1, 0, { seg: 6 }), holo);
  done(g);
  const ph = idHash(p, 1) * 6;
  g.userData.update = (q, cx) => { const t = clockOf(cx); holo.rotation.y = t * 0.8 + ph; holo.position.y = 0.95 + Math.sin(t * 1.2 + ph) * 0.05; };
  return g;
}

export function data_pylon(p) {
  const c = '#4dfcff';
  const g = group(0.5, 0, 0.5, bx(0.56, 0.1, 0.46, DARK2), bx(0.42, 0.85, 0.32, DARK, 0, 0.1, 0), bx(0.46, 0.06, 0.36, DARK2, 0, 0.95, 0),
    bx(0.3, 0.22, 0.02, E(c, 1.8), 0, 0.62, 0.17, { cast: false, rx: -0.2 }), bx(0.34, 0.26, 0.02, DARK2, 0, 0.6, 0.165, { cast: false }));
  for (let i = 0; i < 4; i++) g.add(bx(0.05, 0.04, 0.02, E(i % 2 ? '#ff3fb4' : c), -0.12 + i * 0.08, 0.4, 0.165, { cast: false }));
  g.add(bx(0.12, 0.03, 0.02, DARK2, 0, 0.3, 0.165, { cast: false }), bx(0.02, 0.5, 0.02, E(c), 0.215, 0.3, 0.12, { cast: false }));
  return done(g);
}

export function security_camera(p) {
  const on = E('#ff2a2a', 3); const off = mat('#4a1414');
  const led = noBake(bx(0.05, 0.05, 0.05, on, 0, 0.1, 0.2, { cast: false }));
  const head = group(0, 3.0, 0.1, noBake(bx(0.2, 0.15, 0.34, '#2a2d36', 0, 0, -0.1)), noBake(bx(0.14, 0.1, 0.04, '#0a0a10', 0, 0.025, 0.08, { cast: false })), noBake(bx(0.06, 0.06, 0.02, E('#7a9fff', 1.5), 0, 0.045, 0.1, { cast: false })), led);
  const g = group(0.5, 0, 0.5, cy(0.12, 0.3, DARK2, 0, 0, 0, { seg: 8 }), cy(0.04, 3.0, DARK, 0, 0, 0, { seg: 6 }), bx(0.1, 0.1, 0.1, DARK2, 0, 2.95, 0), head);
  done(g);
  const ph = idHash(p) * 6;
  g.userData.update = (q, cx) => { const t = clockOf(cx); head.rotation.y = Math.sin(t * 0.4 + ph) * 0.7; const m = Math.floor(t * 1.2 + ph) % 3 === 0 ? on : off; if (led.material !== m) led.material = m; };
  return g;
}

export function drone_pad(p) {
  const c = '#ffb02e';
  const e = E(c, 2.2); const rot = E('#7af7ff', 1.8);
  const g = group(1, 0, 1, bx(1.9, 0.06, 1.9, DARK2, 0, 0, 0), cy(0.66, 0.02, DARK, 0, 0.06, 0, { seg: 20, cast: false }), cy(0.6, 0.03, e, 0, 0.06, 0, { seg: 20, cast: false }), cy(0.54, 0.04, DARK, 0, 0.06, 0, { seg: 20, cast: false }),
    bx(0.1, 0.08, 0.1, e, -0.82, 0.06, -0.82, { cast: false }), bx(0.1, 0.08, 0.1, e, 0.82, 0.06, -0.82, { cast: false }), bx(0.1, 0.08, 0.1, e, -0.82, 0.06, 0.82, { cast: false }), bx(0.1, 0.08, 0.1, e, 0.82, 0.06, 0.82, { cast: false }));
  const drone = group(0, 0.6, 0, noBake(bx(0.22, 0.07, 0.22, '#2a2d36', 0, 0, 0)), noBake(bx(0.5, 0.03, 0.04, DARK, 0, 0.02, 0, { ry: Math.PI / 4 })), noBake(bx(0.5, 0.03, 0.04, DARK, 0, 0.02, 0, { ry: -Math.PI / 4 })), noBake(bx(0.06, 0.04, 0.03, E('#ff2a2a', 2.5), 0, 0.01, 0.12, { cast: false })));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) drone.add(noBake(cy(0.1, 0.012, rot, x, 0.07, z, { seg: 8, cast: false })));
  g.add(drone);
  done(g);
  const ph = idHash(p) * 6;
  g.userData.update = (q, cx) => { const t = clockOf(cx); drone.position.y = 0.6 + Math.sin(t * 1.6 + ph) * 0.07; drone.rotation.y = Math.sin(t * 0.3 + ph) * 0.4; };
  return g;
}

export function neon_lamp(p) {
  const c = colorOf(p, '#9fdcff');
  const g = group(0.5, 0, 0.5, cy(0.12, 0.25, DARK2, 0, 0, 0, { seg: 8 }), cy(0.035, 3.5, DARK, 0, 0, 0, { seg: 6 }), bx(0.1, 0.1, 0.1, DARK2, 0, 3.4, 0),
    bx(0.72, 0.06, 0.12, DARK2, 0, 3.5, 0), bx(0.66, 0.06, 0.09, E(c, 3), 0, 3.46, 0, { cast: false }));
  return done(g, { lights: [{ x: 0.5, y: 3.3, z: 0.5, color: c, intensity: 7, distance: 8 }] });
}

export function glow_planter(p) {
  const g = group(1, 0, 0.5, bx(1.9, 0.4, 0.7, DARK2), bx(1.94, 0.05, 0.74, DARK, 0, 0.4, 0), bx(1.74, 0.04, 0.54, '#0d0e14', 0, 0.43, 0));
  const cols = ['#2ff5d0', '#a064ff', '#4dfcff'];
  for (let i = 0; i < 9; i++) {
    const x = -0.8 + i * 0.2 + (hash(i, 1, 1) - 0.5) * 0.08; const z = (hash(i, 2, 1) - 0.5) * 0.4; const h = 0.3 + hash(i, 3, 1) * 0.5; const c = cols[i % 3];
    g.add(cy(0.015, h, '#1f5a52', x, 0.45, z, { seg: 4 }), sphere(0.05 + hash(i, 4, 1) * 0.03, E(c, 2.6), x, 0.45 + h, z, { seg: 5, cast: false }));
  }
  return done(g);
}

export function vent_stack(p) {
  const steam = noBake(sphere(0.14, mat('#cfd8e0', { opacity: 0.3 }), 0.5, 1.9, 0.5, { seg: 6, cast: false }));
  const g = group(0.5, 0, 0.5, bx(0.7, 0.2, 0.7, DARK2), cy(0.25, 1.6, '#2b2e38', 0, 0.2, 0, { seg: 10 }), cy(0.3, 0.1, DARK2, 0, 1.75, 0, { seg: 10 }), cy(0.26, 0.05, '#0d0e14', 0, 1.85, 0, { seg: 10, cast: false }),
    bx(0.4, 0.04, 0.02, '#0d0e14', 0, 0.55, 0.245, { cast: false }), bx(0.4, 0.04, 0.02, '#0d0e14', 0, 0.7, 0.245, { cast: false }), bx(0.4, 0.04, 0.02, '#0d0e14', 0, 0.85, 0.245, { cast: false }), bx(0.4, 0.04, 0.02, '#0d0e14', 0, 1.0, 0.245, { cast: false }),
    bx(0.1, 0.1, 0.06, E('#ffb02e', 2.8), 0.2, 1.3, 0.2, { cast: false }));
  steam.position.set(0, 1.9, 0);
  g.add(steam);
  done(g);
  const ph = idHash(p) * 6;
  g.userData.update = (q, cx) => { const t = (clockOf(cx) * 0.3 + ph) % 1; steam.position.y = 1.9 + t * 0.9; const s = 0.6 + t * 1.2; steam.scale.set(s, s, s); steam.visible = t < 0.95; };
  return g;
}

export function transit_shelter(p) {
  const c = '#4dfcff';
  const g = group(1.5, 0, 0.5, bx(0.06, 2.3, 0.06, DARK, -1.42, 0, -0.36), bx(0.06, 2.3, 0.06, DARK, 1.42, 0, -0.36), bx(0.06, 2.3, 0.06, DARK, -1.42, 0, 0.36), bx(0.06, 2.3, 0.06, DARK, 1.42, 0, 0.36),
    bx(2.96, 0.06, 0.92, DARK2, 0, 2.3, 0), bx(2.9, 0.03, 0.86, glass('#9fe8ff', 0.4), 0, 2.36, 0, { cast: false }), bx(2.96, 0.04, 0.05, E(c, 2), 0, 2.28, 0.45, { cast: false }),
    panel(2.8, 1.6, glass('#9fe8ff', 0.3), 0, 0.5, -0.36, { cast: false }), panel(2.8, 1.6, glass('#9fe8ff', 0.3), 0, 0.5, -0.36, { cast: false, ry: Math.PI }),
    bx(1.5, 0.07, 0.34, '#3a3d4a', -0.3, 0.45, -0.12), bx(0.07, 0.45, 0.28, DARK, -0.95, 0, -0.12), bx(0.07, 0.45, 0.28, DARK, 0.35, 0, -0.12),
    bx(0.7, 1.05, 0.05, DARK, 1.0, 0.7, -0.31), bx(0.62, 0.9, 0.02, E(c, 1.7), 1.0, 0.78, -0.275, { cast: false }));
  for (let i = 0; i < 4; i++) g.add(bx(0.46, 0.06, 0.02, DARK, 1.0, 0.95 + i * 0.17 - 0.1, -0.26, { cast: false }), bx(0.1, 0.06, 0.02, E('#ff3fb4'), 0.8, 0.95 + i * 0.17 - 0.1, -0.255, { cast: false }));
  return done(g);
}

export function vend_neo(p) {
  const c = ['#ff3fb4', '#4dfcff', '#ffb02e'][Math.floor(idHash(p) * 3)];
  const g = group(0.5, 0, 0.5, bx(0.74, 1.5, 0.56, DARK, 0, 0, 0), bx(0.78, 0.06, 0.6, DARK2, 0, 1.5, 0), bx(0.6, 1.05, 0.03, E(c, 2.2), -0.04, 0.35, 0.285, { cast: false }), bx(0.1, 0.9, 0.04, DARK2, 0.28, 0.4, 0.28), bx(0.5, 0.18, 0.03, '#0a0a10', -0.04, 0.12, 0.29, { cast: false }), bx(0.12, 0.06, 0.03, E('#ffffff', 1.5), 0.28, 1.2, 0.3, { cast: false }));
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) g.add(bx(0.1, 0.1, 0.02, shade(c, -80 + ((r * 3 + q) % 3) * 70), -0.2 + q * 0.16, 0.5 + r * 0.22, 0.3, { cast: false }));
  return done(g);
}

export function market_stall_neo(p) {
  const c = colorOf(p, '#ff3fb4'); const e = E(c);
  const g = group(1, 0, 0.5, bx(1.8, 0.8, 0.5, '#2a2630', 0, 0, -0.05), bx(1.86, 0.05, 0.56, DARK, 0, 0.8, -0.05), bx(0.06, 1.9, 0.06, IRON, -0.9, 0, -0.38), bx(0.06, 1.9, 0.06, IRON, 0.9, 0, -0.38), bx(0.06, 1.6, 0.06, IRON, -0.9, 0, 0.4), bx(0.06, 1.6, 0.06, IRON, 0.9, 0, 0.4),
    bx(1.94, 0.06, 0.9, DARK2, 0, 1.9, 0, { rx: 0.12 }), bx(1.94, 0.05, 0.05, e, 0, 1.84, 0.44, { cast: false }), bx(0.05, 0.05, 0.84, e, -0.97, 1.88, 0, { cast: false }), bx(0.05, 0.05, 0.84, e, 0.97, 1.88, 0, { cast: false }),
    bx(0.34, 0.3, 0.3, '#6a4a36', -0.7, 0, 0.32), bx(0.3, 0.26, 0.3, '#7a5a42', 0.72, 0, 0.32), bx(0.28, 0.22, 0.28, '#6a4a36', 0.72, 0.26, 0.32, { ry: 0.4 }));
  for (let i = 0; i < 5; i++) { const lc = i % 2 ? '#ffd27a' : '#4dfcff'; g.add(sphere(0.045, E(lc, 2.6), -0.72 + i * 0.36, 1.68 - Math.abs(i - 2) * 0.03, 0.34, { seg: 5, cast: false })); }
  g.add(bx(1.7, 0.01, 0.01, DARK, 0, 1.74, 0.34, { cast: false }));
  for (let i = 0; i < 4; i++) g.add(bx(0.14, 0.1, 0.14, E(i % 2 ? '#a064ff' : '#2ff5d0', 1.6), -0.6 + i * 0.4, 0.85, -0.05, { cast: false }));
  return done(g);
}

export const BUILDERS = { holo_billboard, neon_sign, holo_ad, data_pylon, security_camera, drone_pad, neon_lamp, glow_planter, vent_stack, transit_shelter, vend_neo, market_stall_neo };
