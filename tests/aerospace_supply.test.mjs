// Supply orders in loads (v0.81.0): one order of any size, split into loads no bigger than your biggest hull; the
// internal charge to your own shipping line is capped at 500 obols for the whole order (not per load, not per
// consignment); every caller (the terminal, automatic purchasing, the managers) goes through the same splitter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const tick = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total += 1; g.aero.minuteTick(); g.logistics.minuteTick(); } };
function both(seed = 41, { shipping = true } = {}) {
  const g = newGame(seed);
  g.player.money = 3_000_000;
  if (shipping) assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  co.autoProcure = false;
  for (const c of g.aero.contractsOf(co, 'active')) g.aero.cancelContract('roost', c.id);
  return { g, A: g.aero, L: g.logistics, co };
}
const withCap = (cap, f) => { const I = CONTENT.aerospace.internal; const was = I.maxChargePerOrder; I.maxChargePerOrder = cap; try { return f(); } finally { I.maxChargePerOrder = was; } };

test('60 lots on a fleet whose biggest hull holds 20 is one order in three loads, none over what a ship holds', () => {
  const { g, A, co } = both();
  assert.equal(A.maxHold(), 20);
  const money0 = g.player.money;
  const q = A.quoteOrder(co, 'sup_sund_alloys', 'alu', 60);
  assert.equal(q.mode, 'internal'); assert.equal(q.loads, 3);
  assert.deepEqual(q.chunks.map((c) => c.qty), [20, 20, 20]);
  const r = A.order(co, 'sup_sund_alloys', 'alu', 60);
  assert.ok(r.ok, r.text);
  assert.equal(r.pos.length, 3);
  assert.ok(r.pos.every((po) => po.mode === 'internal' && po.volume <= 20));
  assert.equal(new Set(r.pos.map((po) => po.batch)).size, 1, 'the loads are one order');
  assert.equal(r.pos.reduce((a, po) => a + po.qty, 0), 60);
  assert.equal(money0 - g.player.money, q.payNow, 'goods and duty now; freight later, in your own ships');
  assert.equal(q.payNow, r.pos.reduce((a, po) => a + po.goods, 0));
});

test('the internal charge for one order, however many loads, is never more than the cap — and an uncapped one is exactly the old share of the carrier\'s freight', () => {
  withCap(150, () => {
    const { A, co } = both(42);
    co.internalPolicy = 'wait';
    const r = A.order(co, 'sup_sund_alloys', 'alu', 60);
    assert.ok(r.ok, r.text);
    const raw = r.pos.map((po) => Math.round(po.extFreight * CONTENT.aerospace.internal.rates.inefficient));
    assert.ok(raw.reduce((a, b) => a + b, 0) > 150, 'the cap has something to cut');
    const q = A.quoteOrder(co, 'sup_sund_alloys', 'alu', 60);
    assert.ok(q.own.charge <= 150, `quoted ${q.own.charge}`);
    assert.equal(q.own.charge, 150, 'and the quote says what will actually be charged');
  });
  const { A, co } = both(43);
  const r = A.order(co, 'sup_sund_alloys', 'alu', 12);
  const q = A.quoteOrder(co, 'sup_sund_alloys', 'alu', 12);
  assert.equal(q.own.charge, Math.round(r.po.extFreight * q.own.rate), 'no cap binding: the old charge');
});

test('the cap is per order: two separate orders each get their own', () => {
  withCap(100, () => {
    const { g, A, co } = both(44);
    co.internalPolicy = 'wait';
    const a = A.order(co, 'sup_sund_alloys', 'alu', 20); const b = A.order(co, 'sup_sund_alloys', 'alu', 20);
    assert.ok(a.ok && b.ok);
    assert.notEqual(a.po.batch, b.po.batch);
    for (let i = 0; i < 12 * 1440 && !['loading', 'at sea', 'landed', 'delivered'].includes(A.job(b.po.job)?.status); i += 15) tick(g, 15);
    const charged = (r) => r.pos.reduce((s, po) => s + po.freightInt, 0);
    const first = A.state.pos[a.po.id]; const second = A.state.pos[b.po.id];
    assert.ok(first.freightInt > 0 && second.freightInt > 0, 'both were charged');
    assert.ok(first.freightInt <= 100 && second.freightInt <= 100);
    assert.ok(first.freightInt + second.freightInt > 100, 'together more than one cap: they are two orders');
    void charged;
  });
});

test('all the loads of a big order reach stores in your own ships, the books reconcile, and the line is paid exactly what it earned', () => {
  const { g, A, L, co } = both(45);
  co.internalPolicy = 'wait';
  const earned0 = L.state.ledger.internal || 0;
  const r = A.order(co, 'sup_sund_alloys', 'alu', 60);
  assert.ok(r.ok, r.text);
  for (let i = 0; i < 40 * 1440 && A.jobs(co).length; i += 30) tick(g, 30);
  assert.equal(A.jobs(co).length, 0, 'every consignment closed');
  assert.equal(co.inv.alu.qty, 60, 'all sixty lots are in stores');
  assert.ok(r.pos.every((po) => po.status === 'received'), 'every load was received');
  const charged = r.pos.reduce((a, po) => a + po.freightInt, 0);
  assert.equal((L.state.ledger.internal || 0) - earned0, charged, 'the shipping line earned what the aerospace books paid');
  assert.ok(charged <= CONTENT.aerospace.internal.maxChargePerOrder);
  assert.ok(g.corp.reconciles());
});

test('without a shipping line an order goes by carrier in one piece, unsplit and uncapped', () => {
  const { A, co } = both(46, { shipping: false });
  const r = A.order(co, 'sup_sund_alloys', 'alu', 60);
  assert.ok(r.ok, r.text);
  assert.equal(r.po.mode, 'carrier'); assert.equal(r.pos?.length ?? 1, 1);
  assert.equal(r.po.freight, r.po.extFreight, 'the carrier is paid its own rate');
});

test('a local supplier trucks the whole order at once, however big', () => {
  const { A, co } = both(47);
  const r = A.order(co, 'sup_halver_metals', 'steel', 50);
  assert.ok(r.ok, r.text);
  assert.equal(r.po.mode, 'truck');
  assert.equal(A.quoteOrder(co, 'sup_halver_metals', 'steel', 50).loads, 1);
});

test('an order that cannot be placed places nothing: not enough stock, not enough money', () => {
  const { g, A, co } = both(48);
  const stock = A.state.suppliers.sup_sund_alloys.stock.alu;
  const n = Object.keys(A.state.pos).length; const money = g.player.money;
  assert.equal(A.order(co, 'sup_sund_alloys', 'alu', stock + 40).ok, false);
  g.player.money = 1000;
  assert.equal(A.order(co, 'sup_sund_alloys', 'alu', 60).ok, false);
  assert.equal(Object.keys(A.state.pos).length, n, 'no purchase order was made'); assert.equal(g.player.money, 1000);
  assert.equal(A.state.suppliers.sup_sund_alloys.stock.alu, stock, 'the supplier kept its stock'); void money;
});

test('save and load in the middle of a batch keeps the order together and what it was charged', () => {
  withCap(150, () => {
    const { g, A, co } = both(49);
    co.internalPolicy = 'wait';
    const r = A.order(co, 'sup_sund_alloys', 'alu', 60);
    for (let i = 0; i < 12 * 1440 && !r.pos.some((po) => A.state.pos[po.id].freightInt > 0); i += 15) tick(g, 15);
    const sm = new SaveManager(new MemoryStorage());
    assert.ok(sm.save('slot1', g).ok);
    const h = new Game(CONTENT, { seed: 1 });
    assert.ok(sm.load('slot1', h).ok);
    for (const po of r.pos) { const q = h.aero.state.pos[po.id]; assert.equal(q.batch, po.batch); assert.equal(q.freightInt, A.state.pos[po.id].freightInt); }
  });
});

test('every way of ordering — the terminal, automatic purchasing, the managers — goes through the splitter', () => {
  const calls = [];
  for (const f of readdirSync('src', { recursive: true })) if (String(f).endsWith('.js')) { const t = readFileSync(`src/${f}`, 'utf8'); if (/\.orderOne\(/.test(t)) calls.push(String(f)); }
  assert.deepEqual(calls, ['systems/aerospace.js'], 'orderOne is only called from the aerospace service itself');
  const t = readFileSync('src/systems/aerospace.js', 'utf8');
  assert.equal((t.match(/\.orderOne\(/g) || []).length, 3, 'a malformed order (to refuse it), a single order, and each load of a split one');
  assert.ok(/this\.order\(co, best\.id/.test(t), 'automatic purchasing uses order()');
  assert.ok(/aero\.order\(co, o\.supplier/.test(readFileSync('src/systems/management.js', 'utf8')), 'and so do the managers');
});

test('a lot bigger than your biggest hull cannot use your ships at all: it goes by carrier, and says so', () => {
  const { A, co } = both(50);
  const L = A.game.logistics;
  const v = L.vessels()[0];
  const real = L.stats.bind(L);
  L.stats = (x) => ({ ...real(x), capacity: 2 }); // a hull that holds two units
  try {
    assert.equal(A.lotsPerLoad('engine_large'), 0, 'one large engine takes three units');
    const q = A.quoteOrder(co, 'sup_ostmark_turbine', 'engine_large', 2);
    assert.equal(q.mode, 'carrier'); assert.equal(q.ownOk, false);
    assert.equal(A.quoteOrder(co, 'sup_ostmark_turbine', 'engine_light', 2).mode, 'internal', 'a lot that fits still can');
  } finally { L.stats = real; }
  void v;
});
