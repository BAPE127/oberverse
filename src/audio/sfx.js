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
};

/** A single dialogue "voice" blip using a character's voice parameters. */
export function voiceBlip(ctx, dest, voice) {
  const v = voice || { wave: 'triangle', pitch: 300, variance: 40 };
  const f = v.pitch + (Math.random() * 2 - 1) * (v.variance || 0);
  tone(ctx, dest, { type: v.wave || 'triangle', f0: f, f1: f * 0.92, dur: 0.055, vol: v.wave === 'square' ? 0.035 : 0.07 });
}
