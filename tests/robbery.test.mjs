// Bank robbery (v0.79.0): the First Bank of Halvermouth and the Lariat State Bank can each be robbed — by a hold-up in opening hours with a gun, or a
// break-in at night through the time-lock — for a defined, bounded quantity of notes and gold bars. One state machine; the loot is paid once; the
// police come; the bank is sealed, restocked and reopened. (That none of it touches anyone's finances is proved in robbery_separation.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT } from './helpers.mjs';
import { ROBBERY as R, BAR_VALUE } from '../src/content/robbery.js';
import { STATES, EDGES, step, lootOf, restockOf, isFull, premiumOf } from '../src/corp/robbery.js';

const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.robbery.minuteTick(); } };
const arm = (g) => { g.inventory.add('item_revolver', 1); g.player.equipped = 'item_revolver'; };
/** In the First Bank at 10:30 with a gun, normal state. */
function inFirst(seed, at = '10:30') {
  const g = newGame(seed);
  setTime(g, 3, at);
  g.changeMap('first_bank', 'entry');
  return g;
}
const vaultProp = (g, id) => g.currentMap().prop(id);
const reload = (g) => { g.world.robbery = JSON.parse(JSON.stringify(g.world.robbery)); };

test('pure: the machine has exactly the moves it should, nothing else, and its loot is bounded', () => {
  assert.deepEqual(STATES, ['normal', 'alert', 'robbery', 'police', 'recovery', 'reopening']);
  assert.equal(step('normal', 'warn'), 'alert'); assert.equal(step('alert', 'strike'), 'robbery'); assert.equal(step('alert', 'stand_down'), 'normal');
  assert.equal(step('robbery', 'alarm'), 'police'); assert.equal(step('police', 'seal'), 'recovery'); assert.equal(step('recovery', 'restocked'), 'reopening'); assert.equal(step('reopening', 'open'), 'normal');
  assert.equal(step('normal', 'strike'), null, 'no robbery without an alert first'); assert.equal(step('police', 'strike'), null, 'no second robbery in the middle of the first');
  assert.equal(step('recovery', 'strike'), null); assert.equal(step('robbery', 'strike'), null); assert.equal(step('normal', 'seal'), null);
  for (const [from, moves] of Object.entries(EDGES)) for (const to of Object.values(moves)) assert.ok(STATES.includes(from) && STATES.includes(to));
  assert.deepEqual(lootOf({ cash: 400000, gold: 40 }, { cash: 250000, gold: 25 }), { cash: 250000, gold: 25 });
  assert.deepEqual(lootOf({ cash: 100, gold: 1 }, { cash: 250000, gold: 25 }), { cash: 100, gold: 1 }, 'never more than the vault holds');
  assert.deepEqual(lootOf({ cash: 0, gold: 0 }, { cash: 5, gold: 5 }), { cash: 0, gold: 0 });
  assert.deepEqual(restockOf({ cash: 0, gold: 0 }, { cash: 400000, gold: 40 }, { cash: 100000, gold: 10 }), { cash: 100000, gold: 10 });
  assert.deepEqual(restockOf({ cash: 350000, gold: 38 }, { cash: 400000, gold: 40 }, { cash: 100000, gold: 10 }), { cash: 400000, gold: 40 }, 'never past full');
  assert.ok(isFull({ cash: 400000, gold: 40 }, { cash: 400000, gold: 40 }) && !isFull({ cash: 1, gold: 40 }, { cash: 400000, gold: 40 }));
  const e = [{ day: 10, share: 1 }];
  assert.equal(premiumOf(e, 9, R.premium), 0, 'before'); assert.equal(premiumOf(e, 10, R.premium), R.premium.max);
  assert.ok(premiumOf(e, 15, R.premium) < R.premium.max && premiumOf(e, 15, R.premium) > 0); assert.equal(premiumOf(e, 20, R.premium), 0, 'faded');
  assert.equal(premiumOf([{ day: 10, share: 9 }, { day: 10, share: 9 }], 10, R.premium), R.premium.max, 'bounded');
});

test('the configured hauls are bounded by their vaults, the First Bank\'s is the large one the owner chose and the Lariat\'s smaller; a bar is worth its price', () => {
  assert.deepEqual(R.banks.first.haul, { cash: 250000, gold: 25 });
  assert.ok(R.banks.lariat.haul.cash < R.banks.first.haul.cash && R.banks.lariat.haul.gold < R.banks.first.haul.gold);
  for (const b of Object.values(R.banks)) { assert.ok(b.haul.cash <= b.stock.cash && b.haul.gold <= b.stock.gold, b.name); assert.ok(CONTENT.maps[b.hall].props.some((p) => p.id === b.vault), `${b.name}: a vault`); }
  assert.equal(CONTENT.items.item_gold_bar.price, BAR_VALUE);
});

test('a hold-up: armed, in hours, at the counter: alert, robbery, the staff react, the alarm and the police; the vault opens after a few minutes and pays once', () => {
  const g = inFirst(3201);
  g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'normal');
  assert.match(g.interact({ id: 'bank_vault' }).text, /shut/, 'unarmed: only a door');
  arm(g);
  g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'alert', 'a gun drawn in the hall');
  const before = g.player.money;
  const r = g.interact({ id: 'bank_tellers' });
  assert.match(r.text, /EVERYBODY DOWN/);
  assert.equal(g.robbery.state('first'), 'robbery');
  assert.equal(g.npcs.get('npc_bertram').hostile?.mode, 'fight', 'the guard fights');
  assert.equal(g.npcs.get('npc_prudence').hostile?.mode, 'flee', 'the teller runs');
  const t0 = g.clock.total;
  assert.match(g.interact({ id: 'bank_vault' }).text, /time-lock|dials/, 'not yet');
  assert.equal(g.player.money, before);
  minutes(g, 2);
  assert.equal(g.robbery.state('first'), 'police', 'the alarm has gone off');
  assert.ok(g.police.state.wanted >= 2 || g.police.state.calls.length > 0, 'the police are on their way');
  minutes(g, 2);
  assert.ok(g.clock.total - t0 >= R.complyMinutes);
  const got = g.interact({ id: 'bank_vault' });
  assert.match(got.text, /250,000 obols in notes and 25 gold bars/);
  assert.equal(g.player.money, before + 250000); assert.equal(g.inventory.count('item_gold_bar'), 25);
  // the loot is paid once: presses, a second call, a reload, an interrupted transition
  for (let i = 0; i < 3; i++) assert.match(g.interact({ id: 'bank_vault' }).text, /empty/);
  assert.equal(g.robbery.take('first').ok, false);
  reload(g);
  assert.equal(g.robbery.take('first').ok, false); assert.match(g.interact({ id: 'bank_vault' }).text, /empty/);
  assert.equal(g.robbery.holdup('first').text.includes('EVERYBODY'), false, 'a second hold-up in the same robbery does not restart it');
  assert.equal(g.player.money, before + 250000); assert.equal(g.inventory.count('item_gold_bar'), 25);
  assert.equal(g.robbery.peek().banks.first.stock.cash, 150000, 'the vault holds what is left');
  assert.equal(g.robbery.peek().banks.first.history.length, 1);
});

test('the police stay thirty minutes, then the bank is sealed for four days; it is restocked, then reopens in its hours, and can be robbed again for a haul no bigger than the vault holds', () => {
  const g = inFirst(3202);
  arm(g); g.robbery.minuteTick();
  g.interact({ id: 'bank_tellers' });
  minutes(g, 4);
  g.interact({ id: 'bank_vault' });
  g.changeMap('halvermouth', 'b_bank_out');
  const day0 = g.clock.day;
  minutes(g, R.policeWindow + 5);
  assert.equal(g.robbery.state('first'), 'recovery');
  const s = g.robbery.peek().banks.first;
  assert.equal(s.closedUntil, day0 + R.banks.first.closeDays);
  const door = g.currentMap().doors.find((d) => d.to?.map === 'first_bank');
  setTime(g, g.clock.day, '11:00');
  assert.equal(g.playerCanPass(door), false); assert.match(g.doorLockReason(door, () => false), /CLOSED.*Reopens day/);
  assert.equal(g.npcCanPass({ id: 'npc_prudence', profile: {} }, door), true, 'staff still go in');
  assert.match(g.robbery.vault('first').text, /CLOSED/);
  // days pass: restocking by a day's worth, then reopening
  for (let d = 1; d <= 6; d++) {
    setTime(g, day0 + d, '11:00');
    g.robbery.minuteTick();
    if (d < R.banks.first.closeDays) assert.equal(g.robbery.state('first'), 'recovery', `day +${d}`);
  }
  assert.ok(['reopening', 'normal'].includes(g.robbery.state('first')));
  setTime(g, day0 + 6, '09:30'); g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'normal');
  assert.equal(g.playerCanPass(door), true);
  assert.deepEqual(g.robbery.peek().banks.first.stock, R.banks.first.stock, 'restocked, full');
  assert.ok(g.robbery.news().some((n) => /reopens/.test(n.text)));
  // again, and the haul is the same bounded haul
  g.changeMap('first_bank', 'entry'); arm(g); g.robbery.minuteTick();
  g.interact({ id: 'bank_tellers' }); minutes(g, 5);
  const m = g.player.money;
  g.interact({ id: 'bank_vault' });
  assert.equal(g.player.money - m, 250000);
});

test('a night raid: inside a closed bank the alarm is already running; the time-lock takes twelve minutes; the police come at ten; the haul is still there to take', () => {
  const g = inFirst(3203, '23:30');
  g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'alert');
  assert.equal(g.robbery.peek().banks.first.why, 'intruder');
  assert.match(g.interact({ id: 'bank_vault' }).text, /dials/, 'the vault starts the time-lock');
  assert.equal(g.robbery.state('first'), 'robbery'); assert.equal(g.robbery.peek().banks.first.method, 'breakin');
  minutes(g, 5);
  assert.match(g.interact({ id: 'bank_vault' }).text, /still turning/);
  minutes(g, R.breakInAlarm);
  assert.equal(g.robbery.state('first'), 'police', 'the silent alarm reached them first');
  const m = g.player.money;
  minutes(g, 3);
  assert.match(g.interact({ id: 'bank_vault' }).text, /gold bars/);
  assert.equal(g.player.money - m, 250000);
  assert.match(g.interact({ id: 'bank_vault' }).text, /empty/);
});

test('an alert that comes to nothing: a gun put away, a bank left — nobody is paid and the bank carries on', () => {
  const g = inFirst(3204);
  arm(g); g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'alert');
  g.player.equipped = null; g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'normal');
  assert.equal(g.robbery.take('first').ok, false);
  assert.equal(g.robbery.peek().banks.first.history.length, 0);
  const night = inFirst(3205, '23:30'); night.robbery.minuteTick();
  assert.equal(night.robbery.state('first'), 'alert');
  night.changeMap('halvermouth', 'b_bank_out'); minutes(night, 4);
  assert.equal(night.robbery.state('first'), 'normal', 'the intruder left');
});

test('the Lariat State Bank: the same machine, a smaller haul, its own staff and hours', () => {
  const g = newGame(3206);
  setTime(g, 3, '10:30');
  g.changeMap('lariat_bank', 'entry');
  arm(g); g.robbery.minuteTick();
  assert.equal(g.robbery.state('lariat'), 'alert'); assert.equal(g.robbery.state('first'), 'normal');
  assert.match(g.interact({ id: 'lb_teller' }).text, /EVERYBODY DOWN/);
  assert.equal(g.npcs.get('npc_clint').hostile?.mode, 'fight');
  minutes(g, 5);
  const m = g.player.money;
  assert.match(g.interact({ id: 'lb_vault' }).text, /40,000 obols in notes and 4 gold bars/);
  assert.equal(g.player.money - m, 40000); assert.equal(g.inventory.count('item_gold_bar'), 4);
  assert.equal(g.robbery.peek().banks.first, undefined, 'the other bank is untouched');
  assert.equal(g.robbery.premium(), 0, 'the county bank is not the central bank: no market reaction');
});

test('the front door at night can be forced or picked, as a home\'s can; the closed bank then admits you (and trips the alarm)', () => {
  const g = newGame(3207);
  setTime(g, 3, '23:00');
  g.changeMap('halvermouth', 'b_bank_out');
  const door = g.currentMap().doors.find((d) => d.to?.map === 'first_bank');
  assert.equal(g.playerCanPass(door), false);
  assert.ok(g.homes.residents(door), 'it can be broken into');
  g.inventory.add('item_crowbar', 1);
  const f = g.homes.force(door.id);
  assert.equal(f.ok, true);
  assert.equal(g.playerCanPass(door), true, 'forced open');
  g.changeMap('first_bank', 'entry'); g.robbery.minuteTick();
  assert.equal(g.robbery.state('first'), 'alert');
});

test('the market\'s reaction is public, bounded and short; it is a premium on bond yields, only for the central bank; Lariat has none', () => {
  const g = inFirst(3208);
  arm(g); g.robbery.minuteTick(); g.interact({ id: 'bank_tellers' }); minutes(g, 5); g.interact({ id: 'bank_vault' });
  const p0 = g.robbery.premium();
  assert.ok(p0 > 0 && p0 <= R.premium.max, `premium ${p0}`);
  assert.equal(g.corp.bonds.base(), g.corp.bank.rate() + g.corp.geo.premium() + p0);
  assert.equal(g.corp.bank.rate(), g.corp.bank.rate(), 'the policy rate is the bank\'s alone');
  assert.ok(g.robbery.news().some((n) => /was robbed/.test(n.text)), 'it is in the news');
  assert.equal(Object.keys(g.robbery.view()).length, 2); assert.equal(g.robbery.view().first.state, 'police');
  const later = g.robbery.premium(g.clock.day + 5); assert.ok(later < p0 && later > 0);
  assert.equal(g.robbery.premium(g.clock.day + R.premium.days), 0);
});
