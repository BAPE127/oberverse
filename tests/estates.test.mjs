// The two estates and the party headquarters (v0.94.1): Ironcrest Hall (Josiah Vegas) and Willowmere (Susan), each a small map of its own reached by
// road from the Crown Quarter, a mansion with a real interior in three zones, a household that lives in its own cottages; and the two headquarters as
// real offices with a desk for each of the party's ten staff roles. Access is by invitation, never by money alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT } from './helpers.mjs';
import { findPath } from '../src/world/pathfinding.js';
import { ESTATE_PEOPLE, ESTATE_DEFS, ESTATE_OWNERS } from '../src/content/estates.js';
import { IRONCREST, WILLOWMERE } from '../src/content/maps/mansions.js';
import { PARTY_HQ } from '../src/content/maps/partyHQ.js';
import { POLITICS } from '../src/content/politics.js';
import { LIFE } from '../src/content/life.js';

const at = (g, id) => { const n = g.npcs.get(id); return { map: n.map, x: n.x, y: n.y, activity: n.activity }; };
const ESTATES = { ironcrest: 'ironcrest_grounds', willowmere: 'willowmere_grounds' };

test('each estate is a region of its own, joined to the Crown Quarter by a road both ways', () => {
  for (const [estate, grounds] of Object.entries(ESTATES)) {
    assert.ok(CONTENT.regions[estate]?.maps[grounds], `${estate} is a region`);
    const there = CONTENT.maps.crown_quarter.doors.filter((d) => d.to.map === grounds); const back = CONTENT.maps[grounds].doors.filter((d) => d.to.map === 'crown_quarter');
    assert.equal(there.length, 4, `${estate}: a four-wide road out`); assert.equal(back.length, 4, `${estate}: and back`);
    assert.ok(CONTENT.maps.crown_quarter.spots[back[0].to.spot] && CONTENT.maps[grounds].spots[there[0].to.spot], 'arrival spots exist');
  }
});

test('map logic: nothing in a road or a building or a wall; every door step clear; the road reaches its end; every building reachable on foot from the gate', () => {
  const g = newGame(91);
  for (const grounds of Object.values(ESTATES)) {
    const M = CONTENT.maps[grounds];
    const T = (x, y) => M.tiles[y]?.[x];
    const blocked = new Set();
    for (const p of M.props) {
      const w = p.w || 1; const h = p.h || 1;
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + w <= M.tiles[0].length && p.y + h <= M.tiles.length, `${p.id} on the map`);
      for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) {
        if (p.type !== 'boom_barrier') assert.notEqual(T(x, y), '=', `${grounds}/${p.id} (${p.type}) stands in the road at ${x},${y}`);
        assert.ok(!['B', 'r', 'R', 'W'].includes(T(x, y)), `${grounds}/${p.id} (${p.type}) is inside a building or a wall at ${x},${y}`);
        if (p.type !== 'boom_barrier' && p.type !== 'streetlamp') blocked.add(`${x},${y}`);
      }
    }
    for (const b of M.buildings) assert.ok(!blocked.has(`${b.door.x},${b.door.y + 1}`) && T(b.door.x, b.door.y + 1) !== '=', `${grounds}/${b.id}: a clear step below its door`);
    for (let x = 1; x < 100; x++) for (const y of [34, 35, 36, 37]) assert.equal(T(x, y), '=', `the drive is a road at ${x},${y}`);
    const map = g.maps.get(grounds); const from = map.spot('west_gate'); const actor = g.playerActor();
    for (const b of M.buildings) assert.ok(findPath(map, Math.floor(from.x), Math.floor(from.y), b.door.x, b.door.y + 1, actor)?.length, `${grounds}/${b.id}: a way to its front step`);
    for (const s of Object.keys(M.spots)) assert.ok(findPath(map, Math.floor(from.x), Math.floor(from.y), Math.floor(M.spots[s].x), Math.floor(M.spots[s].y), actor), `${grounds}: spot ${s} reachable`);
  }
});

test('each mansion\'s hall is exactly its building\'s size, with its rooms in three zones; the leader sleeps in the private quarters', () => {
  for (const [estate, D, grounds, bid] of [['ironcrest', IRONCREST, 'ironcrest_grounds', 'ic_hall'], ['willowmere', WILLOWMERE, 'willowmere_grounds', 'wm_hall']]) {
    const b = CONTENT.maps[grounds].buildings.find((x) => x.id === bid);
    assert.equal(b.interior, `${estate}_hall`); assert.equal(b.w, D.w); assert.equal(b.h, D.h);
    const hall = CONTENT.maps[`${estate}_hall`];
    const rooms = hall.doors.filter((d) => d.id !== `door_${estate}_exit`);
    assert.ok(rooms.length >= 4);
    for (const d of rooms) { const R = CONTENT.maps[d.to.map]; assert.ok(['visitor', 'private', 'staff'].includes(R.zone), d.to.map); assert.ok(R.doors.some((x) => x.to.map === `${estate}_hall` && hall.spots[x.to.spot]), `${d.to.map} leads back`); }
    const q = CONTENT.maps[`${estate}_quarters`]; assert.ok(q.spots.bed && q.props.some((p) => p.type === 'bed'), 'a bed');
  }
  assert.equal(LIFE.npc_vegas.home, 'res_ironcrest/master'); assert.equal(LIFE.npc_susan.home, 'res_willowmere/master');
});

test('access is by invitation: closed to a stranger; the flag opens the house in the day, never the private rooms or the staff rooms; money alone is no key', () => {
  const g = newGame(92);
  const door = (map, id) => CONTENT.maps[map].doors.find((d) => d.id === id) || CONTENT.maps[map].buildings.find((b) => b.id === id).door;
  const reason = (d) => g.doorLockReason(d, (k) => g.inventory.count(k) > 0);
  for (const [estate, grounds, bid] of [['ironcrest', 'ironcrest_grounds', 'ic_hall'], ['willowmere', 'willowmere_grounds', 'wm_hall']]) {
    const E = ESTATE_DEFS[estate]; const front = door(grounds, bid); const hall = (key) => door(`${estate}_hall`, `door_${estate}_${key}`);
    setTime(g, 2, '10:00'); g.player.money = 1e6;
    assert.match(reason(front), /invitation|steward|book/i, `${estate}: a stranger is refused at the door`);
    g.setFlag(E.flag, true);
    assert.equal(reason(front), null, `${estate}: invited, in the day`);
    setTime(g, 2, '22:30'); assert.ok(reason(front), `${estate}: the house is shut at night`);
    setTime(g, 2, '10:00');
    for (const key of ['quarters', 'security', 'staff']) assert.ok(reason(hall(key)), `${estate}/${key}: still closed to an invited guest`);
    assert.match(reason(hall('quarters')), /PRIVATE/); assert.match(reason(hall('staff')), /STAFF ONLY/);
    g.setFlag(E.trusted, true);
    assert.equal(reason(hall('quarters')), null, `${estate}: trusted people may enter the private rooms`);
    assert.ok(reason(hall('staff')), 'the staff rooms stay the household\'s');
    for (const id of ESTATE_OWNERS[estate]) assert.equal(g.npcCanPass({ id, profile: {} }, hall('staff')), true, `${id} may use the staff door`);
    assert.equal(g.npcCanPass({ id: 'npc_ob', profile: {} }, hall('staff')), false);
  }
  assert.equal(ESTATE_OWNERS.ironcrest.includes('npc_vegas'), true); assert.equal(ESTATE_OWNERS.willowmere.includes('npc_susan'), true);
});

test('the household: six people with cottage flats, a steward who keeps the book (invitation by being known, or an appointment), and days that follow the house', () => {
  assert.equal(ESTATE_PEOPLE.length, 6);
  for (const p of ESTATE_PEOPLE) { const c = CONTENT.characters[p.id]; assert.ok(c && CONTENT.dialogues[c.dialogue], p.id); assert.match(LIFE[p.id].home, /^res_(ih|wm)_cottages\/flat_\d$/); }
  for (const estate of Object.keys(ESTATES)) {
    const steward = CONTENT.dialogues[CONTENT.characters[ESTATE_DEFS[estate].steward].dialogue];
    const call = steward.topics.find((t) => t.id.endsWith('_call'));
    assert.ok(call && call.choices.length === 2, 'two ways to be received');
    for (const ch of call.choices) assert.ok(ch.effects.some((e) => e.flag?.[ESTATE_DEFS[estate].flag]), 'each sets the invitation flag');
    assert.ok(JSON.stringify(call.choices.map((c) => c.if)).includes('trust') && JSON.stringify(call.choices.map((c) => c.if)).includes('halver_appointment'), 'being known (trust) or an appointment: never money');
  }
  const g = newGame(93); noImpulses(g);
  setTime(g, 2, '10:30');
  assert.equal(at(g, 'npc_ih_steward').map, 'ironcrest_hall'); assert.equal(at(g, 'npc_wm_steward').map, 'willowmere_hall');
  assert.equal(at(g, 'npc_ih_cook').map, 'ironcrest_staff'); assert.equal(at(g, 'npc_ih_guard').map, 'ironcrest_grounds');
  setTime(g, 2, '23:45');
  for (const p of ESTATE_PEOPLE) assert.match(at(g, p.id).map, /^(ih|wm)_cottages_\d$/, `${p.id} sleeps in the cottages`);
  for (const [id, q] of [['npc_vegas', 'ironcrest_quarters'], ['npc_susan', 'willowmere_quarters']]) assert.equal(at(g, id).map, q, `${id} sleeps in their own mansion`);
});

test('the party headquarters are real offices: a desk for each of the ten staff roles, a leader\'s office and a war room; staff sit at their own desks', () => {
  for (const party of ['order', 'liberty']) {
    const M = CONTENT.maps[`${party}_hq`];
    assert.equal(M.tiles[0].length, PARTY_HQ.w); assert.equal(M.tiles.length, PARTY_HQ.h);
    const b = CONTENT.maps.crown_quarter.buildings.find((x) => x.id === `cq_${party}_hq`); assert.equal(b.interior, `${party}_hq`); assert.equal(b.w, PARTY_HQ.w);
    for (const r of POLITICS.staffRoles) assert.ok(M.spots[`desk_${r.id}`] && M.props.some((p) => p.id === `${party}_hq_desk_${r.id}`), `${party}: a desk for the ${r.id}`);
    assert.ok(M.spots.leader && M.spots.war_table && M.props.some((p) => p.type === 'monitor_wall'));
  }
  const g = newGame(94); noImpulses(g); setTime(g, 2, '10:30');
  const T = 32;
  for (const [id, party, role] of [['npc_ord_press_secretary', 'order', 'press_secretary'], ['npc_lib_legal', 'liberty', 'legal']]) {
    const n = at(g, id); const spot = CONTENT.maps[`${party}_hq`].spots[`desk_${role}`];
    assert.equal(n.map, `${party}_hq`); assert.ok(Math.hypot(n.x / T - 0.5 - spot.x, n.y / T - 0.5 - spot.y) < 1.6, `${id} is at their desk`);
  }
});
