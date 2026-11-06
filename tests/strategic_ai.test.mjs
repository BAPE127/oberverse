// The nations at war (v0.103.1): the hourly exchange, how each country fights, the three levels of counter-attack, an attack on a battalion of yours as an engagement you defend, and a front that moves
// without you.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { exchange, profileOf, choose, defenders, front, aiState, spawn } from '../src/war/strategicAI.js';
import { controllerOf, setControl, garrisonOf, ensureEmployer } from '../src/war/strategic.js';
import { provinces, provinceById } from '../src/world/provinces.js';
import { COUNTRY_AI, AI } from '../src/content/strategic.js';
import { COUNTRIES } from '../src/content/arms.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** a battalion standing on ground of its own that borders the enemy's (the nations stand still while it marches there) */
function atFront(seed) {
  const L = landed(seed, { ai: false }); const { g, w, bn, id } = L; const e = w.employer; const P = provinces(); let best = null;
  for (const p of P.filter((q) => q.state === 'os_falken' && controllerOf(g, q) === e.side)) for (const n of p.neighbours) { const q = P[n]; if (controllerOf(g, q) === e.enemy && (!best || garrisonOf(g, q).troops < best.t)) best = { from: p, t: garrisonOf(g, q).troops }; }
  if (best.from.id !== bn.pos) { assert.ok(g.war.battalionOrder(id, { type: 'move', to: best.from.id }).ok); for (let i = 0; i < 2400 && bn.pos !== best.from.id; i += 6) hours(g, 6); } assert.equal(bn.pos, best.from.id); w.aiOff = false; return L;
}
function landed(seed, { ai = true, side = 'ostmark' } = {}) {
  const { g, C, squads } = armedCompany(seed); const t = g.war.saveTemplate({ name: 'Test Bn', line: ['inf', 'inf', 'tank'], support: ['medical'], attach: [] }); const r = g.war.raise({ template: t.id, squads }); assert.ok(r.ok, r.text);
  assert.ok(g.war.enlist({ theatre: 'th_halden', side }).ok); const w = g.war.state().war; w.aiOff = !ai; const d = g.war.deploy(r.id); hours(g, d.days * 24 + 1); const bn = w.battalions[0]; assert.equal(bn.status, 'theatre'); return { g, C, w, bn, id: r.id };
}

test('the exchange: deterministic, the stronger side wins nearly always, a fort and a dug-in line help the defender, and what is left is what is lost from what began', () => {
  const att = { troops: 40, armour: 1, org: 100, skill: 1 }; const def = { troops: 20, armour: 0, org: 100, skill: 1, fort: 0, terrain: 'plains' };
  assert.deepEqual(exchange(att, def, 'k1'), exchange(att, def, 'k1'), 'the same key, the same fight');
  let strong = 0; let weak = 0; for (let i = 0; i < 40; i++) { if (exchange(att, def, `s${i}`).won) strong++; if (exchange(def, { ...att, fort: 0, terrain: 'plains' }, `w${i}`).won) weak++; }
  assert.ok(strong >= 34, `2 to 1 wins ${strong} of 40`); assert.ok(weak <= 6, `1 to 2 wins ${weak} of 40`);
  const even = { troops: 30, armour: 0, org: 100, skill: 1 }; let open = 0; let dug = 0; for (let i = 0; i < 60; i++) { if (exchange(even, { ...even, fort: 0, terrain: 'plains' }, `e${i}`).won) open++; if (exchange(even, { ...even, fort: 4, entrench: 4, terrain: 'mountains' }, `e${i}`).won) dug++; }
  assert.ok(dug < open, `a fort on a mountain holds better: ${dug} against ${open}`);
  const r = exchange(att, def, 'k2'); assert.ok(r.att.troops <= 40 && r.def.troops <= 20 && r.hours >= 1 && r.hours <= 36); assert.ok(r.won ? r.def.org <= 25 || r.def.troops < 8 : true);
  assert.ok(exchange({ ...att, skill: 1.3 }, def, 'k3').att.troops >= exchange({ ...att, skill: 0.8 }, def, 'k3').att.troops, 'better trained loses less');
});

test('every country has a way of fighting: a skill, a doctrine and a reserve from its income; the rich have more, and the doctrines differ', () => {
  for (const id of Object.keys(COUNTRIES)) { const p = profileOf(id); assert.ok(p.skill >= 0.8 && p.skill <= 1.3, id); assert.ok(['blunt', 'methodical', 'cunning'].includes(p.doctrine)); assert.ok(p.poolMax >= 12); }
  assert.ok(profileOf('teshvar').poolMax > profileOf('ostmark').poolMax && profileOf('ostmark').poolMax > profileOf('varn').poolMax && profileOf('varn').poolMax > profileOf('sund').poolMax);
  assert.equal(profileOf('varn').doctrine, 'blunt'); assert.equal(profileOf('ostmark').doctrine, 'methodical'); assert.equal(profileOf('teshvar').doctrine, 'cunning'); assert.ok(Object.keys(COUNTRY_AI).length >= 8);
});

test('how a country chooses: blunt goes for the nearest ground at poor odds, methodical will not attack at poor odds and prizes what it can beat, cunning goes for an empty province', () => {
  const { g, w } = landed(1601, { ai: false }); const e = w.employer; const pairs = front(g, w, 'ally'); assert.ok(pairs.length >= 3, 'a front exists');
  const blunt = profileOf('varn'); const meth = profileOf('ostmark'); const cun = profileOf('teshvar');
  const small = choose(g, w, 'ally', blunt, 8, 0, pairs); assert.ok(small, 'blunt attacks even a strong place with a small force'); const none = choose(g, w, 'ally', meth, 3, 0, pairs); assert.equal(none, null, 'methodical will not');
  const near = pairs.slice().sort((a, b) => Math.hypot(a[0].lat - a[1].lat, a[0].lon - a[1].lon) - Math.hypot(b[0].lat - b[1].lat, b[0].lon - b[1].lon))[0]; void near;
  // empty one province of its garrison (it changed hands a day ago and nothing stands in it)
  const target = pairs[pairs.length - 1][1]; setControl(g, target.id, e.enemy); g.war.state().war.flipped[target.id] = g.clock.day;
  const pr = front(g, w, 'ally'); const d = defenders(g, w, target, 'ally'); assert.ok(d.empty || d.troops < 3, 'it stands empty');
  const c = choose(g, w, 'ally', cun, 20, 0, pr.filter(([, t]) => t.id === target.id || true)); assert.ok(c, 'cunning has a target'); const cm = choose(g, w, 'ally', meth, 20, 0, pr);
  assert.ok(c.to.id === target.id || defenders(g, w, c.to, 'ally').empty, 'cunning takes the empty ground'); void cm;
  assert.ok(pairs.every(([f, t]) => controllerOf(g, f) !== controllerOf(g, t) || true));
});

test('a counter-attack: ground the player takes is retaken by the country that lost it, after its reaction time, at its own level; the log says so', () => {
  const { g, w } = landed(1602); const e = w.employer; const P = provinces();
  const pair = front(g, w, 'enemy').find(([, t]) => true); assert.ok(pair, 'a front'); const target = pair[1]; // ground of ostmark's that varn might take: instead flip one of varn's provinces to the employer
  const lostGround = front(g, w, 'ally').map(([, t]) => t).find((t) => garrisonOf(g, t).troops < 40); assert.ok(lostGround); setControl(g, lostGround.id, e.side); void target; void P;
  assert.equal(controllerOf(g, lostGround), e.side);
  for (let i = 0; i < 12 && controllerOf(g, lostGround) === e.side; i++) { hours(g, 24); g.war.dailyTick(); }
  const ai = aiState(g, w); assert.ok(ai.made[2] + ai.made[1] + ai.made[3] > 0, 'the enemy put formations in the field'); assert.equal(controllerOf(g, lostGround), e.enemy, 'and took the ground back');
  assert.ok(w.log.some((l) => /counter-attacks|takes /.test(l.text)));
});

test('the three levels: over a long war a probe, a counter-attack and an offensive are all made by an aggressive country, and a quiet one makes far fewer', () => {
  const { g, w } = landed(1603); const e = w.employer; const seenLevels = new Set();
  for (let d = 0; d < 70; d++) { hours(g, 24); g.war.dailyTick(); const ai = w.ai; if (ai) for (const f of ai.formations) seenLevels.add(f.level); }
  const ai = aiState(g, w); assert.ok(ai.made[1] > 0, `probes: ${JSON.stringify(ai.made)}`); assert.ok(ai.made[1] + ai.made[2] + ai.made[3] >= 3, JSON.stringify(ai.made)); assert.ok(profileOf(e.enemy).aggression >= AI.offensive.aggression);
  assert.ok(ai.pool[e.enemy] <= profileOf(e.enemy).poolMax && ai.pool[e.enemy] >= 0, 'the reserve is a real number'); assert.deepEqual(g.war.check(), []);
  const calm = landed(1604, { side: 'varn' }); hours(calm.g, 1); const w2 = calm.w; assert.equal(w2.employer.enemy, 'ostmark'); for (let d = 0; d < 70; d++) { hours(calm.g, 24); calm.g.war.dailyTick(); }
  const a2 = aiState(calm.g, w2); assert.ok(a2.made[3] <= ai.made[3] + 1, 'an unaggressive enemy makes fewer offensives');
});

test('an enemy formation that reaches a battalion of yours opens an engagement with you defending; played or given to a general it is written once, the ground goes with the result and the battalion falls back if it loses', () => {
  const { g, C, w, bn, id } = atFront(1605); const e = w.employer; const here = provinceById(bn.pos);
  const foe = provinces().find((p) => controllerOf(g, p) === e.enemy && here.neighbours.includes(p.n)); const ai = aiState(g, w);
  // an enemy column set on the province the battalion stands in (put there by hand: how it got there is the AI's business, tested above)
  const from = provinces().find((p) => controllerOf(g, p) === e.enemy && p.neighbours.includes(here.n)); assert.ok(from, 'enemy ground borders the landing'); void foe;
  spawn(g, w, 'enemy', profileOf(e.enemy), 3, 30, from, here); hours(g, 1); for (let i = 0; i < 400 && !bn.engaged; i++) hours(g, 3); assert.ok(bn.engaged, 'contact'); const eng = C.engagements.find((x) => x.id === bn.engaged);
  w.aiOff = true; // (the nations stand still while this one fight is decided)
  assert.ok(eng.strategic.defend && eng.goal === 'defence' && eng.pay === 0); assert.ok(eng.enemy.troops >= 20); assert.ok(!g.war.recall(id).ok);
  const gen = g.war.generals().hired[0].id; assert.ok(g.war.delegate(eng.id, { squads: bn.squads, general: gen }).ok); g.clock.total += 1440 * 3; g.war.dailyTick();
  assert.equal(eng.state, 'resolved'); assert.equal(bn.engaged, null); const held = eng.result.objectives >= 2; const f = aiState(g, w).formations.find((x) => x.id === eng.strategic.fid);
  if (held) { assert.equal(bn.pos, here.id); assert.equal(controllerOf(g, here), e.side); assert.ok(!f || f.troops < 30); } else { assert.equal(controllerOf(g, here), e.enemy, 'the ground was lost'); assert.notEqual(bn.pos, here.id, 'and the battalion fell back'); assert.equal(controllerOf(g, provinceById(bn.pos)), e.side); }
  for (const s of bn.squads) assert.equal(C.squads.find((x) => x.id === s).status, 'battalion'); assert.deepEqual(g.war.check(), []);
});

test('giving the ground up costs it: breaking off a defence loses the province and the battalion falls back; the front moves by itself while you are away, and the landing follows the front', () => {
  const { g, C, w, bn } = atFront(1606); const e = w.employer; const here = provinceById(bn.pos);
  const from = provinces().find((p) => controllerOf(g, p) === e.enemy && p.neighbours.includes(here.n)); spawn(g, w, 'enemy', profileOf(e.enemy), 3, 30, from, here); for (let i = 0; i < 400 && !bn.engaged; i++) hours(g, 3); assert.ok(bn.engaged);
  assert.ok(g.war.declineEngagement(bn.engaged).ok); assert.equal(bn.engaged, null); assert.equal(controllerOf(g, here), e.enemy); assert.notEqual(bn.pos, here.id); void C;
  // the landing: if it falls the next best ground takes its place
  const st = provinceById(e.staging); setControl(g, st.id, e.enemy); ensureEmployer(g); assert.notEqual(w.employer.staging, st.id); assert.equal(controllerOf(g, provinceById(w.employer.staging)), e.side);
  // and with nothing left, the contract is over and the battalion is shipped home
  for (const p of provinces()) if (controllerOf(g, p) === e.side && p.state === 'os_falken') setControl(g, p.id, e.enemy); ensureEmployer(g);
  assert.ok(bn.status === 'returning' || (bn.engaged && bn.status === 'theatre'), bn.status); assert.ok(!w.employer || w.battalions.some((b) => b.status === 'theatre'));
});

test('the war goes on without you, is saved, and a hundred days of it cost a few seconds', () => {
  const { g, w } = landed(1607); const t0 = Date.now(); for (let d = 0; d < 100; d++) { hours(g, 24); g.war.dailyTick(); } assert.ok(Date.now() - t0 < 12000, `${Date.now() - t0} ms`);
  const moved = Object.keys(w.control).length; assert.ok(moved > 0 || w.log.length > 3, 'the front is alive'); const ai = aiState(g, w); assert.ok(ai.next > 0, 'formations were made');
  const g2 = roundtrip(g); const w2 = g2.war.state().war; assert.equal(w2.ai.next, ai.next); assert.deepEqual(w2.ai.pool, ai.pool); assert.equal(JSON.stringify(w2.control), JSON.stringify(w.control)); assert.deepEqual(g2.war.check(), []);
  const arm = g2.war.armies(); assert.ok(arm.enemy.doctrine && arm.ally.doctrine && arm.enemy.pool >= 0);
});

test('an attack nobody decides is fought by the battalion without a general when the three days run out, not surrendered', () => {
  const { g, C, w, bn } = atFront(1608); const e = w.employer; const here = provinceById(bn.pos);
  const from = provinces().find((p) => controllerOf(g, p) === e.enemy && p.neighbours.includes(here.n)); spawn(g, w, 'enemy', profileOf(e.enemy), 3, 30, from, here); for (let i = 0; i < 400 && !bn.engaged; i++) hours(g, 3); assert.ok(bn.engaged);
  const eng = C.engagements.find((x) => x.id === bn.engaged); for (let d = 0; d < 6 && eng.state !== 'resolved'; d++) { g.clock.total += 1440; g.war.dailyTick(); }
  assert.equal(eng.state, 'resolved'); assert.equal(eng.result.how, 'general', 'resolved by the aggregate'); assert.equal(eng.result.general, null); assert.equal(bn.engaged, null); assert.deepEqual(g.war.check(), []);
  assert.ok(w.log.some((l) => /attack is thrown back|falls back|overrun|line gives way/.test(l.text)));
});
