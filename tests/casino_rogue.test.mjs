// Morganius's table, the Spade's Gambit (v0.53.0): the roguelike's rules — the scoring and its
// fixed order, Inks, Curios, Twists, the run's flow, the Cabinet — and the casino's books for it
// (buy in once, paid once, a run that keeps across leaving and saving).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, setTime, noImpulses, CONTENT, Game } from './helpers.mjs';
import { cardOf, HAND } from '../src/casino/cards.js';
import * as R from '../src/casino/rogue.js';

const C = (s) => cardOf({ A: 14, K: 13, Q: 12, J: 11, T: 10 }[s[0]] || Number(s[0]), 'SHDC'.indexOf(s[1]));
/** Put exactly these cards in the run's hand (taken out of the deck's other piles). */
function rig(run, str, extraHeld = '') {
  const all = [...str.split(' '), ...extraHeld.split(' ').filter(Boolean)].map(C);
  const ids = all.map((c) => run.deck.find((d) => d.c === c).id);
  run.draw = run.draw.filter((id) => !ids.includes(id));
  run.used = run.used.filter((id) => !ids.includes(id));
  for (const id of run.hand) if (!ids.includes(id)) run.draw.push(id);
  run.hand = ids;
  return ids.slice(0, str.split(' ').length);
}
const fresh = (seed = 1) => R.newRun(seed);
const ink = (run, s, k) => { run.deck.find((d) => d.c === C(s)).ink = k; };

test('a run is dealt from its own seed: the same seed, the same Gambit; a different seed, a different one', () => {
  const a = fresh(42);
  const b = fresh(42);
  const c = fresh(43);
  assert.deepEqual(a.hand, b.hand);
  assert.deepEqual(a.twists, b.twists);
  assert.notDeepEqual(a.hand, c.hand);
  assert.equal(a.hand.length, R.HAND_SIZE);
  assert.equal(a.plays, R.PLAYS);
  assert.equal(a.redraws, R.REDRAWS);
  assert.equal(new Set(a.twists).size, R.ACTS, 'three different Twists');
});

test('scoring: a hand\'s base Pips and Gasps, plus each scoring card\'s pips; a Rehearsal adds its level', () => {
  const run = fresh();
  let ids = rig(run, '8S 8H', '2C 3D 5H 9C JD KS');
  let s = R.scoreHand(run, ids);
  assert.equal(s.cat, HAND.PAIR);
  assert.equal(s.total, (12 + 8 + 8) * 2);
  run.levels[HAND.PAIR] = 1;
  s = R.scoreHand(run, ids);
  assert.equal(s.total, (12 + 12 + 16) * 3);
  // a high card scores only its top card; an Ace is 11, a face card 10
  ids = rig(run, 'AS 4H 9C');
  assert.equal(R.scoreHand(run, ids).total, (4 + 11) * 1);
  // a flush and a straight need five cards, and all five score
  ids = rig(run, '2H 6H 9H JH KH');
  s = R.scoreHand(run, ids);
  assert.equal(s.cat, HAND.FLUSH);
  assert.equal(s.total, (32 + 2 + 6 + 9 + 10 + 10) * 4);
  ids = rig(run, 'AS 2H 3D 4C 5S');
  assert.equal(R.scoreHand(run, ids).cat, HAND.STRAIGHT, 'the wheel');
  ids = rig(run, '9S 9H 9D 4C 4S');
  assert.equal(R.scoreHand(run, ids).cat, HAND.FULL_HOUSE);
});

test('the scoring order is fixed: cards first, then held cards, then the hand Curios in the order you hold them', () => {
  const run = fresh();
  const ids = rig(run, '8S 8H', '2C');
  run.curios = ['top_hat', 'velvet_glove'];
  const a = R.scoreHand(run, ids).total; // gasps (2 × 1.4) + 3 = 5.8
  run.curios = ['velvet_glove', 'top_hat'];
  const b = R.scoreHand(run, ids).total; // gasps (2 + 3) × 1.4 = 7
  assert.equal(a, Math.floor(28 * 5.8));
  assert.equal(b, Math.floor(28 * 7));
  // steps come out in that order, ending with the total
  const steps = R.scoreHand(run, ids).steps.map((x) => x.kind);
  assert.deepEqual(steps, ['hand', 'card', 'card', 'curio', 'curio', 'total']);
  // card Curios work per card, in the card's turn: the Black Cat on two 7s, then the Velvet Glove
  const run2 = fresh();
  const ids2 = rig(run2, '7S 7H');
  run2.curios = ['velvet_glove', 'black_cat'];
  assert.equal(R.scoreHand(run2, ids2).total, Math.floor((12 + 14) * (2 * 1.3 * 1.3 + 3)));
});

test('Inks: Gilt, Violet, Twin, Ember (which burns away), Steel (held), Ghost (any suit)', () => {
  let run = fresh();
  ink(run, '8S', 'gilt');
  ink(run, '8H', 'violet');
  let ids = rig(run, '8S 8H');
  assert.equal(R.scoreHand(run, ids).total, (12 + 8 + 30 + 8) * (2 + 4));
  run = fresh();
  ink(run, '8S', 'twin');
  ids = rig(run, '8S 8H');
  assert.equal(R.scoreHand(run, ids).total, (12 + 8 + 8 + 8) * 2, 'the Twin scores twice');
  run = fresh();
  ink(run, '8S', 'ember');
  ids = rig(run, '8S 8H', '2C 3C 4C 6D 9D JD');
  const r = R.play(run, ids);
  assert.equal(r.total, (12 + 16) * 4);
  assert.ok(!run.deck.some((d) => d.c === C('8S')), 'the Ember card is gone from the deck');
  assert.equal(run.deck.length, 51);
  run = fresh();
  ink(run, 'KD', 'steel');
  ids = rig(run, '8S 8H', 'KD');
  assert.equal(R.scoreHand(run, ids).total, Math.floor(28 * 3), 'Steel works from your hand');
  run = fresh();
  ink(run, '9S', 'ghost');
  ids = rig(run, '2H 6H 9S JH KH');
  assert.equal(R.scoreHand(run, ids).cat, HAND.FLUSH, 'a Ghost card fits any flush');
});

test('Curios: the Mirror Box joins the red suits; Encore, Dove, Sawn Lady, Applause, Chains and Lantern do what they say', () => {
  let run = fresh();
  let ids = rig(run, '2H 6D 9H JD KH');
  assert.notEqual(R.scoreHand(run, ids).cat, HAND.FLUSH);
  run.curios = ['mirror_box'];
  assert.equal(R.scoreHand(run, ids).cat, HAND.FLUSH);
  run = fresh();
  ids = rig(run, '8S 8H');
  run.curios = ['encore'];
  assert.equal(R.scoreHand(run, ids).total, (12 + 24) * 2);
  run.curios = ['sawn_lady'];
  assert.equal(R.scoreHand(run, ids).total, 28 * 4);
  run.curios = ['applause_machine']; // 4 plays: 3 left after this one
  assert.equal(R.scoreHand(run, ids).total, 28 * (2 + 6));
  run.curios = ['escape_chains'];
  assert.equal(R.scoreHand(run, ids).total, 28 * 2, 'not on the first play');
  run.plays = 1;
  assert.equal(R.scoreHand(run, ids).total, 28 * 4, 'on the last');
  run = fresh();
  ids = rig(run, '8S 8H 8D', '2C 3C');
  run.curios = ['dove', 'stagehand_lantern'];
  assert.equal(R.scoreHand(run, ids).total, Math.floor((28 + 24 + 16) * 3 * 1.5));
  // passive: an extra card in hand, an extra redraw
  run = fresh();
  run.curios = ['rabbit_hat', 'smoke_bomb'];
  run.score = 1e9;
  R.play(run, run.hand.slice(0, 1));
  R.nextTrick(run);
  assert.equal(run.hand.length, R.HAND_SIZE + 1);
  assert.equal(run.redraws, R.REDRAWS + 1);
});

test('Twists: the Looking-Glass, Tight Sleeves, the Fog, the Echo and the Gilded Cage', () => {
  const run = fresh();
  run.twist = 'mirror';
  let ids = rig(run, '8S 8H');
  assert.equal(R.scoreHand(run, ids).total, (12 + 8) * 2, 'hearts score no pips');
  run.twist = 'echo';
  run.lastCat = HAND.PAIR;
  assert.equal(R.scoreHand(run, ids).total, 28, 'the same hand again: half');
  run.twist = 'gilded_cage';
  run.curios = ['velvet_glove'];
  run.playsMade = 0;
  assert.equal(R.scoreHand(run, ids).total, 56, 'Curios silent on the first play');
  run.playsMade = 1;
  assert.equal(R.scoreHand(run, ids).total, 28 * 5);
  // Tight Sleeves and the Fog, as a Finale deals them
  for (const tw of ['tight', 'fog']) {
    const r = fresh(7);
    r.twists = [tw, tw, tw];
    r.trick = 2;
    r.score = 0;
    r.phase = 'shop';
    r.trick = 1;
    r.shop = { items: [], rerolls: 0, vanishCost: 2, vanished: false };
    R.nextTrick(r);
    assert.equal(r.twist, tw);
    if (tw === 'tight') assert.equal(r.plays, R.PLAYS - 1);
    else assert.equal(r.hand.length, R.HAND_SIZE - 1);
  }
  void ids;
  ids = null;
});

test('a run\'s flow: plays run out and the curtain falls; a Trick won pays Sparks and opens the Cabinet; a Finale clears the Act', () => {
  let run = fresh(5);
  for (let i = 0; i < R.PLAYS; i++) R.play(run, run.hand.slice(0, 1));
  assert.equal(run.phase, 'lost');
  assert.throws(() => R.play(run, run.hand.slice(0, 1)));
  run = fresh(5);
  const sparks = run.sparks;
  run.score = run.target - 1;
  R.play(run, run.hand.slice(0, 1));
  assert.equal(run.phase, 'shop');
  assert.equal(run.sparks, sparks + 3 + (R.PLAYS - 1), '3, and one for each Play left');
  assert.ok(run.shop.items.length >= 4);
  R.nextTrick(run);
  assert.equal(run.trick, 1);
  assert.equal(run.target, R.targetFor(0, 1));
  run.trick = 2;
  run.twist = run.twists[0];
  run.score = 1e9;
  R.play(run, run.hand.slice(0, 1));
  assert.equal(run.actsCleared, 1);
  R.nextTrick(run);
  assert.equal(run.act, 1);
  assert.equal(run.trick, 0);
  // the last Finale wins the whole Gambit
  run.act = 2; run.trick = 2; run.score = 1e9;
  R.play(run, run.hand.slice(0, 1));
  assert.equal(run.phase, 'won');
  assert.equal(R.payout(run), R.PAYOUT[3]);
});

test('every card is in exactly one place, always: hand, deck or used pile — and a new Trick gathers them all', () => {
  const run = fresh(9);
  const check = () => {
    const all = [...run.hand, ...run.draw, ...run.used].sort((a, b) => a - b);
    assert.deepEqual(all, run.deck.map((d) => d.id).sort((a, b) => a - b));
  };
  check();
  R.redraw(run, run.hand.slice(0, 3));
  check();
  R.play(run, run.hand.slice(0, 2));
  check();
  assert.throws(() => R.play(run, [999]), /not in your hand/);
  assert.throws(() => R.play(run, run.hand.slice(0, 6)), /one to five/);
  assert.throws(() => R.play(run, [run.hand[0], run.hand[0]]));
  run.score = 1e9;
  R.play(run, run.hand.slice(0, 1));
  R.nextTrick(run);
  check();
  assert.equal(run.used.length, 0);
});

test('the Cabinet: prices, a purse that never goes below nothing, five Curios at most, rerolls dearer each time, one vanishing a visit', () => {
  const run = fresh(11);
  run.score = 1e9;
  R.play(run, run.hand.slice(0, 1));
  run.sparks = 100;
  const curio = run.shop.items.findIndex((x) => x.kind === 'curio');
  const cost = run.shop.items[curio].cost;
  assert.ok(R.buy(run, curio).ok);
  assert.equal(run.sparks, 100 - cost);
  assert.equal(R.buy(run, curio).ok, false, 'sold');
  assert.ok(R.reroll(run).ok);
  assert.equal(run.sparks, 100 - cost - 1);
  assert.ok(R.reroll(run).ok);
  assert.equal(run.sparks, 100 - cost - 3);
  run.curios = ['velvet_glove', 'marked_deck', 'fortune_card', 'thirteenth_spade', 'smoke_bomb'];
  const c2 = run.shop.items.findIndex((x) => x.kind === 'curio');
  assert.equal(R.buy(run, c2).ok, false, 'five at most');
  run.sparks = 0;
  const any = run.shop.items.findIndex((x) => !x.sold);
  assert.equal(R.buy(run, any).ok, false);
  assert.equal(run.sparks, 0);
  run.sparks = 10;
  const victim = run.deck[0].id;
  assert.ok(R.vanish(run, victim).ok);
  assert.ok(!run.deck.some((d) => d.id === victim));
  assert.equal(R.vanish(run, run.deck[0].id).ok, false, 'once a visit');
  const rehearse = run.shop.items.findIndex((x) => x.kind === 'rehearsal' && !x.sold);
  if (rehearse >= 0) { const cat = run.shop.items[rehearse].cat; R.buy(run, rehearse); assert.equal(run.levels[cat], 1); }
});

test('the casino\'s books: the buy-in is taken once, a finished Gambit is paid once, and a Gambit keeps across leaving and saving', () => {
  const g = newGame(13);
  setTime(g, 1, '21:00');
  noImpulses(g);
  g.player.money = 1000;
  g.changeMap('phonograph_casino', 'cage_front');
  const Cs = g.casino;
  Cs.exchange('buy', 100);
  g.changeMap('phonograph_casino', 'seat_spade');
  assert.ok(Cs.sit('spade').ok);
  Cs.skipArrival();
  g.update(0.05, { x: 0, y: 0 });
  assert.ok(Cs.startRun().ok);
  assert.equal(Cs.chips, 75);
  assert.equal(Cs.startRun().ok, false, 'one Gambit at a time');
  const run = Cs.rogue.run;
  const r = Cs.rogueAct('play', run.hand.slice(0, 2));
  assert.ok(r.ok && r.steps.length);
  assert.equal(Cs.rogueAct('play', [999]).ok, false);
  // leave mid-run, save, load: the same Gambit, carried on
  Cs.leave();
  const save = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game(CONTENT, { seed: 2 });
  g2.loadState(save);
  const run2 = g2.casino.rogue.run;
  assert.deepEqual(run2.hand, run.hand);
  assert.equal(run2.score, run.score);
  assert.equal(g2.casino.chips, 75);
  // sit again: no stake needed with a Gambit in hand
  g2.changeMap('phonograph_casino', 'seat_spade');
  g2.casino.state.chips = 0;
  assert.ok(g2.casino.sit('spade').ok);
  // finish it: clear Act 1, then lose — paid 30, once
  run2.trick = 2; run2.twist = run2.twists[0]; run2.score = 1e9;
  g2.casino.rogueAct('play', run2.hand.slice(0, 1));
  g2.casino.rogueAct('next');
  for (let i = 0; i < 4 && run2.phase === 'play'; i++) g2.casino.rogueAct('play', run2.hand.slice(0, 1));
  assert.equal(run2.phase, 'lost');
  assert.ok(run2.settled);
  assert.equal(g2.casino.chips, R.PAYOUT[1]);
  assert.equal(g2.casino.settleRun(), 0, 'paid once');
  assert.equal(g2.casino.credit(30, run2.id), false);
  assert.equal(g2.casino.rogue.bestActs, 1);
  assert.equal(g2.casino.rogueAct('play', run2.hand.slice(0, 1)).ok, false, 'over is over');
});

test('balance: a greedy player clears the first Act about half the time and rarely wins outright', () => {
  // the same bot as the design notes (docs/CASINO.md): play the best hand in hand, redraw when it won't do
  const combos = (arr, k, start = 0, cur = [], out = []) => { if (cur.length === k) { out.push([...cur]); return out; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); } return out; };
  const dist = [0, 0, 0, 0];
  const N = 60;
  for (let seed = 1; seed <= N; seed++) {
    const run = R.newRun(seed * 7919);
    while (!R.finished(run)) {
      if (run.phase === 'play') {
        let best = null;
        for (let k = 1; k <= 5; k++) for (const c of combos(run.hand, k)) { const s = R.scoreHand(run, c); if (!best || s.total > best.s.total) best = { c, s }; }
        // redraw the cards that don't count when the best hand won't keep pace
        if (run.redraws > 0 && best.s.total * run.plays < run.target - run.score && best.s.cat < 2) {
          const toss = run.hand.filter((id) => !best.s.scoring.includes(id)).slice(0, 5);
          if (toss.length) { R.redraw(run, toss); continue; }
        }
        R.play(run, best.c);
      } else {
        run.shop.items.forEach((it, i) => { if (it.cost <= run.sparks) R.buy(run, i); });
        R.nextTrick(run);
      }
    }
    dist[run.actsCleared]++;
  }
  assert.ok(dist[0] >= N * 0.25 && dist[0] <= N * 0.75, `Act 1 lost ${dist[0]}/${N}`);
  assert.ok(dist[3] <= N * 0.1, `outright wins ${dist[3]}/${N}`);
});
