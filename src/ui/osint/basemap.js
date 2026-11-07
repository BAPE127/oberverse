// The base map of the command terminal (v0.103.6): Hollowmoor Lot drawn as a military base from above, from the same data as the walkable lot (src/content/maps/hollowmoor.js and
// src/content/baseKit.js): the fence with its corner towers and gate, the roads, the vehicle yard, the parade ground, the fuel dump, and, behind the inner fence, the airfield with its runway,
// taxiway, apron stands and helipads. Each building is drawn with the roof of what it is (hangar arches, factory saw-teeth, barracks ridges) and its mark; its state (operational, building,
// damaged, ruin, site) is the border and a tint. The company's own vehicles and aircraft stand where they park in the lot. Paint only: this reads the company, it never changes it.
import { SLOTS, HM_W, HM_H, FENCE, AIRFIELD, PARK, INNER } from '../../content/maps/hollowmoor.js';
import { KIT, lookOf } from '../../content/baseKit.js';
import { parkedMachines } from '../../engine/drawParked.js';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => { const [r, g, b] = hex(h); const f = (v) => Math.max(0, Math.min(255, Math.round(v + k))); return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

/** A small mark for what a building is: cross, star, gear, wing, target, diamond (centre cx, cy; half-size s). */
function glyph(ctx, kind, cx, cy, s, c) {
  ctx.save(); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, s * 0.3);
  if (kind === 'cross') { ctx.fillRect(cx - s * 0.3, cy - s, s * 0.6, s * 2); ctx.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6); }
  else if (kind === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s; const a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  else if (kind === 'gear') { ctx.beginPath(); ctx.arc(cx, cy, s * 0.6, 0, 7); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * s * 0.6, cy + Math.sin(a) * s * 0.6); ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); ctx.stroke(); } }
  else if (kind === 'wing') { ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s * 0.5); ctx.lineTo(cx, cy + s * 0.15); ctx.lineTo(cx - s, cy + s * 0.5); ctx.closePath(); ctx.fill(); }
  else if (kind === 'target') { ctx.beginPath(); ctx.arc(cx, cy, s, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, 7); ctx.fill(); }
  else if (kind === 'diamond') { ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.8, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.8, cy); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

/** The roof of a building seen from above: its tone, and the lines that say what kind of roof it is. */
function roof(ctx, look, x, y, w, h, tone, z) {
  ctx.fillStyle = tone; ctx.fillRect(x, y, w, h);
  const K = KIT[look]; const lite = shade(tone, 22); const dark = shade(tone, -26);
  ctx.lineWidth = 1; ctx.strokeStyle = dark;
  if (K.roof === 'pitched') { ctx.beginPath(); ctx.moveTo(x + 2, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2); ctx.stroke(); for (let i = x + 4; i < x + w - 3; i += Math.max(5, z * 1.1)) { ctx.beginPath(); ctx.moveTo(i, y + 2); ctx.lineTo(i, y + h - 2); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1; } }
  else if (K.roof === 'saw') { const step = Math.max(5, z * 1.6); for (let i = x + step; i < x + w - 2; i += step) { ctx.fillStyle = lite; ctx.fillRect(i - step * 0.45, y + 2, step * 0.45, h - 4); ctx.fillStyle = dark; ctx.fillRect(i - 1, y + 2, 1.5, h - 4); } }
  else if (K.roof === 'arch') { const step = Math.max(5, z * 1.3); ctx.fillStyle = lite; ctx.fillRect(x + 2, y + h / 2 - 1, w - 4, 2); for (let i = x + step; i < x + w - 2; i += step) { ctx.fillStyle = dark; ctx.fillRect(i, y + 2, 1.2, h - 4); } ctx.fillStyle = shade(tone, 10); ctx.fillRect(x + 2, y + 2, w - 4, 2); ctx.fillRect(x + 2, y + h - 4, w - 4, 2); }
  else { ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); ctx.fillStyle = lite; ctx.fillRect(x + w - 7, y + 4, 4, 4); }
}

/**
 * Paint the whole base. `o`: { facilities, sel, statusOf(f) → { mode, label }, colours (mode → [fill, line]), game }.
 * V is the map view (cam.z = pixels per tile, toScreen(x, y) → [px, py], size).
 */
export function paintBase(ctx, V, o) {
  const z = V.cam.z; const P = (x, y) => V.toScreen(x, y); const rect = (x, y, w, h, col) => { const [a, b] = P(x, y); ctx.fillStyle = col; ctx.fillRect(a, b, w * z, h * z); };
  ctx.fillStyle = '#080c0a'; ctx.fillRect(0, 0, V.size.w, V.size.h);
  // the lot: grass, then concrete under every building, the paths, the road and the tarmac
  rect(FENCE.x0, FENCE.y0, FENCE.x1 - FENCE.x0 + 1, FENCE.y1 - FENCE.y0 + 1, '#101a14');
  for (const [x, y, w, h] of Object.values(SLOTS)) rect(x - 2, y - 1, w + 4, h + 3, '#232a26');
  for (const y of [19, 32]) rect(8, y, 96, 2, '#232a26'); rect(8, 53, 96, 1, '#232a26');
  rect(86, 44, 14, 14, '#242b27'); rect(66, 62, 20, 10, '#242b27'); rect(72, 74, 20, 10, '#242b27');
  rect(7, 35, 98, 1, '#2c332f'); rect(7, 40, 98, 1, '#2c332f'); rect(7, 36, 98, 4, '#171c1b'); rect(105, 36, 7, 4, '#171c1b');
  ctx.setLineDash([z * 1.4, z * 1.4]); ctx.strokeStyle = 'rgba(214,190,70,.35)'; ctx.lineWidth = Math.max(1, z * 0.18); { const [a, b] = P(7, 38); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 104 * z, b); ctx.stroke(); } ctx.setLineDash([]);
  // the vehicle yard, the airfield road, the apron, taxiway, runway
  const tar = '#16191b'; rect(8, 53, 30, 6, tar); rect(INNER.roadX0, 41, 4, 59, tar);
  for (const r of [...AIRFIELD.aprons, ...AIRFIELD.taxiways, ...AIRFIELD.runways]) rect(r.x, r.y, r.w, r.h, tar);
  ctx.strokeStyle = 'rgba(214,190,70,.5)'; ctx.lineWidth = Math.max(1, z * 0.2);
  for (const ap of AIRFIELD.aprons) { const [a, b] = P(ap.x, ap.y); ctx.strokeRect(a, b, ap.w * z, ap.h * z); for (const [sx, sy] of ap.slots) { const [c, d] = P(sx + 3, sy); ctx.beginPath(); ctx.moveTo(c, d); ctx.lineTo(c, d + (ap.y + ap.h - sy) * z); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c - 2 * z, d); ctx.lineTo(c + 2 * z, d); ctx.stroke(); } }
  for (const t of AIRFIELD.taxiways) { const [a, b] = P(t.x, t.y + t.h / 2); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + t.w * z, b); ctx.stroke(); }
  for (const r of AIRFIELD.runways) {
    const [a, b] = P(r.x, r.y); ctx.strokeStyle = 'rgba(232,232,226,.55)'; ctx.strokeRect(a, b + z * 0.3, r.w * z, (r.h - 0.6) * z);
    ctx.setLineDash([z * 2, z * 2]); ctx.beginPath(); ctx.moveTo(a + z * 4, b + (r.h / 2) * z); ctx.lineTo(a + (r.w - 4) * z, b + (r.h / 2) * z); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,232,226,.7)'; for (const ex of [r.x + 0.4, r.x + r.w - 2.2]) for (let k = 1; k < r.h - 1; k += 1) { const [c, d] = P(ex, r.y + k); ctx.fillRect(c, d, z * 1.8, z * 0.45); }
    ctx.font = `700 ${Math.max(8, z * 2.4)}px ui-monospace, monospace`; ctx.textBaseline = 'middle'; ctx.fillText(r.ends[0], a + z * 5, b + (r.h / 2) * z); ctx.fillText(r.ends[1], a + (r.w - 8) * z, b + (r.h / 2) * z);
  }
  // helipads
  for (const [hx, hy] of PARK.helipads) { const [a, b] = P(hx, hy); ctx.strokeStyle = 'rgba(214,190,70,.7)'; ctx.lineWidth = Math.max(1, z * 0.2); ctx.beginPath(); ctx.arc(a, b, z * 1.8, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(214,190,70,.7)'; ctx.font = `700 ${Math.max(8, z * 2.2)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', a, b + 1); ctx.textAlign = 'left'; }
  // the fuel dump, the water tower, the parade ground's flags
  for (const [fx, fy] of [[69, 65], [73, 65], [69, 69], [73, 69]]) { const [a, b] = P(fx, fy); ctx.fillStyle = '#4a5560'; ctx.beginPath(); ctx.arc(a, b, z * 1.1, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a97a4'; ctx.lineWidth = 1; ctx.stroke(); }
  { const [a, b] = P(82, 64); ctx.fillStyle = '#5a6672'; ctx.beginPath(); ctx.arc(a, b, z * 1.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#9aa8b4'; ctx.stroke(); }
  // the fences: the lot's, with the gate, and the airfield's
  ctx.strokeStyle = '#7f8c86'; ctx.lineWidth = Math.max(1, z * 0.28);
  { const [a, b] = P(FENCE.x0, FENCE.y0); const w = (FENCE.x1 - FENCE.x0) * z; const hh = (FENCE.y1 - FENCE.y0) * z; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + w, b); ctx.lineTo(a + w, b + (FENCE.gateY0 - FENCE.y0) * z); ctx.moveTo(a + w, b + (FENCE.gateY1 + 1 - FENCE.y0) * z); ctx.lineTo(a + w, b + hh); ctx.lineTo(a, b + hh); ctx.lineTo(a, b); ctx.stroke(); }
  { const [a, b] = P(FENCE.x0, INNER.y); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(P(INNER.roadX0, 0)[0], b); ctx.moveTo(P(INNER.roadX1 + 1, 0)[0], b); ctx.lineTo(P(FENCE.x1, 0)[0], b); ctx.stroke(); }
  for (const [tx, ty] of [[7, 7], [102, 7], [102, 105], [7, 105]]) { const [a, b] = P(tx, ty); ctx.fillStyle = '#323a36'; ctx.fillRect(a, b, z * 3, z * 3); ctx.strokeStyle = '#9aa8a0'; ctx.strokeRect(a, b, z * 3, z * 3); ctx.fillStyle = '#d4a23c'; ctx.fillRect(a + z * 1.1, b + z * 1.1, z * 0.8, z * 0.8); }
  { const [a, b] = P(94, 90); ctx.fillStyle = '#3a4650'; ctx.fillRect(a, b, z * 3, z * 3); ctx.strokeStyle = '#9ab0c0'; ctx.strokeRect(a, b, z * 3, z * 3); ctx.fillStyle = '#9fd4ea'; ctx.fillRect(a + z * 0.5, b + z * 0.5, z * 2, z * 1.2); }
  { const [gx, gy] = P(103, 36); ctx.fillStyle = '#c8523f'; ctx.fillRect(gx, gy, z * 1.6, z * 4); const [tx, ty] = P(97, 41.4); ctx.fillStyle = '#7a8a81'; ctx.font = `${Math.max(9, z * 1.7)}px ui-monospace, monospace`; ctx.textBaseline = 'top'; ctx.fillText('GATE', tx, ty); }
  // the buildings
  const fs = Math.max(8, Math.min(13, z * 1.9));
  for (const f of o.facilities) {
    const [x, y, w, h] = SLOTS[f.slot]; const st = o.statusOf(f); const [fill, line] = o.colours[st.mode]; const [a, b] = P(x, y); const W = w * z; const H = h * z; const look = lookOf(f.id);
    if (st.mode === 'site') { ctx.fillStyle = 'rgba(16,23,20,.8)'; ctx.fillRect(a, b, W, H); ctx.setLineDash([4, 4]); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(a + 0.5, b + 0.5, W, H); ctx.setLineDash([]); }
    else if (st.mode === 'build') { ctx.fillStyle = fill; ctx.fillRect(a, b, W, H); ctx.strokeStyle = 'rgba(95,147,168,.5)'; ctx.lineWidth = 2; for (let i = -H; i < W; i += 10) { ctx.beginPath(); ctx.moveTo(a + i, b + H); ctx.lineTo(a + i + H, b); ctx.stroke(); } const done = { permit: 0.05, foundation: 0.3, frame: 0.6, fitted: 0.85 }[f.state] || 0; ctx.fillStyle = 'rgba(95,147,168,.55)'; ctx.fillRect(a, b + H - 4, W * done, 4); ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.strokeRect(a, b, W, H); }
    else {
      const tone = st.mode === 'ruin' ? '#3a2a26' : st.mode === 'damaged' || st.mode === 'full' ? shade(KIT[look].tone, -34) : shade(KIT[look].tone, -42);
      roof(ctx, look, a, b, W, H, tone, z);
      if (st.mode === 'ruin') { ctx.strokeStyle = 'rgba(200,82,63,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + W, b + H); ctx.moveTo(a + W, b); ctx.lineTo(a, b + H); ctx.stroke(); }
      ctx.strokeStyle = line; ctx.lineWidth = f.id === o.sel ? 2.5 : 1.4; ctx.strokeRect(a, b, W, H);
      if (KIT[look].emblem && W > 44) glyph(ctx, KIT[look].emblem, a + W - Math.min(W * 0.14, 16) - 4, b + Math.min(H * 0.3, 14) + 3, Math.min(W * 0.07, 7), look === 'medical' ? '#c8523f' : 'rgba(232,240,224,.7)');
      // the door
      ctx.fillStyle = '#e8c35a'; ctx.fillRect(a + W / 2 - 2, b + H - 3, 4, 3);
    }
    if (f.id === o.sel) { ctx.strokeStyle = '#e8f4d8'; ctx.lineWidth = 1; ctx.strokeRect(a - 3, b - 3, W + 6, H + 6); }
    ctx.font = `600 ${fs}px system-ui, sans-serif`; ctx.fillStyle = st.mode === 'site' ? '#6a7a71' : '#eef3ea'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const label = f.name.replace(' & briefing room', '').replace(' & tank workshop', ''); if (W > fs * 3) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3; ctx.fillText(label, a + 4, b + 4, W - 8); ctx.restore(); }
    if (W > 70 && H > 36) { ctx.font = `${Math.max(8, fs - 2)}px ui-monospace, monospace`; ctx.fillStyle = line; ctx.fillText(st.label.toUpperCase(), a + 4, b + 4 + fs + 3, W - 8); }
  }
  // the company's vehicles and aircraft, where they park: the same sprites as in the walkable lot
  const k = z / 32;
  for (const pm of parkedMachines(o.game)) { const [a, b] = P(pm.x, pm.y); ctx.save(); ctx.translate(a, b); ctx.scale(k, k); ctx.translate(-pm.x * 32, -pm.y * 32); try { pm.draw(ctx); } catch { /* a sprite that cannot be drawn is simply missing */ } ctx.restore(); }
  // zone names
  ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = 'rgba(160,178,168,.7)'; ctx.textBaseline = 'top';
  for (const [t, x, y] of [['VEHICLE YARD', 9, 58.2], ['PARADE GROUND', 87, 56.2], ['FUEL DUMP', 66, 72.4], ['HELIPADS', 74, 82.3], ['APRON', 8.5, 86.4], ['TAXIWAY A', 14, 98.2], ['RUNWAY 09/27', 14, 108.4], ['AIRFIELD GATE', 86, 74.6]]) { const [a, b] = P(x, y); ctx.fillText(t, a, b); }
  ctx.fillStyle = '#7a8a81'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText(`HOLLOWMOOR LOT · ${HM_W}×${HM_H} · N ↑`, 10, V.size.h - 18);
}
