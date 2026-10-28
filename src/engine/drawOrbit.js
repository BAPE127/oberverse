// The Orbit page's picture (v0.59.0): the Earth turning under the satellites, their orbits, the
// ground station's beams. Pure drawing — everything comes from src/aero/orbit.js. Radii are
// compressed (a geostationary orbit is 6.6 Earth radii out in life; here it is under 3) so the
// whole sky fits on the page.
import { eci, orbitOf, look } from '../aero/orbit.js';

const TAU = Math.PI * 2;
const rad = (d) => (d * Math.PI) / 180;
const OMEGA = 360 / 1436;
const TILT = rad(64);

/** A made-up world: a few continents (centre lat, lon, radius in degrees), so the globe has something to show as it turns. */
const LAND = [[48, 20, 24], [10, 28, 22], [-18, 130, 18], [38, -90, 26], [-12, -60, 20], [62, 100, 22], [-5, 78, 10], [-70, 0, 14]];
const landPoints = [];
for (const [lat, lon, r] of LAND) for (let i = 0; i < 170; i++) {
  const a = (i * 2.399963) % TAU;
  const d = r * Math.sqrt((i + 0.5) / 170);
  landPoints.push([lat + Math.sin(a) * d * 0.9, lon + (Math.cos(a) * d) / Math.max(0.35, Math.cos(rad(lat)))]);
}

/** Squeeze an orbital radius (Earth radii) onto the page. */
const squash = (a) => 1 + Math.pow(Math.max(0, a - 1), 0.45) * 0.9;

/**
 * Draw the view into a canvas context of size w × h. `sats` are the live satellites to show;
 * `now` the time (game minutes); `station` { lat, lon }; `S` the services content; `own` marks
 * satellites to ring and name. Returns the screen position of each satellite drawn (for labels).
 */
export function drawOrbitView(ctx, w, hh, { sats, now, S, station, own = new Set(), t = 0 }) {
  const cx = w * 0.5;
  const cy = hh * 0.52;
  const R = Math.min(hh * 0.22, w * 0.11);
  ctx.save();
  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, w, hh);
  // stars
  for (let i = 0; i < 140; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * w;
    const y = (Math.sin(i * 53.3 + 1) * 0.5 + 0.5) * hh;
    ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.35 * ((Math.sin(i * 7.7 + t * 1.5) + 1) / 2)})`;
    ctx.fillRect(Math.round(x), Math.round(y), i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  // world → screen: tilt the equatorial plane toward the viewer; depth > 0 is the near side
  const proj = (p, scale = 1) => {
    const x = p.x * scale;
    const y = p.y * scale;
    const z = p.z * scale;
    const y1 = y * Math.cos(TILT) - z * Math.sin(TILT);
    const z1 = y * Math.sin(TILT) + z * Math.cos(TILT);
    return { x: cx + x * R, y: cy - y1 * R, d: z1 };
  };
  const earthAt = (lat, lon) => {
    const th = rad(lon + OMEGA * now);
    const la = rad(lat);
    return proj({ x: Math.cos(la) * Math.cos(th), y: Math.cos(la) * Math.sin(th), z: Math.sin(la) });
  };
  // the geostationary belt and the orbits (faint, brighter on the near side)
  const geoR = R * squash(6.6);
  ctx.strokeStyle = 'rgba(120,160,220,0.18)';
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU; const q = proj({ x: Math.cos(a), y: Math.sin(a), z: 0 }, squash(6.6)); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  ctx.stroke();
  ctx.setLineDash([]);
  void geoR;
  const seen = new Set();
  for (const s of sats) {
    const o = orbitOf(S, s);
    const key = `${s.role}|${Math.round(o.inc)}|${Math.round(o.raan / 12)}`;
    if (seen.has(key) && !own.has(s.id)) continue;
    seen.add(key);
    const col = S.roles[s.role]?.colour || '#9ad';
    ctx.lineWidth = 1;
    let prev = null;
    for (let i = 0; i <= 72; i++) {
      const p = eci({ ...o, m0: 0, raan: o.raan }, (i / 72) * o.period);
      const sq = squash(p.a) / p.a;
      const q = proj(p, sq);
      const behind = q.d < 0 && Math.hypot(q.x - cx, q.y - cy) < R;
      if (prev && !behind && !prev.behind) { ctx.strokeStyle = col + (q.d >= 0 ? '55' : '22'); ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      prev = { x: q.x, y: q.y, behind };
    }
  }
  // the Earth: ocean, land, a graticule, the night side
  const grad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  grad.addColorStop(0, '#2f6db8'); grad.addColorStop(1, '#0d2a55');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TAU); ctx.clip();
  ctx.fillStyle = '#4c9a5a';
  for (const [lat, lon] of landPoints) { const q = earthAt(lat, lon); if (q.d > 0) ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3); }
  ctx.strokeStyle = 'rgba(170,210,255,0.16)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon < 180; lon += 30) { ctx.beginPath(); let on = false; for (let lat = -90; lat <= 90; lat += 6) { const q = earthAt(lat, lon); if (q.d > 0) { if (on) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); on = true; } else on = false; } ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); let on = false; for (let lon = -180; lon <= 180; lon += 6) { const q = earthAt(lat, lon); if (q.d > 0) { if (on) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); on = true; } else on = false; } ctx.stroke(); }
  // night: the side facing away from a sun that stands still over the page's left
  const night = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
  night.addColorStop(0, 'rgba(0,0,0,0)'); night.addColorStop(0.55, 'rgba(0,4,20,0.2)'); night.addColorStop(1, 'rgba(0,4,20,0.7)');
  ctx.fillStyle = night; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(140,190,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  // the ground station
  const st = earthAt(station.lat, station.lon);
  const stOn = st.d > 0;
  if (stOn) { ctx.fillStyle = '#ffb547'; ctx.fillRect(Math.round(st.x) - 2, Math.round(st.y) - 2, 5, 5); ctx.strokeStyle = 'rgba(255,181,71,0.5)'; ctx.beginPath(); ctx.arc(st.x, st.y, 7 + Math.sin(t * 3) * 1.5, 0, TAU); ctx.stroke(); }
  // the satellites
  const out = [];
  for (const s of sats) {
    const o = orbitOf(S, s);
    const p = eci(o, now);
    const q = proj(p, squash(p.a) / p.a);
    const behind = q.d < 0 && Math.hypot(q.x - cx, q.y - cy) < R;
    if (behind) continue;
    const col = S.roles[s.role]?.colour || '#9ad';
    const lk = look(o, now, station);
    if (stOn && lk.el > 5) { ctx.strokeStyle = 'rgba(255,181,71,0.45)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]); }
    const mine = own.has(s.id);
    const x = Math.round(q.x);
    const y = Math.round(q.y);
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(x - 6, y - 3, 13, 7);
    ctx.fillStyle = col; ctx.fillRect(x - 5, y - 1, 4, 3); ctx.fillRect(x + 2, y - 1, 4, 3); ctx.fillStyle = '#e8eef8'; ctx.fillRect(x - 1, y - 2, 3, 5);
    if (mine) { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.7; ctx.strokeRect(x - 8.5, y - 5.5, 17, 11); ctx.globalAlpha = 1; }
    out.push({ id: s.id, x, y, name: s.name, mine });
  }
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (const o of out) if (o.mine) { ctx.fillStyle = 'rgba(223,233,245,0.85)'; ctx.fillText(o.name, o.x + 13, o.y - 1); }
  ctx.restore();
  return out;
}
