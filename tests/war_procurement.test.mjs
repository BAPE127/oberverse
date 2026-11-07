// Procurement (v0.103.4): a cart from outside suppliers becomes paid orders with a delivery day; nothing arrives early, a refusal changes nothing, a repeated click does nothing, a vehicle waits for a bay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, build, STAGE1, days } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { SUPPLIERS } from '../src/content/suppliers.js';
import { SUPPLIES, VEHICLES } from '../src/content/procurement.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const stock = (g, k) => g.war.stock()[k] || 0;
const purchases = (g) => Object.values(g.corp.account('security').months).reduce((a, m) => a + (m.out.purchase || 0), 0);

test('every supplier price is a multiple of a price the game already has, and every item belongs to a real supplier; no aircraft are sold', () => {
  const g = warGame(971); const M = g.war.suppliers();
  assert.equal(M.length, Object.keys(SUPPLIERS).length);
  for (const S of M) for (const it of S.items) {
    const base = it.kind === 'vehicle' ? VEHICLES[it.item].price : it.id.startsWith('supply:') ? SUPPLIES[it.item].price : it.base;
    assert.equal(it.price, Math.max(1, Math.round(base * S.mult)), `${S.name}: ${it.name}`); assert.ok(it.days >= 1 && it.max >= 1);
  }
  assert.ok(M.flatMap((s) => s.items).every((i) => !/aircraft|jet|fighter/i.test(i.name)), 'aircraft come from Aerospace only');
  assert.ok(M.every((s) => s.items.length > 0), 'no empty supplier');
});

test('placing a cart pays once from the company account, books it as a purchase, and puts nothing in the stores until the delivery day', () => {
  const g = warGame(972); build(g, STAGE1);
  const s = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); const un = s.items.find((i) => i.item === 'uniform');
  const lines = [{ supplier: s.id, id: un.id, qty: 50 }]; const cash = g.war.cash(); const before = purchases(g);
  const q = g.war.quoteCart(lines); assert.equal(q.total, 50 * un.price); assert.deepEqual(q.bad, []);
  const r = g.war.placeOrder(lines, 'cart-1'); assert.ok(r.ok, r.text);
  assert.equal(g.war.cash(), cash - 50 * un.price); assert.equal(purchases(g) - before, 50 * un.price, 'booked under purchases, not facilities');
  assert.equal(stock(g, 'supply:uniform'), 0, 'nothing is in the stores yet');
  const O = g.war.orders(); assert.equal(O.transit.length, 1); assert.equal(O.transit[0].state, 'transit'); assert.equal(O.transit[0].due, g.clock.day + SUPPLIERS.caldera_field_supply.days);
  days(g, SUPPLIERS.caldera_field_supply.days - 1); assert.equal(stock(g, 'supply:uniform'), 0, 'not before the due day');
  days(g, 1); assert.equal(stock(g, 'supply:uniform'), 50); assert.equal(g.war.orders().delivered.length, 1);
  days(g, 3); assert.equal(stock(g, 'supply:uniform'), 50, 'delivered once');
  assert.deepEqual(g.war.check(), []);
});

test('a repeated click (the same cart token) is refused and charges nothing; so is a cart the company cannot pay for, or one that asks too much, and a refusal changes nothing', () => {
  const g = warGame(973, { cash: 400_000 }); build(g, STAGE1);
  const s = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); const ra = s.items.find((i) => i.item === 'rations');
  const lines = [{ supplier: s.id, id: ra.id, qty: 100 }];
  const cash0 = g.war.cash(); assert.ok(g.war.placeOrder(lines, 'once').ok); const cash1 = g.war.cash();
  const again = g.war.placeOrder(lines, 'once'); assert.equal(again.ok, false); assert.equal(again.duplicate, true); assert.equal(g.war.cash(), cash1); assert.equal(g.war.orders().all.length, 1);
  const snap = () => JSON.stringify([g.war.state().company.orders, g.war.state().company.stock, g.war.cash()]);
  const before = snap();
  assert.equal(g.war.placeOrder([{ supplier: s.id, id: ra.id, qty: ra.max + 1 }], 't2').ok, false, 'more than the supplier ships'); assert.equal(snap(), before);
  assert.equal(g.war.placeOrder([{ supplier: s.id, id: 'vehicle:wolf', qty: 1 }], 't3').ok, false, 'a supplier that does not sell it'); assert.equal(snap(), before);
  assert.equal(g.war.placeOrder([{ supplier: s.id, id: ra.id, qty: 0 }], 't4').ok, false); assert.equal(g.war.placeOrder([], 't5').ok, false); assert.equal(snap(), before);
  const ost = g.war.suppliers().find((x) => x.id === 'ostmark_fahrzeugwerke'); const wolf = ost.items.find((i) => i.item === 'wolf');
  const dear = g.war.placeOrder([{ supplier: ost.id, id: wolf.id, qty: 20 }], 't6'); assert.equal(dear.ok, false, 'not enough money'); assert.match(dear.text, /holds/); assert.equal(snap(), before);
  assert.ok(g.war.cash() <= cash0 && g.war.cash() >= 0, 'never negative');
});

test('a cart with two suppliers is paid once and becomes two orders with their own delivery days', () => {
  const g = warGame(974); build(g, STAGE1);
  const A = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); const B = g.war.suppliers().find((x) => x.id === 'teshvar_industrial');
  const lines = [{ supplier: A.id, id: A.items.find((i) => i.item === 'medicine').id, qty: 10 }, { supplier: B.id, id: B.items.find((i) => i.item === 'optics').id, qty: 2 }];
  const q = g.war.quoteCart(lines); const cash = g.war.cash();
  const r = g.war.placeOrder(lines, 'two'); assert.ok(r.ok, r.text); assert.equal(r.orders.length, 2); assert.equal(g.war.cash(), cash - q.total);
  days(g, A.days); assert.equal(stock(g, 'supply:medicine'), 10); assert.equal(stock(g, 'supply:optics'), 0, 'the slower supplier has not delivered');
  days(g, B.days - A.days); assert.equal(stock(g, 'supply:optics'), 2);
});

test('weapons from other manufacturers arrive as bought arms stock; a vehicle waits at the gate when the motor pool is full, and is never lost or doubled', () => {
  const g = warGame(975, { cash: 20_000_000 }); buildAll(g, 2);
  const K = g.war.suppliers().find((x) => x.id === 'kingsfjord_ordnance'); const rk = K.items.find((i) => i.item === 'item_rpg_rocket' ) || K.items.find((i) => i.cat === 'heavy');
  assert.ok(g.war.placeOrder([{ supplier: K.id, id: rk.id, qty: 5 }], 'arms').ok); days(g, K.days);
  assert.equal(stock(g, rk.key), 5); assert.match(rk.key, /^arms:bought:|^supply:/);
  const O = g.war.suppliers().find((x) => x.id === 'ostmark_fahrzeugwerke'); const wolf = O.items.find((i) => i.item === 'wolf');
  const bays = g.war.housing().ground.total; assert.ok(bays >= 1 && bays < 20);
  assert.ok(g.war.placeOrder([{ supplier: O.id, id: wolf.id, qty: bays + 2 }], 'veh').ok);
  days(g, O.days); let arrived = () => g.war.equipment().filter((e) => e.type === 'wolf').length;
  assert.equal(arrived(), bays, 'as many as there are bays'); assert.equal(g.war.orders().pending.length, 1); assert.match(g.war.orders().pending[0].waitingFor[0], /2 × /);
  days(g, 3); assert.equal(arrived(), bays, 'it waits; nothing doubles');
  const x = g.war.equipment().find((e) => e.type === 'wolf'); x.status = 'destroyed'; // a bay comes free
  days(g, 1);
  const live = () => g.war.equipment().filter((e) => e.type === 'wolf' && e.status !== 'destroyed').length;
  assert.equal(g.war.equipment().filter((e) => e.type === 'wolf').length, bays + 1, 'one more arrived: the destroyed record, and the bays full again');
  assert.equal(live(), bays); assert.equal(g.war.orders().pending.length, 1, 'one is still waiting (bays + 2 ordered, bays + 1 delivered)');
  days(g, 4); assert.equal(g.war.equipment().filter((e) => e.type === 'wolf').length, bays + 1, 'with no free bay nothing more arrives and nothing doubles');
  assert.deepEqual(g.war.check(), []);
});

test('orders persist across a save, and the delivery still happens after loading; suppliers are read from content, not saved', () => {
  const g = warGame(976); build(g, STAGE1);
  const s = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); const f = s.items.find((i) => i.item === 'fuel');
  assert.ok(g.war.placeOrder([{ supplier: s.id, id: f.id, qty: 30 }], 'save').ok);
  const g2 = roundtrip(g); assert.equal(g2.war.orders().transit.length, 1); assert.equal(stock(g2, 'supply:fuel'), 0);
  assert.equal(g2.war.placeOrder([{ supplier: s.id, id: f.id, qty: 30 }], 'save').ok, false, 'the token survives the save: no duplicate after loading');
  days(g2, s.days); assert.equal(stock(g2, 'supply:fuel'), 30); assert.equal(g2.war.orders().delivered.length, 1);
  assert.ok(!JSON.stringify(g2.world.military).includes('Caldera Field Supply') || g2.war.orders().all[0].supplierName === 'Caldera Field Supply');
});
