// The mercenary company's command terminal (v0.103.4): one operating system with seven sections, in an intelligence-terminal look. It stands in the site office at Hollowmoor Lot and is one tap away from the
// OberPad's Military app (the way the aerospace terminal is). It is only an interface: every figure is read from the real records (src/war/briefing.js and the war API) and every button calls the API.
// Shell: a left rail (seven sections), a top bar (company, status, funds, date and time, missions, readiness, base, and the time controls the aerospace terminal has), and the section.
import { h, btn, empty } from './kit.js';
import { renderOverview } from './overview.js';
import { renderBase } from './base.js';
import { renderProcurement } from './procurement.js';
import { renderLogistics } from './logistics.js';
import { renderMissions } from './missions.js';
import { renderIntel } from './intel.js';
import { renderTheaters } from './theaters.js';

export const SECTIONS = [
  { id: 'overview', name: 'Command Overview', icon: '◈', sub: 'The company at a glance: funds, forces, operations, the base and the world.', render: renderOverview },
  { id: 'base', name: 'Base Operations', icon: '▦', sub: 'The Hollowmoor installation: inspect, build and upgrade its facilities, and run its people.', render: renderBase },
  { id: 'procurement', name: 'Procurement', icon: '⛁', sub: 'Buy from outside suppliers at a cost. Orders are paid once and delivered on a day.', render: renderProcurement },
  { id: 'logistics', name: 'Internal Logistics', icon: '⇄', sub: 'Move goods from your own businesses into the company. Always free: no sale, no fee, no charge.', render: renderLogistics },
  { id: 'missions', name: 'Mission Control', icon: '◎', sub: 'Contracts and engagements: brief, assign forces, track and review.', render: renderMissions },
  { id: 'intel', name: 'Global Intelligence', icon: '◍', sub: 'The world: borders, conflicts and the developments around them.', render: renderIntel },
  { id: 'theaters', name: 'Theater Operations', icon: '▤', sub: 'Detailed maps of any theater of war, whether or not the company is in it.', render: renderTheaters },
];

const MIN = { h1: 60, h6: 360 };

export function osintTerminalPanel(ui, body, opts = {}) {
  const g = ui.game; const W = g.war;
  const S = (ui.osx ||= { section: 'overview', maps: {}, msg: null });
  if (opts.section && SECTIONS.some((x) => x.id === opts.section)) S.section = opts.section;
  // an engagement opened from the strategic map ("Decide the battle") lands on Mission Control
  if (ui.milSub === 'Engagement' && ui.milEng) { S.section = 'missions'; S.mission = { kind: 'engagement', id: ui.milEng }; ui.milSub = null; }
  body.classList.add('osx');
  const top = h('div', { class: 'osx-top' }); const nav = h('nav', { class: 'osx-nav' });
  const head = h('div', { class: 'osx-head' }); const note = h('div', { class: 'osx-note', style: 'display:none' }); const scroll = h('div', { class: 'osx-scroll' });
  const main = h('div', { class: 'osx-main' }, head, note, scroll);
  body.append(top, h('div', { class: 'osx-wrap' }, nav, main));
  let alive = true; let ff = null;

  const cx = {
    ui, g, W, S,
    go(r) { if (r?.text) { S.msg = { text: r.text, ok: r.ok !== false }; ui.audio.sfx(r.ok === false ? 'sfx_fail' : 'sfx_coin'); } render(); },
    refresh() { render(); },
    open(section, patch) { S.section = section; if (patch) Object.assign(S, patch); S.msg = null; render(); },
    say(text, ok = true) { S.msg = { text, ok }; showNote(); },
  };

  function showNote() { if (S.msg) { note.textContent = S.msg.text; note.className = `osx-note${S.msg.ok ? '' : ' bad'}`; note.style.display = ''; } else note.style.display = 'none'; }

  // ------------------------------------------------------------------ time (the same controls the aerospace terminal has: time only passes when you ask)
  function pass(minutes) {
    if (ff) return;
    ff = { left: minutes };
    const step = () => {
      if (!alive) return;
      if (ff.left <= 0) { ff = null; render(); return; }
      const chunk = Math.min(ff.left, Math.max(4, Math.ceil(ff.left / 40)));
      g.skipTime(chunk); ff.left -= chunk; topBar(); setTimeout(step, 30);
    };
    topBar(); step();
  }
  const toMorning = () => { const m = g.clock.minuteOfDay; return m < 360 ? 360 - m : 1440 - m + 360; };

  function topBar() {
    const B = W.briefing(); top.replaceChildren();
    if (!B) { top.append(h('div', { class: 'osx-brand' }, h('b', {}, 'Command terminal'), h('small', {}, 'Hollowmoor Lot · site office')), h('div', { class: 'osx-sp' }), btn('✕ Close', () => ui.closePanel())); return; }
    const f = (label, val, tone = '') => h('div', { class: `osx-tf ${tone}` }, h('small', {}, label), h('b', {}, val));
    const rtone = B.readiness >= 70 ? 'ok' : B.readiness >= 40 ? 'warn' : 'bad';
    const baseTone = !B.base.online ? 'warn' : !B.base.protectedBase ? 'bad' : B.base.damaged ? 'warn' : 'ok';
    top.append(h('div', { class: 'osx-brand' }, h('b', {}, B.name), h('small', {}, 'Command terminal · Hollowmoor Lot')),
      f('Status', B.status, B.status === 'On operations' ? 'ok' : B.status === 'Standing by' ? '' : 'warn'), f('Funds', `${Math.round(B.funds).toLocaleString('en-US')} ◎`, B.funds > 0 ? '' : 'warn'),
      f('Date / time', `Day ${g.clock.day} · ${g.clock.timeString}`), f('Operations', String(B.missions.active), B.missions.active ? 'ok' : ''), f('Readiness', `${B.readiness}%`, rtone),
      f('Base', !B.base.online ? 'not built' : !B.base.protectedBase ? 'AT RISK' : B.base.damaged ? `${B.base.damaged} damaged` : `${B.base.built}/${B.base.total} built`, baseTone),
      h('div', { class: 'osx-sp' }),
      h('div', { class: 'osx-time' }, btn('+1 h', () => pass(MIN.h1), { kind: 'sm', disabled: Boolean(ff) }), btn('+6 h', () => pass(MIN.h6), { kind: 'sm', disabled: Boolean(ff) }), btn(ff ? 'Time passing…' : '⏭ Next morning', () => pass(toMorning()), { kind: 'pri sm', disabled: Boolean(ff), title: 'Let time pass until 06:00, when orders arrive and the day\'s business is done' })),
      btn('✕ Close', () => ui.closePanel()));
  }

  function navBar() {
    const B = W.briefing(); const sup = W.supplyLink(); const O = W.orders();
    const badge = { procurement: O.transit.length + O.pending.length, logistics: sup ? sup.rows.filter((r) => r.want && r.have < r.want).length : 0, missions: B?.missions.open || 0 };
    nav.replaceChildren(...SECTIONS.map((s) => h('button', { class: S.section === s.id ? 'on' : '', onclick: () => cx.open(s.id) }, h('span', { class: 'ic' }, s.icon), h('span', {}, s.name), badge[s.id] ? h('span', { class: 'nb' }, String(badge[s.id])) : null)));
  }

  function render() {
    if (!alive) return;
    const sec = SECTIONS.find((x) => x.id === S.section) || SECTIONS[0];
    for (const m of Object.values(S.maps)) m.unmount?.();
    topBar(); navBar();
    head.replaceChildren(h('h1', {}, sec.name), h('p', {}, sec.sub)); showNote();
    scroll.replaceChildren();
    if (!W.briefing()) { scroll.append(empty('No company is registered. Register one in the Military app on your OberPad: a name, some money, the Civic Office licence, then Hollowmoor Lot.')); return; }
    scroll.scrollTop = 0;
    try { sec.render(cx, scroll); } catch (err) { scroll.append(h('div', { class: 'osx-empty' }, `This page could not be drawn: ${err.message}`)); console.error(err); }
  }
  render();
  return { title: '', className: 'osx-panel', onClose: () => { alive = false; ff = null; for (const m of Object.values(S.maps)) m.unmount?.(); } };
}
