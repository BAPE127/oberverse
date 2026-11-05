// Emergence (v0.97.0): optional offers that turn up because of the world, a weekly forecast or opinion piece, truth labels on every politics news item, and a world that runs
// perfectly well if you never open the Politics app. Nothing is mandatory; rewards are reputation, trust and regard, never cash; every unanswered offer ends with a reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { EMERGENCE as EM } from '../src/content/emergence.js';
import { INFLUENCE as I } from '../src/content/influence.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const hold = (g, ...keys) => { const s = g.politics.ensure(); s.policies = keys.map((k, i) => ({ id: i + 1, key: k, state: 'active', since: 1, by: s.government.partyId, votes: null })); s.nextPolicy = keys.length + 1; g.politics._fxKey = null; return s; };
const feed = (g, label) => (g.world.tablet?.feed || []).filter((f) => f.app === 'news' && /(✔ verified|❓ alleged|📈 forecast|💬 opinion) · /.test(f.text) && (!label || f.text.includes(label)));

test('the news carries a truth label: verified, alleged, forecast or opinion; nothing from politics is posted without one', () => {
  const g = newGame(3); const P = g.politics;
  assert.match(P.labelled('x'), /^✔ verified · x/); assert.match(P.labelled('x', 'alleged'), /^❓ alleged/); assert.match(P.labelled('x', 'forecast'), /^📈 forecast/); assert.match(P.labelled('x', 'opinion'), /^💬 opinion/);
  P.news('hello'); P.news('rumour', 'alleged');
  assert.equal(feed(g).length, 2);
  const s = toDay(g, 400);
  const el = s.elections;
  void el;
  const politics = (g.world.tablet.feed || []).filter((f) => f.app === 'news' && /ELECTION NIGHT|Demonstration|debate|Sanctions|WAR|Ceasefire|Talks succeed|forecast|opinion|scandal|Treasury/i.test(f.text));
  for (const f of politics) assert.match(f.text, /(✔ verified|❓ alleged|📈 forecast|💬 opinion) · /, f.text);
});

test('an offer turns up only on its day, from a condition in the world, hashed (never a random draw), at most two open and each kind not more than every forty days', () => {
  const g = newGame(5); const P = g.politics; const s = hold(g, 'farm_up');
  const m = g.farm.owned; void m;
  const [p1] = Object.keys(g.farm.def.plots); g.player.money = 5e6; g.farm.buy(p1);
  assert.ok(P.emergenceCheck('farmer_fee', s), 'a farm inspection fee and a farm of yours');
  hold(g); assert.equal(P.emergenceCheck('farmer_fee', s), null, 'no fee, no farmers');
  hold(g, 'farm_up');
  let seen = null;
  for (let n = 1; n <= 40 && !seen; n++) {
    const w = newGame(n * 31); const Pw = w.politics; const sw = hold(w, 'farm_up'); w.player.money = 5e6; w.farm.buy(Object.keys(w.farm.def.plots)[0]);
    toDay(w, 11);
    const o = sw.emergence?.offers.find((x) => x.tpl === 'farmer_fee');
    if (o) { seen = { w, o, sw }; assert.equal(o.day % EM.every, EM.offset, 'only on its day'); assert.equal(o.expires, o.day + EM.expiresIn); assert.equal(o.state, 'open'); }
  }
  assert.ok(seen, 'the farmers turn up in some worlds');
  // the same world, the same offers
  const again = newGame(1 * 31); void again;
  let draws = 0; const w = newGame(77); const sw = hold(w, 'farm_up'); w.player.money = 5e6; w.farm.buy(Object.keys(w.farm.def.plots)[0]); toDay(w, 3);
  const next = w.rng.next.bind(w.rng); w.rng.next = () => { draws++; return next(); };
  for (let d = 4; d < 120; d++) { w.clock.total = (d - 1) * 1440 + 8 * 60; w.politics.emergenceStep(sw, d); }
  assert.equal(draws, 0, 'no random draw');
  const open = (sw.emergence?.offers || []).filter((o) => o.state === 'open' || o.state === 'accepted').length;
  assert.ok(open <= EM.maxOpen);
  const farmers = sw.emergence.offers.filter((o) => o.tpl === 'farmer_fee').map((o) => o.day);
  for (let i = 1; i < farmers.length; i++) assert.ok(farmers[i] - farmers[i - 1] >= EM.cooldown, 'a cooldown between the same kind');
});

test('an unanswered offer ends with a stated reason, when its time is up or the world moves on; saying no is allowed and costs nothing', () => {
  const g = newGame(6); const P = g.politics; const s = hold(g, 'farm_up'); g.player.money = 5e6; g.farm.buy(Object.keys(g.farm.def.plots)[0]);
  const e = P.ensureEmergence(s);
  e.offers.push({ id: e.nextId++, tpl: 'farmer_fee', day: P.day, expires: P.day + 12, state: 'open', params: {}, reason: null });
  const o = e.offers[0];
  hold(g); // the fee goes
  P.emergenceStep(s, P.day + 1);
  assert.equal(o.state, 'expired'); assert.equal(o.reason, EM.templates.farmer_fee.gone);
  e.offers.push({ id: e.nextId++, tpl: 'farmer_fee', day: P.day, expires: P.day + 2, state: 'open', params: {}, reason: null }); hold(g, 'farm_up');
  const o2 = e.offers.at(-1);
  P.emergenceStep(s, P.day + 5);
  assert.equal(o2.state, 'expired'); assert.match(o2.reason, /moment has passed/);
  e.offers.push({ id: e.nextId++, tpl: 'farmer_fee', day: P.day, expires: P.day + 12, state: 'open', params: {}, reason: null });
  const o3 = e.offers.at(-1); const money = g.player.money; const rep = g.player.reputation[I.repFaction];
  assert.ok(P.declineOffer(o3.id).ok); assert.equal(o3.state, 'declined'); assert.equal(g.player.money, money); assert.equal(g.player.reputation[I.repFaction], rep);
  assert.ok(!P.acceptOffer(o3.id).ok && !P.declineOffer(o3.id).ok, 'a passed offer cannot be answered');
  const v = P.emergence(); assert.ok(v.recent.some((x) => x.reason));
});

test('answering: you take it on, and when you have done it the offer is done and pays reputation or trust — never cash; the farmers, the contractor and the organisers are answered where they happen', () => {
  const g = newGame(7); const P = g.politics; const s = hold(g, 'farm_up'); g.player.money = 5e6; g.farm.buy(Object.keys(g.farm.def.plots)[0]);
  P.donate(s.government.partyId, 40000);
  const e = P.ensureEmergence(s);
  e.offers.push({ id: e.nextId++, tpl: 'farmer_fee', day: P.day, expires: P.day + 12, state: 'open', params: {}, reason: null });
  const o = e.offers[0];
  assert.ok(P.acceptOffer(o.id).ok); assert.equal(o.state, 'accepted');
  P.emergenceStep(s, P.day + 1); assert.equal(o.state, 'accepted', 'not done until you do it');
  const money = g.player.money; const rep = g.player.reputation[I.repFaction];
  P.askMeeting('npc_min_agriculture'); // (it may be refused; the offer is about the ask)
  const r = P.offer('npc_min_agriculture', 'push', { policy: 'farm_down' });
  assert.ok(r.ok, r.text);
  P.emergenceStep(s, P.day + 1);
  assert.equal(o.state, 'done'); assert.equal(o.reason, EM.templates.farmer_fee.done);
  assert.equal(g.player.money, money, 'no cash');
  assert.ok(g.player.reputation[I.repFaction] > rep, 'a little reputation');
  // the organisers
  const d = g.politics.ensureUnrest(s); d.demos.push({ id: 5, day: P.day, cause: { text: 'x', bloc: 'workers' }, size: 50, anger: 0.3, days: 4, stage: 'march', organisers: 'w', spot: 'demonstration', supported: 0, spoke: -1, funded: false });
  e.offers.push({ id: e.nextId++, tpl: 'organisers_invite', day: P.day, expires: P.day + 12, state: 'open', params: { demo: 5, cause: 'x' }, reason: null });
  const oo = e.offers.at(-1); assert.ok(P.acceptOffer(oo.id).ok);
  P.speakDemo(5); P.emergenceStep(s, P.day + 1); assert.equal(oo.state, 'done');
});

test('choices: a journalist\'s lead (an allegation, labelled so, that gives a scandal more attention) and trade talks at an embassy (a country thinks better of Sund for a while, then it fades); both outcomes of the talks happen', () => {
  const g = newGame(8); const P = g.politics; const s = P.ensure(); const el = P.ensureElections(s);
  P.addScandal(s, el, { party: s.government.partyId, day: P.day, severity: 0.8, credibility: 1, attention: 0.8, source: 'press', text: 'a test scandal' });
  assert.ok(P.emergenceCheck('journalist_lead', s));
  const e = P.ensureEmergence(s);
  e.offers.push({ id: e.nextId++, tpl: 'journalist_lead', day: P.day, expires: P.day + 12, state: 'open', params: P.emergenceCheck('journalist_lead', s), reason: null });
  const o = e.offers[0]; const att = el.scandals.at(-1).attention; const rep = g.player.reputation[I.repFaction]; const m = g.player.money;
  assert.ok(!P.acceptOffer(o.id).ok, 'a choice is answered yes or no');
  assert.ok(P.answerOffer(o.id, true).ok);
  assert.ok(el.scandals.at(-1).attention > att && g.player.reputation[I.repFaction] > rep && g.player.money === m);
  assert.ok(feed(g, 'journalist').some((f) => /❓ alleged/.test(f.text)), 'an allegation is labelled one');
  assert.equal(o.state, 'done');
  // talks
  const outcomes = new Set();
  for (let n = 1; n <= 40; n++) {
    const w = newGame(n * 13); const Pw = w.politics; const sw = Pw.ensure(); w.market.state; const d = Pw.ensureDiplomacy(sw);
    const id = Object.keys(d.relations)[0]; d.relations[id].score = 30; w.market.state.countries[id].embargo = false; w.market.state.wars = [];
    const ew = Pw.ensureEmergence(sw);
    const params = Pw.emergenceCheck('embassy_talks', sw); assert.ok(params, 'a warm country');
    ew.offers.push({ id: ew.nextId++, tpl: 'embassy_talks', day: Pw.day, expires: Pw.day + 12, state: 'open', params, reason: null });
    const r = Pw.answerOffer(ew.offers[0].id, true); assert.ok(r.ok);
    const bonus = d.relations[params.id].bonus; outcomes.add(bonus > 0 ? 'good' : 'bad');
    if (bonus > 0) { const before = d.relations[params.id].score; for (let k = 0; k < 80; k++) { w.clock.total += 1440; w.market.dailyTick(); } assert.equal(d.relations[params.id].bonus, 0, 'regard fades'); void before; }
  }
  assert.ok(outcomes.has('good') && outcomes.has('bad'), JSON.stringify([...outcomes]));
});

test('closing the caveats: the President\'s own word opens the restricted rooms for a day (halver_pass); a donor\'s broken promise costs the party a little with the voters; the steward\'s invitations stay', () => {
  let got = null;
  for (let n = 1; n <= 60 && !got; n++) {
    const g = newGame(n * 19); g.player.money = 5e6; const P = g.politics; const s = P.ensure();
    P.donate(s.government.partyId, 50000); g.player.reputation[I.repFaction] = 20;
    const inf = P.ensureInfluence(s);
    inf.support[s.government.partyId] = 60;
    for (let day = 2; day < 40 && !got; day++) { g.clock.total = (day - 1) * 1440 + 8 * 60; const r = P.askMeeting('president'); if (r.ok) got = { g, P, day }; }
  }
  assert.ok(got, 'the President sometimes grants a meeting');
  assert.equal(got.g.getFlag('halver_pass'), got.day); assert.equal(got.g.getFlag('halver_appointment'), got.day);
  got.g.clock.total = (got.day + 3) * 1440 + 8 * 60; got.P.expireAppointments();
  assert.ok(!got.g.getFlag('halver_pass') && !got.g.getFlag('halver_appointment'), 'both lapse');
  got.g.setFlag('ironcrest_invited', true); got.P.expireAppointments(); assert.equal(got.g.getFlag('ironcrest_invited'), true);
  // a broken promise
  let broken = false;
  for (let n = 1; n <= 80 && !broken; n++) {
    const g = newGame(n * 13); g.player.money = 5e6; const P = g.politics; const s = P.ensure(); P.donate('order', 20000);
    const o = s.influence.obligations[0]; const sc0 = P.ensureElections(s).scandals.length;
    toDay(g, o.due + I.obligation.extend + 2);
    if (s.influence.obligations.find((x) => x.id === o.id)?.status === 'broken') { broken = true; assert.ok(s.elections.scandals.length > sc0 && s.elections.scandals.some((x) => x.party === 'order' && /forgot its promises/.test(x.text))); }
  }
  assert.ok(broken);
});

test('a world nobody visits: 200 days with the Politics app never opened run without a fault, move none of your money, and the news stays a few items a week', () => {
  const g = newGame(2024); const money = g.player.money;
  const start = g.world.tablet?.feed?.length || 0; void start;
  for (let d = 2; d <= 201; d++) { for (const m of [360, 367, 369, 400]) { g.clock.total = (d - 1) * 1440 + m; g.minuteTick(); } }
  assert.equal(g.player.money, money, 'politics never touched your money');
  const s = g.politics.peek();
  assert.ok(s && s.government && s.elections.history.length >= 1, 'it ran by itself');
  const items = (g.world.tablet?.feed || []).filter((f) => f.app === 'news' && /(✔ verified|❓ alleged|📈 forecast|💬 opinion) · /.test(f.text));
  assert.ok(items.length >= 3, `some politics in the news (${items.length})`);
  const byWeek = {};
  for (const f of items) { const w = Math.floor(f.at / (1440 * 7)); byWeek[w] = (byWeek[w] || 0) + 1; }
  const worst = Math.max(...Object.values(byWeek));
  assert.ok(worst <= 7, `a few items a week at most (worst week ${worst})`);
  assert.ok(!g.world.tablet.feed.some((f) => f.app === 'news' && /\[object|undefined|NaN/.test(f.text)), 'no broken lines');
  assert.ok(Number.isFinite(s.budget.debt) && s.budget.debt >= 0);
  assert.ok(!s.emergence || s.emergence.offers.filter((o) => o.state === 'open' || o.state === 'accepted').length <= EM.maxOpen);
});
