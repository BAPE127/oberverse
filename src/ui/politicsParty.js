// Your party (v0.97.0): a screen inside Influence (mock-up proposal-pol-oberpad-influence.png, panel 9): the founding needs, the headquarters, staff, platform, and the fold
// with registration, support and candidacy. A foundation: it takes no part in any election. Every button calls game.politics.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, note, n } from './tabletKit.js';
import { BLOCS } from '../content/opinion.js';
import { POLITICS as POL } from '../content/politics.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const STANCE = { '-2': 'strongly against', '-1': 'against', 0: 'no view', 1: 'for', 2: 'strongly for' };

/** The voters a stance on an issue pleases and costs: the blocs whose lean agrees or disagrees. */
function reaction(issue, stance) {
  const rows = Object.entries(BLOCS).map(([id, b]) => ({ id, name: b.name, v: (b.lean[issue] || 0) * stance })).filter((r) => r.v !== 0);
  const pleased = rows.filter((r) => r.v > 0).sort((a, b) => b.v - a.v).slice(0, 2).map((r) => r.name);
  const cost = rows.filter((r) => r.v < 0).sort((a, b) => a.v - b.v).slice(0, 2).map((r) => r.name);
  return { pleased, cost };
}

export function partyScreen(ui, body, open) {
  const g = ui.game;
  const P = g.politics;
  const V = P.party();
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Politics'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => { ui.polParty = false; ui.polPlat = false; open('Politics'); } }, '‹ Back')));
  if (!V.has) {
    const draft = ui.polPartyName || '';
    body.append(hero({ label: 'Your own party (optional)', value: 'Found one', sub: 'A foundation, not a destination: a name, a platform, staff and funds. It cannot stand in an election yet, and it changes no result.' }));
    const input = h('input', { type: 'text', value: draft, placeholder: 'A name for the party', maxlength: '40', style: 'width:100%;padding:10px;border-radius:10px;border:2px solid #3a3794;background:#15133e;color:inherit;font-size:16px', oninput: (e) => { ui.polPartyName = e.target.value; } });
    body.append(h('div', { class: 'tb-card', style: 'padding:12px' }, input));
    body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => go(P.foundParty(ui.polPartyName || '', V.colours[0])) }, 'Found the party')));
    body.append(help('What a party is here', V.candidacy, 'You need an office (your company\'s Corporate Centre or Tower), a registration fee paid to the state, a reputation, a platform of at least three priorities and three staff. Its funds are only what you give it.'));
    return;
  }
  const N = V.needs;
  body.append(
    hero({ label: V.registered ? `${V.name} · registered` : 'Founding needs', value: V.registered ? 'Registered' : `${N.met} of ${N.total} met`, tone: V.registered ? 'pos' : 'warn', sub: N.list.map((x) => `${x.name} ${x.met ? '✓' : '✗'}`).join(' · ') }),
    tiles([{ n: n(V.funds), t: 'party funds' }, { n: `${(V.consider * 100).toFixed(1)}%`, t: 'would consider it' }, { n: String(V.staff.filter((x) => x.held).length), t: 'staff' }]));
  if (ui.polPlat) { platform(ui, body, open, V, go); return; }
  body.append(list(
    row({ icon: '🏢', title: 'Party headquarters', sub: N.list[0].met ? `${N.list[0].text} Furnish it from Group → Headquarters.` : N.list[0].text, tag: N.list[0].met ? '✓' : '✗', tone: N.list[0].met ? 'good' : 'warn' }),
    row({ icon: '📜', title: 'Platform', sub: Object.entries(V.platform).length ? Object.entries(V.platform).map(([k, v]) => `${POL.issues[k].name}: ${STANCE[v]}`).join(' · ') : 'Choose priorities. Each choice pleases some voters and costs you others.', tag: N.list[3].met ? '✓' : '✗', tone: N.list[3].met ? 'good' : 'warn', action: h('button', { class: 'tb-mini pri', onclick: () => { ui.polPlat = true; open('Politics'); } }, 'Edit') }),
    row({ icon: '🏦', title: 'Registration fee', sub: N.list[1].text, tag: N.list[1].met ? 'paid' : 'unpaid', tone: N.list[1].met ? 'good' : 'warn', action: N.list[1].met ? null : h('button', { class: 'tb-mini pri', disabled: g.player.money < V.fee, onclick: () => go(P.payFee()) }, 'Pay') }),
    row({ icon: '⭐', title: 'Reputation', sub: N.list[2].text, tag: N.list[2].met ? '✓' : '✗', tone: N.list[2].met ? 'good' : 'warn' })));
  body.append(list(
    row({ icon: '💷', title: 'Party funds', sub: `Only what you put in. Wages are ${n(V.wage)} a day each; taking someone on costs ${n(V.hire)}.` }),
    h('div', { class: 'tb-chips tb-sheet' }, ...[5000, 25000, 100000].map((a) => h('button', { class: 'tb-chip', disabled: g.player.money < a, onclick: () => go(P.fundParty(a)) }, n(a))))));
  body.append(list(...V.staff.map((x) => row({ icon: '🧑‍💼', title: x.name, sub: x.held ? `${x.held.name} · since day ${x.held.since}` : 'Vacant', tag: x.held ? 'hired' : null, tone: 'good',
    action: x.held ? h('button', { class: 'tb-mini', onclick: () => go(P.dismissStaff(x.id)) }, 'Let go') : h('button', { class: 'tb-mini pri', disabled: V.funds < V.hire, onclick: () => go(P.hireStaff(x.id)) }, 'Hire') }))));
  if (!V.registered) body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', disabled: !N.ready, onclick: () => go(P.register()) }, N.ready ? 'Register the party' : `${N.total - N.met} needs unmet`)));
  body.append(fold(ui, 'PoliticsParty', 'Registration, support and candidacy ›', (box) => {
    box.append(list(
      row({ icon: '🗳️', title: 'Candidacy', sub: V.candidacy }),
      row({ icon: '📊', title: 'Support', sub: 'The share of voters whose views suit your platform and who might consider you: a reading, not a poll. It enters no election.', tag: `${(V.consider * 100).toFixed(1)}%` }),
      ...V.log.map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text }))));
    box.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => go(P.disbandParty()) }, 'Wind the party up (funds come back)')));
  }));
}

function platform(ui, body, open, V, go) {
  const P = ui.game.politics;
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => { ui.polPlat = false; open('Politics'); } }, '‹ Done')));
  body.append(list(...V.issues.map((i) => {
    const r = i.stance ? reaction(i.id, i.stance) : null;
    return [row({ icon: '📌', title: i.name, sub: i.stance ? `${STANCE[i.stance]}. Pleases ${r.pleased.join(' and ') || 'nobody in particular'}; costs you ${r.cost.join(' and ') || 'nobody in particular'}.` : POL.issues[i.id].blurb, tag: i.stance ? STANCE[i.stance] : null }),
      h('div', { class: 'tb-chips tb-sheet' }, ...[-2, -1, 0, 1, 2].map((v) => h('button', { class: `tb-chip${i.stance === v ? ' on' : ''}`, onclick: () => go(P.setPlatform(i.id, v)) }, v === 0 ? 'none' : v > 0 ? `+${v}` : String(v))))];
  })));
}
