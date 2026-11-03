// The government (v0.94.0): a catalogue of sixteen policies, the seven states each moves through, the Assembly's vote (a tally of seats), the state's
// monthly budget (the state's money, never the player's), and an administration that proposes by scored decision on fixed windows. Deterministic:
// no random draw anywhere, so a reload or a second game with the same world gives the same government. None of it changes a price or a cost yet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { POLICIES, GOVERNMENT as G } from '../src/content/policies.js';
import { POLITICS } from '../src/content/politics.js';
import { vote, yesShare } from '../src/politics/assembly.js';
import { monthly } from '../src/politics/budget.js';
import { score, chooseProposals, advance, fitOf } from '../src/politics/policy.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const platforms = { order: POLITICS.parties.order.platform, liberty: POLITICS.parties.liberty.platform };
const seats = POLITICS.constitution.assemblySeats;
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** Run the government forward `n` days from the game's own start (the clock is set; no minutes of simulation). */
const forward = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.politics.governmentDay(g.politics.ensure()); } };

test('the catalogue: sixteen policies in eight opposed pairs, each on a real issue, spending or saving, with a stated effect and opinion on blocs', () => {
  const all = Object.values(POLICIES);
  assert.equal(all.length, 16);
  for (const p of all) {
    assert.ok(POLITICS.issues[p.issue], `${p.id}: a real issue`);
    const o = POLICIES[p.opposes]; assert.ok(o && o.opposes === p.id && o.issue === p.issue && o.dir === -p.dir, `${p.id} is opposed by ${p.opposes}`);
    assert.ok(p.dir === 1 ? p.cost > 0 : p.cost < 0, `${p.id}: raising costs, cutting saves`);
    assert.ok(p.moves && p.blurb && Object.keys(p.blocs).length >= 2, `${p.id}: it says what it will move and who it affects`);
  }
  for (const issue of Object.keys(POLITICS.issues)) assert.equal(all.filter((p) => p.issue === issue).length, 2, `${issue}: a policy each way`);
  assert.deepEqual(G.states, ['proposed', 'review', 'approved', 'implementing', 'active', 'suspended', 'ended']);
});

test('the Assembly: a tally of seats; strong support passes, strong opposition fails, the governing party\'s discipline helps its own bill', () => {
  const v = (id, governing) => vote(POLICIES[id], { seats, platforms, governing, discipline: G.discipline });
  const a = v('police_up', 'order'); assert.equal(a.seats, 100); assert.equal(a.yes + a.no, 100); assert.ok(a.passed && a.yes > 60, `Order's police bill passes (${a.yes})`);
  const b = v('police_up', 'liberty'); assert.ok(b.byParty.order.yes > b.byParty.liberty.yes, 'Order supports it, Liberty less');
  assert.ok(vote(POLICIES.surveil_up, { seats, platforms, governing: 'liberty', discipline: G.discipline }).yes < 50, 'Liberty cannot pass expanded surveillance');
  assert.ok(vote(POLICIES.enforce_light, { seats, platforms, governing: 'liberty', discipline: G.discipline }).passed, 'Liberty can pass lighter enforcement');
  assert.ok(yesShare(2, 1, true, G.discipline) > yesShare(2, 1, false, 0), 'discipline adds for the governing party');
  assert.ok(yesShare(-2, 1, false, 0) < 0.1 && yesShare(2, 1, false, 0) > 0.9);
  assert.deepEqual(v('defence_up', 'order'), v('defence_up', 'order'), 'the same every time');
});

test('the budget: the state\'s own money; revenue falls with wars and embargoes; policies spend or save; interest rides on the debt', () => {
  const base = monthly(G.budget, { policies: [], debt: 0, rate: 0.03 });
  assert.equal(base.revenue, G.budget.revenue); assert.equal(base.spending.total, 2200); assert.equal(base.deficit, -800);
  const war = monthly(G.budget, { policies: [], wars: 2, embargoes: 1, debt: 0 });
  assert.ok(war.revenue < base.revenue && war.revenue >= G.budget.revenue * 0.6);
  const spend = monthly(G.budget, { policies: [POLICIES.defence_up, POLICIES.spend_up], debt: 0 });
  assert.equal(spend.spending.policies, 470); assert.ok(spend.deficit > base.deficit);
  const save = monthly(G.budget, { policies: [POLICIES.spend_down], debt: 0 }); assert.equal(save.spending.policies, -200);
  const debt = monthly(G.budget, { policies: [], debt: 12000, rate: 0.03 }); assert.equal(debt.spending.interest, 40); // 12000 × 4% ÷ 12
  assert.ok(spend.headroom < base.headroom);
});

test('a policy\'s seven states: proposed, review, the Assembly\'s vote, approved, implementing (staff days), active — on fixed waits', () => {
  const p = { state: 'proposed', since: 10 };
  assert.equal(advance(p, 12, G), null); assert.equal(advance(p, 13, G), 'review');
  assert.equal(advance({ state: 'review', since: 13 }, 17, G), null); assert.equal(advance({ state: 'review', since: 13 }, 18, G), 'vote');
  assert.equal(advance({ state: 'approved', since: 18 }, 20, G), 'implementing');
  assert.equal(advance({ state: 'implementing', since: 20 }, 26, G), 'active');
  assert.equal(advance({ state: 'active', since: 26 }, 500, G), null, 'active policies stay until repealed');
});

test('the administration scores by platform fit, affordability and election timing; ties break by id; it proposes only what it believes in', () => {
  const ctx = (platform, headroom = 500, campaign = false) => ({ platform, headroom, campaign, approval: 0.5, weights: G.weights });
  const top = chooseProposals(ctx(platforms.order), [], 5).map((r) => r.policy.id);
  assert.ok(top.includes('defence_up') && top.includes('police_up') && !top.includes('police_down'));
  const lib = chooseProposals(ctx(platforms.liberty), [], 5).map((r) => r.policy.id);
  assert.ok(lib.includes('surveil_down') && lib.includes('enforce_light') && !lib.includes('surveil_up'));
  assert.ok(score(POLICIES.defence_up, ctx(platforms.order, 0)) < score(POLICIES.defence_up, ctx(platforms.order, 500)), 'a policy it cannot afford scores lower');
  assert.ok(score(POLICIES.spend_up, ctx(platforms.liberty, 500, true)) < score(POLICIES.spend_up, ctx(platforms.liberty, 500, false)), 'new spending is avoided close to a vote');
  assert.deepEqual(chooseProposals(ctx(platforms.order), [], 5), chooseProposals(ctx(platforms.order), [], 5));
  assert.equal(fitOf(platforms.order, POLICIES.defence_up), 2); assert.equal(fitOf(platforms.order, POLICIES.defence_down), -2);
});

test('a government starts with three policies in force that fit its platform; reading it changes nothing; the state\'s books are not the player\'s', () => {
  const g = newGame(71); const money = g.player.money;
  const gv = g.politics.government();
  assert.equal(gv.active.length, 3);
  const plat = POLITICS.parties[g.politics.governingId()].platform;
  for (const p of gv.active) assert.ok(fitOf(plat, p.def) > 0, `${p.key} fits ${g.politics.governingId()}`);
  assert.equal(g.player.money, money); assert.ok(gv.budget.debt === G.budget.startingDebt);
  assert.equal(JSON.stringify(g.politics.government()), JSON.stringify(gv), 'a read is pure');
});

test('over a term the cabinet proposes, the Assembly votes, policies come into force, the books close monthly and the debt moves; never more than seven in force', () => {
  const g = newGame(72);
  const s = g.politics.ensure();
  const debt0 = s.budget.debt;
  forward(g, 119);
  assert.ok(s.decisions.length >= 8, 'a history');
  assert.ok(s.policies.some((p) => p.votes), 'at least one Assembly vote');
  assert.ok(s.policies.some((p) => p.state === 'active' && p.since > 1), 'something new came into force');
  assert.ok(s.policies.filter((p) => p.state === 'active').length <= G.maxActive);
  assert.ok(s.budget.last && s.budget.last.day >= 90, 'the books close each month');
  assert.notEqual(s.budget.debt, debt0, 'the debt moved');
  const active = s.policies.filter((p) => p.state === 'active').map((p) => p.key);
  for (const k of active) assert.ok(!active.includes(POLICIES[k].opposes), 'no policy and its opposite in force together');
  for (const p of s.policies.filter((q) => q.votes)) assert.equal(p.votes.yes + p.votes.no, 100);
});

test('both parties govern differently; the same world gives the same government; a reload cannot repeat a day', () => {
  const run = (partyId) => { const g = newGame(73); const s = g.politics.ensure(); if (s.government.partyId !== partyId) { s.government.partyId = partyId; s.policies = []; delete s.policies; g.world.politics.policies = undefined; g.politics.ensureGovernment(g.world.politics); } forward(g, 90); return g.world.politics.policies.filter((p) => p.state === 'active').map((p) => p.key).sort(); };
  const o = run('order'); const l = run('liberty');
  assert.notDeepEqual(o, l); assert.ok(o.includes('defence_up') || o.includes('police_up')); assert.ok(l.includes('enforce_light') || l.includes('surveil_down'));
  assert.deepEqual(run('order'), o, 'deterministic');
  const g = newGame(74); forward(g, 40);
  const before = JSON.stringify(g.world.politics.decisions);
  g.politics.governmentDay(g.world.politics); g.politics.governmentDay(g.world.politics);
  assert.equal(JSON.stringify(g.world.politics.decisions), before, 'the same day twice changes nothing');
  const g2 = roundtrip(g); g2.politics.governmentDay(g2.world.politics);
  assert.equal(JSON.stringify(g2.world.politics.decisions), before, 'nor does a reload');
  assert.equal(g2.politics.government().budget.debt, g.politics.government().budget.debt);
});

test('a 0.93 record (no policies yet) gains a government when first used', () => {
  const g = newGame(75); const s = g.world.politics;
  for (const k of ['policies', 'budget', 'decisions', 'lastGovDay', 'lastCabinet', 'nextPolicy']) delete s[k];
  const gv = g.politics.government();
  assert.equal(gv.active.length, 3); assert.ok(g.world.politics.decisions.length >= 1);
});
