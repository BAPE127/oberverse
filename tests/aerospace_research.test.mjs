// The research tree (v0.59.0): the tree's shape and layout, what projects say they do and what they open,
// the queue, and the new operations projects doing what they claim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';
import { BRANCHES, depthOf, layout, effectLines, unlocksOf } from '../src/aero/research.js';
import { serviceBonus, priceBonus, hazardResearch, opsMult } from '../src/aero/fleet.js';

const C = CONTENT.aerospace;
const R = C.research;
const DAY = 1440;
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const own = (seed = 91) => { const g = newGame(seed); g.player.money = 50_000_000; assert.ok(g.aero.buyFirm().ok); return { g, A: g.aero, co: g.aero.roost }; };

test('the tree is a tree: every need exists, nothing is its own ancestor, every project sits in a branch', () => {
  const branches = new Set(BRANCHES.map(([id]) => id));
  for (const [id, r] of Object.entries(R)) {
    assert.ok(branches.has(r.branch), `${id}: branch ${r.branch}`);
    for (const q of r.requires || []) assert.ok(R[q], `${id} needs ${q}`);
    assert.ok(Number.isFinite(depthOf(R, id)), id);
    assert.ok(r.text && r.name && r.cost >= 0 && r.days >= 0);
  }
  const memo = {};
  for (const [id, r] of Object.entries(R)) for (const q of r.requires || []) assert.ok(depthOf(R, id, memo) > depthOf(R, q, memo), `${id} comes after ${q}`);
  for (const [pid, p] of Object.entries(C.products)) if (p.tech) assert.ok(R[p.tech], `${pid} needs a real project`);
});

test('the layout puts every project somewhere of its own, to the right of what it needs', () => {
  const L = layout(R);
  const ids = Object.keys(R);
  assert.equal(Object.keys(L.nodes).length, ids.length);
  const { w, h } = L.size;
  for (const id of ids) {
    const n = L.nodes[id];
    assert.ok(n.x >= 0 && n.y >= 0 && n.x + w <= L.width && n.y + h <= L.height, `${id} inside the picture`);
    for (const q of R[id].requires || []) assert.ok(L.nodes[q].x + w < n.x, `${id} is right of ${q}`);
  }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = L.nodes[ids[i]]; const b = L.nodes[ids[j]];
    const apart = a.x + w <= b.x || b.x + w <= a.x || a.y + h <= b.y || b.y + h <= a.y;
    assert.ok(apart, `${ids[i]} and ${ids[j]} overlap`);
  }
});

test('what a project does and what it opens are said in words', () => {
  assert.ok(effectLines(C, R.radiation_hardening.effect).some((t) => /30% less likely to be lost/.test(t)));
  assert.ok(effectLines(C, R.ground_network.effect).some((t) => /6%/.test(t)) && effectLines(C, R.ground_network.effect).some((t) => /10%.*running/.test(t)));
  assert.ok(effectLines(C, R.data_products.effect).some((t) => /weather/.test(t) && /15%/.test(t)));
  assert.ok(effectLines(C, R.comms_constellations.effect).some((t) => /comms/.test(t) && /10%/.test(t)));
  assert.deepEqual(effectLines(C, undefined), []);
  const u = unlocksOf(C, 'pressurised_cabins');
  assert.ok(u.products.includes('ap_tern') || u.products.length > 0);
  assert.ok(u.next.includes('widebody'));
  for (const [id] of Object.entries(R)) { const x = unlocksOf(C, id); assert.ok(Array.isArray(x.products) && Array.isArray(x.options) && Array.isArray(x.next)); }
});

test('a project that is researched takes days from a laboratory and engineers; a laboratory saves a quarter', () => {
  const { A, co } = own();
  const d = A.researchDays(co, 'turboprops');
  assert.equal(d, Math.max(1, Math.round((R.turboprops.days * A.researchFactor(co)) / A.engineerRate(co))));
  co.hallsOpened = {};
  const before = A.researchDays(co, 'widebody');
  assert.ok(before >= R.widebody.days * 0.95);
});

test('the queue: three deep, in order, with what a project needs done, under way or ahead of it', () => {
  const { A, co } = own(92);
  co.research = ['light_airframes', 'satellite_bus'];
  assert.ok(A.startResearch(co, 'turboprops').ok);
  assert.equal(A.queueResearch(co, 'turboprops').ok, false, 'already under way');
  assert.equal(A.queueResearch(co, 'widebody').ok, false, 'needs what is not queued');
  assert.ok(A.queueResearch(co, 'jet_engines').ok);
  assert.ok(A.queueResearch(co, 'pressurised_cabins').ok, 'needs jet integration, which is ahead of it');
  assert.equal(A.queueResearch(co, 'pressurised_cabins').ok, false, 'once');
  assert.ok(A.queueResearch(co, 'ground_network').ok);
  assert.equal(A.queueResearch(co, 'radiation_hardening').ok, false, 'three is the most');
  assert.equal(A.queueResearch(co, 'light_airframes').ok, false, 'done already');
  assert.equal(A.queueResearch(co, 'nonsense').ok, false);
  assert.deepEqual(co.queue, ['jet_engines', 'pressurised_cabins', 'ground_network']);
  // taking a project out takes what depended on it too
  assert.ok(A.unqueueResearch(co, 'jet_engines').ok);
  assert.deepEqual(co.queue, ['ground_network']);
  assert.equal(A.unqueueResearch(co, 'jet_engines').ok, false);
});

test('the lab never stands idle: the next project starts when the last one finishes, paid for then', () => {
  const { g, A, co } = own(93);
  co.research = ['light_airframes', 'satellite_bus'];
  assert.ok(A.startResearch(co, 'turboprops').ok);
  A.queueResearch(co, 'jet_engines');
  A.queueResearch(co, 'ground_network');
  const order = [];
  for (let d = 0; d < 40 && co.queue.length + (co.researching ? 1 : 0) > 0; d++) { run(g, 1); if (co.researching && order.at(-1) !== co.researching.id) order.push(co.researching.id); }
  assert.deepEqual(order, ['turboprops', 'jet_engines', 'ground_network']);
  for (const id of ['turboprops', 'jet_engines', 'ground_network']) assert.ok(co.research.includes(id), id);
  assert.equal(co.queue.length, 0);
});

test('a queued project waits for the money, says so once, and starts when it is there', () => {
  const { g, A, co } = own(94);
  co.research = ['light_airframes', 'satellite_bus'];
  A.startResearch(co, 'turboprops');
  A.queueResearch(co, 'jet_engines');
  g.player.money = 1000;
  run(g, 4);
  assert.ok(!co.research.includes('jet_engines') && co.queue[0] === 'jet_engines', 'waiting');
  assert.equal(A.state.reports.filter((r) => /can't afford it yet/.test(r.text)).length, 1, 'said once');
  g.player.money = 10_000_000;
  run(g, 8);
  assert.ok(co.research.includes('jet_engines') || co.researching?.id === 'jet_engines');
});

test('the operations projects do what they say', () => {
  const { A, co } = own(95);
  co.research = ['light_airframes'];
  assert.equal(serviceBonus(A, co, 'comms'), 0);
  assert.equal(hazardResearch(A, co), 0);
  assert.equal(opsMult(A, co), 1);
  co.research = ['light_airframes', 'satellite_bus', 'ground_network', 'comms_constellations', 'radiation_hardening', 'autonomous_ops', 'earth_observation', 'data_products', 'navigation_payloads', 'precision_timing'];
  assert.ok(Math.abs(serviceBonus(A, co, 'comms') - 0.16) < 1e-9, 'ground network +6% on everything, constellations +10% on comms');
  assert.ok(Math.abs(serviceBonus(A, co, 'nav') - 0.06) < 1e-9);
  assert.ok(Math.abs(priceBonus(A, co, 'weather') - 0.15) < 1e-9 && Math.abs(priceBonus(A, co, 'earthobs') - 0.15) < 1e-9 && Math.abs(priceBonus(A, co, 'nav') - 0.15) < 1e-9);
  assert.equal(priceBonus(A, co, 'comms'), 0);
  assert.ok(Math.abs(hazardResearch(A, co) + 0.3) < 1e-9);
  assert.ok(Math.abs(opsMult(A, co) - 0.6) < 1e-9, 'ground network −10% and autonomous operations −30%');
});

test('research changes what a network takes, and what it costs to run', () => {
  const { g, A, co } = own(96);
  co.research = ['light_airframes', 'satellite_bus'];
  for (let i = 0; i < 4; i++) A.state.satellites[`R${i}`] = { id: `R${i}`, name: `R-${i}`, product: 'st_relay', role: 'comms', service: { comms: 40 }, owner: co.id, manufacturer: co.id, own: true, status: 'operational', capability: 1, lifeDays: 60, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, price: 1, opex: 600, value: 100000, book: 100000, hardened: false, config: {} };
  const plain = A.networkReport(co).find((x) => x.role === 'comms');
  co.research.push('ground_network', 'comms_constellations');
  const better = A.networkReport(co).find((x) => x.role === 'comms');
  assert.ok(better.net.capacity > plain.net.capacity * 1.15, 'sixteen per cent more');
  assert.ok(better.sold.revenue > plain.sold.revenue);
});
