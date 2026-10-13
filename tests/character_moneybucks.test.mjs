// Sir Moneybucks (imported character) and Ober's Oil: status tiers, schedule,
// invitation, refinery shifts, investing, the Ledger, the strike, the mystery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, setTime, CONTENT, Game, TILE } from './helpers.mjs';
import { DialogueSession } from '../src/dialogue/dialogueEngine.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { Rng } from '../src/core/rng.js';
import { newLedgerMatch, playLedgerRound, ledgerWinner } from '../src/systems/ledgerGame.js';

const talk = (g, id, ...choices) => {
  const s = new DialogueSession(g, id);
  let node = s.start();
  for (const c of choices) node = s.choose(c);
  return { s, node };
};
const text = (node) => node.pages.join(' ');
const ids = (node) => node.options.map((o) => o.id);

test('he treats you according to your wealth and standing', () => {
  const poor = newGame();
  assert.match(text(talk(poor, 'npc_moneybucks').node), /Who let THAT in/);
  assert.match(text(talk(poor, 'npc_moneybucks').node), /Poverty|Do I know you|already own it/);
  const rich = newGame();
  rich.player.money = 200;
  assert.match(text(talk(rich, 'npc_moneybucks').node), /money behind it/);
  assert.match(text(talk(rich, 'npc_moneybucks').node), /person of means|expensively|show promise/);
  // "Sir Moneybucks" and "my good fellow" are his voice
  const { s } = talk(rich, 'npc_moneybucks');
  assert.match(text(s.choose('topic:t_mb_who')), /Sir Richard E\. Moneybucks/);
  assert.equal(CONTENT.characters.npc_moneybucks.shortName, 'Sir Moneybucks');
  assert.ok(CONTENT.characters.npc_moneybucks.appearance.portrait.startsWith('data:image/jpeg;base64,'), 'portrait embedded from the supplied image');
});

test('poor players cannot invest; people of business can', () => {
  const g = newGame();
  let { node } = talk(g, 'npc_moneybucks');
  assert.ok(ids(node).includes('topic:t_mb_invest_poor') && !ids(node).includes('topic:t_mb_invest'));
  g.player.money = 60;
  const r = talk(g, 'npc_moneybucks', 'topic:t_mb_invest').node;
  assert.equal(r.action?.type, 'invest');
});

test('his schedule spans the manor, the fields and Lanternside', () => {
  const g = newGame(3);
  const where = (hhmm) => { setTime(g, 1, hhmm); run(g, 1); const n = g.npcs.get('npc_moneybucks'); return `${n.map}/${n.activity}`; };
  assert.equal(where('09:00'), 'manor/work');
  assert.equal(where('10:45'), 'ober_fields/patrol');
  assert.equal(where('14:30'), 'lanternside/business');
  assert.equal(where('23:00'), 'manor/sleep');
  assert.equal(g.warnings.length, 0);
});

test('all eighteen residents live out a full day across every map without errors', () => {
  const g = newGame(21);
  run(g, 1440, 1);
  assert.equal(g.npcs.size, Object.keys(CONTENT.characters).length);
  assert.deepEqual(g.warnings, []);
  setTime(g, 2, '10:30');
  run(g, 1);
  const at = Object.fromEntries([...g.npcs.values()].map((n) => [n.id, n.map]));
  assert.equal(at.npc_gideon, 'refinery');
  assert.equal(at.npc_agnes, 'manor');
  assert.equal(at.npc_silas, 'ober_fields');
  assert.equal(at.npc_hank, 'ober_fields');
});

test('the manor admits callers only by invitation — earned, or tipped', () => {
  const g = newGame();
  setTime(g, 1, '10:00');
  const door = g.maps.get('ober_fields').doors.find((d) => d.id === 'door_b_manor');
  assert.ok(!g.playerCanPass(door));
  assert.match(g.doorLockReason(door, () => false), /invitation/);
  let { node } = talk(g, 'npc_crisp', 'topic:t_crisp_invite');
  assert.ok(node.options.find((o) => o.id === 'choice:c_crisp_business').disabled, 'a nobody is turned away');
  g.player.money = 50;
  talk(g, 'npc_crisp', 'topic:t_crisp_invite', 'choice:c_crisp_business');
  assert.ok(g.playerCanPass(door));
  setTime(g, 1, '23:00');
  assert.ok(!g.playerCanPass(door), 'invited callers still respect house hours');
  const g2 = newGame();
  g2.player.money = 15;
  talk(g2, 'npc_crisp', 'topic:t_crisp_invite', 'choice:c_crisp_tip');
  assert.ok(g2.getFlag('manor_invited'));
  assert.equal(g2.player.money, 5);
});

test('a refinery shift pays wages; cutting corners pays more and raises risk', () => {
  for (const mode of ['proper', 'corners']) {
    const g = newGame(9);
    setTime(g, 1, '07:00');
    talk(g, 'npc_gideon', 'topic:t_gideon_job');
    assert.equal(g.quests.state('job_refinery_shift').stage, 'work');
    g.changeMap('refinery', 'entry');
    for (const id of ['ref_valves', 'ref_gauges', 'ref_barrels']) {
      const prompt = g.interact({ kind: 'prop', id });
      assert.equal(prompt.type, 'choices');
      g.oil.work(id, mode);
    }
    assert.equal(g.quests.state('job_refinery_shift').stage, 'report');
    const before = g.player.money;
    talk(g, 'npc_gideon', 'topic:t_gideon_report');
    assert.equal(g.quests.state('job_refinery_shift').state, 'completed');
    assert.equal(g.player.money - before, mode === 'proper' ? 5 : 11);
    assert.equal(g.oil.state.risk, mode === 'proper' ? 0 : 3);
    assert.ok(g.getFlag('refinery_hired'));
  }
});

test('investing pays dividends from real output; projects change the world', () => {
  const g = newGame();
  g.player.money = 500;
  assert.ok(g.oil.buyShares(5).ok);
  setTime(g, 1, '17:58');
  const before = g.player.money;
  run(g, 3);
  assert.equal(g.player.money - before, 5, '5 shares × 100 barrels / 100');
  assert.ok(g.oil.fundProject('derrick').ok);
  assert.equal(g.oil.state.derricks, 1);
  assert.equal(g.oil.state.sharesOwned, 8);
  assert.equal(g.oil.computeOutput(), 120);
  assert.ok(g.player.reputation.fac_oil > 0);
  g.oil.state.strike = true;
  assert.equal(g.oil.computeOutput(), 0, 'strikes stop output');
  assert.ok(g.oil.fundProject('pipeline').ok);
  g.events.consider(g.content.events.ev_canal_slick, { forced: true });
  assert.ok(g.getFlag('canal_slick'));
  assert.ok(g.knowledge.knows(g.npcs.get('npc_osric'), 'fact_canal_slick'));
  assert.ok(g.player.reputation.lanternside < 0, 'funding the pipeline costs local standing');
});

test('The Ledger: rules, stakes, etiquette', () => {
  const m = newLedgerMatch(new Rng(4), { wits: 2 });
  assert.equal(m.playerHand.length, 3);
  assert.equal(m.houseHand.length, 3, 'he has led one of his four');
  while (!m.finished) playLedgerRound(m, m.playerHand[0], new Rng(1));
  assert.ok(['player', 'house'].includes(ledgerWinner(m)));
  // in the game
  const g = newGame();
  g.player.money = 100;
  setTime(g, 1, '16:00');
  g.setFlag('manor_invited', true);
  let { node } = talk(g, 'npc_moneybucks', 'topic:t_mb_challenge');
  assert.ok(node.options.find((o) => o.id === 'choice:c_ledger_accept').disabled, 'only at his card table');
  g.changeMap('manor', 'entry');
  node = talk(g, 'npc_moneybucks', 'topic:t_mb_challenge', 'choice:c_ledger_accept').node;
  assert.equal(node.action?.type, 'ledger');
  assert.ok(g.startLedger().ok);
  assert.equal(g.player.money, 80);
  while (!g.ledger.finished) g.playLedger(g.ledger.playerHand.at(-1));
  const res = g.finishLedger();
  assert.equal(g.player.money, res.won ? 120 : 80);
  // rudeness forfeits for the day
  const g2 = newGame();
  g2.player.money = 100;
  talk(g2, 'npc_moneybucks', 'topic:t_mb_challenge', 'choice:c_ledger_rude');
  assert.equal(g2.moodOf(g2.npcs.get('npc_moneybucks')), 'affronted');
  assert.ok(!ids(talk(g2, 'npc_moneybucks').node).includes('topic:t_mb_challenge'));
});

test('low morale brings a strike: pickets form, output stops, and it can end two ways', () => {
  const base = () => {
    const g = newGame(5);
    setTime(g, 1, '09:00');
    g.oil.state.morale = 10;
    g.events.consider(g.content.events.ev_strike_begins, { forced: true });
    return g;
  };
  const g = base();
  assert.ok(g.oil.state.strike && g.getFlag('refinery_strike'));
  assert.ok(g.knowledge.knows(g.npcs.get('npc_moneybucks'), 'fact_refinery_strike'));
  g.settleNpcs();
  assert.equal(g.npcs.get('npc_ruby').activity, 'picket');
  assert.match(g.npcs.get('npc_ruby').intent.spot, /picket/);
  // Way 1: persuade him to pay (needs standing — and for his temper to cool first)
  assert.equal(g.moodOf(g.npcs.get('npc_moneybucks')), 'affronted');
  run(g, 250, 1);
  assert.ok(g.oil.state.strike, 'the strike holds until someone resolves it');
  g.oil.state.sharesOwned = 12;
  let paid = false;
  for (let i = 0; i < 20 && !paid; i++) {
    talk(g, 'npc_moneybucks', 'topic:t_mb_strike', 'choice:c_strike_wages');
    paid = !g.oil.state.strike;
  }
  assert.ok(paid);
  assert.equal(g.oil.state.wageLevel, 2);
  // Way 2: break it
  const g2 = base();
  talk(g2, 'npc_moneybucks', 'topic:t_mb_strike', 'choice:c_strike_break');
  assert.ok(!g2.oil.state.strike);
  assert.ok(g2.npcs.get('npc_otto').relationships.player.trust < 0);
  assert.equal(g2.npcs.get('npc_silas').intent.source, 'errand');
  assert.ok(g2.player.reputation.fac_quay < 0);
});

function mysteryReady(seed = 2) {
  const g = newGame(seed);
  setTime(g, 1, '10:00');
  g.quests.start('q_dark_lamp');
  g.knowledge.learn(g.player, 'fact_keeper_log', { kind: 'fact', at: 0 });
  talk(g, 'npc_osric').s.ask('the seal');
  assert.ok(g.knowledge.knows(g.player, 'fact_harbourmaster_seal'));
  assert.equal(g.quests.state('q_seal_of_m').state, 'active');
  const agnes = g.npcs.get('npc_agnes');
  g.relationships.adjust(agnes, 'player', { trust: 40, affection: 30 });
  for (let i = 0; i < 30 && !g.knowledge.knows(g.player, 'fact_moneybucks_bought_seal'); i++) {
    g.world.flags.agnes_refused_today = 0;
    talk(g, 'npc_agnes', 'topic:t_agnes_m', 'choice:c_agnes_truth');
  }
  assert.ok(g.knowledge.knows(g.player, 'fact_moneybucks_bought_seal'));
  assert.ok(g.knowledge.knows(g.player, 'fact_lens_in_vault'));
  assert.equal(g.inventory.count('item_ledger_page'), 1);
  assert.equal(g.quests.state('q_seal_of_m').stage, 'decide');
  return g;
}

test('The Seal of M.: exposing him through Osric relights the lighthouse next morning', () => {
  const g = mysteryReady();
  talk(g, 'npc_osric', 'topic:t_osric_expose');
  assert.equal(g.quests.state('q_seal_of_m').outcome, 'exposed');
  assert.ok(g.getFlag('lens_requisitioned'));
  assert.ok(g.knowledge.knows(g.npcs.get('npc_moneybucks'), 'fact_player_exposed_moneybucks'));
  assert.ok(g.npcs.get('npc_moneybucks').relationships.player.trust < -40);
  assert.ok(g.oil.state.scandalDays > 0);
  setTime(g, 2, '09:58');
  run(g, 4);
  assert.ok(g.getFlag('lighthouse_relit'));
  assert.equal(g.world.containers.ct_manor_vault.items.item_great_lens, 0);
});

test('The Seal of M.: steal the lens and restore it yourself', () => {
  const g = mysteryReady();
  talk(g, 'npc_agnes', 'topic:t_agnes_vault');
  assert.equal(g.inventory.count('item_vault_key'), 1);
  g.setFlag('manor_invited', true);
  setTime(g, 1, '14:30'); // Sir Moneybucks is at the Quay; Agnes is at her desk
  g.changeMap('manor', 'entry');
  g.player.x = 18.5 * TILE; g.player.y = 2.5 * TILE; // beside the vault
  const r = g.interact({ kind: 'prop', id: 'study_vault' });
  assert.equal(r.type, 'container');
  const taken = g.takeFromContainer('ct_manor_vault', 'item_great_lens');
  assert.ok(taken.ok && taken.stolen);
  assert.ok(g.knowledge.knows(g.npcs.get('npc_agnes'), 'fact_player_stole_lens'), 'Agnes saw it — witnesses still count');
  g.changeMap('lighthouse', 'entry');
  const res = g.interact({ kind: 'prop', id: 'lh_mechanism' });
  assert.match(res.text, /Light pours out/);
  assert.ok(g.getFlag('lighthouse_relit'));
  assert.equal(g.quests.state('q_seal_of_m').outcome, 'restored');
});

test('The Seal of M.: blackmail or partnership', () => {
  const a = mysteryReady();
  talk(a, 'npc_moneybucks', 'topic:t_mb_confront', 'choice:c_mb_blackmail');
  assert.equal(a.quests.state('q_seal_of_m').outcome, 'blackmailed');
  assert.ok(a.player.money >= 150);
  const b = mysteryReady();
  talk(b, 'npc_moneybucks', 'topic:t_mb_confront', 'choice:c_mb_deal');
  assert.equal(b.quests.state('q_seal_of_m').outcome, 'bargained');
  assert.equal(b.oil.state.sharesOwned, 15);
  assert.ok(b.getFlag('manor_invited'));
});

test('the buyout: he goes after the Kettle & Crumb, and Mags hears of it', () => {
  const g = newGame(8);
  setTime(g, 2, '13:20');
  run(g, 100, 0.5);
  assert.ok(g.knowledge.knows(g.npcs.get('npc_mags'), 'fact_buyout_offer'));
  assert.ok(g.npcs.get('npc_mags').relationships.npc_moneybucks.affection <= -40);
});

test('Ober\'s Oil state and the new residents survive save/load; old saves gain them', () => {
  const g = newGame(4);
  g.player.money = 300;
  g.oil.buyShares(4);
  g.oil.fundProject('safety');
  g.setFlag('manor_invited', true);
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT);
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(g2.oil.state.sharesOwned, 5);
  assert.equal(g2.oil.state.safety, 1);
  assert.ok(g2.getFlag('manor_invited'));
  assert.equal(g2.npcs.size, Object.keys(CONTENT.characters).length);
  // a v0.1.0 save (before Ober's Oil existed)
  return import('node:fs').then(({ readFileSync }) => {
    const raw = readFileSync(new URL('./fixtures/save-schema1-v0.1.0.json', import.meta.url), 'utf8');
    const sm2 = new SaveManager(new MemoryStorage());
    sm2.importToSlot('slot1', raw);
    const g3 = new Game(CONTENT);
    assert.ok(sm2.load('slot1', g3).ok);
    assert.equal(g3.npcs.size, Object.keys(CONTENT.characters).length, 'imported characters join old saves');
    assert.equal(g3.oil.state.sharesOwned, 0);
    assert.equal(g3.player.reputation.fac_oil, 0);
    run(g3, 120);
    assert.deepEqual(g3.warnings, []);
  });
});
