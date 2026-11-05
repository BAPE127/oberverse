// The Military app's People, Squads and Armoury screens (v0.100.0; mock-ups proposal-war-troop-customizer.png and -loadouts-1/2.png): who works for the company, who is in which squad, and what
// each class carries. Reached from the Company page. Every button calls game.war; nothing here changes a record.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n } from './tabletKit.js';
import { CLASSES, TROOP_CLASSES, ARMOUR, LOOKS, SQUAD } from '../content/troops.js';
import { ARMS_TRANSFERABLE } from '../content/procurement.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);
const back = (ui, open) => h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => { ui.milSub = null; open('Military'); } }, '‹ Company'));
const select = (opts, value, onchange) => h('select', { style: 'padding:6px;border-radius:8px;background:#15133e;color:inherit;border:2px solid #3a3794', onchange: (e) => onchange(e.target.value) }, ...opts.map(([v, t]) => h('option', { value: v, selected: v === value }, t)));

export function peopleScreen(ui, body, go, open) {
  const g = ui.game; const W = g.war; const P = W.people(); const H = W.housing(); const cap = W.capacity();
  body.append(back(ui, open),
    hero({ label: 'People', value: `${P.length} on the books`, sub: `${cap.beds} beds · ${P.filter((p) => p.status === 'training').length} of ${cap.training} training places in use. Every person costs a daily wage and needs a bed; a soldier needs a uniform from the stores and days of training.` }),
    tiles([{ n: String(P.filter((p) => p.status === 'active').length), t: 'working' }, { n: String(P.filter((p) => p.status === 'training').length), t: 'training' }, { n: String(Math.max(0, cap.beds - P.length)), t: 'beds free' }]));
  body.append(list(...Object.entries(CLASSES).map(([id, K]) => {
    const mine = P.filter((p) => p.role === id);
    return row({ icon: K.group === 'troop' ? '🪖' : id === 'guard' ? '💂' : '🧑‍🏭', title: `${K.name} · ${mine.length}`, sub: `${K.text} ${K.wage} a day${K.train ? ` · ${K.train} days of training` : ''}${mine.some((p) => p.status === 'training') ? ` · ${mine.filter((p) => p.status === 'training').length} training` : ''}`,
      action: h('span', {}, h('button', { class: 'tb-mini pri', onclick: () => go(W.hire(id)) }, 'Hire'), ' ', h('button', { class: 'tb-mini', disabled: !mine.some((p) => !p.post && p.assignedTo == null), onclick: () => go(W.dismiss(mine.filter((p) => !p.post && p.assignedTo == null).slice(-1)[0]?.id)) }, 'Let go')) });
  })));
  body.append(fold(ui, 'MilRoll', 'The roll — everyone by name ›', (box) => box.append(list(...(P.length ? P.map((p) => row({ icon: '👤', title: `${p.name} · ${CLASSES[p.role]?.name}`, sub: `${p.status}${p.status === 'training' ? ` until day ${p.trainedDay}` : ''}${p.assignedTo ? ` · squad ${p.assignedTo}` : ''}${p.post ? ` · ${p.post}` : ''} · morale ${p.morale ?? 70}` })) : [row({ icon: '—', title: 'Nobody yet', sub: 'Build the bunkhouse, then hire.' })])))));
  body.append(help('Training and uniforms', 'A soldier trains for a few days at the range or the training ground (each takes a place while they train) and needs a uniform from the stores; guards and technicians start at once. Wages are paid every day from the company\'s own money.'));
}

export function squadsScreen(ui, body, go, open) {
  const g = ui.game; const W = g.war; const S = W.squads(); const P = W.people();
  const free = P.filter((p) => TROOP_CLASSES.includes(p.role) && p.status === 'active' && p.assignedTo == null);
  const officers = P.filter((p) => CLASSES[p.role]?.leads && p.status === 'active');
  const vehicles = W.equipment().filter((e) => ['vehicle', 'helicopter'].includes(e.kind) && e.status === 'stored');
  body.append(back(ui, open),
    hero({ label: 'Squads', value: `${S.length} squad${S.length === 1 ? '' : 's'}`, sub: `A squad has an officer for a leader, up to ${SQUAD.max} soldiers and the vehicles you give it. Each soldier and vehicle is in one squad or none.` }),
    tiles([{ n: String(free.length), t: 'soldiers free' }, { n: String(vehicles.length), t: 'vehicles free' }, { n: String(officers.length), t: 'officers' }]),
    h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => go(W.squadCreate()) }, 'Form a squad')));
  for (const s of S) {
    body.append(h('div', { class: 'tb-card', style: 'padding:10px 12px' },
      h('div', { class: 'tb-row' }, h('div', { class: 'grow' }, h('b', {}, `${s.name} · ${s.size}`), h('small', {}, `Leader: ${s.leaderName || 'none yet'} · ${s.armed} armed · morale ${s.morale}${s.vehicles.length ? ` · ${s.vehicles.join(', ')}` : ''}`)), h('button', { class: 'tb-mini', onclick: () => go(W.squadDisband(s.id)) }, 'Stand down')),
      h('small', {}, Object.entries(s.byClass).map(([k, q]) => `${q} ${CLASSES[k].name.toLowerCase()}`).join(', ') || 'No one yet'),
      h('div', { class: 'tb-btns', style: 'margin-top:6px;flex-wrap:wrap' },
        free.length ? select([['', 'Add a soldier…'], ...free.map((p) => [p.id, `${p.name} (${CLASSES[p.role].name})`])], '', (v) => v && go(W.squadAssign(s.id, v))) : null,
        officers.length ? select([['', 'Leader…'], ...officers.map((p) => [p.id, p.name])], s.leader || '', (v) => v && go(W.squadLeader(s.id, v))) : null,
        vehicles.length ? select([['', 'Give a vehicle…'], ...vehicles.map((x) => [x.id, `${x.name} ${x.id}`])], '', (v) => v && go(W.squadVehicle(s.id, v))) : null),
      s.members.length ? fold(ui, `MilSq${s.id}`, 'Members ›', (box) => box.append(list(...s.members.map((m) => { const p = P.find((x) => x.id === m); return row({ icon: s.leader === m ? '⭐' : '🪖', title: `${p.name} · ${CLASSES[p.role].name}`, sub: p.weapon ? 'armed' : 'unarmed', action: h('button', { class: 'tb-mini', onclick: () => go(W.squadRemove(m)) }, 'Out') }); })))) : null));
  }
}

export function armouryScreen(ui, body, go, open) {
  const g = ui.game; const W = g.war; const P = W.people(); const st = W.stock(); const C = W.company();
  const stockOf = (item) => Object.entries(st).filter(([k]) => k.endsWith(`:${item}`) || k === item).reduce((a, [, q]) => a + q, 0);
  body.append(back(ui, open),
    hero({ label: 'Armoury', value: 'Class, weapons and look', sub: 'A class carries the weapon of its tier, taken from the stores: a weapon in a soldier\'s hands is not in the stores. Tiers 3 to 5 and armour eras 3 and 4 are future research.' }),
    tiles([{ n: String(stockOf(ARMS_TRANSFERABLE[0]) + 0), t: 'pistols in stores' }, { n: String(st['supply:uniform'] || 0), t: 'uniforms' }, { n: String(st['supply:plate_carrier'] || 0), t: 'plate carriers' }]));
  body.append(list(...TROOP_CLASSES.concat(['guard']).map((id) => {
    const K = CLASSES[id]; const mine = P.filter((p) => p.role === id); const tier = C?.tiers?.[id] ?? 1;
    const armed = mine.filter((p) => p.weapon).length;
    const tiers = Object.keys(K.tiers).map(Number);
    return h('div', {}, row({ icon: '🔫', title: `${K.name} · ${armed}/${mine.length} armed`, sub: `${tiers.map((t) => `T${t}: ${g.content.items[K.tiers[t]]?.name || K.tiers[t]} (${stockOf(K.tiers[t])} in stores)`).join(' · ')}${K.gadget ? ` · carries ${K.gadget.replace('supply:', '')}` : ''}`,
      action: h('span', {}, ...tiers.map((t) => h('button', { class: `tb-mini${t === tier ? ' pri' : ''}`, onclick: () => go(W.setTier(id, t)) }, `T${t}`)), ' ', h('button', { class: 'tb-mini', disabled: !mine.length, onclick: () => go(W.equipClass(id)) }, 'Equip all'), ' ', K.group === 'troop' ? h('button', { class: 'tb-mini', disabled: !mine.length, onclick: () => go(W.armourClass(id, mine.every((p) => p.armour === 2) ? 1 : 2)) }, mine.length && mine.every((p) => p.armour === 2) ? 'Plates off' : 'Plates on') : null) }));
  })));
  body.append(fold(ui, 'MilLook', 'Looks — colours for a squad (free, cosmetic) ›', (box) => {
    const S = W.squads();
    if (!S.length) { box.append(list(row({ icon: '—', title: 'No squads yet', sub: 'Form a squad first, then give it a look.' }))); return; }
    const pick = ui.milLookSquad && S.find((s) => s.id === ui.milLookSquad) ? ui.milLookSquad : S[0].id;
    const s = S.find((x) => x.id === pick);
    const set = (k) => (v) => go(W.squadLook(pick, { [k]: v }));
    box.append(list(row({ icon: '🎨', title: 'Squad', sub: 'Choose one', action: select(S.map((x) => [x.id, x.name]), pick, (v) => { ui.milLookSquad = v; open('Military'); }) }),
      row({ icon: '▪', title: 'Colour', action: select(Object.keys(LOOKS.primary).map((k) => [k, k.replace('_', ' ')]), s.look.primary, set('primary')) }),
      row({ icon: '▦', title: 'Pattern', action: select(LOOKS.pattern.map((k) => [k, k]), s.look.pattern, set('pattern')) }),
      row({ icon: '★', title: 'Insignia', action: select(LOOKS.insignia.map((k) => [k, k]), s.look.insignia, set('insignia')) }),
      row({ icon: '⛑', title: 'Crest', action: select(LOOKS.crest.map((k) => [k, k]), s.look.crest, set('crest')) }),
      row({ icon: '🎗', title: 'Band', action: select(Object.keys(LOOKS.band).map((k) => [k, k]), s.look.band, set('band')) })));
  }));
  body.append(help('What changes a number', 'The tier (weapon) and the armour era are real: they change what the soldier can do and what they cost. Colours, pattern, insignia, crest and band are free and change nothing.'));
}

const PART = { strength: 'at work (not training or wounded)', morale: 'morale', armed: 'armed', fed: 'fed today', housed: 'with a bed' };

/** The Base screen (v0.100.0 stage 8): what the base has, what it lacks, and what readiness is made of. */
export function baseScreen(ui, body, go, open) {
  const g = ui.game; const W = g.war; const B = W.baseView(); const H = W.housing();
  body.append(back(ui, open),
    hero({ label: 'The base', value: `${B.readiness}% ready`, tone: B.readiness < 40 ? 'neg' : B.readiness < 70 ? 'warn' : 'pos', sub: B.short.length ? B.short.join(' · ') : 'Everyone is fed, housed and treated.' }),
    tiles([{ n: `${B.people}/${B.beds}`, t: 'people / beds' }, { n: `${B.rations}`, t: 'rations left' }, { n: `${B.morale}`, t: 'average morale' }]));
  body.append(list(...Object.entries(B.factors).map(([k, v]) => row({ icon: '▪', title: PART[k] || k, sub: `${Math.round(v * 100)}%`, tag: `${Math.round(v * 100)}%`, tone: v >= 0.8 ? 'good' : v >= 0.5 ? '' : 'warn' }))));
  body.append(list(
    row({ icon: '🍲', title: 'Meals', sub: `${B.meals} hot meals a day from the mess; everyone eats a ration a day from the stores.`, action: h('button', { class: 'tb-mini pri', onclick: () => go(W.buySupply('rations', 50)) }, 'Rations ×50') }),
    row({ icon: '🏥', title: 'Medical', sub: `${B.treat} treatment places · ${B.wounded} wounded · ${B.medicine} medicine in the stores.`, action: h('button', { class: 'tb-mini', onclick: () => go(W.buySupply('medicine', 10)) }, 'Medicine ×10') }),
    row({ icon: '🛏️', title: 'Beds', sub: `${B.beds} beds for ${B.people} people.` }),
    row({ icon: '📦', title: 'Stores', sub: `${H.stores.used} of ${H.stores.total} places used.` })));
  body.append(help('Capacity is real', 'A base that is too small loses morale and readiness: people without a bed or a meal, and wounded beyond the treatment places, drag it down. Nothing here is free: rations and medicine are bought, and wages are paid every day.'));
}
