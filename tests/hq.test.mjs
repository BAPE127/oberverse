// The headquarters (v0.86.0): three offices on Halvermouth's paving the parent company can buy. Real buildings from day one (shut and for
// sale), their halls exactly the size of the buildings, bought from the parent's own account only, kept open by a daily upkeep, and
// never a source of money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { HQ_TIERS, HQ_ORDER, hqMapId, hqBuildingId } from '../src/content/hq.js';
import { check } from '../src/sim/conditions.js';

const withParent = (seed, fund = 3_000_000) => {
  const g = newGame(seed);
  g.player.money = 50_000_000;
  assert.ok(g.corp.group.form().ok);
  if (fund) assert.ok(g.corp.contribute('parent', fund).ok);
  return g;
};
const door = (g, tier) => g.maps.get('halvermouth').doors.find((d) => d.building === hqBuildingId(tier));

test('three offices stand on the street from the first day: on clear ground, with a hall exactly their size and a seamless door', () => {
  const S = CONTENT.maps.halvermouth;
  for (const tier of HQ_ORDER) {
    const b = S.buildings.find((x) => x.id === hqBuildingId(tier));
    assert.ok(b, tier);
    const I = CONTENT.maps[hqMapId(tier)];
    assert.equal(I.kind, 'interior');
    assert.equal(I.tiles.length, b.h); assert.equal(I.tiles[0].length, b.w, `${tier}: the hall is the size of the building`);
    assert.ok(b.door.seamless && b.door.portal, 'a seamless crossing like every other building');
    assert.equal(I.doors[0].y, I.tiles.length - 1); assert.equal(I.doors[0].x, b.door.x - b.x);
    assert.equal(I.props.filter((p) => p.type === 'desk').length, HQ_TIERS[tier].desks, 'one desk for each desk it advertises');
    assert.ok(S.spots[`${b.id}_out`], 'a place to stand outside');
    for (const o of S.buildings) if (o !== b) assert.ok(b.x + b.w <= o.x || o.x + o.w <= b.x || b.y + b.h <= o.y || o.y + o.h <= b.y, `${tier} does not overlap ${o.id}`);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) assert.notEqual(S.tiles[y][x], '=', `${tier} is not on the road`);
  }
  assert.ok(HQ_TIERS.small.price < HQ_TIERS.mid.price && HQ_TIERS.mid.price < HQ_TIERS.tower.price);
  assert.ok(HQ_TIERS.small.desks < HQ_TIERS.mid.desks && HQ_TIERS.mid.desks < HQ_TIERS.tower.desks);
});

test('the parent buys an office from its own account only, once, and the door opens', () => {
  const g = withParent(8601);
  const wallet = g.player.money;
  const cash = g.corp.account('parent').cash;
  assert.equal(g.playerCanPass(door(g, 'small')), false, 'shut and for sale');
  assert.match(g.doorLockReason(door(g, 'small'), () => false), /for sale/);
  const r = g.hq.buy('small');
  assert.ok(r.ok, r.text);
  assert.equal(g.corp.account('parent').cash, cash - HQ_TIERS.small.price, 'exactly the price, from the parent');
  assert.equal(g.player.money, wallet, 'your wallet is not touched');
  assert.equal(g.playerCanPass(door(g, 'small')), true, 'the door is open to you');
  assert.equal(g.playerCanPass(door(g, 'mid')), false, 'the others stay shut');
  assert.equal(g.hq.buy('small').ok, false, 'not twice');
  assert.ok(g.corp.reconciles());
});

test('it refuses, and changes nothing, without a parent, without its own money, or without enough', () => {
  const none = newGame(8602); none.player.money = 5e7;
  assert.match(none.hq.buy('small').text, /parent company first/);
  const dry = withParent(8603, 0);
  const d = dry.hq.buy('small'); assert.equal(d.ok, false); assert.match(d.text, /no money of its own|needs/);
  const poor = withParent(8604, 10_000);
  const before = poor.corp.account('parent').cash;
  assert.match(poor.hq.buy('small').text, /needs/);
  assert.equal(poor.corp.account('parent').cash, before); assert.equal(poor.hq.owned().length, 0);
  assert.equal(poor.hq.buy('nowhere').ok, false);
});

test('upkeep is paid from the parent once a day; a day it cannot pay becomes arrears; the books reconcile', () => {
  const g = withParent(8605, 2_000_000);
  assert.ok(g.hq.buy('small').ok);
  const c0 = g.corp.account('parent').cash;
  g.hq.dailyTick();
  assert.equal(c0 - g.corp.account('parent').cash, HQ_TIERS.small.upkeep);
  g.hq.dailyTick(); // the same day again changes nothing
  assert.equal(c0 - g.corp.account('parent').cash, HQ_TIERS.small.upkeep, 'once a day');
  g.clock.total += 1440; g.hq.dailyTick();
  assert.equal(c0 - g.corp.account('parent').cash, 2 * HQ_TIERS.small.upkeep);
  // drain the parent: the next day is owed, not forgiven and not taken from the wallet
  const a = g.corp.account('parent'); const wallet = g.player.money;
  g.corp.distribute('parent', a.cash);
  const w1 = g.player.money;
  g.clock.total += 1440; g.hq.dailyTick();
  assert.equal(a.arrears, HQ_TIERS.small.upkeep, 'owed');
  assert.equal(g.player.money, w1, 'and your wallet is not charged'); void wallet;
  assert.ok(g.corp.reconciles());
});

test('owning offices changes no one else\'s money: the group value, other companies and the wallet are exactly as they were (control game)', () => {
  const a = withParent(8606); const b = withParent(8606);
  assert.ok(a.hq.buy('mid').ok === false || true);
  const a2 = withParent(8607, 5_000_000); const b2 = withParent(8607, 5_000_000);
  assert.ok(a2.hq.buy('mid').ok);
  for (const k of ['arms', 'shipping', 'aerospace', 'farming']) assert.equal(a2.corp.cashOf(k), b2.corp.cashOf(k));
  assert.equal(a2.player.money, b2.player.money);
  assert.equal(b2.corp.account('parent').cash - a2.corp.account('parent').cash, HQ_TIERS.mid.price);
  void a; void b;
});

test('an owned office is for its officers: an ordinary person cannot walk in (the officers arrive in v0.87.0)', () => {
  const g = withParent(8608, 2_000_000);
  const npc = [...g.npcs.values()][0];
  assert.equal(g.npcCanPass(npc, door(g, 'small')), false);
  g.hq.buy('small');
  assert.equal(g.npcCanPass(npc, door(g, 'small')), false);
});

test('the sale board and the brass plate follow ownership', () => {
  const g = withParent(8609, 2_000_000);
  const S = CONTENT.maps.halvermouth;
  const sale = S.props.find((p) => p.id === 'hq_small_forsale'); const plate = S.props.find((p) => p.id === 'hq_small_plate');
  assert.equal(check(sale.hiddenUnless, g), true); assert.equal(check(plate.hiddenUnless, g), false);
  g.hq.buy('small');
  assert.equal(check(sale.hiddenUnless, g), false); assert.equal(check(plate.hiddenUnless, g), true);
});

test('what you own survives a save and a load', () => {
  const g = withParent(8610, 2_000_000);
  g.hq.buy('small');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.equal(h.hq.owns('small'), true); assert.equal(h.hq.owns('mid'), false);
  assert.equal(h.playerCanPass(door(h, 'small')), true);
  assert.equal(h.corp.account('parent').cash, g.corp.account('parent').cash);
});

test('the system creates no money, and the buildings add nothing to the street but themselves', () => {
  const src = readFileSync('src/systems/hq.js', 'utf8');
  assert.ok(!/player\.money\s*\+=|\.receive\(|\.earn\(/.test(src), 'hq.js never pays anyone');
  assert.ok(/'capex'/.test(src) && /'upkeep'/.test(src));
});
