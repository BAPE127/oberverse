// The Diplomacy page of the Politics app (v0.96.0), in the OberPad pattern (mock-up proposal-pol-oberpad-diplomacy.png): who Sund trades with and who is fighting whom.
// One row per country with its relation (a band and a score), the quarrels in progress and the wars on, and a fold with the embassies and the recent history.
// It reads game.politics.diplomacy(); the wars and embargoes it shows are the same ones the arms market, geo, shipping, bonds and the exchange read. Nothing here decides anything.
import { h } from './panels.js';
import { hero, tiles, row, help, fold } from './tabletKit.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const TONE = { Hostile: 'bad', Tense: 'warn', Cool: 'warn', Neutral: '', Warm: 'good', Friendly: 'good' };
const STAGE = { dispute: 'a dispute', tension: 'rising tension', sanctions: 'sanctions talks' };
const sign = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
const swatch = (c) => h('span', { style: `display:inline-block;width:14px;height:14px;border-radius:3px;background:${c};vertical-align:-2px` });

export function diplomacyTab(ui, body) {
  const g = ui.game;
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
  const st = V.stance;
  body.append(help('How it works', 'Quarrels between rivals move along a chain: a dispute, rising tension, sanctions on the aggressor (an arms embargo), and only then war; at each step talks may settle it. A war ends in a ceasefire after a few days, when the embargo for it is lifted. Nothing here is a dice roll on the day: the same world gives the same quarrels, and a reload cannot change them. The President\'s stance matters but guarantees nothing: more commitments abroad make a dispute that Sund is party to likelier, fewer make it rarer, and other countries think better or worse of Sund. These are the wars and embargoes that the arms market, shipping, bonds and the exchange already react to.', st.sundDisputes || st.relations ? `The government\'s stance today: disputes involving Sund ${st.sundDisputes > 0 ? `${Math.round(st.sundDisputes * 100)}% likelier` : st.sundDisputes < 0 ? `${Math.round(-st.sundDisputes * 100)}% rarer` : 'as usual'}; relations ${sign(st.relations)} points.` : 'The government\'s stance abroad is neutral.'));
  body.append(fold(ui, 'PoliticsDip', 'Embassies · trade · the record ›', (box) => {
    box.append(list(...V.countries.map((c) => row({ icon: '🏛️', title: `${c.name}`, sub: `${c.ambassador ? `Ambassador ${c.ambassador}` : 'Embassy'} · ${c.flags.length ? c.flags.join(', ') : 'no agreement'}` }))));
    box.append(list(...(V.log.length ? V.log.map((e) => row({ icon: '🗒️', title: `Day ${e.day}`, sub: e.text })) : [row({ icon: '—', title: 'Nothing yet', sub: 'No quarrel has begun since the record was made.' })])));
  }));
}
