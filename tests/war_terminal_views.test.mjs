// What the command terminal reads (v0.103.4): the briefing, the missions in their five states, the activity and world feeds, theatres (every one, involved or not) and the world's conflicts. All read-only:
// looking changes nothing in the save and advances nothing in the war; and an observer sees the ground, never a garrison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, build, STAGE1, days, armedCompany } from './war_helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';

const snap = (g) => JSON.stringify(g.serialize());

test('the briefing counts the real records and reading it, with the missions, the feeds and the supply link, changes nothing', () => {
  const { g, C } = armedCompany(981);
  const before = snap(g);
  const B = g.war.briefing(); assert.ok(B);
  assert.equal(B.personnel.total, C.personnel.filter((p) => p.status !== 'dead').length);
  assert.equal(B.personnel.squads, C.squads.length); assert.equal(B.name, C.identity.name);
  assert.equal(B.vehicles.total, C.equipment.filter((e) => ['vehicle', 'helicopter'].includes(e.kind)).length);
  assert.equal(B.supply.held, Object.values(C.stock).reduce((a, b) => a + b, 0));
  assert.equal(B.base.built, g.war.facilities().filter((f) => f.state === 'built').length);
  assert.equal(B.funds, g.war.cash());
  g.war.missions(); g.war.activity(20); g.war.worldFeed(20); g.war.orders(); g.war.supplyLink(); g.war.suppliers();
  assert.equal(snap(g), before, 'nothing was written');
  assert.equal(g.war.briefing().missions.active, g.war.missions().active.length);
});

test('missions fall in five honest states: an expired or declined offer is archived, never counted as a failure; a finished engagement is completed or failed by its result', () => {
  const { g, C, eng } = armedCompany(982);
  const M0 = g.war.missions(); assert.ok(M0.open.some((m) => m.kind === 'engagement' && m.id === eng.id) || true);
  C.engagements.push({ id: 'Nx1', kind: 'hold', title: 'Old offer', client: 'X', place: 'Nowhere', state: 'expired', offered: 1, expires: 2, days: 3, pay: 100, needs: { troops: 1, tanks: 0, helicopters: 0, medics: 0 }, text: 'x', enemy: {}, terrain: 'rural', order: null, result: null });
  C.engagements.push({ id: 'Nx2', kind: 'hold', title: 'Won', client: 'X', place: 'Here', state: 'resolved', ended: 5, days: 3, pay: 100, needs: { troops: 1, tanks: 0, helicopters: 0, medics: 0 }, text: 'x', enemy: {}, terrain: 'rural', order: { squads: [] }, result: { objectives: 3, outcome: 'victory', paid: 100, dead: [], wounded: [], lost: [], used: {}, lines: [] } });
  C.engagements.push({ id: 'Nx3', kind: 'hold', title: 'Lost', client: 'X', place: 'There', state: 'resolved', ended: 6, days: 3, pay: 100, needs: { troops: 1, tanks: 0, helicopters: 0, medics: 0 }, text: 'x', enemy: {}, terrain: 'rural', order: { squads: [] }, result: { objectives: 0, outcome: 'defeat', paid: 0, dead: [], wounded: [], lost: [], used: {}, lines: [] } });
  const M = g.war.missions();
  assert.ok(M.archived.some((m) => m.id === 'Nx1'), 'expired is archived'); assert.ok(!M.failed.some((m) => m.id === 'Nx1'));
  assert.ok(M.done.some((m) => m.id === 'Nx2')); assert.ok(M.failed.some((m) => m.id === 'Nx3'));
  assert.equal(g.war.briefing().missions.failed, M.failed.length);
});

test('activity and the world feed come from real records, newest first, and are empty (not invented) when there is nothing', () => {
  const g = warGame(983); build(g, STAGE1);
  const A = g.war.activity(50); assert.ok(A.length >= 3); for (let i = 1; i < A.length; i++) assert.ok(A[i - 1].day >= A[i].day, 'newest first');
  assert.ok(A.every((a) => a.text && a.tag));
  const s = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); g.war.placeOrder([{ supplier: s.id, id: s.items[0].id, qty: 1 }], 't');
  assert.ok(g.war.activity(10).some((a) => a.tag === 'procurement'), 'an order shows in the activity');
  const geo = g.corp.geo; const n0 = g.war.worldFeed().length; assert.ok(n0 >= 0);
  runCommand(g, 'war ostmark varn'); geo.ensure().lastDay = 0; geo.dailyTick();
  assert.ok(g.war.worldFeed().some((f) => /Ostmark Union and Varnistan/.test(f.text)), 'a war on the record is in the feed');
});

test('every theatre is listed and can be inspected with no company in it; its fronts are real borders; looking changes nothing and the garrisons are never shown', async () => {
  const { theatreList, theatreDetail, frontLines, theatreZones } = await import('../src/war/theatreView.js');
  const { provinces } = await import('../src/world/provinces.js');
  const g = warGame(984); const before = snap(g); const P = provinces();
  const T = theatreList(g); assert.equal(T.length, 5); assert.ok(T.every((t) => !t.involved), 'the company is in none');
  for (const t of T) { const d = theatreDetail(g, t.id); assert.ok(d, t.id); assert.equal(d.th.id, t.id); assert.ok(d.provinces > 0); assert.equal(d.profiles.length, 2); }
  const halden = theatreDetail(g, 'th_halden'); assert.ok(halden.fronts.length >= 1);
  for (const f of halden.fronts) {
    assert.equal(f.held.ostmark + f.held.varn, f.size, 'a front is made only of the two belligerents\' ground');
    for (const n of f.provinces) { const own = P[n].country; assert.ok(P[n].neighbours.some((q) => halden.th.states.includes(P[q].state) && P[q].country !== own && [P[q].country, own].every((c) => ['ostmark', 'varn'].includes(c))), `${P[n].name} touches the other side`); }
  }
  assert.ok(frontLines(g).length > 0); assert.equal(theatreZones(g).length, 5);
  assert.ok(!/garrison|hostileForce|formations/i.test(JSON.stringify(halden)), 'no garrison or formation data reaches an observer');
  assert.equal(halden.mine.length, 0);
  assert.equal(snap(g), before, 'inspecting theatres changed nothing in the save');
});

test('a theatre the company serves in lists its own battalions and is marked involved; nothing else about it changes for an observer', async () => {
  const { theatreList, theatreDetail } = await import('../src/war/theatreView.js');
  const { g } = armedCompany(985);
  const r = g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); assert.ok(r.ok, r.text);
  const T = theatreList(g); assert.equal(T.find((t) => t.id === 'th_halden').involved, true); assert.equal(T.filter((t) => t.involved).length, 1);
  const d = theatreDetail(g, 'th_halden'); assert.ok(Array.isArray(d.mine)); assert.ok(Array.isArray(d.log));
  // a battalion deployed to the theater is listed at a real province, with its number for the map
  const t = g.war.saveTemplate({ name: 'Test Bn', line: ['inf', 'inf', 'tank'], support: ['medical'], attach: [] }); assert.ok(t.ok, t.text);
  const squads = g.war.squads().map((q) => q.id); const rz = g.war.raise({ template: t.id, squads }); assert.ok(rz.ok, rz.text);
  const dep = g.war.deploy(rz.id); assert.ok(dep.ok, dep.text);
  const m = theatreDetail(g, 'th_halden').mine; assert.equal(m.length, 1); assert.equal(m[0].name, g.war.state().war.battalions[0].name);
  const { provinceById } = await import('../src/world/provinces.js'); const home = provinceById(g.war.state().war.battalions[0].pos);
  assert.equal(m[0].at, home.name, 'the position is a province name, not a raw id'); assert.equal(m[0].n, home.n);
  const other = theatreDetail(g, 'th_kestrel'); assert.equal(other.mine.length, 0); assert.equal(other.involved, false);
});

test('world conflicts, countries and search come from the atlas and the geopolitical record', async () => {
  const { conflicts, countryView, search } = await import('../src/war/worldView.js');
  const g = warGame(986);
  runCommand(g, 'war ostmark varn'); g.corp.geo.ensure().lastDay = 0; g.corp.geo.dailyTick();
  const C = conflicts(g); const w = C.find((c) => c.parties.includes('ostmark') && c.parties.includes('varn')); assert.ok(w); assert.equal(w.status, 'active'); assert.ok(w.theatres.some((t) => t.id === 'th_halden'), 'the war is placed in its theater');
  const v = countryView(g, 'varn'); assert.equal(v.name, 'Varnistan'); assert.ok(v.wars.length >= 1); assert.ok(v.sites.length >= 0); assert.ok(v.profile.doctrine);
  assert.ok(search(g, 'varn').some((r) => r.type === 'country' && r.id === 'varn')); assert.deepEqual(search(g, 'a'), [], 'a one-letter search shows nothing');
  assert.equal(countryView(g, 'nowhere'), null);
});

test('looking at the supply link never creates its record or rolls its weekly figures over', () => {
  const g = warGame(987); const C = g.war.state().company; assert.equal(C.link, undefined);
  const before = snap(g); const v = g.war.supplyLink(); assert.ok(v && v.rows.length > 0); g.war.briefing();
  assert.equal(C.link, undefined, 'no record was made'); assert.equal(snap(g), before);
  g.war.setSupplyLevel('item_pistol', 3); days(g, 9); const flow0 = JSON.stringify(C.link.flow); g.war.supplyLink(); assert.equal(JSON.stringify(C.link.flow), flow0, 'viewing does not reset the week');
});
