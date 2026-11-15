// The 4th wanted star (v0.106.0, src/systems/army.js): the Army comes in waves from a finite stock the defence budget pays for; the dead
// are lost until a refit; the living go home when the hunt ends; surrender is arrest; soldiers are never saved; their rockets are not your crimes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { ARMY } from '../src/content/army.js';

const onStreet = (g) => { const m = g.maps.get('halvermouth'); g.changeMap('halvermouth', Object.keys(m.spots)[0]); return m; };

test('no 4th star without three; with three, two police officers killed bring the Army', () => {
  const g = newGame(); onStreet(g);
  assert.equal(g.army.raise('test'), false, 'not without three stars');
  g.police.state.wanted = 3; g.bus.emit('police:officerKilled', {}); assert.equal(g.army.hunting(), false, 'one is not enough');
  g.bus.emit('police:officerKilled', {}); assert.equal(g.army.hunting(), true);
});

test('waves come from the stock in order (patrol, road block, heavy weapons), and only on the streets', () => {
  const g = newGame(); onStreet(g); g.police.state.wanted = 3; g.army.raise('test');
  const s = g.army.state; const st0 = { ...s.stock };
  assert.ok(g.army.sendWave()); assert.equal(g.army.soldiers().length, ARMY.waves[0].soldiers); assert.equal(s.stock.soldiers, st0.soldiers - ARMY.waves[0].soldiers);
  assert.ok(g.army.soldiers().every((n) => n.hostile?.mode === 'fight' && n.profile.combat.weapon === ARMY.weapon && n.map === 'halvermouth'));
  assert.ok(g.army.sendWave()); assert.ok(g.army.sendWave()); assert.equal(g.army.soldiers().filter((n) => n.profile.combat.weapon === ARMY.heavyWeapon).length, ARMY.waves[2].heavy);
  const far = g.army.soldiers().every((n) => Math.hypot(n.x - g.player.x, n.y - g.player.y) / 32 >= ARMY.spawn.min - 1); assert.ok(far, 'they come in out of reach');
  g.changeMap('cafe', 'entry'); assert.equal(g.army.sendWave(), false, 'not into a room');
});

test('the dead are lost, the living go home when the hunt ends, and the stock is finite', () => {
  const g = newGame(); onStreet(g); g.police.state.wanted = 3; g.army.raise('test'); g.army.sendWave();
  const s = g.army.state; const [a, ...rest] = g.army.soldiers(); a.dead = true; g.army.update(0.016);
  assert.equal(s.lost.soldiers, 1); const before = s.stock.soldiers;
  g.army.endHunt(); assert.equal(g.army.soldiers().length, 0); assert.equal(s.stock.soldiers, before + rest.length, 'the living are back in the stock');
  s.stock.soldiers = 0; s.stock.heavy = 0; g.police.state.wanted = 3; g.army.raise('again'); assert.equal(g.army.sendWave(), false, 'an empty fort sends nobody');
});

test('soldiers are not saved; the hunt survives a load; the budget sets the size and a refit replaces losses only slowly', () => {
  const g = newGame(); onStreet(g); g.police.state.wanted = 3; g.army.raise('test'); g.army.sendWave();
  const st = JSON.parse(JSON.stringify(g.serialize())); assert.ok(!Object.keys(st.npcs).some((id) => id.startsWith('army_')));
  const h = newGame(); h.loadState(st); assert.equal(h.army.hunting(), true); assert.equal(h.army.soldiers().length, 0);
  const lvl = g.politics.government().active.reduce((a, p) => a + (p.key === 'defence_up' ? 1 : p.key === 'defence_down' ? -1 : 0), 0); const k = Math.max(0.5, 1 + ARMY.budgetStep * lvl);
  const cap = g.army.capacity(); assert.deepEqual(cap, { soldiers: Math.round(ARMY.base.soldiers * k), heavy: Math.round(ARMY.base.heavy * k) }, 'the defence policies in force size the fort');
  const s = g.army.state; s.stock.soldiers = 0; s.refitDay = g.clock.day - ARMY.refitDays; g.army.minuteTick();
  assert.equal(s.stock.soldiers, Math.ceil(cap.soldiers * ARMY.refitShare));
});

test('surrender to a soldier is an arrest, and ends the hunt', () => {
  const g = newGame(); onStreet(g); g.police.state.wanted = 3; g.army.raise('test'); g.army.sendWave();
  const n = g.army.soldiers()[0]; n.x = g.player.x + 40; n.y = g.player.y;
  const r = g.police.surrender(); assert.ok(r.ok, r.text); assert.equal(g.army.hunting(), false); assert.ok(g.police.jailed());
});

test('a soldier\'s rocket is not the player\'s crime and opens no wall', () => {
  const g = newGame(); onStreet(g); const rec0 = g.police.state.record; const holes0 = (g.world.breaches || []).length;
  g.heavy.explode(g.player.x + 200, g.player.y, 2.5, 110, 'army_x');
  assert.equal(g.police.state.record, rec0); assert.equal((g.world.breaches || []).length, holes0);
});
