// Homes (v0.36.0): nobody sleeps at work; every resident has a home; break-ins
// (pick or force), being caught, stolen valuables; invitations by trust.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, run, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { validateContent } from '../tools/validate-content.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';

const fresh = (hhmm = '12:00') => {
  const g = newGame(11);
  setTime(g, 1, hhmm);
  noImpulses(g);
  return g;
};
/** Stand facing a door from the outside (the tile below it). */
const atDoor = (g, mapId, doorId) => {
  const m = g.maps.get(mapId);
  const d = m.doors.find((x) => x.id === doorId);
  g.changeMap(mapId, null, { x: (d.x + 0.5) * TILE, y: (d.y + 1.5) * TILE });
  g.player.facing = 'up';
  return d;
};
const stand = (g, s) => { for (let t = 0; t < s; t += 0.05) g.update(0.05, { x: 0, y: 0, sprint: false }); };

test('no beds in shops or workplaces; everyone who used to sleep at work has a home of their own; the checker catches a bed in a shop', () => {
  const L = CONTENT.life;
  for (const id of ['npc_mags', 'npc_tibbs', 'npc_delphine', 'npc_lawrence', 'npc_justin', 'npc_arthur', 'npc_max', 'npc_sal', 'npc_lucas', 'npc_julian', 'npc_marty', 'npc_wes']) {
    const [rid, unit] = L.homes[id].home.split('/');
    const map = L.residences[rid].units[unit].map;
    assert.ok(CONTENT.maps[map].home?.includes(id), `${id} lives in ${map}`);
    const sleep = CONTENT.characters[id].schedule.filter((b) => b.activity === 'sleep');
    assert.ok(sleep.length && sleep.every((b) => b.spot.startsWith(`${map}:`)), `${id} sleeps at home`);
  }
  for (const m of ['cafe', 'gun_shop', 'surplus', 'police_station', 'abacus', 'workshop', 'refinery', 'fender_office', 'hoof_horn', 'aw1', 'aw3']) {
    assert.ok(!CONTENT.maps[m].props.some((p) => p.type === 'bed' || p.type === 'cot'), `no bed in ${m}`);
  }
  assert.equal(validateContent().errors.length, 0);
  const cafe = { ...CONTENT.maps.cafe, props: [...CONTENT.maps.cafe.props, { id: 'sneaky_cot', type: 'cot', x: 2, y: 2 }] };
  const bad = validateContent({ ...CONTENT, maps: { ...CONTENT.maps, cafe } });
  assert.ok(bad.errors.some((e) => /cafe: a cot \(sneaky_cot\) outside a home/.test(e)));
});

test('everyone goes home at night: Mags, the Chief, Arthur and Lucas are in their own homes at 01:00', () => {
  const g = fresh('20:00');
  run(g, 5 * 60);
  for (const [id, map] of [['npc_mags', 'gullwing11_1'], ['npc_lawrence', 'harbourline_1'], ['npc_arthur', 'shack_arthur'], ['npc_lucas', 'atlas_1'], ['npc_marty', 'plumb_unit_5']]) {
    assert.equal(g.npcs.get(id).map, map, `${id} at ${g.npcs.get(id).map}`);
  }
});

test('a locked home: no way in without a pick or a crowbar; with a pick, stand still and it opens (quietly), unless the pick snaps', () => {
  const g = fresh('13:00');
  const d = atDoor(g, 'lanternside', 'door_b_to_let');
  assert.equal(g.playerCanPass(d), false);
  const t = g.interactables()[0];
  assert.equal(t.kind, 'home_door');
  const r = g.interact(t);
  assert.equal(r.type, 'choices');
  assert.equal(r.options.length, 1, 'only "leave it" without tools');
  g.inventory.add('item_lockpick', 3);
  assert.ok(g.interact(t).options.some((o) => o.call?.[1] === 'startPick'));
  g.rng.chance = () => false; // the pick holds
  assert.ok(g.homes.startPick(d.id).ok);
  stand(g, 7);
  assert.equal(g.homes.picking, null);
  assert.ok(g.playerCanPass(d), 'unlocked');
  run(g, 70);
  assert.equal(g.playerCanPass(d), false, 'locked again an hour later');
  // a snapped pick: one gone, door still shut
  g.rng.chance = () => true;
  const n = g.inventory.count('item_lockpick');
  g.homes.startPick(d.id);
  stand(g, 7);
  assert.equal(g.inventory.count('item_lockpick'), n - 1);
  assert.equal(g.playerCanPass(d), false);
});

test('forcing a door is loud — a witness sees it — and the resident who comes home to it calls the police', () => {
  const g = fresh('10:00');
  const flat = g.maps.get('apartments').doors.find((x) => x.id === 'door_plumb_5');
  g.changeMap('apartments', null, { x: (flat.x - 0.5) * TILE, y: (flat.y + 0.5) * TILE });
  g.player.facing = 'right';
  g.inventory.add('item_crowbar', 1);
  const crimes = [];
  g.bus.on('crime', (e) => crimes.push(e));
  const t = g.interactables().find((x) => x.kind === 'home_door');
  assert.ok(t, 'Marty\'s flat door');
  assert.ok(g.homes.force(t.id).ok);
  assert.ok(crimes.some((c) => c.fact === 'fact_player_burglary'));
  assert.ok(g.playerCanPass(flat));
  // Marty comes home in the evening and finds it
  const calls = g.police.state.incidents.length;
  g.changeMap('lanternside', 'start');
  setTime(g, 1, '23:00');
  run(g, 120);
  assert.ok(g.homes.state.open.door_plumb_5.noticed, 'Marty noticed');
  assert.ok(g.police.state.incidents.length > calls, 'and called the police');
});

test('inside: taking from the dresser is theft (marked, for the pawnshop); a resident who catches you shouts and it\'s burglary', () => {
  const g = fresh('14:00');
  g.homes.state.open.door_atlas_1 = { until: g.clock.total + 60 };
  g.changeMap('atlas_1', 'entry');
  const r = g.takeFromContainer('ct_atlas_1_dresser', 'item_gold_watch');
  assert.ok(r.ok && r.stolen, r.text);
  assert.equal(g.player.stolen.item_gold_watch, 'npc_lucas', 'stolen from Lucas');
  // Lucas walks in
  const lucas = g.npcs.get('npc_lucas');
  Object.assign(lucas, { map: 'atlas_1', x: g.player.x + TILE, y: g.player.y, activity: 'leisure' });
  const crimes = [];
  g.bus.on('crime', (e) => crimes.push(e));
  g.homes.catchIntruder();
  assert.ok(crimes.some((c) => c.fact === 'fact_player_burglary' && c.witnesses.includes('npc_lucas')));
  assert.ok(g.relationships.get(lucas, 'player').trust < 0);
});

test('invitations: ask someone round — not yet if they barely know you; once they trust you, their door opens (08:00–22:00), and it\'s saved', () => {
  const g = fresh('12:00');
  const mags = g.npcs.get('npc_mags');
  g.changeMap(mags.map, null, { x: mags.x + TILE, y: mags.y });
  const s = new DialogueSession(g, 'npc_mags');
  s.start();
  assert.ok(s.menuOptions().some((o) => o.id === 'home'));
  g.relationships.get(mags, 'player').trust = 0;
  g.relationships.get(mags, 'player').affection = 0;
  assert.equal(g.homes.askInvite(mags).ok, false);
  g.relationships.get(mags, 'player').trust = 30;
  const out = s.choose('home');
  assert.ok(out.pages.length);
  assert.ok(g.homes.invited('npc_mags'));
  const front = atDoor(g, 'lanternside', 'door_b_to_let');
  assert.ok(g.playerCanPass(front), 'the front door');
  assert.ok(g.playerCanPass(g.maps.get('gullwing11_hall').doors.find((x) => x.id === 'door_gullwing11_1')), 'her flat');
  assert.equal(g.playerCanPass(g.maps.get('gullwing11_hall').doors.find((x) => x.id === 'door_gullwing11_2')), false, 'not Tibbs\'s');
  setTime(g, 2, '23:30');
  assert.equal(g.playerCanPass(front), false, 'not at this hour');
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(JSON.parse(JSON.stringify(g.serialize())));
  assert.ok(g2.homes.invited('npc_mags'));
  // an invited guest isn't an intruder
  setTime(g2, 3, '12:00');
  g2.changeMap('gullwing11_1', 'entry');
  Object.assign(g2.npcs.get('npc_mags'), { map: 'gullwing11_1', x: g2.player.x + TILE, y: g2.player.y, activity: 'leisure' });
  const crimes = [];
  g2.bus.on('crime', (e) => crimes.push(e));
  g2.homes.catchIntruder();
  assert.equal(crimes.length, 0);
});
