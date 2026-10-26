// Aerospace (v0.55.0): Starling Flats Aerospace Park. Two companies — Meridian
// Aerospace Corporation (MRDN, the incumbent) and, once you buy it from Billie
// Roost, Roost Aeroworks — run on one engine:
//
//   customers post tenders out of finite budgets (06:00) → companies bid →
//   the customer awards the best valid bid by its priorities → a contract,
//   with a deposit → one persistent production unit per item → each unit
//   walks its line's stages (src/content/aerospace.js PIPELINES): a bay,
//   materials ordered from suppliers (shared, finite stock) and received
//   before the stage that uses them, work at the company's speed and staffing,
//   inspections rolled once (stored), the apron, the pad, launches,
//   commissioning, convoys → settlement exactly once.
//
// Money: the rival has its own cash (and a credit line); Roost spends the
// player's obols. Every amount is booked once (src/aero/books.js): revenue on
// delivery, deposits deferred until then, materials an asset until consumed.
// Randomness comes from the aerospace stream (state.rng), never game.rng, and
// every outcome is rolled ahead and kept, so a reload changes nothing.
//
// State: game.world.aero (created on first use; a save from before v0.55.0
// gets Meridian as it is at the start of a new game — and never a free firm).
import { Rng } from '../core/rng.js';
import { quantityError, missingTech, baysFor, apronSize, canLift, unitCost, bomValue, fmtMoney, fmtDays } from '../aero/catalog.js';
import { stagesOf, stageDays, stageMaterials, remainingMaterials, newUnit, failChance, launchFailChance, commissionFailChance, workLeft, lastBayStage } from '../aero/pipeline.js';
import { freshBooks, post, summarise, revenueAccount } from '../aero/books.js';
import { configure, cleanConfig, configError, configLabel } from '../aero/config.js';
import { makeTender, bidError, rankBids, launchAllowance } from '../aero/tenders.js';
import { fairValue, nextPrice } from '../aero/valuation.js';
import { rivalMorning } from '../aero/rival.js';
import { planOf, assignStand, scheduleDeparture, tickField, movers, migrateField, geoOf, startConvoy, convoys, ambientHome, soundAt } from '../aero/field.js';
import { startSequence, phaseAt, padBase, rolloutPath, rolloutAt, clockText } from '../aero/launch.js';
import { windRunway, poseAt, planLength } from '../aero/flight.js';
import { eventsMorning, resolveEvent, hallDiscount, rollBreakthrough, applyBreakthrough, milestone, eventContractDone } from '../aero/events.js';

const DAY = 1440;
const NEWS_MAX = 60;
const REPORTS_MAX = 120;

export class Aerospace {
  constructor(game) {
    this.game = game;
  }

  // ------------------------------------------------------------- content & state
  get cfg() {
    return this.game.content.aerospace;
  }

  get A() {
    return this.cfg.aero;
  }

  get state() {
    const g = this.game;
    if (!g.world.aero) g.world.aero = this.fresh();
    return g.world.aero;
  }

  get rng() {
    const s = this.state;
    if (!this._rng || this._rngFor !== s) { this._rng = Rng.from(s.rng); this._rngFor = s; }
    return this._rng;
  }

  /** Keep the stream's state in the save after every use. */
  syncRng() {
    if (this._rng) this.state.rng = this._rng.serialize();
  }

  get now() {
    return this.game.clock.total;
  }

  get day() {
    return this.game.clock.day;
  }

  nextId(kind) {
    const s = this.state;
    s.seq[kind] = (s.seq[kind] || 0) + 1;
    return `${kind}${s.seq[kind]}`;
  }

  /** Everything at the start: Meridian and its order book, customers' budgets, suppliers' stock, the share price. */
  fresh() {
    const C = this.cfg;
    const s = {
      v: 1, rng: { state: 0x5717a } , seq: {}, lastDay: this.game.clock.day,
      owned: false, boughtDay: null,
      companies: {}, tenders: [], contracts: {}, units: {}, pos: {}, satellites: {}, jobs: {},
      customers: Object.fromEntries(Object.entries(C.customers).map(([id, cu]) => [id, { budget: Math.round(cu.budget * C.budgetStart), spent: 0, won: {} }])),
      suppliers: Object.fromEntries(Object.entries(C.suppliers).map(([id, sp]) => [id, { stock: Object.fromEntries(Object.keys(sp.sells).map((m) => [m, sp.stock])) }])),
      market: { price: C.aero.exchange.startPrice, history: [], sharesOwned: 0, dividendsPaid: 0, lastDividendDay: 0, ema: null, weekProfit: 0, costBasis: 0 },
      news: [], reports: [],
    };
    this.game.world.aero = s;
    const M = C.aero.meridian;
    s.companies.meridian = this.newCompany('meridian', M.name, 'rival', M);
    // its standing order book: real contracts, real units, deposits already in its cash
    for (const b of M.backlog) this.seedContract('meridian', b);
    this.seedWorkInProgress(s.companies.meridian);
    s.market.price = Math.round(this.fair() * 100) / 100;
    // the board isn't empty on the first morning: customers have tenders out, Meridian has bid and ordered
    this.postTenders();
    this.planLaunchers(s.companies.meridian);
    rivalMorning(this, s.companies.meridian);
    this.syncRng();
    return s;
  }

  /**
   * Meridian is established: when the game starts its order book is already on the floor —
   * a unit in each bay it can fill, part-built, the materials for the stages behind it already
   * used (they were bought before the game began, so they're its cost, not new spending) — and
   * its stores hold a working stock of the common materials.
   */
  seedWorkInProgress(co) {
    const C = this.cfg;
    const rng = this.rng;
    const units = this.unitsOf(co).sort((a, b) => this.priority(a) - this.priority(b));
    for (const u of units) {
      const p = this.pOf(u);
      const st = stagesOf(C, p);
      const bayStages = st.map((x, i) => (x.bay && x.share ? i : -1)).filter((i) => i >= 0);
      const types = baysFor(C, p);
      const bay = co.bays.find((b) => b.type === p.bay && !b.unit) || co.bays.find((b) => types.includes(b.type) && !b.unit);
      if (!bay) continue;
      const k = bayStages[Math.floor(rng.next() * Math.max(1, bayStages.length - 1))];
      for (let i = 0; i <= k; i++) for (const [m, n] of Object.entries(stageMaterials(p, st[i]))) u.cost.materials += n * C.materials[m].price;
      u.stage = k;
      u.need = stageDays(C, p, st[k]);
      u.work = u.need * rng.next() * 0.8;
      u.consumed = true;
      u.bay = bay.id;
      bay.unit = u.id;
      u.started = this.now - DAY;
      u.status = 'building';
    }
    // the materials for the rest of the standing order book were bought before the game began: in stores, reserved
    for (const u of units) {
      const need = remainingMaterials(C, this.pOf(u), u.stage + (u.consumed ? 1 : 0));
      for (const [m, n] of Object.entries(need)) {
        const r = this.stock(co, m);
        r.qty += n;
        r.value += n * C.materials[m].price;
        co.books.inventoryValue += n * C.materials[m].price;
        this.reserve(co, u, m, n);
      }
    }
    for (const m of ['alu', 'steel', 'composite', 'chemicals', 'fuel', 'electronics', 'titanium', 'avionics']) {
      const n = m === 'avionics' || m === 'titanium' ? 4 : 10;
      const r = this.stock(co, m);
      r.qty += n;
      r.value += n * C.materials[m].price;
      co.books.inventoryValue += n * C.materials[m].price;
    }
  }

  newCompany(id, name, kind, def) {
    const C = this.cfg;
    const co = {
      id, name, kind,
      cash: kind === 'rival' ? def.cash : 0,
      workforce: def.workforce,
      bays: def.bays.map((b) => ({ id: b, type: b.replace(/_\d+$/, ''), unit: null, ready: 0, ...(kind === 'player' && b === 'light_1' ? { slot: 'h1_a' } : {}) })),
      pad: def.pad ? { unit: null, readyAt: 0, launches: 0 } : null,
      facilities: {},
      // v0.57.0: the halls Roost has (hall id → the time it opens; Hangar 1 always has) — Meridian's are fixed on the map
      halls: kind === 'player' ? { hangar1: 0 } : null,
      research: [...def.research], researching: null,
      reputation: def.reputation, qualityBase: def.quality,
      inv: {}, books: freshBooks(),
      stats: { delivered: 0, onTime: 0, late: 0, failedInspections: 0, launches: 0, launchFailures: 0, contractsWon: 0, tendersBid: 0, cancelled: 0 },
      apron: C.facilities.apron.slots[id] || 3,
      autoProcure: true,
      overhead: kind === 'rival' ? def.overhead : 600,
      // v0.56.0: how foreign materials travel — 'internal' (your own Ober & Sons ships, when you own the line) or 'carrier';
      // with policy 'fallback' a job that can't find a ship in a day goes by carrier, with 'wait' it waits for one
      shipping: 'internal', internalPolicy: 'fallback',
      freight: { external: 0, internalCharges: 0, equivalent: 0, voyageCosts: 0 },
      // v0.57.0: the other people (engineers, inspectors), what they've learnt together, how it's kept up
      engineers: 0, inspectors: 0, experience: C.staff.experience.start[id] ?? 50, training: 'none', qaLog: [],
      // v0.57.0: reputation with its reasons, the streaks behind it, decisions and offers, the firsts, cool-downs
      repLog: [], streaks: { late: 0, onTime: 0 }, events: [], offers: [], cool: {}, milestones: {}, pressure: null,
    };
    co.engineers = this.staffNeeded(co, 'engineer');
    co.inspectors = this.staffNeeded(co, 'inspector');
    return co;
  }

  /** A contract the company already holds when the game starts (Meridian's backlog; Billie's two Skylarks). */
  seedContract(companyId, b) {
    const C = this.cfg;
    const p = C.products[b.product];
    const co = this.company(companyId);
    const c = this.makeContract(co, { customer: b.customer, product: b.product, qty: b.qty, unitPrice: b.unitPrice, days: b.daysLeft, quality: p.quality, depositShare: b.depositPaid, tender: null });
    // the deposit was paid before the game began: it's already in the cash, and still owed as work
    co.books.deferred += c.depositPaid;
    this.report(co, 'contract', `📋 ${co.name} holds ${c.qty} × ${p.name} for ${C.customers[b.customer].name} (due in ${b.daysLeft} days).`, null);
    return c;
  }

  // ------------------------------------------------------------- configured products (v0.57.0)
  /**
   * The product as it is for this unit, contract or tender: the catalogue entry, or — when a
   * configuration was asked for — the configured product (its bill of materials, days, price,
   * quality, spec). Every calculation about work in hand reads this, never the bare entry.
   */
  pOf(x) {
    const base = this.cfg.products[x.product];
    if (!x.config) return base;
    const cache = (this._cp ||= new WeakMap());
    const hit = cache.get(x.config);
    if (hit && hit.id === x.product) return hit.p;
    const p = configure(this.cfg, base, x.config, x.product);
    cache.set(x.config, { id: x.product, p });
    return p;
  }

  // ------------------------------------------------------------- companies
  company(id) {
    return this.state.companies[id] || null;
  }

  get meridian() {
    return this.company('meridian');
  }

  get roost() {
    return this.state.owned ? this.company('roost') : null;
  }

  companies() {
    return Object.values(this.state.companies);
  }

  get owned() {
    return Boolean(this.game.world.aero?.owned);
  }

  cash(co) {
    return co.kind === 'player' ? this.game.player.money : co.cash;
  }

  /** Money out, booked to an account (null: an asset — materials, capital spending). */
  pay(co, amount, account) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    if (co.kind === 'player') {
      const g = this.game;
      g.player.money -= amount;
      g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    } else co.cash -= amount;
    if (account) post(co.books, this.day, account, amount, this.A.historyDays);
  }

  /** Money in, booked to an account (null: not revenue — a deposit, a refund). */
  receive(co, amount, account) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    if (co.kind === 'player') {
      const g = this.game;
      g.player.money += amount;
      g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    } else co.cash += amount;
    if (account) post(co.books, this.day, account, amount, this.A.historyDays);
  }

  /** Can it afford this now? The rival may draw on its credit line. */
  canAfford(co, amount) {
    return co.kind === 'player' ? this.game.player.money >= amount : co.cash - amount >= -this.A.meridian.credit;
  }

  qualityOf(co) {
    return this.qualityBreakdown(co).total;
  }

  /** Research time multiplier: the laboratory takes a quarter off. */
  researchFactor(co) {
    return this.hallState(co, 'lab').state === 'built' ? this.cfg.halls.lab.effect.researchDays : 1;
  }

  speedOf(co) {
    return (1 + Math.min(0.3, co.research.length * 0.01)) * this.experienceFactor(co);
  }

  materialMultiplier(co) {
    let m = 1;
    for (const id of co.research) m += this.cfg.research[id]?.effect?.cost || 0;
    return m;
  }

  cleared(co) {
    return co.bays.some((b) => b.type === 'secure' && b.ready <= this.now) && co.research.some((id) => this.cfg.research[id]?.clearance);
  }

  canBuild(co, p) {
    if (missingTech(this.cfg, co, p).length) return false;
    const types = baysFor(this.cfg, p);
    if (!co.bays.some((b) => types.includes(b.type))) return false;
    if (p.line === 'rocket' && !co.pad) return false;
    if (p.line === 'satellite' && !this.canLaunch(co, p)) return false;
    return true;
  }

  /** Can the company get a satellite to orbit (its own pad and a rocket it can build)? */
  canLaunch(co, p) {
    if (!co.pad || !co.bays.some((b) => b.type === 'rocket')) return false;
    return Object.values(this.cfg.products).some((r) => r.line === 'rocket' && !r.crew && r.lift >= p.mass && !missingTech(this.cfg, co, r).length);
  }

  /** What a satellite's share of a launch costs the company to build (cheapest rocket it can build). */
  launchShare(p) {
    const C = this.cfg;
    if (p.line !== 'satellite') return 0;
    const costs = Object.values(C.products).filter((r) => r.line === 'rocket' && !r.crew && r.lift >= p.mass).map((r) => (unitCost(C, r).total * p.mass) / r.lift);
    return costs.length ? Math.round(Math.min(...costs) * 1.1) : 0;
  }

  /** Workers needed: crews for occupied bays (or all bays with { all }). */
  crewNeeded(co, { all = false } = {}) {
    return co.bays.reduce((a, b) => a + (all || b.unit ? this.cfg.bays[b.type].crew : 0), 0);
  }

  staffing(co) {
    const need = this.crewNeeded(co);
    return need ? Math.min(1, co.workforce / need) : 1;
  }

  // ------------------------------------------------------------- the people (v0.57.0)
  /** How many of a role the company's bays call for (technicians: every bay's crew; the rest a share of that). */
  staffNeeded(co, role) {
    const crew = this.crewNeeded(co, { all: true });
    if (role === 'tech') return crew;
    return Math.max(1, Math.ceil(crew * this.cfg.staff.roles[role].share - 1e-9));
  }

  staffCount(co, role) {
    return role === 'tech' ? co.workforce : role === 'engineer' ? co.engineers : co.inspectors;
  }

  /** Everybody on the payroll. */
  headcount(co) {
    return co.workforce + co.engineers + co.inspectors;
  }

  /** How much of the drawing office's and research's pace the engineers can keep (1 = fully staffed). */
  engineerRate(co) {
    const R = this.cfg.staff.roles.engineer;
    return Math.max(R.minRate, Math.min(1, co.engineers / this.staffNeeded(co, 'engineer')));
  }

  /** The same for inspections. */
  inspectorRate(co) {
    const R = this.cfg.staff.roles.inspector;
    return Math.max(R.minRate, Math.min(1, co.inspectors / this.staffNeeded(co, 'inspector')));
  }

  /** What a short-staffed drawing office and inspection line cost overall in pace (1 = nothing lost). */
  staffDrag(co) {
    return 1 / (1 + 0.06 * (1 / this.engineerRate(co) - 1) + 0.1 * (1 / this.inspectorRate(co) - 1));
  }

  /** Experience's effect on pace: from speedAt0 to speedAt100, 1.0 at 50. */
  experienceFactor(co) {
    const X = this.cfg.staff.experience;
    return X.speedAt0 + (X.speedAt100 - X.speedAt0) * (co.experience / 100);
  }

  /** Hire people (role 'tech', 'engineer' or 'inspector'). New hires arrive green: the company's experience is diluted. */
  hire(co, n, role = 'tech') {
    const R = this.cfg.staff.roles[role];
    if (!R) return { ok: false, text: 'No such job.' };
    n = Math.max(0, Math.floor(n));
    if (!n) return { ok: false, text: 'Hire how many?' };
    const cost = n * R.hire;
    if (!this.canAfford(co, cost)) return { ok: false, text: `Hiring ${n} costs ${cost.toLocaleString()} obols.` };
    this.pay(co, cost, 'hiring');
    const before = this.headcount(co);
    co.experience = (co.experience * before + this.cfg.staff.newHireExperience * n) / (before + n);
    if (role === 'tech') co.workforce += n; else if (role === 'engineer') co.engineers += n; else co.inspectors += n;
    return { ok: true, text: `Hired ${n} ${n === 1 ? R.one : R.name.toLowerCase()} (${cost.toLocaleString()} obols for recruiting and training).` };
  }

  layoff(co, n, role = 'tech') {
    const R = this.cfg.staff.roles[role];
    if (!R) return { ok: false, text: 'No such job.' };
    n = Math.max(0, Math.min(this.staffCount(co, role), Math.floor(n)));
    if (!n) return { ok: false, text: 'Lay off how many?' };
    this.pay(co, n * R.layoff, 'hiring');
    if (role === 'tech') co.workforce -= n; else if (role === 'engineer') co.engineers -= n; else co.inspectors -= n;
    return { ok: true, text: `Laid off ${n} ${n === 1 ? R.one : R.name.toLowerCase()}.` };
  }

  /** The training programme: what it costs each day (per technician) and how fast the company learns. */
  setTraining(co, level) {
    const T = this.cfg.staff.training[level];
    if (!T) return { ok: false, text: 'No such programme.' };
    co.training = level;
    return { ok: true, text: level === 'none' ? 'Training stopped: the crew learn on the job.' : `Training: ${T.name.toLowerCase()} — ${T.perDay} obols per technician a day.` };
  }

  // ------------------------------------------------------------- reputation (v0.57.0)
  /** Every change to reputation goes through here: clamped to 0–100, and logged with its reason (so it can be read). */
  repChange(co, delta, why) {
    if (!delta) return 0;
    const before = co.reputation;
    co.reputation = Math.max(0, Math.min(100, before + delta));
    const applied = Math.round((co.reputation - before) * 10) / 10;
    (co.repLog ||= []).unshift({ at: this.now, delta: applied, wanted: delta, why, total: Math.round(co.reputation * 10) / 10 });
    if (co.repLog.length > 60) co.repLog.length = 60;
    return applied;
  }

  /** Repeated failures cost more each time: the base, then half as much again, up to the cap. */
  streakMult(n) {
    const R = this.cfg.events.rep;
    return Math.min(R.cap, 1 + R.step * (n - 1));
  }

  resolveEvent(co, eventId, choiceId) {
    return resolveEvent(this, co, eventId, choiceId);
  }

  /** What the company's quality is made of (every part visible, so it can be managed). */
  qualityBreakdown(co) {
    const X = this.cfg.staff.experience;
    const I = this.cfg.staff.inspectors;
    const research = co.research.reduce((a, id) => a + (this.cfg.research[id]?.effect?.quality || 0), 0);
    const equipment = co.facilities.inspection ? 8 : 0;
    const experience = (co.experience - 50) * X.qualityPerPoint;
    const ratio = co.inspectors / this.staffNeeded(co, 'inspector');
    const inspectors = ratio >= 1 ? Math.min(I.bonusMax, (ratio - 1) * I.bonusMax) : -(1 - ratio) * I.penalty;
    const total = Math.min(100, co.qualityBase + research + equipment + experience + inspectors);
    return { base: co.qualityBase, research, equipment, experience, inspectors, ratio, total };
  }

  /** Utilisation of the bays a product would use (queued work per bay, 1 = a full queue). */
  utilisation(co, p) {
    const types = baysFor(this.cfg, p);
    const bays = co.bays.filter((b) => types.includes(b.type)).length || 1;
    const units = Object.values(this.state.units).filter((u) => u.company === co.id && !u.finished && types.includes(baysFor(this.cfg, this.pOf(u))[0]));
    const days = units.reduce((a, u) => a + workLeft(this.cfg, this.pOf(u), u), 0);
    return days / (bays * 14);
  }

  /** Days until a new job for `qty` of a product would be delivered (queue + work + materials lead). */
  deliveryEstimate(co, p, qty) {
    const types = baysFor(this.cfg, p);
    const bays = co.bays.filter((b) => types.includes(b.type));
    if (!bays.length) return Infinity;
    const units = Object.values(this.state.units).filter((u) => u.company === co.id && !u.finished && u.bay === null && u.stage <= lastBayStage(this.cfg, this.pOf(u)) && types.includes(baysFor(this.cfg, this.pOf(u))[0]));
    // each bay is free after its current unit's bay work; queued units take bays in turn
    const free = bays.map((b) => {
      const u = b.unit && this.state.units[b.unit];
      const ready = Math.max(0, (b.ready - this.now) / DAY);
      return ready + (u ? this.bayWorkLeft(u) : 0);
    }).sort((a, b) => a - b);
    for (const u of units) { free[0] += this.pOf(u).days; free.sort((a, b) => a - b); }
    const speed = this.speedOf(co) * this.staffDrag(co) * Math.max(0.5, Math.min(1, co.workforce / Math.max(1, this.crewNeeded(co, { all: true }))));
    const lead = this.leadDays(co, p);
    let done = 0;
    for (let i = 0; i < qty; i++) {
      free[0] = Math.max(free[0], lead) + p.days / speed;
      done = Math.max(done, free[0]);
      free.sort((a, b) => a - b);
    }
    const tail = p.line === 'rocket' ? 2 : p.line === 'satellite' ? 6 : 1;
    // expected rework, and a margin for a late shipment
    const rework = failChance(this.cfg, p, this.qualityOf(co), { engineCell: co.facilities.engine_cell }) * this.A.reworkShare * p.days * qty;
    return Math.ceil((done + tail + rework) * 1.1);
  }

  /** Days until the slowest material for a product could be in hand (from the best supplier with stock). */
  leadDays(co, p) {
    let worst = 0.5;
    for (const [m, n] of Object.entries(p.bom)) {
      if (this.free(co, m) >= n) continue;
      const b = this.bestSupplier(co, m, n);
      worst = Math.max(worst, b ? b.q.hours / 24 : 6);
    }
    return worst;
  }

  bayWorkLeft(u) {
    const p = this.pOf(u);
    const st = stagesOf(this.cfg, p);
    const last = lastBayStage(this.cfg, p);
    let d = Math.max(0, u.need - u.work);
    for (let i = u.stage + 1; i <= last; i++) d += stageDays(this.cfg, p, st[i]);
    return d;
  }

  // ------------------------------------------------------------- the firm (Billie Roost)
  /** What Billie is selling, shown before you buy. */
  offer() {
    const F = this.A.firm;
    const C = this.cfg;
    return {
      company: F.name, price: F.price,
      includes: [
        `${F.bays.length} ${C.bays.light.name.toLowerCase()} (and room on the Park to build more)`,
        `${F.workforce} skilled technicians, three engineers and two inspectors (Wrenna Torq, the chief mechanic, stays on)`,
        `A ${C.facilities.apron.slots.roost}-slot apron by the runway`,
        `Billie's order book: ${F.backlog.map((b) => `${b.qty} × ${C.products[b.product].name} for ${C.customers[b.customer].name}`).join('; ')} — deposits already received by Billie are hers; you're paid the rest on delivery`,
        'The aerospace terminal (and the Aerospace app on your tablet): the tender board, production, suppliers and the books',
      ],
      costs: `Running costs about ${(F.workforce * C.staff.roles.tech.wage + 3 * C.staff.roles.engineer.wage + 2 * C.staff.roles.inspector.wage + C.bays.light.upkeep + 600).toLocaleString()} obols a day (wages for the technicians, three engineers and two inspectors, the bay, the office).`,
    };
  }

  buyFirm() {
    const g = this.game;
    const s = this.state;
    const F = this.A.firm;
    if (s.owned) return { ok: false, text: `You already own ${F.name}.` };
    if (g.player.money < F.price) return { ok: false, text: `${F.name} costs ${F.price.toLocaleString()} obols. You have ${g.player.money.toLocaleString()}.` };
    g.player.money -= F.price;
    g.bus.emit('money:changed', { delta: -F.price, total: g.player.money });
    const co = this.newCompany('roost', F.name, 'player', { ...F, pad: false });
    s.companies.roost = co;
    co.books.capex += F.price;
    s.owned = true;
    s.boughtDay = g.clock.day;
    // Billie's order book: she keeps the deposits she was paid; the units are yours to build
    for (const b of F.backlog) {
      const c = this.seedContract('roost', { ...b, depositPaid: 0 });
      c.note = `Taken over from Billie Roost (she was paid ${Math.round(b.depositPaid * 100)}% up front and keeps it; the contract price here is what's still owed).`;
      c.unitPrice = Math.round(b.unitPrice * (1 - b.depositPaid));
      c.total = c.unitPrice * c.qty;
    }
    g.setFlag('owns_aerospace', true);
    this.news(`${F.name} changes hands: Billie Roost sells her Starling Flats works to a newcomer.`, 'good');
    this.report(co, 'company', `✈ ${F.name} is yours. The terminal is in the Roost office on the Park.`, 'good');
    g.bus.emit('aero:bought', {});
    this.syncRng();
    return { ok: true, text: `You bought ${F.name} for ${F.price.toLocaleString()} obols.` };
  }

  // ------------------------------------------------------------- research, bays, facilities
  startResearch(co, id) {
    const R = this.cfg.research[id];
    if (!R) return { ok: false, text: 'No such research.' };
    if (co.research.includes(id)) return { ok: false, text: 'Already researched.' };
    if (co.researching) return { ok: false, text: `Already researching ${this.cfg.research[co.researching.id].name}.` };
    const missing = (R.requires || []).filter((r) => !co.research.includes(r));
    if (missing.length) return { ok: false, text: `Needs ${missing.map((r) => this.cfg.research[r].name).join(', ')} first.` };
    if (!this.canAfford(co, R.cost)) return { ok: false, text: `${R.name} costs ${R.cost.toLocaleString()} obols.` };
    this.pay(co, R.cost, 'research');
    const days = Math.max(1, Math.round((R.days * this.researchFactor(co)) / this.engineerRate(co)));
    co.researching = { id, doneAt: this.now + Math.round(days * DAY), breakthrough: rollBreakthrough(this, co, id) };
    this.report(co, 'research', `🔬 ${co.name} begins research: ${R.name} (${days} days).`, co.kind === 'player' ? 'info' : null);
    return { ok: true, text: `Research started: ${R.name}. Done in ${days} days${days < R.days ? ' (the laboratory saves time)' : days > R.days ? ' (short of engineers)' : ''}.` };
  }

  // ------------------------------------------------------------- halls and slots (v0.57.0)
  /** A hall's state for a company: 'built' (open), 'building' (with its opening time and progress) or 'site'. */
  hallState(co, id) {
    const H = this.cfg.halls[id];
    if (!H) return { state: 'none' };
    if (H.owned) return { state: 'built', ready: 0 };
    const at = co?.halls?.[id];
    if (at === undefined || at === null) return { state: 'site' };
    if (at <= this.now) return { state: 'built', ready: at };
    return { state: 'building', ready: at, f: Math.max(0, Math.min(1, 1 - (at - this.now) / (H.buildDays * DAY))) };
  }

  /** True when Roost's hall is open (Hangar 1 is, from the start, even before you buy the firm). */
  hallBuilt(id) {
    const H = this.cfg.halls[id];
    if (!H) return true;
    if (H.owned) return true;
    return this.hallState(this.roost, id).state === 'built';
  }

  /** Every slot in Roost's open halls, with the bay (if any) fitted to it. */
  slotsOf(co) {
    const out = [];
    for (const [hid, H] of Object.entries(this.cfg.halls)) {
      if (this.hallState(co, hid).state !== 'built') continue;
      for (const sl of H.slots) out.push({ hall: hid, ...sl, bay: co.bays.find((b) => b.slot === sl.id) || null });
    }
    return out;
  }

  /** The hall (id, definition) a slot belongs to. */
  hallOfSlot(slotId) {
    const e = Object.entries(this.cfg.halls).find(([, H]) => H.slots.some((sl) => sl.id === slotId));
    return e ? { id: e[0], ...e[1] } : null;
  }

  /** The first free slot in an open hall that takes this type of bay. */
  freeSlot(co, type) {
    return this.slotsOf(co).find((sl) => !sl.bay && sl.fits.includes(type)) || null;
  }

  /** The hall that would take a bay of this type next, if it were built: [hall id, hall] or null. */
  hallFor(co, type) {
    return Object.entries(this.cfg.halls).find(([hid, H]) => this.hallState(co, hid).state === 'site' && H.slots.some((sl) => sl.fits.includes(type))) || null;
  }

  /** Build one of Roost's halls: paid now, open after its build days (the site on the map becomes the building). */
  buildHall(co, id) {
    const H = this.cfg.halls[id];
    if (!H || !H.build) return { ok: false, text: 'No such hall.' };
    if (co.kind !== 'player') return { ok: false, text: 'Only Roost builds on its plots.' };
    if (this.hallState(co, id).state !== 'site') return { ok: false, text: `${H.name}: already built or being built.` };
    const disc = hallDiscount(this, co, id);
    const cost = Math.round(H.build * (1 - disc.pct));
    if (!this.canAfford(co, cost)) return { ok: false, text: `${H.name} costs ${cost.toLocaleString()} obols.` };
    this.pay(co, cost, null);
    co.books.capex += cost;
    co.halls[id] = this.now + Math.round(H.buildDays * DAY);
    if (disc.offer) { co.offers = co.offers.filter((o) => o !== disc.offer); this.report(co, 'facility', `🏗 The Park Authority's offer saved ${fmtMoney(H.build - cost)} on the ${H.name}.`, 'good'); }
    this.report(co, 'facility', `🏗 ${co.name} breaks ground: ${H.name} (open in ${H.buildDays} days).`, 'info');
    return { ok: true, text: `${H.name}: the site is open, and the building will be ready in ${H.buildDays} days.${disc.offer ? ` (${Math.round(disc.pct * 100)}% off, thanks to the Park Authority.)` : ''}` };
  }

  /**
   * Fit a bay. Roost's bays stand in a free slot of an open hall (the first that suits, or `slotId`);
   * with none free the answer says which hall to build. Meridian's halls are fixed on the map (its
   * bays carry the ids they were drawn for): a bay beyond them goes up at another of its sites —
   * unseen, and half as much again.
   */
  buildBay(co, type, slotId = null) {
    const B = this.cfg.bays[type];
    if (!B) return { ok: false, text: 'No such bay.' };
    let slot = null;
    let cost = B.build;
    if (co.kind === 'player') {
      slot = slotId ? this.slotsOf(co).find((sl) => sl.id === slotId && !sl.bay && sl.fits.includes(type)) : this.freeSlot(co, type);
      if (!slot) {
        const next = this.hallFor(co, type);
        return { ok: false, text: `There's no free slot for a ${B.name.toLowerCase()} in any hall you have.${next ? ` Build the ${next[1].name} first (${next[1].build.toLocaleString()} obols, ${next[1].buildDays} days).` : ''}` };
      }
    } else cost = Math.round(B.build * 1.5); // Meridian's halls on the map are full: a bay beyond them goes up at another of its sites
    if (!this.canAfford(co, cost)) return { ok: false, text: `A ${B.name.toLowerCase()} costs ${cost.toLocaleString()} obols.` };
    this.pay(co, cost, null);
    co.books.capex += cost;
    const n = co.bays.filter((b) => b.type === type).length + 1;
    co.bays.push({ id: `${type}_${n}`, type, unit: null, ready: this.now + Math.round(B.buildDays * DAY), ...(slot ? { slot: slot.id } : {}) });
    const where = slot ? ` in ${this.cfg.halls[slot.hall].short}` : '';
    this.report(co, 'facility', `🏗 ${co.name} is fitting ${B.name.toLowerCase()} No. ${n}${where} (ready in ${B.buildDays} days).`, co.kind === 'player' ? 'info' : null);
    if (co.kind === 'rival') this.news(`Meridian breaks ground on a new ${B.name.toLowerCase()} at Starling Flats.`);
    return { ok: true, text: `${B.name} No. ${n}${where} is being fitted: ready in ${B.buildDays} days.` };
  }

  /** Fixed facilities: the engine test cell, inspection equipment, a launch pad. Paid now, ready after their build days. */
  buildFacility(co, id) {
    const F = this.cfg.facilities[id];
    if (!F || !F.build) return { ok: false, text: 'No such facility.' };
    if ((id === 'pad' ? co.pad : co.facilities[id]) || co.building?.[id]) return { ok: false, text: `${F.name}: already built or being built.` };
    if (!this.canAfford(co, F.build)) return { ok: false, text: `${F.name} costs ${F.build.toLocaleString()} obols.` };
    this.pay(co, F.build, null);
    co.books.capex += F.build;
    (co.building ||= {})[id] = this.now + Math.round(F.buildDays * DAY);
    this.report(co, 'facility', `🏗 ${co.name} is building: ${F.name} (ready in ${F.buildDays} days).`, co.kind === 'player' ? 'info' : null);
    return { ok: true, text: `${F.name}: under construction, ready in ${F.buildDays} days.` };
  }

  /** Days of work still ahead of a unit at the company's current pace (an estimate). */
  unitDaysLeft(u) {
    const co = this.company(u.company);
    const p = this.pOf(u);
    return workLeft(this.cfg, p, u) / Math.max(0.3, this.speedOf(co) * this.staffing(co) * this.staffDrag(co));
  }

  /** Materials still to be bought or consumed for a unit, at their reference value. */
  unitCostLeft(u) {
    const C = this.cfg;
    const p = this.pOf(u);
    const need = remainingMaterials(C, p, u.stage + (u.consumed ? 1 : 0));
    return Object.entries(need).reduce((a, [m, n]) => a + n * C.materials[m].price, 0);
  }

  /** How many lots of a material all open units still need from here on. */
  demand(co, m) {
    let n = 0;
    for (const u of this.unitsOf(co)) n += remainingMaterials(this.cfg, this.pOf(u), u.stage + (u.consumed ? 1 : 0))[m] || 0;
    return n;
  }

  // ------------------------------------------------------------- tenders and bids
  openTenders() {
    return this.state.tenders.filter((t) => t.status === 'open');
  }

  tender(id) {
    return this.state.tenders.find((t) => t.id === id) || null;
  }

  /** Is a defence customer's country embargoed by the arms market right now? */
  embargoed(customerId) {
    const cu = this.cfg.customers[customerId];
    if (!cu?.country) return false;
    return Boolean(this.game.market.country(cu.country)?.embargo);
  }

  postTenders() {
    const C = this.cfg;
    const s = this.state;
    const rng = this.rng;
    for (const [id, cu] of Object.entries(C.customers)) {
      if (this.openTenders().length >= this.A.maxOpenTenders) break;
      if (this.openTenders().some((t) => t.customer === id)) continue;
      const weight = Object.values(cu.wants).reduce((a, b) => a + b, 0);
      if (rng.next() > C.tenderRate * weight) continue;
      const st = s.customers[id];
      const t = makeTender(C, rng, { id: this.nextId('T'), customerId: id, state: st, day: this.day, embargoed: this.embargoed(id) });
      if (!t) continue;
      st.budget -= t.ceiling * t.qty; // committed while the tender is open
      s.tenders.push(t);
      const p = this.pOf(t);
      if (this.owned) this.game.tablet.post('aero', `📣 Tender: ${cu.name} wants ${t.qty} × ${p.name} (up to ${fmtMoney(t.ceiling)} each, within ${t.days} days).`, 'info');
    }
    // keep the board tidy: closed tenders older than 6 days go
    s.tenders = s.tenders.filter((t) => t.status === 'open' || t.closes >= this.day - 6);
  }

  /** Everything the company needs to see about bidding (error, an estimate), without bidding. */
  bidQuote(companyId, tenderId, unitPrice = null, days = null) {
    const C = this.cfg;
    const co = this.company(companyId);
    const t = this.tender(tenderId);
    if (!co || !t) return { ok: false, reason: 'nothing to quote' };
    const p = this.pOf(t);
    const est = unitCost(C, p, { materialMult: this.materialMultiplier(co), freightShare: 0.08, speed: this.speedOf(co), failChance: failChance(C, p, this.qualityOf(co), { engineCell: co.facilities.engine_cell }) });
    const launch = p.line === 'satellite' ? this.launchShare(p) : 0;
    const delivery = this.deliveryEstimate(co, p, t.qty);
    const price = unitPrice ?? Math.min(t.ceiling, Math.round(((est.total + launch) * 1.25) / 100) * 100);
    const d = days ?? (Number.isFinite(delivery) ? Math.min(t.days, delivery) : t.days);
    const err = bidError(C, t, { unitPrice: price, days: d }, { quality: this.qualityOf(co), reputation: co.reputation, cleared: this.cleared(co), canBuild: this.canBuild(co, p), missing: missingTech(this.cfg, co, p).map((id) => this.cfg.research[id].name) });
    return { ok: !err, reason: err, unitPrice: price, days: d, delivery, cost: est.total + launch, est, launch, profit: (price - est.total - launch) * t.qty, value: price * t.qty, deposit: Math.round(price * t.qty * t.deposit) };
  }

  /** Place a sealed bid. Validates everything, so no caller can bypass the rules. */
  placeBid(companyId, tenderId, unitPrice, days) {
    const C = this.cfg;
    const co = this.company(companyId);
    const t = this.tender(tenderId);
    if (!co) return { ok: false, text: 'You don\'t have an aerospace company.' };
    if (!t) return { ok: false, text: 'No such tender.' };
    if (t.bids.some((b) => b.company === co.id)) return { ok: false, text: 'You\'ve already bid on this tender (bids are sealed and final).' };
    const p = this.pOf(t);
    const err = bidError(C, t, { unitPrice, days }, { quality: this.qualityOf(co), reputation: co.reputation, cleared: this.cleared(co), canBuild: this.canBuild(co, p), missing: missingTech(this.cfg, co, p).map((id) => this.cfg.research[id].name) });
    if (err) return { ok: false, text: `Can't bid: ${err}.` };
    t.bids.push({ company: co.id, unitPrice: Math.round(unitPrice), days: Math.round(days), at: this.now, valid: true });
    co.stats.tendersBid += 1;
    return { ok: true, text: `Bid placed: ${t.qty} × ${p.name} at ${Math.round(unitPrice).toLocaleString()} each, delivered within ${Math.round(days)} days. The customer decides on Day ${t.closes}.` };
  }

  /** Close tenders whose time is up: award the best valid bid, or let it lapse. */
  closeTenders() {
    const C = this.cfg;
    const s = this.state;
    const bidders = Object.fromEntries(this.companies().map((co) => [co.id, { quality: this.qualityOf(co), reputation: co.reputation }]));
    for (const t of s.tenders) {
      if (t.status !== 'open' || t.closes > this.day) continue;
      const cu = C.customers[t.customer];
      const st = s.customers[t.customer];
      st.budget += t.ceiling * t.qty; // the commitment is released; the award spends what it costs
      const ranked = rankBids(C, t, bidders);
      t.ranking = ranked.map((b) => ({ company: b.company, unitPrice: b.unitPrice, days: b.days, score: b.score, parts: Object.fromEntries(Object.entries(b.parts).map(([k, v]) => [k, Math.round(v * 100) / 100])) }));
      if (!ranked.length) {
        t.status = 'lapsed';
        continue;
      }
      const win = ranked[0];
      const co = this.company(win.company);
      t.status = 'awarded';
      t.winner = co.id;
      const c = this.makeContract(co, { customer: t.customer, product: t.product, qty: t.qty, unitPrice: win.unitPrice, days: win.days, quality: t.quality, depositShare: t.deposit, tender: t.id, config: t.config, event: t.event });
      t.contract = c.id;
      st.budget -= c.total;
      st.spent += c.total;
      co.stats.contractsWon += 1;
      // the deposit arrives now: cash in, owed as work until delivery
      this.receive(co, c.depositPaid, null);
      co.books.deferred += c.depositPaid;
      const p = this.pOf(t);
      const text = `${cu.name} awards ${co.name} ${t.qty} × ${p.name}${t.config ? ` (${configLabel(C, p, t.config).toLowerCase()})` : ''} (${fmtMoney(c.total)}).`;
      this.news(text, co.kind === 'player' ? 'good' : 'info');
      this.report(co, 'contract', `🏆 ${text} Deposit ${fmtMoney(c.depositPaid)}; due in ${win.days} days.`, co.kind === 'player' ? 'good' : null);
      for (const b of ranked.slice(1)) {
        const loser = this.company(b.company);
        if (loser?.kind === 'player') {
          // what the winner beat you on, by this customer's own weights (so the next bid can be better)
          const labels = { price: 'price', time: 'delivery time', quality: 'quality', reputation: 'reputation' };
          const gaps = Object.keys(labels).map((k) => [k, cu.priority[k] * (win.parts[k] - b.parts[k])]).filter(([, g]) => g > 0.005).sort((x, y) => y[1] - x[1]);
          const lesson = gaps.length ? ` You lost mainly on ${gaps.slice(0, 2).map(([k]) => labels[k]).join(' and ')}.` : '';
          this.report(loser, 'tender', `✖ ${cu.name} chose ${co.name} for ${t.qty} × ${p.name} (their ${fmtMoney(win.unitPrice)} a unit in ${win.days} days against your ${fmtMoney(b.unitPrice)} in ${b.days}).${lesson}`, 'warn');
        }
      }
    }
  }

  /** A contract and its units. Quantities are checked here — the authoritative place (≤ 5 aircraft). */
  makeContract(co, { customer, product, qty, unitPrice, days, quality, depositShare, tender, config = null, event = null }) {
    const C = this.cfg;
    const p = C.products[product];
    const err = quantityError(this.A, p, qty);
    if (err) throw new Error(`aerospace: ${err}`);
    const cfg = cleanConfig(config);
    const cerr = configError(C, p, cfg, product);
    if (cerr) throw new Error(`aerospace: ${cerr}`);
    const id = this.nextId('C');
    const total = unitPrice * qty;
    const c = {
      id, company: co.id, customer, product, qty, unitPrice, total, quality,
      deposit: depositShare, depositPaid: Math.round(total * depositShare),
      signed: this.now, due: this.now + Math.round(days * DAY), tender,
      status: 'active', units: [], delivered: 0, failed: 0, revenue: 0, penalties: 0, settled: {}, history: [{ at: this.now, text: 'Signed.' }],
      ...(Object.keys(cfg).length ? { config: cfg } : {}),
      ...(event ? { event } : {}),
    };
    this.state.contracts[id] = c;
    for (let n = 0; n < qty; n++) {
      const u = newUnit(C, { id: this.nextId('U'), company: co.id, contract: id, productId: product, n: n + 1, rng: this.rng, at: this.now });
      if (c.config) u.config = c.config;
      this.state.units[u.id] = u;
      c.units.push(u.id);
    }
    this.syncRng();
    return c;
  }

  contract(id) {
    return this.state.contracts[id] || null;
  }

  contractsOf(co, status = null) {
    return Object.values(this.state.contracts).filter((c) => c.company === co.id && (!status || (Array.isArray(status) ? status.includes(c.status) : c.status === status)));
  }

  unitsOf(co, { open = true } = {}) {
    return Object.values(this.state.units).filter((u) => u.company === co.id && (!open || !u.finished));
  }

  /** Cancel an accepted contract: the deposit is forfeit (refunded to the customer) and a penalty is paid. */
  cancelContract(companyId, contractId) {
    const co = this.company(companyId);
    const c = this.contract(contractId);
    if (!co || !c || c.company !== co.id || c.status !== 'active') return { ok: false, text: 'Only an active contract of yours can be cancelled.' };
    const open = c.units.map((id) => this.state.units[id]).filter((u) => !u.finished);
    const owedDeposit = Math.round(c.depositPaid * (open.length / c.qty));
    const penalty = Math.round(c.unitPrice * open.length * this.A.cancelPenalty);
    this.pay(co, owedDeposit, null);
    co.books.deferred -= owedDeposit;
    this.pay(co, penalty, 'penalties');
    for (const u of open) this.retire(u, 'cancelled');
    c.status = 'cancelled';
    c.penalties += penalty;
    c.history.push({ at: this.now, text: `Cancelled: deposit returned (${fmtMoney(owedDeposit)}), penalty ${fmtMoney(penalty)}.` });
    co.stats.cancelled += 1;
    this.repChange(co, this.A.reputation.cancelled, `Cancelled a contract for ${this.cfg.customers[c.customer].name}`);
    this.news(`${co.name} cancels its contract for ${this.cfg.customers[c.customer].name}.`, 'warn');
    return { ok: true, text: `Contract cancelled: ${fmtMoney(owedDeposit)} deposit returned and a ${fmtMoney(penalty)} penalty paid.` };
  }

  /** A unit leaves production without being delivered: its bay, pad and reserved materials go back. */
  retire(u, why) {
    const co = this.company(u.company);
    if (u.bay) this.freeBay(co, u);
    if (co.pad?.unit === u.id) { co.pad.unit = null; if (co.pad.roll?.unit === u.id) co.pad.roll = null; }
    for (const [m, n] of Object.entries(u.reserved)) {
      const r = co.inv[m];
      if (r) r.reserved = Math.max(0, r.reserved - n);
    }
    u.reserved = {};
    u.finished = this.now;
    u.status = why;
  }

  // ------------------------------------------------------------- materials and purchase orders
  stock(co, m) {
    if (!co.inv[m]) co.inv[m] = { qty: 0, reserved: 0, value: 0, freight: 0 };
    return co.inv[m];
  }

  free(co, m) {
    const r = co.inv[m];
    return r ? r.qty - r.reserved : 0;
  }

  /** A supplier's price per lot to this company (Meridian Applied Sciences charges outsiders a premium). */
  supplierPrice(co, supplierId, m) {
    const sp = this.cfg.suppliers[supplierId];
    const base = this.cfg.materials[m].price * sp.sells[m];
    return Math.round(base * (sp.rivalOwned && co.id !== 'meridian' ? 1 + this.cfg.rivalPremium : 1));
  }

  /** Freight, duty and handling for an order, and when it would arrive. Nothing changes. */
  freightQuote(co, supplierId, m, qty) {
    const C = this.cfg;
    const F = C.freight;
    const sp = C.suppliers[supplierId];
    const unit = this.supplierPrice(co, supplierId, m);
    const goods = unit * qty;
    const volume = qty * (C.materials[m].volume || 1);
    const lead = sp.lead * DAY;
    if (sp.where === 'local') {
      return { goods, unitPrice: unit, freight: F.truck, duty: 0, handling: 0, mode: 'truck', km: 0, hours: lead / 60 + F.truckHours, arrive: this.now + Math.round(lead + F.truckHours * 60), volume };
    }
    const L = this.game.logistics;
    const r = L.route(sp.where, F.receivingPort);
    const km = r?.km ?? 8000;
    const sea = L.sailHours(km, F.knots);
    const freight = Math.max(F.minimum, Math.round(goods * F.valueShare + volume * F.perUnitPerKkm * (km / 1000)));
    const country = L.port(sp.where)?.country;
    const duty = country ? Math.round(goods * F.duty) : 0;
    const hours = lead / 60 + sea + F.truckHours + 2;
    return { goods, unitPrice: unit, freight, duty, handling: F.handling, mode: 'carrier', km, hours, sea, arrive: this.now + Math.round(hours * 60), volume };
  }

  /**
   * Order materials. Stock at the supplier is taken now; goods, duty, freight
   * and handling are paid now (an asset until used). forUnits: { unitId: lots }
   * the lots are reserved for on arrival.
   */
  /** How an order from this supplier would travel for this company: 'truck' (local), 'internal' or 'carrier'. */
  modeFor(co, supplierId, mode = null) {
    const sp = this.cfg.suppliers[supplierId];
    if (sp.where === 'local') return 'truck';
    if (mode) return mode === 'internal' && this.canShipInternal(co) ? 'internal' : 'carrier';
    return co.shipping === 'internal' && this.canShipInternal(co) ? 'internal' : 'carrier';
  }

  /** Internal shipping needs the player's company and Ober & Sons Maritime. */
  canShipInternal(co) {
    return co.kind === 'player' && this.game.logistics.owned;
  }

  /**
   * Order materials. Stock at the supplier is taken now; goods and duty are paid now (an asset
   * until used). By carrier (or truck) the freight is paid now too; in your own ships the job's
   * internal charge is paid when a ship loads it. forUnits: { unitId: lots } reserved on arrival.
   * opts.mode: 'carrier' | 'internal' (default: the company's shipping setting).
   */
  order(co, supplierId, m, qty, forUnits = {}, opts = {}) {
    const C = this.cfg;
    const sp = C.suppliers[supplierId];
    const ss = this.state.suppliers[supplierId];
    if (!sp || !sp.sells[m]) return { ok: false, text: 'That supplier doesn\'t sell that.' };
    qty = Math.floor(qty);
    if (qty <= 0) return { ok: false, text: 'Order how many?' };
    if ((ss.stock[m] || 0) < qty) return { ok: false, text: `${sp.name} has only ${ss.stock[m] || 0} lots of ${C.materials[m].name.toLowerCase()} in stock.` };
    if (C.materials[m].secure && !this.cleared(co)) return { ok: false, text: `${C.materials[m].name} are controlled: you need security clearance.` };
    const mode = this.modeFor(co, supplierId, opts.mode);
    const q = this.freightQuote(co, supplierId, m, qty);
    const internal = mode === 'internal';
    const total = q.goods + q.duty + (internal ? 0 : q.freight + q.handling);
    if (!this.canAfford(co, total)) return { ok: false, text: `The order costs ${total.toLocaleString()} obols${internal ? ' (freight comes later, in your own ship)' : ' with freight'}.` };
    ss.stock[m] -= qty;
    this.pay(co, total, null);
    co.books.inventoryValue += total;
    if (!internal && q.mode === 'carrier') { co.freight.external += q.freight + q.handling; co.freight.equivalent += q.freight + q.handling; }
    // a late shipment is decided now, by the supplier's reliability (kept with the order)
    const rng = this.rng;
    const late = rng.next() > sp.reliability ? Math.round((6 + rng.next() * 30) * 60) : 0;
    const id = this.nextId('PO');
    const po = {
      id, company: co.id, supplier: supplierId, material: m, qty, unitPrice: q.unitPrice, goods: q.goods + q.duty, freight: internal ? 0 : q.freight + q.handling, freightInt: 0,
      extFreight: q.freight + q.handling, volume: q.volume, mode: internal ? 'internal' : q.mode, km: q.km, placed: this.now, ready: this.now + Math.round(sp.lead * DAY) + (internal ? late : 0),
      arrive: q.arrive + late, late, status: 'preparing', for: { ...forUnits },
    };
    this.state.pos[id] = po;
    if (internal) {
      const job = this.attachToJob(co, po, sp.where);
      po.arrive = this.jobEta(job);
    }
    if (sp.oil) this.oilSale(total);
    this.syncRng();
    return { ok: true, po, text: `Ordered ${qty} × ${C.materials[m].name} from ${sp.name}: ${total.toLocaleString()} obols${internal ? `, to come in your own ship (${po.job})` : ''}, due about ${this.when(po.arrive - (internal ? 0 : late))}.` };
  }

  /** Ober's Oil sells to the Park: the refinery books the barrels (it shows up in its output and dividends). */
  oilSale(value) {
    const o = this.game.oil.state;
    o.aeroSales = (o.aeroSales || 0) + value;
  }

  ordersOf(co, open = true) {
    return Object.values(this.state.pos).filter((p) => p.company === co.id && (!open || !['received', 'lost'].includes(p.status)));
  }

  /** Lots of a material on order for a unit (not yet received). */
  onOrderFor(co, unitId, m) {
    let n = 0;
    for (const po of this.ordersOf(co)) if (po.material === m) n += po.for[unitId] || 0;
    return n;
  }

  /** Lots on order not earmarked for any unit. */
  onOrderSpare(co, m) {
    let n = 0;
    for (const po of this.ordersOf(co)) if (po.material === m) n += po.qty - Object.values(po.for).reduce((a, b) => a + b, 0);
    return n;
  }

  /** What each open unit still needs of each material, beyond what's reserved or on order for it. */
  shortfalls(co) {
    const C = this.cfg;
    const out = [];
    const units = this.unitsOf(co).filter((u) => u.purpose !== 'held').sort((a, b) => this.priority(a) - this.priority(b));
    for (const u of units) {
      const p = this.pOf(u);
      const need = remainingMaterials(C, p, u.stage + (u.consumed ? 1 : 0));
      for (const [m, n] of Object.entries(need)) {
        const have = (u.reserved[m] || 0) + this.onOrderFor(co, u.id, m);
        if (n > have) out.push({ unit: u.id, material: m, qty: n - have });
      }
    }
    return out;
  }

  /** Sooner deadline first. */
  priority(u) {
    const c = this.contract(u.contract);
    return c ? c.due : this.now + 30 * DAY;
  }

  /** Cheapest landed cost per lot for a material across suppliers with stock. */
  bestSupplier(co, m, qty) {
    const C = this.cfg;
    let best = null;
    for (const [id, sp] of Object.entries(C.suppliers)) {
      if (!sp.sells[m]) continue;
      const stock = this.state.suppliers[id].stock[m] || 0;
      if (stock <= 0) continue;
      const n = Math.min(qty, stock);
      const q = this.freightQuote(co, id, m, n);
      // in your own ships the freight is a small internal charge, and the time is the ship's
      const internal = this.modeFor(co, id) === 'internal';
      if (internal) {
        const iq = this.internalQuote(co, sp.where, q.volume, this.now + sp.lead * DAY);
        q.freight = Math.round(q.freight * (iq.ok ? iq.rate : this.cfg.internal.rates.inefficient));
        q.handling = 0;
        q.hours = iq.ok ? (iq.eta - this.now) / 60 : q.hours * 1.5; // no ship free yet: it'll wait (or go by carrier)
        q.internal = true;
      }
      const per = (q.goods + q.freight + q.duty + q.handling) / n;
      const score = per * (1 + (q.hours / 24) * 0.01); // a little weight on speed
      if (!best || score < best.score) best = { id, n, per, score, q };
    }
    return best;
  }

  // ------------------------------------------------------------- internal shipping (v0.56.0)
  // A job is a consignment from one supplier port to Mill Road Docks in one of your Ober & Sons
  // ships: { id, company, origin, dest, pos[], units, value, status, vessel, rate, charge, extFreight,
  // voyageCost, priority, created, eta, log[] }. status: waiting (for a ship) → reserved (a ship is
  // holding for it at the port) / repositioning (a ship is coming empty) → loading → at sea →
  // landed (trucks up the Cut) → delivered; or carrier (switched to an independent carrier), lost.

  jobs(co, open = true) {
    return Object.values(this.state.jobs || {}).filter((j) => j.company === co.id && (!open || !['delivered', 'carrier', 'lost'].includes(j.status)));
  }

  job(id) {
    return this.state.jobs?.[id] || null;
  }

  /** The largest hold in your fleet (a job never grows beyond what one ship could carry). */
  maxHold() {
    const L = this.game.logistics;
    return Math.max(0, ...L.vessels().filter((v) => v.status !== 'lost').map((v) => L.stats(v).capacity || 0));
  }

  /** Put an internal order in a consignment from the same port that hasn't loaded yet, or start one. */
  attachToJob(co, po, origin) {
    const s = this.state;
    s.jobs ||= {};
    const F = this.cfg.freight;
    let job = this.jobs(co).find((j) => j.origin === origin && ['waiting', 'reserved', 'repositioning'].includes(j.status) && j.units + po.volume <= Math.max(this.maxHold(), j.units) && (!j.vessel || this.game.logistics.stats(this.game.logistics.vessel(j.vessel)).capacity >= j.units + po.volume));
    if (!job) {
      const id = this.nextId('SJ');
      job = { id, company: co.id, origin, dest: F.receivingPort, pos: [], units: 0, value: 0, status: 'waiting', vessel: null, rate: null, charge: 0, extFreight: 0, voyageCost: 0, priority: 'normal', created: this.now, eta: null, log: [{ at: this.now, text: 'Consignment opened.' }] };
      s.jobs[id] = job;
    }
    job.pos.push(po.id);
    job.units += po.volume;
    job.value += po.goods;
    job.extFreight += po.extFreight;
    po.job = job.id;
    if (job.vessel) { const v = this.game.logistics.vessel(job.vessel); if (v?.cargo?.type === 'aero') v.cargo.units = job.units; }
    return job;
  }

  /** When everything in a job is ready at the port (the latest supplier lead time). */
  jobReadyAt(job) {
    return Math.max(this.now, ...job.pos.map((id) => this.state.pos[id]?.ready ?? this.now));
  }

  /**
   * Which of your ships could carry `units` from `origin` to Mill Road, and when it would arrive,
   * without doing anything. readyAt: when the goods will be at the port.
   */
  internalQuote(co, origin, units, readyAt = this.now, { except = null } = {}) {
    const L = this.game.logistics;
    const C = this.cfg;
    const dest = C.freight.receivingPort;
    if (!this.canShipInternal(co)) return { ok: false, reasons: ['you don\'t own a shipping line'] };
    let best = null;
    const reasons = [];
    for (const v of L.vessels()) {
      if (v.id === except) continue;
      const st = L.stats(v);
      if (!st.capacity || v.kind !== 'cargo') continue;
      if (v.status !== 'docked' || v.contract || v.cargo || v.convoyOf) continue;
      if (st.capacity < units) { reasons.push(`the ${v.name} holds ${st.capacity} units (this is ${units})`); continue; }
      const leg = L.plan(v, dest, units, origin);
      const bad = leg.reasons.filter((r) => !r.startsWith('it\'s already') && !r.includes('isn\'t free'));
      if (bad.length) { reasons.push(`the ${v.name}: ${bad[0]}`); continue; }
      let arriveAtOrigin = this.now;
      let empty = null;
      if (v.port !== origin) {
        empty = L.plan(v, origin);
        if (!empty.ok) { reasons.push(`the ${v.name}: ${empty.reasons[0]}`); continue; }
        arriveAtOrigin = this.now + Math.round(empty.hours * 60);
      }
      const eta = Math.max(arriveAtOrigin, readyAt) + Math.round((leg.load + leg.hours + C.freight.truckHours) * 60);
      const established = (v.log || []).concat(...L.vessels().map((x) => x.log || [])).some((e) => e.from === origin && e.to === dest && e.arrived > this.now - C.internal.establishedDays * DAY);
      const rate = v.port !== origin ? C.internal.rates.inefficient : established ? C.internal.rates.established : C.internal.rates.standard;
      const cost = leg.cost + (empty?.cost || 0);
      if (!best || eta < best.eta) best = { ok: true, vessel: v, eta, rate, cost, leg, empty, atOrigin: v.port === origin };
    }
    return best || { ok: false, reasons: reasons.length ? reasons : ['no ship of yours is free'] };
  }

  jobEta(job) {
    const co = this.company(job.company);
    if (job.eta) return job.eta;
    const q = this.internalQuote(co, job.origin, job.units, this.jobReadyAt(job));
    return q.ok ? q.eta : this.jobReadyAt(job) + 3 * DAY;
  }

  /** Every 15 minutes: find ships for waiting jobs, load ready ones, give up on hopeless ones (policy 'fallback'). */
  dispatch() {
    const L = this.game.logistics;
    const co = this.roost;
    if (!co) return;
    const jobs = this.jobs(co).sort((a, b) => (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1) || a.created - b.created);
    for (const job of jobs) {
      let v = job.vessel && L.vessel(job.vessel);
      if (job.vessel && (!v || v.status === 'lost' || (v.cargo && v.cargo.job !== job.id))) {
        job.log.push({ at: this.now, text: v ? `The ${v.name} can no longer take it.` : 'Its ship is gone.' });
        if (v?.cargo?.job === job.id) L.releaseAero(v);
        job.vessel = null;
        job.status = 'waiting';
        v = null;
      }
      if (job.status === 'waiting') {
        const q = this.internalQuote(co, job.origin, job.units, this.jobReadyAt(job));
        if (q.ok) {
          v = q.vessel;
          job.vessel = v.id;
          job.rate = q.rate;
          L.reserveForAero(v, job);
          if (q.atOrigin) {
            job.status = 'reserved';
            job.log.push({ at: this.now, text: `The ${v.name} is held at ${L.port(job.origin).name} for it.` });
          } else {
            const r = L.repositionForAero(v, job.origin, job);
            if (!r.ok) { L.releaseAero(v); job.vessel = null; job.log.push({ at: this.now, text: `Couldn't send the ${v.name}: ${r.text}.` }); continue; }
            job.voyageCost += r.cost;
            job.status = 'repositioning';
            job.log.push({ at: this.now, text: `The ${v.name} is sailing empty to ${L.port(job.origin).name} to collect it (${r.cost.toLocaleString()} obols running costs and fees).` });
          }
          job.eta = q.eta;
          this.setJobEta(job, q.eta);
        } else if (co.internalPolicy === 'fallback' && this.now - job.created > this.cfg.internal.fallbackHours * 60) {
          this.jobToCarrier(job, `no ship of yours could take it within ${this.cfg.internal.fallbackHours} hours (${q.reasons[0]})`);
        } else job.waitingWhy = q.reasons[0];
        continue;
      }
      if (['reserved', 'repositioning'].includes(job.status) && v && v.status === 'docked' && v.port === job.origin) {
        if (job.status === 'repositioning') { job.status = 'reserved'; job.log.push({ at: this.now, text: `The ${v.name} has arrived at ${L.port(job.origin).name}.` }); }
        const pos = job.pos.map((id) => this.state.pos[id]);
        if (!pos.every((po) => po.status === 'ready')) continue;
        const r = L.loadAero(v, job, job.value);
        if (!r.ok) { job.waitingWhy = r.text; continue; }
        job.voyageCost += r.cost;
        // the aerospace division pays the shipping division: a share of what a carrier would have charged
        const charge = Math.round(job.extFreight * job.rate);
        this.pay(co, charge, null);
        co.books.inventoryValue += charge;
        L.earnInternal(charge);
        job.charge = charge;
        for (const po of pos) { po.freightInt = Math.round(charge * (po.volume / job.units)); po.status = 'loading'; }
        co.freight.internalCharges += charge;
        co.freight.equivalent += job.extFreight;
        job.status = 'loading';
        job.log.push({ at: this.now, text: `Loading into the ${v.name}: ${job.units} units. Internal charge ${charge.toLocaleString()} (${(job.rate * 100).toFixed(1)}% of the ${job.extFreight.toLocaleString()} a carrier would charge).` });
      }
    }
  }

  closeJobs() {
    for (const job of this.jobs(this.roost)) if (job.status === 'landed' && job.pos.every((id) => ['received', 'lost'].includes(this.state.pos[id]?.status))) { job.status = 'delivered'; job.delivered = this.now; job.log.push({ at: this.now, text: 'In stores.' }); }
  }

  /** Keep a job's orders' arrival in step with its ship. */
  setJobEta(job, eta) {
    job.eta = eta;
    for (const id of job.pos) { const po = this.state.pos[id]; if (po && !['received', 'lost'].includes(po.status)) po.arrive = eta; }
  }

  /** Logistics: the ship has sailed with the job (src/systems/logistics.js depart). */
  jobSailed(id, v) {
    const job = this.job(id);
    if (!job) return;
    job.status = 'at sea';
    job.departed = this.now;
    this.setJobEta(job, v.voyage.arrive + this.cfg.freight.truckHours * 60);
    for (const pid of job.pos) { const po = this.state.pos[pid]; if (po) po.status = 'at sea'; }
    job.log.push({ at: this.now, text: `Sailed in the ${v.name}, due at Mill Road ${this.when(v.voyage.arrive)}.` });
  }

  /** Logistics: the voyage's arrival moved (a delay). Production waiting on these lots sees the new time. */
  syncJob(v) {
    const job = this.job(v.voyage?.job);
    if (!job) return;
    const eta = v.voyage.arrive + this.cfg.freight.truckHours * 60;
    if (eta !== job.eta) {
      const late = Math.round((eta - job.eta) / 60);
      job.log.push({ at: this.now, text: `Delayed ${late} h at sea — now due ${this.when(eta)}.` });
      job.delayed = (job.delayed || 0) + late;
      this.setJobEta(job, eta);
      const hit = this.affectedUnits(job);
      if (hit.length) this.report(this.company(job.company), 'supply', `⏳ The ${v.name} is delayed ${late} h with ${job.id}: ${hit.map((u) => `${this.pOf(u).name} #${u.n}`).join(', ')} will wait for its materials.`, 'warn');
    }
  }

  /** Logistics: landed at Mill Road; the trucks take it up the Cut. */
  jobLanded(id) {
    const job = this.job(id);
    if (!job) return;
    job.status = 'landed';
    this.setJobEta(job, this.now + this.cfg.freight.truckHours * 60);
    for (const pid of job.pos) { const po = this.state.pos[pid]; if (po) po.status = 'trucking'; }
    const co = this.company(job.company);
    co.freight.voyageCosts += job.voyageCost;
    job.log.push({ at: this.now, text: 'Landed at Mill Road Docks; on the trucks up the Cut.' });
  }

  /** Logistics: pirates took the cargo (or the ship). The goods are lost; units waiting on them will be re-ordered for. */
  jobLost(id, how) {
    const job = this.job(id);
    if (!job) return;
    const co = this.company(job.company);
    job.status = 'lost';
    let lost = 0;
    for (const pid of job.pos) {
      const po = this.state.pos[pid];
      if (!po || po.status === 'received') continue;
      po.status = 'lost';
      lost += po.goods + po.freightInt;
    }
    co.books.inventoryValue -= lost;
    post(co.books, this.day, 'losses', lost, this.A.historyDays);
    co.freight.voyageCosts += job.voyageCost;
    job.log.push({ at: this.now, text: `Lost at sea (${how}).` });
    this.report(co, 'supply', `☠ ${job.id}'s cargo was lost (${how}): ${Math.round(lost).toLocaleString()} obols of materials. The units that needed them will be re-ordered for.`, 'warn');
  }

  /** Send a job's orders by an independent carrier instead (before a ship has loaded them): the market freight is paid now. */
  jobToCarrier(job, why = 'you sent it by carrier') {
    const L = this.game.logistics;
    const co = this.company(job.company);
    if (!['waiting', 'reserved', 'repositioning'].includes(job.status)) return { ok: false, text: 'It\'s already on its way in your ship.' };
    if (job.vessel) { const v = L.vessel(job.vessel); if (v?.cargo?.job === job.id) L.releaseAero(v); }
    let freight = 0;
    for (const pid of job.pos) {
      const po = this.state.pos[pid];
      const q = this.freightQuote(co, po.supplier, po.material, po.qty);
      const f = q.freight + q.handling;
      this.pay(co, f, null);
      co.books.inventoryValue += f;
      co.freight.external += f;
      co.freight.equivalent += f;
      freight += f;
      po.freight = f;
      po.mode = 'carrier';
      po.status = this.now >= po.ready ? 'transit' : 'preparing';
      po.arrive = Math.max(this.now, po.ready) + Math.round((q.sea + this.cfg.freight.truckHours + 2) * 60) + (po.late || 0);
    }
    job.status = 'carrier';
    job.vessel = null;
    job.log.push({ at: this.now, text: `Switched to ${this.cfg.freight.carrier}: ${why}. Freight ${freight.toLocaleString()} obols.` });
    this.report(co, 'supply', `🚚 ${job.id} goes by carrier: ${why} (${freight.toLocaleString()} obols freight).`, 'warn');
    return { ok: true, text: `${job.id} goes by carrier (${freight.toLocaleString()} obols freight).` };
  }

  setJobPriority(id, priority) {
    const job = this.job(id);
    if (!job) return { ok: false, text: 'No such consignment.' };
    job.priority = priority === 'urgent' ? 'urgent' : 'normal';
    return { ok: true, text: `${job.id}: ${job.priority} priority.` };
  }

  /** Units waiting on a job's lots. */
  affectedUnits(job) {
    const ids = new Set();
    for (const pid of job.pos) for (const uid of Object.keys(this.state.pos[pid]?.for || {})) ids.add(uid);
    return [...ids].map((id) => this.state.units[id]).filter((u) => u && !u.finished);
  }

  /** Freight saved by your own ships so far: for the aerospace division (charges vs a carrier), and for the group (real voyage costs vs a carrier). */
  shippingSavings(co) {
    const done = Object.values(this.state.jobs || {}).filter((j) => j.company === co.id && ['landed', 'delivered'].includes(j.status) || (j.company === co.id && j.status === 'at sea'));
    const eq = done.reduce((a, j) => a + j.extFreight, 0);
    const charges = done.reduce((a, j) => a + j.charge, 0);
    const voyages = done.reduce((a, j) => a + j.voyageCost, 0);
    return { jobs: done.length, equivalent: eq, charges, voyages, division: eq - charges, group: eq - voyages };
  }

  /**
   * What owning the ships is worth over the rest of the work in hand: the foreign materials still to
   * be ordered, their carrier freight against the internal rate (an estimate at the standard rate).
   */
  expectedSavings(co) {
    const C = this.cfg;
    let ext = 0;
    for (const sf of this.shortfalls(co)) {
      const imp = Object.entries(C.suppliers).filter(([, sp]) => sp.sells[sf.material] && sp.where !== 'local');
      if (!imp.length) continue;
      const q = this.freightQuote(co, imp[0][0], sf.material, sf.qty);
      ext += q.freight + q.handling;
    }
    return { carrier: ext, internal: Math.round(ext * C.internal.rates.standard), saving: Math.round(ext * (1 - C.internal.rates.standard)) };
  }

  /** Reserve free stock for shortfalls first, then order what's left from the cheapest suppliers. */
  autoProcure(co) {
    const C = this.cfg;
    // reserve spare stock for units that need it (priority order)
    for (const sf of this.shortfalls(co)) {
      const free = this.free(co, sf.material);
      if (free <= 0) continue;
      this.reserve(co, this.state.units[sf.unit], sf.material, Math.min(free, sf.qty));
    }
    const byMat = {};
    for (const sf of this.shortfalls(co)) (byMat[sf.material] ||= []).push(sf);
    const placed = [];
    for (const [m, list] of Object.entries(byMat)) {
      let total = list.reduce((a, b) => a + b.qty, 0);
      let guard = 0;
      while (total > 0 && guard++ < 6) {
        const best = this.bestSupplier(co, m, total);
        if (!best) break;
        const forUnits = {};
        let left = best.n;
        for (const sf of list) {
          if (left <= 0) break;
          const k = Math.min(left, sf.qty);
          if (k <= 0) continue;
          forUnits[sf.unit] = (forUnits[sf.unit] || 0) + k;
          sf.qty -= k;
          left -= k;
        }
        const r = this.order(co, best.id, m, best.n, forUnits);
        if (!r.ok) break;
        placed.push(r.po);
        total -= best.n;
      }
    }
    return placed;
  }

  reserve(co, u, m, n) {
    const r = this.stock(co, m);
    const k = Math.min(n, r.qty - r.reserved);
    if (k <= 0) return 0;
    r.reserved += k;
    u.reserved[m] = (u.reserved[m] || 0) + k;
    return k;
  }

  /** A stage starts: its lots leave stock (at their average cost) and become part of the unit. */
  consume(co, u, mats) {
    for (const [m, n] of Object.entries(mats)) {
      const r = this.stock(co, m);
      const per = r.qty ? r.value / r.qty : 0;
      const perF = r.qty ? r.freight / r.qty : 0;
      const perI = r.qty ? (r.freightInt || 0) / r.qty : 0;
      r.qty -= n;
      r.reserved -= n;
      r.value -= per * n;
      r.freight -= perF * n;
      r.freightInt = (r.freightInt || 0) - perI * n;
      u.reserved[m] -= n;
      if (!u.reserved[m]) delete u.reserved[m];
      u.cost.materials += per * n;
      u.cost.freight += perF * n;
      u.cost.freightInt = (u.cost.freightInt || 0) + perI * n;
      co.books.inventoryValue -= (per + perF + perI) * n;
    }
  }

  /** Purchase orders move along: prepared → shipped → at the docks → trucked up → received (and reserved for their units). */
  tickOrders() {
    for (const po of Object.values(this.state.pos)) {
      if (po.status === 'received') continue;
      if (po.mode === 'internal') {
        // in your own ship: ready at the supplier's port, then the job moves it (loading → at sea → landed → trucking)
        if (po.status === 'preparing' && this.now >= po.ready) po.status = 'ready';
        if (po.status === 'trucking' && this.now >= po.arrive) this.receivePO(po);
        continue;
      }
      if (po.status === 'preparing' && this.now >= po.ready) po.status = 'transit';
      if (po.status === 'transit' && this.now >= po.arrive - (this.cfg.freight.truckHours + 2) * 60 && po.mode === 'carrier') po.status = 'trucking';
      if (po.status === 'transit' && po.mode === 'truck' && this.now >= po.ready) po.status = 'trucking';
      if (['trucking', 'transit'].includes(po.status) && this.now >= po.arrive) this.receivePO(po);
    }
  }

  receivePO(po) {
    const co = this.company(po.company);
    if (!co || po.status === 'received') return;
    po.status = 'received';
    po.received = this.now;
    const r = this.stock(co, po.material);
    r.qty += po.qty;
    r.value += po.goods;
    r.freight += po.freight;
    r.freightInt = (r.freightInt || 0) + (po.freightInt || 0);
    // the lots earmarked for units are reserved for them on arrival
    for (const [uid, n] of Object.entries(po.for)) {
      const u = this.state.units[uid];
      if (u && !u.finished) this.reserve(co, u, po.material, n);
    }
    if (po.late && co.kind === 'player') this.report(co, 'supply', `⏳ ${po.qty} × ${this.cfg.materials[po.material].name} from ${this.cfg.suppliers[po.supplier].name} arrived ${Math.round(po.late / 60)} h late.`, 'warn');
  }

  // ------------------------------------------------------------- production
  /** Advance every open unit by `minutes` of game time. */
  tickProduction(minutes = 1) {
    const C = this.cfg;
    for (const co of this.companies()) {
      const staff = this.staffing(co);
      const speed = this.speedOf(co);
      const units = this.unitsOf(co).sort((a, b) => this.priority(a) - this.priority(b));
      for (const u of units) this.step(co, u, minutes, staff * speed);
    }
    void C;
  }

  stageOf(u) {
    return stagesOf(this.cfg, this.pOf(u))[u.stage];
  }

  /** Move a unit to its next stage (consuming that stage's materials when it can). */
  advance(co, u) {
    const C = this.cfg;
    const p = this.pOf(u);
    const st = stagesOf(C, p);
    if (u.bay && u.stage >= lastBayStage(C, p)) this.freeBay(co, u);
    u.stage += 1;
    u.work = 0;
    u.consumed = false;
    u.blocker = null;
    u.log.push({ at: this.now, stage: st[u.stage]?.id });
    if (u.log.length > 24) u.log.shift();
    const s = st[u.stage];
    if (!s) return;
    u.need = stageDays(C, p, s);
  }

  freeBay(co, u) {
    const b = co.bays.find((x) => x.id === u.bay);
    if (b && b.unit === u.id) b.unit = null;
    u.bay = null;
  }

  step(co, u, minutes, rate) {
    const C = this.cfg;
    const p = this.pOf(u);
    const s = this.stageOf(u);
    if (!s) return;
    // the stage's materials must be in hand before its work starts
    if (!u.consumed) {
      const mats = stageMaterials(p, s);
      const missing = Object.entries(mats).filter(([m, n]) => (u.reserved[m] || 0) < n);
      for (const [m, n] of missing) this.reserve(co, u, m, n - (u.reserved[m] || 0));
      const still = Object.entries(mats).filter(([m, n]) => (u.reserved[m] || 0) < n);
      if (still.length) {
        u.blocker = { kind: 'materials', text: `waiting for ${still.map(([m, n]) => `${n - (u.reserved[m] || 0)} × ${C.materials[m].name.toLowerCase()}`).join(', ')}` };
        u.status = u.bay ? 'blocked' : 'waiting';
        return;
      }
      // a bay is taken only once the work can start (nobody holds a bay waiting for parts)
      if (s.bay && !u.bay && !this.takeBay(co, u)) return;
      this.consume(co, u, mats);
      u.consumed = true;
      u.blocker = null;
    }
    if (s.kind === 'wait') return this.waitStep(co, u, s);
    if (s.kind === 'event') return this.eventStep(co, u, s);
    // work
    u.status = s.bay ? 'building' : s.office ? 'engineering' : s.kind === 'convoy' ? 'convoy' : s.kind === 'commission' ? 'orbit' : s.id === 'secure_storage' ? 'storage' : 'pad';
    if (!u.started) u.started = this.now;
    if (s.kind === 'convoy' && !u.convoy) startConvoy(this, co, u);
    const r = (s.bay ? rate : s.office ? this.speedOf(co) * this.engineerRate(co) : 1) * (s.kind === 'inspect' ? this.inspectorRate(co) : 1);
    u.work += (minutes / DAY) * r;
    if (u.work + 1e-9 < u.need) return;
    if (s.kind === 'inspect') return this.inspect(co, u, s);
    if (s.kind === 'commission') return this.commission(co, u);
    this.advance(co, u);
  }

  waitStep(co, u, s) {
    const C = this.cfg;
    const p = this.pOf(u);
    if (s.wait === 'slot') return this.advance(co, u);
    if (s.wait === 'materials') {
      // procurement: every lot for the rest of the build is in hand or on order for this unit
      const need = remainingMaterials(C, p, u.stage + 1);
      const short = Object.entries(need).filter(([m, n]) => (u.reserved[m] || 0) + this.onOrderFor(co, u.id, m) < n);
      if (short.length) {
        if (co.autoProcure && (!u.procuredAt || this.now - u.procuredAt > 120)) { u.procuredAt = this.now; this.autoProcure(co); }
        const still = Object.entries(need).filter(([m, n]) => (u.reserved[m] || 0) + this.onOrderFor(co, u.id, m) < n);
        if (still.length) {
          u.status = 'blocked';
          u.blocker = { kind: 'materials', text: `materials not yet ordered: ${still.map(([m]) => C.materials[m].name.toLowerCase()).join(', ')}` };
          return;
        }
      }
      return this.advance(co, u);
    }
    if (s.wait === 'apron') {
      const used = this.apronUsed(co);
      if (used + apronSize(p) > co.apron) { u.status = 'blocked'; u.blocker = { kind: 'apron', text: `the apron is full (${used}/${co.apron} slots) — the aircraft waits in its bay` }; return; }
      this.freeBay(co, u);
      u.status = 'apron';
      u.apronSince = this.now;
      u.aircraft = this.registerAircraft(co, u);
      // the customer's crew arrives on a set day and hour (rolled at creation)
      const t = this.now + Math.round((6 + u.rolls.departure * 18) * 60);
      u.departAt = t;
      return this.advance(co, u);
    }
    if (s.wait === 'departure') {
      u.status = 'apron';
      if (this.now < u.departAt) { u.blocker = { kind: 'departure', text: `the customer's crew collects it ${this.when(u.departAt)}` }; return; }
      return this.depart(co, u);
    }
    if (s.wait === 'pad') {
      if (!co.pad) { u.status = 'blocked'; u.blocker = { kind: 'pad', text: 'no launch pad' }; return; }
      if (!u.rollout) {
        if (co.pad.unit || co.pad.readyAt > this.now) { u.status = 'blocked'; u.blocker = { kind: 'pad', text: co.pad.unit ? 'the pad is busy' : `the pad is being refurbished until ${this.when(co.pad.readyAt)}` }; return; }
        // out of the integration building on the crawler (v0.58.0): it takes the pad now and the road to it a half hour
        this.freeBay(co, u);
        co.pad.unit = u.id;
        this.assignPayloads(co, u);
        const L = this.cfg.flight.launch;
        u.rollout = { t0: this.now, t1: this.now + L.rolloutMin };
        co.pad.roll = { ...u.rollout, unit: u.id, look: this.pOf(u).look };
        u.status = 'pad';
        if (co.kind === 'player') this.news(`🚀 ${this.pOf(u).name} leaves ${co.id === 'meridian' ? 'the integration building' : 'the gate'} on the crawler, bound for the pad.`, 'info');
      }
      u.status = 'pad';
      if (this.now < u.rollout.t1) { u.blocker = { kind: 'pad', text: `on the crawler, ${Math.max(1, Math.round(u.rollout.t1 - this.now))} min from the pad` }; return; }
      co.pad.roll = null;
      return this.advance(co, u);
    }
    if (s.wait === 'rocket') {
      if (!u.rocket) {
        const pad = co.pad?.unit && this.state.units[co.pad.unit];
        if (pad && pad.purpose === 'launcher' && !pad.launch) this.assignPayloads(co, pad);
      }
      const r = u.rocket && this.state.units[u.rocket];
      if (!r || r.finished) { u.status = 'blocked'; u.blocker = { kind: 'rocket', text: 'waiting for a launch vehicle on the pad' }; u.rocket = null; return; }
      if (this.stageOf(r)?.id === 'to_pad' || stagesOf(C, this.pOf(r)).findIndex((x) => x.id === 'vertical') > r.stage) { u.blocker = { kind: 'rocket', text: `waiting for ${this.pOf(r).name} to stand on the pad` }; return; }
      this.freeBay(co, u);
      u.status = 'pad';
      return this.advance(co, u);
    }
    if (s.wait === 'launched') {
      const r = this.state.units[u.rocket];
      if (!r?.launch) { u.status = 'pad'; u.blocker = { kind: 'launch', text: 'on the pad, waiting for launch' }; return; }
      if (!r.launch.success) return this.lostInLaunch(co, u);
      u.status = 'orbit';
      return this.advance(co, u);
    }
    if (s.wait === 'deploy') {
      if (this.now < u.launch.at + 120) return;
      return this.advance(co, u);
    }
  }

  /** Take a free bay for a unit about to start bay work (its own bay type first). */
  takeBay(co, u) {
    const C = this.cfg;
    const p = this.pOf(u);
    const types = baysFor(C, p);
    const bay = co.bays.find((b) => b.type === p.bay && !b.unit && b.ready <= this.now) || co.bays.find((b) => types.includes(b.type) && !b.unit && b.ready <= this.now && !this.waitingFor(co, b.type));
    if (!bay) { u.status = 'queued'; u.blocker = { kind: 'bay', text: `materials in hand; waiting for a free ${C.bays[p.bay].name.toLowerCase()}` }; return false; }
    bay.unit = u.id;
    u.bay = bay.id;
    return true;
  }

  /** Is any unit waiting for a bay of exactly this type (so a borrowed bay goes to its own kind first)? */
  waitingFor(co, type) {
    return this.unitsOf(co).some((x) => x.blocker?.kind === 'bay' && this.pOf(x).bay === type);
  }

  eventStep(co, u, s) {
    if (s.event === 'launch') {
      // a launcher waits for its satellites: at least one aboard, and all of them integrated
      if (u.purpose === 'launcher') {
        u.payload = (u.payload || []).filter((id) => this.state.units[id] && !this.state.units[id].finished);
        const payload = u.payload.map((id) => this.state.units[id]);
        const ready = payload.length && payload.every((x) => this.stageOf(x)?.wait === 'launched');
        if (!ready) { u.status = 'pad'; u.blocker = { kind: 'payload', text: payload.length ? 'holding for its satellites to be integrated' : 'holding for a payload' }; return; }
      }
      return this.countdown(co, u);
    }
    if (s.event === 'settle') return this.settle(co, u);
    if (s.event === 'activate') {
      this.activate(co, u);
      return this.advance(co, u);
    }
  }

  apronUsed(co) {
    return this.unitsOf(co).filter((u) => u.status === 'apron').reduce((a, u) => a + apronSize(this.pOf(u)), 0);
  }

  inspect(co, u, s) {
    const C = this.cfg;
    const p = this.pOf(u);
    const k = u.inspections.length;
    const pf = failChance(C, p, this.qualityOf(co), { engineCell: co.facilities.engine_cell });
    const roll = u.rolls.inspect[k % u.rolls.inspect.length];
    const pass = k >= 3 || roll >= pf; // after three fails it's rebuilt properly
    u.inspections.push({ at: this.now, pass, stage: s.id, chance: Math.round(pf * 100) });
    (co.qaLog ||= []).unshift({ at: this.now, what: `${p.name} #${u.n}`, pass, chance: Math.round(pf * 100) });
    if (co.qaLog.length > 30) co.qaLog.length = 30;
    if (pass) return this.advance(co, u);
    co.stats.failedInspections += 1;
    const recent = co.qaLog.filter((e) => !e.pass && e.at >= this.now - this.cfg.events.rep.failWindowDays * DAY).length;
    this.repChange(co, this.A.reputation.failedInspection * this.streakMult(recent), `Failed inspection: ${p.name} #${u.n}${recent > 1 ? ` (${recent} in ${this.cfg.events.rep.failWindowDays} days)` : ''}`);
    const extra = Math.round(p.days * this.A.reworkShare * 1000) / 1000;
    u.need += extra;
    u.rework += extra;
    // rework's cost: the bay-days again (already in wages), and materials scrapped
    const scrap = Math.round(bomValue(C, p) * 0.04);
    this.pay(co, scrap, 'rework');
    this.report(co, 'quality', `🔧 ${p.name} #${u.n} failed ${s.name.toLowerCase()} — ${fmtDays(extra)} of rework (${fmtMoney(scrap)} scrapped).`, co.kind === 'player' ? 'warn' : null);
  }

  /** The finished aircraft becomes a persistent aircraft entity (src/content: spec; the future flight controller reads this). */
  registerAircraft(co, u) {
    const s = this.state;
    s.aircraft ||= {};
    const id = this.nextId('AC');
    const p = this.pOf(u);
    s.aircraft[id] = {
      id, model: u.product, unit: u.id, contract: u.contract, manufacturer: co.id, owner: co.id, // ownership passes to the customer on handover
      registration: `${co.id === 'meridian' ? 'MA' : 'RA'}-${String(Object.keys(s.aircraft).length).padStart(3, '0')}`,
      state: 'awaiting_delivery', location: { map: this.A.map, site: `${co.id}_apron` },
      condition: 100, fuel: p.spec?.fuel ?? 0, hours: 0.6, built: this.now,
      config: { ...(u.config || {}) }, spec: p.spec ? { ...p.spec } : null, // (as configured: more seats, a longer range — what the flight update reads)
      livery: this.liveryOf(co, u.product),
      flight: { flyable: false }, // the flyable-aircraft update fills this in (v0.58.0 adds `movements` and `lastMovement`)
      move: null, // a movement under way: { kind, t0, rwy } (src/aero/field.js)
    };
    assignStand(this, co, s.aircraft[id], p);
    return id;
  }

  depart(co, u) {
    const ac = this.state.aircraft?.[u.aircraft];
    // the customer's crew takes it over (ownership and payment now); it leaves when the field is clear (src/aero/field.js)
    if (ac) { ac.owner = this.contract(u.contract)?.customer || ac.owner; scheduleDeparture(this, ac); }
    return this.settle(co, u);
  }

  /** The livery a finished aircraft wears: its own firm's for the Skylark, grey for the military, plain otherwise. */
  liveryOf(co, productId) {
    const pr = this.cfg.products[productId];
    if (pr.cls === 'fighter' || pr.cls === 'bomber') return pr.look.kind.includes('stealth') || pr.look.kind === 'flyingwing' ? 'stealth' : 'military';
    return co.id === 'roost' && productId === 'ap_skylark' ? 'roost' : null;
  }

  /** Everything moving or standing on Starling Field right now (src/aero/field.js), in tiles. */
  movers() {
    return movers(this);
  }

  /**
   * The launch complex right now, for the renderer (src/engine/drawLaunch.js): for each pad a
   * crawler on its way, or a launch sequence (and the smoke it leaves behind a while).
   */
  launches() {
    const out = [];
    const s = this.state;
    const now = this.now;
    const L = this.cfg.flight.launch;
    const map = this.game.content.maps[this.A.map];
    const wind = windRunway(this.day) === '09' ? 1 : -1;
    for (const co of this.companies()) {
      if (!co.pad) continue;
      const prop = map.props.find((p) => p.type === 'launch_pad' && (p.aero?.company || p.company) === co.id);
      if (!prop) continue;
      const base = padBase(prop);
      const roll = co.pad.roll;
      if (roll && now < roll.t1) {
        const way = map.launch?.[co.id]?.rollout;
        if (way) {
          const key = `${co.id}|${way.length}`;
          const paths = (this._rolls ||= {});
          const path = (paths[key] ||= rolloutPath(way, base));
          out.push({ kind: 'rollout', company: co.id, look: roll.look, base, ...rolloutAt(path, roll, now) });
        }
      }
      const seq = co.pad.seq;
      if (seq && now < seq.end + L.trailLife + 1) out.push({ kind: 'sequence', company: co.id, look: seq.look, base, seq, ph: phaseAt(L, seq, now), wind, now });
    }
    void s;
    return out;
  }

  /** Clear a finished aircraft to leave: it starts when the field is free (returns the time). */
  clearForDeparture(ac) {
    return scheduleDeparture(this, ac);
  }

  /** The field's sound where the player stands (tiles): { jet, jetPitch, rocket }, each 0..1. */
  sound(px, py) {
    return soundAt(this, px, py);
  }

  /** Is one of Meridian's own aircraft (the company jet, the test aircraft) at home on its stand? Its prop shows only then. */
  ambientHome(id) {
    return ambientHome(this, id);
  }

  /** What the pad is doing for the terminal: a crawler on its way, a countdown, a climb — or null. */
  launchStatus(co) {
    if (!co?.pad) return null;
    const L = this.cfg.flight.launch;
    const now = this.now;
    const roll = co.pad.roll;
    if (roll && now < roll.t1) return { kind: 'rollout', clock: `${Math.max(1, Math.round(roll.t1 - now))} min`, text: 'On the crawler, rolling out to the pad.', left: roll.t1 - now };
    const seq = co.pad.seq;
    if (!seq || now >= seq.end + 0.5) return null;
    const ph = phaseAt(L, seq, now);
    const text = { countdown: 'Counting down.', ignition: 'Engines lit.', ascent: ph.sep ? 'Second stage burning.' : 'Climbing.', lost: 'A vehicle lost.', done: 'Away.' }[ph.phase];
    return { kind: ph.phase, clock: ph.phase === 'lost' ? 'ABORT' : clockText(ph.t), text, seq, ph };
  }

  /**
   * The field as the terminal shows it: the runway in use and every aircraft of this company's
   * that is waiting to leave, leaving or just gone (with what it is doing now).
   */
  fieldStatus(co) {
    const f = this.state.field;
    const now = this.now;
    const out = [];
    for (const id of f?.active || []) {
      const ac = this.state.aircraft[id];
      if (!ac || ac.manufacturer !== co.id || ac.ambient) continue;
      const P = this.cfg.products[ac.model];
      const cust = this.cfg.customers[ac.owner]?.name || null;
      if (ac.move && now >= ac.move.t0) {
        const p = poseAt(planOf(this, ac), now - ac.move.t0);
        out.push({ id, name: P.name, owner: cust, state: ac.state, label: p.label, rwy: ac.move.rwy, left: Math.max(0, ac.move.t0 + planLength(planOf(this, ac)) - now) });
      } else if (ac.move) out.push({ id, name: P.name, owner: cust, state: ac.state, label: `cleared to leave ${this.when(ac.move.t0)}`, rwy: ac.move.rwy, left: null });
      else out.push({ id, name: P.name, owner: cust, state: ac.state, label: 'waiting for its crew', rwy: null, left: null });
    }
    return { rwy: windRunway(this.day), list: out };
  }

  /** Secure convoys on the road, for the renderer. */
  convoys() {
    return convoys(this);
  }

  /** The field's geometry (runway, taxiway, aprons) for the renderer. */
  get field() {
    return { geo: geoOf(this) };
  }

  /** Put the satellites waiting for a launch aboard this rocket (up to its lift). */
  assignPayloads(co, r) {
    const C = this.cfg;
    const rp = this.pOf(r);
    if (r.purpose !== 'launcher') return;
    let room = rp.lift;
    r.payload ||= [];
    for (const id of r.payload) room -= C.products[this.state.units[id].product].mass;
    for (const s of this.unitsOf(co).filter((x) => x.line === 'satellite' && !x.rocket && this.stageOf(x)?.wait === 'rocket').sort((a, b) => this.priority(a) - this.priority(b))) {
      const m = C.products[s.product].mass;
      if (m > room) continue;
      s.rocket = r.id;
      r.payload.push(s.id);
      room -= m;
    }
  }

  launch(co, u) {
    const C = this.cfg;
    const p = this.pOf(u);
    const pf = u.seq ? u.seq.chance / 100 : launchFailChance(p, this.qualityOf(co));
    const success = u.seq ? u.seq.success : u.rolls.launch >= pf;
    u.launch = { at: u.seq ? u.seq.lift : this.now, success, chance: Math.round(pf * 100) };
    co.stats.launches += 1;
    co.pad.launches += 1;
    co.pad.unit = null;
    co.pad.readyAt = this.now + 2 * DAY;
    const cost = Math.round((p.launchCost || 0) * (1 + co.research.reduce((a, id) => a + (C.research[id]?.effect?.launchCost || 0), 0)));
    this.pay(co, cost, 'launch');
    const what = u.purpose === 'launcher' ? `${(u.payload || []).length} satellite${(u.payload || []).length === 1 ? '' : 's'}` : `${C.customers[this.contract(u.contract)?.customer]?.name || 'a customer'}'s payload`;
    if (success) {
      this.news(`🚀 ${co.name} launches a ${p.name} from Starling Flats with ${what}.`, co.kind === 'player' ? 'good' : 'info');
      milestone(this, co, 'first_launch', p.name);
      this.advance(co, u);
    } else {
      co.stats.launchFailures += 1;
      this.repChange(co, this.cfg.events.rep.launchFailure, `Launch failure: ${p.name}`);
      this.news(`💥 A ${co.name} ${p.name} is lost shortly after lift-off from Starling Flats, with ${what}.`, 'warn');
      this.failUnit(co, u, 'launch failure');
    }
  }

  /**
   * The launch step (v0.58.0): the countdown, then the ascent, then the outcome. The sequence is
   * fixed when the countdown starts (src/aero/launch.js), shown on the pad, and booked when it ends.
   */
  countdown(co, u) {
    const L = this.cfg.flight.launch;
    const p = this.pOf(u);
    if (!u.seq) {
      const pf = launchFailChance(p, this.qualityOf(co));
      u.seq = startSequence(L, u, this.now, u.rolls.launch >= pf, Math.round(pf * 100));
      co.pad.seq = { ...u.seq, unit: u.id, look: p.look, name: p.name, company: co.id };
      const msg = `🚀 ${co.name} is counting down a ${p.name} at Starling Flats — lift-off in ${L.countdownMin} minutes.`;
      this.news(msg, co.kind === 'player' ? 'good' : 'info');
      this.report(co, 'launch', co.kind === 'player' ? `${msg} The pad is south-east of the Park, behind the fence; the ground station's gate is the best seat.` : msg, co.kind === 'player' ? 'good' : null);
    }
    u.status = 'pad';
    if (this.now < u.seq.end) {
      u.blocker = { kind: 'launch', text: this.now < u.seq.lift ? `counting down: lift-off ${this.when(u.seq.lift)}` : 'in flight' };
      return;
    }
    u.blocker = null;
    return this.launch(co, u);
  }

  lostInLaunch(co, u) {
    this.failUnit(co, u, 'lost in a launch failure');
  }

  /** A unit is lost: the customer isn't charged for it (its share of the deposit is refunded). */
  failUnit(co, u, why) {
    const c = this.contract(u.contract);
    this.retire(u, 'failed');
    u.failure = why;
    if (!c) return;
    const share = Math.round(c.depositPaid / c.qty);
    if (!c.settled[u.id]) {
      c.settled[u.id] = 'failed';
      this.pay(co, share, null);
      co.books.deferred -= share;
      c.failed += 1;
      c.history.push({ at: this.now, text: `Unit ${u.n}: ${why} — deposit share refunded.` });
      this.closeIfDone(c);
    }
  }

  commission(co, u) {
    const C = this.cfg;
    const p = this.pOf(u);
    const pf = commissionFailChance(p, this.qualityOf(co));
    const ok = u.rolls.commission >= pf;
    const partial = !ok && u.rolls.partial < 0.6;
    u.commissioning = { at: this.now, ok, partial, chance: Math.round(pf * 100) };
    if (!ok && !partial) return this.failUnit(co, u, 'failed commissioning');
    this.advance(co, u);
  }

  /** The satellite joins the registry: owned by its customer, built and operated by the company. */
  activate(co, u) {
    const s = this.state;
    const p = this.pOf(u);
    const c = this.contract(u.contract);
    const id = this.nextId('SAT');
    s.satellites[id] = {
      id, name: `${p.name.split(' ')[0]}-${String(Object.keys(s.satellites).length + 1).padStart(2, '0')}`, product: u.product, role: p.role,
      owner: c?.customer || co.id, manufacturer: co.id, contract: u.contract, unit: u.id, rocket: u.rocket,
      launched: this.state.units[u.rocket]?.launch?.at ?? this.now, commissioned: this.now, status: u.commissioning?.partial ? 'degraded' : 'operational',
      capability: u.commissioning?.partial ? 0.5 : 1, lifeDays: p.life, endsAt: this.now + p.life * DAY,
    };
    u.satellite = id;
    milestone(this, co, 'first_satellite', p.name);
  }

  /** Delivery is complete: the customer pays the rest of the price, once. */
  settle(co, u) {
    const C = this.cfg;
    const c = this.contract(u.contract);
    const p = this.pOf(u);
    if (!c) {
      // an internal launcher: its cost was the price of putting satellites up
      this.retire(u, 'delivered');
      u.status = 'delivered';
      post(co.books, this.day, 'launch', Math.round(u.cost.materials + u.cost.freight + (u.cost.freightInt || 0)), this.A.historyDays);
      return;
    }
    if (c.settled[u.id]) { this.retire(u, 'delivered'); return; }
    const partial = u.commissioning?.partial;
    const lateDays = Math.max(0, Math.ceil((this.now - c.due) / DAY));
    const penaltyShare = Math.min(this.A.lateCap, lateDays * this.A.latePerDay);
    const price = Math.round(c.unitPrice * (partial ? 0.5 : 1));
    const penalty = Math.round(price * penaltyShare);
    const share = Math.round(c.depositPaid / c.qty);
    c.settled[u.id] = 'delivered';
    // cash: the price, less the deposit share already received, less any penalty
    this.receive(co, price - share - penalty, null);
    co.books.deferred -= share;
    post(co.books, this.day, revenueAccount(p.line), price, this.A.historyDays);
    if (penalty) post(co.books, this.day, 'penalties', penalty, this.A.historyDays);
    post(co.books, this.day, 'cogs_materials', Math.round(u.cost.materials), this.A.historyDays);
    post(co.books, this.day, 'cogs_freight', Math.round(u.cost.freight), this.A.historyDays);
    post(co.books, this.day, 'cogs_freight_internal', Math.round(u.cost.freightInt || 0), this.A.historyDays);
    c.delivered += 1;
    c.revenue += price - penalty;
    c.penalties += penalty;
    co.stats.delivered += 1;
    const who = C.customers[c.customer].name;
    const R = this.cfg.events.rep;
    co.streaks ||= { late: 0, onTime: 0 };
    if (lateDays) {
      co.stats.late += 1;
      co.streaks.late += 1; co.streaks.onTime = 0;
      this.repChange(co, this.A.reputation.late * this.streakMult(co.streaks.late), `Late delivery: ${p.name} #${u.n} for ${who} (${lateDays} day${lateDays === 1 ? '' : 's'}${co.streaks.late > 1 ? `, ${co.streaks.late} late in a row` : ''})`);
    } else {
      co.stats.onTime += 1;
      co.streaks.late = 0; co.streaks.onTime += 1;
      this.repChange(co, this.A.reputation.onTime, `On-time delivery: ${p.name} #${u.n} for ${who}`);
      if (co.streaks.onTime >= R.streakAt) this.repChange(co, R.streakBonus, `${co.streaks.onTime} deliveries on time in a row`);
      if (!u.rework && !u.inspections.some((i) => !i.pass)) this.repChange(co, R.flawless, `Flawless build: ${p.name} #${u.n} passed first time`);
    }
    milestone(this, co, 'first_delivery', `${p.name} for ${who}`);
    if (p.line === 'aircraft') milestone(this, co, 'first_aircraft', `${p.name} for ${who}`);
    if (C.customers[c.customer].kind === 'defence') milestone(this, co, 'first_defence', who);
    c.history.push({ at: this.now, text: `Unit ${u.n} delivered${lateDays ? ` ${lateDays} day${lateDays === 1 ? '' : 's'} late (−${fmtMoney(penalty)})` : ''}${partial ? ' with reduced capability (half price)' : ''}.` });
    this.retire(u, 'delivered');
    u.status = 'delivered';
    const verb = p.line === 'aircraft' ? 'took off for its new owner' : p.line === 'missile' ? 'was handed over at the agency\'s depot' : p.line === 'satellite' ? 'is operational in orbit' : 'completed its mission';
    this.report(co, 'delivery', `✅ ${p.name} #${u.n} for ${C.customers[c.customer].name} ${verb}: ${fmtMoney(price - penalty)}.`, co.kind === 'player' ? 'good' : null);
    this.closeIfDone(c);
  }

  closeIfDone(c) {
    if (c.status !== 'active') return;
    if (c.delivered + c.failed < c.qty) return;
    c.status = c.failed && !c.delivered ? 'failed' : 'complete';
    c.history.push({ at: this.now, text: c.status === 'complete' ? 'Contract complete.' : 'Contract failed.' });
    if (c.status === 'complete') eventContractDone(this, this.company(c.company), c);
  }

  /**
   * Plan launches: every satellite without a ride is packed onto a launcher the
   * company builds at cost (heaviest first, into the cheapest vehicle per unit
   * of lift that it can build). The launcher keeps its payload list and holds
   * on the pad until every satellite aboard is integrated.
   */
  planLaunchers(co) {
    const C = this.cfg;
    if (!co.pad) return;
    const waiting = this.unitsOf(co).filter((u) => u.line === 'satellite' && !u.rocket).sort((a, b) => C.products[b.product].mass - C.products[a.product].mass || this.priority(a) - this.priority(b));
    if (!waiting.length) return;
    const rockets = Object.entries(C.products).filter(([, r]) => r.line === 'rocket' && !r.crew && !missingTech(C, co, r).length);
    if (!rockets.length) return;
    while (waiting.length) {
      const heaviest = C.products[waiting[0].product].mass;
      const mass = waiting.reduce((a, u) => a + this.pOf(u).mass, 0);
      // the vehicle that carries the most of what's waiting for the least per unit of lift
      const fits = rockets.filter(([, r]) => r.lift >= heaviest);
      if (!fits.length) break;
      const cost = (r) => unitCost(C, r).total;
      fits.sort((a, b) => cost(a[1]) / Math.min(a[1].lift, mass) - cost(b[1]) / Math.min(b[1].lift, mass));
      const [rid, rp] = fits[0];
      const u = newUnit(C, { id: this.nextId('U'), company: co.id, contract: null, productId: rid, n: 1, purpose: 'launcher', rng: this.rng, at: this.now });
      u.payload = [];
      let room = rp.lift;
      for (let i = 0; i < waiting.length;) {
        const m = C.products[waiting[i].product].mass;
        if (m <= room) { room -= m; waiting[i].rocket = u.id; u.payload.push(waiting[i].id); waiting.splice(i, 1); } else i++;
      }
      this.state.units[u.id] = u;
    }
    this.syncRng();
  }

  stagesLeftBeforePad(u) {
    return !u.finished && !u.launch;
  }

  // ------------------------------------------------------------- the day
  minuteTick() {
    const g = this.game;
    const s = this.state;
    this.tickOrders();
    if (this.roost && Math.floor(this.now) % this.cfg.internal.dispatchEvery === 0) { this.dispatch(); this.closeJobs(); }
    this.tickProduction(1);
    tickField(this);
    if (g.clock.day > s.lastDay && g.clock.minuteOfDay >= this.A.decisionHour * 60) {
      s.lastDay = g.clock.day;
      this.daily();
    }
    this.syncRng();
  }

  daily() {
    const C = this.cfg;
    const s = this.state;
    // customers' budgets come back; suppliers restock
    for (const [id, cu] of Object.entries(C.customers)) {
      const st = s.customers[id];
      st.budget = Math.min(cu.budget, st.budget + Math.round(cu.budget * C.budgetDaily));
    }
    for (const [id, sp] of Object.entries(C.suppliers)) {
      const st = s.suppliers[id];
      for (const m of Object.keys(sp.sells)) st.stock[m] = Math.min(sp.stock, (st.stock[m] || 0) + sp.restock);
    }
    // each company's day: wages, upkeep, overhead, interest; research and bays finish
    for (const co of this.companies()) this.companyDay(co);
    this.closeTenders();
    this.postTenders();
    if (this.roost) eventsMorning(this, this.roost); // v0.57.0: what the books and the floor say today
    const M = this.meridian;
    this.planLaunchers(M);
    rivalMorning(this, M);
    if (this.roost) {
      this.planLaunchers(this.roost);
      if (this.roost.autoProcure) this.autoProcure(this.roost);
    }
    this.satelliteDay();
    this.marketDay();
    this.prune();
  }

  /** Keep the save small: finished units and received orders leave the live tables after a while (their contracts keep the record). */
  prune() {
    const s = this.state;
    const old = this.now - 6 * DAY;
    for (const [id, u] of Object.entries(s.units)) if (u.finished && u.finished < old) delete s.units[id];
    for (const [id, po] of Object.entries(s.pos)) if ((po.status === 'received' && po.received < old) || (po.status === 'lost' && po.placed < old - 10 * DAY)) delete s.pos[id];
    for (const [id, j] of Object.entries(s.jobs || {})) if (['delivered', 'carrier', 'lost'].includes(j.status) && (j.log.at(-1)?.at ?? 0) < this.now - 20 * DAY) delete s.jobs[id];
    for (const [id, c] of Object.entries(s.contracts)) if (c.status !== 'active' && (c.history.at(-1)?.at ?? 0) < this.now - 30 * DAY) delete s.contracts[id];
  }

  companyDay(co) {
    const C = this.cfg;
    const W = C.staff.roles;
    this.pay(co, co.workforce * W.tech.wage + co.engineers * W.engineer.wage + co.inspectors * W.inspector.wage, 'wages');
    const T = C.staff.training[co.training] || C.staff.training.none;
    if (T.perDay) this.pay(co, co.workforce * T.perDay, 'training');
    co.experience = Math.min(C.staff.experience.cap, co.experience + T.gain * (1 - co.experience / 130));
    let upkeep = co.bays.reduce((a, b) => a + (b.ready <= this.now ? C.bays[b.type].upkeep : 0), 0);
    if (co.pad) upkeep += C.facilities.pad.upkeep;
    for (const [f, on] of Object.entries(co.facilities)) if (on) upkeep += C.facilities[f]?.upkeep || 0;
    if (co.halls) for (const hid of Object.keys(co.halls)) if (this.hallState(co, hid).state === 'built') upkeep += C.halls[hid]?.upkeep || 0;
    this.pay(co, upkeep, 'upkeep');
    this.pay(co, co.overhead, 'overhead');
    if (co.kind === 'rival' && co.cash < 0) this.pay(co, -co.cash * this.A.meridian.interest, 'interest');
    if (co.researching && this.now >= co.researching.doneAt) {
      const R = C.research[co.researching.id];
      co.research.push(co.researching.id);
      this.report(co, 'research', `🔬 ${co.name} completes research: ${R.name}.`, co.kind === 'player' ? 'good' : null);
      if (co.researching.breakthrough) applyBreakthrough(this, co, R);
      co.researching = null;
    }
    for (const b of co.bays) if (b.ready && b.ready <= this.now && !b.announced) { b.announced = true; this.report(co, 'facility', `🏗 ${C.bays[b.type].name} ${b.id.split('_').pop()} is open.`, co.kind === 'player' ? 'good' : null); }
    if (co.halls) for (const [id, at] of Object.entries(co.halls)) if (at && at <= this.now && !co.hallsOpened?.[id]) { (co.hallsOpened ||= {})[id] = true; this.report(co, 'facility', `🏗 ${C.halls[id].name} is open.`, 'good'); }
    for (const [id, at] of Object.entries(co.building || {})) {
      if (at > this.now) continue;
      delete co.building[id];
      if (id === 'pad') co.pad = { unit: null, readyAt: 0, launches: 0 };
      else co.facilities[id] = true;
      this.report(co, 'facility', `🏗 ${C.facilities[id].name} is ready.`, co.kind === 'player' ? 'good' : null);
    }
  }

  /** Satellites age; at the end of their life they're decommissioned (and stop earning). */
  satelliteDay() {
    for (const sat of Object.values(this.state.satellites)) {
      if (['decommissioned', 'failed'].includes(sat.status)) continue;
      if (this.now >= sat.endsAt) { sat.status = 'decommissioned'; sat.decommissioned = this.now; }
    }
  }

  // ------------------------------------------------------------- MRDN on the exchange
  /** Meridian's equity: cash (less drawn credit), inventory, plant, less what it owes in work (deposits). */
  equity(co = this.meridian) {
    return co.cash + co.books.inventoryValue + co.books.capex * 0.6 + this.plantValue(co) - co.books.deferred;
  }

  plantValue(co) {
    const C = this.cfg;
    return co.bays.reduce((a, b) => a + C.bays[b.type].build, 0) * 0.6 + (co.pad ? C.facilities.pad.build * 0.6 : 0);
  }

  /** Expected margin on the work Meridian has in hand. */
  backlogValue(co = this.meridian) {
    let v = 0;
    for (const c of this.contractsOf(co, 'active')) v += (c.qty - c.delivered - c.failed) * c.unitPrice * 0.25;
    return v;
  }

  fair() {
    const X = { ...this.A.exchange, shares: this.A.meridian.shares };
    const co = this.meridian;
    const ema = this.state.market.ema ?? this.expectedDailyProfit();
    return fairValue(X, { equity: this.equity(co), ema, backlog: this.backlogValue(co) });
  }

  /** Before Meridian has a history, the market expects what its order book implies. */
  expectedDailyProfit() {
    const co = this.meridian;
    const days = Math.max(20, ...this.contractsOf(co, 'active').map((c) => (c.due - this.now) / DAY));
    // the margin in hand spread over the time it takes, less the fixed costs that don't scale
    const fixed = co.overhead + co.bays.reduce((a, b) => a + this.cfg.bays[b.type].upkeep, 0) * 0.5;
    return this.backlogValue(co) / days - fixed;
  }

  marketDay() {
    const s = this.state;
    const m = s.market;
    const co = this.meridian;
    const X = this.A.exchange;
    const today = co.books.days.find((d) => d.day === this.day - 1) || co.books.days[0];
    const yesterday = today ? summarise({ ...co.books, days: [today] }, 1).profit : 0;
    // earnings are lumpy (a delivery is a big day): the market takes the last month's average, blended with what the order book implies
    // normalised: before research (an investment, not a running cost), averaged over up to a month, and
    // leaning on what the order book implies until there's a month of history
    const rows = co.books.days.filter((d) => d.day < this.day).slice(0, 30);
    const trailing = rows.length ? rows.reduce((a, d) => a + summarise({ days: [d] }, 1).profit + (d.acc.research || 0), 0) / rows.length : 0;
    const w = Math.min(0.5, rows.length / 60); // half history, half order book, once there's a month of it
    m.ema = w * trailing + (1 - w) * this.expectedDailyProfit();
    m.weekProfit += yesterday;
    const fair = this.fair();
    const old = m.price;
    m.price = nextPrice({ ...X, shares: this.A.meridian.shares }, m.price, fair, this.rng.next());
    m.history.push({ day: this.day, price: m.price, fair: Math.round(fair * 100) / 100, profit: Math.round(yesterday), cash: Math.round(co.cash), backlog: Math.round(this.backlogValue(co)) });
    if (m.history.length > this.A.historyDays) m.history.shift();
    // Moondays: a dividend out of last week's positive earnings
    if (this.game.clock.weekday === 'Moonday' && m.lastDividendDay !== this.day) {
      m.lastDividendDay = this.day;
      const pay = Math.max(0, m.weekProfit) * X.payout;
      m.weekProfit = 0;
      if (pay > 0 && co.cash > pay) {
        co.cash -= pay;
        const dps = pay / this.A.meridian.shares;
        m.lastDps = dps;
        const mine = Math.floor(dps * m.sharesOwned);
        if (mine > 0) {
          const g = this.game;
          g.player.money += mine;
          m.dividendsPaid += mine;
          g.bus.emit('money:changed', { delta: mine, total: g.player.money });
          g.tablet.post('stocks', `Meridian Aerospace paid a dividend: ${mine} obols on your ${m.sharesOwned.toLocaleString()} MRDN.`, 'good');
        }
      }
    }
    if (m.sharesOwned > 0 && Math.abs(m.price - old) / old > 0.04) this.game.tablet.post('stocks', `MRDN ${m.price > old ? 'rose' : 'fell'} to ${m.price.toFixed(2)} (${m.price > old ? '+' : '−'}${Math.abs((m.price - old) / old * 100).toFixed(1)}%).`, m.price > old ? 'good' : 'warn');
  }

  maxShares() {
    return Math.floor(this.A.meridian.shares * this.A.exchange.maxPlayerShare);
  }

  shareQuote(n) {
    const gross = Math.round(this.state.market.price * n);
    return { gross, fee: Math.ceil(gross * this.A.exchange.fee) };
  }

  holdingsValue() {
    const m = this.game.world.aero?.market;
    return m ? Math.round(m.sharesOwned * m.price) : 0;
  }

  buyShares(n) {
    const g = this.game;
    const m = this.state.market;
    n = Math.floor(n);
    if (n <= 0) return { ok: false, text: 'Buy how many?' };
    const room = this.maxShares() - m.sharesOwned;
    if (n > room) return { ok: false, text: room > 0 ? `One investor may hold at most ${this.maxShares().toLocaleString()} MRDN: you can buy ${room.toLocaleString()} more.` : 'You hold as much MRDN as one investor may.' };
    const q = this.shareQuote(n);
    if (g.player.money < q.gross + q.fee) return { ok: false, text: 'You cannot afford that many shares (with the broker\'s fee).' };
    g.player.money -= q.gross + q.fee;
    m.sharesOwned += n;
    m.costBasis += q.gross + q.fee;
    g.bus.emit('money:changed', { delta: -(q.gross + q.fee), total: g.player.money });
    return { ok: true, text: `Bought ${n.toLocaleString()} MRDN for ${q.gross.toLocaleString()} obols (+${q.fee} fee).` };
  }

  sellShares(n) {
    const g = this.game;
    const m = this.state.market;
    n = Math.floor(n);
    if (n <= 0 || m.sharesOwned < n) return { ok: false, text: 'You do not own that many shares.' };
    const q = this.shareQuote(n);
    const value = Math.max(0, q.gross - q.fee);
    m.costBasis = Math.round(m.costBasis * (1 - n / m.sharesOwned));
    m.sharesOwned -= n;
    g.player.money += value;
    g.bus.emit('money:changed', { delta: value, total: g.player.money });
    return { ok: true, text: `Sold ${n.toLocaleString()} MRDN for ${value.toLocaleString()} obols (after a ${q.fee} fee).` };
  }

  // ------------------------------------------------------------- reports, news, time
  news(text, kind = 'info') {
    const s = this.state;
    s.news.unshift({ at: this.now, day: this.day, text, kind });
    if (s.news.length > NEWS_MAX) s.news.length = NEWS_MAX;
  }

  report(co, kind, text, notify = 'info') {
    const s = this.state;
    s.reports.unshift({ at: this.now, company: co.id, kind, text });
    if (s.reports.length > REPORTS_MAX) s.reports.length = REPORTS_MAX;
    if (notify && co.kind === 'player') this.game.tablet.post('aero', text, notify);
  }

  when(t) {
    const d = Math.floor(t / DAY) + 1;
    const m = Math.floor(t % DAY);
    return `Day ${d}, ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  /**
   * The group: Roost Aeroworks and Ober & Sons Maritime together, with what one division charges
   * the other eliminated (the aerospace division's internal freight and the shipping line's
   * internal revenue). The voyages' real running costs are in the shipping line's expenses, once.
   */
  groupStatement(n = 7) {
    const co = this.roost;
    const aero = co ? summarise(co.books, n, { consolidated: true }) : { revenue: 0, costs: 0, profit: 0 };
    const L = this.game.world.logistics;
    let lr = 0;
    let le = 0;
    let li = 0;
    if (L?.owned) {
      // capital spending (buying the line, ships) is not an operating cost
      if (n === null) { lr = L.ledger.revenue; le = L.ledger.expenses - (L.ledger.capex || 0); li = L.ledger.internal || 0; }
      else for (const d of L.ledger.days.slice(0, n)) { lr += d.revenue; le += d.expenses - (d.capex || 0); li += d.internal || 0; }
    }
    const shipping = { revenue: lr - li, internal: li, costs: le, profit: lr - li - le };
    return { aero, shipping, profit: aero.profit + shipping.profit };
  }

  /** The company's statement over the last n days (null: all time). */
  statement(co, n = 7) {
    return summarise(co.books, n);
  }

  // ------------------------------------------------------------- the world
  interact(prop) {
    const act = prop.interact;
    if (act.action === 'terminal') {
      if (act.company === 'roost' && !this.owned) return { type: 'message', text: 'The Roost Aeroworks terminal: a login screen and a sticky note — "Ask Billie. Billie is probably in the hangar." A second note: "FOR SALE. Serious enquiries only. — B.R."' };
      return { type: 'panel', panel: 'aerospace', opts: { company: act.company } };
    }
    if (act.action === 'board') return { type: 'panel', panel: 'aerospace', opts: { tab: 'Meridian', readonly: true } };
    if (act.action === 'sale') return { type: 'panel', panel: 'aerospace_sale', opts: {} };
    return { type: 'message', text: prop.examine || '' };
  }

  afterLoad() {
    const s = this.game.world.aero;
    if (!s) return;
    this._rng = null;
    s.seq ||= {};
    s.satellites ||= {};
    s.aircraft ||= {};
    s.jobs ||= {};
    for (const co of Object.values(s.companies)) { co.shipping ||= 'internal'; co.internalPolicy ||= 'fallback'; co.freight ||= { external: 0, internalCharges: 0, equivalent: 0, voyageCosts: 0 }; }
    for (const co of Object.values(s.companies)) {
      co.experience ??= this.cfg.staff.experience.start[co.id] ?? 50;
      co.training ||= 'none';
      co.qaLog ||= [];
      co.engineers ??= this.staffNeeded(co, 'engineer');
      co.inspectors ??= this.staffNeeded(co, 'inspector');
      co.repLog ||= []; co.streaks ||= { late: 0, onTime: 0 }; co.events ||= []; co.offers ||= []; co.cool ||= {}; co.milestones ||= {};
    }
    this.migrateHalls();
    migrateField(this);
  }

  /**
   * A save from before v0.57.0 has Roost bays with no slots: each goes into the first free slot that
   * suits it, and the hall it needs is opened for it (nothing is charged again, nothing is taken away).
   * A bay with no slot to be had keeps working, unseen on the map.
   */
  migrateHalls() {
    const co = this.state.companies?.roost;
    if (!co) return;
    co.halls ||= { hangar1: 0 };
    for (const b of co.bays) {
      if (b.slot) continue;
      let slot = this.freeSlot(co, b.type);
      if (!slot) {
        const next = this.hallFor(co, b.type);
        if (next) { co.halls[next[0]] = Math.min(this.now, b.ready || this.now); co.hallsOpened = { ...(co.hallsOpened || {}), [next[0]]: true }; slot = this.freeSlot(co, b.type); }
      }
      if (slot) b.slot = slot.id;
    }
  }

  // ------------------------------------------------------------- what the world shows
  /**
   * How a prop that shows the simulation looks right now (src/engine/drawAero.js): an
   * aircraft on display, an assembly bay and what's in it, the launch pad and its rocket.
   * Memoised per game minute. key changes only when the picture does.
   */
  propView(p) {
    const now = Math.floor(this.now);
    const memo = (this._views ||= new Map()).get(p.id);
    if (memo && memo.at === now) return memo.v;
    const v = this.computeView(p);
    this._views.set(p.id, { at: now, v });
    return v;
  }

  computeView(p) {
    const C = this.cfg;
    if (p.type === 'aircraft') {
      const look = C.products[p.model]?.look;
      return { key: `${p.model}|${p.livery || ''}|${p.wreck ? 1 : 0}|${p.heading || 0}`, look, livery: p.livery, wreck: p.wreck, heading: p.heading || 0 };
    }
    const co = this.company(p.aero?.company || p.company);
    if (p.type === 'hall_site') {
      const st = this.hallState(this.roost, p.aero.hall);
      const f = st.state === 'building' ? Math.max(0.05, Math.round(st.f * 5) / 5) : st.state === 'built' ? 1 : 0;
      return { key: `${st.state}|${f}`, state: st.state, f };
    }
    if (p.type === 'aero_facility') {
      const id = p.aero.facility;
      if (this.roost?.facilities?.[id]) return { key: 'built', state: 'built' };
      const at = this.roost?.building?.[id];
      if (at) { const F = this.cfg.facilities[id]; const f = Math.max(0.1, Math.round((1 - (at - this.now) / (F.buildDays * DAY)) * 4) / 4); return { key: `construction|${f}`, state: 'construction', f }; }
      return { key: 'site', state: 'site' };
    }
    if (p.type === 'launch_pad') {
      if (!co?.pad) return { key: co?.building?.pad ? 'construction' : 'site', site: true };
      const u = co?.pad?.unit && this.state.units[co.pad.unit];
      if (!u) return { key: 'empty' };
      if (u.rollout && this.now < u.rollout.t1) return { key: 'rollout' }; // still on the crawler: the deck is bare
      if (u.seq && this.now >= u.seq.lift) return { key: `away|${u.id}`, away: true }; // lifted off
      const rp = this.pOf(u);
      const st = this.stageOf(u);
      const stages = st?.id === 'vertical' ? Math.min(1, 0.2 + 0.8 * (u.work / Math.max(0.001, u.need))) : 1;
      const venting = ['prep', 'countdown'].includes(st?.id);
      return { key: `${u.id}|${Math.round(stages * 6)}|${venting ? 1 : 0}`, rocket: rp.look, stages, venting };
    }
    if (p.type === 'bay_slot') {
      if (!co) {
        // Roost before it's sold: Billie's last Skylark sits half-built in the bay
        if (p.aero?.company === 'roost') return { key: 'billie', kind: 'aircraft', look: C.products.ap_skylark.look, livery: 'roost', build: { fuselage: 1, wings: 0.5, engines: false, painted: false }, stageIndex: 4, stagesTotal: 13 };
        return { key: 'none' };
      }
      let u = null;
      if (p.aero.pad) u = this.unitsOf(co).find((x) => x.line === 'rocket' && this.stageOf(x)?.wait === 'pad' && !x.rollout);
      else {
        const bay = co.bays.find((b) => (p.aero.slot ? b.slot === p.aero.slot : b.id === p.aero.bay));
        if (!bay) return { key: p.aero.slot ? 'vacant' : 'closed', closed: true, vacant: Boolean(p.aero.slot) };
        if (bay.ready > this.now) return { key: 'building', closed: true };
        u = bay.unit && this.state.units[bay.unit];
      }
      if (!u) return { key: 'empty' };
      if (p.aero.pad) return { stageIndex: u.stage, stagesTotal: stagesOf(C, this.pOf(u)).length, done: false, key: `${u.id}|stack`, kind: 'stack', look: this.pOf(u).look };
      return this.unitLook(u, co);
    }
    return null;
  }

  /** How a unit looks right now, stage by stage (the bays in the world and the terminal draw from this). */
  unitLook(u, co = this.company(u.company)) {
    const C = this.cfg;
    const pr = this.pOf(u);
    const st = stagesOf(C, pr);
    const k = u.stage;
    const id = st[k]?.id;
    const at = (sid) => { const i = st.findIndex((x) => x.id === sid); return i < 0 ? 0 : k > i ? 1 : k === i ? Math.min(1, u.work / Math.max(0.001, u.need)) : 0; };
    const base = { stageIndex: k, stagesTotal: st.length, done: ['acceptance', 'inspection', 'certification', 'testing', 'calibration'].includes(id) };
    if (pr.line === 'aircraft') {
      const build = { fuselage: Math.max(0.15, at('fuselage')), wings: at('wings'), engines: at('engines') > 0.5, painted: at('paint') > 0.6 };
      const livery = pr.cls === 'fighter' || pr.cls === 'bomber' ? (pr.look.kind.includes('stealth') || pr.look.kind === 'flyingwing' ? 'stealth' : 'military') : co.id === 'roost' && u.product === 'ap_skylark' ? 'roost' : null;
      return { ...base, key: `${u.id}|${Math.round(build.fuselage * 8)}${Math.round(build.wings * 8)}${build.engines ? 1 : 0}${build.painted ? 1 : 0}|${k}`, kind: 'aircraft', look: pr.look, livery, build };
    }
    if (pr.line === 'rocket' || pr.line === 'missile') {
      const stages = pr.line === 'rocket' ? Math.max(0.2, at('stages') * 0.7 + at('propulsion') * 0.3) : Math.max(0.2, at('airframe'));
      return { ...base, key: `${u.id}|${Math.round(stages * 6)}|${k}`, kind: pr.line, look: pr.look, stages };
    }
    const panels = at('power') >= 1 && !['testing', 'calibration'].includes(id) ? true : at('power') > 0.5;
    return { ...base, key: `${u.id}|${panels ? 1 : 0}|${at('payload') > 0.5 ? 1 : 0}|${k}`, kind: 'satellite', look: { mass: pr.mass, role: pr.role }, panels, bare: at('structure') < 1 };
  }

  /** Map markers: the Park's two works. */
  markers() {
    return [];
  }
}
