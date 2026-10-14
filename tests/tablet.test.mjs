// The tablet (v0.15.0): the journal's replacement. Business notifications
// from the arms works, shipping, world news and Ober's Oil; a feed with an
// unread count; the Business app only once you own a works; saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, noImpulses, Game, CONTENT } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';

const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };
const works = (hhmm = '08:00') => {
  const g = newGame(1);
  setTime(g, 1, hhmm);
  noImpulses(g);
  runCommand(g, 'works aw1');
  g.changeMap('aw1', 'entry');
  return g;
};
const feed = (g, app) => g.tablet.state.feed.filter((n) => !app || n.app === app).map((n) => n.text);

test('posting puts a line in the feed, counts it unread, and still toasts', () => {
  const g = newGame(1);
  const toasts = [];
  g.bus.on('notify', ({ text }) => toasts.push(text));
  assert.equal(g.tablet.unread, 0);
  g.tablet.post('arms', 'Hello from the works.', 'info');
  g.tablet.post('stocks', 'Shares up.', 'good');
  assert.equal(g.tablet.unread, 2);
  assert.deepEqual(feed(g), ['Shares up.', 'Hello from the works.'], 'newest first');
  assert.ok(toasts.some((t) => t.includes('Hello from the works.')));
  g.tablet.markRead();
  assert.equal(g.tablet.unread, 0);
  for (let i = 0; i < 100; i++) g.tablet.post('news', `n${i}`);
  assert.ok(g.tablet.state.feed.length <= 60, 'the feed is capped');
});

test('the Business app installs itself once you own an arms works', () => {
  const g = newGame(1);
  assert.equal(g.tablet.hasBusiness(), false);
  runCommand(g, 'works aw1');
  assert.equal(g.tablet.hasBusiness(), true);
});

test('deliveries, research and payroll reach the tablet', () => {
  const g = works('08:00');
  g.player.money = 5000;
  assert.ok(g.arms.order('aw1', 'item_ap_steel', 5).ok);
  minutes(g, 61);
  assert.ok(feed(g, 'arms').some((t) => /delivered to Yard 1 Works's loading dock/.test(t)));
  runCommand(g, 'hire 1 aw1');
  g.arms.state.research.current = Object.keys(CONTENT.arms.research)[0];
  g.arms.addResearch(9999);
  assert.ok(feed(g, 'arms').some((t) => /Research complete/.test(t)));
  setTime(g, 1, '18:59');
  minutes(g, 2);
  assert.ok(feed(g, 'arms').some((t) => /Payroll: \d+ obols/.test(t)), feed(g).join(' | '));
  assert.ok(feed(g, 'arms').some((t) => /Yard 1 Works today:/.test(t)), 'the daily report');
});

test('a warning before a payroll you cannot cover', () => {
  const g = works('08:00');
  runCommand(g, 'hire 2 aw1');
  g.player.money = 1;
  setTime(g, 1, '17:59');
  minutes(g, 2);
  assert.ok(feed(g, 'arms').some((t) => /Payroll at 19:00 is \d+ obols and you have 1/.test(t)));
});

test('a staffed station that runs out of parts raises one alert, not one an hour', () => {
  const g = works('07:30');
  runCommand(g, 'stations');
  runCommand(g, 'hire 1 aw1');
  const st = g.arms.state.staff[0];
  st.quirk = null;
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  g.arms.setRecipe(L.id, 'barrel');
  L.in = { item_ap_steel: 2 };
  g.arms.assign(st.id, L.id);
  run(g, 60, 0.5); // walk over and use up the steel
  minutes(g, 180);
  const alerts = feed(g, 'arms').filter((t) => /Lathe.*out of parts/i.test(t));
  assert.equal(alerts.length, 1, feed(g).join(' | '));
  // refill: the alert clears; run dry again and it comes back
  L.in = { item_ap_steel: 2 };
  minutes(g, 120);
  assert.equal(feed(g, 'arms').filter((t) => /out of parts/.test(t)).length, 2);
});

test('shipments, world news and Ober\'s Oil post to their own apps', () => {
  const g = works('08:00');
  g.player.money = 20000;
  g.world.containers[g.arms.def('aw1').outCrate].items.item_crate_pistol = 5;
  const s = g.market.state;
  const o = { id: s.nextOrder++, country: 'teshvar', item: 'item_crate_pistol', qty: 5, price: g.market.price('teshvar', 'item_crate_pistol'), posted: 1, expires: 9, status: 'open' };
  s.orders.push(o);
  assert.ok(g.market.ship({ wh: 'aw1', order: o.id, shipper: 'morrow' }).ok);
  runCommand(g, 'arrive');
  assert.ok(feed(g, 'market').length >= 1);
  g.market.news('Something happened abroad.');
  assert.ok(feed(g, 'news').includes('Something happened abroad.'));
  g.oil.buyShares(5);
  g.oil.dailyTick();
  assert.ok(feed(g, 'stocks').some((t) => /Ober's Oil/.test(t)));
});

test('the feed survives a save and load', () => {
  const g = newGame(1);
  g.tablet.post('arms', 'Remember me.');
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(data);
  assert.equal(g2.tablet.state.feed[0].text, 'Remember me.');
  assert.equal(g2.tablet.unread, 1);
});
