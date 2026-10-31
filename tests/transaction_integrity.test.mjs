// Transaction integrity (brief 17.1, v0.80.0): the ways money, holdings and records could be duplicated, lost or made out of nothing — each tried.
// Everything not listed here is covered where it lives (circular ownership: corporate_group; the loot paid once: robbery; shocks not repeated: geo;
// payroll once: personnel; consolidation without double counting: corporate_consolidation; borrowing is not revenue: business_loans).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT, setTime } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { judge } from '../src/corp/management.js';
import { balanceOk } from '../src/corp/ledger.js';

const day = (g, d, at = '08:00') => setTime(g, d, at);
const money = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);

/** Every invariant a book can break: nothing below zero, nothing unreconciled, no duplicate id. */
function invariants(g, label = '') {
  const K = g.corp;
  assert.ok(g.player.money >= 0, `${label}: wallet ≥ 0`);
  for (const [id, a] of Object.entries(K.state.accounts)) { assert.ok(!a.funded || a.cash >= -0.5, `${label}: ${id} cash ≥ 0`); assert.ok(a.arrears >= 0, `${label}: ${id} arrears ≥ 0`); assert.ok(balanceOk(a), `${label}: ${id} reconciles`); }
  assert.ok(K.reconciles(), `${label}: all accounts reconcile`);
  for (const l of [...K.lending.loans(true), ...K.business.loans(null, true)]) { assert.ok(l.outstanding >= 0 && l.arrears >= 0, `${label}: loan ${l.id} ≥ 0`); }
  const ids = [...K.lending.loans(true), ...K.business.loans(null, true)].map((l) => l.id); assert.equal(new Set(ids).size, ids.length, `${label}: loan ids unique`);
  for (const r of K.exchange.board()) assert.ok(r.held >= 0 && Number.isFinite(r.price) && r.price > 0, `${label}: ${r.ticker} holding and price sane`);
  const lots = [...K.bonds.lots(), ...K.credit.lots(), ...K.sovereign.lots()].map((l) => l.id); assert.equal(new Set(lots).size, lots.length, `${label}: bond lot ids unique`);
  const staff = Object.values(K.personnel.peek()?.staff || {}); assert.equal(new Set(staff.map((x) => x.id)).size, staff.length, `${label}: person ids unique`);
}
const reloaded = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const h = new Game(CONTENT, { seed: 1 }); assert.ok(sm.load('slot1', h).ok); return h; };

function rich(seed) {
  const g = newGame(seed);
  g.player.money = 60_000_000;
  g.corp.ensureWorld(); g.market.state;
  day(g, 3);
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok && g.logistics.buyCompany().ok && g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('arms', 900_000).ok && g.corp.contribute('shipping', 600_000).ok && g.corp.contribute('aerospace', 700_000).ok);
  g.corp.geo.dailyTick(); g.corp.exchange.dailyTick(); g.corp.sovereign.dailyTick();
  return g;
}

test('no two companies share a name or a ticker, in a world of generated competitors and the older listed ones', () => {
  const g = newGame(6101); g.corp.ensureWorld();
  const rows = g.corp.registry();
  const names = rows.map((r) => r.name.toLowerCase()); assert.equal(new Set(names).size, names.length, 'names unique');
  const tickers = rows.map((r) => r.ticker).filter(Boolean); assert.equal(new Set(tickers).size, tickers.length, 'tickers unique');
  assert.ok(tickers.includes('OBRO') && tickers.includes('CHZ') && tickers.includes('MRDN'));
  assert.equal(g.corp.rename?.('arms', rows.find((r) => r.kind === 'generated').name)?.ok ?? false, false, 'a taken name is refused');
});

test('a day is run once: every service that runs each morning can be asked twice, on the same day, and changes nothing the second time — no second coupon, instalment, payroll, decision, dividend or award', () => {
  const g = rich(6102);
  assert.ok(g.corp.bonds.buy(3, 200_000).ok); assert.ok(g.corp.sovereign.buy('teshvar', 100_000).ok);
  const row = g.corp.exchange.board().find((r) => r.source === 'generated'); assert.ok(g.corp.exchange.buy(row.ticker, 100).ok);
  assert.ok(g.corp.lending.borrow(100_000, 12).ok); assert.ok(g.corp.business.borrow('arms', 80_000, 12).ok);
  const pe = g.corp.personnel; pe.ensure();
  assert.ok(pe.hire('manager', 'arms').ok);
  assert.ok(g.corp.management.setCap('arms', 100_000).ok);
  for (const d of [35, 36, 70]) {
    day(g, d, '19:05');
    g.corp.dailyTick(); pe.payroll();
    const once = JSON.stringify([g.world.corp, g.player.money, g.world.robbery]);
    g.corp.dailyTick(); pe.payroll(); g.corp.dailyTick();
    assert.equal(JSON.stringify([g.world.corp, g.player.money, g.world.robbery]), once, `day ${d}: asked again, nothing moves`);
    invariants(g, `day ${d}`);
  }
  assert.ok(g.corp.bonds.lots()[0].coupons >= 1, 'and the coupons did come, once each');
});

test('a loan is bounded by what stands behind it: borrowing again and again stops at the limit, and the same holdings cannot be pledged twice over', () => {
  const g = rich(6103);
  assert.ok(g.corp.bonds.buy(3, 500_000).ok);
  const cap = g.corp.lending.capacity();
  let n = 0;
  while (n++ < 40) { const r = g.corp.lending.borrow(Math.max(1000, Math.floor(g.corp.lending.capacity().free / 3)), 12); if (!r.ok) break; }
  assert.ok(g.corp.lending.owed() <= cap.total + 1, `owes ${g.corp.lending.owed()} against ${cap.total}`);
  assert.equal(g.corp.lending.borrow(1000, 6).ok, g.corp.lending.capacity().free >= 1000);
  assert.equal(g.corp.bonds.sell(g.corp.bonds.lots()[0].id).ok, false, 'and the pledge holds: it cannot be sold from under the loan');
  // a company likewise
  const v = g.corp.business.view('arms'); let m = 0;
  while (m++ < 40) { if (!g.corp.business.borrow('arms', Math.max(1000, Math.floor(g.corp.business.view('arms').free / 2)), 12).ok) break; }
  assert.ok(g.corp.business.owedBy('arms') <= v.total + 1);
  invariants(g, 'after borrowing to the limit');
});

test('a purchase split into pieces does not get under a manager\'s monthly limit: what has been spent this month counts', () => {
  const base = { kind: 'reorder', owner: false, atWork: true, allowed: true, permitted: true, funded: true, cost: 600, cap: 1000, spent: 0, affordable: true };
  assert.equal(judge(base).verdict, 'execute', 'one purchase of 600 is within the limit of 1000');
  assert.equal(judge({ ...base, spent: 600 }).verdict, 'refuse', 'a second of 600 the same month passes it');
  assert.match(judge({ ...base, spent: 600 }).reason, /monthly limit/);
  assert.equal(judge({ ...base, kind: 'expand', cost: 5000 }).verdict, 'queue', 'expansion is asked about, whatever it costs');
  assert.equal(judge({ ...base, kind: 'expand', cost: 5000, owner: true }).verdict, 'execute', 'and you may say yes to it');
  // and the service keeps the tally from what it was told was spent
  const g = rich(6104);
  const M = g.corp.management; M.ensure();
  M.note('arms', 450); M.note('arms', 150);
  assert.equal(M.spentIn('arms'), 600, 'the pieces add up');
  assert.equal(M.spentIn('shipping'), 0, 'and belong to the business that spent them');
});

test('after every kind of transaction the game can be saved, and what comes back is exactly what was saved — and consistent', () => {
  const g = rich(6105);
  const check = (label) => { invariants(g, label); const h = reloaded(g); assert.equal(JSON.stringify(h.world.corp), JSON.stringify(g.world.corp), `${label}: the corporate state survives a save`); assert.equal(h.player.money, g.player.money, `${label}: and the wallet`); assert.equal(Math.round(money(h)), Math.round(money(g)), `${label}: and all the money`); invariants(h, `${label} (loaded)`); };
  const row = g.corp.exchange.board().find((r) => r.source === 'generated');
  assert.ok(g.corp.exchange.buy(row.ticker, 100).ok); check('a share bought');
  assert.ok(g.corp.exchange.sell(row.ticker, 40).ok); check('a share sold');
  assert.ok(g.corp.bonds.buy(3, 200_000).ok); check('a government bond bought');
  assert.ok(g.corp.credit.offers().length === 0 || g.corp.credit.buy(g.corp.credit.offers()[0].id, 1000).ok); check('a corporate bond bought');
  assert.ok(g.corp.sovereign.buy('lirre', 100_000).ok); check('a foreign bond bought');
  assert.ok(g.corp.lending.borrow(100_000, 12).ok); check('a personal loan signed');
  assert.ok(g.corp.business.borrow('arms', 80_000, 12, { guarantee: 'personal' }).ok); check('a company loan signed');
  assert.ok(g.corp.group.form().ok); assert.ok(g.corp.group.join('arms').ok); check('a parent formed and a subsidiary joined');
  assert.ok(g.corp.contribute('parent', 1_000_000).ok); assert.ok(g.corp.group.capitalise('arms', 300_000).ok); check('capital moved to a subsidiary');
  assert.ok(g.corp.group.lend('arms', 100_000, { termMonths: 6 }).ok); check('an intercompany loan');
  const pe = g.corp.personnel; pe.ensure(); assert.ok(pe.hire('manager', 'arms').ok); check('a manager hired');
  day(g, 40, '19:05'); g.corp.dailyTick(); pe.payroll(); check('a month closed and payroll paid');
  g.inventory.add('item_revolver', 1); g.player.equipped = 'item_revolver'; g.changeMap('first_bank', 'entry'); setTime(g, 41, '10:30'); g.changeMap('first_bank', 'entry');
  g.robbery.minuteTick(); g.interact({ id: 'bank_tellers' }); check('a robbery begun');
  for (let i = 0; i < 6; i++) { g.clock.total += 1; g.robbery.minuteTick(); }
  g.interact({ id: 'bank_vault' }); check('the loot taken');
  const world = JSON.stringify(g.world.robbery); const after = reloaded(g);
  assert.equal(after.robbery.take('first').ok, false, 'and not takeable again after a reload');
  assert.equal(JSON.stringify(after.world.robbery), world);
});

test('a refused transaction changes nothing: no money, holding, record or log moves when a trade, a loan, a transfer or a hire is turned down', () => {
  const g = rich(6106);
  g.corp.personnel.ensure(); // (the hiring pool is made the first time anyone looks at it; that is not a transaction)
  const snap = () => JSON.stringify([g.world.corp, g.player.money]);
  const tries = {
    'buy a company that is not listed': () => g.corp.exchange.buy('NOPE', 5), 'sell shares you do not hold': () => g.corp.exchange.sell('OBRO', 5),
    'buy a bond in odd lots': () => g.corp.bonds.buy(3, 123), 'buy a bond of a term that is not sold': () => g.corp.bonds.buy(9, 1000), 'sell a bond you do not hold': () => g.corp.bonds.sell('nope'),
    'buy a country\'s bond that does not exist': () => g.corp.sovereign.buy('atlantis', 1000), 'sell a foreign bond you do not hold': () => g.corp.sovereign.sell('nope'),
    'borrow far more than your holdings secure': () => g.corp.lending.borrow(5_000_000, 12), 'borrow less than the smallest loan': () => g.corp.lending.borrow(50, 12), 'borrow for a term not offered': () => g.corp.lending.borrow(5000, 7), 'repay a loan you do not have': () => g.corp.lending.repay('nope', 10),
    'lend to an unfunded company': () => g.corp.business.borrow('farming', 5000, 12), 'lend a company more than its books allow': () => g.corp.business.borrow('arms', 99_999_999, 12), 'repay a company loan that is not there': () => g.corp.business.repay('nope', 10),
    'join a group that is not formed': () => g.corp.group.join('arms'), 'capitalise without a parent': () => g.corp.group.capitalise('arms', 1000), 'lend from a parent that is not there': () => g.corp.group.lend('arms', 1000),
    'hire a job that does not exist': () => g.corp.personnel.hire('wizard', 'arms'),
  };
  let n = 0;
  for (const [what, f] of Object.entries(tries)) {
    const before = snap();
    const r = f();
    assert.equal(r?.ok, false, `${what} should be refused`);
    assert.ok(snap() === before, `refused, but something moved: ${what}`);
    n++;
  }
  assert.equal(n, 18);
});
