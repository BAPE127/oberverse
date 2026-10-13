// Audio front-end: buses, settings, music selection, SFX, motifs and voices.
// Starts only after a user gesture (browser autoplay rules). If Web Audio is
// unavailable or anything fails, the game continues silently.
import { SongPlayer, playMotif } from './music.js';
import { SFX, voiceBlip } from './sfx.js';
import { startAmbience } from './ambience.js';

export class AudioEngine {
  constructor(content, settings) {
    this.content = content;
    this.settings = settings;
    this.ctx = null;
    this.enabled = false;
    this.currentSongId = null;
    this.song = null;
    this.ambience = null;
    this.lastBlip = 0;
    this.failures = [];
  }

  /** Call from a user gesture handler. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) throw new Error('Web Audio API not available');
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master.connect(comp).connect(c.destination);
      this.buses = {};
      for (const name of ['music', 'sfx', 'ambience', 'voice']) {
        this.buses[name] = c.createGain();
        this.buses[name].connect(this.master);
      }
      this.enabled = true;
      this.applySettings(this.settings);
    } catch (err) {
      this.enabled = false;
      this.failures.push(String(err.message || err));
      console.warn('[audio] disabled:', err);
    }
  }

  applySettings(s) {
    this.settings = s;
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
    this.buses.music.gain.setTargetAtTime(s.music * 0.9, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.buses.ambience.gain.setTargetAtTime(s.ambience, t, 0.05);
    this.buses.voice.gain.setTargetAtTime(s.voice, t, 0.05);
  }

  sfx(id, opts) {
    if (!this.enabled) return;
    const fn = SFX[id];
    if (!fn) return;
    try {
      fn(this.ctx, this.buses.sfx, opts);
    } catch (err) {
      this.failures.push(`${id}: ${err.message}`);
    }
  }

  setMusic(id) {
    if (!this.enabled || id === this.currentSongId) return;
    this.currentSongId = id;
    if (this.song) this.song.stop(2);
    this.song = null;
    const def = this.content.songs[id];
    if (!def) return;
    try {
      this.song = new SongPlayer(this.ctx, this.buses.music, def);
      this.song.start(2.5);
    } catch (err) {
      this.failures.push(`${id}: ${err.message}`);
    }
  }

  setAmbience(id) {
    if (!this.enabled || this.ambience?.id === id) return;
    if (this.ambience) this.ambience.stop();
    this.ambience = null;
    try {
      this.ambience = id ? startAmbience(this.ctx, this.buses.ambience, id) : null;
    } catch (err) {
      this.failures.push(`${id}: ${err.message}`);
    }
  }

  motif(id) {
    if (!this.enabled) return;
    const m = this.content.motifs[id];
    if (!m) return;
    try {
      playMotif(this.ctx, this.buses.sfx, m);
    } catch (err) {
      this.failures.push(`${id}: ${err.message}`);
    }
  }

  blip(voice) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastBlip < 55 / (voice?.rate || 1)) return;
    this.lastBlip = now;
    voiceBlip(this.ctx, this.buses.voice, voice);
  }

  /** Choose music and ambience for the player's situation. */
  update(game) {
    if (!this.enabled || !game.player) return;
    const map = game.currentMap();
    const m = map.music;
    const songId = typeof m === 'string' ? m : m ? (game.clock.darkness > 0.5 ? m.night : m.day) : null;
    this.setMusic(songId);
    this.setAmbience(map.ambience);
  }

  stopAll() {
    if (!this.enabled) return;
    if (this.song) this.song.stop(1);
    this.song = null;
    this.currentSongId = null;
    this.setAmbience(null);
  }
}
