// The logistics terminal (v0.21.0): Ober & Sons Maritime's fleet-management
// software — a light, tidy "operations desk" (deliberately not the arms works'
// green OSINT console). Opened from the harbour office terminal, or from the
// tablet's Ships app; both drive the same game.logistics state.
//
//   Acquire (before you own the company) · Overview · Chart · Fleet · Ports ·
//   Contracts · Brokerage · Finances · Reports
import { h } from './panels.js';
import { buildLand, wrapLon } from '../world/globe.js';
import { drawShip } from '../engine/drawShips.js';

export const LOGI_TABS = ['Overview', 'Chart', 'Fleet', 'Ports', 'Contracts', 'Brokerage', 'Finances', 'Reports'];
const STATUS = { docked: 'In port', loading: 'Loading', underway: 'At sea', lost: 'Lost', retired: 'Retired' };
const CSTATUS = { available: 'Offered', accepted: 'Accepted', loading: 'Loading', transit: 'In transit', delivered: 'Delivered', failed: 'Failed', expired: 'Expired', lost: 'Lost' };
const num = (n) => Math.round(n).toLocaleString();
const hrs = (h0) => (h0 >= 36 ? `${(h0 / 24).toFixed(1)} d` : `${Math.round(h0)} h`);
let LAND = null;

/** A ship's portrait for lists and the brokerage (its look, side-on from above). */
function shipCanvas(look, w = 150, hgt = 54) {
  const c = h('canvas', { width: w, height: hgt, class: 'logi-ship' });
  const ctx = c.getContext('2d');
  const len = (look.len || 3) * 32;
  const s = Math.min(1, (w - 16) / len);
  ctx.save();
  ctx.translate(w / 2, hgt / 2);
  ctx.scale(s, s);
  drawShip(ctx, look, 0, 0, 0, {});
  ctx.restore();
  return c;
}

// ------------------------------------------------------------------ the chart
const CW = 720;
const CH = 330;
const X = (lon) => ((lon + 180) / 360) * CW;
const Y = (lat) => ((80 - lat) / 158) * CH;

function drawChart(ctx, g, view) {
  const Lg = g.logistics;
  if (!LAND) LAND = buildLand(g.content.arms.countries);
  ctx.fillStyle = '#dce9f2';
  ctx.fillRect(0, 0, CW, CH);
  // graticule
  ctx.strokeStyle = 'rgba(40,80,120,0.12)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { ctx.beginPath(); ctx.moveTo(X(lon), 0); ctx.lineTo(X(lon), CH); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); ctx.moveTo(0, Y(lat)); ctx.lineTo(CW, Y(lat)); ctx.stroke(); }
  // land
  const cs = g.content.arms.countries;
  for (const p of LAND) {
    ctx.fillStyle = p.country && cs[p.country] ? `${cs[p.country].color}66` : '#d6cfbc';
    ctx.fillRect(X(p.lon) - 3.2, Y(p.lat) - 3.2, 6.6, 6.6);
  }
  // routes of ships at sea
  const poly = (pts, color, dash) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    pts.forEach(([la, lo], i) => {
      const prev = pts[i - 1];
      if (!i || Math.abs(wrapLon(lo - prev[1])) !== Math.abs(lo - prev[1])) ctx.moveTo(X(lo), Y(la));
      else ctx.lineTo(X(lo), Y(la));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const ships = Lg.vessels().filter((v) => view.filter === 'all' || (view.filter === 'sea' ? v.status === 'underway' : v.status !== 'underway'));
  for (const v of ships) {
    if (v.status !== 'underway') continue;
    const r = Lg.route(v.voyage.from, v.voyage.to);
    if (r) poly(r.pts, v.voyage.contract ? 'rgba(30,90,160,0.75)' : 'rgba(90,100,110,0.6)', v.voyage.contract ? null : [4, 4]);
  }
  // ports
  view.hits = [];
  for (const [id, p] of Object.entries(Lg.cfg.ports)) {
    const own = Lg.ownsPort(id);
    const x = X(p.lon);
    const y = Y(p.lat);
    ctx.fillStyle = own ? '#d89a2a' : '#7a8794';
    ctx.strokeStyle = '#1e2a3a';
    ctx.lineWidth = 1;
    if (own) { ctx.beginPath(); ctx.rect(x - 4, y - 4, 8, 8); ctx.fill(); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    view.hits.push({ x, y, r: own ? 7 : 5, kind: 'port', id });
  }
  // ships (positions come from the clock: logistics.position)
  for (const v of ships) {
    const pos = Lg.position(v);
    if (!pos) continue;
    let x = X(pos.lon);
    let y = Y(pos.lat);
    if (v.status !== 'underway') { const k = Lg.atPort(v.port).indexOf(v); x += 7 + k * 5; y -= 7; }
    let ang = 0;
    if (v.status === 'underway') {
      const r = Lg.route(v.voyage.from, v.voyage.to);
      const ahead = r && Lg.position({ ...v, voyage: { ...v.voyage, depart: v.voyage.depart - 60 } });
      if (ahead) ang = Math.atan2(Y(ahead.lat) - y, X(ahead.lon) - x);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = v.voyage?.events?.some((e) => e.done && g.clock.total - e.at < e.hours * 60) ? '#c0402a' : '#1e5aa0';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    view.hits.push({ x, y, r: 8, kind: 'ship', id: v.id });
  }
  // highlight
  if (view.hover) {
    const hit = view.hover;
    ctx.strokeStyle = '#d89a2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hit.x, hit.y, 11, 0, Math.PI * 2); ctx.stroke();
  }
}

function chartTip(g, hit) {
  const Lg = g.logistics;
  if (hit.kind === 'port') {
    const p = Lg.cfg.ports[hit.id];
    const pt = Lg.cfg.portTypes[p.type];
    const country = p.country ? g.content.arms.countries[p.country].name : 'Free port';
    const ships = Lg.atPort(hit.id).map((v) => v.name);
    return [`${p.name}${Lg.ownsPort(hit.id) ? ' ★ yours' : ''}`, `${pt.name} · ${country}`, ships.length ? `In port: ${ships.join(', ')}` : '', Lg.ownsPort(hit.id) ? '' : `Price ${num(pt.price)} · call fee ${pt.fee}`].filter(Boolean);
  }
  const v = Lg.vessel(hit.id);
  const m = Lg.model(v.model);
  const out = [`${v.name} — ${m.name}`, `${STATUS[v.status]}${v.port ? ` at ${Lg.port(v.port).name}` : ''} · condition ${Math.round(v.condition)}%`];
  if (v.status === 'underway') {
    const V = v.voyage;
    const pos = Lg.position(v);
    out.push(`${Lg.port(V.from).name} → ${Lg.port(V.to).name}`, `${Math.round(pos.f * 100)}% of ${num(V.km)} km · ETA ${Lg.when(V.arrive)}`);
    const c = V.contract && Lg.contract(V.contract);
    if (c) out.push(`Cargo: ${c.units} units for ${Lg.cfg.clients[c.client].name}`);
    if (v.cargo?.type === 'arms') out.push(`Cargo: ${v.cargo.units} crates for ${g.content.arms.countries[v.cargo.country].name}`);
    const late = c && V.arrive > c.deadline;
    if (late) out.push('⚠ Running late for the deadline');
  }
  return out;
}

// ------------------------------------------------------------------ the panel
export function logisticsPanel(ui, body, opts) {
  const g = ui.game;
  const Lg = g.logistics;
  const nav = opts.nav || ((o) => ui.openPanel('logistics', o));
  const go = (extra = {}) => nav({ ...opts, msg: null, ...extra });
  const act = (r, extra = {}) => { ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); go({ ...extra, msg: r.text, msgOk: r.ok }); };
  body.classList.add('logi');
  const head = h('div', { class: 'logi-head' },
    h('div', { class: 'logi-brand' }, h('b', {}, '⚓ OBER & SONS MARITIME'), h('span', {}, 'Fleet Operations · v4.2')),
    h('div', { class: 'logi-clock' }, `${g.clock.weekday} · Day ${g.clock.day} · ${g.clock.timeString}`, h('br'), `Balance ${num(g.player.money)} obols`));
  body.append(head);
  if (opts.msg) body.append(h('div', { class: `logi-msg ${opts.msgOk === false ? 'bad' : ''}` }, opts.msg));

  if (!Lg.owned) {
    acquire(ui, body, act);
    return { title: 'Ober & Sons Maritime', className: 'logistics', onClose: opts.onClose };
  }
  const tab = LOGI_TABS.includes(opts.tab) ? opts.tab : 'Overview';
  const S = Lg.state;
  if (S.arrears) body.append(h('div', { class: 'logi-msg bad' }, `⚠ ${num(S.arrears)} obols of upkeep in arrears — your ships are held in port. `, h('button', { class: 'small', onclick: () => act(Lg.payArrears()) }, 'Pay now')));
  ({ Overview: overview, Chart: chart, Fleet: fleet, Ports: ports, Contracts: contracts, Brokerage: brokerage, Finances: finances, Reports: reports })[tab](ui, body, opts, go, act);
  return {
    title: 'Ober & Sons Maritime — Fleet Operations', className: 'logistics', onClose: opts.onClose,
    tabs: LOGI_TABS.map((t) => ({ label: t, active: t === tab, onclick: () => go({ tab: t, sel: null }) })),
  };
}

/** Embedded in the tablet's Ships app: the same screens and data, with its own row of tabs. */
export function logisticsScreen(ui, body, opts, nav) {
  const tab = LOGI_TABS.includes(opts.tab) ? opts.tab : 'Overview';
  body.append(h('div', { class: 'row tablet-sub logi-subtabs' }, ...LOGI_TABS.map((t) => h('button', { class: `small${t === tab ? ' primary' : ''}`, onclick: () => nav({ ...opts, tab: t, msg: null, sel: null }) }, t))));
  logisticsPanel(ui, body, { ...opts, nav });
}

function acquire(ui, body, act) {
  const g = ui.game;
  const o = g.logistics.offer();
  const can = g.player.money >= o.price;
  body.append(h('div', { class: 'logi-card logi-sale' },
    h('h3', {}, `For sale: ${o.company}`),
    h('p', {}, 'Captain Ober is retiring. His company — the ports, the paperwork and a ship he swears is "basically new" — can be yours.'),
    h('table', { class: 'logi-table' },
      h('tr', {}, h('th', {}, 'Price'), h('td', {}, `${num(o.price)} obols`)),
      h('tr', {}, h('th', {}, 'Ports'), h('td', {}, o.ports.join(' · '))),
      h('tr', {}, h('th', {}, 'Ship'), h('td', {}, o.ship)),
      h('tr', {}, h('th', {}, 'Includes'), h('td', {}, o.access.join(' · ')))),
    h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' },
      h('button', { class: 'primary', disabled: !can, onclick: () => act(g.logistics.buyCompany(), { tab: 'Overview' }) }, can ? `Buy for ${num(o.price)} obols` : `You need ${num(o.price - g.player.money)} more`))));
}

function overview(ui, body, opts, go) {
  const g = ui.game;
  const Lg = g.logistics;
  const S = Lg.state;
  const vs = Lg.vessels();
  const sea = vs.filter((v) => v.status === 'underway').length;
  const active = Lg.contracts(['accepted', 'loading', 'transit']);
  const today = S.ledger.days[0]?.day === g.clock.day ? S.ledger.days[0] : { revenue: 0, expenses: 0 };
  const kpi = (label, value, sub, tab) => h('button', { class: 'logi-kpi', onclick: () => go({ tab }) }, h('span', {}, label), h('b', {}, value), h('small', {}, sub));
  body.append(h('div', { class: 'logi-kpis' },
    kpi('Fleet', `${vs.length}`, `${sea} at sea · ${vs.length - sea} in port`, 'Fleet'),
    kpi('Ports', `${Lg.ownedPorts().length} / ${Lg.L.maxPorts}`, `berths ${Lg.ownedPorts().reduce((a, id) => a + Lg.portType(id).berths, 0)}`, 'Ports'),
    kpi('Contracts', `${active.length}`, `${Lg.contracts('available').length} on offer`, 'Contracts'),
    kpi('Today', `${num(today.revenue - today.expenses)}`, `in ${num(today.revenue)} · out ${num(today.expenses)}`, 'Finances'),
    kpi('Upkeep', `${num(Lg.dailyUpkeep())}/day`, 'charged 06:00', 'Finances')));
  const list = h('div', { class: 'logi-card' }, h('h3', {}, 'Fleet status'));
  for (const v of vs) list.append(vesselRow(g, v, () => go({ tab: 'Fleet', sel: v.id })));
  body.append(list);
  const rep = h('div', { class: 'logi-card' }, h('h3', {}, 'Latest'));
  for (const r of S.reports.slice(0, 6)) rep.append(h('div', { class: 'logi-line' }, h('span', { class: 'muted' }, Lg.when(r.at)), ' ', r.text));
  body.append(rep);
}

function vesselRow(g, v, onclick) {
  const Lg = g.logistics;
  const m = Lg.model(v.model);
  let where = v.port ? Lg.port(v.port).name : '';
  if (v.status === 'underway') {
    const pos = Lg.position(v);
    where = `→ ${Lg.port(v.voyage.to).name} · ${Math.round(pos.f * 100)}% · ETA ${Lg.when(v.voyage.arrive)}`;
  }
  return h('button', { class: 'logi-row', onclick },
    shipCanvas(v.appearance, 96, 34),
    h('div', { class: 'grow' }, h('b', {}, v.name), h('span', { class: 'muted' }, ` ${m.name} · ${Lg.cls(m).name}`), h('br'),
      h('span', { class: `logi-status s-${v.status}` }, STATUS[v.status]), ' ', where),
    h('div', { class: 'logi-cond' }, `${Math.round(v.condition)}%`));
}

function chart(ui, body, opts, go) {
  const g = ui.game;
  const view = { filter: opts.filter || 'all', hits: [], hover: null };
  const filters = h('div', { class: 'row logi-filters' }, ...[['all', 'All ships'], ['sea', 'At sea'], ['port', 'In port']].map(([k, label]) => h('button', { class: `small${view.filter === k ? ' primary' : ''}`, onclick: () => go({ tab: 'Chart', filter: k }) }, label)),
    h('span', { class: 'muted' }, ' ■ your ports · ● other ports · ▶ your ships (red: delayed) · dashed: sailing empty'));
  const canvas = h('canvas', { width: CW, height: CH, class: 'logi-chart' });
  const tip = h('div', { class: 'logi-tip hidden' });
  const wrap = h('div', { class: 'logi-chartwrap' }, canvas, tip);
  body.append(filters, wrap);
  const ctx = canvas.getContext('2d');
  drawChart(ctx, g, view);
  canvas.addEventListener('mousemove', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * CW;
    const y = ((e.clientY - b.top) / b.height) * CH;
    const hit = view.hits.filter((k) => Math.hypot(k.x - x, k.y - y) < k.r + 3).sort((a, c) => (a.kind === 'ship' ? -1 : 1) - (c.kind === 'ship' ? -1 : 1))[0] || null;
    view.hover = hit;
    drawChart(ctx, g, view);
    if (!hit) { tip.classList.add('hidden'); return; }
    tip.replaceChildren(...chartTip(g, hit).map((l, i) => (i ? h('div', {}, l) : h('b', {}, l))));
    tip.classList.remove('hidden');
    tip.style.left = `${Math.min(b.width - 220, (hit.x / CW) * b.width + 12)}px`;
    tip.style.top = `${(hit.y / CH) * b.height + 8}px`;
  });
  canvas.addEventListener('mouseleave', () => { view.hover = null; tip.classList.add('hidden'); drawChart(ctx, g, view); });
  canvas.addEventListener('click', () => { if (view.hover?.kind === 'ship') go({ tab: 'Fleet', sel: view.hover.id }); else if (view.hover?.kind === 'port') go({ tab: 'Ports', sel: view.hover.id }); });
}

function fleet(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const vs = Lg.vessels();
  const sel = Lg.vessel(opts.sel) || vs[0];
  const list = h('div', { class: 'logi-card logi-list' });
  for (const v of vs) list.append(vesselRow(g, v, () => go({ tab: 'Fleet', sel: v.id })));
  body.append(h('div', { class: 'logi-split' }, list, sel ? vesselDetail(ui, sel, opts, go, act) : h('div')));
}

function vesselDetail(ui, v, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const m = Lg.model(v.model);
  const st = Lg.stats(v);
  const card = h('div', { class: 'logi-card' });
  const name = h('input', { value: v.name, maxlength: 28, class: 'logi-input' });
  card.append(shipCanvas(v.appearance, 300, 90),
    h('div', { class: 'row' }, name, h('button', { class: 'small', onclick: () => act(Lg.rename(v.id, name.value), { sel: v.id }) }, 'Rename')),
    h('table', { class: 'logi-table' },
      h('tr', {}, h('th', {}, 'Class'), h('td', {}, `${m.name} · ${Lg.cls(m).name}`)),
      h('tr', {}, h('th', {}, 'Status'), h('td', {}, `${STATUS[v.status]}${v.port ? ` — ${Lg.port(v.port).name}` : ''}`)),
      h('tr', {}, h('th', {}, 'Capacity'), h('td', {}, `${st.capacity} units${v.cargo ? ` (carrying ${v.cargo.units}${v.cargo.type === 'arms' ? ` crates for ${g.content.arms.countries[v.cargo.country].name}` : ''})` : ''}`)),
      h('tr', {}, h('th', {}, 'Speed · range'), h('td', {}, `${st.speed} knots · ${num(st.range)} km`)),
      h('tr', {}, h('th', {}, 'Reliability'), h('td', {}, `${Math.round(st.reliability * 100)}%`)),
      h('tr', {}, h('th', {}, 'Costs'), h('td', {}, `${st.opex}/day at sea · ${st.upkeep}/day in port`)),
      h('tr', {}, h('th', {}, 'Condition'), h('td', {}, `${Math.round(v.condition)}% · ${num(v.sailedKm)} km sailed`)),
      h('tr', {}, h('th', {}, 'Abilities'), h('td', {}, st.tags.length ? st.tags.join(', ') : '—'))));
  const vis = h('label', { class: 'logi-check' }, h('input', { type: 'checkbox', checked: v.visible, onchange: (e) => act(Lg.setVisible(v.id, e.target.checked), { sel: v.id }) }), ' Show at the Yards berths (when its port is on a berth)');
  card.append(vis);
  if (v.status === 'docked') {
    if (v.condition < 100) card.append(h('button', { class: 'small', onclick: () => act(Lg.repair(v.id), { sel: v.id }) }, `Repair (${num(Lg.repairQuote(v))})`));
    const dest = h('select', { class: 'logi-input' }, ...Object.entries(Lg.cfg.ports).filter(([id]) => id !== v.port).sort((a, b) => (Lg.ownsPort(b[0]) - Lg.ownsPort(a[0])) || a[1].name.localeCompare(b[1].name)).map(([id, p]) => h('option', { value: id, selected: id === opts.dest }, `${Lg.ownsPort(id) ? '★ ' : ''}${p.name}`)));
    const to = opts.dest || dest.value;
    const pl = Lg.plan(v, to);
    dest.addEventListener('change', () => go({ sel: v.id, dest: dest.value }));
    card.append(h('h4', {}, 'Send to another port'), h('div', { class: 'row' }, dest,
      h('button', { class: 'small primary', disabled: !pl.ok, onclick: () => act(Lg.sail(v.id, to), { sel: v.id }) }, 'Sail')),
    h('p', { class: 'muted' }, pl.ok ? `${num(pl.km)} km · about ${hrs(pl.hours)} · costs ${num(pl.cost)} (running ${pl.opex}, fees ${pl.fees})` : `Can't: ${pl.reasons.join('; ')}.`));
  }
  if (v.log.length) {
    card.append(h('h4', {}, 'Voyage log'));
    for (const l of v.log.slice(0, 8)) {
      const what = l.shipment ? `arms export (${l.cargo})` : l.contract ? `contract (${l.cargo || 'cargo'})` : 'sailing empty';
      card.append(h('div', { class: 'logi-line' }, `${Lg.when(l.arrived)} · ${Lg.port(l.from).name} → ${Lg.port(l.to).name} · ${num(l.km)} km${l.departed ? ` in ${hrs((l.arrived - l.departed) / 60)}` : ''} · ${what}${l.delays ? ` · ${l.delays} delay${l.delays === 1 ? '' : 's'}` : ''}`));
    }
  }
  return card;
}

function ports(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const S = Lg.state;
  // the three Yards berths
  const berths = h('div', { class: 'logi-card' }, h('h3', {}, 'Mill Road Yards berths'), h('p', { class: 'muted' }, 'Three berths on the Yards quay show the ships in port at three of your ports. This only changes what you see there — not who owns what.'));
  for (let i = 0; i < Lg.L.physicalBerths; i++) {
    const cur = S.display.berths[i] || '';
    const sel = h('select', { class: 'logi-input', onchange: (e) => act(Lg.setBerth(i, e.target.value || null), { tab: 'Ports' }) },
      h('option', { value: '' }, '— empty —'), ...Lg.ownedPorts().map((id) => h('option', { value: id, selected: id === cur }, Lg.port(id).name)));
    berths.append(h('div', { class: 'row' }, h('b', {}, `Berth ${i + 1}`), sel));
  }
  body.append(berths);
  const owned = h('div', { class: 'logi-card' }, h('h3', {}, `Your ports (${Lg.ownedPorts().length} of ${Lg.L.maxPorts})`));
  const t = h('table', { class: 'logi-table' }, h('tr', {}, ...['Port', 'Type', 'Berths', 'In port', 'Upkeep', 'Services'].map((x) => h('th', {}, x))));
  for (const id of Lg.ownedPorts()) {
    const p = Lg.port(id);
    const pt = Lg.portType(id);
    t.append(h('tr', { class: id === opts.sel ? 'sel' : '' }, h('td', {}, p.name), h('td', {}, pt.name), h('td', {}, `${Lg.atPort(id).length + Lg.inbound(id).length}/${pt.berths}`), h('td', {}, Lg.atPort(id).map((v) => v.name).join(', ') || '—'), h('td', {}, `${pt.upkeep}/day`), h('td', {}, pt.services.join(', '))));
  }
  owned.append(t);
  body.append(owned);
  const market = h('div', { class: 'logi-card' }, h('h3', {}, 'Ports for sale'));
  const m = h('table', { class: 'logi-table' }, h('tr', {}, ...['Port', 'Country', 'Type', 'Berths · max size', 'Upkeep', 'Price', ''].map((x) => h('th', {}, x))));
  const full = Lg.ownedPorts().length >= Lg.L.maxPorts;
  for (const [id, p] of Object.entries(Lg.cfg.ports)) {
    if (Lg.ownsPort(id)) continue;
    const pt = Lg.cfg.portTypes[p.type];
    m.append(h('tr', { class: id === opts.sel ? 'sel' : '', title: p.blurb }, h('td', {}, p.name), h('td', {}, p.country ? g.content.arms.countries[p.country].name : 'Free port'), h('td', {}, pt.name), h('td', {}, `${pt.berths} · ${pt.maxSize}`), h('td', {}, pt.upkeep), h('td', {}, num(pt.price)),
      h('td', {}, h('button', { class: 'small', disabled: full || g.player.money < pt.price, onclick: () => act(Lg.buyPort(id), { tab: 'Ports' }) }, 'Buy'))));
  }
  market.append(m);
  body.append(market);
}

function contracts(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const C = Lg.cfg;
  const show = (title, list, actions) => {
    const card = h('div', { class: 'logi-card' }, h('h3', {}, title));
    if (!list.length) card.append(h('p', { class: 'muted' }, 'None.'));
    for (const c of list) {
      const T = C.contractTypes[c.type];
      const row = h('div', { class: `logi-contract${c.id === opts.sel ? ' sel' : ''}` },
        h('div', { class: 'grow' },
          h('b', {}, `${T.name} — ${c.units} units`), h('span', { class: 'muted' }, ` for ${C.clients[c.client].name}`), h('br'),
          `${Lg.port(c.from).name} → ${Lg.port(c.to).name} · ${num(c.km)} km · pays ${num(c.pay)}${T.earlyBonus ? ` (+${Math.round(T.earlyBonus * 100)}% if early)` : ''} · deliver by ${Lg.when(c.deadline)}`,
          T.needs ? h('span', { class: 'logi-tag' }, `needs ${T.needs}`) : null, h('span', { class: `logi-tag risk-${T.risk}` }, `risk ${T.risk}`),
          c.result ? h('div', { class: 'muted' }, c.result.paid ? `Paid ${num(c.result.paid)}${c.result.late ? ' (late)' : ''}` : `Penalty ${num(c.result.penalty || 0)} — ${c.result.note}`) : null,
          c.vessel ? h('div', { class: 'muted' }, `Ship: ${Lg.vessel(c.vessel)?.name}${c.arrive ? ` · ETA ${Lg.when(Lg.vessel(c.vessel)?.voyage?.arrive || c.arrive)}` : ''}`) : null),
        h('div', { class: 'logi-actions' }, ...actions(c)));
      card.append(row);
      if (c.id === opts.sel && ['available', 'accepted'].includes(c.status)) card.append(assignBox(ui, c, act));
    }
    body.append(card);
  };
  show('On offer', Lg.contracts('available'), (c) => [h('button', { class: 'small primary', onclick: () => go({ tab: 'Contracts', sel: c.id }) }, 'Choose a ship…'), h('button', { class: 'small', onclick: () => act(Lg.accept(c.id), { tab: 'Contracts' }) }, 'Accept')]);
  show('Accepted — awaiting a ship', Lg.contracts('accepted'), (c) => [h('button', { class: 'small primary', onclick: () => go({ tab: 'Contracts', sel: c.id }) }, 'Assign a ship…'), h('button', { class: 'small', onclick: () => act(Lg.abandon(c.id), { tab: 'Contracts' }) }, 'Cancel')]);
  show('Under way', Lg.contracts(['loading', 'transit']), () => []);
  show('Finished', Lg.contracts(['delivered', 'failed']).slice(-8).reverse(), () => []);
}

function assignBox(ui, c, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const box = h('div', { class: 'logi-assign' }, h('b', {}, 'Ships'));
  for (const v of Lg.vessels()) {
    const q = Lg.quote(c.id, v.id);
    box.append(h('div', { class: 'logi-line' },
      h('span', { class: 'grow' }, h('b', {}, v.name), ` — `, q.ok ? `arrives ${Lg.when(q.arrive)} ${q.onTime ? '✓ on time' : '⚠ late'} · costs ${num(q.cost)} · profit ${num(q.profit)}` : h('span', { class: 'muted' }, q.reasons.join('; '))),
      h('button', { class: 'small primary', disabled: !q.ok, onclick: () => { if (c.status === 'available') Lg.accept(c.id); act(Lg.assign(c.id, v.id), { tab: 'Contracts' }); } }, 'Assign')));
  }
  return box;
}

function brokerage(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const C = Lg.cfg;
  const cls = opts.cls || 'all';
  body.append(h('div', { class: 'row logi-filters' }, h('b', {}, 'Halver Marine Brokers — '), ...[['all', 'All'], ...Object.entries(C.classes).map(([k, c]) => [k, c.name])].map(([k, label]) => h('button', { class: `small${cls === k ? ' primary' : ''}`, onclick: () => go({ tab: 'Brokerage', cls: k }) }, label))));
  const portSel = (mid) => {
    const ok = Lg.ownedPorts().filter((id) => !Lg.berthCheck({ model: mid, status: 'docked' }, id));
    return ok;
  };
  for (const id of C.dealership) {
    const m = C.ships[id];
    if (cls !== 'all' && m.cls !== cls) continue;
    const k = C.classes[m.cls];
    const ok = portSel(id);
    const where = h('select', { class: 'logi-input' }, ...ok.map((pid) => h('option', { value: pid }, Lg.port(pid).name)));
    const name = h('input', { class: 'logi-input', placeholder: 'Name her', maxlength: 28 });
    const can = g.player.money >= m.price && ok.length;
    body.append(h('div', { class: 'logi-card logi-broker' },
      shipCanvas(m.look, 220, 70),
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, `${m.name}`), h('span', { class: 'logi-price' }, `${num(m.price)} obols`)),
        h('div', { class: 'muted' }, `${k.name} · size ${k.size}${k.needsPortType ? ` · berths only at ${C.portTypes[k.needsPortType].name.toLowerCase()}s` : ''}`),
        h('p', {}, m.blurb),
        h('div', { class: 'logi-specs' }, `${m.capacity} units · ${m.speed} kn · ${num(m.range)} km · reliability ${Math.round(m.reliability * 100)}% · ${m.opex}/day at sea · ${m.upkeep}/day in port · ${k.slots} upgrade slot${k.slots === 1 ? '' : 's'}${m.tags.length ? ` · ${m.tags.join(', ')}` : ''}`),
        h('div', { class: 'row' }, name, ok.length ? where : h('span', { class: 'muted' }, 'None of your ports can berth it.'),
          h('button', { class: 'small primary', disabled: !can, onclick: () => act(Lg.buyShip(id, where.value, name.value), { tab: 'Brokerage', cls }) }, 'Buy')))));
  }
}

function finances(ui, body) {
  const g = ui.game;
  const Lg = g.logistics;
  const L = Lg.state.ledger;
  body.append(h('div', { class: 'logi-kpis' },
    h('div', { class: 'logi-kpi' }, h('span', {}, 'Revenue (all time)'), h('b', {}, num(L.revenue))),
    h('div', { class: 'logi-kpi' }, h('span', {}, 'Expenses (all time)'), h('b', {}, num(L.expenses)), h('small', {}, 'incl. the company, ports and ships')),
    h('div', { class: 'logi-kpi' }, h('span', {}, 'Daily upkeep'), h('b', {}, num(Lg.dailyUpkeep())))));
  const t = h('table', { class: 'logi-table' }, h('tr', {}, h('th', {}, 'Day'), h('th', {}, 'Revenue'), h('th', {}, 'Expenses'), h('th', {}, 'Net')));
  for (const d of L.days) t.append(h('tr', {}, h('td', {}, `Day ${d.day}`), h('td', {}, num(d.revenue)), h('td', {}, num(d.expenses)), h('td', { class: d.revenue - d.expenses < 0 ? 'neg' : 'pos' }, num(d.revenue - d.expenses))));
  body.append(h('div', { class: 'logi-card' }, h('h3', {}, 'Last 30 days'), t));
}

function reports(ui, body) {
  const g = ui.game;
  const Lg = g.logistics;
  const card = h('div', { class: 'logi-card' }, h('h3', {}, 'Reports'));
  for (const r of Lg.state.reports) card.append(h('div', { class: 'logi-line' }, h('span', { class: 'muted' }, Lg.when(r.at)), ' ', r.text));
  if (!Lg.state.reports.length) card.append(h('p', { class: 'muted' }, 'Nothing yet.'));
  body.append(card);
}
