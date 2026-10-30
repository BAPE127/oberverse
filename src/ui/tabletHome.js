// The OberPad's home screen (v0.83.0): a greeting, your cash and what needs you, a search, the apps as big icons with a red dot
// for what is waiting, and a dock. Groups open on their first app; the other apps of a group are one switch away inside it.
import { h } from './panels.js';
import { n } from './tabletKit.js';
import { searchApps } from './tabletGroups.js';

// the icon on the home screen: group id or app → what it shows
const TILES = {
  Journal: { icon: '📓', label: 'Journal', open: 'Quests', hue: ['#7a5cff', '#4b34c9'] },
  Businesses: { icon: '🏭', label: 'Businesses', hue: ['#ff9a5c', '#d9552b'] },
  Group: { icon: '🏛️', label: 'My Group', hue: ['#4fc3a1', '#237f67'] },
  Markets: { icon: '📈', label: 'Markets', hue: ['#5fb0ff', '#2f6fd0'] },
  Bank: { icon: '🏦', label: 'Bank', hue: ['#f2c14e', '#c8872a'] },
  Economy: { icon: '🌍', label: 'World News', hue: ['#ff6b8a', '#c23b62'] },
  Personnel: { icon: '🧑‍💼', label: 'People', hue: ['#b58cff', '#7a4fd6'] },
  Milestones: { icon: '🏆', label: 'Milestones', hue: ['#f5e27a', '#c9a230'] },
};
const DOCK = ['Journal', 'Businesses', 'Markets', 'Bank'];

/** The icons this game has: its groups, plus three apps promoted out of theirs (the news, your people, your milestones). */
export function homeTiles(groups) {
  const have = new Set(groups.map((x) => x.id));
  const apps = new Set(groups.flatMap((x) => x.apps));
  const out = [];
  for (const id of ['Journal', 'Businesses', 'Group', 'Markets', 'Bank']) if (have.has(id)) out.push({ id, ...TILES[id], target: TILES[id].open || groups.find((x) => x.id === id).apps[0] });
  for (const a of ['Economy', 'Personnel', 'Milestones']) if (apps.has(a)) out.push({ id: a, ...TILES[a], target: a });
  return out;
}

export function homeScreen(ui, body, open, groups, badge, needs, unread = 0) {
  const g = ui.game;
  const tiles = homeTiles(groups);
  const count = (t) => (t.id in badge ? badge[t.id] : groups.find((x) => x.id === t.id)?.apps.reduce((a, app) => a + (badge[app] || 0), 0) || 0);
  const icon = (t, small = false) => h('button', { class: `tb-icon${small ? ' small' : ''}`, onclick: () => open(t.target), title: t.label },
    h('span', { class: 'tile', style: `background:linear-gradient(${t.hue[0]},${t.hue[1]})` }, t.icon, count(t) ? h('i', { class: 'tb-dot' }, String(count(t))) : null), small ? null : h('span', { class: 'l' }, t.label));
  const q = h('input', { type: 'text', class: 'tb-search', placeholder: '🔎  Search apps…', value: ui.tabletSearch || '' });
  q.addEventListener('change', () => { ui.tabletSearch = q.value; open('Home'); });
  const found = searchApps(groups, ui.tabletSearch);
  body.append(
    h('div', { class: 'tb-greet' }, h('div', { class: 'tb-hello' }, `Good ${g.clock.hour < 12 ? 'morning' : g.clock.hour < 18 ? 'afternoon' : 'evening'}, ${g.player.name || 'Ace'}`)),
    h('div', { class: 'tb-today' },
      h('div', { class: 'tb-card' }, h('div', { class: 'tb-label' }, 'Your cash'), h('div', { class: 'tb-big gold' }, n(g.player.money))),
      h('div', { class: 'tb-card' }, h('div', { class: 'tb-label' }, 'Needs you'), ...(needs.length ? needs.map((x) => h('button', { class: 'tb-chip', onclick: () => open(x.app) }, x.text)) : [h('div', { class: 'tb-sub' }, 'All quiet')]))),
    h('div', { class: 'tb-searchrow' }, q, h('button', { class: 'tb-bell', title: 'Notifications', onclick: () => { ui.tabletInbox = true; open('Home'); } }, '🔔', unread ? h('i', { class: 'tb-dot' }, String(unread)) : null)));
  if (ui.tabletSearch) body.append(found.length ? h('div', { class: 'tb-found' }, ...found.map((f) => h('button', { class: 'tb-chip', onclick: () => { ui.tabletSearch = ''; open(f.app); } }, `${f.app} · ${f.group}`))) : h('div', { class: 'tb-sub', style: 'padding:6px 4px' }, 'No app by that name.'));
  body.append(h('div', { class: 'tb-grid' }, ...tiles.map((t) => icon(t))), h('div', { class: 'grow' }),
    h('div', { class: 'tb-dock' }, ...DOCK.map((id) => tiles.find((t) => t.id === id)).filter(Boolean).map((t) => icon(t, true))));
}
