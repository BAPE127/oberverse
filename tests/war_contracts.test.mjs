// Early contracts (v0.99.0 stage 6): a new company, with guards and pistols and nothing heavy, completes a job; pay arrives only at the end and only in the company's account; failure is owed, never taken from you.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, build, STAGE1, cageGoods, days } from './war_helpers.mjs';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Game, CONTENT } from './helpers.mjs';
import { CLIENTS, KINDS, RISK, CONTRACTS as K } from '../src/content/contracts.js';
import { PEOPLE } from '../src/content/production.js';
import { outcome } from '../src/war/contracts.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
/** A small firm: stage 1 built, `guards` hired, `pistols` moved from an Arms works, a radio bought. */
function firm(seed, { guards = 4, pistols = 6, radio = 1 } = {}) {
  const g = warGame(seed, { cash: 800_000 }); build(g, STAGE1);
  for (let i = 0; i < guards; i++) assert.ok(g.war.hire('guard').ok);
  cageGoods(g, 'aw1', { item_pistol: pistols });
  if (pistols) assert.ok(g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: pistols }).ok);
  if (radio) assert.ok(g.war.buySupply('radio', radio).ok);
  return g;
}
/** Run days until an offer appears (offers are by hash, so it is the same every run of a seed). */
function untilOffer(g, max = 60) { for (let i = 0; i < max; i++) { days(g, 1); const o = g.war.contracts().open; if (o.length) return o[0]; } return null; }

test('the content: every client and kind is on the list, the pay beats the wage, and nothing asks for a tank, a helicopter or a loadout', () => {
  assert.ok(Object.keys(CLIENTS).length >= 5);
  for (const [id, k] of Object.entries(KINDS)) {
    for (const c of k.clients) assert.ok(CLIENTS[c], `${id}: client ${c}`);
    for (const r of k.risk) assert.ok(RISK[r], `${id}: risk ${r}`);
    assert.ok(!/tank|helicopter|loadout|vehicle/i.test(JSON.stringify(k)), `${id} asks for nothing heavy`);
  }
  for (const r of Object.values(RISK)) assert.ok(r.rate > PEOPLE.guard.wage * 2, 'a guard-day pays well over a guard\'s wage');
});

test('offers turn up by hash, expire with a reason, and are the same every time for the same game; a company with no licence or no company has none', () => {
  const a = firm(501); const b = firm(501);
  const oa = untilOffer(a); const ob = untilOffer(b);
  assert.ok(oa, 'an offer turns up'); assert.deepEqual([oa.title, oa.pay, oa.guards, oa.risk], [ob.title, ob.pay, ob.guards, ob.risk]);
  assert.ok(oa.pay > 0 && oa.guards >= 2 && oa.expires > oa.offered);
  const quiet = warGame(502); const q = quiet.war.contracts(); assert.ok(q); const fresh = quiet.war.state(); fresh.company.licensed = false; days(quiet, 30); assert.equal(quiet.war.contracts().open.length, 0, 'no licence, no offers');
  const nobody = warGame(509); nobody.war.state().company = null; assert.equal(nobody.war.contracts(), null); days(nobody, 5);
  const none = firm(503); days(none, 40);
  for (const c of none.war.contracts().done) if (c.state === 'expired') assert.match(c.why, /hired someone else/);
  assert.ok(none.war.contracts().open.length <= K.maxOpen);
});

test('a new firm with guards and pistols and nothing heavy takes a job and completes it: the kit is reserved and comes back, the pay arrives at the end into the company\'s account and never your wallet', () => {
  const g = firm(504); const w0 = g.player.money;
  let o = untilOffer(g); assert.ok(o);
  while (o.guards > 4) { g.war.decline(o.id); o = untilOffer(g); assert.ok(o); }
  const stock0 = JSON.stringify(g.war.stock()); const cash0 = g.war.cash();
  assert.deepEqual(o.lacks, [], 'it can take it');
  const r = g.war.accept(o.id); assert.ok(r.ok, r.text);
  const act = g.war.contracts().active[0]; assert.equal(act.state, 'active');
  assert.equal(g.war.people().filter((p) => p.post === `contract:${act.id}`).length, o.guards);
  assert.equal(g.war.stock()['arms:aw1:item_pistol'], 6 - o.guards, 'the pistols are with the guards');
  assert.ok(!g.war.stock()['supply:radio']);
  assert.ok(!g.war.dismiss(g.war.people().find((p) => p.post).id).ok, 'a guard on a post cannot be let go');
  assert.ok(!g.war.accept(o.id).ok, 'only once');
  const wages = g.war.people().length * PEOPLE.guard.wage;
  for (let i = 0; i < act.daysLeft - 1; i++) days(g, 1);
  assert.equal(g.war.contracts().active.length, 1, 'not paid before the last day'); assert.ok(g.war.cash() < cash0, 'only wages so far');
  days(g, 1);
  const fin = g.war.contracts().done[0];
  assert.ok(['done', 'failed'].includes(fin.state), fin.state);
  assert.equal(g.war.stock()['arms:aw1:item_pistol'], 6 - o.guards, 'the guards keep their pistols (v0.100.0: a guard carries their own)'); assert.equal(g.war.people().filter((p) => p.weapon === 'arms:aw1:item_pistol').length, o.guards); assert.equal(g.war.stock()['supply:radio'], 1);
  assert.deepEqual(g.war.people().filter((p) => p.post), []);
  assert.equal(g.player.money, w0, 'your wallet never moved');
  if (fin.state === 'done') assert.equal(g.war.cash(), cash0 + o.pay - wages * o.days, 'the pay, less the days\' wages');
  else assert.ok(g.war.cash() + g.corp.account('security').arrears <= cash0 - wages * o.days, 'a failure costs'); 
  assert.equal(JSON.stringify(Object.keys(g.war.stock()).sort()), JSON.stringify(Object.keys(JSON.parse(stock0)).sort()));
  assert.deepEqual(g.war.check(), []); assert.ok(g.corp.reconciles());
});

test('a job the firm cannot staff or equip is refused and says what is missing; nothing changes', () => {
  const g = firm(505, { guards: 1, pistols: 1, radio: 0 });
  const o = untilOffer(g); assert.ok(o);
  const before = JSON.stringify(g.world.military);
  const r = g.war.accept(o.id); assert.ok(!r.ok); assert.match(r.text, /Your forces do not meet this one/); assert.match(r.text, /a radio/); assert.match(r.text, /guard/);
  assert.equal(JSON.stringify(g.world.military), before);
  assert.ok(g.war.contracts().open[0].lacks.length >= 2);
});

test('a failure costs money that is owed (arrears, never your wallet), reputation and the client for a while; a win raises the name', () => {
  // the outcome is a hash of the game and the job, so the test picks a job number that wins and one that loses
  const run = (win) => {
    const g = firm(win ? 510 : 511, { guards: 4, pistols: 4 }); const w0 = g.player.money;
    let o = untilOffer(g); while (o.guards > 4) { g.war.decline(o.id); o = untilOffer(g); }
    const c = g.war.state().company.contracts.find((x) => x.id === o.id);
    for (let i = 0; i < 500; i++) { c.id = `Kt${i}`; if (outcome(g, c) === win) break; }
    assert.equal(outcome(g, c), win);
    const rep0 = g.war.contracts().reputation; const arrears0 = g.corp.account('security').arrears;
    assert.ok(g.war.accept(c.id).ok); days(g, c.days);
    const fin = g.war.contracts().done.find((x) => x.id === c.id); assert.equal(g.player.money, w0, 'never your wallet');
    return { g, fin, o, rep0, arrears0 };
  };
  const lost = run(false); const V = lost.g.war.contracts();
  assert.equal(lost.fin.state, 'failed'); assert.ok(V.reputation < lost.rep0); assert.equal(lost.fin.fine, Math.round(lost.o.pay * K.penalty));
  assert.ok(V.clients.find((c) => c.name === lost.o.client).banned, 'the client will not call for a while');
  const acct = lost.g.corp.account('security'); assert.ok(acct.cash >= 0 && acct.arrears >= 0); assert.ok(lost.g.corp.reconciles());
  const won = run(true); const W = won.g.war.contracts();
  assert.equal(won.fin.state, 'done'); assert.ok(W.reputation > won.rep0); assert.equal(W.wins, 1);
});

test('reputation raises how many offers can be open; a save in the middle of a job carries on; the record of finished jobs is capped', () => {
  const g = firm(506); const C = g.war.state().company;
  C.rep = { score: 45, done: 15, failed: 0, clients: {}, ban: {} };
  assert.equal(g.war.contracts().maxOpen, Math.min(K.maxOpen, K.open + 3));
  let o = untilOffer(g); assert.ok(o);
  while (o.guards > 4) { g.war.decline(o.id); o = untilOffer(g); }
  assert.ok(g.war.accept(o.id).ok);
  const g2 = roundtrip(g); assert.equal(g2.war.contracts().active.length, 1);
  days(g2, o.days + 1); assert.equal(g2.war.contracts().active.length, 0);
  for (let i = 0; i < 40; i++) C.contracts.push({ id: `Kx${i}`, state: 'done', title: 'old', ended: 1 });
  days(g, 1); assert.ok(g.war.state().company.contracts.filter((c) => !['open', 'active'].includes(c.state)).length <= K.kept + 1);
});

test('a long run stays small, consistent and honest: 300 days of a working firm leave the record bounded, the checker silent, the account reconciled and the wallet untouched; an older company\'s unfunded account is mended', () => {
  const g = warGame(520, { cash: 6_000_000 }); build(g, STAGE1);
  for (let i = 0; i < 6; i++) g.war.hire('guard');
  cageGoods(g, 'aw1', { item_pistol: 60 }); g.war.transfer({ source: 'arms', works: 'aw1', item: 'item_pistol', qty: 40 }); g.war.buySupply('radio', 20);
  const w0 = g.player.money; let sizeAt100 = 0;
  for (let d = 1; d <= 300; d++) {
    days(g, 1);
    for (const o of g.war.contracts().open) if (!o.lacks.length && o.guards <= 6) { g.war.accept(o.id); break; }
    if (d === 100) sizeAt100 = JSON.stringify(g.world.military).length;
    if (d % 50 === 0) { assert.deepEqual(g.war.check(), [], `day ${d}`); assert.ok(g.corp.reconciles()); }
    if (g.war.cash() < 20_000) { g.player.money += 100_000; g.war.fund(100_000); }
  }
  const w1 = g.player.money; const size = JSON.stringify(g.world.military).length;
  assert.ok(size < sizeAt100 * 1.4 && size < 60_000, `the record is ${size} bytes (${sizeAt100} at day 100)`);
  assert.ok(g.war.contracts().wins + g.war.contracts().losses >= 10, 'it worked a good many jobs');
  assert.equal((g.war.stock()['arms:aw1:item_pistol'] || 0) + g.war.people().filter((p) => p.weapon === 'arms:aw1:item_pistol').length, 40, 'every pistol is either in the stores or in a guard\'s hand');
  assert.ok(g.war.transfers().length <= 80);
  // an older save's account
  const old = warGame(521); old.corp.account('security').funded = false; old.war.dailyTick(); days(old, 1); assert.ok(old.corp.account('security').funded);
  assert.ok(w1 >= w0, 'the wallet only ever went up here: by what the test paid in, never down');
});
