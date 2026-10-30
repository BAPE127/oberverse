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
    h('div', { class: 'grid2' }, stat('Your obols', n(g.player.money)), stat('Policy rate', pc(B.rate())), stat('Bonds held, at today\'s yield', n(P.value)), stat('Coupons received', n(P.earned))));
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
  const log = (B.peek()?.log || []).slice(-6).reverse();
  if (log.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`))))));
}
