// The Politics app (v0.93.0): read-only. Who governs Sund, the term and the date of the vote, the opposition and where the two parties differ.
// Nothing here changes anything: policies, polls, elections and influence come in later releases. Follows the OberPad pattern: one hero, three tiles, a list, a fold.
import { h } from './panels.js';
import { hero, tiles, row, help, fold } from './tabletKit.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const LEAN = { '-2': 'strongly against', '-1': 'against', 0: 'neutral', 1: 'for', 2: 'strongly for' };
const PHASE = { term: 'In term', campaign: 'Campaign season', polling: 'Polling day' };

export function politicsApp(ui, body, open) {
  const g = ui.game;
  const O = g.politics.overview();
  const gov = O.governing;
  const opp = O.opposition;
  const c = O.calendar;
  body.append(
    hero({ label: 'Government of Sund', value: `${gov.short} — ${gov.leader}`, sub: `${gov.name} governs · term day ${O.termDay} of ${O.termDays}`, ring: O.termDay / O.termDays }),
    tiles([{ n: String(c.daysToPolling), t: c.phase === 'polling' ? 'polling day' : 'days to the vote' }, { n: `${gov.seats}–${opp.seats}`, t: `seats, ${gov.short} v ${opp.short}` }, { n: PHASE[c.phase], t: 'the political year' }]),
    list(
      row({ icon: '👑', title: O.king.name, sub: `${O.king.seat} · age ${O.king.age} · ${O.king.note}`, tag: 'head of state' }),
      row({ icon: '🏛️', title: gov.leader, sub: `${gov.blurb}`, tag: 'President', tone: 'good' }),
      row({ icon: '🗣️', title: opp.leader, sub: `${opp.blurb}`, tag: 'opposition' })),
    help('How politics works here (so far)', 'Sund is a constitutional monarchy: the king is head of state and an elected President governs. A term is 120 game days and the vote falls in its last 30.', 'This page only reads the record. It does not change any price, police or war yet; policies, polls, elections and influence arrive in later updates. You never have to take part.', 'Whoever the voters pick, the other leader stays in the world and keeps working: you may meet either in the city.'));
  body.append(fold(ui, 'Politics', 'Where the parties differ ›', (box) => {
    box.append(list(...O.issues.map((i) => row({
      icon: i.gap >= 3 ? '⚡' : i.gap >= 2 ? '↔️' : '＝', title: i.name, sub: `${gov.short}: ${LEAN[i.gov]} · ${opp.short}: ${LEAN[i.opp]}`, tag: i.gap >= 3 ? 'far apart' : i.gap >= 2 ? 'differ' : 'close', tone: i.gap >= 3 ? 'warn' : '',
    }))));
    box.append(list(...O.history.map((e) => row({ icon: '📰', title: `Day ${e.day}`, sub: e.text }))));
  }));
}
