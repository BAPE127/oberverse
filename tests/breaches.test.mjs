// Holes blown in walls in the open world (v0.106.0, src/systems/breaches.js): a blast opens a wall, the hole is a way in and out both ways,
// it survives a save and a load, Mason's Os bricks it up for a fee, and the gate keeps imported characters' and government buildings whole.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { BREACH } from '../src/content/destruction.js';
import { setCoupState } from '../src/war/protection.js';

const civil = (g, street = 'halvermouth') => g.maps.get(street).buildings.find((q) => q.interior && !q.tower && g.breaches.ownerOf(street, q) === 'civil' && g.breaches.candidates(g.maps.get(street), (q.x + q.w / 2) * 32, (q.y + q.h + 0.6) * 32, 3 * 32).length);
const blastBelow = (g, street, b, dmg = 200) => g.breaches.blast(street, (b.x + b.w / 2) * 32, (b.y + b.h + 0.6) * 32, 3, dmg);

test('a heavy blast opens the wall of an ordinary building: a seamless way in on the street and out of the room, rubble outside', () => {
  const g = newGame(); const S = g.maps.get('halvermouth'); const b = civil(g); assert.ok(b, 'a civil building to try');
  assert.equal(blastBelow(g, 'halvermouth', b, BREACH.minDamage - 1), 0, 'a small blast only scorches');
  const n = blastBelow(g, 'halvermouth', b); assert.ok(n >= 1 && n <= BREACH.perBlast, String(n));
  const r = g.world.breaches[0]; const I = g.maps.get(b.interior);
  const out = S.doorAt(r.x, r.y); const inn = I.doorAt(r.ix, r.iy);
  assert.ok(out?.portal && out.seamless && out.to.map === I.id, 'the street side leads into the room');
  assert.ok(inn?.portal && inn.seamless && inn.to.map === S.id, 'the room side leads out to the street');
  assert.ok(!S.blockedTile(r.x, r.y) && !I.blockedTile(r.ix, r.iy), 'both sides can be walked');
  assert.ok(S.props.some((p) => p.type === 'rubble' && p.x === r.ox && p.y === r.oy), 'rubble outside');
  assert.ok(['damaged', 'intact'].includes(g.breaches.structure('halvermouth', b).state), 'a building is never destroyed by holes');
});

test('the holes survive a save and a load, and nothing else in the maps changes', () => {
  const g = newGame(); const b = civil(g); blastBelow(g, 'halvermouth', b); const n = g.world.breaches.length; assert.ok(n);
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const h = newGame(); h.loadState(state); assert.equal(h.world.breaches.length, n);
  for (const r of h.world.breaches) { const S = h.maps.get(r.street); const I = h.maps.get(S.buildings.find((q) => q.id === r.b).interior); assert.ok(S.doorAt(r.x, r.y)?.breach && I.doorAt(r.ix, r.iy)?.breach); }
  h.loadState(state); assert.equal(h.world.breaches.length, n, 'loading twice does not lay a hole twice');
  assert.equal(h.maps.get('halvermouth').doors.filter((d) => d.breach).length, n);
});

test('Mason\'s Os brick a hole up for a fee: the wall and the room are as they were', () => {
  const g = newGame(); const b = civil(g); blastBelow(g, 'halvermouth', b); const r = g.world.breaches[0]; const id = `breach_${r.b}_${r.x}_${r.y}`;
  g.player.money = 10; assert.equal(g.breaches.repair(id).ok, false, 'not without the money');
  g.player.money = 1000; const res = g.breaches.repair(id); assert.ok(res.ok, res.text); assert.equal(g.player.money, 1000 - BREACH.repairCost);
  const S = g.maps.get('halvermouth'); const I = g.maps.get(b.interior);
  assert.equal(S.tileAt(r.x, r.y), 'B'); assert.equal(I.tileAt(r.ix, r.iy), 'W'); assert.ok(!S.doorAt(r.x, r.y) && !I.doorAt(r.ix, r.iy)); assert.ok(!S.props.some((p) => p.id === `${id}_rubble`));
  assert.equal(g.world.breaches.some((q) => q === r), false);
});

test('imported characters\' buildings never break; government buildings only once a coup is staged', () => {
  const g = newGame();
  const imp = []; for (const street of ['lanternside', 'westbrook', 'halvermouth', 'ober_fields']) { const S = g.maps.get(street); for (const b of S?.buildings || []) if (b.interior && g.breaches.ownerOf(street, b) === 'imported') imp.push([street, b]); }
  assert.ok(imp.length, 'some imported characters\' buildings');
  for (const [street, b] of imp) assert.equal(blastBelow(g, street, b, 400), 0, `${b.id} stays whole`);
  const S = g.maps.get('halvermouth'); const gov = S.buildings.find((q) => q.interior && g.breaches.ownerOf('halvermouth', q) === 'government' && g.breaches.candidates(S, (q.x + q.w / 2) * 32, (q.y + q.h + 0.6) * 32, 96).length);
  if (gov) {
    assert.equal(blastBelow(g, 'halvermouth', gov), 0, 'no coup: a government building is whole');
    setCoupState(g, 'staged', 'test'); assert.ok(blastBelow(g, 'halvermouth', gov) > 0, 'a staged coup: it can be breached');
  }
  const cafe = g.maps.get('lanternside').buildings.find((q) => q.interior === 'cafe'); assert.notEqual(g.breaches.ownerOf('lanternside', cafe), 'imported', 'a café where an imported character only eats is ordinary');
});

test('a hole can be walked through from the street into the room', () => {
  const g = newGame(); const b = civil(g); blastBelow(g, 'halvermouth', b); const r = g.world.breaches[0];
  g.changeMap('halvermouth', Object.keys(g.maps.get('halvermouth').spots)[0]);
  const dx = r.x - r.ox; const dy = r.y - r.oy; // (from the rubble towards the wall)
  g.player.x = (r.ox + 0.5) * 32; g.player.y = (r.oy + 0.5) * 32 + (dy < 0 ? 8 : 0);
  for (let i = 0; i < 120 && g.player.map === 'halvermouth'; i++) g.update(1 / 30, { x: dx, y: dy, sprint: false });
  assert.equal(g.player.map, b.interior, `walked in (at ${Math.floor(g.player.x / 32)},${Math.floor(g.player.y / 32)} on ${g.player.map})`);
});
