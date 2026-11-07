// Base Operations (v0.103.4): the Hollowmoor installation as a map you can inspect and build on. The map is drawn from the lot's real layout (SLOTS in src/content/maps/hollowmoor.js) and each
// building's real state (src/war/facilities.js); a facility's panel shows its real capacity and use; "expand" orders the next facility of the same kind through the existing construction system
// (there are no facility levels in the game: a bigger barracks is another barracks, a bigger armoury is the armoury). Personnel and squads are the second tab; the factories' production is in their panel.
import { h, panel, stats, stat, btn, chip, empty, table, kv, tabs, bar, fmt } from './kit.js';
import { MapView } from './mapview.js';
import { SLOTS, HM_W, HM_H } from '../../content/maps/hollowmoor.js';
import { FACILITIES, LOT } from '../../content/facilities.js';
import { CLASSES } from '../../content/troops.js';
import { troopsPage } from '../militaryPages.js';
import { renderForces } from './forces.js';
import { productionTab } from '../militaryProduction.js';

const CAP_TEXT = { beds: (v) => `${v} beds`, meals: (v) => `${v} hot meals a day`, treat: (v) => `${v} treatment places`, stores: () => 'storage (the stores have no limit)', desks: (v) => `${v} desks`, lines: (v) => `${v} production lines`, bays: (v) => `${v} bays`, training: (v) => `${v} training places`, repair: (v) => `${v} repair places`, racks: (v) => `${v} weapon racks`, surgery: (v) => `${v} surgery theatres`, briefing: (v) => `a briefing room for ${v}` };
const STATE_TEXT = { none: 'Not built', permit: 'Awaiting permit', foundation: 'Foundations', frame: 'Frame', fitted: 'Fitting out', built: 'Operational', ruin: 'Ruin' };
const KIND_NAME = { office: 'Administration', barracks: 'Barracks', range: 'Training and firing range', armoury: 'Armoury', command: 'Command and briefing', mess: 'Mess hall', medical: 'Medical', motor_pool: 'Vehicle maintenance and storage', depot: 'Supply depot', tank_factory: 'Tank production', helicopter_works: 'Helicopter production', hangar: 'Aircraft hangars' };
const state = (S) => (S.base ||= { tab: 'map', sel: null });

/** The next facility of the same kind that is not built yet: what "expand" orders. */
const nextOfKind = (fac, f) => fac.filter((x) => x.kind === f.kind && x.id !== f.id && x.state === 'none').sort((a, b) => a.stage - b.stage || a.cost - b.cost)[0] || null;

/** What a facility is doing and how full it is, from real counts. */
function usage(cx, f) {
  const { W } = cx; const P = W.people(); const H = W.housing(); const B = W.baseView(); const cap = W.capacity(); const out = [];
  if (f.state !== 'built') return { rows: out, full: false };
  let full = false;
  if (f.kind === 'barracks') { out.push(['Occupancy (whole base)', `${P.length} of ${cap.beds} beds`]); full = P.length >= cap.beds; }
  if (f.kind === 'range') { const tr = P.filter((p) => p.status === 'training').length; out.push(['In training', `${tr} of ${cap.training} places`]); full = tr >= cap.training && cap.training > 0; }
  if (f.kind === 'medical') { out.push(['Wounded', `${B.wounded} of ${B.treat} treatment places`]); full = B.wounded >= B.treat && B.treat > 0; out.push(['Medicine in stock', fmt(B.medicine)]); }
  if (f.kind === 'mess') out.push(['Hot meals a day', `${B.meals} for ${P.length} people`]);
  if (f.kind === 'motor_pool') { out.push(['Vehicles housed', `${H.ground.used} of ${H.ground.total} bays`]); full = H.ground.free < 1 && H.ground.total > 0; }
  if (f.kind === 'hangar') { out.push(['Aircraft housed', `${H.air.used} of ${H.air.total} bays`]); full = H.air.free < 1 && H.air.total > 0; }
  if (['armoury', 'depot'].includes(f.kind)) out.push(['Items held (all stores)', `${fmt(H.stores.used)} · no limit`]);
  if (f.kind === 'command') out.push(['Officers on the books', String(P.filter((p) => CLASSES[p.role]?.leads).length)]);
  return { rows: out, full };
}

function status(cx, f) {
  if (f.state === 'none') return { label: f.canOrder ? 'Available to build' : 'Locked', tone: f.canOrder ? 'bl' : '', mode: 'site' };
  if (['permit', 'foundation', 'frame', 'fitted'].includes(f.state)) return { label: 'Under construction', tone: 'bl', mode: 'build' };
  if (f.state === 'ruin' || f.gate === 'destroyed') return { label: 'Ruin', tone: 'bad', mode: 'ruin' };
  if (f.gate === 'damaged') return { label: 'Damaged', tone: 'warn', mode: 'damaged' };
  const u = usage(cx, f); if (u.full) return { label: 'At capacity', tone: 'warn', mode: 'full' };
  return { label: 'Operational', tone: 'ok', mode: 'ok' };
}
const COLOUR = { ok: ['#27402a', '#7fae5e'], full: ['#4a3d16', '#d4a23c'], damaged: ['#4a3d16', '#d4a23c'], ruin: ['#4a2420', '#c8523f'], build: ['#1c3340', '#5f93a8'], site: ['#101714', '#34443b'] };

function mapFor(cx) {
  const { S } = cx;
  const mv = S.maps.base || new MapView({ min: 3, max: 60, draw: () => {} });
  const at = (wx, wy) => { for (const f of cx.W.facilities()) { const [x, y, w, hh] = SLOTS[f.slot]; if (wx >= x && wx < x + w && wy >= y && wy < y + hh) return f; } return null; };
  // handlers are set on every render so they always belong to the terminal that is open now
  mv.o.draw = (ctx, V) => drawBase(ctx, V, cx);
  mv.o.click = (wx, wy) => { const f = at(wx, wy); state(cx.S).sel = f ? f.id : null; cx.refresh(); };
  mv.o.hover = (wx, wy) => { const f = at(wx, wy); return f ? `${f.name} · ${status(cx, f).label}` : null; };
  if (!S.maps.base) {
    mv.fit(0, 0, HM_W, HM_H);
    mv.tools.append(btn('+', () => mv.zoomBy(1.3), { kind: 'sm' }), btn('−', () => mv.zoomBy(1 / 1.3), { kind: 'sm' }), btn('Fit', () => { mv.applyFit(); }, { kind: 'sm' }));
    S.maps.base = mv;
  }
  return mv;
}

function drawBase(ctx, V, cx) {
  const { W, S } = cx; const fac = W.facilities(); const sel = state(S).sel; const z = V.cam.z;
  const P = (x, y) => V.toScreen(x, y);
  ctx.fillStyle = '#0a0f0d'; ctx.fillRect(0, 0, V.size.w, V.size.h);
  // the lot: ground, paths, road, fence
  const [lx, ly] = P(6, 6); ctx.fillStyle = '#0f1613'; ctx.fillRect(lx, ly, 99 * z, 65 * z);
  ctx.strokeStyle = 'rgba(127,174,94,.07)'; ctx.lineWidth = 1; for (let x = 6; x <= 105; x += 6) { const [a, b] = P(x, 6); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a, b + 65 * z); ctx.stroke(); } for (let y = 6; y <= 71; y += 6) { const [a, b] = P(6, y); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 99 * z, b); ctx.stroke(); }
  const strip = (x, y, w, hh, col) => { const [a, b] = P(x, y); ctx.fillStyle = col; ctx.fillRect(a, b, w * z, hh * z); };
  strip(7, 36, 105, 4, '#1a2220'); strip(8, 19, 96, 2, '#141c19'); strip(8, 32, 96, 2, '#141c19'); strip(8, 53, 96, 2, '#141c19');
  ctx.setLineDash([z * 1.2, z * 1.2]); ctx.strokeStyle = 'rgba(205,214,208,.18)'; ctx.lineWidth = 1; { const [a, b] = P(7, 38); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 105 * z, b); ctx.stroke(); } ctx.setLineDash([]);
  ctx.strokeStyle = '#5f6f66'; ctx.lineWidth = Math.max(1, z * 0.5); ctx.strokeRect(lx, ly, 99 * z, 65 * z);
  { const [gx, gy] = P(103, 36); ctx.fillStyle = '#c8523f'; ctx.fillRect(gx, gy, z * 1.6, z * 4); const [tx, ty] = P(98, 41.4); ctx.fillStyle = '#7a8a81'; ctx.font = `${Math.max(9, z * 1.7)}px ui-monospace, monospace`; ctx.fillText('GATE', tx, ty); }
  // the buildings
  for (const f of fac) {
    const [x, y, w, hh] = SLOTS[f.slot]; const st = status(cx, f); const [fill, line] = COLOUR[st.mode]; const [a, b] = P(x, y);
    ctx.fillStyle = fill; ctx.fillRect(a, b, w * z, hh * z);
    if (st.mode === 'site') { ctx.setLineDash([4, 4]); ctx.strokeStyle = line; ctx.strokeRect(a + 0.5, b + 0.5, w * z, hh * z); ctx.setLineDash([]); }
    else { ctx.strokeStyle = line; ctx.lineWidth = f.id === sel ? 2.5 : 1.2; ctx.strokeRect(a, b, w * z, hh * z); }
    if (st.mode === 'build') { const done = { permit: 0.05, foundation: 0.3, frame: 0.6, fitted: 0.85 }[f.state] || 0; ctx.fillStyle = 'rgba(95,147,168,.35)'; ctx.fillRect(a, b + hh * z - 4, w * z * done, 4); }
    if (st.mode === 'ruin') { ctx.strokeStyle = 'rgba(200,82,63,.5)'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + w * z, b + hh * z); ctx.moveTo(a + w * z, b); ctx.lineTo(a, b + hh * z); ctx.stroke(); }
    if (f.id === sel) { ctx.strokeStyle = '#e8f4d8'; ctx.lineWidth = 1; ctx.strokeRect(a - 3, b - 3, w * z + 6, hh * z + 6); }
    const fs = Math.max(8, Math.min(13, z * 1.9)); ctx.font = `600 ${fs}px system-ui, sans-serif`; ctx.fillStyle = st.mode === 'site' ? '#6a7a71' : '#dbe5dc'; ctx.textBaseline = 'top';
    const label = f.name.replace(' & briefing room', '').replace(' & tank workshop', ''); if (w * z > fs * 3) ctx.fillText(label, a + 4, b + 4, w * z - 8);
    if (w * z > 70 && hh * z > 36) { ctx.font = `${Math.max(8, fs - 2)}px ui-monospace, monospace`; ctx.fillStyle = line; ctx.fillText(st.label.toUpperCase(), a + 4, b + 4 + fs + 3, w * z - 8); }
  }
  ctx.fillStyle = '#7a8a81'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('HOLLOWMOOR LOT · N ↑', 10, V.size.h - 18);
}

export function renderBase(cx, box) {
  const { W, S } = cx; const B = state(S); const V = W.companyView();
  box.append(tabs([{ id: 'map', label: 'Facilities' }, { id: 'people', label: 'Hire and squads' }, { id: 'forces', label: 'Battalions' }], B.tab, (t) => { B.tab = t; cx.refresh(); }));
  if (B.tab === 'forces') { renderForces(cx, box); return; }
  if (B.tab === 'people') { cx.ui.milPaged = true; const wrap = h('div', { class: 'osx-people' }); troopsPage(cx.ui, wrap, (r) => cx.go(r), () => cx.refresh()); box.append(wrap); return; }
  if (!V.lotOwned) { box.append(empty('The company owns no ground yet. Buy the Civic Office licence and Hollowmoor Lot from Command Overview.')); return; }
  const fac = W.facilities(); const sel = fac.find((f) => f.id === B.sel) || null;
  const built = fac.filter((f) => f.state === 'built').length; const dmg = fac.filter((f) => ['damaged', 'ruin'].includes(status(cx, f).mode)).length; const bld = fac.filter((f) => status(cx, f).mode === 'build').length;
  box.append(stats(stat('Operational', `${built}/${fac.length}`, { tone: built ? 'ok' : 'warn' }), stat('Under construction', String(bld), { tone: bld ? '' : '' }), stat('Damaged or ruined', String(dmg), { tone: dmg ? 'warn' : 'ok' }), stat('Company funds', `${fmt(V.cash)} ◎`)));
  box.append(h('div', { style: 'height:8px' }));
  const mv = mapFor(cx); mv.invalidate();
  const mapBox = h('div', { style: 'display:flex;flex-direction:column;min-height:480px' }); mv.mount(mapBox); mv.el.style.minHeight = '480px';
  const legend = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, chip('operational', 'ok'), chip('under construction', 'bl'), chip('damaged / at capacity', 'warn'), chip('ruin', 'bad'), chip('available site'));
  box.append(h('div', { class: 'osx-grid osx-gs' }, h('div', { class: 'osx-side', style: 'overflow:visible' }, panel('Base map · Hollowmoor Lot', [mapBox, legend], { sub: 'Click a building. Scroll to zoom, drag to pan.' })), h('div', { class: 'osx-side' }, sel ? detail(cx, sel, fac, V) : panel('Facility', [empty('Select a building on the map to inspect it, build it or expand the base.'), ...stageList(cx, fac)]))));
}

function stageList(cx, fac) {
  return [1, 2, 3].map((n) => { const rows = fac.filter((f) => f.stage === n); const open = rows[0].open; const done = rows.filter((f) => f.state === 'built').length; return kv(`Stage ${n} · ${['', 'a security firm', 'a small army', 'a military company'][n]}`, open ? `${done}/${rows.length} built` : 'opens after the stage before', open ? '' : 'warn'); });
}

function detail(cx, f, fac, V) {
  const { W } = cx; const st = status(cx, f); const u = usage(cx, f); const F = FACILITIES[f.id]; const next = nextOfKind(fac, f);
  const caps = Object.entries(F.capacity).filter(([k]) => CAP_TEXT[k]).map(([k, v]) => CAP_TEXT[k](v));
  const body = [h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, chip(st.label, st.tone), chip(`Stage ${f.stage}`), chip(KIND_NAME[F.kind] || F.kind)), h('div', { class: 'osx-sub', style: 'padding:0' }, F.text || ''),
    kv('Facility type', KIND_NAME[F.kind] || F.kind), kv('Tier', `Stage ${f.stage} · ${['', 'a security firm', 'a small army', 'a military company'][f.stage]}`), kv('Condition', f.state === 'built' ? (f.gate === 'damaged' ? 'damaged (half capacity)' : f.gate === 'destroyed' ? 'destroyed' : 'sound') : STATE_TEXT[f.state]), kv('Structure', `${F.hp} points${F.core ? ' · core: protected until a coup' : ''}`),
    f.state === 'built' || f.state === 'none' ? kv(f.state === 'built' ? 'Capacity' : 'Would give', caps.join(' · ') || '—') : kv('Will give', caps.join(' · ') || '—'),
    ...u.rows.map(([k, v]) => kv(k, v, u.full ? 'warn' : '')), u.full ? h('div', { class: 'osx-note bad', style: 'margin:0' }, 'At capacity: expand the base to hold more.') : null];
  if (['permit', 'foundation', 'frame', 'fitted'].includes(f.state)) body.push(kv('Construction', `${STATE_TEXT[f.state]}${f.daysLeft != null ? ` · ${f.daysLeft} days left in this stage` : ''}`), bar(({ permit: 0.05, foundation: 0.3, frame: 0.6, fitted: 0.85 }[f.state])));
  const actions = [];
  if (f.state === 'none') { const q = W.quote(f.id); body.push(kv('Cost', `${fmt(f.cost)} ◎`, V.cash < f.cost ? 'bad' : ''), kv('Construction time', `${F.days.reduce((a, b) => a + b, 0) + 1} days (permit, foundation, frame, fitting out)`), !f.open ? h('div', { class: 'osx-note bad', style: 'margin:0' }, 'This stage opens when every facility of the stage before has been built.') : null);
    actions.push(btn(`Build ${f.name} · ${fmt(f.cost)} ◎`, () => cx.go(W.commission(f.id)), { kind: 'pri', disabled: !f.canOrder || V.cash < f.cost })); void q; }
  if (f.repair) actions.push(btn(f.state === 'ruin' ? `Rebuild · ${fmt(f.repair)} ◎` : `Repair · ${fmt(f.repair)} ◎`, () => cx.go(W.repairFacility(f.id)), { kind: 'warn', disabled: V.cash < f.repair }));
  if (f.state === 'built' && next) { const dCap = Object.entries(FACILITIES[next.id].capacity).filter(([k]) => CAP_TEXT[k]).map(([k, v]) => `+${CAP_TEXT[k](v)}`).join(' · ');
    body.push(h('div', { class: 'osx-pan', style: 'padding:8px;border-color:var(--line2)' }, h('b', {}, 'Expand'), kv('Next', `${next.name} (stage ${next.stage})`), kv('Adds', dCap), kv('Cost', `${fmt(next.cost)} ◎`, V.cash < next.cost ? 'bad' : ''), kv('Construction time', `${FACILITIES[next.id].days.reduce((a, b) => a + b, 0) + 1} days`), !next.open ? h('div', { class: 'osx-sub', style: 'padding:0' }, 'Opens when the stage before is built.') : null,
      btn(`Order ${next.name}`, () => { cx.S.base.sel = next.id; cx.go(W.commission(next.id)); }, { kind: 'pri', disabled: !next.canOrder || V.cash < next.cost })));
  } else if (f.state === 'built') body.push(h('div', { class: 'osx-sub', style: 'padding:0' }, 'Nothing further of this kind can be built on the lot.'));
  if (actions.length) body.push(h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, ...actions));
  const out = [panel(f.name, body)];
  if (['tank_factory', 'helicopter_works'].includes(f.id) && f.state === 'built') { const wrap = h('div', {}); cx.ui.milPaged = true; productionTab(cx.ui, wrap, (r) => cx.go(r), () => cx.refresh()); out.push(panel('Production', wrap)); }
  void LOT; return h('div', { class: 'osx-side' }, ...out);
}
