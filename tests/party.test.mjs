// Your own party (v0.97.0): a foundation, not a destination. A record with a name, a platform, staff and funds, kept entirely out of the election and opinion models so it
// cannot change any result. Its funds are only what you put in; the registration fee goes to the state; one party per player; the name is checked like a company's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { PARTY as P } from '../src/content/party.js';
import { INFLUENCE as I } from '../src/content/influence.js';
import { needsOf, considerShare, staffName } from '../src/politics/party.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const rich = (g) => { g.player.money = 5_000_000; return g; };
const office = (g, tier = 'mid') => { g.world.hq = { owned: { [tier]: { day: 1 } }, style: {} }; };

test('the rules: five founding needs, each with its own test; the voters who would consider a platform depend on the platform and are bounded', () => {
  const none = needsOf({ office: null, rep: 0, platform: {}, staff: 0, paidFee: false });
  assert.equal(none.met, 0); assert.equal(none.total, 5); assert.ok(!none.ready);
  const all = needsOf({ office: 'tower', rep: 10, platform: { police_funding: 2, regulation: -1, public_spending: 1 }, staff: 3, paidFee: true });
  assert.ok(all.ready && all.met === 5);
  for (const miss of [{ office: null }, { rep: 9 }, { platform: { regulation: 1, police_funding: 1 } }, { staff: 2 }, { paidFee: false }]) assert.ok(!needsOf({ office: 'mid', rep: 10, platform: { police_funding: 2, regulation: -1, public_spending: 1 }, staff: 3, paidFee: true, ...miss }).ready, JSON.stringify(miss));
  const a = considerShare({ civil_liberties: 0, enforcement: -2, surveillance: -2, public_spending: 2 });
  const b = considerShare({ enforcement: 2, police_funding: 2, regulation: -2, public_spending: -2 });
  assert.ok(a > 0 && b > 0 && a <= P.consider.max && b <= P.consider.max && a !== b);
  assert.equal(considerShare({}), 0);
  assert.equal(staffName(1, 'x'), staffName(1, 'x'));
});

test('founding: the name is checked like a company\'s (length, characters, and not any company or party), one party per player, and a draft is not registered', () => {
  const g = newGame(1); const M = g.politics;
  assert.ok(!M.foundParty('', '#fff').ok); assert.ok(!M.foundParty('ab', '#fff').ok); assert.ok(!M.foundParty('x'.repeat(41), '#fff').ok); assert.ok(!M.foundParty('@@@ Party', '#fff').ok);
  assert.ok(!M.foundParty('The Liberty League', '#fff').ok, 'not a party that exists');
  assert.ok(!M.foundParty('order party', '#fff').ok, 'in any case');
  const company = g.corp.takenNames()[0];
  assert.ok(!M.foundParty(company, '#fff').ok, `not a company's name (${company})`);
  const r = M.foundParty('  The   Harbour Party ', P.colours[2]);
  assert.ok(r.ok, r.text);
  assert.equal(M.myParty().name, 'The Harbour Party'); assert.equal(M.myParty().colour, P.colours[2]); assert.equal(M.myParty().registered, false);
  assert.ok(!M.foundParty('Another Party', '#fff').ok && /One party/.test(M.foundParty('Another Party', '#fff').text), 'one each');
  assert.equal(g.corp.takenNames().includes('The Harbour Party'), false, 'the party is not a company');
});

test('funds and staff: its only income is yours; hiring costs a fee, wages come out of its funds every day, and staff leave when it cannot pay', () => {
  const g = rich(newGame(2)); const M = g.politics; const s = M.ensure();
  M.foundParty('The Harbour Party', '#fff');
  assert.ok(!M.hireStaff('organiser').ok, 'no funds to take anyone on');
  const m0 = g.player.money;
  assert.ok(!M.fundParty(10).ok); assert.ok(M.fundParty(20000).ok);
  assert.equal(g.player.money, m0 - 20000); assert.equal(M.myParty().funds, 20000);
  assert.ok(M.hireStaff('organiser').ok); assert.ok(M.hireStaff('polling').ok); assert.ok(M.hireStaff('legal').ok);
  assert.ok(!M.hireStaff('legal').ok, 'a role once');
  assert.equal(M.myParty().funds, 20000 - 3 * P.staff.hire);
  const f0 = M.myParty().funds;
  toDay(g, 5);
  assert.ok(Math.abs(f0 - M.myParty().funds - 5 * 3 * P.staff.wage) <= 3 * P.staff.wage, 'wages come out of the funds');
  // no money from nowhere: its funds never grow by themselves
  const before = M.myParty().funds; toDay(g, 20); assert.ok(M.myParty().funds <= before);
  // it runs dry and the staff go
  M.myParty().funds = 100; toDay(g, 30);
  assert.equal(M.myParty().staff.length, 0, 'staff leave when it cannot pay'); assert.equal(M.myParty().funds >= 0, true);
  assert.ok(M.myParty().log.some((e) => /could not pay/.test(e.text)));
});

test('registration: all five needs; the fee is yours and goes to the state (its debt falls by it); the office is the company\'s Corporate Centre or Tower; reputation is the Civic Office\'s', () => {
  const g = rich(newGame(3)); const M = g.politics; const s = M.ensure();
  M.foundParty('The Harbour Party', '#fff');
  assert.ok(!M.register().ok);
  assert.equal(M.partyNeeds().met, 0);
  M.fundParty(60000);
  for (const r of ['campaign_manager', 'polling', 'fundraising']) M.hireStaff(r);
  assert.ok(M.setPlatform('police_funding', 2).ok && M.setPlatform('regulation', -1).ok && M.setPlatform('public_spending', 1).ok);
  assert.ok(M.setPlatform('farm_inspection', -1).ok, 'a fourth');
  assert.ok(!M.setPlatform('enforcement', 1).ok && /at most/.test(M.setPlatform('enforcement', 1).text), 'at most four priorities');
  assert.ok(!M.setPlatform('nonsense', 1).ok);
  assert.ok(M.setPlatform('farm_inspection', 0).ok);
  assert.equal(M.partyNeeds().list.find((x) => x.id === 'platform').met, true); assert.equal(M.partyNeeds().list.find((x) => x.id === 'staff').met, true);
  assert.ok(!M.register().ok && /unmet/.test(M.register().text));
  // the fee, to the state
  const debt0 = s.budget.debt; const m0 = g.player.money;
  assert.ok(M.payFee().ok);
  assert.equal(g.player.money, m0 - P.needs.fee); assert.ok(Math.abs((debt0 - s.budget.debt) - P.needs.fee / 1000) < 1e-9); assert.equal(s.levies.by['party registration'], P.needs.fee);
  assert.ok(!M.payFee().ok, 'once');
  assert.ok(!M.register().ok, 'no office, no reputation');
  office(g, 'mid'); assert.equal(M.officeTier(), 'mid');
  assert.ok(!M.register().ok, 'no reputation');
  g.player.reputation[I.repFaction] = P.needs.reputation;
  assert.ok(M.partyNeeds().ready);
  const r = M.register(); assert.ok(r.ok, r.text);
  assert.equal(M.myParty().registered, true); assert.ok(!M.register().ok);
  assert.ok(/cannot stand/.test(r.text), 'it says candidacy is later');
  office(g, 'tower'); assert.equal(M.officeTier(), 'tower');
});

test('it takes no part in any election: the same world with and without a registered party has exactly the same elections, polls and seats', () => {
  const run = (withParty) => {
    const g = rich(newGame(41)); const M = g.politics;
    if (withParty) {
      M.foundParty('The Harbour Party', '#fff'); M.fundParty(200000); for (const r of ['campaign_manager', 'polling', 'fundraising', 'legal']) M.hireStaff(r);
      M.setPlatform('police_funding', 2); M.setPlatform('regulation', -2); M.setPlatform('public_spending', 2); office(g, 'tower'); g.player.reputation[I.repFaction] = 50; M.payFee(); assert.ok(M.register().ok);
    }
    const s = toDay(g, 260);
    return { h: JSON.stringify(s.elections.history), seats: JSON.stringify(s.constitution.assemblySeats), gov: JSON.stringify(s.government), polls: s.polls.map((p) => [p.day, p.results.order, p.results.liberty]) };
  };
  const without = run(false); const withp = run(true);
  assert.equal(withp.h, without.h, 'the same elections, to the last figure');
  assert.equal(withp.seats, without.seats); assert.equal(withp.gov, without.gov);
  // the one coupling is the registration fee, which is the state's revenue: its debt is a little lower, which the polls' deficit term feels at the fourth decimal
  assert.equal(withp.polls.length, without.polls.length);
  for (let i = 0; i < withp.polls.length; i++) { assert.equal(withp.polls[i][0], without.polls[i][0]); assert.ok(Math.abs(withp.polls[i][1] - without.polls[i][1]) < 0.002 && Math.abs(withp.polls[i][2] - without.polls[i][2]) < 0.002); }
});

test('winding it up gives the funds back and frees the name; a save keeps the party; an old save simply has none; reading changes nothing', () => {
  const g = rich(newGame(5)); const M = g.politics;
  assert.equal(M.partyView().has, false); assert.ok(!M.fundParty(5000).ok && !M.payFee().ok && !M.hireStaff('legal').ok && !M.disbandParty().ok, 'nothing works without a party');
  M.foundParty('The Harbour Party', P.colours[1]); M.fundParty(30000); M.setPlatform('enforcement', -2);
  const g2 = roundtrip(g);
  assert.equal(g2.politics.myParty().name, 'The Harbour Party'); assert.equal(g2.politics.myParty().funds, 30000); assert.equal(g2.politics.myParty().platform.enforcement, -2);
  const before = JSON.stringify(g2.politics.peek()); g2.politics.partyView(); g2.politics.partyView(); assert.equal(JSON.stringify(g2.politics.peek()), before);
  const m = g.player.money;
  const r = M.disbandParty(); assert.ok(r.ok);
  assert.equal(g.player.money, m + 30000); assert.equal(M.myParty(), null);
  assert.ok(M.foundParty('The Harbour Party', '#fff').ok, 'the name is free again');
  const v = M.partyView();
  assert.equal(v.issues.length, 8); assert.equal(v.staff.length, 5); assert.ok(v.candidacy && v.needs.total === 5);
});
