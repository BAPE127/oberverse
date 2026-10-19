// The Phonograph Grand's games, as rules alone (v0.52.0): cards and poker hands, roulette, blackjack.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng.js';
import { cardOf, rank, newDeck, shuffle, evaluate5, bestHand, compareHands, HAND, evaluateAny, scoringCards } from '../src/casino/cards.js';
import * as R from '../src/casino/roulette.js';
import * as BJ from '../src/casino/blackjack.js';

const C = (s) => { // 'AS' 'TH' '9D' '2C'
  const r = { A: 14, K: 13, Q: 12, J: 11, T: 10 }[s[0]] || Number(s[0]);
  return cardOf(r, 'SHDC'.indexOf(s[1]));
};
const hand = (str) => str.split(' ').map(C);

test('cards: a deck is 52 different cards, a shuffle keeps them all', () => {
  const d = shuffle(newDeck(1), new Rng(7));
  assert.equal(new Set(d).size, 52);
  const shoe = shuffle(newDeck(6), new Rng(7));
  assert.equal(shoe.length, 312);
  for (let c = 0; c < 52; c++) assert.equal(shoe.filter((x) => x === c).length, 6, 'six of each card in a six-deck shoe');
});

test('poker hands: every category, the wheel and the broadway straights', () => {
  const cases = [
    ['AS KS QS JS TS', HAND.STRAIGHT_FLUSH], ['5H 4H 3H 2H AH', HAND.STRAIGHT_FLUSH], ['9C 9D 9H 9S 2C', HAND.QUADS],
    ['3C 3D 3H 7S 7C', HAND.FULL_HOUSE], ['2D 7D 9D JD KD', HAND.FLUSH], ['AS 2D 3H 4C 5S', HAND.STRAIGHT],
    ['TS JD QH KC AS', HAND.STRAIGHT], ['8S 8D 8H KC 2S', HAND.TRIPS], ['8S 8D KH KC 2S', HAND.TWO_PAIR],
    ['8S 8D QH KC 2S', HAND.PAIR], ['2S 5D 9H JC KS', HAND.HIGH], ['QS KD AH 2C 3S', HAND.HIGH],
  ];
  for (const [h, cat] of cases) assert.equal(evaluate5(hand(h)).cat, cat, h);
  assert.equal(evaluate5(hand('5H 4H 3H 2H AH')).ranks[0], 5, 'the wheel is five-high');
});

test('poker hands: kickers decide, true ties split, best of seven', () => {
  const a = evaluate5(hand('AS AD KH 7C 3S'));
  const b = evaluate5(hand('AH AC QH JC TS'));
  assert.ok(compareHands(a, b) > 0, 'pair of aces, king kicker beats queen kicker');
  assert.equal(compareHands(evaluate5(hand('TS JD QH KC AS')), evaluate5(hand('TD JC QS KH AH'))), 0, 'identical straights tie');
  assert.ok(compareHands(evaluate5(hand('6S 5D 4H 3C 2S')), evaluate5(hand('5H 4H 3D 2C AH'))) > 0, 'six-high beats the wheel');
  assert.ok(compareHands(evaluate5(hand('KS KD 4H 4C 9S')), evaluate5(hand('KH KC 4D 4S 8C'))) > 0, 'two pair: the kicker');
  const seven = bestHand(hand('2S 7H 7D 7C KS KD 3H'));
  assert.equal(seven.cat, HAND.FULL_HOUSE);
  assert.deepEqual(seven.ranks, [7, 13]);
  const board = bestHand(hand('AS KS QS JS TS 2D 3C'));
  assert.equal(board.cat, HAND.STRAIGHT_FLUSH, 'the board can be the hand');
});

test('poker hands of fewer cards (Morganius\'s table): pairs and trips count, scoring cards picked out', () => {
  assert.equal(evaluateAny(hand('8S 8D')).cat, HAND.PAIR);
  assert.equal(evaluateAny(hand('8S 8D 8H')).cat, HAND.TRIPS);
  assert.equal(evaluateAny(hand('8S 8D 3H 3C')).cat, HAND.TWO_PAIR);
  assert.equal(evaluateAny(hand('2S 5D 9H')).cat, HAND.HIGH);
  const h = evaluate5(hand('8S 8D QH KC 2S'));
  assert.deepEqual(scoringCards(hand('8S 8D QH KC 2S'), h).map(rank), [8, 8]);
});

test('roulette: every bet covers the right numbers and pays the right odds; zero beats the outside bets', () => {
  assert.equal(R.WHEEL.length, 37);
  assert.equal(new Set(R.WHEEL).size, 37);
  const coverCount = (bet) => Array.from({ length: 37 }, (_, n) => n).filter((n) => R.covers(bet, n)).length;
  const expect = [[{ type: 'straight', value: 17 }, 1, 35], [{ type: 'red' }, 18, 1], [{ type: 'black' }, 18, 1], [{ type: 'odd' }, 18, 1], [{ type: 'even' }, 18, 1], [{ type: 'low' }, 18, 1], [{ type: 'high' }, 18, 1], [{ type: 'dozen', value: 2 }, 12, 2], [{ type: 'column', value: 3 }, 12, 2]];
  for (const [bet, covered, pays] of expect) {
    assert.equal(coverCount(bet), covered, bet.type);
    assert.equal(R.BETS[bet.type].pays, pays, bet.type);
    // fair-odds check: covered × (pays + 1) = 36 for every bet on a single-zero wheel
    assert.equal(covered * (pays + 1), 36, `${bet.type}: the house edge is the zero`);
  }
  for (const t of ['red', 'black', 'odd', 'even', 'low', 'high']) assert.equal(R.covers({ type: t }, 0), false, `0 loses ${t}`);
  assert.equal(R.covers({ type: 'straight', value: 0 }, 0), true);
  assert.ok(R.covers({ type: 'column', value: 1 }, 34) && R.covers({ type: 'column', value: 3 }, 36) && R.covers({ type: 'dozen', value: 3 }, 25));
  assert.equal(R.colourOf(0), 'green');
  assert.equal(R.colourOf(1), 'red');
  assert.equal(R.colourOf(2), 'black');
});

test('roulette: several bets settle together, each once', () => {
  const bets = [{ type: 'straight', value: 7, amount: 10 }, { type: 'red', amount: 20 }, { type: 'dozen', value: 1, amount: 5 }, { type: 'even', amount: 5 }];
  const s = R.settle(bets, 7); // 7 is red, odd, first dozen
  assert.equal(s.staked, 40);
  assert.equal(s.returned, 10 * 36 + 20 * 2 + 5 * 3);
  const z = R.settle(bets, 0);
  assert.equal(z.returned, 0);
  assert.equal(R.validBet({ type: 'straight', value: 37, amount: 5 }), false);
  assert.equal(R.validBet({ type: 'red', amount: 0 }), false);
  assert.equal(R.validBet({ type: 'dozen', value: 2, amount: 5 }), true);
  // a fair wheel: every pocket comes up
  const rng = new Rng(3);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(R.spin(rng));
  assert.equal(seen.size, 37);
});

/** A round dealt from a stacked shoe: player, dealer, player, dealer, then the rest in order. */
function rigged(cards, bet = 10) {
  const shoe = { cards: [...hand(cards), ...newDeck(6)], dealt: 0 };
  return BJ.deal(shoe, bet, new Rng(1));
}

test('blackjack: aces are worth 1 or 11, soft and hard totals', () => {
  assert.deepEqual(BJ.handValue(hand('AS 6D')), { total: 17, soft: true });
  assert.deepEqual(BJ.handValue(hand('AS 6D 9C')), { total: 16, soft: false });
  assert.deepEqual(BJ.handValue(hand('AS AD 9C')), { total: 21, soft: true });
  assert.deepEqual(BJ.handValue(hand('KS QD 2C')), { total: 22, soft: false });
  assert.ok(BJ.isBlackjack(hand('AS KD')));
  assert.ok(!BJ.isBlackjack(hand('7S 7D 7C')));
});

test('blackjack: naturals, busts, pushes and the dealer standing on soft 17', () => {
  // player AK vs dealer 9 7: blackjack pays 3 to 2 at once
  let r = rigged('AS 9D KH 7C');
  assert.equal(r.phase, 'done');
  assert.equal(r.results[0].outcome, 'blackjack');
  assert.equal(r.results[0].returned, 25);
  // dealer A K (peek): player 10 9 loses only the bet
  r = rigged('TS AD 9H KC');
  assert.equal(r.results[0].outcome, 'lose');
  // both blackjack: push
  r = rigged('AS AD KH KC');
  assert.equal(r.results[0].outcome, 'push');
  assert.equal(r.results[0].returned, 10);
  // player 10 6 hits a king: bust
  r = rigged('TS 9D 6H 7C KD');
  BJ.act(r, 'hit');
  assert.equal(r.results[0].outcome, 'bust');
  assert.equal(r.dealer.length, 2, 'the dealer doesn\'t draw against a bust');
  // dealer soft 17 (A 6) stands; player 10 7 pushes
  r = rigged('TS AD 7H 6C');
  BJ.act(r, 'stand');
  assert.equal(BJ.handValue(r.dealer).total, 17);
  assert.equal(r.dealer.length, 2);
  assert.equal(r.results[0].outcome, 'push');
  // dealer 16 must draw: 10 6 then a 5 → 21 beats the player's 20
  r = rigged('TS TD QH 6C 5S');
  BJ.act(r, 'stand');
  assert.equal(BJ.handValue(r.dealer).total, 21);
  assert.equal(r.results[0].outcome, 'lose');
});

test('blackjack: double and split, and only the actions the rules allow', () => {
  // 5 6 doubles into a 10: 21, bet doubled
  let r = rigged('5S TD 6H 7C TH 2S');
  assert.ok(BJ.legalActions(r).includes('double'));
  assert.ok(!BJ.legalActions(r).includes('split'));
  BJ.act(r, 'double');
  assert.equal(r.hands[0].bet, 20);
  assert.equal(r.hands[0].cards.length, 3);
  assert.equal(r.results[0].outcome, 'win');
  assert.equal(r.results[0].returned, 40);
  // a pair of eights splits into two hands, each with the bet
  r = rigged('8S TD 8H 7C 3S KD');
  assert.ok(BJ.legalActions(r).includes('split'));
  BJ.act(r, 'split');
  assert.equal(r.hands.length, 2);
  assert.equal(BJ.totalBet(r), 20);
  assert.ok(!BJ.legalActions(r).includes('split'), 'split once');
  BJ.act(r, 'stand');
  BJ.act(r, 'stand');
  assert.equal(r.phase, 'done');
  assert.equal(r.results.length, 2);
  // split aces: one card each; 21 after a split is not a blackjack
  r = rigged('AS 9D AH 8C KS KD');
  BJ.act(r, 'split');
  assert.equal(r.phase, 'done', 'split aces are dealt one card and stand');
  assert.equal(r.results[0].outcome, 'win');
  assert.equal(r.results[0].returned, 20, 'paid even money, not 3 to 2');
  assert.throws(() => BJ.act(r, 'hit'));
});

test('blackjack: the shoe deals each card once, and walking away stands every open hand', () => {
  const rng = new Rng(11);
  let shoe = null;
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const r = BJ.deal(shoe, 5, rng);
    if (r.phase === 'player') BJ.standAll(r);
    shoe = r.shoe;
    seen.push(r.shoe.dealt);
    assert.equal(r.phase, 'done');
  }
  assert.ok(seen.every((d, i) => i === 0 || d > seen[i - 1] || d < 30), 'dealing moves down the shoe (or a fresh shoe)');
});
