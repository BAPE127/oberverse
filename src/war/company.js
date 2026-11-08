// The player's war company (v0.98.0, stage 3): its identity, its own money, its licence and its ground.
//
//   found(game, rawName)      register the company (a name through the same rules as every company's: validateName); costs nothing but starts the record
//   fund(game, amount)        the owner pays money in: out of the wallet, into the company's own account (game.corp 'security') — the one way money crosses
//   take(game, amount)        the owner takes money out (never while it owes)
//   pay(game, amount, note, cat)   what the company buys, paid from its OWN account only (never the wallet); refused when it cannot cover it
//   buyLicence / buyLot       the Civic Office's licence and Hollowmoor Lot: paid by the company, the lot only once licensed; the fence and gate join the damage gate
//   view(game)                what the Military app shows
// v0.103.7: its money is whoever's it is assigned to, as for the other companies: your wallet (the default), the group's cash (the parent company) or an account of its own (`setFunding`).
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
  // v0.103.7: like every other company it spends your wallet until you choose otherwise (see setFunding); nothing is forced into an account of its own
  return { ok: true, text: `${v.name} is registered. It spends your wallet unless you give it money of its own or assign it to your group. Next: the Civic Office's licence and the lot at Hollowmoor.` };
}

export function rename(game, rawName) {
  const C = peekMilitary(game)?.company;
  if (!C?.identity) return { ok: false, text: 'You have no company.' };
  const v = validateName(rawName, taken(game, C.identity.name));
  if (!v.ok) return { ok: false, text: v.error };
  if (v.name !== C.identity.name) { C.identity.name = v.name; C.identity.names.push({ day: game.clock.day, name: v.name }); }
  return { ok: true, text: `The company is ${v.name}.` };
}

/** What the company can spend now, by whoever's money it is: your wallet, the group's cash, or its own account (src/systems/corporate.js `payer`, `cashOf`). */
export const cash = (game) => (founded(game) ? game.corp.cashOf(ACCOUNT) : 0);

/** How the company is funded: 'wallet' (it spends yours, the default), 'group' (the parent company's cash) or 'own' (an account of its own that you pay into). */
export function fundingMode(game) {
  const C = peekMilitary(game)?.company; if (!C?.identity) return 'wallet';
  if (C.funding === 'group' && game.corp.group.parent) return 'group';
  return game.corp.account(ACCOUNT).funded ? 'own' : 'wallet';
}

export function fund(game, amount) {
  if (!founded(game)) return { ok: false, text: 'Register the company first.' };
  if (fundingMode(game) === 'group') return { ok: false, text: 'The company is assigned to the group: it spends the parent company\'s cash. Pay money into the parent instead.' };
  return game.corp.contribute(ACCOUNT, amount, 'Capital for the security company');
}

export function take(game, amount) {
  if (!founded(game)) return { ok: false, text: 'Register the company first.' };
  return game.corp.distribute(ACCOUNT, amount, 'Taken out of the security company');
}

/**
 * Choose whose money the company uses (v0.103.7), as for the other companies: 'wallet' (yours: the default), 'group' (the parent company's, once you have one) or 'own' (a separate account
 * you pay into and take out of). Moving off an account of its own returns what it holds to your wallet; nothing is created or lost either way.
 */
export function setFunding(game, mode) {
  const C = peekMilitary(game)?.company; if (!C?.identity) return { ok: false, text: 'Register the company first.' };
  if (!['wallet', 'group', 'own'].includes(mode)) return { ok: false, text: 'No such way to fund the company.' };
  if (mode === fundingMode(game)) return { ok: true, text: 'It is funded that way already.' };
  const a = game.corp.account(ACCOUNT);
  if (mode === 'group') {
    if (!game.corp.group.parent) return { ok: false, text: 'You have no group yet: found the parent company first.' };
    if (a.funded) { const r = game.corp.unfund(ACCOUNT); if (!r.ok) return r; }
    C.funding = 'group'; C.ownAccount = false;
    return { ok: true, text: 'The company now spends and earns through the group\'s cash (the parent company).' };
  }
  C.funding = 'wallet';
  if (mode === 'wallet') {
    if (a.funded) { const r = game.corp.unfund(ACCOUNT); if (!r.ok) return r; }
    C.ownAccount = false;
    return { ok: true, text: 'The company spends and earns through your wallet again.' };
  }
  a.funded = true; C.ownAccount = true; // an account of its own, starting at nothing: pay money in
  return { ok: true, text: 'The company has an account of its own, starting at nothing. Pay money in.' };
}

/** Old saves: a company registered before v0.103.7 was given an account of its own at zero. If it never held anything, it goes back to spending the wallet like the others. */
export function settleFunding(game) {
  const C = peekMilitary(game)?.company; if (!C?.identity || C.ownAccount) return;
  const a = game.corp.account(ACCOUNT);
  if (a.funded && a.cash === 0 && a.arrears === 0 && Math.round(a.contributed - a.distributed + (a.inKind || 0)) === 0 && !(C.funding === 'group')) game.corp.unfund(ACCOUNT);
  else if (a.funded && a.cash > 0) C.ownAccount = true; // (it holds money: it stays its own account until the owner moves it)
}

/**
 * A bill that must be met (wages, a fine). From an account of its own, or the group's, it is paid as every funded company pays: what it has, the rest becoming arrears. From your wallet it is paid
 * from what you hold, never below nothing: the rest is carried as `owed` and paid first the next time (so a bill is never skipped and your wallet never goes negative).
 */
export function bill(game, amount, { cat = 'wages', quiet = true } = {}) {
  const C = peekMilitary(game)?.company; if (!C?.identity || !(amount > 0)) return false;
  if (fundingMode(game) !== 'wallet') return game.corp.pay(ACCOUNT, amount, { cat, owe: true, quiet });
  const due = Math.round(amount) + (C.owed || 0); const now = Math.min(due, Math.max(0, Math.floor(game.corp.cashOf(ACCOUNT))));
  if (now > 0) game.corp.pay(ACCOUNT, now, { cat, quiet });
  C.owed = due - now;
  if (C.owed > 0) game.notify?.(`⚠ ${C.identity.name} could not cover ${fmt(C.owed)} obols from your wallet and now owes them.`, 'warn');
  return now > 0;
}

/** The company pays from whoever's money it is (wallet, group or its own account). Returns { ok, text }. */
export function pay(game, amount, note = 'Purchase', cat = 'facility') {
  if (!founded(game)) return { ok: false, text: 'You have no company.' };
  amount = Math.round(amount);
  if (!(amount >= 0)) return { ok: false, text: 'That is not an amount.' };
  if (!game.corp.canAfford(ACCOUNT, amount)) {
    const mode = fundingMode(game); const have = game.corp.cashOf(ACCOUNT);
    return { ok: false, text: `${mode === 'wallet' ? 'You hold' : mode === 'group' ? 'The group holds' : `${peekMilitary(game).company.identity.name} holds`} ${fmt(have)} obols; this needs ${fmt(amount)}.${mode === 'own' ? ' Pay money in from Command Overview.' : ''}` };
  }
  game.corp.pay(ACCOUNT, amount, { cat });
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
  return { name: C.identity.name, founded: C.identity.founded, licensed: C.licensed, lotOwned: C.lot.owned, cash: game.corp.cashOf(ACCOUNT), funded: a.funded, mode: fundingMode(game), hasGroup: Boolean(game.corp.group.parent), ownCash: a.funded ? a.cash : 0, arrears: a.arrears + (C.owed || 0), contributed: a.contributed, distributed: a.distributed,
    people: C.personnel.length, squads: C.squads.length, items: C.equipment.length, log: C.log.slice(-8) };
}
