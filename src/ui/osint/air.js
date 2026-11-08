// Air wings (v0.103.9): Base Operations → Air wings. Raise a wing from the aircraft in the hangars, base it on ground the employer's side holds, and fly one mission a day (reconnaissance, close air
// support, interdiction, a missile strike) against the enemy within reach. The same rules as `game.war` (src/war/airpower.js); nothing here advances the war.
import { h, panel, stats, stat, btn, chip, empty, kv } from './kit.js';

const form = (S) => (S.air ||= { name: '', pick: [], base: {}, target: {}, type: {} });

export function renderAir(cx, box) {
  const { W, S } = cx; const A = W.air(); const F = form(S.base || S); if (!A) return;
  F.pick = F.pick.filter((id) => A.free.some((x) => x.id === id));
  box.append(stats(stat('Aircraft in the hangars', String(A.free.length)), stat('Wings', String(A.wings.length)), stat('Strategic missiles', String(A.missiles), { sub: 'a strike spends one' }), stat('Own satellites', String(A.satellites.length), { sub: A.satellites.length ? A.satellites.map((s) => `${s.name}: ${s.level >= 2 ? 'knows' : 'spots'}`).join(', ') : 'none working: the fog stays' })));
  box.append(h('div', { style: 'height:8px' }));
  const name = h('input', { class: 'osx-input', value: F.name, placeholder: 'name (optional)', style: 'width:200px', oninput: (e) => { F.name = e.target.value; } });
  box.append(panel('Raise a wing', [
    h('div', { class: 'osx-sub' }, 'A wing is made of real aircraft, locked to it while it stands. Aircraft come from Aerospace (Internal Logistics: transfers) and are never built here. A lost aircraft is lost for good.'),
    ...(A.free.length ? A.free.map((x) => h('label', { class: 'osx-row tap', style: 'cursor:pointer' }, h('span', {}, h('input', { type: 'checkbox', checked: F.pick.includes(x.id), onchange: (e) => { F.pick = e.target.checked ? [...F.pick, x.id] : F.pick.filter((i) => i !== x.id); cx.refresh(); } }), ` ${x.name} `, h('small', {}, `${x.id} · ${x.kind}`)))) : [empty('No aircraft in the hangars: move some from Aerospace (Internal Logistics).')]),
    h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px' }, name, btn('Raise wing', () => { const r = W.raiseWing(F.name, F.pick); if (r.ok) { F.name = ''; F.pick = []; } cx.go(r); }, { kind: 'pri', disabled: !F.pick.length }))]));
  box.append(h('div', { style: 'height:8px' }));
  if (!A.wings.length) { box.append(empty('No wings yet.')); return; }
  for (const w of A.wings) {
    const abroad = w.status === 'abroad'; const targets = abroad ? W.wingTargets(w.id) : [];
    const sel = (opts, ph, on, cur) => h('select', { onchange: (e) => on(e.target.value) }, h('option', { value: '' }, ph), ...opts.map(([v, t]) => h('option', { value: v, selected: v === cur }, t)));
    box.append(panel(w.name, [
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, chip(abroad ? `at ${w.baseName}` : 'at home', abroad ? 'bl' : 'ok'), chip(`${w.aircraftNow.length} aircraft`), chip(`reach ${w.reach} km`), chip(`weight ${w.weight}`), abroad ? chip(w.canFly ? 'can fly today' : 'flown today', w.canFly ? 'ok' : 'warn') : null),
      h('div', { class: 'osx-sub', style: 'padding:0' }, w.aircraftNow.map((x) => `${x.name} ${x.id}`).join(' · ') || 'No aircraft left.'),
      !abroad ? h('div', { class: 'osx-ctl' }, sel(A.airfields.map((p) => [p.id, `${p.name} (${p.country})`]), A.airfields.length ? 'Base it at…' : 'Enlist in a theater first', (v) => { F.base[w.id] = v; }, F.base[w.id]), btn('Deploy', () => cx.go(W.deployWing(w.id, F.base[w.id])), { kind: 'pri sm', disabled: !A.airfields.length }), btn('Stand the wing down', () => cx.go(W.disbandWing(w.id)), { kind: 'sm' }))
        : h('div', {}, h('div', { class: 'osx-ctl' }, sel(targets.map((t) => [t.id, `${t.name} · ${t.km} km${t.fort ? ` · fort ${t.fort}` : ''}`]), 'Target…', (v) => { F.target[w.id] = v; }, F.target[w.id]),
          ...Object.entries(A.missions).map(([type, label]) => btn(label, () => cx.go(W.wingMission(w.id, type, F.target[w.id])), { kind: 'sm', disabled: !w.canFly || !targets.length, title: ({ recon: 'Lifts the fog over the target for a day', cas: 'Takes a share off the next fight there', interdict: 'Thins the garrison for three days', strike: 'Spends a strategic missile; a larger share off the next fight' })[type] }))),
          h('div', { class: 'osx-ctl', style: 'margin-top:6px' }, btn('Recall', () => cx.go(W.recallWing(w.id)), { kind: 'sm' }))),
    ].filter(Boolean), { sub: abroad ? 'One mission a day. Aircraft may be lost; a strike spends a real missile.' : 'Base it on ground the side you serve holds.' }), h('div', { style: 'height:8px' }));
  }
}
