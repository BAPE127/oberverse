// Fire support (v0.102.1): artillery fire missions with shells from the stores, a strategic missile from the company's own stores, anti-air that can bring an aircraft pass down (and the real aircraft
// with it), a helicopter's station time. Everything is held for the battle, spent once on the end day, deterministic and in the order log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step, run, issue, callSupport, outcome, replay } from '../src/battle/sim.js';
import { TILE, ARTY } from '../src/content/battle.js';
import { idx } from '../src/battle/map.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const gun = { id: 'G1', name: 'Hammer SP gun', cls: 'artillery', type: 'hammer', armour: 2, firepower: 5, speed: 3 };
const mk = (o = {}) => buildSetup({ key: o.key || 'F1|x', eng: { goal: 'defence', recipe: 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 8, armour: 0, air: 0, skill: 1 } }, people: o.people || people(4), vehicles: o.vehicles ?? [gun], support: o.support, ai: { p: false, e: false } });
function stretch(B, len = 40) { const m = B.map; for (let y = 2; y < m.h - 2; y++) { let r = 0; for (let x = 1; x < m.w - 1; x++) { const t = m.tiles[idx(m, x, y)]; if ((t === TILE.GROUND || t === TILE.ROAD) && m.bid[idx(m, x, y)] < 0) { r++; if (r >= len) return { y, x0: x - len + 1 }; } else r = 0; } } throw new Error('no stretch'); }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const calm = (B) => { for (const u of B.units) u.W = { ...u.W, range: u.W.airOnly ? u.W.range : 0 }; };

test('a fire mission: a gun fires shells from the stores at a point, each takes its flight, lands scattered and hurts everyone in the blast; no shells, no fire; out of range, no fire', () => {
  const B = createBattle(mk({ support: { items: { item_artillery_shell: 3 }, air: [], strategic: [] } })); const s = stretch(B, 50); calm(B);
  const G = B.byId.get('G1'); assert.equal(G.arty, ARTY.hammer); put(G, s.x0 + 2.5, s.y + 0.5); const foes = B.units.filter((u) => u.side === 'e'); foes.slice(0, 7).forEach((u, i) => put(u, s.x0 + 30 + (i % 4) * 0.7, s.y + 0.5 + Math.floor(i / 4) * 0.7)); put(foes[7], 110, 5); // (one stands far off, so the battle goes on)
  for (const u of B.units) if (u.side === 'p' && u !== G) put(u, s.x0 + 2, s.y + 3); put(B.byId.get('p1'), s.x0 + 24, s.y + 0.5); B.byId.get('p1').sight = 14; // a spotter who sees the point
  issue(B, ['G1'], { type: 'fire', x: s.x0 + 30.5, y: s.y + 0.8 }); run(B, 8); assert.ok(B.pend.some((p) => p.kind === 'shell'), 'a shell is in the air'); assert.equal(B.counts.items.item_artillery_shell, 1);
  run(B, 400); const hits = B.events.filter((e) => e.k === 'blast'); assert.equal(hits.length, 3, 'three shells, three blasts, and then no more'); assert.equal(B.sup.items.item_artillery_shell, 0); assert.ok(B.events.some((e) => e.k === 'noshells'), 'it says it is out');
  assert.ok(foes.slice(0, 7).filter((u) => u.hp < u.hpMax).length >= 4, 'the enemy at the point is hurt'); assert.deepEqual(outcome(B).used.items, { item_artillery_shell: 3 });
  const C = createBattle(mk({ support: { items: { item_artillery_shell: 3 }, air: [] } })); const s2 = stretch(C, 70); calm(C); put(C.byId.get('G1'), s2.x0 + 1.5, s2.y + 0.5); issue(C, ['G1'], { type: 'fire', x: s2.x0 + 65, y: s2.y + 0.5 }); run(C, 30); assert.equal(C.counts.items.item_artillery_shell || 0, 0, 'out of range: no shell is wasted'); assert.ok(C.events.some((e) => e.k === 'outofrange'));
});

test('a spotter cuts the scatter: shells fired at a point someone can see land closer than shells fired blind', () => {
  const miss = (spotted) => { let total = 0; for (let k = 0; k < 6; k++) { const B = createBattle(mk({ key: `F2|${k}`, support: { items: { item_artillery_shell: 24 }, air: [] }, enemy: { troops: 1, armour: 0, air: 0, skill: 1 } })); B.units.filter((u) => u.side === 'e').forEach((u) => put(u, 100, 5)); const s = stretch(B, 60); calm(B); const G = B.byId.get('G1'); put(G, s.x0 + 1.5, s.y + 0.5); const P = B.byId.get('p0'); put(P, spotted ? s.x0 + 22 : s.x0 + 1, spotted ? s.y + 0.5 : s.y + 4); for (const u of B.units) if (u.side === 'p' && u !== G && u !== P) put(u, s.x0 + 1, s.y + 5);
    const tx = s.x0 + 30; const ty = s.y + 0.5; issue(B, ['G1'], { type: 'fire', x: tx, y: ty }); run(B, 700); for (const e of B.events.filter((q) => q.k === 'blast')) total += Math.hypot(e.x - tx, e.y - ty); } return total; };
  const a = miss(true); const b = miss(false); assert.ok(a < b * 0.6, `spotted ${a.toFixed(1)} against blind ${b.toFixed(1)}`);
});

test('a strategic missile from the stores: twenty seconds, a huge blast, the record used up; two battles cannot be offered the same one; the real record is destroyed on the end day', async () => {
  const { armedCompany, days, storeMissile } = await import('./war_helpers.mjs');
  const { g, C, eng, squads } = armedCompany(1201);
  const rec = storeMissile(g); assert.ok(g.war.transfer({ source: 'aero', ref: rec.id }).ok); const mid = C.equipment.find((x) => x.kind === 'missile').id;
  assert.ok(g.war.playEngagement(eng.id, squads).ok); const setup = eng.battle.setup; assert.deepEqual(setup.support.strategic.map((m) => m.id), [mid]);
  assert.ok(!g.war.giveBack({ id: mid }).ok && /set aside/.test(g.war.giveBack({ id: mid }).text), 'it cannot go back to Aerospace meanwhile');
  const B = createBattle({ ...setup, ai: { p: false, e: false } }); const foe = B.units.find((u) => u.side === 'e'); const far = { x: foe.x, y: foe.y }; assert.ok(callSupport(B, { kind: 'strategic', x: far.x, y: far.y }).ok); assert.ok(!callSupport(B, { kind: 'strategic', x: 5, y: 5 }).ok, 'only one in the stores');
  run(B, 150); assert.equal(B.events.filter((e) => e.k === 'blast').length, 0, 'twenty seconds: not yet'); run(B, 100); assert.equal(B.events.filter((e) => e.k === 'blast').length, 1); assert.ok(!foe.alive, 'whoever stood there is gone');
  while (!B.over) step(B); const o = outcome(B); assert.deepEqual(o.used.strategic, [mid]); assert.ok(g.war.fileBattle(eng.id, o).ok); days(g, 8); assert.equal(eng.state, 'resolved'); assert.equal(C.equipment.find((x) => x.id === mid).status, 'destroyed'); assert.equal(eng.result.used['Strategic missiles'], 1); assert.deepEqual(g.war.check(), []);
});

test('anti-air: a pass inside a live gun\'s reach can be shot down (the aircraft is lost, on the end day, with a line in the report); with no gun it never is; the gun fires at helicopters, not at people', async () => {
  const withAA = (aa, key) => { const setup = mk({ key, support: { items: {}, air: [{ id: 'E7', name: 'Hammer bomber', kind: 'bomber' }] }, enemy: { troops: 6, armour: 0, air: 0, aa, skill: 1 } }); const B = createBattle(setup); const s = stretch(B, 40); calm(B); const gunners = B.units.filter((u) => u.W.airOnly);
    gunners.forEach((u, i) => put(u, s.x0 + 18 + i, s.y + 0.5)); B.units.filter((u) => u.side === 'e' && !u.W.airOnly).forEach((u, i) => put(u, s.x0 + 20 + (i % 3), s.y + 2)); for (const u of B.units) if (u.side === 'p') put(u, s.x0 + 1, s.y + 6);
    callSupport(B, { kind: 'bomber', x: s.x0 + 19, y: s.y + 0.5 }); run(B, 140); return B; };
  let lost = 0; let kept = 0; for (let k = 0; k < 14; k++) { const B = withAA(2, `AA|${k}`); if (B.counts.airLost.length) { lost++; assert.ok(B.events.some((e) => e.k === 'shotdown')); assert.deepEqual(outcome(B).used.airLost, ['E7']); } else kept++; }
  assert.ok(lost >= 3 && kept >= 2, `some are shot down, some are not (${lost} lost, ${kept} kept)`);
  for (let k = 0; k < 6; k++) assert.equal(withAA(0, `AA0|${k}`).counts.airLost.length, 0, 'no gun, no loss');
  const B = createBattle(mk({ enemy: { troops: 4, armour: 0, air: 0, aa: 1, skill: 1 }, vehicles: [{ id: 'H1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 }] })); const s = stretch(B, 40); const aa = B.units.find((u) => u.W.airOnly); const h = B.byId.get('H1');
  put(aa, s.x0 + 10, s.y + 0.5); put(h, s.x0 + 14, s.y + 0.5); const rif = B.byId.get('p0'); put(rif, s.x0 + 12, s.y + 1); for (const u of B.units) if (u.side === 'e' && u !== aa) { u.W = { ...u.W, range: 0 }; put(u, s.x0 + 38, s.y + 6); }
  run(B, 12); assert.equal(aa.target, 'H1', 'it looks up, not at the rifleman next to it'); run(B, 40); assert.ok(h.hp < h.hpMax, 'and hits the helicopter'); assert.equal(rif.hp, rif.hpMax);
  const { armedCompany, days } = await import('./war_helpers.mjs'); const { g, C, eng, squads } = armedCompany(1202); C.equipment.push({ id: 'Ea1', kind: 'aircraft', type: 'bm_hammer_bomber', name: 'Hammer bomber', source: 'aero', origin: null, location: 'facility:hangars', status: 'stored', assignedTo: null, day: 1 }); g.war.buySupply('fuel', 40);
  assert.ok(g.war.playEngagement(eng.id, squads).ok); assert.deepEqual(eng.battle.setup.support.air.map((a) => a.id), ['Ea1']); const BB = createBattle({ ...eng.battle.setup, ai: { p: true, e: true } }); BB.counts.air.push({ id: 'Ea1', kind: 'bomber' }); BB.counts.airLost.push('Ea1'); BB.over = true; BB.why = 'time';
  assert.ok(g.war.fileBattle(eng.id, outcome(BB)).ok); days(g, 8); assert.equal(C.equipment.find((x) => x.id === 'Ea1').status, 'destroyed'); assert.ok(eng.result.lines.some((l) => /Shot down and lost: Hammer bomber/.test(l)));
});

test('a helicopter has its station time (from rules 3): then it goes home; under older rules it stays', () => {
  const heli = { id: 'H1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 };
  const B = createBattle(mk({ vehicles: [heli] })); const H = B.byId.get('H1'); assert.ok(H.fuelT > 1000); for (const u of B.units) u.W = { ...u.W, range: 0 }; run(B, 1600); assert.ok(B.events.some((e) => e.k === 'bingo' && e.id === 'H1')); assert.ok(H.fled || H.order.type === 'retreat', 'it heads home');
  const old = mk({ vehicles: [heli] }); delete old.rules; old.map.ver = 2; const O = createBattle(old); assert.equal(O.rules, 2); assert.equal(O.byId.get('H1').fuelT, null, 'older rules: no limit'); const older = JSON.parse(JSON.stringify(old)); older.units = older.units.map((u) => ({ ...u })); assert.equal(createBattle(older).byId.get('G1')?.arty ?? null, null);
});

test('fire missions are in the log and replay exactly', () => {
  const setup = mk({ key: 'F9|r', support: { items: { item_artillery_shell: 6 }, air: [] }, enemy: { troops: 10, armour: 0, air: 0, skill: 1 } }); const B = createBattle(setup); const e = B.map.spawns.e;
  run(B, 30); issue(B, ['G1'], { type: 'fire', x: B.map.spawns.p.x + 30, y: B.map.spawns.p.y }); run(B, 300); assert.ok(B.counts.items.item_artillery_shell >= 1); const R = replay(setup, B.log, B.tick); const snap = (X) => JSON.stringify(X.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), Math.round(u.hp), u.alive])); assert.equal(snap(R), snap(B)); assert.deepEqual(R.counts.items, B.counts.items);
});

test('anti-air is not a force on the ground: a battle with enemy guns ends as it would without them (they do not hold a zone and need not be put out)', () => {
  const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 8 === 0 ? 'machine_gunner' : i % 9 === 0 ? 'anti_tank' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const wins = (aa) => { let w = 0; for (let k = 0; k < 8; k++) for (const goal of ['offence', 'defence']) { const B = createBattle(buildSetup({ key: `AAx${k}|${goal}`, eng: { goal, recipe: k % 2 ? 'city' : 'fields', biome: 'rural', style: 'halvermouth', enemy: { troops: 10, armour: 0, air: 0, aa, skill: 1 } }, people: people(12), vehicles: [], ai: { p: true, e: true } })); while (!B.over) step(B); assert.notEqual(B.why, 'time', `${goal}/${k}: it does not drag on to the clock for want of killing a gun`); if (outcome(B).objectives >= 2) w++; } return w; };
  assert.ok(Math.abs(wins(2) - wins(0)) <= 1, 'the same fights are won');
});
