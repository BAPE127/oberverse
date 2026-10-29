// The Group app (v0.61.0): the parent company and its subsidiaries — formation, structure, treasury,
// policies, statements. Everything is read from game.corp.group and every button calls it; nothing is
// computed here.
import { h } from './panels.js';
import { PLAYER_COMPANIES } from '../corp/identity.js';
import { COMPANY_IDS } from '../systems/corporate.js';

const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString());
const PERIODS = { month: 'Last month', current: 'This month so far', year: 'Last 12 months' };
const KIND = { capital: 'capital', loan: 'loan', repayment: 'repayment', interest: 'interest', distribution: 'distribution', 'capital-return': 'capital returned' };

export function groupApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const G = K.group;
  const S = (ui.corpGroup ||= { period: 'month', policy: null });
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Group'); };
  const view = (patch) => { Object.assign(S, patch); open('Group'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const amount = (v = 1000, w = 110) => h('input', { type: 'number', class: 'debug-qty', min: 1, step: 100, value: v, style: `width:${w}px` });
  const val = (el) => Math.max(0, Math.floor(Number(el.value) || 0));
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));

  if (!G.parent) {
    body.append(
      h('p', { class: 'doc' }, '🏛️ A parent company holds your businesses as subsidiaries. Each keeps its own books and its own cash; the parent owns them, supplies their capital, and receives what they send up. Founding one costs nothing and creates nothing — it starts with no money, no businesses and no staff.'),
      h('p', { class: 'muted' }, 'Money then runs one way in and one way out: you pay into the parent; the parent capitalises or lends to each subsidiary; each sends distributions and repayments back. Your own wallet never pays a subsidiary directly.'),
      h('button', { class: 'primary', onclick: () => go(G.form()) }, 'Found a parent company'));
    return;
  }

  const P = G.parent;
  const pa = K.account('parent');
  const name = h('input', { type: 'text', class: 'debug-input', value: P.name, maxlength: 40, style: 'width:100%' });
  const own = amount(10000);
  body.append(
    h('div', { class: 'row', style: 'justify-content:flex-start;margin-bottom:6px' }, h('span', { style: 'font-size:22px' }, '🏛️'), name, h('button', { class: 'small', onclick: () => go(K.rename('parent', name.value)) }, 'Rename')),
    h('div', { class: 'grid2' }, stat('Parent\'s own cash (spendable)', `${n(pa.cash)} obols`), stat('Your wallet', `${n(g.player.money)} obols`), stat('Put in by you', `${n(pa.contributed)} · taken out ${n(pa.distributed)}`), stat('Subsidiaries', String(G.subs().length))),
    h('div', { class: 'row', style: 'justify-content:flex-start;margin:6px 0' }, own, h('button', { class: 'small primary', onclick: () => go(K.contribute('parent', val(own))) }, 'Pay into the parent'), h('button', { class: 'small', onclick: () => go(K.distribute('parent', val(own))) }, 'Take a dividend out')));

  const alerts = G.alerts();
  if (alerts.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Needs your attention'), h('div', { class: 'list' }, ...alerts.map((a) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '⚠'), h('div', { class: 'grow' }, h('div', { class: 'name' }, a.text), h('div', { class: 'desc' }, a.advice))))));

  // ---- structure and treasury
  body.append(h('h3', { style: 'margin:12px 0 4px' }, 'Your businesses'));
  const list = h('div', { class: 'list' });
  for (const id of COMPANY_IDS) {
    const p = K.profile(id);
    const I = PLAYER_COMPANIES[id];
    if (!p) { list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, I.icon), h('div', { class: 'grow' }, h('div', { class: 'name' }, I.kind, h('span', { class: 'tag' }, 'not yet started'))))); continue; }
    if (!G.isSub(id)) {
      const pre = G.joinPreview(id);
      const open$ = amount(Math.max(pre.suggested || 0, 0));
      list.append(h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'icon' }, I.icon),
        h('div', { class: 'grow' },
          h('div', { class: 'name' }, p.name, h('span', { class: 'tag' }, 'independent')),
          ...pre.blockers.map((b) => h('div', { class: 'desc neg' }, b)),
          ...pre.warnings.map((w) => h('div', { class: 'desc' }, `⚠ ${w}`)),
          pre.ok ? h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('span', { class: 'muted' }, 'Opening capital'), open$, h('button', { class: 'small primary', onclick: () => go(G.join(id, { opening: val(open$) })) }, 'Bring into the group')) : null)));
      continue;
    }
    const a = K.account(id);
    const pol = G.policyOf(id);
    const loans = G.loansOf(id);
    const cap = amount(10000); const loanAmt = amount(50000); const months = h('input', { type: 'number', class: 'debug-qty', min: 1, max: 60, value: 12, style: 'width:60px' });
    const rate = h('input', { type: 'number', class: 'debug-qty', min: 0, max: 25, step: 0.1, value: +(G.defaultRate() * 100).toFixed(1), style: 'width:64px' });
    const up = amount(5000); const over = h('input', { type: 'checkbox' });
    const own$ = S.policy === id;
    list.append(h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'icon' }, I.icon),
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, p.name, h('span', { class: 'tag good' }, 'subsidiary'), P.policies[id] ? h('span', { class: 'tag' }, 'own policy') : null),
        h('div', { class: 'desc' }, `Cash ${n(a.cash)}${a.arrears ? ` · OWES ${n(a.arrears)}` : ''} · spends about ${n(G.runningPerDay(id))} a day · parent put in ${n(P.investments[id]?.capital)} (brought in at ${n(P.investments[id]?.brought)}) · owes the parent ${n(G.payableOf(id))}`),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap' }, cap, h('button', { class: 'small primary', onclick: () => go(G.capitalise(id, val(cap))) }, 'Capitalise'), h('button', { class: 'small', onclick: () => go(G.returnCapital(id, val(cap))) }, 'Return capital')),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap' }, loanAmt, months, h('span', { class: 'muted' }, 'months at'), rate, h('span', { class: 'muted' }, '% a year'), h('button', { class: 'small', onclick: () => go(G.lend(id, val(loanAmt), { termMonths: Number(months.value), rate: Number(rate.value) / 100 })) }, 'Lend')),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap' }, up, h('button', { class: 'small', onclick: () => go(G.distributeNow(id, val(up), { override: over.checked })) }, 'Send up now'), h('label', { class: 'muted' }, over, ' override protected liquidity'), h('button', { class: 'small', onclick: () => view({ policy: own$ ? null : id }) }, own$ ? 'Close policy' : `Policy (keep ${n(pol.targetReserve)}, send ${pol.distributePct}%)`), h('button', { class: 'small ghost', onclick: () => go(G.spinOut(id)) }, 'Leave the group')),
        ...loans.map((l) => { const r = amount(l.outstanding); return h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('span', { class: 'muted' }, `Loan ${l.id}: ${n(l.outstanding)} of ${n(l.principal)} at ${(l.rate * 100).toFixed(1)}%, ${n(l.instalment)} a month${l.missed ? `, ${l.missed} missed` : ''}`), r, h('button', { class: 'small', onclick: () => go(G.repayLoan(l.id, val(r))) }, 'Repay')); }),
        own$ ? policyEditor(G, id, pol, go) : null)));
  }
  body.append(list);

  // ---- group policy
  body.append(h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:6px' }, h('button', { class: 'small', onclick: () => view({ policy: S.policy === '_default' ? null : '_default' }) }, S.policy === '_default' ? 'Close the default policy' : 'The group\'s default policy')));
  if (S.policy === '_default') body.append(policyEditor(G, null, G.parent.policy, go));

  if (!G.subs().length) { body.append(h('p', { class: 'muted', style: 'margin-top:10px' }, 'Bring a business into the group to see consolidated statements.')); return; }

  // ---- statements
  const C = G.consolidated(S.period);
  body.append(
    h('h3', { style: 'margin:14px 0 4px' }, 'Statements'),
    h('div', { class: 'row', style: 'justify-content:flex-start;margin-bottom:6px' }, ...Object.entries(PERIODS).map(([id, l]) => h('button', { class: `small${S.period === id ? ' primary' : ''}`, onclick: () => view({ period: id }) }, l))));
  const th = (t, st = '') => h('th', { style: `text-align:right;padding:2px 6px;${st}` }, t);
  const td = (t, st = '') => h('td', { style: `text-align:right;padding:2px 6px;${st}` }, t);
  body.append(h('div', { style: 'overflow-x:auto' }, h('table', { style: 'width:100%;border-collapse:collapse;font-size:13px' },
    h('thead', {}, h('tr', {}, th('Separate statements', 'text-align:left'), th('Sales'), th('From the group'), th('Costs'), th('To the group'), th('Result'), th('Cash'))),
    h('tbody', {},
      ...C.separate.map((x) => h('tr', {}, td(x.name, 'text-align:left'), td(n(x.revenue)), td(n(x.icIn)), td(n(x.opex)), td(n(x.icOut)), td(n(x.net), x.net < 0 ? 'color:#e66' : ''), td(n(x.id === 'parent' ? C.cash.parent : C.cash.subs[x.id])))),
      h('tr', { style: 'font-weight:700;border-top:1px solid #888' }, td('Consolidated', 'text-align:left'), td(n(C.consolidated.revenue)), td('—'), td(n(C.consolidated.costs)), td('—'), td(n(C.consolidated.net)), td(n(C.cash.consolidated)))))));
  const E = C.eliminations;
  body.append(
    h('p', { class: 'muted', style: 'font-size:12px' }, `Taken out in consolidating: freight charged between your own companies ${n(E.internalSales)} (of which aerospace has used ${n(E.internalCost)}; the rest is held back, ${n(E.deferred)}, not yet group profit) · interest paid to the parent ${n(E.interest)} · dividends sent up ${n(E.dividends)}. Capital, loans and repayments move money, never results. Check: the companies' results ${n(C.reconciliation.sumOfSeparateNets)} − dividends ${n(C.reconciliation.lessDividends)} − held back ${n(C.reconciliation.lessDeferredFreight)} = ${n(C.reconciliation.equals)}.`),
    h('div', { class: 'grid2' },
      stat('Cash in the group', n(C.cash.consolidated)), stat('Spendable by the parent', n(C.cash.parent)), stat('Could be sent up next', n(C.cash.availableToDistribute)), stat('Debt to outsiders', n(C.debt.external)),
      stat('Lent inside the group', `${n(C.intercompany.receivable)} (owed ${n(C.intercompany.payable)}: they cancel)`), stat('Estimated value of the group', `${n(C.value.group)} — not cash`)));
  const V = C.value;
  body.append(h('p', { class: 'muted', style: 'font-size:12px' }, `Value: the parent's cash ${n(V.parentCash)} + owed by its subsidiaries ${n(V.loansToSubsidiaries)} + its stake in each at their value (after what they owe it): ${V.subsidiaries.map((x) => `${x.name} ${n(x.value)}`).join(' · ')}.`));
  const contrib = G.contribution();
  body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Who contributes'), h('div', { class: 'list' }, ...contrib.map((x) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, x.name), h('div', { class: 'desc' }, `${Math.round(x.valueShare * 100)}% of the group's value · ${Math.round(x.earningsShare * 100)}% of its earnings · ${n(x.cashSentUp)} sent up in a year · holds ${n(x.cash)}${x.risks.length ? ` · risk: ${x.risks.join(', ')}` : ''}`))))));
  const L = G.parentLedger(S.period === 'month' ? 'year' : S.period);
  body.append(h('h4', { style: 'margin:8px 0 4px' }, 'The parent\'s own ledger'), h('div', { class: 'desc' }, `Received: distributions ${n(L.received.distributions)}, interest ${n(L.received.interest)}, repayments ${n(L.received.repayments)}, capital returned ${n(L.received.capitalReturned)} · Paid out: capital ${n(L.paid.capital)}, loans ${n(L.paid.loans)} · Management expenses ${n(L.managementExpenses)}, debt ${n(L.debt)}`));
  const recent = (K.state.transfers || []).slice(-10).reverse();
  if (recent.length) body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Recent transfers'), h('div', { class: 'list' }, ...recent.map((t) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${t.day}: ${n(t.amount)} from ${t.from === 'parent' ? P.name : K.nameOf(t.from)} to ${t.to === 'parent' ? P.name : K.nameOf(t.to)} — ${KIND[t.kind] || t.kind}`))))));
}

/** The policy editor: reserve, protected minimum, emergency reserve, what is kept and what is sent up, loans first. */
function policyEditor(G, id, pol, go) {
  const f = (k, label, w = 90) => { const el = h('input', { type: 'number', class: 'debug-qty', min: 0, value: pol[k], style: `width:${w}px` }); return { k, el, node: h('label', { class: 'muted', style: 'margin-right:10px' }, label, ' ', el) }; };
  const fields = [f('targetReserve', 'Keep (reserve)'), f('minLiquidity', 'Protected minimum'), f('emergencyReserve', 'Extra while it owes'), f('retainPct', 'Keep % of profit', 60), f('distributePct', 'Send up %', 60)];
  const debt = h('input', { type: 'checkbox', checked: pol.debtFirst });
  return h('div', { style: 'margin-top:6px;padding:6px;border:1px solid #556;border-radius:4px' },
    h('div', { class: 'desc' }, id === null ? 'The default for every subsidiary that has no policy of its own.' : 'This subsidiary\'s own policy. Profit that is not in cash above the reserve is never sent.'),
    h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap' }, ...fields.map((x) => x.node), h('label', { class: 'muted' }, debt, ' repay the parent\'s loans first')),
    h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' },
      h('button', { class: 'small primary', onclick: () => go(G.setPolicy(id, { ...Object.fromEntries(fields.map((x) => [x.k, Number(x.el.value)])), debtFirst: debt.checked })) }, 'Save'),
      id !== null ? h('button', { class: 'small ghost', onclick: () => go(G.clearPolicy(id)) }, 'Use the default') : null));
}
