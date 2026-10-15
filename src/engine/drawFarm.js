// Farm and dairy props (v0.29.0, Lariat): water tower, town signs, silos,
// windmill, hay bales, tractors, troughs, crop rows, ranch fencing, the herd,
// and the dairy's milk tanks, milking stalls and cheese vats. drawProp hands
// any type it doesn't know to drawFarmProp; it returns false if it doesn't
// know it either.
import { drawCow } from './drawCow.js';
import { hash2 } from '../core/rng.js';

const T = 32;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Big painted letters on a board (town signs). */
function boardText(ctx, text, x, y, w, size, colour) {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y, w - 6);
}

export const FARM_PROPS = new Set(['chicken', 'goat', 'ranchgate', 'ranchpost', 'roadsign', 'watertower', 'bigsign', 'silo', 'windmill', 'haybale', 'tractor', 'trough', 'crops', 'ranchfence', 'cow', 'milktank', 'milkstall', 'cheesevat', 'cheesepress', 'cheeserack']);

// ------------------------------------------------------------------ fields
// v0.29.1: fields are drawn into the map's static ground layer once (map.fields:
// [{ x, y, w, h, crop, stage }] in tiles), not as props every frame.
const CROPS = {
  cotton: { leaf: '#4f8a3a', dark: '#3a6a2c', head: '#f8f6f0', tall: 12 },
  sorghum: { leaf: '#5a8a3a', dark: '#44702c', head: '#a8482a', tall: 18 },
  corn: { leaf: '#4f9a3e', dark: '#3a7a2e', head: '#e8d06a', tall: 24 },
  wheat: { leaf: '#b8a050', dark: '#9a8440', head: '#e0c060', tall: 14 },
};

export function drawFields(ctx, fields) {
  for (const f of fields) drawField(ctx, f);
}

function drawField(ctx, f) {
  const x0 = f.x * T;
  const y0 = f.y * T;
  const w = f.w * T;
  const h = f.h * T;
  if (f.crop === 'pasture') return drawPasture(ctx, f, x0, y0, w, h);
  const fallow = f.crop === 'fallow' || !CROPS[f.crop] || (f.stage ?? 3) <= 0;
  // tilled soil: a darker bed with furrows, one every half tile
  ctx.fillStyle = fallow ? '#a07c50' : '#8a6a44';
  ctx.fillRect(x0, y0, w, h);
  for (let yy = y0 + 8; yy < y0 + h; yy += 16) {
    ctx.fillStyle = 'rgba(60,38,20,0.28)';
    ctx.fillRect(x0 + 2, yy, w - 4, 4);
    ctx.fillStyle = 'rgba(255,230,190,0.12)';
    ctx.fillRect(x0 + 2, yy - 3, w - 4, 2);
  }
  // a tidy headland round the edge
  ctx.strokeStyle = 'rgba(70,45,25,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  if (fallow) {
    // stubble and a few weeds
    for (let i = 0; i < f.w * f.h * 0.6; i++) {
      const px = x0 + hash2(f.x * 31 + i, f.y) * w;
      const py = y0 + hash2(f.y * 17, f.x + i * 3) * h;
      ctx.fillStyle = i % 3 ? 'rgba(200,170,110,0.55)' : 'rgba(110,140,70,0.6)';
      ctx.fillRect(px, py, 2, 3);
    }
    return;
  }
  const c = CROPS[f.crop];
  const stage = f.stage ?? 3;
  const tall = c.tall * [0, 0.35, 0.7, 1][Math.min(3, stage)];
  for (let yy = y0 + 14; yy < y0 + h - 2; yy += 16) {
    for (let xx = x0 + 5; xx < x0 + w - 3; xx += 7) {
      const j = hash2(xx, yy);
      const ht = tall * (0.85 + j * 0.3);
      const px = xx + (j - 0.5) * 2;
      // stalk and leaves
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px, yy - ht); ctx.stroke();
      ctx.fillStyle = c.leaf;
      ctx.beginPath(); ctx.ellipse(px - 3, yy - ht * 0.45, 4, 1.8, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + 3, yy - ht * 0.65, 4, 1.8, 0.5, 0, Math.PI * 2); ctx.fill();
      if (stage < 3) continue;
      if (f.crop === 'cotton') {
        ctx.fillStyle = c.head;
        ctx.beginPath(); ctx.arc(px, yy - ht, 2.6, 0, Math.PI * 2); ctx.arc(px + 2.5, yy - ht + 3, 2, 0, Math.PI * 2); ctx.arc(px - 2.5, yy - ht + 4, 1.8, 0, Math.PI * 2); ctx.fill();
      } else if (f.crop === 'corn') {
        ctx.fillStyle = c.head; ctx.fillRect(px - 1, yy - ht - 4, 2, 5);
        ctx.fillStyle = '#d8b84a'; ctx.fillRect(px + 1, yy - ht * 0.55, 3, 6);
      } else if (f.crop === 'sorghum') {
        ctx.fillStyle = c.head; ctx.beginPath(); ctx.ellipse(px, yy - ht - 2, 2.4, 4, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = c.head; ctx.fillRect(px - 1, yy - ht - 5, 3, 6);
      }
    }
  }
}

/** v0.31.0: a fenced pasture — grazed grass, a worn track to the feeder and trough, and the fence round it. */
function drawPasture(ctx, f, x0, y0, w, h) {
  ctx.fillStyle = '#7aa85a';
  ctx.fillRect(x0, y0, w, h);
  for (let i = 0; i < f.w * f.h; i++) {
    const px = x0 + hash2(f.x * 13 + i, f.y) * w;
    const py = y0 + hash2(f.y * 7, f.x + i * 5) * h;
    ctx.fillStyle = i % 4 ? 'rgba(60,100,40,0.35)' : 'rgba(200,190,120,0.4)';
    ctx.fillRect(px, py, 3, 2);
  }
  // the worn track and the feeder and trough by the gate
  ctx.fillStyle = 'rgba(150,115,70,0.55)';
  ctx.fillRect(x0 + T, y0 + T * 0.5, T * 4, T * 1.2);
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x0 + T * 1.2, y0 + T * 0.6, T * 1.4, T * 0.8);
  ctx.fillStyle = '#d8b84a'; ctx.fillRect(x0 + T * 1.3, y0 + T * 0.7, T * 1.2, T * 0.4);
  ctx.fillStyle = '#7a7e84'; ctx.fillRect(x0 + T * 3, y0 + T * 0.6, T * 1.6, T * 0.8);
  ctx.fillStyle = '#4a8ab0'; ctx.fillRect(x0 + T * 3.1, y0 + T * 0.7, T * 1.4, T * 0.5);
  // fence posts and rails all round
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 3, y0 + 3, w - 6, h - 6);
  ctx.fillStyle = '#6a4a2a';
  for (let x = x0 + 3; x < x0 + w; x += 24) { ctx.fillRect(x - 2, y0, 5, 8); ctx.fillRect(x - 2, y0 + h - 8, 5, 8); }
  for (let y = y0 + 3; y < y0 + h; y += 24) { ctx.fillRect(x0, y - 2, 8, 5); ctx.fillRect(x0 + w - 8, y - 2, 8, 5); }
}

export function drawFarmProp(ctx, p, x, y, w, h, opts = {}) {
  const t = opts.time || 0;
  switch (p.type) {
    case 'chicken': {
      // a hen, pecking about her spot
      const ph = (opts.time || 0) * 0.5 + hash2(p.seed || 1, 3) * 10;
      const cx = x + 16 + Math.sin(ph) * 8;
      const cy = y + 22 + Math.cos(ph * 0.8) * 4;
      const peck = Math.sin(ph * 6) > 0.6 ? 3 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 5, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = (p.seed || 0) % 3 ? '#b8743a' : '#f2ece0';
      ctx.beginPath(); ctx.ellipse(cx, cy, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 3 + peck, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8302a'; ctx.fillRect(cx + 4, cy - 7 + peck, 2, 2);
      ctx.fillStyle = '#e8a83a'; ctx.fillRect(cx + 8, cy - 3 + peck, 2, 1.5);
      return true;
    }
    case 'goat': {
      const ph = (opts.time || 0) * 0.2 + hash2(p.seed || 1, 5) * 10;
      const cx = x + 16 + Math.sin(ph) * 9;
      const cy = y + 22 + Math.cos(ph * 0.7) * 4;
      const dir = Math.cos(ph) > 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx, cy + 7, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3028';
      for (const lx of [-6, -3, 3, 6]) ctx.fillRect(cx + lx, cy + 1, 2, 7);
      ctx.fillStyle = (p.seed || 0) % 2 ? '#e8e2d4' : '#9a7a5a';
      ctx.beginPath(); ctx.ellipse(cx, cy - 1, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + dir * 10, cy - 6, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + dir * 9, cy - 9); ctx.lineTo(cx + dir * 6, cy - 13); ctx.stroke();
      return true;
    }
    case 'ranchpost': {
      // a timber gatepost, braced
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 8, y + 24, 18, 7);
      ctx.fillStyle = '#6a4a2e'; ctx.fillRect(x + 10, y - 40, 12, 70);
      ctx.fillStyle = '#7e5a38'; ctx.fillRect(x + 10, y - 40, 5, 70);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x + 8, y - 44, 16, 6);
      return true;
    }
    case 'ranchgate': {
      // the town's ranch arch: a beam over the road resting on the two ranchposts (drawn by them, one tile below),
      // the name hanging from it in iron letters, and a cattle guard across the road under it
      const top = y - 12;
      ctx.fillStyle = 'rgba(30,30,34,0.55)';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + T, y + h - 22 + k * 4, w - 2 * T, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 14, y + h + 2, w - 28, 6); // the beam's shadow on the road
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x + 6, top, w - 12, 12);
      ctx.fillStyle = '#6e4e30'; ctx.fillRect(x + 6, top, w - 12, 4);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x + 6, top + 10, w - 12, 2);
      // the name on chains
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2;
      const cx = x + w / 2;
      ctx.beginPath(); ctx.moveTo(cx - 54, top + 12); ctx.lineTo(cx - 54, top + 18); ctx.moveTo(cx + 54, top + 12); ctx.lineTo(cx + 54, top + 18); ctx.stroke();
      ctx.font = 'bold 26px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(240,230,210,0.55)'; ctx.strokeText(p.text || 'LARIAT', cx, top + 17);
      ctx.fillStyle = '#2a2420'; ctx.fillText(p.text || 'LARIAT', cx, top + 17);
      // a horseshoe and a lasso loop hung off the beam
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x + 40, top + 24, 7, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + w - 40, top + 24, 8, 6, 0, 0, Math.PI * 2); ctx.stroke();
      return true;
    }
    case 'roadsign': {
      // a green highway sign on two legs (fits a one-tile or two-tile footprint)
      const bh = 40;
      const bottom = y + h - 12;
      ctx.fillStyle = '#7a7e84';
      ctx.fillRect(x + 10, bottom - 10, 4, y + h - bottom + 10); ctx.fillRect(x + w - 14, bottom - 10, 4, y + h - bottom + 10);
      ctx.fillStyle = '#e8ece8'; ctx.fillRect(x + 2, bottom - bh, w - 4, bh);
      ctx.fillStyle = p.color || '#2f6b4f'; ctx.fillRect(x + 4, bottom - bh + 2, w - 8, bh - 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.text || '', x + w / 2, bottom - bh + 13, w - 14);
      if (p.sub) { ctx.font = 'bold 9px "Trebuchet MS", sans-serif'; ctx.fillText(p.sub, x + w / 2, bottom - bh + 29, w - 14); }
      return true;
    }
    case 'watertower': {
      const cx = x + w / 2;
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 3;
      for (const dx of [-w * 0.32, w * 0.32]) { ctx.beginPath(); ctx.moveTo(cx + dx, y + h - 2); ctx.lineTo(cx + dx * 0.6, y + h * 0.15); ctx.stroke(); }
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const yy = y + h * (0.35 + k * 0.2); ctx.beginPath(); ctx.moveTo(cx - w * 0.3, yy); ctx.lineTo(cx + w * 0.3, yy + h * 0.1); ctx.moveTo(cx + w * 0.3, yy); ctx.lineTo(cx - w * 0.3, yy + h * 0.1); ctx.stroke(); }
      // the tank, high up
      const ty = y - T * 2.2;
      ctx.fillStyle = '#c8ccd2';
      ctx.beginPath(); ctx.ellipse(cx, ty + T * 1.6, w * 0.48, T * 0.4, 0, 0, Math.PI); ctx.fill();
      ctx.fillRect(cx - w * 0.48, ty + T * 0.4, w * 0.96, T * 1.2);
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath(); ctx.moveTo(cx - w * 0.5, ty + T * 0.45); ctx.lineTo(cx, ty - T * 0.3); ctx.lineTo(cx + w * 0.5, ty + T * 0.45); ctx.fill();
      ctx.fillStyle = '#7a2a24';
      ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('LARIAT', cx, ty + T * 1.0);
      return true;
    }
    case 'bigsign': {
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(x + 6, y + h - 26, 5, 26); ctx.fillRect(x + w - 11, y + h - 26, 5, 26);
      ctx.fillStyle = p.color || '#e8dcc0';
      ctx.fillRect(x, y - 10, w, h - 6);
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y - 8.5, w - 3, h - 9);
      boardText(ctx, p.text || '', x, y + 6, w, 15, '#7a2a24');
      if (p.sub) boardText(ctx, p.sub, x, y + 24, w, 8, '#3a2a1e');
      return true;
    }
    case 'silo': {
      const cx = x + w / 2;
      const r = w / 2 - 2;
      const top = y - T * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 4, y + h - 3, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
      const base = p.color || '#b8bec6';
      g.addColorStop(0, shade(base, 0.75)); g.addColorStop(0.45, base); g.addColorStop(1, shade(base, 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, top, r * 2, y + h - 4 - top);
      ctx.beginPath(); ctx.ellipse(cx, y + h - 4, r, r * 0.4, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      for (let yy = top + 10; yy < y + h - 6; yy += 10) { ctx.beginPath(); ctx.moveTo(cx - r, yy); ctx.lineTo(cx + r, yy); ctx.stroke(); }
      ctx.fillStyle = shade(base, 0.85);
      ctx.beginPath(); ctx.ellipse(cx, top, r, r * 0.5, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - r, top); ctx.quadraticCurveTo(cx, top - r * 1.2, cx + r, top); ctx.fill();
      return true;
    }
    case 'windmill': {
      const cx = x + w / 2;
      ctx.strokeStyle = '#7a7e86'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx - w * 0.35, y + h); ctx.lineTo(cx - 3, y - T); ctx.moveTo(cx + w * 0.35, y + h); ctx.lineTo(cx + 3, y - T); ctx.stroke();
      ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const yy = y + h - k * 22; const sp = w * 0.35 * (1 - k * 0.17); ctx.beginPath(); ctx.moveTo(cx - sp, yy); ctx.lineTo(cx + sp, yy - 22); ctx.moveTo(cx + sp, yy); ctx.lineTo(cx - sp, yy - 22); ctx.stroke(); }
      // the wheel of blades, turning
      const hy = y - T * 1.1;
      ctx.save(); ctx.translate(cx, hy); ctx.rotate(t * 1.4);
      ctx.fillStyle = '#c8ccd2';
      for (let k = 0; k < 14; k++) { ctx.rotate((Math.PI * 2) / 14); ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(22, -5); ctx.lineTo(22, 5); ctx.lineTo(4, 2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#5a5e66'; ctx.beginPath(); ctx.arc(cx, hy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a8e96'; ctx.beginPath(); ctx.moveTo(cx, hy - 3); ctx.lineTo(cx - 26, hy - 6); ctx.lineTo(cx - 30, hy + 4); ctx.lineTo(cx, hy + 3); ctx.fill();
      return true;
    }
    case 'haybale': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2 + 3, y + h - 3, w * 0.45, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8b860';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 - 2, w * 0.46, h * 0.46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b89840'; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 - 2, w * 0.46 * (k / 4), h * 0.46 * (k / 4), 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,240,180,0.35)'; ctx.fillRect(x + 6, y + 6, 6, 3);
      return true;
    }
    case 'tractor': {
      const col = p.color || '#c8402a';
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, y + h - 6, w - 6, 6);
      // body, bonnet and cab (side-on, facing right)
      ctx.fillStyle = col;
      ctx.fillRect(x + 8, y + h * 0.35, w * 0.6, h * 0.32);
      ctx.fillRect(x + w * 0.55, y + h * 0.4, w * 0.38, h * 0.26);
      ctx.fillStyle = '#2a2e34'; ctx.fillRect(x + w * 0.85, y + h * 0.18, 3, h * 0.24);
      ctx.fillStyle = 'rgba(160,200,230,0.8)'; ctx.fillRect(x + 12, y - 6, w * 0.32, h * 0.42);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(x + 12, y - 6, w * 0.32, h * 0.42);
      ctx.fillStyle = shade(col, 0.7); ctx.fillRect(x + 10, y - 9, w * 0.36, 4);
      // wheels: a big one at the back, a small one at the front
      ctx.fillStyle = '#1a1a1e';
      ctx.beginPath(); ctx.arc(x + 20, y + h - 13, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w - 14, y + h - 8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c04a';
      ctx.beginPath(); ctx.arc(x + 20, y + h - 13, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w - 14, y + h - 8, 3.5, 0, Math.PI * 2); ctx.fill();
      return true;
    }
    case 'trough': {
      ctx.fillStyle = '#7a7e86'; ctx.fillRect(x + 2, y + 10, w - 4, h - 12);
      ctx.fillStyle = '#4a8ab0'; ctx.fillRect(x + 5, y + 12, w - 10, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 8 + Math.sin(t) * 3, y + 13, 6, 1.5);
      return true;
    }
    case 'crops': {
      // a row of crops across a field; stage 0 bare furrow … 3 ready
      const stage = p.stage ?? 2;
      ctx.fillStyle = 'rgba(70,45,25,0.35)'; ctx.fillRect(x, y + h - 9, w, 4);
      if (stage <= 0) return true;
      for (let px = x + 4; px < x + w - 2; px += 7) {
        const sway = Math.sin(t * 1.5 + px * 0.13) * 1.2;
        const ht = [0, 5, 11, 16][stage] || 14;
        ctx.strokeStyle = stage >= 3 && p.crop === 'wheat' ? '#c8a848' : '#4a8a3a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, y + h - 7); ctx.lineTo(px + sway, y + h - 7 - ht); ctx.stroke();
        if (stage >= 3) {
          if (p.crop === 'cotton') { ctx.fillStyle = '#f8f6f0'; ctx.beginPath(); ctx.arc(px + sway, y + h - 7 - ht, 3, 0, Math.PI * 2); ctx.arc(px + sway + 3, y + h - 4 - ht, 2.2, 0, Math.PI * 2); ctx.fill(); }
          else if (p.crop === 'corn') { ctx.fillStyle = '#e8c04a'; ctx.fillRect(px + sway + 1, y + h - 5 - ht, 3, 6); }
          else if (p.crop === 'sorghum') { ctx.fillStyle = '#a84a2a'; ctx.beginPath(); ctx.arc(px + sway, y + h - 8 - ht, 3, 0, Math.PI * 2); ctx.fill(); }
          else if (p.crop === 'wheat') { ctx.fillStyle = '#d8b850'; ctx.fillRect(px + sway - 1, y + h - 10 - ht, 3, 6); }
        }
      }
      return true;
    }
    case 'ranchfence': {
      ctx.fillStyle = '#7a5a3a';
      if (p.vertical) {
        ctx.fillRect(x + 13, y - 6, 3, h + 4);
        ctx.fillRect(x + 18, y - 6, 3, h + 4);
        for (let i = 0; i < h; i += 16) ctx.fillRect(x + 11, y + i - 10, 12, 6);
      } else {
        ctx.fillRect(x, y + 12, w, 3); ctx.fillRect(x, y + 20, w, 3);
        for (let i = 2; i < w; i += 16) ctx.fillRect(x + i, y + 6, 4, 22);
      }
      return true;
    }
    case 'cow': {
      // an ordinary cow, grazing: she drifts about her spot and turns now and then
      const seed = p.seed || 1;
      const ph = t * 0.12 + hash2(seed, 1) * 10;
      const dx = Math.sin(ph) * 10;
      const dy = Math.cos(ph * 0.7) * 5;
      const facing = Math.cos(ph) > 0 ? 'right' : 'left';
      drawCow(ctx, { coat: p.coat, patches: p.patches, seed, bell: seed % 4 === 0 }, { x: x + T / 2 + dx, y: y + T - 4 + dy, facing, moving: Math.abs(Math.cos(ph)) > 0.6, animTime: t, idleTime: t + seed });
      return true;
    }
    case 'milktank': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4, y + h - 6, w - 4, 6);
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#9aa4b0'); g.addColorStop(0.5, '#e8eef4'); g.addColorStop(1, '#8a949e');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x + 2, y - 8, w - 4, h + 2, 10); ctx.fill();
      ctx.fillStyle = '#2a3440'; ctx.fillRect(x + w / 2 - 5, y + 4, 10, 6);
      ctx.fillStyle = '#4ade9a'; ctx.fillRect(x + w / 2 - 4, y + 5, 8 * 0.55, 4);
      return true;
    }
    case 'milkstall': {
      ctx.fillStyle = '#cfd4da'; ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
      ctx.strokeStyle = '#8a949e'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 4, w - 6, h - 8);
      ctx.beginPath(); ctx.moveTo(x + w / 2, y + 4); ctx.lineTo(x + w / 2, y + h - 4); ctx.stroke();
      ctx.fillStyle = '#2a3440'; ctx.fillRect(x + w / 2 - 6, y + h - 14, 12, 8);
      ctx.fillStyle = '#4ade9a'; ctx.fillRect(x + w / 2 - 5, y + h - 13, 10 * (0.4 + 0.2 * Math.sin(t + x)), 2);
      return true;
    }
    case 'cheesevat': {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#9aa4b0'); g.addColorStop(0.5, '#eef2f6'); g.addColorStop(1, '#8a949e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12); ctx.fill();
      ctx.fillStyle = '#f2e6b8'; ctx.beginPath(); ctx.roundRect(x + 7, y + 7, w - 14, h - 16, 8); ctx.fill();
      ctx.fillStyle = 'rgba(232,200,90,0.6)';
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + 14 + ((k * 23) % (w - 28)), y + 14 + ((k * 13) % (h - 28)), 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(x + w / 2, y + h / 2 - 4); ctx.rotate(t * 0.8);
      ctx.fillStyle = '#5a6068'; ctx.fillRect(-w * 0.3, -2, w * 0.6, 4); ctx.restore();
      return true;
    }
    case 'cheesepress': {
      ctx.fillStyle = '#6a7078'; ctx.fillRect(x + 4, y + 2, w - 8, 6); ctx.fillRect(x + 6, y + 2, 4, h - 6); ctx.fillRect(x + w - 10, y + 2, 4, h - 6);
      const press = 4 + Math.abs(Math.sin(t * 0.6)) * 6;
      ctx.fillStyle = '#9aa4b0'; ctx.fillRect(x + w / 2 - 3, y + 8, 6, press);
      ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 10, w * 0.32, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x + w / 2 - w * 0.32, y + h - 18, w * 0.64, 8);
      return true;
    }
    case 'cheeserack': {
      ctx.fillStyle = '#7a5a3a';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 2, y + 6 + k * (h - 10) / 3, w - 4, 3);
      ctx.fillRect(x + 2, y + 2, 4, h - 4); ctx.fillRect(x + w - 6, y + 2, 4, h - 4);
      for (let k = 0; k < 3; k++) for (let cx = x + 12; cx < x + w - 10; cx += 16) {
        const cy = y + 4 + k * (h - 10) / 3;
        ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c8a03a'; ctx.fillRect(cx - 7, cy, 14, 2);
      }
      return true;
    }
    default:
      return false;
  }
}
