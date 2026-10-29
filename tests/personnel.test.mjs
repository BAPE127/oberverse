// The people who run companies (v0.62.0 part B): a market made once and kept, one person one job,
// wages that are really an employer's expense, and nothing that depends on time passing alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import * as P from '../src/content/personnel.js';
import { makeCandidate, rolesFor, roleFit, evaluateOffer, floorPay, effectsOf, grow, needsFor, MIN_FIT } from '../src/corp/people.js';

const atDay = (g, d, hh = 8) => { g.clock.total = (d - 1) * 1440 + hh * 60; };
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);
const shop = (seed) => {
  const g = newGame(seed); g.player.money = 40_000_000;
  assert.ok(g.farm.buy(Object.keys(g.farm.def.plots)[0]).ok);
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  return g;
};
/** The first candidate who suits a job (the market is made of hashes, so this is repeatable). */
const find = (g, role, { not = [] } = {}) => g.corp.personnel.candidates().find((c) => c.roles.includes(role) && !not.includes(c.id));
const hire = (g, role, employer, extra = {}) => {
  const pe = g.corp.personnel;
  const c = find(g, role) || (() => { const x = pe.peek().pool; const n = pe.peek().nextCand++; const k = makeCandidate(P, { salt: pe.peek().salt, n, day: g.clock.day }); x.push({ ...k }); return rolesFor(P, k).includes(role) ? { ...k, roles: rolesFor(P, k) } : null; })();
  assert.ok(c, `a candidate for ${role}`);
  const r = pe.offer(c.id, { role, employer, pay: extra.pay ?? floorPay(c), ...extra });
  if (r.ok && !extra.keepStart) r.person.startDay = g.clock.day; // (notice periods are tested on their own)
  return r;
};

test('skills are 0 to 100 and every job asks for key skills that exist', () => {
  assert.equal(Object.keys(P.SKILLS).length, 17);
  for (const [id, R] of Object.entries(P.ROLES)) {
    assert.ok(R.keys.length >= 1 && R.keys.every((k) => P.SKILLS[k]), id);
    assert.ok(R.pay[0] < R.pay[1] && R.limit >= 1 && R.employers.length);
    for (const [k, [cap, ...skills]] of Object.entries(R.effects)) { assert.ok(P.EFFECT_CAPS[k] >= cap, `${id} ${k}: a job cannot exceed the ceiling alone`); assert.ok(skills.every((s) => P.SKILLS[s])); }
  }
  assert.equal(P.GRADES.at(-1)[0], 0);
});

test('a candidate is a hash: the same salt and number are the same person, with a strength, a weakness and a history', () => {
  const a = makeCandidate(P, { salt: 's1', n: 5, day: 1, prior: ['Aaa Co', 'Bbb Co'] });
  assert.deepEqual(a, makeCandidate(P, { salt: 's1', n: 5, day: 1, prior: ['Aaa Co', 'Bbb Co'] }));
  assert.notEqual(a.name + a.age, (() => { const b = makeCandidate(P, { salt: 's2', n: 5, day: 1 }); return b.name + b.age; })());
  let uneven = 0;
  for (let n = 1; n <= 300; n++) {
    const c = makeCandidate(P, { salt: 'x', n, day: 1, prior: ['Aaa Co'] });
    const R = P.ROLES[c.role];
    assert.ok(Object.values(c.skills).every((v) => v >= 0 && v <= 100));
    assert.ok(rolesFor(P, c).includes(c.role), 'fit for the job they came for');
    assert.ok(c.expects >= R.pay[0] && c.expects <= R.pay[1] + 5, 'asks within the job\'s band');
    assert.ok(c.history.length >= 1 && c.history.every((h) => typeof h.employer === 'string'), 'prior employers kept as names');
    const ks = R.keys.map((k) => c.skills[k]);
    if (Math.max(...ks) - Math.min(...ks) >= 10) uneven++;
    for (const t of ['workEthic', 'reliability', 'leadership', 'negotiation', 'financialDiscipline', 'riskTolerance']) assert.ok(c[t] >= 0 && c[t] <= 100);
  }
  assert.ok(uneven > 200, 'most are strong in one thing and weaker in another, not evenly good');
});

test('offers: at their floor they sign; below it they say what they would take', () => {
  const c = makeCandidate(P, { salt: 'o', n: 1, day: 1 });
  const f = floorPay(c);
  assert.ok(f <= c.expects && f >= c.expects * 0.85 - 5);
  assert.equal(evaluateOffer(c, f).ok, true);
  const no = evaluateOffer(c, f - 10);
  assert.equal(no.ok, false); assert.equal(no.floor, f);
  assert.ok(evaluateOffer(c, c.expects * 1.3).loyalty > evaluateOffer(c, f).loyalty, 'a generous offer starts them better disposed');
  assert.equal(evaluateOffer(c, NaN).ok, false);
});

test('the market is made once, is the same on reopening and after a save and load, and is not made by loading', () => {
  const g = shop(1501);
  assert.equal(g.corp.state.people, undefined, 'nothing until it is opened');
  const a = g.corp.personnel.candidates();
  assert.equal(a.length, 24);
  assert.equal(new Set(a.map((c) => c.id)).size, 24);
  assert.deepEqual(g.corp.personnel.candidates().map((c) => c.id), a.map((c) => c.id), 'reopened: the same');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT, { seed: 2 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(JSON.stringify(g2.corp.state.people), JSON.stringify(g.corp.state.people), 'identical after a load');
  assert.deepEqual(newGame(1501).corp.personnel.candidates().map((c) => c.name), newGame(1501).corp.personnel.candidates().map((c) => c.name), 'and the same for the same world');
});

test('each week a few leave and a few arrive: once a week, bounded after a gap, and no number is used twice', () => {
  const g = shop(1502);
  const pe = g.corp.personnel;
  const first = pe.candidates().map((c) => c.id);
  atDay(g, 3); g.corp.dailyTick();
  assert.deepEqual(pe.candidates().map((c) => c.id), first, 'inside the same week nothing changes');
  atDay(g, 8); g.corp.dailyTick();
  const w1 = pe.candidates().map((c) => c.id);
  assert.equal(w1.length, 24);
  const gone = first.filter((id) => !w1.includes(id)).length;
  assert.ok(gone >= 3 && gone <= 5, `${gone} left`);
  atDay(g, 8); g.corp.dailyTick();
  assert.deepEqual(pe.candidates().map((c) => c.id), w1, 'the same week twice: the same');
  atDay(g, 400); g.corp.dailyTick();
  const after = pe.peek();
  assert.equal(after.pool.length, 24);
  assert.ok(after.nextCand <= 24 + 5 * 4 + 5 * 5, 'a year\'s gap is only a few weeks of change');
  const ids = after.pool.map((c) => c.n);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(Math.max(...ids) < after.nextCand, 'numbers are never reused');
});

test('hiring: the person is made once, the candidate leaves the market, the fee is paid once, and a refusal changes nothing', () => {
  const g = shop(1503);
  g.corp.group.form(); g.corp.contribute('parent', 3_000_000);
  const pe = g.corp.personnel;
  const c = find(g, 'cfo');
  assert.ok(c, 'a CFO is in the market');
  const before = JSON.stringify(g.corp.state);
  const cheap = pe.offer(c.id, { role: 'cfo', employer: 'parent', pay: floorPay(c) - 25 });
  assert.ok(!cheap.ok); assert.ok(cheap.floor);
  assert.equal(JSON.stringify(g.corp.state), before, 'nothing moved on a refusal');
  assert.ok(!pe.offer(c.id, { role: 'gm', employer: 'parent', pay: 999 }).ok, 'a general manager is a business\'s job');
  assert.ok(!pe.offer(c.id, { role: 'cfo', employer: 'arms', pay: 999 }).ok, 'a CFO is the parent\'s');
  assert.equal(JSON.stringify(g.corp.state), before);
  const cash0 = g.corp.account('parent').cash;
  const pay = floorPay(c) + 10;
  const r = pe.offer(c.id, { role: 'cfo', employer: 'parent', pay });
  assert.ok(r.ok, r.text);
  assert.equal(g.corp.account('parent').cash, cash0 - pay * P.MARKET.fee, 'the fee: ten days\' wage, once');
  assert.equal(pe.candidate(c.id), null, 'gone from the market');
  assert.equal(pe.holders('parent', 'cfo').length, 1);
  assert.deepEqual(r.person.authority, P.AUTHORITY.executive);
  assert.ok(!pe.offer(c.id, { role: 'cfo', employer: 'parent', pay }).ok, 'they cannot be hired twice');
  assert.equal(g.corp.account('parent').cash, cash0 - pay * P.MARKET.fee);
  assert.ok(g.corp.reconciles());
});

test('jobs have limits: one CEO, one general manager a business; staff up to three', () => {
  const g = shop(1504);
  g.corp.group.form(); g.corp.contribute('parent', 3_000_000);
  const pe = g.corp.personnel;
  assert.ok(hire(g, 'gm', 'farming').ok);
  const second = find(g, 'gm');
  assert.ok(second);
  assert.match(pe.offer(second.id, { role: 'gm', employer: 'farming', pay: floorPay(second) }).text, /already has a General Manager/);
  assert.ok(pe.offer(second.id, { role: 'gm', employer: 'shipping', pay: floorPay(second) + 5 }).ok, 'another business can have its own');
  const hired = [];
  for (let i = 0; i < 4; i++) { const c = find(g, 'admin'); if (!c) break; const r = pe.offer(c.id, { role: 'admin', employer: 'farming', pay: floorPay(c) }); hired.push(r.ok); }
  assert.deepEqual(hired.slice(0, 3), [true, true, true]);
  if (hired.length > 3) assert.equal(hired[3], false, 'the fourth is refused');
});

test('reassigning moves a person and keeps a single assignment; the wage goes with them', () => {
  const g = shop(1505);
  const pe = g.corp.personnel;
  const r = hire(g, 'sales_mgr', 'farming');
  assert.ok(r.ok, r.text);
  const x = r.person;
  assert.ok(pe.reassign(x.id, { employer: 'shipping' }).ok);
  assert.equal(pe.person(x.id).employer, 'shipping');
  assert.equal(pe.holders('farming', 'sales_mgr').length, 0);
  assert.equal(pe.holders('shipping', 'sales_mgr').length, 1);
  assert.equal(Object.values(pe.peek().staff).filter((y) => y.id === x.id).length, 1);
  assert.ok(!pe.reassign(x.id, { employer: 'shipping' }).ok, 'already there');
  assert.ok(!pe.reassign(x.id, { role: 'ceo' }).ok, 'not a job they can have there');
  assert.equal(pe.person(x.id).salary, x.salary);
});

test('wages are an employer\'s expense, paid once a day from its own account — and the books of each business record them', () => {
  const g = shop(1506);
  g.corp.group.form(); g.corp.contribute('parent', 3_000_000);
  const pe = g.corp.personnel;
  g.corp.group.join('farming', { opening: 100_000 });
  assert.ok(g.corp.contribute('shipping', 300_000).ok);
  g.corp.contribute('aerospace', 2_000_000);
  const farmGM = hire(g, 'gm', 'farming').person;
  const shipGM = hire(g, 'gm', 'shipping').person;
  const aeroGM = hire(g, 'gm', 'aerospace').person;
  const ceo = hire(g, 'ceo', 'parent').person;
  const wallet = g.player.money;
  const cash = Object.fromEntries(['parent', 'farming', 'shipping', 'aerospace'].map((e) => [e, g.corp.account(e).cash]));
  const booksBefore = g.aero.roost.books.totals.wages || 0;
  const expBefore = g.logistics.state.ledger.expenses;
  pe.payroll();
  assert.equal(g.player.money, wallet, 'the owner\'s wallet paid nothing');
  assert.equal(g.corp.account('parent').cash, cash.parent - ceo.salary);
  assert.equal(g.corp.account('farming').cash, cash.farming - farmGM.salary);
  assert.equal(g.corp.account('shipping').cash, cash.shipping - shipGM.salary);
  assert.equal(g.corp.account('aerospace').cash, cash.aerospace - aeroGM.salary);
  assert.equal((g.aero.roost.books.totals.wages || 0) - booksBefore, aeroGM.salary, 'aerospace\'s own books show the wage');
  assert.equal(g.logistics.state.ledger.expenses - expBefore, shipGM.salary, 'so does shipping\'s ledger');
  const again = JSON.stringify(g.corp.state.accounts);
  pe.payroll(); pe.payroll();
  assert.equal(JSON.stringify(g.corp.state.accounts), again, 'once a day, however often it is asked');
  atDay(g, g.clock.day + 1); pe.payroll();
  assert.equal(g.corp.account('parent').cash, cash.parent - 2 * ceo.salary);
  assert.ok(g.corp.reconciles());
});

test('an employer that is not funded pays from the owner\'s wallet, once, with one notice', () => {
  const g = shop(1507);
  const pe = g.corp.personnel;
  const a = hire(g, 'gm', 'arms').person;
  const b = hire(g, 'sales_mgr', 'arms').person;
  const seen = [];
  g.bus.on('money:changed', (e) => seen.push(e.delta));
  const w = g.player.money;
  pe.payroll();
  assert.equal(g.player.money, w - a.salary - b.salary);
  assert.equal(seen.length, 1, 'one notice for the batch');
});

test('a person is not paid before they start, and an employer that cannot pay leaves them unpaid; twice and they resign', () => {
  const g = shop(1508);
  g.corp.group.form(); g.corp.contribute('parent', 400_000);
  g.corp.group.join('farming', { opening: 100_000 });
  const pe = g.corp.personnel;
  const early = hire(g, 'gm', 'farming');
  assert.ok(early.ok);
  const x = early.person;
  x.startDay = g.clock.day + 5;
  pe.payroll();
  assert.equal(g.corp.account('farming').cash, 100_000 - x.salary * P.MARKET.fee, 'not paid before they start (the fee was the only cost)');
  x.startDay = g.clock.day;
  g.corp.account('farming').cash = 10; g.corp.account('farming').contributed = 10 + g.corp.account('farming').flowOut + g.corp.account('farming').distributed - g.corp.account('farming').flowIn - g.corp.account('farming').xferIn + g.corp.account('farming').xferOut;
  const loyal = x.loyalty;
  pe.payroll();
  assert.equal(x.unpaid, 1);
  assert.ok(x.loyalty < loyal);
  assert.equal(g.corp.account('farming').cash, 10, 'nothing borrowed to pay it');
  assert.equal(g.corp.account('farming').arrears, 0, 'and no arrears made to cover it');
  assert.equal(x.status, 'active');
  atDay(g, g.clock.day + 1); pe.payroll();
  assert.equal(x.status, 'resigned');
  assert.equal(pe.holders('farming', 'gm').length, 0);
  assert.ok(g.corp.reconciles());
});

test('payroll survives a save and load on the same day: nobody is paid twice', () => {
  const g = shop(1509);
  g.corp.group.form(); g.corp.contribute('parent', 2_000_000);
  hire(g, 'ceo', 'parent');
  g.corp.personnel.payroll();
  const cash = g.corp.account('parent').cash;
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT, { seed: 2 });
  assert.ok(sm.load('slot1', g2).ok);
  g2.corp.personnel.payroll();
  assert.equal(g2.corp.account('parent').cash, cash);
  atDay(g2, g2.clock.day + 1); g2.corp.personnel.payroll();
  assert.ok(g2.corp.account('parent').cash < cash);
});

test('dismissal pays severance once and keeps the record; the same person cannot be dismissed twice', () => {
  const g = shop(1510);
  const pe = g.corp.personnel;
  const x = hire(g, 'gm', 'shipping').person;
  g.corp.contribute('shipping', 200_000);
  const cash = g.corp.account('shipping').cash;
  const r = pe.dismiss(x.id);
  assert.ok(r.ok);
  assert.equal(g.corp.account('shipping').cash, cash - x.salary * P.MARKET.severance);
  assert.equal(pe.person(x.id).status, 'dismissed');
  assert.ok(pe.person(x.id).log.some((l) => l.type === 'dismissed'), 'a record is kept');
  assert.ok(!pe.dismiss(x.id).ok);
  assert.equal(g.corp.account('shipping').cash, cash - x.salary * P.MARKET.severance);
  pe.payroll();
  assert.equal(g.corp.account('shipping').cash, cash - x.salary * P.MARKET.severance, 'and no more wages');
  assert.equal(pe.all().filter((y) => y.id === x.id).length, 0);
});

test('skills grow from good results and from nothing else', () => {
  const x = { role: 'gm', skills: { workforce: 50, budgeting: 50, strategy: 50 }, xp: 0, gains: 0 };
  let s = { ...x };
  for (let i = 0; i < 10; i++) { const r = grow(P, s, false); assert.equal(r.gained, null); s.xp = r.xp; }
  assert.equal(s.xp, 0, 'idle months give nothing');
  let gained = 0;
  for (let i = 0; i < 40; i++) { const r = grow(P, s, true); s.xp = r.xp; if (r.gained) { s.skills[r.gained]++; s.gains++; gained++; } }
  assert.equal(gained, P.MARKET.maxGains, 'a career adds only so much');
  const g = shop(1511);
  g.corp.group.form(); g.corp.contribute('parent', 2_000_000);
  g.corp.group.join('farming', { opening: 100_000 });
  const p = hire(g, 'gm', 'farming').person;
  const skills0 = JSON.stringify(p.skills);
  for (const d of [31, 61, 91, 121, 151]) { atDay(g, d); g.corp.dailyTick(); }
  assert.equal(JSON.stringify(g.corp.personnel.person(p.id).skills), skills0, 'five flat months: nothing learnt');
  assert.ok(g.corp.personnel.person(p.id).reviews.length >= 1 && g.corp.personnel.person(p.id).reviews.every((r) => !r.good));
});

test('a promotion needs time, good results and the skills; it raises the pay and leaves one job', () => {
  const g = shop(1512);
  g.corp.group.form(); g.corp.contribute('parent', 2_000_000);
  const pe = g.corp.personnel;
  const r = hire(g, 'accountant', 'parent');
  assert.ok(r.ok, r.text);
  const x = r.person;
  assert.match(pe.promoteCheck(x.id, 'cfo'), /days in the job/);
  x.startDay = g.clock.day - 100;
  assert.match(pe.promoteCheck(x.id, 'cfo'), /two good months/);
  x.reviews = [{ good: true }, { good: true }];
  Object.assign(x.skills, { finance: 80, budgeting: 80, risk: 80 });
  assert.equal(pe.promoteCheck(x.id, 'cfo'), null);
  assert.match(pe.promoteCheck(x.id, 'admin'), /not a step up/);
  const sal = x.salary;
  assert.ok(pe.promote(x.id, 'cfo').ok);
  assert.equal(pe.person(x.id).role, 'cfo');
  assert.ok(pe.person(x.id).salary > sal);
  assert.deepEqual(pe.person(x.id).authority, P.AUTHORITY.executive);
  assert.equal(pe.holders('parent').filter((y) => y.id === x.id).length, 1);
});

test('authority is data, bounded by the job\'s level', () => {
  const g = shop(1513);
  const x = hire(g, 'sales_rep', 'farming').person;
  const pe = g.corp.personnel;
  assert.ok(pe.setAuthority(x.id, { spendLimit: 99_999_999, approvalAbove: 99_999_999, canBorrow: true, canTransfer: true, canHire: true }).ok);
  const a = pe.person(x.id).authority;
  assert.ok(a.spendLimit <= 10_000, 'a staff member\'s ceiling');
  assert.equal(a.canBorrow, false); assert.equal(a.canTransfer, false);
  pe.setAuthority(x.id, { spendLimit: 500, approvalAbove: 5000 });
  assert.ok(pe.person(x.id).authority.approvalAbove <= pe.person(x.id).authority.spendLimit);
});

test('the arms works\' staff are listed as they are — counted once, paid by the works, not by the new payroll', () => {
  const g = shop(1514);
  g.arms.hire(0, 'aw1');
  const pe = g.corp.personnel;
  const floor = pe.armsFloor();
  assert.equal(floor.length, 1);
  assert.equal(floor[0].id, g.arms.state.staff[0].id, 'the same record, not a copy');
  assert.equal(floor[0].salary, g.arms.state.staff[0].wage);
  assert.equal(pe.all().filter((x) => x.id === floor[0].id).length, 1);
  const gm = hire(g, 'gm', 'arms').person;
  const w = g.player.money;
  pe.payroll();
  assert.equal(w - g.player.money, gm.salary, 'the new payroll paid only the new person');
  assert.equal(g.arms.state.staff[0].unpaid, 0);
  const s = pe.payrollSummary();
  assert.equal(s.armsFloorPerDay, g.arms.state.staff[0].wage);
  assert.equal(s.total, gm.salary, 'not counting the floor twice');
});

test('a parent company\'s people show in its statement and in the consolidated costs, and the identity holds', () => {
  const g = shop(1515);
  g.corp.group.form(); g.corp.contribute('parent', 2_000_000);
  g.corp.group.join('farming', { opening: 50_000 });
  const ceo = hire(g, 'ceo', 'parent').person;
  const fee = ceo.salary * P.MARKET.fee;
  for (let d = 1; d <= 25; d++) { atDay(g, d, 19); g.corp.personnel.payroll(); }
  atDay(g, 31); g.corp.dailyTick();
  const S = g.corp.group.consolidated('month');
  const par = S.separate.find((x) => x.id === 'parent');
  assert.equal(par.opex, fee + ceo.salary * 25, 'the fee and 25 days\' wages');
  assert.ok(par.net < 0);
  assert.equal(S.consolidated.costs, S.separate.reduce((a, x) => a + x.opex, 0) - S.eliminations.internalCost);
  assert.ok(Math.abs(S.reconciliation.equals - S.consolidated.net) < 1.5);
  assert.equal(g.corp.group.parentLedger('month').managementExpenses, par.opex);
});

test('the actor behind a payment is recorded', () => {
  const g = shop(1516);
  g.corp.group.form(); g.corp.contribute('parent', 1_000_000);
  const x = hire(g, 'ceo', 'parent').person;
  g.corp.personnel.payroll();
  assert.ok(g.corp.account('parent').actors[x.id] > 0, 'the fee was paid on their account');
  assert.ok(g.corp.account('parent').actors.payroll > 0);
});

test('openings: the jobs a business has a case for, once, with the reason', () => {
  const g = shop(1517);
  const pe = g.corp.personnel;
  let o = pe.openings();
  assert.ok(o.some((x) => x.employer === 'farming' && x.role === 'gm'));
  assert.ok(!o.some((x) => x.employer === 'parent'), 'no parent, no executive jobs');
  hire(g, 'gm', 'farming');
  o = pe.openings();
  assert.ok(!o.some((x) => x.employer === 'farming' && x.role === 'gm'), 'filled');
  g.corp.group.form(); g.corp.contribute('parent', 100_000);
  g.corp.group.join('farming');
  assert.ok(pe.openings().some((x) => x.employer === 'parent' && x.role === 'ceo' && x.why));
  assert.deepEqual(needsFor(P, { kind: 'farming', plots: 3, held: {} }).map((n) => n.role), ['gm', 'farm_mgr', 'farm_supervisor']); // v0.63.0: staff jobs a manager may fill
  assert.deepEqual(needsFor(P, { kind: 'farming', plots: 1, held: {} }).map((n) => n.role), ['gm'], 'one plot: a manager and no one else');
});

test('what a hire would be worth is worked out from the business\'s own spending, and a small business is told so', () => {
  const g = shop(1518);
  const c = find(g, 'logistics_mgr');
  const b = g.corp.personnel.benefit(c, 'logistics_mgr', 'shipping');
  assert.ok(b.perDay >= 0 && b.perDay < floorPay(c), 'a young shipping line\'s upkeep cannot repay a manager\'s wage');
  assert.ok(b.effects.upkeep > 0 && b.effects.upkeep <= P.EFFECT_CAPS.upkeep);
});

test('an old save has no market and no people; opening the market costs and gives nothing', () => {
  const raw = readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), raw);
  const g = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g).ok);
  assert.equal(g.corp.state.people, undefined);
  const money = g.player.money;
  const t = total(g);
  assert.equal(g.corp.personnel.all().length, g.arms.state.staff.length, 'only the arms works\' own staff');
  assert.equal(g.corp.personnel.candidates().length, 24);
  assert.equal(g.player.money, money); assert.equal(total(g), t);
  assert.equal(g.corp.personnel.payroll().paid, 0);
  assert.equal(Object.keys(g.corp.state.people.staff).length, 0, 'nobody hired by loading');
});

test('effects add up to no more than their ceilings, and an unpaid person counts for nothing', () => {
  const top = (role) => ({ role, skills: Object.fromEntries(Object.keys(P.SKILLS).map((k) => [k, 100])), reliability: 100, unpaid: 0 });
  const many = ['procurement_mgr', 'cpo', 'procurement_spec', 'procurement_spec', 'procurement_spec'].map(top);
  const e = effectsOf(P, many);
  assert.ok(e.materials <= P.EFFECT_CAPS.materials + 1e-9 && e.parts <= P.EFFECT_CAPS.parts + 1e-9);
  assert.equal(effectsOf(P, [{ ...top('procurement_mgr'), unpaid: 1 }]).materials ?? 0, 0);
  const weak = { ...top('procurement_mgr'), skills: Object.fromEntries(Object.keys(P.SKILLS).map((k) => [k, 15])) };
  assert.equal(effectsOf(P, [weak]).materials, 0, 'a beginner does nothing');
  const half = effectsOf(P, [top('cpo')], P.EXEC_REACH);
  assert.ok(Math.abs(half.materials * 2 - effectsOf(P, [top('cpo')]).materials) < 1e-9);
  assert.ok(roleFit(P, top('gm'), 'gm') >= MIN_FIT);
});
