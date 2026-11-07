// The company's people (v0.99.0, classes from v0.100.0): a recruit is a record (id, name, class, wage, a bed in a barracks). Guards and technicians start at once; a soldier of a troop class
// first trains (a place at the range or the training ground for the class's days) and is issued a uniform from the stores. Wages are paid each day from the company's own account (what
// it cannot cover is owed, never taken from your wallet). Squads are in src/war/squads.js and what a person carries in src/war/loadout.js.
//
//   hire(game, role, squadId) / dismiss      every check first, then the change; a troop hired into a squad (v0.103.6) holds a place in it (`joins`) while training and joins on the day it ends
//   trainTick(game)                         recruits whose days are done start work
//   payroll(game)                           one day's wages
//   normalise(C)                            gives older records (v0.99.0) the newer fields
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { nextId, takeStock, stockOf } from './equipment.js';
import { release } from './loadout.js';
import { assign, setLeader, reservedFor } from './squads.js';
import { CLASSES, SQUAD } from '../content/troops.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export const headcount = (game) => (peekMilitary(game)?.company?.personnel || []).filter((p) => p.status !== 'dead').length;
export const bedsFree = (game) => Math.max(0, capacity(game).beds - headcount(game));
export const inTraining = (game) => (peekMilitary(game)?.company?.personnel || []).filter((p) => p.status === 'training').length;
export const ofRole = (game, role) => (peekMilitary(game)?.company?.personnel || []).filter((p) => p.role === role && p.status === 'active');
/** Guards and technicians (or any class) not on a post and not in a squad. */
export const idle = (game, role) => ofRole(game, role).filter((p) => !p.post && p.assignedTo == null);

/** The newer fields, for a record made before they existed (idempotent; changes nothing that is already set). */
export function normalise(C) {
  for (const p of C?.personnel || []) {
    p.exp ??= 0; p.morale ??= 70; p.fatigue ??= 0; p.wounds ??= 0; p.armour ??= 1; p.weapon ??= null; p.gadget ??= null; p.joins ??= null;
  }
}

function barracks(game) {
  const C = peekMilitary(game)?.company;
  return (C?.facilities || []).find((f) => f.state === 'built' && /^barracks|^bunkhouse$/.test(f.id))?.id || null;
}

export function hire(game, role, squadId = null) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const K = CLASSES[role];
  if (!K) return { ok: false, text: 'No such job.' };
  if (!C.licensed) return { ok: false, text: 'A private security company needs its licence before it employs anyone.' };
  if (bedsFree(game) < 1) return { ok: false, text: capacity(game).beds ? `Every bed is taken (${headcount(game)} of ${capacity(game).beds}).` : 'Build the bunkhouse first: there is nowhere for anyone to sleep.' };
  if (K.train > 0 && inTraining(game) >= capacity(game).training) return { ok: false, text: `Every training place is in use (${inTraining(game)} of ${capacity(game).training}): finish the range or wait for a course to end.` };
  if (K.group === 'troop' && stockOf(game, 'supply:uniform') < 1) return { ok: false, text: 'There is no uniform in the stores: buy some from the suppliers.' };
  let into = null;
  if (squadId != null) {
    into = C.squads.find((q) => q.id === squadId);
    if (!into) return { ok: false, text: 'No such squad.' };
    if (K.group !== 'troop') return { ok: false, text: `A ${K.name.toLowerCase()} does not join a squad.` };
    if (into.status !== 'home') return { ok: false, text: `${into.name} is away: it cannot take anyone new now.` };
    if (into.members.length + reservedFor(C, into.id) >= SQUAD.max) return { ok: false, text: `${into.name} is full (${SQUAD.max}, counting places held for recruits in training).` };
  }
  // every check passed
  if (K.group === 'troop') takeStock(game, 'supply:uniform', 1);
  const id = nextId(C, 'P');
  const N = game.content.arms.staffNames;
  const key = `${game.world.salt || game.rng?.state || 0}|${id}`;
  const name = `${N.first[Math.floor(unit(`${key}|f`) * N.first.length)]} ${N.last[Math.floor(unit(`${key}|l`) * N.last.length)]}`;
  C.personnel.push({ id, name, role, wage: K.wage, status: K.train ? 'training' : 'active', trainedDay: game.clock.day + K.train, hired: game.clock.day, joins: into ? into.id : null, location: `facility:${barracks(game)}`, assignedTo: null, post: null, exp: 0, morale: 70, fatigue: 0, wounds: 0, armour: 1, weapon: null, gadget: null });
  const person = C.personnel[C.personnel.length - 1];
  if (into && !K.train) { person.joins = null; assign(game, into.id, person.id); } // (every troop class trains, so this holds only if one is ever added with no training)
  return { ok: true, text: `${name} joins as ${/^[aeiou]/i.test(K.name) ? 'an' : 'a'} ${K.name.toLowerCase()} (${K.wage} obols a day${K.train ? `, ${K.train} days of training` : ''})${into ? `. A place is held in ${into.name}${K.train ? ' until training ends' : ''}.` : '.'}`, id };
}

export function dismiss(game, id) {
  const C = peekMilitary(game)?.company;
  const p = C?.personnel.find((x) => x.id === id);
  if (!p) return { ok: false, text: 'No such person.' };
  if (p.post || p.assignedTo != null) return { ok: false, text: `${p.name} is ${p.post ? 'on a post' : 'in a squad'}: ${p.post ? 'finish the job first' : 'take them out of it first'}.` };
  release(game, p);
  C.personnel = C.personnel.filter((x) => x !== p);
  return { ok: true, text: `${p.name} is let go.` };
}

/** Recruits whose training is done start work. */
export function trainTick(game) {
  const C = peekMilitary(game)?.company;
  if (!C) return;
  const day = game.clock.day;
  for (const p of C.personnel) {
    if (p.status === 'training' && (p.trainedDay ?? 0) <= day) {
      p.status = 'active'; p.exp = Math.max(p.exp, 1);
      const to = p.joins; p.joins = null; // the held place is used (or, if the squad is gone, away or full, the auto-squads take them as for anyone)
      if (to != null) { // an officer joins as the squad's leader when it has none (the squad he was hired to lead)
        const sq = C.squads.find((q) => q.id === to);
        if (CLASSES[p.role]?.leads && sq && !sq.leader) setLeader(game, to, p.id); else assign(game, to, p.id);
      }
    }
  }
}

/** One day's wages for everyone, from the company's own account; whatever it cannot cover is owed. */
export function payroll(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.personnel.length && !C?.generals?.length) return 0;
  const total = C.personnel.filter((p) => p.status !== 'dead').reduce((a, p) => a + p.wage, 0) + (C.generals || []).reduce((a, g) => a + g.fee, 0); // (generals are paid every day they are on the books)
  if (total > 0) game.corp.pay('security', total, { cat: 'wages', owe: true, quiet: true });
  return total;
}
