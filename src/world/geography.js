// The world's geography (v0.28.0): fictional continents and islands with
// real-looking coastlines. Each landmass is a skeleton — chains of
// [lat, lon, radius°] nodes — "inflated" around its lines, then pushed about
// by domain-warping noise and roughened by fractal noise, so the coasts get
// bays, capes, peninsulas and offshore islands instead of round blobs. Inland
// seas and straits are carved the same way. Archipelagos and scattered ocean
// islands come from high-frequency noise in their own regions. Pure and
// deterministic: the same point always gives the same answer.
//
// elevation(lat, lon) → a signed height: > 0 is land (higher inland and in
// the mountains), < 0 is sea (deeper offshore).

const D2R = Math.PI / 180;
const wrapLon = (d) => ((d + 540) % 360) - 180;

// ------------------------------------------------------------------ noise
const PERM = new Uint8Array(512);
{
  let s = 1337;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const hash = (x, y, z) => PERM[(PERM[(PERM[x & 255] + y) & 255] + z) & 255] / 255;
const fade = (t) => t * t * (3 - 2 * t);
/** Smooth 3D value noise in [0, 1]. */
function vnoise(x, y, z) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  const xf = fade(x - xi); const yf = fade(y - yi); const zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf),
    zf,
  );
}
/** Fractal noise in about [−1, 1] at a point on the unit sphere. */
function fbm(x, y, z, freq, octaves, seed = 0) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += (vnoise(x * freq + seed * 17.1, y * freq + seed * 3.7, z * freq + seed * 9.3) * 2 - 1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// ------------------------------------------------------------------ the landmasses
// [lat, lon, radius in degrees of the coast from the line]; chains are joined node to node.
const LAND = [
  // the western continent (Westreach to Lirre, down the isthmus to Cape Low and Greyhook)
  [[64, -162, 7], [58, -150, 9], [50, -138, 9], [44, -122, 11], [46, -104, 12], [52, -88, 10], [58, -72, 7], [62, -60, 4]],
  [[44, -158, 5], [50, -150, 6]],
  [[46, -104, 12], [38, -92, 9], [38, -80, 6], [44, -72, 5], [48, -64, 3]],
  [[34, -144, 4], [38, -134, 7], [44, -122, 11]],
  [[38, -112, 9], [28, -114, 7], [18, -120, 5], [12, -118, 4], [6, -110, 2.6], [0, -102, 3.5], [-8, -100, 7], [-18, -96, 9], [-28, -96, 8], [-36, -90, 5], [-42, -80, 3.5], [-47, -73, 2]],
  [[-8, -100, 7], [-14, -114, 5], [-18, -124, 3]],
  // the home island (Halvermouth) and its neighbour
  [[52, -27, 3.4], [49, -25, 3], [46, -23, 2.2]],
  [[55, -34, 1.6], [56, -31, 1.2]],
  // Sund: a long northern island of fjords
  [[53, -6, 2.2], [57, -9, 3], [62, -12, 4], [67, -10, 3.5], [71, -7, 2.4]],
  // Pallas
  [[16, -31, 3.5], [11, -35, 4], [5, -38, 2.6], [1, -40, 1.4]],
  // the eastern continent (Ostmark, the northern plains, Varn, Teshvar)
  [[50, 4, 4.5], [55, 14, 7], [58, 24, 7], [66, 36, 9], [64, 54, 11], [60, 76, 13], [56, 100, 12], [50, 118, 9], [44, 128, 6], [38, 132, 3]],
  [[55, 14, 7], [50, 22, 6], [50, 34, 5], [46, 46, 6], [42, 56, 7], [40, 70, 8], [44, 90, 10], [56, 100, 12]],
  [[42, 56, 7], [36, 52, 5], [32, 58, 3.6]],
  [[40, 70, 8], [34, 82, 6], [28, 92, 7], [22, 98, 5], [17, 102, 3]],
  [[44, 90, 10], [36, 108, 7], [28, 112, 4]],
  [[72, 70, 4], [74, 90, 5], [72, 110, 4]],
  // the southern continent (Caldera)
  [[12, 22, 6], [10, 34, 8], [3, 38, 9], [-6, 34, 10], [-14, 30, 8], [-24, 28, 7], [-32, 24, 5], [-36, 20, 2.5]],
  [[10, 34, 8], [10, 44, 4], [9, 50, 2]],
  [[3, 38, 9], [-4, 42, 4]],
  [[-14, 30, 8], [-16, 22, 3.5]],
  // Meridian: a long island
  [[-14, 63, 2], [-19, 64, 2.6], [-24, 62, 1.8]],
  // the south-eastern continent (Coral Sound)
  [[-18, 120, 5], [-24, 126, 7], [-30, 124, 6.5], [-34, 116, 4], [-33, 132, 4], [-28, 134, 3.5]],
  // Southwind Isle, Dunmere's island, Coldwater's cape, Frostbay's arctic island, odd rocks
  [[-54, -6, 1.1]],
  [[22, -5, 2.2], [19, -8, 1.6]],
  [[44, -158, 5], [41, -165, 2.6]],
  [[73, -112, 3.5], [75, -98, 4], [73, -86, 2.5]],
  [[76, -40, 4], [78, -20, 3]],
  [[-74, -120, 6], [-74, -60, 7], [-74, 0, 7], [-74, 60, 7], [-74, 120, 7], [-74, 180, 6]],
];
// inland seas, gulfs and straits carved out of the land
const SEAS = [
  [[63, 30, 3.5], [60, 34, 2.4], [62, 22, 1.6], [66, 18, 1.3], [70, 16, 1.4]], // the Ostmark Sea, out to the north
  [[47, 32, 2.6], [46, 40, 2.8], [42, 38, 2], [38, 34, 1.6], [34, 32, 2]], // the Halden Gulf and Port Varn's sea, to the south
  [[30, 70, 2.4], [32, 64, 2], [28, 76, 2]], // the Kestrel Gulf
  [[-6, 108, 0.1]],
  [[-21, -132, 1.4], [-22, -128, 1]], // Marrow Strait
];
// archipelagos: [lat0, lat1, lon0, lon1, density]
const ARCHIPELAGOS = [
  [-44, -18, 134, 168, 0.62], // the Morrow Isles
  [-12, 8, 96, 140, 0.68], // the Spice Isles
  [14, 30, -78, -56, 0.7], // the Lantern Keys
  [-30, -8, -150, -118, 0.74], // the Marrow reefs
  [56, 70, -60, -36, 0.74], // the Ice Teeth
];
// islands that must exist (the Morrow capital and harbours)
const ISLANDS = [[-32, 148, 2.2], [-29.5, 137, 1.6], [-39, 158, 1.8], [-24, 155.5, 1.6], [-27, 142, 1.3], [-35, 153, 1.4], [-30, 160, 1.2], [-41, 150, 1.2]];

const segs = (chains) => {
  const out = [];
  const add = (a, b) => {
    const pad = Math.max(a[2], b[2]) * 2 + 1;
    const s = [a, b];
    s.lat0 = Math.min(a[0], b[0]) - pad; s.lat1 = Math.max(a[0], b[0]) + pad;
    out.push(s);
  };
  for (const c of chains) {
    if (c.length === 1) add(c[0], c[0]);
    for (let i = 0; i + 1 < c.length; i++) add(c[i], c[i + 1]);
  }
  return out;
};
const LAND_SEGS = segs(LAND);
const SEA_SEGS = segs(SEAS);
const ISLE_SEGS = segs(ISLANDS.map((n) => [n]));

/** 1 at a skeleton line, 0 at twice its coast radius, below 0 beyond. */
function skeletonField(lat, lon, list) {
  const cl = Math.cos(lat * D2R);
  let best = -1;
  for (const s of list) {
    if (lat < s.lat0 || lat > s.lat1) continue;
    const [a, b] = s;
    // in local degrees (longitude shrunk by latitude)
    const ax = wrapLon(a[1] - lon) * cl; const ay = a[0] - lat;
    const bx = ax + wrapLon(b[1] - a[1]) * cl; const by = b[0] - lat;
    const dx = bx - ax; const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
    const px = ax + dx * t; const py = ay + dy * t;
    const d = Math.sqrt(px * px + py * py);
    const R = (a[2] + (b[2] - a[2]) * t) * 2;
    const f = 1 - d / R;
    if (f > best) best = f;
  }
  return best;
}

/** The height of the world at a point: > 0 is land, < 0 is sea. */
export function elevation(lat, lon) {
  const la = lat * D2R;
  const lo = lon * D2R;
  const x = Math.cos(la) * Math.cos(lo);
  const y = Math.cos(la) * Math.sin(lo);
  const z = Math.sin(la);
  // push the shapes about so no coast follows a circle
  const wl = lat + fbm(x, y, z, 3.1, 4, 1) * 6;
  const wo = lon + (fbm(x, y, z, 3.1, 4, 2) * 6) / Math.max(0.25, Math.cos(la));
  let f = skeletonField(wl, wo, LAND_SEGS);
  f = Math.max(f, skeletonField(lat, lon, ISLE_SEGS) - 0.05);
  // roughen the coast: big bays and capes, then the fine fractal edge
  const rough = fbm(x, y, z, 6, 6, 3) * 0.42 + fbm(x, y, z, 22, 3, 4) * 0.12;
  let h = (f - 0.5) + rough;
  // inland seas and straits
  const sea = skeletonField(wl * 0.3 + lat * 0.7, wo * 0.3 + lon * 0.7, SEA_SEGS);
  if (sea > 0) h = Math.min(h, (0.5 - sea) * 1.6 + rough * 0.25);
  // archipelagos: many small islands where the noise peaks
  for (const [a0, a1, o0, o1, dens] of ARCHIPELAGOS) {
    if (lat < a0 || lat > a1) continue;
    const dl = wrapLon(lon - o0);
    if (dl < 0 || dl > wrapLon(o1 - o0)) continue;
    const edge = Math.min(lat - a0, a1 - lat, dl, wrapLon(o1 - o0) - dl) / 4;
    const n = fbm(x, y, z, 26, 4, 5) * 0.8 + fbm(x, y, z, 9, 2, 6) * 0.4;
    const isle = n - dens + 0.12 - Math.max(0, 1 - edge) * 0.5;
    if (isle > 0) h = Math.max(h, isle * 1.4);
  }
  // a scatter of lone islands in the open ocean
  if (h < -0.15) {
    const n = fbm(x, y, z, 31, 3, 7);
    if (n > 0.64) h = Math.max(h, (n - 0.64) * 2.6);
  }
  // the poles: ice
  if (lat < -70) h = Math.max(h, (-70 - lat) / 6 + rough * 0.6);
  return h;
}

/** Mountain height (0–1) for shading: ridged noise, strongest deep inland. */
export function relief(lat, lon, h = elevation(lat, lon)) {
  if (h <= 0) return 0;
  const la = lat * D2R;
  const lo = lon * D2R;
  const x = Math.cos(la) * Math.cos(lo);
  const y = Math.cos(la) * Math.sin(lo);
  const z = Math.sin(la);
  const ridge = 1 - Math.abs(fbm(x, y, z, 7, 5, 8));
  return Math.max(0, Math.min(1, (ridge - 0.55) * 2.6 * Math.min(1, h * 2.5)));
}

/** Climate for colouring: 'ice' | 'desert' | 'forest' | 'grass' | 'tundra'. */
export function biome(lat, lon, h = elevation(lat, lon)) {
  const a = Math.abs(lat);
  if (a > 70) return 'ice';
  if (a > 60) return 'tundra';
  const la = lat * D2R;
  const lo = lon * D2R;
  const wet = fbm(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la), 4, 3, 9) + (a < 12 ? 0.35 : 0) - (a > 16 && a < 34 ? 0.3 : 0) - Math.min(0.3, h * 0.15);
  if (wet < -0.18) return 'desert';
  if (wet > 0.12) return 'forest';
  return 'grass';
}
