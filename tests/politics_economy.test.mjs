// The economy hooks (v0.96.0): what the policies in force do to farms, arms, aerospace tenders, shipping, the exchange and the state's bond.
// Every effect is a bounded multiplier or a named levy read where a price or cost is already worked out; a levy is the state's revenue (no money from nowhere);
// nothing ever pays the player; and with the knob off the game is as it was at v0.95.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { EFFECTS as E } from '../src/content/effects.js';
import { POLICIES } from '../src/content/policies.js';
import { effectsOf, sentimentFor, debtPremium } from '../src/politics/effects.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** The government holds exactly these policies, in force (the record is otherwise untouched). */
const hold = (g, ...keys) => { const s = g.politics.ensure(); s.policies = keys.map((k, i) => ({ id: i + 1, key: k, state: 'active', since: 1, by: s.government.partyId, votes: null })); s.nextPolicy = keys.length + 1; return s; };
const withKnob = (on, fn) => { const was = E.enabled; E.enabled = on; try { return fn(); } finally { E.enabled = was; } };

test('the effects: every policy named has a line that says what it does; the sum of each hook is bounded; neutral with nothing in force or the knob off', () => {
  for (const [id, p] of Object.entries(E.policies)) { assert.ok(POLICIES[id], `${id} is a policy`); assert.ok(p.line && p.line.length > 20, `${id} says what it does`); }
  const none = effectsOf([], E);
  assert.deepEqual([none.farmFee, none.portFees, none.sundArms, none.publicBudgets, none.lines.length], [0, 0, 0, 0, 0]);
  const all = effectsOf(Object.keys(E.policies), E);
  assert.ok(all.farmFee >= 0 && all.farmFee <= 0.08 && all.portFees >= -0.2 && all.portFees <= 0.3 && all.sundArms >= -0.6 && all.sundArms <= 1);
  for (const s of Object.keys(all.sentiment)) assert.ok(Math.abs(all.sentiment[s]) <= 0.05);
  assert.ok(Math.abs(sentimentFor(effectsOf(['reg_up', 'defence_down', 'spend_down', 'farm_down'], E), 'arms')) <= 0.05);
  assert.deepEqual(effectsOf(Object.keys(E.policies), { ...E, enabled: false }).lines, [], 'the knob off: neutral');
  assert.ok(effectsOf(['reg_up'], E).portFees > 0 && effectsOf(['reg_down'], E).portFees < 0, 'opposed policies pull opposite ways');
  assert.ok(effectsOf(['defence_up'], E).sundArms > 0 && effectsOf(['defence_down'], E).sundArms < 0);
  // policies the effects do not reach yet say nothing
  assert.equal(effectsOf(['police_up', 'enforce_strict', 'surveil_up', 'abroad_up'], E).lines.length, 0);
});

test('a farm inspection fee: named, taken from the sale, and it is the state\'s revenue (its debt falls by exactly that, in thousands); none without the policy', () => {
  const g = newGame(1101); g.player.money = 30_000_000;
  const [p1] = Object.keys(g.farm.def.plots);
  assert.ok(g.farm.buy(p1).ok); assert.ok(g.corp.contribute('farming', 200_000).ok);
  const crop = Object.values(g.farm.def.crops)[0].crop;
  const a = g.corp.account('farming');
  const sell = (n) => { g.inventory.add(crop, n); const c0 = a.cash; const r = g.farm.sellAtCoop(crop, n); assert.ok(r.ok, r.text); return a.cash - c0; };
  const s = hold(g);
  const base = sell(40);
  assert.equal(s.levies, undefined, 'no fee without the policy');
  // the market has softened: compare on a second, identical game
  const h = newGame(1101); h.player.money = 30_000_000;
  assert.ok(h.farm.buy(p1).ok); assert.ok(h.corp.contribute('farming', 200_000).ok);
  const s2 = hold(h, 'farm_up'); const debt0 = s2.budget.debt;
  h.inventory.add(crop, 40); const ha = h.corp.account('farming'); const c0 = ha.cash;
  assert.ok(h.farm.sellAtCoop(crop, 40).ok);
  const net = ha.cash - c0;
  const fee = s2.levies.total;
  assert.equal(net + fee, base, 'the same sale, less the fee');
  assert.ok(Math.abs(fee / base - 0.04 / 0.96) < 0.01, `a 4% fee (${fee} of ${net + fee})`);
  assert.ok(Math.abs((debt0 - s2.budget.debt) - fee / 1000) < 1e-9, 'the fee is the state\'s revenue: the debt falls by it');
  assert.equal(s2.levies.by['farm inspection'], fee);
  assert.ok(h.corp.reconciles());
  assert.ok(h.politics.effectLines().paid.total === fee && /4% inspection fee/.test(h.politics.effectLines().lines[0].text), 'it is shown, named');
  withKnob(false, () => { const k = newGame(1101); k.player.money = 30_000_000; k.farm.buy(p1); k.corp.contribute('farming', 200_000); hold(k, 'farm_up'); k.inventory.add(crop, 40); const kc = k.corp.account('farming'); const k0 = kc.cash; k.farm.sellAtCoop(crop, 40); assert.equal(kc.cash - k0, base, 'knob off: no fee'); });
});

test('port and licensing fees follow regulation: higher with more inspections, lower with less, on foreign ports only', () => {
  const g = newGame(1101); g.player.money = 30_000_000;
  assert.ok(g.logistics.buyCompany().ok); assert.ok(g.corp.contribute('shipping', 1_000_000).ok);
  const port = Object.keys(g.logistics.cfg.ports).find((id) => !g.logistics.ownsPort(id) && g.logistics.portType(id).fee > 0);
  const v = g.logistics.vessels()[0];
  const home = v.port;
  const to = Object.keys(g.logistics.cfg.ports).find((id) => id !== home && !g.logistics.ownsPort(id) && g.logistics.portType(id).fee > 0);
  assert.ok(to && port);
  const fees = () => g.logistics.plan(v, to).fees;
  hold(g); const base = fees();
  hold(g, 'reg_up'); g.politics._fxKey = null; const up = fees();
  hold(g, 'reg_down'); g.politics._fxKey = null; const down = fees();
  assert.ok(base > 0 && up > base && down < base, `${down} < ${base} < ${up}`);
  assert.ok(Math.abs(up / base - 1.15) < 0.02 && Math.abs(down / base - 0.9) < 0.02);
  withKnob(false, () => { hold(g, 'reg_up'); g.politics._fxKey = null; assert.equal(fees(), base); });
});

test('Sund\'s arms budget refills faster with defence spending and slower with cuts; the world\'s other countries are untouched; the budget is the state\'s, never yours', () => {
  const refill = (policy) => {
    const g = newGame(9); g.market.ensure?.(); g.player.money = 100000;
    hold(g, policy); g.politics._fxKey = null;
    const m = g.market; const ids = ['sund', 'ostmark'];
    for (const id of ids) m.state.countries[id].budget = 50000;
    const wallet = g.player.money;
    m.dailyTick();
    assert.equal(g.player.money, wallet, 'it never touches your wallet');
    return Object.fromEntries(ids.map((id) => [id, m.state.countries[id].budget - 50000]));
  };
  const up = refill('defence_up'); const down = refill('defence_down'); const none = refill('police_up');
  assert.ok(up.sund > none.sund && down.sund < none.sund && down.sund > 0, `${down.sund} < ${none.sund} < ${up.sund}`);
  assert.equal(up.ostmark, none.ostmark); assert.equal(down.ostmark, none.ostmark);
  assert.ok(Math.abs(up.sund / none.sund - 1.5) < 0.02 && Math.abs(down.sund / none.sund - 0.6) < 0.02);
});

test('Sund\'s public customers (the Space Office, the Met Office) have more or less to spend on tenders with public spending; private customers do not change', () => {
  const run = (policy) => {
    const g = newGame(11); g.aero.ensure?.();
    hold(g, policy); g.politics._fxKey = null;
    const s = g.aero.state;
    for (const id of Object.keys(s.customers)) s.customers[id].budget = 0;
    g.aero.daily();
    return { space: s.customers.cu_sund_space.budget, met: s.customers.cu_halver_weather.budget, sky: s.customers.cu_skyward.budget };
  };
  const up = run('spend_up'); const down = run('spend_down'); const none = run('police_up');
  assert.ok(up.space > none.space && down.space < none.space && down.space > 0);
  assert.ok(up.met > none.met && down.met < none.met);
  assert.equal(up.sky, none.sky); assert.equal(down.sky, none.sky);
});

test('the exchange: policies move what the market expects a sector to earn, a little and boundedly; opposed policies cancel; the knob off restores the old price', () => {
  const g = newGame(13);
  const probe = { id: 'x', sector: 'arms', country: 'sund' };
  hold(g); g.politics._fxKey = null;
  const base = g.corp.geo.sentiment(probe);
  hold(g, 'defence_up'); g.politics._fxKey = null; const up = g.corp.geo.sentiment(probe);
  hold(g, 'defence_down'); g.politics._fxKey = null; const down = g.corp.geo.sentiment(probe);
  hold(g, 'defence_up', 'reg_up'); g.politics._fxKey = null; const mixed = g.corp.geo.sentiment(probe);
  assert.ok(up > base && down < base && Math.abs(up - base) <= 0.05 && Math.abs(down - base) <= 0.05);
  assert.ok(Math.abs(mixed - (base + 0.03 - 0.01)) < 1e-9, 'effects add');
  withKnob(false, () => { g.politics._fxKey = null; assert.equal(g.corp.geo.sentiment(probe), base); });
});

test('the state\'s debt and deficit add to the yield of its bond: nothing while comfortable, rising with debt and with a deficit, bounded; the knob off is zero', () => {
  const D = E.debt;
  assert.equal(debtPremium(0, 3000, -100, E), 0);
  assert.equal(debtPremium(3000 * 12 * D.debtFrom, 3000, -100, E), 0, 'right at the line: nothing');
  const a = debtPremium(3000 * 12 * 0.5, 3000, 0, E); const b = debtPremium(3000 * 12 * 1.2, 3000, 0, E);
  assert.ok(a > 0 && b > a, 'more debt, more premium');
  assert.ok(debtPremium(0, 3000, 600, E) > 0 && debtPremium(0, 3000, 900, E) > debtPremium(0, 3000, 600, E), 'a deficit adds');
  assert.ok(debtPremium(1e9, 3000, 3000, E) <= D.max + 1e-12, 'bounded');
  assert.equal(debtPremium(1e9, 3000, 3000, { ...E, enabled: false }), 0);
  const g = newGame(21); const s = g.politics.ensure();
  const calm = g.corp.bonds.offers()[1].coupon;
  s.budget.debt = 60000;
  const after = g.corp.bonds.offers()[1];
  assert.ok(g.politics.bondPremium() > 0 && after.yield > g.corp.bank.rate() + 0.0075, 'a heavy debt raises what the state pays');
  assert.ok(after.coupon >= calm);
  assert.equal(g.corp.bonds.rate(), g.corp.bank.rate(), 'the policy rate is the bank\'s alone');
  withKnob(false, () => { assert.equal(g.politics.bondPremium(), 0); });
});

test('with the knob off nothing changes: the same world, the same sales, fees, budgets and prices as before the policies reached the economy; reads change nothing and a save keeps the levies', () => {
  const g = newGame(1101);
  const s = hold(g, 'farm_up', 'reg_up', 'defence_up', 'spend_up');
  g.politics._fxKey = null;
  const before = JSON.stringify(s);
  const v = g.politics.effectLines(); g.politics.effectLines(); g.politics.fx();
  assert.ok(v.lines.length === 4 && v.enabled);
  assert.equal(JSON.stringify(s), before, 'reading the effects changes nothing');
  withKnob(false, () => { g.politics._fxKey = null; const o = g.politics.effectLines(); assert.equal(o.lines.length, 0); assert.equal(g.politics.portFeeFactor(), 1); assert.equal(g.politics.sundArmsFactor(), 1); assert.equal(g.politics.publicBudgetFactor(), 1); assert.equal(g.politics.farmFee(1000), 0); });
  g.politics._fxKey = null;
  g.politics.collectLevy(5000, 'farm inspection');
  const g2 = roundtrip(g);
  assert.equal(g2.politics.peek().levies.total, 5000, 'the levies survive a save');
});
