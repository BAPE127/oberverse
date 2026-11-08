// People (v0.100.0 stage 7): troop classes with training, squads of one assignment each, loadouts taken from real stock (one item, one pair of hands), armour eras 1 and 2, looks as free data.
import { FUTURE_WEAPONS } from '../src/content/futureArms.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, build, buildAll, STAGE1, cageGoods, days, topUp } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { CLASSES, TROOP_CLASSES, ARMOUR, LOOKS, SQUAD } from '../src/content/troops.js';
import { ARMS_TRANSFERABLE } from '../src/content/procurement.js';
import { ARMS_RECIPES } from '../src/content/arms.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** A company with stage 1 and 2 built (the range gives 6 training places), uniforms and weapons in the stores. */
function base(seed, { uniforms = 40, items = {} } = {}) {
  const g = warGame(seed, { cash: 3_000_000 }); buildAll(g, 2);
  if (uniforms) assert.ok(g.war.buySupply('uniform', uniforms).ok);
  const goods = { item_smg: 30, item_assault_rifle: 20, item_pistol: 30, item_lmg: 6, item_rpg: 6, item_sniper_rifle: 4, item_shotgun: 6, item_drone_attack: 3, ...items };
  cageGoods(g, 'aw1', goods);
  for (const [item, n] of Object.entries(goods)) if (n) assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item, qty: n }).ok, item);
  return g;
}
const total = (g, key) => (g.war.stock()[key] || 0) + g.war.people().filter((p) => p.weapon === key || p.gadget === key).length;
const trained = (g, n = 6) => days(g, n);

test('the classes: ten troop classes and the two working roles; tiers 1 and 2 are items the Arms works makes, tiers 3 and 4 the researched future weapons (v0.103.8), and the armour eras are 1 to 4', () => {
  assert.equal(TROOP_CLASSES.length, 10); assert.ok(CLASSES.guard && CLASSES.technician);
  const made = new Set(Object.values(ARMS_RECIPES).flatMap((r) => [r.out, r.single].filter(Boolean)));
  for (const [id, K] of Object.entries(CLASSES)) {
    for (const [t, item] of Object.entries(K.tiers)) { assert.ok(Number(t) <= 4, `${id}: tier ${t}`); if (Number(t) <= 2) assert.ok(made.has(item) && ARMS_TRANSFERABLE.includes(item), `${id}: ${item} is an Arms works item the company can take`); else assert.ok(FUTURE_WEAPONS[item], `${id}: ${item} is a researched future weapon`); }
    if (K.gadget && !K.gadget.startsWith('supply:')) assert.ok(made.has(K.gadget) && ARMS_TRANSFERABLE.includes(K.gadget));
  }
  assert.deepEqual(Object.keys(ARMOUR).map(Number), [1, 2, 3, 4]);
  assert.ok(CLASSES.officer.leads && !CLASSES.rifleman.leads);
  assert.ok(LOOKS.pattern.length >= 5 && Object.keys(LOOKS.primary).length >= 5);
});

test('recruits train before they work: each takes a training place for their days and a uniform from the stores; guards and technicians start at once; with the places full the next waits', () => {
  const g = base(701);
  const u0 = g.war.stock()['supply:uniform'];
  const r = g.war.hire('rifleman'); assert.ok(r.ok, r.text);
  const p = g.war.people().find((x) => x.id === r.id);
  assert.deepEqual([p.status, p.role, p.armour], ['training', 'rifleman', 1]); assert.equal(p.trainedDay, g.clock.day + CLASSES.rifleman.train);
  assert.equal(g.war.stock()['supply:uniform'], u0 - 1, 'a uniform was issued');
  const gu = g.war.hire('guard'); assert.equal(g.war.people().find((x) => x.id === gu.id).status, 'active'); assert.equal(g.war.stock()['supply:uniform'], u0 - 1, 'a guard needs none');
  for (let i = 0; i < 5; i++) assert.ok(g.war.hire('rifleman').ok);
  assert.ok(!g.war.hire('rifleman').ok && /training place/.test(g.war.hire('rifleman').text), 'the range has six');
  days(g, CLASSES.rifleman.train); assert.ok(g.war.people().filter((x) => x.role === 'rifleman').every((x) => x.status === 'active'));
  assert.ok(g.war.hire('rifleman').ok, 'the places are free again');
  const none = base(702, { uniforms: 0 }); assert.ok(!none.war.hire('rifleman').ok && /uniform/.test(none.war.hire('rifleman').text), 'no uniform, no recruit');
  assert.deepEqual(g.war.check(), []);
});

test('a squad has an officer for a leader and members of the troop classes only; a person is in one squad, moving takes them out of the last, and a vehicle is in one squad or none', () => {
  const g = base(703); const ids = {};
  for (const role of ['officer', 'rifleman', 'rifleman', 'medic', 'guard']) { const r = g.war.hire(role); assert.ok(r.ok, r.text); (ids[role] ||= []).push(r.id); }
  const [off] = ids.officer; const [r1, r2] = ids.rifleman; const [med] = ids.medic; const [guard] = ids.guard;
  const s = g.war.squadCreate(); assert.ok(s.ok); const s2 = g.war.squadCreate(); assert.ok(s2.ok);
  assert.ok(!g.war.squadAssign(s.id, r1).ok, 'still in training');
  trained(g, 10);
  assert.ok(!g.war.squadAssign(s.id, guard).ok && /only troops/.test(g.war.squadAssign(s.id, guard).text), 'a guard is not a soldier');
  assert.ok(!g.war.squadLeader(s.id, r1).ok, 'a rifleman cannot lead');
  assert.ok(g.war.squadLeader(s.id, off).ok); assert.ok(g.war.squadAssign(s.id, r1).ok); assert.ok(g.war.squadAssign(s.id, med).ok);
  assert.ok(g.war.squadAssign(s2.id, r1).ok, 'moved'); const A = g.war.squads();
  assert.deepEqual(A.find((x) => x.id === s.id).members.sort(), [med, off].sort()); assert.deepEqual(A.find((x) => x.id === s2.id).members, [r1]);
  assert.equal(g.war.people().find((p) => p.id === r1).assignedTo, s2.id);
  assert.ok(g.war.squadRemove(r1).ok); assert.equal(g.war.people().find((p) => p.id === r1).assignedTo, null);
  // vehicles
  assert.ok(g.war.buyVehicle('wolf').ok); const v = g.war.equipment()[0];
  assert.ok(g.war.squadVehicle(s.id, v.id).ok); assert.ok(!g.war.squadVehicle(s2.id, v.id).ok, 'it is with another squad');
  assert.deepEqual([v.status, v.assignedTo], ['assigned', s.id]); assert.ok(!g.war.giveBack({ id: v.id }).ok);
  assert.ok(g.war.squadDisband(s.id).ok); assert.deepEqual([v.status, v.assignedTo], ['stored', null]); assert.equal(g.war.people().find((p) => p.id === off).assignedTo, null);
  assert.deepEqual(g.war.check(), []);
  // size
  const big = g.war.squadCreate().id; for (let i = 0; i < SQUAD.max; i++) { const h = g.war.hire('officer'); if (!h.ok) { days(g, 10); i--; continue; } days(g, 10); assert.ok(g.war.squadAssign(big, h.id).ok); }
  const extra = g.war.hire('officer'); days(g, 10); assert.ok(!g.war.squadAssign(big, extra.id).ok && /full/.test(g.war.squadAssign(big, extra.id).text));
});

test('weapons come from the stores and are in one pair of hands: equipping takes one, a tier change swaps it back and takes the new one, short stock leaves the rest waiting, and the count never changes', () => {
  const g = base(704); for (let i = 0; i < 4; i++) g.war.hire('rifleman'); trained(g, 6);
  const smg = 'arms:aw1:item_smg'; const ar = 'arms:aw1:item_assault_rifle';
  const t0 = total(g, smg) + total(g, ar);
  const r = g.war.equipClass('rifleman'); assert.ok(r.ok); assert.equal(r.equipped, 4);
  assert.ok(g.war.people().filter((p) => p.role === 'rifleman').every((p) => p.weapon === smg), 'tier 1: the submachine gun');
  assert.equal(g.war.stock()[smg], 26); assert.equal(total(g, smg) + total(g, ar), t0, 'nothing appeared or went');
  assert.ok(!g.war.setTier('rifleman', 3).ok && /need research/.test(g.war.setTier('rifleman', 3).text));
  assert.ok(g.war.setTier('rifleman', 2).ok);
  assert.ok(g.war.people().filter((p) => p.role === 'rifleman').every((p) => p.weapon === ar), 'tier 2: the assault rifle');
  assert.equal(g.war.stock()[smg], 30, 'the old ones went back'); assert.equal(g.war.stock()[ar], 16); assert.equal(total(g, smg) + total(g, ar), t0);
  // short stock
  const poor = base(705, { items: { item_assault_rifle: 2, item_smg: 0 } }); for (let i = 0; i < 4; i++) poor.war.hire('rifleman'); trained(poor, 6);
  assert.ok(poor.war.setTier('rifleman', 2).ok); assert.equal(poor.war.people().filter((p) => p.weapon).length, 2, 'two rifles, four soldiers');
  assert.ok(poor.war.equipClass('rifleman').short === 2);
  // one weapon in one pair of hands
  const keys = poor.war.people().map((p) => p.weapon).filter(Boolean); assert.equal(keys.length, 2);
  assert.deepEqual(poor.war.check(), []);
  // letting someone go returns what they carry
  const first = g.war.people().find((p) => p.role === 'rifleman'); assert.ok(g.war.dismiss(first.id).ok); assert.equal(g.war.stock()[ar], 17);
  const g2 = roundtrip(g); assert.equal(total(g2, ar) + total(g2, smg), t0 - 0, 'the same after a reload');
});

test('gadgets and armour: a medic carries medicine and a signaller a radio from the stores, a UAV operator a drone from the Arms works; a plate carrier is bought, worn one at a time, and returns to the stores', () => {
  const g = base(706); assert.ok(g.war.buySupply('medicine', 4).ok); assert.ok(g.war.buySupply('radio', 2).ok); assert.ok(g.war.buySupply('plate_carrier', 2).ok);
  const ids = ['medic', 'signaller', 'uav', 'rifleman', 'rifleman'].map((r) => g.war.hire(r)); ids.forEach((x) => assert.ok(x.ok, x.text)); trained(g, 9);
  for (const r of ['medic', 'signaller', 'uav']) assert.ok(g.war.equipClass(r).ok);
  const P = (role) => g.war.people().find((p) => p.role === role);
  assert.equal(P('medic').gadget, 'supply:medicine'); assert.equal(P('signaller').gadget, 'supply:radio'); assert.equal(P('uav').gadget, 'arms:aw1:item_drone_attack');
  assert.equal(g.war.stock()['supply:medicine'], 3); assert.equal(g.war.stock()['arms:aw1:item_drone_attack'], 2);
  const riflemen = g.war.people().filter((p) => p.role === 'rifleman');
  assert.ok(g.war.armourClass('rifleman', 2).ok); assert.deepEqual(riflemen.map((p) => p.armour), [2, 2]); assert.equal(g.war.stock()['supply:plate_carrier'] || 0, 0);
  assert.ok(!g.war.armourClass('rifleman', 3).ok);
  assert.ok(g.war.armourClass('rifleman', 1).ok); assert.equal(g.war.stock()['supply:plate_carrier'], 2, 'the plates came back');
  const none = base(707); none.war.hire('rifleman'); trained(none, 6);
  assert.ok(!none.war.armourClass('rifleman', 2).ok || none.war.people()[0].armour === 1, 'no plate carrier, none worn');
  assert.deepEqual(g.war.check(), []);
});

test('a squad\'s look is free: any listed choice is accepted and changes no number; anything else is refused', () => {
  const g = base(708); const s = g.war.squadCreate().id; const before = JSON.stringify([g.war.stock(), g.war.cash()]);
  assert.ok(g.war.squadLook(s, { primary: 'navy', pattern: 'chevron', insignia: 'star', crest: 'antenna', band: 'cyan' }).ok);
  assert.deepEqual(g.war.squads()[0].look, { primary: 'navy', pattern: 'chevron', insignia: 'star', crest: 'antenna', band: 'cyan' });
  assert.ok(!g.war.squadLook(s, { primary: 'hot_pink' }).ok); assert.ok(!g.war.squadLook(s, { crest: 'horns' }).ok);
  assert.equal(JSON.stringify([g.war.stock(), g.war.cash()]), before, 'it cost nothing');
});

test('guards on a contract carry their own pistols: accepting equips them from the stores, nothing is drawn twice, the pistols stay in their hands afterwards, and the count is conserved through a reload and a dismissal', () => {
  const g = warGame(709, { cash: 800_000 }); build(g, STAGE1);
  for (let i = 0; i < 4; i++) g.war.hire('guard');
  cageGoods(g, 'aw1', { item_pistol: 8 }); g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 8 }); g.war.buySupply('radio', 1);
  const pis = 'arms:aw1:item_pistol';
  assert.equal(total(g, pis), 8);
  let o = null; for (let i = 0; i < 80 && !o; i++) { days(g, 1); o = g.war.contracts().open.find((c) => c.guards <= 4); }
  assert.ok(o, 'an offer'); const r = g.war.accept(o.id); assert.ok(r.ok, r.text);
  assert.equal(total(g, pis), 8, 'the pistols are in hands or in the stores, never both');
  assert.equal(g.war.people().filter((p) => p.weapon === pis).length, o.guards);
  days(g, o.days);
  assert.equal(total(g, pis), 8); assert.equal(g.war.people().filter((p) => p.weapon === pis).length, o.guards, 'the guards keep them');
  const g2 = roundtrip(g); assert.equal(total(g2, pis), 8);
  const armed = g.war.people().find((p) => p.weapon === pis); assert.ok(g.war.dismiss(armed.id).ok); assert.equal(total(g, pis), 8, 'a dismissal returns the pistol');
  assert.deepEqual(g.war.check(), []);
});

test('records from v0.99.0 (no morale, skills, armour or kit) work as they did, and are given the new fields when read', () => {
  const g = warGame(710, { cash: 800_000 }); build(g, STAGE1); assert.ok(g.war.hire('guard').ok);
  const p = g.war.state().company.personnel[0]; for (const k of ['exp', 'morale', 'fatigue', 'wounds', 'armour', 'weapon', 'gadget', 'tier', 'trainedDay']) delete p[k];
  assert.ok(g.war.people().length === 1); days(g, 3); assert.deepEqual(g.war.check(), []);
  assert.ok(g.war.dismiss(p.id).ok);
});
