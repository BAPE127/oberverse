// The global arms market and heavy weapons (v0.14.0): countries, wars,
// embargoes, shipping, insurance, heat; RPGs, missiles and drones — which
// never harm imported characters, unless you hit one directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { isProtected } from '../src/systems/combat.js';
import { runCommand } from '../src/game/debugCommands.js';

const fresh = (seed = 1, hhmm = '10:00') => {
  const g = newGame(seed);
  setTime(g, 1, hhmm);
  noImpulses(g);
  return g;
};
/** Licensed, owns Yard 1, with cargo in the export cage. */
const exporter = (seed = 1, cargo = { item_pistol: 10, item_assault_rifle: 4 }) => {
  const g = fresh(seed);
  runCommand(g, 'works aw1');
  Object.assign(g.world.containers.ct_aw1_cage.items, cargo);
  g.player.money = 5000;
  return g;
};
const minutes = (g, n) => { for (let i = 0; i < n; i++) { g.clock.total += 1; g.minuteTick(); } };
/** Put an NPC at a spot on the player's map, standing still. */
const put = (g, id, x, y) => {
  const n = g.npcs.get(id);
  n.map = g.player.map; n.x = x; n.y = y; n.path = null; n.hostile = null; n.inDialogue = false; n.dead = false; n.downUntil = 0; n.health = undefined;
  return n;
};

test('content: eight countries with economies, five shippers (two run embargoes), a war and an embargo at the start', () => {
  const c = CONTENT.arms;
  assert.equal(Object.keys(c.countries).length, 8);
  for (const [id, x] of Object.entries(c.countries)) {
    assert.ok(x.budget > 0 && x.income > 0, id);
    for (const f of ['small', 'heavy', 'missile', 'drone']) assert.ok(x.wants[f] > 0, `${id} ${f}`);
    for (const r of x.rivals) assert.ok(c.countries[r], `${id} rival ${r}`);
  }
  assert.equal(Object.keys(c.shippers).length, 5);
  assert.equal(Object.values(c.shippers).filter((s) => s.embargo).length, 2);
  const g = newGame();
  assert.ok(g.market.warOf('varn') && g.market.enemyOf('varn') === 'caldera');
  assert.ok(g.market.country('pallas').embargo);
});

test('prices: value × the country\'s wants × a war boost, falling as you flood a market; hostile countries refuse', () => {
  const g = exporter(2);
  const v = g.arms.value('item_assault_rifle');
  assert.equal(g.market.price('lirre', 'item_assault_rifle'), Math.round(v * 1.0), 'neutral Lirre pays value');
  assert.equal(g.market.price('varn', 'item_assault_rifle'), Math.round(v * 1.2 * 1.5), 'Varnistan wants small arms, and is at war');
  g.market.country('lirre').sat.small = 0.3;
  assert.equal(g.market.price('lirre', 'item_assault_rifle'), Math.round(v * 0.7));
  g.market.country('sund').hostility = 70;
  assert.equal(g.market.price('sund', 'item_assault_rifle'), 0);
  assert.equal(g.market.price('lirre', 'item_coffee'), 0, 'only arms');
});

test('shipping: fee up front, cargo out of the cage, the buyer reserves the price; the shipper\'s rules apply', () => {
  const g = exporter(3);
  const budget = g.market.country('varn').budget;
  const value = g.market.quote('varn', { item_pistol: 5 });
  const r = g.market.ship({ wh: 'aw1', country: 'varn', shipper: 'morrow', insured: true, items: { item_pistol: 5 } });
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, 5000 - Math.round(value * 0.1) - Math.round(value * 0.08));
  assert.equal(g.world.containers.ct_aw1_cage.items.item_pistol, 5);
  assert.equal(g.market.country('varn').budget, budget - value);
  assert.equal(g.market.country('caldera').hostility, 5, 'arming one side annoys the other');
  assert.match(g.market.ship({ wh: 'aw1', country: 'pallas', shipper: 'morrow', items: { item_pistol: 1 } }).text, /embargoed/);
  assert.ok(g.market.ship({ wh: 'aw1', country: 'pallas', shipper: 'ghost', items: { item_pistol: 1 } }).ok, 'the Ghost Fleet will run it');
  assert.match(g.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'morrow', items: { item_pistol: 99 } }).text, /Only/);
  g.market.country('sund').budget = 100;
  assert.match(g.market.ship({ wh: 'aw1', country: 'sund', shipper: 'morrow', items: { item_assault_rifle: 4 } }).text, /afford/);
  const g2 = fresh(4);
  Object.assign(g2.world.containers.ct_aw1_cage.items, { item_pistol: 2 });
  g2.player.money = 999;
  assert.match(g2.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'morrow', items: { item_pistol: 1 } }).text, /licence/);
});

test('arrival: delivered and paid after the shipper\'s days; buyers saturate', () => {
  const g = exporter(5);
  const r = g.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'stork', items: { item_pistol: 10 } });
  g.rng.next = () => 0; // it gets there
  const money = g.player.money;
  minutes(g, 1439);
  assert.equal(g.market.state.shipments.length, 1, 'a day in the air');
  minutes(g, 2);
  assert.equal(g.market.state.shipments.length, 0);
  assert.equal(g.player.money, money + r.shipment.value);
  assert.ok(g.market.country('lirre').sat.small > 0);
});

test('losses: insurance pays part of it back; seized embargo runs are traced to you; seizure by an enemy makes them hostile', () => {
  const g = exporter(6);
  g.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'halver', insured: true, items: { item_pistol: 4 } });
  const shp = g.market.state.shipments[0];
  g.rng.next = () => 0.999; // lost
  const money = g.player.money;
  const fate = g.market.resolve(shp);
  assert.ok(['sunk', 'hijacked', 'seized'].includes(fate));
  assert.equal(g.player.money, money + Math.round(shp.value * 0.6), 'insurance');
  // an embargo run, seized
  const g2 = exporter(7);
  g2.market.ship({ wh: 'aw1', country: 'pallas', shipper: 'pipecreek', insured: true, items: { item_pistol: 2 } });
  const s2 = g2.market.state.shipments[0];
  let k = 0;
  g2.rng.next = () => (k++ === 0 ? 0.999 : 0); // lost, and the fate roll picks "seized"
  const m2 = g2.player.money;
  assert.equal(g2.market.resolve(s2), 'seized');
  assert.equal(g2.player.money, m2, 'insurers don\'t cover smuggling');
  assert.ok(g2.world.police.wanted >= 2, 'customs traced it to you');
  assert.ok(g2.world.police.record >= 8);
  // seized by the buyer's enemy
  const g3 = exporter(8);
  g3.market.ship({ wh: 'aw1', country: 'varn', shipper: 'halver', items: { item_pistol: 2 } });
  const s3 = g3.market.state.shipments[0];
  k = 0;
  g3.rng.next = () => (k++ === 0 ? 0.999 : 0.9); // lost; the third fate: seized
  assert.equal(g3.market.resolve(s3), 'seized');
  assert.ok(g3.market.country('caldera').hostility >= 35, 'Caldera seized it and is furious');
});

test('the world turns: wars end after a while, rivals start new ones, aggressors get embargoed, budgets recover', () => {
  const g = fresh(9);
  runCommand(g, 'peace');
  g.market.country('varn').budget = 0;
  g.rng.next = () => 0; // every roll lands
  g.market.dailyTick();
  assert.ok(g.market.state.wars.length >= 1, 'war breaks out');
  const w = g.market.state.wars[0];
  assert.ok(CONTENT.arms.countries[w.a].rivals.includes(w.b));
  assert.ok(g.market.country(w.a).embargo, 'the aggressor is embargoed');
  assert.ok(g.market.country('varn').budget > 0);
  assert.ok(g.market.state.news[0].text.length > 0);
  g.clock.total += 10 * 1440;
  let k = 0;
  g.rng.next = () => (k++ === 0 ? 0 : 0.999); // the war ends; nothing new starts
  g.market.dailyTick();
  assert.ok(!g.market.state.wars.includes(w), 'ceasefire');
  assert.ok(!g.market.country(w.a).embargo, 'war embargo lifted');
});

test('market state survives save/load', () => {
  const g = exporter(10);
  g.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'morrow', items: { item_pistol: 3 } });
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(state);
  assert.equal(g2.market.state.shipments.length, 1);
  delete state.world.market;
  const g3 = new Game(CONTENT, { seed: 1 });
  g3.loadState(state);
  assert.ok(g3.market.warOf('varn'), 'old saves get the starting world');
});

// ---------------------------------------------------------------- heavy weapons
test('an RPG rocket explodes: it hurts everyone in the blast — except imported characters — and it is a major crime', () => {
  const g = fresh(11, '12:00');
  g.changeMap('yards', 'yard_center'); // an empty yard: nobody else in the line of fire
  const p = g.player;
  const mason = put(g, 'npc_mason', p.x + 6 * TILE, p.y);
  const dee = put(g, 'npc_dee', p.x + 6 * TILE + 20, p.y + 10);
  runCommand(g, 'heavy');
  g.combat.equip('item_rpg');
  g.player.mags.item_rpg = 1;
  g.player.aim = null;
  g.player.facing = 'right';
  // aim just past Mason so the rocket doesn't hit him directly
  g.player.aim = { x: 1, y: 0.5 };
  g.player.y -= 0;
  const r = g.combat.attack();
  assert.ok(r.projectile);
  assert.equal(g.heavy.projectiles.length, 1);
  // detonate it by hand right between them
  g.heavy.projectiles = [];
  g.heavy.explode(p.x + 6 * TILE + 10, p.y + 5, 2.5, 110);
  assert.ok(dee.dead || dee.health < 100 || dee.downUntil, 'Dee took the blast');
  assert.equal(mason.health, undefined, 'not a scratch on Mason');
  assert.ok(!g.combat.wrath, 'a blast is not an attack on him');
  assert.ok(g.world.police.record >= 10, 'explosives: a major crime');
});

test('a rocket that hits an imported character directly calls down their Wrath', () => {
  const g = fresh(12, '12:00');
  g.changeMap('yards', 'yard_center'); // an empty yard: nobody else in the line of fire
  const p = g.player;
  put(g, 'npc_mason', p.x + 4 * TILE, p.y);
  g.heavy.launchRocket(p.x, p.y - 18, { x: 1, y: 0 }, { range: 16, damage: 110, blast: 2.5 });
  for (let i = 0; i < 40 && !g.combat.wrath; i++) g.heavy.update(0.05);
  assert.equal(g.combat.wrath?.npcId, 'npc_mason');
});

test('guided missiles and drones never lock on to imported characters', () => {
  const g = fresh(13, '12:00');
  g.changeMap('yards', 'yard_center'); // an empty yard: nobody else in the line of fire
  const p = g.player;
  put(g, 'npc_mason', p.x + 2 * TILE, p.y);
  const dee = put(g, 'npc_dee', p.x + 8 * TILE, p.y);
  g.heavy.use('guided');
  assert.equal(g.heavy.projectiles[0].target, 'npc_dee');
  g.heavy.projectiles = [];
  // a hornet goes for whoever is fighting you — never Mason
  dee.hostile = { mode: 'fight', until: g.clock.total + 30 };
  g.heavy.use('drone_attack');
  for (let i = 0; i < 200 && g.heavy.drones.length; i++) g.heavy.update(0.05);
  assert.equal(g.heavy.drones.length, 0, 'the hornet dove');
  assert.ok(dee.dead || dee.health < 100 || dee.downUntil);
  assert.equal(g.npcs.get('npc_mason').health, undefined);
  assert.ok(!g.combat.wrath);
  // with only Mason around, a drone just hovers
  dee.dead = true;
  g.heavy.use('drone_strike');
  for (let i = 0; i < 100; i++) g.heavy.update(0.05);
  assert.equal(g.heavy.drones[0].target, null);
  assert.ok(isProtected(g.npcs.get('npc_mason')));
});

test('a Longbow strikes where you aim, 2.5 seconds later — stand clear', () => {
  const g = fresh(14, '12:00');
  g.changeMap('yards', 'yard_center'); // an empty yard: nobody else in the line of fire
  g.player.aim = { x: 2 * TILE, y: 0 };
  g.inventory.add('item_missile_cruise', 1);
  const r = g.inventory.use('item_missile_cruise');
  assert.ok(r.ok, r.text);
  assert.equal(g.heavy.strikes.length, 1);
  const h0 = g.player.health;
  for (let i = 0; i < 40; i++) { g.realTime += 0.05; g.heavy.update(0.05); }
  assert.equal(g.heavy.strikes.length, 1, 'not yet');
  for (let i = 0; i < 20; i++) { g.realTime += 0.05; g.heavy.update(0.05); }
  assert.equal(g.heavy.strikes.length, 0);
  assert.ok(g.player.health < h0, 'two tiles away is far too close');
});

test('debug: heavy, war, peace, arrive, nextday', () => {
  const g = exporter(15);
  runCommand(g, 'heavy');
  assert.equal(g.inventory.count('item_drone_strike'), 2);
  runCommand(g, 'war sund ostmark');
  assert.equal(g.market.enemyOf('sund'), 'ostmark');
  runCommand(g, 'peace');
  assert.equal(g.market.state.wars.length, 0);
  g.market.ship({ wh: 'aw1', country: 'lirre', shipper: 'morrow', items: { item_pistol: 1 } });
  assert.ok(runCommand(g, 'arrive').ok);
  assert.equal(g.market.state.shipments.length, 0);
  assert.ok(runCommand(g, 'nextday').ok);
});
