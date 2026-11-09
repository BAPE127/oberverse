// Fleets and international contracts (v0.103.10): Base Operations → Fleets and Contracts. A fleet is made of ships lent by the shipping company (never copied): warships to bombard and blockade and to
// escort, cargo ships as transports. A battalion boards a fleet with the Landing order on the strategic map. Contracts are the embassies' offers: the screen shows what each asks and whether the
// battalions and fleets you own can meet it. Every button calls `game.war`; nothing here changes a record.
import { h, panel, stats, stat, btn, chip, empty } from './kit.js';

const fmt = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');
const form = (S) => (S.navy ||= { name: '', pick: [], base: {}, target: {}, take: {} });
const sel = (opts, ph, on, cur) => h('select', { onchange: (e) => on(e.target.value) }, h('option', { value: '' }, ph), ...opts.map(([v, t]) => h('option', { value: v, selected: v === cur }, t)));
const shipLine = (x) => `${x.name} · ${x.role === 'warship' ? `attack ${x.attack}, defence ${x.defense}` : `holds ${x.hold}`} · ${x.speed} km/h · condition ${x.condition}%`;

export function renderFleets(cx, box) {
  const { W, S } = cx; const N = W.navy(); const F = form(S.base || S); if (!N) { box.append(empty('The shipping company is not started: ships are lent from it.')); return; }
  F.pick = F.pick.filter((id) => N.free.some((x) => x.id === id));
  box.append(stats(stat('Ships free to lend', String(N.free.length), { sub: 'docked, no cargo, no contract' }), stat('Fleets', String(N.fleets.length)), stat('Coasts to base on', String(N.bases.length), { sub: N.bases.length ? 'held by the side you serve' : 'enlist in a theatre first' })));
  box.append(h('div', { style: 'height:8px' }));
  const name = h('input', { class: 'osx-input', value: F.name, placeholder: 'name (optional)', style: 'width:200px', oninput: (e) => { F.name = e.target.value; } });
  box.append(panel('Form a fleet', [
    h('div', { class: 'osx-sub' }, 'Ships come from your shipping company and go back to it: a lent ship is held and cannot sail for the shipping company meanwhile. Warships bombard, blockade and escort; ships with holds carry a battalion (a soldier takes one place, a vehicle five). A ship lost at sea is lost for good.'),
    ...(N.free.length ? N.free.map((x) => h('label', { class: 'osx-row tap', style: 'cursor:pointer' }, h('span', {}, h('input', { type: 'checkbox', checked: F.pick.includes(x.id), onchange: (e) => { F.pick = e.target.checked ? [...F.pick, x.id] : F.pick.filter((i) => i !== x.id); cx.refresh(); } }), ' ', h('b', {}, x.name), h('small', { style: 'margin-left:6px' }, shipLine(x))), chip(x.role, x.role === 'warship' ? 'warn' : ''))) : [empty('No free ships. Buy some in Fleet Command (the shipping company).')]),
    h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, name, btn('Form fleet', () => { const r = W.raiseFleet(F.name, F.pick); if (r.ok) { F.name = ''; F.pick = []; } cx.go(r); }, { kind: 'pri', disabled: !F.pick.length }))]));
  box.append(h('div', { style: 'height:8px' }));
  if (!N.fleets.length) { box.append(empty('No fleets yet.')); return; }
  for (const f of N.fleets) {
    const abroad = f.status === 'abroad'; const targets = abroad ? W.fleetTargets(f.id) : [];
    box.append(panel(f.name, [
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, chip(abroad ? `off ${f.baseName}` : 'at home', abroad ? 'bl' : 'ok'), chip(`${f.ships.length} ships`), chip(`firepower ${f.firepower}`), chip(`escort ${f.escort}`), chip(`holds ${f.hold}`), f.busy ? chip('battalion aboard', 'warn') : abroad ? chip(f.canAct ? 'can act today' : 'acted today', f.canAct ? 'ok' : 'warn') : null, f.contract ? chip(`contract ${f.contract}`, 'bl') : null),
      ...f.ships.map((x) => h('div', { class: 'osx-sub', style: 'padding:0' }, `${x.role === 'warship' ? '⚔' : '▣'} ${shipLine(x)}`)),
      !abroad ? h('div', { class: 'osx-ctl' }, sel(N.bases.map((p) => [p.id, `${p.name} (${p.country})`]), N.bases.length ? 'Base it on…' : 'Enlist in a theatre first', (v) => { F.base[f.id] = v; }, F.base[f.id]), btn('Sail', () => cx.go(W.deployFleet(f.id, F.base[f.id])), { kind: 'pri sm', disabled: !N.bases.length }), btn('Stand down', () => cx.go(W.disbandFleet(f.id)), { kind: 'sm', disabled: Boolean(f.contract) }))
        : h('div', {}, h('div', { class: 'osx-ctl' }, sel(targets.map((t) => [t.id, `${t.name} · ${t.km} km${t.fort ? ` · fort ${t.fort}` : ''}`]), 'Coast…', (v) => { F.target[f.id] = v; }, F.target[f.id]),
          ...Object.entries(N.missions).map(([type, label]) => btn(label, () => cx.go(W.fleetMission(f.id, type, F.target[f.id])), { kind: 'sm', disabled: !f.canAct || !targets.length, title: type === 'bombard' ? 'Takes a share off the next fight at that coast' : 'Shuts the port: its garrison is cut for some days' }))),
          h('div', { class: 'osx-ctl', style: 'margin-top:6px' }, btn('Recall', () => cx.go(W.recallFleet(f.id)), { kind: 'sm', disabled: f.busy }), h('small', { class: 'osx-sub', style: 'padding:0' }, 'To land or sail a battalion: Strategic Map → pick it → Landing, then the coast. The best fleet near it with room takes it.'))),
    ].filter(Boolean), { sub: abroad ? `One act a day within ${N.reach} km of the base. Ships wear and may be lost.` : 'Base it on a coast held by the side you serve.' }), h('div', { style: 'height:8px' }));
  }
}

export function renderContracts(cx, box) {
  const { W, S } = cx; const I = W.intl(); const F = form(S.base || S); if (!I) { box.append(empty('You have no company.')); return; }
  box.append(stats(stat('Offers', String(I.offers.length), { sub: 'from the embassies, refreshed every few days' }), stat('On contract', String(I.active.length), { sub: 'three at most' }), stat('Standing', String(Math.round(I.rep?.score || 0)), { sub: `${I.rep?.done || 0} done · ${I.rep?.failed || 0} failed` })));
  box.append(h('div', { style: 'height:8px' }));
  if (I.active.length) {
    box.append(panel('Your contracts', I.active.map((c) => h('div', { class: 'osx-row' }, h('div', {}, h('b', {}, `${c.kindName}: ${c.targetName}`), h('small', {}, `${c.clientName} against ${c.enemyName} · ${c.daysLeft} days left · ${c.kind === 'take' ? 'take it' : `${c.progress}/${c.need} days served`} · paid at ${c.rate}× the retainer, ${fmt(c.bonus)} ◎ on completion · ${[...c.battalions, ...c.fleets].join(', ') || 'no units'}`)), btn('Walk away', () => cx.go(W.abandonContract(c.id)), { kind: 'warn sm' }))), { sub: 'The units on a contract are paid its rate instead of the retainer, never both.' }), h('div', { style: 'height:8px' }));
  }
  box.append(panel('Offers from the embassies', I.offers.length ? I.offers.map((o) => {
    const pick = (F.take[o.id] ||= { b: [], f: [] }); const bs = I.free.battalions; const fs = I.free.fleets;
    const needs = o.kind === 'blockade' ? `${o.req.warships} warship${o.req.warships === 1 ? '' : 's'} in the fleets named` : `${o.req.people} soldiers${o.req.tank ? ` and ${o.req.tank} tank` : ''} in the battalions named`;
    const tick = (list, key, id) => h('label', { style: 'margin-right:10px;cursor:pointer' }, h('input', { type: 'checkbox', checked: pick[key].includes(id), onchange: (e) => { pick[key] = e.target.checked ? [...pick[key], id] : pick[key].filter((i) => i !== id); cx.refresh(); } }), ` ${list.find((x) => x.id === id).name}`);
    return h('div', { class: 'osx-row', style: 'display:block' },
      h('div', { class: 'osx-sqh' }, h('b', {}, `${o.kindName}: ${o.targetName}`), chip(`${o.clientName}${o.ambassador ? ` · ${o.ambassador}` : ''}`, 'bl')),
      h('small', { class: 'osx-sub', style: 'padding:0' }, `${o.text} Against ${o.enemyName} in ${o.theatreName}. ${o.days} days. Asks ${needs}. Pays ${o.rate}× the retainer to the units on it and ${fmt(o.bonus)} ◎ on completion. Offer open ${o.daysLeft} more days.`),
      h('div', { style: 'margin:6px 0' }, ...(o.kind === 'blockade' ? (fs.length ? fs.map((x) => tick(fs, 'f', x.id)) : [h('small', {}, 'No free fleet: form one on the Fleets tab.')]) : (bs.length ? bs.map((x) => tick(bs, 'b', x.id)) : [h('small', {}, 'No free battalion: raise one on the Battalions tab.')]))),
      h('div', { class: 'osx-ctl' }, btn('Take the contract', () => { const r = W.acceptContract(o.id, o.kind === 'blockade' ? [] : pick.b, o.kind === 'blockade' ? pick.f : []); if (r.ok) delete F.take[o.id]; cx.go(r); }, { kind: 'pri sm', disabled: !o.targetOk })));
  }) : [empty('No offers. An embassy offers work when its country is fighting in a hot theatre and is warm enough toward Sund (Politics, Diplomacy).')], { sub: 'Requirements are checked against the battalions and fleets you name. Diplomacy is only read: a contract never starts or ends a war.' }));
  if (I.done.length) box.append(h('div', { style: 'height:8px' }), panel('Done and failed', I.done.map((d) => h('div', { class: 'osx-row' }, h('span', {}, `${d.kindName}: ${d.targetName} · ${d.clientName}`), chip(d.result, d.result === 'done' ? 'ok' : d.result === 'failed' ? 'warn' : ''))), {}));
}
