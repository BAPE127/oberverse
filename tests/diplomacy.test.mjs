// Diplomacy (v0.96.0): relations with the ten other countries, the quarrels between rivals (peace → dispute → tension → sanctions → war → ceasefire) and the one
// writer of wars and embargoes. Every chance is a hash of the day and the pair: no random draw, so a reload cannot change a quarrel. The arms market's rival list
// and aggression values are the input; the President's stance (commitments abroad) is a modifier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { DIPLOMACY as D } from '../src/content/diplomacy.js';
import { pairKey, bandOf, baseline, startChance, stepPair, targetScore, stepToward } from '../src/politics/diplomacy.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const AGG = Object.fromEntries(Object.entries(CONTENT.arms.countries).map(([id, c]) => [id, c.aggression]));
const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 7 * 60; g.market.dailyTick(); };
const hold = (g, ...keys) => { const s = g.politics.ensure(); s.policies = keys.map((k, i) => ({ id: i + 1, key: k, state: 'active', since: 1, by: s.government.partyId, votes: null })); g.politics._fxKey = null; };
/** Run `n` days of the world; returns the log of diplomacy's events (kind, pair key, day). */
function simulate(g, n, from = 2) {
  const events = []; const orig = g.politics.applyEvent.bind(g.politics);
  g.politics.applyEvent = (d, p, e, dd) => { events.push({ kind: e.kind, key: p.key, day: dd, aggressor: e.aggressor }); return orig(d, p, e, dd); };
  for (let d = from; d < from + n; d++) day(g, d);
  return events;
}

test('the rules: a relation reads in bands; a pair key is unordered; a baseline is a fixed hash; the chance of a dispute grows with aggression and with wars, and with commitments abroad where Sund is a party', () => {
  assert.equal(pairKey('varn', 'caldera'), pairKey('caldera', 'varn'));
  assert.deepEqual([-80, -40, -15, 0, 20, 70].map(bandOf), ['Hostile', 'Tense', 'Cool', 'Neutral', 'Warm', 'Friendly']);
  assert.equal(baseline('varn', 's'), baseline('varn', 's')); assert.notEqual(baseline('varn', 's'), baseline('varn', 't'));
  for (const id of Object.keys(CONTENT.arms.countries)) { const b = baseline(id, 'x'); assert.ok(b >= D.relations.baseline[0] && b <= D.relations.baseline[1]); }
  const ctx = { wars: 0, sundMod: 0, worldMod: 0 };
  const calm = startChance('varn', 'caldera', AGG, ctx);
  assert.ok(calm > 0 && calm < 0.5, `${calm}`);
  assert.ok(startChance('varn', 'caldera', AGG, { ...ctx, wars: 2 }) > calm, 'a world at war is tenser');
  assert.ok(startChance('varn', 'caldera', { ...AGG, varn: 0.9 }, ctx) > calm, 'aggression raises it');
  assert.ok(startChance('ostmark', 'sund', AGG, { ...ctx, sundMod: 0.6 }) > startChance('ostmark', 'sund', AGG, ctx), 'commitments abroad raise a dispute Sund is party to');
  assert.ok(startChance('ostmark', 'sund', AGG, { ...ctx, sundMod: -0.5 }) < startChance('ostmark', 'sund', AGG, ctx));
  assert.equal(startChance('varn', 'caldera', AGG, { ...ctx, sundMod: 0.6 }), calm, 'and leave other quarrels alone');
});

test('a quarrel moves along its chain, one stage at a time, never by a single roll; the same pair on the same day always gives the same answer', () => {
  const name = (id) => id;
  const ctx = { salt: 'k', wars: 0, sundMod: 0, worldMod: 0, agg: { ...AGG, varn: 1, caldera: 1 }, relation: 0, name };
  let p = { key: 'caldera|varn', a: 'caldera', b: 'varn', stage: 'peace', since: 0, until: null, cause: null, aggressor: null, settledDay: null };
  const kinds = []; let first = null;
  for (let d = 1; d <= 400; d++) {
    const r = stepPair(p, d, ctx);
    assert.deepEqual(stepPair(p, d, ctx), r, 'deterministic');
    p = r.pair;
    for (const e of r.events) { kinds.push(e.kind); if (e.kind === 'war' && !first) first = d; }
  }
  assert.ok(kinds.includes('dispute') && kinds.includes('tension') && kinds.includes('sanctions') && kinds.includes('war') && kinds.includes('ceasefire') && kinds.includes('settled'), JSON.stringify(kinds));
  // every war is preceded by a dispute, tension and sanctions, in that order, with no war straight out of peace
  for (let i = 0; i < kinds.length; i++) if (kinds[i] === 'war') assert.deepEqual(kinds.slice(i - 3, i), ['dispute', 'tension', 'sanctions']);
  for (let i = 0; i < kinds.length; i++) if (kinds[i] === 'ceasefire') assert.ok(kinds.slice(0, i).lastIndexOf('war') > kinds.slice(0, i).lastIndexOf('ceasefire'), 'a ceasefire follows a war');
  assert.ok(first > D.stage.dispute[0] + D.stage.tension[0] + D.stage.sanctions[0] - 3, 'a war takes weeks of warning');
  // after talks or a ceasefire there is a cooling-off
  const settled = { ...p, stage: 'peace', settledDay: 100, until: null };
  for (let d = 100; d < 100 + D.start.cooldown; d++) assert.deepEqual(stepPair(settled, d, ctx).events, [], 'no new dispute in the cooling-off');
});

test('relations: bounded, a point a day toward what the quarrels and the policies make of them; sanctions and war with Sund cost most; neutral Lirre is a little warmer', () => {
  const base = 10;
  const t0 = targetScore({ base });
  assert.equal(t0, 10);
  assert.ok(targetScore({ base, quarrels: { dispute: 1, sanctions: 0, war: 0 } }) < t0);
  assert.ok(targetScore({ base, quarrels: { dispute: 0, sanctions: 1, war: 0 } }) < targetScore({ base, quarrels: { dispute: 1, sanctions: 0, war: 0 } }));
  assert.ok(targetScore({ base, quarrels: { dispute: 0, sanctions: 0, war: 1 } }) < targetScore({ base, quarrels: { dispute: 0, sanctions: 1, war: 0 } }));
  assert.ok(targetScore({ base, embargoed: true }) < t0 && targetScore({ base, neutral: true }) > t0 && targetScore({ base, policy: 6 }) > t0);
  assert.equal(targetScore({ base: 99, policy: 15, neutral: true }), 100); assert.equal(targetScore({ base: -99, quarrels: { dispute: 0, sanctions: 0, war: 3 } }), -100);
  assert.equal(stepToward(0, 50), 1); assert.equal(stepToward(0, -50), -1); assert.equal(stepToward(5, 5), 5);
});

test('the record is made from the world as it stands: a running game keeps its war and its embargo, and every war in the market is a war in diplomacy', () => {
  const g = newGame(31);
  g.market.state; // the arms market starts with its war (Varnistan–Caldera) and the Pallas embargo
  g.market.state.wars.push({ a: 'lirre', b: 'pallas', since: 3 });
  const d = g.politics.ensureDiplomacy(g.politics.ensure());
  assert.equal(d.pairs['caldera|varn'].stage, 'war'); assert.equal(d.pairs['lirre|pallas'].stage, 'war'); assert.equal(d.pairs['lirre|pallas'].since, 3);
  assert.ok(g.market.country('pallas').embargo, 'the standing embargo is untouched by making the record');
  assert.equal(Object.keys(d.relations).length, 10); assert.ok(!d.relations.sund, 'Sund has relations with the others, not with itself');
  assert.ok(Object.keys(d.pairs).length >= 5);
  for (const [k, p] of Object.entries(d.pairs)) assert.equal(k, p.key);
  assert.equal(g.politics.diplomacy().countries.length, 10);
});

test('the one writer: over a year and a half every war is a war in diplomacy and every embargo has a reason; no random draw is made; a country has one quarrel at a time', () => {
  const g = newGame(41);
  g.market.state;
  const events = simulate(g, 540);
  // diplomacy's own day draws no random number (a hash of the day and the pair decides everything)
  let draws = 0; const next = g.rng.next.bind(g.rng);
  for (let d = 542; d < 640; d++) { g.clock.total = (d - 1) * 1440 + 7 * 60; void g.market.state; /* (the market posts its own orders first) */ g.rng.next = () => { draws++; return next(); }; g.politics.diplomacyDay(); g.rng.next = next; }
  assert.equal(draws, 0, 'diplomacy draws no random number (the market\'s daily tick no longer rolls for wars)');
  const d = g.politics.peek().diplomacy;
  const ms = g.market.state;
  for (const w of ms.wars) assert.equal(d.pairs[pairKey(w.a, w.b)].stage, 'war', 'a war in the market is a war in diplomacy');
  for (const p of Object.values(d.pairs)) if (p.stage === 'war') assert.ok(ms.wars.some((w) => pairKey(w.a, w.b) === p.key), 'and the other way round');
  for (const [id, c] of Object.entries(ms.countries)) if (c.embargo) assert.ok(['war', 'sanctions', 'international sanctions'].includes(c.embargoReason), `${id}: ${c.embargoReason}`);
  // one quarrel at a time: replay the events and check no country is in two
  const open = new Map();
  for (const e of events) {
    const [a, b] = e.key.split('|');
    if (e.kind === 'dispute') { for (const c of [a, b]) assert.ok(!open.has(c), `${c} was already in a quarrel on day ${e.day}`); open.set(a, e.key); open.set(b, e.key); }
    if (e.kind === 'ceasefire' || e.kind === 'settled') { open.delete(a); open.delete(b); }
  }
  assert.ok(events.some((e) => e.kind === 'war') && events.some((e) => e.kind === 'ceasefire'), 'wars start and end');
});

test('the world is as lively as before, not duller: across worlds and 500 days there are wars about two days in three, a new one every dozen days or so, and embargoes with them', () => {
  let days = 0; let any = 0; let wars = 0; let starts = 0; let emb = 0; const kinds = new Set(); const sundIn = { dispute: 0, war: 0 };
  for (const seed of [101, 202, 303, 404, 505, 606]) {
    const g = newGame(seed); g.market.state;
    let prev = g.market.state.wars.length;
    const events = simulate(g, 500);
    for (const e of events) { kinds.add(e.kind); if (e.key.includes('sund')) { if (e.kind === 'dispute') sundIn.dispute++; if (e.kind === 'war') sundIn.war++; } }
    // sample the state at the end of each day by replaying: use the events' days
    const w = new Set(); let cur = g.market.state.wars.length;
    void prev; void cur; void w;
    days += 500;
    starts += events.filter((e) => e.kind === 'war').length;
    const sim = newGame(seed); sim.market.state;
    for (let d = 2; d < 502; d++) { day(sim, d); const n = sim.market.state.wars.length; if (n) any++; wars += n; emb += Object.values(sim.market.state.countries).filter((c) => c.embargo).length; }
  }
  const share = any / days; const avg = wars / days; const per100 = (starts / days) * 100;
  assert.ok(share > 0.5 && share < 0.85, `wars on ${(share * 100).toFixed(0)}% of days`);
  assert.ok(avg > 0.6 && avg < 1.3, `${avg.toFixed(2)} wars on average`);
  assert.ok(per100 > 4 && per100 < 12, `${per100.toFixed(1)} new wars per 100 days`);
  assert.ok(emb / days > 0.5, 'embargoes follow the quarrels');
  for (const k of ['dispute', 'tension', 'sanctions', 'war', 'ceasefire', 'settled']) assert.ok(kinds.has(k), `${k} happens`);
  assert.ok(sundIn.dispute > 0, 'Sund quarrels with Ostmark sometimes');
});

test('the President\'s stance matters but guarantees nothing: more disputes for Sund under more commitments abroad, fewer under fewer; war is not certain under one nor peace under the other', () => {
  const run = (policy) => {
    let disputes = 0; let wars = 0;
    for (const seed of [11, 12, 13, 14, 15, 16, 17, 18]) {
      const g = newGame(seed); g.market.state; hold(g, policy);
      const events = simulate(g, 600);
      disputes += events.filter((e) => e.kind === 'dispute' && e.key === 'ostmark|sund').length;
      wars += events.filter((e) => e.kind === 'war' && e.key === 'ostmark|sund').length;
    }
    return { disputes, wars };
  };
  const up = run('abroad_up'); const down = run('abroad_down'); const none = run('police_up');
  assert.ok(up.disputes > none.disputes && none.disputes > down.disputes, `${up.disputes} > ${none.disputes} > ${down.disputes}`);
  assert.ok(down.disputes > 0, 'peace is not guaranteed under Liberty\'s stance — a dispute still comes');
  assert.ok(up.disputes > up.wars, 'war is not guaranteed under the sharper stance — talks settle many');
});

test('relations in play: they stay in bounds and move a point a day; fewer commitments abroad warm every country, more cool them; an embargo cools; the page reads the same each time', () => {
  const g = newGame(51); g.market.state;
  hold(g);
  for (let d = 2; d < 60; d++) day(g, d);
  const r0 = Object.fromEntries(Object.entries(g.politics.peek().diplomacy.relations).map(([k, v]) => [k, v.score]));
  hold(g, 'abroad_down');
  let prev = { ...r0 };
  for (let d = 60; d < 80; d++) { day(g, d); for (const [k, v] of Object.entries(g.politics.peek().diplomacy.relations)) { assert.ok(Math.abs(v.score - prev[k]) <= 1, `${k} moved at most a point`); assert.ok(v.score >= -100 && v.score <= 100); prev[k] = v.score; } }
  const warmed = Object.keys(r0).filter((k) => prev[k] > r0[k]).length;
  assert.ok(warmed >= 6, `most countries think better of Sund (${warmed})`);
  hold(g, 'abroad_up');
  for (let d = 80; d < 130; d++) day(g, d);
  const cooled = Object.entries(g.politics.peek().diplomacy.relations).filter(([k, v]) => v.score < prev[k]).length;
  assert.ok(cooled >= 6, `and think worse under the other stance (${cooled})`);
  const v = g.politics.diplomacy();
  assert.equal(v.countries.length, 10);
  for (const c of v.countries) assert.ok(c.name && c.band && Array.isArray(c.flags) && typeof c.score === 'number' && c.note, c.id);
  assert.ok(v.countries.find((c) => c.id === 'varn').ambassador, 'each country shows its ambassador');
  const before = JSON.stringify(g.politics.peek());
  g.politics.diplomacy(); g.politics.diplomacy();
  assert.equal(JSON.stringify(g.politics.peek()), before, 'reading changes nothing');
});

test('a reload cannot change a quarrel: a saved world carries on exactly as the original does; an old save (no record) gains one from its wars and embargoes', () => {
  const a = newGame(61); a.market.state;
  for (let d = 2; d < 120; d++) day(a, d);
  const b = roundtrip(a);
  for (let d = 120; d < 300; d++) { day(a, d); day(b, d); }
  assert.deepEqual(b.market.state.wars, a.market.state.wars);
  assert.deepEqual(Object.fromEntries(Object.entries(b.market.state.countries).map(([k, c]) => [k, [c.embargo, c.embargoReason]])), Object.fromEntries(Object.entries(a.market.state.countries).map(([k, c]) => [k, [c.embargo, c.embargoReason]])));
  assert.deepEqual(b.politics.peek().diplomacy.pairs, a.politics.peek().diplomacy.pairs);
  // an old save: no diplomacy record, a war and an embargo in the market
  const old = newGame(62); old.market.state; day(old, 2);
  delete old.politics.peek().diplomacy;
  const wars = JSON.stringify(old.market.state.wars);
  const o2 = roundtrip(old);
  assert.equal(JSON.stringify(o2.market.state.wars), wars);
  o2.politics.diplomacy();
  assert.ok(o2.politics.peek().diplomacy.pairs['caldera|varn'] && o2.politics.peek().diplomacy.relations.varn);
  assert.equal(JSON.stringify(o2.market.state.wars), wars, 'making the record changes no war');
});

test('with the commitments-abroad policies absent the relations and quarrels are the same world twice (the effects are the only coupling)', () => {
  const run = () => { const g = newGame(71); g.market.state; hold(g, 'police_up'); const ev = simulate(g, 300); return JSON.stringify(ev); };
  assert.equal(run(), run());
});
