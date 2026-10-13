// Small Web Audio instrument library. Each instrument schedules one note at an
// exact AudioContext time; nothing here allocates long-lived nodes.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' -> MIDI 69, 'C#5' -> 73, 'Bb3' -> 58 */
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (Number(m[3]) + 1) * 12;
}

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const CHORD_QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14],
  9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim: [0, 3, 6], aug: [0, 4, 8],
};

/** 'Bbmaj7' -> { root: 46 (Bb2), intervals: [...] } */
export function parseChord(sym) {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  if (!m) return null;
  const root = noteToMidi(`${m[1]}2`);
  const intervals = CHORD_QUALITIES[m[2]];
  if (root === null || !intervals) return null;
  return { root, intervals };
}

let noiseBuffer = null;
export function getNoise(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function env(ctx, gainNode, t, { a = 0.01, d = 0.1, s = 0.6, r = 0.2, peak = 1, dur = 0.3 }) {
  const g = gainNode.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.0001, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.linearRampToValueAtTime(peak * s, t + a + d);
  const end = Math.max(t + a + d, t + dur);
  g.setValueAtTime(peak * s, end);
  g.exponentialRampToValueAtTime(0.0001, end + r);
  return end + r + 0.05;
}

function osc(ctx, type, freq, t) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

function vibrato(ctx, o, t, rate = 5, depth = 4, delay = 0.15) {
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = rate;
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(depth, t + delay + 0.2);
  lfo.connect(lg).connect(o.frequency);
  return lfo; // started/stopped by the caller with the note's oscillators
}

/**
 * Play a melodic note.
 * @param {string} inst instrument name
 */
export function playNote(ctx, dest, inst, freq, t, dur, vel = 1) {
  const out = ctx.createGain();
  out.connect(dest);
  const stops = [];
  let end;
  switch (inst) {
    case 'flute': {
      const o = osc(ctx, 'sine', freq, t);
      const o2 = osc(ctx, 'triangle', freq * 2, t);
      const g2 = ctx.createGain();
      g2.gain.value = 0.12;
      o.connect(out);
      o2.connect(g2).connect(out);
      stops.push(o, o2, vibrato(ctx, o, t, 5.2, freq * 0.008));
      end = env(ctx, out, t, { a: 0.05, d: 0.1, s: 0.75, r: 0.18, peak: 0.2 * vel, dur });
      break;
    }
    case 'clarinet': {
      const o = osc(ctx, 'square', freq, t);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = Math.min(2400, freq * 4);
      o.connect(f).connect(out);
      stops.push(o, vibrato(ctx, o, t, 4.6, freq * 0.006));
      end = env(ctx, out, t, { a: 0.04, d: 0.12, s: 0.7, r: 0.12, peak: 0.1 * vel, dur });
      break;
    }
    case 'reed': {
      const o = osc(ctx, 'sawtooth', freq, t);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = Math.min(1400, freq * 3);
      f.Q.value = 2;
      o.connect(f).connect(out);
      stops.push(o);
      end = env(ctx, out, t, { a: 0.02, d: 0.08, s: 0.55, r: 0.08, peak: 0.12 * vel, dur: dur * 0.8 });
      break;
    }
    case 'rhodes':
    case 'rhodesPad': {
      const car = osc(ctx, 'sine', freq, t);
      const mod = osc(ctx, 'sine', freq, t);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(freq * 1.4, t);
      mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + 0.8);
      mod.connect(mg).connect(car.frequency);
      car.connect(out);
      stops.push(car, mod);
      const pad = inst === 'rhodesPad';
      end = env(ctx, out, t, { a: 0.005, d: 0.6, s: 0.35, r: pad ? 0.6 : 0.4, peak: (pad ? 0.06 : 0.17) * vel, dur });
      break;
    }
    case 'pluck': {
      const o = osc(ctx, 'triangle', freq, t);
      const o2 = osc(ctx, 'sawtooth', freq, t);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq * 8, t);
      f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.25);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      o.connect(f);
      o2.connect(g2).connect(f);
      f.connect(out);
      stops.push(o, o2);
      end = env(ctx, out, t, { a: 0.003, d: 0.18, s: 0.25, r: 0.15, peak: 0.2 * vel, dur: Math.min(dur, 0.3) });
      break;
    }
    case 'bell': {
      const o = osc(ctx, 'sine', freq, t);
      const o2 = osc(ctx, 'sine', freq * 2.76, t);
      const o3 = osc(ctx, 'sine', freq * 5.4, t);
      const g2 = ctx.createGain();
      const g3 = ctx.createGain();
      g2.gain.value = 0.3;
      g3.gain.value = 0.08;
      o.connect(out);
      o2.connect(g2).connect(out);
      o3.connect(g3).connect(out);
      stops.push(o, o2, o3);
      end = env(ctx, out, t, { a: 0.003, d: 1.2, s: 0.1, r: 1.5, peak: 0.16 * vel, dur });
      break;
    }
    case 'pad': {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      f.connect(out);
      for (const det of [-7, 7]) {
        const o = osc(ctx, 'sawtooth', freq, t);
        o.detune.value = det;
        o.connect(f);
        stops.push(o);
      }
      end = env(ctx, out, t, { a: 0.5, d: 0.3, s: 0.8, r: 0.9, peak: 0.035 * vel, dur });
      break;
    }
    case 'organ': {
      for (const [mult, g] of [[1, 1], [2, 0.4], [3, 0.2]]) {
        const o = osc(ctx, 'sine', freq * mult, t);
        const gg = ctx.createGain();
        gg.gain.value = g;
        o.connect(gg).connect(out);
        stops.push(o);
      }
      end = env(ctx, out, t, { a: 0.06, d: 0.1, s: 0.8, r: 0.25, peak: 0.035 * vel, dur });
      break;
    }
    case 'bass': {
      const o = osc(ctx, 'triangle', freq, t);
      const sub = osc(ctx, 'sine', freq / 2, t);
      const g2 = ctx.createGain();
      g2.gain.value = 0.5;
      o.connect(out);
      sub.connect(g2).connect(out);
      stops.push(o, sub);
      end = env(ctx, out, t, { a: 0.01, d: 0.15, s: 0.6, r: 0.1, peak: 0.28 * vel, dur: dur * 0.9 });
      break;
    }
    case 'brass': {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq * 1.5, t);
      f.frequency.linearRampToValueAtTime(Math.min(3200, freq * 5), t + 0.08);
      f.connect(out);
      for (const det of [-5, 5]) {
        const o = osc(ctx, 'sawtooth', freq, t);
        o.detune.value = det;
        o.connect(f);
        stops.push(o);
      }
      end = env(ctx, out, t, { a: 0.05, d: 0.12, s: 0.7, r: 0.12, peak: 0.07 * vel, dur });
      break;
    }
    case 'tuba': {
      const o = osc(ctx, 'sawtooth', freq, t);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      o.connect(f).connect(out);
      stops.push(o);
      end = env(ctx, out, t, { a: 0.03, d: 0.1, s: 0.6, r: 0.08, peak: 0.25 * vel, dur: dur * 0.7 });
      break;
    }
    case 'drone': {
      for (const mult of [1, 1.5, 2.003]) {
        const o = osc(ctx, 'sine', freq * mult, t);
        o.connect(out);
        stops.push(o);
      }
      end = env(ctx, out, t, { a: 1.5, d: 0.5, s: 0.8, r: 2, peak: 0.06 * vel, dur });
      break;
    }
    default: {
      const o = osc(ctx, 'sine', freq, t);
      o.connect(out);
      stops.push(o);
      end = env(ctx, out, t, { a: 0.01, d: 0.1, s: 0.5, r: 0.1, peak: 0.15 * vel, dur });
    }
  }
  for (const s of stops) {
    s.start(t);
    s.stop(end);
  }
  setTimeout(() => out.disconnect(), Math.max(0, (end - ctx.currentTime) * 1000 + 200));
}

/** Percussion voices. */
export function playDrum(ctx, dest, kind, t, vel = 1) {
  const out = ctx.createGain();
  out.connect(dest);
  if (kind === 'kick') {
    const o = osc(ctx, 'sine', 120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(out);
    out.gain.setValueAtTime(0.5 * vel, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.start(t);
    o.stop(t + 0.3);
  } else if (kind === 'tick') {
    const o = osc(ctx, 'sine', 1250, t);
    o.connect(out);
    out.gain.setValueAtTime(0.09 * vel, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.start(t);
    o.stop(t + 0.06);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const f = ctx.createBiquadFilter();
    const conf = {
      hat: ['highpass', 7000, 0.05, 0.06],
      shaker: ['bandpass', 5000, 0.035, 0.07],
      snare: ['bandpass', 1800, 0.14, 0.18],
      brush: ['lowpass', 3200, 0.04, 0.16],
    }[kind] || ['highpass', 6000, 0.04, 0.05];
    f.type = conf[0];
    f.frequency.value = conf[1];
    src.connect(f).connect(out);
    out.gain.setValueAtTime(conf[2] * vel, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + conf[3]);
    const off = Math.random() * 1.5;
    src.start(t, off, conf[3] + 0.05);
    if (kind === 'snare') {
      const o = osc(ctx, 'triangle', 190, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12 * vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.12);
    }
  }
  setTimeout(() => out.disconnect(), Math.max(0, (t - ctx.currentTime) * 1000 + 600));
}
