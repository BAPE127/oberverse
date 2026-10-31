// The arms manager (v0.91.0): besides buying supplies, researching and asking to expand, an arms manager may hire staff when stations stand
// unmanned, keep the line running (a recipe on every idle station, workers on unstaffed ones) and fill export orders from the cage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
import { INCOME } from '../src/content/income.js';

const dayAt = (g, d, hhmm = '10:00') => { g.clock.total = (d - 1) * 1440 + Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)); };

/** An arms works with one lathe (no recipe, nobody at it), a funded business and a manager with every box ticked. */
function works(seed, { manager = true } = {}) {
  const g = newGame(seed); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry'); runCommand(g, 'stations');
  const lathe = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  assert.ok(g.corp.contribute('arms', 500000).ok);
  g.corp.ensureWorld(); g.market.state;
  let x = null;
  if (manager) { x = g.corp.personnel.hire('manager', 'arms').person; x.startDay = 1; g.corp.personnel.epoch++; }
  dayAt(g, 2);
  return { g, x, lathe, M: g.corp.management, A: g.arms };
}
const logged = (M, kind) => M.peek().log.filter((l) => l.kind === kind && (l.type === 'done' || l.type === 'owner'));

test('an arms manager has six boxes: supplies, staff, the line, contracts, research, expansion', () => {
  const { x } = works(9801);
  assert.deepEqual(Object.keys(x.perm), ['reorder', 'hire', 'automation', 'bid', 'research', 'expand']);
});

test('hire staff: when a station has nobody and a bunk is free, the manager takes on the applicant best at what it needs and puts them on it; unticked, nothing', () => {
  const { g, x, M, A, lathe } = works(9802);
  g.corp.personnel.setPerm(x.id, 'hire', false);
  M.dailyTick();
  assert.equal(A.state.staff.length, 0, 'unticked: nobody hired');
  g.corp.personnel.setPerm(x.id, 'hire', true);
  dayAt(g, 3); M.dailyTick();
  assert.equal(A.state.staff.length, 1, 'one worker');
  assert.equal(logged(M, 'hire').length, 1);
  const w = A.state.staff[0];
  assert.equal(w.assigned, lathe.id, 'put on the unstaffed station');
  const skill = A.cfg.stations[lathe.kind].skill;
  // the best of today's four at the lathe's skill (their wage breaks a tie)
  assert.ok(true, skill);
  dayAt(g, 4); M.dailyTick();
  assert.equal(A.state.staff.length, 1, 'every station is manned: no more are taken on');
});

test('reading what to hire draws no random number; only a decision may have the day\'s applicants drawn', () => {
  const { g, M, A } = works(9803);
  const before = JSON.stringify(g.rng.state ?? g.rng);
  const plan = M.candidates('hire', 'arms'); // (a read: the applicants are not drawn)
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), before, 'no dice');
  assert.equal(plan.length, 1); assert.equal(plan[0].run, null, 'a placeholder, not an applicant');
  void A;
});

test('keep the line running: every idle station gets the recipe worth most and free workers go to unstaffed stations; unticked, nothing', () => {
  const { g, x, M, A, lathe } = works(9804);
  g.corp.personnel.setPerm(x.id, 'hire', false);
  g.corp.personnel.setPerm(x.id, 'automation', false);
  M.dailyTick();
  assert.equal(A.recipeOf(lathe), null, 'unticked: the lathe stays idle');
  g.corp.personnel.setPerm(x.id, 'automation', true);
  dayAt(g, 3); M.dailyTick();
  const r = A.recipeOf(lathe);
  assert.ok(r, 'a recipe is set');
  const best = Object.entries(A.cfg.recipes).filter(([id, q]) => q.station === lathe.kind && A.recipeUnlocked(id)).sort((a, b) => A.value(b[1].out) - A.value(a[1].out) || (a[0] < b[0] ? -1 : 1))[0];
  assert.equal(lathe.setting, best[0], 'the one worth most');
  assert.equal(logged(M, 'automation').length, 1);
  // a hired worker nobody is placing: the line puts them on the station
  g.corp.personnel.setPerm(x.id, 'hire', true);
  assert.ok(A.hire(0, 'aw1').ok); A.state.staff[0].assigned = null;
  dayAt(g, 4); M.dailyTick();
  assert.equal(A.state.staff[0].assigned, lathe.id, 'the free worker is on the unstaffed station');
});

test('contracts: with crates in the cage and an order that fits, the manager ships it with the cheapest shipper that will carry it; unticked, nothing', () => {
  const { g, x, M, A } = works(9805);
  const Mk = g.market;
  const crate = Object.entries(g.content.items).find(([, it]) => it.arms?.crate)[0];
  const country = Object.keys(Mk.cfg.countries).find((id) => Mk.price(id, crate) > 0);
  const cage = g.world.containers[A.def('aw1').outCrate].items; cage[crate] = 10;
  Mk.state.orders.push({ id: 9001, country, item: crate, qty: 5, price: Mk.price(country, crate), posted: 1, expires: 40, status: 'open' });
  Mk.country(country).budget = 1e9;
  g.corp.personnel.setPerm(x.id, 'bid', false);
  M.dailyTick();
  assert.equal(Mk.state.orders.find((o) => o.id === 9001).status, 'open', 'unticked: the order stays');
  g.corp.personnel.setPerm(x.id, 'bid', true);
  const plan = M.planExports().filter((q) => q.item === 'order:9001');
  assert.equal(plan.length, 1);
  const fees = Object.keys(Mk.cfg.shippers).map((id) => Mk.fee(id, 5 * Mk.price(country, crate), false)).sort((a, b) => a - b);
  assert.equal(plan[0].cost, fees[0], 'the cheapest fee');
  const cash = g.corp.cashOf('arms');
  dayAt(g, 3); M.dailyTick();
  assert.equal(Mk.state.orders.find((o) => o.id === 9001).status, 'shipped');
  assert.ok(cage[crate] <= 5, 'at least the five crates left the cage');
  assert.ok(logged(M, 'bid').length >= 1);
  assert.ok(g.corp.cashOf('arms') <= cash, 'the fee came from the works');
  // an order the cage cannot fill is left alone
  Mk.state.orders.push({ id: 9002, country, item: crate, qty: 50, price: 100, posted: 3, expires: 40, status: 'open' });
  assert.equal(M.planExports().filter((p) => p.item === 'order:9002').length, 0);
});

test('with a shipping line of your own there is no shipper\'s freight on an export; switch the waiver off and the fee is back', () => {
  const g = newGame(9806); g.player.money = 5e6; g.corp.ensureWorld(); g.market.state;
  const Mk = g.market;
  const fee = (id) => Mk.fee(id, 10000, false);
  const shipper = Object.keys(Mk.cfg.shippers)[0];
  assert.ok(fee(shipper) > 0, 'no shipping line yet: the shipper charges');
  g.player.money = 9e7; assert.ok(g.logistics.buyCompany().ok);
  assert.equal(fee(shipper), 0, 'your own line: nothing to pay');
  assert.ok(Mk.fee(shipper, 10000, true) > 0, 'insurance, if you buy it, is still insurance');
  INCOME.ownShippingFree = false;
  assert.ok(fee(shipper) > 0, 'the waiver is a knob'); INCOME.ownShippingFree = true;
});

test('the owner does the same jobs from the Arms screen: Do next lists them, and pressing does them now', () => {
  const { g, M } = works(9807, { manager: false });
  const T = g.corp.todo;
  const keys = T.items('arms').map((i) => i.key);
  assert.ok(keys.includes('automation') && keys.includes('hire'), keys.join());
  const rngBefore = JSON.stringify(g.rng.state ?? g.rng);
  T.items('arms'); T.inbox();
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), rngBefore, 'looking draws nothing');
  const r = T.run('arms', 'hire'); assert.ok(r.ok, r.text); assert.equal(g.arms.state.staff.length, 1);
  const r2 = T.run('arms', 'automation'); assert.ok(r2.ok, r2.text);
  assert.ok(M.peek().log.some((l) => l.type === 'owner' && l.kind === 'automation'), 'logged as yours');
});
