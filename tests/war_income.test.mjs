// The mercenary company's income rules (v0.103.5), the owner's numbers: with the bare minimum built the company earns at least 2,000,000 obols in 5 days while its soldiers serve,
// and with every facility built, about 20,000,000. A soldier in the field is worth one figure whichever way they are sent (retainer or engagement), vehicles scale together, and
// soldiers who stay at the base earn nothing. Nothing here is a payout from nowhere: the figures are what clients and employers pay (src/content/income.js `war`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, build, buildAll, STAGE1, days, topUp } from './war_helpers.mjs';
import { INCOME } from '../src/content/income.js';
import { RETAINER } from '../src/content/strategic.js';
import { ENGAGE } from '../src/content/generals.js';
import { RISK } from '../src/content/contracts.js';
import { SOLDIER_RETAINER } from '../src/war/strategic.js';
import { FACILITIES } from '../src/content/facilities.js';

const T = INCOME.war.target;

/** Hire `n` soldiers (one officer to each twelve), let them train, put them in squads of twelve (the squads' leaders are the officers) and raise one battalion from all of them. */
function battalionOf(g, n) {
  const officers = Math.ceil(n / 12); g.war.buySupply('uniform', n + 10); g.war.buySupply('rations', 4000);
  topUp(g, 30_000_000);
  // (the range trains six at a time: hire in batches and let each finish)
  for (let i = 0; i < n; i++) { let r = g.war.hire(i < officers ? 'officer' : 'rifleman'); for (let k = 0; !r.ok && k < 12; k++) { days(g, 3); r = g.war.hire(i < officers ? 'officer' : 'rifleman'); } assert.ok(r.ok, `hire ${i}: ${r.text}`); }
  days(g, 10); assert.ok(g.war.organise().ok !== false);
  const sq = g.war.squads().filter((s) => s.status === 'home').map((s) => s.id);
  const r = g.war.raise({ template: 'tpl_company', squads: sq }); assert.ok(r.ok, r.text);
  return g.war.state().war.battalions.find((b) => b.id === r.id);
}

test('the bare minimum (site office, bunkhouse, range, cage: twelve beds, twelve soldiers) earns at least the floor in 5 days', () => {
  const g = warGame(1501, { cash: 20_000_000 }); build(g, STAGE1);
  const beds = FACILITIES.bunkhouse.capacity.beds; assert.equal(beds, 12);
  const bn = battalionOf(g, beds);
  const perDay = SOLDIER_RETAINER(g, bn);
  assert.ok(perDay * T.days >= T.bare, `${perDay} a day is ${perDay * T.days} in ${T.days} days, floor ${T.bare}`);
  assert.ok(perDay * T.days < T.bare * 1.1, 'the floor is a floor, not a windfall: within 10% of it');
});

test('with every facility built (112 beds, four tanks, two helicopters, two guns, two carriers) the company earns about the full figure in 5 days', () => {
  const g = warGame(1502, { cash: 60_000_000 }); buildAll(g, 3);
  const beds = Object.values(FACILITIES).filter((f) => f.capacity?.beds).reduce((a, f) => a + f.capacity.beds, 0);
  assert.equal(beds, 112, 'the barracks hold 112 between them');
  const perDay = INCOME.war.soldierDay * beds + [['tank', 4], ['helicopter', 2], ['artillery', 2], ['carrier', 2]].reduce((a, [c, q]) => a + RETAINER.perVehicle[c] * q, 0);
  assert.ok(perDay * T.days > T.full * 0.95 && perDay * T.days < T.full * 1.05, `${perDay * T.days} in ${T.days} days, aim ${T.full}`);
});

test('the figure is one: a soldier in the field is worth the same on the retainer and in an engagement; vehicles scale together; guards earn about the same as soldiers', () => {
  assert.ok(Math.abs(ENGAGE.payPerTroopDay - RETAINER.perTrooper) / RETAINER.perTrooper < 0.05, 'retainer and engagement agree within 5%');
  assert.equal(ENGAGE.payTank, 2800 * INCOME.war.vehicleScale); assert.equal(RETAINER.perVehicle.tank, 1400 * INCOME.war.vehicleScale);
  for (const k of ['low', 'medium', 'high']) { assert.equal(RISK[k].rate, INCOME.war.guardDay[k]); assert.ok(RISK[k].rate >= INCOME.war.soldierDay * 0.85 && RISK[k].rate <= INCOME.war.soldierDay * 1.8, `${k} guard day`); }
  assert.ok(RISK.high.rate > RISK.medium.rate && RISK.medium.rate > RISK.low.rate);
});

test('soldiers who stay at the base earn nothing: the retainer is paid only for a battalion in a theatre, once a day', () => {
  const g = warGame(1503, { cash: 20_000_000 }); build(g, STAGE1);
  const bn = battalionOf(g, 12);
  const m0 = g.war.cash(); days(g, 3);
  const paid = g.war.cash() - m0; assert.ok(paid < 0, `at home, only costs move the account (${paid})`);
  assert.equal(bn.status, 'home');
});

test('end to end: the bare company enlists, is carried over, and the account really receives the floor for five days in the theatre', () => {
  const g = warGame(1504, { cash: 20_000_000 }); build(g, STAGE1);
  const bn = battalionOf(g, 12);
  const e = g.war.enlist({ theatre: 'th_halden', side: 'ostmark' }); assert.ok(e.ok, e.text); g.war.state().war.aiOff = true;
  const d = g.war.deploy(bn.id); assert.ok(d.ok, d.text);
  const hours = (n) => { for (let i = 0; i < n; i += 6) { g.clock.total += 360; g.war.strategicTick(); } };
  hours(d.days * 24 + 24); assert.equal(bn.status, 'theatre');
  const w = g.war.state().war; const p0 = w.paid || 0;
  days(g, T.days); const earned = (w.paid || 0) - p0;
  assert.ok(earned >= T.bare, `${earned} received in ${T.days} days, floor ${T.bare}`);
});
