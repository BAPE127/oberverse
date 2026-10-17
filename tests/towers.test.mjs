// Tower floors and lifts (v0.41.0): Vantage Point's lobby (public hours), its lift to floors 12,
// 23 and the roof and back; the Atlas Rooms' and Harbourline's stairwell lifts to their roofs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, TILE } from './helpers.mjs';

const fresh = (hhmm = '12:00') => {
  const g = newGame(5);
  setTime(g, 1, hhmm);
  noImpulses(g);
  return g;
};
/** Stand in front of a map's lift and use it. */
const callLift = (g) => {
  const m = g.currentMap();
  const lift = m.props.find((p) => p.type === 'lift');
  g.player.x = (lift.x + 0.5) * TILE;
  g.player.y = (lift.y + 1.5) * TILE;
  g.player.facing = 'up';
  const t = g.interactables().find((x) => x.id === lift.id);
  assert.ok(t, `the lift on ${m.id} is in reach`);
  assert.equal(g.propLabel(lift), 'Call the lift');
  return g.interact(t);
};

test('Vantage Point: the lobby is open 08:00–20:00; the lift goes to every other floor and back', () => {
  const g = fresh('12:00');
  const door = g.maps.get('halvermouth').doors.find((d) => d.building === 't_vantage');
  assert.ok(g.playerCanPass(door));
  g.useDoor(door);
  assert.equal(g.player.map, 'vantage_lobby');
  const r = callLift(g);
  assert.equal(r.type, 'choices');
  const floors = r.options.filter((o) => o.call[1] === 'rideLift').map((o) => o.call[3]);
  assert.deepEqual(floors, ['vantage_12', 'vantage_23', 'vantage_roof']);
  assert.match(g.rideLift('vantage', 'vantage_23').text, /Floor 23 — The Sky Lounge/);
  assert.equal(g.player.map, 'vantage_23');
  assert.ok(g.currentMap().def.aloft.over === 'halvermouth', 'drawn over the city');
  assert.ok(callLift(g).options.some((o) => o.call[3] === 'vantage_lobby'));
  g.rideLift('vantage', 'vantage_roof');
  assert.ok(g.currentMap().props.some((p) => p.type === 'helipad'));
  g.rideLift('vantage', 'vantage_lobby');
  assert.equal(g.player.map, 'vantage_lobby');
  setTime(g, 1, '23:00');
  assert.equal(g.playerCanPass(door), false, 'shut at night');
});

test('the apartment towers: a lift from the stairwell to the roof; every floor map has a way down; the Oil Tower is still appointments only', () => {
  const g = fresh('12:00');
  for (const id of ['atlas', 'harbourline']) {
    g.changeMap(`${id}_hall`, 'entry');
    const r = callLift(g);
    assert.ok(r.options.some((o) => o.call[3] === `${id}_roof`));
    g.rideLift(id, `${id}_roof`);
    assert.equal(g.player.map, `${id}_roof`);
    assert.ok(g.currentMap().def.roof);
  }
  for (const t of Object.values(CONTENT.towers)) for (const f of t.floors) assert.ok(CONTENT.maps[f.map].props.some((p) => p.type === 'lift'), `${f.map} has a lift`);
  const ober = g.maps.get('halvermouth').doors.find((d) => d.building === 't_ober');
  assert.match(g.doorLockReason(ober, () => false), /Appointments only/);
});
