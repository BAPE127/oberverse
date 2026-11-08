// "Next event" (v0.103.7): the terminal's button runs time up to the next thing that happens, as the Aerospace and Shipping terminals do. It reads and changes nothing, is always in the future,
// is null when nothing is due, and arriving at it means the thing has happened.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { warGame, buildAll, days } from './war_helpers.mjs';
import { CLASSES } from '../src/content/troops.js';

const run = (g) => { const e = g.war.nextEvent(); assert.ok(e, 'there is an event'); g.skipTime(e.at - g.clock.total); return e; };

test('with nothing due there is no next event; it reads without changing anything and is always in the future', () => {
  const g = newGame(1501); assert.equal(g.war.nextEvent(), null, 'no company');
  const w = warGame(1502); assert.equal(w.war.nextEvent(), null, 'a licence and a lot, nothing building, hired or ordered');
  assert.ok(w.war.commission('site_office').ok);
  const before = JSON.stringify(w.world.military); const e = w.war.nextEvent();
  assert.ok(e && e.at > w.clock.total && typeof e.why === 'string' && e.why.length > 0); assert.equal(JSON.stringify(w.world.military), before, 'reading changed nothing');
  assert.equal(JSON.stringify(w.war.nextEvent()), JSON.stringify(e), 'the same answer twice');
});

test('construction: running time to the event moves the work on, from the middle of the day or just before the company\'s day', () => {
  for (const startMinute of [10 * 60, 6 * 60 + 5, 23 * 60]) {
    const g = warGame(1503 + startMinute); g.clock.total = Math.floor(g.clock.total / 1440) * 1440 + startMinute; assert.ok(g.war.commission('site_office').ok);
    const f0 = g.war.facilities().find((f) => f.id === 'site_office').state; const e = run(g);
    const f1 = g.war.facilities().find((f) => f.id === 'site_office').state; assert.notEqual(f1, f0, `${startMinute}: the permit stage ended (${e.why})`);
    assert.ok(g.clock.minuteOfDay >= 6 * 60 + 11 && g.clock.minuteOfDay < 6 * 60 + 30, 'we arrive just after the company\'s day');
  }
});

test('training: the event is the morning a recruit finishes, and then they are at work', () => {
  const g = warGame(1510, { cash: 20_000_000 }); buildAll(g, 1); g.war.buySupply('uniform', 5); days(g, 1);
  const r = g.war.hire('rifleman'); assert.ok(r.ok, r.text); assert.equal(g.war.people().find((p) => p.id === r.id).status, 'training');
  let guard = 0; while (g.war.people().find((p) => p.id === r.id).status === 'training' && guard++ < 12) run(g);
  assert.equal(g.war.people().find((p) => p.id === r.id).status, 'active', 'training ended at an event'); assert.ok(guard <= CLASSES.rifleman.train + 1, `in about ${CLASSES.rifleman.train} presses, not ${guard}`);
});

test('production: a unit in progress is an event on the morning it comes off the line', () => {
  const g = warGame(1511, { cash: 40_000_000 }); buildAll(g, 3); for (let i = 0; i < 6; i++) g.war.hire('technician');
  for (const k of ['plate', 'engine', 'optics']) g.war.buySupply(k, 30);
  assert.ok(g.war.order('anvil', 1).ok); days(g, 1); assert.ok(g.war.production().lines.some((l) => l.model === 'anvil'), 'a line started');
  let guard = 0; while (g.war.equipment().length === 0 && guard++ < 10) run(g);
  assert.equal(g.war.equipment().length, 1, 'the tank rolled out at an event'); assert.ok(guard <= 6);
});
