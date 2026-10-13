import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldClock, parseTime, inWindow, formatTime } from '../src/world/clock.js';

test('parse/format times', () => {
  assert.equal(parseTime('08:30'), 510);
  assert.equal(formatTime(510), '08:30');
  assert.equal(formatTime(1440 + 61), '01:01');
});

test('windows wrap past midnight', () => {
  assert.ok(inWindow(parseTime('23:00'), '22:00', '06:30'));
  assert.ok(inWindow(parseTime('02:00'), '22:00', '06:30'));
  assert.ok(!inWindow(parseTime('12:00'), '22:00', '06:30'));
  assert.ok(inWindow(parseTime('12:00'), '12:00', '13:00'));
  assert.ok(!inWindow(parseTime('13:00'), '12:00', '13:00'));
});

test('clock advances and reports day/night', () => {
  const c = new WorldClock();
  assert.equal(c.day, 1);
  assert.equal(c.timeString, '08:00');
  assert.equal(c.darkness, 0);
  const crossed = c.tick(90);
  assert.equal(crossed, 90);
  assert.equal(c.timeString, '09:30');
  c.total = 23 * 60;
  assert.equal(c.darkness, 1);
  c.total = 1440 + 6 * 60;
  assert.equal(c.day, 2);
  assert.ok(c.darkness > 0 && c.darkness < 1, 'dawn is partially dark');
  assert.equal(c.minutesUntil('07:00'), 60);
});

test('paused clock does not advance', () => {
  const c = new WorldClock();
  c.paused = true;
  assert.equal(c.tick(100), 0);
  assert.equal(c.timeString, '08:00');
});
