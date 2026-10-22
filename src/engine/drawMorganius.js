// Morganius Spade at the table (v0.54.0): the big, living version of him — the one sitting across
// the felt from you in the first-person table scenes, drawn from the owner's photo: the tall
// charcoal hat with its silver embroidery and its tip bent over, dark hair, a knowing smile, the
// high-collared robe with runes down its edges, the gold amulet with the purple gem.
//
// He's painted every frame into a small canvas (the art: 200 × 190 pixels) and blown up without
// smoothing, so he's in the game's own chunky pixels, as big as the scene wants him. He breathes,
// floats, blinks, follows what's happening with his eyes, tilts his head, raises his brows, talks
// when he's speaking, grins when you win, smirks when you lose. His arms are two-bone limbs with
// elbows (solved each frame) whose hands ease toward wherever his current pose wants them: resting
// and weaving over the table, flicking a card to a place on the felt, holding a cascade of cards
// between his hands, raised to conjure, flung wide in triumph, shrugging. Card effects are drawn by
// the scenes in screen space from where he says his hands are (`draw` returns them).

const W = 200;
const H = 190;
const SKIN = ['#8a5a44', '#b8846a', '#e2b294', '#f0c8aa', '#f8dcc4'];
const ROBE = ['#121218', '#1c1c24', '#2c2c36', '#3a3a46', '#4a4a58'];
const HAT = ['#1a1a20', '#26262e', '#34343e', '#44444e', '#56565f'];
const SILVER = '#b8b8c4';
const SILVER_HI = '#e4e4ee';
const HAIR = '#2e2018';
const PURPLE = '#b05af0';
const GOLD = '#c9a24a';
const GOLD_HI = '#f0d070';

/** Where each pose wants his hands (art coordinates), and how he holds himself. */
const POSES = {
  idle: { L: [68, 150], R: [132, 150], brow: 0, mouth: 'smile', tilt: 0, shrug: 0 },
  deal: { L: [64, 152], R: [150, 140], brow: 0.3, mouth: 'smile', tilt: 0.04, shrug: 0 },
  shuffle: { L: [54, 146], R: [146, 146], brow: 0.5, mouth: 'smile', tilt: 0, shrug: 0 },
  conjure: { L: [40, 104], R: [160, 104], brow: 1, mouth: 'o', tilt: 0, shrug: 0 },
  roulette: { L: [68, 152], R: [154, 132], brow: 0.6, mouth: 'smile', tilt: 0.06, shrug: 0 },
  win: { L: [30, 128], R: [170, 128], brow: 1, mouth: 'grin', tilt: -0.05, shrug: 0 },
  big_win: { L: [46, 62], R: [154, 62], brow: 1, mouth: 'grin', tilt: 0, shrug: 0 },
  lose: { L: [52, 146], R: [148, 146], brow: -0.4, mouth: 'smirk', tilt: 0.12, shrug: 5 },
  push: { L: [68, 152], R: [128, 58], brow: 0.4, mouth: 'smile', tilt: -0.08, shrug: 0 },
  think: { L: [68, 152], R: [114, 112], brow: -0.2, mouth: 'flat', tilt: 0.08, shrug: 0 },
  point: { L: [68, 152], R: [126, 160], brow: 0.6, mouth: 'smile', tilt: 0.03, shrug: 0 },
};
const SHOULDER_L = [56, 124];
const SHOULDER_R = [144, 124];
const UPPER = 36;
const FORE = 36;

/** Two-bone reach: the elbow for a hand at `hand` from a shoulder, bending outward (`side` ±1). */
function elbow(sh, hand, side) {
  const dx = hand[0] - sh[0];
  const dy = hand[1] - sh[1];
  let d = Math.hypot(dx, dy);
  const max = UPPER + FORE - 0.5;
  const k = d > max ? max / d : 1;
  const hx = sh[0] + dx * k;
  const hy = sh[1] + dy * k;
  d = Math.min(d, max);
  const a = Math.atan2(hy - sh[1], hx - sh[0]);
  const cos = Math.max(-1, Math.min(1, (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d)));
  const b = Math.acos(cos) * side;
  return { e: [sh[0] + Math.cos(a + b) * UPPER, sh[1] + Math.sin(a + b) * UPPER], h: [hx, hy] };
}

export class MorganiusPuppet {
  constructor() {
    this.cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.cv) { this.cv.width = W; this.cv.height = H; }
    this.pose = 'idle';
    this.poseAt = 0;
    this.hold = 0; // the pose lasts until then, then he goes back to idle
    this.hand = { L: [...POSES.idle.L], R: [...POSES.idle.R] };
    this.brow = 0;
    this.tilt = 0;
    this.shrug = 0;
    this.look = [0, 0]; // where his eyes are turned (-1..1)
    this.lookAt = null;
    this.talkUntil = 0;
    this.deals = []; // { at, to: [x, y] art, dur }
    this.blinkAt = 2;
    this.t = 0;
  }

  /** Strike a pose for `secs` (0: until told otherwise). */
  setPose(name, t, secs = 1.6) {
    if (!POSES[name]) name = 'idle';
    this.pose = name;
    this.poseAt = t;
    this.hold = secs ? t + secs : Infinity;
  }

  /** Talk (his mouth moves) until `until`. */
  talk(until) {
    this.talkUntil = Math.max(this.talkUntil, until);
  }

  /** Look toward a point on screen (set each frame by the scene, or null to look at you). */
  lookToward(p) {
    this.lookAt = p;
  }

  /** Flick a card toward a point on screen: his right hand winds back and throws. */
  deal(t, screenTo) {
    this.deals.push({ at: t, to: screenTo, dur: 0.42 });
    if (this.deals.length > 6) this.deals.shift();
  }

  /** The art → screen mapping of the last frame. */
  toScreen(p) {
    const m = this.map;
    return m ? { x: m.x + p[0] * m.k, y: m.y + p[1] * m.k } : { x: p[0], y: p[1] };
  }

  toArt(p) {
    const m = this.map;
    return m ? [(p.x - m.x) / m.k, (p.y - m.y) / m.k] : [p.x, p.y];
  }

  update(t) {
    const dt = Math.min(0.05, Math.max(0, t - this.t));
    this.t = t;
    if (t > this.hold && this.pose !== 'idle') this.setPose('idle', t, 0);
    const P = POSES[this.pose];
    const ease = 1 - Math.pow(0.0008, dt); // quick and smooth
    // hands: the pose's place, with a little life in them
    const wobble = (k) => [Math.sin(t * 1.7 + k) * 2.2, Math.cos(t * 2.3 + k * 2) * 1.6];
    const want = { L: [...P.L], R: [...P.R] };
    if (this.pose === 'idle') { // weaving the air over the felt
      want.L[0] += Math.sin(t * 1.3) * 6; want.L[1] += Math.cos(t * 1.9) * 4;
      want.R[0] += Math.sin(t * 1.1 + 2) * 6; want.R[1] += Math.cos(t * 1.6 + 1) * 4;
    }
    if (this.pose === 'shuffle') { want.L[0] += Math.sin(t * 9) * 2; want.R[0] -= Math.sin(t * 9) * 2; }
    // a deal in progress takes the right hand: wind back, throw toward the card's place, come home
    const d = this.deals.find((x) => t >= x.at && t < x.at + x.dur);
    if (d) {
      const k = (t - d.at) / d.dur;
      const to = this.toArt(d.to);
      const out = [Math.max(110, Math.min(196, 100 + (to[0] - 100) * 0.55)), Math.max(146, Math.min(162, to[1]))];
      if (k < 0.35) want.R = [158, 132]; // wind back…
      else if (k < 0.6) want.R = out; // …and throw
    }
    for (const s of ['L', 'R']) {
      const w = wobble(s === 'L' ? 0 : 3);
      const target = [want[s][0] + w[0] * (this.pose === 'idle' ? 0.6 : 0.3), want[s][1] + w[1] * 0.4];
      const sp = d && s === 'R' ? 0.45 : ease;
      this.hand[s][0] += (target[0] - this.hand[s][0]) * sp;
      this.hand[s][1] += (target[1] - this.hand[s][1]) * sp;
    }
    this.brow += (P.brow - this.brow) * ease;
    this.tilt += (P.tilt + Math.sin(t * 0.7) * 0.025 - this.tilt) * ease * 0.6;
    this.shrug += (P.shrug - this.shrug) * ease;
    // eyes: toward what's happening, or at you
    let lx = 0;
    let ly = 0.15;
    if (this.lookAt && this.map) {
      const a = this.toArt(this.lookAt);
      lx = Math.max(-1, Math.min(1, (a[0] - 100) / 90));
      ly = Math.max(-1, Math.min(1, (a[1] - 80) / 90));
    }
    this.look[0] += (lx - this.look[0]) * ease * 0.5;
    this.look[1] += (ly - this.look[1]) * ease * 0.5;
    if (t > this.blinkAt + 0.14) this.blinkAt = t + 2 + ((Math.sin(t * 12.9898) * 43758.5453) % 1 + 1) % 1 * 3.5;
  }

  /**
   * Draw him with the bottom of his art at `baseY` (the far edge of the table hides his waist),
   * centred on `cx`, `k` screen pixels to an art pixel. Returns his hands and head on screen.
   */
  draw(ctx, cx, baseY, k, t, { alpha = 1 } = {}) {
    this.update(t);
    const bob = Math.sin(t * 2.1) * 2.4;
    this.map = { x: cx - (W / 2) * k, y: baseY - H * k + bob * k, k };
    const out = { lh: this.toScreen(this.hand.L), rh: this.toScreen(this.hand.R), head: this.toScreen([100, 80]), k };
    if (!this.cv) return out;
    const g = this.cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    this.paint(g, t);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    // a purple glow behind him
    const gl = ctx.createRadialGradient(cx, this.map.y + 110 * k, 10 * k, cx, this.map.y + 110 * k, 120 * k);
    gl.addColorStop(0, 'rgba(176,90,240,0.22)');
    gl.addColorStop(1, 'rgba(176,90,240,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(cx - 130 * k, this.map.y, 260 * k, H * k);
    ctx.drawImage(this.cv, Math.round(this.map.x), Math.round(this.map.y), Math.round(W * k), Math.round(H * k));
    ctx.restore();
    return out;
  }

  // ---------------------------------------------------------------- painting (art pixels)
  paint(g, t) {
    const P = POSES[this.pose];
    const breathe = Math.sin(t * 1.4) * 1.2;
    const sy = this.shrug;
    // --- the robe: shoulders to the table, the collar standing up behind his head
    g.fillStyle = ROBE[1];
    g.beginPath();
    g.moveTo(44, 120 - sy); g.quadraticCurveTo(100, 104 - sy + breathe, 156, 120 - sy);
    g.lineTo(168, 190); g.lineTo(32, 190); g.closePath(); g.fill();
    // light from the upper left
    g.fillStyle = ROBE[2];
    g.beginPath(); g.moveTo(46, 122 - sy); g.quadraticCurveTo(70, 112 - sy, 96, 110 - sy); g.lineTo(90, 190); g.lineTo(36, 190); g.closePath(); g.fill();
    g.fillStyle = ROBE[3];
    g.beginPath(); g.moveTo(50, 124 - sy); g.quadraticCurveTo(64, 118 - sy, 80, 114 - sy); g.lineTo(70, 190); g.lineTo(44, 190); g.closePath(); g.fill();
    // the high collar
    for (const s of [-1, 1]) {
      g.fillStyle = s < 0 ? ROBE[2] : ROBE[1];
      g.beginPath();
      g.moveTo(100 + s * 18, 118 - sy); g.lineTo(100 + s * 40, 86 - sy * 0.5); g.lineTo(100 + s * 44, 112 - sy); g.lineTo(100 + s * 30, 128 - sy); g.closePath(); g.fill();
      g.strokeStyle = ROBE[0];
      g.lineWidth = 1;
      g.stroke();
    }
    // the shirt beneath: deep navy, embroidered
    g.fillStyle = '#1a2036';
    g.beginPath(); g.moveTo(84, 116 - sy); g.lineTo(116, 116 - sy); g.lineTo(108, 190); g.lineTo(92, 190); g.closePath(); g.fill();
    g.fillStyle = '#2e3a5a';
    for (let y = 124; y < 188; y += 7) { g.fillRect(96, y, 1, 3); g.fillRect(103, y + 3, 1, 3); g.fillRect(99, y + 1, 2, 1); }
    // rune trim down the front edges of the robe
    for (const s of [-1, 1]) {
      const x0 = 100 + s * 17;
      g.fillStyle = '#0e0e14';
      g.beginPath(); g.moveTo(x0 - 3, 118 - sy); g.lineTo(x0 + 3, 118 - sy); g.lineTo(x0 + s * 6 + 3, 190); g.lineTo(x0 + s * 6 - 3, 190); g.closePath(); g.fill();
      g.fillStyle = SILVER;
      for (let y = 124; y < 188; y += 6) {
        const x = x0 + s * ((y - 118) / 72) * 6;
        const rune = Math.floor(y / 6) % 4;
        if (rune === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y + 1, 1, 2); }
        else if (rune === 1) { g.fillRect(x - 1, y, 1, 3); g.fillRect(x + 1, y, 1, 3); g.fillRect(x, y + 1, 1, 1); }
        else if (rune === 2) { g.fillRect(x - 1, y + 2, 3, 1); g.fillRect(x, y, 1, 2); }
        else { g.fillRect(x - 1, y, 1, 1); g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 1, y + 2, 1, 1); }
      }
    }
    // the amulet: a gold eye, a purple gem, a glint that travels
    const ay = 140 - sy * 0.5;
    g.fillStyle = '#6a5014';
    g.beginPath(); g.ellipse(100, ay, 12, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = GOLD;
    g.beginPath(); g.ellipse(100, ay, 11, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = GOLD_HI;
    g.fillRect(92, ay - 5, 6, 1);
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.6);
    g.fillStyle = '#4a1a6a';
    g.beginPath(); g.moveTo(100, ay - 6); g.lineTo(106, ay); g.lineTo(100, ay + 6); g.lineTo(94, ay); g.closePath(); g.fill();
    g.fillStyle = `rgba(200,120,255,${pulse})`;
    g.beginPath(); g.moveTo(100, ay - 4); g.lineTo(103, ay); g.lineTo(100, ay + 4); g.lineTo(97, ay); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    if (Math.sin(t * 1.3) > 0.85) g.fillRect(101, ay - 3, 1, 1);
    g.strokeStyle = GOLD;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(90, ay - 4); g.lineTo(84, 118 - sy); g.moveTo(110, ay - 4); g.lineTo(116, 118 - sy); g.stroke();

    // --- the head (tilting about the neck)
    g.save();
    g.translate(100, 104 - sy * 0.6);
    g.rotate(this.tilt);
    g.translate(-100, -104);
    // neck
    g.fillStyle = SKIN[1];
    g.fillRect(92, 96, 16, 16);
    // hair at the back and sides
    g.fillStyle = HAIR;
    g.beginPath(); g.ellipse(100, 74, 25, 26, 0, Math.PI * 0.9, Math.PI * 2.1); g.fill();
    g.fillRect(75, 62, 6, 26); g.fillRect(119, 62, 6, 26);
    // face
    const fg = g.createLinearGradient(78, 0, 124, 0);
    fg.addColorStop(0, SKIN[3]); fg.addColorStop(0.55, SKIN[2]); fg.addColorStop(1, SKIN[1]);
    g.fillStyle = fg;
    g.beginPath();
    g.moveTo(79, 62); g.quadraticCurveTo(78, 92, 92, 102); g.quadraticCurveTo(100, 106, 108, 102); g.quadraticCurveTo(122, 92, 121, 62); g.closePath(); g.fill();
    // ears
    g.fillStyle = SKIN[2];
    g.beginPath(); g.ellipse(78, 78, 3, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = SKIN[1];
    g.beginPath(); g.ellipse(122, 78, 3, 6, 0, 0, Math.PI * 2); g.fill();
    // the jaw's shadow, the cheekbones' light
    g.fillStyle = 'rgba(138,90,68,0.35)';
    g.beginPath(); g.moveTo(84, 92); g.quadraticCurveTo(100, 108, 116, 92); g.quadraticCurveTo(100, 102, 84, 92); g.fill();
    g.fillStyle = 'rgba(255,232,210,0.35)';
    g.fillRect(85, 82, 6, 2); g.fillRect(110, 82, 4, 2);
    // eyebrows
    const browY = 68 - this.brow * 2.5;
    g.fillStyle = HAIR;
    for (const s of [-1, 1]) {
      g.beginPath();
      const x0 = 100 + s * 5;
      const x1 = 100 + s * 18;
      g.moveTo(x0, browY + 2 + (s > 0 ? this.brow * -0.5 : 0)); g.quadraticCurveTo((x0 + x1) / 2, browY - 2 - this.brow, x1, browY + 1);
      g.lineTo(x1, browY + 3); g.quadraticCurveTo((x0 + x1) / 2, browY, x0, browY + 4); g.closePath(); g.fill();
    }
    // eyes: whites, the irises looking about, a glint; a blink now and then
    const blinking = t > this.blinkAt && t < this.blinkAt + 0.14;
    const happy = P.mouth === 'grin';
    for (const s of [-1, 1]) {
      const ex = 100 + s * 11;
      const ey = 76;
      if (blinking || happy) {
        g.fillStyle = '#3a2420';
        g.fillRect(ex - 5, ey + (happy ? -1 : 0), 10, 2);
        if (happy) { g.fillRect(ex - 6, ey + 1, 2, 1); g.fillRect(ex + 4, ey + 1, 2, 1); }
        continue;
      }
      g.fillStyle = '#f6f2ee';
      g.beginPath(); g.ellipse(ex, ey, 5.5, 3.6, 0, 0, Math.PI * 2); g.fill();
      const ix = ex + this.look[0] * 2.6;
      const iy = ey + this.look[1] * 1.4;
      g.fillStyle = '#5a3a2a';
      g.beginPath(); g.arc(ix, iy, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1010';
      g.beginPath(); g.arc(ix, iy, 1.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.fillRect(Math.round(ix) - 1, Math.round(iy) - 2, 1, 1);
      // the lid's line and a touch of purple in the eye when he's at work
      g.fillStyle = '#3a2420';
      g.fillRect(ex - 6, ey - 4, 12, 1);
      if (this.pose === 'conjure' || this.pose === 'shuffle') { g.fillStyle = 'rgba(200,120,255,0.55)'; g.beginPath(); g.arc(ix, iy, 2.2, 0, Math.PI * 2); g.fill(); }
    }
    // nose
    g.fillStyle = SKIN[1];
    g.beginPath(); g.moveTo(101, 76); g.quadraticCurveTo(105, 86, 102, 90); g.lineTo(98, 90); g.quadraticCurveTo(100, 86, 99, 78); g.fill();
    g.fillStyle = SKIN[4];
    g.fillRect(98, 80, 1, 6);
    // the mouth: smiling, grinning, smirking, an "o", or talking
    const talking = t < this.talkUntil;
    const open = talking ? Math.max(0, Math.sin(t * 17)) * 3.2 + (Math.sin(t * 7.3) > 0.4 ? 1 : 0) : 0;
    g.fillStyle = '#6a2a24';
    const mouth = talking ? 'talk' : P.mouth;
    if (mouth === 'grin') {
      g.beginPath(); g.moveTo(89, 93); g.quadraticCurveTo(100, 103, 111, 93); g.quadraticCurveTo(100, 97, 89, 93); g.fill();
      g.fillStyle = '#f4f0e8';
      g.fillRect(93, 94, 14, 2);
    } else if (mouth === 'smirk') {
      g.fillRect(93, 95, 10, 1); g.fillRect(103, 93, 4, 2); g.fillRect(106, 92, 2, 1);
    } else if (mouth === 'o') {
      g.beginPath(); g.ellipse(100, 95, 3, 4, 0, 0, Math.PI * 2); g.fill();
    } else if (mouth === 'flat') {
      g.fillRect(93, 95, 14, 1);
    } else if (mouth === 'talk') {
      g.beginPath(); g.ellipse(100, 95 + open * 0.3, 6, 1 + open, 0, 0, Math.PI * 2); g.fill();
      if (open > 2) { g.fillStyle = '#f4f0e8'; g.fillRect(96, 94, 8, 1); }
    } else {
      // his smile: one corner higher, the knowing one
      g.beginPath(); g.moveTo(91, 94); g.quadraticCurveTo(100, 99, 109, 92); g.lineTo(109, 93); g.quadraticCurveTo(100, 101, 91, 95); g.closePath(); g.fill();
    }
    // --- the hat: the brim, the cone, the bent tip (it sways), silver embroidery and its band
    const sway = Math.sin(t * 1.2) * 2;
    g.fillStyle = HAT[0];
    g.beginPath(); g.ellipse(100, 60, 54, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = HAT[2];
    g.beginPath(); g.ellipse(100, 58, 53, 9, 0, Math.PI, Math.PI * 2); g.fill();
    g.fillStyle = HAT[3];
    g.beginPath(); g.ellipse(84, 56, 30, 5, 0, Math.PI, Math.PI * 2); g.fill();
    const cone = g.createLinearGradient(70, 0, 130, 0);
    cone.addColorStop(0, HAT[3]); cone.addColorStop(0.45, HAT[2]); cone.addColorStop(1, HAT[1]);
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(68, 58);
    g.quadraticCurveTo(80, 30, 92, 12);
    g.quadraticCurveTo(104 + sway * 0.3, -2, 122 + sway, 6); // the tip bends over to his left
    g.quadraticCurveTo(128 + sway, 10, 124 + sway, 14);
    g.quadraticCurveTo(114, 12, 110, 22);
    g.quadraticCurveTo(122, 40, 132, 58);
    g.closePath(); g.fill();
    g.strokeStyle = HAT[0];
    g.lineWidth = 1;
    g.stroke();
    // the band, worked with diamonds
    g.fillStyle = HAT[0];
    g.beginPath(); g.moveTo(69, 56); g.quadraticCurveTo(100, 50, 131, 56); g.lineTo(130, 49); g.quadraticCurveTo(100, 43, 72, 49); g.closePath(); g.fill();
    g.fillStyle = SILVER;
    for (let x = 76; x < 126; x += 7) { const y = 50 - Math.sin(((x - 70) / 60) * Math.PI) * 3 + 2; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1); }
    // the embroidery: an arch, a scrolling vine, a diamond
    g.strokeStyle = SILVER;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(84, 44); g.quadraticCurveTo(100, 22, 116, 44); g.stroke();
    g.beginPath(); g.moveTo(90, 44); g.quadraticCurveTo(100, 30, 110, 44); g.stroke();
    g.beginPath(); g.moveTo(100, 26); g.quadraticCurveTo(94, 18, 98, 12); g.quadraticCurveTo(104, 16, 100, 26); g.stroke();
    g.fillStyle = SILVER_HI;
    g.fillRect(99, 34, 2, 2); g.fillRect(98, 35, 4, 1);
    g.fillRect(88, 41, 1, 1); g.fillRect(111, 41, 1, 1);
    g.restore();

    // --- the arms: sleeves flaring to the cuff, rune-trimmed; the hands
    for (const s of ['L', 'R']) {
      const side = s === 'L' ? -1 : 1;
      const sh = s === 'L' ? [SHOULDER_L[0], SHOULDER_L[1] - sy] : [SHOULDER_R[0], SHOULDER_R[1] - sy];
      const { e, h } = elbow(sh, this.hand[s], side);
      const tone = s === 'L' ? ROBE[2] : ROBE[1];
      const limb = (a, b, w0, w1, col) => {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(a[0] + nx * w0, a[1] + ny * w0); g.lineTo(b[0] + nx * w1, b[1] + ny * w1);
        g.lineTo(b[0] - nx * w1, b[1] - ny * w1); g.lineTo(a[0] - nx * w0, a[1] - ny * w0); g.closePath(); g.fill();
        g.beginPath(); g.arc(a[0], a[1], w0, 0, Math.PI * 2); g.fill();
      };
      limb(sh, e, 10, 8, tone);
      limb(e, h, 8, 12, tone);
      // the cuff and its runes
      const ang = Math.atan2(h[1] - e[1], h[0] - e[0]);
      const cx = h[0] - Math.cos(ang) * 4;
      const cy = h[1] - Math.sin(ang) * 4;
      g.save();
      g.translate(cx, cy);
      g.rotate(ang);
      g.fillStyle = '#0e0e14';
      g.fillRect(-3, -12, 5, 24);
      g.fillStyle = SILVER;
      for (let k = -10; k < 10; k += 4) g.fillRect(-1, k, 1, 2);
      g.restore();
      // the hand: a palm and four fingers along the forearm, a thumb; fingers spread when he's casting
      const spread = this.pose === 'conjure' || this.pose === 'win' || this.pose === 'big_win' ? 0.32 : this.pose === 'lose' ? 0.25 : 0.14;
      g.save();
      g.translate(h[0], h[1]);
      g.rotate(ang);
      g.fillStyle = SKIN[s === 'L' ? 3 : 2];
      g.beginPath(); g.ellipse(5, 0, 7.5, 6.5, 0, 0, Math.PI * 2); g.fill();
      for (let f = 0; f < 4; f++) {
        const fa = (f - 1.5) * spread;
        g.save();
        g.translate(10, (f - 1.5) * 2.8);
        g.rotate(fa);
        g.fillStyle = SKIN[f % 2 ? 2 : 3];
        g.fillRect(0, -1.5, 8 - Math.abs(f - 1.5) * 1.5, 3);
        g.restore();
      }
      g.fillStyle = SKIN[2];
      g.save(); g.translate(5, side * -5); g.rotate(side * -0.9); g.fillRect(0, -1.5, 7, 3); g.restore();
      g.restore();
      // the glow in his palms when he's working magic
      if (this.pose === 'conjure' || this.pose === 'shuffle' || this.pose === 'big_win') {
        g.fillStyle = `rgba(200,120,255,${0.35 + 0.25 * Math.sin(t * 8 + side)})`;
        g.beginPath(); g.arc(h[0] + Math.cos(ang) * 6, h[1] + Math.sin(ang) * 6, 7, 0, Math.PI * 2); g.fill();
      }
    }
  }
}

/** Where his base goes in a table scene: the far edge of the felt hides his waist. */
export function hostPlacement(c) {
  const far = c.horizon + (c.near - c.horizon) / 2.6; // v = 1 in the scenes' camera (DEPTH 1.6)
  const baseY = far + c.H * 0.035;
  const k = Math.max(1.2, (baseY - c.H * 0.035) / H);
  return { cx: c.W / 2, baseY, k };
}

