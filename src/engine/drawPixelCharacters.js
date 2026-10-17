// Pixel-art people (v0.41.1): chibi figures on the art-pixel grid (one art pixel = 2 world pixels)
// like the mock-up — a big head, a dark outline, a small body — built from the same appearance data
// as the old drawing (skin, hair and style, hat, outfit, legs, shoes, tie, scarf, vest, apron,
// overalls, beard, shades, build, height). Held items reuse the old drawing.

import { drawWeaponSprite, isGunLook } from './drawPixelWeapons.js';

const INK = '#1b1a24';
// v0.46.0: one art pixel = one world pixel (it was two) — people are about a tile tall, in fine pixels
const U = 1;
const BUILD = { round: 12, average: 10, thin: 8, wiry: 9, broad: 12 };

function shade(hex, amt) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex || '#888888';
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** `drawHeld` is the old held-item drawing, passed in by drawCharacter (no import cycle). */
export function drawPixelCharacter(ctx, a, s, drawHeld) {
  const facing = s.facing || 'down';
  const side = facing === 'left' || facing === 'right';
  const dir = facing === 'left' ? -1 : 1;
  const up = facing === 'up';
  const t = s.animTime || 0;
  const step = s.moving ? (Math.sin(t * 11) > 0 ? 1 : -1) : 0;
  const bob = s.moving && Math.abs(Math.sin(t * 11)) > 0.7 ? 1 : 0;
  const scale = (s.scale || 1) * (a.height || 1);
  const bw = BUILD[a.build] || 10;
  const tw = side ? bw - 2 : bw;
  const style = a.hairStyle || 'short';
  const acc = new Set([a.accessory, ...(a.accessories || [])].filter(Boolean));

  ctx.save();
  ctx.translate(Math.round(s.x), Math.round(s.y));
  ctx.scale(scale, scale);
  // v0.44.0: hit, and for a blink the whole figure goes white
  const R = (x, y, w, h, c) => { ctx.fillStyle = s.flash && c[0] === '#' ? '#ffffff' : c; ctx.fillRect(x * U, y * U, w * U, h * U); };

  // shadow
  R(-5, -1, 10, 2, 'rgba(20,20,35,0.3)'); R(-4, 0, 8, 1, 'rgba(20,20,35,0.2)');

  // legs and shoes
  const legC = a.overalls || a.legs || shade(a.outfit, -45);
  const shoe = a.shoes || '#2b2430';
  if (side) {
    R(-2 + step, -6, 3, 6, INK); R(-1 - step, -6, 3, 6, INK);
    R(-1 + step, -6, 2, 4, legC); R(-1 + step, -2, 2 + (dir > 0 ? 1 : 0), 1, shoe);
    R(-1 - step, -6, 2, 4, shade(legC, -15)); R(-1 - step, -2, 2, 1, shoe);
  } else {
    const ly = step > 0 ? -1 : 0;
    const ry = step < 0 ? -1 : 0;
    R(-4, -6 + ly, 4, 6, INK); R(0, -6 + ry, 4, 6, INK);
    R(-3, -6 + ly, 2, 4, legC); R(-3, -2 + ly, 2, 1, shoe);
    R(1, -6 + ry, 2, 4, legC); R(1, -2 + ry, 2, 1, shoe);
  }

  ctx.translate(0, -bob * U);

  // torso (outlined), arms, hands
  const outfit = a.outfit || '#5a6a8a';
  const sleeve = a.sleeves || outfit;
  const half = Math.floor(tw / 2);
  R(-half - 1, -14, tw + 2, 9, INK);
  R(-half, -13, tw, 7, outfit);
  R(-half, -13, tw, 1, shade(outfit, 25));
  R(-half, -7, tw, 1, shade(outfit, -30)); // belt line
  if (a.pattern === 'pinstripe') for (let k = -half + 1; k < half; k += 2) R(k, -12, 1, 5, shade(outfit, 30));
  if (a.pattern === 'check') for (let k = -half; k < half; k += 2) for (let j = -13; j < -7; j += 2) R(k, j, 1, 1, a.patternColor || '#e8d070');
  if (a.overalls) { R(-half + 1, -10, tw - 2, 3, a.overalls); if (!up) { R(-half + 1, -13, 1, 3, a.overalls); R(half - 2, -13, 1, 3, a.overalls); R(-half + 1, -10, 1, 1, '#c9a24a'); R(half - 2, -10, 1, 1, '#c9a24a'); } }
  if (a.apron && !up) { R(-half + 1, -11, tw - 2, 5, a.apron === true ? '#f2efe6' : a.apron); R(-half + 1, -11, tw - 2, 1, shade(a.apron === true ? '#f2efe6' : a.apron, -30)); }
  if (acc.has('vest') && !up) { R(-half, -13, 2, 6, a.vestColor || '#f2a33a'); R(half - 2, -13, 2, 6, a.vestColor || '#f2a33a'); R(-half, -10, tw, 1, '#f2efe6'); }
  if (a.tie && facing === 'down') { R(-1, -13, 2, 1, a.undershirt || '#f2efe6'); R(0, -13, 1, 5, a.tie); }
  if (acc.has('scarf') && !up) { R(-half, -14, tw, 2, a.accent || '#f2c14e'); if (facing === 'down') R(1, -12, 2, 3, a.accent || '#f2c14e'); }
  const arm = (x, sw, back) => { R(x - 1, -14 + sw, 3, 7, INK); R(x, -13 + sw, 1, 5, back ? shade(sleeve, -20) : sleeve); R(x, -8 + sw, 1, 1, a.skin || '#e8b896'); };
  if (side) arm(-dir * 1, -step, true);
  else { arm(-half - 1, step, false); arm(half, -step, false); }
  if (side) arm(dir * 1, step, false);

  if (a.holding) {
    // v0.45.0: every weapon has its own sprite; a gun points where it's aimed, anything else is held up and ready
    const aimed = isGunLook(a.holding) && s.aim != null;
    const ang = aimed ? s.aim : side ? (dir > 0 ? -0.9 : Math.PI + 0.9) : facing === 'up' ? -1.9 : -0.9;
    ctx.save();
    ctx.translate((aimed ? 0 : side ? dir * 2 : half + 1) * U, (aimed ? -10 : -7) * U);
    ctx.rotate(ang);
    if (Math.cos(ang) < 0) ctx.scale(1, -1);
    if (!drawWeaponSprite(ctx, a.holding, U, { flash: s.flash, hand: a.skin || '#e8b896' }) && drawHeld) { ctx.restore(); ctx.save(); ctx.scale(0.5, 0.5); drawHeld(ctx, a.holding, side ? dir * 2 : half * 2 + 2, -14, side ? dir : 1, s.idleTime || 0); }
    ctx.restore();
  }


  // the head: big, outlined, rounded corners
  const skin = a.skin || '#e8b896';
  const hy = -25; // top of the head
  R(-6, hy, 12, 12, INK); R(-7, hy + 1, 14, 10, INK);
  R(-5, hy + 1, 10, 10, skin); R(-6, hy + 2, 12, 8, skin);
  R(-6, hy + 9, 12, 1, shade(skin, -18)); // under the chin
  const hair = a.hair || '#333333';
  const hatStyle = ['hat', 'tophat', 'cap', 'captain', 'hardhat'].includes(style);
  if (up) {
    R(-5, hy + 1, 10, 9, hair); R(-6, hy + 2, 12, 7, hair); R(-4, hy + 2, 3, 1, shade(hair, 25));
  } else {
    // a cap of hair; fringe and sides by style
    R(-5, hy + 1, 10, 3, hair); R(-6, hy + 2, 12, 2, hair); R(-4, hy + 1, 3, 1, shade(hair, 25));
    if (side) R(-dir * 6, hy + 2, 4, 5, hair);
    else { R(-6, hy + 3, 1, 3, hair); R(5, hy + 3, 1, 3, hair); }
    if (style === 'messy' || style === 'curly') { R(-5, hy, 2, 1, INK); R(-4, hy, 1, 1, hair); R(1, hy, 2, 1, INK); R(2, hy, 1, 1, hair); R(-3, hy + 4, 2, 1, hair); R(2, hy + 4, 1, 1, hair); }
    if (style === 'parted') R(1, hy + 1, 1, 2, shade(hair, -30));
    if (style === 'long' || style === 'ponytail') { if (!side) { R(-7, hy + 3, 2, 8, INK); R(5, hy + 3, 2, 8, INK); R(-6, hy + 3, 1, 7, hair); R(5, hy + 3, 1, 7, hair); } else R(-dir * 6, hy + 2, 3, 9, hair); }
    if (style === 'bun') { R(-2, hy - 3, 4, 4, INK); R(-1, hy - 2, 2, 2, hair); }
  }
  if (style === 'ponytail' && side) { R(-dir * 8, hy + 3, 3, 6, INK); R(-dir * 7 - (dir < 0 ? 0 : 0), hy + 4, 1, 4, hair); }
  // face
  if (!up) {
    const ey = hy + 5;
    const eyes = side ? [dir * 3] : [-3, 2];
    for (const ex of eyes) {
      if (s.sleeping) R(ex, ey + 1, 2, 1, INK);
      else { R(ex, ey, 1, 2, INK); R(ex, ey, 1, 1, '#4a4a5a'); }
    }
    if (!side && !s.sleeping) { R(-5, ey + 2, 1, 1, 'rgba(230,110,110,0.45)'); R(4, ey + 2, 1, 1, 'rgba(230,110,110,0.45)'); }
    if (acc.has('shades')) { if (side) R(dir * 3 - 1, ey, 3, 2, '#141218'); else { R(-4, ey, 3, 2, '#141218'); R(1, ey, 3, 2, '#141218'); R(-1, ey, 2, 1, '#141218'); } }
    if (acc.has('monocle') && !side) { R(2, ey - 1, 3, 1, '#d9b24a'); R(2, ey + 2, 3, 1, '#d9b24a'); R(1, ey, 1, 2, '#d9b24a'); R(4, ey, 1, 2, '#d9b24a'); }
    if (acc.has('goggles')) { R(-6, ey - 2, 12, 1, '#5b4a3a'); if (!side) { R(-4, ey - 3, 3, 3, a.accent || '#5b7f9a'); R(1, ey - 3, 3, 3, a.accent || '#5b7f9a'); } }
    if (a.beard) { if (side) R(dir * 1, ey + 2, 4 * dir > 0 ? 4 : 4, 4, a.beard); else { R(-5, ey + 2, 10, 2, a.beard); R(-4, ey + 4, 8, 2, a.beard); R(-1, ey + 3, 2, 1, shade(skin, -40)); } }
    else if (!side && !s.sleeping) R(-1, ey + 3, 2, 1, a.angry ? '#7a2a24' : shade(skin, -45));
    if (a.angry && !s.sleeping) { R(-5, hy + 2, 10, 8, 'rgba(210,40,30,0.25)'); R(-4, ey - 2, 2, 1, INK); R(-3, ey - 1, 1, 1, INK); R(2, ey - 2, 2, 1, INK); R(2, ey - 1, 1, 1, INK); }
  }
  // hats
  const hatC = a.hatColor || a.accent || '#444444';
  if (style === 'hat') { R(-8, hy + 1, 16, 2, INK); R(-7, hy + 1, 14, 1, hatC); R(-5, hy - 4, 10, 6, INK); R(-4, hy - 3, 8, 4, hatC); R(-4, hy, 8, 1, shade(hatC, -35)); }
  if (style === 'tophat') { R(-7, hy + 1, 14, 2, INK); R(-6, hy + 1, 12, 1, hatC); R(-4, hy - 7, 8, 9, INK); R(-3, hy - 6, 6, 7, hatC); R(-3, hy - 1, 6, 1, '#8a2a2a'); }
  if (style === 'cap' || style === 'captain') {
    const c = style === 'captain' ? '#f2efe6' : hatC;
    R(-6, hy - 1, 12, 4, INK); R(-5, hy, 10, 3, c); R(-4, hy, 3, 1, shade(c, 25));
    if (!up) { if (side) R(dir * 4, hy + 2, 4, 1, INK); else R(-5, hy + 3, 10, 1, style === 'captain' ? '#1e2a3a' : shade(c, -40)); }
    if (style === 'captain' && !up) R(-1, hy + 1, 2, 1, '#c9a24a');
  }
  if (style === 'hardhat') { R(-7, hy - 1, 14, 5, INK); R(-6, hy, 12, 3, '#f2c14e'); R(-7, hy + 3, 14, 1, '#d8a83a'); R(-4, hy, 3, 1, '#f8dc80'); }
  if (hatStyle && up) R(-5, hy + 3, 10, 6, hair);
  // steam when angry
  if (a.angry && !s.sleeping) {
    const tt = s.idleTime || t;
    for (let k = 0; k < 3; k++) { const ph = (tt * 0.9 + k / 3) % 1; R((k - 1) * 3, Math.round(hy - 3 - ph * 7), 2, 2, `rgba(240,235,235,${(0.55 * (1 - ph)).toFixed(2)})`); }
  }
  ctx.restore();
}
