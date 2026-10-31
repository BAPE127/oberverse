// Summary screens for the OberPad's heaviest apps (v0.84.0). Each says what matters — one figure, three tiles, what is waiting for you — and
// the app as it always was is one tap down in a fold. Nothing is computed here but layout; every button calls the system that always did the work.
import { h } from './panels.js';
import { hero, tiles, row, help, note, fold, openFold, buttons, big, n } from './tabletKit.js';
import { managementFull } from './corpManage.js';
import { groupFull } from './corpGroup.js';
import { peopleFull } from './corpPeople.js';
import { economyFull } from './corpEconomy.js';
import { exchangeFull } from './corpExchange.js';
import { milestonesFull } from './corpMilestones.js';
import { companiesFull } from './corpApp.js';
import { intelFull } from './corpIntel.js';
import { COMPANY_IDS } from '../systems/corporate.js';
import { HQ_TIERS } from '../content/hq.js';
import { PLAYER_COMPANIES } from '../corp/identity.js';

const list = (...kids) => h('div', { class: 'tb-card list' }, ...kids.flat().filter(Boolean));
const KIND = { budget: 'raise the materials budget', hire: 'hire', reorder: 'reorder', bid: 'bid', expand: 'expand', transfer: 'move cash' };

// ---------------------------------------------------------------- Management
export function managementApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const M = K.management;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Management'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  const m = M.peek();
  const pending = m?.pending || [];
  const alerts = M.alerts();
  const log = (m?.log || []).slice(-3).reverse();
  const budgets = Object.values(m?.budgets || {}).reduce((a, b) => a + Object.values(b || {}).filter((v) => v > 0).length, 0);
  body.append(
    hero({ label: 'Waiting for your word', value: pending.length ? `${pending.length} request${pending.length === 1 ? '' : 's'}` : 'Nothing', tone: pending.length ? 'gold' : '', sub: pending.length ? 'Managers asked before spending; nothing happens until you say.' : 'Managers act on their own inside the budgets you set.' }),
    tiles([{ n: String(budgets), t: 'budgets set' }, { n: String((m?.plans || []).length), t: 'plans approved' }, { n: String((m?.log || []).length), t: 'decisions made' }]));
  if (pending.length) body.append(list(...pending.map((q) => row({ icon: '📋', title: `${K.personnel.person(q.actor)?.name || 'Someone'} asks to ${KIND[q.kind] || q.kind}`, sub: `${K.personnel.employerName(q.employer)} · ${q.why}`, tag: q.kind === 'budget' ? `+${n(q.cost)} / month` : n(q.cost),
    action: h('span', { class: 'tb-acts' }, h('button', { class: 'tb-mini pri', onclick: () => go(M.approve(q.id)) }, 'Approve'), h('button', { class: 'tb-mini', onclick: () => go(M.decline(q.id)) }, 'Decline')) }))));
  if (alerts.length) body.append(list(...alerts.slice(0, 3).map((a) => row({ icon: '⚠', title: a.text, sub: a.advice }))));
  if (log.length) body.append(list(...log.map((l) => row({ icon: '✔', title: `Day ${l.day}`, sub: l.text }))));
  body.append(fold(ui, 'Management', 'Budgets, treasury and plans ›', (box) => managementFull(ui, box, open)));
}

// ---------------------------------------------------------------- Group
export function groupApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const G = K.group;
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Group'); };
  const nt = note(ui);
  if (nt) body.append(nt);
  if (!G.parent) {
    body.append(hero({ label: 'Your group', value: 'No parent company yet', sub: 'A parent company holds your businesses as subsidiaries. Founding one costs nothing.' }), buttons(big('Found a parent company', () => go(G.form()), 'pri')),
      help('How it works ›', 'A parent company holds your businesses as subsidiaries. Each keeps its own books and its own cash; the parent owns them, supplies their capital, and receives what they send up. Money then runs one way in and one way out: you pay into the parent; the parent capitalises or lends to each subsidiary; each sends distributions and repayments back. Your own wallet never pays a subsidiary directly.'));
    return;
  }
  const pa = K.account('parent');
  const subs = G.subs();
  const alerts = G.alerts();
  const sheet = ui.groupSheet || null;
  body.append(
    hero({ label: G.parent.name, value: n(pa.cash), sub: `obols in the parent · your wallet ${n(g.player.money)}` }),
    tiles([{ n: String(subs.length), t: subs.length === 1 ? 'subsidiary' : 'subsidiaries' }, { n: n(pa.contributed), t: 'put in by you' }, { n: String(alerts.length), t: 'need attention', tone: alerts.length ? 'neg' : '' }]),
    buttons(big('Pay in', () => { ui.groupSheet = sheet === 'in' ? null : 'in'; open('Group'); }, 'pri'), big('Take out', () => { ui.groupSheet = sheet === 'out' ? null : 'out'; open('Group'); })));
  if (sheet) body.append(h('div', { class: 'tb-card' }, h('div', { class: 'tb-label' }, sheet === 'in' ? 'Pay into the parent' : 'Take a dividend out'), h('div', { class: 'tb-chips' }, ...[1000, 10000, 100000].map((a) => h('button', { class: 'tb-chip', disabled: sheet === 'in' ? g.player.money < a : pa.cash < a, onclick: () => { ui.groupSheet = null; go(sheet === 'in' ? K.contribute('parent', a) : K.distribute('parent', a)); } }, n(a))))));
  if (alerts.length) body.append(list(...alerts.slice(0, 3).map((a) => row({ icon: '⚠', title: a.text, sub: a.advice }))));
  const COMPANY = ['arms', 'shipping', 'aerospace', 'farming'];
  const joining = ui.groupJoin && !G.isSub(ui.groupJoin) && K.profile(ui.groupJoin) ? ui.groupJoin : null;
  if (joining) {
    const pre = G.joinPreview(joining);
    const cap = Math.max(pre.suggested || 0, 0);
    body.append(h('div', { class: 'tb-card tb-terms' }, h('b', {}, `Bring ${K.profile(joining).name} into the group`),
      ...pre.blockers.map((b) => h('div', { class: 'tb-sub' }, b)), ...pre.warnings.map((w) => h('div', { class: 'tb-sub' }, `⚠ ${w}`)),
      pre.ok ? buttons(big(cap ? `Bring in with ${n(cap)} of capital` : 'Bring in', () => { ui.groupJoin = null; go(G.join(joining, { opening: cap })); }, 'pri'), big('Cancel', () => { ui.groupJoin = null; open('Group'); })) : buttons(big('Cancel', () => { ui.groupJoin = null; open('Group'); }))));
  }
  body.append(list(...COMPANY.map((id) => {
    const p = K.profile(id);
    if (!p) return null;
    if (G.isSub(id)) return row({ icon: '🏢', title: p.name, sub: `cash ${n(K.account(id).cash)} · spends about ${n(G.runningPerDay(id))} a day`, tag: 'subsidiary', tone: 'good' });
    const pre = G.joinPreview(id);
    return row({ icon: '🏢', title: p.name, sub: pre.ok ? 'independent: it uses its own account only once it is brought in' : pre.blockers[0], tag: 'independent', action: pre.ok ? h('button', { class: 'tb-mini pri', onclick: () => { ui.groupJoin = id; open('Group'); } }, 'Bring in ›') : null });
  })));
  // ---- the headquarters (v0.86.0): three offices in Halvermouth the parent can buy
  const buying = ui.hqBuy && !g.hq.owns(ui.hqBuy) ? ui.hqBuy : null;
  if (buying) {
    const T = HQ_TIERS[buying];
    body.append(h('div', { class: 'tb-card tb-terms' }, h('b', {}, `Buy ${T.name}?`),
      h('div', { class: 'tb-sub' }, `${n(T.price)} obols once, from the parent's own account (it holds ${n(pa.cash)}); then ${n(T.upkeep)} a day to keep it open. ${T.desks} desks, ${T.seats} officer seats. It stands in Halvermouth.`),
      buttons(big(`Buy for ${n(T.price)}`, () => { ui.hqBuy = null; go(g.hq.buy(buying)); }, 'pri', !g.hq.canBuy(buying).ok), big('Cancel', () => { ui.hqBuy = null; open('Group'); }))));
  }
  body.append(h('div', { class: 'tb-label', style: 'margin:6px 2px 4px' }, 'Headquarters'), list(...g.hq.view().map((t) => row({ icon: '🏢', title: t.short, sub: t.owned ? `owned since day ${t.since} · ${t.desks} desks, ${t.seats} seats · ${n(t.upkeep)} a day` : `${n(t.price)} · ${t.desks} desks, ${t.seats} seats · ${n(t.upkeep)} a day`, tag: t.owned ? 'yours' : t.ok ? 'for sale' : '', tone: t.owned ? 'good' : '',
    action: t.owned ? null : h('button', { class: 'tb-mini pri', disabled: !t.ok, title: t.ok ? '' : t.why, onclick: () => { ui.hqBuy = t.id; open('Group'); } }, 'Buy ›') }))));
  body.append(fold(ui, 'Group', 'Statements, lending, policies and everything else ›', (box) => groupFull(ui, box, open)));
}

// ---------------------------------------------------------------- Personnel
export function peopleApp(ui, body, open) {
  const g = ui.game;
  const Pe = g.corp.personnel;
  const nt = note(ui);
  if (nt) body.append(nt);
  const staff = Object.values(Pe.peek()?.staff || {}).filter((x) => x.status === 'active');
  const perDay = staff.reduce((a, x) => a + (x.salary || 0), 0);
  const openings = Pe.openings();
  body.append(
    hero({ label: 'Your people', value: String(staff.length), sub: staff.length ? `paid ${n(perDay)} obols a day by the businesses they work for` : 'Nobody works for your businesses yet.' }),
    tiles([{ n: String(openings.length), t: 'openings', tone: openings.length ? 'good' : '' }, { n: n(perDay), t: 'a day in pay' }, { n: String((Pe.candidates() || []).length), t: 'candidates' }]));
  if (openings.length) body.append(list(...openings.slice(0, 4).map((o) => row({ icon: '🧑‍💼', title: `${o.roleName} — ${o.employerName}`, sub: o.why, tag: `${n(o.pay[0])}–${n(o.pay[1])} a day`, action: h('button', { class: 'tb-mini pri', onclick: () => { const S = (ui.corpPeople ||= { view: 'openings', tier: '', role: '', sort: 'fit', sel: null, cmp: [], who: null }); Object.assign(S, { view: 'candidates', role: o.role, tier: '' }); openFold(ui, 'Personnel'); open('Personnel'); } }, 'See candidates') }))));
  if (staff.length) body.append(list(...staff.slice(0, 5).map((x) => row({ icon: '🧑', title: x.name, sub: `${x.roleName || x.role} — ${Pe.employerName(x.employer)}`, tag: `${n(x.salary)} a day` }))));
  body.append(fold(ui, 'Personnel', 'Hire, compare, manage and pay ›', (box) => peopleFull(ui, box, open)));
}

// ---------------------------------------------------------------- Milestones
export function milestonesApp(ui, body) {
  const g = ui.game;
  const rows = g.corp.milestones.view();
  const got = rows.filter((r) => r.earned).sort((a, b) => b.earned.day - a.earned.day);
  const next = rows.filter((r) => !r.earned);
  body.append(
    hero({ label: 'Milestones earned', value: `${got.length} of ${rows.length}`, ring: rows.length ? got.length / rows.length : 0, sub: 'Awarded from what is in the books — never from a click.' }));
  if (got.length) body.append(list(...got.slice(0, 3).map((r) => row({ icon: '🏆', title: r.name, sub: `day ${r.earned.day}`, tag: 'earned', tone: 'good' }))));
  if (next.length) body.append(list(...next.slice(0, 3).map((r) => row({ icon: '◻︎', title: r.name, sub: r.text, tag: r.have ? String(r.have) : '' }))));
  body.append(fold(ui, 'Milestones', `All ${rows.length} ›`, (box) => milestonesFull(ui, box)));
}

// ---------------------------------------------------------------- World News (the Economy app)
export function economyApp(ui, body) {
  const g = ui.game;
  const O = g.corp.geo.overview();
  const head = O.headlines.slice(0, 3);
  const on = O.wars.length + O.embargoes.length;
  const ev = (e) => row({ icon: e.kind === 'war' ? '⚔️' : '🚫', title: e.kind === 'war' ? e.names.join(' – ') : `${e.names[0]}: arms embargo`, sub: e.effects.slice(0, 2).map((x) => `${x.sector} ${x.kind === 'cost' ? 'costs' : 'demand'} ${x.pct >= 0 ? '+' : '−'}${Math.abs(x.pct).toFixed(1)}%`).join(' · ') || `since day ${e.start}`, tag: e.severity >= 0.7 ? 'severe' : e.severity >= 0.4 ? 'serious' : 'limited', tone: 'neg' });
  body.append(
    hero({ label: 'The world today', value: on ? `${O.wars.length} war${O.wars.length === 1 ? '' : 's'}, ${O.embargoes.length} embargo${O.embargoes.length === 1 ? '' : 'es'}` : 'Quiet', tone: on ? 'gold' : '', sub: on ? 'Costs and demand move with them; nothing says what happens next.' : 'No war or embargo is on.' }),
    tiles([{ n: `${(O.rate * 100).toFixed(2)}%`, t: 'policy rate' }, { n: String(O.sectors.length), t: 'sectors moved' }, { n: String(O.lifted.length + O.pressed.length), t: 'companies exposed' }]));
  const evs = [...O.wars, ...O.embargoes].slice(0, 4);
  if (evs.length) body.append(list(...evs.map(ev)));
  if (head.length) body.append(list(...head.map((x) => row({ icon: '📰', title: `Day ${x.day}`, sub: x.text }))));
  body.append(fold(ui, 'Economy', 'Sectors, who is exposed, the banks and everything else ›', (box) => economyFull(ui, box)));
}

// ---------------------------------------------------------------- Exchange
export function exchangeApp(ui, body, open) {
  const g = ui.game;
  const E = g.corp.exchange;
  const nt = note(ui);
  if (nt) body.append(nt);
  const P = E.portfolio();
  const board = E.board();
  const movers = board.filter((r) => r.change !== null).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3);
  const pct = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`;
  const px = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(2));
  body.append(
    hero({ label: 'Your shares are worth', value: n(P.value), sub: P.rows.length ? `${P.rows.length} holding${P.rows.length === 1 ? '' : 's'} · dividends received ${n(P.divs)}` : 'You hold no shares yet.' }),
    tiles([{ n: String(board.length), t: 'companies listed' }, { n: n(g.player.money), t: 'your obols' }, { n: P.cost ? `${P.gain >= 0 ? '+' : '−'}${n(Math.abs(P.gain))}` : '—', t: 'gain on holdings', tone: P.gain >= 0 ? 'good' : 'neg' }]));
  if (P.rows.length) body.append(list(...P.rows.slice(0, 4).map((r) => row({ icon: '📈', title: `${r.ticker} · ${r.name}`, sub: `${px(r.price)} obols · worth ${n(r.value)}`, tag: r.change === null ? '' : pct(r.change), tone: r.change >= 0 ? 'good' : 'neg' }))));
  if (movers.length) body.append(list(...movers.map((r) => row({ icon: '↕', title: `${r.ticker} · ${r.name}`, sub: `${px(r.price)} obols`, tag: pct(r.change), tone: r.change >= 0 ? 'good' : 'neg' }))));
  body.append(fold(ui, 'Exchange', 'The whole board — search, buy and sell ›', (box) => exchangeFull(ui, box, open)));
}

// ---------------------------------------------------------------- Companies
export function companiesApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const nt = note(ui);
  if (nt) body.append(nt);
  const mine = COMPANY_IDS.filter((id) => K.profile(id));
  const own = mine.filter((id) => K.account(id).funded).length;
  body.append(
    hero({ label: 'Your businesses', value: String(mine.length), sub: mine.length ? `${own} with an account of their own · the rest spend your wallet` : 'You do not own a business yet.' }),
    tiles([{ n: String(own), t: 'own account' }, { n: String(mine.length - own), t: 'spend your wallet' }, { n: K.group.parent ? String(K.group.subs().length) : '—', t: 'in your group' }]),
    list(...COMPANY_IDS.map((id) => { const p = K.profile(id); const I = PLAYER_COMPANIES[id]; return p ? row({ icon: I.icon, title: p.name, sub: I.kind, tag: K.account(id).funded ? 'own account' : 'uses your money', tone: K.account(id).funded ? 'good' : '' }) : row({ icon: I.icon, title: I.kind, sub: 'not yet started', tag: '' }); })),
    fold(ui, 'Companies', 'Rename, pay in, take out and last month\'s figures ›', (box) => companiesFull(ui, box, open)));
}

// ---------------------------------------------------------------- Intelligence
export function intelApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const reg = K.registry();
  const mine = reg.filter((r) => r.kind === 'player');
  const listed = K.exchange.board().filter((r) => r.source === 'generated').length;
  const distress = reg.filter((r) => r.status === 'distressed').length;
  body.append(
    hero({ label: 'Companies tracked', value: String(reg.length), sub: 'Every company, ranked from the books it keeps. Yours are compared here and never listed.' }),
    tiles([{ n: String(mine.length), t: 'yours' }, { n: String(listed), t: 'listed on the exchange' }, { n: String(distress), t: 'in distress', tone: distress ? 'neg' : '' }]),
    fold(ui, 'Intelligence', 'Rankings, profiles and comparisons ›', (box) => intelFull(ui, box, open)));
}
