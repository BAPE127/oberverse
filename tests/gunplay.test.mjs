// Gun play, Streets of Rogue style (v0.44.0): bullets you can see, NPC shots that fly and can be
// dodged, blood and spent cases on the ground, the camera's kick, recoil, stepping into a swing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, besideNpc, noImpulses, TILE } from './helpers.mjs';

const fresh = () => {
  const g = newGame(7);
  setTime(g, 1, '10:00');
  noImpulses(g);
  return g;
};
const step = (g, s, move = { x: 0, y: 0 }) => { for (let t = 0; t < s; t += 0.02) g.update(0.02, move); };

test('a shot: a bullet you can see, a spent case that lands, the camera kicks; the hit draws blood', () => {
  const g = fresh();
  const mags = besideNpc(g, 'npc_mags');
  g.player.x += TILE * 2; // a couple of tiles off
  g.inventory.add('item_revolver', 1, { silent: true });
  g.inventory.add('item_ammo_38', 12, { silent: true });
  g.combat.equip('item_revolver');
  g.player.mags.item_revolver = 6;
  g.player.aim = { x: mags.x - g.player.x, y: 0 };
  const r = g.combat.attack();
  assert.deepEqual(r.hits, ['npc_mags']);
  assert.equal(g.combat.bullets.length, 1, 'a bullet in flight');
  assert.ok(g.combat.shake.until > g.realTime && g.combat.shake.mag > 0, 'the camera kicks');
  assert.ok(g.combat.particles.some((q) => q.kind === 'case'));
  assert.ok(g.combat.particles.filter((q) => q.kind === 'blood').length >= 5);
  step(g, 1.5);
  assert.equal(g.combat.bullets.length, 0, 'it arrived');
  assert.ok(g.combat.decals.some((d) => d.kind === 'case'), 'the case is on the ground');
  assert.ok(g.combat.decals.some((d) => d.kind === 'blood'), 'and so is the blood');
});

test('an NPC\'s bullet flies: stand still and it hits you; step out of its way and it misses', () => {
  const g = fresh();
  g.changeMap('halvermouth', 'plaza_center');
  const p = g.player;
  const fire = () => g.combat.spawnBullet(p.x - 5 * TILE, p.y - 18, { x: 1, y: 0 }, 10 * TILE, { speed: 620, hurts: { by: 'npc_mags', damage: 20 } });
  p.god = false;
  const h0 = p.health;
  fire();
  assert.equal(p.health, h0, 'not yet — it is still on its way');
  step(g, 0.5);
  assert.ok(p.health < h0, 'hit');
  const h1 = p.health;
  fire();
  p.y += TILE * 1.5; // sidestep
  step(g, 0.5);
  assert.equal(p.health, h1, 'dodged');
});

test('melee: you step into the swing; the dead leave a pool', () => {
  const g = fresh();
  const mags = besideNpc(g, 'npc_mags');
  g.player.facing = 'left';
  g.player.aim = null;
  const x0 = g.player.x;
  g.combat.attack();
  assert.ok(g.player.x < x0, 'a step forward');
  g.combat.kill(mags, g.combat.weaponDef(null));
  assert.ok(g.combat.decals.some((d) => d.kind === 'pool'));
});
