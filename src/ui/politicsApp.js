// The Politics app (v0.93.0): who governs Sund, the term and the date of the vote, the opposition and where the two parties differ; the government (v0.94.0), the polls (v0.94.0),
// the election and campaign (v0.95.0, "Vote") and your influence (v0.95.0). Only the last two do anything: donations, meetings and offers. Follows the OberPad pattern: one hero, three tiles, a list, a fold.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, segments, note, n } from './tabletKit.js';
import { atlasStates } from '../world/atlas.js';
import { campaignTab, influenceTab } from './politicsInfluence.js';
import { diplomacyTab } from './politicsDiplomacy.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const LEAN = { '-2': 'strongly against', '-1': 'against', 0: 'neutral', 1: 'for', 2: 'strongly for' };
const PHASE = { term: 'In term', campaign: 'Campaign season', polling: 'Polling day' };

const SEGMENTS = [{ id: 'Overview', label: 'Overview' }, { id: 'Government', label: 'Government' }, { id: 'Polls', label: 'Polls' }, { id: 'Campaign', label: 'Vote' }, { id: 'Influence', label: 'Influence' }, { id: 'Diplomacy', label: 'World' }];

/** The Politics app: an overview, and the government (v0.94.0). */
export function politicsApp(ui, body, open) {
  const tab = SEGMENTS.some((x) => x.id === ui.polTab) ? ui.polTab : 'Overview';
  const seg = segments(SEGMENTS, tab, (t) => { ui.polTab = t; open('Politics'); });
  if (seg) body.append(seg);
  if (tab === 'Government') governmentTab(ui, body);
  else if (tab === 'Polls') pollsTab(ui, body);
  else if (tab === 'Campaign') campaignTab(ui, body, open);
  else if (tab === 'Influence') influenceTab(ui, body, open);
  else if (tab === 'Diplomacy') diplomacyTab(ui, body, open);
  else overviewTab(ui, body, open);
}

const k = (v) => `${v < 0 ? '−' : ''}${n(Math.abs(v))}k`;
const STATE = { proposed: 'proposed', review: 'in committee', approved: 'approved', implementing: 'being set up', active: 'in force', suspended: 'suspended', ended: 'ended' };

function governmentTab(ui, body) {
  const g = ui.game;
  const G = g.politics.government();
  const b = G.budget;
  const party = g.politics.party(G.governing);
  const policy = (p) => row({ icon: p.state === 'active' ? '📜' : '📝', title: p.def.name, sub: `${p.def.blurb} ${p.state === 'active' ? `In force since day ${p.since}.` : p.daysLeft != null ? `${STATE[p.state]}, about ${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'} to go.` : ''}${p.votes ? ` Assembly: ${p.votes.yes}–${p.votes.no}.` : ''}`, tag: `${p.def.cost >= 0 ? '+' : '−'}${Math.abs(p.def.cost)}k/mo`, tone: p.def.cost < 0 ? 'good' : '' });
  body.append(
    hero({ label: `The state's books · ${party.name}`, value: b.deficit > 0 ? `${k(b.deficit)} deficit a month` : `${k(-b.deficit)} surplus a month`, tone: b.squeeze || b.headroom < 0 ? 'neg' : '', sub: `Revenue ${k(b.revenue)} · spending ${k(b.spending.total)} (policies ${k(b.spending.policies)}, interest ${k(b.spending.interest)}). This is the state's money, not yours.` }),
    tiles([{ n: String(G.active.length), t: 'policies in force' }, { n: String(G.coming.length), t: 'on their way' }, { n: k(b.debt), t: 'state debt' }]),
    list(...(G.active.length ? G.active.map(policy) : [row({ icon: '—', title: 'Nothing in force', sub: 'The government has no programmes yet.' })])));
  if (G.coming.length) body.append(list(...G.coming.map(policy)));
  const fxv = g.politics.effectLines();
  body.append(list(
    row({ icon: '🧾', title: 'What the policies mean for you', sub: fxv.lines.length ? 'Each is a bounded change to a price or a fee, never a gift. A fee you pay is the state\'s revenue.' : 'None of the policies in force reaches your businesses yet.', tag: fxv.paid.total ? `fees paid ${n(fxv.paid.total)}` : null }),
    ...fxv.lines.map((l) => row({ icon: '↳', title: l.name, sub: l.text })),
    fxv.premium > 0 ? row({ icon: '🏦', title: 'The state\'s debt and the bond', sub: `The state\'s debt and deficit add ${(fxv.premium * 100).toFixed(2)} points to what Sund\'s government bond pays.` }) : null));
  body.append(help('How the government works', 'The cabinet meets every seventh day and proposes the one policy it most believes in and can afford. A policy goes to the Assembly\'s committee, then to a vote (a hundred seats; a bill passes on more than fifty), then is set up and comes into force. A new policy repeals its opposite.', 'In this update a policy changes only the state\'s books and, later, what the public thinks. It does not yet change any price, cost, the police or any war you play with; that comes with the economy update. You never have to take part.'));
  body.append(fold(ui, 'PoliticsGov', 'The decisions, and what ended ›', (box) => {
    box.append(list(...G.decisions.map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text }))));
    if (G.ended.length) box.append(list(...G.ended.map((p) => row({ icon: '✖', title: p.def.name, sub: p.note || 'ended', tag: 'ended' }))));
  }));
}

const pc = (v) => `${Math.round(v * 100)}%`;
const INDEX = { trust: 'Trust in government', crimeConcern: 'Concern about crime', economicConfidence: 'Confidence in the economy', priceConcern: 'Concern about prices', warSupport: 'Support for military action', employment: 'Satisfaction with jobs', regulationSupport: 'Support for regulation', services: 'Satisfaction with public services' };

/** The Polls page (v0.94.0): what pollsters found. Every poll shows its date, its pollster, its sample and its margin; the true figure is never shown. */
function pollsTab(ui, body) {
  const g = ui.game;
  const P = g.politics.polls();
  const L = P.latest;
  if (!L) { body.append(hero({ label: 'Polls', value: 'No polls yet', sub: 'The pollsters publish every few weeks.' })); return; }
  const m = Math.round(L.margin * 1000) / 10;
  body.append(
    hero({ label: `Approval of the government (${P.govName})`, value: `${pc(L.approval)} ± ${m}`, sub: `${L.name} · fieldwork day ${L.fieldwork}, published day ${L.day} · ${n(L.sample)} people · ${pc(L.disapproval)} disapprove` }),
    tiles([{ n: pc(L.results.order), t: 'Order' }, { n: pc(L.results.liberty), t: 'Liberty' }, { n: pc(L.results.undecided), t: 'undecided' }]),
    list(...P.list.map((p) => row({ icon: '📊', title: p.name, sub: `Order ${pc(p.results.order)} · Liberty ${pc(p.results.liberty)} · others ${pc(p.results.other)} · undecided ${pc(p.results.undecided)} · approval ${pc(p.approval)} (± ${Math.round(p.margin * 1000) / 10}, ${n(p.sample)} people)`, tag: `day ${p.day}` }))),
    help('How to read a poll', 'A poll asks a sample of people, so it has a margin of error (the ± above, at 95% confidence): two parties within the margin are level. Each pollster also has a lean of its own (its "house effect") and publishes a few days after it asks. No poll shows the truth; several polls together show it better.'));
  body.append(fold(ui, 'PoliticsPolls', 'By state, and what people say ›', (box) => {
    const names = Object.fromEntries(atlasStates().map((x) => [x.id, x.name]));
    box.append(list(...Object.entries(L.regional).map(([rid, r]) => row({ icon: '🗺️', title: names[rid] || rid.replace('sd_', '').replace(/_/g, ' '), sub: `Order ${pc(r.order)} · Liberty ${pc(r.liberty)} (about ${r.n} people: a wide margin)`, tag: pc(r.order - r.liberty >= 0 ? r.order : r.liberty) }))));
    box.append(list(...Object.entries(INDEX).map(([k, name]) => row({ icon: '💬', title: name, sub: 'asked in the latest poll', tag: pc(L.indices[k]) }))));
  }));
}

/** Optional things the world offers you (v0.97.0). Nothing here is mandatory. */
function emergenceSection(ui, body, open) {
  const g = ui.game;
  const E = g.politics.emergence();
  if (!E.open.length && !E.recent.length) return;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Politics'); };
  body.append(h('div', { class: 'tb-label', style: 'margin:6px 4px' }, 'For you (optional)'));
  body.append(list(
    ...E.open.map((o) => row({ icon: o.icon, title: o.title, sub: `${o.text}${o.state === 'accepted' ? ` — accepted. ${o.where || ''}` : ''} (${o.daysLeft} days)`,
      action: o.state === 'accepted' ? h('button', { class: 'tb-mini', onclick: () => go(g.politics.declineOffer(o.id)) }, 'Drop it')
        : o.kind === 'choice' ? h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini pri', onclick: () => go(g.politics.answerOffer(o.id, true)) }, o.yes), h('button', { class: 'tb-mini', onclick: () => go(g.politics.answerOffer(o.id, false)) }, o.no))
          : h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini pri', onclick: () => go(g.politics.acceptOffer(o.id)) }, 'Take it on'), h('button', { class: 'tb-mini', onclick: () => go(g.politics.declineOffer(o.id)) }, 'No')) })),
    ...E.recent.map((o) => row({ icon: '🗒️', title: o.title, sub: o.reason || o.state, tag: o.state }))));
  body.append(h('div', { class: 'tb-note' }, 'None of this is required. An offer you ignore ends, and says why.'));
}

function overviewTab(ui, body, open) {
  const g = ui.game;
  const nt0 = note(ui);
  if (nt0) body.append(nt0);
  const O = g.politics.overview();
  const gov = O.governing;
  const opp = O.opposition;
  const c = O.calendar;
  body.append(
    hero({ label: 'Government of Sund', value: `${gov.short} — ${gov.leader}`, sub: `${gov.name} governs · term day ${O.termDay} of ${O.termDays}`, ring: O.termDay / O.termDays }),
    tiles([{ n: String(c.daysToPolling), t: c.phase === 'polling' ? 'polling day' : 'days to the vote' }, { n: `${gov.seats}–${opp.seats}`, t: `seats, ${gov.short} v ${opp.short}` }, { n: PHASE[c.phase], t: 'the political year' }]),
    list(
      row({ icon: '👑', title: O.king.name, sub: `${O.king.seat} · age ${O.king.age} · ${O.king.note}`, tag: 'head of state' }),
      row({ icon: '🏛️', title: gov.leader, sub: `${gov.blurb}`, tag: 'President', tone: 'good' }),
      row({ icon: '🗣️', title: opp.leader, sub: `${opp.blurb}`, tag: 'opposition' })),
    help('How politics works here', 'Sund is a constitutional monarchy: the king is head of state and an elected President governs. A term is 120 game days and the vote falls in its last 30.', 'Government, Polls and this page only read the record. They do not change any price, police or war yet (the economy and diplomacy come in later updates). "Vote" shows the election and takes public donations; "Influence" is who will see you and what you may ask. You never have to take part.', 'Whoever the voters pick, the other leader stays in the world and keeps working: you may meet either in the city.'));
  emergenceSection(ui, body, open);
  body.append(fold(ui, 'Politics', 'Where the parties differ ›', (box) => {
    box.append(list(...O.issues.map((i) => row({
      icon: i.gap >= 3 ? '⚡' : i.gap >= 2 ? '↔️' : '＝', title: i.name, sub: `${gov.short}: ${LEAN[i.gov]} · ${opp.short}: ${LEAN[i.opp]}`, tag: i.gap >= 3 ? 'far apart' : i.gap >= 2 ? 'differ' : 'close', tone: i.gap >= 3 ? 'warn' : '',
    }))));
    box.append(list(...O.history.map((e) => row({ icon: '📰', title: `Day ${e.day}`, sub: e.text }))));
  }));
}
