// Early contracts (v0.99.0 stage 6): offers turn up by hash (no dice drawn), expire with a reason, and are taken by guards with a pistol each and a radio. The pay arrives only when the job
// ends well, into the company's own account; a failure costs money owed (arrears, never your wallet), reputation and a client. A new company completes one with guards and pistols alone.
//
//   dayTick(game)        offers appear and lapse; jobs that reach their last day are resolved (idempotent per day)
//   accept(game, id)     guards go on the post and the kit is reserved; `check(game, id)` says what is missing without changing anything
//   decline(game, id)    turn an offer down
//   view(game)           what the Contracts page shows
import { peekMilitary } from './state.js';
import { nextId } from './equipment.js';
import { idle } from './people.js';
import { CLIENTS, KINDS, RISK, CONTRACTS as K } from '../content/contracts.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const salt = (game) => String(game.world.salt || game.rng?.state || 0);
const pick = (arr, u) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];
const between = ([a, b], u) => a + Math.floor(u * (b - a + 1));

function ensure(C) { C.rep ||= { score: 0, done: 0, failed: 0, clients: {}, ban: {} }; C.contracts ||= []; return C.rep; }
export const reputation = (game) => peekMilitary(game)?.company?.rep?.score || 0;
const maxOpen = (rep) => Math.min(K.maxOpen, K.open + Math.floor(Math.max(0, rep) / K.perRep));

/** Pistols and radios in the stores: the keys they sit under. */
function kitKeys(C) {
  const pistols = Object.keys(C.stock).filter((k) => /^arms:[^:]+:item_pistol$/.test(k)).sort();
  return { pistols, radio: 'supply:radio' };
}
const pistolCount = (C) => kitKeys(C).pistols.reduce((a, k) => a + C.stock[k], 0);

/** What a job still needs the company does not have (an empty list = it can take it). */
export function missing(game, c) {
  const C = peekMilitary(game)?.company;
  const out = [];
  const guards = idle(game, 'guard').length;
  if (guards < c.guards) out.push(`${c.guards - guards} more guard${c.guards - guards === 1 ? '' : 's'}`);
  const p = pistolCount(C);
  if (p < c.guards) out.push(`${c.guards - p} more pistol${c.guards - p === 1 ? '' : 's'}`);
  if ((C.stock[kitKeys(C).radio] || 0) < K.radio) out.push('a radio');
  return out;
}

export function accept(game, id) {
  const C = peekMilitary(game)?.company;
  const c = C?.contracts?.find((x) => x.id === id);
  if (!c || c.state !== 'open') return { ok: false, text: 'That offer is no longer open.' };
  const lack = missing(game, c);
  if (lack.length) return { ok: false, text: `Your forces do not meet this one: you need ${lack.join(', ')}.` };
  // every check passed: now the changes
  const crew = idle(game, 'guard').slice(0, c.guards);
  for (const p of crew) p.post = `contract:${c.id}`;
  c.crew = crew.map((p) => p.id);
  c.kit = {};
  let need = c.guards;
  for (const key of kitKeys(C).pistols) { const t = Math.min(need, C.stock[key]); if (t > 0) { C.stock[key] -= t; if (!C.stock[key]) delete C.stock[key]; c.kit[key] = t; need -= t; } if (!need) break; }
  C.stock['supply:radio'] -= K.radio; if (!C.stock['supply:radio']) delete C.stock['supply:radio']; c.kit['supply:radio'] = K.radio;
  c.state = 'active'; c.start = game.clock.day; c.end = game.clock.day + c.days;
  C.log.push({ day: game.clock.day, text: `Took the job: ${c.title} for ${c.clientName}.` });
  return { ok: true, text: `${c.title}: ${c.guards} guards on the post for ${c.days} days.` };
}

export function decline(game, id) {
  const C = peekMilitary(game)?.company;
  const c = C?.contracts?.find((x) => x.id === id);
  if (!c || c.state !== 'open') return { ok: false, text: 'That offer is no longer open.' };
  c.state = 'declined'; c.ended = game.clock.day;
  return { ok: true, text: 'Turned down.' };
}

function release(game, C, c) {
  for (const p of C.personnel) if (c.crew?.includes(p.id) && p.post === `contract:${c.id}`) p.post = null;
  for (const [key, n] of Object.entries(c.kit || {})) C.stock[key] = (C.stock[key] || 0) + n; // the kit comes back, whatever happened
  c.kit = {};
}

/** The chance a job ends well: its risk, extra hands, and the company's name. */
export function chance(game, c) {
  const R = RISK[c.risk];
  const extra = Math.max(0, (c.crew?.length ?? c.guards) - c.needs);
  return Math.max(0.3, Math.min(0.97, R.success + extra * K.extraHand + Math.min(K.repBonusMax, Math.max(0, reputation(game)) * K.repBonus)));
}

/** Whether a job ends well: a hash of the game and the job against its chance (never a dice roll, so a reload cannot change it). */
export const outcome = (game, c) => unit(`${salt(game)}|resolve|${c.id}`) < chance(game, c);

function resolve(game, C, c) {
  const rep = ensure(C);
  const ok = outcome(game, c);
  release(game, C, c);
  c.ended = game.clock.day;
  const cl = (rep.clients[c.client] ||= { done: 0, failed: 0 });
  if (ok) {
    game.corp.receive('security', c.pay, { cat: 'contract' });
    rep.score += K.repWin; rep.done++; cl.done++; c.state = 'done';
    C.log.push({ day: game.clock.day, text: `${c.title}: done, ${c.pay} obols from ${c.clientName}.` });
    game.notify?.(`${c.title} ends well. ${c.clientName} pays ${c.pay.toLocaleString('en-US')} obols.`, 'good');
  } else {
    const fine = Math.round(c.pay * K.penalty);
    game.corp.pay('security', fine, { cat: 'penalty', owe: true });
    rep.score += K.repLose; rep.failed++; cl.failed++; c.state = 'failed'; c.fine = fine;
    rep.ban[c.client] = game.clock.day + K.ban;
    C.log.push({ day: game.clock.day, text: `${c.title}: it went wrong. ${c.clientName} wants ${fine} obols back and will not call for ${K.ban} days.` });
    game.notify?.(`${c.title} went wrong: a fine of ${fine.toLocaleString('en-US')} obols, and ${c.clientName} will look elsewhere for a while.`, 'warn');
  }
}

function offerOne(game, C, day) {
  const rep = ensure(C);
  const s = `${salt(game)}|offer|${day}`;
  const kind = pick(Object.keys(KINDS), unit(`${s}|kind`));
  const Kd = KINDS[kind];
  const clients = Kd.clients.filter((id) => (rep.ban[CLIENTS[id].name] || 0) <= day);
  if (!clients.length) return;
  const clientId = pick(clients, unit(`${s}|client`));
  const R = pick(Kd.risk, unit(`${s}|risk`));
  const needs = Math.min(between(Kd.guards, unit(`${s}|g`)) + (unit(`${s}|up`) < 0.3 ? Math.floor(Math.max(0, rep.score) / K.repGuards) : 0), 8);
  const days = between(Kd.days, unit(`${s}|d`));
  const pay = Math.round(needs * days * RISK[R].rate * (0.9 + 0.2 * unit(`${s}|pay`)) / 50) * 50;
  const client = CLIENTS[clientId];
  C.contracts.push({ id: nextId(C, 'K'), kind, title: Kd.title.replace('{place}', client.place), text: Kd.text, client: client.name, clientName: client.name, place: client.place, guards: needs, needs, days, risk: R, pay, state: 'open', offered: day, expires: day + between(K.lasts, unit(`${s}|exp`)) });
}

export function dayTick(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity || !C.licensed) return;
  const day = game.clock.day;
  C.days ||= {};
  if ((C.days.con || 0) >= day) return;
  C.days.con = day;
  const rep = ensure(C);
  for (const c of C.contracts) {
    if (c.state === 'open' && c.expires <= day) { c.state = 'expired'; c.ended = day; c.why = 'No one answered in time: the client hired someone else.'; }
    else if (c.state === 'active' && c.end <= day) resolve(game, C, c);
  }
  const open = C.contracts.filter((c) => c.state === 'open').length;
  if (open < maxOpen(rep.score) && unit(`${salt(game)}|con|${day}`) < K.chance) offerOne(game, C, day);
  // the record stays small: the oldest finished jobs drop off
  const ended = C.contracts.filter((c) => !['open', 'active'].includes(c.state));
  if (ended.length > K.kept) { const drop = new Set(ended.slice(0, ended.length - K.kept)); C.contracts = C.contracts.filter((c) => !drop.has(c)); }
}

export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  const rep = ensure(C);
  const row = (c) => ({ ...c, lacks: c.state === 'open' ? missing(game, c) : [], chance: c.state === 'open' ? null : undefined });
  return { reputation: rep.score, wins: rep.done, losses: rep.failed, clients: Object.entries(rep.clients).map(([name, v]) => ({ name, ...v, banned: (rep.ban[name] || 0) > game.clock.day })), maxOpen: maxOpen(rep.score),
    open: C.contracts.filter((c) => c.state === 'open').map(row), active: C.contracts.filter((c) => c.state === 'active').map((c) => ({ ...c, chance: chance(game, c), daysLeft: Math.max(0, c.end - game.clock.day) })),
    done: C.contracts.filter((c) => !['open', 'active'].includes(c.state)).slice().reverse() };
}
