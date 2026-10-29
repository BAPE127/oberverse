// Fleet Command (v0.25.0): Ober & Sons Maritime's operations room. It takes
// the whole screen: a live, glowing sea chart you drag and zoom, with your
// ships sailing on it. Everything happens from the map —
//
//   click a port   → its contracts and missions, each with one Send button
//                    (the best ship or team is already picked: Logistics.bestShipFor,
//                    Missions.bestTeam); protection is optional, folded away
//   click a ship   → its card; "Send to…" then click any port
//   ⏩ / ⏭          → let time pass and watch the fleet sail (it's the real clock)
//
// The left rail holds the rest: Fleet (every ship), Buy (ships and ports),
// Shipyard, Ledger. All state and every action is game.logistics — this file
// only draws and calls it. Opened by the harbour-office terminal, the
// tablet's Ships app, Captain Ober and Mason (PANELS.logistics / PANELS.fleet).
import { h } from './panels.js';
import { wrapLon } from '../world/globe.js';
import { surfaceTexture, flatCanvas } from '../engine/drawGlobeSurface.js';
import { pointAlong } from '../world/seaRoutes.js';
import { drawShip } from '../engine/drawShips.js';
import { shipyardSheet } from './shipBuilder.js';
import { drawProfileFitted, detailedLook } from '../engine/drawShipProfile.js';

const MODES = [
  ['map', '🗺', 'Map'],
  ['fleet', '⛴', 'Fleet'],
  ['buy', '🏷', 'Buy'],
  ['shipyard', '🛠', 'Shipyard'],
  ['ledger', '📒', 'Ledger'],
];
const STATUS = { docked: 'In port', loading: 'Loading', underway: 'At sea', mission: 'On a mission', lost: 'Lost' };
const RISK_COLOUR = { low: '#4ade9a', moderate: '#f2c14e', high: '#ff8a4a', extreme: '#ff4a5a' };
const OUTCOME = { repelled: 'nothing worse than a scare', delay: 'a delay', ransom: 'a ransom', cargo: 'losing the cargo', captured: 'losing the ship' };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** append, skipping the nulls left by optional bits (h() skips them; DOM append would print "null") */
const put = (el, ...kids) => el.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
const num = (n) => Math.round(n).toLocaleString();
const hrs = (m) => { const x = m / 60; return x >= 36 ? `${(x / 24).toFixed(1)} days` : `${Math.max(1, Math.round(x))} h`; };

/** Fleet Command's own state survives re-opening (the camera, what's selected, folded-out cards). */
const FC = { mode: 'map', sel: null, view: { lon: -20, lat: 25, zoom: 1.25 }, open: {}, protect: {}, sending: null, buyTab: 'cargo', yard: {}, ff: null, msg: null };

let LAND_IMG = null;

/** The world, once: the shared surface texture in the ops-room palette, at a quarter degree, smoothed. */
function landImage(countries) {
  if (LAND_IMG) return LAND_IMG;
  const tex = surfaceTexture('fleet', { deep: [3, 12, 24], shelf: [10, 46, 72], low: [18, 50, 66], high: [52, 92, 104], coast: [80, 225, 255], border: [34, 84, 104], ice: [130, 176, 196] }, countries, 2);
  LAND_IMG = flatCanvas(tex, 2);
  return LAND_IMG;
}

// ====================================================================== the panel
export function fleetPanel(ui, body, opts = {}) {
  const g = ui.game;
  const Lg = g.logistics;
  if (opts.tab === 'Shipyard') FC.mode = 'shipyard';
  if (opts.mode) FC.mode = opts.mode;
  if (opts.port || opts.ship) { FC.mode = 'map'; FC.sel = opts.port ? { kind: 'port', id: opts.port } : { kind: 'ship', id: opts.ship }; }
  body.classList.add('fc');
  const canvas = h('canvas', { class: 'fc-canvas' });
  const top = h('div', { class: 'fc-top' });
  const rail = h('div', { class: 'fc-rail' });
  const drawer = h('div', { class: 'fc-drawer' });
  const sheet = h('div', { class: 'fc-sheet hidden' });
  const feed = h('div', { class: 'fc-feed' });
  const toast = h('div', { class: 'fc-toast hidden' });
  const tip = h('div', { class: 'fc-tip hidden' });
  body.append(canvas, top, rail, drawer, sheet, feed, toast, tip);

  const say = (r) => {
    if (!r?.text) return;
    ui.audio.sfx(r.ok === false ? 'sfx_fail' : 'sfx_coin');
    toast.textContent = r.text;
    toast.className = `fc-toast ${r.ok === false ? 'bad' : 'good'}`;
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.add('hidden'), 4200);
  };
  const ctx = canvas.getContext('2d');
  const view = FC.view;
  let hits = [];
  let hover = null;
  let preview = null; // a route to show: { from, to, colour }

  // ---------------------------------------------------------------- projection
  const size = () => ({ W: canvas.width, H: canvas.height, ppd: (canvas.width / 360) * view.zoom });
  const toScreen = (lat, lon) => { const { W, H, ppd } = size(); return { x: W / 2 + wrapLon(lon - view.lon) * ppd, y: H / 2 - (lat - view.lat) * ppd }; };
  const centreOn = (lat, lon, zoom) => { view.lat = lat; view.lon = lon; if (zoom) view.zoom = Math.max(view.zoom, zoom); };

  // ---------------------------------------------------------------- drawing
  const drawMap = (t) => {
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(canvas.clientWidth * dpr);
    const bh = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const { W, H, ppd } = size();
    view.lat = Math.max(-60, Math.min(70, view.lat));
    // the sea
    const sea = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    sea.addColorStop(0, '#08223a');
    sea.addColorStop(1, '#020812');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, W, H);
    // the grid
    ctx.strokeStyle = 'rgba(80,180,255,0.07)';
    ctx.lineWidth = 1;
    // the land (three copies for the wrap)
    const land = landImage(g.content.arms.countries);
    const x0 = W / 2 + (-180 - view.lon) * ppd;
    const y0 = H / 2 - (90 - view.lat) * ppd;
    ctx.imageSmoothingEnabled = true;
    for (const k of [-1, 0, 1]) ctx.drawImage(land, x0 + k * 360 * ppd, y0, 360 * ppd, 180 * ppd);
    ctx.strokeStyle = 'rgba(80,180,255,0.08)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon < 180; lon += 15) { const p = toScreen(0, lon); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { const p = toScreen(lat, 0); ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(W, p.y); ctx.stroke(); }
    // danger
    for (const z of Lg.zones()) {
      const p = toScreen(z.lat, z.lon);
      const r = (z.radius / 111) * ppd;
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.6 + z.lat);
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const col = z.war ? '255,90,60' : z.embargo ? '200,90,255' : '255,50,70';
      gr.addColorStop(0, `rgba(${col},${0.05 + z.danger * 0.22 * pulse})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${Lg.state.suppressed?.[z.id] > g.clock.total ? 0.25 : 0.5})`;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.98, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (view.zoom > 1.6) label(z.name[0].toUpperCase() + z.name.slice(1), p.x, p.y - r * 0.5, `rgba(${col},0.85)`, 11);
      hits.push({ kind: 'zone', id: z.id, x: p.x, y: p.y, r: Math.max(10, r * 0.4), z });
    }
    // routes
    const route = (from, to, colour, dash, width = 2) => {
      const r = Lg.route(from, to);
      if (!r) return;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.shadowColor = colour;
      ctx.shadowBlur = 8;
      if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = -t * 30; }
      ctx.beginPath();
      let last = null;
      for (let i = 0; i <= 60; i++) {
        const [la, lo] = pointAlong(r, i / 60);
        const q = toScreen(la, lo);
        if (!last || Math.abs(q.x - last.x) > ppd * 120) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        last = q;
      }
      ctx.stroke();
      ctx.restore();
    };
    for (const v of Lg.vessels()) {
      if (v.status !== 'underway') continue;
      const mine = FC.sel?.kind === 'ship' && FC.sel.id === v.id;
      route(v.voyage.from, v.voyage.to, v.kind === 'warship' ? 'rgba(255,120,220,0.55)' : v.voyage.contract || v.voyage.shipment || v.voyage.job ? 'rgba(80,220,255,0.6)' : 'rgba(160,180,200,0.4)', [6, 8], mine ? 3 : 1.5);
    }
    if (preview) route(preview.from, preview.to, preview.colour || 'rgba(255,214,90,0.95)', [10, 6], 3);
    // ports
    for (const [id, p] of Object.entries(Lg.cfg.ports)) {
      const q = toScreen(p.lat, p.lon);
      if (q.x < -40 || q.x > W + 40 || q.y < -40 || q.y > H + 40) continue;
      const own = Lg.ownsPort(id);
      const work = own ? Lg.contracts('available').filter((c) => c.from === id).length + Lg.missions.list('available').filter((m) => m.port === id).length : 0;
      const sel = FC.sel?.kind === 'port' && FC.sel.id === id;
      const target = FC.sending && (hover?.kind === 'port' && hover.id === id);
      ctx.save();
      ctx.translate(q.x, q.y);
      if (own) {
        ctx.shadowColor = '#3ad6ff'; ctx.shadowBlur = 12;
        ctx.fillStyle = sel ? '#ffffff' : '#3ad6ff';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#04101c';
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        if (work) {
          ctx.fillStyle = '#f2c14e';
          ctx.beginPath(); ctx.arc(9, -9, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#04101c'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(work), 9, -8.5);
        }
      } else {
        ctx.fillStyle = sel ? '#fff' : 'rgba(170,200,230,0.7)';
        ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      if (target || sel) {
        ctx.strokeStyle = FC.sending ? '#f2c14e' : '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 14 + Math.sin(t * 5) * 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      if (own || view.zoom > 2.2 || sel || target) label(p.name.replace(/, Halvermouth$/, ''), q.x, q.y + 18, own ? '#bfefff' : 'rgba(190,210,230,0.75)', own ? 12 : 10);
      hits.push({ kind: 'port', id, x: q.x, y: q.y, r: own ? 13 : 9 });
    }
    // ships
    const docked = {};
    for (const v of Lg.vessels()) {
      if (v.status === 'lost') continue;
      const pos = Lg.position(v);
      if (!pos) continue;
      let q = toScreen(pos.lat, pos.lon);
      let ang = -Math.PI / 4;
      if (v.status === 'underway') {
        const ahead = Lg.position({ ...v, voyage: { ...v.voyage, depart: v.voyage.depart - 90 } });
        const qa = ahead && toScreen(ahead.lat, ahead.lon);
        if (qa) ang = Math.atan2(qa.y - q.y, qa.x - q.x);
      } else {
        const k = (docked[v.port] = (docked[v.port] || 0) + 1) - 1;
        q = { x: q.x + 16 + (k % 3) * 13, y: q.y - 14 + Math.floor(k / 3) * 13 };
      }
      const len = Math.max(18, Math.min(64, (v.status === 'underway' ? 30 : 18) * Math.sqrt(view.zoom)));
      const sel = FC.sel?.kind === 'ship' && FC.sel.id === v.id;
      ctx.save();
      if (sel) {
        ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, len * 0.75, t * 2, t * 2 + Math.PI * 1.5); ctx.stroke();
      }
      ctx.shadowColor = v.kind === 'warship' ? '#ff78dc' : '#3ad6ff';
      ctx.shadowBlur = 10;
      const look = Lg.model(v.model)?.look || v.appearance;
      const sc = len / ((look.len || 3) * 32);
      ctx.translate(q.x, q.y);
      ctx.scale(sc, sc);
      drawShip(ctx, look, 0, 0, ang, { time: t });
      ctx.restore();
      if (sel || (hover?.kind === 'ship' && hover.id === v.id) || (v.status === 'underway' && view.zoom > 1.8)) label(v.name, q.x, q.y - len * 0.6 - 6, '#ffe7a8', 11);
      hits.push({ kind: 'ship', id: v.id, x: q.x, y: q.y, r: Math.max(10, len * 0.5) });
    }
    // a hint while choosing where to send a ship
    if (FC.sending) {
      ctx.fillStyle = 'rgba(242,193,78,0.9)';
      ctx.font = '600 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Click a port to send the ${Lg.vessel(FC.sending)?.name} there  ·  Esc to cancel`, W / 2, 80 * (window.devicePixelRatio || 1));
    }
  };
  const label = (text, x, y, colour, px) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.font = `600 ${px * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(2,8,18,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  };

  // ---------------------------------------------------------------- the live loop (and fast-forward)
  let lastUi = 0;
  const loop = (ms) => {
    if (!canvas.isConnected) { FC.ff = null; return; }
    const t = ms / 1000;
    if (FC.ff) {
      const left = FC.ff.until - g.clock.total;
      if (left <= 0) { FC.ff = null; refresh(); } else g.skipTime(Math.min(left, Math.max(4, Math.ceil(left / 45))));
    }
    hits = [];
    drawMap(t);
    if (FC.ff && ms - lastUi > 400) { lastUi = ms; renderTop(); renderFeed(); if (FC.mode === 'map') renderDrawer(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ---------------------------------------------------------------- input
  const dpr = () => window.devicePixelRatio || 1;
  const local = (e) => { const b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) * dpr(), y: (e.clientY - b.top) * dpr() }; };
  const hitAt = (p) => hits.filter((k) => Math.hypot(k.x - p.x, k.y - p.y) < k.r * dpr() + 4).sort((a, b) => ({ ship: 0, port: 1, zone: 2 }[a.kind] - { ship: 0, port: 1, zone: 2 }[b.kind]))[0] || null;
  let drag = null;
  canvas.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false }; });
  window.addEventListener('mouseup', function up(e) {
    if (!canvas.isConnected) { window.removeEventListener('mouseup', up); return; }
    if (drag && !drag.moved && e.target === canvas) click(hitAt(local(e)));
    drag = null;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      const ppd = (canvas.clientWidth / 360) * view.zoom;
      view.lon = wrapLon(drag.lon - dx / ppd);
      view.lat = drag.lat + dy / ppd;
      return;
    }
    hover = hitAt(local(e));
    canvas.style.cursor = hover ? 'pointer' : 'grab';
    if (hover?.kind === 'port' && FC.sending) preview = { from: Lg.vessel(FC.sending)?.port, to: hover.id };
    else if (FC.sending) preview = null;
    showTip(hover, e);
  });
  canvas.addEventListener('mouseleave', () => { hover = null; tip.classList.add('hidden'); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    const { W, H, ppd } = size();
    const lon = view.lon + (p.x - W / 2) / ppd;
    const lat = view.lat - (p.y - H / 2) / ppd;
    view.zoom = Math.max(1, Math.min(9, view.zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
    const ppd2 = (canvas.width / 360) * view.zoom;
    view.lon = wrapLon(lon - (p.x - W / 2) / ppd2);
    view.lat = lat + (p.y - H / 2) / ppd2;
  }, { passive: false });
  const keys = (e) => {
    if (!canvas.isConnected) { window.removeEventListener('keydown', keys, true); return; }
    if (e.key === 'Escape' && (FC.sending || FC.mode !== 'map')) {
      e.stopImmediatePropagation();
      if (FC.sending) { FC.sending = null; preview = null; } else FC.mode = 'map';
      refresh();
    }
  };
  window.addEventListener('keydown', keys, true);

  const showTip = (k, e) => {
    if (!k) { tip.classList.add('hidden'); return; }
    let lines = [];
    if (k.kind === 'ship') {
      const v = Lg.vessel(k.id);
      lines = [v.name, `${STATUS[v.status]}${v.status === 'underway' ? ` → ${Lg.port(v.voyage.to).name}` : v.port ? ` · ${Lg.port(v.port).name}` : ''}`];
    } else if (k.kind === 'port') {
      const p = Lg.port(k.id);
      lines = [p.name, Lg.ownsPort(k.id) ? 'Your port' : `${Lg.portType(k.id).name} · ${num(Lg.portType(k.id).price)} obols`];
      if (FC.sending) {
        const v = Lg.vessel(FC.sending);
        const pl = Lg.plan(v, k.id);
        lines.push(pl.ok ? `${hrs(pl.hours * 60)} · costs ${num(pl.cost)}` : `✖ ${pl.reasons[0]}`);
      }
    } else if (k.kind === 'zone') {
      lines = [`⚠ ${k.z.name}`, `Danger ${Math.round(k.z.danger * 100)}%`];
    }
    tip.replaceChildren(...lines.map((l, i) => (i ? h('div', {}, l) : h('b', {}, l))));
    tip.classList.remove('hidden');
    const b = body.getBoundingClientRect();
    tip.style.left = `${e.clientX - b.left + 14}px`;
    tip.style.top = `${e.clientY - b.top + 14}px`;
  };

  const click = (k) => {
    if (FC.sending) {
      if (k?.kind === 'port') { sendShipTo(FC.sending, k.id); return; }
      FC.sending = null; preview = null; refresh(); return;
    }
    FC.sel = k && k.kind !== 'zone' ? { kind: k.kind, id: k.id } : null;
    FC.mode = 'map';
    ui.audio.sfx('sfx_ui_click');
    refresh();
  };

  const sendShipTo = (vid, pid) => {
    const r = Lg.sail(vid, pid);
    say(r);
    if (r.ok) { FC.sending = null; preview = null; FC.sel = { kind: 'ship', id: vid }; }
    refresh();
  };

  // ---------------------------------------------------------------- chrome
  const renderTop = () => {
    const next = Lg.owned ? Lg.nextEvent() : null;
    const S = Lg.state;
    const today = S.ledger?.days?.[0]?.day === g.clock.day ? S.ledger.days[0] : { revenue: 0, expenses: 0 };
    const ff = (mins) => { FC.ff = { until: g.clock.total + mins }; refresh(); };
    top.replaceChildren(
      h('div', { class: 'fc-brand' }, h('b', {}, '⚓ OBER & SONS'), h('span', {}, 'FLEET COMMAND')),
      h('div', { class: 'fc-time' },
        h('div', { class: 'fc-clock' }, `${g.clock.weekday} · Day ${g.clock.day} · ${g.clock.timeString}`),
        Lg.owned ? h('div', { class: 'fc-ff' },
          FC.ff ? h('button', { class: 'fc-btn on', onclick: () => { FC.ff = null; refresh(); } }, '⏸ Stop') : null,
          !FC.ff ? h('button', { class: 'fc-btn', title: 'Let an hour pass', onclick: () => ff(60) }, '⏩ 1 h') : null,
          !FC.ff ? h('button', { class: 'fc-btn', title: 'Let six hours pass', onclick: () => ff(360) }, '⏩ 6 h') : null,
          !FC.ff && next ? h('button', { class: 'fc-btn primary', title: 'Let time pass until the next arrival, departure, launch or mission end', onclick: () => ff(Math.min(next - g.clock.total + 1, 4 * 1440)) }, `⏭ Next event (${hrs(next - g.clock.total)})`) : null) : null),
      h('div', { class: 'fc-money' }, h('b', {}, `${num(g.corp.cashOf('shipping'))} ◎`), Lg.owned ? h('span', { class: today.revenue - today.expenses < 0 ? 'neg' : 'pos' }, `today ${today.revenue - today.expenses >= 0 ? '+' : ''}${num(today.revenue - today.expenses)}`) : null),
      h('button', { class: 'fc-close', title: 'Close (Esc)', onclick: () => ui.closePanel() }, '✕'));
  };

  const renderRail = () => {
    rail.replaceChildren(...MODES.map(([id, icon, name]) => h('button', { class: `fc-rail-btn${FC.mode === id ? ' on' : ''}`, disabled: !Lg.owned && id !== 'map', onclick: () => { FC.mode = id; FC.sending = null; refresh(); } }, h('span', { class: 'ic' }, icon), h('span', {}, name))));
  };

  const renderFeed = () => {
    const r = Lg.state.reports?.slice(0, 3) || [];
    feed.replaceChildren(h('span', { class: 'fc-feed-label' }, 'LOG'), ...r.map((x) => h('span', { class: 'fc-feed-item' }, h('i', {}, Lg.when(x.at).replace('Day ', 'D')), ' ', x.text)), h('button', { class: 'fc-link', onclick: () => { FC.mode = 'ledger'; refresh(); } }, 'All reports ›'));
  };

  // ---------------------------------------------------------------- shared bits
  /** A ship side-on, in detail (v0.26.0): stock ships get their standard fit, custom ships their own. */
  const shipPic = (model, w, hgt) => {
    const c = h('canvas', { width: w * 2, height: hgt * 2, class: 'fc-pic', style: `width:${w}px;height:${hgt}px` });
    drawProfileFitted(c.getContext('2d'), detailedLook(model), w, hgt, w * 1.94, hgt * 1.9, { time: 1 });
    return c;
  };
  const bar = (label, f, colour, text) => h('div', { class: 'fc-bar' }, h('span', {}, label), h('div', { class: 'fc-bar-track' }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%;background:${colour}` })), h('em', {}, text));
  const pill = (text, colour) => h('span', { class: 'fc-pill', style: `border-color:${colour};color:${colour}` }, text);
  const riskPill = (r) => pill(`${r.category === 'low' ? 'Safe waters' : `${r.category[0].toUpperCase()}${r.category.slice(1)} risk`} · ${(r.chance * 100).toFixed(r.chance < 0.1 ? 1 : 0)}%`, RISK_COLOUR[r.category]);
  const shipChip = (v) => h('button', { class: 'fc-chip', onclick: () => { FC.sel = { kind: 'ship', id: v.id }; refresh(); } }, shipPic(Lg.model(v.model), 46, 18), v.name);
  const section = (title, ...kids) => h('div', { class: 'fc-sec' }, h('h4', {}, title), ...kids);

  /** A contract, with one button. The ship is chosen for you; protection folds out. */
  const contractCard = (c) => {
    const T = Lg.cfg.contractTypes[c.type];
    const P = (FC.protect[c.id] ||= { guards: false, insure: false, escorts: [], ship: null });
    const opts = { guards: P.guards, insure: P.insure, escorts: P.escorts };
    const pick = P.ship ? { vessel: Lg.vessel(P.ship), quote: Lg.quote(c.id, P.ship, opts) } : Lg.bestShipFor(c.id, opts);
    const open = FC.open[c.id];
    const icon = { general: '📦', bulk: '⛰', machinery: '⚙', reefer: '❄', urgent: '⚡', highvalue: '💎', special: '🧪' }[c.type] || '📦';
    const card = h('div', { class: 'fc-card', onmouseenter: () => { preview = { from: c.from, to: c.to }; }, onmouseleave: () => { preview = null; } },
      h('div', { class: 'fc-card-head' }, h('span', { class: 'fc-ic' }, icon), h('div', { class: 'grow' }, h('b', {}, T.name), h('small', {}, `${c.units} units · ${Lg.cfg.clients[c.client].name}`)), h('div', { class: 'fc-pay' }, `${num(c.pay)} ◎`)),
      h('div', { class: 'fc-card-route' }, `${Lg.port(c.from).name.replace(/, Halvermouth$/, '')} → ${Lg.port(c.to).name}`, h('small', {}, ` · by ${Lg.when(c.deadline)}`)));
    if (pick?.quote?.ok) {
      const q = pick.quote;
      put(card, h('div', { class: 'fc-card-meta' }, riskPill(q.risk), q.onTime ? pill('On time', '#4ade9a') : pill('Late', '#ff8a4a'), h('small', {}, `profit ${num(q.profit)}`)));
      put(card, h('button', { class: 'fc-go', onclick: () => {
        if (c.status === 'available') Lg.accept(c.id);
        const r = Lg.assign(c.id, pick.vessel.id, opts);
        say(r);
        if (r.ok) { delete FC.protect[c.id]; preview = null; FC.sel = { kind: 'ship', id: pick.vessel.id }; }
        refresh();
      } }, `Send the ${pick.vessel.name} ▸`, h('small', {}, `arrives ${Lg.when(q.arrive)}`)));
    } else {
      const here = Lg.idle().filter((v) => v.port === c.from && Lg.stats(v).capacity);
      const why = pick?.quote?.reasons?.[0] || (here.length ? `${here[0].name}: ${Lg.quote(c.id, here[0].id, opts).reasons[0]}` : `no free cargo ship at ${Lg.port(c.from).name.replace(/, Halvermouth$/, '')} — send one here`);
      put(card, h('div', { class: 'fc-card-why' }, `✖ ${why}`));
    }
    put(card, h('button', { class: 'fc-fold', onclick: () => { FC.open[c.id] = !open; refresh(); } }, open ? 'Fewer options ▴' : 'Protect it · choose another ship ▾'));
    if (open) {
      const esc = Lg.suggestEscort(c.id, P.escorts);
      const R = Lg.cfg.risk;
      const toggle = (k) => () => { P[k] = !P[k]; refresh(); };
      put(card, h('div', { class: 'fc-opts' },
        h('button', { class: `fc-chip${P.guards ? ' on' : ''}`, onclick: toggle('guards') }, `🛡 Guards ${num(Math.max(R.guards.min, c.pay * R.guards.costShare))}`),
        h('button', { class: `fc-chip${P.insure ? ' on' : ''}`, onclick: toggle('insure') }, `📜 Insure ${num(c.pay * R.insurance.rate)}`),
        ...P.escorts.map((id) => h('button', { class: 'fc-chip on', onclick: () => { P.escorts = P.escorts.filter((x) => x !== id); refresh(); } }, `⚔ ${Lg.vessel(id).name} ✕`)),
        esc ? h('button', { class: 'fc-chip', onclick: () => { P.escorts = [...P.escorts, esc.id]; refresh(); } }, `⚔ + escort: ${esc.name}`) : null),
      h('div', { class: 'fc-opts' }, h('small', {}, 'Ship: '),
        h('button', { class: `fc-chip${!P.ship ? ' on' : ''}`, onclick: () => { P.ship = null; refresh(); } }, 'Best'),
        ...Lg.vessels().filter((v) => v.status === 'docked' && v.port === c.from && !P.escorts.includes(v.id) && Lg.stats(v).capacity).map((v) => h('button', { class: `fc-chip${P.ship === v.id ? ' on' : ''}`, title: Lg.quote(c.id, v.id, opts).reasons.join('; '), onclick: () => { P.ship = v.id; refresh(); } }, v.name))),
      pick?.quote?.risk ? h('small', { class: 'fc-muted' }, `Worst case on this route: ${OUTCOME[pick.quote.risk.worst]}${pick.quote.risk.exposure.names.length ? ` · through ${pick.quote.risk.exposure.names.join(', ')}` : ''}.`) : null);
    }
    return card;
  };

  /** A mission, with the best team already picked. */
  const missionCard = (m) => {
    const T = Lg.cfg.missionTypes[m.type];
    const best = Lg.missions.bestTeam(m.id);
    const card = h('div', { class: 'fc-card mission' },
      h('div', { class: 'fc-card-head' }, h('span', { class: 'fc-ic' }, '⚔'), h('div', { class: 'grow' }, h('b', {}, T.name), h('small', {}, `${T.client} · ${m.hours} h`)), h('div', { class: 'fc-pay' }, `${num(m.reward)} ◎`)),
      h('div', { class: 'fc-card-route' }, T.text));
    if (best) {
      const q = best.quote;
      put(card, bar('Chance', q.chance, q.chance >= 0.6 ? '#4ade9a' : q.chance >= 0.4 ? '#f2c14e' : '#ff8a4a', `${Math.round(q.chance * 100)}%`),
        h('button', { class: 'fc-go', onclick: () => { const r = Lg.missions.start(m.id, best.ships); say(r); refresh(); } }, `Send ${best.ships.map((id) => Lg.vessel(id).name).join(' + ')} ▸`, h('small', {}, `costs ${num(q.cost)}`)));
    } else put(card, h('div', { class: 'fc-card-why' }, `✖ needs ${Object.entries(T.needs || {}).map(([k, v]) => (k === 'tag' ? `a ${v} ship` : k === 'minSpeed' ? `${v}+ knots` : `${v}+ units aboard`)).join(', ') || 'a ship'} in port here`));
    return card;
  };

  // ---------------------------------------------------------------- the drawer (map mode)
  const renderDrawer = () => {
    drawer.classList.toggle('hidden', FC.mode !== 'map');
    if (FC.mode !== 'map') return;
    const kids = [];
    if (!Lg.owned) kids.push(...acquireView());
    else if (FC.sel?.kind === 'ship' && Lg.vessel(FC.sel.id)) kids.push(...shipView(Lg.vessel(FC.sel.id)));
    else if (FC.sel?.kind === 'port') kids.push(...portView(FC.sel.id));
    else kids.push(...homeView());
    drawer.replaceChildren(...kids.filter(Boolean));
  };

  const acquireView = () => {
    const o = Lg.offer();
    const can = g.player.money >= o.price;
    return [h('div', { class: 'fc-hero' }, h('div', { class: 'fc-kicker' }, 'FOR SALE'), h('h2', {}, o.company), h('p', {}, 'Captain Ober is retiring. His ports, his paperwork, and a ship he swears is "basically new".')),
      shipPic(Lg.model(Lg.L.starterShip.model), 330, 90),
      section('You get', h('ul', { class: 'fc-list' }, ...o.ports.map((p) => h('li', {}, `⚓ ${p}`)), h('li', {}, `⛴ ${o.ship}`), h('li', {}, '🗺 Fleet Command, contracts, the brokers'))),
      h('button', { class: 'fc-go big', disabled: !can, onclick: () => { say(Lg.buyCompany()); FC.view.zoom = 1.6; centreOn(48, -30); refresh(); } }, can ? `Buy for ${num(o.price)} ◎` : `You need ${num(o.price - g.player.money)} more`)];
  };

  const homeView = () => {
    const S = Lg.state;
    const idle = Lg.idle();
    const sea = Lg.vessels().filter((v) => v.status === 'underway');
    const alerts = [];
    if (S.arrears) alerts.push(h('div', { class: 'fc-alert bad' }, `⚠ ${num(S.arrears)} upkeep owed — ships are held in port.`, h('button', { class: 'fc-btn', onclick: () => { say(Lg.payArrears()); refresh(); } }, 'Pay')));
    if (idle.length) alerts.push(h('button', { class: 'fc-alert', onclick: () => { FC.sel = { kind: 'ship', id: idle[0].id }; const p = Lg.port(idle[0].port); centreOn(p.lat, p.lon); refresh(); } }, `⛴ ${idle.length} ship${idle.length === 1 ? ' is' : 's are'} waiting for orders ›`));
    const worn = Lg.vessels().filter((v) => v.status !== 'lost' && v.condition < 50);
    if (worn.length) alerts.push(h('button', { class: 'fc-alert', onclick: () => { FC.sel = { kind: 'ship', id: worn[0].id }; refresh(); } }, `🔧 ${worn.map((v) => v.name).join(', ')} need${worn.length === 1 ? 's' : ''} repairs ›`));
    const ops = Lg.opportunities(4);
    return [h('div', { class: 'fc-hero' }, h('div', { class: 'fc-kicker' }, 'GOOD MORNING, OWNER'), h('h2', {}, `${plural(Lg.vessels().filter((v) => v.status !== 'lost').length, 'ship')} · ${plural(Lg.ownedPorts().length, 'port')}`), h('p', {}, 'Click a port for its work, or a ship to give it orders.')),
      ...alerts,
      section('Best jobs right now', ...(ops.length ? ops.map((o) => contractCard(o.contract)) : [h('p', { class: 'fc-muted' }, 'Nothing your ships can take right now. New contracts arrive every morning at your ports.')])),
      section(`At sea (${sea.length})`, ...(sea.length ? sea.map((v) => { const p = Lg.position(v); return h('button', { class: 'fc-row', onclick: () => { FC.sel = { kind: 'ship', id: v.id }; centreOn(p.lat, p.lon); refresh(); } }, shipPic(Lg.model(v.model), 54, 20), h('div', { class: 'grow' }, h('b', {}, v.name), bar('', p.f, '#3ad6ff', Lg.port(v.voyage.to).name))); }) : [h('p', { class: 'fc-muted' }, 'Nobody at sea.')]))];
  };

  const portView = (id) => {
    const p = Lg.port(id);
    const pt = Lg.portType(id);
    const own = Lg.ownsPort(id);
    const country = p.country ? g.content.arms.countries[p.country].name : 'Free port';
    const here = Lg.vessels().filter((v) => v.port === id && v.status !== 'lost');
    const contracts = Lg.contracts(['available', 'accepted']).filter((c) => c.from === id);
    const missions = Lg.missions.list('available').filter((m) => m.port === id);
    const out = [h('div', { class: 'fc-hero' }, h('div', { class: 'fc-kicker' }, `${pt.name.toUpperCase()} · ${country.toUpperCase()}`), h('h2', {}, p.name), h('p', {}, p.blurb || ''),
      own ? pill('Your port', '#3ad6ff') : h('button', { class: 'fc-go', disabled: !g.corp.canAfford('shipping', pt.price) || Lg.ownedPorts().length >= Lg.L.maxPorts, onclick: () => { say(Lg.buyPort(id)); refresh(); } }, `Buy this port · ${num(pt.price)} ◎`, h('small', {}, `${pt.berths} berths · ${pt.upkeep}/day · brings daily contracts`)))];
    if (here.length) out.push(section('In port', h('div', { class: 'fc-chips' }, ...here.map(shipChip))));
    if (own) {
      out.push(section(`Contracts (${contracts.length})`, ...(contracts.length ? contracts.map(contractCard) : [h('p', { class: 'fc-muted' }, 'None today. New ones arrive at 06:00.')])));
      out.push(section(`Missions (${missions.length})`, ...(missions.length ? missions.map(missionCard) : [h('p', { class: 'fc-muted' }, 'None today.')])));
      const berths = Lg.state.display.berths;
      out.push(section('Shown at the Mill Road Yards', h('div', { class: 'fc-opts' }, h('small', {}, 'Berth: '),
        ...Array.from({ length: Lg.L.physicalBerths }, (_, i) => h('button', { class: `fc-chip${berths[i] === id ? ' on' : ''}`, title: berths[i] && berths[i] !== id ? `now showing ${Lg.port(berths[i]).name}` : '', onclick: () => { Lg.setBerth(i, berths[i] === id ? null : id); refresh(); } }, `${i + 1}${berths[i] && berths[i] !== id ? ' ·' : ''}`)),
        h('small', { class: 'fc-muted' }, ' its ships in port moor there for you to see'))));
      const y = Lg.shipyard.yard(id);
      const yq = Lg.shipyard.yardQuote(id);
      out.push(section('Shipyard', y ? h('div', {}, y.status === 'ready' ? '✅ Working · ' : `🏗 Mason's Os are building it — ready ${Lg.when(y.end)} · `, h('button', { class: 'fc-link', onclick: () => { FC.mode = 'shipyard'; refresh(); } }, 'Open shipyard ›'))
        : yq.ok ? h('button', { class: 'fc-go', disabled: !g.corp.canAfford('shipping', yq.cost), onclick: () => { say(Lg.shipyard.commissionYard(id)); refresh(); } }, `Commission Mason's Os · ${num(yq.cost)} ◎`, h('small', {}, `${yq.days} days`)) : h('p', { class: 'fc-muted' }, yq.reasons[0])));
    } else out.push(h('p', { class: 'fc-muted' }, 'Contracts start at your own ports. Your ships can still sail here — select one, then "Send to…".'));
    return out;
  };

  const shipView = (v) => {
    const m = Lg.model(v.model);
    const st = Lg.stats(v);
    const out = [h('div', { class: 'fc-hero ship' }, shipPic(m, 340, 110), h('div', { class: 'fc-kicker' }, `${m.name.toUpperCase()} · ${Lg.className(m).toUpperCase()}`), h('h2', {}, v.name), pill(STATUS[v.status] || v.status, v.status === 'underway' ? '#3ad6ff' : v.status === 'lost' ? '#ff4a5a' : '#cfe8ff'))];
    if (v.status === 'underway') {
      const p = Lg.position(v);
      out.push(bar('Voyage', p.f, '#3ad6ff', `${Math.round(p.f * 100)}%`), h('p', {}, `${Lg.port(v.voyage.from).name} → ${Lg.port(v.voyage.to).name} · arrives ${Lg.when(v.voyage.arrive)}`));
      if (v.cargo) out.push(h('p', { class: 'fc-muted' }, v.cargo.type === 'arms' ? `Carrying ${v.cargo.units} crates for ${g.content.arms.countries[v.cargo.country].name}` : v.cargo.type === 'aero' ? (v.cargo.reserved ? `Reserved for Roost Aeroworks' consignment ${v.cargo.job} (${v.cargo.units} units)` : `Carrying ${v.cargo.units} units of aerospace materials for Roost Aeroworks (${v.cargo.job})`) : `Carrying ${v.cargo.units} units`));
      for (const i of v.voyage.incidents || []) out.push(h('div', { class: 'fc-alert bad' }, i.text));
    } else if (v.port) out.push(h('p', {}, `${v.status === 'mission' ? 'On station off' : 'At'} ${Lg.port(v.port).name}`));
    out.push(bar('Hull', v.condition / 100, v.condition > 60 ? '#4ade9a' : v.condition > 30 ? '#f2c14e' : '#ff4a5a', `${Math.round(v.condition)}%`));
    if (st.capacity) out.push(bar('Hold', (v.cargo?.units || 0) / st.capacity, '#3ad6ff', `${v.cargo?.units || 0}/${st.capacity}`));
    out.push(h('div', { class: 'fc-stats' }, ...[['Speed', `${st.speed} kn`], ['Range', `${num(st.range)} km`], ['Defence', st.combat.defense], st.combat.attack ? ['Attack', st.combat.attack] : ['Reliable', `${Math.round(st.reliability * 100)}%`]].map(([k, val]) => h('div', {}, h('small', {}, k), h('b', {}, String(val))))));
    if (v.status === 'docked') {
      const work = Lg.contracts(['available', 'accepted']).filter((c) => c.from === v.port && Lg.quote(c.id, v.id).ok);
      out.push(h('div', { class: 'fc-actions' },
        h('button', { class: 'fc-go', onclick: () => { FC.sending = v.id; refresh(); } }, '⛵ Send to… ', h('small', {}, 'then click a port')),
        v.condition < 100 && Lg.portType(v.port).services.includes('repairs') ? h('button', { class: 'fc-btn', onclick: () => { say(Lg.repair(v.id)); refresh(); } }, `🔧 Repair · ${num(Lg.repairQuote(v))}`) : null));
      if (work.length) out.push(section(`Work for the ${v.name} here`, ...work.slice(0, 3).map((c) => { FC.protect[c.id] = { ...(FC.protect[c.id] || {}), ship: v.id, escorts: FC.protect[c.id]?.escorts || [] }; return contractCard(c); })));
    }
    const name = h('input', { class: 'fc-input', value: v.name, maxlength: 28 });
    out.push(section('Details',
      h('div', { class: 'fc-row-inline' }, name, h('button', { class: 'fc-btn', onclick: () => { say(Lg.rename(v.id, name.value)); refresh(); } }, 'Rename')),
      h('label', { class: 'fc-check' }, h('input', { type: 'checkbox', checked: v.visible, onchange: (e) => { Lg.setVisible(v.id, e.target.checked); } }), ' Show at the Mill Road Yards berths'),
      v.log.length ? h('div', { class: 'fc-log' }, ...v.log.slice(0, 5).map((l) => h('div', {}, l.mission ? `⚔ ${Lg.cfg.missionTypes[l.mission].name} — ${l.result}` : `${Lg.port(l.from).name} → ${Lg.port(l.to).name}${l.cargo ? ` · ${l.cargo}` : ''}${(l.incidents || []).length ? ' · 🏴' : ''}`))) : null));
    return out;
  };

  // ---------------------------------------------------------------- full-screen sheets (fleet, buy, shipyard, ledger)
  const renderSheet = () => {
    const on = FC.mode !== 'map' && Lg.owned;
    sheet.classList.toggle('hidden', !on);
    if (!on) return;
    const content = { fleet: fleetSheet, buy: buySheet, shipyard: yardSheet, ledger: ledgerSheet }[FC.mode]();
    sheet.classList.toggle('builder', FC.mode === 'shipyard' && FC.yard.sub === 'design' && Lg.shipyard.yards().length > 0);
    sheet.replaceChildren(h('div', { class: 'fc-sheet-head' }, h('h2', {}, MODES.find((x) => x[0] === FC.mode)[2]), h('button', { class: 'fc-btn', onclick: () => { FC.mode = 'map'; refresh(); } }, '◂ Back to the map')), content);
  };

  const fleetSheet = () => {
    const grid = h('div', { class: 'fc-grid' });
    for (const v of Lg.vessels()) {
      const m = Lg.model(v.model);
      const where = v.status === 'underway' ? `→ ${Lg.port(v.voyage.to).name}` : v.port ? Lg.port(v.port).name : '—';
      grid.append(h('button', { class: `fc-tile${v.status === 'lost' ? ' lost' : ''}`, onclick: () => { FC.mode = 'map'; FC.sel = { kind: 'ship', id: v.id }; const p = Lg.position(v); if (p) centreOn(p.lat, p.lon, 1.8); refresh(); } },
        shipPic(m, 250, 74), h('b', {}, v.name), h('small', {}, `${m.name} · ${Lg.className(m)}`), pill(STATUS[v.status] || v.status, v.status === 'underway' ? '#3ad6ff' : '#cfe8ff'), h('small', {}, where), bar('Hull', v.condition / 100, v.condition > 60 ? '#4ade9a' : '#f2c14e', `${Math.round(v.condition)}%`)));
    }
    return grid;
  };

  const buySheet = () => {
    const tabs = h('div', { class: 'fc-tabs' }, ...[['cargo', 'Cargo ships'], ['warships', 'Warships'], ['ports', 'Ports']].map(([k, label]) => h('button', { class: `fc-btn${FC.buyTab === k ? ' primary' : ''}`, onclick: () => { FC.buyTab = k; refresh(); } }, label)));
    const wrap = h('div', {}, tabs);
    if (FC.buyTab === 'ports') {
      const grid = h('div', { class: 'fc-grid ports' });
      const full = Lg.ownedPorts().length >= Lg.L.maxPorts;
      for (const [id, p] of Object.entries(Lg.cfg.ports).filter(([pid]) => !Lg.ownsPort(pid)).sort((a, b) => Lg.cfg.portTypes[a[1].type].price - Lg.cfg.portTypes[b[1].type].price)) {
        const pt = Lg.cfg.portTypes[p.type];
        grid.append(h('div', { class: 'fc-tile' }, h('b', {}, p.name), h('small', {}, `${pt.name} · ${p.country ? g.content.arms.countries[p.country].name : 'Free port'}`), h('small', { class: 'fc-muted' }, p.blurb),
          h('small', {}, `${pt.berths} berths · ships up to size ${pt.maxSize} · ${pt.upkeep}/day`),
          h('div', { class: 'fc-row-inline' }, h('button', { class: 'fc-btn', onclick: () => { FC.mode = 'map'; FC.sel = { kind: 'port', id }; centreOn(p.lat, p.lon, 2); refresh(); } }, 'Show'), h('button', { class: 'fc-btn primary', disabled: full || !g.corp.canAfford('shipping', pt.price), onclick: () => { say(Lg.buyPort(id)); refresh(); } }, `Buy · ${num(pt.price)}`))));
      }
      wrap.append(h('p', { class: 'fc-muted' }, `You own ${Lg.ownedPorts().length} of at most ${Lg.L.maxPorts} ports. Each port you own offers contracts and missions every day.`), grid);
      return wrap;
    }
    const list = FC.buyTab === 'cargo' ? Lg.cfg.dealership : Lg.cfg.warshipDealership;
    const grid = h('div', { class: 'fc-grid' });
    for (const id of list) {
      const m = Lg.cfg.ships[id];
      const probe = { model: id, status: 'docked' };
      const st = Lg.stats(probe);
      const ports = Lg.ownedPorts().filter((pid) => !Lg.berthCheck(probe, pid));
      const sel = h('select', { class: 'fc-input' }, ...ports.map((pid) => h('option', { value: pid }, Lg.port(pid).name)));
      const stats = m.kind === 'warship'
        ? [bar('Attack', st.combat.attack / 100, '#ff78dc', st.combat.attack), bar('Defence', st.combat.defense / 100, '#3ad6ff', st.combat.defense), bar('Speed', m.speed / 40, '#4ade9a', `${m.speed} kn`)]
        : [bar('Hold', m.capacity / 420, '#3ad6ff', `${m.capacity}`), bar('Speed', m.speed / 35, '#4ade9a', `${m.speed} kn`), bar('Range', m.range / 80000, '#f2c14e', `${num(m.range / 1000)}k km`)];
      grid.append(h('div', { class: 'fc-tile' }, shipPic(m, 250, 74), h('b', {}, m.name), h('small', {}, `${Lg.className(m)} · size ${st.size}${st.tags.length ? ` · ${st.tags.join(', ')}` : ''}`), ...stats, h('small', { class: 'fc-muted' }, m.blurb),
        h('div', { class: 'fc-row-inline' }, ports.length ? sel : h('small', { class: 'fc-muted' }, 'None of your ports can berth it'), h('button', { class: 'fc-btn primary', disabled: !ports.length || !g.corp.canAfford('shipping', m.price), onclick: () => { say(Lg.buyShip(id, sel.value)); refresh(); } }, `Buy · ${num(m.price)}`))));
    }
    wrap.append(grid);
    return wrap;
  };

  const yardSheet = () => shipyardSheet(ui, FC.yard, say, refresh);

  const ledgerSheet = () => {
    const L = Lg.state.ledger;
    const days = [...L.days].reverse().slice(-14);
    const c = h('canvas', { width: 1200, height: 260, class: 'fc-chart' });
    const x = c.getContext('2d');
    const max = Math.max(1, ...days.map((d) => Math.max(d.revenue, d.expenses)));
    const bw = 1200 / 14;
    days.forEach((d, i) => {
      x.fillStyle = 'rgba(74,222,154,0.85)';
      x.fillRect(i * bw + bw * 0.12, 230 - (d.revenue / max) * 200, bw * 0.36, (d.revenue / max) * 200);
      x.fillStyle = 'rgba(255,120,120,0.8)';
      x.fillRect(i * bw + bw * 0.52, 230 - (d.expenses / max) * 200, bw * 0.36, (d.expenses / max) * 200);
      x.fillStyle = '#8fb3cf'; x.font = '20px system-ui'; x.textAlign = 'center';
      x.fillText(`D${d.day}`, i * bw + bw / 2, 255);
    });
    const tile = (k, val, cls = '') => h('div', { class: `fc-kpi ${cls}` }, h('small', {}, k), h('b', {}, val));
    const fin = Lg.contracts(['delivered', 'failed', 'lost']).slice(-6).reverse();
    return h('div', {},
      h('div', { class: 'fc-kpis' }, tile('Earned', num(L.revenue), 'pos'), tile('Spent', num(L.expenses), 'neg'), tile('Net', num(L.revenue - L.expenses), L.revenue - L.expenses >= 0 ? 'pos' : 'neg'), tile('Upkeep / day', num(Lg.dailyUpkeep()))),
      h('div', { class: 'fc-sec' }, h('h4', {}, 'Last two weeks — in (green) and out (red)'), c),
      h('div', { class: 'fc-two' },
        h('div', { class: 'fc-sec' }, h('h4', {}, 'Reports'), h('div', { class: 'fc-log tall' }, ...Lg.state.reports.slice(0, 40).map((r) => h('div', {}, h('i', {}, Lg.when(r.at)), ' ', r.text)))),
        h('div', { class: 'fc-sec' }, h('h4', {}, 'Recent contracts'), ...fin.map((cc) => h('div', { class: 'fc-log' }, `${cc.status === 'delivered' ? '✅' : '✖'} ${Lg.cfg.contractTypes[cc.type].name} → ${Lg.port(cc.to).name}${cc.result?.paid ? ` · ${num(cc.result.paid)}` : ''}`)))));
  };

  // ---------------------------------------------------------------- refresh
  const refresh = () => {
    renderTop();
    renderRail();
    renderDrawer();
    renderSheet();
    renderFeed();
  };
  // first open: look at your fleet
  if (!FC.opened && Lg.owned) { FC.opened = true; const home = Lg.port(Lg.L.homePort); centreOn(home.lat - 10, home.lon + 10, 1.4); }
  if (FC.sel?.kind === 'port' && (opts.port || opts.ship)) { const p = Lg.port(FC.sel.id); centreOn(p.lat, p.lon, 2); }
  refresh();
  return { title: '', className: 'fleetcmd', onClose: () => { FC.ff = null; FC.sending = null; opts.onClose?.(); } };
}
