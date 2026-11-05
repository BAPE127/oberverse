// The war update's foundation (v0.98.0): world.military, the base-protection flag and the damage gate, and the consistency checker. The hardest rule comes first: no way of damaging
// a structure can touch the core of your base before a coup is staged, and no way of damaging one exists outside the gate. Ending a coup restores nothing; only a settlement does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
import { DAMAGE_SOURCES, REPAIR_SOURCES, PROBLEMS } from '../src/content/military.js';
import { checkMilitary } from '../src/war/check.js';
import { freshMilitary } from '../src/war/state.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const base = (g) => {
  g.war.register('hq', { owner: 'company', core: true, hp: 100, name: 'Command HQ' });
  g.war.register('barracks', { owner: 'company', core: true, hp: 100, name: 'Barracks' });
  g.war.register('shed', { owner: 'company', core: false, hp: 50, name: 'Tool shed' });
  g.war.register('fort_gate', { owner: 'gov', core: true, hp: 200, name: 'Fort gate' });
};

test('there is no military record until something makes one; reading it does not make one; the base is protected from the start', () => {
  const g = newGame(1);
  assert.equal(g.world.military, undefined);
  assert.equal(g.war.baseProtected(), true);
  g.war.summary(); g.war.check(); g.war.structures();
  assert.equal(g.world.military, undefined, 'a read creates nothing');
  g.war.state();
  const m = g.world.military;
  assert.deepEqual(m.coup, { state: 'none', since: null, outcome: null });
  assert.equal(m.protection.baseProtected, true);
  assert.deepEqual(Object.keys(m).sort(), ['company', 'coup', 'damage', 'gov', 'log', 'protection', 'transfers', 'v', 'war']);
  assert.equal(m.gov.id, 'sund'); assert.equal(m.company, null, 'the company is separate from the government (and does not exist until founded)');
  assert.deepEqual(g.war.check(), []);
});

test('the coup flag: none → staged → ended, one step at a time; staging damages nothing; ending restores nothing; only an explicit settlement brings protection back', () => {
  const g = newGame(2); base(g);
  assert.ok(!g.war.setCoup('ended').ok, 'cannot end what has not begun');
  assert.ok(!g.war.setCoup('nonsense').ok);
  assert.ok(g.war.setCoup('staged', 'a test').ok);
  assert.equal(g.war.baseProtected(), false); assert.equal(g.world.military.protection.baseProtected, false);
  assert.ok(g.war.structures().every((s) => s.state === 'intact'), 'staging a coup damages nothing');
  assert.ok(!g.war.setCoup('none').ok, 'a coup cannot be un-staged');
  assert.ok(g.war.hit('hq', 60, 'missile').ok);
  assert.ok(g.war.setCoup('ended', 'it was put down').ok);
  assert.equal(g.war.baseProtected(), false, 'ending a coup does NOT restore protection');
  assert.match(g.world.military.protection.reason, /not restored/);
  assert.ok(g.war.hit('barracks', 30, 'artillery').ok, 'the base is still vulnerable');
  assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 40, 'and nothing was undone');
  assert.ok(!g.war.settle('').ok, 'a settlement says how');
  assert.ok(g.war.settle('you surrendered and were granted terms').ok);
  assert.equal(g.war.baseProtected(), true); assert.equal(g.world.military.coup.state, 'none');
  assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 40, 'damage stays after a settlement');
  assert.ok(!g.war.hit('hq', 10, 'missile').ok, 'protected again');
  assert.ok(!g.war.settle('again').ok, 'nothing to settle');
  assert.deepEqual(g.war.check(), []);
});

test('the gate refuses every named source against the core of your base before a coup, and every one gets through once one is staged; what is not core, not yours, or not a structure is not its business', () => {
  for (const source of DAMAGE_SOURCES) {
    const g = newGame(3); base(g);
    const r = g.war.hit('hq', 40, source);
    assert.equal(r.refused, true, `${source} is refused`); assert.equal(r.ok, false);
    assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 100, `${source}: nothing changed`);
    assert.equal(g.war.structures().find((s) => s.id === 'hq').state, 'intact');
    g.war.setCoup('staged', source);
    const r2 = g.war.hit('hq', 40, source);
    assert.ok(r2.ok, `${source} gets through once a coup is staged`); assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 60);
  }
  const g = newGame(4); base(g);
  assert.ok(g.war.hit('shed', 20, 'gunfire').ok, 'a building that is not core is not protected');
  assert.ok(g.war.hit('fort_gate', 50, 'tactical').ok, 'the national fort is not your base');
  assert.ok(!g.war.hit('hq', 5, 'a hunch').ok && g.war.hit('hq', 5, 'a hunch').refused, 'an unknown source is refused outright');
  assert.ok(!g.war.hit('nowhere', 5, 'gunfire').ok && !g.war.hit('nowhere', 5, 'gunfire').refused, 'an unknown structure is just unknown');
  assert.ok(!g.war.hit('shed', 0, 'gunfire').ok && !g.war.hit('shed', -5, 'gunfire').ok, 'no damage, no change');
  // states follow hit points
  assert.equal(g.war.structures().find((s) => s.id === 'shed').state, 'damaged');
  g.war.hit('shed', 40, 'explosion');
  assert.equal(g.war.structures().find((s) => s.id === 'shed').state, 'destroyed');
  assert.equal(g.world.military.damage.log.length >= 2, true, 'the changes are logged');
});

test('repair goes through the same gate: a damaged structure mends, a destroyed one has to be rebuilt, only repair sources repair, and a repair cannot exceed full', () => {
  const g = newGame(5); base(g); g.war.setCoup('staged', 't');
  g.war.hit('hq', 50, 'missile'); g.war.hit('barracks', 100, 'bombing');
  assert.equal(g.war.structures().find((s) => s.id === 'hq').state, 'damaged');
  assert.ok(!g.war.repair('hq', 20, 'gunfire').ok, 'damage is not repair');
  assert.ok(g.war.repair('hq', 20, 'repair').ok); assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 70);
  assert.equal(g.war.structures().find((s) => s.id === 'hq').state, 'intact');
  g.war.repair('hq', 500, 'repair'); assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 100);
  assert.ok(!g.war.repair('barracks', 100, 'repair').ok && /rebuilt/.test(g.war.repair('barracks', 100, 'repair').text), 'a destroyed structure is rebuilt, not repaired');
  assert.ok(g.war.repair('barracks', 100, 'rebuild').ok); assert.equal(g.war.structures().find((s) => s.id === 'barracks').state, 'intact');
  for (const s of REPAIR_SOURCES) assert.ok(!DAMAGE_SOURCES.includes(s) || s === 'debug', `${s} is not also a damage source`);
});

test('nothing else may change a structure or the coup flag: no source file outside the gate touches `damage.structures`, and only protection.js writes the coup or the protection record', () => {
  const files = [];
  const walk = (dir) => { for (const f of readdirSync(dir)) { const p = `${dir}/${f}`; if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
  walk(new URL('../src', import.meta.url).pathname);
  assert.ok(files.length > 200);
  const writers = { structures: [], coup: [] };
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (/damage\.structures|\.structures\[/.test(src)) writers.structures.push(f.replace(/.*\/src\//, 'src/'));
    if (/(?:military|m)\.coup\s*=[^=]|coup\.state\s*=[^=]|(?:military|m)\.protection\s*=[^=]/.test(src)) writers.coup.push(f.replace(/.*\/src\//, 'src/'));
  }
  assert.deepEqual(writers.structures, ['src/war/damage.js'], `only the gate touches the structures: ${writers.structures}`);
  assert.deepEqual(writers.coup.sort(), ['src/war/protection.js', 'src/war/state.js'].filter((f) => writers.coup.includes(f)), 'only protection.js (and the fresh record) set the flag');
  assert.ok(writers.coup.includes('src/war/protection.js'));
});

test('the checker finds exactly each kind of corruption: duplicates, negative counts, missing references, double assignments, a destroyed thing still deployable, bad statuses, a bad coup, a protection mismatch', () => {
  const good = () => {
    const m = freshMilitary();
    m.company = {
      facilities: [{ id: 'fac1' }],
      personnel: [{ id: 'p1', status: 'active', location: 'facility:fac1', assignedTo: 's1' }, { id: 'p2', status: 'active', location: 'facility:fac1', assignedTo: 's1' }, { id: 'p3', status: 'active', assignedTo: null }],
      equipment: [{ id: 'e1', kind: 'rifle', status: 'assigned', assignedTo: 's1' }, { id: 'e2', kind: 'tank', status: 'stored', assignedTo: null }],
      squads: [{ id: 's1', leader: 'p1', members: ['p1', 'p2'], equipment: ['e1'] }],
      stock: { plates: 12, engines: 0 },
    };
    return m;
  };
  assert.deepEqual(checkMilitary(good()), [], 'a consistent record has no problems');
  assert.deepEqual(checkMilitary(null), []);
  const plant = (kind, mutate) => { const m = good(); mutate(m); const found = checkMilitary(m); assert.ok(found.some((x) => x.kind === kind), `${kind}: ${JSON.stringify(found)}`); assert.ok(found.every((x) => PROBLEMS.includes(x.kind)), 'every finding is a named kind'); return found; };
  plant('duplicate_id', (m) => m.company.equipment.push({ id: 'p1', status: 'stored' }));
  plant('duplicate_id', (m) => m.company.squads.push({ id: 's1', members: [] }));
  plant('negative_count', (m) => { m.company.stock.plates = -3; });
  plant('negative_count', (m) => { m.gov.inventory.shells = NaN; });
  plant('negative_count', (m) => { m.damage.structures.x = { id: 'x', hp: -1, state: 'intact' }; });
  plant('missing_reference', (m) => m.company.squads[0].members.push('ghost'));
  plant('missing_reference', (m) => { m.company.squads[0].leader = 'ghost'; });
  plant('missing_reference', (m) => { m.company.personnel[2].location = 'facility:nowhere'; });
  plant('missing_reference', (m) => { m.company.equipment[1].assignedTo = 's9'; });
  plant('double_assignment', (m) => m.company.squads.push({ id: 's2', leader: null, members: ['p2'], equipment: [] }));
  plant('double_assignment', (m) => { m.company.squads[0].members.push('p2'); });
  plant('double_assignment', (m) => { m.company.squads.push({ id: 's2', leader: null, members: [], equipment: [] }); m.company.equipment[0].assignedTo = 's2'; });
  plant('destroyed_deployable', (m) => { m.company.equipment[0].status = 'destroyed'; });
  plant('destroyed_deployable', (m) => { m.company.personnel[1].status = 'dead'; });
  plant('destroyed_deployable', (m) => { m.company.equipment[1].status = 'captured'; m.company.equipment[1].assignedTo = null; m.company.equipment[1].status = 'destroyed'; m.company.equipment[1].assignedTo = 's1'; });
  plant('bad_status', (m) => { m.company.equipment[1].status = 'on fire'; });
  plant('bad_status', (m) => { m.damage.structures.x = { id: 'x', hp: 5, state: 'wobbly' }; });
  plant('bad_coup', (m) => { m.coup.state = 'maybe'; });
  plant('protection_mismatch', (m) => { m.coup.state = 'staged'; });
  plant('protection_mismatch', (m) => { m.protection.baseProtected = false; });
  // a destroyed thing that has been stood down is fine
  const m = good(); m.company.equipment[1].status = 'destroyed'; assert.deepEqual(checkMilitary(m), []);
});

test('the debug command: mil, mil check, mil coup, mil settle and mil hit all go through the gate; a save keeps the record and an old save simply has none', () => {
  const g = newGame(7); base(g);
  assert.match(runCommand(g, 'mil').text ?? runCommand(g, 'mil'), /PROTECTED/);
  const hit = (a) => { const r = runCommand(g, `mil hit hq ${a}`); return typeof r === 'string' ? r : r.text; };
  assert.match(hit(30), /protected/i, 'a debug hit is refused like any other');
  assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 100);
  runCommand(g, 'mil coup staged');
  assert.match(hit(30), /damaged|intact/);
  assert.equal(g.war.structures().find((s) => s.id === 'hq').hp, 70);
  runCommand(g, 'mil coup ended'); runCommand(g, 'mil settle after talks');
  assert.equal(g.war.baseProtected(), true);
  const chk = runCommand(g, 'mil check'); assert.match(typeof chk === 'string' ? chk : chk.text, /consistent/);
  const g2 = roundtrip(g);
  assert.equal(g2.world.military.damage.structures.hq.hp, 70); assert.equal(g2.war.baseProtected(), true); assert.deepEqual(g2.war.check(), []);
  assert.ok(!g2.war.hit('hq', 10, 'missile').ok, 'still protected after a reload');
  const old = newGame(8); const o2 = roundtrip(old);
  assert.equal(o2.world.military, undefined); assert.equal(o2.war.baseProtected(), true);
});
