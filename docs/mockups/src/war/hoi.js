// TARGET ART (mock-up only). The strategic command map in the manner of a grand-strategy game: provinces tinted by who holds them (occupied ground is striped),
// state and country borders, a red front line, division counters (flag, NATO-style symbol, strength and organisation bars, stack count), order arrows
// (move, attack, plan, defend), combat markers, supply and air zones. Drawn on the generated atlas (hf3 = 130 px per degree), nothing from the game's code.
const INK = '#17161f';
export const hash = (a, b = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const NATION = { company: { c: '#4f9a3e', d: '#2e5a24', name: 'Your company' }, ostmark: { c: '#4a7ac8', d: '#27427a', name: 'Ostmark Union' }, varn: { c: '#d8742a', d: '#7a3a12', name: 'Varnistan' }, windfen: { c: '#9a9aa8', d: '#4a4a58', name: 'Windfen League' } };
export const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });

export function setup(M, P, AT) {
  const px = (lon) => (lon - M.lo0) * M.ppd, py = (lat) => (M.la1 - lat) * M.ppd;
  const prov = (la, lo) => { let b = null, bd = 1e9; P.forEach((p) => { const d = Math.hypot(p.la - la, (p.lo - lo) * Math.cos(la * Math.PI / 180)); if (d < bd) { bd = d; b = p; } }); return b; };
  const pc = (la, lo) => { const p = prov(la, lo); return [px(p.lo), py(p.la), p]; };
  return { px, py, prov, pc, M, P, AT };
}

/** the base map: terrain + province control tint + stripes where occupied + borders + the front line */
export function drawPolitical(g, W_, img, pimg, ctx, side, o = {}) {
  const { M, P } = ctx; const w = M.W, h = M.H; g.drawImage(img, 0, 0);
  const [pc2, pg] = (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; })(); pg.drawImage(pimg, 0, 0); const pd = pg.getImageData(0, 0, w, h).data;
  const id = new Int16Array(w * h).fill(-1); for (let n = 0; n < w * h; n++) if (pd[n * 4 + 2] === 255) id[n] = pd[n * 4] | (pd[n * 4 + 1] << 8);
  const st = new Map(P.map((p) => [p.id, p.state])); const ctry = (i) => (i < 0 ? '' : o.country(st.get(i))); const sd = (i) => (i < 0 ? '' : side.get(i) || '');
  const out = g.getImageData(0, 0, w, h); const D = out.data; const ov = new Uint8ClampedArray(w * h * 4);
  const TINT = { f: [58, 120, 210], e: [220, 116, 40], n: [150, 150, 165] };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = y * w + x; const i = id[n]; if (i < 0) continue; const s = sd(i); const home = o.home(i); const t = TINT[s]; if (!t) continue; const occupied = s !== home; const a = occupied ? 0.34 : 0.1; const stripe = occupied && ((x + y) % 22) < 9; const k = stripe ? a + 0.2 : a; D[n * 4] = D[n * 4] * (1 - k) + t[0] * k; D[n * 4 + 1] = D[n * 4 + 1] * (1 - k) + t[1] * k; D[n * 4 + 2] = D[n * 4 + 2] * (1 - k) + t[2] * k; }
  // borders: province (thin), state (medium), country (strong), front (the side changes)
  const mark = (n, r, gc, b, a) => { ov[n * 4] = r; ov[n * 4 + 1] = gc; ov[n * 4 + 2] = b; ov[n * 4 + 3] = Math.max(ov[n * 4 + 3], a); };
  const front = new Uint8Array(w * h);
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const n = y * w + x; const a = id[n]; if (a < 0) continue; for (const m of [n + 1, n + w]) { const b = id[m]; if (b < 0 || b === a) continue; if (ctry(a) !== ctry(b)) { mark(n, 20, 16, 30, 230); mark(m, 20, 16, 30, 230); if (x > 0) mark(n - 1, 20, 16, 30, 160); } else if (st.get(a) !== st.get(b)) { mark(n, 28, 22, 36, 150); mark(m, 28, 22, 36, 100); } else { mark(n, 24, 20, 34, 125); } if (sd(a) !== sd(b) && sd(a) && sd(b) && sd(a) !== 'n' && sd(b) !== 'n') front[n] = front[m] = 1; } }
  g.putImageData(out, 0, 0); const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const og = oc.getContext('2d'); og.putImageData(new ImageData(ov, w, h), 0, 0); g.drawImage(oc, 0, 0);
  // front line: dilate and paint red with a dark casing
  const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fg = fc.getContext('2d'); const fi = fg.createImageData(w, h); const FD = fi.data; for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { if (!front[y * w + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const n = (y + dy) * w + x + dx; FD[n * 4] = 255; FD[n * 4 + 1] = 70; FD[n * 4 + 2] = 54; FD[n * 4 + 3] = 255; } }
  fg.putImageData(fi, 0, 0); g.save(); g.shadowColor = 'rgba(10,6,12,.9)'; g.shadowBlur = 6; g.drawImage(fc, 0, 0); g.restore(); g.drawImage(fc, 0, 0);
  return { id, front };
}

export function features(g, ctx, FEAT, EX, o = {}) {
  const { M, px, py } = ctx; const sc = o.scale || 1.25;
  FEAT.farms.forEach(([x, y, v]) => { g.fillStyle = v ? 'rgba(206,196,110,.5)' : 'rgba(150,176,84,.5)'; g.fillRect(x, y, 22 * sc, 14 * sc); g.fillStyle = 'rgba(60,50,20,.25)'; for (let i = 0; i < 14 * sc; i += 4) g.fillRect(x, y + i, 22 * sc, 1); });
  FEAT.hills.forEach(([x, y]) => { g.fillStyle = 'rgba(80,70,40,.32)'; g.beginPath(); g.ellipse(x, y + 4 * sc, 16 * sc, 9 * sc, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(200,186,128,.5)'; g.beginPath(); g.ellipse(x - 1, y + 1 * sc, 13 * sc, 7 * sc, 0, 0, 7); g.fill(); });
  FEAT.trees.filter((_, i) => i % 3 === 0).forEach(([x, y, s, t]) => { g.save(); g.translate(x, y); g.scale(s * 0.8 * sc, s * 0.8 * sc); g.fillStyle = 'rgba(8,10,20,.3)'; g.beginPath(); g.ellipse(4, 2, 8, 3, 0, 0, 7); g.fill(); if (t) { g.fillStyle = INK; g.beginPath(); g.moveTo(0, -20); g.lineTo(10, 2); g.lineTo(-10, 2); g.fill(); g.fillStyle = '#2f5a3a'; g.beginPath(); g.moveTo(0, -18); g.lineTo(8, 1); g.lineTo(-8, 1); g.fill(); g.fillStyle = '#4a8a56'; g.beginPath(); g.moveTo(0, -18); g.lineTo(-8, 1); g.lineTo(-1, 1); g.fill(); } else { g.fillStyle = INK; g.beginPath(); g.arc(0, -6, 9, 0, 7); g.fill(); g.fillStyle = '#3f7a45'; g.beginPath(); g.arc(0, -6, 7.5, 0, 7); g.fill(); g.fillStyle = '#5aa05a'; g.beginPath(); g.arc(-2, -8, 4, 0, 7); g.fill(); } g.restore(); });
  FEAT.peaks.filter((_, i) => i % 2 === 0).forEach(([x, y, s]) => { g.save(); g.translate(x, y); g.scale(s * sc, s * sc); g.fillStyle = 'rgba(10,8,20,.32)'; g.beginPath(); g.ellipse(8, 5, 18, 5, 0, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.moveTo(-17, 4); g.lineTo(0, -26); g.lineTo(17, 4); g.fill(); g.fillStyle = '#8a8478'; g.beginPath(); g.moveTo(-15, 3); g.lineTo(0, -23); g.lineTo(2, 3); g.fill(); g.fillStyle = '#5a564c'; g.beginPath(); g.moveTo(0, -23); g.lineTo(15, 3); g.lineTo(2, 3); g.fill(); g.fillStyle = '#f2f2f4'; g.beginPath(); g.moveTo(0, -23); g.lineTo(-5, -12); g.lineTo(0, -15); g.lineTo(4, -10); g.fill(); g.restore(); });
  g.lineCap = 'round'; g.strokeStyle = 'rgba(76,160,214,.85)'; EX.rivers.forEach(([a, b, c, d, n]) => { if (a < M.la0 - 1 || a > M.la1 + 1 || b < M.lo0 - 1 || b > M.lo1 + 1) return; g.lineWidth = Math.min(8, 2 + Math.sqrt(n) * 0.2); g.beginPath(); g.moveTo(px(b), py(a)); g.lineTo(px(d), py(c)); g.stroke(); });
}
export function railsAndRoads(g, ctx, EX) {
  const { M, px, py } = ctx; const ok = (r) => r.a[0] > M.la0 && r.a[0] < M.la1 && r.a[1] > M.lo0 && r.a[1] < M.lo1;
  EX.roads.filter((r) => r.kind === 'main' && ok(r)).forEach((r) => { g.lineCap = 'round'; g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(px(r.a[1]), py(r.a[0])); g.lineTo(px(r.b[1]), py(r.b[0])); g.stroke(); g.strokeStyle = 'rgba(255,232,170,.85)'; g.lineWidth = 3; g.stroke(); });
  EX.roads.filter((r) => r.kind === 'main' && ok(r)).forEach((r) => { g.strokeStyle = '#1a1a22'; g.lineWidth = 7; g.beginPath(); g.moveTo(px(r.a[1]), py(r.a[0])); g.lineTo(px(r.b[1]), py(r.b[0])); g.stroke(); g.strokeStyle = '#e8e4d8'; g.lineWidth = 3.5; g.setLineDash([9, 9]); g.stroke(); g.setLineDash([]); });
}
export function label(g, t, x, y, s, c = '#fff', a = 0.85, sp = 0.33) { g.save(); g.font = `800 ${s}px system-ui`; g.letterSpacing = Math.round(s * sp) + 'px'; g.textAlign = 'center'; g.globalAlpha = a; g.lineWidth = Math.max(4, s / 4); g.strokeStyle = 'rgba(6,12,24,.75)'; g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y); g.restore(); }
export function towns(g, ctx) {
  const { M, px, py, AT } = ctx; const places = AT.places.filter((p) => p.lat > M.la0 && p.lat < M.la1 && p.lon > M.lo0 && p.lon < M.lo1);
  const town = (x, y, big) => { const n = big ? 7 : 4; for (let i = 0; i < n; i++) { const ox = (i % 3) * 12 - 12 + hash(i, x) * 4, oy = Math.floor(i / 3) * 10 - 5; g.fillStyle = 'rgba(8,10,20,.3)'; g.fillRect(x + ox + 3, y + oy + 3, 11, 11); g.fillStyle = INK; g.fillRect(x + ox - 1, y + oy - 1, 12, 12); g.fillStyle = i % 2 ? '#c8a888' : '#d8c8a8'; g.fillRect(x + ox, y + oy, 10, 10); g.fillStyle = '#8a4a3a'; g.fillRect(x + ox, y + oy, 10, 4); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + ox, y + oy, 10, 1); } };
  places.forEach((p) => { const x = px(p.lon), y = py(p.lat); if (['c', 't', 'm', 'r'].includes(p.k)) town(x, y, p.k === 'c' || p.k === 'r'); if (p.k === 'p') { g.fillStyle = '#05101a'; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.strokeStyle = '#7fe8ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y - 5, 3.2, 0, 7); g.moveTo(x, y - 2); g.lineTo(x, y + 7); g.moveTo(x - 5, y + 2); g.lineTo(x + 5, y + 2); g.moveTo(x - 7, y + 4); g.quadraticCurveTo(x, y + 11, x + 7, y + 4); g.stroke(); } });
  AT.mil.filter((m) => m.lat > M.la0 && m.lat < M.la1 && m.lon > M.lo0 && m.lon < M.lo1).forEach((m) => { const x = px(m.lon), y = py(m.lat); g.fillStyle = '#05101a'; g.fillRect(x - 14, y - 14, 28, 28); g.strokeStyle = m.country === 'varn' ? '#ff9a6a' : '#7ab8ff'; g.lineWidth = 2.5; g.strokeRect(x - 14, y - 14, 28, 28); g.fillStyle = g.strokeStyle; if (m.kind === 'air') { g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 9, y + 9); g.lineTo(x, y + 4); g.lineTo(x - 9, y + 9); g.fill(); } else if (m.kind === 'naval') { g.fillRect(x - 9, y + 1, 18, 6); g.fillRect(x - 1, y - 9, 3, 11); } else { g.fillRect(x - 7, y - 7, 14, 14); } });
  places.filter((p) => ['c', 'p', 'b', 'r', 'm', 'f'].includes(p.k) || p.name === 'Salt Landing').forEach((p) => { const x = px(p.lon), y = py(p.lat); g.font = '700 17px system-ui'; g.textAlign = 'center'; g.lineWidth = 4.5; g.strokeStyle = 'rgba(6,12,24,.88)'; g.strokeText(p.name, x, y + 32); g.fillStyle = '#fff4d0'; g.fillText(p.name, x, y + 32); g.textAlign = 'left'; });
}

// ------------------------------------------------------------------------------------------------ counters and arrows
function symbol(g, kind, x, y, w, h, col = '#f4f2ea') {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.6; g.lineJoin = 'round'; const hw = w / 2, hh = h / 2; g.strokeRect(x - hw, y - hh, w, h);
  if (kind === 'inf') { g.beginPath(); g.moveTo(x - hw, y - hh); g.lineTo(x + hw, y + hh); g.moveTo(x + hw, y - hh); g.lineTo(x - hw, y + hh); g.stroke(); }
  else if (kind === 'arm') { g.beginPath(); g.ellipse(x, y, hw * 0.62, hh * 0.62, 0, 0, 7); g.stroke(); }
  else if (kind === 'mech') { g.beginPath(); g.moveTo(x - hw, y - hh); g.lineTo(x + hw, y + hh); g.moveTo(x + hw, y - hh); g.lineTo(x - hw, y + hh); g.stroke(); g.beginPath(); g.ellipse(x, y, hw * 0.55, hh * 0.5, 0, 0, 7); g.stroke(); }
  else if (kind === 'art') { g.beginPath(); g.arc(x, y, hh * 0.38, 0, 7); g.fill(); }
  else if (kind === 'rec') { g.beginPath(); g.moveTo(x - hw, y + hh); g.lineTo(x + hw, y - hh); g.stroke(); }
  else if (kind === 'eng') { g.beginPath(); g.moveTo(x - hw * 0.5, y + hh * 0.4); g.lineTo(x - hw * 0.5, y - hh * 0.3); g.lineTo(x - hw * 0.2, y - hh * 0.3); g.lineTo(x - hw * 0.2, y); g.lineTo(x + hw * 0.2, y); g.lineTo(x + hw * 0.2, y - hh * 0.3); g.lineTo(x + hw * 0.5, y - hh * 0.3); g.lineTo(x + hw * 0.5, y + hh * 0.4); g.stroke(); }
  else if (kind === 'hq') { g.beginPath(); g.moveTo(x - hw * 0.3, y + hh); g.lineTo(x - hw * 0.3, y - hh * 0.2); g.stroke(); g.fillRect(x - hw * 0.3, y - hh * 0.9, hw * 0.9, hh * 0.7); }
  else if (kind === 'air') { g.beginPath(); g.moveTo(x, y - hh * 0.7); g.lineTo(x + hw * 0.8, y + hh * 0.5); g.lineTo(x, y + hh * 0.15); g.lineTo(x - hw * 0.8, y + hh * 0.5); g.closePath(); g.fill(); }
  else if (kind === 'hel') { g.beginPath(); g.moveTo(x - hw * 0.8, y - hh * 0.5); g.lineTo(x + hw * 0.8, y - hh * 0.5); g.moveTo(x, y - hh * 0.5); g.lineTo(x, y + hh * 0.2); g.stroke(); g.beginPath(); g.ellipse(x, y + hh * 0.3, hw * 0.4, hh * 0.28, 0, 0, 7); g.fill(); }
  else if (kind === 'nav') { g.beginPath(); g.moveTo(x, y - hh * 0.7); g.lineTo(x, y + hh * 0.4); g.moveTo(x - hw * 0.5, y); g.lineTo(x + hw * 0.5, y); g.moveTo(x - hw * 0.6, y + hh * 0.2); g.quadraticCurveTo(x, y + hh * 0.9, x + hw * 0.6, y + hh * 0.2); g.stroke(); }
  g.restore();
}
export function flag(g, nation, x, y, w, h) { const N = NATION[nation]; g.fillStyle = N.c; g.fillRect(x, y, w, h); if (nation === 'ostmark') { g.fillStyle = '#f4f4f8'; g.fillRect(x + w * 0.38, y, w * 0.18, h); g.fillRect(x, y + h * 0.4, w, h * 0.2); } else if (nation === 'varn') { g.fillStyle = '#17161f'; g.fillRect(x, y + h * 0.7, w, h * 0.3); g.fillStyle = '#f2d44a'; g.fillRect(x + w * 0.1, y + h * 0.15, w * 0.28, h * 0.28); } else if (nation === 'company') { g.fillStyle = '#e8c84a'; g.beginPath(); g.moveTo(x + w / 2, y + h * 0.12); g.lineTo(x + w * 0.8, y + h / 2); g.lineTo(x + w / 2, y + h * 0.88); g.lineTo(x + w * 0.2, y + h / 2); g.closePath(); g.fill(); } g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, w, 3); }
/** a division counter (HOI-style), centred on (x,y) */
export function counter(g, x, y, o) {
  const w = o.w || 104, h = o.h || 60; const N = NATION[o.nation]; const bx = x - w / 2, by = y - h;
  g.save(); g.fillStyle = 'rgba(8,10,24,.4)'; g.beginPath(); g.ellipse(x + 4, y + 4, w * 0.4, 8, 0, 0, 7); g.fill();
  // stack shadow plates
  for (let k = Math.min(2, (o.stack || 1) - 1); k >= 1; k--) { g.fillStyle = INK; g.fillRect(bx + k * 5 - 1, by - k * 5 - 1, w + 2, h + 2); g.fillStyle = N.d; g.fillRect(bx + k * 5, by - k * 5, w, h); }
  // pointer
  g.fillStyle = INK; g.beginPath(); g.moveTo(x - 9, by + h); g.lineTo(x + 9, by + h); g.lineTo(x, y + 6); g.closePath(); g.fill();
  g.fillStyle = o.sel ? '#ffe28a' : INK; g.fillRect(bx - 3, by - 3, w + 6, h + 6); g.fillStyle = INK; g.fillRect(bx - 1, by - 1, w + 2, h + 2);
  g.fillStyle = '#2a2d3c'; g.fillRect(bx, by, w, h); const gr = g.createLinearGradient(0, by, 0, by + h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = gr; g.fillRect(bx, by, w, h);
  flag(g, o.nation, bx + 3, by + 3, 26, 22); g.fillStyle = 'rgba(14,16,30,.7)'; g.fillRect(bx + 31, by + 3, w - 38 - 8, h - 14);
  symbol(g, o.kind, bx + 31 + (w - 38 - 8) / 2, by + 3 + (h - 14) / 2, Math.min(40, w - 52), 26, o.est ? '#e8d8b0' : '#f4f2ea');
  g.fillStyle = '#fff'; g.font = '800 15px system-ui'; g.textAlign = 'center'; g.fillText(o.n || '', bx + 16, by + 40); if (o.est) { g.fillStyle = '#ffd88a'; g.fillText('~' + o.est, bx + 16, by + 54); }
  // strength (vertical, right) and organisation (horizontal, bottom)
  g.fillStyle = '#0c0c14'; g.fillRect(bx + w - 8, by + 3, 6, h - 14); g.fillStyle = o.str > 0.6 ? '#5fe08a' : o.str > 0.3 ? '#f2c14e' : '#ff6a5a'; const sh = (h - 14) * o.str; g.fillRect(bx + w - 8, by + 3 + (h - 14 - sh), 6, sh);
  g.fillStyle = '#0c0c14'; g.fillRect(bx + 3, by + h - 8, w - 14, 6); g.fillStyle = '#6ab0ff'; g.fillRect(bx + 3, by + h - 8, (w - 14) * o.org, 6);
  if ((o.stack || 1) > 1) { g.fillStyle = INK; g.fillRect(bx + w - 26, by - 12, 30, 22); g.fillStyle = '#f2c14e'; g.fillRect(bx + w - 25, by - 11, 28, 20); g.fillStyle = '#2a1a00'; g.font = '800 14px system-ui'; g.textAlign = 'center'; g.fillText('×' + o.stack, bx + w - 11, by + 5); }
  if (o.status) { g.fillStyle = INK; g.fillRect(bx - 4, by - 12, 24, 22); g.fillStyle = o.status === 'attack' ? '#ff5a4a' : o.status === 'defend' ? '#6ab0ff' : '#ffe28a'; g.fillRect(bx - 3, by - 11, 22, 20); g.fillStyle = '#fff'; g.font = '800 13px system-ui'; g.fillText(o.status === 'attack' ? '⚔' : o.status === 'defend' ? '⛨' : '▶', bx + 8, by + 4); }
  g.restore();
}
/** arrows: type move | attack | plan | defend | enemy | supply */
export function arrow(g, pts, type = 'move', o = {}) {
  const st = { move: ['#4aa0ff', 9], attack: ['#ff4a3a', 14], plan: ['#f2c14e', 22], defend: ['#8aa8c8', 16], enemy: ['#ff9a4a', 11], supply: ['#7dffb0', 7] }[type]; const col = o.col || st[0], wd = o.w || st[1];
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; if (type === 'enemy') g.setLineDash([16, 12]);
  const path = (c = false) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? (o.curve ? g.quadraticCurveTo(...(o.curve[i] || [x, y]), x, y) : g.lineTo(x, y)) : g.moveTo(x, y))); };
  const end = pts[pts.length - 1], prev = pts[pts.length - 2]; const a = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  g.strokeStyle = 'rgba(8,6,20,.78)'; g.lineWidth = wd + 7; path(); g.stroke(); g.setLineDash(type === 'enemy' ? [16, 12] : []);
  g.strokeStyle = col; g.lineWidth = wd; path(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = wd * 0.3; path(); g.stroke();
  g.setLineDash([]); const hl = wd * 1.9 + 8, hw = wd * 1.2 + 6; const tip = [end[0] + Math.cos(a) * hl * 0.4, end[1] + Math.sin(a) * hl * 0.4]; const head = (e) => { g.beginPath(); g.moveTo(tip[0] + Math.cos(a) * e, tip[1] + Math.sin(a) * e); g.lineTo(tip[0] - Math.cos(a) * hl + Math.cos(a + Math.PI / 2) * (hw + e), tip[1] - Math.sin(a) * hl + Math.sin(a + Math.PI / 2) * (hw + e)); g.lineTo(tip[0] - Math.cos(a) * hl * 0.7, tip[1] - Math.sin(a) * hl * 0.7); g.lineTo(tip[0] - Math.cos(a) * hl + Math.cos(a - Math.PI / 2) * (hw + e), tip[1] - Math.sin(a) * hl + Math.sin(a - Math.PI / 2) * (hw + e)); g.closePath(); };
  g.fillStyle = 'rgba(8,6,20,.78)'; head(4); g.fill(); g.fillStyle = col; head(0); g.fill();
  if (type === 'defend') { for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6; const i = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))); const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const u = t * (pts.length - 1) - i; const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u; const aa = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2; g.strokeStyle = '#17161f'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - Math.cos(aa) * 16, y - Math.sin(aa) * 16); g.lineTo(x + Math.cos(aa) * 16, y + Math.sin(aa) * 16); g.stroke(); } }
  g.restore();
}
export function tag(g, x, y, lines, o = {}) { g.save(); g.font = '800 15px system-ui'; const w = Math.max(...lines.map((l) => g.measureText(l.t || l).width)) + 28, h = lines.length * 22 + 14; const bx = x - (o.right ? w : 0), by = y - h; g.fillStyle = 'rgba(12,10,36,.96)'; g.fillRect(bx, by, w, h); g.strokeStyle = o.col || '#ffe28a'; g.lineWidth = 2.5; g.strokeRect(bx, by, w, h); lines.forEach((l, i) => { const t = l.t || l; g.fillStyle = l.c || (i === 0 ? (o.col || '#ffe28a') : '#e8e6ff'); g.font = i === 0 ? '800 16px system-ui' : '600 14px system-ui'; g.fillText(t, bx + 14, by + 24 + i * 22); }); g.restore(); }
export function combatMark(g, x, y, a, d, o = {}) { g.save(); g.fillStyle = 'rgba(8,6,20,.45)'; g.beginPath(); g.ellipse(x + 3, y + 30, 28, 8, 0, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.fillStyle = '#8a221c'; g.beginPath(); g.arc(x, y, 27, 0, 7); g.fill(); g.strokeStyle = '#ffd8b0'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 13, y - 13); g.lineTo(x + 13, y + 13); g.moveTo(x + 13, y - 13); g.lineTo(x - 13, y + 13); g.stroke(); g.fillStyle = INK; g.fillRect(x - 36, y + 30, 72, 12); g.fillStyle = '#1a2a50'; g.fillRect(x - 35, y + 31, 70, 10); g.fillStyle = '#4a8aff'; g.fillRect(x - 35, y + 31, 70 * (o.share ?? 0.5), 10); g.fillStyle = '#ff7a3a'; g.fillRect(x - 35 + 70 * (o.share ?? 0.5), y + 31, 70 * (1 - (o.share ?? 0.5)), 10); g.fillStyle = '#fff'; g.font = '800 13px system-ui'; g.textAlign = 'center'; g.fillText(`${a} : ${d}`, x, y + 56); g.restore(); }
export function hub(g, x, y, r, col = '#7dffb0') { g.save(); g.strokeStyle = col; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(120,255,170,.07)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#05101a'; g.beginPath(); g.arc(x, y, 17, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke(); g.fillStyle = col; g.fillRect(x - 7, y - 7, 14, 14); g.restore(); }
export function convoy(g, x1, y1, x2, y2, n = 4) { for (let i = 0; i < n; i++) { const t = 0.12 + i * 0.2; const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; const a = Math.atan2(y2 - y1, x2 - x1); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(8,10,24,.4)'; g.fillRect(-14, -6, 30, 14); g.fillStyle = INK; g.fillRect(-15, -8, 30, 14); g.fillStyle = '#6a7a52'; g.fillRect(-14, -7, 20, 12); g.fillStyle = '#c8c0a0'; g.fillRect(7, -7, 7, 12); g.restore(); } }
