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

export const FARM_PROPS = new Set(['watertower', 'bigsign', 'silo', 'windmill', 'haybale', 'tractor', 'trough', 'crops', 'ranchfence', 'cow', 'milktank', 'milkstall', 'cheesevat', 'cheesepress', 'cheeserack']);

export function drawFarmProp(ctx, p, x, y, w, h, opts = {}) {
  const t = opts.time || 0;
  switch (p.type) {
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
        ctx.fillRect(x + 14, y, 3, h);
        ctx.fillRect(x + 12, y + 2, 7, 6);
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
