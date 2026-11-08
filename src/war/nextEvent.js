// The next thing that happens (v0.103.7): what the command terminal's "Next event" button runs time up to, as the Aerospace and Shipping terminals do for theirs. Pure: it reads the company's own
// records and the clock and changes nothing.
//
//   nextEvent(game)   { at, why, others } or null.  `at` is a game minute (clock.total) just after the thing happens, `why` the first thing in words, `others` how many more happen at the same time
//
// The company's day runs at 06:11 (src/war/day.js: wages, the works, construction, deliveries, training, contracts), so most things happen on a morning; the soldiers' sealift and marches are
// by the hour. The time returned is four minutes after the thing, so the morning's work has been done when you get there.
import { peekMilitary } from './state.js';
import { FACILITIES } from '../content/facilities.js';
import { MODELS } from '../content/production.js';
import { efficiency } from './production.js';
import { nowHour } from './strategic.js';
import { WAR_RESEARCH } from '../content/warResearch.js';

const DAY_AT = 6 * 60 + 11; const AFTER = 4;

export function nextEvent(game) {
  const m = peekMilitary(game); const C = m?.company;
  if (!C?.identity) return null;
  const now = game.clock.total; const day = game.clock.day; const mod = game.clock.minuteOfDay;
  // the k-th morning from now (1 = the next one) and the day number it will have
  const base = (day - 1) * 1440 + DAY_AT; const first = mod < DAY_AT ? base : base + 1440; const dayAt = (k) => day + (k - 1) + (mod < DAY_AT ? 0 : 1);
  const morning = (k) => first + (Math.max(1, k) - 1) * 1440 + AFTER;
  const kFor = (due) => Math.max(1, due - dayAt(1) + 1); // the first morning on which a day number has been reached
  const ev = [];
  const add = (at, why) => { if (at > now) ev.push({ at, why }); };

  for (const f of C.facilities || []) if (['permit', 'foundation', 'frame', 'fitted'].includes(f.state)) add(morning(f.daysLeft || 1), `Mason's Os finishes the ${f.state === 'permit' ? 'permit' : f.state} of the ${FACILITIES[f.id]?.name || f.id}`);
  for (const p of C.personnel || []) if (p.status === 'training') add(morning(kFor(p.trainedDay ?? day)), `${p.name} finishes training`);
  for (const o of C.orders || []) if (o.state !== 'delivered') add(morning(kFor(o.due ?? day)), `Order ${o.id} from ${o.supplierName} arrives`);
  for (const c of C.contracts || []) if (c.state === 'active') add(morning(kFor(c.end ?? day)), `The job "${c.title}" ends`);
  for (const e of C.engagements || []) if (e.state === 'open' && e.expires != null) add(morning(kFor(e.expires)), `${e.title} must be decided`);
  if (C.research?.active) add(morning(kFor(C.research.active.end)), `Research finishes: ${WAR_RESEARCH[C.research.active.id]?.name}`);
  // the works: a unit in progress is done after the days it still needs; an idle line with a waiting order starts tomorrow morning
  for (const l of C.lines || []) {
    if (l.unit) { const mod2 = MODELS[l.unit.model]; if (mod2) { const perDay = (l.shifts / mod2.days) * efficiency(C, l.works); const left = Math.max(0, 1 - (l.unit.progress || 0)); add(morning(Math.ceil(left / Math.max(perDay, 0.001))), `A ${l.unit.model} comes off line ${l.id}`); } }
    else if ((C.production || []).some((o) => o.left > 0) && !l.blocked) add(morning(1), `Line ${l.id} starts a unit`);
  }
  // the soldiers abroad: sealift and marches are by the hour; the retainer is paid each morning
  const w = m.war; const hour = nowHour(game);
  for (const bn of w?.battalions || []) {
    if ((bn.status === 'deploying' || bn.status === 'returning') && bn.arrive != null) add(Math.max(bn.arrive, hour + 1) * 60 + 1, bn.status === 'deploying' ? `${bn.name} lands in the theatre` : `${bn.name} gets home`);
    else if (bn.status === 'theatre') { if (bn.moving) add((hour + Math.max(1, bn.moving.left)) * 60 + 1, `${bn.name} reaches the end of its leg`); add(morning(1), `The retainer for ${bn.name} is paid`); }
  }
  if (!ev.length) return null;
  ev.sort((a, b) => a.at - b.at);
  const first1 = ev[0];
  return { at: first1.at, why: first1.why, others: ev.filter((x) => x.at === first1.at).length - 1 };
}
