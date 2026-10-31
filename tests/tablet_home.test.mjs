// The OberPad's home screen (v0.83.0): which icons a game has, where each leads, and that no app is left without a way in.
// (The look and the flows are checked in the browser by tools/smoke-test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { tabletGroups, allApps, groupOf } from '../src/ui/tabletGroups.js';
import { homeTiles } from '../src/ui/tabletHome.js';

test('a new game has Journal, Markets, Bank and the news on its home screen; owning businesses adds the rest, in order', () => {
  const g = newGame(3301);
  assert.deepEqual(homeTiles(tabletGroups(g)).map((t) => t.id), ['Journal', 'Markets', 'Bank', 'Economy']);
  g.player.money = 5e6; g.aero.buyFirm();
  assert.deepEqual(homeTiles(tabletGroups(g)).map((t) => t.id), ['Journal', 'Businesses', 'Group', 'Markets', 'Bank', 'Economy', 'Managers', 'Milestones']);
});

test('every icon opens an app that exists, and every app can be reached: by its own icon or from the switch inside its group', () => {
  const g = newGame(3302);
  g.player.money = 5e6; g.aero.buyFirm(); g.logistics.buyCompany(); g.farm.buy('plot_east_1');
  const groups = tabletGroups(g);
  const apps = allApps(groups);
  const tiles = homeTiles(groups);
  for (const t of tiles) assert.ok(apps.includes(t.target), `${t.id} opens ${t.target}`);
  for (const a of apps.filter((x) => x !== 'Home' && x !== 'Needs')) { // (the inbox is reached from the Needs-you card on the home screen itself)
    const gr = groupOf(groups, a);
    assert.ok(tiles.some((t) => t.id === gr.id || t.id === a), `${a} (in ${gr.id}) has a way in from the home screen`);
  }
  assert.ok(tiles.length <= 8, 'eight icons at most, as proposed');
});

test('the dock is four of the icons', () => {
  const g = newGame(3303);
  const ids = homeTiles(tabletGroups(g)).map((t) => t.id);
  for (const d of ['Journal', 'Markets', 'Bank']) assert.ok(ids.includes(d));
});

test('the heavy apps are reached only through their summaries: the tablet imports no old page directly (v0.84.0)', async () => {
  const { readFileSync } = await import('node:fs');
  const t = readFileSync('src/ui/tablet.js', 'utf8');
  for (const f of ['corpGroup', 'corpExchange', 'corpEconomy', 'corpMilestones', 'corpApp', 'corpIntel']) assert.ok(!t.includes(`./${f}.js`), `tablet.js must not import ${f} directly`);
  const s = readFileSync('src/ui/tabletSummaries.js', 'utf8');
  for (const fn of ['groupFull', 'economyFull', 'exchangeFull', 'milestonesFull', 'companiesFull', 'intelFull']) assert.ok(new RegExp(`fold\\(ui, '[A-Za-z]+', [^\\n]*${fn}\\(`).test(s), `${fn} is rendered inside a fold`);
});
