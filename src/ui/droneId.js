// The drone ID panel (v0.92.0): every drone launch station gets its own unique ID when you place it, and every receiving station is
// tied to one drone. Nothing is placed until this panel says so, through the works' own place().
import { h } from './panels.js';

export function droneIdPanel(ui, body, opts) {
  const { sys, wh, item, x, y, dir } = opts;
  const g = ui.game;
  const it = g.content.items[item];
  const role = it.build.drone;
  const max = g.content.arms.drones.idMax;
  const msg = h('p', { class: 'muted' }, role === 'launch' ? `Every drone has a unique ID (1 to ${max} letters, numbers or dashes). Its launch station and its receiving station belong only to it.` : 'A receiving station belongs to one drone. Choose the drone that lands here. Only that drone can.');
  const say = (r) => { msg.textContent = r.text; msg.className = r.ok ? '' : 'neg'; };
  const done = (r) => {
    ui.audio.sfx(r.ok ? 'sfx_door' : 'sfx_fail');
    if (r.ok) { ui.buildBarKey = null; ui.closePanel(); ui.toast(r.text, 'info', 3); } else say(r);
  };
  const place = (droneId) => done(sys.place(wh, item, x, y, dir, null, { droneId }));
  if (role === 'launch') {
    const input = h('input', { type: 'text', class: 'debug-input', maxlength: max, placeholder: 'e.g. A1', style: 'width:100%;font-size:18px;text-transform:uppercase' });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') place(input.value); });
    const taken = sys.drones().map((d) => d.id);
    body.append(h('p', { class: 'doc' }, `Name this drone. ${taken.length ? `In use: ${taken.join(', ')}.` : 'You have no drones yet.'}`), input, msg,
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' }, h('button', { class: 'primary', onclick: () => place(input.value) }, 'Place launch station'), h('button', { class: 'ghost', onclick: () => ui.closePanel() }, 'Cancel')));
    setTimeout(() => input.focus(), 0);
  } else {
    const free = sys.drones().filter((d) => d.launch && !d.recv);
    body.append(h('p', { class: 'doc' }, free.length ? 'Which drone lands here?' : 'Every drone already has a receiving station, or you have no drones. Place a launch station first.'), msg);
    for (const d of free) body.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '🛸'), h('div', { class: 'grow' }, h('div', { class: 'name' }, `Drone ${d.id}`), h('div', { class: 'desc' }, `Launches from ${sys.def(d.launch.wh).name} at ${d.launch.e.x},${d.launch.e.y}`)), h('button', { class: 'small primary', onclick: () => place(d.id) }, 'Land here')));
    body.append(h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' }, h('button', { class: 'ghost', onclick: () => ui.closePanel() }, 'Cancel')));
  }
  return { title: role === 'launch' ? 'New drone' : 'Receiving station' };
}
