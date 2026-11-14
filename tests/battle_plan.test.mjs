// The planning stage (rules 5): no ticking, entry zones, deployment inside them, the scout picture that leaks nothing, and an unattended battle that plans itself and begins at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle, run, runToEnd, step, issue, replay, deploy, chooseEntry, beginBattle, planIntel, autoPlan, callSupport, currentEntry } from '../src/battle/sim.js';
import { idx } from '../src/battle/map.js';

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const tank = { id: 'T1', name: 'Anvil', cls: 'tank', type: 'anvil', armour: 3, firepower: 3, speed: 3 };
const heli = { id: 'H1', name: 'Wren', cls: 'helicopter', type: 'wren', armour: 1, firepower: 1, speed: 5 };
const mk = (o = {}) => buildSetup({ key: o.key || 'PL1|x', eng: { goal: o.goal || 'defence', recipe: o.recipe || 'fields', biome: 'rural', style: 'sund', intel: o.intel, enemy: { troops: 10, armour: 1, air: 1, aa: 1, skill: 1 } }, people: people(12), vehicles: [tank, heli], ai: o.ai || { p: false, e: true }, plan: o.plan ?? true });
const inside = (z, u) => u.x >= z.x && u.y >= z.y && u.x < z.x + z.w && u.y < z.y + z.h;

test('a player\'s battle starts in the planning stage and does not tick; there are no opening orders and no support until it begins', () => {
  const B = createBattle(mk()); assert.equal(B.phase, 'plan'); const x0 = B.units.map((u) => [u.x, u.y].join());
  step(B); run(B, 50); assert.equal(B.tick, 0); assert.deepEqual(B.units.map((u) => [u.x, u.y].join()), x0);
  issue(B, ['p0'], { type: 'move', x: 40, y: 40 }); assert.equal(B.byId.get('p0').order.type, 'hold'); assert.equal(B.log.length, 0, 'not logged');
  assert.equal(callSupport(B, { kind: 'smoke', x: 5, y: 5 }).ok, false);
  assert.equal(beginBattle(B).ok, true); assert.equal(B.phase, 'live'); run(B, 10); assert.equal(B.tick, 10); assert.equal(beginBattle(B).ok, false, 'once');
});

test('headless, unattended and older battles plan themselves and begin at once: every caller that just creates and runs a battle still works', () => {
  assert.equal(createBattle(mk({ ai: { p: true, e: true } })).phase, 'live'); assert.equal(createBattle(mk({ plan: false })).phase, 'live');
  const B = createBattle(mk({ ai: { p: true, e: true }, plan: false })); runToEnd(B); assert.ok(B.over);
  const old = mk({ plan: true }); old.rules = 4; assert.equal(createBattle(old).phase, 'live', 'older rules have no planning stage');
});

test('deploying: a team or a vehicle goes where you say inside the chosen zone and nowhere else; not into a building, not on top of another vehicle', () => {
  const B = createBattle(mk()); const z = currentEntry(B).zone; const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf');
  const cx = z.x + z.w / 2; const cy = z.y + z.h / 2;
  const r = deploy(B, sq.id, cx, cy); assert.ok(r.ok, r.text); for (const m of sq.members) { const u = B.byId.get(m); assert.ok(inside(z, u), `${m} is in the zone`); }
  assert.equal(deploy(B, sq.id, z.x + z.w + 30, cy).ok, false, 'outside the zone'); assert.equal(deploy(B, sq.id, 5, 5).ok === inside(z, { x: 5, y: 5 }), true);
  const T = B.byId.get('T1'); assert.ok(deploy(B, 'T1', cx + 3, cy - 2).ok, 'a tank in open ground'); assert.ok(inside(z, T));
  assert.equal(deploy(B, 'T1', z.x + z.w + 2, cy).ok, false);
  const before = [T.x, T.y].join(); const other = B.byId.get('H1'); let landed = false; for (const [dx, dy] of [[-5, 2], [-5, -2], [5, 2], [5, -3], [0, 3], [0, -3], [-6, 0]]) if (!landed && deploy(B, 'H1', cx + dx, cy + dy).ok) landed = true; assert.ok(landed, 'a helicopter on open ground'); assert.equal(deploy(B, 'H1', cx, cy).ok, false, 'not on top of the squad'); assert.equal(other.grounded, true);
  assert.equal(deploy(B, 'T1', other.x, other.y).ok === true, true, '(a tank may stand where a helicopter has not landed)'); void before;
  assert.equal(deploy(B, 'p0', cx, cy).ok, false, 'a single soldier is placed with his team'); assert.equal(deploy(B, 'e0', cx, cy).ok, false, 'not the enemy\'s'); assert.equal(deploy(B, 'nope', cx, cy).ok, false);
  const m = B.map; const b = m.buildings[0]; assert.equal(deploy(B, 'T1', b.x + b.w / 2, b.y + b.h / 2).ok, false, 'not on a roof');
  assert.ok(m.bid[idx(m, Math.floor(T.x), Math.floor(T.y))] < 0);
});

test('entry zones: every recipe has a main entry holding the usual start and others; choosing one lays the force out inside it, in the planning stage only', () => {
  for (const recipe of ['city', 'fields', 'trench', 'compound', 'forest']) {
    const B = createBattle(mk({ recipe, key: `PL2|${recipe}` })); const es = B.map.entries; assert.ok(es.length >= 2, recipe); assert.equal(es[0].id, 'main');
    const s = B.map.spawns.p; assert.ok(s.x >= es[0].zone.x && s.x < es[0].zone.x + es[0].zone.w && s.y >= es[0].zone.y && s.y < es[0].zone.y + es[0].zone.h, 'the usual start is in the main zone');
    const other = es[1]; assert.ok(chooseEntry(B, other.id).ok); const placed = B.units.filter((u) => u.side === 'p' && !u.reserve); const n = placed.filter((u) => inside(other.zone, u)).length;
    assert.ok(n >= placed.length - 1, `${recipe}: ${n} of ${placed.length} in the ${other.id} zone`); assert.equal(B.entry, other.id);
    assert.equal(chooseEntry(B, 'nowhere').ok, false); beginBattle(B); assert.equal(chooseEntry(B, 'main').ok, false, 'not once it has begun');
  }
});

test('the scout picture shows what intel and scouting give and nothing else', () => {
  const none = createBattle(mk({ intel: 0, key: 'PL3|a' })); let p = planIntel(none); assert.deepEqual([p.contacts, p.strongpoints, p.aa], [[], [], []]); assert.ok(p.objective && p.entries.length >= 2);
  const known = createBattle(mk({ intel: 2, key: 'PL3|a' })); p = planIntel(known); const foes = known.units.filter((u) => u.side === 'e'); assert.equal(p.contacts.length, foes.length); assert.ok(p.aa.length >= 1, 'the gun is marked');
  assert.ok(p.contacts.every((c) => c.conf === 1 && c.role !== undefined));
  const part = createBattle(mk({ intel: 1, key: 'PL3|b' })); p = planIntel(part); const marked = new Set(Object.keys(part.spotted)); assert.ok(p.contacts.length > 0 && p.contacts.length < part.units.filter((u) => u.side === 'e').length, 'some, not all');
  assert.ok(p.contacts.every((c) => marked.has(c.id)), 'only those marked'); assert.ok(p.contacts.every((c) => c.role === null && c.conf < 1), 'a spotted one has no role');
  for (const c of p.contacts) { assert.deepEqual(Object.keys(c).sort(), ['conf', 'id', 'kind', 'role', 'x', 'y']); }
  const hidden = part.units.filter((u) => u.side === 'e' && !marked.has(u.id)); for (const h of hidden) assert.ok(!p.contacts.some((c) => Math.abs(c.x - h.x) < 1e-9 && Math.abs(c.y - h.y) < 1e-9), 'an unmarked enemy is not shown');
  assert.ok(!JSON.stringify(p).includes('hp'), 'no hit points');
});

test('everything done in the planning stage is in the log and replays: the entry, the placing, the split, and the begin', () => {
  const setup = mk({ key: 'PL4|x' }); const B = createBattle(setup); const es = B.map.entries;
  chooseEntry(B, es[1].id); const sq = B.teams.find((t) => t.side === 'p' && t.kind === 'inf'); const z = es[1].zone;
  const { splitTeam } = awaitedSim; assert.ok(splitTeam(B, sq.id, sq.members.slice(0, 2), 'Pair').ok);
  assert.ok(deploy(B, 'T1', z.x + z.w / 2, z.y + z.h / 2).ok); beginBattle(B); run(B, 120); issue(B, ['p0'], { type: 'move', x: 50, y: 20 }); run(B, 80);
  assert.deepEqual(B.log.map((e) => e.order.type), ['entry', 'split', 'deploy', 'begin', 'move']);
  const R = replay(setup, B.log, B.tick); const snap = (X) => JSON.stringify([X.tick, X.entry, X.teams.map((t) => t.members), X.units.map((u) => [u.id, +u.x.toFixed(3), +u.y.toFixed(3), Math.round(u.hp)])]);
  assert.equal(snap(R), snap(B)); assert.equal(R.phase, 'live');
  const half = replay(setup, B.log.slice(0, 3), 0); assert.equal(half.phase, 'plan', 'a replay of a plan not yet begun stays in it');
});
import * as awaitedSim from '../src/battle/sim.js';
