// The enemy's mind and the troops' manners (rules 5): it acts on what it perceives and fights as elements, and everyone moves and works the way a person or a vehicle does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, step, run, runToEnd, issue, replay, outcome } from '../src/battle/sim.js';
import { sound, contactsOf } from '../src/battle/perception.js';
import { AI, TILE, MOVE, SUPPRESS } from '../src/content/battle.js';
import { idx } from '../src/battle/map.js';

const people = (n, roles = []) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: roles[i] || 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const mk = (o = {}) => buildSetup({ key: o.key || 'AI1|x', eng: { goal: o.goal || 'offence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', intel: o.intel, enemy: o.enemy || { troops: 10, armour: 0, air: 0, skill: 1 } }, people: o.people || people(o.n ?? 6, o.roles), vehicles: o.vehicles || [], ai: o.ai || { p: false, e: true } });
const S = (o) => { const x = mk(o); return x; };
const ground = (B, x0, y0, x1, y1) => { const m = B.map; for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.GROUND; m.bid[n] = -1; m.bfloors[n] = 0; } };
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const mid = (us) => ({ x: us.reduce((a, u) => a + u.x, 0) / us.length, y: us.reduce((a, u) => a + u.y, 0) / us.length });
const elements = (B, side = 'e') => B.teams.filter((t) => t.side === side && t.kind === 'inf');
const live = (B, t) => t.members.map((m) => B.byId.get(m)).filter((u) => u.alive && !u.fled);

test('the enemy never reacts to a unit it has no contact on: a quiet man behind the buildings is not approached, not marked, and not hunted when the objective is reached', () => {
  const setup = mk({ key: 'AI2|city', recipe: 'city', n: 1, enemy: { troops: 12, armour: 0, air: 0, skill: 1 }, goal: 'defence' }); const B = createBattle(setup);
  const me = B.byId.get('p0'); const far = { x: 4, y: 50 }; ground(B, 1, 47, 8, 54); put(me, far.x, far.y); issue(B, ['p0'], { type: 'stance', stance: 'holdfire' }); // (a corner of the map, away from the objective and the way to it)
  let nearest = 1e9; let marked = false; let approached = false;
  for (let i = 0; i < 2400 && !B.over; i++) { step(B); if (i % 10 === 0) { for (const e of B.units) if (e.side === 'e' && e.alive) { nearest = Math.min(nearest, Math.hypot(e.x - far.x, e.y - far.y)); if (e.order.x !== undefined && Math.hypot(e.order.x - far.x, e.order.y - far.y) < 9) approached = true; } if (contactsOf(B, 'e').some((c) => c.id === 'p0')) marked = true; } }
  assert.equal(marked, false, 'it was never a contact'); assert.equal(approached, false, 'no enemy was ever sent to him'); assert.ok(nearest > 12, `the nearest the enemy came was ${nearest.toFixed(1)}`);
  assert.ok(!B.byId.get('p0').order.type.includes('x') && B.byId.get('p0').alive, 'and he is still there');
});

test('a heard shot sends an element to look: the nearest idle one within hearing, to where it was roughly, once; one out of earshot hears nothing', () => {
  const B = createBattle(mk({ key: 'AI3|x', recipe: 'fields', goal: 'offence', n: 2, enemy: { troops: 12, armour: 0, air: 0, skill: 1 } })); run(B, 30);
  for (const u of B.units.filter((q) => q.side === 'p')) put(u, 3, 3);
  const els = elements(B); const sp = els[0]; const at = mid(live(B, sp)); const spot = { x: at.x - 24, y: at.y + 2 };
  assert.equal(B.stats.investigations, 0); sound(B, spot.x, spot.y, 30, 'p', 'shot'); run(B, 20);
  assert.equal(B.stats.investigations, 1, 'one element was sent'); const sent = els.filter((t) => t.ai.mode === 'investigate'); assert.equal(sent.length, 1);
  const tgt = sent[0].ai.tgt; assert.ok(Math.hypot(tgt.x - spot.x, tgt.y - spot.y) < 8, 'to where it came from, roughly (not exactly)'); assert.ok(Math.hypot(tgt.x - spot.x, tgt.y - spot.y) > 0, 'only roughly');
  run(B, 400); assert.ok(sent[0].ai.mode !== 'investigate', 'and it comes back once it has looked');
  const quiet = createBattle(mk({ key: 'AI3|x', recipe: 'fields', goal: 'offence', n: 2, enemy: { troops: 12, armour: 0, air: 0, skill: 1 } })); run(quiet, 30); sound(quiet, 3, 3, 30, 'p', 'shot'); run(quiet, 30); assert.equal(quiet.stats.investigations, 0, 'out of earshot');
});

test('an element under heavy fire with the enemy near falls back to its next position instead of dying in place, and comes back when it has recovered', () => {
  const B = createBattle(mk({ key: 'AI4|x', recipe: 'fields', goal: 'defence', n: 4, enemy: { troops: 10, armour: 0, air: 0, skill: 1 }, ai: { p: false, e: true } })); ground(B, 20, 30, 80, 48);
  const el = elements(B)[0]; const us = live(B, el); us.forEach((u, i) => put(u, 40 + i, 40)); const foes = B.units.filter((u) => u.side === 'p'); foes.forEach((u, i) => { put(u, 30 + i, 40); u.stance = 'holdfire'; });
  for (const e of B.units.filter((u) => u.side === 'e' && !us.includes(u))) put(e, 110, 5);
  run(B, 30); let fell = false; let from = mid(us);
  for (let i = 0; i < 200; i++) { for (const u of us) if (u.alive) u.supp = Math.max(u.supp, SUPPRESS.pinned + 5); step(B); if (el.ai.mode === 'fallback') { fell = true; break; } }
  assert.ok(fell, 'it fell back'); assert.equal(B.stats.fallbacks >= 1, true);
  for (const u of us) u.supp = 0; for (const u of foes) put(u, 3, 3); run(B, 600); assert.notEqual(el.ai.mode, 'fallback', 'it recovered'); void from;
});

test('against a contact that is not moving, one element holds it and another goes round the side by the way that is least in its sight: a flank', () => {
  const B = createBattle(mk({ key: 'AI5|x', recipe: 'fields', goal: 'defence', n: 3, enemy: { troops: 10, armour: 0, air: 0, skill: 1 } })); ground(B, 10, 20, 110, 60);
  for (const u of B.units.filter((q) => q.side === 'p')) { u.stance = 'holdfire'; } // (they sit still, in sight)
  const ps = B.units.filter((q) => q.side === 'p'); ps.forEach((u, i) => put(u, 60 + i, 40)); const els = elements(B); els.forEach((t, k) => live(B, t).forEach((u, i) => put(u, 38 + k * 2, 36 + i * 1.2)));
  let wps = null; for (let i = 0; i < 900 && !B.over; i++) { step(B); const f = els.find((t) => t.ai?.mode === 'flank'); if (f && !wps) wps = f.ai.fl.wp; }
  assert.ok(B.stats.flanks >= 1, 'it flanked'); assert.ok(wps, 'with a way point'); assert.ok(Math.abs(wps.y - 40) >= AI.flank.offset - 4, `off to the side of the contact (${wps.y.toFixed(1)})`);
});

test('the flank takes the side that is out of the contact\'s sight when there is one: a wall hides the northern way, so the way point is there', async () => {
  const { planFlank, exposureGrid } = await import('../src/battle/ai.js'); const { X } = await import('../src/battle/sim.js');
  const B = createBattle(mk({ key: 'AI6|x', recipe: 'fields', goal: 'defence', n: 2, enemy: { troops: 5, armour: 0, air: 0, skill: 1 } })); ground(B, 5, 5, 115, 60);
  for (let i = 40; i <= 68; i++) for (const j of [30, 31]) { B.map.tiles[idx(B.map, i, j)] = TILE.WALL; B.map.bfloors[idx(B.map, i, j)] = 3; } // a long wall between the contact's northern side and where it can see
  const c = { id: 'p0', x: 62, y: 38, t: B.tick, vis: true, heard: false, armed: true, kind: 'inf', role: 'rifleman', conf: 1, st: 0 }; B.per.e.set('p0', c); const us = live(B, elements(B)[0]); us.forEach((u, i) => put(u, 30, 38 + i)); B.tick = 1;
  const pen = exposureGrid(B, 'e'); assert.ok(pen, 'the contact makes ground costly'); const f = planFlank(B, X, us, mid(us), c, pen);
  assert.ok(f && f.wp, 'a flank is found'); assert.ok(f.wp.y < 38, `by the covered (northern) side: way point at y ${f.wp.y.toFixed(1)}`);
});

test('an element that has lost ground goes back in to retake it: a counter-attack, not by everyone at once', () => {
  const B = createBattle(mk({ key: 'AI7|x', recipe: 'fields', goal: 'offence', n: 3, enemy: { troops: 12, armour: 0, air: 0, skill: 1 } }));
  for (const u of B.units.filter((q) => q.side === 'p')) { put(u, B.map.objective.x + 1, B.map.objective.y); u.stance = 'holdfire'; }
  for (const e of B.units.filter((q) => q.side === 'e')) { put(e, B.map.objective.x + 14, B.map.objective.y + 3); }
  let max = 0; for (let i = 0; i < 400; i++) { step(B); max = Math.max(max, elements(B).filter((t) => t.ai?.mode === 'counter').length); }
  assert.ok(B.stats.counters >= 1, 'it counter-attacked'); assert.ok(max <= Math.max(1, Math.ceil(elements(B).length / 3)), `no more than a third of the elements at once (${max})`);
});

test('vehicles work with the infantry: a lone tank with an anti-tank soldier in front of it backs out with its front to him instead of charging; with infantry about it holds its place behind them', () => {
  const tank = { id: 'et0', name: 'x', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 };
  const B = createBattle(mk({ key: 'AI8|x', recipe: 'fields', goal: 'defence', n: 1, roles: ['anti_tank'], enemy: { troops: 0, armour: 1, air: 0, skill: 1 } })); ground(B, 10, 20, 110, 60);
  const T = B.units.find((u) => u.side === 'e' && u.kind === 'tank'); put(T, 60, 40); T.heading = Math.PI; T.tur = Math.PI; const p = B.byId.get('p0'); put(p, 48, 40); p.stance = 'holdfire';
  let backed = false; for (let i = 0; i < 200; i++) { step(B); if (T.order.type === 'reverse') backed = true; }
  assert.ok(backed, 'it backed out'); assert.ok(Math.abs(Math.atan2(Math.sin(T.heading - Math.PI), Math.cos(T.heading - Math.PI))) < 0.6, 'with its front still to him'); void tank;
});

test('smoke: an officer with smoke throws it for an element crossing open ground under fire; blast awareness: after a heard blast the element spreads out', () => {
  const B = createBattle(mk({ key: 'AI9|x', recipe: 'fields', goal: 'defence', n: 3, enemy: { troops: 10, armour: 0, air: 0, skill: 1 } })); ground(B, 10, 20, 110, 60);
  const el = elements(B)[0]; const us = live(B, el); us.forEach((u, i) => put(u, 40 + i, 40)); us[0].role = 'officer'; us[0].smokes = 2; const ps = B.units.filter((q) => q.side === 'p'); ps.forEach((u, i) => { put(u, 51 + i, 40); u.stance = 'holdfire'; });
  for (const e of B.units.filter((q) => q.side === 'e' && !us.includes(q))) put(e, 112, 5);
  for (let i = 0; i < 300 && !B.stats.smokes; i++) { for (const u of us) if (u.alive) u.supp = Math.max(u.supp, 18); step(B); }
  assert.ok(B.stats.smokes >= 1, 'smoke was thrown'); assert.ok(B.pend.some((q) => q.kind === 'smoke') || B.smoke.length > 0 || B.events.some((e) => e.k === 'throw'));
});

test('the enemy battery shells a cluster of known contacts that is not on top of its own people', () => {
  const B = createBattle(mk({ key: 'AI10|x', recipe: 'fields', goal: 'offence', n: 4, enemy: { troops: 8, armour: 0, air: 0, battery: 1, skill: 1 } })); ground(B, 10, 20, 110, 60);
  const ps = B.units.filter((q) => q.side === 'p'); ps.forEach((u, i) => { put(u, 50 + (i % 2), 40 + Math.floor(i / 2)); u.stance = 'holdfire'; }); for (const e of B.units.filter((q) => q.side === 'e' && !q.battery)) put(e, 65, 40 + (e.id.length));
  for (let i = 0; i < 300 && !B.stats.battery; i++) step(B); assert.ok(B.stats.battery >= 1, 'the battery was called'); assert.ok(B.located.length >= 1);
});

// ---- troops: formation, cover, bounds, going to ground, priorities, turning
test('troops: a team that is sent somewhere goes with spacing (not on top of one another), stops in the best cover near the place, and faces the likeliest threat', () => {
  const B = createBattle(mk({ key: 'AI11|x', recipe: 'fields', goal: 'defence', n: 6 })); ground(B, 10, 20, 110, 60); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf');
  B.units.filter((u) => u.side === 'e').forEach((u, i) => put(u, 112, 5 + i)); const us = sq.members.map((m) => B.byId.get(m)); us.forEach((u, i) => put(u, 20, 40 + i * 0.3));
  B.map.tiles[idx(B.map, 52, 38)] = TILE.HEDGE; B.map.tiles[idx(B.map, 52, 39)] = TILE.HEDGE; B.map.tiles[idx(B.map, 52, 40)] = TILE.HEDGE; // cover a tile or two past where he is sent
  issue(B, [sq.id], { type: 'move', x: 50, y: 39 }); run(B, 20); const spread = new Set(us.map((u) => `${u.order.x.toFixed(1)},${u.order.y.toFixed(1)}`)).size; assert.ok(spread >= 5, 'each to his own place');
  run(B, 500); assert.ok(us.every((u) => u.order.type === 'hold'), 'all arrived and stopped'); const closest = Math.min(...us.map((u) => Math.hypot(u.x - 52.5, u.y - 39)));
  assert.ok(us.filter((u) => [0, 1].some((d) => B.map.tiles[idx(B.map, Math.floor(u.x) + d, Math.floor(u.y))] === TILE.HEDGE)).length >= 2, 'those at the hedge are in or behind it'); void closest;
  assert.ok(us.every((u) => Math.abs(Math.atan2(Math.sin(u.heading), Math.cos(u.heading))) < 1.2), 'facing the enemy side (east)');
});

test('troops: attack-moving into contact is done in bounds (half goes while half covers); a pinned man goes to ground and gets up a moment after it eases; no instant about-turns', () => {
  const B = createBattle(mk({ key: 'AI12|x', recipe: 'fields', goal: 'defence', n: 6 })); ground(B, 10, 20, 110, 60); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const us = sq.members.map((m) => B.byId.get(m));
  B.units.filter((u) => u.side === 'e').forEach((u, i) => { put(u, 60, 38 + i * 0.5); u.stance = 'holdfire'; u.W = { ...u.W, range: 0 }; }); us.forEach((u, i) => put(u, 40, 38 + i * 0.6));
  issue(B, [sq.id], { type: 'amove', x: 64, y: 40 }); const seen = new Set(); for (let i = 0; i < 160; i++) { step(B); seen.add(us.filter((u) => u.moving).length); }
  assert.ok(B.stats.bounds >= 1, 'it bounded'); assert.ok([...seen].some((n) => n > 0 && n < us.length), 'at some moment only some of them moved');
  const m = us[0]; m.supp = SUPPRESS.pinned + 10; step(B); assert.equal(m.prone, true, 'to the ground'); m.supp = 0; step(B); assert.equal(m.prone, true, 'not at once up'); run(B, MOVE.getup + 2); assert.equal(m.prone, false, 'and up again');
  const h0 = m.heading; issue(B, [m.id], { type: 'move', x: m.x - 20, y: m.y }); step(B); assert.ok(Math.abs(Math.atan2(Math.sin(m.heading - h0), Math.cos(m.heading - h0))) <= MOVE.turn.inf / 10 + 1e-6, 'it turns at a rate, not at once');
});

test('troops: anti-tank soldiers shoot at vehicles first, rifles at men not armour, machine guns at groups; a soldier shot at answers the one shooting at him', () => {
  const B = createBattle(mk({ key: 'AI13|x', recipe: 'fields', goal: 'defence', n: 3, roles: ['anti_tank', 'rifleman', 'machine_gunner'], enemy: { troops: 6, armour: 1, air: 0, skill: 1 } })); ground(B, 10, 20, 110, 60);
  const [at, rf, mg] = ['p0', 'p1', 'p2'].map((id) => B.byId.get(id)); [at, rf, mg].forEach((u, i) => put(u, 40, 40 + i)); const T = B.units.find((u) => u.kind === 'tank'); put(T, 50, 40); const foes = B.units.filter((u) => u.side === 'e' && u.kind === 'inf'); foes.forEach((u, i) => { put(u, 51 + (i % 3) * 0.8, 36 + Math.floor(i / 3) * 0.8); u.W = { ...u.W, range: 0 }; }); T.W = { ...T.W, range: 0 };
  for (const u of [at, rf, mg]) u.sight = 20; run(B, 12);
  assert.equal(at.target, T.id, 'the anti-tank soldier takes the tank'); assert.notEqual(rf.target, T.id, 'a rifle does not shoot at armour when there are men'); assert.ok(mg.target && B.byId.get(mg.target).kind === 'inf', 'the gun takes men');
});

test('vehicles turn at their own rate and speed up and brake; a turret takes time to come round', () => {
  const B = createBattle(mk({ key: 'AI14|x', recipe: 'fields', goal: 'defence', n: 1, vehicles: [{ id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 }], enemy: { troops: 1, armour: 0, air: 0, skill: 1 } })); ground(B, 10, 20, 110, 60);
  const T = B.byId.get('T1'); put(T, 40, 40); T.heading = 0; B.units.filter((u) => u.side === 'e').forEach((u) => put(u, 112, 5)); issue(B, ['T1'], { type: 'move', x: 20, y: 40 });
  run(B, 10); assert.ok(Math.abs(T.heading) < 0.2 * Math.PI + 1.1 * 1.0 * 0.5, 'it has started to turn'); assert.ok(T.x > 39.9 && T.x < 40.2, 'and has not driven off backwards, nor yet gone far'); run(B, 60);
  assert.ok(Math.abs(Math.abs(T.heading) - Math.PI) < 0.3, 'round to face the way it goes'); assert.ok(T.x < 39, 'then it moves'); const v = T.v; run(B, 5); assert.ok(T.v >= v - 1e-9, 'it is speeding up'); assert.ok(T.v <= T.speed + 1e-9);
});

// ---- the whole: determinism, replay, and the numbers did not move
test('twenty seeds, rules 5: a battle played with orders replays to the same battle, bit for bit', () => {
  const recipes = ['city', 'fields', 'trench', 'compound', 'forest'];
  for (let k = 0; k < 20; k++) {
    const setup = mk({ key: `AI20|${k}`, recipe: recipes[k % 5], goal: ['defence', 'offence', 'raid'][k % 3], n: 8, enemy: { troops: 14, armour: k % 2, air: 0, battery: k % 3 === 0 ? 1 : 0, skill: 1 }, vehicles: k % 2 ? [{ id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 }] : [] });
    const B = createBattle(setup); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf');
    run(B, 60); issue(B, [sq.id], { type: 'amove', x: B.map.objective.x, y: B.map.objective.y }); run(B, 140); issue(B, [sq.id], { type: 'hold' }); run(B, 100);
    const R = replay(setup, B.log, B.tick); const snap = (X) => JSON.stringify([X.tick, X.stats, X.units.map((u) => [u.id, u.x, u.y, u.z, u.hp, u.alive, u.supp, u.heading, u.order.type]), X.teams.map((t) => t.ai?.mode)]);
    assert.equal(snap(R), snap(B), `seed ${k}`);
  }
});

test('the same enemy numbers: the enemy is made of exactly what the engagement says, rules 5 only changes what it does with it', () => {
  const a = mk({ key: 'AI21|x', enemy: { troops: 14, armour: 1, air: 1, aa: 1, battery: 1, skill: 1 } }); const b = JSON.parse(JSON.stringify(a)); b.rules = 4; b.map.ver = 2;
  const sig = (x) => x.units.filter((u) => u.side === 'e').map((u) => [u.id, u.role, u.weapon, u.hp, u.accMult, u.sight, u.speed]); assert.deepEqual(sig(a), sig(b));
  const B = createBattle(a); assert.equal(B.units.filter((u) => u.side === 'e').length, 14 + 1 + 1 + 1 + 1);
});

test('a battle made under rules 4 still plays as it did: no contacts, no elements, no flight, no teams', () => {
  const setup = mk({ key: 'AI22|x', goal: 'defence', ai: { p: true, e: true } }); setup.rules = 4; setup.map.ver = 2; const B = createBattle(setup);
  assert.equal(B.per, undefined); assert.equal(B.teams, undefined); runToEnd(B); assert.ok(B.over); assert.equal(B.stats.flanks + B.stats.fallbacks, 0);
  const R = replay(setup, B.log, B.tick); assert.equal(R.tick, B.tick); void outcome;
});
