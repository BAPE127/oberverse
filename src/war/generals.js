// Generals (v0.100.0 stage 9): people you hire to fight an engagement for you. Each has real differences (src/content/generals.js). They need the command post: it has a desk for five of
// them per ten desks. A general is paid a fee every day they are on the books, home or away; they are drawn as bodies at the command post when home (src/war/bodies.js).
import { peekMilitary } from './state.js';
import { capacity } from './facilities.js';
import { nextId } from './equipment.js';
import { GENERALS, GENERAL_SEATS } from '../content/generals.js';

export const seats = (game) => Math.floor(capacity(game, 'command').desks / GENERAL_SEATS.perDesks);
export const hired = (game) => peekMilitary(game)?.company?.generals || [];

export function hire(game, gid) {
  const C = peekMilitary(game)?.company;
  const G = GENERALS[gid];
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  if (!G) return { ok: false, text: 'No such general.' };
  if (!C.licensed) return { ok: false, text: 'A company needs its licence before it takes on a general.' };
  if (C.generals.some((x) => x.gen === gid)) return { ok: false, text: `${G.name} already works for you.` };
  if (C.generals.length >= seats(game)) return { ok: false, text: seats(game) ? `The command post has desks for ${seats(game)} general${seats(game) === 1 ? '' : 's'}, and they are taken.` : 'A general needs the command post: build it first.' };
  C.generals.push({ id: nextId(C, 'G'), gen: gid, name: G.name, fee: G.fee, hired: game.clock.day, wins: 0, losses: 0, status: 'home' });
  return { ok: true, text: `${G.name} joins the company (${G.fee.toLocaleString('en-US')} obols a day).` };
}

export function dismiss(game, id) {
  const C = peekMilitary(game)?.company;
  const g = C?.generals.find((x) => x.id === id);
  if (!g) return { ok: false, text: 'No such general.' };
  if (g.status !== 'home') return { ok: false, text: `${g.name} is away with a force: wait for the engagement to end.` };
  C.generals = C.generals.filter((x) => x !== g);
  return { ok: true, text: `${g.name} leaves.` };
}

export const fees = (game) => hired(game).reduce((a, g) => a + g.fee, 0);

export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  return { seats: seats(game), hired: C.generals.map((g) => ({ ...g, ...GENERALS[g.gen] , id: g.id, fee: g.fee, status: g.status })), pool: Object.values(GENERALS).filter((x) => !C.generals.some((g) => g.gen === x.id)) };
}
