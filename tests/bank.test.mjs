// The First Bank of Halvermouth's policy rate (v0.68.0): it follows the wider world by a published rule once a month from the
// fourth month, moves a quarter-point at a time within fixed limits, and sets the rate everything else uses — exactly the old
// benchmark until it first meets, and exactly nothing at the neutral rate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { CORP } from '../src/content/corporate.js';
import { target, decide, valuationFactor, investShift, entryFactor, NEUTRAL, STEP, FLOOR, CEILING } from '../src/corp/bank.js';

const dayStart = (m) => 30 * m + 1;
const at = (g, d) => { g.clock.total = (d - 1) * 1440 + 8 * 60; g.corp.dailyTick(); };
function world(seed) { const g = newGame(seed); g.corp.ensureWorld(); at(g, 2); return g; }

test('pure: the target follows busyness, growth and distress; one step toward it, a half-point when far; limits and the words', () => {
  assert.equal(target({ util: 0.75, growth: 0, stress: 0 }), NEUTRAL, 'a normal economy is the neutral rate');
  assert.ok(target({ util: 0.95, growth: 0.05, stress: 0 }) > NEUTRAL);
  assert.ok(target({ util: 0.6, growth: -0.05, stress: 0.2 }) < NEUTRAL);
  assert.equal(target({ util: 1, growth: 5, stress: 0 }), 0.095, 'growth counts only up to 10%');
  assert.equal(target({ util: 0, growth: -1, stress: 1 }), FLOOR, 'never below the floor');
  const calm = { util: 0.75, growth: 0, stress: 0 };
  assert.equal(decide(0.05, calm).to, 0.05, 'a hold');
  assert.equal(target({ util: 0.78, growth: 0.02, stress: 0 }), 0.0575); assert.equal(decide(0.05, { util: 0.78, growth: 0.02, stress: 0 }).to, 0.0525, 'a quarter-point step');
  assert.equal(decide(0.05, { util: 0.95, growth: 0.04, stress: 0 }).to, 0.055, 'a point or more away: a half-point');
  assert.equal(decide(0.05, { util: 0.8, growth: 0.04, stress: 0 }).to, 0.055, 'a point or more away: a half-point step');
  assert.equal(decide(0.05, { util: 0.75, growth: 0.003, stress: 0 }).to, 0.05, 'within a quarter-point of the target: a hold');
  const d = decide(0.07, { util: 0.6, growth: -0.04, stress: 0.1 });
  assert.ok(d.to < 0.07 && d.to >= 0.065);
  assert.match(d.text, /lowered the policy rate from 7\.00% to 6\.\d+%: capacity in use 60%.*sales −4\.0%.*10% of companies in distress/);
  assert.match(decide(0.05, calm).text, /held the policy rate at 5\.00%/);
  for (const r of [0.01, 0.12]) { const x = decide(r, { util: r === 0.01 ? 0 : 1, growth: r === 0.01 ? -1 : 1, stress: r === 0.01 ? 1 : 0 }); assert.ok(x.to >= FLOOR && x.to <= CEILING); }
});

test('pure: the three effects are exactly nothing at the neutral rate and bounded either side', () => {
  assert.equal(valuationFactor(NEUTRAL), 1); assert.equal(investShift(NEUTRAL), 0); assert.equal(entryFactor(NEUTRAL), 1);
  assert.ok(valuationFactor(0.08) < 1 && valuationFactor(0.02) > 1);
  assert.equal(valuationFactor(0.5), 0.85); assert.equal(valuationFactor(-1), 1.15);
  assert.equal(investShift(0.5), 0.03); assert.equal(investShift(-1), -0.03);
  assert.equal(entryFactor(0.5), 0.7); assert.equal(entryFactor(-1), 1.3);
});

test('before the first meeting the rate is the old constant, nothing is made, and the loan rate is what it always was', () => {
  const g = world(2101);
  assert.equal(g.corp.bank.rate(), CORP.baseRate);
  for (let d = 3; d <= 90; d += 5) at(g, d);
  assert.equal(g.corp.state.bank, undefined, 'no state until the bank has met');
  assert.equal(g.corp.group.defaultRate(), 0.06);
});

test('the first meeting is on day 91: once a month after, whatever is saved or slept through, and each decision is written down', () => {
  const g = world(2102);
  at(g, 91);
  const st = g.corp.state.bank;
  assert.ok(st && st.decisions.length === 1 && st.lastMeeting === 3);
  assert.match(st.decisions[0].text, /First Bank of Halvermouth (held|raised|lowered)/);
  assert.equal(st.decisions[0].day, 91);
  at(g, 91); at(g, 100);
  assert.equal(st.decisions.length, 1, 'once a month');
  at(g, 121);
  assert.equal(st.decisions.length, 2);
  // a long sleep: one meeting, not five
  at(g, 400);
  assert.equal(st.decisions.length, 3);
  // saved and loaded: the month is not met twice
  const snap = JSON.parse(JSON.stringify(g.corp.state.bank));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  g2.clock.total = g.clock.total; g2.corp.dailyTick();
  assert.deepEqual(JSON.parse(JSON.stringify(g2.corp.state.bank)), snap);
});

/** The bank's meeting on the first day of month m, with the world as it stands that day (and `tamper` to make it so). */
function meet(g, m, tamper) {
  g.clock.total = (dayStart(m) - 1) * 1440 + 8 * 60;
  g.corp.generatedDay();
  tamper?.();
  g.corp.bank.dailyTick();
}

test('the rate follows the world: a distressed world takes it down, a busy one up — a step at a time, never outside the limits', () => {
  const lo = world(2103);
  meet(lo, 3, () => { for (const c of lo.corp.state.generated) if (c.status === 'active') c.status = 'distressed'; });
  assert.ok(lo.corp.state.bank.rate < 0.05, `${lo.corp.state.bank.rate}`);
  assert.ok(lo.corp.state.bank.decisions[0].stress > 0.5);
  const hi = world(2104);
  meet(hi, 3, () => { for (const c of hi.corp.state.generated) c.util = 0.98; });
  const d = hi.corp.state.bank.decisions[0];
  assert.ok(d.util > 0.9); assert.ok(hi.corp.state.bank.rate > 0.05, `${hi.corp.state.bank.rate}`);
  // a long run stays inside its limits and moves by whole quarter-points of at most half a point
  const g3 = world(2105);
  for (let m = 3; m <= 60; m++) meet(g3, m, () => { if (m % 7 === 0 || m % 11 === 0) for (const c of g3.corp.state.generated) c.util = 0.99; if (m % 13 === 0) for (const c of g3.corp.state.generated) if (c.status === 'active') c.status = 'distressed'; });
  const dec = g3.corp.state.bank.decisions;
  for (const x of dec) { assert.ok(x.to >= FLOOR - 1e-9 && x.to <= CEILING + 1e-9); assert.ok(Math.abs(x.to - x.from) <= 2 * STEP + 1e-9); assert.ok(Math.abs(Math.round(x.to / STEP) * STEP - x.to) < 1e-9); }
  assert.ok(dec.length <= 36, 'a bounded record');
  assert.ok(new Set(dec.map((x) => x.to)).size > 1, 'it does move');
});

test('the rate reaches what uses it: loans between your companies, the world\'s interest, valuations — and the world builds and enters less when money is dear', () => {
  const g = world(2106);
  at(g, 91);
  g.corp.state.bank.rate = 0.08;
  assert.equal(g.corp.group.defaultRate(), 0.09);
  assert.equal(g.corp.worldCtx(g.clock.day).rate, 0.08);
  const row = g.corp.registry().find((r) => r.kind === 'generated' && r.ticker);
  const v8 = g.corp.metricsOf(row).valuation;
  g.corp.state.bank.rate = 0.05;
  const v5 = g.corp.metricsOf(row).valuation;
  g.corp.state.bank.rate = 0.02;
  const v2 = g.corp.metricsOf(row).valuation;
  assert.ok(v8 !== null && v8 <= v5 && v5 <= v2, `${v8} ≤ ${v5} ≤ ${v2}`);
  assert.ok(v8 < v2);
  g.corp.state.bank.rate = 0.05;
  assert.equal(g.corp.metricsOf(row).valuation, v5, 'a pure function of the rate');
});

test('the rate moves share prices only through the books\' value, and nobody sets it', () => {
  const g = world(2107);
  const ex = g.corp.exchange; const t = ex.board().find((r) => r.source === 'generated').ticker;
  const l = ex.peek().listings[t];
  const fair0 = ex.fairOf(l, ex.rowsById().get(l.id));
  at(g, 91); g.corp.state.bank.rate = 0.09;
  const fair1 = ex.fairOf(l, ex.rowsById().get(l.id));
  assert.ok(fair1 < fair0 * 1.02 && fair1 !== null);
  assert.equal(typeof g.corp.bank.setRate, 'undefined', 'there is no way to set it');
});
