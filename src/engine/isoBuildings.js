// Buildings in the isometric view (docs/RENDERING.md 2.4): original procedural pixel art, drawn once per
// building into a cached picture of its south face, east face and roof, and the open/roofed/faded state
// the renderer owns (never saved, never read by the simulation).
//
// All the pictures are built on whole pixels with no anti-aliasing: faces are painted flat (u across,
// v up) and then sheared by copying one pixel column at a time on the 2:1 staircase that the ground
// diamond's own edge follows, so a wall meets the ground without a gap or an overlap.
import { hash2 } from '../core/rng.js';

const TILE = 32;
const INK = '#1b1a24';
export const STOREY = 48; // px of wall to a storey of an ordinary building
const CORN = 6; // cornice at the top of a wall
const PLINTH = 4; // stone course at its foot
const DOOR_H = 30;
const MAX_PICTURES = 40;

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

export function shade(hex, amt) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

// ------------------------------------------------------------------ the diamond bake
/**
 * Re-draw a flat (top-down) picture as a 2:1 diamond, one source pixel to each destination pixel
 * centre (nearest, no seams): neighbouring pieces on the same lattice tile exactly. The result is
 * (w + h) wide and (w + h) / 2 tall; source (u, v) lands at x = u - v + h, y = (u + v) / 2.
 */
export function bakeDiamond(src) {
  const w = src.width;
  const h = src.height;
  const dw = w + h;
  const dh = (w + h) >> 1;
  const sd = new Uint32Array(src.getContext('2d').getImageData(0, 0, w, h).data.buffer);
  const out = new Uint32Array(dw * dh);
  for (let py = 0; py < dh; py++) {
    const yy = py + 0.5;
    for (let px = 0; px < dw; px++) {
      const xx = (px + 0.5 - h) / 2;
      const u = yy + xx;
      const v = yy - xx;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      out[py * dw + px] = sd[(v | 0) * w + (u | 0)];
    }
  }
  const dst = mk(dw, dh);
  dst.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(out.buffer), dw, dh), 0, 0);
  return dst;
}

/** A flat-colour 2:1 diamond for a footprint a × b whose bounding box starts at (left, top). */
function fillDiamond(ctx, color, left, top, a, b) {
  ctx.fillStyle = color;
  const rows = (a + b) >> 1;
  for (let py = 0; py < rows; py++) {
    const yy = py + 0.5;
    let x0 = -1;
    let x1 = -1;
    for (let px = 0; px < a + b; px++) {
      const xx = (px + 0.5 - b) / 2;
      const u = yy + xx;
      const v = yy - xx;
      if (u >= 0 && v >= 0 && u < a && v < b) { if (x0 < 0) x0 = px; x1 = px; }
    }
    if (x0 >= 0) ctx.fillRect(left + x0, top + py, x1 - x0 + 1, 1);
  }
}

/**
 * An upright box a × b (ground) and h tall, its base's north corner at (nx, ny) in canvas pixels.
 * `f.top`, `f.south`, `f.east`: a colour, or a flat canvas (top: a plan a × b; south: a wide, h tall;
 * east: b wide, h tall, its left edge the south end). Columns follow the ground's own staircase.
 */
export function prism(ctx, nx, ny, a, b, h, f) {
  const left = nx - b;
  if (f.south) {
    const img = typeof f.south !== 'string';
    if (!img) ctx.fillStyle = f.south;
    for (let j = 0; j < a; j++) {
      const bottom = ny + (b >> 1) + (j >> 1);
      if (img) ctx.drawImage(f.south, j, 0, 1, h, left + j, bottom - h, 1, h); else ctx.fillRect(left + j, bottom - h, 1, h);
    }
  }
  if (f.east) {
    const img = typeof f.east !== 'string';
    if (!img) ctx.fillStyle = f.east;
    for (let k = 0; k < b; k++) {
      const bottom = ny + ((a + b) >> 1) - ((k + 1) >> 1);
      if (img) ctx.drawImage(f.east, k, 0, 1, h, left + a + k, bottom - h, 1, h); else ctx.fillRect(left + a + k, bottom - h, 1, h);
    }
  }
  if (f.top) {
    if (typeof f.top === 'string') fillDiamond(ctx, f.top, left, ny - h, a, b);
    else ctx.drawImage(bakeDiamond(f.top), left, ny - h);
  }
}

// ------------------------------------------------------------------ pixel text
const textCache = new Map();
/** Text as crisp art pixels (no anti-aliased grey): drawn, then each pixel made fully on or off. */
function textSprite(text, color, size) {
  const key = `${size}|${color}|${text}`;
  let c = textCache.get(key);
  if (c) return c;
  const font = `bold ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  const m = mk(4, 4).getContext('2d');
  m.font = font;
  const w = Math.ceil(m.measureText(text).width) + 2;
  c = mk(w, size + 4);
  const x = c.getContext('2d');
  x.font = font;
  x.textBaseline = 'top';
  x.fillStyle = color;
  x.fillText(text, 1, 1);
  const img = x.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  x.putImageData(img, 0, 0);
  if (textCache.size > 200) textCache.clear();
  textCache.set(key, c);
  return c;
}

/** A sign plate with its text, centred on cx, top at y; fits inside maxW. */
function signPlate(c, text, cx, y, maxW, bg = '#3a2c25', fg = '#f6e7c1', edge = '#5a4438') {
  let s = textSprite(text, fg, 9);
  if (s.width + 8 > maxW) s = textSprite(text, fg, 7);
  let label = text;
  while (s.width + 8 > maxW && label.length > 4) { label = `${label.slice(0, -2)}`; s = textSprite(`${label}…`, fg, 7); }
  const w = s.width + 6;
  const x = Math.round(cx - w / 2);
  c.fillStyle = INK; c.fillRect(x - 1, y - 1, w + 2, 13);
  c.fillStyle = bg; c.fillRect(x, y, w, 11);
  c.fillStyle = edge; c.fillRect(x, y, w, 1);
  c.drawImage(s, x + 3, y + 1);
}

// ------------------------------------------------------------------ sizes
/** A building's height in px: towers by storeys (capped near 420), the rest one or two storeys. */
export function buildingHeight(b) {
  if (b.storeys) return 8 + b.storeys * STOREY; // (a building that says how many floors it has: the battle's)
  if (b.round) return 190;
  if (b.tower) {
    const t = b.tower;
    return t <= 3 ? 8 + t * STOREY : Math.min(420, 8 + 3 * STOREY + (t - 3) * 13);
  }
  const big = b.w * b.h >= 48 || Math.max(b.w, b.h) >= 9;
  return 8 + (big && !b.shabby ? 2 : 1) * STOREY;
}

export const buildingBox = (b, L = { x: 0, y: 0 }) => ({ x0: b.x * TILE + L.x, y0: b.y * TILE + L.y, x1: (b.x + b.w) * TILE + L.x, y1: (b.y + b.h) * TILE + L.y });

// ------------------------------------------------------------------ faces
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Paint a window at (x, y) w × h on a flat face. */
function windowAt(c, x, y, w, h, o) {
  R(c, x - 1, y - 1, w + 2, h + 2, o.trim);
  if (o.lit) {
    R(c, x, y, w, h, '#ffd88a');
    R(c, x, y, w, 2, '#fff0c0');
    R(c, x + (w >> 1), y, 1, h, shade(o.trim, 10));
  } else if (o.night) {
    R(c, x, y, w, h, '#26324a');
    R(c, x, y, 2, h, '#34425e');
    R(c, x + (w >> 1), y, 1, h, shade(o.trim, 0));
  } else {
    R(c, x, y, w, h, o.glass);
    R(c, x, y, Math.max(2, w >> 2), h, shade(o.glass, 34));
    R(c, x + (w >> 1), y, 1, h, o.trim);
    R(c, x, y + (h >> 1), w, 1, shade(o.glass, -30));
  }
  R(c, x - 2, y + h + 1, w + 4, 2, shade(o.wall, 26)); // the sill
}

/** An ordinary building's wall, flat: w across, h up. `south` carries the door, the awning and the sign. */
function paintWall(b, w, h, south, v, seedOff) {
  const cv = mk(w, h);
  const c = cv.getContext('2d');
  const wallC = south ? b.wall || '#d8cdb8' : shade(b.wall || '#d8cdb8', -24);
  const trim = south ? b.trim || '#5a4a3a' : shade(b.trim || '#5a4a3a', -14);
  const glass = b.glass || '#7aa3b8';
  R(c, 0, 0, w, h, wallC);
  // brick courses and a little grain, so it isn't a flat colour
  for (let y = 9; y < h - PLINTH; y += 6) R(c, 0, y, w, 1, shade(wallC, -9));
  for (let i = 0; i < (w * h) / 36; i++) {
    const x = Math.floor(hash2(i + seedOff, b.x) * w);
    const y = Math.floor(hash2(b.y, i + seedOff) * h);
    R(c, x, y, 1, 1, shade(wallC, hash2(i, y) > 0.5 ? 12 : -14));
  }
  if (b.shabby) for (let i = 0; i < 5; i++) R(c, Math.floor(hash2(i, b.x + seedOff) * (w - 12)), Math.floor(hash2(b.y, i) * (h - 20)) + 8, 10, 6, shade(wallC, -22));
  // cornice and plinth
  R(c, 0, 0, w, CORN, shade(trim, 12));
  R(c, 0, 0, w, 1, shade(trim, 44));
  R(c, 0, CORN, w, 1, shade(trim, -34));
  R(c, 0, h - PLINTH, w, PLINTH, shade(wallC, -30));
  R(c, 0, h - PLINTH, w, 1, shade(wallC, -6));
  R(c, 0, 0, 1, h, shade(wallC, 16)); R(c, w - 1, 0, 1, h, shade(wallC, -26)); // the corners
  const storeys = Math.max(1, Math.round((h - CORN - PLINTH - 4) / STOREY));
  const sh = (h - CORN - PLINTH) / storeys;
  const doorX = south && b.door ? (b.door.x - b.x) * TILE + 6 : -999;
  if (b.columns) for (let x = 6; x < w - 8; x += 24) if (x + 6 < doorX - 2 || x > doorX + 24) { R(c, x, CORN + 1, 5, h - CORN - PLINTH - 1, '#f7f4ee'); R(c, x + 4, CORN + 1, 1, h - CORN - PLINTH - 1, '#cfcac0'); }
  for (let s = 0; s < storeys; s++) {
    const base = h - PLINTH - s * sh; // the storey's floor line
    const wy = Math.round(base - sh + 10);
    for (let x = 9; x + 12 <= w - 8; x += 22) {
      if (s === 0 && south && x + 14 > doorX - 4 && x < doorX + 26) continue; // the doorway
      const lit = v.lit && hash2(x + s * 31, b.x + b.y) > 0.25;
      windowAt(c, x, wy, 12, Math.min(18, Math.round(sh - 20)), { trim, glass, lit, night: v.night, wall: wallC });
    }
  }
  if (south) {
    if (b.door) {
      const dy = h - PLINTH - DOOR_H;
      R(c, doorX - 1, dy - 1, 22, DOOR_H + 1, trim);
      R(c, doorX, dy, 20, DOOR_H, v.locked ? shade(trim, -25) : '#6b4a32');
      R(c, doorX + 2, dy + 2, 16, 10, v.lit ? '#ffd68c' : v.night ? '#2a3550' : 'rgba(190,220,235,0.7)');
      R(c, doorX + 9, dy, 2, DOOR_H, trim);
      R(c, doorX + 14, dy + 17, 2, 2, '#e8c35a');
      R(c, doorX - 3, h - PLINTH, 26, 2, shade(wallC, -44)); // the step
    }
    if (b.awning) {
      const ay = h - PLINTH - DOOR_H - 6;
      for (let i = 0; i * 6 < w - 4; i++) {
        const cc = i % 2 ? '#f3e5c6' : b.awning;
        R(c, 2 + i * 6, ay, Math.min(6, w - 2 - 2 - i * 6), 8, cc);
        R(c, 2 + i * 6, ay, Math.min(6, w - 2 - 2 - i * 6), 1, shade(cc, 30));
        R(c, 2 + i * 6 + 1, ay + 8, Math.min(4, w - 6 - i * 6), 2, cc);
      }
      R(c, 2, ay + 10, w - 4, 2, 'rgba(16,14,36,0.28)');
    }
    if (b.sign) {
      const dyTop = h - PLINTH - DOOR_H - (b.awning ? 20 : 15);
      const cx = b.door ? doorX + 10 : w / 2;
      const half = Math.min(cx - 3, w - cx - 3);
      signPlate(c, b.sign, cx, Math.max(CORN + 2, dyTop), half * 2 - 2, b.marquee ? '#141018' : '#3a2c25', b.marquee ? '#e8c35a' : '#f6e7c1', b.marquee ? '#c9a24a' : '#5a4438');
    }
  }
  return cv;
}

/** A tower's curtain wall, flat: glass in floors between slab lines, piers at the corners, a lobby at the foot. */
function paintTowerWall(b, w, h, south, v) {
  const cv = mk(w, h);
  const c = cv.getContext('2d');
  const wallC = south ? b.wall || '#4a5a6e' : shade(b.wall || '#4a5a6e', -20);
  const glass = south ? b.glass || '#8fb4c8' : shade(b.glass || '#8fb4c8', -26);
  const LOBBY = 26;
  const FL = 11;
  R(c, 0, 0, w, h, wallC);
  const top = CORN + 2;
  const floors = Math.max(1, Math.floor((h - top - LOBBY) / FL));
  for (let f = 0; f < floors; f++) {
    const y = h - LOBBY - (f + 1) * FL;
    R(c, 3, y, w - 6, FL - 2, f % 2 ? shade(glass, -8) : glass);
    // a diagonal sheen across the glass
    for (let x = 3 + ((f * 13) % 40); x < w - 3; x += 40) R(c, x, y, 5, FL - 2, shade(glass, 26));
    if (v.night) for (let x = 3; x + 8 <= w - 3; x += 8) if (hash2(x + f * 17 + b.x, f * 7 + b.y + (south ? 0 : 99)) > 0.6) R(c, x + 1, y + 1, 6, FL - 4, '#ffe2a0');
    R(c, 0, y + FL - 2, w, 2, shade(wallC, 10)); // the slab
  }
  for (let x = 3; x < w - 3; x += 8) R(c, x, top, 1, h - top - LOBBY, shade(wallC, -6)); // the mullions
  R(c, 0, 0, w, CORN + 2, shade(wallC, 22));
  R(c, 0, 0, w, 1, shade(wallC, 54));
  R(c, 0, CORN + 1, w, 1, shade(wallC, -30));
  R(c, 0, 0, 3, h, shade(wallC, 14)); R(c, w - 3, 0, 3, h, shade(wallC, -22)); // the piers
  // the lobby: dark glass, the doors where the building's door is, the name above
  R(c, 0, h - LOBBY, w, LOBBY, shade(wallC, -26));
  R(c, 0, h - LOBBY, w, 2, shade(wallC, 28));
  for (let x = 4; x + 14 <= w - 4; x += 16) {
    if (south && b.door && x + 16 > (b.door.x - b.x) * TILE - 2 && x < (b.door.x - b.x) * TILE + TILE + 2) continue;
    R(c, x, h - LOBBY + 5, 14, LOBBY - 9, '#101726');
    R(c, x, h - LOBBY + 5, 14, 4, v.lit ? '#ffd88a' : shade(glass, -40));
    R(c, x + 6, h - LOBBY + 5, 1, LOBBY - 9, shade(wallC, 10));
  }
  R(c, 0, h - 3, w, 3, shade(wallC, -44));
  if (south && b.door) {
    const dx = (b.door.x - b.x) * TILE + 4;
    R(c, dx - 1, h - 25, 26, 23, '#0e1118');
    R(c, dx, h - 24, 11, 22, v.lit || v.night ? '#ffe2a0' : shade(glass, -10)); R(c, dx + 13, h - 24, 11, 22, v.lit || v.night ? '#ffe2a0' : shade(glass, -10));
    R(c, dx + 11, h - 24, 2, 22, '#c9a24a');
    R(c, dx - 3, h - 2, 30, 2, shade(wallC, -50));
  }
  if (south && b.sign) {
    const cx = b.door ? (b.door.x - b.x) * TILE + 16 : w / 2;
    signPlate(c, b.sign, cx, h - LOBBY - 15, Math.min(cx - 4, w - cx - 4) * 2, '#141822', '#e8e0c8', '#c9a24a');
  }
  return cv;
}

/** The lighthouse, as a striped column of a box (the one round building keeps its scene-change door). */
function paintStriped(b, w, h, south, v) {
  const cv = mk(w, h);
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y += 20) R(c, 0, y, w, 20, (y / 20) % 2 ? '#b8362e' : '#ece6dc');
  R(c, 0, 0, w, 6, '#2a2e38');
  R(c, 0, 8, w, 14, v.lit || v.night ? '#ffe9a0' : '#8fb4c8');
  R(c, 0, 0, 2, h, 'rgba(255,255,255,0.35)');
  if (!south) R(c, 0, 0, w, h, 'rgba(10,10,40,0.22)');
  if (south && b.door) R(c, (b.door.x - b.x) * TILE + 6, h - 28, 20, 28, '#4a3322');
  return cv;
}

/** The roof, flat (top-down): a membrane in strips, a parapet ring, a little weathering. */
function paintRoofPlan(b, w, d) {
  const cv = mk(w, d);
  const c = cv.getContext('2d');
  const base = b.tower ? shade(b.wall || '#5a6270', 8) : b.roof ? shade(b.roof, 0) : shade(b.wall || '#d8cdb8', -50);
  R(c, 0, 0, w, d, base);
  for (let x = 12; x < w; x += 16) R(c, x, 0, 1, d, shade(base, -10));
  for (let i = 0; i < (w * d) / 30; i++) R(c, Math.floor(hash2(i, b.x) * w), Math.floor(hash2(b.y, i) * d), 1, 1, shade(base, hash2(i, 5) > 0.5 ? 10 : -12));
  const cap = shade(b.wall || '#d8cdb8', b.tower ? 18 : 6);
  const T = 4;
  R(c, 0, 0, w, T, cap); R(c, 0, d - T, w, T, cap); R(c, 0, 0, T, d, cap); R(c, w - T, 0, T, d, cap);
  R(c, T, T, w - 2 * T, 1, shade(base, -34)); R(c, T, T, 1, d - 2 * T, shade(base, -34)); // the shade under the parapet
  return cv;
}

/** Roof furniture as small boxes: units, vents, a stair head, a tank, an aerial. */
function roofDetails(ctx, b, Wp, Hp, nx, ny) {
  const placed = [];
  const tryPlace = (a, bb, h, faces, seed) => {
    for (let k = 0; k < 14; k++) {
      const u = 10 + Math.floor(hash2(b.x * 3 + seed, b.y + k) * Math.max(1, Wp - a - 20));
      const v = 10 + Math.floor(hash2(b.y * 5 + seed, b.x + k) * Math.max(1, Hp - bb - 20));
      if (u + a > Wp - 8 || v + bb > Hp - 8) continue;
      if (placed.some((p) => u < p.u + p.a + 6 && p.u < u + a + 6 && v < p.v + p.b + 6 && p.v < v + bb + 6)) continue;
      placed.push({ u, v, a, b: bb, h, faces });
      return;
    }
  };
  const n = Math.min(6, 2 + Math.floor((Wp * Hp) / 14000));
  const grey = { top: '#a9aeb4', south: '#7f858c', east: '#5e646c' };
  const dark = { top: '#6a6e76', south: '#4c5058', east: '#3a3e46' };
  const stair = { top: shade(b.wall || '#d8cdb8', 16), south: b.wall || '#d8cdb8', east: shade(b.wall || '#d8cdb8', -24) };
  tryPlace(Math.min(36, Wp / 4 | 0) & ~1, Math.min(26, Hp / 4 | 0) & ~1, b.tower ? 22 : 16, stair, 1);
  for (let i = 0; i < n; i++) tryPlace(i % 2 ? 12 : 22, i % 2 ? 12 : 14, i % 2 ? 14 : 10, i % 2 ? dark : grey, 10 + i);
  if (b.tower >= 12) tryPlace(22, 22, 20, { top: '#8a6a4a', south: '#6e5238', east: '#523c28' }, 40); // a water tank
  placed.sort((p, q) => p.u + p.v + (p.a + p.b) / 2 - (q.u + q.v + (q.a + q.b) / 2));
  for (const p of placed) prism(ctx, nx + (p.u - p.v), ny + ((p.u + p.v) >> 1), p.a, p.b, p.h, p.faces);
}

/** The cached picture of a building: roof, south face, east face; origin = its north-west ground corner. */
function paintPicture(b, v) {
  const Wp = b.w * TILE;
  const Hp = b.h * TILE;
  const Hh = buildingHeight(b);
  const MT = b.tower >= 18 ? 52 : 22; // room above the roof for what stands on it
  const picW = Wp + Hp;
  const picH = MT + Hh + ((Wp + Hp) >> 1);
  const cv = mk(picW, picH);
  const c = cv.getContext('2d');
  const wallFn = b.round ? paintStriped : b.tower ? paintTowerWall : paintWall;
  const south = wallFn(b, Wp, Hh, true, v, 0);
  const east = wallFn(b, Hp, Hh, false, v, 77);
  const roof = paintRoofPlan(b, Wp, Hp);
  prism(c, Hp, MT + Hh, Wp, Hp, Hh, { top: roof, south, east });
  roofDetails(c, b, Wp, Hp, Hp, MT);
  if (b.tower >= 18) { // an aerial with a red lamp
    const ax = Hp + (Wp >> 1) - (Hp >> 1);
    const ay = MT + ((Wp + Hp) >> 2);
    R(c, ax, ay - 44, 2, 44, '#6a6e78');
    R(c, ax - 1, ay - 46, 4, 3, '#ff3a2a');
  }
  return { canvas: cv, ox: Hp, oy: MT + Hh, h: Hh };
}

// ------------------------------------------------------------------ wall columns for open rooms and streets
const COL_FACES = new Map();
/**
 * A wall tile as an upright box. kind: 'tall' (a room's north or west wall, a storey, its inner face plain),
 * 'low' (a kerb, ~10 px) or 'street' (a free-standing wall). pal: { wall, trim, glass }.
 */
export function columnPicture(kind, pal) {
  const key = `${kind}|${pal.wall}|${pal.trim}|${pal.glass || ''}`;
  let pic = COL_FACES.get(key);
  if (pic) return pic;
  const h = kind === 'tall' ? STOREY + 8 : kind === 'street' ? 26 : 10;
  const MT = 2;
  const cv = mk(TILE * 2, h + TILE + MT);
  const c = cv.getContext('2d');
  const mkFace = (col, east) => {
    const f = mk(TILE, h);
    const x = f.getContext('2d');
    R(x, 0, 0, TILE, h, col);
    if (kind === 'tall') {
      if (pal.glass) { // a glass wall: panes between mullions
        R(x, 0, 0, TILE, h, shade(pal.trim, 0));
        R(x, 2, 6, TILE - 4, h - 14, east ? shade(pal.glass, -22) : pal.glass);
        R(x, 4, 8, 5, h - 18, shade(pal.glass, 30));
        R(x, TILE >> 1, 6, 1, h - 14, pal.trim);
      } else {
        for (let y = 9; y < h - 12; y += 6) R(x, 0, y, TILE, 1, shade(col, -8));
        R(x, 0, h - 12, TILE, 12, shade(col, -16)); // the dado
        R(x, 0, h - 13, TILE, 1, shade(pal.trim, 20));
        R(x, 0, h - 3, TILE, 3, shade(pal.trim, -6)); // the skirting
      }
      R(x, 0, 0, TILE, 2, shade(pal.trim, 30));
    } else if (kind === 'street') {
      for (let y = 4; y < h; y += 6) R(x, 0, y, TILE, 1, shade(col, -14));
      for (let y = 0; y < h; y += 6) R(x, ((y / 6) & 1) * 8 + 4, y, 1, 6, shade(col, -14));
      R(x, 0, 0, TILE, 2, shade(col, 30));
    } else R(x, 0, 0, TILE, 2, shade(col, 22));
    return f;
  };
  const wallC = kind === 'street' ? '#6a5650' : pal.wall;
  const cap = kind === 'street' ? '#7a6660' : kind === 'tall' ? shade(pal.wall, -12) : shade(pal.wall, -6);
  prism(c, TILE, MT + h, TILE, TILE, h, { top: cap, south: mkFace(shade(wallC, kind === 'tall' ? 6 : 0), false), east: mkFace(shade(wallC, -22), true) });
  pic = { canvas: cv, ox: TILE, oy: MT + h, h };
  if (COL_FACES.size > 60) COL_FACES.clear();
  COL_FACES.set(key, pic);
  return pic;
}

// ------------------------------------------------------------------ state
export class IsoBuildings {
  constructor(maxPictures = MAX_PICTURES) {
    this.max = maxPictures;
    this.pictures = new Map(); // key → { canvas, ox, oy, h }
    this.states = new WeakMap(); // building → { t (0 roofed … 1 open), wantAt, fade (0 … 1: the local hole) }
    this.scratch = null;
  }

  stateOf(b) {
    let s = this.states.get(b);
    if (!s) this.states.set(b, (s = { t: 0, wantAt: -1e9, fade: 0, init: false }));
    return s;
  }

  /** Move a building towards open (the player is in its room) or roofed, with a short hold so a doorway doesn't flicker. */
  step(b, want, now, dt) {
    const s = this.stateOf(b);
    if (!s.init) { s.init = true; s.t = want ? 1 : 0; }
    if (want) s.wantAt = now;
    const target = want || now - s.wantAt < 0.35 ? 1 : 0;
    const k = dt / 0.2;
    s.t = target > s.t ? Math.min(1, s.t + k) : target < s.t ? Math.max(0, s.t - k) : s.t; // (at rest it stays: it used to dip by one step every other frame)
    return s;
  }

  /** The hole's strength follows whether the focus is behind the building (eased over about 0.15 s). */
  stepFade(b, want, dt) {
    const s = this.stateOf(b);
    const k = dt / 0.15;
    s.fade = want ? Math.min(1, s.fade + k) : Math.max(0, s.fade - k);
    return s.fade;
  }

  picture(b, v) {
    const key = `${b.id}|${b.x},${b.y}|${v.lit ? 1 : 0}${v.night ? 1 : 0}${v.locked ? 1 : 0}`;
    let p = this.pictures.get(key);
    if (p) {
      this.pictures.delete(key);
      this.pictures.set(key, p);
      return p;
    }
    p = paintPicture(b, v);
    this.pictures.set(key, p);
    while (this.pictures.size > this.max) this.pictures.delete(this.pictures.keys().next().value);
    return p;
  }

  /**
   * Draw the picture (ctx already in iso space, whole-pixel translated) with a soft round hole punched at
   * (hx, hy), in iso px, of radius r. `holeSprite(r)` is a dithered pool (a black disc fading out).
   */
  drawWithHole(ctx, pic, x, y, hx, hy, r, holeSprite) {
    const sc = this.scratch || (this.scratch = mk(64, 64));
    if (sc.width < pic.canvas.width || sc.height < pic.canvas.height) { sc.width = Math.max(sc.width, pic.canvas.width); sc.height = Math.max(sc.height, pic.canvas.height); }
    const g = sc.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, pic.canvas.width, pic.canvas.height);
    g.drawImage(pic.canvas, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const lx = Math.round(hx - x);
    const ly = Math.round(hy - y);
    for (const k of [1, 0.66]) { // two pools, so the middle is clear and the rim dithered
      const sp = holeSprite(Math.max(2, Math.round(r * k)));
      g.drawImage(sp, lx - (sp.width >> 1), ly - (sp.height >> 1));
    }
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(sc, 0, 0, pic.canvas.width, pic.canvas.height, x, y, pic.canvas.width, pic.canvas.height);
  }

  /** As `drawWithHole`, with several holes ({ x, y, r } in iso px): the battle shows more than one focus at a time. */
  drawWithHoles(ctx, pic, x, y, holes, holeSprite) {
    const sc = this.scratch || (this.scratch = mk(64, 64));
    if (sc.width < pic.canvas.width || sc.height < pic.canvas.height) { sc.width = Math.max(sc.width, pic.canvas.width); sc.height = Math.max(sc.height, pic.canvas.height); }
    const g = sc.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, pic.canvas.width, pic.canvas.height);
    g.drawImage(pic.canvas, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    for (const h of holes) {
      const lx = Math.round(h.x - x);
      const ly = Math.round(h.y - y);
      for (const k of [1, 0.66]) {
        const sp = holeSprite(Math.max(2, Math.round(h.r * k)));
        g.drawImage(sp, lx - (sp.width >> 1), ly - (sp.height >> 1));
      }
    }
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(sc, 0, 0, pic.canvas.width, pic.canvas.height, x, y, pic.canvas.width, pic.canvas.height);
  }
}
