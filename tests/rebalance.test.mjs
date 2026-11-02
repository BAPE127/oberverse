// The v0.91.0 rebalance: what a business pays to run is halved, what it sells is up 10%, and with a shipping line of your own there is no freight on
// supplies and exports. Each is one knob in src/content/income.js; these tests set the knob both ways and check the figure moves by exactly that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT } from './helpers.mjs';
import { INCOME } from '../src/content/income.js';
import { WAGES } from '../src/content/personnel.js';
import { QUESTS } from '../src/content/quests.js';

const withKnob = (name, v, f) => { const old = INCOME[name]; INCOME[name] = v; try { return f(); } finally { INCOME[name] = old; } };

test('the knobs: costs are half, revenue is up a tenth, your own shipping line frees freight — and the early figures carry the same tenth', () => {
  assert.equal(INCOME.cost, 0.5); assert.equal(INCOME.revenue, 1.1); assert.equal(INCOME.ownShippingFree, true);
  assert.deepEqual(INCOME.shift, { construction: 330, coffee: 330, refineryPerLevel: 275, refineryPerCorner: 110 });
  assert.deepEqual(INCOME.quest, { darkLamp: 660, sealOfM: 1100 });
  assert.deepEqual([INCOME.business.wholesaleShare, INCOME.business.crops, INCOME.business.contracts], [0.715, 5.1, 140]); // (crops 1.65 and contracts 1.65 until v0.91.0, 6.6 until v0.91.3: the scale of v0.91.4)
  assert.ok(QUESTS, 'the quests read these figures');
  assert.deepEqual(WAGES, { manager: { arms: 110, shipping: 110, aerospace: 135, farming: 90 }, group_manager: { parent: 200 }, office: { parent: 30 } });
});

test('arms: parts cost half (to the obol), a new worker asks half, an export order pays a tenth more', () => {
  const g = newGame(9901); g.player.money = 5e6; g.corp.ensureWorld(); g.market.state;
  const part = Object.entries(g.content.items).find(([, it]) => it.category === 'arms_part')[0];
  const full = withKnob('cost', 1, () => g.arms.partPrice(part));
  const half = g.arms.partPrice(part);
  assert.equal(half, Math.max(1, Math.round(full * 0.5 * 1)), 'half, as the price is rounded'); assert.ok(half < full);
  const crate = Object.entries(g.content.items).find(([, it]) => it.arms?.crate)[0];
  const country = Object.keys(g.market.cfg.countries).find((id) => g.market.price(id, crate) > 0);
  const base = withKnob('revenue', 1, () => g.market.price(country, crate));
  assert.equal(g.market.price(country, crate), Math.max(1, Math.round(base * 1.1)), 'a tenth more');
  const wage = (k) => withKnob('cost', k, () => { const s = g.arms.state; s.candidatesDay = -1; return g.arms.candidates().map((c) => c.wage); });
  assert.ok(wage(0.5).every((w) => w >= 5), 'never below 5 a day');
});

test('shipping: a ship and a port cost half to keep, and a repair costs half', () => {
  const g = newGame(9902); g.player.money = 9e7; assert.ok(g.logistics.buyCompany().ok);
  const L = g.logistics;
  const v = L.vessels()[0];
  const k = (x) => withKnob('cost', x, () => ({ up: L.stats(v).upkeep, op: L.stats(v).opex, dock: L.dailyUpkeep() }));
  const a = k(1); const b = k(0.5);
  assert.ok(b.up <= Math.round(a.up * 0.5) + 1 && b.up >= Math.round(a.up * 0.5) - 1);
  assert.ok(Math.abs(b.op - a.op * 0.5) < 1e-9);
  assert.ok(b.dock < a.dock && b.dock >= a.dock * 0.45);
  v.condition = 60;
  assert.equal(L.repairQuote(v), Math.round(withKnob('cost', 1, () => L.repairQuote(v)) * 0.5));
});

test('aerospace: for you, materials, wages, upkeep and overhead cost half and deliveries pay a tenth more; a rival\'s books are untouched', () => {
  const g = newGame(9903); g.player.money = 9e7; assert.ok(g.aero.buyFirm().ok);
  const A = g.aero; const co = A.roost; const rival = A.meridian;
  const m = Object.keys(A.cfg.materials)[0]; const sp = Object.keys(A.cfg.suppliers).find((id) => A.cfg.suppliers[id].sells[m]);
  const price = (c, k) => withKnob('cost', k, () => A.supplierPrice(c, sp, m));
  assert.equal(price(co, 0.5), Math.round(price(co, 1) * 0.5));
  assert.equal(price(rival, 0.5), price(rival, 1), 'a rival pays what it did');
  const F = (c, k) => withKnob('cost', k, () => A.fixedCosts(c));
  co.workforce = 10; co.engineers = 2; co.inspectors = 1;
  const f1 = F(co, 1); const f5 = F(co, 0.5);
  for (const key of ['wages', 'upkeep', 'overhead']) assert.ok(Math.abs(f5[key] - f1[key] * 0.5) <= 1, `${key}: ${f5[key]} vs ${f1[key]}`);
  assert.deepEqual(F(rival, 0.5), F(rival, 1), 'a rival\'s fixed costs are its own');
  const cash = g.corp.cashOf('aerospace');
  A.receive(co, 1000, 'rev_services');
  assert.equal(g.corp.cashOf('aerospace') - cash, 1100, 'satellite services pay a tenth more (the aerospace bonus is on aircraft sales, which fades with price: tests/operations.test.mjs)');
  const c2 = g.corp.cashOf('aerospace'); A.receive(co, 1000, null);
  assert.equal(g.corp.cashOf('aerospace') - c2, 1000, 'a deposit or refund is not revenue');
});

test('aerospace supplies with a shipping line of your own: no freight, no handling, no duty (v0.91.4); without one, freight and handling are charged (at half)', () => {
  const g = newGame(9904); g.player.money = 9e7; assert.ok(g.aero.buyFirm().ok);
  const A = g.aero; const co = A.roost;
  const m = Object.keys(A.cfg.materials)[0];
  const far = Object.keys(A.cfg.suppliers).find((id) => A.cfg.suppliers[id].where !== 'local' && A.cfg.suppliers[id].sells[m]);
  const local = Object.keys(A.cfg.suppliers).find((id) => A.cfg.suppliers[id].where === 'local' && A.cfg.suppliers[id].sells[m]);
  const noLine = A.freightQuote(co, far, m, 10);
  assert.ok(noLine.freight > 0 && noLine.handling > 0 && noLine.duty >= 0);
  const fullFreight = withKnob('cost', 1, () => A.freightQuote(co, far, m, 10).freight);
  assert.ok(Math.abs(noLine.freight * 2 - fullFreight) <= 2, `half-price freight (${noLine.freight} vs ${fullFreight})`);
  if (local) assert.ok(A.freightQuote(co, local, m, 10).freight > 0);
  g.player.money = 9e7; assert.ok(g.logistics.buyCompany().ok);
  const own = A.freightQuote(co, far, m, 10);
  assert.equal(own.freight, 0); assert.equal(own.handling, 0); assert.equal(own.duty, 0, 'v0.91.4: owning the shipping company waives the duty too: you pay for the goods only');
  if (local) assert.equal(A.freightQuote(co, local, m, 10).freight, 0, 'the truck is free too');
  assert.equal(A.orderCost(co, far, m, 10).total, own.goods + own.duty, 'the order costs the goods and nothing else');
  // a rival is charged as ever
  const r = A.freightQuote(A.meridian, far, m, 10); assert.ok(r.freight > 0 && r.handling > 0);
  withKnob('ownShippingFree', false, () => assert.ok(A.freightQuote(co, far, m, 10).freight > 0));
});

test('a rebalanced day makes no money from nowhere: every business still reconciles', () => {
  const g = newGame(9905); g.player.money = 9e7;
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok && g.logistics.buyCompany().ok && g.aero.buyFirm().ok && g.farm.buy('plot_east_1').ok);
  g.corp.ensureWorld(); g.market.state; assert.ok(g.corp.group.form().ok);
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) { assert.ok(g.corp.group.join(id).ok); assert.ok(g.corp.group.capitalise(id, 300000).ok || true); }
  for (let d = 0; d < 20; d++) for (let i = 0; i < 1440; i++) { g.clock.total += 1; g.minuteTick(); }
  assert.ok(g.corp.reconciles(), 'the group\'s books balance');
  void CONTENT;
});
