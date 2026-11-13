// Aircraft for Starling Field and Hollowmoor's apron (phase 3D-3, reworked in 0.9x). Every kind in the aerospace catalogue (highwing, twinprop, bizjet,
// bizjet_long, futuristic, turboprop_liner, narrowbody, widebody, blended, trainer, fighter, twinfighter, stealthfighter, futurefighter, tacbomber,
// stratbomber, flyingwing, futurebomber) is its own aircraft, built from the same few parts the cars use (rings lofted into a fuselage, wing panels
// with a section and a control-surface line, fins, podded engines, gear) and painted in the livery given (src/engine/drawAero.js LIVERIES, else the look's
// own colour and trim).
// Frame: +x the nose, +y up, +z starboard; ground level y = 0 with the wheels down. Moves: propellers turn once the aircraft moves, the gear is up in
// the air, navigation lights (red port, green starboard, white tail) show at night, a fighter's burner glows when it rolls or flies.
import { assemble } from './geo.js';
import { mix } from '../lib3d.js';
import { LIVERIES } from '../../engine/drawAero.js';

const INK = '#1b1a24';
const GLASS = '#26384e';
const RADOME = '#a4a9ae';
const PRIMER = '#8fa07e'; // zinc-chromate green: structure before paint (the 2D art's colour)
const BARE = '#b4b8bc';
const METAL = '#2a2c32';

/** The 2D proportions (fractions of the canvas: length down from the nose, span across), copied from drawAero.js, plus the family each is built by. */
export const KINDS = {
  highwing: { fw: 0.12, wingY: 0.3, chord: 0.2, tip: 0.18, sweep: 0, tail: 0.86, stab: 0.36, prop: 'nose', canopy: 'cabin', high: true, fam: 'prop' },
  twinprop: { fw: 0.12, wingY: 0.36, chord: 0.16, tip: 0.11, sweep: 0.02, tail: 0.87, stab: 0.34, prop: 'wing2', canopy: 'cabin', fam: 'prop' },
  bizjet: { fw: 0.13, wingY: 0.48, chord: 0.18, tip: 0.08, sweep: 0.12, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true, fam: 'liner' },
  bizjet_long: { fw: 0.11, wingY: 0.46, chord: 0.18, tip: 0.06, sweep: 0.16, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true, winglets: true, fam: 'liner' },
  futuristic: { fw: 0.2, wingY: 0.55, chord: 0.36, tip: 0.1, sweep: 0.3, tail: 0.92, stab: 0, pods: 'internal', canopy: 'bubble', delta: true, fam: 'fighter' },
  turboprop_liner: { fw: 0.1, wingY: 0.38, chord: 0.13, tip: 0.08, sweep: 0.01, tail: 0.88, stab: 0.3, prop: 'wing2', canopy: 'airliner', tTail: true, high: true, fam: 'prop' },
  narrowbody: { fw: 0.1, wingY: 0.44, chord: 0.18, tip: 0.05, sweep: 0.16, tail: 0.9, stab: 0.32, pods: 'wing2', canopy: 'airliner', winglets: true, fam: 'liner' },
  widebody: { fw: 0.11, wingY: 0.44, chord: 0.2, tip: 0.05, sweep: 0.18, tail: 0.9, stab: 0.34, pods: 'wing2', canopy: 'airliner', winglets: true, fam: 'liner' },
  blended: { fw: 0.3, wingY: 0.5, chord: 0.3, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0, pods: 'wing4', canopy: 'airliner', blended: true, fam: 'blended' },
  trainer: { fw: 0.14, wingY: 0.5, chord: 0.2, tip: 0.1, sweep: 0.04, tail: 0.88, stab: 0.38, pods: 'internal', canopy: 'tandem', fam: 'fighter' },
  fighter: { fw: 0.15, wingY: 0.56, chord: 0.26, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0.42, pods: 'internal', canopy: 'bubble', fins: 1, fam: 'fighter' },
  twinfighter: { fw: 0.2, wingY: 0.55, chord: 0.3, tip: 0.07, sweep: 0.22, tail: 0.92, stab: 0.44, pods: 'internal', canopy: 'bubble', fins: 2, fam: 'fighter' },
  stealthfighter: { fw: 0.22, wingY: 0.56, chord: 0.32, tip: 0.06, sweep: 0.24, tail: 0.9, stab: 0.4, pods: 'internal', canopy: 'bubble', fins: 2, faceted: true, fam: 'fighter' },
  futurefighter: { fw: 0.22, wingY: 0.6, chord: 0.4, tip: 0.04, sweep: 0.32, tail: 0.94, stab: 0, pods: 'internal', canopy: 'bubble', fins: 2, delta: true, faceted: true, fam: 'fighter' },
  tacbomber: { fw: 0.14, wingY: 0.48, chord: 0.22, tip: 0.08, sweep: 0.18, tail: 0.9, stab: 0.36, pods: 'internal2', canopy: 'tandem', fins: 1, fam: 'fighter' },
  stratbomber: { fw: 0.08, wingY: 0.46, chord: 0.2, tip: 0.06, sweep: 0.24, tail: 0.92, stab: 0.3, pods: 'wing4', canopy: 'airliner', fins: 1, fam: 'liner' },
  flyingwing: { flyingWing: true, canopy: 'slit', pods: 'buried', fam: 'wing' },
  futurebomber: { flyingWing: true, canopy: 'slit', pods: 'buried', glow: true, fam: 'wing' },
};

/** The colours of a livery for a look (the 2D rule: a named livery, else the look's own colour and trim). */
export function liveryOf(look, livery) {
  const L = LIVERIES[livery];
  const body = L?.body || look.color || '#f4f4f4';
  return { body, trim: L?.trim || look.trim || '#3a5aa8', wing: L?.wing || mix(body, '#9aa0a8', 0.25), accent: L?.accent || look.trim || '#3a5aa8' };
}

// ---- the parts -------------------------------------------------------------------------------------------------------
const K8 = 1 / Math.cos(Math.PI / 8);
const deg = (r) => (r * 180) / Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const cen = (r) => { const o = [0, 0, 0]; for (const p of r) { o[0] += p[0]; o[1] += p[1]; o[2] += p[2]; } return o.map((v) => v / r.length); };

/** An octagonal ring in the y-z plane at x: flat sides, flat top and belly, fitted into a box rz wide and ry high (ts / bs: top and belly height scales). */
function oct(x, cy, rz, ry, ts = 1, bs = 1, zc = 0) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4); const s = Math.sin(a) * K8; const c = Math.cos(a) * K8;
    out.push([x, cy + s * ry * (s > 0 ? ts : bs), zc + c * rz]);
  }
  return out;
}

/** Skin over a list of same-length rings. Faces are turned to face outwards by themselves; colour(qi, seg, theta, cap) paints each face (qi: the index of the
 *  edge in the ring as given, theta: where around the ring it lies, 0 = starboard, 90 = up, 180 = port; cap 'A' / 'B' for the end discs). */
function shell(G, rings, colour, capA = true, capB = true) {
  const n = rings[0].length;
  const A = rings[0]; const B = rings[1];
  const c = cen([...A, ...B]);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const u = [A[j][0] - A[i][0], A[j][1] - A[i][1], A[j][2] - A[i][2]]; const v = [B[j][0] - A[i][0], B[j][1] - A[i][1], B[j][2] - A[i][2]];
    const nm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const q = cen([A[i], A[j], B[j], B[i]]);
    sum += nm[0] * (q[0] - c[0]) + nm[1] * (q[1] - c[1]) + nm[2] * (q[2] - c[2]);
  }
  const rev = sum < 0;
  const R = rev ? rings.map((r) => r.map((_, i) => r[(n - i) % n])) : rings;
  const col = typeof colour === 'function' ? colour : () => colour;
  for (let s = 0; s < R.length - 1; s++) {
    const a = R[s]; const b = R[s + 1]; const ca = cen(a);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const th = deg(Math.atan2((a[i][1] + a[j][1]) / 2 - ca[1], (a[i][2] + a[j][2]) / 2 - ca[2]));
      G.quad('dark', a[i], a[j], b[j], b[i], col(rev ? (n - 1 - i) % n : i, s, th));
    }
  }
  if (capB) { const b = R[R.length - 1]; const k = cen(b); for (let i = 0; i < n; i++) G.tri('dark', k, b[i], b[(i + 1) % n], col(-1, R.length - 2, 0, 'B')); }
  if (capA) { const a = R[0]; const k = cen(a); for (let i = 0; i < n; i++) G.tri('dark', k, a[(i + 1) % n], a[i], col(-1, 0, 0, 'A')); }
}

/** A wing, tailplane or fin panel through sections { sp (along the span: z, or y for a fin), x (leading edge), c (chord), b (height or offset of the mean line), t (thickness) }.
 *  The section has a rounded leading edge, a thick part forward, a control-surface strip at the back and a thin trailing edge. */
function panel(G, secs, col, { vert = false, xf = null } = {}) {
  const P = [[0, 0.02], [-0.2, 0.5], [-0.7, 0.3], [-1, 0.03], [-0.7, -0.2], [-0.2, -0.5]];
  const rings = secs.map((s) => P.map(([f, k]) => { const q = vert ? [s.x + f * s.c, s.sp, s.b + k * s.t] : [s.x + f * s.c, s.b + k * s.t, s.sp]; return xf ? xf(q) : q; }));
  const C = [col.le || col.top, col.top, col.cs || col.top, col.csb || col.bot || col.top, col.bot || col.top, col.bot || col.top];
  shell(G, rings, (qi) => C[qi < 0 ? 1 : qi], true, true);
}

/** A wing half (s = +1 starboard, -1 port) from the root to the tip with an optional kink: the flap strip inboard, the aileron strip outboard. */
function wingHalf(G, s, w, col) {
  const { z0, z1, zk, x0, c0, x1, c1, y0, y1, t0, t1 } = w;
  const at = (z) => { const f = (z - z0) / (z1 - z0); return { sp: s * z, x: lerp(x0, x1, f), c: lerp(c0, c1, f), b: lerp(y0, y1, f), t: lerp(t0, t1, f) }; };
  const m = zk ?? lerp(z0, z1, 0.62);
  panel(G, [at(z0), at(m)], { ...col, cs: col.flap || col.cs });
  panel(G, [at(m), at(z1)], { ...col, cs: col.aileron || col.cs });
}

const cant = (a, y0, z0) => (q) => { const dy = q[1] - y0; const dz = q[2] - z0; return [q[0], y0 + dy * Math.cos(a) - dz * Math.sin(a), z0 + dy * Math.sin(a) + dz * Math.cos(a)]; };

/** A turbofan or jet pod along x: lip and intake at the front (dark), tail cone behind. */
function pod(G, x, y, z, r, len, body, lip) {
  const T = [[-0.5, 0.58], [-0.34, 0.82], [0, 1], [0.34, 1.04], [0.5, 1.02]];
  const rings = T.map(([f, k]) => oct(x + f * len, y, r * k, r * k, 1, 1, z));
  shell(G, rings, (qi, seg, th, cap) => (cap ? METAL : seg === 3 ? lip : seg === 0 ? mix(body, INK, 0.45) : body), true, true);
}

/** A glazed teardrop canopy standing on the spine: from x0 (aft) to x1 (fore), its base at y. */
function canopy(G, x0, x1, y, rz, h, glass = GLASS) {
  const T = [[0, 0.25, 0.3], [0.2, 0.75, 0.75], [0.5, 1, 1], [0.8, 0.8, 0.8], [1, 0.3, 0.3]];
  const rings = T.map(([f, kz, ky]) => oct(lerp(x0, x1, f), y + h * 0.18 * ky, rz * kz, h * 0.5 * ky + 0.01, 1, 0.5));
  shell(G, rings, (qi, seg, th) => (th > 20 && th < 160 ? glass : mix(glass, '#aeb4ba', 0.35)), true, true);
}

/** A missile or bomb: body, nose cone, fins. */
function round(G, x0, x1, y, z, r, col, tip) {
  G.cyl('dark', 'x', x0, y, z, r, x1 - x0, col, { seg: 6 });
  G.cyl('dark', 'x', x1, y, z, r, r * 3, tip, { r1: 0.004, seg: 6 });
  G.box('dark', x0, x0 + r * 4, y - r * 2.4, y + r * 2.4, z - 0.006, z + 0.006, mix(col, INK, 0.3));
  G.box('dark', x0, x0 + r * 4, y - r * 0.4, y + r * 0.4, z - r * 2.4, z + r * 2.4, mix(col, INK, 0.3));
}

// ---- a built aircraft: the layout is made once per look, with the geometry ----------------------------------------------------
const SPECS = new Map();

function spec(look, livery, stage) {
  const K = KINDS[look.kind] || KINDS.highwing;
  const liv0 = liveryOf(look, livery);
  const st = stage || null;
  const painted = !st || st.painted !== false;
  const liv = painted ? liv0 : { body: PRIMER, trim: mix(PRIMER, INK, 0.25), wing: BARE, accent: mix(PRIMER, INK, 0.25) };
  const sk = st ? `${Math.round((st.fuselage ?? 1) * 8)}${Math.round((st.wings ?? 1) * 8)}${st.engines === false ? 0 : 1}${painted ? 1 : 0}` : 'done';
  const key = `air2|${look.kind}|${look.len}|${look.span}|${liv0.body}|${liv0.trim}|${liv0.wing}|${livery || ''}|${sk}`;
  const hit = SPECS.get(key);
  if (hit) return hit;
  const Ln = look.len; const S = look.span;
  const c = {
    K, liv, Ln, S, st, painted, hs: S / 2,
    xn: Ln / 2, xt: -Ln / 2, G: null, R: 0.3, gh: 0.3, ay: 0.6,
    gear: { nose: null, mains: [], wr: 0.1, ww: 0.07, twin: false }, navs: [], props: [], burners: [],
  };
  c.xAt = (f) => c.xn - f * Ln;
  const FAM = { prop: lightProp, liner: jetliner, blended, fighter, wing: flyingWing }[K.fam] || jetliner;
  const pv = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const sp = {
    key,
    build(G) {
      c.G = G;
      const built = st && st.fuselage < 1 ? Math.max(0.15, st.fuselage) : 1;
      FAM(c, built);
      if (built < 1) { // a part-built fuselage stands on two trestles inside its own length
        const x0 = c.xt; const L = c.Ln * built;
        c.gear.nose = [x0 + L - 0.4, 0, c.ay - c.R * 0.55]; c.gear.mains = [[x0 + L * 0.5, 0, c.ay - c.R * 0.55, false]]; c.gear.twin = false; c.gear.twinNose = false;
      }
      c.props.forEach((p, i) => { if (pv[i]) { pv[i][0] = p.x; pv[i][1] = p.y; pv[i][2] = p.z; } });
    },
    subs: [
      {
        name: 'gear', pivot: [0, 0, 0],
        build(G) {
          const g = c.gear; const wr = g.wr; const ww = g.ww;
          const wheel = (x, z) => {
            G.cyl('dark', 'z', x, wr, z - ww / 2, wr, ww, '#1c1c20', { seg: 8 });
            G.cyl('dark', 'z', x, wr, z - ww / 2 - 0.006, wr * 0.52, ww + 0.012, '#aeb4ba', { seg: 6 });
          };
          const leg = (x, z, top, twin, w = 0.03) => {
            G.box('dark', x - w, x + w, wr, top, z - w, z + w, '#8a8e94');
            G.box('dark', x - w * 0.6, x + w * 0.6, wr + (top - wr) * 0.35, wr + (top - wr) * 0.5, z - w * 1.3, z + w * 1.3, '#4a4e54');
            if (twin) { wheel(x, z - ww * 0.75); wheel(x, z + ww * 0.75); } else wheel(x, z);
            if (twin === 'bogie') { wheel(x - wr * 2.3, z - ww * 0.75); wheel(x - wr * 2.3, z + ww * 0.75); }
          };
          if (g.nose) leg(g.nose[0], g.nose[1], g.nose[2], g.twinNose, 0.025);
          for (const m of g.mains) leg(m[0], m[1], m[2], m[3] ?? g.twin);
        },
      },
      { name: 'nav', pivot: [0, 0, 0], build(G) { for (const n of c.navs) G.cube(`glow:${n.c}`, n.x, n.y, n.z, 0.12, 0.12, 0.12); } },
      { name: 'burn', pivot: [0, 0, 0], build(G) { for (const b of c.burners) G.cyl(`glow:${b.c || '#ffb040'}`, 'x', b.x, b.y, b.z, b.r, -b.len, '#fff', { r1: 0.01, seg: 6 }); } },
      ...[0, 1, 2, 3].map((i) => ({
        name: `prop${i}`, pivot: pv[i],
        build(G) {
          const p = c.props[i]; if (!p) return;
          const bl = p.blades || 2; const r = p.r;
          G.cyl('dark', 'x', -0.02, 0, 0, r * 0.2, 0.1, '#6a6e74', { seg: 6 });
          for (let k = 0; k < bl; k++) {
            const a = (k / bl) * Math.PI * 2 + 0.3;
            G.tbox('dark', 0.02, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0.014, r * 1.1, r * 0.22, k % 2 ? "#26282c" : "#2e3034", a, 0, 0);
            void a;
          }
        },
      })),
    ],
    c,
  };
  SPECS.set(key, sp);
  return sp;
}

// ---- families ----------------------------------------------------------------------------------------------------------------

/** Row of a station table [u, rz, ry, cy, ts, bs] at u (0 = tail, 1 = nose), interpolated. */
function rowAt(rows, u) {
  if (u <= rows[0][0]) return rows[0];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]; const b = rows[i + 1];
    if (u <= b[0]) { const t = (u - a[0]) / (b[0] - a[0] || 1); return [u, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4] ?? 1, b[4] ?? 1, t), lerp(a[5] ?? 1, b[5] ?? 1, t)]; }
  }
  return rows[rows.length - 1];
}
/** The fuselage, tail first; `cut` < 1 stops it short (under construction). colourFn(u, theta, cap). */
function fuselage(c, rows, colourFn, cut = 1) {
  const { R, xt, Ln, ay } = c;
  let rs = rows.filter((r) => r[0] <= cut + 1e-6);
  if (cut < 1 && rs[rs.length - 1][0] < cut) rs = [...rs, rowAt(rows, cut)];
  if (rs.length < 2) rs = [rows[0], rows[1]];
  const rings = rs.map((r) => oct(xt + r[0] * Ln, ay + r[3] * R, r[1] * R, r[2] * R, r[4] ?? 1, r[5] ?? 1));
  shell(c.G, rings, (qi, seg, th, cap) => colourFn((rs[seg][0] + rs[seg + 1][0]) / 2, th, cap, seg === rs.length - 2), true, true);
}
const topAt = (c, rows, u) => { const r = rowAt(rows, u); return c.ay + (r[3] + r[2] * (r[4] ?? 1)) * c.R; };
const sideAt = (c, rows, u) => rowAt(rows, u)[1] * c.R;
const botAt = (c, rows, u) => { const r = rowAt(rows, u); return c.ay + (r[3] - r[2] * (r[5] ?? 1)) * c.R; };

const sym = (f) => { f(1); f(-1); };
const navLights = (c, x, y, z, tail) => { c.navs.push({ x, y, z, c: '#3fe07a' }, { x, y, z: -z, c: '#ff3a2a' }); if (tail) c.navs.push({ x: tail[0], y: tail[1], z: 0, c: '#f4f0d8' }); };

/** Wing geometry of a kind: root and tip leading edges, chords. */
function wingPlan(c, o) {
  const { K, Ln, hs } = c;
  const c0 = K.chord * Ln * (o.c0 ?? 1); const c1 = Math.max(0.1, K.tip * Ln * (o.c1 ?? 1));
  const x0 = c.xAt(K.wingY) + c0 / 2;
  const x1 = x0 - K.sweep * Ln * (o.sweepK ?? 1.3) - (o.shift ?? 0);
  return { c0, c1, x0, x1, hs };
}

/** Jet transports and bombers: tapered fuselage, swept wing with flap lines, podded engines, tail. */
function jetliner(c, built) {
  const { K, G, Ln, S, liv, hs } = c;
  const big = Ln >= 9; const bomber = Ln >= 10 && K.fins === 1;
  const biz = K.pods === 'tail2';
  const R = bomber ? Math.min(Ln * 0.05, 0.62) : Math.min(Ln * 0.085, Math.max(0.2, (K.fw * S) / 2));
  c.R = R;
  const wr = Math.max(0.1, R * 0.26); c.gear.wr = wr; c.gear.ww = Math.max(0.07, R * 0.2);
  c.gh = K.pods === 'wing2' ? R * 0.84 + 0.1 : K.pods === 'wing4' ? R * 0.9 + 0.1 : R * 0.45 + 0.12;
  c.ay = c.gh + R;
  const { ay, xn, xt } = c;
  // fuselage
  const rows = biz ? [[0, 0.1, 0.12, 0.5], [0.07, 0.38, 0.4, 0.4], [0.2, 0.8, 0.82, 0.18], [0.3, 1, 1, 0.04], [0.8, 1, 1, 0], [0.89, 0.92, 0.94, -0.03], [0.955, 0.7, 0.72, -0.11], [0.995, 0.34, 0.34, -0.2]]
    : [[0, 0.12, 0.14, 0.55], [0.06, 0.3, 0.34, 0.45], [0.16, 0.62, 0.68, 0.26], [0.28, 0.92, 0.96, 0.08], [0.34, 1, 1, 0], [0.8, 1, 1, 0], [0.9, 0.93, 0.95, -0.03], [0.96, 0.74, 0.76, -0.1], [0.995, 0.4, 0.4, -0.18]];
  if (K === KINDS.widebody) { // the upper deck: the top of the nose section stands up, as on the big long-haul airliners
    rows.splice(0, rows.length, [0, 0.12, 0.14, 0.55], [0.06, 0.3, 0.34, 0.45], [0.16, 0.62, 0.68, 0.26], [0.28, 0.92, 0.96, 0.08], [0.34, 1, 1, 0], [0.62, 1, 1, 0], [0.72, 1, 1, 0, 1.3], [0.84, 0.96, 1, -0.02, 1.34], [0.9, 0.9, 0.98, -0.05, 1.12], [0.955, 0.72, 0.8, -0.12], [0.995, 0.4, 0.42, -0.2]);
  }
  if (bomber) rows.splice(0, rows.length, [0, 0.1, 0.12, 0.45], [0.06, 0.34, 0.4, 0.34], [0.15, 0.7, 0.76, 0.14], [0.26, 1, 1, 0], [0.85, 1, 1, 0], [0.93, 0.9, 0.92, -0.06], [0.98, 0.6, 0.6, -0.16], [0.998, 0.28, 0.3, -0.22]);
  const belly = mix(liv.body, '#8a9098', c.painted ? 0.32 : 0);
  const glaze = c.painted ? GLASS : '#5a6a5a';
  fuselage(c, rows, (u, th, cap) => {
    if (cap === 'B') return RADOME; if (cap === 'A') return liv.body;
    if (u > 0.9 && th > 20 && th < 160 && !bomber) return glaze;
    if (u > 0.9 && th > 25 && th < 155 && bomber) return glaze;
    if (u > 0.968) return RADOME;
    if (u < 0.045) return mix(liv.body, INK, 0.2);
    if (th < -30) return belly;
    return liv.body;
  }, built);
  const full = built >= 1;
  // windows and the cheat line
  const sx = (u) => xt + u * Ln;
  if (!bomber && full) {
    const zs = R + 0.006;
    for (const s of [-1, 1]) {
      G.box('dark', sx(0.34), sx(0.86), ay + R * 0.1, ay + R * 0.34, s > 0 ? zs - 0.006 : -zs, s > 0 ? zs : -zs + 0.006, glaze);
      G.box('dark', sx(0.12), sx(0.9), ay - R * 0.42, ay - R * 0.2, s > 0 ? zs - 0.005 : -zs, s > 0 ? zs : -zs + 0.005, liv.trim);
    }
    for (const u of [0.45, 0.56, 0.67, 0.77]) for (const s of [-1, 1]) G.box('dark', sx(u), sx(u) + R * 0.1, ay + R * 0.1, ay + R * 0.34, s > 0 ? zs - 0.002 : -zs - 0.004, s > 0 ? zs + 0.004 : -zs + 0.002, mix(liv.body, GLASS, 0.15)); // pillars between the windows
    for (const s of [-1, 1]) G.box('dark', sx(0.87), sx(0.91), ay + R * 0.1, ay + R * 0.3, s > 0 ? zs - 0.005 : -zs, s > 0 ? zs : -zs + 0.005, glaze);
  }
  if (bomber && full) {
    G.box('dark', sx(0.4), sx(0.6), ay - R * 1.01, ay - R * 0.97, -R * 0.4, R * 0.4, mix(liv.body, INK, 0.45)); // bomb bay doors
    for (const s of [-1, 1]) G.box('dark', sx(0.2), sx(0.8), ay + R * 0.2, ay + R * 0.3, s > 0 ? R : -R - 0.006, s > 0 ? R + 0.006 : -R, liv.trim);
  }
  // wings
  const level = K.high ? 'high' : 'low';
  const wy0 = level === 'high' ? ay + R * 1.0 : ay - R * 0.52;
  const wp = wingPlan(c, { sweepK: bomber ? 1.15 : biz ? 1.5 : 1.35 });
  const t0 = Math.max(0.07, wp.c0 * 0.13); const t1 = Math.max(0.04, wp.c1 * 0.14);
  const dih = biz ? 0.04 : bomber ? -0.02 : 0.055;
  const wcol = { le: mix(liv.wing, '#ffffff', 0.2), top: liv.wing, flap: mix(liv.wing, INK, 0.16), aileron: mix(liv.wing, INK, 0.1), bot: mix(liv.wing, '#6a7078', 0.25), csb: mix(liv.wing, INK, 0.3) };
  const wopt = { z0: R * 0.5, z1: hs, x0: wp.x0, c0: wp.c0, x1: wp.x1, c1: wp.c1, y0: wy0, y1: wy0 + dih * hs, t0, t1 };
  const wShown = c.st ? (c.st.wings ?? 1) : 1;
  if (wShown > 0.45) {
    const hsW = wShown >= 1 ? hs : R * 0.5 + (hs - R * 0.5) * 0.55;
    const w2 = { ...wopt, z1: hsW, x1: lerp(wp.x0, wp.x1, (hsW - R * 0.5) / (hs - R * 0.5)), c1: lerp(wp.c0, wp.c1, (hsW - R * 0.5) / (hs - R * 0.5)) };
    sym((s) => wingHalf(G, s, w2, wcol));
    const tipLE = w2.x1; const tipTE = w2.x1 - w2.c1; const tipY = w2.y1;
    if (wShown >= 1) {
      // wingtips: winglets, or just the colour
      if (K.winglets) {
        const h = Math.max(0.3, Ln * 0.04 + R * 0.4);
        sym((s) => panel(G, [{ sp: tipY, x: tipLE, c: w2.c1 * 1.1, b: s * (hs - 0.01), t: 0.04 }, { sp: tipY + h, x: tipLE - h * (bomber ? 0.2 : 0.65), c: w2.c1 * 0.6, b: s * (hs + h * 0.12), t: 0.025 }], { top: liv.trim, bot: liv.trim }, { vert: true }));
      } else sym((s) => G.box('dark', tipTE, tipLE, tipY - 0.01, tipY + t1 + 0.01, s > 0 ? hs - 0.12 : -hs, s > 0 ? hs : -hs + 0.12, liv.trim));
      navLights(c, tipLE - w2.c1 * 0.5, tipY + 0.1, hs - 0.03, [xt + 0.02, ay + R * 0.7]);
    }
    c.wy0 = wy0; c.wp = wp; c.wopt = w2;
  } else navLights(c, xt + 0.1, ay + R * 0.4, 0.1, [xt + 0.02, ay + R * 0.7]);
  const wingAt = (z) => { const f = (z - R * 0.5) / (hs - R * 0.5); return { le: lerp(wp.x0, wp.x1, f), te: lerp(wp.x0 - wp.c0, wp.x1 - wp.c1, f), y: lerp(wy0, wy0 + dih * hs, f), t: lerp(t0, t1, f) }; };
  // tail
  if (built >= 0.9) {
    const tall = Ln * (bomber ? 0.15 : biz ? 0.16 : 0.17);
    const fx = xt + Ln * (bomber ? 0.2 : 0.2) + Ln * 0.11;
    const fy = topAt(c, rows, 0.18) - R * 0.25;
    const fc = Ln * (bomber ? 0.15 : 0.13); const fc1 = fc * 0.48; const fsw = tall * (bomber ? 0.72 : 0.64);
    panel(G, [{ sp: fy, x: fx, c: fc, b: 0, t: 0.09 }, { sp: fy + tall, x: fx - fsw, c: fc1, b: 0, t: 0.04 }], { top: liv.trim, bot: liv.trim, le: mix(liv.trim, '#ffffff', 0.15), cs: mix(liv.trim, INK, 0.12) }, { vert: true });
    G.box('dark', fx - fsw - fc1 + 0.01, fx - fsw + 0.04, fy + tall - 0.0, fy + tall + 0.03, -0.03, 0.03, mix(liv.trim, INK, 0.3));
    // tailplanes
    if (K.stab > 0) {
      const ss = (K.stab * S) / 2; const sc = Ln * 0.075; const sc1 = sc * 0.42;
      const T = K.tTail;
      const sy = T ? fy + tall - 0.02 : ay + rowAt(rows, 0.12)[3] * R + 0.02;
      const sx0 = T ? fx - fsw : xt + Ln * 0.235; const sh = Ln * 0.06;
      const z0 = T ? 0 : sideAt(c, rows, 0.12) * 0.6;
      sym((s) => wingHalf(G, s, { z0, z1: ss, x0: sx0, c0: sc, x1: sx0 - sh, c1: sc1, y0: sy, y1: sy + (T ? 0 : 0.05), t0: 0.05, t1: 0.03 }, { top: liv.wing, bot: mix(liv.wing, '#6a7078', 0.25), flap: mix(liv.wing, INK, 0.16), aileron: mix(liv.wing, INK, 0.16) }));
    }
  }
  // engines
  const eng = built >= 1 && (c.st ? c.st.engines !== false : true);
  const ec = c.painted ? mix(liv.wing, '#8a9098', 0.4) : BARE; const lip = c.painted ? mix(ec, '#ffffff', 0.3) : BARE;
  if (eng && K.pods === 'wing2') {
    const rN = R * (big ? 0.64 : 0.54); const len = rN * (big ? 4.1 : 3.5);
    sym((s) => {
      const z = hs * (big ? 0.31 : 0.34); const w = wingAt(z);
      const ey = w.y - rN * 0.86 - w.t * 0.4; const ex = w.le + len * 0.18;
      pod(G, ex, ey, s * z, rN, len, ec, lip);
      G.prism('dark', [[w.le - 0.04, w.y - w.t * 0.4], [w.te + w.t, w.y - w.t * 0.2], [ex + len * 0.0, ey + rN * 0.55], [ex + len * 0.32, ey + rN * 0.5]], s * z - 0.035, s * z + 0.035, mix(liv.wing, '#6a7078', 0.15));
      c.burners.push({ x: ex - len * 0.5, y: ey, z: s * z, r: rN * 0.5, len: len * 0.0 + 0.0001, c: '#ffb040' });
    });
    c.burners.length = 0;
  } else if (eng && K.pods === 'wing4') {
    const rN = Math.max(0.16, R * 0.38); const len = rN * 3.6;
    for (const f of [0.2, 0.4]) sym((s) => {
      const z = hs * f; const w = wingAt(z);
      const ey = w.y - rN * 0.95 - w.t * 0.3; const ex = w.le + len * 0.25;
      pod(G, ex, ey, s * z - s * rN * 1.1, rN, len, ec, lip); pod(G, ex, ey, s * z + s * rN * 1.1, rN, len, ec, lip);
      G.prism('dark', [[w.le - 0.02, w.y - w.t * 0.35], [w.te + w.t, w.y - w.t * 0.2], [ex - len * 0.1, ey + rN * 0.6], [ex + len * 0.32, ey + rN * 0.55]], s * z - 0.04, s * z + 0.04, mix(liv.wing, '#6a7078', 0.15));
      G.box('dark', ex - len * 0.1, ex + len * 0.3, ey + rN * 0.6, ey + rN * 0.8, s * z - rN * 1.1, s * z + rN * 1.1, mix(liv.wing, '#6a7078', 0.15));
    });
  } else if (eng && K.pods === 'tail2') {
    const rN = R * 0.4; const len = rN * 3.6; const ex = xt + Ln * 0.2 + len * 0.1; const ey = ay + R * 0.3;
    sym((s) => {
      const zc = sideAt(c, rows, 0.26) + rN * 0.7;
      pod(G, ex, ey, s * zc, rN, len, ec, lip);
      G.box('dark', ex - len * 0.1, ex + len * 0.25, ey - rN * 0.4, ey + rN * 0.3, s * zc - s * rN * 0.8 - 0.03, s * zc - s * rN * 0.8 + 0.03, mix(liv.body, '#8a9098', 0.2));
    });
  }
  // gear
  const gx = (wp.x0 - wp.c0 * 0.15);
  const top = (y) => y;
  c.gear.nose = [xn - Ln * 0.14, 0, ay - R * 0.5]; c.gear.twinNose = true;
  c.gear.twin = big || bomber ? 'bogie' : true; c.gear.mains = [];
  const mz = bomber ? R * 0.9 : R * 0.95 + (big ? 0.4 : 0.25);
  c.gear.mains.push([gx, mz, top(wopt0(wy0)), big || bomber ? 'bogie' : true], [gx, -mz, top(wopt0(wy0)), big || bomber ? 'bogie' : true]);
  if (bomber) c.gear.mains.push([gx + 1.3, R * 0.5, ay - R * 0.5, 'bogie'], [gx + 1.3, -R * 0.5, ay - R * 0.5, 'bogie'], [gx - 0.9, hs * 0.62, wingAt(hs * 0.62).y - 0.02, false], [gx - 0.9, -hs * 0.62, wingAt(hs * 0.62).y - 0.02, false]);
  c.gear.mains.forEach((m) => { m[2] = Math.max(m[2], c.gear.wr * 3); });
  if (bomber && !c.st) c.burners.length = 0;
  // military marks
  if (K.fins === 1 || bomber) roundel(c, wp, wy0, t0, liv);
  // big liners: a dorsal hump of the cockpit and antennas
  if (big && full) G.box('dark', xn - Ln * 0.22, xn - Ln * 0.16, ay + R * 0.98, ay + R * 1.08, -0.04, 0.04, mix(liv.body, INK, 0.2));
  void top;
}
function wopt0(y) { return y; }

function roundel(c, wp, wy, t, liv) {
  const { G, hs } = c;
  if (c.st && c.st.painted === false) return;
  const x = wp.x0 - wp.c0 * 0.45 - (wp.x0 - wp.x1) * 0.28; const z = hs * 0.4; const y = wy + t * 0.55 + 0.012;
  sym((s) => { G.cyl('dark', 'y', x, y, s * z, 0.17, 0.006, liv.accent, { seg: 8 }); G.cyl('dark', 'y', x, y + 0.004, s * z, 0.1, 0.006, mix(liv.trim, INK, 0.4), { seg: 8 }); });
}

/** Light and regional propeller aircraft. */
function lightProp(c, built) {
  const { K, G, Ln, S, liv, hs } = c;
  const liner = Ln >= 6.5;
  const R = liner ? Math.min(Ln * 0.085, 0.58) : Math.max(0.2, (K.fw * S) / 2);
  c.R = R;
  c.gear.wr = Math.max(0.1, R * (liner ? 0.3 : 0.45)); c.gear.ww = Math.max(0.07, R * 0.18);
  c.gh = liner ? R * 0.85 + 0.06 : R * 0.9 + 0.04;
  c.ay = c.gh + R;
  const { ay, xn, xt } = c;
  const nose = K.prop === 'nose';
  const rows = nose
    ? [[0, 0.1, 0.12, 0.7], [0.08, 0.22, 0.3, 0.55], [0.3, 0.55, 0.7, 0.34], [0.5, 1, 1.05, 0.12], [0.68, 1, 1.12, 0.1], [0.78, 0.92, 1, 0.02], [0.8, 0.88, 0.9, -0.05], [0.97, 0.84, 0.84, -0.05], [0.995, 0.78, 0.78, -0.05]]
    : liner ? [[0, 0.12, 0.14, 0.6], [0.06, 0.3, 0.34, 0.5], [0.16, 0.62, 0.68, 0.3], [0.28, 0.92, 0.96, 0.1], [0.34, 1, 1, 0], [0.8, 1, 1, 0], [0.9, 0.9, 0.92, -0.08], [0.97, 0.7, 0.72, -0.14], [0.998, 0.5, 0.5, -0.16]]
      : [[0, 0.1, 0.12, 0.62], [0.08, 0.3, 0.34, 0.5], [0.2, 0.68, 0.76, 0.28], [0.34, 1, 1, 0.06], [0.7, 1, 1, 0], [0.86, 0.9, 0.88, -0.1], [0.96, 0.62, 0.6, -0.2], [0.995, 0.3, 0.3, -0.26]];
  const glaze = c.painted ? GLASS : '#5a6a5a';
  fuselage(c, rows, (u, th, cap) => {
    if (cap === 'A') return liv.body;
    if (cap === 'B') return nose ? '#4a4e54' : RADOME;
    if (nose && u > 0.8) return mix(liv.body, liv.trim, 0.7);
    if (!nose && !liner && u > 0.88 && th > 30 && th < 150) return glaze;
    if (liner && u > 0.9 && th > 20 && th < 160) return glaze;
    if (th < -30) return mix(liv.body, '#8a9098', 0.25);
    return liv.body;
  }, built);
  const full = built >= 1;
  const sx = (u) => xt + u * Ln;
  if (full) {
    const zs = rowAt(rows, 0.55)[1] * R + 0.006;
    for (const s of [-1, 1]) {
      if (nose) { G.box('dark', sx(0.52), sx(0.76), ay + R * 0.3, ay + R * 0.9, s > 0 ? zs - 0.006 : -zs, s > 0 ? zs : -zs + 0.006, glaze); }
      else G.box('dark', sx(0.36), sx(liner ? 0.86 : 0.8), ay + R * 0.1, ay + R * 0.38, s > 0 ? zs - 0.006 : -zs, s > 0 ? zs : -zs + 0.006, glaze);
      G.box('dark', sx(0.2), sx(nose ? 0.78 : 0.9), ay - R * 0.38, ay - R * 0.18, s > 0 ? zs - 0.005 : -zs, s > 0 ? zs : -zs + 0.005, liv.trim);
    }
    if (nose) { // windscreen and a roof
      G.prism('dark', [[sx(0.78), ay + R * 0.1], [sx(0.7), ay + R * 1.0], [sx(0.66), ay + R * 1.12], [sx(0.78), ay + R * 0.95]], -R * 0.7, R * 0.7, glaze);
    }
  }
  // wings
  const high = K.high; const wy0 = high ? ay + R * (nose ? 1.2 : 1.0) + 0.04 : ay - R * 0.5;
  const wp = wingPlan(c, { c0: nose ? 1.25 : 1, c1: nose ? 1.1 : 1, sweepK: 1 });
  const t0 = Math.max(0.06, wp.c0 * (nose ? 0.14 : 0.12)); const t1 = Math.max(0.04, wp.c1 * 0.1);
  const dih = high ? -0.0 : 0.05;
  const wcol = { le: mix(liv.wing, '#ffffff', 0.25), top: liv.wing, flap: mix(liv.wing, INK, 0.14), aileron: liv.trim, bot: mix(liv.wing, '#6a7078', 0.2), csb: mix(liv.wing, INK, 0.3) };
  const wShown = c.st ? (c.st.wings ?? 1) : 1;
  const hsW = wShown >= 1 ? hs : R * 0.5 + (hs - R * 0.5) * 0.55;
  const wf = (hsW - R * 0.5) / (hs - R * 0.5);
  const w2 = { z0: R * 0.5, z1: hsW, x0: wp.x0, c0: wp.c0, x1: lerp(wp.x0, wp.x1, wf), c1: lerp(wp.c0, wp.c1, wf), y0: wy0, y1: wy0 + dih * hs, t0, t1 };
  const wingAt = (z) => { const f = (z - R * 0.5) / (hs - R * 0.5); return { le: lerp(wp.x0, wp.x1, f), te: lerp(wp.x0 - wp.c0, wp.x1 - wp.c1, f), y: lerp(wy0, wy0 + dih * hs, f) }; };
  if (wShown > 0.45) {
    sym((s) => wingHalf(G, s, w2, wcol));
    if (wShown >= 1) {
      navLights(c, w2.x1 - w2.c1 * 0.5, w2.y1 + 0.08, hs - 0.03, [xt + 0.02, ay + R * 0.7]);
      sym((s) => G.box('dark', w2.x1 - w2.c1, w2.x1, w2.y1 - 0.01, w2.y1 + t1 + 0.01, s > 0 ? hs - 0.1 : -hs, s > 0 ? hs : -hs + 0.1, liv.trim));
    }
    if (nose && full) sym((s) => { // the struts
      const zw = hs * 0.45; const y0 = ay - R * 0.85; const y1 = wy0 - t0 * 0.2; const L = Math.hypot(zw - R * 0.95, y1 - y0);
      G.tbox('dark', wp.x0 - wp.c0 * 0.45, (y0 + y1) / 2, s * (zw + R * 0.95) / 2, 0.035, L, 0.035, mix(liv.wing, INK, 0.2), s * Math.atan2(zw - R * 0.95, y1 - y0), 0, 0);
    });
  } else navLights(c, xt + 0.1, ay + R * 0.4, 0.1, [xt + 0.02, ay + R * 0.7]);
  // tail
  if (built >= 0.9) {
    const fy = topAt(c, rows, 0.2) - R * 0.3; const tall = Ln * (nose ? 0.2 : liner ? 0.17 : 0.2);
    const fc = Ln * (nose ? 0.2 : 0.15); const fx = xt + Ln * (nose ? 0.34 : 0.28);
    const fsw = tall * (nose ? 0.5 : 0.55);
    panel(G, [{ sp: fy, x: fx, c: fc, b: 0, t: 0.07 }, { sp: fy + tall, x: fx - fsw, c: fc * 0.5, b: 0, t: 0.035 }], { top: nose ? liv.body : liv.trim, bot: nose ? liv.body : liv.trim, le: liv.trim, cs: liv.trim }, { vert: true });
    if (nose) G.box('dark', fx - fsw - fc * 0.5, fx - fsw, fy + tall - 0.02, fy + tall + 0.02, -0.03, 0.03, liv.trim);
    const ss = (K.stab * S) / 2; const sc = Ln * (nose ? 0.1 : 0.085);
    const T = K.tTail; const sy = T ? fy + tall - 0.02 : ay + rowAt(rows, 0.1)[3] * R + 0.04;
    const sxl = T ? fx - fsw + 0.03 : fx - 0.02;
    sym((s) => wingHalf(G, s, { z0: T ? 0 : sideAt(c, rows, 0.12) * 0.5, z1: ss, x0: sxl, c0: sc, x1: sxl - Ln * 0.012, c1: sc * 0.6, y0: sy, y1: sy, t0: 0.05, t1: 0.03 }, { top: liv.wing, bot: mix(liv.wing, '#6a7078', 0.2), flap: mix(liv.wing, INK, 0.14), aileron: mix(liv.wing, INK, 0.14) }));
  }
  // engines and propellers
  const eng = built >= 1 && (c.st ? c.st.engines !== false : true);
  const pr = nose ? Math.min(0.36, S * 0.085) : Math.min(0.5, S * 0.075);
  const ec = c.painted ? mix(liv.wing, '#6a7078', 0.35) : BARE;
  if (nose) {
    G.cyl('dark', 'x', xn - 0.04, ay - R * 0.05, 0, R * 0.78, 0.2, '#2e3036', { r1: 0.0, seg: 8 });
    c.props.push({ x: xn + 0.17, y: ay - R * 0.05, z: 0, r: pr, blades: 2 });
    if (!eng) c.props.pop();
    G.box('dark', xn - 0.07, xn, ay - R * 0.6, ay - R * 0.2, -R * 0.55, R * 0.55, '#16171a'); // cowl inlet
  } else if (K.prop === 'wing2') {
    sym((s) => {
      const z = hs * (liner ? 0.34 : 0.3); const w = wingAt(z);
      if (!eng) return;
      const rN = Math.max(0.12, R * (liner ? 0.34 : 0.3)); const len = rN * (liner ? 7 : 6);
      const ey = w.y + (high ? -rN * 0.5 : rN * 0.1);
      const ex = w.le + len * 0.28;
      // nacelle: a lofted pod, carried past the leading edge, with a landing-gear bulge below
      pod(G, ex, ey, s * z, rN, len, ec, mix(ec, '#ffffff', 0.2));
      G.cyl('dark', 'x', ex + len * 0.5, ey, s * z, rN * 0.72, 0.1, '#2e3036', { r1: 0, seg: 8 });
      if (liner) G.box('dark', w.te - 0.1, w.le + 0.1, ey - rN * 1.1, ey - rN * 0.3, s * z - rN * 0.6, s * z + rN * 0.6, ec);
      c.props.push({ x: ex + len * 0.5 + 0.1, y: ey, z: s * z, r: pr, blades: liner ? 4 : 3 });
      c.gear.mains.push([w.le - 0.1 + (liner ? 0 : 0.1), s * z, ey - rN * 0.2, true]);
    });
  }
  // gear
  if (nose) {
    c.gear.nose = null; c.gear.mains = [];
    c.gear.nose = [xn - Ln * 0.2, 0, ay - R * 0.7]; c.gear.nose[1] = 0; // a nose-wheel
    c.gear.mains.push([wp.x0 - wp.c0 * 0.7, R * 1.1 + 0.15, ay - R * 0.9], [wp.x0 - wp.c0 * 0.7, -R * 1.1 - 0.15, ay - R * 0.9]);
    c.gear.nose[0] = xn - Ln * 0.22;
  } else {
    c.gear.nose = [xn - Ln * (liner ? 0.12 : 0.14), 0, ay - R * 0.5];
    if (!liner) c.gear.mains.forEach((m) => { m[2] = Math.max(m[2], c.gear.wr * 3); });
    if (liner) c.gear.mains.push([xt + Ln * 0.5, R * 0.75, ay - R * 0.5, false], [xt + Ln * 0.5, -R * 0.75, ay - R * 0.5, false]);
    c.gear.twin = liner ? true : false;
  }
  c.gear.mains.forEach((m) => { m[2] = Math.max(m[2], c.gear.wr * 2.4); });
}

/** Blended-wing airliner: a wide lifting body that merges into the wing, winglets, four engines on top at the back. */
function blended(c, built) {
  const { K, G, Ln, S, liv, hs } = c;
  const R = 0.5; c.R = R;
  c.gear.wr = 0.16; c.gear.ww = 0.12; c.gh = 0.46; c.ay = c.gh + R;
  const { ay, xn, xt } = c;
  const W = Ln * 0.2; // half width of the centre body
  const rows = [[0, 0.4, 0.2, 0], [0.12, 1.6, 0.55, 0], [0.3, 2.4, 0.95, 0.0], [0.55, 2.2, 1, 0.0], [0.8, 1.3, 0.85, 0], [0.92, 0.7, 0.6, -0.05], [0.985, 0.25, 0.3, -0.1]];
  const belly = mix(liv.body, '#8a9098', c.painted ? 0.3 : 0);
  const rs = (r) => [r[0], r[1] * W / 2.4 / R * R, r[2], r[3]];
  void rs;
  fuselage(c, rows.map((r) => [r[0], r[1] * (W / (R * 2.4)), r[2], r[3], 0.7, 0.55]), (u, th, cap) => {
    if (cap === 'B') return RADOME; if (cap === 'A') return liv.body;
    if (u > 0.93 && th > 20 && th < 160) return GLASS;
    if (u > 0.95) return RADOME;
    if (th < -30) return belly;
    return liv.body;
  }, built);
  // outer wings: from the body edge, swept back, thin
  const wp = { c0: Ln * 0.36, c1: Ln * 0.07, x0: xn - Ln * 0.34, x1: xn - Ln * 0.34 - Ln * 0.3 };
  const y0 = ay - R * 0.1; const t0 = 0.5; const t1 = 0.07;
  const wShown = c.st ? (c.st.wings ?? 1) : 1;
  const hsW = wShown >= 1 ? hs : W + (hs - W) * 0.5;
  const wf = (hsW - W) / (hs - W);
  const w2 = { z0: W * 0.7, z1: hsW, x0: wp.x0, c0: wp.c0, x1: lerp(wp.x0, wp.x1, wf), c1: lerp(wp.c0, wp.c1, wf), y0, y1: y0 + 0.2, t0, t1 };
  const wcol = { le: mix(liv.wing, '#ffffff', 0.2), top: liv.wing, flap: mix(liv.wing, INK, 0.15), aileron: mix(liv.wing, INK, 0.1), bot: mix(liv.wing, '#6a7078', 0.25), csb: mix(liv.wing, INK, 0.3) };
  if (wShown > 0.45) {
    sym((s) => wingHalf(G, s, w2, wcol));
    if (wShown >= 1) {
      sym((s) => panel(G, [{ sp: w2.y1, x: w2.x1, c: w2.c1 * 1.2, b: s * (hs - 0.01), t: 0.04 }, { sp: w2.y1 + 0.7, x: w2.x1 - 0.5, c: w2.c1 * 0.7, b: s * (hs + 0.08), t: 0.03 }], { top: liv.trim, bot: liv.trim }, { vert: true }));
      navLights(c, w2.x1 - w2.c1 * 0.5, w2.y1 + 0.1, hs - 0.03, [xt + 0.02, ay + R * 0.6]);
    }
  } else navLights(c, xt + 0.2, ay + 0.3, 0.2, [xt + 0.02, ay + 0.3]);
  // twin fins and a trim stripe
  if (built >= 0.9) sym((s) => panel(G, [{ sp: ay + 0.2, x: xt + Ln * 0.3, c: Ln * 0.14, b: s * W * 0.82, t: 0.06 }, { sp: ay + 0.2 + Ln * 0.12, x: xt + Ln * 0.2, c: Ln * 0.07, b: s * W * 0.95, t: 0.03 }], { top: liv.trim, bot: liv.trim }, { vert: true }));
  const eng = built >= 1 && (c.st ? c.st.engines !== false : true);
  if (eng) {
    const rN = 0.2; const len = 0.85; const ec = c.painted ? mix(liv.wing, '#8a9098', 0.4) : BARE;
    for (const z of [0.38, 0.78]) sym((s) => {
      const ex = xt + Ln * 0.2 + 0.1; const ey = ay + R * 0.78 + rN * 0.6;
      pod(G, ex, ey, s * W * z * 1.5 * 0.9, rN, len, ec, mix(ec, '#ffffff', 0.3));
      G.box('dark', ex - len * 0.2, ex + len * 0.3, ay + R * 0.62, ey - rN * 0.4, s * W * z * 1.35 - 0.04, s * W * z * 1.35 + 0.04, mix(liv.wing, '#6a7078', 0.15));
    });
  }
  // cabin windows: a line along the nose
  if (built >= 1) sym((s) => G.box('dark', xn - Ln * 0.2, xn - Ln * 0.07, ay + R * 0.1, ay + R * 0.38, s * W * 0.4 - 0.02, s * W * 0.4 + 0.02, GLASS));
  c.gear.nose = [xn - Ln * 0.12, 0, ay - R * 0.2]; c.gear.twinNose = true;
  c.gear.twin = 'bogie';
  c.gear.mains = [[xn - Ln * 0.5, W * 0.3, ay - R * 0.4, 'bogie'], [xn - Ln * 0.5, -W * 0.3, ay - R * 0.4, 'bogie']];
  c.R = R;
  void K;
}

/** Fighters, trainers, bombers and the delta types. */
function fighter(c, built) {
  // the nozzles and the burner flame (hidden until it moves) stand behind the tail ring: the whole aircraft, flame included, stays within its length
  c.Ln -= 0.42; c.xt = c.xn - c.Ln; c.xAt = (f) => c.xn - f * c.Ln;
  const { K, G, Ln, S, liv, hs } = c;
  const kind = Object.keys(KINDS).find((k) => KINDS[k] === K);
  const delta = K.delta; const stealth = K.faceted; const trainer = kind === 'trainer'; const twin = K.fins === 2 && !delta;
  const bomber = kind === 'tacbomber'; const needle = kind === 'futuristic';
  const R = trainer ? 0.26 : bomber ? 0.4 : needle ? 0.3 : twin ? 0.42 : stealth ? 0.42 : delta ? 0.34 : 0.32;
  c.R = R;
  c.gear.wr = trainer ? 0.1 : 0.12; c.gear.ww = 0.07;
  c.gh = trainer ? 0.2 : 0.22; if (bomber) c.gh = 0.26; c.ay = c.gh + R;
  const { ay, xn, xt } = c;
  // fuselage table
  let rows;
  if (trainer) rows = [[0, 0.5, 0.55, 0.05], [0.1, 0.7, 0.78, 0.05], [0.3, 0.9, 0.9, 0.05], [0.5, 1, 1, 0.05, 1.1], [0.7, 0.95, 1.0, 0.04, 1.15], [0.86, 0.7, 0.72, 0], [0.96, 0.42, 0.44, -0.04], [0.998, 0.16, 0.18, -0.06]];
  else if (needle) rows = [[0, 0.8, 0.8, 0.0], [0.15, 1.15, 0.9, 0.0], [0.45, 0.95, 0.85, 0.0], [0.7, 0.62, 0.62, -0.05], [0.9, 0.34, 0.36, -0.18], [0.998, 0.08, 0.1, -0.42]];
  else if (stealth && delta) rows = [[0, 0.8, 0.5, 0], [0.2, 2.1, 0.55, 0, 0.9, 0.5], [0.5, 2.2, 0.7, 0.05, 1, 0.45], [0.75, 1.4, 0.6, 0.0], [0.93, 0.6, 0.38, -0.1], [0.998, 0.1, 0.12, -0.18]];
  else if (stealth) rows = [[0, 1.1, 0.5, 0.02], [0.14, 1.5, 0.6, 0.04, 0.9, 0.6], [0.45, 1.75, 0.8, 0.05, 1, 0.55], [0.72, 1.35, 0.7, 0.02, 1, 0.5], [0.9, 0.7, 0.45, -0.06], [0.998, 0.14, 0.14, -0.14]];
  else if (twin) rows = [[0, 1.0, 0.7, 0.05], [0.12, 1.25, 0.82, 0.05], [0.4, 1.5, 0.9, 0.05, 1, 0.75], [0.62, 1.35, 0.85, 0.05, 1.05, 0.8], [0.82, 0.8, 0.6, 0.0], [0.95, 0.5, 0.4, -0.04], [0.998, 0.16, 0.18, -0.06]];
  else if (bomber) rows = [[0, 1.0, 0.75, 0.05], [0.15, 1.3, 0.9, 0.05], [0.45, 1.5, 0.95, 0.05], [0.68, 1.3, 0.9, 0.04, 1.1], [0.84, 0.8, 0.65, -0.04], [0.96, 0.46, 0.4, -0.1], [0.998, 0.14, 0.14, -0.12]];
  else rows = [[0, 0.62, 0.7, 0.04], [0.1, 0.82, 0.84, 0.04], [0.3, 0.95, 0.9, 0.04], [0.5, 1.0, 0.95, 0.05, 1.05], [0.68, 0.9, 0.9, 0.05, 1.1], [0.84, 0.62, 0.66, 0.0], [0.95, 0.4, 0.42, -0.04], [0.998, 0.14, 0.14, -0.06]];
  const dark = stealth ? INK : '#2c3036';
  const belly = mix(liv.body, '#6a7078', c.painted ? 0.2 : 0);
  const camoA = bomber && c.painted ? mix(liv.body, '#2a3228', 0.45) : liv.body;
  const glaze = c.painted ? GLASS : '#5a6a5a';
  fuselage(c, rows, (u, th, cap) => {
    if (cap === 'A') return dark; if (cap === 'B') return RADOME;
    if (u > 0.9) return mix(RADOME, liv.body, stealth ? 0.7 : 0.1);
    if (!stealth && !delta && u > 0.7 && th > 45 && th < 135 && u < 0.9 && !trainer) return mix(liv.body, INK, 0.5); // the anti-glare panel
    if (th < -30) return belly;
    if (bomber && c.painted && ((u * 9) | 0) % 2 === 0 && th > -30) return camoA;
    return liv.body;
  }, built);
  const full = built >= 1;
  const sx = (u) => xt + u * Ln;
  // canopy
  if (built >= 0.6) {
    if (trainer) { canopy(G, sx(0.83), sx(0.69), topAt(c, rows, 0.78) - R * 0.12, R * 0.62, R * 0.7, glaze); canopy(G, sx(0.67), sx(0.52), topAt(c, rows, 0.6) - R * 0.1, R * 0.64, R * 0.8, glaze); }
    else if (bomber) { canopy(G, sx(0.88), sx(0.6), topAt(c, rows, 0.74) - R * 0.1, R * 0.8, R * 1.0, glaze); }
    else if (needle) { G.prism('dark', [[sx(0.96), ay + R * 0.1], [sx(0.82), ay + R * 0.26], [sx(0.74), ay + R * 0.55], [sx(0.7), ay + R * 0.1]], -R * 0.34, R * 0.34, glaze); }
    else canopy(G, sx(delta ? 0.9 : 0.86), sx(delta ? 0.7 : 0.66), topAt(c, rows, 0.78) - R * 0.1, R * (stealth ? 0.66 : 0.58), R * (stealth ? 0.85 : 1.05), glaze);
  }
  // wing
  const wy0 = ay - R * (trainer ? 0.55 : needle ? 0.5 : 0.25); // low or mid
  const wopt = { sweepK: trainer ? 1 : needle ? 1.05 : delta ? 1.3 : bomber ? 1.8 : stealth ? 1.35 : 1.7 };
  const wp = wingPlan(c, wopt);
  if (delta) { wp.c0 = K.chord * Ln * (needle ? 1.55 : 1.4); wp.x0 = xn - Ln * (needle ? 0.38 : 0.34); wp.x1 = xt + Ln * (needle ? 0.55 : 0.3) + wp.c1; wp.c1 = Ln * 0.07; }
  if (stealth && !delta) { wp.c0 = K.chord * Ln * 1.15; wp.x0 = xn - Ln * 0.32; wp.x1 = xn - Ln * 0.6; wp.c1 = Ln * 0.07; }
  const t0 = Math.max(0.07, wp.c0 * (trainer ? 0.1 : 0.055)); const t1 = Math.max(0.03, wp.c1 * 0.1);
  const wcol = { le: mix(liv.wing, '#ffffff', 0.15), top: liv.wing, flap: mix(liv.wing, INK, 0.18), aileron: mix(liv.wing, INK, 0.12), bot: mix(liv.wing, '#6a7078', 0.3), csb: mix(liv.wing, INK, 0.3) };
  const wShown = c.st ? (c.st.wings ?? 1) : 1;
  const z0 = R * 0.6;
  const hsW = wShown >= 1 ? hs : z0 + (hs - z0) * 0.5; const wf = (hsW - z0) / (hs - z0);
  const w2 = { z0, z1: hsW, x0: wp.x0, c0: wp.c0, x1: lerp(wp.x0, wp.x1, wf), c1: lerp(wp.c0, wp.c1, wf), y0: wy0, y1: wy0 + (trainer ? 0.07 : needle ? -0.02 : 0.0), t0, t1 };
  if (wShown > 0.45) {
    sym((s) => wingHalf(G, s, w2, wcol));
    if (wShown >= 1) {
      sym((s) => { // tip rails and missiles; a trainer has tip tanks instead
        const xe = w2.x1 - w2.c1 * 0.5;
        if (trainer) { G.cyl('dark', 'x', w2.x1 - w2.c1 * 1.6, w2.y1 + t1 * 0.4, s * (hs - 0.1), 0.085, w2.c1 * 1.6 + 0.5, mix(liv.wing, '#ffffff', 0.15), { seg: 8, r1: 0.085 }); G.cyl('dark', 'x', w2.x1 + 0.5 - w2.c1 * 1.6 + w2.c1 * 1.6, w2.y1 + t1 * 0.4, s * (hs - 0.1), 0.085, 0.14, liv.trim, { r1: 0.0, seg: 8 }); }
        else if (!needle) { G.box('dark', xe - 0.3, xe + 0.3, w2.y1 - 0.03, w2.y1 + 0.02, s * (hs - 0.04) - 0.02, s * (hs - 0.04) + 0.02, '#3a3e44'); round(G, xe - 0.32, xe + 0.28, w2.y1 - 0.08, s * (hs - 0.04), 0.035, '#d8dce0', '#c8402a'); }
      });
      navLights(c, w2.x1 - w2.c1 * 0.5, w2.y1 + 0.06, hs - 0.06, [xt + 0.02, ay + R * 0.8]);
    }
    // under-wing stores on the bomber, a single drop tank on the fighter
    if (bomber && full) sym((s) => { for (const f of [0.34, 0.62]) { const z = lerp(z0, hs, f); const x = lerp(wp.x0, wp.x1, f) - wp.c0 * 0.4; round(G, x - 0.5, x + 0.5, wy0 - 0.2, s * z, 0.07, '#7e8478', '#2a2c30'); G.box('dark', x - 0.2, x + 0.2, wy0 - 0.15, wy0 - 0.01, s * z - 0.02, s * z + 0.02, '#3a3e44'); } });
    roundel(c, { ...wp, x0: wp.x0 + 0.0 }, wy0, t0, liv);
  } else navLights(c, xt + 0.2, ay + 0.2, 0.2, [xt + 0.02, ay + R * 0.8]);
  // strakes (the leading-edge extension of a single-engined fighter)
  if (full && (kind === 'fighter' || stealth) && !delta) {
    sym((s) => G.plan('dark', [[wp.x0 + Ln * 0.18, s * R * 0.9], [wp.x0, s * R * 1.0], [wp.x0, s * (R * 0.9 + 0.5)]].map(([x, z]) => [x, z]), wy0 - 0.01, wy0 + 0.04, mix(liv.wing, '#ffffff', 0.1)));
  }
  // tail: fins and tailplanes
  if (built >= 0.9) {
    const fh = Ln * (bomber ? 0.22 : trainer ? 0.17 : twin ? 0.15 : stealth ? 0.13 : delta ? 0.1 : needle ? 0.15 : 0.17);
    const fc = Ln * (bomber ? 0.22 : needle ? 0.18 : 0.19); const fsw = fh * (stealth ? 0.7 : 0.62);
    const fcol = { top: delta && !needle ? mix(liv.trim, INK, 0.1) : liv.trim, bot: delta && !needle ? mix(liv.trim, INK, 0.1) : liv.trim, le: mix(liv.trim, '#ffffff', 0.12), cs: mix(liv.trim, INK, 0.15) };
    const fx = xt + Ln * (needle ? 0.2 : twin || stealth ? 0.3 : 0.28) + (delta && !needle ? 0.15 : 0);
    if (twin || stealth || (delta && !needle)) {
      const zb = (delta ? 0.55 : stealth ? 1.05 : 1.15) * R;
      sym((s) => panel(G, [{ sp: ay + R * 0.1, x: fx, c: fc, b: s * zb, t: 0.07 }, { sp: ay + R * 0.1 + fh, x: fx - fsw, c: fc * 0.5, b: s * zb, t: 0.035 }], fcol, { vert: true, xf: cant(s * (stealth || delta ? 0.4 : 0.1) * -1, ay + R * 0.1, s * zb) }));
    } else {
      const fy = topAt(c, rows, 0.3) - R * 0.35;
      panel(G, [{ sp: fy, x: fx, c: fc, b: 0, t: 0.09 }, { sp: fy + fh, x: fx - fsw, c: fc * 0.5, b: 0, t: 0.04 }], fcol, { vert: true });
      if (!needle) G.box('dark', fx - fsw - fc * 0.5 + 0.01, fx - fsw - fc * 0.32, fy + fh - 0.03, fy + fh + 0.03, -0.03, 0.03, '#3a3e44'); // the fin-tip pod
    }
    if (K.stab > 0 || (delta && !needle && false)) {
      const ss = (K.stab * S) / 2; const sc = Ln * 0.14;
      const sx0 = xt + Ln * (twin ? 0.2 : stealth ? 0.22 : 0.2) + sc * 0.6; const sy = ay - R * (stealth ? 0.15 : 0.1);
      const zr = rowAt(rows, 0.15)[1] * R * 0.9;
      sym((s) => wingHalf(G, s, { z0: zr, z1: ss, x0: sx0, c0: sc, x1: sx0 - Ln * 0.07, c1: sc * 0.4, y0: sy, y1: sy, t0: 0.05, t1: 0.03 }, { top: liv.wing, bot: mix(liv.wing, '#6a7078', 0.3), flap: mix(liv.wing, INK, 0.1), aileron: mix(liv.wing, INK, 0.1) }));
    }
    if (needle) G.box('dark', xt + Ln * 0.17, xt + Ln * 0.3, ay + R * 0.35, ay + R * 0.38, -0.03, 0.03, mix(liv.trim, INK, 0.1));
  }
  // canards (the future fighter), a chin of intakes, nozzles
  if (delta && !needle && built >= 0.7) sym((s) => wingHalf(G, s, { z0: R * 0.4, z1: hs * 0.38, x0: xn - Ln * 0.2, c0: Ln * 0.11, x1: xn - Ln * 0.3, c1: Ln * 0.04, y0: ay + R * 0.05, y1: ay + R * 0.18, t0: 0.05, t1: 0.03 }, { top: liv.wing, bot: mix(liv.wing, '#6a7078', 0.3), flap: mix(liv.wing, INK, 0.1), aileron: mix(liv.wing, INK, 0.1) }));
  const eng = built >= 1 && (c.st ? c.st.engines !== false : true);
  if (full) {
    const intake = '#101114';
    if (twin || bomber) sym((s) => { // box intakes beside the cockpit, under the wing root
      const z = rowAt(rows, 0.58)[1] * R * 1.0;
      G.box('dark', sx(0.64), sx(0.82), ay - R * 0.35, ay + R * 0.55, s > 0 ? z - 0.02 : -z - 0.2, s > 0 ? z + 0.2 : -z + 0.02, mix(liv.body, '#4a5058', 0.3));
      G.box('dark', sx(0.815), sx(0.825), ay - R * 0.25, ay + R * 0.45, s > 0 ? z + 0.02 : -z - 0.18, s > 0 ? z + 0.18 : -z - 0.02, intake);
    });
    else if (stealth) sym((s) => { const z = rowAt(rows, 0.6)[1] * R * 0.86; G.tbox('dark', sx(0.68), ay - R * 0.1, s * z, Ln * 0.14, R * 0.7, 0.16, mix(liv.body, INK, 0.25), 0, 0, 0); G.box('dark', sx(0.745), sx(0.755), ay - R * 0.38, ay + R * 0.22, s > 0 ? z - 0.08 : -z - 0.08, s > 0 ? z + 0.08 : -z + 0.08, intake); });
    else if (needle) G.box('dark', sx(0.54), sx(0.56), ay - R * 0.7, ay - R * 0.2, -0.18, 0.18, intake);
    else if (trainer) sym((s) => { const z = rowAt(rows, 0.6)[1] * R; G.box('dark', sx(0.62), sx(0.74), ay - R * 0.25, ay + R * 0.35, s > 0 ? z - 0.01 : -z - 0.06, s > 0 ? z + 0.06 : -z + 0.01, '#16171a'); });
    else if (!delta) { // the belly intake of the single-engined fighter
      G.box('dark', sx(0.52), sx(0.76), ay - R * 1.05, ay - R * 0.5, -R * 0.62, R * 0.62, mix(liv.body, '#4a5058', 0.25));
      G.box('dark', sx(0.75), sx(0.765), ay - R * 1.0, ay - R * 0.55, -R * 0.55, R * 0.55, intake);
    } else if (stealth) G.box('dark', sx(0.7), sx(0.71), ay - R * 0.3, ay + R * 0.2, -R * 0.9, R * 0.9, intake);
  }
  if (eng) {
    const noz = (z, r) => { // a nozzle: a ring of petals and a dark throat
      G.cyl('dark', 'x', xt - 0.1, ay, z, r, 0.2, mix(METAL, liv.body, 0.15), { r1: r * 0.8, seg: 8 });
      G.cyl('dark', 'x', xt - 0.102, ay, z, r * 0.65, 0.005, '#0c0c0e', { seg: 8 });
      c.burners.push({ x: xt - 0.1, y: ay, z, r: r * 0.7, len: 0.3, c: delta && K.faceted ? '#d86aff' : needle ? '#6ad8f0' : '#ffb040' });
    };
    if (twin || (K.pods === 'internal2')) { noz(R * 0.5, R * 0.46); noz(-R * 0.5, R * 0.46); }
    else if (stealth) { noz(R * 0.5, R * 0.34); noz(-R * 0.5, R * 0.34); }
    else if (needle) for (const [z, y] of [[0.4, 0.3], [-0.4, 0.3], [0.4, -0.3], [-0.4, -0.3]]) { G.cyl('dark', 'x', xt - 0.1, ay + y * R, z * R, R * 0.2, 0.2, METAL, { r1: R * 0.17, seg: 6 }); c.burners.push({ x: xt - 0.1, y: ay + y * R, z: z * R, r: R * 0.13, len: 0.28, c: "#6ad8f0" }); }
    else noz(0, R * 0.5);
    if (delta && K.faceted) sym((s) => G.box('glow:#c84ad8', xt + Ln * 0.2, xt + Ln * 0.5, ay + R * 0.12, ay + R * 0.15, s * R * 1.2, s * R * 1.2 + 0.02));
    if (needle) G.box('glow:#4ad8e8', xn - Ln * 0.44, xn - Ln * 0.12, ay + R * 0.05, ay + R * 0.1, -0.012, 0.012);
  }
  // gear
  const mx = Math.min(wp.x0 - wp.c0 * 0.55, xn - Ln * 0.5);
  c.gear.nose = [xn - Ln * (needle ? 0.2 : 0.2), 0, ay - R * 0.5];
  const mzz = R * (twin || stealth || bomber ? 1.1 : 0.85);
  c.gear.mains = [[mx, mzz, ay - R * 0.5], [mx, -mzz, ay - R * 0.5]];
  c.gear.twin = bomber; c.gear.twinNose = bomber;
  void S;
}

/** The flying wings: a lofted body across the span, thick in the middle with a hump, a sawtooth (or arrowhead) trailing edge, two-tone. */
function flyingWing(c, built) {
  const { K, G, Ln, S, liv, hs } = c;
  const glow = Boolean(K.glow);
  c.R = 0.3; c.gear.wr = 0.12; c.gear.ww = 0.09;
  c.gh = 0.3; c.ay = c.gh + 0.3;
  const { xn, xt } = c;
  const base = c.gh + 0.34;
  const tmax = Ln * (glow ? 0.045 : 0.07);
  // stations: [|f| of the half-span, leading edge back from the nose (fraction of length), trailing edge back from the nose]
  const T = glow
    ? [[0, 0, 1.0], [0.1, 0.07, 0.86], [0.3, 0.2, 0.74], [0.6, 0.38, 0.68], [0.85, 0.52, 0.64], [1, 0.62, 0.6]]
    : [[0, 0, 0.98], [0.15, 0.09, 0.8], [0.3, 0.18, 0.93], [0.46, 0.28, 0.8], [0.72, 0.43, 0.71], [1, 0.62, 0.58]];
  const hsf = c.st ? (c.st.wings ?? 1) : 1;
  const top = glow ? mix(liv.body, '#8a94a4', 0.4) : mix(liv.body, '#a8b0bc', 0.4);
  const bot = mix(liv.body, INK, 0.4);
  const secs = [...T].reverse().map(([f, le, te]) => ({ f: -f, le, te })).concat(T.slice(1).map(([f, le, te]) => ({ f, le, te })));
  const stRows = secs.map(({ f, le, te }) => {
    const a = Math.abs(f); const x = xn - le * Ln; const ch = (te - le) * Ln;
    const t = tmax * Math.pow(1 - a, 1.4) + 0.035;
    const P = [[0, 0.02], [-0.2, 0.5], [-0.7, 0.3], [-1, 0.03], [-0.7, -0.2], [-0.2, -0.5]];
    return P.map(([k, kk]) => { const hump = (a < 0.2 ? (0.2 - a) * 0.9 : 0) * (k < -0.15 && k > -0.8 && kk > 0 ? 1 : 0); return [x + k * ch, base + kk * t + hump * 0.5, f * hs * (built < 1 ? 0.7 : 1) * (hsf < 1 ? 0.6 : 1)]; });
  });
  shell(G, stRows, (qi, seg, th, cap) => (cap ? bot : qi === 0 ? mix(top, '#ffffff', 0.14) : qi === 1 ? mix(top, INK, (seg % 2) ? 0.1 : 0) : qi === 2 ? mix(top, INK, 0.28) : qi === 3 ? INK : bot), true, true);
  // the centre hump: a faceted spine standing on the wing with the cockpit glazing at its front
  const k = Ln / 7;
  const SP = [[0, 0.03, 0.03, 0.02], [0.07, 0.2, 0.14, 0.16], [0.17, 0.36, 0.26, 0.26], [0.38, 0.5, 0.3, 0.26], [0.6, 0.46, 0.22, 0.18], [0.8, 0.3, 0.12, 0.1], [0.97, 0.1, 0.05, 0.03]];
  const hump = mix(top, '#ffffff', 0.1);
  shell(G, SP.map(([f, rz, ry, cy]) => oct(xn - f * Ln, base + cy * k * 1.1, rz * k, ry * k * 1.2, 1, 0.4)), (qi, seg, th, cap) => (cap ? hump : seg === 1 && th > 20 && th < 160 ? GLASS : seg === 0 ? mix(hump, INK, 0.3) : th < -30 ? mix(hump, INK, 0.3) : mix(hump, INK, seg % 2 ? 0.1 : 0)), true, true);
  if (glow) { G.prism('dark', [[xn - Ln * 0.5, base + tmax * 0.4], [xn - Ln * 0.38, base + tmax * 0.55], [xn - Ln * 0.28, base + tmax * 0.5], [xn - Ln * 0.2, base + 0.04], [xn - Ln * 0.5, base + 0.04]], -0.14, 0.14, mix(liv.body, INK, 0.35)); }
  else sym((s) => { G.box('dark', xn - Ln * 0.22, xn - Ln * 0.14, base + tmax * 0.15, base + tmax * 0.38, s > 0 ? 0.28 : -0.62, s > 0 ? 0.62 : -0.28, '#0e0f12'); });
  if (!glow) sym((s) => G.plan('dark', [[xt + Ln * 0.18, s * 0.5], [xt + Ln * 0.14, s * 0.9], [xt + Ln * 0.07, s * 0.9], [xt + Ln * 0.08, s * 0.5]], base + 0.05, base + 0.09, mix(liv.body, INK, 0.5)));
  const eng = built >= 1 && (c.st ? c.st.engines !== false : true);
  if (glow && eng) {
    const gx = xt + Ln * 0.04;
    for (const s of [-1, 1]) { G.box('glow:#4ad8e8', gx, gx + 0.12, base + 0.06, base + 0.12, s * 0.55 - 0.2, s * 0.55 + 0.2); G.box('glow:#4ad8e8', xn - Ln * 0.5, xn - Ln * 0.5 + 0.06, base + 0.1, base + 0.12, s * 0.3, s * 0.3 + s * hs * 0.45); }
    G.box('glow:#4ad8e8', xt + Ln * 0.2, xt + Ln * 0.2 + 0.03, base + 0.08, base + 0.11, -0.9, 0.9);
    c.burners.push({ x: xt + 0.3, y: base + 0.1, z: 0.55, r: 0.1, len: 0.3, c: '#6ad8f0' }, { x: xt + 0.3, y: base + 0.1, z: -0.55, r: 0.1, len: 0.3, c: '#6ad8f0' });
  }
  if (built >= 1) {
    const lx = xn - T[T.length - 1][1] * Ln; const tex = xn - T[T.length - 1][2] * Ln;
    navLights(c, (lx + tex) / 2, base + 0.1, hs - 0.1, [xt + 0.1, base + 0.1]);
  }
  const mxg = xn - Ln * 0.5;
  c.gear.nose = [xn - Ln * 0.2, 0, base - 0.02];
  c.gear.mains = [[mxg, 0.9 + Ln * 0.03, base - 0.02], [mxg, -0.9 - Ln * 0.03, base - 0.02]];
  c.gear.twin = false;
  if (!glow) roundel(c, { x0: xn - Ln * 0.38, c0: Ln * 0.1, x1: 0 }, base + tmax * 0.1, tmax * 0.5, liv);
  void K;
}

/** Build an aircraft for a look and livery name; `stage` (the bay's { fuselage, wings, engines, painted }) shows it part-built. */
export function buildAircraft(look, livery = null, stage = null) {
  const sp = spec(look, livery, stage);
  const root = assemble(sp, '#ffffff');
  root.userData.look = look;
  const st = { t: 0, lastAlt: 0, pitch: 0 };
  root.userData.update = (m, ctx, dt) => {
    m = m || {};
    st.t += dt || 0;
    const moving = (m.v || 0) > 0.3 || m.alt > 0.05;
    const u = root.userData;
    if (u.subs.gear) u.subs.gear.visible = m.gear !== false && !(m.alt > 1.2);
    for (let i = 0; i < 4; i++) { const p = u.subs[`prop${i}`]; if (p) p.rotation.x = moving ? st.t * 40 : 0.3; }
    if (u.subs.burn) u.subs.burn.visible = moving && ((m.v || 0) > 1.5 || m.alt > 0.05);
    const lift = Math.max(0, m.alt || 0);
    const climbing = m.state === 'takeoff' || m.state === 'airborne' ? 1 : m.state === 'landing' ? 0.4 : 0;
    const target = lift > 0.05 ? climbing * Math.min(0.22, lift * 0.06 + 0.04) : 0;
    st.pitch += (target - st.pitch) * Math.min(1, (dt || 0.016) * 3);
    root.rotation.z = st.pitch;
    if (u.subs.nav) u.subs.nav.visible = Boolean(ctx?.night);
    if (u.subs.burn && !moving) u.subs.burn.visible = false;
  };
  if (stage) root.userData.update({ v: 0, alt: 0, gear: true }, null, 0);
  else root.userData.update({ v: 0, alt: 0, gear: true, state: 'parked' }, null, 0);
  return root;
}
