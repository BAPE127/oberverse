// Theater Operations (v0.103.4): detailed operational maps of every theater of war, whether or not the company is in it. The ground is the strategic map's own (terrain, provinces, borders), tinted by who
// holds it; the fronts are where the two belligerents' ground touches. An observer sees the ground and the record, not the garrisons: forces are shown as "no intelligence" unless the company is in the
// theater, and then only its own battalions (the operational map, with its fog of war, is one tap away). Nothing here advances the war (src/war/theatreView.js is read-only).
import { h, panel, stats, stat, btn, chip, empty, kv, tabs, feedLine, fmt } from './kit.js';
import { MapView } from './mapview.js';
import { bakeTheatre, bakeControl, bakeLayer, COUNTRY_RGB } from '../../engine/drawStrategic.js';
import { atlasRivers, atlasRoads } from '../../world/atlas.js';
import { provinces } from '../../world/provinces.js';
import { theatreList, theatreDetail } from '../../war/theatreView.js';

const BAKE = new Map(); // theatre id → { map, pending, progress, ctl, ctlKey }
const state = (S) => (S.thp ||= { tab: 'intel', front: null, prov: null });
const STATUS_TONE = { 'At war': 'bad', 'Contested ground': 'warn', Tension: '' };

function ensureBake(cx, th) {
  let b = BAKE.get(th.id); if (b) return b;
  b = { map: null, pending: true, progress: 0 }; BAKE.set(th.id, b);
  bakeTheatre(th, 26, (f) => { b.progress = f; cx.S.maps.theatre?.invalidate(); }).then((map) => { b.map = map; b.pending = false; cx.S.maps.theatre?.invalidate(); if (cx.S.section === 'theaters') cx.refresh(); }).catch((e) => { b.pending = false; b.error = e.message; });
  return b;
}

export function renderTheaters(cx, box) {
  const { g, W, S, ui } = cx; const T = theatreList(g); const P = state(S);
  const id = S.theatre && T.some((t) => t.id === S.theatre) ? S.theatre : null;
  box.append(stats(stat('Theaters', String(T.length)), stat('At war', String(T.filter((t) => t.war).length), { tone: T.some((t) => t.war) ? 'bad' : 'ok' }), stat('Contested or at war', String(T.filter((t) => t.hot).length), { tone: 'warn' }), stat('Company involved in', T.some((t) => t.involved) ? T.find((t) => t.involved).name : 'none')));
  box.append(h('div', { style: 'height:8px' }));
  box.append(h('div', { class: 'osx-grid', style: 'grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px' }, ...T.map((t) => h('div', { class: 'osx-pan tap', style: `cursor:pointer;${t.id === id ? 'border-color:var(--gr);background:#121a16' : ''}`, onclick: () => { S.theatre = t.id; P.front = null; P.prov = null; cx.refresh(); } },
    h('div', { class: 'osx-pb', style: 'gap:2px;padding:7px 9px' }, h('div', { style: 'display:flex;justify-content:space-between;gap:6px;align-items:baseline' }, h('b', {}, t.name), chip(t.status, STATUS_TONE[t.status])), h('small', { style: 'color:var(--mut)' }, t.region), h('small', {}, `${t.names.join(' / ')}`), h('small', { style: 'color:var(--mut)' }, `${t.fronts} front${t.fronts === 1 ? '' : 's'} · ${t.held[t.between[0]]} / ${t.held[t.between[1]]} provinces held${t.involved ? ' · company here' : ''}`))))));
  if (!id) { box.append(h('div', { style: 'height:8px' }), empty('Select a theater to open its map. You can inspect any of them: you do not have to be in the war.')); return; }
  const d = theatreDetail(g, id); const b = ensureBake(cx, d.th);
  // the map for this theater (one at a time; its camera is kept while you stay on it)
  let mv = S.maps.theatre; if (!mv || mv.theatreId !== id) { mv?.unmount(); mv = new MapView({ min: 0.3, max: 8, draw: () => {}, click: () => {} }); mv.theatreId = id; S.maps.theatre = mv; mv.firstFit = true; }
  setupMap(cx, mv, d, b);
  const mapBox = h('div', { style: 'display:flex;flex-direction:column;min-height:520px' }); mv.mount(mapBox); mv.el.style.minHeight = '520px'; mv.invalidate();
  const frontBtns = h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' }, ...d.fronts.map((f) => btn(f.name, () => { P.front = P.front === f.id ? null : f.id; P.tab = 'fronts'; cx.refresh(); }, { kind: `sm${P.front === f.id ? ' pri' : ''}` })));
  box.append(h('div', { style: 'height:10px' }), h('div', { class: 'osx-grid osx-gs' },
    h('div', { class: 'osx-side', style: 'overflow:visible' }, panel(`${d.name} · operational map`, [mapBox, d.fronts.length ? frontBtns : null], { sub: d.involved ? 'The company is in this theater.' : 'You are observing: the company is not in this theater.', right: d.involved ? btn('Open the operational map ›', () => ui.openPanel('strategic'), { kind: 'pri sm' }) : null })),
    h('div', { class: 'osx-side' }, tabs([{ id: 'intel', label: 'Intelligence' }, { id: 'fronts', label: 'Fronts', badge: d.fronts.length || null }, { id: 'forces', label: 'Forces' }], P.tab, (t) => { P.tab = t; cx.refresh(); }), ...(P.tab === 'fronts' ? frontsPanel(cx, d, P) : P.tab === 'forces' ? forcesPanel(cx, d) : intelPanel(cx, d)))));
  void W;
}

function setupMap(cx, mv, d, b) {
  const { g, S } = cx; const P = state(S); const Pv = provinces(); const [a, c2] = d.between;
  const frontOf = new Map(); for (const f of d.fronts) for (const n of f.provinces) frontOf.set(n, f.id);
  const holder = (p) => { const ctl = cx.W.state()?.war?.control; return ctl?.[p.id] ?? p.country; };
  const key = Pv.filter((p) => d.th.states.includes(p.state)).map((p) => holder(p)[0]).join('');
  if (b.map && b.ctlKey !== key) { b.ctl = bakeControl(b.map, holder, a, c2); b.ctlKey = key; }
  mv.o.draw = (ctx, V) => {
    ctx.fillStyle = '#06090a'; ctx.fillRect(0, 0, V.size.w, V.size.h);
    if (!b.map) { ctx.fillStyle = '#9fb0a5'; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(b.error ? `Could not survey the ground: ${b.error}` : `Surveying the ground… ${Math.round(b.progress * 100)}%`, V.size.w / 2, V.size.h / 2); ctx.textAlign = 'left'; return; }
    const m = b.map; const [x0, y0] = V.toScreen(0, 0); const z = V.cam.z;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(m.base, x0, y0, m.w * z, m.h * z);
    ctx.fillStyle = 'rgba(5,9,8,.42)'; ctx.fillRect(x0, y0, m.w * z, m.h * z);
    if (b.ctl) ctx.drawImage(b.ctl, x0, y0, m.w * z, m.h * z);
    const hi = P.front ? new Set(d.fronts.find((f) => f.id === P.front)?.provinces) : (P.prov != null ? new Set([P.prov]) : null);
    if (hi) { if (!b.hi || b.hiKey !== `${P.front}|${P.prov}`) { b.hi = bakeLayer(m, (p) => (hi.has(p.n) ? [255, 255, 255, 70] : null)); b.hiKey = `${P.front}|${P.prov}`; } ctx.drawImage(b.hi, x0, y0, m.w * z, m.h * z); }
    const at = (la, lo) => { const [px, py] = m.toPx(la, lo); return V.toScreen(px, py); };
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(96,170,230,.65)';
    for (const r of atlasRivers()) { ctx.lineWidth = Math.max(0.8, z * (0.5 + r.w * 0.4)); ctx.beginPath(); let on = false; for (let i = 0; i < r.p.length; i += 2) { const [x, y] = at(r.p[i], r.p[i + 1]); if (x < -50 || y < -50 || x > V.size.w + 50 || y > V.size.h + 50) { on = false; continue; } if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y); on = true; } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(212,162,60,.55)'; ctx.lineWidth = Math.max(0.8, z * 0.7); for (const rd of atlasRoads()) { if (!rd.main && z < 1.4) continue; const [ax, ay] = at(rd.a.lat, rd.a.lon); const [bx, by] = at(rd.b.lat, rd.b.lon); if (Math.max(ax, bx) < 0 || Math.min(ax, bx) > V.size.w || Math.max(ay, by) < 0 || Math.min(ay, by) > V.size.h) continue; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    ctx.textBaseline = 'middle';
    for (const ct of d.cities) { const [x, y] = at(ct.lat, ct.lon); const col = COUNTRY_RGB(ct.holder); ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; ctx.strokeStyle = '#05080a'; ctx.lineWidth = 2; ctx.beginPath(); if (ct.capital) { ctx.rect(x - 4, y - 4, 8, 8); } else ctx.arc(x, y, ct.port ? 4 : 3, 0, 7); ctx.stroke(); ctx.fill(); if (ct.holder !== ct.own) { ctx.strokeStyle = '#e0604a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke(); } if (z > 0.6 || ct.capital) { ctx.fillStyle = '#e6eee6'; ctx.font = `${ct.capital ? 12 : 11}px system-ui, sans-serif`; ctx.fillText(`${ct.port ? '⚓ ' : ''}${ct.name}`, x + 8, y); } }
    for (const bn of d.mine) { const p = bn.n != null ? Pv[bn.n] : null; if (!p) continue; const [x, y] = at(p.lat, p.lon); ctx.fillStyle = '#5f93a8'; ctx.strokeStyle = '#05080a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x - 7, y - 5, 14, 10); ctx.stroke(); ctx.fill(); ctx.fillStyle = '#e6eee6'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(bn.name, x + 10, y); }
    for (const f of d.fronts) if (P.front === f.id) { const ps = f.provinces.map((n) => Pv[n]); const lat = ps.reduce((s, q) => s + q.lat, 0) / ps.length; const lon = ps.reduce((s, q) => s + q.lon, 0) / ps.length; const [x, y] = at(lat, lon); ctx.fillStyle = '#f1f5e8'; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillText(f.name.toUpperCase(), x + 10, y - 16); }
    ctx.fillStyle = '#9fb0a5'; ctx.font = '11px ui-monospace, monospace'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${d.name.toUpperCase()} · ×${z.toFixed(2)}`, 10, V.size.h - 22);
  };
  const provAt = (wx, wy) => { const m = b.map; if (!m) return null; const x = Math.floor(wx); const y = Math.floor(wy); if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null; const n = m.pm[y * m.w + x]; return n >= 0 ? Pv[n] : null; };
  mv.o.hover = (wx, wy) => { const p = provAt(wx, wy); return p ? `${p.name} · ${p.terrain} · held by ${g.content.arms.countries[holder(p)]?.name || holder(p)}${frontOf.has(p.n) ? ' · front' : ''}` : null; };
  mv.o.click = (wx, wy) => { const p = provAt(wx, wy); if (!p) { P.front = null; P.prov = null; } else if (frontOf.has(p.n)) { P.front = frontOf.get(p.n); P.prov = p.n; P.tab = 'fronts'; } else { P.front = null; P.prov = p.n; P.tab = 'intel'; } cx.refresh(); };
  if (b.map && mv.firstFit) { mv.firstFit = false; mv.fit(0, 0, b.map.w, b.map.h); }
  if (!mv.tools.childNodes.length) mv.tools.append(btn('+', () => mv.zoomBy(1.4), { kind: 'sm' }), btn('−', () => mv.zoomBy(1 / 1.4), { kind: 'sm' }), btn('Fit', () => b.map && mv.fit(0, 0, b.map.w, b.map.h), { kind: 'sm' }));
}

const known = chip('known', 'ok'); const est = chip('estimate', 'warn'); const none = chip('no intelligence', 'bad');

function intelPanel(cx, d) {
  const { g } = cx; const P = state(cx.S); const prov = P.prov != null ? provinces()[P.prov] : null;
  const cs = cx.W.state()?.war?.control || {};
  const out = [];
  if (prov) out.push(panel(prov.name, [kv('Terrain', prov.terrain), kv('Held by', g.content.arms.countries[cs[prov.id] ?? prov.country]?.name || prov.country), kv('Infrastructure', `${prov.infra} of 5`), kv('Victory points', String(prov.vp)), prov.port ? kv('Port', 'yes') : null, prov.airfield ? kv('Airfield', 'yes') : null, prov.capital ? kv('Capital', 'yes') : null, prov.fort ? kv('Fortification', String(prov.fort)) : null, btn('Clear', () => { P.prov = null; cx.refresh(); }, { kind: 'sm' })].filter(Boolean), { right: known }));
  out.push(panel(d.name, [h('div', { class: 'osx-sub', style: 'padding:0' }, d.note), kv('Region', d.region), kv('Kind of war', d.kind), kv('Status', d.status, STATUS_TONE[d.status] === 'bad' ? 'bad' : STATUS_TONE[d.status] === 'warn' ? 'warn' : ''), d.war ? kv('Started', `day ${d.war.start} · ${g.clock.day - d.war.start} days`) : null,
    kv('Belligerents', d.names.join(' and ')), kv('Ground held', d.between.map((c, i) => `${d.names[i]} ${d.held[c]}`).join(' · ')), kv('Fronts', String(d.fronts.length)), kv('Provinces', String(d.provinces))], { right: known }));
  out.push(panel('Logistics and ground', [kv('Average infrastructure', `${d.avgInfra} of 5`), kv('Ports', String(d.ports)), kv('Airfields', String(d.airfields)), h('div', { class: 'osx-sub', style: 'padding:0' }, 'Roads, rail and ports are known from the ground. Live supply, weather and fog belong to the side in the theater: the operational map shows them to a company that serves there.')], { right: known }));
  out.push(panel('Strategic locations', d.cities.length ? d.cities.map((c) => kv(`${c.capital ? '★ ' : ''}${c.port ? '⚓ ' : ''}${c.name}`, `${g.content.arms.countries[c.holder]?.name || c.holder}${c.holder !== c.own ? ' (captured)' : ''}${c.vp ? ` · ${c.vp} VP` : ''}`, c.holder !== c.own ? 'bad' : '')) : [empty('No cities on record.')], { right: known }));
  const dev = [...d.timeline.map((t) => feedLine(`day ${t.day}`, 'war', t.text)), ...d.log.slice(0, 6).map((t) => feedLine(`day ${t.day}`, 'theatre', t.text))];
  out.push(panel('Recent developments', dev.length ? dev : [empty(d.war ? 'Nothing more is recorded.' : 'No fighting is recorded in this theater.')], { right: known }));
  return out;
}

function frontsPanel(cx, d, P) {
  if (!d.fronts.length) return [panel('Fronts', [empty('No front: the two sides hold no ground that touches here (a sea or air theater, or a quiet border).')])];
  const sel = d.fronts.find((f) => f.id === P.front) || null;
  const list = panel('Fronts', d.fronts.map((f) => h('div', { class: `osx-row tap${f.id === P.front ? ' on' : ''}`, onclick: () => { P.front = f.id; cx.refresh(); } }, h('div', {}, h('b', {}, f.name), h('small', {}, `${f.size} provinces on the line · ${d.names[0]} ${f.held[d.between[0]]} / ${d.names[1]} ${f.held[d.between[1]]}`)), chip(`importance ${f.importance}`))), { right: known });
  if (!sel) return [list];
  return [list, panel(sel.name, [kv('Provinces on the line', String(sel.size)), kv('Territorial control', d.between.map((c, i) => `${d.names[i]} ${sel.held[c]}`).join(' · ')), kv('Strategic importance', `${sel.importance} (victory points, ports, capitals, forts)`), kv('Infrastructure', `${sel.infra} of 5`, sel.infra < 2.2 ? 'warn' : ''), kv('Momentum', sel.momentum),
    ...sel.changed.slice(0, 4).map((c) => kv(`${c.name}`, `taken day ${c.day}`)), ...(sel.battles.length ? sel.battles.map((b) => kv(b.title, `day ${b.day} · ${String(b.outcome).replace('_', ' ')}`)) : [kv('Recent battles', 'none recorded')]), kv('Units on the line', 'no intelligence', 'bad')], { right: [known, none] })];
}

function forcesPanel(cx, d) {
  const { g, ui } = cx;
  const out = [panel('Belligerents', d.profiles.map((p) => h('div', { class: 'osx-pan', style: 'padding:8px' }, h('b', {}, p.name), kv('Way of war', `${p.doctrine} · skill ${p.skill}`), h('div', { class: 'osx-sub', style: 'padding:0' }, p.text), kv('Most it could field', p.income ? `${fmt(p.poolMax)} troops (from an income of ${fmt(p.income)})` : '—'))), { right: est })];
  out.push(panel('Forces in the theater', [empty('The strength and positions of the armies here are not known to an observer. They are shown only to a company that serves in this theater, and then only as far as its battalions and recon can see.')], { right: none }));
  if (d.involved) out.push(panel('Company forces', d.mine.length ? d.mine.map((m) => kv(m.name, `${m.status} · ${m.at}`)) : [empty('No battalion is in the theater.')], { right: known }), btn('Open the operational map', () => ui.openPanel('strategic'), { kind: 'pri' }));
  void g; return out;
}
