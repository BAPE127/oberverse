// The Diplomacy page of the Politics app (v0.96.0), in the OberPad pattern (mock-up proposal-pol-oberpad-diplomacy.png): who Sund trades with and who is fighting whom.
// One row per country with its relation (a band and a score), the quarrels in progress and the wars on, and a fold with the embassies and the recent history.
// It reads game.politics.diplomacy(); the wars and embargoes it shows are the same ones the arms market, geo, shipping, bonds and the exchange read. Nothing here decides anything.
import { h } from './panels.js';
import { hero, tiles, row, help, fold, note, n } from './tabletKit.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const TONE = { Hostile: 'bad', Tense: 'warn', Cool: 'warn', Neutral: '', Warm: 'good', Friendly: 'good' };
const STAGE = { dispute: 'a dispute', tension: 'rising tension', sanctions: 'sanctions talks' };
const sign = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
const swatch = (c) => h('span', { style: `display:inline-block;width:14px;height:14px;border-radius:3px;background:${c};vertical-align:-2px` });

const STAGE_DEMO = { gathering: 'gathering', march: 'marching', riot: 'a riot' };
const mood = (a) => (a < 0.25 ? 'calm' : a < 0.5 ? 'restless' : a < 0.75 ? 'angry' : 'furious');

/** Unrest at home (v0.97.0): the demonstrations, what you may do, and the read-only hooks. */
function unrestSection(ui, body, open) {
  const g = ui.game;
  const U = g.politics.unrest();
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Politics'); };
  const d = ui.polDemo != null ? U.active.find((x) => x.id === ui.polDemo) : null;
  if (ui.polDemo != null && !d) ui.polDemo = null;
  if (d) {
    body.append(h('div', { class: 'tb-btns' }, h('button', { class: 'tb-mini', onclick: () => { ui.polDemo = null; open('Politics'); } }, '‹ Back')));
    body.append(hero({ label: 'A demonstration in Sovereign Square', value: d.cause, sub: `About ${n(d.size)} people · ${mood(d.anger)} · ${STAGE_DEMO[d.stage]} · day ${d.days + 1} · organised by ${d.organisers}. The police are set to respond ${U.police === 'light' ? 'lightly (they watch)' : U.police === 'heavy' ? 'firmly (they will disperse it)' : 'with some firmness'}.` }));
    body.append(h('div', { class: 'tb-card list' },
      row({ icon: '🗣️', title: 'Speak for talks', sub: 'Free. May calm the crowd; a stranger\'s advice may also be resented. Once a day.', action: h('button', { class: 'tb-mini pri', disabled: !d.canSpeak, onclick: () => go(g.politics.speakDemo(d.id)) }, 'Speak') }),
      row({ icon: '💷', title: 'Support the organisers', sub: `Open and recorded. ${n(d.supported)} of ${n(U.supportCap)} given. It swells the crowd and sharpens the mood.`, action: h('button', { class: 'tb-mini', disabled: g.player.money < 5000 || d.supported + 5000 > U.supportCap, onclick: () => go(g.politics.supportDemo(d.id, 5000)) }, '5,000') }),
      row({ icon: '🕶️', title: 'Pay them in secret', sub: `${n(U.fundPrice)} in cash. Swells and angers the crowd. Recorded as an illicit offer: investigators may find it.`, action: h('button', { class: 'tb-mini', disabled: d.funded || g.player.money < U.fundPrice, onclick: () => go(g.politics.fundDemo(d.id)) }, d.funded ? 'Paid' : 'Pay') })));
    body.append(h('div', { class: 'tb-note' }, "You are never wanted for standing in the square. A riot is for the police and the Assembly to deal with."));
    return;
  }
  body.append(h('div', { class: 'tb-label', style: 'margin:6px 4px' }, 'At home'));
  body.append(h('div', { class: 'tb-card list' },
    ...(U.active.length ? U.active.map((x) => row({ icon: x.stage === 'riot' ? '🔥' : '📣', title: x.cause, sub: `About ${n(x.size)} people · ${mood(x.anger)} · ${STAGE_DEMO[x.stage]}`, tag: x.stage === 'riot' ? 'riot' : 'open', tone: x.stage === 'riot' ? 'bad' : 'warn', onclick: () => { ui.polDemo = x.id; open('Politics'); } })) : [row({ icon: '🕊️', title: 'Quiet at home', sub: `No demonstration today. The country's tension is ${U.tension < 0.25 ? 'low' : U.tension < 0.45 ? 'moderate' : 'high'}; the police are set to respond ${U.police === 'light' ? 'lightly' : U.police === 'heavy' ? 'firmly' : 'with some firmness'}.` })]),
    ...U.recent.slice(0, 3).map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text }))));
}

export function diplomacyTab(ui, body, open) {
  const g = ui.game;
  const nt = note(ui);
  if (nt) body.append(nt);
  if (ui.polDemo != null) { unrestSection(ui, body, open); return; }
  const V = g.politics.diplomacy();
  const wars = V.wars;
  const embargoes = V.countries.filter((c) => c.flags.some((f) => /embargo|sanctions/.test(f))).length;
  body.append(
    hero({ label: 'The world today', value: wars.length ? `${wars.length} war${wars.length === 1 ? '' : 's'} on` : 'At peace', tone: wars.length ? 'neg' : 'pos', sub: `${V.disputes.length} quarrel${V.disputes.length === 1 ? '' : 's'} brewing · ${embargoes} under sanctions or an embargo` }),
    tiles([{ n: String(V.countries.filter((c) => c.score >= 12).length), t: 'friendly or warm' }, { n: String(V.disputes.length), t: 'quarrels' }, { n: String(wars.length), t: 'wars' }]));
  body.append(list(...V.countries.map((c) => row({
    icon: swatch(c.color), title: c.name, sub: `${c.note}${c.flags.length ? ` · ${c.flags.join(' · ')}` : ''}`, tag: `${c.band} ${sign(c.score)}`, tone: TONE[c.band],
  }))));
  if (wars.length || V.disputes.length) {
    body.append(h('div', { class: 'tb-label', style: 'margin:6px 4px' }, 'Active'));
    body.append(list(
      ...wars.map((w) => row({ icon: '⚔️', title: `${w.names[0]} – ${w.names[1]} war`, sub: `Day ${w.days} · arms demand up, shipping risk up`, tag: 'war', tone: 'bad' })),
      ...V.disputes.map((d) => row({ icon: '🕊️', title: `${d.names[0]} and ${d.names[1]}`, sub: `${STAGE[d.stage]} over ${d.cause}${d.until ? ` · a decision about day ${d.until}` : ''}`, tag: d.stage, tone: 'warn' }))));
  }
  unrestSection(ui, body, open);
  const st = V.stance;
  body.append(help('How it works', 'Quarrels between rivals move along a chain: a dispute, rising tension, sanctions on the aggressor (an arms embargo), and only then war; at each step talks may settle it. A war ends in a ceasefire after a few days, when the embargo for it is lifted. Nothing here is a dice roll on the day: the same world gives the same quarrels, and a reload cannot change them. The President\'s stance matters but guarantees nothing: more commitments abroad make a dispute that Sund is party to likelier, fewer make it rarer, and other countries think better or worse of Sund. These are the wars and embargoes that the arms market, shipping, bonds and the exchange already react to.', st.sundDisputes || st.relations ? `The government\'s stance today: disputes involving Sund ${st.sundDisputes > 0 ? `${Math.round(st.sundDisputes * 100)}% likelier` : st.sundDisputes < 0 ? `${Math.round(-st.sundDisputes * 100)}% rarer` : 'as usual'}; relations ${sign(st.relations)} points.` : 'The government\'s stance abroad is neutral.'));
  body.append(fold(ui, 'PoliticsHooks', 'The state of the country ›', (box) => {
    const U = g.politics.unrest();
    box.append(list(
      row({ icon: '🏛️', title: 'Legitimacy', sub: 'How far the government is thought to have the right to govern: approval, calm and the last mandate.', tag: `${Math.round(U.hooks.legitimacy * 100)}%` }),
      row({ icon: '⚖️', title: 'Stability', sub: 'How steady the country is: tension, unrest and war.', tag: `${Math.round(U.hooks.stability * 100)}%` }),
      row({ icon: '👑', title: 'The crown', sub: `${U.hooks.succession.head} is ${U.hooks.succession.age}; ${U.hooks.succession.note}. Emergency powers: ${U.hooks.emergencyPowers ? 'in force' : 'none'}.` })));
  }));
  body.append(fold(ui, 'PoliticsDip', 'Embassies · trade · the record ›', (box) => {
    box.append(list(...V.countries.map((c) => row({ icon: '🏛️', title: `${c.name}`, sub: `${c.ambassador ? `Ambassador ${c.ambassador}` : 'Embassy'} · ${c.flags.length ? c.flags.join(', ') : 'no agreement'}` }))));
    box.append(list(...(V.log.length ? V.log.map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'No quarrel has begun since the record was made.' })])));
  }));
}
