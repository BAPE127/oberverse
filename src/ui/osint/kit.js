// The command terminal's pieces (v0.103.4): the same few shapes on every page, in the intelligence-terminal look (styles.css `.osx`). DOM only: no game rules here.
import { h } from '../panels.js';
export { h };

export const fmt = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');
export const money = (x) => `${fmt(x)} ◎`;
export const mono = (t) => h('span', { class: 'osx-mono' }, t);
export const dayText = (g, day) => (day == null ? '—' : day === g.clock.day ? 'today' : `day ${day}`);

/** A titled panel. `right` is a node or list of nodes on the title line. */
export function panel(title, body, { right = null, cls = '', sub = null } = {}) {
  return h('section', { class: `osx-pan ${cls}` },
    h('header', { class: 'osx-ph' }, h('span', {}, title), right ? h('span', { class: 'osx-ph-r' }, ...[].concat(right).filter(Boolean)) : null),
    sub ? h('div', { class: 'osx-sub' }, sub) : null,
    h('div', { class: 'osx-pb' }, ...[].concat(body).filter(Boolean)));
}

/** A figure with its label. tone: '' | 'ok' | 'warn' | 'bad'. */
export function stat(label, value, { tone = '', sub = null, onclick = null } = {}) {
  return h('div', { class: `osx-stat ${tone}${onclick ? ' tap' : ''}`, onclick }, h('div', { class: 'osx-sl' }, label), h('div', { class: 'osx-sv' }, value), sub ? h('div', { class: 'osx-ss' }, sub) : null);
}
export const stats = (...list) => h('div', { class: 'osx-stats' }, ...list.flat().filter(Boolean));

/** Tabs: items [{ id, label, badge? }]. */
export function tabs(items, active, pick) {
  return h('div', { class: 'osx-tabs' }, ...items.map((x) => h('button', { class: x.id === active ? 'on' : '', onclick: () => pick(x.id) }, x.label, x.badge ? h('i', {}, String(x.badge)) : null)));
}

export function btn(label, onclick, { kind = '', disabled = false, title = null } = {}) {
  return h('button', { class: `osx-btn ${kind}`, disabled, title, onclick }, label);
}

/** A label/value line. */
export const kv = (k, v, tone = '') => h('div', { class: `osx-kv ${tone}` }, h('span', {}, k), h('b', {}, v));

export const chip = (text, tone = '') => h('span', { class: `osx-chip ${tone}` }, text);
export const empty = (text) => h('div', { class: 'osx-empty' }, text);

/** A bar from 0 to 1. */
export const bar = (f, tone = '') => h('div', { class: `osx-bar ${tone}` }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%` }));

/** A table: head ['A','B'], rows [[cell, cell]] where a cell is text or a node; `onrow(i)` makes rows selectable. */
export function table(head, rows, { onrow = null, selected = -1 } = {}) {
  return h('table', { class: 'osx-table' }, h('thead', {}, h('tr', {}, ...head.map((t) => h('th', {}, t)))),
    h('tbody', {}, ...rows.map((r, i) => h('tr', { class: `${onrow ? 'tap' : ''}${i === selected ? ' on' : ''}`, onclick: onrow ? () => onrow(i) : null }, ...r.map((c) => h('td', {}, c))))));
}

/** A feed line: day, a coloured tag and the text. */
export const feedLine = (day, tag, text) => h('div', { class: 'osx-feed' }, h('span', { class: 'osx-fd' }, day), tag ? h('span', { class: `osx-ft ${tag}` }, tag) : null, h('span', {}, text));
