// The Loans app (v0.73.0; v0.83.0 in the OberPad's pattern): borrowing from Lariat State Bank against the shares and bonds you hold —
// how much you may borrow as the one figure, what you owe and when it is next due as tiles, Borrow and Repay as the two buttons — and,
// on its own switch, loans to your companies. Read from game.corp.lending and game.corp.business; every button calls them.
import { h } from './panels.js';
import { TERMS, MIN_LOAN, PENALTY, PURPOSES } from '../corp/lending.js';
import { hero, tiles, row, help, note, buttons, big, n, pc } from './tabletKit.js';

const AMOUNTS = [5000, 25000, 100000];

/** What a loan costs, stated before it is signed (brief 12.1): the card both views show for a draft. */
function termsCard(o, amount, months, who, extra, onAccept, onCancel) {
  const last = amount / months;
  return h('div', { class: 'tb-card tb-terms' },
    h('b', {}, `${who === 'You' ? 'You borrow' : `${who} borrows`} ${n(amount)} over ${months} months at ${pc(o.rate)}, fixed`),
    h('div', { class: 'tb-sub' }, `First instalment ${n(o.first)}, falling by about ${n((amount * o.rate) / 12 / months)} a month to ${n(last + (last * o.rate) / 12)} at the end · interest in all ${n(o.interest)} · you repay ${n(o.total)} in all.`),
    h('div', { class: 'tb-sub' }, `If an instalment is missed it becomes arrears at ${pc(o.rate + PENALTY)}; nothing is ever seized.`),
    ...extra.map((t) => h('div', { class: 'tb-sub' }, t)),
    buttons(big(`Accept: borrow ${n(amount)}`, onAccept, 'pri'), big('Cancel', onCancel)));
}

export function loansApp(ui, body, open) {
  const g = ui.game;
  const L = g.corp.lending;
  const view = ui.loanView === 'companies' && g.corp.business.eligible().length ? 'companies' : 'you';
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Loans'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const hasCos = g.corp.business.eligible().length > 0;
  if (hasCos) body.append(h('div', { class: 'tb-seg two' }, h('button', { class: view === 'you' ? 'on' : '', onclick: () => { ui.loanView = 'you'; open('Loans'); } }, 'You'), h('button', { class: view === 'companies' ? 'on' : '', onclick: () => { ui.loanView = 'companies'; open('Loans'); } }, 'Your companies')));
  if (view === 'you') personal(); else business();

  function personal() {
    const C = L.capacity();
    const standing = Math.round(L.standing());
    const loans = L.loans(true);
    const open_ = loans.filter((l) => l.status !== 'repaid');
    const nextDue = open_.length ? Math.min(...open_.map((l) => l.due)) - g.clock.day : null;
    body.append(
      hero({ label: 'You can borrow', value: n(C.free), sub: `policy rate ${pc(g.corp.bank.rate())} · holdings secure ${n(C.total)}`, ring: C.total > 0 ? C.owed / C.total : 0 }),
      tiles([{ n: n(C.owed), t: 'you owe', tone: C.over > 0 ? 'neg' : '' }, { n: `${standing}`, t: 'borrowing record / 100', tone: standing >= 60 ? 'good' : 'neg' }, { n: nextDue === null ? '—' : `${Math.max(0, nextDue)} d`, t: 'next payment' }]));
    if (C.over > 0) body.append(h('div', { class: 'tb-note warn' }, `You owe ${n(C.over)} more than your holdings now secure. Nothing is taken; you just cannot sell them or borrow more.`));
    const d0 = ui.loanDraft?.who === 'you' ? ui.loanDraft : null;
    if (d0) body.append(termsCard(L.offer(d0.amount, d0.months), d0.amount, d0.months, 'You', [], () => { ui.loanDraft = null; go(L.borrow(d0.amount, d0.months)); }, () => { ui.loanDraft = null; open('Loans'); }));
    else {
      const total = open_.reduce((a, l) => a + l.outstanding + l.arrears, 0);
      const blocked = L.inArrears() ? 'Clear the arrears to borrow again.' : C.free < MIN_LOAN ? (C.items.length ? `The smallest loan is ${n(MIN_LOAN)}; you can borrow ${n(C.free)} now.` : 'Buy shares or bonds first: they are what a loan is secured on.') : null;
      body.append(buttons(big('＋ Borrow', () => { ui.loanSheet = !ui.loanSheet; open('Loans'); }, 'pri', Boolean(blocked)), big('Repay', () => { ui.repaySheet = !ui.repaySheet; open('Loans'); }, '', !open_.length || g.player.money <= 0)));
      if (blocked) body.append(h('div', { class: 'tb-sub' }, blocked));
      if (ui.loanSheet && !blocked) {
        const term = TERMS.includes(ui.loanTerm) ? ui.loanTerm : TERMS[0];
        const amounts = AMOUNTS.filter((a) => a <= C.free);
        if (!amounts.length || C.free > AMOUNTS.at(-1)) amounts.push(Math.floor(C.free));
        body.append(h('div', { class: 'tb-card' }, h('div', { class: 'tb-label' }, 'How long'), h('div', { class: 'tb-chips' }, ...TERMS.map((m) => h('button', { class: `tb-chip${m === term ? ' on' : ''}`, onclick: () => { ui.loanTerm = m; open('Loans'); } }, `${m} months`))),
          h('div', { class: 'tb-label', style: 'margin-top:8px' }, 'How much'), h('div', { class: 'tb-chips' }, ...amounts.map((a) => { const o = L.offer(a, term); return h('button', { class: 'tb-chip', title: `${pc(o.rate)}, first instalment ${n(o.first)}`, onclick: () => { ui.loanDraft = { who: 'you', amount: a, months: term }; ui.loanSheet = false; open('Loans'); } }, `${n(a)} · ${pc(o.rate)}`); }))));
      }
      if (ui.repaySheet && open_.length) body.append(h('div', { class: 'tb-card' }, h('div', { class: 'tb-label' }, 'Repay'), h('button', { class: 'tb-chip on', disabled: g.player.money < total, onclick: () => { for (const l of open_) L.repay(l.id, l.outstanding + l.arrears); ui.repaySheet = false; go({ ok: true, text: `Repaid ${n(total)} in all.` }); } }, `Everything (${n(total)})`)));
    }
    body.append(h('div', { class: 'tb-card list' }, ...(loans.length ? loans.slice().reverse().slice(0, 6).map((l) => {
      const owed = l.outstanding + l.arrears;
      return row({ icon: l.status === 'repaid' ? '✔' : '📄', title: `${n(l.principal)} · ${pc(l.rate)}`, sub: l.status === 'repaid' ? `repaid day ${l.closed}; ${n(l.interestPaid)} interest` : `owes ${n(owed)} · ${l.left} instalments left · due day ${l.due}${l.arrears ? ` · arrears at ${pc(l.rate + PENALTY)}` : ''}`, tag: l.status === 'repaid' ? 'repaid' : l.arrears > 0 ? 'behind' : 'on time', tone: l.status === 'repaid' ? 'good' : l.arrears > 0 ? 'neg' : 'good',
        action: l.status === 'repaid' ? null : h('button', { class: 'tb-mini', disabled: g.player.money < owed, onclick: () => go(L.repay(l.id, owed)) }, `Repay ${n(owed)}`) });
    }) : [row({ icon: '📄', title: 'You have never borrowed' })])));
    body.append(
      help('What backs your loans ›', ...(C.items.length ? C.items.map((i) => `${i.name}: counted at ${Math.round(i.advance * 100)}%.`) : ['You hold no shares or bonds. Buy some in the Exchange or Bonds apps first.'])),
      help('How the limit is worked out ›', 'Lariat State Bank lends to you, personally, against the shares and bonds you hold: half the value of shares, nine tenths of government bonds, and corporate bonds by rating. A loan is repaid in equal parts every thirty days with the month\'s interest, at a rate fixed when you sign it (the policy rate plus a spread). If you cannot pay an instalment it becomes arrears at 5.00% above the loan\'s rate — nothing is ever taken from you — but you cannot borrow again until it is cleared, your borrowing record falls, and the holdings pledged against a loan cannot be sold while the rest would not secure what you owe.'),
      ...((L.peek()?.log || []).length ? [help('Recent ›', ...(L.peek().log.slice(-6).reverse().map((x) => `Day ${x.day} · ${x.text}`)))] : []));
  }

  /** Loans to your companies (v0.74.0): the company borrows on its own books; a guarantee is yours to choose and is spelled out. */
  function business() {
    const BL = g.corp.business;
    const ids = BL.eligible();
    const id = ids.includes(ui.loanCo) ? ui.loanCo : ids[0];
    const v = BL.view(id);
    const gs = BL.guarantees(id);
    const gu = gs.includes(ui.loanGuar) ? ui.loanGuar : 'none';
    const purpose = PURPOSES.includes(ui.loanPurpose) ? ui.loanPurpose : PURPOSES[0];
    const chip = (label, on, fn) => h('button', { class: `tb-chip${on ? ' on' : ''}`, onclick: fn }, label);
    body.append(
      h('div', { class: 'tb-chips' }, ...ids.map((c) => chip(g.corp.nameOf(c), c === id, () => { ui.loanCo = c; open('Loans'); }))),
      hero({ label: `${v.name} may borrow`, value: n(v.free), sub: `it holds ${n(v.cash)} · may owe ${n(v.total)} in all` }),
      tiles([{ n: n(v.owed), t: 'it owes the bank' }, { n: `${Math.round(v.standing)}`, t: 'its record / 100', tone: v.standing >= 60 ? 'good' : 'neg' }, { n: gu === 'none' ? 'None' : gu === 'personal' ? 'You' : 'Parent', t: 'guarantee' }]));
    const dc = ui.loanDraft && ui.loanDraft.who === id ? ui.loanDraft : null;
    if (dc) body.append(termsCard(BL.offer(id, dc.amount, dc.months, dc.guarantee), dc.amount, dc.months, v.name, [`For: ${dc.purpose}.`, BL.guaranteeText(id, dc.guarantee)], () => { ui.loanDraft = null; go(BL.borrow(id, dc.amount, dc.months, { guarantee: dc.guarantee, purpose: dc.purpose })); }, () => { ui.loanDraft = null; open('Loans'); }));
    else {
      const blocked = BL.inArrears(id) ? `${v.name} is behind on a loan: its managers are not hiring, bidding or expanding.` : v.free < MIN_LOAN ? `${v.name} cannot borrow ${n(MIN_LOAN)} against its books today.` : null;
      body.append(buttons(big('＋ Borrow for it', () => { ui.loanSheet = !ui.loanSheet; open('Loans'); }, 'pri', Boolean(blocked))));
      if (blocked) body.append(h('div', { class: 'tb-sub' }, blocked));
      if (ui.loanSheet && !blocked) {
        const term = TERMS.includes(ui.loanTerm) ? ui.loanTerm : TERMS[0];
        const amounts = AMOUNTS.filter((a) => a <= v.free);
        if (!amounts.length || v.free > AMOUNTS.at(-1)) amounts.push(Math.floor(v.free));
        body.append(h('div', { class: 'tb-card' },
          h('div', { class: 'tb-label' }, 'Guarantee'), h('div', { class: 'tb-chips' }, ...gs.map((x) => chip(x === 'none' ? 'None' : x === 'personal' ? 'You' : 'The parent', x === gu, () => { ui.loanGuar = x; open('Loans'); }))),
          h('div', { class: 'tb-sub' }, BL.guaranteeText(id, gu)),
          h('div', { class: 'tb-label', style: 'margin-top:8px' }, 'For'), h('select', { class: 'tb-select', onchange: (e) => { ui.loanPurpose = e.target.value; } }, ...PURPOSES.map((x) => h('option', { value: x, selected: x === purpose }, x))),
          h('div', { class: 'tb-label', style: 'margin-top:8px' }, 'How long'), h('div', { class: 'tb-chips' }, ...TERMS.map((m) => chip(`${m} months`, m === term, () => { ui.loanTerm = m; open('Loans'); }))),
          h('div', { class: 'tb-label', style: 'margin-top:8px' }, 'How much'), h('div', { class: 'tb-chips' }, ...amounts.map((a) => { const o = BL.offer(id, a, term, gu); return h('button', { class: 'tb-chip', onclick: () => { ui.loanDraft = { who: id, amount: a, months: term, guarantee: gu, purpose: ui.loanPurpose && PURPOSES.includes(ui.loanPurpose) ? ui.loanPurpose : purpose }; ui.loanSheet = false; open('Loans'); } }, `${n(a)} · ${pc(o.rate)}`); }))));
      }
    }
    const all = BL.loans(null, true);
    body.append(h('div', { class: 'tb-card list' }, ...(all.length ? all.slice().reverse().slice(0, 6).map((l) => {
      const owed = l.outstanding + l.arrears;
      return row({ icon: l.status === 'repaid' ? '✔' : '📄', title: `${g.corp.nameOf(l.borrower)} · ${n(l.principal)} · ${pc(l.rate)}`, sub: `${l.purpose} · ${l.status === 'repaid' ? `repaid day ${l.closed}` : `owes ${n(owed)}${l.arrears ? ` incl. arrears at ${pc(l.rate + PENALTY)}` : ''}`}`, tag: l.status === 'repaid' ? 'repaid' : l.arrears > 0 ? 'behind' : 'on time', tone: l.status === 'repaid' ? 'good' : l.arrears > 0 ? 'neg' : 'good',
        action: l.status === 'repaid' ? null : h('button', { class: 'tb-mini', disabled: g.corp.cashOf(l.borrower) < owed, onclick: () => go(BL.repay(l.id, owed)) }, `Repay ${n(owed)}`) });
    }) : [row({ icon: '📄', title: 'No company loans yet' })])));
    body.append(help('How a company\'s limit is worked out ›', 'Lariat State Bank also lends to a company of yours that holds its own cash, on its own books alone: 40% of what it is worth after all its debts (the bank\'s included), plus six months of what it earns, scaled by its own borrowing record. The money goes into the company\'s account and the instalments come out of it (interest is a cost to the company; the principal is not). If it misses one, it is in arrears at the penalty rate, nothing is seized, and its managers stop hiring, bidding and expanding until it has repaid what it is behind. A guarantee by you costs your own record only; a parent\'s guarantee is called once per missed instalment, only for what the parent holds.'));
  }
}
