// The police (v0.10.0): Chief Lawrence Order (imported, protected), five armed
// officers who walk every area, a criminal record and Wanted stars, calls and
// dispatch, bribes and fines, arrest, jail, and four ways out of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, besideNpc, noImpulses, CONTENT, Game, TILE } from './helpers.mjs';
import { isProtected, WRATH } from '../src/systems/combat.js';
import { KNOWN_CRIMINAL, BRIBE_DAYS } from '../src/systems/police.js';
import { check } from '../src/sim/conditions.js';
import { parseSpotRef } from '../src/core/util.js';
import { runCommand } from '../src/game/debugCommands.js';
import { findPath } from '../src/world/pathfinding.js';

const OFFICERS = ['npc_justin', 'npc_warren', 'npc_bailey', 'npc_miranda', 'npc_hugh'];
const tick = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) g.update(0.05, { x: 0, y: 0 }); };
const crime = (g, fact, witnesses = [], victim) => g.bus.emit('crime', { fact, witnesses, victim, map: g.player.map, x: g.player.x, y: g.player.y });
const fresh = (seed = 1, day = 1, hhmm = '10:00') => {
  const g = newGame(seed);
  setTime(g, day, hhmm);
  noImpulses(g);
  return g;
};
test('the cast: Chief Order is imported and protected; five armed, killable officers; a cellmate', () => {
  const lawrence = CONTENT.characters.npc_lawrence;
  assert.equal(lawrence.origin, 'imported');
  assert.equal(lawrence.name, 'Lawrence Order');
  assert.ok(lawrence.appearance.portrait?.startsWith('data:image/'), 'portrait embedded from the supplied image');
  assert.equal(lawrence.faction, 'fac_police');
  assert.equal(lawrence.wrath.theme, 'law');
  assert.equal(lawrence.wrath.after, 'jail');
  assert.equal(lawrence.wrath.banner, 'YOU HAVE THE RIGHT TO REMAIN SILENT');
  const g = newGame();
  assert.ok(isProtected(g.npcs.get('npc_lawrence')));
  for (const id of OFFICERS) {
    const o = CONTENT.characters[id];
    assert.equal(o.faction, 'fac_police', id);
    assert.equal(o.origin, 'imported-generated', id);
    assert.ok(CONTENT.items[o.combat.weapon]?.weapon, `${id} carries a real weapon (${o.combat.weapon})`);
    assert.ok(o.combat.fights, `${id} fights`);
    assert.ok(!isProtected(g.npcs.get(id)), `${id} can be killed`);
  }
  assert.ok(!g.police.isOfficer(g.npcs.get('npc_petty')), 'Petty is a prisoner, not a cop');
  assert.ok(!g.police.activeOfficers().some((o) => o.id === 'npc_lawrence'), 'the Chief does not chase anyone');
});

test('Chief Order never leaves the precinct; his officers walk all four areas between them', () => {
  const mapsOf = (id) => CONTENT.characters[id].schedule.map((b) => parseSpotRef(b.spot).map);
  assert.deepEqual([...new Set(mapsOf('npc_lawrence'))], ['police_station']);
  const regionOf = (mapId) => (['lanternside', 'westbrook', 'ober_fields'].includes(mapId) ? mapId : mapId === 'halvermouth' ? 'halvermouth' : null);
  const areas = new Set(OFFICERS.flatMap(mapsOf).map(regionOf).filter(Boolean));
  assert.deepEqual([...areas].sort(), ['halvermouth', 'lanternside', 'ober_fields', 'westbrook']);
  for (const id of OFFICERS) assert.ok(mapsOf(id).includes('police_station') || mapsOf(id).includes('jail'), `${id} reports to the precinct`);
});

test('every officer and the chief live a full day across the maps without errors', () => {
  const g = fresh(2, 1, '00:00');
  run(g, 24 * 60, 1);
  assert.deepEqual(g.warnings.filter((w) => /lawrence|justin|warren|bailey|miranda|hugh|petty/.test(w)), []);
  setTime(g, 2, '15:30');
  assert.equal(g.npcs.get('npc_lawrence').map, 'police_station');
  assert.equal(g.npcs.get('npc_hugh').map, 'ober_fields');
  setTime(g, 2, '02:00');
  assert.equal(g.npcs.get('npc_hugh').map, 'jail');
  assert.equal(g.npcs.get('npc_hugh').activity, 'sleep', 'Jury dozes at the desk 01:00–04:00');
});

test('a lax chief: petty crime is shrugged off until you are a known criminal', () => {
  const g = fresh(3);
  crime(g, 'fact_player_trespassed_x', ['npc_justin']);
  assert.equal(g.world.police.wanted, 0, '"not worth the paperwork"');
  assert.equal(g.world.police.record, 1, 'but it goes on the record');
  g.world.police.record = KNOWN_CRIMINAL;
  crime(g, 'fact_player_trespassed_x', ['npc_justin']);
  assert.equal(g.world.police.wanted, 1, 'a known criminal gets no slack');
});

test('witnesses call it in; the nearest officers are dispatched and you are Wanted', () => {
  const g = fresh(4);
  crime(g, 'fact_player_assault', ['npc_mags']);
  assert.equal(g.world.police.wanted, 0, 'nothing yet — the call is in');
  assert.equal(g.world.police.calls.length, 1);
  run(g, 20, 1);
  assert.equal(g.world.police.calls.length, 0);
  assert.equal(g.world.police.wanted, 2, 'assault: two stars');
  const sent = OFFICERS.map((id) => g.npcs.get(id)).filter((n) => n.intent?.source === 'dispatch' || n.pursuit);
  assert.ok(sent.length >= 1 && sent.length <= 2, `${sent.length} dispatched`);
});

test('bribing the chief: three days of calls nobody answers and officers who saw nothing (murder still counts)', () => {
  const g = fresh(5);
  g.player.money = 500;
  const price = g.police.bribePrice();
  g.applyEffects([{ police: { bribe: true } }], g.npcs.get('npc_lawrence'));
  assert.equal(g.player.money, 500 - price);
  assert.ok(g.police.bribed());
  assert.equal(g.world.police.bribedUntilDay, 1 + BRIBE_DAYS);
  crime(g, 'fact_player_assault', ['npc_mags']);
  assert.equal(g.world.police.calls.length, 0, 'the call goes nowhere');
  crime(g, 'fact_player_assault', ['npc_justin']);
  assert.equal(g.world.police.wanted, 0, '"I didn\'t see anything. Chief\'s orders."');
  crime(g, 'fact_player_murder', ['npc_mags']);
  assert.equal(g.world.police.calls.length, 1, 'a killing is still called in…');
  assert.ok(g.world.police.calls[0].at - g.clock.total >= 240, '…but they take hours to come');
  setTime(g, 1 + BRIBE_DAYS + 1, '10:00');
  assert.ok(!g.police.bribed(), 'the bribe runs out');
  assert.ok(check({ police: { bribed: false } }, g));
});

test('paying the fine clears your warrant', () => {
  const g = fresh(6);
  g.police.raiseWanted(3);
  g.player.money = 200;
  const fine = g.police.finePrice();
  assert.ok(check({ police: { wanted: '>=1', canAffordFine: true } }, g));
  g.applyEffects([{ police: { payFine: true } }]);
  assert.equal(g.world.police.wanted, 0);
  assert.equal(g.player.money, 200 - fine);
});

test('Wanted: an officer who sees you gives chase and cuffs you; your weapons go in the evidence locker', () => {
  const g = fresh(7, 1, '07:30'); // Sgt. Case on the Plaza
  const justin = g.npcs.get('npc_justin');
  g.inventory.add('item_pistol', 1);
  g.inventory.add('item_ammo_9mm', 30);
  g.combat.equip('item_pistol');
  g.player.money = 33;
  besideNpc(g, 'npc_justin');
  g.police.raiseWanted(3 - 1); // two stars: cuffs, not bullets
  tick(g, 0.2);
  assert.ok(justin.pursuit, 'he gives chase');
  assert.ok(g.police.cuffProgress() > 0, 'the cuffing bar fills');
  tick(g, 2);
  assert.equal(g.player.map, 'jail');
  assert.ok(g.world.police.jail);
  assert.equal(g.inventory.count('item_pistol'), 0, 'confiscated');
  assert.equal(g.world.containers.ct_evidence.items.item_pistol, 1, 'filed as evidence');
  assert.equal(g.player.money, 33, 'they don\'t take your money');
  assert.equal(g.world.police.wanted, 0);
});

test('surrender (G) near an officer; it does nothing when nobody wants you', () => {
  const g = fresh(8, 1, '07:30');
  besideNpc(g, 'npc_justin');
  assert.ok(!g.police.surrender().ok);
  g.police.raiseWanted(1);
  const r = g.police.surrender();
  assert.ok(r.ok);
  assert.equal(g.player.map, 'jail');
  assert.equal(g.world.police.jail.reason, 'surrendered');
});

test('killed: you wake up in a cell; serving the sentence gives your weapons back and halves your record', () => {
  const g = fresh(9);
  g.inventory.add('item_machete', 1);
  g.world.police.record = 10;
  g.combat.damagePlayer(500, null);
  assert.equal(g.player.map, 'jail');
  assert.equal(g.world.police.jail.reason, 'killed');
  const hours = g.police.hoursLeft();
  assert.equal(hours, 4 + 10 * 2);
  const day = g.clock.total;
  const r = g.police.jailAction('serve');
  assert.ok(r.ok);
  assert.ok(g.clock.total - day >= hours * 60 - 1, 'time passes');
  assert.equal(g.player.map, 'police_station');
  assert.equal(g.world.police.jail, null);
  assert.equal(g.inventory.count('item_machete'), 1, 'your gear back');
  assert.ok(g.world.police.record <= 5, 'halved (and a clean day inside takes another point off)');
});

test('breakout 1 — the spoon: four nights of digging opens a tunnel to the Sumps (and makes you Wanted)', () => {
  const g = fresh(10, 1, '10:00');
  g.police.sendToJail('arrested');
  g.world.police.jail.until = g.clock.total + 5 * 1440;
  const prop = (id) => g.currentMap().def.props.find((p) => p.id === id);
  assert.match(g.police.jailInteract(prop('jl_brick')).text, /fingernails/);
  g.police.jailInteract(prop('jl_tray'));
  assert.equal(g.inventory.count('item_spoon'), 1, 'keep the spoon');
  assert.match(g.police.jailInteract(prop('jl_brick')).text, /night/);
  setTime(g, 2, '01:00'); // Jury dozes 01:00–04:00: three hours of scraping a night
  for (let i = 0; i < 3; i++) g.police.jailInteract(prop('jl_brick'));
  assert.equal(g.world.police.jail.dig, 3);
  assert.ok(!g.getFlag('jail_tunnel_open'));
  setTime(g, 3, '01:00');
  g.police.jailInteract(prop('jl_brick'));
  assert.ok(g.getFlag('jail_tunnel_open'), 'the second night breaks through');
  g.police.jailInteract(prop('jl_brick'));
  assert.equal(g.player.map, 'halvermouth');
  assert.equal(g.world.police.jail, null);
  assert.equal(g.world.police.wanted, 2, 'JAILBREAK!');
  assert.equal(g.world.police.escapes, 1);
});

test('breakout 2 — the keys: reach through the bars while the guard sleeps; fail and it costs you twelve hours', () => {
  const g = fresh(11, 1, '10:00');
  g.police.sendToJail('arrested');
  g.world.police.jail.until = g.clock.total + 5 * 1440;
  setTime(g, 2, '02:00');
  const bars = g.currentMap().def.props.find((p) => p.id === 'jl_bars_a');
  const menu = g.police.jailInteract(bars);
  assert.ok(menu.options.some((o) => o.call[2] === 'keys'), 'the keys are within reach');
  const until = g.world.police.jail.until;
  g.rng.next = () => 0.99; // fumble
  assert.ok(!g.police.jailAction('keys').ok);
  assert.equal(g.world.police.jail.until, until + 12 * 60);
  g.npcs.get('npc_hugh').activity = 'sleep'; // he dozes off again
  g.rng.next = () => 0;
  assert.ok(g.police.jailAction('keys').ok);
  const door = g.currentMap().def.doors.find((d) => d.id === 'door_cell_a');
  const stairs = g.currentMap().def.doors.find((d) => d.id === 'door_jail_stairs');
  assert.ok(g.playerCanPass(door) && g.playerCanPass(stairs));
  g.changeMap('police_station', 'stairs_out');
  assert.equal(g.world.police.jail, null);
  assert.equal(g.world.police.wanted, 2);
});

test('breakout 3 — bribe the guard: an unlocked door and no warrant, but no gear either', () => {
  const g = fresh(12, 1, '10:00');
  g.inventory.add('item_bat', 1);
  g.police.sendToJail('arrested');
  g.world.police.jail.until = g.clock.total + 5 * 1440;
  setTime(g, 1, '23:00');
  g.player.money = 500;
  const door = g.currentMap().def.doors.find((d) => d.id === 'door_cell_a');
  assert.ok(!g.playerCanPass(door));
  const r = g.police.jailAction('bribeGuard');
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, 500 - g.police.guardPrice());
  assert.ok(g.playerCanPass(door));
  g.changeMap('police_station', 'stairs_out');
  assert.equal(g.world.police.jail, null);
  assert.equal(g.world.police.wanted, 0, '"released early for good behaviour"');
  assert.equal(g.inventory.count('item_bat'), 0, 'still in the evidence locker');
  // a cop-killer can't buy his way out
  const g2 = fresh(13, 1, '23:00');
  g2.world.police.officersKilled = 1;
  g2.police.sendToJail('arrested');
  setTime(g2, 1, '23:00');
  g2.player.money = 500;
  assert.ok(!g2.police.jailAction('bribeGuard').ok);
});

test('breakout 4 — Petty Larson sells you the vent (25 obols or a cigar) and a bent fork', () => {
  const g = fresh(14, 1, '10:00');
  g.police.sendToJail('arrested');
  const prop = (id) => g.currentMap().def.props.find((p) => p.id === id);
  assert.match(g.police.jailInteract(prop('jl_vent')).text, /where/);
  assert.equal(g.police.jailInteract(prop('jl_crack')).npcId, 'npc_petty');
  g.player.money = 30;
  g.applyEffects([{ police: { pettyDeal: 'money' } }], g.npcs.get('npc_petty'));
  assert.equal(g.player.money, 5);
  assert.equal(g.inventory.count('item_bent_fork'), 1);
  g.police.jailInteract(prop('jl_vent'));
  assert.equal(g.player.map, 'halvermouth');
  assert.equal(g.world.police.wanted, 2);
  const dlg = CONTENT.dialogues.dlg_petty.topics.find((t) => t.id === 't_petty_out');
  assert.ok(dlg.choices.some((c) => c.effects?.some((e) => e.police?.pettyDeal === 'item_cigar')));
});

test('attacking Chief Order: the LAW & ORDER Wrath, then you wake in a cell', async () => {
  const g = fresh(15, 1, '09:00');
  const chief = besideNpc(g, 'npc_lawrence');
  g.player.facing = 'left';
  g.player.aim = null;
  g.combat.hitNpc(chief, 999, { weapon: g.combat.weaponDef('item_rifle'), dir: { x: -1, y: 0 }, lethal: true });
  assert.ok(g.combat.wrath);
  assert.equal(g.combat.wrath.theme, 'law');
  assert.ok(!chief.dead && chief.health === undefined, 'not a scratch');
  tick(g, WRATH.end + 0.5);
  assert.ok(g.combat.wrath.over);
  g.combat.riseAgain();
  assert.equal(g.player.map, 'jail');
  assert.equal(g.world.police.jail.reason, 'wrath');
  const { THEMES } = await import('../src/engine/wrath.js');
  assert.ok(THEMES.law?.strike && THEMES.law.finale);
  const { SFX } = await import('../src/audio/sfx.js');
  assert.equal(typeof SFX.sfx_ram, 'function');
});

test('officers can be killed — a serious crime: three stars, a huge record, and the chief won\'t take your money', () => {
  const g = fresh(16, 1, '07:30');
  const justin = besideNpc(g, 'npc_justin');
  g.combat.hitNpc(justin, 999, { weapon: g.combat.weaponDef('item_rifle'), dir: { x: -1, y: 0 }, lethal: true });
  assert.ok(justin.dead);
  assert.equal(g.world.police.officersKilled, 1);
  assert.ok(g.world.police.record >= 20);
  assert.ok(check({ police: { killedOfficer: true } }, g));
  const bribe = CONTENT.dialogues.dlg_lawrence.topics.find((t) => t.id === 't_lawrence_bribe');
  const offer = bribe.choices.find((c) => c.id === 'c_lawrence_bribe');
  g.player.money = 10000;
  assert.ok(!check(offer.if, g), 'no bribe after killing a cop');
  assert.ok(!g.police.activeOfficers().includes(justin));
});

test('Wanted lapses when nobody has seen you for a while; a clean day takes a point off the record', () => {
  const g = fresh(17, 1, '10:00');
  g.changeMap('player_flat', 'entry');
  g.police.raiseWanted(1);
  g.world.police.record = 3;
  run(g, 70, 1);
  assert.equal(g.world.police.wanted, 0);
  setTime(g, 3, '10:00');
  run(g, 2, 1);
  assert.equal(g.world.police.record, 2);
});

test('police state survives save/load; old saves gain it', () => {
  const g = fresh(18);
  g.world.police.record = 9;
  g.police.raiseWanted(10);
  g.world.police.bribedUntilDay = 4;
  const state = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 1 });
  g2.loadState(state);
  assert.equal(g2.world.police.record, 9);
  assert.equal(g2.world.police.wanted, 3);
  assert.ok(g2.police.bribed());
  delete state.world.police;
  delete state.world.containers.ct_evidence;
  const g3 = new Game(CONTENT, { seed: 1 });
  g3.loadState(state);
  assert.equal(g3.world.police.wanted, 0);
  assert.ok(g3.world.containers.ct_evidence);
  assert.equal(g3.npcs.size, 25);
});

test('debug commands: wanted, record, jail, release, bribe', () => {
  const g = fresh(19);
  assert.ok(runCommand(g, 'wanted 2').ok);
  assert.equal(g.world.police.wanted, 2);
  assert.ok(runCommand(g, 'wanted 0').ok);
  assert.equal(g.world.police.wanted, 0);
  runCommand(g, 'record 12');
  assert.ok(!g.police.lax());
  runCommand(g, 'jail 2');
  assert.equal(g.player.map, 'jail');
  assert.equal(g.police.hoursLeft(), 2);
  runCommand(g, 'release');
  assert.equal(g.player.map, 'police_station');
  runCommand(g, 'bribe');
  assert.ok(g.police.bribed());
});

test('the jail and precinct are walkable: cells, corridor, stairs, the chief\'s office and the bunks', () => {
  const g = newGame();
  for (const [map, a, b] of [['police_station', 'entry', 'chief_desk'], ['police_station', 'entry', 'bunk_5'], ['police_station', 'entry', 'stairs_out'], ['jail', 'stairs_in', 'guard_desk'], ['jail', 'stairs_in', 'corridor_a']]) {
    const m = g.maps.get(map);
    const s = m.spots[a];
    const t = m.spots[b];
    assert.ok(findPath(m, s.x, s.y, t.x, t.y), `${map}: ${a} → ${b}`);
  }
  // inside cell A you can reach the cot, the tray, the brick, the vent and the crack, but not the corridor
  const jail = g.maps.get('jail');
  const cell = jail.spots.cell_a;
  for (const [x, y] of [[1, 3], [5, 3], [2, 5], [4, 2], [6, 4]]) assert.ok(findPath(jail, cell.x, cell.y, x, y), `cell A reaches ${x},${y}`);
  void TILE;
});
