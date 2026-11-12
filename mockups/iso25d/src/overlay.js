// CONCEPT STUDY ONLY — everything drawn at full resolution over the pixel world: weather, name tags,
// place labels and the mock-up banner (the game already draws its text this way, after the upscale).
import { THREE, hash } from './lib.js';
const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

export function drawOverlay(ov, spec, built, data) {
  const c = ov.getContext('2d'); const W = ov.width, H = ov.height;
  const night = built.T.lamps > 0; const wx = spec.weather || 'clear';
  // ---- weather in the air
  if (wx === 'rain') { c.fillStyle = night ? 'rgba(20,28,48,0.16)' : 'rgba(150,165,180,0.18)'; c.fillRect(0, 0, W, H); c.lineCap = 'round'; for (let i = 0; i < 1700; i++) { const x = hash(i, 1) * (W + 200) - 100, y = hash(i, 2) * H, l = 14 + hash(i, 3) * 26, a = 0.1 + hash(i, 4) * 0.25; c.strokeStyle = `rgba(205,220,240,${a})`; c.lineWidth = 1 + hash(i, 5); c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * 0.28, y + l); c.stroke(); } }
  if (wx === 'snow') { c.fillStyle = night ? 'rgba(60,72,104,0.12)' : 'rgba(220,228,236,0.16)'; c.fillRect(0, 0, W, H); for (let i = 0; i < 1500; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * H, r = 0.8 + hash(i, 3) * hash(i, 6) * 3.4, a = 0.35 + hash(i, 4) * 0.55; c.fillStyle = `rgba(245,248,252,${a})`; c.beginPath(); c.ellipse(x, y, r, r * (1 + hash(i, 5) * 0.8), 0.3, 0, 7); c.fill(); } }
  if (wx === 'fog') { for (let i = 0; i < 40; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * H, r = 200 + hash(i, 3) * 380; const g = c.createRadialGradient(x, y, 0, x, y, r); const col = night ? '70,80,104' : '214,220,224'; g.addColorStop(0, `rgba(${col},0.14)`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); } }
  // ---- a soft vignette
  const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(4,4,12,${night ? 0.55 : 0.34})`); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  // ---- name tags and place labels (world → screen)
  const v = new THREE.Vector3();
  const at = (L) => { v.set(L.x, L.y, L.z).project(built.cam); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; };
  for (const L of built.labels) {
    const p = at(L); if (p.x < 20 || p.y < 20 || p.x > W - 20 || p.y > H - 20) continue;
    const place = L.kind === 'place'; c.font = `${place ? 'bold 17px' : L.kind === 'player' ? 'bold 15px' : 'bold 14px'} ${FONT}`; const tw = c.measureText(L.text).width; const pw = tw + (place ? 22 : 14), ph = place ? 28 : 21;
    c.fillStyle = place ? 'rgba(22,20,44,0.86)' : L.kind === 'player' ? 'rgba(30,60,48,0.9)' : 'rgba(26,24,34,0.82)'; rr(c, p.x - pw / 2, p.y - ph, pw, ph, place ? 5 : 10); c.fill();
    if (place) { c.strokeStyle = '#5a54c8'; c.lineWidth = 2; c.stroke(); c.fillStyle = 'rgba(22,20,44,0.86)'; c.beginPath(); c.moveTo(p.x - 6, p.y); c.lineTo(p.x + 6, p.y); c.lineTo(p.x, p.y + 8); c.fill(); }
    c.fillStyle = '#f4f1e8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(L.text, p.x, p.y - ph / 2 + 1);
  }
  // ---- the mock-up banner
  if (spec.banner !== false) {
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = `bold 21px ${FONT}`; const t1 = spec.title || spec.id; const w1 = c.measureText(t1).width;
    c.font = `14px ${FONT}`; const t2 = spec.sub || ''; const w2 = c.measureText(t2).width; const bw = Math.max(w1, w2) + 36;
    c.fillStyle = 'rgba(22,20,44,0.9)'; rr(c, 22, 22, bw, t2 ? 64 : 42, 6); c.fill(); c.strokeStyle = '#5a54c8'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#f4f1e8'; c.font = `bold 21px ${FONT}`; c.fillText(t1, 40, 44); if (t2) { c.fillStyle = '#b9b5d8'; c.font = `14px ${FONT}`; c.fillText(t2, 40, 70); }
    const note = 'CONCEPT MOCK-UP — not a game screenshot · rendered by an isolated prototype from the game\'s own map data';
    c.font = `bold 13px ${FONT}`; const nw = c.measureText(note).width + 24; c.fillStyle = 'rgba(160,40,40,0.88)'; rr(c, 22, H - 48, nw, 26, 4); c.fill(); c.fillStyle = '#fff'; c.fillText(note, 34, H - 34);
  }
}
