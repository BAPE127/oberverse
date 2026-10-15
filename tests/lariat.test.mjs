// Lariat (v0.29.0): the town, Farmer Chuckie, Chuckie's Cheese (the dairy and
// CHZ on the exchange), and the five talking lead cows of q_lost_herd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, CONTENT, Game, TILE } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { isProtected } from '../src/systems/combat.js';
import { THEMES } from '../src/engine/wrath.js';
import { findPath } from '../src/world/pathfinding.js';

const COWS = ['cow_bessie', 'cow_clementine', 'cow_duchess', 'cow_patsy', 'cow_daisy'];
const talk = (g, id, ...choices) => {
  const s = new DialogueSession(g, id);
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return node;
};
const text = (node) => node.pages.join(' ');
const tileOf = (o) => ({ x: Math.floor(o.x / TILE), y: Math.floor(o.y / TILE) });
const reload = (g) => {
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  return g2;
};

/** Walk the player to a tile on their map, tile by tile at walking pace, letting the world run. */
function walkTo(g, gx, gy, speed = 90) {
  const map = g.currentMap();
  const p = g.player;
  const path = findPath(map, Math.floor(p.x / TILE), Math.floor(p.y / TILE), gx, gy, g.playerActor());
  assert.ok(path, `a path to ${gx},${gy}`);
  for (const t of path) {
    const tx = (t.x + 0.5) * TILE;
    const ty = (t.y + 0.5) * TILE;
    for (;;) {
      const d = Math.hypot(tx - p.x, ty - p.y);
      const step = speed * 0.1;
      if (d <= step) { p.x = tx; p.y = ty; break; }
      p.x += ((tx - p.x) / d) * step;
      p.y += ((ty - p.y) / d) * step;
      g.update(0.1, { x: 0, y: 0 });
    }
  }
}
const wait = (g, seconds) => { for (let i = 0; i < seconds * 10; i++) g.update(0.1, { x: 0, y: 0 }); };

function standBy(g, id) {
  const n = g.npcs.get(id);
  if (g.player.map !== n.map) g.changeMap(n.map, 'south_gate');
  g.player.x = n.x + TILE;
  g.player.y = n.y;
  return n;
}

test('Farmer Chuckie: imported from the photo, protected, with a stampede-and-cheese Wrath and his own motif', () => {
  const c = CONTENT.characters.npc_chuckie;
  assert.equal(c.origin, 'imported');
  assert.match(c.appearance.portrait, /^data:image\/jpeg;base64,/);
  assert.equal(c.wrath.theme, 'stampede');
  assert.ok(THEMES.stampede);
  assert.equal(CONTENT.motifs[c.motif].character, 'npc_chuckie');
  assert.equal(c.relationships.npc_ober.affection > 50, true, 'old friends with Captain Ober');
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_chuckie')));
});

test('Lariat lies through Halvermouth\'s North Gate; every door goes somewhere real, and every hideout and the paddock can be reached on foot', () => {
  const hv = CONTENT.maps.halvermouth;
  const gate = hv.doors.find((d) => d.to?.map === 'lariat');
  assert.ok(gate, 'a gate from Halvermouth to Lariat');
  const g = newGame();
  const lariat = g.maps.get('lariat');
  for (const b of lariat.def.buildings) if (b.door?.to) assert.ok(g.maps.get(b.door.to.map)?.spot(b.door.to.spot), `${b.id} leads somewhere`);
  const start = lariat.spot('south_gate');
  for (const [id, cow] of Object.entries(CONTENT.dairy.cows)) {
    const s = lariat.spot(cow.hide);
    assert.ok(findPath(lariat, start.x, start.y, s.x, s.y, g.playerActor()), `${id}'s hideout is reachable`);
    assert.ok(findPath(lariat, s.x, s.y, 29, 86, g.npcSystem.actorFor(g.npcs.get(id))), `${id} can walk into the paddock`);
  }
  assert.ok(lariat.def.props.filter((p) => p.type === 'cow').length >= 20, 'the ordinary herd grazes (they don\'t talk)');
});

test('a new game: all five lead cows loose at their hideouts, the dairy short-handed, the quest not started', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  g.minuteTick();
  for (const id of COWS) {
    const n = g.npcs.get(id);
    assert.equal(g.dairy.status(id), 'loose');
    assert.equal(n.map, 'lariat');
    const hide = g.maps.get('lariat').spot(CONTENT.dairy.cows[id].hide);
    assert.deepEqual(tileOf(n), { x: hide.x, y: hide.y }, `${id} is at her hideout`);
  }
  assert.ok(Math.abs(g.dairy.capacity() - 0.55) < 1e-9);
  assert.equal(g.quests.state('q_lost_herd').state, 'not_started');
});

test('Chuckie asks for help; the intro isn\'t repeated; the lasso is always on the peg at the Mercantile and buying it moves the quest on', () => {
  const g = newGame();
  setTime(g, 1, '14:00');
  const first = text(talk(g, 'npc_chuckie'));
  assert.match(first, /Farmer Chuckie/);
  const node = talk(g, 'npc_chuckie', 'topic:t_chuckie_cows', 'choice:c_chuckie_yes');
  assert.ok(node);
  assert.ok(g.quests.matches({ id: 'q_lost_herd', stage: 'lasso' }));
  assert.doesNotMatch(text(talk(g, 'npc_chuckie')), /Welcome to Lariat/);
  assert.match(text(talk(g, 'npc_chuckie', 'topic:t_chuckie_where')), /Bessie Mae.*Diner/);
  // the peg is never empty
  g.world.shops.shop_mercantile.stock.item_lasso = 0;
  g.minuteTick();
  assert.ok(g.world.shops.shop_mercantile.stock.item_lasso >= 1);
  g.player.money = 500;
  assert.ok(g.buy('shop_mercantile', 'item_lasso').ok);
  g.minuteTick();
  assert.ok(g.quests.matches({ id: 'q_lost_herd', stage: 'roundup' }));
});

test('no lasso, no rope: the cow says so; with one she\'s roped — and roping first starts the quest', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  standBy(g, 'cow_bessie');
  const node = talk(g, 'cow_bessie');
  assert.ok(!node.options.some((o) => o.id === 'topic:cow_bessie_rope' || o.id === 'topic:dlg_bessie_rope'), 'no lasso option without a lasso');
  assert.match(text(talk(g, 'cow_bessie', 'topic:dlg_bessie_norope')), /lasso/);
  assert.equal(g.dairy.rope('cow_bessie').ok, false);
  g.inventory.add('item_lasso', 1);
  talk(g, 'cow_bessie', 'topic:dlg_bessie_rope');
  assert.equal(g.dairy.status('cow_bessie'), 'roped');
  assert.equal(g.quests.state('q_lost_herd').state, 'active');
  assert.ok(g.quests.matches({ id: 'q_lost_herd', stage: 'roundup' }));
  assert.ok(Math.abs(g.dairy.capacity() - 0.55) < 1e-9, 'a roped cow isn\'t home yet');
  assert.equal(g.dairy.rope('cow_bessie').ok, false, 'can\'t rope her twice');
});

test('a roped cow walks after you — no teleport — and is home once she\'s in the paddock', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  g.inventory.add('item_lasso', 1);
  const bessie = standBy(g, 'cow_bessie');
  assert.ok(g.dairy.rope('cow_bessie').ok);
  const start = tileOf(bessie);
  walkTo(g, 45, 64); // along Dairy Road, westward
  const mid = tileOf(bessie);
  assert.ok(mid.x < start.x - 4, `she followed (${start.x} → ${mid.x})`);
  assert.ok(Math.hypot(bessie.x - g.player.x, bessie.y - g.player.y) < 6 * TILE, 'and kept close');
  walkTo(g, 29, 80); // the paddock gate
  walkTo(g, 30, 87);
  wait(g, 6);
  assert.equal(g.dairy.status('cow_bessie'), 'home');
  assert.ok(Math.abs(g.dairy.capacity() - 0.64) < 1e-9);
  // home: back on her paddock schedule
  assert.notEqual(bessie.intent?.source, 'dairy');
});

test('she waits outside when you go indoors, stands still if you leave her far behind, and a save keeps her on the rope', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  g.inventory.add('item_lasso', 1);
  const bessie = standBy(g, 'cow_bessie');
  g.dairy.rope('cow_bessie');
  g.changeMap('diner', 'entry');
  wait(g, 3);
  assert.equal(bessie.map, 'lariat', 'cows wait outside');
  g.changeMap('lariat', 'diner_door_out');
  wait(g, 10);
  assert.ok(Math.hypot(bessie.x - g.player.x, bessie.y - g.player.y) < 3 * TILE, 'back outside, she comes to you');
  const before = tileOf(bessie);
  g.player.x = 140 * TILE; // far off across the fields
  g.player.y = 100 * TILE;
  wait(g, 3);
  assert.deepEqual(tileOf(bessie), before, 'she doesn\'t chase you across the county');
  const g2 = reload(g);
  assert.equal(g2.dairy.status('cow_bessie'), 'roped');
  assert.equal(g2.npcs.get('cow_bessie').intent.source, 'dairy');
  assert.deepEqual(tileOf(g2.npcs.get('cow_bessie')), before, 'loaded where she was');
  // loose cows stay put through a load and a day
  const daisy = tileOf(g2.npcs.get('cow_daisy'));
  setTime(g2, 2, '13:00');
  g2.minuteTick();
  assert.deepEqual(tileOf(g2.npcs.get('cow_daisy')), daisy);
});

test('all five home: the quest completes once, with a fair reward; Chuckie remembers', () => {
  const g = newGame();
  setTime(g, 1, '12:00');
  g.inventory.add('item_lasso', 1);
  const money = g.player.money;
  for (const id of COWS) {
    g.dairy.rope(id);
    g.dairy.bringHome(g.npcs.get(id));
  }
  const st = g.quests.state('q_lost_herd');
  assert.equal(st.state, 'completed');
  assert.equal(st.outcome, 'home');
  assert.equal(g.player.money, money + 2500);
  assert.equal(g.inventory.count('item_cheese_wheel'), 2);
  assert.equal(g.dairy.capacity(), 1);
  g.dairy.syncQuest();
  g.minuteTick();
  assert.equal(g.player.money, money + 2500, 'paid once');
  const g2 = reload(g);
  g2.dairy.syncQuest();
  assert.equal(g2.player.money, money + 2500, 'and not again after a load');
  for (const id of COWS) assert.equal(g2.dairy.status(id), 'home');
  setTime(g2, 2, '14:00');
  assert.doesNotMatch(text(talk(g2, 'npc_chuckie')), /Welcome to Lariat|That\'s the trouble/);
  assert.ok(!talk(g2, 'npc_chuckie').options.some((o) => o.id === 'topic:t_chuckie_cows'));
});

test('the dairy\'s numbers follow the herd; dividends at 18:00 once a day; CHZ drifts toward fair value', () => {
  const g = newGame();
  const D = g.dairy;
  const short = D.numbers();
  for (const id of COWS) D.state.cows[id] = { status: 'home' };
  D.state.rewarded = true; // (the reward is another test's business)
  const full = D.numbers();
  assert.ok(full.litres > short.litres * 1.7);
  assert.ok(full.profit > short.profit);
  D.state.sharesOwned = 100;
  setTime(g, 1, '17:59');
  const m0 = g.player.money;
  g.update(1.5, { x: 0, y: 0 });
  assert.equal(D.state.lastDay, 1);
  const paid = g.player.money - m0;
  assert.equal(paid, Math.floor(D.dividendPerShare(full) * 100));
  D.dailyTick();
  assert.equal(g.player.money - m0, paid, 'once a day');
  // with the herd home the price climbs toward fair value over the days
  const p0 = D.state.sharePrice;
  for (let d = 2; d < 20; d++) { g.clock.total = (d - 1) * 1440 + 18 * 60; D.dailyTick(); }
  assert.ok(D.state.sharePrice > p0);
  assert.ok(Math.abs(D.state.sharePrice - D.fairValue()) / D.fairValue() < 0.12);
});

test('no stock exploit: the round-up is mostly priced in, trades cost a fee, and Chuckie keeps control', () => {
  const g = newGame();
  const D = g.dairy;
  const out = D.fairValue();
  for (const id of COWS) D.state.cows[id] = { status: 'home' };
  const home = D.fairValue();
  assert.ok(home > out && (home - out) / out < 0.1, `knowing the cows come home is worth < 10% (${out.toFixed(1)} → ${home.toFixed(1)})`);
  assert.ok(Math.abs(D.state.sharePrice - out) / out < 0.05, 'CHZ opens near its fair value');
  g.player.money = 1e7;
  const m0 = g.player.money;
  assert.ok(D.buyShares(10).ok);
  assert.ok(D.sellShares(10).ok);
  assert.ok(g.player.money < m0, 'a round trip loses the fee');
  assert.equal(D.buyShares(D.cfg.maxPlayerShares + 1).ok, false);
  assert.ok(D.buyShares(D.cfg.maxPlayerShares).ok);
  assert.equal(D.buyShares(1).ok, false, 'one investor can hold at most 1%');
  assert.ok(D.state.sharesOwned / D.cfg.shares <= 0.01);
});

test('an older save (no dairy yet) loads with every cow loose, no shares and nothing paid', () => {
  const g = newGame();
  const s = JSON.parse(JSON.stringify(g.serialize()));
  delete s.world.dairy;
  const g2 = new Game(CONTENT, { seed: 3 });
  g2.loadState(s);
  for (const id of COWS) assert.equal(g2.dairy.status(id), 'loose');
  assert.equal(g2.dairy.state.sharesOwned, 0);
  assert.equal(g2.dairy.state.rewarded, false);
  assert.equal(g2.quests.state('q_lost_herd').state, 'not_started');
});

test('the company board in the cheese plant opens the exchange on CHZ; markers show the loose cows once you know', () => {
  const g = newGame();
  g.changeMap('cheese_plant', 'entry');
  assert.deepEqual(g.interact({ kind: 'prop', id: 'cp_ticker' }), { type: 'panel', panel: 'exchange', opts: { company: 'chz' } });
  assert.equal(g.questMarkers().filter((m) => m.questId === 'q_lost_herd').length, 0);
  g.quests.start('q_lost_herd');
  assert.equal(g.questMarkers().filter((m) => m.cow).length, 5);
});

test('a roped cow right behind you comes through the North Gate with you (on foot, not by truck)', () => {
  const g = newGame();
  setTime(g, 1, '11:00');
  g.inventory.add('item_lasso', 1);
  const bessie = standBy(g, 'cow_bessie');
  g.dairy.rope('cow_bessie');
  walkTo(g, 73, 100); // down FM 38 toward the gate
  walkTo(g, 73, 107);
  wait(g, 2);
  assert.ok(Math.hypot(bessie.x - g.player.x, bessie.y - g.player.y) < 7 * TILE, 'she kept up');
  const gate = g.currentMap().doors.find((d) => d.to?.map === 'halvermouth');
  g.useDoor(gate);
  assert.equal(g.player.map, 'halvermouth');
  assert.equal(bessie.map, 'halvermouth', 'she came too');
  assert.equal(g.dairy.status('cow_bessie'), 'roped');
});

test('v0.29.1 streets: a connected grid with lights and crossings; fields clear of the creek, drawn once; the gates are marked', () => {
  const g = newGame();
  const map = g.maps.get('lariat');
  const def = map.def;
  // the town's main places are all reachable from the gate along streets and pavements
  const gate = map.spot('south_gate');
  for (const s of ['town_square', 'mercantile_door_out', 'diner_door_out', 'cheese_plant_door_out', 'hollister_door_out', 'chuckie_house_door_out']) {
    const t = map.spot(s);
    assert.ok(findPath(map, gate.x, gate.y, t.x, t.y, g.playerActor()), `${s} is reachable`);
  }
  // fields: none on the creek, none under a building; drawn into the ground, not as props
  assert.ok(def.fields.length >= 5);
  for (const f of def.fields) for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) assert.equal(def.tiles[y][x], 'k', `${f.id} ${x},${y} is field`);
  assert.ok(!def.props.some((p) => p.type === 'crops'), 'no per-frame crop props');
  // street furniture never stands in the road, a building, the creek or a field
  for (const p of def.props) {
    if (!['streetlamp', 'bench', 'hydrant', 'trash', 'tree', 'mailbox', 'sign', 'flagpole', 'bush'].includes(p.type)) continue;
    assert.ok(!['=', 'B', '~', 'k'].includes(def.tiles[p.y][p.x]), `${p.type} at ${p.x},${p.y}`);
  }
  // two junctions with traffic lights and crossings on FM 38, and traffic round the blocks
  assert.equal(CONTENT.transit.junctions.filter((j) => j.map === 'lariat').length, 2);
  assert.ok(def.props.filter((p) => p.type === 'trafficlight').length >= 8);
  assert.ok(def.props.filter((p) => p.type === 'crosswalk').length >= 8);
  // the way in: the arch over FM 38 in Lariat, gateposts and a road sign at the city's North Gate
  assert.ok(def.props.some((p) => p.type === 'ranchgate'));
  const hv = CONTENT.maps.halvermouth;
  assert.equal(hv.props.filter((p) => p.id.startsWith('hv_north_gatepost')).length, 2);
  assert.ok(hv.props.some((p) => p.id === 'hv_north_roadsign'));
  assert.ok(!def.tiles.some((row) => row.includes('r')), 'no sea-wall border round an inland town');
});
