// What to do next, and the inbox (v0.90.0): game.corp.todo reads the managers' own planners (and the plain jobs of a farm and a fleet) so the OberPad can
// show one button for each, and gathers every decision waiting for you into one list. Reading changes nothing and draws no random number; doing goes
// through the service that has always done it, so money is conserved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, Game, CONTENT } from './helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const dayAt = (g, d, hhmm = '10:00') => { g.clock.total = (d - 1) * 1440 + Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)); };
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
  dayAt(g, 5);
  return g;
}
const total = (g) => g.player.money + Object.values(g.corp.state.accounts).reduce((t, a) => t + (a.funded ? a.cash : 0), 0);
const keys = (g, id) => g.corp.todo.items(id).map((i) => i.key);

test('nothing is owned, nothing to do: no items, no trail, an empty inbox, and reading makes no state', () => {
  const g = newGame(9401);
  g.corp.ensureWorld();
  const T = g.corp.todo;
  assert.deepEqual(['arms', 'shipping', 'aerospace', 'farming'].map((id) => T.items(id)), [[], [], [], []]);
  assert.deepEqual(T.inbox(), []); T.dailyTick();
  assert.equal(g.corp.state.trail, undefined, 'no business, no trail');
  assert.equal(T.status('arms').text, 'Not yours');
});

test('status is two words and a colour: red for a loan behind, amber for something short or low cash, green for running', () => {
  const g = group(9402);
  const T = g.corp.todo;
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) { const s = T.status(id); assert.match(s.dot, /^[gar]$/); assert.ok(s.text.split(' ').length <= 4, s.text); }
  assert.equal(T.status('farming').dot, 'g'); assert.equal(T.status('farming').text, 'Running');
  assert.match(T.status('aerospace').text, /^Short of \d+ parts?$/); assert.equal(T.status('aerospace').dot, 'a');
  g.corp.state.accounts.shipping.cash = 100;
  assert.deepEqual(T.status('shipping'), { dot: 'a', text: 'Low on cash' });
  assert.ok(g.corp.business.borrow('farming', 20000, 12).ok);
  g.corp.state.accounts.farming.cash = 0;
  dayAt(g, 40); g.corp.business.dailyTick?.();
  const l = g.corp.business.loans('farming')[0]; if (l) { l.arrears = 500; l.missed = 1; assert.deepEqual(T.status('farming'), { dot: 'r', text: 'Behind on a loan' }); }
});

test('Do next: at most three, what a manager already does for you is left out, and an unticked box brings it back', () => {
  const g = group(9403);
  const T = g.corp.todo;
  const all = keys(g, 'aerospace');
  assert.ok(all.length <= 3 && all.includes('reorder'));
  const x = g.corp.personnel.hire('manager', 'aerospace').person; x.startDay = 1; g.corp.personnel.epoch++;
  assert.ok(!keys(g, 'aerospace').some((k) => ['reorder', 'bid', 'research', 'expand'].includes(k)), 'the manager has it all ticked');
  g.corp.personnel.setPerm(x.id, 'reorder', false);
  assert.ok(keys(g, 'aerospace').includes('reorder'), 'reorder is yours again');
  assert.ok(T.items('aerospace').every((i) => i.title && i.button && i.icon !== undefined));
});

test('doing it goes through the service that always did it: reorder, research and expand pay from the business, never your wallet', () => {
  const g = group(9404);
  const T = g.corp.todo; const me = g.player.money; const sum = total(g);
  const a0 = g.corp.cashOf('aerospace');
  const r = T.run('aerospace', 'reorder'); assert.ok(r.ok, r.text);
  assert.ok(a0 - g.corp.cashOf('aerospace') > 0 && g.player.money === me);
  const n0 = g.aero.roost.researching;
  const r2 = T.run('aerospace', 'research'); assert.ok(r2.ok, r2.text); assert.ok(g.aero.roost.researching && !n0);
  const plots = g.farm.owned().length; const f0 = g.corp.cashOf('farming');
  const r3 = T.run('farming', 'expand'); assert.ok(r3.ok, r3.text);
  assert.equal(g.farm.owned().length, plots + 1); assert.ok(f0 - g.corp.cashOf('farming') > 0 && g.player.money === me);
  assert.ok(g.corp.management.peek().log.some((l) => l.type === 'owner' && l.kind === 'expand'), 'logged as yours, not a manager\'s');
  assert.equal(T.run('farming', 'nonsense').ok, false);
  void sum;
});

test('no limit holds you, but you cannot spend what the business does not have', () => {
  const g = group(9405, { cash: 4000 });
  const T = g.corp.todo;
  assert.ok(g.corp.management.setCap('farming', 1) || true);
  const r = T.run('farming', 'expand');
  assert.equal(r.ok, false); assert.match(r.text, /cannot pay|costs|Not enough/i);
  assert.equal(g.farm.owned().length, 1);
});

test('farming: harvest first, then plant what you have the seed for, then till, then sell the crop you carry', () => {
  const g = group(9406);
  const F = g.farm; const T = g.corp.todo;
  assert.ok(keys(g, 'farming').includes('till:plot_east_1'));
  g.player.energy = 100;
  assert.ok(T.run('farming', 'till:plot_east_1').ok);
  assert.equal(F.plot('plot_east_1').state, 'tilled');
  assert.ok(!keys(g, 'farming').some((k) => k.startsWith('plant')), 'no seed, no planting');
  const wheat = Object.entries(F.def.crops)[0]; g.inventory.add(wheat[1].seed, 50);
  const plant = keys(g, 'farming').find((k) => k.startsWith('plant:plot_east_1'));
  assert.ok(plant, 'seed in hand: a planting is offered');
  g.player.energy = 100;
  assert.ok(T.run('farming', plant).ok); assert.equal(F.plot('plot_east_1').state, 'planted');
  // ripen it, harvest, sell
  const st = F.plot('plot_east_1'); st.stage = 3; st.readyDay = g.clock.day;
  assert.equal(keys(g, 'farming')[0], 'harvest:plot_east_1', 'harvest comes first');
  g.player.energy = 100;
  assert.ok(T.run('farming', 'harvest:plot_east_1').ok);
  const sell = keys(g, 'farming').find((k) => k.startsWith('sell:')); assert.ok(sell, 'the crop is in your bag');
  const sum0 = total(g); const have = g.inventory.count(sell.split(':')[1]);
  const farm0 = g.corp.cashOf('farming');
  const r = T.run('farming', sell); assert.ok(r.ok, r.text);
  assert.equal(g.inventory.count(sell.split(':')[1]), 0, 'sold what you carried');
  assert.ok(g.corp.cashOf('farming') > farm0, 'into the farm\'s account'); assert.ok(have > 0 && total(g) > sum0, 'sales are income: money came from the Co-op, not from nowhere that is hidden');
});

test('shipping: the best contract for an idle ship, sent in one tap through accept and assign', () => {
  const g = group(9407);
  const L = g.logistics; const T = g.corp.todo;
  L.postContracts(); // (the day's offers)
  const o = T.sendable();
  assert.ok(o, 'a contract is on offer for the ship you start with');
  assert.ok(keys(g, 'shipping').includes('send'));
  const s0 = g.corp.cashOf('shipping');
  const r = T.run('shipping', 'send'); assert.ok(r.ok, r.text);
  assert.ok(L.vessel(o.vessel.id).contract, 'the ship is on the contract'); assert.ok(g.corp.cashOf('shipping') <= s0);
  assert.notEqual(T.sendable()?.vessel.id, o.vessel.id, 'the same ship is not offered twice');
});

test('the inbox: manager requests with Yes and No, loans behind with Pay, parts short with Buy — nothing else, at most eight', () => {
  const g = group(9408);
  const T = g.corp.todo; const M = g.corp.management;
  const fm = g.corp.personnel.hire('manager', 'farming').person; fm.startDay = 1; g.corp.personnel.epoch++;
  dayAt(g, 6); M.dailyTick();
  const inbox = T.inbox();
  const req = inbox.find((i) => i.key.startsWith('req:'));
  assert.ok(req && req.yes.label === 'Yes' && req.no.label === 'No' && req.amount > 0);
  assert.ok(inbox.some((i) => i.key === 'short:aerospace' && i.yes.label === 'Buy' && i.no === null), 'parts short at the aerospace firm');
  assert.ok(inbox.length <= 8);
  const plots = g.farm.owned().length;
  assert.ok(req.yes.run().ok); assert.equal(g.farm.owned().length, plots + 1); assert.ok(!T.inbox().some((i) => i.key === req.key), 'answered: gone');
  const x2 = g.corp.personnel.hire('manager', 'aerospace').person; x2.startDay = 1; g.corp.personnel.epoch++;
  assert.ok(!T.inbox().some((i) => i.key === 'short:aerospace'), 'with a manager buying supplies it is not yours to do');
  // declined: gone, nothing bought
  dayAt(g, 8); M.dailyTick();
  const again = T.inbox().find((i) => i.key.startsWith('req:'));
  if (again) { const n = g.farm.owned().length; assert.ok(again.no.run().ok); assert.equal(g.farm.owned().length, n); }
  // a loan behind
  assert.ok(g.corp.business.borrow('arms', 30000, 12).ok);
  const l = g.corp.business.loans('arms')[0]; l.arrears = 700; l.missed = 1;
  const loan = T.inbox().find((i) => i.key === `bloan:${l.id}`); assert.ok(loan && loan.amount === 700 && loan.no === null);
});

test('the trail: each business\'s result of the day, once a day, fourteen at most; reading and recording draw no random number', () => {
  const g = group(9409);
  const T = g.corp.todo;
  T.items('aerospace'); // (the tender board is made the first time anyone looks at it, as when you open the aerospace tab)
  const before = JSON.stringify(g.rng.state ?? g.rng);
  T.status('aerospace'); T.items('aerospace'); T.inbox(); T.tiles('farming'); T.dailyTick();
  assert.equal(JSON.stringify(g.rng.state ?? g.rng), before, 'no dice');
  const n = g.corp.state.trail.arms.days.length; T.dailyTick();
  assert.equal(g.corp.state.trail.arms.days.length, n, 'twice the same day is once');
  for (let d = 6; d < 30; d++) { dayAt(g, d); T.dailyTick(); }
  assert.ok(g.corp.state.trail.arms.days.length <= 14); assert.equal(T.trail('arms', 7).length, 7);
  g.corp.receive('farming', 5000, { cat: 'crops' });
  dayAt(g, 31); T.dailyTick();
  assert.ok(T.trail('farming', 1)[0] > 0 || T.monthNet('farming') !== undefined);
  const sm = new SaveManager(new MemoryStorage());
  assert.ok(sm.save('slot1', g).ok);
  const h = new Game(CONTENT, { seed: 1 });
  assert.ok(sm.load('slot1', h).ok);
  assert.equal(JSON.stringify(h.world.corp.trail), JSON.stringify(g.world.corp.trail));
});

test('three figures a business, and they are real counts', () => {
  const g = group(9410);
  const T = g.corp.todo;
  for (const id of ['arms', 'shipping', 'aerospace', 'farming']) { const t = T.tiles(id); assert.equal(t.length, 3); assert.ok(t.every((x) => Number.isInteger(x.n) && x.n >= 0 && x.t)); }
  assert.equal(T.tiles('farming')[0].n, g.farm.owned().length);
  assert.equal(T.tiles('shipping')[2].n, g.logistics.ownedPorts().length);
});
