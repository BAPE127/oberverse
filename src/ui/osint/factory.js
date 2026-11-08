// The factory floors (v0.103.6): the tank factory and the helicopter works laid out like the aerospace company's hangar floor: one bay card per production line with the machine on it, a lamp for
// each part the model needs, the shift and crew controls, then the models you can order (each with its picture), the finished machines and the queue. Also the strips of machines parked in the
// motor pool and the hangars. DOM and canvases only: every button calls game.war; nothing here changes a record.
import { h, panel, stats, stat, btn, chip, bar, empty } from './kit.js';
import { VEHICLES, SUPPLIES } from '../../content/procurement.js';
import { WORKS } from '../../content/production.js';
import { paintMachine, isHeli } from './sprites.js';

const fmt = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');
const BARS = ['armour', 'firepower', 'speed', 'capacity'];
const dots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);

function art(w, hh, paint, cls = 'osx-fart') {
  const c = h('canvas', { class: cls, width: w, height: hh }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  try { paint(g, w, hh); } catch (err) { console.error(err); }
  return c;
}
/** A machine on a pad: the game's own sprite, nose to the right. */
const machineArt = (type, w, hh, { scale = 1, sparks = false, wreck = false } = {}) => art(w, hh, (g) => {
  g.fillStyle = '#0d1411'; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(120,160,110,.05)'; for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 1, hh); for (let y = 0; y < hh; y += 12) g.fillRect(0, y, w, 1);
  g.fillStyle = '#16211b'; g.fillRect(8, hh - 12, w - 16, 5);
  paintMachine(g, type, w / 2, hh / 2 + 2, { heading: Math.PI / 2, scale: scale * (isHeli(type) ? 0.75 : 1), state: wreck ? 'wreck' : 'ok' });
  if (sparks) for (const [x, y] of [[0.34, 0.4], [0.6, 0.62], [0.5, 0.3]]) { g.fillStyle = '#fff6c8'; g.fillRect(w * x, hh * y, 3, 3); g.fillStyle = '#8fd0ff'; g.fillRect(w * x - 2, hh * y - 1, 7, 1); }
});

function lineCard(cx, l, models) {
  const { W } = cx; const m = l.model ? models.find((x) => x.id === l.model) : null; const state = l.model ? (l.blocked ? 'blocked' : 'working') : (l.blocked ? 'blocked' : 'idle');
  const tone = state === 'working' ? 'ok' : state === 'blocked' ? 'warn' : '';
  const left = m ? Math.max(0, (1 - l.progress) * m.days / Math.max(0.01, l.shifts)) : 0;
  return h('div', { class: `osx-fbay ${state}` }, h('i', { class: 'c tl' }), h('i', { class: 'c tr' }), h('i', { class: 'c bl' }), h('i', { class: 'c br' }),
    h('div', { class: 'osx-sqh' }, h('b', {}, `LINE ${l.id} · ${m ? m.name.toUpperCase() : 'IDLE'}`), chip(state, tone)),
    m ? machineArt(m.id, 260, 96, { scale: 1.45, sparks: state === 'working' }) : art(260, 96, (g, w, hh) => { g.fillStyle = '#0d1411'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#2a3a30'; g.setLineDash([6, 6]); g.strokeRect(w * 0.2, 14, w * 0.6, hh - 28); g.setLineDash([]); g.fillStyle = '#4a5a50'; g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillText('IDLE', w / 2, hh / 2 + 6); }),
    m ? h('div', {}, bar(l.progress, state === 'blocked' ? 'warn' : ''), h('div', { class: 'osx-sqf' }, h('span', {}, `${Math.round(l.progress * 100)}%`), h('span', {}, `about ${left < 1 ? 'under a day' : `${Math.ceil(left)} day${Math.ceil(left) === 1 ? '' : 's'}`} left`))) : null,
    m ? h('div', { class: 'osx-lamps' }, ...Object.entries(m.parts).map(([k, q]) => h('span', { class: 'osx-lamp ok', title: `${SUPPLIES[k].name} ×${q}: spent when the unit started` }, `${k} ${q}`))) : null,
    l.blocked ? h('div', { class: 'osx-note bad', style: 'margin:0' }, `⚠ ${l.blocked}`) : null,
    h('div', { class: 'osx-sqf' }, h('span', {}, `Crew ${l.crew} technicians`), h('span', { class: 'osx-qty' }, btn('−', () => cx.go(W.shifts(l.id, l.shifts - 1)), { kind: 'sm', disabled: l.shifts <= 1 }), h('span', { style: 'padding:0 8px' }, `${l.shifts} shift${l.shifts === 1 ? '' : 's'}`), btn('+', () => cx.go(W.shifts(l.id, l.shifts + 1)), { kind: 'sm', disabled: l.shifts >= 3 }))));
}

function modelCard(cx, m, have) {
  const { W } = cx; const V = VEHICLES[m.id]; const lacks = Object.entries(m.parts).filter(([k, q]) => (have[k] || 0) < q);
  return h('div', { class: 'osx-model' }, machineArt(m.id, 230, 84, { scale: 1.3 }),
    h('div', { class: 'osx-sqh' }, h('b', {}, m.name), chip(`${fmt(m.price)} ◎`)), h('small', { class: 'osx-sub', style: 'padding:0' }, V.text),
    h('div', { class: 'osx-bars' }, ...BARS.map((k) => h('span', {}, h('i', {}, k.slice(0, 3)), dots(V[k])))),
    h('div', { class: 'osx-lamps' }, ...Object.entries(m.parts).map(([k, q]) => h('span', { class: `osx-lamp ${(have[k] || 0) >= q ? 'ok' : 'bad'}`, title: `${SUPPLIES[k].name}: ${have[k] || 0} in the stores, ${q} needed` }, `${k} ${have[k] || 0}/${q}`))),
    m.open === false ? h('div', { class: 'osx-note bad', style: 'margin:0' }, `Needs research (era ${m.era}): Base Operations, Research.`) : null,
    h('div', { class: 'osx-sqf' }, h('span', {}, `${m.days} days at one shift · fee ${fmt(m.fee)}`), h('span', {}, btn('Order 1', () => cx.go(W.order(m.id, 1)), { kind: 'pri sm', disabled: m.open === false }), ' ', btn('Order 3', () => cx.go(W.order(m.id, 3)), { kind: 'sm', disabled: m.open === false }))),
    lacks.length ? h('small', { class: 'osx-sub', style: 'padding:0;color:var(--am)' }, `Short of ${lacks.map(([k, q]) => `${q - (have[k] || 0)} ${k}`).join(', ')}: buy it in Procurement; the line waits for it.`) : null);
}

/** What the company has finished or bought of one kind, as picture cards. */
export function machinesStrip(cx, test, title, sub, bays = 0) {
  const { W } = cx; const E = W.equipment().filter((e) => ['vehicle', 'helicopter'].includes(e.kind) && test(e));
  const sq = Object.fromEntries(W.squads().map((s) => [s.id, s.name]));
  const cards = E.map((e) => h('div', { class: 'osx-mach' }, machineArt(e.type, 150, 66, { scale: 0.95 }), h('b', {}, e.name), h('small', {}, `${e.id} · ${e.status === 'assigned' ? `Squad ${sq[e.assignedTo] || e.assignedTo}` : e.status}${e.source === 'works' ? ' · built here' : ''}`)));
  const free = Array.from({ length: Math.max(0, bays - E.length) }, () => h('div', { class: 'osx-mach free' }, h('small', {}, 'free bay')));
  return panel(title, cards.length || free.length ? [h('div', { class: 'osx-mgrid' }, ...cards, ...free)] : [empty('Nothing here yet.')], { sub, right: chip(`${E.length}`) });
}

export function renderFactory(cx, box, worksId) {
  const { W } = cx; const P = W.production(); const WK = P.works.find((x) => x.id === worksId); const makes = WORKS[worksId].makes; const models = P.models.filter((m) => m.works === worksId);
  const have = Object.fromEntries(P.needs.map((n) => [n.id, n.have])); for (const k of Object.keys(SUPPLIES)) have[k] ??= W.stock()[`supply:${k}`] || 0;
  const lines = P.lines.filter((l) => l.works === worksId); const working = lines.filter((l) => l.model).length;
  box.append(stats(stat('Lines working', `${working}/${lines.length}`, { tone: working ? 'ok' : '' }), stat('Blocked', String(lines.filter((l) => l.blocked).length), { tone: lines.some((l) => l.blocked) ? 'warn' : 'ok' }),
    stat('Technicians', String(P.technicians), { sub: `${WORKS[worksId].crewPerShift} per shift per line` }), stat('Works', `Level ${WK.level}`, { sub: `wear ${WK.wear}% · ${Math.round(WK.eff * 100)}% speed` }), stat('Company cash', fmt(W.cash()))));
  box.append(h('div', { style: 'height:8px' }), h('div', { class: 'osx-ctl' },
    WK.upgrade != null ? btn(`Upgrade works · ${fmt(WK.upgrade)} ◎`, () => cx.go(W.upgrade(worksId)), { kind: 'pri sm', disabled: W.cash() < WK.upgrade }) : chip('top level', 'ok'),
    WK.wear >= 5 ? btn(`Mend · ${fmt(WK.maintain)} ◎`, () => cx.go(W.maintain(worksId)), { kind: 'warn sm', disabled: W.cash() < WK.maintain }) : null,
    btn('Hire a technician', () => cx.go(W.hire('technician')), { kind: 'sm' }),
    btn('Let a technician go', () => cx.go(W.dismiss(W.people().filter((p) => p.role === 'technician' && !p.post && p.assignedTo == null).slice(-1)[0]?.id)), { kind: 'sm', disabled: !W.people().some((p) => p.role === 'technician' && !p.post && p.assignedTo == null) })));
  box.append(h('div', { style: 'height:8px' }));
  box.append(panel(`${WORKS[worksId].name} floor`, [h('div', { class: 'osx-fgrid' }, ...lines.map((l) => lineCard(cx, l, models)))], { sub: `${makes === 'tank' ? 'Tanks' : 'Helicopters'} only: planes, missiles, guns and ships come from your other companies. A line starts a unit when its parts are in the stores, its fee can be paid and its technicians are free.` }));
  box.append(h('div', { style: 'height:10px' }), panel('Order', [h('div', { class: 'osx-mgrid wide' }, ...models.map((m) => modelCard(cx, m, have)))], { sub: 'The picture is the machine the line builds. Parts are bought in Procurement.' }));
  box.append(h('div', { style: 'height:10px' }), machinesStrip(cx, (e) => VEHICLES[e.type]?.class === makes && e.source === 'works', makes === 'tank' ? 'Finished tanks' : 'Finished helicopters', 'Everything this works has built, and where it is now.'));
  const orders = P.orders.filter((o) => VEHICLES[o.model].class === makes);
  box.append(h('div', { style: 'height:10px' }), panel('Queue', orders.length ? orders.map((o) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${o.name} · ${o.done}/${o.qty} done`), h('small', {}, `${o.left} not yet started`)), o.left ? btn('Cancel the rest', () => cx.go(W.cancelOrder(o.id)), { kind: 'sm' }) : null)) : [empty('No orders. Order a model above.')]));
}
