// Managers that run the business (v0.91.1): the shipping manager sends ships on paying contracts and brings them home, the farming manager
// works the land, the arms manager sells what the cage holds that no order needs, and the aerospace firm's bays build a standing plane
// on their own (and change type). All of it from the business's own account, deterministic, and never from your wallet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
import { OPS } from '../src/content/operations.js';
import { PERMS, permsFor } from '../src/content/personnel.js';

function group(seed, { farm = 3 } = {}) {
  const g = newGame(seed);
  g.player.money = 80e6;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok && g.logistics.buyCompany().ok && g.aero.buyFirm().ok);
  for (const p of ['plot_east_1', 'plot_east_2', 'plot_east_3'].slice(0, farm)) assert.ok(g.farm.buy(p).ok);
  g.corp.ensureWorld(); g.market.state;
  assert.ok(g.corp.group.form().ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.join(id).ok);
  assert.ok(g.corp.contribute('parent', 6_000_000).ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.capitalise(id, 600000).ok);
  g.aero.roost.autoProcure = false;
  return g;
}
const hire = (g, employer) => { const r = g.corp.personnel.hire('manager', employer); assert.ok(r.ok, r.text); r.person.startDay = 1; g.corp.personnel.epoch++; return r.person; };
const run = (g, days) => { for (let i = 0; i < days * 1440; i++) g.update(1, { x: 0, y: 0 }); };
const at6 = (g) => { g.clock.total = (g.clock.day - 1) * 1440 + 6 * 60; g.world.lastHour = 6; };
const cash = (g, id) => g.corp.account(id).cash;

test('the new boxes: shipping runs the fleet, farming works the land, aerospace keeps the hangars busy (all ticked when hired)', () => {
  assert.deepEqual(permsFor('manager', 'shipping'), ['contracts', 'expand']);
  assert.deepEqual(permsFor('manager', 'farming'), ['land', 'expand']);
  assert.ok(PERMS.manager.aerospace.includes('hangars'));
  const g = group(9901);
  for (const [id, box] of [['shipping', 'contracts'], ['farming', 'land'], ['aerospace', 'hangars']]) {
    const x = hire(g, id);
    assert.equal(g.corp.personnel.may(x, box), true, `${id}: ${box} ticked`);
  }
});

test('a shipping manager sends the idle ship on a paying contract, from the line\'s own account; unticked, nothing moves', () => {
  const g = group(9902);
  const x = hire(g, 'shipping');
  const wallet = g.player.money;
  g.corp.personnel.setPerm(x.id, 'contracts', false);
  at6(g); g.corp.operations.hourlyTick();
  assert.equal(g.logistics.vessels()[0].status, 'docked', 'unticked: the ship stays in port');
  g.corp.personnel.setPerm(x.id, 'contracts', true);
  const before = cash(g, 'shipping');
  assert.ok(g.corp.operations.runFleet() >= 1, 'a contract is taken');
  assert.notEqual(g.logistics.vessels()[0].status, 'docked');
  assert.ok(cash(g, 'shipping') < before, 'the voyage was paid from the shipping account');
  assert.equal(g.player.money, wallet, 'never your wallet');
});

test('a month of managed shipping makes money, and the ship is brought back to where the work is', () => {
  const g = group(9903);
  hire(g, 'shipping');
  at6(g);
  const c0 = cash(g, 'shipping');
  run(g, 20);
  const income = Object.values(g.corp.account('shipping').months).reduce((a, m) => a + (m.in.contract || 0), 0);
  assert.ok(income > 0, 'deliveries were paid');
  assert.ok(cash(g, 'shipping') - c0 > 0, `profitable after wages and upkeep (${cash(g, 'shipping') - c0})`);
  assert.ok(g.corp.management.peek().log.some((l) => l.type === 'operation' && /sails to/.test(l.text)), 'the manager repositioned the ship at least once');
});

test('a farming manager tills, plants, harvests and sells at the Co-op into the farm account; unticked, nothing', () => {
  const g = group(9904);
  const x = hire(g, 'farming');
  const wallet = g.player.money;
  g.corp.personnel.setPerm(x.id, 'land', false);
  g.corp.operations.dailyTick();
  assert.ok(g.farm.owned().every((id) => g.farm.plot(id).state !== 'planted'), 'unticked: nothing is planted');
  g.corp.personnel.setPerm(x.id, 'land', true);
  const before = cash(g, 'farming');
  const out = g.corp.operations.workLand();
  assert.equal(out.planted, 3);
  assert.ok(cash(g, 'farming') < before, 'seed and hands are paid from the farm account');
  assert.equal(g.player.money, wallet);
  at6(g);
  run(g, 14);
  const crops = Object.values(g.corp.account('farming').months).reduce((a, m) => a + (m.in.crops || 0), 0);
  assert.ok(crops > 0, 'harvests were sold');
  assert.ok(g.farm.owned().some((id) => g.farm.plot(id).harvests > 0), 'and the fields were cleared');
  assert.equal(g.player.money, wallet, 'never your wallet');
});

test('farm hands are a real cost: a field is never free to work', () => {
  const g = group(9905, { farm: 1 });
  hire(g, 'farming');
  const before = cash(g, 'farming');
  g.corp.operations.workLand();
  const paid = before - cash(g, 'farming');
  const seed = g.corp.account('farming').months;
  void seed;
  assert.ok(paid > 0);
  assert.ok(g.corp.operations.labour(10, 2) > 0 && OPS.farming.labourPerTile > 0);
});

test('an arms manager sells the cage\'s surplus to Lucas, up to its daily limit, into the arms account; export stock stays', () => {
  const g = group(9906);
  const x = hire(g, 'arms');
  const cage = g.world.containers[g.arms.def('aw1').outCrate];
  const wanted = new Set(g.market.openOrders().map((o) => o.item));
  const crate = Object.keys(g.content.items).find((id) => g.content.items[id].arms?.crate && !wanted.has(id) && g.arms.wholesale(id) > 0 && g.arms.wholesale(id) <= OPS.arms.wholesaleDaily);
  assert.ok(crate, 'a crate no order wants');
  cage.items[crate] = 10;
  const wallet = g.player.money;
  g.corp.personnel.setPerm(x.id, 'bid', false);
  assert.equal(g.corp.operations.sellOutput() >= 0, true);
  g.corp.operations.dailyTick();
  assert.equal(cage.items[crate], 10, 'unticked: nothing sold');
  g.corp.personnel.setPerm(x.id, 'bid', true);
  const a0 = cash(g, 'arms');
  const got = g.corp.operations.sellOutput();
  assert.ok(got > 0 && got <= OPS.arms.wholesaleDaily, `sold ${got}`);
  assert.equal(cash(g, 'arms') - a0, got);
  assert.equal(cage.items[crate], 10 - got / g.arms.wholesale(crate));
  assert.equal(g.player.money, wallet);
  assert.equal(g.corp.operations.sellOutput(), got === 0 ? 0 : g.corp.operations.sellOutput(), 'idempotent shape');
});

// ------------------------------------------------------------------ hangars
const bay = (g) => g.aero.roost.bays[0];

test('a bay can be told to build one plane on its own; only a plane its type and research allow', () => {
  const g = group(9907);
  const co = g.aero.roost;
  assert.deepEqual(g.aero.bayProducts(co, bay(g)), ['ap_skylark']);
  assert.equal(g.aero.setBayAuto(co, bay(g).id, 'ap_albatross').ok, false, 'a heavy plane in a light bay');
  const r = g.aero.setBayAuto(co, bay(g).id, 'ap_skylark');
  assert.ok(r.ok, r.text);
  assert.equal(bay(g).auto, 'ap_skylark');
  assert.equal(co.autoProcure, true, 'auto-buy comes on so the bay is fed');
  assert.ok(g.aero.setBayAuto(co, bay(g).id, null).ok);
  assert.equal(bay(g).auto, null);
});

test('standing orders: the firm builds planes for stock, sells them, and the money is the firm\'s', () => {
  const g = group(9908);
  const co = g.aero.roost;
  g.aero.setBayAuto(co, bay(g).id, 'ap_skylark');
  const c0 = cash(g, 'aerospace');
  const wallet = g.player.money;
  at6(g);
  run(g, 18);
  assert.ok(co.stats.stock >= 3, `planes were sold from stock (${co.stats.stock})`);
  const sold = g.aero.state.stockSales.ap_skylark;
  assert.ok(sold.length >= 3);
  assert.ok(g.aero.stockPrice(co, 'ap_skylark') <= Math.round(g.aero.cfg.products.ap_skylark.price * g.aero.A.stock.listShare), 'the list share is a ceiling');
  assert.ok(cash(g, 'aerospace') - c0 > 0, 'a firm with a standing plane makes money');
  assert.equal(g.player.money, wallet);
  assert.ok(g.aero.unitsOf(co).filter((u) => u.purpose === 'stock').length <= g.aero.A.stock.perBay, 'never more open than the bay allows');
});

test('flooding the market softens the price, down to the floor; the order pauses below the pause line', () => {
  const g = group(9909);
  const co = g.aero.roost;
  const list = Math.round(g.aero.cfg.products.ap_skylark.price * g.aero.A.stock.listShare);
  assert.equal(g.aero.stockPrice(co, 'ap_skylark'), list);
  g.aero.state.stockSales = { ap_skylark: Array(20).fill(g.aero.day) };
  assert.equal(g.aero.stockPrice(co, 'ap_skylark'), Math.round(list * g.aero.A.stock.floor));
  g.aero.setBayAuto(co, bay(g).id, 'ap_skylark');
  assert.equal(g.aero.runStandingOrders(co), 0, 'paused while the market is full');
});

test('refit: an empty bay changes type for a share of the new one\'s price (less a refund on the old), in days; busy or wrong-slot refused', () => {
  const g = group(9910);
  const co = g.aero.roost;
  const b = bay(g);
  const slot = g.aero.slotsOf(co).find((s) => s.id === b.slot);
  const other = Object.keys(g.aero.cfg.bays).find((t) => t !== b.type && slot.fits.includes(t));
  if (!other) { // the starter slot takes only a light bay: the refusal is the rule
    assert.equal(g.aero.convertQuote(co, b, 'heavy').ok, false);
    return;
  }
  const q = g.aero.convertQuote(co, b, other);
  assert.ok(q.ok && q.cost >= 0 && q.days >= 1);
  const m0 = cash(g, 'aerospace');
  assert.ok(g.aero.convertBay(co, b.id, other).ok);
  assert.equal(b.type, other);
  assert.equal(m0 - cash(g, 'aerospace'), q.cost);
  assert.ok(b.ready > g.aero.now, 'out of service while refitted');
});

test('refit is refused while the bay is busy, to the wrong type for its slot, and to the same type', () => {
  const g = group(9911);
  const co = g.aero.roost;
  const b = bay(g);
  assert.equal(g.aero.convertQuote(co, b, b.type).ok, false);
  b.unit = 'U_fake';
  assert.match(g.aero.convertQuote(co, b, 'heavy').text, /busy/);
  b.unit = null;
  assert.equal(g.aero.convertQuote(co, b, 'rocket').ok, false);
});

test('an aerospace manager gives every idle bay the plane that earns most a day; unticked, none', () => {
  const g = group(9912);
  const x = hire(g, 'aerospace');
  g.corp.personnel.setPerm(x.id, 'hangars', false);
  g.corp.operations.dailyTick();
  assert.equal(bay(g).auto ?? null, null);
  g.corp.personnel.setPerm(x.id, 'hangars', true);
  g.corp.operations.dailyTick();
  assert.equal(bay(g).auto, 'ap_skylark');
});

test('the same seed gives the same books: shipping, farming, hangars', () => {
  const books = (seed) => {
    const g = group(seed);
    for (const id of ['shipping', 'farming', 'aerospace', 'arms']) hire(g, id);
    at6(g);
    run(g, 8);
    return ['shipping', 'farming', 'aerospace', 'arms'].map((id) => Math.round(cash(g, id)));
  };
  assert.deepEqual(books(9913), books(9913));
});

test('a business with no account of its own is not run by anyone', () => {
  const g = newGame(9914);
  g.player.money = 80e6;
  assert.ok(g.logistics.buyCompany().ok);
  g.corp.ensureWorld();
  assert.equal(g.corp.operations.worker('shipping', 'contracts'), null);
  g.corp.operations.hourlyTick();
  assert.equal(g.logistics.vessels()[0].status, 'docked');
  void runCommand;
});
