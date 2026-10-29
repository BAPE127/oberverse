// The Management app (v0.63.0): what managers may spend, what is waiting for your word, and what they have done.
// Everything is read from game.corp.management and every button calls it; nothing is decided here.
import { h } from './panels.js';
import { CATEGORIES, MGMT } from '../content/management.js';
import { ROLES } from '../content/personnel.js';

const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString());
const BUSINESSES = [['arms', ['materials', 'hiring']], ['aerospace', ['materials', 'hiring']], ['shipping', ['hiring']], ['farming', ['hiring']]];
const LABEL = { done: 'did', approved: 'approved', queued: 'asked', refused: 'could not', declined: 'declined', expired: 'lapsed', failed: 'failed', budget: 'budget' };

export function manageApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const M = K.management;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Management'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const name = (e) => K.personnel.employerName(e);

  body.append(h('p', { class: 'doc' }, '🧭 Managers can act for a business on their own, but only inside what you allow: a monthly budget for each kind of spending (none set means none allowed), their own spending limit and ask-above limit (set under Personnel → Staff → Manage), and only for a business with an account of its own. A decision above the ask-above limit waits here for your word. Every decision is judged again when you approve it. A budget is permission to spend, not money.'));

  const alerts = M.alerts();
  if (alerts.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Needs your attention'), h('div', { class: 'list' }, ...alerts.map((a) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '⚠'), h('div', { class: 'grow' }, h('div', { class: 'name' }, a.text), h('div', { class: 'desc' }, a.advice))))));

  const m = M.peek();
  const pending = m?.pending || [];
  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Waiting for you'));
  if (!pending.length) body.append(h('p', { class: 'muted' }, 'Nothing is waiting.'));
  else body.append(h('div', { class: 'list' }, ...pending.map((q) => {
    const x = K.personnel.person(q.actor);
    return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${x?.name || 'Someone'} asks to ${q.kind === 'hire' ? 'hire' : 'reorder'} at ${name(q.employer)}`, h('span', { class: 'tag' }, `${n(q.cost)} obols when asked`), h('span', { class: 'tag' }, `${MGMT.expireDays - (g.clock.day - q.day)} days left`)),
      h('div', { class: 'desc' }, `${q.why} Approving judges it again on today's figures: a changed need, price, budget or person can still stop it.`),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small primary', onclick: () => go(M.approve(q.id)) }, 'Approve'), h('button', { class: 'small ghost', onclick: () => go(M.decline(q.id)) }, 'Decline'))));
  })));

  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Budgets'));
  const list = h('div', { class: 'list' });
  for (const [id, cats] of BUSINESSES) {
    if (!K.established(id)) continue;
    const funded = K.account(id).funded;
    const rows = cats.map((cat) => {
      const kind = cat === 'hiring' ? 'hire' : 'reorder';
      const st = M.status(id, kind);
      const box = h('input', { type: 'number', class: 'debug-qty', min: 0, step: 1000, value: st.budget, style: 'width:100px' });
      const who = M.deciders(kind, id).map((x) => `${x.name} (${ROLES[x.role].name})`);
      return h('div', { style: 'margin-top:6px' },
        h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px' }, h('b', {}, CATEGORIES[cat].name), box, h('span', { class: 'muted' }, 'a month'), h('button', { class: 'small', onclick: () => go(M.setBudget(id, cat, Number(box.value))) }, 'Set'), h('span', { class: 'muted' }, st.budget ? `${n(st.spent)} used this month, ${n(Math.max(0, st.budget - st.spent))} left` : '')),
        h('div', { class: 'desc' }, CATEGORIES[cat].text, who.length ? ` Decided by ${who.join(', ')}.` : ''),
        ...st.notes.map((t) => h('div', { class: 'desc' }, `• ${t}`)));
    });
    list.append(h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, name(id), h('span', { class: `tag${funded ? ' good' : ''}` }, funded ? 'own account' : 'no account of its own')), ...rows)));
  }
  body.append(list);

  const log = (m?.log || []).slice(-15).reverse();
  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'What they have done'));
  if (!log.length) body.append(h('p', { class: 'muted' }, 'Nothing yet.'));
  else body.append(h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${LABEL[l.type] || l.type}: ${l.text}`))))));
  body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'Each business gets at most one reorder and one hire decision a day, at about 06:00, and a manager makes at most two hires a month at a business. A hire counts its recruiting fee and a month\'s wage against the hiring budget. Aerospace\'s auto-buy is your own standing order: managers buy only while it is off.'));
}
