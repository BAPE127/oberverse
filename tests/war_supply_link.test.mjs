// The supply link between the Arms company and the war company (v0.103.2): standing levels shipped free from the works' cages (crates opened as needed), the shortfall bought from other
// manufacturers, and a dedicated works that retools its idle stations to what the company is short of.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, cageGoods, days } from './war_helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { LINK } from '../src/content/procurement.js';
import { CRATE } from '../src/content/arms.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const money = (g) => JSON.stringify({ wallet: g.player.money, corp: g.corp.state.accounts });
const held = (g, item) => Object.entries(g.war.stock()).filter(([k]) => k.endsWith(`:${item}`)).reduce((a, [, q]) => a + q, 0);

test('a standing level is filled free each morning from the export cage: loose items first, then crates opened for the purpose, and what is left of an opened crate stays in the cage', () => {
  const g = warGame(901); buildAll(g, 2);
  const cage = cageGoods(g, 'aw1', { item_assault_rifle: 3, item_crate_assault: 2, item_ap_steel: 9 });
  assert.ok(!g.war.setSupplyLevel('item_ap_steel', 5).ok, 'a part is not a weapon');
  assert.ok(!g.war.setSupplyLevel('item_assault_rifle', -1).ok); assert.ok(!g.war.setSupplyLevel('item_assault_rifle', LINK.max + 1).ok);
  assert.ok(g.war.setSupplyLevel('item_assault_rifle', 6).ok);
  const before = money(g);
  days(g, 1);
  assert.equal(money(g), before, 'free: no money moves');
  assert.equal(held(g, 'item_assault_rifle'), 6);
  assert.equal(g.war.stock()['arms:aw1:item_assault_rifle'], 6);
  // 3 loose + 3 from one crate: the crate is opened, its other two stay as singles, one crate is left
  assert.equal(cage.items.item_assault_rifle, 2); assert.equal(cage.items.item_crate_assault, 1);
  assert.equal(cage.items.item_ap_steel, 9, 'parts are never touched');
  days(g, 1); assert.equal(held(g, 'item_assault_rifle'), 6, 'a level that is met takes no more');
  assert.ok(g.war.setSupplyLevel('item_assault_rifle', 14).ok);
  days(g, 1); assert.equal(held(g, 'item_assault_rifle'), 13, 'it takes what the cage holds (13 in all: 3 loose and two crates) and no more'); assert.equal(g.world.containers.ct_aw1_cage.items.item_assault_rifle || 0, 0);
  assert.deepEqual(g.war.check(), []);
  assert.ok(g.war.transfers().some((t) => t.by === 'supply link'), 'and the trail records it, never as money');
  const g2 = roundtrip(g); assert.equal(g2.war.supplyLink().rows.find((r) => r.item === 'item_assault_rifle').want, 14);
});

test('a manual transfer from the cage can take crates too, the way the works actually makes them', () => {
  const g = warGame(902); buildAll(g, 2); cageGoods(g, 'aw1', { item_crate_smg: 1 });
  assert.equal(g.war.offers().arms.find((x) => x.item === 'item_smg').have, CRATE.units);
  assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_smg', qty: 2 }).ok);
  assert.equal(g.war.stock()['arms:aw1:item_smg'], 2); assert.equal(g.world.containers.ct_aw1_cage.items.item_smg, CRATE.units - 2);
});

test('the shortfall can be bought from other manufacturers: dearer than the works, paid by the company, arrives in two days, and is never sent back', () => {
  const g = warGame(903); buildAll(g, 2); g.setFlag('owns_aw1', true);
  assert.ok(!g.war.buyElsewhere('item_rpg_rocket', 5).ok, 'there is no level for it yet');
  assert.ok(g.war.setSupplyLevel('item_rpg_rocket', 10).ok);
  const V = g.war.supplyLink().rows.find((r) => r.item === 'item_rpg_rocket');
  assert.equal(V.unit, Math.round(g.arms.value('item_rpg_rocket') * LINK.markup)); assert.ok(V.unit > g.arms.value('item_rpg_rocket'));
  assert.equal(V.state, 'idle'); assert.equal(V.buyQty, 10);
  assert.ok(!g.war.buyElsewhere('item_rpg_rocket', 11).ok, 'never past the level');
  const cash = g.war.cash();
  const r = g.war.buyElsewhere('item_rpg_rocket', 6); assert.ok(r.ok, r.text);
  assert.equal(g.war.cash(), cash - 6 * V.unit); assert.equal(g.war.supplyLink().rows.find((x) => x.item === 'item_rpg_rocket').inbound, 6);
  assert.ok(!g.war.buyElsewhere('item_rpg_rocket', 5).ok, 'what is on its way counts toward the level');
  assert.equal(held(g, 'item_rpg_rocket'), 0);
  days(g, 1); assert.equal(held(g, 'item_rpg_rocket'), 0, 'not yet');
  days(g, 1); assert.equal(held(g, 'item_rpg_rocket'), 6); assert.equal(g.war.stock()['arms:bought:item_rpg_rocket'], 6);
  assert.ok(!g.war.giveBack({ key: 'arms:bought:item_rpg_rocket', qty: 1 }).ok, 'it came from no works of yours');
  assert.equal(g.war.cash(), cash - 6 * V.unit, 'and it arriving costs nothing more');
  assert.deepEqual(g.war.check(), []);
  const poor = warGame(904, { cash: 80_000 }); buildAll(poor, 1); poor.setFlag('owns_aw1', true); poor.war.setSupplyLevel('item_missile_cruise', 5);
  assert.ok(!poor.war.buyElsewhere('item_missile_cruise', 5).ok, 'the company pays from its own account only');
});

test('a dedicated works retools its idle stations to what the company is short of, and goes back when the level is met', () => {
  const g = warGame(905); buildAll(g, 2);
  runCommand(g, 'works aw1'); runCommand(g, 'stations');
  g.arms.state.research.done.assault = true; g.arms.state.research.done.smg = true;
  const st = g.arms.place('aw1', 'item_st_assembly', 10, 5).entity;
  assert.ok(g.arms.setRecipe(st.id, 'pistol').ok);
  assert.ok(g.war.setSupplyLevel('item_assault_rifle', 8).ok);
  days(g, 1); assert.equal(g.arms.recipeOf(st).single, 'item_pistol', 'a works that is not dedicated is left alone');
  assert.ok(g.war.setSupplyWorks('aw1', true).ok);
  days(g, 1);
  assert.equal(g.arms.recipeOf(st).single, 'item_assault_rifle', 'it now makes what the company is short of'); assert.equal(st.forCompany, 'pistol');
  assert.equal(g.war.supplyLink().rows.find((r) => r.item === 'item_assault_rifle').makers, 1);
  st.progress = 5; // mid-unit: the level is met, but the unit in hand is finished first
  cageGoods(g, 'aw1', { item_assault_rifle: 8 });
  days(g, 1); assert.equal(g.arms.recipeOf(st).single, 'item_assault_rifle'); st.progress = 0;
  days(g, 1); assert.equal(g.arms.recipeOf(st).single, 'item_pistol', 'and back to its own work'); assert.equal(st.forCompany, undefined);
  assert.ok(g.war.setSupplyLevel('item_smg', 5).ok); days(g, 1); assert.equal(g.arms.recipeOf(st).single, 'item_smg');
  assert.ok(g.war.setSupplyWorks('aw1', false).ok); assert.equal(g.arms.recipeOf(st).single, 'item_pistol', 'switching it off puts the station back');
});
