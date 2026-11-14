// The battle's sound (src/audio/battleAudio.js) with a stub AudioContext: every simulation sfx type has a voice, the voice cap and the rate limits hold over a long recorded battle, nothing throws
// without a context, and stopping releases every node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step } from '../src/battle/sim.js';
import { BattleAudio, voiceFor, LIMITS, SFX_TYPES } from '../src/audio/battleAudio.js';

function stubCtx() {
  const live = new Set(); let made = 0; let disconnected = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = (extra = {}) => { const n = { connect(x) { return x; }, disconnect() { if (live.delete(n)) disconnected++; }, start() {}, stop() {}, ...extra }; live.add(n); made++; return n; };
  const ctx = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: {},
    createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }),
    createGain: () => node({ gain: param() }), createBiquadFilter: () => node({ frequency: param(), Q: param(), type: '' }), createOscillator: () => node({ frequency: param(), type: '' }),
    createBufferSource: () => node({ buffer: null, loop: false }), createStereoPanner: () => node({ pan: param() }),
  };
  return { ctx, live, get made() { return made; }, get disconnected() { return disconnected; } };
}
const fakeAudio = (ctx) => ({ enabled: true, ctx, buses: { sfx: { gain: param0() }, ambience: { gain: param0() } }, failures: [] });
const param0 = () => ({ value: 1 });

function record(seed = 'AU1') {
  const people = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 ? 'officer' : i % 6 === 3 ? 'medic' : i % 6 === 1 ? 'machine_gunner' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const vehicles = [{ id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 }, { id: 'H1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 }];
  const B = createBattle(buildSetup({ key: `${seed}|x`, eng: { goal: 'defence', recipe: 'city', biome: 'rural', style: 'sund', enemy: { troops: 14, armour: 1, air: 1, skill: 1 } }, people, vehicles, ai: { p: true, e: true } }));
  const ticks = []; while (!B.over && B.tick < 1500) { step(B); ticks.push(B.sfx.slice()); }
  return { B, ticks };
}

test('every simulation sfx type has a voice, and unknown ones are ignored', () => {
  const { ticks } = record(); const seen = new Set(ticks.flat().map((e) => e.t));
  assert.ok(seen.size >= 5, [...seen].join());
  for (const t of seen) assert.ok(voiceFor({ t, weapon: 'item_lmg', size: 2, kind: 'contact' }), t);
  for (const t of SFX_TYPES) assert.ok(voiceFor({ t, weapon: 'tank_gun', size: 1 }), t);
  for (const v of SFX_TYPES.map((t) => voiceFor({ t, weapon: 'item_rpg', size: 4, kind: 'medic' }).voice)) assert.ok(LIMITS[v], v);
  assert.equal(voiceFor({ t: 'nonsense' }), null);
  for (const k of ['contact', 'suppressed', 'man_down', 'reloading', 'moving', 'medic', 'retreat']) assert.equal(voiceFor({ t: 'shout', kind: k }).kind, k);
});

test('over a long recorded battle the voice cap and the per-type limits hold', () => {
  const { ticks } = record(); const S = stubCtx(); const ba = new BattleAudio(fakeAudio(S.ctx)); ba.start(); assert.ok(ba.on);
  const L = { x: 40, y: 30, zoom: 1.2 }; let peak = 0; const per = {};
  ticks.forEach((evs, i) => { S.ctx.currentTime = i * 0.1; const before = { ...ba.stats.byVoice }; ba.feed(evs, L); ba.update({ map: { recipe: 'city' }, drones: [] }, L, 0.1, false); peak = Math.max(peak, ba.active.length);
    for (const [v, n] of Object.entries(ba.stats.byVoice)) { const d = n - (before[v] || 0); per[v] = Math.max(per[v] || 0, d); } });
  assert.ok(ba.stats.voices > 20, `voices ${ba.stats.voices}`); assert.ok(peak <= 24, `peak ${peak}`);
  for (const [v, n] of Object.entries(per)) assert.ok(n <= LIMITS[v].max, `${v} ${n} in one tick`);
  const burst = Array.from({ length: 60 }, () => ({ t: 'shot', weapon: 'item_assault_rifle', x: 41, y: 30, tx: 50, ty: 30 })); S.ctx.currentTime = 500; const n0 = ba.stats.byVoice.rifle || 0; ba.feed(burst, L);
  assert.ok((ba.stats.byVoice.rifle || 0) - n0 <= LIMITS.rifle.max, 'forty rifles do not clip'); assert.ok(ba.stats.limited > 0);
  assert.equal(ba.audio.failures.length, 0, ba.audio.failures.join());
});

test('a nearby sound is louder and further left or right pans; far ones are quieter and darker', () => {
  const ba = new BattleAudio(fakeAudio(stubCtx().ctx)); const L = { x: 30, y: 30, zoom: 1 };
  const a = ba.place(32, 30, 9, L); const b = ba.place(70, 30, 9, L); const c = ba.place(20, 30, 9, L);
  assert.ok(a.vol > b.vol * 3); assert.ok(a.lp > b.lp); assert.ok(a.pan > 0 && c.pan < 0);
  assert.ok(ba.place(32, 30, 9, { ...L, zoom: 3 }).vol > a.vol, 'louder zoomed in');
});

test('with no AudioContext every call is a silent no-op', () => {
  for (const audio of [null, {}, { enabled: false }, { enabled: true, ctx: null, buses: null }]) {
    const ba = new BattleAudio(audio); assert.doesNotThrow(() => { ba.start(); ba.feed([{ t: 'shot', x: 1, y: 1 }], { x: 0, y: 0, zoom: 1 }); ba.update({}, { x: 0, y: 0, zoom: 1 }, 0.1, false); ba.stop(); }); assert.equal(ba.on, false);
  }
  const broken = { enabled: true, ctx: { currentTime: 0, createGain() { throw new Error('boom'); } }, buses: { sfx: {} }, failures: [] };
  const ba = new BattleAudio(broken); assert.doesNotThrow(() => { ba.start(); ba.feed([{ t: 'shot', x: 1, y: 1 }], null); ba.stop(); });
});

test('stopping releases every node and silences the bed', () => {
  const { ticks } = record('AU2'); const S = stubCtx(); const ba = new BattleAudio(fakeAudio(S.ctx)); ba.start(); const L = { x: 40, y: 30, zoom: 1 };
  ticks.slice(0, 300).forEach((evs, i) => { S.ctx.currentTime = i * 0.1; ba.feed(evs, L); ba.update({ map: { recipe: 'forest' }, drones: [] }, L, 0.1, false); });
  assert.ok(S.live.size > 5 && ba.bed); ba.stop(); assert.equal(S.live.size, 0, 'all nodes released'); assert.equal(ba.bed, null); assert.equal(ba.on, false);
  assert.doesNotThrow(() => ba.stop());
});
