// The company's people (v0.99.0): a recruit is a record (id, name, role, wage, a bed in a barracks); guards stand contracts, technicians crew the works' lines. Wages are paid each day from
// the company's own account (what it cannot cover becomes arrears, never your wallet). v0.100.0 adds roles with training, squads and the people drawn on the map.
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { nextId } from './equipment.js';
import { PEOPLE } from '../content/production.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export const headcount = (game) => (peekMilitary(game)?.company?.personnel || []).filter((p) => p.status !== 'dead').length;
export const bedsFree = (game) => Math.max(0, capacity(game).beds - headcount(game));
export const ofRole = (game, role) => (peekMilitary(game)?.company?.personnel || []).filter((p) => p.role === role && p.status === 'active');
/** Guards and technicians not on a post. */
export const idle = (game, role) => ofRole(game, role).filter((p) => !p.post && p.assignedTo == null);

function barracks(game) {
  const C = peekMilitary(game)?.company;
  return (C?.facilities || []).find((f) => f.state === 'built' && /^barracks|^bunkhouse$/.test(f.id))?.id || null;
}

export function hire(game, role) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const P = PEOPLE[role];
  if (!P) return { ok: false, text: 'No such job.' };
  if (!C.licensed) return { ok: false, text: 'A private security company needs its licence before it employs anyone.' };
  if (bedsFree(game) < 1) return { ok: false, text: capacity(game).beds ? `Every bed is taken (${headcount(game)} of ${capacity(game).beds}).` : 'Build the bunkhouse first: there is nowhere for anyone to sleep.' };
  const id = nextId(C, 'P');
  const N = game.content.arms.staffNames;
  const key = `${game.world.salt || game.rng?.state || 0}|${id}`;
  const name = `${N.first[Math.floor(unit(`${key}|f`) * N.first.length)]} ${N.last[Math.floor(unit(`${key}|l`) * N.last.length)]}`;
  C.personnel.push({ id, name, role, wage: P.wage, status: 'active', hired: game.clock.day, location: `facility:${barracks(game)}`, assignedTo: null, post: null });
  return { ok: true, text: `${name} joins as a ${P.name.toLowerCase()} (${P.wage} obols a day).`, id };
}

export function dismiss(game, id) {
  const C = peekMilitary(game)?.company;
  const p = C?.personnel.find((x) => x.id === id);
  if (!p) return { ok: false, text: 'No such person.' };
  if (p.post || p.assignedTo != null) return { ok: false, text: `${p.name} is on a post: finish the job first.` };
  C.personnel = C.personnel.filter((x) => x !== p);
  return { ok: true, text: `${p.name} is let go.` };
}

/** One day's wages for everyone, from the company's own account; whatever it cannot cover is owed. */
export function payroll(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.personnel.length) return 0;
  const total = C.personnel.filter((p) => p.status !== 'dead').reduce((a, p) => a + p.wage, 0);
  if (total > 0) game.corp.pay('security', total, { cat: 'wages', owe: true, quiet: true });
  return total;
}
