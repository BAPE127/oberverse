// Roost Aeroworks — Operations (v0.56.1; the aerospace terminal since v0.55.0).
// It takes the whole screen, like Fleet Command and the arms works' console:
// a live blueprint of your hangar floor in the middle — every bay drawing the
// aircraft, rocket or satellite that is in it, stage by stage, with its lamp
// board and its welders — and around it:
//
//   click a bay, the apron, the pad, the drawing office, the stores or the
//   inbound lane  → its card on the right (what's there, what it waits for)
//   the left rail  → full-screen pages: Tenders (the board and your sealed
//                    bids), Contracts, Supply (stores, your own ships, orders),
//                    Hangar (workforce, bays, facilities, research), Books,
//                    Meridian (and MRDN)
//   ⏩ / ⏭          → let time pass and watch the floor work (the real clock)
//
// Everything it shows comes from src/systems/aerospace.js; everything it does
// goes through that system's checked methods. Opened from the Roost office
// terminal, the tablet's Aerospace app and Billie; read-only (Meridian and
// MRDN only) from Meridian's share board.
import { h, mrdnScreen } from './panels.js';
import { fmtMoney, fmtDays } from '../aero/catalog.js';
import { stagesOf, failChance } from '../aero/pipeline.js';
import { optionEffect, configLabel, cleanConfig } from '../aero/config.js';
import { ACCOUNTS } from '../aero/books.js';
import { aircraftCanvas, rocketCanvas, satelliteCanvas } from '../engine/drawAero.js';

const MODES = [
  ['floor', '🏭', 'Floor'],
  ['tenders', '📋', 'Tenders'],
  ['contracts', '📑', 'Contracts'],
  ['supply', '📦', 'Supply'],
  ['hangar', '🏗', 'Hangar'],
  ['standing', '📣', 'Standing'],
  ['books', '📒', 'Books'],
  ['meridian', '📈', 'Meridian'],
];
/** The v0.55 tab names still open the right page (dialogue, the tablet, old callers). */
const OLD_TABS = { Dashboard: 'floor', Production: 'floor', Tenders: 'tenders', Contracts: 'contracts', Supply: 'supply', Facilities: 'hangar', Standing: 'standing', Books: 'books', Meridian: 'meridian' };
const LINE_ICON = { aircraft: '✈', rocket: '🚀', missile: '🛡', satellite: '🛰' };
const LINE_NAME = { aircraft: 'Aircraft', rocket: 'Launch vehicles', missile: 'Strategic', satellite: 'Satellites' };
const STATUS = { queued: 'Queued for a bay', waiting: 'Waiting for materials', blocked: 'Blocked', building: 'In production', engineering: 'In the drawing office', apron: 'On the apron', pad: 'On the pad', orbit: 'In orbit', storage: 'In secure storage', convoy: 'Secure convoy', delivered: 'Delivered', failed: 'Lost', cancelled: 'Cancelled' };
const PRIORITY = [['price', 'Price'], ['time', 'Delivery'], ['quality', 'Quality'], ['reputation', 'Reputation']];
const COL = { amber: '#ffb547', green: '#5ee08a', red: '#ff6b6b', blue: '#6fb4ff', dim: '#3a4356', ink: '#dfe9f5' };

/** The terminal's own state survives re-opening (the page, what's selected, the order form). */
const AO = { mode: 'floor', sel: null, filter: 'all', ff: null, mat: null, qty: 4, msg: null };

const money = (n) => `${Math.round(n).toLocaleString()} ◎`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const clamp01 = (f) => Math.max(0, Math.min(1, f || 0));
const hrs = (m) => { const x = m / 60; return x >= 36 ? `${(x / 24).toFixed(1)} days` : `${Math.max(1, Math.round(x))} h`; };

// ====================================================================== the sale sheet
/** Roost Aeroworks for sale (Billie's "I hear it's for sale", the sign by the office). */
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

// ====================================================================== pictures
/** A unit (or a finished product) as the bays draw it — from Aerospace.unitLook — or null without a DOM. */
function unitImage(look) {
  if (!look?.kind) return null;
  if (look.kind === 'aircraft') return aircraftCanvas(look.look, { livery: look.livery, build: look.build });
  if (look.kind === 'rocket' || look.kind === 'missile') return rocketCanvas(look.look, { lying: true, stages: look.stages, secure: look.kind === 'missile' });
  if (look.kind === 'stack') return rocketCanvas(look.look, { stages: 1 });
  if (look.kind === 'satellite') return satelliteCanvas(look.look, { panels: look.panels, bare: look.bare });
  return null;
}
/** A finished product, for the tender board and the contracts. */
function productLook(C, id) {
  const p = C.products[id];
  if (p.line === 'aircraft') return { kind: 'aircraft', look: p.look, livery: p.cls === 'fighter' || p.cls === 'bomber' ? (p.look.kind.includes('stealth') || p.look.kind === 'flyingwing' ? 'stealth' : 'military') : id === 'ap_skylark' ? 'roost' : null };
  if (p.line === 'rocket' || p.line === 'missile') return { kind: p.line, look: p.look, stages: 1 };
  return { kind: 'satellite', look: { mass: p.mass, role: p.role }, panels: true };
}
/** Draw an image to fit a box, crisp (pixel art), centred. Returns the drawn rect. */
function fitDraw(ctx, img, x, y, w, hh, maxScale = 6) {
  if (!img) return null;
  const s = Math.min(maxScale, w / img.width, hh / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x + (w - dw) / 2, y + (hh - dh) / 2, dw, dh);
  return { x: x + (w - dw) / 2, y: y + (hh - dh) / 2, w: dw, h: dh };
}
/** A small blueprint picture of a product or unit. */
function pic(look, w, hh, cls = 'ao-pic') {
  const c = h('canvas', { width: w * 2, height: hh * 2, class: cls, style: `width:${w}px;height:${hh}px` });
  const img = unitImage(look);
  if (img) fitDraw(c.getContext('2d'), img, 8, 8, w * 2 - 16, hh * 2 - 16);
  return c;
}

// ====================================================================== the panel
export function aerospacePanel(ui, body, opts = {}) {
  const g = ui.game;
  const A = g.aero;
  const C = A.cfg;
  const readonly = Boolean(opts.readonly) || !A.owned;
  if (opts.tab) AO.mode = OLD_TABS[opts.tab] || AO.mode;
  if (opts.mode) AO.mode = opts.mode;
  if (readonly) AO.mode = 'meridian';
  const co = () => A.roost;
  body.classList.add('ao');

  const canvas = h('canvas', { class: 'ao-canvas' });
  const top = h('div', { class: 'ao-top' });
  const rail = h('div', { class: 'ao-rail' });
  const drawer = h('div', { class: 'ao-drawer' });
  const sheet = h('div', { class: 'ao-sheet hidden' });
  const feed = h('div', { class: 'ao-feed' });
  const toast = h('div', { class: 'ao-toast hidden' });
  body.append(canvas, top, rail, drawer, sheet, feed, toast);
  const ctx = canvas.getContext('2d');

  const say = (r) => {
    if (!r?.text) return;
    ui.audio?.sfx?.(r.ok === false ? 'sfx_fail' : 'sfx_coin');
    toast.textContent = r.text;
    toast.className = `ao-toast ${r.ok === false ? 'bad' : 'good'}`;
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.add('hidden'), 4600);
  };
  /** Do something through the system, say what happened, redraw. */
  const act = (fn) => { const r = fn(); say(r); refresh(); return r; };
  const go = (mode, sel) => { AO.mode = mode; if (sel !== undefined) AO.sel = sel; ui.audio?.sfx?.('sfx_ui_click'); refresh(); };

  // ------------------------------------------------------------------ what's where on the floor
  const unitOf = (id) => (id ? A.state.units[id] : null);
  const inBay = () => new Set(co().bays.map((b) => b.unit).filter(Boolean));
  const officeUnits = () => { const b = inBay(); return A.unitsOf(co()).filter((u) => !b.has(u.id) && ['queued', 'waiting', 'blocked', 'engineering'].includes(u.status)).sort((a, b2) => A.priority(a) - A.priority(b2)); };
  const apronUnits = () => A.unitsOf(co()).filter((u) => u.status === 'apron');
  const padUnit = () => unitOf(co().pad?.unit) || A.unitsOf(co()).find((u) => u.status === 'pad' || (u.line === 'rocket' && A.stageOf(u)?.wait === 'pad'));
  const customerOf = (u) => (u.contract ? C.customers[A.contract(u.contract)?.customer]?.name : null);

  // ================================================================== the floor (canvas)
  let hits = [];
  let hover = null;
  const drawFloor = (t) => {
    const k = window.devicePixelRatio || 1;
    const bw = Math.round(canvas.clientWidth * k);
    const bh = Math.round(canvas.clientHeight * k);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const W = canvas.width;
    const H = canvas.height;
    // the blueprint
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.42, H * 0.45, 0, W * 0.42, H * 0.45, Math.max(W, H) * 0.7);
    glow.addColorStop(0, 'rgba(40,70,120,0.28)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24 * k) { ctx.strokeStyle = Math.round(x / (24 * k)) % 5 ? 'rgba(120,170,255,0.045)' : 'rgba(120,170,255,0.09)'; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 24 * k) { ctx.strokeStyle = Math.round(y / (24 * k)) % 5 ? 'rgba(120,170,255,0.045)' : 'rgba(120,170,255,0.09)'; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    hits = [];
    if (readonly || AO.mode !== 'floor') return;
    // the floor fills the space the rail, the card and the log leave (they move on a narrow screen)
    const cb = canvas.getBoundingClientRect();
    const rr = rail.getBoundingClientRect();
    const dr = drawer.getBoundingClientRect();
    const across = rr.width > rr.height;
    const below = dr.top - cb.top > cb.height * 0.35;
    const x0 = (across ? 12 : rr.right - cb.left + 16) * k;
    const x1 = (below ? cb.width - 12 : dr.left - cb.left - 14) * k;
    const y0 = (across ? rr.bottom - cb.top + 10 : 76) * k;
    const y1 = (below ? dr.top - cb.top - 10 : cb.height - 58) * k;
    if (x1 - x0 < 200 * k || y1 - y0 < 160 * k) return;
    text('HANGAR FLOOR', x0, y0 + 6 * k, COL.amber, 11, { spacing: 3, weight: 700 });
    text(`Roost Aeroworks · Starling Flats · ${plural(co().bays.length, 'bay')} · ${co().workforce} technicians (${Math.round(A.staffing(co()) * 100)}% staffed) · experience ${Math.round(co().experience)}`, x0 + 128 * k, y0 + 6 * k, 'rgba(223,233,245,0.6)', 11);
    const gap = 12 * k;
    const stripH = Math.min(150 * k, (y1 - y0) * 0.3);
    const by0 = y0 + 22 * k;
    const by1 = y1 - stripH - gap;
    // the bays, in the best grid for the space
    const bays = co().bays;
    const n = Math.max(1, bays.length);
    let best = null;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      const cw = (x1 - x0 - (c - 1) * gap) / c;
      const ch = (by1 - by0 - (r - 1) * gap) / r;
      const score = Math.min(cw, ch * 1.6);
      if (!best || score > best.score) best = { c, r, cw: Math.min(cw, ch * 2.4), ch, score };
    }
    bays.forEach((b, i) => {
      const cx = x0 + (i % best.c) * (best.cw + gap);
      const cy = by0 + Math.floor(i / best.c) * (best.ch + gap);
      drawBay(b, i, cx, cy, best.cw, best.ch, t, k);
    });
    // the strip: office, apron, pad, stores, inbound
    const tiles = ['office', 'apron', 'pad', 'stores', 'inbound'];
    const tw = (x1 - x0 - gap * (tiles.length - 1)) / tiles.length;
    tiles.forEach((id, i) => drawTile(id, x0 + i * (tw + gap), y1 - stripH, tw, stripH, t, k));
  };

  const text = (s, x, y, colour, px, o = {}) => {
    const k = window.devicePixelRatio || 1;
    ctx.font = `${o.weight || 500} ${px * k}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${o.spacing * k}px`;
    let str = String(s);
    if (o.max) { while (str.length > 3 && ctx.measureText(str).width > o.max) str = `${str.slice(0, -2)}…`; }
    ctx.fillStyle = colour;
    ctx.fillText(str, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  };
  const box = (x, y, w, hh, r, fill, stroke, dash) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r); else ctx.rect(x, y, w, hh);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.setLineDash(dash || []); ctx.strokeStyle = stroke; ctx.stroke(); ctx.setLineDash([]); }
  };
  const isSel = (kind, id) => AO.sel?.kind === kind && (id === undefined || AO.sel.id === id);
  const isHover = (kind, id) => hover?.kind === kind && (id === undefined || hover.id === id);
  const lamps = (x, y, n, i, t, k, size = 5) => {
    for (let s = 0; s < n; s++) {
      const on = s < i ? COL.green : s === i ? (Math.sin(t * 5) > -0.2 ? COL.amber : '#7a5a20') : COL.dim;
      ctx.fillStyle = on;
      ctx.fillRect(x + s * (size + 3) * k, y, size * k, size * k);
    }
  };
  const progress = (x, y, w, f, colour, k) => {
    box(x, y, w, 4 * k, 2 * k, 'rgba(255,255,255,0.08)');
    if (f > 0) box(x, y, Math.max(4 * k, w * clamp01(f)), 4 * k, 2 * k, colour);
  };

  const drawBay = (b, i, x, y, w, hh, t, k) => {
    const sel = isSel('bay', b.id);
    const hov = isHover('bay', b.id);
    const u = unitOf(b.unit);
    const building = b.ready > A.now;
    box(x, y, w, hh, 10 * k, sel ? 'rgba(40,52,74,0.96)' : 'rgba(14,22,36,0.94)', sel ? COL.amber : hov ? 'rgba(255,181,71,0.6)' : 'rgba(255,181,71,0.22)');
    ctx.lineWidth = sel ? 2 * k : 1;
    // hazard ticks in the corners
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + hh, 1, -1], [x + w, y + hh, -1, -1]]) {
      for (let s = 0; s < 3; s++) { ctx.fillStyle = s % 2 ? '#1a1a20' : 'rgba(255,181,71,0.75)'; ctx.fillRect(cx + sx * (8 + s * 6) * k - (sx < 0 ? 6 * k : 0), cy + sy * 6 * k - (sy < 0 ? 3 * k : 0), 6 * k, 3 * k); }
    }
    const pad = 12 * k;
    const hall = b.slot ? A.hallOfSlot(b.slot) : null;
    text(`BAY ${i + 1} · ${C.bays[b.type].name.toUpperCase()}${hall ? ` · ${hall.short.toUpperCase()}` : ''}`, x + pad, y + 18 * k, 'rgba(255,181,71,0.9)', 10.5, { spacing: 1.5, weight: 700, max: w - pad * 2 - 90 * k });
    const chip = building ? ['BUILDING', COL.blue] : !u ? ['IDLE', 'rgba(223,233,245,0.45)'] : u.status === 'building' ? ['WORKING', COL.green] : [STATUS[u.status]?.toUpperCase() || u.status.toUpperCase(), u.status === 'blocked' ? COL.red : COL.amber];
    text(chip[0], x + w - pad, y + 18 * k, chip[1], 10, { align: 'right', weight: 700, spacing: 1 });
    hits.push({ kind: 'bay', id: b.id, x, y, w, h: hh });
    const artY = y + 30 * k;
    const artH = hh - 30 * k - 62 * k;
    if (building) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 4 * k, artY, w - 8 * k, artH); ctx.clip();
      ctx.strokeStyle = 'rgba(111,180,255,0.16)'; ctx.lineWidth = 6 * k;
      for (let s = -hh; s < w + hh; s += 22 * k) { ctx.beginPath(); ctx.moveTo(x + s, artY + artH); ctx.lineTo(x + s + artH, artY); ctx.stroke(); }
      ctx.restore();
      text('UNDER CONSTRUCTION', x + w / 2, artY + artH / 2 - 8 * k, COL.blue, 13, { align: 'center', weight: 700, spacing: 2 });
      text(`ready ${A.when(b.ready)}`, x + w / 2, artY + artH / 2 + 12 * k, 'rgba(223,233,245,0.65)', 11, { align: 'center' });
      return;
    }
    if (!u) {
      // idle jigs
      const jx = x + w / 2;
      const jy = artY + artH / 2;
      box(jx - w * 0.3, jy - artH * 0.32, w * 0.6, artH * 0.64, 8 * k, null, 'rgba(223,233,245,0.16)', [6 * k, 6 * k]);
      text('IDLE', jx, jy - 6 * k, 'rgba(223,233,245,0.35)', 18, { align: 'center', weight: 800, spacing: 6 });
      const next = officeUnits().find((x2) => C.products[x2.product].bay === b.type);
      text(next ? `next: ${C.products[next.product].name} #${next.n} — ${next.blocker?.text || STATUS[next.status]}` : 'nothing waiting for this bay', jx, jy + 18 * k, 'rgba(223,233,245,0.5)', 11, { align: 'center', max: w - pad * 2 });
      text(`${C.bays[b.type].crew} crew · ${money(C.bays[b.type].upkeep)}/day, busy or not`, x + pad, y + hh - 16 * k, 'rgba(223,233,245,0.4)', 10.5, { max: w - pad * 2 });
      return;
    }
    const look = A.unitLook(u);
    const img = unitImage(look);
    // the work light, then the unit
    const lg = ctx.createRadialGradient(x + w / 2, artY + artH / 2, 0, x + w / 2, artY + artH / 2, Math.max(w, artH) * 0.55);
    lg.addColorStop(0, 'rgba(255,220,160,0.10)');
    lg.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x + 2, artY, w - 4, artH);
    const r = fitDraw(ctx, img, x + pad, artY + 4 * k, w - pad * 2, artH - 8 * k, 4 * k);
    if (look.kind === 'missile' && r) {
      box(r.x + r.w * 0.06, r.y - r.h * 0.2, r.w * 0.88, r.h * 1.4, 4 * k, 'rgba(74,90,58,0.94)', 'rgba(140,160,110,0.5)');
      text('SECURE · AUTHORISED STAFF ONLY', r.x + r.w / 2, r.y + r.h / 2, 'rgba(230,240,200,0.75)', 10, { align: 'center', weight: 700, spacing: 1 });
    }
    // welders at work
    if (u.status === 'building' && r) {
      for (let s = 0; s < 4; s++) {
        if (Math.sin(t * 17 + s * 7.3) < 0.35) continue;
        const sx = r.x + r.w * (0.25 + 0.5 * ((Math.sin(t * 0.7 + s * 2.1) + 1) / 2));
        const sy = r.y + r.h * (0.2 + 0.6 * ((Math.cos(t * 0.5 + s * 1.7) + 1) / 2));
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9 * k);
        sg.addColorStop(0, 'rgba(255,250,220,0.95)'); sg.addColorStop(0.3, 'rgba(120,200,255,0.55)'); sg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 9 * k, 0, Math.PI * 2); ctx.fill();
      }
    }
    // the label, the stage, the lamp board
    const st = A.stageOf(u);
    const ly = y + hh - 56 * k;
    text(`${C.products[u.product].name} #${u.n}`, x + pad, ly, '#fff', 13, { weight: 700, max: w * 0.62 });
    const who = customerOf(u);
    text(who || 'our own launcher', x + w - pad, ly, 'rgba(223,233,245,0.55)', 11, { align: 'right', max: w * 0.36 });
    text(u.blocker && u.status !== 'building' ? `⚠ ${u.blocker.text}` : st?.name || '', x + pad, ly + 17 * k, u.blocker && u.status !== 'building' ? (u.status === 'blocked' ? COL.red : COL.amber) : 'rgba(223,233,245,0.75)', 11, { max: w - pad * 2 });
    progress(x + pad, ly + 30 * k, w - pad * 2 - 70 * k, u.need ? u.work / u.need : 0, u.status === 'building' ? COL.amber : '#7a6a40', k);
    text(`${fmtDays(A.unitDaysLeft(u))} left`, x + w - pad, ly + 32 * k, 'rgba(223,233,245,0.6)', 10.5, { align: 'right' });
    lamps(x + pad, ly + 41 * k, look.stagesTotal, look.stageIndex, t, k, Math.max(3, Math.min(6, (w - pad * 2) / k / look.stagesTotal - 3)));
  };

  const drawTile = (id, x, y, w, hh, t, k) => {
    const sel = isSel(id);
    const hov = isHover(id);
    box(x, y, w, hh, 10 * k, sel ? 'rgba(40,52,74,0.96)' : 'rgba(14,22,36,0.92)', sel ? COL.amber : hov ? 'rgba(255,181,71,0.6)' : 'rgba(120,170,255,0.18)');
    hits.push({ kind: id, x, y, w, h: hh });
    const pad = 12 * k;
    const title = (s, colour = 'rgba(255,181,71,0.9)') => text(s, x + pad, y + 17 * k, colour, 10.5, { spacing: 1.5, weight: 700, max: w - pad * 2 });
    const big = (s, colour = '#fff') => text(s, x + pad, y + 42 * k, colour, 20, { weight: 700, max: w - pad * 2 });
    const small = (s, row, colour = 'rgba(223,233,245,0.6)') => text(s, x + pad, y + (62 + row * 15) * k, colour, 11, { max: w - pad * 2 });
    const c = co();
    if (id === 'office') {
      const list = officeUnits();
      title('QUEUE · OFFICE');
      big(String(list.length));
      list.slice(0, Math.floor((hh / k - 60) / 15)).forEach((u, i) => small(`${LINE_ICON[u.line]} ${C.products[u.product].name} #${u.n} · ${u.status === 'engineering' ? 'engineering' : u.blocker?.text || STATUS[u.status]}`, i, u.status === 'blocked' ? COL.red : 'rgba(223,233,245,0.6)'));
      if (!list.length) small('Nothing waiting. Win a tender.', 0);
    } else if (id === 'apron') {
      const used = A.apronUsed(c);
      title(`APRON · ${used}/${c.apron} STANDS`);
      const units = apronUnits();
      const sw = (w - pad * 2 - (c.apron - 1) * 6 * k) / Math.max(1, c.apron);
      const sh = hh - 40 * k;
      let slot = 0;
      for (let s = 0; s < c.apron; s++) {
        const sx = x + pad + s * (sw + 6 * k);
        box(sx, y + 30 * k, sw, sh - 4 * k, 6 * k, 'rgba(255,255,255,0.03)', 'rgba(255,214,90,0.35)', [4 * k, 4 * k]);
        text(String(s + 1), sx + 6 * k, y + 40 * k, 'rgba(255,214,90,0.5)', 9.5, { weight: 700 });
      }
      for (const u of units) {
        const size = C.products[u.product].apron || 1;
        const sx = x + pad + slot * (sw + 6 * k);
        fitDraw(ctx, unitImage(A.unitLook(u)), sx + 4 * k, y + 34 * k, sw * size + 6 * k * (size - 1) - 8 * k, sh - 12 * k, 3 * k);
        slot += size;
      }
      if (!units.length) text('empty', x + w / 2, y + 30 * k + sh / 2, 'rgba(223,233,245,0.3)', 11, { align: 'center' });
    } else if (id === 'pad') {
      const u = padUnit();
      title('LAUNCH PAD', c.pad ? 'rgba(255,181,71,0.9)' : 'rgba(223,233,245,0.45)');
      if (!c.pad) {
        big(c.building?.pad ? 'building' : 'not built', 'rgba(223,233,245,0.45)');
        small(c.building?.pad ? `ready ${A.when(c.building.pad)}` : 'Pad 2 is surveyed and waiting.', 0);
        small(c.building?.pad ? '' : `${fmtMoney(C.facilities.pad.build)} to build`, 1);
      } else if (u) {
        const img = rocketCanvas(C.products[u.product].look, { stages: 1 });
        fitDraw(ctx, img, x + w * 0.55, y + 22 * k, w * 0.4, hh - 30 * k, 3 * k);
        small(`${C.products[u.product].name} #${u.n}`, 0, '#fff');
        small(A.stageOf(u)?.name || '', 1);
        if (Math.sin(t * 3) > 0) { ctx.fillStyle = 'rgba(230,240,255,0.25)'; ctx.beginPath(); ctx.arc(x + w * 0.75, y + hh - 18 * k, 12 * k, 0, Math.PI * 2); ctx.fill(); }
      } else { big('clear', 'rgba(223,233,245,0.55)'); small(c.pad.readyAt > A.now ? `refurbishing until ${A.when(c.pad.readyAt)}` : 'ready for the next launch', 1); }
    } else if (id === 'stores') {
      const rows = Object.values(c.inv || {});
      const qty = rows.reduce((a, r) => a + r.qty, 0);
      const res = rows.reduce((a, r) => a + r.reserved, 0);
      const short = A.shortfalls(c);
      title('STORES');
      big(fmtMoney(c.books.inventoryValue));
      small(`${qty} lots in stores · ${res} reserved`, 0);
      progress(x + pad, y + 72 * k, w - pad * 2, qty ? res / qty : 0, COL.blue, k);
      small(short.length ? `⚠ ${short.length} material${short.length === 1 ? '' : 's'} short` : 'nothing short', 1.6, short.length ? COL.red : COL.green);
    } else if (id === 'inbound') {
      const pos = A.ordersOf(c);
      const sea = A.jobs(c, true).filter((j) => ['loading', 'at sea'].includes(j.status));
      const next = pos.reduce((m, p) => Math.min(m, p.arrive || Infinity), Infinity);
      title('INBOUND');
      big(String(pos.length));
      small(`order${pos.length === 1 ? '' : 's'} on the way${sea.length ? ` · ${sea.length} in your ships` : ''}`, 0);
      small(Number.isFinite(next) ? `next: ${A.when(next)}` : 'nothing on order', 1);
      // the road up the Cut, with the trucks on it
      const ry = y + hh - 16 * k;
      ctx.strokeStyle = 'rgba(223,233,245,0.18)'; ctx.setLineDash([6 * k, 6 * k]); ctx.beginPath(); ctx.moveTo(x + pad, ry); ctx.lineTo(x + w - pad, ry); ctx.stroke(); ctx.setLineDash([]);
      pos.slice(0, 6).forEach((p, i) => {
        const f = p.placed && p.arrive > p.placed ? clamp01((A.now - p.placed) / (p.arrive - p.placed)) : 0.5;
        const tx = x + pad + (w - pad * 2) * f;
        ctx.fillStyle = p.mode === 'internal' ? COL.blue : p.mode === 'truck' ? COL.green : COL.amber;
        ctx.fillRect(tx - 5 * k, ry - 4 * k - (i % 2) * 2 * k, 10 * k, 6 * k);
      });
    }
  };

  // ------------------------------------------------------------------ the live loop and fast-forward
  let lastUi = 0;
  const loop = (ms) => {
    if (!canvas.isConnected) { AO.ff = null; return; }
    if (AO.ff) {
      const left = AO.ff.until - g.clock.total;
      if (left <= 0) { AO.ff = null; refresh(); } else g.skipTime(Math.min(left, Math.max(4, Math.ceil(left / 50))));
    }
    drawFloor(ms / 1000);
    if (AO.ff && ms - lastUi > 450) { lastUi = ms; renderTop(); renderFeed(); if (AO.mode === 'floor') renderDrawer(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const local = (e) => { const b = canvas.getBoundingClientRect(); const k = window.devicePixelRatio || 1; return { x: (e.clientX - b.left) * k, y: (e.clientY - b.top) * k }; };
  const hitAt = (p) => hits.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) || null;
  canvas.addEventListener('mousemove', (e) => { hover = hitAt(local(e)); canvas.style.cursor = hover ? 'pointer' : 'default'; });
  canvas.addEventListener('mouseleave', () => { hover = null; });
  canvas.addEventListener('click', (e) => {
    const k2 = hitAt(local(e));
    AO.sel = k2 ? { kind: k2.kind, id: k2.id } : null;
    ui.audio?.sfx?.('sfx_ui_click');
    renderDrawer();
  });
  const keys = (e) => {
    if (!canvas.isConnected) { window.removeEventListener('keydown', keys, true); return; }
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') return;
    if (e.key === 'Escape' && !readonly && (AO.mode !== 'floor' || AO.sel)) {
      e.stopImmediatePropagation();
      if (AO.mode !== 'floor') AO.mode = 'floor'; else AO.sel = null;
      refresh();
    } else if (!readonly && /^[1-8]$/.test(e.key)) {
      e.stopImmediatePropagation();
      go(MODES[Number(e.key) - 1][0]);
    }
  };
  window.addEventListener('keydown', keys, true);

  // ================================================================== chrome
  const renderTop = () => {
    const c = co();
    const today = c ? A.statement(c, 1) : null;
    const ff = (mins) => { AO.ff = { until: g.clock.total + mins }; refresh(); };
    const toMorning = (() => { const m = g.clock.total % 1440; const six = 6 * 60; return (m < six ? six - m : 1440 - m + six) + 1; })();
    top.replaceChildren(
      h('div', { class: 'ao-brand' }, h('b', {}, readonly ? '◆ MERIDIAN AEROSPACE' : '✈ ROOST AEROWORKS'), h('span', {}, readonly ? 'MRDN · INVESTOR BOARD' : 'OPERATIONS')),
      h('div', { class: 'ao-time' },
        h('div', { class: 'ao-clock' }, `${g.clock.weekday} · Day ${g.clock.day} · ${g.clock.timeString}`),
        !readonly ? h('div', { class: 'ao-ff' },
          AO.ff ? h('button', { class: 'ao-btn on', onclick: () => { AO.ff = null; refresh(); } }, '⏸ Stop') : null,
          !AO.ff ? h('button', { class: 'ao-btn', title: 'Let an hour pass', onclick: () => ff(60) }, '⏩ 1 h') : null,
          !AO.ff ? h('button', { class: 'ao-btn', title: 'Let six hours pass', onclick: () => ff(360) }, '⏩ 6 h') : null,
          !AO.ff ? h('button', { class: 'ao-btn primary', title: 'Let time pass until 06:00, when tenders are posted and decided', onclick: () => ff(toMorning) }, `⏭ Next morning (${hrs(toMorning)})`) : null) : null),
      h('div', { class: 'ao-money' }, h('b', {}, money(g.player.money)), today ? h('span', { class: today.profit < 0 ? 'neg' : 'pos' }, `today ${today.profit >= 0 ? '+' : ''}${fmtMoney(today.profit)}`) : null),
      h('button', { class: 'ao-close', title: 'Close (Esc)', onclick: () => ui.closePanel() }, '✕'));
  };

  const renderRail = () => {
    rail.replaceChildren(...MODES.map(([id, icon, name], i) => h('button', { class: `ao-rail-btn${AO.mode === id ? ' on' : ''}`, title: `${name} (${i + 1})`, disabled: readonly && id !== 'meridian', onclick: () => go(id) },
      h('span', { class: 'ic' }, icon), h('span', {}, name), badge(id))));
  };
  /** A count on a rail button: something there wants you. */
  const badge = (id) => {
    if (readonly) return null;
    const c = co();
    let n = 0;
    let bad = false;
    if (id === 'tenders') n = A.openTenders().filter((t) => !t.bids.some((b) => b.company === c.id) && A.bidQuote(c.id, t.id).ok).length;
    else if (id === 'contracts') { n = A.contractsOf(c, 'active').filter((x) => x.due < A.now).length; bad = n > 0; }
    else if (id === 'supply') { n = A.shortfalls(c).length; bad = n > 0; }
    else if (id === 'standing') { n = (c.events || []).filter((e) => !e.resolved).length + (c.offers || []).filter((o) => o.until >= A.day).length; bad = (c.events || []).some((e) => !e.resolved); }
    return n ? h('em', { class: `ao-badge${bad ? ' bad' : ''}` }, String(n)) : null;
  };

  const renderFeed = () => {
    const r = A.state.reports.filter((x) => readonly ? true : x.company === 'roost').slice(0, 3);
    feed.replaceChildren(...[h('span', { class: 'ao-feed-label' }, 'LOG'), ...r.map((x) => h('span', { class: 'ao-feed-item' }, h('i', {}, A.when(x.at).replace('Day ', 'D')), ' ', x.text)),
      readonly ? null : h('button', { class: 'ao-link', onclick: () => go('books') }, 'All reports ›')].filter(Boolean));
  };

  // ================================================================== shared bits
  const section = (title, ...kids) => h('div', { class: 'ao-sec' }, h('h4', {}, title), ...kids);
  const kpi = (label, value, cls = '', sub = null) => h('div', { class: `ao-kpi ${cls}` }, h('small', {}, label), h('b', {}, value), sub ? h('span', {}, sub) : null);
  const bar = (label, f, colour, txt) => h('div', { class: 'ao-bar' }, h('span', {}, label), h('div', { class: 'ao-bar-track' }, h('i', { style: `width:${Math.round(clamp01(f) * 100)}%;background:${colour}` })), h('em', {}, txt));
  const pill = (txt, colour) => h('span', { class: 'ao-pill', style: `border-color:${colour};color:${colour}` }, txt);
  const muted = (txt) => h('p', { class: 'ao-muted' }, txt);
  const btn = (label, onclick, cls = '', disabled = false, title = null) => h('button', { class: `ao-btn ${cls}`, onclick, disabled, title }, label);
  const stageStrip = (u) => {
    const st = stagesOf(C, C.products[u.product]);
    return h('div', { class: 'ao-strip', title: st.map((s, i) => `${i < u.stage ? '✓' : i === u.stage ? '▶' : '·'} ${s.name}`).join('\n') },
      ...st.map((s, i) => h('i', { class: i < u.stage ? 'done' : i === u.stage ? `now${u.status === 'blocked' ? ' bad' : u.status === 'building' ? '' : ' wait'}` : '', style: i === u.stage && u.need ? `--f:${Math.round(clamp01(u.work / u.need) * 100)}%` : '' })));
  };

  /** What a tender, contract or unit is configured as: each option with what it costs, and what it does to the aircraft. */
  const configRow = (x, { compact = false } = {}) => {
    const cfg = cleanConfig(x.config);
    if (!Object.keys(cfg).length) return compact ? null : h('small', { class: 'ao-muted' }, 'Standard configuration');
    const base = C.products[x.product];
    const P = A.pOf(x);
    const have = new Set(co()?.research || []);
    const chips = Object.entries(cfg).map(([g, ch]) => {
      const o = C.options.groups[g].choices[ch];
      const fx = optionEffect(C, base, g, ch, x.product);
      const miss = o.needs && !have.has(o.needs);
      return h('span', { class: `ao-opt${miss ? ' bad' : ''}`, title: o.text }, h('b', {}, o.name), h('em', {}, `${fx.price ? `+${fmtMoney(fx.price)}` : ''}${fx.days ? ` · +${fx.days} d` : ''}${fx.quality ? ` · quality +${fx.quality}` : ''}${miss ? ` · needs ${C.research[o.needs].name}` : ''}`));
    });
    const bits = [];
    if (base.spec && P.spec) for (const [k, label, unit] of [['seats', 'seats', ''], ['range', 'range', ' km'], ['payload', 'payload', ' kg']]) if (base.spec[k] !== P.spec[k]) bits.push(`${label} ${Math.round(base.spec[k]).toLocaleString()} → ${Math.round(P.spec[k]).toLocaleString()}${unit}`);
    if (P.effects?.life) bits.push(`${Math.round(P.life / 30)} months in service`);
    if (P.effects?.launchRisk) bits.push(`${Math.round((1 - P.effects.launchRisk) * 100)}% less launch risk`);
    if (P.effects?.commissionRisk) bits.push(`${Math.round((1 - P.effects.commissionRisk) * 100)}% less commissioning risk`);
    if (P.effects?.service) bits.push(`+${Math.round((P.effects.service - 1) * 100)}% service income`);
    return h('div', { class: 'ao-config' }, ...chips, bits.length ? h('small', { class: 'ao-muted' }, bits.join(' · ')) : null);
  };

  // ================================================================== the drawer (floor)
  const renderDrawer = () => {
    drawer.classList.toggle('hidden', readonly || AO.mode !== 'floor');
    if (readonly || AO.mode !== 'floor') return;
    const s = AO.sel;
    let kids;
    if (s?.kind === 'bay') { const b = co().bays.find((x) => x.id === s.id); const u = b && unitOf(b.unit); kids = u ? unitView(u, b) : bayView(b); }
    else if (s?.kind === 'unit' && unitOf(s.id)) kids = unitView(unitOf(s.id));
    else if (s?.kind === 'office') kids = officeView();
    else if (s?.kind === 'apron') kids = apronView();
    else if (s?.kind === 'pad') kids = padView();
    else if (s?.kind === 'stores') kids = storesView();
    else if (s?.kind === 'inbound') kids = inboundView();
    else kids = homeView();
    const back = s ? h('button', { class: 'ao-link', onclick: () => { AO.sel = null; renderDrawer(); } }, '‹ Overview') : null;
    drawer.replaceChildren(...[back, ...kids].filter(Boolean));
  };

  const homeView = () => {
    const c = co();
    const week = A.statement(c, 7);
    const active = A.contractsOf(c, 'active');
    const backlog = active.reduce((a, x) => a + (x.qty - x.delivered - x.failed) * x.unitPrice, 0);
    const late = active.filter((x) => x.due < A.now);
    const blocked = A.unitsOf(c).filter((u) => u.status === 'blocked');
    const short = A.shortfalls(c);
    const crew = A.crewNeeded(c, { all: true });
    const alerts = [];
    for (const e of (c.events || []).filter((x) => !x.resolved)) alerts.push(h('button', { class: 'ao-alert bad', onclick: () => go('standing') }, `🔍 ${e.title} — decide by Day ${e.expires} ›`));
    for (const o of (c.offers || []).filter((x) => x.until >= A.day)) alerts.push(h('button', { class: 'ao-alert', onclick: () => go('hangar') }, `🏗 ${Math.round(o.pct * 100)}% off the ${C.halls[o.hall].name} until Day ${o.until} — ${o.reason} ›`));
    for (const x of late) alerts.push(h('button', { class: 'ao-alert bad', onclick: () => go('contracts') }, `⏰ ${x.qty} × ${C.products[x.product].name} for ${C.customers[x.customer].name} is late — ${Math.round(A.A.latePerDay * 100)}% a day withheld ›`));
    for (const u of blocked.slice(0, 3)) alerts.push(h('button', { class: 'ao-alert bad', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, `⚠ ${C.products[u.product].name} #${u.n}: ${u.blocker?.text || 'blocked'} ›`));
    if (short.length) alerts.push(h('button', { class: 'ao-alert', onclick: () => go('supply') }, `📦 ${plural(short.length, 'material')} short for the work in hand${c.autoProcure ? '' : ' (automatic ordering is off)'} ›`));
    if (c.workforce < crew) alerts.push(h('button', { class: 'ao-alert', onclick: () => go('hangar') }, `👷 ${crew - c.workforce} technicians short — every bay is slower ›`));
    if (c.engineers < A.staffNeeded(c, 'engineer')) alerts.push(h('button', { class: 'ao-alert', onclick: () => go('hangar') }, `📐 ${A.staffNeeded(c, 'engineer') - c.engineers} engineers short — the drawing office and research are slower ›`));
    if (c.inspectors < A.staffNeeded(c, 'inspector')) alerts.push(h('button', { class: 'ao-alert', onclick: () => go('hangar') }, `🔍 ${A.staffNeeded(c, 'inspector') - c.inspectors} inspectors short — inspections are slower and more get through ›`));
    const ops = A.openTenders().filter((t) => !t.bids.some((b) => b.company === c.id)).map((t) => ({ t, q: A.bidQuote(c.id, t.id) })).filter((x) => x.q.ok).sort((a, b) => b.q.profit - a.q.profit).slice(0, 3);
    const soon = A.unitsOf(c).filter((u) => u.contract).sort((a, b) => A.unitDaysLeft(a) - A.unitDaysLeft(b)).slice(0, 4);
    return [
      h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'GOOD MORNING, OWNER'), h('h2', {}, `${plural(A.unitsOf(c).length, 'unit')} in work · ${plural(active.length, 'contract')}`), muted('Click a bay, the apron or the stores on the floor plan. The rail on the left has the rest.')),
      h('div', { class: 'ao-kpis two' }, kpi('Profit, 7 days', fmtMoney(week.profit), week.profit >= 0 ? 'pos' : 'neg'), kpi('Order backlog', fmtMoney(backlog)), kpi('Reputation', `${Math.round(c.reputation)}`, '', '/ 100'), kpi('Quality', A.qualityOf(c).toFixed(1))),
      ...alerts,
      section('Tenders you can win', ...(ops.length ? ops.map(({ t, q }) => h('button', { class: 'ao-row', onclick: () => { AO.focus = t.id; go('tenders'); } }, pic(productLook(C, t.product), 64, 30), h('div', { class: 'grow' }, h('b', {}, `${t.qty} × ${C.products[t.product].name}`), h('small', {}, `${C.customers[t.customer].name} · decides Day ${t.closes}${t.config ? ` · ${configLabel(C, C.products[t.product], t.config).toLowerCase()}` : ''}`)), h('em', { class: 'pos' }, `+${fmtMoney(q.profit)}`))) : [muted('Nothing you can bid on right now. New tenders come in at 06:00.')])),
      section('Next out of the door', ...(soon.length ? soon.map((u) => h('button', { class: 'ao-row', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, h('div', { class: 'grow' }, h('b', {}, `${C.products[u.product].name} #${u.n}`), stageStrip(u)), h('small', {}, fmtDays(A.unitDaysLeft(u))))) : [muted('No units in work.')])),
      A.canShipInternal(c) ? section('Your own ships', h('div', { class: 'ao-kpis two' }, kpi('Saved so far', fmtMoney(A.shippingSavings(c).group), 'pos'), kpi('Consignments at sea', String(A.jobs(c).filter((j) => ['loading', 'at sea'].includes(j.status)).length)))) : null,
    ].filter(Boolean);
  };

  const unitView = (u, b = null) => {
    const p = C.products[u.product];
    const st = stagesOf(C, p);
    const look = A.unitLook(u);
    const ct = u.contract ? A.contract(u.contract) : null;
    const hero = h('canvas', { width: 760, height: 300, class: 'ao-hero-pic', style: 'width:100%;height:auto' });
    const img = unitImage(look);
    if (img) fitDraw(hero.getContext('2d'), img, 30, 20, 700, 260);
    const out = [
      hero,
      h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, `${LINE_NAME[p.line].toUpperCase()} · ${(p.cls || '').toUpperCase()}${b ? ` · BAY ${co().bays.indexOf(b) + 1}` : ''}`), h('h2', {}, `${p.name} #${u.n}`),
        h('div', { class: 'ao-pills' }, pill(STATUS[u.status] || u.status, u.status === 'blocked' ? COL.red : u.status === 'building' ? COL.green : COL.amber), ct ? pill(ct.due < A.now ? `${fmtDays((A.now - ct.due) / 1440)} late` : `due in ${fmtDays((ct.due - A.now) / 1440)}`, ct.due < A.now ? COL.red : COL.blue) : pill('our own launcher', COL.blue))),
      ct ? muted(`For ${C.customers[ct.customer].name} · ${money(ct.unitPrice)} on delivery`) : null,
      configRow(u, { compact: true }),
      u.blocker && u.status !== 'building' ? h('div', { class: `ao-alert${u.status === 'blocked' ? ' bad' : ''}` }, `⚠ ${u.blocker.text}`) : null,
      h('div', { class: 'ao-kpis two' }, kpi('Work left', fmtDays(A.unitDaysLeft(u))), kpi('Materials still to come', fmtMoney(A.unitCostLeft(u)))),
      section('Build', h('div', { class: 'ao-stages' }, ...st.map((s, i) => {
        const state = i < u.stage ? 'done' : i === u.stage ? 'now' : '';
        return h('div', { class: `ao-stage ${state}` }, h('i', {}, i < u.stage ? '✓' : i === u.stage ? '▶' : String(i + 1)),
          h('div', { class: 'grow' }, h('span', {}, s.name), i === u.stage && u.need ? h('div', { class: 'ao-bar-track' }, h('i', { style: `width:${Math.round(clamp01(u.work / u.need) * 100)}%;background:${COL.amber}` })) : null),
          h('small', {}, s.office ? 'office' : s.bay ? 'bay' : s.wait ? 'wait' : ''));
      }))),
      u.inspections.length ? section('Inspections', h('div', { class: 'ao-pills' }, ...u.inspections.map((x, i) => pill(`#${i + 1} ${x.pass ? 'pass' : 'FAIL'}`, x.pass ? COL.green : COL.red))), u.rework ? muted(`Rework: ${fmtDays(u.rework)}.`) : null) : null,
      ct ? btn('Open the contract ›', () => go('contracts'), '') : null,
    ];
    return out.filter(Boolean);
  };

  const bayView = (b) => {
    if (!b) return homeView();
    const T = C.bays[b.type];
    const next = officeUnits().filter((u) => C.products[u.product].bay === b.type);
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, `BAY ${co().bays.indexOf(b) + 1}`), h('h2', {}, T.name), muted(T.text)),
      b.ready > A.now ? h('div', { class: 'ao-alert' }, `🏗 Under construction — ready ${A.when(b.ready)}`) : h('div', { class: 'ao-alert' }, '◌ Idle. A unit moves in as soon as its materials are in stores.'),
      h('div', { class: 'ao-kpis two' }, kpi('Crew', String(T.crew)), kpi('Upkeep', `${fmtMoney(T.upkeep)}/day`)),
      section(`Waiting for this bay (${next.length})`, ...(next.length ? next.map((u) => h('button', { class: 'ao-row', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, h('div', { class: 'grow' }, h('b', {}, `${C.products[u.product].name} #${u.n}`), h('small', {}, u.blocker?.text || STATUS[u.status])), '›')) : [muted('Nothing. Win a tender for something this bay can build.')]))];
  };

  const officeView = () => {
    const list = officeUnits();
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'OFF THE FLOOR'), h('h2', {}, 'Drawing office & queue'), muted('Units being engineered, waiting for a bay of the right type, or waiting for their materials. Nobody holds a bay while waiting for parts.')),
      ...(list.length ? list.map((u) => h('button', { class: 'ao-row', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, h('div', { class: 'grow' }, h('b', {}, `${LINE_ICON[u.line]} ${C.products[u.product].name} #${u.n}`), h('small', { class: u.status === 'blocked' ? 'neg' : '' }, u.status === 'engineering' ? 'Engineering configuration & approval' : u.blocker?.text || STATUS[u.status]), stageStrip(u)), '›')) : [muted('Nothing queued.')])];
  };

  const apronView = () => {
    const c = co();
    const list = apronUnits();
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, `${A.apronUsed(c)} OF ${c.apron} STANDS`), h('h2', {}, 'The finished-aircraft apron'), muted(C.facilities.apron.text)),
      ...(list.length ? list.map((u) => h('button', { class: 'ao-row', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, pic(A.unitLook(u), 70, 40), h('div', { class: 'grow' }, h('b', {}, `${C.products[u.product].name} #${u.n}`), h('small', {}, `${customerOf(u) || ''} · ${u.blocker?.text || 'waiting for the customer\'s crew'}`)), '›')) : [muted('No aircraft waiting for their customers.')]),
      A.apronUsed(c) >= c.apron ? h('div', { class: 'ao-alert' }, '⚠ The apron is full: finished aircraft wait in their bays until a stand is free.') : null].filter(Boolean);
  };

  const padView = () => {
    const c = co();
    const u = padUnit();
    if (!c.pad) {
      const f = C.facilities.pad;
      return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'PAD 2 · SURVEYED SITE'), h('h2', {}, f.name), muted(f.text)),
        c.building?.pad ? h('div', { class: 'ao-alert' }, `🏗 Being built — ready ${A.when(c.building.pad)}`) : btn(`Build it · ${money(f.build)} · ${f.buildDays} days`, () => act(() => A.buildFacility(c, 'pad')), 'primary big', !A.canAfford(c, f.build))];
    }
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'LAUNCH COMPLEX'), h('h2', {}, 'Pad 2'), muted('One launch at a time; two days to refurbish after each.')),
      u ? h('button', { class: 'ao-row', onclick: () => { AO.sel = { kind: 'unit', id: u.id }; renderDrawer(); } }, h('div', { class: 'grow' }, h('b', {}, `${C.products[u.product].name} #${u.n}`), h('small', {}, A.stageOf(u)?.name || '')), '›') : muted(c.pad.readyAt > A.now ? `Refurbishing until ${A.when(c.pad.readyAt)}.` : 'Clear and ready.'),
      section('Launch record', h('div', { class: 'ao-kpis two' }, kpi('Launches', String(c.stats?.launches || 0)), kpi('Lost', String(c.stats?.launchFailures || 0), c.stats?.launchFailures ? 'neg' : '')))];
  };

  const storesView = () => {
    const c = co();
    const rows = materialRows(c).slice(0, 14);
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'STORES'), h('h2', {}, fmtMoney(c.books.inventoryValue)), muted('Materials in stores and on order, at cost. A unit\'s materials are reserved for it and used stage by stage.')),
      ...rows.map((x) => bar(C.materials[x.m].name, x.need ? (x.r.qty + x.onOrder) / x.need : 1, x.short ? COL.red : COL.green, `${x.r.qty}${x.onOrder ? ` +${x.onOrder}` : ''}/${x.need}`)),
      btn('Supply ›', () => go('supply'))];
  };

  const inboundView = () => {
    const c = co();
    const pos = A.ordersOf(c).sort((a, b) => a.arrive - b.arrive);
    return [h('div', { class: 'ao-hero' }, h('div', { class: 'ao-kicker' }, 'INBOUND'), h('h2', {}, plural(pos.length, 'order')), muted('Overseas goods land at Mill Road Docks and come up the Cut by truck; local ones come straight here.')),
      ...pos.slice(0, 12).map((p) => h('div', { class: 'ao-row static' }, h('div', { class: 'grow' }, h('b', {}, `${p.qty} × ${C.materials[p.material].name}`), h('small', {}, `${C.suppliers[p.supplier].name} · ${p.mode === 'internal' ? `your own ship (${p.job})` : p.mode === 'truck' ? 'truck' : 'carrier'} · ${p.status}`)), h('small', {}, A.when(p.arrive)))),
      btn('Supply ›', () => go('supply'))];
  };

  // ================================================================== the sheets
  const renderSheet = () => {
    const on = readonly || AO.mode !== 'floor';
    sheet.classList.toggle('hidden', !on);
    if (!on) return;
    const scroll = sheet.dataset.mode === AO.mode ? sheet.scrollTop : 0;
    const page = { tenders: tendersSheet, contracts: contractsSheet, supply: supplySheet, hangar: hangarSheet, standing: standingSheet, books: booksSheet, meridian: meridianSheet }[AO.mode]();
    const name = MODES.find((x) => x[0] === AO.mode)[2];
    sheet.replaceChildren(h('div', { class: 'ao-sheet-head' }, h('h2', {}, readonly ? 'Meridian Aerospace Corporation' : name), readonly ? null : btn('◂ Back to the floor', () => go('floor'))), page);
    sheet.dataset.mode = AO.mode;
    sheet.scrollTop = scroll;
    if (AO.focus) { sheet.querySelector(`[data-tender="${AO.focus}"]`)?.scrollIntoView({ block: 'center' }); AO.focus = null; }
  };

  // ------------------------------------------------------------------ tenders
  const tendersSheet = () => {
    const c = co();
    const FILTERS = [['all', 'All'], ['bid', 'I can bid'], ['aircraft', '✈ Aircraft'], ['rocket', '🚀 Launch'], ['satellite', '🛰 Satellites'], ['defence', '🛡 Defence']];
    const all = A.openTenders().map((t) => ({ t, p: C.products[t.product], q: A.bidQuote(c.id, t.id), mine: t.bids.find((b) => b.company === c.id) }));
    const shown = all.filter(({ t, p, q }) => AO.filter === 'all' || (AO.filter === 'bid' ? q.ok : AO.filter === 'defence' ? t.defence : p.line === AO.filter))
      .sort((a, b) => (b.q.ok - a.q.ok) || (b.t.qty * b.t.ceiling - a.t.qty * a.t.ceiling));
    const grid = h('div', { class: 'ao-grid tenders' }, ...shown.map(tenderCard));
    const closed = A.state.tenders.filter((t) => t.status !== 'open').slice(-12).reverse();
    const who = (id) => A.company(id)?.name || id;
    return h('div', {},
      h('div', { class: 'ao-chips' }, ...FILTERS.map(([id, label]) => h('button', { class: `ao-chip${AO.filter === id ? ' on' : ''}`, onclick: () => { AO.filter = id; refresh(); } }, label, h('em', {}, String(all.filter(({ t, p, q }) => id === 'all' || (id === 'bid' ? q.ok : id === 'defence' ? t.defence : p.line === id)).length))))),
      muted(`Customers post tenders at 06:00 and decide when they close. Bids are sealed — one per company, Meridian included — and each customer weighs price, delivery, quality and reputation its own way. An aircraft contract is never for more than ${A.A.maxAircraftPerContract} aircraft. You get the deposit when you win; the rest on delivery.`),
      shown.length ? grid : muted('No tenders here right now. New ones come in at 06:00.'),
      closed.length ? section('Recently decided', h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
        h('tr', {}, ...['', 'Customer', 'Order', 'Result', 'Bids (price · days · score)'].map((x) => h('th', {}, x))),
        ...closed.map((t) => h('tr', { class: t.winner === c.id ? 'pos' : '' }, h('td', {}, t.winner === c.id ? '🏆' : t.status === 'lapsed' ? '—' : '✖'), h('td', {}, C.customers[t.customer].name), h('td', {}, `${t.qty} × ${C.products[t.product].name}`), h('td', {}, t.status === 'lapsed' ? 'lapsed — no valid bids' : who(t.winner)),
          h('td', {}, (t.ranking || []).map((b) => `${who(b.company)} ${fmtMoney(b.unitPrice)} · ${b.days} d · ${b.score}`).join('  vs  ') || '—')))))) : null);
  };

  const tenderCard = ({ t, p, q, mine }) => {
    const c = co();
    const cu = C.customers[t.customer];
    const head = h('div', { class: 'ao-card-head' }, pic(productLook(C, t.product), 132, 64),
      h('div', { class: 'grow' }, h('b', {}, `${t.qty} × ${p.name}`), h('small', {}, cu.name), h('div', { class: 'ao-pills' }, t.event ? pill(t.event === 'government' ? '🏛 government order' : '🛰 constellation', COL.amber) : null, pill(LINE_NAME[p.line], COL.blue), t.minReputation ? pill(`reputation ${t.minReputation}+`, c.reputation >= t.minReputation ? COL.green : COL.red) : null, t.defence ? pill('defence', COL.amber) : null, t.embargoed ? pill('embargoed', COL.red) : null, mine ? pill('bid sealed', COL.green) : null)),
      h('div', { class: 'ao-pay' }, fmtMoney(t.ceiling * t.qty), h('small', {}, 'at the ceiling')));
    const facts = h('div', { class: 'ao-facts' },
      h('div', {}, h('small', {}, 'Ceiling / unit'), h('b', {}, fmtMoney(t.ceiling))),
      h('div', {}, h('small', {}, 'Deliver within'), h('b', {}, `${t.days} d`)),
      h('div', {}, h('small', {}, 'Quality'), h('b', {}, `${t.quality}+`)),
      h('div', {}, h('small', {}, 'Decides'), h('b', {}, `Day ${t.closes}`)));
    const confRow = configRow(t);
    const prio = h('div', { class: 'ao-prio' }, ...PRIORITY.map(([k, label]) => bar(label, cu.priority[k] / 0.6, COL.blue, `${Math.round(cu.priority[k] * 100)}%`)));
    const you = h('div', { class: 'ao-you' }, `Your cost ≈ ${money(q.cost)} a unit (materials ${fmtMoney(q.est.materials)}, freight ${fmtMoney(q.est.freight)}, bay-days ${fmtMoney(q.est.labour)}${q.launch ? `, launch ${fmtMoney(q.launch)}` : ''}) · earliest delivery ≈ ${Number.isFinite(q.delivery) ? `${q.delivery} d` : '—'}`);
    const card = h('div', { class: `ao-card${q.ok || mine ? '' : ' off'}${t.event ? ' event' : ''}`, 'data-tender': t.id }, head, h('small', { class: 'ao-blurb' }, cu.blurb || ''), confRow, facts, prio, you);
    if (mine) card.append(h('div', { class: 'ao-sealed' }, `🔒 Sealed: ${money(mine.unitPrice)} a unit, ${mine.days} days — the customer decides Day ${t.closes}.`));
    else if (q.ok || /price|delivery/.test(q.reason || '')) card.append(composer(t, q, c));
    else card.append(h('div', { class: 'ao-why' }, `✖ ${q.reason}`));
    return card;
  };

  /** The sealed-bid composer: a price slider from below cost to the ceiling, the days, what it means. */
  const composer = (t, q, c) => {
    const lo = Math.max(100, Math.floor((q.cost * 0.85) / 100) * 100);
    const price = h('input', { type: 'range', min: lo, max: t.ceiling, step: 100, value: Math.min(t.ceiling, Math.max(lo, q.unitPrice)), class: 'ao-range' });
    const priceN = h('input', { type: 'number', min: 1, step: 100, value: Math.min(t.ceiling, Math.max(lo, q.unitPrice)), class: 'ao-input num' });
    const days = h('input', { type: 'number', min: 1, step: 1, value: q.days || t.days, class: 'ao-input num small' });
    const read = h('div', { class: 'ao-readout' });
    const go2 = h('button', { class: 'ao-go' });
    const upd = (src) => {
      if (src === 'n') price.value = priceN.value; else priceN.value = price.value;
      const pr = Number(priceN.value);
      const d = Number(days.value);
      const margin = pr ? (pr - q.cost) / pr : 0;
      const late = Number.isFinite(q.delivery) && d < q.delivery;
      read.replaceChildren(...[
        h('span', { class: margin >= 0 ? 'pos' : 'neg' }, `${margin >= 0 ? '+' : ''}${Math.round(margin * 100)}% margin`),
        h('span', {}, `contribution ${fmtMoney((pr - q.cost) * t.qty)}`),
        h('span', {}, `deposit ${fmtMoney(pr * t.qty * t.deposit)}`),
        late ? h('span', { class: 'neg' }, `⚠ you expect to need ${q.delivery} d`) : null,
        pr > t.ceiling ? h('span', { class: 'neg' }, '✖ over the ceiling') : null,
        d > t.days ? h('span', { class: 'neg' }, '✖ longer than the customer allows') : null].filter(Boolean));
      go2.replaceChildren(document.createTextNode('Place sealed bid'), h('small', {}, `${fmtMoney(pr * t.qty)} · ${d} d`));
      go2.disabled = pr > t.ceiling || d > t.days || pr <= 0;
    };
    price.addEventListener('input', () => upd('r'));
    priceN.addEventListener('input', () => upd('n'));
    days.addEventListener('input', () => upd());
    go2.addEventListener('click', () => act(() => A.placeBid(c.id, t.id, Number(priceN.value), Number(days.value))));
    upd();
    return h('div', { class: 'ao-composer' }, h('div', { class: 'ao-row-inline' }, h('small', {}, 'Price a unit'), price, priceN), h('div', { class: 'ao-row-inline' }, h('small', {}, 'Days'), days, read), go2);
  };

  // ------------------------------------------------------------------ contracts
  const contractsSheet = () => {
    const c = co();
    const list = A.contractsOf(c).sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || a.due - b.due);
    const active = list.filter((x) => x.status === 'active');
    const backlog = active.reduce((a, x) => a + (x.qty - x.delivered - x.failed) * x.unitPrice, 0);
    return h('div', {},
      h('div', { class: 'ao-kpis' }, kpi('Active contracts', String(active.length)), kpi('Backlog', fmtMoney(backlog)), kpi('Deposits held', fmtMoney(c.books.deferred), '', 'owed as work'), kpi('Late', String(active.filter((x) => x.due < A.now).length), active.some((x) => x.due < A.now) ? 'neg' : '')),
      list.length ? h('div', { class: 'ao-grid wide' }, ...list.map(contractCard)) : muted('No contracts yet. Win a tender.'));
  };

  const contractCard = (ct) => {
    const c = co();
    const p = C.products[ct.product];
    const left = (ct.due - A.now) / 1440;
    const units = ct.units.map((id) => A.state.units[id]).filter(Boolean);
    const card = h('div', { class: `ao-card${ct.status !== 'active' ? ' off' : ''}` },
      h('div', { class: 'ao-card-head' }, pic(productLook(C, ct.product), 132, 64),
        h('div', { class: 'grow' }, h('b', {}, `${ct.qty} × ${p.name}`), h('small', {}, C.customers[ct.customer].name),
          h('div', { class: 'ao-pills' }, ct.status === 'active' ? pill(left < 0 ? `${fmtDays(-left)} late` : `due in ${fmtDays(left)}`, left < 0 ? COL.red : COL.green) : pill(ct.status, 'rgba(223,233,245,0.6)'), pill(`${ct.delivered}/${ct.qty} delivered`, COL.blue), ct.failed ? pill(`${ct.failed} lost`, COL.red) : null)),
        h('div', { class: 'ao-pay' }, fmtMoney(ct.total), h('small', {}, `${fmtMoney(ct.unitPrice)} a unit`))),
      configRow(ct, { compact: true }),
      h('div', { class: 'ao-facts' },
        h('div', {}, h('small', {}, 'Deposit'), h('b', {}, fmtMoney(ct.depositPaid))),
        h('div', {}, h('small', {}, 'Earned'), h('b', {}, fmtMoney(ct.revenue))),
        h('div', {}, h('small', {}, 'Penalties'), h('b', { class: ct.penalties ? 'neg' : '' }, fmtMoney(ct.penalties || 0))),
        h('div', {}, h('small', {}, 'Due'), h('b', {}, A.when(ct.due).replace('Day ', 'D')))),
      ...units.filter((u) => !u.finished).map((u) => h('button', { class: 'ao-unit', onclick: () => go('floor', { kind: 'unit', id: u.id }) },
        h('b', {}, `#${u.n}`), h('div', { class: 'grow' }, stageStrip(u), h('small', { class: u.status === 'blocked' ? 'neg' : '' }, `${A.stageOf(u)?.name || STATUS[u.status]}${u.blocker && u.status !== 'building' ? ` — ${u.blocker.text}` : ''}`)), h('small', {}, fmtDays(A.unitDaysLeft(u))))),
      ct.note ? muted(ct.note) : null,
      h('details', { class: 'ao-details' }, h('summary', {}, 'History'), h('div', { class: 'ao-log' }, ...ct.history.map((x) => h('div', {}, h('i', {}, A.when(x.at)), ' ', x.text)))),
      ct.status === 'active' ? h('button', { class: 'ao-link danger', onclick: () => { if (confirm(`Cancel this contract? The deposit for undelivered units goes back and you pay a ${Math.round(A.A.cancelPenalty * 100)}% penalty.`)) act(() => A.cancelContract(c.id, ct.id)); } }, 'Cancel contract…') : null);
    return card;
  };

  // ------------------------------------------------------------------ supply
  const materialRows = (c) => Object.keys(C.materials).map((m) => {
    const r = c.inv[m] || { qty: 0, reserved: 0 };
    const onOrder = A.ordersOf(c).filter((po) => po.material === m).reduce((a, po) => a + po.qty, 0);
    const need = A.demand(c, m);
    return { m, r, onOrder, need, short: Math.max(0, need - r.qty - onOrder) };
  }).filter((x) => x.r.qty || x.onOrder || x.need).sort((a, b) => b.short - a.short || b.need - a.need);

  const supplySheet = () => {
    const c = co();
    const rows = materialRows(c);
    const pos = A.ordersOf(c, false).sort((a, b) => b.placed - a.placed).slice(0, 20);
    const carrierOf = (po) => (po.mode === 'truck' ? 'truck (local)' : po.mode === 'internal' ? `${A.job(po.job)?.vessel ? `the ${g.logistics.vessel(A.job(po.job).vessel)?.name || 'ship'}` : 'awaiting a ship'} · ${po.job}` : C.freight.carrier);
    return h('div', {},
      h('div', { class: 'ao-kpis' }, kpi('In stores & on order', fmtMoney(c.books.inventoryValue)), kpi('Orders on the way', String(A.ordersOf(c).length)), kpi('Short', String(rows.filter((x) => x.short).length), rows.some((x) => x.short) ? 'neg' : 'pos'), kpi('Paid to carriers', fmtMoney(c.freight.external))),
      h('label', { class: 'ao-switch' }, h('input', { type: 'checkbox', checked: c.autoProcure, onchange: (e) => { c.autoProcure = e.target.checked; say({ ok: true, text: c.autoProcure ? 'Purchasing will order what the work in hand needs, from the cheapest supplier with stock (landed cost).' : 'Automatic purchasing is off: order materials yourself below.' }); refresh(); } }), h('span', {}), ' Order materials automatically (cheapest landed cost)'),
      h('div', { class: 'ao-two' },
        section('Stores', rows.length ? h('div', { class: 'ao-mats' }, h('div', { class: 'ao-mat head' }, h('span', {}, 'Material'), h('span', {}, 'Stores'), h('span', {}, 'Reserved'), h('span', {}, 'On order'), h('span', {}, 'Needed'), h('span', {}, '')),
          ...rows.map((x) => h('div', { class: `ao-mat${x.short ? ' short' : ''}` }, h('span', {}, C.materials[x.m].name), h('span', {}, String(x.r.qty)), h('span', {}, String(x.r.reserved)), h('span', {}, String(x.onOrder)), h('span', {}, String(x.need)),
            h('span', {}, x.short ? btn(`Order ${x.short}`, () => { AO.mat = x.m; AO.qty = x.short; refresh(); sheet.querySelector('.ao-order')?.scrollIntoView({ block: 'start' }); }, 'tiny warn') : h('div', { class: 'ao-bar-track' }, h('i', { style: `width:${Math.round(clamp01(x.need ? (x.r.qty + x.onOrder) / x.need : 1) * 100)}%;background:${COL.green}` })))))) : muted('Nothing in stores and nothing needed.')),
        shippingSection(c)),
      section('Purchase orders', pos.length ? h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
        h('tr', {}, ...['Order', 'Supplier', 'Lots', 'Goods + duty', 'Freight', 'By', 'Status', 'Due'].map((x) => h('th', {}, x))),
        ...pos.map((po) => h('tr', { class: po.status === 'lost' ? 'neg' : po.status === 'received' ? 'dim' : '' }, h('td', {}, `${po.id} ${C.materials[po.material].name}`), h('td', {}, C.suppliers[po.supplier].name), h('td', {}, String(po.qty)), h('td', {}, money(po.goods)), h('td', {}, money(po.mode === 'internal' ? po.freightInt || 0 : po.freight)), h('td', {}, carrierOf(po)), h('td', {}, po.status), h('td', {}, po.status === 'received' ? A.when(po.received) : A.when(po.arrive)))))) : muted('No orders yet.')),
      orderForm(c));
  };

  const orderForm = (c) => {
    const mats = Object.keys(C.materials);
    if (!AO.mat || !C.materials[AO.mat]) AO.mat = mats[0];
    const sel = h('select', { class: 'ao-input', onchange: (e) => { AO.mat = e.target.value; draw(); } }, ...mats.map((m) => h('option', { value: m, selected: m === AO.mat }, C.materials[m].name)));
    const qty = h('input', { type: 'number', min: 1, value: AO.qty, class: 'ao-input num small', oninput: (e) => { AO.qty = Math.max(1, Math.floor(Number(e.target.value) || 1)); draw(); } });
    const grid = h('div', { class: 'ao-grid' });
    const draw = () => {
      const m = AO.mat;
      const n = AO.qty;
      grid.replaceChildren(...Object.entries(C.suppliers).filter(([, sp]) => sp.sells[m]).map(([id, sp]) => {
        const stock = A.state.suppliers[id].stock[m] || 0;
        const q = A.freightQuote(c, id, m, Math.min(n, Math.max(1, stock)));
        const total = q.goods + q.freight + q.duty + q.handling;
        const own = sp.where !== 'local' && A.canShipInternal(c);
        const iq = own ? A.internalQuote(c, sp.where, q.volume, A.now + sp.lead * 1440) : null;
        const iCharge = own ? Math.round((q.freight + q.handling) * (iq.ok ? iq.rate : C.internal.rates.inefficient)) : 0;
        return h('div', { class: 'ao-card' },
          h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, sp.name), h('small', {}, sp.where === 'local' ? 'Local · by truck' : `${g.logistics.port(sp.where)?.name} · ${q.km ? `${q.km.toLocaleString()} km by sea` : ''}`)), pill(`${stock} in stock`, stock >= n ? COL.green : COL.red)),
          h('div', { class: 'ao-quote' }, h('div', {}, h('small', {}, sp.where === 'local' ? 'Landed (truck)' : 'Landed (carrier)'), h('b', {}, money(total)), h('span', {}, `goods ${fmtMoney(q.goods)} · freight ${fmtMoney(q.freight)}${q.duty ? ` · duty ${fmtMoney(q.duty)}` : ''}${q.handling ? ` · handling ${fmtMoney(q.handling)}` : ''} · ${Math.round(q.hours)} h`)),
            own ? h('div', { class: 'own' }, h('small', {}, 'Landed (your own ship)'), h('b', {}, money(q.goods + q.duty + iCharge)), h('span', {}, iq.ok ? `the ${iq.vessel.name}${iq.atOrigin ? ', already there' : ' sails there empty'} · ~${Math.round((iq.eta - A.now) / 60)} h · saves ${fmtMoney(q.freight + q.handling - iCharge)}` : `${iq.reasons[0]} — it would wait${c.internalPolicy === 'fallback' ? ' up to a day, then go by carrier' : ''}`)) : null),
          h('div', { class: 'ao-row-inline' },
            btn(sp.where === 'local' ? `Order ${n}` : `Order ${n} by carrier`, () => act(() => A.order(c, id, m, n, {}, { mode: 'carrier' })), own ? '' : 'primary', stock < n),
            own ? btn(`Order ${n} in my ship`, () => act(() => A.order(c, id, m, n, {}, { mode: 'internal' })), 'primary', stock < n) : null));
      }));
    };
    draw();
    return h('div', { class: 'ao-sec ao-order' }, h('h4', {}, 'Order materials'), h('div', { class: 'ao-row-inline' }, sel, h('small', {}, 'lots'), qty, h('small', { class: 'ao-muted' }, 'Landed cost = the supplier\'s price + duty + freight + handling. Materials can only be used once they\'re in stores.')), grid);
  };

  /** Shipping in your own ships (v0.56.0): the setting, the consignments, what it saves. */
  const shippingSection = (c) => {
    const L = g.logistics;
    if (!A.canShipInternal(c)) return section('Shipping', h('div', { class: 'ao-card' }, h('b', {}, `🚚 ${C.freight.carrier}`), muted('Foreign materials come by an independent carrier at the market rate. Own a shipping line — Ober & Sons Maritime is for sale from Captain Ober at the Mill Road Yards — and your own ships can bring them for a small internal charge instead.')));
    const sv = A.shippingSavings(c);
    const ex = A.expectedSavings(c);
    const jobs = A.jobs(c, false).sort((a, b) => b.created - a.created).slice(0, 10);
    const seg = (key, options) => h('div', { class: 'ao-seg' }, ...options.map(([v, label]) => h('button', { class: c[key] === v ? 'on' : '', onclick: () => { c[key] = v; say({ ok: true, text: label }); refresh(); } }, label)));
    return section('Your own ships — Ober & Sons Maritime',
      seg('shipping', [['internal', 'In my own ships'], ['carrier', 'By carrier']]),
      seg('internalPolicy', [['fallback', `No ship in ${C.internal.fallbackHours} h → carrier`], ['wait', 'Always wait for a ship']]),
      h('div', { class: 'ao-kpis two' }, kpi('Carrier would have charged', fmtMoney(sv.equivalent)), kpi('Internal charges', fmtMoney(sv.charges)), kpi('Saved (aerospace)', fmtMoney(sv.division), 'pos'), kpi('Saved (group)', fmtMoney(sv.group), sv.group >= 0 ? 'pos' : 'neg', 'after voyage costs'), kpi('Expected on work in hand', fmtMoney(ex.saving), 'pos')),
      muted(`The aerospace books pay the line ${Math.round(C.internal.rates.established * 100)}–${Math.round(C.internal.rates.inefficient * 100)}% of the carrier's rate (least on a route your fleet sails, most when a ship has to go there empty). The voyage's real costs are the line's, paid once; the group view cancels the charge.`),
      ...(jobs.length ? jobs.map((j) => {
        const v = j.vessel && L.vessel(j.vessel);
        const posj = j.pos.map((id) => A.state.pos[id]).filter(Boolean);
        const hit = A.affectedUnits(j);
        const open = ['waiting', 'reserved', 'repositioning'].includes(j.status);
        const f = v?.voyage && v.voyage.job === j.id ? L.position(v)?.f || 0 : j.status === 'delivered' || j.status === 'landed' ? 1 : 0;
        return h('div', { class: `ao-card ship${['delivered', 'carrier'].includes(j.status) ? ' off' : ''}` },
          h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, `🚢 ${j.id} · ${L.port(j.origin)?.name} → Mill Road`), h('small', {}, `${j.units} units · ${fmtMoney(j.value)} of goods${v ? ` · the ${v.name}` : ''}`)), pill(j.status, j.status === 'lost' ? COL.red : j.status === 'delivered' ? COL.green : COL.blue), j.priority === 'urgent' ? pill('urgent', COL.amber) : null),
          bar('Voyage', f, COL.blue, j.eta ? A.when(j.eta).replace('Day ', 'D') : '—'),
          h('small', {}, `${j.eta ? `Due at the Park ${A.when(j.eta)}${j.delayed ? ` (delayed ${j.delayed} h)` : ''}` : j.status === 'carrier' ? 'Went by carrier' : j.waitingWhy ? `Waiting: ${j.waitingWhy}` : 'Waiting for a ship'} · carrier ${fmtMoney(j.extFreight)}${j.charge ? ` · internal ${fmtMoney(j.charge)} (${(j.rate * 100).toFixed(1)}%)` : ''}${j.voyageCost ? ` · voyage ${fmtMoney(j.voyageCost)}` : ''}`),
          h('small', { class: 'ao-muted' }, `Manifest: ${posj.map((po) => `${po.qty} × ${C.materials[po.material].name}`).join(', ')}`),
          hit.length ? h('small', { class: 'warn' }, `Waiting on it: ${hit.map((u) => `${C.products[u.product].name} #${u.n}`).join(', ')}`) : null,
          h('details', { class: 'ao-details' }, h('summary', {}, 'Log'), h('div', { class: 'ao-log' }, ...j.log.map((x) => h('div', {}, h('i', {}, A.when(x.at)), ' ', x.text)))),
          open ? h('div', { class: 'ao-row-inline' }, btn(j.priority === 'urgent' ? 'Normal priority' : 'Make it urgent', () => act(() => A.setJobPriority(j.id, j.priority === 'urgent' ? 'normal' : 'urgent'))), btn(`Send by carrier (${fmtMoney(posj.reduce((a, po) => a + po.extFreight, 0))})`, () => act(() => A.jobToCarrier(j)))) : null);
      }) : [muted('No consignments in your ships yet.')]));
  };

  /** A hall: its state on the map, what it costs, and its slots (a bay fitted, or free to fit). */
  const hallCard = (c, hid, H) => {
    const st = A.hallState(c, hid);
    const slots = H.slots.map((sl) => {
      const bay = c.bays.find((b) => b.slot === sl.id);
      const types = [...new Set(sl.fits)];
      if (bay) {
        const u = unitOf(bay.unit);
        return h('div', { class: 'ao-tile' }, h('small', {}, `SLOT · ${sl.fits[0].toUpperCase()}`), h('b', {}, C.bays[bay.type].name), bay.ready > A.now ? pill(`fitted ${A.when(bay.ready).replace('Day ', 'D')}`, COL.blue) : u ? pill(`${C.products[u.product].name} #${u.n}`, COL.green) : pill('idle', 'rgba(223,233,245,0.5)'));
      }
      if (st.state !== 'built') return h('div', { class: 'ao-tile off' }, h('small', {}, `SLOT · ${sl.fits[0].toUpperCase()}`), h('b', {}, 'after the hall opens'));
      return h('div', { class: 'ao-tile' }, h('small', {}, `FREE SLOT · ${sl.fits[0].toUpperCase()}`), h('div', { class: 'ao-row-inline' }, ...types.map((type) => btn(`Fit ${C.bays[type].name.replace(/ bay| hall| building| room/i, '').toLowerCase()} · ${fmtMoney(C.bays[type].build)}`, () => act(() => A.buildBay(c, type, sl.id)), 'tiny', !A.canAfford(c, C.bays[type].build)))));
    });
    return h('div', { class: 'ao-card' },
      h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, H.name), h('small', {}, H.text)),
        st.state === 'built' ? pill(H.owned ? 'yours' : 'open', COL.green) : st.state === 'building' ? pill(`opens ${A.when(st.ready).replace('Day ', 'D')}`, COL.blue) : h('div', { class: 'ao-pay' }, fmtMoney(H.build), h('small', {}, `${H.buildDays} d · ${fmtMoney(H.upkeep)}/d`))),
      st.state === 'building' ? bar('Building', st.f, COL.blue, `${Math.round(st.f * 100)}%`) : null,
      slots.length ? h('div', { class: 'ao-grid small' }, ...slots) : h('small', { class: 'ao-muted' }, H.effect ? `Effect: research takes ${Math.round((1 - H.effect.researchDays) * 100)}% less time.` : ''),
      st.state === 'site' ? btn(`Build it · ${money(H.build)}`, () => act(() => A.buildHall(c, hid)), 'primary', !A.canAfford(c, H.build)) : null);
  };

  /** The people: technicians, engineers, inspectors (hire, lay off), what they've learnt together, and the training that keeps it up. */
  const peopleSection = (c) => {
    const S = C.staff;
    const wagesDay = c.workforce * S.roles.tech.wage + c.engineers * S.roles.engineer.wage + c.inspectors * S.roles.inspector.wage;
    const T = S.training[c.training] || S.training.none;
    const trainDay = c.workforce * T.perDay;
    const role = (id) => {
      const R = S.roles[id];
      const have = A.staffCount(c, id);
      const need = A.staffNeeded(c, id);
      const ok = have >= need;
      return h('div', { class: 'ao-card' },
        h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, R.name), h('small', {}, R.text)), h('div', { class: 'ao-pay' }, String(have), h('small', {}, `of ${need} needed · ${fmtMoney(R.wage)}/day each`))),
        bar('Staffed', need ? have / need : 1, ok ? COL.green : COL.amber, `${Math.round(Math.min(2, have / need) * 100)}%`),
        h('div', { class: 'ao-row-inline' }, ...R.batches.map((n) => btn(`Hire ${n} · ${fmtMoney(n * R.hire)}`, () => act(() => A.hire(c, n, id)), 'primary', !A.canAfford(c, n * R.hire))), ...R.batches.slice(0, 2).map((n) => btn(`Lay off ${n}`, () => act(() => A.layoff(c, n, id)), '', have < n))));
    };
    const x = c.experience;
    const speed = A.experienceFactor(c);
    return section('People',
      h('div', { class: 'ao-kpis two' }, kpi('On the payroll', String(A.headcount(c))), kpi('Wages a day', fmtMoney(wagesDay + trainDay), '', trainDay ? `incl. ${fmtMoney(trainDay)} training` : null), kpi('Experience', `${Math.round(x)} / 100`, x >= 50 ? 'pos' : 'neg', `${speed >= 1 ? '+' : ''}${Math.round((speed - 1) * 100)}% pace`), kpi('Bays staffed', `${Math.round(A.staffing(c) * 100)}%`, A.staffing(c) < 1 ? 'neg' : 'pos')),
      role('tech'), role('engineer'), role('inspector'),
      h('h4', {}, 'Training'),
      h('div', { class: 'ao-seg' }, ...Object.entries(S.training).map(([id, t]) => h('button', { class: c.training === id ? 'on' : '', onclick: () => act(() => A.setTraining(c, id)) }, `${t.name}${t.perDay ? ` · ${t.perDay}/tech/day` : ''}`))),
      muted(`${T.text} Experience grows about ${(T.gain * 30 * (1 - x / 130)).toFixed(1)} points a month. New hires arrive with ${S.newHireExperience}, so a big hiring round dilutes it — and experience sets the pace of every bay (${Math.round(S.experience.speedAt0 * 100)}–${Math.round(S.experience.speedAt100 * 100)}%) and the quality of the work.`));
  };

  /** What quality is made of, the chance an inspection fails for what's in hand, and the last inspections. */
  const qualitySection = (c) => {
    const q = A.qualityBreakdown(c);
    const row = (label, v, note) => h('tr', {}, h('td', {}, label), h('td', { class: `r ${v > 0.05 ? 'pos' : v < -0.05 ? 'neg' : ''}` }, v === null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`), h('td', { class: 'ao-muted' }, note || ''));
    const units = A.unitsOf(c);
    const products = [...new Set(units.map((u) => u.product))].slice(0, 5);
    return section('Quality',
      h('div', { class: 'ao-kpis two' }, kpi('Quality', q.total.toFixed(1), q.total >= 60 ? 'pos' : ''), kpi('Inspectors', `${Math.round(q.ratio * 100)}% of need`, q.ratio >= 1 ? 'pos' : 'neg')),
      h('table', { class: 'ao-table' },
        h('tr', {}, h('th', {}, 'Where it comes from'), h('th', { class: 'r' }, 'Points'), h('th', {}, '')),
        row('The firm\'s standing', q.base, 'what Roost was known for'),
        row('Research', q.research, 'airframe and process knowledge'),
        row('Inspection equipment', q.equipment, c.facilities.inspection ? 'the gantry' : 'not built'),
        row('Experience', q.experience, `${Math.round(c.experience)} (50 is average)`),
        row('Inspectors', q.inspectors, q.ratio >= 1 ? 'more than the work needs' : 'fewer than the work needs'),
        h('tr', { class: 'total' }, h('td', {}, 'Total'), h('td', { class: 'r' }, q.total.toFixed(1)), h('td', {}, ''))),
      products.length ? h('div', {}, h('small', { class: 'ao-muted' }, 'Chance an inspection fails, for the work in hand: '), ...products.map((id) => { const p = C.products[id]; const pf = failChance(C, p, q.total, { engineCell: c.facilities.engine_cell }); return pill(`${p.name} ${Math.round(pf * 100)}%`, pf > 0.3 ? COL.red : pf > 0.15 ? COL.amber : COL.green); })) : null,
      c.qaLog?.length ? h('div', { class: 'ao-pills' }, h('small', { class: 'ao-muted' }, 'Last inspections: '), ...c.qaLog.slice(0, 10).map((e) => pill(`${e.what} ${e.pass ? 'pass' : 'FAIL'}`, e.pass ? COL.green : COL.red))) : muted('No inspections yet.'));
  };

  // ------------------------------------------------------------------ hangar (workforce, bays, facilities, research)
  const hangarSheet = () => {
    const c = co();
    const need = A.crewNeeded(c, { all: true });
    const R = C.research;
    const avail = Object.entries(R).filter(([id, r]) => !c.research.includes(id) && (r.requires || []).every((x) => c.research.includes(x)));
    const locked = Object.entries(R).filter(([id, r]) => !c.research.includes(id) && !(r.requires || []).every((x) => c.research.includes(x)));
    const unlocks = (id) => Object.values(C.products).filter((p) => p.tech === id);
    return h('div', {},
      h('div', { class: 'ao-two' },
        peopleSection(c),
        h('div', {}, qualitySection(c), section('Apron-side facilities',
          h('div', { class: 'ao-grid small' },
            h('div', { class: 'ao-tile' }, h('small', {}, 'APRON'), h('b', {}, `${c.apron} stands`), pill(`${A.apronUsed(c)} in use`, COL.blue)),
            ...Object.entries(C.facilities).filter(([, f]) => f.build).map(([id, f]) => { const have = id === 'pad' ? c.pad : c.facilities[id]; const b = c.building?.[id]; return h('div', { class: 'ao-tile' }, h('small', {}, 'FACILITY'), h('b', {}, f.name), have ? pill('built', COL.green) : b ? pill(`ready ${A.when(b).replace('Day ', 'D')}`, COL.blue) : pill('not built', 'rgba(223,233,245,0.5)')); }))))),
      section('Halls — where your bays stand', muted('Each hall is a building on Starling Flats: build it (the site on the map becomes the hall), then fit bays into its slots. A free slot takes only the bay types listed.'),
        h('div', { class: 'ao-grid wide' }, ...Object.entries(C.halls).map(([hid, H]) => hallCard(c, hid, H)))),
      section('Facilities', h('div', { class: 'ao-grid' }, ...Object.entries(C.facilities).filter(([, f]) => f.build).map(([id, f]) => {
        const have = id === 'pad' ? c.pad : c.facilities[id];
        const b = c.building?.[id];
        return h('div', { class: `ao-card${have ? ' off' : ''}` }, h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, f.name), h('small', {}, f.text)), h('div', { class: 'ao-pay' }, fmtMoney(f.build), h('small', {}, `${f.buildDays} d · ${fmtMoney(f.upkeep)}/d`))),
          have ? pill('built', COL.green) : b ? pill(`being built — ready ${A.when(b)}`, COL.blue) : btn(`Build · ${money(f.build)}`, () => act(() => A.buildFacility(c, id)), 'primary', !A.canAfford(c, f.build)));
      }))),
      section('Research',
        c.researching ? h('div', { class: 'ao-alert' }, `🔬 Researching ${R[c.researching.id].name} — done ${A.when(c.researching.doneAt)}.`) : muted('Nothing being researched. Research opens new products to bid on.'),
        h('div', { class: 'ao-pills' }, ...c.research.map((id) => pill(`✓ ${R[id].name}`, COL.green))),
        h('div', { class: 'ao-grid' }, ...avail.map(([id, r]) => h('div', { class: 'ao-card' },
          h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, r.name), h('small', {}, r.text)), r.clearance ? pill('defence', COL.amber) : null, h('div', { class: 'ao-pay' }, fmtMoney(r.cost), h('small', {}, `${r.days} days`))),
          unlocks(id).length ? h('div', { class: 'ao-unlocks' }, ...unlocks(id).map((p) => h('span', {}, pic(productLook(C, Object.keys(C.products).find((k2) => C.products[k2] === p)), 56, 28), p.name))) : null,
          btn(`Research · ${money(r.cost)}`, () => act(() => A.startResearch(c, id)), 'primary', Boolean(c.researching) || !A.canAfford(c, r.cost))))),
        locked.length ? muted(`Later: ${locked.map(([, r]) => `${r.name} (needs ${(r.requires || []).filter((x) => !c.research.includes(x)).map((x) => R[x].name).join(', ')})`).join(' · ')}`) : null));
  };

  // ------------------------------------------------------------------ standing (reputation, decisions, the firsts)
  const standingSheet = () => {
    const c = co();
    const M = A.meridian;
    const R = C.events;
    const open = (c.events || []).filter((e) => !e.resolved);
    const done = (c.events || []).filter((e) => e.resolved).slice(-4).reverse();
    const offers = (c.offers || []).filter((o) => o.until >= A.day);
    const log = c.repLog || [];
    const month = log.filter((e) => e.at >= A.now - 30 * 1440).reduce((a, e) => a + e.delta, 0);
    const first = (key) => c.milestones?.[key];
    return h('div', {},
      h('div', { class: 'ao-kpis' }, kpi('Reputation', `${Math.round(c.reputation)} / 100`, c.reputation >= 60 ? 'pos' : c.reputation < 35 ? 'neg' : ''), kpi('Last 30 days', `${month >= 0 ? '+' : ''}${month.toFixed(1)}`, month >= 0 ? 'pos' : 'neg'), kpi('On time in a row', String(c.streaks?.onTime || 0), '', `${c.streaks?.late ? `${c.streaks.late} late in a row` : `${R.rep.streakAt}+ earns a bonus`}`), kpi('Meridian', `${Math.round(M.reputation)}`, '', 'for comparison')),
      muted('Reputation weighs in every customer\'s choice between you and Meridian, and some orders are closed to anyone below a certain standing. It rises with on-time deliveries and flawless builds, and falls with late ones, failed inspections, lost launches and cancelled contracts — and repeating a failure costs more each time.'),
      open.length || offers.length ? section('Decisions & offers', ...open.map((e) => h('div', { class: 'ao-card event' },
        h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, `🔍 ${e.title}`), h('small', {}, e.text)), pill(`decide by Day ${e.expires}`, COL.red)),
        h('div', { class: 'ao-row-inline' }, ...e.choices.map((ch) => h('div', { class: 'ao-choice' }, btn(ch.label, () => act(() => A.resolveEvent(c, e.id, ch.id)), 'primary', !A.canAfford(c, ch.cost || 0)), h('small', {}, ch.text)))))),
        ...offers.map((o) => h('div', { class: 'ao-card event' }, h('div', { class: 'ao-card-head' }, h('div', { class: 'grow' }, h('b', {}, `🏗 ${Math.round(o.pct * 100)}% off the ${C.halls[o.hall].name}`), h('small', {}, `The Park Authority: ${o.reason}. Build it by Day ${o.until} and pay ${fmtMoney(C.halls[o.hall].build * (1 - o.pct))} instead of ${fmtMoney(C.halls[o.hall].build)}.`)), pill(`until Day ${o.until}`, COL.amber)), btn('To the Hangar ›', () => go('hangar'))))) : null,
      h('div', { class: 'ao-two' },
        section('Reputation — what moved it', log.length ? h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
          h('tr', {}, h('th', {}, 'When'), h('th', { class: 'r' }, 'Change'), h('th', {}, 'Why'), h('th', { class: 'r' }, 'Now')),
          ...log.slice(0, 24).map((e) => h('tr', {}, h('td', {}, A.when(e.at).replace('Day ', 'D')), h('td', { class: `r ${e.delta > 0 ? 'pos' : e.delta < 0 ? 'neg' : ''}` }, `${e.delta > 0 ? '+' : ''}${e.delta}`), h('td', {}, e.why), h('td', { class: 'r' }, String(e.total)))))) : muted('Nothing yet: it starts moving with your first delivery.')),
        h('div', {},
          section('The firsts', h('div', { class: 'ao-list' }, ...Object.entries(R.milestones).map(([key, m]) => { const got = first(key); return h('div', { class: `ao-row static${got ? '' : ' dim'}` }, h('div', { class: 'ic' }, got ? '🏅' : '○'), h('div', { class: 'grow' }, h('b', {}, m.name), h('small', {}, got ? `Day ${got.day}${got.detail ? ` · ${got.detail}` : ''}` : `${m.text} · +${m.rep} reputation`))); }))),
          done.length ? section('Recently decided', ...done.map((e) => h('div', { class: 'ao-row static' }, h('div', { class: 'grow' }, h('b', {}, e.title), h('small', {}, `Day ${Math.floor(e.resolved.at / 1440) + 1}: ${e.resolved.choice === 'programme' ? 'you funded a corrective programme' : e.resolved.choice === 'fine' ? 'you paid the fine' : 'ignored — the regulator fined you'}`))))) : null)));
  };

  // ------------------------------------------------------------------ books
  const booksSheet = () => {
    const c = co();
    const periods = [['7 days', 7], ['30 days', 30], ['Since you bought it', null]];
    const sums = periods.map(([, n]) => A.statement(c, n));
    const keys = Object.keys(ACCOUNTS).filter((k) => sums.some((s) => s.acc[k]));
    const m = sums[1];
    // the last 30 days, in (green) and out (red)
    const days = [...c.books.days].reverse().slice(-30);
    const chart = h('canvas', { width: 1400, height: 260, class: 'ao-chart' });
    const x = chart.getContext('2d');
    const per = days.map((d) => { let rev = 0; let cost = 0; for (const [k, v] of Object.entries(d.acc)) { const a = ACCOUNTS[k]; if (!a) continue; if (a.kind === 'revenue') rev += v; else cost += v; } return { day: d.day, rev, cost }; });
    const max = Math.max(1, ...per.map((d) => Math.max(d.rev, d.cost)));
    const bw = 1400 / Math.max(14, per.length);
    per.forEach((d, i) => {
      x.fillStyle = 'rgba(94,224,138,0.85)';
      x.fillRect(i * bw + bw * 0.12, 225 - (d.rev / max) * 200, bw * 0.36, (d.rev / max) * 200);
      x.fillStyle = 'rgba(255,107,107,0.8)';
      x.fillRect(i * bw + bw * 0.52, 225 - (d.cost / max) * 200, bw * 0.36, (d.cost / max) * 200);
      x.fillStyle = '#8fa3bf'; x.font = '18px system-ui'; x.textAlign = 'center';
      if (per.length <= 16 || i % 2 === 0) x.fillText(`D${d.day}`, i * bw + bw / 2, 252);
    });
    const G = g.logistics.owned ? periods.map(([, n]) => A.groupStatement(n)) : null;
    return h('div', {},
      h('div', { class: 'ao-kpis' }, kpi('Revenue, 30 days', fmtMoney(m.revenue), 'pos'), kpi('Costs, 30 days', fmtMoney(m.costs), 'neg'), kpi('Operating profit, 30 days', fmtMoney(m.profit), m.profit >= 0 ? 'pos' : 'neg'), kpi('Capital spent', fmtMoney(c.books.capex), '', 'firm, bays, facilities')),
      h('div', { class: 'ao-sec' }, h('h4', {}, 'Day by day — booked in (green) and out (red)'), per.length ? chart : muted('The chart fills in day by day.')),
      h('div', { class: 'ao-two' },
        section('The statement', h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
          h('tr', {}, h('th', {}, 'Account'), ...periods.map(([l]) => h('th', { class: 'r' }, l))),
          ...keys.map((k) => h('tr', { class: ACCOUNTS[k].kind === 'revenue' ? 'pos' : '' }, h('td', {}, ACCOUNTS[k].name), ...sums.map((s) => h('td', { class: 'r' }, s.acc[k] ? `${ACCOUNTS[k].kind === 'revenue' ? '' : '−'}${Math.round(s.acc[k]).toLocaleString()}` : '—')))),
          h('tr', { class: 'total' }, h('td', {}, 'Operating profit'), ...sums.map((s) => h('td', { class: `r ${s.profit >= 0 ? 'pos' : 'neg'}` }, Math.round(s.profit).toLocaleString()))))),
          h('div', { class: 'ao-kpis two' }, kpi('Deposits held', fmtMoney(c.books.deferred), '', 'work still owed'), kpi('Materials (stores & on order)', fmtMoney(c.books.inventoryValue))),
          muted('Revenue is booked when a unit is delivered (a deposit is owed work until then). Materials are an asset until a unit uses them, and become cost of sales when it\'s delivered, with the freight that brought them. Wages, upkeep and overhead are booked each morning.')),
        h('div', {},
          G ? section('The group: Roost + Ober & Sons', h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' },
            h('tr', {}, h('th', {}, ''), ...periods.map(([l]) => h('th', { class: 'r' }, l))),
            ...[['Aerospace profit (internal freight eliminated)', (y) => y.aero.profit], ['Shipping line operating profit (internal revenue eliminated; ships bought are capital)', (y) => y.shipping.profit], ['…internal charges eliminated', (y) => y.shipping.internal]].map(([label, f]) => h('tr', {}, h('td', {}, label), ...G.map((y) => h('td', { class: 'r' }, Math.round(f(y)).toLocaleString())))),
            h('tr', { class: 'total' }, h('td', {}, 'Group operating profit'), ...G.map((y) => h('td', { class: `r ${y.profit >= 0 ? 'pos' : 'neg'}` }, Math.round(y.profit).toLocaleString()))))),
            muted('The voyages that carry your materials are paid for once, in the shipping line\'s running costs and port fees; what the aerospace division pays the line for them cancels out here.')) : null,
          section('Reports', h('div', { class: 'ao-log tall' }, ...A.state.reports.filter((r) => r.company === c.id).slice(0, 60).map((r) => h('div', {}, h('i', {}, A.when(r.at)), ' ', r.text)))))));
  };

  // ------------------------------------------------------------------ Meridian
  const meridianSheet = () => {
    const M = A.meridian;
    const active = A.contractsOf(M, 'active');
    const mount = h('div', { class: 'ao-embed' });
    const render = (msg) => { mount.innerHTML = ''; mrdnScreen(g, mount, msg, render); renderTop(); };
    render();
    const units = A.unitsOf(M).filter((u) => u.bay);
    return h('div', {},
      muted(`${C.aero.meridian.founded}. What's public: its order book, its deliveries, its share price.`),
      h('div', { class: 'ao-kpis' }, kpi('MRDN', `${A.state.market.price.toFixed(2)} ◎`), kpi('Bays', String(M.bays.filter((b) => b.ready <= A.now).length), '', `${units.length} busy`), kpi('Workforce', M.workforce.toLocaleString()), kpi('Reputation', `${Math.round(M.reputation)}`), kpi('Delivered', String(M.stats.delivered), '', `${M.stats.late} late`), kpi('Launches', String(M.stats.launches), '', `${M.stats.launchFailures} lost`), kpi('Contracts won', String(M.stats.contractsWon)), kpi('Order book', String(active.length), '', 'contracts')),
      h('div', { class: 'ao-two' },
        section('MRDN on the exchange', mount),
        section('Meridian\'s order book', h('div', { class: 'ao-list' }, ...active.slice(0, 14).map((ct) => h('div', { class: 'ao-row static' }, pic(productLook(C, ct.product), 70, 34), h('div', { class: 'grow' }, h('b', {}, `${ct.qty} × ${C.products[ct.product].name}`), h('small', {}, `${C.customers[ct.customer].name} · ${ct.delivered} delivered · due ${A.when(ct.due)}`))))))));
  };

  // ================================================================== refresh
  const refresh = () => {
    renderTop();
    renderRail();
    renderDrawer();
    renderSheet();
    renderFeed();
  };
  if (AO.msg) { say({ ok: true, text: AO.msg }); AO.msg = null; }
  refresh();
  return { title: '', className: 'aerocmd', onClose: () => { AO.ff = null; opts.onClose?.(); } };
}
