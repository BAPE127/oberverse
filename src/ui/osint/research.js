// Research (v0.103.8): Base Operations → Research. The company's tree to tier 4, as cards by tier: what each project costs and how long it runs, what it needs, what it opens, and a button that says
// why it cannot start when it cannot. DOM only: every button calls game.war.
import { h, panel, stats, stat, btn, chip, bar, kv } from './kit.js';

const M = (x) => `${Math.round(x / 1e5) / 10}M`;
const fmt = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');
const TIERS = { 3: ['TIER 3 · THE FIRST FUTURE', 'Pulse weapons, the Phalanx hardsuit, hover vehicles.'], 4: ['TIER 4 · THE SECOND FUTURE', 'Plasma, rail and ion weapons, Bastion power armour, heavy hover platforms.'] };
const STATE = { done: ['finished', 'ok'], active: ['under way', 'bl'], open: ['ready to start', ''], locked: ['locked', ''] };

export function renderResearch(cx, box) {
  const { W } = cx; const R = W.research();
  if (!R) return;
  const all = Object.fromEntries(R.nodes.map((n) => [n.id, n]));
  box.append(stats(stat('Weapons', `tier ${R.reach.weapon}`, { sub: 'of 4' }), stat('Armour', `era ${R.reach.armour}`, { sub: 'of 4' }), stat('Vehicles', `era ${R.reach.vehicle}`, { sub: 'of 4' }),
    stat('Researched', `${M(R.spent)} / ${M(R.total)}`, { sub: 'obols, to reach tier 4' }), stat('Company can spend', `${fmt(W.cash())} ◎`)));
  box.append(h('div', { style: 'height:8px' }));
  if (!R.hq) box.append(h('div', { class: 'osx-note bad', style: 'margin:0 0 8px' }, 'Research needs the Command HQ built: build it on the Facilities tab (stage 2).'));
  if (R.active) box.append(panel('Under way', [h('div', { class: 'osx-sqh' }, h('b', {}, R.active.name), chip(`${R.active.daysLeft} day${R.active.daysLeft === 1 ? '' : 's'} left`, 'bl')),
    bar(1 - R.active.daysLeft / Math.max(1, R.active.end - R.active.start), ''), h('small', { class: 'osx-sub', style: 'padding:0' }, `Paid ${fmt(R.active.paid)} ◎ on day ${R.active.start}; it finishes on day ${R.active.end}.`)]), h('div', { style: 'height:8px' }));
  for (const t of [3, 4]) {
    const nodes = R.nodes.filter((n) => n.tier === t);
    box.append(panel(TIERS[t][0], [h('div', { class: 'osx-fgrid' }, ...nodes.map((n) => {
      const [label, tone] = STATE[n.state];
      return h('div', { class: `osx-fbay ${n.state === 'active' ? 'working' : ''}` }, h('i', { class: 'c tl' }), h('i', { class: 'c tr' }), h('i', { class: 'c bl' }), h('i', { class: 'c br' }),
        h('div', { class: 'osx-sqh' }, h('b', {}, n.name.toUpperCase()), chip(label, tone)), h('small', { class: 'osx-sub', style: 'padding:0' }, n.text),
        kv('Cost', `${fmt(n.cost)} ◎`), kv('Takes', `${n.days} days`), n.requires.length ? kv('Needs', n.requires.map((q) => all[q].name).join(', '), n.requires.every((q) => all[q].state === 'done') ? 'ok' : 'warn') : null,
        n.state === 'done' ? h('small', { class: 'osx-sub', style: 'padding:0' }, `Finished on day ${n.finished}.`) : n.state === 'active' ? null : btn('Start research', () => cx.go(W.startResearch(n.id)), { kind: 'pri sm', disabled: Boolean(n.why), title: n.why || 'Pay for it and start the project' }),
        n.why && n.state !== 'done' && n.state !== 'active' ? h('small', { class: 'osx-sub', style: 'padding:0;color:var(--am)' }, n.why) : null);
    }))], { sub: TIERS[t][1] }), h('div', { style: 'height:8px' }));
  }
  box.append(panel('Log', R.log.length ? R.log.slice().reverse().map((l) => h('div', { class: 'osx-feed' }, h('span', { class: 'osx-fd' }, `day ${l.day}`), h('span', {}, l.text))) : [h('div', { class: 'osx-empty' }, 'Nothing researched yet.')]));
}
