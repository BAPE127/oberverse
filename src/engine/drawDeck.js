// Life-size ships at the berths (v0.27.0), in the world's 3/4 view: the hull
// and its deck (drawn flat, under the player), and every fitting standing on
// it — funnels, hatches, containers, cranes, masts, turrets, the bridge —
// drawn as solid things the player walks around (src/systems/docks.js adds
// them as props). Plans come from src/world/shipDeck.js.
import { shade } from './drawCharacter.js';

const T = 32;
const DECK = { cargo: '#5d6862', small: '#6e747a', war: '#646d76', future: '#cdd6df', sail: '#b08458' };
const CONTAINERS = ['#c0402a', '#2a6ab0', '#e8c35a', '#3a8a5a', '#8a4ab0', '#e07a2a', '#5a6a7a'];

/** The hull outline in pixels, stern at the top, bow pointing down. inset shrinks it (for the deck). */
function hullPath(ctx, m, inset = 0) {
  const { plan, x0, y0 } = m;
  const L = [];
  const R = [];
  for (let a = 0; a < plan.Lt; a++) {
    const [c0, c1] = plan.rows[a];
    const y = (y0 + a + 0.5) * T;
    L.push([(x0 + c0) * T + inset, y]);
    R.push([(x0 + c1 + 1) * T - inset, y]);
  }
  const top = y0 * T + inset * (plan.family === 'sail' ? 1.6 : 1);
  const tip = [(x0 + plan.Bt / 2) * T, (y0 + plan.Lt) * T + T * 0.6 - inset * 1.5];
  ctx.beginPath();
  ctx.moveTo(L[0][0], top);
  if (plan.family === 'sail') ctx.quadraticCurveTo(L[0][0], top - T * 0.3, (L[0][0] + R[0][0]) / 2, top - T * 0.35);
  for (let i = 0; i < L.length; i++) {
    const n = L[i + 1] || tip;
    ctx.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + n[0]) / 2, (L[i][1] + n[1]) / 2);
  }
  ctx.lineTo(tip[0], tip[1]);
  for (let i = R.length - 1; i >= 0; i--) {
    const n = R[i - 1] || [R[0][0], top];
    ctx.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + n[0]) / 2, (R[i][1] + n[1]) / 2);
  }
  if (plan.family === 'sail') ctx.quadraticCurveTo(R[0][0], top - T * 0.3, (L[0][0] + R[0][0]) / 2, top - T * 0.35);
  ctx.lineTo(R[0][0], top);
  ctx.closePath();
}

/** A moored ship's hull, deck and mooring lines (drawn flat, before anything stands on it). */
export function drawMooredHull(ctx, m, opts = {}) {
  const { plan, x0, y0, look, side, pier } = m;
  const t = opts.time || 0;
  const color = look.color || '#4a4a52';
  const trim = look.trim || '#e8e2d4';
  const bob = Math.sin(t * 0.9 + x0) * 0.8;
  ctx.save();
  ctx.translate(0, bob);
  // its shadow and the water stirring along the waterline
  ctx.save();
  ctx.translate(5, 7);
  ctx.fillStyle = 'rgba(8,30,50,0.35)';
  hullPath(ctx, m);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,245,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.lineDashOffset = -t * 8;
  hullPath(ctx, m, -3);
  ctx.stroke();
  ctx.setLineDash([]);
  // topsides
  const g = ctx.createLinearGradient(x0 * T, 0, (x0 + plan.Bt) * T, 0);
  g.addColorStop(0, shade(color, -18)); g.addColorStop(0.5, shade(color, 10)); g.addColorStop(1, shade(color, -22));
  ctx.fillStyle = g;
  hullPath(ctx, m);
  ctx.fill();
  ctx.strokeStyle = shade(color, -40);
  ctx.lineWidth = 2;
  ctx.stroke();
  // the sheer stripe
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.5;
  hullPath(ctx, m, 4);
  ctx.stroke();
  // the deck
  const deck = DECK[plan.family] || DECK.cargo;
  ctx.save();
  hullPath(ctx, m, 9);
  ctx.fillStyle = plan.family === 'future' ? deck : look.coating ? shade(deck, -30) : deck;
  ctx.fill();
  ctx.clip();
  if (plan.family === 'sail') {
    // planks running fore and aft, butt joints staggered
    for (let x = x0 * T; x < (x0 + plan.Bt) * T; x += 7) {
      ctx.fillStyle = 'rgba(60,35,15,0.25)';
      ctx.fillRect(x, y0 * T, 1, (plan.Lt + 1) * T);
      for (let y = y0 * T + ((x / 7) % 4) * 18; y < (y0 + plan.Lt + 1) * T; y += 72) ctx.fillRect(x, y, 7, 1);
    }
  } else {
    // steel plate, welded: the plate seams and a scatter of rust
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1;
    for (let y = y0 * T; y < (y0 + plan.Lt + 1) * T; y += T * 1.5) { ctx.beginPath(); ctx.moveTo(x0 * T, y); ctx.lineTo((x0 + plan.Bt) * T, y); ctx.stroke(); }
    for (let x = x0 * T; x < (x0 + plan.Bt) * T; x += T * 1.25) { ctx.beginPath(); ctx.moveTo(x, y0 * T); ctx.lineTo(x, (y0 + plan.Lt + 1) * T); ctx.stroke(); }
    // a painted walkway down each side
    ctx.fillStyle = plan.family === 'future' ? 'rgba(74,216,232,0.18)' : 'rgba(80,140,90,0.28)';
    for (let a = 1; a < plan.Lt - 1; a++) {
      const [c0, c1] = plan.rows[a];
      ctx.fillRect((x0 + c0 + 1) * T + 2, (y0 + a) * T, 6, T);
      ctx.fillRect((x0 + c1) * T - 8, (y0 + a) * T, 6, T);
    }
    ctx.fillStyle = 'rgba(140,70,30,0.12)';
    for (let k = 0; k < plan.Lt * 2; k++) { const rx = (x0 + ((k * 37) % (plan.Bt * 10)) / 10) * T; const ry = (y0 + ((k * 53) % (plan.Lt * 10)) / 10) * T; ctx.beginPath(); ctx.arc(rx, ry, 3 + (k % 3), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  // the rail: stanchions and a top rail just inside the bulwark
  ctx.strokeStyle = plan.family === 'sail' ? '#6a4a2a' : 'rgba(235,235,230,0.85)';
  ctx.lineWidth = 1.5;
  hullPath(ctx, m, 8);
  ctx.stroke();
  // the bow: anchor windlass and the hawse pipes
  const bowY = (y0 + plan.bowRow) * T;
  const cx = (x0 + plan.Bt / 2) * T;
  ctx.fillStyle = '#2a2e34';
  for (const dx of [-T * 0.45, T * 0.45]) { ctx.beginPath(); ctx.arc(cx + dx, bowY + T * 0.5, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#3a3e44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - T * 0.45, bowY + T * 0.5); ctx.lineTo(cx - T * 0.2, bowY + T * 1.3); ctx.moveTo(cx + T * 0.45, bowY + T * 0.5); ctx.lineTo(cx + T * 0.2, bowY + T * 1.3); ctx.stroke();
  // bollards fore and aft, and the lines to the pier
  const rail = side === 0 ? (x0 + plan.Bt) * T - 10 : x0 * T + 10;
  const pierX = side === 0 ? pier * T + 6 : (pier + 2) * T - 6;
  ctx.strokeStyle = '#d8c8a0';
  ctx.lineWidth = 1.5;
  for (const a of [1.2, plan.Lt * 0.62]) {
    const y = (y0 + a) * T;
    ctx.fillStyle = '#1e2024';
    ctx.beginPath(); ctx.arc(rail, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rail, y); ctx.quadraticCurveTo((rail + pierX) / 2, y + 10, pierX, y + T * 0.8); ctx.stroke();
  }
  ctx.restore();
}

// ======================================================================= standing on the deck
/** A 3/4 box: the top face lifted by hh, the front (south) face below it. */
function box3(ctx, x, y, w, h, hh, top, front, edge = 'rgba(0,0,0,0.3)') {
  ctx.fillStyle = front;
  ctx.fillRect(x, y + h - hh, w, hh);
  ctx.fillStyle = top;
  ctx.fillRect(x, y - hh, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y - hh + 0.5, w - 1, h - 1);
  ctx.strokeRect(x + 0.5, y + h - hh + 0.5, w - 1, hh - 1);
}

function cylinder(ctx, cx, by, r, hh, body, top, band) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx + 3, by + 2, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body;
  ctx.fillRect(cx - r, by - hh, r * 2, hh);
  ctx.beginPath(); ctx.ellipse(cx, by, r, r * 0.5, 0, 0, Math.PI); ctx.fill();
  if (band) { ctx.fillStyle = band; ctx.fillRect(cx - r, by - hh * 0.62, r * 2, hh * 0.16); }
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.ellipse(cx, by - hh, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - r * 0.7, by - hh, r * 0.25, hh);
}

function smoke(ctx, cx, top, t, seed, colour = '90,90,96') {
  for (let k = 0; k < 5; k++) {
    const ph = (t * 0.35 + k / 5 + seed * 0.17) % 1;
    ctx.fillStyle = `rgba(${colour},${0.32 * (1 - ph)})`;
    ctx.beginPath(); ctx.arc(cx + ph * 26 + Math.sin(ph * 6) * 4, top - ph * 46, 5 + ph * 12, 0, Math.PI * 2); ctx.fill();
  }
}

/** One fitting on a moored ship's deck (a 'deckpart' prop). */
export function drawDeckPart(ctx, p, opts = {}) {
  const t = opts.time || 0;
  const x = p.x * T;
  const y = p.y * T;
  const w = p.w * T;
  const h = p.h * T;
  const cx = x + w / 2;
  const by = y + h - 4;
  const look = p.look || {};
  const color = look.color || '#4a4a52';
  const trim = look.trim || '#e8e2d4';
  const seed = p.slot || 0;
  switch (p.key) {
    case 'funnel': case 'ecofunnel': case 'turbine': {
      box3(ctx, x + 3, y + 3, w - 6, h - 6, 8, shade(color, 12), shade(color, -12));
      const stacks = p.key === 'turbine' ? [-w * 0.2, w * 0.2] : [0];
      const r = p.key === 'turbine' ? Math.min(w, h) * 0.17 : Math.min(w, h) * 0.26;
      const hh = p.key === 'ecofunnel' ? T * 1.3 : p.key === 'turbine' ? T * 1.9 : T * 1.6;
      for (const dx of stacks) {
        cylinder(ctx, cx + dx, by - 6, r, hh, p.key === 'ecofunnel' ? '#e8eee8' : trim, '#16181c', p.key === 'ecofunnel' ? '#3a9a5a' : '#f2f0ea');
        if (p.key !== 'ecofunnel' || Math.sin(t) > -0.5) smoke(ctx, cx + dx, by - 6 - hh, t, seed + dx, p.key === 'ecofunnel' ? '220,230,220' : p.key === 'turbine' ? '130,115,100' : '90,90,96');
      }
      break;
    }
    case 'fusion': case 'core': {
      box3(ctx, x + 4, y + 4, w - 8, h - 8, T * 0.5, '#c8d0da', '#9aa4b0');
      ctx.save();
      ctx.shadowColor = p.key === 'fusion' ? '#5ad8ff' : '#ffb84a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = p.key === 'fusion' ? `rgba(90,216,255,${0.65 + 0.35 * Math.sin(t * 4)})` : `rgba(255,184,74,${0.65 + 0.35 * Math.sin(t * 3)})`;
      ctx.beginPath(); ctx.arc(cx, y + h / 2 - T * 0.5, Math.min(w, h) * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, y + h / 2 - T * 0.5, Math.min(w, h) * 0.3, t * 2, t * 2 + 4.6); ctx.stroke();
      break;
    }
    case 'generator': case 'turbogen': {
      box3(ctx, x + 3, y + 3, w - 6, h - 6, T * (p.key === 'turbogen' ? 0.7 : 0.55), '#8a9098', '#6a7078');
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 8, y + h - T * 0.5 + k * 4, w - 16, 2);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#1a1a1a' : '#f2c14e'; ctx.fillRect(x + 3 + (k * (w - 6)) / 6, y + h - 7, (w - 6) / 6, 4); }
      cylinder(ctx, x + w - 10, y + 10, 3, T * 0.9, '#3a3c40', '#16181c');
      break;
    }
    case 'hatch': case 'hatch2': case 'bulk': {
      const hh = p.key === 'hatch' ? 7 : 10;
      box3(ctx, x + 3, y + 3, w - 6, h - 6, hh, shade(trim === '#e8e2d4' ? '#4a6a5a' : trim, -30), shade(color, -25));
      const panels = Math.max(1, Math.round((h - 6) / 18));
      for (let k = 0; k < panels; k++) {
        const py = y + 3 - hh + (k * (h - 6)) / panels;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 5, py + 2, w - 10, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 5, py + (h - 6) / panels - 2, w - 10, 2);
        for (let rx = x + 9; rx < x + w - 6; rx += 9) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(rx, py + 3, 1, (h - 6) / panels - 5); }
      }
      if (p.key === 'bulk') {
        ctx.fillStyle = '#7a5a3a';
        ctx.beginPath(); ctx.ellipse(cx, y + h / 2 - hh, w * 0.32, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,180,0.15)';
        ctx.beginPath(); ctx.ellipse(cx - 4, y + h / 2 - hh - 4, w * 0.15, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'containers': {
      // stacked three high: each tier lifted by 9 px; corrugated sides
      const cols = Math.max(1, Math.round((w - 4) / 24));
      const rows = Math.max(1, Math.round((h - 4) / 40));
      const cw = (w - 4) / cols;
      const ch = (h - 4) / rows;
      for (let tier = 0; tier < 3; tier++) {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (tier === 2 && (r + c + seed) % 3 === 0) continue;
          const col = CONTAINERS[(seed * 5 + r * 3 + c * 2 + tier) % CONTAINERS.length];
          const bx = x + 2 + c * cw;
          const byy = y + 2 + r * ch - tier * 9;
          box3(ctx, bx + 1, byy + 1, cw - 2, ch - 2, 9, shade(col, 12), shade(col, -18), 'rgba(0,0,0,0.4)');
          ctx.fillStyle = 'rgba(0,0,0,0.14)';
          for (let k = 1; k < 5; k++) ctx.fillRect(bx + 1 + ((cw - 2) * k) / 5, byy + ch - 11, 1, 9);
        }
      }
      break;
    }
    case 'reefer': {
      box3(ctx, x + 3, y + 3, w - 6, h - 6, T * 0.6, '#eef2f6', '#d0d8e0');
      ctx.fillStyle = '#4ad8e8';
      ctx.fillRect(x + 3, y + h - 3 - T * 0.35, w - 6, 3);
      for (let k = 0; k < Math.max(1, Math.round((h - 6) / 28)); k++) {
        const fx = cx;
        const fy = y + 14 + k * 28 - T * 0.6;
        ctx.fillStyle = '#aab4c0'; ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a5460'; ctx.lineWidth = 1.5;
        for (let b = 0; b < 3; b++) { const a = t * 7 + b * 2.1 + k; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * 7, fy + Math.sin(a) * 7); ctx.stroke(); }
      }
      break;
    }
    case 'crane': {
      cylinder(ctx, cx, by - 4, Math.min(w, h) * 0.22, T * 0.9, '#e8b43a', '#c8941a');
      box3(ctx, cx - 8, by - 4 - T * 0.9 - 6, 16, 12, 10, '#f2f0ea', '#cfd4da');
      const ang = 2.2 + Math.sin(t * 0.3 + seed) * 0.25;
      const len = T * 2.6;
      const bx = cx + Math.cos(ang) * len;
      const bty = by - T * 1.2 + Math.sin(ang) * len * 0.6 - T * 0.6;
      ctx.strokeStyle = '#e8b43a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, by - T * 1.1); ctx.lineTo(bx, bty); ctx.stroke();
      ctx.strokeStyle = '#a07a1a'; ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const f = k / 8; ctx.beginPath(); ctx.moveTo(cx + (bx - cx) * f - 2, by - T * 1.1 + (bty - by + T * 1.1) * f); ctx.lineTo(cx + (bx - cx) * (f + 0.125) + 2, by - T * 1.1 + (bty - by + T * 1.1) * (f + 0.125)); ctx.stroke(); }
      ctx.strokeStyle = '#2a2a2e'; ctx.beginPath(); ctx.moveTo(bx, bty); ctx.lineTo(bx, bty + T * 0.9); ctx.stroke();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(bx - 3, bty + T * 0.9, 6, 5);
      break;
    }
    case 'cabins': {
      box3(ctx, x + 3, y + 3, w - 6, h - 6, T * 0.8, '#e8e4dc', '#f2f0ea');
      ctx.fillStyle = trim; ctx.fillRect(x + 3, y + 3 - T * 0.8, w - 6, 4);
      for (let px = x + 9; px < x + w - 8; px += 11) { ctx.fillStyle = opts.night ? '#ffd88a' : '#4a6a8a'; ctx.beginPath(); ctx.arc(px, y + h - T * 0.45, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let vx = x + 10; vx < x + w - 10; vx += 18) ctx.fillRect(vx, y + 8 - T * 0.8, 6, 6);
      break;
    }
    case 'pod': {
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath(); ctx.roundRect(x + 4, y + 4 - T * 0.6, w - 8, h - 8 + T * 0.6, 10); ctx.fill();
      ctx.save(); ctx.shadowColor = '#4ad8e8'; ctx.shadowBlur = 10; ctx.strokeStyle = '#4ad8e8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x + 8, y + 8 - T * 0.6, w - 16, h - 16 + T * 0.6, 8); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.moveTo(cx, y + h / 2 - T * 0.5); ctx.lineTo(cx + 7, y + h / 2 - T * 0.2); ctx.lineTo(cx - 7, y + h / 2 - T * 0.2); ctx.fill();
      break;
    }
    case 'navmast': case 'radar': case 'antenna': case 'command': case 'crowsnest': {
      const tall = { navmast: 1.9, radar: 1.7, antenna: 1.8, command: 1.4, crowsnest: 2.6 }[p.key] * T;
      if (p.key === 'command') box3(ctx, x + 3, y + 3, w - 6, h - 6, T * 0.7, shade(color, 18), shade(color, 4));
      else if (p.key === 'navmast') box3(ctx, cx - 9, by - 14, 18, 14, 12, '#f2f0ea', '#dcd8d0');
      const base = p.key === 'command' ? by - T * 0.7 : by - 10;
      ctx.strokeStyle = p.key === 'crowsnest' ? '#6a4a2a' : '#c8ccd2';
      ctx.lineWidth = p.key === 'crowsnest' ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, base - tall); ctx.stroke();
      if (p.key === 'radar') {
        ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx - 5, base - (tall * k) / 4); ctx.lineTo(cx + 5, base - (tall * k) / 4 + 6); ctx.stroke(); }
        const c = Math.cos(t * 3 + seed);
        ctx.fillStyle = '#e8eef4';
        ctx.fillRect(cx - 16 * Math.abs(c), base - tall - 3, 32 * Math.abs(c) + 1, 5);
      } else if (p.key === 'antenna' || p.key === 'command') {
        ctx.strokeStyle = '#2a3440'; ctx.lineWidth = 1;
        for (const dx of [-7, 7]) { ctx.beginPath(); ctx.moveTo(cx + dx, base); ctx.lineTo(cx + dx * 1.4, base - tall * 0.8); ctx.stroke(); }
        ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.ellipse(cx - 9, base - tall * 0.55, 6, 4, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.arc(cx, base - tall, 2.5, 0, Math.PI * 2); ctx.fill();
        if (p.key === 'command') { ctx.fillStyle = trim; ctx.fillRect(cx, base - tall, 10, 7); }
      } else if (p.key === 'crowsnest') {
        ctx.fillStyle = '#7a5a3a';
        ctx.beginPath(); ctx.ellipse(cx, base - tall * 0.82, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(cx - 9, base - tall * 0.75); ctx.lineTo(cx + 9, base - tall * 0.75); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 3 + seed) > 0 ? '#ffeaa0' : '#a09060';
        ctx.beginPath(); ctx.arc(cx, base - tall, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e83a3a'; ctx.beginPath(); ctx.arc(cx - 9, base - tall * 0.75, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3ae86a'; ctx.beginPath(); ctx.arc(cx + 9, base - tall * 0.75, 2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'qsensor': case 'aegis': {
      cylinder(ctx, cx, by - 4, 6, T * 0.6, '#9aa4b0', '#c8d0da');
      const r = Math.min(w, h) * (p.key === 'aegis' ? 0.4 : 0.32);
      const g = ctx.createRadialGradient(cx - r * 0.3, by - T * 0.6 - r - r * 0.3, 1, cx, by - T * 0.6 - r, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b8c4d0');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, by - T * 0.6 - r, r, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.shadowColor = p.key === 'aegis' ? '#4a8ae8' : '#b04ae8'; ctx.shadowBlur = 12;
      ctx.strokeStyle = p.key === 'aegis' ? 'rgba(74,138,232,0.8)' : 'rgba(176,74,232,0.75)'; ctx.lineWidth = 2;
      const ph = (t * 0.7) % 1; ctx.globalAlpha = 1 - ph;
      ctx.beginPath(); ctx.arc(cx, by - T * 0.6 - r, r * (1 + ph), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      break;
    }
    case 'turret': case 'railgun': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 3, by, w * 0.4, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(color, 12);
      ctx.beginPath(); ctx.ellipse(cx, by - 8, w * 0.38, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      box3(ctx, cx - w * 0.28, y + h * 0.25, w * 0.56, h * 0.5, 10, shade(color, 20), shade(color, -6));
      const aim = Math.sin(t * 0.4 + seed) * 0.25 + Math.PI / 2;
      ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = p.key === 'railgun' ? 3 : 4;
      for (const dx of p.key === 'railgun' ? [-3, 3] : [-4, 4]) { ctx.beginPath(); ctx.moveTo(cx + dx, y + h * 0.5 - 10); ctx.lineTo(cx + dx + Math.cos(aim) * h * 0.9, y + h * 0.5 - 10 + Math.sin(aim) * h * 0.9); ctx.stroke(); }
      if (p.key === 'railgun') { ctx.save(); ctx.shadowColor = '#5ad8ff'; ctx.shadowBlur = 8; ctx.strokeStyle = `rgba(90,216,255,${0.6 + 0.4 * Math.sin(t * 5)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, y + h * 0.5 - 10); ctx.lineTo(cx + Math.cos(aim) * h * 0.85, y + h * 0.5 - 10 + Math.sin(aim) * h * 0.85); ctx.stroke(); ctx.restore(); }
      break;
    }
    case 'missile': {
      box3(ctx, x + 4, y + 4, w - 8, h - 8, 10, shade(color, 10), shade(color, -10));
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let gy = y + 7 - 10; gy < y + h - 14; gy += 9) for (let gx = x + 8; gx < x + w - 10; gx += 9) ctx.fillRect(gx, gy, 6, 6);
      break;
    }
    case 'decoy': {
      box3(ctx, x + 6, y + 8, w - 12, h - 14, 6, shade(color, 6), shade(color, -12));
      ctx.fillStyle = '#3a3c40';
      for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(x + 10 + k * 5, y + h / 2 - 4); ctx.rotate(-0.6); ctx.fillRect(-2, -12, 4, 12); ctx.restore(); }
      break;
    }
    case 'sandbags': {
      ctx.fillStyle = '#b8a070';
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 10, y + h / 2 + Math.sin(a) * 9, 6, 4, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(cx, y + h / 2 - 2, 14, 3);
      break;
    }
    case 'cannon': {
      const dir = p.east ? 1 : -1;
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x + 8, y + 8, w - 16, h - 14);
      ctx.fillStyle = '#121214';
      for (const wy of [y + 10, y + h - 8]) { ctx.beginPath(); ctx.arc(x + 9, wy, 3, 0, Math.PI * 2); ctx.arc(x + w - 9, wy, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(dir > 0 ? cx : cx - 18, y + h / 2 - 3, 18, 6);
      break;
    }
    case 'mast': case 'topsail': {
      // the mast in its partners, yards across with the sails furled — and set, catching the wind
      const tall = (p.key === 'mast' ? 3.4 : 2.6) * T;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 4, by, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - tall); ctx.stroke();
      const sails = p.key === 'mast' ? 3 : 2;
      for (let k = 0; k < sails; k++) {
        const sy = by - T * 0.6 - (k * (tall - T * 0.6)) / sails;
        const sw = (look.hull === 'schooner' ? 1.4 : 2.2 - k * 0.4) * T;
        const billow = 6 + Math.sin(t * 1.2 + seed + k) * 2;
        ctx.fillStyle = '#efe6d0';
        ctx.beginPath();
        ctx.moveTo(cx - sw / 2, sy - (tall / sails) * 0.8);
        ctx.lineTo(cx + sw / 2, sy - (tall / sails) * 0.8);
        ctx.quadraticCurveTo(cx + sw / 2 + billow, sy - (tall / sails) * 0.4, cx + sw / 2, sy);
        ctx.lineTo(cx - sw / 2, sy);
        ctx.quadraticCurveTo(cx - sw / 2 + billow, sy - (tall / sails) * 0.4, cx - sw / 2, sy - (tall / sails) * 0.8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,100,70,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - sw / 2 - 4, sy - (tall / sails) * 0.8); ctx.lineTo(cx + sw / 2 + 4, sy - (tall / sails) * 0.8); ctx.stroke();
      }
      ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(cx, by - tall); ctx.lineTo(cx + 14, by - tall + 4); ctx.lineTo(cx, by - tall + 8); ctx.fill();
      break;
    }
    case 'sonar': case 'plating': case 'armour': case 'coating': {
      // fittings below the waterline or in the hull: an access plate on deck
      ctx.fillStyle = shade(DECK.cargo, -18);
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (const [dx, dy] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    default:
      box3(ctx, x + 4, y + 4, w - 8, h - 8, 10, '#8a9098', '#6a7078');
  }
}

/** The bridge / deckhouse on a moored ship. */
export function drawDeckhouse(ctx, p, opts = {}) {
  const x = p.x * T;
  const y = p.y * T;
  const w = p.w * T;
  const h = p.h * T;
  const t = opts.time || 0;
  const look = p.look || {};
  const war = p.family === 'war';
  const future = p.family === 'future';
  const wall = war ? shade(look.color || '#6f7f8f', 14) : future ? '#e8eef4' : '#f2f0ea';
  const tiers = war ? 3 : future ? 2 : Math.max(2, Math.min(4, Math.round(p.h * 0.9)));
  const th = T * 0.55;
  const hh = tiers * th;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 6, y + 6, w, h);
  for (let k = 0; k < tiers; k++) {
    const inset = k * (war ? 5 : 2);
    box3(ctx, x + inset, y + inset * 0.5, w - inset * 2, h - inset, th * (k + 1), shade(wall, -k * 3), shade(wall, -10 - k * 3), 'rgba(0,0,0,0.22)');
  }
  // windows along the front: the wheelhouse on top is all glass
  const fy = y + h - hh;
  for (let k = 0; k < tiers; k++) {
    const ty = fy + k * th + th * 0.25;
    const top = k === 0;
    const glass = ctx.createLinearGradient(0, ty, 0, ty + th * 0.4);
    glass.addColorStop(0, future ? '#5ad8ff' : '#6a9ac0'); glass.addColorStop(1, '#1a3a5a');
    ctx.fillStyle = opts.night && !top ? '#ffd88a' : glass;
    if (top) ctx.fillRect(x + 6, ty, w - 12, th * 0.45);
    else for (let wx = x + 8; wx < x + w - 10; wx += 13) ctx.fillRect(wx, ty, 8, th * 0.35);
  }
  // bridge wings and a mast with its lights on the roof
  if (!war && !future) {
    ctx.fillStyle = wall;
    ctx.fillRect(x - 8, fy - th * 0.1, w + 16, 5);
    ctx.fillStyle = '#e8641e';
    ctx.beginPath(); ctx.ellipse(x - 4, fy + th * 1.4, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w + 4, fy + th * 1.4, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  const mx = x + w / 2;
  const roof = y - hh + h * 0.3;
  ctx.strokeStyle = war ? '#2a3440' : '#cfd4da';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, roof); ctx.lineTo(mx, roof - T * 1.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx - 10, roof - T); ctx.lineTo(mx + 10, roof - T); ctx.stroke();
  const c = Math.cos(t * 2.5);
  ctx.fillStyle = '#e8eef4'; ctx.fillRect(mx - 14 * Math.abs(c), roof - T * 1.3 - 3, 28 * Math.abs(c) + 1, 4);
  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#fff6c0' : '#c0b080'; ctx.beginPath(); ctx.arc(mx, roof - T * 1.35, 2.5, 0, Math.PI * 2); ctx.fill();
  // the door
  if (p.face === 'fore') {
    ctx.fillStyle = '#4a5460';
    ctx.fillRect(mx - 7, y + h - th * 0.95, 14, th * 0.95);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(mx + 3, y + h - th * 0.5, 2, 2);
  } else {
    ctx.fillStyle = '#4a5460';
    ctx.fillRect(mx - 7, y - hh + 2, 14, 6);
  }
}

/** The ship's wheel (sailing ships keep it on deck; everyone else has it in the wheelhouse). */
export function drawShipWheel(ctx, p, opts = {}) {
  const x = p.x * T + T / 2;
  const y = p.y * T + T / 2;
  ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - 3, y - 6, 6, 14);
  ctx.save();
  ctx.translate(x, y - 12);
  ctx.rotate(Math.sin((opts.time || 0) * 0.5) * 0.3);
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke(); }
  ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawLogbook(ctx, p) {
  const x = p.x * T;
  const y = p.y * T;
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 4, y + 10, 24, 18);
  ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x + 4, y + 26, 24, 4);
  ctx.fillStyle = '#7a2a24'; ctx.fillRect(x + 7, y + 4, 18, 14);
  ctx.fillStyle = '#efe6d0'; ctx.fillRect(x + 9, y + 6, 14, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 11, y + 8 + k * 2, 10, 1);
}

export function drawGangway(ctx, p) {
  const x = p.x * T;
  const y = p.y * T;
  const w = p.w * T;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + 8, w, T - 10);
  ctx.fillStyle = '#9a8a72'; ctx.fillRect(x, y + 6, w, T - 12);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let k = x + 4; k < x + w; k += 6) ctx.fillRect(k, y + 6, 1, T - 12);
  ctx.strokeStyle = '#d8d4c8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x + w, y + 5); ctx.moveTo(x, y + T - 5); ctx.lineTo(x + w, y + T - 5); ctx.stroke();
}

export function drawCompanionway(ctx, p) {
  const x = p.x * T;
  const y = p.y * T;
  ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
  ctx.fillStyle = '#1a1210'; ctx.fillRect(x + 7, y + 7, T - 14, T - 14);
  ctx.fillStyle = '#8a6a4a';
  for (let k = 0; k < 3; k++) ctx.fillRect(x + 8, y + 9 + k * 5, T - 16, 2);
}
