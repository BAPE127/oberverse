// Aerospace (v0.55.0): Starling Flats, Meridian Aerospace (MRDN), Roost Aeroworks, the
// tender board, the five-aircraft rule, production pipelines, materials, books and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { quantityError, unitCost } from '../src/aero/catalog.js';
import { stagesOf, stageMaterials } from '../src/aero/pipeline.js';
import { makeTender, tenderQty } from '../src/aero/tenders.js';
import { Rng } from '../src/core/rng.js';

const AC = CONTENT.aerospace;
/** Advance the aerospace simulation only (the rest of the world doesn't need to walk about). */
const tick = (g, minutes) => { for (let i = 0; i < minutes; i++) { g.clock.total += 1; g.aero.minuteTick(); } };
const rich = (seed = 5) => { const g = newGame(seed); g.player.money = 5_000_000; return g; };

test('Meridian exists on a new game: an order book on the floor, materials for it in stores, MRDN on the exchange', () => {
  const g = newGame(3);
  const A = g.aero;
  const M = A.meridian;
  assert.ok(M, 'Meridian is there before you buy anything');
  assert.equal(A.owned, false);
  assert.equal(A.contractsOf(M, 'active').length, AC.aero.meridian.backlog.length);
  assert.ok(M.bays.some((b) => b.unit), 'some of its backlog is already in its bays');
  assert.ok(Object.values(M.inv).some((r) => r.reserved > 0), 'its stores hold reserved materials');
  assert.ok(A.state.market.price > 1);
  assert.ok(A.openTenders().length > 0, 'customers have tenders out on the first morning');
  assert.ok(A.openTenders().some((t) => t.bids.some((b) => b.company === 'meridian')), 'and Meridian has bid on some');
});

test('owner\'s rule: an aircraft contract is for one to five aircraft — six is refused, everywhere', () => {
  const p = AC.products.ap_tern;
  for (let q = 1; q <= 5; q++) assert.equal(quantityError(AC.aero, p, q), null, `${q} aircraft is fine`);
  assert.match(quantityError(AC.aero, p, 6), /at most 5 aircraft/);
  assert.match(quantityError(AC.aero, p, 0), /at least one/);
  assert.equal(quantityError(AC.aero, AC.products.st_relay, 6), null, 'satellites are not capped at five');
  // the authoritative place: making a contract
  const g = newGame(4);
  assert.throws(() => g.aero.makeContract(g.aero.meridian, { customer: 'cu_skyward', product: 'ap_tern', qty: 6, unitPrice: 1, days: 10, quality: 50, depositShare: 0.2 }), /at most 5 aircraft/);
  // tenders never ask for more than five aircraft
  const rng = new Rng(9);
  for (let i = 0; i < 2000; i++) for (const id of ['ap_skylark', 'ap_puffin', 'af_kestrel', 'ap_condor']) assert.ok(tenderQty(AC, AC.products[id], rng) <= 5);
  // a tender tampered with to six can't be bid on (no back door through placeBid)
  const A = g.aero;
  g.player.money = 1e7;
  A.buyFirm();
  const t = makeTender(AC, new Rng(2), { id: 'Tx', customerId: 'cu_lariat_coop', state: { budget: 1e9 }, day: g.clock.day });
  t.product = 'ap_skylark';
  t.qty = 6;
  A.state.tenders.push(t);
  const r = A.placeBid('roost', 'Tx', 20000, t.days);
  assert.equal(r.ok, false);
  assert.match(r.text, /at most 5 aircraft/);
});

test('every product has a valid pipeline that uses its whole bill of materials exactly once', () => {
  for (const [id, p] of Object.entries(AC.products)) {
    const st = stagesOf(AC, p);
    assert.ok(st?.length > 5, `${id} has a pipeline`);
    const used = {};
    for (const s of st) for (const [m, n] of Object.entries(stageMaterials(p, s))) used[m] = (used[m] || 0) + n;
    assert.deepEqual(used, p.bom, `${id}: every lot is consumed by one stage`);
    for (const m of Object.keys(p.bom)) assert.ok(AC.materials[m], `${id}: ${m} is a material`);
    for (const m of Object.keys(p.bom)) assert.ok(Object.values(AC.suppliers).some((sp) => sp.sells[m]), `${id}: somebody sells ${m}`);
    if (p.tech) assert.ok(AC.research[p.tech], `${id}: research ${p.tech} exists`);
  }
  // the lines are distinct: strategic products never go to the launch pad
  assert.ok(!AC.pipelines.missile.some((s) => s.wait === 'pad' || s.event === 'launch'));
  assert.ok(AC.pipelines.missile.some((s) => s.kind === 'convoy'));
  assert.ok(AC.pipelines.rocket.some((s) => s.event === 'launch'));
});

test('the business is lucrative but not free money: every product earns a margin over its materials, freight and bay-days', () => {
  for (const [id, p] of Object.entries(AC.products)) {
    const ext = unitCost(AC, p, { freightShare: 0.08 });
    const own = unitCost(AC, p, { freightShare: 0.008 });
    assert.ok(ext.marginShare > 0.15 && ext.marginShare < 0.5, `${id}: margin ${(ext.marginShare * 100).toFixed(1)}%`);
    assert.ok(ext.materials / p.price > 0.4, `${id}: materials are a real share of the price`);
    assert.ok(own.margin > ext.margin, `${id}: cheaper freight is a better margin`);
  }
});

test('buying Roost Aeroworks: once, all or nothing, with Billie\'s order book; never free on an old save', () => {
  const g = newGame(6);
  const A = g.aero;
  g.player.money = 1000;
  assert.equal(A.buyFirm().ok, false);
  assert.equal(A.owned, false);
  g.player.money = 100000;
  const r = A.buyFirm();
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, 100000 - AC.aero.firm.price);
  assert.equal(A.buyFirm().ok, false, 'not twice');
  const co = A.roost;
  assert.equal(co.bays.length, 1);
  assert.equal(A.contractsOf(co, 'active').length, 1);
  assert.equal(A.unitsOf(co).length, 2);
  assert.ok(g.getFlag('owns_aerospace'));
  // a save from before v0.55.0 (no world.aero) loads with Meridian and without a firm
  const g2 = newGame(6);
  delete g2.world.aero;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g2).ok);
  const g3 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g3).ok);
  assert.equal(g3.aero.owned, false);
  assert.ok(g3.aero.meridian);
});

test('production: a stage waits for its materials, a bay is taken only when they\'re in hand, nothing is used twice', () => {
  const g = rich(7);
  const A = g.aero;
  A.buyFirm();
  const co = A.roost;
  co.autoProcure = false;
  tick(g, 60);
  const u = A.unitsOf(co)[0];
  assert.equal(u.bay, null, 'no bay while the materials aren\'t here');
  assert.ok(['waiting', 'engineering'].includes(u.status) || u.blocker, 'waiting for materials');
  // order what the Skylarks need, then let the trucks arrive
  co.autoProcure = true;
  A.autoProcure(co);
  assert.ok(A.ordersOf(co).length > 0);
  assert.ok(Object.values(co.inv).every((r) => r.qty === 0), 'ordered is not delivered: nothing in stores yet');
  tick(g, 3 * 1440);
  for (const r of Object.values(co.inv)) { assert.ok(r.qty >= 0); assert.ok(r.reserved <= r.qty); }
  assert.ok(A.unitsOf(co, { open: false }).some((x) => x.bay || x.stage > 3), 'work started once the materials came');
  const used = A.unitsOf(co, { open: false }).reduce((a, x) => a + x.cost.materials, 0);
  const bought = Object.values(A.state.pos).filter((po) => po.company === 'roost').reduce((a, po) => a + po.goods, 0);
  assert.ok(used <= bought + 1, 'a unit can only use what was bought');
});

test('Billie\'s Skylarks are built, inspected, parked, collected and paid for — exactly once each', () => {
  const g = rich(8);
  const A = g.aero;
  A.buyFirm();
  const co = A.roost;
  const c = A.contractsOf(co, 'active')[0];
  const money0 = g.player.money;
  tick(g, 9 * 1440);
  assert.equal(c.delivered, 2, `both delivered (status ${c.status})`);
  assert.equal(c.status, 'complete');
  assert.equal(Object.keys(c.settled).length, 2);
  const rev = A.statement(co, null).acc.rev_aircraft;
  assert.equal(rev, c.unitPrice * 2, 'revenue booked once per unit');
  // settling a delivered unit again changes nothing
  const u = A.state.units[c.units[0]];
  if (u) A.settle(co, u);
  assert.equal(A.statement(co, null).acc.rev_aircraft, rev);
  assert.ok(Object.values(A.state.aircraft).some((ac) => ac.contract === c.id && ac.state === 'departed'), 'each aircraft is a persistent entity that left');
  const ac = Object.values(A.state.aircraft).find((x) => x.contract === c.id);
  assert.ok(ac.registration && ac.model === 'ap_skylark' && ac.flight, 'with what the flyable-aircraft update will need');
  assert.notEqual(g.player.money, money0);
});

test('progress survives save and load; inspections and launches are rolled once and kept', () => {
  const g = rich(9);
  const A = g.aero;
  A.buyFirm();
  tick(g, 1440 + 300);
  const before = JSON.parse(JSON.stringify(A.state));
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const after = g2.aero.state;
  for (const [id, u] of Object.entries(before.units)) {
    assert.equal(after.units[id].stage, u.stage);
    assert.deepEqual(after.units[id].rolls, u.rolls, 'rolls are kept');
  }
  assert.deepEqual(after.rng, before.rng, 'the aerospace stream continues where it was');
  // both games go on identically
  tick(g, 1440);
  tick(g2, 1440);
  assert.deepEqual(JSON.parse(JSON.stringify(g2.aero.state.units)), JSON.parse(JSON.stringify(g.aero.state.units)));
});

test('the rival stays within capacity and buys every lot it uses; tenders are awarded by the customer\'s priorities', () => {
  const g = rich(10);
  const A = g.aero;
  const M = A.meridian;
  for (let d = 0; d < 12; d++) {
    tick(g, 1440);
    const inBays = A.unitsOf(M).filter((u) => u.bay);
    assert.ok(inBays.length <= M.bays.length);
    assert.equal(new Set(inBays.map((u) => u.bay)).size, inBays.length, 'one unit per bay');
    for (const r of Object.values(M.inv)) assert.ok(r.qty >= 0 && r.reserved <= r.qty);
  }
  const decided = A.state.tenders.filter((t) => t.status === 'awarded');
  assert.ok(decided.length > 0);
  for (const t of decided) assert.equal(t.winner, t.ranking[0].company, 'the best-scored valid bid wins');
  assert.ok(Object.values(A.state.pos).some((po) => po.company === 'meridian'), 'Meridian buys its materials');
});

test('player bids compete with Meridian: a cheaper, quicker bid wins a price-led customer', () => {
  const g = rich(11);
  const A = g.aero;
  A.buyFirm();
  const t = makeTender(AC, new Rng(3), { id: 'Tp', customerId: 'cu_lariat_coop', state: { budget: 1e9 }, day: g.clock.day });
  Object.assign(t, { product: 'ap_skylark', qty: 2, ceiling: 26000, days: 12, quality: 40, closes: g.clock.day });
  A.state.tenders.push(t);
  assert.ok(A.placeBid('meridian', 'Tp', 25000, 10).ok);
  const r = A.placeBid('roost', 'Tp', 19000, 8); // (at 21,000 Meridian's reputation still edges it)
  assert.ok(r.ok, r.text);
  assert.equal(A.placeBid('roost', 'Tp', 20000, 8).ok, false, 'one sealed bid each');
  A.closeTenders();
  assert.equal(t.winner, 'roost');
  const c = A.contract(t.contract);
  assert.equal(c.qty, 2);
  assert.equal(c.units.length, 2, 'each aircraft is its own unit');
  assert.equal(new Set(c.units).size, 2);
  assert.ok(c.depositPaid > 0);
});

test('MRDN: buy and sell through the exchange with a broker\'s fee, at most 5% of the company; the price follows the books', () => {
  const g = rich(12);
  const A = g.aero;
  const m = A.state.market;
  const p0 = m.price;
  const money = g.player.money;
  const r = A.buyShares(1000);
  assert.ok(r.ok, r.text);
  assert.equal(m.sharesOwned, 1000);
  assert.ok(g.player.money < money - p0 * 1000, 'paid the price and a fee');
  assert.equal(A.buyShares(A.maxShares()).ok, false, 'no corner on MRDN');
  assert.ok(A.sellShares(1000).ok);
  assert.equal(m.sharesOwned, 0);
  tick(g, 5 * 1440);
  assert.ok(m.history.length >= 4);
  for (const d of m.history) assert.ok(Number.isFinite(d.price) && d.price >= 1 && Number.isFinite(d.fair));
  // the price moves only part of the way to fair value each day (no random walk)
  const X = AC.aero.exchange;
  for (let i = 1; i < m.history.length; i++) {
    const prev = m.history[i - 1].price;
    const fair = m.history[i].fair;
    const lo = Math.min(prev, prev + (fair - prev) * X.priceAdjust) * (1 - X.noise) - 0.01;
    const hi = Math.max(prev, prev + (fair - prev) * X.priceAdjust) * (1 + X.noise) + 0.01;
    assert.ok(m.history[i].price >= lo && m.history[i].price <= hi, `day ${m.history[i].day}`);
  }
});

test('satellites: not operational until launched and commissioned; a decommissioned one stops', () => {
  const g = rich(13);
  const A = g.aero;
  const M = A.meridian;
  const c = A.makeContract(M, { customer: 'cu_brightwave', product: 'st_relay', qty: 1, unitPrice: 700000, days: 30, quality: 50, depositShare: 0.2 });
  const u = A.state.units[c.units[0]];
  A.planLaunchers(M);
  assert.ok(u.rocket, 'a launcher is planned for it');
  tick(g, 3 * 1440);
  assert.ok(!Object.values(A.state.satellites).some((s) => s.unit === u.id), 'built is not operational');
  for (let d = 0; d < 30 && !A.state.satellites[u.satellite] && !u.finished; d++) tick(g, 1440);
  const sat = Object.values(A.state.satellites).find((s) => s.unit === u.id);
  if (sat) {
    assert.ok(A.state.units[u.rocket]?.launch?.success !== false);
    assert.ok(['operational', 'degraded'].includes(sat.status));
    sat.endsAt = A.now - 1;
    A.satelliteDay();
    assert.equal(sat.status, 'decommissioned');
  } else assert.ok(['failed'].includes(u.status), `lost in launch or commissioning (${u.status})`);
});

test('every new and formerly sharing character has a home of their own; the Ober Fields still work', () => {
  const L = CONTENT.life;
  const byUnit = {};
  for (const [id, l] of Object.entries(L.homes)) (byUnit[l.home] ||= []).push(id);
  for (const id of ['npc_gideon', 'npc_ruby', 'npc_hank', 'npc_pip', 'npc_otto', 'npc_crisp', 'npc_agnes', 'npc_silas', 'npc_mabel', 'npc_al', 'npc_percy', 'npc_minnie', 'npc_dee_nom', 'npc_tony', 'npc_max', 'npc_vera', 'npc_brock', 'npc_billie', 'npc_imogen', 'npc_ailie', 'npc_rudy', 'npc_tina', 'npc_wrenna']) {
    const home = L.homes[id].home;
    assert.deepEqual(byUnit[home], [id], `${id} lives alone (${home})`);
    const [rid, unit] = home.split('/');
    const map = L.residences[rid].units[unit].map;
    assert.ok(CONTENT.maps[map]?.home?.includes(id), `${id}: ${map} is their home`);
  }
  for (const id of ['res_bunkhouse', 'res_phonograph_staff']) assert.ok(!L.residences[id], `${id} is gone`);
  // the oil fields keep their refinery, derricks and the crew's mess
  const of = CONTENT.maps.ober_fields;
  assert.ok(of.buildings.some((b) => b.id === 'b_refinery'));
  assert.ok(of.props.filter((p) => p.type === 'derrick').length >= 3);
  assert.ok(!CONTENT.maps.bunkhouse.props.some((p) => p.type === 'bed'), 'the old bunkhouse is a mess hall');
  assert.ok(of.doors.some((d) => d.gateway === 'Starling Flats'), 'the Cut leads up to Starling Flats');
});

test('Starling Flats: the campus, runway and launch complex are there, and everyone sleeps at home and goes to work', () => {
  const m = CONTENT.maps.starling_flats;
  for (const id of ['sf_roost_office', 'sf_roost_hangar', 'sf_meridian_hq', 'sf_meridian_assembly', 'sf_meridian_flightline', 'sf_meridian_space', 'sf_vib', 'sf_launch_control', 'sf_freight', 'sf_cafe']) assert.ok(m.buildings.some((b) => b.id === id), id);
  assert.ok(m.airfield.runways[0].w > 100, 'a long runway');
  assert.ok(m.props.some((p) => p.type === 'launch_pad' && p.company === 'meridian'));
  assert.ok(m.props.some((p) => p.type === 'control_tower'));
  const g = newGame(14);
  g.clock.total = 1440 + 2 * 60;
  g.settleNpcs?.();
  for (const id of ['npc_billie', 'npc_imogen', 'npc_tina', 'npc_wrenna', 'npc_gideon']) assert.ok(g.npcs.get(id).map.startsWith('starling_') || g.npcs.get(id).map.startsWith('derrick_'), `${id} is at home at 02:00 (${g.npcs.get(id).map})`);
});

test('the terminal and the hangar draw the same unit: unitLook follows the build stage by stage', () => {
  const g = newGame(15);
  const A = g.aero;
  const M = A.meridian;
  const bay = M.bays.find((b) => b.unit && A.state.units[b.unit].line === 'aircraft');
  assert.ok(bay, 'Meridian has an aircraft in a bay on a new game');
  const u = A.state.units[bay.unit];
  const look = A.unitLook(u);
  const prop = Object.values(CONTENT.maps).flatMap((m) => m.props || []).find((p) => p.type === 'bay_slot' && p.aero?.company === 'meridian' && p.aero.bay === bay.id);
  assert.ok(prop, 'the bay is on the map');
  assert.deepEqual(A.computeView(prop), look, 'the bay in the world shows exactly what the terminal shows');
  assert.equal(look.kind, 'aircraft');
  assert.equal(look.stageIndex, u.stage);
  // a later stage never shows less of the airframe
  const later = A.unitLook({ ...u, stage: u.stage + 1, work: 0 });
  assert.ok(later.build.fuselage >= look.build.fuselage && later.build.wings >= look.build.wings);
});
