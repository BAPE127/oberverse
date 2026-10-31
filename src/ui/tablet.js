// The tablet (v0.15.0) — the journal's replacement. Apps along the top:
//   Home       — business notifications (src/systems/tablet.js) and a summary
//   Quests · People · Customers · Notes · Standing — the old journal pages
//   Business   — a remote link to each arms works' terminal (once you own one)
//   Stocks     — the Ober's Oil share register, as at Sir Moneybucks's desk
import { h, journalTab, JOURNAL_TABS, stocksScreen } from './panels.js';
import { terminalScreen, TERMINAL_TABS } from './terminal.js';
import { TABLET_APPS } from '../systems/tablet.js';
import { farmApp } from './farm.js';
import { bankApp } from './corpBank.js'; // v0.68.0
import { loansApp } from './corpLoans.js'; // v0.73.0
import { managersApp } from './tabletManagers.js';
import { bizScreen, needsApp } from './tabletBiz.js'; // v0.90.0
import { groupApp, exchangeApp, economyApp, milestonesApp, companiesApp, intelApp } from './tabletSummaries.js'; // v0.84.0: the summaries
import { bondsApp } from './corpBonds.js'; // v0.69.0
import { tabletGroups, allApps, groupOf, badges, searchApps, APP_ICONS } from './tabletGroups.js'; // v0.72.0
import { statusBar, navBar, segments, hero, tiles, row, fold, openFold, n as fmt } from './tabletKit.js'; // v0.83.0
import { homeScreen } from './tabletHome.js';
import { calcItem } from '../systems/gang.js';

export function tabletPanel(ui, body, opts) {
  const g = ui.game;
  const T = g.tablet;
  const groups = tabletGroups(g);
  const apps = allApps(groups);
  const tab = apps.includes(opts.tab) ? opts.tab : 'Home';
  const group = groupOf(groups, tab);
  const badge = badges(g);
  (ui.tabletLast ||= {})[group.id] = tab;
  const open = (t, extra = {}) => ui.openPanel('tablet', { tab: t, ...extra });
  const unread = T.unread;

  // v0.83.0: it is a tablet — a status bar, then the home screen of icons, or an app with a back arrow and its sections as one switch
  const status = statusBar(g);
  /** What needs you: every decision waiting for an answer (the inbox). */
  const needs = () => g.corp.todo.inbox();
  const appHead = () => {
    const seg = segments(group.apps.map((a) => ({ id: a, label: `${APP_ICONS[a] || ''} ${a === 'Bank' && group.id === 'Bank' ? 'Rates' : a}`, badge: badge[a] })), tab, (a) => open(a));
    return h('div', {}, navBar({ icon: APP_ICONS[tab] || '', title: group.id === 'Journal' ? 'Journal' : tab, back: () => open('Home') }), seg);
  };

  if (tab === 'Needs') body.append(statusBar(g), navBar({ icon: '📥', title: 'Needs you', back: () => open('Home') }));
  else if (tab === 'Stocks') stocksScreen(ui, body, { header: () => h('div', {}, status, appHead(), fold(ui, 'StocksChart', 'Ober\'s Oil price chart ›', (box) => box.append(stocksHeader(g)))) });
  else { body.append(status); if (tab !== 'Home') body.append(appHead()); else if (ui.tabletInbox) body.append(navBar({ icon: '🔔', title: 'Notifications', back: () => { ui.tabletInbox = false; open('Home'); } })); }
  if (tab === 'Home' && ui.tabletInbox) inboxScreen(ui, body, open);
  else if (tab === 'Home') homeScreen(ui, body, open, groups, badge, needs(), unread);
  else if (tab === 'Needs') needsApp(ui, body, open); // v0.90.0: the inbox
  else if (tab === 'Business') businessSummary(ui, body, opts, open);
  else if (tab === 'Ships') shipsApp(ui, body, open);
  else if (tab === 'Farm') bizScreen(ui, body, open, 'farming', { tab: 'Farm', foldKey: 'Farm', foldLabel: 'The farm in full — land, Co-op prices, books ›', renderFold: (box) => farmApp(ui, box) });
  else if (tab === 'Aerospace') bizScreen(ui, body, open, 'aerospace', { tab: 'Aerospace', foldKey: 'Aerospace', foldLabel: 'The firm in full — terminal, latest reports ›', renderFold: (box) => aeroApp(ui, box) });
  else if (tab === 'Companies') companiesApp(ui, body, open); // v0.60.0
  else if (tab === 'Intelligence') intelApp(ui, body, open);
  else if (tab === 'Group') groupApp(ui, body, open); // v0.61.0
  else if (tab === 'Managers') managersApp(ui, body, open); // v0.89.0: replaces People and Management
  else if (tab === 'Exchange') exchangeApp(ui, body, open); // v0.66.0
  else if (tab === 'Bank') bankApp(ui, body); // v0.68.0
  else if (tab === 'Bonds') bondsApp(ui, body, open); // v0.69.0
  else if (tab === 'Loans') loansApp(ui, body, open); // v0.73.0
  else if (tab === 'Economy') economyApp(ui, body); // v0.75.0
  else if (tab === 'Milestones') milestonesApp(ui, body); // v0.80.0
  else if (tab === 'Customers') customersApp(ui, body, open); // v0.84.0: a summary, the list one tap down
  else if (tab === 'Standing') standingApp(ui, body); // v0.85.0
  else if (tab !== 'Stocks') journalTab(ui, body, tab); // Stocks: above (it re-renders itself, bar included, after each trade)
  if (tab === 'Home' && ui.tabletInbox) T.markRead();
  if (tab !== 'Home') ui.tabletInbox = false;
  return { title: '📱 OberPad', className: 'tablet tablet2' }; // (the title is for the frame and the tests; the tablet's own screen has none)
}

/** Business (v0.85.0): the arms trade at a glance; the console, with its parts, equipment, staff, research and market, one tap down. */
function businessSummary(ui, body, opts, open) {
  if (opts.sub || opts.warehouse || opts.msg || opts.country || opts.ship) openFold(ui, 'Business'); // sent here to a page of the console: open it
  bizScreen(ui, body, open, 'arms', { tab: 'Business', foldKey: 'Business', foldLabel: 'The works console — parts, equipment, staff, research, market ›', renderFold: (box) => businessApp(ui, box, opts, open) });
}

/** Journal → Standing (v0.85.0): how the factions regard you — the strongest feelings first, the full list one tap down. */
function standingApp(ui, body) {
  const g = ui.game;
  const rep = g.player.reputation;
  const all = Object.entries(g.content.factions).map(([id, f]) => ({ id, f, v: rep[id] || 0 }));
  const known = all.filter((x) => x.v !== 0).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const best = known.filter((x) => x.v > 0)[0];
  const worst = known.filter((x) => x.v < 0)[0];
  body.append(
    hero({ label: 'How the borough sees you', value: known.length ? `${known.length} of ${all.length} know you` : 'Nobody yet', sub: best ? `${best.f.name} thinks best of you` : 'Do something for someone and it shows here.' }),
    tiles([{ n: best ? `+${best.v}` : '—', t: best ? best.f.name : 'best standing', tone: best ? 'good' : '' }, { n: worst ? String(worst.v) : '—', t: worst ? worst.f.name : 'worst standing', tone: worst ? 'neg' : '' }, { n: String(all.length - known.length), t: 'have no view' }]),
    known.length ? h('div', { class: 'tb-card list' }, ...known.slice(0, 4).map((x) => row({ icon: x.v > 0 ? '⭐' : '⚠', title: x.f.name, sub: x.f.description, tag: x.v > 0 ? `+${x.v}` : String(x.v), tone: x.v > 0 ? 'good' : 'neg' }))) : null,
    fold(ui, 'Standing', 'Every faction ›', (box) => journalTab(ui, box, 'Standing')));
}

/** Journal → Customers (v0.84.0): the gang's mood and who has an order today; the whole list is one tap down. */
function customersApp(ui, body, open) {
  const g = ui.game;
  const G = g.gang;
  const mine = G.playerCustomers().map((id) => ({ id, c: G.customer(id), npc: g.npcs.get(id) })).filter((x) => x.npc);
  const orders = mine.filter((x) => x.c?.order);
  const anger = G.state.anger;
  body.append(
    hero({ label: 'Sums of Anarchy', value: anger < 25 ? 'Calm' : anger < 50 ? 'Uneasy' : anger < 75 ? 'Angry' : 'Hunting you', tone: anger >= 50 ? 'neg' : '', sub: `anger ${Math.round(anger)} / 100 — dealing and stealing customers raise it; quiet days lower it` }),
    tiles([{ n: String(mine.length), t: 'your customers' }, { n: String(orders.length), t: 'orders waiting' }, { n: `${Math.round(anger)}`, t: 'anger / 100', tone: anger >= 50 ? 'neg' : '' }]),
    orders.length ? h('div', { class: 'tb-card list' }, ...orders.slice(0, 4).map((x) => row({ icon: '📟', title: x.npc.profile.shortName, sub: `${x.c.order.qty} × ${g.content.items[calcItem(x.c.order.type)]?.name || 'calculator'} at ${x.c.order.price} obols` }))) : null,
    fold(ui, 'Customers', 'Every customer and the calculator trade ›', (box) => journalTab(ui, box, 'Customers')));
}

/** v0.55.0: Roost Aeroworks at a glance, and the way into the terminal. */
function aeroApp(ui, body) {
  const g = ui.game;
  const A = g.aero;
  const co = A.roost;
  const week = A.statement(co, 7);
  const units = A.unitsOf(co);
  body.append(
    h('div', { class: 'grid2 tablet-cards' },
      h('div', { class: 'tablet-card' }, h('b', {}, '✈️ Roost Aeroworks'), h('span', {}, `${A.contractsOf(co, 'active').length} contracts · ${units.length} units in hand`), h('span', {}, `Last 7 days: revenue ${week.revenue.toLocaleString()}, profit ${Math.round(week.profit).toLocaleString()}`)),
      h('div', { class: 'tablet-card' }, h('b', {}, '📣 Tender board'), h('span', {}, `${A.openTenders().length} open tenders`), h('span', {}, `MRDN ${A.state.market.price.toFixed(2)}`)),
    ),
    h('button', { class: 'primary', onclick: () => ui.openPanel('aerospace', { company: 'roost' }) }, 'Open the aerospace terminal'),
    h('h3', { style: 'margin:12px 0 6px' }, 'Latest'),
    h('div', { class: 'list' }, ...A.state.reports.filter((r) => r.company === 'roost').slice(0, 3).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${A.when(r.at)} — ${r.text}`))))),
  );
}

/** The notifications (the old Home's feed): opened from the bell on the home screen. */
function inboxScreen(ui, body, open) {
  const g = ui.game;
  const T = g.tablet;
  const s = T.state;
  const filter = h('div', { class: 'row', style: 'justify-content:space-between;margin:12px 0 6px' },
    h('h3', { style: 'margin:0' }, 'Notifications'),
    s.feed.length ? h('button', { class: 'small', onclick: () => { s.feed = []; s.unread = 0; open('Home'); } }, 'Clear') : null);
  body.append(filter);
  if (!s.feed.length) {
    body.append(h('p', { class: 'muted' }, 'Nothing yet. Deliveries, shipments, payroll, stalled stations, world news and share moves will show up here.'));
    return;
  }
  const list = h('div', { class: 'list tablet-feed' });
  s.feed.forEach((n, i) => {
    const app = TABLET_APPS[n.app] || { icon: '•', name: '' };
    const day = Math.floor(n.at / 1440) + 1;
    const mins = Math.floor(n.at % 1440);
    const when = `Day ${day} ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    list.append(h('div', { class: `item-row feed-${n.kind}${i < T.unread ? ' unread' : ''}` },
      h('div', { class: 'icon' }, app.icon),
      h('div', { class: 'grow' }, h('div', {}, n.text), h('div', { class: 'desc' }, `${app.name} · ${when}`))));
  });
  body.append(list);
}

function businessApp(ui, body, opts, open) {
  const g = ui.game;
  const works = g.arms.ownedIds();
  const wh = works.includes(opts.warehouse) ? opts.warehouse : works[0];
  const sub = TERMINAL_TABS.includes(opts.sub) ? opts.sub : 'Overview';
  const go = (t, extra = {}) => open('Business', { warehouse: wh, sub: t, ...extra });
  if (works.length > 1) {
    body.append(h('div', { class: 'row tablet-sub', style: 'justify-content:flex-start' },
      ...works.map((id) => h('button', { class: `small${id === wh ? ' primary' : ''}`, onclick: () => open('Business', { warehouse: id, sub }) }, g.arms.def(id).name))));
  }
  terminalScreen(ui, body, { warehouse: wh, tab: sub, msg: opts.msg, country: opts.country, ship: opts.ship, remote: true }, go);
}

/** The brokerage banner: a line of Ober's Oil's recent closing prices. */
function stocksHeader(g) {
  const hist = g.oil.state.history;
  const wrap = h('div', { class: 'tablet-ticker' }, h('b', {}, 'OBER — Ober\'s Oil, closing price'));
  if (hist.length < 2) {
    wrap.append(h('div', { class: 'muted' }, 'The price chart fills in after a couple of trading days (the market closes at 18:00).'));
    return wrap;
  }
  const W = 420;
  const H = 80;
  const P = 8;
  const prices = hist.map((d) => d.price);
  const lo = Math.min(...prices) - 2;
  const hi = Math.max(...prices) + 2;
  const x = (i) => P + (i * (W - 2 * P)) / (hist.length - 1);
  const y = (v) => H - P - ((v - lo) * (H - 2 * P)) / (hi - lo);
  // built as markup: an inline <svg> in an HTML document needs no namespace
  const dots = hist.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.price)}" r="7" class="ticker-hit"><title>Day ${d.day}: ${d.price} obols · ${d.output} barrels · dividend ${d.dividend ?? 0}</title></circle><circle cx="${x(i)}" cy="${y(d.price)}" r="${i === hist.length - 1 ? 4 : 2.5}" class="ticker-dot"></circle>`).join('');
  const holder = h('div');
  holder.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="ticker-chart" role="img" aria-label="Share price over the last ${hist.length} days, from ${prices[0]} to ${prices[prices.length - 1]} obols"><line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" class="ticker-axis"></line><polyline points="${hist.map((d, i) => `${x(i)},${y(d.price)}`).join(' ')}" class="ticker-line"></polyline>${dots}</svg>`;
  const svg = holder.firstChild;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const ch = last - first;
  wrap.append(svg, h('div', { class: 'desc' }, `Day ${hist[0].day}: ${first} → Day ${hist[hist.length - 1].day}: ${last} (${ch >= 0 ? '+' : '−'}${Math.abs(ch)}). Hover a point for that day.`));
  return wrap;
}

/** Ships: Fleet Command takes the whole screen, so the tablet shows the line at a glance and launches it (closing it comes back here). */
function shipsApp(ui, body, open) {
  const Lg = ui.game.logistics;
  bizScreen(ui, body, open, 'shipping', { tab: 'Ships', foldKey: 'Ships', foldLabel: 'Fleet Command — every ship, port and contract ›', renderFold: (box) => box.append(h('div', { class: 'tablet-card fc-launch' }, h('p', {}, `${Lg.vessels().filter((v) => v.status !== 'lost').length} ships · ${Lg.ownedPorts().length} ports · ${Lg.idle().length} waiting for orders`), h('button', { class: 'primary', onclick: () => ui.openPanel('logistics') }, 'Open Fleet Command'))) });
}
