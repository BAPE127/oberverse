// v0.27.0: life-size ships at the Yards berths you can walk aboard — decks
// generated from each ship's design, with every fitting reachable from the
// gangway; the rooms below with the wheel and the logbook; and the berths
// kept in step with the fleet (and with a save) without saving anything new.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { deckPlan, deckCells, belowDecks } from '../src/world/shipDeck.js';
import { TILE } from '../src/core/util.js';
import { GameMap } from '../src/world/gameMap.js';

const L = CONTENT.logistics;
const owned = () => {
  const g = newGame(61);
  setTime(g, 1, '09:00');
  g.player.money = 5_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  g.skipTime(2);
  return g;
};
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 8 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };
const models = () => {
  const out = Object.entries(L.ships);
  for (const [id, H] of Object.entries(L.hulls)) {
    const comps = Object.keys(L.components).filter((c) => L.components[c].kinds.includes(H.kind));
    out.push([id, { look: { ...H.look, slots: H.slots, fit: Array.from({ length: H.slots }, (_, i) => comps[(i * 7) % comps.length]) }, kind: H.kind }]);
  }
  return out;
};

test('every ship\'s deck: from the gangway you can reach the way below and stand beside every fitting', () => {
  for (const [id, m] of models()) {
    const p = deckPlan(m);
    const { walk, taken } = deckCells(p);
    const free = new Set(walk.filter(({ a, c }) => !taken(a, c)).map(({ a, c }) => `${a},${c}`));
    // either side of a pier: the gangway lands on the east rail's or the west rail's inside cell
    for (const land of [`${p.gangwayRow},${p.rows[p.gangwayRow][1] - 1}`, `${p.gangwayRow},${p.rows[p.gangwayRow][0] + 1}`]) {
      assert.ok(free.has(land), `${id}: gangway landing ${land} is clear`);
      const seen = new Set([land]);
      const q = [land];
      while (q.length) {
        const [a, c] = q.shift().split(',').map(Number);
        for (const [da, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${a + da},${c + dc}`; if (free.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } }
      }
      const near = (a0, a1, c0, c1) => { for (let a = a0 - 1; a <= a1 + 1; a++) for (let c = c0 - 1; c <= c1 + 1; c++) if (seen.has(`${a},${c}`)) return true; return false; };
      const door = p.house ? { a: p.house.face === 'fore' ? p.house.door.a + 1 : p.house.door.a - 1, c: p.house.door.c } : { a: p.hatch.a + 1, c: p.hatch.c };
      assert.ok(seen.has(`${door.a},${door.c}`), `${id}: the way below is reachable`);
      for (const part of p.parts) assert.ok(near(part.a0, part.a1, part.c0, part.c1), `${id}: ${part.key} is reachable`);
    }
    assert.ok(p.Bt <= 6 && p.Lt >= 7, id);
  }
});

test('the rooms below: a wheel and a logbook, a way back up, every room reachable', () => {
  for (const [id, m] of models()) {
    const v = { id: 'v9', name: 'Test', cargo: null };
    const def = belowDecks(v, { ...m, capacity: 40 }, { map: 'yards', spot: 'quay' });
    assert.ok(def.props.some((p) => p.interact?.action === 'wheel'), `${id}: wheel`);
    assert.ok(def.props.some((p) => p.interact?.action === 'logbook'), `${id}: logbook`);
    const map = new GameMap(def, CONTENT.propTypes);
    const start = def.spots.entry;
    const seen = new Set([`${start.x},${start.y}`]);
    const q = [[start.x, start.y]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (seen.has(`${nx},${ny}`) || map.blockedTile(nx, ny) || map.doorAt(nx, ny)) continue;
        seen.add(`${nx},${ny}`); q.push([nx, ny]);
      }
    }
    for (const p of def.props.filter((x) => x.interact)) {
      const ok = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => seen.has(`${p.x + dx},${p.y + dy}`) || seen.has(`${p.x + (p.w || 1) - 1 + dx},${p.y + dy}`));
      assert.ok(ok, `${id}: ${p.interact.action} can be reached`);
    }
    assert.ok(map.doorAt(def.doors[0].x, def.doors[0].y), `${id}: the way up`);
  }
});

test('ships at a berth are moored life-size and walkable; the deck follows the fleet; the logbook and wheel answer', () => {
  const g = owned();
  const Lg = g.logistics;
  const yards = g.maps.get('yards');
  assert.ok(Lg.setBerth(0, 'port_millroad').ok);
  const moored = Lg.docks.moored;
  assert.equal(moored.length, 1, 'the Gullwing Lass is moored at berth 1');
  const m = moored[0];
  const v = Lg.vessel(m.id);
  // the gangway row: from the pier across onto the deck
  const y = m.y0 + m.plan.gangwayRow;
  for (let x = m.x0 + 1; x <= m.pier; x++) assert.equal(yards.blockedTile(x, y), false, `walkable at ${x},${y}`);
  // the water beyond the hull is not
  assert.equal(yards.blockedTile(m.x0 - 1, y), true);
  // a door to the rooms below, which exist
  const door = yards.doors.find((d) => d.id === `dk_${v.id}_door`);
  assert.ok(door && g.maps.has(door.to.map));
  assert.ok(g.changeMap(door.to.map, 'entry'));
  const below = g.currentMap();
  const wheel = below.props.find((p) => p.interact?.action === 'wheel');
  assert.equal(g.interact({ kind: 'prop', id: wheel.id }).type, 'message');
  const log = below.props.find((p) => p.interact?.action === 'logbook');
  const r = g.interact({ kind: 'prop', id: log.id });
  assert.deepEqual([r.type, r.panel, r.opts.vessel], ['panel', 'logbook', v.id]);
  // back on deck, then she sails: you step back onto the pier
  g.changeMap('yards', `deck_${v.id}`);
  const c = { id: 'cB', type: 'general', client: 'cl_halver_mills', units: 5, from: 'port_millroad', to: 'port_sund', km: Lg.route('port_millroad', 'port_sund').km, pay: 3000, deadline: g.clock.total + 20000, offered: 1, expiresDay: 9, status: 'available' };
  Lg.state.contracts.push(c);
  Lg.accept('cB');
  assert.ok(Lg.assign('cB', v.id).ok);
  g.skipTime(Lg.nextEvent() - g.clock.total + 2);
  assert.equal(Lg.vessel(v.id).status, 'underway');
  assert.equal(Lg.docks.moored.length, 0);
  assert.equal(g.player.map, 'yards');
  assert.ok(Math.abs(g.player.x - (m.pier + 0.5) * TILE) < TILE, 'on the pier');
  assert.equal(yards.blockedTile(m.x0 + 2, y), true, 'the deck is gone');
  assert.ok(!g.maps.has(`ship_${v.id}`), 'and so are the rooms below');
});

test('aboard through a save: below decks you load where you were; a hidden ship isn\'t moored', () => {
  const g = owned();
  const Lg = g.logistics;
  Lg.setBerth(0, 'port_millroad');
  const v = Lg.vessels()[0];
  g.changeMap(`ship_${v.id}`, 'entry');
  const g2 = reload(g);
  assert.equal(g2.player.map, `ship_${v.id}`, 'still below decks');
  assert.ok(g2.currentMap().props.some((p) => p.interact?.action === 'logbook'));
  assert.equal(g2.logistics.docks.moored.length, 1);
  // hide her from the berths
  g2.logistics.setVisible(v.id, false);
  assert.equal(g2.logistics.docks.moored.length, 0);
  assert.equal(g2.player.map, 'yards', 'stepped ashore');
});
