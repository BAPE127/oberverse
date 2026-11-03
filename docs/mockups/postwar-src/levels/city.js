// Neumina as a stacked, class-divided mega-city, drawn with the game's own painters. Four levels, each its own architecture and ground:
//   +4 SKYLINE TERRACES (the rich: cream towers, gold trim, domes, gardens)   0 GLASS MILE (commerce: glass towers, neon, crowds, traffic)
//   -2 THE UNDER-LEVELS (the poor: tin and plank stacks, pipes, steam, fires, almost no light)
import { drawRoofed, drawFloor, minTiles, faceH, STYLES, hash, drawCar, drawProp, drawPixelCar, mk, night, look, person, bridgeDeck } from './scene.js';
import { drawCharacter } from '/src/engine/drawCharacter.js';
export const T = 32, VW = 800, VH = 450, INK = '#1b1a24';
// ---- the four architectures, as data for the game's roofed-building painter
STYLES.elite = { name: 'Skyline', roofs: ['flat', 'dome', 'flat'], walls: ['#ece6d6', '#e4dccb', '#f0ead8', '#dcd4c2'], trims: ['#c8a850'], roofCol: ['#bdb5a2', '#aaa290'], win: 'arched', floors: [5, 9], parapet: true, cornice: true, balcony: true, antenna: false, domeCol: ['#4a9aa8', '#e8e4d8', '#d8b858'] };
STYLES.corp = { name: 'Glass Mile', roofs: ['flat', 'flat'], walls: ['#4a6a9a', '#3f5a8a', '#587aa8', '#35507a', '#6a5a9a'], trims: ['#9ad0e8'], roofCol: ['#2a3248', '#222a40'], win: 'ribbon', floors: [4, 9], panels: true, antenna: true };
STYLES.shop = { name: 'Neon shops', roofs: ['flat'], walls: ['#8a4a96', '#6a4a8a', '#9a5aa0', '#5a5a9a', '#4a7a9a'], trims: ['#dcd6e8'], roofCol: ['#34244a', '#2a2a4a'], win: 'square', floors: [2, 5], panels: true, balcony: true };
STYLES.slum = { name: 'Under-levels', roofs: ['flat', 'flat'], walls: ['#7a5a48', '#6a5a50', '#586a60', '#7a6a40', '#5a4a58', '#6a4a3a'], trims: ['#2a2018'], roofCol: ['#4a4038', '#58483a', '#3a4a48', '#5a4a34'], win: 'cross', floors: [2, 4], planks: true, chimney: true };
const rng = (seed) => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const NAMES = {
  elite: ['SKYLINE CLUB', 'ORRIN-VOSS', 'AURELIAN', 'HALDEN TRUST', 'CITADEL', 'THE ATRIUM', 'VANTAGE', 'OPAL TOWER'],
  corp: ['MERIDIAN BANK', 'AXION LABS', 'KADE LOGISTICS', 'VIREO MEDIA', 'SABLE ENERGY', 'QUILL DATA', 'IRIS BIOTECH', 'ARGENT CAPITAL'],
  shop: ['NEON LOTUS', 'SYNTH RECORDS', 'RAMEN 24', 'DREAM PARLOUR', 'HOLO CASINO', 'SUSHI LINE', 'VR PARLOUR', 'KARAOKE CELL', 'CHROME CAFE', 'GAME HALL'],
  slum: ['NOODLES', 'PARTS', 'BUNKS', 'CHOP SHOP', 'CLINIC', 'SCRAP', 'BAR', 'PAWN', 'REPAIR'],
};
const NEON = ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#8aff9a', '#ff8a4e'];
const PALW = { elite: ['#fff2c8', '#fff2c8', '#ffe9b0', '#fffaf0'], corp: ['#ffd88a', '#8ae8ff', '#8ae8ff', '#ff9ad8', '#c8a8ff'], shop: ['#ffd88a', '#ff9ad8', '#8ae8ff', '#ffd75e'], slum: ['#ffb060', '#ff9040', '#9aff9a', '#ffb060'] };
const LIT = { elite: 0.6, corp: 0.62, shop: 0.7, slum: 0.3 };
function windows(g, b, kind) {
  const fl = b.floors, H = b.h * 16, W = b.w * 16, RH = H - faceH(fl), x0 = b.x * T, y0 = b.y * T, doorAx = b.door ? (b.door.x - b.x) * 16 : -99; const P = PALW[kind];
  const cell = kind === 'corp' ? 13 : 12;
  for (let f = 0; f < fl; f++) { const fy = RH + 2 + (fl - 1 - f) * 12, ground = f === 0; for (let wx = 5; wx + 9 < W - 3; wx += cell) { if (ground && wx + 10 > doorAx - 2 && wx < doorAx + 18) continue; if (hash(b.seed, f, wx) > LIT[kind]) continue; const wy = fy + (ground ? 3 : 2); const c = P[Math.floor(hash(f, wx, b.seed) * P.length)];
    g.fillStyle = c; g.fillRect(x0 + (wx + 1) * 2, y0 + (wy + 1) * 2, 14, 10); g.fillStyle = 'rgba(40,24,60,0.35)'; g.fillRect(x0 + (wx + 4) * 2, y0 + (wy + 1) * 2, 2, 10); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x0 + (wx + 1) * 2, y0 + (wy + 1) * 2, 4, 2); } }
}
/** extras on the roof and facade, in the painter's own art-pixel idiom, so each level reads differently from above */
function dress(g, b, kind) {
  const x0 = b.x * T, y0 = b.y * T, W = b.w * 32, RH = (b.h * 16 - faceH(b.floors)) * 2, r = rng(b.seed * 7 + 3), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x0 + x, y0 + y, w, h); };
  if (kind === 'elite') { // a roof garden and a gilded spire
    for (let i = 0; i < 3; i++) { const gx = 14 + Math.floor(r() * Math.max(1, W - 70)), gy = 12 + Math.floor(r() * Math.max(1, RH - 50)); R(gx - 2, gy - 2, 52, 36, INK); R(gx, gy, 48, 32, '#3a8a54'); for (let k = 0; k < 14; k++) R(gx + Math.floor(r() * 44), gy + Math.floor(r() * 28), 6, 4, r() < 0.5 ? '#5ab870' : '#2e7444'); R(gx + 18, gy + 12, 12, 8, '#e8d8b0'); }
    R(W - 22, 10, 4, 14, '#d8b858'); R(W - 24, 6, 8, 4, '#d8b858'); R(W - 21, 0, 2, 8, '#fff2c8');
  }
  if (kind === 'corp') { // a rooftop neon sign band, dish and heli pad ring
    const c = NEON[Math.floor(r() * 4)]; R(8, RH - 18, W - 16, 8, INK); R(10, RH - 16, W - 20, 4, c); if (b.floors > 5) { R(W - 50, 14, 38, 38, INK); R(W - 48, 16, 34, 34, '#2a3248'); R(W - 36, 28, 10, 10, '#ffd75e'); R(W - 34, 30, 6, 6, '#2a3248'); }
  }
  if (kind === 'shop') { const c = NEON[Math.floor(r() * 5)]; R(6, RH - 26, W - 12, 18, INK); R(8, RH - 24, W - 16, 14, c); }
  if (kind === 'slum') { // corrugated tin, water tanks, laundry and pipes
    for (let i = 0; i < Math.floor(W / 22); i++) R(6 + i * 22, 8, 18, Math.max(10, RH - 18), i % 2 ? '#7a7066' : '#8a8278');
    R(4, RH - 6, W - 8, 4, '#2a2018'); if (r() < 0.6) { R(W - 40, 14, 26, 30, INK); R(W - 38, 16, 22, 26, '#6a5a4a'); R(W - 36, 20, 18, 3, '#8a7a68'); }
    if (r() < 0.7) { const ly = RH - 4; R(0, ly, W, 2, '#14101a'); for (let i = 6; i < W - 10; i += 14) R(i, ly + 2, 8, 12, ['#c85a4a', '#e8e0d0', '#4a9aa8', '#d8b04a'][Math.floor(r() * 4)]); }
    R(W - 6, RH, 6, b.h * 32 - RH, '#4a4238'); for (let y = RH + 4; y < b.h * 32 - 14; y += 22) R(W - 8, y, 10, 4, '#2a2018');
  }
  // vertical neon blade sign on the facade
  if (kind !== 'elite' && r() < 0.7) { const c = NEON[Math.floor(r() * NEON.length)], sx = r() < 0.5 ? -4 : W - 8, sy = RH + 10; R(sx, sy, 8, 54, INK); R(sx + 2, sy + 2, 4, 50, c); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = c; g.globalAlpha = 0.25; g.fillRect(x0 + sx - 8, y0 + sy - 6, 24, 66); g.restore(); }
}
/** a row of varied buildings along a frontage. kinds: weights per kind; returns the building defs. */
export function strip({ x0, x1, front, kinds, seed, stagger = 1, gaps = [0, 1, 2, 3], wmin = 4, wmax = 11, fl }) {
  const r = rng(seed); const out = []; let x = x0; let n = 0;
  while (x < x1 - wmin) { const kind = kinds[Math.floor(r() * kinds.length)]; const S = STYLES[kind]; let w = wmin + Math.floor(r() * (wmax - wmin + 1)); if (x + w > x1) w = x1 - x; if (w < wmin) break;
    const lo = (fl?.[kind]?.[0] ?? S.floors[0]), hi = (fl?.[kind]?.[1] ?? S.floors[1]); const floors = lo + Math.floor(r() * (hi - lo + 1)); const fy = front - (stagger ? Math.floor(r() * (stagger + 1)) : 0); const h = minTiles(floors) + (r() < 0.3 ? 2 : 1);
    const roofKind = kind === 'elite' ? S.roofs[Math.floor(r() * S.roofs.length)] : 'flat'; const names = NAMES[kind] || NAMES.slum; const sign = names[Math.floor(r() * names.length)];
    const wall = S.walls[Math.floor(r() * S.walls.length)], roof = S.roofCol[Math.floor(r() * S.roofCol.length)];
    out.push({ style: kind, kind, x, y: fy - h, w, h, floors, seed: seed * 100 + n++, wall, roof, roofKind, domeCol: S.domeCol?.[Math.floor(r() * 3)], trim: S.trims[0], sign: floors <= 6 || kind === 'shop' ? sign : undefined, awning: kind === 'shop' ? ['#d03aa8', '#2fb4d0', '#e0a030', '#7a5ad0'][Math.floor(r() * 4)] : kind === 'slum' && r() < 0.6 ? ['#8a4a2a', '#4a7a5a', '#a08a3a'][Math.floor(r() * 3)] : undefined, door: { x: x + Math.max(1, Math.floor(w / 2) - 1 + Math.floor(r() * 2)), y: fy - 1 }, id: `s${seed}_${n}`, shop: kind === 'shop' });
    x += w + gaps[Math.floor(r() * gaps.length)]; }
  return out;
}
export const drawB = (g, b) => { drawRoofed(g, b, { lit: false }); windows(g, b, b.kind); dress(g, b, b.kind); };
// ------------------------------------------------------------------------------------------------ grounds (no cobblestone): each level has its own paving
const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export function ground(g, theme, x, y, w, h, seed = 1) {
  const r = rng(seed + x * 3 + y * 7);
  if (theme === 'elite') { px(g, x, y, w, h, '#d9d2c2'); for (let yy = y; yy < y + h; yy += 64) for (let xx = x; xx < x + w; xx += 64) { const off = ((yy - y) / 64) % 2 ? 32 : 0; px(g, xx + off, yy, 64, 2, '#bdb59f'); px(g, xx + off, yy, 2, 64, '#bdb59f'); px(g, xx + off + 2, yy + 2, 60, 2, '#ece6d6'); if (r() < 0.12) px(g, xx + off + 20, yy + 20, 24, 24, '#e6dfcc'); } for (let yy = y + 32; yy < y + h; yy += 128) px(g, x, yy, w, 4, '#c8a850'); }
  else if (theme === 'walk') { px(g, x, y, w, h, '#3c3c58'); for (let yy = y; yy < y + h; yy += 32) for (let xx = x; xx < x + w; xx += 64) { px(g, xx, yy, 64, 2, '#2a2a40'); px(g, xx, yy, 2, 32, '#2a2a40'); px(g, xx + 2, yy + 2, 60, 2, '#4a4a68'); for (const [a, b] of [[6, 6], [54, 6], [6, 24], [54, 24]]) px(g, xx + a, yy + b, 3, 3, '#5a5a78'); if (r() < 0.1) px(g, xx + 14, yy + 10, 36, 14, '#32324c'); } }
  else if (theme === 'road') { px(g, x, y, w, h, '#26263a'); for (let i = 0; i < w * h / 380; i++) px(g, x + Math.floor(r() * w), y + Math.floor(r() * h), 2 + Math.floor(r() * 3), 2, r() < 0.5 ? '#2e2e46' : '#1e1e30'); }
  else if (theme === 'under') { px(g, x, y, w, h, '#3a2e28'); for (let yy = y; yy < y + h; yy += 16) for (let xx = x; xx < x + w; xx += 16) { px(g, xx, yy, 16, 2, '#241c18'); px(g, xx, yy, 2, 16, '#241c18'); if ((xx / 16 + yy / 16) % 2) px(g, xx + 4, yy + 4, 8, 8, '#33281f'); if (r() < 0.08) px(g, xx + 3, yy + 3, 10, 10, '#4a382a'); } for (let i = 0; i < w * h / 900; i++) { const pxx = x + Math.floor(r() * w), pyy = y + Math.floor(r() * h); px(g, pxx, pyy, 40 + Math.floor(r() * 40), 14, '#25403e'); px(g, pxx + 2, pyy + 2, 30, 3, '#3a6a64'); } }
  else if (theme === 'plate') { px(g, x, y, w, h, '#44444e'); for (let yy = y; yy < y + h; yy += 32) for (let xx = x; xx < x + w; xx += 32) { px(g, xx, yy, 32, 2, '#2e2e38'); px(g, xx, yy, 2, 32, '#2e2e38'); px(g, xx + 2, yy + 2, 28, 2, '#56565f'); } }
}
export { drawRoofed, drawFloor, drawCar, drawProp, drawPixelCar, mk, night, look, person, bridgeDeck, hash, rng, minTiles, faceH, STYLES, NEON, drawCharacter };
