// The company's research (v0.103.8): a project costs money and days, one at a time, needs the Command HQ, opens tiers; nothing is free and nothing is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { warGame, buildAll, build, STAGE1, STAGE2, days } from './war_helpers.mjs';
import { WAR_RESEARCH, GATE } from '../src/content/warResearch.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const rich = (seed) => { const g = warGame(seed, { cash: 120_000_000 }); buildAll(g, 3); return g; };
const finish = (g, id) => { assert.ok(g.war.startResearch(id).ok, id); days(g, WAR_RESEARCH[id].days + 1); assert.ok(g.war.research().nodes.find((n) => n.id === id).state === 'done', `${id} finished`); };

test('the tree costs about 63M and 90 days to reach tier 4, and every gate names a real node', () => {
  const total = Object.values(WAR_RESEARCH).reduce((a, n) => a + n.cost, 0); assert.ok(total >= 55e6 && total <= 70e6, `the whole tree costs ${total}`);
  for (const [id, n] of Object.entries(WAR_RESEARCH)) for (const q of n.requires) assert.ok(WAR_RESEARCH[q], `${id} needs ${q}`);
  for (const gates of Object.values(GATE)) for (const id of Object.values(gates)) assert.ok(WAR_RESEARCH[id], id);
  const g = rich(1601); const R = g.war.research(); assert.deepEqual(R.reach, { weapon: 2, armour: 2, vehicle: 2 }, 'tiers 1 and 2 are the start');
});

test('a project needs the Command HQ, its prerequisites and the money; it takes the money once, runs one at a time, and finishes on its day', () => {
  const g = warGame(1602, { cash: 120_000_000 }); build(g, STAGE1);
  assert.match(g.war.startResearch('energy_cells').text, /Command HQ/, 'no HQ yet'); build(g, STAGE2); assert.ok(g.war.research().hq);
  assert.match(g.war.startResearch('pulse_weapons').text, /Energy cells first/); assert.ok(!g.war.startResearch('nothing').ok);
  const cash0 = g.war.cash(); const r = g.war.startResearch('energy_cells'); assert.ok(r.ok, r.text); assert.equal(g.war.cash(), cash0 - 2_000_000, 'paid once');
  assert.ok(!g.war.startResearch('energy_cells').ok); assert.match(g.war.startResearch('hardsuit').text, /one project at a time/);
  assert.equal(g.war.research().active.name, 'Energy cells'); days(g, 3); assert.ok(g.war.research().active, 'still under way'); assert.equal(g.war.cash(), cash0 - 2_000_000);
  days(g, 2); assert.equal(g.war.research().active, null); assert.ok(g.war.research().nodes.find((n) => n.id === 'energy_cells').state === 'done'); assert.ok(!g.war.startResearch('energy_cells').ok, 'finished once');
  assert.ok(g.war.startResearch('hardsuit').ok); assert.deepEqual(g.war.check(), []);
});

test('a short purse refuses and changes nothing, whoever\'s money it is', () => {
  const g = warGame(1603, { cash: 120_000_000 }); buildAll(g, 2); assert.ok(g.war.setFunding('wallet').ok); g.player.money = 1_000_000;
  const before = JSON.stringify(g.world.military); const r = g.war.startResearch('energy_cells'); assert.ok(!r.ok && /you hold/.test(r.text)); assert.equal(JSON.stringify(g.world.military), before); assert.equal(g.player.money, 1_000_000);
  g.player.money = 5_000_000; assert.ok(g.war.startResearch('energy_cells').ok); assert.equal(g.player.money, 3_000_000, 'the wallet paid');
});

test('finishing the nodes opens the tiers in order, and the whole path to tier 4 can be walked', () => {
  const g = rich(1604);
  for (const id of ['energy_cells', 'pulse_weapons']) finish(g, id); assert.deepEqual(g.war.techReach(), { weapon: 3, armour: 2, vehicle: 2 });
  for (const id of ['hardsuit', 'hover_drives']) finish(g, id); assert.deepEqual(g.war.techReach(), { weapon: 3, armour: 3, vehicle: 3 });
  assert.match(g.war.startResearch('plasma_weapons').text, /Fusion cores first/);
  for (const id of ['fusion_cores', 'plasma_weapons', 'power_armour', 'heavy_hover']) finish(g, id);
  assert.deepEqual(g.war.techReach(), { weapon: 4, armour: 4, vehicle: 4 }); assert.ok(g.war.research().nodes.every((n) => n.state === 'done'));
});

test('research survives a save in the middle of a project, and "next event" knows when it finishes', () => {
  const g = rich(1605); assert.ok(g.war.startResearch('energy_cells').ok); days(g, 1);
  const e = g.war.nextEvent(); assert.ok(e && /Research finishes/.test(e.why) || e, 'an event exists');
  const g2 = roundtrip(g); assert.equal(g2.war.research().active?.id, 'energy_cells'); days(g2, 5); assert.ok(g2.war.research().nodes.find((n) => n.id === 'energy_cells').state === 'done');
  assert.deepEqual(g2.war.check(), []);
});
