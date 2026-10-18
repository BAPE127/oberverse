// People (v0.50.0, the art overhaul's phase 5): figures like the owner's mock-ups — a big head
// with a face (eyes with a glint, brows, a nose, ears, a mouth), hair with body and a shine,
// clothes shaded as cloth (lit on the left, in shadow on the right, folds and a belt), arms that
// swing and legs that stride through a four-frame walk, shoes with a toe-cap. All of it from the
// same appearance data as before (skin, hair and style, hats, outfit, sleeves, legs, shoes, tie,
// scarf, vest, apron, overalls, patterns, beard and moustache, glasses, shades, monocle,
// goggles, chains, build, height).
//
// A figure is painted once per look, facing and frame into two sprites — the body and the head —
// with the outline traced round each, and copied from then on; whatever the figure holds is drawn
// between the two. Feet at (0, 0), the top of the head about 27 px up.

const INK = '#1b1a24';
const BUILD = { round: 12, average: 10, thin: 8, wiry: 9, broad: 12 };

// ------------------------------------------------------------------ colour
const parse = (h) => {
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(h || '');
  if (m) return [+m[1], +m[2], +m[3]];
  if (!h || h[0] !== '#') return [136, 136, 136];
  const s = h.length === 4 ? h.slice(1).split('').map((c) => c + c).join('') : h.slice(1, 7);
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => {
  const x = parse(a);
  const y = parse(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};
/** dark → light: [deep, shade, base, lit, shine] */
const ramp = (c) => [mix(c, INK, 0.5), mix(c, INK, 0.24), hex(parse(c)), mix(c, '#fff4e0', 0.22), mix(c, '#fffaf2', 0.45)];

// ------------------------------------------------------------------ painting
/**
 * Paint a figure's body or head into `R` (fillRect at figure coordinates).
 * f: facing; fr: 0 standing, 1..4 the walk (1 and 3 mid-stride, 2 and 4 passing); part: 'body' | 'head'
 */
function paint(R0, a, f, fr, part, o) {
  // tall people have longer legs (a pixel or two), short ones shorter: never a scaled, blurred figure
  const L = Math.max(-2, Math.min(2, Math.round(((a.height || 1) - 1) * 14)));
  const R = (x, y, w, h, c) => {
    if (y + h <= -6) return R0(x, y - L, w, h, c); // above the knees: moved up
    if (y >= -6) return R0(x, y, w, h, c);
    R0(x, y - L, w, -6 - y, c); // split at the knee
    if (y + h + 6 + L > 0) R0(x, -6 - L, w, y + h + 6 + L, c);
  };
  const side = f === 'left' || f === 'right';
  const dir = f === 'left' ? -1 : 1;
  const up = f === 'up';
  const down = f === 'down';
  const stride = [0, 1, 0, -1, 0][fr]; // 0 standing; 1..4 the walk
  const lift = fr === 2 || fr === 4 ? 1 : 0; // the body rises as the legs pass
  const bw = BUILD[a.build] || 10;
  const tw = side ? bw - 2 : bw;
  const half = Math.floor(tw / 2);
  const acc = new Set([a.accessory, ...(a.accessories || [])].filter(Boolean));
  const skin = ramp(a.skin || '#e8b896');
  const outfit = ramp(a.outfit || '#5a6a8a');
  const sleeve = ramp(a.sleeves || a.outfit || '#5a6a8a');
  const legC = ramp(a.overalls || a.legs || mix(a.outfit || '#5a6a8a', INK, 0.45));
  const shoe = ramp(a.shoes || '#2b2430');
  const hair = ramp(a.hair || '#333333');
  const style = a.hairStyle || 'short';

  if (part === 'body') {
    // --- legs and shoes
    if (side) {
      const back = -stride;
      const fore = stride;
      R(-1 + back, -7, 3, 5, legC[1]); R(-1 + back, -2, 3 + (dir > 0 ? 0 : 0), 2, shoe[1]);
      R(-1 + fore, -7, 3, 5, legC[2]); R(-1 + fore, -7, 1, 5, legC[3]); R(-1 + fore + (dir > 0 ? 0 : -1), -2, 4, 2, shoe[2]); R(-1 + fore + (dir > 0 ? 2 : -1), -2, 1, 1, shoe[4]);
    } else {
      const ly = stride > 0 ? -1 : 0;
      const ry = stride < 0 ? -1 : 0;
      R(-4, -7 + ly, 3, 5, legC[2]); R(-4, -7 + ly, 1, 5, legC[3]);
      R(1, -7 + ry, 3, 5, legC[1]); R(3, -7 + ry, 1, 5, legC[0]);
      R(-4, -2 + ly, 3, 2, shoe[2]); R(-4, -2 + ly, 2, 1, shoe[4]);
      R(1, -2 + ry, 3, 2, shoe[1]); R(1, -2 + ry, 2, 1, shoe[3]);
      if (!up) R(-1, -7, 2, 2, legC[0]); // the crotch shadow
    }
    const by = -lift; // the body rides up as the legs pass
    // --- arms behind the torso (side view: the far arm)
    const armSwing = side ? stride : 0;
    const arm = (x, sw, back) => {
      const c = back ? [sleeve[0], sleeve[1]] : [sleeve[2], sleeve[3]];
      R(x, -15 + by + sw, 2, 6, c[0]); R(x, -15 + by + sw, 1, 6, c[1]);
      R(x, -9 + by + sw, 2, 2, back ? skin[1] : skin[2]); R(x, -9 + by + sw, 1, 1, back ? skin[2] : skin[3]);
    };
    if (side) arm(-dir * 1 - (dir > 0 ? 1 : 0) - armSwing, 0, true);
    // --- the torso: shoulders rounded, lit left, shadowed right, a fold, the belt
    const top = -16 + by;
    const tb = -7 + by;
    for (let y = top; y < tb; y++) {
      const shoulder = y === top ? 1 : 0;
      for (let x = -half + shoulder; x < half - shoulder; x++) {
        const t = (x + half) / tw;
        let c = t < 0.25 ? outfit[3] : t < 0.7 ? outfit[2] : outfit[1];
        if (side) c = (dir > 0 ? t < 0.5 : t >= 0.5) ? outfit[3] : outfit[1];
        if (y === top + 1 && t < 0.6) c = outfit[4];
        R(x, y, 1, 1, c);
      }
    }
    R(-half, tb - 1, tw, 1, outfit[0]); // hem / belt line
    if (!up && !a.overalls && !a.apron) { R(-1, tb - 1, 2, 1, '#c9a24a'); } // a buckle
    if (a.pattern === 'pinstripe') for (let k = -half + 1; k < half; k += 2) R(k, top + 1, 1, 7, mix(a.outfit, '#ffffff', 0.25));
    if (a.pattern === 'check') for (let k = -half; k < half; k += 2) for (let j = top + 1; j < tb - 1; j += 2) R(k, j, 1, 1, a.patternColor || '#e8d070');
    if (a.coat && !up) { R(-half, top + 2, 1, tb - top - 2, outfit[0]); R(half - 1, top + 2, 1, tb - top - 2, outfit[0]); }
    if (down) {
      // the neckline: an undershirt in a V, and a tie
      const us = a.undershirt || (a.tie ? '#f2efe6' : null);
      if (us) { R(-2, top, 4, 1, us); R(-1, top + 1, 2, 1, us); }
      else R(-2, top, 4, 1, skin[1]);
      if (a.tie) { R(0, top + 1, 1, 5, a.tie); R(-1, top + 1, 1, 1, a.tie); R(0, top + 1, 1, 1, mix(a.tie, '#ffffff', 0.3)); }
      if (!a.tie && !a.overalls && !a.apron) R(0, top + 2, 1, tb - top - 4, outfit[1]); // a placket
    }
    if (a.overalls) {
      const ov = ramp(a.overalls);
      R(-half + 1, top + 4, tw - 2, tb - top - 4, ov[2]); R(-half + 1, top + 4, tw - 2, 1, ov[3]);
      if (!up) { R(-half + 1, top, 1, 4, ov[2]); R(half - 2, top, 1, 4, ov[2]); R(-half + 1, top + 4, 1, 1, '#c9a24a'); R(half - 2, top + 4, 1, 1, '#c9a24a'); }
    }
    if (a.apron && !up) { const ap = ramp(a.apron === true ? '#f2efe6' : a.apron); R(-half + 1, top + 3, tw - 2, tb - top - 1, ap[2]); R(-half + 1, top + 3, tw - 2, 1, ap[3]); R(half - 2, top + 3, 1, tb - top - 1, ap[1]); R(-1, top + 1, 2, 2, ap[2]); }
    if (acc.has('vest') && !up) { const v = ramp(a.vestColor || '#f2a33a'); R(-half, top, 2, tb - top - 1, v[2]); R(half - 2, top, 2, tb - top - 1, v[1]); R(-half, top + 4, tw, 1, '#f2efe6'); }
    if ((acc.has('chain') || acc.has('watchchain')) && down) { R(1, top + 4, 1, 1, '#e8c35a'); R(2, top + 5, 1, 1, '#e8c35a'); R(3, top + 4, 1, 1, '#e8c35a'); }
    if (acc.has('scarf') && !up) { const sc = ramp(a.accent || '#f2c14e'); R(-half, top - 1, tw, 2, sc[2]); R(-half, top - 1, tw, 1, sc[3]); if (down) R(1, top + 1, 2, 3, sc[1]); }
    // --- arms in front
    if (side) arm(dir * 1 - (dir > 0 ? 0 : 1) + armSwing, 0, false);
    else { arm(-half - 2, stride, false); arm(half, -stride, true); }
    return;
  }

  // ------------------------------------------------------------------ the head
  const by = -lift;
  const hy = -28 + by; // top of the head
  // the head's outline rows: a rounded box 12 wide, 12 tall
  const rows = [8, 10, 12, 12, 12, 12, 12, 12, 12, 11, 10, 8];
  rows.forEach((w, i) => {
    const x0 = -Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x++) {
      const t = (x + 6) / 12;
      let c = t < 0.3 ? skin[3] : t < 0.75 ? skin[2] : skin[1];
      if (side) c = (dir > 0 ? t < 0.6 : t > 0.4) ? skin[2] : skin[1];
      if (i >= 10) c = skin[1];
      R(x, hy + i, 1, 1, c);
    }
  });
  R(-2, hy + 12, 4, 1, skin[1]); // the neck
  const hatStyle = ['hat', 'tophat', 'cap', 'captain', 'hardhat'].includes(style) || a.hat;
  // --- the face
  if (!up) {
    const ey = hy + 6;
    // ears
    if (side) { R(-dir * 3 - (dir > 0 ? 1 : 0), ey - 1, 2, 3, skin[1]); R(-dir * 3 - (dir > 0 ? 1 : 0), ey, 1, 1, skin[0]); }
    else { R(-7, ey - 1, 1, 3, skin[1]); R(6, ey - 1, 1, 3, skin[0]); }
    const eyes = side ? [dir > 0 ? 3 : -4] : [-4, 2];
    for (const ex of eyes) {
      if (o.sleeping) { R(ex, ey + 1, 2, 1, INK); continue; }
      R(ex, ey, 2, 2, '#f8f6f2'); // the white
      R(side ? ex + (dir > 0 ? 1 : 0) : ex + (ex < 0 ? 1 : 0), ey, 1, 2, '#1e1a26'); // the pupil
      R(side ? ex + (dir > 0 ? 1 : 0) : ex + (ex < 0 ? 1 : 0), ey, 1, 1, '#3a3450');
    }
    // brows, a nose, a mouth, a touch of colour in the cheeks
    const brow = mix(a.hair || '#333333', INK, 0.25);
    if (!o.sleeping) for (const ex of eyes) R(ex, ey - 2 + (o.angry ? (side ? 0 : ex < 0 ? 1 : 0) : 0), 2, 1, brow);
    if (o.angry && !side) { R(-2, ey - 1, 1, 1, brow); R(1, ey - 1, 1, 1, brow); }
    if (side) { R(dir > 0 ? 5 : -7, ey + 1, 2, 2, skin[2]); R(dir > 0 ? 6 : -7, ey + 2, 1, 1, skin[1]); }
    else { R(0, ey + 2, 1, 1, skin[1]); R(-5, ey + 2, 1, 1, mix(a.skin || '#e8b896', '#e05a5a', 0.3)); R(4, ey + 2, 1, 1, mix(a.skin || '#e8b896', '#e05a5a', 0.3)); }
    if (!a.beard && !a.moustache) {
      if (side) R(dir > 0 ? 3 : -4, ey + 4, 2, 1, o.angry ? '#7a2a24' : skin[0]);
      else R(-1, ey + 4, 3, 1, o.angry ? '#7a2a24' : skin[0]);
    }
    if (a.moustache) { const m = a.moustacheColor || a.beard || a.hair || '#4a3a2a'; if (side) R(dir > 0 ? 2 : -5, ey + 3, 4, 1, m); else { R(-3, ey + 3, 6, 1, m); R(-3, ey + 4, 1, 1, m); R(2, ey + 4, 1, 1, m); } }
    if (a.beard) {
      const b = ramp(a.beard);
      if (side) { R(dir > 0 ? -1 : -5, ey + 2, 6, 4, b[2]); R(dir > 0 ? 1 : -4, ey + 5, 4, 1, b[1]); }
      else { R(-6, ey + 2, 2, 3, b[1]); R(4, ey + 2, 2, 3, b[1]); R(-5, ey + 3, 10, 3, b[2]); R(-3, ey + 6, 6, 1, b[1]); R(-4, ey + 3, 3, 1, b[3]); R(-1, ey + 3, 3, 1, skin[0]); }
    }
    // eyewear
    if (acc.has('glasses')) {
      const rim = '#2a2430';
      if (side) { R(dir > 0 ? 2 : -5, ey - 1, 4, 1, rim); R(dir > 0 ? 2 : -5, ey + 2, 4, 1, rim); R(dir > 0 ? 5 : -5, ey, 1, 2, rim); R(dir > 0 ? -2 : -1, ey, 4, 1, rim); }
      else { for (const ex of [-5, 1]) { R(ex, ey - 1, 4, 1, rim); R(ex, ey + 2, 4, 1, rim); R(ex, ey, 1, 2, rim); R(ex + 3, ey, 1, 2, rim); } R(-1, ey, 2, 1, rim); }
    }
    if (acc.has('shades')) { if (side) R(dir > 0 ? 2 : -5, ey, 4, 2, '#141218'); else { R(-5, ey, 4, 2, '#141218'); R(1, ey, 4, 2, '#141218'); R(-1, ey, 2, 1, '#141218'); R(-4, ey, 1, 1, '#5a5a6a'); R(2, ey, 1, 1, '#5a5a6a'); } }
    if (acc.has('monocle') && !side) { R(1, ey - 1, 4, 1, '#d9b24a'); R(1, ey + 2, 4, 1, '#d9b24a'); R(0, ey, 1, 2, '#d9b24a'); R(4, ey, 1, 2, '#d9b24a'); R(4, ey + 3, 1, 3, '#d9b24a'); }
    if (acc.has('goggles')) { R(-6, ey - 2, 12, 1, '#5b4a3a'); if (!side) { const gc = ramp(a.accent || '#5b7f9a'); for (const ex of [-5, 1]) { R(ex, ey - 3, 4, 3, '#3a2e24'); R(ex + 1, ey - 2, 2, 1, gc[3]); } } }
  }
  // --- hair
  const H = (x, y, w, h, l = 2) => R(x, y, w, h, hair[l]);
  if (style !== 'bald') {
    if (up) {
      H(-5, hy, 10, 1, 3); H(-6, hy + 1, 12, 9, 2); H(-5, hy + 10, 10, 1, 1); H(-4, hy + 1, 3, 1, 4); H(2, hy + 3, 3, 6, 1);
      if (style === 'long' || style === 'ponytail') H(-5, hy + 10, 10, 4, 2);
      if (style === 'ponytail') { H(-1, hy + 10, 2, 6, 1); }
      if (style === 'bun') { H(-2, hy - 3, 4, 4, 2); H(-1, hy - 3, 1, 1, 4); }
    } else if (side) {
      H(-4, hy, 9, 1, 3); H(-6, hy + 1, 12, 3, 2); H(-dir * 6 - (dir > 0 ? 0 : -1) - (dir > 0 ? 0 : 3), hy + 1, 4, 7, 1);
      H(dir > 0 ? -2 : -2, hy + 1, 4, 1, 4);
      if (style === 'long') H(-dir * 6 - (dir > 0 ? 0 : 3), hy + 4, 4, 9, 1);
      if (style === 'ponytail') { H(-dir * 8 - (dir > 0 ? 0 : 2), hy + 3, 3, 7, 1); H(-dir * 7 - (dir > 0 ? 0 : 2), hy + 2, 2, 2, 3); }
      if (style === 'bun') { H(-dir * 5 - (dir > 0 ? 0 : 3), hy - 2, 4, 4, 2); }
      if (style === 'messy' || style === 'curly') { H(-3, hy - 1, 2, 1, 2); H(1, hy - 1, 2, 1, 3); H(dir > 0 ? 3 : -5, hy + 4, 2, 1, 2); }
    } else {
      // a cap of hair over the brow, sides down past the ears
      H(-4, hy, 8, 1, 3); H(-6, hy + 1, 12, 3, 2); H(-6, hy + 4, 2, 4, 1); H(4, hy + 4, 2, 4, 0);
      H(-4, hy + 1, 4, 1, 4); H(-5, hy + 2, 2, 1, 3);
      if (style === 'parted') { R(1, hy + 1, 1, 3, hair[0]); H(2, hy + 4, 3, 1, 2); }
      else if (style === 'messy') { H(-5, hy - 1, 2, 1, 2); H(-1, hy - 1, 2, 1, 3); H(3, hy - 1, 2, 1, 2); H(-3, hy + 4, 2, 1, 2); H(1, hy + 4, 2, 1, 1); }
      else if (style === 'curly') { for (let x = -6; x < 6; x += 2) { H(x, hy - 1, 2, 1, (x / 2) % 2 ? 3 : 2); H(x + 1, hy + 4, 1, 1, 1); } H(-7, hy + 2, 1, 5, 1); H(6, hy + 2, 1, 5, 0); }
      else H(-3, hy + 4, 6, 1, 2); // a fringe
      if (style === 'long' || style === 'ponytail') { H(-7, hy + 3, 2, 9, 1); H(5, hy + 3, 2, 9, 0); }
      if (style === 'bun') { H(-2, hy - 3, 4, 4, 2); H(-1, hy - 3, 1, 1, 4); }
    }
  }
  // --- hats
  const hc = ramp(a.hatColor || a.accent || '#444444');
  if (style === 'hat' || a.hat === 'hat') {
    R(-8, hy + 2, 16, 2, hc[1]); R(-8, hy + 2, 16, 1, hc[2]);
    R(-5, hy - 4, 10, 6, hc[2]); R(-5, hy - 4, 3, 6, hc[3]); R(3, hy - 4, 2, 6, hc[1]); R(-5, hy - 4, 10, 1, hc[4]);
    R(-5, hy, 10, 1, a.hatBand || hc[0]);
  }
  if (style === 'tophat' || a.hat === 'tophat') {
    R(-7, hy + 1, 14, 2, hc[1]); R(-7, hy + 1, 14, 1, hc[2]);
    R(-4, hy - 8, 8, 10, hc[2]); R(-4, hy - 8, 2, 10, hc[3]); R(2, hy - 8, 2, 10, hc[1]); R(-4, hy - 8, 8, 1, hc[4]);
    R(-4, hy - 1, 8, 1, a.hatBand || '#8a2a2a');
  }
  if (style === 'cap' || style === 'captain' || a.hat === 'cap') {
    const c = style === 'captain' ? ramp('#f2efe6') : hc;
    R(-6, hy - 1, 12, 4, c[2]); R(-6, hy - 1, 4, 1, c[4]); R(-5, hy, 3, 2, c[3]); R(3, hy, 3, 3, c[1]);
    if (!up) { if (side) R(dir > 0 ? 4 : -9, hy + 2, 5, 1, style === 'captain' ? '#1e2a3a' : c[0]); else R(-6, hy + 3, 12, 1, style === 'captain' ? '#1e2a3a' : c[0]); }
    if (style === 'captain' && !up) { R(-1, hy, 2, 2, '#c9a24a'); R(-5, hy + 2, 10, 1, '#1e2a3a'); }
  }
  if (style === 'hardhat') {
    const c = ramp('#f2c14e');
    R(-7, hy + 3, 14, 1, c[1]); R(-6, hy - 1, 12, 4, c[2]); R(-6, hy - 1, 4, 1, c[4]); R(-5, hy, 3, 2, c[3]); R(-1, hy - 1, 2, 4, c[1]);
  }
  if (hatStyle && up) { H(-5, hy + 3, 10, 7, 2); H(-4, hy + 3, 3, 1, 3); }
}

// ------------------------------------------------------------------ sprites
const cache = new Map();
const canMake = () => typeof document !== 'undefined';
const BOX = { x: -16, y: -40, w: 32, h: 42 };

const lookKey = (a) => [a.height, a.skin, a.hair, a.hairStyle, a.outfit, a.sleeves, a.legs, a.shoes, a.tie, a.undershirt, a.accessory, (a.accessories || []).join('+'), a.apron, a.overalls, a.beard, a.moustache, a.moustacheColor, a.build, a.hatColor, a.hatBand, a.hat, a.accent, a.pattern, a.patternColor, a.vestColor, a.coat].join('|');

function sprite(a, f, fr, part, o) {
  const key = `${lookKey(a)}#${f}${fr}${part}${o.sleeping ? 's' : ''}${o.angry ? 'a' : ''}`;
  let s = cache.get(key);
  if (s) return s;
  const body = document.createElement('canvas');
  body.width = BOX.w;
  body.height = BOX.h;
  const ctx = body.getContext('2d');
  ctx.translate(-BOX.x, -BOX.y);
  paint((x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }, a, f, fr, part, o);
  // the outline, traced round the silhouette
  const out = document.createElement('canvas');
  out.width = BOX.w;
  out.height = BOX.h;
  const oc = out.getContext('2d');
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) oc.drawImage(body, dx, dy);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = INK;
  oc.fillRect(0, 0, BOX.w, BOX.h);
  oc.globalCompositeOperation = 'source-over';
  oc.drawImage(body, 0, 0);
  // the flash when hit: the same, all white
  const white = document.createElement('canvas');
  white.width = BOX.w;
  white.height = BOX.h;
  const wc = white.getContext('2d');
  wc.drawImage(out, 0, 0);
  wc.globalCompositeOperation = 'source-in';
  wc.fillStyle = '#ffffff';
  wc.fillRect(0, 0, BOX.w, BOX.h);
  s = { cv: out, white };
  if (cache.size > 3000) cache.clear(); // (a wardrobe-changing marathon)
  cache.set(key, s);
  return s;
}

/** The frame for a state: 0 standing, 1..4 through the walk. */
export function walkFrame(s) {
  if (!s.moving) return 0;
  const ph = ((s.animTime || 0) * 11) / Math.PI; // the old walk's half-cycles
  return 1 + (Math.floor(ph * 2) & 3);
}

/**
 * Draw a person with their feet at (s.x, s.y). `held(ctx)` draws whatever they hold (between the
 * body and the head), in the figure's coordinates. Returns false where sprites can't be made.
 */
export function drawPerson(ctx, a, s, held) {
  if (!canMake()) return false;
  const f = s.facing || 'down';
  const fr = walkFrame(s);
  const o = { sleeping: Boolean(s.sleeping), angry: Boolean(a.angry) };
  const scale = s.scale || 1; // (height is drawn into the figure)
  ctx.save();
  ctx.translate(Math.round(s.x), Math.round(s.y));
  if (scale !== 1) ctx.scale(scale, scale);
  // a soft shadow at the feet
  ctx.fillStyle = 'rgba(16,14,36,0.3)';
  ctx.fillRect(-6, -1, 12, 2); ctx.fillRect(-5, 1, 10, 1); ctx.fillRect(-4, -2, 8, 1);
  const pick = (sp) => (s.flash ? sp.white : sp.cv);
  const L = Math.max(-2, Math.min(2, Math.round(((a.height || 1) - 1) * 14)));
  const holdIt = held ? (c) => { c.save(); c.translate(0, -L); held(c); c.restore(); } : null;
  ctx.drawImage(pick(sprite(a, f, fr, 'body', o)), BOX.x, BOX.y);
  const front = f === 'down' || f === 'left' || f === 'right';
  if (holdIt && !front) holdIt(ctx);
  ctx.drawImage(pick(sprite(a, f, fr, 'head', o)), BOX.x, BOX.y);
  if (holdIt && front) holdIt(ctx);
  if (o.angry && !o.sleeping) {
    // steam
    const tt = s.idleTime || s.animTime || 0;
    for (let k = 0; k < 3; k++) {
      const ph = (tt * 0.9 + k / 3) % 1;
      ctx.fillStyle = `rgba(240,235,235,${(0.55 * (1 - ph)).toFixed(2)})`;
      ctx.fillRect((k - 1) * 3, Math.round(-31 - L - ph * 7), 2, 2);
    }
  }
  ctx.restore();
  return true;
}

/** For the tests: paint a figure into a recorder and return the rectangles. */
export function paintPersonForTest(a, f, fr, part, o = {}) {
  const rects = [];
  paint((x, y, w, h, c) => rects.push([x, y, w, h, c]), a, f, fr, part, o);
  return rects;
}
export const PERSON_BOX = BOX;
