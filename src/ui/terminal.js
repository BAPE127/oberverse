// The arms-works terminal (v0.13.0; OSINT console since v0.15.1). A trade-
// intelligence console on a CRT monitor: an interactive globe (drag to turn,
// wheel to zoom, hover anything) showing the fictional countries, wars, your
// shipments sailing (or flying) from Halvermouth and the world's other
// shipping traffic, beside live status, contacts and intercepted news. Below
// it, command tabs for parts, equipment, staff, research and the market.
// See src/systems/arms.js and src/systems/market.js.
import { h, itemIcon } from './panels.js';
import { D2R, wrapLon, buildLand } from '../world/globe.js';
import { pointAlong } from '../world/seaRoutes.js';

// --------------------------------------------------------------- the globe
let LAND = null;

function project(lat, lon, rot, tilt) {
  const a = lat * D2R;
  const b = (lon + rot) * D2R;
  const x = Math.cos(a) * Math.sin(b);
  const y0 = Math.sin(a);
  const z0 = Math.cos(a) * Math.cos(b);
  const t = tilt * D2R;
  return { x, y: y0 * Math.cos(t) - z0 * Math.sin(t), z: y0 * Math.sin(t) + z0 * Math.cos(t) };
}

/** Great-circle points between two lat/lon pairs; `bow` lifts the middle off the surface. */
function arc(a, b, n = 28, bow = 0.08) {
  const v = (p) => [Math.cos(p.lat * D2R) * Math.cos(p.lon * D2R), Math.cos(p.lat * D2R) * Math.sin(p.lon * D2R), Math.sin(p.lat * D2R)];
  const A = v(a);
  const B = v(b);
  const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const om = Math.acos(dot) || 1e-6;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om);
    const s2 = Math.sin(t * om) / Math.sin(om);
    const x = s1 * A[0] + s2 * B[0];
    const y = s1 * A[1] + s2 * B[1];
    const z = s1 * A[2] + s2 * B[2];
    out.push({ lat: Math.asin(z) / D2R, lon: Math.atan2(y, x) / D2R, lift: 1 + Math.sin(t * Math.PI) * bow });
  }
  return out;
}

/** The world's other shipping lanes, with traffic that never stops. */
const ROUTES = [['varn', 'ostmark'], ['varn', 'teshvar'], ['caldera', 'pallas'], ['sund', 'lirre'], ['ostmark', 'sund'], ['teshvar', 'morrow'], ['pallas', 'lirre'], ['caldera', 'teshvar'], ['morrow', 'caldera'], ['ostmark', 'lirre'], ['varn', 'caldera']];
const VESSELS = ['MV Saltmarsh Dawn', 'MV Grey Heron', 'MV Contessa Bell', 'MV Iron Lantern', 'MV Northern Mercy', 'MV Pale Horizon', 'MV Rook Island', 'MV Quiet Tuesday', 'MV Seven Brothers', 'MV Gilded Eel', 'MV Hollow Moon', 'MV Brass Albatross', 'MV Low Tide', 'MV Margarethe', 'MV Unremarkable', 'MV Ninth Wave', 'MV Copper Saint', 'MV Distant Cousin', 'MV Patience', 'MV Kettle Point', 'MV Lucky Anchor', 'MV Small Mercies'];
const DECLARED = ['grain', 'machine parts', 'refrigerated fish', 'textiles', 'tractor tyres', '"agricultural equipment"', 'cement', 'medical supplies', 'crude oil', 'consumer electronics', 'scrap metal', '"humanitarian aid"', 'timber', 'fertiliser', 'nothing (ballast)'];
const TRAFFIC = ROUTES.flatMap(([a, b], i) => [0, 1].map((k) => ({
  key: `tr${i}_${k}`, a: k ? b : a, b: k ? a : b,
  name: VESSELS[(i * 2 + k) % VESSELS.length],
  cargo: DECLARED[(i * 5 + k * 3) % DECLARED.length],
  speed: 0.012 + ((i * 7 + k * 3) % 5) * 0.003,
  phase: ((i * 0.37 + k * 0.5) % 1),
  dark: (i + k) % 6 === 5, // AIS off: no name, no story
})));

/** A little hull (or airframe) pointing along `ang`. */
function drawCraft(ctx, x, y, ang, s, color, air) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (air) {
    ctx.moveTo(6 * s, 0); ctx.lineTo(-4 * s, -1.2 * s); ctx.lineTo(-1 * s, -5 * s); ctx.lineTo(-2.4 * s, -5 * s);
    ctx.lineTo(-5 * s, -1.2 * s); ctx.lineTo(-6 * s, -3 * s); ctx.lineTo(-7 * s, -3 * s); ctx.lineTo(-6.2 * s, 0);
    ctx.lineTo(-7 * s, 3 * s); ctx.lineTo(-6 * s, 3 * s); ctx.lineTo(-5 * s, 1.2 * s); ctx.lineTo(-2.4 * s, 5 * s);
    ctx.lineTo(-1 * s, 5 * s); ctx.lineTo(-4 * s, 1.2 * s);
  } else {
    ctx.moveTo(6 * s, 0); ctx.lineTo(2 * s, -2.6 * s); ctx.lineTo(-5 * s, -2.6 * s); ctx.lineTo(-5 * s, 2.6 * s); ctx.lineTo(2 * s, 2.6 * s);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Corner brackets around a hovered or selected target. */
function reticle(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const k = r * 0.45;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * r, y + sy * (r - k));
    ctx.lineTo(x + sx * r, y + sy * r);
    ctx.lineTo(x + sx * (r - k), y + sy * r);
    ctx.stroke();
  }
}

/**
 * Draw the globe. Returns the hover targets on screen this frame:
 * [{ key, kind: 'country'|'ship'|'traffic'|'hq', x, y, r, data }].
 * opts: rot, tilt, zoom, wars [[a,b]], hq, shipments [{id, country, progress, air, data}], hover (key).
 */
export function drawGlobe(ctx, size, time, countries, opts = {}) {
  if (!LAND) LAND = buildLand(countries);
  const hits = [];
  const zoom = opts.zoom || 1;
  const r = size * 0.42 * zoom;
  const cx = size / 2;
  const cy = size / 2;
  const rot = opts.rot ?? -time * 8;
  const tilt = opts.tilt ?? 22;
  const P = (lat, lon, lift = 1) => {
    const q = project(lat, lon, rot, tilt);
    return { x: cx + q.x * r * lift, y: cy - q.y * r * lift, z: q.z };
  };
  // the void, with a faint grid like a radar scope
  ctx.fillStyle = '#010604';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(60,255,160,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += size / 12) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  // ocean
  const og = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  og.addColorStop(0, '#08261f');
  og.addColorStop(1, '#020c0a');
  ctx.fillStyle = og;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // graticule
  ctx.strokeStyle = 'rgba(80,255,170,0.13)';
  ctx.lineWidth = 0.8;
  const line = (pts) => {
    ctx.beginPath();
    let pen = false;
    for (const [la, lo] of pts) {
      const q = P(la, lo);
      if (q.z <= 0) { pen = false; continue; }
      if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
      pen = true;
    }
    ctx.stroke();
  };
  for (let la = -60; la <= 60; la += 30) line(Array.from({ length: 73 }, (_, i) => [la, -180 + i * 5]));
  for (let lo = -180; lo < 180; lo += 30) line(Array.from({ length: 37 }, (_, i) => [-90 + i * 5, lo]));
  // land as a dot matrix, tinted by country; the hovered country lights up
  const hoverCountry = opts.hover?.startsWith('c:') ? opts.hover.slice(2) : null;
  const dot = Math.max(1.3, r * 3 * D2R * 0.62);
  for (const p of LAND) {
    const q = P(p.lat, p.lon);
    if (q.z <= 0) continue;
    const lit = p.country === hoverCountry;
    const a = (0.25 + 0.6 * q.z) * (lit ? 1.6 : 1);
    ctx.fillStyle = lit ? `rgba(180,255,220,${Math.min(1, a)})` : p.border ? `rgba(110,255,180,${a})` : `rgba(40,170,110,${a * 0.75})`;
    ctx.fillRect(q.x - dot / 2, q.y - dot / 2, dot, dot);
  }
  // shipping lanes and traffic
  const at = (pts, t) => {
    const f = Math.max(0, Math.min(1, t)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const u = f - i;
    const A = pts[i];
    const B = pts[i + 1];
    const la = A.lat + (B.lat - A.lat) * u;
    const lo = A.lon + wrapLon(B.lon - A.lon) * u;
    const lift = A.lift + (B.lift - A.lift) * u;
    const q = P(la, lo, lift);
    const q2 = P(B.lat, B.lon, B.lift);
    const q1 = P(A.lat, A.lon, A.lift);
    return { ...q, ang: Math.atan2(q2.y - q1.y, q2.x - q1.x) };
  };
  const path = (pts, from = 0, to = 1) => {
    ctx.beginPath();
    let pen = false;
    const n = pts.length - 1;
    for (let i = Math.floor(from * n); i <= Math.ceil(to * n); i++) {
      const p = pts[i];
      const q = P(p.lat, p.lon, p.lift);
      if (q.z <= 0) { pen = false; continue; }
      if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
      pen = true;
    }
    ctx.stroke();
  };
  ctx.lineWidth = 1;
  for (const [a, b] of ROUTES) {
    if (!countries[a] || !countries[b]) continue;
    ctx.strokeStyle = 'rgba(120,200,255,0.18)';
    path(arc(countries[a], countries[b], 28, 0.02));
  }
  for (const t of TRAFFIC) {
    const A = countries[t.a];
    const B = countries[t.b];
    if (!A || !B) continue;
    const pts = arc(A, B, 28, 0.02);
    const q = at(pts, (((t.phase + time * t.speed) % 1) + 1) % 1);
    if (q.z <= 0.05) continue;
    const key = `t:${t.key}`;
    drawCraft(ctx, q.x, q.y, q.ang, 0.75 * Math.min(1.6, zoom), t.dark ? 'rgba(255,190,90,0.75)' : 'rgba(150,210,255,0.7)', false);
    hits.push({ key, kind: 'traffic', x: q.x, y: q.y, r: 9, data: { ...t, from: A.name, to: B.name } });
    if (opts.hover === key) reticle(ctx, q.x, q.y, 9, '#9fd8ff');
  }
  // wars: pulsing red lines between the capitals
  for (const [a, b] of opts.wars || []) {
    const A = countries[a];
    const B = countries[b];
    if (!A || !B) continue;
    ctx.strokeStyle = `rgba(255,60,50,${0.55 + 0.45 * Math.sin(time * 5)})`;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    path(arc(A, B, 20, 0.04));
    ctx.setLineDash([]);
  }
  // capitals, with labels
  ctx.font = `bold ${Math.max(10, size / 42)}px "Courier New", monospace`;
  for (const [id, c] of Object.entries(countries)) {
    const q = P(c.lat, c.lon);
    if (q.z <= 0) continue;
    const pulse = 3 + Math.sin(time * 3 + id.length) * 1.5;
    ctx.strokeStyle = c.color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, pulse + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.color;
    ctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5);
    if (opts.embargoed?.includes(id)) {
      ctx.strokeStyle = '#ff5040';
      ctx.beginPath(); ctx.moveTo(q.x - 6, q.y - 6); ctx.lineTo(q.x + 6, q.y + 6); ctx.moveTo(q.x + 6, q.y - 6); ctx.lineTo(q.x - 6, q.y + 6); ctx.stroke();
    }
    if (q.z > 0.3 && opts.labels !== false) {
      ctx.fillStyle = 'rgba(190,255,220,0.92)';
      ctx.fillText(c.name.toUpperCase(), q.x + 8, q.y - 6);
    }
    hits.push({ key: `c:${id}`, kind: 'country', x: q.x, y: q.y, r: 11, data: { id } });
    if (hoverCountry === id) reticle(ctx, q.x, q.y, 12, '#c8ffe4');
  }
  // home port
  if (opts.hq) {
    const q = P(opts.hq.lat, opts.hq.lon);
    if (q.z > 0) {
      ctx.strokeStyle = '#ffd860';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(q.x - 5, q.y - 5, 10, 10);
      ctx.fillStyle = '#ffd860';
      ctx.fillText('HALVERMOUTH [HQ]', q.x + 8, q.y + 12);
      hits.push({ key: 'hq', kind: 'hq', x: q.x, y: q.y, r: 9, data: opts.hq });
    }
    // your shipments: the route flows toward the buyer, the craft sits where it really is
    for (const sh of opts.shipments || []) {
      const B = countries[sh.country];
      if (!B) continue;
      const pts = sh.pts || arc(opts.hq, B, 36, sh.air ? 0.16 : 0.03);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,216,96,0.9)';
      path(pts, 0, sh.progress); // wake: where it has been
      ctx.strokeStyle = 'rgba(255,216,96,0.45)';
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time * 14; // marching toward the buyer
      path(pts, sh.progress, 1);
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      const q = at(pts, Math.min(0.999, Math.max(0.001, sh.progress)));
      if (q.z <= 0) continue;
      // a sonar ping around each of your craft
      const ping = (time * 0.8 + sh.id * 0.3) % 1;
      ctx.strokeStyle = `rgba(255,216,96,${1 - ping})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, 4 + ping * 14, 0, Math.PI * 2); ctx.stroke();
      drawCraft(ctx, q.x, q.y + (sh.air ? 0 : Math.sin(time * 2 + sh.id) * 0.8), q.ang, 1.15 * Math.min(1.6, zoom), '#ffd860', sh.air);
      const key = `s:${sh.id}`;
      hits.push({ key, kind: 'ship', x: q.x, y: q.y, r: 12, data: sh.data });
      if (opts.hover === key) reticle(ctx, q.x, q.y, 12, '#fff2b0');
    }
  }
  // your other Ober & Sons ships (commercial work, repositioning): cyan, along their sea lanes
  for (const f of opts.fleet || []) {
    if (!f.pts) continue;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(120,230,255,0.75)';
    path(f.pts, 0, f.progress);
    ctx.strokeStyle = 'rgba(120,230,255,0.3)';
    ctx.setLineDash([3, 5]);
    path(f.pts, f.progress, 1);
    ctx.setLineDash([]);
    const q = at(f.pts, Math.min(0.999, Math.max(0.001, f.progress)));
    if (q.z <= 0) continue;
    drawCraft(ctx, q.x, q.y, q.ang, 1.0 * Math.min(1.6, zoom), '#78e6ff', false);
    const key = `f:${f.id}`;
    hits.push({ key, kind: 'fleet', x: q.x, y: q.y, r: 10, data: f.data });
    if (opts.hover === key) reticle(ctx, q.x, q.y, 10, '#c8f6ff');
  }
  // rim glow
  const ag = ctx.createRadialGradient(cx, cy, r * 0.94, cx, cy, r * 1.1);
  ag.addColorStop(0, 'rgba(80,255,170,0)');
  ag.addColorStop(0.5, 'rgba(80,255,170,0.22)');
  ag.addColorStop(1, 'rgba(80,255,170,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
  return hits;
}

/** Which country's land is under a screen point (for hovering the land, not only the capital). */
function countryAtPoint(x, y, size, view) {
  if (!LAND) return null;
  const r = size * 0.42 * view.zoom;
  let best = null;
  let bd = Math.max(5, r * 3 * D2R);
  for (const p of LAND) {
    const q = project(p.lat, p.lon, view.rot, view.tilt);
    if (q.z <= 0) continue;
    const d = Math.hypot(size / 2 + q.x * r - x, size / 2 - q.y * r - y);
    if (d < bd) { bd = d; best = p.country; }
  }
  return best;
}

// ---------------------------------------------------------- the terminal
export const TERMINAL_TABS = ['Overview', 'Parts', 'Equipment', 'Staff', 'Research', 'Market'];

/** The globe's camera survives re-renders (each button press redraws the panel). */
const VIEW = { rot: 40, tilt: 22, zoom: 1, auto: true, hover: null };

/** The terminal at the works itself: a monitor on the desk. */
export function terminalPanel(ui, body, opts) {
  const def = ui.game.arms.def(opts.warehouse);
  const go = (t, extra = {}) => ui.openPanel('terminal', { warehouse: opts.warehouse, tab: t, ...extra });
  terminalScreen(ui, body, opts, go);
  return { title: `${def.name} — terminal`, className: 'monitor' };
}

const two = (n) => String(n).padStart(2, '0');
const stamp = (g, total) => `D${Math.floor(total / 1440) + 1} ${two(Math.floor((total % 1440) / 60))}:${two(Math.floor(total % 60))}`;

/**
 * The console: shared by the works terminal and the tablet's Business app.
 * go(tab, extra) re-renders it on another tab.
 */
export function terminalScreen(ui, body, opts, go) {
  const g = ui.game;
  const A = g.arms;
  const M = g.market;
  const wh = opts.warehouse;
  const def = A.def(wh);
  const tab = opts.tab || 'Overview';
  const items = g.content.items;
  const cfg = A.cfg;
  const say = (r) => { ui.audio.sfx(r.ok ? 'sfx_ui_click' : 'sfx_fail'); go(tab, { msg: r.text }); };
  const p = A.power(wh);
  const staff = A.staffOf(wh);
  const r = A.state.research;
  const ms = M.state;
  const now = g.clock.total;

  const screen = h('div', { class: 'osint' });
  body.append(screen);

  // header bar
  screen.append(h('div', { class: 'os-head' },
    h('span', { class: 'os-brand' }, '◉ PIPECREEK//OVERWATCH'),
    h('span', {}, 'TRADE-INTEL CONSOLE v4.1'),
    h('span', {}, `NODE ${def.name.toUpperCase()}${opts.remote ? ' [REMOTE]' : ''}`),
    h('span', {}, `${stamp(g, now)}Z`),
    h('span', { class: 'os-live' }, '● LIVE')));

  // globe + side panels
  const SIZE = 420;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const canvas = h('canvas', { width: SIZE * dpr, height: SIZE * dpr, class: 'os-globe', style: `width:${SIZE}px;height:${SIZE}px` });
  const tip = h('div', { class: 'os-tip hidden' });
  const ctrl = (label, fn, title) => h('button', { class: 'os-mini', title, onclick: fn }, label);
  const globeBox = h('div', { class: 'os-globe-box' }, canvas, tip,
    h('div', { class: 'os-globe-ctrl' },
      ctrl('+', () => { VIEW.zoom = Math.min(2.6, VIEW.zoom * 1.25); }, 'Zoom in'),
      ctrl('−', () => { VIEW.zoom = Math.max(0.8, VIEW.zoom / 1.25); }, 'Zoom out'),
      ctrl('HQ', () => { VIEW.rot = -cfg.hq.lon; VIEW.tilt = Math.max(-60, Math.min(60, cfg.hq.lat * 0.8)); VIEW.auto = false; }, 'Centre on Halvermouth'),
      ctrl('AUTO', (e) => { VIEW.auto = !VIEW.auto; e.currentTarget.classList.toggle('on', VIEW.auto); }, 'Auto-rotate')),
    h('div', { class: 'os-globe-help' }, 'DRAG: ROTATE · WHEEL: ZOOM · HOVER: INSPECT'));
  globeBox.querySelector('.os-mini:last-child').classList.toggle('on', VIEW.auto);

  const status = h('div', { class: 'os-box' },
    h('div', { class: 'os-label' }, '▌STATUS'),
    h('div', {}, `FUNDS ........ ${g.player.money} OB`),
    h('div', {}, `POWER ........ ${p.machines}/${p.capacity} STATIONS`),
    h('div', {}, `STAFF ........ ${staff.length}/${def.bunks} ON BOOKS`),
    h('div', {}, `RESEARCH ..... ${r.current ? `${cfg.research[r.current].name.toUpperCase()} ${Math.floor(r.progress)}/${cfg.research[r.current].cost}` : 'IDLE'}`),
    h('div', {}, `EXPORTS ...... ${ms.earned} OB EARNED`),
    h('div', {}, `PIPECREEK BUY  ${A.lucasBudgetLeft()} OB LEFT TODAY`));

  // contacts: your shipments, live
  const opName = (x) => (x.vessel ? `⚓ ${g.logistics.vessel(x.vessel)?.name || 'YOUR SHIP'}` : cfg.shippers[x.shipper].name);
  const contactRows = ms.shipments.map((x) => {
    const sh = { name: opName(x) };
    const prog = Math.min(1, (now - x.departs) / Math.max(1, x.arrives - x.departs));
    const hrs = Math.max(0, Math.ceil((x.arrives - now) / 60));
    const row = h('div', { class: 'os-contact', onmouseenter: () => { VIEW.hover = `s:${x.id}`; VIEW.pin = true; }, onmouseleave: () => { VIEW.pin = false; VIEW.hover = null; } },
      h('div', {}, `${x.shipper === 'stork' ? '✈' : '⛴'} #${String(x.id).padStart(3, '0')} → ${cfg.countries[x.country].name.toUpperCase()}${x.embargo ? ' ⚠EMB' : ''}`),
      h('div', { class: 'os-bar' }, h('i', { style: `width:${Math.round(prog * 100)}%` })),
      h('div', { class: 'os-dim' }, `${sh.name.toUpperCase()} · ETA ${hrs}H · ${x.value} OB`));
    return row;
  });
  const contacts = h('div', { class: 'os-box' }, h('div', { class: 'os-label' }, `▌CONTACTS (${ms.shipments.length})`),
    ...(contactRows.length ? contactRows : [h('div', { class: 'os-dim' }, 'NO CARGO AT SEA. SHIP FROM THE MARKET TAB.')]));
  const intercepts = h('div', { class: 'os-box os-log' }, h('div', { class: 'os-label' }, '▌INTERCEPTS'),
    ...ms.news.slice(0, 6).map((n) => h('div', {}, h('span', { class: 'os-dim' }, `[D${n.day}] `), n.text.toUpperCase())));
  screen.append(h('div', { class: 'os-top' }, globeBox, h('div', { class: 'os-side' }, status, contacts, intercepts)));

  // command bar
  screen.append(h('div', { class: 'os-cmds' },
    ...TERMINAL_TABS.map((t, i) => h('button', { class: t === tab ? 'on' : '', onclick: () => go(t) }, `F${i + 1} ${t.toUpperCase()}`))));
  screen.append(h('div', { class: 'os-prompt' }, `root@${wh}:~$ ${opts.msg ? '' : tab.toLowerCase()}`, opts.msg ? h('span', { class: 'os-msg' }, opts.msg) : null, h('span', { class: 'os-cursor' }, '█')));

  // ------------------------------------------------- the live globe
  const ctx = canvas.getContext('2d');
  let hits = [];
  let last = performance.now();
  const t0 = last;
  const shipInfo = (x) => {
    return {
      id: x.id, shipper: opName(x), air: x.shipper === 'stork', dest: cfg.countries[x.country].name,
      cargo: Object.entries(x.items).map(([id, n]) => `${n}× ${items[id]?.name}`),
      value: x.value, insured: x.insured, embargo: x.embargo,
      eta: Math.max(0, Math.ceil((x.arrives - g.clock.total) / 60)),
      progress: Math.min(1, (g.clock.total - x.departs) / Math.max(1, x.arrives - x.departs)),
    };
  };
  // your Ober & Sons ships on the globe (v0.22.0): real sea lanes, positions from the clock
  const Lg = g.logistics;
  const fleetPts = (vid) => {
    const v = Lg.vessel(vid);
    const r = v?.voyage && Lg.route(v.voyage.from, v.voyage.to);
    return r ? Array.from({ length: 41 }, (_, i) => { const [lat, lon] = pointAlong(r, i / 40); return { lat, lon, lift: 1 }; }) : null;
  };
  const fleetProgress = (vid) => { const v = Lg.vessel(vid); return v?.status === 'underway' ? Lg.position(v).f : 0; };
  const fleetTracks = () => (Lg.owned ? Lg.vessels().filter((v) => v.status === 'underway' && !v.voyage.shipment).map((v) => ({
    id: v.id, pts: fleetPts(v.id), progress: Lg.position(v).f,
    data: [`⚓ ${v.name.toUpperCase()} — OBER & SONS`, `${Lg.port(v.voyage.from).name.toUpperCase()} → ${Lg.port(v.voyage.to).name.toUpperCase()}`, v.cargo ? `CARGO     ${v.cargo.units} UNITS (COMMERCIAL)` : 'SAILING EMPTY', `ETA ${Math.max(0, Math.ceil((v.voyage.arrive - g.clock.total) / 60))}H`],
  })) : []);
  const loop = (ts) => {
    if (!canvas.isConnected) return;
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (VIEW.auto && !drag && !VIEW.hover) VIEW.rot -= dt * 6;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = M.state;
    hits = drawGlobe(ctx, SIZE, Math.max(0, ts - t0) / 1000, cfg.countries, {
      rot: VIEW.rot, tilt: VIEW.tilt, zoom: VIEW.zoom, hover: VIEW.hover,
      wars: m.wars.map((w) => [w.a, w.b]), hq: cfg.hq,
      embargoed: Object.entries(m.countries).filter(([, c]) => c.embargo).map(([id]) => id),
      shipments: m.shipments.map((x) => ({ id: x.id, country: x.country, air: x.shipper === 'stork', progress: x.vessel ? fleetProgress(x.vessel) : Math.min(1, (g.clock.total - x.departs) / Math.max(1, x.arrives - x.departs)), pts: x.vessel ? fleetPts(x.vessel) : null, data: shipInfo(x) })),
      fleet: fleetTracks(),
    });
    // scan line sweeping the scope
    const sy = ((ts - t0) / 1000 * 60) % SIZE;
    ctx.fillStyle = 'rgba(90,255,170,0.06)';
    ctx.fillRect(0, sy, SIZE, 3);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  let drag = null;
  const local = (e) => { const b = canvas.getBoundingClientRect(); return { x: ((e.clientX - b.left) * SIZE) / b.width, y: ((e.clientY - b.top) * SIZE) / b.height }; };
  const describe = (hit) => {
    if (hit.kind === 'ship') {
      const d = hit.data;
      return [`${d.air ? '✈ AIRFRAME' : '⛴ VESSEL'} #${String(d.id).padStart(3, '0')} — YOUR CARGO`, `OPERATOR  ${d.shipper.toUpperCase()}`, `DEST      ${d.dest.toUpperCase()}`, `CARGO     ${d.cargo.join(', ')}`, `VALUE     ${d.value} OB ON ARRIVAL`, `PROGRESS  ${Math.round(d.progress * 100)}% · ETA ${d.eta}H`, d.insured ? 'INSURED' : 'UNINSURED', d.embargo ? '⚠ EMBARGO RUN — CUSTOMS RISK' : null].filter(Boolean);
    }
    if (hit.kind === 'fleet') return [...hit.data, 'ONE OF YOURS'];
    if (hit.kind === 'traffic') {
      const d = hit.data;
      if (d.dark) return ['◌ UNIDENTIFIED VESSEL', 'AIS TRANSPONDER: OFF', `HEADING   TOWARD ${d.to.toUpperCase()}`, 'CARGO     UNKNOWN', 'NOT ONE OF YOURS'];
      return [`⛴ ${d.name.toUpperCase()}`, `ROUTE     ${d.from.toUpperCase()} → ${d.to.toUpperCase()}`, `DECLARED  ${d.cargo.toUpperCase()}`, 'AIS TRANSPONDER: ON', 'NOT ONE OF YOURS'];
    }
    if (hit.kind === 'hq') return ['■ HALVERMOUTH — HOME PORT', `${M.state.shipments.length} OUTBOUND CONTACT(S)`, `EXPORTS TO DATE ${M.state.earned} OB`];
    const id = hit.data.id;
    const c = cfg.countries[id];
    const st = M.state.countries[id];
    const enemy = M.enemyOf(id);
    const fams = Object.entries(c.wants).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([f]) => f.toUpperCase()).join(', ');
    const ours = M.state.shipments.filter((x) => x.country === id);
    const inbound = ours.length ? ours.map((x) => `#${x.id}: ${Object.entries(x.items).map(([iid, n]) => `${n}× ${items[iid]?.name}`).join(', ')} (ETA ${Math.max(0, Math.ceil((x.arrives - g.clock.total) / 60))}H)`) : ['NONE'];
    return [
      `◆ ${c.name.toUpperCase()}`,
      `STATUS    ${enemy ? `AT WAR WITH ${cfg.countries[enemy].name.toUpperCase()}` : 'AT PEACE'}${st.embargo ? ' · EMBARGOED' : ''}`,
      `BUDGET    ${Math.round(st.budget)} OB`,
      `WANTS     ${fams}`,
      ...(() => { const os = M.openOrders(id); return os.length ? [`ORDERS    ${os.length} OPEN`, ...os.slice(0, 3).map((o) => `  ${o.qty}× ${items[o.item].name.replace('Crate of ', '').toUpperCase()} @ ${o.price} OB`)] : ['ORDERS    NONE OPEN']; })(),
      `STANCE    ${st.hostility >= cfg.market.refuseHostility ? 'REFUSES YOU' : st.hostility > 0 ? `HOSTILITY ${st.hostility}` : 'NEUTRAL'}`,
      'YOUR INBOUND CARGO:', ...inbound.map((t) => `  ${t}`),
      c.blurb,
    ];
  };
  const hover = (e) => {
    const pt = local(e);
    if (drag) {
      VIEW.rot += (pt.x - drag.x) * 0.35 / VIEW.zoom;
      VIEW.tilt = Math.max(-70, Math.min(70, VIEW.tilt + (pt.y - drag.y) * 0.3 / VIEW.zoom));
      drag = pt;
      return;
    }
    // craft first (they sit on top), then capitals, then any land
    const order = { ship: 0, traffic: 1, hq: 2, country: 3 };
    const hit = hits.filter((x) => Math.hypot(x.x - pt.x, x.y - pt.y) <= x.r).sort((a, b) => order[a.kind] - order[b.kind])[0]
      || (() => { const id = countryAtPoint(pt.x, pt.y, SIZE, VIEW); return id ? { key: `c:${id}`, kind: 'country', data: { id } } : null; })();
    VIEW.hover = hit?.key || null;
    if (!hit) { tip.classList.add('hidden'); return; }
    tip.replaceChildren(...describe(hit).map((t, i) => h('div', { class: i ? '' : 'os-tip-title' }, t)));
    tip.classList.remove('hidden');
    const b = canvas.getBoundingClientRect();
    const box = globeBox.getBoundingClientRect();
    const x = e.clientX - box.left + 14;
    const y = e.clientY - box.top + 14;
    tip.style.left = `${Math.min(x, b.width - 230)}px`;
    tip.style.top = `${Math.min(y, b.height - 40)}px`;
  };
  canvas.addEventListener('pointerdown', (e) => { drag = local(e); canvas.setPointerCapture(e.pointerId); tip.classList.add('hidden'); });
  canvas.addEventListener('pointerup', (e) => {
    const was = drag;
    drag = null;
    // a click (not a drag) on a country opens the market with it chosen as the buyer
    const pt = local(e);
    if (was && Math.hypot(pt.x - was.x, pt.y - was.y) < 3 && VIEW.hover?.startsWith('c:')) {
      const id = VIEW.hover.slice(2);
      go('Market', { country: id, msg: `TARGET SET: ${cfg.countries[id].name.toUpperCase()}` });
    }
  });
  canvas.addEventListener('pointermove', hover);
  canvas.addEventListener('pointerleave', () => { if (!VIEW.pin) VIEW.hover = null; tip.classList.add('hidden'); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); VIEW.zoom = Math.max(0.8, Math.min(2.6, VIEW.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); }, { passive: false });

  // ------------------------------------------------- the command tabs
  const sect = h('div', { class: 'os-body' });
  screen.append(sect);
  const row = (icon, name, desc, ...buttons) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, icon), h('div', { class: 'grow' }, h('div', { class: 'name' }, name), desc ? h('div', { class: 'desc' }, desc) : null), ...buttons.filter(Boolean));
  const btn = (label, fn, cls = 'small') => h('button', { class: cls, onclick: fn }, label);
  const H3 = (t) => h('h3', {}, `■ ${t.toUpperCase()}`);

  if (tab === 'Overview') {
    const list = (o) => Object.entries(o).filter(([, n]) => n > 0).map(([id, n]) => `${items[id]?.name} ×${n}`).join(', ');
    sect.append(
      H3('Inventory'),
      h('pre', { class: 'os-pre' }, [
        `PRODUCED (ALL TIME) : ${list(A.state.produced) || 'NOTHING YET'}`,
        `LOADING DOCK        : ${list(g.world.containers[def.inBay].items) || 'EMPTY'}`,
        `EXPORT CAGE         : ${list(g.world.containers[def.outCrate].items) || 'EMPTY'}`,
        `ORDERS INBOUND      : ${A.state.orders.filter((o) => o.wh === wh).map((o) => `${o.qty}× ${items[o.item].name}`).join(', ') || 'NONE'}`,
      ].join('\n')),
      H3('Operating procedure'),
      h('pre', { class: 'os-pre os-dim' }, [
        '01  ORDER PARTS + EQUIPMENT (F2/F3). DELIVERY TO LOADING DOCK < 60 MIN.',
        '02  COLLECT EQUIPMENT FROM DOCK. [B] TO PLACE STATIONS. [E] ON A STATION SETS ITS RECIPE.',
        '03  HIRE + ASSIGN STAFF (F4). STATIONS RUN ONLY WHILE STAFFED ON SHIFT.',
        '04  BELTS + INSERTER ARMS MOVE PARTS BETWEEN STATIONS.',
        '05  STATIONS MAKE WHOLE CRATES → EXPORT CAGE. FILL COUNTRIES\' ORDERS OF 5–50 CRATES (F6) OR SELL TO PIPECREEK AT 50%.',
        '06  ONE GUN (OR AMMO) FOR YOURSELF? THE ARMOURER\'S WORKBENCH, BY THE DOCK.',
        '07  CLICK A COUNTRY ON THE GLOBE TO SEE ITS ORDERS.',
      ].join('\n')),
    );
  } else if (tab === 'Parts' || tab === 'Equipment') {
    const list = Object.entries(items).filter(([, it]) => (tab === 'Parts' ? it.category === 'arms_part' && it.price > 0 : it.build && (it.build.domain === 'arms' || ['belt', 'inserter', 'generator'].includes(it.build.type))));
    sect.append(H3(tab === 'Parts' ? 'Supplier catalogue — parts' : 'Supplier catalogue — equipment'));
    if (tab === 'Parts' && A.partsMult() < 1) sect.append(h('p', { class: 'os-dim' }, `LEAN SUPPLY ACTIVE: PARTS −${Math.round((1 - A.partsMult()) * 100)}%`));
    for (const [id, it] of list) {
      const price = A.partPrice(id);
      const qs = tab === 'Parts' ? [1, 10, 50] : it.build.type === 'belt' ? [10, 50] : [1];
      sect.append(row(itemIcon(it), `${it.name} — ${price} OB`, it.description, ...qs.map((q) => btn(`×${q}`, () => say(A.order(wh, id, q))))));
    }
    const pending = A.state.orders.filter((o) => o.wh === wh);
    if (pending.length) sect.append(h('p', { class: 'os-dim' }, `INBOUND: ${pending.map((o) => `${o.qty}× ${items[o.item].name}`).join(', ')}.`));
  } else if (tab === 'Staff') {
    const stations = A.cells(wh).machines;
    sect.append(H3('Personnel'), h('div', { class: 'row', style: 'justify-content:flex-start' }, btn('AUTO-ASSIGN FREE STAFF', () => say(A.autoAssign(wh)), 'small primary')));
    if (!staff.length) sect.append(h('p', { class: 'os-dim' }, 'NO PERSONNEL ON FILE. HIRE FROM THE APPLICANT POOL BELOW.'));
    for (const st of staff) {
      const sel = h('select', { onchange: (e) => say(A.assign(st.id, e.target.value || null)) },
        h('option', { value: '' }, '— unassigned —'),
        ...stations.map((e) => h('option', { value: e.id, selected: st.assigned === e.id }, `${cfg.stations[e.kind].name} @${e.x},${e.y}${A.workerAt(e) && A.workerAt(e) !== st ? ` (${A.workerAt(e).shortName})` : ''}`)));
      const skills = Object.entries(st.skills).map(([k, v]) => `${k} ${v}`).join(' · ');
      sect.append(row('👷', `${st.name} — ${st.wage}/day — morale ${Math.round(st.morale)}${st.unpaid ? ' (UNPAID)' : ''}`, `${skills}${st.quirk ? ` · ${cfg.quirks[st.quirk].name}: ${cfg.quirks[st.quirk].text}` : ''}`, sel, btn('Bonus', () => say(A.bonus(st.id))), btn('Fire', () => say(A.fire(st.id)))));
    }
    sect.append(H3(`Applicant pool — ${staff.length}/${def.bunks} bunks used`));
    A.candidates().forEach((c, i) => {
      const skills = Object.entries(c.skills).map(([k, v]) => `${k} ${v}`).join(' · ');
      sect.append(row('📋', `${c.name} — ${c.main} specialist — ${c.wage}/day`, `${skills}${c.quirk ? ` · ${cfg.quirks[c.quirk].name}: ${cfg.quirks[c.quirk].text}` : ''}`, btn('Hire', () => say(A.hire(i, wh)))));
    });
    sect.append(h('p', { class: 'os-dim' }, 'PAYROLL 19:00 FROM YOUR FUNDS. UNPAID TWICE OR MORALE < 15 → RESIGNATION. IDLE STAFF RECOVER MORALE; A BONUS (ONE DAY\'S WAGE) HELPS.'));
  } else if (tab === 'Research') {
    const labs = A.cells(wh).machines.filter((e) => e.kind === 'lab');
    sect.append(H3('R&D programme'), h('p', { class: 'os-dim' }, labs.length ? 'RESEARCH POINTS COME FROM STAFFED LABS IN ANY OF YOUR WORKS. SELECT A PROJECT:' : 'NO LAB DETECTED. ORDER A RESEARCH LAB (F3) AND ASSIGN A SCIENTIST.'));
    const grid = h('div', { class: 'research' });
    for (const br of cfg.branches) {
      const col = h('div', { class: 'branch' }, h('h4', {}, br.toUpperCase()));
      for (const [id, n] of Object.entries(cfg.research).filter(([, x]) => x.branch === br)) {
        const done = A.done(id);
        const avail = A.available(id);
        const cur = r.current === id;
        const cls = `node${done ? ' done' : avail ? ' avail' : ' locked'}${cur ? ' cur' : ''}`;
        const need = n.requires.filter((q) => !A.done(q)).map((q) => cfg.research[q].name).join(', ');
        col.append(h('button', { class: cls, disabled: !avail || cur, onclick: () => say(A.selectResearch(id)) },
          h('b', {}, n.name), h('span', {}, done ? ' ✓' : ` ${n.cost} RP`), h('div', { class: 'desc' }, n.text), cur ? h('div', { class: 'desc' }, `IN PROGRESS: ${Math.floor(r.progress)}/${n.cost}`) : null, !done && need ? h('div', { class: 'desc' }, `NEEDS: ${need}`) : null));
      }
      grid.append(col);
    }
    sect.append(grid);
  } else if (tab === 'Market') {
    // v0.19.0: countries post orders of 5–50 crates; you fill them from the export cage
    const cage = g.world.containers[def.outCrate].items;
    const C = cfg.crate;
    const ship = opts.ship || {};
    const focus = opts.country || null;
    const orders = M.openOrders().filter((o) => !focus || o.country === focus).sort((a, b) => a.expires - b.expires);
    sect.append(H3(focus ? `Orders from ${cfg.countries[focus].name}` : 'Open orders'));
    sect.append(h('p', { class: 'os-dim' }, `COUNTRIES ORDER ${C.minOrder}–${C.maxOrder} CRATES OF ONE WEAPON AT A FIXED PRICE PER CRATE. FILL AN ORDER FROM THIS WORKS' EXPORT CAGE; PAYMENT ON ARRIVAL. ${focus ? '' : 'CLICK A COUNTRY ON THE GLOBE TO SEE ONLY ITS ORDERS.'}`),
      ...(focus ? [h('div', { class: 'row', style: 'justify-content:flex-start' }, btn('ALL ORDERS', () => go('Market', {})))] : []));
    if (!orders.length) sect.append(h('p', { class: 'os-dim' }, 'NO OPEN ORDERS. NEW ORDERS COME IN EVERY DAY — MORE FROM COUNTRIES AT WAR.'));
    for (const o of orders) {
      const c = cfg.countries[o.country];
      const st = ms.countries[o.country];
      const it = items[o.item];
      const have = cage[o.item] || 0;
      const enemy = M.enemyOf(o.country);
      const tags = [enemy ? `AT WAR WITH ${cfg.countries[enemy].name.toUpperCase()}` : null, st.embargo ? '⚠ EMBARGOED' : null, `EXPIRES DAY ${o.expires}`].filter(Boolean).join(' · ');
      const open = ship.order === o.id;
      const rowEl = row(st.embargo ? '⛔' : enemy ? '⚔️' : '📦', `#${o.id} ${c.name} — ${o.qty}× ${it.name}`, `${o.price.toLocaleString()} OB/CRATE · ${(o.qty * o.price).toLocaleString()} OB TOTAL · ${tags} · CAGE ${have}/${o.qty}`,
        btn(open ? 'CANCEL' : 'FILL', () => go('Market', { country: focus, ship: open ? {} : { order: o.id, shipper: st.embargo ? 'ghost' : 'morrow', insured: false } }), have >= o.qty && !open ? 'small primary' : 'small'));
      sect.append(rowEl);
      if (open) {
        const value = o.qty * o.price;
        const upd = (patch) => go('Market', { country: focus, ship: { ...ship, ...patch } });
        // v0.22.0: your own ships (Ober & Sons) sit beside the shipping companies
        const Lg = g.logistics;
        const fleet = Lg.owned ? Lg.vessels().filter((v) => v.kind === 'cargo') : [];
        const own = ship.vessel ? Lg.vessel(ship.vessel) : null;
        const escorts = (ship.escorts || []).filter((id) => Lg.vessel(id));
        const q = own ? Lg.armsQuote(own.id, o.country, o.qty, { escorts, guards: Boolean(ship.guards), value }) : null;
        const free = own ? Lg.vessels().filter((w) => w.kind === 'warship' && w.status === 'docked' && w.port === Lg.L.armsPort && Lg.stats(w).tags.includes('escort')) : [];
        const sh = own ? null : cfg.shippers[ship.shipper];
        const fee = own ? q.cost : M.fee(ship.shipper, value, ship.insured);
        const pick = h('select', { onchange: (e) => (e.target.value.startsWith('v:') ? upd({ vessel: e.target.value.slice(2), shipper: null, insured: false }) : upd({ shipper: e.target.value, vessel: null })) },
          ...Object.entries(cfg.shippers).map(([id, x]) => h('option', { value: id, selected: !own && id === ship.shipper }, `${x.name} — ${Math.round(x.fee * 100)}% · ${Math.round(x.reliability * 100)}% reliable · ${x.days}d${x.embargo ? ' · runs embargoes' : ''}`)),
          ...(fleet.length ? [h('optgroup', { label: 'YOUR FLEET — OBER & SONS (no freight fee)' }, ...fleet.map((v) => {
            const vq = Lg.armsQuote(v.id, o.country, o.qty);
            return h('option', { value: `v:${v.id}`, selected: own?.id === v.id }, `⚓ ${v.name} (${Lg.model(v.model).name}) — ${vq.ok ? `${(vq.hours / 24).toFixed(1)}d · costs ${vq.cost}` : vq.reasons[0]}`);
          }))] : []));
        const form = h('div', { class: 'os-box', style: 'margin:-4px 0 10px' },
          h('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px;justify-content:flex-start' }, pick,
            own ? h('span', { class: 'os-dim' }, 'OWN SHIPS CAN\'T BE INSURED.') : null,
            own ? h('label', {}, h('input', { type: 'checkbox', checked: Boolean(ship.guards), onchange: (e) => upd({ guards: e.target.checked }) }), ' HIRE GUARDS') : null,
            ...free.map((w) => h('label', {}, h('input', { type: 'checkbox', checked: escorts.includes(w.id), onchange: (e) => upd({ escorts: e.target.checked ? [...escorts, w.id] : escorts.filter((x) => x !== w.id) }) }), ` ESCORT: ${w.name.toUpperCase()}`)),
            own ? null : h('label', {}, h('input', { type: 'checkbox', checked: ship.insured, onchange: (e) => upd({ insured: e.target.checked }) }), ` INSURE (+${Math.round(cfg.market.insuranceRate * 100)}%, PAYS ${Math.round(cfg.market.insurancePayout * 100)}% IF LOST)`)),
          h('div', { class: 'os-dim' }, own ? `YOUR ${Lg.model(own.model).name.toUpperCase()} TO ${Lg.port(q.to)?.name.toUpperCase() || '—'} · ${q.km.toLocaleString()} KM · RUNNING COSTS ${q.opex} + PORT FEES ${q.fees}${q.escortCost ? ` + ESCORTS ${q.escortCost}` : ''}${q.services ? ` + GUARDS ${q.services}` : ''}. ${q.ok ? '' : `CAN'T: ${q.reasons.join('; ').toUpperCase()}.`}` : sh.blurb),
          own && q.risk ? h('div', { class: q.risk.category === 'low' ? 'os-dim' : 'os-msg' }, `PIRACY RISK ${q.risk.category.toUpperCase()} (${(q.risk.chance * 100).toFixed(1)}%) · WORST CASE: ${({ repelled: 'NONE', delay: 'A DELAY', ransom: 'A RANSOM', cargo: 'CARGO SEIZED', captured: 'SHIP CAPTURED' })[q.risk.worst]}${q.risk.exposure.names.length ? ` · VIA ${q.risk.exposure.names.join(', ').toUpperCase()}` : ''}`) : null,
          h('div', {}, h('b', {}, `SHIPPING NOW: ${fee.toLocaleString()} OB · ON ARRIVAL: ${value.toLocaleString()} OB`), st.embargo ? ' · ⚠ EMBARGO RUN: ILLEGAL. IF CUSTOMS SEIZE IT, THEY\'LL TRACE IT TO YOU.' : ''),
          h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:6px' },
            have < o.qty ? h('span', { class: 'os-msg' }, `NEED ${o.qty - have} MORE CRATES IN THE CAGE.`) : btn(`SHIP ${o.qty} CRATES`, () => {
              const res = M.ship({ wh, order: o.id, shipper: ship.shipper, insured: ship.insured, vessel: own?.id || null, escorts, guards: Boolean(ship.guards) });
              ui.audio.sfx(res.ok ? 'sfx_coin' : 'sfx_fail');
              go('Market', { msg: res.text, country: focus });
            }, own && !q.ok ? 'small' : 'small primary')));
        sect.append(form);
      }
    }
    // the cage
    const crates = Object.entries(cage).filter(([id, n]) => n > 0 && items[id]?.arms?.crate);
    sect.append(H3('Export cage'));
    sect.append(h('p', { class: 'os-dim' }, crates.length ? crates.map(([id, n]) => `${n}× ${items[id].name}`).join(' · ') : 'EMPTY. STAFFED STATIONS SET TO A WEAPON RECIPE MAKE WHOLE CRATES; BELT THEM (OR CARRY THEM) INTO THE CAGE.'));
    // buyers at a glance
    sect.append(H3('Buyers'));
    for (const [id, c] of Object.entries(cfg.countries)) {
      const st = ms.countries[id];
      const enemy = M.enemyOf(id);
      const n = M.openOrders(id).length;
      const tags = [enemy ? `AT WAR WITH ${cfg.countries[enemy].name.toUpperCase()}` : 'AT PEACE', st.embargo ? 'EMBARGOED' : null, st.hostility >= cfg.market.refuseHostility ? 'REFUSES YOU' : st.hostility > 0 ? `HOSTILITY ${st.hostility}` : null].filter(Boolean).join(' · ');
      sect.append(row(st.embargo ? '⛔' : enemy ? '⚔️' : '🌐', `${c.name} — budget ${Math.round(st.budget).toLocaleString()}`, `${tags} · ${n} OPEN ORDER${n === 1 ? '' : 'S'}`, n ? btn('ORDERS', () => go('Market', { country: id })) : null));
    }
    sect.append(h('p', { class: 'os-dim' }, `EXPORTS TO DATE: ${ms.earned.toLocaleString()} OB. PIPECREEK ARMORY STILL BUYS CRATES (AND SINGLE WEAPONS) WHOLESALE AT 50%, UP TO LUCAS'S DAILY BUDGET.`));
  }
}
