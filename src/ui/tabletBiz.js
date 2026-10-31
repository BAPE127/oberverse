// The business screens and the inbox (v0.90.0). Every business — arms, shipping, aerospace, farming — is the same screen: how it is doing this
// month (and the last days as little bars), three figures, **Do next** (the jobs worth doing, one button each), its manager with their tick-boxes,
// and one fold for everything the old page did. The Inbox gathers every decision waiting for you into one list. Nothing is computed here but
// layout: the jobs come from game.corp.todo, which reads the same planners the managers use.
import { h } from './panels.js';
import { hero, tiles, note, fold, buttons, big, spark, figure, n } from './tabletKit.js';
import { PERM_NAMES, permsFor, wageOf } from '../content/personnel.js';

const card = (...kids) => h('div', { class: 'tb-card' }, ...kids.flat().filter(Boolean));

export function bizScreen(ui, body, open, id, { tab, foldKey, foldLabel, renderFold, openFoldNow = false }) {
  const g = ui.game;
  const K = g.corp;
  const T = K.todo;
  const Pe = K.personnel;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open(tab); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const st = T.status(id);
  const net = T.monthNet(id);
  const cash = K.cashOf(id);
  const days = T.trail(id, 7);
  body.append(h('div', { class: 'tb-hero tb-biz' },
    h('div', { class: 'grow' }, h('div', { class: 'tb-label' }, 'Made this month'), h('div', { class: `tb-big ${net < 0 ? 'neg' : 'gold'}` }, figure(ui, `${id}:net`, net, { signed: true })),
      h('div', { class: 'tb-sub' }, h('span', { class: `tb-dotc ${st.dot}` }), `${st.text} · ${n(cash)} in the account`)),
    days.length ? spark(days, 46) : null));
  body.append(tiles(T.tiles(id).map((x) => ({ n: String(x.n), t: x.t, tone: x.tone }))));
  const items = T.items(id);
  if (items.length) {
    body.append(h('div', { class: 'tb-label', style: 'margin:2px 4px 6px' }, 'Do next'),
      ...items.map((it) => h('div', { class: 'tb-next' }, h('div', { class: 'tb-ico' }, it.icon), h('div', { class: 't' }, h('b', {}, it.title), h('small', {}, it.sub)), h('button', { class: 'tb-btn pri', onclick: () => go(T.run(id, it.key)) }, it.button))));
  } else {
    body.append(card(h('div', { class: 'tb-sub' }, 'Nothing to do right now.')));
  }
  body.append(managerStrip(ui, open, id, tab));
  body.append(fold(ui, foldKey, foldLabel, renderFold));
  if (openFoldNow) (ui.tabFold ||= {})[foldKey] = true;
}

/** The manager of a business, with the tick-boxes right here; or the way to hire one. */
function managerStrip(ui, open, id, tab) {
  const K = ui.game.corp; const Pe = K.personnel;
  const x = Pe.holders(id, 'manager')[0];
  if (!x) {
    return buttons(big(`🧑‍💼  Hire a manager · ${n(wageOf('manager', id))} a day`, () => { ui.mgrAsk = { role: 'manager', employer: id }; open('Managers'); }));
  }
  const m = K.management;
  return card(h('div', { class: 'tb-row', style: 'border:0;padding:0' }, h('div', { class: 'tb-ico' }, '🧑‍💼'), h('div', { class: 'grow' }, h('b', {}, `${x.name} · Manager`), h('small', {}, `${n(x.salary)} a day · spends up to ${n(m.capOf(id))} a month`)), h('button', { class: 'tb-mini', onclick: () => open('Managers') }, 'Manage')),
    h('div', { class: 'tb-checks' }, ...permsFor(x.role, x.employer).map((k) => { const on = Pe.may(x, k); return h('button', { class: `tb-check${on ? ' on' : ''}`, title: PERM_NAMES[k].text, onclick: () => { Pe.setPerm(x.id, k, !on); ui.audio.sfx('sfx_coin'); open(tab); } }, h('i', {}, on ? '☑' : '☐'), PERM_NAMES[k].name); })));
}

/** The Inbox: every decision waiting for you, in one list — a sentence, an amount, Yes or No. */
export function needsApp(ui, body, open) {
  const T = ui.game.corp.todo;
  const nt = note(ui);
  if (nt) body.append(nt);
  const list = T.inbox();
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Needs'); };
  if (!list.length) { body.append(hero({ label: 'Needs you', value: 'All quiet', sub: 'Nothing is waiting for an answer.' })); return; }
  for (const it of list) {
    body.append(h('div', { class: 'tb-next' }, h('div', { class: 'tb-ico' }, it.icon), h('div', { class: 't' }, h('b', {}, it.title), h('small', {}, it.sub)), it.amount ? h('span', { class: 'tb-tag' }, `${n(it.amount)} ◎`) : null),
      buttons(big(it.yes.label, () => go(it.yes.run()), 'pri'), it.no ? big(it.no.label, () => go(it.no.run())) : null));
  }
}
