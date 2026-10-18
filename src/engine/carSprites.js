// Cars (v0.50.0, the art overhaul's phase 5): every ordinary car and the bus is drawn pixel by
// pixel at its heading, not a picture turned round — so it stays crisp at any angle — and lit
// from the top left of the world, the same as everything else: the edges of the body and the
// cabin facing the light catch it, the ones turned away go dark, and the glass glints along the
// world's diagonal however the car is pointing.
//
// A car is described in its own coordinates (u along it, nose positive; v across it, its right
// positive): a body with rounded corners and a bevelled edge, a cabin raised on it (glass at the
// front and back, side windows, pillars, the roof), bumpers, lamps, mirrors, tyres; a pickup's
// bed, a police car's light bar and doors, a coupé's stripes, the bus's windows and roof units.
// Each heading (64 of them), colour and lamp state is a sprite made once; the outline is traced
// and the shadow is the silhouette, flat and dark, down and to the right.

const INK = '#1b1a24';
const STEPS = 64;
const LIGHT = [-0.6, -0.8]; // from the top left

const rgb = (h) => {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const pack = (r, g, b) => ((255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0))) >>> 0;
const lit = (c, k) => (k >= 0 ? pack(c[0] + (255 - c[0]) * k, c[1] + (250 - c[1]) * k, c[2] + (235 - c[2]) * k) : pack(c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)));

/** Cabin layout by body style, as fractions of the length from the tail: [rear glass, roof, windscreen, bonnet]. */
const LAYOUT = {
  hatch: [0.07, 0.17, 0.56, 0.69],
  estate: [0.05, 0.11, 0.6, 0.71],
  pickup: [0.43, 0.48, 0.63, 0.73],
  saloon: [0.2, 0.32, 0.58, 0.7],
  gt: [0.2, 0.31, 0.5, 0.64],
  coupe: [0.22, 0.33, 0.52, 0.66],
  limo: [0.12, 0.2, 0.67, 0.76],
  police: [0.2, 0.32, 0.58, 0.7],
  bus: [0.02, 0.04, 0.92, 0.985],
};

/** What is at (u, v) on a car: a material and the surface's slope (outward, in car coordinates). */
function surface(m, u, v) {
  const L = m.len;
  const W = m.wid;
  const hl = L / 2;
  const hw = W / 2;
  const t = (u + hl) / L; // 0 at the tail, 1 at the nose
  const lay = LAYOUT[m.body] || LAYOUT.saloon;
  const bus = m.body === 'bus';
  // tyres stick out a little past the body at the wheel arches
  const wheelU = [-hl + (bus ? 22 : 15), hl - (bus ? 26 : 17)];
  for (const wu of wheelU) if (Math.abs(u - wu) < (bus ? 8 : 6.5) && Math.abs(v) > hw - 4 && Math.abs(v) <= hw + 1.2) return { mat: 'tyre', nu: 0, nv: Math.sign(v) * 0.5 };
  // mirrors
  const mirU = -hl + L * lay[2] + 2;
  if (!bus && Math.abs(u - mirU) < 2 && Math.abs(v) > hw && Math.abs(v) <= hw + 2.5) return { mat: 'mirror', nu: 0, nv: Math.sign(v) };
  // the body: a rounded rectangle
  const rc = bus ? 6 : t > 0.5 ? 7 : 5;
  const du = hl - Math.abs(u);
  const dv = hw - Math.abs(v);
  if (du < 0 || dv < 0) return null;
  let edge = Math.min(du, dv);
  let nu = du < dv ? Math.sign(u) : 0;
  let nv = du < dv ? 0 : Math.sign(v);
  if (du < rc && dv < rc) {
    const cu = du - rc;
    const cv = dv - rc;
    const r = Math.hypot(cu, cv);
    if (r > rc) return null;
    edge = rc - r;
    nu = (-cu / (r || 1)) * Math.sign(u);
    nv = (-cv / (r || 1)) * Math.sign(v);
  }
  // bumpers and lamps
  if (du < 2.5) {
    const front = u > 0;
    if (Math.abs(v) > hw - 10 && Math.abs(v) < hw - 2.5) return { mat: front ? 'headlamp' : 'taillamp', nu, nv };
    return { mat: 'bumper', nu, nv };
  }
  const bev = edge < 3 ? (3 - edge) / 3 : 0; // the bevelled edge of the body
  const cabin = t > lay[0] && t < lay[3];
  const cw = hw - (bus ? 1.5 : 4); // the cabin's half width
  if (cabin && Math.abs(v) < cw) {
    const ce = Math.min(cw - Math.abs(v), (t - lay[0]) * L, (lay[3] - t) * L);
    const cb = ce < 2 ? (2 - ce) / 2 : 0;
    const cnu = (t - lay[0]) * L < (lay[3] - t) * L ? -1 : 1;
    const cdir = cw - Math.abs(v) < Math.min((t - lay[0]) * L, (lay[3] - t) * L) ? [0, Math.sign(v)] : [cnu, 0];
    if (bus) {
      if (t > lay[2]) return { mat: 'glass', nu: 0.3, nv: 0, cb };
      if (Math.abs(v) > cw - 4 && ((t * L) % 16) > 3) return { mat: 'glass', nu: 0, nv: Math.sign(v) * 0.4 };
      return { mat: 'roof', nu: cdir[0] * cb, nv: cdir[1] * cb, raised: true };
    }
    if (t < lay[1]) return { mat: m.body === 'pickup' ? 'glass' : 'glass', nu: -0.5, nv: 0 }; // the rear glass
    if (t > lay[2]) return { mat: 'glass', nu: 0.5, nv: 0 }; // the windscreen
    // side windows down the cabin's edges, pillars between them
    if (Math.abs(v) > cw - 3) {
      const span = (lay[2] - lay[1]) * L;
      const k = (t - lay[1]) * L;
      const pillar = k < 2 || k > span - 2 || (m.body === 'limo' ? Math.abs(k - span / 3) < 1.2 || Math.abs(k - (2 * span) / 3) < 1.2 : Math.abs(k - span / 2) < 1.2);
      if (!pillar) return { mat: 'glass', nu: 0, nv: Math.sign(v) * 0.6 };
    }
    return { mat: 'roof', nu: cdir[0] * cb, nv: cdir[1] * cb, raised: true };
  }
  if (m.body === 'pickup' && t > 0.03 && t < lay[0] - 0.01 && Math.abs(v) < hw - 3) {
    const ribs = Math.round(Math.abs(v)) % 5 === 0;
    return { mat: ribs ? 'bedrib' : 'bed', nu: 0, nv: 0 };
  }
  return { mat: 'body', nu: nu * bev, nv: nv * bev, bev };
}

function rasterise(m, a, colour, o) {
  const L = m.len;
  const W = m.wid;
  const S = Math.ceil(Math.hypot(L, W)) + 6;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const base = rgb(colour);
  const roofC = m.body === 'bus' ? rgb('#ece4d0') : base;
  const glass = rgb('#22344a');
  const img = new ImageData(S, S);
  const out = new Uint32Array(img.data.buffer);
  const c = S / 2;
  const police = m.body === 'police';
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const dx = px + 0.5 - c;
      const dy = py + 0.5 - c;
      const u = dx * ca + dy * sa;
      const v = -dx * sa + dy * ca;
      const s = surface(m, u, v);
      if (!s) continue;
      // the slope, turned into the world, against the light
      const nx = s.nu * ca - s.nv * sa;
      const ny = s.nu * sa + s.nv * ca;
      const l = nx * LIGHT[0] + ny * LIGHT[1];
      // a soft sheen across the paint, brightest toward the light
      const sheen = Math.max(-1, Math.min(1, -(dx + dy) / (L * 0.55))) * 0.07;
      let col;
      switch (s.mat) {
        case 'tyre': col = pack(30, 28, 36); if (l > 0.1) col = pack(58, 56, 66); break;
        case 'mirror': col = lit(base, -0.25 + l * 0.3); break;
        case 'bumper': col = lit(m.body === 'bus' ? rgb('#4a4a52') : base, -0.45 + l * 0.25); break;
        case 'headlamp': col = o.lit ? pack(255, 255, 255) : pack(255, 244, 192); break;
        case 'taillamp': col = o.braking ? pack(255, 74, 58) : pack(184, 40, 30); break;
        case 'bed': col = lit(base, -0.5); break;
        case 'bedrib': col = lit(base, -0.62); break;
        case 'glass': {
          // dark glass; a glint along the world's diagonal, brighter where it faces the light
          const g = (px - c) - (py - c); // the world's diagonal, through the car's middle
          const glint = (g > -14 && g < -11) || (g > -8 && g < -7) || (g > 12 && g < 14);
          col = glint ? pack(150, 204, 228) : lit(glass, 0.08 + l * 0.35);
          break;
        }
        case 'roof': {
          let k = 0.12 + l * 0.5 + sheen;
          if (police) col = lit(rgb('#e8e2d4'), k);
          else col = lit(roofC, k);
          break;
        }
        default: {
          // paint: lit edges toward the light, a soft sheen, a crease down the bonnet
          let k = (s.bev ? l * 0.55 : 0) + 0.04 + sheen;
          const t = (u + L / 2) / L;
          const lay = LAYOUT[m.body] || LAYOUT.saloon;
          if (t > lay[3] && Math.abs(v) < 1) k -= 0.12;
          if (police && Math.abs(v) > W / 2 - 6 && t > lay[1] - 0.05 && t < lay[2] + 0.05) col = lit(rgb('#1e2a3a'), k);
          else col = lit(base, k);
          if (m.stripes && Math.abs(Math.abs(v) - 3) < 1.6) col = lit(rgb('#f8f8f0'), k * 0.5);
          if (m.body === 'bus' && Math.abs(v) < W / 2 - 2) col = lit(roofC, k);
        }
      }
      out[py * S + px] = col;
    }
  }
  return { img, S };
}

const cache = new Map();
const canMake = () => typeof document !== 'undefined' && typeof ImageData !== 'undefined';

function make(m, idx, colour, o) {
  const a = (idx / STEPS) * Math.PI * 2;
  const { img, S } = rasterise(m, a, colour, o);
  const body = document.createElement('canvas');
  body.width = S + 2;
  body.height = S + 2;
  body.getContext('2d').putImageData(img, 1, 1);
  // police light bar, across the roof's middle
  if (m.body === 'police') {
    const bc = body.getContext('2d');
    const lay = LAYOUT.police;
    const mu = -m.len / 2 + m.len * ((lay[1] + lay[2]) / 2);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let v = -m.wid / 2 + 6; v < m.wid / 2 - 6; v += 0.5) for (let du = -2; du <= 2; du += 0.5) {
      const u = mu + du;
      const x = u * ca - v * sa + S / 2 + 1;
      const y = u * sa + v * ca + S / 2 + 1;
      bc.fillStyle = Math.abs(du) > 1.5 ? INK : v < 0 ? (o.siren === 1 ? '#ff3a3a' : '#8a2020') : (o.siren === 2 ? '#4a7aff' : '#20307a');
      bc.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
  }
  const out = document.createElement('canvas');
  out.width = S + 2;
  out.height = S + 2;
  const oc = out.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) oc.drawImage(body, dx, dy);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = INK;
  oc.fillRect(0, 0, S + 2, S + 2);
  oc.globalCompositeOperation = 'source-over';
  oc.drawImage(body, 0, 0);
  const sh = document.createElement('canvas');
  sh.width = S + 2;
  sh.height = S + 2;
  const sc = sh.getContext('2d');
  sc.drawImage(out, 0, 0);
  sc.globalCompositeOperation = 'source-in';
  sc.fillStyle = 'rgb(16,14,36)';
  sc.fillRect(0, 0, S + 2, S + 2);
  return { cv: out, shadow: sh, half: (S + 2) / 2 };
}

/**
 * Draw a car (or the bus: model { body: 'bus', len, wid }) centred on (x, y), nose along `angle`.
 * opts: color, lit, braking, siren, time. Returns false where sprites can't be made.
 */
export function drawCarSprite(ctx, model, x, y, angle, opts = {}) {
  if (!canMake() || !LAYOUT[model.body]) return false;
  const idx = ((Math.round((angle / (Math.PI * 2)) * STEPS) % STEPS) + STEPS) % STEPS;
  const colour = opts.color || model.colors?.[0] || '#888888';
  const siren = model.body === 'police' && opts.siren ? (Math.sin((opts.time || 0) * 10) > 0 ? 1 : 2) : 0;
  const o = { lit: Boolean(opts.lit), braking: Boolean(opts.braking), siren };
  const key = `${model.body}|${model.len}|${model.wid}|${colour}|${idx}|${o.lit ? 1 : 0}${o.braking ? 1 : 0}${siren}|${model.stripes ? 1 : 0}`;
  let s = cache.get(key);
  if (!s) {
    if (cache.size > 1500) cache.clear();
    s = make({ ...model, stripes: model.stripes ?? model.body === 'coupe' }, idx, colour, o);
    cache.set(key, s);
  }
  const X = Math.round(x) - s.half;
  const Y = Math.round(y) - s.half;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * 0.3;
  ctx.drawImage(s.shadow, X + 4, Y + 4);
  ctx.globalAlpha = ga;
  ctx.drawImage(s.cv, X, Y);
  if (opts.braking) { // the glow of the brake lights on the road behind
    ctx.fillStyle = 'rgba(255,60,40,0.18)';
    const bx = Math.round(x - Math.cos(angle) * (model.len / 2 + 3));
    const by = Math.round(y - Math.sin(angle) * (model.len / 2 + 3));
    ctx.fillRect(bx - 5, by - 5, 10, 10);
  }
  return true;
}

/** For the tests: what lies at (u, v) on a model. */
export const surfaceAt = surface;
