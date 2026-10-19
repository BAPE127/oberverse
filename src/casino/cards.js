// Playing cards for the Phonograph Grand's tables (v0.52.0). Pure: no rendering, no game state.
//
// A card is an integer 0–51: rank = 2 + (card % 13) (11 J, 12 Q, 13 K, 14 A), suit = card / 13
// (0 ♠ spades, 1 ♥ hearts, 2 ♦ diamonds, 3 ♣ clubs). A shoe of several decks is simply several
// copies of 0–51. Shuffles take the game's seeded RNG (anything with next() → [0, 1)), so a
// shoe's order is part of the saved state and a dealt card is never re-rolled.

export const SUITS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_NAME = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };

export const rank = (c) => 2 + (c % 13);
export const suit = (c) => Math.floor(c / 13) % 4;
export const isRed = (c) => suit(c) === 1 || suit(c) === 2;
export const cardOf = (r, s) => s * 13 + (r - 2);
export const rankLabel = (r) => RANK_LABEL[r] || String(r);
export const label = (c) => `${rankLabel(rank(c))}${SUITS[suit(c)]}`;
export const rankName = (r, plural = false) => (RANK_NAME[r] || String(r)) + (plural ? (r === 6 ? 'es' : 's') : '');

/** `decks` full decks, in order. */
export function newDeck(decks = 1) {
  const out = [];
  for (let d = 0; d < decks; d++) for (let c = 0; c < 52; c++) out.push(c);
  return out;
}

/** Fisher–Yates, in place, with the game's RNG. */
export function shuffle(cards, rng) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ------------------------------------------------------------------ poker hands
export const HAND = {
  HIGH: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
};
export const HAND_NAMES = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

/** The top rank of a straight among these distinct ranks (5–14), or 0. The wheel A-2-3-4-5 is a 5-high straight. */
function straightTop(ranks) {
  const set = new Set(ranks);
  if (set.has(14)) set.add(1);
  for (let top = 14; top >= 5; top--) {
    let ok = true;
    for (let k = 0; k < 5; k++) if (!set.has(top - k)) { ok = false; break; }
    if (ok) return top;
  }
  return 0;
}

/**
 * Evaluate exactly five cards: { cat, ranks, name } — `ranks` breaks ties within a category, most
 * significant first (pairs by size, then kickers; a straight by its top card).
 */
export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error('evaluate5 needs five cards');
  const rs = cards.map(rank).sort((a, b) => b - a);
  const flush = cards.every((c) => suit(c) === suit(cards[0]));
  const counts = new Map();
  for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);
  // groups: by count, then by rank
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const st = counts.size === 5 ? straightTop(rs) : 0;
  let cat;
  let ranks;
  if (st && flush) { cat = HAND.STRAIGHT_FLUSH; ranks = [st]; }
  else if (groups[0][1] === 4) { cat = HAND.QUADS; ranks = [groups[0][0], groups[1][0]]; }
  else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = HAND.FULL_HOUSE; ranks = [groups[0][0], groups[1][0]]; }
  else if (flush) { cat = HAND.FLUSH; ranks = rs; }
  else if (st) { cat = HAND.STRAIGHT; ranks = [st]; }
  else if (groups[0][1] === 3) { cat = HAND.TRIPS; ranks = groups.map((g) => g[0]); }
  else if (groups[0][1] === 2 && groups[1][1] === 2) { cat = HAND.TWO_PAIR; ranks = groups.map((g) => g[0]); }
  else if (groups[0][1] === 2) { cat = HAND.PAIR; ranks = groups.map((g) => g[0]); }
  else { cat = HAND.HIGH; ranks = rs; }
  return { cat, ranks, name: HAND_NAMES[cat], cards: [...cards] };
}

/** <0 if a loses to b, 0 a tie, >0 if a beats b. */
export function compareHands(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  for (let i = 0; i < Math.max(a.ranks.length, b.ranks.length); i++) {
    const d = (a.ranks[i] || 0) - (b.ranks[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** The best five-card hand from five to seven cards. */
export function bestHand(cards) {
  if (cards.length < 5) throw new Error('bestHand needs at least five cards');
  if (cards.length === 5) return evaluate5(cards);
  let best = null;
  const n = cards.length;
  const pick = [];
  const rec = (start) => {
    if (pick.length === 5) {
      const h = evaluate5(pick.map((i) => cards[i]));
      if (!best || compareHands(h, best) > 0) best = h;
      return;
    }
    for (let i = start; i <= n - (5 - pick.length); i++) { pick.push(i); rec(i + 1); pick.pop(); }
  };
  rec(0);
  return best;
}

/**
 * The poker hand made by any number of cards (1–5), for games where you play fewer than five
 * (Morganius's table): pairs, trips and quads count with fewer cards; straights and flushes need five.
 */
export function evaluateAny(cards) {
  if (cards.length === 5) return evaluate5(cards);
  const rs = cards.map(rank).sort((a, b) => b - a);
  const counts = new Map();
  for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const top = groups[0] || [0, 0];
  let cat = HAND.HIGH;
  if (top[1] === 4) cat = HAND.QUADS;
  else if (top[1] === 3 && groups[1]?.[1] === 2) cat = HAND.FULL_HOUSE;
  else if (top[1] === 3) cat = HAND.TRIPS;
  else if (top[1] === 2 && groups[1]?.[1] === 2) cat = HAND.TWO_PAIR;
  else if (top[1] === 2) cat = HAND.PAIR;
  return { cat, ranks: groups.map((g) => g[0]), name: HAND_NAMES[cat], cards: [...cards] };
}

/** Which of these cards make the hand (the pair, the trips…; all five for a straight, flush or full house). */
export function scoringCards(cards, hand) {
  if ([HAND.STRAIGHT, HAND.FLUSH, HAND.FULL_HOUSE, HAND.STRAIGHT_FLUSH].includes(hand.cat)) return [...cards];
  if (hand.cat === HAND.HIGH) {
    const top = Math.max(...cards.map(rank));
    const c = cards.find((x) => rank(x) === top);
    return c === undefined ? [] : [c];
  }
  const counts = new Map();
  for (const c of cards) counts.set(rank(c), (counts.get(rank(c)) || 0) + 1);
  return cards.filter((c) => counts.get(rank(c)) >= 2);
}
