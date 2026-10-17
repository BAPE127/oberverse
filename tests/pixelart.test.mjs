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

test('roofless buildings: every building draws without a roof; the café shows its counter, all furniture inside the walls', async () => {
  const { drawPixelBuilding, layout } = await import('../src/engine/drawPixelBuildings.js');
  const g = newGame(1);
  let n = 0;
  for (const m of g.maps.values()) {
    for (const b of m.buildings) {
      if (b.tower || b.round) continue;
      const door = m.doors.find((d) => d.building === b.id);
      const inside = door?.to?.map ? g.maps.get(door.to.map) : null;
      const cv = fakeCanvas(1, 1);
      cv.ctx.measureText = (t) => ({ width: t.length * 5 });
      drawPixelBuilding(cv.ctx, b, { inside, time: 0, night: false });
      for (const [x, y, w, h] of cv.ctx.rects) assert.ok(y >= b.y * 32 - 40 && y + h <= (b.y + b.h) * 32 + 8, `${m.id}/${b.id}: nothing above the walls (no roof)`);
      const W = b.w * 16 - 6;
      const H = b.h * 16 - 25;
      for (const p of layout(b, inside, W, H)) assert.ok(p.ax >= 0 && p.ay >= 0 && p.ax + p.w * 16 <= W && p.ay + p.h * 16 <= H, `${b.id}: ${p.type} inside`);
      n++;
    }
  }
  assert.ok(n > 50);
  const lm = g.maps.get('lanternside');
  const cafe = lm.buildings.find((b) => b.id === 'b_cafe');
  assert.ok(layout(cafe, g.maps.get('cafe'), cafe.w * 16 - 6, cafe.h * 16 - 25).some((p) => p.type === 'counter'));
});
