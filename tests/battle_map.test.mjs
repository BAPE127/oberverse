// Battle maps and setups (v0.101.0 stage 10a): the same seed gives the same map; both recipes are walkable end to end; buildings have a door, windows, a stair and floors in their style's range;
// nobody starts in a wall; the enemy is exactly what the engagement says and no player unit is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, reachable, idx, walkable } from '../src/battle/map.js';
import { createBattle } from '../src/battle/sim.js';
import { buildSetup } from '../src/battle/setup.js';
import { canStand } from '../src/battle/nav.js';
import { TILE, STYLES, RECIPES, styleOf } from '../src/content/battle.js';

const hashOf = (m) => { let h = 0; for (const v of m.tiles) h = (h * 31 + v) >>> 0; return h; };

test('a map is a function of its seed: the same seed is the same map, another seed is another', () => {
  for (const recipe of ['city', 'fields']) {
    const a = generate({ recipe, seed: 'one', style: 'halvermouth' }); const b = generate({ recipe, seed: 'one', style: 'halvermouth' }); const c = generate({ recipe, seed: 'two', style: 'halvermouth' });
    assert.equal(hashOf(a), hashOf(b)); assert.notEqual(hashOf(a), hashOf(c)); assert.deepEqual(a.buildings, b.buildings);
    assert.equal(a.w, RECIPES[recipe].w);
  }
});

test('every building can be walked to from the player\'s start, on every seed of both recipes and in every style', () => {
  for (const recipe of ['city', 'fields']) for (const style of Object.keys(STYLES)) for (let k = 0; k < 12; k++) {
    const m = generate({ recipe, seed: `${recipe}${style}${k}`, style });
    const r = reachable(m); assert.ok(r.ok, `${recipe}/${style}/${k}`);
    assert.ok(m.buildings.length >= (recipe === 'city' ? 6 : 4), `${recipe}: ${m.buildings.length} buildings`);
  }
});

test('a building has a wall all round, a door, windows and a stair, and floors within its national style', () => {
  for (const style of Object.keys(STYLES)) {
    const m = generate({ recipe: 'city', seed: `s-${style}`, style }); const S = STYLES[style];
    for (const b of m.buildings) {
      assert.ok(b.floors >= S.floors[0] && b.floors <= Math.min(6, S.floors[1]), `${style}: ${b.floors} floors`);
      assert.equal(m.tiles[idx(m, b.door.x, b.door.y)], TILE.DOOR);
      assert.equal(m.tiles[idx(m, b.stairs.x, b.stairs.y)], TILE.STAIRS);
      let windows = 0; for (let i = b.x; i < b.x + b.w; i++) for (let j = b.y; j < b.y + b.h; j++) if (m.tiles[idx(m, i, j)] === TILE.WINDOW) windows++;
      assert.ok(windows >= 2, 'windows');
      assert.equal(m.bfloors[idx(m, b.x, b.y)], b.floors);
    }
  }
  assert.equal(styleOf('ostmark'), 'ostmark'); assert.equal(styleOf('nowhere'), 'halvermouth');
});

const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: i % 8 === 0 ? 'machine_gunner' : 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
const eng = (o = {}) => ({ goal: 'defence', recipe: 'city', biome: 'rural', style: 'halvermouth', enemy: { troops: 14, armour: 2, air: 1, skill: 1 }, ...o });

test('the enemy is exactly what the engagement says and your side is exactly your forces: nobody is made up, and nobody starts in a wall', () => {
  const vehicles = [{ id: 'E1', name: 'Anvil Mk1 tank', cls: 'tank', armour: 3, firepower: 3, speed: 3 }, { id: 'E2', name: 'Wren', cls: 'helicopter', armour: 1, firepower: 1, speed: 5 }];
  for (const recipe of ['city', 'fields']) {
    const setup = buildSetup({ key: `K|${recipe}`, eng: eng({ recipe }), people: people(10), vehicles });
    const B = createBattle(setup);
    const side = (s) => B.units.filter((u) => u.side === s);
    assert.equal(side('p').length, 12); assert.deepEqual(side('p').map((u) => u.id).sort(), [...people(10).map((p) => p.id), 'E1', 'E2'].sort());
    assert.equal(side('e').filter((u) => u.kind === 'inf').length, 14); assert.equal(side('e').filter((u) => u.kind === 'tank').length, 2); assert.equal(side('e').filter((u) => u.kind === 'helicopter').length, 1);
    for (const u of B.units) assert.ok(canStand(B.map, Math.floor(u.x), Math.floor(u.y), u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh'), `${u.id} stands on something`);
    assert.ok(side('p').every((u) => u.rec), 'every unit of yours is a real record'); assert.ok(side('e').every((u) => !u.rec));
  }
  assert.ok(walkable(generate({ recipe: 'fields', seed: 'w' }), 3, 24) !== undefined);
});

test('a map carries its ground glyphs, props and cars (v0.102.0), and a battle saved without a map version replays on the first generation', () => {
  for (const recipe of ['city', 'fields']) {
    const m = generate({ recipe, seed: 'glyph', style: 'ostmark' });
    assert.equal(m.ver, 2); assert.equal(m.surf.length, m.w * m.h); assert.ok(m.props.length > 20, 'props'); assert.ok(m.props.every((p) => p.id && p.type));
    assert.ok(recipe === 'fields' ? m.fields.length >= 1 : m.cars.length >= 10, 'fields or cars');
    for (const b of m.buildings) assert.ok(b.astyle && typeof b.seed === 'number', 'a building knows how to be painted');
    assert.ok(m.props.filter((p) => p.type === 'tree' || p.type === 'pine').every((p) => m.tiles[idx(m, p.x, p.y)] === TILE.TREE), 'a tree is a tile that stops sight');
    const old = generate({ recipe, seed: 'glyph', style: 'ostmark', ver: 1 }); assert.equal(old.ver, 1); assert.equal(old.w, { city: 72, fields: 80 }[recipe]); assert.equal(old.surf, undefined);
  }
  const setup = buildSetup({ key: 'K|ver', eng: eng({ recipe: 'city' }), people: people(4), vehicles: [] }); assert.equal(setup.map.ver, 2);
  const saved = JSON.parse(JSON.stringify(setup)); delete saved.map.ver; assert.equal(createBattle(saved).map.w, 72); assert.equal(createBattle(setup).map.w, RECIPES.city.w);
});
