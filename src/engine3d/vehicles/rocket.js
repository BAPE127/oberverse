// The launch complex's moving parts (phase 3D-3): the rocket (two stages, a fairing or a capsule, boosters and landing legs as the look says),
// the crawler-transporter that carries it out to the pad, the engine flame, a puff of smoke, the fireball of a lost vehicle. Pure geometry; the
// timing (what height, which phase) is machines3d.js reading the launch the aerospace system describes (src/aero/launch.js).
// Rocket frame: the foot of the stack at the origin, +y up, centred on x and z. Heights in tiles (look.h), the 2D art's proportions.
import { THREE } from '../lib3d.js';
import { assemble, Geo } from './geo.js';

const INK = '#1b1a24';
const shade = (c, k) => { const col = new THREE.Color(c); return `#${col.lerp(new THREE.Color(k < 0 ? '#000000' : '#ffffff'), Math.abs(k)).getHexString()}`; };

/** Where the first stage ends, as a share of the height: the stage that drops away at separation. */
export const STAGE_SPLIT = 0.52;

const ring = (r, y, n = 10) => { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; o.push([Math.sin(a) * r, y, Math.cos(a) * r]); } return o; };
// (rings are given so that loft(A below, B above) faces outwards: see geo.test)
function tube(G, r0, r1, y0, y1, color, capBottom = false, capTop = false, n = 10) { G.loft('dark', ring(r0, y0, n), ring(r1, y1, n), color, capBottom, capTop); }

export function rocketSpec(look) {
  const H = look.h; const r = Math.max(10, look.w * 14) / 32 / 2;
  const body = look.color || '#f2f2ee'; const band = look.band || '#c8402a';
  const key = `rocket|${H}|${look.w}|${body}|${band}|${look.boosters ? 1 : 0}|${look.legs ? 1 : 0}|${look.capsule ? 1 : 0}`;
  const ySplit = H * STAGE_SPLIT; const fair = H * 0.16;
  return {
    key,
    build() {},
    wheels: [],
    subs: [
      {
        name: 'lower', pivot: [0, 0, 0],
        build(G) {
          tube(G, r, r, 0.12, ySplit, body, false, false);
          tube(G, r * 0.95, r * 0.95, 0.12, 0.3, shade(body, -0.15), false, false);
          tube(G, r + 0.01, r + 0.01, H * 0.1, H * 0.1 + 0.08, band, false, false);
          for (const f of [0.38 * H]) tube(G, r + 0.008, r + 0.008, f - 0.04, f, shade(body, -0.45), false, false);
          // the engine bells
          const bells = look.w >= 2 ? 3 : 1;
          for (let i = 0; i < bells; i++) { const a = bells > 1 ? (i / bells) * Math.PI * 2 : 0; const bx = bells > 1 ? Math.sin(a) * r * 0.5 : 0; const bz = bells > 1 ? Math.cos(a) * r * 0.5 : 0; G.cyl('dark', 'y', bx, 0, bz, r * 0.55 * (bells > 1 ? 0.55 : 1), 0.14, '#2a2c32', { r1: r * 0.28, seg: 8 }); }
          if (look.boosters) for (const s of [-1, 1]) {
            const bx = s * (r + 0.18);
            G.loft('dark', ring(0.17, 0.1, 8).map(([x, y, z]) => [x + bx, y, z]), ring(0.17, H * 0.46, 8).map(([x, y, z]) => [x + bx, y, z]), shade(body, -0.08), false, false);
            G.loft('dark', ring(0.17, H * 0.46, 8).map(([x, y, z]) => [x + bx, y, z]), ring(0.01, H * 0.46 + 0.4, 8).map(([x, y, z]) => [x + bx, y, z]), shade(body, 0.02), true, true);
            G.cyl('dark', 'y', bx, 0, 0, 0.13, 0.14, '#2a2c32', { r1: 0.08, seg: 6 });
            G.box('dark', bx - 0.17, bx + 0.17, 0.1 + H * 0.2, 0.1 + H * 0.2 + 0.05, -0.17, 0.17, band);
            G.box('dark', bx / 2 - 0.02, bx / 2 + 0.02, H * 0.3, H * 0.34, -0.03, 0.03, '#2a2c32'); // the strut
          }
          if (look.legs) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; G.tbox('dark', Math.sin(a) * (r + 0.2), 0.45, Math.cos(a) * (r + 0.2), 0.06, 1.0, 0.06, '#3a3c42', Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); G.cyl('dark', 'y', Math.sin(a) * (r + 0.42), 0, Math.cos(a) * (r + 0.42), 0.09, 0.04, '#2a2c32', { seg: 6 }); }
        },
      },
      {
        name: 'upper', pivot: [0, 0, 0],
        build(G) {
          tube(G, r, r, ySplit, H - fair, body, false, false);
          tube(G, r + 0.012, r + 0.012, ySplit - 0.02, ySplit + 0.06, shade(body, -0.5), false, false); // the interstage
          tube(G, r + 0.01, r + 0.01, ySplit + H * 0.12, ySplit + H * 0.12 + 0.07, band, false, false);
          // the fairing: an ogive in steps, or a capsule
          const top = H - fair;
          const steps = [[r, 0], [r * 0.9, fair * 0.2], [r * 0.7, fair * 0.45], [r * 0.45, fair * 0.7], [r * 0.18, fair * 0.92]];
          for (let i = 0; i < steps.length - 1; i++) tube(G, steps[i][0], steps[i + 1][0], top + steps[i][1], top + steps[i + 1][1], look.capsule ? '#e8e8e4' : shade(body, 0.02 + i * 0.01), false, false);
          G.loft('dark', ring(steps[4][0], top + steps[4][1]), ring(0.01, H), look.capsule ? '#e8e8e4' : body, true, true);
          if (look.capsule) { tube(G, r + 0.03, r + 0.03, top - 0.03, top + 0.05, '#2a2a30', false, false); G.cyl('dark', 'y', 0, H, 0, 0.012, 0.18, '#c8402a', { seg: 4 }); for (const a of [0, 1, 2, 3]) G.box('dark', Math.sin(a * 1.57) * (r * 0.8) - 0.025, Math.sin(a * 1.57) * (r * 0.8) + 0.025, top + fair * 0.25, top + fair * 0.35, Math.cos(a * 1.57) * (r * 0.8) - 0.025, Math.cos(a * 1.57) * (r * 0.8) + 0.025, '#26384e'); }
          for (let i = 0; i < 4; i++) G.box('dark', -0.012, 0.012, H * 0.48 + i * 0.2, H * 0.48 + i * 0.2 + 0.12, r, r + 0.01, band); // markings down the side
        },
      },
    ],
    r, H,
  };
}

export function buildRocket(look) {
  const spec = rocketSpec(look);
  const root = assemble(spec, '#ffffff');
  root.userData.r = spec.r; root.userData.H = spec.H;
  return root;
}

// ------------------------------------------------------------------------------------------------ the crawler
export function buildCrawler() {
  const W = 4.6; const D = 3.4;
  const spec = {
    key: 'crawler',
    build(G) {
      // four track units at the corners, a deck striped at its edges, the launch mount
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = sx * (W / 2 - 0.9); const cz = sz * (D / 2 - 0.55);
        G.prism('dark', [[cx - 0.85, 0.05], [cx + 0.85, 0.05], [cx + 0.95, 0.3], [cx + 0.85, 0.62], [cx - 0.85, 0.62], [cx - 0.95, 0.3]], cz - 0.32, cz + 0.32, '#26282e');
        G.box('dark', cx - 0.85, cx + 0.85, 0.6, 0.68, cz - 0.34, cz + 0.34, '#3a3c44');
      }
      G.box('dark', -W / 2 + 0.25, W / 2 - 0.25, 0.62, 0.95, -D / 2 + 0.2, D / 2 - 0.2, '#9a9a92');
      G.box('dark', -W / 2 + 0.25, W / 2 - 0.25, 0.95, 1.0, -D / 2 + 0.2, D / 2 - 0.2, '#b8b8ae');
      for (let k = 0; k < 8; k++) G.box('dark', -W / 2 + 0.3 + k * 0.5, -W / 2 + 0.55 + k * 0.5, 0.96, 1.0, D / 2 - 0.5, D / 2 - 0.22, k % 2 ? INK : '#e8c040');
      G.box('dark', -0.7, 0.7, 1.0, 1.3, -0.7, 0.7, '#5a5e66'); // the launch mount
      G.box('dark', -0.7, 0.7, 1.3, 1.34, -0.7, 0.7, '#7a7e86');
      for (const s of [-1, 1]) G.box('dark', -0.6, 0.6, 1.0, 1.9, s * 0.72, s * 0.78, '#6a6e76'); // the hold-down frame
    },
    wheels: [],
    subs: [
      { name: 'beacon', pivot: [W / 2 - 0.45, 1.0, -D / 2 + 0.3], build(G) { G.cube('glow:#ff9a2a', 0, 0.06, 0, 0.12, 0.12, 0.12); } },
      { name: 'treads', pivot: [0, 0, 0], build(G) { for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = sx * (W / 2 - 0.9); const cz = sz * (D / 2 - 0.55); for (let k = 0; k < 8; k++) G.box('dark', cx - 0.8 + k * 0.2, cx - 0.74 + k * 0.2, 0.2, 0.55, cz + (sz > 0 ? 0.32 : -0.34), cz + (sz > 0 ? 0.34 : -0.32), '#4a4c56'); } } },
    ],
  };
  const root = assemble(spec, '#ffffff');
  return root;
}

// ------------------------------------------------------------------------------------------------ flame, smoke, fire
let flameG = null;
export function flameParts() {
  if (!flameG) {
    const G = new Geo();
    // a cone pointing down: tip at the origin, widening upward to the nozzle at y = 1
    G.cyl('glow:#ff7a2a', 'y', 0, -1, 0, 0.01, 1, '#fff', { r1: 0.5, seg: 8, caps: false });
    G.cyl('glow:#fff0b0', 'y', 0, -0.72, 0, 0.01, 0.72, '#fff', { r1: 0.28, seg: 8, caps: false });
    flameG = G.build();
  }
  return flameG;
}

let puffGeo = null;
export function puffGeometry() {
  if (!puffGeo) { puffGeo = new THREE.IcosahedronGeometry(1, 1); puffGeo.userData.keep = true; }
  return puffGeo;
}
