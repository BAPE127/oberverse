// Saved battles stay the same battles (v0.102.1): a setup says which map generation and which rules it was made under, and replays under them. The numbers below were produced by the code of
// v0.101.0 and of v0.102.0 themselves (a setup without `map.ver` is a v0.101.0 one; one with ver 2 and no `rules` is a v0.102.0 one) and are pinned here: if a change to the maps or the rules
// moves one, this test fails and the change must be gated on `rules` or the map version instead of being let through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/battle/map.js';
import { createBattle, step, issue, callSupport, callReserve, replay } from '../src/battle/sim.js';
import { buildSetup } from '../src/battle/setup.js';

const hs = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; };
const snap = (B) => `${hs(JSON.stringify(B.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), u.z, Math.round(u.hp), u.alive, u.fled, ...(B.rules >= 3 ? [u.stab] : [])])))}:${B.tick}`;

test('the maps of the first two generations are exactly what they were', () => {
  const o = {};
  for (const ver of [1, 2]) for (const recipe of ['city', 'fields']) { const m = generate({ recipe, seed: 'golden', style: 'ostmark', biome: 'rural', ver }); o[`${ver}/${recipe}`] = hs(Array.from(m.tiles).join('') + JSON.stringify(m.props || []) + JSON.stringify(m.buildings) + JSON.stringify(m.cars || []) + (m.surf ? Array.from(m.surf).join('') : '')); }
  assert.deepEqual(o, { '1/city': -992802901, '1/fields': 242446234, '2/city': -2036076262, '2/fields': -457544648 });
});

const people = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 ? 'engineer' : i % 6 === 1 ? 'machine_gunner' : i % 6 === 2 ? 'anti_tank' : i % 6 === 3 ? 'medic' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const vehicles = [{ id: 'v1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }, { id: 'v2', name: 'Wren', cls: 'helicopter', armour: 1, firepower: 1, speed: 5 }];

test('a battle saved by v0.101.0 or by v0.102.0 (no rules in its setup) is played again to the same positions and hit points, orders and support included', () => {
  const want = { 'v1/city': '-801158747:700', 'v1/fields': '-1262317510:700', 'v2/city': '1554645892:700', 'v2/fields': '-877827878:700' };
  const got = {};
  for (const gen of ['v1', 'v2']) for (const recipe of ['city', 'fields']) {
    const setup = JSON.parse(JSON.stringify(buildSetup({ key: `frozen|${gen}|${recipe}`, eng: { goal: 'defence', recipe, biome: 'rural', style: 'ostmark', enemy: { troops: 12, armour: 1, air: 1, skill: 1 } }, people, vehicles, support: { items: { item_missile_guided: 1 }, air: [] }, ai: { p: true, e: true } })));
    delete setup.rules; setup.map.ver = 2; if (gen === 'v1') { delete setup.map.ver; delete setup.support; }
    const B = createBattle(setup);
    for (let i = 0; i < 700 && !B.over; i++) { if (i === 150) issue(B, ['p0', 'p1'], { type: 'move', x: B.map.objective.x, y: B.map.objective.y }); if (i === 200 && gen === 'v2') { const e = B.units.find((u) => u.side === 'e' && u.alive); if (e) callSupport(B, { kind: 'item_missile_guided', x: e.x, y: e.y }); } step(B); }
    assert.equal(snap(replay(setup, B.log, B.tick)), snap(B), `${gen}/${recipe} replays`); got[`${gen}/${recipe}`] = snap(B);
  }
  assert.deepEqual(got, want);
});

// ---- v0.102.1 (rules 3): pinned from the code of that release, with a fire mission, a medic, a missile, an anti-air gun and a helicopter
test('the three recipes of v0.102.1 are exactly what they were, and a battle made under rules 3 plays on as it was played', () => {
  const o = {};
  for (const recipe of ['trench', 'compound', 'forest']) { const m = generate({ recipe, seed: 'golden', style: 'ostmark', biome: 'rural', ver: 2 }); o[`map/${recipe}`] = hs(Array.from(m.tiles).join('') + JSON.stringify(m.props) + JSON.stringify(m.buildings) + JSON.stringify(m.cars) + Array.from(m.surf).join('') + JSON.stringify(m.decor || {})); }
  assert.deepEqual(o, { 'map/trench': 983933689, 'map/compound': 730894628, 'map/forest': -1291286543 });
  const people3 = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 ? 'engineer' : i === 1 ? 'medic' : i === 2 ? 'uav' : i % 6 === 3 ? 'machine_gunner' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const vehicles3 = [{ id: 'v1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }, { id: 'g1', name: 'Hammer', cls: 'artillery', type: 'hammer', armour: 2, firepower: 5, speed: 3 }, { id: 'h1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 }];
  const want = { city: '-779594545:700', trench: '1849248883:700' };
  for (const recipe of ['city', 'trench']) {
    const setup = JSON.parse(JSON.stringify(buildSetup({ key: `r3|${recipe}`, eng: { goal: 'defence', recipe, biome: 'rural', style: 'ostmark', enemy: { troops: 12, armour: 1, air: 1, aa: 1, skill: 1 } }, people: people3, vehicles: vehicles3, support: { items: { item_artillery_shell: 6, item_missile_guided: 1, item_breach_charge: 1 }, air: [], strategic: [] }, ai: { p: true, e: true } })));
    setup.rules = 3; setup.map.ver = 2; const B = createBattle(setup);
    for (let i = 0; i < 700 && !B.over; i++) { if (i === 100) issue(B, ['g1'], { type: 'fire', x: B.map.spawns.p.x + 25, y: B.map.spawns.p.y }); if (i === 150) issue(B, ['p1'], { type: 'tend' }); if (i === 200) { const e = B.units.find((u) => u.side === 'e' && u.alive); if (e) callSupport(B, { kind: 'item_missile_guided', x: e.x, y: e.y }); } step(B); }
    assert.equal(snap(replay(setup, B.log, B.tick)), snap(B), `${recipe} replays`); assert.equal(snap(B), want[recipe], `${recipe}: the battle of a rules-3 setup is what it was`);
  }
});

// ---- v0.102.2 (rules 4): pinned from the code of that release, with a battery that answers, a rocket launcher, a designated missile, a stance, a reserve and an extraction
test('a battle made under rules 4 (v0.102.2) plays on as it was played', () => {
  const people4 = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 ? 'engineer' : i === 1 ? 'medic' : i % 6 === 3 ? 'machine_gunner' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const vehicles4 = [{ id: 'v1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }, { id: 'r1', name: 'Rainmaker', cls: 'artillery', type: 'rainmaker', armour: 2, firepower: 5, speed: 3 }, { id: 'g1', name: 'Hammer', cls: 'artillery', type: 'hammer', armour: 2, firepower: 5, speed: 3 }];
  const want = { 'city/defence': '-1593734039:700', 'trench/offence': '1331828643:700', 'forest/extract': '336952670:697' };
  for (const [recipe, goal] of [['city', 'defence'], ['trench', 'offence'], ['forest', 'extract']]) {
    const setup = JSON.parse(JSON.stringify(buildSetup({ key: `r4|${recipe}`, eng: { goal, recipe, biome: 'rural', style: 'ostmark', enemy: { troops: 18, armour: 1, air: 0, battery: 1, skill: 1 } }, people: people4, vehicles: vehicles4, reserve: ['p9', 'p10', 'p11'], support: { items: { item_artillery_shell: 9, item_missile_guided: 1 }, air: [], strategic: [] }, ai: { p: true, e: true } })));
    setup.rules = 4; setup.map.ver = 2; // (RULES moved to 5: this battle is pinned to the rules it was made under)
    const B = createBattle(setup);
    for (let i = 0; i < 700 && !B.over; i++) { if (i === 60) issue(B, ['p2'], { type: 'stance', stance: 'defensive' }); if (i === 100) issue(B, ['g1', 'r1'], { type: 'fire', x: B.map.spawns.e.x - 20, y: B.map.spawns.e.y }); if (i === 250) { const e = B.units.find((u) => u.side === 'e' && u.alive && !u.battery); if (e) callSupport(B, { kind: 'item_missile_guided', x: e.x, y: e.y }); } if (i === 300) callReserve(B); step(B); }
    assert.equal(snap(replay(setup, B.log, B.tick)), snap(B), `${recipe} replays`); assert.equal(snap(B), want[`${recipe}/${goal}`], `${recipe}/${goal}: the battle of a rules-4 setup is what it was`);
  }
});
