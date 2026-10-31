// The Managers app (v0.89.0): one card for each business, and a card for the group. No candidates, no skills, no budgets by category:
// hire in one tap (the price is shown before any money moves), tick what they may do on their own, pick a monthly limit. Requests that
// need you (always: expansion) are at the top with Approve and Decline. Everything the old People and Management apps did is gone.
import { h } from './panels.js';
import { hero, row, help, note, fold, buttons, big, n } from './tabletKit.js';
import { PERM_NAMES, permsFor, wageOf, ROLES } from '../content/personnel.js';

const card = (...kids) => h('div', { class: 'tb-card tb-mgr' }, ...kids.flat().filter(Boolean));
const LIMITS = [0, 10000, 25000, 50000, 100000, 250000];

export function managersApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const Pe = K.personnel;
  const M = K.management;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); ui.mgrAsk = null; open('Managers'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const m = M.peek();
  const pending = m?.pending || [];
  const staff = Object.values(Pe.peek()?.staff || {}).filter((x) => x.status === 'active' && x.role !== 'office');
  const perDay = staff.reduce((a, x) => a + (x.salary || 0), 0);
  body.append(hero({ label: 'Managers', value: pending.length ? `${pending.length} waiting for you` : staff.length ? 'All running' : 'No managers yet', tone: pending.length ? 'gold' : '', sub: staff.length ? `${staff.length} hired · ${n(perDay)} obols a day` : 'Hire one for a business and it looks after itself.' }));
  if (pending.length) {
    body.append(card(...pending.map((q) => row({ icon: '🙋', title: `${Pe.person(q.actor)?.first || 'A manager'} would like to ${M.verb(q.kind)}`, sub: `${Pe.employerName(q.employer)}${q.desc ? ` · ${q.desc}` : ''}`, tag: q.cost ? `${n(q.cost)} ◎` : '',
      action: h('span', { class: 'tb-acts' }, h('button', { class: 'tb-mini pri', onclick: () => go(M.approve(q.id)) }, 'Yes'), h('button', { class: 'tb-mini', onclick: () => go(M.decline(q.id)) }, 'No')) }))));
  }
  // a hire waiting for its price to be read
  const ask = ui.mgrAsk;
  if (ask) {
    const q = Pe.quote(ask.role, ask.employer);
    body.append(h('div', { class: 'tb-card tb-terms' }, h('b', {}, `Hire a ${ROLES[ask.role].name.toLowerCase()} for ${Pe.employerName(ask.employer)}?`),
      h('div', { class: 'tb-sub' }, `${n(q.wage)} obols a day, and ${n(q.fee)} to sign, from ${Pe.employerName(ask.employer)}'s own account.${q.why ? ` ${q.why}` : ''}`),
      buttons(big(`Hire for ${n(q.wage)} a day`, () => go(Pe.hire(ask.role, ask.employer)), 'pri', !q.ok), big('Cancel', () => { ui.mgrAsk = null; open('Managers'); }))));
  }
  const ticks = (x) => h('div', { class: 'tb-checks' }, ...permsFor(x.role, x.employer).map((k) => {
    const on = Pe.may(x, k);
    return h('button', { class: `tb-check${on ? ' on' : ''}`, title: PERM_NAMES[k].text, onclick: () => go(Pe.setPerm(x.id, k, !on)) }, h('i', {}, on ? '☑' : '☐'), PERM_NAMES[k].name);
  }));
  const hireButton = (role, employer, label) => h('button', { class: 'tb-btn pri', onclick: () => { ui.mgrAsk = { role, employer }; open('Managers'); } }, `${label} · ${n(wageOf(role, employer))} a day`);
  const who = (x) => row({ icon: '🧑‍💼', title: x.name, sub: `${n(x.salary)} a day${x.unpaid ? ' · unpaid!' : ''}`, action: h('button', { class: 'tb-mini', onclick: () => { ui.mgrFire = ui.mgrFire === x.id ? null : x.id; open('Managers'); } }, 'Let go') });
  const fire = (x) => (ui.mgrFire === x.id ? h('div', { class: 'tb-terms' }, h('div', { class: 'tb-sub' }, `${x.name} goes at once with ${n(x.salary * 5)} obols of severance from the company.`), buttons(big('Let go', () => { ui.mgrFire = null; go(Pe.dismiss(x.id)); }, 'pri'), big('Keep', () => { ui.mgrFire = null; open('Managers'); }))) : null);

  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) {
    if (!K.established(id)) continue;
    const c = M.card(id);
    const x = c.manager;
    if (!x) { body.append(card(h('div', { class: 'tb-label' }, c.name), h('div', { class: 'tb-sub' }, 'No manager. You run it yourself.'), hireButton('manager', id, 'Hire a manager'))); continue; }
    const used = c.limit ? Math.min(100, Math.round((c.spent / c.limit) * 100)) : 0;
    body.append(card(h('div', { class: 'tb-label' }, c.name), who(x), fire(x), ticks(x),
      h('div', { class: 'tb-limit' }, h('span', {}, `Spends up to ${n(c.limit)} a month`), h('small', {}, c.custom ? `${n(c.spent)} used` : `automatic · ${n(c.spent)} used`)),
      h('div', { class: 'tb-bar' }, h('i', { style: `width:${used}%` })),
      h('div', { class: 'tb-chips' }, ...LIMITS.map((v) => h('button', { class: `tb-chip${(c.custom || 0) === v ? ' on' : ''}`, onclick: () => go(M.setCap(id, v)) }, v ? n(v) : 'Auto'))),
      ...c.notes.map((t) => h('div', { class: 'tb-sub' }, `⚠ ${t}`))));
  }
  if (K.state.parent && K.group.subs().length) {
    const x = Pe.holders('parent', 'group_manager')[0];
    body.append(card(h('div', { class: 'tb-label' }, K.nameOf('parent')), x ? [who(x), fire(x), ticks(x)] : [h('div', { class: 'tb-sub' }, 'Nobody moves cash between your companies. You do it yourself.'), hireButton('group_manager', 'parent', 'Hire a group manager')]));
  }
  if (!K.registry().some((r) => r.kind === 'player')) body.append(card(h('div', { class: 'tb-sub' }, 'Own a business first.')));
  body.append(help('How managers work ›', 'A manager looks after one business in its own interest. It only does what is ticked, only from that company\'s own account, and never past its monthly limit. It always asks you before expanding.', 'Every manager is paid the same and does a little for their business just by being there (about 3% off what it buys, or on what it sells).'));
  const log = (m?.log || []).slice(-12).reverse();
  if (log.length) body.append(fold(ui, 'Managers', 'What they did ›', (box) => box.append(card(...log.map((l) => row({ icon: l.type === 'refused' ? '✋' : l.type === 'queued' ? '🙋' : '✔', title: `Day ${l.day}`, sub: l.text }))))));
}
