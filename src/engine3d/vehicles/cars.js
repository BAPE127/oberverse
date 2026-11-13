// The road cars (phase 3D-3): hatch, estate, saloon, police, gt, coupe, limo, pickup. One generator, a table of proportions per body type
// (the cabin layouts are the 2D carSprites' own, as shares of the length from the tail) and the details that tell the types apart:
// an extruded side profile for the body, a glass house on top with pillars and a roof, wheel arches, sills, bumpers, grille, lamps,
// mirrors; a police bar, an estate's roof rails, a pickup's open bed, a GT's wing, the coupe's stripes, the limo's long cabin.
//
// Car frame: +x forward, +y up, +z the right side. Everything static is merged into: paint (swappable colour), dark (vertex colours),
// lampF, lampR (emissive, swapped by drive.js), barR / barB (the siren); plus four wheels. Eight or nine draw calls a car.
import { THREE, mute, shade } from '../lib3d.js';
import { registerVehicle } from '../registry3d.js';
import { assemble } from './geo.js';
import { bindDrive } from './drive.js';

const TILE = 32;

export const SIZE = (m) => ({ L: (m.len || 73) / TILE, W: (m.wid || (m.len || 73) * 0.5) / TILE });

const GLASS = '#34495a';
const TRIM = '#1f2125';
const BUMP = '#2b2d33';
const CHROME = '#b9bec5';

/** Proportions by body type: lay = cabin layout [rear glass, roof start, roof end, bonnet start]; heights in tiles for a ~2.3 long car. */
export const TYPES = {
  hatch: { lay: [0.07, 0.17, 0.56, 0.69], hood: 0.60, nose: 0.50, tail: 0.56, roof: 1.0, r: 0.22, c: 0.15 },
  estate: { lay: [0.05, 0.11, 0.60, 0.71], hood: 0.60, nose: 0.50, tail: 0.58, roof: 1.04, r: 0.22, c: 0.15 },
  saloon: { lay: [0.20, 0.32, 0.58, 0.70], hood: 0.62, nose: 0.50, tail: 0.66, roof: 0.98, r: 0.22, c: 0.15 },
  police: { lay: [0.20, 0.32, 0.58, 0.70], hood: 0.62, nose: 0.50, tail: 0.66, roof: 0.98, r: 0.22, c: 0.15 },
  gt: { lay: [0.20, 0.31, 0.50, 0.64], hood: 0.50, nose: 0.38, tail: 0.56, roof: 0.88, r: 0.22, c: 0.13 },
  coupe: { lay: [0.22, 0.33, 0.52, 0.66], hood: 0.48, nose: 0.36, tail: 0.50, roof: 0.84, r: 0.22, c: 0.12 },
  limo: { lay: [0.12, 0.20, 0.67, 0.76], hood: 0.62, nose: 0.50, tail: 0.64, roof: 1.0, r: 0.22, c: 0.15 },
  pickup: { lay: [0.43, 0.48, 0.63, 0.73], hood: 0.74, nose: 0.62, tail: 0.74, roof: 1.22, r: 0.28, c: 0.22, bed: true },
};

/** A D-shaped wheel arch plate (a half disc on a stem), in the x-y plane, centred on the wheel. */
function archPoly(wx, r, c) {
  const ra = r + 0.045;
  const pts = [[wx - ra, c]];
  const n = 7;
  for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; pts.push([wx + Math.cos(a) * ra, r + Math.sin(a) * ra]); }
  pts.push([wx + ra, c]);
  return pts;
}

/**
 * Write a road car into G. o: { paintBody: bucket for painted parts (default 'paint'), rack, rust }.
 * Returns the layout numbers other builders want: { x0, x1, xa, xd, hood, roof, wheels }.
 */
export function carShell(G, m, T, o = {}) {
  const { L, W } = SIZE(m);
  const sy = 1 + (L / 2.3 - 1) * 0.35; // the taller cars do not simply scale with their length
  const hood = T.hood * sy; const nose = T.nose * sy; const tail = T.tail * sy; const roof = T.roof * sy;
  const c = T.c; const r = T.r;
  const x0 = -L / 2; const x1 = L / 2;
  const X = (t) => x0 + t * L;
  const [l0, l1, l2, l3] = T.lay;
  const xa = X(l0); const xd = X(l3);
  const hw = W / 2;
  const wg = W * 0.82; // the glass house is narrower than the body: the shoulders show
  const P = 'paint';

  // --- the lower body: an extruded side profile
  const xb = T.bed ? xa - 0.05 : x0;
  const prof = T.bed
    ? [[xb, c + 0.05], [x1, c + 0.05], [x1, nose], [xd, hood], [xb, hood]]
    : [[x0, c + 0.05], [x1, c + 0.05], [x1, nose], [xd, hood], [xa, hood], [x0, tail]];
  G.prism(P, prof, -hw, hw);
  // a lower sill band, darker, between the wheels; and the underbody
  const fx = x1 - 0.2 * L; const rx = x0 + 0.2 * L;
  const axles = o.axles || [fx, rx];
  const aMin = Math.min(...axles); const aMax = Math.max(...axles);
  G.box('dark', aMin + r + 0.05, aMax - r - 0.05, c + 0.03, c + 0.13, -hw - 0.007, hw + 0.007, TRIM);
  G.box('dark', x0 + 0.2, x1 - 0.2, c, c + 0.08, -hw + 0.08, hw - 0.08, '#14151a');

  // --- the glass house: tinted glass prism, paint roof, pillars
  const gh = [[xa, hood - 0.01], [xd, hood - 0.01], [X(l2), roof], [X(l1), roof]];
  G.prism('dark', gh, -wg / 2, wg / 2, o.glass || GLASS);
  G.box(P, X(l1) - 0.02, X(l2) + 0.02, roof - 0.01, roof + 0.05, -wg / 2 - 0.012, wg / 2 + 0.012);
  const pillar = (ax, ay, bx, by, w = 0.065) => {
    const ang = Math.atan2(by - ay, bx - ax);
    for (const s of [-1, 1]) G.tbox(P, (ax + bx) / 2, (ay + by) / 2, s * (wg / 2 + 0.004), Math.hypot(bx - ax, by - ay) + 0.03, w, 0.05, undefined, 0, 0, ang);
  };
  pillar(xd, hood - 0.01, X(l2), roof); // A
  pillar(xa, hood - 0.01, X(l1), roof); // C
  const nPill = T.bed ? 0 : m.body === 'limo' ? 3 : 1;
  for (let i = 1; i <= nPill; i++) {
    const px = X(l1) + ((X(l2) - X(l1)) * i) / (nPill + 1);
    for (const s of [-1, 1]) G.box(P, px - 0.03, px + 0.03, hood - 0.01, roof, s * (wg / 2) - 0.03, s * (wg / 2) + 0.03);
  }
  // a door seam and handle on each side
  const seamX = (X(l1) + X(l2)) / 2 - 0.05;
  for (const s of [-1, 1]) {
    G.box('dark', seamX - 0.008, seamX + 0.008, c + 0.1, hood - 0.02, s * (hw + 0.004) - 0.004, s * (hw + 0.004) + 0.004, TRIM);
    G.box('dark', seamX + 0.1, seamX + 0.26, hood - 0.11, hood - 0.085, s * (hw + 0.006) - 0.008, s * (hw + 0.006) + 0.008, CHROME);
  }
  // mirrors
  for (const s of [-1, 1]) G.box(P, xd - 0.16, xd - 0.06, hood + 0.03, hood + 0.12, s * (wg / 2 + 0.03) - (s > 0 ? 0.0 : 0.1), s * (wg / 2 + 0.03) + (s > 0 ? 0.1 : 0.0));

  // --- nose: grille, headlamps, bumper, plate
  G.box('dark', x1 - 0.03, x1 + 0.012, nose - 0.24, nose - 0.05, -W * 0.3, W * 0.3, '#17181c');
  G.box('dark', x1 - 0.02, x1 + 0.016, nose - 0.17, nose - 0.14, -W * 0.28, W * 0.28, CHROME);
  for (const s of [-1, 1]) G.box('lampF', x1 - 0.045, x1 + 0.022, nose - 0.2, nose - 0.06, s > 0 ? hw - 0.3 : -hw + 0.06, s > 0 ? hw - 0.06 : -hw + 0.3);
  G.box('dark', x1 - 0.06, x1 + 0.045, c + 0.02, c + 0.17, -hw + 0.04, hw - 0.04, BUMP);
  // --- tail: lamps, bumper, plate, exhaust
  for (const s of [-1, 1]) G.box('lampR', x0 - 0.022, x0 + 0.045, Math.min(tail, hood) - 0.22, Math.min(tail, hood) - 0.07, s > 0 ? hw - 0.34 : -hw + 0.06, s > 0 ? hw - 0.06 : -hw + 0.34);
  G.box('dark', x0 - 0.045, x0 + 0.06, c + 0.02, c + 0.17, -hw + 0.04, hw - 0.04, BUMP);
  G.box('dark', x0 - 0.052, x0 - 0.03, c + 0.2, c + 0.31, -0.16, 0.16, '#e6e2d4');

  // --- wheel arches (dark half discs) on both sides, behind each wheel
  for (const wx of axles) for (const s of [-1, 1]) {
    const z = s * (hw + 0.002);
    G.prism('dark', archPoly(wx, r, c + 0.02), z - 0.008, z + 0.008, '#101114');
  }

  return { x0, x1, xa, xd, hood, roof, nose, tail, c, r, hw, wg, L, W, sy, fx, rx, X, lay: T.lay };
}

function pickupBed(G, S, m) {
  const { x0, xa, hood, hw, c } = S;
  const P = 'paint';
  const floor = c + 0.28;
  const xb = xa - 0.05;
  G.box('dark', x0, xb, c + 0.04, floor, -hw + 0.06, hw - 0.06, '#2a2b30'); // the chassis under the bed
  G.box('dark', x0 + 0.04, xb, floor, floor + 0.012, -hw + 0.08, hw - 0.08, '#3b3a38'); // the bed floor
  for (const s of [-1, 1]) {
    G.box(P, x0, xb, floor - 0.08, hood - 0.02, s > 0 ? hw - 0.075 : -hw, s > 0 ? hw : -hw + 0.075); // the sides
    G.box('dark', x0 + 0.04, xb - 0.04, hood - 0.02, hood + 0.01, s > 0 ? hw - 0.075 : -hw, s > 0 ? hw : -hw + 0.075, '#2b2d33'); // cap rail
  }
  G.box(P, x0, x0 + 0.06, floor - 0.08, hood - 0.04, -hw, hw); // tailgate
  G.box(P, xb - 0.07, xb, floor, hood + 0.1, -hw + 0.08, hw - 0.08); // the bulkhead
  if (m.id === 'mule') { // the rusty workhorse: a couple of crates and a tarp roll
    G.cube('dark', x0 + 0.34, floor + 0.012, 0.18, 0.4, 0.3, 0.36, '#8a6a40');
    G.cube('dark', x0 + 0.34, floor + 0.312, 0.18, 0.4, 0.02, 0.36, '#6f5430');
    G.tbox('dark', x0 + 0.62, floor + 0.12, -0.26, 0.5, 0.2, 0.2, '#3f6a5a', 0, 0, 0);
  }
}

function rust(G, S, id) {
  // a few brown patches on the bonnet and sides
  const hw = S.hw;
  const rnd = (i) => { const x = Math.sin((i + 1) * 12.9898 + id.length * 78.233) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 7; i++) {
    const s = i % 2 ? 1 : -1;
    const x = S.x0 + 0.1 + rnd(i) * (S.L - 0.2);
    const y = S.c + 0.14 + rnd(i + 9) * 0.22;
    G.box('dark', x, x + 0.14 + rnd(i + 3) * 0.14, y, y + 0.07 + rnd(i + 5) * 0.08, s > 0 ? hw : -hw - 0.01, s > 0 ? hw + 0.01 : -hw, i % 3 ? '#8a4a22' : '#6a3c1e');
  }
}

/** The cabin-side details by type. */
function details(G, S, m, T) {
  const { x0, x1, hood, roof, hw, wg, c, X, L, W, nose, tail } = S;
  const P = 'paint';
  const body = m.body;
  if (body === 'police') {
    // the light bar, a blue band down the flanks, a push bar
    G.box('dark', S.X(T.lay[1]) + 0.12, S.X(T.lay[2]) - 0.35, roof + 0.05, roof + 0.1, -wg * 0.42, wg * 0.42, '#1a1b20');
    const bx = (S.X(T.lay[1]) + S.X(T.lay[2])) / 2 - 0.1;
    G.box('barR', bx - 0.17, bx + 0.17, roof + 0.1, roof + 0.2, -wg * 0.4, -0.02);
    G.box('barB', bx - 0.17, bx + 0.17, roof + 0.1, roof + 0.2, 0.02, wg * 0.4);
    G.box('dark', bx - 0.19, bx + 0.19, roof + 0.2, roof + 0.23, -wg * 0.42, wg * 0.42, '#1a1b20');
    for (const s of [-1, 1]) {
      G.box('dark', x0 + 0.5, x1 - 0.45, hood - 0.3, hood - 0.17, s * (hw + 0.005) - 0.004, s * (hw + 0.005) + 0.004, '#2a4a8a');
      G.box('dark', x0 + 0.5, x1 - 0.45, hood - 0.15, hood - 0.13, s * (hw + 0.005) - 0.004, s * (hw + 0.005) + 0.004, '#f2f2ec');
    }
    G.box('dark', x1 + 0.0, x1 + 0.07, S.c + 0.12, nose - 0.1, -hw * 0.55, hw * 0.55, '#16171a');
    G.box('glow:#ff8a2a', x1 - 0.01, x1 + 0.0, nose - 0.04, nose + 0.0, -hw * 0.35, hw * 0.35);
  } else if (body === 'estate') {
    for (const s of [-1, 1]) G.box('dark', S.X(T.lay[0]) + 0.06, S.X(T.lay[2]), roof + 0.05, roof + 0.095, s * wg * 0.36 - 0.02, s * wg * 0.36 + 0.02, '#26282c');
    for (const t of [0.22, 0.4, 0.55]) G.box('dark', S.X(t) - 0.025, S.X(t) + 0.025, roof + 0.075, roof + 0.115, -wg * 0.38, wg * 0.38, '#26282c');
  } else if (body === 'gt') {
    // a tail wing on posts, twin exhausts, vents in the front wings
    G.box(P, x0 + 0.02, x0 + 0.3, tail + 0.14, tail + 0.19, -hw * 0.9, hw * 0.9);
    for (const s of [-1, 1]) G.box('dark', x0 + 0.1, x0 + 0.14, tail, tail + 0.14, s * hw * 0.7 - 0.02, s * hw * 0.7 + 0.02, '#2b2d33');
    for (const s of [-0.3, 0.3]) G.cyl('dark', 'x', x0 - 0.05, S.c + 0.12, s * W, 0.04, 0.08, CHROME, { seg: 8 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) G.box('dark', x1 - 0.7 - i * 0.07, x1 - 0.67 - i * 0.07, hood - 0.2, hood - 0.08, s * (hw + 0.006) - 0.006, s * (hw + 0.006) + 0.006, '#111');
  } else if (body === 'coupe') {
    const stripe = '#f2f0e6';
    const dx = [-0.1, 0.1];
    for (const z of dx) {
      G.quad('dark', [S.xd, hood + 0.004, z - 0.045], [x1, nose + 0.004, z - 0.045], [x1, nose + 0.004, z + 0.045], [S.xd, hood + 0.004, z + 0.045], stripe);
      G.box('dark', S.X(T.lay[1]), S.X(T.lay[2]) + 0.02, roof + 0.05, roof + 0.054, z - 0.045, z + 0.045, stripe);
      G.quad('dark', [x0, tail + 0.004, z - 0.045], [S.xa, hood + 0.004, z - 0.045], [S.xa, hood + 0.004, z + 0.045], [x0, tail + 0.004, z + 0.045], stripe);
    }
    G.box(P, x0 + 0.0, x0 + 0.22, tail + 0.1, tail + 0.14, -hw * 0.85, hw * 0.85); // a low wing
    for (const s of [-1, 1]) { G.box('dark', x0 + 0.06, x0 + 0.1, tail, tail + 0.1, s * hw * 0.6 - 0.02, s * hw * 0.6 + 0.02, '#2b2d33'); G.box('dark', S.X(0.44), S.X(0.5), S.c + 0.12, hood - 0.12, s * (hw + 0.006) - 0.006, s * (hw + 0.006) + 0.006, '#111'); }
    for (const s of [-0.3, 0.3]) G.cyl('dark', 'x', x0 - 0.05, S.c + 0.12, s * W, 0.04, 0.08, CHROME, { seg: 8 });
  } else if (body === 'limo') {
    for (const s of [-1, 1]) G.box('dark', x0 + 0.1, x1 - 0.1, hood - 0.1, hood - 0.085, s * (hw + 0.005) - 0.004, s * (hw + 0.005) + 0.004, '#d9b24a');
    G.cube('dark', x1 - 0.1, nose + 0.02, 0, 0.08, 0.12, 0.08, '#d9b24a'); // the bonnet mascot
    G.box('dark', x0 + 0.0, x0 + 0.05, tail - 0.3, tail - 0.28, -hw * 0.8, hw * 0.8, '#d9b24a');
  } else if (body === 'hatch') {
    G.box('dark', x0 - 0.01, x0 + 0.03, hood - 0.05, hood - 0.0, -0.1, 0.1, '#1a1b1f'); // a wiper hint at the tailgate
    for (const s of [-1, 1]) G.box(P, x0 + 0.08, x0 + 0.34, roof - 0.01, roof + 0.07, s * wg * 0.44 - 0.02, s * wg * 0.44 + 0.02); // the roof spoiler lip
  }
}

const cache = new Map();
function spec(m) {
  const key = `car|${m.body}|${m.id || ''}|${m.len}|${m.wid}`;
  let s = cache.get(key);
  if (s) return s;
  const T = TYPES[m.body] || TYPES.saloon;
  const { L, W } = SIZE(m);
  const r = T.r; const ww = 0.2;
  const fx = L / 2 - 0.2 * L; const rx = -L / 2 + 0.2 * L;
  const z = W / 2 - ww / 2 + 0.03;
  const hubs = m.body === 'gt' || m.body === 'coupe' ? { hub: '#d4d8dc' } : m.body === 'pickup' ? { hub: '#8a8e94', lugs: 0 } : {};
  s = {
    key,
    build(G) {
      const S = carShell(G, m, T);
      if (T.bed) pickupBed(G, S, m);
      details(G, S, m, T);
      if (m.id === 'mule') rust(G, S, 'mule');
    },
    wheels: [{ x: fx, z, r, w: ww, steer: true, opts: hubs }, { x: fx, z: -z, r, w: ww, steer: true, opts: hubs }, { x: rx, z, r, w: ww, opts: hubs }, { x: rx, z: -z, r, w: ww, opts: hubs }],
  };
  cache.set(key, s);
  return s;
}

/** A road car for a model record (content.vehicles.models[id] plus its id). */
export function buildCar(m) {
  const root = assemble(spec(m), mute(m.colors?.[0] || '#8a8f94', 0.0));
  bindDrive(root);
  return root;
}

for (const body of Object.keys(TYPES)) registerVehicle(body, (model) => buildCar({ ...model, body }));

void THREE; void shade;
