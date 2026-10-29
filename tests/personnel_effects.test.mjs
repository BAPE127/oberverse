// What the right person does for a business (v0.62.0 part C): every effect is traced to money paid or
// output made — not to a quote — bounded, and nothing without the thing it acts on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, noImpulses } from './helpers.mjs';
import * as P from '../src/content/personnel.js';
import { makeCandidate, rolesFor, floorPay } from '../src/corp/people.js';
import { runCommand } from '../src/game/debugCommands.js';

/** Hire a person into a job, then set every skill (and so the effect) as the test needs. */
function staffWith(g, role, employer, { skill = 100, reliability = 100 } = {}) {
  const pe = g.corp.personnel;
  pe.ensure();
  const p = pe.peek();
  let c = pe.candidates().find((x) => x.roles.includes(role));
  while (!c) { const k = makeCandidate(P, { salt: p.salt, n: p.nextCand++, day: g.clock.day }); if (rolesFor(P, k).includes(role)) { p.pool.push(k); c = { ...k, roles: rolesFor(P, k) }; } }
  const r = pe.offer(c.id, { role, employer, pay: floorPay(c) + 5 });
  assert.ok(r.ok, r.text);
  const x = r.person;
  x.startDay = g.clock.day;
  for (const k of Object.keys(x.skills)) x.skills[k] = skill;
  x.reliability = reliability;
  pe.epoch++;
  return x;
}

test('with nobody hired every effect is nothing, and nothing is created by asking', () => {
  const g = newGame(1601);
  assert.equal(g.corp.personnel.effect('aerospace', 'materials'), 0);
  assert.equal(g.corp.state.people, undefined, 'the market is not opened by a hook');
  g.player.money = 5e6; g.aero.buyFirm();
  assert.equal(g.corp.personnel.effect('aerospace', 'overhead'), 0);
  assert.equal(g.aero.fixedCosts(g.aero.roost).overhead, 600);
  assert.equal(g.corp.state.people, undefined);
});

test('aerospace: a good procurement manager lowers the price actually paid for materials, within the ceiling', () => {
  const run = (hireOne, skill = 100) => {
    const g = newGame(1602); g.player.money = 9e6; assert.ok(g.aero.buyFirm().ok);
    const co = g.aero.roost; co.autoProcure = false;
    if (hireOne) staffWith(g, 'procurement_mgr', 'aerospace', { skill });
    const before = g.aero.cash(co);
    const r = g.aero.order(co, 'sup_sund_alloys', 'alu', 20);
    assert.ok(r.ok, r.text);
    return { paid: before - g.aero.cash(co), goods: r.po.goods, g };
  };
  const none = run(false);
  const top = run(true, 100);
  const mid = run(true, 55);
  const weak = run(true, 20);
  assert.ok(top.goods < none.goods, 'the goods cost less');
  assert.ok(top.paid < none.paid, 'and so did the cheque');
  assert.ok(top.goods >= none.goods * (1 - P.EFFECT_CAPS.materials) - 1, 'but never by more than the ceiling');
  assert.ok(mid.goods > top.goods && mid.goods < none.goods, 'a middling buyer saves less');
  assert.equal(weak.goods, none.goods, 'a beginner saves nothing');
  const saved = (none.goods - top.goods) / none.goods;
  assert.ok(saved > 0.02 && saved <= 0.0801, `saved ${(saved * 100).toFixed(1)}%`);
});

test('aerospace: two managers with different strengths, the same conditions, different results', () => {
  const buy = (role) => {
    const g = newGame(1603); g.player.money = 9e6; g.aero.buyFirm(); g.aero.roost.autoProcure = false;
    staffWith(g, role, 'aerospace');
    const co = g.aero.roost; const b = g.aero.cash(co);
    assert.ok(g.aero.order(co, 'sup_sund_alloys', 'alu', 20).ok);
    return b - g.aero.cash(co);
  };
  assert.ok(buy('procurement_mgr') < buy('sales_mgr'), 'the buyer pays less than a salesman does');
});

test('aerospace: a general manager trims the day\'s overhead — in the bill that is paid', () => {
  const day = (hireOne) => {
    const g = newGame(1604); g.player.money = 9e6; g.aero.buyFirm();
    const co = g.aero.roost;
    if (hireOne) staffWith(g, 'gm', 'aerospace');
    const before = g.aero.cash(co);
    g.aero.pay(co, g.aero.fixedCosts(co).overhead, 'overhead');
    return before - g.aero.cash(co);
  };
  const a = day(false); const b = day(true);
  assert.equal(a, 600);
  assert.ok(b < a && b >= a * (1 - P.EFFECT_CAPS.overhead), `${b}`);
});

test('arms: a good buyer lowers what parts cost at the order, and nothing is made cheaper without an order', () => {
  const g0 = newGame(1605); g0.player.money = 5e6; g0.arms.buyLicence(); g0.arms.buy('aw1');
  const g1 = newGame(1605); g1.player.money = 5e6; g1.arms.buyLicence(); g1.arms.buy('aw1');
  staffWith(g1, 'procurement_mgr', 'arms');
  const part = Object.keys(g0.content.items).find((k) => g0.content.items[k].category === 'arms_part' && g0.content.items[k].price >= 40);
  const p0 = g0.arms.partPrice(part); const p1 = g1.arms.partPrice(part);
  assert.ok(p1 < p0 && p1 >= Math.floor(p0 * (1 - P.EFFECT_CAPS.parts)) - 1);
  const m0 = g0.player.money; g0.arms.order('aw1', part, 10);
  const m1 = g1.player.money; g1.arms.order('aw1', part, 10);
  assert.equal(m0 - g0.player.money, p0 * 10); assert.equal(m1 - g1.player.money, p1 * 10, 'paid at the lower price');
});

test('arms: a good manager speeds a staffed station and does nothing for an empty one', () => {
  const setup = (withMgr, staffed) => {
    const g = newGame(1606); setTime(g, 1, '07:30'); noImpulses(g);
    runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry');
    runCommand(g, 'stations'); g.player.money = 5e6;
    const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
    g.arms.setRecipe(L.id, 'barrel'); L.in = { item_ap_steel: 60 };
    runCommand(g, 'hire aw1');
    const st = g.arms.state.staff[0];
    st.skills.machining = 4;
    if (staffed) assert.ok(g.arms.assign(st.id, L.id).ok);
    if (withMgr) staffWith(g, 'manufacturing_mgr', 'arms');
    return { g, L, st };
  };
  const a = setup(false, true); const b = setup(true, true); const c = setup(true, false);
  run(a.g, 90, 0.5); run(b.g, 90, 0.5); run(c.g, 90, 0.5);
  const ra = a.g.arms.rate('aw1', a.L); const rb = b.g.arms.rate('aw1', b.L);
  assert.ok(ra > 0, 'the worker is at the bench');
  assert.ok(rb > ra, 'faster with the manager');
  assert.ok(rb <= ra * (1 + P.EFFECT_CAPS.armsSpeed) + 1e-9, 'by no more than the ceiling');
  assert.equal(c.g.arms.rate('aw1', c.L), 0, 'no worker at the station, no speed — a manager cannot stand in for one');
});

test('shipping: a good manager lowers the daily upkeep actually paid; a beginner does not', () => {
  const upkeep = (hireOne, skill) => {
    const g = newGame(1607); g.player.money = 9e6; g.logistics.buyCompany();
    if (hireOne) staffWith(g, 'logistics_mgr', 'shipping', { skill });
    const e0 = g.logistics.state.ledger.expenses;
    g.logistics.daily();
    return g.logistics.state.ledger.expenses - e0;
  };
  const none = upkeep(false); const top = upkeep(true, 100); const weak = upkeep(true, 20);
  assert.ok(none > 0);
  assert.ok(top < none && top >= Math.round(none * (1 - P.EFFECT_CAPS.upkeep)) - 1);
  assert.equal(weak, none);
});

test('farming: a good manager raises the price a sale really fetches', () => {
  const sale = (hireOne) => {
    const g = newGame(1608); g.player.money = 9e6; g.farm.buy(Object.keys(g.farm.def.plots)[0]);
    if (hireOne) staffWith(g, 'farm_mgr', 'farming');
    const crop = Object.values(g.farm.def.crops)[0].crop;
    g.inventory.add(crop, 5);
    const before = g.player.money;
    assert.ok(g.farm.sellAtCoop(crop, 5).ok);
    return g.player.money - before;
  };
  const a = sale(false); const b = sale(true);
  assert.ok(b > a && b <= a * (1 + P.EFFECT_CAPS.farmPrice) + 5, `${a} → ${b}`);
});

test('a parent\'s executive reaches each subsidiary at half strength, and the sum never passes the ceiling', () => {
  const g = newGame(1609); g.player.money = 30e6;
  g.aero.buyFirm(); g.aero.roost.autoProcure = false;
  g.corp.group.form(); g.corp.contribute('parent', 3e6);
  g.corp.group.join('aerospace', { opening: 1e6 });
  const cpo = staffWith(g, 'cpo', 'parent');
  const pe = g.corp.personnel;
  const half = pe.effect('aerospace', 'materials');
  assert.ok(half > 0 && Math.abs(half - 0.03 * 0.5) < 1e-9, `${half}`);
  staffWith(g, 'procurement_mgr', 'aerospace');
  for (let i = 0; i < 3; i++) staffWith(g, 'procurement_spec', 'aerospace');
  const sum = pe.effect('aerospace', 'materials');
  assert.ok(sum <= P.EFFECT_CAPS.materials + 1e-9);
  assert.equal(pe.effect('farming', 'materials'), 0, 'not a business of the group');
  void cpo;
});

test('an unpaid manager does nothing until paid; leaving the job removes the effect at once', () => {
  const g = newGame(1610); g.player.money = 9e6; g.logistics.buyCompany();
  const x = staffWith(g, 'logistics_mgr', 'shipping');
  const pe = g.corp.personnel;
  assert.ok(pe.effect('shipping', 'upkeep') > 0);
  x.unpaid = 1; pe.epoch++;
  assert.equal(pe.effect('shipping', 'upkeep'), 0);
  x.unpaid = 0; pe.epoch++;
  assert.ok(pe.effect('shipping', 'upkeep') > 0);
  pe.dismiss(x.id);
  assert.equal(pe.effect('shipping', 'upkeep'), 0);
});

test('the effect is looked up once a day, not rebuilt for every call', () => {
  const g = newGame(1611); g.player.money = 9e6; g.logistics.buyCompany();
  staffWith(g, 'logistics_mgr', 'shipping');
  const pe = g.corp.personnel;
  let builds = 0;
  const orig = pe.roster.bind(pe);
  pe.roster = (e) => { builds++; return orig(e); };
  for (let i = 0; i < 500; i++) pe.effect('shipping', 'upkeep');
  assert.equal(builds, 1);
});
