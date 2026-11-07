// Battalions in the command terminal (v0.103.5): raise a battalion from free squads, see and stand down the ones the company has, design battalion templates, and enlist in a theater.
// It is the same rules as the strategic map's dialogs (src/war/strategic.js: raise / disband / saveTemplate / enlist), laid out as panels. Nothing here advances the war: only the buttons
// act, and the strategic map (deploy, orders, movement) stays one button away.
import { h, panel, stats, stat, btn, chip, empty, kv, bar } from './kit.js';
import { SLOTS, MAX_LINE } from '../../content/strategic.js';
import { statsOf } from '../../war/strategic.js';

const form = (S) => (S.forces ||= { tpl: null, name: '', squads: [], design: { id: null, name: '', line: [], support: [], attach: [] } });

function needRows(W, tpl, squads) {
  const P = W.provided(squads);
  const have = (k) => (k === 'squads' ? P.squads : k === 'recon' ? (P.cls.recon || 0) + (P.role.recon || 0) : k.startsWith('role:') ? P.role[k.slice(5)] || 0 : P.cls[k.slice(4)] || 0);
  return W.needs(tpl).map((r) => h('div', { class: `osx-kv ${have(r.key) >= r.need ? 'ok' : 'bad'}` }, h('span', {}, `${r.icon} ${r.label}`), h('b', {}, `${have(r.key)} of ${r.need}`)));
}

function raisePanel(cx, F, templates, free) {
  const { W } = cx; const tpl = templates.find((t) => t.id === F.tpl) || templates[0]; F.tpl = tpl?.id || null; F.squads = F.squads.filter((id) => free.some((s) => s.id === id));
  const name = h('input', { class: 'osx-input', value: F.name, placeholder: 'name (optional)', style: 'width:200px', oninput: (e) => { F.name = e.target.value; } });
  return panel('Raise a battalion', [
    h('div', { class: 'osx-sub' }, 'A battalion is made of real squads and the vehicles in them. It is refused, and says what is short, if anything is missing. Nothing is invented.'),
    h('div', { class: 'osx-label' }, 'Template'),
    h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px' }, ...templates.map((t) => btn(t.name, () => { F.tpl = t.id; cx.refresh(); }, { kind: t.id === F.tpl ? 'pri' : '', title: `${t.line.length} line, ${(t.support || []).length + (t.attach || []).length} support` }))),
    h('div', { class: 'osx-label' }, `Squads (${F.squads.length} chosen)`),
    ...(free.length ? free.map((s) => h('label', { class: 'osx-row tap', style: 'cursor:pointer' }, h('span', {}, h('input', { type: 'checkbox', checked: F.squads.includes(s.id), onchange: (e) => { F.squads = e.target.checked ? [...F.squads, s.id] : F.squads.filter((x) => x !== s.id); cx.refresh(); } }), ` ${s.name} · ${s.size} soldiers${s.vehicles ? ` · ${s.vehicles} vehicles` : ''}`))) : [empty('No free squads. Hire soldiers and form squads on the "Hire and squads" tab first.')]),
    tpl ? h('div', { style: 'margin-top:8px' }, h('div', { class: 'osx-label' }, 'What it needs, against the chosen squads'), ...needRows(W, tpl, F.squads)) : null,
    h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, name, btn('Raise battalion', () => { const r = W.raise({ template: F.tpl, name: F.name, squads: F.squads }); if (r.ok) { F.squads = []; F.name = ''; } cx.go(r); }, { kind: 'pri', disabled: !tpl || !F.squads.length }))]);
}

function rosterPanel(cx, bns) {
  const { W, g } = cx;
  return panel('Battalions', bns.length ? bns.map((b) => {
    const s = statsOf(g, b); const tone = b.status === 'home' ? 'ok' : b.status === 'theatre' ? 'warn' : '';
    return h('div', { class: 'osx-row', style: 'display:block' },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, h('b', {}, b.name), chip(b.status === 'home' ? 'at home' : b.status === 'theatre' ? (b.engaged ? 'engaged' : 'in the theater') : b.status, tone)),
      h('div', { class: 'osx-sub' }, `${s.people} soldiers · ${s.vehicles} vehicles · strength ${s.strength}% · organisation ${s.org}% · soft ${s.soft} / hard ${s.hard} · march ${s.speed}`),
      h('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap' }, bar(s.strength / 100, s.strength < 50 ? 'bad' : ''), btn('Stand down', () => cx.go(W.standDown(b.id)), { disabled: b.status !== 'home', title: b.status === 'home' ? 'Free its squads and vehicles' : 'Bring it home first' }), btn('Orders on the map ›', () => cx.ui.openPanel('strategic'), { kind: 'sm' })));
  }) : [empty('No battalions yet. Raise one from free squads below.')], { right: btn('Strategic map ›', () => cx.ui.openPanel('strategic'), { kind: 'sm' }) });
}

function slotRow(cx, group, list) {
  return h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px' },
    ...list.map((k, i) => btn(`${SLOTS[group][k].icon} ${SLOTS[group][k].name} ✕`, () => { list.splice(i, 1); cx.refresh(); }, { title: 'Remove' })),
    ...Object.entries(SLOTS[group]).map(([k, d]) => btn(`+ ${d.name}`, () => { list.push(k); cx.refresh(); }, { kind: 'sm', disabled: group === 'line' && list.length >= MAX_LINE })));
}

function designPanel(cx, F, templates) {
  const { W } = cx; const D = F.design; const cur = templates.find((t) => t.id === D.id);
  const pick = (t) => { D.id = t.id; D.name = t.builtin ? `${t.name} (mine)` : t.name; D.line = [...t.line]; D.support = [...(t.support || [])]; D.attach = [...(t.attach || [])]; cx.refresh(); };
  const draft = { id: D.id && cur && !cur.builtin ? D.id : undefined, name: D.name, line: D.line, support: D.support, attach: D.attach };
  return panel('Battalion designer', [
    h('div', { class: 'osx-sub' }, 'A template is a recipe. Pick one to copy it, change the line, support companies and attachments, and save it under your own name. Your templates can then be raised above.'),
    h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0' }, ...templates.map((t) => btn(t.name, () => pick(t), { kind: D.id === t.id ? 'pri' : '' }))),
    D.id || D.line.length ? h('div', {},
      h('input', { class: 'osx-input', value: D.name, placeholder: 'template name', style: 'width:240px', oninput: (e) => { D.name = e.target.value; } }),
      h('div', { class: 'osx-label', style: 'margin-top:8px' }, `Line (${D.line.length} of ${MAX_LINE})`), slotRow(cx, 'line', D.line),
      h('div', { class: 'osx-label' }, 'Support companies'), slotRow(cx, 'support', D.support),
      h('div', { class: 'osx-label' }, 'Air and artillery attached'), slotRow(cx, 'attach', D.attach),
      h('div', { class: 'osx-label' }, 'What it asks'), ...(D.line.length ? needRows(W, { line: D.line, support: D.support, attach: D.attach }, []) : []),
      h('div', { style: 'display:flex;gap:8px;margin-top:8px' }, btn('Save template', () => { const r = W.saveTemplate(draft); if (r.ok) D.id = r.id; cx.go(r); }, { kind: 'pri', disabled: !D.line.length }), D.id && cur && !cur.builtin ? btn('Remove', () => { const r = W.removeTemplate(D.id); if (r.ok) { D.id = null; D.line = []; D.support = []; D.attach = []; } cx.go(r); }) : null)) : empty('Choose a template to start from.')]);
}

function employerPanel(cx, B) {
  const { W, g } = cx; const nm = (c) => g.content.arms.countries[c]?.name || c;
  if (B.employer) return panel('Employer', [kv('Serving', nm(B.employer.side)), kv('Against', nm(B.employer.enemy)), h('div', { class: 'osx-sub' }, 'Battalions are deployed, moved and given orders on the strategic map. Theater Operations shows the war from outside.'), h('div', { style: 'display:flex;gap:6px;margin-top:6px' }, btn('Strategic map ›', () => cx.ui.openPanel('strategic'), { kind: 'pri' }), btn('Theater Operations ›', () => cx.open('theaters')))]);
  const th = W.theatres();
  return panel('Enlist in a theater', [h('div', { class: 'osx-sub' }, 'A nation at war hires you for its side: its ships carry your battalions, it pays a retainer for every soldier and vehicle in the theater, and a bonus for every victory point you take.'),
    ...th.map((t) => h('div', { class: 'osx-row' }, h('span', {}, h('b', {}, t.name), ` · ${t.kind} · ${t.hot ? 'fighting' : 'quiet'}`), h('span', { style: 'display:flex;gap:6px' }, ...t.between.map((c) => btn(`for ${nm(c)}`, () => cx.go(W.enlist({ theatre: t.id, side: c })), { kind: 'pri', disabled: !t.hot })))))]);
}

export function renderForces(cx, box) {
  const { W, S } = cx; const F = form(S.base || (S.base = { tab: 'forces', sel: null })); const B = W.briefing();
  const templates = W.templates(); const bns = W.peek()?.war?.battalions || []; const free = W.squads().filter((s) => s.status === 'home').map((s) => ({ id: s.id, name: s.name, size: s.members?.length ?? s.size, vehicles: (s.vehicles || []).length }));
  box.append(stats(stat('Battalions', String(bns.length)), stat('Away', String(bns.filter((b) => b.status !== 'home').length), { tone: bns.some((b) => b.status !== 'home') ? 'warn' : '' }), stat('Free squads', String(free.length)), stat('Templates', String(templates.length))));
  box.append(h('div', { style: 'height:8px' }));
  box.append(h('div', { class: 'osx-grid osx-g2' }, h('div', { class: 'osx-side' }, rosterPanel(cx, bns), raisePanel(cx, F, templates, free)), h('div', { class: 'osx-side' }, employerPanel(cx, B), designPanel(cx, F, templates))));
}
