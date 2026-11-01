// TARGET ART (mock-up only; nothing here is in the game). War sprites in the game's own idiom: a 1-px ink outline, a lit left flank and a shaded right one,
// painted once into a cached canvas per (look, state) and drawn rotated. Soldiers and aircraft are NOT drawn here: the mocks use the game's real
// drawPerson / drawWeaponSprite / drawAircraft. Everything below is what the war update would add to src/engine/.
export const INK = '#1b1a24';
const cache = new Map();
export const hexRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const shade = (h, k) => { const [r, g, b] = hexRgb(h); const f = (v) => Math.max(0, Math.min(255, Math.round(v + k))); return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
export const mixc = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** ink outline traced round a sprite (4-neighbour dilation of its silhouette) */
export function outlined(src) {
  const [c, g] = mk(src.width + 2, src.height + 2);
  const [s, sg] = mk(src.width, src.height); sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = INK; sg.fillRect(0, 0, src.width, src.height);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(s, dx, dy);
  g.drawImage(src, 1, 1); return c;
}
const silhouette = (c, col = 'rgba(10,8,20,0.34)') => { const [s, g] = mk(c.width, c.height); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return s; };

export const FACTIONS = {
  sund: { hull: '#6c7a8c', hull2: '#55627a', accent: '#e8c84a', glass: '#26384e', track: '#2a2a32', helmet: '#3e4a5e', cloth: '#56657a', legs: '#3c4658', name: 'Sund Army' },
  company: { hull: '#4f6a3e', hull2: '#3c5430', accent: '#f2f0e4', glass: '#26384e', track: '#26262c', helmet: '#3a5030', cloth: '#516b3e', legs: '#3a4a2c', name: 'Your company' },
  ostmark: { hull: '#7a8a6a', hull2: '#5e6e50', accent: '#c83a2a', glass: '#26384e', track: '#2a2a2e', helmet: '#4a5a3e', cloth: '#6a7a54', legs: '#4a5440', name: 'Ostmark Union' },
  varn: { hull: '#a08a5a', hull2: '#85703f', accent: '#b83a2a', glass: '#26384e', track: '#2c2824', helmet: '#7a6a42', cloth: '#9a8456', legs: '#6e5e38', name: 'Varnistan' },
};

// ----------------------------------------------------------------------------------------------------------------- shared painters
function box(R, x, y, w, h, c, k = 2) { R(x + k, y, w - 2 * k, h, c); R(x + 1, y + 1, w - 2, h - 2, c); R(x, y + k, w, h - 2 * k, c); }
/** a lit/shaded plate: lit on the left, shaded on the right, highlight on the top edge */
function plate(R, x, y, w, h, c, k = 2) { box(R, x, y, w, h, c, k); R(x + 1, y + 1, 1, h - 3, shade(c, 38)); R(x + w - 2, y + 2, 1, h - 4, shade(c, -34)); R(x + 2, y, w - 4, 1, shade(c, 26)); R(x + 2, y + h - 1, w - 4, 1, shade(c, -44)); }
function camo(R, x, y, w, h, base, seed, tones) {
  for (let i = 0; i < Math.floor((w * h) / 22); i++) { const px = x + Math.floor(hash(seed, i, 1) * (w - 3)), py = y + Math.floor(hash(seed, i, 2) * (h - 3)); R(px, py, 2 + Math.floor(hash(seed, i, 3) * 4), 2 + Math.floor(hash(seed, i, 4) * 3), tones[Math.floor(hash(seed, i, 5) * tones.length)]); }
}
function rivets(R, x, y, w, c) { for (let i = 0; i < w; i += 4) R(x + i, y, 1, 1, c); }

// ----------------------------------------------------------------------------------------------------------------- tanks (nose up, centred in a 96x112 canvas)
/**
 * look: { faction, kind: 'mbt'|'light', camo: 0|1, number, state: 'ok'|'damaged'|'wreck' }
 * Returns { hull, turret } canvases so the turret can be turned independently of the hull.
 */
export function tankParts(look) {
  const key = `tank|${look.faction}|${look.kind || 'mbt'}|${look.camo || 0}|${look.number || ''}|${look.state || 'ok'}`;
  if (cache.has(key)) return cache.get(key);
  const F = FACTIONS[look.faction] || FACTIONS.sund; const wreck = look.state === 'wreck', dmg = look.state === 'damaged';
  const light = look.kind === 'light'; const HL = light ? 46 : 58, HW = light ? 24 : 30;
  const [hc, hg] = mk(96, 112); const R = (x, y, w, h, c) => { hg.fillStyle = c; hg.fillRect(48 + x, 56 + y, w, h); };
  const base = wreck ? '#2c2a2a' : F.hull, dark = wreck ? '#1c1a1a' : F.hull2;
  // tracks: long dark runs with link ribs and sprockets
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -HW / 2 - 6 : HW / 2 - 1;
    box(R, x0, -HL / 2 - 2, 7, HL + 4, wreck ? '#1a1818' : F.track, 2);
    for (let y = -HL / 2; y < HL / 2 + 2; y += 3) R(x0 + 1, y, 5, 1, wreck ? '#2a2626' : '#4a4a52');
    R(x0 + (sx < 0 ? 0 : 6), -HL / 2 - 1, 1, HL + 2, shade(F.track, sx < 0 ? 22 : -10));
    // road wheel hint and sprocket
    R(x0 + 2, -HL / 2 - 1, 3, 3, '#5a5a62'); R(x0 + 2, HL / 2 - 1, 3, 3, '#5a5a62');
    if (dmg && sx > 0) { R(x0 + 1, 6, 5, 7, '#18161c'); R(x0 + 2, 8, 3, 2, '#7a3a1a'); } // a thrown link and scorch
  }
  // side skirts
  plate(R, -HW / 2 - 1, -HL / 2 + 6, 3, HL - 12, shade(base, -14), 1); plate(R, HW / 2 - 2, -HL / 2 + 6, 3, HL - 12, shade(base, -22), 1);
  // hull: glacis (front slope), top plate, engine deck
  plate(R, -HW / 2 + 1, -HL / 2, HW - 2, HL, base, 4);
  R(-HW / 2 + 4, -HL / 2 + 1, HW - 8, 6, shade(base, 30)); R(-HW / 2 + 3, -HL / 2 + 7, HW - 6, 1, shade(base, -40)); // glacis
  R(-3, -HL / 2 + 8, 6, 3, shade(base, -30)); R(-2, -HL / 2 + 9, 4, 1, '#1b1a24'); // driver's hatch
  for (let y = HL / 2 - 16; y < HL / 2 - 3; y += 2) R(-HW / 2 + 5, y, HW - 10, 1, shade(base, -34)); // engine louvres
  R(-HW / 2 + 3, HL / 2 - 4, HW - 6, 2, shade(base, -46)); // rear plate
  if (!wreck) { camo(R, -HW / 2 + 2, -HL / 2 + 9, HW - 4, HL - 24, base, look.camo ? 7 : 0, look.camo ? [shade(base, -28), shade(base, 22), F.hull2] : []); if (look.camo === 2) for (let y = -HL / 2 + 10; y < HL / 2 - 10; y += 6) R(-HW / 2 + 2, y, HW - 4, 2, shade(base, -24)); }
  if (!wreck) { R(-HW / 2 + 4, HL / 2 - 8, 2, 4, F.accent); R(HW / 2 - 6, HL / 2 - 8, 2, 4, F.accent); } // marking tabs
  if (dmg) { R(-6, 4, 7, 5, '#1c1a1a'); R(-4, 5, 4, 2, '#6a3010'); R(HW / 2 - 8, -8, 4, 3, '#1c1a1a'); }
  if (wreck) { R(-8, -6, 14, 10, '#121010'); R(-4, -2, 6, 4, '#8a3a10'); R(2, 12, 7, 5, '#1a1212'); }
  const hullC = outlined(hc);
  // turret on its own canvas, 80x80, gun pointing up, turret centre at (40,40)
  const [tc, tg] = mk(80, 100); const T = (x, y, w, h, c) => { tg.fillStyle = c; tg.fillRect(40 + x, 50 + y, w, h); };
  const tr = light ? 9 : 12;
  if (wreck) {
    T(-tr + 2, -tr + 2, tr * 2 - 4, tr * 2 - 4, '#201e1e'); T(-4, -4, 8, 8, '#0e0c0c'); T(-3, -tr - 8, 3, 8, '#282626');
  } else {
    // gun: barrel, mantlet, muzzle brake
    const gl = light ? 26 : 36; T(-1, -tr - gl + 2, 3, gl, shade(F.hull2, -30)); T(-1, -tr - gl + 2, 1, gl, shade(F.hull2, 6)); T(-2, -tr - gl, 5, 4, shade(F.hull2, -40)); T(-1, -tr - gl + 1, 3, 1, '#0e0c10');
    // turret body: an octagon of plates
    plate(T, -tr, -tr + 2, tr * 2, tr * 2 - 2, F.hull, 4); T(-tr + 3, -tr + 1, tr * 2 - 6, 3, shade(F.hull, 34));
    T(-5, -tr - 1, 10, 5, shade(F.hull2, -12)); T(-4, -tr, 8, 1, shade(F.hull2, 14)); // mantlet
    camo(T, -tr + 2, -tr + 4, tr * 2 - 4, tr * 2 - 5, F.hull, look.camo ? 11 : 0, look.camo ? [shade(F.hull, -28), shade(F.hull, 22)] : []);
    T(-tr + 3, 2, 5, 5, '#1c1c24'); T(-tr + 4, 3, 3, 3, '#2c2c36'); // loader's hatch
    T(3, 3, 6, 6, shade(F.hull, -26)); T(4, 4, 4, 4, '#0e0c10'); T(5, 5, 2, 2, F.glass); // commander's cupola
    T(-2, tr - 3, 4, 2, shade(F.hull, -40)); // bustle
    for (let i = 0; i < 3; i++) { T(-tr - 2, -2 + i * 3, 2, 2, '#24242c'); T(tr, -2 + i * 3, 2, 2, '#24242c'); } // smoke launchers
    T(tr + 1, tr - 6, 1, 14, '#3a3a42'); // aerial
    if (look.number) { tg.save(); tg.fillStyle = F.accent; tg.font = 'bold 8px monospace'; tg.textAlign = 'center'; tg.fillText(String(look.number), 40 - 3, 50 + 9); tg.restore(); }
    T(-tr + 2, tr - 5, tr * 2 - 4, 1, F.accent);
    if (dmg) { T(-6, -tr + 6, 8, 5, '#1c1a1a'); T(-5, -tr + 7, 4, 2, '#7a3a14'); }
  }
  const out = { hull: hullC, turret: outlined(tc), gunLen: light ? 40 : 52 };
  cache.set(key, out); return out;
}
/** draw a tank: x,y centre; heading radians (0 = nose up); turret: absolute radians relative to the hull */
export function drawTank(ctx, look, x, y, heading, turretRel = 0, opts = {}) {
  const P = tankParts(look); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y));
  const sc = opts.scale || 1; if (sc !== 1) ctx.scale(sc, sc);
  ctx.save(); ctx.rotate(heading); ctx.globalAlpha = 0.34; ctx.drawImage(silhouette(P.hull), -P.hull.width / 2 + 4, -P.hull.height / 2 + 4); ctx.globalAlpha = 1;
  ctx.drawImage(P.hull, -P.hull.width / 2, -P.hull.height / 2);
  ctx.save(); ctx.rotate(turretRel); ctx.drawImage(P.turret, -P.turret.width / 2, -P.turret.height / 2 + 0); ctx.restore(); ctx.restore(); ctx.restore();
}

// ----------------------------------------------------------------------------------------------------------------- other vehicles
/** kinds: apc, recon, spg (self-propelled gun), aa, truck, medevac. nose up, 80x104 canvas */
export function vehicleCanvas(look) {
  const key = `veh|${look.faction}|${look.kind}|${look.state || 'ok'}`; if (cache.has(key)) return cache.get(key);
  const F = FACTIONS[look.faction] || FACTIONS.sund; const wreck = look.state === 'wreck', dmg = look.state === 'damaged';
  const [c, g] = mk(80, 104); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(40 + x, 52 + y, w, h); };
  const base = wreck ? '#2a2828' : look.kind === 'medevac' ? '#e8e6dc' : F.hull;
  const wheel = (x, y) => { R(x, y, 4, 8, '#16161c'); R(x + 1, y + 1, 1, 6, '#3a3a44'); };
  if (look.kind === 'apc') {
    for (const sx of [-1, 1]) { const x0 = sx < 0 ? -15 : 11; box(R, x0, -26, 5, 52, wreck ? '#1a1818' : F.track, 2); for (let y = -24; y < 24; y += 3) R(x0 + 1, y, 3, 1, '#4a4a52'); }
    plate(R, -12, -24, 24, 48, base, 4); R(-9, -23, 18, 6, shade(base, 28)); R(-7, 4, 14, 14, shade(base, -10)); R(-6, 6, 12, 1, shade(base, -34));
    for (let y = 14; y < 22; y += 2) R(-8, y, 16, 1, shade(base, -32)); R(-5, 20, 10, 2, shade(base, -44)); // ramp
    if (!wreck) { plate(R, -6, -12, 12, 14, F.hull2, 2); R(-1, -26, 2, 16, '#2a2a30'); R(-2, -27, 4, 2, '#1c1c22'); R(-3, -6, 3, 3, F.glass); camo(R, -10, -22, 20, 40, base, 3, [shade(base, -26), shade(base, 18)]); R(-9, 9, 2, 2, F.accent); }
    else { R(-8, -8, 14, 12, '#100e0e'); R(-3, -3, 5, 4, '#8a3a10'); }
  } else if (look.kind === 'recon') {
    wheel(-14, -20); wheel(10, -20); wheel(-14, 10); wheel(10, 10);
    plate(R, -9, -24, 18, 46, base, 3); R(-7, -22, 14, 5, shade(base, 24)); R(-6, -8, 12, 12, F.glass); R(-5, -7, 4, 10, shade(F.glass, 30));
    if (!wreck) { R(-1, -28, 2, 12, '#202026'); R(-5, 6, 10, 10, shade(base, -22)); R(-4, 7, 8, 8, '#3a3a2a'); R(-8, -2, 2, 6, '#2a2a30'); }
  } else if (look.kind === 'spg') {
    for (const sx of [-1, 1]) { const x0 = sx < 0 ? -17 : 12; box(R, x0, -28, 6, 58, wreck ? '#1a1818' : F.track, 2); for (let y = -26; y < 28; y += 3) R(x0 + 1, y, 4, 1, '#4a4a52'); }
    plate(R, -13, -26, 26, 54, base, 4); R(-10, -25, 20, 5, shade(base, 28));
    if (!wreck) { plate(R, -11, -8, 22, 28, F.hull2, 3); R(-2, -58 + 20, 4, 54, shade(F.hull2, -30)); R(-2, -58 + 20, 1, 54, shade(F.hull2, 4)); R(-3, -60 + 20, 6, 5, shade(F.hull2, -40)); R(-4, -26, 8, 3, '#16161c'); R(-8, 14, 16, 3, shade(F.hull2, -30)); R(8, 10, 4, 8, '#2a2a30'); R(-9, -4, 3, 3, F.accent); }
    else { R(-9, -2, 18, 16, '#100e0e'); R(-4, 2, 7, 5, '#8a3a10'); }
  } else if (look.kind === 'aa') {
    for (const sx of [-1, 1]) { const x0 = sx < 0 ? -15 : 11; box(R, x0, -24, 5, 50, wreck ? '#1a1818' : F.track, 2); for (let y = -22; y < 24; y += 3) R(x0 + 1, y, 3, 1, '#4a4a52'); }
    plate(R, -12, -22, 24, 46, base, 4);
    if (!wreck) { plate(R, -9, -9, 18, 18, F.hull2, 3); R(-6, -34, 2, 24, '#2a2a30'); R(4, -34, 2, 24, '#2a2a30'); R(-7, -35, 4, 3, '#16161c'); R(3, -35, 4, 3, '#16161c'); R(-2, -2, 4, 4, '#16161c');
      // radar dish at the back
      g.fillStyle = shade(F.hull2, 20); g.beginPath(); g.ellipse(40, 52 + 14, 9, 5, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); R(-1, 10, 2, 8, '#2a2a30'); }
    else R(-8, -6, 14, 12, '#100e0e');
  } else { // truck / medevac
    wheel(-15, -26); wheel(11, -26); wheel(-15, 4); wheel(11, 4); wheel(-15, 16); wheel(11, 16);
    plate(R, -12, -34, 24, 14, wreck ? '#2a2828' : look.kind === 'medevac' ? '#f0eee4' : F.hull, 3); R(-9, -32, 18, 5, F.glass); R(-8, -31, 5, 3, shade(F.glass, 34));
    if (!wreck) { plate(R, -12, -18, 24, 44, look.kind === 'medevac' ? '#f0eee4' : shade(F.hull, -6), 2); for (let y = -16; y < 24; y += 5) R(-11, y, 22, 1, shade(look.kind === 'medevac' ? '#f0eee4' : F.hull, -22)); }
    else R(-8, -10, 16, 22, '#100e0e');
    if (look.kind === 'medevac' && !wreck) { R(-2, -2, 4, 12, '#c82a2a'); R(-6, 2, 12, 4, '#c82a2a'); R(-10, -20, 20, 2, '#c82a2a'); }
  }
  if (dmg) { R(-6, -2, 6, 5, '#1a1818'); R(-5, -1, 3, 2, '#7a3a14'); }
  const o = outlined(c); cache.set(key, o); return o;
}
export function drawVehicle(ctx, look, x, y, heading, opts = {}) {
  const c = vehicleCanvas(look); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); const sc = opts.scale || 1; if (sc !== 1) ctx.scale(sc, sc); ctx.rotate(heading);
  ctx.globalAlpha = 0.34; ctx.drawImage(silhouette(c), -c.width / 2 + 4, -c.height / 2 + 4); ctx.globalAlpha = 1; ctx.drawImage(c, -c.width / 2, -c.height / 2); ctx.restore();
}

// ----------------------------------------------------------------------------------------------------------------- helicopters (nose up; rotor drawn live so it can spin)
/** kinds: scout, transport, attack. */
export function heliBody(look) {
  const key = `heli|${look.faction}|${look.kind}`; if (cache.has(key)) return cache.get(key);
  const F = FACTIONS[look.faction] || FACTIONS.sund; const [c, g] = mk(120, 140); const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(60 + x, 70 + y, w, h); };
  const base = F.hull;
  if (look.kind === 'attack') {
    R(-1, 14, 2, 36, shade(base, -40)); box(R, -1, 40, 2, 10, shade(base, -30), 0); R(-5, 44, 10, 2, shade(base, -20)); R(-1, 38, 2, 14, base); // tail boom + fin
    R(-9, 40, 18, 3, shade(base, -10)); // tail plane
    for (const sx of [-1, 1]) { R(sx * 13 - 5, -4, 10, 9, shade(base, -16)); R(sx * 13 - 1, 5, 2, 6, '#16161c'); for (let i = 0; i < 4; i++) R(sx * 13 - 4 + i * 2, 11, 1, 3, '#e8903a'); } // stub wings with rocket pods
    plate(R, -7, -24, 14, 40, base, 4); R(-4, -24, 8, 11, F.glass); R(-3, -23, 3, 7, shade(F.glass, 44)); R(-3, -12, 6, 5, shade(F.glass, -8)); R(-2, -30, 4, 8, '#26262c'); R(-1, -33, 2, 4, '#16161c'); // nose gun
    R(-5, 2, 10, 10, shade(base, -16)); R(-3, 4, 6, 6, '#2a2a32'); R(-2, 15, 4, 6, shade(base, -30)); camoPatch(R, base);
    R(-9, 12, 3, 12, '#1c1c22'); R(6, 12, 3, 12, '#1c1c22'); // skids
  } else if (look.kind === 'transport') {
    R(-1, 18, 2, 40, shade(base, -34)); R(-5, 54, 10, 3, shade(base, -20)); R(-1, 46, 2, 12, base);
    plate(R, -10, -28, 20, 54, base, 5); R(-7, -28, 14, 10, F.glass); R(-6, -27, 4, 6, shade(F.glass, 44)); R(-6, -16, 12, 2, shade(base, -34));
    R(10, -6, 3, 16, '#16161c'); R(-13, -6, 3, 16, '#2a2a32'); R(-9, -2, 4, 10, '#16161c'); // sliding door open, seats
    R(-6, 8, 12, 14, shade(base, -14)); R(-4, 10, 8, 10, '#2a2a30'); R(-9, 20, 2, 5, F.accent); R(7, 20, 2, 5, F.accent);
    R(-13, -22, 2, 40, '#1c1c22'); R(11, -22, 2, 40, '#1c1c22');
  } else {
    R(-1, 8, 2, 28, shade(base, -34)); R(-4, 32, 8, 2, shade(base, -20)); R(-1, 26, 2, 10, base);
    plate(R, -8, -16, 16, 28, base, 6); R(-6, -16, 12, 11, F.glass); R(-5, -15, 4, 7, shade(F.glass, 46)); R(-3, 2, 6, 6, shade(base, -18));
    R(-11, 2, 2, 12, '#1c1c22'); R(9, 2, 2, 12, '#1c1c22');
  }
  const o = outlined(c); cache.set(key, o); return o;
  function camoPatch(R2, b) { R2(-4, -6, 5, 4, shade(b, -26)); R2(0, 6, 6, 3, shade(b, 20)); }
}
export function drawHeli(ctx, look, x, y, heading, opts = {}) {
  const b = heliBody(look); const alt = opts.altitude ?? 24; const sc = opts.scale || 1; const R0 = look.kind === 'scout' ? 32 : look.kind === 'transport' ? 46 : 42;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); if (sc !== 1) ctx.scale(sc, sc);
  // ground shadow: the body and the rotor disc, offset down-right by altitude
  ctx.save(); ctx.translate(alt * 0.55, alt * 0.9); ctx.rotate(heading); ctx.globalAlpha = 0.3; ctx.drawImage(silhouette(b), -b.width / 2, -b.height / 2);
  ctx.fillStyle = 'rgba(10,8,20,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, R0, R0, 0, 0, 7); ctx.fill(); ctx.restore();
  // the body, lifted
  ctx.save(); ctx.translate(0, -alt * 0.35); ctx.rotate(heading); ctx.drawImage(b, -b.width / 2, -b.height / 2);
  // main rotor: a soft disc, blades as streaks, a hub
  const ph = opts.phase ?? 0.6; ctx.fillStyle = 'rgba(210,214,222,.16)'; ctx.beginPath(); ctx.arc(0, 0, R0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(30,30,38,.55)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = ph + (i * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(240,240,248,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const a = ph + 0.18 + (i * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R0 * 0.95, Math.sin(a) * R0 * 0.95); ctx.stroke(); }
  ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#5a5a64'; ctx.fillRect(-1, -1, 2, 2);
  // tail rotor
  const tail = look.kind === 'scout' ? 36 : look.kind === 'transport' ? 56 : 52; ctx.fillStyle = 'rgba(210,214,222,.2)'; ctx.beginPath(); ctx.arc(0, tail, 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(30,30,38,.6)'; ctx.beginPath(); ctx.moveTo(-7, tail - 2); ctx.lineTo(7, tail + 2); ctx.stroke();
  ctx.restore(); ctx.restore();
}

// ----------------------------------------------------------------------------------------------------------------- buildings with roofs, in four states
/**
 * A roofed building (target tactical look: roofs from above, an oblique front face; a cutaway when garrisoned or selected).
 * b: { w, h (px), kind: 'house'|'row'|'warehouse'|'factory'|'flats'|'shop', seed, state: 0 intact | 1 damaged | 2 breached | 3 rubble, cut: bool, wall, roof }
 */
export function buildingCanvas(b) {
  const key = `bld|${b.kind}|${b.w}|${b.h}|${b.seed}|${b.state}|${b.cut ? 1 : 0}|${b.wall}|${b.roof}`; if (cache.has(key)) return cache.get(key);
  const W = b.w, H = b.h, FACE = 18; const [c, g] = mk(W + 30, H + 40); const ox = 8, oy = 10; const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); };
  const wall = b.wall || '#cfc3ab', roof = b.roof || '#9a4a3a'; const st = b.state | 0; const bodyH = H - FACE;
  if (st === 3) { // rubble: a ring of broken wall, heaps of brick and beams, scorched ground, dust
    R(-2, 2, W + 4, H - 2, '#46403a'); for (let i = 0; i < Math.floor(W * H / 60); i++) { const x = Math.floor(hash(b.seed, i, 1) * (W - 8)), y = 6 + Math.floor(hash(b.seed, i, 2) * (H - 14)); const cc = ['#8a7a68', '#6a5c4c', '#a89a84', '#4a4038', '#b8593a'][Math.floor(hash(b.seed, i, 3) * 5)]; R(x, y, 4 + Math.floor(hash(b.seed, i, 4) * 8), 3 + Math.floor(hash(b.seed, i, 5) * 5), cc); }
    for (let i = 0; i < 9; i++) { const x = Math.floor(hash(b.seed, i, 9) * (W - 10)), y = 8 + Math.floor(hash(b.seed, i, 8) * (H - 16)); R(x, y, 10 + Math.floor(hash(b.seed, i, 7) * 10), 2, '#3a2a1a'); } // beams
    for (const [x, y, w, h] of [[0, H - 14, W * 0.45, 12], [W * 0.62, H - 10, W * 0.38, 8], [0, 4, 8, H * 0.4], [W - 8, 6, 8, H * 0.35]]) { R(x, y, w, h, '#9a8a74'); R(x, y, w, 2, '#b8a88e'); R(x, y + h - 2, w, 2, '#5a4c3e'); }
    R(W * 0.3, H * 0.25, 18, 12, '#2a2420'); R(W * 0.34, H * 0.28, 10, 6, '#161210'); // a scorch pit
    const o = outlined(c); cache.set(key, o); return o;
  }
  // front face (south): the wall, windows, door
  R(0, bodyH, W, FACE, wall); R(0, bodyH, W, 2, shade(wall, 26)); R(0, bodyH + FACE - 3, W, 3, shade(wall, -44)); R(0, bodyH, 2, FACE, shade(wall, 18)); R(W - 2, bodyH, 2, FACE, shade(wall, -30));
  const wins = Math.max(2, Math.floor(W / 20));
  for (let i = 0; i < wins; i++) { const wx = 8 + Math.floor(((W - 16) / wins) * i) + 2; const broken = st >= 1 && hash(b.seed, i, 11) > 0.45; R(wx, bodyH + 4, 8, 8, shade(wall, -62)); R(wx + 1, bodyH + 5, 6, 6, broken ? '#161218' : '#35506a'); if (!broken) R(wx + 1, bodyH + 5, 2, 3, '#86b0cc'); else { R(wx + 1, bodyH + 5, 6, 1, '#7a6a52'); R(wx + 4, bodyH + 8, 3, 3, '#0e0c10'); } R(wx - 1, bodyH + 12, 10, 1, shade(wall, -26)); }
  R(Math.floor(W / 2) - 4, bodyH + 6, 8, 12, '#4a3626'); R(Math.floor(W / 2) - 3, bodyH + 7, 6, 11, '#6a4a32'); R(Math.floor(W / 2) + 1, bodyH + 12, 1, 1, '#d8b04a');
  // the roof (top face)
  const kind = b.kind;
  const roofBase = kind === 'warehouse' ? '#8a929a' : kind === 'factory' ? '#7a8088' : kind === 'flats' ? '#6e6a66' : roof;
  R(0, 0, W, bodyH, shade(roofBase, -26)); R(1, 1, W - 2, bodyH - 2, roofBase);
  if (kind === 'house' || kind === 'row' || kind === 'shop') { // pitched tiles: rows, a ridge, a chimney
    for (let y = 2; y < bodyH - 2; y += 4) { R(2, y, W - 4, 1, shade(roofBase, -22)); for (let x = 2 + ((y / 4) % 2) * 3; x < W - 3; x += 6) R(x, y + 1, 1, 3, shade(roofBase, -14)); R(2, y + 2, W - 4, 1, shade(roofBase, 10)); }
    R(0, Math.floor(bodyH / 2) - 1, W, 3, shade(roofBase, 30)); R(0, Math.floor(bodyH / 2) + 2, W, 1, shade(roofBase, -40)); R(W - 14, 6, 8, 9, '#6a5a50'); R(W - 13, 7, 6, 3, '#1c1814'); R(W - 14, 6, 8, 1, '#8a7a6a');
  } else if (kind === 'warehouse') { // corrugated sheets, skylights, a vent
    for (let x = 3; x < W - 3; x += 5) { R(x, 2, 1, bodyH - 4, shade(roofBase, 24)); R(x + 2, 2, 1, bodyH - 4, shade(roofBase, -22)); }
    for (let i = 0; i < 3; i++) { R(10 + i * Math.floor((W - 24) / 3), 8, 14, 10, '#3a5068'); R(11 + i * Math.floor((W - 24) / 3), 9, 5, 4, '#7aa8c8'); } R(W - 16, bodyH - 14, 8, 8, '#4a4e54'); R(W - 15, bodyH - 13, 6, 6, '#26282c');
  } else if (kind === 'factory') { // sawtooth roof and a chimney
    for (let x = 2; x < W - 2; x += 14) { R(x, 2, 8, bodyH - 4, shade(roofBase, 22)); R(x + 8, 2, 6, bodyH - 4, shade(roofBase, -18)); R(x, 2, 8, 2, '#4a5a68'); }
    R(W - 20, 4, 12, 12, '#7a5a4a'); R(W - 18, 6, 8, 8, '#2a1e18'); R(W - 20, 4, 12, 2, '#9a7a68');
  } else { // flat roof with units
    for (let i = 0; i < 4; i++) { R(6 + i * Math.floor((W - 16) / 4), 8, 12, 10, '#9a9aa0'); R(8 + i * Math.floor((W - 16) / 4), 10, 8, 6, '#5a5a62'); } R(4, bodyH - 10, W - 8, 1, shade(roofBase, -26)); R(W - 14, 4, 10, 10, '#8a8a90'); R(W - 12, 6, 6, 6, '#3a3a42');
  }
  // damage
  const hole = (x, y, w, h, deep) => { R(x, y, w, h, '#161218'); R(x + 1, y + 1, w - 2, h - 2, deep ? '#0a080c' : '#2a2022'); for (let i = 0; i < w; i += 3) R(x + i, y - 1, 2, 3, '#6a4a30'); for (let i = 0; i < h; i += 4) R(x - 1, y + i, 3, 2, '#5a3a24'); R(x + 2, y + h - 3, w - 4, 2, '#8a3a10'); };
  if (st === 1) { hole(Math.floor(W * 0.3), 6, 16, 11, false); R(Math.floor(W * 0.3) - 4, 4, 8, 4, '#2a2222'); for (let i = 0; i < 12; i++) R(Math.floor(hash(b.seed, i, 21) * W), Math.floor(hash(b.seed, i, 22) * bodyH), 2, 2, '#2a2420'); }
  if (st === 2) { hole(Math.floor(W * 0.1), 4, Math.floor(W * 0.55), bodyH - 8, true); R(Math.floor(W * 0.1) + 6, 8, 6, bodyH - 16, '#8a4a1a'); R(Math.floor(W * 0.1) + 14, 10, 4, 8, '#e0802a'); R(W - 24, 4, 20, 8, '#2a2220'); for (let i = 0; i < 18; i++) R(Math.floor(hash(b.seed, i, 31) * W), Math.floor(hash(b.seed, i, 32) * (bodyH + FACE)), 3, 3, i % 2 ? '#3a302a' : '#8a7a68'); R(Math.floor(W * 0.5), bodyH - 1, 28, 6, '#6a5a4a'); }
  if (b.cut && st < 3) { // cutaway: the roof's front half is lifted away to show the room and the squad inside
    const cutY = Math.floor(bodyH * 0.45); g.save(); g.beginPath(); g.rect(ox + 1, oy + cutY, W - 2, bodyH - cutY - 1); g.clip(); g.clearRect(ox, oy, W, bodyH); g.restore();
    R(2, cutY, W - 4, bodyH - cutY - 1, '#b98a5e'); for (let x = 2; x < W - 2; x += 8) R(x, cutY, 1, bodyH - cutY - 1, '#a67a52'); R(2, cutY, W - 4, 3, 'rgba(10,8,20,.5)'); R(W - 24, cutY + 6, 16, 6, '#6a4a30'); R(6, cutY + 5, 10, 8, '#8a7a5a');
    R(0, cutY - 2, W, 2, shade(roofBase, -40));
  }
  const o = outlined(c); cache.set(key, o); return o;
}
export function drawBuilding(ctx, b, x, y, opts = {}) {
  const c = buildingCanvas(b); ctx.save(); ctx.imageSmoothingEnabled = false;
  // street shadow to the right and below
  ctx.fillStyle = 'rgba(10,8,20,.26)'; ctx.fillRect(Math.round(x) + b.w + 6, Math.round(y) + 8, 10, b.h - 4); ctx.fillRect(Math.round(x) + 8, Math.round(y) + b.h + 6, b.w, 8);
  ctx.drawImage(c, Math.round(x) - 8, Math.round(y) - 10); ctx.restore();
}

// ----------------------------------------------------------------------------------------------------------------- props and effects
export function drawTree(ctx, x, y, s = 1, seed = 0, tone = '#3f7a48') {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(10,8,20,.28)'; ctx.beginPath(); ctx.ellipse(8, 8, 17, 8, 0, 0, 7); ctx.fill();
  const blob = (cx, cy, r, c) => { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); };
  ctx.fillStyle = '#4a3220'; ctx.fillRect(-1, 0, 4, 9);
  blob(-6, -4, 8, shade(tone, -26)); blob(8, -3, 9, shade(tone, -18)); blob(0, -12, 11, tone); blob(-3, -14, 6, shade(tone, 24)); blob(7, -10, 5, shade(tone, 12));
  for (let i = 0; i < 9; i++) { ctx.fillStyle = shade(tone, hash(seed, i) > 0.5 ? 36 : -40); ctx.fillRect(-12 + hash(seed, i, 1) * 24, -22 + hash(seed, i, 2) * 20, 2, 2); }
  ctx.restore();
}
export function drawSandbags(ctx, x, y, w, h = 8) { for (let i = 0; i < w; i += 8) for (let r = 0; r < Math.ceil(h / 5); r++) { const cx = x + i + (r % 2) * 4, cy = y + r * 5; ctx.fillStyle = INK; ctx.fillRect(cx - 1, cy - 1, 11, 7); ctx.fillStyle = r ? '#a89260' : '#bba46c'; ctx.fillRect(cx, cy, 9, 5); ctx.fillStyle = '#d6c488'; ctx.fillRect(cx + 1, cy + 1, 5, 1); ctx.fillStyle = '#7a6a42'; ctx.fillRect(cx, cy + 4, 9, 1); } }
export function drawCrater(ctx, x, y, r = 12, seed = 0) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(40,30,22,.5)'; ctx.beginPath(); ctx.ellipse(0, 0, r + 6, r * 0.7 + 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1e16'; ctx.beginPath(); ctx.ellipse(0, 1, r, r * 0.62, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.ellipse(1, 2, r * 0.6, r * 0.38, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(120,96,70,.7)'; for (let i = 0; i < 10; i++) ctx.fillRect(Math.cos(i * 0.9 + seed) * (r + 4), Math.sin(i * 0.9 + seed) * (r * 0.7 + 3), 3, 2); ctx.restore(); }
export function drawSmoke(ctx, x, y, h = 90, seed = 0, dark = 1) { for (let i = 0; i < 14; i++) { const t = i / 13, r = 7 + t * 22, cx = x + Math.sin(t * 5 + seed) * 10 * t + t * 22, cy = y - t * h; ctx.fillStyle = `rgba(${Math.round(40 + 60 * t)},${Math.round(38 + 58 * t)},${Math.round(44 + 56 * t)},${(0.62 * dark * (1 - t * 0.72)).toFixed(2)})`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); } }
export function drawFire(ctx, x, y, s = 1, seed = 0) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const g = ctx.createRadialGradient(0, -6, 2, 0, -6, 26); g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 26, 0, 7); ctx.fill(); for (let i = 0; i < 6; i++) { const fx = (hash(seed, i) - 0.5) * 14, fh = 8 + hash(seed, i, 2) * 16; ctx.fillStyle = '#e0501a'; ctx.beginPath(); ctx.moveTo(fx - 4, 0); ctx.quadraticCurveTo(fx, -fh * 0.7, fx + 1, -fh); ctx.quadraticCurveTo(fx + 3, -fh * 0.4, fx + 5, 0); ctx.fill(); ctx.fillStyle = '#ffb83a'; ctx.beginPath(); ctx.moveTo(fx - 2, 0); ctx.quadraticCurveTo(fx, -fh * 0.5, fx + 1, -fh * 0.65); ctx.quadraticCurveTo(fx + 2, -fh * 0.3, fx + 3, 0); ctx.fill(); } ctx.restore(); }
export function drawExplosion(ctx, x, y, r = 30, seed = 0) { ctx.save(); ctx.translate(x, y); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.8); g.addColorStop(0, 'rgba(255,240,180,.9)'); g.addColorStop(0.3, 'rgba(255,150,40,.55)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, 7); ctx.fill(); for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + seed, d = r * (0.5 + hash(seed, i) * 0.7); ctx.fillStyle = i % 2 ? '#ffb83a' : '#e0501a'; ctx.beginPath(); ctx.arc(Math.cos(a) * d * 0.6, Math.sin(a) * d * 0.5 - 6, r * 0.3 + hash(seed, i, 3) * 8, 0, 7); ctx.fill(); } ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(0, -4, r * 0.35, 0, 7); ctx.fill(); ctx.restore(); }
export function tracer(ctx, x0, y0, x1, y1, col = '#ffe08a') { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,224,138,.25)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); }
export function muzzleFlash(ctx, x, y, a, s = 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10 * s, -3 * s); ctx.lineTo(16 * s, 0); ctx.lineTo(10 * s, 3 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6 * s, -2 * s); ctx.lineTo(10 * s, 0); ctx.lineTo(6 * s, 2 * s); ctx.closePath(); ctx.fill(); ctx.restore(); }
export function ring(ctx, x, y, rx, ry, col, w = 2, dash = null) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.stroke(); ctx.restore(); }
export function hpBar(ctx, x, y, w, hp, morale) { ctx.fillStyle = INK; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 7); ctx.fillStyle = '#2a2a34'; ctx.fillRect(x - w / 2, y, w, 3); ctx.fillStyle = hp > 0.6 ? '#5fe08a' : hp > 0.3 ? '#f2c14e' : '#ff6a5a'; ctx.fillRect(x - w / 2, y, w * hp, 3); ctx.fillStyle = '#6ab0ff'; ctx.fillRect(x - w / 2, y + 3, w * morale, 2); }
export { hash };
