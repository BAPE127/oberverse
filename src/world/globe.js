// The world globe's geography (v0.15.1; shared since v0.21.0). The fictional
// countries sit on smooth procedural continents; every capital is guaranteed
// to be on land. Used by the arms terminal's globe, the logistics chart and
// the sea routes ships follow (src/world/seaRoutes.js). Pure functions.
export const D2R = Math.PI / 180;
export const wrapLon = (d) => ((d + 540) % 360) - 180;

/** Smooth deterministic "continents" on the sphere. */
export function landNoise(lat, lon) {
  const a = lat * D2R;
  const b = lon * D2R;
  return Math.sin(b * 2 + 0.6) * Math.cos(a * 3 - 0.4) * 0.55 + Math.sin(b * 5 + a * 4 + 1.3) * 0.25 + Math.cos(b * 3 - a * 6) * 0.18 + Math.sin(b * 9 + a * 2) * 0.08 - Math.abs(lat) / 260;
}

const LAND_AT = 0.12;

/** Land strength at a point, with every capital pulled up onto land. */
export function landValue(lat, lon, countries) {
  let n = landNoise(lat, lon);
  for (const c of Object.values(countries)) {
    const d = Math.hypot(lat - c.lat, wrapLon(lon - c.lon) * Math.cos(lat * D2R));
    if (d < 14) n = Math.max(n, 0.3 - d / 60);
  }
  return n;
}

export const isLand = (lat, lon, countries) => landValue(lat, lon, countries) >= LAND_AT;

/** The globe's land as 3° dots, each tagged with its nearest country (and whether it's on a border). */
export function buildLand(countries) {
  const pts = [];
  const step = 3;
  const caps = Object.entries(countries);
  for (let lat = -78; lat <= 80; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      const n = landValue(lat, lon, countries);
      if (n < LAND_AT) continue;
      let best = null;
      let bd = 30;
      for (const [id, c] of caps) {
        const d = Math.hypot(lat - c.lat, wrapLon(lon - c.lon) * Math.cos(lat * D2R));
        if (d < bd) { bd = d; best = id; }
      }
      pts.push({ lat, lon, country: best, n });
    }
  }
  // border points: a neighbour belongs to another country (or is sea)
  const key = (lat, lon) => `${lat},${wrapLon(lon)}`;
  const map = new Map(pts.map((p) => [key(p.lat, p.lon), p]));
  for (const p of pts) {
    const e = map.get(key(p.lat, p.lon + step));
    const nn = map.get(key(p.lat + step, p.lon));
    p.border = (e && e.country !== p.country) || (nn && nn.country !== p.country) || !e || !nn;
  }
  return pts;
}

/** Great-circle distance in km between [lat, lon] points (globe radius 6371 km). */
export function gcKm(a, b) {
  const p1 = a[0] * D2R;
  const p2 = b[0] * D2R;
  const dp = p2 - p1;
  const dl = wrapLon(b[1] - a[1]) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
