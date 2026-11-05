// The roofed building painter (v0.102.0, the battle look): a building seen from above in the game's pixel idiom: a roof you look down on (gable, hip, mansard, flat or dome, with tiles, chimneys and
// dormers), a front face with one row of windows per floor, a door, an awning and a shop sign, a 1-px ink outline and light from the upper left. One art pixel is two screen pixels, and a tile is 16
// art pixels, as in drawPixelBuildings.js. Five national styles are data. Ported from the approved mock-up (docs/mockups/src/war/g_roof.js). Browser only; paint, never state.
import { FACADE, faceH } from '../content/battle.js';
const INK = '#1b1a24';
const FLOOR = FACADE.floor;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const shade = (h, k) => { const c = hex(h).map((v) => Math.max(0, Math.min(255, v + k))); return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (a, k) => a[Math.floor(hash(k, a.length, 5) * a.length) % a.length];

// ------------------------------------------------------------------------------------------------- the five national styles (data)
export const STYLES = {
  halver: { name: 'Halvermouth', roofs: ['flat', 'flat', 'mansard'], walls: ['#a8604a', '#b8765a', '#c8a888', '#8a5a4a', '#c8b8a0'], trims: ['#e8e0d0'], roofCol: ['#6a6e78', '#5a5a62', '#4a5260'], win: 'square', floors: [2, 6], parapet: true, cornice: true, chimney: false },
  ostmark: { name: 'Ostmark Union', roofs: ['gable', 'gable', 'hip'], walls: ['#efe4cc', '#e8dcc0', '#f0e8d4', '#d8c8a8'], trims: ['#4a3224'], roofCol: ['#a8503a', '#9a4838', '#7a4a3a', '#6a3a30'], win: 'shutters', floors: [2, 4], timber: true, chimney: true, shutterCol: ['#3a5a3a', '#5a3a2a', '#3a4a6a'] },
  varn: { name: 'Varnistan', roofs: ['flat', 'flat', 'dome'], walls: ['#d8bc8a', '#e0cfae', '#cfae7a', '#e8d8b8'], trims: ['#8a6a3a'], roofCol: ['#c8a878', '#d8bc8a', '#b89868'], win: 'arched', floors: [1, 3], crenel: true, domeCol: ['#4a8a8a', '#e8e4d8', '#3a7a9a'], chimney: false },
  sund: { name: 'Sund', roofs: ['gable', 'gable'], walls: ['#9a3a2a', '#d8a84a', '#e8e4d8', '#6a8a9a', '#7a5a8a', '#4a7a5a'], trims: ['#f4f0e4'], roofCol: ['#3a3436', '#4a4044', '#2e2a2c', '#6a3a2a'], win: 'cross', floors: [1, 3], chimney: true, planks: true },
  windfen: { name: 'Windfen League', roofs: ['flat', 'flat'], walls: ['#a8a8a0', '#98989a', '#b8b4aa', '#8a8e90'], trims: ['#dcdcd4'], roofCol: ['#4a4e54', '#3a3e44'], win: 'ribbon', floors: [4, 9], panels: true, balcony: true, antenna: true },
};

// ------------------------------------------------------------------------------------------------- the painter
/** b: { x, y, w, h (tiles), floors, style: key, seed, sign, awning, door:{x,y}, wall, roof, roofKind, dome, tall } */
export function drawRoofed(ctx, b, o = {}) {
  const S = STYLES[b.style] || STYLES.halver; const x0 = b.x * 32, y0 = b.y * 32; const W = b.w * 16, H = b.h * 16; const fl = b.floors || 2; const F = faceH(fl); const RH = H - F; const seed = b.seed || (b.x * 31 + b.y);
  const R = (ax, ay, aw, ah, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + ax * 2, y0 + ay * 2, aw * 2, ah * 2); };
  const wall = b.wall || pick(S.walls, seed), trim = b.trim || S.trims[0], roofC = b.roof || pick(S.roofCol, seed + 3); const kind = b.roofKind || pick(S.roofs, seed + 7);
  // shadow cast over the street (longer for taller buildings)
  const sl = Math.min(10, 3 + fl * 1.4); ctx.fillStyle = 'rgba(15,15,35,0.26)'; ctx.fillRect(x0 + W * 2, y0 + 10, sl * 2, H * 2 - 6); ctx.fillRect(x0 + 8, y0 + H * 2, W * 2 + sl * 2, Math.min(18, 6 + fl * 2));
  // ---------------- roof (area 0..RH)
  const tiles = (ax, ay, aw, ah, base, rowH = 3) => { R(ax, ay, aw, ah, base); for (let r = 0; r < ah; r += rowH) { R(ax, ay + r + rowH - 1, aw, 1, shade(base, -26)); R(ax, ay + r, aw, 1, shade(base, 14)); for (let c = ((r / rowH) % 2) * 3; c < aw; c += 6) R(ax + c, ay + r, 1, rowH - 1, shade(base, -16)); } };
  const slate = (ax, ay, aw, ah, base) => { R(ax, ay, aw, ah, base); for (let r = 0; r < ah; r += 2) { R(ax, ay + r + 1, aw, 1, shade(base, -20)); for (let c = (r % 4) ; c < aw; c += 4) R(ax + c, ay + r, 1, 1, shade(base, 16)); } };
  const brickChimney = (cx, cy) => { R(cx - 1, cy - 1, 6, 8, INK); R(cx, cy, 4, 6, '#8a4a3a'); R(cx, cy, 1, 6, '#b06a52'); R(cx + 3, cy, 1, 6, '#6a3428'); R(cx, cy + 2, 4, 1, '#5a2a20'); R(cx - 1, cy - 2, 6, 2, INK); R(cx, cy - 1, 4, 1, '#c8c0b0'); R(cx + 5, cy + 1, 2, 7, 'rgba(0,0,0,0.2)'); };
  const dormer = (cx, cy, c) => { R(cx - 1, cy - 1, 8, 8, INK); R(cx, cy, 6, 6, wall); R(cx + 1, cy + 1, 4, 4, '#7aa3b8'); R(cx + 1, cy + 1, 1, 3, '#b8d8e6'); R(cx + 2, cy + 1, 1, 4, trim); R(cx - 1, cy - 2, 8, 2, c); R(cx - 1, cy - 2, 8, 1, shade(c, 24)); };
  if (kind === 'gable' || kind === 'hip') {
    const ry = Math.max(4, Math.round(RH * 0.4)); const back = shade(roofC, -18), front = roofC;
    tiles(0, 0, W, ry, back); tiles(0, ry, W, RH - ry, front);
    R(0, ry - 1, W, 2, shade(roofC, 34)); R(0, ry + 1, W, 1, shade(roofC, -34)); // ridge
    if (kind === 'hip') { for (let i = 0; i < ry; i++) { R(0, i, Math.max(0, ry - i - 1) + 1, 1, shade(roofC, -34)); R(W - Math.max(0, ry - i - 1) - 1, i, Math.max(0, ry - i - 1) + 1, 1, shade(roofC, -40)); } for (let i = 0; i < RH - ry; i++) { R(0, ry + i, Math.max(0, 5 - i), 1, shade(roofC, -26)); R(W - Math.max(0, 5 - i), ry + i, Math.max(0, 5 - i), 1, shade(roofC, -34)); } }
    R(0, RH - 2, W, 2, shade(roofC, -44)); R(0, RH - 1, W, 1, 'rgba(0,0,0,0.3)'); // eave shadow onto the wall
    if (S.chimney && b.w >= 6) brickChimney(Math.floor(W * 0.68), 2 + Math.floor(ry * 0.3));
    if (RH > 22 && b.w >= 8) { dormer(Math.floor(W * 0.22), ry + 3, roofC); dormer(Math.floor(W * 0.5), ry + 3, roofC); }
  } else if (kind === 'mansard') {
    slate(0, 0, W, RH, roofC); R(0, 0, W, 2, shade(roofC, 30)); R(2, 3, W - 4, 1, shade(roofC, -26)); R(0, RH - 3, W, 3, shade(roofC, -34)); R(0, RH - 3, W, 1, shade(roofC, 20)); for (let dx = 6; dx + 8 < W; dx += 12) dormer(dx, 5, roofC); R(0, RH - 1, W, 1, 'rgba(0,0,0,0.3)');
  } else if (kind === 'dome') {
    const c = b.domeCol || pick(S.domeCol || ['#4a8a8a'], seed); R(0, 0, W, RH, b.roof || pick(S.roofCol, seed)); for (let i = 0; i < 40; i++) R(Math.floor(hash(seed, i) * W), Math.floor(hash(seed, i + 9) * RH), 2, 1, 'rgba(60,40,20,0.2)');
    const r = Math.max(4, Math.min(Math.floor(RH / 2) - 3, Math.floor(W / 5))); const cx = Math.floor(W / 2), cy = Math.floor(RH / 2); for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.sqrt(xx * xx + yy * yy); if (d <= r) { const lit = (-xx - yy) / (r * 1.4); R(cx + xx, cy + yy, 1, 1, shade(c, Math.round(lit * 46) - 8)); } else if (d <= r + 1) R(cx + xx, cy + yy, 1, 1, INK); } R(cx - Math.floor(r * 0.45), cy - Math.floor(r * 0.5), 2, 2, shade(c, 72)); R(cx - 1, cy - r - 4, 2, 4, '#d8b04a'); R(cx - 2, cy - r - 5, 4, 1, '#d8b04a');
    for (const [qx, qy] of [[2, 2], [W - 5, 2], [2, RH - 5], [W - 5, RH - 5]]) { R(qx, qy, 3, 3, shade(wall, -10)); R(qx, qy, 3, 1, shade(wall, 20)); }
  } else { // flat
    const base = b.roof || roofC; R(0, 0, W, RH, base); for (let i = 0; i < W * RH / 7; i++) R(Math.floor(hash(seed, i) * W), Math.floor(hash(seed, i + 91) * RH), 1 + (i % 3 === 0 ? 1 : 0), 1, i % 2 ? shade(base, -10) : shade(base, 10));
    if (S.panels) for (let px = 8; px < W; px += 12) R(px, 0, 1, RH, shade(base, -14));
    const kit = Math.max(1, Math.floor(W / 20)); for (let k = 0; k < kit; k++) { const kx = 4 + Math.floor(hash(seed, k, 3) * (W - 14)), ky = 3 + Math.floor(hash(seed, k, 4) * Math.max(1, RH - 10)); const t = hash(seed, k, 5); if (t < 0.4) { R(kx + 2, ky + 2, 7, 5, 'rgba(0,0,0,0.25)'); R(kx, ky, 7, 5, '#8a9298'); R(kx, ky, 7, 1, '#b8c0c6'); R(kx + 5, ky, 2, 5, '#6a7278'); for (let q = 0; q < 3; q++) R(kx + 1 + q * 2, ky + 1, 1, 3, '#4a5258'); } else if (t < 0.7) { R(kx + 2, ky + 2, 7, 5, 'rgba(0,0,0,0.25)'); R(kx, ky, 7, 5, '#6a7a8a'); R(kx + 1, ky + 1, 5, 3, '#a8d8e8'); R(kx + 1, ky + 1, 2, 1, '#e8f8ff'); } else { R(kx + 2, ky + 2, 5, 5, 'rgba(0,0,0,0.25)'); R(kx, ky, 5, 5, '#c8c4b8'); R(kx, ky, 5, 1, '#e8e4d8'); R(kx + 4, ky, 1, 5, '#8a867a'); } }
    if (S.antenna && fl > 5) { R(W - 8, 3, 1, 8, '#2a2a30'); R(W - 10, 5, 5, 1, '#2a2a30'); R(W - 9, 2, 1, 1, '#e83a2a'); }
    const pc = S.parapet || S.crenel || S.panels; R(0, 0, W, 2, shade(wall, 26)); R(0, 0, 2, RH, shade(wall, 14)); R(W - 2, 0, 2, RH, shade(wall, -24)); R(0, RH - 3, W, 3, shade(wall, -14)); R(0, RH - 3, W, 1, shade(wall, 22));
    if (S.crenel) for (let cx = 0; cx < W; cx += 4) { R(cx, RH - 5, 2, 2, shade(wall, 14)); R(cx, 0, 2, 2, shade(wall, 30)); }
  }
  // ---------------- facade (area RH..H)
  R(0, RH, W, F, wall); const tone = S.planks ? 'plank' : S.timber ? 'plaster' : S.panels ? 'panel' : 'wall';
  for (let yy = 0; yy < F; yy++) if (yy % 3 === 0 && tone === 'plank') R(0, RH + yy, W, 1, shade(wall, -14)); // planks
  if (tone === 'panel') { for (let px = 0; px < W; px += 12) R(px, RH, 1, F, shade(wall, -16)); for (let fy = 0; fy < fl; fy++) R(0, RH + 2 + fy * FLOOR, W, 1, shade(wall, -16)); }
  if (S.walls === undefined) {} const brick = b.style === 'halver' && wall !== '#c8b8a0' && wall !== '#c8a888'; if (brick) for (let yy = 0; yy < F; yy += 3) { R(0, RH + yy + 2, W, 1, shade(wall, -22)); for (let c = ((yy / 3) % 2) * 4; c < W; c += 8) R(c, RH + yy, 1, 3, shade(wall, -18)); }
  R(0, RH, W, 2, 'rgba(0,0,0,0.34)'); R(0, RH + 2, W, 1, 'rgba(0,0,0,0.14)'); // eaves' shadow
  if (S.cornice) { R(0, RH + 2, W, 2, shade(wall, 28)); R(0, RH + 4, W, 1, shade(wall, -30)); }
  R(0, H - 3, W, 3, shade(wall, -34)); R(0, H - 3, W, 1, shade(wall, -8)); // plinth
  const winCol = o.lit ? '#ffd88a' : '#7aa3b8', glint = '#cfe6f0';
  const doorAx = b.door ? (b.door.x - b.x) * 16 : Math.floor(W / 2) - 6;
  const win = (wx, wy, ww = 8, wh = 6, fl2 = 0) => {
    if (S.win === 'ribbon') { R(wx - 1, wy - 1, ww + 2, wh + 2, shade(wall, -34)); R(wx, wy, ww, wh, winCol); R(wx, wy, 2, wh, glint); R(wx + 3, wy, 1, wh, shade(wall, -10)); R(wx + 6, wy, 1, wh, shade(wall, -10)); return; }
    if (S.win === 'arched') { R(wx - 1, wy, ww + 2, wh + 1, S.trims[0]); R(wx, wy + 1, ww, wh - 1, '#2a3a4a'); R(wx + 1, wy + 1, ww - 2, wh - 2, winCol); R(wx, wy, 1, 2, wall); R(wx + ww - 1, wy, 1, 2, wall); R(wx + 1, wy + 1, 2, 1, glint); R(wx + ww / 2 | 0, wy + 1, 1, wh - 1, S.trims[0]); return; }
    R(wx - 1, wy - 1, ww + 2, wh + 2, trim === '#f4f0e4' || trim === '#e8e0d0' || trim === '#dcdcd4' ? shade(trim, -30) : trim); R(wx, wy, ww, wh, winCol); R(wx, wy, 2, 2, glint); R(wx + (ww >> 1), wy, 1, wh, shade(trim, b.style === 'ostmark' ? 0 : -20)); if (S.win === 'cross') R(wx, wy + (wh >> 1), ww, 1, shade(trim, -20));
    if (S.win === 'shutters') { const sc = pick(S.shutterCol, seed + wx); R(wx - 3, wy - 1, 2, wh + 2, sc); R(wx + ww + 1, wy - 1, 2, wh + 2, sc); R(wx - 3, wy + 1, 2, 1, shade(sc, -26)); R(wx + ww + 1, wy + 1, 2, 1, shade(sc, -26)); }
    R(wx - 1, wy + wh + 1, ww + 2, 1, shade(wall, -34)); // sill
  };
  for (let f = 0; f < fl; f++) { const fy = RH + 2 + (fl - 1 - f) * FLOOR; const ground = f === 0; const cell = b.style === 'windfen' ? 13 : b.style === 'varn' ? 11 : 12; for (let wx = 5; wx + 9 < W - 3; wx += cell) { if (ground && b.door && wx + 10 > doorAx - 2 && wx < doorAx + 18) continue; if (!ground || b.shop || true) win(wx, fy + (ground ? 3 : 2), b.style === 'windfen' ? 9 : 8, 7); } if (S.balcony && !ground) { R(2, fy + 10, W - 4, 1, shade(wall, 30)); for (let c = 3; c < W - 3; c += 3) R(c, fy + 9, 1, 1, shade(wall, -30)); } if (b.style === 'halver' && !ground && fl > 3) R(0, fy + 11, W, 1, shade(wall, 16)); }
  if (S.timber) { for (let f = 1; f < fl; f++) { const fy = RH + 2 + (fl - 1 - f) * FLOOR; R(0, fy - 1, W, 1, S.trims[0]); for (let px = 3; px < W; px += 12) R(px, fy, 1, FLOOR - 1, S.trims[0]); } R(0, RH + 2, W, 1, S.trims[0]); for (let px = 3; px < W; px += 12) for (let k = 1; k < 4; k++) { R(px + k, RH + 2 + (fl - 1) * FLOOR + 3 + k, 1, 1, S.trims[0]); } }
  if (b.door) { R(doorAx + 2, H - 12, 12, 10, trim === '#4a3224' ? '#2a1a12' : INK); R(doorAx + 3, H - 11, 10, 9, b.style === 'varn' ? '#5a3a22' : '#6b4a32'); R(doorAx + 4, H - 10, 8, 3, o.lit ? '#ffd68c' : 'rgba(255,255,255,0.22)'); R(doorAx + 10, H - 7, 1, 1, '#e8c35a'); R(doorAx + 1, H - 2, 14, 1, 'rgba(160,150,140,0.9)'); if (b.style === 'varn') { R(doorAx + 2, H - 13, 12, 1, INK); R(doorAx + 3, H - 12, 10, 1, wall); } }
  if (b.awning) for (let i = 0; i * 5 < W; i++) { R(i * 5, H - 14, 5, 3, i % 2 ? '#f3e5c6' : b.awning); R(i * 5 + 1, H - 11, 3, 1, i % 2 ? '#f3e5c6' : b.awning); }
  if (b.sign) { const tw = Math.min(W - 8, b.sign.length * 3 + 6); R(Math.floor((W - tw) / 2) - 1, H - 17, tw + 2, 5, INK); R(Math.floor((W - tw) / 2), H - 16, tw, 3, '#3a2c25'); R(Math.floor((W - tw) / 2) + 2, H - 15, Math.max(2, tw - 4), 1, '#f6e7c1'); }
  // sides and outline: the left wall catches light, the right is in shade; the whole building gets the game's 1-px ink
  R(0, 0, 1, H, INK); R(W - 1, 0, 1, H, INK); R(0, 0, W, 1, INK); R(0, H - 1, W, 1, INK); R(1, 1, 1, H - 2, 'rgba(255,255,255,0.22)'); R(W - 2, 2, 1, H - 3, 'rgba(0,0,30,0.24)');
  if (b.sign) { ctx.font = 'bold 9px "Trebuchet MS", "Segoe UI", sans-serif'; const tw = Math.ceil(ctx.measureText(b.sign).width + 10); const sx = x0 + (W * 2 - tw) / 2, sy = y0 + (H - 18) * 2; ctx.fillStyle = INK; ctx.fillRect(Math.round(sx) - 2, sy - 2, tw + 4, 17); ctx.fillStyle = '#3a2c25'; ctx.fillRect(Math.round(sx), sy, tw, 13); ctx.fillStyle = '#f6e7c1'; ctx.textBaseline = 'middle'; ctx.fillText(b.sign, Math.round(sx) + 5, sy + 7); }
  if (o.damage === 'burn') { R(Math.floor(W * 0.4), 2, 14, 8, 'rgba(10,8,12,0.5)'); R(Math.floor(W * 0.4) + 3, 4, 8, 4, '#14101a'); }
  if (o.damage === 'hole') { const hx = Math.floor(W * 0.45); R(hx, 1, 14, RH - 4, '#14101a'); for (let i = 0; i < 6; i++) R(hx + 1 + i * 2, 2 + (i % 3) * 3, 2, 1, '#6a4a2a'); R(hx - 1, 1, 1, RH - 4, INK); R(hx + 14, 1, 1, RH - 4, INK); }
}

export { hash, pick };
