// The sound of a tactical battle (rules 5), all synthesised with Web Audio: no files. It is driven only by the simulation's per-tick `B.sfx` list and by the camera (where the view is looking and how
// close it is); nothing in the simulation depends on it. Events become short voices (a rifle, a blast with a low tail, an engine whose pitch follows its speed, a rotor with a Doppler-ish lean, a
// "shout" that is a formant blip and no word), placed by pan, volume and a low-pass that darkens with distance. A continuous bed answers to the battle's intensity (events a second) and to the map.
// Limits: a voice cap that steals the quietest, a per-type rate limit so forty rifles do not clip, the game's own buses (so master, SFX, ambience and mute apply) and compressor, and everything
// released on stop. With no AudioContext (or any failure) every call is a silent no-op.
import { getNoise } from './synth.js';

/** Which voice an `B.sfx` event is, and the limit it plays under: { voice, ref (tiles at which it is half as loud), max (voices of it in `win` seconds) }. Null for an unknown type. */
const WEAPON_VOICE = { item_pistol: 'smg', item_smg: 'smg', item_shotgun: 'smg', item_assault_rifle: 'rifle', item_lmg: 'mg', vehicle_mg: 'mg', item_sniper_rifle: 'crack', item_rpg: 'at', tank_gun: 'cannon', heli_gun: 'heligun', aa_gun: 'aagun' };
export const LIMITS = {
  rifle: { ref: 9, max: 5, win: 0.25 }, smg: { ref: 8, max: 4, win: 0.25 }, mg: { ref: 10, max: 4, win: 0.25 }, crack: { ref: 16, max: 2, win: 0.4 }, at: { ref: 14, max: 2, win: 0.5 }, cannon: { ref: 18, max: 3, win: 0.4 },
  aagun: { ref: 14, max: 3, win: 0.3 }, heligun: { ref: 12, max: 3, win: 0.3 }, zap: { ref: 8, max: 3, win: 0.3 },
  blast_s: { ref: 14, max: 3, win: 0.3 }, blast_m: { ref: 20, max: 3, win: 0.4 }, blast_l: { ref: 30, max: 2, win: 0.6 }, whistle: { ref: 20, max: 3, win: 0.5 }, impact: { ref: 5, max: 4, win: 0.25 },
  engine: { ref: 12, max: 6, win: 1 }, tracks: { ref: 8, max: 3, win: 0.8 }, rotor: { ref: 26, max: 3, win: 0.8 }, aircraft: { ref: 40, max: 2, win: 2 }, drone: { ref: 8, max: 2, win: 0.6 },
  door: { ref: 6, max: 2, win: 0.3 }, breach: { ref: 16, max: 2, win: 0.5 }, shout: { ref: 6, max: 3, win: 0.5 },
};
export function voiceFor(e) {
  switch (e?.t) {
    case 'shot': if (e.weapon === '__drone') return { voice: '__drone' }; return { voice: WEAPON_VOICE[e.weapon] || (String(e.weapon || '').startsWith('item_') || !e.weapon ? 'rifle' : 'zap') };
    case 'impact': return { voice: 'impact' };
    case 'explosion': return { voice: e.size >= 3 ? 'blast_l' : e.size >= 1.6 ? 'blast_m' : 'blast_s' };
    case 'engine': return { voice: 'engine' };
    case 'tracks': return { voice: 'tracks' };
    case 'rotor': return { voice: 'rotor' };
    case 'shout': return { voice: 'shout', kind: e.kind || 'moving' };
    case 'door': return { voice: 'door' };
    case 'breach': return { voice: 'breach' };
    case 'incoming': return { voice: 'whistle' };
    case 'aircraft': return { voice: 'aircraft' };
    default: return null;
  }
}
/** The types the simulation emits (docs/WAR.md "Presentation events"): every one has a voice. */
export const SFX_TYPES = ['shot', 'impact', 'explosion', 'engine', 'tracks', 'rotor', 'shout', 'door', 'breach', 'incoming', 'aircraft'];

// Shouts: no words, a contour of pitch (Hz) over the blip and a vowel (two formants). Contact is sharp and rising, man down a falling cry, medic a long call, reloading short and flat, retreat a falling run.
const SHOUT = {
  contact: { f: [240, 330, 300], d: 0.34, v: [700, 1200] }, suppressed: { f: [320, 360, 280], d: 0.4, v: [600, 1700] }, man_down: { f: [380, 300, 180], d: 0.6, v: [800, 1100] },
  reloading: { f: [200, 210, 200], d: 0.22, v: [500, 1500] }, moving: { f: [190, 230, 210], d: 0.28, v: [550, 900] }, grenade: { f: [260, 340, 360], d: 0.3, v: [650, 1100] },
  medic: { f: [260, 300, 320, 300], d: 0.7, v: [750, 1300] }, retreat: { f: [330, 280, 220], d: 0.5, v: [700, 1000] }, objective: { f: [220, 300, 340], d: 0.45, v: [600, 1200] },
};
const CAP = 24; // voices at once
const rnd = (a) => { const x = Math.sin(a * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class BattleAudio {
  /** `audio`: the game's AudioEngine (ctx and buses are read from it when it has been unlocked). */
  constructor(audio) {
    this.audio = audio; this.ctx = null; this.active = []; this.hist = {}; this.stats = { voices: 0, byVoice: {}, dropped: 0, stolen: 0, limited: 0 };
    this.intensity = 0; this.evCount = 0; this.bed = null; this.prevDist = new Map(); this.drones = new Map(); this.on = false; this.pace = 0;
  }

  get ready() { return Boolean(this.audio?.enabled && this.audio.ctx && this.audio.buses); }

  start() {
    if (this.on || !this.ready) return; this.ctx = this.audio.ctx;
    try { this.out = this.ctx.createGain(); this.out.gain.value = 1; this.out.connect(this.audio.buses.sfx); this.on = true; } catch (err) { this.fail(err); }
  }
  fail(err) { this.on = false; this.audio?.failures?.push?.(`battle: ${err?.message || err}`); }

  // ---- placing a sound: pan and volume from where it is against where the camera looks; darker with distance; louder zoomed in
  place(ex, ey, ref, listener) {
    const L = listener || { x: ex, y: ey, zoom: 1 }; const dx = ex - L.x; const dy = ey - L.y; const d = Math.hypot(dx, dy);
    const zk = 0.5 + 0.55 * Math.min(3, Math.max(0.35, L.zoom || 1));
    const vol = zk / (1 + Math.pow(d / ref, 1.5));
    return { vol, pan: Math.max(-1, Math.min(1, dx / (12 + 6 * (L.zoom || 1)))), lp: Math.max(380, 12000 / (1 + d / 5)), d };
  }

  /** Feed one tick's events (`B.sfx`) with the camera: { x, y, zoom } in tiles. */
  feed(events, listener) {
    if (!this.on || !events?.length) return;
    this.evCount += events.length;
    for (const e of events) { try { this.play(e, listener); } catch (err) { this.stats.dropped++; this.audio?.failures?.push?.(`battle ${e?.t}: ${err?.message}`); } }
  }

  play(e, listener) {
    const v = voiceFor(e); if (!v) return false; const lim = LIMITS[v.voice]; const ctx = this.ctx; const now = ctx.currentTime;
    const h = (this.hist[v.voice] ||= []); while (h.length && h[0] < now - lim.win) h.shift();
    if (h.length >= lim.max) { this.stats.limited++; return false; }
    const pl = this.place(e.x ?? 0, e.y ?? 0, lim.ref * (v.voice === 'shout' ? 1 : 1), listener); if (pl.vol < 0.02) { this.stats.dropped++; return false; }
    let vol = pl.vol * (e.t === 'shot' ? 0.7 : 1);
    if (this.active.length >= CAP) { // steal the quietest (or drop the newcomer if it is quieter still)
      let q = 0; for (let i = 1; i < this.active.length; i++) if (this.active[i].vol < this.active[q].vol) q = i;
      if (this.active[q].vol >= vol) { this.stats.dropped++; return false; }
      this.release(this.active.splice(q, 1)[0]); this.stats.stolen++;
    }
    const rig = { nodes: [], srcs: [], vol, end: now + 1 };
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = pl.lp; lp.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = Math.min(1.2, vol); if (pan) { pan.pan.value = pl.pan; g.connect(pan); pan.connect(lp); rig.nodes.push(pan); } else g.connect(lp);
    lp.connect(this.out); rig.nodes.push(g, lp); rig.in = g; rig.t = now + 0.005;
    h.push(now); const dur = VOICE[v.voice](ctx, rig, { e, v, pl, now: rig.t, dop: this.dop(e, pl) });
    rig.end = rig.t + (dur || 0.5) + 0.1; this.active.push(rig); this.stats.voices++; this.stats.byVoice[v.voice] = (this.stats.byVoice[v.voice] || 0) + 1;
    return true;
  }
  /** Doppler-ish: a rotor or an aircraft coming closer is a touch higher, going away a touch lower. */
  dop(e, pl) { if (e.id === undefined) return 1; const p = this.prevDist.get(e.id); this.prevDist.set(e.id, pl.d); if (p === undefined) return 1; return Math.max(0.92, Math.min(1.08, 1 + (p - pl.d) * 0.04)); }

  release(rig) { for (const s of rig.srcs) { try { s.stop(); } catch { /* not started or already stopped */ } try { s.disconnect(); } catch { /* gone */ } } for (const n of rig.nodes) { try { n.disconnect(); } catch { /* gone */ } } }

  /** Each frame: retire finished voices, move the bed with the intensity and the map. `listener` = { x, y, zoom }; `paused`: the battle is stopped or being planned (quiet ambience only). */
  update(B, listener, dt, paused) {
    if (!this.on) return; const now = this.ctx.currentTime;
    this.active = this.active.filter((r) => { if (r.end > now) return true; this.release(r); return false; });
    const rate = paused ? 0 : this.evCount / Math.max(dt, 1 / 60); this.evCount = 0; this.intensity += (Math.min(60, rate) - this.intensity) * Math.min(1, dt * 0.7);
    try {
      if (!this.bed) this.bed = makeBed(this.ctx, this.out, B?.map?.recipe || 'fields');
      const I = Math.min(1, this.intensity / 25); const z = listener?.zoom || 1; const near = 0.55 + 0.25 * Math.min(2, z); const t = now;
      const b = this.bed; b.wind.gain.setTargetAtTime(0.05 + 0.04 * (1 - I) * near, t, 0.4); b.hum.gain.setTargetAtTime((b.city ? 0.03 : 0.006) * (1 - I * 0.5), t, 0.5);
      b.crackle.gain.setTargetAtTime(Math.min(0.5, I * 0.45) * near, t, 0.25); b.thump.gain.setTargetAtTime(I * I * 0.35, t, 0.3);
      b.crackleF.frequency.setTargetAtTime(1200 + 3800 * I * Math.min(1.5, z), t, 0.3); b.thumpF.frequency.setTargetAtTime(90 + 120 * I, t, 0.3);
      for (const d of B?.drones || []) this.drone(d, listener, now);
    } catch (err) { this.fail(err); }
  }
  drone(d, listener, now) { const k = d; const last = this.drones.get(k) || 0; if (now - last < 0.5) return; this.drones.set(k, now); this.play({ t: 'shot', weapon: '__drone', x: d.x, y: d.y }, listener); }

  /** Stop everything and release every node. */
  stop() {
    for (const r of this.active) this.release(r); this.active = [];
    if (this.bed) { for (const s of this.bed.srcs) { try { s.stop(); } catch { /* */ } try { s.disconnect(); } catch { /* */ } } for (const n of this.bed.nodes) { try { n.disconnect(); } catch { /* */ } } this.bed = null; }
    try { this.out?.disconnect(); } catch { /* */ } this.out = null; this.on = false; this.prevDist.clear(); this.drones.clear(); this.hist = {};
  }
}

// ---- the bed: wind (band noise), a room/city hum, a crackle (high noise) and a thump (low noise), each opened by the intensity
function makeBed(ctx, out, recipe) {
  const nodes = []; const srcs = []; const city = recipe === 'city' || recipe === 'compound';
  const layer = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = getNoise(ctx); s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(out); s.start(); srcs.push(s); nodes.push(fl, g); return { g, fl }; };
  const wind = layer('bandpass', recipe === 'forest' ? 260 : 420, 0.6); const crackle = layer('highpass', 2000, 0.7); const thump = layer('lowpass', 120, 0.9);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = city ? 58 : 44; const hg = ctx.createGain(); hg.gain.value = 0; o.connect(hg); hg.connect(out); o.start(); srcs.push(o); nodes.push(hg);
  return { wind: wind.g, crackle: crackle.g, crackleF: crackle.fl, thump: thump.g, thumpF: thump.fl, hum: hg, city, nodes, srcs };
}

// ---- the voices: each builds its nodes into `rig` (connected to rig.in) and returns its length in seconds
const noiseBurst = (ctx, rig, t, dur, type, f, q = 0.8, g0 = 1, off = 0) => {
  const s = ctx.createBufferSource(); s.buffer = getNoise(ctx); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain();
  g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(fl); fl.connect(g); g.connect(rig.in); s.start(t, off % 1.5, dur + 0.05); s.stop(t + dur + 0.06); rig.srcs.push(s); rig.nodes.push(fl, g); return { s, fl, g };
};
const tone = (ctx, rig, t, dur, type, f0, f1, g0 = 1) => {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(rig.in); o.start(t); o.stop(t + dur + 0.05); rig.srcs.push(o); rig.nodes.push(g); return o;
};
const VOICE = {
  rifle: (c, r, { now: t, e }) => { noiseBurst(c, r, t, 0.09, 'bandpass', 1800 + rnd(e.x + e.y) * 700, 0.9, 1, rnd(e.x) * 1.4); tone(c, r, t, 0.12, 'triangle', 190, 60, 0.35); noiseBurst(c, r, t + 0.03, 0.35, 'lowpass', 700, 0.5, 0.18); return 0.4; },
  smg: (c, r, { now: t, e }) => { for (let i = 0; i < 2; i++) noiseBurst(c, r, t + i * 0.06, 0.06, 'bandpass', 2400 + i * 300, 1, 0.8, rnd(e.x + i) * 1.4); tone(c, r, t, 0.08, 'triangle', 240, 90, 0.25); return 0.25; },
  mg: (c, r, { now: t, e }) => { for (let i = 0; i < 4; i++) { noiseBurst(c, r, t + i * 0.055, 0.07, 'bandpass', 1500 + (i % 2) * 400, 0.8, 0.9, rnd(e.x + i * 3) * 1.4); tone(c, r, t + i * 0.055, 0.08, 'triangle', 170, 70, 0.3); } return 0.4; },
  crack: (c, r, { now: t }) => { noiseBurst(c, r, t, 0.05, 'highpass', 3200, 0.7, 1.1); tone(c, r, t, 0.16, 'triangle', 320, 70, 0.5); noiseBurst(c, r, t + 0.05, 0.7, 'lowpass', 500, 0.5, 0.3); return 0.8; },
  at: (c, r, { now: t }) => { noiseBurst(c, r, t, 0.5, 'bandpass', 900, 0.5, 0.8); tone(c, r, t, 0.35, 'sawtooth', 500, 90, 0.2); noiseBurst(c, r, t, 0.9, 'lowpass', 260, 0.5, 0.5); return 1; },
  cannon: (c, r, { now: t }) => { tone(c, r, t, 0.5, 'sine', 120, 35, 1); noiseBurst(c, r, t, 0.25, 'bandpass', 800, 0.6, 1); noiseBurst(c, r, t + 0.05, 1.1, 'lowpass', 220, 0.5, 0.6); return 1.2; },
  aagun: (c, r, { now: t, e }) => { for (let i = 0; i < 3; i++) noiseBurst(c, r, t + i * 0.07, 0.08, 'bandpass', 1300, 0.8, 0.9, rnd(e.y + i) * 1.4); tone(c, r, t, 0.2, 'square', 150, 60, 0.2); return 0.4; },
  heligun: (c, r, { now: t }) => { for (let i = 0; i < 5; i++) noiseBurst(c, r, t + i * 0.045, 0.06, 'bandpass', 1100, 0.7, 0.8, i * 0.3); return 0.4; },
  zap: (c, r, { now: t }) => { tone(c, r, t, 0.18, 'sawtooth', 1400, 200, 0.4); return 0.3; },
  impact: (c, r, { now: t, e }) => { noiseBurst(c, r, t, 0.05, 'bandpass', 2800, 1.2, 0.7, rnd(e.x * 3) * 1.4); if (rnd(e.y + e.x) > 0.6) tone(c, r, t + 0.02, 0.18, 'sine', 2600, 1400, 0.12); return 0.25; }, // (a ricochet's whine now and then)
  blast_s: (c, r, { now: t }) => { tone(c, r, t, 0.4, 'sine', 90, 30, 0.9); noiseBurst(c, r, t, 0.2, 'lowpass', 1800, 0.5, 0.9); noiseBurst(c, r, t, 0.9, 'lowpass', 280, 0.5, 0.5); return 1; },
  blast_m: (c, r, { now: t }) => { tone(c, r, t, 0.7, 'sine', 80, 26, 1); noiseBurst(c, r, t, 0.3, 'lowpass', 2200, 0.5, 1); noiseBurst(c, r, t + 0.05, 1.6, 'lowpass', 220, 0.5, 0.7); return 1.7; },
  blast_l: (c, r, { now: t }) => { tone(c, r, t, 1.1, 'sine', 62, 20, 1.2); noiseBurst(c, r, t, 0.4, 'lowpass', 2000, 0.5, 1); noiseBurst(c, r, t + 0.1, 2.6, 'lowpass', 160, 0.5, 0.8); return 2.8; },
  whistle: (c, r, { now: t }) => { tone(c, r, t, 1.4, 'sine', 2200, 700, 0.18); noiseBurst(c, r, t, 1.4, 'bandpass', 1800, 4, 0.06); return 1.5; },
  engine: (c, r, { now: t, e, pl }) => { const hi = e.rpm === 'high'; const f = (hi ? 70 : e.rpm === 'low' ? 52 : 38) * (1 + rnd(e.x) * 0.1); const o = tone(c, r, t, 1.1, 'sawtooth', f, f * 1.02, 0.18); void o; tone(c, r, t, 1.1, 'square', f * 0.5, f * 0.5, 0.1); noiseBurst(c, r, t, 1.1, 'lowpass', hi ? 420 : 260, 0.6, 0.12); void pl; return 1.1; },
  tracks: (c, r, { now: t }) => { for (let i = 0; i < 6; i++) noiseBurst(c, r, t + i * 0.12, 0.05, 'bandpass', 1500 + (i % 3) * 300, 3, 0.5, i * 0.2); noiseBurst(c, r, t, 0.9, 'lowpass', 300, 0.6, 0.2); return 1; },
  rotor: (c, r, { now: t, e, dop }) => { const rate = (e.rpm === 'high' ? 15 : 10) * dop; const n = Math.floor(rate); for (let i = 0; i < n; i++) { noiseBurst(c, r, t + i / rate, 0.07, 'lowpass', 340 * dop, 0.7, 0.9, i * 0.17); } tone(c, r, t, 1, 'sine', 55 * dop, 55 * dop, 0.12); return 1.05; },
  aircraft: (c, r, { now: t }) => { noiseBurst(c, r, t, 3, 'bandpass', 700, 0.5, 0.35); const o = tone(c, r, t, 3, 'sawtooth', 170, 120, 0.12); void o; return 3.1; },
  door: (c, r, { now: t }) => { noiseBurst(c, r, t, 0.14, 'bandpass', 500, 1, 0.8); tone(c, r, t, 0.12, 'square', 130, 70, 0.25); return 0.2; },
  breach: (c, r, { now: t }) => { noiseBurst(c, r, t, 0.35, 'lowpass', 900, 0.5, 1); tone(c, r, t, 0.5, 'sine', 100, 38, 0.8); noiseBurst(c, r, t + 0.15, 0.6, 'bandpass', 2000, 2, 0.3); return 0.8; },
  shout: (c, r, { now: t, v, e }) => {
    const S = SHOUT[v.kind] || SHOUT.moving; const base = 1 + (rnd(String(e.id || '').length * 7 + e.x) - 0.5) * 0.35; const o = c.createOscillator(); o.type = 'sawtooth'; const n = S.f.length;
    o.frequency.setValueAtTime(S.f[0] * base, t); S.f.forEach((f, i) => o.frequency.linearRampToValueAtTime(f * base, t + (S.d * i) / (n - 1)));
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 0.04); g.gain.linearRampToValueAtTime(0.25, t + S.d * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + S.d);
    o.connect(g); for (const fc of S.v) { const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = fc * base; fl.Q.value = 5; g.connect(fl); fl.connect(r.in); r.nodes.push(fl); }
    o.start(t); o.stop(t + S.d + 0.05); r.srcs.push(o); r.nodes.push(g); return S.d;
  },
};
// (the drone's buzz rides on the 'shot' path with the weapon '__drone')
LIMITS.__drone = LIMITS.drone; VOICE.__drone = (c, r, { now: t }) => { tone(c, r, t, 0.55, 'sawtooth', 210, 230, 0.07); tone(c, r, t, 0.55, 'square', 420, 440, 0.03); return 0.6; };
