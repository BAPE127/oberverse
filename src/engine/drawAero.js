// Aerospace art (v0.55.0): Starling Flats in the game's pixel style. Everything is painted
// with whole-pixel rectangles (scanline-filled polygons for wings), lit from the top left like
// the rest of the world, and cached: an aircraft is painted once per look, livery and stage of
// build, then copied (rotated with nearest-neighbour sampling so the pixels stay crisp).
//
//   aircraftCanvas(look, opts)  — a top-down aircraft, nose up, for the apron, the bays, the boneyard
//   rocketCanvas(look, opts)    — a launch vehicle standing (pad, VIB) or lying (integration bay)
//   satelliteCanvas(look, opts) — a satellite bus, panels stowed or deployed
//   AERO_PAINTERS               — prop painters (src/engine/propSprites.js merges them)
//   aeroLive(ctx, p, opts)      — the moving bits: windsocks, radar, beacons, runway lights at night
const T = 32;
const INK = '#1b1a24';

// ------------------------------------------------------------------ colour (as in propSprites.js)
const hexRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => { const x = hexRgb(a); const y = hexRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const ramp = (hex) => [mix(hex, INK, 0.5), mix(hex, INK, 0.25), hex, mix(hex, '#fff6e0', 0.2), mix(hex, '#fffaf0', 0.42)];

const canMake = () => typeof document !== 'undefined';
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const cache = new Map();
const cached = (key, make) => { let c = cache.get(key); if (!c) { c = make(); cache.set(key, c); } return c; };

/** Rect and pixel helpers on a context; poly() fills a polygon row by row (no antialiasing). */
function pen(ctx) {
  const R = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const poly = (pts, c, shadeFn = null) => {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]);
        const xb = Math.round(xs[k + 1]);
        if (shadeFn) for (let x = xa; x < xb; x++) { ctx.fillStyle = shadeFn(x, y); ctx.fillRect(x, y, 1, 1); }
        else R(xa, y, xb - xa, 1, c);
      }
    }
  };
  return { R, poly, ctx };
}

/** Trace an ink outline one pixel round whatever has been painted (like the prop sprites). */
function outline(src) {
  const out = canvas(src.width + 2, src.height + 2);
  const oc = out.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) oc.drawImage(src, 1 + dx, 1 + dy);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = INK;
  oc.fillRect(0, 0, out.width, out.height);
  oc.globalCompositeOperation = 'source-over';
  oc.drawImage(src, 1, 1);
  return out;
}

// ------------------------------------------------------------------ liveries
export const LIVERIES = {
  roost: { body: '#efe6d0', trim: '#c8402a', wing: '#e2d8c0', accent: '#e8c04a' },
  meridian: { body: '#f4f4f2', trim: '#2e3a4e', wing: '#d8dce2', accent: '#c8a040' },
  test: { body: '#f4f2ee', trim: '#e86a20', wing: '#e8e6e0', accent: '#2e3a4e' },
  military: { body: '#8a929a', trim: '#5a626a', wing: '#7e868e', accent: '#c8c040' },
  stealth: { body: '#3e444c', trim: '#2a3038', wing: '#383e46', accent: '#4a5058' },
};
const PRIMER = '#8fa07e'; // zinc-chromate green: structure before paint
const BARE = '#b4b8bc';

/** Proportions of each kind of aircraft (fractions of the canvas: length down, span across). */
const KINDS = {
  highwing: { fw: 0.12, wingY: 0.3, chord: 0.2, tip: 0.18, sweep: 0, tail: 0.86, stab: 0.36, prop: 'nose', canopy: 'cabin' },
  twinprop: { fw: 0.12, wingY: 0.36, chord: 0.16, tip: 0.11, sweep: 0.02, tail: 0.87, stab: 0.34, prop: 'wing2', canopy: 'cabin' },
  bizjet: { fw: 0.13, wingY: 0.48, chord: 0.18, tip: 0.08, sweep: 0.12, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true },
  bizjet_long: { fw: 0.11, wingY: 0.46, chord: 0.18, tip: 0.06, sweep: 0.16, tail: 0.9, stab: 0.3, pods: 'tail2', canopy: 'airliner', tTail: true, winglets: true },
  futuristic: { fw: 0.2, wingY: 0.55, chord: 0.36, tip: 0.1, sweep: 0.3, tail: 0.92, stab: 0, pods: 'internal', canopy: 'bubble', delta: true },
  turboprop_liner: { fw: 0.1, wingY: 0.38, chord: 0.13, tip: 0.08, sweep: 0.01, tail: 0.88, stab: 0.3, prop: 'wing2', canopy: 'airliner', tTail: true },
  narrowbody: { fw: 0.1, wingY: 0.44, chord: 0.18, tip: 0.05, sweep: 0.16, tail: 0.9, stab: 0.32, pods: 'wing2', canopy: 'airliner', winglets: true },
  widebody: { fw: 0.11, wingY: 0.44, chord: 0.2, tip: 0.05, sweep: 0.18, tail: 0.9, stab: 0.34, pods: 'wing2', canopy: 'airliner', winglets: true },
  blended: { fw: 0.3, wingY: 0.5, chord: 0.3, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0, pods: 'wing4', canopy: 'airliner', blended: true },
  trainer: { fw: 0.14, wingY: 0.5, chord: 0.2, tip: 0.1, sweep: 0.04, tail: 0.88, stab: 0.38, pods: 'internal', canopy: 'tandem' },
  fighter: { fw: 0.15, wingY: 0.56, chord: 0.26, tip: 0.06, sweep: 0.2, tail: 0.92, stab: 0.42, pods: 'internal', canopy: 'bubble', delta: false, fins: 1 },
  twinfighter: { fw: 0.2, wingY: 0.55, chord: 0.3, tip: 0.07, sweep: 0.22, tail: 0.92, stab: 0.44, pods: 'internal', canopy: 'bubble', fins: 2 },
  stealthfighter: { fw: 0.22, wingY: 0.56, chord: 0.32, tip: 0.06, sweep: 0.24, tail: 0.9, stab: 0.4, pods: 'internal', canopy: 'bubble', fins: 2, faceted: true },
  futurefighter: { fw: 0.22, wingY: 0.6, chord: 0.4, tip: 0.04, sweep: 0.32, tail: 0.94, stab: 0, pods: 'internal', canopy: 'bubble', fins: 2, delta: true, faceted: true },
  tacbomber: { fw: 0.14, wingY: 0.48, chord: 0.22, tip: 0.08, sweep: 0.18, tail: 0.9, stab: 0.36, pods: 'internal2', canopy: 'tandem', fins: 1 },
  stratbomber: { fw: 0.08, wingY: 0.46, chord: 0.2, tip: 0.06, sweep: 0.24, tail: 0.92, stab: 0.3, pods: 'wing4', canopy: 'airliner', fins: 1 },
  flyingwing: { flyingWing: true, canopy: 'slit', pods: 'buried' },
  futurebomber: { flyingWing: true, canopy: 'slit', pods: 'buried', glow: true },
};

/**
 * An aircraft seen from above, nose up. look: a product's `look` ({ kind, len, span, color, trim }).
 * opts: { livery, wreck, build: { fuselage 0–1, wings 0–1, engines, painted } } (omit for finished).
 * Returns an outlined canvas (or null without a DOM).
 */
export function aircraftCanvas(look, opts = {}) {
  if (!canMake() || !look) return null;
  const b = opts.build;
  const bkey = b ? `${Math.round(b.fuselage * 8)}${Math.round(b.wings * 8)}${b.engines ? 1 : 0}${b.painted ? 1 : 0}` : 'done';
  return cached(`ac|${look.kind}|${look.len}|${look.span}|${look.color}|${opts.livery || ''}|${opts.wreck ? 1 : 0}|${bkey}`, () => outline(paintAircraft(look, opts)));
}

function paintAircraft(look, opts) {
  const K = KINDS[look.kind] || KINDS.highwing;
  const L = look.len * T;
  const S = look.span * T;
  const c = canvas(S, L);
  const { R, poly } = pen(c.getContext('2d'));
  const liv = LIVERIES[opts.livery] || { body: look.color || '#f4f4f4', trim: look.trim || '#3a5aa8', wing: mix(look.color || '#f4f4f4', '#9aa0a8', 0.25), accent: look.trim || '#3a5aa8' };
  const b = opts.build || { fuselage: 1, wings: 1, engines: true, painted: true };
  const painted = b.painted !== false;
  const body = opts.wreck ? mix(liv.body, '#8a7a5a', 0.45) : painted ? liv.body : PRIMER;
  const wingC = opts.wreck ? mix(liv.wing, '#7a6a4a', 0.5) : painted ? liv.wing : BARE;
  const trim = opts.wreck ? mix(liv.trim, '#6a5a4a', 0.5) : liv.trim;
  const cx = S / 2;
  const shadeAcross = (base, half) => { const r = ramp(base); return (x) => { const t = (x - (cx - half)) / (half * 2); return r[t < 0.12 ? 1 : t < 0.38 ? 4 : t < 0.62 ? 3 : t < 0.86 ? 2 : 1]; }; };
  if (K.flyingWing) {
    // a chevron: the whole aircraft is wing
    if (b.wings <= 0 && b.fuselage <= 0) return c;
    const f = Math.max(b.fuselage, b.wings);
    const sh = shadeAcross(body, S * 0.5);
    const nose = L * 0.02;
    const pts = [[cx, nose], [S - 2, L * 0.62], [S - 2, L * 0.72], [S * 0.78, L * 0.66], [S * 0.64, L * 0.98], [cx, L * 0.78], [S * 0.36, L * 0.98], [S * 0.22, L * 0.66], [2, L * 0.72], [2, L * 0.62]];
    const clip = pts.map(([x, y]) => [cx + (x - cx) * f, y]);
    poly(clip, null, (x) => sh(x));
    if (b.painted !== false && !opts.wreck) { R(cx - S * 0.04, L * 0.12, S * 0.08, L * 0.04, '#1e242c'); }
    if (K.glow && painted) for (const dx of [-0.08, 0.08]) R(cx + dx * S - 3, L * 0.74, 6, 3, '#4ad8e8');
    if (b.engines) for (const dx of [-0.12, -0.05, 0.05, 0.12]) R(cx + dx * S - 2, L * 0.62, 4, L * 0.05, mix(body, INK, 0.3));
    return c;
  }
  const fw = Math.max(6, S * K.fw * (look.span > look.len ? look.len / look.span : 1) * (K.blended ? 1 : 1));
  const half = fw / 2;
  // wings (behind the fuselage)
  if (b.wings > 0) {
    const wy = L * K.wingY;
    const chord = L * K.chord;
    const tipC = L * K.tip;
    const sweep = L * K.sweep;
    const reach = (S / 2 - 2) * b.wings;
    const sh = (x, y) => { const r = ramp(wingC); const t = Math.abs(x - cx) / (S / 2); return r[y < wy + 2 ? 4 : t > 0.9 ? 1 : (x < cx ? 3 : 2)]; };
    for (const side of [-1, 1]) {
      const pts = K.delta
        ? [[cx + side * half * 0.6, wy - chord * 0.5], [cx + side * reach, wy + sweep + chord * 0.4], [cx + side * reach, wy + sweep + chord * 0.4 + tipC], [cx + side * half * 0.6, wy + chord]]
        : [[cx + side * half * 0.8, wy], [cx + side * reach, wy + sweep], [cx + side * reach, wy + sweep + tipC], [cx + side * half * 0.8, wy + chord]];
      poly(pts, null, sh);
      if (K.winglets && b.wings >= 1) R(side < 0 ? cx - reach : cx + reach - 2, wy + sweep - 4, 2, tipC + 4, trim);
      // flap and aileron lines
      if (b.wings >= 1) for (let i = 1; i < 4; i++) { const t = i / 4; R(cx + side * (half + (reach - half) * t) - (side < 0 ? 4 : 0), wy + sweep * t + chord * (1 - t) + tipC * t - 3, 4, 1, mix(wingC, INK, 0.3)); }
    }
    // the tailplane
    if (K.stab && b.wings >= 1) {
      const ty = L * K.tail;
      const sspan = S * K.stab / 2;
      const sc = L * 0.06;
      for (const side of [-1, 1]) poly([[cx + side * half * 0.5, ty - sc * 0.4], [cx + side * sspan, ty + L * K.sweep * 0.3], [cx + side * sspan, ty + L * K.sweep * 0.3 + sc * 0.5], [cx + side * half * 0.5, ty + sc * 0.6]], null, sh);
    }
  }
  // engines under the wings (drawn before the fuselage so it overlaps their pylons)
  const wy = L * K.wingY;
  const enginePods = (n) => {
    const xs = n === 2 ? [0.27] : [0.22, 0.38];
    for (const fx of xs) for (const side of [-1, 1]) {
      const ex = cx + side * S * fx;
      const ey = wy + L * K.sweep * (fx * 2) - L * 0.05;
      const pw = Math.max(5, S * 0.05);
      const ph = Math.max(10, L * 0.12);
      const r = ramp(painted ? mix(body, '#9aa0a8', 0.3) : BARE);
      for (let x = 0; x < pw; x++) R(ex - pw / 2 + x, ey, 1, ph, r[x < pw * 0.3 ? 4 : x < pw * 0.7 ? 3 : 1]);
      R(ex - pw / 2, ey, pw, 2, '#2a2c32'); // the intake
      R(ex - pw / 2 + 1, ey + ph - 2, pw - 2, 2, '#4a4c52'); // the exhaust
    }
  };
  if (b.engines) {
    if (K.pods === 'wing2' && !K.prop) enginePods(2);
    if (K.pods === 'wing4') enginePods(4);
  }
  // the fuselage: a long rounded body, shaded across, built nose-first as fuselage goes 0 → 1
  if (b.fuselage > 0) {
    const tailEnd = L * 0.99;
    const top = L * (1 - b.fuselage) * 0; // built from the middle out: nose and tail come last
    const seg0 = L * 0.5 - (L * 0.5) * b.fuselage;
    const seg1 = L * 0.5 + (tailEnd - L * 0.5) * b.fuselage;
    const sh = shadeAcross(body, half);
    const widthAt = (y) => {
      const t = y / L;
      if (K.blended) return half * (t < 0.15 ? Math.sqrt(t / 0.15) : t > 0.7 ? Math.max(0.3, 1 - (t - 0.7) / 0.35) : 1);
      if (t < 0.1) return half * Math.sqrt(t / 0.1) * 0.95;
      if (t > 0.72) return half * Math.max(0.18, 1 - (t - 0.72) / 0.3);
      return half;
    };
    for (let y = Math.floor(Math.max(seg0, top)); y < seg1; y++) {
      const w = widthAt(y);
      for (let x = Math.round(cx - w); x < Math.round(cx + w); x++) R(x, y, 1, 1, sh(x));
    }
    if (painted && b.fuselage >= 1 && !opts.wreck) {
      // a cheat line down the spine and the livery's tail colour
      R(cx - 1, L * 0.16, 2, L * 0.6, mix(trim, body, 0.3));
      for (let y = Math.floor(L * 0.8); y < L * 0.97; y++) { const w = widthAt(y); R(cx - w * 0.7, y, w * 1.4, 1, trim); }
    }
  }
  // the fin(s): a thin line seen from above, with its shadow
  if (b.fuselage >= 1) {
    const fins = K.fins === 2 ? [-half * 0.7, half * 0.7] : [0];
    for (const dx of fins) { R(cx + dx - 1, L * 0.82, 3, L * 0.16, painted ? trim : PRIMER); R(cx + dx + 2, L * 0.84, 1, L * 0.14, 'rgba(20,20,30,0.35)'); }
    if (K.tTail && b.wings >= 1) R(cx - S * 0.16, L * 0.95, S * 0.32, 3, painted ? trim : BARE);
  }
  // engines that aren't pods
  if (b.engines && b.fuselage >= 1) {
    if (K.pods === 'tail2') for (const side of [-1, 1]) { const ex = cx + side * (half + 3); const r = ramp(painted ? mix(body, '#9aa0a8', 0.25) : BARE); for (let x = 0; x < 6; x++) R(ex - 3 + x, L * 0.66, 1, L * 0.14, r[x < 2 ? 4 : x < 4 ? 3 : 1]); R(ex - 3, L * 0.66, 6, 2, '#2a2c32'); }
    if (K.pods === 'internal' || K.pods === 'internal2') { const n = K.pods === 'internal2' || K.fins === 2 ? [-0.25, 0.25] : [0]; for (const dx of n) { R(cx + dx * fw - 3, L * 0.97, 6, 3, '#3a3c42'); R(cx + dx * fw - 2, L * 0.98, 4, 2, painted && !opts.wreck ? '#e8a040' : '#3a3c42'); } }
    if (K.prop === 'nose') { R(cx - S * 0.13, 1, S * 0.26, 2, 'rgba(60,60,70,0.55)'); R(cx - 2, 0, 4, 4, '#2a2a30'); }
    if (K.prop === 'wing2') for (const side of [-1, 1]) { const ex = cx + side * S * 0.24; R(ex - 3, wy - 10, 6, 14, painted ? mix(body, '#9aa0a8', 0.3) : BARE); R(ex - S * 0.1, wy - 12, S * 0.2, 2, 'rgba(60,60,70,0.55)'); R(ex - 1, wy - 13, 2, 3, '#2a2a30'); }
  }
  // the canopy or windscreen
  if (b.fuselage >= 1) {
    const glass = opts.wreck ? '#4a5058' : '#3a5a7a';
    const shine = opts.wreck ? '#5a6068' : '#8ac0e0';
    if (K.canopy === 'bubble') { R(cx - half * 0.45, L * 0.16, half * 0.9, L * 0.12, glass); R(cx - half * 0.3, L * 0.17, 2, L * 0.06, shine); }
    else if (K.canopy === 'tandem') { R(cx - half * 0.45, L * 0.14, half * 0.9, L * 0.18, glass); R(cx - half * 0.45, L * 0.22, half * 0.9, 1, INK); R(cx - half * 0.3, L * 0.15, 2, L * 0.05, shine); }
    else if (K.canopy === 'cabin') { R(cx - half * 0.7, L * 0.12, half * 1.4, L * 0.1, glass); R(cx - half * 0.5, L * 0.13, 2, L * 0.04, shine); }
    else if (K.canopy === 'airliner') { R(cx - half * 0.6, L * 0.05, half * 1.2, 3, glass); R(cx - half * 0.4, L * 0.05, 2, 1, shine); }
    else if (K.canopy === 'slit') R(cx - 6, L * 0.12, 12, 2, glass);
  }
  if (opts.wreck) {
    // missing panels, rust and the odd hole
    const ctx = c.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(cx + ((i * 37) % 11 - 5) * half * 0.15), Math.round(L * (0.25 + i * 0.09)), 3, 2);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 10; i++) R(cx + ((i * 53) % 17 - 8) * S * 0.03, L * (0.2 + (i * 29 % 13) * 0.05), 2, 1, '#7a5a3a');
  }
  return c;
}

/** Draw an aircraft centred at (x, y) with a heading (radians, 0 = nose up), crisp. */
export function drawAircraft(ctx, look, x, y, heading = 0, opts = {}) {
  const c = aircraftCanvas(look, opts);
  if (!c) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (heading) ctx.rotate(heading);
  if (opts.shadow !== false) {
    // the shadow: the silhouette, dark, offset down-right (further when airborne)
    const s = shadowOf(c);
    const lift = opts.altitude || 0;
    ctx.globalAlpha = (opts.shadowAlpha ?? 0.3) * Math.max(0.25, 1 - lift / 300);
    ctx.drawImage(s, -c.width / 2 + 6 + lift * 0.6, -c.height / 2 + 6 + lift * 0.9);
    ctx.globalAlpha = 1;
  }
  const k = opts.scale || 1;
  ctx.drawImage(c, -c.width * k / 2, -c.height * k / 2 - (opts.altitude || 0), c.width * k, c.height * k);
  ctx.restore();
}

const shadows = new WeakMap();
function shadowOf(c) {
  let s = shadows.get(c);
  if (!s) {
    s = canvas(c.width, c.height);
    const sc = s.getContext('2d');
    sc.drawImage(c, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = 'rgb(16,14,36)';
    sc.fillRect(0, 0, s.width, s.height);
    shadows.set(c, s);
  }
  return s;
}

// ------------------------------------------------------------------ rockets
/**
 * A launch vehicle seen side-on, standing (nose up). look: { h (tiles), w (tiles), color, band,
 * boosters, legs, capsule }. opts.stages: how much is stacked (0–1); opts.lying: on its side.
 */
export function rocketCanvas(look, opts = {}) {
  if (!canMake() || !look) return null;
  const st = Math.round((opts.stages ?? 1) * 6);
  return cached(`rk|${look.h}|${look.w}|${look.color}|${look.band}|${look.boosters ? 1 : 0}|${look.legs ? 1 : 0}|${look.capsule ? 1 : 0}|${st}|${opts.lying ? 1 : 0}|${opts.secure ? 1 : 0}`, () => {
    const up = paintRocket(look, st / 6, opts);
    if (!opts.lying) return outline(up);
    const c = canvas(up.height, up.width);
    const ctx = c.getContext('2d');
    ctx.translate(0, c.height);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(up, 0, 0);
    return outline(c);
  });
}

function paintRocket(look, stages, opts) {
  const H = look.h * T;
  const W0 = Math.max(10, look.w * 14);
  const extra = look.boosters ? 14 : 0;
  const c = canvas(W0 + extra * 2 + 4, H);
  const { R } = pen(c.getContext('2d'));
  const cx = c.width / 2;
  const body = opts.secure ? '#5a6050' : look.color;
  const r = ramp(body);
  const cylR = (x0, y0, w, h, pal) => { for (let i = 0; i < w; i++) { const t = (i + 0.5) / w; R(x0 + i, y0, 1, h, pal[t < 0.15 ? 2 : t < 0.4 ? 4 : t < 0.62 ? 3 : t < 0.85 ? 2 : 1]); } };
  const built = H * stages;
  const y0 = H - built;
  // the core: interstage bands, the company band, the fairing (an ogive) on top when it's all stacked
  const fair = H * 0.16;
  cylR(cx - W0 / 2, Math.max(y0, fair), W0, H - Math.max(y0, fair), r);
  if (stages >= 0.999) {
    for (let y = 0; y < fair; y++) { const t = y / fair; const w = Math.max(2, W0 * Math.sqrt(t)); cylR(cx - w / 2, y, w, 1, look.capsule ? ramp('#e8e8e4') : r); }
    if (look.capsule) { R(cx - W0 / 2 - 1, fair - 4, W0 + 2, 3, '#2a2a30'); R(cx - 1, 0, 2, 6, '#c8402a'); }
  }
  for (const f of [0.38, 0.62]) if (H * f > y0) R(cx - W0 / 2, H * f, W0, 2, mix(body, INK, 0.45));
  if (H * 0.3 > y0 && !opts.secure) R(cx - W0 / 2, H * 0.3, W0, 5, look.band);
  if (opts.secure) { R(cx - W0 / 2, Math.max(y0, H * 0.2), W0, 2, '#3a4030'); }
  // engines and legs
  R(cx - W0 * 0.4, H - 4, W0 * 0.8, 4, '#2a2c32');
  if (look.legs) for (const side of [-1, 1]) { R(cx + side * (W0 / 2) - (side < 0 ? 3 : 0), H - 26, 3, 22, '#3a3c42'); R(cx + side * (W0 / 2 + 6) - 2, H - 6, 4, 6, '#2a2c32'); }
  if (look.boosters && stages > 0.5) for (const side of [-1, 1]) {
    const bx = cx + side * (W0 / 2 + extra / 2 + 1) - extra / 2 + 2;
    cylR(bx, H * 0.45, extra - 4, H * 0.55 - 3, ramp(mix(body, '#c8c8c0', 0.3)));
    for (let y = 0; y < 10; y++) { const w = Math.max(2, (extra - 4) * Math.sqrt(y / 10)); cylR(bx + (extra - 4 - w) / 2, H * 0.45 - 10 + y, w, 1, ramp(body)); }
    R(bx, H - 4, extra - 4, 4, '#2a2c32');
  }
  // markings on the side
  if (stages >= 0.999 && !opts.secure) { for (let i = 0; i < 4; i++) R(cx - 1, H * 0.48 + i * 6, 2, 4, look.band); }
  return c;
}

// ------------------------------------------------------------------ satellites
/** A satellite from above: a bus, an antenna, panels (stowed or deployed). */
export function satelliteCanvas(sat, opts = {}) {
  if (!canMake() || !sat) return null;
  const deployed = opts.panels !== false;
  const k = sat.mass || 1;
  return cached(`sat|${k}|${sat.role}|${deployed ? 1 : 0}|${opts.bare ? 1 : 0}`, () => {
    const bus = 10 + k * 5;
    const span = deployed ? bus + 24 + k * 14 : bus + 6;
    const c = canvas(span, bus + 16);
    const { R } = pen(c.getContext('2d'));
    const cx = span / 2;
    const gold = ramp(opts.bare ? '#9aa0a8' : '#d8a840');
    for (let y = 0; y < bus; y++) for (let x = 0; x < bus; x++) R(cx - bus / 2 + x, 8 + y, 1, 1, gold[(x < 2 || y < 2) ? 4 : (x + y) % 5 === 0 ? 2 : 3]);
    R(cx - bus / 2, 8 + bus - 2, bus, 2, gold[1]);
    // the antenna dish (comms), a camera (observation), a boom (science)
    if (sat.role === 'comms' || sat.role === 'defense') { R(cx - 5, 0, 10, 8, '#e8e8e4'); R(cx - 3, 2, 6, 4, '#c8c8c4'); R(cx - 1, 3, 2, 2, '#4a4c52'); }
    else if (sat.role === 'earthobs' || sat.role === 'weather') { R(cx - 3, 2, 6, 6, '#2a2c32'); R(cx - 1, 3, 2, 2, '#4ad8e8'); }
    else { R(cx - 1, 0, 2, 8, '#c8c8c4'); R(cx - 3, 0, 6, 2, '#e8e8e4'); }
    // solar arrays
    const pw = deployed ? 12 + k * 7 : 3;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? cx - bus / 2 - pw - 2 : cx + bus / 2 + 2;
      R(side < 0 ? x0 + pw : x0 - 2, 8 + bus / 2 - 1, 2, 2, '#8a8c92');
      for (let x = 0; x < pw; x++) for (let y = 0; y < bus; y++) R(x0 + x, 8 + y, 1, 1, (x % 4 === 3 || y % 4 === 3) ? '#5a6a8a' : '#2a3a6a');
      if (sat.role === 'power' && deployed) R(x0, 8, pw, 1, '#c8a040');
    }
    return outline(c);
  });
}

// ------------------------------------------------------------------ prop painters
const W = (p) => Math.round((p.w || 1) * T);
const H = (p) => Math.round((p.h || 1) * T);
const hashi = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export const AERO_PAINTERS = {
  windsock: {
    box: () => [6, -46, 30, 31], shadow: [6, 3],
    paint(k) {
      const { R } = k;
      R(14, -42, 3, 70, '#c8ccd2'); R(14, -42, 1, 70, '#e8ecf0'); R(16, -42, 1, 70, '#7a8088');
      R(11, 26, 9, 4, '#5a5e66'); R(11, 26, 9, 1, '#8a8e96');
      R(13, -44, 5, 3, '#c84a2a'); // the cap; the sock itself is drawn live
    },
  },
  control_tower: {
    box: (p) => [-6, -150, W(p) + 6, H(p) + 2], shadow: [26, 10], night: true,
    paint(k, p, v, o) {
      const { R, cyl, block } = k;
      const w = W(p);
      const cx = w / 2;
      const conc = ['#6a6e72', '#8a8e92', '#a8acb0', '#c4c8cc', '#dcdfe2'];
      block(4, H(p) - 34, w - 8, 34, 8, ramp('#b8bcc0'));
      for (let i = 0; i < 3; i++) R(10 + i * 26, H(p) - 20, 14, 10, o.night ? '#e8d890' : '#3a4a5a');
      cyl(cx - 12, -96, 24, H(p) - 30 + 96, conc);
      for (let y = -90; y < H(p) - 40; y += 18) R(cx - 3, y, 6, 8, o.night ? '#e8d890' : '#2a3440');
      // the cab: a wide glass box, angled panes, a gallery round it, the roof
      R(cx - 34, -112, 68, 4, '#4a4e56');
      R(cx - 30, -134, 60, 22, '#2a3a4a');
      for (let x = -28; x < 28; x += 8) R(cx + x, -132, 6, 18, o.night ? '#7ad8a0' : (x < 0 ? '#6a9ac0' : '#4a7aa0'));
      R(cx - 32, -138, 64, 5, '#d8dce0'); R(cx - 32, -138, 64, 1, '#f0f2f4');
      R(cx - 1, -150, 2, 12, '#8a8e96'); R(cx + 6, -146, 2, 8, '#8a8e96');
    },
  },
  radar: {
    box: (p) => [0, -22, W(p), H(p) + 2], shadow: [8, 4],
    paint(k, p) {
      const { R, block } = k;
      const w = W(p);
      block(w / 2 - 14, H(p) - 26, 28, 24, 6, ramp('#d8dce0'));
      R(w / 2 - 12, H(p) - 16, 6, 4, '#3a4a5a');
      R(w / 2 - 3, -2, 6, H(p) - 24, '#8a8e96'); R(w / 2 - 3, -2, 2, H(p) - 24, '#b8bcc0');
    },
  },
  runway_light: {
    box: () => [10, 10, 22, 22], shadow: [0, 0], night: true,
    paint(k, p, v, o) {
      const { R } = k;
      const c = { green: '#3fe07a', red: '#ff4a3a', white: '#f4f0d8' }[p.color] || '#f4e8a8';
      R(13, 14, 6, 5, '#5a5e66'); R(14, 13, 4, 2, o.night ? c : '#d8dce0'); R(14, 13, 2, 1, '#ffffff');
    },
  },
  runway_sign: {
    box: () => [0, -6, 32, 30], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      R(4, 12, 2, 16, '#5a5e66'); R(26, 12, 2, 16, '#5a5e66');
      R(0, -4, 32, 18, '#1e1e24'); R(1, -3, 30, 16, '#2a2a30'); R(1, -3, 30, 1, '#e8c040'); R(1, 12, 30, 1, '#e8c040');
      // (the lettering is drawn live, like the other signs)
    },
  },
  engine_stand: {
    box: () => [-2, -10, 34, 32], shadow: [4, 3],
    paint(k) {
      const { R, cyl, ell } = k;
      R(2, 22, 28, 4, '#c8a040'); R(2, 22, 28, 1, '#e8c860');
      for (const x of [2, 26]) { R(x, 26, 4, 4, '#1a1a1e'); }
      R(6, 12, 3, 10, '#8a8e96'); R(23, 12, 3, 10, '#8a8e96');
      cyl(2, -6, 28, 20, ['#4a4e56', '#6a6e76', '#9aa0a8', '#c8ccd2', '#e8ecf0']);
      ell(16, -6, 13, 3, '#2a2c32'); R(10, -7, 12, 2, '#5a5e66');
      for (let x = 5; x < 28; x += 5) R(x, 2, 2, 8, '#5a5e66');
    },
  },
  tug: {
    box: (p) => [0, -12, W(p), H(p) + 2], shadow: [5, 3],
    paint(k, p) {
      const { R, block } = k;
      const w = W(p);
      const c = ramp(p.color || '#e8c04a');
      block(2, -6, w - 4, 34, 10, c);
      R(w - 18, -10, 12, 10, '#2a3440'); R(w - 16, -9, 8, 4, '#6a9ac0');
      R(6, 0, w - 26, 2, c[0]); R(4, 20, w - 8, 4, '#2a2a30');
      for (const x of [6, w - 14]) { R(x, 24, 8, 6, '#1a1a1e'); R(x + 2, 26, 4, 2, '#4a4a50'); }
      R(w - 14, -12, 4, 3, '#ffa020');
    },
  },
  gantry: {
    box: (p) => [0, -70, W(p), 4], shadow: [0, 0],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      R(0, -66, w, 8, '#c8a040'); R(0, -66, w, 2, '#e8c860'); R(0, -60, w, 2, '#8a7020');
      for (let x = 4; x < w; x += 16) { R(x, -64, 2, 4, '#8a7020'); R(x + 6, -62, 6, 1, '#8a7020'); }
      for (const x of [0, w - 6]) R(x, -66, 6, 70, '#9a8030');
    },
  },
  boom_barrier: {
    box: (p) => [-2, -30, W(p), 30], shadow: [3, 3],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      R(0, 6, 8, 22, '#5a5e66'); R(0, 6, 8, 2, '#8a8e96'); R(1, 10, 6, 4, '#e8c040');
      if (p.raised) {
        for (let i = 0; i < 9; i++) R(5 + i, 4 - i * 3, 3, 4, i % 2 ? '#f4f4f0' : '#c8402a');
      } else for (let x = 8; x < w - 2; x += 6) R(x, 10, 6, 3, (x / 6) % 2 ? '#f4f4f0' : '#c8402a');
    },
  },
  dish: {
    box: (p) => [-4, -26, W(p) + 4, H(p) + 2], shadow: [10, 6],
    paint(k, p) {
      const { R, ell, block } = k;
      const w = W(p);
      const hh = H(p);
      block(w / 2 - 10, hh - 18, 20, 16, 5, ramp('#9aa0a8'));
      R(w / 2 - 3, hh - 34, 6, 18, '#7a8088');
      // the dish, tilted up to the sky
      for (let i = 0; i < 18; i++) { const half = Math.round(26 * Math.sqrt(1 - ((i - 9) / 9.5) ** 2)); R(w / 2 - half, -20 + i * 1.2 + hh * 0.2, half * 2, 2, i < 4 ? '#f4f4f0' : i < 10 ? '#dcdfe2' : '#b8bcc0'); }
      ell(w / 2, -8 + hh * 0.2, 6, 3, '#8a8e96');
      R(w / 2 - 1, -26 + hh * 0.2, 2, 16, '#5a5e66');
    },
  },
  test_stand: {
    box: (p) => [-4, -40, W(p) + 4, H(p) + 2], shadow: [12, 6],
    paint(k, p) {
      const { R, cyl, ell } = k;
      const w = W(p);
      const hh = H(p);
      const steel = '#5a6068';
      for (const x of [4, w - 8]) R(x, -30, 4, hh + 28, steel);
      R(4, -32, w - 8, 4, steel); R(4, hh - 10, w - 8, 4, steel);
      for (let x = 8; x < w - 8; x += 12) for (let t = 0; t < 1; t += 0.05) R(x + t * 12, -28 + t * (hh + 16), 1, 1, '#7a8088');
      cyl(10, 4, w - 20, 34, ['#4a4e56', '#6a6e76', '#9aa0a8', '#c8ccd2', '#e8ecf0']);
      ell(w / 2, 4, (w - 20) / 2, 4, '#2a2c32');
      R(w / 2 - 6, 38, 12, 6, '#3a3c42');
      R(w / 2 - 2, -40, 4, 8, '#c84a2a');
    },
  },
  blast_wall: {
    box: (p) => [0, -18, W(p), H(p)], shadow: [6, 4],
    paint(k, p) {
      const { block, R } = k;
      block(0, -16, W(p), H(p) + 16, 6, ramp('#a8aca8'));
      for (let x = 6; x < W(p); x += 14) R(x, -8, 1, H(p) + 6, '#7a7e7a');
      R(0, H(p) - 4, W(p), 4, '#5a5e5a');
    },
  },
  propellant_sphere: {
    box: (p) => [0, -30, W(p), H(p) + 2], shadow: [14, 6],
    paint(k, p) {
      const { R, ball } = k;
      const w = W(p);
      const hh = H(p);
      for (const x of [w * 0.22, w * 0.5 - 2, w * 0.74]) R(x, hh * 0.45, 4, hh * 0.55 - 2, '#7a8088');
      ball(w / 2, hh * 0.3 - 6, w * 0.44, w * 0.44, ramp(p.color || '#e8ecf0'));
      R(w / 2 - w * 0.44, hh * 0.3 - 7, w * 0.88, 2, '#b8bcc0');
      R(w / 2 - 3, -30, 6, 6, '#8a8e96');
    },
  },
  launch_tower: {
    box: (p) => [-34, -400, W(p) + 4, H(p) + 2], shadow: [40, 14],
    paint(k, p) {
      const { R } = k;
      const w = W(p);
      const red = ['#6a1a14', '#8a2a20', '#a83a2a', '#c84a34'];
      const x0 = 4;
      const x1 = w - 4;
      R(x0 - 2, H(p) - 8, x1 - x0 + 4, 8, '#5a5e66');
      for (const x of [x0, x1 - 4]) R(x, -390, 4, H(p) + 382, red[2]);
      R(x0, -390, 2, H(p) + 382, red[3]);
      for (let y = -386; y < H(p) - 8; y += 14) {
        R(x0, y, x1 - x0, 2, red[1]);
        for (let t = 0; t < 1; t += 0.06) R(x0 + t * (x1 - x0), y + t * 14, 1, 1, red[0]);
      }
      // swing arms reaching west to the rocket, and the lightning mast
      for (const y of [-330, -240, -150, -60]) { R(-30, y, x0 + 30, 4, red[2]); R(-30, y + 4, x0 + 30, 1, red[0]); R(-32, y - 2, 4, 8, '#5a5e66'); }
      R(w / 2 - 1, -400, 2, 12, '#9aa0a8');
      R(x0 + 4, -200, 8, 12, '#3a4048'); // the lift car
    },
  },
};

// ------------------------------------------------------------------ the live bits
/** Animated overlays drawn after a prop's sprite. */
export function aeroLive(ctx, p, opts) {
  const t = opts.time || 0;
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  if (p.type === 'windsock') {
    // a west wind: the sock streams east, fluttering
    const gust = 0.75 + 0.25 * Math.sin(t * 1.3 + p.x);
    for (let i = 0; i < 5; i++) {
      const sx = x + 18 + i * 5 * gust;
      const sy = y - 43 + i * (1 - gust) * 2 + Math.sin(t * 7 + i) * (i * 0.3);
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 6, 7 - i);
      ctx.fillStyle = i % 2 ? '#f4f4f0' : '#e85a2a';
      ctx.fillRect(Math.round(sx), Math.round(sy), 5, 5 - i);
    }
  }
  if (p.type === 'radar') {
    const a = t * 1.6;
    const cx = x + W(p) / 2;
    const cy = y - 4;
    const half = 22 * Math.cos(a);
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(cx - Math.abs(half)) - 1, cy - 4, Math.round(Math.abs(half) * 2) + 2, 8);
    ctx.fillStyle = half > 0 ? '#e8ecf0' : '#9aa0a8';
    ctx.fillRect(Math.round(cx - Math.abs(half)), cy - 3, Math.round(Math.abs(half) * 2), 6);
    ctx.fillStyle = '#5a5e66';
    ctx.fillRect(Math.round(cx) - 1, cy - 3, 2, 6);
  }
  if (p.type === 'control_tower' || p.type === 'launch_tower' || p.type === 'test_stand') {
    // the beacon on top: white-green at the tower, red on the service tower and the test stand
    const on = (Math.floor(t * 1.5 + p.x) % 2) === 0;
    if (on || p.type !== 'control_tower') {
      const top = p.type === 'control_tower' ? -150 : p.type === 'launch_tower' ? -402 : -42;
      const bx = x + (p.type === 'launch_tower' ? W(p) / 2 : p.type === 'control_tower' ? W(p) / 2 : W(p) / 2);
      const c = p.type === 'control_tower' ? (Math.floor(t * 1.5) % 4 < 2 ? '#f4f4e0' : '#3fe07a') : (Math.floor(t * 2 + p.y) % 2 ? '#ff3a2a' : '#6a1a14');
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(bx) - 2, y + top - 2, 4, 3);
      if (opts.night) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(bx, y + top, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
  if (p.type === 'runway_sign') {
    ctx.save();
    ctx.fillStyle = '#e8c040';
    ctx.font = 'bold 7px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text || 'A', x + 16, y + 5, 28);
    ctx.restore();
  }
  if (p.type === 'runway_light' && opts.night) {
    const c = { green: '63,224,122', red: '255,74,58', white: '244,240,216' }[p.color] || '244,220,140';
    const pulse = p.color === 'white' ? 0.5 + 0.5 * Math.max(0, Math.sin(t * 6 - p.x * 0.5)) : 1;
    ctx.fillStyle = `rgba(${c},${0.22 * pulse})`;
    ctx.beginPath(); ctx.arc(x + 16, y + 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${c},${0.9 * pulse})`;
    ctx.fillRect(x + 14, y + 13, 4, 2);
  }
  if (p.type === 'gantry') {
    // the trolley crawls along the girder and back, hook swinging
    const w = W(p);
    const f = 0.5 + 0.5 * Math.sin(t * 0.08 + p.x);
    const tx = x + 12 + f * (w - 40);
    ctx.fillStyle = INK; ctx.fillRect(Math.round(tx) - 1, y - 69, 18, 12);
    ctx.fillStyle = '#e8a040'; ctx.fillRect(Math.round(tx), y - 68, 16, 10);
    const sw = Math.sin(t * 0.9) * 3;
    ctx.fillStyle = '#4a4e56'; ctx.fillRect(Math.round(tx + 7 + sw * 0.3), y - 58, 2, 34);
    ctx.fillStyle = '#c8a040'; ctx.fillRect(Math.round(tx + 5 + sw), y - 24, 6, 5);
  }
}

// ------------------------------------------------------------------ props drawn from the simulation
// Their look comes from `opts.aero` (Aerospace.propView): the sprite is cached per view key, so a
// bay is repainted only when its unit moves on a stage.
const fitScale = (cw, ch, w, h) => Math.min(1, w / cw, h / ch);
function blit(ctx, img, cx, cy, scale = 1, heading = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(cx), Math.round(cy));
  if (heading) ctx.rotate(heading);
  ctx.drawImage(img, Math.round(-img.width * scale / 2), Math.round(-img.height * scale / 2), Math.round(img.width * scale), Math.round(img.height * scale));
  ctx.restore();
}

Object.assign(AERO_PAINTERS, {
  aircraft: {
    view: true,
    box: (p, v) => {
      const w = W(p);
      const h = H(p);
      const d = v?.heading ? Math.ceil(Math.hypot(w, h)) : 0;
      return d ? [Math.floor((w - d) / 2), Math.floor((h - d) / 2), Math.ceil((w + d) / 2), Math.ceil((h + d) / 2)] : [0, 0, w, h];
    },
    shadow: [8, 6],
    paint(k, p, v, o) {
      const view = o.view;
      // chocks at the nose wheel and the mains, and a tie-down line (under the aircraft; a wreck sits on its belly)
      const w = W(p);
      const h = H(p);
      if (!view?.wreck) for (const [x, y] of [[w / 2 - 3, h * 0.12], [w * 0.32, h * 0.52], [w * 0.68 - 6, h * 0.52]]) { k.R(x, y, 6, 3, '#e8c040'); k.R(x, y + 3, 6, 1, '#8a6a20'); }
      else k.R(w * 0.2, h * 0.9, w * 0.6, 2, 'rgba(60,50,40,0.5)');
      if (!view?.look) return;
      const img = aircraftCanvas(view.look, { livery: view.livery, wreck: view.wreck });
      if (img) blit(k.ctx, img, W(p) / 2, H(p) / 2, 1, view.heading || 0);
    },
  },
  bay_slot: {
    view: true,
    box: (p) => [0, -40, W(p), H(p)],
    shadow: [0, 0],
    paint(k, p, v, o) {
      const { R, ctx } = k;
      const w = W(p);
      const h = H(p);
      const view = o.view || {};
      // the bay floor: a hazard-striped border, tie-down points, a bay number
      for (let x = 0; x < w; x += 8) { R(x, 0, 4, 3, '#e8c040'); R(x + 4, 0, 4, 3, '#1e1e24'); R(x, h - 3, 4, 3, '#e8c040'); R(x + 4, h - 3, 4, 3, '#1e1e24'); }
      for (let y = 0; y < h; y += 8) { R(0, y, 3, 4, '#e8c040'); R(0, y + 4, 3, 4, '#1e1e24'); R(w - 3, y, 3, 4, '#e8c040'); R(w - 3, y + 4, 3, 4, '#1e1e24'); }
      for (let x = 24; x < w - 8; x += 32) for (let y = 24; y < h - 8; y += 32) R(x, y, 2, 2, '#5a5e66');
      if (view.closed) { R(6, 6, w - 12, h - 12, 'rgba(20,20,30,0.25)'); return; }
      if (!view.kind) {
        // empty: the jigs stand idle
        for (const [jx, jy] of [[10, 12], [w - 22, 12], [10, h - 26], [w - 22, h - 26]]) { R(jx, jy, 12, 12, '#8a8e96'); R(jx, jy, 12, 2, '#b8bcc0'); R(jx + 4, jy - 18, 4, 18, '#c8a040'); }
        return;
      }
      const cx = w / 2;
      const cy = h / 2;
      if (view.kind === 'aircraft') {
        const img = aircraftCanvas(view.look, { livery: view.livery, build: view.build });
        if (img) {
          const s = fitScale(img.width, img.height, w - 16, h - 12);
          // jacks under the airframe, then the airframe
          for (const [dx, dy] of [[-0.3, -0.1], [0.3, -0.1], [0, 0.32]]) R(cx + dx * img.width * s - 4, cy + dy * img.height * s - 4, 8, 8, '#c8a040');
          blit(ctx, img, cx, cy, s);
        }
        // work platforms either side while it's being built
        if (!view.done) for (const side of [-1, 1]) { const px = side < 0 ? 6 : w - 20; R(px, cy - 30, 14, 60, '#e8a040'); R(px, cy - 30, 14, 2, '#f8c860'); for (let y = cy - 26; y < cy + 30; y += 8) R(px + 2, y, 10, 1, '#8a6020'); R(px + 4, cy - 36, 2, 8, '#8a6020'); }
      } else if (view.kind === 'rocket' || view.kind === 'missile') {
        const img = rocketCanvas(view.look, { lying: true, stages: view.stages, secure: view.kind === 'missile' });
        if (img) {
          const s = fitScale(img.width, img.height, w - 12, h - 20);
          for (let f = 0.2; f < 0.9; f += 0.3) { const x = cx - img.width * s / 2 + img.width * s * f; R(x - 6, cy - 4, 12, img.height * s / 2 + 10, '#5a5e66'); R(x - 6, cy + img.height * s / 2 + 2, 12, 4, '#3a3e46'); }
          blit(ctx, img, cx, cy, s);
          if (view.kind === 'missile') {
            // under a tarpaulin: what it is is the agency's business
            R(cx - img.width * s * 0.42, cy - img.height * s * 0.7, img.width * s * 0.84, img.height * s * 1.4, '#4a5a3a');
            R(cx - img.width * s * 0.42, cy - img.height * s * 0.7, img.width * s * 0.84, 2, '#6a7a5a');
            for (let x = cx - img.width * s * 0.4; x < cx + img.width * s * 0.4; x += 16) R(x, cy - img.height * s * 0.7, 1, img.height * s * 1.4, '#3a4a2a');
          }
        }
      } else if (view.kind === 'satellite') {
        const img = satelliteCanvas(view.look, { panels: view.panels, bare: view.bare });
        if (img) {
          R(cx - 14, cy + 4, 28, 14, '#8a8e96'); R(cx - 14, cy + 4, 28, 2, '#b8bcc0'); // the test stand
          blit(ctx, img, cx, cy - 4, Math.min(2, (w - 8) / img.width));
        }
      } else if (view.kind === 'stack') {
        const img = rocketCanvas(view.look, { stages: 1 });
        if (img) {
          const s = Math.min(1, (h + 30) / img.height * 1.2);
          blit(ctx, img, cx, h - img.height * s / 2 - 4, s);
        }
      }
      // the stage board: a lamp per stage, lit up to where the unit has reached
      const n = view.stagesTotal || 0;
      for (let i = 0; i < n; i++) R(6 + i * 5, h - 10, 4, 4, i < view.stageIndex ? '#3fe07a' : i === view.stageIndex ? '#e8c040' : '#3a3e46');
    },
  },
  launch_pad: {
    view: true,
    box: (p) => [0, -420, W(p), H(p)],
    shadow: [0, 0],
    paint(k, p, v, o) {
      const { R } = k;
      const w = W(p);
      const h = H(p);
      const view = o.view || {};
      if (view.site) {
        // a staked-out site: packed gravel, corner stakes, a faded outline of the pad to come
        for (let i = 0; i < 60; i++) R((i * 53) % w, (i * 97) % h, 3, 2, '#8a8478');
        for (let x = 0; x < w; x += 12) { R(x, 0, 6, 2, '#c8402a'); R(x, h - 2, 6, 2, '#c8402a'); }
        for (let y = 0; y < h; y += 12) { R(0, y, 2, 6, '#c8402a'); R(w - 2, y, 2, 6, '#c8402a'); }
        for (const [sx, sy] of [[2, 2], [w - 6, 2], [2, h - 6], [w - 6, h - 6]]) { R(sx, sy - 10, 3, 12, '#c8a060'); R(sx + 3, sy - 10, 4, 3, '#ff7a2a'); }
        return;
      }
      // the deck, the flame trench (scorched), deluge rails and tie-down points
      R(0, 0, w, h, '#9a9c98'); R(0, 0, w, 2, '#b8bab6');
      for (let x = 0; x < w; x += 32) R(x, 0, 1, h, '#8a8c88');
      for (let y = 0; y < h; y += 32) R(0, y, w, 1, '#8a8c88');
      R(w / 2 - 34, h / 2 - 20, 68, h / 2 + 20, '#2a2a2e');
      R(w / 2 - 34, h / 2 - 20, 68, 4, '#4a4a4e');
      for (let i = 0; i < 40; i++) R(w / 2 - 50 + (i * 37) % 100, h / 2 - 30 + (i * 53) % 40, 6, 3, 'rgba(20,18,16,0.4)');
      for (const x of [w / 2 - 44, w / 2 + 40]) R(x, h / 2 - 34, 4, 70, '#5a7a9a');
      R(w / 2 - 22, h / 2 - 34, 44, 8, '#5a5e66'); // the launch mount
      if (view.rocket) {
        const img = rocketCanvas(view.rocket, { stages: view.stages ?? 1 });
        if (img) blit(k.ctx, img, w / 2, h / 2 - 30 - img.height / 2, 1);
      }
    },
  },
});

/** The live bits that depend on the simulation: the pad venting, sparks in a busy bay. */
export function aeroLiveView(ctx, p, opts) {
  const v = opts.aero;
  if (!v) return;
  const t = opts.time || 0;
  const x = Math.round(p.x * T);
  const y = Math.round(p.y * T);
  if (p.type === 'launch_pad' && v.rocket && v.venting) {
    // liquid oxygen boiling off: white plumes from the rocket's flanks
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.6 + i / 6) % 1;
      const r = 6 + ph * 18;
      ctx.fillStyle = `rgba(240,244,248,${0.45 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + W(p) / 2 + (i % 2 ? 1 : -1) * (14 + ph * 26), y + H(p) / 2 - 30 - v.rocket.h * T * (0.3 + 0.1 * (i % 3)) + ph * 30, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.type === 'bay_slot' && v.kind && !v.done && opts.night !== undefined) {
    // a welder somewhere on the airframe
    const k = Math.floor(t * 3) % 7;
    if (k < 3) {
      const sx = x + W(p) * (0.3 + 0.4 * hashi(Math.floor(t * 3 / 7), p.x));
      const sy = y + H(p) * (0.3 + 0.4 * hashi(p.y, Math.floor(t * 3 / 7)));
      ctx.fillStyle = 'rgba(160,220,255,0.35)'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4fbff'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffd860'; ctx.fillRect(Math.round(sx + Math.cos(t * 20 + i) * (4 + i * 2)), Math.round(sy + Math.sin(t * 20 + i) * 3 + i), 1, 1); }
    }
  }
}
