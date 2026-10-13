// The Sums of Anarchy (v0.11.0): Arthur Anderson (imported, protected), his
// crew, calculators (temporary stat highs, comedowns, tolerance), customers
// won with samples, orders and referrals, gang anger, ambushes, truces, and
// the police seeing you deal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, besideNpc, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { isProtected, WRATH } from '../src/systems/combat.js';
import { CALC_TYPES, STATS } from '../src/systems/calculators.js';
import { DEAL_SPOTS } from '../src/systems/gang.js';
import { check } from '../src/sim/conditions.js';
import { runCommand } from '../src/game/debugCommands.js';
import { findPath } from '../src/world/pathfinding.js';

const CREW = ['npc_al', 'npc_percy', 'npc_minnie', 'npc_dee_nom', 'npc_tony', 'npc_max'];
const CUSTOMERS = Object.values(CONTENT.characters).filter((c) => c.customer).map((c) => c.id);
const tick = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) g.update(0.05, { x: 0, y: 0 }); };
const fresh = (seed = 1, day = 1, hhmm = '10:00') => {
  const g = newGame(seed);
  setTime(g, day, hhmm);
  noImpulses(g);
  return g;
};
const always = (g) => { g.rng.next = () => 0; };
const never = (g) => { g.rng.next = () => 0.999; };

test('the cast: Arthur is imported, protected and red-faced; six killable crew; twelve customers', () => {
  const a = CONTENT.characters.npc_arthur;
  assert.equal(a.origin, 'imported');
  assert.equal(a.faction, 'fac_sums');
  assert.ok(a.appearance.portrait?.startsWith('data:image/'), 'portrait from the supplied image');
  assert.ok(a.appearance.angry, 'always angry: flushed, scowling, steaming');
  assert.equal(a.wrath.theme, 'maths');
  for (const t of ['always angry', 'maths-obsessed', 'fiercely protective', 'petty', 'vengeful']) assert.ok(a.personality.traits.includes(t), t);
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_arthur')));
  assert.equal(CREW.length, 6);
  for (const id of CREW) {
    assert.equal(CONTENT.characters[id].faction, 'fac_sums', id);
    assert.ok(!isProtected(g.npcs.get(id)), `${id} can be killed`);
  }
  assert.equal(CUSTOMERS.length, 12);
  for (const id of CUSTOMERS) {
    const c = CONTENT.characters[id].customer;
    assert.ok(CALC_TYPES.includes(c.favourite) && c.budget > 0, id);
    assert.ok(!c.refers || CONTENT.characters[c.refers]?.customer, `${id} refers a real customer`);
  }
  assert.ok(CUSTOMERS.filter((id) => CONTENT.characters[id].customer.startsKnown).length >= 3);
  for (const t of CALC_TYPES) assert.ok(CUSTOMERS.some((id) => CONTENT.characters[id].customer.favourite === t), `someone favours ${t}`);
});

test('six calculators, one per stat plus health and energy, all contraband', () => {
  for (const t of CALC_TYPES) {
    const it = CONTENT.items[`item_calc_${t}`];
    assert.ok(it, t);
    assert.equal(it.use.calc, t);
    assert.ok(it.tags.includes('contraband'));
  }
  assert.deepEqual([...STATS], ['charm', 'wits', 'grit', 'finesse']);
});

test('a calculator high: +1 for hours, then a comedown; dialogue checks use the boosted stat', () => {
  const g = fresh(2);
  g.inventory.add('item_calc_wits', 1);
  assert.equal(g.stat('wits'), 2);
  const r = g.inventory.use('item_calc_wits');
  assert.ok(r.ok, r.text);
  assert.equal(g.stat('wits'), 3);
  assert.equal(g.player.stats.wits, 2, 'the base stat is untouched');
  run(g, 239, 1);
  assert.equal(g.stat('wits'), 3);
  run(g, 3, 1);
  assert.equal(g.stat('wits'), 1, 'comedown');
  run(g, 60, 1);
  assert.equal(g.stat('wits'), 2, 'back to normal');
});

test('tolerance: repeated use weakens and shortens the high until it does nothing; it fades with time', () => {
  const g = fresh(3);
  g.inventory.add('item_calc_charm', 6);
  g.inventory.use('item_calc_charm');
  const first = g.player.buffs.find((b) => b.source === 'high').until - g.clock.total;
  g.inventory.use('item_calc_charm');
  const second = g.player.buffs.find((b) => b.source === 'high').until - g.clock.total;
  assert.ok(second < first, `${second} < ${first}`);
  g.inventory.use('item_calc_charm');
  g.inventory.use('item_calc_charm');
  const r = g.inventory.use('item_calc_charm');
  assert.match(r.text, /tolerance/);
  const t = g.player.tolerance.charm;
  run(g, 8 * 60 + 2, 2);
  assert.equal(g.player.tolerance.charm, t - 1, 'a point fades every 8 hours');
});

test('Plus Pack heals; Overclock boosts energy now and crashes later', () => {
  const g = fresh(4);
  g.player.health = 30;
  g.inventory.add('item_calc_health', 1);
  g.inventory.use('item_calc_health');
  assert.equal(g.player.health, 70);
  g.player.energy = 20;
  g.inventory.add('item_calc_energy', 1);
  g.inventory.use('item_calc_energy');
  assert.equal(g.player.energy, 65);
  run(g, 182, 1);
  assert.ok(g.player.energy < 65, 'the crash');
});

test('Grit soaks damage', () => {
  const g = fresh(5);
  g.rng.next = () => 0.5;
  g.player.health = 100;
  g.combat.damagePlayer(20, null);
  const normal = 100 - g.player.health;
  g.player.health = 100;
  g.combat.playerDownUntil = 0;
  g.player.stats.grit = 5;
  g.combat.damagePlayer(20, null);
  assert.ok(100 - g.player.health < normal, `${100 - g.player.health} < ${normal}`);
});

test('Minnie sells calculators at the Abacus — until the gang turns hostile', () => {
  const g = fresh(6, 1, '12:00');
  const minnie = g.npcs.get('npc_minnie');
  assert.equal(minnie.map, 'abacus');
  const topic = CONTENT.dialogues.dlg_minnie.topics.find((t) => t.id === 't_minnie_buy');
  assert.ok(check(topic.if, g, minnie));
  assert.equal(topic.effects[0].openShop, 'shop_sums');
  for (const t of CALC_TYPES) assert.ok(CONTENT.shops.shop_sums.stock[`item_calc_${t}`] > 0, t);
  g.gang.addAnger(55);
  assert.ok(!check(topic.if, g, minnie), '"We don\'t sell to rats."');
});

test('samples: strangers won\'t talk; a gang customer who likes it is stolen from the gang', () => {
  const g = fresh(7, 1, '09:00');
  const lena = g.npcs.get('npc_lena');
  assert.equal(g.gang.customer('npc_lena').status, 'locked');
  g.inventory.add('item_calc_finesse', 2);
  assert.match(g.gang.sample(lena).text, /vouch/);
  const ray = g.npcs.get('npc_ray');
  assert.equal(g.gang.customer('npc_ray').status, 'gang');
  never(g);
  g.inventory.add('item_calc_energy', 2);
  const no = g.gang.sample(ray);
  assert.ok(!no.ok);
  assert.equal(g.inventory.count('item_calc_energy'), 1, 'the sample is gone either way');
  assert.ok(g.gang.customer('npc_ray').warmth > 0, 'he warms to you');
  always(g);
  const yes = g.gang.sample(ray);
  assert.ok(yes.ok, yes.text);
  assert.equal(g.gang.customer('npc_ray').status, 'player');
  assert.equal(g.world.gang.anger, 12, 'the gang notices');
  assert.ok(g.knowledge.knows(g.npcs.get('npc_arthur'), 'fact_player_stole_customer'));
  assert.ok(g.gang.sampleChance(ray, 'energy') > g.gang.sampleChance(ray, 'grit'), 'their favourite works best');
});

test('orders: a customer pages you, waits at the spot during the window, pays on delivery, and refers a friend after three', () => {
  const g = fresh(8, 1, '07:00');
  g.gang.customer('npc_mo').status = 'player';
  always(g);
  run(g, 61, 1); // 08:00 — orders go out
  const o = g.gang.customer('npc_mo').order;
  assert.ok(o, 'Mo pages an order');
  assert.ok(DEAL_SPOTS.includes(o.spot));
  assert.equal(o.until - o.from, 120);
  setTime(g, 1, `${String(Math.floor((o.from % 1440) / 60)).padStart(2, '0')}:00`);
  run(g, 2, 1);
  const mo = g.npcs.get('npc_mo');
  assert.equal(mo.intent?.source, 'deal', 'heads to the meeting spot');
  assert.ok(check({ gang: { order: 'due' } }, g, mo));
  assert.ok(!g.gang.deliver(mo).ok, 'not without the goods');
  g.inventory.add(`item_calc_${o.type}`, 10);
  g.player.money = 0;
  const r = g.gang.deliver(mo);
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, o.qty * o.price);
  assert.equal(g.gang.customer('npc_mo').orders, 1);
  for (let i = 0; i < 2; i++) {
    g.gang.newOrder(mo);
    g.gang.customer('npc_mo').order.from = g.clock.total - 1;
    g.gang.deliver(mo);
  }
  assert.equal(g.gang.customer('npc_lena').status, 'gang', 'Mo vouches for you with Lena');
});

test('missed orders sour a customer until they go back to the gang', () => {
  const g = fresh(9, 1, '09:00');
  const c = g.gang.customer('npc_dot');
  c.status = 'player';
  c.satisfaction = 15;
  const dot = g.npcs.get('npc_dot');
  always(g);
  const o = g.gang.newOrder(dot);
  g.clock.total = o.until + 1;
  g.minuteTick();
  assert.equal(c.order, null);
  assert.equal(c.status, 'gang', '"I\'m going back to Minnie."');
});

test('dealing in front of an officer gets you Wanted; the Sumps itself never calls the police', () => {
  const g = fresh(10, 1, '08:00'); // Officer Tee on the Sumps gate
  besideNpc(g, 'npc_warren');
  g.gang.dealt();
  assert.equal(g.world.police.wanted, 1);
  assert.ok(g.npcs.get('npc_warren').pursuit);
  const g2 = fresh(11, 1, '10:00');
  besideNpc(g2, 'npc_al');
  for (const o of g2.police.activeOfficers()) o.map = 'jail';
  g2.world.police.record = 20; // not lax any more
  g2.gang.dealt();
  assert.equal(g2.world.police.calls.length, 0, 'no snitches in the Sumps');
  // bribed: the officer looks away (owner: bribes cover dealing like other crimes)
  const g3 = fresh(12, 1, '08:00');
  g3.world.police.bribedUntilDay = 5;
  besideNpc(g3, 'npc_warren');
  g3.gang.dealt();
  assert.equal(g3.world.police.wanted, 0);
});

test('anger: a warning at 25; at 50 the crew jump you in the Sumps (not elsewhere); at 75 they hunt you across the city', () => {
  const g = fresh(13, 1, '10:00');
  g.gang.addAnger(26);
  assert.equal(g.gang.tier(), 1);
  assert.ok(g.world.gang.warned);
  g.gang.addAnger(25);
  assert.equal(g.gang.tier(), 2);
  const al = besideNpc(g, 'npc_al');
  tick(g, 0.1);
  assert.equal(al.hostile?.mode, 'fight', 'Al jumps you in the Sumps');
  const g2 = fresh(14, 1, '10:00');
  g2.gang.addAnger(55);
  const al2 = g2.npcs.get('npc_al');
  g2.changeMap('halvermouth', 'plaza_center');
  al2.map = 'halvermouth'; al2.x = g2.player.x + 30; al2.y = g2.player.y;
  tick(g2, 0.1);
  assert.ok(!al2.hostile, 'not off their turf');
  g2.gang.addAnger(25);
  tick(g2, 0.1);
  assert.equal(al2.hostile?.mode, 'fight', 'at war: anywhere in Halvermouth');
  run(g2, 2, 1);
  assert.ok([...g2.npcs.values()].some((n) => n.intent?.source === 'hunt'), 'they send people looking for you');
});

test('truce: tribute cools them off; handing back half your customers buys a week — break it and it\'s war', () => {
  const g = fresh(15);
  g.gang.addAnger(60);
  g.player.money = 1000;
  const price = g.gang.tributePrice();
  assert.ok(g.gang.tribute().ok);
  assert.equal(g.player.money, 1000 - price);
  assert.equal(g.world.gang.anger, 25);
  for (const id of ['npc_ray', 'npc_mo', 'npc_dot']) g.gang.customer(id).status = 'player';
  const r = g.gang.split();
  assert.ok(r.ok, r.text);
  assert.equal(g.gang.playerCustomers().length, 1, 'half, rounded up, go back');
  assert.ok(g.gang.truce());
  assert.ok(g.world.gang.anger <= 10);
  always(g);
  g.inventory.add('item_calc_grit', 1);
  g.gang.sample(g.npcs.get('npc_bill'));
  assert.ok(!g.gang.truce(), 'truce broken');
  assert.ok(g.world.gang.anger >= 50);
});

test('hurting the crew enrages them; Arthur himself is untouchable — division by zero', () => {
  const g = fresh(16, 1, '10:00');
  const al = besideNpc(g, 'npc_al');
  g.combat.hitNpc(al, 999, { weapon: g.combat.weaponDef('item_rifle'), dir: { x: -1, y: 0 }, lethal: true });
  assert.ok(al.dead);
  assert.ok(g.world.gang.anger >= 40);
  const g2 = fresh(17, 1, '10:00');
  const arthur = besideNpc(g2, 'npc_arthur');
  g2.combat.hitNpc(arthur, 999, { weapon: g2.combat.weaponDef('item_rifle'), dir: { x: -1, y: 0 }, lethal: true });
  assert.ok(g2.combat.wrath);
  assert.equal(g2.combat.wrath.theme, 'maths');
  assert.ok(!arthur.dead && arthur.health === undefined);
  tick(g2, WRATH.end + 0.5);
  g2.combat.riseAgain();
  assert.equal(g2.player.map, 'player_flat', 'you wake at home');
});

test('the Wrath theme and strike sound exist', async () => {
  const { THEMES } = await import('../src/engine/wrath.js');
  assert.ok(THEMES.maths?.strike && THEMES.maths.finale);
  const { SFX } = await import('../src/audio/sfx.js');
  assert.equal(typeof SFX.sfx_digit, 'function');
});

test('the gang and the police trade insults when they cross paths', () => {
  const g = fresh(18, 1, '10:00');
  const al = g.npcs.get('npc_al');
  const warren = g.npcs.get('npc_warren');
  warren.map = al.map; warren.x = al.x + 40; warren.y = al.y; warren.activity = 'patrol';
  const brawls = [];
  g.bus.on('gang:brawl', (e) => brawls.push(e));
  g.gang.brawls();
  assert.ok(brawls.some((b) => b.gang === 'npc_al' && b.cop === 'npc_warren'));
});

test('jail confiscates calculators', () => {
  const g = fresh(19);
  g.inventory.add('item_calc_wits', 3);
  g.police.sendToJail('arrested');
  assert.equal(g.inventory.count('item_calc_wits'), 0);
});

test('gang state survives save/load; old saves gain it', () => {
  const g = fresh(20);
  g.gang.addAnger(30);
  g.gang.customer('npc_ray').status = 'player';
  g.inventory.add('item_calc_wits', 1);
  g.inventory.use('item_calc_wits');
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(state);
  assert.equal(g2.world.gang.anger, 30);
  assert.equal(g2.gang.customer('npc_ray').status, 'player');
  assert.equal(g2.stat('wits'), 3, 'still high after loading');
  delete state.world.gang;
  delete state.player.buffs;
  delete state.player.tolerance;
  const g3 = new Game(CONTENT, { seed: 1 });
  g3.loadState(state);
  assert.equal(g3.world.gang.anger, 0);
  assert.equal(Object.keys(g3.world.gang.customers).length, 12);
  assert.equal(g3.stat('wits'), 2);
});

test('debug commands: calcs, gang, customer, order', () => {
  const g = fresh(21);
  runCommand(g, 'calcs 2');
  assert.equal(g.inventory.count('item_calc_grit'), 2);
  runCommand(g, 'gang 60');
  assert.equal(g.gang.tier(), 2);
  runCommand(g, 'customer bill player');
  assert.equal(g.gang.customer('npc_bill').status, 'player');
  assert.ok(runCommand(g, 'order gus').ok);
  assert.ok(g.gang.customer('npc_gus').order);
});

test('the Abacus is walkable: bar, office, bunks', () => {
  const g = newGame();
  const m = g.maps.get('abacus');
  const e = m.spots.entry;
  for (const s of ['bar_front', 'arthur_desk', 'arthur_bed', 'bunk_1', 'bunk_5', 'pool', 'table_b', 'hall_couch']) assert.ok(findPath(m, e.x, e.y, m.spots[s].x, m.spots[s].y), s);
  void TILE;
});

test('the Abacus counter: Minnie serves you across it while she\'s behind it, and not once the gang is hostile', () => {
  const g = fresh(22, 1, '12:00');
  g.changeMap('abacus', 'bar_front');
  const counter = g.maps.get('abacus').def.props.find((p) => p.id === 'ab_counter');
  assert.equal(g.interact({ kind: 'prop', id: counter.id }).type, 'shop');
  g.gang.addAnger(55);
  assert.equal(g.interact({ kind: 'prop', id: counter.id }).type, 'message');
  setTime(g, 1, '06:00'); // Minnie asleep
  g.gang.addAnger(-55);
  g.changeMap('abacus', 'bar_front');
  assert.match(g.interact({ kind: 'prop', id: counter.id }).text, /Nobody/);
});
