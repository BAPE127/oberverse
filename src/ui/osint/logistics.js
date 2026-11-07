// Internal Logistics (v0.103.4): moving goods from the player's OWN businesses into the company. Always free: the source's stock goes down, the company's goes up, one line in the trail, never a
// payment (src/war/transfers.js). This page never touches the supplier system. Sources: each Arms works' export cage and Aerospace's storage. Ships stay with the shipping company, so they are not offered.
import { h, panel, stats, stat, btn, chip, empty, table, kv, tabs, fmt } from './kit.js';
import { stockName } from '../../war/equipment.js';

const state = (S) => (S.log ||= { tab: 'transfer', source: null, sel: null, qty: 1, review: false, busy: false });

export function renderLogistics(cx, box) {
  const { g, W, S } = cx; const L = state(S);
  box.append(tabs([{ id: 'transfer', label: 'Transfer from my businesses' }, { id: 'standing', label: 'Standing supply levels' }, { id: 'holdings', label: 'Company holdings' }, { id: 'history', label: 'Transfer history' }], L.tab, (t) => { L.tab = t; L.review = false; cx.refresh(); }));
  box.append(h('div', { class: 'osx-note', style: 'margin:0 0 10px;border:1px solid var(--line2)' }, 'These are inventory movements between companies you own. No money changes hands: no purchase, no fee, no intercompany entry.'));
  if (L.tab === 'standing') return standing(cx, box);
  if (L.tab === 'holdings') return holdings(cx, box);
  if (L.tab === 'history') return history(cx, box);
  return transfer(cx, box, L);
  void g; void W;
}

function sources(cx) {
  const { g, W } = cx; const O = W.offers(); const out = [];
  for (const w of g.arms.ownedIds()) {
    const items = O.arms.filter((a) => a.works === w);
    out.push({ id: `arms:${w}`, name: g.arms.def(w).name, kind: 'Arm\'s Manufacturing', items: items.map((a) => ({ key: `arms:${w}:${a.item}`, spec: { source: 'arms', works: w, item: a.item }, name: a.name, cat: 'Weapons and ammunition', have: a.have, where: `${g.arms.def(w).name} export cage`, kind: 'stock' })) });
  }
  if (g.aero.owned) out.push({ id: 'aero', name: 'Roost Aeroworks', kind: 'Aerospace Engineering', items: O.aero.map((a) => ({ key: `aero:${a.ref}`, spec: { source: 'aero', ref: a.ref }, name: `${a.name}${a.quality ? ` (quality ${a.quality})` : ''}`, cat: a.line === 'missile' ? 'Strategic missile product' : 'Military aircraft', have: 1, where: 'Aerospace storage', kind: a.line === 'missile' ? 'missile' : 'aircraft' })) });
  return out;
}

function transfer(cx, box, L) {
  const { g, W } = cx; const src = sources(cx);
  if (!src.length) { box.append(empty('You own no business that can supply the company yet. Buy an arms works at Mill Road Yards, or Roost Aeroworks at Starling Flats.')); return; }
  const cur = src.find((s) => s.id === L.source) || src[0]; L.source = cur.id;
  const item = cur.items.find((i) => i.key === L.sel) || null;
  const H = W.housing();
  const strip = h('div', { class: 'osx-tabs' }, ...src.map((s) => h('button', { class: s.id === cur.id ? 'on' : '', onclick: () => { L.source = s.id; L.sel = null; L.review = false; cx.refresh(); } }, s.name, s.items.length ? h('i', {}, String(s.items.reduce((a, i) => a + i.have, 0))) : null)));
  const list = cur.items.length ? table(['Item', 'Category', 'Available', 'Transferable', 'Location'], cur.items.map((i) => [h('b', {}, i.name), chip(i.cat), h('span', { class: 'osx-mono' }, fmt(i.have)), h('span', { class: 'osx-mono' }, fmt(i.have)), i.where]), { onrow: (n) => { L.sel = cur.items[n].key; L.qty = 1; L.review = false; cx.refresh(); }, selected: cur.items.findIndex((i) => i.key === L.sel) })
    : empty(cur.id.startsWith('arms') ? 'The export cage is empty. Your works fill it as their stations make crates and weapons; crates are opened when they are moved.' : 'No military aircraft or strategic missile products are in storage. Aerospace builds them in its bays.');

  // the transfer panel: destination follows the item, source and destination shown before and after
  let side;
  if (item) {
    const dest = item.kind === 'aircraft' ? { name: 'Aircraft hangars', free: H.air.free, total: H.air.total, why: H.air.free < 1 ? `No free bay in the hangars (${H.air.used} of ${H.air.total}).` : null }
      : item.kind === 'missile' ? { name: 'Secure stores (the armoury, depot or cage)', free: Infinity, total: null, why: null } : { name: 'Company stores (the armoury)', free: Infinity, total: null, why: null };
    const qty = item.kind === 'stock' ? Math.max(1, Math.min(item.have, L.qty)) : 1;
    const heldNow = item.kind === 'stock' ? Object.entries(W.stock()).filter(([k]) => k.endsWith(`:${item.spec.item}`)).reduce((a, [, v]) => a + v, 0) : 0;
    const setQ = (v) => { L.qty = Math.max(1, Math.min(item.have, Math.floor(Number(v) || 1))); L.review = false; cx.refresh(); };
    const body = [h('b', {}, item.name), kv('Source', cur.name), kv('Destination', dest.name), dest.total != null ? kv('Destination capacity', `${dest.free} of ${dest.total} bays free`, dest.why ? 'bad' : '') : kv('Destination capacity', 'no limit', 'ok')];
    if (item.kind === 'stock') body.push(h('div', { style: 'display:flex;gap:6px;align-items:center' }, h('span', { class: 'osx-sub', style: 'padding:0' }, 'Quantity'), h('span', { class: 'osx-qty' }, h('button', { onclick: () => setQ(qty - (qty > 20 ? 10 : 1)) }, '−'), h('b', {}, fmt(qty)), h('button', { onclick: () => setQ(qty + (qty >= 20 ? 10 : 1)) }, '+')), btn('All', () => setQ(item.have), { kind: 'sm' })));
    body.push(h('div', { class: 'osx-grid osx-g2' }, panel('Source after', [kv('Before', fmt(item.have)), kv('After', fmt(item.have - qty), 'warn')]), panel('Company after', [kv('Before', item.kind === 'stock' ? fmt(heldNow) : '—'), kv('After', item.kind === 'stock' ? fmt(heldNow + qty) : '+1', 'ok')])));
    if (dest.why) body.push(h('div', { class: 'osx-note bad', style: 'margin:0' }, dest.why));
    body.push(L.review ? h('div', { style: 'display:flex;gap:6px' }, btn(`Confirm free transfer of ${fmt(qty)}`, () => { if (L.busy) return; L.busy = true; const r = W.transfer({ ...item.spec, qty }); L.busy = false; L.review = false; L.sel = null; cx.go(r); }, { kind: 'pri', disabled: Boolean(dest.why) }), btn('Cancel', () => { L.review = false; cx.refresh(); }))
      : btn('Review transfer', () => { L.review = true; cx.refresh(); }, { kind: 'pri', disabled: Boolean(dest.why) }));
    side = panel('Transfer', body);
  } else side = panel('Transfer', [empty('Select an item on the left to move it into the company.')]);
  box.append(h('div', { class: 'osx-grid osx-gs' }, h('div', { class: 'osx-side', style: 'overflow:visible' }, panel('Your businesses', [strip, h('div', { class: 'osx-sub', style: 'padding:0' }, cur.kind), list])), h('div', { class: 'osx-side' }, side)));
  const owns = [g.logistics.owned ? 'Ober & Sons Maritime (ships stay with the shipping company in this release: they are not transferable)' : null].filter(Boolean);
  if (owns.length) box.append(h('div', { class: 'osx-sub' }, owns.join('')));
}

function standing(cx, box) {
  const { W, S } = cx; const sp = W.supplyLink(); const V = W.companyView();
  if (!sp) return;
  const owned = sp.works.length; const allOn = owned > 0 && sp.works.every((w) => w.dedicated);
  const step = (v) => (v < 10 ? 1 : v < 50 ? 5 : 10);
  const rows = sp.rows.filter((r) => r.want || r.have);
  const rest = sp.rows.filter((r) => !(r.want || r.have));
  const line = (r) => {
    const st = r.state === 'full' ? chip('filled', 'ok') : r.state === 'shipping' ? chip(`${fmt(r.toShip)} ship tomorrow`, 'ok') : r.state === 'inbound' ? chip(`${fmt(r.inbound)} on the way`, 'bl') : r.state === 'making' ? chip('works making it', 'warn') : r.state === 'idle' ? chip('short', 'bad') : chip('no level');
    return [h('b', {}, r.name), h('span', { class: 'osx-mono' }, fmt(r.have)), h('span', { class: 'osx-qty' }, h('button', { onclick: () => cx.go(W.setSupplyLevel(r.item, Math.max(0, r.want - step(r.want - 1)))) }, '−'), h('b', {}, fmt(r.want)), h('button', { onclick: () => cx.go(W.setSupplyLevel(r.item, r.want + step(r.want))) }, '+')), h('span', { class: 'osx-mono' }, fmt(r.caged)), st];
  };
  box.append(stats(stat('Levels set', String(sp.rows.filter((r) => r.want).length)), stat('Shipped free this week', fmt(sp.flow.free), { tone: 'ok' }), stat('Short', String(sp.rows.filter((r) => r.want && r.have < r.want).length), { tone: sp.rows.some((r) => r.want && r.have < r.want) ? 'warn' : '' })));
  box.append(h('div', { style: 'height:8px' }));
  box.append(panel('Arms works supply the company, free', [
    h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, owned ? 'Works make what the company needs' : 'You own no arms works'), h('small', {}, owned ? 'Idle stations make what is short and go back to their own work when it is not. Shipping from the cages is always free, every morning.' : 'Buy a works at Mill Road Yards.')), owned ? btn(allOn ? 'Turn off' : 'Turn on', () => { let r; for (const w of sp.works) r = W.setSupplyWorks(w.id, !allOn); cx.go(r); }, { kind: allOn ? '' : 'pri' }) : null),
    rows.length ? table(['Item', 'In stores', 'Keep', 'In the cages', 'Status'], rows.map(line)) : empty('No levels set. Add an item below and choose how many the company should keep.'),
    rest.length ? h('select', { onchange: (e) => e.target.value && cx.go(W.setSupplyLevel(e.target.value, 10)) }, h('option', { value: '' }, 'Add an item…'), ...rest.map((r) => h('option', { value: r.item }, r.name))) : null,
  ]));
  const short = sp.rows.filter((r) => r.want && r.buyQty > 0 && (r.state === 'idle' || r.state === 'making'));
  if (short.length) {
    const suppliers = W.suppliers();
    box.append(h('div', { style: 'height:8px' }), panel('Shortfall: what the works cannot keep up with', [
      ...short.map((r) => { const offers = suppliers.flatMap((s) => s.items.filter((i) => i.id === `arms:${r.item}`).map((i) => ({ s, i }))).sort((a, b) => a.i.price - b.i.price); const best = offers[0];
        return h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${r.name} · ${fmt(r.buyQty)} short`), h('small', {}, best ? `Cheapest outside supplier: ${best.s.name}, ${fmt(best.i.price)} ◎ each, ${best.i.days} days.` : 'No supplier sells it.')),
          best ? btn(`Add to procurement cart · ${fmt(r.buyQty * best.i.price)}`, () => { const P = (S.proc ||= { supplier: 'all', cat: 'all', q: '', sel: null, qty: {}, cart: [], review: false, token: null, tab: 'market' }); const l = P.cart.find((c) => c.supplier === best.s.id && c.id === best.i.id); if (l) l.qty = Math.min(best.i.max, l.qty + r.buyQty); else P.cart.push({ supplier: best.s.id, id: best.i.id, qty: Math.min(best.i.max, r.buyQty) }); cx.open('procurement', { proc: P }); cx.say(`${r.name} added to the procurement cart.`); }, { kind: 'pri sm', disabled: V.cash <= 0 }) : null); }),
      h('div', { class: 'osx-sub', style: 'padding:0' }, 'Buying is Procurement: it costs money and arrives on a delivery day. Moving your own stock never does.')]));
  }
}

function holdings(cx, box) {
  const { g, W } = cx; const st = Object.entries(W.stock()); const eq = W.equipment();
  const rows = st.map(([key, q]) => [h('b', {}, stockName(g, key)), h('span', { class: 'osx-mono' }, fmt(q)), key.startsWith('arms:bought:') ? chip('bought: cannot return') : key.startsWith('arms:') ? btn('Return to the works', () => cx.go(W.giveBack({ key, qty: q })), { kind: 'sm' }) : chip('supplies')]);
  box.append(panel('Stores', rows.length ? table(['Item', 'Held', ''], rows) : empty('Nothing in the stores.'), { sub: 'The stores have no limit. Anything that came from your Arms works can go back to it, free, while it is not issued or set aside for a battle.' }));
  box.append(h('div', { style: 'height:8px' }), panel('Vehicles, aircraft and missiles', eq.length ? table(['Item', 'Id', 'Location', 'Status', ''], eq.map((x) => [h('b', {}, x.name), h('span', { class: 'osx-mono' }, x.id), x.location.replace('facility:', ''), chip(x.status, x.status === 'destroyed' ? 'bad' : ''), x.origin && x.status === 'stored' && !x.assignedTo ? btn('Return', () => cx.go(W.giveBack({ id: x.id })), { kind: 'sm' }) : ''])) : [empty('None held yet.')]));
}

function history(cx, box) {
  const T = cx.W.transfers().slice().reverse();
  const where = (s) => String(s).replace('arms:', 'Arms works ').replace('aerospace', 'Aerospace').replace('company', 'the company');
  box.append(panel('Internal transfers (inventory only, no money)', T.length ? table(['Day', 'From', 'To', 'Item', 'Qty', 'Status'], T.map((t) => [`day ${t.day}`, where(t.from), where(t.to), h('b', {}, t.name), h('span', { class: 'osx-mono' }, fmt(t.qty)), chip(t.status === 'returned' ? 'returned' : 'completed', t.status === 'returned' ? 'warn' : 'ok')])) : [empty('No internal transfers yet.')]));
}
