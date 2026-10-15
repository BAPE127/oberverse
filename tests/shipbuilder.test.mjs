// v0.26.0: the side-profile shipbuilder — where parts sit (the design's
// layout) is saved and survives a reload but never changes a ship's numbers;
// the detailed profile renderer covers every hull and every part.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { attachPoints, drawProfile, drawPartIcon, fitFor, detailedLook, PROFILE_PART, profileBounds } from '../src/engine/drawShipProfile.js';

const L = CONTENT.logistics;
const withYard = () => {
  const g = newGame(51);
  setTime(g, 1, '09:00');
  g.player.money = 5_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.logistics.shipyard.commissionYard('port_millroad').ok);
  g.skipTime(6 * 1440);
  return g;
};
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 6 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };
/** A canvas context that accepts every call and records nothing. */
const fakeCtx = () => {
  const grad = { addColorStop() {} };
  const target = { canvas: { width: 800, height: 400 } };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => grad : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
};
const sparse = { kind: 'cargo', hull: 'h_freighter', components: ['c_diesel', 'c_nav_basic', 'c_hold_large'], layout: [0, 6, 3], name: 'Gappy', appearance: { color: '#2a4a8a', trim: '#e8c35a' }, port: 'port_millroad' };

test('a design\'s layout places its parts (gaps allowed) without changing its numbers', () => {
  const g = withYard();
  const Y = g.logistics.shipyard;
  assert.deepEqual(Y.fitOf(sparse), ['c_diesel', null, null, 'c_hold_large', null, null, 'c_nav_basic']);
  const inOrder = Y.compute({ ...sparse, layout: undefined });
  const gappy = Y.compute(sparse);
  assert.deepEqual(inOrder.look.fit, ['c_diesel', 'c_nav_basic', 'c_hold_large', null, null, null, null]);
  for (const k of ['capacity', 'speed', 'range', 'reliability', 'opex', 'upkeep', 'price']) assert.equal(gappy[k], inOrder[k], k);
  assert.deepEqual(Y.validate(sparse).reasons, Y.validate({ ...sparse, layout: undefined }).reasons);
  // a broken layout (duplicate, out of range, wrong length) falls back to "in order"
  for (const layout of [[0, 0, 1], [0, 1, 99], [0, 1], 'x']) assert.deepEqual(Y.layoutOf({ ...sparse, layout }), [0, 1, 2]);
});

test('the layout is kept through the keel, the launch and a reload', () => {
  const g = withYard();
  const Y = g.logistics.shipyard;
  assert.ok(Y.buyMissing(sparse).ok);
  const r = Y.commission(sparse);
  assert.ok(r.ok, r.text);
  assert.deepEqual(r.build.design.layout, [0, 6, 3]);
  const g2 = reload(g);
  g2.skipTime(8 * 1440);
  const v = g2.logistics.vessels().find((x) => x.name === 'Gappy');
  assert.ok(v, 'launched');
  const look = g2.logistics.model(v.model).look;
  assert.deepEqual(look.fit, ['c_diesel', null, null, 'c_hold_large', null, null, 'c_nav_basic']);
  const g3 = reload(g2);
  assert.deepEqual(g3.logistics.model(v.model).look, look);
});

test('attachment points: one per slot, stern to bow, on the deck, clear of the bridge', () => {
  for (const [id, H] of Object.entries(L.hulls)) {
    const pts = attachPoints({ ...H.look, slots: H.slots });
    assert.equal(pts.length, H.slots, id);
    const len = H.look.len * 100;
    for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x > pts[i - 1].x, `${id} ordered`);
    for (const p of pts) {
      assert.ok(Math.abs(p.x) < len / 2, `${id} on the hull`);
      assert.ok(p.y < 0, `${id} above the water`);
      assert.ok(p.w > 0);
    }
  }
});

test('every part has a drawing; every stock ship gets a fit of real parts; nothing throws', () => {
  for (const id of Object.keys(L.components)) assert.ok(PROFILE_PART[id], `${id} has a profile drawing`);
  const ctx = fakeCtx();
  for (const [id, m] of Object.entries(L.ships)) {
    const fit = fitFor(m);
    assert.ok(fit.length > 0, id);
    for (const c of fit) assert.ok(L.components[c], `${id}: ${c} is a real part`);
    assert.doesNotThrow(() => drawProfile(ctx, detailedLook(m), { time: 1, points: fit.map(() => ({ state: 'empty' })) }), id);
    const b = profileBounds(m.look);
    assert.ok(b.x1 > b.x0 && b.y1 > b.y0);
  }
  for (const [id, H] of Object.entries(L.hulls)) {
    const all = Object.keys(L.components).slice(0, H.slots);
    assert.doesNotThrow(() => drawProfile(ctx, { ...H.look, color: '#445566', trim: '#ddeeff', fit: all, slots: H.slots }, { time: 2 }), id);
  }
  for (const id of Object.keys(L.components)) assert.doesNotThrow(() => drawPartIcon(ctx, id, 120, 84), id);
});
