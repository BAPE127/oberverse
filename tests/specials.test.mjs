// Special weapons (v0.45.0): one-of-a-kind weapons kept in homes, a signature for every imported
// character, their odd mechanics (fan, pierce, stun, pull, flee, coins), and a sprite for every look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, besideNpc, noImpulses, CONTENT, TILE } from './helpers.mjs';
import { SPECIAL_ITEMS, STASHES } from '../src/content/specialWeapons.js';
import { SIGNATURE_MODELS } from '../src/content/signatureCars.js';
import { weaponBounds, lookOf } from '../src/engine/drawPixelWeapons.js';

const fresh = () => {
  const g = newGame(9);
  setTime(g, 1, '10:00');
  noImpulses(g);
  g.changeMap('halvermouth', 'plaza_center');
  return g;
};
/** Arm the player with a special gun, loaded, aimed right. */
const arm = (g, id) => {
  const w = CONTENT.items[id].weapon;
  g.inventory.add(id, 1, { silent: true });
  if (w.ammo) g.inventory.add(w.ammo, 20, { silent: true });
  g.combat.equip(id);
  if (w.kind === 'gun') g.player.mags[id] = w.mag;
  g.player.aim = { x: 1, y: 0 };
};
/** Put an NPC `tiles` to the player's right. */
const place = (g, id, tiles, dy = 0) => {
  const n = g.npcs.get(id);
  Object.assign(n, { map: g.player.map, x: g.player.x + tiles * TILE, y: g.player.y + dy, path: null, intent: null, travel: null, hostile: null, health: 100 });
  return n;
};
/** Move the player (keeping the facing) to a row of the plaza with `len` clear tiles to the right. */
const clearRow = (g, len) => {
  const m = g.currentMap();
  const a = g.playerActor();
  for (let dy = 0; dy < 12; dy++) for (const s of [1, -1]) {
    const y = g.player.y + s * dy * TILE;
    let ok = true;
    for (let k = 0; k <= len * TILE && ok; k += 8) if (m.rectBlocked(g.player.x + k - 7, y - 6, 14, 6, a)) ok = false;
    if (ok) { g.player.y = y; return; }
  }
  throw new Error('no clear row');
};

test('every special weapon is kept in somebody\'s home, with its ammunition, and taking it is burglary', () => {
  const weapons = Object.entries(SPECIAL_ITEMS).filter(([, it]) => it.weapon);
  assert.ok(weapons.length >= 12);
  for (const [id, it] of weapons) {
    const stash = STASHES.find((s) => s.items[id]);
    assert.ok(stash, `${id} is stashed`);
    const c = CONTENT.containers[stash.container];
    assert.ok(c.items[id] >= 1 && c.owner && c.theftFact, `${id} in ${stash.container}`);
    if (it.weapon.ammo) assert.ok(c.items[it.weapon.ammo] > 0, `${id} comes with ammo`);
    assert.ok(weaponBounds(lookOf(it)), `${id} has a sprite`);
  }
  // the new cases stand in their homes
  for (const s of STASHES.filter((x) => x.new)) assert.ok(CONTENT.maps[s.new.map].props.some((p) => p.interact?.container === s.container), s.container);
});

test('each imported character (everyone with a signature car) has a signature weapon of their own', () => {
  const owners = new Set(Object.values(SIGNATURE_MODELS).map((m) => m.owner));
  for (const who of owners) {
    const mine = STASHES.filter((s) => CONTENT.containers[s.container].owner === who && Object.keys(s.items).some((i) => CONTENT.items[i].weapon && CONTENT.items[i].unique));
    assert.ok(mine.length >= 1, `${who} has one`);
  }
  for (const [id, it] of Object.entries(CONTENT.items)) if (it.weapon) assert.ok(weaponBounds(lookOf({ id, ...it })), `${id} has a sprite`);
});

test('the Pythagorean fires three rounds at 0° and ±36.87°; the Tinfoil Ray goes through two people in a line', () => {
  const g = fresh();
  arm(g, 'item_pythagorean');
  g.combat.attack();
  const ang = g.combat.bullets.map((b) => Math.round((Math.atan2(b.dy, b.dx) * 180) / Math.PI * 100) / 100).sort((a, b) => a - b);
  assert.deepEqual(ang, [-36.87, 0, 36.87]);
  const g2 = fresh();
  arm(g2, 'item_tinfoil_ray');
  const a = place(g2, 'npc_tibbs', 3);
  const b = place(g2, 'npc_delphine', 5);
  const r = g2.combat.attack();
  assert.ok(r.hits.includes('npc_tibbs') && r.hits.includes('npc_delphine'), JSON.stringify(r.hits));
  assert.ok(a.health < 100 && b.health < 100);
});

test('the Gavel stuns; the Old Harpoon reels them in; the Pigeon Launcher sends them running; the Golden Handshake pays', () => {
  const g = fresh();
  arm(g, 'item_gavel');
  const t = place(g, 'npc_tibbs', 1);
  g.player.facing = 'right';
  g.combat.attack();
  assert.ok(t.stunUntil > g.realTime, 'stunned');
  const g2 = fresh();
  arm(g2, 'item_harpoon_cannon');
  clearRow(g2, 7);
  const d = place(g2, 'npc_delphine', 6);
  const before = d.x - g2.player.x;
  g2.combat.attack();
  assert.ok(d.x - g2.player.x < before - 40, `reeled in from ${before} to ${d.x - g2.player.x}`);
  const g3 = fresh();
  arm(g3, 'item_pigeon_launcher');
  const s = place(g3, 'npc_sal', 4);
  g3.rng.next = () => 0.5; // no scatter
  g3.combat.attack();
  assert.equal(s.hostile?.mode, 'flee');
  const g4 = fresh();
  arm(g4, 'item_golden_handshake');
  place(g4, 'npc_julian', 4);
  const m0 = g4.player.money;
  g4.rng.next = () => 0.5;
  g4.combat.attack();
  assert.equal(g4.player.money, m0 + 2);
});
