// Ships, top-down (v0.21.0): the stylised hulls of the logistics fleet, drawn
// at the Yards berths and in the logistics terminal. A ship's look is data
// ({ hull, color, trim, len } — len in tiles), so a ship drawn after loading
// always looks the same, and the shipyard can mix and match later.
import { shade } from './drawCharacter.js';

const T = 32;

/** The hull outline, bow to the right (+x), centred on the origin. */
function hullPath(ctx, hull, L, B) {
  ctx.beginPath();
  if (hull === 'warship' || hull === 'battleship') {
    // a long, sharp bow and a square transom
    ctx.moveTo(L / 2, 0);
    ctx.quadraticCurveTo(L * 0.2, -B / 2, -L * 0.1, -B / 2);
    ctx.lineTo(-L / 2, -B * 0.42);
    ctx.lineTo(-L / 2, B * 0.42);
    ctx.lineTo(-L * 0.1, B / 2);
    ctx.quadraticCurveTo(L * 0.2, B / 2, L / 2, 0);
  } else if (hull === 'schooner' || hull === 'brig' || hull === 'galleon' || hull === 'manowar') {
    // a sailing hull: a pointed bow, a broad rounded stern
    ctx.moveTo(L / 2, 0);
    ctx.quadraticCurveTo(L * 0.3, -B / 2, 0, -B / 2);
    ctx.quadraticCurveTo(-L / 2, -B / 2, -L / 2, 0);
    ctx.quadraticCurveTo(-L / 2, B / 2, 0, B / 2);
    ctx.quadraticCurveTo(L * 0.3, B / 2, L / 2, 0);
  } else if (hull === 'runner' || hull === 'starwake' || hull === 'skiff') {
    ctx.moveTo(L / 2, 0);
    ctx.quadraticCurveTo(L * 0.2, -B / 2, -L / 2, -B * 0.42);
    ctx.lineTo(-L / 2, B * 0.42);
    ctx.quadraticCurveTo(L * 0.2, B / 2, L / 2, 0);
  } else if (hull === 'tug' || hull === 'coaster') {
    ctx.moveTo(L / 2, 0);
    ctx.quadraticCurveTo(L / 2, -B / 2, L * 0.2, -B / 2);
    ctx.lineTo(-L / 2 + B * 0.3, -B / 2);
    ctx.quadraticCurveTo(-L / 2, -B / 2, -L / 2, 0);
    ctx.quadraticCurveTo(-L / 2, B / 2, -L / 2 + B * 0.3, B / 2);
    ctx.lineTo(L * 0.2, B / 2);
    ctx.quadraticCurveTo(L / 2, B / 2, L / 2, 0);
  } else {
    ctx.moveTo(L / 2, 0);
    ctx.lineTo(L * 0.32, -B / 2);
    ctx.lineTo(-L / 2 + 4, -B / 2);
    ctx.lineTo(-L / 2, -B * 0.38);
    ctx.lineTo(-L / 2, B * 0.38);
    ctx.lineTo(-L / 2 + 4, B / 2);
    ctx.lineTo(L * 0.32, B / 2);
    ctx.closePath();
  }
}

/**
 * Draw a ship centred at (x, y) heading `angle` (radians; 0 = east).
 * look: { hull, color, trim, len }. opts: { time, wake, lit }.
 */
export function drawShip(ctx, look, x, y, angle, opts = {}) {
  const L = (look.len || 3) * T;
  const hull = look.hull || 'freighter';
  const B = L * ({ runner: 0.24, starwake: 0.24, tug: 0.4, coaster: 0.32, skiff: 0.36, schooner: 0.24, brig: 0.26, galleon: 0.3, manowar: 0.28, warship: 0.16, battleship: 0.2 }[hull] ?? 0.22);
  const color = look.color || '#4a4a52';
  const trim = look.trim || '#e8e2d4';
  const t = opts.time || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // a gentle bob, and the water round the hull
  const bob = Math.sin(t * 1.3 + x * 0.01) * 0.6;
  ctx.translate(0, bob);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 0, L * 0.54, B * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(10,30,50,0.3)';
  ctx.save(); ctx.translate(3, 5); hullPath(ctx, hull, L, B); ctx.fill(); ctx.restore();
  // the hull and the deck
  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -45);
  ctx.lineWidth = 1.5;
  hullPath(ctx, hull, L, B); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hull === 'starwake' ? '#c9d2da' : shade(color, 28);
  ctx.save(); ctx.scale(0.86, 0.72); hullPath(ctx, hull, L, B); ctx.fill(); ctx.restore();
  // a trim line round the deck edge
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.2;
  ctx.save(); ctx.scale(0.93, 0.86); hullPath(ctx, hull, L, B); ctx.stroke(); ctx.restore();
  // the cargo and the bridge, by hull type
  const bridge = (bx, w) => {
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect(bx, -B * 0.32, w, B * 0.64);
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(bx + w - 3, -B * 0.26, 2, B * 0.52);
    ctx.fillStyle = trim;
    ctx.fillRect(bx + 1, -2, w * 0.4, 4); // funnel
  };
  if (look.parts) {
    drawParts(ctx, look, hull, L, B, color, trim, t);
  } else if (hull === 'container') {
    const cols = ['#c0402a', '#2a6ab0', '#e8c35a', '#3a8a5a', '#8a4ab0', '#e8e2d4'];
    const n = Math.floor(L / 13);
    for (let i = 0; i < n - 2; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = cols[(i * 3 + j * 5 + (look.seed || 0)) % cols.length];
      ctx.fillRect(-L / 2 + 26 + i * 12, -B * 0.36 + j * B * 0.25, 10, B * 0.22);
    }
    bridge(-L / 2 + 6, 16);
  } else if (hull === 'bulk') {
    const n = Math.floor(L / 22);
    for (let i = 0; i < n - 1; i++) {
      ctx.fillStyle = shade(color, -18);
      ctx.fillRect(-L / 2 + 26 + i * 21, -B * 0.32, 17, B * 0.64);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-L / 2 + 26 + i * 21, -1, 17, 2);
    }
    bridge(-L / 2 + 5, 15);
  } else if (hull === 'heavylift') {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(-L * 0.1 + i * L * 0.25, -B * 0.42, 5, B * 0.84);
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-L * 0.1 + i * L * 0.25 + 2, 0); ctx.lineTo(-L * 0.1 + i * L * 0.25 + L * 0.18, -B * 0.1); ctx.stroke();
    }
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(L * 0.05, -B * 0.25, L * 0.2, B * 0.5);
    bridge(-L / 2 + 6, 16);
  } else if (hull === 'freighter') {
    ctx.fillStyle = shade(color, -20);
    ctx.fillRect(-L * 0.12, -B * 0.3, L * 0.48, B * 0.6);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 1; i < 4; i++) ctx.fillRect(-L * 0.12 + (i * L * 0.48) / 4, -B * 0.3, 1.5, B * 0.6);
    bridge(-L / 2 + 6, 15);
  } else if (hull === 'starwake') {
    ctx.fillStyle = 'rgba(74,216,232,0.85)';
    ctx.fillRect(-L * 0.3, -B * 0.08, L * 0.6, B * 0.16);
    ctx.fillStyle = '#1e2a3a';
    ctx.beginPath(); ctx.ellipse(L * 0.12, 0, L * 0.12, B * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,240,255,0.6)';
    ctx.beginPath(); ctx.ellipse(L * 0.15, -B * 0.06, L * 0.06, B * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  } else if (hull === 'schooner' || hull === 'brig' || hull === 'galleon' || hull === 'manowar') {
    // masts with their sails (seen from above: yards and canvas), guns along the sides
    const masts = { schooner: 2, brig: 2, galleon: 3, manowar: 3 }[hull];
    const guns = { schooner: 1, brig: 4, galleon: 6, manowar: 10 }[hull];
    ctx.fillStyle = '#1a1a1e';
    for (let i = 0; i < guns; i++) { const x = -L * 0.35 + (i * L * 0.7) / Math.max(1, guns - 1); ctx.fillRect(x - 1.5, -B / 2 - 2, 3, 3); ctx.fillRect(x - 1.5, B / 2 - 1, 3, 3); }
    for (let i = 0; i < masts; i++) {
      const x = L * 0.25 - (i * L * 0.5) / Math.max(1, masts - 1);
      const sway = Math.sin(t * 1.1 + i) * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(x + 3, sway + 4, L * 0.06, B * 0.75, 0, 0, Math.PI * 2); ctx.fill(); // sail shadow
      ctx.fillStyle = hull === 'manowar' ? '#f2ecdc' : '#efe6d0';
      ctx.beginPath(); ctx.ellipse(x, sway, L * 0.06, B * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, -B * 0.75 + sway); ctx.lineTo(x, B * 0.75 + sway); ctx.stroke(); // the yard
      ctx.fillStyle = '#4a3220';
      ctx.beginPath(); ctx.arc(x, 0, 2, 0, Math.PI * 2); ctx.fill(); // the mast
    }
    if (hull === 'galleon' || hull === 'manowar') { ctx.fillStyle = trim; ctx.fillRect(-L / 2 + 3, -B * 0.3, L * 0.1, B * 0.6); } // the stern castle
  } else if (hull === 'warship' || hull === 'battleship') {
    // turrets fore and aft, a superstructure, a mast
    const turret = (x, r) => {
      ctx.fillStyle = shade(color, -25);
      ctx.beginPath(); ctx.arc(x, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(x, -1.5 * (r / 5), r * 1.8, 3 * (r / 5));
    };
    const big = hull === 'battleship';
    turret(L * 0.28, big ? 8 : 5);
    if (big) turret(L * 0.14, 8);
    turret(-L * 0.3, big ? 8 : 4);
    ctx.fillStyle = shade(color, 18);
    ctx.fillRect(-L * 0.18, -B * 0.32, L * 0.26, B * 0.64);
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(L * 0.04, -B * 0.24, 2.5, B * 0.48);
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.arc(-L * 0.04, 0, B * 0.14, 0, Math.PI * 2); ctx.fill(); // radar
  } else if (hull === 'skiff') {
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(-L * 0.25, -B * 0.25, L * 0.2, B * 0.5); // the outboard
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect(-L * 0.02, -B * 0.2, L * 0.16, B * 0.4);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(L * 0.2, -1, L * 0.18, 2); // the gun
  } else if (hull === 'runner') {
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect(-L * 0.05, -B * 0.24, L * 0.22, B * 0.48);
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(L * 0.13, -B * 0.2, 2.5, B * 0.4);
  } else {
    // coaster / tug: a wheelhouse amidships, a funnel, a little cargo hatch
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect(-L * 0.18, -B * 0.28, L * 0.26, B * 0.56);
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(L * 0.04, -B * 0.22, 2.5, B * 0.44);
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.arc(-L * 0.24, 0, B * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath(); ctx.arc(-L * 0.24, 0, B * 0.08, 0, Math.PI * 2); ctx.fill();
    if (hull === 'coaster') {
      ctx.fillStyle = shade(color, -22);
      ctx.fillRect(L * 0.12, -B * 0.24, L * 0.24, B * 0.48);
    } else {
      // the tug's tyres along the rail
      ctx.fillStyle = '#1a1a1e';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * L * 0.16, -B / 2, 2.5, 0, Math.PI * 2); ctx.arc(i * L * 0.16, B / 2, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // navigation lights at night
  if (opts.lit) {
    ctx.fillStyle = '#ff3a2a';
    ctx.beginPath(); ctx.arc(L * 0.25, -B / 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3aff6a';
    ctx.beginPath(); ctx.arc(L * 0.25, B / 2, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * A custom ship (v0.24.0): its parts laid out along the deck, stern to bow, in
 * the order you installed them — so two designs on the same hull look different.
 */
function drawParts(ctx, look, hull, L, B, color, trim, t) {
  const sail = ['schooner', 'brig', 'galleon', 'manowar'].includes(hull);
  const parts = look.parts;
  const x0 = sail ? -L * 0.36 : -L * 0.26;
  const x1 = L * 0.3;
  if (!sail) {
    // the bridge at the stern
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect(-L * 0.46, -B * 0.32, L * 0.14, B * 0.64);
    ctx.fillStyle = '#2a3440';
    ctx.fillRect(-L * 0.33, -B * 0.26, 2.5, B * 0.52);
  }
  parts.forEach((p, i) => {
    const x = parts.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (parts.length - 1);
    const w = Math.min(L * 0.12, (x1 - x0) / Math.max(1, parts.length) * 0.85);
    switch (p) {
      case 'mast': {
        const sway = Math.sin(t * 1.1 + i) * 1.2;
        ctx.fillStyle = '#efe6d0';
        ctx.beginPath(); ctx.ellipse(x, sway, Math.max(3, w * 0.4), B * 0.72, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, -B * 0.75 + sway); ctx.lineTo(x, B * 0.75 + sway); ctx.stroke();
        break;
      }
      case 'funnel':
        ctx.fillStyle = trim; ctx.beginPath(); ctx.ellipse(x, 0, w * 0.35, B * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1e'; ctx.beginPath(); ctx.ellipse(x, 0, w * 0.18, B * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'hatch':
        ctx.fillStyle = shade(color, -22); ctx.fillRect(x - w / 2, -B * 0.3, w, B * 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - w / 2, -1, w, 2);
        break;
      case 'containers': {
        const cols = ['#c0402a', '#2a6ab0', '#e8c35a', '#3a8a5a', '#8a4ab0'];
        for (let j = 0; j < 3; j++) { ctx.fillStyle = cols[(i + j * 2) % cols.length]; ctx.fillRect(x - w / 2, -B * 0.36 + j * B * 0.25, w, B * 0.22); }
        break;
      }
      case 'reefer':
        ctx.fillStyle = '#e8eef4'; ctx.fillRect(x - w / 2, -B * 0.3, w, B * 0.6);
        ctx.fillStyle = '#4ad8e8'; ctx.fillRect(x - w / 2, -B * 0.05, w, B * 0.1);
        break;
      case 'crane':
        ctx.fillStyle = '#e8c35a'; ctx.fillRect(x - 2, -B * 0.42, 4, B * 0.84);
        ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, -B * 0.15); ctx.stroke();
        break;
      case 'cabins':
        ctx.fillStyle = '#f2f0ea'; ctx.fillRect(x - w / 2, -B * 0.3, w, B * 0.6);
        ctx.fillStyle = '#7aa3b8'; for (let k = -1; k <= 1; k++) ctx.fillRect(x - w / 2 + 2, k * B * 0.18 - 1.5, w - 4, 3);
        break;
      case 'dome':
        ctx.fillStyle = 'rgba(160,240,255,0.85)'; ctx.beginPath(); ctx.arc(x, 0, Math.min(B * 0.28, w * 0.5), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1e2a3a'; ctx.lineWidth = 1; ctx.stroke();
        break;
      case 'radar':
        ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(x, 0, B * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(t * 2) * B * 0.2, Math.sin(t * 2) * B * 0.2); ctx.lineTo(x - Math.cos(t * 2) * B * 0.2, -Math.sin(t * 2) * B * 0.2); ctx.stroke();
        break;
      case 'antenna':
        ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, -B * 0.3); ctx.lineTo(x, B * 0.3); ctx.moveTo(x - 3, -B * 0.15); ctx.lineTo(x + 3, -B * 0.15); ctx.stroke();
        break;
      case 'decoy':
        ctx.fillStyle = '#5a5e64'; for (const k of [-1, 1]) ctx.fillRect(x - 2, k * B * 0.25 - 2, 4, 4);
        break;
      case 'guns':
        ctx.fillStyle = '#1a1a1e'; for (let k = 0; k < 3; k++) { ctx.fillRect(x - w / 2 + k * (w / 3), -B / 2 - 2, 3, 3); ctx.fillRect(x - w / 2 + k * (w / 3), B / 2 - 1, 3, 3); }
        break;
      case 'turret':
        ctx.fillStyle = shade(color, -25); ctx.beginPath(); ctx.arc(x, 0, Math.min(B * 0.3, 6), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x, -1.5, Math.min(B * 0.5, 10), 3);
        break;
      case 'missile':
        ctx.fillStyle = '#3a3e44'; ctx.fillRect(x - w / 2, -B * 0.25, w, B * 0.5);
        ctx.fillStyle = '#c0402a'; for (let k = -1; k <= 1; k += 2) ctx.fillRect(x - w / 2 + 2, k * B * 0.1 - 1, w - 4, 2);
        break;
      default:
        break;
    }
  });
}

/** A ship's name painted on a small board (screen-aligned), for berths. */
export function drawNameBoard(ctx, text, x, y) {
  ctx.save();
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = 'rgba(20,28,40,0.78)';
  ctx.fillRect(x - w / 2, y - 7, w, 14);
  ctx.fillStyle = '#f2e6c8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
