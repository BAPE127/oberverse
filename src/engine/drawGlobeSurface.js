// The world's surface, drawn (v0.28.0): the half-degree land grid
// (src/world/globe.js) baked into a coloured texture — sea shading off the
// coasts, hill-shaded land, a bright coastline, country borders — then shown
// either on a lit sphere (the arms terminal's globe; rendered per pixel, so
// coasts are true shapes, not dots) or flat (Fleet Command's chart).
import { landGrid, D2R, wrapLon } from '../world/globe.js';

const TEX = new Map(); // palette key → texture

/**
 * Which country each land sample belongs to: the nearest capital on the same
 * stretch of land (within 32°), else none. Returns Int8Array of indexes into
 * `ids`, −1 for none / sea.
 */
function countryMap(countries) {
  const { data, w, h, res } = landGrid();
  const ids = Object.keys(countries || {});
  const out = new Int8Array(w * h).fill(-1);
  const caps = ids.map((id) => countries[id]);
  for (let j = 0; j < h; j++) {
    const lat = 90 - j / res;
    const cl = Math.cos(lat * D2R);
    for (let i = 0; i < w; i++) {
      if (data[j * w + i] <= 0) continue;
      const lon = i / res - 180;
      let best = -1;
      let bd = 32;
      caps.forEach((c, k) => {
        const d = Math.hypot(lat - c.lat, wrapLon(lon - c.lon) * cl);
        if (d < bd) { bd = d; best = k; }
      });
      out[j * w + i] = best;
    }
  }
  return { ids, map: out };
}

/**
 * The surface texture for a palette:
 *   { deep, shelf, low, high, coast, border, ice } — [r, g, b] each.
 * Returns { w, h, rgba: Uint8ClampedArray, country: Int8Array, ids }.
 */
export function surfaceTexture(key, pal, countries, sub = 1) {
  if (TEX.has(key)) return TEX.get(key);
  const G = landGrid();
  const base = countries ? countryMap(countries) : { ids: [], map: new Int8Array(G.w * G.h).fill(-1) };
  // `sub` samples per grid cell, bilinear between them (smoother coasts for a zoomable chart)
  const w = G.w * sub;
  const h = (G.h - 1) * sub + 1;
  const data = new Float32Array(w * h);
  const cmap = new Int8Array(w * h);
  for (let j = 0; j < h; j++) {
    const fy = j / sub;
    const j0 = Math.min(G.h - 2, Math.floor(fy));
    const ty = fy - j0;
    for (let i = 0; i < w; i++) {
      const fx = i / sub;
      const i0 = Math.floor(fx) % G.w;
      const i1 = (i0 + 1) % G.w;
      const tx = fx - Math.floor(fx);
      const g = G.data;
      const a = g[j0 * G.w + i0] + (g[j0 * G.w + i1] - g[j0 * G.w + i0]) * tx;
      const b = g[(j0 + 1) * G.w + i0] + (g[(j0 + 1) * G.w + i1] - g[(j0 + 1) * G.w + i0]) * tx;
      data[j * w + i] = a + (b - a) * ty;
      cmap[j * w + i] = base.map[Math.round(fy) * G.w + (Math.round(fx) % G.w)];
    }
  }
  const rgba = new Uint8ClampedArray(w * h * 4);
  const C = { ids: base.ids, map: cmap };
  const e = (j, i) => data[Math.max(0, Math.min(h - 1, j)) * w + ((i % w) + w) % w];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let j = 0; j < h; j++) {
    const lat = 90 - j / (2 * sub);
    for (let i = 0; i < w; i++) {
      const v = e(j, i);
      const k = (j * w + i) * 4;
      let c;
      if (v <= 0) {
        // sea: lighter over the shelf near coasts
        c = mix(pal.shelf, pal.deep, Math.min(1, -v * 3.2));
      } else {
        const coast = e(j - 1, i) <= 0 || e(j + 1, i) <= 0 || e(j, i - 1) <= 0 || e(j, i + 1) <= 0;
        // hill shading: light from the north-west
        const shadeV = (e(j - 2 * sub, i - 2 * sub) - e(j + 2 * sub, i + 2 * sub)) * 0.9;
        const height = Math.min(1, Math.max(0, v - 0.05) * 1.3);
        c = mix(pal.low, pal.high, height);
        c = c.map((x) => x * (1 + Math.max(-0.22, Math.min(0.28, shadeV))));
        if (Math.abs(lat) > 66 && pal.ice) c = mix(c, pal.ice, Math.min(1, (Math.abs(lat) - 66) / 6));
        const me = C.map[j * w + i];
        const border = me >= 0 && pal.border && [[0, 1], [1, 0]].some(([dj, di]) => { const o = C.map[Math.min(h - 1, j + dj) * w + ((i + di) % w)]; return o >= 0 && o !== me; });
        if (border) c = pal.border;
        if (coast) c = pal.coast;
      }
      rgba[k] = c[0]; rgba[k + 1] = c[1]; rgba[k + 2] = c[2]; rgba[k + 3] = 255;
    }
  }
  const t = { w, h, rgba, country: C.map, ids: C.ids, perDeg: 2 * sub };
  TEX.set(key, t);
  return t;
}

/**
 * Draw the textured globe in a circle of radius r at (cx, cy), seen from
 * longitude −rot, tilted by `tilt` degrees (the same projection as the arms
 * terminal's markers). opts: { scale (pixels per sample, default 2),
 * hover (country index to light), light (0–1) }.
 */
export function drawSphere(ctx, tex, cx, cy, r, rot, tilt, opts = {}) {
  const s = opts.scale || 2;
  const n = Math.max(8, Math.ceil((r * 2) / s));
  let cache = drawSphere.cache;
  if (!cache || cache.n !== n) {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : Object.assign(document.createElement('canvas'), { width: n, height: n });
    cache = drawSphere.cache = { n, canvas: c, ctx: c.getContext('2d'), img: c.getContext('2d').createImageData(n, n) };
  }
  const d = cache.img.data;
  const t = tilt * D2R;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const hover = opts.hover ?? -2;
  const { w, h, rgba, country } = tex;
  for (let py = 0; py < n; py++) {
    const y = 1 - ((py + 0.5) / n) * 2;
    for (let px = 0; px < n; px++) {
      const x = ((px + 0.5) / n) * 2 - 1;
      const k = (py * n + px) * 4;
      const rr = x * x + y * y;
      if (rr > 1) { d[k + 3] = 0; continue; }
      const z = Math.sqrt(1 - rr);
      const y0 = y * ct + z * st;
      const z0 = -y * st + z * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, y0))) / D2R;
      const lon = Math.atan2(x, z0) / D2R - rot;
      const j = Math.max(0, Math.min(h - 1, Math.round((90 - lat) * tex.perDeg)));
      const i = ((Math.round((lon + 180) * tex.perDeg) % w) + w) % w;
      const q = (j * w + i) * 4;
      // lit from the upper left; dimmer towards the limb
      const lightK = 0.45 + 0.55 * Math.max(0, z * 0.75 + (-x * 0.3 + y * 0.35));
      const lit = country[j * w + i] === hover ? 1.55 : 1;
      d[k] = rgba[q] * lightK * lit;
      d[k + 1] = rgba[q + 1] * lightK * lit;
      d[k + 2] = rgba[q + 2] * lightK * lit;
      d[k + 3] = rr > 0.985 ? 255 * (1 - (rr - 0.985) / 0.015) : 255;
    }
  }
  cache.ctx.putImageData(cache.img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cache.canvas, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** The texture as a flat (equirectangular) canvas, upscaled `up` times with smooth coasts. */
export function flatCanvas(tex, up = 2) {
  const c = document.createElement('canvas');
  c.width = tex.w;
  c.height = tex.h;
  const x = c.getContext('2d');
  const img = x.createImageData(tex.w, tex.h);
  img.data.set(tex.rgba);
  x.putImageData(img, 0, 0);
  if (up <= 1) return c;
  const big = document.createElement('canvas');
  big.width = tex.w * up;
  big.height = tex.h * up;
  const b = big.getContext('2d');
  b.imageSmoothingEnabled = true;
  b.imageSmoothingQuality = 'high';
  b.drawImage(c, 0, 0, big.width, big.height);
  return big;
}
