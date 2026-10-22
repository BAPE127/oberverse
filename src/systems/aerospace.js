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
import { makeTender, bidError, rankBids, launchAllowance } from '../aero/tenders.js';
import { fairValue, nextPrice } from '../aero/valuation.js';
import { rivalMorning } from '../aero/rival.js';

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
      companies: {}, tenders: [], contracts: {}, units: {}, pos: {}, satellites: {},
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
      const p = C.products[u.product];
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
      const need = remainingMaterials(C, C.products[u.product], u.stage + (u.consumed ? 1 : 0));
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
    return {
      id, name, kind,
      cash: kind === 'rival' ? def.cash : 0,
      workforce: def.workforce,
      bays: def.bays.map((b) => ({ id: b, type: b.replace(/_\d+$/, ''), unit: null, ready: 0 })),
      pad: def.pad ? { unit: null, readyAt: 0, launches: 0 } : null,
      facilities: {},
      research: [...def.research], researching: null,
      reputation: def.reputation, qualityBase: def.quality,
      inv: {}, books: freshBooks(),
      stats: { delivered: 0, onTime: 0, late: 0, failedInspections: 0, launches: 0, launchFailures: 0, contractsWon: 0, tendersBid: 0, cancelled: 0 },
      apron: C.facilities.apron.slots[id] || 3,
      autoProcure: true,
      overhead: kind === 'rival' ? def.overhead : 600,
    };
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
    let q = co.qualityBase;
    for (const id of co.research) q += this.cfg.research[id]?.effect?.quality || 0;
    if (co.facilities.inspection) q += 8;
    return Math.min(100, q);
  }

  speedOf(co) {
    return 1 + Math.min(0.3, co.research.length * 0.01);
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

  hire(co, n) {
    n = Math.max(0, Math.floor(n));
    if (!n) return { ok: false, text: 'Hire how many?' };
    const cost = n * this.A.hireCost;
    if (!this.canAfford(co, cost)) return { ok: false, text: `Hiring ${n} costs ${cost.toLocaleString()} obols.` };
    this.pay(co, cost, 'hiring');
    co.workforce += n;
    return { ok: true, text: `Hired ${n} worker${n === 1 ? '' : 's'} (${cost.toLocaleString()} obols for recruiting and training).` };
  }

  layoff(co, n) {
    n = Math.max(0, Math.min(co.workforce, Math.floor(n)));
    if (!n) return { ok: false, text: 'Lay off how many?' };
    this.pay(co, n * this.A.layoffCost, 'hiring');
    co.workforce -= n;
    return { ok: true, text: `Laid off ${n} worker${n === 1 ? '' : 's'}.` };
  }

  /** Utilisation of the bays a product would use (queued work per bay, 1 = a full queue). */
  utilisation(co, p) {
    const types = baysFor(this.cfg, p);
    const bays = co.bays.filter((b) => types.includes(b.type)).length || 1;
    const units = Object.values(this.state.units).filter((u) => u.company === co.id && !u.finished && types.includes(baysFor(this.cfg, this.cfg.products[u.product])[0]));
    const days = units.reduce((a, u) => a + workLeft(this.cfg, this.cfg.products[u.product], u), 0);
    return days / (bays * 14);
  }

  /** Days until a new job for `qty` of a product would be delivered (queue + work + materials lead). */
  deliveryEstimate(co, p, qty) {
    const types = baysFor(this.cfg, p);
    const bays = co.bays.filter((b) => types.includes(b.type));
    if (!bays.length) return Infinity;
    const units = Object.values(this.state.units).filter((u) => u.company === co.id && !u.finished && u.bay === null && u.stage <= lastBayStage(this.cfg, this.cfg.products[u.product]) && types.includes(baysFor(this.cfg, this.cfg.products[u.product])[0]));
    // each bay is free after its current unit's bay work; queued units take bays in turn
    const free = bays.map((b) => {
      const u = b.unit && this.state.units[b.unit];
      const ready = Math.max(0, (b.ready - this.now) / DAY);
      return ready + (u ? this.bayWorkLeft(u) : 0);
    }).sort((a, b) => a - b);
    for (const u of units) { free[0] += this.cfg.products[u.product].days; free.sort((a, b) => a - b); }
    const speed = this.speedOf(co) * Math.max(0.5, Math.min(1, co.workforce / Math.max(1, this.crewNeeded(co, { all: true }))));
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
    const p = this.cfg.products[u.product];
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
        `${F.workforce} skilled workers (Wrenna Torq, the chief mechanic, stays on)`,
        `A ${C.facilities.apron.slots.roost}-slot apron by the runway`,
        `Billie's order book: ${F.backlog.map((b) => `${b.qty} × ${C.products[b.product].name} for ${C.customers[b.customer].name}`).join('; ')} — deposits already received by Billie are hers; you're paid the rest on delivery`,
        'The aerospace terminal (and the Aerospace app on your tablet): the tender board, production, suppliers and the books',
      ],
      costs: `Running costs about ${(F.workforce * this.A.wage + C.bays.light.upkeep + 600).toLocaleString()} obols a day (wages, the bay, the office).`,
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
    co.researching = { id, doneAt: this.now + Math.round(R.days * DAY) };
    this.report(co, 'research', `🔬 ${co.name} begins research: ${R.name} (${R.days} days).`, co.kind === 'player' ? 'info' : null);
    return { ok: true, text: `Research started: ${R.name}. Done in ${R.days} days.` };
  }

  buildBay(co, type) {
    const B = this.cfg.bays[type];
    if (!B) return { ok: false, text: 'No such bay.' };
    if (!this.canAfford(co, B.build)) return { ok: false, text: `A ${B.name.toLowerCase()} costs ${B.build.toLocaleString()} obols.` };
    this.pay(co, B.build, null);
    co.books.capex += B.build;
    const n = co.bays.filter((b) => b.type === type).length + 1;
    co.bays.push({ id: `${type}_${n}`, type, unit: null, ready: this.now + Math.round(B.buildDays * DAY) });
    this.report(co, 'facility', `🏗 ${co.name} is building ${B.name.toLowerCase()} No. ${n} (ready in ${B.buildDays} days).`, co.kind === 'player' ? 'info' : null);
    if (co.kind === 'rival') this.news(`Meridian breaks ground on a new ${B.name.toLowerCase()} at Starling Flats.`);
    return { ok: true, text: `${B.name} No. ${n} is under construction: ready in ${B.buildDays} days.` };
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
    const p = this.cfg.products[u.product];
    return workLeft(this.cfg, p, u) / Math.max(0.3, this.speedOf(co) * this.staffing(co));
  }

  /** Materials still to be bought or consumed for a unit, at their reference value. */
  unitCostLeft(u) {
    const C = this.cfg;
    const p = C.products[u.product];
    const need = remainingMaterials(C, p, u.stage + (u.consumed ? 1 : 0));
    return Object.entries(need).reduce((a, [m, n]) => a + n * C.materials[m].price, 0);
  }

  /** How many lots of a material all open units still need from here on. */
  demand(co, m) {
    let n = 0;
    for (const u of this.unitsOf(co)) n += remainingMaterials(this.cfg, this.cfg.products[u.product], u.stage + (u.consumed ? 1 : 0))[m] || 0;
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
      const p = C.products[t.product];
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
    const p = C.products[t.product];
    const est = unitCost(C, p, { materialMult: this.materialMultiplier(co), freightShare: 0.08, speed: this.speedOf(co), failChance: failChance(C, p, this.qualityOf(co), { engineCell: co.facilities.engine_cell }) });
    const launch = p.line === 'satellite' ? this.launchShare(p) : 0;
    const delivery = this.deliveryEstimate(co, p, t.qty);
    const price = unitPrice ?? Math.min(t.ceiling, Math.round(((est.total + launch) * 1.25) / 100) * 100);
    const d = days ?? (Number.isFinite(delivery) ? Math.min(t.days, delivery) : t.days);
    const err = bidError(C, t, { unitPrice: price, days: d }, { quality: this.qualityOf(co), reputation: co.reputation, cleared: this.cleared(co), canBuild: this.canBuild(co, p) });
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
    const p = C.products[t.product];
    const err = bidError(C, t, { unitPrice, days }, { quality: this.qualityOf(co), reputation: co.reputation, cleared: this.cleared(co), canBuild: this.canBuild(co, p) });
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
      t.ranking = ranked.map((b) => ({ company: b.company, unitPrice: b.unitPrice, days: b.days, score: b.score }));
      if (!ranked.length) {
        t.status = 'lapsed';
        continue;
      }
      const win = ranked[0];
      const co = this.company(win.company);
      t.status = 'awarded';
      t.winner = co.id;
      const c = this.makeContract(co, { customer: t.customer, product: t.product, qty: t.qty, unitPrice: win.unitPrice, days: win.days, quality: t.quality, depositShare: t.deposit, tender: t.id });
      t.contract = c.id;
      st.budget -= c.total;
      st.spent += c.total;
      co.stats.contractsWon += 1;
      // the deposit arrives now: cash in, owed as work until delivery
      this.receive(co, c.depositPaid, null);
      co.books.deferred += c.depositPaid;
      const p = C.products[t.product];
      const text = `${cu.name} awards ${co.name} ${t.qty} × ${p.name} (${fmtMoney(c.total)}).`;
      this.news(text, co.kind === 'player' ? 'good' : 'info');
      this.report(co, 'contract', `🏆 ${text} Deposit ${fmtMoney(c.depositPaid)}; due in ${win.days} days.`, co.kind === 'player' ? 'good' : null);
      for (const b of ranked.slice(1)) {
        const loser = this.company(b.company);
        if (loser?.kind === 'player') this.report(loser, 'tender', `✖ ${cu.name} chose ${co.name} for ${t.qty} × ${p.name} (their ${fmtMoney(win.unitPrice)} a unit in ${win.days} days against your ${fmtMoney(b.unitPrice)} in ${b.days}).`, 'warn');
      }
    }
  }

  /** A contract and its units. Quantities are checked here — the authoritative place (≤ 5 aircraft). */
  makeContract(co, { customer, product, qty, unitPrice, days, quality, depositShare, tender }) {
    const C = this.cfg;
    const p = C.products[product];
    const err = quantityError(this.A, p, qty);
    if (err) throw new Error(`aerospace: ${err}`);
    const id = this.nextId('C');
    const total = unitPrice * qty;
    const c = {
      id, company: co.id, customer, product, qty, unitPrice, total, quality,
      deposit: depositShare, depositPaid: Math.round(total * depositShare),
      signed: this.now, due: this.now + Math.round(days * DAY), tender,
      status: 'active', units: [], delivered: 0, failed: 0, revenue: 0, penalties: 0, settled: {}, history: [{ at: this.now, text: 'Signed.' }],
    };
    this.state.contracts[id] = c;
    for (let n = 0; n < qty; n++) {
      const u = newUnit(C, { id: this.nextId('U'), company: co.id, contract: id, productId: product, n: n + 1, rng: this.rng, at: this.now });
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
    co.reputation = Math.max(0, co.reputation + this.A.reputation.cancelled);
    this.news(`${co.name} cancels its contract for ${this.cfg.customers[c.customer].name}.`, 'warn');
    return { ok: true, text: `Contract cancelled: ${fmtMoney(owedDeposit)} deposit returned and a ${fmtMoney(penalty)} penalty paid.` };
  }

  /** A unit leaves production without being delivered: its bay, pad and reserved materials go back. */
  retire(u, why) {
    const co = this.company(u.company);
    if (u.bay) this.freeBay(co, u);
    if (co.pad?.unit === u.id) co.pad.unit = null;
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
  order(co, supplierId, m, qty, forUnits = {}) {
    const C = this.cfg;
    const sp = C.suppliers[supplierId];
    const ss = this.state.suppliers[supplierId];
    if (!sp || !sp.sells[m]) return { ok: false, text: 'That supplier doesn\'t sell that.' };
    qty = Math.floor(qty);
    if (qty <= 0) return { ok: false, text: 'Order how many?' };
    if ((ss.stock[m] || 0) < qty) return { ok: false, text: `${sp.name} has only ${ss.stock[m] || 0} lots of ${C.materials[m].name.toLowerCase()} in stock.` };
    if (C.materials[m].secure && !this.cleared(co)) return { ok: false, text: `${C.materials[m].name} are controlled: you need security clearance.` };
    const q = this.freightQuote(co, supplierId, m, qty);
    const total = q.goods + q.freight + q.duty + q.handling;
    if (!this.canAfford(co, total)) return { ok: false, text: `The order costs ${total.toLocaleString()} obols with freight.` };
    ss.stock[m] -= qty;
    this.pay(co, total, null);
    co.books.inventoryValue += total;
    // a late shipment is decided now, by the supplier's reliability (kept with the order)
    const rng = this.rng;
    const late = rng.next() > sp.reliability ? Math.round((6 + rng.next() * 30) * 60) : 0;
    const id = this.nextId('PO');
    const po = { id, company: co.id, supplier: supplierId, material: m, qty, unitPrice: q.unitPrice, goods: q.goods + q.duty, freight: q.freight + q.handling, mode: q.mode, km: q.km, placed: this.now, ready: this.now + Math.round(sp.lead * DAY), arrive: q.arrive + late, late, status: 'preparing', for: { ...forUnits } };
    this.state.pos[id] = po;
    if (sp.oil) this.oilSale(total);
    this.syncRng();
    return { ok: true, po, text: `Ordered ${qty} × ${C.materials[m].name} from ${sp.name}: ${total.toLocaleString()} obols, due ${this.when(po.arrive - late)}.` };
  }

  /** Ober's Oil sells to the Park: the refinery books the barrels (it shows up in its output and dividends). */
  oilSale(value) {
    const o = this.game.oil.state;
    o.aeroSales = (o.aeroSales || 0) + value;
  }

  ordersOf(co, open = true) {
    return Object.values(this.state.pos).filter((p) => p.company === co.id && (!open || p.status !== 'received'));
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
      const p = C.products[u.product];
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
      const per = (q.goods + q.freight + q.duty + q.handling) / n;
      const score = per * (1 + (q.hours / 24) * 0.01); // a little weight on speed
      if (!best || score < best.score) best = { id, n, per, score, q };
    }
    return best;
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
      r.qty -= n;
      r.reserved -= n;
      r.value -= per * n;
      r.freight -= perF * n;
      u.reserved[m] -= n;
      if (!u.reserved[m]) delete u.reserved[m];
      u.cost.materials += per * n;
      u.cost.freight += perF * n;
      co.books.inventoryValue -= (per + perF) * n;
    }
  }

  /** Purchase orders move along: prepared → shipped → at the docks → trucked up → received (and reserved for their units). */
  tickOrders() {
    for (const po of Object.values(this.state.pos)) {
      if (po.status === 'received') continue;
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
    return stagesOf(this.cfg, this.cfg.products[u.product])[u.stage];
  }

  /** Move a unit to its next stage (consuming that stage's materials when it can). */
  advance(co, u) {
    const C = this.cfg;
    const p = C.products[u.product];
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
    const p = C.products[u.product];
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
    const r = s.bay ? rate : s.office ? this.speedOf(co) : 1;
    u.work += (minutes / DAY) * r;
    if (u.work + 1e-9 < u.need) return;
    if (s.kind === 'inspect') return this.inspect(co, u, s);
    if (s.kind === 'commission') return this.commission(co, u);
    this.advance(co, u);
  }

  waitStep(co, u, s) {
    const C = this.cfg;
    const p = C.products[u.product];
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
      if (co.pad.unit || co.pad.readyAt > this.now) { u.status = 'blocked'; u.blocker = { kind: 'pad', text: co.pad.unit ? 'the pad is busy' : `the pad is being refurbished until ${this.when(co.pad.readyAt)}` }; return; }
      this.freeBay(co, u);
      co.pad.unit = u.id;
      u.status = 'pad';
      this.assignPayloads(co, u);
      return this.advance(co, u);
    }
    if (s.wait === 'rocket') {
      if (!u.rocket) {
        const pad = co.pad?.unit && this.state.units[co.pad.unit];
        if (pad && pad.purpose === 'launcher' && !pad.launch) this.assignPayloads(co, pad);
      }
      const r = u.rocket && this.state.units[u.rocket];
      if (!r || r.finished) { u.status = 'blocked'; u.blocker = { kind: 'rocket', text: 'waiting for a launch vehicle on the pad' }; u.rocket = null; return; }
      if (this.stageOf(r)?.id === 'to_pad' || stagesOf(C, C.products[r.product]).findIndex((x) => x.id === 'vertical') > r.stage) { u.blocker = { kind: 'rocket', text: `waiting for ${C.products[r.product].name} to stand on the pad` }; return; }
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
    const p = C.products[u.product];
    const types = baysFor(C, p);
    const bay = co.bays.find((b) => b.type === p.bay && !b.unit && b.ready <= this.now) || co.bays.find((b) => types.includes(b.type) && !b.unit && b.ready <= this.now && !this.waitingFor(co, b.type));
    if (!bay) { u.status = 'queued'; u.blocker = { kind: 'bay', text: `materials in hand; waiting for a free ${C.bays[p.bay].name.toLowerCase()}` }; return false; }
    bay.unit = u.id;
    u.bay = bay.id;
    return true;
  }

  /** Is any unit waiting for a bay of exactly this type (so a borrowed bay goes to its own kind first)? */
  waitingFor(co, type) {
    return this.unitsOf(co).some((x) => x.blocker?.kind === 'bay' && this.cfg.products[x.product].bay === type);
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
      return this.launch(co, u);
    }
    if (s.event === 'settle') return this.settle(co, u);
    if (s.event === 'activate') {
      this.activate(co, u);
      return this.advance(co, u);
    }
  }

  apronUsed(co) {
    return this.unitsOf(co).filter((u) => u.status === 'apron').reduce((a, u) => a + apronSize(this.cfg.products[u.product]), 0);
  }

  inspect(co, u, s) {
    const C = this.cfg;
    const p = C.products[u.product];
    const k = u.inspections.length;
    const pf = failChance(C, p, this.qualityOf(co), { engineCell: co.facilities.engine_cell });
    const roll = u.rolls.inspect[k % u.rolls.inspect.length];
    const pass = k >= 3 || roll >= pf; // after three fails it's rebuilt properly
    u.inspections.push({ at: this.now, pass, stage: s.id, chance: Math.round(pf * 100) });
    if (pass) return this.advance(co, u);
    co.stats.failedInspections += 1;
    co.reputation = Math.max(0, co.reputation + this.A.reputation.failedInspection);
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
    const p = this.cfg.products[u.product];
    s.aircraft[id] = {
      id, model: u.product, unit: u.id, contract: u.contract, manufacturer: co.id, owner: co.id, // ownership passes to the customer on handover
      registration: `${co.id === 'meridian' ? 'MA' : 'RA'}-${String(Object.keys(s.aircraft).length).padStart(3, '0')}`,
      state: 'awaiting_delivery', location: { map: this.A.map, site: `${co.id}_apron` },
      condition: 100, fuel: p.spec?.fuel ?? 0, hours: 0.6, built: this.now, config: {},
      flight: { flyable: false }, // the flyable-aircraft update fills this in
    };
    return id;
  }

  depart(co, u) {
    const ac = this.state.aircraft?.[u.aircraft];
    if (ac) { ac.state = 'departed'; ac.owner = this.contract(u.contract)?.customer || ac.owner; ac.location = { departed: this.now }; }
    return this.settle(co, u);
  }

  /** Put the satellites waiting for a launch aboard this rocket (up to its lift). */
  assignPayloads(co, r) {
    const C = this.cfg;
    const rp = C.products[r.product];
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
    const p = C.products[u.product];
    const pf = launchFailChance(p, this.qualityOf(co));
    const success = u.rolls.launch >= pf;
    u.launch = { at: this.now, success, chance: Math.round(pf * 100) };
    co.stats.launches += 1;
    co.pad.launches += 1;
    co.pad.unit = null;
    co.pad.readyAt = this.now + 2 * DAY;
    const cost = Math.round((p.launchCost || 0) * (1 + co.research.reduce((a, id) => a + (C.research[id]?.effect?.launchCost || 0), 0)));
    this.pay(co, cost, 'launch');
    const what = u.purpose === 'launcher' ? `${(u.payload || []).length} satellite${(u.payload || []).length === 1 ? '' : 's'}` : `${C.customers[this.contract(u.contract)?.customer]?.name || 'a customer'}'s payload`;
    if (success) {
      this.news(`🚀 ${co.name} launches a ${p.name} from Starling Flats with ${what}.`, co.kind === 'player' ? 'good' : 'info');
      this.advance(co, u);
    } else {
      co.stats.launchFailures += 1;
      co.reputation = Math.max(0, co.reputation - 6);
      this.news(`💥 A ${co.name} ${p.name} is lost shortly after lift-off from Starling Flats, with ${what}.`, 'warn');
      this.failUnit(co, u, 'launch failure');
    }
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
    const p = C.products[u.product];
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
    const p = this.cfg.products[u.product];
    const c = this.contract(u.contract);
    const id = this.nextId('SAT');
    s.satellites[id] = {
      id, name: `${p.name.split(' ')[0]}-${String(Object.keys(s.satellites).length + 1).padStart(2, '0')}`, product: u.product, role: p.role,
      owner: c?.customer || co.id, manufacturer: co.id, contract: u.contract, unit: u.id, rocket: u.rocket,
      launched: this.state.units[u.rocket]?.launch?.at ?? this.now, commissioned: this.now, status: u.commissioning?.partial ? 'degraded' : 'operational',
      capability: u.commissioning?.partial ? 0.5 : 1, lifeDays: p.life, endsAt: this.now + p.life * DAY,
    };
    u.satellite = id;
  }

  /** Delivery is complete: the customer pays the rest of the price, once. */
  settle(co, u) {
    const C = this.cfg;
    const c = this.contract(u.contract);
    const p = C.products[u.product];
    if (!c) {
      // an internal launcher: its cost was the price of putting satellites up
      this.retire(u, 'delivered');
      u.status = 'delivered';
      post(co.books, this.day, 'launch', Math.round(u.cost.materials + u.cost.freight), this.A.historyDays);
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
    c.delivered += 1;
    c.revenue += price - penalty;
    c.penalties += penalty;
    co.stats.delivered += 1;
    if (lateDays) { co.stats.late += 1; co.reputation = Math.max(0, co.reputation + this.A.reputation.late); } else { co.stats.onTime += 1; co.reputation = Math.min(100, co.reputation + this.A.reputation.onTime); }
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
      const mass = waiting.reduce((a, u) => a + C.products[u.product].mass, 0);
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
    this.tickProduction(1);
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
    for (const [id, po] of Object.entries(s.pos)) if (po.status === 'received' && po.received < old) delete s.pos[id];
    for (const [id, c] of Object.entries(s.contracts)) if (c.status !== 'active' && (c.history.at(-1)?.at ?? 0) < this.now - 30 * DAY) delete s.contracts[id];
  }

  companyDay(co) {
    const C = this.cfg;
    const wages = co.workforce * this.A.wage;
    this.pay(co, wages, 'wages');
    let upkeep = co.bays.reduce((a, b) => a + (b.ready <= this.now ? C.bays[b.type].upkeep : 0), 0);
    if (co.pad) upkeep += C.facilities.pad.upkeep;
    for (const [f, on] of Object.entries(co.facilities)) if (on) upkeep += C.facilities[f]?.upkeep || 0;
    this.pay(co, upkeep, 'upkeep');
    this.pay(co, co.overhead, 'overhead');
    if (co.kind === 'rival' && co.cash < 0) this.pay(co, -co.cash * this.A.meridian.interest, 'interest');
    if (co.researching && this.now >= co.researching.doneAt) {
      const R = C.research[co.researching.id];
      co.research.push(co.researching.id);
      this.report(co, 'research', `🔬 ${co.name} completes research: ${R.name}.`, co.kind === 'player' ? 'good' : null);
      if (co.kind === 'rival') this.news(`Meridian announces a breakthrough: ${R.name.toLowerCase()}.`);
      co.researching = null;
    }
    for (const b of co.bays) if (b.ready && b.ready <= this.now && !b.announced) { b.announced = true; this.report(co, 'facility', `🏗 ${C.bays[b.type].name} ${b.id.split('_').pop()} is open.`, co.kind === 'player' ? 'good' : null); }
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
    if (p.type === 'launch_pad') {
      if (!co?.pad) return { key: co?.building?.pad ? 'construction' : 'site', site: true };
      const u = co?.pad?.unit && this.state.units[co.pad.unit];
      if (!u) return { key: 'empty' };
      const rp = C.products[u.product];
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
      if (p.aero.pad) u = this.unitsOf(co).find((x) => x.line === 'rocket' && this.stageOf(x)?.wait === 'pad');
      else {
        const bay = co.bays.find((b) => b.id === p.aero.bay);
        if (!bay) return { key: 'closed', closed: true };
        if (bay.ready > this.now) return { key: 'building', closed: true };
        u = bay.unit && this.state.units[bay.unit];
      }
      if (!u) return { key: 'empty' };
      const pr = C.products[u.product];
      const st = stagesOf(C, pr);
      const k = u.stage;
      const id = st[k]?.id;
      const at = (sid) => { const i = st.findIndex((x) => x.id === sid); return i < 0 ? 0 : k > i ? 1 : k === i ? Math.min(1, u.work / Math.max(0.001, u.need)) : 0; };
      const base = { stageIndex: k, stagesTotal: st.length, done: ['acceptance', 'inspection', 'certification', 'testing', 'calibration'].includes(id) };
      if (p.aero.pad) return { ...base, key: `${u.id}|stack`, kind: 'stack', look: pr.look };
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
    return null;
  }

  /** Map markers: the Park's two works. */
  markers() {
    return [];
  }
}
