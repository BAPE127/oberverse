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
  sfx_wrath: (ctx, d, o = {}) => wrathTheme(ctx, d, o.theme),
  // Sir Moneybucks's strikes: oil geysers (igniting from the third)
  sfx_gusher: (ctx, d, o = {}) => {
    const t = ctx.currentTime;
    noise(ctx, d, { t, dur: 1.0, vol: 0.9, type: 'lowpass', freq: 180, f1: 1400 });
    for (let i = 0; i < 9; i++) tone(ctx, d, { type: 'sine', f0: 90 + Math.random() * 120, f1: 60, t: t + 0.1 + i * 0.07, dur: 0.08, vol: 0.25 });
    if ((o.index || 0) >= 3) {
      noise(ctx, d, { t: t + 0.05, dur: 0.9, vol: 0.5, type: 'lowpass', freq: 500, f1: 120 }); // whoomph
      noise(ctx, d, { t: t + 0.1, dur: 1.4, vol: 0.18, type: 'bandpass', freq: 900, q: 0.7 }); // crackle
    }
  },
  // Mason's strikes: falling steel I-beams, then the wrecking ball
  sfx_beam: (ctx, d, o = {}) => {
    const t = ctx.currentTime;
    if ((o.index || 0) >= 5) {
      tone(ctx, d, { type: 'sine', f0: 70, f1: 30, t, dur: 1.2, vol: 0.6, attack: 0.005 });
      noise(ctx, d, { t, dur: 1.6, vol: 0.55, type: 'lowpass', freq: 1400, f1: 90 });
      for (let i = 0; i < 14; i++) noise(ctx, d, { t: t + 0.15 + Math.random() * 0.9, dur: 0.05, vol: 0.15, freq: 1800 + Math.random() * 1500, q: 4 });
      return;
    }
    for (const [f, v] of [[330, 0.14], [471, 0.1], [693, 0.08], [947, 0.06], [1302, 0.04]]) tone(ctx, d, { type: 'sine', f0: f, t, dur: 1.3, vol: v, attack: 0.002 });
    noise(ctx, d, { t, dur: 0.35, vol: 0.4, type: 'lowpass', freq: 2200, f1: 200 });
    tone(ctx, d, { type: 'sine', f0: 90, f1: 40, t, dur: 0.5, vol: 0.35 });
  },
  // Chief Order's strikes: squad cars ramming in, then the gavel
  sfx_ram: (ctx, d, o = {}) => {
    const t = ctx.currentTime;
    if ((o.index || 0) >= 5) {
      tone(ctx, d, { type: 'sine', f0: 120, f1: 38, t, dur: 1.1, vol: 0.65, attack: 0.003 }); // the gavel
      noise(ctx, d, { t, dur: 0.12, vol: 0.6, type: 'lowpass', freq: 2400 });
      noise(ctx, d, { t: t + 0.02, dur: 1.4, vol: 0.4, type: 'lowpass', freq: 700, f1: 60 });
      for (const [f, v] of [[196, 0.12], [294, 0.07]]) tone(ctx, d, { type: 'triangle', f0: f, t: t + 0.01, dur: 1.2, vol: v });
      return;
    }
    const sq = Math.max(0, t - 0.25); // the squeal leads the crunch (never scheduled before time zero)
    tone(ctx, d, { type: 'sawtooth', f0: 900, f1: 420, t: sq, dur: t - sq || 0.05, vol: 0.05 }); // tyre squeal
    noise(ctx, d, { t: sq, dur: t - sq || 0.05, vol: 0.12, type: 'bandpass', freq: 2600, q: 3 });
    noise(ctx, d, { t, dur: 0.5, vol: 0.55, type: 'lowpass', freq: 1800, f1: 150 }); // crunch
    tone(ctx, d, { type: 'square', f0: 110, f1: 45, t, dur: 0.3, vol: 0.18 });
    for (let i = 0; i < 8; i++) noise(ctx, d, { t: t + 0.08 + Math.random() * 0.5, dur: 0.04, vol: 0.12, freq: 3000 + Math.random() * 3000, q: 6 }); // glass
  },
  // Arthur's strikes: giant digits slamming down, then the calculator itself
  sfx_digit: (ctx, d, o = {}) => {
    const t = ctx.currentTime;
    if ((o.index || 0) >= 5) {
      tone(ctx, d, { type: 'sine', f0: 90, f1: 35, t, dur: 1.0, vol: 0.6, attack: 0.003 });
      noise(ctx, d, { t, dur: 0.9, vol: 0.45, type: 'lowpass', freq: 1200, f1: 90 });
      for (let i = 0; i < 6; i++) tone(ctx, d, { type: 'square', f0: 220, t: t + 0.2 + i * 0.16, dur: 0.1, vol: 0.05 }); // ERROR buzz
      return;
    }
    tone(ctx, d, { type: 'square', f0: 1800 + (o.index || 0) * 240, t, dur: 0.06, vol: 0.06 }); // a keypad beep
    tone(ctx, d, { type: 'sine', f0: 140, f1: 45, t, dur: 0.5, vol: 0.45, attack: 0.003 });
    noise(ctx, d, { t, dur: 0.4, vol: 0.35, type: 'lowpass', freq: 1600, f1: 150 });
  },
  // Lucas's strikes: crates of guns crashing down, then the missile
  sfx_crate: (ctx, d, o = {}) => {
    const t = ctx.currentTime;
    if ((o.index || 0) >= 5) {
      noise(ctx, d, { t, dur: 0.4, vol: 0.2, type: 'bandpass', freq: 800, f1: 3000, q: 1.5 }); // whoosh
      tone(ctx, d, { type: 'sine', f0: 80, f1: 28, t: t + 0.05, dur: 1.4, vol: 0.65, attack: 0.004 });
      noise(ctx, d, { t: t + 0.05, dur: 1.8, vol: 0.55, type: 'lowpass', freq: 1500, f1: 80 });
      return;
    }
    noise(ctx, d, { t, dur: 0.3, vol: 0.5, type: 'lowpass', freq: 1200, f1: 200 }); // wood
    tone(ctx, d, { type: 'square', f0: 140, f1: 60, t, dur: 0.15, vol: 0.18 });
    for (let i = 0; i < 6; i++) for (const [f, v] of [[1400 + i * 120, 0.05], [2100 + i * 90, 0.03]]) tone(ctx, d, { type: 'sine', f0: f, t: t + 0.08 + i * 0.06 + Math.random() * 0.04, dur: 0.12, vol: v, attack: 0.002 }); // metal clatter
  },
  // heavy weapons (v0.14.0)
  sfx_rocket: (ctx, d) => {
    const t = ctx.currentTime;
    noise(ctx, d, { t, dur: 0.6, vol: 1.2, type: 'bandpass', freq: 600, f1: 2400, q: 1.2 });
    tone(ctx, d, { type: 'sawtooth', f0: 220, f1: 90, t, dur: 0.5, vol: 0.22 });
  },
  sfx_explosion: (ctx, d) => {
    const t = ctx.currentTime;
    tone(ctx, d, { type: 'sine', f0: 90, f1: 26, t, dur: 1.4, vol: 0.6, attack: 0.003 });
    noise(ctx, d, { t, dur: 0.2, vol: 0.55, type: 'lowpass', freq: 3000 });
    noise(ctx, d, { t: t + 0.03, dur: 1.8, vol: 0.45, type: 'lowpass', freq: 1200, f1: 70 });
    for (let i = 0; i < 10; i++) noise(ctx, d, { t: t + 0.2 + Math.random() * 1.0, dur: 0.04, vol: 0.08, freq: 1500 + Math.random() * 2500, q: 4 });
  },
  sfx_drone: (ctx, d) => {
    const t = ctx.currentTime;
    for (const f of [180, 186]) tone(ctx, d, { type: 'sawtooth', f0: f * 0.6, f1: f, t, dur: 0.9, vol: 0.2, attack: 0.2 });
  },
  // v0.16.0: cars
  sfx_car_start: (ctx, d) => {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(ctx, d, { type: 'sawtooth', f0: 38, f1: 52, t: t + i * 0.13, dur: 0.1, vol: 0.18 }); // the starter cranks
    tone(ctx, d, { type: 'sawtooth', f0: 45, f1: 95, t: t + 0.42, dur: 0.5, vol: 0.3, attack: 0.03 }); // and catches
    noise(ctx, d, { t: t + 0.42, dur: 0.45, vol: 0.18, type: 'lowpass', freq: 400 });
  },
  sfx_crash: (ctx, d) => {
    const t = ctx.currentTime;
    noise(ctx, d, { t, dur: 0.35, vol: 0.7, type: 'bandpass', freq: 900, f1: 300, q: 0.8 });
    tone(ctx, d, { type: 'square', f0: 140, f1: 60, t, dur: 0.18, vol: 0.18 });
    for (let i = 0; i < 5; i++) noise(ctx, d, { t: t + 0.05 + Math.random() * 0.3, dur: 0.03, vol: 0.12, freq: 3000 + Math.random() * 3000, q: 6 }); // glass and bits
  },
  sfx_horn: (ctx, d, o) => {
    const t = ctx.currentTime;
    // v0.34.0: the signature cars' horns
    const k = o?.kind;
    if (k === 'kaching') { // a cash register
      noise(ctx, d, { t, dur: 0.06, vol: 0.3, type: 'bandpass', freq: 2500, q: 2 });
      for (const [f, dt] of [[2093, 0.08], [2637, 0.08], [3136, 0.14]]) tone(ctx, d, { type: 'triangle', f0: f, t: t + dt, dur: 0.5, vol: 0.12, attack: 0.002 });
      return;
    }
    if (k === 'reverse') { for (let i = 0; i < 3; i++) tone(ctx, d, { type: 'square', f0: 1050, t: t + i * 0.32, dur: 0.18, vol: 0.09 }); return; } // a reversing beeper
    if (k === 'gavel') { for (const dt of [0, 0.28]) { tone(ctx, d, { type: 'sine', f0: 180, f1: 60, t: t + dt, dur: 0.16, vol: 0.5, attack: 0.001 }); noise(ctx, d, { t: t + dt, dur: 0.05, vol: 0.4, type: 'lowpass', freq: 1400 }); } return; } // ORDER! ORDER!
    if (k === 'pi') { [3, 1, 4, 1, 5, 9, 2, 6].forEach((n, i) => tone(ctx, d, { type: 'square', f0: hz(60 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16][n]), t: t + i * 0.09, dur: 0.08, vol: 0.07 })); return; } // the digits of pi
    if (k === 'theremin') { tone(ctx, d, { type: 'sine', f0: 520, f1: 980, t, dur: 0.35, vol: 0.12 }); tone(ctx, d, { type: 'sine', f0: 980, f1: 470, t: t + 0.35, dur: 0.5, vol: 0.12 }); return; }
    if (k === 'foghorn') { tone(ctx, d, { type: 'sawtooth', f0: 98, t, dur: 1.2, vol: 0.18, attack: 0.08 }); tone(ctx, d, { type: 'sine', f0: 196, t, dur: 1.2, vol: 0.12, attack: 0.08 }); return; }
    if (k === 'moo') { tone(ctx, d, { type: 'sawtooth', f0: 150, f1: 110, t, dur: 0.9, vol: 0.14, attack: 0.1 }); tone(ctx, d, { type: 'sine', f0: 300, f1: 210, t, dur: 0.9, vol: 0.06, attack: 0.1 }); return; }
    // another driver's horn (o.quiet): softer and shorter than yours
    for (const f of [392, 494]) tone(ctx, d, { type: 'square', f0: f, t, dur: o?.quiet ? 0.25 : 0.45, vol: o?.quiet ? 0.05 : 0.12, attack: 0.01 });
  },
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
function wrathTheme(ctx, dest, theme = 'arcane') {
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

  if (theme === 'oil') {
    // ka-ching, then Sir Moneybucks's own "Dividends" motif on brass; at the end, fire and falling coins
    tone(ctx, bus, { type: 'sine', f0: 2637, t: t0 + 1.0, dur: 0.5, vol: 0.12 });
    tone(ctx, bus, { type: 'sine', f0: 3520, t: t0 + 1.06, dur: 0.7, vol: 0.1 });
    noise(ctx, bus, { t: t0 + 0.98, dur: 0.06, vol: 0.2, freq: 3000, q: 4 });
    [[46, 0], [53, 0.16], [58, 0.24], [62, 0.32], [65, 0.48]].forEach(([m, dt]) => brass(ctx, bus, [m, m + 12], t0 + 1.3 + dt, 0.3, 0.06));
    [[46, 0], [58, 0.12], [65, 0.24], [70, 0.4]].forEach(([m, dt]) => brass(ctx, bus, [m, m - 12], t0 + 5.0 + dt, 0.5, 0.07));
    noise(ctx, bus, { t: t0 + 5.0, dur: 2.6, vol: 0.3, type: 'lowpass', freq: 600, f1: 200 });
    for (let i = 0; i < 26; i++) tone(ctx, bus, { type: 'sine', f0: 2200 + Math.random() * 2600, t: t0 + 5.2 + Math.random() * 1.8, dur: 0.12, vol: 0.05 });
  } else if (theme === 'construction') {
    // anvil strikes through the roll, Mason's whistled motif, and clattering bricks
    for (let i = 0; i < 7; i++) for (const [f, v] of [[1180, 0.05], [1690, 0.035], [2410, 0.02]]) tone(ctx, bus, { type: 'sine', f0: f, t: t0 + 0.4 + i * 0.42, dur: 0.35, vol: v, attack: 0.002 });
    [[79, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.36, 0.36], [83, 0.84, 0.12], [84, 0.96, 0.3]].forEach(([m, dt, len]) => tone(ctx, bus, { type: 'sine', f0: hz(m), t: t0 + 1.2 + dt, dur: len + 0.08, vol: 0.07, attack: 0.02 }));
    for (let i = 0; i < 30; i++) noise(ctx, bus, { t: t0 + 6.3 + Math.random() * 1.2, dur: 0.06, vol: 0.18, freq: 1500 + Math.random() * 2000, q: 3 });
    noise(ctx, bus, { t: t0 + 6.3, dur: 1.6, vol: 0.22, type: 'lowpass', freq: 900, f1: 150 });
  } else if (theme === 'arms') {
    // a cash-register ding on the banner, gun actions through the roll, Lucas's motif on clarinet, a drone swarm, the SOLD thud
    tone(ctx, bus, { type: 'sine', f0: 2637, t: t0 + 1.0, dur: 0.5, vol: 0.12 });
    tone(ctx, bus, { type: 'sine', f0: 3520, t: t0 + 1.06, dur: 0.7, vol: 0.1 });
    for (let i = 0; i < 6; i++) { noise(ctx, bus, { t: t0 + 0.5 + i * 0.4, dur: 0.03, vol: 0.2, freq: 2600, q: 5 }); noise(ctx, bus, { t: t0 + 0.6 + i * 0.4, dur: 0.04, vol: 0.18, freq: 1800, q: 5 }); }
    [[64, 0], [67, 0.15], [70, 0.3], [69, 0.6], [67, 0.75], [64, 0.9], [63, 1.2], [64, 1.35]].forEach(([m, dt]) => tone(ctx, bus, { type: 'triangle', f0: hz(m), t: t0 + 1.4 + dt, dur: 0.2, vol: 0.06, attack: 0.02 }));
    const buzz = ctx.createOscillator();
    const bg = ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 180;
    bg.gain.setValueAtTime(0.0001, t0 + 5.0);
    bg.gain.linearRampToValueAtTime(0.03, t0 + 5.4);
    bg.gain.linearRampToValueAtTime(0.0001, t0 + 6.6);
    buzz.connect(bg).connect(bus);
    buzz.start(t0 + 5.0); buzz.stop(t0 + 6.7);
    tone(ctx, bus, { type: 'sine', f0: 110, f1: 50, t: t0 + 5.9, dur: 0.6, vol: 0.3 });
  } else if (theme === 'kraken') {
    // a foghorn on the banner, Captain Ober's shanty on a squeezebox reed, waves crashing through the strikes, a deep gurgle as you go under
    tone(ctx, bus, { type: 'sawtooth', f0: 92, t: t0 + 0.9, dur: 1.6, vol: 0.08, attack: 0.15 });
    tone(ctx, bus, { type: 'sawtooth', f0: 69, t: t0 + 0.9, dur: 1.6, vol: 0.06, attack: 0.15 });
    [[62, 0], [66, 0.18], [69, 0.36], [69, 0.72], [71, 0.9], [69, 1.08], [66, 1.26], [62, 1.44]].forEach(([m, dt]) => tone(ctx, bus, { type: 'square', f0: hz(m), t: t0 + 1.6 + dt, dur: 0.16, vol: 0.035, attack: 0.03 }));
    for (let i = 0; i < 5; i++) noise(ctx, bus, { t: t0 + 3.4 + i * 0.3, dur: 0.9, vol: 0.22, type: 'lowpass', freq: 1400, f1: 200 });
    for (let i = 0; i < 18; i++) tone(ctx, bus, { type: 'sine', f0: 180 + Math.random() * 260, f1: 90, t: t0 + 5.8 + Math.random() * 1.2, dur: 0.12, vol: 0.06 });
    noise(ctx, bus, { t: t0 + 5.6, dur: 2.2, vol: 0.28, type: 'lowpass', freq: 500, f1: 80 });
  } else if (theme === 'stampede') {
    // a yeehaw whistle on the banner, Chuckie's hoedown on a fiddle-ish reed, thundering hooves through the strikes, the cheese wheel's rumble and thud
    tone(ctx, bus, { type: 'sine', f0: 1400, f1: 2600, t: t0 + 0.9, dur: 0.3, vol: 0.08 });
    tone(ctx, bus, { type: 'sine', f0: 2600, f1: 1200, t: t0 + 1.2, dur: 0.4, vol: 0.08 });
    [[67, 0], [71, 0.14], [74, 0.28], [71, 0.42], [67, 0.56], [69, 0.7], [71, 0.84], [72, 1.12], [71, 1.26], [69, 1.4], [67, 1.54]].forEach(([m, dt]) => tone(ctx, bus, { type: 'sawtooth', f0: hz(m), t: t0 + 1.5 + dt, dur: 0.13, vol: 0.03, attack: 0.02 }));
    for (let i = 0; i < 48; i++) noise(ctx, bus, { t: t0 + 3.2 + i * 0.045 + Math.random() * 0.02, dur: 0.05, vol: 0.16, type: 'lowpass', freq: 260 + Math.random() * 120 });
    tone(ctx, bus, { type: 'sine', f0: 60, f1: 45, t: t0 + 5.0, dur: 1.1, vol: 0.18 });
    timp(ctx, bus, t0 + 6.1, 0.6, 33);
    noise(ctx, bus, { t: t0 + 6.1, dur: 0.8, vol: 0.25, type: 'lowpass', freq: 400, f1: 100 });
  } else if (theme === 'maths') {
    // furious keypad clatter through the roll, Arthur's motif as calculator beeps, an ERROR buzz, a glitchy finale
    for (let i = 0; i < 40; i++) noise(ctx, bus, { t: t0 + 0.3 + i * 0.07 + Math.random() * 0.03, dur: 0.015, vol: 0.1, freq: 3000 + Math.random() * 1500, q: 8 });
    [[62, 0], [62, 0.12], [65, 0.24], [62, 0.36], [68, 0.48], [69, 0.84], [74, 0.96]].forEach(([m, dt]) => tone(ctx, bus, { type: 'square', f0: hz(m + 12), t: t0 + 1.1 + dt, dur: 0.1, vol: 0.05 }));
    for (let i = 0; i < 5; i++) tone(ctx, bus, { type: 'sawtooth', f0: 110, t: t0 + 2.6 + i * 0.12, dur: 0.08, vol: 0.06 });
    for (let i = 0; i < 24; i++) tone(ctx, bus, { type: 'square', f0: 400 + Math.random() * 3000, t: t0 + 5.1 + i * 0.05, dur: 0.04, vol: 0.04 });
    tone(ctx, bus, { type: 'sine', f0: 1000, f1: 40, t: t0 + 6.3, dur: 1.2, vol: 0.12 }); // the power-down
  } else if (theme === 'law') {
    // a wailing siren through the roll, Lawrence's lazy tuba motif, a typewriter
    // blizzard under the paperwork, and the cell door slamming shut
    const siren = ctx.createOscillator();
    const sg = ctx.createGain();
    siren.type = 'triangle';
    siren.frequency.setValueAtTime(650, t0 + 0.3);
    for (let k = 0; k < 8; k++) siren.frequency.linearRampToValueAtTime(k % 2 ? 650 : 960, t0 + 0.3 + (k + 1) * 0.6);
    sg.gain.setValueAtTime(0.0001, t0 + 0.3);
    sg.gain.linearRampToValueAtTime(0.045, t0 + 0.8);
    sg.gain.setValueAtTime(0.045, t0 + 3.2);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.0);
    siren.connect(sg).connect(bus);
    siren.start(t0 + 0.3); siren.stop(t0 + 5.1);
    [[36, 0, 0.5], [31, 0.5, 0.25], [36, 1.0, 0.25], [38, 1.25, 0.25], [40, 1.5, 0.75], [38, 2.5, 0.25], [36, 2.75, 0.6]].forEach(([m, dt, len]) => brass(ctx, bus, [m, m + 12], t0 + 1.0 + dt * 0.7, len, 0.06));
    for (let i = 0; i < 40; i++) noise(ctx, bus, { t: t0 + 5.0 + i * 0.03 + Math.random() * 0.02, dur: 0.02, vol: 0.12, freq: 2500 + Math.random() * 800, q: 6 });
    tone(ctx, bus, { type: 'sine', f0: 1760, t: t0 + 6.25, dur: 0.6, vol: 0.06 }); // typewriter bell
    noise(ctx, bus, { t: t0 + 6.35, dur: 0.6, vol: 0.4, type: 'lowpass', freq: 1600, f1: 120 }); // CLANG
    for (const [f, v] of [[220, 0.08], [331, 0.06], [467, 0.04]]) tone(ctx, bus, { type: 'sine', f0: f, t: t0 + 6.35, dur: 1.4, vol: v, attack: 0.002 });
  }
}

/** A single dialogue "voice" blip using a character's voice parameters. */
export function voiceBlip(ctx, dest, voice) {
  const v = voice || { wave: 'triangle', pitch: 300, variance: 40 };
  const f = v.pitch + (Math.random() * 2 - 1) * (v.variance || 0);
  tone(ctx, dest, { type: v.wave || 'triangle', f0: f, f1: f * 0.92, dur: 0.055, vol: v.wave === 'square' ? 0.035 : 0.07 });
}
