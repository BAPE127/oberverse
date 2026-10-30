// Every bank is a physical building with a counter and staff (v0.78.0): the First Bank of Halvermouth (Governor, chief teller, bond clerk, vault guard)
// and the Lariat State Bank (manager and loan officer, teller, guard). They follow the world-simulation rules: a home with a bed, a schedule
// whose sleep block is in it, work at a spot inside the bank in the bank's hours — and nothing about the streets moved to make room.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, setTime, noImpulses, CONTENT } from './helpers.mjs';
import { LIFE, RESIDENCES } from '../src/content/life.js';

const FIRST = ['npc_augustus', 'npc_prudence', 'npc_cyrus', 'npc_bertram'];
const LARIAT = ['npc_hollis', 'npc_dottie', 'npc_clint'];
const at = (g, id) => { const n = g.npcs.get(id); return { map: n.map, x: n.x, y: n.y, activity: n.activity }; };
const T = 32; // NPC positions are in pixels
const near = (m, spot, n) => Math.hypot(n.x / T - 0.5 - m.spots[spot].x, n.y / T - 0.5 - m.spots[spot].y) < 1.6;

test('seven new people, each with a home and a bed, a sleep block in that bed, a dialogue and an entry in the registry', () => {
  for (const id of [...FIRST, ...LARIAT]) {
    const c = CONTENT.characters[id];
    assert.ok(c, id); assert.equal(c.tier, 'minor'); assert.equal(c.origin, 'generated');
    assert.ok(CONTENT.dialogues[c.dialogue], `${id}: dialogue`);
    const home = LIFE[id]?.home; assert.ok(home, `${id}: home`);
    const [rid, unit] = home.split('/');
    const res = CONTENT.life?.residences?.[rid] || RESIDENCES[rid] || CONTENT.residences?.[rid];
    const u = (res || { units: {} }).units[unit];
    const sleep = c.schedule.find((b) => b.activity === 'sleep');
    assert.ok(sleep, `${id}: a sleep block`);
    const [map, spot] = sleep.spot.split(':');
    assert.ok(CONTENT.maps[map]?.spots[spot], `${id}: the bed spot ${sleep.spot} exists`);
    if (u) assert.equal(u.map, map, `${id}: sleeps in their own home`);
  }
  assert.ok(readRegistry().includes('npc_augustus') && readRegistry().includes('npc_clint'), 'the character registry lists them');
});
function readRegistry() { return readFileSync(new URL('../docs/CHARACTER_REGISTRY.md', import.meta.url), 'utf8'); }

test('nothing moved to make room: the streets are exactly the size they were, and the banks\' halls are the size of their buildings', () => {
  assert.equal(CONTENT.maps.halvermouth.tiles[0].length, 204); assert.equal(CONTENT.maps.halvermouth.tiles.length, 128);
  assert.equal(CONTENT.maps.lariat.tiles[0].length, 179); assert.equal(CONTENT.maps.lariat.tiles.length, 125);
  const crown = CONTENT.maps.halvermouth.buildings.find((b) => b.id === 't_crown');
  assert.deepEqual([crown.x, crown.y, crown.w, crown.h], [49, 5, 15, 9], 'Crown Court keeps the old tower\'s footprint');
  const lb = CONTENT.maps.lariat.buildings.find((b) => b.id === 'b_bank');
  const L = CONTENT.maps.lariat_bank;
  assert.equal(L.tiles.length, lb.h); assert.equal(L.tiles[0].length, lb.w);
  assert.equal(lb.door.to.map, 'lariat_bank');
  assert.equal(L.doors[0].x, lb.door.x - lb.x);
});

test('the First Bank is staffed in its hours: a clerk at the bond desk, a teller at the grille, a guard by the vault, the Governor in his office; asleep at home at night', () => {
  const g = newGame(3101); noImpulses(g);
  setTime(g, 1, '10:30');
  const hall = CONTENT.maps.first_bank;
  for (const [id, spot] of [['npc_cyrus', 'bond_clerk'], ['npc_prudence', 'teller'], ['npc_bertram', 'guard_post']]) {
    const n = at(g, id);
    assert.equal(n.map, 'first_bank', id); assert.ok(near(hall, spot, n), `${id} is at ${spot}: ${n.x},${n.y}`);
  }
  const gov = at(g, 'npc_augustus');
  assert.equal(gov.map, 'first_bank_office'); assert.ok(near(CONTENT.maps.first_bank_office, 'desk', gov));
  setTime(g, 1, '23:30');
  for (const id of FIRST) assert.match(at(g, id).map, /^crown_court_/, `${id} sleeps in Crown Court`);
});

test('the Lariat State Bank is staffed in its hours: the manager at the loan desk, the teller at the window, the guard by the door; at home at night', () => {
  const g = newGame(3102); noImpulses(g);
  setTime(g, 1, '10:00');
  const hall = CONTENT.maps.lariat_bank;
  for (const [id, spot] of [['npc_hollis', 'manager'], ['npc_dottie', 'teller'], ['npc_clint', 'guard_post']]) {
    const n = at(g, id);
    assert.equal(n.map, 'lariat_bank', id); assert.ok(near(hall, spot, n), `${id} is at ${spot}: ${n.x},${n.y}`);
  }
  setTime(g, 1, '23:30');
  for (const id of LARIAT) assert.equal(at(g, id).map, 'boarding_house', `${id} sleeps at the Bluebonnet`);
});

test('the doors: open to you in the bank\'s hours only; the staff go through at any hour; the Governor\'s office is for staff alone', () => {
  const g = newGame(3103);
  g.changeMap('lariat', 'lariat_bank_door_out');
  const d = g.currentMap().doors.find((x) => x.to?.map === 'lariat_bank');
  assert.ok(d, 'a real door on Lariat\'s street');
  setTime(g, 1, '10:00'); assert.equal(g.playerCanPass(d), true);
  setTime(g, 1, '17:30'); assert.equal(g.playerCanPass(d), false);
  assert.match(g.doorLockReason(d, () => false), /09:00 to 16:00/);
  for (const id of LARIAT) assert.equal(g.npcCanPass({ id, profile: {} }, d), true, `${id} may enter at 17:30`);
  assert.equal(g.npcCanPass({ id: 'npc_opal', profile: {} }, d), false, 'a customer may not, after hours');
  g.changeMap('halvermouth', 'b_bank_out');
  const front = g.currentMap().doors.find((x) => x.to?.map === 'first_bank');
  setTime(g, 1, '08:15');
  assert.equal(g.playerCanPass(front), false);
  for (const id of FIRST) assert.equal(g.npcCanPass({ id, profile: {} }, front), true, `${id} may open up at 08:15`);
  const office = CONTENT.maps.first_bank.doors.find((x) => x.to.map === 'first_bank_office');
  setTime(g, 1, '10:00');
  assert.equal(g.playerCanPass(office), false, 'the Governor\'s office is not for the public');
  assert.match(g.doorLockReason(office, () => false), /STAFF ONLY/);
  for (const id of FIRST) assert.equal(g.npcCanPass({ id, profile: {} }, office), true);
});

test('the counters work: the loan desk opens the Loans app, the rate card the Bank app; the Governor\'s desk the Bank app; the clerk\'s lines open the right apps', () => {
  const g = newGame(3104);
  g.changeMap('lariat_bank', 'entry');
  const m = g.currentMap();
  assert.deepEqual(g.interact({ id: m.prop('lb_loan_desk').id }), { type: 'panel', panel: 'tablet', opts: { tab: 'Loans' } });
  assert.deepEqual(g.interact({ id: m.prop('lb_rate_card').id }), { type: 'panel', panel: 'tablet', opts: { tab: 'Bank' } });
  assert.equal(g.interact({ id: 'lb_vault' }).type, 'message');
  g.changeMap('first_bank_office', 'entry');
  assert.deepEqual(g.interact({ id: g.currentMap().prop('bank_off_desk').id }), { type: 'panel', panel: 'tablet', opts: { tab: 'Bank' } });
  const opens = (dlg, topic) => dlg.topics.find((t) => t.id === topic).effects[0].panel.opts.tab;
  assert.equal(opens(CONTENT.dialogues.dlg_hollis, 't_hol_loans'), 'Loans');
  assert.equal(opens(CONTENT.dialogues.dlg_cyrus, 't_cy_bonds'), 'Bonds');
  assert.equal(opens(CONTENT.dialogues.dlg_augustus, 't_aug_rate'), 'Bank');
});

test('nothing a clerk says claims to move a rate or a credit record, and nobody is hurt by a bank\'s staff being there: they are ordinary people', () => {
  const words = /\b(bribe|I can change your (rate|score)|off the books|no questions)/i;
  for (const id of ['dlg_augustus', 'dlg_prudence', 'dlg_cyrus', 'dlg_bertram', 'dlg_hollis', 'dlg_dottie', 'dlg_clint']) {
    const text = JSON.stringify(CONTENT.dialogues[id]);
    assert.ok(!words.test(text), id);
  }
  // the guards fight, the clerks do not
  assert.equal(CONTENT.characters.npc_bertram.combat.fights, true); assert.equal(CONTENT.characters.npc_clint.combat.fights, true);
  for (const id of ['npc_augustus', 'npc_prudence', 'npc_cyrus', 'npc_hollis', 'npc_dottie']) assert.equal(CONTENT.characters[id].combat.never, true);
});
