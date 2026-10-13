// The world map (v0.15.1): every outdoor map placed in one world, regions
// joined by roads at their gateways, and an icon for every named building.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';
import { MapRenderer } from '../src/ui/maps.js';
import { BUILDING_ICONS } from '../src/content/mapIcons.js';

test('the world layout places every outdoor map, without overlaps', () => {
  const g = newGame(1);
  const L = new MapRenderer(g).worldLayout();
  const outdoor = Object.values(CONTENT.maps).filter((m) => m.kind !== 'interior').map((m) => m.id);
  for (const id of outdoor) assert.ok(L.pos[id], `${id} is on the world map`);
  const boxes = outdoor.map((id) => ({ id, ...L.pos[id], w: g.maps.get(id).width, h: g.maps.get(id).height }));
  for (const a of boxes) for (const b of boxes) {
    if (a.id >= b.id) continue;
    // seamless neighbours share one seam column; anything more is an overlap
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    assert.ok(ox <= 1 || oy <= 0, `${a.id} overlaps ${b.id}`);
  }
  assert.equal(L.roads.length, 2, 'Westbrook–Halvermouth and Halvermouth–Yards');
  assert.ok(L.pos.halvermouth.x < L.pos.westbrook.x, 'Halvermouth lies west of Westbrook');
  assert.ok(L.pos.yards.x < L.pos.halvermouth.x, 'the Yards lie west of Halvermouth');
});

test('every named building has a map icon, and the icons point at real buildings', () => {
  const ids = new Set();
  for (const m of Object.values(CONTENT.maps)) {
    if (m.kind === 'interior') continue;
    for (const b of m.buildings || []) {
      ids.add(b.id);
      if (b.name !== 'Shack') assert.ok(BUILDING_ICONS[b.id], `${b.id} (${b.name}) has an icon`);
    }
  }
  for (const id of Object.keys(BUILDING_ICONS)) assert.ok(ids.has(id), `${id} exists`);
});

test('inside a building, you are shown at its door', () => {
  const g = newGame(1); // starts in the flat at Number 9
  const me = new MapRenderer(g).playerWorld();
  assert.ok(me && me.inside, 'placed at the door');
  const L = new MapRenderer(g).worldLayout();
  assert.ok(me.x >= L.pos.lanternside.x && me.x <= L.pos.lanternside.x + g.maps.get('lanternside').width);
});
