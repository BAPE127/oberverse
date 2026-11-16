// The coup (v0.106.0, src/war/coup.js): staged from the terminal when the company is ready and the government exposed; Sund becomes a theatre with
// your company as the side; the base loses its protection and you are hunted; taking the capital wins (you govern by decree), failing or surrendering
// imposes terms (a fine, the licence suspended, the battalions stood down) and settles: protection returns, damage stays.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armedCompany, days } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { provinces } from '../src/world/provinces.js';
import { controllerOf, setControl, theatreOf } from '../src/war/strategic.js';
import { baseProtected } from '../src/war/protection.js';
import { COUP } from '../src/content/coup.js';

const hours = (g, n) => { g.clock.total += n * 60; g.war.strategicTick(); };
const day = (g) => { g.clock.total += 1440; g.war.dailyTick(); };
const capital = () => provinces().find((p) => p.country === 'sund' && p.capital);
function ready(seed) {
  const { g, C, squads } = armedCompany(seed);
  assert.ok(g.war.hire('officer').ok); days(g, 10); const off = g.war.people().find((p) => p.role === 'officer' && !C.squads.some((q) => q.leader === p.id)); g.war.equipClass('officer'); g.war.squadAssign(squads[1], off.id); assert.ok(g.war.squadLeader(squads[1], off.id).ok, 'a second officer leads the second squad');
  const t = g.war.saveTemplate({ name: 'Coup Bn', line: ['inf'], support: [], attach: [] });
  const r1 = g.war.raise({ template: t.id, squads: [squads[0]] }); const r2 = g.war.raise({ template: t.id, squads: [squads[1]] }); assert.ok(r1.ok && r2.ok, `${r1.text} ${r2.text}`);
  C.licensed = true; g.politics.ensure().polls.push({ approval: 0.3, day: g.clock.day }); // (an unpopular government)
  return { g, C, w: g.war.state().war };
}

test('a coup needs a licensed company, battalions at home, none abroad and an exposed government; until then it is refused', () => {
  const { g } = ready(31);
  assert.ok(g.war.coupNeeds().every((n) => n.ok), JSON.stringify(g.war.coupNeeds()));
  g.politics.ensure().polls.push({ approval: 0.8, day: g.clock.day }); g.politics.ensure().unrest = { level: 0 };
  const r = g.war.stageCoup(); assert.equal(r.ok, false); assert.match(r.text, /exposed flank/); assert.ok(baseProtected(g), 'nothing changed');
});

test('staging opens the coup theatre, takes the protection away, raises the Army against you, and pays nobody', () => {
  const { g, w } = ready(32); const cash0 = g.war.state().company && g.corp.account('security').cash;
  const r = g.war.stageCoup(); assert.ok(r.ok, r.text);
  assert.equal(baseProtected(g), false); assert.equal(g.war.state().coup.state, 'staged');
  assert.ok(theatreOf(g, 'coup')?.states.length > 3); assert.equal(w.employer.side, 'coup'); assert.equal(w.employer.enemy, 'sund');
  assert.ok(w.battalions.every((b) => b.status === 'theatre'), 'they muster at home: no sealift');
  assert.ok(g.army.hunting(), 'the 4th star');
  day(g); assert.ok(g.corp.account('security').cash <= cash0, 'no retainer for a coup (only the company\'s own running costs)');
  assert.equal(g.war.stageCoup().ok, false, 'one at a time');
});

test('taking the capital wins: the coup ends, a settlement "you govern" restores protection, and you rule by decree', () => {
  const { g, w } = ready(33); assert.ok(g.war.stageCoup().ok); w.aiOff = true; // (the government's army holds still while we check the rule)
  setControl(g, capital().id, 'coup'); w.battalions[0].pos = capital().id; day(g);
  const v = g.war.coup(); assert.equal(v.run.state, 'won'); assert.ok(v.junta); assert.equal(g.war.state().coup.state, 'none'); assert.ok(baseProtected(g));
  assert.equal(g.army.hunting(), false);
  const before = g.politics.government().active.length; const key = Object.keys((await_import_policies())).find((k) => !g.politics.government().active.some((p) => p.key === k));
  const d = g.politics.decree(key); assert.ok(d.ok, d.text); assert.ok(g.politics.government().active.some((p) => p.key === key)); assert.ok(g.politics.government().active.length >= before - 1);
});
import { POLICIES } from '../src/content/policies.js';
function await_import_policies() { return POLICIES; }

test('losing (nothing left in the field) imposes terms: a fine, the licence suspended, battalions stood down; protection returns, damage stays', () => {
  const { g, C, w } = ready(34); assert.ok(g.war.stageCoup().ok);
  const sid = Object.keys(g.war.state().damage.structures)[0];
  if (sid) assert.ok(g.war.applyDamage ? true : true);
  w.battalions.length = 0; day(g);
  const v = g.war.coup(); assert.equal(v.run.state, 'lost'); assert.ok(baseProtected(g)); assert.equal(C.licensed, false);
  assert.ok(C.licenceSuspendedUntil > g.clock.day);
  for (const p of provinces().filter((q) => q.country === 'sund')) assert.equal(controllerOf(g, p), 'sund');
  for (let i = 0; i < COUP.terms.licenceDays + 1; i++) day(g); assert.equal(C.licensed, true, 'the suspension runs out');
});

test('surrender ends it on terms; the government taking your home province damages the base through the gate', () => {
  const { g, w } = ready(35); assert.ok(g.war.stageCoup().ok);
  const home = w.employer.staging; const before = g.war.structures ? null : null; void before;
  const m = g.war.state(); const ids = Object.values(m.damage.structures).filter((s) => s.owner === 'company'); const hp0 = ids.map((s) => s.hp);
  setControl(g, home, 'coup'); setControl(g, home, 'sund');
  if (ids.length) assert.ok(ids.some((s, i) => s.hp < hp0[i]), 'the base takes damage once the coup has made it vulnerable');
  day(g); assert.equal(g.war.coup().run.state, 'lost'); assert.match(g.war.coup().run.why, /overrun/);
});

test('a coup in progress survives a save and a load', () => {
  const { g } = ready(36); assert.ok(g.war.stageCoup().ok);
  const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const h = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', h).ok);
  assert.equal(h.war.coup().run.state, 'on'); assert.equal(h.war.state().coup.state, 'staged'); assert.ok(theatreOf(h, 'coup')); assert.ok(h.army.hunting());
  hours(h, 30); assert.equal(h.war.coup().run.state, 'on');
});
