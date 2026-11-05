// Strikes (v0.102.2, rules 4): every strike needs a designated point; the Rainmaker rocket launcher and the Longbow missile launcher (bought vehicles); the enemy battery that answers a gun.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, callSupport, designated, outcome } from '../src/battle/sim.js';
import { TILE, ARTY, UAV, TICK, DESIGNATE } from '../src/content/battle.js';
import { VEHICLES } from '../src/content/procurement.js';
import { idx } from '../src/battle/map.js';

const people = (n, role = 'rifleman') => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i === 0 && role === 'uav' ? 'uav' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const veh = (id, type) => ({ id, name: type, cls: 'artillery', type, armour: 2, firepower: 5, speed: 3 });
const mk = (o = {}) => buildSetup({ key: o.key || 'S1|x', eng: { goal: 'defence', recipe: 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 8, armour: 0, air: 0, skill: 1 } }, people: people(4), vehicles: o.vehicles || [], support: o.support, ai: { p: false, e: false } });
/** an open field cleared in the map */
function open(B) { const m = B.map; const y = Math.floor(m.h / 2); for (let j = y - 10; j <= y + 10; j++) for (let i = 2; i < 100; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.GROUND; m.bid[n] = -1; m.bfloors[n] = 0; } return { y, x0: 4 }; }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const calm = (B) => { for (const u of B.units) u.W = { ...u.W, range: u.W.airOnly ? u.W.range : 0 }; };
/** a field with the enemy gathered at x0+30 and one of yours who can see them at x0+24 */
function field(o = {}) {
  const B = createBattle(mk(o)); const s = open(B); calm(B); const foes = B.units.filter((u) => u.side === 'e' && !u.battery);
  foes.forEach((u, i) => put(u, s.x0 + 30 + (i % 4) * 0.7, s.y + 0.5 + Math.floor(i / 4) * 0.7)); for (const u of B.units) if (u.side === 'p' && u.kind === 'inf') put(u, s.x0 + 2, s.y + 3);
  const eye = B.byId.get('p1'); put(eye, s.x0 + 24, s.y + 0.5); eye.sight = 14; return { B, s, foes, eye };
}

test('designation: a missile, a drone, a pass or a strategic missile lands only where an enemy is in sight of one of yours or was spotted a short while ago; otherwise it is refused and nothing is spent', () => {
  const sup = { items: { item_missile_guided: 2, item_drone_attack: 1 }, air: [{ id: 'E7', name: 'Hammer bomber', kind: 'bomber' }], strategic: [] };
  const { B, s, foes, eye } = field({ support: sup }); const at = { x: s.x0 + 30.3, y: s.y + 0.9 };
  assert.ok(designated(B, 'p', at.x, at.y), 'in sight of one of yours'); const ok = callSupport(B, { kind: 'item_missile_guided', ...at }); assert.ok(ok.ok, ok.text);
  const off = callSupport(B, { kind: 'item_missile_guided', x: s.x0 + 30 + DESIGNATE.r + 3, y: s.y + 0.5 }); assert.ok(!off.ok && /designated/.test(off.text), 'a point with no enemy near it is not designated'); assert.equal(B.sup.items.item_missile_guided, 1, 'and the missile is not spent');
  assert.ok(!callSupport(B, { kind: 'bomber', x: s.x0 + 60, y: s.y + 0.5, id: 'E7' }).ok); assert.equal(B.sup.air[0].used, false, 'the aircraft is not used up either');
  // the eye goes away: the enemy is no longer in sight, but was spotted
  put(eye, s.x0 + 2, s.y + 3); assert.ok(!designated(B, 'p', at.x, at.y), 'out of sight'); foes.forEach((u) => { B.spotted[u.id] = B.tick; }); assert.ok(designated(B, 'p', at.x, at.y), 'spotted a moment ago');
  run(B, UAV.memory * TICK.perSecond + 5); assert.ok(!designated(B, 'p', at.x, at.y), 'the memory fades'); foes.forEach((u) => { u.alive = false; }); put(eye, s.x0 + 26, s.y + 0.5); assert.ok(!designated(B, 'p', at.x, at.y), 'a dead man designates nothing');
  // a scout drone overhead designates what it sees
  const D = field({ support: sup }); D.B.drones.push({ id: 'D1', owner: 'p0', side: 'p', x: D.s.x0 + 30, y: D.s.y + 0.5, tx: D.s.x0 + 30, ty: D.s.y + 0.5, left: 600 }); put(D.eye, D.s.x0 + 2, D.s.y + 3); assert.ok(designated(D.B, 'p', D.s.x0 + 30.3, D.s.y + 0.9), 'under a scout drone');
  // older rules do not ask
  const old = mk({ support: sup }); old.rules = 3; const O = createBattle(old); const so = open(O); assert.ok(callSupport(O, { kind: 'item_missile_guided', x: so.x0 + 50, y: so.y }).ok, 'rules 3: no designation');
});

test('an FPV dive needs a designated point too: with none, the drone stays home and is not used up', () => {
  const sup = { items: { item_drone_attack: 1 }, air: [] };
  const mkU = () => { const setup = mk({ support: sup }); setup.units.find((u) => u.id === 'p0').role = 'uav'; return createBattle(setup); };
  const B = mkU(); const s = open(B); calm(B); const foe = B.units.find((u) => u.side === 'e'); put(foe, s.x0 + 30, s.y + 0.5); const op = B.byId.get('p0'); put(op, s.x0 + 2, s.y + 3); assert.equal(op.role, 'uav');
  issue(B, ['p0'], { type: 'fpv', x: foe.x, y: foe.y }); run(B, 5); assert.ok(B.events.some((e) => e.k === 'nodesignate')); assert.equal(B.sup.items.item_drone_attack, 1); assert.equal(B.fpvs.length, 0);
  const C = mkU(); const sc = open(C); calm(C); const f2 = C.units.find((u) => u.side === 'e'); put(f2, sc.x0 + 30, sc.y + 0.5); put(C.byId.get('p0'), sc.x0 + 2, sc.y + 3); C.spotted[f2.id] = C.tick;
  issue(C, ['p0'], { type: 'fpv', x: f2.x, y: f2.y }); run(C, 5); assert.equal(C.sup.items.item_drone_attack, 0); assert.ok(C.fpvs.length === 1 || C.events.some((e) => e.k === 'blast'), 'it flew');
});

test('the Rainmaker: a bought rocket launcher fires twelve rockets over a field for three shells from the stores, once it has set up, and only at a designated point', () => {
  assert.equal(VEHICLES.rainmaker.class, 'artillery'); assert.equal(VEHICLES.rainmaker.source, 'bought'); assert.equal(VEHICLES.longbow.source, 'bought');
  const { B, s, foes } = field({ vehicles: [veh('R1', 'rainmaker')], support: { items: { item_artillery_shell: 6 }, air: [] } }); const R = B.byId.get('R1'); assert.equal(R.arty, ARTY.rainmaker); put(R, s.x0 + 2.5, s.y + 0.5);
  const hp = new Map(foes.map((u) => [u.id, u.hp])); issue(B, ['R1'], { type: 'fire', x: s.x0 + 30.5, y: s.y + 0.8 }); run(B, 40); assert.equal(B.sup.items.item_artillery_shell, 6, 'still setting up'); run(B, 55);
  assert.equal(B.sup.items.item_artillery_shell, 3, 'three shells for the salvo'); assert.equal(B.events.filter((e) => e.k === 'blast').length >= ARTY.rainmaker.salvo, true, 'twelve blasts'); assert.ok(B.events.some((e) => e.k === 'salvo'));
  assert.ok(foes.filter((u) => u.hp < hp.get(u.id)).length >= 3, 'the cluster is hurt'); assert.deepEqual(outcome(B).used.items, { item_artillery_shell: 3 });
  // blind: no eyes on the point
  const N = field({ vehicles: [veh('R1', 'rainmaker')], support: { items: { item_artillery_shell: 6 }, air: [] } }); put(N.eye, N.s.x0 + 2, N.s.y + 3); put(N.B.byId.get('R1'), N.s.x0 + 2.5, N.s.y + 0.5);
  issue(N.B, ['R1'], { type: 'fire', x: N.s.x0 + 30.5, y: N.s.y + 0.8 }); run(N.B, 200); assert.ok(N.B.events.some((e) => e.k === 'nodesignate')); assert.equal(N.B.sup.items.item_artillery_shell, 6); assert.equal(N.B.byId.get('R1').order.type, 'hold');
  // a gun firing shells is held to it too (the owner's answer: every strike)
  const G = field({ vehicles: [veh('G1', 'hammer')], support: { items: { item_artillery_shell: 3 }, air: [] } }); put(G.eye, G.s.x0 + 2, G.s.y + 3); put(G.B.byId.get('G1'), G.s.x0 + 2.5, G.s.y + 0.5);
  issue(G.B, ['G1'], { type: 'fire', x: G.s.x0 + 30.5, y: G.s.y + 0.8 }); run(G.B, 200); assert.ok(G.B.events.some((e) => e.k === 'nodesignate')); assert.equal(G.B.sup.items.item_artillery_shell, 3, 'a gun does not fire blind either');
});

test('the Longbow: a bought missile launcher fires the stores\' missiles one at a time from far back, the guided one first, at a designated point', () => {
  const { B, s, foes } = field({ vehicles: [veh('L1', 'longbow')], support: { items: { item_missile_guided: 1, item_missile_cruise: 1 }, air: [] } }); const L = B.byId.get('L1'); assert.equal(L.arty, ARTY.longbow); put(L, s.x0 + 2.5, s.y + 0.5); put(foes[foes.length - 1], s.x0 + 90, s.y + 0.5); // (one stands far off, so the battle goes on)
  const hp = new Map(foes.map((u) => [u.id, u.hp])); issue(B, ['L1'], { type: 'fire', x: s.x0 + 30.5, y: s.y + 0.8 }); run(B, 120); assert.equal(B.sup.items.item_missile_guided, 0, 'the guided missile first'); assert.equal(B.sup.items.item_missile_cruise, 1, 'and only one'); run(B, 90);
  assert.ok(foes.filter((u) => u.hp < hp.get(u.id)).length >= 3, 'it lands'); run(B, 400); assert.equal(B.sup.items.item_missile_cruise, 1, 'the second is not wasted on a place where nothing is left to hit'); assert.ok(B.events.some((e) => e.k === 'nodesignate')); assert.deepEqual(outcome(B).used.items, { item_missile_guided: 1 });
  const Q = field({ vehicles: [veh('L1', 'longbow')], support: { items: { item_missile_cruise: 1 }, air: [] } }); put(Q.B.byId.get('L1'), Q.s.x0 + 2.5, Q.s.y + 0.5); issue(Q.B, ['L1'], { type: 'fire', x: Q.s.x0 + 30.5, y: Q.s.y + 0.8 }); run(Q.B, 400); assert.equal(Q.B.sup.items.item_missile_cruise, 0, 'with no guided one it fires the cruise missile'); assert.ok(Q.foes.some((u) => !u.alive || u.hp < u.hpMax));
  const E = field({ vehicles: [veh('L1', 'longbow')], support: { items: {}, air: [] } }); put(E.B.byId.get('L1'), E.s.x0 + 2.5, E.s.y + 0.5); issue(E.B, ['L1'], { type: 'fire', x: E.s.x0 + 30.5, y: E.s.y + 0.8 }); run(E.B, 120); assert.ok(E.B.events.some((e) => e.k === 'noshells'), 'none in the stores');
});

test('the enemy battery: it answers the place a gun of yours fired from, once, after its delay, is seen when it fires, can be shot back at, is not counted as a fighter, and does not exist under older rules', () => {
  const E = { troops: 8, armour: 0, air: 0, battery: 1, skill: 1 };
  const play = (rules = 4, kill = false) => {
    const o = field({ vehicles: [veh('G1', 'hammer')], enemy: E, support: { items: { item_artillery_shell: 6 }, air: [] } }); const { B, s } = o; B.rules = rules; const G = B.byId.get('G1'); put(G, s.x0 + 2.5, s.y + 0.5);
    const bat = B.units.find((u) => u.battery); assert.ok(bat, 'there is a battery'); put(bat, s.x0 + 38, s.y + 6); if (kill) { bat.alive = false; bat.hp = 0; }
    issue(B, ['G1'], { type: 'fire', x: s.x0 + 30.5, y: s.y + 0.8 }); run(B, 60); const at = B.tick; run(B, 500); return { ...o, G, bat, at };
  };
  const a = play(); assert.ok(a.B.events.some((e) => e.k === 'battery'), 'it answered'); assert.ok(a.B.spotted[a.bat.id] !== undefined, 'and was seen doing it');
  const near = a.B.events.filter((e) => e.k === 'blast' && Math.hypot(e.x - a.G.x, e.y - a.G.y) < ARTY.battery.scatter + ARTY.battery.r + 1); assert.ok(near.length >= 2, `its shells came down on the gun (${near.length})`); assert.equal(a.B.events.filter((e) => e.k === 'battery').length, 1, 'once, not for every shell');
  assert.ok(a.B.events.find((e) => e.k === 'battery').t >= a.at - 45 + ARTY.battery.answer * TICK.perSecond - 10, 'after its delay');
  const dead = play(4, true); assert.ok(!dead.B.events.some((e) => e.k === 'battery'), 'a destroyed battery says nothing');
  const old = play(3); assert.ok(!old.B.events.some((e) => e.k === 'battery'), 'rules 3: no answer');
  assert.ok(designatedOrNot(a.B, a.bat), 'once it has fired it can be designated and shelled'); const live = a.B.units.filter((u) => u.side === 'e' && u.alive && !u.battery); live.forEach((u) => { u.alive = false; });
  a.B.ai.p = true; run(a.B, 400); assert.ok(a.B.over, 'a battery alone does not keep a battle going');
});
const designatedOrNot = (B, bat) => designated(B, 'p', bat.x, bat.y);
