// Service vehicles (phase 3D-3): the No. 1 bus and the other lines' buses (a single-decker with a window band, a lit destination board, a door
// behind the cab, roof units) and the tractors of the Red Dirt dealership (an open seat under a roll bar, a cab and a front loader, a big
// cab with dual rear wheels and a GPS dome). Same kit as the cars: merged buckets and four (or more) wheels.
import { mute } from '../lib3d.js';
import { registerVehicle } from '../registry3d.js';
import { assemble } from './geo.js';
import { bindDrive } from './drive.js';
import { SIZE } from './cars.js';

const GLASS = '#2a3b4a';
const TRIM = '#1f2125';
const CHROME = '#b9bec5';
const CREAM = '#efe6cc';

// ------------------------------------------------------------------------------------------------ buses
function busSpec(m) {
  const { L, W } = SIZE({ len: m.len || 150, wid: m.wid || 46 });
  const hw = W / 2; const x0 = -L / 2; const x1 = L / 2;
  const r = 0.3; const ww = 0.26;
  const fx = x1 - 0.85; const rx = x0 + 0.95;
  const z = hw - ww / 2 + 0.03;
  return {
    key: `bus|${L}|${W}`,
    build(G) {
      const P = 'paint';
      G.box('dark', x0 + 0.05, x1 - 0.05, 0.22, 0.5, -hw + 0.04, hw - 0.04, '#15161a'); // the skirt and underbody
      G.box(P, x0, x1, 0.46, 0.84, -hw, hw); // lower panels
      G.box(P, x0, x1, 1.46, 1.74, -hw, hw); // above the windows
      G.box('dark', x0 + 0.02, x1 - 0.02, 0.84, 0.9, -hw - 0.004, hw + 0.004, CREAM); // the cream waist stripe
      // the window band: dark glass set between pillars
      G.box('dark', x0 + 0.04, x1 - 0.04, 0.9, 1.46, -hw + 0.02, hw - 0.02, GLASS);
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const px = x0 + 0.12 + (i * (L - 0.24)) / n;
        for (const s of [-1, 1]) G.box(P, px - 0.03, px + 0.03, 0.9, 1.46, s > 0 ? hw - 0.02 : -hw - 0.012, s > 0 ? hw + 0.012 : -hw + 0.02);
      }
      // the roof: a cream slab, two air-con units
      G.box('dark', x0 + 0.1, x1 - 0.1, 1.74, 1.8, -hw + 0.1, hw - 0.1, CREAM);
      for (const t of [-0.22, 0.15]) G.box('dark', t * L - 0.4, t * L + 0.4, 1.8, 1.96, -0.3, 0.3, '#c8c6bc');
      // the nose: a big windscreen, a lit destination board, lamps, grille panel, bumper, mirrors
      G.box('dark', x1 - 0.01, x1 + 0.014, 0.88, 1.46, -hw + 0.08, hw - 0.08, GLASS);
      G.box(P, x1 - 0.015, x1 + 0.02, 0.88, 1.46, -0.03, 0.03);
      G.box('glow:#ffb02a', x1 - 0.01, x1 + 0.02, 1.5, 1.68, -hw * 0.62, hw * 0.62);
      G.box('dark', x1 - 0.01, x1 + 0.03, 0.5, 0.62, -hw + 0.3, hw - 0.3, '#15161a');
      for (const s of [-1, 1]) G.box('lampF', x1 - 0.02, x1 + 0.03, 0.56, 0.72, s > 0 ? hw - 0.3 : -hw + 0.08, s > 0 ? hw - 0.08 : -hw + 0.3);
      G.box('dark', x1 - 0.05, x1 + 0.07, 0.24, 0.42, -hw + 0.02, hw - 0.02, '#2b2d33');
      for (const s of [-1, 1]) { G.box('dark', x1 - 0.2, x1 - 0.14, 1.0, 1.4, s * (hw + 0.12) - 0.02, s * (hw + 0.12) + 0.02, TRIM); G.box('dark', x1 - 0.24, x1 - 0.1, 1.15, 1.35, s * (hw + 0.12) - 0.03, s * (hw + 0.12) + 0.03, TRIM); }
      // the tail
      G.box('dark', x0 - 0.012, x0 + 0.02, 0.98, 1.44, -hw + 0.2, hw - 0.2, GLASS);
      for (const s of [-1, 1]) G.box('lampR', x0 - 0.02, x0 + 0.03, 0.56, 0.9, s > 0 ? hw - 0.2 : -hw + 0.06, s > 0 ? hw - 0.06 : -hw + 0.2);
      G.box('dark', x0 - 0.05, x0 + 0.07, 0.24, 0.42, -hw + 0.02, hw - 0.02, '#2b2d33');
      G.box('dark', x0 - 0.02, x0 + 0.01, 0.62, 0.74, -0.2, 0.2, '#e6e2d4');
      // the door, on the right-hand (z+) side behind the cab: two glass leaves
      const dx = x1 - 1.3;
      G.box('dark', dx, dx + 0.7, 0.5, 1.46, hw + 0.002, hw + 0.012, '#27323c');
      G.box('dark', dx + 0.345, dx + 0.355, 0.5, 1.46, hw + 0.012, hw + 0.02, TRIM);
      G.box('dark', dx, dx + 0.7, 0.5, 0.56, hw + 0.012, hw + 0.03, '#8a8e94'); // the step
      // wheel arches
      for (const wx of [fx, rx]) for (const s of [-1, 1]) {
        const pts = [[wx - r - 0.06, 0.24]]; for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI; pts.push([wx + Math.cos(a) * (r + 0.06), r + Math.sin(a) * (r + 0.06)]); } pts.push([wx + r + 0.06, 0.24]);
        G.prism('dark', pts, s * (hw + 0.002) - 0.01, s * (hw + 0.002) + 0.01, '#101114');
      }
    },
    wheels: [{ x: fx, z, r, w: ww, steer: true, opts: { hub: '#9ca0a6' } }, { x: fx, z: -z, r, w: ww, steer: true, opts: { hub: '#9ca0a6' } }, { x: rx, z, r, w: ww, opts: { hub: '#9ca0a6' } }, { x: rx, z: -z, r, w: ww, opts: { hub: '#9ca0a6' } }],
  };
}

export function buildBus(m) {
  const root = assemble(busSpec(m), mute(m.colors?.[0] || '#2f6b4f', 0));
  return bindDrive(root, null, { roll: 1.4 });
}

// ------------------------------------------------------------------------------------------------ tractors
function tractorSpec(m) {
  const { L, W } = SIZE(m);
  const tier = m.farm?.tier || (L > 2.6 ? 3 : L > 2.2 ? 2 : 1);
  const x0 = -L / 2; const x1 = L / 2; const hw = W / 2;
  const rR = Math.min(0.62, 0.2 * L + (tier === 3 ? 0.03 : 0)); const wR = 0.12 + rR * 0.45;
  const rF = rR * 0.56; const wF = 0.2;
  const rx = x0 + rR + 0.03;
  const fx = x1 - rF - (tier === 2 ? 0.34 : 0.12);
  const zR = hw - wR / 2; const zF = hw - wF / 2 - 0.06;
  const hood = L * 0.42; const cabTop = L * (tier === 3 ? 0.82 : 0.78);
  const wheels = [
    { x: fx, z: zF, r: rF, w: wF, steer: true, opts: { hub: '#d8d4c4', lugs: 10 } }, { x: fx, z: -zF, r: rF, w: wF, steer: true, opts: { hub: '#d8d4c4', lugs: 10 } },
    { x: rx, z: zR, r: rR, w: wR, opts: { hub: '#d8d4c4', lugs: 14 } }, { x: rx, z: -zR, r: rR, w: wR, opts: { hub: '#d8d4c4', lugs: 14 } },
  ];
  if (tier === 3) { wheels.push({ x: rx, z: zR - wR - 0.01, r: rR, w: wR, opts: { hub: '#d8d4c4', lugs: 14 } }, { x: rx, z: -zR + wR + 0.01, r: rR, w: wR, opts: { hub: '#d8d4c4', lugs: 14 } }); }
  return {
    key: `tractor|${m.id || ''}|${L}|${W}|${tier}`,
    build(G) {
      const P = 'paint';
      const hx0 = tier === 1 ? x0 + L * 0.34 : x0 + L * 0.42;
      const hx1 = tier === 2 ? x1 - 0.5 : x1 - 0.05;
      const bw = Math.min(0.36, W * 0.3); // the bonnet's half width
      G.box('dark', x0 + rR * 0.6, hx1 - 0.1, rR * 0.8, rR * 0.8 + 0.12, -0.2, 0.2, '#2c2e33'); // the chassis
      // the bonnet: a side profile that dips at the nose, in paint, with a darker grille
      G.prism(P, [[hx0, rR * 0.75], [hx1, rR * 0.75], [hx1, hood - 0.12], [hx1 - 0.12, hood], [hx0, hood]], -bw, bw);
      G.box('dark', hx1 - 0.01, hx1 + 0.02, rR * 0.82, hood - 0.14, -bw + 0.06, bw - 0.06, '#17181c');
      for (let i = 0; i < 4; i++) G.box('dark', hx1 + 0.0, hx1 + 0.025, rR * 0.86 + i * 0.07, rR * 0.88 + i * 0.07, -bw + 0.07, bw - 0.07, CHROME);
      for (const s of [-1, 1]) G.box('lampF', hx1 - 0.03, hx1 + 0.03, hood - 0.26, hood - 0.14, s > 0 ? bw - 0.14 : -bw + 0.02, s > 0 ? bw - 0.02 : -bw + 0.14);
      G.cyl('dark', 'y', hx0 + 0.3, hood, bw * 0.55, 0.035, 0.34, '#2a2a2e', { seg: 7 }); // the exhaust stack
      G.cyl('dark', 'y', hx0 + 0.3, hood + 0.34, bw * 0.55, 0.05, 0.03, '#2a2a2e', { seg: 7 });
      // the rear fenders over the big tyres, and the drawbar
      for (const s of [-1, 1]) {
        const zc = s * zR; const zz = (w) => [zc - w / 2, zc + w / 2];
        const [a, b] = zz(wR + 0.04);
        G.box(P, rx - rR * 0.95, rx + rR * 0.95, rR * 2 + 0.03, rR * 2 + 0.09, a, b);
        G.box(P, rx - rR * 1.0, rx - rR * 0.86, rR * 1.45, rR * 2 + 0.09, a, b);
        G.box(P, rx + rR * 0.86, rx + rR * 1.0, rR * 1.45, rR * 2 + 0.09, a, b);
        G.box('lampR', x0 - 0.02, x0 + 0.04, rR * 1.7, rR * 1.7 + 0.1, s > 0 ? zc - 0.05 : zc - 0.05, s > 0 ? zc + 0.05 : zc + 0.05);
      }
      G.box('dark', x0 - 0.02, x0 + 0.12, 0.4, 0.5, -0.1, 0.1, '#2c2e33');
      G.box('dark', fx - 0.05, fx + 0.05, rF * 0.9, rF * 1.2, -zF, zF, '#2c2e33'); // the front axle
      if (tier === 1) {
        G.box('dark', rx - 0.35, rx + 0.12, hood - 0.02, hood + 0.06, -0.24, 0.24, '#26272b'); // the seat pan
        G.box('dark', rx - 0.38, rx - 0.28, hood + 0.06, hood + 0.4, -0.22, 0.22, '#26272b'); // the seat back
        for (const s of [-1, 1]) G.box('dark', rx - 0.3, rx - 0.25, hood - 0.02, hood + 0.72, s * 0.3 - 0.025, s * 0.3 + 0.025, '#d8d8d8'); // the roll bar
        G.box('dark', rx - 0.31, rx - 0.24, hood + 0.7, hood + 0.76, -0.33, 0.33, '#d8d8d8');
        G.cyl('dark', 'y', hx0 + 0.04, hood - 0.02, 0.18, 0.025, 0.4, '#3a3a3e', { seg: 6 }); // the gear lever
      } else {
        // the cab: tinted glass, a roof, pillars, a seat inside
        const cx0 = x0 + L * 0.06; const cx1 = hx0 + 0.04;
        const cw = Math.min(W * 0.6, W - wR * 2 - 0.02);
        G.box('dark', cx0, cx1, hood - 0.1, hood - 0.02, -cw / 2, cw / 2, '#26272b');
        G.prism('dark', [[cx0, hood - 0.02], [cx1, hood - 0.02], [cx1 - 0.05, cabTop], [cx0 + 0.04, cabTop]], -cw / 2, cw / 2, GLASS);
        G.box(P, cx0 - 0.03, cx1 + 0.03, cabTop, cabTop + 0.07, -cw / 2 - 0.05, cw / 2 + 0.05);
        for (const [px, top] of [[cx0 + 0.02, cabTop], [cx1 - 0.03, cabTop]]) for (const s of [-1, 1]) G.box(P, px - 0.035, px + 0.035, hood - 0.02, top, s * cw / 2 - 0.035, s * cw / 2 + 0.035);
        G.cube('dark', (cx0 + cx1) / 2, hood - 0.02, 0, 0.3, 0.2, 0.3, '#26272b');
        if (tier === 3) {
          G.cyl('dark', 'y', cx0 + 0.3, cabTop + 0.07, 0, 0.1, 0.1, '#f0f0ea', { seg: 8 }); // the GPS dome
          G.blob('dark', cx0 + 0.3, cabTop + 0.17, 0, 0.1, 0.07, 0.1, '#f0f0ea', 0);
          for (const s of [-1, 1]) G.box('glow:#fff2c0', cx1 - 0.08, cx1 + 0.0, cabTop + 0.01, cabTop + 0.07, s * 0.3 - 0.08, s * 0.3 + 0.08);
          G.box('dark', x1 - 0.12, x1, 0.45, 0.8, -0.35, 0.35, '#c8c6bc'); // the front weights
        } else if (tier === 2) {
          // the front loader: two arms up to a bucket
          for (const s of [-1, 1]) {
            G.tbox('dark', hx1 + 0.1, hood * 0.62, s * (bw + 0.08), 0.62, 0.07, 0.07, '#4a4e54', 0, 0, 0.35);
            G.tbox('dark', hx1 - 0.2, hood * 0.5 + 0.14, s * (bw + 0.08), 0.3, 0.07, 0.07, '#4a4e54', 0, 0, -0.6);
          }
          G.prism('dark', [[x1 - 0.02, 0.12], [x1 - 0.02, 0.58], [x1 - 0.42, 0.62], [x1 - 0.5, 0.2]], -W * 0.4, W * 0.4, '#6a6e74');
        }
      }
    },
    wheels,
  };
}

export function buildTractor(m) {
  const root = assemble(tractorSpec(m), mute(m.colors?.[0] || '#c8402a', 0));
  return bindDrive(root, null, { roll: 0.5 });
}

registerVehicle('bus', (model) => buildBus(model));
registerVehicle('tractor', (model) => buildTractor(model));
