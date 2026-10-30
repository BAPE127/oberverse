// Foreign government bonds (v0.77.0): a three-year bond from each of the eight countries, rated from its own finances and quarrels, priced
// by the rating, paying coupons and the face; delayed payments and restructuring only after weeks at the top of the strain, never by chance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { SOVEREIGN as S } from '../src/content/geo.js';
import { debtTrait, strainOf, ratingOf, distressStep, recoveryOf, issueFace } from '../src/corp/sovereign.js';
import { advance } from '../src/corp/lending.js';

const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const morning = (g, d) => { day(g, d); g.corp.geo.dailyTick(); g.corp.sovereign.dailyTick(); };
function open(seed) {
  const g = newGame(seed);
  g.corp.ensureWorld(); g.market.state;
  morning(g, 2); morning(g, 40);
  return g;
}
/** Push a country to the top of the strain: a broke treasury, two wars and an embargo, all in full force. */
function wreck(g, id) {
  g.world.market.countries[id].budget = 0;
  const st = g.corp.geo.ensure();
  const ev = (kind, extra) => ({ id: `ev_x${st.nextId++}`, key: `x${st.nextId}`, kind, start: 1, registered: 1, end: null, status: 'active', severity: 1, goods: kind === 'embargo' ? ['arms'] : [], timeline: [], ...extra });
  st.events.push(ev('war', { parties: [id, 'lirre'] }), ev('war', { parties: [id, 'sund'] }), ev('embargo', { target: id, parties: [id] }));
}

test('pure: the trait is fixed and lower for a rich country; strain grows with each cause and is capped; ratings by band; distress counts days', () => {
  assert.equal(debtTrait(0.5, 10000), debtTrait(0.5, 10000));
  assert.ok(debtTrait(0.5, 48000) < debtTrait(0.5, 10000));
  for (const h of [0, 1]) for (const i of [0, 48000]) assert.ok(debtTrait(h, i) >= 0 && debtTrait(h, i) <= 0.8);
  const calm = { trait: 0.3, war: 0, embargo: 0, treasury: 1 };
  const s0 = strainOf(calm, S);
  assert.ok(strainOf({ ...calm, war: 0.5 }, S) > s0 && strainOf({ ...calm, embargo: 0.5 }, S) > s0 && strainOf({ ...calm, treasury: 0.4 }, S) > s0 && strainOf({ ...calm, trait: 0.7 }, S) > s0);
  assert.equal(strainOf({ ...calm, war: 50 }, S), strainOf({ ...calm, war: 5 }, S), 'wars are capped');
  assert.equal(strainOf({ ...calm, treasury: 5 }, S), s0, 'a full treasury is no extra strain');
  assert.deepEqual([0.1, 0.25, 0.4, 0.5, 0.6, 0.9].map((x) => ratingOf(x, S)), ['AA', 'A', 'BBB', 'BB', 'B', 'CCC']);
  let d = { days: 0 };
  for (let i = 1; i <= 45; i++) { d = distressStep(d.days, 0.9, S); if (i === 9) assert.equal(d.state, 'normal'); if (i === 10) assert.equal(d.state, 'delayed'); if (i === 39) assert.equal(d.state, 'delayed'); if (i === 40) assert.equal(d.state, 'restructure'); }
  assert.equal(distressStep(10, 0.5, S).days, 8, 'it eases by two a day when the strain does');
  assert.ok(recoveryOf(0.85, S) <= S.recovery[1] && recoveryOf(5, S) === S.recovery[0] && recoveryOf(0.85, S) > recoveryOf(1.1, S));
  assert.equal(issueFace(1000, S), 1000000); assert.equal(issueFace(48000, S), 24000000);
});

test('nothing is made before the arms market runs; then each of the eight countries has one issue, rated by its own finances and quarrels', () => {
  const g = newGame(2701); g.corp.ensureWorld(); day(g, 2);
  delete g.world.market; // as a game that has never opened the arms market
  g.corp.sovereign.dailyTick();
  assert.equal(g.corp.state.sovereign, undefined);
  assert.equal(g.world.market, undefined, 'and it did not start the market');
  const w = open(2701);
  const offers = w.corp.sovereign.offers();
  assert.equal(offers.length, 8);
  assert.equal(new Set(offers.map((o) => o.country)).size, 8);
  const by = Object.fromEntries(offers.map((o) => [o.country, o]));
  assert.ok(by.varn.rating !== 'AA' && by.teshvar.rating === 'AA', 'the oil sheikdom is the safest, a country at war is not');
  assert.ok(by.varn.coupon > by.teshvar.coupon, 'a worse rating pays a higher coupon');
  assert.ok(by.varn.price < by.teshvar.price + 1e-9, 'and a bond issued under strain is cheaper');
  const twin = open(2701);
  assert.deepEqual(twin.corp.sovereign.offers().map((o) => [o.country, o.rating, o.strain]), offers.map((o) => [o.country, o.rating, o.strain]), 'deterministic');
  assert.equal(by.varn.causes.war > 0.4 && by.lirre.causes.war === 0, true, 'the causes shown are the real ones');
});

test('buying, coupons, the cap, selling at the rating; refusals change nothing', () => {
  const g = open(2702);
  g.player.money = 5_000_000;
  const keep = JSON.stringify([g.player.money, g.corp.state.sovereign.lots]);
  assert.equal(g.corp.sovereign.buy('nowhere', 1000).ok, false);
  assert.equal(g.corp.sovereign.buy('lirre', 1050).ok, false, 'in hundreds');
  assert.equal(g.corp.sovereign.buy('lirre', 5_000_000).ok, false, 'above the cap');
  assert.equal(JSON.stringify([g.player.money, g.corp.state.sovereign.lots]), keep);
  const i = g.corp.sovereign.view(g.corp.state.sovereign.issues.lirre);
  assert.equal(i.room, Math.floor(i.face * S.maxShare));
  const r = g.corp.sovereign.buy('lirre', 100000);
  assert.ok(r.ok, r.text);
  const l = g.corp.sovereign.lots()[0];
  assert.equal(g.player.money, 5_000_000 - l.cost);
  assert.ok(Math.abs(l.cost - 100000) < 6000, 'about par for an A');
  const first = l.due;
  const wallet = g.player.money;
  morning(g, first);
  const cpn = Math.round(100000 * l.coupon / 12);
  assert.equal(g.player.money, wallet + cpn, 'a month\'s coupon');
  assert.equal(l.coupons, 1);
  assert.equal(l.due, first + 30);
  const v = g.corp.sovereign.lotView(l);
  assert.ok(Math.abs(v.sale - Math.round(v.value * (1 - S.spread))) <= 1);
  const sold = g.corp.sovereign.sell(l.id);
  assert.ok(sold.ok); assert.equal(g.corp.sovereign.lots().length, 0);
});

test('a country\'s war downgrades it, its bond falls with the rating and a holder is told; peace brings it back', () => {
  const g = open(2703);
  g.player.money = 5_000_000;
  assert.ok(g.corp.sovereign.buy('lirre', 100000).ok);
  const before = g.corp.sovereign.lotView(g.corp.sovereign.lots()[0]);
  const feed0 = g.tablet.state.feed.length;
  g.world.market.wars.push({ a: 'lirre', b: 'sund', since: 41 });
  morning(g, 42); morning(g, 80);
  const after = g.corp.sovereign.lotView(g.corp.sovereign.lots()[0]);
  assert.ok(after.rating !== before.rating, `${before.rating} → ${after.rating}`);
  assert.ok(after.value < before.value, 'the bond is worth less at the lower rating');
  assert.ok(g.tablet.state.feed.length > feed0 && g.tablet.state.feed.some((f) => /downgraded/.test(f.text)), 'told');
  assert.ok(g.corp.state.sovereign.log.some((e) => /Grand Duchy of Lirre downgraded/.test(e.text)));
  g.world.market.wars = [];
  morning(g, 81); morning(g, 160);
  assert.equal(g.corp.sovereign.lotView(g.corp.sovereign.lots()[0]).rating, before.rating, 'it recovers');
});

test('distress: delayed payments after ten days at the top of the strain, owed not lost, paid when it recovers; restructuring only after forty, once, then the issue ends', () => {
  const g = open(2704);
  g.player.money = 5_000_000;
  assert.ok(g.corp.sovereign.buy('pallas', 100000).ok);
  const lot = g.corp.sovereign.lots()[0];
  wreck(g, 'pallas');
  const i = g.corp.state.sovereign.issues.pallas;
  let d = 41;
  for (; d < 41 + 9; d++) morning(g, d);
  assert.equal(i.status, 'open', 'nine days is not enough');
  for (; d < 41 + 12; d++) morning(g, d);
  assert.equal(i.status, 'delayed');
  assert.equal(g.corp.sovereign.buy('pallas', 1000).ok, false, 'no new bonds while it is not paying');
  // a coupon falls due while delayed: owed, not paid
  const wallet = g.player.money;
  const due = lot.due;
  while (d <= due + 1) morning(g, d++);
  assert.equal(g.player.money, wallet, 'nothing paid while delayed');
  assert.ok(lot.owed > 0, 'but owed');
  const owed = lot.owed;
  // it recovers: the wars end, the embargo lifts, the treasury refills
  const st = g.corp.state.geo; st.events = st.events.filter((e) => !String(e.id).startsWith('ev_x'));
  g.world.market.countries.pallas.budget = 1e9;
  for (let k = 0; k < 8 && i.status === 'delayed'; k++) morning(g, d++);
  assert.equal(i.status, 'open', 'paying again');
  assert.equal(lot.owed, 0);
  assert.ok(g.player.money >= wallet + owed, 'what it delayed is paid');
  // and a country that stays at the top is restructured, once
  g.world.market.countries.pallas.budget = 0; wreck(g, 'pallas');
  const before = g.player.money;
  for (let k = 0; k < 60 && i.status !== 'restructured'; k++) morning(g, d++);
  assert.equal(i.status, 'restructured');
  assert.equal(g.corp.sovereign.lots().length, 0, 'the lot is settled');
  const got = g.player.money - before;
  assert.ok(got >= 100000 * S.recovery[0] - 1 && got <= 100000 * S.recovery[1] + 1, `recovered ${got} of 100,000`);
  assert.ok(i.recovery >= S.recovery[0] && i.recovery <= S.recovery[1]);
  const after = g.player.money;
  for (let k = 0; k < 5; k++) morning(g, d++);
  assert.equal(g.player.money, after, 'once');
  // a new issue only after the pause, and only once it is not at the top of the strain
  const st2 = g.corp.state.geo; st2.events = st2.events.filter((e) => !String(e.id).startsWith('ev_x'));
  g.world.market.countries.pallas.budget = 1e9;
  for (let k = 0; k < S.reissueDays + 2; k++) morning(g, d++);
  assert.equal(g.corp.state.sovereign.issues.pallas.status, 'open');
  assert.ok(g.corp.state.sovereign.issues.pallas.serial > i.serial, 'a new issue');
});

test('the bonds are collateral at their rating and cannot be sold out from under a loan; the saved state round-trips', () => {
  const g = open(2705);
  g.player.money = 5_000_000;
  assert.ok(g.corp.sovereign.buy('teshvar', 200000).ok);
  assert.equal(advance({ kind: 'sovBond', rating: 'AA' }), 0.7);
  const item = g.corp.lending.holdings().find((h) => h.kind === 'sovBond');
  assert.ok(item && item.advance === 0.7 && item.secures > 100000);
  const free = g.corp.lending.capacity().free;
  assert.ok(g.corp.lending.borrow(Math.floor(free * 0.95), 12).ok);
  const s = g.corp.sovereign.sell(g.corp.sovereign.lots()[0].id);
  assert.equal(s.ok, false); assert.match(s.text, /Pledged to Lariat State Bank/);
  assert.equal(g.corp.sovereign.lots().length, 1);
  const copy = JSON.parse(JSON.stringify(g.corp.state.sovereign));
  assert.deepEqual(copy, g.corp.state.sovereign);
});

test('a delayed bond is not collateral, so selling it is never refused for want of security that was never counted', () => {
  const g = open(2706);
  g.player.money = 5_000_000;
  assert.ok(g.corp.sovereign.buy('teshvar', 200000).ok);
  assert.ok(g.corp.sovereign.buy('pallas', 100000).ok);
  const free = g.corp.lending.capacity().free;
  assert.ok(g.corp.lending.borrow(Math.floor(free), 12).ok, 'borrowed to the limit');
  wreck(g, 'pallas');
  const i = g.corp.state.sovereign.issues.pallas;
  for (let d = 41; d < 41 + 12; d++) morning(g, d);
  assert.equal(i.status, 'delayed');
  assert.ok(!g.corp.lending.holdings().some((h) => h.name.includes('Pallas')), 'a delayed bond secures nothing');
  const pallas = g.corp.sovereign.lots().find((l) => l.issue === 'pallas');
  const r = g.corp.sovereign.sell(pallas.id);
  assert.ok(r.ok, `the bond nobody lends against can be sold: ${r.text}`);
  const teshvar = g.corp.sovereign.lots().find((l) => l.issue === 'teshvar');
  assert.equal(g.corp.sovereign.sell(teshvar.id).ok, false, 'the one that is collateral cannot');
});
