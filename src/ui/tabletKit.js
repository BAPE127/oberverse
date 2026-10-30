// The OberPad's pieces (v0.83.0): the same few shapes in every app, so a screen is a number, three tiles and a button or two,
// and anything that needs a paragraph keeps it behind a "?". DOM only — no game rules here.
//
//   statusBar(g)                 the strip across the top: time and day, the signal and the battery
//   navBar({ icon, title, back, right })   a back arrow, the app's name and what sits on the right
//   segments(items, active, pick)          the app's sections as one switch: items = [{ id, label, badge? }]
//   hero({ label, value, sub, ring })      the one headline figure (a ring shows how much of something is used)
//   tiles(list)                            three small figures: [{ n, t, tone? }]
//   row({ icon, title, sub, tag, tone, action })   one line of a list
//   help(title, ...paragraphs)             a "?" that opens the explanation, closed by default
//   note(ui)                               the line saying what the last button did, once
import { h } from './panels.js';

export const n = (x) => Math.round(x).toLocaleString('en-US');
export const pc = (v, d = 2) => `${(v * 100).toFixed(d)}%`;

export function statusBar(g) {
  return h('div', { class: 'tb-status' }, h('span', {}, h('b', {}, g.clock.timeString), ` · ${g.clock.weekday} · Day ${g.clock.day}`), h('span', {}, `${n(g.player.money)} ◎ · 📶 ▮▮▮ 🔋`));
}

export function navBar({ icon, title, back, right }) {
  return h('div', { class: 'tb-nav' }, back ? h('button', { class: 'tb-back', 'aria-label': 'Back', onclick: back }, '‹') : null, h('div', { class: 'tb-title' }, icon ? `${icon} ` : '', title), h('div', { class: 'grow' }), right || null);
}

export function segments(items, active, pick) {
  if (items.length < 2) return null;
  return h('div', { class: 'tb-seg' }, ...items.map((x) => h('button', { class: x.id === active ? 'on' : '', onclick: () => pick(x.id) }, x.label, x.badge ? h('i', { class: 'tb-dot' }, String(x.badge)) : null)));
}

export function hero({ label, value, sub, ring = null, tone = '' }) {
  const body = h('div', { class: 'grow' }, h('div', { class: 'tb-label' }, label), h('div', { class: `tb-big ${tone}` }, value), sub ? h('div', { class: 'tb-sub' }, sub) : null);
  if (ring === null) return h('div', { class: 'tb-hero' }, body);
  const f = Math.max(0, Math.min(1, ring));
  return h('div', { class: 'tb-hero' }, h('div', { class: 'tb-ring', style: `background:conic-gradient(var(--gold) 0 ${Math.round(f * 100)}%, rgba(255,255,255,.1) ${Math.round(f * 100)}% 100%)` }, h('div', {}, h('b', {}, `${Math.round(f * 100)}%`), h('small', {}, 'used'))), body);
}

export function tiles(list) {
  return h('div', { class: 'tb-tiles' }, ...list.map((x) => h('div', { class: `tb-tile ${x.tone || ''}` }, h('div', { class: 'tb-n' }, x.n), h('div', { class: 'tb-t' }, x.t))));
}

export function row({ icon, title, sub, tag, tone = '', action, onclick }) {
  return h('div', { class: `tb-row${onclick ? ' tap' : ''}`, onclick }, icon ? h('div', { class: 'tb-ico' }, icon) : null, h('div', { class: 'grow' }, h('b', {}, title), sub ? h('small', {}, sub) : null), tag ? h('span', { class: `tb-pill ${tone}` }, tag) : null, action || null);
}

export function help(title, ...paragraphs) {
  return h('details', { class: 'tb-help' }, h('summary', {}, title), ...paragraphs.map((p) => h('p', {}, p)));
}

export function note(ui) {
  if (!ui.corpNote) return null;
  const t = ui.corpNote;
  ui.corpNote = null;
  return h('div', { class: 'tb-note' }, t);
}

export const buttons = (...bs) => h('div', { class: 'tb-btns' }, ...bs);
export const big = (label, onclick, kind = '', disabled = false) => h('button', { class: `tb-btn ${kind}`, onclick, disabled }, label);

/**
 * The whole old page, one tap down (v0.84.0). The summary above it says what matters; this opens everything the app could do, as it
 * always did. `render(into)` draws it, and only when it is open, so a closed fold costs nothing. The open/closed state is kept per app.
 */
export function fold(ui, key, label, render) {
  const st = (ui.tabFold ||= {});
  const box = h('div', { class: 'tb-foldbody' });
  const d = h('details', { class: 'tb-fold', open: Boolean(st[key]) }, h('summary', {}, label), box);
  if (st[key]) render(box);
  d.addEventListener('toggle', () => { st[key] = d.open; if (d.open && !box.childNodes.length) render(box); });
  return d;
}

/** Open the app's fold from a button elsewhere on the screen (a row that says "see the candidates"). */
export const openFold = (ui, key) => { (ui.tabFold ||= {})[key] = true; };
