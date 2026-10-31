// Officers at work (v0.87.0): the parent company's executives and managers get bodies once it owns an office — they walk to their desks in
// office hours, take lunch in the boardroom, go home to the staff quarters behind the hall and sleep in a cot — and the office has only so
// many seats. Everything is deterministic from the books (no random numbers are drawn), and nobody without a seat is given a body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game, setTime, run } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { HQ_TIERS, hqMapId, hqQuartersId, hqBuildingId } from '../src/content/hq.js';

/** A game with a funded parent, an office, and `n` officers hired at the parent. */
function office(seed, tier = 'small', n = 2) {
  const g = newGame(seed);
  g.player.money = 80_000_000;
  assert.ok(g.corp.group.form().ok);
  assert.ok(g.corp.contribute('parent', 20_000_000).ok);
  if (tier) assert.ok(g.hq.buy(tier).ok);
  const hired = hire(g, n);
  return { g, hired };
}
function hire(g, n) {
  const pe = g.corp.personnel;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = pe.hire(i === 0 ? 'group_manager' : 'office', 'parent');
    if (r.ok) out.push(r.person);
  }
  return out;
}
const door = (g, tier, map = 'halvermouth', key = 'building') => g.maps.get(map).doors.find((d) => d[key] === hqBuildingId(tier));

test('with no office the parent has no seat limit and its people have no bodies; with one, they have bodies and the office has only so many seats', () => {
  const none = office(8701, null, 4);
  assert.equal(none.hired.length, 4, 'four officers hired with no limit');
  none.g.hq.sync(); // (nothing owned: nothing happens)
  assert.equal([...none.g.npcs.values()].filter((n) => n.profile.hqStaff).length, 0);
  const { g, hired } = office(8702, 'small', 0);
  const got = hire(g, 5);
  assert.equal(got.length, HQ_TIERS.small.seats, `the small office seats ${HQ_TIERS.small.seats}`);
  const pe = g.corp.personnel;
  const r = pe.hire('office', 'parent');
  assert.equal(r.ok, false); assert.match(r.text, /seats for 3 officers/);
  void hired;
});

test('a bigger office raises the limit and moves the officers into it; people at the businesses do not count', () => {
  const { g } = office(8703, 'small', 3);
  g.hq.sync();
  assert.equal(g.hq.seatError(), HQ_TIERS.small.name ? g.hq.seatError() : null);
  assert.ok(g.hq.seatError(), 'full');
  assert.ok(g.hq.buy('mid').ok);
  assert.equal(g.hq.seatError(), null, 'room again');
  g.hq.sync();
  const officers = [...g.npcs.values()].filter((n) => n.profile.hqStaff);
  assert.equal(officers.length, 3);
  assert.ok(officers.every((n) => n.profile.hqTier === 'mid' && n.profile.schedule.some((b) => b.spot.startsWith(`${hqMapId('mid')}:`))), 'they work in the bigger office now');
});

test('each seated officer has a body that sits at their own desk in office hours, lunches in the boardroom, and sleeps in their own cot', () => {
  const { g, hired } = office(8704, 'mid', 3);
  g.hq.sync();
  const bodies = hired.map((p) => g.npcs.get(p.id));
  assert.ok(bodies.every(Boolean));
  const at = (hhmm) => { setTime(g, 3, hhmm); g.settleNpcs(); return bodies.map((n) => [n.map, n.activity]); };
  assert.deepEqual(at('10:00'), bodies.map(() => [hqMapId('mid'), 'work']));
  assert.deepEqual(at('13:00'), bodies.map(() => [hqMapId('mid'), 'leisure']), 'lunch in the hall');
  assert.deepEqual(at('02:00'), bodies.map(() => [hqQuartersId('mid'), 'sleep']), 'asleep in the quarters');
  assert.deepEqual(at('19:00'), bodies.map(() => [hqQuartersId('mid'), 'leisure']));
  const desks = new Set(bodies.map((n) => n.profile.schedule[0].spot)); const beds = new Set(bodies.map((n) => n.profile.schedule[4].spot));
  assert.equal(desks.size, 3); assert.equal(beds.size, 3, 'their own desk and their own cot');
  for (const n of bodies) for (const b of n.profile.schedule) { const [m, sp] = b.spot.split(':'); assert.ok(CONTENT.maps[m].spots[sp], `${b.spot} exists`); }
});

test('they really walk: at half past eight they are in the quarters, and by nine they are at their desks in the hall (they set out ten minutes early)', () => {
  const { g, hired } = office(8705, 'small', 2);
  g.hq.sync();
  setTime(g, 3, '08:30'); g.settleNpcs();
  const bodies = hired.map((p) => g.npcs.get(p.id));
  assert.ok(bodies.every((n) => n.map === hqQuartersId('small')));
  run(g, 31);
  assert.ok(bodies.every((n) => n.map === hqMapId('small') && n.activity === 'work'), JSON.stringify(bodies.map((n) => [n.map, n.activity])));
});

test('only an owned office lets its officers in: they pass its doors and the quarters\' door, a stranger does not, and you do', () => {
  const { g, hired } = office(8706, 'small', 1);
  g.hq.sync();
  const officer = g.npcs.get(hired[0].id);
  const stranger = [...g.npcs.values()].find((n) => !n.profile.hqStaff);
  const front = door(g, 'small');
  const back = g.maps.get(hqMapId('small')).doors.find((d) => d.id === 'door_hq_small_quarters');
  assert.equal(g.npcCanPass(officer, front), true); assert.equal(g.npcCanPass(officer, back), true);
  assert.equal(g.npcCanPass(stranger, front), false); assert.equal(g.npcCanPass(stranger, back), false);
  assert.equal(g.playerCanPass(front), true); assert.equal(g.playerCanPass(back), true);
});

test('leaving the company takes the body away; the books are not touched by it', () => {
  const { g, hired } = office(8707, 'small', 2);
  g.hq.sync();
  assert.ok(g.npcs.get(hired[0].id));
  const cash = g.corp.account('parent').cash;
  assert.ok(g.corp.personnel.dismiss(hired[0].id, 'resigned').ok);
  g.hq.sync();
  assert.equal(g.npcs.has(hired[0].id), false); assert.ok(g.npcs.get(hired[1].id));
  assert.equal(g.corp.account('parent').cash, cash, 'resigning costs nothing');
  assert.ok(g.corp.reconciles());
});

test('the minute tick notices a new hire by itself, draws no random numbers, and does nothing when nothing changed', () => {
  const { g } = office(8708, 'small', 0);
  const before = JSON.stringify(g.rng.state ?? g.rng);
  hire(g, 2);
  g.hq.minuteTick();
  assert.equal([...g.npcs.values()].filter((n) => n.profile.hqStaff).length, 2, 'the bodies followed the books');
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), before, 'no random number was drawn');
  const ids = [...g.npcs.keys()].join();
  g.hq.minuteTick(); g.hq.sync();
  assert.equal([...g.npcs.keys()].join(), ids);
});

test('save and load: the officers are back, at the right desks', () => {
  const { g, hired } = office(8709, 'small', 2);
  g.hq.sync();
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  for (const p of hired) { const n = h.npcs.get(p.id); assert.ok(n, p.name); assert.equal(n.profile.hqStaff, true); }
  assert.deepEqual(hired.map((p) => h.npcs.get(p.id).profile.schedule[0].spot), hired.map((p) => g.npcs.get(p.id).profile.schedule[0].spot));
});

test('the staff quarters are real rooms: a cot for every seat, a door both ways, and the hall\'s door to them is on its top wall', () => {
  for (const tier of ['small', 'mid', 'tower']) {
    const Q = CONTENT.maps[hqQuartersId(tier)]; const H = CONTENT.maps[hqMapId(tier)];
    assert.equal(Q.props.filter((p) => p.type === 'cot').length, HQ_TIERS[tier].seats);
    assert.equal(Q.doors[0].to.map, hqMapId(tier)); assert.ok(H.spots.quarters_door);
    const d = H.doors.find((x) => x.to?.map === hqQuartersId(tier));
    assert.equal(d.y, 0); assert.equal(Q.dwelling, true);
    for (let k = 1; k <= HQ_TIERS[tier].seats; k++) assert.ok(Q.spots[`bed_${k}`], `bed ${k}`);
  }
});
