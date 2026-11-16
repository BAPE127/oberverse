// Command Overview (v0.103.4): the commander's briefing. Every figure is a count of real records (src/war/briefing.js).
import { h, panel, stats, stat, btn, chip, empty, bar, feedLine, kv, fmt } from './kit.js';
import { LOT } from '../../content/facilities.js';
import { POLICIES } from '../../content/policies.js';

const STATE = { permit: 'permit', foundation: 'foundations', frame: 'frame', fitted: 'fitting out' };

export function renderOverview(cx, box) {
  const { g, W } = cx; const B = W.briefing(); const V = W.companyView(); const M = W.missions(); const fac = V.lotOwned ? W.facilities() : []; const office = fac.find((f) => f.id === 'site_office');
  // first steps, until the site office is ordered
  if (!office || office.state === 'none') {
    const costs = { licence: LOT.licence, lot: LOT.price, office: W.quote('site_office')?.cost ?? 20000 };
    const need = (V.licensed ? 0 : costs.licence) + (V.lotOwned ? 0 : costs.lot) + costs.office;
    const step = (done, title, sub, action) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${done ? '✓' : '▸'} ${title}`), h('small', {}, sub)), done ? chip('done', 'ok') : action);
    box.append(panel('Getting started: your first building', [
      step(V.cash >= need, `Funds: ${fmt(need)} needed`, `${V.mode === 'wallet' ? `The company spends your wallet: you hold ${fmt(g.player.money)}.` : V.mode === 'group' ? `The company spends the group's cash: ${fmt(V.cash)}.` : `Its own account holds ${fmt(V.cash)}. You hold ${fmt(g.player.money)}.`}`, V.mode === 'own' ? btn('Pay in the rest', () => cx.go(W.fund(Math.max(0, need - V.cash))), { kind: 'pri sm', disabled: need - V.cash <= 0 || g.player.money < need - V.cash }) : h('small', {}, 'Short: see Funding below.')),
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
  const E = B.earning;
  box.append(panel('Earnings', [
    kv('A soldier in the field earns', `${fmt(E.rate)} ◎ a day`), kv('Serving in a theater now', E.inField ? `${fmt(E.inField)} soldiers · ${fmt(E.perDay)} ◎ a day` : 'none', E.inField ? 'ok' : 'warn'),
    kv(`If all ${fmt(E.troops)} trained soldiers served`, `${fmt(E.potentialDay * E.days)} ◎ in ${E.days} days`),
    h('div', { class: 'osx-sub' }, 'The retainer is paid for soldiers and vehicles in a theater, engagements pay by the troop-day, and security contracts by the guard-day. Soldiers who stay at the base earn nothing, and wages, supplies and fuel are paid as before.')]));
  box.append(panel('Quick actions', h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
    btn('Order supplies', () => cx.open('procurement'), { kind: 'pri' }), btn('Transfer internal supplies', () => cx.open('logistics')), btn('Review missions', () => cx.open('missions')),
    btn('Hire troops', () => cx.open('base', { base: { tab: 'people', sel: null } })), btn('Battalions', () => cx.open('base', { base: { tab: 'forces', sel: null } })), btn('Open base map', () => cx.open('base', { base: { tab: 'map', sel: null } })), btn('View global conflicts', () => cx.open('intel')), btn('Open theater map', () => cx.open('theaters')))));
  // whose money the company spends (v0.103.7): your wallet, the group's cash, or an account of its own, as for the other companies
  const amount = h('input', { class: 'osx-input', type: 'number', min: 1, step: 1000, value: 50000, style: 'width:120px' }); const amt = () => Math.max(0, Math.floor(Number(amount.value) || 0));
  const modeBtn = (m, label, why) => btn(label, () => cx.go(W.setFunding(m)), { kind: V.mode === m ? 'pri sm' : 'sm', disabled: m === 'group' && !V.hasGroup, title: m === 'group' && !V.hasGroup ? 'Found the parent company first (Group on your tablet).' : why });
  box.append(panel('Funding', [
    h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, h('span', { class: 'osx-sub', style: 'padding:0' }, 'The company spends:'), modeBtn('wallet', 'Your wallet', 'It spends and earns through your cash'), modeBtn('group', 'The group\'s cash', 'It spends and earns through the parent company'), modeBtn('own', 'An account of its own', 'A separate account you pay into and take out of')),
    V.mode === 'own' ? h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, amount, btn('Pay in', () => cx.go(W.fund(amt())), { kind: 'pri' }), btn('Take out', () => cx.go(W.take(amt())), { disabled: V.cash <= 0 || V.arrears > 0 })) : null,
    h('span', { class: 'osx-sub', style: 'padding:0' }, V.mode === 'wallet' ? `Everything it buys comes off your wallet (${fmt(g.player.money)} ◎) and everything it earns goes into it.` : V.mode === 'group' ? `It spends and earns through the parent company: ${fmt(V.cash)} ◎ there. Your wallet is not touched.` : `Its own account holds ${fmt(V.cash)} ◎; you hold ${fmt(g.player.money)} ◎. Switching to your wallet or the group returns what it holds to you.`),
    V.arrears > 0 ? h('div', { class: 'osx-note bad', style: 'margin:0' }, `It owes ${fmt(V.arrears)} ◎ (wages or a fine it could not cover): it is paid first when money is available.`) : null,
  ].filter(Boolean)));
  renderCoup(cx, box);
}

/** v0.106.0: the coup (src/war/coup.js). Before: what it needs and the button. During: the march on the capital and surrender. After a win: rule by decree. */
function renderCoup(cx, box) {
  const { g, W } = cx; const C = W.coup(); const run = C.run;
  const rows = [];
  if (C.junta) {
    const gov = g.politics.government(); const active = gov.active;
    rows.push(h('div', { class: 'osx-note', style: 'margin:0' }, `You govern Sund by decree since day ${C.junta.since}. There are no elections and the Assembly does not sit while you rule.`));
    rows.push(...active.slice(0, 10).map((p) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, p.def?.name || p.key), h('small', {}, p.def?.blurb || '')), btn('Revoke', () => cx.go(g.politics.revoke(p.id)), { kind: 'sm' }))));
    const inForce = new Set(active.map((p) => p.key));
    const offer = Object.values(POLICIES).filter((d) => !inForce.has(d.id)).slice(0, 12);
    rows.push(h('b', {}, 'Decree'), ...offer.map((d) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, d.name), h('small', {}, d.blurb || '')), btn('Decree', () => cx.go(g.politics.decree(d.id)), { kind: 'sm pri' }))));
  } else if (run?.state === 'on') {
    rows.push(kv('The capital', C.capital ? `${C.capital.name}: ${C.capital.yours ? 'yours' : 'held by the government'}` : '?', C.capital?.yours ? 'ok' : 'bad'));
    rows.push(kv('Days since it began', String(g.clock.day - run.since)), kv('Ground taken / lost', `${run.won} / ${run.lost}`));
    if (C.stock) rows.push(kv('Fort Gullcrest has left', `${C.stock.soldiers} soldiers, ${C.stock.heavy} heavy-weapons teams`));
    rows.push(h('div', { class: 'osx-note bad', style: 'margin:0' }, 'Your base is not protected while the coup is on, and the Army is hunting you. Order your battalions on the strategic map: take the capital to win.'));
    rows.push(h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, btn('Strategic map ›', () => cx.open('theaters'), { kind: 'pri sm' }), btn('Surrender', () => { if (window.confirm('Surrender the coup? Terms will be imposed: a fine, the licence suspended for a month, your battalions stood down.')) cx.go(W.surrenderCoup()); }, { kind: 'sm' })));
  } else {
    if (run?.state === 'lost') rows.push(h('div', { class: 'osx-note', style: 'margin:0' }, `The last coup failed on day ${run.ended} (${run.why}).`));
    for (const n of C.needs) rows.push(h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${n.ok ? '✓' : '▸'} ${n.text}`)), n.ok ? chip('ready', 'ok') : chip('not yet', 'warn')));
    const ok = C.needs.every((n) => n.ok);
    rows.push(h('div', { class: 'osx-note', style: 'margin:0' }, 'A coup is a campaign on the strategic map against the government\'s garrisons and the field army Fort Gullcrest can put up (the defence budget sets its size). Win by taking the capital; you then govern by decree. Fail or surrender and terms are imposed. While it is on, your base can be attacked and you are hunted.'));
    rows.push(btn('Stage the coup', () => { if (window.confirm('Stage a coup against the government of Sund? Your base loses its protection until a settlement, and the Army will hunt you.')) cx.go(W.stageCoup()); }, { kind: ok ? 'pri' : '', disabled: !ok }));
  }
  box.append(h('div', { style: 'height:10px' }), panel(C.junta ? 'Your government' : run?.state === 'on' ? 'The coup' : 'A coup', rows, { cls: 'osx-mb' }));
}
