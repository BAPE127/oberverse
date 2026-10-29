// The Companies app and the naming panel (v0.60.0): the owner's four businesses — their names, their
// own accounts — on the tablet. Everything shown is read from game.corp; every button calls it.
import { h } from './panels.js';
import { COMPANY_IDS } from '../systems/corporate.js';
import { PLAYER_COMPANIES } from '../corp/identity.js';

const ob = (n) => `${Math.round(n).toLocaleString()} obols`;
const WHERE = { arms: 'Get a licence from Lucas, then buy a works at Mill Road Yards.', shipping: 'Captain Ober is selling Ober & Sons Maritime at the Yards.', aerospace: 'Billie Roost is selling her aeroworks at Starling Flats.', farming: 'Deeds to farmland are at the Lariat County Land Office.' };

/** The panel that opens when a business is founded: name it, or keep the name it came with. */
export function corpNamePanel(ui, body, opts) {
  const g = ui.game;
  const id = opts.id;
  const C = g.corp.ensureCompany(id);
  if (!C) return { title: 'Name your company' };
  const msg = h('p', { class: 'muted' }, 'Letters, numbers, spaces and & \' . , - — 3 to 40 characters. You can change it any time in the Companies app.');
  const input = h('input', { type: 'text', class: 'debug-input', value: C.name, maxlength: 40, style: 'width:100%;font-size:18px' });
  const done = () => ui.closePanel();
  body.append(
    h('p', { class: 'doc' }, `${PLAYER_COMPANIES[id].icon} Your ${PLAYER_COMPANIES[id].kind.toLowerCase()} is founded. What is it called?`),
    input, msg,
    h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' },
      h('button', { class: 'primary', onclick: () => { const r = g.corp.rename(id, input.value); if (r.ok) { ui.audio.sfx('sfx_coin'); done(); } else { msg.textContent = r.text; msg.className = 'neg'; ui.audio.sfx('sfx_fail'); } } }, 'Register this name'),
      h('button', { class: 'ghost', onclick: () => { g.corp.rename(id, C.name); done(); } }, `Keep "${C.name}"`)));
  setTimeout(() => input.focus(), 0);
  return { title: 'Name your company', onClose: () => { C.named = true; } };
}

/** The tablet's Companies app. */
export function companiesApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  let note = null;
  const say = (r) => { note = r; open('Companies'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const go = (r) => { ui.corpNote = r.text; ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); open('Companies'); };
  void say; void note;
  body.append(h('p', { class: 'muted' }, 'Your businesses are separate companies. Until you pay money into one, it simply spends yours; once you do, it pays its own bills from its own account — and goes into debt, not into your pocket, if it runs short.'));
  const list = h('div', { class: 'list' });
  for (const id of COMPANY_IDS) {
    const p = K.profile(id);
    const P = PLAYER_COMPANIES[id];
    if (!p) { list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, P.icon), h('div', { class: 'grow' }, h('div', { class: 'name' }, P.kind, h('span', { class: 'tag' }, 'not yet started')), h('div', { class: 'desc' }, WHERE[id])))); continue; }
    const reg = K.registry().find((r) => r.playerId === id);
    const m = K.metricsOf(reg, 'month');
    const place = K.placeOf(id, 'month');
    const k = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString());
    const name = h('input', { type: 'text', class: 'debug-input', value: p.name, maxlength: 40, style: 'width:100%' });
    const amount = h('input', { type: 'number', class: 'debug-qty', min: 1, step: 100, value: 1000, style: 'width:110px' });
    const n = () => Math.max(0, Math.floor(Number(amount.value) || 0));
    list.append(h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'icon' }, P.icon),
      h('div', { class: 'grow' },
        h('div', { class: 'name' }, p.name, h('span', { class: 'tag' }, p.sectorName), h('span', { class: 'tag good' }, 'private'), p.funded ? h('span', { class: 'tag' }, 'own account') : h('span', { class: 'tag' }, 'uses your money')),
        h('div', { class: 'desc' }, `${p.kind} · ${p.hq} · ${p.legacy ? 'in your hands before the registry' : `founded day ${p.founded}`}${p.names.length > 1 ? ` · formerly ${p.names.slice(0, -1).map((x) => x.name).join(', ')}` : ''}`),
        h('div', { class: 'desc' }, `Last month: revenue ${k(m.revenue)} · net ${k(m.net)} · estimated value ${k(m.valuation)} (an estimate, not cash)${place?.revenue.rank ? ` · ${place.revenue.rank === 1 ? 'first' : `#${place.revenue.rank}`} of ${place.revenue.of} in ${p.sectorName.toLowerCase()} by revenue` : ''}`),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin:6px 0' }, name, h('button', { class: 'small', onclick: () => go(K.rename(id, name.value)) }, 'Rename')),
        p.funded
          ? h('div', { class: 'desc' }, `Its own cash ${ob(p.ownCash)}${p.arrears ? ` · OWES ${ob(p.arrears)}` : ''} · you have paid in ${ob(p.contributed)} and taken out ${ob(p.distributed)}`)
          : h('div', { class: 'desc' }, `It draws on your ${ob(g.player.money)}. Brought in at cost: ${ob(p.inKind)}.`),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:6px' }, amount,
          h('button', { class: 'small primary', onclick: () => go(K.contribute(id, n())) }, 'Pay in'),
          p.funded ? h('button', { class: 'small', onclick: () => go(K.distribute(id, n())) }, 'Take out') : null,
          p.funded ? h('button', { class: 'small ghost', onclick: () => go(K.unfund(id)) }, 'Close its account') : null))));
  }
  body.append(list);
}
