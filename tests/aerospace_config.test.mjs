// Product configuration (v0.57.0): bounded options a customer asks for — cabin, range, sensors,
// payload, design life — that change what a product costs, how long it takes, what it needs and
// what it sells for; the configured product is what gets built, paid for and delivered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { configure, optionGroupsOf, configError, pickConfig, configLabel, cleanConfig } from '../src/aero/config.js';
import { unitCost, quantityError, bomValue } from '../src/aero/catalog.js';
import { remainingMaterials, stageMaterials, stagesOf } from '../src/aero/pipeline.js';
import { makeTender } from '../src/aero/tenders.js';
import { Rng } from '../src/core/rng.js';

const C = CONTENT.aerospace;
const O = C.options;
const DAY = 1440;
const all = () => Object.entries(C.products).flatMap(([id, p]) => optionGroupsOf(C, p, id).flatMap((g) => Object.keys(O.groups[g].choices).map((ch) => ({ id, p, g, ch }))));

test('the standard configuration is the product itself; an option changes cost, days, price, quality and spec', () => {
  const sky = C.products.ap_skylark;
  assert.equal(configure(C, sky, {}), sky);
  assert.equal(configure(C, sky, { range: 'standard' }), sky);
  const P = configure(C, C.products.ap_tern, { cabin_pax: 'dense', range: 'extended' }, 'ap_tern');
  const T = C.products.ap_tern;
  assert.ok(P.price > T.price && P.days > T.days && P.bomExtra === undefined);
  assert.ok(Object.entries(P.bom).every(([m, n]) => n >= (T.bom[m] || 0)) && bomValue(C, P) > bomValue(C, T));
  assert.equal(P.spec.seats, Math.round(150 * 1.18 * 100) / 100);
  assert.equal(P.spec.range, Math.round(5600 * 1.25 * 100) / 100);
  assert.equal(P.line, 'aircraft'); assert.equal(P.bay, 'heavy'); assert.equal(P.look, T.look);
  assert.equal(T.bom.alu, 20, 'the catalogue itself is never changed');
  const adv = configure(C, T, { avionics_adv: 'advanced' }, 'ap_tern');
  assert.equal(adv.quality, T.quality + 5);
  assert.deepEqual(adv.needs, ['advanced_avionics']);
  assert.match(configLabel(C, T, { cabin_pax: 'dense', range: 'extended' }), /High-density cabin · Extended-range tanks/);
  assert.equal(configLabel(C, T, {}), 'Standard');
});

test('every option on every product it applies to: valid, its materials used by the line, consumed exactly once, and worth building (price ≈ 1.4–1.7× its extra cost)', () => {
  let n = 0;
  for (const { id, p, g, ch } of all()) {
    n++;
    assert.equal(configError(C, p, { [g]: ch }, id), null, `${id} ${g}.${ch}`);
    const P = configure(C, p, { [g]: ch }, id);
    // every lot of the configured bill is consumed by exactly one stage of the line
    const used = {};
    for (const s of stagesOf(C, P)) for (const [m, k] of Object.entries(stageMaterials(P, s))) used[m] = (used[m] || 0) + k;
    assert.deepEqual(used, P.bom, `${id} ${g}.${ch}: no lots left over, none missing`);
    assert.deepEqual(remainingMaterials(C, P, 0), P.bom);
    const a = unitCost(C, p, {});
    const b = unitCost(C, P, {});
    const ratio = (P.price - p.price) / (b.total - a.total);
    assert.ok(ratio > 1.3 && ratio < 1.8, `${id} ${g}.${ch}: the customer pays ${ratio.toFixed(2)}× the extra cost`);
    assert.ok(b.marginShare > a.marginShare - 0.03, `${id} ${g}.${ch}: margin kept (${a.marginShare.toFixed(2)} → ${b.marginShare.toFixed(2)})`);
    assert.ok(P.price - p.price < p.price * 0.2, 'an option is a few percent of a product, not another product');
  }
  assert.ok(n > 60, `${n} options checked`);
});

test('invalid configurations are refused; the five-aircraft rule still holds for a configured order', () => {
  const T = C.products.ap_tern;
  assert.match(configError(C, T, { sensors: 'advanced' }, 'ap_tern'), /no "sensors" option/);
  assert.match(configError(C, T, { range: 'enormous' }, 'ap_tern'), /no "enormous" choice/);
  const g = newGame(61);
  const A = g.aero;
  const co = A.meridian;
  assert.throws(() => A.makeContract(co, { customer: 'cu_skyward', product: 'ap_tern', qty: 6, unitPrice: 600000, days: 30, quality: 60, depositShare: 0.2, config: { range: 'extended' } }), /at most 5 aircraft/);
  assert.throws(() => A.makeContract(co, { customer: 'cu_skyward', product: 'ap_tern', qty: 2, unitPrice: 600000, days: 30, quality: 60, depositShare: 0.2, config: { sensors: 'advanced' } }), /no "sensors" option/);
  assert.ok(quantityError(C.aero, C.products.ap_tern, 6));
});

test('what a customer asks for is fixed by its kind and the tender, not by the dice', () => {
  const sky = C.products.ap_skylark;
  const lariat = C.customers.cu_lariat_coop;
  let sprayers = 0;
  for (let i = 0; i < 400; i++) {
    const cfg = pickConfig(C, sky, lariat, 'ap_skylark', `T${i}`);
    assert.deepEqual(cfg, pickConfig(C, sky, lariat, 'ap_skylark', `T${i}`), 'the same tender asks for the same thing');
    if (cfg.role_light === 'sprayer') sprayers++;
  }
  assert.ok(sprayers > 400 * 0.75 && sprayers < 400 * 0.95, `crop-dusters want spray gear (${sprayers}/400)`);
  // a defence buyer asks for sensors, never a cabin; nobody asks for an option the product doesn't have
  const def = C.customers.cu_ostmark_air;
  for (let i = 0; i < 50; i++) assert.ok(Object.keys(pickConfig(C, C.products.af_falcon, def, 'af_falcon', `D${i}`)).every((g) => ['sensors', 'endurance'].includes(g)));
  // tenders: the configuration is part of the tender, and it prices and times the configured product
  const rng = new Rng(7);
  let seen = 0;
  for (let i = 0; i < 80; i++) {
    const t = makeTender(C, rng, { id: `Tc${i}`, customerId: 'cu_skyward', state: { budget: 1e9 }, day: 1 });
    if (!t) continue;
    const base = C.products[t.product];
    const P = configure(C, base, t.config || {}, t.product);
    if (t.config) { seen++; assert.ok(t.ceiling >= P.price * 0.96 && t.ceiling <= (P.price + 0) * 1.12, 'its ceiling is for the configured price'); assert.ok(t.quality >= P.quality, 'and its quality for the configured one'); }
    assert.equal(quantityError(C.aero, base, t.qty), null, 'the quantity rules apply as ever');
  }
  assert.ok(seen > 5, `airlines ask for options (${seen} of the tenders)`);
});

test('a configured contract builds the configured product: its units carry it, every extra lot is bought and consumed, the aircraft entity keeps it', () => {
  const g = newGame(62);
  g.player.money = 5_000_000;
  const A = g.aero;
  assert.ok(A.buyFirm().ok);
  const co = A.roost;
  for (const c of A.contractsOf(co, 'active')) A.cancelContract('roost', c.id);
  // everything in stores (and purchasing on, to reserve it), so nothing waits on a ship
  for (const m of Object.keys(C.materials)) { const r = A.stock(co, m); r.qty += 80; r.value += 80 * C.materials[m].price; co.books.inventoryValue += 80 * C.materials[m].price; }
  const cfg = { role_light: 'sprayer', range: 'extended' };
  const P = configure(C, C.products.ap_skylark, cfg, 'ap_skylark');
  const c = A.makeContract(co, { customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 1, unitPrice: P.price, days: 40, quality: P.quality, depositShare: 0.2, config: cfg });
  assert.deepEqual(c.config, cleanConfig(cfg));
  const u = A.state.units[c.units[0]];
  assert.deepEqual(u.config, c.config);
  assert.equal(A.pOf(u), A.pOf(c), 'one configured product for the contract and its units');
  assert.deepEqual(A.pOf(u).bom, P.bom);
  const before = Object.fromEntries(Object.keys(C.materials).map((m) => [m, A.stock(co, m).qty]));
  for (let i = 0; i < 40 * DAY && !u.finished; i++) { g.clock.total += 1; A.minuteTick(); }
  assert.equal(u.status, 'delivered');
  const after = Object.fromEntries(Object.keys(C.materials).map((m) => [m, A.stock(co, m).qty]));
  const used = Object.fromEntries(Object.keys(before).map((m) => [m, before[m] - after[m]]).filter(([, n]) => n));
  assert.deepEqual(used, P.bom, 'exactly the configured bill of materials went into it');
  const ac = A.state.aircraft[u.aircraft];
  assert.deepEqual(ac.config, c.config);
  assert.equal(ac.spec.range, P.spec.range);
  assert.ok(ac.spec.range > C.products.ap_skylark.spec.range, 'the aircraft the flight update reads has the longer range');
  assert.equal(c.revenue, P.price, 'paid the configured price');
});

test('an option that needs research can only be bid on once you have it, and the answer says which', () => {
  const g = newGame(63);
  g.player.money = 5_000_000;
  const A = g.aero;
  A.buyFirm();
  const co = A.roost;
  co.research.push('turboprops', 'jet_engines', 'pressurised_cabins');
  co.bays.push({ id: 'heavy_1', type: 'heavy', unit: null, ready: 0 });
  const t = { id: 'Tz', customer: 'cu_skyward', product: 'ap_tern', config: { avionics_adv: 'advanced' }, qty: 1, ceiling: 700000, days: 40, quality: 70, deposit: 0.2, posted: g.clock.day, closes: g.clock.day + 2, status: 'open', bids: [], embargoed: false, defence: false };
  A.state.tenders.push(t);
  co.qualityBase = 90;
  const no = A.bidQuote('roost', 'Tz', 690000, 40);
  assert.equal(no.ok, false);
  assert.match(no.reason, /needs research you don't have yet: Advanced avionics/);
  assert.equal(A.placeBid('roost', 'Tz', 690000, 40).ok, false);
  co.research.push('advanced_avionics');
  const yes = A.bidQuote('roost', 'Tz', 690000, 40);
  assert.equal(yes.ok, true, yes.reason);
  assert.ok(A.placeBid('roost', 'Tz', 690000, 40).ok);
});

test('Meridian bids on a configured tender with the configured cost; saves keep every configuration', () => {
  const g = newGame(64);
  const A = g.aero;
  const M = A.meridian;
  const t = { id: 'Tm', customer: 'cu_skyward', product: 'ap_tern', config: { cabin_pax: 'premium', range: 'extended' }, qty: 1, ceiling: 900000, days: 60, quality: 60, deposit: 0.2, posted: g.clock.day, closes: g.clock.day + 2, status: 'open', bids: [], embargoed: false, defence: false };
  A.state.tenders.push(t);
  const P = A.pOf(t);
  const cost = unitCost(C, P, { materialMult: A.materialMultiplier(M), freightShare: 0.08, speed: A.speedOf(M), failChance: 0.15 }).total;
  A.state.tenders = A.state.tenders.filter((x) => x.id === 'Tm' || x.status !== 'open');
  g.clock.total = g.clock.day * DAY + 6 * 60;
  A.minuteTick();
  const bid = t.bids.find((b) => b.company === 'meridian');
  if (bid) assert.ok(bid.unitPrice >= cost * 1.05 - 100, `its price (${bid.unitPrice}) covers the configured cost (${Math.round(cost)})`);
  // a contract in progress, saved and loaded
  const c = A.makeContract(M, { customer: 'cu_skyward', product: 'ap_tern', qty: 2, unitPrice: P.price, days: 40, quality: P.quality, depositShare: 0.2, config: t.config });
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  const c2 = g2.aero.contract(c.id);
  assert.deepEqual(c2.config, c.config);
  const u2 = g2.aero.state.units[c.units[0]];
  assert.deepEqual(u2.config, c.config);
  assert.deepEqual(g2.aero.pOf(u2).bom, P.bom);
  assert.equal(g2.aero.tender('Tm').config.range, 'extended');
});

test('satellite options change life, service income and risk — and rockets their launch risk', () => {
  const sat = C.products.st_relay;
  const P = configure(C, sat, { sat_life: 'extended', sat_payload: 'enhanced', sat_hardened: 'hardened' }, 'st_relay');
  assert.equal(P.life, Math.round(sat.life * 1.5));
  assert.equal(P.service.comms, sat.service.comms * 1.25);
  assert.equal(P.effects.commissionRisk, 0.6);
  assert.equal(sat.life, 60, 'the catalogue is untouched');
  const R = configure(C, C.products.rk_heron, { upper: 'restartable' }, 'rk_heron');
  assert.equal(R.effects.launchRisk, 0.85);
});
