// The played battle and the aggregate resolver must agree about what a force is worth (v0.101.0): the same tables behind both, and a test that holds the played battle to the estimate. Run headless,
// AI against AI, on many seeds at several odds, for both ways a fight can go (hold a place, take a place). If this fails, recalibrate src/content/battle.js or the constants in src/war/combat.js;
// do not loosen the test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, runToEnd, outcome } from '../src/battle/sim.js';
import { estimate } from '../src/war/combat.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 8 === 0 ? 'machine_gunner' : i % 9 === 0 ? 'anti_tank' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));

function table(T, seeds) {
  const rows = {};
  for (const goal of ['defence', 'offence']) {
    let w1 = 0; let w2 = 0; let dead = 0; const t0 = Date.now();
    for (let s = 0; s < seeds; s++) {
      const setup = buildSetup({ key: `Cal${s}|${goal}`, eng: { goal, recipe: s % 2 ? 'city' : 'fields', biome: 'rural', style: 'halvermouth', enemy: { troops: T, armour: 0, air: 0, skill: 1 } }, people: people(12), vehicles: [], ai: { p: true, e: true } });
      const B = createBattle(setup); runToEnd(B); const o = outcome(B); if (o.objectives >= 1) w1++; if (o.objectives >= 2) w2++; dead += o.dead.length;
    }
    rows[goal] = { w1: w1 / seeds, w2: w2 / seeds, dead: dead / seeds, ms: Date.now() - t0 };
  }
  const e = estimate({ key: 'x', days: 14, terrain: 'rural', goal: 'defence', enemy: { troops: T, armour: 0, air: 0, skill: 1 }, people: people(12), vehicles: [], general: null, supplies: {} });
  return { rows, est: e };
}

test('what the played battle says a force is worth follows the estimate: the chance of holding rises with the odds, and sits within a loose band of the aggregate resolver at each; losses are the same order', () => {
  const seeds = 14; const sizes = [6, 12, 16, 22]; const out = [];
  for (const T of sizes) out.push({ T, ...table(T, seeds) });
  const mean = (o) => (o.rows.defence.w1 + o.rows.offence.w1) / 2;
  for (let i = 1; i < out.length; i++) assert.ok(mean(out[i]) <= mean(out[i - 1]) + 0.05, `a bigger enemy never makes it easier: ${out.map((o) => mean(o).toFixed(2)).join(' ')}`);
  assert.ok(mean(out[0]) > 0.9 && mean(out.at(-1)) < 0.35, `the extremes: ${mean(out[0])} .. ${mean(out.at(-1))}`);
  for (const o of out) {
    assert.ok(Math.abs(mean(o) - o.est.chance.atLeast[1]) <= 0.3, `enemy ${o.T}: played ${mean(o).toFixed(2)} against estimated ${o.est.chance.atLeast[1].toFixed(2)}`);
    const played = (o.rows.defence.dead + o.rows.offence.dead) / 2; const est = o.est.expected.dead;
    assert.ok(played <= est * 3 + 1.2 && played >= est / 3 - 0.8, `enemy ${o.T}: ${played.toFixed(1)} dead played, ${est.toFixed(1)} estimated`);
    for (const g of ['defence', 'offence']) assert.ok(o.rows[g].ms < 6000, `${g}: ${o.rows[g].ms} ms for ${seeds} battles`);
  }
});
