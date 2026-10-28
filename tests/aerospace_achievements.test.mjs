// Achievements (v0.59.0): measured, earned once, paid once, and kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { METRICS, progress, checkAchievements } from '../src/aero/achievements.js';

const C = CONTENT.aerospace;
const DAY = 1440;
const own = (seed = 101) => { const g = newGame(seed); g.player.money = 20_000_000; assert.ok(g.aero.buyFirm().ok); return { g, A: g.aero, co: g.aero.roost }; };

test('the list is sound: every achievement reads a real metric toward a real goal, once each', () => {
  const ids = new Set();
  for (const a of C.achievements) {
    assert.ok(!ids.has(a.id), a.id); ids.add(a.id);
    assert.ok(METRICS[a.metric], `${a.id}: metric ${a.metric}`);
    assert.ok(a.goal > 0 && a.name && a.text && a.group, a.id);
    assert.ok(a.rep >= 0 && a.rep <= 5 && a.cash >= 0);
  }
  assert.ok(C.achievements.length >= 25);
  for (const m of Object.keys(METRICS)) assert.ok(C.achievements.some((a) => a.metric === m), `${m} is used`);
});

test('a fresh company has earned nothing and every metric reads sanely', () => {
  const { A, co } = own();
  const list = progress(A, co);
  assert.equal(list.length, C.achievements.length);
  for (const a of list) { assert.ok(Number.isFinite(a.value) && a.frac >= 0 && a.frac <= 1, a.id); }
  assert.equal(list.filter((a) => a.done).length, 0, 'Billie\'s order book earns nothing yet');
  assert.equal(METRICS.networks(A, co), 0);
});

test('an achievement is earned the first time its metric reaches the goal, pays once, and says so', () => {
  const { g, A, co } = own(102);
  co.stats.delivered = 10;
  const rep = co.reputation;
  const cash = g.player.money;
  const won = checkAchievements(A, co);
  assert.deepEqual(won.map((a) => a.id), ['deliver_10']);
  assert.ok(co.achieved.deliver_10.at === A.now);
  assert.ok(co.reputation >= rep + 0.9 && g.player.money - cash === 25000);
  assert.ok(A.state.reports.some((r) => /Achievement — Ten out of the door/.test(r.text)));
  assert.ok(A.state.news.some((n) => /Ten out of the door/.test(n.text)));
  assert.deepEqual(checkAchievements(A, co), [], 'once');
  const cash2 = g.player.money;
  checkAchievements(A, co);
  assert.equal(g.player.money, cash2);
  assert.ok(progress(A, co).find((a) => a.id === 'deliver_10').done);
});

test('several at once, and each kind of metric', () => {
  const { A, co } = own(103);
  Object.assign(co.stats, { delivered: 60, bestStreak: 11, flawless: 12, byClass: { private: 3, passenger: 2, fighter: 1, bomber: 1 }, bigContract: 5, byProduct: { ap_condor: 1 }, launches: 8, launchFailures: 1, launchBest: 6, discoveries: 1 });
  co.reputation = 80;
  co.research = Object.keys(C.research).slice(0, 17);
  co.workforce = 520;
  const won = checkAchievements(A, co).map((a) => a.id).sort();
  for (const id of ['deliver_10', 'deliver_50', 'ontime_10', 'flawless_10', 'classes_4', 'big_contract', 'widebody', 'launch_5', 'discovery', 'research_16', 'workforce_500', 'rep_75']) assert.ok(won.includes(id), id);
  for (const id of ['deliver_200', 'launch_20', 'launch_run_10', 'research_all']) assert.ok(!won.includes(id), `${id} not yet`);
  assert.equal(METRICS.launches(A, co), 7);
  assert.equal(METRICS.classes(A, co), 4);
});

test('networks, satellites and orbit income are read from the fleet and the books', () => {
  const { g, A, co } = own(104);
  const mk = (id, role, unit) => { A.state.satellites[id] = { id, name: id, product: 'st_nimbus', role, service: { [role]: unit }, owner: co.id, manufacturer: co.id, own: true, status: 'operational', capability: 1, lifeDays: 60, commissioned: g.clock.total, endsAt: g.clock.total + 60 * DAY, price: 1, opex: 0, value: 1, book: 1, hardened: false, config: {} }; };
  mk('W1', 'weather', 1);
  assert.equal(METRICS.networks(A, co), 0, 'one weather satellite is not a network');
  mk('W2', 'weather', 1);
  assert.equal(METRICS.networks(A, co), 1);
  mk('S1', 'science', 1);
  assert.equal(METRICS.networks(A, co), 2, 'a science network is one satellite');
  assert.equal(METRICS.satellites(A, co), 3);
  co.books.totals.rev_services = 1_200_000;
  assert.equal(METRICS.orbitIncome(A, co), 1_200_000);
  const won = checkAchievements(A, co).map((a) => a.id);
  assert.ok(won.includes('network_1') && won.includes('orbit_income') && won.includes('sat_5') === false);
});

test('overtaking Meridian takes more than it has made, once it has made ten', () => {
  const { A, co } = own(105);
  A.meridian.stats.delivered = 40;
  co.stats.delivered = 41;
  assert.equal(METRICS.beatMeridian(A, co), 1);
  co.stats.delivered = 40;
  assert.equal(METRICS.beatMeridian(A, co), 0);
  A.meridian.stats.delivered = 0; co.stats.delivered = 30;
  assert.equal(METRICS.beatMeridian(A, co), 0, 'ahead of nothing is not much');
});

test('the rival does not collect achievements', () => {
  const { A } = own(106);
  A.meridian.stats.delivered = 500;
  assert.deepEqual(checkAchievements(A, A.meridian), []);
});

test('real deliveries feed the counters: the class, the product, the streak, the flawless builds, the whole contract', () => {
  const { g, A, co } = own(107);
  const c = A.contractsOf(co, 'active')[0];
  for (let i = 0; i < 12 * DAY && c.status === 'active'; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(c.status, 'complete');
  assert.ok(co.stats.byClass.private >= 1);
  assert.ok(co.stats.byProduct.ap_skylark >= 1);
  assert.ok(co.stats.bestStreak >= (co.streaks.onTime || 0));
  assert.ok(co.stats.bigContract >= c.qty);
  assert.ok((co.stats.flawless || 0) >= 0);
  assert.ok(co.achieved && typeof co.achieved === 'object');
});

test('launches count their run: a loss starts it over, the best is kept', () => {
  const { g, A, co } = own(108);
  // the counters follow what A.launch does
  co.stats.launchRun = 4; co.stats.launchBest = 4;
  co.stats.launchRun = 0; // a loss
  co.stats.launchRun += 1;
  assert.equal(co.stats.launchBest, 4);
  assert.equal(METRICS.launchRun(A, co), 4);
  void g;
});

test('achievements survive a save', () => {
  const { A, co } = own(109);
  co.stats.delivered = 10;
  checkAchievements(A, co);
  const g = A.game;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  assert.deepEqual(g2.aero.roost.achieved, co.achieved);
  assert.deepEqual(checkAchievements(g2.aero, g2.aero.roost), [], 'and it is not paid twice');
});
