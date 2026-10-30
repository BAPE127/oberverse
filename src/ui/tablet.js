// The tablet (v0.15.0) — the journal's replacement. Apps along the top:
//   Home       — business notifications (src/systems/tablet.js) and a summary
//   Quests · People · Customers · Notes · Standing — the old journal pages
//   Business   — a remote link to each arms works' terminal (once you own one)
//   Stocks     — the Ober's Oil share register, as at Sir Moneybucks's desk
import { h, journalTab, JOURNAL_TABS, stocksScreen } from './panels.js';
import { terminalScreen, TERMINAL_TABS } from './terminal.js';
import { TABLET_APPS } from '../systems/tablet.js';
import { farmApp } from './farm.js';
import { companiesApp } from './corpApp.js'; // v0.60.0
import { intelApp } from './corpIntel.js';
import { groupApp } from './corpGroup.js';
import { peopleApp } from './corpPeople.js'; // v0.62.0
import { manageApp } from './corpManage.js'; // v0.63.0
import { exchangeApp } from './corpExchange.js'; // v0.66.0
import { bankApp } from './corpBank.js'; // v0.68.0
import { bondsApp } from './corpBonds.js'; // v0.69.0
import { tabletGroups, allApps, groupOf, badges, searchApps, APP_ICONS } from './tabletGroups.js'; // v0.72.0

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

  /** The apps of the group you are in, one tap away (v0.72.0). A group of one app has none. */
  const appBar = () => (group.apps.length > 1 ? h('div', { class: 'row tablet-apps', style: 'justify-content:flex-start;flex-wrap:wrap;gap:4px;margin:4px 0 8px' }, ...group.apps.map((a) => h('button', { class: `small${a === tab ? ' primary' : ''}`, onclick: () => open(a) }, `${APP_ICONS[a] || ''} ${a}${badge[a] ? ` (${badge[a]})` : ''}`))) : null);

  const bar = () => h('div', { class: 'tablet-bar' },
    h('span', {}, `Day ${g.clock.day} · ${g.clock.weekday} · ${g.clock.timeString}`),
    h('span', {}, `${g.player.money} obols · 📶 ▮▮▮ 🔋`));

  if (tab === 'Stocks') stocksScreen(ui, body, { header: () => h('div', {}, bar(), appBar(), stocksHeader(g)) });
  else { body.append(bar()); const ab = appBar(); if (ab) body.append(ab); }
  if (tab === 'Home') homeApp(ui, body, open, groups, badge);
  else if (tab === 'Business') businessApp(ui, body, opts, open);
  else if (tab === 'Ships') shipsApp(ui, body);
  else if (tab === 'Farm') farmApp(ui, body); // v0.31.0
  else if (tab === 'Aerospace') aeroApp(ui, body); // v0.55.0
  else if (tab === 'Companies') companiesApp(ui, body, open); // v0.60.0
  else if (tab === 'Intelligence') intelApp(ui, body, open);
  else if (tab === 'Group') groupApp(ui, body, open); // v0.61.0
  else if (tab === 'Personnel') peopleApp(ui, body, open); // v0.62.0
  else if (tab === 'Management') manageApp(ui, body, open); // v0.63.0
  else if (tab === 'Exchange') exchangeApp(ui, body, open); // v0.66.0
  else if (tab === 'Bank') bankApp(ui, body); // v0.68.0
  else if (tab === 'Bonds') bondsApp(ui, body, open); // v0.69.0
  else if (tab !== 'Stocks') journalTab(ui, body, tab); // Stocks: above (it re-renders itself, bar included, after each trade)
  if (tab === 'Home') T.markRead();

  const count = (x) => x.apps.reduce((a, t) => a + (badge[t] || 0), 0);
  const label = (x) => `${x.icon} ${x.id}${count(x) && x.id !== group.id ? ` (${count(x)})` : x.id === 'Home' && unread && tab !== 'Home' ? ` (${unread})` : ''}`;
  return { title: '📱 OberPad', className: 'tablet', tabs: groups.map((x) => ({ label: label(x), active: x.id === group.id, onclick: () => open(x.id === group.id ? x.apps[0] : (ui.tabletLast[x.id] && x.apps.includes(ui.tabletLast[x.id]) ? ui.tabletLast[x.id] : x.apps[0])) })) };
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
    h('div', { class: 'list' }, ...A.state.reports.filter((r) => r.company === 'roost').slice(0, 8).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `${A.when(r.at)} — ${r.text}`))))),
  );
}

function homeApp(ui, body, open, groups, badge) {
  const g = ui.game;
  const T = g.tablet;
  // v0.72.0: the apps, in their groups, with what is new in each — and a search
  const q = h('input', { type: 'text', class: 'debug-input', placeholder: 'Find an app…', value: ui.tabletSearch || '', style: 'width:100%;margin-bottom:6px' });
  q.addEventListener('change', () => { ui.tabletSearch = q.value; open('Home'); });
  body.append(q);
  const found = searchApps(groups, ui.tabletSearch);
  if (ui.tabletSearch) body.append(found.length ? h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:4px;margin-bottom:8px' }, ...found.map((f) => h('button', { class: 'small primary', onclick: () => { ui.tabletSearch = ''; open(f.app); } }, `${APP_ICONS[f.app] || ''} ${f.app} · ${f.group}`))) : h('p', { class: 'muted' }, 'No app by that name.'));
  else body.append(h('div', { class: 'list' }, ...groups.filter((x) => x.id !== 'Home').map((x) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'icon' }, x.icon), h('div', { class: 'grow' }, h('div', { class: 'name' }, x.id),
    h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:4px;margin-top:4px' }, ...x.apps.map((a) => h('button', { class: 'small', onclick: () => open(a) }, `${APP_ICONS[a] || ''} ${a}${badge[a] ? ` (${badge[a]})` : ''}`))))))));
  const cards = h('div', { class: 'grid2 tablet-cards' });
  if (T.hasBusiness()) {
    const A = g.arms;
    const works = A.ownedIds();
    const staff = A.state.staff.length;
    const ms = g.market.state;
    cards.append(h('button', { class: 'tablet-card', onclick: () => open('Business') },
      h('b', {}, '🏭 Arms business'),
      h('span', {}, `${works.length} works · ${staff} staff · ${ms.shipments.length} shipment${ms.shipments.length === 1 ? '' : 's'} at sea`),
      h('span', {}, `Research: ${A.state.research.current ? A.cfg.research[A.state.research.current].name : 'none'} · Exports earned ${ms.earned}`)));
  } else {
    cards.append(h('div', { class: 'tablet-card muted' }, h('b', {}, '🏭 Business'), h('span', {}, 'You don\'t own a business yet. Buy an arms works and it will show up here.')));
  }
  const cars = g.vehicles.ownedCars();
  if (cars.length) {
    const models = g.content.vehicles.models;
    cards.append(h('div', { class: 'tablet-card' },
      h('b', {}, `🚗 Your cars (${cars.length})`),
      ...cars.slice(0, 4).map((c) => h('span', {}, `${models[c.model].name}${c.stolen ? ' (stolen)' : ''} — ${c.id === g.player.driving ? 'you\'re driving it' : g.maps.get(c.map).name}`)),
      cars.length > 4 ? h('span', {}, `…and ${cars.length - 4} more (all on the map).`) : null));
  }
  if (g.logistics.owned) {
    const Lg = g.logistics;
    const vs = Lg.vessels();
    cards.append(h('button', { class: 'tablet-card', onclick: () => ui.openPanel('logistics') },
      h('b', {}, '⚓ Ober & Sons Maritime'),
      h('span', {}, `${vs.length} ship${vs.length === 1 ? '' : 's'} (${vs.filter((v) => v.status === 'underway').length} at sea) · ${Lg.ownedPorts().length} ports`),
      h('span', {}, `${Lg.contracts(['accepted', 'loading', 'transit']).length} contracts running · ${Lg.contracts('available').length} on offer`)));
  }
  const oil = g.oil.state;
  cards.append(h('button', { class: 'tablet-card', onclick: () => open('Stocks') },
    h('b', {}, '📈 Ober\'s Oil'),
    h('span', {}, `${oil.sharePrice.toFixed(2)} obols a share · you own ${oil.sharesOwned}`),
    h('span', {}, oil.sharesOwned ? `Worth ${Math.round(oil.sharesOwned * oil.sharePrice)} · dividends so far ${oil.dividendsPaid}` : 'Buy shares from the Stocks app.')));
  body.append(cards);

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

/** Ships: Fleet Command takes the whole screen, so the tablet just launches it (closing it comes back here). */
function shipsApp(ui, body) {
  const Lg = ui.game.logistics;
  const vs = Lg.vessels().filter((v) => v.status !== 'lost');
  const sea = vs.filter((v) => v.status === 'underway').length;
  body.append(h('div', { class: 'tablet-card fc-launch' },
    h('h3', {}, '⚓ Ober & Sons — Fleet Command'),
    h('p', {}, `${vs.length} ships (${sea} at sea) · ${Lg.ownedPorts().length} ports · ${Lg.idle().length} waiting for orders`),
    h('button', { class: 'primary', onclick: () => ui.openPanel('logistics') }, 'Open Fleet Command')));
}
