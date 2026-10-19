// The Phonograph Grand (v0.52.0): the casino's books, its tables and its host.
//
// Everything that changes chips goes through here, and only here:
//   • the cage: obols ⇄ chips at a fixed rate (CASINO.chipRate), only while someone's behind it
//   • a seat: one table at a time, a seat reserved while you're at it and given back when you go
//   • a bet takes chips once (`debit`); a round's winnings are paid once (`credit` with the
//     round's id — a round paid is marked paid, and a second payment is refused)
// The rules live in src/casino/ (pure); the scene you play in (src/ui/casinoTable.js) only shows
// what this decides. All of it is saved under world.casino.
//
// Morganius Spade hosts: when you sit down he drops what he's doing and flies over (the arrival,
// `host`), stays at your table while you play, and drifts back to his rounds of the floor when you
// leave. Between games he roams the floor from one of his favourite places to the next.
import { spin as spinWheel, settle as settleWheel, validBet, colourOf } from '../casino/roulette.js';
import { act as bjAct, deal as bjDeal, legalActions, standAll, totalBet } from '../casino/blackjack.js';
import { TILE } from '../core/util.js';
import { newRun, play as rPlay, redraw as rRedraw, buy as rBuy, vanish as rVanish, reroll as rReroll, nextTrick as rNext, release as rRelease, concede as rConcede, finished as rFinished, payout as rPayout, ENTRY as ROGUE_ENTRY } from '../casino/rogue.js';

const HOST = 'npc_morganius';
const FLOOR = 'phonograph_casino';
/** Morganius's favourite places on the floor, and how much he likes each. */
const ROAM = [['m_stage', 5], ['m_centre', 4], ['m_roulette', 2], ['m_blackjack', 2], ['m_poker', 2], ['m_lounge', 1.5], ['m_overlook', 2], ['m_slots', 1]];
const LEDGER_KEEP = 60;
const OPEN_GAMES = new Set(['roulette', 'blackjack', 'spade']); // v0.52.0; Morganius's table v0.53.0; Hold'em follows

export class Casino {
  constructor(game) {
    this.game = game;
    this.arrival = null; // the host's flight to your table (not saved: it's over in a second or two)
  }

  get state() {
    const w = this.game.world;
    if (!w.casino) w.casino = { chips: 0, seq: 0, ledger: [], paid: {}, session: null, tables: {}, history: {}, stats: { bought: 0, cashed: 0, staked: 0, returned: 0, rounds: 0, biggest: 0 }, roamAt: 0, visits: 0 };
    return w.casino;
  }

  get config() {
    return this.game.content.casino;
  }

  get chips() {
    return this.state.chips;
  }

  table(id) {
    return this.config.tables[id] || null;
  }

  tableState(id) {
    const s = this.state.tables;
    if (!s[id]) s[id] = { occupants: [], shoe: null, round: null, bets: [], roundId: null };
    return s[id];
  }

  // ------------------------------------------------------------------ the books
  record(kind, amount, extra = {}) {
    const s = this.state;
    const id = `tx${++s.seq}`;
    s.ledger.push({ id, kind, amount, chips: s.chips, money: this.game.player.money, day: this.game.clock.day, time: this.game.clock.timeString, ...extra });
    if (s.ledger.length > LEDGER_KEEP) s.ledger.splice(0, s.ledger.length - LEDGER_KEEP);
    return id;
  }

  /** Take chips for a bet. False (and nothing taken) if you haven't got them. */
  debit(amount, ref) {
    if (!(amount > 0) || !Number.isInteger(amount) || amount > this.state.chips) return false;
    this.state.chips -= amount;
    this.state.stats.staked += amount;
    this.record('bet', -amount, { ref });
    return true;
  }

  /** Pay a round's return — once per round id. */
  credit(amount, ref) {
    const s = this.state;
    if (s.paid[ref]) return false;
    s.paid[ref] = true;
    const keys = Object.keys(s.paid);
    if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete s.paid[k];
    if (amount > 0) {
      s.chips += amount;
      s.stats.returned += amount;
      this.record('win', amount, { ref });
    }
    return true;
  }

  newRoundId(table) {
    return `${table}#${++this.state.seq}`;
  }

  // ------------------------------------------------------------------ the cage
  /** Who's behind the cage: Octavius if he's at it, else Vera on her shift. */
  cashier() {
    const g = this.game;
    const floor = g.maps.get(FLOOR);
    for (const [id, spot] of [['npc_octavius', 'cage_owner'], ['npc_vera', 'cage_cashier']]) {
      const n = g.npcs.get(id);
      const at = floor?.spotPx(spot);
      if (n && at && n.map === FLOOR && !n.dead && n.activity === 'cashier' && Math.hypot(n.x - at.x, n.y - at.y) < TILE * 1.5) return n;
    }
    return null;
  }

  /** Change obols into chips ('buy') or chips back into obols ('cash'). */
  exchange(dir, amount) {
    const g = this.game;
    const s = this.state;
    const n = Math.floor(Number(amount));
    if (!this.cashier()) return { ok: false, text: 'Nobody is behind the cage.' };
    if (!(n > 0)) return { ok: false, text: 'How many?' };
    const rate = this.config.chipRate;
    if (dir === 'buy') {
      if (n < this.config.minBuy) return { ok: false, text: `The cage sells chips from ${this.config.minBuy} up.` };
      if (n * rate > g.player.money) return { ok: false, text: `That's ${n * rate} obols; you have ${g.player.money}.` };
      g.player.money -= n * rate;
      s.chips += n;
      s.stats.bought += n;
      this.record('buy', n);
      g.bus.emit('sfx', { id: 'sfx_coin' });
      return { ok: true, text: `${n} chips for ${n * rate} obols.` };
    }
    if (dir === 'cash') {
      if (n > s.chips) return { ok: false, text: `You have ${s.chips} chips.` };
      if (s.session) return { ok: false, text: 'Leave the table first.' };
      s.chips -= n;
      g.player.money += n * rate;
      s.stats.cashed += n;
      this.record('cash', -n);
      g.bus.emit('sfx', { id: 'sfx_coin' });
      return { ok: true, text: `${n * rate} obols for ${n} chips.` };
    }
    return { ok: false, text: 'The cage only buys and sells chips.' };
  }

  // ------------------------------------------------------------------ seats
  /** Free seats at a table (NPC occupants and you count). */
  freeSeats(tableId) {
    const t = this.table(tableId);
    const ts = this.tableState(tableId);
    const me = this.state.session?.table === tableId ? 1 : 0;
    return Math.max(0, t.seats - ts.occupants.length - me);
  }

  /** Sit down at a table. Returns { ok, text } — or { ok, arrival } when the host is coming. */
  sit(tableId) {
    const g = this.game;
    const s = this.state;
    const t = this.table(tableId);
    if (!t) return { ok: false, text: 'There\'s no such table.' };
    if (s.session) return { ok: false, text: 'You\'re already at a table.' };
    if (!OPEN_GAMES.has(t.game)) return { ok: false, text: 'The Hold\'em tables are being dressed: green baize, fresh decks, a sign — "OPENING SOON. — O.T.P."' };
    if (g.player.map !== FLOOR) return { ok: false, text: 'The tables are on the casino floor.' };
    if (t.game === 'spade' && this.rogue.run && !rFinished(this.rogue.run)) { /* a run in progress: sit and carry on, no stake needed */ } else if (s.chips < t.min) return { ok: false, text: `${t.name}: the minimum bet is ${t.min} chip${t.min === 1 ? '' : 's'}. You have ${s.chips}. Chips are at the cage.` };
    if (this.freeSeats(tableId) <= 0) return { ok: false, text: 'Every seat at that table is taken.' };
    s.session = { id: `s${++s.seq}`, table: tableId, game: t.game, at: g.clock.total, from: { map: g.player.map, x: g.player.x, y: g.player.y, facing: g.player.facing } };
    s.visits++;
    this.summonHost(tableId);
    return { ok: true, arrival: true };
  }

  /** May you get up now? (Not with a hand being played or a wheel spinning.) */
  canLeave() {
    const s = this.state.session;
    if (!s) return true;
    const ts = this.tableState(s.table);
    if (s.game === 'blackjack' && ts.round && ts.round.phase === 'player') return false;
    return true;
  }

  /**
   * Get up from the table. Chips left on an unspun roulette layout come back to you; a hand of
   * blackjack still being played stands (and is settled) — nothing is re-dealt, nothing escapes.
   */
  leave() {
    const g = this.game;
    const s = this.state;
    const sess = s.session;
    if (!sess) return { ok: true };
    const ts = this.tableState(sess.table);
    if (sess.game === 'roulette' && ts.bets.length) this.clearBets(sess.table);
    if (sess.game === 'blackjack' && ts.round && ts.round.phase === 'player') {
      standAll(ts.round);
      this.settleBlackjack(sess.table);
    }
    s.session = null;
    // back where you sat down (a step back from the table)
    const p = g.player;
    if (p.map === sess.from.map) { p.x = sess.from.x; p.y = sess.from.y; p.facing = sess.from.facing || p.facing; }
    this.arrival = null;
    this.releaseHost();
    return { ok: true };
  }

  // ------------------------------------------------------------------ roulette
  /** Put chips on the layout (taken now; given back if you clear them before the spin). */
  placeBet(bet) {
    const sess = this.state.session;
    if (!sess || sess.game !== 'roulette') return { ok: false, text: 'Sit at a roulette table first.' };
    const t = this.table(sess.table);
    const ts = this.tableState(sess.table);
    const b = { type: bet.type, value: bet.value, amount: Math.floor(bet.amount) };
    if (!validBet(b)) return { ok: false, text: 'The croupier doesn\'t take that bet.' };
    const onTable = ts.bets.reduce((a, x) => a + x.amount, 0);
    if (onTable + b.amount > t.max) return { ok: false, text: `The table's limit is ${t.max} a spin.` };
    if (!this.debit(b.amount, `${sess.table}:layout`)) return { ok: false, text: 'Not enough chips.' };
    const same = ts.bets.find((x) => x.type === b.type && x.value === b.value);
    if (same) same.amount += b.amount; else ts.bets.push(b);
    return { ok: true };
  }

  clearBets(tableId) {
    const ts = this.tableState(tableId);
    const back = ts.bets.reduce((a, x) => a + x.amount, 0);
    if (back > 0) {
      this.state.chips += back;
      this.state.stats.staked -= back;
      this.record('refund', back, { ref: `${tableId}:layout` });
    }
    ts.bets = [];
    return back;
  }

  /** Spin: the wheel decides, the layout is settled, and the result is what the scene shows. */
  spin() {
    const g = this.game;
    const sess = this.state.session;
    if (!sess || sess.game !== 'roulette') return { ok: false, text: 'Sit at a roulette table first.' };
    const t = this.table(sess.table);
    const ts = this.tableState(sess.table);
    const staked = ts.bets.reduce((a, x) => a + x.amount, 0);
    if (!staked) return { ok: false, text: 'Place a bet first.' };
    if (staked < t.min) return { ok: false, text: `The table minimum is ${t.min} a spin.` };
    const n = spinWheel(g.rng);
    const res = settleWheel(ts.bets, n);
    const id = this.newRoundId(sess.table);
    this.credit(res.returned, id);
    ts.bets = [];
    const h = (this.state.history[sess.table] ||= []);
    h.unshift(n);
    if (h.length > 12) h.length = 12;
    this.endRound(res.staked, res.returned);
    return { ok: true, n, colour: colourOf(n), id, ...res };
  }

  // ------------------------------------------------------------------ blackjack
  deal(bet) {
    const g = this.game;
    const sess = this.state.session;
    if (!sess || sess.game !== 'blackjack') return { ok: false, text: 'Sit at a blackjack table first.' };
    const t = this.table(sess.table);
    const ts = this.tableState(sess.table);
    const b = Math.floor(bet);
    if (ts.round && ts.round.phase === 'player') return { ok: false, text: 'Finish this hand first.' };
    if (!(b >= t.min && b <= t.max)) return { ok: false, text: `Bets here are ${t.min}–${t.max}.` };
    if (!this.debit(b, `${sess.table}:deal`)) return { ok: false, text: 'Not enough chips.' };
    ts.roundId = this.newRoundId(sess.table);
    ts.round = bjDeal(ts.shoe, b, g.rng);
    ts.shoe = ts.round.shoe;
    if (ts.round.phase === 'done') this.settleBlackjack(sess.table);
    return { ok: true, round: ts.round };
  }

  /** hit / stand / double / split — a double or a split takes another bet's worth of chips. */
  act(action) {
    const sess = this.state.session;
    if (!sess || sess.game !== 'blackjack') return { ok: false, text: 'Sit at a blackjack table first.' };
    const ts = this.tableState(sess.table);
    const r = ts.round;
    if (!r || !legalActions(r).includes(action)) return { ok: false, text: 'You can\'t do that now.' };
    if (action === 'double' || action === 'split') {
      const extra = r.hands[r.active].bet;
      if (!this.debit(extra, `${ts.roundId}:${action}`)) return { ok: false, text: `That needs another ${extra} chips.` };
    }
    bjAct(r, action);
    if (r.phase === 'done') this.settleBlackjack(sess.table);
    return { ok: true, round: r };
  }

  settleBlackjack(tableId) {
    const ts = this.tableState(tableId);
    const r = ts.round;
    if (!r || r.phase !== 'done' || r.settled) return;
    const returned = r.results.reduce((a, x) => a + x.returned, 0);
    this.credit(returned, ts.roundId);
    r.settled = true;
    this.endRound(totalBet(r), returned);
  }

  endRound(staked, returned) {
    const st = this.state.stats;
    st.rounds++;
    if (returned - staked > st.biggest) st.biggest = returned - staked;
    const net = returned - staked;
    this.reaction = { kind: net > 0 ? (net >= staked * 5 ? 'big_win' : 'win') : net < 0 ? 'lose' : 'push', at: this.game.realTime };
  }

  // ------------------------------------------------------------------ Morganius's table: the Spade's Gambit
  /** The roguelike's saved state: the run in progress (or the last one, finished), and your record. */
  get rogue() {
    const s = this.state;
    if (!s.rogue) s.rogue = { run: null, runs: 0, wins: 0, bestActs: 0, paid: 0, history: [] };
    return s.rogue;
  }

  /** Buy in (ENTRY chips, once) and start a run. A run in progress has to be finished or given up first. */
  startRun() {
    const sess = this.state.session;
    if (!sess || sess.game !== 'spade') return { ok: false, text: 'Sit at Morganius\'s table first.' };
    const R = this.rogue;
    if (R.run && !rFinished(R.run)) return { ok: false, text: 'You have a Gambit in progress.' };
    const id = `spade#${++this.state.seq}`;
    if (!this.debit(ROGUE_ENTRY, id)) return { ok: false, text: `The buy-in is ${ROGUE_ENTRY} chips.` };
    R.run = newRun(Math.floor(this.game.rng.next() * 4294967296), id);
    R.runs++;
    return { ok: true, run: R.run };
  }

  /** Do something in the run: 'play' | 'redraw' (ids), 'buy' (i), 'vanish' (card), 'reroll', 'next', 'release' (curio), 'concede'. */
  rogueAct(action, arg) {
    const sess = this.state.session;
    if (!sess || sess.game !== 'spade') return { ok: false, text: 'Sit at Morganius\'s table first.' };
    const run = this.rogue.run;
    if (!run || rFinished(run)) return { ok: false, text: 'No Gambit in progress.' };
    let res;
    try {
      if (action === 'play') res = { ok: true, ...rPlay(run, arg) };
      else if (action === 'redraw') res = { ok: true, ...rRedraw(run, arg) };
      else if (action === 'buy') res = rBuy(run, arg);
      else if (action === 'vanish') res = rVanish(run, arg);
      else if (action === 'reroll') res = rReroll(run);
      else if (action === 'next') { rNext(run); res = { ok: true }; }
      else if (action === 'release') res = rRelease(run, arg);
      else if (action === 'concede') { rConcede(run); res = { ok: true }; }
      else return { ok: false, text: 'Morganius raises an eyebrow.' };
    } catch (e) {
      return { ok: false, text: e.message.replace(/^rogue: /, '') };
    }
    if (rFinished(run)) this.settleRun();
    return res;
  }

  /** A finished run pays out — once (by the run's id). */
  settleRun() {
    const R = this.rogue;
    const run = R.run;
    if (!run || !rFinished(run) || run.settled) return 0;
    const back = rPayout(run);
    this.credit(back, run.id);
    run.settled = true;
    R.paid += back;
    if (run.phase === 'won') R.wins++;
    R.bestActs = Math.max(R.bestActs, run.actsCleared);
    R.history.unshift({ acts: run.actsCleared, paid: back, best: run.best, day: this.game.clock.day });
    if (R.history.length > 10) R.history.length = 10;
    this.endRound(ROGUE_ENTRY, back);
    return back;
  }

  // ------------------------------------------------------------------ the host
  /** Morganius drops everything and flies to your table (or appears there in a burst of cards). */
  summonHost(tableId) {
    const g = this.game;
    const m = g.npcs.get(HOST);
    if (!m) return;
    const floor = g.maps.get(FLOOR);
    const to = floor.spotPx(`host_${tableId}`) || floor.spotPx('m_centre');
    const here = m.map === FLOOR && !m.dead;
    const from = here ? { x: m.x, y: m.y } : { x: to.x + 40, y: to.y - 120 }; // from somewhere else: down out of the air
    const first = this.state.visits <= 1 || !this.state.metHost;
    this.state.metHost = true;
    m.map = FLOOR;
    m.path = null;
    m.pendingRoute = null;
    m.chat = null;
    m.intent = { activity: 'host', spot: `${FLOOR}:host_${tableId}`, source: 'casino', until: g.clock.total + 100000 };
    m.activity = 'host';
    m.arrived = false;
    this.arrival = { table: tableId, from, to: { x: to.x, y: to.y }, t0: g.realTime, dur: first ? 1.9 : 0.9, appeared: !here, done: false };
    m.anim = { state: 'approach', t0: g.realTime };
  }

  /** Skip the rest of the flight (the scene opens at once). */
  skipArrival() {
    if (this.arrival) { this.arrival.t0 = this.game.realTime - this.arrival.dur; this.arrival.skipped = true; }
  }

  releaseHost() {
    const g = this.game;
    const m = g.npcs.get(HOST);
    if (!m || m.intent?.source !== 'casino') return;
    m.intent = null;
    m.anim = { state: 'leave', t0: g.realTime };
    this.state.roamAt = g.clock.total + 5;
    g.npcSystem.think(m, true);
  }

  /** Frame by frame: the host's flight. */
  update() {
    const g = this.game;
    const a = this.arrival;
    if (!a) return;
    const m = g.npcs.get(HOST);
    if (!m) { this.arrival = null; return; }
    const k = Math.min(1, (g.realTime - a.t0) / a.dur);
    // a theatrical curve: up and over, easing in and out
    const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
    const mx = (a.from.x + a.to.x) / 2;
    const my = Math.min(a.from.y, a.to.y) - 70;
    m.x = (1 - e) ** 2 * a.from.x + 2 * (1 - e) * e * mx + e * e * a.to.x;
    m.y = (1 - e) ** 2 * a.from.y + 2 * (1 - e) * e * my + e * e * a.to.y;
    m.facing = 'down';
    m.moving = k < 1;
    if (k >= 1 && !a.done) {
      a.done = true;
      m.arrived = true;
      m.anim = { state: 'arrive', t0: g.realTime };
    }
  }

  /** Has the host arrived (and the scene may open)? */
  get hostReady() {
    return !this.arrival || this.arrival.done;
  }

  /** Every game minute: Morganius picks his next place on the floor when he's at liberty. */
  minuteTick() {
    const g = this.game;
    const m = g.npcs.get(HOST);
    if (!m || m.dead || this.state.session) return;
    if (m.activity !== 'perform' || !m.arrived || m.map !== FLOOR) return;
    if (g.clock.total < this.state.roamAt) return;
    const here = m.intent?.spot;
    const options = ROAM.filter(([spot]) => `${FLOOR}:${spot}` !== here && g.maps.get(FLOOR).spot(spot));
    const total = options.reduce((a, o) => a + o[1], 0);
    let r = g.rng.next() * total;
    let pick = options[0][0];
    for (const [spot, w] of options) { r -= w; if (r <= 0) { pick = spot; break; } }
    g.sendOnErrand(m, { spot: `${FLOOR}:${pick}`, activity: 'perform', minutes: 20 + Math.floor(g.rng.next() * 30) });
    this.state.roamAt = g.clock.total + 12 + Math.floor(g.rng.next() * 20);
  }

  // ------------------------------------------------------------------ saving
  /**
   * After a load nobody is sitting at a table: a hand of blackjack you were playing stands and is
   * settled, chips left on an unspun layout come back, and the host goes back to his rounds.
   */
  afterLoad() {
    const s = this.state;
    for (const [id, ts] of Object.entries(s.tables)) {
      if (ts.bets?.length) this.clearBets(id);
      if (ts.round && ts.round.phase === 'player') { standAll(ts.round); this.settleBlackjack(id); }
      else if (ts.round && ts.round.phase === 'done' && !ts.round.settled) this.settleBlackjack(id);
    }
    s.session = null;
    this.arrival = null;
    if (s.rogue?.run && rFinished(s.rogue.run) && !s.rogue.run.settled) this.settleRun(); // a Gambit runs on across saves; a finished one is paid
    const m = this.game.npcs.get(HOST);
    if (m?.intent?.source === 'casino') m.intent = null;
  }
}
