// Step sequencer for the note-data compositions in src/content/audio.js.
// compileSong() is pure (unit-tested); SongPlayer schedules it with Web Audio.
import { noteToMidi, midiToFreq, parseChord, playNote, playDrum } from './synth.js';

/** Parse "A4:2 C5:2 | -:4 ..." into [{step, midi|null, len}] and total steps. */
export function parseMelody(text) {
  const events = [];
  let step = 0;
  const bars = String(text).split('|');
  const barLengths = [];
  for (const bar of bars) {
    let barSteps = 0;
    for (const tok of bar.trim().split(/\s+/).filter(Boolean)) {
      const [note, lenStr] = tok.split(':');
      const len = Number(lenStr || 1);
      if (!Number.isFinite(len) || len <= 0) throw new Error(`Bad melody token "${tok}"`);
      if (note !== '-') {
        const midi = noteToMidi(note);
        if (midi === null) throw new Error(`Bad note "${note}"`);
        events.push({ step, midi, len });
      }
      step += len;
      barSteps += len;
    }
    barLengths.push(barSteps);
  }
  return { events, totalSteps: step, barLengths };
}

/** Turn a song definition into a flat, loopable event list. */
export function compileSong(song) {
  const stepsPerBar = song.beatsPerBar * song.stepsPerBeat;
  const bars = song.chords.length;
  const total = bars * stepsPerBar;
  const events = [];
  const mel = parseMelody(song.melody);
  for (const e of mel.events) events.push({ step: e.step % total, track: 'lead', inst: song.lead, midi: e.midi, len: e.len });
  song.chords.forEach((sym, bar) => {
    const ch = parseChord(sym);
    if (!ch) throw new Error(`Bad chord "${sym}"`);
    const base = bar * stepsPerBar;
    // pad voicing: chord tones between C3 and C5, dropping the root on big chords
    const tones = ch.intervals.slice(ch.intervals.length > 4 ? 1 : 0).map((iv) => {
      let m = ch.root + 12 + iv;
      while (m < 52) m += 12;
      while (m > 72) m -= 12;
      return m;
    });
    if (song.pad) for (const m of tones) events.push({ step: base, track: 'pad', inst: song.pad, midi: m, len: stepsPerBar });
    if (song.bass && song.bassPattern) {
      const pat = song.bassPattern;
      for (let i = 0; i < stepsPerBar; i++) {
        const c = pat[i % pat.length];
        if (c === '.' || c === '-') continue;
        let len = 1;
        while (i + len < stepsPerBar && pat[(i + len) % pat.length] === '-') len++;
        const off = { R: 0, 3: ch.intervals[1], 5: 7, 8: 12 }[c] ?? 0;
        events.push({ step: base + i, track: 'bass', inst: song.bass, midi: ch.root + off, len });
      }
    }
    for (const [kind, pat] of Object.entries(song.drums || {})) {
      for (let i = 0; i < stepsPerBar; i++) if (pat[i % pat.length] === 'x') events.push({ step: base + i, track: 'drums', drum: kind });
    }
  });
  events.sort((a, b) => a.step - b.step);
  return { events, totalSteps: total, stepDur: 60 / song.bpm / song.stepsPerBeat, melodySteps: mel.totalSteps };
}

const VOL = { lead: 1, pad: 1, bass: 0.8, drums: 0.9 };

export class SongPlayer {
  constructor(ctx, dest, song) {
    this.ctx = ctx;
    this.song = song;
    this.compiled = compileSong(song);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(dest);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.running = false;
  }
  start(fade = 1.5) {
    this.running = true;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(1, t + fade);
    this.timer = setInterval(() => this.schedule(), 60);
    this.schedule();
  }
  stop(fade = 1.5) {
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => {
      this.running = false;
      clearInterval(this.timer);
      this.gain.disconnect();
    }, fade * 1000 + 300);
  }
  schedule() {
    if (!this.running) return;
    const { events, totalSteps, stepDur } = this.compiled;
    const ahead = this.ctx.currentTime + 0.3;
    while (this.nextTime < ahead) {
      const s = this.step % totalSteps;
      const swing = s % 2 === 1 ? (this.song.swing || 0) * stepDur : 0;
      const t = this.nextTime + swing;
      for (const e of events) {
        if (e.step !== s) continue;
        if (e.track === 'drums') playDrum(this.ctx, this.gain, e.drum, t, VOL.drums);
        else playNote(this.ctx, this.gain, e.inst, midiToFreq(e.midi), t, e.len * stepDur * 0.95, VOL[e.track]);
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }
}

/** Play a short motif once (character themes). */
export function playMotif(ctx, dest, motif) {
  const mel = parseMelody(motif.notes);
  const stepDur = 60 / motif.bpm / 2;
  const t0 = ctx.currentTime + 0.05;
  for (const e of mel.events) playNote(ctx, dest, motif.inst, midiToFreq(e.midi), t0 + e.step * stepDur, e.len * stepDur, 1.2);
}
