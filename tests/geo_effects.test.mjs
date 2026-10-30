// Geopolitics, second part (v0.76.0): the wars' cost index reaches what your own arms works and aerospace firm buy, their effect on
// Halvermouth's government bond yields is bounded and moves the value of bonds held, managers answer cost pressure with requests and
// restraint (never by spending past a budget), and they do not bid for a buyer under an embargo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT } from './helpers.mjs';
import { makeTender } from '../src/aero/tenders.js';
import { rivalBid } from '../src/aero/rival.js';
import { Rng } from '../src/core/rng.js';
import { runCommand } from '../src/game/debugCommands.js';
import { GEO } from '../src/content/geo.js';
import { MGMT } from '../src/content/management.js';
import { bondPremium } from '../src/corp/geo.js';
import { judge } from '../src/corp/management.js';
import { valueOf } from '../src/corp/bonds.js';

const day = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const war = (parties, extra = {}) => ({ id: 'w', kind: 'war', parties, start: 1, registered: 1, end: null, status: 'active', severity: 0.6, goods: [], ...extra });
const embargo = (target, extra = {}) => ({ id: 'e', kind: 'embargo', target, parties: [target], start: 1, registered: 1, end: null, status: 'active', severity: 0.5, goods: ['arms'], ...extra });
/** A game whose market is running, with the wars of the day recorded and fully in force. */
function warTime(seed) {
  const g = newGame(seed);
  g.corp.ensureWorld(); g.market.state;
  day(g, 2); g.corp.geo.dailyTick();
  day(g, 40);
  return g;
}

test('pure: the bond premium is a rate in whole basis points, bounded, from wars more than embargoes, and nothing with no events', () => {
  assert.equal(bondPremium([], 10, GEO), 0);
  const one = bondPremium([war(['varn', 'caldera'])], 30, GEO);
  assert.ok(one > 0 && one < GEO.bond.max);
  assert.ok(Math.abs(one / 0.0001 - Math.round(one / 0.0001)) < 1e-6, 'to the basis point');
  assert.ok(bondPremium([embargo('pallas')], 30, GEO) < one);
  assert.equal(bondPremium(Array.from({ length: 30 }, () => war(['a', 'b'], { severity: 1 })), 90, GEO), GEO.bond.max, 'bounded');
  assert.ok(bondPremium([war(['varn', 'caldera'], { start: 10, registered: 10 })], 10, GEO) < one / 5, 'ramps in');
});

test('your own purchases carry the wars\' cost index, exactly as it stands, and are untouched without events', () => {
  const g = newGame(2601);
  const part = Object.entries(CONTENT.items).find(([, i]) => i.category === 'arms_part')[0];
  const before = g.arms.partPrice(part);
  assert.equal(g.corp.geo.costFactor('arms'), 1);
  const w = warTime(2601);
  const f = w.corp.geo.costFactor('arms');
  assert.ok(f > 1 && f <= GEO.bounds.cost[1]);
  assert.equal(w.arms.partPrice(part), Math.max(1, Math.round(CONTENT.items[part].price * w.arms.partsMult() * f)));
  assert.ok(w.arms.partPrice(part) >= before);
  assert.ok(w.corp.geo.costFactor('shipping') > w.corp.geo.costFactor('arms'), 'shipping is hit harder than arms');
  assert.equal(w.corp.geo.costFactor('finance'), 1, 'a sector with no exposure pays no more');
});

test('government bonds: the wars add a bounded premium to new coupons and move the value of bonds held; the policy rate is not touched', () => {
  const g = newGame(2602);
  g.corp.ensureWorld(); g.market.state; day(g, 2);
  g.player.money = 1_000_000;
  assert.equal(g.corp.geo.premium(), 0);
  const calm = g.corp.bonds.offers().map((o) => o.coupon);
  const calmYield = g.corp.bonds.offers()[1].yield;
  assert.ok(g.corp.bonds.buy(3, 100000).ok);
  const lot = g.corp.bonds.lots()[0];
  const valueCalm = g.corp.bonds.view(lot).value;
  g.corp.geo.dailyTick(); day(g, 40);
  const p = g.corp.geo.premium();
  assert.ok(p > 0 && p <= GEO.bond.max, `premium ${p}`);
  assert.equal(g.corp.bonds.rate(), g.corp.bank.rate(), 'the policy rate is the bank\'s alone');
  const dear = g.corp.bonds.offers();
  assert.ok(dear.every((o) => o.yield > g.corp.bank.rate()), 'yields sit above the policy rate by the term premium and what the wars add');
  assert.ok(Math.abs(dear[1].yield - (g.corp.bank.rate() + 0.0075 + p)) < 1e-9, '3-year: policy + term premium + the wars\' premium');
  assert.ok(g.corp.bonds.view(lot).value < valueOf(lot, g.clock.day, g.corp.bank.rate()), 'a bond already held is worth less when yields rise, on the same day');
  assert.equal(lot.coupon, calm[1], 'its own coupon was fixed when it was bought');
  assert.ok(dear[1].yield > calmYield);
  const o = g.corp.geo.overview();
  assert.equal(o.premium, p);
});

/** A funded arms works with one worker at a lathe, and a procurement manager. */
function works(seed) {
  const g = newGame(seed); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry');
  runCommand(g, 'stations');
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  g.arms.setRecipe(L.id, 'barrel');
  runCommand(g, 'hire aw1');
  assert.ok(g.arms.assign(g.arms.state.staff[0].id, L.id).ok);
  assert.ok(g.corp.contribute('arms', 500000).ok);
  g.corp.ensureWorld(); g.market.state;
  const pe = g.corp.personnel; pe.ensure();
  let c = pe.candidates().find((x) => x.roles.includes('procurement_mgr'));
  assert.ok(c, 'a candidate for procurement');
  const r = pe.offer(c.id, { role: 'procurement_mgr', employer: 'arms', pay: c.floor + 5 });
  assert.ok(r.ok, r.text); r.person.startDay = 1;
  return g;
}

test('managers answer cost pressure by asking, not spending: a request to raise the materials budget, once, and nothing changes until you approve', () => {
  const g = works(2603);
  const M = g.corp.management;
  assert.ok(M.setBudget('arms', 'materials', 10000).ok);
  M.ensure().spent.arms = { materials: { [M.month]: 8000 } }; // 80% used
  assert.equal(M.askMoreBudget('arms'), null, 'no pressure, no request');
  // two wars cost more
  day(g, 2); g.corp.geo.dailyTick();
  g.world.market.wars.push({ a: 'teshvar', b: 'morrow', since: 2 });
  day(g, 3); g.corp.geo.dailyTick(); day(g, 80);
  const pr = M.pressure('arms');
  assert.ok(pr >= MGMT.costNotice, `arms costs are up ${(pr * 100).toFixed(2)}%`);
  M.ensure().spent.arms = { materials: { [M.month]: 8000 } };
  const cap0 = M.budgetOf('arms', 'materials');
  const q = M.askMoreBudget('arms');
  assert.ok(q && q.kind === 'budget' && q.cost >= 100 && q.cost === Math.max(100, Math.round((cap0 * pr) / 100) * 100), 'a request in proportion');
  assert.equal(M.budgetOf('arms', 'materials'), cap0, 'a request changes nothing');
  assert.equal(M.askMoreBudget('arms'), null, 'one at a time');
  const r = M.approve(q.id);
  assert.ok(r.ok, r.text);
  assert.equal(M.budgetOf('arms', 'materials'), cap0 + q.cost);
  assert.equal(M.peek().pending.length, 0);
  // restraint: a general manager's expansion is held back for want of cash, with the reason, while a reorder is not
  const pe = g.corp.personnel; pe.ensure();
  const gc = pe.candidates().find((x) => x.roles.includes('gm'));
  assert.ok(gc, 'a candidate for general manager');
  const hire = pe.offer(gc.id, { role: 'gm', employer: 'arms', pay: gc.floor + 5 });
  assert.ok(hire.ok, hire.text); hire.person.startDay = 1; pe.epoch++;
  const gm = hire.person; gm.authority = { ...gm.authority, canExpand: true, spendLimit: 1e6, approvalAbove: 1e6 };
  assert.ok(pr >= MGMT.costHold, `arms costs up ${(pr * 100).toFixed(2)}%`);
  const hold = M.judgeFor(gm, 'expand', 'arms', 'expansion', 1000);
  assert.equal(hold.verdict, 'refuse'); assert.match(hold.reason, /hold back expansion to keep cash/);
  assert.notEqual(M.judgeFor(gm, 'reorder', 'arms', 'materials', 1000).reason, hold.reason, 'procurement carries on');
  // a request that is declined changes nothing
  M.peek().last.asked.arms = -999; M.ensure().spent.arms = { materials: { [M.month]: M.budgetOf('arms', 'materials') } };
  const q2 = M.askMoreBudget('arms');
  assert.ok(q2);
  const before = M.budgetOf('arms', 'materials');
  assert.ok(M.decline(q2.id).ok);
  assert.equal(M.budgetOf('arms', 'materials'), before);
});

test('pressure rules, pure: expansion is held back under cost pressure with the reason; reorders and hires are not', () => {
  const base = { kind: 'expand', owner: false, atWork: true, allowed: true, canExpand: true, funded: true, cost: 1000, spendLimit: 10000, approvalAbove: 3000, cap: 5000, spent: 0, affordable: true, hiresLeft: 2 };
  const held = judge({ ...base, hold: 'Costs here are up 3.0% because of the wars and embargoes: managers hold back expansion to keep cash.' });
  assert.equal(held.verdict, 'refuse'); assert.match(held.reason, /hold back expansion/);
  assert.equal(judge({ ...base, kind: 'hire', canHire: true, hold: 'x' }).verdict, 'execute');
  assert.equal(judge({ ...base, kind: 'reorder', hold: 'x' }).verdict, 'execute');
  assert.equal(judge({ ...base }).verdict, 'execute');
});

test('a manager does not bid for a buyer under an embargo — even one whose tender was posted before the embargo began', () => {
  const g = newGame(2605);
  g.player.money = 40_000_000; g.corp.ensureWorld(); g.market.state;
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('aerospace', 6_000_000).ok);
  const A = g.aero; const co = A.roost;
  A.roost.autoProcure = false; A.state.tenders = [];
  const M = g.corp.management; M.ensure(); M.setMargin('aerospace', 0);
  // a tender from a defence buyer (Sund), for a civil aircraft the firm can build, posted while its country is not embargoed
  const t = makeTender(CONTENT.aerospace, new Rng(3), { id: 'Te', customerId: 'cu_sund_defence', state: { budget: 1e9 }, day: g.clock.day });
  Object.assign(t, { product: 'ap_skylark', qty: 2, ceiling: 400000, days: 20, quality: 30, closes: g.clock.day + 6, defence: false, embargoed: false });
  delete t.config; // a plain aircraft: no optional extras that need research
  A.state.tenders.push(t);
  g.world.market.countries.sund.embargo = false;
  assert.equal(A.bidQuote(co.id, t.id).ok, true, 'biddable before the embargo');
  assert.ok(M.planBids().some((b) => b.item === t.id), 'a manager would plan a bid on it');
  g.world.market.countries.sund.embargo = true; // the embargo comes after the tender was posted
  assert.equal(t.embargoed, false, 'the tender itself still says not embargoed');
  const q = A.bidQuote(co.id, t.id);
  assert.equal(q.ok, false); assert.match(q.reason, /embargo/);
  assert.ok(!M.planBids().some((b) => b.item === t.id), 'the manager plans nothing for it');
  const r = A.placeBid(co.id, t.id, t.ceiling, t.days);
  assert.equal(r.ok, false, 'and nobody, owner or manager, can place the bid'); assert.match(r.text, /embargo/);
  g.world.market.countries.sund.embargo = false;
  assert.equal(A.bidQuote(co.id, t.id).ok, true, 'lifted: biddable again');
});

test('Meridian is held to the embargo as it stands today too, not as it stood when a tender was posted', () => {
  const g = newGame(2607);
  g.corp.ensureWorld(); g.market.state;
  const A = g.aero; const mer = A.meridian;
  const t = makeTender(CONTENT.aerospace, new Rng(3), { id: 'Tr', customerId: 'cu_sund_defence', state: { budget: 1e9 }, day: g.clock.day });
  Object.assign(t, { product: 'ap_skylark', qty: 1, ceiling: 4_000_000, days: 60, quality: 10, closes: g.clock.day + 6, defence: false, embargoed: false });
  delete t.config;
  g.world.market.countries.sund.embargo = false;
  const before = rivalBid(A, mer, t);
  assert.ok(before, 'Meridian would bid on it with its buyer free');
  g.world.market.countries.sund.embargo = true;
  assert.equal(t.embargoed, false, 'the tender still carries the flag it was posted with');
  assert.equal(rivalBid(A, mer, t), null, 'with the buyer embargoed now, Meridian does not bid');
});
