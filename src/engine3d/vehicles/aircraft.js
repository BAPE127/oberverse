// Aircraft for Starling Field and Hollowmoor's apron (phase 3D-3). One parametric builder, driven by the same proportion table the 2D art uses
// (src/engine/drawAero.js KINDS: where the wing sits, its chord, taper and sweep, the tail, the engines, the canopy), so every kind in the
// aerospace catalogue (highwing, twinprop, bizjet, bizjet_long, futuristic, turboprop_liner, narrowbody, widebody, blended, trainer, fighter,
// twinfighter, stealthfighter, futurefighter, tacbomber, stratbomber, flyingwing, futurebomber) is its own plane in the livery given.
// Frame: +x the nose, +y up, +z starboard; ground level y = 0 with the wheels down. Moves: propellers turn once the aircraft moves, the gear is
// up in the air, navigation lights (red port, green starboard, white tail) show at night.
import { assemble } from './geo.js';
import { mix, mute } from '../lib3d.js';
import { LIVERIES } from '../../engine/drawAero.js';

const INK = '#1b1a24';
const GLASS = '#26384e';

/** The 2D proportions (fractions of the canvas: length down from the nose, span across), copied from drawAero.js. */
export const KINDS = {
  highwing: { fw: 0.12, wingY: 0.3, chord: 0.2, tip: 0.18, sweep: 0, tail: 0.86, stab: 0.36, prop: 'nose', canopy: 'cabin', high: true },
  twinprop: { fw: 0.12, wingY: 0.36, chord: 0.16, tip: 0.11, sweep: 0.02, tail: 0.87, stab: 0.34, prop: 'wing2', canopy: 'cabin' },
  bizjet: { fw: 0.13, wingY: 0.48, chord: 0.18, tip: 0.08, sweep: 0.12, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true },
  bizjet_long: { fw: 0.11, wingY: 0.46, chord: 0.18, tip: 0.06, sweep: 0.16, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true, winglets: true },
  futuristic: { fw: 0.2, wingY: 0.55, chord: 0.36, tip: 0.1, sweep: 0.3, tail: 0.92, stab: 0, pods: 'internal', canopy: 'bubble', delta: true },
  turboprop_liner: { fw: 0.1, wingY: 0.38, chord: 0.13, tip: 0.08, sweep: 0.01, tail: 0.88, stab: 0.3, prop: 'wing2', canopy: 'airliner', tTail: true, high: true },
  narrowbody: { fw: 0.1, wingY: 0.44, chord: 0.18, tip: 0.05, sweep: 0.16, tail: 0.9, stab: 0.32, pods: 'wing2', canopy: 'airliner', winglets: true },
  widebody: { fw: 0.11, wingY: 0.44, chord: 0.2, tip: 0.05, sweep: 0.18, tail: 0.9, stab: 0.34, pods: 'wing2', canopy: 'airliner', winglets: true },
  blended: { fw: 0.3, wingY: 0.5, chord: 0.3, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0, pods: 'wing4', canopy: 'airliner', blended: true },
  trainer: { fw: 0.14, wingY: 0.5, chord: 0.2, tip: 0.1, sweep: 0.04, tail: 0.88, stab: 0.38, pods: 'internal', canopy: 'tandem' },
  fighter: { fw: 0.15, wingY: 0.56, chord: 0.26, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0.42, pods: 'internal', canopy: 'bubble', fins: 1 },
  twinfighter: { fw: 0.2, wingY: 0.55, chord: 0.3, tip: 0.07, sweep: 0.22, tail: 0.92, stab: 0.44, pods: 'internal', canopy: 'bubble', fins: 2 },
  stealthfighter: { fw: 0.22, wingY: 0.56, chord: 0.32, tip: 0.06, sweep: 0.24, tail: 0.9, stab: 0.4, pods: 'internal', canopy: 'bubble', fins: 2, faceted: true },
  futurefighter: { fw: 0.22, wingY: 0.6, chord: 0.4, tip: 0.04, sweep: 0.32, tail: 0.94, stab: 0, pods: 'internal', canopy: 'bubble', fins: 2, delta: true, faceted: true },
  tacbomber: { fw: 0.14, wingY: 0.48, chord: 0.22, tip: 0.08, sweep: 0.18, tail: 0.9, stab: 0.36, pods: 'internal2', canopy: 'tandem', fins: 1 },
  stratbomber: { fw: 0.08, wingY: 0.46, chord: 0.2, tip: 0.06, sweep: 0.24, tail: 0.92, stab: 0.3, pods: 'wing4', canopy: 'airliner', fins: 1 },
  flyingwing: { flyingWing: true, canopy: 'slit', pods: 'buried' },
  futurebomber: { flyingWing: true, canopy: 'slit', pods: 'buried', glow: true },
};

/** The colours of a livery for a look (the 2D rule: a named livery, else the look's own colour and trim). */
export function liveryOf(look, livery) {
  const L = LIVERIES[livery];
  const body = L?.body || look.color || '#f4f4f4';
  return { body, trim: L?.trim || look.trim || '#3a5aa8', wing: L?.wing || mix(body, '#9aa0a8', 0.25), accent: L?.accent || look.trim || '#3a5aa8' };
}

const ringAt = (x, cy, rz, ry, n = 8) => { // a ring of the fuselage at x, centred at height cy, going the way loft() wants
  const o = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / n; o.push([x, cy + Math.sin(a) * ry, Math.cos(a) * rz]); }
  return o.reverse();
};

function spec(look, livery) {
  const K = KINDS[look.kind] || KINDS.highwing;
  const liv = liveryOf(look, livery);
  const Ln = look.len; const S = look.span;
  const key = `air|${look.kind}|${Ln}|${S}|${liv.body}|${liv.trim}|${liv.wing}`;
  const props = [];
  const gear = { mains: [], nose: null };
  let R; let gh; let ay; // fuselage radius, gear height, axis height (of the fuselage)
  if (K.flyingWing) { R = 0.3; } else R = Math.min(Ln * 0.085, Math.max(0.2, (K.fw * S) / 2));
  gh = Math.max(0.28, R * 0.7); ay = gh + R;
  const xn = Ln / 2; const xt = -Ln / 2; // nose and tail
  const xAt = (f) => xn - f * Ln; // fraction down the length from the nose
  const navs = [];
  return {
    key,
    build(G) {
      const faceted = Boolean(K.faceted);
      const bn = faceted ? 6 : 8;
      if (K.flyingWing) {
        // a chevron: the whole aircraft is wing, thick at the middle, with a hump for the cabin
        const P = [[S / 2, 0.02], [S - 0.06, 0.62], [S - 0.06, 0.72], [S * 0.78, 0.66], [S * 0.64, 0.98], [S / 2, 0.78], [S * 0.36, 0.98], [S * 0.22, 0.66], [0.06, 0.72], [0.06, 0.62]];
        // (the 2D picture: x across 0..S tiles, y along 0..1 of the length) -> plan (x forward, z across)
        const fix = P.map(([px, py]) => [xn - py * Ln, px - S / 2]);
        navs.push({ x: fix[1][0] - 0.2, y: gh + 0.2, z: S / 2 - 0.1, c: '#3fe07a' }, { x: fix[9][0] - 0.2, y: gh + 0.2, z: -S / 2 + 0.1, c: '#ff3a2a' }, { x: xn - 0.78 * Ln, y: gh + 0.3, z: 0, c: '#f4f0d8' });
        G.plan('dark', fix, gh + 0.08, gh + 0.34, liv.body);
        G.plan('dark', fix.map(([x, z]) => [x * 0.8, z * 0.8]), gh + 0.34, gh + 0.4, mix(liv.body, '#ffffff', 0.1));
        G.plan('dark', fix.map(([x, z]) => [x * 0.5 + Ln * 0.04, z * 0.45]), gh + 0.4, gh + 0.5, mix(liv.body, '#ffffff', 0.18));
        G.blob('dark', xn - 0.28 * Ln, gh + 0.5, 0, 0.7, 0.25, 0.18, '#1e242c', 0);
        for (const dz of [-0.35, -0.15, 0.15, 0.35]) G.box('dark', xn - 0.64 * Ln, xn - 0.58 * Ln, gh + 0.1, gh + 0.22, dz * S * 0.5 - 0.1, dz * S * 0.5 + 0.1, mix(liv.body, INK, 0.3));
        if (K.glow) for (const dz of [-0.08, 0.08]) G.box('glow:#4ad8e8', xt + 0.28 * Ln - 0.0, xt + 0.28 * Ln + 0.08, gh + 0.18, gh + 0.28, dz * S - 0.12, dz * S + 0.12);
        G.cube('dark', xn - 0.04, gh + 0.2, 0, 0.1, 0.18, 0.16, '#8a8f94');
        gear.nose = [xn - 0.14 * Ln, 0]; gear.mains = [[xn - 0.56 * Ln, S * 0.09], [xn - 0.56 * Ln, -S * 0.09]];
        return;
      }
      // ---- the fuselage: rings from the tail to the nose
      const prof = [];
      const taper = K.delta ? 0.5 : 0.22;
      const stations = [0, 0.04, 0.12, 0.25, 0.55, 0.8, 0.9, 0.97, 1.0]; // 0 = tail, 1 = nose
      const radius = (u) => {
        if (u < 0.12) return R * (0.28 + (u / 0.12) * 0.72) * (taper < 0.3 ? 1 : 1);
        if (u > 0.9) return R * Math.max(0.25, 1 - ((u - 0.9) / 0.1) * 0.75);
        if (u > 0.8) return R * (1 - (u - 0.8) * 0.2);
        return R;
      };
      for (const u of stations) { const r = radius(u); prof.push({ x: xt + u * Ln, rz: r * (K.blended ? 1.9 : 1), ry: r * (K.blended ? 0.6 : 1), cy: ay + (u < 0.12 ? (1 - u / 0.12) * R * 0.3 : 0) }); }
      for (let i = 0; i < prof.length - 1; i++) {
        const a = prof[i]; const b = prof[i + 1];
        G.loft('dark', ringAt(a.x, a.cy, a.rz, a.ry, bn), ringAt(b.x, b.cy, b.rz, b.ry, bn), liv.body, i === 0, i === prof.length - 2);
      }
      // livery band and the dark radome / nose
      const band = prof[4];
      G.loft('dark', ringAt(band.x - 0.03 * Ln, band.cy, band.rz + 0.012, band.ry + 0.012, bn), ringAt(band.x + 0.03 * Ln, band.cy, band.rz + 0.012, band.ry + 0.012, bn), liv.trim, true, true);
      // ---- wings
      const wY = K.high ? ay + R * 0.85 : ay - R * 0.5;
      const wt = Math.max(0.07, Ln * 0.012);
      const chord0 = K.chord * Ln; const tipC = Math.max(0.08, K.tip * Ln); const hs = S / 2;
      const rLE = xAt(K.wingY) + chord0 / 2; // root leading edge
      const rTE = rLE - chord0;
      const tLE = rLE - K.sweep * Ln * 1.0 - (K.delta ? K.sweep * Ln * 0.6 : 0);
      const tTE = tLE - tipC;
      const wingPlan = [[rLE, 0], [tLE, hs], [tTE, hs], [rTE, 0], [tTE, -hs], [tLE, -hs]];
      G.plan('dark', wingPlan, wY, wY + wt, liv.wing);
      if (K.delta || K.blended) G.plan('dark', wingPlan.map(([x, z]) => [x, z * 0.98]), wY + wt, wY + wt + 0.01, mix(liv.wing, '#ffffff', 0.12));
      navs.push({ x: (tLE + tTE) / 2, y: wY + wt, z: hs - 0.1, c: '#3fe07a' }, { x: (tLE + tTE) / 2, y: wY + wt, z: -hs + 0.1, c: '#ff3a2a' }, { x: xt - 0.02, y: ay + R * 0.5, z: 0, c: '#f4f0d8' });
      // wingtip trim
      for (const s of [-1, 1]) G.box('dark', tTE, tLE, wY - 0.01, wY + wt + 0.02, s > 0 ? hs - 0.2 : -hs, s > 0 ? hs : -hs + 0.2, liv.trim);
      if (K.winglets) for (const s of [-1, 1]) G.prism('dark', [[tTE, wY], [tLE, wY], [tLE - tipC * 0.4, wY + 0.55], [tTE, wY + 0.55]], s > 0 ? hs - 0.05 : -hs, s > 0 ? hs : -hs + 0.05, liv.trim);
      // ---- tail
      const tx = xAt(K.tail); // the tail plane's centre
      const finH = K.delta || K.flyingWing ? 0 : R * (K.fins ? 1.9 : 2.7);
      const finC = Ln * (K.fins ? 0.1 : 0.14);
      const tail = prof[1];
      if (K.fins === 2) for (const s of [-1, 1]) G.tbox('dark', xt + finC * 0.7, ay + R * 0.9 + finH * 0.45, s * R * 0.95, finC * 0.8, finH, 0.05, K.faceted ? mix(liv.wing, INK, 0.2) : liv.trim, s * 0.28, 0, -0.25);
      else if (finH > 0) G.prism('dark', [[xt + finC * 0.2, ay + R * 0.6], [xt + finC * 1.4, ay + R * 0.6], [xt + finC * 0.7, ay + R * 0.6 + finH], [xt - 0.02, ay + R * 0.6 + finH]], -0.04, 0.04, liv.trim);
      else if (K.delta && !K.fins) { /* a delta has no fin: the wing does it */ }
      if (K.stab > 0) {
        const sc = Ln * 0.075; const ss = (K.stab * S) / 2;
        const sy = K.tTail ? ay + R * 0.6 + finH : ay + R * 0.25;
        G.plan('dark', [[xt + sc * 1.6 + 0.0, 0], [xt + sc * 0.9, ss], [xt + 0.0, ss], [xt + sc * 0.5, 0], [xt + 0.0, -ss], [xt + sc * 0.9, -ss]], sy, sy + 0.06, liv.wing);
        void tail; void tx;
      }
      // ---- engines
      const nac = (x, y, z, r, len) => {
        G.cyl('dark', 'x', x - len / 2, y, z, r, len, mix(liv.wing, INK, 0.1), { seg: 8 });
        G.cyl('dark', 'x', x + len / 2 - 0.01, y, z, r * 0.8, 0.03, '#141418', { seg: 8 }); // the intake
        G.cyl('dark', 'x', x - len / 2 - 0.02, y, z, r * 0.62, 0.03, '#2a2c32', { seg: 8 }); // the nozzle
      };
      const wingAtZ = (z) => { const f = Math.abs(z) / hs; return { le: rLE + (tLE - rLE) * f, te: rTE + (tTE - rTE) * f }; };
      if (K.pods === 'wing2' || K.prop === 'wing2') {
        for (const s of [-1, 1]) {
          const z = s * hs * (K.prop ? 0.32 : 0.34); const w = wingAtZ(z);
          if (K.prop) {
            const r = Math.max(0.16, R * 0.32);
            G.box('dark', w.te + chord0 * 0.0, w.le + 0.35, wY - r * 1.0, wY + wt + r * 0.5, z - r, z + r, mix(liv.wing, INK, 0.12));
            props.push({ x: w.le + 0.4, y: wY - r * 0.1, z, r: Math.max(0.5, S * 0.07) });
          } else nac(w.le + 0.15, wY - R * 0.4, z, R * 0.34, R * 1.7);
        }
      } else if (K.pods === 'wing4') {
        for (const s of [-1, 1]) for (const f of [0.22, 0.42]) { const z = s * hs * f; const w = wingAtZ(z); nac(w.le + 0.1, wY - R * 0.3, z, R * 0.3, R * 1.6); }
      } else if (K.pods === 'tail2') {
        for (const s of [-1, 1]) nac(xt + Ln * 0.18, ay + R * 0.3, s * (R + 0.18), R * 0.34, R * 1.7);
      } else if (K.pods === 'internal' || K.pods === 'internal2') {
        for (const s of [-1, 1]) G.box('dark', xn - Ln * 0.38, xn - Ln * 0.3, ay - R * 0.4, ay + R * 0.4, s * R * 1.0 - 0.06, s * R * 1.0 + 0.06, '#15161a'); // intakes
        G.cyl('dark', 'x', xt - 0.03, ay, 0, R * 0.55, 0.06, '#2a2c32', { seg: 8 });
        if (K.fins === 2 || K.pods === 'internal2') G.cyl('dark', 'x', xt - 0.03, ay, 0.0, R * 0.62, 0.0, '#2a2c32', { seg: 3 });
        if (K.pods === 'internal2') for (const s of [-1, 1]) G.cyl('dark', 'x', xt - 0.03, ay, s * R * 0.6, R * 0.38, 0.06, '#2a2c32', { seg: 8 });
      }
      if (K.prop === 'nose') props.push({ x: xn + 0.06, y: ay, z: 0, r: Math.max(0.5, S * 0.08) });
      // ---- canopy and windows
      if (K.canopy === 'bubble') { G.blob('dark', xn - Ln * 0.22, ay + R * 0.75, 0, Ln * 0.07, R * 0.55, R * 0.5, GLASS, 1); }
      else if (K.canopy === 'tandem') { for (const f of [0.2, 0.3]) G.blob('dark', xn - Ln * f, ay + R * 0.78, 0, Ln * 0.05, R * 0.5, R * 0.5, GLASS, 1); }
      else if (K.canopy === 'cabin') {
        G.box('dark', xn - Ln * 0.3, xn - Ln * 0.12, ay + R * 0.1, ay + R * 0.8, -R * 0.98, R * 0.98, GLASS);
        G.prism('dark', [[xn - Ln * 0.14, ay + R * 0.1], [xn - Ln * 0.03, ay + R * 0.2], [xn - Ln * 0.03, ay + R * 0.55], [xn - Ln * 0.14, ay + R * 0.8]], -R * 0.9, R * 0.9, GLASS);
      } else if (K.canopy === 'airliner') {
        G.prism('dark', [[xn - Ln * 0.07, ay + R * 0.1], [xn - Ln * 0.015, ay + R * 0.15], [xn - Ln * 0.015, ay + R * 0.55], [xn - Ln * 0.07, ay + R * 0.5]], -R * 0.7, R * 0.7, GLASS);
        const nW = Math.max(6, Math.floor(Ln * 1.6));
        for (let i = 0; i < nW; i++) for (const s of [-1, 1]) G.box('dark', xn - Ln * 0.14 - i * ((Ln * 0.62) / nW), xn - Ln * 0.14 - i * ((Ln * 0.62) / nW) + 0.1, ay + R * 0.2, ay + R * 0.4, s > 0 ? R * 0.98 : -R * 1.0, s > 0 ? R * 1.0 : -R * 0.98, GLASS);
      }
      if (K.canopy !== 'bubble' && K.canopy !== 'tandem') G.box('dark', xn - Ln * 0.05, xn - Ln * 0.04, ay - R * 0.1, ay + R * 0.3, -R * 0.4, R * 0.4, '#2a2c32');
      // ---- landing gear (a sub, up in the air)
      const lg = K.delta || K.faceted || K.canopy === 'bubble' ? 0.7 : 1;
      gear.nose = [xn - Ln * 0.12, 0];
      gear.mains = [[xAt(K.wingY) - chord0 * 0.1, R * 0.95 * lg], [xAt(K.wingY) - chord0 * 0.1, -R * 0.95 * lg]];
      if (K.pods === 'wing4' || K.canopy === 'airliner' && Ln > 8) gear.mains.push([xAt(K.wingY) - chord0 * 0.1 - 0.5, R * 0.7], [xAt(K.wingY) - chord0 * 0.1 - 0.5, -R * 0.7]);
    },
    subs: [
      {
        name: 'gear', pivot: [0, 0, 0],
        build(G) {
          const wr = Math.max(0.1, R * 0.28);
          const strut = (x, z, h = gh - wr * 0.6) => { G.box('dark', x - 0.025, x + 0.025, wr, wr + h, z - 0.025, z + 0.025, '#8a8e94'); G.cyl('dark', 'z', x, wr, z - wr * 0.5, wr, wr, '#1c1c20', { seg: 8 }); };
          if (gear.nose) strut(gear.nose[0], gear.nose[1]);
          for (const [x, z] of gear.mains) strut(x, z);
        },
      },
      { name: 'nav', pivot: [0, 0, 0], build(G) { for (const n of navs) G.cube(`glow:${n.c}`, n.x, n.y, n.z, 0.12, 0.12, 0.12); } },
      ...[0, 1, 2, 3].map((i) => ({ name: `prop${i}`, pivot: [0, 0, 0], build(G) { const p = props[i]; if (!p) return; G.box('dark', p.x - 0.03, p.x + 0.05, p.y - 0.06, p.y + 0.06, p.z - 0.06, p.z + 0.06, '#aeb4ba'); G.box('dark', p.x, p.x + 0.02, p.y - p.r, p.y + p.r, p.z - 0.05, p.z + 0.05, '#2a2c30'); } })),
    ],
  };
}

/** Build an aircraft for a look and livery name. */
export function buildAircraft(look, livery = null) {
  const sp = spec(look, livery);
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
    const lift = Math.max(0, m.alt || 0);
    const climbing = m.state === 'takeoff' || m.state === 'airborne' ? 1 : m.state === 'landing' ? 0.4 : 0;
    const target = lift > 0.05 ? climbing * Math.min(0.22, lift * 0.06 + 0.04) : 0;
    st.pitch += (target - st.pitch) * Math.min(1, (dt || 0.016) * 3);
    root.rotation.z = st.pitch;
    if (u.subs.nav) u.subs.nav.visible = Boolean(ctx?.night);
  };
  return root;
}
