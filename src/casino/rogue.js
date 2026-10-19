// Morganius's Table: "The Spade's Gambit" (v0.53.0) — a poker roguelike, as pure rules.
//
// You buy in, and Morganius deals you a hand from your own deck. Three Acts of three Tricks;
// each Trick has a target. Play up to five cards as a poker hand (pairs, trips and quads count
// with fewer cards; straights and flushes need five) — it scores Pips × Gasps — or put cards
// back and Redraw. Reach the target before you run out of Plays. Between Tricks, spend Sparks
// in Morganius's Cabinet: Curios (lasting wonders, five at most), Inks for your cards, Rehearsals
// (a hand type scores more) and Vanishings (a card leaves your deck). Every Act ends in a Finale
// with a Twist. Your chips back depend on how many Acts you clear.
//
// THE SCORING ORDER (fixed; the tests hold it to this):
//   1. The hand: its type's base Pips and Gasps, plus its Rehearsal levels.
//   2. Each scoring card, in the order you played them (a Twin card, and the first card under the
//      Encore curio, score again): its pips (2–10 face value; J Q K 10; A 11), then its Ink, then
//      the card Curios in the order you hold them.
//   3. Each card left in your hand, in hand order: its Ink (Steel ×1.5 Gasps).
//   4. The hand Curios, in the order you hold them (adds before multiplies, as each comes).
//   5. The Twist (the Echo halves a hand of the same type as the last).
//   6. Score = Pips × Gasps, rounded down.
//
// The run is plain data (saved as it stands). It draws from its own random stream (`rng`, a
// mulberry32 state kept in the run), so a run plays out the same whatever else happens in the
// world, and a card is never dealt twice.
import { rank, suit, HAND, HAND_NAMES } from './cards.js';

export const ENTRY = 25; // chips to buy in
export const PAYOUT = [0, 30, 75, 200]; // chips back, by Acts cleared
export const ACTS = 3;
export const TRICKS = 3; // per Act: the Opener, the Feature, the Finale
export const TRICK_NAMES = ['The Opener', 'The Feature', 'The Finale'];
const TARGETS = [480, 1800, 3300];
const TRICK_MULT = [1, 1.5, 2];
export const HAND_SIZE = 8;
export const PLAYS = 4;
export const REDRAWS = 3;
export const MAX_CURIOS = 5;

/** Each hand type's base score and what a Rehearsal adds. */
export const HANDS = {
  [HAND.HIGH]: { pips: 4, gasps: 1, lp: 8, lg: 1 },
  [HAND.PAIR]: { pips: 12, gasps: 2, lp: 12, lg: 1 },
  [HAND.TWO_PAIR]: { pips: 22, gasps: 2, lp: 18, lg: 1 },
  [HAND.TRIPS]: { pips: 28, gasps: 3, lp: 20, lg: 2 },
  [HAND.STRAIGHT]: { pips: 34, gasps: 4, lp: 26, lg: 2 },
  [HAND.FLUSH]: { pips: 32, gasps: 4, lp: 16, lg: 2 },
  [HAND.FULL_HOUSE]: { pips: 44, gasps: 4, lp: 24, lg: 2 },
  [HAND.QUADS]: { pips: 64, gasps: 6, lp: 30, lg: 3 },
  [HAND.STRAIGHT_FLUSH]: { pips: 96, gasps: 8, lp: 40, lg: 4 },
};

/** Inks: what a card carries. */
export const INKS = {
  gilt: { name: 'Gilt', text: '+30 Pips when it scores.', colour: '#e8c35a' },
  violet: { name: 'Violet', text: '+4 Gasps when it scores.', colour: '#b05af0' },
  twin: { name: 'Twin', text: 'Scores twice.', colour: '#5ac8e8' },
  ghost: { name: 'Ghost', text: 'Counts as every suit.', colour: '#d8d8e8' },
  steel: { name: 'Steel', text: '×1.5 Gasps while it stays in your hand.', colour: '#9aa0b0' },
  ember: { name: 'Ember', text: '×2 Gasps when it scores — then it burns away.', colour: '#f07a3a' },
};

/** Curios: Morganius's wonders. `kind`: card (step 2), hand (step 4), passive. */
export const CURIOS = {
  velvet_glove: { name: 'Velvet Glove', kind: 'hand', rarity: 1, text: '+3 Gasps on every hand.' },
  marked_deck: { name: 'The Marked Deck', kind: 'card', rarity: 1, text: 'Each scoring J, Q or K: +15 Pips.' },
  fortune_card: { name: 'Fortune-Teller\'s Card', kind: 'card', rarity: 1, text: 'Each scoring Ace: +20 Pips and +4 Gasps.' },
  thirteenth_spade: { name: 'The Thirteenth Spade', kind: 'card', rarity: 1, text: 'Each scoring ♠: +3 Gasps.' },
  stagehand_lantern: { name: 'Stagehand\'s Lantern', kind: 'hand', rarity: 1, text: '+8 Pips for each card left in your hand.' },
  smoke_bomb: { name: 'Smoke Bomb', kind: 'passive', rarity: 1, text: '+1 Redraw each Trick.' },
  black_cat: { name: 'Black Cat', kind: 'card', rarity: 2, text: 'Each scoring 7: ×1.3 Gasps.' },
  dove: { name: 'Dove in the Sleeve', kind: 'hand', rarity: 2, text: '×1.5 Gasps if you play exactly three cards.' },
  sawn_lady: { name: 'The Sawn Lady', kind: 'hand', rarity: 2, text: 'A Pair: ×2 Gasps (she comes in two halves).' },
  applause_machine: { name: 'Applause Machine', kind: 'hand', rarity: 2, text: '+2 Gasps for each Play you have left after this one.' },
  rabbit_hat: { name: 'Rabbit in the Hat', kind: 'passive', rarity: 2, text: '+1 card in your hand.' },
  mirror_box: { name: 'Mirror Box', kind: 'passive', rarity: 2, text: '♥ and ♦ are one suit; ♠ and ♣ are one suit (for flushes).' },
  disappearing_coin: { name: 'Disappearing Coin', kind: 'passive', rarity: 2, text: '+2 Sparks when you win a Trick.' },
  encore: { name: 'Encore!', kind: 'card', rarity: 3, text: 'The first scoring card of each hand scores twice.' },
  escape_chains: { name: 'Escapologist\'s Chains', kind: 'hand', rarity: 3, text: 'Your last Play of a Trick: ×2 Gasps.' },
  top_hat: { name: 'The Bottomless Top Hat', kind: 'hand', rarity: 3, text: '×(1 + 0.2 per Curio you hold) Gasps.' },
  crystal_ball: { name: 'Crystal Ball', kind: 'passive', rarity: 3, text: 'See the next three cards of your deck. +1 Redraw each Trick.' },
};
const CURIO_COST = { 1: 4, 2: 6, 3: 8 };

/** Twists: Morganius's conditions on each Finale. */
export const TWISTS = {
  mirror: { name: 'The Looking-Glass', text: '♥ cards score no Pips.' },
  tight: { name: 'Tight Sleeves', text: 'One Play fewer.' },
  fog: { name: 'The Fog', text: 'One card fewer in your hand.' },
  echo: { name: 'The Echo', text: 'A hand of the same type as the one before scores half.' },
  gilded_cage: { name: 'The Gilded Cage', text: 'Your Curios are silent for your first Play.' },
};

// ------------------------------------------------------------------ randomness (the run's own)
function next(run) {
  let t = (run.rng = (run.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (run, n) => Math.floor(next(run) * n);
function shuffleIn(run, list) {
  for (let i = list.length - 1; i > 0; i--) { const j = int(run, i + 1); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

// ------------------------------------------------------------------ helpers
export const cardPips = (c) => { const r = rank(c); return r === 14 ? 11 : r >= 10 ? 10 : r; };
const has = (run, id) => run.curios.includes(id);
const cardById = (run, id) => run.deck.find((d) => d.id === id);
export const handSize = (run) => HAND_SIZE + (has(run, 'rabbit_hat') ? 1 : 0) - (run.twist === 'fog' ? 1 : 0);
export const targetFor = (act, trick) => Math.round(TARGETS[act] * TRICK_MULT[trick]);
export const isFinale = (run) => run.trick === TRICKS - 1;

/** The poker hand these cards make here (Ghost ink and the Mirror Box bend the suits). */
export function evaluateRun(run, cards) {
  const rs = cards.map((d) => rank(d.c)).sort((a, b) => b - a);
  const counts = new Map();
  for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let flush = false;
  let straight = false;
  if (cards.length === 5) {
    const suitsOf = (d) => {
      if (d.ink === 'ghost') return [0, 1, 2, 3];
      const s = suit(d.c);
      return has(run, 'mirror_box') ? (s === 1 || s === 2 ? [1, 2] : [0, 3]) : [s];
    };
    flush = [0, 1, 2, 3].some((s) => cards.every((d) => suitsOf(d).includes(s)));
    if (counts.size === 5) {
      const set = new Set(rs);
      if (set.has(14)) set.add(1);
      for (let top = 14; top >= 5 && !straight; top--) { let ok = true; for (let k = 0; k < 5; k++) if (!set.has(top - k)) ok = false; straight = ok; }
    }
  }
  const top = groups[0] || [0, 0];
  let cat;
  if (straight && flush) cat = HAND.STRAIGHT_FLUSH;
  else if (top[1] === 4) cat = HAND.QUADS;
  else if (top[1] === 3 && groups[1]?.[1] === 2) cat = HAND.FULL_HOUSE;
  else if (flush) cat = HAND.FLUSH;
  else if (straight) cat = HAND.STRAIGHT;
  else if (top[1] === 3) cat = HAND.TRIPS;
  else if (top[1] === 2 && groups[1]?.[1] === 2) cat = HAND.TWO_PAIR;
  else if (top[1] === 2) cat = HAND.PAIR;
  else cat = HAND.HIGH;
  // the cards that score: all five for a straight, flush or full house; the sets otherwise; the top card alone for a high card
  let scoring;
  if ([HAND.STRAIGHT, HAND.FLUSH, HAND.FULL_HOUSE, HAND.STRAIGHT_FLUSH].includes(cat)) scoring = [...cards];
  else if (cat === HAND.HIGH) { const hi = Math.max(...cards.map((d) => rank(d.c))); scoring = [cards.find((d) => rank(d.c) === hi)]; }
  else scoring = cards.filter((d) => counts.get(rank(d.c)) >= 2);
  return { cat, name: HAND_NAMES[cat], scoring };
}

/**
 * Score a hand without playing it (the preview, and what `play` uses). `ids` in the order played.
 * Returns { cat, name, scoring (ids), steps, pips, gasps, total } — `steps` are the scoring order,
 * each with the running Pips and Gasps after it (the scene animates them one by one).
 */
export function scoreHand(run, ids) {
  const played = ids.map((id) => cardById(run, id));
  const ev = evaluateRun(run, played);
  const H = HANDS[ev.cat];
  const lv = run.levels[ev.cat] || 0;
  let pips = H.pips + lv * H.lp;
  let gasps = H.gasps + lv * H.lg;
  const steps = [];
  const step = (kind, label, extra = {}) => steps.push({ kind, label, pips, gasps: Math.round(gasps * 100) / 100, ...extra });
  step('hand', `${ev.name}${lv ? ` (Rehearsed ×${lv})` : ''}`);
  const silent = run.twist === 'gilded_cage' && run.playsMade === 0;
  const curios = silent ? [] : run.curios;
  // 2. the scoring cards
  ev.scoring.forEach((d, i) => {
    const times = 1 + (d.ink === 'twin' ? 1 : 0) + (i === 0 && curios.includes('encore') ? 1 : 0);
    for (let k = 0; k < times; k++) {
      const p = run.twist === 'mirror' && suit(d.c) === 1 ? 0 : cardPips(d.c);
      pips += p;
      step('card', `+${p}`, { id: d.id });
      if (d.ink === 'gilt') { pips += 30; step('ink', '+30 Pips', { id: d.id, ink: 'gilt' }); }
      if (d.ink === 'violet') { gasps += 4; step('ink', '+4 Gasps', { id: d.id, ink: 'violet' }); }
      if (d.ink === 'ember') { gasps *= 2; step('ink', '×2 Gasps', { id: d.id, ink: 'ember' }); }
      for (const cu of curios) {
        if (CURIOS[cu].kind !== 'card') continue;
        const r = rank(d.c);
        if (cu === 'marked_deck' && r >= 11 && r <= 13) { pips += 15; step('curio', '+15 Pips', { id: d.id, curio: cu }); }
        if (cu === 'fortune_card' && r === 14) { pips += 20; gasps += 4; step('curio', '+20 Pips +4 Gasps', { id: d.id, curio: cu }); }
        if (cu === 'thirteenth_spade' && suit(d.c) === 0) { gasps += 3; step('curio', '+3 Gasps', { id: d.id, curio: cu }); }
        if (cu === 'black_cat' && r === 7) { gasps *= 1.3; step('curio', '×1.3 Gasps', { id: d.id, curio: cu }); }
      }
    }
  });
  // 3. the cards still in your hand
  const held = run.hand.filter((id) => !ids.includes(id)).map((id) => cardById(run, id));
  for (const d of held) if (d.ink === 'steel') { gasps *= 1.5; step('held', '×1.5 Gasps', { id: d.id, ink: 'steel' }); }
  // 4. the hand curios
  const playsAfter = run.plays - 1;
  for (const cu of curios) {
    if (CURIOS[cu].kind !== 'hand') continue;
    if (cu === 'velvet_glove') { gasps += 3; step('curio', '+3 Gasps', { curio: cu }); }
    if (cu === 'stagehand_lantern' && held.length) { pips += 8 * held.length; step('curio', `+${8 * held.length} Pips`, { curio: cu }); }
    if (cu === 'dove' && ids.length === 3) { gasps *= 1.5; step('curio', '×1.5 Gasps', { curio: cu }); }
    if (cu === 'sawn_lady' && ev.cat === HAND.PAIR) { gasps *= 2; step('curio', '×2 Gasps', { curio: cu }); }
    if (cu === 'applause_machine' && playsAfter > 0) { gasps += 2 * playsAfter; step('curio', `+${2 * playsAfter} Gasps`, { curio: cu }); }
    if (cu === 'escape_chains' && playsAfter === 0) { gasps *= 2; step('curio', '×2 Gasps', { curio: cu }); }
    if (cu === 'top_hat') { const m = 1 + 0.2 * run.curios.length; gasps *= m; step('curio', `×${m.toFixed(1)} Gasps`, { curio: cu }); }
  }
  // 5. the twist
  let total = Math.floor(pips * gasps);
  if (run.twist === 'echo' && run.lastCat === ev.cat) { total = Math.floor(total / 2); step('twist', 'The Echo: half', { twist: 'echo' }); }
  steps.push({ kind: 'total', label: `${pips} × ${Math.round(gasps * 100) / 100}`, pips, gasps: Math.round(gasps * 100) / 100, total });
  return { cat: ev.cat, name: ev.name, scoring: ev.scoring.map((d) => d.id), steps, pips, gasps: Math.round(gasps * 100) / 100, total };
}

// ------------------------------------------------------------------ the run
/** A new run: a standard deck of 52, four Sparks, Act 1's Opener dealt. `seed` is any integer. */
export function newRun(seed, id = 'run') {
  const run = {
    id, rng: seed >>> 0, act: 0, trick: 0, phase: 'play', target: 0, score: 0, plays: 0, redraws: 0, playsMade: 0,
    deck: Array.from({ length: 52 }, (_, c) => ({ id: c, c, ink: null })), nextId: 52,
    draw: [], hand: [], used: [], curios: [], levels: {}, sparks: 4, shop: null, twist: null, twists: [], lastCat: null,
    actsCleared: 0, log: [], best: 0, settled: false,
  };
  // pick the three Finale twists now, all different
  run.twists = shuffleIn(run, Object.keys(TWISTS)).slice(0, ACTS);
  startTrick(run);
  return run;
}

function startTrick(run) {
  run.phase = 'play';
  run.twist = isFinale(run) ? run.twists[run.act] : null;
  run.target = targetFor(run.act, run.trick);
  run.score = 0;
  run.playsMade = 0;
  run.lastCat = null;
  run.plays = PLAYS - (run.twist === 'tight' ? 1 : 0);
  run.redraws = REDRAWS + (has(run, 'smoke_bomb') ? 1 : 0) + (has(run, 'crystal_ball') ? 1 : 0);
  run.draw = shuffleIn(run, run.deck.map((d) => d.id));
  run.hand = [];
  run.used = [];
  fill(run);
}

function fill(run) {
  while (run.hand.length < handSize(run) && run.draw.length) run.hand.push(run.draw.pop());
}

/** The next cards off the deck (for the Crystal Ball). */
export const peek = (run, n = 3) => run.draw.slice(-n).reverse();

function checkIds(run, ids, max = 5) {
  if (run.phase !== 'play') throw new Error('rogue: not in play');
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > max) throw new Error('rogue: play one to five cards');
  if (new Set(ids).size !== ids.length || ids.some((id) => !run.hand.includes(id))) throw new Error('rogue: those cards are not in your hand');
}

/** Play cards. Returns the scoring (and the run moves on: a Trick won, lost, or carried on). */
export function play(run, ids) {
  checkIds(run, ids);
  if (run.plays <= 0) throw new Error('rogue: no plays left');
  const res = scoreHand(run, ids);
  run.score += res.total;
  run.best = Math.max(run.best, res.total);
  run.plays--;
  run.playsMade++;
  run.lastCat = res.cat;
  run.hand = run.hand.filter((id) => !ids.includes(id));
  // Ember cards burn away; the rest go to the used pile
  const burnt = res.scoring.filter((id) => cardById(run, id)?.ink === 'ember');
  run.deck = run.deck.filter((d) => !burnt.includes(d.id));
  run.used.push(...ids.filter((id) => !burnt.includes(id)));
  run.log.push({ act: run.act, trick: run.trick, hand: res.name, total: res.total });
  if (run.log.length > 40) run.log.shift();
  res.burnt = burnt;
  if (run.score >= run.target) {
    res.won = true;
    winTrick(run, res);
  } else if (run.plays <= 0 || (!run.hand.length && !run.draw.length)) {
    res.lost = true;
    run.phase = 'lost';
  } else fill(run);
  return res;
}

/** Put cards back and draw as many (a Redraw). */
export function redraw(run, ids) {
  checkIds(run, ids);
  if (run.redraws <= 0) throw new Error('rogue: no redraws left');
  run.redraws--;
  run.hand = run.hand.filter((id) => !ids.includes(id));
  run.used.push(...ids);
  fill(run);
  return { drawn: ids.length };
}

function winTrick(run, res) {
  const earned = 3 + run.plays + (isFinale(run) ? 2 : 0) + (has(run, 'disappearing_coin') ? 2 : 0);
  run.sparks += earned;
  res.sparks = earned;
  if (isFinale(run)) run.actsCleared = run.act + 1;
  if (isFinale(run) && run.act === ACTS - 1) { run.phase = 'won'; return; }
  run.phase = 'shop';
  run.shop = makeShop(run);
}

// ------------------------------------------------------------------ Morganius's Cabinet
function makeShop(run) {
  const owned = new Set(run.curios);
  const pool = Object.keys(CURIOS).filter((k) => !owned.has(k));
  const curios = [];
  while (curios.length < 3 && pool.length) {
    // rarer wonders turn up less often
    const weights = pool.map((k) => [5, 3, 1.5][CURIOS[k].rarity - 1]);
    let r = next(run) * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while ((r -= weights[i]) > 0) i++;
    const k = pool.splice(Math.min(i, pool.length - 1), 1)[0];
    curios.push({ kind: 'curio', id: k, cost: CURIO_COST[CURIOS[k].rarity] });
  }
  const inks = [];
  const plain = run.deck.filter((d) => !d.ink);
  const inkIds = Object.keys(INKS);
  for (let n = 0; n < 2 && plain.length; n++) {
    const d = plain.splice(int(run, plain.length), 1)[0];
    const ink = inkIds[int(run, inkIds.length)];
    inks.push({ kind: 'ink', card: d.id, ink, cost: ink === 'ember' || ink === 'twin' ? 5 : 3 });
  }
  const cats = [HAND.PAIR, HAND.TWO_PAIR, HAND.TRIPS, HAND.STRAIGHT, HAND.FLUSH, HAND.FULL_HOUSE, HAND.HIGH, HAND.QUADS];
  const rehearsal = { kind: 'rehearsal', cat: cats[Math.min(cats.length - 1, Math.floor(next(run) ** 1.6 * cats.length))], cost: 3 };
  return { items: [...curios, ...inks, rehearsal].map((x) => ({ ...x, sold: false })), rerolls: 0, vanishCost: 2, vanished: false };
}

/** Buy item `i` from the Cabinet (a Vanishing takes the card to remove: `card`). */
export function buy(run, i, opts = {}) {
  if (run.phase !== 'shop') throw new Error('rogue: the Cabinet is closed');
  const it = run.shop.items[i];
  if (!it || it.sold) return { ok: false, text: 'Gone already.' };
  if (it.cost > run.sparks) return { ok: false, text: `That costs ${it.cost} Sparks.` };
  if (it.kind === 'curio' && run.curios.length >= MAX_CURIOS) return { ok: false, text: `You can hold ${MAX_CURIOS} Curios. Part with one first.` };
  if (it.kind === 'ink' && !cardById(run, it.card)) return { ok: false, text: 'That card has gone.' };
  run.sparks -= it.cost;
  it.sold = true;
  if (it.kind === 'curio') run.curios.push(it.id);
  if (it.kind === 'ink') cardById(run, it.card).ink = it.ink;
  if (it.kind === 'rehearsal') run.levels[it.cat] = (run.levels[it.cat] || 0) + 1;
  void opts;
  return { ok: true };
}

/** Vanish a card from your deck (once per visit). */
export function vanish(run, cardId) {
  if (run.phase !== 'shop') throw new Error('rogue: the Cabinet is closed');
  if (run.shop.vanished) return { ok: false, text: 'One vanishing per visit.' };
  if (run.sparks < run.shop.vanishCost) return { ok: false, text: `A vanishing costs ${run.shop.vanishCost} Sparks.` };
  if (run.deck.length <= 20) return { ok: false, text: 'Your deck is thin enough.' };
  if (!cardById(run, cardId)) return { ok: false, text: 'No such card.' };
  run.sparks -= run.shop.vanishCost;
  run.shop.vanished = true;
  run.deck = run.deck.filter((d) => d.id !== cardId);
  return { ok: true };
}

/** Part with a Curio (for nothing: Morganius keeps it). */
export function release(run, curio) {
  const i = run.curios.indexOf(curio);
  if (i < 0) return { ok: false };
  run.curios.splice(i, 1);
  return { ok: true };
}

/** New stock: 1 Spark, then one more each time. */
export function reroll(run) {
  if (run.phase !== 'shop') throw new Error('rogue: the Cabinet is closed');
  const cost = 1 + run.shop.rerolls;
  if (run.sparks < cost) return { ok: false, text: `A new look costs ${cost} Sparks.` };
  run.sparks -= cost;
  const keep = { rerolls: run.shop.rerolls + 1, vanished: run.shop.vanished };
  run.shop = { ...makeShop(run), ...keep };
  return { ok: true };
}

/** Leave the Cabinet: on to the next Trick. */
export function nextTrick(run) {
  if (run.phase !== 'shop') throw new Error('rogue: the Cabinet is closed');
  run.shop = null;
  if (run.trick === TRICKS - 1) { run.act++; run.trick = 0; } else run.trick++;
  startTrick(run);
}

/** Give up the run where it stands (it ends; Acts cleared still count). */
export function concede(run) {
  if (run.phase === 'won' || run.phase === 'lost') return;
  run.phase = 'lost';
}

export const finished = (run) => run.phase === 'won' || run.phase === 'lost';
export const payout = (run) => PAYOUT[run.actsCleared] || 0;
