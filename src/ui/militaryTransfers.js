// The Military app's Transfers page (v0.99.0; mock-up proposal-war-oberpad-company.png page 2): what can move free from your other companies, what the company holds, and what suppliers sell.
// Every button calls game.war; nothing here changes a record.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n } from './tabletKit.js';
import { VEHICLES, VEHICLE_CLASSES, SUPPLIES } from '../content/procurement.js';
import { stockName } from '../war/equipment.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);

export function transfersTab(ui, body, go) {
  const g = ui.game; const W = g.war;
  const O = W.offers(); const H = W.housing(); const eq = W.equipment(); const st = Object.entries(W.stock());
  const free = O.aero.length + O.arms.reduce((a, x) => a + x.have, 0);
  body.append(
    hero({ label: 'Free between your companies', value: `${n(free)} to move`, sub: 'Moving an item is not a sale: no money, no fee, no entry. What moves is gone from where it was.' }),
    tiles([{ n: `${H.ground.used}/${H.ground.total}`, t: 'vehicle bays' }, { n: `${H.air.used}/${H.air.total}`, t: 'hangar bays' }, { n: n(H.stores.used), t: 'held in stores (no limit)' }]));
  if (O.aero.length) body.append(label('From Aerospace · stored military aircraft and strategic products'), list(...O.aero.map((a) => row({ icon: a.line === 'missile' ? '🚀' : '✈️', title: a.name, sub: a.line === 'missile' ? `Strategic product, in the secure store · takes 20 places in the stores` : `Finished, in storage · quality ${a.quality}`, tag: 'free', tone: 'good', action: h('button', { class: 'tb-mini pri', onclick: () => go(W.transfer({ source: 'aero', ref: a.ref })) }, 'Move') }))));
  if (O.arms.length) body.append(label('From the Arms works · export cages'), list(...O.arms.map((a) => row({ icon: '🔫', title: `${a.name} · ${a.have}`, sub: a.from, tag: 'free', tone: 'good',
    action: h('span', {}, h('button', { class: 'tb-mini pri', onclick: () => go(W.transfer({ source: 'arms', works: a.works, item: a.item, qty: 1 })) }, '1'), ' ', h('button', { class: 'tb-mini pri', onclick: () => go(W.transfer({ source: 'arms', works: a.works, item: a.item, qty: a.have })) }, 'All')) }))));
  if (!O.aero.length && !O.arms.length) body.append(list(row({ icon: '—', title: 'Nothing waiting', sub: 'Stored military aircraft from Aerospace and weapons, rockets, missiles and drones from an Arms works\' export cage can move here.' })));
  body.append(label('What the company holds'));
  body.append(list(...(eq.length || st.length ? [
    ...eq.map((x) => row({ icon: x.kind === 'aircraft' ? '✈️' : x.kind === 'missile' ? '🚀' : x.kind === 'helicopter' ? '🚁' : '🚙', title: `${x.name} · ${x.id}`, sub: `${x.location.replace('facility:', '').replace('_', ' ')} · ${x.status}${x.assignedTo ? ` · ${x.assignedTo}` : ''}`, tag: x.source === 'aero' ? 'from Aerospace' : x.source,
      action: x.origin && x.status === 'stored' && !x.assignedTo ? h('button', { class: 'tb-mini', onclick: () => go(W.giveBack({ id: x.id })) }, 'Return') : null })),
    ...st.map(([key, q]) => row({ icon: key.startsWith('arms:') ? '🔫' : '📦', title: `${stockName(g, key)} · ${n(q)}`, sub: key.startsWith('arms:') ? 'from the Arms works' : 'bought', action: key.startsWith('arms:') ? h('button', { class: 'tb-mini', onclick: () => go(W.giveBack({ key, qty: q })) }, 'Return all') : null })),
  ] : [row({ icon: '—', title: 'Nothing yet', sub: 'Build the armoury cage for stores, a motor pool for vehicles and hangars for aircraft.' })])));
  body.append(fold(ui, 'MilBuy', 'Buy from suppliers ›', (box) => {
    const byClass = {};
    for (const v of Object.values(VEHICLES)) if (v.source === 'bought') (byClass[v.class] ||= []).push(v);
    for (const [cls, vs] of Object.entries(byClass)) box.append(label(VEHICLE_CLASSES[cls]), list(...vs.map((v) => row({ icon: '🚙', title: v.name, sub: v.text, tag: `${n(v.price)}`, action: h('button', { class: 'tb-mini pri', disabled: W.cash() < v.price, onclick: () => go(W.buyVehicle(v.id)) }, 'Buy') }))));
    box.append(label('Supplies and parts'), list(...Object.entries(SUPPLIES).map(([id, s]) => row({ icon: s.group === 'part' ? '⚙️' : '📦', title: s.name, sub: s.text, tag: `${n(s.price)}`, action: h('span', {}, h('button', { class: 'tb-mini pri', disabled: W.cash() < s.price, onclick: () => go(W.buySupply(id, 1)) }, '1'), ' ', h('button', { class: 'tb-mini pri', disabled: W.cash() < s.price * 10, onclick: () => go(W.buySupply(id, 10)) }, '10')) }))));
  }));
  body.append(fold(ui, 'MilTrail', 'The trail of moves ›', (box) => box.append(list(...(W.transfers().length ? W.transfers().slice().reverse().map((t) => row({ icon: t.status === 'returned' ? '↩️' : '➡️', title: `${t.qty} × ${t.name}`, sub: `Day ${t.day} · ${t.from} → ${t.to}` })) : [row({ icon: '—', title: 'No moves yet', sub: 'A transfer is a line here, never a money entry.' })])))));
  body.append(help('Rules of a transfer', 'It is free and happens in one step: it is either done or nothing changes. An item that is assigned, in use or destroyed cannot be returned, and what was bought or built here has nowhere to go back to. The company never builds planes, missiles, guns or ships.'));
}
