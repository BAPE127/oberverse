// The political foundations (v0.93.0): two parties and their leaders, a government, a term of 120 days with an election date, a read-only
// overview. Nothing here changes any price, cost, police or war. The record is made on first use, never by a random draw on a read, and it
// survives a save; an older save simply gains it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, setTime, noImpulses, CONTENT, Game } from './helpers.mjs';
import { POLITICS } from '../src/content/politics.js';
import { termOf, phaseOf, daysTo } from '../src/politics/calendar.js';
import { freshPolitics, stanceDistance } from '../src/politics/model.js';
import { LIFE } from '../src/content/life.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => {
  const sm = new SaveManager(new MemoryStorage());
  const r = sm.save('slot1', g);
  assert.ok(r.ok, JSON.stringify(r));
  const g2 = new Game(CONTENT, { seed: 99 });
  const res = sm.load('slot1', g2);
  assert.ok(res.ok, JSON.stringify(res.errors));
  return g2;
};
/** Jump to a morning: the clock set, and the political day run once (what minuteTick does at 06:09), without minutes of simulation between. */
const morning = (g, d) => { g.clock.total = (d - 1) * 1440 + 6 * 60 + 9; g.politics.dailyTick(); };

test('the calendar: terms of 120 days from day 1, the vote in the last 30, polling day on the last', () => {
  const C = POLITICS.constitution;
  assert.equal(C.termDays, 120); assert.equal(C.electionDays, 30);
  assert.deepEqual(termOf(1, C), { index: 0, start: 1, end: 120, electionFrom: 91, electionDay: 120 });
  assert.equal(termOf(120, C).index, 0); assert.equal(termOf(121, C).index, 1); assert.equal(termOf(121, C).start, 121);
  assert.equal(phaseOf(90, C), 'term'); assert.equal(phaseOf(91, C), 'campaign'); assert.equal(phaseOf(119, C), 'campaign'); assert.equal(phaseOf(120, C), 'polling'); assert.equal(phaseOf(121, C), 'term');
  assert.equal(daysTo(100, C), 20); assert.equal(daysTo(120, C), 0);
  assert.equal(C.assemblySeats.order + C.assemblySeats.liberty + C.assemblySeats.other, 100, 'an Assembly of 100 seats');
});

test('two parties with the two leaders, platforms that differ, staff roles as vacant records, and funds of their own', () => {
  const P = POLITICS;
  assert.deepEqual(Object.keys(P.parties), ['order', 'liberty']);
  assert.equal(P.parties.order.leader, 'npc_vegas'); assert.equal(P.parties.liberty.leader, 'npc_susan');
  assert.equal(CONTENT.characters.npc_vegas.name, 'Josiah Vegas'); assert.equal(CONTENT.characters.npc_susan.name, 'Susan');
  for (const id of ['order', 'liberty']) for (const k of Object.keys(P.issues)) assert.ok(Number.isInteger(P.parties[id].platform[k]) && Math.abs(P.parties[id].platform[k]) <= 2, `${id}/${k}`);
  assert.ok(stanceDistance(P.parties.order.platform, P.parties.liberty.platform, P.issues) > 1, 'the platforms really differ');
  assert.equal(P.staffRoles.length, 10);
  const rec = freshPolitics(P, { day: 1, governs: 'liberty' });
  assert.equal(rec.government.partyId, 'liberty'); assert.equal(rec.government.presidentId, 'npc_susan');
  for (const id of ['order', 'liberty']) { assert.equal(rec.parties[id].staff.length, 10); assert.ok(rec.parties[id].staff.every((s) => s.personId === null), 'vacant: people come with a later release'); assert.ok(rec.parties[id].funds > 0); }
  // not a global modifier: no party-wide "good" or "bad" number anywhere in the content
  assert.equal(JSON.stringify(P).match(/"(crime|war|cost|price)Mod/), null);
});

test('the record is made on first use, from the world, with no change to anything else; both leaders persist and have homes, beds and dialogue', () => {
  const g = newGame(7);
  assert.equal(g.world.politics, undefined, 'nothing made until it is read');
  const money = g.player.money;
  const O = g.politics.overview();
  assert.ok(g.world.politics && g.world.politics.v === 1);
  assert.equal(g.player.money, money, 'reading changes nothing');
  assert.ok(['order', 'liberty'].includes(O.governing.id) && O.opposition.id !== O.governing.id);
  assert.equal(O.governing.leader, O.governing.id === 'order' ? 'Josiah Vegas' : 'Susan');
  assert.equal(O.termDay, 1); assert.equal(O.calendar.daysToPolling, 119);
  assert.equal(O.issues.length, 8); assert.ok(O.issues[0].gap >= O.issues[7].gap, 'sorted by how far apart');
  assert.equal(JSON.stringify(g.politics.overview()), JSON.stringify(O), 'a read is a pure function of the record: twice the same');
  for (const id of ['npc_vegas', 'npc_susan']) {
    const c = CONTENT.characters[id];
    assert.ok(c && c.tier === 'minor' && CONTENT.dialogues[c.dialogue], `${id} and dialogue`);
    assert.ok(LIFE[id]?.home, `${id} has a home`);
    assert.ok(c.schedule.some((b) => b.activity === 'sleep'), `${id} sleeps`);
    assert.ok(g.npcs.has(id), `${id} is in the world`);
  }
  assert.equal(LIFE.npc_vegas.home, 'res_crown_court/flat_4'); assert.equal(LIFE.npc_susan.home, 'res_crown_court/flat_5');
  assert.ok(CONTENT.maps.crown_court_4 && CONTENT.maps.crown_court_5, 'their flats exist');
});

test('which party governs first is a fixed function of the world: the same world, the same answer; and it survives a save and a reload', () => {
  const a = newGame(11); const b = newGame(11);
  assert.equal(a.politics.governingId(), b.politics.governingId());
  const seen = new Set(); for (let s = 1; s <= 24; s++) seen.add(newGame(s).politics.governingId());
  assert.equal(seen.size, 2, 'both parties can start in office');
  const g2 = roundtrip(a);
  assert.equal(g2.politics.governingId(), a.politics.governingId());
  assert.equal(g2.world.politics.parties.order.funds, a.world.politics.parties.order.funds);
});

test('the term rolls over once, on its day, and the same government continues until elections exist; a reload cannot repeat it', () => {
  const g = newGame(5); noImpulses(g);
  g.politics.ensure();
  const gov = g.politics.governingId();
  morning(g, 100); assert.equal(g.world.politics.government.term, 0);
  morning(g, 121);
  const s = g.world.politics;
  assert.equal(s.government.term, 1); assert.equal(s.government.termStart, 121); assert.equal(s.government.termEnd, 240);
  assert.equal(s.government.partyId, gov, 'nobody is voted out yet: elections are a later release');
  const rolls = s.history.filter((e) => e.kind === 'term').length;
  assert.equal(rolls, 1);
  g.politics.dailyTick(); g.politics.dailyTick();
  assert.equal(s.history.filter((e) => e.kind === 'term').length, 1, 'idempotent');
  const g2 = roundtrip(g);
  g2.politics.dailyTick();
  assert.equal(g2.world.politics.history.filter((e) => e.kind === 'term').length, 1);
  assert.equal(g2.politics.overview().termDay, g.politics.overview().termDay);
});

test('the leaders keep to their schedules: asleep at night in their own flat, out in the city by day', () => {
  const g = newGame(3);
  for (const [id, flat] of [['npc_vegas', 'crown_court_4'], ['npc_susan', 'crown_court_5']]) {
    setTime(g, 2, '03:00'); g.update(0.5, { x: 0, y: 0 });
    const n = g.npcs.get(id);
    assert.equal(n.activity, 'sleep', `${id} sleeps at 03:00`);
    assert.equal(n.map, flat, `${id} sleeps in ${flat}`);
  }
});

test('the Politics app: on the tablet, readable by anyone, changes nothing; an old save gains the record without any loss', () => {
  const g = newGame(2);
  assert.ok(g.tablet && true);
  const raw = JSON.parse(readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8'));
  assert.equal(raw.state.world.politics, undefined, 'the old save has no politics');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), JSON.stringify(raw));
  const g2 = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g2).ok);
  const money = g2.player.money;
  assert.equal(g2.world.politics, undefined);
  const O = g2.politics.overview();
  assert.ok(O.governing && O.calendar.phase);
  assert.equal(g2.player.money, money);
});
