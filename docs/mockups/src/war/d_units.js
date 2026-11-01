// TARGET ART (mock-up only). High-detail infantry for the close camera: about 66 px tall (the game's current people are about 24), three facings
// (front, back, side; left is the mirrored side), poses (stand/aim, run, crouch, prone, dead), role gear, camouflage patterns and per-part shading.
// Sprites are painted once per (look, pose, view) and cached.
import { INK, hash, shade, mix, rgba, mk, rng, R, outline, lit, blob, ell } from './d_util.js';

export const SKIN = ['#e8bd96', '#d49c74', '#a8734e', '#7a4f33', '#f0cfae'];
export const PALETTES = {
  company: { cloth: '#566b3e', cloth2: '#3e4f2c', vest: '#46523a', helmet: '#4a5c38', gear: '#6a5a3c', accent: '#e8e0c8', pat: ['#6a7a46', '#3a4a2c', '#8a7a52'] },
  ostmark: { cloth: '#6a7a58', cloth2: '#4a5a3e', vest: '#58664a', helmet: '#5a6a4a', gear: '#7a6a4a', accent: '#c83a2a', pat: ['#7a8a62', '#4a5a3a', '#9a8a60'] },
  varn: { cloth: '#a58b5c', cloth2: '#85703f', vest: '#8a7648', helmet: '#8a7448', gear: '#6e5a38', accent: '#b83a2a', pat: ['#b89c68', '#7a6438', '#9a8456'] },
  sund: { cloth: '#5a6a80', cloth2: '#404e62', vest: '#4a566a', helmet: '#46546a', gear: '#5a5a62', accent: '#e8c84a', pat: ['#6a7a90', '#3e4a5c', '#52627a'] },
  urban: { cloth: '#55585e', cloth2: '#3c4046', vest: '#34373c', helmet: '#3c4046', gear: '#5a5348', accent: '#e8e0c8', pat: ['#6a6d74', '#3a3d44', '#4c5058'] },
};
const cache = new Map();

/** a rifle-class weapon drawn pointing right, grip at the origin; kind: rifle, mg, at, sniper, smg, shotgun, pistol, launcher, controller */
export function gunSprite(kind, pal = {}) {
  const key = `gun|${kind}`; if (cache.has(key)) return cache.get(key);
  const [c, g] = mk(150, 56); const ox = 40, oy = 28; const r = (x, y, w, h, col) => R(g, ox + x, oy + y, w, h, col);
  const M = '#2c2e36', M2 = '#44464f', M3 = '#5a5d68', W = '#6a4a2c', W2 = '#4a3220';
  const box = (x, y, w, h, col) => { r(x, y, w, h, col); r(x, y, w, 1, shade(col, 34)); r(x, y + h - 1, w, 1, shade(col, -30)); };
  if (kind === 'rifle' || kind === 'smg') {
    const long = kind === 'rifle'; const L = long ? 56 : 36;
    box(-30, -6, 22, 8, W); r(-30, -6, 22, 2, shade(W, 24)); r(-28, 0, 18, 2, W2); // stock
    box(-10, -8, 28, 10, M2); r(-4, -10, 14, 3, M3); r(14, -9, 2, 2, '#9a9ca8'); // receiver and rail
    box(18, -6, L - 10, 6, M); box(18, -3, 18, 5, W2); r(24, -3, 8, 1, '#7a5a38'); // handguard
    box(L + 8, -5, 6, 4, M2); r(L + 14, -5, 3, 4, '#15161c'); // muzzle device
    box(2, 2, 8, 20, M2); r(2, 2, 3, 20, M3); r(3, 20, 6, 2, '#15161c'); // magazine
    box(-12, 2, 6, 12, M); // grip
    if (long) { box(0, -17, 24, 8, M3); r(2, -15, 3, 4, '#5ac8e8'); r(21, -15, 3, 4, '#5ac8e8'); r(4, -9, 4, 3, M); r(18, -9, 4, 3, M); } // optic
    r(-6, 8, 18, 1, '#8a8470'); r(10, 4, 1, 14, '#8a8470'); // sling
  } else if (kind === 'mg') {
    box(-34, -7, 26, 10, W); box(-10, -10, 36, 12, M2); r(-4, -14, 20, 4, M3); box(26, -7, 58, 7, M); r(30, -4, 40, 3, M2); box(84, -8, 8, 9, M3);
    box(-2, 2, 22, 18, '#5a5a3a'); r(0, 4, 18, 14, '#6a6a46'); for (let k = 0; k < 18; k += 4) r(1 + k, 6, 2, 10, '#c8a84a'); // ammo box and belt
    g.strokeStyle = '#c8a84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ox + 10, oy - 10); g.quadraticCurveTo(ox - 6, oy - 30, ox - 24, oy - 10); g.stroke();
    r(48, 0, 2, 22, M); r(66, 0, 2, 22, M); r(44, 20, 28, 2, M); // bipod
  } else if (kind === 'at' || kind === 'launcher') {
    box(-40, -12, 120, 15, '#5a6a3a'); r(-40, -12, 120, 4, '#7a8a52'); box(-46, -14, 10, 19, M2); box(78, -14, 14, 19, '#3a4a2c'); r(90, -10, 7, 11, '#c83a2a');
    box(-6, -22, 18, 10, M3); r(-4, -20, 14, 5, '#5ac8e8'); box(-6, 3, 8, 14, M); box(14, 3, 6, 10, M); r(-30, -8, 40, 2, '#d8d4c0'); r(24, -8, 10, 4, '#e8c84a');
  } else if (kind === 'sniper') {
    box(-34, -7, 28, 9, '#3a3a30'); box(-8, -9, 30, 10, M2); box(22, -6, 64, 5, M); box(86, -7, 14, 7, M3); box(-6, -22, 38, 11, M3); r(-2, -20, 4, 7, '#5ac8e8'); r(26, -20, 4, 7, '#5ac8e8'); r(6, -12, 4, 4, M); r(22, -12, 4, 4, M);
    r(40, 2, 2, 20, M); r(46, 2, 2, 20, M); r(38, 20, 14, 2, M); box(2, 2, 8, 12, M2);
  } else if (kind === 'shotgun') {
    box(-28, -5, 22, 8, W); box(-8, -7, 20, 9, M2); box(12, -5, 44, 5, M); box(12, -1, 38, 5, W2); r(56, -5, 4, 5, '#15161c');
  } else if (kind === 'pistol') {
    box(-4, -5, 22, 8, M2); box(-4, 3, 8, 14, M); r(16, -4, 3, 3, '#15161c');
  } else if (kind === 'controller') { // a drone controller held in both hands
    box(-14, -8, 34, 18, M); r(-12, -6, 30, 4, M3); r(-8, 0, 8, 6, '#5ac8e8'); r(10, 0, 8, 6, '#e8c84a'); r(-22, -4, 8, 4, M2); r(20, -4, 8, 4, M2); box(-4, -20, 2, 12, M); r(14, -22, 2, 14, M);
  } else { box(-30, -5, 70, 8, M); }
  const out = outline(c, INK, 2); cache.set(key, out); return out;
}

function body(look, pose, view) {
  const P = PALETTES[look.faction || 'company']; const role = look.role || 'rifleman'; const sk = SKIN[look.skin ?? 0];
  const [cv, g] = mk(96, 100); const cx = 48, fy = 90; // feet baseline
  const r = (x, y, w, h, col) => R(g, cx + x, fy + y, w, h, col);
  const phase = pose === 'run' ? (look.t || 0) % 2 : 0; const crouch = pose === 'crouch' ? 14 : 0;
  const cl = look.camo ? P.cloth : P.cloth; const trouser = P.cloth2;
  const part = (x, y, w, h, col, k = 22) => { r(x, y, w, h, col); r(x, y, w, 2, shade(col, k)); r(x, y, 3, h, shade(col, k * 0.6)); r(x + w - 3, y, 3, h, shade(col, -k)); r(x, y + h - 2, w, 2, shade(col, -k * 0.8)); };
  const camoPat = (x, y, w, h, base) => { if (!look.camo) return; const q = rng((look.seed || 1) * 7 + x * 3 + y); for (let n = 0; n < w * h / 30; n++) { const px = x + q() * (w - 4), py = y + q() * (h - 3); r(px, py, 3 + q() * 6, 2 + q() * 4, P.pat[Math.floor(q() * 3)]); } };
  const legY = -42 + crouch, lh = 40 - crouch;
  if (view === 'E') {
    // rear leg, front leg
    const a = phase === 1 ? -9 : phase === 0 && pose === 'run' ? 9 : 0;
    const leg = (x, dx, shadeK) => { part(x + dx, legY, 12, lh - 8, shade(trouser, shadeK), 16); r(x + dx - 1, legY + 12, 14, 7, shade(trouser, shadeK + 14)); /* knee pad */ r(x + dx + 8, legY + 14, 3, 5, '#2a2a30'); part(x + dx - 2, legY + lh - 10, 15, 10, '#26222a', 14); r(x + dx + 8, legY + lh - 10, 6, 8, '#2e2a34'); };
    leg(-12, -a, -12); leg(-2, a, 0);
    // backpack
    const bpH = role === 'signaller' ? 36 : role === 'engineer' || role === 'medic' || role === 'uav' ? 32 : 28;
    part(-27, -62 + crouch, 14, bpH, role === 'medic' ? '#6a7a5a' : role === 'uav' ? '#34383e' : P.gear, 18); r(-25, -58 + crouch, 10, 3, shade(P.gear, 30)); r(-26, -62 + crouch + bpH - 6, 12, 2, '#1c1a14');
    if (role === 'medic') { r(-24, -52 + crouch, 8, 8, '#f0f0f0'); r(-21, -51 + crouch, 2, 6, '#d83a3a'); r(-23, -49 + crouch, 6, 2, '#d83a3a'); }
    if (role === 'signaller') { r(-25, -92 + crouch, 2, 32, '#2a2a30'); r(-27, -94 + crouch, 6, 3, '#d8d8e0'); r(-26, -52 + crouch, 10, 14, '#3a4658'); r(-24, -48 + crouch, 6, 3, '#8ac8e8'); }
    if (role === 'engineer') { r(-30, -66 + crouch, 4, 36, '#6a6a72'); r(-33, -68 + crouch, 10, 6, '#7a7a82'); r(-28, -38 + crouch, 10, 8, '#8a5a2a'); }
    if (role === 'uav') { r(-29, -70 + crouch, 3, 10, '#2a2a30'); r(-18, -70 + crouch, 3, 10, '#2a2a30'); r(-30, -72 + crouch, 18, 3, '#8a8a92'); }
    // torso with vest and pouches
    part(-14, -62 + crouch, 26, 28, cl, 20); camoPat(-14, -62 + crouch, 26, 28, cl); part(-8, -58 + crouch, 18, 22, P.vest, 18); for (let k = 0; k < 3; k++) { r(-4 + k * 6, -46 + crouch, 5, 8, shade(P.vest, -22)); r(-4 + k * 6, -46 + crouch, 5, 1, shade(P.vest, 18)); }
    r(-14, -35 + crouch, 26, 4, '#2a2418'); r(-14, -35 + crouch, 26, 1, '#6a5a3c'); r(2, -33 + crouch, 7, 9, '#3a3228'); // belt, pouch
    if (role === 'medic') { r(-11, -56 + crouch, 9, 9, '#f0f0f0'); r(-8, -55 + crouch, 3, 7, '#d83a3a'); r(-10, -53 + crouch, 7, 3, '#d83a3a'); r(-10, -34 + crouch, 14, 12, '#d8d8c8'); r(-4, -31 + crouch, 3, 6, '#d83a3a'); }
    if (role === 'officer') { r(2, -50 + crouch, 8, 6, '#8a6a3a'); r(-4, -60 + crouch, 3, 12, P.accent); }
    if (role === 'recon') { r(-12, -60 + crouch, 24, 4, '#4a5238'); }
    if (role === 'uav') { r(-6, -56 + crouch, 14, 14, '#26282e'); r(-4, -54 + crouch, 10, 6, '#5ac8e8'); r(6, -66 + crouch, 2, 12, '#2a2a30'); r(-8, -66 + crouch, 2, 12, '#2a2a30'); }
    // head
    const hy = -78 + crouch; part(-3, hy + 14, 8, 8, sk, 12); // neck
    ell(g, cx + 2, fy + hy + 8, 10, 11, sk); r(3, hy + 8, 8, 10, sk); r(10, hy + 12, 3, 4, shade(sk, -16)); r(3, hy + 12, 2, 2, '#1a1418'); r(9, hy + 10, 3, 1, '#2a1a14');
    if (role === 'recon') r(3, hy + 12, 10, 8, '#4a5238');
    if (role === 'uav') { r(1, hy + 6, 14, 8, '#1a1a22'); r(2, hy + 7, 12, 3, '#5ac8e8'); r(12, hy + 6, 6, 4, '#2a2a30'); r(-4, hy + 8, 6, 3, '#2a2a30'); }
    else if (role === 'officer') { part(-6, hy - 4, 22, 9, P.cloth2, 16); r(10, hy - 1, 10, 4, shade(P.cloth2, -20)); r(2, hy - 2, 4, 4, P.accent); }
    else { ell(g, cx, fy + hy + 2, 14, 11, P.helmet); r(-12, hy + 2, 28, 4, shade(P.helmet, -18)); r(-9, hy - 6, 14, 4, shade(P.helmet, 30)); r(12, hy + 2, 6, 3, shade(P.helmet, -30)); r(-1, hy + 2, 2, 12, '#1a1814'); r(6, hy + 4, 2, 8, '#1a1814'); if (role !== 'recon') { r(2, hy + 3, 12, 3, '#161c26'); r(3, hy + 4, 5, 1, '#6ac8e8'); } if (role === 'medic') { r(-3, hy - 4, 9, 9, '#f0f0f0'); r(0, hy - 3, 3, 7, '#d83a3a'); r(-2, hy - 1, 7, 3, '#d83a3a'); } if (role === 'marksman') for (let k = 0; k < 8; k++) r(-12 + k * 3, hy - 8 + (k % 3) * 3, 3, 6, k % 2 ? '#4a5a2a' : '#7a6a3a'); }
    // arms and weapon
    const wk = look.weapon || 'rifle'; const gs = gunSprite(wk); const wy = pose === 'run' ? -38 + crouch : -50 + crouch;
    g.save(); g.translate(cx + 4, fy + wy); if (pose === 'run') g.rotate(0.35); g.scale(0.66, 0.66); g.drawImage(gs, -40, -28); g.restore();
    part(-2, -62 + crouch, 9, 18, shade(cl, 6), 16); part(8, wy - 4, 12, 9, shade(cl, -4), 14); r(18, wy - 3, 7, 8, '#2a2a30'); r(-4, wy - 6, 7, 8, '#2a2a30');
    if (look.band) r(-3, -57 + crouch, 11, 4, look.band);
  } else {
    // FRONT / BACK: symmetrical body
    const back = view === 'N'; const a = phase ? 8 : 0;
    const leg = (x, dy, k) => { part(x, legY + dy, 13, lh - 8 - dy, shade(trouser, k), 16); r(x + 1, legY + 12 + dy, 11, 7, shade(trouser, k + 12)); part(x - 1, legY + lh - 10, 15, 10, '#26222a', 14); };
    leg(-16, a, -6); leg(3, -a, 4);
    if (back) { part(-16, -64 + crouch, 32, 32, role === 'medic' ? '#6a7a5a' : role === 'uav' ? '#34383e' : P.gear, 18); r(-12, -60 + crouch, 24, 3, shade(P.gear, 28)); r(-10, -48 + crouch, 20, 10, shade(P.gear, -26)); r(-14, -34 + crouch, 28, 4, '#2a2418'); if (role === 'medic') { r(-6, -58 + crouch, 12, 12, '#f0f0f0'); r(-2, -57 + crouch, 4, 10, '#d83a3a'); r(-5, -54 + crouch, 10, 4, '#d83a3a'); } if (role === 'signaller') { r(14, -100 + crouch, 3, 42, '#2a2a30'); r(-4, -50 + crouch, 14, 12, '#3a4658'); } if (role === 'engineer') { r(-8, -80 + crouch, 4, 40, '#6a6a72'); r(-12, -82 + crouch, 12, 6, '#7a7a82'); } if (role === 'uav') { r(-14, -74 + crouch, 3, 12, '#2a2a30'); r(11, -74 + crouch, 3, 12, '#2a2a30'); r(-16, -76 + crouch, 32, 3, '#8a8a92'); } }
    else { part(-16, -64 + crouch, 32, 30, cl, 20); camoPat(-16, -64 + crouch, 32, 30, cl); part(-12, -62 + crouch, 24, 24, P.vest, 18); for (let k = 0; k < 3; k++) { r(-10 + k * 7, -48 + crouch, 6, 9, shade(P.vest, -24)); r(-10 + k * 7, -48 + crouch, 6, 1, shade(P.vest, 18)); } r(-16, -35 + crouch, 32, 4, '#2a2418'); r(-3, -35 + crouch, 6, 4, '#c8a84a'); r(-17, -34 + crouch, 7, 11, '#3a3228'); r(10, -34 + crouch, 7, 11, '#3a3228'); r(-4, -60 + crouch, 8, 8, shade(P.vest, 12)); if (role === 'medic') { r(-12, -60 + crouch, 10, 10, '#f0f0f0'); r(-9, -59 + crouch, 4, 8, '#d83a3a'); r(-11, -57 + crouch, 8, 4, '#d83a3a'); } if (role === 'officer') { r(-14, -62 + crouch, 4, 12, P.accent); r(10, -60 + crouch, 6, 6, P.accent); r(-5, -56 + crouch, 10, 3, '#c8a84a'); } if (role === 'uav') { r(-9, -58 + crouch, 18, 14, '#26282e'); r(-7, -56 + crouch, 14, 8, '#5ac8e8'); r(-7, -46 + crouch, 5, 3, '#e8c84a'); r(10, -70 + crouch, 2, 14, '#2a2a30'); r(-12, -70 + crouch, 2, 14, '#2a2a30'); } if (role === 'signaller') { r(12, -92 + crouch, 3, 34, '#2a2a30'); r(8, -64 + crouch, 10, 6, '#3a4658'); } }
    // shoulders / arms
    const sw = (x) => { part(x, -62 + crouch, 10, 26, shade(cl, back ? -8 : 0), 16); r(x + 1, -37 + crouch, 8, 8, '#2a2a30'); };
    sw(-27); sw(17);
    // head
    const hy = -80 + crouch; part(-4, hy + 15, 9, 8, sk, 12);
    if (back) { ell(g, cx, fy + hy + 7, 12, 13, role === 'uav' ? '#1a1a22' : role === 'officer' ? P.cloth2 : P.helmet); r(-11, hy + 8, 22, 4, shade(P.helmet, -22)); r(-8, hy - 4, 12, 4, shade(P.helmet, 30)); r(-9, hy + 14, 18, 6, shade(sk, -30)); if (role === 'uav') { r(-10, hy + 4, 20, 3, '#2a2a30'); r(-2, hy + 4, 4, 10, '#8a8a92'); } if (role === 'marksman') for (let k = 0; k < 9; k++) r(-11 + k * 3, hy - 4 + (k % 3) * 4, 3, 7, k % 2 ? '#4a5a2a' : '#7a6a3a'); }
    else { ell(g, cx, fy + hy + 8, 11, 13, sk); r(-10, hy + 8, 3, 6, shade(sk, -18)); r(7, hy + 8, 3, 6, shade(sk, -18)); r(-6, hy + 10, 4, 2, '#1a1418'); r(3, hy + 10, 4, 2, '#1a1418'); r(-3, hy + 16, 6, 2, shade(sk, -34)); r(-4, hy + 19, 8, 4, shade(sk, -10));
      if (role === 'recon') { r(-11, hy + 12, 22, 12, '#4a5238'); r(-8, hy + 8, 16, 4, '#4a5238'); }
      if (role === 'uav') { r(-12, hy + 6, 24, 10, '#1a1a22'); r(-10, hy + 7, 20, 4, '#5ac8e8'); r(-3, hy + 7, 6, 8, '#2a2a30'); r(-14, hy + 6, 4, 8, '#2a2a30'); r(10, hy + 6, 4, 8, '#2a2a30'); r(12, hy - 6, 2, 12, '#2a2a30'); }
      else if (role === 'officer') { part(-13, hy - 2, 26, 9, P.cloth2, 16); r(-13, hy + 5, 26, 3, shade(P.cloth2, -26)); r(-3, hy - 1, 6, 6, P.accent); }
      else { ell(g, cx, fy + hy + 2, 15, 11, P.helmet); r(-14, hy + 3, 28, 4, shade(P.helmet, -20)); r(-9, hy - 6, 14, 4, shade(P.helmet, 30)); r(-13, hy + 7, 4, 10, shade(P.helmet, -26)); r(10, hy + 7, 4, 10, shade(P.helmet, -34)); r(-11, hy + 8, 22, 4, '#161c26'); r(-9, hy + 9, 7, 1, '#6ac8e8'); r(3, hy + 9, 7, 1, '#6ac8e8'); if (role === 'medic') { r(-4, hy - 4, 9, 9, '#f0f0f0'); r(-1, hy - 3, 3, 7, '#d83a3a'); r(-3, hy - 1, 7, 3, '#d83a3a'); } if (role === 'marksman') for (let k = 0; k < 9; k++) r(-12 + k * 3, hy - 8 + (k % 3) * 3, 3, 7, k % 2 ? '#4a5a2a' : '#7a6a3a'); } }
    if (!back) { const gs = gunSprite(look.weapon || 'rifle'); g.save(); g.translate(cx - 4, fy - 46 + crouch); g.rotate(look.weapon === 'at' ? -0.9 : 0.5); g.scale(0.55, 0.55); g.drawImage(gs, -40, -28); g.restore(); r(-24, -46 + crouch, 9, 9, '#2a2a30'); r(12, -42 + crouch, 9, 9, '#2a2a30'); }
    else { const gs = gunSprite(look.weapon || 'rifle'); g.save(); g.translate(cx + 14, fy - 66 + crouch); g.rotate(-1.2); g.scale(0.5, 0.5); g.drawImage(gs, -40, -28); g.restore(); }
    if (look.band) r(-27, -52 + crouch, 10, 5, look.band);
  }
  return cv;
}

/** prone shooter or fallen casualty, seen from above, pointing right */
function lying(look, pose) {
  const P = PALETTES[look.faction || 'company']; const sk = SKIN[look.skin ?? 0]; const [cv, g] = mk(150, 56); const r = (x, y, w, h, col) => R(g, 20 + x, 20 + y, w, h, col);
  const part = (x, y, w, h, col, k = 20) => { r(x, y, w, h, col); r(x, y, w, 2, shade(col, k)); r(x, y + h - 2, w, 2, shade(col, -k)); r(x + w - 2, y, 2, h, shade(col, -k * 0.6)); };
  if (pose === 'prone') {
    part(-6, 8, 34, 9, P.cloth2, 14); part(-6, -2, 34, 9, shade(P.cloth2, -8), 14); part(26, 8, 8, 8, '#26222a', 12); part(26, -2, 8, 8, '#26222a', 12); // legs and boots
    part(24, 0, 30, 20, P.cloth, 18); part(28, 2, 22, 14, P.vest, 14); part(10, 4, 18, 14, P.gear, 14); // torso, vest, pack... drawn behind
    part(48, 2, 16, 14, shade(P.cloth, 6), 14); r(78 - 14, 8, 8, 8, sk); ell(g, 20 + 58, 20 + 10, 10, 10, P.helmet); r(52, 2, 12, 4, shade(P.helmet, 24));
    const gs = gunSprite(look.weapon || 'rifle'); g.save(); g.translate(20 + 62, 20 + 10); g.scale(0.7, 0.7); g.drawImage(gs, -30, -28); g.restore(); r(66, 12, 8, 8, '#2a2a30');
  } else { // fallen
    g.save(); g.translate(20 + 40, 20 + 22); g.rotate(0.15); const rr = (x, y, w, h, col) => R(g, x, y, w, h, col); const pt = (x, y, w, h, col, k = 18) => { rr(x, y, w, h, col); rr(x, y, w, 2, shade(col, k)); rr(x, y + h - 2, w, 2, shade(col, -k)); };
    pt(-36, -4, 28, 11, P.cloth2); pt(-10, -14, 34, 22, P.cloth); pt(-6, -12, 26, 17, P.vest); pt(-38, -2, 8, 9, '#26222a'); pt(20, -20, 14, 10, P.cloth); ell(g, 36, -2, 11, 10, P.helmet); rr(30, -6, 12, 3, shade(P.helmet, 30)); pt(24, 4, 12, 7, P.cloth); g.restore();
    const gs = gunSprite(look.weapon || 'rifle'); g.save(); g.translate(20 + 70, 20 + 30); g.rotate(0.5); g.scale(0.6, 0.6); g.drawImage(gs, -30, -28); g.restore();
  }
  return cv;
}

/** the cached soldier sprite. look: { role, faction, skin, camo, weapon, band, t, seed }; pose: stand|run|crouch|prone|dead; view: S|N|E|W */
export function soldier(look, pose = 'stand', view = 'E') {
  const key = JSON.stringify([look.role, look.faction, look.skin, look.camo, look.weapon, look.band, look.t, look.seed, pose, view]);
  if (cache.has(key)) return cache.get(key);
  const mirror = view === 'W'; let raw = (pose === 'prone' || pose === 'dead') ? lying(look, pose) : body(look, pose, mirror ? 'E' : view);
  let c = outline(lit(raw, 0.2), INK, 2);
  if (mirror) { const [m, mg] = mk(c.width, c.height); mg.translate(c.width, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); c = m; }
  cache.set(key, c); return c;
}
/** draws a soldier with feet at (x, y), with a soft ground shadow and an optional selection ring / health pip */
export function drawSoldier(g, look, pose, view, x, y, o = {}) {
  const s = o.scale || 1; const c = soldier(look, pose, view); const lying_ = pose === 'prone' || pose === 'dead';
  if (!lying_) blob(g, x + 7 * s, y + 3 * s, 20 * s, 7 * s, 0.4); else blob(g, x + 8 * s, y + 12 * s, 40 * s, 9 * s, 0.35);
  if (lying_) g.drawImage(c, x - 70 * s, y - 28 * s, c.width * s, c.height * s); else g.drawImage(c, x - 48 * s - 2, y - 90 * s - 2, c.width * s, c.height * s);
}
