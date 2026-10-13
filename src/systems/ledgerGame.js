// "The Ledger" — Sir Moneybucks's gentlemen's wager. Pure, deterministic
// given the RNG, and unit-tested. UI lives in src/ui/panels.js (ledger panel).
//
// Rules: a 1–12 deck is shuffled; you are dealt 3 cards (one per round), he
// takes 4 (his deck, his rules). Three rounds.
// Each round Sir Moneybucks lays a card face down and declares "Raise" (round
// worth 2 points) or "Steady" (1 point). He raises on strong cards and bluffs
// on weak ones. A Wits-based read may reveal a tell. The player then plays a
// card to Match, or Folds (he takes 1 point, never more). Higher card wins the
// round; ties go to the house. Most points after three rounds wins the purse.

export const LEDGER_STAKE = 20;

export function newLedgerMatch(rng, { wits = 2, bluffiness = 0.4 } = {}) {
  const deck = Array.from({ length: 12 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const m = {
    playerHand: deck.slice(0, 3).sort((a, b) => a - b),
    houseHand: deck.slice(3, 7).sort((a, b) => a - b), // his deck, his rules: he holds one extra card
    round: 0,
    playerPoints: 0,
    housePoints: 0,
    wits,
    bluffiness,
    log: [],
    current: null,
    finished: false,
  };
  houseLead(m, rng);
  return m;
}

/** Sir Moneybucks lays his card for the round and declares. */
function houseLead(m, rng) {
  const hand = m.houseHand; // kept sorted ascending
  const best = hand[hand.length - 1];
  const r = rng.next();
  let card;
  let raise;
  if (best >= 8 && r < 0.45) {
    card = best; // an honest raise with his strongest card
    raise = true;
  } else if (r < 0.45 + m.bluffiness * 0.6) {
    card = hand[0]; // a bluff: raise on his weakest card to bait out yours
    raise = true;
  } else {
    card = hand[Math.floor((hand.length - 1) / 2)];
    raise = false;
  }
  hand.splice(hand.indexOf(card), 1);
  const bluff = raise && card < 8;
  const readChance = Math.min(0.85, 0.3 + (m.wits - 2) * 0.1);
  let tell = 'His face gives nothing away.';
  if (rng.next() < readChance) tell = bluff ? 'His moustache twitches. He is not as confident as he sounds.' : raise ? 'He taps the cigar, utterly at ease. He means it.' : 'He barely looks at his card. A routine play.';
  m.current = { card, raise, bluff, tell };
}

/**
 * @param {object} m match
 * @param {number|null} card the player's card value, or null to fold
 */
export function playLedgerRound(m, card, rng) {
  if (m.finished || !m.current) throw new Error('Match is over');
  const c = m.current;
  const worth = c.raise ? 2 : 1;
  let result;
  if (card === null) {
    m.housePoints += 1;
    result = { folded: true, playerCard: null, houseCard: c.card, winner: 'house', points: 1 };
  } else {
    const idx = m.playerHand.indexOf(card);
    if (idx < 0) throw new Error('Card not in hand');
    m.playerHand.splice(idx, 1);
    const playerWins = card > c.card;
    if (playerWins) m.playerPoints += worth;
    else m.housePoints += worth;
    result = { folded: false, playerCard: card, houseCard: c.card, winner: playerWins ? 'player' : 'house', points: worth, raise: c.raise, bluff: c.bluff };
  }
  m.log.push(result);
  m.round += 1;
  m.current = null;
  if (m.round >= 3) m.finished = true;
  else houseLead(m, rng);
  return result;
}

export function ledgerWinner(m) {
  if (!m.finished) return null;
  return m.playerPoints > m.housePoints ? 'player' : 'house';
}
