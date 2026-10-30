// The Loans app (v0.73.0): borrowing from Lariat State Bank against the shares and bonds you hold. Read from game.corp.lending;
// every button calls it. Wallet loans only — no company is touched.
import { h } from './panels.js';
import { TERMS, MIN_LOAN, PENALTY } from '../corp/lending.js';

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

  const log = (L.peek()?.log || []).slice(-6).reverse();
  if (log.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((x) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${x.day} · ${x.text}`))))));
}
