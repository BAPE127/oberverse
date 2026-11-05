// The Military app (v0.98.0, mock-up proposal-war-oberpad-company.png page 1: the company at a glance, in the OberPad pattern): register the company, pay money in, buy the licence and
// the lot, order the base's buildings, and see what the base can hold. Every button calls game.war; nothing here writes the record.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, note, n, segments } from './tabletKit.js';
import { transfersTab } from './militaryTransfers.js';
import { productionTab } from './militaryProduction.js';
import { contractsTab } from './militaryContracts.js';
import { peopleScreen, squadsScreen, armouryScreen } from './militaryPeople.js';
import { LOT } from '../content/facilities.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const STATE = { none: 'not ordered', permit: 'waiting on the permit', foundation: 'foundations', frame: 'frame', fitted: 'fitting out', built: 'built', ruin: 'a ruin' };
const STAGES = { 1: 'Stage 1 · a security firm', 2: 'Stage 2 · a small army', 3: 'Stage 3 · a military company' };

export function militaryApp(ui, body, open) {
  const g = ui.game;
  const W = g.war;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Military'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const V = W.companyView();
  if (!V) { register(ui, body, go); return; }
  const SEG = [{ id: 'Company', label: 'Company' }, { id: 'Transfers', label: 'Transfers' }, { id: 'Production', label: 'Production' }, { id: 'Contracts', label: 'Contracts' }];
  const tab = SEG.some((x) => x.id === ui.milTab) ? ui.milTab : 'Company';
  body.append(segments(SEG, tab, (t) => { ui.milTab = t; open('Military'); }));
  if (tab === 'Transfers') { transfersTab(ui, body, go); return; }
  if (tab === 'Production') { productionTab(ui, body, go, open); return; }
  if (tab === 'Contracts') { contractsTab(ui, body, go, open); return; }
  if (ui.milSub === 'People') { peopleScreen(ui, body, go, open); return; }
  if (ui.milSub === 'Squads') { squadsScreen(ui, body, go, open); return; }
  if (ui.milSub === 'Armoury') { armouryScreen(ui, body, go, open); return; }
  const cap = W.capacity();
  const prot = W.baseProtected();
  body.append(
    hero({ label: V.name, value: `${n(V.cash)} obols`, sub: `The company's own money. ${V.licensed ? 'Licensed' : 'Not licensed yet'} · ${V.lotOwned ? 'Hollowmoor Lot owned' : 'no ground yet'}.`, tone: V.cash > 0 ? 'pos' : 'warn' }),
    tiles([{ n: String(n(cap.beds)), t: 'beds' }, { n: String(n(cap.stores)), t: 'stores' }, { n: prot ? 'safe' : 'at risk', t: 'the base', tone: prot ? '' : 'warn' }]));
  // money in and out: the only two acts that cross between you and the company
  const amount = h('input', { type: 'number', min: 1, step: 1000, value: 50000, style: 'width:120px;padding:8px;border-radius:10px;border:2px solid #3a3794;background:#15133e;color:inherit;font-size:16px' });
  const amt = () => Math.max(0, Math.floor(Number(amount.value) || 0));
  body.append(h('div', { class: 'tb-card', style: 'padding:12px' }, h('div', { class: 'tb-btns', style: 'align-items:center' }, amount,
    h('button', { class: 'tb-btn pri', onclick: () => go(W.fund(amt())) }, 'Pay in'),
    h('button', { class: 'tb-btn', disabled: V.cash <= 0 || V.arrears > 0, onclick: () => go(W.take(amt())) }, 'Take out'))),
  h('div', { class: 'tb-sub', style: 'padding:0 6px 6px' }, `You hold ${n(g.player.money)} obols. The company pays only from its own money, never from yours.`));
  body.append(list(
    row({ icon: '📜', title: 'Civic Office licence', sub: V.licensed ? 'A private security company, in good standing.' : 'Without it, Mason\'s Os cannot get a building permit.', tag: V.licensed ? '✓' : `${n(LOT.licence)}`, tone: V.licensed ? 'good' : 'warn',
      action: V.licensed ? null : h('button', { class: 'tb-mini pri', disabled: V.cash < LOT.licence, onclick: () => go(W.buyLicence()) }, 'Buy') }),
    row({ icon: '🗺️', title: LOT.name, sub: V.lotOwned ? 'Fenced, with a gate. Walk there from the Yards\' west road.' : 'Ground for the base, with a fence and a gate. Needs the licence first.', tag: V.lotOwned ? '✓' : `${n(LOT.price)}`, tone: V.lotOwned ? 'good' : 'warn',
      action: V.lotOwned ? null : h('button', { class: 'tb-mini pri', disabled: !V.licensed || V.cash < LOT.price, onclick: () => go(W.buyLot()) }, 'Buy') })));
  if (V.lotOwned) {
    const fac = W.facilities();
    for (const stage of [1, 2, 3]) {
      const rows = fac.filter((f) => f.stage === stage);
      if (!rows.length) continue;
      body.append(h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, STAGES[stage] + (rows[0].open ? '' : ' (opens when the stage before is built)')));
      body.append(list(...rows.map((f) => row({ icon: f.state === 'built' ? '🏠' : f.state === 'none' ? '📐' : '🚧', title: f.name, sub: f.state === 'none' ? `${f.text || ''} ${n(f.cost)} obols.` : `${STATE[f.state]}${f.daysLeft != null && f.state !== 'built' && f.state !== 'ruin' ? ` · ${f.daysLeft} days` : ''}${f.state === 'built' && f.gate === 'damaged' ? ' · damaged' : ''}`,
        tag: f.state === 'built' ? '✓' : f.state === 'none' ? '' : '…', tone: f.state === 'built' ? 'good' : '',
        action: f.state === 'none' ? h('button', { class: 'tb-mini pri', disabled: !f.canOrder || V.cash < f.cost, onclick: () => go(W.commission(f.id)) }, 'Order')
          : f.repair ? h('button', { class: 'tb-mini pri', onclick: () => go(W.repairFacility(f.id)) }, f.state === 'ruin' ? 'Rebuild' : 'Repair') : null }))));
    }
  }
  const sub = (id, icon, title, text) => row({ icon, title, sub: text, tag: '›', onclick: () => { ui.milSub = id; open('Military'); } });
  body.append(list(sub('People', '🪖', `People · ${W.people().length}`, 'Hire guards, technicians and soldiers; training and wages.'), sub('Squads', '👥', `Squads · ${W.squads().length}`, 'Leaders, members and the vehicles they take.'), sub('Armoury', '🔫', 'Armoury', 'What each class carries, armour and looks.')));
  body.append(help('How the company works', 'The company is its own thing: its own name and its own money. Pay money in and it can buy a licence, the lot and buildings; take it out again when it holds more than it needs. The government\'s fort at Gullcrest is a separate matter and never touches it.',
    'Before any coup your base cannot be damaged: that is the one rule everything else is built on.'));
  body.append(fold(ui, 'MilitaryLog', 'The company\'s log ›', (box) => box.append(list(...(V.log.length ? V.log.slice().reverse().map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'The log fills as the company buys and builds.' })])))));
}

function register(ui, body, go) {
  const draft = ui.milName || '';
  body.append(hero({ label: 'A private security company', value: 'Register one', sub: 'A name first. Then pay money in, buy a licence from the Civic Office, and a lot at Hollowmoor where Mason\'s Os builds your base.' }));
  const input = h('input', { type: 'text', value: draft, placeholder: 'A name for the company', maxlength: '40', style: 'width:100%;padding:10px;border-radius:10px;border:2px solid #3a3794;background:#15133e;color:inherit;font-size:16px', oninput: (e) => { ui.milName = e.target.value; } });
  body.append(h('div', { class: 'tb-card', style: 'padding:12px' }, input));
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => go(ui.game.war.found(ui.milName || '')) }, 'Register the company')));
  body.append(help('What it will take', `The licence is ${LOT.licence.toLocaleString('en-US')} obols and Hollowmoor Lot ${LOT.price.toLocaleString('en-US')}, then the buildings. Registering costs nothing.`));
}
