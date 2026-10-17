// Art revamp stage 2 (v0.39.0): the pixel ground builds for every map at art resolution and only
// draws whole art pixels; every prop on every map draws in pixel style (or falls back) without error.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { buildPixelGround } from '../src/engine/drawPixelGround.js';
import { drawPixelProp } from '../src/engine/drawPixelProps.js';

/** A canvas stand-in that records fillRects. */
function fakeCanvas(w, h) {
  const rects = [];
  const t0 = { rects, fillStyle: '' };
  t0.fillRect = (x, y, ww, hh) => rects.push([x, y, ww, hh, t0.fillStyle]);
  const ctx = new Proxy(t0, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => ctx, ctx };
}

test('the pixel ground: every map builds at 16 art pixels a tile, on whole pixels; roads get a centre line', () => {
  const g = newGame(1);
  let lines = 0;
  for (const m of g.maps.values()) {
    const cv = buildPixelGround(m, fakeCanvas);
    assert.equal(cv.width, m.width * 16, m.id);
    assert.equal(cv.height, m.height * 16, m.id);
    // fields are drawn with the old (smooth) code at half scale; everything else is whole pixels
    if (!m.def?.fields) for (const [x, y, w, h] of cv.ctx.rects) assert.ok(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(w) && Number.isInteger(h), `${m.id}: ${x},${y} ${w}×${h}`);
    if (m.id === 'lanternside') lines = cv.ctx.rects.filter((r) => r[4] === '#e8b83a').length;
  }
  assert.ok(lines > 0);
});

test('pixel props: every prop on every map draws (or cleanly falls back) without throwing', () => {
  const g = newGame(1);
  const handled = new Set();
  for (const m of g.maps.values()) {
    for (const p of m.props) {
      const { ctx } = fakeCanvas(1, 1);
      if (drawPixelProp(ctx, p, { time: 1, night: true })) handled.add(p.type);
    }
  }
  for (const t of ['tree', 'streetlamp', 'bench', 'counter', 'chair', 'shelf', 'bed']) assert.ok(handled.has(t), t);
});
