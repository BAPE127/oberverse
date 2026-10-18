// Seamless buildings (v0.47.0): every building's interior is laid over its footprint, and you
// walk in and out through the front door with no scene change. Locks still hold from the street;
// you can always leave; cars can't drive in; the towns grew so every room fits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, TILE } from './helpers.mjs';

const walk = (g, s, x, y) => { const ev = []; const off = g.bus.on('map:entered', (e) => ev.push(e)); for (let t = 0; t < s; t += 0.05) g.update(0.05, { x, y, sprint: false }); off?.(); return ev; };
/** Stand on the street just below a building's front door. */
const belowDoor = (g, mapId, bid) => {
  const m = g.maps.get(mapId);
  const b = m.buildings.find((x) => x.id === bid);
  g.changeMap(mapId, null, { x: (b.door.x + 0.5) * TILE, y: (b.door.y + 1.7) * TILE });
  return b;
};

test('every building on every street has its room laid over it, exactly its size, in its region', () => {
  let n = 0;
  for (const id of ['lanternside', 'westbrook', 'ober_fields', 'halvermouth', 'yards', 'lariat']) {
    const S = CONTENT.maps[id];
    const region = Object.values(CONTENT.regions).find((r) => r.maps[id]);
    for (const b of S.buildings) {
      if (b.round) continue;
      assert.ok(b.interior, `${id}/${b.id} has an interior`);
      const I = CONTENT.maps[b.interior];
      assert.equal(I.tiles[0].length, b.w, `${b.interior} width`);
      assert.equal(I.tiles.length, b.h, `${b.interior} height`);
      const at = region.maps[b.interior];
      assert.deepEqual([at.x - region.maps[id].x, at.y - region.maps[id].y], [b.x, b.y], `${b.interior} sits on its footprint`);
      if (b.door) assert.ok(b.door.portal && I.doors.some((d) => d.portal && d.to.map === id), `${b.id}: a walk-through door`);
      n++;
    }
  }
  assert.ok(n > 100, `${n} buildings`);
});

test('walk into the Kettle & Crumb and out again: no scene change, and you are where you walked', () => {
  const g = newGame(3);
  setTime(g, 1, '10:00');
  noImpulses(g);
  belowDoor(g, 'lanternside', 'b_cafe');
  const off = g.mapOffset('lanternside', 'cafe');
  const worldY = () => g.player.y + (g.player.map === 'cafe' ? off.y : 0);
  const y0 = worldY();
  const ev = walk(g, 1.2, 0, -1);
  assert.equal(g.player.map, 'cafe');
  assert.ok(ev.length && ev.every((e) => e.seamless), 'crossed seamlessly');
  assert.ok(y0 - worldY() > 2 * TILE, 'kept walking (no jump to a spot)');
  walk(g, 1.6, 0, 1);
  assert.equal(g.player.map, 'lanternside');
});

test('a locked front door stays shut from the street; inside after hours you can still leave', () => {
  const g = newGame(3);
  setTime(g, 1, '23:30');
  noImpulses(g);
  belowDoor(g, 'lanternside', 'b_cafe');
  walk(g, 1.2, 0, -1);
  assert.equal(g.player.map, 'lanternside', 'the café is shut');
  assert.ok(g.interactables().some((t) => t.kind === 'door' && /locked/.test(t.label)), 'and says so');
  // inside at closing time: out you go
  g.changeMap('cafe', 'entry');
  walk(g, 1.5, 0, 1);
  assert.equal(g.player.map, 'lanternside');
});

test('cars stop at a building\'s front door', () => {
  const g = newGame(3);
  const b = belowDoor(g, 'lanternside', 'b_cafe');
  const actor = g.vehicles.actor(false);
  assert.equal(g.maps.get('lanternside').blockedTile(b.door.x, b.door.y, actor), true);
});

test('people go in and out of the buildings on foot while you watch', () => {
  const g = newGame(4);
  setTime(g, 1, '14:30'); // at three (setting off a little early) Mags leaves the café for the bench on the square
  noImpulses(g);
  g.changeMap('lanternside', 'start');
  const mags = g.npcs.get('npc_mags');
  assert.equal(mags.map, 'cafe');
  const path = [];
  for (let i = 0; i < 600 && !(mags.map === 'lanternside' && mags.arrived); i++) {
    g.update(0.25, { x: 0, y: 0, sprint: false });
    path.push(`${mags.map}:${Math.floor(mags.x / TILE)},${Math.floor(mags.y / TILE)}`);
  }
  assert.equal(mags.map, 'lanternside', 'out on the square');
  // she walked out through the door (never jumped): consecutive steps are at most a tile apart in the world
  const off = g.mapOffset('lanternside', 'cafe');
  const world = path.map((p) => { const [m, xy] = p.split(':'); const [x, y] = xy.split(',').map(Number); return m === 'cafe' ? [x + off.x / TILE, y + off.y / TILE] : [x, y]; });
  for (let i = 1; i < world.length; i++) assert.ok(Math.abs(world[i][0] - world[i - 1][0]) + Math.abs(world[i][1] - world[i - 1][1]) <= 2, `a jump at ${path[i - 1]} → ${path[i]}`);
});

test('a save from before the towns grew loads with you on the same spot of the grown street', () => {
  const g = newGame(3);
  g.changeMap('lanternside', 'start');
  const data = JSON.parse(JSON.stringify(g.serialize()));
  data.gameVersion = '0.46.0';
  data.player.x = 20.5 * TILE; // a tile of the 0.46 street
  data.player.y = 14.5 * TILE;
  const g2 = new (g.constructor)(CONTENT, { seed: 1 });
  g2.loadState(data);
  const { fx, fy } = CONTENT.growShifts.lanternside;
  assert.equal(g2.player.x, fx(20.5) * TILE);
  assert.equal(g2.player.y, fy(14.5) * TILE);
  // a current save is left alone
  const g3 = new (g.constructor)(CONTENT, { seed: 1 });
  g3.loadState(JSON.parse(JSON.stringify(g2.serialize())));
  assert.equal(g3.player.x, g2.player.x);
});
