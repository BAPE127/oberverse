// The tablet's apps in groups (v0.72.0): which apps a game has, where each lives, what is new in each, and the search — the
// pure part of the home screen. The same apps as before, none removed, none added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { tabletGroups, allApps, groupOf, badges, searchApps, JOURNAL } from '../src/ui/tabletGroups.js';

test('a new game has the journal, the markets and the bank; owning businesses adds the rest, and every app lives in exactly one group', () => {
  const g = newGame(3201);
  let groups = tabletGroups(g);
  assert.deepEqual(groups.map((x) => x.id), ['Home', 'Journal', 'Markets', 'Bank']);
  assert.deepEqual(groups.find((x) => x.id === 'Journal').apps, JOURNAL);
  assert.deepEqual(groups.find((x) => x.id === 'Markets').apps, ['Exchange', 'Stocks', 'Economy', 'Intelligence']);
  g.player.money = 5e6; g.aero.buyFirm(); g.farm.buy('plot_east_1');
  groups = tabletGroups(g);
  assert.deepEqual(groups.map((x) => x.id), ['Home', 'Journal', 'Businesses', 'Group', 'Markets', 'Bank']);
  assert.deepEqual(groups.find((x) => x.id === 'Businesses').apps, ['Farm', 'Aerospace', 'Companies']);
  assert.deepEqual(groups.find((x) => x.id === 'Group').apps, ['Group', 'Personnel', 'Management', 'Milestones']);
  const apps = allApps(groups);
  assert.equal(new Set(apps).size, apps.length, 'no app in two groups');
  for (const a of apps) assert.equal(groupOf(groups, a).apps.includes(a), true);
  assert.equal(groupOf(groups, 'Nonsense').id, 'Home', 'an unknown app falls back to Home');
  // the apps the tablet had before are all still there
  for (const a of ['Home', 'Quests', 'People', 'Customers', 'Notes', 'Standing', 'Farm', 'Aerospace', 'Companies', 'Group', 'Personnel', 'Management', 'Milestones', 'Intelligence', 'Exchange', 'Economy', 'Bank', 'Bonds', 'Loans', 'Stocks']) assert.ok(apps.includes(a), a);
});

test('badges count the newest unread notifications by the app they belong to', () => {
  const g = newGame(3202);
  assert.deepEqual(badges(g), {});
  g.tablet.post('arms', 'a'); g.tablet.post('stocks', 'b'); g.tablet.post('stocks', 'c'); g.tablet.post('bank', 'd'); g.tablet.post('news', 'e'); g.tablet.post('ships', 'f');
  assert.deepEqual(badges(g), { Business: 1, Stocks: 2, Bank: 1, Economy: 1, Ships: 1 }, 'world news belongs to the Economy app since v0.75.0');
  g.tablet.markRead();
  assert.deepEqual(badges(g), {}, 'reading clears them');
  g.tablet.post('aero', 'g');
  assert.deepEqual(badges(g), { Aerospace: 1 }, 'only what arrived since');
});

test('search finds an app by its name or its group, ignoring case, and nothing for nothing', () => {
  const g = newGame(3203);
  const groups = tabletGroups(g);
  assert.deepEqual(searchApps(groups, 'bond'), [{ app: 'Bonds', group: 'Bank' }]);
  assert.deepEqual(searchApps(groups, 'BANK').map((x) => x.app), ['Bank', 'Bonds', 'Loans']);
  assert.deepEqual(searchApps(groups, 'ex').map((x) => x.app), ['Exchange']);
  assert.deepEqual(searchApps(groups, ''), []); assert.deepEqual(searchApps(groups, '   '), []); assert.deepEqual(searchApps(groups, 'zzz'), []);
  assert.ok(searchApps(groups, 'markets').length === 4, 'by group');
});
