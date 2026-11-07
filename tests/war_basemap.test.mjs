// The base redrawn as a military base (v0.103.6): its layout is consistent (everything inside the fence, nothing overlapping, the airfield where the markings say), every facility has a look and
// its room is made from it, and the company's parked machines stand at stands that exist, one each, in the same place every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT, newGame, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { warGame, buildAll, days } from './war_helpers.mjs';
import { SLOTS, FENCE, AIRFIELD, PARK, INNER, HM_W, HM_H } from '../src/content/maps/hollowmoor.js';
import { FACILITIES } from '../src/content/facilities.js';
import { KIT, LOOK_OF, lookOf } from '../src/content/baseKit.js';
import { parkedMachines } from '../src/engine/drawParked.js';

const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

test('every facility keeps its slot, stands inside the fence and the lot, and no two overlap or stand in the road, the airfield or the yard', () => {
  assert.equal(Object.keys(SLOTS).length, Object.values(FACILITIES).length); for (const F of Object.values(FACILITIES)) assert.ok(SLOTS[F.slot], F.id);
  assert.ok(HM_H >= FENCE.y1 + 1 && HM_W >= FENCE.x1 + 1);
  const slots = Object.entries(SLOTS);
  for (const [k, r] of slots) {
    assert.ok(r[0] > FENCE.x0 && r[0] + r[2] <= FENCE.x1 && r[1] > FENCE.y0 && r[1] + r[3] < INNER.y + 14, `${k} inside the fence`);
    assert.ok(!overlap(r, [FENCE.x0, 35, FENCE.x1 - FENCE.x0, 6]), `${k} not in the lot road`);
    for (const [k2, r2] of slots) if (k < k2) assert.ok(!overlap(r, r2), `${k} and ${k2} overlap`);
    assert.ok(!overlap(r, [8, 53, 30, 6]), `${k} not in the vehicle yard`);
    for (const a of [...AIRFIELD.aprons, ...AIRFIELD.taxiways, ...AIRFIELD.runways]) assert.ok(!overlap(r, [a.x, a.y, a.w, a.h]), `${k} not on the airfield`);
  }
});

test('the airfield: the runway, taxiway and apron are inside the fence and in order, every stand is on the apron, every pad is on the pad ground', () => {
  const [rw] = AIRFIELD.runways; const [tw] = AIRFIELD.taxiways; const [ap] = AIRFIELD.aprons;
  for (const r of [rw, tw, ap]) assert.ok(r.x > FENCE.x0 && r.x + r.w <= FENCE.x1 && r.y > INNER.y && r.y + r.h <= FENCE.y1, 'inside the airfield');
  assert.ok(ap.y + ap.h <= tw.y && tw.y + tw.h <= rw.y, 'apron, then taxiway, then runway'); assert.ok(rw.w >= 80, 'a runway of 80 tiles or more'); assert.deepEqual(rw.ends, ['09', '27']);
  for (const [sx, sy] of ap.slots) assert.ok(sx >= ap.x && sx < ap.x + ap.w && sy >= ap.y && sy < ap.y + ap.h);
  for (const [x, y] of PARK.apron) assert.ok(x > ap.x && x < ap.x + ap.w && y > ap.y && y < ap.y + ap.h, `apron stand ${x},${y}`);
  for (const [x, y] of PARK.helipads) assert.ok(x > FENCE.x0 && x < FENCE.x1 && y > INNER.y && y < ap.y, 'a helipad between the inner fence and the apron');
  const m = CONTENT.maps.hollowmoor_lot; assert.equal(m.airfield, AIRFIELD, 'the map carries the airfield markings');
  for (const [x, y] of [...PARK.ground]) assert.equal(m.tiles[Math.floor(y)][Math.floor(x)], 'a', `a yard stand on tarmac at ${x},${y}`);
  for (const [x, y] of PARK.apron) assert.equal(m.tiles[Math.floor(y)][Math.floor(x)], 'a', `an apron stand on tarmac at ${x},${y}`);
});

test('every facility has a look, its building carries it, and the room made inside has the look\'s furniture and wall style', () => {
  for (const F of Object.values(FACILITIES)) { assert.ok(LOOK_OF[F.id] && KIT[LOOK_OF[F.id]], `${F.id} has a look`); assert.ok(KIT[lookOf(F.id)].style, `${F.id}: a wall style`); }
  const g = newGame(1301); const M = CONTENT.maps.hollowmoor_lot;
  for (const b of M.buildings) {
    assert.equal(b.look, lookOf(b.facility), `${b.id} carries its look`);
    const room = g.maps.get(`hollowmoor_lot__${b.id}`)?.def; assert.ok(room, `${b.id} has a room`); assert.equal(room.look, b.look); assert.equal(room.wallStyle, KIT[b.look].style);
    assert.ok(room.props.length >= 3, `${b.id}'s room is furnished`);
  }
  const room = (id) => g.maps.get(`hollowmoor_lot__hm_${id}`).def.props.map((p) => p.type);
  assert.ok(room('bunk').includes('cot') && room('barracks_a').includes('cot'), 'barracks have cots');
  assert.ok(room('command').includes('monitor_wall'), 'the command room has its screens'); assert.ok(room('hangars').includes('engine_stand'), 'the hangar has tooling');
  assert.ok(room('factory').includes('machine') && room('works').includes('machine'), 'the factories have machines');
  for (const id of ['medical', 'hospital']) assert.ok(!room(id).includes('bed') && !room(id).includes('cot'), 'no beds at work (the owner\'s rule)');
});

test('parked machines: each owned vehicle, helicopter and aircraft stands at a stand that exists, one each, in the same place every time, and a machine on a job is not drawn', () => {
  const g = warGame(1302, { cash: 30_000_000 }); buildAll(g, 3);
  g.war.hire('technician'); for (let i = 0; i < 12; i++) g.war.hire('technician');
  for (const k of ['plate', 'engine', 'optics', 'rotor', 'avionics']) g.war.buySupply(k, 40);
  days(g, 1); assert.ok(g.war.order('anvil', 2).ok); assert.ok(g.war.order('wren', 1).ok); days(g, 10); assert.ok(g.war.equipment().length >= 2, 'the works finished something');
  const key = () => JSON.stringify(parkedMachines(g).map((m) => [m.id, m.x, m.y]));
  const a = key(); const list = parkedMachines(g);
  assert.equal(list.length, g.war.equipment().length, 'every machine at the base is drawn'); assert.equal(new Set(list.map((m) => `${m.x},${m.y}`)).size, list.length, 'no two on one stand');
  assert.equal(key(), a, 'drawing twice moves nothing'); assert.ok(list.every((m) => typeof m.draw === 'function'));
  const e = g.war.equipment()[0]; e.status = 'deployed'; assert.equal(parkedMachines(g).length, list.length - 1, 'a deployed machine is not parked');
});

test('a save made standing where the lot was open before the redraw (inside a building, the water tower or the new fence) loads on the nearest free tile, never stuck, and a good position is left alone', () => {
  const g = newGame(1303); g.changeMap('hollowmoor_lot', 'gate_inside');
  const at = (tx, ty) => { g.player.map = 'hollowmoor_lot'; g.player.x = tx * 32 + 16; g.player.y = ty * 32 + 16; const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
  for (const [tx, ty] of [[22, 66], [81, 66], [20, 74]]) {
    const g2 = at(tx, ty); const m = g2.maps.get(g2.player.map); const nx = Math.floor(g2.player.x / 32); const ny = Math.floor(g2.player.y / 32);
    assert.equal(g2.player.map, 'hollowmoor_lot'); assert.ok(!m.blockedTile(nx, ny), `${tx},${ty}: moved to a free tile`); assert.ok(Math.hypot(nx - tx, ny - ty) <= 8, `${tx},${ty}: a short way`);
  }
  const ok = at(10, 20); assert.equal(Math.floor(ok.player.x / 32), 10); assert.equal(Math.floor(ok.player.y / 32), 20);
});
