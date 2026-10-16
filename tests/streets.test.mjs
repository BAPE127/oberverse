// Streets (v0.20.0): four-tile roads, a joined-up road network, walk-through
// pavement props, pedestrians who keep to the pavement and wait for the green
// man, traffic lights, through traffic that drives off the map (no U-turns),
// and cars that carry their weight round a corner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, TILE } from './helpers.mjs';
import { widenMap } from '../src/world/widen.js';
import { lightState, walkSignal, CYCLE } from '../src/world/lights.js';
import { findPath } from '../src/world/pathfinding.js';

const fresh = () => {
  const g = newGame(5);
  setTime(g, 1, '10:00');
  noImpulses(g);
  g.transit.setup();
  return g;
};
const frames = (g, seconds, input = {}) => { for (let t = 0; t < seconds; t += 0.05) g.update(0.05, { x: 0, y: 0, ...input }); };

test('widening: a two-tile road becomes four, and what is beyond it moves along', () => {
  const def = { tiles: ['..........', '==========', '==========', '..........'], props: [{ id: 'cw', type: 'crosswalk', x: 3, y: 1, h: 2 }, { id: 'lamp', type: 'streetlamp', x: 5, y: 3 }], spots: { a: { x: 1, y: 3 } } };
  const { def: w, fy } = widenMap(def, { rows: [1] });
  assert.equal(w.tiles.length, 6);
  assert.deepEqual(w.tiles.slice(1, 5), Array(4).fill('=========='));
  assert.equal(fy(1), 1);
  assert.equal(fy(2), 4);
  assert.equal(w.props.find((p) => p.id === 'cw').h, 4, 'the crossing stretches across the new width');
  assert.equal(w.props.find((p) => p.id === 'lamp').y, 5);
  assert.equal(w.spots.a.y, 5);
});

test('every Halvermouth avenue and street is four tiles wide', () => {
  const g = fresh();
  const m = g.maps.get('halvermouth');
  for (const j of CONTENT.transit.junctions.filter((k) => k.map === 'halvermouth')) {
    // a little way west of the junction: four rows of road between pavements
    const x = j.x - 3;
    const road = (t) => t === '=' || t === ':'; // tarmac, or the Sumps' packed dirt
    for (let y = j.y; y < j.y + 4; y++) assert.ok(road(m.tileAt(x, y)), `road at ${x},${y}`);
    assert.ok(!road(m.tileAt(x, j.y - 1)));
    assert.ok(!road(m.tileAt(x, j.y + 4)));
  }
});

test('no road leads nowhere: a road that meets the edge of an outdoor map is a way through', () => {
  const g = fresh();
  for (const id of ['halvermouth', 'yards', 'westbrook', 'lanternside', 'ober_fields']) {
    const m = g.maps.get(id);
    const edge = [];
    for (let x = 0; x < m.width; x++) edge.push([x, 0], [x, m.height - 1]);
    for (let y = 0; y < m.height; y++) edge.push([0, y], [m.width - 1, y]);
    for (const [x, y] of edge) {
      if (m.tileAt(x, y) !== '=') continue;
      assert.ok(m.doorAt(x, y), `${id} ${x},${y}: a road at the edge must be a gate or a seam`);
    }
  }
});

test('pavement props: you walk through lamps and benches, cars still hit them', () => {
  const g = fresh();
  const m = g.maps.get('halvermouth');
  const lamp = m.props.find((p) => p.type === 'streetlamp' && m.tileAt(p.x, p.y) === ',');
  assert.ok(lamp, 'a lamp on the pavement');
  assert.ok(lamp.walkThrough);
  assert.equal(m.blockedTile(lamp.x, lamp.y, { kind: 'player' }), false, 'people walk through');
  assert.equal(m.blockedTile(lamp.x, lamp.y, { kind: 'vehicle' }), true, 'cars do not');
  const lights = m.props.filter((p) => p.type === 'trafficlight');
  assert.equal(lights.length, 4 * 12, 'four lights at each of twelve junctions');
  assert.ok(lights.every((p) => m.blockedTile(p.x, p.y, { kind: 'player' }) === false));
});

test('people keep to the pavement and cross at the crossings', () => {
  const g = fresh();
  const m = g.maps.get('halvermouth');
  assert.equal(m.walkCost(0, 0) >= 1, true);
  const j = CONTENT.transit.junctions[4];
  assert.ok(m.walkCost(j.x - 3, j.y + 1) > 4, 'the carriageway is expensive');
  assert.ok(m.walkCost(j.x - 1, j.y + 1) < 1.5, 'the crossing is not');
  // a walk from one side of an avenue to the other, some way from a junction, goes via a crossing
  const path = findPath(m, j.x - 10, j.y - 1, j.x - 10, j.y + 4);
  assert.ok(path?.length, 'a path');
  const onRoad = path.filter((t) => m.tileAt(t.x, t.y) === '=');
  const onCrossing = onRoad.filter((t) => m.crossTiles.has(t.y * m.width + t.x));
  assert.ok(onCrossing.length >= onRoad.length - 1, `crossed at the crossing (${onCrossing.length}/${onRoad.length} road tiles striped)`);
});

test('traffic lights: east–west and north–south take turns, the green man walks with the green', () => {
  const j = { offset: 0 };
  assert.equal(CYCLE, 22);
  assert.deepEqual([lightState(j, 1).ew, lightState(j, 1).ns], ['green', 'red']);
  assert.equal(lightState(j, 10).ew, 'amber');
  assert.deepEqual([lightState(j, 12).ew, lightState(j, 12).ns], ['red', 'green']);
  assert.equal(lightState(j, 21).ns, 'amber');
  assert.equal(lightState(j, 23).ew, 'green', 'and round again');
  for (let t = 0; t < CYCLE; t += 0.5) {
    const s = lightState(j, t);
    assert.ok(s.ew === 'red' || s.ns === 'red', 'never both going');
    if (walkSignal(j, 'ns', t) === 'walk') assert.equal(s.ew, 'red', 'nobody crosses into moving traffic');
  }
  assert.notEqual(lightState({ offset: 7 }, 0).k, lightState({ offset: 0 }, 0).k, 'junctions are out of step');
});

test('traffic stops at a red light', () => {
  const g = fresh();
  const T = g.transit;
  g.changeMap('halvermouth', 'east_gate');
  const f = T.followers.find((x) => x.kind === 'traffic' && x.route.lights?.length && x.map === 'halvermouth');
  const L = f.route.lights[0];
  // put it a car-length short of the stop line, with its light at red
  f.dist = f.route.wrap(L.dist - f.len / 2 - 60);
  f.speed = 0;
  T.place(f);
  const red = L.axis === 'ew' ? 13 : 2; // k when this axis is red
  g.realTime = red - (L.j.offset || 0) + CYCLE * 10;
  for (const o of T.followers) if (o !== f) { o.dist = f.route === o.route ? f.route.wrap(f.dist + f.route.length / 2) : o.dist; T.place(o); }
  g.player.x = -9999;
  const d0 = f.dist;
  for (let t = 0; t < 3; t += 0.05) { g.realTime += 0.05; T.update(0.05); }
  assert.ok(f.route.ahead(d0, f.dist) < 60, 'it waited at the line');
});

test('through traffic drives off the map at its far end — no U-turns — and another car comes in', () => {
  const g = fresh();
  const T = g.transit;
  const count = () => T.followers.filter((x) => x.kind === 'traffic').length;
  const n0 = count();
  const through = T.followers.find((x) => x.kind === 'traffic' && !x.route.closed);
  assert.ok(through, 'some traffic is passing through');
  // the far end of an open route is off the map's edge (through a gate), not a turn back
  const a = through.route.at(through.route.length - 1);
  const b = through.route.at(0);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0 || through.loop === 'coast_road');
  through.dist = through.route.length - 2;
  T.step(through, 0.05, false);
  assert.ok(!T.followers.includes(through), 'it left');
  g.skipTime(90);
  assert.ok(count() >= n0 - 1 && count() <= n0 + 1, 'and the road refills');
  // nobody on an open route ever turns right round
  for (const f of T.followers.filter((x) => x.kind === 'traffic' && !x.route.closed)) {
    for (let d = 0; d < f.route.length - 40; d += 20) {
      const p = f.route.at(d);
      const q = f.route.at(d + 40);
      assert.ok(Math.cos(q.angle - p.angle) > -0.9, `${f.loop} doubles back at ${d}`);
    }
  }
});

test('people wait at the kerb for the green man', () => {
  const g = fresh();
  const m = g.maps.get('halvermouth');
  const j = CONTENT.transit.junctions[4];
  g.changeMap('halvermouth', 'east_gate');
  const npc = [...g.npcs.values()].find((n) => !n.dead);
  npc.map = 'halvermouth';
  // on the pavement at the north end of the crossing west of the junction, walking south across the avenue
  const cx = j.x - 1;
  npc.x = (cx + 0.5) * TILE;
  npc.y = (j.y - 1 + 0.5) * TILE;
  npc.intent = null;
  npc.chat = null;
  assert.ok(m.crossTiles.has(j.y * m.width + cx));
  const path = () => [{ x: (cx + 0.5) * TILE, y: (j.y + 0.5) * TILE }, { x: (cx + 0.5) * TILE, y: (j.y + 4.5) * TILE }];
  // walking north–south: wait while east–west traffic has the green
  g.realTime = 1 - (j.offset || 0) + CYCLE * 10;
  npc.path = path();
  const y0 = npc.y;
  g.npcSystem.updatePhysical(npc, 0.5);
  assert.equal(npc.y, y0, 'waits');
  g.realTime = 12 - (j.offset || 0) + CYCLE * 10;
  g.npcSystem.updatePhysical(npc, 0.5);
  assert.ok(npc.y > y0, 'and crosses on the green man');
});

test('your car carries its weight through a turn: the wheel turns in, the tail slides on the handbrake, tyre marks', () => {
  const g = fresh();
  const V = g.vehicles;
  const car = Object.values(V.state.cars).find((c) => c.map === 'halvermouth');
  const j = CONTENT.transit.junctions[1];
  // on the avenue just east of the junction, heading east (v0.35.2: it used to start off the map, inside the void)
  Object.assign(car, { map: j.map, x: (j.x + j.w + 3) * TILE, y: (j.y + 1) * TILE, angle: 0, speed: 300, travel: 0, wheel: 0 });
  assert.equal(V.inWalls(g.maps.get(j.map), car.x, car.y, 0, V.model(car).len, V.model(car).wid, car), 0, 'starts clear');
  V.physics(car, { x: 1, y: -1 }, 0.02);
  assert.ok(car.wheel > 0 && car.wheel < 0.5, 'the wheel turns in over a moment');
  for (let i = 0; i < 10; i++) V.physics(car, { x: 1, y: -1 }, 0.02);
  const grip = car.slip;
  for (let i = 0; i < 15; i++) V.physics(car, { x: 1, y: 0, sprint: true }, 0.02);
  assert.ok(car.slip > grip, 'the handbrake lets the tail out');
  assert.ok(Math.abs(car.travel - car.angle) > 0.05, 'it travels a little off its nose');
  assert.ok(V.skids?.length > 0, 'and leaves marks');
});

test('a save from before the wide roads loads with everyone moved along with the streets', () => {
  const g = fresh();
  g.changeMap('halvermouth', 'east_gate');
  const data = JSON.parse(JSON.stringify(g.serialize()));
  data.gameVersion = '0.19.0';
  // where you'd have stood on Grand Avenue's south kerb in 0.19 (authored row 38)
  data.player.x = 50.5 * TILE;
  data.player.y = 38.5 * TILE;
  const g2 = new (g.constructor)(CONTENT, { seed: 1 });
  g2.loadState(data);
  const { fx, fy } = CONTENT.roadShifts.halvermouth;
  assert.equal(g2.player.x, fx(50.5) * TILE);
  assert.equal(g2.player.y, fy(38.5) * TILE);
  assert.equal(g2.maps.get('halvermouth').tileAt(Math.floor(g2.player.x / TILE), Math.floor(g2.player.y / TILE)), ',', 'still on the kerb');
  // a current save is left alone
  const now = JSON.parse(JSON.stringify(g2.serialize()));
  const g3 = new (g.constructor)(CONTENT, { seed: 1 });
  g3.loadState(now);
  assert.equal(g3.player.y, g2.player.y);
});
