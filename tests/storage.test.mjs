// The delivery day pays a bonus instead of costing a penalty, standing orders build into unlimited off-map storage (never sold), a contract can be
// filled from storage by the player's choice (or a manager's request), and stored satellites wait to be launched (v0.91.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';
import { INCOME } from '../src/content/income.js';

INCOME.cost = 1; INCOME.revenue = 1; INCOME.aerospace = 1; INCOME.ownShippingFree = false; // (list prices, so the figures below are the contract's own)
const C = CONTENT.aerospace;
const DAY = 1440;
const firm = (seed) => {
  const g = newGame(seed); g.player.money = 40_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const A = g.aero; const co = A.roost;
  for (const c of A.contractsOf(co, 'active')) A.cancelContract('roost', c.id);
  return { g, A, co };
};
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const stored = (A, pid = 'ap_skylark', n = 1) => {
  for (let i = 0; i < n; i++) A.state.storage.push({ id: A.nextId('S'), product: pid, line: C.products[pid].line, cost: { materials: 1000, freight: 0, freightInt: 0 }, quality: 70, day: A.day, config: null });
};
const contract = (A, co, over = {}) => A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 2, unitPrice: 20000, days: 20, quality: 40, depositShare: 0.2, ...over });

test('delivering by the delivery day pays 25% of the price on top; delivering after it costs nothing', () => {
  const { g, A, co } = firm(9941);
  const c = contract(A, co, { qty: 2 });
  stored(A, 'ap_skylark', 2);
  const [u1, u2] = c.units.map((id) => A.state.units[id]);
  const cash0 = g.player.money;
  A.settle(co, u1); // on the day
  const early = g.player.money - cash0;
  assert.equal(early, 20000 + Math.round(20000 * C.aero.onTimeBonus) - Math.round(c.depositPaid / 2), 'the price, the bonus, less the deposit already paid');
  assert.equal(c.bonus, Math.round(20000 * C.aero.onTimeBonus));
  g.clock.total = c.due + 3 * DAY; // three days after the delivery day
  const cash1 = g.player.money;
  A.settle(co, u2);
  assert.equal(g.player.money - cash1, 20000 - Math.round(c.depositPaid / 2), 'late: the plain price, no penalty');
  assert.equal(c.penalties, 0);
});

test('standing orders build into storage and stop at the goal; nothing is sold', () => {
  const { g, A, co } = firm(9942);
  assert.ok(A.setBayAuto(co, co.bays[0].id, 'ap_skylark').ok);
  assert.ok(A.setStorageGoal(co, 'ap_skylark', 3).ok);
  run(g, 30);
  assert.equal(A.storedOf('ap_skylark').length, 3, 'three stored, and no more built');
  assert.ok(A.unitsOf(co).every((u) => u.purpose !== 'stock'), 'nothing more is on the floor for it');
  assert.equal(co.stats.stock || 0, 0, 'none of it was sold');
  assert.equal(A.stockPrice, undefined); assert.equal(A.sellStock, undefined);
  assert.ok(A.setStorageGoal(co, 'ap_skylark', 4).ok);
  run(g, 12);
  assert.equal(A.storedOf('ap_skylark').length, 4, 'a higher goal builds one more');
});

test('a contract can be filled from storage by choice: delivered at once, with the bonus, and the units that were queued are not built', () => {
  const { g, A, co } = firm(9943);
  stored(A, 'ap_skylark', 3);
  const c = contract(A, co, { qty: 2 });
  const offer = A.storageOffer(co, c);
  assert.equal(offer.n, 2);
  const r = A.fulfilFromStorage(co, c.id);
  assert.ok(r.ok, r.text);
  assert.equal(c.delivered, 2); assert.equal(c.status, 'complete');
  assert.equal(A.storedOf('ap_skylark').length, 1, 'one left in storage');
  assert.ok(c.bonus > 0, 'delivered the same day: the delivery day was met');
  assert.equal(A.fulfilFromStorage(co, c.id).ok, false, 'nothing left to fill');
  assert.ok(A.unitsOf(co).every((u) => u.contract !== c.id), 'none of its units is still being built');
  void g;
});

test('a contract that asks for a special addition has to be built new, and storage cannot be used for it', () => {
  const { A, co } = firm(9944);
  stored(A, 'ap_skylark', 2);
  const opt = Object.keys(C.options.ap_skylark || C.options.aircraft || {})[0];
  const plain = contract(A, co, { qty: 1 });
  assert.ok(A.storageOffer(co, plain));
  // a configured contract (whatever the product allows)
  const p = C.products.ap_skylark;
  const cfg = Object.keys(p.spec || {}).length ? null : null;
  void opt; void cfg;
  const configured = { ...plain, id: 'CX', config: { seats: 1 }, status: 'active', units: [], settled: {} };
  assert.deepEqual(A.storedFor(co, configured), []);
  assert.equal(A.storageOffer(co, configured), null);
});

test('stored aircraft are not used for a unit that is already in a bay', async () => {
  const { A, co } = firm(9945);
  stored(A, 'ap_skylark', 2);
  const c = contract(A, co, { qty: 2 });
  const [u1] = c.units.map((id) => A.state.units[id]);
  u1.bay = 'light_1'; u1.status = 'building'; u1.stage = C.pipelines ? 0 : 0;
  const { stagesOf } = await import('../src/aero/pipeline.js');
  u1.stage = stagesOf(C, C.products.ap_skylark).findIndex((x) => x.id === 'wings'); // past the first bay stage: real work has been done
  assert.equal(A.storageOffer(co, c).n, 1, 'only the unit nobody has started');
});

test('a manager asks you to use stored aircraft instead of doing it unasked, and you can say yes', () => {
  const g = newGame(9946); g.player.money = 80_000_000;
  assert.ok(g.aero.buyFirm().ok);
  g.corp.ensureWorld(); assert.ok(g.corp.group.form().ok); assert.ok(g.corp.group.join('aerospace').ok);
  assert.ok(g.corp.contribute('parent', 3_000_000).ok); assert.ok(g.corp.group.capitalise('aerospace', 600_000).ok);
  const A = g.aero; const co = A.roost;
  for (const c of A.contractsOf(co, 'active')) A.cancelContract('roost', c.id);
  const r = g.corp.personnel.hire('manager', 'aerospace'); assert.ok(r.ok); r.person.startDay = 1; g.corp.personnel.epoch++;
  stored(A, 'ap_skylark', 1);
  const c = contract(A, co, { qty: 1 });
  const M = g.corp.management;
  assert.deepEqual(M.candidates('stored', 'aerospace').map((x) => x.item), [c.id]);
  const d = M.decide('stored', 'aerospace', r.person);
  assert.equal(d.verdict, 'queue', 'asked, not done');
  assert.equal(c.delivered, 0);
  const q = M.peek().pending.find((x) => x.kind === 'stored');
  assert.ok(q);
  const ok = M.approve(q.id);
  assert.ok(ok.ok, ok.text);
  assert.equal(c.delivered, 1);
});

test('a satellite built for storage waits there; launching it sends it back to wait for a rocket, once you have what a launch needs', () => {
  const { A, co } = firm(9947);
  const pid = Object.keys(C.products).find((id) => C.products[id].line === 'satellite');
  stored(A, pid, 1);
  const rec = A.storedOf(pid)[0];
  const blocked = A.launchStored(co, rec.id);
  assert.equal(blocked.ok, false);
  assert.match(blocked.text, /rocket bay|launch pad|research/);
  // give it the pad, a rocket bay and the research
  co.pad = { unit: null, readyAt: 0, launches: 0 };
  co.bays.push({ id: 'rocket_1', type: 'rocket', unit: null, ready: 0, slot: null });
  for (const r of Object.keys(C.research)) if (!co.research.includes(r)) co.research.push(r);
  const ok = A.launchStored(co, rec.id);
  assert.ok(ok.ok, ok.text);
  assert.equal(A.storedOf(pid).length, 0);
  const u = A.unitsOf(co).find((x) => x.purpose === 'own' && x.product === pid);
  assert.ok(u, 'a unit of its own is on the floor');
  assert.equal(A.stageOf(u).wait, 'rocket', 'waiting for a rocket');
  assert.equal(u.cost.materials, 1000, 'it keeps what it cost');
});

test('a bay can be told to build satellites for storage (a clean room takes a satellite model)', () => {
  const { A, co } = firm(9948);
  co.bays.push({ id: 'clean_1', type: 'clean', unit: null, ready: 0, slot: null });
  for (const r of Object.keys(C.research)) if (!co.research.includes(r)) co.research.push(r);
  const opts = A.bayProducts(co, co.bays.find((b) => b.type === 'clean'));
  assert.ok(opts.length > 0 && opts.every((id) => C.products[id].line === 'satellite'));
  assert.ok(A.setBayAuto(co, 'clean_1', opts[0]).ok);
});

test('a secure hall can build a strategic missile product for storage: it stops in the secure store, is never put on a convoy or sold, and a contract cannot be filled from it (v0.100.0)', () => {
  const { g, A, co } = firm(9950);
  co.bays.push({ id: 'secure_1', type: 'secure', unit: null, ready: 0, slot: null });
  for (const r of Object.keys(C.research)) if (!co.research.includes(r)) co.research.push(r);
  const bay = co.bays.find((b) => b.type === 'secure');
  const opts = A.bayProducts(co, bay);
  assert.ok(opts.includes('ms_sentinel') && opts.includes('af_kestrel'), 'a secure hall builds fighters and strategic products');
  assert.ok(A.setBayAuto(co, 'secure_1', 'ms_sentinel').ok);
  assert.ok(A.setStorageGoal(co, 'ms_sentinel', 1).ok);
  g.player.money = 200_000_000;
  assert.ok(A.hire(co, 20, 'inspector').ok); assert.ok(A.hire(co, 20, 'engineer').ok); // (a strategic product is inspected hard)
  run(g, 70);
  assert.equal(A.storedOf('ms_sentinel').length, 1, 'one is in the secure store');
  assert.equal(A.storedOf('ms_sentinel')[0].line, 'missile');
  assert.equal(A.convoys().length, 0, 'it never went on a convoy');
  assert.ok(A.unitsOf(co).every((u) => u.purpose !== 'stock' || u.product !== 'ms_sentinel'), 'built once, then it stops');
  // a contract for the product is not filled from the store: it is delivered by its own convoy
  const ct = A.makeContract(co, { customer: 'cu_ostmark_air', product: 'ms_sentinel', qty: 1, unitPrice: C.products.ms_sentinel.price, days: 60, quality: 40, depositShare: 0.2 });
  assert.deepEqual(A.storedFor(co, ct), []); assert.equal(A.storageOffer(co, ct), null);
  assert.equal(A.deliverableFromStorage('ms_sentinel'), false); assert.equal(A.deliverableFromStorage('af_kestrel'), true); assert.equal(A.deliverableFromStorage('st_relay'), true, 'a satellite can still be delivered from storage, as before');
});
