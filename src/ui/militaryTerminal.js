// The company's command terminal (v0.103.2, streamlined in v0.103.3; mock-up proposal-war-terminal-v2.png): the mercenary business is run from the site office at Hollowmoor Lot. A full-screen
// terminal in the style of the arms and aerospace terminals: a side bar of five pages (Home, Troops, Stores, Missions, Map) and the page. The pages themselves are src/ui/militaryPages.js, the
// same ones the Military app on the OberPad shows. Every button calls game.war; nothing here writes a record.
import { h } from './panels.js';
import { note, n } from './tabletKit.js';
import { PAGES, badges, renderPage } from './militaryPages.js';

export function militaryTerminalPanel(ui, body) {
  const g = ui.game; const W = g.war; body.classList.add('milterm');
  const top = h('div', { class: 'mt-top' }); const side = h('nav', { class: 'mt-nav' }); const main = h('main', { class: 'mt-main' });
  body.append(top, h('div', { class: 'mt-wrap' }, side, main));
  let alive = true;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); render(); };
  const open = () => render();
  const pick = (id) => { ui.milPage = id; ui.milSub = null; render(); };

  function render() {
    if (!alive) return;
    const V = W.companyView();
    top.replaceChildren();
    if (!V) {
      top.append(h('div', {}, h('h1', {}, 'COMMAND TERMINAL'), h('small', {}, 'Hollowmoor Lot · site office')), h('div', { class: 'sp' }), h('button', { class: 'mt-x', onclick: () => ui.closePanel() }, '✕ Step away'));
      side.replaceChildren(); main.replaceChildren(h('div', { class: 'tb-card', style: 'padding:16px' }, h('b', {}, 'No company is registered.'), h('p', {}, 'Register one in the Military app on your OberPad: a name, some money, the Civic Office licence, then this lot.')));
      return;
    }
    const page = PAGES.includes(ui.milPage) ? ui.milPage : 'Home';
    top.append(h('div', {}, h('h1', {}, `${V.name.toUpperCase()} · COMMAND TERMINAL`), h('small', {}, 'Hollowmoor Lot · site office')), h('div', { class: 'sp' }),
      h('div', {}, h('small', {}, 'CASH'), h('b', {}, n(V.cash))), h('div', {}, h('small', {}, 'DAY'), h('b', {}, `${g.clock.day} · ${g.clock.timeString}`)), h('button', { class: 'mt-x', onclick: () => ui.closePanel() }, '✕ Step away'));
    const bd = badges(ui);
    side.replaceChildren(...PAGES.map((id) => h('button', { class: `mt-item${page === id ? ' on' : ''}`, onclick: () => (id === 'Map' ? ui.openPanel('strategic') : pick(id)) }, h('span', {}, id), bd[id] ? h('em', { class: 'w' }, bd[id]) : null)));
    const box = h('div', { class: 'mt-page' });
    const nt = note(ui); if (nt) box.append(nt);
    renderPage(ui, box, go, open, page);
    main.replaceChildren(box);
  }
  render();
  return { title: '', className: 'milterm-panel', onClose: () => { alive = false; } };
}
