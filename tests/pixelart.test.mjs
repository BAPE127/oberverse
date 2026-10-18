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

test('the pixel ground: every map builds at world resolution (32 px a tile), on whole pixels (half art units); roads get a centre line', () => {
  const g = newGame(1);
  let lines = 0;
  for (const m of g.maps.values()) {
    const cv = buildPixelGround(m, fakeCanvas);
    assert.equal(cv.width, m.width * 32, m.id);
    assert.equal(cv.height, m.height * 32, m.id);
    // fields are drawn with the old (smooth) code at half scale; everything else is whole pixels
    if (!m.def?.fields) for (const [x, y, w, h] of cv.ctx.rects) assert.ok([x, y, w, h].every((v) => Number.isInteger(v * 2)), `${m.id}: ${x},${y} ${w}×${h}`);
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

test('pixel people: every character draws (every hair style, hat, outfit) facing every way, walking and asleep', async () => {
  const { drawPixelCharacter } = await import('../src/engine/drawPixelCharacters.js');
  const g = newGame(1);
  let n = 0;
  for (const npc of g.npcs.values()) {
    for (const facing of ['down', 'up', 'left', 'right']) {
      const { ctx } = fakeCanvas(1, 1);
      drawPixelCharacter(ctx, npc.profile.appearance, { x: 10, y: 10, facing, moving: true, animTime: 0.3, idleTime: 1, sleeping: facing === 'up' }, () => {});
      assert.ok(ctx.rects.length > 20, `${npc.id} ${facing}`);
      for (const [x, y, w, h] of ctx.rects) assert.ok(Number.isFinite(x + y + w + h), npc.id);
    }
    n++;
  }
  assert.ok(n > 15);
});

test('the hotbar: an icon for fists and every weapon in the game', async () => {
  const { drawWeaponIcon } = await import('../src/ui/hotbar.js');
  const g = newGame(1);
  const ids = [null, ...Object.keys(g.content.items).filter((id) => g.content.items[id].weapon)];
  for (const id of ids) {
    const cv = fakeCanvas(48, 48);
    drawWeaponIcon(cv, id ? { id, ...g.content.items[id] } : null);
    assert.ok(cv.ctx.rects.length >= 4, `${id} has an icon`);
  }
});

test('the ground in chunks (v0.48.0): built chunk by chunk it is pixel for pixel the ground built whole — no seams', async () => {
  const { buildGroundChunk, buildPixelGround, CHUNK } = await import('../src/engine/drawPixelGround.js');
  const g = newGame(1);
  // a canvas stand-in with real pixel data
  const imgCanvas = (w, h) => {
    const ctx = new Proxy({ img: null }, {
      get: (t, k) => (k in t ? t[k] : k === 'createImageData' ? (a, b) => ({ width: a, height: b, data: new Uint8ClampedArray(a * b * 4) }) : k === 'putImageData' ? (im) => { t.img = im; } : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    return { width: w, height: h, getContext: () => ctx, ctx };
  };
  for (const id of ['westbrook', 'cafe']) { // a beach and a river; a room with walls
    const m = g.maps.get(id);
    const whole = buildPixelGround(m, imgCanvas).ctx.img;
    const W = m.width * 32;
    assert.ok(whole.data.some((v, i) => i % 4 === 3 && v === 255), `${id}: pixels painted`);
    let checked = 0;
    for (let cy = 0; cy * CHUNK < m.height; cy++) for (let cx = 0; cx * CHUNK < m.width; cx++) {
      const part = buildGroundChunk(m, cx, cy, imgCanvas).ctx.img;
      const a = new Uint32Array(part.data.buffer);
      const b = new Uint32Array(whole.data.buffer);
      for (let y = 0; y < part.height; y++) for (let x = 0; x < part.width; x++) {
        const wx = cx * CHUNK * 32 + x;
        const wy = cy * CHUNK * 32 + y;
        if (a[y * part.width + x] !== b[wy * W + wx]) assert.fail(`${id}: chunk ${cx},${cy} differs at ${wx},${wy}`);
        checked++;
      }
    }
    assert.equal(checked, W * m.height * 32);
  }
});

test('prop sprites (v0.49.0): every prop with a sprite paints, day and night, inside its sprite box', async () => {
  const { paintPropForTest, SPRITE_PROPS } = await import('../src/engine/propSprites.js');
  const g = newGame(1);
  const seen = new Set();
  for (const m of g.maps.values()) for (const p of m.props) {
    if (!SPRITE_PROPS.has(p.type)) continue;
    for (const night of [false, true]) for (const links of [0, 5, 10, 15]) {
      const r = paintPropForTest(p, { night, links });
      const [x0, y0, x1, y1] = r.box;
      assert.ok(r.rects.length > 0, `${m.id}/${p.id}: painted`);
      for (const [x, y, w, h] of r.rects) {
        if (w <= 0 || h <= 0) continue;
        assert.ok(x >= x0 && y >= y0 && x + w <= x1 + 1 && y + h <= y1 + 1, `${m.id}/${p.id} (${p.type}): ${x},${y} ${w}×${h} outside ${r.box}`);
      }
    }
    seen.add(p.type);
  }
  for (const t of ['tree', 'chair', 'table', 'streetlamp', 'ranchfence', 'trafficlight', 'bed', 'shelf']) assert.ok(seen.has(t), t);
});
