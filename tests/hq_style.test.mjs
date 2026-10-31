// Furnishing the headquarters (v0.88.0): the parent chooses desks, floor, walls, lamps, pictures and plants for an office it owns. All looks:
// each change costs obols from the parent's own account (once), going back to the original is free, and no choice ever returns a coin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { check } from '../src/sim/conditions.js';
import { HQ_TIERS, hqMapId } from '../src/content/hq.js';
import { STYLE, STYLE_SLOTS, STYLE_DEFAULT, STYLE_SCALE, STYLE_SPOTS, priceOf, optionOf } from '../src/content/hqStyle.js';
import { kindOf } from '../src/corp/ledger.js';

function office(seed, tier = 'small') {
  const g = newGame(seed);
  g.player.money = 80_000_000;
  assert.ok(g.corp.group.form().ok);
  assert.ok(g.corp.contribute('parent', 20_000_000).ok);
  assert.ok(g.hq.buy(tier).ok);
  return g;
}
const mapOf = (g, tier) => g.maps.get(hqMapId(tier));
const shown = (g, map, p) => !p.hiddenUnless || check(p.hiddenUnless, g);

test('a freshly bought office is exactly the hall it was: nothing is overridden, nothing extra is shown', () => {
  const g = office(8801);
  assert.deepEqual(g.hq.styleOf('small'), STYLE_DEFAULT);
  const m = mapOf(g, 'small');
  assert.equal(m.styleOverride ?? null, null);
  for (const p of m.props.filter((q) => q.type === 'desk')) assert.equal(p.color, '#6a4a2e');
  assert.equal(m.props.find((q) => q.id === 'hq_small_rug').color, '#2a3a5a');
  assert.equal(m.props.filter((q) => /_(lamp|art|plant_x)/.test(q.id) && shown(g, m, q)).length, 0, 'no lamps, pictures or extra plants yet');
});

test('refusals: not owned, unknown, the one you already have, a tower-only luxury, and not enough money', () => {
  const g = office(8802, 'small');
  assert.match(g.hq.setStyle('mid', 'desks', 'oak').text, /does not own/);
  assert.match(g.hq.setStyle('small', 'desks', 'nope').text, /no such choice/);
  assert.match(g.hq.setStyle('small', 'carpet', 'oak').text, /no such choice/);
  assert.match(g.hq.setStyle('small', 'desks', 'walnut').text, /already like that/);
  assert.match(g.hq.setStyle('small', 'desks', 'gilded').text, /Only The Tower has gilded/);
  const a = g.corp.account('parent');
  a.cash = 100;
  const before = JSON.stringify(g.hq.styleOf('small'));
  const r = g.hq.setStyle('small', 'desks', 'oak');
  assert.equal(r.ok, false); assert.match(r.text, /holds 100 obols; this costs 400 obols/);
  assert.equal(a.cash, 100); assert.equal(JSON.stringify(g.hq.styleOf('small')), before);
});

test('a choice costs its price times the office, from the parent only, as an expense; the player and the other companies do not move', () => {
  for (const tier of ['small', 'mid', 'tower']) {
    const g = office(8803, tier);
    const cash0 = g.corp.account('parent').cash; const me0 = g.player.money;
    const others0 = JSON.stringify(['arms', 'shipping', 'aerospace', 'farming'].map((id) => g.corp.cashOf(id)));
    const r = g.hq.setStyle(tier, 'desks', 'oak');
    assert.ok(r.ok, r.text);
    const price = 400 * STYLE_SCALE[tier];
    assert.equal(priceOf(tier, 'desks', 'oak'), price);
    assert.equal(cash0 - g.corp.account('parent').cash, price);
    assert.equal(g.player.money, me0);
    assert.equal(JSON.stringify(['arms', 'shipping', 'aerospace', 'farming'].map((id) => g.corp.cashOf(id))), others0);
  }
  assert.equal(kindOf('fitout', 'out'), 'opex', 'furnishing is an expense, not an asset that would add to the books');
});

test('what a choice changes: desk and rug colours, the floor and the walls (and going back to the original is free)', () => {
  const g = office(8804, 'mid');
  const m = mapOf(g, 'mid');
  assert.ok(g.hq.setStyle('mid', 'desks', 'steel').ok);
  assert.ok(m.props.filter((p) => p.type === 'desk').every((p) => p.color === '#7d8794'));
  const v0 = m.styleVersion;
  assert.ok(g.hq.setStyle('mid', 'floor', 'marble').ok);
  assert.equal(m.props.find((p) => p.id === 'hq_mid_rug').color, '#7a3a3a');
  assert.deepEqual(m.styleOverride.floor, { t: 0 });
  assert.ok(g.hq.setStyle('mid', 'walls', 'navy').ok);
  assert.equal(m.styleOverride.wall, 'navy');
  assert.ok(m.styleVersion > v0 && m.fieldsVersion > 0, 'the ground is painted again');
  const cash = g.corp.account('parent').cash;
  assert.ok(g.hq.setStyle('mid', 'floor', 'checker').ok); assert.ok(g.hq.setStyle('mid', 'walls', 'grand').ok); assert.ok(g.hq.setStyle('mid', 'desks', 'walnut').ok);
  assert.equal(g.corp.account('parent').cash, cash, 'the original costs nothing');
  assert.equal(m.styleOverride ?? null, null);
  assert.equal(m.props.find((p) => p.id === 'hq_mid_rug').color, '#2a3a5a');
});

test('lamps, pictures and plants show only while chosen, in the number the office has places for', () => {
  const g = office(8805, 'tower');
  const m = mapOf(g, 'tower');
  const vis = (re) => m.props.filter((p) => re.test(p.id) && shown(g, m, p)).length;
  assert.ok(g.hq.setStyle('tower', 'lights', 'warm').ok);
  assert.equal(vis(/_lamp_warm/), STYLE_SPOTS.tower.lamps.length); assert.equal(vis(/_lamp_(cool|rose)/), 0);
  assert.ok(g.hq.setStyle('tower', 'lights', 'cool').ok);
  assert.equal(vis(/_lamp_warm/), 0); assert.equal(vis(/_lamp_cool/), STYLE_SPOTS.tower.lamps.length);
  assert.ok(g.hq.setStyle('tower', 'art', 'seascape').ok);
  assert.equal(vis(/_art_seascape/), STYLE_SPOTS.tower.art.length); assert.equal(vis(/_art_landscape/), 0);
  assert.ok(g.hq.setStyle('tower', 'plants', 'some').ok); assert.equal(vis(/plant_x/), 2);
  assert.ok(g.hq.setStyle('tower', 'plants', 'lush').ok); assert.equal(vis(/plant_x/), STYLE_SPOTS.tower.plants.length);
  assert.ok(g.hq.setStyle('tower', 'plants', 'none').ok); assert.equal(vis(/plant_x/), 0);
  assert.ok(g.hq.setStyle('tower', 'lights', 'plain').ok); assert.equal(vis(/_lamp_/), 0);
  assert.ok(g.hq.setStyle('tower', 'desks', 'gilded').ok, 'the tower may have gilded desks');
});

test('every place for a lamp, picture or plant is clear paving: no desk, chair, table, stand-point, door or other prop is on it', () => {
  for (const tier of ['small', 'mid', 'tower']) {
    const D = CONTENT.maps[hqMapId(tier)];
    const base = D.props.filter((p) => !/_(lamp_|art_|plant_x)/.test(p.id));
    const taken = new Set();
    for (const p of base) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) taken.add(`${x},${y}`);
    for (const s of Object.values(D.spots)) taken.add(`${s.x},${s.y}`);
    for (const k of D.keepClear) taken.add(`${k[0]},${k[1]}`);
    for (const d of D.doors) taken.add(`${d.x},${d.y}`);
    const S = STYLE_SPOTS[tier];
    const all = [...S.lamps, ...S.art, ...S.plants];
    const seen = new Set();
    for (const [x, y] of all) {
      assert.equal(D.tiles[y][x], 't', `${tier} ${x},${y} is floor`);
      assert.ok(!taken.has(`${x},${y}`), `${tier} ${x},${y} is clear`);
      assert.ok(!seen.has(`${x},${y}`), `${tier} ${x},${y} is used once`); seen.add(`${x},${y}`);
    }
  }
});

test('no lamp, picture or plant ever blocks a step: the style props are scenery that people walk past, so no desk becomes unreachable', () => {
  const g = office(8806, 'tower');
  const m = mapOf(g, 'tower');
  const before = [...m.propBlock].sort((a, b) => a - b).join();
  assert.ok(g.hq.setStyle('tower', 'plants', 'lush').ok); assert.ok(g.hq.setStyle('tower', 'lights', 'warm').ok); assert.ok(g.hq.setStyle('tower', 'art', 'abstract').ok);
  const styled = m.props.filter((p) => /_(lamp_|art_|plant_x)/.test(p.id));
  assert.ok(styled.length >= 12);
  for (const p of styled) assert.ok(!p.solid || p.hiddenUnless, `${p.id} is conditional, so it never blocks`);
  assert.equal([...m.propBlock].sort((a, b) => a - b).join(), before, 'the set of blocked tiles is the same with every extra on show');
});

test('the options: every slot starts at its free default, prices are whole obols, and the tower-only ones are marked', () => {
  for (const slot of STYLE_SLOTS) {
    const os = STYLE[slot].options;
    assert.equal(os[0].price, 0, `${slot}: the first option is free`);
    assert.equal(STYLE_DEFAULT[slot], os[0].id);
    assert.equal(new Set(os.map((o) => o.id)).size, os.length);
    for (const o of os) assert.ok(Number.isInteger(o.price) && o.price >= 0 && o.color);
  }
  assert.deepEqual(optionOf('desks', 'gilded').only, ['tower']);
  assert.deepEqual(optionOf('walls', 'starlit').only, ['tower']);
});

test('the view lists each choice with its price and why not, and choosing never draws a random number', () => {
  const g = office(8807, 'small');
  const v = g.hq.styleView('small');
  assert.deepEqual(v.map((x) => x.slot), STYLE_SLOTS);
  const desks = v.find((x) => x.slot === 'desks');
  assert.equal(desks.options.find((o) => o.id === 'walnut').here, true);
  assert.equal(desks.options.find((o) => o.id === 'oak').price, 400);
  assert.match(desks.options.find((o) => o.id === 'gilded').why, /Only The Tower/);
  const before = JSON.stringify(g.rng.state ?? g.rng);
  assert.ok(g.hq.setStyle('small', 'floor', 'teal').ok);
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), before);
});

test('save and load: the choices come back and the hall is dressed again', () => {
  const g = office(8808, 'mid');
  assert.ok(g.hq.setStyle('mid', 'desks', 'ebony').ok); assert.ok(g.hq.setStyle('mid', 'walls', 'plum').ok); assert.ok(g.hq.setStyle('mid', 'lights', 'rose').ok);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.equal(h.hq.styleOf('mid').walls, 'plum');
  const m = mapOf(h, 'mid');
  assert.equal(m.styleOverride.wall, 'plum');
  assert.ok(m.props.filter((p) => p.type === 'desk').every((p) => p.color === '#2f2b33'));
  assert.equal(m.props.filter((p) => /_lamp_rose/.test(p.id) && shown(h, m, p)).length, STYLE_SPOTS.mid.lamps.length);
  assert.equal(HQ_TIERS.mid.short, 'Corporate Centre');
});
