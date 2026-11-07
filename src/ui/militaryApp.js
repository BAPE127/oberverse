// The Military app (v0.98.0). Since v0.103.4 it is minimal, like the aerospace app: register the company here, then a few real status lines and one button that opens the command terminal
// (src/ui/osint/terminal.js), where the company is run. The terminal opens from here anywhere, and from the site office at Hollowmoor Lot.
import { h } from './panels.js';
import { hero, note, row, help } from './tabletKit.js';
import { LOT } from '../content/facilities.js';

const n = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');

export function militaryApp(ui, body, open) {
  const g = ui.game; const W = g.war;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Military'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const B = W.briefing();
  if (!B) { register(ui, body, go); return; }
  body.append(
    hero({ label: B.name, value: B.status, sub: `${n(B.funds)} obols in the company account.`, tone: B.funds > 0 ? 'pos' : 'warn' }),
    h('div', { class: 'tb-card list' },
      row({ icon: '🪖', title: `${n(B.personnel.total)} people · ${B.personnel.squads} squads`, sub: `${n(B.personnel.available)} available, ${B.personnel.training} training.` }),
      row({ icon: '🎯', title: `${B.missions.active} operation${B.missions.active === 1 ? '' : 's'} under way`, sub: `${B.missions.open} offered · ${B.missions.done} completed · readiness ${B.readiness}%.` }),
      row({ icon: '📦', title: B.supply.short ? `${B.supply.short} supply level${B.supply.short === 1 ? '' : 's'} short` : 'Supplies', sub: `${B.orders.transit + B.orders.pending} order${B.orders.transit + B.orders.pending === 1 ? '' : 's'} on their way.`, tone: B.supply.short ? 'warn' : '' })),
    h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', onclick: () => ui.openPanel('militaryterminal') }, 'Open the command terminal')),
    help('About the terminal', 'The command terminal is where the company is run: the base, procurement, internal logistics, missions, the world and its theaters. It opens from here anywhere, and from the terminal in the site office at Hollowmoor Lot.'));
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
