// The parent company and its subsidiaries (v0.61.0 part A): ownership that cannot be circular or
// doubled, a join that is one step, money that reaches a subsidiary only through the parent, and
// transfers that move cash without making any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { canOwn, reaches, validPolicy, POLICY_DEFAULT } from '../src/corp/group.js';
import { monthTotals } from '../src/corp/ledger.js';

const rich = (seed) => { const g = newGame(seed); g.player.money = 40_000_000; return g; };
/** Everything money can be: the wallet, the parent, every account that holds cash of its own. */
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((a, x) => a + (x.funded ? x.cash : 0), 0);
const empire = (seed) => {
  const g = rich(seed);
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.farm.buy(Object.keys(g.farm.def.plots)[0]).ok);
  return g;
};

test('ownership: no circle, no second parent, no self-ownership', () => {
  assert.ok(canOwn([], 'parent', 'arms').ok);
  assert.ok(!canOwn([], 'arms', 'arms').ok);
  const e = [{ owner: 'parent', sub: 'arms', stake: 1 }];
  assert.ok(!canOwn(e, 'parent', 'arms').ok, 'already there');
  assert.ok(!canOwn(e, 'other', 'arms').ok, 'a second parent');
  assert.ok(!canOwn(e, 'arms', 'parent').ok, 'it would close a circle');
  const chain = [{ owner: 'a', sub: 'b' }, { owner: 'b', sub: 'c' }];
  assert.ok(reaches(chain, 'a', 'c'));
  assert.ok(!canOwn(chain, 'c', 'a').ok, 'a loop through two steps');
  assert.ok(canOwn(chain, 'c', 'd').ok);
});

test('a policy is tidied and bounded', () => {
  const p = validPolicy({ retainPct: 80, distributePct: 80, targetReserve: 10, minLiquidity: 500, nonsense: 1, debtFirst: 0 });
  assert.equal(p.retainPct + p.distributePct, 100);
  assert.ok(p.targetReserve >= p.minLiquidity);
  assert.equal(p.debtFirst, false);
  assert.equal(p.nonsense, undefined);
  assert.deepEqual(validPolicy({}), POLICY_DEFAULT);
  assert.equal(validPolicy({ retainPct: -5 }).retainPct, 0);
  assert.equal(validPolicy({ retainPct: 'x' }).retainPct, POLICY_DEFAULT.retainPct);
});

test('forming the parent company is free, makes nothing, and asks for a name once', () => {
  const g = rich(1201);
  const money = g.player.money;
  const seen = [];
  g.bus.on('corp:founded', (e) => seen.push(e.id));
  assert.equal(g.corp.state.parent, undefined, 'nothing on a new game');
  const r = g.corp.group.form();
  assert.ok(r.ok, r.text);
  assert.equal(g.player.money, money, 'free');
  assert.deepEqual(seen, ['parent']);
  const a = g.corp.account('parent');
  assert.equal(a.cash, 0); assert.ok(a.funded);
  assert.deepEqual(g.corp.group.subs(), []);
  assert.ok(!g.corp.group.form().ok, 'only one');
  assert.equal(g.corp.state.parent.named, false);
  assert.ok(g.corp.group.rename('Vale Holdings').ok);
  assert.equal(g.corp.nameOf('parent'), 'Vale Holdings');
  assert.ok(!g.corp.rename('arms', 'Vale Holdings').ok, 'no business may take the parent\'s name');
  assert.ok(!g.corp.group.rename('x').ok);
  const reg = g.corp.registry();
  assert.ok(reg.every((x) => x.kind !== 'parent' && !String(x.id).includes('parent')), 'the parent is not a business in the registry');
});

test('the owner pays into the parent, and takes dividends out of it; the sum of all cash never changes', () => {
  const g = rich(1202);
  g.corp.group.form();
  const t0 = total(g);
  assert.ok(g.corp.contribute('parent', 1_000_000).ok);
  assert.equal(g.corp.account('parent').cash, 1_000_000);
  assert.equal(total(g), t0);
  assert.ok(g.corp.distribute('parent', 250_000).ok);
  assert.equal(total(g), t0);
  assert.ok(!g.corp.distribute('parent', 5_000_000).ok);
  assert.ok(!g.corp.unfund('parent').ok, 'the parent\'s account is not closed');
  assert.ok(g.corp.reconciles());
});

test('without a parent there is nothing to fund and nothing throws', () => {
  const g = rich(1203);
  assert.ok(!g.corp.contribute('parent', 5).ok);
  assert.ok(!g.corp.distribute('parent', 5).ok);
  assert.ok(!g.corp.group.join('farming').ok);
  assert.equal(g.corp.group.isSub('arms'), false);
  assert.deepEqual(g.corp.group.members(), []);
  assert.throws(() => g.corp.account('parent'));
});

test('a business must exist to join, and an arms business needs a works', () => {
  const g = rich(1204);
  g.corp.group.form();
  assert.ok(!g.corp.group.join('arms').ok, 'not owned');
  assert.ok(g.arms.buyLicence().ok);
  const pre = g.corp.group.joinPreview('arms');
  assert.ok(!pre.ok);
  assert.match(pre.blockers[0], /works/);
  assert.ok(g.arms.buy('aw1').ok);
  assert.ok(g.corp.group.joinPreview('arms').ok);
  assert.ok(!g.corp.group.join('casino').ok);
});

test('joining is one step: the owner\'s stake becomes the parent\'s investment, opening capital moves, and nothing is made', () => {
  const g = empire(1205);
  g.corp.group.form();
  assert.ok(g.corp.contribute('shipping', 300_000).ok, 'the owner had funded shipping on its own');
  g.corp.contribute('parent', 2_000_000);
  const t0 = total(g);
  const pre = g.corp.group.joinPreview('shipping');
  assert.ok(pre.ok && pre.perDay > 0);
  const r = g.corp.group.join('shipping', { opening: 50_000 });
  assert.ok(r.ok, r.text);
  assert.ok(g.corp.group.isSub('shipping'));
  assert.equal(total(g), t0, 'no obol appeared or vanished');
  const a = g.corp.account('shipping');
  assert.equal(a.cash, 350_000, 'its cash stays in it, with the opening capital added');
  assert.equal(a.xferIn, 50_000);
  assert.equal(g.corp.account('parent').cash, 1_950_000);
  const inv = g.corp.state.parent.investments.shipping;
  assert.equal(inv.capital, 50_000);
  assert.ok(inv.brought >= 300_000 + g.logistics.L.price, 'the stake it was brought in at: what the owner had put in, and the business at cost');
  assert.equal(g.corp.account('parent').log.at(-1).type, 'in-kind');
  assert.ok(g.corp.reconciles());
  assert.equal(g.corp.state.transfers.length, 1);
  assert.ok(!g.corp.group.join('shipping').ok, 'not twice');
});

test('joining with more opening capital than the parent holds changes nothing', () => {
  const g = empire(1206);
  g.corp.group.form();
  g.corp.contribute('parent', 1000);
  const snap = JSON.stringify(g.corp.state);
  const r = g.corp.group.join('farming', { opening: 5000 });
  assert.ok(!r.ok);
  assert.equal(JSON.stringify(g.corp.state), snap, 'all or nothing');
  assert.ok(!g.corp.group.join('farming', { opening: -1 }).ok);
});

test('the owner\'s wallet can never pay or be paid by a subsidiary, however it is asked', () => {
  const g = empire(1207);
  g.corp.group.form();
  assert.ok(g.corp.group.join('farming').ok);
  const wallet = g.player.money;
  assert.ok(!g.corp.contribute('farming', 100).ok);
  assert.ok(!g.corp.distribute('farming', 100).ok);
  assert.ok(!g.corp.unfund('farming').ok);
  assert.ok(!g.corp.found('farming', 100, 'x'), 'not even a founding purchase');
  assert.equal(g.player.money, wallet);
  assert.ok(!g.corp.group.capitalise('arms', 100).ok, 'only subsidiaries are capitalised');
});

test('money reaches a subsidiary through the parent, and cash is conserved at every step', () => {
  const g = empire(1208);
  g.corp.group.form();
  g.corp.contribute('parent', 1_000_000);
  assert.ok(g.corp.group.join('aerospace').ok);
  assert.ok(g.corp.group.join('farming').ok);
  const t0 = total(g);
  assert.ok(g.corp.group.capitalise('aerospace', 400_000).ok);
  assert.ok(g.corp.group.capitalise('farming', 100_000).ok);
  assert.equal(total(g), t0);
  assert.equal(g.corp.account('aerospace').cash, 400_000);
  assert.equal(g.corp.account('parent').cash, 500_000);
  assert.ok(!g.corp.group.capitalise('farming', 600_000).ok, 'more than the parent holds');
  assert.ok(g.corp.group.returnCapital('farming', 40_000).ok);
  assert.ok(!g.corp.group.returnCapital('farming', 200_000).ok, 'more than was put in');
  assert.equal(total(g), t0);
  assert.equal(g.corp.state.parent.investments.farming.capital, 60_000);
  for (const t of g.corp.state.transfers) { assert.ok(t.amount > 0 && t.id > 0 && t.day >= 1); }
  assert.deepEqual(g.corp.state.transfers.map((t) => t.id), g.corp.state.transfers.map((_, i) => i + 1), 'numbered once each');
  assert.ok(g.corp.reconciles());
});

test('a transfer is not trading: it adds nothing to a company\'s sales or costs', () => {
  const g = empire(1209);
  g.corp.group.form();
  g.corp.contribute('parent', 800_000);
  g.corp.group.join('farming');
  g.corp.group.capitalise('farming', 500_000);
  const m = Math.floor((g.clock.day - 1) / 30);
  const t = monthTotals(g.corp.account('farming'), m);
  assert.deepEqual([t.revenue, t.opex, t.capex], [0, 0, 0]);
  assert.equal(g.corp.externalSales().agriculture, 0, 'the other companies of the sector are not squeezed by capital');
  assert.equal(g.corp.account('farming').flowIn, 0);
});

test('a subsidiary that was spending the wallet now spends only its own cash — and a farm refuses what it cannot afford', () => {
  const g = empire(1210);
  g.corp.group.form();
  assert.ok(g.corp.group.join('farming').ok);
  const [p1, p2] = Object.keys(g.farm.def.plots);
  void p1;
  assert.ok(!g.farm.buy(p2).ok, 'no money in the farm');
  g.corp.contribute('parent', 100_000);
  assert.ok(g.corp.group.capitalise('farming', 50_000).ok);
  const wallet = g.player.money;
  assert.ok(g.farm.buy(p2).ok);
  assert.equal(g.player.money, wallet);
});

test('joining a business with the money it needs leaves its next days as they were', () => {
  const run = (join) => {
    const g = empire(1211);
    g.arms.state.candidates = []; g.arms.hire(0, 'aw1');
    if (join) {
      g.corp.group.form();
      g.corp.contribute('parent', 2_000_000);
      for (const id of ['arms', 'shipping', 'aerospace', 'farming']) {
        const pre = g.corp.group.joinPreview(id);
        assert.ok(g.corp.group.join(id, { opening: Math.max(pre.suggested, 20_000) }).ok);
      }
    }
    for (let d = 0; d < 6; d++) for (let i = 0; i < 1440; i++) { g.clock.total += 1; g.arms.minuteTick(); g.logistics.minuteTick(); g.aero.minuteTick(); }
    return g;
  };
  const free = run(false);
  const grouped = run(true);
  for (const id of ['shipping', 'aerospace', 'arms']) assert.equal(grouped.corp.account(id).arrears, 0, `${id} owes nothing`);
  assert.equal(grouped.arms.state.staff[0].unpaid, 0, 'the staff were paid');
  assert.equal(grouped.arms.state.staff.length, free.arms.state.staff.length);
  // the same work was done: the shipping ledger's expenses agree
  assert.equal(grouped.logistics.state.ledger.expenses, free.logistics.state.ledger.expenses);
});

test('joining with nothing warns first, and the consequences are real', () => {
  const g = empire(1212);
  g.arms.hire(0, 'aw1');
  g.corp.group.form();
  const pre = g.corp.group.joinPreview('arms');
  assert.ok(pre.warnings.length >= 1);
  assert.match(pre.warnings[0], /go unpaid|quit/);
  assert.ok(g.corp.group.join('arms').ok);
  for (let i = 0; i < 1440 * 3; i++) { g.clock.total += 1; g.arms.minuteTick(); }
  assert.ok(g.arms.state.staff.length === 0 || g.arms.state.staff[0].unpaid >= 1, 'the staff went unpaid');
});

test('leaving: refused while it owes, otherwise the business is the owner\'s again with its cash', () => {
  const g = empire(1213);
  g.corp.group.form();
  g.corp.contribute('parent', 500_000);
  g.corp.group.join('farming', { opening: 100_000 });
  g.corp.account('farming').arrears = 40;
  assert.ok(!g.corp.group.spinOut('farming').ok, 'arrears');
  g.corp.account('farming').arrears = 0;
  const t0 = total(g);
  const wallet = g.player.money;
  const r = g.corp.group.spinOut('farming');
  assert.ok(r.ok, r.text);
  assert.ok(!g.corp.group.isSub('farming'));
  assert.equal(total(g), t0);
  assert.equal(g.corp.account('farming').cash, 100_000, 'its cash stays in it');
  assert.equal(g.corp.state.parent.investments.farming, undefined);
  assert.equal(g.corp.account('parent').log.at(-1).type, 'in-kind-out');
  assert.ok(g.corp.distribute('farming', 100_000).ok, 'the owner can now take it out directly');
  assert.equal(g.player.money, wallet + 100_000);
  assert.ok(!g.corp.group.spinOut('farming').ok, 'not a subsidiary any more');
  assert.ok(g.corp.group.join('farming').ok, 'and it can join again');
});

test('the group survives a save and load: ownership, transfers, investments, names', () => {
  const g = empire(1214);
  g.corp.group.form();
  g.corp.group.rename('Vale Holdings');
  g.corp.contribute('parent', 700_000);
  g.corp.group.join('farming', { opening: 90_000 });
  g.corp.group.join('arms');
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT, { seed: 5 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.deepEqual(g2.corp.group.subs(), ['farming', 'arms']);
  assert.equal(g2.corp.nameOf('parent'), 'Vale Holdings');
  assert.equal(g2.corp.account('farming').cash, 90_000);
  assert.equal(g2.corp.state.transfers.length, 1);
  assert.equal(g2.corp.state.parent.investments.farming.capital, 90_000);
  assert.equal(total(g2), total(g));
  assert.ok(g2.corp.reconciles());
  assert.ok(!g2.corp.group.join('farming').ok, 'still no duplicates');
});

test('an old save has no parent, no group, and nothing consolidated', () => {
  const raw = readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), raw);
  const g = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', g).ok);
  assert.equal(g.corp.state.parent, undefined);
  assert.equal(g.corp.state.ownership, undefined);
  assert.deepEqual(g.corp.group.members(), []);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) assert.equal(g.corp.group.isSub(id), false);
});

test('leaving, closing the account and funding or joining again keeps every account reconciled, and the parent\'s books let go of what left', () => {
  const g = empire(1215);
  g.corp.group.form();
  g.corp.contribute('parent', 800_000);
  const inKind0 = g.corp.account('parent').inKind;
  assert.ok(g.corp.group.join('farming', { opening: 100_000 }).ok);
  assert.ok(g.corp.account('parent').inKind > inKind0, 'brought in');
  assert.ok(g.corp.group.spinOut('farming').ok);
  assert.equal(g.corp.account('parent').inKind, inKind0, 'and it left the parent\'s books when the business left');
  assert.ok(g.corp.unfund('farming').ok, 'closing the account returns its cash');
  const a = g.corp.account('farming');
  assert.deepEqual([a.xferIn, a.xferOut, a.cash], [0, 0, 0]);
  assert.ok(g.corp.reconciles());
  assert.ok(g.corp.contribute('farming', 50).ok);
  assert.ok(g.corp.reconciles(), 'funded again, from nothing');
  assert.ok(g.corp.unfund('farming').ok);
  assert.ok(g.corp.group.join('farming', { opening: 20_000 }).ok);
  assert.ok(g.corp.reconciles(), 'joined again');
  assert.equal(g.corp.account('farming').cash, 20_000);
});

test('a loan\'s rate can be set, within 0 to 25% a year', () => {
  const g = empire(1216);
  g.corp.group.form(); g.corp.contribute('parent', 500_000); g.corp.group.join('farming');
  assert.equal(g.corp.group.lend('farming', 1000, { termMonths: 6, rate: 0.021 }).loan.rate, 0.021);
  assert.ok(!g.corp.group.lend('farming', 1000, { rate: 0.3 }).ok);
  assert.ok(!g.corp.group.lend('farming', 1000, { rate: -0.01 }).ok);
});
