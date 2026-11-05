// The ground of a battle map (v0.102.0): the game's own ground painter (the one every street map uses) run over the map's glyph grid, graded to the biome (snow, desert, steppe, wet), so a battle
// field has the same paving, kerbs, grass, dirt tracks, furrows and water as the rest of the game. Baked once per battle. Browser only. Ported from docs/mockups/src/war/g_gen.js.
import { GameMap } from '../world/gameMap.js';
import { buildPixelGround } from './drawPixelGround.js';
import { PROP_TYPES } from '../content/props.js';
import { ART_BIOME } from '../content/battle.js';
import { hash as H3 } from './drawRoofed.js';
const T = 32;
const INK = '#1b1a24';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** The game's own map object for a battle map: the glyph grid as rows, with its props and fields (the props are painted separately; the ground painter reads them for what lies under). */
export function gameMapOf(map) {
  const rows = []; for (let y = 0; y < map.h; y++) { let r = ''; for (let x = 0; x < map.w; x++) r += String.fromCharCode(map.surf[y * map.w + x]); rows.push(r); }
  return new GameMap({ id: 'battle', name: 'battle', kind: 'outdoor', tiles: rows, buildings: [], props: map.props, doors: [], spots: {}, fields: map.fields }, PROP_TYPES);
}

// ------------------------------------------------------------------------------------------------- biome grading of the painted ground
export function grade(canvas, biome) {
  if (biome === 'temperate') return canvas; const g = canvas.getContext('2d'); const w = canvas.width, h = canvas.height; const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2]; const sat = Math.max(r, gg, b) - Math.min(r, gg, b); const lum = (r + gg + b) / 3; const road = sat < 22 && lum < 105; const paved = sat < 26 && lum >= 105; const greenish = gg > r + 6 && gg > b + 6; const dirt = r > b + 26 && r >= gg; const water = b > r + 26 && b > gg + 6; const n = (i / 4) % 7;
    if (biome === 'snow') { if (greenish || dirt) { const k = 0.84; d[i] = r + (222 - r + (n - 3)) * k; d[i + 1] = gg + (230 - gg + (n - 3)) * k; d[i + 2] = b + (242 - b) * k; } else if (water) { d[i] = r + (176 - r) * 0.45; d[i + 1] = gg + (206 - gg) * 0.45; d[i + 2] = b + (226 - b) * 0.3; } else if (paved) { d[i] = r + (214 - r) * 0.35; d[i + 1] = gg + (222 - gg) * 0.35; d[i + 2] = b + (236 - b) * 0.35; } else if (road) { d[i] = r * 0.96 + 6; d[i + 1] = gg * 0.96 + 8; d[i + 2] = b * 0.98 + 12; } }
    else if (biome === 'desert') { if (!road) { d[i] = Math.min(255, r * 1.05 + 4); d[i + 1] = gg * 0.99; d[i + 2] = b * 0.88; } else { d[i] = r * 1.04; d[i + 1] = gg; d[i + 2] = b * 0.92; } }
    else if (biome === 'steppe') { if (greenish) { const k = 0.6; d[i] = r + (186 - r) * k; d[i + 1] = gg + (170 - gg) * k; d[i + 2] = b + (92 - b) * k; } }
    else if (biome === 'mud') { if (greenish) { d[i] = r * 0.72; d[i + 1] = gg * 0.88; d[i + 2] = b * 0.7; } else if (dirt) { d[i] = r * 0.78; d[i + 1] = gg * 0.74; d[i + 2] = b * 0.7; } } }
  g.putImageData(img, 0, 0); return canvas;
}


// ------------------------------------------------------------------------------------------------- trenches, wire and craters (v0.102.1), painted on the ground
const bagCol = { temperate: ['#a89a6a', '#b8aa78', '#8a7c52'], snow: ['#dfe3ea', '#eef0f6', '#aab2c0'], desert: ['#c8b080', '#d8c090', '#a8905e'], steppe: ['#b0a068', '#c0b078', '#8e8050'], mud: ['#76644a', '#867456', '#56462e'] };
const earth = { temperate: ['#4a3a2a', '#6a5236'], snow: ['#5a5a60', '#8a8478'], desert: ['#7a6444', '#9a8260'], steppe: ['#5a4a30', '#7a6a44'], mud: ['#3a2e20', '#54402c'] };
function sandbags(g, x, y, w, h, biome, seed) { const [a, b, c] = bagCol[biome] || bagCol.temperate; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); for (let r = 0, yy = y; yy < y + h; r++, yy += 8) for (let xx = x - (r % 2) * 7; xx < x + w; xx += 14) { const k = H3(seed, xx, yy); g.fillStyle = INK; g.fillRect(xx, yy, 14, 10); g.fillStyle = k < 0.5 ? a : b; g.fillRect(xx + 2, yy + 2, 10, 6); g.fillStyle = c; g.fillRect(xx + 2, yy + 6, 10, 2); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(xx + 2, yy + 2, 6, 2); g.fillStyle = INK; g.fillRect(xx, yy, 2, 2); g.fillRect(xx + 12, yy, 2, 2); } g.restore(); }
/** cells: Set of "x,y" tile cells that are trench; draws floor, boards, shaded edges and sandbag parapets (heavier on the enemy side, dir +1 = enemy to the east) */
export function paintTrench(g, cells, biome, dir = 1, seed = 1) {
  const has = (x, y) => cells.has(`${x},${y}`); const [fl, fl2] = earth[biome] || earth.temperate;
  for (const k of cells) { const [tx, ty] = k.split(',').map(Number); const px = tx * T, py = ty * T; g.fillStyle = fl; g.fillRect(px, py, T, T); for (let r = 0; r < T; r += 8) { g.fillStyle = (r / 8 + tx) % 2 ? '#6a4a2e' : '#7a5a38'; g.fillRect(px + 2, py + r + 1, T - 4, 6); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + 2, py + r + 7, T - 4, 1); } if (H3(tx, ty, seed) > 0.8) { g.fillStyle = '#2a2a30'; g.fillRect(px + 6, py + 6, 8, 5); g.fillStyle = '#4a4a54'; g.fillRect(px + 6, py + 6, 8, 2); } }
  for (const k of cells) { const [tx, ty] = k.split(',').map(Number); const px = tx * T, py = ty * T; const sd = [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]; for (const [dx, dy, n] of sd) { if (has(tx + dx, ty + dy)) continue; const heavy = (n === 'e' ? dir > 0 : n === 'w' ? dir < 0 : false); const th = heavy ? 18 : 12; g.fillStyle = 'rgba(0,0,0,.38)'; if (n === 'n') g.fillRect(px, py, T, 6); if (n === 's') g.fillRect(px, py + T - 6, T, 6); if (n === 'w') g.fillRect(px, py, 6, T); if (n === 'e') g.fillRect(px + T - 6, py, 6, T);
      // the parapet sits on the neighbouring tile, against the edge
      if (n === 'n') sandbags(g, px, py - th, T, th, biome, seed + tx); if (n === 's') sandbags(g, px, py + T, T, th, biome, seed + ty); if (n === 'w') sandbags(g, px - th, py, th, T, biome, seed + ty); if (n === 'e') sandbags(g, px + T, py, th, T, biome, seed + ty); } }
}
export function paintWire(g, pts, biome = 'temperate') { g.save(); g.lineCap = 'butt'; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const L = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(L / 10); g.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < n; k++) { const t = k / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; g.fillRect(Math.round(x) + 2, Math.round(y) + 6, 4, 2); } for (let k = 0; k < n; k++) { const t = k / n, x = Math.round((x1 + (x2 - x1) * t) / 2) * 2, y = Math.round((y1 + (y2 - y1) * t + (k % 2 ? 4 : -4)) / 2) * 2; g.fillStyle = '#2a2a32'; g.fillRect(x, y, 2, 2); g.fillRect(x + 4, y + 4, 2, 2); g.fillRect(x + 4, y, 2, 2); g.fillRect(x, y + 4, 2, 2); g.fillRect(x + 2, y + 2, 2, 2); g.fillStyle = '#8a8a96'; g.fillRect(x + 2, y + 2, 2, 2); } for (let k = 0; k <= n; k += 4) { const t = k / Math.max(1, n); const x = Math.round(x1 + (x2 - x1) * t), y = Math.round(y1 + (y2 - y1) * t); g.fillStyle = INK; g.fillRect(x - 1, y - 12, 6, 16); g.fillStyle = '#7a5a38'; g.fillRect(x, y - 11, 4, 14); g.fillStyle = '#a08050'; g.fillRect(x, y - 11, 1, 14); } } g.restore(); }
export function paintCrater(g, x, y, r, biome = 'temperate', seed = 1) { const [dark, rimc] = earth[biome] || earth.temperate; const rimCol = biome === 'snow' ? '#c8ccd4' : biome === 'desert' ? '#b09870' : '#8a7458'; g.save(); for (let dy = -r - 4; dy <= r + 4; dy += 2) { const ry = dy; const rr = r + 3; const wOut = Math.sqrt(Math.max(0, rr * rr - ry * ry * 1.5)); const wIn = Math.sqrt(Math.max(0, r * r - ry * ry * 1.5)); if (wOut > 0) { g.fillStyle = 'rgba(30,20,10,.28)'; g.fillRect(Math.round(x - wOut - 2), y + dy + 3, Math.round(wOut * 2), 2); g.fillStyle = dy < 0 ? shd(rimCol, 18) : shd(rimCol, -16); g.fillRect(Math.round(x - wOut), y + dy, Math.round(wOut * 2), 2); } if (wIn > 0) { g.fillStyle = dy < 0 ? '#1c140e' : '#2e2216'; g.fillRect(Math.round(x - wIn), y + dy, Math.round(wIn * 2), 2); } } g.fillStyle = INK; for (let i = 0; i < 6; i++) g.fillRect(x + Math.round((H3(seed, i) - 0.5) * 2 * r * 1.4), y + Math.round((H3(seed, i + 9) - 0.5) * 2 * r), 2, 2); g.restore(); }
const shd = (h, k) => { const c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)].map((v) => Math.max(0, Math.min(255, v + k))); return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

/** The whole ground, painted once: the game's painter, then the biome grade. */
export function bakeGround(map, gm = gameMapOf(map)) {
  const raw = buildPixelGround(gm, mk); const ground = mk(raw.width, raw.height); ground.getContext('2d').drawImage(raw, 0, 0);
  const biome = ART_BIOME[map.biome] || 'temperate'; grade(ground, biome);
  const D = map.decor; if (D) {
    const g = ground.getContext('2d'); g.imageSmoothingEnabled = false;
    for (const [x, y, r, i] of D.craters || []) paintCrater(g, x, y, r, biome, i);
    const west = new Set(); const east = new Set(); for (const k of D.trench || []) (+k.split(',')[0] < map.w / 2 ? west : east).add(k);
    paintTrench(g, west, biome, 1, D.seed); paintTrench(g, east, biome, -1, D.seed + 7);
    for (const pts of D.wires || []) paintWire(g, pts.map(([x, y]) => [x * T, y * T]), biome);
  }
  return ground;
}
