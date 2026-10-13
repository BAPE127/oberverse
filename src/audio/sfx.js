// Procedural sound effects. Each function schedules a short sound on `dest`.
import { getNoise } from './synth.js';

function tone(ctx, dest, { type = 'sine', f0, f1 = f0, t = ctx.currentTime, dur = 0.1, vol = 0.2, attack = 0.005 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(ctx, dest, { t = ctx.currentTime, dur = 0.1, vol = 0.2, type = 'bandpass', freq = 1000, q = 1, f1 }) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random(), dur + 0.05);
}

export function gullCall(ctx, dest, t = ctx.currentTime, vol = 0.06) {
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.22;
    tone(ctx, dest, { type: 'triangle', f0: 1400 + Math.random() * 200, f1: 900, t: s, dur: 0.18, vol });
  }
}

const SURFACE_PITCH = { grass: 500, 'dirt path': 650, sand: 420, 'wood floor': 900, 'pier planks': 800, bridge: 820, 'tile floor': 1300, carpet: 380, paving: 1100, road: 1000, concrete: 1150, doorway: 900 };

export const SFX = {
  sfx_step: (ctx, d, o = {}) => noise(ctx, d, { dur: 0.05, vol: 0.05, type: 'bandpass', freq: (SURFACE_PITCH[o.surface] || 800) * (0.9 + Math.random() * 0.2), q: 2 }),
  sfx_door: (ctx, d) => {
    noise(ctx, d, { dur: 0.25, vol: 0.12, type: 'lowpass', freq: 400 });
    tone(ctx, d, { type: 'triangle', f0: 180, f1: 120, dur: 0.15, vol: 0.12 });
  },
  sfx_locked: (ctx, d) => {
    for (let i = 0; i < 3; i++) noise(ctx, d, { t: ctx.currentTime + i * 0.06, dur: 0.04, vol: 0.12, freq: 2500, q: 6 });
  },
  sfx_pickup: (ctx, d) => {
    tone(ctx, d, { f0: 660, dur: 0.08, vol: 0.14 });
    tone(ctx, d, { f0: 990, t: ctx.currentTime + 0.07, dur: 0.12, vol: 0.14 });
  },
  sfx_coin: (ctx, d) => {
    tone(ctx, d, { f0: 1975, dur: 0.07, vol: 0.09 });
    tone(ctx, d, { f0: 2637, t: ctx.currentTime + 0.06, dur: 0.18, vol: 0.09 });
  },
  sfx_ui_click: (ctx, d) => tone(ctx, d, { f0: 900, f1: 700, dur: 0.04, vol: 0.08 }),
  sfx_ui_open: (ctx, d) => tone(ctx, d, { type: 'triangle', f0: 400, f1: 700, dur: 0.1, vol: 0.09 }),
  sfx_ui_close: (ctx, d) => tone(ctx, d, { type: 'triangle', f0: 650, f1: 380, dur: 0.1, vol: 0.08 }),
  sfx_notify: (ctx, d) => {
    tone(ctx, d, { f0: 1046, dur: 0.12, vol: 0.07 });
    tone(ctx, d, { f0: 1318, t: ctx.currentTime + 0.09, dur: 0.18, vol: 0.06 });
  },
  sfx_quest: (ctx, d) => {
    [523, 659, 784, 1046].forEach((f, i) => tone(ctx, d, { type: 'triangle', f0: f, t: ctx.currentTime + i * 0.09, dur: 0.3, vol: 0.1 }));
  },
  sfx_success: (ctx, d) => {
    tone(ctx, d, { type: 'triangle', f0: 587, dur: 0.1, vol: 0.1 });
    tone(ctx, d, { type: 'triangle', f0: 880, t: ctx.currentTime + 0.08, dur: 0.2, vol: 0.1 });
  },
  sfx_fail: (ctx, d) => {
    tone(ctx, d, { type: 'square', f0: 220, f1: 150, dur: 0.25, vol: 0.06 });
  },
  sfx_bang: (ctx, d) => {
    noise(ctx, d, { dur: 0.9, vol: 0.5, type: 'lowpass', freq: 1800, f1: 120 });
    tone(ctx, d, { f0: 90, f1: 35, dur: 0.6, vol: 0.4 });
  },
  sfx_gull: (ctx, d) => gullCall(ctx, d, ctx.currentTime, 0.1),
  sfx_pry: (ctx, d) => {
    noise(ctx, d, { dur: 0.6, vol: 0.2, type: 'bandpass', freq: 3000, f1: 900, q: 8 });
    tone(ctx, d, { type: 'sawtooth', f0: 300, f1: 180, dur: 0.5, vol: 0.05 });
    noise(ctx, d, { t: ctx.currentTime + 0.5, dur: 0.3, vol: 0.25, type: 'lowpass', freq: 600 });
  },
  sfx_page: (ctx, d) => noise(ctx, d, { dur: 0.18, vol: 0.08, type: 'highpass', freq: 3000, f1: 6000 }),
  sfx_eat: (ctx, d) => {
    for (let i = 0; i < 3; i++) noise(ctx, d, { t: ctx.currentTime + i * 0.12, dur: 0.06, vol: 0.08, freq: 1200, q: 3 });
  },
  sfx_sleep: (ctx, d) => {
    [392, 330, 262].forEach((f, i) => tone(ctx, d, { type: 'sine', f0: f, t: ctx.currentTime + i * 0.25, dur: 0.6, vol: 0.08, attack: 0.05 }));
  },
  // ---- combat
  sfx_swing: (ctx, d) => noise(ctx, d, { dur: 0.12, vol: 0.07, type: 'bandpass', freq: 900, f1: 2400, q: 1.5 }),
  sfx_punch: (ctx, d) => {
    noise(ctx, d, { dur: 0.08, vol: 0.22, type: 'lowpass', freq: 700 });
    tone(ctx, d, { type: 'sine', f0: 140, f1: 70, dur: 0.1, vol: 0.2 });
  },
  sfx_whack: (ctx, d) => {
    noise(ctx, d, { dur: 0.1, vol: 0.25, type: 'bandpass', freq: 1300, q: 2 });
    tone(ctx, d, { type: 'triangle', f0: 220, f1: 110, dur: 0.12, vol: 0.16 });
  },
  sfx_slash: (ctx, d) => {
    noise(ctx, d, { dur: 0.16, vol: 0.18, type: 'highpass', freq: 2500, f1: 5000 });
    tone(ctx, d, { type: 'sine', f0: 160, f1: 80, dur: 0.08, vol: 0.12 });
  },
  sfx_gunshot: (ctx, d) => {
    noise(ctx, d, { dur: 0.22, vol: 0.45, type: 'lowpass', freq: 3200, f1: 500 });
    tone(ctx, d, { type: 'square', f0: 120, f1: 40, dur: 0.14, vol: 0.18 });
  },
  sfx_gunshot_heavy: (ctx, d) => {
    noise(ctx, d, { dur: 0.45, vol: 0.55, type: 'lowpass', freq: 2200, f1: 200 });
    tone(ctx, d, { type: 'square', f0: 90, f1: 30, dur: 0.25, vol: 0.22 });
  },
  sfx_gunshot_smg: (ctx, d) => {
    noise(ctx, d, { dur: 0.1, vol: 0.32, type: 'lowpass', freq: 3800, f1: 900 });
    tone(ctx, d, { type: 'square', f0: 150, f1: 60, dur: 0.06, vol: 0.12 });
  },
  sfx_reload: (ctx, d) => {
    noise(ctx, d, { dur: 0.05, vol: 0.12, freq: 2800, q: 5 });
    noise(ctx, d, { t: ctx.currentTime + 0.25, dur: 0.06, vol: 0.14, freq: 1800, q: 6 });
  },
  sfx_dryfire: (ctx, d) => noise(ctx, d, { dur: 0.03, vol: 0.14, freq: 3500, q: 8 }),
  // ---- the Wrath (an imported character is attacked): timed to WRATH in src/systems/combat.js
  sfx_wrath: (ctx, d) => wrathTheme(ctx, d),
  sfx_thunder: (ctx, d) => {
    const t = ctx.currentTime;
    noise(ctx, d, { t, dur: 0.18, vol: 0.6, type: 'highpass', freq: 1800 }); // the crack
    noise(ctx, d, { t: t + 0.02, dur: 2.4, vol: 0.5, type: 'lowpass', freq: 900, f1: 60 }); // the roll
    tone(ctx, d, { type: 'sine', f0: 70, f1: 28, t, dur: 1.6, vol: 0.4, attack: 0.01 });
  },
  sfx_hurt: (ctx, d) => {
    tone(ctx, d, { type: 'sawtooth', f0: 320, f1: 160, dur: 0.18, vol: 0.08 });
    noise(ctx, d, { dur: 0.08, vol: 0.15, type: 'lowpass', freq: 600 });
  },
};

/** Midi note → Hz. */
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

/** One "choir" voice: three detuned saws through two vowel formants ("ah"). */
function choir(ctx, dest, midi, t, dur, vol) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.4));
  out.gain.setValueAtTime(vol, t + dur * 0.8);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 750; f1.Q.value = 4;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 5;
  f1.connect(out); f2.connect(out);
  out.connect(dest);
  for (const det of [-9, 0, 8]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz(midi);
    o.detune.value = det;
    const vib = ctx.createOscillator();
    const vg = ctx.createGain();
    vib.frequency.value = 5 + Math.random();
    vg.gain.value = 4;
    vib.connect(vg).connect(o.detune);
    o.connect(f1); o.connect(f2);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.7); vib.stop(t + dur + 0.7);
  }
}

/** Timpani hit (or roll, when called repeatedly). */
function timp(ctx, dest, t, vol, f = 55) {
  tone(ctx, dest, { type: 'sine', f0: f * 1.6, f1: f, t, dur: 0.9, vol, attack: 0.004 });
  noise(ctx, dest, { t, dur: 0.12, vol: vol * 0.5, type: 'lowpass', freq: 300 });
}

/** Brass stab: sawtooth through a sweeping low-pass. */
function brass(ctx, dest, midis, t, dur, vol) {
  for (const m of midis) {
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = hz(m);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/**
 * "The Oberverse Protects Its Own" — an original 8-second piece: impact, a
 * timpani roll under a D-minor choir and organ pedal, a rune hum, brass stabs,
 * a rising whoosh into the lightning, and a final crash on D major.
 */
function wrathTheme(ctx, dest) {
  const t0 = ctx.currentTime + 0.02;
  const bus = ctx.createGain();
  bus.gain.value = 0.6; // peaks stay under full scale (checked offline)
  bus.connect(dest);
  // 0.0 — impact
  timp(ctx, bus, t0, 0.55, 41);
  noise(ctx, bus, { t: t0, dur: 1.4, vol: 0.25, type: 'lowpass', freq: 1200, f1: 80 });
  // 0.3–3.4 — timpani roll, crescendo
  for (let i = 0; i < 26; i++) {
    const tt = t0 + 0.3 + i * 0.12;
    timp(ctx, bus, tt, 0.05 + (i / 26) * 0.22, 55);
  }
  // organ pedal D1/D2
  for (const m of [26, 38]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = hz(m);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.06, t0 + 0.8);
    g.gain.setValueAtTime(0.06, t0 + 6.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 8);
    o.connect(lp).connect(g).connect(bus);
    o.start(t0); o.stop(t0 + 8.1);
  }
  // rune hum with a slow wobble
  const hum = ctx.createOscillator();
  const hg = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  hum.frequency.value = 110;
  lfo.frequency.value = 3;
  lg.gain.value = 0.03;
  hg.gain.setValueAtTime(0.0001, t0 + 0.3);
  hg.gain.linearRampToValueAtTime(0.06, t0 + 1.5);
  hg.gain.linearRampToValueAtTime(0.0001, t0 + 3.4);
  lfo.connect(lg).connect(hg.gain);
  hum.connect(hg).connect(bus);
  hum.start(t0); lfo.start(t0); hum.stop(t0 + 3.5); lfo.stop(t0 + 3.5);
  // choir: Dm → B♭ → Gm → A (the lightning lands on A), then D major
  const chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]];
  chords.forEach((c, i) => c.forEach((m) => choir(ctx, bus, m, t0 + 0.3 + i * 0.8, 0.9, 0.035)));
  // brass stabs on the way into the strikes
  brass(ctx, bus, [38, 50, 57], t0 + 2.7, 0.35, 0.07);
  brass(ctx, bus, [38, 50, 57], t0 + 3.0, 0.35, 0.08);
  // rising whoosh
  noise(ctx, bus, { t: t0 + 2.2, dur: 1.2, vol: 0.18, type: 'bandpass', freq: 300, f1: 6000, q: 2 });
  // 5.0 — ascension: big D major chord, cymbal wash
  [50, 54, 57, 62, 66].forEach((m) => choir(ctx, bus, m, t0 + 5.0, 1.6, 0.04));
  brass(ctx, bus, [38, 50, 54, 57], t0 + 5.0, 1.4, 0.09);
  timp(ctx, bus, t0 + 5.0, 0.5, 41);
  noise(ctx, bus, { t: t0 + 5.0, dur: 3.0, vol: 0.18, type: 'highpass', freq: 5000 });
  // 6.6 — the last, low toll
  timp(ctx, bus, t0 + 6.6, 0.45, 36);
  tone(ctx, bus, { type: 'triangle', f0: hz(26), t: t0 + 6.6, dur: 1.6, vol: 0.12 });
}

/** A single dialogue "voice" blip using a character's voice parameters. */
export function voiceBlip(ctx, dest, voice) {
  const v = voice || { wave: 'triangle', pitch: 300, variance: 40 };
  const f = v.pitch + (Math.random() * 2 - 1) * (v.variance || 0);
  tone(ctx, dest, { type: v.wave || 'triangle', f0: f, f1: f * 0.92, dur: 0.055, vol: v.wave === 'square' ? 0.035 : 0.07 });
}
