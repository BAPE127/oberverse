// Blackjack at the Phonograph Grand (v0.52.0). Pure rules: a round is a plain object, every action
// returns the next state, and the cards come off a shoe stored in the round — so a hand in
// progress survives a save, and nothing is ever re-dealt.
//
// House rules (shown at the table):
//   • six decks, reshuffled when three quarters have been dealt
//   • the dealer stands on all 17s (soft 17 too)
//   • blackjack pays 3 to 2; a push returns the bet
//   • the dealer checks for blackjack under an ace or a ten; with one, the hand ends at once
//     (your blackjack pushes; anything else loses just the bet)
//   • double down on any first two cards (one more card, bet doubled)
//   • split once, a pair of the same rank, into two hands; split aces take one card each,
//     and 21 after a split is not a blackjack
//   • no insurance, no surrender

import { newDeck, shuffle, rank } from './cards.js';

export const DECKS = 6;
export const RESHUFFLE_AT = Math.floor(DECKS * 52 * 0.25); // cards left

export const RULES = [
  'Six decks · dealer stands on all 17s',
  'Blackjack pays 3 to 2 · ties push',
  'Double on any two cards · split once',
  'Split aces get one card each · no insurance',
];

/** A card's points (aces as 1 here; `handValue` lifts one ace to 11 when it fits). */
const points = (c) => {
  const r = rank(c);
  return r === 14 ? 1 : r >= 10 ? 10 : r;
};

/** { total, soft } — soft when an ace is counting as 11. */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) { total += points(c); if (rank(c) === 14) aces++; }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

export const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;
const tenValue = (c) => points(c) === 10;

/** A fresh, shuffled shoe. */
export function newShoe(rng) {
  return { cards: shuffle(newDeck(DECKS), rng), dealt: 0 };
}

function draw(round) {
  return round.shoe.cards[round.shoe.dealt++];
}

/** Start a round (reshuffling a worn shoe first). `shoe` is reused between rounds. */
export function deal(shoe, bet, rng) {
  const s = shoe && shoe.cards.length - shoe.dealt > RESHUFFLE_AT ? shoe : newShoe(rng);
  const round = { shoe: s, hands: [{ cards: [], bet, doubled: false, done: false, split: false }], active: 0, dealer: [], phase: 'player', results: null, reshuffled: s !== shoe };
  // player, dealer, player, dealer (the dealer's second card is face down)
  round.hands[0].cards.push(draw(round));
  round.dealer.push(draw(round));
  round.hands[0].cards.push(draw(round));
  round.dealer.push(draw(round));
  // the dealer peeks under an ace or a ten
  const up = round.dealer[0];
  if ((rank(up) === 14 || tenValue(up)) && isBlackjack(round.dealer)) return finish(round);
  if (isBlackjack(round.hands[0].cards)) return finish(round);
  return round;
}

/** The actions open to the hand being played. */
export function legalActions(round) {
  if (round.phase !== 'player') return [];
  const h = round.hands[round.active];
  const out = ['hit', 'stand'];
  if (h.cards.length === 2 && !h.doubled) out.push('double');
  if (round.hands.length === 1 && h.cards.length === 2 && rank(h.cards[0]) === rank(h.cards[1])) out.push('split');
  return out;
}

/** Play an action; returns the round (mutated). Illegal actions throw. */
export function act(round, action) {
  if (!legalActions(round).includes(action)) throw new Error(`blackjack: ${action} isn't allowed now`);
  const h = round.hands[round.active];
  if (action === 'hit') {
    h.cards.push(draw(round));
    if (handValue(h.cards).total >= 21) h.done = true;
  } else if (action === 'stand') {
    h.done = true;
  } else if (action === 'double') {
    h.doubled = true;
    h.bet *= 2;
    h.cards.push(draw(round));
    h.done = true;
  } else if (action === 'split') {
    const second = { cards: [h.cards.pop()], bet: h.bet, doubled: false, done: false, split: true };
    h.split = true;
    round.hands.push(second);
    h.cards.push(draw(round));
    second.cards.push(draw(round));
    // split aces: one card each, and that's that
    if (rank(h.cards[0]) === 14) { h.done = true; second.done = true; }
    for (const x of round.hands) if (handValue(x.cards).total === 21) x.done = true;
  }
  return advance(round);
}

function advance(round) {
  while (round.active < round.hands.length && round.hands[round.active].done) round.active++;
  if (round.active < round.hands.length) return round;
  return dealerPlays(round);
}

/** The dealer turns the hole card and draws to 17 (unless every hand is already bust). */
function dealerPlays(round) {
  round.phase = 'dealer';
  const live = round.hands.some((h) => handValue(h.cards).total <= 21);
  if (live) while (handValue(round.dealer).total < 17) round.dealer.push(draw(round));
  return finish(round);
}

/**
 * Settle every hand: results [{ outcome, bet, returned }] — `returned` is what comes back to you
 * (0 lost, the bet on a push, twice it on a win, two and a half times it on a blackjack).
 */
function finish(round) {
  round.phase = 'done';
  const d = handValue(round.dealer).total;
  const dealerBJ = isBlackjack(round.dealer);
  round.results = round.hands.map((h) => {
    const v = handValue(h.cards).total;
    const bj = !h.split && isBlackjack(h.cards);
    let outcome;
    if (dealerBJ) outcome = bj ? 'push' : 'lose';
    else if (bj) outcome = 'blackjack';
    else if (v > 21) outcome = 'bust';
    else if (d > 21 || v > d) outcome = 'win';
    else if (v === d) outcome = 'push';
    else outcome = 'lose';
    const returned = outcome === 'blackjack' ? h.bet + Math.floor((h.bet * 3) / 2) : outcome === 'win' ? h.bet * 2 : outcome === 'push' ? h.bet : 0;
    return { outcome, bet: h.bet, returned };
  });
  return round;
}

/** Finish a round you walk away from: every hand still open stands (nothing is re-dealt). */
export function standAll(round) {
  if (round.phase !== 'player') return round;
  for (const h of round.hands) h.done = true;
  round.active = round.hands.length;
  return dealerPlays(round);
}

/** The chips a round has on the table (a double or a split adds to it). */
export const totalBet = (round) => round.hands.reduce((s, h) => s + h.bet, 0);
