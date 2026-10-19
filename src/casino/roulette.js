// Roulette at the Phonograph Grand (v0.52.0): single-zero, European. Pure rules — the wheel you
// watch spins to the number this decides.
//
// Bets: a single number (pays 35 to 1), red or black, odd or even, low (1–18) or high (19–36)
// (all 1 to 1), a dozen or a column (2 to 1). Zero is green: it wins only a bet on zero itself;
// every even-money, dozen and column bet loses. A winning bet returns its stake plus the winnings.

export const POCKETS = 37; // 0–36
/** The numbers round a European wheel, clockwise from zero. */
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const colourOf = (n) => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

/** What each kind of bet pays (to 1), and its name. */
export const BETS = {
  straight: { pays: 35, name: (v) => `Number ${v}` },
  red: { pays: 1, name: () => 'Red' },
  black: { pays: 1, name: () => 'Black' },
  odd: { pays: 1, name: () => 'Odd' },
  even: { pays: 1, name: () => 'Even' },
  low: { pays: 1, name: () => '1–18' },
  high: { pays: 1, name: () => '19–36' },
  dozen: { pays: 2, name: (v) => ['1st 12', '2nd 12', '3rd 12'][v - 1] },
  column: { pays: 2, name: (v) => `Column ${v}` },
};

/** Is this a bet the table takes? */
export function validBet(bet) {
  if (!bet || !BETS[bet.type] || !(bet.amount > 0) || !Number.isInteger(bet.amount)) return false;
  if (bet.type === 'straight') return Number.isInteger(bet.value) && bet.value >= 0 && bet.value <= 36;
  if (bet.type === 'dozen' || bet.type === 'column') return [1, 2, 3].includes(bet.value);
  return true;
}

/** Does `bet` win when the ball lands on `n`? */
export function covers(bet, n) {
  switch (bet.type) {
    case 'straight': return bet.value === n;
    case 'red': return n !== 0 && RED.has(n);
    case 'black': return n !== 0 && !RED.has(n);
    case 'odd': return n !== 0 && n % 2 === 1;
    case 'even': return n !== 0 && n % 2 === 0;
    case 'low': return n >= 1 && n <= 18;
    case 'high': return n >= 19 && n <= 36;
    case 'dozen': return n !== 0 && Math.ceil(n / 12) === bet.value;
    case 'column': return n !== 0 && ((n - 1) % 3) + 1 === bet.value;
    default: return false;
  }
}

/** The spin: a pocket, uniformly, from the game's RNG. */
export function spin(rng) {
  return Math.floor(rng.next() * POCKETS);
}

/**
 * Settle every bet on the felt against the winning number: { returned (stakes and winnings back),
 * staked, lines: [{ bet, won, returned }] }.
 */
export function settle(bets, n) {
  let returned = 0;
  let staked = 0;
  const lines = bets.map((bet) => {
    staked += bet.amount;
    const won = covers(bet, n);
    const back = won ? bet.amount * (BETS[bet.type].pays + 1) : 0;
    returned += back;
    return { bet, won, returned: back };
  });
  return { returned, staked, lines };
}

/** The name of a bet ("Red", "Number 17", "2nd 12"). */
export const betName = (bet) => BETS[bet.type].name(bet.value);
