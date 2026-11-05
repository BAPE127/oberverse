// The company's day (v0.99.0): what happens at 06:11 once the company exists, in one order, each part once per day: construction, wages, the works, contracts.
// Every part keeps its own "done today" mark, so a day that is run twice changes nothing.
import { peekMilitary } from './state.js';
import { dailyTick as construction } from './facilities.js';
import { payroll, trainTick, normalise } from './people.js';
import { dayTick as works } from './production.js';
import { dayTick as jobs } from './contracts.js';
import { dayTick as living } from './base.js';
import { dayTick as battles } from './engagements.js';
import { dayTick as strategic } from './strategic.js';

export function runDay(game) {
  construction(game);
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return;
  game.corp.account('security').funded = true; // (a company registered in v0.98.0 may have an unfunded account: its income must never reach the wallet)
  C.days ||= {};
  const day = game.clock.day;
  normalise(C);
  if ((C.days.pay || 0) < day) { C.days.pay = day; payroll(game); trainTick(game); }
  works(game);
  jobs(game);
  battles(game);
  strategic(game);
  living(game);
  while (C.log.length > 40) C.log.shift(); // the company's log stays short
  const m = peekMilitary(game);
  while (m.log.length > 40) m.log.shift();
}
