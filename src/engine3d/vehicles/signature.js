// The nine signature cars (phase 3D-3), registered by model id so each beats its body type in the registry lookup. Each is built around its
// owner as in src/engine/drawSignatureCars.js (the 2D drawing is the reference for the gimmick): gold limousine with a chandelier, fountain and
// hot tub; the cement-mixer hot rod with a tower crane; the interceptor with a gavel; the right-angled wedge; the tinfoil half-track; the boat
// on tractor wheels; the wedge of cheddar on monster wheels; the stretch limousine with a gramophone horn; the black coach.
// What moves: the fountain and the crystals, the mixer drum and the swinging plumb bob, the gavel (on the horn), the light bars, the dishes,
// periscope and treads, the sail and the ship's wheel, the horn's bell, the candles and the floating card.
// The 2D trails on the ground (coins, dust, sums, static, spray, cheese, cards) are drawn by the 2D overlay (renderer.drawTrail): not here.
import { registerVehicle } from '../registry3d.js';
import { assemble } from './geo.js';
import { bindDrive, hornAge } from './drive.js';
import { carShell, SIZE, TYPES } from './cars.js';

const TILE = 32;
const CHROME = '#b9bec5';
const GOLD = '#d9b24a';
const hashf = (i, k = 0) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const wheelsOf = (list) => list.map(([x, z, r, w, steer, opts]) => ({ x, z, r, w, steer: Boolean(steer), opts }));
/** A mirrored pair of wheel records at x. */
const axle = (x, z, r, w, steer, opts) => [[x, z, r, w, steer, opts], [x, -z, r, w, steer, opts]];
const arch = (G, wx, r, c, hw, rr = 0.05) => {
  const pts = [[wx - r - rr, c]];
  for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI; pts.push([wx + Math.cos(a) * (r + rr), r + Math.sin(a) * (r + rr)]); }
  pts.push([wx + r + rr, c]);
  for (const s of [-1, 1]) G.prism('dark', pts, s * (hw + 0.002) - 0.01, s * (hw + 0.002) + 0.01, '#101114');
};

const SIG = {};

// ------------------------------------------------------------------------------------------------ the Bullion
SIG.bullion = (m) => {
  const { L, W } = SIZE(m);
  const T = { ...TYPES.limo, lay: [0.25, 0.31, 0.68, 0.76] };
  const ax = [-0.34 * L, -0.1 * L, 0.32 * L];
  const r = 0.27; const w = 0.24; const z = W / 2 - w / 2 + 0.03;
  const gold = { hub: '#f2d070', tyre: '#2a2418', bar: '#9a6a10' };
  return {
    key: `sig|bullion|${L}|${W}`,
    build(G) {
      const S = carShell(G, m, T, { axles: ax });
      const { hw, hood, roof, x0, tail } = S;
      for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) G.box('dark', i * L * 0.12 - 0.02, i * L * 0.12 + 0.04, S.c + 0.2, hood - 0.16, s * (hw + 0.004) - 0.005, s * (hw + 0.004) + 0.005, '#fff0a0'); // ingot bevels
      // the fountain on the bonnet: a marble basin, champagne, a spout
      const fx = 0.36 * L;
      G.cyl('dark', 'y', fx, S.nose + 0.04, 0, 0.3, 0.12, '#f2ede2', { seg: 10 });
      G.cyl('dark', 'y', fx, S.nose + 0.155, 0, 0.23, 0.02, '#f6e7a8', { seg: 10 });
      G.cyl('dark', 'y', fx, S.nose + 0.16, 0, 0.05, 0.22, '#f2ede2', { seg: 6, r1: 0.025 });
      // the hot tub in the boot, with its bubbles
      const tx0 = x0 + 0.1; const tx1 = x0 + 0.25 * L - 0.04;
      G.box('dark', tx0, tx1, tail - 0.02, tail + 0.3, -hw + 0.18, hw - 0.18, '#e8e4da');
      G.box('dark', tx0 + 0.07, tx1 - 0.07, tail + 0.295, tail + 0.31, -hw + 0.25, hw - 0.25, '#5ac8d8');
      // the chandelier on the roof: rods, a gold ring, crystals
      const cx = -0.01 * L; const cy = roof + 0.5;
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) G.tbox('dark', cx + dx * 0.12, roof + 0.25, dz * 0.12, 0.02, 0.5, 0.02, '#c8a040', dz * 0.2, 0, -dx * 0.2);
      G.torus('dark', 'y', cx, cy, 0, 0.3, 0.025, '#c8a040', 14, 4);
      G.cube('dark', cx, cy - 0.04, 0, 0.1, 0.1, 0.1, '#fffbe8');
    },
    wheels: wheelsOf([...axle(ax[0], z, r, w, false, gold), ...axle(ax[1], z, r, w, false, gold), ...axle(ax[2], z, r, w, true, gold)]),
    subs: [
      { name: 'crystals', pivot: [-0.01 * L, roof0(m, T) + 0.5, 0], build(G) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; G.cube('glow:#dff6ff', Math.cos(a) * 0.3, -0.13, Math.sin(a) * 0.3, 0.06, 0.1, 0.06); } } },
      { name: 'spray', pivot: [0.36 * L, S0(m) + 0.34, 0], build(G) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; G.cube('glow:#fff8dc', Math.cos(a) * (0.09 + (i % 3) * 0.05), 0, Math.sin(a) * (0.09 + (i % 3) * 0.05), 0.04, 0.04, 0.04); } } },
      { name: 'bubbles', pivot: [-L / 2 + 0.1 + 0.4, T0(m, T) + 0.31, 0], build(G) { for (let i = 0; i < 5; i++) G.cube('glow:#ffffff', (hashf(i) - 0.5) * 0.5, 0, (hashf(i, 3) - 0.5) * 0.5, 0.035, 0.035, 0.035); } },
    ],
    animate(u, v, ctx, dt, st) {
      const t = st.t;
      u.subs.crystals.scale.setScalar(0.85 + 0.2 * Math.sin(t * 6));
      u.subs.crystals.rotation.y = t * 0.8;
      u.subs.spray.rotation.y = t * 3; u.subs.spray.position.y = S0(m) + 0.34 + Math.abs(Math.sin(t * 5)) * 0.12;
      u.subs.bubbles.position.y = T0(m, T) + 0.31 + (Math.sin(t * 9) > 0 ? 0.01 : 0);
      u.subs.bubbles.rotation.y = t;
    },
  };
};
const sy_ = (m) => { const { L } = SIZE(m); return 1 + (L / 2.3 - 1) * 0.35; };
function roof0(m, T) { return T.roof * sy_(m); }
function S0(m) { return TYPES.limo.nose * sy_(m); }
function T0(m, T) { return T.tail * sy_(m); }

// ------------------------------------------------------------------------------------------------ Plumb Bob
SIG.plumbbob = (m) => {
  const { L, W } = SIZE(m);
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const ax = [-0.36 * L, -0.16 * L, 0.3 * L];
  const r = 0.3; const w = 0.26; const z = hw - w / 2 + 0.03;
  const cabX0 = 0.1 * L; const cabX1 = x1 - 0.02; const cabH = 1.22;
  return {
    key: `sig|plumbbob|${L}|${W}`,
    build(G) {
      const P = 'paint';
      G.box('dark', x0, x1 - 0.1, 0.3, 0.46, -hw + 0.25, hw - 0.25, '#4a4a50'); // chassis rails
      G.box('dark', x0 + 0.1, x1 - 0.1, 0.22, 0.32, -hw + 0.4, hw - 0.4, '#2a2a2e');
      G.box(P, cabX0, cabX1, 0.4, cabH * 0.62, -hw + 0.1, hw - 0.1); // the cab: lower
      G.prism(P, [[cabX0, cabH * 0.62], [cabX1 - 0.02, cabH * 0.62], [cabX1 - 0.3, cabH], [cabX0 + 0.1, cabH]], -hw + 0.12, hw - 0.12);
      G.prism('dark', [[cabX1 - 0.04, cabH * 0.64], [cabX1 - 0.3 + 0.02, cabH - 0.04], [cabX1 - 0.3 + 0.1, cabH - 0.04], [cabX1 - 0.12, cabH * 0.64]], -hw + 0.2, hw - 0.2, '#7fa4b8'); // windscreen
      for (const s of [-1, 1]) G.prism('dark', [[cabX0 + 0.3, cabH * 0.66], [cabX1 - 0.5, cabH * 0.66], [cabX1 - 0.55, cabH - 0.07], [cabX0 + 0.35, cabH - 0.07]], s * (hw - 0.12) - 0.01, s * (hw - 0.12) + 0.01, '#7fa4b8');
      // hazard chevrons across the front bumper
      for (let i = 0; i < 8; i++) G.box('dark', x1 - 0.06, x1 + 0.02, 0.28, 0.46, -hw + 0.1 + (i * (W - 0.2)) / 8, -hw + 0.1 + ((i + 1) * (W - 0.2)) / 8, i % 2 ? '#1a1a1a' : '#f2d020');
      for (const s of [-1, 1]) G.box('lampF', x1 - 0.04, x1 + 0.03, 0.58, 0.72, s > 0 ? hw - 0.3 : -hw + 0.1, s > 0 ? hw - 0.1 : -hw + 0.3);
      for (const s of [-1, 1]) G.box('lampR', x0 - 0.02, x0 + 0.04, 0.4, 0.52, s > 0 ? hw - 0.3 : -hw + 0.1, s > 0 ? hw - 0.1 : -hw + 0.3);
      // the scaffolding roll cage over the cab
      for (const [px, pz] of [[cabX0 + 0.14, hw - 0.2], [cabX0 + 0.14, -hw + 0.2], [cabX1 - 0.34, hw - 0.2], [cabX1 - 0.34, -hw + 0.2]]) G.box('dark', px - 0.025, px + 0.025, cabH, cabH + 0.55, pz - 0.025, pz + 0.025, '#9aa0a8');
      for (const s of [-1, 1]) { G.box('dark', cabX0 + 0.12, cabX1 - 0.32, cabH + 0.52, cabH + 0.57, s * (hw - 0.2) - 0.025, s * (hw - 0.2) + 0.025, '#9aa0a8'); G.tbox('dark', (cabX0 + cabX1) / 2 - 0.1, cabH + 0.27, s * (hw - 0.2), 0.8, 0.04, 0.03, '#9aa0a8', 0, 0, 0.62); }
      G.box('dark', cabX0 + 0.12, cabX1 - 0.32, cabH + 0.52, cabH + 0.57, -hw + 0.2, hw - 0.2, '#9aa0a8');
      // the tower crane: a yellow mast, a jib over the nose, a counterweight, a hook
      const mx = 0.7; const mh = cabH + 0.57;
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) G.box('dark', mx + dx * 0.06 - 0.015, mx + dx * 0.06 + 0.015, mh, mh + 1.2, dz * 0.06 - 0.015, dz * 0.06 + 0.015, '#f2c020');
      for (let i = 0; i < 5; i++) G.tbox('dark', mx, mh + 0.12 + i * 0.24, 0.06, 0.18, 0.02, 0.02, '#c89a10', 0, 0, i % 2 ? 0.8 : -0.8);
      G.box('dark', mx - 0.3, x1 - 0.08, mh + 1.2, mh + 1.27, -0.04, 0.04, '#f2c020'); // the jib
      G.box('dark', mx - 0.3, x1 - 0.08, mh + 1.27, mh + 1.3, -0.015, 0.015, '#8a6a10');
      G.box('dark', mx - 0.42, mx - 0.26, mh + 1.12, mh + 1.3, -0.1, 0.1, '#5a5a5a'); // the counterweight
      G.cube('dark', mx, mh + 1.2, 0, 0.14, 0.12, 0.14, '#f2c020'); // the slewing head
      arch(G, ax[0], r, 0.28, hw, 0.06); arch(G, ax[1], r, 0.28, hw, 0.06); arch(G, ax[2], r, 0.28, hw, 0.06);
      void P;
    },
    wheels: wheelsOf([...axle(ax[0], z, r, w, false, { hub: '#d8d8d8', lugs: 10 }), ...axle(ax[1], z, r, w, false, { hub: '#d8d8d8', lugs: 10 }), ...axle(ax[2], z, r, w, true, { hub: '#d8d8d8', lugs: 10 })]),
    subs: [
      {
        name: 'drum',
        pivot: [-0.2 * L, 1.0, 0],
        build(G) {
          // a conical drum with orange spiral-ish bands: six white and orange staves
          const col = (i) => (i % 2 ? '#e8a020' : '#f0f0ea');
          const rings = [[-1.0, 0.2], [-0.6, 0.5], [0.5, 0.5], [0.95, 0.24]];
          const ringAt = (x, r) => { const o = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; o.push([x, Math.sin(a) * r, Math.cos(a) * r]); } return o.reverse(); };
          for (let k = 0; k < rings.length - 1; k++) G.loft('dark', ringAt(rings[k][0], rings[k][1]), ringAt(rings[k + 1][0], rings[k + 1][1]), col, k === 0, k === rings.length - 2);
          G.box('dark', -0.05, 0.05, -0.04, 0.04, -0.52, 0.52, '#3a3a3a'); // a dark band so the turn reads
        },
      },
      { name: 'bob', pivot: [x1 - 0.2, 0.4 + 1.22 + 0.57 + 1.2 - 0.4 + 0.4, 0], build(G) { G.box('dark', -0.005, 0.005, -0.5, 0, -0.005, 0.005, '#3a3a3a'); G.cyl('dark', 'y', 0, -0.62, 0, 0.001, 0.14, '#c8962a', { r1: 0.07, seg: 4 }); } },
    ],
    animate(u, v, ctx, dt, st) {
      u.subs.drum.rotation.x = st.t * 1.6;
      u.subs.drum.rotation.z = 0.2; // the drum leans back, nose up
      const sw = Math.sin(st.t * 2.4) * 0.18 + Math.max(-0.25, Math.min(0.25, -(v.moved || v.speed || 0) / 1300));
      u.subs.bob.rotation.z = sw;
    },
  };
};

// ------------------------------------------------------------------------------------------------ Gavel
SIG.gavel = (m) => {
  const { L, W } = SIZE(m);
  const T = { ...TYPES.police, lay: [0.18, 0.28, 0.58, 0.68], hood: 0.62, nose: 0.52, tail: 0.66, roof: 0.96 };
  const bodyLen = L - 0.42;
  const mm = { ...m, len: bodyLen * TILE };
  const sh = 0.09; // the body sits forward of the centre so the spare tyre at the back stays inside the length
  const r = 0.27; const w = 0.24; const z = W / 2 - w / 2 + 0.03;
  const fx = sh + bodyLen / 2 - 0.2 * bodyLen; const rx = sh - bodyLen / 2 + 0.2 * bodyLen;
  const roof = T.roof * (1 + (bodyLen / 2.3 - 1) * 0.35);
  return {
    key: `sig|gavel|${L}|${W}`,
    build(G) {
      G.shift(sh, 0, 0);
      const S = carShell(G, mm, T, { glass: '#232f40' });
      const { hw, hood, nose, x0, x1 } = S;
      // armour plates: pale seams across the flanks and rivets along the bonnet
      for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) G.box('dark', i * bodyLen * 0.16 - 0.012, i * bodyLen * 0.16 + 0.012, S.c + 0.14, hood - 0.04, s * (hw + 0.006) - 0.004, s * (hw + 0.006) + 0.004, '#3a4868');
      for (let i = 0; i < 6; i++) for (const s of [-0.7, 0.7]) G.cube('dark', S.xd + 0.12 + i * 0.14, hood + 0.0, s * hw * 0.8, 0.04, 0.03, 0.04, '#aab4c8');
      // three light bars, red and blue
      for (let k = 0; k < 3; k++) {
        const bx = (S.X(T.lay[1]) + S.X(T.lay[2])) / 2 + (k - 1) * 0.3;
        G.box('barR', bx - 0.05, bx + 0.05, roof + 0.06, roof + 0.16, -hw * 0.6, -0.01);
        G.box('barB', bx - 0.05, bx + 0.05, roof + 0.06, roof + 0.16, 0.01, hw * 0.6);
        G.box('dark', bx - 0.07, bx + 0.07, roof + 0.05, roof + 0.07, -hw * 0.62, hw * 0.62, '#10131c');
      }
      // the bull bar shaped like scales
      G.box('dark', x1 + 0.0, x1 + 0.1, S.c + 0.15, S.c + 0.2, -hw + 0.12, hw - 0.12, GOLD);
      for (const s of [-1, 1]) { G.box('dark', x1 + 0.0, x1 + 0.1, S.c + 0.15, nose - 0.04, s * (hw - 0.14) - 0.025, s * (hw - 0.14) + 0.025, GOLD); G.cyl('dark', 'x', x1 + 0.1, S.c + 0.15, s * (hw - 0.34), 0.13, 0.02, GOLD, { seg: 8 }); }
      G.box('dark', x1 + 0.0, x1 + 0.1, S.c + 0.15, nose + 0.02, -0.02, 0.02, GOLD);
      // LAW / ORDER stripes
      for (const s of [-1, 1]) G.box('dark', x0 + 0.4, x1 - 0.5, hood - 0.18, hood - 0.1, s * (hw + 0.007) - 0.004, s * (hw + 0.007) + 0.004, '#e8e2d4');
      // the doughnut spare on the tail: pastry, pink icing, sprinkles
      const dxs = x0 - 0.14; const dy = 0.82;
      G.torus('dark', 'x', dxs, dy, 0, 0.3, 0.13, '#c8884a', 14, 6);
      G.torus('dark', 'x', dxs - 0.035, dy, 0, 0.3, 0.115, '#f29ac0', 14, 6);
      const sp = ['#ffffff', '#3a8aff', '#ffe040', '#40d070'];
      for (let i = 0; i < 12; i++) { const a = i * 2.3; G.cube('dark', dxs - 0.14, dy + Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0.02, 0.025, 0.05, sp[i % 4]); }
      G.shift(0, 0, 0);
    },
    wheels: wheelsOf([...axle(fx, z, r, w, true, { hub: '#aeb4ba' }), ...axle(rx, z, r, w, false, { hub: '#aeb4ba' })]),
    subs: [
      {
        name: 'gavel', pivot: [sh - 0.04 * L, roof + 0.2, 0],
        build(G) {
          G.box('dark', -0.05, 0.62, -0.04, 0.04, -0.04, 0.04, '#7a4a22'); // the handle
          G.box('dark', -0.2, 0.0, -0.17, 0.17, -0.12, 0.12, '#9a5e2c'); // the head
          G.box('dark', -0.2, 0.0, 0.12, 0.15, -0.125, 0.125, GOLD); G.box('dark', -0.2, 0.0, -0.15, -0.12, -0.125, 0.125, GOLD);
        },
      },
    ],
    animate(u, v, ctx) {
      const age = hornAge(v, ctx);
      const up = age < 0.12 || (age > 0.28 && age < 0.4);
      u.subs.gavel.rotation.z = up ? 0.6 : 0.0;
      u.subs.gavel.scale.setScalar(up ? 1.2 : 1);
    },
  };
};

// ------------------------------------------------------------------------------------------------ Hypotenuse
SIG.hypotenuse = (m) => {
  const { L, W } = SIZE(m);
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const rr = 0.3; const w = 0.26; const rz = hw - w / 2 + 0.03;
  const rx = -0.32 * L; const fr = 0.2; const fx = x1 - 0.32;
  const tailH = 1.02;
  const ring = (x, y0, y1, h) => [[x, y0, -h], [x, y1, -h], [x, y1, h], [x, y0, h]];
  return {
    key: `sig|hypotenuse|${L}|${W}`,
    build(G) {
      // the wedge: tall and square at the tail, down to a low pointed nose, narrowing as it goes
      G.loft('paint', ring(x0, 0.18, tailH, hw), ring(x1, 0.4, 0.5, hw * 0.3), '#22282a', true, true);
      // chalk: the right-angle mark, proofs, a white border along the top edge
      const slope = Math.atan2(0.5 - tailH, L);
      for (const s of [-1, 1]) G.tbox('dark', 0, (tailH + 0.5) / 2, s * (hw * 0.65 + 0.001), Math.hypot(L, tailH - 0.5), 0.025, 0.02, '#f2f2ea', 0, 0, slope);
      G.box('dark', x0 - 0.005, x0 + 0.0, 0.3, 0.52, -hw + 0.06, -hw + 0.07, '#f2f2ea'); // (right-angle mark on the tail)
      G.box('dark', x0 - 0.008, x0 + 0.002, 0.3, 0.31, -hw + 0.06, -hw + 0.28, '#f2f2ea');
      G.box('dark', x0 - 0.008, x0 + 0.002, 0.3, 0.52, -hw + 0.27, -hw + 0.28, '#f2f2ea');
      const hAt = (x) => tailH + (0.5 - tailH) * ((x - x0) / L);
      const wAt = (x) => hw - hw * 0.7 * ((x - x0) / L);
      for (let i = 0; i < 14; i++) { // chalky scribbles on the flanks
        const sd = i % 2 ? 1 : -1; const x = x0 + 0.25 + hashf(i, 2) * (L - 0.9);
        const yy = 0.26 + hashf(i, 7) * Math.max(0.05, hAt(x) - 0.55); const zz = wAt(x);
        G.box('dark', x, x + 0.1 + hashf(i, 5) * 0.2, yy, yy + 0.03, sd > 0 ? zz : -zz - 0.006, sd > 0 ? zz + 0.006 : -zz, '#e8e8de');
      }
      // the windscreen laid on the slope; the calculator on the roof; the protractor spoiler
      const wsx0 = x0 + 0.62 * L; const wsx1 = x0 + 0.9 * L;
      G.quad('dark', [wsx0, hAt(wsx0) + 0.006, -wAt(wsx0) * 0.6], [wsx0, hAt(wsx0) + 0.006, wAt(wsx0) * 0.6], [wsx1, hAt(wsx1) + 0.006, wAt(wsx1) * 0.6], [wsx1, hAt(wsx1) + 0.006, -wAt(wsx1) * 0.6], '#7fa4b8');
      const cx = x0 + 0.22 * L; const cy = hAt(cx);
      G.tbox('dark', cx, cy + 0.17, 0, 0.5, 0.34, 0.5, '#3a3e44', 0, 0, slope);
      G.tbox('glow:#9ec88a', cx, cy + 0.17 + 0.17 * Math.cos(slope) + 0.006, 0, 0.4, 0.06, 0.42, '#9ec88a', 0, 0, slope);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) G.tbox('dark', cx - 0.15 + c * 0.1, cy + 0.2, -0.17 + r * 0.17, 0.07, 0.04, 0.12, c === 3 ? '#d86a2a' : '#c8ccd2', 0, 0, slope);
      for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; G.cube('dark', x0 - 0.04, tailH + 0.02 + Math.sin(a) * 0.34, Math.cos(a) * 0.4, 0.035, 0.06, 0.06, '#c8d0d8'); }
      // lamps
      for (const s of [-1, 1]) G.box('lampR', x0 - 0.02, x0 + 0.03, 0.4, 0.55, s > 0 ? hw * 0.62 : -hw * 0.95, s > 0 ? hw * 0.95 : -hw * 0.62);
      for (const s of [-1, 1]) G.box('lampF', x1 - 0.04, x1 + 0.01, 0.42, 0.5, s * hw * 0.12 - 0.05, s * hw * 0.12 + 0.05);
      void slope;
    },
    wheels: wheelsOf([...axle(rx, rz, rr, w, false, { hub: '#c8ccd2' }), [fx, 0, fr, 0.2, true, { hub: '#c8ccd2' }]]),
    signs: [{ text: '3²+4²=5²', w: 0.62, pos: [x0 - 0.012, 0.68, 0], ry: -Math.PI / 2, opts: { fg: '#f2f2ea', bg: '#22282a', border: '#f2f2ea', font: 'bold 40px monospace' } }],
    animate() {},
  };
};

// ------------------------------------------------------------------------------------------------ Paranoia
SIG.paranoia = (m) => {
  const { L, W } = SIZE(m);
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const fr = 0.3; const fw = 0.26; const fx = 0.32 * L; const fz = hw - fw / 2 + 0.03;
  const foilTone = (i) => ['#e8ecf0', '#a8b0b8', '#d8dde2', '#c4cbd2', '#f4f6f8'][i % 5];
  return {
    key: `sig|paranoia|${L}|${W}`,
    build(G) {
      const trackL = L * 0.55;
      // tracks at the rear: a stadium of dark rubber on each side with road wheels
      for (const s of [-1, 1]) {
        const zc = s * (hw - 0.14);
        G.prism('dark', [[x0 + 0.08, 0.2], [x0 + trackL - 0.08, 0.2], [x0 + trackL, 0.34], [x0 + trackL, 0.52], [x0 + trackL - 0.08, 0.64], [x0 + 0.08, 0.64], [x0, 0.52], [x0, 0.34]], zc - 0.12, zc + 0.12, '#1e1e20');
      }
      // the foil van: a low hull, a tall box behind a short cab
      G.box('dark', x0 + 0.05, x1 - 0.1, 0.4, 0.78, -hw + 0.12, hw - 0.12, '#a8b0b8');
      G.prism('paint', [[x0 + 0.02, 0.78], [x1 - 0.1, 0.78], [x1 - 0.35, 1.12], [x0 + 0.02, 1.12]], -hw + 0.18, hw - 0.18);
      G.box('dark', x0 + 0.02, x0 + L * 0.58, 0.78, 1.55, -hw + 0.1, hw - 0.1, '#c8ced4'); // the tall box
      G.box('dark', x0 + 0.02, x0 + L * 0.58, 1.55, 1.6, -hw + 0.14, hw - 0.14, '#e8ecf0');
      G.prism('dark', [[x0 + L * 0.58, 0.78], [x1 - 0.1, 0.78], [x1 - 0.3, 1.2], [x0 + L * 0.58, 1.2]], -hw + 0.12, hw - 0.12, '#b8c0c8'); // the cab
      G.prism('dark', [[x1 - 0.15, 0.84], [x1 - 0.3 + 0.0, 1.17], [x1 - 0.31, 1.17], [x1 - 0.17, 0.84]], -hw + 0.2, hw - 0.2, '#1a1c1e'); // blacked-out windscreen
      // crumpled foil: lots of small tilted plates
      for (let i = 0; i < 46; i++) {
        const s = i % 2 ? 1 : -1; const face = i % 3;
        const px = x0 + 0.2 + hashf(i) * (L * 0.56); const py = 0.82 + hashf(i, 3) * 0.7;
        const rot = (hashf(i, 5) - 0.5) * 0.7;
        if (face < 2) G.tbox('dark', px, py, s * (hw - 0.1 + 0.015), 0.16 + hashf(i, 9) * 0.14, 0.12 + hashf(i, 11) * 0.12, 0.02, foilTone(i), 0, 0, rot);
        else G.tbox('dark', px, 1.56, (hashf(i, 13) - 0.5) * (W - 0.4), 0.2 + hashf(i, 9) * 0.1, 0.02, 0.18, foilTone(i + 2), rot, 0, 0);
      }
      for (const s of [-1, 1]) G.box('lampF', x1 - 0.14, x1 - 0.1, 0.52, 0.64, s > 0 ? hw - 0.32 : -hw + 0.18, s > 0 ? hw - 0.18 : -hw + 0.32);
      for (const s of [-1, 1]) G.box('lampR', x0 - 0.02, x0 + 0.03, 0.5, 0.64, s > 0 ? hw - 0.4 : -hw + 0.14, s > 0 ? hw - 0.14 : -hw + 0.4);
      G.box('dark', x1 - 0.12, x1 + 0.0, 0.34, 0.5, -hw + 0.1, hw - 0.1, '#6a7078');
      arch(G, fx, fr, 0.3, hw - 0.1);
      // the antenna forest, a periscope mount and two dish mounts
      for (let i = 0; i < 7; i++) { const ax = x0 + 0.2 + i * 0.28; const az = (i % 2 ? 1 : -1) * (hw - 0.3); G.tbox('dark', ax, 1.78, az, 0.02, 0.4, 0.02, '#3a3e44', 0, 0, i % 2 ? 0.2 : -0.2); }
      G.cyl('dark', 'y', x0 + L * 0.36, 1.6, 0, 0.18, 0.1, '#4a504a', { seg: 8 });
      for (const [dx, dz] of [[-L * 0.32, -W * 0.16], [-L * 0.08, W * 0.18]]) G.cyl('dark', 'y', dx, 1.6, dz, 0.025, 0.12, '#5a6068', { seg: 5 });
    },
    wheels: wheelsOf([...axle(fx, fz, fr, fw, true, { hub: '#aeb4ba' }), ...[-1, 1].flatMap((sd) => [x0 + 0.3, x0 + L * 0.55 - 0.3].map((tx) => [tx, sd * (hw - 0.14 + 0.125), 0.16, 0.04, false, { hub: '#6a6a6e', tyre: '#4a4a4c', bar: '#2a2a2c', seg: 8 }]))]),
    subs: [
      { name: 'dishA', pivot: [-L * 0.32, 1.78, -W * 0.16], build(G) { G.cyl('dark', 'x', 0, 0, 0, 0.04, 0.14, '#e8ecef', { r1: 0.32, seg: 10, ey: 1.3, ex: 1.3 }); G.cyl('dark', 'x', -0.05, 0, 0, 0.012, 0.18, '#5a6068', { seg: 4 }); } },
      { name: 'dishB', pivot: [-L * 0.08, 1.78, W * 0.18], build(G) { G.cyl('dark', 'x', 0, 0, 0, 0.04, 0.14, '#e8ecef', { r1: 0.32, seg: 10, ey: 1.3, ex: 1.3 }); G.cyl('dark', 'x', -0.05, 0, 0, 0.012, 0.18, '#5a6068', { seg: 4 }); } },
      { name: 'peri', pivot: [-L / 2 + L * 0.36, 1.78, 0], build(G) { G.box('dark', 0, 0.45, -0.04, 0.04, -0.04, 0.04, '#2a2e2a'); G.box('glow:#9fd0ff', 0.43, 0.47, -0.035, 0.035, -0.035, 0.035); } },
      { name: 'tipsA', pivot: [0, 0, 0], build(G) { for (let i = 0; i < 7; i += 2) G.cube('glow:#ff4040', -L / 2 + 0.2 + i * 0.28 + (i % 2 ? 0.04 : -0.04), 1.98, (i % 2 ? 1 : -1) * (hw - 0.3), 0.05, 0.05, 0.05); } },
      { name: 'tipsB', pivot: [0, 0, 0], build(G) { for (let i = 1; i < 7; i += 2) G.cube('glow:#ff4040', -L / 2 + 0.2 + i * 0.28 + (i % 2 ? 0.04 : -0.04), 1.98, (i % 2 ? 1 : -1) * (hw - 0.3), 0.05, 0.05, 0.05); } },
      { name: 'treads', pivot: [0, 0, 0], build(G) { for (const s of [-1, 1]) for (let i = 0; i < 12; i++) G.box('dark', x0 + 0.06 + i * 0.12, x0 + 0.1 + i * 0.12, 0.2, 0.64, s * (hw - 0.14) + (s > 0 ? 0.12 : -0.135), s * (hw - 0.14) + (s > 0 ? 0.135 : -0.12), '#5a5a5e'); } },
    ],
    animate(u, v, ctx, dt, st) {
      const t = st.t;
      u.subs.dishA.rotation.y = Math.sin(t * 0.8) * 0.8;
      u.subs.dishB.rotation.y = Math.sin(t * 0.8 + 2) * 0.8;
      u.subs.peri.rotation.y = Math.sin(t * 0.5) * 1.4;
      u.subs.tipsA.visible = Math.sin(t * 5) > 0.2;
      u.subs.tipsB.visible = Math.sin(t * 5 + 2.5) > 0.2;
      u.subs.treads.position.x = -(((v.odo || 0) / TILE) % 0.12) * 1.0;
    },
  };
};

// ------------------------------------------------------------------------------------------------ Landlubber
SIG.landlubber = (m) => {
  const { L, W } = SIZE(m);
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const r = 0.4; const w = 0.3; const wz = hw - w / 2 + 0.17;
  const ax = [-0.28 * L, 0.24 * L];
  const hull = (grow) => {
    const g = grow;
    return [[x1 + g, 0], [x1 - 0.5, -hw * 0.55 - g], [x1 - 1.1, -hw - g], [x0 + 0.5, -hw - g], [x0 + 0.05, -hw * 0.7 - g], [x0 - g, 0], [x0 + 0.05, hw * 0.7 + g], [x0 + 0.5, hw + g], [x1 - 1.1, hw + g], [x1 - 0.5, hw * 0.55 + g]];
  };
  return {
    key: `sig|landlubber|${L}|${W}`,
    build(G) {
      // a clinker hull: overlapping planks, each a little wider than the one below
      const planks = ['#7a4a26', '#6e4222', '#7a4a26', '#6e4222', '#7a4a26'];
      planks.forEach((c, i) => G.plan(i % 2 ? 'dark' : 'paint', hull(-0.1 + i * 0.022), 0.46 + i * 0.12, 0.46 + (i + 1) * 0.12, c));
      G.plan('dark', hull(-0.07), 1.06, 1.1, '#e8e0c8'); // the gunwale
      G.plan('dark', hull(-0.2), 1.0, 1.11, '#c8a070'); // the deck
      for (const s of [-1, 1]) G.box('dark', -0.45, 0.2, 1.06, 1.14, s * (hw - 0.14) - 0.04, s * (hw - 0.14) + 0.04, '#e8e0c8'); // the name boards
      // a thwart seat and the mast step
      G.box('dark', -0.7, -0.5, 1.0, 1.28, -hw + 0.3, hw - 0.3, '#8a5a30');
      G.cyl('dark', 'y', 0.08 * L, 1.1, 0, 0.07, 1.55, '#5a3418', { seg: 6 }); // the mast
      // the crow's nest: a floor, a ring of rails
      const my = 2.5; const mx = 0.08 * L;
      G.cyl('dark', 'y', mx, my, 0, 0.26, 0.05, '#c8b070', { seg: 8 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; G.box('dark', mx + Math.cos(a) * 0.26 - 0.02, mx + Math.cos(a) * 0.26 + 0.02, my + 0.05, my + 0.28, Math.sin(a) * 0.26 - 0.02, Math.sin(a) * 0.26 + 0.02, '#7a4a26'); }
      G.torus('dark', 'y', mx, my + 0.28, 0, 0.26, 0.018, '#7a4a26', 8, 4);
      // the figurehead: a mermaid, a bobbing head, and a lantern
      G.blob('dark', x1 - 0.06, 1.28, 0, 0.12, 0.13, 0.12, '#e8c8a0', 1);
      G.blob('dark', x1 - 0.1, 1.3, 0, 0.12, 0.13, 0.12, '#c84a2a', 0);
      G.cube('lampF', x1 - 0.8, 1.14, -hw + 0.2, 0.12, 0.2, 0.12, '#fff');
      G.cube('lampR', x0 + 0.1, 1.14, hw - 0.2, 0.1, 0.12, 0.1, '#fff');
      // the wheel's pedestal, aft
      G.box('dark', -L * 0.34 - 0.04, -L * 0.34 + 0.04, 1.0, 1.35, -0.04, 0.04, '#4a2a10');
      for (const ax2 of ax) G.box('dark', ax2 - 0.06, ax2 + 0.06, 0.34, 0.48, -wz, wz, '#2a2a2e'); // the axles
    },
    wheels: wheelsOf([...axle(ax[0], wz, r, w, false, { hub: '#c8b898', tyre: '#1e1e1a', lugs: 12 }), ...axle(ax[1], wz, r, w, true, { hub: '#c8b898', tyre: '#1e1e1a', lugs: 12 })]),
    subs: [
      {
        name: 'sail', pivot: [0.08 * L, 1.45, 0],
        build(G) {
          // a triangle from the mast, belly offset in z; two sides so it can be seen from both
          const top = [0, 1.0, 0]; const foot = [0, 0, 0]; const clew = [-0.38 * L, 0.0, 0.0]; const belly = [-0.18 * L, 0.45, 0.0];
          const bel = (zz) => [belly[0], belly[1], zz];
          for (const [zz, flip] of [[0.38, 0], [0.38, 1]]) {
            const pts = [top, foot, clew, bel(zz)];
            const tri = (a, b, c) => (flip ? G.tri('dark', a, c, b, '#f4ecd6') : G.tri('dark', a, b, c, '#f4ecd6'));
            tri(top, foot, bel(zz)); tri(foot, clew, bel(zz)); tri(clew, top, bel(zz));
            void pts;
          }
          G.box('dark', -0.38 * L, 0.0, -0.025, 0.025, -0.025, 0.025, '#5a3418'); // the boom
        },
      },
      { name: 'flag', pivot: [0.08 * L, 2.7, 0], build(G) { G.tri('dark', [0, 0.08, 0], [-0.3, 0.02, 0], [0, -0.06, 0], '#1a3a6a'); G.tri('dark', [0, 0.08, 0], [0, -0.06, 0], [-0.3, 0.02, 0], '#1a3a6a'); G.box('dark', -0.01, 0.01, -0.3, 0.1, -0.01, 0.01, '#5a3418'); } },
      { name: 'helm', pivot: [-L * 0.34, 1.5, 0], build(G) { G.torus('dark', 'x', 0, 0, 0, 0.17, 0.018, '#4a2a10', 12, 4); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; G.tbox('dark', 0, 0, 0, 0.026, 0.5, 0.026, '#4a2a10', a, 0, 0); } } },
      { name: 'wake', pivot: [x1 - 0.4, 0.5, 0], build(G) { for (const s of [-1, 1]) G.tbox('dark', -0.5, 0.0, s * 0.45, 1.0, 0.07, 0.07, '#f4fbff', 0, s * 0.5, 0); } },
    ],
    animate(u, v, ctx, dt, st) {
      const wet = Boolean(onWater(v, ctx));
      const fill = Math.min(1, Math.abs(v.moved || v.speed || 0) / 260);
      u.subs.sail.scale.z = 0.3 + fill * 0.9;
      u.subs.sail.rotation.y = -0.15 + fill * 0.12;
      u.subs.flag.rotation.y = Math.sin(st.t * 8) * 0.35;
      u.subs.helm.rotation.x = (v.wheel || 0) * 2.5;
      u.subs.wake.visible = wet;
      u.subs.wake.scale.setScalar(0.6 + fill * 0.7);
      for (const wl of u.wheels) wl.pivot.visible = !wet;
      u.body.position.y = wet ? -0.22 : 0;
    },
  };
};
function onWater(v, ctx) {
  const g = ctx?.game;
  const map = g && v.map && g.maps?.get ? g.maps.get(v.map) : null;
  return map ? map.tileAt(Math.floor(v.x / TILE), Math.floor(v.y / TILE)) === '~' : false;
}

// ------------------------------------------------------------------------------------------------ Big Cheese
SIG.bigcheese = (m) => {
  const { L, W } = SIZE(m);
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const r = 0.46; const w = 0.4; const wz = hw - w / 2 + 0.04;
  const fx = 0.28 * L; const rx = -0.3 * L;
  const y0 = 0.5; const y1 = 1.32;
  const plan = [[x1, 0], [x0 + 0.5, -hw * 0.9], [x0 + 0.12, -hw * 0.82], [x0, -hw * 0.5], [x0, hw * 0.5], [x0 + 0.12, hw * 0.82], [x0 + 0.5, hw * 0.9]];
  const cow = (G, bucket, cx, cy, cz, sx, sz, seed) => { // a cow-print slab: white with black patches
    G.cube(bucket, cx, cy, cz, sx, 0.04, sz, '#f4f2ea');
    for (let i = 0; i < 3; i++) G.cube(bucket, cx + (hashf(i, seed) - 0.5) * sx * 0.7, cy + 0.041, cz + (hashf(i, seed + 3) - 0.5) * sz * 0.6, 0.08 + hashf(i, seed + 1) * 0.1, 0.004, 0.06 + hashf(i, seed + 2) * 0.08, '#1a1a1a');
  };
  return {
    key: `sig|bigcheese|${L}|${W}`,
    build(G) {
      // the wedge: yellow cheddar, an orange rind at the back, holes
      G.plan('paint', plan, y0, y1, '#f2c440');
      G.plan('dark', [[x0 + 0.5, -hw * 0.9 - 0.01], [x0 + 0.12, -hw * 0.82 - 0.01], [x0 - 0.01, -hw * 0.5], [x0 - 0.01, hw * 0.5], [x0 + 0.12, hw * 0.82 + 0.01], [x0 + 0.5, hw * 0.9 + 0.01], [x0 + 0.5, hw * 0.9 - 0.2], [x0 + 0.2, hw * 0.7], [x0 + 0.08, hw * 0.45], [x0 + 0.08, -hw * 0.45], [x0 + 0.2, -hw * 0.7], [x0 + 0.5, -hw * 0.9 + 0.2]], y0 - 0.01, y1 + 0.01, '#e09a30');
      for (const [hx, hz, hr] of [[-0.3, -0.18, 0.2], [-0.14, 0.14, 0.15], [0.02, -0.08, 0.11], [-0.34, 0.26, 0.11], [0.16, 0.04, 0.09], [-0.2, -0.34, 0.1]]) G.cyl('dark', 'y', hx * L + 0.1, y1 - 0.004, hz * W * 0.9, hr, 0.012, '#d8a428', { seg: 8 });
      for (const s of [-1, 1]) for (const [t, hr, yy] of [[0.42, 0.14, 0.95], [0.6, 0.1, 1.1], [0.75, 0.09, 0.85]]) {
        const fx2 = x1 + (x0 + 0.5 - x1) * t; const fz2 = s * hw * 0.9 * t;
        G.tbox('dark', fx2, yy, fz2 + s * 0.005, hr * 2, hr * 1.5, 0.014, '#d8a428', 0, Math.atan2(-s * hw * 0.9, x0 + 0.5 - x1), 0);
      }
      G.cyl('dark', 'x', x0 - 0.004, 1.0, -0.2, 0.12, 0.014, '#d8a428', { seg: 8 }); G.cyl('dark', 'x', x0 - 0.004, 0.8, 0.25, 0.09, 0.014, '#d8a428', { seg: 8 });
      // monster axles, cow-print fenders, a window in the cheese
      for (const ax of [fx, rx]) { G.box('dark', ax - 0.06, ax + 0.06, r - 0.06, r + 0.06, -wz, wz, '#2a2a2e'); for (const s of [-1, 1]) { cow(G, 'dark', ax, r * 2 + 0.06, s * wz, r * 2.0, w + 0.06, ax > 0 ? 1 : 5); G.box('dark', ax - r, ax - r + 0.03, r * 1.3, r * 2 + 0.06, s * wz - (w + 0.06) / 2, s * wz + (w + 0.06) / 2, '#f4f2ea'); } }
      G.box('dark', x0 + L * 0.3, x0 + L * 0.3 + 0.55, y1 - 0.004, y1 + 0.32, -0.34, 0.34, '#7fa4b8'); // the cab window
      G.box('dark', x0 + L * 0.3 + 0.22, x0 + L * 0.3 + 0.3, y1, y1 + 0.34, -0.36, 0.36, '#c8962a');
      // longhorns: a brown boss and a curve of horn segments each side
      G.blob('dark', x1 - 0.5, y1 - 0.02, 0, 0.16, 0.14, 0.16, '#8a5a30', 0);
      for (const s of [-1, 1]) {
        const pts = [[0, 0], [0.12, 0.1], [0.24, 0.26], [0.36, 0.5], [0.4, 0.75]]; // (outwards along z, up)
        for (let i = 0; i < pts.length - 1; i++) {
          const [za, ya] = pts[i]; const [zb, yb] = pts[i + 1];
          const dzs = (zb - za) * 1.4;
          G.tbox('dark', x1 - 0.45, y1 + (ya + yb) / 2, s * (0.1 + ((za + zb) / 2) * 1.4), 0.07 - i * 0.008, Math.hypot(dzs, yb - ya) + 0.03, 0.07 - i * 0.008, i > 2 ? '#4a3a2a' : '#f0e6d0', s * Math.atan2(dzs, yb - ya), 0, 0);
        }
      }
      for (const s of [-1, 1]) G.box('lampF', x1 - 0.5 + 0.2, x1 - 0.5 + 0.28, y1 - 0.28, y1 - 0.16, s * 0.1 - 0.05, s * 0.1 + 0.05);
      for (const s of [-1, 1]) G.box('lampR', x0 - 0.02, x0 + 0.03, y0 + 0.2, y0 + 0.34, s * hw * 0.55 - 0.07, s * hw * 0.55 + 0.07);
      // the milk-churn exhaust
      G.cyl('dark', 'y', x0 - 0.02, y0 - 0.1, 0.32, 0.1, 0.48, '#b8bcc0', { seg: 8 });
      G.cyl('dark', 'y', x0 - 0.02, y0 + 0.38, 0.32, 0.12, 0.04, '#8a8e92', { seg: 8 });
      G.cyl('dark', 'y', x0 - 0.02, y0 + 0.42, 0.32, 0.05, 0.1, '#8a8e92', { seg: 6 });
    },
    wheels: wheelsOf([...axle(fx, wz, r, w, true, { hub: '#f4f2ea', bar: '#1a1a1a', tyre: '#141414', lugs: 12 }), ...axle(rx, wz, r, w, false, { hub: '#f4f2ea', bar: '#1a1a1a', tyre: '#141414', lugs: 12 })]),
    animate() {},
  };
};

// ------------------------------------------------------------------------------------------------ Long Distance
SIG.longdistance = (m) => {
  const { L, W } = SIZE(m);
  const T = { ...TYPES.limo, lay: [0.1, 0.17, 0.74, 0.82] };
  const ax = [-0.36 * L, -0.2 * L, 0.34 * L];
  const r = 0.27; const w = 0.24; const z = W / 2 - w / 2 + 0.03;
  const sy = 1 + (L / 2.3 - 1) * 0.35;
  const roof = T.roof * sy;
  return {
    key: `sig|longdistance|${L}|${W}`,
    build(G) {
      const S = carShell(G, m, T, { axles: ax, glass: '#16202a' });
      const { hw, x0, x1, hood, nose, c } = S;
      // the gold pinstripe round the flank, a gold grille and bumpers
      for (const s of [-1, 1]) G.box('dark', x0 + 0.1, x1 - 0.1, c + 0.17, c + 0.2, s * (hw + 0.006) - 0.004, s * (hw + 0.006) + 0.004, GOLD);
      G.box('dark', x1 - 0.02, x1 + 0.03, nose - 0.24, nose - 0.05, -W * 0.3, W * 0.3, '#e8c35a');
      for (let i = 0; i < 6; i++) G.box('dark', x1 + 0.0, x1 + 0.04, nose - 0.23 + i * 0.03, nose - 0.215 + i * 0.03, -W * 0.28, W * 0.28, '#a8862a');
      G.box('dark', x1 - 0.06, x1 + 0.06, c + 0.02, c + 0.17, -hw + 0.04, hw - 0.04, '#e8c35a');
      G.box('dark', x0 - 0.06, x0 + 0.06, c + 0.02, c + 0.17, -hw + 0.04, hw - 0.04, '#e8c35a');
      // a screen in every window: lit panes on both sides
      const wx0 = S.X(T.lay[1]) + 0.08; const wx1 = S.X(T.lay[2]) - 0.1;
      const n = 6; const seg = (wx1 - wx0) / n;
      for (let i = 0; i < n; i++) for (const s of [-1, 1]) G.box('glow:#6ac8f0', wx0 + i * seg + 0.06, wx0 + (i + 1) * seg - 0.06, hood + 0.1, hood + 0.34, s * (S.wg / 2 + 0.006) - 0.004, s * (S.wg / 2 + 0.006) + 0.004);
      // the aerials, and the gramophone horn's mount
      for (const [ax2, az, hh] of [[-0.3, -0.3, 0.3], [-0.26, 0.28, 0.42], [0.12, -0.32, 0.25], [0.16, 0.3, 0.36], [-0.34, 0, 0.5]]) G.tbox('dark', ax2 * L - hh * 0.15, roof + 0.07 + hh / 2, az * W, 0.015, hh, 0.015, '#c9c9d0', 0, 0, 0.3);
      G.cube('dark', -0.08 * L, roof + 0.05, 0, 0.12, 0.14, 0.12, '#8a6a1a');
    },
    wheels: wheelsOf([...axle(ax[0], z, r, w, false, { hub: '#e8c35a', tyre: '#101014', bar: '#8a6a1a' }), ...axle(ax[1], z, r, w, false, { hub: '#e8c35a', tyre: '#101014', bar: '#8a6a1a' }), ...axle(ax[2], z, r, w, true, { hub: '#e8c35a', tyre: '#101014', bar: '#8a6a1a' })]),
    subs: [
      {
        name: 'horn', pivot: [-0.08 * L, roof + 0.17, 0],
        build(G) {
          // a golden bell: a narrow stem opening to a wide mouth, tilted up and forward
          const ringAt = (x, rr) => { const o = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; o.push([x, 0.25 * x + Math.sin(a) * rr, Math.cos(a) * rr]); } return o.reverse(); };
          const prof = [[0, 0.035], [0.15, 0.06], [0.3, 0.13], [0.42, 0.24], [0.5, 0.36]];
          for (let k = 0; k < prof.length - 1; k++) G.loft('dark', ringAt(prof[k][0], prof[k][1]), ringAt(prof[k + 1][0], prof[k + 1][1]), k % 2 ? '#e8c35a' : '#c8a040', k === 0, false);
          G.cyl('dark', 'x', 0.5, 0.125, 0, 0.23, 0.01, '#3a2a0a', { seg: 10 });
        },
      },
      { name: 'rings', pivot: [-0.08 * L + 0.6, roof + 0.3, 0], build(G) { for (let i = 0; i < 3; i++) G.torus('glow:#e8c35a', 'x', i * 0.18, 0, 0, 0.15 + i * 0.1, 0.012, '#fff', 12, 3); } },
      { name: 'tipsA', pivot: [0, 0, 0], build(G) { for (const [ax2, az, hh] of [[-0.3, -0.3, 0.3], [0.12, -0.32, 0.25], [-0.34, 0, 0.5]]) G.cube('glow:#ff4a4a', ax2 * L - hh * 0.3, roof + 0.1 + hh, az * W, 0.05, 0.05, 0.05); } },
      { name: 'tipsB', pivot: [0, 0, 0], build(G) { for (const [ax2, az, hh] of [[-0.26, 0.28, 0.42], [0.16, 0.3, 0.36]]) G.cube('glow:#ff4a4a', ax2 * L - hh * 0.3, roof + 0.1 + hh, az * W, 0.05, 0.05, 0.05); } },
    ],
    animate(u, v, ctx, dt, st) {
      u.subs.horn.rotation.y = Math.sin(st.t * 0.7) * 0.4;
      const age = hornAge(v, ctx);
      u.subs.rings.visible = age < 1;
      if (age < 1) { u.subs.rings.scale.setScalar(0.4 + age * 1.6); u.subs.rings.rotation.y = u.subs.horn.rotation.y; }
      u.subs.tipsA.visible = Math.sin(st.t * 5) > 0.5;
      u.subs.tipsB.visible = Math.sin(st.t * 5 + 3) > 0.5;
    },
  };
};

// ------------------------------------------------------------------------------------------------ The Last Trick
SIG.lasttrick = (m) => {
  const { L, W } = SIZE(m);
  const T = { lay: [0.06, 0.1, 0.74, 0.8], hood: 0.62, nose: 0.52, tail: 0.66, roof: 1.2, r: 0.36, c: 0.2 };
  const r = 0.38; const w = 0.14; const z = W / 2 - w / 2 + 0.05;
  const fx = 0.3 * L; const rx = -0.3 * L;
  const sy = 1 + (L / 2.3 - 1) * 0.35;
  const roof = T.roof * sy; const hood = T.hood * sy;
  const silver = { hub: '#9a9aa8', tyre: '#0c0a10', bar: '#c9c9d0' };
  const spade = [[0.16, 0], [0.06, 0.12], [-0.02, 0.14], [-0.08, 0.08], [-0.06, 0.02], [-0.16, 0.05], [-0.16, -0.05], [-0.06, -0.02], [-0.08, -0.08], [-0.02, -0.14], [0.06, -0.12]]; // (in plan, nose to +x)
  return {
    key: `sig|lasttrick|${L}|${W}`,
    build(G) {
      const S = carShell(G, m, T, { axles: [fx, rx], glass: '#2a1e3a' });
      const { hw, x0, x1, c, nose } = S;
      // silver suits along the flanks, purple coach lamps, the driver's box and the spade on the bonnet
      ['s', 'h', 'd', 'c'].forEach((k, i) => { for (const s of [-1, 1]) { const px = x0 + 0.6 + i * 0.5; G.tbox('dark', px, hood - 0.2, s * (hw + 0.008), 0.11, 0.11, 0.01, '#b8b8c4', 0, 0, Math.PI / 4); } void k; });
      for (const s of [-1, 1]) { G.box('glow:#b05af0', x1 - 0.05, x1 + 0.03, nose - 0.2, nose - 0.04, s > 0 ? hw - 0.28 : -hw + 0.06, s > 0 ? hw - 0.06 : -hw + 0.28); G.box('lampR', x0 - 0.02, x0 + 0.03, c + 0.34, c + 0.5, s > 0 ? hw - 0.3 : -hw + 0.06, s > 0 ? hw - 0.06 : -hw + 0.3); }
      G.plan('dark', spade.map(([a, b]) => [x1 - 0.32 + a, b]), nose + 0.3 * (hood - nose) / 1 * 0.3 + 0.01, nose + 0.3 * (hood - nose) / 1 * 0.3 + 0.04, '#d0d0dc'); // the spade on the bonnet
      // the candelabra: a stem, an arm, three candles
      const cx = -0.1 * L;
      G.cyl('dark', 'y', cx, roof + 0.05, 0, 0.015, 0.34, '#c9c9d0', { seg: 5 });
      G.box('dark', cx - 0.015, cx + 0.015, roof + 0.36, roof + 0.385, -0.17, 0.17, '#c9c9d0');
      for (const dz of [-0.15, 0, 0.15]) G.cyl('dark', 'y', cx, roof + 0.385, dz, 0.018, 0.1, '#f0e8d0', { seg: 5 });
      // the empty driver's box: a seat, and the reins hanging in the air
      G.box('dark', x1 - 0.55, x1 - 0.2, hood, hood + 0.06, -0.3, 0.3, '#0c0a10');
      G.box('dark', x1 - 0.55, x1 - 0.5, hood + 0.06, hood + 0.4, -0.3, 0.3, '#0c0a10');
      // the canopy's silver rails
      for (const s of [-1, 1]) G.box('dark', x0 + 0.3, x1 - 0.7, roof - 0.02, roof + 0.02, s * (S.wg / 2 + 0.012) - 0.01, s * (S.wg / 2 + 0.012) + 0.01, '#8a8a98'); // a silver rail along the canopy
    },
    wheels: wheelsOf([...axle(fx, z, r, w, true, silver), ...axle(rx, z, r, w, false, silver)]),
    subs: [
      { name: 'flames', pivot: [-0.1 * L, roof + 0.485, 0], build(G) { for (const dz of [-0.15, 0, 0.15]) G.cyl('glow:#ffb85a', 'y', 0, 0, dz, 0.025, 0.08, '#fff', { seg: 4, r1: 0.005 }); } },
      { name: 'card', pivot: [-0.3 * L, roof + 0.6, 0], build(G) { G.box('dark', -0.045, 0.045, -0.06, 0.06, -0.004, 0.004, '#f4f0e6'); G.box('dark', -0.012, 0.012, -0.012, 0.012, 0.0, 0.006, '#1b1a24'); } },
      { name: 'reins', pivot: [L / 2 - 0.55, hood + 0.25, 0], build(G) { for (const s of [-1, 1]) G.tbox('dark', 0.12, 0.0, s * 0.12, 0.3, 0.012, 0.012, '#6a5a3a', 0, 0, -0.2); } },
    ],
    animate(u, v, ctx, dt, st) {
      const t = st.t;
      u.subs.flames.scale.y = 0.85 + 0.25 * Math.sin(t * 11);
      u.subs.card.position.y = roof + 0.6 + Math.sin(t * 2) * 0.05;
      u.subs.card.rotation.y = Math.sin(t) * 0.8;
      u.subs.card.rotation.z = Math.sin(t * 1.3) * 0.3;
      u.subs.reins.rotation.z = Math.sin(t * 3) * 0.1;
    },
  };
};

// ----------------------------------------------------------------------------------------------------------------
export function buildSignature(m) {
  const make = SIG[m.sig || m.id];
  if (!make) return null;
  const spec = make(m);
  const root = assemble(spec, m.colors?.[0] || '#808080');
  // the spade on the Last Trick and a few thin parts are written as zero-thickness prisms: harmless
  bindDrive(root, spec.animate ? (v, ctx, dt, st) => spec.animate(root.userData, v, ctx, dt, st) : null, { roll: m.id === 'bigcheese' ? 1.6 : 0.8 });
  return root;
}

for (const id of Object.keys(SIG)) registerVehicle(id, (model) => buildSignature({ ...model, id: model.id || id }));
