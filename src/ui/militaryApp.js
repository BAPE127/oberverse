// The Military app (v0.98.0, mock-up proposal-war-oberpad-company.png page 1). Since v0.103.3 it shows the same five pages as the command terminal in the site office
// (src/ui/militaryPages.js): Home (with the first steps), Troops, Stores, Missions and Map. Every button calls game.war; nothing here writes the record.
import { h } from './panels.js';
import { hero, note, segments, help } from './tabletKit.js';
import { PAGES, badges, renderPage } from './militaryPages.js';
import { LOT } from '../content/facilities.js';

export function militaryApp(ui, body, open) {
  const g = ui.game;
  const W = g.war;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Military'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const V = W.companyView();
  if (!V) { register(ui, body, go); return; }
  // v0.103.3: the same five pages as the command terminal in the site office
  const page = PAGES.includes(ui.milPage) ? ui.milPage : 'Home';
  const bd = badges(ui);
  const seg = segments(PAGES.map((id) => ({ id, label: id, badge: bd[id]?.count || 0 })), page, (t) => { ui.milPage = t; ui.milSub = null; open('Military'); });
  seg.classList.add('five');
  body.append(seg);
  renderPage(ui, body, go, () => open('Military'), page);
}

function register(ui, body, go) {
  const draft = ui.milName || '';
  body.append(hero({ label: 'A private security company', value: 'Register one', sub: 'A name first. Then pay money in, buy a licence from the Civic Office, and a lot at Hollowmoor where Mason\'s Os builds your base.' }));
  const input = h('input', { type: 'text', value: draft, placeholder: 'A name for the company', maxlength: '40', style: 'width:100%;padding:10px;border-radius:10px;border:2px solid #3a3794;background:#15133e;color:inherit;font-size:16px', oninput: (e) => { ui.milName = e.target.value; } });
  body.append(h('div', { class: 'tb-card', style: 'padding:12px' }, input));
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => go(ui.game.war.found(ui.milName || '')) }, 'Register the company')));
  body.append(help('Where do I start?', 'Four steps, all here: register the company (free), put money into its account, buy the Civic Office licence, then buy Hollowmoor Lot and order the site office; Mason\'s Os builds the base from there. You do not need the arms dealer\'s licence to start, but the Arms works\' guns, shells and missiles (Lucas Eastrise at Pipecreek Armory sells the licence) are what your soldiers will carry.'));
  body.append(help('What it will take', `The licence is ${LOT.licence.toLocaleString('en-US')} obols and Hollowmoor Lot ${LOT.price.toLocaleString('en-US')}, then the buildings. Registering costs nothing.`));
}
