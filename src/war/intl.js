// International contracts (v0.103.10; src/content/navy.js INTL): the embassies' offers. A country that is fighting in a hot theatre and whose relation with Sund is warm enough offers work: take a named
// province, hold one, or blockade a port. An offer states what it asks (soldiers and a tank for a ground job, warships for a blockade) and the check is made against the battalions and fleets you name, which
// must really be yours and free. An accepted contract REPLACES the retainer for the units on it (they are paid at the contract's rate, a little above the plain one for a warm country), and finishing it pays a
// completion bonus at the victory-point rate; ground named in a contract pays that bonus instead of the plain capture bonus, never both. Failing costs standing with the clients. Diplomacy is only read:
// nothing here starts a war, ends one, or lays an embargo.
//
//   offers(game)                              the open offers (refreshed every few days from the day's relations)
//   acceptContract(game, id, { battalions, fleets })      enlists with the client if needed, then puts the units on the contract
//   abandon(game, id)                         give it up (counts as failing)
//   intlView(game)                            everything the screen shows
// Saved: war.intl = { offers:[…], active:[{ id, client, enemy, theatre, kind, target, size, start, end, rate, bonus, need, progress, battalions, fleets }], done:[…last ten], seen }
import { peekMilitary } from './state.js';
import { warOf, controllerOf, countryName, nextId, note, theatres, theatreOf, inTheatre, providedBy, enlist, unit } from './strategic.js';
import { provinces, provinceById } from '../world/provinces.js';
import { INTL } from '../content/navy.js';
import { RETAINER } from '../content/strategic.js';
import { hooks } from './hooks.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const vpOf = (p) => Math.max(1, p.vp || 0);
const sizeOf = (kind, p) => clamp(1 + (kind === 'blockade' ? ((p.fort || 0) >= 2) + ((p.fort || 0) >= 4) : (vpOf(p) >= 2) + (vpOf(p) >= 4)), 1, 3);

/** The relations with Sund, peeked from the diplomacy record (never written, and never made: asking must not start the politics' own state or move its dice). Empty until diplomacy has started. */
function relations(game) {
  const d = game.politics?.peek?.()?.diplomacy; if (!d?.relations) return {};
  return Object.fromEntries(Object.entries(d.relations).map(([id, r]) => [id, { id, score: r.score, ambassador: null }]));
}
const reqOf = (kind, size) => {
  const K = INTL.kinds[kind];
  if (kind === 'blockade') return { warships: K.ships * size };
  return { people: K.people * size, tank: size >= K.hulls.from ? K.hulls.tank : 0 };
};
const needDays = (kind, days) => (kind === 'take' ? 0 : Math.ceil(days * 0.6));

/** Is a named target still what the offer says it is? */
function targetOk(game, c) {
  const p = provinceById(c.target); if (!p) return false;
  if (c.kind === 'take') return controllerOf(game, p) === c.enemy;
  if (c.kind === 'hold') return controllerOf(game, p) === c.client;
  return controllerOf(game, p) === c.enemy && p.coast;
}

function candidates(game, th, client, enemy, kind) {
  const P = provinces(); const inT = inTheatre(th); const ctl = (p) => controllerOf(game, p);
  const list = P.filter((p) => inT(p) && (kind === 'hold' ? ctl(p) === client && p.neighbours.some((n) => ctl(P[n]) === enemy) : kind === 'take' ? ctl(p) === enemy && p.neighbours.some((n) => ctl(P[n]) === client) : ctl(p) === enemy && p.coast));
  const good = list.filter((p) => (kind === 'blockade' ? true : p.vp > 0)); return (good.length ? good : list).sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function refreshOffers(game, force = false) {
  const w = warOf(game); if (!w) return; const day = game.clock.day; const I = w.intl;
  if (!force && I.seen !== null && day - I.seen < INTL.refreshDays) { I.offers = I.offers.filter((o) => o.expires >= day); return; }
  I.seen = day; const R = relations(game); const out = []; const bucket = Math.floor(day / INTL.refreshDays);
  for (const th of theatres(game).filter((t) => t.hot)) for (const client of th.between) {
    const rel = R[client]; if (!rel || rel.score < INTL.minScore) continue; const enemy = th.between.find((c) => c !== client);
    for (const kind of Object.keys(INTL.kinds)) {
      const cand = candidates(game, th, client, enemy, kind); if (!cand.length) continue;
      const p = cand[Math.floor(unit(`intl|${th.id}|${client}|${kind}|${bucket}`) * cand.length)]; const size = sizeOf(kind, p); const K = INTL.kinds[kind];
      const days = K.days[0] + K.days[1] * size; const mix = clamp((rel.score - INTL.minScore) / (100 - INTL.minScore), 0, 1);
      out.push({ id: null, client, enemy, theatre: th.id, kind, target: p.id, size, days, rate: Math.round((INTL.rate[0] + (INTL.rate[1] - INTL.rate[0]) * mix) * 100) / 100, bonus: vpOf(p) * RETAINER.perVP, req: reqOf(kind, size), expires: day + INTL.offerDays, score: rel.score, ambassador: rel.ambassador || null });
    }
  }
  out.sort((a, b) => b.score - a.score || (a.target < b.target ? -1 : 1)); I.offers = out.slice(0, INTL.max).map((o) => ({ ...o, id: nextId(w, 'K') }));
}
export const offers = (game) => { refreshOffers(game); return warOf(game)?.intl.offers || []; };

/** What the units named bring against what an offer asks: a list of the shortfalls (empty means it fits). */
export function shortfalls(game, offer, battalions, fleets) {
  const w = warOf(game); const out = [];
  if (offer.kind === 'blockade') {
    const fl = (fleets || []).map((id) => w.fleets.find((f) => f.id === id)).filter(Boolean); if (!fl.length) return ['name a fleet'];
    let n = 0; for (const f of fl) for (const id of f.ships) { const v = game.logistics?.vessel?.(id); if (v && v.kind === 'warship' && v.status !== 'lost') n++; }
    if (n < offer.req.warships) out.push(`${offer.req.warships - n} more warship${offer.req.warships - n === 1 ? '' : 's'} (${offer.req.warships} needed, ${n} in the fleets named)`);
    return out;
  }
  const bs = (battalions || []).map((id) => w.battalions.find((b) => b.id === id)).filter(Boolean); if (!bs.length) return ['name a battalion'];
  const P = bs.reduce((a, b) => { const q = providedBy(game, b.squads); a.people += q.people; a.tank += q.cls.tank || 0; return a; }, { people: 0, tank: 0 });
  if (P.people < offer.req.people) out.push(`${offer.req.people - P.people} more soldiers (${offer.req.people} needed, ${P.people} in the battalions named)`);
  if (P.tank < offer.req.tank) out.push(`${offer.req.tank - P.tank} more tank${offer.req.tank - P.tank === 1 ? '' : 's'}`);
  return out;
}

export function acceptContract(game, id, { battalions = [], fleets = [] } = {}) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity) return { ok: false, text: 'You have no company.' };
  refreshOffers(game); const o = w.intl.offers.find((x) => x.id === id); if (!o) return { ok: false, text: 'That offer has been withdrawn.' };
  if (w.intl.active.length >= 3) return { ok: false, text: 'Three contracts at a time is the most a company can honour.' };
  if (w.employer && (w.employer.side !== o.client || w.employer.theatre !== o.theatre)) return { ok: false, text: `You serve ${countryName(w.employer.side)} in ${theatreOf(game, w.employer.theatre)?.name}: a contract is for the side you serve.` };
  const bs = battalions.map((b) => w.battalions.find((x) => x.id === b)); const fl = fleets.map((f) => w.fleets.find((x) => x.id === f));
  if (bs.some((b) => !b) || fl.some((f) => !f)) return { ok: false, text: 'Name only battalions and fleets that are yours.' };
  const used = [...bs.filter((b) => b.contract), ...fl.filter((f) => f.contract)]; if (used.length) return { ok: false, text: `${used[0].name} is already on a contract.` };
  const probe = { ...o }; if (!targetOk(game, probe)) return { ok: false, text: 'The ground has changed hands since the offer was made.' };
  const miss = shortfalls(game, o, battalions, fleets); if (miss.length) return { ok: false, text: `The ${INTL.kinds[o.kind].name.toLowerCase()} asks for ${miss.join('; ')}. Nothing is invented to make up the difference.` };
  if (!w.employer) { const r = enlist(game, { theatre: o.theatre, side: o.client }); if (!r.ok) return r; }
  const c = { id: o.id, client: o.client, enemy: o.enemy, theatre: o.theatre, kind: o.kind, target: o.target, size: o.size, start: game.clock.day, end: game.clock.day + o.days, rate: o.rate, bonus: o.bonus, need: needDays(o.kind, o.days), progress: 0, battalions: [...battalions], fleets: [...fleets] };
  w.intl.offers = w.intl.offers.filter((x) => x !== o); w.intl.active.push(c); for (const b of bs) b.contract = c.id; for (const f of fl) f.contract = c.id;
  const p = provinceById(c.target); note(w, game, `Contract with ${countryName(c.client)}: ${INTL.kinds[c.kind].name.toLowerCase()} (${p.name}), ${o.days} days, paid at ${c.rate}× the retainer and ${c.bonus.toLocaleString('en-US')} on completion.`);
  return { ok: true, text: `You take the contract: ${INTL.kinds[c.kind].name.toLowerCase()} — ${p.name}, ${o.days} days.`, id: c.id };
}

const unlink = (w, c) => { for (const b of w.battalions) if (b.contract === c.id) delete b.contract; for (const f of w.fleets) if (f.contract === c.id) delete f.contract; };
function close(game, w, c, how) {
  const C = peekMilitary(game)?.company; const rep = (C.rep ||= { score: 0, done: 0, failed: 0, clients: {}, ban: {} }); const p = provinceById(c.target);
  w.intl.active = w.intl.active.filter((x) => x !== c); unlink(w, c);
  if (how === 'done') {
    game.corp.receive('security', c.bonus, { cat: 'contract' }); rep.score += INTL.rep.done; rep.done = (rep.done || 0) + 1; w.paid = (w.paid || 0) + c.bonus;
    note(w, game, `Contract done for ${countryName(c.client)}: ${INTL.kinds[c.kind].name.toLowerCase()} at ${p.name}. ${c.bonus.toLocaleString('en-US')} paid.`); game.notify?.(`Contract done: ${p.name}. ${c.bonus.toLocaleString('en-US')} obols.`, 'good');
  } else if (how === 'failed') {
    rep.score = Math.max(0, rep.score - INTL.rep.failed); rep.failed = (rep.failed || 0) + 1; note(w, game, `Contract failed for ${countryName(c.client)}: ${INTL.kinds[c.kind].name.toLowerCase()} at ${p.name}.`); game.notify?.(`Contract failed: ${p.name}.`, 'warn');
  } else note(w, game, how === 'void' ? `Contract with ${countryName(c.client)} lapses: ${p.name} changed hands without you; nothing is owed either way.` : `Contract with ${countryName(c.client)} ends with the employer's collapse (${p.name}); nothing is owed either way.`);
  w.intl.done.unshift({ id: c.id, client: c.client, kind: c.kind, target: c.target, result: how, day: game.clock.day }); w.intl.done.length = Math.min(w.intl.done.length, 10);
}
export function abandon(game, id) {
  const w = warOf(game); const c = w?.intl.active.find((x) => x.id === id); if (!c) return { ok: false, text: 'No such contract.' };
  close(game, w, c, 'failed'); return { ok: true, text: 'You walk away from the contract. The clients remember.' };
}

hooks.intlTaken = (game, bn, prov) => {
  const w = warOf(game); const c = w?.intl.active.find((x) => x.kind === 'take' && x.target === prov.id); if (!c) return false;
  close(game, w, c, 'done'); return true;
};
/** Once a day: progress, completion, expiry. */
hooks.intlDay = (game, w) => {
  const day = game.clock.day;
  for (const c of [...w.intl.active]) {
    if (!w.employer || w.employer.side !== c.client) { close(game, w, c, 'collapsed'); continue; }
    c.battalions = c.battalions.filter((id) => w.battalions.some((b) => b.id === id)); c.fleets = c.fleets.filter((id) => w.fleets.some((f) => f.id === id));
    if (c.kind !== 'blockade' && !c.battalions.length) { close(game, w, c, 'failed'); continue; }
    if (c.kind === 'hold') { if (controllerOf(game, provinceById(c.target)) !== c.client) { close(game, w, c, 'failed'); continue; } if (c.battalions.some((id) => { const b = w.battalions.find((x) => x.id === id); return b.status === 'theatre' && b.pos === c.target; })) c.progress++; }
    else if (c.kind === 'blockade') { if ((w.navy.blockade[c.target] || 0) >= day) c.progress++; }
    else if (controllerOf(game, provinceById(c.target)) === c.client) { close(game, w, c, 'void'); continue; } // taken some other way (by the client's own army): nothing was earned, and nothing is owed
    if (c.kind !== 'take' && c.progress >= c.need) { close(game, w, c, 'done'); continue; }
    if (day > c.end) close(game, w, c, 'failed');
  }
  refreshOffers(game);
};

export function intlView(game) {
  const w = warOf(game); const C = peekMilitary(game)?.company; if (!w || !C?.identity) return null;
  refreshOffers(game);
  const nm = (id) => provinceById(id)?.name || id; const free = { battalions: w.battalions.filter((b) => !b.contract).map((b) => ({ id: b.id, name: b.name, status: b.status })), fleets: w.fleets.filter((f) => !f.contract).map((f) => ({ id: f.id, name: f.name, status: f.status })) };
  const row = (c, active) => ({ ...c, kindName: INTL.kinds[c.kind].name, text: INTL.kinds[c.kind].text, targetName: nm(c.target), clientName: countryName(c.client), enemyName: countryName(c.enemy), theatreName: theatreOf(game, c.theatre)?.name, daysLeft: active ? Math.max(0, c.end - game.clock.day + 1) : Math.max(0, c.expires - game.clock.day + 1), targetOk: targetOk(game, c) });
  return { offers: w.intl.offers.map((o) => row(o, false)), active: w.intl.active.map((c) => row(c, true)), done: w.intl.done.map((d) => ({ ...d, targetName: nm(d.target), clientName: countryName(d.client), kindName: INTL.kinds[d.kind].name })), free, rep: C.rep || null, kinds: INTL.kinds };
}
