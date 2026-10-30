// The Milestones app (v0.80.0): what your group has actually done, from the game's records. Read from game.corp.milestones.
import { h } from './panels.js';

export function milestonesApp(ui, body) {
  const g = ui.game;
  const rows = g.corp.milestones.view();
  const got = rows.filter((r) => r.earned);
  body.append(h('p', { class: 'doc' }, '🏆 Milestones are awarded from what is in the books — a business owned, a manager who decided something, a month in the black, a loan repaid — never from opening a screen or pressing a button, and never promised from a war.'),
    h('div', { class: 'grid2' }, h('div', { class: 'stat' }, h('span', {}, 'Earned'), h('b', {}, `${got.length} of ${rows.length}`))));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Earned'));
  if (!got.length) body.append(h('p', { class: 'muted' }, 'None yet.'));
  else body.append(h('div', { class: 'list' }, ...got.sort((a, b) => a.earned.day - b.earned.day).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '🏆'), h('div', { class: 'grow' }, h('div', { class: 'name' }, r.name, h('span', { class: 'tag good' }, `day ${r.earned.day}`)), h('div', { class: 'desc' }, `${r.text} (${r.earned.have})`))))));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'To earn'));
  body.append(h('div', { class: 'list' }, ...rows.filter((r) => !r.earned).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, r.name, h('span', { class: 'tag' }, r.have || '—')), h('div', { class: 'desc' }, r.text))))));
}
