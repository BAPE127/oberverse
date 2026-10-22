// What MRDN is worth (v0.55.0): the market values Meridian on its books, its
// normalised earnings and its order backlog — never on a random walk. A
// small daily mood (± noise) is the only randomness, and the price only
// moves part of the way to fair value each day.

/**
 * Fair value per share. company: { cash, credit drawn as negative cash, books };
 * ema: smoothed daily operating profit; backlog: expected margin on work in hand.
 */
export function fairValue(X, { equity, ema, backlog }) {
  const annual = ema * 365;
  const earnings = annual >= 0 ? X.pe * annual : 0.5 * X.pe * annual; // a loss-making spell is expected to pass, but it weighs
  return Math.max(1, (equity + earnings + X.backlogWeight * backlog) / X.shares);
}

/** Tomorrow's price: part of the way to fair value, times the day's mood. */
export function nextPrice(X, price, fair, mood) {
  const p = (price + (fair - price) * X.priceAdjust) * (1 + (mood * 2 - 1) * X.noise);
  return Math.max(1, Math.round(p * 100) / 100);
}
