// Public opinion and polls (v0.94.0): nine blocs of voters across Sund's nine states (the Atlas's), worked out from the parties' platforms, the
// policies in force and measured drivers (the deficit, wars, embargoes) — never from individual voters. Polls ask a sample of it, with a stated
// margin, a house effect and a reporting delay; the true figure is never shown. No randomness: a poll's noise comes from hashing its number.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { BLOCS, REGIONS, POLLSTERS } from '../src/content/opinion.js';
import { POLICIES } from '../src/content/policies.js';
import { POLITICS } from '../src/content/politics.js';
import { affinity, compute, poll } from '../src/politics/opinion.js';
import { atlasStates } from '../src/world/atlas.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const platforms = { order: POLITICS.parties.order.platform, liberty: POLITICS.parties.liberty.platform };
const base = { gov: 'order', platforms, policies: [], deficitRatio: 0, wars: 0, embargoes: 0 };
const forward = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.politics.governmentDay(g.politics.ensure()); } };
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 9 }); assert.ok(sm.load('slot1', g2).ok); return g2; };

test('the content: nine blocs, and exactly Sund\'s nine Atlas states, each with its blocs\' shares summing to one and the weights to one', () => {
  assert.equal(Object.keys(BLOCS).length, 9);
  const sund = atlasStates().filter((s) => s.country === 'sund').map((s) => s.id).sort();
  assert.deepEqual(Object.keys(REGIONS).sort(), sund);
  for (const [id, R] of Object.entries(REGIONS)) { assert.ok(Math.abs(Object.values(R.shares).reduce((a, b) => a + b, 0) - 1) < 1e-9, `${id}: shares`); assert.deepEqual(Object.keys(R.shares).sort(), Object.keys(BLOCS).sort()); }
  assert.ok(Math.abs(Object.values(REGIONS).reduce((a, b) => a + b.weight, 0) - 1) < 1e-9);
  for (const b of Object.values(BLOCS)) assert.deepEqual(Object.keys(b.lean).sort(), Object.keys(POLITICS.issues).sort());
  for (const p of Object.values(POLICIES)) for (const bloc of Object.keys(p.blocs)) assert.ok(BLOCS[bloc], `${p.id} affects a real bloc: ${bloc}`);
});

test('blocs lean the way their interests say: civil-liberties voters to Liberty, defence workers and business to Order; and nothing is a global modifier', () => {
  assert.ok(affinity('civil_liberties', platforms.liberty) > affinity('civil_liberties', platforms.order));
  assert.ok(affinity('defence', platforms.order) > affinity('defence', platforms.liberty));
  assert.ok(affinity('workers', platforms.liberty) > affinity('workers', platforms.order) - 0.2, 'workers are not simply Order');
  for (const b of Object.keys(BLOCS)) for (const p of ['order', 'liberty']) assert.ok(affinity(b, platforms[p]) >= -1 && affinity(b, platforms[p]) <= 1);
});

test('opinion: bounded, distinct numbers (approval, disapproval, four party figures, eight indices); policies, the deficit and wars move it', () => {
  const t = compute(base);
  for (const k of ['approval', 'disapproval']) assert.ok(t[k] > 0 && t[k] < 1);
  assert.ok(Math.abs(Object.values(t.support).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'party support sums to one');
  assert.equal(Object.keys(t.indices).length, 9);
  for (const v of Object.values(t.indices)) assert.ok(v >= 0 && v <= 1);
  assert.equal(Object.keys(t.regions).length, 9); assert.ok(t.drivers.length >= 4 && t.drivers.every((d) => d.id && d.name));
  assert.notEqual(t.approval, t.support.order, 'approval and party support are distinct numbers');
  // policies in force: the ones a bloc likes raise its approval, overall effect bounded
  const liked = compute({ ...base, gov: 'order', policies: [POLICIES.defence_up, POLICIES.police_up] }).approval;
  const disliked = compute({ ...base, gov: 'order', policies: [POLICIES.defence_down, POLICIES.police_down] }).approval;
  assert.ok(liked !== disliked && Math.abs(liked - disliked) < 0.25, 'policies move approval, within bounds');
  assert.ok(compute({ ...base, deficitRatio: 0.5 }).approval < compute({ ...base, deficitRatio: -0.2 }).approval, 'a deficit costs the government');
  assert.ok(compute({ ...base, wars: 3 }).approval < t.approval, 'wars cost the government');
  assert.ok(compute({ ...base, policies: [POLICIES.police_up] }).indices.crimeConcern < t.indices.crimeConcern, 'more police, less concern about crime');
  assert.deepEqual(compute(base), compute(base), 'the same every time');
});

test('a poll: a stated margin from its sample, sampling error and a house effect, results that sum to one; the same poll twice is the same; no randomness', () => {
  const truth = compute(base);
  const P = POLLSTERS.courier;
  const a = poll(truth, { pollster: P, sample: 1000, key: 'k1' });
  assert.ok(Math.abs(a.margin - 1.96 * Math.sqrt(0.25 / 1000)) < 1e-9);
  assert.ok(Math.abs(Object.values(a.results).reduce((x, y) => x + y, 0) - 1) < 1e-9);
  assert.deepEqual(a, poll(truth, { pollster: P, sample: 1000, key: 'k1' }));
  assert.notDeepEqual(a.results, poll(truth, { pollster: P, sample: 1000, key: 'k2' }).results);
  // across many polls the errors are small and centred (within three standard errors; the house effect shifts by a point or so)
  let sumErr = 0; let worst = 0; const N = 200;
  for (let i = 0; i < N; i++) { const r = poll(truth, { pollster: POLLSTERS.panel, sample: 900, key: `m${i}` }); const e = r.results.order - truth.support.order; sumErr += e; worst = Math.max(worst, Math.abs(e)); }
  assert.ok(Math.abs(sumErr / N - POLLSTERS.panel.house.order) < 0.01, 'unbiased apart from the house effect');
  assert.ok(worst < 0.1, `no poll is wildly off (${worst.toFixed(3)})`);
  const big = poll(truth, { pollster: P, sample: 5000, key: 'k1' }); assert.ok(big.margin < a.margin, 'a bigger sample has a smaller margin');
  for (const r of Object.values(a.regional)) assert.ok(r.n >= 60 && r.order >= 0 && r.order <= 1);
});

test('the service: a first poll at the start, then each pollster on its own rhythm with a date, a pollster, a sample and a margin; the truth is never in what the player is shown', () => {
  const g = newGame(81);
  let P = g.politics.polls();
  assert.equal(P.count, 1); assert.equal(P.latest.pollster, 'courier'); assert.equal(P.latest.day, 1);
  forward(g, 60);
  P = g.politics.polls();
  assert.ok(P.count >= 6, `${P.count} polls in 60 days`);
  const days = g.world.politics.polls.map((p) => `${p.pollster}@${p.day}`);
  assert.ok(g.world.politics.polls.every((p) => p.margin > 0 && p.sample >= 500 && p.fieldwork < p.day && p.name));
  assert.equal(new Set(days).size, days.length, 'no pollster publishes twice in a day');
  assert.equal(JSON.stringify(P).includes('truth'), false);
  assert.ok(!('support' in P.latest) && !('series' in P), 'the true series and support are internal');
  assert.ok(g.world.politics.series.length > 30, 'the truth is kept (internally) for the systems that follow');
  forward(g, 400); assert.ok(g.world.politics.polls.length <= 60, 'history is capped'); assert.ok(g.world.politics.series.length <= 120);
});

test('a reload cannot change a poll or repeat one; the administration reads polls, not the truth', () => {
  const g = newGame(82); forward(g, 45);
  const before = JSON.stringify(g.world.politics.polls);
  const g2 = roundtrip(g); g2.politics.governmentDay(g2.world.politics);
  assert.equal(JSON.stringify(g2.world.politics.polls), before);
  forward(g, 10); forward(g2, 10);
  assert.equal(JSON.stringify(g2.world.politics.polls), JSON.stringify(g.world.politics.polls), 'the same later polls after a reload');
  const s = g.world.politics; assert.equal(g.politics.approval(s), s.polls[s.polls.length - 1].approval);
});

test('either party can lead: across many worlds and both governments, Order is ahead in some polls and Liberty in others', () => {
  let order = 0; let liberty = 0;
  for (let seed = 90; seed < 102; seed++) for (const gov of ['order', 'liberty']) {
    const g = newGame(seed); const s = g.politics.ensure();
    if (s.government.partyId !== gov) { s.government.partyId = gov; delete s.policies; g.politics.ensureGovernment(s); }
    forward(g, 100);
    const last = s.polls[s.polls.length - 1];
    if (last.results.order > last.results.liberty) order++; else liberty++;
  }
  assert.ok(order >= 3 && liberty >= 3, `Order ahead ${order}, Liberty ahead ${liberty}: both can lead`);
});
