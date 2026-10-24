// The people of the aerospace companies (v0.57.0): technicians, engineers and inspectors, what
// they've learnt together, the training that keeps it up, and the quality it all adds up to —
// the same rules for Roost and for Meridian.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const S = CONTENT.aerospace.staff;
const DAY = 1440;
const own = (seed = 51) => {
  const g = newGame(seed);
  g.player.money = 5_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const co = g.aero.roost;
  for (const c of g.aero.contractsOf(co, 'active')) g.aero.cancelContract('roost', c.id);
  return { g, A: g.aero, co };
};
const run = (g, days) => { for (let i = 0; i < days * DAY; i++) { g.clock.total += 1; g.aero.minuteTick(); } };

test('a company starts staffed for its bays, at its standing quality — Roost and Meridian alike', () => {
  const { A, co } = own();
  assert.equal(co.workforce, 30);
  assert.equal(co.engineers, A.staffNeeded(co, 'engineer'));
  assert.equal(co.inspectors, A.staffNeeded(co, 'inspector'));
  assert.deepEqual([co.engineers, co.inspectors], [3, 2]);
  assert.equal(A.qualityOf(co), 52, 'average experience and enough inspectors change nothing');
  const M = A.meridian;
  const crew = A.crewNeeded(M, { all: true });
  // (its first morning has already hired it a little over what its bays call for)
  assert.ok(M.engineers >= Math.ceil(crew * S.roles.engineer.share) && M.engineers <= Math.ceil(crew * S.roles.engineer.share * 1.1));
  assert.ok(M.inspectors >= Math.ceil(crew * S.roles.inspector.share) && M.inspectors <= Math.ceil(crew * S.roles.inspector.share * 1.1));
  assert.ok(Math.abs(A.qualityOf(M) - 74) < 1, `Meridian's quality as before, give or take its first morning's hiring (${A.qualityOf(M)})`);
});

test('hiring dilutes experience; the pace and the quality follow; the money is paid once', () => {
  const { g, A, co } = own();
  const cash = g.player.money;
  const speed0 = A.speedOf(co);
  const r = A.hire(co, 100);
  assert.ok(r.ok, r.text);
  assert.equal(cash - g.player.money, 100 * S.roles.tech.hire);
  assert.ok(Math.abs(co.experience - (50 * 35 + S.newHireExperience * 100) / 135) < 1e-9, 'a weighted average of the old hands and the green ones');
  assert.ok(A.speedOf(co) < speed0, 'a green crew is slower');
  assert.ok(A.qualityBreakdown(co).experience < 0 && A.qualityOf(co) < 52, 'and makes more mistakes');
  // a new engineer or inspector is a (much smaller) dilution too
  const x = co.experience;
  A.hire(co, 3, 'engineer');
  assert.ok(co.experience < x && co.engineers === 6);
  assert.equal(A.hire(co, 0).ok, false);
  assert.equal(A.hire(co, 5, 'cook').ok, false, 'no such job');
});

test('training costs per technician and raises experience, faster the harder it is pushed', () => {
  const a = own(52);
  const b = own(53);
  a.A.setTraining(a.co, 'standard');
  b.A.setTraining(b.co, 'intensive');
  const x0 = a.co.experience;
  run(a.g, 30);
  run(b.g, 30);
  assert.ok(a.co.experience > x0 + 3, `standard training raised it (${a.co.experience})`);
  assert.ok(b.co.experience > a.co.experience + 3, `intensive is faster (${b.co.experience})`);
  const trainA = a.A.statement(a.co, null).acc.training || 0;
  assert.ok(Math.abs(trainA - 30 * 30 * S.training.standard.perDay) < 31 * 30 * S.training.standard.perDay * 0.05 + 1, `paid ${trainA}`);
  assert.equal(a.A.setTraining(a.co, 'weekends').ok, false);
  // with none the crew still learn, slowly
  const c = own(54);
  run(c.g, 30);
  assert.ok(c.co.experience > 50 && c.co.experience < a.co.experience - 2);
});

test('short of engineers, research takes longer and the drawing office is slower; short of inspectors, quality and inspections suffer', () => {
  const { A, co } = own();
  co.engineers = 1; // of 3 needed
  assert.equal(A.engineerRate(co), S.roles.engineer.minRate, 'never below the floor');
  const days = CONTENT.aerospace.research.turboprops.days;
  const r = A.startResearch(co, 'turboprops');
  assert.ok(r.ok);
  assert.equal(co.researching.doneAt - A.now, Math.round(days / S.roles.engineer.minRate) * DAY);
  assert.match(r.text, /short of engineers/);
  co.engineers = 3;
  co.inspectors = 1; // of 2 needed
  assert.equal(A.inspectorRate(co), 0.5);
  assert.ok(Math.abs(A.qualityBreakdown(co).inspectors + 0.5 * S.inspectors.penalty) < 1e-9);
  assert.ok(A.staffDrag(co) < 1);
  co.inspectors = 4; // double
  assert.equal(A.inspectorRate(co), 1);
  assert.equal(A.qualityBreakdown(co).inspectors, S.inspectors.bonusMax);
  assert.equal(A.qualityOf(co), 52 + S.inspectors.bonusMax);
  co.inspectors = 40;
  assert.equal(A.qualityBreakdown(co).inspectors, S.inspectors.bonusMax, 'capped');
});

test('wages are paid for every role each morning, and the books say so; layoffs cost their severance', () => {
  const { g, A, co } = own();
  A.hire(co, 5, 'engineer');
  A.hire(co, 2, 'inspector');
  const before = A.statement(co, null).acc.wages || 0;
  const hiring = A.statement(co, null).acc.hiring || 0;
  run(g, 1.05);
  const paid = (A.statement(co, null).acc.wages || 0) - before;
  assert.equal(paid, co.workforce * 70 + co.engineers * 140 + co.inspectors * 100, 'one morning');
  const cash = g.player.money;
  assert.ok(A.layoff(co, 2, 'engineer').ok);
  assert.equal(cash - g.player.money, 2 * S.roles.engineer.layoff);
  assert.ok((A.statement(co, null).acc.hiring || 0) > hiring);
  assert.equal(A.layoff(co, 9999, 'tech').ok, true);
  assert.equal(co.workforce, 0, 'no more than there are');
});

test('inspections are recorded; a failed one is visible and costs a little reputation, as before', () => {
  const { g, A, co } = own();
  const c = A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1, unitPrice: 30000, days: 30, quality: 40, depositShare: 0.2 });
  run(g, 20);
  assert.ok(co.qaLog.length >= 1, 'the inspection was logged');
  assert.ok(['what', 'pass', 'chance', 'at'].every((k) => k in co.qaLog[0]));
  void c;
});

test('a save keeps the people, and an old save is given what its bays call for (no surprise wage bill)', () => {
  const { g, A, co } = own();
  A.hire(co, 7, 'engineer');
  co.experience = 61.5;
  co.training = 'intensive';
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const c2 = g2.aero.roost;
  assert.deepEqual([c2.engineers, c2.inspectors, c2.experience, c2.training], [10, 2, 61.5, 'intensive']);
  // from before v0.57.0
  for (const k of ['engineers', 'inspectors', 'experience', 'training', 'qaLog']) delete g.world.aero.companies.roost[k];
  delete g.world.aero.companies.meridian.engineers;
  assert.ok(sm.save('slot2', g).ok);
  const g3 = new Game(CONTENT);
  assert.ok(sm.load('slot2', g3).ok);
  const r3 = g3.aero.roost;
  assert.deepEqual([r3.engineers, r3.inspectors, r3.experience, r3.training], [3, 2, 50, 'none']);
  assert.equal(g3.aero.meridian.engineers, g3.aero.staffNeeded(g3.aero.meridian, 'engineer'));
});

test('Meridian staffs and trains by the same rules: it hires to what its bays call for and trains when it can afford to', () => {
  const { g, A } = own();
  const M = A.meridian;
  const x0 = M.experience;
  run(g, 2);
  assert.ok(M.engineers >= A.staffNeeded(M, 'engineer'));
  assert.ok(M.inspectors >= A.staffNeeded(M, 'inspector'));
  assert.equal(M.training, 'standard');
  assert.ok(M.experience > x0, 'and it learns');
  const wages = A.statement(M, 1).acc.wages;
  assert.ok(wages >= M.workforce * 70 + M.engineers * 140 + M.inspectors * 100 - 1, 'it pays all three');
});
