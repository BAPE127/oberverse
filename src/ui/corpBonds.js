// The Bonds app (v0.69.0): government bonds from the First Bank of Halvermouth. Read from game.corp.bonds; every button calls it.
import { h } from './panels.js';

const n = (x) => Math.round(x).toLocaleString();
const pc = (v) => `${(v * 100).toFixed(2)}%`;

export function bondsApp(ui, body, open) {
  const g = ui.game;
  const B = g.corp.bonds;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Bonds'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));
  const P = B.portfolio();
  body.append(
    h('p', { class: 'doc' }, '📜 Government bonds, sold at par by the First Bank of Halvermouth. A bond pays a month\'s coupon every thirty days and its face at the end. Its coupon is the policy rate plus a premium for the term, fixed when you buy. Sell it back at any time for what it is worth at today\'s yield, less a half-percent spread: when rates rise, bonds you hold are worth less; when they fall, more. They are your own investment, paid for from your wallet.'),
    h('div', { class: 'grid2' }, stat('Your obols', n(g.player.money)), stat('Policy rate', pc(B.rate())), ...(g.corp.geo.premium() > 0 ? [stat('Added by wars and embargoes', `+${pc(g.corp.geo.premium())}`)] : []), stat('Bonds held, at today\'s yield', n(P.value)), stat('Coupons received', n(P.earned))));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'On offer today'));
  body.append(h('div', { class: 'list' }, ...B.offers().map((o) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
    h('div', { class: 'name' }, `${o.years}-year bond`, h('span', { class: 'tag' }, `${pc(o.coupon)} a year`), h('span', { class: 'tag' }, `${n((100000 * o.coupon) / 12)} a month on 100,000`)),
    h('div', { class: 'desc' }, `You may still buy ${n(o.room)} of face value.`),
    h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:4px' }, ...[1000, 10000, 100000].map((f) => h('button', { class: 'small primary', disabled: g.player.money < f || o.room < f, onclick: () => go(B.buy(o.years, f)) }, `Buy ${n(f)}`))))))));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Your bonds'));
  if (!P.rows.length) body.append(h('p', { class: 'muted' }, 'You hold none.'));
  else body.append(h('div', { class: 'list' }, ...P.rows.map((r) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
    h('div', { class: 'name' }, `${n(r.face)} · ${r.years}-year at ${pc(r.coupon)}`, h('span', { class: 'tag' }, `${n(r.daysLeft)} days left`)),
    h('div', { class: 'desc' }, `${n(r.perMonth)} a month · ${r.coupons} coupons received · worth ${n(r.value)} today (paid ${n(r.cost)}); selling gets ${n(r.sale)}`),
    h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small', onclick: () => go(B.sell(r.id)) }, `Sell for ${n(r.sale)}`)))))));
  corporate();
  foreign();

  function corporate() {
    const C = g.corp.credit;
    const offers = C.offers();
    const held = C.portfolio();
    body.append(h('h3', { style: 'margin:14px 0 4px' }, 'Corporate bonds'),
      h('p', { class: 'muted', style: 'font-size:12px' }, 'Three-year bonds issued by the listed companies of the wider world, at par, with a coupon of the policy rate, the term premium and a credit spread for the company\'s rating. A rating follows the company\'s own books (what it owes against what it owns, whether it earns, whether it is in distress), and so does the bond\'s price. A company that fails defaults: you get back a part of what you lent, once; one that is taken over repays at par. You may hold at most a twentieth of an issue; selling costs a 1% spread.'));
    if (!offers.length) body.append(h('p', { class: 'muted' }, 'No company has issued yet: they do once the exchange has priced them, after the first morning.'));
    else body.append(h('div', { class: 'list' }, ...offers.map((o) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${o.ticker} · ${o.name}`, h('span', { class: `tag${o.rating === 'AA' || o.rating === 'A' ? ' good' : o.rating === 'CCC' ? ' neg' : ''}` }, o.rating), h('span', { class: 'tag' }, `${pc(o.coupon)} a year`), o.held > 0 ? h('span', { class: 'tag good' }, `hold ${n(o.held)}`) : null),
      h('div', { class: 'desc' }, `Issue ${n(o.face)} · due day ${o.end} · priced at ${o.price.toFixed(1)} per 100 (yield ${pc(o.yield)}) · you may buy ${n(o.room)} more`),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:4px' }, ...[1000, 10000].map((f) => h('button', { class: 'small primary', disabled: o.room < f || g.player.money < Math.round(f * o.price / 100), onclick: () => go(C.buy(o.id, f)) }, `Buy ${n(f)} (${n(f * o.price / 100)})`))))))));
    if (held.rows.length) body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Your corporate bonds'), h('div', { class: 'list' }, ...held.rows.map((r) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${n(r.face)} of ${r.ticker} · ${r.name}`, h('span', { class: 'tag' }, r.rating), h('span', { class: 'tag' }, `${n(r.daysLeft)} days left`)),
      h('div', { class: 'desc' }, `${n(r.perMonth)} a month · ${r.coupons} coupons · worth ${n(r.value)} at its rating today (paid ${n(r.cost)}); selling gets ${n(r.sale)}`),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small', onclick: () => go(C.sell(r.id)) }, `Sell for ${n(r.sale)}`)))))));
    const clog = (C.peek()?.log || []).slice(-4).reverse();
    if (clog.length) body.append(h('div', { class: 'list' }, ...clog.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`))))));
  }

  /** Foreign government bonds (v0.77.0): the eight countries, rated from their own finances and quarrels. */
  function foreign() {
    const Sv = g.corp.sovereign;
    const offers = Sv.offers();
    const held = Sv.portfolio();
    const why = (c) => [c.war > 0.01 ? `at war (${(c.war * 100).toFixed(0)}% of its full effect)` : null, c.embargo > 0.01 ? 'under an arms embargo' : null, c.treasury < 1 ? `its treasury is at ${(c.treasury * 100).toFixed(0)}% of what it began with` : null, `a ${c.trait < 0.25 ? 'light' : c.trait < 0.45 ? 'moderate' : 'heavy'} debt load`].filter(Boolean).join(' · ');
    body.append(h('h3', { style: 'margin:14px 0 4px' }, 'Foreign government bonds'),
      h('p', { class: 'muted', style: 'font-size:12px' }, 'Each of the eight countries issues a three-year bond. Its rating follows its own finances — how much it owes, the wars it is in, an embargo on it, and how far its treasury has fallen — and so does the bond\'s price. A country that stays at the very top of the strain for ten days delays its payments (what it owes you is kept and paid when it recovers), and for forty restructures: you get back a part of the face, once, and the issue ends. Nothing here is random, and none of it changes the arms market. You may hold at most a twentieth of an issue; selling costs a 1.5% spread.'));
    if (!offers.length) body.append(h('p', { class: 'muted' }, 'No country has issued yet: they do once the arms market is running.'));
    else body.append(h('div', { class: 'list' }, ...offers.map((o) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, o.name, h('span', { class: `tag${o.rating === 'AA' || o.rating === 'A' ? ' good' : o.rating === 'CCC' || o.status === 'delayed' ? ' neg' : ''}` }, o.status === 'delayed' ? `${o.rating} · delayed` : o.rating), h('span', { class: 'tag' }, `${pc(o.coupon)} a year`), o.held > 0 ? h('span', { class: 'tag good' }, `hold ${n(o.held)}`) : null),
      h('div', { class: 'desc' }, `${why(o.causes)} · priced at ${o.price.toFixed(1)} per 100 (yield ${pc(o.yield)}) · due day ${o.end} · you may buy ${n(o.room)} more`),
      h('div', { class: 'row', style: 'justify-content:flex-start;gap:6px;margin-top:4px' }, ...[1000, 10000].map((f) => h('button', { class: 'small primary', disabled: o.status !== 'open' || o.room < f || g.player.money < Math.round(f * o.price / 100), onclick: () => go(Sv.buy(o.country, f)) }, `Buy ${n(f)} (${n(f * o.price / 100)})`))))))));
    if (held.rows.length) body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Your foreign bonds'), h('div', { class: 'list' }, ...held.rows.map((r) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
      h('div', { class: 'name' }, `${n(r.face)} of ${r.name}`, h('span', { class: 'tag' }, r.issueStatus === 'delayed' ? `${r.rating} · payments delayed` : r.rating), h('span', { class: 'tag' }, `${n(r.daysLeft)} days left`)),
      h('div', { class: 'desc' }, `${n(r.perMonth)} a month · ${r.coupons} coupons${r.owed ? ` · ${n(r.owed)} owed to you, delayed` : ''} · worth ${n(r.value)} at its rating today (paid ${n(r.cost)}); selling gets ${n(r.sale)}`),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small', onclick: () => go(Sv.sell(r.id)) }, `Sell for ${n(r.sale)}`)))))));
    const slog = (Sv.peek()?.log || []).slice(-4).reverse();
    if (slog.length) body.append(h('div', { class: 'list' }, ...slog.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`))))));
  }

  const log = (B.peek()?.log || []).slice(-6).reverse();
  if (log.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`))))));
}
