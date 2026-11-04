// Elections and campaigns (v0.95.0): the calendar, the campaign (funds, spending with diminishing returns, one debate, scandals), the vote on polling day
// (sealed until the 22:00 announcement), election night, and the change of term (President, Assembly, policies, the leaders' schedules).
// Deterministic: a result is a hash of the election's own key, so a reload can neither repeat it nor re-roll it, and money cannot buy a win.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, run, CONTENT, Game } from './helpers.mjs';
import { ELECTIONS as E } from '../src/content/elections.js';
import { POLITICS } from '../src/content/politics.js';
import { POLICIES } from '../src/content/policies.js';
import { REGIONS } from '../src/content/opinion.js';
import { termOf, phaseOf } from '../src/politics/calendar.js';
import { campaignEffect, staffStrength, scandalWeight, manifestoOf, promisesKept, tally, dhondt, debate } from '../src/politics/election.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** Run the government's days up to and including `to` (the clock is set; no minutes of simulation). */
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const seeded = (n) => n * 7919 + 13;

test('the calendar: a campaign in the last thirty days, polling on the last day; before it the parties only raise money', () => {
  const g = newGame();
  const s = g.politics.ensure();
  const C = s.constitution;
  assert.equal(termOf(120, C).electionDay, 120);
  assert.equal(phaseOf(90, C), 'term'); assert.equal(phaseOf(91, C), 'campaign'); assert.equal(phaseOf(120, C), 'polling');
  const funds0 = { order: s.parties.order.funds, liberty: s.parties.liberty.funds };
  toDay(g, 60);
  for (const id of ['order', 'liberty']) assert.ok(s.parties[id].funds > funds0[id], `${id} raised money`);
  assert.equal(s.elections.campaign, null, 'no campaign in term');
  toDay(g, 100);
  const camp = s.elections.campaign;
  assert.ok(camp && camp.term === 0, 'the campaign has begun');
  for (const id of ['order', 'liberty']) assert.ok(Object.values(camp.spent[id]).reduce((a, v) => a + v, 0) > 0, `${id} has spent`);
  assert.ok(!camp.debate, 'no debate yet');
  toDay(g, 118);
  assert.ok(camp.debate, 'the debate was held');
  assert.equal(camp.debate.day, 120 - E.debate.daysBefore);
});

test('spending has sharply diminishing returns, is capped, and works only as well as the staff who work it; money cannot buy a win', () => {
  const g = newGame();
  const s = g.politics.ensure();
  const full = JSON.parse(JSON.stringify(s.parties.order)); for (const r of full.staff) r.personId = r.personId || 'x';
  const eff = (n) => campaignEffect({ ads: n, rallies: n, ground: n }, full).total;
  const a = eff(50000); const b = eff(100000) - eff(50000); const c = eff(200000) - eff(150000);
  assert.ok(a > b && b > c && c >= 0, `each extra obol buys less (${a.toFixed(4)} > ${b.toFixed(4)} > ${c.toFixed(4)})`);
  const cap = Object.values(E.channels).reduce((x, ch) => x + ch.cap, 0);
  assert.ok(eff(1e9) <= cap + 1e-9 && eff(1e9) > cap * 0.99, 'a hard cap, however much is spent');
  const empty = JSON.parse(JSON.stringify(full)); for (const r of empty.staff) r.personId = null;
  assert.ok(Math.abs(staffStrength(empty, ['organiser']) - E.vacant) < 1e-9 && staffStrength(full, ['organiser']) === 1);
  assert.ok(campaignEffect({ ads: 80000, rallies: 80000, ground: 80000 }, empty).total < campaignEffect({ ads: 80000, rallies: 80000, ground: 80000 }, full).total, 'a vacant staff makes the money work less');
  // a ten-point deficit is not overturned by all the money in the world (against none)
  const R = Object.fromEntries(Object.keys(REGIONS).map((id) => [id, { order: 0.28, liberty: 0.40, other: 0.07, undecided: 0.25 }]));
  const truth = { gov: 'order', regions: R, approval: 0.45, support: {} };
  const r = tally({ key: 'x', truth, campaign: { order: eff(1e9), liberty: 0 }, scandals: { order: 0, liberty: 0 }, promises: 0.5, terms: 1 });
  assert.equal(r.winner, 'liberty', 'the leader in the polls still wins');
  const sum = (o) => o.order + o.liberty + o.other;
  assert.ok(Math.abs(sum(r.national) - 1) < 1e-9);
});

test('scandals fade, and a press secretary shortens them; a manifesto is the policies a party believes in most; promises kept are counted', () => {
  const sc = [{ party: 'order', day: 10, severity: 0.8, credibility: 1, attention: 1 }];
  const w0 = scandalWeight(sc, 'order', 10, E.vacant); const w1 = scandalWeight(sc, 'order', 40, E.vacant); const w2 = scandalWeight(sc, 'order', 40, 1);
  assert.ok(w0 > w1 && w1 > w2 && w2 > 0, 'it fades faster with a press secretary');
  assert.equal(scandalWeight(sc, 'liberty', 10, 1), 0, 'a scandal touches only its party');
  const m = manifestoOf(POLITICS.parties.order.platform, POLICIES);
  assert.equal(m.length, E.manifesto);
  assert.ok(m.every((id) => POLICIES[id].dir * (POLITICS.parties.order.platform[POLICIES[id].issue] || 0) > 0), 'each is one the party is for');
  assert.deepEqual(m, manifestoOf(POLITICS.parties.order.platform, POLICIES), 'the same every time');
  assert.equal(promisesKept(m, m.map((k) => ({ key: k, state: 'active' }))), 1);
  assert.equal(promisesKept(m, []), 0);
  assert.equal(promisesKept(m, [{ key: m[0], state: 'approved' }]), 0.5 / m.length);
  assert.deepEqual(dhondt({ order: 0.46, liberty: 0.44, other: 0.1 }, 100), { order: 46, liberty: 44, other: 10 });
  const d = debate({ standing: { order: 0.6, liberty: 0.4 }, comms: { order: 1, liberty: 0.6 }, key: 'k' });
  assert.deepEqual(d, debate({ standing: { order: 0.6, liberty: 0.4 }, comms: { order: 1, liberty: 0.6 }, key: 'k' }));
});

test('polling day: the vote is worked out and sealed; it is announced at 22:00; on the first day of the next term the winner takes office', () => {
  const g = newGame();
  const s = toDay(g, 119);
  assert.ok(!s.elections.pending, 'nothing before polling day');
  toDay(g, 120);
  const r = s.elections.pending;
  assert.ok(r && !r.announced && r.day === 120, 'the result exists, sealed');
  assert.equal(g.politics.campaign().last, null, 'the player sees nothing yet');
  assert.equal(s.constitution.electionsHeld, false);
  // 22:00 on polling day: the announcement
  g.clock.total = 119 * 1440 + 21 * 60 + 59; g.politics.minuteTick(); assert.ok(!r.announced, 'not before 22:00');
  g.clock.total = 119 * 1440 + 22 * 60; g.politics.minuteTick();
  assert.ok(r.announced && s.elections.history.length === 1);
  const h = g.politics.campaign().last;
  assert.equal(h.winner, r.winner); assert.equal(h.id, 1);
  assert.ok(Math.abs(h.national.order + h.national.liberty + h.national.other - 1) < 1e-3);
  assert.equal(h.seats.order + h.seats.liberty + h.seats.other, 100);
  assert.ok(h.turnout > 0.3 && h.turnout < 0.9);
  assert.ok(s.history.some((x) => x.kind === 'election'), 'in the record');
  assert.equal(s.government.partyId, r.gov, 'still the old government until the term ends');
  // the first day of the next term
  toDay(g, 121);
  assert.equal(s.government.partyId, r.winner);
  assert.equal(s.government.presidentId, POLITICS.parties[r.winner].leader);
  assert.equal(s.government.term, 1); assert.equal(s.government.termStart, 121);
  assert.deepEqual(s.constitution.assemblySeats, r.seats);
  assert.equal(s.constitution.electionsHeld, true);
  assert.equal(s.elections.pending, null, 'the result is spent');
  assert.ok(s.history.some((x) => x.kind === 'term' && x.day === 121));
});

test('a result cannot be repeated or re-rolled: a reload between the vote and the transition gives the same winner, the same figures, and one election', () => {
  const g = newGame();
  const s = toDay(g, 120);
  const before = JSON.stringify(s.elections.pending);
  const g2 = roundtrip(g);
  const s2 = g2.politics.peek();
  assert.equal(JSON.stringify(s2.elections.pending), before, 'the saved result is the result');
  g2.clock.total = 120 * 1440 + 6 * 60;
  const g1 = g; g1.clock.total = 120 * 1440 + 6 * 60;
  for (const x of [g1, g2]) { x.clock.total = 119 * 1440 + 22 * 60; x.politics.minuteTick(); toDay(x, 121); }
  assert.equal(g.politics.peek().government.partyId, s2.government.partyId);
  assert.equal(g.politics.peek().elections.history.length, 1); assert.equal(s2.elections.history.length, 1);
  // calling the day again (a reload, a second tick) does not hold the election twice
  toDay(g2, 121); g2.politics.governmentDay(s2);
  assert.equal(s2.elections.history.length, 1);
  // a second game with the same seed has the same election
  const a = newGame(4242); const b = newGame(4242);
  toDay(a, 240); toDay(b, 240);
  assert.deepEqual(a.politics.peek().elections.history, b.politics.peek().elections.history);
});

test('hundreds of seeded elections: each side wins a healthy share, nobody holds office for ever, and every result is whole', () => {
  const wins = { order: 0, liberty: 0 }; let total = 0; let maxRun = 0; let flips = 0;
  for (let n = 1; n <= 25; n++) {
    const g = newGame(seeded(n));
    const s = toDay(g, 120 * 8 + 1);
    let prev = null; let runLen = 0;
    assert.equal(s.elections.history.length, 8, `seed ${n}: eight elections`);
    for (const h of s.elections.history) {
      wins[h.winner]++; total++;
      assert.equal(h.seats.order + h.seats.liberty + h.seats.other, 100);
      assert.ok(Math.abs(h.national.order + h.national.liberty + h.national.other - 1) < 2e-3);
      assert.ok(h.turnout > 0.3 && h.turnout < 0.9 && h.margin >= 0);
      if (prev && prev !== h.winner) { flips++; runLen = 1; } else runLen++;
      prev = h.winner; maxRun = Math.max(maxRun, runLen);
    }
  }
  assert.ok(total >= 200);
  assert.ok(wins.order / total > 0.3 && wins.liberty / total > 0.3, `both sides win a healthy share (${wins.order} / ${wins.liberty})`);
  assert.ok(maxRun <= 6, `no side holds office for ever (longest run ${maxRun})`);
  assert.ok(flips >= total * 0.15, `the government changes hands (${flips} of ${total})`);
});

test('a change of government: the new President, the programmes still on their way are withdrawn, the leaders swap their working days', () => {
  let found = null;
  for (let n = 1; n <= 30 && !found; n++) {
    const g = newGame(seeded(n));
    const s = toDay(g, 120);
    if (s.elections.pending.winner !== s.elections.pending.gov) found = { g, s, n };
  }
  assert.ok(found, 'some seed changes hands in the first election');
  const { g, s } = found;
  const old = s.government.partyId;
  const winner = s.elections.pending.winner;
  const comingBefore = s.policies.filter((p) => ['proposed', 'review', 'approved', 'implementing'].includes(p.state)).map((p) => p.id);
  const activeBefore = s.policies.filter((p) => p.state === 'active').map((p) => p.id);
  toDay(g, 121);
  assert.equal(s.government.partyId, winner); assert.notEqual(winner, old);
  for (const id of comingBefore) { const p = s.policies.find((x) => x.id === id); assert.ok(p.state === 'ended' || p.since >= 121, `policy ${id} withdrawn or restarted`); }
  for (const id of activeBefore) { const p = s.policies.find((x) => x.id === id); assert.ok(p.state !== 'active' || p.owner === winner, 'the new government administers what is in force'); }
  g.politics.syncLeaders();
  const lead = (pid) => g.npcs.get(POLITICS.parties[pid].leader).profile.schedule;
  assert.ok(lead(winner).some((b) => /halver_/.test(b.spot || '')), 'the winner works at Halver House');
  assert.ok(!lead(old).some((b) => /halver_president/.test(b.spot || '')), 'the loser does not');
  assert.ok(g.politics.overview().history.some((h) => h.kind === 'term' || h.text.includes('take office')), 'the overview says so');
});

test('election night: the leaders and their staff gather in Sovereign Square at 19:30; nothing is announced before 22:00; the player is told', () => {
  const g = newGame();
  const s = toDay(g, 120);
  const notes = []; g.bus.on('politics:election', (e) => notes.push(e));
  g.clock.total = 119 * 1440 + 19 * 60 + 30; g.politics.minuteTick();
  const vegas = g.npcs.get('npc_vegas'); const susan = g.npcs.get('npc_susan');
  assert.equal(vegas.intent?.source, 'errand'); assert.equal(vegas.intent.spot, E.night.spots.leaders);
  assert.equal(susan.intent.spot, E.night.spots.leaders);
  const staff = s.parties.order.staff.find((x) => x.personId);
  assert.equal(g.npcs.get(staff.personId).intent.spot, E.night.spots.order, 'staff on their own side');
  assert.ok(notes.length === 0);
  g.clock.total = 119 * 1440 + 22 * 60; g.politics.minuteTick();
  assert.equal(notes.length, 1); assert.equal(notes[0].winner, s.elections.pending.winner);
  g.politics.minuteTick(); assert.equal(notes.length, 1, 'only once');
});

test('a save from 0.94.x gains the election and influence records; the Campaign view reads without changing anything', () => {
  const g = newGame();
  toDay(g, 30);
  const s = g.politics.peek();
  delete s.elections; delete s.influence;
  const g2 = roundtrip(g);
  const v = g2.politics.campaign();
  assert.equal(v.phase, 'term'); assert.equal(v.parties.length, 2);
  const before = JSON.stringify(g2.politics.peek());
  g2.politics.campaign(); g2.politics.campaign();
  assert.equal(JSON.stringify(g2.politics.peek()), before, 'reads change nothing');
  assert.ok(g2.politics.peek().elections && Array.isArray(g2.politics.peek().elections.scandals));
  assert.ok(g2.politics.influence().contacts.length >= 8);
});
