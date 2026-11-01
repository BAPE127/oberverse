// TARGET ART (mock-up only). Damage in the game's own building idiom. A building is roofless: a back wall, two side walls and a short front face with windows and a door.
// So damage is drawn on those pieces (art pixels = 2 world px): scorch and cracks, broken windows, a gap knocked in the front face or a side wall, rubble at the foot,
// and, when the building falls, a rubble field with wall stubs. The numbers (3 px walls, 8 px front face, 9 px back wall) are read from drawPixelBuildings.js.
const INK = '#1b1a24';
const hash = (a, b = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shade = (hex, amt) => { const n = parseInt(hex.slice(1, 7), 16); const c = (v) => Math.max(0, Math.min(255, v + amt)); return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`; };
const FACE = 10, TOPW = 3, BACK = 9;
function geom(b) { const W = b.w * 16, H = b.h * 16; const frontY = H - FACE; const faceY = frontY + TOPW - 1; return { x0: b.x * 32, y0: b.y * 32, W, H, frontY, faceY, faceH: H - faceY, fx: TOPW, fy: TOPW + BACK, fw: W - TOPW * 2, fh: frontY - TOPW - (TOPW + BACK) }; }
const mkR = (ctx, g) => (ax, ay, aw, ah, c) => { ctx.fillStyle = c; ctx.fillRect(g.x0 + ax * 2, g.y0 + ay * 2, aw * 2, ah * 2); };
const RUB = ['#8a4a3a', '#a65a46', '#c8b898', '#7a7468', '#5a3a2a', '#d8cdb8'];
/** a heap of bricks, plaster and planks in art pixels, centred on art (cx, cy) inside a w x h area */
export function rubble(ctx, g, cx, cy, w, h, seed, wall = '#d8cdb8', rect = false, dens = 0.5) {
  const R = mkR(ctx, g); const cols = [...RUB, wall];
  for (let i = 0; i < w * h * dens; i++) { const a = hash(seed, i) * 6.283, d = Math.sqrt(hash(seed, i + 99)); const x = rect ? Math.round(cx - w / 2 + hash(seed, i + 77) * w) : Math.round(cx + Math.cos(a) * d * w / 2), y = rect ? Math.round(cy - h / 2 + hash(seed, i + 78) * h) : Math.round(cy + Math.sin(a) * d * h / 2); const s = 1 + (hash(seed, i + 7) > 0.7 ? 1 : 0); const c = cols[Math.floor(hash(seed, i + 3) * cols.length)]; R(x, y, s + 1, s, INK); R(x, y, s + 1, s, c); if (hash(seed, i + 5) > 0.6) R(x, y, s + 1, 1, shade(c, 34)); }
  for (let i = 0; i < 5; i++) { const x = Math.round(cx - w / 2 + hash(seed, i + 40) * w), y = Math.round(cy - h / 2 + hash(seed, i + 41) * h); R(x, y, 5 + Math.floor(hash(seed, i + 42) * 4), 1, '#6a4a2a'); }
}
/**
 * state: { level: 1 (damaged) | 2 (breached) | 3 (collapsed), breach: [{ u, w, kind: 'blast'|'ram'|'shell' }], side: ['E'|'W'], burning }
 * u and w are in art pixels along the front face from the left wall.
 */
export function damage(ctx, b, st) {
  const g = geom(b); const R = mkR(ctx, g); const seed = (b.x * 31 + b.y) | 0; const wall = b.wall || '#d8cdb8';
  if (st.level === 3) { // collapsed: stubs of wall, a rubble field filling the room, scorch
    R(0, 0, g.W, g.H, 'rgba(0,0,0,0)'); ctx.fillStyle = '#4a4036'; ctx.fillRect(g.x0, g.y0 + 4, g.W * 2, g.H * 2 - 4); R(2, 10, g.W - 4, g.H - 18, '#3a3028');
    rubble(ctx, g, g.W / 2, g.H / 2 + 2, g.W - 8, g.H - 16, seed, wall, true, 0.12); rubble(ctx, g, g.W * 0.3, g.H / 2, 26, 12, seed + 1, wall); rubble(ctx, g, g.W * 0.7, g.H / 2 + 4, 22, 10, seed + 2, wall); rubble(ctx, g, g.W * 0.5, g.H - 4, 30, 7, seed + 5, wall);
    for (const [ax, aw] of [[0, Math.round(g.W * 0.22)], [Math.round(g.W * 0.72), Math.round(g.W * 0.28)]]) { R(ax, g.H - 7, aw, 7, INK); R(ax + 0.5, g.H - 6.5, aw - 1, 5, shade(wall, -20)); R(ax + 0.5, g.H - 6.5, aw - 1, 1, shade(wall, 10)); }
    R(0, 0, 3, 14, INK); R(0.5, 0.5, 2, 13, shade(wall, -34)); R(g.W - 3, 0, 3, 10, INK); R(g.W - 2.5, 0.5, 2, 9, shade(wall, -34));
    if (b.shabby === undefined && (b.w > 6)) { R(g.W * 0.72, -6, 5, 14, INK); R(g.W * 0.72 + 0.5, -5.5, 4, 13, '#7a4034'); R(g.W * 0.72 + 0.5, -5.5, 1, 13, '#a65a46'); } // a chimney still standing
    return;
  }
  // level 1+: soot over the front face, cracks, broken panes, pocks
  for (let i = 0; i < 3 + st.level * 2; i++) { const ax = Math.floor(hash(seed, i) * (g.W - 8)) + 3; R(ax, g.faceY + 1, 3 + Math.floor(hash(seed, i + 9) * 4), g.faceH - 2, 'rgba(10,8,12,0.38)'); }
  for (let wx = 5; wx + 9 <= g.W - 4; wx += 16) if (hash(seed, wx) > (st.level === 1 ? 0.55 : 0.35)) { R(wx, g.faceY + 2, 9, 3, '#15131a'); R(wx + 2, g.faceY + 2, 1, 3, '#cfd4dc'); R(wx + 5, g.faceY + 3, 2, 1, '#cfd4dc'); }
  for (let i = 0; i < 4 + st.level * 4; i++) { const ax = Math.floor(hash(seed, i + 30) * (g.W - 6)) + 2, ay = g.faceY + 1 + Math.floor(hash(seed, i + 31) * (g.faceH - 3)); R(ax, ay, 1, 1, INK); R(ax - 1, ay, 1, 1, 'rgba(255,255,255,.5)'); }
  R(Math.floor(g.W * 0.3), g.frontY - 1, 4, 1, '#3a3028'); R(Math.floor(g.W * 0.64), g.frontY - 1, 3, 1, '#3a3028'); // chips out of the front wall's top edge
  if (st.level >= 2) { // a gap knocked through the front face
    for (const br of st.breach || []) {
      const x0 = Math.max(2, Math.round(br.u)), wd = Math.round(br.w); const topY = g.frontY - 1, botY = g.H;
      // the floor and the dark of the room show where the wall was
      R(x0, topY, wd, botY - topY + 1, '#2a2118'); R(x0 + 1, topY + 1, wd - 2, 3, 'rgba(255,200,120,0.16)'); R(x0, botY - 1, wd, 1, 'rgba(120,110,100,0.8)');
      // jagged, broken ends: the bricks left standing
      for (let i = 0; i < 6; i++) { const lw = 1 + Math.floor(hash(seed + x0, i) * 3); R(x0 - lw, topY + i * 2 + (hash(seed, i) > 0.5 ? 1 : 0), lw, 2, INK); R(x0 - lw + 0.5, topY + i * 2 + 0.5, lw - 0.5, 1.5, shade(wall, -20 + i * 3)); R(x0 + wd, topY + i * 2 + (hash(seed, i + 4) > 0.5 ? 1 : 0), lw, 2, INK); R(x0 + wd + 0.5, topY + i * 2 + 0.5, lw - 0.5, 1.5, shade(wall, -26 + i * 3)); }
      R(x0 - 1, topY - 1, 2, 1, INK); R(x0 + wd - 1, topY - 1, 2, 1, INK);
      if (br.kind === 'blast') { for (let i = 0; i < 9; i++) R(x0 - 3 + Math.floor(hash(seed, i + 50) * (wd + 6)), topY - 2 + Math.floor(hash(seed, i + 51) * 3), 2, 2, 'rgba(10,8,12,0.55)'); } // scorch around a charge
      rubble(ctx, g, x0 + wd / 2, g.H + 3, wd + 10, 9, seed + x0, wall); // the pile in front
    }
    for (const sd of st.side || []) { const ax = sd === 'W' ? 0 : g.W - 3; R(ax, 4, 3, 16, '#2a2118'); R(ax, 4, 3, 1, INK); R(ax, 20, 3, 1, INK); rubble(ctx, g, sd === 'W' ? -3 : g.W + 3, 14, 8, 14, seed + (sd === 'W' ? 3 : 4), wall); }
    // the room is wrecked: overturned things, scorch on the floor
    for (let i = 0; i < 6; i++) R(g.fx + 3 + Math.floor(hash(seed, i + 60) * (g.fw - 10)), g.fy + 4 + Math.floor(hash(seed, i + 61) * (g.fh - 8)), 3, 2, 'rgba(0,0,0,0.3)');
  }
}
