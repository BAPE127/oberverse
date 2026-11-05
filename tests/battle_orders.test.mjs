// More orders (v0.102.1): flank, regroup, escort, recon and formations. Every order is in the log and replays.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, issue, issueFormation, formationSpots, replay } from '../src/battle/sim.js';
import { TILE } from '../src/content/battle.js';
import { canStand } from '../src/battle/nav.js';
import { idx } from '../src/battle/map.js';

const roles = (list) => list.map((role, i) => ({ id: `p${i}`, name: `P${i}`, role, tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const mk = (o = {}) => buildSetup({ key: o.key || 'O1|x', eng: { goal: 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', enemy: o.enemy || { troops: 3, armour: 0, air: 0, skill: 1 } }, people: roles(o.roles || Array(6).fill('rifleman')), vehicles: o.vehicles || [], ai: { p: false, e: false } });
/** Clear a wide, open field in the map (for a test that walks a long way); returns where it is. */
function stretch(B) { const m = B.map; const x0 = 4; const y = Math.floor(m.h / 2); for (let j = y - 10; j <= y + 10; j++) for (let i = x0 - 2; i < x0 + 60; i++) { const n = idx(m, i, j); m.tiles[n] = TILE.GROUND; m.bid[n] = -1; m.bfloors[n] = 0; } return { y, x0 }; }
/** A less strict one for a test that replays: some ground three tiles each way that is open already (or null). */
function openAlready(B, len = 36) { const m = B.map; for (let y = 4; y < m.h - 4; y++) { let ok = 0; for (let x = 1; x < m.w - 1; x++) { let clear = true; for (let j = -3; j <= 3 && clear; j++) { const t = m.tiles[idx(m, x, y + j)]; if (!((t === TILE.GROUND || t === TILE.ROAD) && m.bid[idx(m, x, y + j)] < 0)) clear = false; } if (clear) { ok++; if (ok >= len) return { y, x0: x - len + 1 }; } else ok = 0; } } return null; }
const put = (u, x, y) => { u.x = x; u.y = y; u.path = []; u.order = { type: 'hold' }; u.target = null; };
const calm = (B) => { for (const u of B.units) u.W = { ...u.W, range: 0 }; };
const park = (B) => { B.units.filter((u) => u.side === 'e').forEach((u, i) => put(u, 100 + i, 3)); };
const find = (recipe) => createBattle(mk({ key: 'O|find', recipe }));

test('flank: the unit goes round to one side of the straight line to the point and comes in on it', () => {
  const B = find('fields'); const s = stretch(B); calm(B); park(B); const u = B.byId.get('p0'); put(u, s.x0 + 2, s.y + 0.5); let off = 0;
  issue(B, ['p0'], { type: 'flank', x: s.x0 + 40, y: s.y + 0.5 }); for (let i = 0; i < 700; i++) { run(B, 1); off = Math.max(off, Math.abs(u.y - (s.y + 0.5))); } assert.ok(off > 4, `it swung out ${off.toFixed(1)} tiles`); assert.ok(Math.hypot(u.x - (s.x0 + 40), u.y - (s.y + 0.5)) < 2, 'and arrived');
});

test('regroup: a suppressed unit recovers faster on a regroup than it does standing', () => {
  const B = find('fields'); const s = stretch(B); calm(B); park(B); const a = B.byId.get('p0'); const b = B.byId.get('p1'); put(a, s.x0 + 2, s.y + 0.5); put(b, s.x0 + 2, s.y + 2.5); a.supp = 60; b.supp = 60; issue(B, ['p0'], { type: 'regroup', x: s.x0 + 14, y: s.y + 0.5 }); run(B, 60); assert.ok(a.supp < b.supp - 10, `${a.supp.toFixed(0)} against ${b.supp.toFixed(0)}`);
});

test('escort: a unit keeps close to the one it escorts as it moves off, and stands down when the escorted one is gone', () => {
  const B = createBattle(mk({ key: 'O|esc', vehicles: [{ id: 'T1', name: 'Anvil', cls: 'tank', armour: 3, firepower: 3, speed: 3 }] })); const s = stretch(B); calm(B); park(B); const T = B.byId.get('T1'); const u = B.byId.get('p0'); put(T, s.x0 + 3, s.y + 0.5); put(u, s.x0 + 1, s.y + 1.5);
  issue(B, ['p0'], { type: 'escort', target: 'T1' }); issue(B, ['T1'], { type: 'move', x: s.x0 + 40, y: s.y + 0.5 }); run(B, 500); assert.ok(T.x > s.x0 + 20); assert.ok(Math.hypot(u.x - T.x, u.y - T.y) < 6, `it stayed with it (${Math.hypot(u.x - T.x, u.y - T.y).toFixed(1)})`);
  T.alive = false; run(B, 20); assert.equal(u.order.type, 'hold');
  const self = createBattle(mk({})); issue(self, ['p0'], { type: 'escort', target: 'p0' }); assert.equal(self.byId.get('p0').order.type, 'hold', 'not oneself');
});

test('recon: it moves ahead, stops the moment an enemy is in sight and marks what it sees as spotted; with nothing about it gets to its point', () => {
  const B = find('fields'); const s = stretch(B); calm(B); park(B); const u = B.byId.get('p0'); put(u, s.x0 + 2, s.y + 0.5); issue(B, ['p0'], { type: 'recon', x: s.x0 + 40, y: s.y + 0.5 }); run(B, 500); assert.ok(Math.hypot(u.x - (s.x0 + 40), u.y - (s.y + 0.5)) < 2, 'nothing there: it gets to the point'); assert.ok(!B.events.some((e) => e.k === 'contact'));
  const C = find('fields'); const s2 = stretch(C); calm(C); park(C); const v = C.byId.get('p0'); put(v, s2.x0 + 2, s2.y + 0.5); const foe = C.units.find((x) => x.side === 'e'); put(foe, s2.x0 + 30, s2.y + 0.5); v.W = { ...v.W, range: 0 };
  issue(C, ['p0'], { type: 'recon', x: s2.x0 + 45, y: s2.y + 0.5 }); run(C, 500); assert.ok(C.events.some((e) => e.k === 'contact'), 'contact'); assert.ok(v.x < s2.x0 + 25, 'it stopped short'); assert.ok(C.spotted[foe.id] > 0, 'and the enemy is marked');
});

test('formations: a line is abreast, a column is behind one another, a wedge points forward, a skirmish line is wide; a group in formation takes up distinct, standable spots and it replays', () => {
  const sp = (k) => formationSpots(6, 20, 20, 0, k); const line = sp('line'); assert.ok(line.every((p) => Math.abs(p.x - 20) < 1e-9)); assert.ok(new Set(line.map((p) => p.y.toFixed(2))).size === 6);
  const col = sp('column'); assert.ok(col[5].x < col[0].x - 3, 'a column trails'); const wedge = sp('wedge'); const mid = wedge[2]; assert.ok(wedge[0].x < mid.x && wedge[5].x < mid.x, 'the point is ahead'); const span = (a) => Math.max(...a.map((p) => p.y)) - Math.min(...a.map((p) => p.y)); assert.ok(span(sp('skirmish')) > span(line) * 1.4, 'a skirmish line is wide');
  let setup; let B; let s; for (const key of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) { setup = mk({ key: `O|form|${key}`, recipe: key < 'e' ? 'fields' : 'compound' }); B = createBattle(setup); s = openAlready(B); if (s) break; } assert.ok(s, 'some open ground'); calm(B); park(B); B.units.filter((u) => u.side === 'p').forEach((u, i) => put(u, s.x0 + 1, s.y - 2.5 + i));
  issueFormation(B, ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'], 'move', s.x0 + 30, s.y + 0.5, 'line'); assert.equal(B.log.length, 6); const to = B.log.map((l) => `${l.order.x.toFixed(1)},${l.order.y.toFixed(1)}`); assert.equal(new Set(to).size, 6, 'six spots'); for (const l of B.log) assert.ok(canStand(B.map, Math.floor(l.order.x), Math.floor(l.order.y), 'inf'));
  const C = createBattle(setup); const sp0 = C.map.spawns.p; issueFormation(C, ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'], 'amove', sp0.x + 25, sp0.y, 'wedge'); run(C, 500); const snap = (X) => JSON.stringify(X.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), Math.round(u.hp)])); const R = replay(setup, C.log, C.tick); assert.equal(snap(R), snap(C), 'the formation orders are in the log and replay');
});
