// The squad board (v0.103.6): Base Operations → Hire and squads, laid out like the aerospace company's hangar floor. One card per squad (its patch, its soldiers painted in its colours, twelve
// places, its vehicles); click a card to open it: members, leader, vehicles, and the look with a live picture. Recruits are hired into a chosen squad and hold a place in it while they train.
// DOM and canvases only: every button calls game.war.
import { h, panel, stats, stat, btn, chip, bar, kv, empty } from './kit.js';
import { CLASSES, TROOP_CLASSES, ARMOUR, LOOKS, SQUAD } from '../../content/troops.js';
import { SUPPLIES } from '../../content/procurement.js';
import { paintMachine, paintSquad, paintPatch, GLYPH, GLYPH_COLOUR } from './sprites.js';

const state = (S) => (S.base ||= { tab: 'people', sel: null });

function canvas(w, hh, paint, cls = 'osx-sqart') {
  const c = h('canvas', { class: cls, width: w, height: hh }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  try { paint(g, w, hh); } catch (err) { console.error(err); }
  return c;
}

/** The soldiers of a squad in order: the leader first, then the rest. */
function rosterOf(s, P) {
  const mem = s.members.map((m) => P.find((x) => x.id === m)).filter(Boolean);
  return mem.sort((a, b) => (s.leader === b.id) - (s.leader === a.id));
}

/** The squad's picture: patch, soldiers in its colours, vehicles. */
function squadArt(s, P, E, w, hh, { big = false } = {}) {
  return canvas(w, hh, (g) => {
    g.fillStyle = '#0d1411'; g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(120,160,110,.05)'; for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 1, hh); for (let y = 0; y < hh; y += 12) g.fillRect(0, y, w, 1);
    const roster = rosterOf(s, P).filter((p) => p.status === 'active'); const roles = roster.map((p) => p.role);
    if (big) {
      paintPatch(g, s.look, 10, 10, 56);
      paintSquad(g, roles.slice(0, 6), s.look, 86, 98, { scale: 1.7, gap: 17 }); paintSquad(g, roles.slice(6, 12), s.look, 86, 164, { scale: 1.7, gap: 17 });
      if (!roles.length) { g.fillStyle = '#6a7a71'; g.font = '12px ui-monospace, monospace'; g.fillText('No one in this squad yet', 84, 100); }
      E.slice(0, 2).forEach((e, i) => paintMachine(g, e.type, w - 70, 56 + i * 80, { heading: Math.PI / 2, scale: 0.85 }));
    } else {
      paintPatch(g, s.look, 8, 12, 40);
      paintSquad(g, roles.slice(0, 6), s.look, 66, hh - 8, { scale: 1.15, gap: 17 });
      if (!roles.length) { g.fillStyle = '#5c6b63'; g.font = '11px ui-monospace, monospace'; g.fillText('empty', 64, hh - 22); }
      if (E[0]) paintMachine(g, E[0].type, w - 34, hh / 2 + 2, { heading: Math.PI / 2, scale: 0.5 });
    }
  });
}

function slots(s, P) {
  const mem = rosterOf(s, P); const train = s.incoming || []; const cells = [];
  for (const p of mem) cells.push(h('span', { class: `osx-slot${s.leader === p.id ? ' lead' : ''}`, style: `--c:${GLYPH_COLOUR[p.role] || '#8fae6a'}`, title: `${p.name} · ${CLASSES[p.role]?.name}${p.weapon ? '' : ' · unarmed'}` }, GLYPH[p.role] || '·'));
  for (const t of train) cells.push(h('span', { class: 'osx-slot train', style: `--c:${GLYPH_COLOUR[t.role] || '#8fae6a'}`, title: `${t.name} · ${CLASSES[t.role]?.name} · training, joins day ${t.ready}` }, GLYPH[t.role] || '·'));
  while (cells.length < SQUAD.max) cells.push(h('span', { class: 'osx-slot free' }, ''));
  return h('div', { class: 'osx-slots' }, ...cells);
}

function squadCard(cx, s, P, E, sel) {
  const mine = E.filter((e) => s.equipment.includes(e.id)); const mem = rosterOf(s, P); const unarmed = mem.filter((p) => !p.weapon).length;
  const away = s.status !== 'home'; const tone = away ? 'bl' : !s.leader && s.size ? 'warn' : 'ok';
  return h('div', { class: `osx-sq${sel ? ' on' : ''}${away ? ' away' : ''}`, onclick: () => { state(cx.S).sel = s.id; cx.refresh(); } },
    h('i', { class: 'c tl' }), h('i', { class: 'c tr' }), h('i', { class: 'c bl' }), h('i', { class: 'c br' }),
    h('div', { class: 'osx-sqh' }, h('b', {}, `SQUAD ${s.name.toUpperCase()}`), chip(away ? (s.status === 'battalion' ? 'in a battalion' : 'away') : s.size ? 'at base' : 'empty', tone)),
    squadArt(s, P, mine, 240, 70),
    slots(s, P),
    h('div', { class: 'osx-sqf' }, h('span', {}, s.leaderName ? `★ ${s.leaderName}` : (s.size ? 'no leader' : '—')), h('span', {}, `${s.size}/${SQUAD.max}${(s.incoming || []).length ? ` +${s.incoming.length} training` : ''}`),
      h('span', { class: unarmed ? 'warn' : '' }, mem.length ? (unarmed ? `${unarmed} unarmed` : 'armed') : ''), mine.length ? h('span', {}, `${mine.length} vehicle${mine.length === 1 ? '' : 's'}`) : null),
    bar(s.morale / 100, s.morale < 40 ? 'bad' : s.morale < 60 ? 'warn' : ''));
}

function hirePanel(cx, P, target) {
  const { W } = cx; const st = W.stock(); const cap = W.capacity(); const training = P.filter((p) => p.status === 'training').length;
  const S = W.squads(); const to = target && S.find((q) => q.id === target) ? target : null;
  const sel = h('select', { onchange: (e) => { state(cx.S).hireTo = e.target.value; cx.refresh(); } },
    h('option', { value: 'auto', selected: !to }, 'Automatic (the first squad with room)'), ...S.map((q) => h('option', { value: q.id, selected: q.id === to }, `Squad ${q.name} · ${q.size + (q.incoming || []).length}/${SQUAD.max}`)));
  const after = (r) => { if (r?.ok && !to && W.autoSquads() !== false) W.organise(); cx.go(r); };
  const cards = TROOP_CLASSES.map((id) => { const K = CLASSES[id]; const have = P.filter((p) => p.role === id).length;
    return h('div', { class: 'osx-hire', title: K.text }, h('span', { class: 'g', style: `--c:${GLYPH_COLOUR[id]}` }, GLYPH[id]), h('div', { class: 'n' }, h('b', {}, K.name), h('small', {}, `${K.wage}/day · ${K.train} days training · ${have} on the books`)),
      btn('Hire', () => after(W.hire(id, to)), { kind: 'pri sm' })); });
  const staff = ['guard', 'technician'].map((id) => { const K = CLASSES[id]; const mine = P.filter((p) => p.role === id); const free = mine.filter((p) => !p.post && p.assignedTo == null);
    return h('div', { class: 'osx-hire staff' }, h('span', { class: 'g' }, id === 'guard' ? 'G' : 'T'), h('div', { class: 'n' }, h('b', {}, `${K.name}s · ${mine.length}`), h('small', {}, `${K.wage}/day · ${K.text}`)),
      h('span', {}, btn('Hire', () => cx.go(W.hire(id)), { kind: 'sm' }), ' ', btn('Let go', () => cx.go(W.dismiss(free[free.length - 1]?.id)), { kind: 'sm', disabled: !free.length }))); });
  return panel('Recruit', [
    h('div', { class: 'osx-hireto' }, h('span', {}, 'Hire into'), sel, h('small', {}, to ? 'The recruit holds a place in this squad while training and joins on the morning it ends.' : 'With automatic squads on, trained soldiers are placed each morning.')),
    !(st['supply:uniform'] > 0) ? h('div', { class: 'osx-note bad', style: 'margin:0;display:flex;gap:8px;align-items:center' }, 'No uniforms in the stores: a soldier needs one.', btn(`Buy 10 · ${(SUPPLIES.uniform.price * 10).toLocaleString('en-US')} ◎`, () => cx.go(W.buySupply('uniform', 10)), { kind: 'pri sm' })) : null,
    h('div', { class: 'osx-hires' }, ...cards), h('div', { class: 'osx-hires' }, ...staff)],
  { sub: `${training} of ${cap.training} training places in use · ${Math.max(0, cap.beds - P.length)} beds free. Every person costs a daily wage and a bed.` });
}

function loadouts(cx, P) {
  const { W } = cx; const st = W.stock(); const C = W.company();
  const stockOf = (item) => Object.entries(st).filter(([k]) => k.endsWith(`:${item}`) || k === item).reduce((a, [, q]) => a + q, 0);
  const rows = TROOP_CLASSES.map((id) => { const K = CLASSES[id]; const mine = P.filter((p) => p.role === id); const tier = C?.tiers?.[id] ?? 1; const tiers = Object.keys(K.tiers).map(Number);
    const era = mine.length && mine.every((p) => p.armour === 2) ? 1 : 2;
    return h('div', { class: 'osx-loadrow' }, h('span', { class: 'g', style: `--c:${GLYPH_COLOUR[id]}` }, GLYPH[id]),
      h('div', { class: 'n' }, h('b', {}, `${K.name} · ${mine.filter((p) => p.weapon).length}/${mine.length} armed`), h('small', {}, `${tiers.map((t) => `T${t}: ${cx.g.content.items[K.tiers[t]]?.name || K.tiers[t]} (${stockOf(K.tiers[t])})`).join(' · ')}${K.gadget ? ` · carries ${String(K.gadget).replace('supply:', '')}` : ''}`)),
      h('span', { class: 'ctl' }, ...tiers.map((t) => btn(`T${t}`, () => cx.go(W.setTier(id, t)), { kind: `sm${t === tier ? ' pri' : ''}` })), btn('Equip all', () => cx.go(W.equipClass(id)), { kind: 'sm', disabled: !mine.length }),
        btn(era === 2 ? `${ARMOUR[2].name}` : `Field uniform`, () => cx.go(W.armourClass(id, era)), { kind: 'sm', disabled: !mine.length, title: era === 2 ? 'Issue plate carriers (bought, one each)' : 'Back to the field uniform' }))); });
  return panel('Weapons and armour by class', rows, { sub: 'A class carries the weapon of its tier, taken from the stores. The tier and the armour era are real; colours are free.' });
}

const swatch = (colour, on, onclick, title) => h('button', { class: `osx-sw${on ? ' on' : ''}`, style: `background:${colour}`, title, onclick });
const pick = (list, value, set) => h('div', { class: 'osx-picks' }, ...list.map((k) => h('button', { class: `osx-pk${k === value ? ' on' : ''}`, onclick: () => set(k) }, k)));

function detail(cx, s, P, E) {
  const { W } = cx; const L = { ...s.look }; const set = (k) => (v) => cx.go(W.squadLook(s.id, { [k]: v }));
  const mine = E.filter((e) => s.equipment.includes(e.id)); const mem = rosterOf(s, P);
  const freeSoldiers = P.filter((p) => CLASSES[p.role]?.group === 'troop' && p.status === 'active' && p.assignedTo == null);
  const officers = P.filter((p) => CLASSES[p.role]?.leads && p.status === 'active');
  const freeVeh = E.filter((e) => ['vehicle', 'helicopter'].includes(e.kind) && e.status === 'stored');
  const home = s.status === 'home';
  const sel = (opts, ph, on) => h('select', { onchange: (e) => { const v = e.target.value; if (v) on(v); } }, h('option', { value: '' }, ph), ...opts.map(([v, t]) => h('option', { value: v }, t)));
  return h('div', { class: 'osx-side' },
    panel(`Squad ${s.name}`, [
      squadArt(s, P, mine, 360, 190, { big: true }),
      h('div', { class: 'osx-pan', style: 'padding:8px;border-color:var(--line2)' }, h('b', {}, 'Look'),
        h('div', { class: 'osx-lk' }, h('span', {}, 'Colour'), h('div', { class: 'osx-picks' }, ...Object.entries(LOOKS.primary).map(([k, c]) => swatch(c, k === L.primary, () => set('primary')(k), k.replace('_', ' '))))),
        h('div', { class: 'osx-lk' }, h('span', {}, 'Band'), h('div', { class: 'osx-picks' }, ...Object.entries(LOOKS.band).map(([k, c]) => swatch(c, k === L.band, () => set('band')(k), k)))),
        h('div', { class: 'osx-lk' }, h('span', {}, 'Pattern'), pick(LOOKS.pattern, L.pattern, set('pattern'))),
        h('div', { class: 'osx-lk' }, h('span', {}, 'Insignia'), pick(LOOKS.insignia, L.insignia, set('insignia'))),
        h('div', { class: 'osx-lk' }, h('span', {}, 'Crest'), pick(LOOKS.crest, L.crest, set('crest'))),
        h('small', { class: 'osx-sub', style: 'padding:4px 0 0' }, 'Free, and changes no number. The soldiers wear the colour and band in a battle; the patch shows the rest.')),
      kv('Leader', s.leaderName || 'none', s.leader ? '' : 'warn'), kv('Soldiers', `${s.size} of ${SQUAD.max}${(s.incoming || []).length ? ` · ${s.incoming.length} in training` : ''}`), kv('Morale', String(s.morale)),
      h('div', { class: 'osx-ctl' },
        freeSoldiers.length ? sel(freeSoldiers.map((p) => [p.id, `${p.name} (${CLASSES[p.role].name})`]), 'Add a soldier…', (v) => cx.go(W.squadAssign(s.id, v))) : h('small', {}, 'No free soldiers'),
        officers.length ? sel(officers.map((p) => [p.id, p.name]), 'Set the leader…', (v) => cx.go(W.squadLeader(s.id, v))) : null,
        freeVeh.length ? sel(freeVeh.map((x) => [x.id, `${x.name} ${x.id}`]), 'Give a vehicle…', (v) => cx.go(W.squadVehicle(s.id, v))) : null),
      mem.length ? h('div', { class: 'osx-mem' }, ...mem.map((p) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${s.leader === p.id ? '★ ' : ''}${p.name}`), h('small', {}, `${CLASSES[p.role].name} · ${p.weapon ? 'armed' : 'unarmed'} · ${ARMOUR[p.armour || 1].name}`)), btn('Out', () => cx.go(W.squadRemove(p.id)), { kind: 'sm', disabled: !home })))) : null,
      (s.incoming || []).length ? h('div', { class: 'osx-mem' }, ...s.incoming.map((t) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, t.name), h('small', {}, `${CLASSES[t.role].name} · training, joins day ${t.ready}`)), chip('place held', 'bl')))) : null,
      mine.length ? h('div', { class: 'osx-mem' }, ...mine.map((e) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, e.name), h('small', {}, `${e.id} · ${e.kind}`)), btn('Return', () => cx.go(W.squadVehicleOut(e.id)), { kind: 'sm', disabled: e.status !== 'assigned' })))) : null,
      h('div', { class: 'osx-ctl' }, btn('Stand the squad down', () => { state(cx.S).sel = null; cx.go(W.squadDisband(s.id)); }, { kind: 'warn sm', disabled: !home }))],
    { right: chip(home ? 'at base' : s.status === 'battalion' ? 'in a battalion' : 'away', home ? 'ok' : 'bl') }));
}

export function renderSquadBoard(cx, box) {
  const { W, S } = cx; const B = state(S); const P = W.people(); const squads = W.squads(); const E = W.equipment();
  if (squads.length && !squads.some((q) => q.id === B.sel)) B.sel = squads[0].id;
  if (!squads.length) B.sel = null;
  const troops = P.filter((p) => CLASSES[p.role]?.group === 'troop'); const auto = W.autoSquads() !== false;
  if (W.autoSquads() === undefined) W.setAutoSquads(true, false);
  const free = troops.filter((p) => p.status === 'active' && p.assignedTo == null).length;
  box.append(stats(stat('Soldiers', String(troops.length), { sub: `${troops.filter((p) => p.status === 'training').length} in training` }), stat('Squads', `${squads.length}/${SQUAD.names.length}`), stat('Not in a squad', String(free), { tone: free ? 'warn' : 'ok' }),
    stat('Uniforms', String(W.stock()['supply:uniform'] || 0), { tone: (W.stock()['supply:uniform'] || 0) > 0 ? '' : 'warn' }), stat('Vehicles free', String(E.filter((e) => ['vehicle', 'helicopter'].includes(e.kind) && e.status === 'stored').length))));
  box.append(h('div', { style: 'height:8px' }), h('div', { class: 'osx-ctl', style: 'margin-bottom:8px' },
    btn(auto ? '✓ Automatic squads: on' : 'Automatic squads: off', () => cx.go(W.setAutoSquads(!auto)), { kind: auto ? 'pri sm' : 'sm', title: 'Trained soldiers join a squad and are armed each morning' }), btn('Place everyone now', () => cx.go(W.organise()), { kind: 'sm' }),
    btn('+ Form a squad', () => { const r = W.squadCreate(); if (r.ok) B.sel = r.id; cx.go(r); }, { kind: 'sm', disabled: squads.length >= SQUAD.names.length })));
  const left = h('div', { class: 'osx-side', style: 'overflow:visible' },
    panel('Squad board', squads.length ? [h('div', { class: 'osx-sqgrid' }, ...squads.map((q) => squadCard(cx, q, P, E, q.id === B.sel)))] : [empty('No squads yet. Form one, or hire a soldier and turn on automatic squads.')], { sub: 'Click a squad to open it. Dashed places are recruits in training who will join on the day it ends.' }),
    hirePanel(cx, P, B.hireTo === 'auto' ? null : (B.hireTo || B.sel)),
    loadouts(cx, P));
  const cur = squads.find((q) => q.id === B.sel);
  box.append(h('div', { class: 'osx-grid osx-gs', style: 'grid-template-columns:minmax(0,1fr) 392px' }, left, cur ? detail(cx, cur, P, E) : h('div', { class: 'osx-side' }, panel('Squad', [empty('Open a squad to see who is in it, give it a look, and assign vehicles.')]))));
}
