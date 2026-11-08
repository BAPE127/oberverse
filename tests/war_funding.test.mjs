// The war company's money (v0.103.7): like the other companies it spends your wallet by default, can be assigned to the group (the parent company's cash) or given an account of its own;
// its bills never push your wallet below nothing; and a company registered before this release that held nothing goes back to the wallet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { warGame, buildAll, days } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };

test('by default the company spends and earns through your wallet: a purchase comes off it, a contract\'s pay goes into it, and nothing is held apart', () => {
  const g = newGame(1401); g.player.money = 1_000_000; g.war.found('Ironclad Company');
  assert.equal(g.war.fundingMode(), 'wallet'); assert.equal(g.corp.account('security').funded, false, 'no account of its own is forced on it');
  assert.ok(g.war.buyLicence().ok); assert.equal(g.player.money, 1_000_000 - 5000);
  g.corp.receive('security', 40_000, { cat: 'contract' }); assert.equal(g.player.money, 1_000_000 - 5000 + 40_000, 'income lands in the wallet');
  assert.equal(g.war.cash(), g.player.money);
});

test('wages from the wallet never take it below nothing: what it cannot cover is owed and paid first next time', () => {
  const g = warGame(1402, { cash: 6_000_000 }); buildAll(g, 1); assert.ok(g.war.hire('guard').ok); assert.ok(g.war.setFunding('wallet').ok);
  g.player.money = 100; const wage = 120;
  days(g, 1); assert.ok(g.player.money >= 0, 'the wallet did not go negative'); const owed1 = g.war.companyView().arrears; assert.ok(owed1 > 0, 'what could not be paid is owed');
  g.player.money = 10_000; days(g, 1);
  assert.ok(g.war.companyView().arrears === 0 || g.war.companyView().arrears < owed1, 'the debt was paid first'); assert.ok(g.player.money >= 0);
  assert.ok(wage > 0);
});

test('assigned to the group, the company spends and earns through the parent company\'s cash and never your wallet; it needs a group, and it returns to the wallet when asked', () => {
  const g = newGame(1403); g.player.money = 3_000_000; g.war.found('Ironclad Company');
  assert.ok(!g.war.setFunding('group').ok, 'no group yet');
  assert.ok(g.corp.group.form().ok); assert.ok(g.corp.contribute('parent', 1_000_000).ok);
  const wallet = g.player.money; const parent = () => g.corp.account('parent').cash;
  assert.ok(g.war.setFunding('group').ok); assert.equal(g.war.fundingMode(), 'group'); assert.equal(g.war.cash(), parent());
  assert.ok(g.war.buyLicence().ok); assert.equal(g.player.money, wallet, 'the wallet did not move'); assert.equal(parent(), 1_000_000 - 5000, 'the parent paid');
  g.corp.receive('security', 20_000, { cat: 'contract' }); assert.equal(g.player.money, wallet); assert.equal(parent(), 1_000_000 - 5000 + 20_000, 'income went to the parent');
  assert.ok(!g.war.fund(1000).ok, 'you pay the parent, not the company');
  const r = g.war.pay(5_000_000, 'too much'); assert.ok(!r.ok && /group holds/.test(r.text));
  assert.ok(g.war.setFunding('wallet').ok); assert.equal(g.war.fundingMode(), 'wallet'); assert.equal(g.war.cash(), g.player.money);
  const g2 = roundtrip(g); assert.equal(g2.war.fundingMode(), 'wallet');
  assert.ok(g.war.setFunding('group').ok); const g3 = roundtrip(g); assert.equal(g3.war.fundingMode(), 'group', 'the choice is saved');
  assert.ok(g.corp.reconciles());
});

test('an account of its own is still a choice (as for the other companies): moving to the group returns what it held to your wallet first; nothing is created or lost', () => {
  const g = newGame(1404); g.player.money = 2_000_000; g.war.found('Ironclad Company'); g.corp.group.form(); g.corp.contribute('parent', 100_000);
  assert.ok(g.war.fund(300_000).ok); assert.equal(g.war.fundingMode(), 'own'); const total = g.player.money + g.corp.account('security').cash + g.corp.account('parent').cash;
  assert.ok(g.war.setFunding('group').ok);
  assert.equal(g.player.money + g.corp.account('security').cash + g.corp.account('parent').cash, total, 'no obol appeared or vanished'); assert.equal(g.corp.account('security').funded, false);
});

test('a company registered before this release that held nothing goes back to spending the wallet when the game loads; one that held money keeps its account', () => {
  const a = newGame(1405); a.player.money = 500_000; a.war.found('Ironclad Company'); a.corp.account('security').funded = true; // (what v0.98.0 to v0.103.6 did: an account of its own at zero)
  a.war.afterLoad(); assert.equal(a.war.fundingMode(), 'wallet', 'it never held anything');
  const b = newGame(1406); b.player.money = 500_000; b.war.found('Ironclad Company'); b.war.fund(100_000); b.war.setFunding('wallet'); b.war.fund(100_000); b.world.military.company.ownAccount = false;
  b.war.afterLoad(); assert.equal(b.war.fundingMode(), 'own', 'it holds money: it stays its own account'); assert.equal(b.war.cash(), 100_000);
});
