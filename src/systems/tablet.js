// The tablet (v0.15.0): the old journal grew a screen. Besides quests and
// people it runs your businesses (the arms works) and a brokerage (Ober's
// Oil), and it keeps a notification feed of what your businesses are doing.
//
//   post(app, text, kind) → toast now + a line in the feed (unread until seen)
//   apps: 'arms' (works, staff, orders) · 'market' (shipments) ·
//         'news' (wars, embargoes) · 'stocks' (Ober's Oil)
//
// State: game.world.tablet = { feed: [{id, at, app, text, kind}], unread, nextId }.
export const TABLET_APPS = {
  arms: { icon: '🏭', name: 'Business' },
  market: { icon: '🚢', name: 'Shipping' },
  news: { icon: '📰', name: 'World news' },
  stocks: { icon: '📈', name: 'Stocks' },
  ships: { icon: '⚓', name: 'Ober & Sons' },
  aero: { icon: '✈️', name: 'Aerospace' }, // v0.55.0
};
const FEED_MAX = 60;

export class Tablet {
  constructor(game) {
    this.game = game;
  }

  get state() {
    const g = this.game;
    if (!g.world.tablet) g.world.tablet = { feed: [], unread: 0, nextId: 1 };
    return g.world.tablet;
  }

  /** A business notification: toast it and keep it in the feed. */
  post(app, text, kind = 'info') {
    const g = this.game;
    const s = this.state;
    s.feed.unshift({ id: s.nextId++, at: g.clock.total, app, text, kind });
    if (s.feed.length > FEED_MAX) s.feed.length = FEED_MAX;
    s.unread = Math.min(FEED_MAX, s.unread + 1);
    g.notify(`📱 ${text}`, kind);
    g.bus.emit('tablet:post', { app, text, kind });
  }

  get unread() {
    return this.state.unread;
  }

  markRead() {
    this.state.unread = 0;
  }

  /** Which tablet apps are installed: Business needs an arms works. */
  hasBusiness() {
    return this.game.arms.ownedIds().length > 0;
  }
}
