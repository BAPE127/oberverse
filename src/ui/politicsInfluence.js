// The Campaign and Influence pages of the Politics app (v0.95.0), in the OberPad pattern: one hero, three tiles, a list, a fold.
// Campaign: the election (the date, the funds and what spending has bought, the debate, scandals, the last result) and public donations.
// Influence: your standing, who will see you and what it takes, and an offer shown plainly before any money moves (mock-up proposal-pol-oberpad-influence.png).
// Every button calls game.politics; nothing here decides anything.
import { h } from './panels.js';
import { hero, tiles, row, help, note, fold, buttons, big, n } from './tabletKit.js';
import { atlasStates } from '../world/atlas.js';
import { INFLUENCE as I } from '../content/influence.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const pc = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const pts = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}`;
const PHASE = { term: 'In term', campaign: 'Campaign season', polling: 'Polling day' };
const BAND = { low: 'low', medium: 'medium', high: 'good' };

export function campaignTab(ui, body, open) {
  const g = ui.game;
  const P = g.politics;
  const C = P.campaign();
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Politics'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const cal = C.calendar;
  const last = C.last;
  const head = cal.phase === 'term'
    ? { label: 'The next election', value: `${cal.daysToPolling} days`, sub: `Polling day is day ${cal.electionDay}; the campaign opens on day ${cal.electionFrom}. ${last ? `Last time: ${P.party(last.winner).name} won.` : 'No election has been held yet.'}` }
    : { label: cal.phase === 'polling' ? 'Polling day' : 'The campaign', value: cal.phase === 'polling' ? (C.pending ? 'Votes cast' : 'Today') : `${cal.daysToPolling} days to go`, sub: cal.phase === 'polling' ? 'The count is overnight. Results are announced at 22:00; on election night the leaders gather in Sovereign Square.' : `Polling day is day ${cal.electionDay}. The parties are spending what they have raised.` };
  body.append(
    hero(head),
    tiles(C.parties.map((p) => ({ n: n(p.funds), t: `${p.short} funds` })).concat([{ n: PHASE[C.phase], t: 'the political year' }])));
  body.append(list(...C.parties.map((p) => row({
    icon: p.id === C.governing ? '🏛️' : '🗣️', title: `${p.name} — ${p.leader}`,
    sub: `${C.phase === 'term' ? 'Raising funds.' : `Spent ${n(p.spent)} (ads ${n(p.byChannel.ads)}, rallies ${n(p.byChannel.rallies)}, organisers ${n(p.byChannel.ground)}) — worth ${pts(p.swing)} points.`} Promised: ${p.manifesto.map((m) => `${m.name}${m.kept == null ? '' : m.kept >= 1 ? ' ✓' : m.kept > 0 ? ' …' : ' ✗'}`).join(', ')}.${p.scandal > 0.05 ? ` A scandal weighs on them (${Math.round(p.scandal * 100)}%).` : ''}`,
    tag: p.id === C.governing ? 'in office' : 'opposition', tone: p.id === C.governing ? 'good' : '',
  }))));
  if (C.debate) body.append(list(row({ icon: '🎙️', title: 'The debate', sub: `Day ${C.debate.day}: ${P.party(C.debate.winner).name} were judged the winners.`, tag: 'held' })));
  if (last) {
    body.append(list(
      row({ icon: '🗳️', title: `Election ${last.id}: ${P.party(last.winner).name} won`, sub: `Order ${pc(last.national.order)} · Liberty ${pc(last.national.liberty)} · others ${pc(last.national.other)} · turnout ${pc(last.turnout)}. Seats: Order ${last.seats.order}, Liberty ${last.seats.liberty}, others ${last.seats.other}.`, tag: last.winner !== last.gov ? 'a change' : 'returned', tone: last.winner !== last.gov ? 'warn' : '' }),
      row({ icon: '⚖️', title: 'What decided it', sub: `Campaign ${pts(last.parts.campaign)} · scandals ${pts(last.parts.scandal)} · time in office ${pts(last.parts.fatigue)} · promises ${pts(last.parts.promises)} · chance ${pts(last.parts.chance)} points (positive favours Order).` })));
  }
  body.append(donations(ui, g, C, go));
  if (C.scandals.length) body.append(list(...C.scandals.map((s) => row({ icon: '📰', title: `${P.party(s.party).short}: ${s.text}`, sub: `Day ${s.day} · ${s.source === 'press' ? 'the press found it' : s.source === 'leak' ? 'a leak' : 'it came out in an inquiry'}${s.quieted ? ' · kept quieter' : ''}`, tag: `${Math.round(s.severity * s.credibility * s.attention * 100)}%` }))));
  body.append(help('How an election is decided', 'Opinion is the base: the parties\' support among nine kinds of voters in nine states, and how well the government is thought to be doing. On top of it: the campaign (money spent on advertising, rallies and organisers, with sharply diminishing returns, worked by the party\'s staff: a vacant role works at sixty per cent), the debate, scandals (severity × credibility × attention, fading), whether the government kept its manifesto, and how long it has been in office (governments wear out). A seeded swing in each state is fixed by the election\'s number, so reloading cannot change it. Money cannot buy a win: each channel has a ceiling.'));
  body.append(fold(ui, 'PoliticsElect', 'The results by state, and earlier elections ›', (box) => {
    if (!last) { box.append(list(row({ icon: '—', title: 'No election yet', sub: 'The first vote is on polling day of the first term.' }))); return; }
    const names = Object.fromEntries(atlasStates().map((x) => [x.id, x.name]));
    box.append(list(...C.history.map((e) => row({ icon: '🗳️', title: `Election ${e.id}, day ${e.day}`, sub: `${P.party(e.winner).name} won: Order ${pc(e.national.order)}, Liberty ${pc(e.national.liberty)} · seats ${e.seats.order}–${e.seats.liberty}–${e.seats.other} · turnout ${pc(e.turnout)}`, tag: e.winner === 'order' ? 'Order' : 'Liberty' }))));
    if (last.regions) box.append(list(...Object.entries(last.regions).map(([rid, r]) => row({ icon: '🗺️', title: names[rid] || rid.replace('sd_', '').replace(/_/g, ' '), sub: `Order ${pc(r.order)} · Liberty ${pc(r.liberty)} · others ${pc(r.other)} · turnout ${pc(r.turnout)}`, tag: r.order > r.liberty ? 'Order' : 'Liberty' }))));
    box.append(help('Notes', 'By-state results are kept for the latest vote; the national figures and seats for the last twelve.'));
  }));
}

/** Public donations: capped per donor per term; recorded; they buy support and a hearing, never a vote. */
function donations(ui, g, C, go) {
  const st = g.politics.standing();
  const D = I.donation;
  const amounts = [5000, 10000, 25000];
  return list(...C.parties.map((p) => [
    row({ icon: '💷', title: `Donate to ${p.name}`, sub: `Public and recorded. You have given ${n(st.donated[p.id])} of ${n(D.cap)} this term. It earns support and a hearing — never a vote.`, tag: `support ${Math.round(st.support[p.id])}` }),
    h('div', { class: 'tb-chips tb-sheet' }, ...amounts.map((a) => h('button', { class: 'tb-chip', disabled: g.player.money < a || st.donated[p.id] + a > D.cap, onclick: () => go(g.politics.donate(p.id, a)) }, n(a)))),
  ]));
}

// ------------------------------------------------------------------ Influence
export function influenceTab(ui, body, open) {
  const g = ui.game;
  const P = g.politics;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Politics'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  if (ui.polOffer) { offerScreen(ui, body, open, go); return; }
  const V = P.influence();
  const S = V.standing;
  body.append(
    hero({ label: 'Your standing', value: S.tier.label, tone: S.tier.id === 'unknown' ? '' : 'pos', sub: `Reputation ${S.rep} · support ${Math.round(S.support.order)} Order, ${Math.round(S.support.liberty)} Liberty · friendships ${S.relations.toFixed(0)} · exposure ${S.heat.toFixed(0)}${V.exposures ? ` · found out ${V.exposures}×` : ''}` }),
    tiles([{ n: n(g.player.money), t: 'your obols' }, { n: `${S.favours.order.toFixed(1)} · ${S.favours.liberty.toFixed(1)}`, t: 'favours (Order · Liberty)' }, { n: String(V.contacts.filter((c) => c.open).length), t: 'doors open' }]));
  for (const k of V.counters) body.append(list(row({ icon: '🤝', title: `${k.contactName}: a counter-offer`, sub: `${k.policyName ? `${k.policyName} — ` : ''}${k.illicit ? `${n(k.price)} obols` : `${k.favours} favours`}. Open until day ${k.until}.`, action: h('button', { class: 'tb-mini pri', onclick: () => go(P.acceptCounter(k.id)) }, 'Accept') })));
  body.append(list(...V.contacts.map((c) => row({
    icon: c.side === 'gov' ? '🏛️' : '🗣️', title: `${c.name}${c.side === 'opp' ? ' (opposition)' : ''}`,
    sub: c.open ? `${c.role}. Likes: ${c.likes} ${c.favoursLeft > 0 ? '' : 'Has no favours left this term.'}` : `${c.role}. Needs: ${c.needs}.`,
    tag: c.open ? 'Open' : 'Closed', tone: c.open ? 'good' : '',
    action: c.open ? h('button', { class: 'tb-mini pri', onclick: () => { ui.polOffer = { contact: c.key }; open('Politics'); } }, 'Ask ›') : null,
  }))));
  body.append(h('div', { class: 'tb-note' }, 'Money, reputation, relationships and support are separate things. Money alone does not open a door.'));
  body.append(help('How influence works', 'Four things are kept apart: the money you hold, your reputation, what each person thinks of you, and what you have given in the open. A door opens on a friendship, or on support together with a reputation. Lobbying costs favours (a donation earns them), not money, and a government will not take up what it stands against. An offer is a request with a price: you see the price, the odds and what happens if it is found out before any money moves; it is recorded whether it works or not; repeats cost more; an official has only so many favours to give in a term. Investigators find offers: the result is a scandal for them, a fine of twice the sum paid to the state, your reputation and the trust of those you dealt with. A donor\'s expectation is never a guarantee.'));
  body.append(fold(ui, 'PoliticsInfl', 'The record of what you have done ›', (box) => {
    box.append(list(...(V.ledger.length ? V.ledger.map((e) => row({ icon: e.kind === 'donation' ? '💷' : e.kind === 'meeting' ? '📅' : e.illicit ? '🕶️' : '📜', title: `Day ${e.day} · ${e.kind === 'donation' ? `donation to ${P.party(e.party).short}` : e.kind === 'meeting' ? `meeting with ${P.nameOf(P.contact(e.contact) || { role: '?' })}` : `${I.requests[e.request]?.name || e.request}${e.policy ? `: ${e.policy}` : ''}`}`, sub: `${e.amount ? `${n(e.amount)} obols · ` : ''}${e.outcome}${e.exposed ? ' · FOUND OUT' : ''}${e.public ? ' · public' : ''}` })) : [row({ icon: '—', title: 'Nothing yet', sub: 'Everything you do here is recorded.' })])));
    if (V.obligations.length) box.append(list(...V.obligations.map((o) => row({ icon: '⏳', title: `Your donation of ${n(o.amount)} to ${P.party(o.party).short}`, sub: `The party owes you a hearing; it decides by day ${o.due} whether it honours that.` }))));
  }));
}

/** An offer, plainly: the request, the price, the odds, what happens if found out; and two buttons. */
function offerScreen(ui, body, open, go) {
  const g = ui.game;
  const P = g.politics;
  const o = ui.polOffer;
  const V = P.influence();
  const c = V.contacts.find((x) => x.key === o.contact);
  const back = () => { ui.polOffer = null; open('Politics'); };
  if (!c) { back(); return; }
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: back }, '‹ Back')));
  if (!o.request) {
    body.append(hero({ label: c.role, value: c.name, sub: `Likes: ${c.likes}` }));
    body.append(list(...c.requests.map((r) => row({
      icon: r.id === 'meeting' ? '📅' : r.legit ? '📜' : '🕶️', title: r.name, sub: r.blurb,
      tag: r.id === 'meeting' ? 'free' : r.legit ? 'favours' : 'an offer',
      action: h('button', { class: 'tb-mini pri', onclick: () => { if (r.id === 'meeting') { go(P.askMeeting(c.key)); } else { ui.polOffer = { contact: c.key, request: r.id, illicit: !r.legit }; open('Politics'); } } }, r.id === 'meeting' ? 'Ask' : 'Choose ›'),
    }))));
    body.append(h('div', { class: 'tb-note' }, 'Money, reputation, relationships and support are separate things. Money alone does not open a door.'));
    return;
  }
  const r = I.requests[o.request];
  if (r.needsPolicy && !o.policy) {
    const pols = P.askable(c.key, o.request);
    body.append(hero({ label: r.name, value: c.name, sub: r.blurb }));
    body.append(list(...(pols.length ? pols.map((p) => row({ icon: '📜', title: p.name, sub: p.blurb, action: h('button', { class: 'tb-mini pri', onclick: () => { ui.polOffer = { ...o, policy: p.id }; open('Politics'); } }, 'Choose') })) : [row({ icon: '—', title: 'Nothing to ask for', sub: 'There is nothing on this subject that they could take up or delay.' })])));
    if (r.legit && r.illicit) body.append(h('div', { class: 'tb-btns' }, ...[['Ask openly (a favour)', false], ['Make an offer (a price)', true]].map(([l, ill]) => h('button', { class: `tb-mini${o.illicit === ill ? ' pri' : ''}`, onclick: () => { ui.polOffer = { ...o, illicit: ill }; open('Politics'); } }, l))));
    return;
  }
  const mode = r.legit && r.illicit ? o.illicit : !r.legit;
  const q = P.quote(c.key, o.request, { policy: o.policy, illicit: mode });
  body.append(hero({ label: `Offer to ${c.name}`, value: r.name, sub: `${o.policy ? `${q.policyName || o.policy}. ` : ''}${r.blurb}` }));
  if (r.legit && r.illicit) body.append(h('div', { class: 'tb-btns' }, ...[['Ask openly (a favour)', false], ['Make an offer (a price)', true]].map(([l, ill]) => h('button', { class: `tb-mini${mode === ill ? ' pri' : ''}`, onclick: () => { ui.polOffer = { ...o, illicit: ill }; open('Politics'); } }, l))));
  if (!q.ok) { body.append(h('div', { class: 'tb-note' }, q.text)); return; }
  body.append(h('div', { class: `tb-card ${mode ? 'warn' : ''}`, style: 'padding:12px' },
    h('b', {}, mode ? `You pay ${n(q.price)} from your own cash` : `It costs ${q.favours} favour${q.favours === 1 ? '' : 's'} with ${P.party(c.party).name}`),
    h('p', {}, `Odds: ${q.band} (${Math.round(q.p * 100)}% that they take it up)${q.repeats ? ` · repeats cost more (${q.repeats} before)` : ''}`),
    q.against ? h('p', {}, `${P.party(c.party).name} stand against this. They will almost certainly refuse.`) : null,
    mode ? h('p', {}, q.found, ' It is recorded whether it works or not.') : h('p', {}, 'Asked openly: no money moves, and nothing here can be found out.'),
    h('p', {}, 'Possible results: accepted · half done · delayed · refused · a counter-offer', mode ? ' · reported.' : '.')));
  body.append(buttons(big(mode ? 'Offer it' : 'Ask', () => { const res = P.offer(c.key, o.request, { policy: o.policy, illicit: mode }); ui.polOffer = null; go(res); }, 'pri', mode && g.player.money < q.price), big('Not now', back)));
  body.append(h('div', { class: 'tb-note' }, 'A possible result is not a promise: it is not a guaranteed purchase.'));
}
