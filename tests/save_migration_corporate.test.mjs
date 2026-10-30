// Save migration (brief 17.2, v0.80.0): a save made before any of the corporate update — four businesses, a wallet, shares — loads, keeps every
// identity, balance, holding and record, and is NOT given a loan, a parent, a manager, a bond, a share, a milestone's worth of anything, or a
// bank robbery. Nothing is consolidated. What the new systems need is made the first time it is used, and grants nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, CONTENT } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8'));
const loadRaw = (raw, seed = 1) => {
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), JSON.stringify(raw));
  const g = new Game(CONTENT, { seed });
  const res = sm.load('slot1', g);
  assert.ok(res.ok, JSON.stringify(res.errors));
  return { g, sm, res };
};
const days = (g, n) => { for (let i = 0; i < n * 1440; i++) { g.clock.total += 1; g.minuteTick(); } };
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);

test('a v0.59.0 save loads with every balance, share and business as it was, and nothing from the corporate update granted', () => {
  const raw = fixture();
  raw.state.world.oil.sharesOwned = 7; raw.state.world.oil.costBasis = 410;
  raw.state.world.dairy.sharesOwned = 3;
  raw.state.world.aero.market.sharesOwned = 100; raw.state.world.aero.market.costBasis = 8400;
  const { g } = loadRaw(raw);
  assert.equal(g.player.money, raw.state.player.money, 'the wallet');
  assert.equal(g.oil.state.sharesOwned, 7); assert.equal(g.oil.state.costBasis, 410); assert.equal(g.dairy.state.sharesOwned, 3);
  assert.equal(g.aero.state.market.sharesOwned, 100); assert.equal(g.aero.state.market.costBasis, 8400);
  for (const f of ['arms_licence', 'owns_aw1', 'owns_shipping', 'owns_aerospace']) assert.equal(Boolean(g.getFlag(f)), true, `${f}`);
  for (const id of ['arms', 'shipping', 'aerospace']) assert.equal(g.corp.established(id), true, `${id} is still owned`);
  assert.deepEqual(g.arms.ownedIds(), ['aw1']); assert.equal(g.logistics.owned, true); assert.equal(g.aero.owned, true);
  assert.equal(g.logistics.state.boughtDay, raw.state.world.logistics.boughtDay); assert.equal(g.aero.state.boughtDay, raw.state.world.aero.boughtDay);
  for (const id of ['arms', 'shipping', 'aerospace']) assert.equal(g.corp.nameOf(id), g.corp.defaultName(id), `${id} keeps the name it always had (nobody has named it yet)`);
  // the corporate state: nothing but the accounts and identities the earlier corporate releases already made
  const c = g.world.corp;
  for (const k of ['parent', 'ownership', 'loans', 'transfers', 'lending', 'business', 'geo', 'bonds', 'credit', 'sovereign', 'milestones', 'management', 'personnel']) assert.equal(c?.[k], undefined, `no ${k} is made by loading`);
  assert.equal(g.world.robbery, undefined, 'no robbery');
  assert.equal(g.corp.group.members().length, 0); assert.equal(g.corp.lending.owed(), 0); assert.equal(g.corp.business.totalOwed(), 0);
  assert.deepEqual(g.corp.exchange.trades(), []); assert.deepEqual(g.corp.exchange.watched(), []);
  assert.equal(g.corp.bonds.lots().length, 0); assert.equal(g.corp.sovereign.lots().length, 0); assert.equal(g.corp.credit.lots().length, 0);
  assert.equal(g.corp.personnel.peek(), null); assert.equal(g.corp.management.peek(), null);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.equal(g.corp.group.isSub(id), false, `${id} is not consolidated`);
  assert.equal(g.corp.account('arms').funded, false, 'a business that spent the wallet still does');
});

test('playing on for ten weeks from that save: the new systems start up, hand out nothing, and nothing the player owned is lost', () => {
  const raw = fixture();
  raw.state.world.oil.sharesOwned = 7; raw.state.world.aero.market.sharesOwned = 100; raw.state.world.aero.market.costBasis = 8400;
  const { g } = loadRaw(raw, 5);
  const wallet0 = g.player.money;
  days(g, 70);
  assert.equal(g.oil.state.sharesOwned, 7, 'shares are not sold, split or added'); assert.equal(g.aero.state.market.sharesOwned, 100);
  assert.ok(g.corp.state.generated?.length > 0, 'the wider world was made');
  assert.ok(g.corp.state.geo && g.world.market, 'and the wars recorded');
  // nothing was lent, bought, hired or formed on the player's behalf
  assert.equal(g.corp.state.parent, undefined); assert.equal(g.corp.lending.loans(true).length, 0); assert.equal(g.corp.business.loans(null, true).length, 0);
  assert.equal(g.corp.bonds.lots().length, 0); assert.equal(g.corp.sovereign.lots().length, 0);
  assert.equal(g.corp.personnel.peek()?.staff && Object.keys(g.corp.personnel.peek().staff).length, undefined, 'nobody hired');
  assert.equal(g.corp.management.peek(), null, 'no manager decided anything');
  assert.deepEqual(g.corp.exchange.trades(), []);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.equal(g.corp.group.isSub(id), false);
  // the wallet moved only by what the game does (dividends, wages, running costs); it is not a gift of any size
  assert.ok(Math.abs(g.player.money - wallet0) < wallet0 * 0.2, `the wallet ${wallet0} → ${g.player.money}`);
  assert.ok(g.corp.reconciles());
  assert.ok(total(g) > 0);
  // the one milestone the records already support is earned from them, not granted; no cash comes with it
  const earned = Object.keys(g.corp.state.milestones?.earned || {});
  assert.ok(earned.every((id) => ['four'].includes(id)), `only what the records say: ${earned}`);
});

test('the migrated save saves and loads again to exactly itself, and the oldest schema still loads', () => {
  const { g, sm } = loadRaw(fixture(), 7);
  days(g, 3);
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.equal(JSON.stringify(h.world.corp), JSON.stringify(g.world.corp));
  assert.equal(h.player.money, g.player.money);
  const old = JSON.parse(readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8'));
  const sm2 = new SaveManager(new MemoryStorage()); sm2.storage.setItem(sm2.key('slot1'), JSON.stringify(old));
  const k = new Game(CONTENT, { seed: 1 });
  const r = sm2.load('slot1', k);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(k.corp.state.parent, undefined);
});
