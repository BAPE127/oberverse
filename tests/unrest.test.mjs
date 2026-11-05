// Unrest (v0.97.0): demonstrations as records with a small visible crowd; the police response from policy and staffing; what you may do; hooks left for later.
// Most end peacefully; none is ever a riot by rule. Every chance is a hash (no random draw); you are never wanted for standing in the square.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { UNREST as U } from '../src/content/unrest.js';
import { INFLUENCE as I } from '../src/content/influence.js';
import { POLICIES } from '../src/content/policies.js';
import { compute } from '../src/politics/opinion.js';
import { tensionOf, startChance, causeOf, policeLevel, newDemo, stepDemo, hooksOf } from '../src/politics/unrest.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const hold = (g, ...keys) => { const s = g.politics.ensure(); s.policies = keys.map((k, i) => ({ id: i + 1, key: k, state: 'active', since: 1, by: s.government.partyId, votes: null })); s.nextPolicy = keys.length + 1; g.politics._fxKey = null; return s; };
const seeded = (n) => n * 77 + 5;
/** A demonstration made by hand, so a test does not wait for one. */
const demo = (g, o = {}) => { const s = g.politics.ensure(); const u = g.politics.ensureUnrest(s); const d = newDemo({ id: u.nextId++, day: g.politics.day, key: `t|${u.nextId}`, cause: { kind: 'policy', bloc: 'workers', policy: 'enforce_strict', text: 'Workers and tradespeople against "Stricter enforcement"' }, tension: 0.4 }); Object.assign(d, o); u.demos.push(d); return d; };

test('the rules: tension is bounded and rises with every cause; a demonstration is likelier with tension; a cause is a bloc against a policy in force; the response follows policy and staffing', () => {
  const calm = { approval: 0.7, deficitRatio: 0, wars: 0, embargoes: 0, scandal: 0, dislike: 0, heat: 0 };
  const t0 = tensionOf(calm);
  assert.ok(t0 >= 0 && t0 < 0.3);
  for (const k of [['approval', 0.3], ['deficitRatio', 0.6], ['wars', 3], ['embargoes', 3], ['scandal', 1], ['dislike', 1], ['heat', 1]]) assert.ok(tensionOf({ ...calm, [k[0]]: k[1] }) > t0, k[0]);
  assert.equal(tensionOf({ approval: 0, deficitRatio: 9, wars: 99, embargoes: 99, scandal: 9, dislike: 9, heat: 9 }), 1, 'bounded');
  assert.ok(startChance(0.7) > startChance(0.3) && startChance(0.1) === U.start.base && startChance(1) <= U.start.cap);
  const pols = [POLICIES.enforce_strict, POLICIES.reg_up, POLICIES.farm_up];
  const c = causeOf(pols, 'k');
  assert.deepEqual(c, causeOf(pols, 'k'), 'the same every time');
  assert.equal(c.kind, 'policy'); assert.ok(pols.some((p) => p.id === c.policy) && POLICIES[c.policy].blocs[c.bloc] < 0, 'a bloc that dislikes it');
  assert.equal(causeOf([], 'k', { wars: 1 }).kind === 'war' || causeOf([], 'k', { wars: 1 }).kind === 'mood', true);
  const seen = new Set(Array.from({ length: 60 }, (_, i) => causeOf(pols, `k${i}`).policy)); assert.ok(seen.size >= 2, 'different policies draw different crowds');
  const base = policeLevel({ active: [], officers: 6 });
  assert.equal(base.name, 'firm');
  assert.equal(policeLevel({ active: ['police_up', 'enforce_strict'], officers: 6 }).name, 'heavy');
  assert.equal(policeLevel({ active: ['police_down', 'enforce_light'], officers: 6 }).name, 'light');
  assert.ok(policeLevel({ active: [], officers: 2 }).level < base.level && policeLevel({ active: [], officers: 12 }).level > base.level, 'fewer officers on duty, a lighter response');
});

test('a demonstration: a record with a size and an anger; it ends peacefully, is cleared, or escalates, by hash; a calm one never riots, a heavy hand on an angry crowd is likelier to', () => {
  const d0 = newDemo({ id: 1, day: 10, key: 'x', cause: { kind: 'policy', bloc: 'workers', text: 'w' }, tension: 0.5 });
  assert.ok(d0.size >= U.size[0] && d0.size <= 900 && d0.anger >= U.anger[0] && d0.anger <= U.anger[1] && d0.days >= U.days.min && d0.days <= U.days.max);
  assert.deepEqual(d0, newDemo({ id: 1, day: 10, key: 'x', cause: { kind: 'policy', bloc: 'workers', text: 'w' }, tension: 0.5 }));
  const run = (anger, size, police, n = 400) => { let riots = 0; for (let i = 0; i < n; i++) { const d = { ...d0, id: i, day: 1, anger, size }; const r = stepDemo(d, 3, { salt: 's', tension: 0.3, police: { name: police, level: 0.5 }, intelligence: 0 }); if (r.events.some((e) => e.kind === 'riot')) riots++; } return riots / n; };
  const calm = run(0.2, 80, 'light'); const hot = run(0.9, 350, 'firm'); const hotHeavy = run(0.9, 350, 'heavy');
  assert.ok(calm <= 0.02, `a calm crowd rarely riots (${calm})`);
  assert.ok(hot > calm && hotHeavy > hot, `${calm} < ${hot} < ${hotHeavy}`);
  assert.ok(hotHeavy <= U.riot.cap + 0.05, 'bounded');
  const end = stepDemo({ ...d0, day: 1, anger: 0.05, days: 3 }, 5, { salt: 's', tension: 0.1, police: { name: 'light', level: 0.2 }, intelligence: 0 });
  assert.ok(end.events.some((e) => e.kind === 'peaceful') && end.demo.stage === 'ended');
  const sur = (i) => { let n = 0; for (let k = 0; k < 600; k++) { const r = stepDemo({ ...d0, id: k, day: 1, anger: 0.9, size: 350 }, 3, { salt: 's', tension: 0.3, police: { name: 'firm', level: 0.5 }, intelligence: i }); if (r.events.some((e) => e.kind === 'riot')) n++; } return n; };
  assert.ok(sur(1) < sur(0), 'surveillance sees it coming');
});

test('over years most demonstrations end peacefully, a few are cleared, a few escalate; they come and go (not constant); at most two at once; nothing draws a random number; a reload carries on identically', () => {
  let starts = 0; let peaceful = 0; let cleared = 0; let riots = 0; let active = 0; let days = 0; let maxAt = 0;
  for (let n = 1; n <= 6; n++) {
    const g = newGame(seeded(n)); const P = g.politics; const s = P.ensure();
    const o = P.unrestEvent.bind(P); P.unrestEvent = (ss, u, d, e, day) => { if (e.kind === 'riot') riots++; if (e.kind === 'cleared') cleared++; if (e.kind === 'peaceful') peaceful++; return o(ss, u, d, e, day); };
    for (let d = 1; d <= 600; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; P.governmentDay(s); days++; const a = P.activeDemos(s).length; if (a) active++; maxAt = Math.max(maxAt, a); }
    starts += s.unrest.nextId - 1;
  }
  assert.ok(starts >= 60, `${starts} demonstrations`);
  assert.ok(peaceful / starts > 0.55, `most end peacefully (${peaceful} of ${starts})`);
  assert.ok(riots > 0 && riots / starts < 0.25, `some escalate, not most (${riots} of ${starts})`);
  assert.ok(cleared > 0, 'some are cleared');
  assert.ok(active / days > 0.05 && active / days < 0.4, `a demonstration on ${(active / days * 100).toFixed(0)}% of days`);
  assert.ok(maxAt <= U.start.max);
  // no random draw
  const g = newGame(99); const s = g.politics.ensure(); toDay(g, 30);
  let draws = 0; const next = g.rng.next.bind(g.rng); g.rng.next = () => { draws++; return next(); }; g.rng.int = (...a) => { draws++; return 0; };
  for (let d = 31; d < 200; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.unrestStep(s, d); }
  assert.equal(draws, 0);
  // reload
  const a = newGame(seeded(3)); toDay(a, 150); const b = roundtrip(a);
  toDay(a, 400); toDay(b, 400);
  assert.deepEqual(b.politics.peek().unrest, a.politics.peek().unrest);
});

test('the police response comes from the policies in force and the officers on duty, and is shown; most demonstrations are met lightly or firmly, never by accident', () => {
  const g = newGame(7); const P = g.politics;
  const s = hold(g, 'police_up', 'enforce_strict');
  assert.equal(P.policing(s).name, 'heavy');
  hold(g, 'police_down', 'enforce_light'); assert.equal(P.policing(s).name, 'light');
  hold(g); assert.equal(P.policing(s).name, 'firm');
  hold(g, 'surveil_up'); assert.equal(P.policing(s).intelligence, 1);
  hold(g, 'police_up', 'enforce_strict'); demo(g);
  const v = P.unrest();
  assert.equal(v.police, 'heavy'); assert.equal(v.active.length, 1); assert.ok(v.active[0].cause && v.active[0].size > 0);
});

test('what you may do: support the organisers (open, capped, recorded), speak for talks (once a day, may work or not), pay in secret (illicit: recorded, heat, found out like an offer)', () => {
  const g = newGame(3); g.player.money = 500000; const P = g.politics; const s = P.ensure();
  const d = demo(g, { size: 100, anger: 0.4 });
  assert.ok(!P.supportDemo(d.id, 500).ok, 'below the minimum');
  const m0 = g.player.money;
  assert.ok(P.supportDemo(d.id, 12000).ok);
  assert.equal(g.player.money, m0 - 12000); assert.ok(d.size > 100 && d.anger > 0.4);
  const e = s.influence.ledger.at(-1); assert.equal(e.kind, 'support'); assert.equal(e.public, true);
  assert.ok(!P.supportDemo(d.id, 10000).ok, 'over what one person may give');
  assert.ok(P.supportDemo(d.id, 8000).ok);
  // speaking: once a day; both outcomes happen across worlds
  const results = new Set();
  for (let n = 1; n <= 60; n++) { const w = newGame(seeded(n)); const dd = demo(w, { anger: 0.5 }); const a0 = dd.anger; const r = w.politics.speakDemo(dd.id); assert.ok(r.ok); results.add(dd.anger < a0 ? 'calmed' : 'resented'); assert.ok(!w.politics.speakDemo(dd.id).ok, 'once a day'); }
  assert.ok(results.has('calmed') && results.has('resented'), JSON.stringify([...results]));
  // secret money
  const g2 = newGame(5); g2.player.money = 500000; const P2 = g2.politics; const s2 = P2.ensure(); const d2 = demo(g2, { size: 100, anger: 0.4 });
  const m2 = g2.player.money; const heat0 = P2.ensureInfluence(s2).heat;
  assert.ok(P2.fundDemo(d2.id).ok);
  assert.equal(g2.player.money, m2 - U.fund.price); assert.ok(d2.size >= 125 && d2.funded);
  assert.ok(s2.influence.heat > heat0, 'it leaves heat'); assert.ok(!P2.fundDemo(d2.id).ok, 'once');
  const ent = s2.influence.ledger.at(-1); assert.equal(ent.kind, 'unrest'); assert.equal(ent.illicit, true); assert.equal(ent.party, P2.oppositionId());
  // found out like an offer: a scandal for the opposition, a fine, reputation
  s2.influence.heat = 40;
  let day = s2.lastGovDay; const rep0 = g2.player.reputation[I.repFaction]; const sc = (s2.elections?.scandals.length) || 0;
  for (let i = 0; i < 80 && !ent.exposed; i++) { day++; g2.clock.total = (day - 1) * 1440 + 8 * 60; P2.governmentDay(s2); s2.influence.heat = Math.max(s2.influence.heat, 25); }
  assert.ok(ent.exposed, 'found out');
  assert.ok(g2.player.reputation[I.repFaction] < rep0 && s2.elections.scandals.length > sc && s2.elections.scandals.some((x) => x.source === 'exposure' && /secret payments/.test(x.text)));
  // surveillance makes the same payment hotter
  const heatOf = (policy) => { const w = newGame(5); w.player.money = 500000; w.politics.ensure(); hold(w, policy); const dd = demo(w); const h0 = w.politics.ensureInfluence(w.politics.peek()).heat; w.politics.fundDemo(dd.id); return w.politics.peek().influence.heat - h0; };
  assert.ok(heatOf('surveil_up') > heatOf('police_up') && heatOf('police_up') > heatOf('surveil_down'));
});

test('the visible crowd: only while you are on the Crown Quarter in the afternoon; officers are sent on a firm or heavy response; nobody is called, and you are never wanted for being there', () => {
  const g = newGame(11); const P = g.politics; const s = hold(g, 'police_up', 'enforce_strict');
  P.ensureUnrest(s); demo(g);
  const wanted0 = g.police.state.wanted; const calls0 = g.police.state.calls.length;
  // elsewhere: nothing happens to anyone
  g.changeMap('halvermouth', 'start'); setTime(g, 3, '14:00');
  const before = JSON.stringify([...g.npcs.values()].map((n) => n.intent?.source || null));
  P.crowdTick();
  assert.equal(JSON.stringify([...g.npcs.values()].map((n) => n.intent?.source || null)), before, 'a demonstration is only a record when you are not there');
  // on the Crown Quarter: the opposition's organiser and press come, officers are sent
  g.changeMap('crown_quarter', 'west_gate'); setTime(g, 3, '14:00');
  const opp = P.oppositionId(); const org = g.npcs.get(opp === 'order' ? 'npc_ord_organiser' : 'npc_lib_organiser');
  org.map = 'crown_quarter';
  P.crowdTick();
  assert.equal(org.intent?.spot, 'crown_quarter:demonstration');
  assert.ok([...g.npcs.values()].some((n) => n.intent?.source === 'dispatch' && /crown_quarter/.test(n.intent.spot)), 'officers are sent');
  assert.equal(g.police.state.wanted, wanted0, 'you are not wanted'); assert.equal(g.police.state.calls.length, calls0, 'no call was placed');
  // outside the afternoon: nothing
  const g2 = newGame(11); const P2 = g2.politics; const s2 = P2.ensure(); P2.ensureUnrest(s2); demo(g2); g2.changeMap('crown_quarter', 'west_gate'); setTime(g2, 3, '22:00'); P2.crowdTick();
  assert.ok(![...g2.npcs.values()].some((n) => n.intent?.source === 'dispatch'));
});

test('hooks left for later: legitimacy, stability, factions, emergency powers (none) and succession; read-only and bounded; demonstrations weigh a little on opinion', () => {
  const h = hooksOf({ approval: 0.5, tension: 0.4, heat: 0.2, margin: 0.03, demos: 1, wars: 1 });
  assert.ok(h.legitimacy > 0 && h.legitimacy < 1 && h.stability > 0 && h.stability < 1 && h.emergencyPowers === false && h.factions.length >= 3 && h.succession.head);
  assert.ok(hooksOf({ approval: 0.2, tension: 0.9, heat: 1, margin: 0, demos: 2, wars: 3 }).stability < h.stability);
  const g = newGame(13); const P = g.politics; const s = P.ensure();
  P.unrest();
  const before = JSON.stringify(s);
  P.unrest(); P.unrest(); P.policing(s);
  assert.equal(JSON.stringify(s), before, 'reading changes nothing');
  const base = { gov: 'order', platforms: { order: s.parties.order.platform, liberty: s.parties.liberty.platform }, policies: [], deficitRatio: 0, wars: 0, embargoes: 0 };
  assert.equal(compute({ ...base, unrest: 0 }).approval, compute(base).approval, 'no unrest, no change');
  assert.ok(compute({ ...base, unrest: 1 }).approval < compute(base).approval && compute(base).approval - compute({ ...base, unrest: 1 }).approval < 0.06, 'a little, and bounded');
});

test('the police follow the government: calls are answered sooner with more funding, fines and sentences follow enforcement; an old save gains the unrest record', () => {
  const delay = (policy) => { const g = newGame(21); hold(g, policy); g.rng.state = 12345; g.police.placeCall(3, { map: 'halvermouth', x: 100, y: 100 }); return g.police.state.calls.at(-1).at - g.clock.total; };
  const up = delay('police_up'); const none = delay('spend_up'); const down = delay('police_down');
  assert.ok(up < none && none < down, `${up} < ${none} < ${down}`);
  const g = newGame(22); g.world.police.record = 10;
  hold(g, 'enforce_strict'); const strict = [g.police.finePrice(), g.police.sentenceHours()];
  hold(g, 'enforce_light'); const light = [g.police.finePrice(), g.police.sentenceHours()];
  hold(g); const none2 = [g.police.finePrice(), g.police.sentenceHours()];
  assert.ok(strict[0] > none2[0] && none2[0] > light[0] && strict[1] > none2[1] && none2[1] > light[1]);
  const o = newGame(23); toDay(o, 40); delete o.politics.peek().unrest;
  const o2 = roundtrip(o);
  assert.ok(o2.politics.unrest().tension >= 0 && o2.politics.peek().unrest);
});
