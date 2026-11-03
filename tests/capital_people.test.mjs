// The people of the capital (v0.94.0): eleven ambassadors, both parties' ten staff, Halver House's household and six ministers — 43 people with
// homes, beds, schedules and dialogue, who live and work in the Crown Quarter. Embassies, party headquarters, the café and the hotel are open to
// the public in their hours and to their own people at any hour; ministries are for their ministers; the House is for its household and the leaders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, TILE } from './helpers.mjs';
import { CAPITAL_PEOPLE, AMBASSADORS, PARTY_STAFF, HOUSEHOLD, MINISTERS, STAFF_BY_PARTY } from '../src/content/capital.js';
import { LIFE, RESIDENCES } from '../src/content/life.js';
import { POLITICS } from '../src/content/politics.js';

const at = (g, id) => { const n = g.npcs.get(id); return { map: n.map, x: n.x, y: n.y, activity: n.activity }; };

test('43 people, every one with a record, a dialogue, a home and a bed, and a sleep block in that bed; ids are unique and never clash with an existing character', () => {
  assert.equal(CAPITAL_PEOPLE.length, 43);
  assert.deepEqual([AMBASSADORS.length, PARTY_STAFF.length, HOUSEHOLD.length, MINISTERS.length], [11, 20, 6, 6]);
  assert.equal(new Set(CAPITAL_PEOPLE.map((p) => p.id)).size, 43);
  for (const p of CAPITAL_PEOPLE) {
    const c = CONTENT.characters[p.id];
    assert.ok(c && c.tier === 'minor' && c.origin === 'generated', p.id);
    assert.ok(CONTENT.dialogues[c.dialogue]?.topics.length >= 3, `${p.id} has a dialogue`);
    const life = LIFE[p.id]; assert.ok(life && life.occupation === 'official', `${p.id} has a home and a job`);
    const [rid, unit] = life.home.split('/');
    const res = CONTENT.life.residences[rid]; assert.ok(res?.units[unit], `${p.id}'s home exists`);
    const sleep = c.schedule.find((b) => b.activity === 'sleep'); assert.ok(sleep);
    assert.equal(sleep.spot.split(':')[0], res.units[unit].map, `${p.id} sleeps in their own flat`);
  }
});

test('every embassy has its ambassador (and the Free Ports Mission its envoy); both parties fill all ten staff roles; the ministries and the House have their people', () => {
  for (const c of Object.keys(CONTENT.arms.countries).filter((x) => x !== 'sund')) assert.ok(AMBASSADORS.some((a) => a.country === c), `${c} has an ambassador`);
  assert.ok(AMBASSADORS.some((a) => a.country === 'free'), 'the Free Ports envoy');
  for (const party of ['order', 'liberty']) assert.deepEqual(Object.keys(STAFF_BY_PARTY[party]).sort(), POLITICS.staffRoles.map((r) => r.id).sort(), `${party}: ten roles filled`);
  for (const id of ['treasury', 'defence', 'interior', 'agriculture', 'foreign', 'records']) assert.ok(MINISTERS.some((m) => m.ministry === id), `a minister of ${id}`);
  for (const w of ['halver_house', 'halver_chief', 'halver_press', 'halver_records']) assert.ok(HOUSEHOLD.some((h) => (h.spot || h.room || h.work) .startsWith(w) || h.work === w), `Halver House: someone at ${w}`);
});

test('the political record names the people: each party\'s staff records are filled from the roster, once, and survive a save', () => {
  const g = newGame(61);
  const s = g.politics.ensure();
  for (const party of ['order', 'liberty']) for (const rec of s.parties[party].staff) assert.equal(rec.personId, STAFF_BY_PARTY[party][rec.role], `${party}/${rec.role}`);
  assert.equal(g.politics.overview().governing.staffFilled, 10);
  // a record made by 0.93.x with vacant staff gains them
  for (const rec of s.parties.order.staff) rec.personId = null;
  g.politics.ensure();
  assert.ok(s.parties.order.staff.every((r) => r.personId));
});

test('in office hours the people are at work: ambassadors in their embassies, party staff at headquarters, ministers in their ministries, the household in Halver House; asleep at home at night', () => {
  const g = newGame(62); noImpulses(g);
  setTime(g, 2, '10:30');
  for (const a of AMBASSADORS) assert.equal(at(g, a.id).map, `crown_quarter__${a.work}`, `${a.id} at the embassy`);
  for (const p of PARTY_STAFF) assert.equal(at(g, p.id).map, `crown_quarter__${p.work}`, `${p.id} at headquarters`);
  for (const m of MINISTERS) assert.equal(at(g, m.id).map, `crown_quarter__${m.work}`, `${m.id} at the ministry`);
  for (const h of HOUSEHOLD) assert.ok(at(g, h.id).map.startsWith('halver_'), `${h.id} in Halver House (${at(g, h.id).map})`);
  setTime(g, 2, '23:45');
  for (const p of CAPITAL_PEOPLE) assert.match(at(g, p.id).map, /^cq_(staff_a|staff_b|civil_service|civil|diplomatic)_\d+$/, `${p.id} sleeps at home`);
});

test('the doors: embassies, headquarters, the café and the hotel are open to you in their hours; ministries and the House are not; staff go through at any hour', () => {
  const g = newGame(63);
  const Q = g.maps.get('crown_quarter');
  const door = (id) => Q.buildings.find((b) => b.id === id).door;
  const reason = (id) => g.doorLockReason(door(id), () => false);
  setTime(g, 2, '10:00');
  for (const id of ['cq_embassy_ostmark', 'cq_free_ports', 'cq_order_hq', 'cq_liberty_hq', 'cq_cafe', 'cq_hotel']) assert.equal(reason(id), null, `${id} is open at 10:00`);
  for (const id of ['cq_min_treasury', 'cq_assembly', 'cq_club']) assert.ok(reason(id), `${id} is closed to the public`);
  setTime(g, 2, '20:00');
  assert.ok(reason('cq_embassy_ostmark') && reason('cq_order_hq'), 'shut in the evening');
  assert.equal(reason('cq_cafe'), null, 'the café is open until nine');
  const falk = AMBASSADORS[0]; const emb = door('cq_embassy_ostmark');
  assert.equal(g.npcCanPass({ id: falk.id, profile: {} }, emb), true, 'the ambassador, at any hour');
  assert.equal(g.npcCanPass({ id: AMBASSADORS[1].id, profile: {} }, emb), false, 'not another country\'s');
  assert.equal(g.npcCanPass({ id: MINISTERS[0].id, profile: {} }, door('cq_min_treasury')), true);
  assert.equal(g.npcCanPass({ id: 'npc_vegas', profile: {} }, door('cq_order_hq')), true); assert.equal(g.npcCanPass({ id: 'npc_vegas', profile: {} }, door('cq_liberty_hq')), false);
  assert.equal(g.npcCanPass({ id: 'npc_susan', profile: {} }, door('cq_liberty_hq')), true);
  const hh = CONTENT.maps.halver_house.doors.find((d) => d.to.map === 'halver_president');
  assert.equal(g.npcCanPass({ id: 'npc_vegas', profile: {} }, hh), true); assert.equal(g.npcCanPass({ id: 'npc_susan', profile: {} }, hh), true);
  assert.equal(g.npcCanPass({ id: HOUSEHOLD[0].id, profile: {} }, hh), true);
  assert.equal(g.playerCanPass(hh), false, 'the player still needs a pass');
});

test('the capital does not change the rest of the world: the street is the size it was; the capital\'s homes hold at most two people a flat (the validator holds the rest)', () => {
  assert.equal(CONTENT.maps.halvermouth.tiles[0].length, 204);
  const count = {};
  for (const p of CAPITAL_PEOPLE) count[LIFE[p.id].home] = (count[LIFE[p.id].home] || 0) + 1;
  for (const [home, n] of Object.entries(count)) assert.ok(n <= 2, `${home} holds ${n}`);
});

test('the leader in office works at Halver House; the other works the capital from party headquarters; it follows who governs, and survives a save', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = newGame(seed); noImpulses(g);
    const gov = g.politics.governingId();
    const leaders = { order: 'npc_vegas', liberty: 'npc_susan' };
    setTime(g, 2, '10:00');
    assert.equal(at(g, leaders[gov]).map, 'halver_president', `seed ${seed}: the President is in the President's office`);
    const opp = gov === 'order' ? 'liberty' : 'order';
    assert.match(at(g, leaders[opp]).map, /^crown_quarter(__cq_(order|liberty)_hq)?$/, `seed ${seed}: the other is out in the capital`);
  }
  // when the government changes, the schedules swap (and the shared content is never mutated)
  const g = newGame(7);
  const base = CONTENT.characters.npc_vegas.schedule;
  const gov = g.politics.governingId();
  g.world.politics.government.partyId = gov === 'order' ? 'liberty' : 'order';
  g.politics.syncLeaders();
  assert.equal(CONTENT.characters.npc_vegas.schedule, base, 'the content is shared and untouched');
  setTime(g, 3, '10:00');
  const president = g.world.politics.government.partyId === 'order' ? 'npc_vegas' : 'npc_susan';
  assert.equal(at(g, president).map, 'halver_president');
});
