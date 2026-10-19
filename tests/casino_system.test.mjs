// The Phonograph Grand as a place and a business (v0.52.0): the resort's maps and lifts, the cage,
// the books (every chip debited once, every round paid once), seats, the host, and what a save
// and a load can and can't do to a bet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, run } from './helpers.mjs';
import { Game } from '../src/game/game.js';
import { CONTENT } from '../src/content/index.js';
import { TILE } from '../src/core/util.js';

const FLOOR = 'phonograph_casino';
/** A new game at the cage with Octavius behind it (16:00–20:00), and some money. */
function atCasino(time = '17:00', money = 5000) {
  const g = newGame(11);
  setTime(g, 1, time);
  noImpulses(g);
  g.player.money = money;
  g.changeMap(FLOOR, 'cage_front');
  return g;
}
/** Sit at a table and let the host land. */
function sitAt(g, table) {
  const r = g.casino.sit(table);
  assert.ok(r.ok, r.text);
  for (let i = 0; i < 200 && !g.casino.hostReady; i++) g.update(0.05, { x: 0, y: 0 });
  assert.ok(g.casino.hostReady, 'the host arrives');
  return r;
}
const total = (g) => g.player.money + g.casino.chips; // one obol = one chip, so this never changes except by play

test('the Lucky Star is now the Phonograph Grand: a tower on Market Street with a lobby, a casino floor, staff and private floors', () => {
  const g = newGame(1);
  const hv = g.maps.get('halvermouth');
  const b = hv.def.buildings.find((x) => x.id === 'b_phonograph');
  assert.ok(b && b.tower === 42 && b.sign === 'THE PHONOGRAPH GRAND');
  assert.ok(!hv.def.buildings.some((x) => x.id === 'b_bar'), 'the old bar building is gone (its bar lives on in the lobby)');
  for (const id of ['phonograph_lobby', 'phonograph_casino', 'phonograph_security', 'phonograph_staff', 'phonograph_octavius', 'phonograph_spade']) assert.ok(g.maps.get(id), id);
  const lobby = g.maps.get('phonograph_lobby');
  assert.equal(lobby.width, b.w, 'the lobby fills its building');
  assert.equal(lobby.height, b.h);
  assert.ok(lobby.def.props.some((p) => p.id === 'pg_lounge_bar'), 'the Lucky Star Lounge');
  // every table on the floor has its prop, host place and seat
  const floor = g.maps.get(FLOOR);
  for (const [id, t] of Object.entries(CONTENT.casino.tables)) {
    assert.ok(floor.def.props.some((p) => p.id === t.prop && p.interact?.table === id), `${id} prop`);
    assert.ok(floor.spot(`host_${id}`) && floor.spot(`seat_${id}`), `${id} spots`);
    assert.ok(t.min > 0 && t.max >= t.min && t.seats > 0, `${id} limits`);
  }
});

test('the lift: the private floors are locked to you until you\'re invited; the residents\' lift doors are not yours', () => {
  const g = atCasino();
  const panel = g.liftPanel?.('phonograph') || null;
  const r = g.rideLift('phonograph', 'phonograph_octavius');
  assert.equal(r.ok, false);
  assert.match(r.text, /keycard/);
  assert.equal(g.player.map, FLOOR);
  g.setFlag('phonograph_key_penthouse', true);
  assert.equal(g.rideLift('phonograph', 'phonograph_octavius').ok, true);
  assert.equal(g.player.map, 'phonograph_octavius');
  // the NPC-only doors in front of the lifts
  g.changeMap(FLOOR, 'cage_front');
  const shaft = g.maps.get(FLOOR).def.doors.find((d) => d.npcOnly);
  assert.ok(shaft);
  assert.equal(g.useDoor(shaft), false);
  assert.ok(!g.interactables().some((x) => x.door === shaft || x.id === shaft.id));
  void panel;
});

test('the residents get home through the tower; strangers can\'t ride up to the penthouses', () => {
  const g = atCasino();
  const can = (id, from, to) => {
    const n = g.npcs.get(id);
    const maps = g.maps;
    const prev = new Set([from]);
    const q = [from];
    while (q.length) {
      const m = maps.get(q.shift());
      for (const d of m.doors) {
        const next = d.to?.map;
        if (!next || prev.has(next) || !g.npcCanPass(n, d)) continue;
        if (next === to) return true;
        prev.add(next);
        q.push(next);
      }
    }
    return false;
  };
  assert.ok(can('npc_morganius', 'phonograph_spade', 'halvermouth'));
  assert.ok(can('npc_morganius', 'halvermouth', 'phonograph_spade'));
  assert.ok(can('npc_octavius', 'halvermouth', 'phonograph_octavius'));
  assert.ok(can('npc_vera', 'phonograph_staff', 'phonograph_lobby'));
  assert.ok(can('npc_brock', 'phonograph_lobby', 'phonograph_security'));
  assert.ok(!can('npc_mags', 'halvermouth', 'phonograph_spade'), 'Mags can visit the casino, not Morganius\'s rooms');
  assert.ok(!can('npc_mags', 'halvermouth', 'phonograph_octavius'));
  assert.ok(can('npc_mags', 'halvermouth', FLOOR), 'but anyone can walk up to the casino');
});

test('their days: Octavius at the cage 16:00–20:00, Vera on her shifts, Morganius working the floor at night', () => {
  const g = atCasino('17:00');
  const o = g.npcs.get('npc_octavius');
  assert.equal(o.map, FLOOR);
  assert.equal(o.activity, 'cashier');
  assert.equal(g.casino.cashier()?.id, 'npc_octavius');
  setTime(g, 1, '11:00');
  assert.equal(g.casino.cashier()?.id, 'npc_vera');
  setTime(g, 1, '21:00');
  assert.equal(g.casino.cashier()?.id, 'npc_vera');
  const m = g.npcs.get('npc_morganius');
  assert.equal(m.map, FLOOR);
  assert.equal(m.activity, 'perform');
  setTime(g, 2, '05:00');
  assert.equal(g.casino.cashier(), null, 'the cage is shut 02:00–10:00');
  assert.equal(g.casino.exchange('buy', 50).ok, false);
});

test('the cage: one obol for one chip each way, a minimum, no overdraft, no cashing out at a table, every exchange in the ledger', () => {
  const g = atCasino('17:00', 300);
  const C = g.casino;
  assert.equal(C.exchange('buy', 3).ok, false, 'minimum purchase');
  assert.equal(C.exchange('buy', 301).ok, false, 'not more than you have');
  assert.equal(C.exchange('buy', 0).ok, false);
  assert.equal(C.exchange('buy', -5).ok, false);
  assert.ok(C.exchange('buy', 200).ok);
  assert.equal(g.player.money, 100);
  assert.equal(C.chips, 200);
  assert.equal(C.exchange('cash', 201).ok, false);
  assert.ok(C.exchange('cash', 50).ok);
  assert.equal(g.player.money, 150);
  assert.equal(C.chips, 150);
  assert.deepEqual(C.state.ledger.map((e) => [e.kind, e.amount]), [['buy', 200], ['cash', -50]]);
  assert.ok(new Set(C.state.ledger.map((e) => e.id)).size === 2, 'every transaction has its own id');
  sitAt(g, 'roulette_1');
  assert.equal(C.exchange('cash', 10).ok, false, 'leave the table first');
});

test('the books: a debit only takes chips you have; a round is paid exactly once', () => {
  const g = atCasino();
  const C = g.casino;
  C.exchange('buy', 100);
  assert.equal(C.debit(101, 'x'), false);
  assert.equal(C.debit(2.5, 'x'), false);
  assert.equal(C.chips, 100);
  assert.ok(C.debit(40, 'r1'));
  assert.ok(C.credit(80, 'r1'));
  assert.equal(C.credit(80, 'r1'), false, 'paid already');
  assert.equal(C.chips, 140);
});

test('seats: one table at a time, the minimum checked, a full table refused, Hold\'em not open yet; leaving gives the seat back', () => {
  const g = atCasino();
  const C = g.casino;
  g.changeMap('phonograph_lobby', 'entry');
  assert.equal(C.sit('roulette_1').ok, false, 'not from the lobby');
  g.changeMap(FLOOR, 'seat_roulette_1');
  assert.match(C.sit('roulette_1').text, /minimum/);
  C.exchange('buy', 1000);
  assert.match(C.sit('holdem_1').text, /Hold'em/);
  C.tableState('blackjack_1').occupants = ['a', 'b', 'c'];
  assert.match(C.sit('blackjack_1').text, /taken/);
  C.tableState('blackjack_1').occupants = [];
  const before = { x: g.player.x, y: g.player.y };
  sitAt(g, 'blackjack_1');
  assert.equal(C.freeSeats('blackjack_1'), 2);
  assert.equal(C.sit('roulette_1').ok, false, 'already sitting');
  const m = g.npcs.get('npc_morganius');
  assert.equal(m.intent?.source, 'casino');
  const at = g.maps.get(FLOOR).spotPx('host_blackjack_1');
  assert.ok(Math.hypot(m.x - at.x, m.y - at.y) < 2, 'Morganius flew to the table');
  C.leave();
  assert.equal(C.state.session, null);
  assert.equal(C.freeSeats('blackjack_1'), 3);
  assert.deepEqual({ x: g.player.x, y: g.player.y }, before);
  assert.notEqual(m.intent?.source, 'casino', 'and he goes back to his rounds');
});

test('the host: from anywhere he arrives at your table; skipping the flight lands him at once; first visits are longer', () => {
  const g = atCasino('11:30'); // Morganius is rehearsing up in his rooms
  const C = g.casino;
  C.exchange('buy', 100);
  const m = g.npcs.get('npc_morganius');
  assert.equal(m.map, 'phonograph_spade');
  C.sit('roulette_1');
  assert.equal(m.map, FLOOR, 'out of the air');
  assert.ok(C.arrival.dur > 1.5, 'the first arrival is the full show');
  C.skipArrival();
  g.update(0.05, { x: 0, y: 0 });
  assert.ok(C.hostReady);
  C.leave();
  C.sit('roulette_1');
  assert.ok(C.arrival.dur < 1.5, 'after that, a shorter entrance');
});

test('Morganius roams the floor between his favourite places, and stays on it', () => {
  const g = atCasino('20:00');
  const m = g.npcs.get('npc_morganius');
  const places = new Set();
  for (let i = 0; i < 24; i++) { run(g, 10); if (m.intent?.spot) places.add(m.intent.spot); assert.equal(m.map, FLOOR); }
  assert.ok(places.size >= 2, `he moved about: ${[...places].join(', ')}`);
  for (const p of places) assert.ok(p.startsWith(`${FLOOR}:m_`) || p === `${FLOOR}:m_stage`, p);
});

test('roulette: bets are taken once, the table limit holds, the spin pays exactly what the rules say, clearing gives back exactly what was bet', () => {
  const g = atCasino();
  const C = g.casino;
  C.exchange('buy', 1000);
  g.changeMap(FLOOR, 'seat_roulette_1');
  sitAt(g, 'roulette_1');
  const start = total(g);
  assert.ok(C.placeBet({ type: 'red', amount: 100 }).ok);
  assert.ok(C.placeBet({ type: 'red', amount: 50 }).ok);
  assert.equal(C.tableState('roulette_1').bets.length, 1, 'the same bet stacks');
  assert.equal(C.placeBet({ type: 'straight', value: 7, amount: 101 }).ok, false, 'over the 250 limit');
  assert.equal(C.placeBet({ type: 'straight', value: 37, amount: 5 }).ok, false);
  assert.equal(C.chips, 850);
  assert.equal(C.clearBets('roulette_1'), 150);
  assert.equal(C.chips, 1000);
  let won = 0;
  let lost = 0;
  for (let i = 0; i < 60; i++) {
    const before = C.chips;
    C.placeBet({ type: 'straight', value: 17, amount: 5 });
    C.placeBet({ type: 'dozen', value: 2, amount: 10 });
    const r = C.spin();
    assert.ok(r.ok);
    const expect = (r.n === 17 ? 5 * 36 : 0) + (r.n >= 13 && r.n <= 24 ? 30 : 0);
    assert.equal(r.returned, expect, `pocket ${r.n}`);
    assert.equal(C.chips, before - 15 + expect);
    if (expect) won++; else lost++;
  }
  assert.ok(won && lost);
  assert.equal(total(g), start - C.state.stats.staked + C.state.stats.returned, 'nothing made, nothing lost, but by the wheel');
  assert.equal(C.spin().ok, false, 'no spin without a bet');
});

test('blackjack: the deal, a double and a split take their chips once; the round settles once; you can\'t get up mid-hand', () => {
  const g = atCasino('17:00', 40000);
  const C = g.casino;
  C.exchange('buy', 30000);
  sitAt(g, 'blackjack_2');
  assert.equal(C.deal(10).ok, false, 'below the 25 minimum');
  assert.equal(C.deal(501).ok, false, 'above the 500 maximum');
  let rounds = 0;
  for (let i = 0; i < 40; i++) {
    const before = C.chips;
    const r = C.deal(50);
    assert.ok(r.ok, r.text);
    while (r.round.phase === 'player') {
      assert.equal(C.canLeave(), false);
      const acts = ['double', 'split', 'hit', 'stand'].filter((a) => r.round && C.tableState('blackjack_2').round.phase === 'player');
      const legal = acts.find((a) => C.act(a).ok);
      assert.ok(legal);
    }
    const rd = C.tableState('blackjack_2').round;
    assert.ok(rd.settled);
    const returned = rd.results.reduce((a, x) => a + x.returned, 0);
    const staked = rd.hands.reduce((a, x) => a + x.bet, 0);
    assert.equal(C.chips, before - staked + returned, 'chips in = bets out + winnings back, exactly');
    assert.equal(C.credit(returned, C.tableState('blackjack_2').roundId), false, 'and never again');
    assert.ok(C.canLeave());
    rounds++;
  }
  assert.equal(rounds, 40);
});

test('save and load: a hand in play stands and is settled once; chips on an unspun layout come back; loading twice changes nothing', () => {
  const g = atCasino();
  const C = g.casino;
  C.exchange('buy', 1000);
  sitAt(g, 'blackjack_1');
  // find a deal that leaves a hand to play
  let r;
  do { if (C.tableState('blackjack_1').round?.phase === 'player') C.act('stand'); r = C.deal(20); } while (r.round.phase !== 'player');
  const save = JSON.parse(JSON.stringify(g.serialize()));
  const load = () => { const g2 = new Game(CONTENT, { seed: 5 }); g2.loadState(JSON.parse(JSON.stringify(save))); return g2; };
  const a = load();
  const b = load();
  assert.equal(a.casino.state.session, null, 'nobody is at a table after a load');
  const rd = a.casino.tableState('blackjack_1').round;
  assert.equal(rd.phase, 'done');
  assert.ok(rd.settled);
  assert.equal(a.casino.chips, b.casino.chips, 'the same save loads to the same chips');
  const ret = rd.results.reduce((x, y) => x + y.returned, 0);
  assert.equal(a.casino.chips, save.world.casino.chips + ret);
  // roulette: chips on the layout come back
  const g3 = atCasino();
  g3.casino.exchange('buy', 500);
  sitAt(g3, 'roulette_1');
  g3.casino.placeBet({ type: 'black', amount: 200 });
  const s3 = JSON.parse(JSON.stringify(g3.serialize()));
  const g4 = new Game(CONTENT, { seed: 5 });
  g4.loadState(s3);
  assert.equal(g4.casino.chips, 500);
  assert.equal(g4.casino.tableState('roulette_1').bets.length, 0);
  assert.equal(g4.casino.state.session, null);
});

test('Morganius and Octavius are imported and protected; Vera and Brock are staff; everyone has a bed in the tower', () => {
  const ch = CONTENT.characters;
  for (const id of ['npc_morganius', 'npc_octavius']) {
    assert.equal(ch[id].origin, 'imported');
    assert.ok(ch[id].wrath?.theme && ch[id].combat.never);
  }
  assert.ok(ch.npc_morganius.appearance.portrait, 'his portrait, from the photo');
  assert.equal(ch.npc_octavius.appearance.temporary, true, 'Octavius wears a stand-in until his picture arrives');
  assert.equal(CONTENT.life.homes.npc_vera.home.split('/')[0], 'res_phonograph_staff');
  void TILE;
});
