// The absolute creditworthiness rule (brief 14.1, v0.79.0): robbing a bank has NO effect whatsoever on the player's or any of their companies' financial
// standing — credit record, loan limits and terms, existing loans and schedules, company ratings, valuations, rankings. Two ways of proving it:
//   1. a control game and a robbery game, identical except for the robbery, must give identical answers to every financial question at every stage
//      (just after the robbery, while the bank is sealed, after it reopens);
//   2. the code that decides those answers must not so much as mention robbery, the police or the wanted level, and the robbery code must not mention them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { newGame, setTime } from './helpers.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const code = (p) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const arm = (g) => { g.inventory.add('item_revolver', 1); g.player.equipped = 'item_revolver'; };

/** A game with shares, bonds, a personal loan, a funded company with its own loan, and a parent group — a full financial life. */
function life(seed) {
  const g = newGame(seed);
  g.player.money = 60_000_000;
  g.corp.ensureWorld();
  g.market.state;
  setTime(g, 3, '08:00');
  assert.ok(g.arms.buyLicence().ok && g.arms.buy('aw1').ok);
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.contribute('arms', 900000).ok && g.corp.contribute('shipping', 600000).ok && g.corp.contribute('aerospace', 700000).ok);
  g.corp.geo.dailyTick(); g.corp.exchange.dailyTick(); g.corp.sovereign.dailyTick();
  assert.ok(g.corp.bonds.buy(3, 300000).ok && g.corp.bonds.buy(5, 200000).ok);
  const row = g.corp.exchange.board().find((r) => r.source === 'generated');
  assert.ok(g.corp.exchange.buy(row.ticker, 200).ok);
  assert.ok(g.corp.sovereign.buy('teshvar', 100000).ok);
  assert.ok(g.corp.group.form().ok && g.corp.group.join('arms').ok);
  assert.ok(g.corp.lending.borrow(150000, 12).ok);
  assert.ok(g.corp.business.borrow('arms', 100000, 12, { guarantee: 'personal' }).ok);
  return g;
}

/** Every financial question the game can ask about the player and the companies, answered. Not the wallet, not the clock. */
function finance(g) {
  const K = g.corp;
  const out = {};
  out.record = K.lending.standing();
  out.loans = K.lending.loans(true).map((l) => ({ ...l }));
  const c = K.lending.capacity();
  out.capacity = { total: c.total, owed: c.owed, free: c.free, over: c.over, items: c.items.map((i) => [i.name, i.value, i.advance]) };
  out.personalOffers = [5000, 50000, 120000].flatMap((a) => [6, 12, 36].map((m) => K.lending.offer(a, m)));
  out.business = K.business.eligible().map((id) => ({ id, view: K.business.view(id), standing: K.business.standing(id), loans: K.business.loans(id, true).map((l) => ({ ...l })), offers: [20000, 80000].map((a) => K.business.offer(id, a, 12, 'none')), guarantees: K.business.guarantees(id) }));
  out.metrics = K.registry().filter((r) => r.kind === 'player').map((r) => ({ id: r.id, m: K.metricsOf(r), place: K.placeOf(r.playerId) }));
  out.sectors = ['arms', 'shipping', 'aerospace', 'agriculture'].map((s) => K.sectorTable(s).map((r) => [r.key, r.revenue, r.valuation, r.rank]));
  out.group = { value: K.group.groupValue?.(), consolidated: K.group.consolidated('month') };
  out.policy = K.bank.rate();
  out.reputation = { aero: g.aero.owned ? g.aero.roost.reputation : null, ships: g.logistics.owned ? (g.logistics.state?.reputation ?? null) : null }; // the businesses' own reputations (brief 14.1)
  out.collateral = K.bonds.collateral();
  out.sovereign = K.sovereign.offers().map((o) => [o.country, o.rating, o.strain, o.price]);
  out.exchange = K.exchange.board().filter((r) => r.source === 'generated').map((r) => [r.ticker, r.price, r.fair]);
  out.rating = K.exchange.peek() ? Object.keys(K.exchange.peek().listings).length : 0;
  return JSON.parse(JSON.stringify(out));
}

const stages = [[3, '10:40'], [5, '12:00'], [9, '12:00'], [12, '10:00']];

test('a robbery, its police, its closure and its reopening leave every financial answer exactly as a game without a robbery gives it', () => {
  const rob = life(4101);
  const ctl = life(4101);
  assert.deepEqual(finance(rob), finance(ctl), 'identical to begin with');
  // the robbery: a hold-up at the First Bank at 10:30 on day 3, the loot taken
  setTime(rob, 3, '10:30'); rob.changeMap('first_bank', 'entry'); arm(rob); rob.robbery.minuteTick();
  rob.interact({ id: 'bank_tellers' });
  for (let i = 0; i < 6; i++) { rob.clock.total += 1; rob.robbery.minuteTick(); }
  const wallet = rob.player.money;
  assert.match(rob.interact({ id: 'bank_vault' }).text, /gold bars/);
  assert.equal(rob.player.money - wallet, 250000, 'the loot is real');
  assert.ok(rob.police.state.record > 0 || rob.police.state.calls.length > 0, 'and the police respond');
  for (const [day, at] of stages) {
    for (const g of [rob, ctl]) { g.changeMap('lanternside', 'entry'); setTime(g, day, at); }
    rob.robbery.minuteTick();
    const label = `day ${day} ${at} (bank ${rob.robbery.state('first')})`;
    assert.deepEqual(finance(rob), finance(ctl), `every financial answer is the same: ${label}`);
  }
  assert.ok(rob.robbery.peek().banks.first.history.length === 1);
});

test('what does change: the wallet and the bars you took, the police record, the news, the vault, and what a bond you hold is worth on the screen for ten days — never what you may borrow', () => {
  const rob = life(4102); const ctl = life(4102);
  setTime(rob, 3, '10:30'); rob.changeMap('first_bank', 'entry'); arm(rob); rob.robbery.minuteTick();
  rob.interact({ id: 'bank_tellers' }); for (let i = 0; i < 6; i++) { rob.clock.total += 1; rob.robbery.minuteTick(); }
  rob.interact({ id: 'bank_vault' });
  for (const g of [rob, ctl]) { g.changeMap('lanternside', 'entry'); setTime(g, 4, '10:00'); }
  assert.ok(rob.player.money > ctl.player.money + 200000);
  assert.ok(rob.police.state.record > ctl.police.state.record);
  assert.ok(rob.robbery.premium() > 0 && ctl.robbery.premium() === 0);
  assert.ok(rob.corp.bonds.portfolio().value < ctl.corp.bonds.portfolio().value, 'the screen value of a bond dips a little in the market\'s reaction');
  assert.deepEqual(rob.corp.bonds.collateral(), ctl.corp.bonds.collateral(), 'but what it secures does not move');
  assert.equal(rob.corp.lending.capacity().total, ctl.corp.lending.capacity().total);
  assert.equal(rob.corp.lending.offer(80000, 12).rate, ctl.corp.lending.offer(80000, 12).rate);
  assert.equal(rob.corp.lending.borrow(5000, 6).ok, ctl.corp.lending.borrow(5000, 6).ok, 'a lender who would lend you before still would');
  // the dip is a few basis points of yield and gone in ten days
  setTime(rob, 20, '10:00'); setTime(ctl, 20, '10:00');
  assert.equal(rob.robbery.premium(), 0);
  assert.equal(rob.corp.bonds.portfolio().value, ctl.corp.bonds.portfolio().value);
});

test('robbing the Lariat State Bank — the lender itself — changes nobody\'s loan, record or terms either', () => {
  const rob = life(4103); const ctl = life(4103);
  setTime(rob, 3, '10:30'); rob.changeMap('lariat_bank', 'entry'); arm(rob); rob.robbery.minuteTick();
  rob.interact({ id: 'lb_teller' }); for (let i = 0; i < 6; i++) { rob.clock.total += 1; rob.robbery.minuteTick(); }
  assert.match(rob.interact({ id: 'lb_vault' }).text, /gold bars/);
  for (const [day, at] of [[3, '11:30'], [4, '10:00'], [8, '10:00']]) {
    for (const g of [rob, ctl]) { g.changeMap('lanternside', 'entry'); setTime(g, day, at); }
    rob.robbery.minuteTick();
    assert.deepEqual(finance(rob), finance(ctl), `the same, day ${day}`);
  }
  // and its own staff-of-record: its loans are still collectable on their dates, instalments unchanged
  const l = rob.corp.lending.loans()[0]; const m = ctl.corp.lending.loans()[0];
  assert.deepEqual([l.due, l.left, l.outstanding, l.rate], [m.due, m.left, m.outstanding, m.rate]);
});

test('the money code never reads the robbery, and the robbery code never touches the money: no mention in either direction', () => {
  const money = [
    'src/corp/lending.js', 'src/corp/credit.js', 'src/corp/metrics.js', 'src/corp/sovereign.js', 'src/corp/group.js', 'src/corp/bank.js', 'src/corp/bonds.js', 'src/corp/exchange.js', 'src/corp/management.js', 'src/corp/sim.js', 'src/corp/ledger.js', 'src/corp/consolidate.js',
    'src/systems/lending.js', 'src/systems/businessLoans.js', 'src/systems/creditBonds.js', 'src/systems/sovereign.js', 'src/systems/exchange.js', 'src/systems/group.js', 'src/systems/centralBank.js', 'src/systems/corporate.js', 'src/systems/management.js', 'src/systems/geo.js', 'src/systems/personnel.js',
  ];
  const bad = /robber|police|heist|fact_player_bank|criminal|notoriety|wanted level|\.wanted\b/i;
  for (const p of money) assert.ok(!bad.test(code(p)), `${p} must not mention robbery, police or the wanted level`);
  // the only door between them: the bond yield's market premium, which the collateral valuation leaves out
  const bonds = code('src/systems/bonds.js');
  assert.ok(/robbery\.premium\(\)/.test(bonds), 'bonds read the premium (and only that)');
  assert.equal((bonds.match(/robbery/g) || []).length, 1, 'once, in the yield\'s base');
  assert.ok(/collateral\(\)/.test(code('src/systems/lending.js')) && !/portfolio\(\)\.rows/.test(code('src/systems/lending.js').split('holdings()')[1].split('owed()')[0].split('govBond')[0] + ''), 'lending values bonds through collateral()');
  const rob = ['src/systems/robbery.js', 'src/corp/robbery.js', 'src/content/robbery.js'];
  const forbidden = /corp\.|\.lending|\.business|\.credit\b|\.sovereign|\.exchange|valuation|ranking|rating|standing|creditworth|loan|score/i;
  for (const p of rob) assert.ok(!forbidden.test(code(p)), `${p} must not read or write credit, loans, ratings, valuations, rankings or standing`);
});

test('no source file outside the robbery and the police itself decides anything from the robbery state, and no save field of the money system holds it', () => {
  const g = newGame(4104);
  const keys = Object.keys(g.world);
  g.corp.ensureWorld();
  setTime(g, 3, '10:30'); g.changeMap('first_bank', 'entry'); arm(g); g.robbery.minuteTick();
  const corp = JSON.stringify(g.world.corp);
  assert.ok(!/robber|fact_player_bank/.test(corp), 'nothing of it in the corporate state');
  assert.ok(g.world.robbery, 'its own state, in its own place');
  void keys;
  const used = readdirSync(new URL('../src/systems', import.meta.url)).filter((f) => f.endsWith('.js')).filter((f) => /robbery/.test(code(`src/systems/${f}`)));
  assert.deepEqual(used.sort(), ['bonds.js', 'police.js', 'robbery.js'].sort(), 'only the bond yield\'s premium reads it, and the police name the crime');
});
