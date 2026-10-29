// Managers deciding for themselves (v0.63.0): the judgement is one pure function with every branch tested; what a
// manager does goes through the business's own services within a budget the owner set; nothing happens without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, Game, CONTENT } from './helpers.mjs';
import * as P from '../src/content/personnel.js';
import { MGMT } from '../src/content/management.js';
import { makeCandidate, rolesFor, floorPay } from '../src/corp/people.js';
import { judge, armsPar, planArmsOrders, hireChoice } from '../src/corp/management.js';
import { runCommand } from '../src/game/debugCommands.js';

const base = { kind: 'reorder', owner: false, atWork: true, allowed: true, canHire: true, funded: true, cost: 1000, spendLimit: 10000, approvalAbove: 3000, cap: 5000, spent: 0, affordable: true, hiresLeft: 2 };
const atDay = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };

function staffWith(g, role, employer, { skill = 100, authority = null } = {}) {
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
  if (authority) x.authority = { ...x.authority, ...authority };
  pe.epoch++;
  return x;
}

/** A funded arms works with one worker at a lathe making barrels: it uses steel. */
function armsWorks(seed, { fund = 500000 } = {}) {
  const g = newGame(seed); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry');
  runCommand(g, 'stations');
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  g.arms.setRecipe(L.id, 'barrel');
  runCommand(g, 'hire aw1');
  const st = g.arms.state.staff[0];
  assert.ok(g.arms.assign(st.id, L.id).ok);
  if (fund) assert.ok(g.corp.contribute('arms', fund).ok);
  return { g, L, st };
}

test('judge: every branch, in order, with its reason', () => {
  const v = (patch) => judge({ ...base, ...patch });
  assert.equal(v({}).verdict, 'execute');
  assert.match(v({ atWork: false }).reason, /not at work/);
  assert.match(v({ allowed: false }).reason, /job does not make/);
  assert.match(v({ kind: 'hire', canHire: false }).reason, /not authorised to hire/);
  assert.equal(v({ kind: 'reorder', canHire: false }).verdict, 'execute', 'canHire matters only for hiring');
  assert.match(v({ funded: false }).reason, /account of its own/);
  assert.match(v({ cost: 0 }).reason, /nothing to spend/);
  assert.match(v({ kind: 'hire', hiresLeft: 0 }).reason, /most hires/);
  assert.match(v({ cap: 0 }).reason, /No monthly budget/);
  assert.match(v({ cap: undefined }).reason, /No monthly budget/);
  assert.match(v({ spent: 4500 }).reason, /pass the monthly budget \(500 left of 5,000\)/);
  assert.match(v({ cost: 12000, cap: 99999 }).reason, /spending limit/);
  assert.match(v({ affordable: false }).reason, /cannot cover/);
  const q = v({ cost: 4000 });
  assert.equal(q.verdict, 'queue'); assert.match(q.reason, /3,000/);
  assert.equal(v({ cost: 4000, owner: true }).verdict, 'execute', 'the owner lifts the ask-above limit');
  assert.equal(v({ cost: 4000, owner: true, spent: 2000 }).verdict, 'refuse', 'and nothing else: the budget still holds');
  assert.equal(v({ cost: 12000, cap: 99999, owner: true }).verdict, 'refuse', 'nor the person\'s own limit');
  assert.equal(v({ cost: 3000 }).verdict, 'execute', 'at the limit is still without asking');
});

test('arms par and orders: only bought parts, only staffed stations, up to par when below half, capped', () => {
  const isPart = (id) => id.startsWith('item_ap_');
  const par = armsPar([{ in: { item_ap_steel: 2 }, minutes: 5, staffed: true }, { in: { item_ap_steel: 2, item_ap_springs: 1 }, minutes: 6, staffed: true }, { in: { item_ap_polymer: 2 }, minutes: 3, staffed: false }, { in: { item_ai_barrel: 1 }, minutes: 8, staffed: true }], isPart, MGMT);
  assert.deepEqual(par, { item_ap_steel: Math.ceil((24 + 20) * 8), item_ap_springs: Math.ceil(10 * 8) });
  const price = (id) => ({ item_ap_steel: 10, item_ap_springs: 20 }[id]);
  assert.deepEqual(planArmsOrders(par, {}, price, MGMT).map((o) => [o.item, o.qty]), [['item_ap_springs', 60], ['item_ap_steel', 60]], 'sorted, capped');
  assert.deepEqual(planArmsOrders(par, { item_ap_steel: 200, item_ap_springs: 40 }, price, MGMT), [], 'at or above half of par: nothing');
  assert.deepEqual(planArmsOrders(par, { item_ap_steel: 340, item_ap_springs: 39 }, price, MGMT).map((o) => [o.item, o.qty]), [['item_ap_springs', 41]]);
  assert.deepEqual(armsPar([], isPart, MGMT), {});
});

test('hireChoice: the job\'s own level first, then the best fit, ties by id — the same every time', () => {
  const c = [{ id: 'cand_9', tier: 'manager', floor: 100, fit: 70 }, { id: 'cand_2', tier: 'staff', floor: 50, fit: 60 }, { id: 'cand_3', tier: 'staff', floor: 50, fit: 60 }, { id: 'cand_4', tier: 'staff', floor: 50, fit: 55 }];
  assert.equal(hireChoice(c, 'staff').id, 'cand_2');
  assert.equal(hireChoice([...c].reverse(), 'staff').id, 'cand_2');
  assert.equal(hireChoice(c, 'executive').id, 'cand_9', 'nobody of the level: the best fit');
  assert.equal(hireChoice([], 'staff'), null);
});

test('with no budget set nothing is created and nothing is spent, however many people are hired', () => {
  const { g } = armsWorks(1701);
  staffWith(g, 'procurement_mgr', 'arms');
  const cash = g.corp.cashOf('arms'); const wallet = g.player.money;
  for (let d = 2; d < 12; d++) { atDay(g, d); g.corp.management.dailyTick(); }
  assert.equal(g.corp.state.management, undefined, 'no state until a budget exists');
  assert.equal(g.corp.cashOf('arms'), cash); assert.equal(g.player.money, wallet);
  assert.equal(g.arms.state.orders.length, 0);
});

test('arms reorder: a manager with a budget buys the parts a staffed station uses — paid from the works\' account, counted, attributed', () => {
  const { g } = armsWorks(1702);
  const x = staffWith(g, 'procurement_mgr', 'arms');
  const M = g.corp.management;
  assert.ok(M.setBudget('arms', 'materials', 3000).ok);
  const cash = g.corp.cashOf('arms'); const wallet = g.player.money; const had = g.corp.account('arms').actors?.[x.id] || 0;
  atDay(g, 2); M.dailyTick();
  const orders = g.arms.state.orders;
  assert.ok(orders.length > 0 && orders.every((o) => o.item === 'item_ap_steel'));
  const cost = orders.reduce((a, o) => a + o.qty * g.arms.partPrice(o.item), 0);
  assert.equal(cash - g.corp.cashOf('arms'), cost, 'paid from the works account');
  assert.equal(g.player.money, wallet, 'not from the wallet');
  assert.equal(M.spentIn('arms', 'materials'), cost);
  assert.equal(g.corp.account('arms').actors[x.id] - had, cost, 'the actor is recorded');
  assert.equal(M.peek().log.at(-1).type, 'done');
  // the second run the same day, and the next day while it is on order, buy nothing more
  M.dailyTick();
  assert.equal(g.arms.state.orders.reduce((a, o) => a + o.qty, 0), 60, 'the same day, no second decision');
  atDay(g, 3); M.dailyTick(); atDay(g, 4); M.dailyTick(); atDay(g, 5); M.dailyTick();
  assert.equal(g.arms.state.orders.reduce((a, o) => a + o.qty, 0), 120, 'a second order of 60 brings it above half of par (96); on order counts as held, so no more');
});

test('arms reorder: nothing is bought for a station with no worker, or when the part is already stocked', () => {
  const a = armsWorks(1703);
  a.st.assigned = null;
  staffWith(a.g, 'procurement_mgr', 'arms');
  a.g.corp.management.setBudget('arms', 'materials', 9999);
  atDay(a.g, 2); a.g.corp.management.dailyTick();
  assert.equal(a.g.arms.state.orders.length, 0, 'nobody at the lathe');
  const b = armsWorks(1704);
  staffWith(b.g, 'procurement_mgr', 'arms');
  b.g.corp.management.setBudget('arms', 'materials', 9999);
  b.g.world.containers[b.g.arms.def('aw1').inBay].items.item_ap_steel = 200;
  atDay(b.g, 2); b.g.corp.management.dailyTick();
  assert.equal(b.g.arms.state.orders.length, 0, 'the dock is above half of par');
});

test('the monthly budget is a hard stop: refused with the reason, nothing paid, and it resets with the month', () => {
  const { g } = armsWorks(1705);
  staffWith(g, 'procurement_mgr', 'arms');
  const M = g.corp.management;
  M.setBudget('arms', 'materials', 50);
  const cash = g.corp.cashOf('arms');
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('arms'), cash); assert.equal(g.arms.state.orders.length, 0);
  assert.match(M.peek().log.at(-1).text, /pass the monthly budget/);
  const n = M.peek().log.length;
  atDay(g, 3); M.dailyTick();
  assert.equal(M.peek().log.length, n, 'the same refusal is not written down every day');
  M.setBudget('arms', 'materials', 5000);
  atDay(g, 4); M.dailyTick();
  assert.ok(g.arms.state.orders.length > 0);
  const spent = M.spentIn('arms', 'materials');
  assert.ok(spent > 0 && spent <= 5000);
  atDay(g, 31); assert.equal(M.spentIn('arms', 'materials'), 0, 'a new month, a clear budget');
});

test('the owner\'s own purchases never count against a manager\'s budget', () => {
  const { g } = armsWorks(1706);
  const M = g.corp.management;
  M.setBudget('arms', 'materials', 1000);
  g.arms.order('aw1', 'item_ap_steel', 40);
  assert.equal(M.spentIn('arms', 'materials'), 0);
});

test('above the ask-above limit it queues for the owner once; approving it carries it out; declining does not', () => {
  const { g } = armsWorks(1707);
  const x = staffWith(g, 'procurement_mgr', 'arms', { authority: { spendLimit: 5000, approvalAbove: 100 } });
  const M = g.corp.management;
  M.setBudget('arms', 'materials', 5000);
  const cash = g.corp.cashOf('arms');
  atDay(g, 2); M.dailyTick();
  assert.equal(M.peek().pending.length, 1); assert.equal(g.corp.cashOf('arms'), cash, 'nothing paid while it waits');
  const q = M.peek().pending[0];
  assert.equal(q.actor, x.id);
  atDay(g, 3); M.dailyTick(); atDay(g, 4); M.dailyTick();
  assert.equal(M.peek().pending.length, 1, 'not queued twice');
  assert.equal(M.spentIn('arms', 'materials'), 0, 'a request holds no budget');
  const r = M.approve(q.id);
  assert.ok(r.ok, r.text);
  assert.equal(M.peek().pending.length, 0);
  assert.ok(g.corp.cashOf('arms') < cash); assert.equal(g.arms.state.orders.reduce((a, o) => a + o.qty, 0), 60);
  assert.equal(M.peek().log.at(-1).type, 'approved');
  // declining, on another day when the dock has emptied again
  g.arms.state.orders = []; atDay(g, 5); M.dailyTick();
  const q2 = M.peek().pending[0]; assert.ok(q2);
  assert.ok(M.decline(q2.id).ok);
  assert.equal(g.arms.state.orders.length, 0); assert.equal(M.peek().log.at(-1).type, 'declined');
  assert.ok(!M.approve(q2.id).ok, 'gone');
});

test('a request is judged again when approved: needs, budget, funds and the person all counted at that moment', () => {
  const mk = (seed) => { const w = armsWorks(seed); const x = staffWith(w.g, 'procurement_mgr', 'arms', { authority: { spendLimit: 5000, approvalAbove: 100 } }); w.g.corp.management.setBudget('arms', 'materials', 5000); atDay(w.g, 2); w.g.corp.management.dailyTick(); assert.equal(w.g.corp.management.peek().pending.length, 1); return { ...w, x, M: w.g.corp.management, q: w.g.corp.management.peek().pending[0] }; };
  let t = mk(1708);
  t.g.world.containers[t.g.arms.def('aw1').inBay].items.item_ap_steel = 300; // delivered meanwhile
  assert.match(t.M.approve(t.q.id).text, /no longer needed/); assert.equal(t.g.arms.state.orders.length, 0);
  t = mk(1709); t.M.setBudget('arms', 'materials', 10);
  assert.match(t.M.approve(t.q.id).text, /monthly budget/); assert.equal(t.g.arms.state.orders.length, 0);
  t = mk(1710); t.g.corp.distribute('arms', t.g.corp.cashOf('arms') - 5);
  assert.match(t.M.approve(t.q.id).text, /cannot cover/);
  t = mk(1711); t.g.corp.personnel.dismiss(t.x.id);
  assert.match(t.M.approve(t.q.id).text, /no longer hold/); assert.equal(t.g.arms.state.orders.length, 0);
  t = mk(1712); t.x.unpaid = 1;
  assert.match(t.M.approve(t.q.id).text, /not at work/);
});

test('an unanswered request lapses after a week, and nothing happens', () => {
  const { g } = armsWorks(1713);
  staffWith(g, 'procurement_mgr', 'arms', { authority: { spendLimit: 5000, approvalAbove: 100 } });
  const M = g.corp.management; M.setBudget('arms', 'materials', 5000);
  atDay(g, 2); M.dailyTick();
  assert.equal(M.peek().pending.length, 1);
  atDay(g, 8); M.dailyTick(); assert.equal(M.peek().pending.length, 1, 'six days: still waiting');
  atDay(g, 9); M.dailyTick();
  assert.equal(M.peek().log.some((l) => l.type === 'expired'), true);
  assert.equal(g.arms.state.orders.length, 0);
});

test('managers act only for a business with an account of its own: an unfunded one is never drawn from the wallet', () => {
  const { g } = armsWorks(1714, { fund: 0 });
  staffWith(g, 'procurement_mgr', 'arms');
  const M = g.corp.management; M.setBudget('arms', 'materials', 5000);
  const wallet = g.player.money;
  atDay(g, 2); M.dailyTick();
  assert.equal(g.player.money, wallet); assert.equal(g.arms.state.orders.length, 0);
  assert.equal(M.status('arms', 'reorder').notes.some((n) => /Fund this business first/.test(n)), true);
});

test('a job that does not decide this, a person unpaid, or no one at all: no decision', () => {
  const { g } = armsWorks(1715);
  const M = g.corp.management; M.setBudget('arms', 'materials', 5000);
  staffWith(g, 'sales_mgr', 'arms');
  atDay(g, 2); M.dailyTick();
  assert.equal(g.arms.state.orders.length, 0, 'a sales manager does not buy parts');
  const x = staffWith(g, 'procurement_mgr', 'arms'); x.unpaid = 1; g.corp.personnel.epoch++;
  atDay(g, 3); M.dailyTick();
  assert.equal(g.arms.state.orders.length, 0, 'unpaid, so not at work');
  assert.equal(M.deciders('reorder', 'arms').length, 0);
});

function farmWith(seed) {
  const g = newGame(seed); g.player.money = 9e6;
  const plots = Object.keys(g.farm.def.plots);
  assert.ok(g.farm.buy(plots[0]).ok); assert.ok(g.farm.buy(plots[1]).ok);
  assert.ok(g.corp.contribute('farming', 600000).ok);
  return g;
}

function aeroFirm(seed) {
  const g = newGame(seed); g.player.money = 30e6;
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('aerospace', 4e6).ok);
  return g;
}

test('aerospace: planning moves nothing (no RNG, no supplier stock), and the cost quoted is the cost paid', () => {
  const g = aeroFirm(1716); const A = g.aero; const co = A.roost; co.autoProcure = false;
  const x = staffWith(g, 'procurement_mgr', 'aerospace', { authority: { spendLimit: 100000, approvalAbove: 100000 } });
  const M = g.corp.management;
  const rng = A.rng.state; const stock = JSON.stringify(A.state.suppliers);
  const plan = M.planAero();
  assert.ok(plan.length > 0, 'the Skylarks need materials');
  assert.equal(A.rng.state, rng); assert.equal(JSON.stringify(A.state.suppliers), stock);
  M.setBudget('aerospace', 'materials', 2e6);
  const cash = g.corp.cashOf('aerospace'); const had = g.corp.account('aerospace').actors?.[x.id] || 0;
  const quoted = plan.reduce((a, o) => a + o.cost, 0);
  atDay(g, 2); M.dailyTick();
  assert.equal(cash - g.corp.cashOf('aerospace'), quoted, 'paid exactly what was quoted');
  assert.equal(M.spentIn('aerospace', 'materials'), quoted);
  assert.equal(g.corp.account('aerospace').actors[x.id] - had, quoted);
  assert.ok(A.ordersOf(co).length > 0);
});

test('aerospace: while the firm\'s auto-buy is on the manager does not buy, and the app says why; off, they do', () => {
  const g = aeroFirm(1717); const co = g.aero.roost;
  staffWith(g, 'procurement_mgr', 'aerospace', { authority: { spendLimit: 100000, approvalAbove: 100000 } });
  const M = g.corp.management; M.setBudget('aerospace', 'materials', 2e6);
  co.autoProcure = true;
  const cash = g.corp.cashOf('aerospace');
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('aerospace'), cash, 'auto-buy is the owner\'s standing order, left as it is');
  assert.match(M.status('aerospace', 'reorder').notes.join(' '), /Auto-buy is on/);
  co.autoProcure = false;
  atDay(g, 3); M.dailyTick();
  assert.ok(g.corp.cashOf('aerospace') < cash);
});

test('hiring: a general manager fills a staff opening within budget, once a month a few times at most, and the cost is the fee and a month\'s wage', () => {
  const g = farmWith(1718);
  const gm = staffWith(g, 'gm', 'farming', { authority: { spendLimit: 20000, approvalAbove: 20000, canHire: true } });
  const M = g.corp.management; const Pe = g.corp.personnel;
  const open = Pe.openings().filter((o) => o.employer === 'farming' && P.ROLES[o.role].tier === 'staff');
  assert.ok(open.length > 0, 'there is a staff opening to fill');
  const people = () => Pe.holders('farming').length;
  const before = people();
  assert.equal(M.deciders('hire', 'farming')[0].id, gm.id);
  atDay(g, 2); M.dailyTick();
  assert.equal(people(), before, 'no budget, no hire');
  M.setBudget('farming', 'hiring', 20000);
  const cash = g.corp.cashOf('farming');
  atDay(g, 3); M.dailyTick();
  assert.equal(people(), before + 1);
  const hired = Pe.holders('farming').find((x) => x.id !== gm.id);
  assert.equal(P.ROLES[hired.role].tier, 'staff'); assert.equal(hired.salary, floorPay(hired));
  assert.equal(M.spentIn('farming', 'hiring'), hired.salary * (P.MARKET.fee + MGMT.hireBand), 'fee and a month of wage');
  assert.ok(cash - g.corp.cashOf('farming') >= hired.salary * P.MARKET.fee, 'the fee is paid now');
  assert.equal(M.hiresLeft('farming'), 1);
  for (let d = 4; d < 10; d++) { atDay(g, d); M.dailyTick(); }
  assert.ok(people() <= before + MGMT.hiresPerMonth, 'at most two a month');
  assert.match(M.peek().log.map((l) => l.text).join('|'), /is Farm Supervisor at East Plot Farms/);
});

test('hiring: a manager cannot hire a manager, or without the authority, or past their limit — and queues above the ask-above limit', () => {
  const g = farmWith(1719);
  const M = g.corp.management; const Pe = g.corp.personnel;
  M.setBudget('farming', 'hiring', 50000);
  const gm = staffWith(g, 'gm', 'farming', { authority: { canHire: false } });
  atDay(g, 2); M.dailyTick();
  assert.equal(Pe.holders('farming').length, 1, 'no authority to hire: only the manager themselves');
  gm.authority.canHire = true; gm.authority.spendLimit = 100; gm.authority.approvalAbove = 100; Pe.epoch++;
  atDay(g, 3); M.dailyTick();
  assert.equal(Pe.holders('farming').length, 1); assert.match(M.peek().log.at(-1).text, /spending limit/);
  gm.authority.spendLimit = 50000; gm.authority.approvalAbove = 200;
  atDay(g, 4); M.dailyTick();
  assert.equal(M.peek().pending.filter((q) => q.kind === 'hire').length, 1);
  assert.equal(Pe.holders('farming').length, 1, 'waiting');
  assert.ok(M.approve(M.peek().pending[0].id).ok);
  assert.equal(Pe.holders('farming').length, 2);
  assert.ok(Pe.holders('farming').every((x) => P.ROLES[x.role].tier !== 'executive'));
});

test('an HR director at the parent hires for a subsidiary; a general manager only for their own business', () => {
  const g = newGame(1720); g.player.money = 30e6; g.logistics.buyCompany();
  g.corp.group.form(); g.corp.contribute('parent', 3e6); assert.ok(g.corp.group.join('shipping', { opening: 700000 }).ok);
  const M = g.corp.management;
  const hr = staffWith(g, 'hrd', 'parent', { authority: { canHire: true } });
  assert.equal(M.deciders('hire', 'shipping')[0]?.id, hr.id);
  assert.equal(M.deciders('hire', 'parent').length, 0, 'not for the parent itself');
  const other = newGame(1721); other.player.money = 9e6; other.logistics.buyCompany();
  staffWith(other, 'gm', 'shipping', { authority: { canHire: true } });
  assert.equal(other.corp.management.deciders('hire', 'arms').length, 0);
});

test('budgets, requests and the log survive a save; the day\'s decisions are not made twice after loading', () => {
  const { g } = armsWorks(1722);
  staffWith(g, 'procurement_mgr', 'arms', { authority: { spendLimit: 5000, approvalAbove: 100 } });
  const M = g.corp.management; M.setBudget('arms', 'materials', 5000);
  atDay(g, 2); M.dailyTick();
  const snap = JSON.parse(JSON.stringify(g.corp.state.management));
  assert.equal(snap.pending.length, 1); assert.equal(snap.budgets.arms.materials, 5000);
  M.dailyTick();
  assert.deepEqual(JSON.parse(JSON.stringify(g.corp.state.management)), snap, 'a second run the same day changes nothing');
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.management)), snap, 'it is all in the save');
  g2.corp.management.dailyTick();
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.management)), snap, 'and loading does not make the day\'s decisions again');
});
