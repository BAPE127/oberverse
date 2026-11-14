// Prints how the played battle goes headless (the way the strategic layer runs it when the player is not at the controls), under different rules versions, so a change to the simulation can be
// seen in its results: player win rate (two objectives of three), the primary objective, mean losses on each side, mean length, and (rules 5) how often the enemy flanked, fell back, counter-attacked,
// investigated a sound, bounded, threw smoke or called its battery.
//   node tools/battle-audit.mjs [--seeds 40] [--rules 3,4,5] [--recipes city,fields] [--goals defence,offence] [--cost]
// `--cost` prints the mean milliseconds a step takes on the largest recipe with a full force.
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step, runToEnd, outcome } from '../src/battle/sim.js';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SEEDS = Number(arg('seeds', 40)); const RULES = arg('rules', '3,4,5').split(',').map(Number);
const RECIPES = arg('recipes', 'city,fields,trench,compound,forest').split(','); const GOALS = arg('goals', 'defence,offence,raid,extract,rescue,logistics').split(',');
const ROLES = ['rifleman', 'machine_gunner', 'rifleman', 'anti_tank', 'rifleman', 'medic', 'rifleman', 'marksman', 'rifleman', 'engineer', 'rifleman', 'officer'];
const people = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: ROLES[i], tier: 2, armour: 1, exp: 2, morale: 70, fatigue: 0, armed: true }));
const vehicles = [{ id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 }, { id: 'C1', name: 'Wolf', cls: 'carrier', type: 'wolf', armour: 2, firepower: 1, speed: 3 }];
export const make = (recipe, goal, seed, rules, extra = {}) => {
  const setup = buildSetup({ key: `AU|${recipe}|${goal}|${seed}`, eng: { goal, recipe, biome: 'rural', style: recipe === 'city' ? 'halvermouth' : 'sund', intel: 1, enemy: { troops: 14, armour: 1, air: 0, battery: 1, skill: 1, ...extra } }, people, vehicles, support: { items: {}, air: [] }, ai: { p: true, e: true } });
  setup.rules = rules; if (rules < 5) setup.map.ver = 2; delete setup.plan; return setup;
};
function runOne(setup) { const B = createBattle(setup); runToEnd(B); const o = outcome(B); return { B, o }; }
const pct = (x) => `${Math.round(x * 100)}%`.padStart(4); const f1 = (x) => x.toFixed(1).padStart(5);
const rows = [];
for (const recipe of RECIPES) for (const goal of GOALS) {
  const line = { recipe, goal, r: {} };
  for (const rules of RULES) {
    let win = 0; let prim = 0; let own = 0; let foe = 0; let ticks = 0; const st = { flanks: 0, fallbacks: 0, counters: 0, investigations: 0, bounds: 0, smokes: 0, battery: 0 };
    for (let s = 0; s < SEEDS; s++) {
      const { B, o } = runOne(make(recipe, goal, s, rules)); if (o.objectives >= 2) win++; if (o.objectivesMet[0]) prim++; own += o.parts.own / Math.max(1, o.parts.ownOf); foe += o.parts.killed / Math.max(1, o.parts.of); ticks += o.parts.ticks;
      if (rules >= 5) for (const k of Object.keys(st)) st[k] += B.stats[k] || 0;
    }
    line.r[rules] = { win: win / SEEDS, prim: prim / SEEDS, own: own / SEEDS, foe: foe / SEEDS, ticks: ticks / SEEDS, st: Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v / SEEDS])) };
  }
  rows.push(line);
  const cells = RULES.map((r) => { const x = line.r[r]; return `r${r}: win ${pct(x.win)} prim ${pct(x.prim)} own ${pct(x.own)} foe ${pct(x.foe)} len ${String(Math.round(x.ticks)).padStart(4)}`; }).join(' | ');
  const x5 = line.r[5]; const extra = x5 ? ` | flank ${f1(x5.st.flanks)} fall ${f1(x5.st.fallbacks)} counter ${f1(x5.st.counters)} invest ${f1(x5.st.investigations)} bound ${f1(x5.st.bounds)} smoke ${f1(x5.st.smokes)} bat ${f1(x5.st.battery)}` : '';
  const shift = RULES.includes(4) && x5 ? Math.round((x5.win - line.r[4].win) * 100) : null;
  console.log(`${recipe.padEnd(8)} ${goal.padEnd(9)} ${cells}${extra}${shift !== null ? ` | win 5-4: ${shift >= 0 ? '+' : ''}${shift}` : ''}`);
}
if (RULES.includes(4) && RULES.includes(5)) { const big = rows.filter((l) => Math.abs(l.r[5].win - l.r[4].win) > 0.1); console.log(`\n${big.length} of ${rows.length} recipe/goal pairs move the headless win rate by more than 10 points between rules 4 and 5.`); }
if (process.argv.includes('--cost')) {
  for (const rules of RULES) {
    const setup = make('forest', 'offence', 1, rules, { troops: 40, armour: 3, air: 1 }); const B = createBattle(setup); let n = 0; const t0 = process.hrtime.bigint();
    while (!B.over && n < 1500) { step(B); n++; } const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`step cost, rules ${rules}, forest (the largest), 40 troops + armour: ${(ms / n).toFixed(3)} ms a step over ${n} steps`);
  }
}
