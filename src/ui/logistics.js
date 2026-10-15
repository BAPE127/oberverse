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

export const LOGI_TABS = ['Overview', 'Chart', 'Fleet', 'Ports', 'Contracts', 'Missions', 'Brokerage', 'Warships', 'Shipyard', 'Parts', 'Finances', 'Reports'];
const STATUS = { docked: 'In port', loading: 'Loading', underway: 'At sea', mission: 'On a mission', lost: 'Lost', retired: 'Retired' };
const OUTCOME = { repelled: 'pirates driven off', delay: 'a chase and a delay', ransom: 'a ransom', cargo: 'the cargo seized', captured: 'the ship captured' };
const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
/** A one-line risk summary for a quote. */
const riskLine = (r) => (r ? `risk ${r.category} (${pct(r.chance)}) · worst case: ${OUTCOME[r.worst]}${r.exposure.names.length ? ` · through ${r.exposure.names.join(', ')}` : ''}` : '');
const CSTATUS = { available: 'Offered', accepted: 'Accepted', loading: 'Loading', transit: 'In transit', delivered: 'Delivered', failed: 'Failed', expired: 'Expired', lost: 'Lost to pirates' };
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
  // dangerous water: pirate waters, war zones, blockades (dashed when your missions have it suppressed)
  for (const z of Lg.zones()) {
    const r = (z.radius / 111) * (CW / 360);
    ctx.fillStyle = z.war ? 'rgba(200,60,40,0.12)' : z.embargo ? 'rgba(160,60,160,0.1)' : `rgba(200,40,40,${0.06 + z.danger * 0.14})`;
    ctx.strokeStyle = z.war ? 'rgba(200,60,40,0.55)' : z.embargo ? 'rgba(160,60,160,0.5)' : 'rgba(180,30,30,0.6)';
    ctx.setLineDash(Lg.state.suppressed?.[z.id] > g.clock.total ? [4, 4] : []);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(X(z.lon), Y(z.lat), r / Math.max(0.35, Math.cos(z.lat * Math.PI / 180)), r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    view.hits.push({ x: X(z.lon), y: Y(z.lat), r: 9, kind: 'zone', id: z.id, zone: z });
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
    ctx.fillStyle = v.kind === 'warship' ? '#2a3440' : v.voyage?.events?.some((e) => e.done && g.clock.total - e.at < e.hours * 60) ? '#c0402a' : '#1e5aa0';
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
  if (hit.kind === 'zone') {
    const z = hit.zone;
    const sup = Lg.state.suppressed?.[z.id] > g.clock.total;
    return [`⚠ ${z.name[0].toUpperCase()}${z.name.slice(1)}`, `danger ${Math.round(z.danger * 100)}%${sup ? ' (suppressed by your patrols)' : ''}`, z.war ? 'A war zone (the arms market\'s wars).' : z.embargo ? 'A blockade round an embargoed country.' : (Lg.cfg.pirateWaters[z.id]?.blurb || '')];
  }
  if (hit.kind === 'port') {
    const p = Lg.cfg.ports[hit.id];
    const pt = Lg.cfg.portTypes[p.type];
    const country = p.country ? g.content.arms.countries[p.country].name : 'Free port';
    const ships = Lg.atPort(hit.id).map((v) => v.name);
    return [`${p.name}${Lg.ownsPort(hit.id) ? ' ★ yours' : ''}`, `${pt.name} · ${country}`, ships.length ? `In port: ${ships.join(', ')}` : '', Lg.ownsPort(hit.id) ? '' : `Price ${num(pt.price)} · call fee ${pt.fee}`].filter(Boolean);
  }
  const v = Lg.vessel(hit.id);
  const m = Lg.model(v.model);
  const out = [`${v.name} — ${m.name}`, `${STATUS[v.status]}${v.port ? ` ${v.status === 'mission' ? 'off' : 'at'} ${Lg.port(v.port).name}` : ''} · condition ${Math.round(v.condition)}%`];
  if (v.status === 'mission') { const ms = Lg.missions.get(v.mission); if (ms) out.push(`${Lg.cfg.missionTypes[ms.type].name} — back ${Lg.when(ms.end)}`); }
  if (v.voyage?.escortOf) out.push(`Escorting the ${Lg.vessel(v.voyage.escortOf)?.name}`);
  if (v.status === 'underway') {
    const V = v.voyage;
    const pos = Lg.position(v);
    out.push(`${Lg.port(V.from).name} → ${Lg.port(V.to).name}`, `${Math.round(pos.f * 100)}% of ${num(V.km)} km · ETA ${Lg.when(V.arrive)}`);
    const c = V.contract && Lg.contract(V.contract);
    if (c) out.push(`Cargo: ${c.units} units for ${Lg.cfg.clients[c.client].name}`);
    if (v.cargo?.type === 'arms') out.push(`Cargo: ${v.cargo.units} crates for ${g.content.arms.countries[v.cargo.country].name}`);
    const late = c && V.arrive > c.deadline;
    if (late) out.push('⚠ Running late for the deadline');
    for (const i of V.incidents || []) out.push(`🏴 ${i.text.replace(/^🏴\s*/, '')}`);
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
  ({ Overview: overview, Chart: chart, Fleet: fleet, Ports: ports, Contracts: contracts, Missions: missions, Brokerage: brokerage, Warships: warships, Shipyard: shipyard, Parts: partsStore, Finances: finances, Reports: reports })[tab](ui, body, opts, go, act);
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
      h('tr', {}, h('th', {}, 'Abilities'), h('td', {}, st.tags.length ? st.tags.join(', ') : '—')),
      h('tr', {}, h('th', {}, 'Combat'), h('td', {}, `attack ${st.combat.attack} · defence ${st.combat.defense} · detection ${st.combat.detection} · stealth ${st.combat.stealth}${st.combat.mounts ? ` · ${st.combat.mounts} mounts` : ''}`)),
      st.bonuses.length ? h('tr', {}, h('th', {}, 'Fleet bonus'), h('td', {}, st.bonuses.map((b) => `${Lg.cfg.bonuses[b].name}: ${Lg.cfg.bonuses[b].text}`).join(' '))) : null));
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
          T.needs ? h('span', { class: 'logi-tag' }, `needs ${T.needs}`) : null, routeRiskTag(Lg, c),
          c.result ? h('div', { class: 'muted' }, c.result.paid ? `Paid ${num(c.result.paid)}${c.result.late ? ' (late)' : ''}` : c.result.insurance ? `Lost (${c.result.note}) — insurance paid ${num(c.result.insurance)}` : `Penalty ${num(c.result.penalty || 0)} — ${c.result.note}`) : null,
          c.vessel ? h('div', { class: 'muted' }, `Ship: ${Lg.vessel(c.vessel)?.name}${c.arrive ? ` · ETA ${Lg.when(Lg.vessel(c.vessel)?.voyage?.arrive || c.arrive)}` : ''}`) : null),
        h('div', { class: 'logi-actions' }, ...actions(c)));
      card.append(row);
      if (c.id === opts.sel && ['available', 'accepted'].includes(c.status)) card.append(assignBox(ui, c, act, opts, go));
    }
    body.append(card);
  };
  show('On offer', Lg.contracts('available'), (c) => [h('button', { class: 'small primary', onclick: () => go({ tab: 'Contracts', sel: c.id }) }, 'Choose a ship…'), h('button', { class: 'small', onclick: () => act(Lg.accept(c.id), { tab: 'Contracts' }) }, 'Accept')]);
  show('Accepted — awaiting a ship', Lg.contracts('accepted'), (c) => [h('button', { class: 'small primary', onclick: () => go({ tab: 'Contracts', sel: c.id }) }, 'Assign a ship…'), h('button', { class: 'small', onclick: () => act(Lg.abandon(c.id), { tab: 'Contracts' }) }, 'Cancel')]);
  show('Under way', Lg.contracts(['loading', 'transit']), () => []);
  show('Finished', Lg.contracts(['delivered', 'failed', 'lost']).slice(-8).reverse(), () => []);
}

/** The route's piracy risk for an ordinary unescorted cargo ship (the actual ship's risk is in the assign box). */
function routeRiskTag(Lg, c) {
  const probe = { model: Lg.L.starterShip.model, status: 'docked', condition: 100 };
  const r = Lg.voyageRisk(probe, c.from, c.to, { cargo: c.type, value: c.pay });
  const cls = r.category === 'low' ? 'risk-low' : r.category === 'moderate' ? 'risk-medium' : 'risk-high';
  return h('span', { class: `logi-tag ${cls}`, title: r.exposure.names.length ? `Through ${r.exposure.names.join(', ')}` : 'Safe water' }, `route risk ${r.category} (${pct(r.chance)})`);
}

function assignBox(ui, c, act, opts, go) {
  const g = ui.game;
  const Lg = g.logistics;
  const esc = (opts.esc || []).filter((id) => Lg.vessel(id));
  const svc = { escorts: esc, guards: Boolean(opts.guards), insure: Boolean(opts.insure) };
  const R = Lg.cfg.risk;
  const set = (patch) => go({ tab: 'Contracts', sel: c.id, esc, guards: svc.guards, insure: svc.insure, ...patch });
  const warships = Lg.vessels().filter((v) => v.kind === 'warship' && v.status === 'docked' && v.port === c.from && Lg.stats(v).tags.includes('escort'));
  const box = h('div', { class: 'logi-assign' },
    h('div', { class: 'row logi-filters' },
      h('b', {}, 'Protection:'),
      h('label', { class: 'logi-check' }, h('input', { type: 'checkbox', checked: svc.guards, onchange: (e) => set({ guards: e.target.checked }) }), ` Hire guards (+${R.guards.defense} defence, ${num(Math.max(R.guards.min, c.pay * R.guards.costShare))})`),
      h('label', { class: 'logi-check' }, h('input', { type: 'checkbox', checked: svc.insure, onchange: (e) => set({ insure: e.target.checked }) }), ` Insure the cargo (${num(c.pay * R.insurance.rate)}; pays ${Math.round(R.insurance.payout * 100)}% if it's lost)`)),
    warships.length ? h('div', { class: 'row logi-filters' }, h('b', {}, 'Escorts:'), ...warships.map((w) => h('label', { class: 'logi-check' }, h('input', { type: 'checkbox', checked: esc.includes(w.id), onchange: (e) => set({ esc: e.target.checked ? [...esc, w.id] : esc.filter((x) => x !== w.id) }) }), ` ${w.name} (${Lg.model(w.model).name})`))) : h('div', { class: 'muted' }, 'No warships free at this port to escort.'),
    h('b', {}, 'Ships'));
  for (const v of Lg.vessels()) {
    if (v.kind === 'warship' && !Lg.stats(v).capacity) continue;
    if (esc.includes(v.id)) continue;
    const q = Lg.quote(c.id, v.id, svc);
    box.append(h('div', { class: 'logi-line' },
      h('span', { class: 'grow' }, h('b', {}, v.name), ' — ', q.ok ? `arrives ${Lg.when(q.arrive)} ${q.onTime ? '✓ on time' : '⚠ late'} · costs ${num(q.cost)} · profit ${num(q.profit)} · ${riskLine(q.risk)}` : h('span', { class: 'muted' }, q.reasons.join('; '))),
      h('button', { class: 'small primary', disabled: !q.ok, onclick: () => { if (c.status === 'available') Lg.accept(c.id); act(Lg.assign(c.id, v.id, svc), { tab: 'Contracts', esc: [], guards: false, insure: false }); } }, 'Assign')));
  }
  return box;
}

function brokerage(ui, body, opts, go, act) {
  const C = ui.game.logistics.cfg;
  catalogue(ui, body, opts, go, act, { tab: 'Brokerage', title: 'Halver Marine Brokers — cargo ships', list: C.dealership, classes: C.classes });
}

function warships(ui, body, opts, go, act) {
  const C = ui.game.logistics.cfg;
  body.append(h('p', { class: 'muted' }, 'Kestrel Naval Surplus & Sons — "Previously owned by navies that no longer need them, or no longer exist." Warships escort your convoys, run missions and make your fleet safer. Most carry no cargo.'));
  catalogue(ui, body, opts, go, act, { tab: 'Warships', title: 'Kestrel Naval Surplus — warships', list: C.warshipDealership, classes: C.warshipClasses });
}

function catalogue(ui, body, opts, go, act, { tab, title, list, classes }) {
  const g = ui.game;
  const Lg = g.logistics;
  const C = Lg.cfg;
  const cls = opts.cls && classes[opts.cls] ? opts.cls : 'all';
  body.append(h('div', { class: 'row logi-filters' }, h('b', {}, `${title} — `), ...[['all', 'All'], ...Object.entries(classes).map(([k, c]) => [k, c.name])].map(([k, label]) => h('button', { class: `small${cls === k ? ' primary' : ''}`, onclick: () => go({ tab, cls: k }) }, label))));
  for (const id of list) {
    const m = C.ships[id];
    if (cls !== 'all' && m.cls !== cls) continue;
    const probe = { model: id, status: 'docked' };
    const st = Lg.stats(probe);
    const ok = Lg.ownedPorts().filter((pid) => !Lg.berthCheck(probe, pid));
    const where = h('select', { class: 'logi-input' }, ...ok.map((pid) => h('option', { value: pid }, Lg.port(pid).name)));
    const name = h('input', { class: 'logi-input', placeholder: 'Name her', maxlength: 28 });
    const can = g.player.money >= m.price && ok.length;
    const needs = [].concat(st.needsPortType || []);
    body.append(h('div', { class: 'logi-card logi-broker' },
      shipCanvas(m.look, 220, 70),
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, m.name), h('span', { class: 'logi-price' }, `${num(m.price)} obols`)),
        h('div', { class: 'muted' }, `${Lg.className(m)} · size ${st.size}${needs.length ? ` · berths only at ${needs.map((t) => C.portTypes[t].name.toLowerCase()).join(' or ')}s` : ''}`),
        h('p', {}, m.blurb),
        h('div', { class: 'logi-specs' }, `${st.capacity ? `${st.capacity} units · ` : 'no cargo · '}${m.speed} kn · ${num(m.range)} km · reliability ${Math.round(m.reliability * 100)}% · ${m.opex}/day at sea · ${m.upkeep}/day in port${C.classes[m.cls]?.slots ? ` · ${C.classes[m.cls].slots} upgrade slot${C.classes[m.cls].slots === 1 ? '' : 's'}` : ''}${st.tags.length ? ` · ${st.tags.join(', ')}` : ''}`),
        m.kind === 'warship' ? h('div', { class: 'logi-specs' }, `⚔ attack ${st.combat.attack} · defence ${st.combat.defense} · detection ${st.combat.detection} · stealth ${st.combat.stealth} · ${st.combat.mounts} mounts${st.bonuses.length ? ` · ★ ${st.bonuses.map((b) => C.bonuses[b].name).join(', ')}` : ''}`) : null,
        h('div', { class: 'row' }, name, ok.length ? where : h('span', { class: 'muted' }, 'None of your ports can berth it.'),
          h('button', { class: 'small primary', disabled: !can, onclick: () => act(Lg.buyShip(id, where.value, name.value), { tab, cls }) }, 'Buy')))));
  }
}

function missions(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const M = Lg.missions;
  const T = Lg.cfg.missionTypes;
  const sel = (opts.ships || []).filter((id) => Lg.vessel(id));
  const card = (title) => { const c = h('div', { class: 'logi-card' }, h('h3', {}, title)); body.append(c); return c; };
  const offered = card('On offer');
  if (!M.list('available').length) offered.append(h('p', { class: 'muted' }, 'None today. Each of your ports offers a mission a day.'));
  for (const m of M.list('available')) {
    const t = T[m.type];
    const need = t.needs || {};
    const z = m.zone ? Lg.cfg.pirateWaters[m.zone] : null;
    const open = opts.sel === m.id;
    const row = h('div', { class: `logi-contract${open ? ' sel' : ''}` },
      h('div', { class: 'grow' },
        h('b', {}, `${t.name}`), h('span', { class: 'muted' }, ` for ${t.client} · from ${Lg.port(m.port).name}`), h('br'),
        `${t.text} ${m.type === 'deterrence' && z ? `Target: ${z.name}.` : ''}`, h('br'),
        `${m.hours} h on station · reward ${num(m.reward)} · difficulty ${Math.round(m.difficulty * 100)}`,
        h('span', { class: 'logi-tag' }, `uses ${Object.keys(t.weights).join(' + ')}`),
        need.tag ? h('span', { class: 'logi-tag' }, `needs ${need.tag}`) : null, need.minSpeed ? h('span', { class: 'logi-tag' }, `needs ${need.minSpeed}+ kn`) : null, need.capacity ? h('span', { class: 'logi-tag' }, `needs ${need.capacity}+ units aboard`) : null),
      h('div', { class: 'logi-actions' }, h('button', { class: 'small primary', onclick: () => go({ tab: 'Missions', sel: open ? null : m.id, ships: [] }) }, open ? 'Close' : 'Choose ships…')));
    offered.append(row);
    if (open) {
      const here = Lg.vessels().filter((v) => v.status === 'docked' && v.port === m.port);
      const q = M.quote(m.id, sel);
      offered.append(h('div', { class: 'logi-assign' },
        here.length ? h('div', { class: 'row logi-filters' }, ...here.map((v) => h('label', { class: 'logi-check' }, h('input', { type: 'checkbox', checked: sel.includes(v.id), onchange: (e) => go({ tab: 'Missions', sel: m.id, ships: e.target.checked ? [...sel, v.id] : sel.filter((x) => x !== v.id) }) }), ` ${v.name} (${Lg.model(v.model).name}, ${Math.round(v.condition)}%)`))) : h('p', { class: 'muted' }, `None of your ships is in port at ${Lg.port(m.port).name}.`),
        sel.length ? h('div', {}, q.ok ? `Estimate: ${q.category} (about ${Math.round(q.chance * 100)}%) · fitness ${q.score}/100 · running costs ${num(q.cost)}` : h('span', { class: 'muted' }, q.reasons.join('; '))) : null,
        h('button', { class: 'small primary', disabled: !q.ok, onclick: () => act(M.start(m.id, sel), { tab: 'Missions', sel: null, ships: [] }) }, 'Send them')));
    }
  }
  const active = card('Under way');
  if (!M.list('active').length) active.append(h('p', { class: 'muted' }, 'None.'));
  for (const m of M.list('active')) active.append(h('div', { class: 'logi-line' }, `${T[m.type].name} from ${Lg.port(m.port).name} — ${m.vessels.map((id) => Lg.vessel(id)?.name).join(', ')} · back ${Lg.when(m.end)}`));
  const done = card('Finished');
  const fin = M.list(['success', 'partial', 'failed']).slice(-8).reverse();
  if (!fin.length) done.append(h('p', { class: 'muted' }, 'None yet.'));
  for (const m of fin) done.append(h('div', { class: 'logi-line' }, `${T[m.type].name} from ${Lg.port(m.port).name} — ${m.status}${m.paid ? ` · ${num(m.paid)} obols` : ''}`));
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

// ------------------------------------------------------------------ the shipyard (v0.24.0)
function shipyard(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const C = Lg.cfg;
  // 1. Mason's Os and the yards
  const yards = h('div', { class: 'logi-card' }, h('h3', {}, 'Shipyards'));
  const rows = Lg.ownedPorts().map((id) => {
    const y = Y.yard(id);
    const q = Y.yardQuote(id);
    const status = y ? (y.status === 'ready' ? '✅ working' : `🏗 Mason's Os building — ready ${Lg.when(y.end)}`) : q.ok ? `can be built: ${num(q.cost)} obols, ${q.days} days${q.discount ? ` (crew goodwill −${Math.round(q.discount * 100)}%)` : ''}` : q.reasons[0];
    return h('div', { class: 'logi-line' }, h('span', { class: 'grow' }, h('b', {}, Lg.port(id).name), ` — ${status}`),
      !y && q.ok ? h('button', { class: 'small primary', disabled: g.player.money < q.cost, onclick: () => act(Y.commissionYard(id), { tab: 'Shipyard' }) }, 'Commission Mason\'s Os') : null);
  });
  yards.append(h('p', { class: 'muted' }, 'Mason\'s Os build the yard (a commercial port or bigger). A futuristic hull needs a yard at an advanced port (warships: advanced port or naval base) and the advanced licence.'), ...rows);
  body.append(yards);
  const ready = Y.yards();
  // 2. builds on the slips
  const builds = Y.state.builds.filter((b) => ['building', 'waiting'].includes(b.status));
  if (builds.length) {
    const bc = h('div', { class: 'logi-card' }, h('h3', {}, 'On the slips'));
    for (const b of builds) {
      const f = Math.min(1, (g.clock.total - b.start) / Math.max(1, b.end - b.start));
      bc.append(h('div', { class: 'logi-line' }, h('span', { class: 'grow' }, h('b', {}, b.design.name), ` — ${C.hulls[b.design.hull].name} at ${Lg.port(b.port).name} · ${b.status === 'waiting' ? 'finished, waiting for a free berth' : `${Math.round(f * 100)}% · launches ${Lg.when(b.end)}`}`),
        h('button', { class: 'small', onclick: () => act(Y.cancel(b.id), { tab: 'Shipyard' }) }, 'Cancel (parts back, 50% refund)')));
    }
    body.append(bc);
  }
  if (!ready.length) {
    body.append(h('p', { class: 'muted' }, 'Once a yard is ready, design and build your own ships here.'));
    return;
  }
  // 3. the designer
  const d = { kind: 'cargo', hull: null, components: [], name: '', appearance: { color: C.colours[0], trim: '#e8e2d4' }, port: ready[0], ...(opts.design || {}) };
  if (!ready.includes(d.port)) d.port = ready[0];
  const hulls = Object.entries(C.hulls).filter(([, H]) => H.kind === d.kind);
  if (!d.hull || C.hulls[d.hull]?.kind !== d.kind) d.hull = hulls[0][0];
  const H = C.hulls[d.hull];
  const set = (patch) => go({ tab: 'Shipyard', design: { ...d, ...patch } });
  const v = Y.validate(d, d.port);
  const designer = h('div', { class: 'logi-card' }, h('h3', {}, 'Design a ship'));
  designer.append(h('div', { class: 'row logi-filters' },
    h('b', {}, 'Yard:'), h('select', { class: 'logi-input', onchange: (e) => set({ port: e.target.value }) }, ...ready.map((id) => h('option', { value: id, selected: id === d.port }, Lg.port(id).name))),
    h('b', {}, 'Type:'), ...['cargo', 'warship'].map((k) => h('button', { class: `small${d.kind === k ? ' primary' : ''}`, onclick: () => set({ kind: k, hull: null, components: [] }) }, k === 'cargo' ? 'Cargo ship' : 'Warship'))));
  // hulls
  designer.append(h('div', { class: 'row logi-filters' }, h('b', {}, 'Hull:'), ...hulls.map(([id, X]) => h('button', { class: `small${id === d.hull ? ' primary' : ''}`, title: X.text, onclick: () => set({ hull: id, components: [] }) }, `${X.name} (${num(X.price)})`))));
  designer.append(h('div', { class: 'muted' }, `${H.text} · ${Lg.className({ cls: H.cls })} · size ${H.size} · ${H.slots} slots · ${H.maxWeight} t · ${H.power} power built in${H.mounts ? ` · ${H.mounts} weapon mounts` : ''} · needs: ${H.requires.map(([f, n, t]) => `${n > 1 ? `${n}× ` : ''}${t ? `${t} ` : ''}${f}`).join(', ')}`));
  const grid = h('div', { class: 'logi-designer' });
  // left: parts by family
  const pick = h('div', { class: 'logi-parts' });
  for (const fam of ['propulsion', 'power', 'cargo', 'navigation', 'defense', 'weapons', 'sensors', 'support']) {
    const list = Object.entries(C.components).filter(([, c]) => c.family === fam);
    if (!list.length) continue;
    pick.append(h('h4', {}, fam[0].toUpperCase() + fam.slice(1)));
    for (const [id, c] of list) {
      const why = Y.fits(d.hull, id);
      const n = d.components.filter((x) => x === id).length;
      const stock = Y.state.stock[id] || 0;
      pick.append(h('div', { class: `logi-line${why ? ' off' : ''}`, title: why || c.text },
        h('span', { class: 'grow' }, `${c.name} · ${num(c.price)} · ${c.weight} t${c.power ? ` · ${c.power > 0 ? '+' : ''}${c.power} power` : ''}${c.mounts ? ` · ${c.mounts} mounts` : ''}${stock ? ` · ${stock} in store` : ''}`, why ? h('span', { class: 'logi-bad' }, ` — ${why}`) : h('span', { class: 'muted' }, ` — ${c.text}`)),
        h('button', { class: 'small', disabled: Boolean(why) || d.components.length >= H.slots || n >= c.max, onclick: () => set({ components: [...d.components, id] }) }, '+')));
    }
  }
  // right: preview, installed parts (in slot order), paint, stats, problems, the bill
  const right = h('div');
  const canvas = h('canvas', { width: 520, height: 150, class: 'logi-preview' });
  const ctx = canvas.getContext('2d');
  const look = v.stats.look;
  const len = (look.len || 3) * 32;
  const sc = Math.min(1.6, 480 / len);
  ctx.save(); ctx.translate(260, 75); ctx.scale(sc, sc); drawShip(ctx, look, 0, 0, 0, {}); ctx.restore();
  right.append(canvas);
  const slots = h('div', { class: 'logi-card' }, h('b', {}, `Slots (${d.components.length}/${H.slots}) — stern to bow`));
  d.components.forEach((id, i) => {
    const c = C.components[id];
    const move = (dir) => { const arr = [...d.components]; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; set({ components: arr }); };
    slots.append(h('div', { class: 'logi-line' }, h('span', { class: 'grow' }, `${i + 1}. ${c?.name || id}`),
      h('button', { class: 'small', disabled: i === 0, onclick: () => move(-1) }, '▲'), h('button', { class: 'small', disabled: i === d.components.length - 1, onclick: () => move(1) }, '▼'),
      h('button', { class: 'small', onclick: () => set({ components: d.components.filter((_, k) => k !== i) }) }, '✖')));
  });
  if (!d.components.length) slots.append(h('div', { class: 'muted' }, 'Add parts from the list. Their order is where they sit on deck.'));
  right.append(slots);
  const swatches = (key) => h('div', { class: 'row logi-filters' }, h('b', {}, key === 'color' ? 'Hull:' : 'Trim:'), ...C.colours.map((col) => h('button', { class: `logi-swatch${d.appearance[key] === col ? ' on' : ''}`, style: `background:${col}`, title: col, onclick: () => set({ appearance: { ...d.appearance, [key]: col } }) })));
  const name = h('input', { class: 'logi-input', value: d.name, maxlength: 28, placeholder: 'Name her (optional)' });
  name.addEventListener('input', () => { d.name = name.value; });
  right.append(swatches('color'), swatches('trim'), h('div', { class: 'row' }, h('b', {}, 'Name:'), name));
  const st = v.stats;
  right.append(h('table', { class: 'logi-table' },
    h('tr', {}, h('th', {}, 'Cargo · speed · range'), h('td', {}, `${st.capacity} units · ${st.speed} kn · ${num(st.range)} km`)),
    h('tr', {}, h('th', {}, 'Reliability · costs'), h('td', {}, `${Math.round(st.reliability * 100)}% · ${st.opex}/day at sea · ${st.upkeep}/day in port`)),
    h('tr', {}, h('th', {}, 'Weight · power · mounts'), h('td', {}, `${v.weight}/${H.maxWeight} t · ${v.powerUsed}/${v.powerMade} · ${v.mounts}/${H.mounts}`)),
    h('tr', {}, h('th', {}, 'Combat'), h('td', {}, `attack ${st.combat.attack} · defence ${st.combat.defense} · detection ${st.combat.detection} · stealth ${st.combat.stealth}`)),
    h('tr', {}, h('th', {}, 'Abilities'), h('td', {}, [...st.tags, ...st.bonuses.map((b) => `★ ${C.bonuses[b].name}`)].join(', ') || '—'))));
  right.append(v.reasons.length ? h('div', {}, ...v.reasons.map((r) => h('div', { class: 'logi-bad' }, `✖ ${r}`))) : h('div', { class: 'logi-good' }, '✔ Seaworthy: meets every requirement for its class.'));
  right.append(h('div', { class: 'logi-specs' }, `Hull ${num(v.cost.hull)} + labour ${num(v.cost.labour)} = ${num(v.cost.now)} now · parts worth ${num(v.cost.parts)}${v.missing.length ? ` (still to buy: ${num(v.missingCost)})` : ' (all in the store)'} · ${v.days} days on the slip`));
  right.append(h('div', { class: 'row' },
    v.missing.length ? h('button', { class: 'small', disabled: g.player.money < v.missingCost, onclick: () => act(Y.buyMissing(d), { tab: 'Shipyard', design: d }) }, `Buy missing parts (${num(v.missingCost)})`) : null,
    h('button', { class: 'small primary', disabled: !v.ok || v.missing.length > 0 || g.player.money < v.cost.now, onclick: () => act(Y.commission(d), { tab: 'Shipyard', design: { ...d, components: [], name: '' } }) }, 'Lay the keel')));
  grid.append(pick, right);
  designer.append(grid);
  body.append(designer);
}

function partsStore(ui, body, opts, go, act) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const C = Lg.cfg;
  const lic = h('div', { class: 'logi-card' }, h('h3', {}, 'Licences'));
  for (const [id, t] of Object.entries(C.tech)) {
    lic.append(h('div', { class: 'logi-line' }, h('span', { class: 'grow' }, h('b', {}, t.name), ` — ${t.text}`), Y.state.tech[id] ? h('span', { class: 'logi-good' }, 'held') : h('button', { class: 'small primary', disabled: g.player.money < t.price, onclick: () => act(Y.buyTech(id), { tab: 'Parts' }) }, `Buy (${num(t.price)})`)));
  }
  body.append(lic);
  const store = h('div', { class: 'logi-card logi-parts' }, h('h3', {}, 'Parts store'), h('p', { class: 'muted' }, `Parts you buy wait here until a build uses them (at most ${Y.rules.maxStock} of each). A build reserves its parts when the keel is laid; cancelling returns them.`));
  for (const [id, c] of Object.entries(C.components)) {
    const have = Y.state.stock[id] || 0;
    const locked = c.tech === 'advanced' && !Y.state.tech.advanced;
    store.append(h('div', { class: `logi-line${locked ? ' off' : ''}` }, h('span', { class: 'grow' }, h('b', {}, c.name), ` · ${c.family} · ${c.tech} · ${num(c.price)} — ${c.text}`, have ? h('b', {}, ` · ${have} in store`) : null),
      h('button', { class: 'small', disabled: locked || g.player.money < c.price, onclick: () => act(Y.buyComponent(id, 1), { tab: 'Parts' }) }, 'Buy 1')));
  }
  body.append(store);
}
