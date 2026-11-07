// The company's five pages (v0.103.3; mock-up proposal-war-terminal-v2.png): Home, Troops, Stores, Missions, Map. One set of pages, drawn by two shells: the command terminal in the site office
// (src/ui/militaryTerminal.js) and the Military app on the OberPad (src/ui/militaryApp.js), so the business is run the same way from either. Every button calls game.war; nothing here writes a record.
//
//   Home      cash, what needs attention, the first steps, the base's buildings; factories and the base's detail one tap down
//   Troops    hire, squads (one card each, tap to change), staff, weapons and looks one tap down
//   Stores    what the company keeps, where the arms company supplies it free and what to buy elsewhere; suppliers and holdings one tap down
//   Missions  contracts and engagements, generals one tap down
//   Map       the strategic map
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n } from './tabletKit.js';
import { productionTab } from './militaryProduction.js';
import { contractsTab } from './militaryContracts.js';
import { generalsScreen, engagementScreen } from './militaryGenerals.js';
import { armouryScreen, baseScreen } from './militaryPeople.js';
import { transfersTab } from './militaryTransfers.js';
import { CLASSES, SQUAD } from '../content/troops.js';
import { LOT } from '../content/facilities.js';
import { LINK, SUPPLIES } from '../content/procurement.js';

export const PAGES = ['Home', 'Troops', 'Stores', 'Missions', 'Map'];
const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);
const select = (opts, value, onchange) => h('select', { style: 'padding:6px;border-radius:8px;background:#15133e;color:inherit;border:2px solid #3a3794', onchange: (e) => onchange(e.target.value) }, ...opts.map(([v, t]) => h('option', { value: v, selected: v === value }, t)));
const STATE = { none: 'not ordered', permit: 'waiting on the permit', foundation: 'foundations', frame: 'frame', fitted: 'fitting out', built: 'built', ruin: 'a ruin' };
const STAGES = { 1: 'A security firm', 2: 'A small army', 3: 'A military company' };

/** What to show on the badge of each page (a short word, or ''). */
export function badges(ui) {
  const W = ui.game.war; const out = {};
  const sup = W.supplyLink(); const short = sup ? sup.rows.filter((r) => r.want && r.have < r.want).length : 0;
  if (short) out.Stores = `${short} short`;
  const E = W.engagements(); if (E.open.length) out.Missions = String(E.open.length);
  return out;
}

export function renderPage(ui, box, go, open, page) {
  ui.milPaged = true; // (the old screens draw no "back" button inside a page)
  if (page === 'Troops') troopsPage(ui, box, go, open);
  else if (page === 'Stores') storesPage(ui, box, go, open);
  else if (page === 'Missions') missionsPage(ui, box, go, open);
  else if (page === 'Map') mapPage(ui, box);
  else homePage(ui, box, go, open);
}

// ---------------------------------------------------------------- Home
function homePage(ui, box, go, open) {
  const g = ui.game; const W = g.war; const V = W.companyView();
  const goto = (p) => () => { ui.milPage = p; open(); };
  const B = W.baseView(); const fac = V.lotOwned ? W.facilities() : [];
  const office = fac.find((f) => f.id === 'site_office');
  box.append(
    hero({ label: V.name, value: `${n(V.cash)} obols`, sub: `The company's own money. You hold ${n(g.player.money)}. It pays only from its own account, never from yours.`, tone: V.cash > 0 ? 'pos' : 'warn' }),
    tiles([{ n: `${B.readiness}%`, t: 'ready', tone: B.readiness < 40 ? 'neg' : B.readiness < 70 ? 'warn' : '' }, { n: String(W.people().length), t: 'people' }, { n: V.lotOwned && office?.state === 'built' ? 'safe' : '—', t: 'the base' }]));
  // money in and out: the only two acts that cross between you and the company
  const amount = h('input', { type: 'number', min: 1, step: 1000, value: 50000, style: 'width:120px;padding:8px;border-radius:10px;border:2px solid #3a3794;background:#15133e;color:inherit;font-size:16px' });
  const amt = () => Math.max(0, Math.floor(Number(amount.value) || 0));
  box.append(h('div', { class: 'tb-card', style: 'padding:12px' }, h('div', { class: 'tb-btns', style: 'align-items:center' }, amount,
    h('button', { class: 'tb-btn pri', onclick: () => go(W.fund(amt())) }, 'Pay in'),
    h('button', { class: 'tb-btn', disabled: V.cash <= 0 || V.arrears > 0, onclick: () => go(W.take(amt())) }, 'Take out'))));
  // the first steps, until the site office is ordered
  if (!office || office.state === 'none') {
    const costs = { licence: LOT.licence, lot: LOT.price, office: W.quote('site_office')?.cost ?? 20000 };
    const step = (done, title, sub, action) => row({ icon: done ? '✅' : '➤', title, sub, tone: done ? 'good' : '', action: done ? null : action });
    const need = (V.licensed ? 0 : costs.licence) + (V.lotOwned ? 0 : costs.lot) + costs.office;
    box.append(label('Getting started'), list(
      step(V.cash >= need, `Cash: ${n(need)} obols needed`, `The company holds ${n(V.cash)}.`, h('button', { class: 'tb-mini pri', disabled: g.player.money < need - V.cash || need - V.cash <= 0, onclick: () => go(W.fund(Math.max(0, need - V.cash))) }, 'Pay in the rest')),
      step(V.licensed, `Civic Office licence · ${n(costs.licence)}`, 'Mason\'s Os cannot get a permit without it.', h('button', { class: 'tb-mini pri', disabled: V.cash < costs.licence, onclick: () => go(W.buyLicence()) }, 'Buy')),
      step(V.lotOwned, `${LOT.name} · ${n(costs.lot)}`, V.licensed ? 'Fenced ground with a gate: where the base is built.' : 'Needs the licence first.', h('button', { class: 'tb-mini pri', disabled: !V.licensed || V.cash < costs.lot, onclick: () => go(W.buyLot()) }, 'Buy')),
      step(false, `Site office · ${n(costs.office)}`, V.lotOwned ? 'Built in a few days. The rest of the base opens after it, and the command terminal is inside it.' : 'Needs the lot first.', h('button', { class: 'tb-mini pri', disabled: !V.lotOwned || V.cash < costs.office, onclick: () => go(W.commission('site_office')) }, 'Order'))));
  }
  // what needs attention
  const todo = [];
  const sup = W.supplyLink(); const short = sup ? sup.rows.filter((r) => r.want && r.have < r.want) : [];
  if (short.length) todo.push(row({ icon: '📦', title: `${short.length} supply level${short.length === 1 ? '' : 's'} short`, sub: short.slice(0, 3).map((r) => r.name).join(', '), tag: '›', tone: 'warn', onclick: goto('Stores') }));
  const E = W.engagements(); if (E.open.length) todo.push(row({ icon: '🗺️', title: `${E.open.length} engagement${E.open.length === 1 ? '' : 's'} offered`, sub: E.open[0].title, tag: '›', onclick: goto('Missions') }));
  const free = W.people().filter((p) => CLASSES[p.role]?.group === 'troop' && p.status === 'active' && p.assignedTo == null).length;
  if (free) todo.push(row({ icon: '🪖', title: `${free} soldier${free === 1 ? '' : 's'} in no squad`, tag: '›', onclick: goto('Troops') }));
  for (const s of B.short.slice(0, 3)) todo.push(row({ icon: '⚠️', title: s, tone: 'warn' }));
  if (todo.length) box.append(label('Needs attention'), list(...todo));
  // buildings
  if (V.lotOwned) {
    for (const stage of [1, 2, 3]) {
      const rows = fac.filter((f) => f.stage === stage); if (!rows.length) continue;
      const done = rows.every((f) => f.state === 'built');
      const draw = (b) => b.append(list(...rows.map((f) => row({ icon: f.state === 'built' ? '🏠' : f.state === 'none' ? '📐' : '🚧', title: f.name, sub: f.state === 'none' ? `${f.text || ''} ${n(f.cost)} obols.` : `${STATE[f.state]}${f.daysLeft != null && f.state !== 'built' ? ` · ${f.daysLeft} days to go` : ''}`,
        tag: f.state === 'built' ? '✓' : f.state === 'none' ? '' : '…', tone: f.state === 'built' ? 'good' : '',
        action: f.state === 'none' ? h('button', { class: 'tb-mini pri', disabled: !f.canOrder || V.cash < f.cost, onclick: () => go(W.commission(f.id)) }, 'Order')
          : f.repair ? h('button', { class: 'tb-mini pri', onclick: () => go(W.repairFacility(f.id)) }, f.state === 'ruin' ? 'Rebuild' : 'Repair') : null }))));
      if (done) box.append(fold(ui, `MilStage${stage}`, `Buildings · ${STAGES[stage]} ✓ ›`, draw));
      else { box.append(label(`Buildings · ${STAGES[stage]}${rows[0].open ? '' : ' (opens when the stage before is built)'}`)); draw(box); }
    }
  }
  box.append(fold(ui, 'MilFactories', 'Factories (tanks and helicopters) ›', (b) => productionTab(ui, b, go, open)));
  box.append(fold(ui, 'MilBase', 'The base in detail ›', (b) => baseScreen(ui, b, go, open)));
  box.append(fold(ui, 'MilLog', 'The company\'s log ›', (b) => b.append(list(...(V.log.length ? V.log.slice().reverse().map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'The log fills as the company works.' })])))));
  box.append(help('How the company works', 'The company is its own thing: its own name and its own money. Pay money in and it can buy a licence, the lot and buildings; take it out again when it holds more than it needs. The same five pages are on the command terminal in the site office and in the Military app on your OberPad.'));
}

// ---------------------------------------------------------------- Troops
const HIRE = ['rifleman', 'medic', 'officer', 'anti_tank'].concat(['guard', 'technician']);
function troopsPage(ui, box, go, open) {
  const g = ui.game; const W = g.war; const P = W.people(); const S = W.squads(); const st = W.stock();
  if (W.autoSquads() === undefined) W.setAutoSquads(true); // (the first time the page is opened: new soldiers join a squad and are armed when their training ends)
  const auto = W.autoSquads() !== false;
  const after = (r) => { if (r?.ok && auto) W.organise(); go(r); };
  const troops = P.filter((p) => CLASSES[p.role]?.group === 'troop'); const staff = P.filter((p) => CLASSES[p.role]?.group !== 'troop');
  box.append(hero({ label: 'Troops', value: `${troops.length} soldiers in ${S.length} squad${S.length === 1 ? '' : 's'}`, sub: `${staff.length ? `${staff.length} staff. ` : ''}${troops.filter((p) => p.status === 'training').length ? `${troops.filter((p) => p.status === 'training').length} in training. ` : ''}Everyone costs a daily wage and needs a bed; a soldier needs a uniform from the stores.` }));
  const roles = HIRE.filter((id) => CLASSES[id]);
  box.append(h('div', { class: 'tb-btns', style: 'flex-wrap:wrap' }, ...roles.map((id, i) => h('button', { class: `tb-btn${i === 0 ? ' pri' : ''}`, title: CLASSES[id].text, onclick: () => after(W.hire(id)) }, `+ ${CLASSES[id].name}`, h('small', { style: 'display:block;opacity:.75;font-weight:400' }, `${CLASSES[id].wage}/day`)))));
  if (!(st['supply:uniform'] > 0)) box.append(list(row({ icon: '👕', title: 'No uniforms in the stores', sub: 'A new soldier needs one.', tone: 'warn', action: h('button', { class: 'tb-mini pri', onclick: () => go(W.buySupply('uniform', 10)) }, `Buy 10 · ${n(SUPPLIES.uniform.price * 10)}`) })));
  box.append(list(row({ icon: auto ? '✅' : '▫️', title: 'New soldiers join a squad and are armed automatically', sub: auto ? 'When their training ends. Squads are formed as needed.' : 'Off: you place people yourself.', action: h('span', {}, h('button', { class: 'tb-mini', onclick: () => go(W.setAutoSquads(!auto)) }, auto ? 'Turn off' : 'Turn on'), ' ', h('button', { class: 'tb-mini pri', onclick: () => go(W.organise()) }, 'Do it now')) })));
  // squads: one card each
  const free = troops.filter((p) => p.status === 'active' && p.assignedTo == null);
  const officers = P.filter((p) => CLASSES[p.role]?.leads && p.status === 'active');
  const vehicles = W.equipment().filter((e) => ['vehicle', 'helicopter'].includes(e.kind) && e.status === 'stored');
  for (const s of S) {
    const mem = s.members.map((m) => P.find((x) => x.id === m)).filter(Boolean);
    const unarmed = mem.filter((p) => !p.weapon).length; const openIt = ui.milSquad === s.id;
    const chips = [...Object.entries(s.byClass).map(([k, q]) => `${q} ${CLASSES[k].name.toLowerCase()}${q === 1 ? '' : 's'}`), ...s.vehicles];
    box.append(h('div', { class: 'tb-card', style: 'padding:10px 12px' },
      h('div', { class: 'tb-row tap', onclick: () => { ui.milSquad = openIt ? null : s.id; open(); } }, h('div', { class: 'grow' }, h('b', {}, `${s.name} squad · ${s.size}`), h('small', {}, `${s.leaderName ? `Leader: ${s.leaderName}` : 'No leader yet'} · morale ${s.morale}${s.status !== 'home' ? ` · ${s.status === 'battalion' ? 'in a battalion' : 'away'}` : ''}`)), h('span', { class: `tb-pill ${unarmed ? 'warn' : 'good'}` }, unarmed ? `${unarmed} unarmed` : mem.length ? 'armed' : '')),
      h('small', {}, chips.join(' · ') || 'No one yet'),
      openIt ? h('div', {},
        h('div', { class: 'tb-btns', style: 'margin-top:6px;flex-wrap:wrap' },
          free.length ? select([['', 'Add a soldier…'], ...free.map((p) => [p.id, `${p.name} (${CLASSES[p.role].name})`])], '', (v) => v && go(W.squadAssign(s.id, v))) : null,
          officers.length ? select([['', 'Leader…'], ...officers.map((p) => [p.id, p.name])], s.leader || '', (v) => v && go(W.squadLeader(s.id, v))) : null,
          vehicles.length ? select([['', 'Give a vehicle…'], ...vehicles.map((x) => [x.id, `${x.name} ${x.id}`])], '', (v) => v && go(W.squadVehicle(s.id, v))) : null,
          h('button', { class: 'tb-mini', disabled: s.status !== 'home', onclick: () => go(W.squadDisband(s.id)) }, 'Stand down')),
        s.members.length ? list(...s.members.map((m) => { const p = P.find((x) => x.id === m); return row({ icon: s.leader === m ? '⭐' : '🪖', title: `${p.name} · ${CLASSES[p.role].name}`, sub: p.weapon ? 'armed' : 'unarmed', action: h('button', { class: 'tb-mini', disabled: s.status !== 'home', onclick: () => go(W.squadRemove(m)) }, 'Out') }); })) : null) : null));
  }
  if (!S.length) box.append(list(row({ icon: '—', title: 'No squads yet', sub: free.length ? 'Tap "Do it now" and your soldiers are placed.' : 'Hire a soldier, then they join a squad when their training ends.', action: h('button', { class: 'tb-mini', onclick: () => go(W.squadCreate()) }, 'Form one') })));
  else if (S.length < SQUAD.names.length) box.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => go(W.squadCreate()) }, 'Form an empty squad')));
  // staff
  if (staff.length) box.append(label('Staff'), list(...Object.entries(CLASSES).filter(([, K]) => K.group !== 'troop').map(([id, K]) => {
    const mine = staff.filter((p) => p.role === id); if (!mine.length) return null;
    return row({ icon: id === 'guard' ? '💂' : '🧑‍🏭', title: `${K.name} · ${mine.length}`, sub: `${K.wage} a day each${mine.some((p) => p.post) ? ` · ${mine.filter((p) => p.post).length} on a post` : ''}`, action: h('button', { class: 'tb-mini', disabled: !mine.some((p) => !p.post && p.assignedTo == null), onclick: () => go(W.dismiss(mine.filter((p) => !p.post && p.assignedTo == null).slice(-1)[0]?.id)) }, 'Let go') });
  })));
  box.append(fold(ui, 'MilGear', 'Weapons, armour and looks ›', (b) => armouryScreen(ui, b, go, open)));
  box.append(fold(ui, 'MilRoll', 'Everyone by name ›', (b) => b.append(list(...(P.length ? P.map((p) => row({ icon: '👤', title: `${p.name} · ${CLASSES[p.role]?.name}`, sub: `${p.status}${p.status === 'training' ? ` until day ${p.trainedDay}` : ''}${p.assignedTo ? ` · squad ${S.find((q) => q.id === p.assignedTo)?.name || p.assignedTo}` : ''}${p.post ? ` · ${p.post}` : ''} · morale ${p.morale ?? 70}` })) : [row({ icon: '—', title: 'Nobody yet', sub: 'Hire someone above.' })])))));
}

// ---------------------------------------------------------------- Stores
function storesPage(ui, box, go, open) {
  const g = ui.game; const W = g.war; const S = W.supplyLink(); const V = W.companyView(); const st = W.stock();
  if (!S) return;
  const shown = S.rows.filter((r) => r.want || r.have);
  const rest = S.rows.filter((r) => !(r.want || r.have));
  const owned = S.works.length; const allOn = owned > 0 && S.works.every((w) => w.dedicated);
  box.append(hero({ label: 'Stores', value: 'What the company keeps', sub: 'Set how many of each you want. The arms company supplies them free from what its works make; anything it cannot keep up with you can buy elsewhere. Nothing is ever refused for lack of room.' }));
  if (owned) box.append(list(row({ icon: allOn ? '✅' : '▫️', title: 'Arms works make what the company needs', sub: allOn ? 'Idle stations make what is short and go back to their own work when the stores are full.' : 'Off: the works make only what you set them to. Shipping from their cages is always free.', action: h('button', { class: `tb-mini${allOn ? '' : ' pri'}`, onclick: () => { let r; for (const w of S.works) r = W.setSupplyWorks(w.id, !allOn); go(r); } }, allOn ? 'Turn off' : 'Turn on') })));
  else box.append(list(row({ icon: 'ℹ️', title: 'You own no arms works', sub: 'Until you do, the company can only buy from other manufacturers.' })));
  const stepOf = (v) => (v < 10 ? 1 : v < 50 ? 5 : 10);
  const line = (r) => {
    const miss = Math.max(0, r.want - r.have);
    const state = r.state === 'full' ? ['good', `✓ ${n(r.have)} in stock`] : r.state === 'shipping' ? ['good', `${n(r.have)} · ${n(r.toShip)} ship tomorrow`] : r.state === 'inbound' ? ['good', `${n(r.have)} · ${n(r.inbound)} on the way`] : r.state === 'making' ? ['warn', `${n(r.have)} · ${n(miss)} short, being made`] : r.state === 'idle' ? ['warn', `${n(r.have)} · ${n(miss)} short`] : ['', `${n(r.have)} in stock`];
    const step = (d) => h('button', { class: 'tb-mini', onclick: () => go(W.setSupplyLevel(r.item, Math.max(0, r.want + d * stepOf(d > 0 ? r.want : r.want - 1)))) }, d > 0 ? '+' : '−');
    return row({ icon: '🔫', title: r.name, sub: state[1], tone: state[0], action: h('span', {}, step(-1), h('b', { style: 'display:inline-block;min-width:44px;text-align:center' }, n(r.want)), step(1)) });
  };
  box.append(label('Keep in stock'), list(...(shown.length ? shown.map(line) : [row({ icon: '—', title: 'Nothing set yet', sub: 'Add an item below and choose how many to keep.' })])));
  if (rest.length) box.append(h('div', { class: 'tb-btns' }, select([['', 'Add an item…'], ...rest.map((r) => [r.item, r.name])], '', (v) => v && go(W.setSupplyLevel(v, 10)))));
  const buys = S.rows.filter((r) => r.want && r.buyQty > 0 && (r.state === 'idle' || r.state === 'making'));
  if (buys.length) {
    const total = buys.reduce((a, r) => a + r.buyCost, 0);
    box.append(label(`Short · buy from other manufacturers (${LINK.markup} × value, ${LINK.days} days)`), list(...buys.map((r) => row({ icon: '🛒', title: `${r.name} · ${n(r.buyQty)}`, sub: `${n(r.unit)} each`, action: h('button', { class: 'tb-mini pri', disabled: V.cash < r.buyCost, onclick: () => go(W.buyElsewhere(r.item, r.buyQty)) }, `Buy · ${n(r.buyCost)}`) })),
      buys.length > 1 ? row({ icon: '🛒', title: 'All of them', sub: `${n(total)} obols`, action: h('button', { class: 'tb-mini pri', disabled: V.cash < total, onclick: () => { let t = 0; let r; for (const x of buys) { r = W.buyElsewhere(x.item, x.buyQty); if (r.ok) t += x.buyCost; } go(r?.ok ? { ok: true, text: `Ordered ${buys.length} items for ${n(t)} obols.` } : r); } }, 'Buy all') }) : null));
  }
  if (S.inbound.length) box.append(label('On their way'), list(...S.inbound.map((b) => row({ icon: '🚚', title: `${n(b.qty)} × ${b.name}`, sub: `Due day ${b.due}.` }))));
  box.append(list(row({ icon: '👕', title: 'Uniforms, rations, medicine, fuel, spares', sub: `${n(st['supply:uniform'] || 0)} uniforms · ${n(st['supply:rations'] || 0)} rations · ${n(st['supply:medicine'] || 0)} medicine · ${n(st['supply:fuel'] || 0)} fuel`, tag: '›', onclick: () => { ui.tabFold ||= {}; ui.tabFold.MilBuy = true; open(); } })));
  box.append(fold(ui, 'MilMoves', 'Buy supplies and vehicles, move aircraft and missiles, see everything held ›', (b) => transfersTab(ui, b, go)));
  box.append(help('How the supply link works', `Every morning your arms works ship what their export cages hold toward each level, at no charge: it is your own company's stock moving, so no sale is made. Crates are opened for the purpose. Turn on "Arms works make what the company needs" and their idle stations make what is short, then go back to what they were making. Items bought from other manufacturers cost ${LINK.markup} times their value, are paid from the company's own account, arrive in ${LINK.days} days and cannot be sent back.`));
}

// ---------------------------------------------------------------- Missions
function missionsPage(ui, box, go, open) {
  if (ui.milSub === 'Engagement') { engagementScreen(ui, box, go, open); return; }
  contractsTab(ui, box, go, open);
  box.append(fold(ui, 'MilGenerals', 'Generals ›', (b) => generalsScreen(ui, b, go, open)));
}

// ---------------------------------------------------------------- Map
function mapPage(ui, box) {
  const W = ui.game.war; const bns = W.state()?.war?.battalions || [];
  box.append(hero({ label: 'Strategic map', value: `${bns.length} battalion${bns.length === 1 ? '' : 's'}`, sub: `${bns.filter((b) => b.status !== 'home').length} away. Raise battalions from your squads, enlist in a theatre and give them orders on the provinces.` }),
    h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => ui.openPanel('strategic') }, 'Open the map')));
}
