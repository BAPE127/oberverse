// The Military app's Contracts page (v0.99.0; mock-up proposal-war-oberpad-command.png page 5): open offers, jobs under way, and the record. A job the firm cannot staff or equip says so.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n, segments } from './tabletKit.js';
import { PEOPLE } from '../content/production.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const RISK = { low: 'low risk', medium: 'medium', high: 'high' };

export function contractsTab(ui, body, go, open) {
  const g = ui.game; const W = g.war; const V = W.contracts();
  const guards = W.people().filter((p) => p.role === 'guard');
  const SEG = [{ id: 'open', label: 'Open', badge: V.open.length || 0 }, { id: 'active', label: 'Active' }, { id: 'done', label: 'Done' }];
  const tab = SEG.some((x) => x.id === ui.milCon) ? ui.milCon : 'open';
  body.append(
    hero({ label: 'Security contracts', value: `${V.reputation} reputation`, sub: `${V.wins} won, ${V.losses} lost. A good name brings more offers and bigger jobs; a failure costs money and a client.`, tone: V.reputation < 0 ? 'neg' : '' }),
    tiles([{ n: String(guards.length), t: 'guards' }, { n: String(guards.filter((p) => !p.post).length), t: 'free' }, { n: String(V.active.length), t: 'under way' }]),
    list(row({ icon: '💂', title: 'Guards', sub: `${PEOPLE.guard.wage} obols a day each. Each takes a pistol and the job a radio, from your stores.`, action: h('span', {}, h('button', { class: 'tb-mini pri', onclick: () => go(W.hire('guard')) }, 'Hire'), ' ', h('button', { class: 'tb-mini', disabled: !guards.some((p) => !p.post), onclick: () => go(W.dismiss(guards.filter((p) => !p.post).slice(-1)[0]?.id)) }, 'Let one go')) })));
  body.append(segments(SEG, tab, (t) => { ui.milCon = t; open('Military'); }));
  if (tab === 'open') {
    body.append(list(...(V.open.length ? V.open.map((c) => h('div', {},
      row({ icon: '📑', title: c.title, sub: `${c.days} days · ${c.guards} guards · client: ${c.clientName}. ${c.text} Offer closes day ${c.expires}.`, tag: `${n(c.pay)} · ${RISK[c.risk]}`,
        action: h('span', {}, h('button', { class: 'tb-mini pri', disabled: c.lacks.length > 0, onclick: () => go(W.accept(c.id)) }, 'Take'), ' ', h('button', { class: 'tb-mini', onclick: () => go(W.decline(c.id)) }, 'No')) }),
      c.lacks.length ? h('div', { class: 'tb-note', style: 'margin:0 8px 8px' }, `⚠ Your forces do not meet this one. Needs ${c.lacks.join(', ')}.`) : null)) : [row({ icon: '—', title: 'No offers just now', sub: 'Clients call now and then. A licensed company with a good name hears more often.' })])));
  } else if (tab === 'active') {
    body.append(list(...(V.active.length ? V.active.map((c) => row({ icon: '🛡️', title: c.title, sub: `${c.guards} guards on the post for ${c.daysLeft} more day${c.daysLeft === 1 ? '' : 's'} · ${Math.round(c.chance * 100)}% to end well · client: ${c.clientName}`, tag: n(c.pay) })) : [row({ icon: '—', title: 'Nothing under way', sub: 'Take a job from Open. The pay comes only when it ends well.' })])));
  } else {
    body.append(list(...(V.done.length ? V.done.map((c) => row({ icon: c.state === 'done' ? '✅' : c.state === 'failed' ? '❌' : '⌛', title: c.title, sub: c.state === 'done' ? `Done · paid ${n(c.pay)}` : c.state === 'failed' ? `It went wrong · fined ${n(c.fine)}` : c.state === 'declined' ? 'Turned down' : c.why || 'Lapsed', tag: `day ${c.ended}` })) : [row({ icon: '—', title: 'No finished jobs', sub: 'Done, lost and lapsed jobs are kept here.' })])));
  }
  const Eg = W.engagements();
  const eg = tab === 'open' ? Eg.open : tab === 'active' ? Eg.active : Eg.done;
  if (eg.length) body.append(h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, 'Engagements — fought by a general'), list(...eg.map((x) => row({ icon: '🗺️', title: x.title, sub: tab === 'open' ? `${x.client} · ${x.days} days · needs ${x.needs.troops} soldiers${x.needs.tanks ? `, ${x.needs.tanks} tanks` : ''}` : tab === 'active' ? `${x.order.generalName} · ${x.daysLeft} days to go` : x.result ? `${x.result.outcome.replace('_', ' ')} · ${x.result.objectives} of 3` : x.why || x.state, tag: n(x.pay),
    action: h('button', { class: 'tb-mini pri', onclick: () => { ui.milEng = x.id; ui.milSub = 'Engagement'; ui.milTab = 'Company'; open('Military'); } }, tab === 'open' ? 'Plan' : 'Report') }))));
  body.append(fold(ui, 'MilClients', 'Reputation · clients · lost jobs ›', (box) => box.append(list(...(V.clients.length ? V.clients.map((c) => row({ icon: '🏢', title: c.name, sub: `${c.done} done, ${c.failed} lost${c.banned ? ' · will not call for now' : ''}` })) : [row({ icon: '—', title: 'No clients yet', sub: 'Every job you finish or lose is counted here.' })])))));
  body.append(help('How contracts work', 'Each job asks for guards, a pistol each and a radio, and nothing heavy. The pay arrives only when the job ends well and goes to the company\'s account. If it goes wrong the company owes a fine and the client looks elsewhere for a month. You can run the whole company as a guard firm.'));
}
