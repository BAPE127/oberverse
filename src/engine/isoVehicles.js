// Vehicles with volume in the isometric view (docs/RENDERING.md 2.2, phase 5): sprite stacking.
//
// The existing top-down sprite for a model, colour, heading and lamp state is taken as the footprint of a
// solid. Each flat pixel stands up to its own height (a tyre, the body, the roof; the screen and rear glass
// slope between body and roof) and is seen the way the ground transform sees it: the top of every column
// keeps the sprite's colour, the sides below it are the same colour darkened. The result is one canvas per
// model + colour + heading + state (an LRU), laid down at the projected centre of the car.
//
// Signature cars and tractors animate (fountains, wheels, trails of their own) so they cannot be cached:
// their live drawing is made flat into a scratch canvas every frame and stood up to a uniform height.
//
// Pure painting: it reads, it never changes a record.
import { carSpriteFor, spriteHeights, carHeights } from './carSprites.js';
import { drawCar } from './drawVehicles.js';

const MAX_STACKS = 220;
const lru = new Map();

const canMake = () => typeof document !== 'undefined' && typeof ImageData !== 'undefined';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const DARK_LO = 0.5; // the foot of a side
const DARK_HI = 0.74; // just under the top edge

/** ABGR pixel scaled toward black by f. */
const dim = (c, f) => ((c & 0xff000000) | (Math.round(((c >>> 16) & 255) * f) << 16) | (Math.round(((c >>> 8) & 255) * f) << 8) | Math.round((c & 255) * f)) >>> 0;

/**
 * Stand a flat sprite up. `flat` is a W × W ABGR array (alpha > 0 where the body is); `hp[i]` its heights;
 * `src[i]` (or null) the pixel whose colour the side takes; `under` an optional W × W array drawn flat on
 * the ground where nothing stands (the shadow). Returns { out (ABGR, w × h), w, h, ox, oy }: the flat centre sits at (ox, oy).
 * Pure: runs in Node.
 */
export function stackBuffer(flat, hp, src, under, W, Hmax) {
  const OX = W;
  const OY = Hmax;
  const w = W * 2;
  const h = W + Hmax + 1;
  const out = new Uint32Array(w * h);
  // M[u, v] = the best (height - k) along the sight line (u + k, v + k): a negative value means nothing stands
  // over that ground point, so the common empty pixel costs one lookup (the grid is padded by Hmax on the low side)
  const P = Hmax;
  const Wp = W + P;
  const M = new Int16Array(Wp * Wp).fill(-1000);
  for (let v = W - 1; v >= -P; v--) {
    for (let u = W - 1; u >= -P; u--) {
      const here = u >= 0 && v >= 0 && hp[v * W + u] > 0 ? hp[v * W + u] : -1000;
      const next = u + 1 < W && v + 1 < W ? M[(v + 1 + P) * Wp + u + 1 + P] - 1 : -1000;
      M[(v + P) * Wp + u + P] = here > next ? here : next;
    }
  }
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const xx = (px + 0.5 - OX) / 2;
      const yy = py + 0.5 - OY;
      const u0 = Math.floor(yy + xx);
      const v0 = Math.floor(yy - xx);
      if (u0 < -P || v0 < -P || u0 >= W || v0 >= W || M[(v0 + P) * Wp + u0 + P] < 0) {
        if (under) {
          if (u0 >= 0 && v0 >= 0 && u0 < W && v0 < W && under[v0 * W + u0]) out[py * w + px] = under[v0 * W + u0];
        }
        continue;
      }
      let col = 0;
      for (let k = Hmax; k >= 0; k--) {
        const u = u0 + k;
        const v = v0 + k;
        if (u < 0 || v < 0 || u >= W || v >= W) continue;
        const i = v * W + u;
        const ph = hp[i];
        if (ph < k || ph === 0) continue;
        if (ph === k) col = flat[i];
        else {
          const sc = src && src[i] >= 0 ? flat[src[i]] : flat[i];
          col = dim(sc, DARK_LO + (DARK_HI - DARK_LO) * (k / ph));
        }
        break;
      }
      if (!col && under && u0 >= 0 && v0 >= 0 && u0 < W && v0 < W) col = under[v0 * W + u0];
      if (col) out[py * w + px] = col;
    }
  }
  return { out, w, h, ox: OX, oy: W / 2 + OY };
}

/** The same, as a canvas: { cv, ox, oy }. */
export function stackPixels(flat, hp, src, under, W, Hmax) {
  const b = stackBuffer(flat, hp, src, under, W, Hmax);
  const cv = mk(b.w, b.h);
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(b.out.buffer), b.w, b.h), 0, 0);
  return { cv, ox: b.ox, oy: b.oy };
}

const data32 = (cv) => new Uint32Array(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.buffer);

/** The cached stack for an ordinary car or a bus (null where sprites can't be made). */
function cachedStack(model, angle, opts) {
  const got = carSpriteFor(model, angle, opts);
  if (!got) return null;
  const bus = model.body === 'bus';
  const number = bus ? String(opts.number || '1') : '';
  const key = bus ? `${got.key}|${number}` : got.key;
  let st = lru.get(key);
  if (st) { lru.delete(key); lru.set(key, st); return st; }
  const { s, idx } = got;
  spriteHeights(model, s, idx);
  let flatCv = s.cv;
  if (bus) {
    // the route number in its plate behind the windscreen, on the roof
    flatCv = mk(s.cv.width, s.cv.height);
    const c = flatCv.getContext('2d');
    c.drawImage(s.cv, 0, 0);
    c.translate(s.half, s.half);
    c.rotate((idx / 64) * Math.PI * 2);
    const len = model.len;
    c.fillStyle = '#1b1a24';
    c.fillRect(len / 2 - 22, -8, 12, 16);
    c.fillStyle = opts.color || model.colors?.[0] || '#2f6b4f';
    c.fillRect(len / 2 - 21, -7, 10, 14);
    c.rotate(Math.PI / 2);
    c.fillStyle = '#ffffff';
    c.font = 'bold 10px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(number, 0, -(len / 2 - 16));
  }
  const W = s.cv.width;
  const flat = data32(flatCv);
  // the shadow: the silhouette, dark, down and to the right
  const sh = data32(s.shadow);
  const under = new Uint32Array(W * W);
  for (let y = 0; y < W - 4; y++) for (let x = 0; x < W - 4; x++) if (sh[y * W + x] >>> 24) under[(y + 4) * W + x + 4] = (77 << 24) | 0x240e10;
  const H = carHeights(model);
  const stack = stackPixels(flat, s.hp, s.src, under, W, H.cabin);
  st = { ...stack, up: H.cabin };
  lru.set(key, st);
  while (lru.size > MAX_STACKS) lru.delete(lru.keys().next().value);
  return st;
}

let scratch = null;
const live = new Map(); // car + heading bucket → { st, at }: a live drawing is stood up again only every 50 ms
const LIVE_EVERY = 0.05;

/** A signature car or tractor: drawn live, flat, then stood up to one height (re-made at most twenty times a second). */
function liveStack(model, angle, opts) {
  const key = `${opts.id || model.name || model.len}|${Math.round((angle / (Math.PI * 2)) * 64)}`;
  const now = opts.time ?? 0;
  const hit = live.get(key);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 7;
  if (hit && now - hit.at < LIVE_EVERY + h * 0.008 && now >= hit.at) return hit.st; // (a little different for each car, so they don't all fall due in one frame)
  const R = Math.ceil(Math.hypot(model.len, model.wid) / 2) + 40;
  const W = R * 2;
  scratch = scratch || mk(W, W);
  if (scratch.width !== W) { scratch.width = W; scratch.height = W; }
  const c = scratch.getContext('2d', { willReadFrequently: true });
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, W);
  drawCar(c, model, R, R, angle, opts);
  const flat = new Uint32Array(c.getImageData(0, 0, W, W).data.buffer);
  const hp = new Uint8Array(W * W);
  const under = new Uint32Array(W * W);
  const body = Math.max(6, Math.min(14, Math.round(model.wid * 0.32)));
  for (let i = 0; i < flat.length; i++) {
    const a = flat[i] >>> 24;
    if (a >= 200) { hp[i] = body; flat[i] = (flat[i] | 0xff000000) >>> 0; } else if (a > 8) { under[i] = flat[i]; flat[i] = 0; } else flat[i] = 0;
  }
  const stack = stackPixels(flat, hp, null, under, W, body);
  const st = { ...stack, up: body };
  live.set(key, { st, at: now });
  if (live.size > 40) live.delete(live.keys().next().value);
  return st;
}

/**
 * Draw a vehicle with volume. `ctx` has the plain screen transform (renderer.setScreen); (wx, wy) is the car's
 * centre in the layer-adjusted world; `model` is a vehicles-content model (or { body: 'bus', len, wid }).
 * opts as for drawCar, plus `number` for the bus. Returns the height in px (for the sort rectangle).
 */
export function drawVehicleIso(ctx, model, wx, wy, angle, opts = {}) {
  const liveOne = model.body === 'tractor' || model.sig;
  const st = canMake() ? (liveOne ? liveStack(model, angle, opts) : cachedStack(model, angle, opts)) : null;
  const px = Math.round(wx - wy);
  const py = Math.round((wx + wy) / 2);
  if (!st) return 16;
  if (opts.braking) { // the glow of the brake lights on the road behind
    const bx = wx - Math.cos(angle) * (model.len / 2 + 3);
    const by = wy - Math.sin(angle) * (model.len / 2 + 3);
    ctx.fillStyle = 'rgba(255,60,40,0.18)';
    ctx.beginPath();
    ctx.ellipse(Math.round(bx - by), Math.round((bx + by) / 2), 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(st.cv, px - st.ox, py - st.oy);
  return st.up;
}

const painted = new Map();
let paintScratch = null;
const PAINT_R = 128; // the largest machine (half-extent, px) that is stood up; bigger ones stay flat

/**
 * Anything painted flat by `paint(ctx, cx, cy)` (centred, nose any way) and still: stood up to `height` px, made once per `key`.
 * Returns false when it is too big (the caller draws it flat). Used for the company's parked machines at Hollowmoor.
 */
export function drawPaintedIso(ctx, key, wx, wy, paint, height = 10) {
  if (!canMake()) return false;
  let st = painted.get(key);
  if (st === undefined) {
    const N = PAINT_R * 2;
    paintScratch = paintScratch || mk(N, N);
    const c = paintScratch.getContext('2d', { willReadFrequently: true });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, N, N);
    paint(c, PAINT_R, PAINT_R);
    const raw = new Uint32Array(c.getImageData(0, 0, N, N).data.buffer);
    let ext = 0;
    for (let i = 0; i < raw.length; i++) if (raw[i] >>> 24) ext = Math.max(ext, Math.abs((i % N) - PAINT_R), Math.abs(((i / N) | 0) - PAINT_R));
    if (ext >= PAINT_R - 2) st = null; // touches the edge: too big
    else {
      const W = (ext + 6) * 2; // crop to the machine
      const flat = new Uint32Array(W * W);
      const hp = new Uint8Array(W * W);
      const under = new Uint32Array(W * W);
      const o = PAINT_R - W / 2;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const v = raw[(y + o) * N + x + o];
        const a = v >>> 24;
        if (a >= 200) { flat[y * W + x] = v; hp[y * W + x] = height; } else if (a > 8) under[y * W + x] = v;
      }
      st = { ...stackPixels(flat, hp, null, under, W, height), up: height };
    }
    painted.set(key, st);
    while (painted.size > 40) painted.delete(painted.keys().next().value);
  }
  if (!st) return false;
  ctx.drawImage(st.cv, Math.round(wx - wy) - st.ox, Math.round((wx + wy) / 2) - st.oy);
  return true;
}

/** For the tests and the profiler: how many stacks are cached. */
export const stackCacheSize = () => lru.size;
