// Roost's halls (v0.57.0): the buildings its bays stand in — sites on the map that become halls,
// bays fitted into slots, doors that stay shut until it's built, old saves that keep what they paid for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const HALLS = CONTENT.aerospace.halls;
const DAY = 1440;
const own = (seed = 41) => {
  const g = newGame(seed);
  g.player.money = 20_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  for (const c of g.aero.contractsOf(co, 'active')) g.aero.cancelContract('roost', c.id);
  return { g, A: g.aero, co };
};
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };

test('every hall is on the map: a building, a room with a bay_slot per slot, a locked door, a site and a way out', () => {
  const m = CONTENT.maps.starling_flats;
  for (const [id, H] of Object.entries(HALLS)) {
    if (H.owned) continue;
    const b = m.buildings.find((x) => x.id === H.building);
    assert.ok(b, `${id}: building`);
    assert.equal(b.hall, id);
    assert.equal(b.door.lock.aeroHall, id, `${id}: its door waits for the hall`);
    const room = CONTENT.maps[H.room];
    assert.ok(room, `${id}: room`);
    assert.equal(room.hall, id);
    for (const sl of H.slots) assert.ok(room.props.some((p) => p.type === 'bay_slot' && p.aero.slot === sl.id), `${id}: a prop for slot ${sl.id}`);
    assert.ok(m.props.some((p) => p.type === 'hall_site' && p.aero.hall === id && p.hiddenUnless.aeroHall.id === id), `${id}: a building site`);
    assert.ok(m.spots[`${H.room}_door_out`], `${id}: a spot outside its door`);
    // the room is the footprint (the street's tiles became the building)
    const bb = m.buildings.find((x) => x.id === H.building);
    assert.equal(bb.w, H.w); assert.equal(bb.h, H.h);
  }
  const slotIds = Object.values(HALLS).flatMap((H) => H.slots.map((s) => s.id));
  assert.equal(new Set(slotIds).size, slotIds.length, 'slot ids are unique');
});

test('a hall is a site until it is built: its door stays shut, then opens (within working hours)', () => {
  const { g, A, co } = own();
  g.clock.total = 2 * DAY + 11 * 60; // a working day, 11:00
  const door = (id) => CONTENT.maps.starling_flats.buildings.find((b) => b.id === HALLS[id].building).door;
  assert.equal(A.hallBuilt('hangar2'), false);
  assert.ok(g.doorLockReason({ ...door('hangar2'), to: { map: 'x' } }, () => false), 'locked while a site');
  assert.match(g.doorLockReason({ ...door('hangar2'), to: { map: 'x' } }, () => false), /building site/);
  const money0 = g.player.money;
  const r = A.buildHall(co, 'hangar2');
  assert.ok(r.ok, r.text);
  assert.equal(money0 - g.player.money, HALLS.hangar2.build, 'paid once');
  assert.equal(A.hallState(co, 'hangar2').state, 'building');
  assert.equal(A.hallBuilt('hangar2'), false);
  assert.equal(A.buildHall(co, 'hangar2').ok, false, 'not twice');
  run(g, HALLS.hangar2.buildDays + 0.1);
  assert.equal(A.hallBuilt('hangar2'), true);
  g.clock.total = g.clock.day * DAY + 11 * 60;
  assert.equal(g.doorLockReason({ ...door('hangar2'), to: { map: 'x' } }, () => false), null, 'open by day for the owner');
});

test('a bay needs a free slot in an open hall: the answer says which hall to build; hall and bay are each paid once', () => {
  const { g, A, co } = own();
  assert.equal(co.bays.length, 1);
  assert.equal(co.bays[0].slot, 'h1_a');
  const no = A.buildBay(co, 'light');
  assert.equal(no.ok, false);
  assert.match(no.text, /Hangar 2/);
  assert.equal(A.buildBay(co, 'heavy').ok, false);
  assert.match(A.buildBay(co, 'heavy').text, /Assembly hall/);
  assert.ok(A.buildHall(co, 'hangar2').ok);
  assert.equal(A.buildBay(co, 'light').ok, false, 'not before the hall opens');
  run(g, 5.2);
  const cash = g.player.money;
  const r = A.buildBay(co, 'light');
  assert.ok(r.ok, r.text);
  assert.equal(cash - g.player.money, CONTENT.aerospace.bays.light.build);
  assert.equal(co.bays.at(-1).slot, 'h2_a');
  assert.ok(A.buildBay(co, 'light').ok);
  assert.equal(co.bays.at(-1).slot, 'h2_b');
  assert.equal(A.buildBay(co, 'light').ok, false, 'both slots taken');
  // a heavy bay also fits a light slot's bigger neighbour only in a hall built for it
  assert.ok(A.buildHall(co, 'heavy').ok);
  run(g, 8.2);
  assert.ok(A.buildBay(co, 'heavy', 'hh_b').ok);
  assert.equal(co.bays.at(-1).slot, 'hh_b', 'a chosen slot is honoured');
});

test('the bay in the world follows its slot: vacant, being fitted, then working', () => {
  const { g, A, co } = own();
  A.buildHall(co, 'hangar2');
  run(g, 5.2);
  const prop = CONTENT.maps.roost_hangar2.props.find((p) => p.aero?.slot === 'h2_a');
  assert.equal(A.computeView(prop).vacant, true, 'an empty slot');
  A.buildBay(co, 'light');
  const v = A.computeView(prop);
  assert.equal(v.closed, true); assert.notEqual(v.vacant, true, 'being fitted out');
  run(g, 3.2);
  assert.equal(A.computeView(prop).key, 'empty', 'ready, nothing in it yet');
  const hangar1 = CONTENT.maps.roost_hangar.props.find((p) => p.aero?.slot === 'h1_a');
  assert.ok(A.computeView(hangar1), 'hangar 1 is bound by slot too');
});

test('halls cost their upkeep once they are open, and the laboratory shortens research', () => {
  const { g, A, co } = own();
  A.buildHall(co, 'lab');
  const days = CONTENT.aerospace.research.turboprops.days;
  const before = A.statement(co, null).acc.upkeep || 0;
  run(g, HALLS.lab.buildDays + 1.2);
  assert.ok((A.statement(co, null).acc.upkeep || 0) - before >= HALLS.lab.upkeep, 'upkeep begins when it opens');
  assert.ok(A.researchFactor(co) < 1);
  const r = A.startResearch(co, 'turboprops');
  assert.ok(r.ok, r.text);
  assert.equal(co.researching.doneAt - A.now, Math.round(days * 0.75) * DAY, 'a quarter less time');
});

test('Meridian is not slot-bound: a new bay is dearer (another site), and has no slot', () => {
  const { A } = own();
  const M = A.meridian;
  const cash = M.cash;
  const r = A.buildBay(M, 'light');
  assert.ok(r.ok, r.text);
  assert.equal(cash - M.cash, Math.round(CONTENT.aerospace.bays.light.build * 1.5));
  assert.equal(M.bays.at(-1).slot, undefined);
});

test('an old save keeps what it paid for: unslotted bays go into slots, their halls open, nothing is charged', () => {
  const { g, A, co } = own();
  // as v0.55/v0.56 left it: bays with no slots, no halls
  co.bays = [
    { id: 'light_1', type: 'light', unit: null, ready: 0 },
    { id: 'light_2', type: 'light', unit: null, ready: 0 },
    { id: 'heavy_1', type: 'heavy', unit: null, ready: 0 },
    { id: 'light_3', type: 'light', unit: null, ready: 0 },
    { id: 'light_4', type: 'light', unit: null, ready: 0 },
    { id: 'light_5', type: 'light', unit: null, ready: 0 },
    { id: 'wide_1', type: 'wide', unit: null, ready: 0 },
  ];
  delete co.halls;
  delete co.hallsOpened;
  const sm = new SaveManager(new MemoryStorage());
  const cash = g.player.money;
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const c2 = g2.aero.roost;
  assert.equal(g2.player.money, cash, 'no charge');
  // the heavy hall also takes light bays, and a light bay with nowhere else opens the widebody hall; a widebody bay has no slot left
  assert.deepEqual(c2.bays.map((b) => b.slot), ['h1_a', 'h2_a', 'hh_a', 'h2_b', 'hh_b', 'hw_a', undefined], 'placed where they fit; the last has no slot but keeps working');
  assert.equal(g2.aero.hallBuilt('hangar2'), true);
  assert.equal(g2.aero.hallBuilt('heavy'), true);
  assert.equal(g2.aero.hallBuilt('wide'), true);
  assert.equal(g2.aero.hallBuilt('space'), false, 'only the halls that were needed');
  assert.equal(c2.bays.length, 7, 'nothing deleted');
});

test('halls survive a save mid-construction', () => {
  const { g, A, co } = own();
  A.buildHall(co, 'space');
  run(g, 4);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const st = g2.aero.hallState(g2.aero.roost, 'space');
  assert.equal(st.state, 'building');
  assert.ok(Math.abs(st.f - 0.4) < 0.02);
  run(g2, 6.1);
  assert.equal(g2.aero.hallBuilt('space'), true);
  assert.ok(g2.aero.buildBay(g2.aero.roost, 'rocket').ok);
});
