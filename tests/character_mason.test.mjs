// Mason Nails (imported character), his crew, construction shifts and the
// property-system groundwork (using a test-only plot: there are no real plots yet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, noImpulses, CONTENT, Game, TILE, grown } from './helpers.mjs';
import { BASE_CONTENT } from '../src/content/index.js';
import { withPlots, plotInteriorId } from '../src/world/plots.js';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { validateContent } from '../tools/validate-content.mjs';
import { readFileSync } from 'node:fs';
import { check } from '../src/sim/conditions.js';
import { INCOME } from '../src/content/income.js';

const talk = (g, id, ...choices) => {
  const s = new DialogueSession(g, id);
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return { s, node };
};
const text = (node) => node.pages.join(' ');
const ids = (node) => node.options.map((o) => o.id);

// (v0.47.0: authored for the old Westbrook; grown() moves it to the same lot in the grown town)
const [PX, PY] = grown('westbrook', 6, 28);
const TEST_PLOTS = {
  plot_test: {
    name: 'Test Lot', map: 'westbrook', x: PX, y: PY, w: 6, h: 5,
    door: { x: PX + 2, y: PY + 4 }, outside: { x: PX + 2, y: PY + 5, facing: 'up' }, landPrice: 40, allowed: ['home', 'rental', 'business'],
  },
};
const plotContent = () => withPlots(BASE_CONTENT, TEST_PLOTS);
const plotGame = (seed = 77) => {
  const g = new Game(plotContent(), { seed });
  g.newGame({ playerName: 'Tester', seed });
  return g;
};

test('Mason is imported with his portrait, motif, company and crew', () => {
  const m = CONTENT.characters.npc_mason;
  assert.equal(m.origin, 'imported');
  assert.match(m.appearance.portrait, /^data:image\/jpeg;base64,/);
  assert.equal(m.motif, 'motif_mason');
  assert.equal(m.faction, 'fac_builders');
  for (const id of ['npc_dee', 'npc_barnaby', 'npc_quinn']) {
    const c = CONTENT.characters[id];
    assert.equal(c.faction, 'fac_builders');
    assert.ok(c.schedule.some((b) => b.activity === 'sleep' && b.spot.startsWith('plumb_unit_')), `${id} lives at the Plumb Line (v0.32.0: in a flat of their own)`);
  }
  assert.ok(m.schedule.some((b) => b.activity === 'sleep' && b.spot.startsWith('plumb_unit_')));
});

test('his signature line and his puns', () => {
  const g = newGame();
  const first = text(talk(g, 'npc_mason').node);
  assert.match(first, /That's O plural! Because we never stop at one!/);
  assert.match(first, /buddy/);
  const who = text(talk(g, 'npc_mason', 'topic:t_mason_who').node);
  assert.match(who, /O plural/);
});

test('the Pun of the Day is fixed for a day and changes the next', () => {
  const g = newGame();
  setTime(g, 1, '12:15');
  const p1 = g.dailyPun();
  const { node } = talk(g, 'npc_mason', 'topic:t_mason_pun');
  assert.ok(text(node).includes(p1.setup) && text(node).includes(p1.punchline));
  assert.deepEqual(ids(node).filter((i) => i.startsWith('choice:')).sort(), ['choice:c_mason_fire_back', 'choice:c_mason_groan', 'choice:c_mason_laugh']);
  const before = g.npcs.get('npc_mason').relationships.player.affection;
  const s = new DialogueSession(g, 'npc_mason');
  s.start();
  s.choose('topic:t_mason_pun');
  s.choose('choice:c_mason_groan');
  assert.ok(g.npcs.get('npc_mason').relationships.player.affection > before, 'he LOVES a groan');
  assert.match(text(talk(g, 'npc_mason', 'topic:t_mason_pun').node), /come back tomorrow/i);
  assert.deepEqual(g.dailyPun(), p1);
  setTime(g, 2, '12:15');
  assert.notDeepEqual(g.dailyPun(), p1);
  assert.doesNotMatch(text(talk(g, 'npc_mason', 'topic:t_mason_pun').node), /come back tomorrow/i);
});

test('Mason is always friendly: no dialogue of his lowers the player\'s standing', () => {
  const dlg = CONTENT.dialogues.dlg_mason;
  const effects = [];
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      if (x.rel) effects.push(x.rel);
      Object.values(x).forEach(walk);
    }
  };
  walk(dlg);
  assert.ok(effects.length > 0);
  for (const rel of effects) for (const v of Object.values(rel)) if (typeof v === 'number') assert.ok(v >= 0, `negative rel effect ${JSON.stringify(rel)}`);
  // and he starts out friendly
  assert.ok(CONTENT.characters.npc_mason.relationships.player.affection >= 15);
  // he refuses to take sides
  const g = newGame();
  assert.match(text(talk(g, 'npc_mason', 'topic:t_mason_moneybucks').node), /I don't take sides — I take measurements/);
  assert.ok(g.knowledge.knows(g.player, 'fact_moneybucks_wants_mason'));
});

test('Mason and the crew keep their schedules', () => {
  const g = newGame(3);
  const at = (t) => {
    setTime(g, 2, t);
    noImpulses(g);
    const n = g.npcs.get('npc_mason');
    return `${n.map}/${n.activity}`;
  };
  assert.equal(at('07:00'), 'cafe/eat');
  assert.equal(at('11:00'), 'westbrook/excavate');
  assert.equal(at('14:00'), 'mason_office/work');
  assert.equal(at('16:00'), 'civic_office/business');
  assert.equal(at('23:00'), 'plumb_unit_1/sleep');
  setTime(g, 2, '09:00');
  assert.equal(g.npcs.get('npc_dee').map, 'westbrook');
  assert.equal(g.npcs.get('npc_barnaby').map, 'westbrook');
  assert.equal(g.npcs.get('npc_quinn').map, 'mason_office');
  // the excavator only animates while Mason is digging
  const exc = g.maps.get('westbrook').prop('excavator');
  setTime(g, 2, '11:00');
  noImpulses(g);
  assert.ok(check(exc.animateWhen, g));
  setTime(g, 2, '14:00');
  assert.ok(!check(exc.animateWhen, g));
});

test('Mason walks his whole day physically (arrives at the excavator and the Civic Office)', () => {
  const g = newGame(8);
  setTime(g, 2, '09:55');
  noImpulses(g);
  g.changeMap('westbrook', 'site_center');
  const m = g.npcs.get('npc_mason');
  run(g, 30, 0.5);
  assert.equal(m.map, 'westbrook');
  assert.equal(m.activity, 'excavate');
  const seat = g.maps.get('westbrook').spotPx('excavator_seat');
  assert.ok(Math.hypot(m.x - seat.x, m.y - seat.y) < TILE, 'Mason is in the cab');
  setTime(g, 2, '15:20');
  noImpulses(g);
  run(g, 60, 0.5);
  assert.equal(m.map, 'civic_office', 'he made it to Osric by half past four');
});

test('a construction shift pays the wage in INCOME; careful work earns crew goodwill', () => {
  for (const mode of ['proper', 'rush']) {
    const g = newGame(9);
    setTime(g, 2, '08:00');
    assert.match(text(talk(g, 'npc_dee', 'topic:t_dee_job').node), new RegExp(`${INCOME.shift.construction.toLocaleString('en-US')} obols`));
    assert.equal(g.quests.state('job_construction_shift').stage, 'work');
    g.changeMap('westbrook', 'site_center');
    for (const id of ['site_trench', 'site_bricks', 'site_mixer']) {
      const prompt = g.interact({ kind: 'prop', id });
      assert.equal(prompt.type, 'choices');
      assert.equal(prompt.options[0].call[0], 'construction');
      g.construction.work(id, mode);
    }
    assert.equal(g.quests.state('job_construction_shift').stage, 'report');
    const before = g.player.money;
    talk(g, 'npc_dee', 'topic:t_dee_report');
    assert.equal(g.quests.state('job_construction_shift').state, 'completed');
    assert.equal(g.player.money - before, INCOME.shift.construction, 'fair, flat wage either way');
    assert.equal(g.construction.state.goodwill, mode === 'proper' ? 2 : 0);
    assert.ok(g.player.reputation.fac_builders > 0);
  }
  // stations refuse off the clock
  const g = newGame();
  g.changeMap('westbrook', 'site_center');
  assert.equal(g.interact({ kind: 'prop', id: 'site_mixer' }).type, 'message');
});

test('goodwill makes contracts cheaper and faster', () => {
  const g = plotGame();
  const base = g.properties.quote('plot_test', 'home');
  assert.deepEqual([base.land, base.build, base.days], [40, 120, 3]);
  g.construction.state.goodwill = 30;
  const best = g.properties.quote('plot_test', 'home');
  assert.equal(best.build, 90, '25% off');
  assert.equal(best.days, 1);
});

test('no plots exist yet: the contracts board says so', () => {
  const g = newGame();
  assert.deepEqual(CONTENT.plots, {});
  assert.equal(g.properties.list().length, 0);
  const { node } = talk(g, 'npc_mason', 'topic:t_mason_contracts');
  assert.match(text(node), /no land surveyed/);
  assert.equal(node.action?.type, 'contracts');
  g.changeMap('mason_office', 'entry');
  assert.equal(g.interact({ kind: 'prop', id: 'mo_board' }).type, 'contracts');
});

test('property lifecycle: contract → permit → construction → finished building (test plot)', () => {
  const content = plotContent();
  assert.deepEqual(validateContent(content).errors, []);
  const g = plotGame();
  g.player.money = 500;
  assert.ok(!g.properties.commission('plot_test', 'castle').ok);
  const r = g.properties.commission('plot_test', 'home');
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, 340);
  assert.equal(g.properties.status('plot_test'), 'permit');
  assert.ok(!g.properties.commission('plot_test', 'rental').ok, 'one contract per plot');
  // the permit from Osric
  setTime(g, 1, '11:00');
  const s = new DialogueSession(g, 'npc_osric');
  s.start();
  assert.ok(ids(s.choose('topic:t_osric_permit')).includes('choice:c_osric_permit_pay'));
  s.choose('choice:c_osric_permit_pay');
  assert.equal(g.properties.status('plot_test'), 'building');
  assert.equal(g.player.money, 330);
  // the crew heads out to build
  assert.ok(check({ property: { state: 'building' } }, g));
  // three evenings later it's done
  const door = () => g.maps.get('westbrook').doors.find((d) => d.id === 'door_b_plot_test');
  for (let day = 1; day <= 3; day++) {
    assert.equal(door(), undefined);
    setTime(g, day, '17:59');
    run(g, 2, 1);
  }
  assert.equal(g.properties.status('plot_test'), 'built');
  assert.ok(door(), 'the building and its door exist');
  assert.equal(g.maps.get('westbrook').tileAt(6, 28), 'B');
  // inside: the home furniture shows, the rental/business furniture doesn't
  g.changeMap(plotInteriorId('plot_test'), 'entry');
  const bed = g.maps.get(plotInteriorId('plot_test')).prop('plot_test_bed');
  assert.ok(check(bed.hiddenUnless, g));
  assert.ok(!check(g.maps.get(plotInteriorId('plot_test')).prop('plot_test_counter').hiddenUnless, g));
  // save/load keeps the finished building
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(content, { seed: 1 });
  sm.load('slot1', g2);
  assert.equal(g2.properties.status('plot_test'), 'built');
  assert.ok(g2.maps.get('westbrook').doors.find((d) => d.id === 'door_b_plot_test'));
});

test('a finished rental pays rent every evening', () => {
  const g = plotGame();
  g.player.money = 500;
  g.properties.commission('plot_test', 'rental');
  g.properties.grantPermits();
  g.properties.state.owned.plot_test.daysLeft = 1;
  setTime(g, 1, '17:59');
  run(g, 2, 1);
  assert.equal(g.properties.status('plot_test'), 'built');
  const before = g.player.money;
  setTime(g, 2, '17:59');
  run(g, 2, 1);
  assert.equal(g.player.money - before, 8);
});

test('Westbrook joins Lanternside seamlessly on the west', () => {
  const g = newGame();
  g.changeMap('lanternside', 'west_road');
  const ok = (() => {
    for (let i = 0; i < 400; i++) {
      g.update(0.05, { x: -1, y: 0 });
      if (g.player.map === 'westbrook') return true;
    }
    return false;
  })();
  assert.ok(ok, 'walked west onto Westbrook Lots');
  assert.ok(g.player.x > 40 * TILE, 'arrived at the east edge');
  assert.ok(g.neighbors('westbrook').some((n) => n.map.id === 'lanternside'));
});

test('old saves gain Westbrook, the crew and fresh construction state', () => {
  const raw = readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.importToSlot('slot2', raw).ok);
  const g = new Game(CONTENT, { seed: 1 });
  const res = sm.load('slot2', g);
  assert.ok(res.ok, res.errors?.join());
  assert.equal(g.npcs.size, Object.keys(CONTENT.characters).length);
  assert.ok(g.npcs.get('npc_mason'));
  assert.equal(g.construction.state.goodwill, 0);
  assert.deepEqual(g.properties.state.owned, {});
  assert.equal(g.player.reputation.fac_builders, 0);
});
