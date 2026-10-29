// Making the wider world (v0.60.0): the first population of companies, once, from a seed. Pure.
//
//   buildWorld(K, ctx)      → { salt, nextId, companies } and a history before the game begins
//   namer(K, taken)         → { makeName, makeTicker } that never repeat a name or a ticker
//
// Everything about a company is a hash of the world's salt and its id, so the same save always
// holds the same companies — and a save only ever makes them once (src/systems/corporate.js).
import { hashUnit } from '../aero/config.js';
import { validateName } from './identity.js';
import { makeCompany, poolAt, stepDay, monthEnd, MONTH } from './sim.js';

const RESERVED_TICKERS = ['OBRO', 'CHZ', 'MRDN'];

/** Names and tickers that never repeat one already used. `taken` is a Set of lower-case names; `tickers` a Set of tickers. */
export function namer(K, taken, tickers, salt) {
  const makeName = (sector, country, id) => {
    const stems = K.stems[country] || K.stems.home;
    const sufs = K.suffix[sector];
    const base = Math.floor(hashUnit(`${salt}|${id}|stem`) * stems.length);
    const sb = Math.floor(hashUnit(`${salt}|${id}|suf`) * sufs.length);
    for (let i = 0; i < stems.length * sufs.length; i++) {
      const name = `${stems[(base + i) % stems.length]} ${sufs[(sb + Math.floor(i / stems.length)) % sufs.length]}`;
      if (!taken.has(name.toLowerCase()) && validateName(name).ok) { taken.add(name.toLowerCase()); return name; }
    }
    let n = 2;
    for (;;) { const name = `${stems[base]} ${sufs[sb]} ${n++}`; if (!taken.has(name.toLowerCase())) { taken.add(name.toLowerCase()); return name; } }
  };
  const makeTicker = (name) => {
    const letters = name.toUpperCase().replace(/[^A-Z ]/g, '').split(' ');
    const stem = letters[0];
    const tries = [stem.slice(0, 3), stem.slice(0, 4), stem[0] + stem.slice(1).replace(/[AEIOU]/g, '').slice(0, 2), `${stem[0]}${(letters[1] || 'X')[0]}${stem[1] || 'X'}`];
    for (const t of tries) if (t.length >= 3 && !tickers.has(t) && !RESERVED_TICKERS.includes(t)) { tickers.add(t); return t; }
    for (let i = 2; ; i++) { const t = `${stem.slice(0, 3)}${i}`; if (!tickers.has(t)) { tickers.add(t); return t; } }
  };
  return { makeName, makeTicker };
}

/**
 * The first population, then `warmupDays` of history before `day`. `ctx`: { salt, day, names (taken), countries,
 * poolExtra }. Returns { world: { salt, nextId, companies }, N } — N (the namer) is not saved; see rebuildNamer.
 */
export function buildWorld(K, { salt, day, taken, countries, poolExtra = {} }) {
  const tickers = new Set(RESERVED_TICKERS);
  const N = namer(K, taken, tickers, salt);
  const world = { salt, nextId: 1, lastEntry: {}, companies: [] };
  for (const [sector, S] of Object.entries(K.sectors)) {
    const pool = poolAt(K, sector, day - K.warmupDays, poolExtra);
    const mine = [];
    for (let i = 0; i < S.count; i++) {
      const id = `gen_${world.nextId++}`;
      const country = countries[Math.floor(hashUnit(`${salt}|${id}|country`) * countries.length)];
      mine.push(makeCompany(K, { id, sector, country, day: day - K.warmupDays, name: N.makeName(sector, country, id), pool, salt }));
    }
    // sizes are drawn by chance: scale the sector's capacity so that, together, it can carry about 115% of the pool
    const cap = mine.reduce((a, c) => a + c.capacity, 0);
    const k = (pool * 1.15) / cap;
    for (const c of mine) {
      c.capacity = Math.max(500, Math.round(c.capacity * k));
      c.plantValue = c.capacity * K.plantCost * K.plantBook;
      const fixed = c.capacity * S.margin * K.fixedOfMargin;
      c.cash = Math.round(fixed * (30 + hashUnit(`${salt}|${c.id}|cash`) * 120));
      c.debt = Math.round(c.plantValue * (0.05 + hashUnit(`${salt}|${c.id}|debt`) * 0.45 * K.strategies[c.strategy].debt));
    }
    world.companies.push(...mine);
  }
  // the biggest 38% are listed, each with a ticker of its own
  const byCap = [...world.companies].sort((a, b) => b.capacity - a.capacity);
  const listed = Math.round(world.companies.length * K.listedShare);
  for (const c of byCap.slice(0, listed)) {
    c.listed = true;
    c.ticker = N.makeTicker(c.name);
    c.shares = Math.round(K.shares[c.size][0] + hashUnit(`${salt}|${c.id}|shares`) * (K.shares[c.size][1] - K.shares[c.size][0]));
  }
  return { world, N };
}

/** A namer for a world loaded from a save: the names and tickers already in use are the records' own. */
export function rebuildNamer(K, world, takenNames) {
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  const tickers = new Set(RESERVED_TICKERS);
  for (const c of world.companies) { taken.add(c.name.toLowerCase()); if (c.ticker) tickers.add(c.ticker); }
  return namer(K, taken, tickers, world.salt);
}

/** Run the world from `from` to `to` (inclusive), a day at a time. `demandFor(sector, day)` is what the sector sells that day to others. */
export function advance(K, world, from, to, ctxFor, N, countries, news = null) {
  for (let day = from; day <= to; day++) {
    const ctx = ctxFor(day);
    for (const sector of Object.keys(K.sectors)) {
      const mine = world.companies.filter((c) => c.sector === sector);
      const pool = poolAt(K, sector, day, ctx.poolExtra || {});
      const demand = Math.max(pool * 0.25, pool - (ctx.external?.[sector] || 0));
      stepDay(K, mine, demand, day, ctx);
    }
    if ((((day - 1) % MONTH) + MONTH) % MONTH === 0) {
      const lines = monthEnd(K, world, day, ctx, { makeName: N.makeName, makeTicker: N.makeTicker, countries });
      for (const l of lines) news?.push({ day, ...l });
    }
  }
}
