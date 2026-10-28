// Satellite services (v0.59.0): what a network sells, what a customer's satellite pays in support,
// how satellites age and are lost, the sky's events, and the orbits they fly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { marketAt, coverage, capabilityAt, networkOf, sell, hazardOf, lostToday, forecast, orbitOf, eci, subpoint, look, roleOf, daysLeft } from '../src/aero/orbit.js';
import { lose, fleetOf, satelliteDay, orderSatellite } from '../src/aero/fleet.js';

const S = CONTENT.aerospace.services;
const P = CONTENT.aerospace.products;
const DAY = 1440;
const sat = (o = {}) => ({ id: 'S1', role: 'comms', status: 'operational', service: { comms: 40 }, commissioned: 0, lifeDays: 60, endsAt: 60 * DAY, capability: 1, own: true, manufacturer: 'meridian', owner: 'meridian', ...o });
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };

test('every satellite sells into a market that exists, and the data hangs together', () => {
  for (const [id, p] of Object.entries(P)) {
    if (p.line !== 'satellite') continue;
    const r = roleOf(p);
    assert.ok(S.roles[r], `${id}: role ${r}`);
    assert.ok(p.service[r] > 0);
  }
  for (const [r, R] of Object.entries(S.roles)) {
    assert.ok(R.price > 0 && R.full >= 1 && R.demand > 0 && R.orbit.period > 0, r);
    assert.ok(R.colour && R.icon && R.unit && R.text);
  }
  assert.ok(S.support.rate > 0 && S.support.rate < 0.02);
});

test('markets are a function of the day: they grow, and they breathe', () => {
  for (const r of Object.keys(S.roles)) {
    assert.deepEqual(marketAt(S, r, 40), marketAt(S, r, 40));
    assert.ok(marketAt(S, r, 400).demand >= marketAt(S, r, 1).demand * 0.7);
  }
  const c = (d) => marketAt(S, 'comms', d).demand;
  assert.ok(new Set([5, 10, 15, 20, 25, 30].map(c)).size > 4, 'demand moves with the days');
});

test('coverage: nothing without a satellite, rising with each, whole at a full network', () => {
  for (const [r, R] of Object.entries(S.roles)) {
    assert.equal(coverage(S, r, 0), 0);
    let prev = 0;
    for (let n = 1; n <= R.full + 2; n++) { const c = coverage(S, r, n); assert.ok(c >= prev && c <= 1, `${r} ${n}`); prev = c; }
    assert.equal(coverage(S, r, R.full), 1);
  }
  assert.ok(coverage(S, 'nav', 2) < 0.4, 'a navigation network of two has gaps nobody pays for');
});

test('a network sells its share of the market and never more than it carries', () => {
  const day = 40;
  const m = marketAt(S, 'comms', day);
  const many = Array.from({ length: 12 }, (_, i) => sat({ id: `S${i}` }));
  for (const n of [1, 2, 4, 8, 12]) {
    const net = networkOf(S, many.slice(0, n), 'comms', 0, day);
    const r = sell(S, 'comms', net, m);
    assert.ok(r.sold <= net.capacity + 1e-9, 'never more than it carries');
    assert.ok(r.sold <= m.demand + 1e-9, 'never more than anybody wants');
    assert.equal(r.revenue, Math.round(r.sold * S.roles.comms.price));
  }
  const small = sell(S, 'comms', networkOf(S, many.slice(0, 2), 'comms', 0, day), m);
  assert.equal(small.utilisation, 1, 'a small network is sold out');
  const huge = sell(S, 'comms', networkOf(S, many, 'comms', 0, day, { bonus: 8 }), m);
  assert.ok(huge.utilisation < 0.9, 'a network bigger than the market is not');
  assert.equal(sell(S, 'comms', networkOf(S, [], 'comms', 0, day), m).revenue, 0);
  // a price swing is a straight multiple
  const base = sell(S, 'comms', networkOf(S, many.slice(0, 3), 'comms', 0, day), m);
  assert.equal(sell(S, 'comms', networkOf(S, many.slice(0, 3), 'comms', 0, day), m, { mult: 0.5 }).revenue, Math.round(base.sold * S.roles.comms.price * 0.5));
});

test('satellites age to three quarters of their strength, storms take a share for a few days, and the dead carry nothing', () => {
  const s = sat();
  assert.equal(capabilityAt(S, s, 0, 1), 1);
  const end = capabilityAt(S, s, 60 * DAY, 61);
  assert.ok(Math.abs(end - (1 - S.degrade)) < 1e-9);
  assert.ok(capabilityAt(S, s, 30 * DAY, 31) > end);
  const hit = sat({ hit: { untilDay: 12, amount: 0.15 } });
  assert.ok(Math.abs(capabilityAt(S, hit, 0, 10) - 0.85) < 1e-9);
  assert.equal(capabilityAt(S, hit, 0, 13), 1, 'a storm passes');
  assert.equal(capabilityAt(S, sat({ status: 'failed' }), 0, 1), 0);
  assert.equal(capabilityAt(S, sat({ capability: 0.5 }), 0, 1), 0.5, 'a partial commissioning stays partial');
});

test('losses: a hash of the satellite and the day, halved by hardening and by a servicing platform, worse in old age', () => {
  const s = sat();
  const base = hazardOf(S, s, { now: 10 * DAY });
  assert.ok(base > 0 && base < 0.01);
  assert.ok(Math.abs(hazardOf(S, sat({ hardened: true }), { now: 10 * DAY }) - base * S.hazard.hardened) < 1e-12);
  assert.ok(Math.abs(hazardOf(S, s, { now: 10 * DAY, platform: true }) - base * S.hazard.platform) < 1e-12);
  assert.ok(hazardOf(S, s, { now: 55 * DAY }) > base);
  assert.ok(hazardOf(S, s, { now: 10 * DAY, research: -0.35 }) < base);
  let lost = 0;
  for (let d = 1; d <= 20000; d++) if (lostToday(s, d, 0.01)) lost++;
  assert.ok(lost > 120 && lost < 280, `${lost} of 20000 days at 1%`);
  assert.equal(lostToday(s, 77, 0.5), lostToday(s, 77, 0.5));
});

test('the orbits: geostationary stays put, a low orbit comes round, the ground station sees what is above it', () => {
  const geo = orbitOf(S, sat({ id: 'G', role: 'comms' }));
  const a = subpoint(geo, 0);
  const b = subpoint(geo, 700);
  assert.ok(Math.abs(a.lon - b.lon) < 0.6 && Math.abs(a.lat) < 0.01, 'a geostationary satellite does not move over the ground');
  const leo = orbitOf(S, sat({ id: 'L', role: 'earthobs' }));
  assert.ok(leo.period < 105 && leo.inc > 90);
  const p0 = eci(leo, 0);
  const p1 = eci(leo, leo.period);
  assert.ok(Math.hypot(p0.x - p1.x, p0.y - p1.y, p0.z - p1.z) < 1e-6, 'after a period it is back');
  for (let t = 0; t < 400; t += 7) { const sp = subpoint(leo, t); assert.ok(Math.abs(sp.lat) <= leo.inc + 1e-6 || Math.abs(sp.lat) <= 180 - leo.inc + 1e-6); }
  const st = { lat: 41, lon: 18 };
  let up = 0;
  for (let t = 0; t < 1440; t += 3) { const l = look(leo, t, st); assert.ok(l.el >= -90 && l.el <= 90 && l.az >= 0 && l.az < 360); if (l.el > 10) up++; }
  assert.ok(up > 5 && up < 250, `a low orbit is overhead now and then (${up} samples of 480)`);
  assert.equal(orbitOf(S, sat({ id: 'L', role: 'earthobs' })).raan, leo.raan, 'the same satellite has the same orbit');
});

test('the forecast: the first satellite of a role earns little, the one that completes the network a lot, and a glut nothing', () => {
  const p = P.st_relay;
  const fleet = (k) => Array.from({ length: k }, (_, i) => sat({ id: `F${i}` }));
  const f0 = forecast(S, p, fleet(0), 0, 40, { cost: 660000 });
  const f3 = forecast(S, p, fleet(3), 0, 40, { cost: 660000 });
  const f9 = forecast(S, p, fleet(9), 0, 40, { cost: 660000 });
  assert.ok(f0.perDay > 0 && f3.perDay > f0.perDay, 'completing the network is worth more than the first');
  assert.ok(f9.perDay < f3.perDay / 2, 'a ninth adds little');
  assert.ok(f3.ratio > 1, 'a full network earns back what it costs');
  assert.ok(f0.paybackDays === null || f0.paybackDays > 0);
  // every product, alone, loses nothing close to its price
  for (const [id, pr] of Object.entries(P)) { if (pr.line !== 'satellite') continue; const f = forecast(S, pr, [], 0, 40, { cost: pr.price * 3 }); assert.ok(Number.isFinite(f.perDay) && Number.isFinite(f.lifetime), id); }
});

// ------------------------------------------------------------------ the simulation
test('a satellite you built for a customer pays you to keep it working, until it is gone', () => {
  const g = newGame(71);
  const A = g.aero;
  const co = A.meridian;
  // the seeded satellites are not up yet: put one up for a customer
  const s = A.state.satellites;
  const id = 'SATX';
  s[id] = sat({ id, name: 'Test-01', product: 'st_relay', owner: 'cu_brightwave', manufacturer: 'meridian', own: false, price: 280000, opex: 600, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, lifeDays: 60 });
  const before = A.statement(co, null).acc.rev_services || 0;
  run(g, 3);
  const fee = Math.round(280000 * S.support.rate);
  assert.ok(s[id].supportTotal >= fee * 2, `fees paid (${s[id].supportTotal})`);
  assert.ok((A.statement(co, null).acc.rev_services || 0) - before >= fee * 2);
  assert.ok((A.statement(co, null).acc.sat_ops || 0) > 0, 'and running it costs something');
  lose(A, co, s[id], 'lost to a fault');
  const at = s[id].supportTotal;
  run(g, 3);
  assert.equal(s[id].supportTotal, at, 'a dead satellite pays nothing');
});

test('a satellite lost inside its warranty costs the builder its name', () => {
  const g = newGame(72);
  const A = g.aero;
  const co = A.meridian;
  const s = sat({ id: 'W1', owner: 'cu_brightwave', own: false, commissioned: g.clock.total - 2 * DAY, endsAt: g.clock.total + 58 * DAY, price: 280000 });
  A.state.satellites.W1 = s;
  const rep = co.reputation;
  lose(A, co, s, 'lost to a fault');
  assert.equal(Math.round((rep - co.reputation) * 10) / 10, -S.support.warrantyRep);
  const late = sat({ id: 'W2', owner: 'cu_brightwave', own: false, commissioned: g.clock.total - 50 * DAY, endsAt: g.clock.total + 10 * DAY, price: 280000 });
  A.state.satellites.W2 = late;
  const rep2 = co.reputation;
  lose(A, co, late, 'lost to a fault');
  assert.equal(co.reputation, rep2, 'old age is nobody\'s fault');
});

test('a customer asks for a replacement when its satellite is nearly spent — once', () => {
  const g = newGame(73);
  const A = g.aero;
  const co = A.meridian;
  g.clock.total = 20 * DAY + 6 * 60;
  A.minuteTick();
  A.state.satellites.R1 = sat({ id: 'R1', name: 'Old-01', product: 'st_relay', owner: 'cu_brightwave', own: false, manufacturer: 'meridian', price: 280000, commissioned: g.clock.total - 50 * DAY, endsAt: g.clock.total + (S.support.replaceDays - 1) * DAY });
  const n0 = A.state.tenders.filter((t) => t.event === 'replacement').length;
  satelliteDay(A);
  const tenders = A.state.tenders.filter((t) => t.event === 'replacement');
  assert.equal(tenders.length, n0 + 1, 'a tender for its replacement');
  assert.equal(tenders[tenders.length - 1].product, 'st_relay');
  satelliteDay(A);
  assert.equal(A.state.tenders.filter((t) => t.event === 'replacement').length, n0 + 1, 'and only the one');
});

test('your own satellite is built, launched and commissioned like a customer\'s — then it earns, and its cost is an asset that wears away', () => {
  const g = newGame(74);
  const A = g.aero;
  const co = A.meridian;
  const r = A.orderSatellite(co, 'st_relay', 2);
  assert.ok(r.ok, r.text);
  assert.equal(A.fleetOf(co).orders.length, 2);
  let sats = [];
  for (let d = 0; d < 220 && sats.length < 2; d++) { run(g, 1); sats = A.fleetOf(co).own; }
  assert.equal(sats.length, 2, 'both reached orbit');
  const s = sats[0];
  assert.ok(s.own && s.owner === co.id && s.value > 50000 && s.book <= s.value, 'a fleet asset');
  assert.ok(co.books.fleet > 0);
  const rev0 = A.statement(co, null).acc.rev_services || 0;
  const dep0 = A.statement(co, null).acc.depreciation || 0;
  const fleet0 = co.books.fleet;
  run(g, 10);
  assert.ok((A.statement(co, null).acc.rev_services || 0) > rev0, 'the network sells');
  assert.ok((A.statement(co, null).acc.depreciation || 0) > dep0, 'and the asset wears');
  assert.ok(co.books.fleet < fleet0);
  const rep = A.networkReport(co).find((x) => x.role === 'comms');
  assert.equal(rep.net.n, 2);
  assert.ok(rep.sold.revenue > 0 && rep.net.coverage < 1);
  assert.equal(A.fleetOf(co).orders.length, 0, 'the orders are filled');
});

test('ordering has to be possible: no such product, not a satellite, no research, too many at once', () => {
  const g = newGame(75);
  const A = g.aero;
  const co = A.meridian;
  assert.equal(A.orderSatellite(co, 'nope').ok, false);
  assert.equal(A.orderSatellite(co, 'ap_skylark').ok, false);
  const noTech = { ...co, research: [], bays: co.bays, pad: co.pad };
  assert.equal(orderSatellite(A, noTech, 'st_beacon', 1).ok, false, 'needs research');
  assert.equal(A.orderSatellite(co, 'st_relay', 6).ok, true);
  assert.equal(A.orderSatellite(co, 'st_relay', 6).ok, false, 'more than eight open at once');
  const cancelled = A.fleetOf(co).orders[0];
  assert.ok(A.cancelOwnOrder(co, cancelled.id).ok);
  assert.ok(A.state.units[cancelled.id].finished);
});

test('insurance pays most of the book value of a loss, for a small daily premium', () => {
  const g = newGame(76);
  const A = g.aero;
  const co = A.meridian;
  const mk = (id) => { const s = sat({ id, own: true, manufacturer: co.id, owner: co.id, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, value: 1000000, book: 1000000 }); A.state.satellites[id] = s; return s; };
  co.books.fleet = 2000000;
  const a = mk('IA');
  const b = mk('IB');
  co.insured = true;
  const claims0 = A.statement(co, null).acc.rev_claims || 0;
  lose(A, co, a, 'lost to a fault');
  assert.equal((A.statement(co, null).acc.rev_claims || 0) - claims0, Math.round(1000000 * S.insurance.payout));
  co.insured = false;
  const cl = A.statement(co, null).acc.rev_claims || 0;
  lose(A, co, b, 'lost to a fault');
  assert.equal(A.statement(co, null).acc.rev_claims || 0, cl, 'uninsured pays nothing');
  assert.equal(co.books.fleet, 0);
  assert.ok(A.setFleetPolicy(co, 'insured', true).ok);
  assert.equal(A.setFleetPolicy(co, 'nonsense', true).ok, false);
});

test('a solar storm takes a share of every unshielded satellite for a while, and spares the hardened', () => {
  const g = newGame(77);
  const A = g.aero;
  A.state.orbit = { mult: {}, cool: {} };
  const e = S.events.storm;
  const keep = { chance: e.chance, kill: e.kill };
  e.chance = 1; e.kill = 0;
  try {
    const plain = sat({ id: 'P1', manufacturer: 'meridian', own: false, owner: 'cu_brightwave', commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, price: 1 });
    const tough = sat({ id: 'P2', manufacturer: 'meridian', own: false, owner: 'cu_brightwave', hardened: true, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, price: 1 });
    A.state.satellites.P1 = plain; A.state.satellites.P2 = tough;
    satelliteDay(A);
    assert.ok(plain.hit && plain.hit.amount === e.hit);
    assert.equal(tough.hit, undefined);
    assert.ok(A.state.news.some((n) => /solar storm/.test(n.text)));
    assert.ok(capabilityAt(S, plain, g.clock.total, A.day) < capabilityAt(S, tough, g.clock.total, A.day));
  } finally { e.chance = keep.chance; e.kill = keep.kill; }
});

test('a price swing from the sky moves what a network earns, and ends', () => {
  const g = newGame(78);
  const A = g.aero;
  A.state.orbit = { mult: { comms: { m: 0.5, untilDay: A.day + 2 } }, cool: {} };
  const co = A.meridian;
  A.state.satellites.M1 = sat({ id: 'M1', own: true, manufacturer: co.id, owner: co.id, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, value: 100000, book: 100000 });
  const half = A.networkReport(co).find((x) => x.role === 'comms').sold.revenue;
  A.state.orbit.mult = {};
  const full = A.networkReport(co).find((x) => x.role === 'comms').sold.revenue;
  assert.ok(Math.abs(half * 2 - full) <= 2);
});

test('debris: the player decides; a burn is safe and costs life, leaving it is a hash, and an undecided one is left', () => {
  const g = newGame(79);
  const A = g.aero;
  const co = A.meridian;
  const mk = (id) => { const s = sat({ id, own: true, manufacturer: co.id, owner: co.id, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, value: 1000, book: 1000 }); A.state.satellites[id] = s; return s; };
  const a = mk('D1');
  const ev = (sat) => ({ id: `EV-${sat.id}`, kind: 'debris', sat: sat.id, resolved: null, expires: A.day + 3 });
  (co.events ||= []).push(ev(a));
  const e = co.events.at(-1);
  const end0 = a.endsAt;
  assert.ok(A.resolveEvent(co, e.id, 'manoeuvre').ok);
  assert.equal(a.endsAt, end0 - S.events.debris.lifeDays * DAY);
  assert.equal(a.status, 'operational');
  assert.equal(A.resolveEvent(co, e.id, 'risk').ok, false, 'decided once');
  // left alone: the same hash every time
  const b = mk('D2');
  const e2 = ev(b);
  co.events.push(e2);
  const outcomes = new Set();
  for (let i = 0; i < 40; i++) { const x = { ...e2, id: `EVX${i}` }; const s = mk(`DD${i}`); x.sat = s.id; co.events.push(x); A.resolveEvent(co, x.id, 'risk'); outcomes.add(s.status); }
  assert.ok(outcomes.has('operational'), 'usually it misses');
});

test('the fleet survives a save: satellites, the sky\'s state, the policies', () => {
  const g = newGame(80);
  const A = g.aero;
  const co = A.meridian;
  co.insured = true; co.autoReplace = true;
  A.state.satellites.V1 = sat({ id: 'V1', own: true, manufacturer: co.id, owner: co.id, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, value: 1000, book: 900 });
  run(g, 3);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const co2 = g2.aero.meridian;
  assert.ok(co2.insured && co2.autoReplace);
  assert.deepEqual(g2.aero.state.satellites.V1, A.state.satellites.V1);
  assert.deepEqual(g2.aero.state.orbit, A.state.orbit);
});

test('auto-replace puts a successor on the floor when your own satellite is nearly spent — once', () => {
  const g = newGame(81);
  const A = g.aero;
  const co = A.meridian;
  co.autoReplace = true;
  g.clock.total = 20 * DAY + 6 * 60;
  A.state.satellites.AR = sat({ id: 'AR', product: 'st_relay', own: true, manufacturer: co.id, owner: co.id, commissioned: g.clock.total - 50 * DAY, endsAt: g.clock.total + 5 * DAY, value: 1000, book: 1000, config: {} });
  const n0 = A.fleetOf(co).orders.length;
  satelliteDay(A);
  assert.equal(A.fleetOf(co).orders.length, n0 + 1);
  satelliteDay(A);
  assert.equal(A.fleetOf(co).orders.length, n0 + 1, 'once');
});
