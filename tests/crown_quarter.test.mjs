// The Crown Quarter (v0.93.1): the capital district, entered by the Crown Gate off Crown Street in Halvermouth. Ten embassies and a Free Ports
// Mission, two party headquarters, a press hall, a hotel, six ministries, the Assembly, the Royal Pavilion and Halver House: the one building with
// a real interior (a main hall and ten rooms in three zones: public, by appointment, restricted). Every other building has a locked door and a
// plain room. Nobody works inside yet (the People release); the zones are enforced by the doors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, TILE } from './helpers.mjs';
import { findPath } from '../src/world/pathfinding.js';
import { HALVER_HOUSE } from '../src/content/maps/halverHouse.js';

const Q = CONTENT.maps.crown_quarter;
const HH = CONTENT.maps.halver_house;
const ZONE = { press: 'public', records: 'public', waiting: 'appointment', chief: 'appointment', cabinet: 'appointment', staff: 'appointment', security: 'restricted', president: 'restricted', negotiation_a: 'restricted', negotiation_b: 'restricted' };

test('the district is a region of its own, joined to Halvermouth by the Crown Gate both ways, and Halvermouth is the size it was', () => {
  assert.ok(CONTENT.regions.crown && CONTENT.regions.crown.maps.crown_quarter);
  const out = CONTENT.maps.halvermouth.doors.filter((d) => d.to.map === 'crown_quarter');
  const back = Q.doors.filter((d) => d.to.map === 'halvermouth');
  assert.equal(out.length, 4); assert.equal(back.length, 4, 'the road is four wide (Halvermouth\'s two gate tiles are widened with the rest of its roads)');
  for (const d of out) assert.ok(Q.spots[d.to.spot], 'a spot to arrive at');
  for (const d of back) assert.ok(CONTENT.maps.halvermouth.spots[d.to.spot], 'a spot to arrive at');
  assert.ok(Q.tiles[0].length >= 150 && Q.tiles.length >= 100, `${Q.tiles[0].length}×${Q.tiles.length}: about the size of the plan`);
  assert.equal(CONTENT.maps.halvermouth.tiles[0].length, 204, 'nothing moved to make room (the same width the banks test holds)');
});

test('what is in it: ten embassies and the Free Ports Mission, the parties, the press, the hotel, six ministries, the Assembly, the Pavilion and Halver House', () => {
  const ids = Q.buildings.map((b) => b.id);
  for (const c of ['ostmark', 'varn', 'teshvar', 'caldera', 'pallas', 'morrow', 'lirre', 'westreach', 'sunmouth', 'dunmere']) assert.ok(ids.includes(`cq_embassy_${c}`), `${c} has an embassy`);
  for (const c of Object.keys(CONTENT.arms.countries).filter((x) => x !== 'sund')) assert.ok(ids.includes(`cq_embassy_${c}`), `every country but Sund (the host) has one: ${c}`);
  for (const id of ['cq_free_ports', 'cq_order_hq', 'cq_liberty_hq', 'cq_press_hall', 'cq_hotel', 'cq_cafe', 'cq_club', 'cq_assembly', 'cq_pavilion', 'cq_halver_house', 'cq_staff_a', 'cq_staff_b', 'cq_civil_service']) assert.ok(ids.includes(id), id);
  assert.equal(ids.filter((x) => x.startsWith('cq_min_')).length, 6, 'six ministries');
  assert.equal(new Set(ids).size, ids.length);
});

test('every building has its room laid over it, exactly its size; only Halver House has a real interior and an open door in office hours', () => {
  for (const b of Q.buildings) {
    assert.ok(b.interior, `${b.id} has a room`);
    const I = CONTENT.maps[b.interior];
    assert.equal(I.tiles[0].length, b.w); assert.equal(I.tiles.length, b.h);
    assert.ok(CONTENT.regions.crown.maps[b.interior], `${b.interior} is in the region`);
  }
  const hh = Q.buildings.find((b) => b.id === 'cq_halver_house');
  assert.equal(hh.interior, 'halver_house'); assert.equal(hh.w, HALVER_HOUSE.w); assert.equal(hh.h, HALVER_HOUSE.h);
  assert.ok(Q.buildings.filter((b) => b.id !== 'cq_halver_house').every((b) => CONTENT.maps[b.interior].generated), 'the rest are plain rooms, generated on their footprint');
});

test('Halver House: a main hall, ten doors in three zones, and each room leads back to the hall', () => {
  assert.equal(HH.tiles[0].length, 40); assert.equal(HH.tiles.length, 32);
  const rooms = HH.doors.filter((d) => d.id !== 'door_halver_exit');
  assert.equal(rooms.length, 10);
  const byZone = (z) => rooms.filter((d) => ZONE[d.to.map.replace('halver_', '')] === z).length;
  assert.deepEqual([byZone('public'), byZone('appointment'), byZone('restricted')], [2, 4, 4]);
  for (const d of rooms) {
    const key = d.to.map.replace('halver_', '');
    const R = CONTENT.maps[d.to.map];
    assert.ok(R && ZONE[key], `${d.to.map} exists and has a zone`);
    assert.ok(R.doors.some((x) => x.to.map === 'halver_house' && HH.spots[x.to.spot]), `${key} leads back to a spot in the hall`);
    const z = ZONE[key];
    assert.equal(Boolean(d.lock.flag), z !== 'public', `${key}: only the public rooms have no flag`);
    assert.equal(Boolean(d.lock.hours), z !== 'restricted', `${key}: restricted rooms are closed at every hour`);
  }
});

test('the zones hold: public rooms open in office hours only; appointment rooms need the appointment; restricted rooms need a pass at any hour', () => {
  const g = newGame(41);
  const door = (key) => HH.doors.find((d) => d.to.map === `halver_${key}`);
  const reason = (key) => g.doorLockReason(door(key), (k) => g.inventory.count(k) > 0);
  setTime(g, 2, '10:00');
  assert.equal(reason('press'), null, 'press room, in hours'); assert.equal(reason('records'), null);
  assert.ok(reason('waiting') && reason('cabinet') && reason('president') && reason('security'), 'closed to a stranger');
  assert.match(reason('president'), /RESTRICTED/); assert.match(reason('cabinet'), /APPOINTMENT/i);
  setTime(g, 2, '22:00');
  assert.ok(reason('press') && reason('records'), 'public rooms are shut at night');
  setTime(g, 2, '10:00');
  g.setFlag('halver_appointment', true);
  assert.equal(reason('waiting'), null, 'with an appointment, in hours'); assert.equal(reason('cabinet'), null); assert.ok(reason('president'), 'an appointment is not a pass');
  setTime(g, 2, '22:00');
  assert.ok(reason('waiting'), 'appointments are for office hours');
  g.setFlag('halver_pass', true);
  assert.equal(reason('president'), null, 'a pass opens the restricted rooms'); assert.equal(reason('security'), null); assert.equal(reason('negotiation_a'), null);
  // the front door follows the public hours
  const front = Q.buildings.find((b) => b.id === 'cq_halver_house').door;
  setTime(g, 2, '10:00'); assert.equal(g.doorLockReason(front, () => false), null);
  setTime(g, 2, '22:00'); assert.match(g.doorLockReason(front, () => false), /Public hours/);
});

test('every building can be reached on foot from the Crown Gate, and the gate leads there from Halvermouth', () => {
  const g = newGame(42);
  const m = g.maps.get('crown_quarter');
  const from = m.spot('west_gate');
  assert.ok(from);
  const actor = g.playerActor();
  for (const b of Q.buildings) {
    const sx = Math.floor(from.x); const sy = Math.floor(from.y);
    const gx = b.door.x; const gy = b.door.y + 1;
    const path = findPath(m, sx, sy, gx, gy, actor);
    assert.ok(path && path.length, `${b.id}: a way to its front step`);
  }
  for (const s of Object.keys(Q.spots)) assert.ok(findPath(m, Math.floor(from.x), Math.floor(from.y), Math.floor(Q.spots[s].x), Math.floor(Q.spots[s].y), actor), `spot ${s} is reachable`);
  // from the street in Halvermouth to the gate
  const h = g.maps.get('halvermouth');
  const gate = CONTENT.maps.halvermouth.doors.find((d) => d.to.map === 'crown_quarter');
  const spot = h.spot('crown_gate');
  const p = findPath(h, Math.floor(spot.x), Math.floor(spot.y), gate.x - 1, gate.y, actor);
  assert.ok(p && p.length, 'from Crown Street\'s circle to the Crown Gate');
});

test('walking east through the Crown Gate takes you to the Crown Quarter, and walking west brings you back', () => {
  const g = newGame(43);
  setTime(g, 2, '10:00');
  g.changeMap('halvermouth', 'crown_gate');
  const walk = (x, y, secs = 12) => { for (let t = 0; t < secs && g.player.map === start; t += 0.05) g.update(0.05, { x, y, sprint: true }); };
  let start = 'halvermouth';
  walk(1, 0);
  assert.equal(g.player.map, 'crown_quarter', 'through the gate');
  start = 'crown_quarter';
  walk(-1, 0, 30);
  assert.equal(g.player.map, 'halvermouth', 'and back');
});

test('the Politics terminal and records hall open the tablet at the Politics app', () => {
  const g = newGame(44);
  const prop = HH.props.find((p) => p.id === 'hh_politics');
  assert.deepEqual(prop.interact, { kind: 'bank', tab: 'Politics' });
  const rec = CONTENT.maps.halver_records.props.find((p) => p.interact);
  assert.equal(rec.interact.tab, 'Politics');
  assert.ok(g.tablet);
});

test('map logic: nothing stands in a road, a building or a wall (barriers across a road excepted); every door step is clear; roads end in a gate or a paved circle, never a wall', () => {
  const T = (x, y) => Q.tiles[y]?.[x];
  const across = new Set(['boom_barrier']);
  for (const p of Q.props) {
    const w = p.w || 1; const h = p.h || 1;
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + w <= Q.tiles[0].length && p.y + h <= Q.tiles.length, `${p.id} is on the map`);
    for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) {
      const t = T(x, y);
      if (!across.has(p.type)) assert.notEqual(t, '=', `${p.id} (${p.type}) stands in a road at ${x},${y}`);
      assert.ok(!['B', 'r', 'R', 'W'].includes(t), `${p.id} (${p.type}) is inside a building or a wall at ${x},${y}`);
    }
  }
  const blocked = (x, y) => Q.props.some((p) => !across.has(p.type) && p.type !== 'streetlamp' && x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1));
  for (const b of Q.buildings) assert.ok(!blocked(b.door.x, b.door.y + 1) && T(b.door.x, b.door.y + 1) !== '=', `${b.id}: the step below its door is clear and off the road`);
  const Wd = Q.tiles[0].length;
  for (let y = 1; y < Q.tiles.length - 1; y++) {
    if (!(y >= 107 && y <= 110)) assert.notEqual(T(1, y), '=', `a road runs into the west wall at row ${y}`);
    assert.notEqual(T(Wd - 2, y), '=', `a road runs into the east wall at row ${y}`);
  }
  // the connection from Halvermouth: Grand Avenue runs on as a road, pavements either side, right to the gate
  const H = CONTENT.maps.halvermouth;
  const gate = H.doors.filter((d) => d.to.map === 'crown_quarter');
  const ys = gate.map((d) => d.y); const gx = gate[0].x;
  for (const y of ys) for (let x = gx - 14; x <= gx; x++) assert.equal(H.tiles[y][x], '=', `the road to the Crown Gate is a road at ${x},${y}`);
  for (const y of [Math.min(...ys) - 1, Math.max(...ys) + 1]) for (let x = gx - 14; x < gx; x++) assert.equal(H.tiles[y][x], ',', `with a pavement at ${x},${y}`);
  for (const p of H.props) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) if (ys.includes(y) && x >= gx - 14 && x <= gx) assert.ok(['crosswalk', 'boom_barrier'].includes(p.type), `${p.id} (${p.type}) stands in the road to the Crown Gate`);
});
