// The wider world's companies (v0.60.0): how they are made and how a day goes for each. Pure
// functions over plain records — no game state, no DOM, no RNG (only hashes of ids and days, so
// the same save always gives the same history). `K` is CORP from src/content/corporate.js.
//
//   poolAt(K, sector, day, extra)       what a sector's customers buy in a day
//   makeCompany(K, spec)                a new company from its id (everything about it a hash of that)
//   allocate(demand, parts)             how a day's demand is shared by capacity, standing and price
//   stepDay(K, companies, ctx)          one day for every company in a sector → what was sold
//   monthEnd(K, world, day, ctx)        a month's entries, exits and mergers
//
// A company is: capacity (daily sales it can carry) · cash · debt · plant (what its capacity cost to
// build). Each day it sells what its share of the pool and its capacity allow, pays for what it sold
// and for being open, pays interest, and keeps what is left. Cash it does not have is borrowed (up to
// a limit set by what it earns) or not paid; a company short of cash for too long goes under, its plant
// sold and its lenders taking the loss — nothing is ever paid out of thin air.
import { hashUnit } from '../aero/config.js';
import { investShift, entryFactor } from './bank.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v) => Math.round(v);
const r3 = (v) => Math.round(v * 1000) / 1000;
export const MONTH = 30;
export const monthOf = (day) => Math.floor((day - 1) / MONTH); // the history before day 1 has negative months

// ------------------------------------------------------------------ the pool
/** What a sector's customers buy a day: its size, drifting up, with a slow cycle; arms reads the real arms market. */
export function poolAt(K, sector, day, extra = {}) {
  const S = K.sectors[sector];
  const phase = hashUnit(`pool|${sector}`) * Math.PI * 2;
  const wave = 1 + S.wave * Math.sin((2 * Math.PI * day) / S.period + phase);
  const drift = 1 + (S.growth * day) / 365;
  let base = S.pool;
  if (sector === 'arms' && extra.armsIncome) base = extra.armsIncome * K.armsPool.perIncome * (1 + K.armsPool.perWar * (extra.wars || 0));
  return base * drift * wave * (extra.demand?.[sector] ?? 1);
}

// ------------------------------------------------------------------ making one
const pickBy = (list, key, salt = '') => list[Math.floor(hashUnit(`${salt}|${key}`) * list.length) % list.length];

function sizeFor(K, key, salt = '') {
  const r = hashUnit(`${salt}|${key}|size`);
  let acc = 0;
  for (const [name, s] of Object.entries(K.sizes)) { acc += s.w; if (r < acc) return name; }
  return 'mid';
}

/**
 * A company from a spec { id, sector, country, day, name, ticker?, size? }. Its character — size,
 * speciality, strategy, risk, management, standing, efficiency, price level — is a hash of its id,
 * so it can never change; the money it starts with follows from them.
 */
export function makeCompany(K, { id, sector, country, day, name, ticker = null, size = null, pool, salt = '' }) {
  const S = K.sectors[sector];
  const h = (k) => hashUnit(`${salt}|${id}|${k}`);
  size = size || sizeFor(K, id, salt);
  const strategy = pickBy(Object.keys(K.strategies), `${id}|strategy`, salt);
  const mgmt = r3(clamp(0.25 + h('mgmt') * 0.7, 0, 1)); // management quality
  const effic = r3(clamp(0.85 + h('effic') * 0.3 + (mgmt - 0.5) * 0.1, 0.8, 1.2));
  const capacity = Math.max(500, round(pool * K.sizes[size].share * (0.7 + h('cap') * 0.6)));
  const fixed = capacity * S.margin * K.fixedOfMargin;
  const priceLevel = r3(clamp(1 + K.strategies[strategy].price + (h('price') - 0.5) * 0.06, 0.9, 1.1));
  const risk = r3(clamp(0.15 + h('risk') * 0.7, 0, 1));
  const plant = capacity * K.plantCost * K.plantBook;
  const c = {
    id, name, kind: 'generated', sector, country, size, strategy, ticker, listed: Boolean(ticker),
    speciality: pickBy(S.specialities, `${id}|spec`, salt),
    age: Math.round(2 + h('age') * 70), // years old when the game began
    founded: day,
    mgmt, effic, priceLevel, risk, rep: r3(clamp(0.35 + h('rep') * 0.55, 0, 1)),
    capacity, util: 0.75, plantValue: plant,
    cash: round(fixed * (30 + h('cash') * 120)),
    debt: round(plant * (0.05 + h('debt') * 0.45 * K.strategies[strategy].debt)),
    shares: ticker ? Math.round(K.shares[size][0] + h('shares') * (K.shares[size][1] - K.shares[size][0])) : null,
    status: 'active', negDays: 0, closedDay: null, mergedInto: null,
    months: [], // [month, revenue, cogs, fixed, interest, net, capex, dividends] — newest last
    totals: { revenue: 0, net: 0 },
  };
  return c;
}

// ------------------------------------------------------------------ a day
/** Share a day's demand: each takes by weight, none beyond its capacity, what is left over goes to the rest. */
export function allocate(demand, parts) {
  const sold = parts.map(() => 0);
  let remaining = Math.max(0, demand);
  let open = parts.map((_, i) => i);
  for (let pass = 0; pass < 6 && open.length && remaining > 1e-6; pass++) {
    const totalW = open.reduce((a, i) => a + parts[i].w, 0);
    if (totalW <= 0) break;
    const next = [];
    let used = 0;
    for (const i of open) {
      const want = (remaining * parts[i].w) / totalW;
      const room = parts[i].cap - sold[i];
      if (want >= room) { sold[i] += room; used += room; } else { sold[i] += want; used += want; next.push(i); }
    }
    remaining -= used;
    if (next.length === open.length) break; // everyone took their share and had room: done
    open = next;
  }
  return sold;
}

const margin = (K, c, ctx) => {
  const S = K.sectors[c.sector];
  return clamp(S.margin * c.effic + (c.priceLevel - 1) * 0.8 - (ctx.cost?.[c.sector] ? (ctx.cost[c.sector] - 1) * (1 - S.margin) : 0), -0.2, 0.6);
};

function book(c, day) {
  const m = monthOf(day);
  let row = c.months.at(-1);
  if (!row || row[0] !== m) { row = [m, 0, 0, 0, 0, 0, 0, 0]; c.months.push(row); while (c.months.length > 24) c.months.shift(); }
  return row;
}

/**
 * One day for every company of one sector. `demand` is the sector's pool less what the player's
 * business and the older companies already sold. Returns { sold, utilisation }.
 */
export function stepDay(K, companies, demand, day, ctx = {}) {
  const live = companies.filter((c) => c.status === 'active' || c.status === 'distressed');
  const parts = live.map((c) => ({ cap: c.capacity, w: c.capacity * (0.7 + 0.6 * c.rep) * (1.5 - c.priceLevel) }));
  const sold = allocate(demand, parts);
  let total = 0;
  live.forEach((c, i) => {
    const rev = sold[i];
    total += rev;
    const gm = margin(K, c, ctx);
    const cogs = rev * (1 - gm);
    const S = K.sectors[c.sector];
    const fixed = c.capacity * S.margin * K.fixedOfMargin;
    const rate = (ctx.rate ?? K.baseRate) + 0.01 + c.risk * 0.04;
    const interest = (c.debt * rate) / 365;
    const net = rev - cogs - fixed - interest;
    c.cash += net;
    c.util += ((c.capacity ? rev / c.capacity : 0) - c.util) / 30;
    const row = book(c, day);
    row[1] += rev; row[2] += cogs; row[3] += fixed; row[4] += interest; row[5] += net;
    c.totals.revenue += rev; c.totals.net += net;
    c.lastNet = net;
    treasury(K, c, day, row, ctx);
    tidy(c, row);
  });
  const cap = live.reduce((a, c) => a + c.capacity, 0);
  return { sold: total, utilisation: cap ? total / cap : 0 };
}

/** Keep what is saved small: whole obols, a few decimals — a company's books are never finer than that. */
function tidy(c, row) {
  c.cash = round(c.cash); c.debt = round(c.debt); c.capacity = round(c.capacity); c.plantValue = round(c.plantValue);
  c.util = Math.round(c.util * 10000) / 10000;
  c.totals.revenue = round(c.totals.revenue); c.totals.net = round(c.totals.net);
  c.lastNet = round(c.lastNet);
  for (let i = 1; i < row.length; i++) row[i] = round(row[i]);
}

/** What a company does with its cash: borrow what it can when short, repay when flush, build when busy, shed when idle, go under when broke. */
function treasury(K, c, day, row, ctx) {
  const S = K.sectors[c.sector];
  const T = K.strategies[c.strategy];
  const fixed = c.capacity * S.margin * K.fixedOfMargin;
  const annual = Math.max(0, (c.lastNet ?? 0) * 365);
  const limit = Math.max(c.plantValue * 0.5, annual * 3 * T.debt);
  if (c.cash < 0) {
    const draw = Math.min(-c.cash + fixed * 20, Math.max(0, limit - c.debt));
    if (draw > 0) { c.debt += draw; c.cash += draw; }
  } else if (c.debt > 0 && c.cash > fixed * 120) {
    const pay = Math.min(c.debt, (c.cash - fixed * 90) * 0.1);
    c.debt -= pay; c.cash -= pay;
  }
  if (c.cash < 0) {
    c.negDays++;
    if (c.status === 'active') c.status = 'distressed';
    if (c.negDays >= K.insolventDays) failure(K, c, day);
    return;
  }
  c.negDays = 0;
  if (c.status === 'distressed' && c.cash > fixed * 20) c.status = 'active';
  // build: busy, with money to spare
  if (c.status === 'active' && c.util > T.invest + investShift(ctx?.rate ?? K.baseRate) && c.cash > fixed * 60 && c.capacity < K.sectors[c.sector].pool * 0.4) {
    const spend = Math.min(c.cash * 0.25, c.capacity * 0.04 * K.plantCost);
    const add = spend / K.plantCost;
    c.cash -= spend; c.capacity += add; c.plantValue += spend * K.plantBook; row[6] += spend;
  }
  // shed: idle for a long time — the plant is sold at half its book value
  if (c.util < 0.45 && c.capacity > 800) {
    const cut = c.capacity * 0.01;
    c.capacity -= cut;
    const gain = (c.plantValue * 0.5 * cut) / (c.capacity + cut);
    c.plantValue -= (c.plantValue * cut) / (c.capacity + cut);
    c.cash += gain;
  }
  // plant wears: a thirtieth of a percent a day
  c.plantValue *= 1 - 0.0003;
}

/** A company that cannot pay is wound up: the plant is sold at 40% of its book value to its lenders, who take the rest as a loss. */
function failure(K, c, day) {
  const recover = c.plantValue * 0.4;
  const paid = Math.min(c.debt, recover);
  c.lossToLenders = Math.max(0, Math.round(c.debt - paid + Math.max(0, -c.cash)));
  c.debt = 0; c.cash = 0; c.capacity = 0; c.plantValue = 0;
  c.status = 'closed'; c.closedDay = day;
}

// ------------------------------------------------------------------ a month
/**
 * Month's end for a world { companies, nextId }: dividends to the shareholders of the listed,
 * mergers of the failing into the strong, a new entrant where the sector is busy, and the oldest
 * closed records forgotten past the cap. `makeName(sector, country, id)` and `makeTicker` come from
 * the caller (they need the names already taken). Returns what happened, as lines.
 */
export function monthEnd(K, world, day, ctx, { makeName, makeTicker, countries }) {
  const out = [];
  // to the owners: 40% of last month's profit for a listed company, 30% for a private one — if it can spare it
  for (const c of world.companies) {
    if (c.status !== 'active') continue;
    const m = c.months.at(-2);
    if (!m || m[5] <= 0) continue;
    const S = K.sectors[c.sector];
    const fixed = c.capacity * S.margin * K.fixedOfMargin;
    const div = Math.round(Math.min(m[5] * (c.listed ? 0.4 : 0.3), Math.max(0, c.cash - fixed * 60)));
    if (div > 0) { c.cash -= div; m[7] += div; }
  }
  // mergers: a distressed company is taken over by the strongest in its sector that can pay
  for (const c of world.companies) {
    if (c.status !== 'distressed' || c.capacity <= 0) continue;
    const buyers = world.companies.filter((b) => b.sector === c.sector && b.status === 'active' && b.id !== c.id && b.cash > c.plantValue * 0.6).sort((a, b) => b.cash - a.cash);
    const b = buyers[0];
    if (!b) continue;
    const price = Math.max(0, Math.round(c.plantValue * 0.5 - c.debt));
    b.cash -= price;
    b.debt += c.debt;
    b.capacity += round(c.capacity * 0.8);
    b.plantValue += round(c.plantValue * 0.8);
    c.debt = 0; c.cash = 0; c.capacity = 0; c.plantValue = 0;
    c.status = 'merged'; c.mergedInto = b.id; c.closedDay = day;
    out.push({ kind: 'merger', sector: c.sector, id: c.id, into: b.id, text: `${b.name} has taken over the failing ${c.name}.` });
  }
  // entry: a sector whose companies are all busy draws a newcomer (never beyond the caps)
  const alive = world.companies.filter((c) => c.status === 'active' || c.status === 'distressed');
  let entered = 0;
  for (const sector of Object.keys(K.sectors)) {
    if (entered >= K.entry.perMonth || alive.length + entered >= K.cap.alive) break;
    const mine = alive.filter((c) => c.sector === sector);
    if (!mine.length) continue;
    const cap = mine.reduce((a, c) => a + c.capacity, 0);
    const util = mine.reduce((a, c) => a + c.util * c.capacity, 0) / Math.max(1, cap);
    if (util < K.entry.busy) continue;
    if (day - (world.lastEntry[sector] ?? -9999) < K.entry.cooldown) continue;
    if (hashUnit(`${world.salt}|entry|${sector}|${monthOf(day)}`) >= K.entry.chance * entryFactor(ctx.rate ?? K.baseRate)) continue;
    world.lastEntry[sector] = day;
    const id = `gen_${world.nextId++}`;
    const country = countries[Math.floor(hashUnit(`${world.salt}|${id}|country`) * countries.length)];
    const pool = poolAt(K, sector, day, ctx.poolExtra || {});
    const name = makeName(sector, country, id);
    const c = makeCompany(K, { id, sector, country, day, name, size: 'small', pool, salt: world.salt });
    c.age = 0; c.cash = Math.round(c.capacity * K.sectors[sector].margin * K.fixedOfMargin * 120); c.debt = 0;
    world.companies.push(c);
    entered++;
    out.push({ kind: 'entry', sector, id, text: `${c.name} (${c.country}) has entered the ${sector} business.` });
  }
  // forget the oldest closed records past the cap
  const closed = world.companies.filter((c) => c.status === 'closed' || c.status === 'merged').sort((a, b) => a.closedDay - b.closedDay);
  while (world.companies.length > K.cap.records && closed.length) world.companies.splice(world.companies.indexOf(closed.shift()), 1);
  return out;
}
