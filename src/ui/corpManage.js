// The Management app (v0.63.0): what managers may spend, what is waiting for your word, and what they have done.
// Everything is read from game.corp.management and every button calls it; nothing is decided here.
import { h } from './panels.js';
import { CATEGORIES, MGMT, PLAN_TYPES } from '../content/management.js';
import { ROLES } from '../content/personnel.js';

const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString());
const BUSINESSES = [['arms', ['materials', 'hiring', 'expansion']], ['aerospace', ['materials', 'contracts', 'hiring', 'expansion']], ['shipping', ['hiring', 'expansion']], ['farming', ['hiring', 'expansion']]];
const KIND = { materials: 'reorder', hiring: 'hire', contracts: 'bid', expansion: 'expand', treasury: 'transfer' };
const LABEL = { done: 'did', approved: 'approved', queued: 'asked', refused: 'could not', declined: 'declined', expired: 'lapsed', failed: 'failed', budget: 'budget' };

export function manageApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const M = K.management;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Management'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const name = (e) => K.personnel.employerName(e);

  body.append(h('p', { class: 'doc' }, '🧭 Managers can act for a business on their own, but only inside what you allow: a monthly budget for each kind of spending (none set means none allowed), their own spending limit and ask-above limit (set under Personnel → Staff → Manage, with the permissions to hire, sign contracts, expand and move cash), and only for a business with an account of its own. A decision above the ask-above limit waits here for your word. Every decision is judged again when you approve it. A budget is permission to spend, not money.'));

  const alerts = M.alerts();
  if (alerts.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Needs your attention'), h('div', { class: 'list' }, ...alerts.map((a) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '⚠'), h('div', { class: 'grow' }, h('div', { class: 'name' }, a.text), h('div', { class: 'desc' }, a.advice))))));

  const m = M.peek();
  const pending = m?.pending || [];
  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Waiting for you'));
  if (!pending.length) body.append(h('p', { class: 'muted' }, 'Nothing is waiting.'));
  else body.append(h('div', { class: 'list' }, ...pending.map((q) => {
    const x = K.personnel.person(q.actor);
    return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${x?.name || 'Someone'} asks to ${q.kind === 'budget' ? 'raise the materials budget' : q.kind === 'hire' ? 'hire' : 'reorder'} at ${name(q.employer)}`, h('span', { class: 'tag' }, q.kind === 'budget' ? `+${n(q.cost)} a month` : `${n(q.cost)} obols when asked`), h('span', { class: 'tag' }, `${MGMT.expireDays - (g.clock.day - q.day)} days left`)),
      h('div', { class: 'desc' }, q.kind === 'budget' ? `${q.why} Approving raises the monthly permission only; it is not money and nothing is spent by it.` : `${q.why} Approving judges it again on today's figures: a changed need, price, budget or person can still stop it.`),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small primary', onclick: () => go(M.approve(q.id)) }, 'Approve'), h('button', { class: 'small ghost', onclick: () => go(M.decline(q.id)) }, 'Decline'))));
  })));

  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Budgets'));
  const list = h('div', { class: 'list' });
  for (const [id, base] of BUSINESSES) {
    if (!K.established(id)) continue;
    const cats = K.group.isSub(id) ? [...base, 'treasury'] : base;
    const funded = K.account(id).funded;
    const rows = cats.map((cat) => {
      const kind = KIND[cat];
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
  if (K.established('aerospace')) {
    const mg = M.peek()?.margins.aerospace;
    const box = h('input', { type: 'number', class: 'debug-qty', min: 0, max: 300, step: 1, value: mg ?? 25, style: 'width:70px' });
    body.append(h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px;margin-top:8px' }, h('b', {}, 'Minimum margin on bids'), box, h('span', { class: 'muted' }, '% over cost'), h('button', { class: 'small', onclick: () => go(M.setMargin('aerospace', Number(box.value))) }, 'Set'),
      h('span', { class: 'muted' }, mg === undefined ? 'None set: managers bid on nothing.' : `Bids go in at ${mg}% over cost; where the customer's ceiling is lower, the bid waits for you (never below cost).`)));
  }

  treasury();
  plans();

  function treasury() {
    const G = K.group;
    if (!G.parent) return;
    body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Treasury policy'));
    const reserve = h('input', { type: 'number', class: 'debug-qty', min: 0, step: 10000, value: M.parentReserve(), style: 'width:110px' });
    body.append(h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px' }, h('b', {}, `${G.parent.name} keeps at least`), reserve, h('span', { class: 'muted' }, `obols (it holds ${n(K.cashOf('parent'))}); top-ups never take it lower`), h('button', { class: 'small', onclick: () => go(M.setParentReserve(Number(reserve.value))) }, 'Set')));
    const subs = G.subs();
    if (!subs.length) { body.append(h('p', { class: 'muted' }, 'Bring a business under the parent to keep its cash between a floor and a ceiling.')); return; }
    body.append(h('div', { class: 'list' }, ...subs.map((id) => {
      const pol = M.peek()?.treasury[id];
      const floor = h('input', { type: 'number', class: 'debug-qty', min: 0, step: 5000, value: pol?.floor ?? 20000, style: 'width:100px' });
      const ceil = h('input', { type: 'number', class: 'debug-qty', min: 0, step: 5000, value: pol?.ceiling ?? 100000, style: 'width:100px' });
      const mv = M.planTreasury(id)[0];
      return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, name(id), h('span', { class: 'tag' }, `holds ${n(K.cashOf(id))}`), pol ? h('span', { class: 'tag good' }, 'policy set') : h('span', { class: 'tag' }, 'no policy')),
        h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px;margin-top:4px' }, h('span', { class: 'muted' }, 'Keep it between'), floor, h('span', { class: 'muted' }, 'and'), ceil,
          h('button', { class: 'small', onclick: () => go(M.setTreasury(id, { floor: Number(floor.value), ceiling: Number(ceil.value) })) }, 'Set'), pol ? h('button', { class: 'small ghost', onclick: () => go(M.clearTreasury(id)) }, 'Withdraw') : null),
        h('div', { class: 'desc' }, pol ? (mv ? `Next, a chief financial officer would ${mv.desc}.` : 'Nothing to move now.') : 'Below the floor it is topped up from the parent; above the ceiling the surplus repays what it owes the parent, then returns capital the parent put in. Only a chief financial officer with the permission to move cash does it, inside a Treasury budget.')));
    })));
  }

  function plans() {
    function planRow(q) {
      const e = M.evalPlan(q);
      const next = e.cost ? `Next: ${e.desc}, ${n(e.cost)} obols.` : e.why;
      return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, `${M.planName(q)} — up to ${q.limit}`, h('span', { class: 'tag' }, `${q.bought} bought`), h('span', { class: 'tag' }, `${n(q.maxEach)} at most each`)),
        h('div', { class: 'desc' }, `${PLAN_TYPES[q.type].rule} Leaves ${n(q.reserve)} in the account. ${next}${q.blocked ? ` (${q.blocked})` : ''}`),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small ghost', onclick: () => go(M.removePlan(q.id)) }, 'Withdraw'))));
    }
    body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Plans you have approved'));
    const list = M.peek()?.plans || [];
    if (!list.length) body.append(h('p', { class: 'muted' }, 'None. A plan names what a manager may build or buy, how many, and the most to pay for each; where it goes is a fixed rule. Without a plan, nothing is built or bought.'));
    else body.append(h('div', { class: 'list' }, ...list.map(planRow)));
    addForm();
  }

  function addForm() {
    const owned = Object.entries(PLAN_TYPES).filter(([, T]) => K.established(T.business));
    if (!owned.length) return;
    const type = h('select', { class: 'debug-input', style: 'min-width:240px' }, ...owned.map(([id, T]) => h('option', { value: id }, T.name)));
    const limit = h('input', { type: 'number', class: 'debug-qty', min: 1, max: 10, value: 1, style: 'width:60px' });
    const maxEach = h('input', { type: 'number', class: 'debug-qty', min: 1, step: 1000, value: 20000, style: 'width:100px' });
    const reserve = h('input', { type: 'number', class: 'debug-qty', min: 0, step: 1000, value: 20000, style: 'width:100px' });
    const extra = h('span', { class: 'row', style: 'gap:6px;flex-wrap:wrap' });
    const rule = h('div', { class: 'desc' });
    const field = {};
    const mk = (k, opts) => { field[k] = h('select', { class: 'debug-input' }, ...opts.map(([v, t]) => h('option', { value: v }, t))); return field[k]; };
    const refill = () => {
      extra.replaceChildren(); Object.keys(field).forEach((k) => delete field[k]);
      const t = type.value;
      rule.textContent = PLAN_TYPES[t].rule;
      if (t === 'arms_station') extra.append(mk('works', g.arms.ownedIds().map((w) => [w, g.arms.def(w).name])), mk('item', Object.entries(g.content.items).filter(([, it]) => it.build?.domain === 'arms' && it.build.type === 'machine').map(([id, it]) => [id, it.name])), mk('recipe', [['', 'no recipe set'], ...Object.entries(g.arms.cfg.recipes).map(([id, r]) => [id, `${g.content.items[r.out].name} (${r.station})`])]));
      if (t === 'aero_bay') extra.append(mk('bay', Object.entries(g.aero.cfg.bays).map(([id, B]) => [id, B.name])));
      if (t === 'aero_facility') extra.append(mk('facility', Object.entries(g.aero.cfg.facilities).filter(([, F]) => F.build).map(([id, F]) => [id, F.name])));
    };
    type.addEventListener('change', refill); refill();
    body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Approve a plan'), h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px' }, type, extra, h('span', { class: 'muted' }, 'up to'), limit, h('span', { class: 'muted' }, 'at most'), maxEach, h('span', { class: 'muted' }, 'each, leaving'), reserve, h('span', { class: 'muted' }, 'in the account'),
      h('button', { class: 'small primary', onclick: () => go(M.addPlan({ type: type.value, limit: Number(limit.value), maxEach: Number(maxEach.value), reserve: Number(reserve.value), ...Object.fromEntries(Object.entries(field).map(([k, el]) => [k, el.value])) })) }, 'Approve plan')), rule);
  }

  const log = (m?.log || []).slice(-15).reverse();
  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'What they have done'));
  if (!log.length) body.append(h('p', { class: 'muted' }, 'Nothing yet.'));
  else body.append(h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${LABEL[l.type] || l.type}: ${l.text}`))))));
  body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'Each business gets at most one decision of each kind a day, at about 06:00 (treasury moves, by the chief financial officer, are between the parent and a subsidiary: they are transfers, never sales or costs); a manager makes at most two hires a month at a business and a bid counts the cost of the work it would commit against its budget. A plan buys one at a time, next to what you own and at the first free place by a fixed rule; a station that arrives is placed from the dock but needs a worker you assign. A hire counts its recruiting fee and a month\'s wage against the hiring budget. Aerospace\'s auto-buy is your own standing order: managers buy only while it is off.'));
}
