// The wider world's companies (v0.60.0 part D): made once and kept, sharing real demand, paying
// their way, entering and failing under rules — and never conjuring money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { CORP } from '../src/content/corporate.js';
import { allocate, poolAt, stepDay, makeCompany, monthEnd } from '../src/corp/sim.js';
import { advance, rebuildNamer } from '../src/corp/generate.js';
import { validateName } from '../src/corp/identity.js';
import { countryIds } from '../src/corp/registry.js';

const dayTo = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.dailyTick(); };

test('allocate: nobody sells more than their capacity, nothing beyond the demand, leftovers go to the rest', () => {
  const parts = [{ cap: 100, w: 1 }, { cap: 1000, w: 1 }, { cap: 1000, w: 2 }];
  const s = allocate(900, parts);
  assert.ok(s.every((x, i) => x <= parts[i].cap + 1e-9));
  assert.ok(Math.abs(s.reduce((a, b) => a + b, 0) - 900) < 1e-6, 'all the demand met when there is room');
  assert.equal(s[0], 100, 'the small one is full, so the others take the rest');
  const over = allocate(1e9, parts);
  assert.deepEqual(over, [100, 1000, 1000], 'more demand than capacity: everyone sells out');
  assert.deepEqual(allocate(0, parts), [0, 0, 0]);
  assert.ok(allocate(500, [{ cap: 10, w: 0 }, { cap: 10, w: 0 }]).every((x) => x === 0), 'no weight, no sale');
});

test('the world has about forty-five companies in ten sectors, each with its own name', () => {
  const g = newGame(901);
  const gen = g.corp.state.generated;
  assert.ok(gen.length >= 40 && gen.length <= 50, `${gen.length}`);
  const sectors = new Set(gen.map((c) => c.sector));
  assert.deepEqual([...sectors].sort(), Object.keys(CORP.sectors).sort());
  for (const [s, S] of Object.entries(CORP.sectors)) assert.equal(gen.filter((c) => c.sector === s).length, S.count);
  const names = gen.map((c) => c.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'unique names');
  assert.ok(gen.every((c) => validateName(c.name).ok));
  const registryNames = g.corp.registry().map((r) => r.name.toLowerCase());
  assert.equal(new Set(registryNames).size, registryNames.length, 'unique across the whole registry');
  assert.ok(gen.every((c) => countryIds(CONTENT).includes(c.country)));
  const tick = gen.filter((c) => c.ticker).map((c) => c.ticker);
  assert.equal(new Set(tick).size, tick.length, 'unique tickers');
  assert.ok(!tick.some((t) => ['OBRO', 'CHZ', 'MRDN'].includes(t)));
  assert.ok(tick.length >= 14 && tick.length <= 20, `${tick.length} listed`);
  assert.ok(gen.filter((c) => c.ticker).every((c) => c.shares > 0 && c.listed));
  assert.ok(gen.filter((c) => !c.ticker).every((c) => c.shares === null && !c.listed));
});

test('they are a hash of the world: the same seed gives the same companies, another seed others', () => {
  const a = newGame(902).corp.state.generated;
  const b = newGame(902).corp.state.generated;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = newGame(903).corp.state.generated;
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
});

test('each has a history before the game begins, a character, and strengths and weaknesses', () => {
  const g = newGame(904);
  for (const c of g.corp.state.generated) {
    assert.ok(c.months.length >= 4, 'months of books');
    assert.ok(['small', 'mid', 'large'].includes(c.size));
    assert.ok(CORP.strategies[c.strategy]);
    assert.ok(c.capacity > 0 && c.plantValue > 0 && c.cash >= 0 && c.debt >= 0);
    assert.ok(c.mgmt >= 0 && c.mgmt <= 1 && c.risk >= 0 && c.risk <= 1);
    assert.ok(c.speciality && c.age >= 2);
  }
  const mg = g.corp.state.generated.map((c) => c.mgmt);
  assert.ok(Math.max(...mg) - Math.min(...mg) > 0.3, 'management quality varies');
});

test('they are made once: loading, loading again, and a save round trip change nothing', () => {
  const g = newGame(905);
  const before = JSON.stringify(g.corp.state.generated);
  g.corp.afterLoad(); g.corp.ensureWorld();
  assert.equal(JSON.stringify(g.corp.state.generated), before);
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT, { seed: 3 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(JSON.stringify(g2.corp.state.generated), before, 'the same companies, to the last digit');
  assert.equal(g2.corp.state.gen.salt, g.corp.state.gen.salt);
  sm.save('slot2', g2);
  const g3 = new Game(CONTENT, { seed: 4 });
  assert.ok(sm.load('slot2', g3).ok);
  assert.equal(JSON.stringify(g3.corp.state.generated), before);
});

test('a v0.59 save gains the wider world — and not a single obol, share or business', () => {
  const raw = readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), raw);
  const g = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g).ok);
  const money = JSON.parse(raw).state.player.money;
  assert.equal(g.player.money, money);
  assert.ok(g.corp.state.generated.length >= 40);
  const reg = g.corp.registry();
  assert.equal(reg.filter((r) => r.kind === 'player').length, 4);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.equal(g.corp.funded(id), false);
  assert.equal(g.corp.state.parent, undefined);
});

test('the world lives a day once a day, and only so many days are caught up', () => {
  const g = newGame(906);
  const st = g.corp.state;
  const rev = () => st.generated.reduce((a, c) => a + c.totals.revenue, 0);
  const r0 = rev();
  dayTo(g, 2);
  const r1 = rev();
  assert.ok(r1 > r0);
  dayTo(g, 2);
  assert.equal(rev(), r1, 'the same day twice does nothing');
  dayTo(g, 400);
  assert.equal(st.gen.lastDay, 400);
  const perDay = (r1 - r0);
  assert.ok(rev() - r1 < perDay * 35, 'a year skipped is caught up by at most a month');
});

test('a sector never sells more than its pool, and the player\'s sales come off the top', () => {
  const g = newGame(907);
  const gen = g.corp.state.generated.filter((c) => c.sector === 'agriculture');
  const day = 50;
  const pool = poolAt(CORP, 'agriculture', day);
  const soldFree = stepDay(CORP, structuredClone(gen), pool, day).sold;
  assert.ok(soldFree <= pool + 1e-6);
  const withPlayer = stepDay(CORP, structuredClone(gen), pool - pool * 0.5, day).sold;
  assert.ok(withPlayer < soldFree, 'when the player sells half the pool, the rest sell less');
  assert.ok(Math.abs(withPlayer - pool * 0.5) < pool * 0.01 + 1);
});

test('the player\'s real sales are what the others find missing', () => {
  const g = newGame(908);
  g.player.money = 5_000_000;
  assert.ok(g.arms.buyLicence().ok);
  assert.equal(Math.round(g.corp.externalSales().arms), 0);
  g.corp.receive('arms', 300_000, { cat: 'exports' });
  assert.ok(g.corp.externalSales().arms > 0, 'revenue the arms company took is read as arms sold');
  assert.equal(g.corp.externalSales().shipping, 0);
});

test('a company that cannot pay is wound up: lenders take the loss, nothing is paid from nowhere', () => {
  const g = newGame(909);
  const gen = structuredClone(g.corp.state.generated.filter((c) => c.sector === 'arms'));
  const world = { salt: 'x', nextId: 100, lastEntry: {}, companies: gen };
  const N = rebuildNamer(CORP, world, []);
  // costs double: margins turn negative and stay there
  advance(CORP, world, 1, 400, () => ({ rate: 0.05, external: {}, poolExtra: {}, cost: { arms: 3 } }), N, countryIds(CONTENT));
  const gone = gen.filter((c) => c.status === 'closed' || c.status === 'merged');
  assert.ok(gone.length >= 1, 'some went under');
  for (const c of gone) {
    assert.equal(c.capacity, 0); assert.equal(c.cash, 0); assert.equal(c.debt, 0);
    assert.ok(c.closedDay >= 1);
  }
  const closed = gen.filter((c) => c.status === 'closed');
  assert.ok(closed.every((c) => c.lossToLenders >= 0));
  for (const c of gen.filter((c) => c.status === 'active')) assert.ok(c.cash >= 0 && c.debt >= 0);
});

test('a failing company is taken over by a strong one in its sector, at a price the buyer pays', () => {
  const K = CORP;
  const mk = (id, cash, extra = {}) => ({ ...makeCompany(K, { id, sector: 'arms', country: 'home', day: 1, name: id, pool: 160000, size: 'mid' }), cash, ...extra });
  const buyer = mk('buyer', 5_000_000);
  const weak = mk('weak', -10, { status: 'distressed', debt: 200_000 });
  const world = { salt: 's', nextId: 50, lastEntry: {}, companies: [buyer, weak] };
  const cap0 = buyer.capacity;
  const debt0 = buyer.debt;
  const cash0 = buyer.cash;
  const out = monthEnd(K, world, 31, {}, { makeName: () => 'X', makeTicker: () => 'XX', countries: ['home'] });
  assert.equal(weak.status, 'merged');
  assert.equal(weak.mergedInto, 'buyer');
  assert.ok(buyer.capacity > cap0);
  assert.equal(buyer.debt, debt0 + 200_000, 'the buyer takes the debt on');
  assert.ok(buyer.cash <= cash0, 'and pays, never receives');
  assert.ok(out.some((o) => o.kind === 'merger'));
});

test('population is bounded: entrants stop at the cap, and old closed records are forgotten', () => {
  const K = { ...CORP, cap: { alive: 50, records: 52 }, entry: { ...CORP.entry, busy: 0, chance: 1, cooldown: 0, perMonth: 5 } };
  const g = newGame(910);
  const world = { salt: 'q', nextId: 1000, lastEntry: {}, companies: structuredClone(g.corp.state.generated) };
  const N = rebuildNamer(K, world, g.corp.takenNames());
  for (let m = 0; m < 24; m++) monthEnd(K, world, 1 + m * 30, {}, { makeName: N.makeName, makeTicker: N.makeTicker, countries: ['home'] });
  const alive = world.companies.filter((c) => c.status === 'active' || c.status === 'distressed').length;
  assert.ok(alive <= 50, `${alive} alive`);
  const names = world.companies.map((c) => c.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'newcomers never repeat a name');
  const ids = world.companies.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of world.companies) c.status === 'active' && (c.status = 'closed', c.closedDay = 5);
  monthEnd(K, world, 900, {}, { makeName: N.makeName, makeTicker: N.makeTicker, countries: ['home'] });
  assert.ok(world.companies.length <= K.cap.records);
});

test('a name belonging to one of the world\'s companies cannot be taken by the player', () => {
  const g = newGame(911);
  g.player.money = 10_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const taken = g.corp.state.generated[0].name;
  assert.ok(!g.corp.rename('aerospace', taken).ok);
  assert.ok(!g.corp.rename('aerospace', taken.toUpperCase()).ok);
});

test('over two years the world stays in bounds: capacity, cash and debt are never negative or runaway', () => {
  const g = newGame(912);
  for (let d = 2; d <= 730; d += 1) dayTo(g, d);
  for (const c of g.corp.state.generated) {
    assert.ok(Number.isFinite(c.cash) && Number.isFinite(c.debt) && Number.isFinite(c.capacity));
    if (c.status === 'active') { assert.ok(c.cash >= 0 && c.debt >= 0 && c.capacity > 0); assert.ok(c.capacity < CORP.sectors[c.sector].pool * 3); }
    assert.ok(c.months.length <= 24);
  }
  assert.ok(g.corp.state.generated.length <= CORP.cap.records);
  assert.ok(g.corp.state.gen.news.length <= 40);
});
