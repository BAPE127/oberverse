// Command Overview (v0.103.4): the commander's briefing. Every figure is a count of real records (src/war/briefing.js).
import { h, panel, stats, stat, btn, chip, empty, bar, feedLine, kv, fmt } from './kit.js';
import { LOT } from '../../content/facilities.js';

const STATE = { permit: 'permit', foundation: 'foundations', frame: 'frame', fitted: 'fitting out' };

export function renderOverview(cx, box) {
  const { g, W } = cx; const B = W.briefing(); const V = W.companyView(); const M = W.missions(); const fac = V.lotOwned ? W.facilities() : []; const office = fac.find((f) => f.id === 'site_office');
  // first steps, until the site office is ordered
  if (!office || office.state === 'none') {
    const costs = { licence: LOT.licence, lot: LOT.price, office: W.quote('site_office')?.cost ?? 20000 };
    const need = (V.licensed ? 0 : costs.licence) + (V.lotOwned ? 0 : costs.lot) + costs.office;
    const step = (done, title, sub, action) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${done ? '✓' : '▸'} ${title}`), h('small', {}, sub)), done ? chip('done', 'ok') : action);
    box.append(panel('Getting started: your first building', [
      step(V.cash >= need, `Company funds: ${fmt(need)} needed`, `The company holds ${fmt(V.cash)}. You hold ${fmt(g.player.money)}.`, btn('Pay in the rest', () => cx.go(W.fund(Math.max(0, need - V.cash))), { kind: 'pri sm', disabled: need - V.cash <= 0 || g.player.money < need - V.cash })),
      step(V.licensed, `Civic Office licence · ${fmt(costs.licence)}`, 'Mason\'s Os cannot get a building permit without it.', btn('Buy', () => cx.go(W.buyLicence()), { kind: 'pri sm', disabled: V.cash < costs.licence })),
      step(V.lotOwned, `${LOT.name} · ${fmt(costs.lot)}`, V.licensed ? 'Fenced ground with a gate: where the base is built.' : 'Needs the licence first.', btn('Buy', () => cx.go(W.buyLot()), { kind: 'pri sm', disabled: !V.licensed || V.cash < costs.lot })),
      step(false, `Site office · ${fmt(costs.office)}`, V.lotOwned ? 'Built in a few days; the rest of the base opens after it.' : 'Needs the lot first.', btn('Order', () => cx.go(W.commission('site_office')), { kind: 'pri sm', disabled: !V.lotOwned || V.cash < costs.office })),
    ], { cls: 'osx-mb' }));
  }
  const tone = (ok, warn) => (ok ? 'ok' : warn ? 'warn' : 'bad');
  box.append(panel('Operational summary', stats(
    stat('Company funds', `${fmt(B.funds)} ◎`, { tone: B.funds > 0 ? '' : 'warn' }),
    stat('Personnel', fmt(B.personnel.total), { sub: `${B.personnel.troops} troops · ${B.personnel.squads} squads` }),
    stat('Available', fmt(B.personnel.available), { sub: `${B.personnel.training} training · ${B.personnel.wounded} wounded`, tone: B.personnel.available ? '' : 'warn' }),
    stat('Active missions', fmt(B.missions.active), { tone: B.missions.active ? 'ok' : '', onclick: () => cx.open('missions', { tab: 'active' }) }),
    stat('Completed', fmt(B.missions.done), { sub: `${B.missions.failed} failed`, onclick: () => cx.open('missions', { tab: 'done' }) }),
    stat('Personnel readiness', `${B.readiness}%`, { tone: tone(B.readiness >= 70, B.readiness >= 40) }),
    stat('Vehicles', `${B.vehicles.ready}/${B.vehicles.total}`, { sub: B.vehicles.lost ? `${B.vehicles.lost} lost` : 'all serviceable', tone: B.vehicles.total && B.vehicles.ready < B.vehicles.total ? 'warn' : '' }),
    stat('Aircraft and missiles', `${B.aircraft.ready}/${B.aircraft.total}`, { sub: B.aircraft.total ? 'in the hangars and stores' : 'none held' }),
    stat('Base condition', B.base.online ? `${B.base.built}/${B.base.total}` : '—', { sub: !B.base.online ? 'no base yet' : B.base.damaged ? `${B.base.damaged} damaged` : B.base.protectedBase ? 'secure' : 'AT RISK', tone: !B.base.online ? 'warn' : !B.base.protectedBase ? 'bad' : B.base.damaged ? 'warn' : 'ok', onclick: () => cx.open('base') }),
    stat('Supply levels', B.supply.levels ? `${B.supply.levels - B.supply.short}/${B.supply.levels}` : 'none set', { sub: B.supply.short ? `${B.supply.short} short` : `${fmt(B.supply.held)} items held`, tone: B.supply.short ? 'warn' : '', onclick: () => cx.open('logistics') }))));

  const ops = M.active.length ? M.active.slice(0, 5).map((m) => h('div', { class: 'osx-row tap', onclick: () => cx.open('missions', { tab: 'active', mission: { kind: m.kind, id: m.id } }) },
    h('div', {}, h('b', {}, m.title), h('small', {}, `${m.type} · ${m.place || '—'} · ${m.forces || ''}`)), h('div', { style: 'display:flex;gap:5px;align-items:center' }, m.risk ? chip(`${m.risk} risk`, m.risk === 'high' ? 'bad' : m.risk === 'medium' ? 'warn' : 'ok') : null, m.daysLeft != null ? chip(`${m.daysLeft} d`) : null, chip(m.status, 'bl')))) : [empty('No operations under way. Accept a contract or an engagement in Mission Control.')];
  const baseRows = [
    kv('Facilities built', B.base.online ? `${B.base.built} of ${B.base.total}` : 'no base yet', B.base.online ? '' : 'warn'),
    kv('Damaged or ruined', String(B.base.damaged), B.base.damaged ? 'warn' : 'ok'),
    kv('Beds', fmt(B.base.beds)), kv('Items in the stores', `${fmt(B.supply.held)} (no limit)`),
    kv('Production lines at work', `${B.production} · ${B.productionQueue} queued`), kv('Orders on their way', `${B.orders.transit + B.orders.pending}`, B.orders.pending ? 'warn' : ''),
    ...B.base.building.slice(0, 3).map((b) => kv(`Building: ${b.name}`, `${STATE[b.state]}${b.daysLeft != null ? ` · ${b.daysLeft} d` : ''}`)),
    ...(B.base.shortages || []).slice(0, 3).map((s) => kv('Shortage', s, 'bad')), ...B.supply.shortRows.slice(0, 3).map((s) => kv('Supply short', s, 'warn'))];
  const feed = W.worldFeed(8); const act = W.activity(12);
  const hot = W.theatres().filter((t) => t.hot);
  box.append(h('div', { class: 'osx-grid osx-g2' },
    h('div', { class: 'osx-side' }, panel('Active operations', ops, { right: btn('Mission Control ›', () => cx.open('missions'), { kind: 'sm' }) }), panel('Recent activity', act.length ? act.map((a) => feedLine(`day ${a.day}`, a.tag, a.text)) : [empty('Nothing has happened yet.')])),
    h('div', { class: 'osx-side' }, panel('Base status', baseRows, { right: btn('Base Operations ›', () => cx.open('base'), { kind: 'sm' }) }),
      panel('Intelligence and world situation', [
        ...(hot.length ? [kv('Theaters at war or contested', hot.map((t) => t.name).join(', '), 'bad')] : [kv('Theaters at war', 'none', 'ok')]),
        ...(feed.length ? feed.map((f) => feedLine(`day ${f.day}`, f.kind, f.text)) : [empty('No conflicts or embargoes are recorded yet. The record starts when the arms market opens.')]),
        B.employer ? kv('Employer', `${g.content.arms.countries[B.employer.side]?.name || B.employer.side} against ${g.content.arms.countries[B.employer.enemy]?.name || B.employer.enemy}`) : null,
      ].filter(Boolean), { right: btn('Global map ›', () => cx.open('intel'), { kind: 'sm' }) }))));
  box.append(panel('Quick actions', h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
    btn('Order supplies', () => cx.open('procurement'), { kind: 'pri' }), btn('Transfer internal supplies', () => cx.open('logistics')), btn('Review missions', () => cx.open('missions')),
    btn('Hire troops', () => cx.open('base', { base: { tab: 'people', sel: null } })), btn('Battalions', () => cx.open('base', { base: { tab: 'forces', sel: null } })), btn('Open base map', () => cx.open('base', { base: { tab: 'map', sel: null } })), btn('View global conflicts', () => cx.open('intel')), btn('Open theater map', () => cx.open('theaters')))));
  // money in and out: the only two acts that cross between you and the company
  const amount = h('input', { class: 'osx-input', type: 'number', min: 1, step: 1000, value: 50000, style: 'width:120px' }); const amt = () => Math.max(0, Math.floor(Number(amount.value) || 0));
  box.append(panel('Company account', h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, amount, btn('Pay in', () => cx.go(W.fund(amt())), { kind: 'pri' }), btn('Take out', () => cx.go(W.take(amt())), { disabled: V.cash <= 0 || V.arrears > 0 }),
    h('span', { class: 'osx-sub' }, `You hold ${fmt(g.player.money)} ◎. The company pays only from its own account, never from yours.`))));
}
