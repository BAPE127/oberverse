// Procedural drawing for terrain, buildings and props in a soft, stylised
// angled top-down look. Everything is drawn in world pixels (1 tile = 32px).
import { drawFarmProp, drawFields } from './drawFarm.js';
import { drawPixelProp } from './drawPixelProps.js';
import { drawMooredHull, drawDeckPart, drawDeckhouse, drawShipWheel, drawLogbook, drawGangway, drawCompanionway } from './drawDeck.js';
import { lightState, walkSignal } from '../world/lights.js';
import { TILE } from '../core/util.js';
import { drawFactoryProp } from './drawFactory.js';
import { hash2 } from '../core/rng.js';
import { TILE_TYPES } from '../world/tiles.js';
import { shade, rrect } from './drawCharacter.js';
import { drawDisplayCar, drawBusStop } from './drawVehicles.js';
import { CAR_MODELS } from '../content/vehicles.js';
import { drawShip, drawNameBoard } from './drawShips.js';

const T = TILE;

// ---------------------------------------------------------------- terrain
/** Render the static ground layer of a map into an offscreen canvas. */
export function buildStaticLayer(map, makeCanvas) {
  const cv = makeCanvas(map.width * T, map.height * T);
  const ctx = cv.getContext('2d');
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) drawTile(ctx, map, x, y);
  }
  // soft edges where grass meets paths and water
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) drawTileEdges(ctx, map, x, y);
  }
  if (map.kind === 'interior') drawInteriorWalls(ctx, map);
  // v0.29.1: fields and their crops are part of the ground (drawn once, not every frame)
  if (map.def?.fields) drawFields(ctx, map.def.fields.map((f) => ({ ...f, ...(map.fieldState?.[f.id] || {}) })));
  return cv;
}

function drawTile(ctx, map, x, y) {
  const ch = map.tileAt(x, y);
  const tt = TILE_TYPES[ch] || TILE_TYPES.x;
  const px = x * T;
  const py = y * T;
  const r = hash2(x, y);
  let base = tt.color;
  if (ch === 'B' || ch === 'D') base = map.kind === 'interior' ? TILE_TYPES.f.color : TILE_TYPES[','].color;
  ctx.fillStyle = r < 0.5 ? base : tt.alt || base;
  ctx.fillRect(px, py, T, T);

  switch (ch) {
    case '.': {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 3; i++) {
        const gx = px + hash2(x * 7 + i, y * 3) * T;
        const gy = py + hash2(x * 5, y * 11 + i) * T;
        ctx.fillRect(gx, gy, 1.5, 4);
      }
      if (r > 0.93) {
        ctx.fillStyle = ['#f6e27a', '#f2a7c3', '#ffffff'][Math.floor(r * 100) % 3];
        ctx.beginPath(); ctx.arc(px + 10 + r * 10, py + 12, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case ',': {
      ctx.strokeStyle = 'rgba(90,80,70,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, T / 2, T / 2);
      ctx.strokeRect(px + T / 2 + 0.5, py + T / 2 + 0.5, T / 2 - 1, T / 2 - 1);
      break;
    }
    case '=': {
      const left = map.tileAt(x - 1, y) === '=';
      const up = map.tileAt(x, y - 1) === '=';
      const down = map.tileAt(x, y + 1) === '=';
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(px + r * 20, py + hash2(y, x) * 24, 3, 2);
      // centre dashes between the two road lanes
      ctx.fillStyle = 'rgba(240,226,170,0.55)';
      if (!up && down && x % 3 === 0 && left) ctx.fillRect(px, py + T - 1.5, T * 0.55, 3);
      const right = map.tileAt(x + 1, y) === '=';
      if (left && !right && up && down && y % 3 === 0) ctx.fillRect(px - 1.5, py, 3, T * 0.55);
      break;
    }
    case ':': {
      ctx.fillStyle = 'rgba(120,90,60,0.18)';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + hash2(x + i, y) * T, py + hash2(x, y + i) * T, 2, 2);
      break;
    }
    case 's': {
      ctx.fillStyle = 'rgba(160,130,80,0.18)';
      for (let i = 0; i < 5; i++) ctx.fillRect(px + hash2(x + i * 3, y) * T, py + hash2(x, y + i * 5) * T, 1.5, 1.5);
      break;
    }
    case 'b':
    case 'p': {
      ctx.strokeStyle = 'rgba(60,35,20,0.35)';
      ctx.lineWidth = 1;
      const vertical = ch === 'b' && map.tileAt(x, y - 1) !== '~' && map.tileAt(x, y + 1) !== '~' ? false : ch === 'b';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        if (vertical) { ctx.moveTo(px, py + i * 8 + 0.5); ctx.lineTo(px + T, py + i * 8 + 0.5); }
        else { ctx.moveTo(px + i * 8 + 0.5, py); ctx.lineTo(px + i * 8 + 0.5, py + T); }
        ctx.stroke();
      }
      break;
    }
    case 'R': {
      // a grassy bank with stones: the land rises out of the map
      ctx.fillStyle = 'rgba(40,55,30,0.18)';
      ctx.fillRect(px, py + T - 6, T, 6);
      for (let i = 0; i < 3; i++) {
        const sx = px + 4 + hash2(x * 3 + i, y) * 22;
        const sy = py + 4 + hash2(x, y * 5 + i) * 18;
        ctx.fillStyle = '#8d8f84';
        ctx.beginPath(); ctx.ellipse(sx, sy, 4 + r * 3, 3 + r * 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a9aa9e';
        ctx.beginPath(); ctx.ellipse(sx - 1, sy - 1, 2 + r, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,160,80,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + hash2(x + i * 7, y + 2) * T, py + hash2(x + 3, y + i * 3) * T, 2, 4);
      break;
    }
    case 'r': {
      ctx.fillStyle = '#3f88a8';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#8d8f94';
      ctx.beginPath(); ctx.ellipse(px + 16, py + 18, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a5a7ab';
      ctx.beginPath(); ctx.ellipse(px + 13, py + 14, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'f': {
      ctx.strokeStyle = 'rgba(80,50,30,0.22)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(px, py + i * 8 + 0.5); ctx.lineTo(px + T, py + i * 8 + 0.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(px + (r * 32) | 0, py); ctx.lineTo(px + (r * 32) | 0, py + 8); ctx.stroke();
      break;
    }
    case 't': {
      ctx.strokeStyle = 'rgba(120,110,100,0.18)';
      ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      if ((x + y) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py, T, T); }
      break;
    }
    case 'g': {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(px + r * 24, py + hash2(y, x) * 24, 6, 4);
      break;
    }
    case 'm': {
      // large civic paving slabs
      ctx.strokeStyle = 'rgba(110,100,85,0.18)';
      ctx.lineWidth = 1;
      if (x % 2 === 0) { ctx.beginPath(); ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + T); ctx.stroke(); }
      if (y % 2 === 0) { ctx.beginPath(); ctx.moveTo(px, py + 0.5); ctx.lineTo(px + T, py + 0.5); ctx.stroke(); }
      break;
    }
    case 'u': {
      // grimy mud: puddles and litter
      if (r > 0.7) {
        ctx.fillStyle = 'rgba(70,80,90,0.35)';
        ctx.beginPath(); ctx.ellipse(px + 8 + r * 14, py + 10 + hash2(y, x) * 12, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(40,30,20,0.18)';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + hash2(x + i, y * 2) * T, py + hash2(x * 3, y + i) * T, 2, 2);
      if (r < 0.06) { ctx.fillStyle = 'rgba(220,210,190,0.5)'; ctx.fillRect(px + 12, py + 14, 5, 3); }
      break;
    }
    case 'c': {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      if ((x + y) % 2) ctx.fillRect(px, py, T, T);
      break;
    }
    default:
      break;
  }
}

function drawTileEdges(ctx, map, x, y) {
  const ch = map.tileAt(x, y);
  const px = x * T;
  const py = y * T;
  if (ch === '~') {
    // shoreline foam/stone lip next to land
    const landUp = map.tileAt(x, y - 1) !== '~' && map.tileAt(x, y - 1) !== 'x' && map.tileAt(x, y - 1) !== 'r';
    if (landUp && y > 0) {
      ctx.fillStyle = map.tileAt(x, y - 1) === 's' ? 'rgba(255,255,255,0.35)' : '#8b8b86';
      ctx.fillRect(px, py, T, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(px, py + 5, T, 4);
    }
    const landDown = !['~', 'x', 'r', 'b'].includes(map.tileAt(x, y + 1)) && y < map.height - 1;
    if (landDown) {
      ctx.fillStyle = '#8b8b86';
      ctx.fillRect(px, py + T - 3, T, 3);
    }
    for (const [dx, sx] of [[-1, 0], [1, T - 3]]) {
      const n = map.tileAt(x + dx, y);
      if (!['~', 'x', 'r', 'b', 'p'].includes(n) && x + dx >= 0 && x + dx < map.width) {
        ctx.fillStyle = '#8b8b86';
        ctx.fillRect(px + sx, py, 3, T);
      }
    }
  }
  if (ch === '.') {
    // grass blades overhanging adjacent paving
    ctx.fillStyle = 'rgba(70,110,60,0.35)';
    if ([',', '=', ':'].includes(map.tileAt(x, y + 1))) ctx.fillRect(px, py + T - 2, T, 2);
  }
}

function drawInteriorWalls(ctx, map) {
  const wallFace = '#e9dcc3';
  const wallTop = '#5b4a45';
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const ch = map.tileAt(x, y);
      const px = x * T;
      const py = y * T;
      if (ch === 'W') {
        if (y === 0) {
          // back wall: tall face with wainscot
          ctx.fillStyle = wallFace;
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#d2c2a5';
          ctx.fillRect(px, py + T * 0.62, T, T * 0.38);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(px, py + T * 0.62, T, 2);
          ctx.fillStyle = wallTop;
          ctx.fillRect(px, py, T, 5);
        } else {
          ctx.fillStyle = wallTop;
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
        }
      } else if (ch === 'D') {
        ctx.fillStyle = '#3d2f28';
        ctx.fillRect(px + 3, py, T - 6, T);
        ctx.fillStyle = '#8f5e3d';
        ctx.fillRect(px + 6, py + 6, T - 12, T - 10);
        ctx.fillStyle = 'rgba(255,240,200,0.18)';
        ctx.fillRect(px + 6, py + 6, T - 12, 3);
      } else if (y === 1 && map.tileAt(x, 0) === 'W') {
        // shadow cast by the back wall
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(px, py, T, 6);
      }
    }
  }
}

/** Animated water highlights for visible water tiles. */
export function drawWaterShimmer(ctx, map, view, time) {
  const x0 = Math.max(0, Math.floor(view.x / T));
  const y0 = Math.max(0, Math.floor(view.y / T));
  const x1 = Math.min(map.width - 1, Math.ceil((view.x + view.w) / T));
  const y1 = Math.min(map.height - 1, Math.ceil((view.y + view.h) / T));
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (map.tileAt(x, y) !== '~') continue;
      const r = hash2(x, y);
      const phase = (time * 0.6 + r * 6.28) % 6.28;
      const a = Math.max(0, Math.sin(phase));
      if (a < 0.15) continue;
      ctx.globalAlpha = a * 0.8;
      const px = x * T + 6 + r * 14;
      const py = y * T + 8 + hash2(y, x) * 16 + Math.sin(time + r * 3) * 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + 4, py - 2, px + 8, py);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// --------------------------------------------------------------- buildings
/**
 * @param {object} b building def
 * @param {object} opts {lit:boolean, time:number, doorOpen:boolean}
 */
/** Height in px a tower's facade rises above its footprint's bottom edge. */
export function towerHeight(b) {
  return b.tower * 14 + b.h * T * 0.55;
}

/** Flat roof with a parapet (modern/civic buildings); optional dome. */
function drawFlatRoof(ctx, b, left, right, roofTop, roofBottom) {
  const rl = left - 3;
  const rr = right + 3;
  ctx.fillStyle = shade(b.roof, -18);
  ctx.fillRect(rl, roofTop, rr - rl, roofBottom - roofTop + 4);
  ctx.fillStyle = b.roof;
  ctx.fillRect(rl + 4, roofTop + 4, rr - rl - 8, roofBottom - roofTop - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < (rr - rl) / 40; i++) ctx.fillRect(rl + 12 + i * 40, roofTop + 10, 16, 10); // vents
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(rl, roofBottom + 2, rr - rl, 3);
  if (b.dome) {
    const cx = (left + right) / 2;
    const cy = roofTop + (roofBottom - roofTop) * 0.55;
    const r = Math.min((right - left) * 0.22, 54);
    ctx.fillStyle = shade(b.trim, -10);
    ctx.fillRect(cx - r * 1.05, cy - 6, r * 2.1, 14); // drum
    ctx.fillStyle = b.dome;
    ctx.beginPath(); ctx.ellipse(cx, cy - 6, r, r * 0.95, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.18, r * 0.35, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(b.dome, -25);
    ctx.fillRect(cx - 3, cy - 6 - r * 0.95 - 14, 6, 14); // lantern
    ctx.beginPath(); ctx.arc(cx, cy - 6 - r * 0.95 - 16, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (b.pediment) {
    const cx = (left + right) / 2;
    const pw = Math.min(right - left - 20, T * 7);
    ctx.fillStyle = b.wall;
    ctx.beginPath(); ctx.moveTo(cx - pw / 2, roofBottom + 4); ctx.lineTo(cx, roofBottom - 22); ctx.lineTo(cx + pw / 2, roofBottom + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/** Slum shacks: corrugated, patched roofs and boarded-up windows. */
function drawShabby(ctx, b, left, right, roofTop, roofBottom, wallH) {
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let x = left; x < right; x += 5) { ctx.beginPath(); ctx.moveTo(x, roofTop + 2); ctx.lineTo(x, roofBottom); ctx.stroke(); }
  const r = hash2(b.x, b.y);
  ctx.fillStyle = r > 0.5 ? 'rgba(160,150,120,0.7)' : 'rgba(110,130,150,0.6)';
  ctx.fillRect(left + (right - left) * (0.2 + r * 0.4), roofTop + 6, 18, 12); // tarp patch
  ctx.fillStyle = 'rgba(150,90,50,0.55)';
  ctx.fillRect(left + 6, roofBottom - 14, 12, 9); // rust
  // boards over the windows
  const winY = roofBottom + wallH * 0.22;
  ctx.fillStyle = '#8a7050';
  for (let wx = left + 0.35 * T; wx + 0.65 * T <= right - 0.2 * T; wx += T * 1.25) {
    if (hash2(Math.floor(wx), b.y) < 0.5) continue;
    ctx.save();
    ctx.translate(wx + 0.35 * T, winY + wallH * 0.21);
    ctx.rotate(-0.25);
    ctx.fillRect(-0.45 * T, -3, 0.9 * T, 6);
    ctx.restore();
  }
}

/** A skyscraper: a tall glass-and-steel facade rising above its footprint. */
function drawTower(ctx, b, opts) {
  const left = b.x * T;
  const right = (b.x + b.w) * T;
  const bottom = (b.y + b.h) * T;
  const facadeH = b.tower * 14;
  const depth = b.h * T * 0.55;
  const faceTop = bottom - facadeH;
  const roofTop = faceTop - depth;
  const w = right - left;
  // soft ground shadow cast to the east
  ctx.fillStyle = 'rgba(20,20,40,0.14)';
  ctx.fillRect(right, bottom - b.h * T * 0.9, Math.min(facadeH * 0.15, 64), b.h * T * 0.9);
  // roof (seen from above)
  ctx.fillStyle = shade(b.roof || '#4a4f5a', -10);
  ctx.fillRect(left, roofTop, w, depth + 2);
  ctx.fillStyle = b.roof || '#4a4f5a';
  ctx.fillRect(left + 4, roofTop + 4, w - 8, depth - 6);
  const hr = hash2(b.x, b.y);
  if (b.helipad) {
    ctx.strokeStyle = '#f2efe6';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(left + w / 2, roofTop + depth / 2, Math.min(w, depth) * 0.32, Math.min(w, depth) * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f2efe6';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H', left + w / 2, roofTop + depth / 2);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(left + w * (0.15 + hr * 0.4), roofTop + 8, w * 0.25, depth * 0.4); // plant room
  }
  if (b.tower >= 18) { // antenna with a red beacon
    ctx.fillStyle = '#3a3e48';
    ctx.fillRect(left + w * 0.7, roofTop - 34, 3, 40);
    const blink = Math.sin((opts.time || 0) * 3 + hr * 10) > 0.4;
    ctx.fillStyle = blink ? '#ff4a3a' : '#7a2a24';
    ctx.beginPath(); ctx.arc(left + w * 0.7 + 1.5, roofTop - 36, 3, 0, Math.PI * 2); ctx.fill();
  }
  // facade
  ctx.fillStyle = b.wall;
  ctx.fillRect(left, faceTop, w, facadeH);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(left, faceTop, w * 0.18, facadeH); // sunlit edge
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(right - w * 0.12, faceTop, w * 0.12, facadeH);
  // window grid; at night a scatter of offices stay lit
  const cols = Math.max(2, Math.floor((w - 8) / 14));
  const cw = (w - 8) / cols;
  const lobbyH = 30;
  const night = opts.night;
  for (let row = 0; row < b.tower - 2; row++) {
    const wy = faceTop + 6 + row * 14;
    if (wy > bottom - lobbyH - 10) break;
    for (let c = 0; c < cols; c++) {
      const wx = left + 4 + c * cw;
      const lit = night && hash2(b.x * 31 + c, b.y * 17 + row) > 0.55;
      ctx.fillStyle = lit ? '#ffe2a0' : b.glass || '#8fb4c8';
      ctx.fillRect(wx + 2, wy, cw - 4, 9);
      if (!lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(wx + 2, wy, 3, 9);
      }
    }
  }
  // floor bands
  ctx.fillStyle = b.trim;
  for (let fy = faceTop; fy < bottom - lobbyH; fy += 14 * 4) ctx.fillRect(left, fy, w, 2);
  ctx.fillRect(left, faceTop, w, 3);
  // lobby
  ctx.fillStyle = shade(b.trim, -15);
  ctx.fillRect(left, bottom - lobbyH, w, lobbyH);
  ctx.fillStyle = night ? 'rgba(255,220,150,0.55)' : 'rgba(170,200,215,0.6)';
  ctx.fillRect(left + 6, bottom - lobbyH + 6, w - 12, lobbyH - 10);
  ctx.fillStyle = b.trim;
  for (let px = left + 6; px < right - 6; px += 18) ctx.fillRect(px, bottom - lobbyH + 6, 2, lobbyH - 10);
  if (b.door) {
    const dx = b.door.x * T + 4;
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(dx - 2, bottom - lobbyH + 4, T - 4, lobbyH - 4);
    ctx.fillStyle = night ? 'rgba(255,214,140,0.7)' : 'rgba(150,185,205,0.8)';
    ctx.fillRect(dx + 1, bottom - lobbyH + 7, (T - 10) / 2, lobbyH - 9);
    ctx.fillRect(dx + 3 + (T - 10) / 2, bottom - lobbyH + 7, (T - 10) / 2, lobbyH - 9);
  }
  ctx.fillStyle = 'rgba(120,110,100,0.8)';
  ctx.fillRect(left, bottom, w, 3);
  if (b.sign) {
    ctx.font = 'bold 9px "Trebuchet MS", "Segoe UI", sans-serif';
    const tw = ctx.measureText(b.sign).width + 10;
    const sx = left + (w - tw) / 2;
    const sy = bottom - lobbyH - 15;
    ctx.fillStyle = b.signColor || '#1e2430';
    rrect(ctx, sx, sy, tw, 13, 2);
    ctx.fill();
    ctx.fillStyle = '#f2efe6';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.sign, sx + 5, sy + 7);
  }
}

export function drawBuilding(ctx, b, opts) {
  if (b.round) return drawLighthouse(ctx, b, opts);
  if (b.tower) return drawTower(ctx, b, opts);
  const left = b.x * T;
  const right = (b.x + b.w) * T;
  const top = b.y * T;
  const bottom = (b.y + b.h) * T;
  const wallH = Math.min(1.7 * T, (b.h - 1) * T * 0.45);
  const roofTop = top - 0.55 * T;
  const roofBottom = bottom - wallH;

  // ground shadow
  ctx.fillStyle = 'rgba(25,25,45,0.22)';
  ctx.fillRect(left + 6, roofBottom, right - left + 4, wallH + 6);

  // front wall
  ctx.fillStyle = b.wall;
  ctx.fillRect(left, roofBottom, right - left, wallH);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(left, bottom - 6, right - left, 6);
  ctx.fillStyle = b.trim;
  ctx.fillRect(left, bottom - 3, right - left, 3);

  // windows
  const doorX = b.door ? b.door.x * T : -999;
  const winY = roofBottom + wallH * 0.22;
  const winH = wallH * 0.42;
  for (let wx = left + 0.35 * T; wx + 0.65 * T <= right - 0.2 * T; wx += T * 1.25) {
    if (wx + 0.7 * T > doorX - 4 && wx < doorX + T + 4) continue;
    ctx.fillStyle = b.trim;
    ctx.fillRect(wx - 2, winY - 2, 0.7 * T + 4, winH + 4);
    ctx.fillStyle = opts.lit ? '#ffd88a' : '#7aa3b8';
    ctx.fillRect(wx, winY, 0.7 * T, winH);
    if (!opts.lit) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(wx + 2, winY + 2, 4, winH - 4);
    }
    ctx.fillStyle = b.trim;
    ctx.fillRect(wx + 0.35 * T - 1, winY, 2, winH);
  }

  // pilasters between the windows
  if (b.columns) {
    for (let cx = left + 2; cx < right - 4; cx += T * 1.25) {
      if (cx + 8 > doorX - 4 && cx < doorX + T + 4) continue;
      ctx.fillStyle = '#f7f4ee';
      ctx.fillRect(cx, roofBottom + 2, 7, wallH - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(cx + 5, roofBottom + 2, 2, wallH - 6);
    }
  }

  // awning
  if (b.awning) {
    const aw = right - left;
    for (let i = 0; i < aw / 10; i++) {
      ctx.fillStyle = i % 2 ? '#f3e5c6' : b.awning;
      ctx.fillRect(left + i * 10, roofBottom - 2, 10, 9);
      ctx.beginPath();
      ctx.arc(left + i * 10 + 5, roofBottom + 7, 5, 0, Math.PI);
      ctx.fill();
    }
  }

  // door
  if (b.door) {
    const dx = b.door.x * T + 4;
    const dw = T - 8;
    const dh = Math.min(wallH - 4, T * 1.1);
    ctx.fillStyle = b.trim;
    ctx.fillRect(dx - 3, bottom - dh - 3, dw + 6, dh + 3);
    ctx.fillStyle = opts.doorLocked ? shade(b.trim, -25) : '#6b4a32';
    ctx.fillRect(dx, bottom - dh, dw, dh);
    ctx.fillStyle = opts.lit ? 'rgba(255,214,140,0.55)' : 'rgba(255,255,255,0.12)';
    ctx.fillRect(dx + 3, bottom - dh + 3, dw - 6, dh * 0.3);
    ctx.fillStyle = '#e8c35a';
    ctx.beginPath(); ctx.arc(dx + dw - 5, bottom - dh * 0.45, 1.8, 0, Math.PI * 2); ctx.fill();
    // step
    ctx.fillStyle = 'rgba(120,110,100,0.8)';
    ctx.fillRect(dx - 3, bottom, dw + 6, 3);
  }

  const ridge = roofTop + (roofBottom - roofTop) * 0.45;
  if (b.flatRoof || b.dome) {
    drawFlatRoof(ctx, b, left, right, roofTop, roofBottom);
    if (b.shabby) drawShabby(ctx, b, left, right, roofTop, roofBottom, wallH);
  } else {
    // roof (gabled, seen from above at an angle)
    const eave = 6;
    const rl = left - eave;
    const rr = right + eave;
    ctx.fillStyle = shade(b.roof, 22);
    ctx.beginPath();
    ctx.moveTo(rl + 8, roofTop); ctx.lineTo(rr - 8, roofTop); ctx.lineTo(rr, ridge); ctx.lineTo(rl, ridge); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.roof;
    ctx.beginPath();
    ctx.moveTo(rl, ridge); ctx.lineTo(rr, ridge); ctx.lineTo(rr, roofBottom + 4); ctx.lineTo(rl, roofBottom + 4); ctx.closePath();
    ctx.fill();
    // tile rows
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let ry = ridge + 7; ry < roofBottom; ry += 7) {
      ctx.beginPath(); ctx.moveTo(rl, ry); ctx.lineTo(rr, ry); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    for (let ry = roofTop + 6; ry < ridge; ry += 7) {
      ctx.beginPath(); ctx.moveTo(rl + 6, ry); ctx.lineTo(rr - 6, ry); ctx.stroke();
    }
    ctx.fillStyle = shade(b.roof, -30);
    ctx.fillRect(rl, ridge - 1.5, rr - rl, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(rl, roofBottom + 2, rr - rl, 3);
  }
  // chimney on homes
  if (!b.sign && !b.flatRoof && !b.dome) {
    const cx = right - T * 1.3;
    ctx.fillStyle = '#8a5a48';
    ctx.fillRect(cx, roofTop - 10, 12, (ridge - roofTop) + 4);
    ctx.fillStyle = '#5e3c30';
    ctx.fillRect(cx - 2, roofTop - 12, 16, 4);
    if (opts.lit) {
      ctx.fillStyle = 'rgba(220,220,230,0.35)';
      const s = (opts.time * 8) % 20;
      ctx.beginPath(); ctx.arc(cx + 6 + Math.sin(opts.time) * 2, roofTop - 16 - s, 4 + s * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // sign board
  if (b.sign) {
    ctx.font = 'bold 9px "Trebuchet MS", "Segoe UI", sans-serif';
    const tw = ctx.measureText(b.sign).width + 10;
    const sx = b.door ? Math.min(Math.max(b.door.x * T + T / 2 - tw / 2, left + 2), right - tw - 2) : left + (right - left - tw) / 2;
    const sy = roofBottom - 4;
    ctx.fillStyle = '#3a2c25';
    rrect(ctx, sx, sy, tw, 13, 3);
    ctx.fill();
    ctx.fillStyle = '#f6e7c1';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.sign, sx + 5, sy + 7);
  }
}

function drawLighthouse(ctx, b, opts) {
  const cx = (b.x + b.w / 2) * T;
  const bottom = (b.y + b.h) * T;
  const baseW = b.w * T * 0.9;
  const topW = baseW * 0.62;
  const towerTop = b.y * T - T * 3.2;
  ctx.fillStyle = 'rgba(25,25,45,0.25)';
  ctx.beginPath(); ctx.ellipse(cx + 10, bottom - 4, baseW * 0.6, 10, 0, 0, Math.PI * 2); ctx.fill();
  // tower body with stripes
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const y0 = bottom - (bottom - towerTop) * t0;
    const y1 = bottom - (bottom - towerTop) * t1;
    const w0 = baseW + (topW - baseW) * t0;
    const w1 = baseW + (topW - baseW) * t1;
    ctx.fillStyle = i % 2 ? b.roof : b.wall;
    ctx.beginPath();
    ctx.moveTo(cx - w0 / 2, y0); ctx.lineTo(cx + w0 / 2, y0); ctx.lineTo(cx + w1 / 2, y1); ctx.lineTo(cx - w1 / 2, y1); ctx.closePath();
    ctx.fill();
  }
  // shading
  const g = ctx.createLinearGradient(cx - baseW / 2, 0, cx + baseW / 2, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, bottom); ctx.lineTo(cx + baseW / 2, bottom); ctx.lineTo(cx + topW / 2, towerTop); ctx.lineTo(cx - topW / 2, towerTop); ctx.closePath();
  ctx.fill();
  // gallery + lantern room (dark: the lens is missing)
  ctx.fillStyle = '#3b3b45';
  ctx.fillRect(cx - topW / 2 - 6, towerTop - 4, topW + 12, 5);
  ctx.fillStyle = opts.lampLit ? '#fff3b0' : '#2a3440';
  ctx.fillRect(cx - topW / 2 + 3, towerTop - 24, topW - 6, 20);
  ctx.strokeStyle = '#1d1d25';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    const lx = cx - topW / 2 + 3 + ((topW - 6) / 4) * i;
    ctx.beginPath(); ctx.moveTo(lx, towerTop - 24); ctx.lineTo(lx, towerTop - 4); ctx.stroke();
  }
  ctx.fillStyle = b.roof;
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, towerTop - 24); ctx.lineTo(cx, towerTop - 40); ctx.lineTo(cx + topW / 2, towerTop - 24); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1d1d25';
  ctx.fillRect(cx - 1, towerTop - 47, 2, 8);
  // door
  if (b.door) {
    const dx = b.door.x * T + 5;
    ctx.fillStyle = '#4a3328';
    rrect(ctx, dx, bottom - T * 1.05, T - 10, T * 1.05, 6);
    ctx.fill();
    ctx.fillStyle = '#c9a24a';
    ctx.beginPath(); ctx.arc(dx + T - 15, bottom - T * 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // a single small window
  ctx.fillStyle = '#2a3440';
  ctx.fillRect(cx - 4, bottom - (bottom - towerTop) * 0.55, 8, 12);
}

// ------------------------------------------------------------------- props
/** Props drawn flat on the ground before y-sorted objects. */
export const FLAT_PROPS = new Set(['crops', 'shipberth', 'gangway', 'companionway', 'moored_ship', 'slipway', 'belt', 'inserter', 'sorter', 'rug', 'flowerbed', 'window', 'chair', 'item', 'painting', 'trench', 'board', 'crosswalk', 'trash']);

const LAMP = { red: ['#ff3b2f', '#4a1410'], amber: ['#ffb02e', '#4a3410'], green: ['#3fe07a', '#103a20'] };

/** A traffic light on its pole: a head for the road it faces, and a walk / wait box for the crossing. */
function drawTrafficLight(ctx, p, x, y, t) {
  const s = lightState(p, t);
  // nw / se heads face the east–west road; ne / sw face north–south
  const axis = p.corner === 'nw' || p.corner === 'se' ? 'ew' : 'ns';
  const state = s[axis];
  const cx = x + 16;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx + 4, y + 26, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3e44';
  ctx.fillRect(cx - 2, y - 22, 4, 48);
  // head
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(cx - 7, y - 40, 14, 34);
  ctx.fillStyle = '#e8c35a';
  ctx.fillRect(cx - 7, y - 40, 14, 2);
  ['red', 'amber', 'green'].forEach((c, i) => {
    const on = state === c;
    ctx.fillStyle = LAMP[c][on ? 0 : 1];
    ctx.beginPath(); ctx.arc(cx, y - 33 + i * 10, 3.6, 0, Math.PI * 2); ctx.fill();
    if (on) {
      ctx.fillStyle = LAMP[c][0] + '40';
      ctx.beginPath(); ctx.arc(cx, y - 33 + i * 10, 7, 0, Math.PI * 2); ctx.fill();
    }
  });
  // the crossing beside this corner runs along the other axis
  const w = walkSignal(p, axis, t);
  const lit = w === 'walk' || (w === 'flash' && Math.floor(t * 3) % 2 === 0);
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(cx + 3, y - 4, 10, 10);
  ctx.fillStyle = w === 'wait' ? '#ff6a3a' : lit ? '#f2f2e8' : '#2a2c30';
  if (w === 'wait') ctx.fillRect(cx + 5, y - 2, 6, 6);
  else { ctx.beginPath(); ctx.arc(cx + 8, y - 1.5, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx + 7, y, 2, 4); }
}

let pixelProps = false;
/** v0.39.0: the renderer turns the pixel-art props on and off with the "Pixel-art look" setting. */
export function setPixelProps(on) { pixelProps = !!on; }

export function drawProp(ctx, p, opts) {
  if (pixelProps && drawPixelProp(ctx, p, opts)) return;
  const x = p.x * T;
  const y = p.y * T;
  const w = p.w * T;
  const h = p.h * T;
  const time = opts.time || 0;
  switch (p.type) {
    case 'tree': {
      const sway = Math.sin(time * 0.8 + p.x) * 1.2;
      ctx.fillStyle = 'rgba(20,30,20,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 28, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4a32';
      ctx.fillRect(x + 12, y + 8, 8, 22);
      const c = p.color || '#4f8a4a';
      ctx.fillStyle = shade(c, -18);
      ctx.beginPath(); ctx.arc(x + 16 + sway, y - 2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x + 9 + sway, y - 6, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 23 + sway, y - 8, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(c, 22);
      ctx.beginPath(); ctx.arc(x + 13 + sway, y - 14, 8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pine': {
      const sway = Math.sin(time * 0.7 + p.y) * 1;
      ctx.fillStyle = 'rgba(20,30,20,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 28, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3d2a';
      ctx.fillRect(x + 13, y + 14, 6, 16);
      const layers = ['#2f5d46', '#386b51', '#41795b'];
      layers.forEach((col, i) => {
        ctx.fillStyle = col;
        const ty = y + 18 - i * 11;
        const half = 17 - i * 4;
        ctx.beginPath();
        ctx.moveTo(x + 16 - half + sway * i * 0.5, ty);
        ctx.lineTo(x + 16 + sway * i, ty - 18);
        ctx.lineTo(x + 16 + half + sway * i * 0.5, ty);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case 'bush': {
      ctx.fillStyle = '#4a7f45';
      rrect(ctx, x + 1, y + 4, w - 2, h - 4, 10); ctx.fill();
      break;
    }
    case 'flowerbed': {
      ctx.fillStyle = '#6b4a32';
      rrect(ctx, x + 2, y + 6, w - 4, h - 10, 4); ctx.fill();
      ctx.fillStyle = '#5a8f4a';
      rrect(ctx, x + 4, y + 8, w - 8, h - 14, 3); ctx.fill();
      const cols = ['#f2a7c3', '#f6e27a', '#ffffff', '#c792ea'];
      for (let i = 0; i < p.w * 4; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.arc(x + 7 + (i * 7) % (w - 12), y + 12 + ((i * 5) % 8), 2.2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'bench': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 3, y + 22, w - 4, 5);
      ctx.fillStyle = '#4a3a30';
      ctx.fillRect(x + 4, y + 16, 3, 9); ctx.fillRect(x + w - 7, y + 16, 3, 9);
      ctx.fillStyle = '#a0704a';
      ctx.fillRect(x + 1, y + 12, w - 2, 6);
      ctx.fillRect(x + 1, y + 4, w - 2, 5);
      break;
    }
    case 'streetlamp': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 28, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f3440';
      ctx.fillRect(x + 14, y - 20, 4, 48);
      ctx.fillRect(x + 11, y + 24, 10, 4);
      ctx.fillStyle = opts.night ? '#ffe6a3' : '#cfd6dc';
      rrect(ctx, x + 9, y - 30, 14, 12, 3); ctx.fill();
      ctx.fillStyle = '#2f3440';
      ctx.fillRect(x + 8, y - 32, 16, 3);
      break;
    }
    case 'fountain': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + w / 2 + 3, y + h / 2 + 6, w / 2, h / 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b9b3a6';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5aa0c0';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 6, h / 2.6 - 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(x + w / 2 - 6 + Math.sin(time) * 3, y + h / 2 - 2, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
      // bronze lamplighter statue
      ctx.fillStyle = '#7a6235';
      ctx.fillRect(x + w / 2 - 4, y + h / 2 - 26, 8, 22);
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 - 30, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x + w / 2 + 4, y + h / 2 - 44, 2, 26);
      break;
    }
    case 'noticeboard': {
      ctx.fillStyle = '#5a3d2a';
      ctx.fillRect(x + 4, y + 10, 3, 20); ctx.fillRect(x + w - 7, y + 10, 3, 20);
      ctx.fillStyle = '#8a6142';
      ctx.fillRect(x, y - 6, w, 20);
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(x + 3, y - 3, 10, 12); ctx.fillRect(x + 16, y - 2, 12, 9);
      ctx.fillStyle = '#e8b5a0';
      ctx.fillRect(x + 15, y + 8, 9, 5);
      break;
    }
    case 'sign': {
      ctx.fillStyle = '#5a3d2a';
      ctx.fillRect(x + 14, y + 8, 4, 22);
      ctx.fillStyle = '#e9dfc7';
      ctx.fillRect(x + 2, y, 28, 14);
      ctx.fillStyle = '#9a3530';
      ctx.fillRect(x + 4, y + 4, 24, 2); ctx.fillRect(x + 4, y + 8, 18, 2);
      break;
    }
    case 'crate': {
      ctx.fillStyle = '#9a6b45';
      ctx.fillRect(x + 3, y + 4, w - 6, h - 6);
      ctx.strokeStyle = '#6b4a32';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 5, w - 8, h - 8);
      ctx.beginPath(); ctx.moveTo(x + 4, y + 5); ctx.lineTo(x + w - 4, y + h - 3); ctx.stroke();
      break;
    }
    case 'barrel': {
      ctx.fillStyle = '#7d5235';
      rrect(ctx, x + 6, y + 2, w - 12, h - 4, 8); ctx.fill();
      ctx.fillStyle = '#4a4a50';
      ctx.fillRect(x + 6, y + 8, w - 12, 2); ctx.fillRect(x + 6, y + h - 10, w - 12, 2);
      break;
    }
    case 'rock': {
      ctx.fillStyle = '#8d8f94';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 20, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a5a7ab';
      ctx.beginPath(); ctx.ellipse(x + 13, y + 16, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bollard':
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 17, y + 26, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2e34';
      rrect(ctx, x + 10, y + 12, 12, 14, 4); ctx.fill();
      ctx.fillStyle = '#3e444c';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 12, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'crane': {
      // a dockside crane: legs on the quay, a jib reaching out over the water
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 4, y + h - 6, w - 8, 6);
      ctx.fillStyle = '#c9a24a';
      for (const lx of [x + 6, x + w - 12]) ctx.fillRect(lx, y - 30, 6, h + 24);
      ctx.fillRect(x + 4, y - 36, w - 8, 10);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(x + w / 2 - 10, y - 46, 20, 14);
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(x + w / 2 - 3, y - 40, 6, 60 + Math.sin(time * 0.7) * 6); // the jib, reaching south
      ctx.strokeStyle = '#2a2a2e';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + w / 2, y + 20 + Math.sin(time * 0.7) * 6); ctx.lineTo(x + w / 2, y + 34 + Math.sin(time * 0.7) * 6); ctx.stroke();
      break;
    }
    case 'shipberth': {
      // v0.27.0: your ships at this berth, life-size (src/systems/docks.js); their fittings are props of their own
      const B = opts.berth;
      const px = (p.pier ?? p.x + 8) * T;
      if (B) {
        for (const m of B.ships) drawMooredHull(ctx, m, { time, night: opts.night });
        drawNameBoard(ctx, B.name + (B.more ? ` · +${B.more} more in port` : B.empty ? ' · no ships in' : ''), px + T, y + 6);
        for (const m of B.ships) drawNameBoard(ctx, m.name, (m.x0 + m.plan.Bt / 2) * T, (m.y0 + m.plan.Lt) * T + 26);
      } else drawNameBoard(ctx, 'BERTH — TO LET', px + T, y + 40);
      break;
    }
    case 'deckpart': drawDeckPart(ctx, p, opts); break;
    case 'deckhouse': drawDeckhouse(ctx, p, opts); break;
    case 'shipwheel': drawShipWheel(ctx, p, opts); break;
    case 'logbook': drawLogbook(ctx, p, opts); break;
    case 'gangway': drawGangway(ctx, p, opts); break;
    case 'companionway': drawCompanionway(ctx, p, opts); break;
    case 'slipway': {
      // rails down into the water, a gantry, and whatever is on the slip (src/systems/shipyard.js)
      ctx.fillStyle = 'rgba(90,70,50,0.75)';
      ctx.fillRect(x + 10, y, w - 20, h);
      ctx.fillStyle = '#5a5e64';
      for (const rx of [x + 16, x + w - 20]) ctx.fillRect(rx, y, 4, h);
      ctx.fillStyle = '#7a5a3a';
      for (let ry = y + 6; ry < y + h; ry += 14) ctx.fillRect(x + 12, ry, w - 24, 3);
      const B = opts.slip;
      if (B?.look) {
        const len = (B.look.len || 3) * T;
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.55 * B.progress; // the hull fills in as it's built
        drawShip(ctx, B.look, x + w / 2, y + 16 + len / 2, Math.PI / 2, { time: 0 });
        ctx.restore();
        drawNameBoard(ctx, `${B.name} · ${Math.round(B.progress * 100)}%`, x + w / 2, y + 24 + len);
      }
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(x + 2, y + 4, 5, 60);
      ctx.fillRect(x + w - 7, y + 4, 5, 60);
      ctx.fillRect(x + 2, y + 4, w - 4, 6);
      drawNameBoard(ctx, 'OBER & SONS SHIPYARD', x + w / 2, y - 6);
      break;
    }
    case 'moored_ship': {
      const len = (p.look?.len || 3) * T;
      drawShip(ctx, p.look || {}, x + w / 2, y + 6 + len / 2, Math.PI / 2, { time, lit: opts.night });
      if (p.name) drawNameBoard(ctx, p.name, x + w / 2, y + len + 14);
      break;
    }
    case 'boat': {
      const bobY = Math.sin(time * 1.3) * 1.5;
      ctx.fillStyle = '#c0614a';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 10 + bobY); ctx.lineTo(x + w - 2, y + 10 + bobY); ctx.lineTo(x + w - 10, y + 26 + bobY); ctx.lineTo(x + 10, y + 26 + bobY); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f3e5c6';
      ctx.fillRect(x + 8, y + 12 + bobY, w - 16, 4);
      break;
    }
    case 'hatch': {
      const open = opts.state?.open;
      ctx.fillStyle = '#5b5f66';
      rrect(ctx, x + 4, y + 6, w - 8, h - 8, 3); ctx.fill();
      ctx.fillStyle = open ? '#15151c' : '#8a5b3c';
      ctx.fillRect(x + 7, y + 9, w - 14, h - 14);
      if (!open) {
        ctx.fillStyle = '#a5754e';
        ctx.fillRect(x + 7, y + 14, w - 14, 2); ctx.fillRect(x + 7, y + 20, w - 14, 2);
      }
      break;
    }
    case 'mailbox': {
      ctx.fillStyle = '#c03a2b';
      rrect(ctx, x + 9, y + 2, 14, 26, 6); ctx.fill();
      ctx.fillStyle = '#2a1a18';
      ctx.fillRect(x + 12, y + 8, 8, 2);
      break;
    }
    case 'bed': {
      ctx.fillStyle = '#6b4a32';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(x + 4, y + 4, w - 8, 12);
      ctx.fillStyle = p.color || '#6f8fb5';
      ctx.fillRect(x + 4, y + 16, w - 8, h - 22);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 4, y + 16, w - 8, 4);
      break;
    }
    case 'cot': {
      ctx.fillStyle = '#5b6b4a';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = '#d8d0b8';
      ctx.fillRect(x + 6, y + 6, w - 12, 9);
      break;
    }
    case 'wardrobe':
    case 'shelf':
    case 'cabinet':
    case 'toolrack':
    case 'display': {
      const col = { wardrobe: '#7a5236', shelf: '#8a6142', cabinet: '#6f7a86', toolrack: '#6b5a48', display: '#a07850' }[p.type];
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + 2, y + h - 4, w - 2, 5);
      ctx.fillStyle = col;
      ctx.fillRect(x + 2, y - 10, w - 4, h + 6);
      ctx.fillStyle = shade(col.startsWith('#') ? col : '#777777', 20);
      ctx.fillRect(x + 2, y - 10, w - 4, 4);
      if (p.type === 'cabinet') {
        ctx.fillStyle = '#c9ced4';
        for (let i = 0; i < 3; i++) { ctx.fillRect(x + 6, y - 4 + i * 10, w - 12, 7); ctx.fillStyle = '#4a4f55'; ctx.fillRect(x + w / 2 - 3, y - 1 + i * 10, 6, 1.5); ctx.fillStyle = '#c9ced4'; }
      } else if (p.type === 'shelf') {
        const cols = ['#e7d7b0', '#c86b4a', '#6a8f6b', '#f2c14e'];
        for (let i = 0; i < p.w * 4; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(x + 5 + i * 7 % (w - 8), y - 6 + (i % 2) * 10, 5, 8); }
      } else if (p.type === 'toolrack') {
        ctx.strokeStyle = '#c9ced4';
        ctx.lineWidth = 2;
        for (let i = 0; i < p.w * 3; i++) { ctx.beginPath(); ctx.moveTo(x + 6 + i * 9, y - 4); ctx.lineTo(x + 6 + i * 9, y + 14 - (i % 3) * 3); ctx.stroke(); }
      } else if (p.type === 'display') {
        ctx.fillStyle = 'rgba(200,230,240,0.55)';
        ctx.fillRect(x + 5, y - 6, w - 10, h - 4);
        if (p.variant === 'guns') {
          // revolvers and pistols on felt, each on a tag
          ctx.fillStyle = 'rgba(40,60,40,0.5)';
          ctx.fillRect(x + 5, y - 6, w - 10, h - 4);
          for (let i = 0; i < Math.floor((w - 12) / 18); i++) {
            const gx = x + 9 + i * 18;
            ctx.fillStyle = '#2a2a2e';
            ctx.fillRect(gx, y + 1, 11, 3); // barrel
            ctx.fillRect(gx + 7, y + 1, 4, 8); // grip
            ctx.fillStyle = '#7a5232';
            ctx.fillRect(gx + 7, y + 5, 4, 4);
            ctx.fillStyle = '#f2efe6';
            ctx.fillRect(gx + 1, y + 8, 4, 3);
          }
        } else {
          ctx.fillStyle = '#d99a4e';
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + 10 + i * 10, y + 6, 4, 0, Math.PI * 2); ctx.fill(); }
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + w / 2 - 1, y - 6, 2, h);
      }
      break;
    }
    case 'desk':
    case 'table':
    case 'counter':
    case 'workbench':
    case 'lectern': {
      const col = p.color || { desk: '#7a5236', table: '#a0704a', counter: '#b07a52', workbench: '#7d6a55', lectern: '#6b4a32' }[p.type];
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 3, y + h - 4, w - 3, 6);
      ctx.fillStyle = shade(col, -25);
      ctx.fillRect(x + 2, y + 8, w - 4, h - 8);
      ctx.fillStyle = col;
      ctx.fillRect(x + 1, y + 2, w - 2, h - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 1, y + 2, w - 2, 3);
      if (p.type === 'desk') { ctx.fillStyle = '#f3efe6'; ctx.fillRect(x + 8, y + 5, 12, 9); ctx.fillStyle = '#3a3a45'; ctx.fillRect(x + w - 16, y + 5, 6, 8); }
      if (p.type === 'lectern') { ctx.fillStyle = '#e9dfc7'; ctx.fillRect(x + 7, y + 4, 18, 10); ctx.fillStyle = '#8a3b2b'; ctx.fillRect(x + 15, y + 4, 2, 10); }
      if (p.type === 'workbench') { ctx.fillStyle = '#c9ced4'; ctx.fillRect(x + 8, y + 5, 10, 3); ctx.fillStyle = '#c0614a'; ctx.fillRect(x + 30, y + 4, 12, 7); }
      if (p.type === 'table') { ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.arc(x + 16, y + 9, 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'chair': {
      ctx.fillStyle = '#7a5236';
      ctx.fillRect(x + 9, y + 10, 14, 14);
      ctx.fillStyle = '#5e3e28';
      ctx.fillRect(x + 9, y + 6, 14, 4);
      break;
    }
    case 'oven':
    case 'stove': {
      ctx.fillStyle = '#3c3c44';
      ctx.fillRect(x + 2, y - 6, w - 4, h + 2);
      ctx.fillStyle = opts.night || p.type === 'oven' ? '#e07a3a' : '#555';
      ctx.fillRect(x + 7, y + 8, w - 14, 10);
      ctx.fillStyle = '#7a7a86';
      ctx.fillRect(x + 2, y - 6, w - 4, 4);
      break;
    }
    case 'plant': {
      ctx.fillStyle = '#b5683f';
      ctx.fillRect(x + 10, y + 16, 12, 12);
      ctx.fillStyle = '#4f8a4a';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + 16 + Math.cos(i * 1.3) * 6, y + 8 + Math.sin(i * 1.3) * 4, 5, 8, i, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'rug': {
      ctx.fillStyle = p.color || '#8e5a6e';
      rrect(ctx, x + 2, y + 2, w - 4, h - 4, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,0.45)';
      ctx.lineWidth = 2;
      rrect(ctx, x + 6, y + 6, w - 12, h - 12, 3); ctx.stroke();
      break;
    }
    case 'window': {
      ctx.fillStyle = opts.night ? '#2c3a5a' : '#a8cfe0';
      ctx.fillRect(x + 4, y + 4, w - 8, h * 0.5);
      ctx.fillStyle = '#7a5a40';
      ctx.fillRect(x + w / 2 - 1, y + 4, 2, h * 0.5);
      ctx.fillRect(x + 2, y + 2, w - 4, 3);
      break;
    }
    case 'engine': {
      ctx.fillStyle = '#4a5560';
      rrect(ctx, x + 2, y - 4, w - 4, h + 2, 6); ctx.fill();
      ctx.fillStyle = '#c78d2a';
      ctx.beginPath(); ctx.arc(x + 18, y + 8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath(); ctx.arc(x + 18, y + 8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9aa3ab';
      ctx.fillRect(x + 34, y - 10, 6, 14);
      break;
    }
    case 'scrap': {
      ctx.fillStyle = '#6a6e74';
      ctx.beginPath(); ctx.moveTo(x + 2, y + 28); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x + 22, y + 10); ctx.lineTo(x + 30, y + 28); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c78d2a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 16, y + 18, 6, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'chest': {
      ctx.fillStyle = '#7a5236';
      rrect(ctx, x + 3, y + 8, w - 6, h - 10, 3); ctx.fill();
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(x + 3, y + 14, w - 6, 3);
      ctx.fillRect(x + w / 2 - 3, y + 12, 6, 7);
      break;
    }
    case 'lamp_mechanism': {
      ctx.fillStyle = '#4a4f55';
      rrect(ctx, x + 4, y + 2, w - 8, h - 6, 8); ctx.fill();
      ctx.strokeStyle = '#c9a24a';
      ctx.lineWidth = 3;
      for (const [gx, gy, r] of [[x + 22, y + 22, 12], [x + 42, y + 36, 9]]) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(time * 0.05);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = '#c9a24a'; ctx.fillRect(r - 1, -2, 4, 4); }
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(200,230,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x + w / 2, y + 14, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'stairs': {
      ctx.fillStyle = '#7d7a76';
      ctx.beginPath(); ctx.arc(x + 16, y + 16, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a5754';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + 16, y + 16); ctx.lineTo(x + 16 + Math.cos(i) * 15, y + 16 + Math.sin(i) * 15); ctx.stroke(); }
      ctx.fillStyle = '#6a5a4a';
      ctx.beginPath(); ctx.arc(x + 20, y + 20, 6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'item': {
      const glint = 0.5 + Math.sin(time * 4) * 0.5;
      ctx.fillStyle = `rgba(255,240,180,${0.35 + glint * 0.5})`;
      ctx.beginPath(); ctx.arc(x + 16, y + 18, 4 + glint * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9ced4';
      ctx.fillRect(x + 10, y + 17, 12, 3);
      break;
    }
    // ---------------------------------------------------------- Halvermouth
    case 'car': {
      const vertical = p.h > p.w;
      const body = p.color || '#3a5a8a';
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      if (vertical) {
        ctx.fillRect(x + 6, y + 4, w - 8, h - 4);
        ctx.fillStyle = body; rrect(ctx, x + 4, y + 2, w - 8, h - 6, 7); ctx.fill();
        ctx.fillStyle = 'rgba(160,200,220,0.85)';
        ctx.fillRect(x + 8, y + 12, w - 16, 10); ctx.fillRect(x + 8, y + h - 24, w - 16, 8);
        ctx.fillStyle = shade(body, 18); ctx.fillRect(x + 8, y + 24, w - 16, h - 50);
      } else {
        ctx.fillRect(x + 4, y + 8, w - 4, h - 6);
        ctx.fillStyle = '#1e1e22';
        ctx.fillRect(x + 8, y + h - 8, 8, 6); ctx.fillRect(x + w - 18, y + h - 8, 8, 6);
        ctx.fillStyle = body; rrect(ctx, x + 2, y + 6, w - 4, h - 12, 6); ctx.fill();
        ctx.fillStyle = shade(body, 16); rrect(ctx, x + 14, y, w - 30, 12, 4); ctx.fill();
        ctx.fillStyle = 'rgba(160,200,220,0.85)';
        ctx.fillRect(x + 17, y + 2, (w - 36) / 2, 8); ctx.fillRect(x + 19 + (w - 36) / 2, y + 2, (w - 36) / 2, 8);
        ctx.fillStyle = '#f2e6a0'; ctx.fillRect(x + w - 6, y + 12, 4, 4);
      }
      if (p.police) {
        const on = Math.sin(time * 6) > 0;
        const cx = x + w / 2;
        const cy = vertical ? y + h / 2 - 6 : y + 3;
        ctx.fillStyle = on ? '#ff3a3a' : '#3a5aff';
        ctx.fillRect(cx - 8, cy - 2, 7, 4);
        ctx.fillStyle = on ? '#3a5aff' : '#ff3a3a';
        ctx.fillRect(cx + 1, cy - 2, 7, 4);
        if (!vertical) { ctx.fillStyle = '#f2efe6'; ctx.font = 'bold 7px "Trebuchet MS", sans-serif'; ctx.fillText('POLICE', x + 18, y + 20); }
      }
      if (p.wrecked) {
        ctx.fillStyle = 'rgba(120,70,40,0.55)';
        ctx.fillRect(x + 6, y + 10, w * 0.5, h - 16);
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(x + 6, y + h - 6, 10, 3);
      }
      break;
    }
    case 'busstop':
      drawBusStop(ctx, x, y, p.lines || '1');
      break;
    case 'trafficlight':
      drawTrafficLight(ctx, p, x, y, opts.realTime ?? time);
      break;
    case 'car_display': {
      const model = CAR_MODELS[p.model];
      if (model) drawDisplayCar(ctx, model, x, y, w, h, { color: p.color, id: p.id });
      break;
    }
    case 'flagpole': {
      const wave = Math.sin(time * 2.4 + p.x) * 3;
      ctx.fillStyle = '#c9c6bd';
      ctx.fillRect(x + 15, y - 52, 3, 80);
      ctx.fillStyle = p.color || '#2a4a8a';
      ctx.beginPath(); ctx.moveTo(x + 18, y - 50); ctx.lineTo(x + 40, y - 46 + wave); ctx.lineTo(x + 40, y - 34 + wave); ctx.lineTo(x + 18, y - 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8c35a';
      ctx.beginPath(); ctx.arc(x + 16.5, y - 54, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'statue': {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 6, y + h - 10, w - 6, 10);
      ctx.fillStyle = '#c9c3b4';
      ctx.fillRect(x + 8, y + 18, w - 16, h - 22); // plinth
      ctx.fillStyle = '#b3ad9e';
      ctx.fillRect(x + 4, y + h - 10, w - 8, 8);
      ctx.fillStyle = '#5f7a6a'; // verdigris founder
      const cx = x + w / 2;
      ctx.fillRect(cx - 7, y - 16, 14, 34);
      ctx.beginPath(); ctx.arc(cx, y - 22, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx + 6, y - 30, 4, 22); // raised arm
      ctx.fillRect(cx + 4, y - 36, 10, 6); // a scroll
      ctx.fillStyle = '#3a2c25';
      ctx.font = 'bold 6px "Trebuchet MS", sans-serif';
      ctx.fillText(p.label || 'FOUNDER', x + 12, y + 32);
      break;
    }
    case 'trash': {
      ctx.fillStyle = '#2a2a30';
      ctx.beginPath(); ctx.ellipse(x + 12, y + 20, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a3a44';
      ctx.beginPath(); ctx.ellipse(x + 21, y + 22, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,220,200,0.7)';
      ctx.fillRect(x + 4, y + 25, 8, 4);
      ctx.fillStyle = 'rgba(200,80,60,0.6)';
      ctx.fillRect(x + 22, y + 12, 4, 6);
      break;
    }
    case 'barrelfire': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 17, y + 28, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4e54';
      ctx.fillRect(x + 8, y + 6, 16, 22);
      ctx.fillStyle = '#8a3b2b';
      ctx.fillRect(x + 8, y + 12, 16, 3); ctx.fillRect(x + 8, y + 21, 16, 3);
      for (let i = 0; i < 3; i++) {
        const f = Math.sin(time * 9 + i * 2.1) * 3;
        ctx.fillStyle = i === 1 ? '#ffd24a' : '#ff7a2a';
        ctx.beginPath(); ctx.moveTo(x + 10 + i * 5, y + 7); ctx.lineTo(x + 12 + i * 5 + f * 0.3, y - 6 - Math.abs(f) - (i === 1 ? 5 : 0)); ctx.lineTo(x + 15 + i * 5, y + 7); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'tent': {
      const c = p.color || '#5a7a6a';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 4, y + h - 6, w - 2, 6);
      ctx.fillStyle = shade(c, -15);
      ctx.beginPath(); ctx.moveTo(x + 2, y + h - 2); ctx.lineTo(x + w / 2, y - 2); ctx.lineTo(x + w - 2, y + h - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(x + 2, y + h - 2); ctx.lineTo(x + w / 2, y - 2); ctx.lineTo(x + w / 2, y + h - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1e1a18';
      ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, y + h - 2); ctx.lineTo(x + w / 2, y + 10); ctx.lineTo(x + w / 2 + 6, y + h - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,150,120,0.6)'; // patch
      ctx.fillRect(x + w * 0.65, y + h * 0.45, 7, 6);
      break;
    }
    case 'laundry': {
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(x + 2, y - 14, 3, 40); ctx.fillRect(x + w - 5, y - 14, 3, 40);
      ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 4, y - 12); ctx.quadraticCurveTo(x + w / 2, y - 4, x + w - 4, y - 12); ctx.stroke();
      const colors = ['#c0614a', '#e8e2d4', '#4a6a8a', '#d9a23a', '#6a8a5a'];
      for (let i = 0; i < Math.floor(w / 14); i++) {
        const sway = Math.sin(time * 2 + i) * 1.5;
        ctx.fillStyle = colors[(i + p.x) % colors.length];
        ctx.fillRect(x + 10 + i * 13 + sway, y - 9 + (i % 2) * 2, 9, 12 + (i % 3) * 3);
      }
      break;
    }
    case 'crosswalk': {
      ctx.fillStyle = 'rgba(240,238,230,0.75)';
      if (p.vertical) for (let i = 0; i < w; i += 8) ctx.fillRect(x + i + 1, y + 2, 5, h - 4);
      else for (let j = 0; j < h; j += 8) ctx.fillRect(x + 2, y + j + 1, w - 4, 5);
      break;
    }
    case 'hydrant': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 27, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0414a';
      ctx.fillRect(x + 11, y + 12, 10, 15);
      ctx.beginPath(); ctx.arc(x + 16, y + 12, 5, Math.PI, 0); ctx.fill();
      ctx.fillRect(x + 8, y + 16, 16, 4);
      break;
    }
    case 'dumpster': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 4, y + h - 4, w - 2, 5);
      ctx.fillStyle = p.color || '#3f6a4a';
      ctx.fillRect(x + 2, y + 4, w - 4, h - 6);
      ctx.fillStyle = shade(p.color || '#3f6a4a', -20);
      ctx.fillRect(x, y, w, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 8, y + 12, w - 16, 3);
      break;
    }
    case 'chainfence': {
      ctx.fillStyle = '#7a7e86';
      ctx.fillRect(x, y + 4, w, 2);
      for (let i = 0; i <= w; i += T) ctx.fillRect(x + Math.min(i, w - 3), y + 2, 3, 26);
      ctx.strokeStyle = 'rgba(150,155,165,0.7)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 6) {
        ctx.beginPath(); ctx.moveTo(x + i, y + 6); ctx.lineTo(x + i + 6, y + 26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + i + 6, y + 6); ctx.lineTo(x + i, y + 26); ctx.stroke();
      }
      if (p.razor) { ctx.strokeStyle = '#a8acb4'; for (let i = 0; i < w; i += 6) { ctx.beginPath(); ctx.arc(x + i + 3, y + 1, 3, 0, Math.PI * 2); ctx.stroke(); } }
      break;
    }
    case 'gunrack': {
      ctx.fillStyle = '#5a3d2a';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
      ctx.fillStyle = '#3a2a1e';
      ctx.fillRect(x + 2, y + h - 10, w - 4, 6);
      for (let i = 0; i < Math.floor((w - 8) / 9); i++) {
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(x + 7 + i * 9, y + 4, 3, h - 14);
        ctx.fillStyle = '#7a5232';
        ctx.fillRect(x + 6 + i * 9, y + h - 16, 5, 8);
      }
      break;
    }
    case 'cellbars': {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x, y + h - 4, w, 4);
      ctx.fillStyle = '#5a5e66';
      ctx.fillRect(x, y + 2, w, 3);
      for (let i = 2; i < w; i += 6) ctx.fillRect(x + i, y + 2, 2, h - 4);
      break;
    }
    case 'loadingbay': case 'outbin': case 'workbench': case 'belt': case 'inserter': case 'machine': case 'generator': case 'terminal': case 'sorter': case 'storage':
      drawFactoryProp(ctx, p, x, y, w, h, opts);
      break;
    case 'loosebrick': {
      // a different-coloured brick low on the wall; scraped mortar shows the digging
      const dug = Math.min(4, opts.jailDig || 0);
      ctx.fillStyle = '#7a4a36';
      ctx.fillRect(x + 6, y + 10, 20, 11);
      ctx.strokeStyle = '#4a2a1e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6.5, y + 10.5, 19, 10);
      ctx.fillStyle = '#c9b89a';
      for (let i = 0; i < dug * 2; i++) ctx.fillRect(x + 4 + (i * 7) % 24, y + 24 + (i % 3) * 2, 2, 2);
      break;
    }
    case 'vent': {
      ctx.fillStyle = '#3a3e44';
      ctx.fillRect(x + 4, y + 2, 24, 16);
      ctx.fillStyle = '#7a7e86';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 6, y + 4 + i * 4, 20, 2);
      ctx.fillStyle = '#a8a49a';
      for (const [dx, dy] of [[5, 3], [25, 3], [5, 15], [25, 15]]) ctx.fillRect(x + dx, y + dy, 2, 2);
      break;
    }
    case 'wallcrack': {
      ctx.strokeStyle = '#2a2420';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 2); ctx.lineTo(x + 26, y + 9); ctx.lineTo(x + 29, y + 15); ctx.lineTo(x + 25, y + 22); ctx.lineTo(x + 28, y + 30);
      ctx.stroke();
      break;
    }
    case 'gatepost': {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 6, y + 24, 24, 8);
      ctx.fillStyle = '#9a948a';
      ctx.fillRect(x + 6, y - 30, 20, 58);
      ctx.fillStyle = '#b8b2a6';
      ctx.fillRect(x + 3, y - 36, 26, 8);
      ctx.fillStyle = '#2a4a6a';
      ctx.fillRect(x + 9, y - 22, 14, 30);
      ctx.fillStyle = '#e8c35a';
      ctx.font = 'bold 7px "Trebuchet MS", sans-serif';
      ctx.fillText('H', x + 13, y - 4);
      break;
    }
    // ---------------------------------------------------- Mason's Os site
    case 'scaffold': {
      // timber-and-pipe scaffolding with planks; a fixed look (the site doesn't progress)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2, y + h - 4, w, 5);
      ctx.fillStyle = 'rgba(200,170,120,0.35)';
      ctx.fillRect(x + 4, y - 18, w - 8, h + 14);
      ctx.strokeStyle = '#8a8f96';
      ctx.lineWidth = 2;
      const cols = Math.max(2, p.w + 1);
      for (let i = 0; i < cols; i++) {
        const px = x + 3 + ((w - 6) * i) / (cols - 1);
        ctx.beginPath(); ctx.moveTo(px, y + h - 2); ctx.lineTo(px, y - 20); ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 3, y + h - 4); ctx.lineTo(x + w - 3, y - 18); ctx.stroke();
      for (const ly of [y - 20, y + h / 2 - 12, y + h - 10]) {
        ctx.fillStyle = '#b8874a';
        ctx.fillRect(x, ly, w, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x, ly + 4, w, 1);
      }
      break;
    }
    case 'excavator': {
      const active = opts.active;
      const t = active ? time : 0;
      const arm = active ? Math.sin(t * 1.3) * 0.35 : 0.1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 2, y + h - 6, w, 7);
      // tracks
      ctx.fillStyle = '#2a2a2e';
      rrect(ctx, x + 2, y + h - 16, w - 4, 12, 6); ctx.fill();
      ctx.fillStyle = '#4a4a50';
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * ((w - 14) / 5) + ((t * 30) % 6), y + h - 13, 3, 6);
      // body + cab (Mason sits inside: the cab is open at the front)
      ctx.fillStyle = '#e8b23a';
      rrect(ctx, x + 4, y + 6, w - 10, h - 22, 4); ctx.fill();
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(x + 8, y - 16, 4, 24); ctx.fillRect(x + w - 30, y - 16, 4, 24);
      ctx.fillStyle = '#d29a22';
      ctx.fillRect(x + 6, y - 20, w - 32, 6);
      ctx.fillStyle = 'rgba(160,200,220,0.25)';
      ctx.fillRect(x + 12, y - 14, w - 42, 18);
      ctx.fillStyle = '#2a2a2e';
      ctx.font = 'bold 6px "Trebuchet MS", sans-serif';
      ctx.fillText('I DIG IT', x + 8, y + 22);
      // boom and bucket
      ctx.save();
      ctx.translate(x + w - 14, y + 8);
      ctx.rotate(-0.9 + arm);
      ctx.fillStyle = '#e8b23a';
      ctx.fillRect(0, -3, 30, 6);
      ctx.translate(30, 0);
      ctx.rotate(1.6 - arm * 1.4);
      ctx.fillRect(0, -2, 20, 5);
      ctx.fillStyle = '#5a5a60';
      ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(28, -2); ctx.lineTo(26, 8); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (active) {
        ctx.fillStyle = `rgba(120,120,120,${0.25 + 0.15 * Math.sin(t * 6)})`;
        ctx.beginPath(); ctx.arc(x + 14, y - 26 - ((t * 12) % 10), 4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'lumber': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2, y + h - 4, w - 2, 5);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#c99a5e' : '#b8874a';
        ctx.fillRect(x + 2, y + 4 + i * 6, w - 4, 5);
        ctx.fillStyle = '#e2c08a';
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + 6 + j * ((w - 12) / 3), y + 6 + i * 6, 2, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'bricks': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2, y + h - 4, w - 2, 5);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(x + 2, y + h - 8, w - 4, 6); // pallet
      for (let row = 0; row < 4; row++)
        for (let i = 0; i < p.w * 3; i++) {
          const bx = x + 3 + i * 10 + (row % 2 ? 5 : 0);
          if (bx + 9 > x + w - 2) continue;
          ctx.fillStyle = (i + row) % 3 ? '#b4553a' : '#a24a32';
          ctx.fillRect(bx, y + h - 13 - row * 5, 9, 4);
        }
      break;
    }
    case 'mixer': {
      const spin = time * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(x + 17, y + h - 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a6a9a';
      ctx.fillRect(x + 6, y + h - 10, 20, 6);
      ctx.fillStyle = '#2a2a2e';
      ctx.beginPath(); ctx.arc(x + 9, y + h - 3, 3, 0, Math.PI * 2); ctx.arc(x + 23, y + h - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(x + 16, y + 6);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#e0702a';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 3; i++) {
        const a = spin + i * 2.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 6); ctx.lineTo(Math.cos(a + 0.8) * 10, Math.sin(a + 0.8) * 6); ctx.stroke();
      }
      ctx.fillStyle = '#7a7a80';
      ctx.beginPath(); ctx.ellipse(12, -1, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'trench': {
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(x + 2, y + 6, w - 4, h - 12);
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x + 4, y + 10, w - 8, h - 18);
      ctx.fillStyle = '#9a7a5a';
      ctx.fillRect(x, y + 3, w, 3); // spoil heap edge
      ctx.strokeStyle = '#f2efe6';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + w, y + 2); ctx.stroke(); // string line
      ctx.setLineDash([]);
      break;
    }
    case 'stake': {
      ctx.fillStyle = '#a07a50';
      ctx.fillRect(x + 15, y + 8, 3, 18);
      ctx.fillStyle = '#ff7a2a';
      const flap = Math.sin(time * 4 + p.x * 3) * 3;
      ctx.beginPath(); ctx.moveTo(x + 18, y + 8); ctx.lineTo(x + 26, y + 10 + flap); ctx.lineTo(x + 18, y + 13); ctx.closePath(); ctx.fill();
      break;
    }
    case 'board': {
      // the contracts board on the office wall
      ctx.fillStyle = '#8a6142';
      ctx.fillRect(x + 1, y + 4, w * 2 - 2, h - 6);
      ctx.fillStyle = '#d9c9a0';
      ctx.fillRect(x + 4, y + 7, w * 2 - 8, h - 12);
      ctx.fillStyle = '#6a8ac0';
      ctx.fillRect(x + 7, y + 10, 18, 12);
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(x + 30, y + 10, 14, 10);
      ctx.fillStyle = '#c0414a';
      ctx.fillRect(x + 32, y + 12, 10, 2);
      break;
    }
    case 'derrick': {
      const cx = x + w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(cx + 4, y + h - 4, w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3a42';
      ctx.lineWidth = 3;
      const top = y - 70;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + h - 4); ctx.lineTo(cx, top); ctx.lineTo(x + w - 4, y + h - 4);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 6; i++) {
        const ty = y + h - 4 - ((y + h - 4 - top) * i) / 6;
        const half = ((w / 2 - 4) * (6 - i)) / 6;
        ctx.beginPath(); ctx.moveTo(cx - half, ty); ctx.lineTo(cx + half, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - half, ty); ctx.lineTo(cx + half * 0.8, ty - 10); ctx.stroke();
      }
      ctx.fillStyle = '#c0614a';
      ctx.fillRect(cx - 4, top - 6, 8, 6);
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(x + 6, y + h - 10, w - 12, 8);
      break;
    }
    case 'pumpjack': {
      const nod = Math.sin(time * 1.6) * 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 4, y + h - 6, w - 4, 6);
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(x + w / 2 - 3, y - 6, 6, h);
      ctx.save();
      ctx.translate(x + w / 2, y - 6);
      ctx.rotate(nod);
      ctx.fillStyle = '#d9a23a';
      ctx.fillRect(-w / 2 + 2, -4, w - 4, 7);
      ctx.fillStyle = '#3a3a42';
      ctx.beginPath(); ctx.arc(-w / 2 + 4, 0, 7, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(x + w - 10, y + 6, 8, h - 8);
      break;
    }
    case 'tank': {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(x + w / 2 + 4, y + h - 2, w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9c6bd';
      ctx.fillRect(x + 2, y - 14, w - 4, h + 8);
      ctx.fillStyle = '#e4e1d8';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y - 14, w / 2 - 2, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + w - 14, y - 14, 12, h + 8);
      ctx.fillStyle = '#8a3b2b';
      ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
      ctx.fillText('OBER', x + 12, y + 14);
      break;
    }
    case 'pipe': {
      ctx.fillStyle = '#6a6e74';
      ctx.fillRect(x, y + 12, w, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y + 13, w, 2);
      ctx.fillStyle = '#4a4e54';
      ctx.fillRect(x + w - 4, y + 10, 4, 13);
      break;
    }
    case 'booth': {
      ctx.fillStyle = '#3f6f4a';
      ctx.fillRect(x + 2, y - 12, w - 4, h + 8);
      ctx.fillStyle = '#a8cfe0';
      ctx.fillRect(x + 6, y - 6, w - 12, 10);
      ctx.fillStyle = '#2a4a32';
      ctx.fillRect(x, y - 16, w, 5);
      break;
    }
    case 'valve':
    case 'gauge':
    case 'barrelline': {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 2, y + h - 4, w - 2, 6);
      if (p.type === 'barrelline') {
        for (let i = 0; i < p.w; i++) {
          ctx.fillStyle = '#2f5a7a';
          rrect(ctx, x + i * T + 6, y + 2, T - 12, h - 6, 6); ctx.fill();
          ctx.fillStyle = '#c9c6bd';
          ctx.fillRect(x + i * T + 6, y + 8, T - 12, 2);
        }
        break;
      }
      ctx.fillStyle = '#5a5f66';
      ctx.fillRect(x + 2, y - 8, w - 4, h + 4);
      for (let i = 0; i < p.w * 2; i++) {
        const gx = x + 10 + i * 15;
        if (p.type === 'valve') {
          ctx.strokeStyle = '#c0614a';
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(gx, y + 6, 5, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(gx - 5, y + 6); ctx.lineTo(gx + 5, y + 6); ctx.stroke();
        } else {
          ctx.fillStyle = '#f3efe6';
          ctx.beginPath(); ctx.arc(gx, y + 4, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#c0614a';
          ctx.lineWidth = 1.2;
          const a = Math.sin(time * (1 + i * 0.3)) * 0.8 - 0.6;
          ctx.beginPath(); ctx.moveTo(gx, y + 4); ctx.lineTo(gx + Math.cos(a) * 4.5, y + 4 + Math.sin(a) * 4.5); ctx.stroke();
        }
      }
      break;
    }
    case 'column': {
      ctx.fillStyle = '#8f949a';
      rrect(ctx, x + 6, y - 30, w - 12, h + 26, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 12, y - 26, 5, h + 18);
      ctx.fillStyle = '#5a5f66';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 4, y - 22 + i * 22, w - 8, 3);
      ctx.fillStyle = `rgba(255,140,60,${0.4 + Math.sin(time * 3) * 0.3})`;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h - 10, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'vault': {
      ctx.fillStyle = '#4a4f55';
      ctx.fillRect(x + 1, y - 10, w - 2, h + 8);
      ctx.fillStyle = '#6a7078';
      ctx.beginPath(); ctx.arc(x + 16, y + 6, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d9b24a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 16, y + 6, 6, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + 0.3;
        ctx.beginPath(); ctx.moveTo(x + 16, y + 6); ctx.lineTo(x + 16 + Math.cos(a) * 8, y + 6 + Math.sin(a) * 8); ctx.stroke();
      }
      break;
    }
    case 'painting': {
      ctx.fillStyle = '#b8892e';
      ctx.fillRect(x + 3, y + 3, w - 6, h * 0.55);
      ctx.fillStyle = '#5a6a7a';
      ctx.fillRect(x + 6, y + 6, w - 12, h * 0.55 - 6);
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(x + w / 2 - 2, y + 8, 4, h * 0.4);
      break;
    }
    case 'fence': {
      ctx.fillStyle = '#e9dfc7';
      ctx.fillRect(x, y + 12, w, 3); ctx.fillRect(x, y + 20, w, 3);
      for (let i = 2; i < w; i += 8) ctx.fillRect(x + i, y + 6, 3, 22);
      break;
    }
    default: {
      if (drawFarmProp(ctx, p, x, y, w, h, opts)) break; // v0.29.0: Lariat's farm and dairy props
      ctx.fillStyle = '#8a7a6a';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    }
  }
}
