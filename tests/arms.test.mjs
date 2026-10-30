// The arms trade (v0.13.0): Lucas Eastrise and Pipecreek Armory, the pitch and
// the licence, Mill Road Yards, arms works with workstations, generated staff,
// research, parts orders, wholesale to Lucas, saves.
import { INCOME } from '../src/content/income.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, besideNpc, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { isProtected, WRATH } from '../src/systems/combat.js';
import { check } from '../src/sim/conditions.js';
import { runCommand } from '../src/game/debugCommands.js';
import { findPath } from '../src/world/pathfinding.js';

const fresh = (seed = 1, hhmm = '10:00') => {
  const g = newGame(seed);
  setTime(g, 1, hhmm);
  noImpulses(g);
  return g;
};
/** A licensed player who owns Yard 1 Works, standing in it. */
const works = (seed = 1, hhmm = '08:00') => {
  const g = fresh(seed, hhmm);
  runCommand(g, 'works aw1');
  g.changeMap('aw1', 'entry');
  return g;
};
const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };

test('Lucas Eastrise: imported, protected, from the supplied photo; Pipecreek Armory is his', () => {
  const l = CONTENT.characters.npc_lucas;
  assert.equal(l.origin, 'imported');
  assert.ok(l.appearance.portrait?.startsWith('data:image/'));
  assert.equal(l.appearance.pattern, 'pinstripe', 'the brown pinstripe jacket');
  for (const t of ['sleazy', 'creepy']) assert.ok(l.personality.traits.includes(t), t);
  assert.equal(l.wrath.theme, 'arms');
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_lucas')));
  assert.equal(CONTENT.shops.shop_rook.name, 'Pipecreek Armory');
  assert.equal(CONTENT.shops.shop_rook.owner, 'npc_lucas');
  assert.equal(CONTENT.maps.gun_shop.name, 'Pipecreek Armory');
  const rants = CONTENT.dialogues.dlg_lucas.topics.find((t) => t.id === 't_lucas_takes');
  assert.ok(rants.variants.length >= 10, 'a deep well of wild takes');
});

test('buying a gun from Lucas starts his pitch; accepting it leads to the licence, and the licence to the Yards', () => {
  const g = fresh(2, '11:00');
  g.player.money = 2000;
  const lucas = g.npcs.get('npc_lucas');
  const pitch = CONTENT.dialogues.dlg_lucas.topics.find((t) => t.id === 't_lucas_pitch');
  assert.ok(!check(pitch.if, g, lucas));
  g.buy('shop_rook', 'item_ammo_9mm');
  assert.ok(!check(pitch.if, g, lucas), 'ammo isn\'t a gun');
  g.buy('shop_rook', 'item_pistol');
  assert.ok(check(pitch.if, g, lucas));
  g.applyEffects(pitch.choices.find((c) => c.id === 'c_lucas_yes').effects, lucas);
  const lic = CONTENT.dialogues.dlg_lucas.topics.find((t) => t.id === 't_lucas_licence');
  assert.ok(check(lic.if, g, lucas));
  const sign = g.maps.get('yards').props.find((p) => p.id === 'yd_aw1_sale');
  g.changeMap('yards', 'aw1_door_out');
  assert.match(g.interact({ kind: 'prop', id: sign.id }).text, /LICENCE REQUIRED/);
  const before = g.player.money;
  g.applyEffects(lic.choices.find((c) => c.id === 'c_lucas_licence_pay').effects, lucas);
  assert.equal(g.player.money, before - 500);
  assert.ok(g.arms.licensed());
  assert.equal(g.interact({ kind: 'prop', id: sign.id }).type, 'choices');
  g.player.money = 3000;
  assert.ok(g.arms.buy('aw1').ok);
  const door = g.maps.get('yards').doors.find((d) => d.to?.map === 'aw1');
  assert.ok(g.playerCanPass(door));
});

test('Mill Road Yards: through the gate at the west end of Mill Road; arms works are bigger than calculator warehouses', () => {
  const g = newGame();
  const hv = g.maps.get('halvermouth');
  const gate = hv.doors.find((d) => d.to?.map === 'yards');
  assert.ok(gate, 'a gateway from Halvermouth');
  assert.ok(g.maps.get('yards').doors.some((d) => d.to?.map === 'halvermouth'));
  const area = (id) => g.maps.get(id).width * g.maps.get(id).height;
  for (const aw of ['aw1', 'aw2', 'aw3']) assert.ok(area(aw) > area('wh12'), `${aw} is bigger than the Old Cannery`);
  const y = g.maps.get('yards');
  const e = y.spots.east_gate;
  for (const s of ['aw1_door_out', 'aw2_door_out', 'aw3_door_out']) assert.ok(findPath(y, e.x, e.y, y.spots[s].x, y.spots[s].y), s);
  assert.ok(CONTENT.regions.yards);
});

test('the terminal: parts and equipment arrive on the loading dock within the hour', () => {
  const g = works(3);
  const term = g.currentMap().props.find((p) => p.id === 'aw1_terminal');
  assert.equal(g.interact({ kind: 'prop', id: term.id }).type, 'terminal');
  g.player.money = 5000;
  assert.ok(g.arms.order('aw1', 'item_ap_steel', 10).ok);
  assert.ok(g.arms.order('aw1', 'item_st_lathe', 1).ok);
  assert.equal(g.player.money, 5000 - 60 - 400);
  minutes(g, 59);
  assert.ok(!g.world.containers.ct_aw1_dock.items.item_ap_steel);
  minutes(g, 2);
  assert.equal(g.world.containers.ct_aw1_dock.items.item_ap_steel, 10);
  assert.equal(g.world.containers.ct_aw1_dock.items.item_st_lathe, 1);
});

test('workstations go in arms works (calculator machines don\'t), and nothing runs without a worker', () => {
  const g = works(4);
  runCommand(g, 'stations');
  g.inventory.add('item_machine_solderer', 1);
  assert.match(g.arms.place('aw1', 'item_machine_solderer', 8, 6).text, /calculator/);
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  assert.ok(L);
  assert.ok(g.maps.get('aw1').spots[`st_${L.id}`], 'a place for a worker to stand');
  assert.ok(g.arms.setRecipe(L.id, 'barrel').ok);
  L.in = { item_ap_steel: 8 };
  minutes(g, 30);
  assert.ok(!L.out.item_ai_barrel, 'unstaffed: nothing happens');
  assert.match(g.arms.statusExtra('aw1', L), /UNSTAFFED/);
  g.setFlag('owns_wh7', true);
  g.inventory.add('item_st_lab', 1);
  assert.match(g.factory.place('wh7', 'item_st_lab', 3, 4).text, /arms works/);
});

test('staff: generated applicants, hired into bunks, walk to their station on shift, and make things', () => {
  const g = works(5, '07:30');
  runCommand(g, 'stations');
  const cands = g.arms.candidates();
  assert.equal(cands.length, 4);
  for (const c of cands) {
    assert.ok(c.name && c.wage > 0 && c.skills.machining >= 1);
    assert.ok(Object.values(c.skills).some((v) => v >= 3), 'everyone has a speciality');
  }
  const r = g.arms.hire(0, 'aw1');
  assert.ok(r.ok, r.text);
  const st = g.arms.state.staff[0];
  const npc = g.npcs.get(st.id);
  assert.ok(npc, 'they exist in the world');
  assert.equal(npc.map, 'aw1');
  assert.equal(npc.profile.dialogue, 'dlg_staff');
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  g.arms.setRecipe(L.id, 'barrel');
  L.in = { item_ap_steel: 8 };
  st.skills.machining = 4;
  assert.ok(g.arms.assign(st.id, L.id).ok);
  run(g, 60, 0.5);
  assert.ok(g.arms.present(st, L), 'at the lathe');
  assert.ok((L.out.item_ai_barrel || 0) >= 3, `made ${L.out.item_ai_barrel} barrels`);
  // bunks are limited
  for (let i = 0; i < 3; i++) { g.arms.state.candidatesDay = 0; assert.ok(g.arms.hire(0, 'aw1').ok); }
  g.arms.state.candidatesDay = 0;
  assert.match(g.arms.hire(0, 'aw1').text, /bunks for 4/);
});

test('employees work their shifts in the works and lodge at the Yards Lodging House (v0.36.0: no beds at work)', () => {
  const g = works(6, '00:00');
  runCommand(g, 'hire 2 aw1');
  g.changeMap('yards', 'east_gate');
  const seen = {};
  for (let i = 0; i < 24 * 6; i++) {
    run(g, 10, 1);
    for (const st of g.arms.state.staff) {
      const n = g.npcs.get(st.id);
      assert.ok(['aw1', 'lodging', 'yards'].includes(n.map), `${st.id} is at ${n.map}`);
      if (n.activity === 'sleep' && n.arrived) (seen.sleep ||= new Set()).add(n.map);
      const h = Math.floor(g.clock.minuteOfDay / 60);
      if (h >= 9 && h < 18 && !g.arms.quirk(st).night) (seen.work ||= new Set()).add(n.map);
    }
  }
  assert.deepEqual([...seen.sleep], ['lodging'], 'they sleep at the Lodging House');
  if (seen.work) assert.deepEqual([...seen.work], ['aw1'], 'and are in the works all day shift');
});

test('research: a scientist in a lab earns points; nodes unlock recipes and raise prices', () => {
  const g = works(7, '07:30');
  runCommand(g, 'stations');
  const lab = g.arms.place('aw1', 'item_st_lab', 10, 5).entity;
  const A = g.arms.place('aw1', 'item_st_assembly', 14, 5).entity;
  assert.ok(!g.arms.setRecipe(A.id, 'smg').ok, 'SMGs need research');
  assert.ok(g.arms.setRecipe(A.id, 'pistol').ok, 'pistols are open from the start');
  runCommand(g, 'hire aw1');
  const st = g.arms.state.staff[0];
  st.skills.research = 5;
  g.arms.assign(st.id, lab.id);
  assert.ok(!g.arms.selectResearch('assault').ok, 'needs SMGs first');
  assert.ok(g.arms.selectResearch('smg').ok);
  run(g, 4 * 60, 1);
  assert.ok(g.arms.done('smg'), 'researched in a working morning');
  assert.ok(g.arms.setRecipe(A.id, 'smg').ok);
  const before = g.arms.value('item_pistol');
  runCommand(g, 'research rifling');
  assert.equal(g.arms.value('item_pistol'), Math.round(before * 1.15));
  runCommand(g, 'research jigs');
  assert.ok(g.arms.speedMult() > 1);
  runCommand(g, 'research lean');
  assert.equal(g.arms.partPrice('item_ap_optics'), Math.round(30 * 0.85));
});

test('a staffed assembly bench turns components into whole crates of pistols; they go in the export cage by belt', () => {
  const g = works(8, '07:30');
  runCommand(g, 'stations');
  const A = g.arms.place('aw1', 'item_st_assembly', 10, 5).entity;
  g.arms.setRecipe(A.id, 'pistol');
  // assembly (10–11, 5–6) ─▶ arm (12,5)→ ─▶ belts east to (26,5), then north into the export cage (26–28, 1–2)
  assert.ok(g.arms.place('aw1', 'item_inserter', 12, 5, 0).ok);
  for (let x = 13; x <= 26; x++) assert.ok(g.arms.place('aw1', 'item_belt', x, 5, x === 26 ? 3 : 0).ok, `belt ${x}`);
  g.inventory.add('item_belt', 2);
  assert.ok(g.arms.place('aw1', 'item_belt', 26, 4, 3).ok);
  assert.ok(g.arms.place('aw1', 'item_belt', 26, 3, 3).ok);
  A.in = { item_ai_receiver: 10, item_ai_barrel: 10, item_ai_furniture: 10 }; // two crates' worth (5 of each per crate)
  runCommand(g, 'hire aw1');
  g.arms.autoAssign('aw1');
  run(g, 120, 0.5);
  assert.equal(g.world.containers.ct_aw1_cage.items.item_crate_pistol, 2);
  assert.equal(g.arms.state.produced.item_crate_pistol, 2);
  assert.ok(!g.world.containers.ct_aw1_cage.items.item_pistol, 'no loose pistols to count');
});

test('payroll at 19:00: wages paid, or morale crashes; unpaid twice and they quit', () => {
  const g = works(9, '18:00');
  runCommand(g, 'hire 2 aw1');
  const [a, b] = g.arms.state.staff;
  g.player.money = a.wage + b.wage;
  run(g, 61, 1);
  assert.equal(g.player.money, 0);
  assert.equal(a.unpaid, 0);
  const morale = a.morale;
  setTime(g, 2, '18:59');
  run(g, 2, 1);
  assert.equal(a.unpaid, 1);
  assert.ok(a.morale <= morale - 20, 'unpaid: morale crashes');
  setTime(g, 3, '18:59');
  run(g, 2, 1);
  assert.equal(g.arms.state.staff.length, 0, 'both quit');
  assert.ok(!g.npcs.has(a.id), 'and left');
});

test('Lucas buys arms wholesale — the INCOME share of value (0.65 since v0.82.0; was half), with research — up to his daily budget; licence required', () => {
  const g = fresh(10, '11:00');
  g.inventory.add('item_assault_rifle', 100);
  assert.equal(g.priceFor('shop_rook', 'item_assault_rifle', true), 0, 'no licence, no deal');
  runCommand(g, 'licence');
  const price = g.priceFor('shop_rook', 'item_assault_rifle', true);
  assert.equal(price, Math.round(480 * INCOME.business.wholesaleShare), 'the rifle is worth 480; Lucas pays the INCOME share');
  let sold = 0;
  while (g.sell('shop_rook', 'item_assault_rifle').ok) sold++;
  assert.equal(sold, Math.floor(CONTENT.arms.wholesale.dailyBudget / price), 'until the kitty is empty');
  setTime(g, 2, '11:00');
  assert.ok(g.sell('shop_rook', 'item_assault_rifle').ok, 'a new day, a new budget');
});

test('arms works, staff and research survive save/load', () => {
  const g = works(11, '08:00');
  runCommand(g, 'stations');
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  runCommand(g, 'hire aw1');
  const st = g.arms.state.staff[0];
  g.arms.assign(st.id, L.id);
  runCommand(g, 'research smg');
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(state);
  assert.ok(g2.npcs.get(st.id), 'staff respawn');
  assert.equal(g2.npcs.get(st.id).map, 'aw1');
  assert.ok(g2.arms.done('smg'));
  assert.ok(g2.maps.get('aw1').propIndex.get(L.id));
  assert.ok(g2.maps.get('aw1').spots[`st_${L.id}`]);
  assert.equal(g2.arms.state.staff[0].assigned, L.id);
  delete state.world.arms;
  const g3 = new Game(CONTENT, { seed: 1 });
  g3.loadState(state);
  assert.deepEqual(g3.arms.state.staff, []);
});

test('attacking Lucas: EVERYTHING IS FOR SALE', async () => {
  const g = fresh(12, '11:00');
  const lucas = besideNpc(g, 'npc_lucas');
  g.combat.hitNpc(lucas, 999, { weapon: g.combat.weaponDef('item_rifle'), dir: { x: -1, y: 0 }, lethal: true });
  assert.equal(g.combat.wrath?.theme, 'arms');
  assert.ok(!lucas.dead);
  const { THEMES } = await import('../src/engine/wrath.js');
  assert.ok(THEMES.arms?.finale);
  const { SFX } = await import('../src/audio/sfx.js');
  assert.equal(typeof SFX.sfx_crate, 'function');
  void WRATH;
});

test('new guns work: assault rifle, sniper rifle and LMG fire rifle rounds', () => {
  for (const id of ['item_assault_rifle', 'item_sniper_rifle', 'item_lmg']) {
    const w = CONTENT.items[id].weapon;
    assert.equal(w.kind, 'gun', id);
    assert.equal(w.ammo, 'item_ammo_rifle', id);
  }
  for (const r of Object.values(CONTENT.arms.recipes)) {
    for (const id of Object.keys(r.in)) assert.ok(CONTENT.items[id], id);
    assert.ok(CONTENT.items[r.out], r.out);
    assert.ok(!r.requires || CONTENT.arms.research[r.requires], r.requires);
  }
  for (const [id, n] of Object.entries(CONTENT.arms.research)) for (const q of n.requires) assert.ok(CONTENT.arms.research[q], `${id} needs ${q}`);
  void TILE;
});

test('the armourer\'s workbench: one weapon, or a box of its ammo, for yourself — from dock parts, in your own time', () => {
  const g = works(12, '10:00');
  const A = g.arms;
  const dock = g.world.containers[A.def('aw1').inBay].items;
  // a bench in every works
  for (const id of ['aw1', 'aw2', 'aw3']) assert.ok(g.maps.get(id).props.some((p) => p.interact?.action === 'bench'), id);
  assert.match(A.benchCraft('aw1', 'pistol').text, /Not enough/);
  Object.assign(dock, { item_ap_steel: 10, item_ap_springs: 2, item_ap_polymer: 4, item_ap_propellant: 2 });
  const t0 = g.clock.total;
  const r = A.benchCraft('aw1', 'pistol');
  assert.ok(r.ok, r.text);
  assert.equal(g.inventory.count('item_pistol'), 1, 'one pistol, in your pack');
  assert.equal(g.clock.total - t0, CONTENT.arms.bench.pistol.minutes, 'it takes your time');
  assert.equal(dock.item_ap_steel, 7);
  assert.ok(A.benchCraft('aw1', 'ammo_9mm').ok);
  assert.equal(g.inventory.count('item_ammo_9mm'), 20, 'a box of 9mm');
  assert.match(A.benchCraft('aw1', 'sniper').text, /Research/, 'research still applies');
  // the workbench, not the stations, makes singles
  for (const r2 of Object.values(CONTENT.arms.recipes)) assert.ok(!CONTENT.items[r2.out]?.weapon, `${r2.out} from a station is not a single weapon`);
});

test('debug: crates in the cage', () => {
  const g = works(13, '10:00');
  assert.ok(runCommand(g, 'crates assault 12').ok);
  assert.equal(g.world.containers.ct_aw1_cage.items.item_crate_assault, 12);
});
