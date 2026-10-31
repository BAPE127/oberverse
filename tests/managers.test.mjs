// Managers, simplified (v0.89.0): no skills, no candidates, no budgets by category. Three jobs at one flat wage each; you hire in one tap;
// every manager does the same small good for their business; what they may decide for themselves is a tick-box; each business has one
// monthly limit; expansion is always asked about; and a save from before is converted. Everything is deterministic and conserves money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT, setTime, noImpulses } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { runCommand } from '../src/game/debugCommands.js';
import { ROLES, WAGES, PERKS, PERMS, MARKET, permsFor, wageOf } from '../src/content/personnel.js';
import { MGMT, KINDS } from '../src/content/management.js';
import { judge, autoCap, autoReserve, autoTreasury, treasuryMove } from '../src/corp/management.js';
import { migratePeople } from '../src/corp/people.js';
import * as PC from '../src/content/personnel.js';

const dayAt = (g, d, hhmm = '08:00') => { g.clock.total = (d - 1) * 1440 + (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))); };

/** A funded parent and four businesses of the group, each with its own cash. */
function group(seed, { cash = 300000 } = {}) {
  const g = newGame(seed);
  g.player.money = 80e6;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok && g.logistics.buyCompany().ok && g.aero.buyFirm().ok);
  assert.ok(g.farm.buy('plot_east_1').ok);
  g.corp.ensureWorld(); g.market.state;
  assert.ok(g.corp.group.form().ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.join(id).ok);
  assert.ok(g.corp.contribute('parent', 3_000_000).ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.ok(g.corp.group.capitalise(id, cash).ok);
  g.aero.roost.autoProcure = false;
  return g;
}
const hire = (g, role, employer) => { const r = g.corp.personnel.hire(role, employer); assert.ok(r.ok, r.text); r.person.startDay = 1; g.corp.personnel.epoch++; return r.person; };
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((t, a) => t + (a.funded ? a.cash : 0), 0);

/** The arms works with one worker at a lathe: it has something to reorder. */
function works(seed) {
  const g = newGame(seed); setTime(g, 1, '07:30'); noImpulses(g);
  g.player.money = 5e6;
  runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry');
  runCommand(g, 'stations');
  const L = g.arms.place('aw1', 'item_st_lathe', 8, 6).entity;
  g.arms.setRecipe(L.id, 'barrel');
  runCommand(g, 'hire aw1');
  assert.ok(g.arms.assign(g.arms.state.staff[0].id, L.id).ok);
  assert.ok(g.corp.contribute('arms', 500000).ok);
  g.corp.ensureWorld(); g.market.state;
  return g;
}

// ------------------------------------------------------------------ hiring

test('three jobs, one flat wage each: nobody has a skill and there is no market of candidates', () => {
  assert.deepEqual(Object.keys(ROLES), ['manager', 'group_manager', 'office']);
  assert.equal(PC.SKILLS, undefined); assert.equal(PC.AUTHORITY, undefined); assert.equal(PC.EFFECT_CAPS, undefined);
  for (const [role, by] of Object.entries(WAGES)) for (const [at, w] of Object.entries(by)) { assert.ok(Number.isInteger(w) && w > 0); assert.equal(wageOf(role, at), w); }
  const g = group(9101);
  const pe = g.corp.personnel;
  for (const gone of ['candidates', 'offer', 'promote', 'raise', 'reassign', 'setAuthority', 'openings', 'review', 'weekly']) assert.equal(typeof pe[gone], 'undefined', `${gone} is gone`);
  const x = hire(g, 'manager', 'farming');
  assert.equal(x.skills, undefined); assert.equal(x.authority, undefined);
  assert.equal(x.salary, WAGES.manager.farming, 'the flat wage for that business');
  assert.equal(hire(g, 'manager', 'aerospace').salary, WAGES.manager.aerospace);
});

test('hiring is one tap: the fee is ten days of the wage, from the business\'s own account, and they start at once with every box ticked', () => {
  const g = group(9102);
  const cash0 = g.corp.cashOf('farming'); const me = g.player.money;
  const q = g.corp.personnel.quote('manager', 'farming');
  assert.deepEqual([q.ok, q.wage, q.fee], [true, 180, 1800]);
  assert.equal(g.corp.cashOf('farming'), cash0, 'a quote moves nothing');
  const r = g.corp.personnel.hire('manager', 'farming');
  assert.ok(r.ok, r.text);
  assert.equal(cash0 - g.corp.cashOf('farming'), 1800); assert.equal(g.player.money, me, 'never your wallet');
  assert.equal(r.person.startDay, g.clock.day, 'no notice period');
  assert.deepEqual(r.person.perm, { expand: true }, 'a farm manager may only be asked to expand');
  assert.deepEqual(hire(g, 'manager', 'aerospace').perm, { reorder: true, bid: true, research: true, expand: true });
  assert.deepEqual(hire(g, 'group_manager', 'parent').perm, { transfer: true });
  assert.deepEqual(hire(g, 'office', 'parent').perm, {});
  assert.equal(MARKET.fee, 10);
});

test('refusals say why and change nothing: a second manager, the wrong place, no money, no business, no parent', () => {
  const g = group(9103);
  const pe = g.corp.personnel;
  hire(g, 'manager', 'arms');
  const before = JSON.stringify([g.corp.state.accounts, pe.peek().staff]);
  assert.match(pe.hire('manager', 'arms').text, /already has a Manager/);
  assert.match(pe.hire('office', 'arms').text, /not a job at that kind of business/);
  assert.match(pe.hire('manager', 'parent').text, /not a job at the parent company/);
  assert.match(pe.hire('wizard', 'arms').text, /No such job/);
  assert.equal(JSON.stringify([g.corp.state.accounts, pe.peek().staff]), before, 'nothing moved');
  const poor = group(9104, { cash: 1000 });
  assert.match(poor.corp.personnel.hire('manager', 'aerospace').text, /cannot pay the signing fee of 2,700/);
  const lone = newGame(9105); lone.player.money = 5e6; assert.ok(lone.farm.buy('plot_east_1').ok); lone.corp.ensureWorld();
  assert.match(lone.corp.personnel.hire('group_manager', 'parent').text, /no parent company/);
  assert.match(lone.corp.personnel.hire('manager', 'arms').text, /do not own that business/);
});

test('wages come out of each employer\'s own account once a day; two unpaid days and they resign; a dismissal pays five days and keeps the record', () => {
  const g = group(9106);
  const pe = g.corp.personnel;
  const x = hire(g, 'manager', 'farming'); const y = hire(g, 'group_manager', 'parent');
  const f0 = g.corp.cashOf('farming'); const p0 = g.corp.cashOf('parent');
  dayAt(g, 5, '19:05'); pe.payroll(); pe.payroll();
  assert.equal(f0 - g.corp.cashOf('farming'), 180, 'once, from the farm'); assert.equal(p0 - g.corp.cashOf('parent'), 400, 'the group manager from the parent');
  // a business that cannot pay
  g.corp.state.accounts.farming.cash = 0;
  dayAt(g, 6, '19:05'); pe.payroll(); assert.equal(x.unpaid, 1); assert.equal(x.status, 'active');
  dayAt(g, 7, '19:05'); pe.payroll(); assert.equal(x.status, 'resigned', 'two days unpaid');
  // dismissal
  const c0 = g.corp.cashOf('parent');
  const r = pe.dismiss(y.id);
  assert.ok(r.ok, r.text); assert.equal(c0 - g.corp.cashOf('parent'), 400 * MARKET.severance);
  assert.equal(pe.person(y.id).status, 'dismissed'); assert.ok(pe.person(y.id).log.length >= 2, 'the record is kept');
  assert.ok(pe.hire('group_manager', 'parent').ok, 'the job is open again');
});

// ------------------------------------------------------------------ what a manager does just by being there

test('every manager does exactly the same small good for their business — 3% — and only while paid; the group manager and office staff do none', () => {
  const g = group(9110);
  const pe = g.corp.personnel;
  const base = { armsSpeed: g.arms.speedMult?.() };
  void base;
  const none = { parts: g.arms.partsMult(), upkeep: g.logistics.dailyUpkeep() };
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.deepEqual(pe.effects(id), {}, `${id}: nobody, nothing`);
  const a = hire(g, 'manager', 'arms'); hire(g, 'manager', 'shipping'); hire(g, 'manager', 'aerospace'); hire(g, 'manager', 'farming');
  hire(g, 'group_manager', 'parent'); hire(g, 'office', 'parent');
  assert.deepEqual(pe.effects('arms'), { armsSpeed: 0.03, parts: 0.03 });
  assert.deepEqual(pe.effects('shipping'), { upkeep: 0.03 }); assert.deepEqual(pe.effects('aerospace'), { materials: 0.03 }); assert.deepEqual(pe.effects('farming'), { farmPrice: 0.03 });
  assert.deepEqual(pe.effects('parent'), {}, 'executives and staff do nothing but their jobs');
  assert.deepEqual(PERKS.arms, { armsSpeed: 0.03, parts: 0.03 });
  assert.ok(Math.abs(g.arms.partsMult() - none.parts * 0.97) < 1e-9, 'parts cost 3% less');
  assert.ok(Math.abs(g.logistics.dailyUpkeep() - none.upkeep) < 1e-9, '(the quoted upkeep is the same; the saving comes off the bill when it is paid)');
  a.unpaid = 1; pe.epoch++;
  assert.deepEqual(pe.effects('arms'), {}, 'an unpaid manager is not at work');
});

// ------------------------------------------------------------------ the tick-boxes

test('the boxes: each job has its own, you tick and untick them, and a box that is off is never used', () => {
  assert.deepEqual(permsFor('manager', 'arms'), ['reorder', 'research', 'expand']);
  assert.deepEqual(permsFor('manager', 'shipping'), ['expand']);
  assert.deepEqual(PERMS.group_manager, { parent: ['transfer'] });
  const g = group(9120);
  const pe = g.corp.personnel; const M = g.corp.management;
  const x = hire(g, 'manager', 'aerospace');
  assert.equal(M.deciders('reorder', 'aerospace')[0]?.id, x.id);
  assert.ok(pe.setPerm(x.id, 'reorder', false).ok);
  assert.equal(pe.may(x, 'reorder'), false); assert.equal(M.deciders('reorder', 'aerospace').length, 0, 'unticked: nobody decides it');
  assert.equal(M.deciders('bid', 'aerospace')[0]?.id, x.id, 'the others are untouched');
  assert.match(pe.setPerm(x.id, 'transfer', true).text, /no say in that/);
  assert.match(pe.setPerm('per_nope', 'reorder', true).text, /No such employee/);
  const j = M.judgeFor(x, 'reorder', 'aerospace', 100);
  assert.equal(j.verdict, 'refuse'); assert.match(j.reason, /switched this off/);
  assert.ok(pe.setPerm(x.id, 'reorder', true).ok); assert.equal(M.deciders('reorder', 'aerospace').length, 1);
});

test('buying supplies: ticked, the manager reorders what the works runs short of, within the limit, from the business\'s account; unticked, nothing', () => {
  const g = works(9121);
  const x = hire(g, 'manager', 'arms');
  const M = g.corp.management;
  assert.ok(M.setCap('arms', 50000).ok);
  const plan = M.planArms().reduce((a, o) => a + o.cost, 0);
  assert.ok(plan > 0, 'the works needs parts');
  g.corp.personnel.setPerm(x.id, 'reorder', false);
  dayAt(g, 3); M.dailyTick();
  assert.equal(M.peek().log.filter((l) => l.type === 'done' && l.kind === 'reorder').length, 0, 'unticked: nothing bought');
  g.corp.personnel.setPerm(x.id, 'reorder', true);
  const cash = g.corp.cashOf('arms'); const me = g.player.money;
  dayAt(g, 4); M.dailyTick();
  const done = M.peek().log.filter((l) => l.type === 'done' && l.kind === 'reorder');
  assert.equal(done.length, 1, 'one decision, once a day');
  assert.ok(cash - g.corp.cashOf('arms') > 0 && g.player.money === me, 'from the works, never from you');
  assert.equal(M.spentIn('arms'), done[0].cost); assert.ok(M.spentIn('arms') <= 50000);
  dayAt(g, 4, '20:00'); M.dailyTick();
  assert.equal(M.peek().log.filter((l) => l.type === 'done' && l.kind === 'reorder').length, 1, 'asked again the same day: nothing more');
});

// ------------------------------------------------------------------ the monthly limit and the reserve

test('one monthly limit per business: yours, or about a quarter of its cash; setting it checks the range; a used-up limit refuses with its reason', () => {
  assert.equal(autoCap(0), 5000); assert.equal(autoCap(100000), 25000); assert.equal(autoCap(1_234_567), 309000);
  const g = group(9130);
  const M = g.corp.management; hire(g, 'manager', 'arms'); const x = g.corp.personnel.holders('arms', 'manager')[0];
  assert.equal(M.capOf('arms'), autoCap(g.corp.cashOf('arms')), 'automatic to begin with');
  assert.equal(M.customCap('arms'), 0);
  assert.match(M.setCap('arms', -1).text, /between 0/); assert.match(M.setCap('arms', 9e9).text, /between 0/); assert.match(M.setCap('nowhere', 100).text, /do not own/);
  assert.ok(M.setCap('arms', 20000).ok); assert.equal(M.capOf('arms'), 20000); assert.equal(M.customCap('arms'), 20000);
  M.note('arms', 19500);
  const j = M.judgeFor(x, 'reorder', 'arms', 1000);
  assert.equal(j.verdict, 'refuse'); assert.match(j.reason, /monthly limit \(500 left of 20,000\)/);
  assert.ok(M.setCap('arms', 0).ok); assert.equal(M.customCap('arms'), 0, 'zero is automatic again');
  dayAt(g, 45); assert.equal(M.spentIn('arms'), 0, 'a new month starts at nothing');
  assert.equal(autoReserve(0), 1000); assert.equal(autoReserve(1000), 15000);
  assert.ok(M.reserveOf('arms') >= 1000, 'a reserve the game keeps in every account');
});

// ------------------------------------------------------------------ expansion is always your call

test('expansion is asked about, never done unasked: a request you can approve or decline, once, that lapses after a week', () => {
  const g = group(9140);
  const M = g.corp.management; const pe = g.corp.personnel;
  const x = hire(g, 'manager', 'farming');
  const cash = g.corp.cashOf('farming'); const plots = g.farm.owned().length;
  dayAt(g, 3); M.dailyTick();
  const q = M.peek().pending[0];
  assert.ok(q && q.kind === 'expand' && q.employer === 'farming' && q.cost > 0, 'a request');
  assert.equal(g.farm.owned().length, plots, 'nothing was bought'); assert.equal(g.corp.cashOf('farming'), cash);
  dayAt(g, 4); M.dailyTick(); assert.equal(M.peek().pending.length, 1, 'one at a time');
  // decline: nothing changes
  assert.ok(M.decline(q.id).ok); assert.equal(M.peek().pending.length, 0); assert.equal(g.farm.owned().length, plots);
  // asked again; this time yes — paid from the farm's own account, and not counted against the monthly limit
  dayAt(g, 5); M.dailyTick();
  const q2 = M.peek().pending[0]; assert.ok(q2);
  const spent0 = M.spentIn('farming'); const me = g.player.money; const sum0 = total(g);
  const r = M.approve(q2.id);
  assert.ok(r.ok, r.text);
  assert.equal(g.farm.owned().length, plots + 1); assert.equal(g.player.money, me);
  assert.equal(M.spentIn('farming'), spent0, 'your yes is not the manager\'s spending');
  assert.equal(Math.round(sum0 - total(g)), q2.cost, 'the money went to the seller: no more, no less');
  assert.equal(M.peek().log.filter((l) => l.type === 'approved' && l.kind === 'expand').length, 1);
  // and a request left alone lapses
  dayAt(g, 6); M.dailyTick();
  const q3 = M.peek().pending[0]; if (q3) { dayAt(g, 6 + MGMT.expireDays); M.dailyTick(); assert.equal(M.peek().pending.filter((p) => p.id === q3.id).length, 0, 'lapsed'); assert.ok(M.peek().log.some((l) => l.type === 'expired')); }
  void pe; void x;
});

test('expansion off: an unticked Expand never even asks; a war holds it back with the reason; a company behind on a loan cannot', () => {
  const g = group(9141);
  const M = g.corp.management; const x = hire(g, 'manager', 'farming');
  g.corp.personnel.setPerm(x.id, 'expand', false);
  dayAt(g, 3); M.dailyTick();
  assert.equal(M.peek().pending.length, 0, 'unticked: no request');
  g.corp.personnel.setPerm(x.id, 'expand', true);
  // the pure rule: a refusal beats asking
  const base = { kind: 'expand', owner: false, atWork: true, allowed: true, permitted: true, funded: true, cost: 6000, cap: 0, spent: 0, affordable: true };
  assert.equal(judge(base).verdict, 'queue');
  assert.match(judge({ ...base, hold: 'Costs here are up 3%: managers hold back expansion to keep cash.' }).reason, /hold back/);
  assert.match(judge({ ...base, frozen: true }).reason, /behind on a bank loan/);
  assert.match(judge({ ...base, affordable: false }).reason, /cannot cover/);
  assert.equal(judge({ ...base, owner: true }).verdict, 'execute');
});

test('what each business would expand into, by a fixed rule: the cheapest next plot, port, works, bay or facility', () => {
  const g = group(9142);
  const M = g.corp.management;
  const f = M.planExpansion('farming'); assert.ok(f.length === 0 || /^plot:/.test(f[0].item));
  const s = M.planExpansion('shipping'); assert.ok(s.every((o) => /^port:/.test(o.item)));
  const a = M.planExpansion('aerospace'); assert.ok(a.length > 0 && a.every((o) => /^(bay|facility):/.test(o.item)));
  assert.deepEqual(a.map((o) => o.cost), [...a.map((o) => o.cost)].sort((x, y) => x - y), 'cheapest first');
  assert.ok(M.planExpansion('arms').every((o) => /^works:/.test(o.item)));
  const ids = [...f, ...s, ...a].map((o) => o.item); assert.equal(new Set(ids).size, ids.length);
});

// ------------------------------------------------------------------ research and contracts

test('research: with the box ticked an idle lab starts the cheapest project it can; unticked or busy, nothing; only one at a time', () => {
  const g = group(9150);
  const M = g.corp.management; const x = hire(g, 'manager', 'aerospace');
  const A = g.aero; const co = A.roost;
  assert.ok(M.planResearch('aerospace').length > 0, 'something to research');
  const first = M.planResearch('aerospace')[0];
  assert.deepEqual(Object.entries(A.cfg.research).filter(([id, R]) => !co.research.includes(id) && (R.requires || []).every((r) => co.research.includes(r))).sort((a, b) => a[1].cost - b[1].cost || (a[0] < b[0] ? -1 : 1))[0][0], first.item, 'the cheapest');
  assert.ok(M.setCap('aerospace', 1_000_000).ok);
  g.corp.personnel.setPerm(x.id, 'research', false);
  dayAt(g, 3); M.dailyTick(); assert.equal(co.researching, null); assert.equal(M.peek().log.filter((l) => l.kind === 'research').length, 0);
  g.corp.personnel.setPerm(x.id, 'research', true);
  const cash = g.corp.cashOf('aerospace');
  dayAt(g, 4); M.dailyTick();
  assert.equal(co.researching?.id, first.item, 'under way'); assert.equal(cash - g.corp.cashOf('aerospace'), first.cost, 'paid from the firm');
  dayAt(g, 5); M.dailyTick(); assert.equal(M.peek().log.filter((l) => l.kind === 'research' && l.type === 'done').length, 1, 'one at a time');
  assert.deepEqual(M.planResearch('aerospace'), [], 'busy: no plan');
});

test('arms research is free to choose: the cheapest available node is picked when none is current', () => {
  const g = works(9151);
  const M = g.corp.management; hire(g, 'manager', 'arms');
  const A = g.arms;
  const open = Object.entries(A.cfg.research).filter(([id]) => A.available(id)).sort((a, b) => a[1].cost - b[1].cost || (a[0] < b[0] ? -1 : 1));
  assert.ok(open.length);
  dayAt(g, 3); M.dailyTick();
  assert.equal(A.state.research.current, open[0][0]);
  assert.deepEqual(M.planResearch('arms'), [], 'one current: nothing to plan');
});

test('contracts: the manager bids at the standard margin over cost when the box is ticked, and nothing when it is not', () => {
  assert.equal(MGMT.bidMargin, 15);
  const g = group(9152);
  const M = g.corp.management; const x = hire(g, 'manager', 'aerospace');
  g.corp.personnel.setPerm(x.id, 'bid', false);
  dayAt(g, 3); M.dailyTick();
  assert.equal(M.peek().log.filter((l) => l.kind === 'bid').length, 0, 'unticked: no bids');
  assert.equal(M.deciders('bid', 'aerospace').length, 0);
  g.corp.personnel.setPerm(x.id, 'bid', true);
  assert.equal(M.deciders('bid', 'aerospace').length, 1);
});

// ------------------------------------------------------------------ the group manager's cash moves

test('pure: the cash moves — top up to the floor (never under the parent\'s reserve), sweep the surplus to loans then capital', () => {
  const pol = { floor: 50000, ceiling: 150000 };
  const s = { cash: 20000, parentCash: 400000, arrears: 0, minLiquidity: 2000, loans: [], capital: 20000 };
  assert.deepEqual(treasuryMove(pol, 100000, s, 1000), { kind: 'topup', amount: 30000 });
  assert.deepEqual(treasuryMove(pol, 390000, s, 1000), { kind: 'topup', amount: 10000 });
  assert.equal(treasuryMove(pol, 0, { ...s, cash: 50000 }, 1000), null);
  const hi = { ...s, cash: 200000, capital: 30000, loans: [{ id: 'ln_2', outstanding: 5000 }, { id: 'ln_1', outstanding: 10000 }] };
  assert.deepEqual(treasuryMove(pol, 0, hi, 1000), { kind: 'sweep', amount: 45000, steps: [{ loan: 'ln_1', amount: 10000 }, { loan: 'ln_2', amount: 5000 }, { capital: 30000 }] });
  assert.equal(treasuryMove(pol, 0, { ...hi, arrears: 1 }, 1000), null, 'never while it owes others');
  assert.deepEqual(autoTreasury(0), { floor: 2000, ceiling: 10000 });
  assert.deepEqual(autoTreasury(1000), { floor: 30000, ceiling: 120000 });
});

test('the group manager keeps each company\'s cash in a band the game works out: tops up from the parent, takes surplus back, creates and destroys nothing', () => {
  const g = group(9160, { cash: 20000 });
  const M = g.corp.management; const G = g.corp.group;
  const x = hire(g, 'group_manager', 'parent');
  const band = autoTreasury(G.runningPerDay('farming'));
  assert.ok(g.corp.cashOf('farming') <= band.floor + 100000);
  g.corp.state.accounts.farming.cash = 500; // short
  const sum0 = total(g); const parent0 = g.corp.cashOf('parent');
  assert.ok(M.parentReserve() >= 5000);
  dayAt(g, 3); M.dailyTick();
  const done = M.peek().log.filter((l) => l.type === 'done' && l.kind === 'transfer');
  assert.ok(done.length >= 1, 'topped up');
  assert.ok(g.corp.cashOf('farming') > 500 && g.corp.cashOf('parent') < parent0);
  assert.ok(g.corp.cashOf('parent') >= M.parentReserve() - 1, 'never under the parent\'s reserve');
  assert.equal(Math.round(total(g)), Math.round(sum0), 'moved, not made');
  g.corp.personnel.setPerm(x.id, 'transfer', false);
  g.corp.state.accounts.farming.cash = 500; const n = M.peek().log.length;
  dayAt(g, 4); M.dailyTick();
  assert.equal(g.corp.cashOf('farming'), 500, 'unticked: nothing moved'); assert.ok(M.peek().log.length >= n);
});

// ------------------------------------------------------------------ notices, determinism, saves

test('notices: bids and research are told to you; routine supplies and cash moves only go in the log; requests wait for you', () => {
  const g = group(9170);
  const said = []; g.notify = (t) => said.push(t);
  const M = g.corp.management; hire(g, 'manager', 'farming'); hire(g, 'manager', 'aerospace'); assert.ok(M.setCap('aerospace', 1_000_000).ok);
  dayAt(g, 3); M.dailyTick();
  assert.ok(said.some((t) => /would like to expand/.test(t)), 'the expansion request');
  assert.ok(said.some((t) => /research/i.test(t)), 'research begun');
  assert.equal(said.filter((t) => /Ordered/.test(t)).length, 0, 'supplies stay quiet');
});

test('a day of decisions draws no random number of its own, and a second ask the same day changes nothing', () => {
  const g = group(9171); // (starting research rolls the game\'s own dice, as it does for you, so the aerospace manager is left out of this one)
  hire(g, 'manager', 'farming'); hire(g, 'manager', 'shipping'); hire(g, 'group_manager', 'parent');
  const M = g.corp.management;
  dayAt(g, 3);
  const before = JSON.stringify(g.rng.state ?? g.rng);
  M.dailyTick();
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), before, 'no dice');
  const snap = JSON.stringify([g.corp.state.accounts, M.peek()]);
  M.dailyTick();
  assert.equal(JSON.stringify([g.corp.state.accounts, M.peek()]), snap, 'a second ask the same day is nothing');
});

test('save and load: the people, their boxes, the limits and the requests come back exactly', () => {
  const g = group(9172);
  const x = hire(g, 'manager', 'aerospace'); hire(g, 'manager', 'farming');
  g.corp.personnel.setPerm(x.id, 'bid', false); g.corp.management.setCap('aerospace', 77000);
  dayAt(g, 3); g.corp.management.dailyTick();
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.equal(JSON.stringify(h.world.corp.people), JSON.stringify(g.world.corp.people));
  assert.equal(JSON.stringify(h.world.corp.management), JSON.stringify(g.world.corp.management));
  assert.equal(h.corp.management.capOf('aerospace'), 77000); assert.equal(h.corp.personnel.may(h.corp.personnel.person(x.id), 'bid'), false);
  assert.equal(h.corp.management.peek().pending.length, g.corp.management.peek().pending.length);
});

// ------------------------------------------------------------------ an old save

test('a save from v0.62–v0.88 is converted on first read: one manager a business keeps the job, the first executive becomes the group manager, the rest go; budgets become one limit', () => {
  const g = group(9180);
  const person = (id, role, tier, employer, hiredDay, extra = {}) => ({ id, name: `P ${id}`, first: 'P', last: id, employer, role, tier, salary: 500, hiredDay, startDay: hiredDay, status: 'active', unpaid: 0, skills: { finance: 90 }, authority: { canExpand: false, canContract: true, canTransfer: true }, log: [], reviews: [], ...extra });
  g.world.corp.people = { v: 1, salt: 'S', nextCand: 9, nextStaff: 9, lastWeek: 0, reviewMonth: 0, pool: [{ id: 'cand_1' }], pay: { arms: 3 }, log: [],
    staff: { per_1: person('per_1', 'gm', 'manager', 'arms', 2), per_2: person('per_2', 'procurement_mgr', 'manager', 'arms', 3), per_3: person('per_3', 'ceo', 'executive', 'parent', 1), per_4: person('per_4', 'cfo', 'executive', 'parent', 2), per_5: person('per_5', 'accountant', 'staff', 'arms', 4), per_6: person('per_6', 'farm_mgr', 'manager', 'farming', 5, { authority: { canExpand: true } }) } };
  g.world.corp.management = { v: 1, budgets: { arms: { materials: 10000, hiring: 5000, treasury: 99999 }, farming: { expansion: 2000 } }, spent: { arms: { materials: { 0: 700 }, hiring: { 0: 300 } } }, pending: [{ id: 'req_1', kind: 'expand' }], log: [{ day: 1, type: 'done', text: 'x' }], last: { day: 3, refused: {} }, hires: {}, nextId: 4, plans: [{ id: 'plan_1' }], margins: { aerospace: 12 }, treasury: { farming: { floor: 1, ceiling: 2 } } };
  const pe = g.corp.personnel; const M = g.corp.management;
  const p = pe.peek();
  assert.equal(p.v, 2); assert.equal(p.pool, undefined);
  const by = (id) => p.staff[id];
  assert.deepEqual([by('per_1').role, by('per_1').salary], ['manager', WAGES.manager.arms], 'the longest-serving manager keeps the job at the flat wage');
  assert.equal(by('per_2').status, 'let go'); assert.equal(by('per_5').status, 'let go', 'a staff job at a business goes');
  assert.equal(by('per_3').role, 'group_manager'); assert.equal(by('per_4').role, 'office');
  assert.equal(by('per_6').role, 'manager'); assert.deepEqual(by('per_6').perm, { expand: true }, 'what they could do before is what is ticked');
  assert.equal(by('per_1').skills, undefined); assert.equal(by('per_1').authority, undefined);
  assert.equal(pe.holders('arms').length, 1);
  const m = M.peek();
  assert.equal(m.v, 2); assert.equal(m.caps.arms, 15000, 'categories added up, treasury left out'); assert.equal(m.caps.farming, 2000);
  assert.equal(m.spent.arms[0], 1000); assert.equal(m.pending.length, 0, 'waiting requests lapse and will be asked again');
  assert.ok(m.log.some((l) => /lapsed when managers were simplified/.test(l.text)));
  assert.equal(m.plans, undefined); assert.equal(m.margins, undefined); assert.equal(m.nextId, 4);
  // and it is stable: reading again converts nothing twice
  assert.equal(pe.peek(), g.world.corp.people); assert.equal(M.peek(), g.world.corp.management);
  // the pure part
  const out = migratePeople(PC, { staff: { a: person('a', 'gm', 'manager', 'shipping', 1) } });
  assert.equal(out.staff.a.role, 'manager'); assert.deepEqual(out.released, []);
});

test('the kinds of decision each business can have, and where only the group manager acts', () => {
  assert.deepEqual(KINDS.farming, ['expand', 'transfer']); assert.deepEqual(KINDS.aerospace, ['reorder', 'bid', 'research', 'expand', 'transfer']);
  const g = group(9190);
  const M = g.corp.management; const gm = hire(g, 'group_manager', 'parent'); const m = hire(g, 'manager', 'farming');
  assert.equal(M.mayDecide(gm, 'transfer', 'farming'), true); assert.equal(M.mayDecide(gm, 'expand', 'farming'), false, 'the group manager moves cash, nothing else');
  assert.equal(M.mayDecide(m, 'expand', 'farming'), true); assert.equal(M.mayDecide(m, 'transfer', 'farming'), false); assert.equal(M.mayDecide(m, 'expand', 'arms'), false, 'only their own business');
});
