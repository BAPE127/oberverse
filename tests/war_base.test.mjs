// The living base (v0.100.0 stage 8): capacity is the test (beds, meals, treatment places, stores), the base runs the same without you, readiness is explained by its parts, and the people on
// Hollowmoor Lot are bodies drawn from the books: capped, never saved as the truth, and following the day to places that exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, build, buildAll, STAGE1, cageGoods, days, topUp } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT, setTime } from './helpers.mjs';
import { BASE, BODIES, ROUTINE } from '../src/content/base.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const hireN = (g, role, n) => { for (let i = 0; i < n; i++) assert.ok(g.war.hire(role).ok, `${role} ${i}`); };
const avg = (g) => g.war.people().reduce((a, p) => a + p.morale, 0) / g.war.people().length;

test('rations are eaten one a day from the stores: fed people stay near their starting morale, the hungry fall away, and the shortage is noticed once, not every day', () => {
  const g = warGame(801, { cash: 3_000_000 }); build(g, STAGE1); hireN(g, 'guard', 6);
  g.war.buySupply('rations', 60);
  days(g, 5); assert.equal(g.war.stock()['supply:rations'], 60 - 30, 'six people, five days');
  assert.ok(avg(g) >= 66 && avg(g) <= 74, `fed: ${avg(g)}`);
  const view = g.war.baseView(); assert.equal(view.rations, 30);
  days(g, 5); assert.equal(g.war.stock()['supply:rations'] || 0, 0); // the stores run out on day 10
  days(g, 15); assert.ok(avg(g) < 58, `hungry: ${avg(g)}`);
  assert.ok(g.war.baseView().short.some((x) => /unfed/.test(x)));
  assert.ok(g.war.state().company.log.filter((l) => /short of rations/.test(l.text)).length <= 3, 'noticed now and then, not daily');
  assert.equal(g.player.money > 0, true); assert.deepEqual(g.war.check(), []);
});

test('a mess hall gives a hot meal to as many as it seats, which lifts their morale; a base with too few beds loses morale and readiness for the people it cannot house', () => {
  const a = warGame(802, { cash: 5_000_000 }); build(a, STAGE1); hireN(a, 'guard', 5); a.war.buySupply('rations', 300);
  const b = warGame(803, { cash: 5_000_000 }); buildAll(b, 2); hireN(b, 'guard', 5); b.war.buySupply('rations', 300);
  days(a, 30); days(b, 30);
  assert.ok(avg(b) > avg(a) + 4, `hot meals lift it: ${avg(b).toFixed(1)} against ${avg(a).toFixed(1)}`);
  assert.equal(b.war.baseView().meals, 90);
  // beds: the bunkhouse has twelve
  const c = warGame(804, { cash: 5_000_000 }); build(c, STAGE1); hireN(c, 'guard', 12); // (no rations: with the stage 1 stores' old 60-place limit the 600 asked for here were refused, so this base was never fed; v0.103.3's unlimited stores would feed it, so the test says what it always did)
  assert.ok(!c.war.hire('guard').ok && /Every bed is taken/.test(c.war.hire('guard').text), 'the bed limit stops a hire');
  const x = c.war.state().company; x.facilities.find((f) => f.id === 'bunkhouse').state = 'ruin'; // a ruin holds nobody
  days(c, 30); const v = c.war.baseView();
  assert.equal(v.beds, 0); assert.ok(v.short.some((s) => /without a bed/.test(s))); assert.ok(avg(c) < 66, `overcrowded: ${avg(c)}`);
});

test('the wounded heal only as fast as the treatment places and medicine allow; a medic on the books helps; the untreated heal slowly; a person is back at work when the wounds are gone', () => {
  const g = warGame(805, { cash: 5_000_000 }); buildAll(g, 2); hireN(g, 'guard', 10); g.war.buySupply('rations', 600); g.war.buySupply('medicine', 4);
  const ps = g.war.state().company.personnel.slice(0, 10);
  for (const p of ps) { p.wounds = 4; p.status = 'wounded'; }
  days(g, 1);
  const healing = ps.filter((p) => p.wounds < 4).length; assert.equal(healing, 4, 'four medicines, four people treated (the clinic has eight places)'); assert.equal(g.war.stock()['supply:medicine'] || 0, 0);
  assert.equal(g.war.baseView().treated, 4);
  const before = ps.map((p) => p.wounds); days(g, 1);
  assert.equal(g.war.baseView().treated, 0, 'no medicine: nobody is treated'); assert.ok(ps.every((p, i) => p.wounds <= before[i] && p.wounds >= before[i] - 1), 'the untreated heal at most a point, and only every fourth day');
  g.war.buySupply('medicine', 60); days(g, 6);
  assert.ok(ps.every((p) => p.wounds === 0 && p.status === 'active'), 'everyone back at work');
  // a medic is a bonus
  const m = warGame(806, { cash: 5_000_000 }); buildAll(m, 2); hireN(m, 'guard', 2); m.war.buySupply('rations', 100); m.war.buySupply('medicine', 20); m.war.buySupply('uniform', 2); m.war.hire('medic'); days(m, 9);
  const [p1] = m.war.state().company.personnel; p1.wounds = 4; p1.status = 'wounded'; days(m, 1); assert.equal(p1.wounds, 2, 'a point for the place and a point for the medic');
});

test('readiness is explained: the five parts it is made of add up to the figure shown, and the shortages say what is wrong', () => {
  const g = warGame(807, { cash: 5_000_000 }); buildAll(g, 2); hireN(g, 'guard', 8); g.war.buySupply('rations', 100);
  days(g, 2); const v = g.war.baseView(); const R = BASE.readiness; const f = v.factors;
  const sum = Math.round(100 * (f.strength * R.strength + f.morale * R.morale + f.armed * R.armed + f.fed * R.fed + f.housed * R.housed));
  assert.ok(Math.abs(sum - v.readiness) <= 1, `${sum} vs ${v.readiness}`);
  assert.equal(f.armed, 0, 'nobody is armed yet'); assert.equal(f.fed, 1); assert.equal(f.housed, 1);
  assert.equal(Object.values(R).reduce((a, b) => a + b, 0), 1);
  const hungry = warGame(808, { cash: 5_000_000 }); build(hungry, STAGE1); hireN(hungry, 'guard', 3); days(hungry, 2);
  assert.ok(hungry.war.baseView().readiness < v.readiness); assert.ok(hungry.war.baseView().short.length > 0);
});

test('a crew\'s morale reaches the work: a hungry, unpaid crew does worse on a job than a fed one (the chance of success moves by a few points)', async () => {
  const { chance } = await import('../src/war/contracts.js');
  const g = warGame(809, { cash: 800_000 }); build(g, STAGE1); hireN(g, 'guard', 3);
  const crew = g.war.people().map((p) => p.id);
  const job = { risk: 'medium', crew, needs: 3, guards: 3 };
  const base = chance(g, job);
  for (const p of g.war.state().company.personnel) p.morale = 30;
  assert.ok(chance(g, job) < base - 0.05, 'low morale costs'); for (const p of g.war.state().company.personnel) p.morale = 95;
  assert.ok(chance(g, job) > base + 0.03, 'high morale helps');
});

test('the base runs without you: a day run twice is the same day, thirty days pass with the player anywhere, and a save keeps the readiness and what each person has become', () => {
  const g = warGame(810, { cash: 5_000_000 }); buildAll(g, 2); hireN(g, 'guard', 6); g.war.buySupply('rations', 300);
  days(g, 12); const snap = JSON.stringify(g.world.military); g.war.dailyTick(); assert.equal(JSON.stringify(g.world.military), snap, 'the same day again changes nothing');
  g.changeMap('lanternside', 'start'); days(g, 30); // the player is nowhere near
  const v = g.war.baseView(); assert.ok(v.readiness > 0 && v.day === g.clock.day);
  const g2 = roundtrip(g); assert.equal(g2.war.baseView().readiness, v.readiness); assert.deepEqual(g2.war.people().map((p) => p.morale), g.war.people().map((p) => p.morale));
});

test('bodies: the people on the books are drawn on Hollowmoor Lot, at most the cap, officers first; a person let go or away on a contract loses their body; the bodies are made again from the books after a load', () => {
  const g = warGame(811, { cash: 9_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 10);
  hireN(g, 'guard', 45); hireN(g, 'officer', 2);
  g.war.bodiesTick(); // (every game minute the books are looked at)
  const drawn = () => g.war.bodies();
  assert.ok(drawn().length > 0 && drawn().length <= BODIES.cap, `${drawn().length} drawn`);
  const officers = g.war.people().filter((p) => p.role === 'officer').map((p) => `war_${p.id}`);
  assert.ok(officers.every((id) => g.npcs.has(id)), 'officers are always drawn');
  // the first guard is let go, another is sent away
  const guards = g.war.people().filter((p) => p.role === 'guard');
  const gone = guards.find((p) => g.npcs.has(`war_${p.id}`)); assert.ok(g.war.dismiss(gone.id).ok);
  const away = guards.filter((p) => p !== gone && g.npcs.has(`war_${p.id}`))[0]; away.post = 'contract:K9';
  g.clock.total += 5; g.war.bodiesTick();
  assert.ok(!g.npcs.has(`war_${gone.id}`) && !g.npcs.has(`war_${away.id}`));
  away.post = null;
  const n = drawn().length; const g2 = roundtrip(g); assert.equal(g2.war.bodies().length, n, 'made again from the books');
  // nothing was saved as the truth: a body is not in the military record
  assert.ok(!JSON.stringify(g.world.military).includes('war_P'), 'the record holds people, not bodies');
});

test('the bodies follow the day to places that exist: at night in their barracks, by day at their duty, at meals outside the mess; the company\'s people use its doors and strangers do not', () => {
  const g = warGame(812, { cash: 9_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 4);
  hireN(g, 'guard', 3); hireN(g, 'technician', 2); g.war.hire('officer'); g.war.hire('rifleman');
  setTime(g, g.clock.day, '03:00'); g.war.bodiesTick(); g.clock.total += 5; g.war.bodiesTick();
  const body = g.war.bodies(); assert.ok(body.length >= 5);
  const inside = body.filter((n) => /^hollowmoor_lot__hm_/.test(n.map)); assert.ok(inside.length >= 5, 'asleep in the barracks');
  for (const n of g.war.bodies()) for (const b of n.profile.schedule) { const [map, spot] = b.spot.split(':'); assert.ok(g.maps.get(map)?.spotPx(spot), `${n.profile.name}: ${b.spot} is a place`); }
  // doors
  const door = g.maps.get('hollowmoor_lot').doors.find((d) => d.lock?.facility === 'mess'); assert.ok(door);
  assert.ok(g.npcCanPass(body[0], door), 'a soldier uses the company\'s door');
  const stranger = [...g.npcs.values()].find((n) => !n.profile.warStaff && !n.profile.hqStaff); assert.ok(!g.npcCanPass(stranger, door), 'a stranger does not');
  assert.equal(ROUTINE.length, 7);
});

test('a long run stays small and consistent: 300 days of a working company with people, squads, jobs, a general and rations leave the record bounded, the checker silent, the account reconciled and the wallet untouched', () => {
  const g = warGame(820, { cash: 9_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 30); g.war.buySupply('rations', 2000); hireN(g, 'guard', 6);
  cageGoods(g, 'aw1', { item_pistol: 20, item_smg: 20 }); g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 20 }); g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_smg', qty: 20 }); g.war.buySupply('radio', 30);
  for (let i = 0; i < 6; i++) g.war.hire('rifleman'); g.war.hire('officer'); days(g, 12);
  g.war.equipClass('rifleman'); g.war.hireGeneral('odalys');
  const sq = g.war.squadCreate().id; for (const p of g.war.people().filter((x) => x.role === 'rifleman')) g.war.squadAssign(sq, p.id); g.war.squadLeader(sq, g.war.people().find((p) => p.role === 'officer').id);
  const w0 = g.player.money; let at100 = 0;
  for (let d = 1; d <= 300; d++) {
    days(g, 1);
    for (const o of g.war.contracts().open) if (!o.lacks.length && o.guards <= 6) { g.war.accept(o.id); break; }
    if (d % 20 === 0) { g.war.buySupply('rations', 60); g.player.money += 50_000; g.war.fund(50_000); }
    if (d === 100) at100 = JSON.stringify(g.world.military).length;
    if (d % 75 === 0) { assert.deepEqual(g.war.check(), [], `day ${d}`); assert.ok(g.corp.reconciles()); }
  }
  const size = JSON.stringify(g.world.military).length;
  assert.ok(size < at100 * 1.35 && size < 90_000, `the record is ${size} bytes (${at100} at day 100)`);
  assert.ok(g.war.contracts().wins + g.war.contracts().losses > 10);
  assert.ok(g.war.engagements().open.length + g.war.engagements().done.length <= 20);
  assert.ok(g.war.bodies().length <= BODIES.cap + 2);
  assert.ok(g.player.money >= w0, 'the wallet only ever went up here, by what the test paid in');
});
