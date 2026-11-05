// The Military app's Production page (v0.99.0; mock-up proposal-war-oberpad-company.png page 3): tanks and helicopters only. Lines and why one is blocked, the queue, the parts the queue needs,
// the crew, and the works' own condition. Every button calls game.war.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n, segments } from './tabletKit.js';
import { PEOPLE } from '../content/production.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);
const bar = (f, bad) => h('div', { style: 'height:6px;border-radius:3px;background:rgba(255,255,255,.1);margin:4px 0' }, h('div', { style: `height:6px;border-radius:3px;width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%;background:${bad ? '#e0705a' : '#8fd18f'}` }));

export function productionTab(ui, body, go, open) {
  const g = ui.game; const W = g.war; const P = W.production();
  const SEG = [{ id: 'tank', label: 'Tanks' }, { id: 'helicopter', label: 'Helicopters' }, { id: 'queue', label: 'Queue' }];
  const tab = SEG.some((x) => x.id === ui.milProd) ? ui.milProd : 'tank';
  const running = P.lines.filter((l) => l.model).length;
  body.append(
    hero({ label: 'Production · tanks and helicopters only', value: `${running} line${running === 1 ? '' : 's'} working`, sub: `${P.technicians} technician${P.technicians === 1 ? '' : 's'} on the books. Planes, missiles, guns and ships are never made here: they come from your other companies.` }),
    tiles([{ n: String(P.orders.reduce((a, o) => a + o.left, 0)), t: 'units waiting' }, { n: String(P.lines.filter((l) => l.blocked).length), t: 'blocked' }, { n: n(g.war.cash()), t: 'company cash' }]));
  body.append(segments(SEG, tab, (t) => { ui.milProd = t; open('Military'); }));
  if (tab === 'queue') { queue(ui, body, go, P, W); return; }
  const works = tab === 'tank' ? 'tank_factory' : 'helicopter_works';
  const WK = P.works.find((x) => x.id === works);
  if (!WK.built) { body.append(list(row({ icon: '🏭', title: `No ${WK.name.toLowerCase()} yet`, sub: 'Build it from the Company page (stage 3: it needs the stage before it).' }))); return; }
  for (const l of P.lines.filter((x) => x.works === works)) {
    body.append(h('div', { class: 'tb-card', style: 'padding:10px 12px' },
      h('div', { class: 'tb-row' }, h('div', { class: 'grow' }, h('b', {}, `Line ${l.id} · ${l.blocked && !l.model ? 'blocked' : l.model ? 'working' : 'idle'}`), h('small', {}, l.model ? `${P.models.find((m) => m.id === l.model).name} · ${Math.round(l.progress * 100)}%` : l.blocked || 'Waiting for an order')),
        h('span', {}, h('button', { class: 'tb-mini', disabled: l.shifts <= 1, onclick: () => go(W.shifts(l.id, l.shifts - 1)) }, '−'), ` Shifts: ${l.shifts} `, h('button', { class: 'tb-mini', disabled: l.shifts >= 3, onclick: () => go(W.shifts(l.id, l.shifts + 1)) }, '+'))),
      bar(l.progress, Boolean(l.blocked)), l.blocked && l.model ? h('small', { style: 'color:#e0a070' }, l.blocked) : null, h('small', {}, `Crew needed: ${l.crew} technicians`)));
  }
  body.append(list(row({ icon: '🛠️', title: `${WK.name} · level ${WK.level}`, sub: `Wear ${WK.wear}% · builds at ${Math.round(WK.eff * 100)}% speed`,
    action: h('span', {}, WK.upgrade != null ? h('button', { class: 'tb-mini pri', disabled: g.war.cash() < WK.upgrade, onclick: () => go(W.upgrade(works)) }, `Upgrade ${n(WK.upgrade)}`) : null, ' ', WK.wear >= 5 ? h('button', { class: 'tb-mini', disabled: g.war.cash() < WK.maintain, onclick: () => go(W.maintain(works)) }, `Mend ${n(WK.maintain)}`) : null) })));
  body.append(label('Order'));
  body.append(list(...P.models.filter((m) => m.works === works).map((m) => row({ icon: works === 'tank_factory' ? '🛡️' : '🚁', title: `${m.name}`, sub: `${m.days} days · ${Object.entries(m.parts).map(([k, q]) => `${q} ${k}`).join(', ')} · fee ${n(m.fee)}`, tag: n(m.price),
    action: h('span', {}, h('button', { class: 'tb-mini pri', onclick: () => go(W.order(m.id, 1)) }, '1'), ' ', h('button', { class: 'tb-mini pri', onclick: () => go(W.order(m.id, 3)) }, '3')) }))));
  body.append(help('How a line works', 'A line starts a unit when its parts are in the stores, its fee can be paid and its technicians are free; the fee and the parts are spent then. More shifts finish a unit sooner and need more technicians. A line that cannot start, or cannot house what it made, says why.'));
}

function queue(ui, body, go, P, W) {
  body.append(label('Orders'));
  body.append(list(...(P.orders.length ? P.orders.map((o) => row({ icon: '📋', title: `${o.name} · ${o.done}/${o.qty} done`, sub: `${o.left} not yet started`, action: o.left ? h('button', { class: 'tb-mini', onclick: () => go(W.cancelOrder(o.id)) }, 'Cancel the rest') : null })) : [row({ icon: '—', title: 'No orders', sub: 'Order tanks or helicopters on their pages.' })])));
  body.append(label('Parts this queue needs'));
  body.append(list(...(P.needs.length ? P.needs.map((x) => row({ icon: '⚙️', title: x.name, sub: `${x.have} in the stores, ${x.need} needed`, tag: x.have >= x.need ? '✓' : `short ${x.need - x.have}`, tone: x.have >= x.need ? 'good' : 'warn' })) : [row({ icon: '—', title: 'Nothing needed', sub: 'Parts are bought on the Transfers page (Buy from suppliers).' })])));
  body.append(label('The crew'));
  const people = W.people();
  body.append(list(...Object.entries(PEOPLE).map(([role, def]) => row({ icon: role === 'guard' ? '💂' : '🧑‍🏭', title: `${def.name}s · ${people.filter((p) => p.role === role).length}`, sub: `${def.text} ${def.wage} obols a day each.`, action: h('span', {}, h('button', { class: 'tb-mini pri', onclick: () => go(W.hire(role)) }, 'Hire'), ' ', h('button', { class: 'tb-mini', disabled: !people.some((p) => p.role === role && !p.post && p.assignedTo == null), onclick: () => go(W.dismiss(people.filter((p) => p.role === role && !p.post && p.assignedTo == null).slice(-1)[0]?.id)) }, 'Let one go')) }))));
}
