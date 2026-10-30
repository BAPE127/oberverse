// Corporate milestones (v0.80.0): awarded from the game's own records, once, never from a click or a hire alone; the exchange keeps your trades and a watchlist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { MILESTONES, evaluate } from '../src/corp/milestones.js';

const blank = () => ({ established: [], parent: false, subs: [], staff: [], budgets: {}, decided: {}, ranks: {}, months: [], portfolio: { tickers: 0, sectors: 0, value: 0, gain: 0, since: null }, loans: [], contracts: [], expandedInWar: false, day: 200 });
const met = (rec, id) => evaluate(rec).find((x) => x.id === id).met;
const person = (role, employer, skill = 50, status = 'active') => ({ role, employer, status, skill });

test('pure: each milestone asks for something that is in the records, and a little short of it is not enough', () => {
  const r = blank();
  assert.deepEqual(MILESTONES.map((m) => m.id).length, new Set(MILESTONES.map((m) => m.id)).size, 'unique ids');
  assert.equal(evaluate(r).filter((x) => x.met).length, 0, 'nothing is earned by having nothing');
  assert.equal(met({ ...r, established: ['arms', 'shipping', 'aerospace'] }, 'four'), false);
  assert.equal(met({ ...r, established: ['arms', 'shipping', 'aerospace', 'farming'] }, 'four'), true);
  assert.equal(met({ ...r, parent: true, subs: ['arms', 'shipping', 'aerospace'] }, 'group'), false);
  assert.equal(met({ ...r, parent: true, subs: ['arms', 'shipping', 'aerospace', 'farming'] }, 'group'), true);
  assert.equal(met({ ...r, subs: ['arms', 'shipping', 'aerospace', 'farming'] }, 'group'), false, 'subsidiaries need a parent');
  const hq = [person('cfo', 'parent'), person('gm', 'parent'), person('hrd', 'parent')];
  assert.equal(met({ ...r, staff: hq }, 'hq'), true); assert.equal(met({ ...r, staff: hq.slice(1) }, 'hq'), false, 'no CFO'); assert.equal(met({ ...r, staff: hq.slice(0, 2) }, 'hq'), false);
  assert.equal(met({ ...r, staff: [person('cfo', 'parent', 79)] }, 'cfo'), false); assert.equal(met({ ...r, staff: [person('cfo', 'parent', 80)] }, 'cfo'), true);
  assert.equal(met({ ...r, staff: [person('cfo', 'parent', 95, 'resigned')] }, 'cfo'), false, 'a CFO who has left does not count');
  // delegation needs a manager, a budget AND a decision at every subsidiary: hiring and a budget alone are not enough
  const subs = ['arms', 'shipping', 'aerospace', 'farming'];
  const mgr = subs.map((e) => person('gm', e)); const bud = Object.fromEntries(subs.map((e) => [e, 1000]));
  assert.equal(met({ ...r, parent: true, subs, staff: mgr, budgets: bud }, 'delegated'), false, 'managers and budgets, but no decisions');
  assert.equal(met({ ...r, parent: true, subs, staff: mgr, budgets: bud, decided: Object.fromEntries(subs.map((e) => [e, 1])) }, 'delegated'), true);
  assert.equal(met({ ...r, parent: true, subs, staff: mgr, budgets: bud, decided: { arms: 1, shipping: 1, aerospace: 1 } }, 'delegated'), false, 'one subsidiary never decided anything');
  // ranks
  const rk = (rank, of = 8) => [{ m: 1, rank, of }, { m: 2, rank, of }];
  assert.equal(met({ ...r, ranks: { arms: rk(5) } }, 'top5'), true); assert.equal(met({ ...r, ranks: { arms: rk(6) } }, 'top5'), false); assert.equal(met({ ...r, ranks: { arms: rk(2, 4) } }, 'top5'), false, 'a sector of four has no top five');
  assert.equal(met({ ...r, ranks: { shipping: rk(1) } }, 'shipping_leader'), true); assert.equal(met({ ...r, ranks: { shipping: [{ m: 1, rank: 1, of: 8 }, { m: 2, rank: 2, of: 8 }] } }, 'shipping_leader'), false, 'two months running');
  assert.equal(met({ ...r, ranks: { farming: rk(3) } }, 'farm_major'), true); assert.equal(met({ ...r, ranks: { farming: rk(4) } }, 'farm_major'), false);
  assert.equal(met({ ...r, contracts: [{ value: 499999 }] }, 'aero_contract'), false); assert.equal(met({ ...r, contracts: [{ value: 500000 }] }, 'aero_contract'), true);
  // months
  const mo = (...nets) => nets.map((n) => ({ net: n, decisions: 1 }));
  assert.equal(met({ ...r, months: mo(5, 5, 5) }, 'cash_positive'), true); assert.equal(met({ ...r, months: mo(5, 5, -1) }, 'cash_positive'), false); assert.equal(met({ ...r, months: mo(5, 5) }, 'cash_positive'), false, 'three months of record');
  assert.equal(met({ ...r, months: [{ net: 5, decisions: 1 }, { net: 5, decisions: 0 }, { net: 5, decisions: 2 }] }, 'autonomous'), false, 'profit without the managers deciding anything is not autonomy');
  assert.equal(met({ ...r, months: mo(5, 5, 5) }, 'autonomous'), true);
  // portfolio, loans, war
  assert.equal(met({ ...r, portfolio: { tickers: 5, sectors: 3, value: 50000, gain: 0, since: null } }, 'diversified'), true); assert.equal(met({ ...r, portfolio: { tickers: 5, sectors: 2, value: 90000, gain: 0, since: null } }, 'diversified'), false);
  assert.equal(met({ ...r, portfolio: { tickers: 1, sectors: 1, value: 1, gain: 100, since: 100 } }, 'investor'), true, 'ahead, 100 days on');
  assert.equal(met({ ...r, portfolio: { tickers: 1, sectors: 1, value: 1, gain: 100, since: 150 } }, 'investor'), false, 'too soon'); assert.equal(met({ ...r, portfolio: { tickers: 1, sectors: 1, value: 1, gain: -5, since: 100 } }, 'investor'), false, 'behind');
  assert.equal(met({ ...r, loans: [{ principal: 100000, status: 'repaid', missed: 0 }] }, 'repaid'), true); assert.equal(met({ ...r, loans: [{ principal: 100000, status: 'repaid', missed: 1 }] }, 'repaid'), false); assert.equal(met({ ...r, loans: [{ principal: 99999, status: 'repaid', missed: 0 }] }, 'repaid'), false); assert.equal(met({ ...r, loans: [{ principal: 500000, status: 'open', missed: 0 }] }, 'repaid'), false, 'repaid, not borrowed');
  assert.equal(met({ ...r, expandedInWar: true }, 'war_expansion'), true);
  assert.equal(evaluate(r, { four: { day: 1 } }).some((x) => x.id === 'four'), false, 'an earned one is not asked again');
});

test('the service: nothing exists before the first award; awards are from real records, made once, kept in the save; a click or a hire alone earns nothing', () => {
  const g = newGame(5101);
  g.corp.ensureWorld(); g.player.money = 30_000_000;
  g.corp.milestones.dailyTick();
  assert.equal(g.corp.state.milestones, undefined, 'a bare game earns nothing and makes nothing');
  assert.equal(g.corp.milestones.view().every((m) => !m.earned), true);
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok && g.logistics.buyCompany().ok && g.aero.buyFirm().ok);
  const plots = Object.keys(g.farm.def.plots); assert.ok(g.farm.buy(plots[0]).ok);
  g.corp.milestones.dailyTick();
  assert.deepEqual(Object.keys(g.corp.state.milestones.earned), ['four'], 'owning the four is a fact in the records');
  const day1 = g.corp.state.milestones.earned.four.day;
  g.clock.total += 3 * 1440; g.corp.milestones.dailyTick();
  assert.equal(g.corp.state.milestones.earned.four.day, day1, 'awarded once, on the first day the records said so');
  assert.ok(g.world.tablet.feed.some((f) => f.app === 'milestones'), 'and said so');
  // forming the parent and bringing the four in
  assert.ok(g.corp.group.form().ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.join(id).ok);
  g.corp.milestones.dailyTick();
  assert.ok(g.corp.state.milestones.earned.parent && g.corp.state.milestones.earned.group);
  // hiring a good CFO earns the CFO milestone — but hiring managers does not earn delegation
  assert.ok(g.corp.contribute('parent', 3_000_000).ok);
  const pe = g.corp.personnel; pe.ensure();
  const c = pe.candidates().find((x) => x.roles.includes('cfo')); const r = pe.offer(c.id, { role: 'cfo', employer: 'parent', pay: c.floor + 5 });
  assert.ok(r.ok); for (const k of Object.keys(r.person.skills)) r.person.skills[k] = 90;
  g.corp.milestones.dailyTick();
  assert.ok(g.corp.state.milestones.earned.cfo, 'a CFO of skill 90, employed');
  assert.equal(g.corp.state.milestones.earned.delegated, undefined);
  assert.equal(g.corp.state.milestones.earned.autonomous, undefined);
  // the screen
  const v = g.corp.milestones.view();
  assert.equal(v.filter((m) => m.earned).length, 4); assert.ok(v.every((m) => m.name && m.text));
  // save and load keeps them, and a reload awards nothing twice
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 }); assert.ok(sm.load('slot1', h).ok);
  assert.deepEqual(h.corp.state.milestones.earned, g.corp.state.milestones.earned);
  const feed = h.world.tablet.feed.length; h.corp.milestones.dailyTick();
  assert.equal(h.world.tablet.feed.length, feed, 'nothing new on a reload');
});

test('the exchange keeps a record of your trades and a watchlist, saved with the rest', () => {
  const g = newGame(5102);
  g.corp.ensureWorld(); g.clock.total += 1440; g.corp.dailyTick(); g.player.money = 5_000_000;
  const row = g.corp.exchange.board().find((r) => r.source === 'generated');
  assert.deepEqual(g.corp.exchange.trades(), []);
  const before = g.player.money;
  assert.ok(g.corp.exchange.buy(row.ticker, 50).ok);
  assert.ok(g.corp.exchange.buy('OBRO', 2).ok, 'the three older shares are in it too, bought through the exchange');
  assert.ok(g.corp.exchange.sell(row.ticker, 20).ok);
  assert.equal(g.corp.exchange.buy(row.ticker, 0).ok, false);
  const t = g.corp.exchange.trades();
  assert.deepEqual(t.map((x) => [x.side, x.ticker, x.n]), [['buy', row.ticker, 50], ['buy', 'OBRO', 2], ['sell', row.ticker, 20]], 'a refused trade is not a trade');
  assert.ok(t.every((x) => x.day === g.clock.day && x.value > 0));
  assert.equal(t[0].value + t[1].value - t[2].value, Math.round(before - g.player.money), 'the record adds up to what left your wallet');
  assert.ok(g.corp.exchange.toggleWatch(row.ticker).on); assert.deepEqual(g.corp.exchange.watched(), [row.ticker]);
  assert.equal(g.corp.exchange.toggleWatch('NOPE').ok, false);
  const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 }); assert.ok(sm.load('slot1', h).ok);
  assert.deepEqual(h.corp.exchange.trades(), t); assert.deepEqual(h.corp.exchange.watched(), [row.ticker]);
  assert.equal(g.corp.exchange.toggleWatch(row.ticker).on, false); assert.deepEqual(g.corp.exchange.watched(), []);
});
