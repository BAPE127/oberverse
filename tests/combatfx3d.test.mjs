// Combat in 3D without WebGL: every weapon look has a model, the effect pools keep their caps, decals follow the simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import { modelFor, holdKeyOf, weaponLooks, modelledLooks, poseOf, FIST } from '../src/engine3d/weapons3d.js';
import { CombatFx3D, CAPS, poolSizes } from '../src/engine3d/combatfx3d.js';
import { Figure } from '../src/engine3d/people3d.js';
import { FUTURE_WEAPONS } from '../src/content/futureArms.js';
import { newGame } from './helpers.mjs';

test('no document is touched at import (Node has none)', () => {
  assert.equal(typeof document, 'undefined');
});

test('every look the sprites have is modelled, and every weapon item in content resolves to a model with a grip and a muzzle or tip', () => {
  assert.deepEqual([...modelledLooks()].sort(), weaponLooks().sort());
  const g = newGame();
  const keys = new Set();
  for (const [id, it] of Object.entries(g.content.items)) {
    if (!it.weapon) continue;
    const key = holdKeyOf(it, id);
    if (!key) { assert.equal(it.weapon.kind, 'melee', `${id}: only fists have no look`); continue; }
    keys.add(key);
    const m = modelFor(key);
    assert.ok(m.geo?.attributes.position.count > 0, `${id} has geometry`);
    assert.deepEqual(m.grip, [0, 0, 0]);
    if (it.weapon.kind === 'gun') assert.ok(m.muzzle && m.muzzle.length === 3, `${id} muzzle`);
    else assert.ok(m.tip, `${id} tip`);
    if (m.kind === 'two' || m.kind === 'launcher') assert.ok(m.fore, `${id} fore grip`);
    for (const mode of ['carry', 'aim', 'swing']) assert.ok(poseOf(m, mode, { W: 1, t: 0.5, arc: 0.8 }).g.length === 3);
  }
  for (const id of Object.keys(FUTURE_WEAPONS)) { const it = g.content.items[id]; const m = modelFor(holdKeyOf(it, id)); assert.ok(m.glow, `${id} glows`); assert.ok(m.glowColor); }
  assert.ok(poseOf(FIST, 'swing', { t: 0.5 }).g.length === 3);
  assert.ok(keys.size >= 25);
});

test('a figure holds, raises, swings, drops and re-holds a weapon without rebuilding', () => {
  const f = new Figure({ skin: '#d9a77c' }, null, null);
  f.setWeapon('rifle');
  f.pose({ x: 0, y: 0, z: 0, yaw: 0, phase: null, aim: true, kick: 1 });
  const v = new THREE.Vector3(); const d = new THREE.Vector3();
  assert.ok(f.muzzleWorld(v, d));
  assert.ok(d.z > 0.9, 'raised: the muzzle points along the facing');
  f.pose({ x: 0, y: 0, z: 0, yaw: 0, phase: null, lying: true });
  assert.equal(f.mount.parent, f.spin, 'dropped beside a figure that is down');
  f.setWeapon(null);
  assert.equal(f.mount.visible, false);
  f.pose({ x: 0, y: 0, z: 0, yaw: 0, phase: null, swing: 0.5, stun: true, flash: 1, flinch: 1, time: 1 });
  assert.ok(f.stars.visible);
});

function fakeWorld(game) {
  const map = { id: 'm', kind: 'street' };
  const host = { game, layers: [{ map, x: 0, y: 0 }] };
  return { host, figures: new Map(), cands: [], map };
}

test('over a long firefight the pools and instances never pass their caps, and decals follow combat.decals', () => {
  const g = newGame();
  const fx = new CombatFx3D(new THREE.Scene());
  const w = fakeWorld(g);
  g.player.map = 'm';
  const C = g.combat;
  const kinds = [null, 'pigeon', 'fish', 'cheese', 'coin', 'nail', 'chalk', 'ray', 'harpoon', 'card', 'ring', 'confetti'];
  g.heavy.decals = []; g.heavy.projectiles = []; g.heavy.drones = [];
  let worst = 0;
  for (let i = 0; i < 400; i++) {
    g.realTime += 0.05;
    const t = g.realTime;
    for (let k = 0; k < 4; k++) {
      C.bullets.push({ map: 'm', x: 100 + i, y: 80 + k * 9, dx: 1, dy: 0, left: 200, speed: 1700, kind: kinds[(i + k) % kinds.length], hurts: i % 3 ? null : { by: 'x', damage: 1 }, born: t });
      C.particles.push({ kind: ['blood', 'case', 'coin', 'confetti'][k], map: 'm', x: 120 + k, y: 90, z: 20, vx: 10, vy: 5, vz: 30, size: 1 + (k % 2), hue: k });
      C.decals.push({ kind: ['blood', 'pool', 'case', 'coin'][k], map: 'm', x: 50 + i, y: 60 + k, size: 1 + (k % 2), at: t });
    }
    C.fx.push({ type: 'flash', x: 120, y: 80, dir: { x: 1, y: 0 }, start: t, until: t + 0.5 }, { type: 'spark', x: 130, y: 80, start: t, until: t + 0.5 }, { type: 'swing', x: 100, y: 80, dir: { x: 1, y: 0 }, range: 40, arc: 1, start: t, until: t + 0.5 }, { type: 'blast', x: 140, y: 100, r: 60, start: t, until: t + 0.9 });
    for (let k = 0; k < 8; k++) { g.heavy.projectiles.push({ kind: 'rocket', x: 200, y: 100 + k, vx: 300, vy: 0 }); g.heavy.drones.push({ kind: 'hornet', x: 90, y: 90, born: 0 }); g.heavy.decals.push({ map: 'm', x: 100 + k, y: 100, r: 40, until: t + 100 }); }
    g.vehicles.skids = Array.from({ length: 20 }, (_, n) => ({ map: 'm', x0: n * 10, y0: 5, x1: n * 10 + 8, y1: 9, t }));
    if (C.bullets.length > 80) C.bullets.splice(0, C.bullets.length - 80);
    if (C.particles.length > 200) C.particles.splice(0, C.particles.length - 200);
    if (C.decals.length > 260) C.decals.splice(0, C.decals.length - 260);
    C.fx = C.fx.filter((f) => f.until > t); g.heavy.projectiles.splice(0, Math.max(0, g.heavy.projectiles.length - 10)); g.heavy.drones.splice(0, Math.max(0, g.heavy.drones.length - 10)); g.heavy.decals.splice(0, Math.max(0, g.heavy.decals.length - 30));
    w.cands.length = 0;
    fx.update(w);
    const s = poolSizes(fx);
    assert.ok(s.flash <= CAPS.flash && s.spark <= CAPS.spark && s.swing <= CAPS.swing && s.blast <= CAPS.blast && s.rocket <= CAPS.rocket && s.drone <= CAPS.drone && s.odd <= CAPS.odd);
    assert.ok(fx.bits.n <= CAPS.bits && fx.streaks.n <= CAPS.streaks);
    const visible = C.decals.filter((d) => d.map === 'm' && (t - d.at) < 240).length;
    assert.equal(fx.stats.decals, visible, 'one 3D decal per simulation decal');
    worst = Math.max(worst, s.odd);
  }
  assert.ok(worst > 0 && w.cands.length >= 1, 'odd bullets drew and a flash light was offered');
  fx.dispose();
});
