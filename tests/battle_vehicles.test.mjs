// Stances and vehicle orders (v0.102.2, rules 4): hold fire, defensive and aggressive; reverse; an engineer's repair; an SP gun that must deploy; people aboard a carrier, and the carrier's loss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, outcome } from '../src/battle/sim.js';
import { TILE, MODULE, CARRY } from '../src/content/battle.js';
import { idx } from '../src/battle/map.js';

const roles = (list) => list.map((role, i) => ({ id: `p${i}`, name: `P${i}`, role, tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const wolf = { id: 'C1', name: 'Wolf APC', cls: 'carrier', type: 'wolf', armour: 3, firepower: 1, speed: 3 };
const tank = { id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 };
const mk = (o = {}) => buildSetup({ key: o.key || 'V1|x', eng: { goal: 'defence', recipe: 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 3, armour: 0, air: 0, skill: 1 } }, people: roles(o.roles || Array(6).fill('rifleman')), vehicles: o.vehicles || [], support: o.support, ai: { p: false, e: false } });
/** an open field cleared in the map, for a test that walks a way */
function open(B) { const m = B.map; const y = Math.floor(m.h / 2); for (let j = y - 8; j <= y + 8; j++) for (let i = 2; i < 64; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.GROUND; m.bid[n] = -1; m.bfloors[n] = 0; } return { y, x0: 4 }; }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const park = (B) => B.units.filter((u) => u.side === 'e').forEach((u, i) => put(u, 100 + i, 3));

test('stances: hold fire never fires; defensive stops to fight at first sight and loses suppression faster; the stance sits beside the order and the older rules ignore it', () => {
  const run1 = (stance, rules = 4) => { const setup = mk({ key: 'V2|x' }); setup.rules = rules; const B = createBattle(setup); const s = open(B); park(B); const a = B.byId.get('p0'); put(a, s.x0 + 2, s.y + 0.5); const e = B.units.find((u) => u.side === 'e'); put(e, s.x0 + 22, s.y + 0.5); e.W = { ...e.W, range: 0 }; a.sight = 30; issue(B, ['p0'], { type: 'stance', stance }); issue(B, ['p0'], { type: 'amove', x: s.x0 + 50, y: s.y + 0.5 }); run(B, 200); return { a, B }; };
  const agg = run1('aggressive'); const hold = run1('holdfire'); const def = run1('defensive'); assert.ok(agg.a.shots > 0, 'it fires'); assert.equal(hold.a.shots, 0, 'hold fire: never'); assert.equal(hold.a.order.type === 'amove' || hold.a.order.type === 'hold', true);
  assert.ok(def.a.x < agg.a.x - 3 || def.a.shots > 0, 'defensive: stopped to fight at first sight'); assert.equal(agg.a.stance, 'aggressive'); assert.equal(def.a.stance, 'defensive');
  const old = run1('holdfire', 3); assert.equal(old.a.stance, 'aggressive', 'under rules 3 a stance does nothing'); assert.ok(old.a.shots > 0);
  const B = createBattle(mk()); const a = B.byId.get('p0'); issue(B, ['p0'], { type: 'move', x: 20, y: 20 }); issue(B, ['p0'], { type: 'stance', stance: 'defensive' }); assert.equal(a.order.type, 'move', 'the move order stands'); assert.ok(a.path.length > 0);
  const s2 = createBattle(mk()); const u = s2.byId.get('p0'); u.supp = 60; const w = createBattle(mk()).byId.get('p1'); void w; const D = createBattle(mk()); const p1 = D.byId.get('p0'); const p2 = D.byId.get('p1'); p1.supp = 60; p2.supp = 60; issue(D, ['p0'], { type: 'stance', stance: 'defensive' }); run(D, 100); assert.ok(p1.supp < p2.supp - 1, 'dug in, it recovers faster');
});

test('reverse: a vehicle backs to a point at half speed keeping its heading (its front stays to the enemy); a repair order sends an engineer beside a vehicle to restore its tracks, gun and engine and put a burning engine out', () => {
  const B = createBattle(mk({ vehicles: [tank] })); const s = open(B); park(B); const T = B.byId.get('T1'); put(T, s.x0 + 30, s.y + 0.5); T.heading = 0; for (const u of B.units) u.W = { ...u.W, range: 0 };
  issue(B, ['T1'], { type: 'reverse', x: s.x0 + 20, y: s.y + 0.5 }); run(B, 60); assert.ok(T.x < s.x0 + 29.5, 'it backs'); assert.equal(T.heading, 0, 'and keeps its front the same way'); const sp = T.x; run(B, 10); const back = sp - T.x;
  issue(B, ['T1'], { type: 'move', x: s.x0 + 10, y: s.y + 0.5 }); run(B, B.rules >= 5 ? 80 : 1); const m0 = T.x; // (rules 5: a tank turns round at its own rate and speeds up before it is at speed) run(B, 10); const fwd = m0 - T.x; assert.ok(fwd > back * 1.6, `forward ${fwd.toFixed(2)} against back ${back.toFixed(2)}`);
  const R = createBattle(mk({ vehicles: [tank], roles: ['engineer', 'rifleman'] })); const s2 = open(R); park(R); for (const u of R.units) u.W = { ...u.W, range: 0 }; const V = R.byId.get('T1'); const E = R.byId.get('p0'); put(V, s2.x0 + 10, s2.y + 0.5); put(E, s2.x0 + 2, s2.y + 0.5);
  V.mod.tracks = 0.1; V.mod.gun = 0.1; V.mod.engine = 0.05; V.burning = true; issue(R, ['p0'], { type: 'repair', target: 'T1' }); run(R, 80); assert.ok(Math.hypot(E.x - V.x, E.y - V.y) < 2.6, 'he walked over'); run(R, 700); assert.ok(V.mod.tracks >= 0.99 && V.mod.gun >= 0.99 && V.mod.engine >= 0.99, 'all put right'); assert.equal(V.burning, false, 'the fire is out'); assert.ok(R.events.some((e) => e.k === 'repaired'));
  const none = createBattle(mk({ vehicles: [tank] })); issue(none, ['p0'], { type: 'repair', target: 'T1' }); assert.equal(none.byId.get('p0').order.type, 'hold', 'only an engineer repairs');
});

test('load and unload: infantry board a carrier up to its capacity, ride with it unseen and untargetable, and come out when it unloads; a full carrier takes no more', () => {
  const B = createBattle(mk({ vehicles: [wolf], roles: Array(10).fill('rifleman') })); const s = open(B); park(B); const C = B.byId.get('C1'); put(C, s.x0 + 6, s.y + 0.5); const ids = Array.from({ length: 10 }, (_, i) => `p${i}`); ids.forEach((id, i) => put(B.byId.get(id), s.x0 + 2 + (i % 5) * 0.4, s.y + 2 + Math.floor(i / 5)));
  issue(B, ids, { type: 'load', target: 'C1' }); run(B, 200); assert.equal(C.pax.length, CARRY.wolf, 'eight aboard and no more'); assert.equal(ids.filter((id) => B.byId.get(id).hidden).length, 8); assert.ok(B.events.some((e) => e.k === 'full'));
  issue(B, ['C1'], { type: 'move', x: s.x0 + 40, y: s.y + 0.5 }); run(B, 400); const aboard = B.byId.get(C.pax[0]); assert.ok(Math.hypot(aboard.x - C.x, aboard.y - C.y) < 0.1, 'it rides with the carrier'); assert.ok(C.x > s.x0 + 30);
  const foe = B.units.find((u) => u.side === 'e'); put(foe, C.x + 6, C.y); foe.W = { ...B.byId.get('p0').W }; foe.sight = 20; run(B, 80); assert.ok(C.pax.every((id) => B.byId.get(id).hp === B.byId.get(id).hpMax), 'nobody aboard is hit');
  issue(B, ['C1'], { type: 'unload' }); run(B, 3); assert.equal(C.pax.length, 0); assert.ok(C.pax.length === 0 && ids.every((id) => !B.byId.get(id).hidden)); assert.ok(Math.hypot(B.byId.get(ids[0]).x - C.x, B.byId.get(ids[0]).y - C.y) < 3);
});

test('a carrier lost with four aboard: some die with it by a hash, the rest come out hurt and shaken, and each of the four shows up exactly once in the result', () => {
  let deadTotal = 0; let hurtTotal = 0;
  for (let k = 0; k < 8; k++) {
    const B = createBattle(mk({ key: `V5|${k}`, vehicles: [wolf], roles: Array(4).fill('rifleman') })); const s = open(B); park(B); const C = B.byId.get('C1'); put(C, s.x0 + 6, s.y + 0.5); const ids = ['p0', 'p1', 'p2', 'p3']; ids.forEach((id, i) => put(B.byId.get(id), s.x0 + 4 + i * 0.3, s.y + 1.5));
    for (const u of B.units) u.W = { ...u.W, range: 0 }; issue(B, ids, { type: 'load', target: 'C1' }); run(B, 120); assert.equal(C.pax.length, 4); C.alive = false; C.hp = 0; run(B, 2); assert.equal(C.pax.length, 0); const o = outcome(B);
    const everyone = [...o.dead, ...o.wounded.map((w) => w.id)]; assert.equal(new Set(everyone).size, everyone.length, 'nobody twice'); const gone = ids.filter((id) => !B.byId.get(id).alive); const hurt = ids.filter((id) => B.byId.get(id).alive && B.byId.get(id).hp < B.byId.get(id).hpMax);
    for (const id of ids) { const inDead = o.dead.includes(id); const inWounded = o.wounded.some((w) => w.id === id); if (!B.byId.get(id).alive) assert.ok(inDead || inWounded, `${id} (down) is in the result`); else assert.ok(inWounded, `${id} (hurt) is in the result`); }
    deadTotal += gone.length; hurtTotal += hurt.length; assert.equal(gone.length + hurt.length, 4, 'every one of them is either gone or hurt');
  }
  assert.ok(deadTotal >= 4 && hurtTotal >= 8, `a share die, a share come out (${deadTotal} down, ${hurtTotal} hurt)`);
});

test('a self-propelled gun must set up before a fire mission (five seconds), and moving packs it up again', () => {
  const B = createBattle(mk({ vehicles: [{ id: 'G1', name: 'Hammer', cls: 'artillery', type: 'hammer', armour: 2, firepower: 5, speed: 3 }], support: { items: { item_artillery_shell: 4 }, air: [] } })); const s = open(B); park(B); for (const u of B.units) u.W = { ...u.W, range: 0 }; const G = B.byId.get('G1'); put(G, s.x0 + 2, s.y + 0.5);
  const foe = B.units.find((u) => u.side === 'e'); put(foe, s.x0 + 30, s.y + 0.5); foe.hp = foe.hpMax = 1e6; B.spotted[foe.id] = B.tick; // (rules 4: the point needs an enemy to designate it)
  issue(B, ['G1'], { type: 'fire', x: s.x0 + 30, y: s.y + 0.5 }); run(B, 40); assert.equal(B.counts.items.item_artillery_shell || 0, 0, 'still setting up'); run(B, 30); assert.equal(G.deployed, true); assert.equal(B.counts.items.item_artillery_shell, 1);
  issue(B, ['G1'], { type: 'move', x: s.x0 + 10, y: s.y + 0.5 }); assert.equal(G.deployed, false, 'moving packs it up'); issue(B, ['G1'], { type: 'fire', x: s.x0 + 30, y: s.y + 0.5 }); run(B, 20); assert.equal(B.counts.items.item_artillery_shell, 1, 'and it must set up again');
});
