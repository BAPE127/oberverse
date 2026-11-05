// The company's day (v0.99.0): what happens at 06:11 once the company exists, in one order, each part once per day: construction, wages, the works.
// (v0.99.0 stage 6 adds contracts.) Every part keeps its own "done today" mark, so a day that is run twice changes nothing.
import { peekMilitary } from './state.js';
import { dailyTick as construction } from './facilities.js';
import { payroll } from './people.js';
import { dayTick as works } from './production.js';

export function runDay(game) {
  construction(game);
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return;
  C.days ||= {};
  const day = game.clock.day;
  if ((C.days.pay || 0) < day) { C.days.pay = day; payroll(game); }
  works(game);
}
