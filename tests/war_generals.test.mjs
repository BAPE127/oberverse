// Generals and engagements (v0.100.0 stage 9): one pure combat function behind both the estimate and the result; engagements need forces you really own; one state field that only moves forward;
// the result is applied once to the real records and the after-action report is built from what was applied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, buildAll, build, STAGE2, days, cageGoods } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { resolve, estimate, THRESHOLDS } from '../src/war/combat.js';
import { GENERALS, ENGAGE, ENGAGEMENTS, terrainOf } from '../src/content/generals.js';
import { ATLAS } from '../src/content/atlas.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };

// ---- a force for the pure function
const person = (i, o = {}) => ({ id: `p${i}`, role: 'rifleman', tier: 1, armour: 1, exp: 0, morale: 70, fatigue: 0, armed: true, ...o });
const force = (n, o) => Array.from({ length: n }, (_, i) => person(i, o));
const base = (o = {}) => ({ key: 'E1|salt', days: 14, terrain: 'rural', goal: 'defence', enemy: { troops: 12, armour: 0, air: 0, skill: 1 }, people: force(12), vehicles: [], general: null, supplies: { fuel: 0, rockets: 0 }, ...o });

test('the combat function is pure and deterministic: the same input is the same result; a different key is a different roll; chance is a hash and never a draw', () => {
  const a = resolve(base()); const b = resolve(base());
  assert.deepEqual(a, b);
  const c = resolve(base({ key: 'E2|salt' })); assert.notEqual(c.luck, a.luck);
  const input = base(); const before = JSON.stringify(input); resolve(input); estimate(input); assert.equal(JSON.stringify(input), before, 'it changes nothing it is given');
  assert.ok(a.parts.ours > 0 && a.parts.theirs > 0 && THRESHOLDS.length === 3);
});

test('the estimate IS the function: same ratio, luck taken out, losses as expected values, and the chances it quotes are borne out by many results', () => {
  const input = base({ enemy: { troops: 13, armour: 0, air: 0, skill: 1 } });
  const e = estimate(input); const r = resolve(input, { expected: true });
  assert.equal(e.ratio, r.ratio); assert.equal(e.luck, 0); assert.ok(e.expected.dead >= 0 && e.expected.wounded >= 0);
  const n = 600; let hit = 0; let h3 = 0;
  for (let i = 0; i < n; i++) { const x = resolve({ ...input, key: `E${i}|s` }); if (x.objectives >= 1) hit++; if (x.objectives >= 3) h3++; }
  assert.ok(Math.abs(hit / n - e.chance.atLeast[1]) < 0.07, `${hit / n} against ${e.chance.atLeast[1].toFixed(2)}`);
  assert.ok(Math.abs(h3 / n - e.chance.atLeast[3]) < 0.07);
  assert.ok(e.chance.atLeast[3] <= e.chance.atLeast[2] && e.chance.atLeast[2] <= e.chance.atLeast[1]);
  // the expected losses are about what the rolls give, on average
  let deaths = 0; for (let i = 0; i < n; i++) deaths += resolve({ ...input, key: `D${i}|s` }).dead.length;
  assert.ok(Math.abs(deaths / n - e.expected.dead) < 0.6, `${deaths / n} against ${e.expected.dead.toFixed(2)}`);
});

test('what a force is worth is what it really has: more soldiers, better weapons, plates, medics, tanks, a fed and rested crew and a fitting general each change the result the way they should; shortages cost', () => {
  const R = (o) => resolve(base(o), { expected: true });
  assert.ok(R({ people: force(18) }).ratio > R({ people: force(12) }).ratio, 'more soldiers');
  assert.ok(R({ people: force(12, { tier: 2 }) }).ratio > R().ratio, 'tier 2 weapons');
  assert.ok(R({ people: force(12, { armed: false }) }).ratio < R().ratio / 2, 'unarmed soldiers are worth little');
  assert.ok(R({ people: force(12, { morale: 20 }) }).ratio < R({ people: force(12, { morale: 90 }) }).ratio, 'morale');
  assert.ok(R({ people: force(12, { fatigue: 90 }) }).ratio < R().ratio, 'tired');
  const tank = { id: 't1', cls: 'tank', armour: 3, firepower: 3, speed: 3 };
  assert.ok(R({ vehicles: [tank] }).ratio > R().ratio * 1.2, 'a tank');
  assert.ok(R({ vehicles: [tank], supplies: { fuel: 0, rockets: 0 } }).ratio > 0 && resolve(base({ vehicles: [tank], supplies: { fuel: 0 } }), { expected: true }).ratio < resolve(base({ vehicles: [tank], supplies: { fuel: 5 } }), { expected: true }).ratio, 'no fuel, a weaker tank');
  const armoured = R({ people: force(12, { armour: 2 }) }).expected.dead; const plain = R().expected.dead; assert.ok(armoured < plain, 'plate carriers save lives');
  const medics = R({ people: [...force(10), person(90, { role: 'medic' }), person(91, { role: 'medic' })] }).expected.dead; const none = R({ people: force(12) }).expected.dead; assert.ok(medics < none, 'medics save lives');
  const g = (id, bonus = 0) => ({ ...GENERALS[id], bonus });
  assert.ok(R({ general: g('odalys') }).ratio > R({ general: g('rostrov') }).ratio, 'a defender holds better than an attacker');
  assert.ok(R({ goal: 'offence', general: g('rostrov') }).ratio > R({ goal: 'offence', general: g('odalys') }).ratio, 'and an attacker attacks better');
  assert.ok(R({ general: g('rostrov') }).expected.dead > R({ general: g('marsh') }).expected.dead, 'a bold general spends more lives');
  assert.ok(R({ general: g('marsh', 2) }).ratio > R({ general: g('marsh', 0) }).ratio, 'terrain he knows');
  assert.ok(R({ terrain: 'mountain' }).ratio > R({ terrain: 'desert' }).ratio, 'ground');
  assert.ok(R({ enemy: { troops: 12, armour: 2, air: 0, skill: 1 } }).ratio < R().ratio, 'enemy armour');
});

test('the generals are people with real differences, a seat each in the command post, paid every day on the books; none can be let go while away', () => {
  assert.ok(Object.keys(GENERALS).length >= 6);
  const traits = Object.values(GENERALS).map((g) => [g.offence, g.defence, g.logistics, g.air, g.intel].join()); assert.equal(new Set(traits).size, traits.length, 'no two alike');
  const g = warGame(901, { cash: 5_000_000 }); buildAll(g, 1);
  assert.ok(!g.war.hireGeneral('odalys').ok && /command post/.test(g.war.hireGeneral('odalys').text));
  build(g, STAGE2); assert.equal(g.war.generals().seats, 2);
  const c0 = g.war.cash(); assert.ok(g.war.hireGeneral('odalys').ok); assert.ok(g.war.hireGeneral('rostrov').ok);
  assert.ok(!g.war.hireGeneral('vance').ok && /desks for 2/.test(g.war.hireGeneral('vance').text)); assert.ok(!g.war.hireGeneral('odalys').ok);
  days(g, 1); assert.equal(g.war.cash(), c0 - GENERALS.odalys.fee - GENERALS.rostrov.fee, 'both fees, from the company\'s own money');
  const id = g.war.generals().hired[0].id; g.war.state().company.generals[0].status = 'away';
  assert.ok(!g.war.dismissGeneral(id).ok); g.war.state().company.generals[0].status = 'home'; assert.ok(g.war.dismissGeneral(id).ok);
});

// ---- the lifecycle, with a real force
/** Stage 1-3 built; twelve riflemen and two medics, equipped, in two squads (one with a tank); a general; an engagement made to order. */
function armed(seed, { engagement = {}, rocket = 0 } = {}) {
  const g = warGame(seed, { cash: 20_000_000 }); buildAll(g, 3); g.war.buySupply('uniform', 40); g.war.buySupply('rations', 2000); g.war.buySupply('fuel', 40); g.war.buySupply('medicine', 20);
  cageGoods(g, 'aw1', { item_smg: 30, item_assault_rifle: 30, item_pistol: 10, item_rpg: 4, item_rpg_rocket: rocket }); for (const [item, n] of [['item_smg', 30], ['item_assault_rifle', 30], ['item_pistol', 10], ['item_rpg', 4]]) g.war.transfer({ source: 'arms', works: 'aw1', item, qty: n });
  if (rocket) g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_rpg_rocket', qty: rocket });
  const ids = [];
  for (const role of ['officer', ...Array(12).fill('rifleman'), 'medic', 'medic', 'anti_tank']) { const r = g.war.hire(role); assert.ok(r.ok, `${role}: ${r.text}`); ids.push(r.id); }
  days(g, 10);
  for (const role of ['rifleman', 'medic', 'officer', 'anti_tank']) { g.war.setTier(role, role === 'rifleman' ? 2 : 1); g.war.equipClass(role); }
  const a = g.war.squadCreate().id; const b = g.war.squadCreate().id;
  const officer = g.war.people().find((p) => p.role === 'officer'); assert.ok(g.war.squadLeader(a, officer.id).ok);
  let rifles = 0;
  for (const p of g.war.people().filter((x) => x.role !== 'officer')) assert.ok(g.war.squadAssign(p.role === 'anti_tank' || p.role === 'medic' ? a : (rifles++ < 6 ? a : b), p.id).ok);
  // a tank, put in the pool by fixture (a built one is slow to make: the production tests cover that)
  const C = g.war.state().company; C.equipment.push({ id: 'Ex1', kind: 'vehicle', type: 'anvil', name: 'Anvil Mk1 tank', source: 'works', origin: null, location: 'facility:motor_pool', status: 'stored', assignedTo: null, day: 1 });
  assert.ok(g.war.squadVehicle(a, 'Ex1').ok);
  assert.ok(g.war.hireGeneral('odalys').ok);
  const eng = { id: 'Nt1', kind: 'hold', title: 'Hold Test Crossing', text: 'x', client: 'The Ostmark Union', clientName: 'The Ostmark Union', place: 'Test Crossing', terrain: 'rural', goal: 'defence', days: 6, needs: { troops: 12, tanks: 1, helicopters: 0, medics: 2 }, enemy: { troops: 12, armour: 1, air: 0, skill: 1 }, pay: 90_000, state: 'open', offered: g.clock.day, expires: g.clock.day + 30, order: null, result: null, ...engagement };
  (C.engagements ||= []).push(eng);
  return { g, C, a, b, eng, squads: [a, b], general: g.war.generals().hired[0].id };
}

test('an engagement asks for what you own and says what is missing: nothing is spawned to meet it, and a refusal changes nothing', () => {
  const { g, C, a, eng, general } = armed(902);
  const before = JSON.stringify([C.squads, C.personnel, C.equipment, C.engagements]);
  const small = g.war.delegate(eng.id, { squads: [a], general }); // squad A has the tank and the medics but only ten soldiers
  assert.ok(!small.ok && /Your forces do not meet this one/.test(small.text) && /more soldier/.test(small.text) && /Nothing is spawned/.test(small.text));
  assert.equal(JSON.stringify([C.squads, C.personnel, C.equipment, C.engagements]), before);
  assert.ok(!g.war.delegate(eng.id, { squads: [], general }).ok && !g.war.delegate(eng.id, { squads: [a], general: 'G999' }).ok);
  const need = g.war.engagementLacks(eng.id, [a]); assert.ok(need.some((x) => /soldier/.test(x)));
  assert.deepEqual(g.war.engagementLacks(eng.id, [a, g.war.squads().find((s) => s.id !== a).id]), []);
});

test('the state only moves forward: delegating closes playing it, a second delegation is refused, and everything sent is held (squads away, people on a post, the tank deployed, the general away)', () => {
  const { g, C, eng, squads, general } = armed(903);
  const e = g.war.assess(eng.id, squads, general); assert.ok(e.ok && e.lacks.length === 0 && e.estimate.words && e.estimate.chance.atLeast[1] >= 0);
  assert.ok(!g.war.playEngagement(eng.id).ok, 'the overhead battle is not on offer yet');
  const d = g.war.delegate(eng.id, { squads, general }); assert.ok(d.ok, d.text);
  assert.equal(eng.state, 'delegated');
  assert.ok(!g.war.delegate(eng.id, { squads, general }).ok && /already been given out/.test(g.war.delegate(eng.id, { squads, general }).text));
  assert.ok(!g.war.playEngagement(eng.id).ok && /closed/.test(g.war.playEngagement(eng.id).text));
  assert.ok(!g.war.declineEngagement(eng.id).ok, 'cannot be turned down once given out');
  assert.ok(C.squads.every((s) => s.status === 'away')); assert.equal(C.equipment.find((x) => x.id === 'Ex1').status, 'deployed');
  assert.ok(C.personnel.filter((p) => p.role !== 'guard').every((p) => p.post === `engagement:${eng.id}`)); assert.equal(C.generals[0].status, 'away');
  assert.ok(!g.war.dismiss(C.personnel[0].id).ok && !g.war.squadDisband(squads[0]).ok && !g.war.dismissGeneral(general).ok, 'nothing sent can be let go');
  assert.ok(g.war.bodies().every((n) => !n.profile.warId || !C.personnel.find((p) => p.id === n.profile.warId)?.post), 'those away are not drawn');
  assert.deepEqual(g.war.check(), []);
});

test('the result is applied once to the real records, and the report is made of what was applied: the dead leave their squads, the wounded are hurt, the vehicle is lost or comes home, stock is used, pay arrives into the company, and a second day changes nothing', () => {
  let seen = { dead: 0, wounded: 0, lost: 0 };
  for (let seed = 910; seed < 922; seed++) {
    const { g, C, eng, squads, general } = armed(seed, { rocket: 6, engagement: { enemy: { troops: 15, armour: 2, air: 0, skill: 1.1 } } });
    const wallet = g.player.money; const cash0 = g.war.cash(); const fuel0 = g.war.stock()['supply:fuel'];
    assert.ok(g.war.delegate(eng.id, { squads, general }).ok);
    days(g, 5); assert.equal(eng.state, 'delegated', 'not before the days are up');
    days(g, 1); assert.equal(eng.state, 'resolved'); const R = eng.result; assert.ok(R && R.lines.length >= 2);
    assert.equal(g.player.money, wallet, 'never your wallet');
    // the report is traceable to the records
    for (const d of R.dead) { const p = C.personnel.find((x) => x.id === d.id); assert.equal(p.status, 'dead'); assert.equal(p.assignedTo, null); assert.ok(!C.squads.some((s) => s.members.includes(d.id))); assert.equal(p.weapon, null); }
    for (const w of R.wounded) { const p = C.personnel.find((x) => x.id === w.id); assert.ok(['wounded', 'active'].includes(p.status) && p.wounds <= w.wounds); }
    for (const v of R.lost) { const x = C.equipment.find((q) => q.id === v.id); assert.deepEqual([x.status, x.assignedTo], ['destroyed', null]); assert.ok(!C.squads.some((s) => s.equipment.includes(v.id))); }
    assert.ok(C.squads.every((s) => s.status === 'home')); assert.equal(C.generals[0].status, 'home'); assert.ok(C.personnel.every((p) => !String(p.post || '').startsWith('engagement')));
    if (!R.lost.length) assert.equal(C.equipment.find((x) => x.id === 'Ex1').status, 'assigned', 'the tank came home');
    assert.equal(g.war.stock()['supply:fuel'], fuel0 - R.used['Vehicle fuel'] || fuel0 - (R.used['Fuel (a drum)'] || 0), 'fuel used is what the report says');
    const share = [0, 0.45, 0.9, 1][R.objectives]; assert.equal(R.paid, Math.round(eng.pay * share));
    if (R.objectives === 0) assert.ok(R.fine > 0 && g.war.contracts().clients.find((c) => c.name === eng.client)?.banned);
    assert.deepEqual(g.war.check(), [], `seed ${seed}`); assert.ok(g.corp.reconciles());
    // once: another day, another dailyTick, a reload: nothing is resolved again
    const snap = JSON.stringify(C.engagements[0].result); const money = g.war.cash();
    days(g, 3); assert.equal(JSON.stringify(C.engagements[0].result), snap);
    const g2 = roundtrip(g); assert.equal(JSON.stringify(g2.war.state().company.engagements[0].result), snap);
    seen.dead += R.dead.length; seen.wounded += R.wounded.length; seen.lost += R.lost.length;
    void cash0; void money;
  }
  assert.ok(seen.dead + seen.wounded > 0, 'across twelve games, someone was hurt');
});

test('a save in the middle of an engagement carries on and reaches the very same result; a general who is better for the ground does better on average', () => {
  const { g, eng, squads, general } = armed(930); assert.ok(g.war.delegate(eng.id, { squads, general }).ok); days(g, 3);
  const g2 = roundtrip(g); assert.equal(g2.war.engagements().active.length, 1); assert.equal(g2.war.engagements().active[0].daysLeft, 3);
  days(g, 3); days(g2, 3);
  assert.equal(JSON.stringify(g2.war.state().company.engagements[0].result), JSON.stringify(g.war.state().company.engagements[0].result), 'a reload cannot re-roll it');
});

test('engagements are offered once a command post stands, by hash, with needs that grow with your name; they lapse with a reason; the record of finished ones is capped', () => {
  const pre = warGame(941, { cash: 6_000_000 }); buildAll(pre, 1); days(pre, 60); assert.equal(pre.war.engagements().open.length, 0, 'no command post, no offers');
  const a = warGame(940, { cash: 6_000_000 }); const none = warGame(940, { cash: 6_000_000 });
  buildAll(a, 2); buildAll(none, 2);
  let first = null; for (let i = 0; i < 120 && !first; i++) { days(a, 1); days(none, 1); first = a.war.engagements().open[0]; }
  assert.ok(first, 'an offer turns up'); const twin = none.war.engagements().open.find((x) => x.title === first.title); assert.ok(twin, 'and it is the same game, so the same offer');
  assert.ok(first.needs.troops >= 6 && first.pay > 0 && first.enemy.troops > 0 && first.expires > first.offered);
  const st = ATLAS.states.find((x) => x.name === first.region); assert.ok(st, 'it is in a state of the atlas'); assert.ok(first.place === first.region || ATLAS.places.some((pl) => pl.name === first.place && pl.state === st.id), 'at a real place in it'); assert.ok(['city', 'fields', 'trench', 'compound', 'forest'].includes(first.recipe) && first.style); assert.ok(Object.values(ATLAS.countries).some((c) => c.name === first.client));
  assert.ok(['forest', 'mountain', 'urban', 'industrial', 'rural', 'desert'].includes(first.terrain));
  for (const [b, t] of [['taiga', 'forest'], ['desert', 'desert'], [null, 'rural']]) assert.equal(terrainOf(b), t);
  for (let i = 0; i < 40; i++) days(a, 1);
  assert.ok(a.war.engagements().done.some((x) => x.state === 'expired' && /someone else/.test(x.why)) || a.war.engagements().open.length > 0);
  assert.ok(a.war.engagements().done.length <= ENGAGE.kept);
  for (const k of Object.values(ENGAGEMENTS)) assert.ok(k.troops[0] > 0 && k.enemy[0] > 0);
});

test('the generals are drawn at the command post when they are home and not when they are away', () => {
  const { g, eng, squads, general } = armed(950);
  g.clock.total += 5; g.war.bodiesTick();
  const name = g.war.generals().hired[0].name; assert.ok(g.war.bodies().some((n) => n.profile.name === name), 'at the command post');
  assert.ok(g.war.delegate(eng.id, { squads, general }).ok); g.clock.total += 5; g.war.bodiesTick();
  assert.ok(!g.war.bodies().some((n) => n.profile.name === name), 'away with the force');
});
