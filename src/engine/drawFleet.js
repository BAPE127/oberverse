// The war vehicles (v0.102.0): a parametric painter in the game's idiom (1-px ink outline, lit left, shaded right, one cached sprite per spec, paint and state): running gear (tracks, wheels, half-tracks,
// hover), hull, features (hatches, vents, skirts, antennas, a dozer blade, crosses), an optional turret on its own canvas that turns on its own, and helicopters with spinning rotors. Ported from the approved
// mock-up (docs/mockups/src/war/fleet.js and warart.js). A tank is about 1.8 tiles long. Browser only; paint, never state.
export const INK = '#1b1a24';
export const hexRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const shade = (h, k) => { const [r, g, b] = hexRgb(h); const f = (v) => Math.max(0, Math.min(255, Math.round(v + k))); return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
export const mixc = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function outlined(src) {
  const [c, g] = mk(src.width + 2, src.height + 2);
  const [s, sg] = mk(src.width, src.height); sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = INK; sg.fillRect(0, 0, src.width, src.height);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy);
  g.drawImage(src, 1, 1); return c;
}
const silhouette = (c, col = 'rgba(10,8,20,0.34)') => { const [s, g] = mk(c.width, c.height); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return s; };
const cache = new Map();
const sil = (c) => { const [s, g] = mk(c.width, c.height); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(10,8,20,0.34)'; g.fillRect(0, 0, c.width, c.height); return s; };
export const PAINT = {
  company: { hull: '#4f6a3e', hull2: '#3c5430', accent: '#f2f0e4', glass: '#26384e', track: '#26262c' },
  sund: { hull: '#6c7a8c', hull2: '#55627a', accent: '#e8c84a', glass: '#26384e', track: '#2a2a32' },
  varn: { hull: '#a08a5a', hull2: '#85703f', accent: '#b83a2a', glass: '#26384e', track: '#2c2824' },
  future: { hull: '#c9ced6', hull2: '#8e96a6', accent: '#4ad8e8', glass: '#173a52', track: '#2a2e38' },
};
const plate = (R, x, y, w, h, c, k = 2) => { R(x + k, y, w - 2 * k, h, c); R(x + 1, y + 1, w - 2, h - 2, c); R(x, y + k, w, h - 2 * k, c); R(x + 1, y + 1, 1, h - 3, shade(c, 38)); R(x + w - 2, y + 2, 1, h - 4, shade(c, -34)); R(x + 2, y, w - 4, 1, shade(c, 26)); R(x + 2, y + h - 1, w - 4, 1, shade(c, -44)); };

/** vehicle sprite: returns { hull, turret|null } canvases (nose up) */
export function vehicleSprite(spec, paintKey = 'company', state = 'ok') {
  const key = `v|${spec.id}|${paintKey}|${state}`; if (cache.has(key)) return cache.get(key);
  const P = PAINT[paintKey] || PAINT.company; const wreck = state === 'wreck', dmg = state === 'damaged';
  const L = spec.L, Wd = spec.W; const [c, g] = mk(140, 170); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(70 + x, 85 + y, w, h); };
  const base = wreck ? '#2c2a2a' : (spec.hull ? spec.hull : P.hull), dark = wreck ? '#1c1a1a' : P.hull2;
  const hl = L / 2, hw = Wd / 2;
  // ---- running gear
  if (spec.gear === 'tracked' || spec.gear === 'half') { for (const sx of [-1, 1]) { const x0 = sx < 0 ? -hw - 5 : hw - 2; const l = spec.gear === 'half' ? L * 0.62 : L + 4; const y0 = spec.gear === 'half' ? hl - l + 2 : -hl - 2; plate(R, x0, y0, 7, l, wreck ? '#1a1818' : P.track, 2); for (let y = y0 + 1; y < y0 + l; y += 3) R(x0 + 1, y, 5, 1, wreck ? '#2a2626' : '#4a4a52'); R(x0 + 2, y0 + 1, 3, 3, '#5a5a62'); R(x0 + 2, y0 + l - 4, 3, 3, '#5a5a62'); }
    if (spec.gear === 'half') for (const sx of [-1, 1]) { R(sx * (hw - 1) - 3, -hl + 6, 6, 9, '#16161c'); R(sx * (hw - 1) - 2, -hl + 7, 4, 7, '#3a3a44'); } }
  else if (spec.gear === 'wheeled') { const n = spec.wheels || 3; for (const sx of [-1, 1]) for (let i = 0; i < n; i++) { const y = -hl + 4 + (L - 14) * (n === 1 ? 0 : i / (n - 1)); const x0 = sx < 0 ? -hw - 5 : hw - 1; R(x0, y, 6, 11, '#16161c'); R(x0 + 1, y + 1, 4, 9, '#2c2c36'); R(x0 + (sx < 0 ? 4 : 1), y + 3, 1, 5, '#5a5a62'); } }
  else if (spec.gear === 'hover') { for (const sx of [-1, 1]) { const x0 = sx < 0 ? -hw - 8 : hw - 3; plate(R, x0, -hl + 4, 11, L - 8, wreck ? '#1a1818' : shade(P.hull2, -18), 4); R(x0 + 2, -hl + 8, 7, 7, wreck ? '#111' : '#0e1c24'); R(x0 + 3, -hl + 9, 5, 5, wreck ? '#222' : P.accent); R(x0 + 2, hl - 16, 7, 7, wreck ? '#111' : '#0e1c24'); R(x0 + 3, hl - 15, 5, 5, wreck ? '#222' : P.accent); } }
  if (spec.skirts && !wreck) { plate(R, -hw - 1, -hl + 8, 3, L - 14, shade(base, -16), 1); plate(R, hw - 2, -hl + 8, 3, L - 14, shade(base, -24), 1); }
  // ---- hull
  const ang = spec.shape === 'angular';
  plate(R, -hw + 1, -hl, Wd - 2, L, base, ang ? 6 : 4);
  if (ang) { R(-hw + 5, -hl + 1, Wd - 10, 7, shade(base, 30)); R(-hw + 3, -hl + 8, Wd - 6, 1, shade(base, -40)); R(-hw + 1, -hl + 20, 3, 1, shade(base, -50)); }
  else { R(-hw + 4, -hl + 1, Wd - 8, 6, shade(base, 28)); R(-hw + 3, -hl + 7, Wd - 6, 1, shade(base, -40)); }
  if (spec.gear !== 'hover') for (let y = hl - 16; y < hl - 3; y += 2) R(-hw + 5, y, Wd - 10, 1, shade(base, -34));
  R(-3, -hl + 9, 6, 3, shade(base, -30)); R(-2, -hl + 10, 4, 1, INK);
  if (spec.cab) { // truck / van cab
    R(-hw + 2, -hl + 1, Wd - 4, 14, wreck ? '#2a2828' : shade(base, 10)); R(-hw + 4, -hl + 3, Wd - 8, 6, wreck ? '#111' : P.glass); R(-hw + 5, -hl + 4, 4, 3, shade(P.glass, 40)); }
  if (!wreck && spec.camo) for (let i = 0; i < Math.floor(L * Wd / 24); i++) R(-hw + 2 + Math.floor(hash(spec.id.length, i, 1) * (Wd - 6)), -hl + 8 + Math.floor(hash(spec.id.length, i, 2) * (L - 18)), 3 + Math.floor(hash(i, 3) * 4), 2 + Math.floor(hash(i, 4) * 3), i % 2 ? shade(base, -26) : shade(base, 20));
  // ---- features
  const f = new Set(spec.feats || []);
  if (!wreck) {
    if (f.has('era')) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { R(-hw + 4 + i * ((Wd - 8) / 4), -hl + 2 + j * 3, 5, 2, shade(base, -22)); R(-hw + 4 + i * ((Wd - 8) / 4), -hl + 2 + j * 3, 5, 1, shade(base, 14)); }
    if (f.has('dozer')) { plate(R, -hw - 3, -hl - 6, Wd + 6, 7, shade('#8a8a92', -10), 1); R(-hw - 3, -hl - 6, Wd + 6, 1, '#c8c8d0'); R(-hw - 1, -hl + 1, 3, 4, '#3a3a42'); R(hw - 2, -hl + 1, 3, 4, '#3a3a42'); }
    if (f.has('roller')) for (const sx of [-1, 1]) { plate(R, sx * (hw * 0.45) - 5, -hl - 12, 10, 8, '#6a6a72', 3); for (let k = -4; k < 5; k += 2) R(sx * (hw * 0.45) + k, -hl - 11, 1, 6, '#2a2a30'); }
    if (f.has('ramp')) { R(-hw + 4, hl - 4, Wd - 8, 6, shade(base, -34)); R(-hw + 4, hl + 2, Wd - 8, 1, '#16161c'); }
    if (f.has('bridge')) { plate(R, -hw + 2, -hl + 2, Wd - 4, L - 6, '#7a7a56', 1); for (let y = -hl + 4; y < hl - 4; y += 4) R(-hw + 3, y, Wd - 6, 1, '#4a4a30'); R(-hw + 2, -hl + 2, 2, L - 6, '#9a9a6a'); R(hw - 4, -hl + 2, 2, L - 6, '#5a5a3a'); }
    if (f.has('crane')) { R(-3, -hl + 10, 6, 6, '#2a2a30'); R(-1, -hl - 2, 3, 20, '#c8a02a'); R(-1, -hl - 2, 1, 20, '#e8c04a'); R(-3, -hl - 4, 7, 3, '#8a8a92'); R(0, -hl - 8, 1, 5, '#16161c'); }
    if (f.has('radar')) { g.fillStyle = INK; g.beginPath(); g.ellipse(70, 85 + 6, 12, 7, 0, 0, 7); g.fill(); g.fillStyle = shade(P.hull2, 24); g.beginPath(); g.ellipse(70, 85 + 6, 10.5, 5.8, 0, 0, 7); g.fill(); R(-1, 5, 2, 8, '#2a2a30'); R(-5, 4, 10, 1, shade(P.hull2, 50)); }
    if (f.has('antenna')) { R(hw - 6, hl - 16, 1, 22, '#3a3a42'); R(-hw + 5, hl - 18, 1, 24, '#3a3a42'); R(-hw + 3, hl - 20, 5, 1, '#6a6a72'); }
    if (f.has('cross')) { R(-2, -2, 4, 12, '#c82a2a'); R(-6, 2, 12, 4, '#c82a2a'); R(-hw + 3, -hl + 15, Wd - 6, 2, '#c82a2a'); }
    if (f.has('tank')) { for (let i = 0; i < 3; i++) { plate(R, -hw + 4, -hl + 16 + i * 9, Wd - 8, 8, '#8a8a92', 3); R(-hw + 5, -hl + 17 + i * 9, Wd - 10, 1, '#c8c8d0'); } R(hw - 8, -hl + 14, 2, 30, '#c8a02a'); }
    if (f.has('crates')) { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { R(-hw + 4 + j * ((Wd - 8) / 2), -hl + 17 + i * 11, (Wd - 8) / 2 - 1, 10, '#8a6a3a'); R(-hw + 4 + j * ((Wd - 8) / 2), -hl + 17 + i * 11, (Wd - 8) / 2 - 1, 2, '#b08a4a'); R(-hw + 4 + j * ((Wd - 8) / 2) + 3, -hl + 17 + i * 11 + 3, 3, 4, '#c8402a'); } }
    if (f.has('tarp')) { plate(R, -hw + 3, -hl + 16, Wd - 6, L - 22, shade(base, -10), 2); for (let y = -hl + 18; y < hl - 8; y += 5) R(-hw + 4, y, Wd - 8, 1, shade(base, -34)); }
    if (f.has('pods')) { for (const sx of [-1, 1]) { plate(R, sx * (hw - 5) - 4, -hl + 14, 8, 22, '#3a3a42', 2); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R(sx * (hw - 5) - 3 + j * 4, -hl + 16 + i * 6, 3, 4, '#101014'); } }
    if (f.has('shield')) { g.strokeStyle = 'rgba(80,220,255,.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(70, 85, hw + 14, hl + 10, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(80,220,255,.1)'; g.fill(); }
    if (f.has('dome')) { g.fillStyle = INK; g.beginPath(); g.arc(70, 85 + 2, 9, 0, 7); g.fill(); g.fillStyle = shade(P.hull2, 30); g.beginPath(); g.arc(70, 85 + 2, 7.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(68, 85, 3, 0, 7); g.fill(); }
    if (f.has('stripe')) R(-hw + 5, hl - 11, Wd - 10, 2, P.accent);
    if (f.has('lights')) { R(-hw + 4, -hl + 1, 3, 2, '#fff4c0'); R(hw - 7, -hl + 1, 3, 2, '#fff4c0'); R(-hw + 4, hl - 3, 3, 2, '#b8281e'); R(hw - 7, hl - 3, 3, 2, '#b8281e'); }
    if (f.has('hatch')) { R(-6, -2, 5, 5, '#16161c'); R(-5, -1, 3, 3, '#2c2c36'); R(2, 4, 5, 5, '#16161c'); R(3, 5, 3, 3, '#2c2c36'); }
    if (f.has('vents')) for (let i = 0; i < 4; i++) R(-hw + 5 + i * 5, hl - 11, 3, 6, shade(base, -38));
    if (f.has('sandbags')) for (let i = 0; i < 5; i++) R(-hw + 4 + i * ((Wd - 8) / 5), -hl + 9, (Wd - 8) / 5 - 1, 5, '#a89260');
  } else { R(-hw + 6, -4, Wd - 12, 14, '#121010'); R(-3, 0, 6, 5, '#8a3a10'); }
  if (dmg) { R(-6, 6, 8, 6, '#1a1818'); R(-5, 7, 4, 3, '#7a3a14'); R(hw - 8, -8, 4, 4, '#1c1a1a'); }
  const hull = outlined(c);
  // ---- turret (own canvas, centre at (40,50))
  let turret = null; const T0 = spec.turret;
  if (T0 && T0.type !== 'none') {
    const [tc, tg] = mk(90, 130); const T = (x, y, w, h, col) => { tg.fillStyle = col; tg.fillRect(45 + x, 65 + y, w, h); }; const tr = T0.r || 11;
    if (wreck) { T(-tr + 2, -tr + 2, tr * 2 - 4, tr * 2 - 4, '#201e1e'); T(-4, -4, 8, 8, '#0e0c0c'); T(-3, -tr - 6, 3, 7, '#282626'); }
    else {
      const gl = T0.gun ?? 30, nb = T0.barrels || 1, ty = T0.type;
      if (ty === 'flame') { T(-1, -tr - gl + 2, 3, gl, '#3a3a42'); T(-3, -tr - gl, 7, 5, '#c8402a'); T(-2, -tr - gl - 3, 5, 3, '#ff9a2a'); }
      else if (ty === 'launcher') { for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { T(-tr + 2 + j * (tr - 1), -tr - 12 + i * 4, tr - 3, 4, '#2a2a32'); T(-tr + 3 + j * (tr - 1), -tr - 11 + i * 4, tr - 5, 2, '#d8d8e0'); } }
      else if (ty === 'twin' || nb > 1) { for (let i = 0; i < nb; i++) { const bx = -((nb - 1) * 4) / 2 + i * 4 - 1; T(bx, -tr - gl + 2, 2, gl, shade(P.hull2, -32)); T(bx, -tr - gl + 2, 1, gl, shade(P.hull2, 6)); T(bx - 1, -tr - gl, 4, 3, shade(P.hull2, -40)); } }
      else if (ty === 'mortar') { T(-3, -tr - 6, 6, 14, '#2a2a30'); T(-4, -tr - 8, 8, 3, '#16161c'); }
      else if (ty !== 'radar' && ty !== 'dome' && gl > 0) { T(-1, -tr - gl + 2, 3, gl, shade(P.hull2, -30)); T(-1, -tr - gl + 2, 1, gl, shade(P.hull2, 6)); T(-2, -tr - gl, 5, 4, shade(P.hull2, -40)); if (T0.brake) T(-3, -tr - gl + 3, 7, 2, shade(P.hull2, -52)); if (T0.sleeve) T(-2, -tr - 8, 5, 12, shade(P.hull2, -14)); }
      if (ty === 'boxy' || ty === 'launcher' || ty === 'twin') plate(T, -tr, -tr + 2, tr * 2, tr * 2 - 2, P.hull, 2); else plate(T, -tr, -tr + 2, tr * 2, tr * 2 - 2, P.hull, 4);
      T(-tr + 3, -tr + 1, tr * 2 - 6, 3, shade(P.hull, 34));
      if (ty === 'radar') { tg.fillStyle = INK; tg.beginPath(); tg.ellipse(45, 65 - 2, tr + 3, tr * 0.7, 0, 0, 7); tg.fill(); tg.fillStyle = shade(P.hull2, 26); tg.beginPath(); tg.ellipse(45, 65 - 2, tr + 1.5, tr * 0.7 - 1.5, 0, 0, 7); tg.fill(); T(-1, -3, 2, 6, '#2a2a30'); }
      T(3, 3, 6, 6, shade(P.hull, -26)); T(4, 4, 4, 4, '#0e0c10'); T(5, 5, 2, 2, P.glass);
      if (T0.num) { tg.fillStyle = P.accent; tg.font = 'bold 8px monospace'; tg.textAlign = 'center'; tg.fillText(String(T0.num), 45 - 3, 65 + 9); }
      T(-tr + 2, tr - 5, tr * 2 - 4, 1, P.accent);
    }
    turret = outlined(tc);
  }
  const out = { hull, turret }; cache.set(key, out); return out;
}
export function drawVeh(ctx, spec, x, y, heading, o = {}) {
  const S = vehicleSprite(spec, o.paint || 'company', o.state || 'ok'); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); const sc = o.scale || 1; if (sc !== 1) ctx.scale(sc, sc);
  ctx.save(); ctx.rotate(heading); ctx.globalAlpha = 0.34; ctx.drawImage(sil(S.hull), -S.hull.width / 2 + 4, -S.hull.height / 2 + 4); ctx.globalAlpha = 1; ctx.drawImage(S.hull, -S.hull.width / 2, -S.hull.height / 2);
  if (S.turret) { ctx.rotate(o.turret || 0); ctx.drawImage(S.turret, -S.turret.width / 2, -S.turret.height / 2 - (spec.turret.dy || 0)); } ctx.restore(); ctx.restore();
}

// ---------------------------------------------------------------------------------------------------- helicopters (nose up)
export function heliSprite(spec, paintKey = 'company') {
  const key = `h|${spec.id}|${paintKey}`; if (cache.has(key)) return cache.get(key); const P = PAINT[paintKey] || PAINT.company; const [c, g] = mk(150, 170); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(75 + x, 85 + y, w, h); }; const base = spec.hull || P.hull; const L = spec.L, W = spec.W;
  // tail
  if (spec.tail !== 'none') { R(-1, L / 2 - 6, 2, spec.tailL || 26, shade(base, -34)); R(-1, L / 2 + (spec.tailL || 26) - 12, 2, 12, base); R(-5, L / 2 + (spec.tailL || 26) - 6, 10, 2, shade(base, -20)); }
  // stub wings and weapons
  if (spec.wings) for (const sx of [-1, 1]) { R(sx * (W / 2 + 7) - 6, -6, 12, 8, shade(base, -16)); if (spec.pods) { R(sx * (W / 2 + 7) - 2, 2, 4, 8, '#16161c'); for (let i = 0; i < 4; i++) R(sx * (W / 2 + 7) - 3 + i * 2 - 1, 10, 1, 3, '#e8903a'); } }
  if (spec.tandem) { R(-W / 2 - 1, -L / 2 + 2, W + 2, 6, shade(base, -22)); }
  plate(R, -W / 2, -L / 2, W, L, base, Math.min(7, W / 2.2)); R(-W / 2 + 3, -L / 2 + 1, W - 6, 4, shade(base, 28));
  if (spec.canopy !== 'none') { R(-W / 2 + 2, -L / 2 + 2, W - 4, spec.canopyL || 10, P.glass); R(-W / 2 + 3, -L / 2 + 3, 3, (spec.canopyL || 10) - 3, shade(P.glass, 46)); }
  if (spec.door) { R(W / 2 - 1, -4, 3, 16, '#16161c'); R(-W / 2 - 2, -4, 3, 16, '#2a2a32'); }
  if (spec.cross) { R(-2, 2, 4, 10, '#c82a2a'); R(-5, 5, 10, 4, '#c82a2a'); }
  if (spec.nose) { R(-1, -L / 2 - 6, 2, 8, '#26262c'); R(-2, -L / 2 - 8, 4, 3, '#16161c'); }
  if (spec.skids) { R(-W / 2 - 4, -4, 2, L * 0.6, '#1c1c22'); R(W / 2 + 2, -4, 2, L * 0.6, '#1c1c22'); }
  if (spec.stealth) { R(-W / 2 + 2, L / 4, W - 4, 2, shade(base, -50)); }
  if (spec.sling) { R(-6, L / 2 - 6, 12, 14, '#8a6a3a'); R(-6, L / 2 - 6, 12, 2, '#b08a4a'); }
  const o = { body: outlined(c) }; cache.set(key, o); return o;
}
export function drawHelo(ctx, spec, x, y, heading, o = {}) {
  const b = heliSprite(spec, o.paint || 'company').body; const alt = o.altitude ?? 24, sc = o.scale || 1, R0 = spec.rotor || 40; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); if (sc !== 1) ctx.scale(sc, sc);
  ctx.save(); ctx.translate(alt * 0.55, alt * 0.9); ctx.rotate(heading); ctx.globalAlpha = 0.3; ctx.drawImage(sil(b), -b.width / 2, -b.height / 2); ctx.fillStyle = 'rgba(10,8,20,.2)'; (spec.tandem ? [[0, -spec.L / 2 + 6], [0, spec.L / 2 - 8]] : [[0, 0]]).forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, R0, 0, 7); ctx.fill(); }); ctx.restore();
  ctx.save(); ctx.translate(0, -alt * 0.35); ctx.rotate(heading); ctx.drawImage(b, -b.width / 2, -b.height / 2);
  const rotor = (cx, cy, r, ph, n = 4) => { ctx.fillStyle = 'rgba(210,214,222,.16)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(30,30,38,.55)'; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { const a = ph + (i * Math.PI * 2) / n; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); } ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 7); ctx.fill(); };
  const ph = o.phase ?? 0.6; if (spec.tandem) { rotor(0, -spec.L / 2 + 6, R0, ph, 3); rotor(0, spec.L / 2 - 8, R0, ph + 0.5, 3); } else if (spec.coax) { rotor(0, 0, R0, ph, 3); ctx.strokeStyle = 'rgba(240,240,248,.3)'; ctx.beginPath(); ctx.arc(0, 0, R0 * 0.8, 0, 7); ctx.stroke(); } else rotor(0, 0, R0, ph, spec.blades || 4);
  if (spec.tail !== 'none' && !spec.coax) { const t = spec.L / 2 + (spec.tailL || 26) - 4; ctx.fillStyle = 'rgba(210,214,222,.2)'; ctx.beginPath(); ctx.arc(0, t, 7, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(30,30,38,.6)'; ctx.beginPath(); ctx.moveTo(-6, t - 2); ctx.lineTo(6, t + 2); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}

const V = (id, name, cls, src, era, spec, stat, perk, ability) => ({ id, name, cls, src, era, spec: { id, ...spec } });
const ALL = [
  V('anvil', 'Anvil Mk1', 'Battle tank', 'works', 1, { gear: 'tracked', L: 58, W: 30, shape: 'round', skirts: false, turret: { type: 'round', r: 12, gun: 36, brake: true, num: 11 }, feats: ['hatch', 'vents', 'camo', 'stripe'], camo: true }, [3, 3, 3, 3], 'Stabilised gun: fires on the move at −25% accuracy.', 'Smoke screen (20 s cooldown): hides it and nearby squads.'),
  V('lancer', 'Lancer Light', 'Battle tank', 'works', 1, { gear: 'tracked', L: 46, W: 24, shape: 'round', turret: { type: 'round', r: 9, gun: 26 }, feats: ['hatch', 'vents', 'camo', 'stripe'], camo: true }, [2, 2, 5, 2], 'Quiet engine: spotted at half the range.', 'Sprint: +60% speed for 6 s, then the engine is hot.'),
  V('bulwark', 'Bulwark Heavy', 'Battle tank', 'works', 2, { gear: 'tracked', L: 64, W: 38, shape: 'angular', skirts: true, turret: { type: 'round', r: 14, gun: 38, brake: true, sleeve: true, num: 7 }, feats: ['era', 'hatch', 'vents', 'stripe'] }, [5, 4, 1, 4], 'Reactive plates: the first anti-tank hit does half damage.', 'Brace: cannot move, +40% frontal armour for 12 s.'),
  V('wolf', 'Wolf APC', 'Armoured carrier', 'buy', 1, { gear: 'wheeled', wheels: 3, L: 46, W: 24, shape: 'round', turret: { type: 'none' }, feats: ['hatch', 'ramp', 'camo', 'stripe'], camo: true }, [2, 1, 4, 3], 'Carries 8; troops inside are safe from small arms.', 'Dismount: all troops out in 2 s.'),
  V('badger', 'Badger IFV', 'Armoured carrier', 'buy', 2, { gear: 'tracked', L: 48, W: 28, shape: 'angular', skirts: true, turret: { type: 'round', r: 8, gun: 22 }, feats: ['hatch', 'ramp', 'stripe'] }, [3, 3, 3, 2], 'Autocannon: fights light vehicles; carries 6.', 'Fire from ports: troops shoot out while it moves.'),
  V('marten', 'Marten Light Carrier', 'Armoured carrier', 'buy', 1, { gear: 'wheeled', wheels: 2, L: 38, W: 20, shape: 'round', turret: { type: 'none' }, feats: ['hatch', 'lights', 'stripe'] }, [1, 1, 5, 1], 'Fast; carries 4; cheap.', 'Dash: fast move out of danger.'),
  V('scout', 'Scout Buggy', 'Recon', 'buy', 1, { gear: 'wheeled', wheels: 2, L: 30, W: 16, shape: 'round', turret: { type: 'none' }, feats: ['antenna', 'lights'] }, [0, 1, 5, 1], 'Fast and quiet; sees 25% farther.', 'Flare: reveals an area for 10 s.'),
  V('armcar', 'Armoured Car', 'Recon', 'buy', 2, { gear: 'wheeled', wheels: 2, L: 38, W: 20, shape: 'round', turret: { type: 'round', r: 7, gun: 16 }, feats: ['hatch', 'antenna', 'camo'], camo: true }, [2, 2, 4, 1], 'Light cannon; carries a scout team.', 'Probe: draws fire to mark enemy positions.'),
  V('hammer', 'Hammer SP Gun', 'Artillery', 'buy', 2, { gear: 'tracked', L: 56, W: 30, shape: 'angular', skirts: true, turret: { type: 'round', r: 11, gun: 46, brake: true, sleeve: true }, feats: ['hatch', 'vents', 'stripe'] }, [3, 5, 2, 2], 'Long range; ignores line of sight.', 'Barrage: 6 rounds on a marked area.'),
  V('rainmaker', 'Rainmaker Rockets', 'Artillery', 'arms', 2, { gear: 'wheeled', wheels: 3, L: 54, W: 26, shape: 'round', cab: true, turret: { type: 'launcher', r: 11, gun: 0 }, feats: ['antenna'] }, [1, 5, 3, 1], 'Saturates an area from far away.', 'Salvo: 12 rockets in 5 s (reload 40 s).'),
  V('thump', 'Thump Mortar Carrier', 'Artillery', 'buy', 1, { gear: 'tracked', L: 40, W: 24, shape: 'round', turret: { type: 'mortar', r: 9 }, feats: ['hatch', 'crates'] }, [2, 3, 3, 2], 'Indirect fire from behind cover; cheap.', 'Smoke and illumination rounds.'),
  V('skyguard', 'Skyguard Twin Gun', 'Anti-air', 'buy', 1, { gear: 'tracked', L: 44, W: 26, shape: 'round', turret: { type: 'twin', r: 9, gun: 28, barrels: 2 }, feats: ['hatch'] }, [2, 3, 3, 1], 'Cheap and good against helicopters and low aircraft.', 'Flak burst: area damage at altitude.'),
  V('falconer', 'Falconer Missile AA', 'Anti-air', 'buy', 2, { gear: 'wheeled', wheels: 3, L: 48, W: 24, shape: 'round', cab: true, turret: { type: 'launcher', r: 10, gun: 0 }, feats: ['antenna'] }, [1, 4, 3, 1], 'Long-range missiles; needs radar.', 'Lock: 4 missiles on one aircraft.'),
  V('truck', 'Supply Truck', 'Logistics', 'buy', 1, { gear: 'wheeled', wheels: 3, L: 52, W: 24, shape: 'round', cab: true, feats: ['tarp', 'lights'] }, [0, 0, 3, 3], 'Carries stores to a hub or a squad.', 'Resupply: ammo and rations to everyone nearby.'),
  V('command', 'Command Vehicle', 'Logistics', 'buy', 2, { gear: 'wheeled', wheels: 3, L: 50, W: 24, shape: 'angular', cab: true, feats: ['antenna', 'radar', 'stripe'] }, [1, 0, 3, 2], 'Extends sight and radio range; morale aura.', 'Rally: brings broken squads back.'),
  V('medevac', 'Medevac Ambulance', 'Medical & engineers', 'buy', 1, { gear: 'wheeled', wheels: 3, L: 48, W: 24, shape: 'round', cab: true, hull: '#e8e6dc', feats: ['cross', 'lights'] }, [0, 0, 4, 2], 'Carries 4 wounded to the clinic; keeps them alive.', 'Stabilise: wounded stop bleeding.'),
  V('wren', 'Wren Scout', 'Helicopter', 'works', 1, { L: 30, W: 14, tailL: 22, rotor: 30, canopyL: 11, skids: true }, [0, 1, 5, 1], 'Fast and quiet; sees 40% farther.', 'Flare: reveals an area for 10 s.'),
  V('drover', 'Drover Transport', 'Helicopter', 'works', 1, { L: 52, W: 18, tailL: 30, rotor: 46, canopyL: 10, door: true, skids: true }, [1, 1, 3, 5], 'Carries 8; lands anywhere flat.', 'Fast rope: drops troops without landing.'),
  V('viper', 'Viper Attack', 'Helicopter', 'works', 2, { L: 46, W: 11, tailL: 26, rotor: 42, canopyL: 10, wings: true, pods: true, nose: true }, [2, 4, 4, 0], 'Rockets and a nose gun; strong against vehicles.', 'Rocket run: 12 rockets on a line.'),
  V('talon', 'Talon Gunship', 'Helicopter', 'works', 2, { L: 56, W: 16, tailL: 28, rotor: 48, canopyL: 12, wings: true, pods: true, nose: true, door: true, blades: 5 }, [3, 5, 2, 3], 'Heavy guns and rockets; carries 4.', 'Strafe: a long cannon run on a squad.'),
  V('mercy', 'Mercy Medevac', 'Helicopter', 'works', 1, { L: 50, W: 18, tailL: 30, rotor: 44, canopyL: 10, door: true, cross: true, skids: true, hull: '#e8e6dc' }, [1, 0, 4, 4], 'Carries 4 wounded; flies into fire.', 'Evacuate: wounded reach the clinic in minutes.'),
  V('ox', 'Ox Heavy Lift', 'Helicopter', 'works', 2, { L: 64, W: 20, tandem: true, tailL: 6, rotor: 38, canopyL: 10, door: true, sling: true }, [2, 0, 2, 5], 'Lifts a vehicle or 14 troops.', 'Sling load: carries a tank-sized load.'),
];
/** a vehicle spec by id */
export const SPEC = Object.fromEntries(ALL.map((v) => [v.id, v.spec]));
