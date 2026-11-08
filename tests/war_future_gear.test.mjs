// The future gear (v0.103.8): tier 3 and 4 weapons and armour eras 3 and 4 exist for every class, are sold only after the research, equip from the stores one to a pair of hands, and reach the battle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { warGame, buildAll, days } from './war_helpers.mjs';
import { FUTURE_WEAPONS, FUTURE_STATS, FUTURE_LOOKS } from '../src/content/futureArms.js';
import { CLASSES, TROOP_CLASSES, ARMOUR } from '../src/content/troops.js';
import { WAR_RESEARCH } from '../src/content/warResearch.js';
import { WEAPONS } from '../src/content/battle.js';
import { SUPPLIES } from '../src/content/procurement.js';
import { buildSetup } from '../src/battle/setup.js';

const stock = (g, k) => g.war.stock()[k] || 0;
const finish = (g, id) => { assert.ok(g.war.startResearch(id).ok, id); days(g, WAR_RESEARCH[id].days + 1); };
const buy = (g, item, qty) => { for (const s of g.war.suppliers()) { const it = s.items.find((i) => i.item === item); if (it) { const r = g.war.placeOrder([{ supplier: s.id, id: it.id, qty }], `buy-${item}-${Math.random()}`); assert.ok(r.ok, r.text); days(g, s.days + 1); return it; } } assert.fail(`no supplier sells ${item}`); };
const rig = (seed) => { const g = warGame(seed, { cash: 400_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 40); g.war.buySupply('rations', 200); return g; };

test('every troop class has a tier 3 and a tier 4 weapon that is a real item with battle stats and a sprite, and the tiers climb', () => {
  const g = newGame(1701);
  for (const id of TROOP_CLASSES) {
    const K = CLASSES[id]; assert.ok(K.tiers[3] && K.tiers[4], `${id} has tiers 3 and 4`);
    for (const t of [3, 4]) { const w = FUTURE_WEAPONS[K.tiers[t]]; assert.ok(w, `${K.tiers[t]} is a future weapon`); assert.equal(w.tier, t, `${w.id} is tier ${t}`); assert.ok(w.cls.includes(id)); assert.ok(g.content.items[w.id]?.weapon, `${w.id} is an item`); assert.ok(WEAPONS[w.id] && FUTURE_STATS[w.id] && FUTURE_LOOKS[w.id]); }
    const dmg = (item) => (WEAPONS[item]?.damage || 0); assert.ok(dmg(K.tiers[3]) >= dmg(K.tiers[2]) * 0.9 && dmg(K.tiers[4]) > dmg(K.tiers[3]), `${id}: tier 4 hits harder than tier 3`);
  }
  assert.ok(ARMOUR[3].protection > ARMOUR[2].protection && ARMOUR[4].protection > ARMOUR[3].protection && ARMOUR[4].speed < 1, 'armour climbs, and the power armour is slow');
  for (const k of ['hardsuit', 'power_armour']) assert.ok(SUPPLIES[k] && ARMOUR[k === 'hardsuit' ? 3 : 4].supply === `supply:${k}`);
});

test('the future weapons are for sale only after their research, and a tier is refused until then', () => {
  const g = rig(1702); const sells = (item) => g.war.suppliers().some((s) => s.items.some((i) => i.item === item));
  assert.ok(!sells('item_pulse_rifle') && !sells('item_plasma_rifle') && !sells('hardsuit') && !sells('power_armour'), 'nothing future is for sale at first');
  assert.match(g.war.setTier('rifleman', 3).text, /need research/); assert.ok(!g.war.setTier('marksman', 4).ok);
  finish(g, 'energy_cells'); finish(g, 'pulse_weapons'); assert.ok(sells('item_pulse_rifle') && sells('item_plasma_pistol') && !sells('item_plasma_rifle'), 'tier 3 only');
  finish(g, 'hardsuit'); assert.ok(sells('hardsuit') && !sells('power_armour'));
  finish(g, 'fusion_cores'); finish(g, 'plasma_weapons'); finish(g, 'power_armour'); assert.ok(sells('item_plasma_rifle') && sells('item_lance_cannon') && sells('power_armour'), 'tier 4 after its research');
  assert.ok(g.war.suppliers().find((s) => s.id === 'kingsfjord_ordnance').items.some((i) => i.cat === 'energy'));
});

test('a squad equips tier 3 and tier 4 from what it bought: one weapon to one pair of hands, armour back to the stores when it is changed', () => {
  const g = rig(1703); for (const id of ['energy_cells', 'pulse_weapons', 'hardsuit', 'fusion_cores', 'plasma_weapons', 'power_armour']) finish(g, id);
  for (let i = 0; i < 4; i++) { let r = g.war.hire('rifleman'); for (let k = 0; !r.ok && k < 20; k++) { days(g, 1); r = g.war.hire('rifleman'); } assert.ok(r.ok, r.text); } days(g, 6);
  buy(g, 'item_pulse_rifle', 4); assert.equal(stock(g, 'arms:bought:item_pulse_rifle'), 4);
  assert.ok(g.war.setTier('rifleman', 3).ok); const men = g.war.people().filter((p) => p.role === 'rifleman'); assert.ok(men.every((p) => p.weapon === 'arms:bought:item_pulse_rifle'), 'all hold a pulse rifle'); assert.equal(stock(g, 'arms:bought:item_pulse_rifle'), 0, 'taken from the stores');
  buy(g, 'item_plasma_rifle', 2); assert.ok(g.war.setTier('rifleman', 4).ok);
  const plasma = men.filter((p) => g.war.people().find((q) => q.id === p.id).weapon === 'arms:bought:item_plasma_rifle').length; assert.equal(plasma, 2, 'only as many as were bought'); assert.equal(stock(g, 'arms:bought:item_pulse_rifle'), 2, 'the pulse rifles they put down are back in the stores');
  buy(g, 'hardsuit', 3); const a = men[0].id; assert.ok(g.war.armour(a, 3).ok); assert.equal(stock(g, 'supply:hardsuit'), 2); buy(g, 'power_armour', 1); assert.ok(g.war.armour(a, 4).ok); assert.equal(stock(g, 'supply:hardsuit'), 3, 'the hardsuit came back'); assert.equal(stock(g, 'supply:power_armour'), 0);
  assert.ok(g.war.armour(a, 1).ok); assert.equal(stock(g, 'supply:power_armour'), 1, 'and the power armour'); assert.deepEqual(g.war.check(), []);
});

test('the battle reads them: a tier 4 soldier in power armour carries the plasma weapon, wears the era and is slower; a hardsuit is stronger than a plate carrier', () => {
  const people = [{ id: 'a', name: 'A', role: 'rifleman', tier: 4, armour: 4, armed: true }, { id: 'b', name: 'B', role: 'rifleman', tier: 2, armour: 2, armed: true }, { id: 'c', name: 'C', role: 'anti_tank', tier: 3, armour: 3, armed: true }];
  const S = buildSetup({ key: 'k', eng: { id: 'e', goal: 'hold', enemy: { troops: 4, armour: 0, air: 0, skill: 1 }, recipe: 'fields', biome: 'rural', style: 'ostmark' }, people, vehicles: [] });
  const u = (id) => S.units.find((x) => x.id === id);
  assert.equal(u('a').weapon, 'item_plasma_rifle'); assert.equal(u('a').era, 4); assert.ok(u('a').speed < u('b').speed, 'power armour is slow'); assert.equal(u('b').weapon, 'item_assault_rifle'); assert.equal(u('c').weapon, 'item_plasma_launcher');
  assert.ok(u('a').prot > u('c').prot && u('c').prot > u('b').prot, 'armour climbs'); for (const id of ['a', 'c']) assert.ok(WEAPONS[u(id).weapon].damage > 0);
});

test('the future vehicles: every one has a sprite and sane figures, the bought ones are for sale and the built ones can be ordered only after their research', async () => {
  const { VEHICLES } = await import('../src/content/procurement.js'); const { SPEC } = await import('../src/engine/drawFleet.js'); const { MODELS, feeOf } = await import('../src/content/production.js');
  const future = Object.values(VEHICLES).filter((v) => v.era >= 3); assert.ok(future.length >= 10, 'a good range of future vehicles'); assert.ok(future.some((v) => v.era === 4) && future.some((v) => v.class === 'tank') && future.some((v) => v.class === 'helicopter'));
  for (const v of future) { assert.ok(SPEC[v.id], `${v.id} has a sprite spec`); for (const k of ['armour', 'firepower', 'speed', 'capacity']) assert.ok(v[k] >= 0 && v[k] <= 5, `${v.id} ${k}`); if (v.source === 'works') { assert.ok(MODELS[v.id], `${v.id} is a works model`); assert.ok(feeOf(v.id) > 0 && v.price <= 2_600_000, `${v.id}: a fee above nothing and on the Aerospace ladder`); } else assert.ok(!MODELS[v.id]); }
  const g = rig(1704); const sells = (id) => g.war.suppliers().some((s) => s.items.some((i) => i.item === id));
  assert.ok(!['ghost', 'lance', 'dronecar', 'skimmer', 'longshot', 'warden', 'core'].some(sells), 'nothing future for sale at first'); assert.match(g.war.order('aegis', 1).text, /needs research/); assert.match(g.war.order('shade', 1).text, /needs research/);
  finish(g, 'energy_cells'); finish(g, 'hover_drives'); assert.ok(['ghost', 'lance', 'dronecar', 'skimmer', 'longshot', 'core'].every(sells) && !sells('warden'), 'era 3 for sale'); assert.ok(g.war.order('aegis', 1).ok); assert.match(g.war.order('citadel', 1).text, /needs research/);
  finish(g, 'pulse_weapons'); finish(g, 'hardsuit'); finish(g, 'fusion_cores'); finish(g, 'heavy_hover'); assert.ok(sells('warden') && g.war.order('citadel', 1).ok && g.war.order('tempest', 1).ok);
});

test('a researched hover tank is built on the company\'s own line from the parts it buys, and parks in the motor pool', () => {
  const g = rig(1705); finish(g, 'energy_cells'); finish(g, 'hover_drives'); for (let i = 0; i < 6; i++) g.war.hire('technician');
  for (const [item, qty] of [['plate', 14], ['optics', 2], ['hardpoint', 2], ['core', 1]]) { if (item === 'core') buy(g, 'core', qty); else assert.ok(g.war.buySupply(item, qty).ok, item); }
  assert.ok(g.war.order('aegis', 1).ok); days(g, 12);
  const tank = g.war.equipment().find((e) => e.type === 'aegis'); assert.ok(tank, 'the Aegis rolled out'); assert.equal(tank.kind, 'vehicle'); assert.equal(tank.source, 'works'); assert.deepEqual(g.war.check(), []);
});

test('no route into the stores skips the research: direct purchase of a closed tier\'s supplies and vehicles, and the supply link, all refuse until it is done', () => {
  const g = rig(1706); const before = JSON.stringify(g.war.stock());
  for (const id of ['hardsuit', 'power_armour', 'core']) { const r = g.war.buySupply(id, 1); assert.ok(!r.ok && /needs research/.test(r.text), `${id}: ${r.text}`); }
  for (const id of ['ghost', 'lance', 'warden', 'skimmer']) { const r = g.war.buyVehicle(id); assert.ok(!r.ok && /needs research/.test(r.text), `${id}: ${r.text}`); }
  for (const item of ['item_pulse_rifle', 'item_plasma_rifle']) assert.ok(!g.war.setSupplyLevel(item, 5).ok, `the supply link keeps only what the Arms works make: ${item}`); assert.ok(!g.war.buyElsewhere('item_pulse_rifle', 5).ok);
  assert.equal(JSON.stringify(g.war.stock()), before, 'nothing came in'); assert.equal(g.war.equipment().length, 0);
  finish(g, 'energy_cells'); finish(g, 'hover_drives'); assert.ok(g.war.buySupply('core', 1).ok && g.war.buyVehicle('ghost').ok, 'open after the research'); assert.ok(!g.war.buyVehicle('warden').ok, 'era 4 still closed');
});
