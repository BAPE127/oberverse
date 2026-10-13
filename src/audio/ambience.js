// Looping procedural ambience beds with occasional random details.
import { getNoise } from './synth.js';
import { gullCall } from './sfx.js';

function noiseBed(ctx, dest, { type, freq, q = 0.7, vol, lfoRate = 0, lfoDepth = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(dest);
  const nodes = [src];
  if (lfoRate) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = lfoRate;
    lg.gain.value = lfoDepth;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    nodes.push(lfo);
  }
  src.start();
  return { stop: () => nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), gain: g };
}

function hum(ctx, dest, freq, vol) {
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  o.connect(g).connect(dest);
  o.start();
  return { stop: () => o.stop() };
}

function every(minS, maxS, fn) {
  let t;
  const loop = () => {
    t = setTimeout(() => { fn(); loop(); }, (minS + Math.random() * (maxS - minS)) * 1000);
  };
  loop();
  return { stop: () => clearTimeout(t) };
}

const BEDS = {
  amb_harbour: (ctx, d) => [
    noiseBed(ctx, d, { type: 'lowpass', freq: 420, vol: 0.12, lfoRate: 0.11, lfoDepth: 0.07 }),
    noiseBed(ctx, d, { type: 'bandpass', freq: 1500, q: 0.4, vol: 0.015 }),
    every(7, 18, () => gullCall(ctx, d, ctx.currentTime, 0.035 + Math.random() * 0.03)),
  ],
  amb_indoor: (ctx, d) => [noiseBed(ctx, d, { type: 'lowpass', freq: 180, vol: 0.05 })],
  amb_cafe: (ctx, d) => [
    noiseBed(ctx, d, { type: 'bandpass', freq: 650, q: 0.9, vol: 0.05, lfoRate: 0.7, lfoDepth: 0.025 }),
    every(3, 9, () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 2600 + Math.random() * 1200;
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g).connect(d);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    }),
  ],
  amb_workshop: (ctx, d) => [
    hum(ctx, d, 60, 0.03),
    hum(ctx, d, 120, 0.012),
    every(4, 11, () => {
      const src = ctx.createBufferSource();
      src.buffer = getNoise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200;
      f.Q.value = 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      src.connect(f).connect(g).connect(d);
      src.start(ctx.currentTime, Math.random(), 0.25);
    }),
  ],
  amb_fields: (ctx, d) => [
    noiseBed(ctx, d, { type: 'bandpass', freq: 380, q: 1.2, vol: 0.07, lfoRate: 0.09, lfoDepth: 0.05 }),
    every(2.2, 2.6, () => {
      // the pumpjacks' slow thump
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(70, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      o.connect(g).connect(d);
      o.start();
      o.stop(ctx.currentTime + 0.35);
    }),
  ],
  amb_refinery: (ctx, d) => [
    hum(ctx, d, 50, 0.04),
    hum(ctx, d, 100, 0.015),
    noiseBed(ctx, d, { type: 'bandpass', freq: 4200, q: 1.5, vol: 0.018, lfoRate: 0.3, lfoDepth: 0.012 }),
    every(3, 8, () => {
      const src = ctx.createBufferSource();
      src.buffer = getNoise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1600;
      f.Q.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      src.connect(f).connect(g).connect(d);
      src.start(ctx.currentTime, Math.random(), 0.3);
    }),
  ],
  amb_city: (ctx, d) => [
    // distant traffic roar, a low city hum, the odd car horn
    noiseBed(ctx, d, { type: 'lowpass', freq: 520, vol: 0.09, lfoRate: 0.05, lfoDepth: 0.04 }),
    hum(ctx, d, 55, 0.012),
    every(6, 16, () => {
      const t = ctx.currentTime;
      const f = 330 + Math.random() * 120;
      for (const [k, mul] of [[0, 1], [1, 1.26]]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = f * mul;
        g.gain.setValueAtTime(0.0001, t + k * 0.02);
        g.gain.linearRampToValueAtTime(0.012, t + 0.03);
        g.gain.setValueAtTime(0.012, t + 0.28);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        o.connect(lp).connect(g).connect(d);
        o.start(t);
        o.stop(t + 0.4);
      }
    }),
  ],
  amb_site: (ctx, d) => [
    noiseBed(ctx, d, { type: 'bandpass', freq: 420, q: 1, vol: 0.05, lfoRate: 0.11, lfoDepth: 0.03 }),
    hum(ctx, d, 38, 0.018), // the excavator idling somewhere
    every(2.5, 6, () => {
      // a hammer: two or three quick taps
      const taps = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < taps; i++) {
        const t = ctx.currentTime + i * 0.32;
        const src = ctx.createBufferSource();
        src.buffer = getNoise(ctx);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1900 + Math.random() * 500;
        f.Q.value = 8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        src.connect(f).connect(g).connect(d);
        src.start(t, Math.random(), 0.1);
      }
    }),
  ],
  amb_lighthouse: (ctx, d) => [
    noiseBed(ctx, d, { type: 'bandpass', freq: 520, q: 5, vol: 0.06, lfoRate: 0.07, lfoDepth: 0.04 }),
    noiseBed(ctx, d, { type: 'lowpass', freq: 300, vol: 0.05 }),
  ],
};

export function startAmbience(ctx, dest, id) {
  const make = BEDS[id];
  if (!make) return null;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(dest);
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
  const parts = make(ctx, g);
  return {
    id,
    stop() {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      setTimeout(() => { parts.forEach((p) => p.stop()); g.disconnect(); }, 1500);
    },
  };
}

export const AMBIENCE_IDS = Object.keys(BEDS);
