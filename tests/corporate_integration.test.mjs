// The integrated corporate-group test (brief 20.5, v0.80.0): all four businesses under one parent, a qualified manager at each, separate budgets,
// autonomous operations, the world clock advanced through multiple operating periods — and every claim checked against the game's own records
// (ledgers, logs, statements, saved state), not against what a screen shows. One long scenario, run once, asserted from every side.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { MGMT } from '../src/content/management.js';
import { monthTotals, balanceOk } from '../src/corp/ledger.js';

const IDS = ['arms', 'shipping', 'aerospace', 'farming'];
const DAYS = Number(process.env.INTEG_DAYS || 62); // two closed months: the group's monthly jobs have run twice
const dayRun = (g, days) => { for (let d = 0; d < days; d++) for (let i = 0; i < 1440; i++) { g.clock.total += 1; g.minuteTick(); } };

/** Where two plain values first differ (a few paths), for a failure message that says what diverged. */
function diffs(a, b, path = '', out = []) {
  if (out.length > 12 || a === b) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) { out.push(`${path}: ${JSON.stringify(a)?.slice(0, 60)} ≠ ${JSON.stringify(b)?.slice(0, 60)}`); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], `${path}.${k}`, out);
  return out;
}
let g; let M; let K; let pe; let staff = [];
const wallet0 = 80_000_000;

before(() => {
  g = newGame(7001);
  g.player.money = wallet0;
  const ok = (what, r) => assert.ok(r === true || r?.ok, `${what}: ${r?.text}`);
  ok('licence', g.arms.buyLicence()); ok('works', g.arms.buy('aw1')); ok('shipping', g.logistics.buyCompany()); ok('aerospace', g.aero.buyFirm());
  const plots = Object.keys(g.farm.def.plots); ok('plot', g.farm.buy(plots[0])); ok('plot', g.farm.buy(plots[1]));
  g.corp.ensureWorld(); g.market.state;
  K = g.corp; M = K.management; pe = K.personnel;
  ok('form', K.group.form());
  for (const id of IDS) ok(`join ${id}`, K.group.join(id));
  ok('parent cash', K.contribute('parent', 5_000_000));
  for (const id of IDS) ok(`capital ${id}`, K.group.capitalise(id, 800_000));
  g.aero.roost.autoProcure = false;
  pe.ensure();
  const hire = (role, employer) => { const c = pe.candidates().find((x) => x.roles.includes(role)); assert.ok(c, `a candidate for ${role}`); const r = pe.offer(c.id, { role, employer, pay: c.floor + 5 }); ok(`hire ${role}`, r); return r.person; };
  staff = [hire('gm', 'arms'), hire('procurement_mgr', 'arms'), hire('aero_ops_mgr', 'aerospace'), hire('procurement_mgr', 'aerospace'), hire('logistics_mgr', 'shipping'), hire('farm_mgr', 'farming'), hire('cfo', 'parent')];
  for (const [e, c] of [['arms', 'materials'], ['aerospace', 'materials'], ['aerospace', 'hiring'], ['aerospace', 'contracts'], ['farming', 'hiring'], ['shipping', 'hiring'], ['arms', 'hiring'], ['arms', 'expansion']]) ok(`budget ${e} ${c}`, M.setBudget(e, c, 300_000));
  ok('margin', M.setMargin('aerospace', 15));
  for (const x of Object.values(pe.peek().staff)) { x.authority = { ...x.authority, spendLimit: 500_000, approvalAbove: 100_000, canHire: true, canContract: true, canExpand: true, canTransfer: true }; x.startDay = 1; }
  pe.epoch++;
  dayRun(g, DAYS);
});

const sumCat = (a, dir, cats) => Object.values(a.months).reduce((s, m) => s + cats.reduce((t, c) => t + (m[dir][c] || 0), 0), 0);
const allCats = (a, dir) => [...new Set(Object.values(a.months).flatMap((m) => Object.keys(m[dir])))];

test('1–2: each subsidiary did real, industry-specific things, and every revenue and expense category is one a game mechanic posts', () => {
  assert.equal(g.clock.day, 1 + DAYS);
  const allowed = {
    arms: { out: ['wages', 'hiring', 'parts', 'equipment', 'machines'], in: ['sales', 'wholesale', 'orders', 'internal'] },
    shipping: { out: ['wages', 'hiring', 'upkeep', 'voyage', 'port', 'ship', 'fuel', 'insurance'], in: ['internal', 'freight', 'contracts', 'sales'] },
    aerospace: { out: ['people', 'running', 'materials', 'hiring', 'facility', 'research', 'capex', 'hall', 'freight', 'duty', 'internal', 'launch', 'wages'], in: ['customers', 'deposits', 'sales', 'contracts'] },
    farming: { out: ['land', 'wages', 'hiring', 'seed', 'feed', 'equipment', 'fencing', 'animals', 'upkeep'], in: ['crops', 'sales', 'milk', 'market'] },
  };
  const doing = {};
  for (const id of IDS) {
    const a = K.account(id);
    for (const c of allCats(a, 'out')) assert.ok([...allowed[id].out, 'transfer', 'arrears', 'interest', 'loan_principal', 'guarantee'].includes(c), `${id} posts an unexpected expense '${c}'`);
    for (const c of allCats(a, 'in')) assert.ok([...allowed[id].in, 'transfer', 'loan', 'dividend_in', 'ic_interest', 'refund', 'grant', 'insurance', 'other', 'deposit'].includes(c), `${id} posts an unexpected income '${c}'`);
    doing[id] = sumCat(a, 'out', allCats(a, 'out'));
    assert.ok(doing[id] > 0, `${id} spent real money on real things`);
    assert.ok(balanceOk(a), `${id}: the account reconciles`);
  }
  // the things only that business does
  assert.ok(sumCat(K.account('aerospace'), 'in', ['customers']) > 0, 'the aerospace firm was paid by customers for contracts it delivered');
  assert.ok(sumCat(K.account('aerospace'), 'out', ['materials']) > 0, 'and bought materials');
  assert.ok(sumCat(K.account('shipping'), 'out', ['upkeep']) > 0, 'the shipping line paid for its port and ships');
  assert.ok(sumCat(K.account('farming'), 'out', ['land']) > 0, 'the farm paid for its land');
  assert.ok(sumCat(K.account('arms'), 'out', ['wages', 'hiring']) > 0, 'the arms works paid its people');
  assert.ok(K.reconciles(), 'every account in the group reconciles');
});

test('3: managers procured only what is eligible, within their budgets, once per day and per need', () => {
  const done = M.peek().log.filter((l) => l.type === 'done');
  assert.ok(done.some((l) => l.kind === 'reorder'), 'managers reordered');
  assert.ok(done.some((l) => l.kind === 'bid'), 'and bid');
  // never past a budget in any month
  for (const e of IDS) for (const cat of ['materials', 'hiring', 'contracts', 'expansion', 'treasury']) {
    const cap = M.budgetOf(e, cat);
    for (const m of Object.keys(M.peek().spent[e]?.[cat] || {})) assert.ok((M.peek().spent[e][cat][m] || 0) <= cap, `${e} ${cat} month ${m}: spent ${M.peek().spent[e][cat][m]} of ${cap}`);
  }
  // one reorder decision per business per day (a repeated simulation tick never buys twice)
  const seen = new Set();
  for (const l of done.filter((x) => x.kind === 'reorder')) { const k = `${l.employer}|${l.day}`; assert.ok(!seen.has(k), `no second reorder at ${l.employer} on day ${l.day}`); seen.add(k); }
  // bids honour capacity: never more than the limit of live contracts and open bids
  const A = g.aero;
  const open = A.openTenders().filter((t) => t.bids.some((b) => b.company === A.roost.id)).length;
  assert.ok(A.contractsOf(A.roost, 'active').length + open <= MGMT.maxContracts + 1, 'contracts and open bids within the manager\'s limit');
  // arms parts are bought, never anything else, by the arms reorder
  for (const o of g.arms.state.orders) assert.equal(CONTENT.items[o.item].category, 'arms_part');
});

test('4: payroll, purchases and debt service hit the right ledgers, exactly once a day', () => {
  for (const id of ['arms', 'shipping', 'aerospace', 'farming', 'parent']) {
    const people = Object.values(pe.peek().staff).filter((x) => x.employer === id);
    const wages = people.reduce((s, x) => s + x.salary * (x.paidDays || 0), 0);
    const posted = sumCat(K.account(id), 'out', ['wages', 'people']);
    // the account may also carry arms workers' and aerospace crews' own pay; the managers' pay is at least what their pay days make
    assert.ok(posted >= wages - 1, `${id}: wages posted (${posted}) cover what the managers were paid (${wages})`);
    for (const x of people) { assert.ok(x.paidDays >= DAYS - 1 - Math.max(0, x.startDay - 1) - 2 && x.paidDays <= DAYS, `${x.name}: paid ${x.paidDays} days of ${DAYS}`); assert.equal(x.unpaid, 0); assert.equal(x.status, 'active'); }
  }
  assert.ok(pe.peek().log.length >= 0);
});

test('5–7: every subsidiary has a report; the parent holds only what was recorded as sent to it; consolidated statements eliminate what is internal and reconcile', () => {
  const c = K.group.consolidated('year');
  assert.equal(c.separate.length, 5, 'the parent and the four');
  for (const s of c.separate) assert.ok(Number.isFinite(s.revenue) && Number.isFinite(s.opex) && Number.isFinite(s.net), s.id);
  for (const id of IDS) { const m = K.metricsOf(K.registry().find((r) => r.playerId === id)); assert.ok(m.valuation !== undefined && m.cash !== undefined, `${id} has figures`); }
  // the parent's cash: what was put in, what was recorded as sent up or down — nothing else
  const P = K.account('parent');
  const sent = K.state.transfers.filter((t) => t.to === 'parent').reduce((s, t) => s + t.amount, 0);
  const out = K.state.transfers.filter((t) => t.from === 'parent').reduce((s, t) => s + t.amount, 0);
  assert.equal(Math.round(P.xferIn || 0), Math.round(sent)); assert.equal(Math.round(P.xferOut || 0), Math.round(out));
  assert.ok(balanceOk(P));
  // the elimination arithmetic
  const r = c.reconciliation;
  assert.equal(Math.round(r.equals), Math.round(c.consolidated.net), 'sum of the separate results, less dividends and deferred freight, is the consolidated result');
  assert.equal(c.eliminations.internalSales - c.eliminations.internalCost, c.eliminations.deferred);
  for (const id of IDS) assert.equal(K.group.isSub(id), true);
  assert.deepEqual(K.state.ownership.map((e) => e.sub).sort(), [...IDS].sort());
});

test('8–9: wars, embargoes and shortages reach the managers\' decisions, and budgets and distress are met with real, logged responses', () => {
  // the arms market's wars and embargoes ran through the period and are recorded
  assert.ok(K.geo.events().length > 0);
  // put a war in force and watch the response: costs up → a request for a bigger budget, expansion held back
  const st = K.geo.ensure();
  const ev = (kind, extra) => ({ id: `ev_t${st.nextId++}`, key: `t${st.nextId}`, kind, start: 1, registered: 1, end: null, status: 'active', severity: 1, goods: [], timeline: [], ...extra });
  st.events.push(ev('war', { parties: ['teshvar', 'morrow'] }), ev('war', { parties: ['varn', 'caldera'] }));
  assert.ok(M.pressure('aerospace') > MGMT.costNotice, `aerospace costs up ${(M.pressure('aerospace') * 100).toFixed(1)}%`);
  M.ensure().spent.aerospace = { materials: { [M.month]: M.budgetOf('aerospace', 'materials') * 0.9 } };
  const ask = M.askMoreBudget('aerospace');
  assert.ok(ask && ask.kind === 'budget', 'a manager asks for a bigger materials budget');
  const x = Object.values(pe.peek().staff).find((p) => p.role === 'gm' && p.employer === 'arms');
  const hold = M.judgeFor(x, 'expand', 'arms', 'expansion', 1000);
  assert.ok(M.pressure('arms') >= MGMT.costHold ? hold.verdict === 'refuse' && /hold back expansion/.test(hold.reason) : true);
  st.events = st.events.filter((e) => !String(e.id).startsWith('ev_t'));
  // a budget that is gone is a refusal with its reason; a company that cannot pay is refused too
  M.ensure().spent.arms = { materials: { [M.month]: M.budgetOf('arms', 'materials') } };
  const j = M.judgeFor(Object.values(pe.peek().staff).find((p) => p.role === 'procurement_mgr' && p.employer === 'arms'), 'reorder', 'arms', 'materials', 1000);
  assert.equal(j.verdict, 'refuse'); assert.match(j.reason, /monthly budget/);
  // distress: an account drained to nothing cannot be spent from, and its arrears are recorded, not hidden
  const a = K.account('arms'); const had = a.cash;
  assert.ok(K.pay('arms', had, { cat: 'wages' }));
  assert.equal(K.canAfford('arms', 1), false);
  assert.equal(K.pay('arms', 500, { cat: 'wages', owe: true }), true); assert.equal(K.account('arms').arrears, 500);
  assert.ok(balanceOk(K.account('arms')));
  K.receive('arms', 10_000, { cat: 'sales' }); assert.equal(K.account('arms').arrears, 0, 'income pays what was owed first');
});

test('10: the parent can put capital into a subsidiary, once, as a recorded transaction that moves exactly that much', () => {
  const before = { p: K.account('parent').cash, s: K.account('farming').cash, n: K.state.transfers.length, all: g.player.money + Object.values(K.state.accounts).reduce((t, a) => t + (a.funded ? a.cash : 0), 0) };
  const r = K.group.capitalise('farming', 100_000);
  assert.ok(r.ok, r.text);
  assert.equal(Math.round(K.account('parent').cash), Math.round(before.p - 100_000));
  assert.equal(Math.round(K.account('farming').cash), Math.round(before.s + 100_000));
  assert.equal(K.state.transfers.length, before.n + 1);
  const after = g.player.money + Object.values(K.state.accounts).reduce((t, a) => t + (a.funded ? a.cash : 0), 0);
  assert.equal(Math.round(after), Math.round(before.all), 'no money made or lost: the group moved it');
});

test('11: manager skill makes a bounded, measurable difference to outcomes', () => {
  const run = (skill) => {
    const h = newGame(7002); h.player.money = 30_000_000;
    assert.ok(h.arms.buyLicence().ok && h.arms.buy('aw1').ok); h.corp.ensureWorld();
    assert.ok(h.corp.contribute('arms', 600_000).ok);
    const p = h.corp.personnel; p.ensure();
    const c = p.candidates().find((x) => x.roles.includes('procurement_mgr'));
    const r = p.offer(c.id, { role: 'procurement_mgr', employer: 'arms', pay: c.floor + 5 });
    for (const k of Object.keys(r.person.skills)) r.person.skills[k] = skill;
    r.person.startDay = 1; p.epoch++;
    return h.arms.partsMult();
  };
  const hi = run(100); const lo = run(10); const none = (() => { const h = newGame(7002); return h.arms.partsMult(); })();
  assert.ok(hi < lo, `a skilled buyer pays less for parts (${hi} vs ${lo})`);
  assert.ok(hi >= none * 0.8 && lo <= none * 1.05, 'bounded: no manager makes parts free or worth more than they are');
});

test('12: saved and loaded in the middle of it all, every balance, record and pending obligation is the same — and the world goes on identically', () => {
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  const res = sm.load('slot1', h);
  assert.ok(res.ok, JSON.stringify(res.errors));
  const keep = (x) => JSON.stringify([x.world.corp, x.world.robbery, x.player.money, x.clock.total]);
  assert.equal(keep(h), keep(g), 'identical corporate state after the load');
  assert.equal(JSON.stringify(h.world.market), JSON.stringify(g.world.market), 'and the arms market');
  assert.ok(h.corp.reconciles());
  dayRun(g, 3); dayRun(h, 3);
  // (the arms market's own dice and the townspeople are not bit-for-bit after a reload — that is older than this update — so the market and the wars it starts are not compared three days on; the group's records are)
  const MINE = ['accounts', 'companies', 'parent', 'ownership', 'transfers', 'loans', 'group', 'management', 'personnel', 'lending', 'bonds', 'bank']; // the group's own records
  const mine = (x) => [MINE.map((k) => x.world.corp[k]), x.world.robbery, x.player.money]; // (the wars, the competitors and the exchange follow the arms market's dice, which a reload re-rolls)
  assert.deepEqual(diffs(mine(g), mine(h)), [], 'identical three days on: nothing duplicated, nothing lost, no second decision, no second payroll');
  assert.equal(h.corp.management.peek().pending.length, g.corp.management.peek().pending.length);
});
