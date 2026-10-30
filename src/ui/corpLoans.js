// The Loans app (v0.73.0): borrowing from Lariat State Bank against the shares and bonds you hold. Read from game.corp.lending;
// every button calls it. Wallet loans only — no company is touched.
import { h } from './panels.js';
import { TERMS, MIN_LOAN, PENALTY, PURPOSES } from '../corp/lending.js';

const n = (x) => Math.round(x).toLocaleString();
const pc = (v) => `${(v * 100).toFixed(2)}%`;
const AMOUNTS = [5000, 25000, 100000];

export function loansApp(ui, body, open) {
  const g = ui.game;
  const L = g.corp.lending;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Loans'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));
  const C = L.capacity();
  const standing = Math.round(L.standing());
  body.append(
    h('p', { class: 'doc' }, `🏛️ Lariat State Bank lends to you, personally, against the shares and bonds you hold: half the value of shares, nine tenths of government bonds, and corporate bonds by rating. A loan is repaid in equal parts every thirty days with the month's interest, at a rate fixed when you sign it (the policy rate plus a spread). If you cannot pay an instalment it becomes arrears at ${pc(PENALTY)} above the loan's rate — nothing is ever taken from you — but you cannot borrow again until it is cleared, your borrowing record falls, and the holdings pledged against a loan cannot be sold while the rest would not secure what you owe.`),
    h('div', { class: 'grid2' }, stat('Your obols', n(g.player.money)), stat('Policy rate', pc(g.corp.bank.rate())), stat('Your holdings secure', n(C.total)), stat('You owe', n(C.owed)), stat('You may borrow', n(C.free)), stat('Borrowing record', `${standing} / 100`)));
  if (C.over > 0) body.append(h('p', { class: 'muted' }, `You owe ${n(C.over)} more than your holdings now secure (their prices fell or your record did). Nothing is taken; you simply cannot sell them or borrow more.`));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Pledged: what you hold'));
  if (!C.items.length) body.append(h('p', { class: 'muted' }, 'You hold no shares or bonds. Buy some in the Exchange or Bonds apps first.'));
  else body.append(h('div', { class: 'list' }, ...C.items.map((i) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, i.name, h('span', { class: 'tag' }, `${Math.round(i.advance * 100)}%`)), h('div', { class: 'desc' }, `Worth ${n(i.value)} · secures ${n(i.secures)}`))))));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Borrow'));
  if (L.inArrears()) body.append(h('p', { class: 'muted' }, 'You are behind on a loan: clear the arrears to borrow again.'));
  else if (C.free < MIN_LOAN) body.append(h('p', { class: 'muted' }, `The smallest loan is ${n(MIN_LOAN)} obols; you can borrow ${n(C.free)} now.`));
  else body.append(h('div', { class: 'list' }, ...TERMS.map((m) => {
    const amounts = AMOUNTS.filter((a) => a <= C.free);
    if (!amounts.length || (C.free > AMOUNTS.at(-1))) amounts.push(Math.floor(C.free));
    return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${m} months`),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:4px' }, ...amounts.map((a) => { const o = L.offer(a, m); return h('button', { class: 'small primary', title: `${pc(o.rate)} fixed; ${n(o.first)} the first month; ${n(o.interest)} interest in all`, onclick: () => go(L.borrow(a, m)) }, `${n(a)} · ${pc(o.rate)} · ${n(o.first)}/mo`); }))));
  })));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Your loans'));
  const loans = L.loans(true);
  if (!loans.length) body.append(h('p', { class: 'muted' }, 'You have never borrowed.'));
  else body.append(h('div', { class: 'list' }, ...loans.slice().reverse().map((l) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
    h('div', { class: 'name' }, `${n(l.principal)} at ${pc(l.rate)}`, h('span', { class: `tag${l.status === 'repaid' ? ' good' : l.arrears > 0 ? ' neg' : ''}` }, l.status === 'repaid' ? 'repaid' : l.arrears > 0 ? 'in arrears' : 'open')),
    h('div', { class: 'desc' }, l.status === 'repaid' ? `Signed day ${l.signed}, repaid day ${l.closed}; ${n(l.interestPaid)} interest paid.` : `Owed ${n(l.outstanding)}${l.arrears ? ` + ${n(l.arrears)} arrears (at ${pc(l.rate + PENALTY)})` : ''} · ${l.left} instalment${l.left === 1 ? '' : 's'} left · next on day ${l.due}`),
    l.status === 'repaid' ? null : h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:4px' },
      ...[1000, 10000].filter((a) => a < l.outstanding + l.arrears).map((a) => h('button', { class: 'small', disabled: g.player.money < a, onclick: () => go(L.repay(l.id, a)) }, `Repay ${n(a)}`)),
      h('button', { class: 'small primary', disabled: g.player.money < l.outstanding + l.arrears, onclick: () => go(L.repay(l.id, l.outstanding + l.arrears)) }, `Repay all (${n(l.outstanding + l.arrears)})`)))))));

  business();

  /** Loans to your companies (v0.74.0): the company borrows on its own books; a guarantee is yours to choose and is spelled out. */
  function business() {
    const BL = g.corp.business;
    body.append(h('h3', { style: 'margin:14px 0 4px' }, 'Business loans'),
      h('p', { class: 'muted', style: 'font-size:12px' }, 'Lariat State Bank also lends to a company of yours that holds its own cash, on its own books alone: a share of what it owns and some months of what it earns. The money goes into the company\'s account and the instalments come out of it (interest is a cost to the company; the principal is not). If it misses one, it is in arrears at the penalty rate, nothing is seized, its managers stop hiring, bidding and expanding, and the bank collects what the account takes in until it is cleared.'));
    const ids = BL.eligible();
    if (!ids.length) { body.append(h('p', { class: 'muted' }, 'None of your companies holds its own cash yet: fund one from its tablet app first.')); }
    else {
      const id = ids.includes(ui.loanCo) ? ui.loanCo : ids[0];
      const v = BL.view(id);
      const gs = BL.guarantees(id);
      const gu = gs.includes(ui.loanGuar) ? ui.loanGuar : 'none';
      const purpose = PURPOSES.includes(ui.loanPurpose) ? ui.loanPurpose : PURPOSES[0];
      const chip = (label, on, fn) => h('button', { class: `small${on ? ' primary' : ''}`, onclick: fn }, label);
      body.append(
        h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:4px;margin:4px 0' }, ...ids.map((c) => chip(g.corp.nameOf(c), c === id, () => { ui.loanCo = c; open('Loans'); }))),
        h('div', { class: 'grid2' }, stat('It holds', n(v.cash)), stat('It may owe in all', n(v.total)), stat('It owes the bank', n(v.owed)), stat('It may borrow', n(v.free)), stat('Its record', `${Math.round(v.standing)} / 100`), stat('Profit a month (est.)', n(v.monthly))),
        h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:4px;margin:6px 0' }, h('span', { class: 'muted' }, 'Guarantee:'), ...gs.map((x) => chip(x === 'none' ? 'None' : x === 'personal' ? 'You' : 'The parent', x === gu, () => { ui.loanGuar = x; open('Loans'); }))),
        h('p', { class: 'muted', style: 'font-size:12px' }, BL.guaranteeText(id, gu)),
        h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin:4px 0' }, h('span', { class: 'muted' }, 'For:'), h('select', { onchange: (e) => { ui.loanPurpose = e.target.value; } }, ...PURPOSES.map((x) => h('option', { value: x, selected: x === purpose }, x)))));
      if (BL.inArrears(id)) body.append(h('p', { class: 'muted' }, `${v.name} is behind on a loan: its managers are not hiring, bidding or expanding.`));
      else if (v.free < MIN_LOAN) body.append(h('p', { class: 'muted' }, `${v.name} cannot borrow ${n(MIN_LOAN)} against its books today.`));
      else body.append(h('div', { class: 'list' }, ...TERMS.map((m) => {
        const amounts = AMOUNTS.filter((a) => a <= v.free);
        if (!amounts.length || v.free > AMOUNTS.at(-1)) amounts.push(Math.floor(v.free));
        return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `${m} months`),
          h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:4px' }, ...amounts.map((a) => { const o = BL.offer(id, a, m, gu); return h('button', { class: 'small primary', title: `${n(o.interest)} interest in all`, onclick: () => go(BL.borrow(id, a, m, { guarantee: gu, purpose: ui.loanPurpose || purpose })) }, `${n(a)} · ${pc(o.rate)} · ${n(o.first)}/mo`); }))));
      })));
    }
    const all = BL.loans(null, true);
    if (all.length) body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Company loans'), h('div', { class: 'list' }, ...all.slice().reverse().map((l) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${g.corp.nameOf(l.borrower)} · ${n(l.principal)} at ${pc(l.rate)}`, h('span', { class: `tag${l.status === 'repaid' ? ' good' : l.arrears > 0 ? ' neg' : ''}` }, l.status === 'repaid' ? 'repaid' : l.arrears > 0 ? 'in arrears' : 'open'), l.guarantee !== 'none' ? h('span', { class: 'tag' }, `guaranteed by ${l.guarantee === 'parent' ? 'the parent' : 'you'}`) : null),
      h('div', { class: 'desc' }, `${l.purpose} · ` + (l.status === 'repaid' ? `signed day ${l.signed}, repaid day ${l.closed}; ${n(l.interestPaid)} interest paid.` : `owes ${n(l.outstanding)}${l.arrears ? ` + ${n(l.arrears)} arrears (at ${pc(l.rate + PENALTY)})` : ''} · ${l.left} instalment${l.left === 1 ? '' : 's'} left · next day ${l.due}${l.called ? ` · the parent has paid ${n(l.called)} under its guarantee` : ''}`)),
      l.status === 'repaid' ? null : h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:4px' }, h('button', { class: 'small primary', disabled: g.corp.cashOf(l.borrower) < l.outstanding + l.arrears, onclick: () => go(BL.repay(l.id, l.outstanding + l.arrears)) }, `Repay all from the company (${n(l.outstanding + l.arrears)})`)))))));
  }

  const log = (L.peek()?.log || []).slice(-6).reverse();
  if (log.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((x) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${x.day} · ${x.text}`))))));
}
