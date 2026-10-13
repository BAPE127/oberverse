// Schedule resolution. A schedule is a list of blocks
//   { from: 'HH:MM', to: 'HH:MM', activity, spot: 'map:spot', onArrive?, label? }
// Blocks may wrap past midnight. The first matching block wins.
import { inWindow, parseTime, MINUTES_PER_DAY } from '../world/clock.js';

export function blockAt(schedule, minuteOfDay) {
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  for (let i = 0; i < schedule.length; i++) {
    const b = schedule[i];
    if (inWindow(m, b.from, b.to)) return { ...b, index: i };
  }
  return null;
}

/** Validate that a schedule covers all 1440 minutes of the day. Returns uncovered minutes count. */
export function coverageGaps(schedule) {
  let gaps = 0;
  for (let m = 0; m < MINUTES_PER_DAY; m++) if (!blockAt(schedule, m)) gaps++;
  return gaps;
}

/** Day-relative key for "this occurrence of this block", used to run onArrive hooks once. */
export function blockInstanceKey(block, totalMinutes) {
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const m = totalMinutes % MINUTES_PER_DAY;
  // A block that wraps midnight belongs to the day it started on.
  const startedYesterday = parseTime(block.from) > parseTime(block.to) && m < parseTime(block.to);
  return `${block.index}@${startedYesterday ? day - 1 : day}`;
}
