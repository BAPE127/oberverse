// Procurement (v0.103.4): the external supplier store. Pick a supplier or all of them, filter by category or search, set a quantity with the steppers, add to the cart; review the order and confirm it once.
// The cart is paid once and becomes one order per supplier with a delivery day (src/war/procurement.js). Nothing here touches the player's own businesses (that is Internal Logistics).
import { h, panel, stats, stat, btn, chip, empty, table, kv, tabs, bar, fmt } from './kit.js';

let TOKEN_N = 0;
const state = (S) => (S.proc ||= { supplier: 'all', cat: 'all', q: '', sel: null, qty: {}, cart: [], review: false, token: null, tab: 'market' });

export function renderProcurement(cx, box) {
  const { W, S } = cx; const P = state(S); const V = W.companyView();
  const O = W.orders();
  box.append(tabs([{ id: 'market', label: 'Marketplace' }, { id: 'orders', label: 'Orders', badge: O.transit.length + O.pending.length || null }], P.tab, (t) => { P.tab = t; P.review = false; cx.refresh(); }));
  if (!V.licensed) { box.append(empty('The company needs its Civic Office licence before suppliers will open an account. Get it from Command Overview.')); return; }
  if (P.tab === 'orders') { renderOrders(cx, box, O); return; }
  const market = W.suppliers(); const cats = W.procurementCategories();
  const sup = market.find((s) => s.id === P.supplier) || null;
  const items = (sup ? [sup] : market).flatMap((s) => s.items.map((i) => ({ ...i, supplierName: s.name, supplierId: s.id, mult: s.mult })));
  const present = [...new Set(items.map((i) => i.cat))];
  const q = P.q.trim().toLowerCase();
  const shown = items.filter((i) => (P.cat === 'all' || i.cat === P.cat) && (!q || i.name.toLowerCase().includes(q) || i.supplierName.toLowerCase().includes(q)));
  const key = (i) => `${i.supplierId}|${i.id}`;
  const qtyOf = (i) => P.qty[key(i)] ?? 1;
  const setQty = (i, v) => { P.qty[key(i)] = Math.max(1, Math.min(i.max, Math.floor(Number(v) || 1))); cx.refresh(); };
  const sel = shown.find((i) => key(i) === P.sel) || null;

  // the supplier strip
  const strip = h('div', { class: 'osx-tabs' }, h('button', { class: !sup ? 'on' : '', onclick: () => { P.supplier = 'all'; P.sel = null; cx.refresh(); } }, 'All suppliers'),
    ...market.map((s) => h('button', { class: sup?.id === s.id ? 'on' : '', onclick: () => { P.supplier = s.id; P.sel = null; cx.refresh(); } }, s.name)));
  const search = h('input', { class: 'osx-input', placeholder: 'Search items or suppliers…', value: P.q, style: 'width:230px', oninput: (e) => { P.q = e.target.value; clearTimeout(search.t); search.t = setTimeout(() => { cx.refresh(); document.querySelector('.osx-scroll input.osx-input')?.focus(); }, 250); } });
  const catRow = h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' }, btn('All categories', () => { P.cat = 'all'; cx.refresh(); }, { kind: `sm${P.cat === 'all' ? ' pri' : ''}` }), ...present.map((c) => btn(cats[c], () => { P.cat = c; cx.refresh(); }, { kind: `sm${P.cat === c ? ' pri' : ''}` })));

  const rows = shown.map((i) => [h('div', {}, h('b', {}, i.name), h('div', { class: 'osx-sub', style: 'padding:0' }, i.supplierName)), chip(cats[i.cat]), h('span', { class: 'osx-mono' }, fmt(i.price)), `${i.days} d`, `≤ ${fmt(i.max)}`,
    h('span', { class: 'osx-qty' }, h('button', { onclick: (e) => { e.stopPropagation(); setQty(i, qtyOf(i) - (qtyOf(i) > 20 ? 10 : 1)); } }, '−'), h('b', {}, fmt(qtyOf(i))), h('button', { onclick: (e) => { e.stopPropagation(); setQty(i, qtyOf(i) + (qtyOf(i) >= 20 ? 10 : 1)); } }, '+')),
    btn('Add', (e) => { e.stopPropagation(); add(i); }, { kind: 'pri sm' })]);
  const add = (i) => {
    const line = P.cart.find((l) => l.supplier === i.supplierId && l.id === i.id); const q2 = qtyOf(i);
    if (line) line.qty = Math.min(i.max, line.qty + q2); else P.cart.push({ supplier: i.supplierId, id: i.id, qty: q2 });
    P.review = false; cx.say(`${q2} × ${i.name} added to the cart.`); cx.refresh();
  };

  // the cart
  const quote = W.quoteCart(P.cart); const cash = V.cash; const total = quote.total;
  const cartRows = quote.lines.map((l) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, l.name), h('small', {}, `${l.supplierName} · ${fmt(l.price)} each · ${l.days} d`)),
    h('div', { style: 'display:flex;gap:6px;align-items:center' }, h('span', { class: 'osx-qty' }, h('button', { onclick: () => bump(l, -1) }, '−'), h('b', {}, fmt(l.qty)), h('button', { onclick: () => bump(l, 1) }, '+')), h('span', { class: 'osx-mono' }, fmt(l.total)), btn('✕', () => { P.cart = P.cart.filter((c) => !(c.supplier === l.supplier && c.id === l.id)); P.review = false; cx.refresh(); }, { kind: 'sm' }))));
  const bump = (l, d) => { const c = P.cart.find((x) => x.supplier === l.supplier && x.id === l.id); c.qty = Math.max(1, c.qty + d * (c.qty >= 20 ? 10 : 1)); P.review = false; cx.refresh(); };
  const bySupplier = [...new Set(quote.lines.map((l) => l.supplierName))].map((n2) => kv(`Delivery · ${n2}`, `day ${cx.g.clock.day + quote.lines.find((l) => l.supplierName === n2).days}`));
  let cartNode;
  if (P.review && quote.lines.length) {
    cartNode = panel('Order summary', [
      ...quote.lines.map((l) => kv(`${fmt(l.qty)} × ${l.name}`, fmt(l.total))), ...bySupplier, kv('Total', `${fmt(total)} ◎`), kv('Funds after', `${fmt(cash - total)} ◎`, cash - total < 0 ? 'bad' : ''),
      cash < total ? h('div', { class: 'osx-note bad', style: 'margin:0' }, `The company holds ${fmt(cash)}: pay money in from Command Overview.`) : null,
      h('div', { style: 'display:flex;gap:6px' }, btn('Confirm purchase', function confirmIt() { if (P.busy) return; P.busy = true; const r = W.placeOrder(P.cart, P.token); P.busy = false; if (r.ok) { P.cart = []; P.review = false; P.token = null; P.tab = 'orders'; } cx.go(r); }, { kind: 'pri', disabled: cash < total || Boolean(quote.bad.length) }), btn('Back to cart', () => { P.review = false; cx.refresh(); })),
    ].filter(Boolean), { cls: 'osx-sidepan' });
  } else {
    cartNode = panel(`Procurement cart${P.cart.length ? ` · ${P.cart.length}` : ''}`, [
      ...(cartRows.length ? cartRows : [empty('The cart is empty. Add items from the marketplace.')]),
      ...quote.bad.map((b) => h('div', { class: 'osx-note bad', style: 'margin:0' }, b)),
      quote.lines.length ? kv('Total', `${fmt(total)} ◎`, cash < total ? 'bad' : '') : null, quote.lines.length ? kv('Company funds', `${fmt(cash)} ◎`) : null,
      quote.lines.length ? h('div', { style: 'display:flex;gap:6px' }, btn('Review order', () => { P.review = true; P.token = `cart-${Date.now()}-${++TOKEN_N}`; cx.refresh(); }, { kind: 'pri', disabled: Boolean(quote.bad.length) }), btn('Empty cart', () => { P.cart = []; cx.refresh(); })) : null,
    ].filter(Boolean));
  }

  const detail = sel ? panel('Item detail', [
    h('b', {}, sel.name), h('div', { class: 'osx-sub', style: 'padding:0' }, sel.text || ''), kv('Category', cats[sel.cat]), kv('Supplier', sel.supplierName), kv('Unit price', `${fmt(sel.price)} ◎`), kv('Quantity available', `up to ${fmt(sel.max)} per order`), kv('Delivery', `${sel.days} day${sel.days === 1 ? '' : 's'}`), kv('Quantity selected', fmt(qtyOf(sel))), kv('Total cost', `${fmt(qtyOf(sel) * sel.price)} ◎`),
    sel.bars ? h('div', {}, ...Object.entries(sel.bars).map(([k, v]) => h('div', { style: 'display:flex;gap:8px;align-items:center;font-size:11px' }, h('span', { style: 'width:70px;color:var(--mut)' }, k), bar(v / 5)))) : null,
    btn('Add to cart', () => add(sel), { kind: 'pri' })].filter(Boolean)) : null;
  const profile = sup ? panel(sup.name, [h('div', { class: 'osx-sub', style: 'padding:0' }, sup.blurb), kv('Type', sup.type), kv('Location', sup.location), kv('Delivery time', `${sup.days} day${sup.days === 1 ? '' : 's'}`), kv('Prices', sup.mult === 1 ? 'standard' : sup.mult < 1 ? `${Math.round((1 - sup.mult) * 100)}% under` : `${Math.round((sup.mult - 1) * 100)}% over`), kv('Items stocked', String(sup.items.length))]) : null;

  box.append(h('div', { class: 'osx-grid osx-gs' },
    h('div', { class: 'osx-side', style: 'overflow:visible' }, panel('Supplier marketplace', [strip, h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, search, catRow),
      shown.length ? table(['Item', 'Category', 'Unit ◎', 'Lead', 'Max', 'Qty', ''], rows, { onrow: (i) => { P.sel = key(shown[i]); cx.refresh(); }, selected: shown.findIndex((i) => key(i) === P.sel) }) : empty('Nothing matches.')], { sub: 'Every item is something the game really has; prices are the game\'s own, set by each supplier\'s markup. Aircraft are not sold outside: they come from Aerospace (Internal Logistics).' })),
    h('div', { class: 'osx-side' }, cartNode, profile, detail)));
}

function renderOrders(cx, box, O) {
  const { g } = cx;
  const row = (o) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${o.id} · ${o.supplierName}`), h('small', {}, `${o.lines.map((l) => `${fmt(l.qty)} × ${l.name}`).join(', ')}`), o.waitingFor.length ? h('small', { style: 'color:var(--am)' }, `Waiting at the gate for a bay: ${o.waitingFor.join(', ')}`) : null),
    h('div', { style: 'text-align:right' }, h('div', { class: 'osx-mono' }, `${fmt(o.total)} ◎`), o.state === 'delivered' ? chip(`delivered day ${o.deliveredDay}`, 'ok') : o.state === 'waiting' ? chip('waiting for a bay', 'warn') : chip(o.eta ? `arrives day ${o.due} (${o.eta} d)` : 'arrives today', 'bl'), o.state === 'transit' ? h('div', {}, bar(1 - o.eta / Math.max(1, o.due - o.placed))) : null));
  box.append(stats(stat('In transit', String(O.transit.length)), stat('Pending (waiting for a bay)', String(O.pending.length), { tone: O.pending.length ? 'warn' : '' }), stat('Delivered', String(O.delivered.length))));
  box.append(h('div', { class: 'osx-grid osx-g2', style: 'margin-top:10px' },
    h('div', { class: 'osx-side' }, panel('Pending and in transit', [...O.pending.map(row), ...O.transit.map(row)].length ? [...O.pending.map(row), ...O.transit.map(row)] : [empty('No orders on their way. Orders are paid when placed and delivered on their day; time passes with the controls at the top.')])),
    h('div', { class: 'osx-side' }, panel('Procurement history', O.delivered.length ? O.delivered.map(row) : [empty('Nothing delivered yet.')]))));
  void g;
}
