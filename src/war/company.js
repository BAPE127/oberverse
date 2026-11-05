// The player's war company (v0.98.0, stage 3): its identity, its own money, its licence and its ground.
//
//   found(game, rawName)      register the company (a name through the same rules as every company's: validateName); costs nothing but starts the record
//   fund(game, amount)        the owner pays money in: out of the wallet, into the company's own account (game.corp 'security') — the one way money crosses
//   take(game, amount)        the owner takes money out (never while it owes)
//   pay(game, amount, note)   what the company buys, paid from its OWN account only (never the wallet); refused when it cannot cover it
//   buyLicence / buyLot       the Civic Office's licence and Hollowmoor Lot: paid by the company, the lot only once licensed; the fence and gate join the damage gate
//   view(game)                what the Military app shows
// The company is not one of the player's four businesses (COMPANY_IDS): it has an account in the corporate ledger (ACCOUNT_IDS) so its cash reconciles like theirs, and the
// government's treasury (`gov`) is another thing entirely: nothing here ever reads or writes it (tests/war_company.test.mjs scans for that).
import { ensureMilitary, peekMilitary, freshCompany } from './state.js';
import { register } from './damage.js';
import { LOT } from '../content/facilities.js';
import { validateName } from '../corp/identity.js';

export const ACCOUNT = 'security';
const fmt = (n) => Math.round(n).toLocaleString('en-US');

export const founded = (game) => Boolean(peekMilitary(game)?.company?.identity);
export const licensed = (game) => Boolean(peekMilitary(game)?.company?.licensed);

/** Every name already in use apart from this company's own (the one rule for naming: the same as a business's). */
const taken = (game, own) => game.corp.takenNames().filter((n) => String(n).toLowerCase() !== String(own || '').toLowerCase());

export function found(game, rawName) {
  const m = ensureMilitary(game);
  if (m.company?.identity) return { ok: false, text: `${m.company.identity.name} is already registered.` };
  const v = validateName(rawName, taken(game));
  if (!v.ok) return { ok: false, text: v.error };
  m.company = m.company || freshCompany();
  m.company.identity = { name: v.name, founded: game.clock.day, names: [{ day: game.clock.day, name: v.name }] };
  m.company.log.push({ day: game.clock.day, text: `${v.name} registered as a private security company.` });
  m.log.push({ day: game.clock.day, text: `${v.name} registered.` });
  game.corp.account(ACCOUNT);
  return { ok: true, text: `${v.name} is registered. Pay money in, then buy the Civic Office's licence and the lot at Hollowmoor.` };
}

export function rename(game, rawName) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const v = validateName(rawName, taken(game, C.identity.name));
  if (!v.ok) return { ok: false, text: v.error };
  if (v.name !== C.identity.name) { C.identity.name = v.name; C.identity.names.push({ day: game.clock.day, name: v.name }); }
  return { ok: true, text: `The company is ${v.name}.` };
}

export const cash = (game) => (founded(game) ? game.corp.account(ACCOUNT).cash : 0);

export function fund(game, amount) {
  if (!founded(game)) return { ok: false, text: 'Register the company first.' };
  return game.corp.contribute(ACCOUNT, amount, 'Capital for the security company');
}

export function take(game, amount) {
  if (!founded(game)) return { ok: false, text: 'Register the company first.' };
  return game.corp.distribute(ACCOUNT, amount, 'Taken out of the security company');
}

/** The company pays from its own account alone: never the wallet. Returns { ok, text }. */
export function pay(game, amount, note = 'Purchase') {
  if (!founded(game)) return { ok: false, text: 'You have no company.' };
  amount = Math.round(amount);
  if (!(amount >= 0)) return { ok: false, text: 'That is not an amount.' };
  const a = game.corp.account(ACCOUNT);
  if (!a.funded || a.cash < amount) return { ok: false, text: `${peekMilitary(game).company.identity.name} holds ${fmt(a.funded ? a.cash : 0)} obols; this needs ${fmt(amount)}. Pay money in from the Military app.` };
  game.corp.pay(ACCOUNT, amount, { cat: 'facility' });
  return { ok: true, note };
}

export function buyLicence(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'Register the company first.' };
  if (C.licensed) return { ok: false, text: 'The company is already licensed.' };
  const r = pay(game, LOT.licence, 'Civic Office licence');
  if (!r.ok) return r;
  C.licensed = true;
  C.log.push({ day: game.clock.day, text: `The Civic Office licensed the company (${LOT.licence} obols).` });
  return { ok: true, text: `Licensed as a private security company (${fmt(LOT.licence)} obols).` };
}

export function buyLot(game) {
  const m = peekMilitary(game);
  const C = m?.company;
  if (!C?.identity) return { ok: false, text: 'Register the company first.' };
  if (!C.licensed) return { ok: false, text: 'The Land Registry sells to licensed companies only: buy the licence first.' };
  if (C.lot.owned) return { ok: false, text: 'The company already owns Hollowmoor Lot.' };
  const r = pay(game, LOT.price, 'Hollowmoor Lot');
  if (!r.ok) return r;
  C.lot = { owned: true, day: game.clock.day, price: LOT.price };
  register(game, 'hm_fence', { owner: 'company', core: true, hp: LOT.fenceHp, name: 'Hollowmoor fence' });
  register(game, 'hm_gate', { owner: 'company', core: true, hp: LOT.gateHp, name: 'Hollowmoor gate' });
  C.log.push({ day: game.clock.day, text: `Bought Hollowmoor Lot (${LOT.price} obols).` });
  game.bus.emit('war:lot', { day: game.clock.day });
  return { ok: true, text: `Hollowmoor Lot is yours (${fmt(LOT.price)} obols). Mason's Os can start on the site office.` };
}

/** What the app shows: null when there is no company. */
export function view(game) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return null;
  const a = game.corp.account(ACCOUNT);
  return { name: C.identity.name, founded: C.identity.founded, licensed: C.licensed, lotOwned: C.lot.owned, cash: a.funded ? a.cash : 0, funded: a.funded, arrears: a.arrears, contributed: a.contributed, distributed: a.distributed,
    people: C.personnel.length, squads: C.squads.length, items: C.equipment.length, log: C.log.slice(-8) };
}
