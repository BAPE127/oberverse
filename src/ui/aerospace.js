// The aerospace terminal (v0.55.0): Roost Aeroworks' business on one screen —
// the dashboard, the tender board (bids), contracts, production, supply,
// facilities, the books — and Meridian, the competition (MRDN on the exchange).
// Opened from the Roost office terminal, the tablet's Aerospace app, Billie
// ("Can I use the terminal?") and, read-only, Meridian's share board.
// Everything it shows comes from src/systems/aerospace.js; everything it does
// goes through that system's checked methods.
import { h, mrdnScreen } from './panels.js';
import { fmtMoney, fmtDays, unitCost } from '../aero/catalog.js';
import { stagesOf } from '../aero/pipeline.js';
import { ACCOUNTS } from '../aero/books.js';

const TABS = ['Dashboard', 'Tenders', 'Contracts', 'Production', 'Supply', 'Facilities', 'Books', 'Meridian'];
const LINE_ICON = { aircraft: '✈️', rocket: '🚀', missile: '🛡️', satellite: '🛰️' };
const STATUS = { queued: 'queued for a bay', waiting: 'waiting for materials', blocked: 'blocked', building: 'in production', engineering: 'in the drawing office', apron: 'on the apron', pad: 'on the pad', orbit: 'in orbit', storage: 'in secure storage', convoy: 'on the road (secure convoy)', delivered: 'delivered', failed: 'lost', cancelled: 'cancelled' };
const AE = { tab: 'Dashboard' };
const money = (n) => `${Math.round(n).toLocaleString()} ◎`;

/** The sale sheet for Roost Aeroworks (Billie's "I hear it's for sale", the sign by the office). */
export function aeroSalePanel(ui, body) {
  const g = ui.game;
  const A = g.aero;
  const render = (msg) => {
    body.innerHTML = '';
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    if (A.owned) {
      body.append(h('p', {}, 'Roost Aeroworks is yours. The terminal is in the Roost office, and on your tablet (Aerospace).'),
        h('button', { class: 'primary', onclick: () => ui.openPanel('aerospace', { company: 'roost' }) }, 'Open the aerospace terminal'));
      return;
    }
    const o = A.offer();
    body.append(
      h('p', { class: 'doc' }, `${o.company} — "Fine aircraft since before you were born." For sale by its founder, Billie Roost.`),
      h('div', { class: 'list' }, ...o.includes.map((t) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '✔'), h('div', { class: 'grow' }, h('div', { class: 'desc' }, t))))),
      h('p', { class: 'muted' }, o.costs),
      h('p', { class: 'muted' }, 'Aerospace is a hard business: materials are bought before the work is paid for, bays and wages cost money whether or not they\'re busy, and Meridian bids on everything. Done well, at scale, it is one of the most lucrative industries in the Oberverse.'),
      h('div', { class: 'row', style: 'justify-content:flex-start' },
        h('button', { class: 'primary', disabled: g.player.money < o.price, onclick: () => { const r = A.buyFirm(); ui.audio?.sfx?.(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, g.player.money >= o.price ? `Buy ${o.company} for ${o.price.toLocaleString()} obols` : `You need ${(o.price - g.player.money).toLocaleString()} more obols`)),
    );
  };
  render();
  return { title: '✈ Roost Aeroworks — for sale', className: 'aero' };
}

export function aerospacePanel(ui, body, opts = {}) {
  const g = ui.game;
  const A = g.aero;
  const readonly = opts.readonly || !A.owned;
  if (opts.tab && TABS.includes(opts.tab)) AE.tab = opts.tab;
  if (readonly) AE.tab = 'Meridian';
  const tab = AE.tab;
  const co = A.roost;
  const rerender = (msg) => { AE.msg = msg; ui.openPanel('aerospace', { ...opts, tab: AE.tab }); };
  const say = (r) => { ui.audio?.sfx?.(r.ok === false ? 'sfx_fail' : 'sfx_coin'); rerender(r.text); };
  body.classList.add('aero');
  if (AE.msg) { body.append(h('p', { class: 'aero-msg' }, AE.msg)); AE.msg = null; }
  if (tab === 'Meridian') meridianTab(g, body, rerender);
  else if (tab === 'Dashboard') dashboard(g, A, co, body, (t) => { AE.tab = t; rerender(); });
  else if (tab === 'Tenders') tenders(g, A, co, body, say);
  else if (tab === 'Contracts') contracts(g, A, co, body, say);
  else if (tab === 'Production') production(g, A, co, body);
  else if (tab === 'Supply') supply(g, A, co, body, say);
  else if (tab === 'Facilities') facilities(g, A, co, body, say);
  else if (tab === 'Books') books(g, A, co, body);
  const tabs = readonly ? [] : TABS.map((t) => ({ label: t, active: t === tab, onclick: () => { AE.tab = t; ui.openPanel('aerospace', { ...opts, tab: t }); } }));
  return { title: readonly ? 'Meridian Aerospace — MRDN' : '✈ Roost Aeroworks — aerospace terminal', className: 'aero wide', tabs };
}

// ------------------------------------------------------------------ helpers
const stat = (label, value, cls = '') => h('div', { class: `stat ${cls}` }, h('span', {}, label), h('b', {}, value));
const bar = (f, cls = '') => h('div', { class: `aero-bar ${cls}` }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%` }));
const section = (title, ...kids) => h('div', { class: 'aero-section' }, h('h3', {}, title), ...kids);

// ------------------------------------------------------------------ dashboard
function dashboard(g, A, co, body, go) {
  const week = A.statement(co, 7);
  const active = A.contractsOf(co, 'active');
  const backlog = active.reduce((a, c) => a + (c.qty - c.delivered - c.failed) * c.unitPrice, 0);
  const units = A.unitsOf(co);
  const blocked = units.filter((u) => u.blocker && ['blocked', 'waiting', 'queued'].includes(u.status));
  const transit = A.ordersOf(co).reduce((a, po) => a + po.qty, 0);
  const bays = co.bays.filter((b) => b.ready <= A.now);
  const busy = bays.filter((b) => b.unit).length;
  const M = A.meridian;
  body.append(
    h('div', { class: 'grid4' },
      stat('Cash (your obols)', money(g.player.money)),
      stat('Revenue, 7 days', money(week.revenue)),
      stat('Expenses, 7 days', money(week.costs)),
      stat('Operating profit, 7 days', money(week.profit), week.profit >= 0 ? 'good' : 'bad'),
      stat('Contract backlog', `${active.length} · ${fmtMoney(backlog)}`),
      stat('Units in hand', String(units.length)),
      stat('Bays in use', `${busy} / ${bays.length}`),
      stat('Workers / needed', `${co.workforce} / ${A.crewNeeded(co, { all: true })}`),
      stat('Materials in transit', `${transit} lots`),
      stat('Apron', `${A.apronUsed(co)} / ${co.apron} slots`),
      stat('Reputation', `${Math.round(co.reputation)} / 100`),
      stat('Quality', `${Math.round(A.qualityOf(co))}`),
    ),
    section('Alerts',
      blocked.length || active.some((c) => c.due < A.now) ? h('div', { class: 'list' },
        ...active.filter((c) => c.due < A.now).map((c) => h('div', { class: 'item-row bad' }, h('div', { class: 'icon' }, '⏰'), h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${A.cfg.customers[c.customer].name}: ${c.qty} × ${A.cfg.products[c.product].name} is past due — the customer withholds ${Math.round(A.A.latePerDay * 100)}% a day.`)))),
        ...blocked.slice(0, 8).map((u) => h('div', { class: 'item-row warn' }, h('div', { class: 'icon' }, '⚠'), h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${A.cfg.products[u.product].name} #${u.n}: ${u.blocker.text}.`)))),
      ) : h('p', { class: 'muted' }, 'Nothing is holding production up.'),
    ),
    section('The competition',
      h('div', { class: 'grid4' },
        stat('MRDN', `${A.state.market.price.toFixed(2)} ◎`),
        stat('Meridian contracts', String(A.contractsOf(M, 'active').length)),
        stat('Meridian reputation', `${Math.round(M.reputation)}`),
        stat('Open tenders', String(A.openTenders().length)),
      ),
      h('button', { class: 'small', onclick: () => go('Meridian') }, 'Meridian and MRDN →'),
      h('button', { class: 'small primary', style: 'margin-left:6px', onclick: () => go('Tenders') }, 'The tender board →'),
    ),
    section('Reports', h('div', { class: 'list' }, ...A.state.reports.filter((r) => r.company === co.id).slice(0, 10).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${A.when(r.at)} — ${r.text}`)))))),
  );
}

// ------------------------------------------------------------------ tenders
function tenders(g, A, co, body, say) {
  const C = A.cfg;
  body.append(h('p', { class: 'muted' }, `Customers post tenders each morning; bids are sealed, one per company, and the customer decides when the tender closes, weighing price, delivery, quality and reputation its own way. An aircraft contract is never for more than ${A.A.maxAircraftPerContract} aircraft. A deposit is paid when you win; the rest on delivery.`));
  const open = A.openTenders();
  if (!open.length) body.append(h('p', {}, 'No open tenders right now. New ones come in at 06:00.'));
  const list = h('div', { class: 'list' });
  for (const t of open) {
    const p = C.products[t.product];
    const cu = C.customers[t.customer];
    const q = A.bidQuote(co.id, t.id);
    const mine = t.bids.find((b) => b.company === co.id);
    const price = h('input', { type: 'number', min: 1, step: 100, value: String(q.unitPrice || t.ceiling), class: 'aero-num' });
    const days = h('input', { type: 'number', min: 1, step: 1, value: String(q.days || t.days), class: 'aero-num small' });
    const profit = h('span', { class: 'muted' });
    const update = () => { const pr = Number(price.value); profit.textContent = ` → about ${fmtMoney((pr - q.cost) * t.qty)} contribution on ${fmtMoney(pr * t.qty)} (deposit ${fmtMoney(pr * t.qty * t.deposit)})`; };
    price.addEventListener('input', update);
    update();
    list.append(h('div', { class: `item-row aero-tender${q.ok ? '' : ' muted'}` },
      h('div', { class: 'icon' }, LINE_ICON[p.line]),
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, `${t.qty} × ${p.name}`, h('span', { class: 'tag' }, cu.name), t.defence ? h('span', { class: 'tag warn' }, 'defence') : null, t.embargoed ? h('span', { class: 'tag bad' }, 'embargoed') : null),
        h('div', { class: 'desc' }, `Up to ${money(t.ceiling)} a unit · delivery within ${t.days} days · quality ${t.quality}+ · ${Math.round(t.deposit * 100)}% deposit · decides Day ${t.closes} · priorities: ${Object.entries(cu.priority).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}`),
        h('div', { class: 'desc' }, `Your cost ≈ ${money(q.cost)} a unit (materials ${fmtMoney(q.est.materials)}, freight ${fmtMoney(q.est.freight)}, bay-days ${fmtMoney(q.est.labour)}${q.launch ? `, launch share ${fmtMoney(q.launch)}` : ''}); your earliest delivery ≈ ${Number.isFinite(q.delivery) ? `${q.delivery} days` : '—'}.`),
        mine ? h('div', { class: 'desc good' }, `You bid ${money(mine.unitPrice)} a unit, ${mine.days} days.`)
          : q.ok || /price|delivery/.test(q.reason || '') ? h('div', { class: 'row aero-bid' }, 'Price/unit ', price, ' days ', days, h('button', { class: 'small primary', onclick: () => say(A.placeBid(co.id, t.id, Number(price.value), Number(days.value))) }, 'Place sealed bid'), profit)
            : h('div', { class: 'desc bad' }, `Can't bid: ${q.reason}.`),
      )));
  }
  body.append(list);
  const closed = A.state.tenders.filter((t) => t.status !== 'open').slice(-10).reverse();
  if (closed.length) body.append(section('Recently decided', h('div', { class: 'list' }, ...closed.map((t) => {
    const p = C.products[t.product];
    const r = t.ranking || [];
    const who = (id) => A.company(id)?.name || id;
    return h('div', { class: 'item-row' }, h('div', { class: 'icon' }, t.winner === co.id ? '🏆' : t.status === 'lapsed' ? '—' : '✖'), h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${C.customers[t.customer].name}: ${t.qty} × ${p.name} — ${t.status === 'lapsed' ? 'no valid bids; it lapsed' : `won by ${who(t.winner)}`}${r.length ? ` (${r.map((b) => `${who(b.company)} ${fmtMoney(b.unitPrice)}/${b.days}d, score ${b.score}`).join(' vs ')})` : ''}.`)));
  }))));
}

// ------------------------------------------------------------------ contracts
function contracts(g, A, co, body, say) {
  const C = A.cfg;
  const list = A.contractsOf(co).sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || a.due - b.due);
  if (!list.length) body.append(h('p', {}, 'No contracts yet. Win a tender.'));
  for (const c of list) {
    const p = C.products[c.product];
    const left = (c.due - A.now) / 1440;
    const units = c.units.map((id) => A.state.units[id]).filter(Boolean);
    body.append(h('div', { class: `aero-card${c.status !== 'active' ? ' muted' : ''}` },
      h('div', { class: 'name' }, `${LINE_ICON[p.line]} ${c.qty} × ${p.name}`, h('span', { class: 'tag' }, C.customers[c.customer].name), h('span', { class: `tag ${c.status === 'active' ? (left < 0 ? 'bad' : 'good') : ''}` }, c.status === 'active' ? (left < 0 ? `${fmtDays(-left)} late` : `due in ${fmtDays(left)}`) : c.status)),
      h('div', { class: 'desc' }, `${money(c.unitPrice)} a unit · ${money(c.total)} in all · deposit ${money(c.depositPaid)} received · delivered ${c.delivered}/${c.qty}${c.failed ? ` · lost ${c.failed}` : ''} · earned ${money(c.revenue)}${c.penalties ? ` · penalties ${money(c.penalties)}` : ''}`),
      c.note ? h('div', { class: 'desc muted' }, c.note) : null,
      ...units.filter((u) => !u.finished).map((u) => unitRow(A, u)),
      h('details', {}, h('summary', {}, 'History'), ...c.history.map((x) => h('div', { class: 'desc' }, `${A.when(x.at)} — ${x.text}`))),
      c.status === 'active' ? h('button', { class: 'small', onclick: () => { if (confirm(`Cancel this contract? The deposit for undelivered units goes back and you pay a ${Math.round(A.A.cancelPenalty * 100)}% penalty.`)) say(A.cancelContract(co.id, c.id)); } }, 'Cancel contract…') : null,
    ));
  }
}

function unitRow(A, u) {
  const C = A.cfg;
  const p = C.products[u.product];
  const st = stagesOf(C, p);
  const s = st[u.stage];
  const f = s && u.need ? u.work / u.need : 0;
  const overall = (u.stage + f) / st.length;
  return h('div', { class: 'aero-unit' },
    h('div', { class: 'name' }, `#${u.n} — ${s ? s.name : 'done'}`, h('span', { class: 'tag' }, STATUS[u.status] || u.status), u.bay ? h('span', { class: 'tag' }, u.bay.replace('_', ' ')) : null),
    bar(overall, 'overall'), s?.share ? bar(f, 'stage') : null,
    h('div', { class: 'desc' }, `About ${fmtDays(A.unitDaysLeft(u))} of work left · materials still to come ≈ ${fmtMoney(A.unitCostLeft(u))}${u.inspections.length ? ` · inspections: ${u.inspections.map((i) => (i.pass ? 'pass' : 'FAIL')).join(', ')}` : ''}${u.rework ? ` · rework ${fmtDays(u.rework)}` : ''}`),
    u.blocker ? h('div', { class: 'desc warn' }, `⚠ ${u.blocker.text}`) : null,
  );
}

// ------------------------------------------------------------------ production
function production(g, A, co, body) {
  const C = A.cfg;
  body.append(section('Bays', h('div', { class: 'grid3' }, ...co.bays.map((b) => {
    const u = b.unit && A.state.units[b.unit];
    return h('div', { class: 'aero-card' }, h('div', { class: 'name' }, `${C.bays[b.type].name} ${b.id.split('_').pop()}`),
      b.ready > A.now ? h('div', { class: 'desc' }, `Under construction — ready ${A.when(b.ready)}`) : u ? h('div', { class: 'desc' }, `${C.products[u.product].name} #${u.n}: ${A.stageOf(u)?.name || ''}`) : h('div', { class: 'desc muted' }, 'Empty'),
      u ? bar(u.need ? u.work / u.need : 0) : null);
  }))));
  const units = A.unitsOf(co).sort((a, b) => A.priority(a) - A.priority(b));
  body.append(section(`Every unit in hand (${units.length})`, ...units.map((u) => h('div', { class: 'aero-card' }, h('div', { class: 'desc' }, `${LINE_ICON[u.line]} ${C.products[u.product].name}${u.contract ? ` for ${C.customers[A.contract(u.contract)?.customer]?.name || '—'}` : ' (our own launcher)'}`), unitRow(A, u)))));
  const pipe = (line) => h('div', { class: 'desc' }, `${LINE_ICON[line]} ${line}: ${C.pipelines[line].map((s) => s.name).join(' → ')}`);
  body.append(section('The pipelines', ...Object.keys(C.pipelines).map(pipe)));
}

// ------------------------------------------------------------------ supply
function supply(g, A, co, body, say) {
  const C = A.cfg;
  const mats = Object.keys(C.materials);
  const rows = mats.map((m) => {
    const r = co.inv[m] || { qty: 0, reserved: 0 };
    const onOrder = A.ordersOf(co).filter((po) => po.material === m).reduce((a, po) => a + po.qty, 0);
    const need = A.demand(co, m);
    return { m, r, onOrder, need, short: Math.max(0, need - r.qty - onOrder) };
  }).filter((x) => x.r.qty || x.onOrder || x.need);
  body.append(
    h('div', { class: 'row', style: 'justify-content:flex-start' },
      h('label', {}, h('input', { type: 'checkbox', checked: co.autoProcure, onchange: (e) => { co.autoProcure = e.target.checked; say({ ok: true, text: co.autoProcure ? 'Purchasing will order what the work in hand needs, from the cheapest supplier with stock (landed cost).' : 'Automatic purchasing is off: order materials yourself below.' }); } }), ' Order materials automatically (cheapest landed cost)')),
    section('Materials', rows.length ? h('table', { class: 'aero-table' },
      h('tr', {}, ...['Material', 'In stores', 'Reserved', 'On order', 'Needed', 'Short'].map((x) => h('th', {}, x))),
      ...rows.map((x) => h('tr', { class: x.short ? 'bad' : '' }, h('td', {}, C.materials[x.m].name), h('td', {}, String(x.r.qty)), h('td', {}, String(x.r.reserved)), h('td', {}, String(x.onOrder)), h('td', {}, String(x.need)), h('td', {}, x.short ? String(x.short) : '—')))) : h('p', { class: 'muted' }, 'Nothing in stores and nothing needed.')),
  );
  const pos = A.ordersOf(co, false).sort((a, b) => b.placed - a.placed).slice(0, 20);
  body.append(section('Purchase orders', pos.length ? h('table', { class: 'aero-table' },
    h('tr', {}, ...['Order', 'Supplier', 'Lots', 'Goods + duty', 'Freight + handling', 'Carrier', 'Status', 'Due'].map((x) => h('th', {}, x))),
    ...pos.map((po) => h('tr', {}, h('td', {}, `${po.id} ${C.materials[po.material].name}`), h('td', {}, C.suppliers[po.supplier].name), h('td', {}, String(po.qty)), h('td', {}, money(po.goods)), h('td', {}, money(po.freight)), h('td', {}, po.mode === 'truck' ? 'truck (local)' : C.freight.carrier), h('td', {}, po.status), h('td', {}, po.status === 'received' ? A.when(po.received) : A.when(po.arrive))))) : h('p', { class: 'muted' }, 'No orders yet.')));
  // a manual order: pick a material, see every supplier's landed cost
  const sel = h('select', {}, ...mats.map((m) => h('option', { value: m }, C.materials[m].name)));
  const qty = h('input', { type: 'number', min: 1, value: '4', class: 'aero-num small' });
  const quotes = h('div', { class: 'list' });
  const draw = () => {
    quotes.innerHTML = '';
    const m = sel.value;
    const n = Math.max(1, Math.floor(Number(qty.value) || 1));
    for (const [id, sp] of Object.entries(C.suppliers)) {
      if (!sp.sells[m]) continue;
      const stock = A.state.suppliers[id].stock[m] || 0;
      const q = A.freightQuote(co, id, m, Math.min(n, Math.max(1, stock)));
      const total = q.goods + q.freight + q.duty + q.handling;
      quotes.append(h('div', { class: 'item-row' }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, sp.name, h('span', { class: 'tag' }, sp.where === 'local' ? 'local (truck)' : A.game.logistics.port(sp.where)?.name), h('span', { class: 'tag' }, `${stock} in stock`)),
        h('div', { class: 'desc' }, `Landed cost ${money(total)} for ${n}: goods ${money(q.goods)} + freight ${money(q.freight)}${q.duty ? ` + duty ${money(q.duty)}` : ''}${q.handling ? ` + handling ${money(q.handling)}` : ''} · ${Math.round(q.hours)} h to the Park${q.km ? ` (${q.km.toLocaleString()} km by sea)` : ''}`)),
        h('button', { class: 'small primary', disabled: stock < n, onclick: () => say(A.order(co, id, m, n)) }, 'Order')));
    }
  };
  sel.addEventListener('change', draw);
  qty.addEventListener('input', draw);
  draw();
  body.append(section('Order materials', h('div', { class: 'row', style: 'justify-content:flex-start' }, sel, ' lots ', qty), quotes,
    h('p', { class: 'muted' }, 'Landed cost = the supplier\'s price + duty + freight + handling. Foreign goods come by an independent carrier to Mill Road Docks at the market rate, then up the Cut by truck; materials can only be used once they\'re delivered, counted and in stores.')));
}

// ------------------------------------------------------------------ facilities
function facilities(g, A, co, body, say) {
  const C = A.cfg;
  body.append(section('Workforce',
    h('div', { class: 'grid4' }, stat('Employed', String(co.workforce)), stat('Needed (all bays)', String(A.crewNeeded(co, { all: true }))), stat('Wages a day', money(co.workforce * A.A.wage)), stat('Staffing now', `${Math.round(A.staffing(co) * 100)}%`)),
    h('div', { class: 'row', style: 'justify-content:flex-start' }, ...[10, 30].map((n) => h('button', { class: 'small primary', onclick: () => say(A.hire(co, n)) }, `Hire ${n} (${money(n * A.A.hireCost)})`)), ...[10, 30].map((n) => h('button', { class: 'small', disabled: co.workforce < n, onclick: () => say(A.layoff(co, n)) }, `Lay off ${n}`))),
    h('p', { class: 'muted' }, 'A bay works at full speed when its crew is all there; short-staffed, every bay slows. Wages are paid every morning, busy or not.')));
  body.append(section('Build a bay', h('div', { class: 'list' }, ...Object.entries(C.bays).map(([id, b]) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, b.name, h('span', { class: 'tag' }, `${b.crew} crew`), h('span', { class: 'tag' }, `${money(b.upkeep)}/day`)), h('div', { class: 'desc' }, b.text)), h('button', { class: 'small primary', onclick: () => say(A.buildBay(co, id)) }, `${money(b.build)} · ${b.buildDays} d`))))));
  body.append(section('Facilities', h('div', { class: 'list' }, ...Object.entries(C.facilities).filter(([, f]) => f.build).map(([id, f]) => {
    const have = id === 'pad' ? co.pad : co.facilities[id];
    const building = co.building?.[id];
    return h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, f.name, have ? h('span', { class: 'tag good' }, 'built') : building ? h('span', { class: 'tag' }, `ready ${A.when(building)}`) : null), h('div', { class: 'desc' }, f.text)),
      have || building ? null : h('button', { class: 'small primary', onclick: () => say(A.buildFacility(co, id)) }, `${money(f.build)} · ${f.buildDays} d`));
  }))));
  const R = C.research;
  const avail = Object.entries(R).filter(([id, r]) => !co.research.includes(id) && (r.requires || []).every((x) => co.research.includes(x)));
  body.append(section('Research',
    co.researching ? h('p', {}, `Researching ${R[co.researching.id].name} — done ${A.when(co.researching.doneAt)}.`) : h('p', { class: 'muted' }, 'Nothing being researched.'),
    h('p', { class: 'desc' }, `Known: ${co.research.map((id) => R[id].name).join(', ')}.`),
    h('div', { class: 'list' }, ...avail.map(([id, r]) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, r.name, r.clearance ? h('span', { class: 'tag warn' }, 'defence') : null), h('div', { class: 'desc' }, `${r.text} Unlocks: ${Object.entries(C.products).filter(([, p]) => p.tech === id).map(([, p]) => p.name).join(', ') || '—'}.`)),
      h('button', { class: 'small primary', disabled: Boolean(co.researching), onclick: () => say(A.startResearch(co, id)) }, `${money(r.cost)} · ${r.days} d`))))));
}

// ------------------------------------------------------------------ books
function books(g, A, co, body) {
  const periods = [['Last 7 days', 7], ['Last 30 days', 30], ['Since you bought it', null]];
  const sums = periods.map(([, n]) => A.statement(co, n));
  const keys = Object.keys(ACCOUNTS).filter((k) => sums.some((s) => s.acc[k]));
  body.append(
    h('table', { class: 'aero-table' },
      h('tr', {}, h('th', {}, 'Account'), ...periods.map(([l]) => h('th', {}, l))),
      ...keys.map((k) => h('tr', { class: ACCOUNTS[k].kind === 'revenue' ? 'good' : '' }, h('td', {}, ACCOUNTS[k].name), ...sums.map((s) => h('td', {}, s.acc[k] ? `${ACCOUNTS[k].kind === 'revenue' ? '' : '−'}${Math.round(s.acc[k]).toLocaleString()}` : '—')))),
      h('tr', { class: 'total' }, h('td', {}, 'Operating profit'), ...sums.map((s) => h('td', {}, Math.round(s.profit).toLocaleString()))),
    ),
    h('div', { class: 'grid4', style: 'margin-top:10px' },
      stat('Deposits received (work still owed)', money(co.books.deferred)),
      stat('Materials in stores and on order', money(co.books.inventoryValue)),
      stat('Capital spent (firm, bays, facilities)', money(co.books.capex)),
    ),
    h('p', { class: 'muted' }, 'Revenue is booked when a unit is delivered (a deposit is owed work until then). Materials are an asset until a unit uses them, and become cost of sales when it\'s delivered, with the freight that brought them. Wages, upkeep and overhead are booked each morning.'),
  );
}

// ------------------------------------------------------------------ Meridian
function meridianTab(g, body, rerender) {
  const A = g.aero;
  const M = A.meridian;
  const C = A.cfg;
  const mount = h('div');
  const render = (msg) => { mount.innerHTML = ''; mrdnScreen(g, mount, msg, render); };
  render();
  const active = A.contractsOf(M, 'active');
  body.append(
    section('Meridian Aerospace Corporation',
      h('p', { class: 'muted' }, `${C.aero.meridian.founded}. What's public: its order book, its deliveries, its share price.`),
      h('div', { class: 'grid4' },
        stat('Bays', String(M.bays.filter((b) => b.ready <= A.now).length)), stat('Workforce', M.workforce.toLocaleString()),
        stat('Reputation', `${Math.round(M.reputation)}`), stat('Delivered', `${M.stats.delivered} (${M.stats.late} late)`),
        stat('Launches', `${M.stats.launches} (${M.stats.launchFailures} lost)`), stat('Contracts won', String(M.stats.contractsWon)),
      ),
      h('div', { class: 'list' }, ...active.slice(0, 12).map((c) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, LINE_ICON[C.products[c.product].line]), h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${c.qty} × ${C.products[c.product].name} for ${C.customers[c.customer].name} — ${c.delivered} delivered, due ${A.when(c.due)}`))))),
    ),
    section('MRDN on the exchange', mount),
  );
  void rerender; void unitCost;
}
