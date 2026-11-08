// The future soldiers and their weapons (v0.103.8), ported from the approved mock-up (docs/mockups/src/war/trooper.js, proposal-war-troop-eras.png, proposal-war-troop-loadouts-1.png): the armour
// of eras 3 (Phalanx hardsuit) and 4 (Bastion power armour) and the energy, plasma and launcher weapons of tiers 3 and 4, painted in the game's own idiom (a one-pixel ink outline, lit left,
// shaded right, cached). Browser only; paint, never state.
import { INK, shade, mixc, outlined } from './drawFleet.js';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** a weapon sprite pointing right, ~28x12, from a spec; ballistic, launcher, energy or heavy */
export function gunCanvas(w) {
  const key = 'gun|' + JSON.stringify(w); if (cache.has(key)) return cache.get(key); const [c, g] = mk(48, 24); const R = (x, y, ww, h, col) => { g.fillStyle = col; g.fillRect(8 + x, 12 + y, ww, h); };
  const body = w.body || '#4a4a52', dk = shade(body, -40), hi = shade(body, 40), glow = w.glow; const len = w.len || 18, th = w.th || 3;
  if (w.kind === 'launcher') { R(-4, -4, len + 6, 7, shade('#6a7a3a', -6)); R(-4, -4, len + 6, 1, shade('#6a7a3a', 30)); R(len + 1, -5, 4, 9, dk); if (w.tubes === 2) { R(-4, 2, len + 6, 5, shade('#6a7a3a', -22)); R(len + 1, 1, 4, 7, dk); } if (w.guided) { R(2, -7, 6, 3, '#26262c'); R(3, -6, 4, 1, '#7fe8ff'); } if (glow) { R(len + 4, -3, 2, 5, glow); R(len + 6, -2, 2, 3, mixc(glow, '#ffffff', 0.5)); } R(4, 3, 3, 5, dk); R(-6, -3, 3, 5, dk); }
  else if (w.kind === 'heavy') { R(-6, -3, len + 10, 6, body); R(-6, -3, len + 10, 1, hi); R(-6, 2, len + 10, 1, dk); R(len + 4, -4, 6, 8, dk); if (glow) { R(2, -2, len - 2, 3, glow); R(2, -2, len - 2, 1, mixc(glow, '#ffffff', 0.55)); } R(4, 3, 4, 5, dk); R(len - 4, 3, 3, 4, dk); R(-8, -2, 3, 5, dk); }
  else if (w.kind === 'energy') { R(-5, -2, len + 6, 5, body); R(-5, -2, len + 6, 1, hi); R(-5, 2, len + 6, 1, dk); R(len, -3, 6, 7, dk); if (glow) { R(0, -1, len - 2, 2, glow); R(0, -1, len - 2, 1, mixc(glow, '#ffffff', 0.55)); R(len + 4, -1, 2, 3, glow); } R(2, 3, 3, 5, dk); R(-6, -1, 3, 4, dk); if (w.scope) { R(3, -5, 8, 3, '#26262c'); R(4, -4, 6, 1, glow || '#7fe8ff'); } }
  else { R(-6, -2, 6, 5, shade('#7a5030', 0)); R(-6, -2, 6, 1, '#a07048'); R(0, -2, len, th + 1, body); R(0, -2, len, 1, hi); R(0, th - 1, len, 1, dk); R(len, -1, w.barrel || 6, 2, dk); if (w.brake) R(len + (w.barrel || 6), -2, 2, 4, '#16161c'); R(len - 8, th + 0, 3, 6, dk); if (w.mag) R(3, th + 1, 4, w.mag, dk); if (w.drum) { R(2, th + 1, 8, 8, dk); R(3, th + 2, 6, 6, '#3a3a44'); } if (w.scope) { R(3, -5, w.scope, 3, '#26262c'); R(3, -5, w.scope, 1, '#6a6a78'); R(4, -4, 2, 1, '#7fe8ff'); } if (w.gl) { R(6, 2, 10, 4, '#2a2a30'); R(15, 1, 3, 6, '#16161c'); } if (w.bipod) { R(len + 2, 2, 1, 6, '#2a2a30'); R(len + 5, 2, 1, 6, '#2a2a30'); } if (w.belt) { R(1, 3, 6, 9, '#c8a02a'); R(1, 3, 6, 1, '#e8c04a'); } if (w.sil) R(len + 2, -1, 9, 3, '#2a2a30'); }
  const o = outlined(c); cache.set(key, o); return o;
}
function patternPx(R, pat, x, y, w, h, c1, c2, seed) { if (pat === 'stripes') for (let i = 0; i < h; i += 4) R(x, y + i, w, 1, c2); else if (pat === 'camo') for (let i = 0; i < w * h / 5; i++) R(x + Math.floor(hash(seed, i, 1) * (w - 1)), y + Math.floor(hash(seed, i, 2) * (h - 1)), 2, 2, i % 2 ? c2 : shade(c1, -22)); else if (pat === 'chevron') for (let i = 0; i < h; i += 4) { R(x + Math.floor(w / 2) - 2, y + i, 4, 1, c2); R(x + Math.floor(w / 2) - 3, y + i + 1, 2, 1, c2); R(x + Math.floor(w / 2) + 1, y + i + 1, 2, 1, c2); } else if (pat === 'checks') for (let i = 0; i < w; i += 3) for (let j = 0; j < h; j += 3) if ((i / 3 + j / 3) % 2 === 0) R(x + i, y + j, 2, 2, c2); }
/** an armoured trooper sprite (eras 3 and 4); facing 'right' or 'down' (left = mirrored right), feet at the bottom centre of a 64x80 canvas */
export function armouredCanvas(o) {
  const key = 'arm|' + JSON.stringify({ e: o.era, f: o.facing, c: o.colors, p: o.pattern, i: o.insignia, cr: o.crest, role: o.role, band: o.band, wp: !!o.weapon });
  if (cache.has(key)) return cache.get(key);
  const E = o.era, K = o.colors, S = E === 4 ? 1.0 : 1.0; const W = 80, H = 90; const [c, g] = mk(W, H); const OX = 40, OY = 82; const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(OX + x, OY + y, w, h); };
  const P = K.primary, Q = K.secondary, T = K.trim, V = K.visor, GL = K.glow || V; const side = o.facing === 'right';
  const lit = (col) => shade(col, 34), shd = (col) => shade(col, -34);
  const big = E === 4; const hs = big ? 1.35 : 1; // heavier build
  if (side) {
    // legs and boots
    const lw = big ? 5 : 3, lh = big ? 12 : 8;
    R(-lw - 1, -lh, lw, lh - 2, shd(Q)); R(0, -lh, lw, lh - 2, Q); R(-lw - 1, -lh, 1, lh - 2, lit(Q)); R(-lw - 2, -2, lw + 3, 3, '#26262e'); R(-1, -2, lw + 3, 3, '#1a1a22'); R(-lw - 1, -Math.floor(lh * 0.55), lw + 1, 3, P); R(0, -Math.floor(lh * 0.55), lw + 1, 3, shd(P));
    if (big) { R(-6, -lh - 3, 11, 5, P); R(-6, -lh - 3, 11, 1, lit(P)); }
    // pack
    if (big) { R(-14, -30, 6, 17, shd(Q)); R(-14, -30, 6, 1, lit(Q)); R(-13, -28, 4, 13, '#16161c'); for (let i = 0; i < 4; i++) R(-13, -27 + i * 3, 4, 1, GL); R(-16, -26, 2, 6, '#2a2a30'); R(-13, -34, 2, 5, '#3a3a42'); }
    else { R(-10, -25, 5, 11, shd(Q)); R(-10, -25, 5, 1, lit(Q)); R(-9, -23, 3, 3, '#16161c'); R(-9, -19, 3, 1, GL); R(-8, -29, 1, 5, '#2a2a30'); }
    // torso
    const tt = big ? -32 : -24, tb = big ? -13 : -12; R(-6, tb - 2, 12, 3, '#2a2a32'); R(-8, tt, 16, tb - tt - 2, P); R(-8, tt, 4, tb - tt - 2, lit(P)); R(5, tt + 1, 3, tb - tt - 3, shd(P)); R(-8, tt, 16, 1, lit(P)); R(-6, tt + 3, 8, 2, shd(P));
    patternPx((x, y, w, h, cc) => R(x, y, w, h, cc), o.pattern, -5, tt + 4, 9, tb - tt - 7, P, T, 3);
    R(1, tt + 6, 4, 4, T); R(2, tt + 7, 2, 2, shd(T)); // chest emblem
    if (big) { R(-4, tb - 5, 8, 3, '#16161c'); for (let i = 0; i < 3; i++) R(-3 + i * 3, tb - 5, 2, 3, GL); }
    // head
    const hy = tt - (big ? 11 : 10); R(-6, hy, 12, 12, P); R(-6, hy, 4, 12, lit(P)); R(4, hy + 1, 2, 10, shd(P)); R(-6, hy, 12, 1, lit(P)); R(-5, hy - 1, 10, 1, P); R(-4, hy - 2, 8, 1, lit(P));
    R(0, hy + 4, 6, 4, shd(Q)); R(1, hy + 5, 5, 2, V); R(1, hy + 5, 5, 1, mixc(V, '#ffffff', 0.5)); // visor
    R(-5, hy + 8, 9, 3, shd(P)); R(-2, hy + 10, 5, 2, '#2a2a32'); // jaw guard
    if (o.band) R(-2, hy, 3, 5, o.band);
    if (o.crest === 'crest') { R(-3, hy - 6, 6, 5, T); R(-3, hy - 6, 6, 1, lit(T)); } else if (o.crest === 'antenna') { R(-5, hy - 9, 1, 8, '#3a3a42'); R(-6, hy - 10, 3, 1, GL); } else if (o.crest === 'fin') { R(-5, hy - 4, 9, 3, T); R(-4, hy - 5, 6, 1, T); }
    if (big) { R(2, hy + 4, 3, 2, GL); }
    // shoulder pauldron and arm
    const px = big ? -2 : -1, pw = big ? 11 : 7, ph = big ? 9 : 6; R(px, tt - 3, pw, ph, T === P ? lit(P) : P); R(px, tt - 3, pw, 1, lit(T)); R(px, tt - 3 + ph - 1, pw, 1, shd(P)); R(px + 1, tt - 1, 3, 2, T); patternPx((x, y, w, h, cc) => R(x, y, w, h, cc), o.insignia === 'stripes' ? 'stripes' : 'plain', px + 1, tt - 2, pw - 2, ph - 3, P, T, 5);
    if (o.insignia === 'star') { R(px + 3, tt - 1, 3, 3, T); R(px + 4, tt - 2, 1, 5, T); R(px + 2, tt, 5, 1, T); } else if (o.insignia === 'bar') { R(px + 2, tt - 1, pw - 4, 2, T); } else if (o.insignia === 'wing') { R(px + 1, tt - 1, 2, 3, T); R(px + 3, tt - 2, 2, 3, T); R(px + 5, tt - 1, 2, 3, T); } else if (o.insignia === 'dots') { R(px + 2, tt - 1, 2, 2, T); R(px + 5, tt - 1, 2, 2, T); }
    R(2, tt + 4, big ? 8 : 6, 4, Q); R(2, tt + 4, big ? 8 : 6, 1, lit(Q)); R(big ? 10 : 8, tt + 4, 3, 4, '#c8a888'); // forearm and glove
  } else { // front view
    const lw = big ? 5 : 4, lh = big ? 12 : 8;
    R(-lw - 1, -lh, lw, lh - 2, shd(Q)); R(1, -lh, lw, lh - 2, Q); R(-lw - 2, -2, lw + 2, 3, '#26262e'); R(1, -2, lw + 2, 3, '#1a1a22'); R(-lw - 1, -Math.floor(lh * 0.55), lw, 3, P); R(1, -Math.floor(lh * 0.55), lw, 3, shd(P));
    const tt = big ? -32 : -24, tb = big ? -13 : -12; R(-8, tb - 2, 16, 3, '#2a2a32'); R(-9, tt, 18, tb - tt - 2, P); R(-9, tt, 5, tb - tt - 2, lit(P)); R(5, tt + 1, 4, tb - tt - 3, shd(P)); R(-9, tt, 18, 1, lit(P));
    patternPx((x, y, w, h, cc) => R(x, y, w, h, cc), o.pattern, -4, tt + 4, 8, tb - tt - 7, P, T, 3); R(-2, tt + 5, 4, 5, T); R(-1, tt + 6, 2, 3, shd(T));
    if (big) { R(-5, tb - 6, 10, 4, '#16161c'); for (let i = 0; i < 4; i++) R(-4 + i * 2.5, tb - 6, 2, 4, GL); }
    const hy = tt - (big ? 11 : 10); R(-7, hy, 14, 12, P); R(-7, hy, 5, 12, lit(P)); R(4, hy + 1, 3, 10, shd(P)); R(-7, hy, 14, 1, lit(P)); R(-6, hy - 1, 12, 1, P);
    R(-6, hy + 4, 12, 4, shd(Q)); R(-5, hy + 5, 10, 2, V); R(-5, hy + 5, 10, 1, mixc(V, '#ffffff', 0.5)); R(-4, hy + 9, 8, 3, shd(P)); R(-1, hy + 11, 2, 2, '#2a2a32');
    if (o.band) R(-1, hy, 3, 6, o.band); if (o.crest === 'crest') { R(-2, hy - 6, 4, 5, T); R(-2, hy - 6, 4, 1, lit(T)); } else if (o.crest === 'antenna') { R(-6, hy - 9, 1, 8, '#3a3a42'); R(-7, hy - 10, 3, 1, GL); } else if (o.crest === 'fin') { R(-1, hy - 6, 3, 6, T); }
    if (big) { R(-5, hy + 4, 3, 2, GL); R(2, hy + 4, 3, 2, GL); }
    for (const sx of [-1, 1]) { const pw = big ? 11 : 8, ph = big ? 9 : 6; const px = sx < 0 ? -9 - pw + 2 : 9 - 2; R(px, tt - 3, pw, ph, sx < 0 ? lit(P) : P); R(px, tt - 3, pw, 1, lit(T)); R(px, tt - 3 + ph - 1, pw, 1, shd(P)); if (o.insignia === 'star' && sx > 0) { R(px + 3, tt - 1, 3, 3, T); R(px + 4, tt - 2, 1, 5, T); R(px + 2, tt, 5, 1, T); } else if (o.insignia === 'bar') R(px + 2, tt - 1, pw - 4, 2, T); else if (o.insignia === 'wing' && sx > 0) { R(px + 1, tt - 1, 2, 3, T); R(px + 3, tt - 2, 2, 3, T); R(px + 5, tt - 1, 2, 3, T); } else if (o.insignia === 'dots') { R(px + 2, tt - 1, 2, 2, T); R(px + 5, tt - 1, 2, 2, T); }
      R(sx < 0 ? -14 : 9, tt + 3, 5, big ? 12 : 9, Q); R(sx < 0 ? -14 : 9, tt + 3, 5, 1, lit(Q)); R(sx < 0 ? -13 : 10, tt + (big ? 15 : 12), 3, 3, '#c8a888'); }
  }
  const out = outlined(c); cache.set(key, out); return out;
}
/** Draw a weapon spec (a future weapon's look) from the hand: the gun points right; `ang` turns it, `scale` sizes it. */
export function drawGunSpec(ctx, spec, x = 0, y = 0, ang = 0, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (Math.cos(ang) < 0) ctx.scale(1, -1); const c = gunCanvas(spec); ctx.scale(scale, scale); ctx.drawImage(c, -9, -13); ctx.restore();
}

/** An armoured soldier (era 3 or 4) with his feet at (x, y). o: { era, colors { primary, secondary, trim, visor, glow }, facing, role, band, pattern, insignia, crest, weapon (a gun spec) }. */
export function drawArmoured(ctx, o, x, y, scale = 1) {
  const era = o.era || 3; const facing = o.facing || 'right'; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(16,14,36,.3)'; const sw = era === 4 ? 16 : 10; ctx.fillRect(-sw * scale, -1 * scale, sw * 2 * scale, 3 * scale);
  const c = armouredCanvas({ ...o, era, facing: facing === 'left' ? 'right' : facing === 'up' ? 'down' : facing, weapon: !!o.weapon }); ctx.scale(scale * (facing === 'left' ? -1 : 1), scale); ctx.drawImage(c, -c.width / 2, -(c.height - 7));
  if (o.weapon) { const big = era === 4; const wx = facing === 'down' || facing === 'up' ? 9 : (big ? 9 : 7); const wy = big ? -30 : -17; ctx.save(); ctx.translate(facing === 'down' ? 0 : wx, wy); drawGunSpec(ctx, o.weapon, 0, 0, facing === 'down' || facing === 'up' ? 0.5 : 0, big ? 1.25 : 1); ctx.restore(); }
  ctx.restore();
}

/** The colours of the two armours (the squad's look sets the primary and the glow). */
export const ARMOUR_COLOURS = {
  3: { primary: '#e8eaf0', secondary: '#9aa0ae', trim: '#e8c84a', visor: '#4ad8e8', glow: '#4ad8e8' },
  4: { primary: '#4a5570', secondary: '#2e3446', trim: '#e8a02a', visor: '#ff8a3a', glow: '#ff8a3a' },
};
