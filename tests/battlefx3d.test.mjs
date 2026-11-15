// The battle's fire, smoke and tracers in 3D (src/engine3d/battleFx3d.js): each FxLayer particle lands on the pixel the 2D layer painted it on, and the
// meshes stay within their caps however much is burning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import { project } from '../src/engine/iso.js';
import { particlePlace, tracerSpan, BattleFx3D } from '../src/engine3d/battleFx3d.js';

test('a particle is placed where the 2D layer drew it: ground point, height and screen drift', () => {
  for (const q of [{ x: 320, y: 160, z: 6, ox: 0, oy: 0, s: 3 }, { x: 100, y: 900, z: 12, ox: 14, oy: -30, s: 5 }, { x: 64, y: 64, z: 40, ox: -9, oy: -4, s: 2 }]) {
    const P = particlePlace(q); const a = project(q.x, q.y, q.z); const b = project(P.x * 32, P.z * 32, P.y * 32);
    if (P.y * 32 > (q.z - q.oy) + 1e-9) continue; // (lifted off the ground by its own radius: a puff never sinks into it)
    assert.ok(Math.abs(b.x - (a.x + q.ox)) < 1e-6 && Math.abs(b.y - (a.y + q.oy)) < 1e-6, JSON.stringify({ q, a, b }));
  }
});

test('a tracer runs from the shooter towards the target as it ages, at the height it was fired from', () => {
  const l = { x0: 0, y0: 0, x1: 320, y1: 0, z: 12, side: 'p', age: 0 };
  const s0 = tracerSpan(l); const s2 = tracerSpan({ ...l, age: 2 });
  assert.equal(s0.x0, 0); assert.ok(s2.x0 > s0.x0 && s2.x1 > s0.x1 && s2.x1 <= 10); assert.equal(s0.y, 12 / 32);
});

test('the meshes stay within their caps over a long fight, and dispose cleanly', () => {
  const root = new THREE.Group(); const fx3 = new BattleFx3D(root);
  const kinds = ['fire', 'flash', 'spark', 'smoke', 'dust', 'screen'];
  const fx = { p: Array.from({ length: 600 }, (_, i) => ({ k: kinds[i % 6], x: i * 3, y: i * 2, z: 6, ox: 0, oy: -i % 30, age: i % 10, life: 20, s: 3 })), lines: Array.from({ length: 80 }, (_, i) => ({ x0: 0, y0: i, x1: 300, y1: i + 40, z: 12, side: i % 2 ? 'p' : 'e', age: 1 })) };
  const n = fx3.sync(fx, false); assert.ok(n > 600 && n <= 600 + 80, String(n));
  assert.ok(fx3.sync(fx, true) < n, 'the overview tier leaves out sparks, flashes and tracers');
  fx3.dispose(); assert.equal(root.children.length, 0);
});
