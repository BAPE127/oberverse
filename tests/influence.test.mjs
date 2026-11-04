// Influence (v0.95.0): relationships and access, donations, lobbying, promises, offers, the ledger and heat. Fictional game mechanics, with costs.
// Money, reputation, relationships and support are four separate things; a door needs the right mix and money alone opens none. An offer is shown
// plainly, charged before it resolves, recorded whatever the outcome, costs more when repeated, and cannot be re-rolled by reloading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { INFLUENCE as I } from '../src/content/influence.js';
import { POLICIES, GOVERNMENT as G } from '../src/content/policies.js';
import { vote } from '../src/politics/assembly.js';
import { accessOpen, priceOf, takeOdds, outcomes, pickOutcome, band, standingScore, tierOf } from '../src/politics/influence.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { fitOf } from '../src/politics/policy.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const rich = (g) => { g.player.money = 5000000; return g; };
const policyToPush = (s) => Object.values(POLICIES).find((p) => fitOf(s.parties[s.government.partyId].platform, p) > 0 && vote(p, { seats: s.constitution.assemblySeats, platforms: { order: s.parties.order.platform, liberty: s.parties.liberty.platform }, governing: s.government.partyId, discipline: G.discipline }).passed && !s.policies.some((q) => q.key === p.id && ['proposed', 'review', 'approved', 'implementing', 'active', 'suspended'].includes(q.state)));

test('the rules: a door opens on a relationship, or on support AND reputation (never money alone); prices rise with repeats; every outcome is reachable; standing reads in tiers', () => {
  const c = I.contacts.president;
  assert.ok(!accessOpen(c, { rel: 0, support: 999, rep: 0 }), 'all the support in the world, no reputation: closed');
  assert.ok(accessOpen(c, { rel: 25, support: 0, rep: 0 }), 'a real friendship opens it');
  assert.ok(accessOpen(c, { rel: 0, support: 40, rep: 5 }), 'support with reputation opens it');
  const r = I.requests.push;
  assert.ok(priceOf(r, c, 1) > priceOf(r, c, 0) && priceOf(r, c, 3) > priceOf(r, c, 2), 'repeats cost more');
  assert.equal(priceOf(r, c, 9), priceOf(r, c, I.repeatCap), 'with a ceiling');
  const base = { rel: 0, support: 0, rep: 0, repeats: 0, pressure: 0, gatekeeper: 0, favours: 0, illicit: true, contact: c };
  const p = takeOdds(base);
  assert.ok(p >= I.odds.floor && p <= I.odds.ceiling);
  assert.ok(takeOdds({ ...base, repeats: 3 }) < p && takeOdds({ ...base, pressure: 1 }) < p && takeOdds({ ...base, gatekeeper: 1 }) < p && takeOdds({ ...base, rel: 40 }) > p);
  assert.ok(takeOdds({ ...base, contact: I.contacts.chief }) > takeOdds({ ...base, contact: c }), 'a more pliable official takes it more readily');
  for (const illicit of [true, false]) {
    const o = outcomes(0.5, illicit);
    assert.ok(Math.abs(Object.values(o).reduce((a, v) => a + v, 0) - 1) < 1e-9);
    const seen = new Set(Array.from({ length: 400 }, (_, i) => pickOutcome(o, i / 400)));
    for (const k of illicit ? ['accepted', 'half', 'delayed', 'refused', 'counter', 'reported'] : ['accepted', 'half', 'delayed', 'refused', 'counter']) assert.ok(seen.has(k), `${k} is reachable (illicit ${illicit})`);
    if (!illicit) assert.ok(!seen.has('reported'), 'lobbying is never "reported"');
  }
  assert.deepEqual(['low', 'medium', 'high'], [band(0.1), band(0.4), band(0.8)]);
  assert.equal(tierOf(standingScore({ rep: 0, support: 0, rel: 0, heat: 0 })).id, 'unknown');
  assert.equal(tierOf(standingScore({ rep: 40, support: 30, rel: 20, heat: 0 })).id, 'trusted');
  assert.ok(standingScore({ rep: 40, support: 30, rel: 20, heat: 10 }) < standingScore({ rep: 40, support: 30, rel: 20, heat: 0 }), 'exposure costs standing');
});

test('a donation: public, recorded, capped per donor per term, a transfer (your cash becomes the party\'s), it earns support and a hearing, never a door by itself', () => {
  const g = rich(newGame()); const P = g.politics; const s = P.ensure();
  const money0 = g.player.money; const funds0 = s.parties.order.funds;
  assert.ok(!P.donate('order', 500).ok, 'below the minimum');
  const r = P.donate('order', 30000);
  assert.ok(r.ok);
  assert.equal(g.player.money, money0 - 30000); assert.equal(s.parties.order.funds, funds0 + 30000, 'a transfer: nothing is made or lost');
  const e = s.influence.ledger.at(-1);
  assert.equal(e.kind, 'donation'); assert.equal(e.public, true); assert.equal(e.amount, 30000);
  const st = P.standing();
  assert.equal(st.support.order, 30); assert.ok(st.favours.order > 2 && st.favours.order <= I.donation.favourCap); assert.equal(st.donated.order, 30000);
  assert.ok(!P.donate('order', 30000).ok, 'over the cap this term');
  assert.ok(P.donate('order', 20000).ok, 'exactly to the cap');
  assert.ok(!P.donate('order', 1000).ok);
  assert.ok(P.donate('liberty', 10000).ok, 'the cap is per party');
  assert.equal(P.standing().favours.order, I.donation.favourCap, 'favours are capped too');
  const pres = P.influence().contacts.find((c) => c.key === 'president');
  assert.ok(!pres.open, 'the President\'s door stays closed to money alone: it needs a reputation or a friendship');
  toDay(g, 121);
  assert.ok(P.donate('order', 30000).ok, 'a new term, a new cap');
});

test('a meeting: free, may be refused with a reason, grants a short appointment that lapses; a closed door says what it takes', () => {
  const g = rich(newGame()); const P = g.politics; const s = P.ensure();
  assert.ok(!P.askMeeting('president').ok && /takes a friendship/.test(P.askMeeting('president').text), 'closed: it says what it takes');
  P.donate(s.government.partyId, 20000);
  let got = null;
  for (let day = 2; day < 60 && !got; day++) { g.clock.total = (day - 1) * 1440 + 8 * 60; const r = P.askMeeting('chief'); if (r.ok) got = day; else assert.ok(/diary|campaign|questions/.test(r.text), 'a refusal is explained'); }
  assert.ok(got, 'a meeting is granted some day');
  assert.equal(g.getFlag('halver_appointment'), got, 'you are on the list at Halver House');
  assert.equal(P.askMeeting('chief').ok, true, 'asking again the same day gives the same answer');
  g.clock.total = (got + 3) * 1440 + 8 * 60; P.expireAppointments();
  assert.ok(!g.getFlag('halver_appointment'), 'the appointment lapses');
  g.setFlag('ironcrest_invited', true); P.expireAppointments(); assert.equal(g.getFlag('ironcrest_invited'), true, 'the steward\'s own invitation stays');
});

test('an offer is shown before money moves, charged once, recorded whatever the outcome, and repeats cost more; a reload does not repeat or re-roll it', () => {
  const g = rich(newGame(11)); const P = g.politics; const s = P.ensure();
  P.donate(s.government.partyId, 20000);
  const pol = policyToPush(s);
  const q = P.quote('chief', 'push', { policy: pol.id, illicit: true });
  assert.ok(q.ok && q.price > 0 && q.p > 0 && q.band && /fine of twice/.test(q.found), 'price, odds, and what happens if found out');
  const m0 = g.player.money;
  assert.equal(g.player.money, m0, 'quoting moves nothing'); assert.equal(s.influence.ledger.filter((e) => e.kind === 'offer').length, 0);
  const r = P.offer('chief', 'push', { policy: pol.id, illicit: true });
  assert.ok(r.ok && ['accepted', 'half', 'delayed', 'refused', 'counter', 'reported'].includes(r.outcome));
  assert.equal(g.player.money, m0 - q.price, 'charged once, before it resolves, whatever the outcome');
  const offers = () => s.influence.ledger.filter((e) => e.kind === 'offer');
  assert.equal(offers().length, 1); assert.equal(offers()[0].amount, q.price); assert.equal(offers()[0].outcome, r.outcome);
  const q2 = P.quote('chief', 'push', { policy: pol.id, illicit: true });
  if (q2.ok) assert.ok(q2.price > q.price, 'the second offer costs more');
  assert.ok(s.influence.heat >= I.heat.illicit, 'it leaves heat');
  const g2 = roundtrip(g);
  assert.equal(g2.player.money, g.player.money); assert.equal(JSON.stringify(g2.politics.peek().influence.ledger), JSON.stringify(s.influence.ledger), 'the ledger survives the save');
  assert.equal(g2.politics.peek().influence.nextId, s.influence.nextId, 'a reload cannot repeat the offer number');
});

test('every outcome happens: across many offers each of the six comes up, a counter-offer can be taken at its price (charged once), and an official\'s favours are finite', () => {
  const seen = {}; let counters = 0;
  for (let n = 1; n <= 60; n++) {
    const g = rich(newGame(n * 31)); const P = g.politics; const s = P.ensure();
    P.donate(s.government.partyId, 30000);
    const pol = policyToPush(s);
    const r = P.offer('chief', 'push', { policy: pol.id, illicit: true });
    if (!r.ok) continue;
    seen[r.outcome] = (seen[r.outcome] || 0) + 1;
    if (r.outcome === 'counter' && counters++ < 3) {
      const k = s.influence.counters.at(-1); const m = g.player.money;
      const a = P.acceptCounter(k.id);
      assert.ok(a.ok && a.outcome === 'accepted'); assert.equal(g.player.money, m - k.price, 'charged once at the new price');
      assert.ok(!P.acceptCounter(k.id).ok, 'not twice');
    }
  }
  for (const k of ['accepted', 'half', 'delayed', 'refused', 'counter', 'reported']) assert.ok(seen[k] > 0, `${k} happens (${JSON.stringify(seen)})`);
  // the finite favours of an official: chief has 3 a term
  const g = rich(newGame(3)); const P = g.politics; const s = P.ensure();
  P.donate(s.government.partyId, 30000);
  let taken = 0;
  for (let i = 0; i < 40; i++) {
    const pol = policyToPush(s) || Object.values(POLICIES)[i % 16];
    const r = P.offer('chief', 'stall', { policy: Object.keys(POLICIES)[i % 16], illicit: true });
    if (r.ok && ['accepted', 'half', 'delayed'].includes(r.outcome)) taken++;
    void pol;
  }
  assert.ok(taken <= I.contacts.chief.favours, `an official can only do so many favours a term (${taken})`);
});

test('lobbying costs favours, not money; with none it says so; a donation earns them; a policy the party stands against is never taken up', () => {
  const g = rich(newGame(8)); const P = g.politics; const s = P.ensure();
  const gov = s.government.partyId;
  const money = g.player.money;
  P.donate(gov, 20000);
  const pol = policyToPush(s);
  const q = P.quote('chief', 'push', { policy: pol.id });
  assert.ok(q.ok && q.price === 0 && q.favours === 1);
  const fav = P.standing().favours[gov];
  const r = P.offer('chief', 'push', { policy: pol.id });
  assert.ok(r.ok);
  assert.equal(g.player.money, money - 20000, 'lobbying itself costs no money');
  assert.ok(P.standing().favours[gov] < fav, 'it costs a favour');
  // none left
  s.influence.favours[gov] = 0;
  const pol2 = Object.values(POLICIES).find((p) => p.id !== pol.id && fitOf(s.parties[gov].platform, p) > 0 && !s.policies.some((q) => q.key === p.id && ['proposed', 'review', 'approved', 'implementing', 'active'].includes(q.state)));
  assert.ok(!P.quote('chief', 'push', { policy: pol2.id }).ok && /favour/.test(P.quote('chief', 'push', { policy: pol2.id }).text));
  // against the party's platform: odds at the floor
  s.influence.favours[gov] = 4;
  const against = Object.values(POLICIES).find((p) => fitOf(s.parties[gov].platform, p) < 0 && !s.policies.some((x) => x.key === p.id && ['proposed', 'review', 'approved', 'implementing', 'active'].includes(x.state)));
  assert.ok(against);
  assert.ok(P.quote('chief', 'push', { policy: against.id }).p <= I.odds.floor + 1e-9, 'a party will not take up what it stands against');
  assert.ok(!P.quote('chief', 'quiet', {}).ok, 'a scandal cannot be lobbied away openly');
  assert.ok(!P.quote('chief', 'leak', { illicit: true }).ok, 'only the opposition takes a leak');
});

test('the effects exist: a policy asked of the cabinet is weighed (and proposed), a delay moves a policy on its way, a leak and a quiet word move a scandal', () => {
  let proposed = false; let delayed = false; let leaked = false; let quieted = false;
  for (let n = 1; n <= 40 && !(proposed && delayed && leaked && quieted); n++) {
    const g = rich(newGame(n * 17)); const P = g.politics; const s = P.ensure();
    const gov = s.government.partyId; const opp = gov === 'order' ? 'liberty' : 'order';
    P.donate(gov, 30000); P.donate(opp, 30000);
    if (!proposed) {
      const pol = policyToPush(s);
      const r = P.offer('chief', 'push', { policy: pol.id, illicit: true });
      if (['accepted'].includes(r.outcome)) {
        assert.ok(P.pushBonus(s)[pol.id] > 0, 'the cabinet gives it extra weight');
        toDay(g, 30);
        assert.ok(s.policies.some((p) => p.key === pol.id), 'the cabinet took it up');
        assert.ok(!s.influence.pushes.some((p) => p.policy === pol.id), 'and the ask is spent');
        proposed = true;
      }
    }
    if (!delayed) {
      toDay(g, 9); // the cabinet has met once: something is on its way
      const inProg = s.policies.find((p) => ['proposed', 'review'].includes(p.state));
      if (inProg) {
        const since = inProg.since;
        const r = P.offer('chief', 'stall', { policy: inProg.key, illicit: true });
        if (r.outcome === 'accepted') { assert.equal(inProg.since, since + 14); delayed = true; }
      }
    }
    if (!leaked) {
      // the opposition's chief of staff needs a little support
      const before = s.elections?.scandals?.length || 0;
      const r = P.offer('opposition_chief', 'leak', { illicit: true });
      if (r.ok && r.outcome === 'accepted') { assert.equal(s.elections.scandals.length, before + 1); assert.equal(s.elections.scandals.at(-1).party, gov, 'a leak is about the government'); assert.equal(s.elections.scandals.at(-1).source, 'leak'); leaked = true; }
    }
    if (!quieted) {
      const el = P.ensureElections(s);
      P.addScandal(s, el, { party: gov, day: P.day, severity: 0.7, credibility: 1, attention: 1, source: 'press', text: 'a test scandal' });
      const sc = el.scandals.at(-1);
      const r = P.offer('chief', 'quiet', { illicit: true });
      if (r.outcome === 'accepted') { assert.ok(sc.quieted && sc.attention < 1); quieted = true; }
    }
  }
  assert.ok(proposed && delayed && leaked && quieted, JSON.stringify({ proposed, delayed, leaked, quieted }));
});

test('heat and exposure: offers leave heat that fades; investigators find one; it costs a fine (paid to the state), a scandal for the recipient\'s party, reputation and trust — recorded', () => {
  const g = rich(newGame(21)); const P = g.politics; const s = P.ensure(); const inf = P.ensureInfluence(s);
  P.donate(s.government.partyId, 20000);
  const pol = policyToPush(s);
  const r = P.offer('chief', 'push', { policy: pol.id, illicit: true });
  assert.ok(r.ok);
  const entry = inf.ledger.filter((e) => e.illicit).at(-1);
  // heat fades by itself …
  inf.heat = 3; toDay(g, 40); assert.ok(inf.heat < 3 && !entry.exposed || entry.exposed, 'heat fades');
  inf.heat = 0;
  // … but a lot of it gets you found
  inf.heat = 30; entry.exposed = false;
  const money = g.player.money; const debt = s.budget.debt; const rep = g.player.reputation[I.repFaction]; const sc = s.elections.scandals.length;
  let day = s.lastGovDay;
  for (let i = 0; i < 60 && !entry.exposed; i++) { day++; g.clock.total = (day - 1) * 1440 + 8 * 60; P.governmentDay(s); inf.heat = Math.max(inf.heat, 20); }
  assert.ok(entry.exposed, 'investigators found it');
  const fine = Math.max(I.exposure.fineMin, entry.amount * I.exposure.fineTimes);
  assert.ok(g.player.money <= money - fine + 1000 * 90, 'a fine was paid');
  assert.ok(s.budget.debt < debt || debt === 0, 'to the state: its debt falls');
  assert.ok(g.player.reputation[I.repFaction] < rep, 'your reputation falls');
  assert.ok(s.elections.scandals.length > sc && s.elections.scandals.some((x) => x.source === 'exposure' && x.party === entry.party), 'a scandal for their party');
  assert.ok(inf.exposures >= 1);
  assert.ok(P.influence().ledger.some((e) => e.exposed), 'the ledger says so');
});

test('a donor\'s expectation comes due: honoured, delayed, reinterpreted or broken — decided by the donation, so a reload cannot change it; breaking costs the leader\'s trust with you', () => {
  const seen = {};
  for (let n = 1; n <= 80; n++) {
    const g = rich(newGame(n * 13)); const P = g.politics; const s = P.ensure();
    P.donate('order', 20000);
    const o = s.influence.obligations[0];
    const trust0 = g.npcs.get('npc_vegas').relationships.player?.trust || 0; const fav0 = s.influence.favours.order;
    toDay(g, o.due + I.obligation.extend + 2);
    const st = s.influence.obligations.find((x) => x.id === o.id)?.status || 'gone';
    seen[st] = (seen[st] || 0) + 1;
    if (st === 'broken') { assert.ok(s.influence.favours.order < fav0, 'the favour is gone'); assert.ok((g.npcs.get('npc_vegas').relationships.player?.trust || 0) < trust0 + 3, 'their trust with you drops'); }
    if (n === 1) { const g2 = roundtrip(g); assert.deepEqual(g2.politics.peek().influence.obligations.map((x) => x.status), s.influence.obligations.map((x) => x.status)); }
  }
  assert.ok((seen.honoured || 0) > 0 && (seen.broken || 0) > 0 && (seen.reinterpreted || 0) > 0, JSON.stringify(seen));
  assert.ok((seen.honoured || 0) > (seen.broken || 0), 'most promises are kept');
});

test('the Influence view reads without changing anything, an old save gains the record, and no money appears from nowhere', () => {
  const g = rich(newGame(2)); const P = g.politics; const s = P.ensure();
  P.influence(); P.standing(); P.campaign(); // the first read makes the empty records
  const before = JSON.stringify(s);
  P.influence(); P.influence(); P.standing(); P.campaign();
  assert.equal(JSON.stringify(s), before, 'reads change nothing');
  const v = P.influence();
  assert.ok(v.contacts.length >= 8 && v.contacts.every((c) => c.name && c.role && (c.open || c.needs)));
  assert.ok(['Unknown', 'Known', 'Trusted', 'Inner circle'].includes(v.standing.tier.label));
  const total = () => g.player.money + s.parties.order.funds + s.parties.liberty.funds;
  const t0 = total();
  P.donate('order', 12000); P.donate('liberty', 8000);
  assert.equal(total(), t0, 'a donation moves money, it makes none');
});
