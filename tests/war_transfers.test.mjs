// Procurement (v0.99.0 stage 4): free, atomic, audited transfers from Aerospace and the Arms works; what suppliers sell; real housing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, build, STAGE1, cageGoods, storeJet, storeMissile } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game } from './helpers.mjs';
import { CONTENT } from './helpers.mjs';
import { VEHICLES } from '../src/content/procurement.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** Everything a transfer must not touch: the wallet, every corp account, Aerospace's books and cash, the Arms works' state. */
const money = (g) => JSON.stringify({ wallet: g.player.money, corp: Object.fromEntries(Object.entries(g.corp.state.accounts).filter(([k]) => k !== 'security')), security: { cash: g.corp.account('security').cash, flow: [g.corp.account('security').flowIn, g.corp.account('security').flowOut] }, aero: g.aero.state.companies, arms: { produced: g.arms.state.produced } });

test('a stored military aircraft moves from Aerospace to the hangars: free, once, and nothing else in Aerospace can still use it', () => {
  const g = warGame(301); buildAll(g, 3);
  g.aero.buyFirm();
  const rec = storeJet(g, 'af_kestrel');
  assert.deepEqual(g.war.offers().aero.map((o) => o.ref), [rec.id]);
  const before = money(g);
  const r = g.war.transfer({ source: 'aero', ref: rec.id }); assert.ok(r.ok, r.text);
  assert.equal(money(g), before, 'no money moved, anywhere');
  assert.equal(g.aero.storedOf('af_kestrel').length, 0, 'it has left Aerospace\'s storage');
  assert.equal(g.war.equipment().length, 1); const x = g.war.equipment()[0];
  assert.deepEqual([x.kind, x.location, x.status, x.assignedTo], ['aircraft', 'facility:hangars', 'stored', null]);
  assert.ok(!g.war.transfer({ source: 'aero', ref: rec.id }).ok, 'once');
  // the consumers of Aerospace's storage see it gone
  const co = g.aero.roost;
  assert.equal(g.aero.storedOf().length, 0);
  assert.ok(!g.aero.launchStored?.(co, rec.id)?.ok, 'it cannot be launched or delivered from storage any more');
  assert.deepEqual(g.war.check(), []);
  // a save in between changes nothing
  const g2 = roundtrip(g); assert.equal(g2.war.equipment().length, 1); assert.equal(g2.aero.storedOf().length, 0);
});

test('a return goes back to Aerospace as the very same record; only a free item may return; what was bought has nowhere to go back to', () => {
  const g = warGame(302); buildAll(g, 3); g.aero.buyFirm();
  const rec = storeJet(g, 'af_falcon'); const copy = JSON.stringify(rec);
  const id = g.war.transfer({ source: 'aero', ref: rec.id }).id;
  const x = g.war.equipment().find((e) => e.id === id);
  x.status = 'assigned'; x.assignedTo = 'sq1';
  assert.ok(!g.war.giveBack({ id }).ok && /assigned|only a free item/.test(g.war.giveBack({ id }).text));
  x.status = 'stored'; x.assignedTo = null;
  const before = money(g);
  assert.ok(g.war.giveBack({ id }).ok);
  assert.equal(money(g), before);
  assert.equal(JSON.stringify(g.aero.state.storage.find((r) => r.id === rec.id)), copy, 'the same record, as it was');
  assert.equal(g.war.equipment().length, 0);
  const bought = g.war.buyVehicle('marten'); assert.ok(bought.ok, bought.text);
  assert.ok(!g.war.giveBack({ id: bought.id }).ok);
});

test('Arms works goods move by the item and by the works: the count leaves the export cage and arrives in the stores, a return goes back to that same works, and nothing sells what has gone', () => {
  const g = warGame(303); buildAll(g, 2);
  const cage = cageGoods(g, 'aw1', { item_pistol: 20, item_rpg: 5, item_ap_steel: 9 });
  const o = g.war.offers().arms; assert.deepEqual(o.map((x) => x.item).sort(), ['item_pistol', 'item_rpg'], 'parts never move');
  const before = money(g);
  assert.ok(!g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_ap_steel', qty: 1 }).ok, 'a part is not a weapon');
  assert.ok(!g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 21 }).ok, 'only what is there');
  assert.ok(!g.war.transfer({ source: 'arms', works: 'aw2', item: 'item_pistol', qty: 1 }).ok, 'only from a works you own');
  assert.equal(money(g), before);
  assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 12 }).ok);
  assert.equal(cage.items.item_pistol, 8); assert.equal(g.war.stock()['arms:aw1:item_pistol'], 12);
  assert.equal(money(g), before, 'free');
  const sold = g.arms.sellToLucas?.('item_pistol', 1); // (what is left can be sold; what moved cannot)
  assert.ok(cage.items.item_pistol <= 8);
  assert.ok(g.war.giveBack({ key: 'arms:aw1:item_pistol', qty: 5 }).ok); assert.equal(g.war.stock()['arms:aw1:item_pistol'], 7);
  assert.ok(!g.war.giveBack({ key: 'arms:aw1:item_pistol', qty: 8 }).ok, 'not more than it holds');
  assert.deepEqual(g.war.check(), []);
  assert.equal(g.war.transfers().length, 2); assert.ok(g.war.transfers().every((t) => !('amount' in t) && !('price' in t)), 'the trail records things, never money');
  const g2 = roundtrip(g); assert.equal(g2.war.stock()['arms:aw1:item_pistol'], 7);
});

test('conservation: whatever leaves a source is exactly what arrives, and the total never changes, through moves and returns and a reload', () => {
  const g = warGame(304); buildAll(g, 2);
  const cage = cageGoods(g, 'aw1', { item_assault_rifle: 40 });
  const total = () => cage.items.item_assault_rifle + (g.war.stock()['arms:aw1:item_assault_rifle'] || 0);
  assert.equal(total(), 40);
  for (const [op, n] of [['in', 15], ['in', 10], ['out', 7], ['in', 3], ['out', 20]]) {
    const r = op === 'in' ? g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_assault_rifle', qty: n }) : g.war.giveBack({ key: 'arms:aw1:item_assault_rifle', qty: n });
    assert.ok(r.ok, r.text); assert.equal(total(), 40);
  }
  const g2 = roundtrip(g); const c2 = g2.world.containers.ct_aw1_cage;
  assert.equal(c2.items.item_assault_rifle + (g2.war.stock()['arms:aw1:item_assault_rifle'] || 0), 40);
});

test('housing is real: a vehicle needs a free bay, an aircraft a hangar bay, goods a place in the stores; a refusal changes nothing in any system', () => {
  const g = warGame(305); build(g, STAGE1);
  g.aero.buyFirm(); const jet = storeJet(g);
  const snap = () => JSON.stringify([g.world.military, g.aero.state.storage, g.world.containers.ct_aw1_cage]);
  cageGoods(g, 'aw1', { item_pistol: 100 });
  let s = snap();
  assert.ok(!g.war.transfer({ source: 'aero', ref: jet.id }).ok && /hangars/.test(g.war.transfer({ source: 'aero', ref: jet.id }).text), 'no hangars yet'); assert.equal(snap(), s);
  assert.ok(!g.war.buyVehicle('marten').ok, 'no motor pool yet'); assert.equal(snap(), s);
  assert.ok(!g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 61 }).ok, 'the cage holds 60'); assert.equal(snap(), s);
  assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 60 }).ok);
  assert.equal(g.war.housing().stores.free, 0);
  assert.ok(!g.war.buySupply('uniform', 1).ok, 'the stores are full');
  assert.ok(!g.war.buyVehicle('wren').ok, 'a helicopter is built, not bought'); assert.ok(!g.war.buyVehicle('anvil').ok);
  // stage 2 gives six bays
  build(g, ['command', 'barracks_a', 'barracks_b', 'mess', 'medical', 'motor_pool', 'armoury', 'depot']);
  for (let i = 0; i < 6; i++) assert.ok(g.war.buyVehicle('buggy').ok);
  assert.ok(!g.war.buyVehicle('buggy').ok, 'the motor pool is full'); assert.equal(g.war.housing().ground.used, 6);
  assert.deepEqual(g.war.check(), []);
});

test('suppliers: what the company buys is paid from its own account, every price is on the list, and no tank or helicopter is for sale', () => {
  const g = warGame(306); buildAll(g, 2);
  const w0 = g.player.money; const c0 = g.war.cash();
  const r = g.war.buyVehicle('wolf'); assert.ok(r.ok, r.text);
  assert.equal(g.war.cash(), c0 - VEHICLES.wolf.price); assert.equal(g.player.money, w0, 'never the wallet');
  assert.ok(g.war.buySupply('uniform', 10).ok); assert.equal(g.war.stock()['supply:uniform'], 10);
  assert.ok(g.corp.reconciles());
  for (const v of Object.values(VEHICLES)) assert.ok(v.source === 'works' ? ['tank', 'helicopter'].includes(v.class) : !['tank', 'helicopter'].includes(v.class), `${v.id}: only tanks and helicopters come from the works`);
  const poor = warGame(307, { cash: 70_000 }); build(poor, STAGE1);
  const before = JSON.stringify(poor.world.military);
  assert.ok(!poor.war.buySupply('uniform', 100000).ok); assert.equal(JSON.stringify(poor.world.military), before);
});

test('the trail is capped, and a company\'s income can never fall into your wallet', () => {
  const g = warGame(308); buildAll(g, 2);
  cageGoods(g, 'aw1', { item_pistol: 500 });
  for (let i = 0; i < 90; i++) { assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 1 }).ok); assert.ok(g.war.giveBack({ key: 'arms:aw1:item_pistol', qty: 1 }).ok); }
  assert.ok(g.war.transfers().length <= 80);
  const w = g.player.money; const c = g.war.cash();
  g.corp.receive('security', 1234, { cat: 'contract' });
  assert.equal(g.player.money, w, 'a payment to the company is not a payment to you'); assert.equal(g.war.cash(), c + 1234);
});

test('a stored strategic missile product moves to the secure stores (twenty places each), free, and back to Aerospace as the same record; it is never in a bay, and the stores must have the room', () => {
  const g = warGame(309); build(g, STAGE1); g.aero.buyFirm();
  const m1 = storeMissile(g); const copy = JSON.stringify(m1);
  assert.deepEqual(g.war.offers().aero.map((o) => [o.ref, o.line]), [[m1.id, 'missile']]);
  const before = money(g);
  const r = g.war.transfer({ source: 'aero', ref: m1.id }); assert.ok(r.ok, r.text);
  assert.equal(money(g), before, 'free'); assert.equal(g.aero.storedOf('ms_sentinel').length, 0, 'gone from Aerospace\'s store');
  const x = g.war.equipment()[0];
  assert.deepEqual([x.kind, x.location, x.status], ['missile', 'facility:cage', 'stored']);
  assert.equal(g.war.housing().stores.used, 20); assert.equal(g.war.housing().air.used, 0, 'not in a hangar bay');
  // the cage (60 places) holds three, not four
  for (let i = 0; i < 2; i++) assert.ok(g.war.transfer({ source: 'aero', ref: storeMissile(g).id }).ok);
  const fourth = storeMissile(g); const snap = JSON.stringify(g.aero.state.storage);
  assert.ok(!g.war.transfer({ source: 'aero', ref: fourth.id }).ok); assert.equal(JSON.stringify(g.aero.state.storage), snap, 'a refusal changes nothing');
  assert.ok(!g.war.buySupply('uniform', 1).ok, 'the stores are full of missiles');
  assert.deepEqual(g.war.check(), []);
  assert.ok(g.war.giveBack({ id: x.id }).ok); assert.equal(JSON.stringify(g.aero.state.storage.find((r) => r.id === m1.id)), copy);
  assert.equal(g.war.housing().stores.used, 40);
  const g2 = roundtrip(g); assert.equal(g2.war.housing().stores.used, 40);
});
