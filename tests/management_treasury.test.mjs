// Treasury (v0.65.0): a chief financial officer keeps each subsidiary's cash between a floor and a ceiling the owner set,
// moving it from and to the parent through the group's own transfers — by the same judgement, budget and approvals as
// every other decision. Moving cash is never sales or cost, and never creates or destroys any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import * as P from '../src/content/personnel.js';
import { MGMT } from '../src/content/management.js';
import { makeCandidate, rolesFor, floorPay } from '../src/corp/people.js';
import { judge, treasuryMove } from '../src/corp/management.js';
import { monthTotals } from '../src/corp/ledger.js';

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

/** A funded parent and a farming subsidiary with a CFO; the treasury budget and policy are the tests' to set. */
function group(seed, { opening = 20000, parent = 400000 } = {}) {
  const g = newGame(seed); g.player.money = 9e6;
  assert.ok(g.farm.buy('plot_east_1').ok);
  assert.ok(g.corp.group.form().ok);
  assert.ok(g.corp.contribute('parent', parent).ok);
  assert.ok(g.corp.group.join('farming', { opening }).ok);
  const x = staffWith(g, 'cfo', 'parent', BIG);
  return { g, x, M: g.corp.management, G: g.corp.group };
}
const total = (g) => g.corp.cashOf('parent') + g.corp.cashOf('farming');

test('pure: what the policy would move — top up to the floor, never below the parent\'s reserve; surplus repays loans first, then returns capital', () => {
  const pol = { floor: 50000, ceiling: 150000 };
  const s = { cash: 20000, parentCash: 400000, arrears: 0, minLiquidity: 2000, loans: [], capital: 20000 };
  assert.deepEqual(treasuryMove(pol, 100000, s, 1000), { kind: 'topup', amount: 30000 });
  assert.deepEqual(treasuryMove(pol, 390000, s, 1000), { kind: 'topup', amount: 10000 }, 'only 10,000 is free above the reserve: it tops up by that');
  assert.deepEqual(treasuryMove(pol, 380000, s, 1000), { kind: 'topup', amount: 20000 }, 'partial: what the reserve allows');
  assert.equal(treasuryMove(pol, 399500, s, 1000), null, 'under the least worth moving');
  assert.equal(treasuryMove(pol, 0, { ...s, cash: 50000 }, 1000), null, 'at the floor: nothing');
  assert.equal(treasuryMove(pol, 0, { ...s, cash: 150000 }, 1000), null, 'at the ceiling: nothing');
  const hi = { ...s, cash: 200000, capital: 30000, loans: [{ id: 'ln_2', outstanding: 5000 }, { id: 'ln_1', outstanding: 10000 }] };
  assert.deepEqual(treasuryMove(pol, 0, hi, 1000), { kind: 'sweep', amount: 45000, steps: [{ loan: 'ln_1', amount: 10000 }, { loan: 'ln_2', amount: 5000 }, { capital: 30000 }] });
  assert.equal(treasuryMove(pol, 0, { ...hi, cash: 160000 }, 1000).amount, 10000, 'only the surplus, loans first');
  assert.equal(treasuryMove(pol, 0, { ...hi, arrears: 1 }, 1000), null, 'never while it owes others');
  assert.equal(treasuryMove(pol, 0, { ...hi, minLiquidity: 190000 }, 1000).amount, 10000, 'never below the protected minimum');
  assert.equal(treasuryMove(null, 0, hi, 1000), null);
  assert.equal(judge({ kind: 'transfer', atWork: true, allowed: true, canTransfer: false, funded: true, cost: 1000, spendLimit: 9e9, approvalAbove: 9e9, cap: 9e9, spent: 0, affordable: true }).verdict, 'refuse');
});

test('policy bounds: only a subsidiary, a floor under the ceiling, the protected minimum, the parent\'s reserve', () => {
  const { g, M } = group(1901);
  assert.match(M.setTreasury('arms', { floor: 0, ceiling: 5000 }).text, /only for a subsidiary/);
  assert.match(M.setTreasury('farming', { floor: -1, ceiling: 5000 }).text, /floor/);
  assert.match(M.setTreasury('farming', { floor: 5000, ceiling: 5500 }).text, /at least 1,000 above/);
  assert.match(M.setTreasury('farming', { floor: 0, ceiling: 1500 }).text, /protected minimum/);
  assert.ok(M.setTreasury('farming', { floor: 50000, ceiling: 150000 }).ok);
  assert.match(M.setParentReserve(-5).text, /between 0/);
  assert.ok(M.setParentReserve(100000).ok);
  assert.ok(M.clearTreasury('farming').ok); assert.ok(!M.clearTreasury('farming').ok);
  const g2 = newGame(1902); assert.match(g2.corp.management.setParentReserve(5).text, /no parent/);
});

test('top-up: from the parent to the floor, through the group\'s own transfer — cash conserved, not sales, not a cost, and only with a budget, a policy and a permission', () => {
  const { g, x, M, G } = group(1903);
  M.setTreasury('farming', { floor: 50000, ceiling: 150000 }); M.setParentReserve(100000);
  const wallet = g.player.money; const before = total(g); const cap0 = G.parent.investments.farming.capital;
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 20000, 'no treasury budget yet: nothing moves');
  assert.match(M.status('farming', 'transfer').notes.join(' '), /No monthly budget/);
  M.setBudget('farming', 'treasury', 100000);
  x.authority.canTransfer = false; g.corp.personnel.epoch++;
  atDay(g, 3); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 20000); assert.equal(M.deciders('transfer', 'farming').length, 0);
  assert.match(M.status('farming', 'transfer').notes.join(' '), /permission to move cash/);
  x.authority.canTransfer = true; g.corp.personnel.epoch++;
  const months0 = JSON.stringify(g.corp.account('farming').months); const pc0 = g.corp.cashOf('parent');
  atDay(g, 4); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 50000, 'topped up to the floor');
  assert.equal(pc0 - g.corp.cashOf('parent'), 30000, 'taken from the parent');
  assert.equal(total(g), before, 'no cash created or destroyed');
  assert.equal(g.player.money, wallet);
  assert.equal(G.parent.investments.farming.capital - cap0, 30000, 'recorded as capital the parent put in');
  assert.equal(JSON.stringify(g.corp.account('farming').months), months0, 'not sales, not a cost: its months are untouched');
  assert.equal(M.spentIn('farming', 'treasury'), 30000);
  assert.equal(g.corp.state.transfers.at(-1).kind, 'capital');
  assert.match(M.peek().log.at(-1).text, /topped up by 30,000 from the parent/);
  M.dailyTick(); assert.equal(g.corp.cashOf('farming'), 50000, 'once a day, and nothing more is needed');
});

test('top-up never takes the parent below its reserve, and takes only what is free', () => {
  const { g, M } = group(1904, { parent: 170000 });
  M.setTreasury('farming', { floor: 190000, ceiling: 300000 }); M.setParentReserve(100000);
  M.setBudget('farming', 'treasury', 500000);
  const free = g.corp.cashOf('parent') - 100000; const had = g.corp.cashOf('farming');
  assert.ok(free > 1000 && free < 170000 - 20000);
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('parent'), 100000, 'down to the reserve and no further');
  assert.equal(g.corp.cashOf('farming'), had + free, 'only what was free');
  atDay(g, 3); M.dailyTick();
  assert.equal(g.corp.cashOf('parent'), 100000, 'and nothing more the next day');
});

test('sweep: the surplus above the ceiling repays what the subsidiary owes the parent first, then returns capital — never more than the parent put in, never while it owes others', () => {
  const { g, M, G } = group(1905, { opening: 20000 });
  assert.ok(G.capitalise('farming', 100000).ok);
  const loan = G.lend('farming', 30000, { termMonths: 6 });
  assert.ok(loan.ok, loan.text);
  M.setTreasury('farming', { floor: 20000, ceiling: 50000 }); M.setBudget('farming', 'treasury', 500000);
  const before = total(g); const cash = g.corp.cashOf('farming');
  assert.ok(cash > 100000);
  atDay(g, 2); M.dailyTick();
  const open = G.loansOf('farming').filter((l) => l.borrower === 'farming');
  assert.equal(open.length, 0, 'the loan is cleared first');
  assert.equal(g.corp.cashOf('farming'), 50000, 'down to the ceiling');
  assert.equal(total(g), before);
  const kinds = g.corp.state.transfers.slice(-2).map((t) => t.kind);
  assert.deepEqual(kinds, ['repayment', 'capital-return']);
  assert.ok(G.parent.investments.farming.capital >= 0);
  // owing others: nothing
  g.corp.account('farming').cash = 400000; g.corp.account('farming').arrears = 5;
  const n = g.corp.state.transfers.length;
  atDay(g, 3); M.dailyTick();
  assert.equal(g.corp.state.transfers.length, n);
  // never more than the capital the parent put in
  g.corp.account('farming').arrears = 0; G.parent.investments.farming.capital = 7000;
  atDay(g, 4); M.dailyTick();
  assert.equal(g.corp.state.transfers.at(-1).amount, 7000); assert.equal(G.parent.investments.farming.capital, 0);
});

test('the budget is a hard stop on cash moved; a move above the ask-above limit waits for you and is judged again when approved', () => {
  const { g, x, M } = group(1906);
  M.setTreasury('farming', { floor: 120000, ceiling: 300000 }); M.setBudget('farming', 'treasury', 50000);
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 20000, 'needs 100,000: over the 50,000 budget');
  assert.match(M.peek().log.at(-1).text, /pass the monthly budget/);
  M.setBudget('farming', 'treasury', 500000);
  x.authority.approvalAbove = 10000; g.corp.personnel.epoch++;
  atDay(g, 3); M.dailyTick();
  const q = M.peek().pending[0];
  assert.ok(q && q.kind === 'transfer' && q.item === 'topup' && q.cost === 100000); assert.equal(g.corp.cashOf('farming'), 20000);
  atDay(g, 4); M.dailyTick(); assert.equal(M.peek().pending.length, 1, 'once');
  g.corp.account('farming').cash = 60000; // the need has shrunk since it was asked
  const r = M.approve(q.id);
  assert.ok(r.ok, r.text);
  assert.equal(g.corp.cashOf('farming'), 120000, 'what is needed now: 60,000, not what was asked for');
  assert.equal(M.spentIn('farming', 'treasury'), 60000);
});

test('treasury does nothing when nothing is authorised: no policy, no budget, no CFO, an independent business; saves keep policies', () => {
  const { g, x, M } = group(1907);
  M.setBudget('farming', 'treasury', 500000);
  atDay(g, 2); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 20000, 'no policy');
  assert.match(M.status('farming', 'transfer').notes.join(' '), /No treasury policy/);
  M.setTreasury('farming', { floor: 50000, ceiling: 150000 });
  g.corp.personnel.dismiss(x.id);
  atDay(g, 3); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 20000, 'no chief financial officer');
  assert.match(M.status('farming', 'transfer').notes.join(' '), /chief financial officer/);
  const y = staffWith(g, 'cfo', 'parent', BIG);
  const snap = JSON.parse(JSON.stringify(g.corp.state.management));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.management)), snap);
  atDay(g, 4); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 50000);
  g2.clock.total = g.clock.total; g2.corp.management.dailyTick();
  assert.equal(g2.corp.cashOf('farming'), 50000, 'the same after a reload');
  void y;
  const solo = newGame(1908); solo.player.money = 9e6; solo.farm.buy('plot_east_1'); solo.corp.contribute('farming', 20000);
  assert.deepEqual(solo.corp.management.planTreasury('farming'), []);
  assert.match(solo.corp.management.status('farming', 'transfer').notes.join(' '), /Not in your group/);
});

test('a month of treasury moves leaves the group\'s results alone: only cash changes accounts', () => {
  const { g, M } = group(1909);
  M.setTreasury('farming', { floor: 50000, ceiling: 70000 }); M.setBudget('farming', 'treasury', 5e6);
  const before = total(g);
  for (let d = 2; d <= 20; d++) { atDay(g, d); if (d % 3 === 0) g.corp.account('farming').cash += 120000; M.dailyTick(); }
  const injected = 120000 * 6;
  assert.equal(Math.round(total(g)), Math.round(before + injected), 'every obol that moved is one that existed');
  const m = Math.floor((g.clock.day - 1) / 30);
  const t = monthTotals(g.corp.account('farming'), m);
  assert.equal(t.revenue, 0); assert.equal(t.opex, 0);
  assert.ok(Object.keys(MGMT).includes('minMove'));
});
