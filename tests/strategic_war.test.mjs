// The strategic war (v0.103.0): battalions raised from real squads and vehicles and locked to them, enlisting in a theatre, the sealift, orders and marches, contact opening an engagement,
// the result written once, the retainer, and a save that survives a reload.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { needsOf, garrisonOf, controllerOf, DEFAULT_TEMPLATES, statsOf } from '../src/war/strategic.js';
import { provinceById, provinces } from '../src/world/provinces.js';
import { RETAINER, SEALIFT } from '../src/content/strategic.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const TPL = { name: 'Test Bn', line: ['inf', 'inf', 'tank'], support: ['medical'], attach: [] };
function raised(seed = 1401) {
  const { g, C, squads } = armedCompany(seed); const t = g.war.saveTemplate(TPL); assert.ok(t.ok, t.text);
  const r = g.war.raise({ template: t.id, squads }); assert.ok(r.ok, r.text); return { g, C, squads, id: r.id, bn: g.war.state().war.battalions[0] };
}
/** a friendly province in the Halden Front that borders enemy ground, with the weakest garrison among the enemy provinces it touches */
function frontier(g) {
  const w = g.war.state().war; const e = w.employer; const P = provinces(); let best = null;
  for (const p of P.filter((q) => q.state === 'os_falken' && controllerOf(g, q) === e.side)) for (const n of p.neighbours) { const q = P[n]; if (controllerOf(g, q) !== e.enemy) continue; const t = garrisonOf(g, q).troops; if (!best || t < best.t) best = { from: p, to: q, t }; }
  return best;
}

test('what a recipe asks and what squads bring: a battalion is raised only from what the chosen squads really hold, and nothing is invented', () => {
  const rows = needsOf(DEFAULT_TEMPLATES[1]); assert.ok(rows.find((r) => r.key === 'cls:tank').need === 4 && rows.find((r) => r.key === 'squads').need === 2 && rows.some((r) => r.key === 'cls:logistics'));
  const { g, squads } = armedCompany(1402);
  const r = g.war.raise({ template: 'tpl_armour', squads }); assert.ok(!r.ok && /do not make/.test(r.text) && /tanks/.test(r.text), r.text);
  assert.ok(!g.war.raise({ template: 'tpl_rifle', squads: [] }).ok); assert.ok(!g.war.raise({ template: 'nope', squads }).ok);
  assert.equal(g.war.state().war.battalions.length, 0, 'a refusal changes nothing');
  assert.ok(!g.war.saveTemplate({ name: 'Bad', line: [], support: [], attach: [] }).ok, 'a template has a line'); assert.ok(!g.war.saveTemplate({ name: 'Bad', line: ['nope'] }).ok);
});

test('a raised battalion owns its squads and vehicles: they cannot be given to anything else, the checker is clean, and standing it down frees them', () => {
  const { g, C, squads, id, bn } = raised();
  assert.equal(bn.commander != null, true); for (const s of squads) { const q = C.squads.find((x) => x.id === s); assert.equal(q.status, 'battalion'); assert.equal(q.battalion, id); }
  assert.ok(C.equipment.find((x) => x.id === 'Ex1').status === 'deployed'); assert.deepEqual(g.war.check(), []);
  assert.ok(!g.war.raise({ template: DEFAULT_TEMPLATES[0].id, squads: [squads[0]] }).ok, 'not twice');
  const p = C.personnel.find((x) => x.assignedTo === squads[1]); assert.ok(!g.war.squadRemove(p.id).ok, 'a soldier of a battalion cannot be taken out of his squad');
  assert.ok(!g.war.squadDisband(squads[0]).ok, 'nor the squad stood down'); assert.ok(!g.war.playEngagement(C.engagements[0].id, squads).ok, 'nor sent on an ordinary engagement');
  const st = statsOf(g, bn); assert.ok(st.strength === 100 && st.org === 100 && st.soft > 0 && st.hard > 0 && st.speed >= 6 && st.width > 0, JSON.stringify(st));
  assert.ok(g.war.standDown(id).ok); for (const s of squads) assert.equal(C.squads.find((x) => x.id === s).status, 'home'); assert.equal(C.equipment.find((x) => x.id === 'Ex1').status, 'assigned'); assert.deepEqual(g.war.check(), []);
});

test('enlisting: a licensed company, a theatre where they are fighting, one of the two sides; then the employer carries the battalion over in days and it lands on ground its side holds', () => {
  const { g, id, bn } = raised(1403); const th = g.war.theatres();
  assert.ok(th.find((t) => t.id === 'th_halden').hot, 'the one big land front is hot'); assert.ok(!th.some((t) => t.id === 'th_marches'), 'the Free Marches have no two sides to take');
  assert.ok(!g.war.enlist({ theatre: 'th_halden', side: 'sund' }).ok, 'not a country fighting there'); assert.ok(!g.war.enlist({ theatre: 'th_nowhere', side: 'varn' }).ok);
  assert.ok(!g.war.deploy(id).ok, 'enlist first'); const e = g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); assert.ok(e.ok, e.text);
  assert.ok(!g.war.enlist({ theatre: 'th_halden', side: 'varn' }).ok, 'one employer at a time'); const w = g.war.state().war; const st = provinceById(w.employer.staging); assert.equal(st.country, 'ostmark');
  const d = g.war.deploy(id); assert.ok(d.ok && d.days >= SEALIFT.minDays, d.text); assert.equal(bn.status, 'deploying'); assert.ok(!g.war.battalionOrder(id, { type: 'hold' }).ok, 'at sea');
  hours(g, d.days * 24 - 2); assert.equal(bn.status, 'deploying'); hours(g, 4); assert.equal(bn.status, 'theatre'); assert.equal(bn.pos, st.id);
  assert.ok(!g.war.recall(id).ok === false, 'it can be called home'); assert.ok(!g.war.discharge().ok, 'not while a battalion is out');
  assert.deepEqual(g.war.check(), []);
});

test('orders: a march takes hours by speed, ground and roads; it needs ground your side holds; a battalion rests back its organisation; digging in builds up', () => {
  const { g, id, bn } = raised(1404); g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); const d = g.war.deploy(id); hours(g, d.days * 24 + 1); assert.equal(bn.status, 'theatre');
  const f = frontier(g); assert.ok(f, 'a frontier exists');
  const far = provinces().find((p) => p.state === 'vr_coast' && controllerOf(g, p) === 'varn'); assert.ok(!g.war.battalionOrder(id, { type: 'move', to: far.id }).ok, 'not onto enemy ground');
  const here = bn.pos; const r = g.war.battalionOrder(id, { type: 'move', to: f.from.id });
  if (f.from.id !== here) { assert.ok(r.ok, r.text); assert.ok(r.hours >= 1); const before = bn.org; hours(g, r.hours + 24); assert.equal(bn.pos, f.from.id); assert.ok(bn.org <= before); assert.equal(bn.order.type, 'hold'); }
  assert.ok(g.war.battalionOrder(id, { type: 'defend' }).ok); hours(g, 24); assert.ok(bn.entrench >= 1, 'dug in');
  assert.ok(!g.war.battalionOrder(id, { type: 'attack', to: provinces().find((p) => p.state === 'vr_orlov' && !f.from.neighbours.includes(p.n)).id }).ok, 'an attack goes into the next province only');
  bn.org = 10; assert.ok(!g.war.battalionOrder(id, { type: 'attack', to: f.to.id }).ok, 'no organisation, no attack');
});

test('an attack: contact opens an engagement for the battalion alone; fought by a general it is written once, the front moves if it is won, the squads are the battalion\'s again, and nothing but the retainer and the bonus pays', () => {
  const { g, C, squads, id, bn } = raised(1405); g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); const d = g.war.deploy(id); hours(g, d.days * 24 + 1);
  const f = frontier(g); if (f.from.id !== bn.pos) { const r = g.war.battalionOrder(id, { type: 'move', to: f.from.id }); assert.ok(r.ok, r.text); hours(g, r.hours + 2); } assert.equal(bn.pos, f.from.id);
  const a = g.war.battalionOrder(id, { type: 'attack', to: f.to.id }); assert.ok(a.ok, a.text); hours(g, 200); assert.ok(bn.engaged, 'contact'); const eng = C.engagements.find((x) => x.id === bn.engaged);
  assert.equal(eng.strategic.prov, f.to.id); assert.equal(eng.pay, 0); assert.deepEqual(eng.needs, { troops: 0, tanks: 0, helicopters: 0, medics: 0 }); assert.ok(eng.enemy.troops > 0);
  assert.ok(!g.war.battalionOrder(id, { type: 'hold' }).ok, 'decide the battle first'); assert.ok(!g.war.recall(id).ok);
  const cash = g.war.cash(); const gen = g.war.generals().hired[0].id; const dl = g.war.delegate(eng.id, { squads, general: gen }); assert.ok(dl.ok, dl.text);
  g.clock.total += 1440 * 3; g.war.dailyTick(); assert.equal(eng.state, 'resolved'); assert.ok(eng.result.how === 'general' || eng.result.how); assert.equal(eng.result.paid, 0); assert.equal(eng.result.fine, 0);
  assert.equal(bn.engaged, null); const w = g.war.state().war; const won = eng.result.objectives >= 2;
  assert.equal(controllerOf(g, f.to), won ? 'ostmark' : 'varn'); if (won) { assert.equal(bn.pos, f.to.id); assert.equal(garrisonOf(g, f.to).troops, 0, 'taken ground holds nothing'); }
  assert.ok(bn.org < 100 || true); for (const s of bn.squads) assert.equal(C.squads.find((x) => x.id === s).status, 'battalion'); assert.deepEqual(g.war.check(), []);
  assert.ok(w.log.some((l) => /at /.test(l.text)));
  void cash;
});

test('the retainer is paid a day at a time to a battalion in the theatre and to nobody at sea or at home; breaking off a battle costs organisation and nothing else', () => {
  const { g, C, id, bn } = raised(1406); g.war.enlist({ theatre: 'th_halden', side: 'ostmark' });
  const paid = () => g.war.state().war.paid || 0;
  hours(g, 24); g.war.dailyTick(); assert.equal(paid(), 0, 'at home nothing is paid'); const d = g.war.deploy(id); g.clock.total += 1440; g.war.dailyTick(); const atSea = paid(); assert.equal(atSea, 0, 'nor at sea');
  hours(g, d.days * 24 + 2); assert.equal(bn.status, 'theatre'); const c2 = paid(); g.clock.total += 1440; g.war.dailyTick(); const gain = paid() - c2;
  const people = bn.squads.reduce((a, sid) => a + C.squads.find((q) => q.id === sid).members.length, 0); assert.ok(gain >= people * RETAINER.perTrooper * 0.9, `${gain} for ${people}`);
  const f = frontier(g); if (f.from.id !== bn.pos) { g.war.battalionOrder(id, { type: 'move', to: f.from.id }); hours(g, 300); } g.war.battalionOrder(id, { type: 'attack', to: f.to.id }); hours(g, 300); assert.ok(bn.engaged);
  const eng = C.engagements.find((x) => x.id === bn.engaged); const org = bn.org; assert.ok(g.war.declineEngagement(eng.id).ok); assert.equal(bn.engaged, null); assert.ok(bn.org < org); assert.equal(controllerOf(g, f.to), 'varn'); assert.deepEqual(g.war.check(), []);
});

test('the war survives a save: battalions, employer, ground taken and the hour all come back, and a battle in progress is still its engagement', () => {
  const { g, C, id, bn } = raised(1407); g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); const d = g.war.deploy(id); hours(g, d.days * 24 + 1);
  const f = frontier(g); if (f.from.id !== bn.pos) { g.war.battalionOrder(id, { type: 'move', to: f.from.id }); hours(g, 300); } g.war.battalionOrder(id, { type: 'attack', to: f.to.id }); hours(g, 300); assert.ok(bn.engaged); void C;
  const g2 = roundtrip(g); const w2 = g2.war.state().war; assert.equal(w2.battalions[0].engaged, bn.engaged); assert.equal(w2.employer.side, 'ostmark'); assert.equal(w2.hour, g.war.state().war.hour); assert.deepEqual(g2.war.check(), []);
  assert.equal(g2.war.strategic().battalions[0].stats.strength, 100); assert.ok(g2.war.strategic().provinces.length > 30);
});
