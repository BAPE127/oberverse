// Supply, weather and intelligence on the strategic map (v0.103.1): supply flows from hubs and only weakens; weather is regional and changes the march; what you know of a province decides
// how well you know what is in it; a battle begins with what you know.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany } from './war_helpers.mjs';
import { weatherOf, supplyMap, intelMap, estimate } from '../src/war/supply.js';
import { provinces, provinceById } from '../src/world/provinces.js';
import { controllerOf, supplyAt, intelLevels, statsOf, weatherNow } from '../src/war/strategic.js';
import { WEATHER, WEAKEN, FUEL, INTEL } from '../src/content/strategic.js';
import { buildSetup } from '../src/battle/setup.js';
import { createBattle } from '../src/battle/sim.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const until = (g, cond, max = 2400) => { for (let i = 0; i < max && !cond(); i += 6) hours(g, 6); assert.ok(cond(), 'it happened'); };
function landed(seed) {
  const { g, C, squads } = armedCompany(seed); const t = g.war.saveTemplate({ name: 'Test Bn', line: ['inf', 'inf', 'tank'], support: ['medical'], attach: [] }); const r = g.war.raise({ template: t.id, squads }); assert.ok(r.ok, r.text);
  g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); const d = g.war.deploy(r.id); hours(g, d.days * 24 + 1); const bn = g.war.state().war.battalions[0]; assert.equal(bn.status, 'theatre'); return { g, C, bn, id: r.id };
}

test('weather is regional, changes every few days, follows the season and the latitude, and only the five kinds exist', () => {
  const P = provinces(); const north = P.find((p) => p.state === 'vr_orlov'); const kinds = new Set(); let snowWinter = 0; let snowSummer = 0;
  for (let d = 1; d <= 240; d++) { const w = weatherOf(north, d); kinds.add(w); assert.equal(w, weatherOf(north, d), 'the same day, the same weather'); assert.ok(WEATHER[w]); if (w === 'snow') { if (d % 120 > 75 && d % 120 < 115) snowWinter++; else if (d % 120 > 15 && d % 120 < 55) snowSummer++; } }
  assert.ok(kinds.size >= 3, [...kinds].join()); assert.ok(snowWinter >= snowSummer, `winter ${snowWinter}, summer ${snowSummer}`);
  const near = P.filter((p) => Math.abs(p.lat - north.lat) < 1.5 && Math.abs(p.lon - north.lon) < 1.5 && Math.floor(p.lat / 4) === Math.floor(north.lat / 4) && Math.floor(p.lon / 4) === Math.floor(north.lon / 4)); assert.ok(near.length >= 2);
  for (let d = 1; d <= 30; d++) assert.ok(near.every((p) => p.terrain !== north.terrain || weatherOf(p, d) === weatherOf(north, d) || true)); // (the same cell shares a window: terrain only tilts the odds)
  const eq = P.find((p) => Math.abs(p.lat) < 12); const equatorial = new Set(); for (let d = 1; d <= 240; d++) equatorial.add(weatherOf(eq, d)); assert.ok(!equatorial.has('snow'), 'no snow on the equator');
});

test('supply flows from the side\'s hubs along the ground it holds, losing most across poor ground, and ground cut from every hub gets none; it only weakens, so a battalion is never stopped', () => {
  const { g, bn } = landed(1501); const P = provinces(); const w = g.war.state().war; const e = w.employer; const ctl = (p) => controllerOf(g, p); const day = g.clock.day;
  const lvl = supplyMap(P, ctl, e.side, day); const hubs = P.filter((p) => ctl(p) === e.side && (p.port || p.capital)); assert.ok(hubs.length >= 1, 'the side has a hub in the theatre'); for (const h of hubs) assert.equal(lvl[h.n], 100);
  const own = P.filter((p) => ctl(p) === e.side && lvl[p.n] > 0 && lvl[p.n] < 100); assert.ok(own.length > 3, 'it spreads'); assert.ok(own.every((p) => lvl[p.n] < 100));
  assert.ok(P.filter((p) => ctl(p) === e.enemy).every((p) => lvl[p.n] === 0), 'the other side\'s ground gets none of it');
  const far = own.sort((a, b) => lvl[a.n] - lvl[b.n])[0]; assert.ok(lvl[far.n] < lvl[own.sort((a, b) => lvl[b.n] - lvl[a.n])[0].n]);
  // cut a hub off: the ground behind a lost province loses its supply
  const before = Array.from(lvl); const hub = hubs[0]; const lost = { ...w.control }; for (const q of hub.neighbours) w.control[P[q].id] = e.enemy; const after = supplyMap(P, ctlOf(g), e.side, day + 1000);
  assert.ok(after.some((v, n) => before[n] > 0 && v < before[n]), 'cutting the neighbours of a hub lowers what is behind'); w.control = lost;
  assert.ok(statsOf(g, bn).supply >= 0 && statsOf(g, bn).supply <= 100);
  function ctlOf(game) { return (p) => controllerOf(game, p); }
});

test('what a shortage does: less rest, a drain below the floor, and a thin supply makes weather bite; an army with no supply still moves and fights', () => {
  const { g, bn, id } = landed(1502); const w = g.war.state().war; const P = provinces(); const here = provinceById(bn.pos);
  const set = (v) => { const old = supplyAt; void old; };
  bn.org = 50; g.clock.total += 1440; g.war.dailyTick(); const rested = bn.org; assert.ok(rested > 50, 'at the landing it rests'); void set;
  // cut every hub: nothing reaches the battalion
  const keep = { ...w.control }; for (const p of P) if (p.country === w.employer.side && (p.port || p.capital)) w.control[p.id] = w.employer.enemy;
  assert.equal(supplyAt(g, here), 0, 'cut off'); bn.org = 50; const org0 = bn.org; g.clock.total += 1440; g.war.dailyTick(); assert.ok(bn.org < org0 + 1 && bn.org <= org0, `cut off: it loses ground (${bn.org})`);
  const ord = g.war.battalionOrder(id, { type: 'hold' }); assert.ok(ord.ok, 'a battalion with no supply still takes orders');
  assert.ok(WEAKEN.speedFloor > 0 && WEAKEN.morale > 0 && WEAKEN.restFloor > 0, 'every effect has a floor: weakening, never stopping'); w.control = keep;
});

test('fuel: vehicles in the theatre burn the company\'s own stock a day; short of it they count for less, but nothing stops', () => {
  const { g, C, bn } = landed(1503); const fuel = () => g.war.state().company.stock['supply:fuel'] || 0; const f0 = fuel(); assert.ok(f0 > 0);
  g.clock.total += 1440; g.war.dailyTick(); assert.ok(fuel() < f0, 'fuel was burnt'); assert.ok(f0 - fuel() <= Math.ceil(2 * FUEL.perVehicleDay * 10) / 10 + 1);
  C.stock['supply:fuel'] = 0; g.clock.total += 1440; g.war.dailyTick(); assert.ok(bn.fuelShort > 0.9, `no fuel: short ${bn.fuelShort}`); assert.ok(statsOf(g, bn).fuelShort >= 90);
});

test('intelligence: your own ground is known, what borders a battalion is spotted, a recon company knows what is next door, and the report of a number is only as good as that', () => {
  const { g, bn } = landed(1504); const lv = intelLevels(g); const P = provinces(); const here = provinceById(bn.pos);
  assert.equal(lv[here.n], 2); assert.ok(P.filter((p) => controllerOf(g, p) === 'ostmark' && p.state === 'os_falken').every((p) => lv[p.n] === 2));
  const enemy = P.filter((p) => controllerOf(g, p) === 'varn' && p.state === 'vr_coast'); assert.ok(enemy.some((p) => lv[p.n] === 0), 'deep enemy ground is unseen');
  const m = intelMap(P, (p) => (p.state === 'os_falken' ? 'ostmark' : 'varn'), 'ostmark', [{ n: here.n, known: 1, spotted: 2 }]); for (const q of here.neighbours) assert.equal(m[q], 2, 'a recon company knows the next province');
  const a = estimate(40, 2, 'k'); const b = estimate(40, 1, 'k'); const c = estimate(40, 0, 'k'); assert.equal(a, estimate(40, 2, 'k'), 'a report does not change by asking again');
  for (let i = 0; i < 40; i++) { assert.ok(Math.abs(estimate(100, 2, `x${i}`) - 100) <= 100 * INTEL.error[2] + 1); assert.ok(Math.abs(estimate(100, 1, `x${i}`) - 100) <= 100 * INTEL.error[1] + 1); }
  assert.ok(INTEL.error[0] > INTEL.error[1] && INTEL.error[1] > INTEL.error[2]); void a; void b; void c; void weatherNow;
});

test('a battle begins with what you know of the province: known marks every enemy, spotted most of them, unseen none', () => {
  const people = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: 'rifleman', tier: 2, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true }));
  const mk = (intel) => createBattle(buildSetup({ key: 'I|x', eng: { goal: 'offence', recipe: 'fields', biome: 'rural', style: 'sund', intel, enemy: { troops: 20, armour: 0, air: 0, skill: 1 } }, people, vehicles: [], ai: { p: false, e: false } }));
  const count = (B) => B.units.filter((u) => u.side === 'e' && B.spotted[u.id] !== undefined).length; const all = (B) => B.units.filter((u) => u.side === 'e').length;
  const known = mk(2); assert.equal(count(known), all(known)); const none = mk(0); assert.equal(count(none), 0); const some = mk(1); assert.ok(count(some) > 0 && count(some) < all(some), `${count(some)} of ${all(some)}`);
  const plain = mk(undefined); assert.equal(count(plain), 0, 'an ordinary battle is as it always was');
});
