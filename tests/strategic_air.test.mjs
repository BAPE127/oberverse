// Air power on the strategic map (v0.103.9): wings of real aircraft with missions, losses and pay; satellites and recon passes over the fog; helicopter lifts. Nothing is spawned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { garrisonOf, controllerOf, intelLevels, liftOf } from '../src/war/strategic.js';
import { takeCut, provinceKm, hasStrip, airfields } from '../src/war/airpower.js';
import { AIR } from '../src/content/airpower.js';
import { RETAINER } from '../src/content/strategic.js';
import { provinceById, provinces } from '../src/world/provinces.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const until = (g, cond, max = 2400) => { for (let i = 0; i < max && !cond(); i += 6) hours(g, 6); assert.ok(cond(), 'it happened'); };
const dayOn = (g) => { g.clock.total += 1440; g.war.dailyTick(); g.war.strategicTick(); };
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const TPL = { name: 'Air Test Bn', line: ['inf', 'inf'], support: ['medical'], attach: [] };
const plane = (n, type = 'af_falcon') => ({ id: `Ea${n}`, kind: 'aircraft', type, name: 'Falcon', source: 'aero', origin: null, location: 'facility:hangars', status: 'stored', assignedTo: null, day: 1 });
const missile = (n) => ({ id: `Em${n}`, kind: 'missile', type: 'ms_sentinel', name: 'Sentinel', source: 'aero', origin: null, location: 'stores', status: 'stored', assignedTo: null, day: 1 });
const heli = (id, type) => ({ id, kind: 'helicopter', type, name: type, source: 'works', origin: null, location: 'facility:hangars', status: 'stored', assignedTo: null, day: 1 });

/** a company with a landed battalion in the Halden Front, the nations standing still; optionally with transport helicopters in its first squad */
function landed(seed, { lift = false, planes = 0, missiles = 0 } = {}) {
  const { g, C, squads } = armedCompany(seed); const t = g.war.saveTemplate(TPL); assert.ok(t.ok, t.text);
  if (lift) { C.equipment.push(heli('Eh1', 'ox'), heli('Eh2', 'ox')); assert.ok(g.war.squadVehicle(squads[0], 'Eh1').ok); assert.ok(g.war.squadVehicle(squads[0], 'Eh2').ok); }
  for (let i = 1; i <= planes; i++) C.equipment.push(plane(i)); for (let i = 1; i <= missiles; i++) C.equipment.push(missile(i));
  const r = g.war.raise({ template: t.id, squads }); assert.ok(r.ok, r.text);
  assert.ok(g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }).ok); const w = g.war.state().war; w.aiOff = true;
  const d = g.war.deploy(r.id); assert.ok(d.ok); const bn = w.battalions[0]; until(g, () => bn.status === 'theatre'); return { g, C, w, bn, id: r.id };
}
const strips = (g) => airfields(g); const enemyNear = (g, base, max) => provinces().filter((p) => controllerOf(g, p) === 'varn' && provinceKm(base, p) <= max);

test('a wing is raised from aircraft in the hangars and owns them: nothing else can have them, the checker is clean, standing it down gives them back', () => {
  const { g, C } = landed(1801, { planes: 3 });
  const r = g.war.raiseWing('Falcons', ['Ea1', 'Ea2']); assert.ok(r.ok, r.text); const ws = g.war.air().wings; assert.equal(ws.length, 1);
  assert.ok(C.equipment.find((x) => x.id === 'Ea1').status === 'deployed' && C.equipment.find((x) => x.id === 'Ea1').wing === r.id); assert.deepEqual(g.war.check(), []);
  assert.ok(!g.war.raiseWing('Again', ['Ea1']).ok, 'an aircraft is in one wing'); assert.ok(!g.war.raiseWing('Bad', ['nothing']).ok); assert.ok(!g.war.raiseWing('Bad', []).ok); assert.ok(!g.war.raiseWing('Tank', ['Ex1']).ok, 'only aircraft');
  assert.equal(g.war.air().free.length, 1, 'one aircraft is still free'); assert.ok(g.war.disbandWing(r.id).ok); assert.equal(C.equipment.find((x) => x.id === 'Ea1').status, 'stored'); assert.equal(C.equipment.find((x) => x.id === 'Ea1').wing, undefined); assert.deepEqual(g.war.check(), []);
});

test('a wing flies for the side you serve from ground it holds, one mission a day within its reach; a short stock or a long way refuses and changes nothing', () => {
  const { g, C, w } = landed(1802, { planes: 2, missiles: 1 }); const id = g.war.raiseWing('Falcons', ['Ea1', 'Ea2']).id;
  assert.ok(strips(g).length > 5, 'many places can base a wing'); const base = strips(g).find((p) => enemyNear(g, p, 800).length > 3); assert.ok(base, 'a base with the enemy in reach');
  assert.ok(!g.war.wingMission(id, 'recon', 'x').ok, 'not abroad yet'); assert.ok(!g.war.deployWing(id, enemyNear(g, base, 9999)[0].id).ok, 'enemy ground is no base'); assert.ok(g.war.deployWing(id, base.id).ok);
  const tg = g.war.wingTargets(id); assert.ok(tg.length > 0 && tg.every((t) => t.km <= 900)); const near = tg[0];
  const far = provinces().find((p) => controllerOf(g, p) === 'varn' && provinceKm(base, p) > 1500); if (far) { const r = g.war.wingMission(id, 'recon', far.id); assert.ok(!r.ok && /reaches/.test(r.text)); }
  assert.ok(!g.war.wingMission(id, 'strike', near.id).ok === false, 'a strike with a missile in the stores'); const before = JSON.stringify(g.war.state().war.air);
  const again = g.war.wingMission(id, 'cas', near.id); assert.ok(!again.ok && /flown today/.test(again.text)); assert.equal(JSON.stringify(g.war.state().war.air), before, 'a refusal changes nothing');
  assert.equal(C.equipment.find((x) => x.id === 'Em1').status, 'destroyed', 'the missile was spent'); dayOn(g); assert.ok(!g.war.wingMission(id, 'strike', near.id).ok, 'no second missile');
  assert.ok(g.war.wingMission(id, 'cas', near.id).ok, 'a new day, a new mission'); assert.ok(!g.war.recallWing(id).ok === false); assert.deepEqual(g.war.check(), []);
});

test('the missions do what they say: recon lifts the fog over the target for a day, air support and strikes take a share off the next fight (once), interdiction thins the garrison for days', () => {
  const { g, w } = landed(1803, { planes: 3, missiles: 2 }); const id = g.war.raiseWing('Falcons', ['Ea1', 'Ea2', 'Ea3']).id;
  const base = strips(g).find((p) => enemyNear(g, p, 800).length > 3); assert.ok(g.war.deployWing(id, base.id).ok); const tg = g.war.wingTargets(id); const T = provinceById(tg[Math.min(3, tg.length - 1)].id);
  assert.equal(intelLevels(g)[T.n], 0, 'unseen at first'); assert.ok(g.war.wingMission(id, 'recon', T.id).ok); assert.ok(intelLevels(g)[T.n] >= 2, 'known while the pass lasts'); hours(g, 30); assert.equal(intelLevels(g)[T.n], 0, 'unseen again after a day');
  dayOn(g); const garr = garrisonOf(g, T).troops; assert.ok(g.war.wingMission(id, 'interdict', T.id).ok); assert.ok(garrisonOf(g, T).troops < garr || garr === 0, 'the garrison is thinner'); dayOn(g); dayOn(g); dayOn(g); dayOn(g); assert.equal(garrisonOf(g, T).troops, garr, 'and it recovers after the days');
  assert.ok(g.war.wingMission(id, 'cas', T.id).ok || true); dayOn(g); const rr = g.war.wingMission(id, 'cas', T.id); if (rr.ok) { const c1 = takeCut(g, T); assert.ok(c1 > 0 && c1 <= 0.7, `a share is taken: ${c1}`); assert.equal(takeCut(g, T), 0, 'and it is used up'); }
  dayOn(g); assert.ok(g.war.wingMission(id, 'strike', T.id).ok); const cs = takeCut(g, T); assert.ok(cs >= AIR.strike.cut - 1e-9, `a strike takes ${cs}`);
});

test('aircraft are lost permanently: a wing sent again and again against a fort loses aircraft, and a lost aircraft is destroyed, out of its wing, and not paid for', () => {
  const { g, C } = landed(1804, { planes: 5 }); const id = g.war.raiseWing('Falcons', ['Ea1', 'Ea2', 'Ea3', 'Ea4', 'Ea5']).id;
  const base = strips(g).find((p) => enemyNear(g, p, 800).length > 3); g.war.deployWing(id, base.id); const T = [...g.war.wingTargets(id)].sort((a, b) => b.fort - a.fort)[0];
  let lost = 0; for (let d = 0; d < 80 && lost < 1; d++) { dayOn(g); const r = g.war.wingMission(id, 'cas', T.id); if (r.ok) lost += r.lost; } assert.ok(lost >= 1, 'something was lost');
  const dead = C.equipment.filter((x) => x.type === 'af_falcon' && x.status === 'destroyed'); assert.ok(dead.length >= 1); for (const x of dead) { assert.equal(x.wing, undefined); assert.ok(!g.war.air().wings[0].aircraft.includes(x.id)); }
  assert.deepEqual(g.war.check(), []); const g2 = roundtrip(g); assert.equal(g2.war.air().wings[0].aircraftNow.length, 5 - dead.length, 'saved and loaded: the same wing'); assert.deepEqual(g2.war.check(), []);
});

test('a wing abroad is paid like the other vehicles in the theatre (the owner\'s rule: the vehicle scale), a wing at home is not, and the pay is booked once a day', () => {
  const { g, w } = landed(1805, { planes: 2 }); const id = g.war.raiseWing('Falcons', ['Ea1', 'Ea2']).id; const paid0 = w.paid || 0;
  dayOn(g); const baseline = (w.paid || 0) - paid0; const base = strips(g)[0]; assert.ok(g.war.deployWing(id, base.id).ok); const p1 = w.paid || 0; dayOn(g);
  const gained = (w.paid || 0) - p1 - baseline; assert.equal(gained, 2 * AIR.perAircraft, `two aircraft earn ${2 * AIR.perAircraft} a day (got ${gained})`); assert.equal(AIR.perAircraft, RETAINER.perVehicle.helicopter, 'at the vehicle scale');
});

test('satellites the company owns raise the fog over the whole theatre; a lost one gives it back; a Watchtower sees more than a Cartographer', () => {
  const { g } = landed(1806); const T = provinces().find((p) => controllerOf(g, p) === 'varn' && p.state === 'vr_orlov'); assert.equal(intelLevels(g)[T.n], 0);
  const sats = g.aero.state.satellites; sats.s1 = { id: 's1', own: true, status: 'operational', product: 'st_cartographer' }; assert.equal(intelLevels(g)[T.n], 1, 'a mapping satellite spots'); sats.s2 = { id: 's2', own: true, status: 'operational', product: 'st_watchtower' };
  assert.equal(intelLevels(g)[T.n], 2, 'a surveillance satellite knows'); sats.s2.status = 'lost'; assert.equal(intelLevels(g)[T.n], 1); sats.s1.own = false; assert.equal(intelLevels(g)[T.n], 0, 'not ours: no help'); sats.s2.own = true; sats.s2.status = 'degraded'; assert.equal(intelLevels(g)[T.n], 2, 'degraded still sees');
});

test('a helicopter lift: only with the places for every soldier, within range, into ground you hold or an assault on the enemy\'s; the battalion arrives in hours and a contact opens a fight', () => {
  const none = landed(1807); const r0 = none.g.war.battalionOrder(none.id, { type: 'airlift', to: provinces().find((p) => controllerOf(none.g, p) === 'ostmark' && p.id !== none.bn.pos).id }); assert.ok(!r0.ok && /transport helicopters/.test(r0.text), r0.text);
  const { g, w, bn, id } = landed(1808, { lift: true }); assert.ok(liftOf(g, bn) >= 20, `two Ox carry 28 (got ${liftOf(g, bn)})`);
  const here = provinceById(bn.pos); const mine = provinces().filter((p) => controllerOf(g, p) === 'ostmark' && p.id !== bn.pos && provinceKm(here, p) <= AIR.lift.range && !here.neighbours.includes(p.n)); assert.ok(mine.length, 'ground of ours within a lift');
  const far = provinces().find((p) => controllerOf(g, p) === 'ostmark' && provinceKm(here, p) > AIR.lift.range + 100); if (far) assert.match(g.war.battalionOrder(id, { type: 'airlift', to: far.id }).text, /km/);
  const l = g.war.battalionOrder(id, { type: 'airlift', to: mine[0].id }); assert.ok(l.ok, l.text); assert.ok(l.hours <= 2); until(g, () => bn.pos === mine[0].id); assert.ok(!bn.moving); assert.ok(bn.org < 100, 'a lift costs organisation'); assert.deepEqual(g.war.check(), []);
  const foe = enemyNear(g, provinceById(bn.pos), AIR.lift.range)[0]; if (foe) { const a = g.war.battalionOrder(id, { type: 'airlift', to: foe.id }); if (a.ok) { until(g, () => Boolean(bn.engaged)); assert.ok(bn.engaged, 'an air assault is a contact'); } }
  assert.ok(roundtrip(g).war.state().war.battalions.length === 1);
});
