// The Military app's Generals and engagement screens (v0.100.0 stage 9; mock-up proposal-war-oberpad-command.png panels 4 and 6): hire a general, plan an engagement with real squads, see the
// estimate (the same function that decides it), delegate, and read the after-action report. Every button calls game.war.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, n } from './tabletKit.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const label = (t) => h('div', { class: 'tb-label', style: 'padding:8px 6px 2px' }, t);
const back = (ui, open, to = null) => h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => { ui.milSub = to; open('Military'); } }, to ? '‹ Generals' : '‹ Company'));
const stars = (v) => '●'.repeat(v) + '○'.repeat(5 - v);
const pct = (v) => `${Math.round(v * 100)}%`;
const select = (opts, value, onchange) => h('select', { style: 'padding:6px;border-radius:8px;background:#15133e;color:inherit;border:2px solid #3a3794', onchange: (e) => onchange(e.target.value) }, ...opts.map(([v, t]) => h('option', { value: v, selected: v === value }, t)));

export function generalsScreen(ui, body, go, open) {
  const W = ui.game.war; const G = W.generals(); const E = W.engagements();
  body.append(back(ui, open),
    hero({ label: 'Generals', value: `${G.hired.length} of ${G.seats} desks`, sub: 'A general fights an engagement for you with the squads you choose. Each has real strengths; you see an estimate before you commit, and a fee is paid every day they are on the books.' }),
    tiles([{ n: String(E.open.length), t: 'engagements offered' }, { n: String(E.active.length), t: 'under way' }, { n: String(G.hired.filter((g) => g.status === 'home').length), t: 'generals home' }]));
  if (E.open.length || E.active.length) body.append(label('Engagements'), list(...E.open.map((x) => row({ icon: '🗺️', title: x.title, sub: `${x.client} · ${x.days} days · needs ${x.needs.troops} soldiers${x.needs.tanks ? `, ${x.needs.tanks} tank${x.needs.tanks > 1 ? 's' : ''}` : ''}${x.needs.helicopters ? `, ${x.needs.helicopters} helicopter${x.needs.helicopters > 1 ? 's' : ''}` : ''}, ${x.needs.medics} medic${x.needs.medics > 1 ? 's' : ''}`, tag: n(x.pay), action: h('button', { class: 'tb-mini pri', onclick: () => { ui.milEng = x.id; ui.milSub = 'Engagement'; open('Military'); } }, 'Plan') })),
    ...E.active.map((x) => row({ icon: '⚔️', title: x.title, sub: `${x.order.generalName} has it · ${x.daysLeft} days to go`, tag: 'under way' }))));
  body.append(label('Your generals'), list(...(G.hired.length ? G.hired.map((g) => row({ icon: '🎖️', title: `${g.name} · ${g.fee.toLocaleString('en-US')} a day`, sub: `${g.style} · ${g.wins} won, ${g.losses} lost · ${g.status === 'home' ? 'at the command post' : 'away with a force'}`, action: h('button', { class: 'tb-mini', disabled: g.status !== 'home', onclick: () => go(W.dismissGeneral(g.id)) }, 'Let go') })) : [row({ icon: '—', title: 'No general yet', sub: G.seats ? 'Hire one below.' : 'Build the command post first: it has a desk for a general for every five desks.' })])));
  body.append(label('Available to hire'), list(...G.pool.map((g) => row({ icon: '🎖️', title: `${g.name} · ${g.fee.toLocaleString('en-US')} a day`, sub: `${g.style}. ${g.text}\nOffence ${stars(g.offence)}  Defence ${stars(g.defence)}  Logistics ${stars(g.logistics)}  Air ${stars(g.air)}  Intel ${stars(g.intel)} · accepts losses ${pct(g.risk)}`, action: h('button', { class: 'tb-mini pri', disabled: G.hired.length >= G.seats, onclick: () => go(W.hireGeneral(g.id)) }, 'Hire') }))));
  body.append(help('How generals work', 'You choose the squads and the general; the engagement is then closed to being played any other way. The result comes from the forces, the supplies, the ground and the general, with a seeded element of chance that a reload cannot change. The dead, the wounded and the lost vehicles are real and stay lost.'));
}

export function engagementScreen(ui, body, go, open) {
  const W = ui.game.war; const e = W.engagement(ui.milEng);
  if (!e) { ui.milSub = 'Generals'; body.append(back(ui, open, null), list(row({ icon: '—', title: 'No such engagement', sub: 'It has gone.' }))); return; }
  if (e.state !== 'open') { reportScreen(ui, body, go, open, e); return; }
  const S = W.squads(); const G = W.generals().hired.filter((g) => g.status === 'home');
  const chosen = (ui.milEngSquads ||= []).filter((id) => S.some((s) => s.id === id && s.status === 'home'));
  ui.milEngSquads = chosen;
  const gen = G.some((g) => g.id === ui.milEngGen) ? ui.milEngGen : G[0]?.id || '';
  const lacks = W.engagementLacks(e.id, chosen);
  body.append(back(ui, open, 'Generals'),
    hero({ label: `${e.client} · ${e.terrain} ground`, value: e.title, sub: `${e.text} ${e.days} days. Pays ${n(e.pay)} (a share of it if only some objectives are met). Offer closes day ${e.expires}.` }),
    tiles([{ n: `${e.needs.troops}`, t: 'soldiers needed' }, { n: `${e.needs.tanks}/${e.needs.helicopters}`, t: 'tanks / helicopters' }, { n: `${e.needs.medics}`, t: 'medics needed' }]),
    list(row({ icon: '👁️', title: 'What is known of the enemy', sub: `About ${e.enemy.troops} troops${e.enemy.armour ? `, ${e.enemy.armour} armour` : ''}${e.enemy.air ? `, air cover` : ''}. Reports are rough: the estimate below is not a promise.` })));
  body.append(label('Squads to send'), list(...(S.length ? S.map((s) => row({ icon: chosen.includes(s.id) ? '☑️' : '⬜', title: `${s.name} · ${s.size} soldiers`, sub: `${s.leaderName ? `Led by ${s.leaderName}` : 'No leader'}${s.vehicles.length ? ` · ${s.vehicles.join(', ')}` : ''}${s.status !== 'home' ? ' · away' : ''}`,
    onclick: s.status === 'home' ? () => { ui.milEngSquads = chosen.includes(s.id) ? chosen.filter((x) => x !== s.id) : [...chosen, s.id]; open('Military'); } : null })) : [row({ icon: '—', title: 'No squads', sub: 'Form squads from People and Squads first. Nothing is spawned for you.' })])));
  body.append(label('General'), list(row({ icon: '🎖️', title: G.length ? 'Assign' : 'No general at home', sub: G.length ? 'Who fights it' : 'Hire one from Generals.', action: G.length ? select(G.map((g) => [g.id, `${g.name}`]), gen, (v) => { ui.milEngGen = v; open('Military'); }) : null })));
  if (lacks.length) body.append(h('div', { class: 'tb-note', style: 'margin:0 8px 8px' }, `⚠ Your forces do not meet this one: ${lacks.join('; ')}. Nothing is spawned to make up the difference.`));
  if (chosen.length && gen) {
    const A = W.assess(e.id, chosen, gen); const es = A.estimate;
    body.append(label('Assessment (an estimate, not a promise)'), list(
      row({ icon: '📝', title: es.words, sub: `Odds ${es.ratio.toFixed(2)} to 1 · expected losses: about ${es.deadExpected} killed, ${es.lossPeople - Math.round(es.deadExpected)} wounded, ${es.vehiclesExpected} vehicles` }),
      row({ icon: '🎯', title: `${pct(es.chance.atLeast[1])} to meet at least one objective`, sub: `${pct(es.chance.atLeast[2])} for two, ${pct(es.chance.atLeast[3])} for all three, ${pct(es.chance.lose)} to fail` }),
      row({ icon: '🔧', title: 'What it is made of', sub: `Your force ${es.parts.ours.toFixed(1)} against ${es.parts.theirs.toFixed(1)} · ground ×${es.parts.terrain.toFixed(2)} · general ×${es.parts.general.toFixed(2)}${es.parts.fuelShort ? ' · short of fuel' : ''}${es.parts.rocketShort ? ' · short of rockets' : ''}` })));
  }
  body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-btn pri', disabled: !chosen.length || !gen || lacks.length > 0, onclick: () => go(W.delegate(e.id, { squads: chosen, general: gen })) }, `Give it to ${G.find((g) => g.id === gen)?.name || 'a general'}`), h('button', { class: 'tb-btn', onclick: () => go(W.playEngagement(e.id)) }, 'Lead it yourself'), h('button', { class: 'tb-btn', onclick: () => { const r = W.declineEngagement(e.id); ui.milSub = 'Generals'; go(r); } }, 'Turn it down')));
  body.append(help('One way or the other', 'Once a general has an engagement you cannot lead the same battle yourself, and the other way round. The overhead battle comes in a later release; for now a general fights it.'));
}

function reportScreen(ui, body, go, open, e) {
  body.append(back(ui, open, 'Generals'));
  if (e.state === 'delegated' || e.state === 'tactical') { body.append(hero({ label: e.client, value: e.title, sub: `${e.order.generalName} is on it: ${Math.max(0, e.order.end - ui.game.clock.day)} days to go.` })); return; }
  if (!e.result) { body.append(hero({ label: e.client, value: e.title, sub: e.state === 'expired' ? (e.why || 'It lapsed.') : 'Turned down.' })); return; }
  const R = e.result;
  body.append(hero({ label: `After action: ${e.place}`, value: R.outcome.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()), tone: R.objectives >= 2 ? 'pos' : R.objectives === 0 ? 'neg' : 'warn', sub: `${R.objectives} of 3 objectives · ${R.paid ? `paid ${n(R.paid)} of ${n(e.pay)}` : `fined ${n(R.fine)}`} · ${R.general}` }),
    tiles([{ n: String(R.dead.length), t: 'killed' }, { n: String(R.wounded.length), t: 'wounded' }, { n: String(R.lost.length), t: 'vehicles lost' }]),
    list(...R.lines.map((l) => row({ icon: '📋', title: l }))));
  body.append(fold(ui, 'MilAar', 'Who fell · who was hurt · what is lost ›', (box) => box.append(list(...R.dead.map((d) => row({ icon: '✝', title: `${d.name} · ${d.role}`, sub: 'killed' })), ...R.wounded.map((d) => row({ icon: '🩹', title: `${d.name} · ${d.role}`, sub: `wounded (${d.wounds})` })), ...R.lost.map((d) => row({ icon: '💥', title: d.name, sub: 'destroyed' })), (R.dead.length + R.wounded.length + R.lost.length) ? null : row({ icon: '—', title: 'No losses', sub: '' })))));
}
