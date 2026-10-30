// The tablet's apps in groups (v0.72.0). No DOM here: which apps exist, which group each is in, what is new in each.
//
//   tabletGroups(g)        the groups with the apps this game has, in order
//   groupOf(groups, tab)   the group an app is in
//   badges(g)              { app: number of unread notifications that belong to it }
//   searchApps(groups, q)  the apps whose name or group matches a search

export const JOURNAL = ['Quests', 'People', 'Customers', 'Notes', 'Standing'];

const ICONS = { Home: '🏠', Journal: '📓', Businesses: '🏭', Group: '🏛️', Markets: '📈', Bank: '🏦' };
export const APP_ICONS = { Home: '🏠', Quests: '🧭', People: '👥', Customers: '🛒', Notes: '📝', Standing: '⭐', Business: '🏭', Ships: '⚓', Farm: '🌾', Aerospace: '✈️', Companies: '🏢', Group: '🏛️', Personnel: '🧑‍💼', Management: '🧭', Intelligence: '🔎', Exchange: '📊', Stocks: '📈', Bank: '🏦', Bonds: '📜' };

export function tabletGroups(g) {
  const T = g.tablet;
  const own = g.corp.registry().some((r) => r.kind === 'player');
  const groups = [
    { id: 'Home', apps: ['Home'] },
    { id: 'Journal', apps: [...JOURNAL] },
    { id: 'Businesses', apps: [...(T.hasBusiness() ? ['Business'] : []), ...(g.logistics.owned ? ['Ships'] : []), ...(g.farm.owned().length ? ['Farm'] : []), ...(g.aero.owned ? ['Aerospace'] : []), ...(own ? ['Companies'] : [])] },
    { id: 'Group', apps: own ? ['Group', 'Personnel', 'Management'] : [] },
    { id: 'Markets', apps: ['Exchange', 'Stocks', 'Intelligence'] },
    { id: 'Bank', apps: ['Bank', 'Bonds'] },
  ];
  return groups.filter((x) => x.apps.length).map((x) => ({ ...x, icon: ICONS[x.id] }));
}

export const allApps = (groups) => groups.flatMap((x) => x.apps);
export const groupOf = (groups, tab) => groups.find((x) => x.apps.includes(tab)) || groups[0];

/** Which app a feed item belongs to (the feed's own app names are older than the tablet's). */
const FEED_TAB = { arms: 'Business', market: 'Business', ships: 'Ships', aero: 'Aerospace', stocks: 'Stocks', bank: 'Bank' };

/** The newest `unread` feed items, counted by the app they belong to (news and the like belong to Home). */
export function badges(g) {
  const out = {};
  const s = g.tablet.state;
  for (const n of s.feed.slice(0, g.tablet.unread)) {
    const tab = FEED_TAB[n.app] || 'Home';
    out[tab] = (out[tab] || 0) + 1;
  }
  return out;
}

export function searchApps(groups, q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  return groups.flatMap((x) => x.apps.filter((a) => a.toLowerCase().includes(s) || x.id.toLowerCase().includes(s)).map((a) => ({ app: a, group: x.id })));
}
