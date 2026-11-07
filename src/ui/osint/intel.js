// Global Intelligence (v0.103.4): the worldwide picture. A zoomable, pannable world map in the terminal's palette (the atlas's own texture: countries, state borders; its cities, military sites, roads and
// rivers), conflict zones and front lines from the geopolitical record, layer toggles, search, a panel for whatever you select (a country, a conflict, a site) and the feed of developments.
// Everything on it is read from the simulation (src/war/worldView.js, theatreView.js); the page has no state of its own beyond the camera and the toggles.
import { h, panel, stats, stat, btn, chip, empty, kv, feedLine, fmt } from './kit.js';
import { MapView } from './mapview.js';
import { surfaceTexture, flatCanvas } from '../../engine/drawGlobeSurface.js';
import { atlasPlaces, atlasMilitary, atlasRoads, atlasRivers, countryAt, atlasCountries } from '../../world/atlas.js';
import { conflicts, countryView, search } from '../../war/worldView.js';
import { frontLines, theatreZones } from '../../war/theatreView.js';

const PAL = { deep: [5, 9, 8], shelf: [9, 17, 15], low: [27, 38, 30], high: [62, 78, 62], coast: [96, 124, 100], border: [96, 112, 100], stateBorder: [40, 56, 46], ice: [112, 130, 120] };
const IMG = {};
function land(g, tint) {
  const key = `osx-world-${tint}`;
  if (!IMG[key]) IMG[key] = flatCanvas(surfaceTexture(key, { ...PAL, tint }, g.content.arms.countries, 2, true), 2);
  return IMG[key];
}
const LAYERS = [['borders', 'Borders'], ['factions', 'Factions'], ['conflicts', 'Conflicts'], ['fronts', 'Fronts'], ['installations', 'Installations'], ['cities', 'Cities'], ['routes', 'Routes'], ['intel', 'Reports']];
const MIL = { army: 'Army post', air: 'Air base', naval: 'Naval base', fort: 'Fort', hq: 'Headquarters' };
const state = (S) => (S.intel ||= { layers: { borders: true, factions: false, conflicts: true, fronts: true, installations: false, cities: true, routes: false, intel: true }, sel: null, q: '' });

function build(cx, data) {
  const { S, g } = cx; const I = state(S);
  const proj = (lat, lon) => [lon, -lat];
  const mv = new MapView({ min: 1.2, max: 90, wrapX: 360,
    draw: (ctx, V) => draw(ctx, V, cx, data),
    click: (wx, wy, e, sx, sy) => pick(cx, data, mv, wx, wy, sx, sy),
    hover: (wx, wy, sx, sy) => { const t = hitTest(data, mv, wx, wy, sx, sy, I); return t ? t.label : null; } });
  mv.centre(-12, -22, 2.6); mv.fitBox = null;
  mv.tools.append(btn('+', () => mv.zoomBy(1.4), { kind: 'sm' }), btn('−', () => mv.zoomBy(1 / 1.4), { kind: 'sm' }), btn('World', () => mv.centre(-12, -22, mv.size.w / 360 * 1.0), { kind: 'sm' }));
  void proj; void g; return mv;
}

function hitTest(data, mv, wx, wy, sx, sy, I) {
  const lat = -wy; let lon = wx; while (lon > 180) lon -= 360; while (lon < -180) lon += 360;
  const near = (la, lo, px) => { const [x, y] = mv.toScreen(lo, -la); const dx = Math.abs(((x - sx + mv.cam.z * 360 / 2) % (mv.cam.z * 360) + mv.cam.z * 360) % (mv.cam.z * 360) - mv.cam.z * 180); void dx; return Math.hypot(x - sx, y - sy) <= px; };
  if (I.layers.intel) for (const z of data.zones) if ((z.war || z.land) && near(z.centre[0], z.centre[1], 12)) return { type: 'conflict', zone: z, label: `${z.name}${z.war ? ' · at war' : ' · contested'}` };
  if (I.layers.installations) for (const m of atlasMilitary()) if (near(m.lat, m.lon, 7)) return { type: 'site', site: m, label: `${m.name} (${MIL[m.kind] || m.kind})` };
  if (I.layers.cities) for (const p of atlasPlaces()) if ((p.kind === 'c' || mv.cam.z > 7) && near(p.lat, p.lon, 7)) return { type: 'place', place: p, label: p.name };
  const c = countryAt(lat, lon); return c ? { type: 'country', id: c, label: atlasCountries()[c]?.name || c } : null;
}

function pick(cx, data, mv, wx, wy, sx, sy) {
  const I = state(cx.S); const t = hitTest(data, mv, wx, wy, sx, sy, I);
  I.sel = t ? (t.type === 'conflict' ? { type: 'zone', id: t.zone.id } : t.type === 'site' ? { type: 'site', name: t.site.name } : t.type === 'place' ? { type: 'place', name: t.place.name } : { type: 'country', id: t.id }) : null;
  cx.refresh();
}

function draw(ctx, V, cx, data) {
  const { g, S } = cx; const I = state(S); const L = I.layers; const z = V.cam.z; const W = V.size.w; const Hh = V.size.h;
  ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, W, Hh);
  const img = land(g, L.factions ? 0.55 : L.borders ? 0.14 : 0.0);
  const [x0, y0] = V.toScreen(-180, -90);
  ctx.imageSmoothingEnabled = true;
  for (const k of [-1, 0, 1]) ctx.drawImage(img, x0 + k * 360 * z, y0, 360 * z, 180 * z);
  // graticule
  ctx.strokeStyle = 'rgba(127,174,94,.07)'; ctx.lineWidth = 1;
  for (let lo = -180; lo <= 180; lo += 30) for (const k of [-1, 0, 1]) { const [a] = V.toScreen(lo + k * 360, 0); ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(a, Hh); ctx.stroke(); }
  for (let la = -60; la <= 60; la += 30) { const [, b] = V.toScreen(0, -la); ctx.beginPath(); ctx.moveTo(0, b); ctx.lineTo(W, b); ctx.stroke(); }
  const wrapDraw = (lon, lat, fn) => { for (const k of [-1, 0, 1]) { const [x, y] = V.toScreen(lon + k * 360, -lat); if (x > -30 && x < W + 30 && y > -30 && y < Hh + 30) fn(x, y); } };
  // routes
  if (L.routes && z > 3) {
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(96,147,168,.5)';
    for (const r of atlasRivers()) { ctx.beginPath(); for (let i = 0; i < r.p.length; i += 2) { const [x, y] = V.toScreen(r.p[i + 1], -r.p[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
    for (const rd of atlasRoads()) { ctx.strokeStyle = rd.main ? 'rgba(212,162,60,.55)' : 'rgba(212,162,60,.25)'; ctx.beginPath(); const [ax, ay] = V.toScreen(rd.a.lon, -rd.a.lat); const [bx, by] = V.toScreen(rd.b.lon, -rd.b.lat); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  }
  // conflict zones: the provinces of each theatre
  if (L.conflicts) for (const t of data.zones) { if (!t.war && !t.land) continue; ctx.fillStyle = t.war ? 'rgba(200,82,63,.5)' : 'rgba(212,162,60,.3)'; const r = Math.max(1.2, Math.min(6, z * 0.38)); for (const [la, lo] of t.pts) wrapDraw(lo, la, (x, y) => ctx.fillRect(x - r / 2, y - r / 2, r, r)); }
  // front lines
  if (L.fronts) { ctx.lineWidth = Math.max(1.2, Math.min(3, z * 0.2)); for (const f of data.fronts) { ctx.strokeStyle = f.war ? '#e0604a' : '#d4a23c'; const [ax, ay] = V.toScreen(f.a[1], -f.a[0]); const [bx, by] = V.toScreen(f.b[1], -f.b[0]); ctx.beginPath(); ctx.moveTo((ax + bx) / 2 - (by - ay) * 0.5, (ay + by) / 2 + (bx - ax) * 0.5); ctx.lineTo((ax + bx) / 2 + (by - ay) * 0.5, (ay + by) / 2 - (bx - ax) * 0.5); ctx.stroke(); } }
  // installations
  if (L.installations) for (const m of atlasMilitary()) { const col = atlasCountries()[m.country]?.color || '#9aa'; wrapDraw(m.lon, m.lat, (x, y) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.strokeRect(x - 3.5, y - 3.5, 7, 7); if (z > 6) { ctx.fillStyle = '#b9c4bb'; ctx.font = '10px ui-monospace, monospace'; ctx.fillText(m.name.replace(/ \(.*/, ''), x + 6, y + 3); } }); }
  // cities
  if (L.cities) for (const p of atlasPlaces()) { if (p.kind !== 'c' && z < 7) continue; if (p.kind !== 'c' && p.kind !== 'p' && p.kind !== 't' && z < 12) continue; wrapDraw(p.lon, p.lat, (x, y) => { ctx.fillStyle = p.kind === 'c' ? '#f1f5e8' : '#a9b6ac'; ctx.beginPath(); ctx.arc(x, y, p.kind === 'c' ? 2.8 : 1.8, 0, 7); ctx.fill(); if (p.kind === 'c' ? z > 2.2 : z > 8) { ctx.fillStyle = p.kind === 'c' ? '#e8f0e0' : '#a9b6ac'; ctx.font = `${p.kind === 'c' ? 11 : 10}px ui-monospace, monospace`; ctx.fillText(p.name, x + 5, y + 3); } }); }
  // intelligence reports: one marker per theatre at war or contested
  if (L.intel) for (const t of data.zones) { if (!t.war && !t.land) continue; wrapDraw(t.centre[1], t.centre[0], (x, y) => { ctx.strokeStyle = t.war ? '#e0604a' : '#d4a23c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.stroke(); if (I.sel?.type === 'zone' && I.sel.id === t.id) { ctx.strokeStyle = '#e8f4d8'; ctx.strokeRect(x - 12, y - 12, 24, 24); } ctx.fillStyle = '#dbe5dc'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(t.name, x + 11, y + 4); }); }
  // a selected country: its capital ringed
  if (I.sel?.type === 'country') { const C = atlasCountries()[I.sel.id]; const cap = atlasPlaces().find((p) => p.name === C?.capital); if (cap) wrapDraw(cap.lon, cap.lat, (x, y) => { ctx.strokeStyle = '#e8f4d8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke(); }); }
  ctx.fillStyle = '#7a8a81'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText(`lat ${(-V.cam.y).toFixed(1)}  lon ${V.cam.x.toFixed(1)}  ×${z.toFixed(1)}`, 10, Hh - 22);
}

export function renderIntel(cx, box) {
  const { g, W, S } = cx; const I = state(S);
  const C = conflicts(g); const active = C.filter((c) => c.status === 'active'); const data = { zones: theatreZones(g), fronts: frontLines(g) };
  if (!S.maps.world) S.maps.world = build(cx, data);
  const mv = S.maps.world; mv.o.draw = (ctx, V) => draw(ctx, V, cx, data); mv.o.click = (wx, wy, e, sx, sy) => pick(cx, data, mv, wx, wy, sx, sy); mv.o.hover = (wx, wy, sx, sy) => { const t = hitTest(data, mv, wx, wy, sx, sy, I); return t ? t.label : null; };
  const hot = data.zones.filter((z) => z.war || z.land);
  box.append(stats(stat('Active wars', String(active.length), { tone: active.length ? 'bad' : 'ok' }), stat('Theaters watched', String(data.zones.length)), stat('Contested or at war', String(hot.length), { tone: hot.length ? 'warn' : '' }), stat('Front-line segments', String(data.fronts.length))));
  box.append(h('div', { style: 'height:8px' }));
  const mapBox = h('div', { style: 'display:flex;flex-direction:column;min-height:460px' }); mv.mount(mapBox); mv.el.style.minHeight = '460px'; mv.invalidate();
  const toggles = h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' }, ...LAYERS.map(([id, label]) => btn(label, () => { I.layers[id] = !I.layers[id]; mv.invalidate(); cx.refresh(); }, { kind: `sm${I.layers[id] ? ' pri' : ''}` })));
  const q = h('input', { class: 'osx-input', placeholder: 'Search a country, city or site…', value: I.q, style: 'width:100%', oninput: (e) => { I.q = e.target.value; clearTimeout(q.t); q.t = setTimeout(() => { cx.refresh(); document.querySelector('.osx-scroll input.osx-input')?.focus(); }, 250); } });
  const res = search(g, I.q);
  const go = (r) => { if (r.type === 'country') { I.sel = { type: 'country', id: r.id }; const cap = atlasPlaces().find((p) => p.name === atlasCountries()[r.id].capital); if (cap) mv.centre(cap.lon, -cap.lat, Math.max(mv.cam.z, 4)); } else { I.sel = { type: r.type === 'site' ? 'site' : 'place', name: r.name }; mv.centre(r.lon, -r.lat, Math.max(mv.cam.z, 9)); } I.q = ''; cx.refresh(); };
  const feed = W.worldFeed(24);
  box.append(h('div', { class: 'osx-grid osx-gs' },
    h('div', { class: 'osx-side', style: 'overflow:visible' }, panel('World map', [mapBox, toggles], { sub: 'Scroll to zoom, drag to pan, click a country, city, site or report diamond.' }),
      panel('Intelligence feed', feed.length ? feed.map((f) => feedLine(`day ${f.day}`, f.kind, f.text)) : [empty('No conflicts or embargoes are recorded yet. The record begins when the arms market opens; the map shows the ground as it is.')])),
    h('div', { class: 'osx-side' }, panel('Search', [q, ...res.map((r) => h('div', { class: 'osx-row tap', onclick: () => go(r) }, h('div', {}, h('b', {}, r.name), h('small', {}, r.type === 'country' ? 'Country' : r.type === 'site' ? `Military site · ${MIL[r.kind] || r.kind}` : 'Place')), chip(r.type)))]),
      selection(cx, C, data), panel('Conflicts', C.length ? C.map((c) => h('div', { class: `osx-row tap${I.sel?.type === 'conflict' && I.sel.id === c.id ? ' on' : ''}`, onclick: () => { I.sel = { type: 'conflict', id: c.id }; const z = data.zones.find((t) => c.theatres.some((x) => x.id === t.id)); if (z) mv.centre(z.centre[1], -z.centre[0], Math.max(mv.cam.z, 4.5)); cx.refresh(); } }, h('div', {}, h('b', {}, c.name), h('small', {}, `since day ${c.start}${c.theatres.length ? ` · ${c.theatres.map((t) => t.name).join(', ')}` : ''}`)), chip(c.status, c.status === 'active' ? 'bad' : 'ok'))) : [empty('No wars are recorded.')]))));
}

function selection(cx, C, data) {
  const { g } = cx; const I = state(cx.S); const sel = I.sel;
  if (!sel) return panel('Selection', [empty('Select a country, a conflict, a site or a report on the map.')]);
  if (sel.type === 'country') {
    const v = countryView(g, sel.id); if (!v) return panel('Selection', [empty('Unknown.')]);
    return panel(v.name, [kv('Government', v.gov), kv('Capital', v.capital), kv('Population', v.pop), v.income != null ? kv('Income', `${fmt(v.income)} ◎ a day`) : null, kv('States', String(v.states)), kv('Way of war', `${v.profile.doctrine} · skill ${v.profile.skill}`), h('div', { class: 'osx-sub', style: 'padding:0' }, v.profile.text), kv('Reserve it can field', `${fmt(v.profile.poolMax)} troops`),
      kv('Military sites', String(v.sites.length)), ...v.sites.slice(0, 5).map((m) => kv(MIL[m.kind] || m.kind, m.name)), ...v.wars.map((c) => h('div', { class: 'osx-row tap', onclick: () => { I.sel = { type: 'conflict', id: c.id }; cx.refresh(); } }, h('b', {}, `War: ${c.name}`), chip(c.status, c.status === 'active' ? 'bad' : 'ok'))), ...v.embargoes.map((e) => kv('Embargo', e.text, 'warn')), !v.wars.length ? kv('Wars', 'none recorded', 'ok') : null].filter(Boolean));
  }
  if (sel.type === 'conflict' || sel.type === 'zone') {
    const c = sel.type === 'conflict' ? C.find((x) => x.id === sel.id) : C.find((x) => x.theatres.some((t) => t.id === sel.id));
    const z = data.zones.find((x) => x.id === sel.id) || (c && data.zones.find((t) => c.theatres.some((y) => y.id === t.id)));
    if (!c && !z) return panel('Selection', [empty('Gone.')]);
    return panel(c ? `${c.name}` : z.name, [c ? kv('Status', c.status === 'active' ? 'At war' : 'Ceasefire', c.status === 'active' ? 'bad' : 'ok') : kv('Status', z.war ? 'At war' : 'Contested ground, no war recorded', z.war ? 'bad' : 'warn'), c ? kv('Started', `day ${c.start}`) : null, c ? kv('Length', `${g.clock.day - c.start} days`) : null,
      kv('Belligerents', (c ? c.names : z.between.map((x) => g.content.arms.countries[x]?.name || x)).join(' and ')), c?.theatres.length ? kv('Theaters', c.theatres.map((t) => t.name).join(', ')) : z ? kv('Theater', z.name) : null,
      ...(c ? c.timeline.slice(0, 5).map((t) => feedLine(`day ${t.day}`, 'war', t.text)) : []), btn('Inspect the theater ›', () => { cx.open('theaters', { theatre: z?.id || c.theatres[0]?.id }); }, { kind: 'pri', disabled: !(z || c?.theatres.length) })].filter(Boolean));
  }
  if (sel.type === 'site') { const m = atlasMilitary().find((x) => x.name === sel.name); if (!m) return panel('Selection', [empty('Gone.')]); return panel(m.name, [kv('Kind', MIL[m.kind] || m.kind), kv('Country', g.content.arms.countries[m.country]?.name || m.country), kv('Position', `${m.lat.toFixed(1)}, ${m.lon.toFixed(1)}`)]); }
  const p = atlasPlaces().find((x) => x.name === sel.name); if (!p) return panel('Selection', [empty('Gone.')]);
  return panel(p.name, [kv('Kind', { c: 'Capital', t: 'City', p: 'Port', a: 'Airfield', b: 'Base', f: 'Fort or pass', m: 'Mine or oil', r: 'Industry or research' }[p.kind] || p.kind), kv('Country', atlasCountries()[countryAt(p.lat, p.lon)]?.name || '—'), kv('Position', `${p.lat.toFixed(1)}, ${p.lon.toFixed(1)}`)]);
}
