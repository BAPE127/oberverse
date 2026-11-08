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
import { dayTick as supplyLink } from './link.js';
import { organise } from './organise.js';
import { dayTick as researchDay } from './research.js';
import { settleFunding } from './company.js';
import { dayTick as procurement } from './procurement.js';

export function runDay(game) {
  construction(game);
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return;
  settleFunding(game); // v0.103.7: a company registered before it was told to use the wallet like the others, and held nothing, goes back to spending the wallet
  C.days ||= {};
  const day = game.clock.day;
  normalise(C);
  if ((C.days.pay || 0) < day) { C.days.pay = day; payroll(game); trainTick(game); }
  if (C.autoSquads) organise(game); // v0.103.3: soldiers whose training has ended join a squad and are armed
  researchDay(game); // v0.103.8: a research project whose last day has come is finished
  works(game);
  procurement(game); // v0.103.4: orders from outside suppliers arrive on their day
  supplyLink(game); // v0.103.2: the Arms works ship toward the company's standing levels, free
  jobs(game);
  battles(game);
  strategic(game);
  living(game);
  while (C.log.length > 40) C.log.shift(); // the company's log stays short
  const m = peekMilitary(game);
  while (m.log.length > 40) m.log.shift();
}
