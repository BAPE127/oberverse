// Managers bidding and expanding (v0.64.0): a bid is the owner's minimum margin over cost; an expansion is a plan the owner
// approved — a template with limits and a fixed rule for where — bought through the business's own services.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, Game, CONTENT } from './helpers.mjs';
import * as P from '../src/content/personnel.js';
import { MGMT, PLAN_TYPES } from '../src/content/management.js';
import { makeCandidate, rolesFor, floorPay } from '../src/corp/people.js';
import { judge, bidPrice, rectGap, nextPlot, nextPort, firstFreeCell } from '../src/corp/management.js';
import { makeTender } from '../src/aero/tenders.js';
import { Rng } from '../src/core/rng.js';
import { runCommand } from '../src/game/debugCommands.js';

const AC = CONTENT.aerospace;
const atDay = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; };
const BIG = { spendLimit: 5e6, approvalAbove: 5e6 };

function staffWith(g, role, employer, authority = {}) {
  const pe = g.corp.personnel;
  pe.ensure();
  const p = pe.peek();
  let c = pe.candidates().find((x) => x.roles.includes(role));
  while (!c) { const k = makeCandidate(P, { salt: p.salt, n: p.nextCand++, day: g.clock.day }); if (rolesFor(P, k).includes(role)) { p.pool.push(k); c = { ...k, roles: rolesFor(P, k) }; } }
  const r = pe.offer(c.id, { role, employer, pay: floorPay(c) + 5 });
  assert.ok(r.ok, r.text);
  const x = r.person;
  x.startDay = g.clock.day;
  for (const k of Object.keys(x.skills)) x.skills[k] = 90;
  Object.assign(x.authority, authority);
  pe.epoch++;
  return x;
}

const base = { kind: 'bid', owner: false, atWork: true, allowed: true, canHire: false, canContract: true, canExpand: true, funded: true, cost: 1000, spendLimit: 10000, approvalAbove: 3000, cap: 5000, spent: 0, affordable: true, hiresLeft: 2 };

test('pure: the bid price, the plot, port and cell rules, and the two new permissions', () => {
  assert.deepEqual(bidPrice(10000, 20, 15000), { price: 12000, below: false });
  assert.deepEqual(bidPrice(10001, 20, 15000), { price: 12100, below: false }, 'up to 100');
  assert.deepEqual(bidPrice(10000, 20, 11000), { price: 11000, below: true }, 'at the ceiling, below the floor: for the owner');
  assert.equal(bidPrice(10000, 20, 9000).price, null, 'never below cost');
  assert.equal(rectGap({ x: 0, y: 0, w: 10, h: 10 }, { x: 13, y: 0, w: 5, h: 5 }), 3);
  assert.equal(rectGap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 5, h: 5 }), 0);
  const plots = [{ id: 'a', price: 6000, rect: { x: 0, y: 0, w: 10, h: 10 } }, { id: 'b', price: 5000, rect: { x: 13, y: 0, w: 10, h: 10 } }, { id: 'c', price: 1000, rect: { x: 100, y: 100, w: 5, h: 5 } }];
  assert.equal(nextPlot(plots, ['a'], 4).id, 'b', 'next to an owned plot, not the cheapest anywhere');
  assert.equal(nextPlot(plots, [], 4), null, 'a first plot is never bought by a manager');
  assert.equal(nextPlot(plots, ['a', 'b'], 4), null);
  assert.equal(nextPort([{ id: 'x', price: 9000 }, { id: 'a', price: 9000 }, { id: 'z', price: 5000 }], ['z']).id, 'a', 'cheapest unowned, ties by id');
  const floor = (x, y) => x >= 0 && y >= 0 && x < 10 && y < 6;
  assert.deepEqual(firstFreeCell(2, 2, 10, 6, floor, () => false), { x: 0, y: 0 });
  assert.equal(firstFreeCell(2, 2, 10, 6, floor, (x, y) => x === 0 && y === 0).x, 2, 'a ring of clear cells: the next place along');
  assert.equal(firstFreeCell(2, 2, 4, 2, floor, (x, y) => x === 2 && y === 0), null, 'no place');
  const v = (patch) => judge({ ...base, ...patch });
  assert.match(v({ canContract: false }).reason, /sign contracts/);
  assert.match(v({ kind: 'expand', canExpand: false }).reason, /expand the business/);
  assert.equal(v({ kind: 'expand' }).verdict, 'execute');
  const ask = v({ ask: 'below the margin' });
  assert.equal(ask.verdict, 'queue'); assert.equal(ask.reason, 'below the margin');
  assert.equal(v({ ask: 'below the margin', owner: true }).verdict, 'execute', 'the owner lifts it');
  assert.equal(v({ ask: 'x', cap: 0 }).verdict, 'refuse', 'a missing budget still refuses first');
});

function aeroTender(g, over = {}) {
  const t = makeTender(AC, new Rng(3), { id: over.id || 'Tm', customerId: 'cu_lariat_coop', state: { budget: 1e9 }, day: g.clock.day });
  Object.assign(t, { product: 'ap_skylark', qty: 2, ceiling: 60000, days: 20, quality: 30, closes: g.clock.day + 6, ...over });
  g.aero.state.tenders.push(t);
  return t;
}
function aeroFirm(seed) {
  const g = newGame(seed); g.player.money = 40e6;
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('aerospace', 6e6).ok);
  g.aero.roost.autoProcure = false;
  g.aero.state.tenders = []; // a clear board: the test's own tenders only
  for (const c of g.aero.contractsOf(g.aero.roost, 'active')) g.aero.cancelContract('roost', c.id);
  return g;
}

test('bids: at the owner\'s minimum margin over cost, only with a margin, a contracts budget, a person who may sign — and nothing is drawn', () => {
  const g = aeroFirm(1801);
  const t = aeroTender(g);
  const A = g.aero; const M = g.corp.management;
  staffWith(g, 'sales_mgr', 'aerospace', BIG);
  M.setBudget('aerospace', 'contracts', 5e6);
  const cash = g.corp.cashOf('aerospace');
  atDay(g, 2); M.dailyTick();
  assert.equal(t.bids.filter((b) => b.company === 'roost').length, 0, 'no margin, no bid');
  assert.match(M.status('aerospace', 'bid').notes.join(' '), /No minimum margin/);
  assert.ok(M.setMargin('aerospace', 25).ok);
  const rng = A.rng.state; const stock = JSON.stringify(A.state.suppliers);
  const plan = M.planBids();
  assert.equal(A.rng.state, rng); assert.equal(JSON.stringify(A.state.suppliers), stock, 'planning moves nothing');
  assert.equal(plan.length, 1);
  const q0 = A.bidQuote('roost', 'Tm');
  assert.equal(plan[0].price, Math.ceil((q0.cost * 1.25) / 100) * 100, 'cost plus the margin, up to 100');
  assert.equal(plan[0].ask, null);
  atDay(g, 3); M.dailyTick();
  const bid = t.bids.find((b) => b.company === 'roost');
  assert.ok(bid, 'bid placed through the aerospace service');
  assert.equal(bid.unitPrice, plan[0].price);
  assert.equal(g.corp.cashOf('aerospace'), cash, 'a bid costs no money');
  assert.equal(M.spentIn('aerospace', 'contracts'), plan[0].cost, 'the work it would commit counts against the budget');
  assert.equal(M.planBids().length, 0, 'bid once');
  assert.match(M.peek().log.at(-1).text, /Bid placed/);
});

test('bids: a ceiling below the margin queues for the owner and is placed at the ceiling when approved; below cost it is never bid', () => {
  const g = aeroFirm(1802);
  const A = g.aero; const M = g.corp.management;
  staffWith(g, 'sales_mgr', 'aerospace', BIG);
  M.setBudget('aerospace', 'contracts', 5e6); M.setMargin('aerospace', 60);
  const t = aeroTender(g, { id: 'Tlow', ceiling: 1e6 });
  const q0 = A.bidQuote('roost', 'Tlow');
  t.ceiling = Math.round(q0.cost * 1.1);
  atDay(g, 2); M.dailyTick();
  assert.equal(t.bids.some((b) => b.company === 'roost'), false);
  const req = M.peek().pending[0];
  assert.ok(req && req.kind === 'bid' && req.item === 'Tlow'); assert.match(req.why, /below your minimum margin of 60%/);
  atDay(g, 3); M.dailyTick();
  assert.equal(M.peek().pending.length, 1, 'once');
  const r = M.approve(req.id);
  assert.ok(r.ok, r.text);
  assert.equal(t.bids.find((b) => b.company === 'roost').unitPrice, t.ceiling);
  const lost = aeroTender(g, { id: 'Tloss', ceiling: Math.round(q0.cost * 0.7) });
  atDay(g, 4); M.dailyTick();
  assert.equal(lost.bids.some((b) => b.company === 'roost'), false);
  assert.ok(!M.peek().pending.some((q) => q.item === 'Tloss'), 'it would lose money: not even asked');
});

test('bids: who may sign, how many at once, and the budget', () => {
  const g = aeroFirm(1803);
  const A = g.aero; const M = g.corp.management;
  const x = staffWith(g, 'sales_mgr', 'aerospace', { ...BIG, canContract: false });
  M.setBudget('aerospace', 'contracts', 5e6); M.setMargin('aerospace', 20);
  const t = aeroTender(g);
  atDay(g, 2); M.dailyTick();
  assert.equal(t.bids.some((b) => b.company === 'roost'), false);
  assert.equal(M.deciders('bid', 'aerospace').length, 0, 'not authorised to sign');
  x.authority.canContract = true; g.corp.personnel.epoch++;
  M.setBudget('aerospace', 'contracts', 10);
  atDay(g, 3); M.dailyTick();
  assert.equal(t.bids.some((b) => b.company === 'roost'), false);
  assert.match(M.peek().log.at(-1).text, /monthly budget/);
  M.setBudget('aerospace', 'contracts', 5e6);
  for (let i = 0; i < MGMT.maxContracts; i++) { const q = aeroTender(g, { id: `Tf${i}` }); q.bids.push({ company: 'roost', unitPrice: q.ceiling, days: q.days, at: 0, valid: true }); }
  const extra = aeroTender(g, { id: 'Textra' });
  atDay(g, 4); M.dailyTick();
  assert.equal(extra.bids.some((b) => b.company === 'roost'), false, 'enough open bids already');
});

function farmOwner(seed) {
  const g = newGame(seed); g.player.money = 9e6;
  assert.ok(g.farm.buy('plot_east_1').ok);
  assert.ok(g.corp.contribute('farming', 300000).ok);
  return g;
}

test('plan validation: bounded, owned, and only what the business can have', () => {
  const g = farmOwner(1811); const M = g.corp.management;
  assert.match(M.addPlan({ type: 'nonsense' }).text, /No such kind/);
  assert.match(M.addPlan({ type: 'port', limit: 1, maxEach: 9000 }).text, /do not own/);
  assert.match(M.addPlan({ type: 'farm_plot', limit: 0, maxEach: 9000 }).text, /between 1 and 10/);
  assert.match(M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 0 }).text, /most to pay/);
  assert.match(M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 9000, reserve: -1 }).text, /cash to leave/);
  assert.ok(M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 9000, reserve: 10000 }).ok);
  for (let i = 0; i < 11; i++) M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 9000 });
  assert.match(M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 9000 }).text, /Twelve/);
  assert.ok(M.removePlan(M.peek().plans[0].id).ok);
  assert.ok(!M.removePlan('nope').ok);
});

test('farm plot: the cheapest plot next to yours, paid from the farm\'s account within the limit, the reserve and the budget, by someone who may expand', () => {
  const g = farmOwner(1812); const M = g.corp.management; const F = g.farm;
  const x = staffWith(g, 'farm_mgr', 'farming', { ...BIG, canExpand: false });
  assert.ok(M.addPlan({ type: 'farm_plot', limit: 2, maxEach: 7000, reserve: 0 }).ok);
  M.setBudget('farming', 'expansion', 100000);
  const wallet = g.player.money; const cash = g.corp.cashOf('farming');
  atDay(g, 2); M.dailyTick();
  assert.equal(F.owned().length, 1, 'not authorised to expand');
  assert.match(M.status('farming', 'expand').notes.join(' '), /permission to expand/);
  x.authority.canExpand = true; g.corp.personnel.epoch++;
  atDay(g, 3); M.dailyTick();
  assert.deepEqual(F.owned().sort(), ['plot_east_1', 'plot_east_2'], 'the 6,000 plot, not the 11,000 one');
  assert.equal(g.player.money, wallet); assert.equal(cash - g.corp.cashOf('farming'), 6000);
  assert.equal(M.spentIn('farming', 'expansion'), 6000);
  assert.equal(M.peek().plans[0].bought, 1);
  atDay(g, 4); M.dailyTick();
  assert.equal(F.owned().length, 2, 'the third is over the 7,000 limit');
  assert.match(M.evalPlan(M.peek().plans[0]).why, /over the 7,000 limit/);
  M.peek().plans[0].maxEach = 20000; M.peek().plans[0].reserve = g.corp.cashOf('farming'); 
  atDay(g, 5); M.dailyTick();
  assert.equal(F.owned().length, 2, 'it would leave less than the reserve');
  assert.match(M.peek().log.at(-1).text, /cannot cover/);
  M.peek().plans[0].reserve = 0;
  atDay(g, 6); M.dailyTick();
  assert.equal(F.owned().length, 3); assert.match(M.evalPlan(M.peek().plans[0]).why, /Done/);
});

test('farm plot: with no plot of your own, a manager never buys the first', () => {
  const g = newGame(1813); g.player.money = 9e6; g.farm.buy('plot_east_1'); g.corp.contribute('farming', 100000);
  const M = g.corp.management;
  M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 20000 });
  g.farm.state.plots.plot_east_1.owned = false;
  assert.match(M.evalPlan(M.peek().plans[0]).why, /first is yours to buy/);
});

test('port: the cheapest port for sale, from the shipping account; port limit and price limit hold', () => {
  const g = newGame(1814); g.player.money = 9e6; g.logistics.buyCompany(); g.corp.contribute('shipping', 400000);
  const M = g.corp.management; const L = g.logistics;
  staffWith(g, 'logistics_mgr', 'shipping', { ...BIG, canExpand: true });
  M.addPlan({ type: 'port', limit: 1, maxEach: 8000 });
  M.setBudget('shipping', 'expansion', 500000);
  const had = L.ownedPorts().length; const cash = g.corp.cashOf('shipping');
  atDay(g, 2); M.dailyTick();
  assert.equal(L.ownedPorts().length, had, 'every port left costs more than 8,000 (a harbour is 9,000)');
  assert.match(M.evalPlan(M.peek().plans[0]).why, /limit/);
  M.peek().plans[0].maxEach = 9000;
  atDay(g, 3); M.dailyTick();
  assert.equal(L.ownedPorts().length, had + 1);
  assert.equal(cash - g.corp.cashOf('shipping'), 9000);
  assert.match(M.evalPlan(M.peek().plans[0]).why, /Done/);
});

test('aerospace: a bay in a hall you have built, and a facility; never a hall; once', () => {
  const g = aeroFirm(1815); const A = g.aero; const co = A.roost; const M = g.corp.management;
  staffWith(g, 'aero_ops_mgr', 'aerospace', { ...BIG, canExpand: true });
  M.setBudget('aerospace', 'expansion', 5e6);
  M.addPlan({ type: 'aero_facility', limit: 1, maxEach: 100000, facility: 'inspection' });
  const cash = g.corp.cashOf('aerospace');
  atDay(g, 2); M.dailyTick();
  assert.ok(co.building?.inspection, 'under construction');
  assert.equal(cash - g.corp.cashOf('aerospace'), 90000);
  assert.match(M.evalPlan(M.peek().plans[0]).why, /Done|Already/);
  const bays = co.bays.length;
  M.addPlan({ type: 'aero_bay', limit: 1, maxEach: 70000, bay: 'light' });
  const free = Boolean(A.freeSlot(co, 'light'));
  atDay(g, 3); M.dailyTick();
  assert.equal(co.bays.length, free ? bays + 1 : bays);
  if (!free) assert.match(M.evalPlan(M.peek().plans[1]).why, /No free slot/);
  assert.equal(co.halls && Object.values(A.cfg.halls).filter((H) => A.hallState(co, Object.keys(A.cfg.halls).find((k) => A.cfg.halls[k] === H)).state === 'building').length, 0, 'no hall was started');
});

function armsWorks(seed) {
  const g = newGame(seed); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry');
  assert.ok(g.corp.contribute('arms', 500000).ok);
  return g;
}

test('arms station: bought through the works\'s own order, placed from the dock at the first free cell, one at a time, power permitting', () => {
  const g = armsWorks(1816); const A = g.arms; const M = g.corp.management;
  staffWith(g, 'manufacturing_mgr', 'arms', { ...BIG, canExpand: true });
  const plan = M.addPlan({ type: 'arms_station', limit: 2, maxEach: 20000, works: 'aw1', item: 'item_st_lathe', recipe: 'barrel' }).plan;
  M.setBudget('arms', 'expansion', 100000);
  const price = A.partPrice('item_st_lathe');
  const cash = g.corp.cashOf('arms'); const wallet = g.player.money;
  atDay(g, 2); M.dailyTick();
  assert.equal(plan.bought, 1); assert.equal(cash - g.corp.cashOf('arms'), price); assert.equal(g.player.money, wallet);
  assert.equal(A.cells('aw1').machines.length, 0, 'ordered, not yet here');
  assert.match(M.evalPlan(plan).why, /Waiting/);
  atDay(g, 3); M.dailyTick();
  assert.equal(plan.bought, 1, 'one at a time');
  // the delivery arrives on the dock
  for (let i = 0; i < 90; i++) { g.clock.total += 1; A.minuteTick(); }
  const dock = g.world.containers[A.def('aw1').inBay];

  assert.equal(dock.items.item_st_lathe, 1);
  atDay(g, 4); M.dailyTick();
  assert.equal(plan.placed, 1);
  assert.equal(dock.items.item_st_lathe || 0, 0, 'taken from the dock, not from your pockets');
  const e = A.cells('aw1').machines[0];
  assert.ok(e && e.kind === 'lathe'); assert.equal(e.setting, 'barrel', 'the recipe the plan names');
  assert.match(M.peek().log.find((l) => /placed at/.test(l.text)).text, /needs a worker/);
  assert.equal(A.workerAt(e), null, 'no worker is assigned: that stays yours');
  // a second one on the next buy, in a different place
  assert.equal(plan.bought, 2, 'bought again on the same day, once the first was in');
});

test('arms station: no free place, no power, or the wrong works — logged, nothing lost', () => {
  const g = armsWorks(1817); const A = g.arms; const M = g.corp.management;
  staffWith(g, 'manufacturing_mgr', 'arms', { ...BIG, canExpand: true });
  const plan = M.addPlan({ type: 'arms_station', limit: 5, maxEach: 20000, works: 'aw1', item: 'item_st_lathe' }).plan;
  assert.match(M.addPlan({ type: 'arms_station', limit: 1, maxEach: 20000, works: 'aw1', item: 'item_pistol' }).text, /not an arms station/);
  assert.match(M.addPlan({ type: 'arms_station', limit: 1, maxEach: 20000, works: 'aw2', item: 'item_st_lathe' }).text, /do not own/);
  assert.match(M.addPlan({ type: 'arms_station', limit: 1, maxEach: 20000, works: 'aw1', item: 'item_st_lathe', recipe: 'pistol' }).text, /not made at that station/);
  M.setBudget('arms', 'expansion', 500000);
  // power: fill it
  const pw = A.power('aw1');
  const fill = [];
  runCommand(g, 'stations');
  for (let i = 0; i < pw.capacity; i++) { const r = A.place('aw1', 'item_st_lathe', 4 + (i % 8) * 3, 3 + Math.floor(i / 8) * 3); if (r.ok) fill.push(r.entity); }
  assert.ok(fill.length >= 1);
  if (A.power('aw1').machines >= A.power('aw1').capacity) { atDay(g, 2); M.dailyTick(); assert.equal(plan.bought, 0); assert.match(M.evalPlan(plan).why, /no power/); }
  // a bought station with the floor covered: log once
  plan.bought = 1; plan.placed = 0;
  g.world.containers[A.def('aw1').inBay].items.item_st_lathe = 1;
  const map = g.maps.get(A.def('aw1').map);
  const blocked = map.props.length;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.grid[y][x] === 'g' && !map.props.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)) map.props.push({ id: `blk_${x}_${y}`, x, y, w: 1, h: 1, type: 'crate' });
  assert.ok(map.props.length > blocked);
  atDay(g, 3); M.dailyTick(); atDay(g, 4); M.dailyTick();
  assert.equal(plan.placed, 0);
  assert.equal(M.peek().log.filter((l) => /no free place/.test(l.text)).length, 1, 'said once');
  assert.equal(g.world.containers[A.def('aw1').inBay].items.item_st_lathe, 1, 'still on the dock');
});

test('plans and margins survive a save; nothing is bought twice after loading; a v0.63 save gains them when used', () => {
  const g = farmOwner(1818); const M = g.corp.management;
  staffWith(g, 'farm_mgr', 'farming', { ...BIG, canExpand: true });
  M.addPlan({ type: 'farm_plot', limit: 1, maxEach: 7000 }); M.setBudget('farming', 'expansion', 100000);
  atDay(g, 2); M.dailyTick();
  const snap = JSON.parse(JSON.stringify(g.corp.state.management));
  assert.equal(snap.plans[0].bought, 1);
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.management)), snap);
  g2.corp.management.dailyTick();
  assert.equal(g2.corp.state.management.plans[0].bought, 1);
  delete g2.corp.state.management.plans; delete g2.corp.state.management.margins; delete g2.corp.state.management.nextPlan;
  assert.ok(g2.corp.management.setMargin('aerospace', 10).ok === false, 'no firm');
  assert.ok(g2.corp.management.addPlan({ type: 'farm_plot', limit: 1, maxEach: 9000 }).ok, 'a v0.63 save has no plans list: it is made on use');
});

test('with nothing authorised the new decisions do nothing: no plans, no margin, no bids, no purchases', () => {
  const g = aeroFirm(1819); const M = g.corp.management;
  staffWith(g, 'gm', 'aerospace', { ...BIG, canExpand: true, canContract: true });
  M.setBudget('aerospace', 'contracts', 5e6); M.setBudget('aerospace', 'expansion', 5e6);
  aeroTender(g);
  const cash = g.corp.cashOf('aerospace'); const bays = g.aero.roost.bays.length;
  for (let d = 2; d < 8; d++) { atDay(g, d); M.dailyTick(); }
  assert.equal(g.corp.cashOf('aerospace'), cash);
  assert.equal(g.aero.roost.bays.length, bays);
  assert.equal(g.aero.openTenders().find((t) => t.id === 'Tm').bids.some((b) => b.company === 'roost'), false);
  assert.deepEqual(Object.keys(PLAN_TYPES).sort(), ['aero_bay', 'aero_facility', 'arms_station', 'farm_plot', 'port']);
});
