// Neumina, drawn with the game's own painters: multi-storey buildings seen from outside (drawRoofed), the one-floor cutaway when you are up in
// a building or on a bridge (drawFloor), the level below still visible and dimmed. World view is 800 x 450 world px (25 x 14 tiles) drawn at 2x like the game.
import { drawRoofed, drawFloor, minTiles, faceH, groundOf, STYLES, hash } from '/docs/mockups/src/war/g_roof.js';
import { drawCar } from '/docs/mockups/src/war/g_cars.js';
import { drawCharacter, setPixelPeople } from '/src/engine/drawCharacter.js';
import { drawProp, setPixelProps } from '/src/engine/drawWorld.js';
import { PROP_TYPES } from '/src/content/props.js';
import { drawPixelCar } from '/src/engine/drawPixelCars.js';
setPixelPeople(true); setPixelProps(true);
export const T = 32, VW = 800, VH = 450, INK = '#1b1a24';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const NEON = ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#8aff9a'];
const WALLS = ['#7a5aa8', '#5a6ab0', '#8a4a96', '#4a7a9a', '#6a4a8a', '#9a5aa0'], ROOFS = ['#2a2440', '#242c48', '#30243e', '#26343e'];
const AWN = ['#d03aa8', '#2fb4d0', '#e0a030', '#7a5ad0'];
const NAMES = ['NEON LOTUS CLUB', 'SYNTH RECORDS', 'MERIDIAN BANK', 'DREAM PARLOUR', 'HOLO CASINO', 'RAMEN 24', 'AXION LABS', 'GLASS MILE HOTEL', 'KARAOKE CELL', 'ORRIN-VOSS', 'SUSHI LINE', 'VR PARLOUR'];
const SKIN = ['#e8c4a0', '#d9a77f', '#b97f58', '#8a5a3c', '#f2d4b8'], HSTYLE = ['bun', 'cap', 'curly', 'long', 'messy', 'parted', 'ponytail'];
const HAIR = ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#2a2438', '#f2f2f2', '#8aff9a'], OUT = ['#6a3fa0', '#2fa0c0', '#c43fa0', '#2a2438', '#d8b030', '#3f4f8a', '#e8e8f0', '#30a070'], LEG = ['#1c1634', '#2a2a4a', '#322046'];
export const look = (k) => { const r = (a, s) => a[Math.floor(hash(k, s, 3) * a.length) % a.length]; return { skin: r(SKIN, 1), hair: r(HAIR, 2), hairStyle: r(HSTYLE, 3), outfit: r(OUT, 4), legs: r(LEG, 5), shoes: '#14121a', accent: r(OUT, 6), accessories: r([[], [], ['shades'], ['goggles'], ['scarf'], ['vest']], 7), build: 'average', height: 1 }; };
export function person(g, a, x, y, facing = 'down') { drawCharacter(g, a, { x, y, facing, moving: false, idleTime: 0 }); }
/** a street of tall buildings: returns building defs placed so that their fronts sit on row `frontY` */
export function row(specs, x0, frontY, seed = 1) { let x = x0; return specs.map((s, i) => { const fl = s.floors; const h = minTiles(fl) + (s.extra ?? 1); const b = { style: 'windfen', x, y: frontY - h, w: s.w, h, floors: fl, seed: seed * 10 + i, wall: s.wall || WALLS[(i + seed) % WALLS.length], roof: s.roof || ROOFS[(i + seed) % ROOFS.length], trim: '#dcd6e8', sign: s.sign || NAMES[(i * 3 + seed) % NAMES.length], awning: s.awning || AWN[(i + seed) % AWN.length], door: { x: x + (s.dx ?? (s.w >> 1)), y: frontY - 1 }, id: `b${seed}_${i}`, roofKind: 'flat' }; x += s.w + (s.gap ?? 1); return b; }); }
const grid = (W, H, f) => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => f(x, y)));
// ---------------------------------------------------------------------------------------------- the lights (the game's way: a dark veil with soft holes) and neon pools
export function night(g, W, H, cam, lights, glows = [], dark = 0.52) {
  const [lc, lg] = mk(W, H); lg.fillStyle = `rgba(16,14,50,${dark})`; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) { const sx = x - cam.x, sy = y - cam.y; for (let i = 0; i < 14; i++) { const k = 1 - i / 14; lg.fillStyle = `rgba(0,0,0,${0.07 + i * 0.045})`; lg.beginPath(); lg.arc(sx, sy, r * k, 0, 6.2832); lg.fill(); } }
  g.drawImage(lc, cam.x, cam.y);
  const dither = (hex) => { const [pc, pg] = mk(2, 2); pg.fillStyle = hex; pg.fillRect(0, 0, 1, 1); pg.fillRect(1, 1, 1, 1); return g.createPattern(pc, 'repeat'); };
  g.save(); g.globalCompositeOperation = 'screen';
  for (const [x, y, r, hex] of glows) { for (const [k, a, solid] of [[1, 0.2, false], [0.62, 0.22, false], [0.32, 0.26, true]]) { g.globalAlpha = a; g.fillStyle = solid ? hex : dither(hex); g.beginPath(); g.ellipse(x, y, r * k, r * k * 0.7, 0, 0, 6.2832); g.fill(); } }
  g.restore();
}
/** light a random subset of the facade windows in warm and neon colours (the roofed painter lights all or none) */
export function lightWindows(g, b) {
  const fl = b.floors, H = b.h * 16, W = b.w * 16, RH = H - faceH(fl), x0 = b.x * T, y0 = b.y * T; const doorAx = b.door ? (b.door.x - b.x) * 16 : -99; const P = ['#ffd88a', '#ffd88a', '#ffd88a', '#ff9ad8', '#8ae8ff', '#c8a8ff'];
  for (let f = 0; f < fl; f++) { const fy = RH + 2 + (fl - 1 - f) * 12, ground = f === 0; for (let wx = 5; wx + 9 < W - 3; wx += 13) { if (ground && wx + 10 > doorAx - 2 && wx < doorAx + 18) continue; if (hash(b.seed, f, wx) > 0.58) continue; const wy = fy + (ground ? 3 : 2); const c = P[Math.floor(hash(f, wx, b.seed) * P.length)];
    g.fillStyle = c; g.fillRect(x0 + (wx + 1) * 2, y0 + (wy + 1) * 2, 7 * 2, 5 * 2); g.fillStyle = 'rgba(40,24,60,0.35)'; g.fillRect(x0 + (wx + 3) * 2, y0 + (wy + 1) * 2, 2, 5 * 2); g.fillRect(x0 + (wx + 6) * 2, y0 + (wy + 1) * 2, 2, 5 * 2); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x0 + (wx + 1) * 2, y0 + (wy + 1) * 2, 4, 2); } }
}
export const roofed = (g, b) => { drawRoofed(g, b, { lit: false }); lightWindows(g, b); };
export function bridgeDeck(g, x, y, w, h, o = {}) { // a sky bridge seen from the front (a tube between facades)
  const R = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, c, d); };
  g.fillStyle = 'rgba(10,8,26,0.3)'; g.fillRect(x + 28, y + h + 40, w, h * 0.7);
  R(-2, -2, w + 4, h + 4, INK); R(0, 0, w, h, '#3a4a78'); R(2, 2, w - 4, h - 8, '#7fd0e8'); R(2, 2, w - 4, 3, '#cfeefa'); R(2, h - 6, w - 4, 4, '#2a3358');
  for (let i = 8; i < w - 4; i += 16) R(i, 2, 2, h - 8, '#3a4a78'); R(0, h - 3, w, 2, '#5ee6ff'); for (let i = 0; i < w; i += 6) R(i, h - 2, 3, 1, '#a8f4ff');
  for (let i = 12; i < w - 12; i += 30) if (o.people !== false) { /* silhouettes inside */ R(i, 8, 5, h - 14, 'rgba(20,16,48,0.55)'); R(i, 5, 5, 4, 'rgba(20,16,48,0.55)'); }
}
export { drawRoofed, drawFloor, minTiles, faceH, groundOf, STYLES, hash, drawCar, drawProp, drawPixelCar, PROP_TYPES, mk, NEON, grid };
