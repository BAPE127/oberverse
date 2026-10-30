// What the game pays (v0.82.0): every figure that sets the early pace and the first businesses' income lives in
// src/content/income.js, and the game, its texts and the journal follow it. The owner's target: a first arms works
// by day 3 — a 500 licence, a 2,500 works and some parts — from the 12 obols you start with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, CONTENT } from './helpers.mjs';
import { INCOME } from '../src/content/income.js';
import { applyEffects } from '../src/game/effects.js';
import { ARMS_WAREHOUSES } from '../src/content/arms.js';

const works = Object.values(ARMS_WAREHOUSES);

test('the early shifts pay the INCOME wages, through the real systems', () => {
  const g = newGame(81);
  const m0 = g.player.money;
  assert.equal(g.construction.payShift(), INCOME.shift.construction);
  assert.equal(g.player.money - m0, INCOME.shift.construction);
  g.oil.state.wageLevel = 1;
  assert.equal(g.oil.wagesOwed(), INCOME.shift.refineryPerLevel);
  g.oil.state.wageLevel = 2;
  assert.equal(g.oil.wagesOwed(), 2 * INCOME.shift.refineryPerLevel);
  const m1 = g.player.money;
  applyEffects(g, CONTENT.quests.job_cafe_delivery.outcomes.delivered.effects);
  assert.equal(g.player.money - m1, INCOME.shift.coffee);
});

test('three days of the three daily shifts and the first two quests pay for the licence, a works and parts — the day-3 target', () => {
  const g = newGame(82);
  const day = INCOME.shift.construction + INCOME.shift.coffee + INCOME.shift.refineryPerLevel;
  const quests = INCOME.quest.darkLamp + INCOME.quest.sealOfM;
  const three = g.player.money + 3 * day + quests;
  const cheapest = Math.min(...works.map((w) => w.price));
  assert.ok(cheapest > 0 && cheapest <= 2500);
  const need = CONTENT.arms.licencePrice + cheapest + 500; // the licence, the works, and 500 for parts
  assert.ok(three >= need, `by the end of day 3 a player doing the daily shifts has ${three}, and needs ${need}`);
  // and without the quests the shifts alone get there in a week, not in months
  assert.ok(g.player.money + 7 * day >= need);
  // the target is not met by accident of the starting purse: the 12 obols are a rounding error
  assert.ok(3 * day + quests > 10 * g.player.money);
});

test('the quest rewards and their journal texts are the INCOME figures', () => {
  const lamp = CONTENT.quests.q_dark_lamp.outcomes;
  for (const o of Object.values(lamp)) {
    assert.equal(o.effects.find((e) => e.money).money, INCOME.quest.darkLamp);
    assert.ok(o.effects.find((e) => e.notify).notify.includes(INCOME.quest.darkLamp.toLocaleString('en-US')));
  }
  assert.equal(CONTENT.quests.q_seal_of_m.outcomes.exposed.effects.find((e) => e.money).money, INCOME.quest.sealOfM);
  assert.equal(CONTENT.quests.q_lost_herd.outcomes.home.effects.find((e) => e.money).money, 2500, 'the Lost Herd is unchanged');
});

test('Lucas pays the INCOME share, the Co-op pays the INCOME crop multiplier, and shipping clients pay the contract multiplier', () => {
  const g = newGame(83);
  assert.equal(CONTENT.arms.wholesale.share, INCOME.business.wholesaleShare);
  g.player.money = 5000; assert.ok(g.arms.buyLicence().ok);
  const item = 'item_assault_rifle';
  const v = g.arms.value(item);
  assert.equal(g.arms.wholesale(item), Math.round(v * INCOME.business.wholesaleShare));
  // crops: the Co-op's unit price follows the multiplier (the same day, the same sales so far)
  const price = (mult) => { const was = INCOME.business.crops; INCOME.business.crops = mult; try { return g.farm.unitPrice('wheat', 30); } finally { INCOME.business.crops = was; } };
  assert.equal(price(1.5), Math.round(price(1) * 1.5), 'a crop sells for the multiplier times the old price');
  // contracts: the same seed, offered with the multiplier at 1 and at 1.5
  const offers = (mult) => {
    const was = INCOME.business.contracts; INCOME.business.contracts = mult;
    try { const h = newGame(84); h.player.money = 1e6; assert.ok(h.logistics.buyCompany().ok); h.logistics.postContracts(); return h.logistics.contracts().map((c) => c.pay); } finally { INCOME.business.contracts = was; }
  };
  const a = offers(1); const b = offers(1.5);
  assert.ok(a.length > 0 && a.length === b.length);
  a.forEach((p, i) => assert.ok(Math.abs(b[i] - Math.round(p * 1.5)) <= 1, `${p} → ${b[i]}`));
});

test('nothing outside the income file hard-codes the early wages again', () => {
  assert.ok(!/SITE_WAGE\s*=\s*6\b/.test(readFileSync('src/systems/construction.js', 'utf8')));
  assert.ok(!/5 \* this\.state\.wageLevel/.test(readFileSync('src/systems/oilCompany.js', 'utf8')));
  assert.ok(!/share: 0\.5,/.test(readFileSync('src/content/arms.js', 'utf8')));
});
