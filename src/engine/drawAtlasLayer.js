// The Atlas overlay (v0.92.0): rivers, roads, named places, military sites and state names, drawn over either map — the arms terminal's globe
// or Fleet Command's flat chart. The caller gives a projector P(lat, lon) → { x, y, z } (z > 0 is on the visible side; the flat chart is always 1)
// and a `level`, how far in the view is (1 = the whole world; the terminal's zoom, Fleet Command's zoom). More appears as you zoom in.
import { atlasRivers, atlasRoads, atlasPlaces, atlasMilitary, atlasStates } from '../world/atlas.js';

const KIND_NAME = { c: 'Capital', t: 'City', p: 'Port', a: 'Airfield', b: 'Base', f: 'Fort or pass', m: 'Mine or oil', r: 'Industry or research' };
const MIL_NAME = { army: 'Army post', air: 'Air base', naval: 'Naval base', fort: 'Fort', hq: 'Headquarters' };
/** The zoom at which each thing starts to show. */
export const ATLAS_LEVELS = { riversMajor: 0.8, riversMid: 1.5, riversMinor: 2.6, roadsMain: 1.7, roadsLocal: 2.8, capitals: 0.8, states: 1.35, ports: 1.9, military: 1.9, towns: 2.5 };

/**
 * opts: { level, scale (line/label size factor), theme { river, road, roadMain, text, dim, port, mil, place }, hover (key), font (px base) }
 * Returns the hover targets this frame: [{ key, kind: 'place'|'military', x, y, r, data }].
 */
export function drawAtlasLayer(ctx, P, opts) {
  const L = ATLAS_LEVELS;
  const lv = opts.level;
  const sc = opts.scale || 1;
  const th = opts.theme;
  const fs = Math.round((opts.font || 10) * Math.min(1.3, 0.85 + lv * 0.12));
  const hits = [];
  const wrapJump = opts.wrapJump ?? 0; // flat charts: do not join points that straddle the antimeridian
  const stroke = (pts, color, width) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    let pen = false; let last = null;
    for (const [la, lo] of pts) {
      const q = P(la, lo);
      if (q.z <= 0 || (wrapJump && last && Math.abs(q.x - last.x) > wrapJump)) { pen = false; last = q.z > 0 ? q : null; if (q.z > 0) { ctx.moveTo(q.x, q.y); pen = true; } continue; }
      if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
      pen = true; last = q;
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // rivers
  if (lv >= L.riversMajor) {
    for (const r of atlasRivers()) {
      if (r.w === 2 && lv < L.riversMid) continue;
      if (r.w === 1 && lv < L.riversMinor) continue;
      const pts = []; for (let i = 0; i < r.p.length; i += 2) pts.push([r.p[i], r.p[i + 1]]);
      stroke(pts, th.river, (0.6 + r.w * 0.5) * sc);
    }
  }
  // roads
  if (lv >= L.roadsMain) {
    for (const rd of atlasRoads()) {
      if (!rd.main && lv < L.roadsLocal) continue;
      const mid = [(rd.a.lat + rd.b.lat) / 2, (rd.a.lon + rd.b.lon) / 2];
      stroke([[rd.a.lat, rd.a.lon], mid, [rd.b.lat, rd.b.lon]], rd.main ? th.roadMain : th.road, (rd.main ? 1.1 : 0.7) * sc);
    }
  }
  // state names
  const boxes = [];
  const free = (x, y, w, hgt) => { for (const b of boxes) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + hgt > b.y) return false; boxes.push({ x, y, w, h: hgt }); return true; };
  ctx.font = `${fs}px "Courier New", monospace`;
  ctx.textBaseline = 'middle';
  // places first claim space (capitals, then the rest), state names fill what is left
  const places = atlasPlaces();
  const shown = places.filter((p) => !(opts.skipCapitals && p.kind === 'c') && !(opts.skipPorts && p.kind === 'p')).filter((p) => (p.kind === 'c' && lv >= L.capitals) || ((p.kind === 'p' || p.kind === 'b' || p.kind === 'f' || p.kind === 'a') && lv >= L.ports) || (lv >= L.towns));
  shown.sort((a, b) => (a.kind === 'c' ? 0 : 1) - (b.kind === 'c' ? 0 : 1));
  for (const p of shown) {
    const q = P(p.lat, p.lon);
    if (q.z <= 0.12) continue;
    const cap = p.kind === 'c';
    const color = cap ? th.place : p.kind === 'p' ? th.port : th.dim;
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = sc;
    const s = (cap ? 3.2 : 2.2) * sc;
    if (p.kind === 'p') { ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, Math.PI * 2); ctx.stroke(); }
    else if (p.kind === 'b' || p.kind === 'f' || p.kind === 'a') { ctx.beginPath(); ctx.moveTo(q.x, q.y - s); ctx.lineTo(q.x + s, q.y + s); ctx.lineTo(q.x - s, q.y + s); ctx.closePath(); ctx.stroke(); }
    else ctx.fillRect(q.x - s, q.y - s, s * 2, s * 2);
    const tw = ctx.measureText(p.name).width;
    if (free(q.x + s + 3, q.y - fs / 2, tw, fs)) { ctx.fillStyle = cap ? th.text : th.dim; ctx.fillText(p.name, q.x + s + 3, q.y); }
    hits.push({ key: `pl:${p.name}`, kind: 'place', x: q.x, y: q.y, r: 7 * sc, data: { ...p, what: KIND_NAME[p.kind] } });
    if (opts.hover === `pl:${p.name}`) { ctx.strokeStyle = th.text; ctx.strokeRect(q.x - s - 3, q.y - s - 3, (s + 3) * 2, (s + 3) * 2); }
  }
  // military sites
  if (lv >= L.military) {
    for (const m of atlasMilitary()) {
      const q = P(m.lat, m.lon);
      if (q.z <= 0.12) continue;
      ctx.strokeStyle = th.mil; ctx.fillStyle = th.mil; ctx.lineWidth = 1.2 * sc;
      const s = 3.4 * sc;
      ctx.beginPath(); ctx.moveTo(q.x - s, q.y - s); ctx.lineTo(q.x + s, q.y + s); ctx.moveTo(q.x + s, q.y - s); ctx.lineTo(q.x - s, q.y + s); ctx.stroke();
      hits.push({ key: `mil:${m.name}`, kind: 'military', x: q.x, y: q.y, r: 7 * sc, data: { ...m, what: MIL_NAME[m.kind] } });
      if (opts.hover === `mil:${m.name}`) ctx.strokeRect(q.x - s - 3, q.y - s - 3, (s + 3) * 2, (s + 3) * 2);
    }
  }
  if (lv >= L.states) {
    ctx.fillStyle = th.state;
    ctx.font = `italic ${fs}px "Courier New", monospace`;
    for (const s of atlasStates()) {
      if (s.id === 'fr_southern_ice') continue;
      const q = P(s.seed[0], s.seed[1]);
      if (q.z <= 0.3) continue;
      const tw = ctx.measureText(s.name).width;
      if (free(q.x - tw / 2, q.y - fs / 2, tw, fs)) ctx.fillText(s.name, q.x - tw / 2, q.y);
    }
  }
  ctx.restore();
  return hits;
}

/** The tooltip lines for an Atlas hit or for a bare point of land (state, country, climate). */
export function atlasLines(hit, here) {
  const out = [];
  if (hit) {
    const d = hit.data;
    out.push(hit.kind === 'military' ? `✕ ${d.name.toUpperCase()}` : `${d.kind === 'c' ? '★' : '▪'} ${d.name.toUpperCase()}`, d.what.toUpperCase());
  }
  if (here) {
    out.push(`STATE     ${here.state.name.toUpperCase()}`, `COUNTRY   ${here.country.name.toUpperCase()}`, `CLIMATE   ${here.biomeName.toUpperCase()}`);
    if (here.state.tag) out.push(here.state.tag);
  }
  return out;
}
