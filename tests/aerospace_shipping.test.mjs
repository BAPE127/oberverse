// Aerospace materials in your own ships (v0.56.0): Ober & Sons Maritime carries Roost
// Aeroworks' foreign materials on the existing voyage system, for a small internal charge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const R = CONTENT.aerospace.internal.rates;
const tick = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total += 1; g.aero.minuteTick(); g.logistics.minuteTick(); } };
/** A game where you own both businesses; Billie's Skylarks are taken out of the way so only our orders move. */
function both(seed = 31, { shipping = true } = {}) {
  const g = newGame(seed);
  g.player.money = 3_000_000;
  if (shipping) assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  co.autoProcure = false;
  for (const c of g.aero.contractsOf(co, 'active')) g.aero.cancelContract('roost', c.id);
  return { g, A: g.aero, L: g.logistics, co };
}

test('only with a shipping line: internal shipping needs Ober & Sons; local suppliers truck; Meridian always uses a carrier', () => {
  const { A, co } = both(31, { shipping: false });
  assert.equal(A.canShipInternal(co), false);
  assert.equal(A.modeFor(co, 'sup_sund_alloys'), 'carrier');
  const r = A.order(co, 'sup_sund_alloys', 'alu', 4);
  assert.equal(r.po.mode, 'carrier');
  const x = both(32);
  assert.equal(x.A.modeFor(x.co, 'sup_sund_alloys'), 'internal');
  assert.equal(x.A.modeFor(x.co, 'sup_halver_metals'), 'truck');
  assert.equal(x.A.modeFor(x.A.meridian, 'sup_sund_alloys'), 'carrier');
});

test('a consignment sails in your own ship on the real voyage system, and the materials exist only once they arrive', () => {
  const { g, A, L, co } = both(33);
  const money0 = g.player.money;
  const r = A.order(co, 'sup_sund_alloys', 'alu', 12);
  assert.ok(r.ok, r.text);
  const po = r.po;
  assert.equal(po.mode, 'internal');
  assert.equal(money0 - g.player.money, po.goods, 'the materials themselves are paid for now (goods + duty), freight later');
  const job = A.job(po.job);
  assert.deepEqual(job.pos, [po.id]);
  assert.equal(job.origin, 'port_kingsfjord');
  let shipSeen = false;
  for (let i = 0; i < 6 * 1440 && job.status !== 'delivered'; i += 30) {
    tick(g, 30);
    assert.equal(co.inv.alu?.qty || 0, job.status === 'delivered' || po.status === 'received' ? 12 : 0, `not in stores while ${po.status}`);
    const v = job.vessel && L.vessel(job.vessel);
    if (v?.voyage?.job === job.id) { shipSeen = true; assert.equal(v.cargo.type, 'aero'); assert.equal(v.voyage.to, 'port_millroad'); }
  }
  assert.ok(shipSeen, 'it was at sea in one of your ships, on a voyage');
  assert.equal(job.status, 'delivered');
  assert.equal(co.inv.alu.qty, 12);
  const v = L.vessel(job.vessel);
  assert.ok(v.log.some((e) => e.from === 'port_kingsfjord' && e.to === 'port_millroad'), 'the voyage is in the ship\'s log');
  assert.equal(v.cargo, null, 'the hold is empty again');
});

test('the internal charge is 0–5% of what a carrier would charge; the materials are still paid in full', () => {
  const { g, A, co } = both(34);
  const r = A.order(co, 'sup_ostmark_turbine', 'engine_light', 3);
  const job = A.job(r.po.job);
  tick(g, 4 * 1440);
  assert.ok(['at sea', 'landed', 'delivered', 'lost'].includes(job.status), job.status); // charged when loaded
  assert.ok(job.charge > 0 && job.charge <= job.extFreight * 0.05 + 1, `${job.charge} of ${job.extFreight}`);
  assert.ok([R.established, R.standard, R.inefficient].includes(job.rate));
  assert.equal(r.po.goods, r.po.qty * A.supplierPrice(co, 'sup_ostmark_turbine', 'engine_light') + Math.round(r.po.qty * A.supplierPrice(co, 'sup_ostmark_turbine', 'engine_light') * CONTENT.aerospace.freight.duty), 'goods and duty at full price');
});

test('no free money: the internal charge cancels out across the group; the voyage\'s running costs are paid once, by the shipping line', () => {
  const { g, A, L, co } = both(35);
  const exp0 = L.state.ledger.expenses;
  const rev0 = L.state.ledger.revenue;
  const money0 = g.player.money;
  const costs0 = A.statement(co, null).costs;
  const r = A.order(co, 'sup_sund_alloys', 'alu', 15);
  const job = A.job(r.po.job);
  tick(g, 6 * 1440);
  assert.equal(job.status, 'delivered');
  // the shipping line's revenue from this is exactly the internal charge, and it's marked internal
  assert.equal(L.state.ledger.revenue - rev0, job.charge);
  assert.equal(L.state.ledger.internal, job.charge);
  // the line's expenses include the voyage legs once (plus its own daily upkeep)
  const voyages = L.state.ledger.expenses - exp0;
  assert.ok(voyages >= job.voyageCost, 'the voyage was paid for');
  // your wallet paid the goods, the voyage costs and the line's upkeep and the firm's running costs — never the charge on top
  const st = A.statement(co, null);
  const aeroRunning = st.costs - costs0 - (st.acc.cogs_freight_internal || 0);
  assert.equal(money0 - g.player.money, r.po.goods + (L.state.ledger.expenses - exp0) + aeroRunning);
  // group figures eliminate the charge
  const G = A.groupStatement(null);
  assert.equal(G.shipping.internal, job.charge);
  // buying the line is capital, not an operating cost of the group
  assert.equal(G.shipping.costs, L.state.ledger.expenses - CONTENT.logistics.rules.price);
});

test('a delay at sea moves the arrival, the purchase orders, and the production waiting on them', () => {
  const { g, A, L, co } = both(36);
  const t = { id: 'Tz', customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1 };
  const c = A.makeContract(co, { customer: t.customer, product: t.product, qty: 1, unitPrice: 26000, days: 20, quality: 40, depositShare: 0.2 });
  const u = A.state.units[c.units[0]];
  const r = A.order(co, 'sup_sund_alloys', 'alu', 3, { [u.id]: 3 });
  const job = A.job(r.po.job);
  for (let i = 0; i < 5 * 1440 && job.status !== 'at sea'; i += 15) tick(g, 15);
  assert.equal(job.status, 'at sea');
  const v = L.vessel(job.vessel);
  const eta0 = job.eta;
  v.voyage.events.push({ kind: 'delay', at: g.clock.total + 1, hours: 12, why: 'a gale', done: false });
  tick(g, 5);
  assert.equal(job.eta, eta0 + 12 * 60, 'the consignment is due 12 hours later');
  assert.equal(r.po.arrive, job.eta, 'and so is its purchase order');
  assert.deepEqual(A.affectedUnits(job).map((x) => x.id), [u.id]);
  assert.ok(A.state.reports.some((x) => /delayed 12 h/.test(x.text) && x.text.includes('Roost Skylark #1')), 'the unit waiting on it is named');
});

test('physical limits: a ship on a contract isn\'t taken; a consignment bigger than any hold waits (or goes by carrier)', () => {
  const { g, A, L, co } = both(37);
  const ship = L.vessels()[0];
  // occupy the only ship
  ship.contract = 'busy';
  const r = A.order(co, 'sup_sund_alloys', 'alu', 5);
  const job = A.job(r.po.job);
  tick(g, 60);
  assert.equal(job.vessel, null, 'the busy ship isn\'t taken');
  assert.ok(job.waitingWhy);
  // after a day, policy 'fallback' sends it by carrier at the market rate
  tick(g, 25 * 60);
  assert.equal(job.status, 'carrier');
  assert.equal(r.po.mode, 'carrier');
  const q = A.freightQuote(co, 'sup_sund_alloys', 'alu', 5);
  assert.equal(r.po.freight, q.freight + q.handling, 'the carrier charges the normal market rate');
  ship.contract = null;
  // too big for the 20-unit Gullwing: it can't be quoted for a ship
  const big = A.internalQuote(co, 'port_kingsfjord', 60);
  assert.equal(big.ok, false);
  assert.match(big.reasons[0], /holds 20 units/);
  // policy 'wait' never falls back
  co.internalPolicy = 'wait';
  ship.contract = 'busy';
  const r2 = A.order(co, 'sup_sund_alloys', 'alu', 4);
  tick(g, 3 * 1440);
  assert.equal(A.job(r2.po.job).status, 'waiting');
});

test('consignments, manifests and ships survive save and load, mid-voyage', () => {
  const { g, A, co } = both(38);
  const r = A.order(co, 'sup_sund_alloys', 'alu', 10);
  const job = A.job(r.po.job);
  for (let i = 0; i < 5 * 1440 && job.status !== 'at sea'; i += 15) tick(g, 15);
  assert.equal(job.status, 'at sea');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const j2 = g2.aero.job(job.id);
  assert.deepEqual(j2, JSON.parse(JSON.stringify(job)));
  const v2 = g2.logistics.vessel(job.vessel);
  assert.equal(v2.voyage.job, job.id);
  assert.equal(v2.cargo.type, 'aero');
  for (let i = 0; i < 4 * 1440 && j2.status !== 'delivered'; i += 30) tick(g2, 30);
  assert.equal(j2.status, 'delivered');
  assert.equal(g2.aero.roost.inv.alu.qty, 10, 'delivered once, after loading the save');
});

test('pirates: a cargo seized at sea is lost — no materials appear, the loss is booked, and nothing is paid twice', () => {
  const { g, A, L, co } = both(39);
  const r = A.order(co, 'sup_sund_alloys', 'alu', 6);
  const job = A.job(r.po.job);
  for (let i = 0; i < 5 * 1440 && job.status !== 'at sea'; i += 15) tick(g, 15);
  const v = L.vessel(job.vessel);
  L.loseCargo(v, 'hijacked');
  assert.equal(job.status, 'lost');
  assert.equal(r.po.status, 'lost');
  tick(g, 2 * 1440);
  assert.equal(co.inv.alu?.qty || 0, 0, 'nothing arrives');
  assert.ok(A.statement(co, null).acc.losses >= r.po.goods);
  assert.equal(A.ordersOf(co).some((p) => p.id === r.po.id), false, 'a lost order is no longer "on order"');
});
