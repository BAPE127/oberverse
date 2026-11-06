// The company's command terminal (v0.103.2; mock-up proposal-war-terminal-supply.png): the mercenary business is run from the site office at Hollowmoor Lot, not from the tablet. A full-screen
// terminal in the style of the arms and aerospace terminals: a side bar of pages and the page itself. The pages are the same screens the Military app used to carry (people, squads, armoury, base,
// generals, contracts, production), now in the terminal, with two new ones: the Overview (the base's buildings) and Supply (standing levels from the Arms works). The tablet keeps the founding steps.
// Every button calls game.war; nothing here writes a record.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, note, n } from './tabletKit.js';
import { transfersTab } from './militaryTransfers.js';
import { productionTab } from './militaryProduction.js';
import { contractsTab } from './militaryContracts.js';
import { generalsScreen, engagementScreen } from './militaryGenerals.js';
import { peopleScreen, squadsScreen, armouryScreen, baseScreen } from './militaryPeople.js';
import { LINK } from '../content/procurement.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);
const STATE = { none: 'not ordered', permit: 'waiting on the permit (the Civic Office stamps it next morning)', foundation: 'foundations', frame: 'frame', fitted: 'fitting out', built: 'built', ruin: 'a ruin' };
const STAGES = { 1: 'Stage 1 · a security firm', 2: 'Stage 2 · a small army', 3: 'Stage 3 · a military company' };
const SUBS = ['People', 'Squads', 'Armoury', 'Base', 'Generals'];
const PAGES = ['Overview', 'People', 'Squads', 'Armoury', 'Supply', 'Base', 'Generals', 'Contracts', 'Production'];
const PAGE_NAME = { Generals: 'Generals & engagements' };

export function militaryTerminalPanel(ui, body) {
  const g = ui.game; const W = g.war; body.classList.add('milterm');
  const top = h('div', { class: 'mt-top' }); const side = h('nav', { class: 'mt-nav' }); const main = h('main', { class: 'mt-main' });
  body.append(top, h('div', { class: 'mt-wrap' }, side, main));
  let alive = true;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); render(); };
  const open = () => render();
  const pageOf = () => {
    let p = ui.termPage || 'Overview';
    if (ui.milSub === 'Engagement') p = 'Engagement';
    else if (ui.milSub && SUBS.includes(ui.milSub)) p = ui.milSub;
    else if (SUBS.includes(p) || p === 'Engagement') p = 'Overview'; // a screen's own back button clears milSub
    if (!PAGES.includes(p) && p !== 'Engagement') p = 'Overview';
    ui.termPage = p; return p;
  };
  const goPage = (id) => { ui.termPage = id; ui.milSub = SUBS.includes(id) ? id : null; ui.milTab = 'Company'; render(); };

  function render() {
    if (!alive) return;
    const V = W.companyView();
    const page = pageOf();
    top.replaceChildren();
    if (!V) { top.append(h('div', {}, h('h1', {}, 'COMMAND TERMINAL'), h('small', {}, 'Hollowmoor Lot · site office'))); main.replaceChildren(h('div', { class: 'tb-card', style: 'padding:16px' }, h('b', {}, 'No company is registered.'), h('p', {}, 'Register one in the Military app on your tablet: a name, some money, the Civic Office licence, then this lot.')), closeRow()); side.replaceChildren(); return; }
    const m = W.state(); const bns = m?.war?.battalions || []; const E = W.engagements();
    top.append(h('div', {}, h('h1', {}, `${V.name.toUpperCase()} · COMMAND TERMINAL`), h('small', {}, 'Hollowmoor Lot · site office')), h('div', { class: 'sp' }),
      h('div', {}, h('small', {}, 'COMPANY CASH'), h('b', {}, `${n(V.cash)} obols`)), h('div', {}, h('small', {}, 'BATTALIONS'), h('b', {}, `${bns.length} raised · ${bns.filter((b) => b.status !== 'home').length} away`)),
      h('div', {}, h('small', {}, 'DAY'), h('b', {}, `${g.clock.day} · ${g.clock.timeString}`)), h('button', { class: 'mt-x', onclick: () => ui.closePanel() }, '✕ Step away'));
    const sup = W.supplyLink(); const short = sup ? sup.rows.filter((r) => r.want && r.have < r.want).length : 0;
    const badge = { Overview: '', People: String(W.people().length), Squads: String(W.squads().length), Armoury: '', Supply: short ? `${short} short` : sup?.rows.some((r) => r.want) ? 'filled' : '', Base: '', Generals: E.open.length ? `${E.open.length} open` : '', Contracts: '', Production: '' };
    const warn = (id) => id === 'Supply' && short;
    side.replaceChildren(...PAGES.map((id) => h('button', { class: `mt-item${(page === id || (page === 'Engagement' && id === 'Generals')) ? ' on' : ''}`, onclick: () => goPage(id) }, h('span', {}, PAGE_NAME[id] || id), badge[id] ? h('em', { class: warn(id) ? 'w' : '' }, badge[id]) : null)),
      h('button', { class: 'mt-item', onclick: () => ui.openPanel('strategic') }, h('span', {}, 'Strategic map'), h('em', {}, '›')));
    const box = h('div', { class: 'mt-page' });
    const nt = note(ui); if (nt) box.append(nt);
    if (page === 'Overview') overview(ui, box, go, V);
    else if (page === 'People') peopleScreen(ui, box, go, open);
    else if (page === 'Squads') squadsScreen(ui, box, go, open);
    else if (page === 'Armoury') armouryScreen(ui, box, go, open);
    else if (page === 'Base') baseScreen(ui, box, go, open);
    else if (page === 'Generals') generalsScreen(ui, box, go, open);
    else if (page === 'Engagement') engagementScreen(ui, box, go, open);
    else if (page === 'Contracts') contractsTab(ui, box, go, open);
    else if (page === 'Production') productionTab(ui, box, go, open);
    else if (page === 'Supply') supplyPage(ui, box, go);
    main.replaceChildren(box);
  }
  const closeRow = () => h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn', onclick: () => ui.closePanel() }, 'Step away'));
  render();
  return { title: '', className: 'milterm-panel', onClose: () => { alive = false; } };
}

/** The Overview: the company at a glance and the base's buildings, ordered and repaired here. */
function overview(ui, box, go, V) {
  const g = ui.game; const W = g.war; const cap = W.capacity(); const prot = W.baseProtected();
  box.append(
    hero({ label: V.name, value: `${n(V.cash)} obols`, sub: `The company's own money. ${V.licensed ? 'Licensed' : 'Not licensed yet'} · ${V.lotOwned ? 'Hollowmoor Lot owned' : 'no ground yet'}. Pay money in or take it out in the Military app on your tablet.`, tone: V.cash > 0 ? 'pos' : 'warn' }),
    tiles([{ n: String(n(cap.beds)), t: 'beds' }, { n: String(n(cap.stores)), t: 'stores' }, { n: prot ? 'safe' : 'at risk', t: 'the base', tone: prot ? '' : 'warn' }]));
  if (V.lotOwned) {
    const fac = W.facilities();
    for (const stage of [1, 2, 3]) {
      const rows = fac.filter((f) => f.stage === stage); if (!rows.length) continue;
      box.append(label(STAGES[stage] + (rows[0].open ? '' : ' (opens when the stage before is built)')));
      box.append(list(...rows.map((f) => row({ icon: f.state === 'built' ? '🏠' : f.state === 'none' ? '📐' : '🚧', title: f.name, sub: f.state === 'none' ? `${f.text || ''} ${n(f.cost)} obols.` : `${STATE[f.state]}${f.daysLeft != null && f.state !== 'built' ? ` · ${f.daysLeft} days to go` : ''}`,
        tag: f.state === 'built' ? '✓' : f.state === 'none' ? '' : '…', tone: f.state === 'built' ? 'good' : '',
        action: f.state === 'none' ? h('button', { class: 'tb-mini pri', disabled: !f.canOrder || V.cash < f.cost, onclick: () => go(W.commission(f.id)) }, 'Order')
          : f.repair ? h('button', { class: 'tb-mini pri', onclick: () => go(W.repairFacility(f.id)) }, f.state === 'ruin' ? 'Rebuild' : 'Repair') : null }))));
    }
  }
  box.append(list(row({ icon: '🗺️', title: 'Strategic map', sub: 'Raise battalions from your squads, enlist in a theatre, and give them orders on the provinces.', tag: '›', onclick: () => ui.openPanel('strategic') })));
  box.append(help('How the company is run', 'This terminal is the company\'s office: people, squads, the armoury, supply, generals, contracts and the war map are all run from here. The tablet only founds the company (a name, money, the licence, the lot, the first building) and tells you how things stand. The company is its own thing: its own name and its own money, and it pays only from its own account.'));
  box.append(fold(ui, 'MilitaryLog', 'The company\'s log ›', (b2) => b2.append(list(...(V.log.length ? V.log.slice().reverse().map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'The log fills as the company works.' })])))));
}

const STATE_TEXT = { off: ['not kept', ''], full: ['filled', 'good'], inbound: ['on its way', 'good'], shipping: ['ships tomorrow', 'good'], making: ['the works is making it', 'warn'], idle: ['the works is not making it', 'warn'] };

/** Supply: the standing levels, filled free by the Arms works; what the works cannot keep up with is bought from other manufacturers. */
function supplyPage(ui, box, go) {
  const g = ui.game; const W = g.war; const S = W.supplyLink(); const V = W.companyView();
  if (!S) return;
  box.append(
    hero({ label: 'Supply from the arms company', value: `${n(S.flow.free)} items free this week`, sub: 'Set what the company should keep in the stores. Your arms works ships what its export cage holds toward each level every morning, at no charge. What the works cannot keep up with, you can buy from other manufacturers.' }),
    tiles([{ n: n(S.flow.free), t: 'from your works' }, { n: n(S.flow.bought), t: 'bought elsewhere' }, { n: `${n(S.flow.spent)}`, t: 'spent elsewhere' }]));
  if (!S.works.length) box.append(list(row({ icon: '🏭', title: 'You own no arms works', sub: 'Buy a works at Mill Road Yards (the licence is Lucas Eastrise\'s). Until then the company can only buy from other manufacturers.' })));
  else box.append(label('Your arms works'), list(...S.works.map((w) => row({ icon: '🏭', title: w.name, sub: w.dedicated ? `Makes for the company: ${w.retooled} of ${w.stations} stations are on what it needs. Idle stations take the company\'s shortfall and go back when the stores are full.` : 'Makes what you set it to. Switch this on and its idle stations make what the company is short of.', tag: w.dedicated ? 'for the company' : '', tone: w.dedicated ? 'good' : '',
    action: h('button', { class: `tb-mini${w.dedicated ? '' : ' pri'}`, onclick: () => go(W.setSupplyWorks(w.id, !w.dedicated)) }, w.dedicated ? 'Stop' : 'Make for the company') }))));
  const rows = S.rows.filter((r) => r.want || r.have || r.caged || r.canMake);
  const input = (r) => { const el = h('input', { type: 'number', min: 0, max: LINK.max, step: 1, value: r.want, style: 'width:70px;padding:5px;border-radius:8px;border:2px solid #3a3794;background:#15133e;color:inherit', onchange: () => go(W.setSupplyLevel(r.item, Number(el.value))) }); return el; };
  box.append(label('Standing levels'), list(...(rows.length ? rows.map((r) => {
    const [txt, tone] = STATE_TEXT[r.state];
    const bits = [`${n(r.have)} in the stores`, r.inbound ? `${n(r.inbound)} on the way` : '', `${n(r.caged)} in the cages`, r.makers ? `${r.makers} station${r.makers === 1 ? '' : 's'} making it${r.staffed < r.makers ? ` (${r.makers - r.staffed} unstaffed)` : ''}` : (r.canMake ? 'no station making it' : 'not yet researched')].filter(Boolean);
    return row({ icon: '🔫', title: `${r.name} · keep ${n(r.want)}`, sub: `${txt}. ${bits.join(' · ')}.`, tone, tag: r.want ? `${n(r.have)}/${n(r.want)}` : '',
      action: h('span', {}, input(r), ' ', r.buyQty > 0 ? h('button', { class: `tb-mini${r.state === 'idle' ? ' pri' : ''}`, disabled: V.cash < r.buyCost, title: `${LINK.markup} × the item's value, in ${LINK.days} days`, onclick: () => go(W.buyElsewhere(r.item, r.buyQty)) }, `Buy ${n(r.buyQty)} elsewhere · ${n(r.buyCost)}`) : null) });
  }) : [row({ icon: '—', title: 'No levels set', sub: 'Type a number against an item to keep that many in the stores. Items appear here once you own a works, or have some in the stores.' })])));
  if (S.inbound.length) box.append(label('On their way from other manufacturers'), list(...S.inbound.map((b) => row({ icon: '🚚', title: `${n(b.qty)} × ${b.name}`, sub: `Due day ${b.due}.` }))));
  box.append(help('How the supply link works', `Every morning each works ships what its export cage holds toward each level, at no charge: it is your own company's stock moving, so no sale is made and no money changes hands. Crates are opened for the purpose and the rest of an opened crate stays in the cage. A works marked "makes for the company" retools its idle stations to what the company is short of, finishing the unit in hand first, and goes back to what it was making when the level is met. Items bought from other manufacturers cost ${LINK.markup} times their value, are paid from the company's own account, and arrive in ${LINK.days} days; they can never be sent back. Uniforms, rations, medicine, spares and fuel are not arms: the company still buys those from suppliers (Armoury → supplies).`));
  box.append(fold(ui, 'MilMoves', 'Aircraft, missiles and one-off moves ›', (b2) => transfersTab(ui, b2, go)));
  box.append(fold(ui, 'MilLink', 'The link\'s log ›', (b2) => b2.append(list(...(S.log.length ? S.log.map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'Shipments and purchases are written here.' })])))));
}
