// The strategic map (v0.103.0): a full-screen panel in the manner of the battle and Fleet Command. The ground is baked by src/engine/drawStrategic.js; this file draws the battalions on it, the
// order of battle on the left, the selected battalion on the right, a province's facts under the pointer, and the buttons that give orders. It only DRAWS and GIVES ORDERS: every rule is in
// src/war/strategic.js, reached through game.war. Time moves only on the buttons (the world is stepped with game.skipTime, which runs the same minute and day ticks as sleeping does).
import { h } from './panels.js';
import { bakeTheatre, bakeControl, bakeLayer, COUNTRY_RGB } from '../engine/drawStrategic.js';
import { provinces, provinceById, TERRAIN } from '../world/provinces.js';
import { atlasPlaces } from '../world/atlas.js';
import { ATLAS } from '../content/atlas.js';
import { SLOTS, MAX_LINE } from '../content/strategic.js';
import { TERRAIN_FX, WEATHER, INTEL } from '../content/strategic.js';

const SPEEDS = [[0, '⏸'], [1, '▶ 1 h/s'], [4, '⏩ 4 h/s'], [12, '⏭ fastest']]; // (the world's own minute ticks cost about 85 ms an hour, so the fastest is about ten hours a second)
const num = (n) => Number(n).toLocaleString('en-US');
const bar = (v, colour) => h('div', { class: 'stc-bar' }, h('i', { style: `width:${Math.max(0, Math.min(100, v))}%;background:${colour}` }));
const BAKED = new Map(); // a theatre's ground, drawn once per session
const STATUS = { home: 'at home', deploying: 'at sea, outbound', theatre: 'in the theatre', returning: 'at sea, homeward' };

export function strategicPanel(ui, body) {
  const g = ui.game; const W = g.war; body.classList.add('stc');
  const canvas = h('canvas', { class: 'stc-canvas' }); const top = h('div', { class: 'stc-top' }); const left = h('div', { class: 'stc-left' }); const right = h('div', { class: 'stc-right' });
  const bottom = h('div', { class: 'stc-bottom' }); const tip = h('div', { class: 'stc-tip hidden' }); const feed = h('div', { class: 'stc-feed' }); const modal = h('div', { class: 'stc-modal hidden' }); const wait = h('div', { class: 'stc-wait' }, 'Surveying the ground…');
  body.append(canvas, top, left, right, bottom, tip, feed, modal, wait);
  const S = { sel: null, mode: null, hover: null, selProv: null, cam: { x: 0, y: 0, z: 1 }, speed: 0, acc: 0, map: null, ctl: null, ctlKey: '', th: null, log: [], drag: null, view: null, raise: { tpl: 'tpl_rifle', squads: [], name: '' }, closed: false };
  let raf = 0; let last = performance.now();
  const say = (t) => { S.log.unshift(t); S.log.length = Math.min(S.log.length, 6); feed.replaceChildren(...S.log.map((x) => h('div', {}, x))); };
  const act = (r) => { say(r.text); refresh(); return r; };

  // ---- the ground
  const ensureMap = () => {
    const v = W.strategic(); S.view = v; const th = v?.theatre || null;
    if (!th) { S.map = null; S.th = null; return; }
    if (S.th !== th.id && BAKED.has(th.id)) { S.th = th.id; S.map = BAKED.get(th.id); S.ctlKey = ''; fit(); wait.classList.add('hidden'); }
    if (S.th !== th.id) { S.th = th.id; S.map = null; wait.classList.remove('hidden'); const t0 = performance.now(); bakeTheatre(th, 36, (f) => { wait.textContent = `Surveying the ground… ${Math.round(f * 100)}%`; }).then((m) => { if (S.closed || S.th !== th.id) return; S.map = m; BAKED.set(th.id, m); console.log(`strategic map baked in ${Math.round(performance.now() - t0)} ms (${m.w}x${m.h})`); S.ctlKey = ''; fit(); wait.classList.add('hidden'); refresh(); }); return; }
    if (!S.map) return;
    const e = v.employer; const key = `${e.side}|${e.enemy}|${v.provinces.map((p) => p.controller === e.side ? 1 : 0).join('')}`;
    if (key !== S.ctlKey) { S.ctlKey = key; const by = new Map(v.provinces.map((p) => [p.id, p.controller])); S.ctl = bakeControl(S.map, (p) => by.get(p.id) ?? p.country, e.side, e.enemy); }
    const lay = S.layer || 'Terrain'; const lk = lay === 'Supply' || lay === 'Weather' || lay === 'Intel' ? `${lay}|${key}|${Math.floor(v.hour / 6)}|${v.provinces.map((p) => `${p.supply}${p.intel}${p.weather[0]}`).join('')}` : ''; 
    if (lk !== S.layKey) { S.layKey = lk; const by = new Map(v.provinces.map((p) => [p.id, p])); S.layerCanvas = !lk ? null : bakeLayer(S.map, (p) => { const q = by.get(p.id); if (!q) return [20, 20, 30, 150]; if (lay === 'Supply') { if (q.controller !== e.side) return [60, 60, 70, 150]; const s = q.supply / 100; return [Math.round(230 * (1 - s) + 40 * s), Math.round(60 * (1 - s) + 200 * s), 60, 170]; } if (lay === 'Weather') { const c = WEATHER[q.weather].colour; return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), q.weather === 'clear' ? 40 : 150]; } return q.intel >= 2 ? [0, 0, 0, 0] : q.intel === 1 ? [10, 10, 30, 90] : [5, 5, 15, 190]; }); }
  };
  const fit = () => { const m = S.map; if (!m) return; const z = Math.min(canvas.width / m.w, canvas.height / m.h); S.cam = { z, x: (canvas.width - m.w * z) / 2, y: (canvas.height - m.h * z) / 2 }; };
  const resize = () => { const r = body.getBoundingClientRect(); canvas.width = Math.max(320, Math.round(r.width)); canvas.height = Math.max(240, Math.round(r.height)); if (S.map && !S.fitted) fit(); };
  const px = (lat, lon) => { const [x, y] = S.map.toPx(lat, lon); return [S.cam.x + x * S.cam.z, S.cam.y + y * S.cam.z]; };
  const provAt = (sx, sy) => { const m = S.map; if (!m) return null; const x = Math.floor((sx - S.cam.x) / S.cam.z); const y = Math.floor((sy - S.cam.y) / S.cam.z); if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null; const n = m.pm[y * m.w + x]; return n < 0 ? null : provinces()[n]; };

  // ---- drawing
  const draw = () => {
    const g2 = canvas.getContext('2d'); g2.fillStyle = '#0b1220'; g2.fillRect(0, 0, canvas.width, canvas.height);
    const m = S.map; if (!m) { g2.fillStyle = '#c8d0e8'; g2.font = '20px system-ui'; g2.textAlign = 'center'; g2.fillText('Enlist in a theatre to see its ground.', canvas.width / 2, canvas.height / 2); return; } const z = S.cam.z; const v = S.view; const e = v.employer;
    g2.imageSmoothingEnabled = true; g2.drawImage(m.base, S.cam.x, S.cam.y, m.w * z, m.h * z); if (S.ctl) { g2.globalAlpha = (S.layer || 'Terrain') === 'Control' ? 1 : S.layerCanvas ? 0.25 : 0.55; g2.drawImage(S.ctl, S.cam.x, S.cam.y, m.w * z, m.h * z); g2.globalAlpha = 1; } if (S.layerCanvas) g2.drawImage(S.layerCanvas, S.cam.x, S.cam.y, m.w * z, m.h * z);
    // rivers, roads and the railways of the theatre
    g2.lineJoin = 'round'; g2.strokeStyle = 'rgba(96,170,230,.8)'; g2.lineWidth = Math.max(1, z * 1.6);
    for (const r of ATLAS.rivers) { const p = r.p; g2.lineWidth = Math.max(1, z * (0.8 + r.w * 0.6)); g2.beginPath(); let on = false; for (let i = 0; i < p.length; i += 2) { const [x, y] = px(p[i], p[i + 1]); if (x < -50 || y < -50 || x > canvas.width + 50 || y > canvas.height + 50) { on = false; continue; } if (!on) { g2.moveTo(x, y); on = true; } else g2.lineTo(x, y); } g2.stroke(); }
    const P = provinces(); const inView = v.provinces;
    g2.strokeStyle = 'rgba(240,236,220,.85)'; g2.lineWidth = Math.max(1.5, z * 2.2); g2.setLineDash([6, 4]);
    for (const p of inView) for (const q of p.rail) { if (q < p.n) continue; const Q = P[q]; g2.beginPath(); const [x1, y1] = px(p.lat, p.lon); const [x2, y2] = px(Q.lat, Q.lon); g2.moveTo(x1, y1); g2.lineTo(x2, y2); g2.stroke(); } g2.setLineDash([]);
    // hovered and selected provinces: their pixels, lit
    const lit = (n, col) => { g2.fillStyle = col; const x0 = S.cam.x; const y0 = S.cam.y; const step = Math.max(1, Math.round(2 / z)); for (let y = 0; y < m.h; y += step) for (let x = 0; x < m.w; x += step) if (m.pm[y * m.w + x] === n) g2.fillRect(x0 + x * z, y0 + y * z, step * z + 0.5, step * z + 0.5); };
    if (S.hover && S.hover.n !== S.selProv?.n) lit(S.hover.n, 'rgba(255,255,255,.14)'); if (S.selProv) lit(S.selProv.n, 'rgba(255,224,120,.22)');
    // places, ports and victory points
    g2.font = `${Math.max(10, Math.round(11 * Math.min(1.4, z + 0.3)))}px system-ui, sans-serif`; g2.textAlign = 'center';
    for (const pl of atlasPlaces()) { const p = provinceById(pl.state && inView.find((q) => q.places.includes(pl.name))?.id); if (!p) continue; const [x, y] = px(pl.lat, pl.lon); g2.fillStyle = pl.kind === 'p' ? '#58d0ff' : pl.kind === 'c' ? '#ffd966' : '#f4f0e0'; g2.strokeStyle = '#10141f'; g2.lineWidth = 2; g2.beginPath(); g2.arc(x, y, pl.kind === 'c' ? 5 : 3.5, 0, 7); g2.stroke(); g2.fill(); g2.fillStyle = '#f4f0e0'; g2.strokeText(pl.name, x, y - 8); g2.fillText(pl.name, x, y - 8); }
    for (const p of inView) if (p.vp >= 1) { const [x, y] = px(p.lat, p.lon); g2.fillStyle = 'rgba(255,224,120,.95)'; g2.font = '11px system-ui'; g2.fillText('★'.repeat(Math.min(3, p.vp)), x, y + 14); }
    // the staging province
    if (e) { const st = provinceById(e.staging); const [x, y] = px(st.lat, st.lon); g2.strokeStyle = '#7dffb0'; g2.setLineDash([4, 3]); g2.lineWidth = 2; g2.beginPath(); g2.arc(x, y, 14, 0, 7); g2.stroke(); g2.setLineDash([]); }
    // battalions: a banner with its name and two bars
    // formations of the armies: the ally's as they are, the enemy's only where you can see them, as a report
    for (const f of v.formations || []) { const p = provinceById(f.prov); const [x, y] = px(p.lat, p.lon); const ally = f.side === 'ally'; const col = COUNTRY_RGB(f.country); if (f.to) { const q = provinceById(f.to); const [x2, y2] = px(q.lat, q.lon); g2.strokeStyle = f.attack ? '#ff6a5a' : ally ? '#6ab4ff' : '#ffb06a'; g2.lineWidth = 3; g2.setLineDash([5, 4]); g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x2, y2); g2.stroke(); g2.setLineDash([]); } const w2 = 54; g2.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g2.strokeStyle = ally ? '#bfe3ff' : '#ff8a7a'; g2.lineWidth = 2; g2.fillRect(x - w2 / 2, y + 6, w2, 18); g2.strokeRect(x - w2 / 2, y + 6, w2, 18); g2.fillStyle = '#10141f'; g2.font = 'bold 11px system-ui'; g2.textAlign = 'center'; g2.fillText(`${ally ? '' : f.known >= 2 ? '' : '~'}${f.troops}${f.armour ? ` +${f.armour}T` : ''}${!ally && f.known < 2 ? '?' : ''}`, x, y + 19); }
    S.banners = [];
    for (const b of v.battalions) {
      if (b.status !== 'theatre') continue; const p = provinceById(b.pos); let [x, y] = px(p.lat, p.lon); if (b.moving) { const q = provinceById(b.moving.to); const [x2, y2] = px(q.lat, q.lon); const f = 1 - Math.min(1, b.moving.left / Math.max(1, b.moving.left + 6)); x += (x2 - x) * f * 0.5; y += (y2 - y) * f * 0.5; g2.strokeStyle = b.moving.attack ? '#ff6a5a' : '#6ab4ff'; g2.lineWidth = 4; g2.setLineDash([]); g2.beginPath(); g2.moveTo(...px(p.lat, p.lon)); g2.lineTo(x2, y2); g2.stroke(); g2.fillStyle = b.moving.attack ? '#ff6a5a' : '#6ab4ff'; g2.beginPath(); g2.arc(x2, y2, 5, 0, 7); g2.fill(); }
      const w = 92; const hh = 34; const bx = x - w / 2; const by = y - hh - 6; const col = COUNTRY_RGB(e.side);
      g2.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g2.strokeStyle = b.id === S.sel ? '#ffe066' : '#10141f'; g2.lineWidth = b.id === S.sel ? 3 : 2; g2.fillRect(bx, by, w, hh); g2.strokeRect(bx, by, w, hh);
      g2.fillStyle = '#10141f'; g2.font = 'bold 11px system-ui'; g2.textAlign = 'center'; g2.fillText(b.name.length > 14 ? `${b.name.slice(0, 13)}…` : b.name, x, by + 13);
      g2.fillStyle = '#10141f55'; g2.fillRect(bx + 5, by + 18, w - 10, 5); g2.fillRect(bx + 5, by + 26, w - 10, 5); g2.fillStyle = '#3ddc84'; g2.fillRect(bx + 5, by + 18, (w - 10) * b.stats.strength / 100, 5); g2.fillStyle = '#4aa8ff'; g2.fillRect(bx + 5, by + 26, (w - 10) * b.stats.org / 100, 5);
      if (b.engaged) { g2.fillStyle = '#e03a3a'; g2.beginPath(); g2.arc(x + w / 2, by, 9, 0, 7); g2.fill(); g2.fillStyle = '#fff'; g2.font = 'bold 12px system-ui'; g2.fillText('✕', x + w / 2, by + 4); }
      S.banners.push({ id: b.id, x: bx, y: by, w, h: hh });
    }
  };

  // ---- the panels
  const paintTop = () => {
    const v = S.view; const people = (W.company()?.personnel || []).filter((p) => p.status === 'active' && p.assignedTo != null).length; const eq = W.company()?.equipment || [];
    const cell = (k, val, sub) => h('div', { class: 'stc-res' }, h('small', {}, k), h('b', {}, val), sub ? h('em', {}, sub) : null);
    top.replaceChildren(cell('SOLDIERS IN SQUADS', num(people)), cell('TANKS READY', `${eq.filter((x) => x.type && /anvil|lancer|bulwark|hound|breacher/.test(x.type) && x.status !== 'destroyed' && x.status !== 'deployed').length}`), cell('HELICOPTERS', `${eq.filter((x) => x.kind === 'helicopter' && x.status !== 'destroyed').length}`), cell('FUEL', `${num(Math.round(Object.entries(W.company()?.stock || {}).filter(([k]) => k === 'supply:fuel').reduce((a, [, q]) => a + q, 0)))}`, 'burnt by vehicles in the theatre'), cell('COMPANY CASH', `${num(W.cash())}`, v?.employer ? `paid ${num(v.paid)} so far` : ''),
      h('div', { class: 'grow' }), h('div', { class: 'stc-clock' }, (S.clockB = h('b', {}, `Day ${g.clock.day} · ${g.clock.timeString}`)), h('span', {}, SPEEDS.map(([s, l]) => h('button', { class: S.speed === s ? 'on' : '', onclick: () => { S.speed = s; paintTop(); } }, l)))), h('button', { onclick: () => ui.closePanel() }, '✕ Leave'));
  };
  const paintLeft = () => {
    const v = S.view; const kids = [h('h3', {}, 'ORDER OF BATTLE'), h('small', {}, v.employer ? `${v.employer.theatreName} · for ${v.employer.sideName}` : 'Not enlisted')];
    for (const b of v.battalions) kids.push(h('div', { class: `stc-bn${b.id === S.sel ? ' on' : ''}`, onclick: () => { S.sel = b.id; refresh(); } }, h('b', {}, b.name), h('span', {}, `${b.stats.people} soldiers · ${b.stats.vehicles} vehicles`), bar(b.stats.strength, '#3ddc84'), bar(b.stats.org, '#4aa8ff'), h('small', {}, `${STATUS[b.status]}${b.status === 'theatre' ? ` · ${provinceById(b.pos).name}` : ''}${b.engaged ? ' · IN BATTLE' : ''}`)));
    if (!v.battalions.length) kids.push(h('p', { class: 'stc-note' }, 'No battalions yet. Raise one from your squads.'));
    const A = W.armies(); if (A) for (const [k, a] of [['THE ENEMY', A.enemy], ['YOUR EMPLOYER', A.ally]]) kids.push(h('div', { class: 'stc-army' }, h('b', {}, `${k}: ${a.name}`), h('small', {}, `${a.doctrine} · ${a.text}`), h('small', {}, `${a.formations} formation${a.formations === 1 ? '' : 's'} in the field${k === 'THE ENEMY' ? ' (as far as you know)' : ''}`)));
    kids.push(h('div', { class: 'stc-btns' }, h('button', { class: 'pri', onclick: () => openRaise() }, 'Raise a battalion'), h('button', { onclick: () => openDesigner() }, 'Templates'), v.employer ? h('button', { onclick: () => act(W.discharge()) }, 'Leave the service') : h('button', { class: 'pri', onclick: () => openEnlist() }, 'Enlist in a theatre')));
    left.replaceChildren(...kids);
  };
  const paintRight = () => {
    const v = S.view; const b = v.battalions.find((x) => x.id === S.sel);
    if (!b) { right.replaceChildren(h('h3', {}, 'NO BATTALION SELECTED'), h('p', { class: 'stc-note' }, 'Choose one on the left or on the map. Orders: Move onto ground you hold, Attack the next province, Defend to dig in, Hold, Withdraw to the landing.')); return; }
    const s = b.stats; const stat = (k, val) => h('div', { class: 'stc-stat' }, h('span', {}, k), h('b', {}, val));
    const parts = [`${s.people} soldiers in ${b.squadNames.join(', ')}`, `${s.vehicles} vehicles`, b.commanderName ? `Commander ${b.commanderName}` : 'No commander', b.template ? `Template: ${b.template.name}` : ''].filter(Boolean);
    const ord = (type, label, mode) => h('button', { class: S.mode === mode ? 'on' : '', disabled: b.status !== 'theatre' || Boolean(b.engaged), onclick: () => { if (mode) { S.mode = S.mode === mode ? null : mode; say(S.mode ? `${label}: click a province.` : 'Cancelled.'); refresh(); } else act(W.battalionOrder(b.id, { type })); } }, label);
    const eng = b.engaged ? W.engagement(b.engaged) : null;
    right.replaceChildren(...[h('h3', {}, b.name.toUpperCase()), h('small', {}, `${b.commanderName ? `Commander ${b.commanderName}` : 'No commander'} · ${STATUS[b.status]}${b.status === 'theatre' ? ` at ${provinceById(b.pos).name}` : ''}`),
      h('div', { class: 'stc-meters' }, ...[['Strength', s.strength, '#3ddc84'], ['Organisation', s.org, '#4aa8ff'], ['Entrenchment', s.entrench * 20, '#e8b84a']].map(([k, val, c]) => h('div', {}, h('span', {}, k), bar(val, c), h('b', {}, k === 'Entrenchment' ? `${s.entrench} / 5` : `${val}%`)))),
      h('h4', {}, 'STATS (from what it is made of)'), h('div', { class: 'stc-stats' }, stat('Soft attack', s.soft), stat('Hard attack', s.hard), stat('Defence', s.defence), stat('Armour', s.armour), stat('Speed', `${s.speed} km/h${s.mounted ? '' : ' (on foot)'}`), stat('Combat width', s.width)),
      h('h4', {}, 'MADE OF (real squads and vehicles)'), h('ul', {}, ...parts.map((t) => h('li', {}, t))), h('div', { class: 'stc-meters' }, ...[['Supply', s.supply, s.supply >= 70 ? '#3ddc84' : s.supply >= 25 ? '#e8b84a' : '#e05a4a']].map(([k, val, c]) => h('div', {}, h('span', {}, k), bar(val, c), h('b', {}, `${val}%`)))), h('p', { class: 'stc-note' }, `${s.supply < 70 ? 'Short of supply: it recovers slowly and fights with less morale; it is never stopped. ' : ''}${s.fuelShort ? `Short of fuel (${s.fuelShort}%): its vehicles count for less. ` : ''}Weather here: ${WEATHER[(v.provinces.find((q) => q.id === b.pos) || {}).weather || 'clear'].name}.`),
      h('div', { class: 'stc-btns' }, ord('move', 'Move', 'move'), ord('attack', 'Attack', 'attack'), ord('airlift', 'Airlift', 'airlift'), ord('land', 'Landing', 'land'), ord('defend', 'Defend'), ord('hold', 'Hold'), ord('withdraw', 'Withdraw')),
      b.engaged ? h('div', { class: 'stc-alert' }, h('b', {}, 'In contact'), h('span', {}, eng?.title || ''), h('button', { class: 'pri', onclick: () => { ui.milSub = 'Engagement'; ui.milTab = 'Company'; ui.milEng = b.engaged; ui.milPage = 'Missions'; ui.openPanel('militaryterminal'); } }, 'Decide the battle')) : null,
      h('div', { class: 'stc-btns' }, b.status === 'home' ? h('button', { class: 'pri', disabled: !v.employer, title: v.employer ? '' : 'Enlist first', onclick: () => act(W.deploy(b.id)) }, 'Send to the theatre') : null, b.status === 'theatre' ? h('button', { disabled: Boolean(b.engaged || b.moving), onclick: () => act(W.recall(b.id)) }, 'Bring home') : null, b.status === 'home' ? h('button', { onclick: () => act(W.standDown(b.id)) }, 'Stand down') : null)].filter(Boolean));
  };
  const paintBottom = () => { const v = S.view; bottom.replaceChildren(h('div', { class: 'stc-modes' }, ...['Terrain', 'Control', 'Supply', 'Weather', 'Intel'].map((m) => h('button', { class: (S.layer || 'Terrain') === m ? 'on' : '', onclick: () => { S.layer = m; refresh(); } }, m)), ...['Air', 'Naval', 'Contracts'].map((m) => h('button', { disabled: true, title: 'a later release' }, m))), h('div', { class: 'stc-plans' }, v.log[0] ? `LOG ▸ ${v.log[0].text}` : 'LOG ▸ nothing yet')); };
  /** Repaint a panel only when something it shows has changed (rebuilding them every frame would eat the clicks). */
  const sigs = { top: () => [S.speed, W.cash(), S.view.paid, S.view.employer?.side], left: () => [S.view.battalions.map((b) => [b.id, b.status, b.pos, b.engaged, b.stats.org, b.stats.strength, b.stats.people]), S.sel, S.view.employer?.side], right: () => [S.view.battalions.find((b) => b.id === S.sel)?.id, JSON.stringify(S.view.battalions.find((b) => b.id === S.sel)?.stats), S.view.battalions.find((b) => b.id === S.sel)?.status, S.view.battalions.find((b) => b.id === S.sel)?.pos, S.view.battalions.find((b) => b.id === S.sel)?.engaged, S.view.battalions.find((b) => b.id === S.sel)?.order.type, S.mode, S.view.employer?.side], bottom: () => [S.layer, S.view.log[0]?.text] };
  const paints = { top: paintTop, left: paintLeft, right: paintRight, bottom: paintBottom };
  /** A battalion newly in contact (yours attacking, or an attack on you) stops the clock: the war does not wait for you to look. */
  const newContact = () => { const now = new Set(W.contacts()); let fresh = false; for (const id of now) if (!(S.engSeen ||= new Set()).has(id)) { fresh = true; const eng = W.engagement(id); say(eng?.strategic?.defend ? `ATTACK: ${eng.title}. Time is stopped.` : `Contact: ${eng?.title}. Time is stopped.`); } S.engSeen = now; if (fresh && S.speed > 0) { S.speed = 0; S.sig = null; } return fresh; };
  const refresh = (force = true) => { ensureMap(); if (!S.view) return; S.sig ||= {}; for (const k of Object.keys(paints)) { const sg = JSON.stringify(sigs[k]()); if (force || sg !== S.sig[k]) { S.sig[k] = sg; paints[k](); } } };

  // ---- tooltips, picking, orders
  const tipFor = (p) => {
    const v = S.view; const e = v.employer; const c = e ? v.provinces.find((q) => q.id === p.id) : null; const fx = TERRAIN_FX[p.terrain];
    const lines = [`Terrain: ${TERRAIN[p.terrain].name}${p.coast ? ' · coast' : ''} · speed ×${fx.speed} · defence ×${fx.def}`, `Controller: ${ATLAS.countries[c?.controller || p.country]?.name} · Infrastructure ${p.infra} · Fort ${p.fort}`, `Victory points ${p.vp}${p.port ? ' · port' : ''}${p.airfield ? ' · airfield' : ''}${p.rail.length ? ' · railway' : ''}`];
    if (c) { lines.push(`Weather: ${WEATHER[c.weather].name} · march ×${WEATHER[c.weather].speed} · Supply ${c.controller === e.side ? `${c.supply}%` : 'none (not yours)'} · Intelligence: ${['unseen', 'spotted', 'known'][c.intel]}`); if (c.garrisonReport) { const r = c.garrisonReport; lines.push(r.level >= 2 ? `Garrison (reported): about ${r.troops} troops${r.armour ? `, ${r.armour} armour` : ''}.` : r.level === 1 ? `Garrison (spotted): perhaps ${r.troops} troops?` : 'Garrison: unknown: nothing has been seen of it.'); } }
    return [h('b', {}, `${p.name} · ${ATLAS.states.find((x) => x.id === p.state)?.name}`), ...lines.map((t) => h('div', {}, t))];
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
    if (S.drag) { S.cam.x += x - S.drag.x; S.cam.y += y - S.drag.y; S.drag.moved = (S.drag.moved || 0) + Math.abs(x - S.drag.x) + Math.abs(y - S.drag.y); S.drag.x = x; S.drag.y = y; return; }
    const p = provAt(x, y); S.hover = p; if (p) { tip.replaceChildren(...tipFor(p)); tip.style.left = `${Math.min(canvas.width - 320, x + 16)}px`; tip.style.top = `${Math.min(canvas.height - 130, y + 16)}px`; tip.classList.remove('hidden'); } else tip.classList.add('hidden');
  };
  canvas.addEventListener('pointerdown', (e) => { const r = canvas.getBoundingClientRect(); S.drag = { x: e.clientX - r.left, y: e.clientY - r.top, moved: 0 }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', (e) => {
    const d = S.drag; S.drag = null; if (!d || d.moved > 6) return; const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
    const bn = (S.banners || []).find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (bn && !S.mode) { S.sel = bn.id; refresh(); return; }
    const p = provAt(x, y); if (!p) return;
    if (S.mode && S.sel) { const r2 = W.battalionOrder(S.sel, { type: S.mode, to: p.id }); say(r2.text); if (r2.ok) S.mode = null; refresh(); return; }
    S.selProv = p; refresh();
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top; const f = e.deltaY < 0 ? 1.15 : 0.87; const nz = Math.max(0.35, Math.min(5, S.cam.z * f)); S.cam.x = x - ((x - S.cam.x) / S.cam.z) * nz; S.cam.y = y - ((y - S.cam.y) / S.cam.z) * nz; S.cam.z = nz; }, { passive: false });

  // ---- the modals: enlist, raise a battalion, the template designer
  const showModal = (...kids) => { modal.replaceChildren(h('div', { class: 'stc-card' }, ...kids)); modal.classList.remove('hidden'); };
  const closeModal = () => modal.classList.add('hidden');
  const openEnlist = () => {
    const th = W.theatres();
    showModal(h('h3', {}, 'ENLIST IN A THEATRE'), h('p', { class: 'stc-note' }, 'A nation at war hires you for its side: its ships carry your battalions, it pays a retainer for every soldier and vehicle in the theatre, and a bonus for every victory point you take from the other side.'),
      ...th.map((t) => h('div', { class: `stc-row${t.hot ? '' : ' off'}` }, h('div', {}, h('b', {}, t.name), h('small', {}, `${t.kind} · ${t.provinces} provinces · ${t.hot ? 'fighting' : 'quiet'}`), h('small', {}, t.note)), h('div', { class: 'stc-btns' }, ...t.between.map((c) => h('button', { disabled: !t.hot, class: 'pri', onclick: () => { const r = W.enlist({ theatre: t.id, side: c }); say(r.text); if (r.ok) closeModal(); refresh(); } }, `for ${ATLAS.countries[c].name}`))))),
      h('div', { class: 'stc-btns' }, h('button', { onclick: closeModal }, 'Close')));
  };
  const needsView = (tpl, squads) => { const rows = W.needs(tpl); const P = W.provided(squads); const have = (k) => (k === 'squads' ? P.squads : k === 'recon' ? (P.cls.recon || 0) + (P.role.recon || 0) : k.startsWith('role:') ? P.role[k.slice(5)] || 0 : P.cls[k.slice(4)] || 0); return h('div', { class: 'stc-needs' }, ...rows.map((r) => h('div', { class: have(r.key) >= r.need ? 'ok' : 'short' }, h('b', {}, `${r.icon} ${r.label}`), h('span', {}, `need ${r.need}`), h('small', {}, `${have(r.key)} in these squads`)))); };
  const openRaise = () => {
    const v = W.strategic(); const R = S.raise; const tpl = v.templates.find((t) => t.id === R.tpl) || v.templates[0]; R.tpl = tpl.id; R.squads = R.squads.filter((id) => v.squadsFree.some((s) => s.id === id));
    showModal(h('h3', {}, 'RAISE A BATTALION'), h('p', { class: 'stc-note' }, 'A battalion is made of real squads and the vehicles in them. It fails, and says what is short, if anything is missing. Nothing is invented.'),
      h('div', { class: 'stc-form' }, h('label', {}, 'Template', h('select', { onchange: (e) => { R.tpl = e.target.value; openRaise(); } }, ...v.templates.map((t) => h('option', { value: t.id, selected: t.id === R.tpl }, `${t.name} (${t.line.length} line, ${(t.support || []).length + (t.attach || []).length} support)`)))), h('label', {}, 'Name', h('input', { value: R.name, placeholder: 'optional', oninput: (e) => { R.name = e.target.value; } }))),
      h('h4', {}, 'SQUADS'), ...(v.squadsFree.length ? v.squadsFree.map((s) => h('label', { class: 'stc-check' }, h('input', { type: 'checkbox', checked: R.squads.includes(s.id), onchange: (e) => { R.squads = e.target.checked ? [...R.squads, s.id] : R.squads.filter((x) => x !== s.id); openRaise(); } }), `${s.name} · ${s.size} soldiers${s.vehicles ? ` · ${s.vehicles} vehicles` : ''}`)) : [h('p', { class: 'stc-note' }, 'No free squads. Form squads in the Military app first.')]),
      h('h4', {}, 'WHAT THIS NEEDS (from the chosen squads)'), needsView(tpl, R.squads),
      h('div', { class: 'stc-btns' }, h('button', { class: 'pri', onclick: () => { const r = W.raise({ template: R.tpl, name: R.name, squads: R.squads }); say(r.text); if (r.ok) { S.sel = r.id; R.squads = []; R.name = ''; closeModal(); } else openRaise(); refresh(); } }, 'Raise battalion'), h('button', { onclick: closeModal }, 'Close')));
  };
  const D = { id: null, name: '', line: [], support: [], attach: [] };
  const openDesigner = () => {
    const v = W.strategic(); const t = v.templates.find((x) => x.id === D.id);
    const slotBtn = (group, list) => h('div', { class: 'stc-slots' }, ...list.map((s, i) => h('div', { class: 'stc-slot', title: 'click to remove', onclick: () => { list.splice(i, 1); openDesigner(); } }, h('span', {}, SLOTS[group][s].icon), h('small', {}, SLOTS[group][s].name))), ...Object.entries(SLOTS[group]).map(([k, d]) => h('button', { class: 'stc-add', disabled: group === 'line' && list.length >= MAX_LINE, onclick: () => { list.push(k); openDesigner(); } }, `+ ${d.name}`)));
    const draft = { id: D.id && t && !t.builtin ? D.id : undefined, name: D.name, line: D.line, support: D.support, attach: D.attach };
    showModal(h('h3', {}, 'BATTALION TEMPLATES'), h('p', { class: 'stc-note' }, 'A template is a recipe. Pick one to copy it, change it, and save it under your own name.'),
      h('div', { class: 'stc-btns' }, ...v.templates.map((x) => h('button', { class: D.id === x.id ? 'on' : '', onclick: () => { D.id = x.id; D.name = x.builtin ? `${x.name} (mine)` : x.name; D.line = [...x.line]; D.support = [...(x.support || [])]; D.attach = [...(x.attach || [])]; openDesigner(); } }, x.name))), h('label', { class: 'stc-form' }, 'Name', h('input', { value: D.name, oninput: (e) => { D.name = e.target.value; } })),
      h('h4', {}, `LINE (${D.line.length} of ${MAX_LINE})`), slotBtn('line', D.line), h('h4', {}, 'SUPPORT COMPANIES'), slotBtn('support', D.support), h('h4', {}, 'AIR AND ARTILLERY ATTACHED'), slotBtn('attach', D.attach), h('h4', {}, 'WHAT IT ASKS'), needsView({ line: D.line, support: D.support, attach: D.attach }, []),
      h('div', { class: 'stc-btns' }, h('button', { class: 'pri', onclick: () => { const r = W.saveTemplate(draft); say(r.text); if (r.ok) { D.id = r.id; } openDesigner(); } }, 'Save template'), D.id && t && !t.builtin ? h('button', { onclick: () => { const r = W.removeTemplate(D.id); say(r.text); if (r.ok) D.id = null; openDesigner(); } }, 'Remove') : null, h('button', { onclick: closeModal }, 'Close')));
  };

  // ---- the loop
  const frame = (now) => {
    if (S.closed) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if (S.speed > 0) { S.acc = Math.min(2, S.acc + dt * S.speed); if (S.acc >= 1) { S.acc -= 1; g.skipTime(60); if (newContact()) S.acc = 0; } W.strategicTick(); newContact(); refresh(false); if (S.clockB) S.clockB.textContent = `Day ${g.clock.day} · ${g.clock.timeString}`; }
    if (S.map) draw();
  };
  const onResize = () => resize(); window.addEventListener('resize', onResize); resize();
  setTimeout(() => { if (S.closed) return; resize(); refresh(); if (!S.view) { wait.textContent = 'You have no company yet: register one in the Military app.'; return; } if (!S.view?.employer) { wait.classList.add('hidden'); say('Enlist in a theatre to begin.'); } last = performance.now(); raf = requestAnimationFrame(frame); }, 30);
  return { title: '', className: 'battlecmd', onClose: () => { S.closed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); } };
}
