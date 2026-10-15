// v0.24.0: Mason's Os build a shipyard; the custom shipbuilder (hulls, parts,
// class requirements, the parts store, building, cancelling, launching) and
// how custom ships behave afterwards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';

const owned = (money = 5_000_000) => {
  const g = newGame(31);
  setTime(g, 1, '09:00');
  g.player.money = money;
  assert.ok(g.logistics.buyCompany().ok);
  return g;
};
const withYard = (money) => {
  const g = owned(money);
  assert.ok(g.logistics.shipyard.commissionYard('port_millroad').ok);
  g.skipTime(6 * 1440);
  assert.equal(g.logistics.shipyard.yard('port_millroad').status, 'ready');
  return g;
};
const reload = (g) => { const g2 = new Game(CONTENT, { seed: 4 }); g2.loadState(JSON.parse(JSON.stringify(g.serialize()))); return g2; };
const reefer = (o = {}) => ({ kind: 'cargo', hull: 'h_freighter', components: ['c_diesel', 'c_nav_basic', 'c_hold_large', 'c_reefer', 'c_generator'], name: 'Frosty', appearance: { color: '#2a4a8a', trim: '#e8c35a' }, port: 'port_millroad', ...o });

test('Mason\'s Os build the shipyard: quoted, paid once, takes days, persists, and only at a big enough port', () => {
  const g = owned();
  const Y = g.logistics.shipyard;
  assert.match(Y.yardQuote('port_sund').reasons.join(), /too small/, 'a basic harbour is too small');
  const q = Y.yardQuote('port_millroad');
  assert.ok(q.ok && q.cost > 0 && q.days >= 2);
  const m0 = g.player.money;
  assert.ok(Y.commissionYard('port_millroad').ok);
  assert.equal(m0 - g.player.money, q.cost);
  assert.equal(Y.commissionYard('port_millroad').ok, false, 'no second charge');
  assert.equal(Y.yard('port_millroad').status, 'building', 'not instant');
  assert.ok(g.getFlag('shipyard_home_building'));
  // through a save, mid-build
  const g2 = reload(g);
  const Y2 = g2.logistics.shipyard;
  assert.equal(Y2.yard('port_millroad').status, 'building');
  g2.skipTime(q.days * 1440 + 60);
  assert.equal(Y2.yard('port_millroad').status, 'ready');
  assert.ok(g2.getFlag('shipyard_home_ready'));
  const done = g2.logistics.state.reports.filter((r) => /finished the shipyard/.test(r.text)).length;
  g2.skipTime(1440);
  assert.equal(g2.logistics.state.reports.filter((r) => /finished the shipyard/.test(r.text)).length, done, 'completes once');
  // Mason's goodwill makes it cheaper
  const g3 = owned();
  g3.construction.addGoodwill(30);
  assert.ok(g3.logistics.shipyard.yardQuote('port_millroad').cost < q.cost);
});

test('Mason offers the shipyard in conversation once you own the company', () => {
  const g = owned();
  const topic = CONTENT.dialogues.dlg_mason.topics.find((t) => t.id === 't_mason_shipyard');
  assert.ok(topic);
  const s = new DialogueSession(g, 'npc_mason');
  s.start();
  const node = s.choose('topic:t_mason_shipyard');
  assert.equal(node.action?.type, 'panel');
  assert.equal(node.action.opts.tab, 'Shipyard');
});

test('custom builds need a working yard; class requirements are enforced by the simulation', () => {
  const g = owned();
  const Y = g.logistics.shipyard;
  assert.match(Y.validate(reefer()).reasons.join(), /no working shipyard/);
  const g2 = withYard();
  const Y2 = g2.logistics.shipyard;
  assert.deepEqual(Y2.validate(reefer()).reasons, []);
  // incompatible parts, missing requirements, limits
  const r = Y2.validate(reefer({ components: ['c_sails', 'c_cannon'] })).reasons.join(' | ');
  assert.match(r, /modern hull can't take sail/);
  assert.match(r, /cargo ships can't take it/);
  assert.match(r, /needs navigation/);
  assert.match(r, /needs cargo/);
  assert.match(Y2.validate(reefer({ components: ['c_diesel', 'c_nav_basic', 'c_reefer', 'c_reefer', 'c_reefer', 'c_bulk_hold'] })).reasons.join(), /power/);
  assert.match(Y2.validate(reefer({ hull: 'h_coaster', components: ['c_diesel', 'c_nav_basic', 'c_bulk_hold', 'c_bulk_hold'] })).reasons.join(), /t of parts/);
  assert.match(Y2.validate(reefer({ components: ['c_topsails'] })).reasons.join(), /Sails and rigging|sail/);
  // warships need weapons; mounts are limited
  const w = Y2.validate({ kind: 'warship', hull: 'h_patrol', components: ['c_diesel', 'c_nav_basic'], port: 'port_millroad' }).reasons.join();
  assert.match(w, /weapons/);
  assert.match(Y2.validate({ kind: 'warship', hull: 'h_patrol', components: ['c_diesel', 'c_nav_basic', 'c_missiles', 'c_missiles', 'c_deck_gun'], port: 'port_millroad' }).reasons.join(), /mounts/);
  // futuristic: the licence and an advanced port's yard
  const f = Y2.validate({ kind: 'cargo', hull: 'h_hydrofoil', components: ['c_fusion_drive', 'c_fusion_core', 'c_nav_basic', 'c_hold_small'], port: 'port_millroad' }).reasons.join();
  assert.match(f, /Licence/);
  assert.match(f, /advanced port/);
});

test('parts are bought into the store, consumed once by a build, and returned if it is cancelled', () => {
  const g = withYard();
  const Y = g.logistics.shipyard;
  const d = reefer();
  assert.match(Y.commission(d).text, /Missing parts/);
  const before = g.player.money;
  assert.ok(Y.buyMissing(d).ok);
  const partsCost = d.components.reduce((a, id) => a + CONTENT.logistics.components[id].price, 0);
  assert.equal(before - g.player.money, partsCost);
  assert.equal(Y.validate(d).missing.length, 0);
  const v = Y.validate(d);
  const m1 = g.player.money;
  const r = Y.commission(d);
  assert.ok(r.ok, r.text);
  assert.equal(m1 - g.player.money, v.cost.now, 'hull and labour, once');
  for (const id of d.components) assert.equal(Y.state.stock[id], 0, `${id} consumed`);
  assert.match(Y.commission(d).text, /busy|Missing/, 'one slip, and no parts to reuse');
  // cancel: parts back, half refunded
  const m2 = g.player.money;
  assert.ok(Y.cancel(r.build.id).ok);
  assert.equal(g.player.money - m2, Math.round(v.cost.now * CONTENT.logistics.shipyard.cancelRefund));
  for (const id of d.components) assert.equal(Y.state.stock[id], 1, `${id} back in the store`);
  assert.equal(Y.cancel(r.build.id).ok, false, 'cancelled once');
  assert.equal(g.logistics.vessels().length, 1, 'no ship');
});

test('a build launches exactly one ship whose numbers and look come from its parts — and survive a reload', () => {
  const g = withYard();
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const d = reefer();
  Y.buyMissing(d);
  const spec = Y.validate(d).stats;
  const r = Y.commission(d);
  assert.ok(r.ok);
  // through a save, mid-build
  const g2 = reload(g);
  const L2 = g2.logistics;
  assert.equal(L2.shipyard.state.builds[0].status, 'building');
  g2.skipTime(Math.ceil((r.build.end - g2.clock.total) / 1440 + 1) * 1440);
  const ships = L2.vessels().filter((v) => v.name === 'Frosty');
  assert.equal(ships.length, 1, 'exactly one');
  const v = ships[0];
  const st = L2.stats(v);
  assert.equal(st.capacity, 60 + 30);
  assert.ok(st.tags.includes('reefer'), 'the reefer hold makes it a reefer');
  assert.equal(st.capacity, spec.capacity);
  assert.equal(L2.model(v.model).look.color, '#2a4a8a');
  assert.deepEqual(L2.model(v.model).look.parts, ['funnel', 'hatch', 'reefer']);
  g2.skipTime(2 * 1440);
  assert.equal(L2.vessels().filter((x) => x.name === 'Frosty').length, 1, 'never launched twice');
  // a reload reproduces it exactly
  const g3 = reload(g2);
  const v3 = g3.logistics.vessel(v.id);
  assert.deepEqual(g3.logistics.stats(v3), st);
  assert.deepEqual(g3.logistics.model(v3.model).look, L2.model(v.model).look);
  // and it works like any other ship: it can take a reefer contract
  const c = { id: 'cR', type: 'reefer', client: 'cl_lantern_fish', units: 40, from: 'port_millroad', to: 'port_sund', km: 1800, pay: 5000, deadline: g3.clock.total + 9000, offered: 1, expiresDay: 99, status: 'available' };
  g3.logistics.state.contracts.push(c);
  assert.ok(g3.logistics.quote('cR', v3.id).ok, g3.logistics.quote('cR', v3.id).reasons.join());
});

test('the design\'s order and paint change the ship\'s look, not its rules', () => {
  const g = withYard();
  const Y = g.logistics.shipyard;
  const a = Y.compute(reefer());
  const b = Y.compute(reefer({ components: ['c_reefer', 'c_generator', 'c_hold_large', 'c_nav_basic', 'c_diesel'], appearance: { color: '#8a3a32', trim: '#e8e2d4' } }));
  assert.notDeepEqual(a.look, b.look);
  assert.equal(a.capacity, b.capacity);
  assert.equal(a.speed, b.speed);
});

test('futuristic ships: the licence, an advanced yard, and the dearest builds', () => {
  const g = withYard(10_000_000);
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  assert.equal(Y.buyComponent('c_fusion_drive').ok, false, 'advanced parts need the licence');
  assert.ok(Y.buyTech('advanced').ok);
  assert.equal(Y.buyTech('advanced').ok, false, 'once');
  assert.ok(Lg.buyPort('port_meridian').ok, 'an advanced port');
  assert.ok(Y.commissionYard('port_meridian').ok);
  g.skipTime(8 * 1440);
  const d = { kind: 'cargo', hull: 'h_hydrofoil', components: ['c_fusion_drive', 'c_fusion_core', 'c_nav_advanced', 'c_specialist_bay', 'c_hold_large'], name: 'Wavedancer', appearance: { color: '#d8dee6', trim: '#4a8ae8' }, port: 'port_meridian' };
  const v = Y.validate(d);
  assert.deepEqual(v.reasons, []);
  const plain = Y.validate(reefer());
  assert.ok(v.cost.now + v.cost.parts > 2 * (plain.cost.now + plain.cost.parts), 'much dearer');
  assert.ok(v.stats.speed > plain.stats.speed && v.stats.tags.includes('advanced'));
});

test('content: hulls and parts validate', async () => {
  const { validateContent } = await import('../tools/validate-content.mjs');
  assert.deepEqual(validateContent(CONTENT).errors, []);
  const L = CONTENT.logistics;
  const bad = { ...CONTENT, logistics: { ...L, hulls: { ...L.hulls, h_bad: { ...L.hulls.h_coaster, slots: 1 } } } };
  assert.ok(validateContent(bad).errors.some((e) => e.includes('h_bad')), 'a hull that can\'t fit its own requirements is caught');
});
