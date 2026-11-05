// The war company (v0.98.0 stage 3): a registered name, its own money, a licence and a lot; the government's side stays separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { LOT } from '../src/content/facilities.js';
import { COMPANY_IDS, ACCOUNT_IDS } from '../src/systems/corporate.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };

test('the company is registered through the same naming rules as every company, once; it is not one of the four businesses, and it has an account of its own', () => {
  const g = newGame(201);
  assert.equal(g.war.companyView(), null);
  assert.ok(!g.war.found('x').ok, 'too short');
  const other = g.corp.takenNames()[0]; assert.ok(other && !g.war.found(other).ok, 'a name another company has is refused');
  const r = g.war.found('Ironclad Company'); assert.ok(r.ok, r.text);
  assert.ok(!g.war.found('Another Company').ok, 'registered once');
  assert.equal(g.war.companyView().name, 'Ironclad Company');
  assert.ok(g.corp.established('security')); assert.ok(ACCOUNT_IDS.includes('security')); assert.ok(!COMPANY_IDS.includes('security'));
  assert.ok(!g.corp.registry().some((x) => x.id === 'security' || x.name === 'Ironclad Company' && x.kind === 'player'), 'it is not listed among your businesses');
  // nobody else may take the name
  assert.ok(g.corp.takenNames().includes('Ironclad Company'), 'no business may take the name');
  assert.ok(!g.corp.rename('farming', 'Ironclad Company').ok);
  assert.ok(g.war.rename('Ironclad Company').ok && g.war.rename('Ironclad Co').ok && g.war.companyView().name === 'Ironclad Co');
});

test('its money is its own: you pay it in and take it out; everything it buys comes from its account and never from your wallet; a short account refuses and changes nothing', () => {
  const g = newGame(202); g.player.money = 500_000; g.war.found('Ironclad Company');
  const r0 = g.war.pay(100, 'x'); assert.ok(!r0.ok && /holds 0/.test(r0.text));
  assert.ok(!g.war.fund(0).ok); assert.ok(!g.war.fund(9e9).ok, 'not more than you have');
  assert.ok(g.war.fund(200_000).ok); assert.equal(g.player.money, 300_000); assert.equal(g.war.cash(), 200_000);
  const before = JSON.stringify(g.world.military);
  assert.ok(!g.war.pay(250_000, 'too much').ok); assert.equal(JSON.stringify(g.world.military), before); assert.equal(g.war.cash(), 200_000); assert.equal(g.player.money, 300_000);
  assert.ok(g.war.pay(50_000, 'a thing').ok); assert.equal(g.war.cash(), 150_000); assert.equal(g.player.money, 300_000, 'the wallet did not move');
  assert.ok(g.war.take(100_000).ok); assert.equal(g.player.money, 400_000); assert.equal(g.war.cash(), 50_000);
  assert.ok(g.corp.reconciles(), 'the account reconciles with its history like the businesses\'');
});

test('licence and lot: the licence first, then the lot, both paid by the company; the fence and gate then join the damage gate as core structures; each is bought once', () => {
  const g = newGame(203); g.player.money = 1e6; g.war.found('Ironclad Company');
  assert.ok(!g.war.buyLicence().ok, 'no money in the company'); assert.ok(!g.war.buyLot().ok);
  g.war.fund(300_000);
  assert.ok(/licen/i.test(g.war.buyLot().text), 'the lot is for licensed companies');
  assert.ok(g.war.buyLicence().ok); assert.equal(g.war.cash(), 300_000 - LOT.licence); assert.ok(!g.war.buyLicence().ok);
  assert.ok(g.war.buyLot().ok); assert.equal(g.war.cash(), 300_000 - LOT.licence - LOT.price); assert.ok(!g.war.buyLot().ok);
  assert.ok(g.war.lotOwned());
  const s = g.war.structures(); const fence = s.find((x) => x.id === 'hm_fence'); const gate = s.find((x) => x.id === 'hm_gate');
  assert.ok(fence && gate && fence.core && gate.core && fence.protected && gate.protected && fence.owner === 'company');
  assert.ok(g.war.hit('hm_gate', 100, 'gunfire').refused, 'protected before a coup');
  assert.equal(g.player.money, 700_000);
  assert.ok(g.corp.reconciles()); assert.deepEqual(g.war.check(), []);
  const g2 = roundtrip(g);
  assert.equal(g2.war.companyView().name, 'Ironclad Company'); assert.equal(g2.war.cash(), g.war.cash()); assert.ok(g2.war.lotOwned()); assert.ok(g2.corp.reconciles());
  assert.ok(g2.war.commission('site_office').ok, 'a loaded company builds on paying from its account');
});

test('the government is another thing: the company\'s doings never touch the state\'s record, and the company\'s code never reads it', () => {
  const g = newGame(204); g.player.money = 1e6; g.war.state();
  const gov = JSON.stringify(g.world.military.gov); const treasury = JSON.stringify(g.world.politics?.government?.budget ?? null);
  g.war.found('Ironclad Company'); g.war.fund(400_000); g.war.buyLicence(); g.war.buyLot(); g.war.commission('site_office');
  for (let i = 0; i < 12; i++) { g.clock.total += 1440; g.war.dailyTick(); }
  assert.equal(JSON.stringify(g.world.military.gov), gov);
  assert.equal(JSON.stringify(g.world.politics?.government?.budget ?? null), treasury);
  for (const f of ['company', 'facilities']) assert.ok(!/\.gov\b|military\.gov|politics/.test(readFileSync(new URL(`../src/war/${f}.js`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')), `${f}.js does not read the government`);
});

test('a game from before the war update has no record and is not changed by reading the company; the company\'s account is only made once it exists', () => {
  const g = newGame(205);
  assert.equal(g.war.companyView(), null); assert.equal(g.war.cash(), 0); assert.ok(!g.war.fund(100).ok); assert.ok(!g.war.buyLot().ok);
  assert.equal(g.world.military, undefined); assert.ok(!g.corp.established('security')); assert.ok(g.corp.reconciles());
});

test('the Military app is on the tablet for an arms dealer or once a company is registered, in the Businesses group, and the tablet keeps to its icon limit', async () => {
  const { tabletGroups, allApps, groupOf } = await import('../src/ui/tabletGroups.js');
  const g = newGame(206);
  assert.ok(!allApps(tabletGroups(g)).includes('Military'));
  g.war.found('Ironclad Company');
  const groups = tabletGroups(g);
  assert.ok(allApps(groups).includes('Military')); assert.equal(groupOf(groups, 'Military').id, 'Businesses');
  g.setFlag?.('arms_licence', true);
  for (const x of groups) assert.ok(x.apps.length <= 8, `${x.id} has ${x.apps.length} apps`);
  const g2 = newGame(207); g2.setFlag('arms_licence', true); assert.ok(allApps(tabletGroups(g2)).includes('Military'), 'an arms licence is enough to see it');
});
