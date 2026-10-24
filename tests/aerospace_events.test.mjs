// Reputation and events (v0.57.0): every change to reputation is logged with its reason and repeated
// failures cost more; major orders, constellations, research breakthroughs, expansion offers and
// audits come from conditions in the company's own books and floor — never from the dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { eventsMorning, rollBreakthrough } from '../src/aero/events.js';
import { quantityError } from '../src/aero/catalog.js';

const C = CONTENT.aerospace;
const E = C.events;
const DAY = 1440;
const own = (seed = 71, { stock = false } = {}) => {
  const g = newGame(seed);
  g.player.money = 30_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero;
  const co = A.roost;
  for (const c of A.contractsOf(co, 'active')) A.cancelContract('roost', c.id);
  co.repLog.length = 0;
  co.reputation = 60;
  if (stock) for (const m of Object.keys(C.materials)) { const r = A.stock(co, m); r.qty += 200; r.value += 200 * C.materials[m].price; co.books.inventoryValue += 200 * C.materials[m].price; }
  return { g, A, co };
};
const run = (g, days) => { for (let i = 0; i < Math.round(days * DAY); i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const sum = (log) => Math.round(log.reduce((a, e) => a + e.delta, 0) * 10) / 10;

test('every change to reputation is logged with its reason, and the log adds up to the number', () => {
  const { A, co } = own();
  const r0 = co.reputation;
  A.repChange(co, 3, 'something good');
  A.repChange(co, -5, 'something bad');
  assert.equal(co.repLog[0].why, 'something bad');
  assert.equal(co.repLog[1].why, 'something good');
  assert.equal(co.reputation, r0 - 2);
  assert.equal(sum(co.repLog), -2, 'what the log shows is what happened');
  assert.equal(co.repLog[0].total, r0 - 2);
  co.reputation = 99;
  A.repChange(co, 5, 'a lot');
  assert.equal(co.reputation, 100);
  assert.equal(co.repLog[0].delta, 1, 'only what actually applied is shown');
  A.repChange(co, -500, 'a disaster');
  assert.equal(co.reputation, 0);
  assert.equal(A.repChange(co, 0, 'nothing'), 0);
});

test('repeated failures cost more each time, up to a cap; success resets them', () => {
  const { A } = own();
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => A.streakMult(n)), [1, 1.5, 2, 2.5, 3]);
  assert.equal(A.streakMult(9), E.rep.cap);
});

test('late deliveries in a row cost 4, 6, 8…; a delivery on time resets the run and starts a streak that earns a bonus', () => {
  const { g, A, co } = own(72, { stock: true });
  const deliver = (days) => {
    const P = C.products.ap_skylark;
    const c = A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1, unitPrice: P.price, days, quality: P.quality, depositShare: 0.2 });
    const u = A.state.units[c.units[0]];
    for (let i = 0; i < 12 * DAY && !u.finished; i++) { g.clock.total += 1; A.minuteTick(); }
    assert.equal(u.status, 'delivered');
    return c;
  };
  deliver(0.2); deliver(0.2); deliver(0.2);
  const late = co.repLog.filter((e) => /^Late delivery/.test(e.why)).map((e) => e.delta).reverse();
  assert.deepEqual(late, [-4, -6, -8]);
  assert.match(co.repLog.find((e) => /3 late in a row/.test(e.why)).why, /3 late in a row/);
  assert.equal(co.streaks.late, 3);
  for (let i = 0; i < 3; i++) deliver(30);
  assert.equal(co.streaks.late, 0);
  assert.equal(co.streaks.onTime, 3);
  const good = co.repLog.filter((e) => /^On-time delivery/.test(e.why)).length;
  assert.equal(good, 3);
  assert.ok(co.repLog.some((e) => /3 deliveries on time in a row/.test(e.why) && e.delta === E.rep.streakBonus), 'the third in a row earns a bonus');
  assert.ok(co.repLog.some((e) => /^Flawless build/.test(e.why)), 'a build that passes first time is noticed (when it does)');
});

test('failed inspections in the same fortnight cost more each: −1, −1.5, −2', () => {
  const { A, co } = own(73);
  const c = A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1, unitPrice: 26000, days: 30, quality: 40, depositShare: 0.2 });
  const u = A.state.units[c.units[0]];
  u.rolls.inspect = [0, 0, 0, 0]; // it will fail until it's rebuilt properly
  const s = { id: 'inspection', name: 'Inspection & systems testing' };
  for (let i = 0; i < 3; i++) { u.work = 0; A.inspect(co, u, s); }
  const fails = co.repLog.filter((e) => /^Failed inspection/.test(e.why)).map((e) => e.delta).reverse();
  assert.deepEqual(fails, [-1, -1.5, -2]);
  assert.match(co.repLog[0].why, /3 in 14 days/);
  assert.equal(co.qaLog.filter((e) => !e.pass).length, 3);
});

test('a lost bid explains what the winner beat you on, by that customer\'s own weights', () => {
  const { g, A, co } = own(74);
  co.bays.push({ id: 'heavy_1', type: 'heavy', unit: null, ready: 0 });
  co.research.push('turboprops', 'jet_engines', 'pressurised_cabins');
  co.qualityBase = 90; // (a heavy bay with nobody to inspect it would drag quality down — that's the point of the inspectors)
  const t = { id: 'Tl', customer: 'cu_skyward', product: 'ap_tern', qty: 1, ceiling: 700000, days: 60, quality: 50, deposit: 0.2, posted: g.clock.day, closes: g.clock.day, status: 'open', bids: [], embargoed: false, defence: false };
  A.state.tenders.push(t);
  assert.ok(A.placeBid('roost', 'Tl', 690000, 55).ok);
  assert.ok(A.placeBid('meridian', 'Tl', 560000, 30).ok);
  A.closeTenders();
  assert.equal(t.winner, 'meridian');
  const rep = A.state.reports.find((r) => r.kind === 'tender' && /Skyward/.test(r.text));
  assert.match(rep.text, /You lost mainly on delivery time and price/, 'by this customer\'s weights: 25% on delivery, 40% on price');
  assert.ok(t.ranking[0].parts.price > t.ranking[1].parts.price);
});

test('a government order comes only to a company with the standing and the means, once in a while, and is closed to those below it', () => {
  const none = own(75);
  none.co.reputation = E.government.minReputation - 5;
  run(none.g, 40);
  assert.equal(none.A.state.tenders.filter((t) => t.event === 'government').length, 0, 'no standing, no order');
  const { g, A, co } = own(76);
  co.research = Object.keys(C.research); // every technology
  co.bays.push({ id: 'secure_1', type: 'secure', unit: null, ready: 0 }, { id: 'wide_1', type: 'wide', unit: null, ready: 0 });
  co.reputation = 70;
  const seen = [];
  for (let d = 0; d < 70; d++) {
    run(g, 1);
    co.reputation = Math.max(co.reputation, 70);
    for (const t of A.state.tenders) if (t.event === 'government' && !seen.includes(t)) seen.push(t);
  }
  assert.ok(seen.length >= 1 && seen.length <= 4, `${seen.length} major orders in 70 days (a cool-down of ${E.government.cooldown})`);
  const t = seen[0];
  A.state.tenders.push(t); t.status = 'open'; t.bids = [];
  assert.equal(t.event, 'government');
  assert.equal(t.deposit, E.government.deposit);
  assert.equal(t.minReputation, E.government.minReputation);
  assert.equal(quantityError(C.aero, C.products[t.product], t.qty), null, 'the quantity rules apply to a major order too');
  assert.ok(t.qty <= 5 || C.products[t.product].line !== 'aircraft');
  // closed to anyone below its standing
  co.reputation = 40;
  co.qualityBase = 100;
  const q = A.bidQuote('roost', t.id, t.ceiling, t.days);
  assert.equal(q.ok, false);
  assert.match(q.reason, /reputation of 50\+/);
});

test('a constellation is asked for only by a company that can build, launch and commission satellites', () => {
  const none = own(77);
  none.co.research = Object.keys(C.research);
  run(none.g, 80);
  assert.equal(none.A.state.tenders.filter((t) => t.event === 'constellation').length, 0, 'no clean room or pad: nobody asks');
  const { g, A, co } = own(78);
  co.research = Object.keys(C.research);
  co.bays.push({ id: 'clean_1', type: 'clean', unit: null, ready: 0 }, { id: 'rocket_1', type: 'rocket', unit: null, ready: 0 });
  co.pad = { unit: null, readyAt: 0, launches: 0 };
  co.reputation = 60;
  let t = null;
  for (let d = 0; d < 120 && !t; d++) { run(g, 1); co.reputation = Math.max(co.reputation, 60); t = A.state.tenders.find((x) => x.event === 'constellation'); }
  assert.ok(t, 'a constellation tender came');
  assert.equal(C.products[t.product].line, 'satellite');
  assert.ok(t.qty >= 1 && t.qty <= 12);
  assert.equal(quantityError(C.aero, C.products[t.product], t.qty), null);
  assert.equal(t.deposit, E.constellation.deposit);
});

test('research breakthroughs are rolled when the work starts, kept with it, and paid out once, for the company that earned it', () => {
  const { g, A, co } = own(79);
  co.research.push('turboprops');
  // across many days, the chance is ~10%, and a laboratory and a surplus of engineers raise it
  const rate = (setup) => { setup(); let n = 0; const t0 = g.clock.total; for (let d = 0; d < 400; d++) { g.clock.total = t0 + d * DAY; if (rollBreakthrough(A, co, 'jet_engines')) n++; } g.clock.total = t0; return n / 400; };
  const base = rate(() => {});
  assert.ok(base > 0.05 && base < 0.17, `base ${base}`);
  co.halls.lab = 0;
  const withLab = rate(() => {});
  assert.ok(withLab > base + 0.03, `with a lab ${withLab}`);
  delete co.halls.lab;
  // pick a start day where it does come, then watch it through a save
  let r = null;
  for (let d = 0; d < 60 && !r?.ok; d++) {
    A.cfg.research.jet_engines.cost = 1;
    co.researching = null;
    if (rollBreakthrough(A, co, 'jet_engines')) { r = A.startResearch(co, 'jet_engines'); assert.equal(co.researching.breakthrough, true); break; }
    g.clock.total += DAY;
  }
  assert.ok(co.researching, 'found a day it comes');
  const q0 = co.qualityBase;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(g2.aero.roost.researching.breakthrough, true, 'fixed when it started — a reload cannot change it');
  run(g2, C.research.jet_engines.days + 1.5);
  assert.equal(g2.aero.roost.qualityBase, q0 + E.breakthrough.quality);
  assert.ok(g2.aero.roost.repLog.some((e) => /^Research breakthrough/.test(e.why)));
  run(g2, 3);
  assert.equal(g2.aero.roost.qualityBase, q0 + E.breakthrough.quality, 'paid out once');
});

test('the firsts: each milestone once, with its reward, logged and remembered', () => {
  const { g, A, co } = own(80, { stock: true });
  const P = C.products.ap_skylark;
  const c = A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 2, unitPrice: P.price, days: 30, quality: P.quality, depositShare: 0.2 });
  const r0 = co.reputation;
  for (let i = 0; i < 12 * DAY && c.delivered < 2; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(c.delivered, 2);
  assert.ok(co.milestones.first_delivery && co.milestones.first_aircraft);
  assert.equal(co.repLog.filter((e) => /Milestone: first delivery/.test(e.why)).length, 1, 'once');
  assert.equal(co.milestones.first_launch, undefined, 'not yet');
  assert.ok(co.reputation > r0);
});

test('an expansion offer comes when a bay has been the bottleneck for days, discounts the hall that would relieve it, once, and lapses', () => {
  const { g, A, co } = own(81, { stock: true });
  const P = C.products.ap_skylark;
  A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 5, unitPrice: P.price, days: 60, quality: P.quality, depositShare: 0.2 });
  let offer = null;
  for (let d = 0; d < 12 && !offer; d++) { run(g, 1); offer = co.offers.find((o) => o.kind === 'hall_discount'); }
  assert.ok(offer, `an offer came (pressure ${JSON.stringify(co.pressure)})`);
  assert.equal(offer.hall, 'hangar2', 'the hall that has a light slot');
  assert.equal(offer.pct, E.expansion.discount);
  const cash = g.player.money;
  const r = A.buildHall(co, 'hangar2');
  assert.ok(r.ok, r.text);
  assert.equal(cash - g.player.money, Math.round(C.halls.hangar2.build * (1 - E.expansion.discount)), 'discounted once');
  assert.equal(co.offers.some((o) => o.id === offer.id), false, 'used up');
  assert.match(r.text, /25% off/);
  // an unused offer lapses
  co.offers.push({ id: 'OFx', kind: 'hall_discount', hall: 'lab', pct: 0.25, until: A.day + 2, reason: 'test' });
  run(g, 4);
  assert.equal(A.buildHall(co, 'lab').ok, true);
  assert.equal(g.player.money <= cash, true);
});

test('an audit follows a run of failed inspections: fund the fix, pay the fine, or ignore it and be fined harder', () => {
  const mk = (seed) => {
    const x = own(seed);
    x.co.qaLog.unshift(...[0, 1, 2].map((i) => ({ at: x.A.now - i * 1000, what: 'Roost Skylark #1', pass: false, chance: 20 })));
    run(x.g, 1.1);
    return x;
  };
  const a = mk(82);
  const ev = a.co.events.find((e) => e.kind === 'audit');
  assert.ok(ev && !ev.resolved, 'an audit was opened');
  assert.deepEqual(ev.choices.map((c) => c.id), ['programme', 'fine']);
  const x0 = a.co.experience;
  const cash = a.g.player.money;
  assert.ok(a.A.resolveEvent(a.co, ev.id, 'programme').ok);
  assert.equal(cash - a.g.player.money, ev.choices[0].cost);
  assert.equal(a.co.experience, x0 + E.audit.experience);
  assert.equal(a.A.resolveEvent(a.co, ev.id, 'fine').ok, false, 'decided once');
  run(a.g, 3);
  assert.equal(a.co.events.filter((e) => e.kind === 'audit' && !e.resolved).length, 0, 'the cool-down holds it off');
  const b = mk(83);
  const r0 = b.co.reputation;
  assert.ok(b.A.resolveEvent(b.co, b.co.events[0].id, 'fine').ok);
  assert.equal(b.co.reputation, r0 + E.audit.repFine);
  const c = mk(84);
  const r1 = c.co.reputation;
  run(c.g, E.audit.decideDays + 1.5);
  assert.equal(c.co.events[0].resolved.choice, 'ignored');
  assert.equal(c.co.reputation, r1 + E.audit.repIgnored);
  assert.ok(c.co.repLog.some((e) => /Ignored a regulator/.test(e.why)));
});

test('an event contract delivered in full and on time earns its reward; a late one does not', () => {
  const { g, A, co } = own(85, { stock: true });
  const P = C.products.ap_skylark;
  const mk = (days) => A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1, unitPrice: P.price, days, quality: P.quality, depositShare: 0.2, event: 'government' });
  const ok = mk(30);
  const u = A.state.units[ok.units[0]];
  for (let i = 0; i < 12 * DAY && !u.finished; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(ok.status, 'complete');
  assert.ok(co.repLog.some((e) => /^Government order delivered in full/.test(e.why) && e.delta === E.government.reward));
  assert.ok(co.milestones.first_government);
  const late = mk(0.2);
  const u2 = A.state.units[late.units[0]];
  const n = co.repLog.filter((e) => /^Government order/.test(e.why)).length;
  for (let i = 0; i < 12 * DAY && !u2.finished; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(co.repLog.filter((e) => /^Government order/.test(e.why)).length, n, 'no reward for a late one');
});

test('everything about standing survives a save', () => {
  const { g, A, co } = own(86);
  A.repChange(co, 2, 'remembered');
  co.streaks.onTime = 2;
  co.offers.push({ id: 'OFk', kind: 'hall_discount', hall: 'lab', pct: 0.25, until: A.day + 5, reason: 'kept' });
  co.milestones.first_delivery = { at: A.now, day: A.day, detail: 'x' };
  co.cool.audit = A.day;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const c2 = g2.aero.roost;
  assert.equal(c2.repLog[0].why, 'remembered');
  assert.equal(c2.streaks.onTime, 2);
  assert.equal(c2.offers[0].reason, 'kept');
  assert.ok(c2.milestones.first_delivery);
  assert.equal(c2.cool.audit, A.day);
  // an old save with none of it
  for (const k of ['repLog', 'streaks', 'events', 'offers', 'cool', 'milestones']) delete g.world.aero.companies.roost[k];
  assert.ok(sm.save('slot2', g).ok);
  const g3 = new Game(CONTENT);
  assert.ok(sm.load('slot2', g3).ok);
  assert.deepEqual([g3.aero.roost.repLog, g3.aero.roost.events, g3.aero.roost.offers], [[], [], []]);
  void eventsMorning;
});
