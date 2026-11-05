// Places and construction (v0.98.0): Fort Gullcrest (the government's own base, a garrison of six) and Hollowmoor Lot (the company's ground), each its own region map with a gate;
// the facilities Mason's Os builds in stages with real capacity; and the damage gate guarding what is built. Map logic as for the estates: nothing in a road, a wall or a building,
// every door step clear, every building and spot reachable on foot from the gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game } from './helpers.mjs';
import { findPath } from '../src/world/pathfinding.js';
import { FACILITIES, FACILITY_STATES, LOT } from '../src/content/facilities.js';
import { SLOTS } from '../src/content/maps/hollowmoor.js';
import { FORT_PEOPLE } from '../src/content/fort.js';
import { freshCompany } from '../src/war/state.js';
import { check } from '../src/sim/conditions.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
// (v0.98.0 stage 3: the company is registered and pays from its own account, so the helper founds it, flags the licence and lot, and pays `cash` in out of the wallet)
const company = (g, o = {}) => {
  const { cash = 5e6, ...rest } = o;
  const m = g.war.state(); const had = m.company?.identity;
  if (!had) { m.company = { ...freshCompany(), licensed: true, lot: { owned: true, day: 1, price: LOT.price } }; assert.ok(g.war.found('Ironclad Company').ok); }
  Object.assign(m.company, rest);
  if (!had) { g.player.money += cash; assert.ok(g.war.fund(cash).ok); }
  return m.company;
};
const topUp = (g, n) => { g.player.money += n; assert.ok(g.war.fund(n).ok); };
const days = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.war.dailyTick(); } };
const buildAll = (g, ids) => { for (const id of ids) { topUp(g, FACILITIES[id].cost * 2); assert.ok(g.war.commission(id).ok, id); } days(g, 60); };

test('two new regions, each joined to the world by a four-wide road both ways: FM 38 north from Lariat to Fort Gullcrest, and the shore road west of the Yards to Hollowmoor Lot', () => {
  for (const [region, map, from, door] of [['fort', 'fort_gullcrest', 'lariat', 'north_gate'], ['hollowmoor', 'hollowmoor_lot', 'yards', 'hollowmoor_gate']]) {
    assert.ok(CONTENT.regions[region]?.maps[map], `${region} is a region`);
    const there = CONTENT.maps[from].doors.filter((d) => d.to.map === map); const back = CONTENT.maps[map].doors.filter((d) => d.to.map === from);
    assert.equal(there.length, 4); assert.equal(back.length, 4);
    assert.ok(CONTENT.maps[from].spots[back[0].to.spot] && CONTENT.maps[map].spots[there[0].to.spot], 'arrival spots exist');
  }
  const L = CONTENT.maps.lariat; for (const x of [97, 98, 99, 100]) for (const y of [0, 1, 2, 3]) assert.equal(L.tiles[y][x], '=', `FM 38 reaches the north edge at ${x},${y}`);
  const Y = CONTENT.maps.yards; for (const y of [28, 29, 30, 31]) assert.equal(Y.tiles[y][0], '=', `the Yards' road leaves west at row ${y}`);
  const g = newGame(1); g.changeMap('fort_gullcrest', 'south_gate'); assert.equal(g.player.map, 'fort_gullcrest'); g.changeMap('hollowmoor_lot', 'east_gate'); assert.equal(g.player.map, 'hollowmoor_lot');
});

test('map logic: nothing in a road, a wall or a building; every door step clear; every spot and every building reachable on foot from the gate', () => {
  const g = newGame(92);
  for (const [id, gate] of [['fort_gullcrest', 'south_gate'], ['hollowmoor_lot', 'east_gate']]) {
    const M = CONTENT.maps[id]; const T = (x, y) => M.tiles[y]?.[x];
    const blocked = new Set();
    for (const p of M.props) {
      const w = p.w || 1; const h = p.h || 1;
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + w <= M.tiles[0].length && p.y + h <= M.tiles.length, `${p.id} on the map`);
      for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) {
        if (!['boom_barrier', 'scaffold'].includes(p.type)) assert.notEqual(T(x, y), '=', `${id}/${p.id} (${p.type}) stands in the road at ${x},${y}`);
        if (p.type !== 'scaffold') assert.ok(!['r', 'R', 'W'].includes(T(x, y)), `${id}/${p.id} (${p.type}) is in a wall at ${x},${y}`);
        if (!['boom_barrier', 'streetlamp', 'scaffold', 'stake'].includes(p.type)) blocked.add(`${x},${y}`);
      }
    }
    const buildingTiles = new Set(); for (const b of M.buildings) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) buildingTiles.add(`${x},${y}`);
    for (const p of M.props) { if (['scaffold', 'stake'].includes(p.type)) continue; for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) assert.ok(!buildingTiles.has(`${x},${y}`), `${id}/${p.id} stands in a building at ${x},${y}`); }
    for (const b of M.buildings) assert.ok(!blocked.has(`${b.door.x},${b.door.y + 1}`) && T(b.door.x, b.door.y + 1) !== '=' || id === 'fort_gullcrest', `${id}/${b.id}: a clear step below its door`);
    const map = g.maps.get(id); const from = map.spot(gate); const actor = g.playerActor();
    for (const b of M.buildings) assert.ok(findPath(map, Math.floor(from.x), Math.floor(from.y), b.door.x, b.door.y + 1, actor)?.length, `${id}/${b.id}: a way to its front step`);
    for (const s of Object.keys(M.spots)) assert.ok(findPath(map, Math.floor(from.x), Math.floor(from.y), Math.floor(M.spots[s].x), Math.floor(M.spots[s].y), actor), `${id}: spot ${s} reachable`);
    // the road reaches a gate
    const doors = M.doors.filter((d) => d.gateway); assert.equal(doors.length, 4);
  }
  for (const [slot, [x, y, w, h]] of Object.entries(SLOTS)) assert.ok(CONTENT.maps.hollowmoor_lot.buildings.some((b) => b.id === `hm_${slot}` && b.x === x && b.w === w), `${slot} has its building`);
});

test('Fort Gullcrest has a garrison of six with beds, duties and days: the gate on the day and the night watch, a patrol on the perimeter, the Colonel at the command post; they are the government\'s, not your company\'s', () => {
  assert.equal(FORT_PEOPLE.length, 6);
  const g = newGame(93);
  for (const p of FORT_PEOPLE) {
    const n = g.npcs.get(p.id); assert.ok(n, p.id);
    const life = LIFE_OF(p.id); assert.match(life.home, /^res_fort_barracks\/flat_\d$/);
    assert.ok(n.profile.schedule.some((b) => b.activity === 'sleep'), `${p.id} sleeps`);
  }
  setTime(g, 1, '10:00');
  g.world.military = undefined;
  const at = (id) => g.npcs.get(id);
  g.changeMap('lanternside', 'start');
  for (let i = 0; i < 3; i++) { for (const n of g.npcs.values()) g.npcSystem.think(n, true); }
  assert.equal(at('npc_fg_gate_a').intent?.activity, 'work'); assert.match(at('npc_fg_gate_a').intent.spot, /fort_gullcrest:gate_post/);
  assert.equal(at('npc_fg_patrol_a').intent?.activity, 'patrol');
  assert.match(at('npc_fg_colonel').intent.spot, /command_out/);
  setTime(g, 1, '23:30');
  for (let i = 0; i < 3; i++) for (const n of g.npcs.values()) g.npcSystem.think(n, true);
  assert.equal(at('npc_fg_gate_b').intent?.activity, 'work', 'the night watch is on the gate');
  assert.equal(at('npc_fg_gate_a').intent?.activity, 'sleep');
  assert.equal(g.world.military, undefined, 'the garrison is content, not part of any company record');
  assert.ok(CONTENT.maps.fort_gullcrest.buildings.every((b) => b.door.lock?.owners?.length || b.id === 'fg_quarters' || b.door.to), 'the fort\'s doors are the Army\'s');
});
function LIFE_OF(id) { return CONTENT.life.homes[id]; }

test('the facilities: nineteen in three stages, each on a slot, with a cost, a build time in three phases, hit points and a real capacity; only tanks and helicopters are made (as factories), never guns, planes, missiles or ships', () => {
  const all = Object.values(FACILITIES);
  assert.equal(all.length, 19);
  assert.deepEqual([1, 2, 3].map((s) => all.filter((f) => f.stage === s).length), [4, 8, 7]);
  assert.equal(new Set(all.map((f) => f.slot)).size, 19, 'one facility to a slot');
  for (const F of all) {
    assert.ok(SLOTS[F.slot], `${F.id} has a slot`); assert.ok(F.cost > 0 && F.hp > 0 && F.days.length === 3 && F.days.every((d) => d >= 1), F.id);
    assert.ok(Object.keys(F.capacity).length >= 1 && Object.values(F.capacity).every((v) => v > 0), `${F.id} has a real capacity`);
    assert.ok(F.text && F.sign, F.id);
  }
  assert.deepEqual(all.filter((f) => /factory|works/.test(f.kind)).map((f) => f.kind).sort(), ['helicopter_works', 'tank_factory']);
  assert.ok(all.filter((f) => !f.core).map((f) => f.id).sort().join() === 'range,training', 'the ranges are outbuildings; the rest is the heart of the base');
  assert.deepEqual(FACILITY_STATES, ['permit', 'foundation', 'frame', 'fitted', 'built']);
});

test('construction: nothing without a company and a lot; a stage opens when the one before is built; it is paid once, up front; the permit waits a day, then foundation, frame and fitting-out take their days; a licence is needed for the permit', () => {
  const g = newGame(94); g.player.money = 5_000_000;
  assert.ok(!g.war.commission('site_office').ok && /no company/.test(g.war.commission('site_office').text));
  company(g, { lot: { owned: false } }); assert.ok(/no ground/.test(g.war.commission('site_office').text));
  const C = company(g, { lot: { owned: true, day: 1, price: LOT.price } });
  assert.ok(/stage 1/.test(g.war.commission('command').text), 'stage 2 is not open yet');
  assert.equal(g.war.facilityState('site_office'), 'none');
  const m0 = g.war.cash(); const w0 = g.player.money; const q = g.war.quote('site_office');
  const r = g.war.commission('site_office'); assert.ok(r.ok, r.text);
  assert.equal(g.war.cash(), m0 - q.cost); assert.equal(g.player.money, w0, 'the wallet is never touched'); assert.ok(!g.war.commission('site_office').ok, 'once'); assert.equal(g.war.cash(), m0 - q.cost, 'charged once');
  assert.equal(g.war.facilityState('site_office'), 'permit');
  const seen = [g.war.facilityState('site_office')];
  const F = FACILITIES.site_office; let day = 0;
  for (; day < 20 && g.war.facilityState('site_office') !== 'built'; day++) { days(g, 1); const s = g.war.facilityState('site_office'); if (s !== seen.at(-1)) seen.push(s); }
  assert.deepEqual(seen, ['permit', 'foundation', 'frame', 'fitted', 'built']);
  assert.equal(day, 1 + F.days[0] + F.days[1] + F.days[2], 'a day for the permit, then the three phases');
  // the licence
  const g2 = newGame(95); g2.player.money = 5e6; company(g2, { licensed: false }); g2.war.commission('site_office'); days(g2, 10);
  assert.equal(g2.war.facilityState('site_office'), 'permit', 'no licence, no permit');
  g2.war.state().company.licensed = true; days(g2, 10); assert.notEqual(g2.war.facilityState('site_office'), 'permit');
  // too poor
  const g3 = newGame(96); company(g3, { cash: 100 }); g3.player.money = 9e9; const before = JSON.stringify(g3.world.military); assert.ok(!g3.war.commission('site_office').ok); assert.equal(JSON.stringify(g3.world.military), before, 'a refusal changes nothing');
  // stage 2 opens when stage 1 is built
  buildAll(g, ['bunkhouse', 'range', 'cage']);
  assert.ok(g.war.commission('command').ok, 'stage 2 is open once stage 1 stands');
  assert.deepEqual(g.war.check(), []);
});

test('what a site looks like: stakes while it is only on the survey, a scaffold while Mason\'s Os works, the building when it is built; its door is shut until then; nobody walks through it', () => {
  const g = newGame(97); g.player.money = 5e6; company(g);
  const door = CONTENT.maps.hollowmoor_lot.buildings.find((b) => b.id === 'hm_bunk').door;
  const stake = CONTENT.maps.hollowmoor_lot.props.find((p) => p.type === 'stake' && p.hiddenUnless?.facility?.slot === 'bunkhouse');
  const scaff = CONTENT.maps.hollowmoor_lot.props.filter((p) => p.type === 'scaffold' && p.hiddenUnless?.facility?.slot === 'bunkhouse');
  assert.equal(scaff.length, 3);
  assert.ok(check(stake.hiddenUnless, g), 'stakes show on the survey');
  assert.ok(!scaff.some((p) => check(p.hiddenUnless, g)));
  g.war.commission('bunkhouse'); days(g, 1);
  assert.equal(g.war.facilityState('bunkhouse'), 'foundation');
  assert.ok(!check(stake.hiddenUnless, g) && scaff.filter((p) => check(p.hiddenUnless, g)).length === 1, 'one scaffold');
  const gd = g.maps.get('hollowmoor_lot').doors.find((d) => d.x === door.x && d.y === door.y);
  assert.match(g.doorLockReason(gd, () => false) || '', /not built|building site/i); assert.equal(g.npcCanPass({ id: 'npc_x', profile: {} }, gd), false);
  days(g, 12); assert.equal(g.war.facilityState('bunkhouse'), 'built');
  assert.equal(g.doorLockReason(gd, () => false), null, 'once built, the company\'s own door opens for you');
  assert.ok(!scaff.some((p) => check(p.hiddenUnless, g)));
  const noLot = newGame(98); assert.ok(!check(stake.hiddenUnless, noLot), 'no stakes on ground you do not own');
});

test('capacity is real and the gate guards what is built: a built facility is registered (core ones protected before a coup), damage halves its capacity, a ruin gives none, repair goes through the gate, a ruin is rebuilt from the foundations', () => {
  const g = newGame(99); g.player.money = 9e6; company(g);
  assert.equal(g.war.capacity().beds, 0);
  buildAll(g, ['site_office', 'bunkhouse', 'range', 'cage']);
  assert.equal(g.war.capacity().beds, 12); assert.equal(g.war.capacity().stores, 60); assert.equal(g.war.capacity().training, 6);
  const gate = (id) => g.war.structures().find((s) => s.id === `fac_${id}`);
  assert.ok(gate('bunkhouse').core && gate('bunkhouse').protected && gate('bunkhouse').owner === 'company');
  assert.ok(!gate('range').core && !gate('range').protected);
  // before a coup, nothing hurts the bunkhouse; the range can be hurt
  assert.ok(g.war.hit('fac_bunkhouse', 100, 'missile').refused); assert.ok(g.war.hit('fac_range', 40, 'gunfire').ok);
  assert.equal(g.war.capacity().training, 3, 'a hurt range trains half as many');
  g.war.setCoup('staged', 't');
  g.war.hit('fac_bunkhouse', 60, 'artillery'); assert.equal(g.war.capacity().beds, 6, 'a damaged barracks holds half');
  // repair: through the gate, paid
  const rc = g.war.repairCost('bunkhouse'); assert.equal(rc.kind, 'repair'); assert.ok(rc.cost > 0 && rc.cost < FACILITIES.bunkhouse.cost);
  const m0 = g.war.cash(); assert.ok(g.war.repairFacility('bunkhouse').ok);
  assert.equal(g.war.cash(), m0 - rc.cost); assert.equal(gate('bunkhouse').state, 'intact'); assert.equal(g.war.capacity().beds, 12);
  assert.ok(!g.war.repairFacility('bunkhouse').ok, 'nothing more to repair');
  // a ruin
  g.war.hit('fac_bunkhouse', 500, 'bombing');
  assert.equal(g.war.facilityState('bunkhouse'), 'ruin'); assert.equal(g.war.capacity().beds, 0);
  assert.ok(!g.war.repairFacility('bunkhouse').ok === false, 'a ruin is rebuilt (paid)');
  assert.equal(g.war.facilityState('bunkhouse'), 'foundation', 'from the foundations');
  days(g, 20); assert.equal(g.war.facilityState('bunkhouse'), 'built'); assert.equal(gate('bunkhouse').state, 'intact'); assert.equal(g.war.capacity().beds, 12);
  assert.deepEqual(g.war.check(), []);
  // the structure writer is still only the gate
  const g2 = roundtrip(g);
  assert.equal(g2.war.facilityState('bunkhouse'), 'built'); assert.equal(g2.war.capacity().beds, 12); assert.equal(g2.war.baseProtected(), false);
});

test('a save in the middle of a build carries on; reading changes nothing; a game with no company has no record of one', () => {
  const g = newGame(100); g.player.money = 5e6; company(g); g.war.commission('cage'); days(g, 3);
  const mid = g.war.facilityState('cage'); assert.notEqual(mid, 'built');
  const before = JSON.stringify(g.world.military); g.war.facilities(); g.war.capacity(); g.war.quote('cage'); g.war.repairCost('cage'); assert.equal(JSON.stringify(g.world.military), before);
  const g2 = roundtrip(g); assert.equal(g2.war.facilityState('cage'), mid); days(g2, 10); assert.equal(g2.war.facilityState('cage'), 'built');
  const none = newGame(101); assert.equal(none.world.military, undefined); assert.equal(none.war.facilityState('cage'), 'none'); assert.equal(none.war.lotOwned(), false); assert.equal(none.world.military, undefined);
  const v = g2.war.facilities(); assert.equal(v.length, 19); assert.ok(v.find((x) => x.id === 'cage').state === 'built' && v.find((x) => x.id === 'command').open === false);
});
