// The Bonds app (v0.69.0; v0.83.0 in the OberPad's pattern): what your bonds are worth and pay as the one figure, then one switch for the
// three kinds — the First Bank's government bonds, listed companies' bonds, and the eight countries' bonds. An offer is one line with a Buy
// button that opens the amounts; every explanation is behind a "?". Read from game.corp.bonds, .credit and .sovereign; every button calls them.
import { h } from './panels.js';
import { hero, tiles, row, help, note, n, pc } from './tabletKit.js';

export function bondsApp(ui, body, open) {
  const g = ui.game;
  const B = g.corp.bonds;
  const C = g.corp.credit;
  const Sv = g.corp.sovereign;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); ui.bondOpen = null; open('Bonds'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const view = ['gov', 'corp', 'foreign'].includes(ui.bondView) ? ui.bondView : 'gov';
  const P = B.portfolio();
  const PC = C.portfolio();
  const PF = Sv.portfolio();
  const value = P.value + PC.value + PF.value;
  const perMonth = [...P.rows, ...PC.rows, ...PF.rows].reduce((a, r) => a + (r.perMonth || 0), 0);
  const held = P.rows.length + PC.rows.length + PF.rows.length;
  const extra = [g.corp.geo.premium() > 0 ? `wars and embargoes add ${pc(g.corp.geo.premium())}` : null, g.robbery.premium() > 0 ? `the robbery adds ${pc(g.robbery.premium())}` : null].filter(Boolean);
  body.append(
    hero({ label: 'Your bonds are worth', value: n(value), sub: `${n(perMonth)} a month in coupons · policy rate ${pc(B.rate())}${extra.length ? ` · ${extra.join(', ')}` : ''}` }),
    tiles([{ n: String(held), t: 'bonds held' }, { n: n(P.earned + PC.earned + PF.earned), t: 'coupons received' }, { n: n(g.player.money), t: 'your obols' }]),
    h('div', { class: 'tb-seg two three' }, ...[['gov', 'Government'], ['corp', 'Companies'], ['foreign', 'Foreign']].map(([id, l]) => h('button', { class: view === id ? 'on' : '', onclick: () => { ui.bondView = id; ui.bondOpen = null; open('Bonds'); } }, l))));

  /** An offer's Buy button and, once pressed, the amounts to buy. */
  const buyer = (key, amounts, can, doBuy) => [
    h('button', { class: 'tb-mini pri', onclick: () => { ui.bondOpen = ui.bondOpen === key ? null : key; open('Bonds'); } }, ui.bondOpen === key ? 'Close' : 'Buy ›')];
  const amountsRow = (key, amounts, can, doBuy) => (ui.bondOpen === key ? h('div', { class: 'tb-chips tb-sheet' }, ...amounts.map((f) => h('button', { class: 'tb-chip', disabled: !can(f), onclick: () => go(doBuy(f)) }, `Buy ${n(f)}`))) : null);
  const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
  const logHelp = (log, label) => (log.length ? [help(label, ...log.slice(-6).reverse().map((l) => `Day ${l.day} · ${l.text}`))] : []);

  if (view === 'gov') {
    body.append(list(...B.offers().map((o) => [
      row({ icon: '📜', title: `${o.years}-year bond`, sub: `${n((100000 * o.coupon) / 12)} a month on 100,000 · you may still buy ${n(o.room)}`, tag: `${pc(o.coupon)}`, action: buyer(`g${o.years}`)[0] }),
      amountsRow(`g${o.years}`, [1000, 10000, 100000], (f) => g.player.money >= f && o.room >= f, (f) => B.buy(o.years, f))])));
    if (P.rows.length) body.append(list(...P.rows.map((r) => row({ icon: '💼', title: `${n(r.face)} · ${r.years}-year at ${pc(r.coupon)}`, sub: `${n(r.perMonth)} a month · ${n(r.daysLeft)} days left · worth ${n(r.value)} (paid ${n(r.cost)})`, action: h('button', { class: 'tb-mini', onclick: () => go(B.sell(r.id)) }, `Sell ${n(r.sale)}`) }))));
    body.append(help('How government bonds work ›', 'Government bonds, sold at par by the First Bank of Halvermouth. A bond pays a month\'s coupon every thirty days and its face at the end. Its coupon is the policy rate plus a premium for the term, fixed when you buy. Sell it back at any time for what it is worth at today\'s yield, less a half-percent spread: when rates rise, bonds you hold are worth less; when they fall, more. They are your own investment, paid for from your wallet.'), ...logHelp(B.peek()?.log || [], 'Recent ›'));
  } else if (view === 'corp') {
    const all = C.offers();
    const offers = ui.bondAll ? all : all.slice(0, 5);
    body.append(offers.length
      ? list(...offers.map((o) => [
        row({ icon: '🏢', title: `${o.ticker} · ${o.name}`, sub: `${pc(o.coupon)} a year · price ${o.price.toFixed(1)}${o.held > 0 ? ` · you hold ${n(o.held)}` : ''}`, tag: o.rating, tone: o.rating === 'AA' || o.rating === 'A' ? 'good' : o.rating === 'CCC' ? 'neg' : '', action: buyer(`c${o.id}`)[0] }),
        amountsRow(`c${o.id}`, [1000, 10000], (f) => o.room >= f && g.player.money >= Math.round(f * o.price / 100), (f) => C.buy(o.id, f))]))
      : h('div', { class: 'tb-card' }, row({ icon: '🏢', title: 'No company has issued yet', sub: 'They do once the exchange has priced them, after the first morning.' })));
    if (all.length > 5) body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn', onclick: () => { ui.bondAll = !ui.bondAll; open('Bonds'); } }, ui.bondAll ? 'Show fewer' : `Show all ${all.length} ›`)));
    if (PC.rows.length) body.append(list(...PC.rows.map((r) => row({ icon: '💼', title: `${n(r.face)} of ${r.ticker}`, sub: `${n(r.perMonth)} a month · ${n(r.daysLeft)} days left · worth ${n(r.value)} (paid ${n(r.cost)})`, tag: r.rating, action: h('button', { class: 'tb-mini', onclick: () => go(C.sell(r.id)) }, `Sell ${n(r.sale)}`) }))));
    body.append(help('How company bonds work ›', 'Three-year bonds issued by the listed companies of the wider world, at par, with a coupon of the policy rate, the term premium and a credit spread for the company\'s rating. A rating follows the company\'s own books (what it owes against what it owns, whether it earns, whether it is in distress), and so does the bond\'s price. A company that fails defaults: you get back a part of what you lent, once; one that is taken over repays at par. You may hold at most a twentieth of an issue; selling costs a 1% spread.'), ...logHelp(C.peek()?.log || [], 'Recent ›'));
  } else {
    const allF = Sv.offers();
    const offers = ui.bondAll ? allF : allF.slice(0, 5);
    const why = (c) => [c.war > 0.01 ? `at war (${(c.war * 100).toFixed(0)}% of its full effect)` : null, c.embargo > 0.01 ? 'under an arms embargo' : null, c.treasury < 1 ? `its treasury is at ${(c.treasury * 100).toFixed(0)}% of what it began with` : null, `a ${c.trait < 0.25 ? 'light' : c.trait < 0.45 ? 'moderate' : 'heavy'} debt load`].filter(Boolean).join(' · ');
    body.append(offers.length
      ? list(...offers.map((o) => [
        row({ icon: '🌐', title: o.name, sub: `${pc(o.coupon)} a year · price ${o.price.toFixed(1)}`, tag: o.status === 'delayed' ? `${o.rating} · delayed` : o.rating, tone: o.rating === 'AA' || o.rating === 'A' ? 'good' : o.rating === 'CCC' || o.status === 'delayed' ? 'neg' : '', action: o.status === 'open' ? buyer(`f${o.country || o.name}`)[0] : null }),
        amountsRow(`f${o.country || o.name}`, [1000, 10000], (f) => o.status === 'open' && o.room >= f && g.player.money >= Math.round(f * o.price / 100), (f) => Sv.buy(o.country, f))]))
      : h('div', { class: 'tb-card' }, row({ icon: '🌐', title: 'No country has issued yet', sub: 'They do once the arms market is running.' })));
    if (PF.rows.length) body.append(list(...PF.rows.map((r) => row({ icon: '💼', title: `${n(r.face)} of ${r.name}`, sub: `${n(r.perMonth)} a month${r.owed ? ` · ${n(r.owed)} owed to you, delayed` : ''} · ${n(r.daysLeft)} days left · worth ${n(r.value)} (paid ${n(r.cost)})`, tag: r.issueStatus === 'delayed' ? `${r.rating} · delayed` : r.rating, action: h('button', { class: 'tb-mini', onclick: () => go(Sv.sell(r.id)) }, `Sell ${n(r.sale)}`) }))));
    body.append(...(allF.length > 5 ? [h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn', onclick: () => { ui.bondAll = !ui.bondAll; open('Bonds'); } }, ui.bondAll ? 'Show fewer' : `Show all ${allF.length} ›`))] : []), ...(offers.length ? [help('Why these ratings ›', ...allF.map((o) => `${o.name}: ${why(o.causes)}.`))] : []), help('How foreign bonds work ›', 'Each of the eight countries issues a three-year bond. Its rating follows its own finances — how much it owes, the wars it is in, an embargo on it, and how far its treasury has fallen — and so does the bond\'s price. A country that stays at the very top of the strain for ten days delays its payments (what it owes you is kept and paid when it recovers), and for forty restructures: you get back a part of the face, once, and the issue ends. Nothing here is random, and none of it changes the arms market. You may hold at most a twentieth of an issue; selling costs a 1.5% spread.'), ...logHelp(Sv.peek()?.log || [], 'Recent ›'));
  }
}
