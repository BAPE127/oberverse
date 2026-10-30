// The company accounts (v0.60.0): the one place the player's four businesses move money.
//
//   game.corp.cashOf(id)              what the company can spend now
//   game.corp.canAfford(id, n)        whether it can pay n
//   game.corp.pay(id, n, { cat })     money out (a purchase, wages, a fee) — true when it was paid
//   game.corp.receive(id, n, { cat }) money in (a sale, a contract payment)
//   game.corp.found(id, n, what)      the OWNER buys a business or an asset for it: wallet → equity in kind
//
// A company is `arms`, `shipping`, `aerospace` or `farming`. Its account is UNFUNDED until the owner
// puts money in: then the business draws on the owner's wallet exactly as it always did (the flows
// are only counted). Once FUNDED it pays from its own cash alone, and a payment it cannot cover is
// refused — nothing silently overdraws it. Personal money (shares, dividends, a day's labouring)
// never passes through here.
//
// State: game.world.corp = { v, accounts: { [id]: account } } — created on first use, so an old
// save loads with every company unfunded and nothing moved (see src/corp/ledger.js).
import { freshAccount, post, logLine, balanceOk } from '../corp/ledger.js';
import { validateName, PLAYER_COMPANIES, SECTORS } from '../corp/identity.js';
import { existingRows, countryName, countryIds } from '../corp/registry.js';
import { CORP } from '../content/corporate.js';
import { buildWorld, rebuildNamer, advance } from '../corp/generate.js';
import { monthTotals } from '../corp/ledger.js';
import { figures, growth, value as worth, rank as rankBy, shares } from '../corp/metrics.js';
import { Group } from './group.js';
import { Personnel } from './personnel.js';
import { Management } from './management.js';
import { Exchange } from './exchange.js';

/** The player's four businesses. (The parent company, when there is one, has an account too — see ACCOUNT_IDS — but is not a business.) */
export const COMPANY_IDS = ['arms', 'shipping', 'aerospace', 'farming'];
export const ACCOUNT_IDS = [...COMPANY_IDS, 'parent'];

export class Corporate {
  constructor(game) {
    this.game = game;
    this.group = new Group(this); // v0.61.0: the parent company and its subsidiaries
    this.personnel = new Personnel(this); // v0.62.0: the people who run them
    this.exchange = new Exchange(this); // v0.66.0: every listed company on one board
    this.management = new Management(this); // v0.63.0: what they decide for themselves (nothing until a budget is set)
  }

  get state() {
    const w = this.game.world;
    if (!w.corp) w.corp = { v: 1, accounts: {} };
    w.corp.accounts ||= {};
    w.corp.companies ||= {}; // v0.60.0 part C: the identity of each business
    return w.corp;
  }

  /** A company's account (created on first use). */
  account(id) {
    if (!ACCOUNT_IDS.includes(id)) throw new Error(`Unknown company ${id}`);
    const a = this.state.accounts;
    if (id === 'parent' && !a.parent) throw new Error('There is no parent company');
    if (!a[id]) a[id] = freshAccount(id);
    a[id].arrears ??= 0; // saves from before arrears existed
    a[id].xferIn ??= 0; a[id].xferOut ??= 0; // before v0.61.0
    return a[id];
  }

  funded(id) {
    return this.account(id).funded;
  }

  /** What the company can spend now: its own cash once funded, otherwise the owner's wallet. */
  cashOf(id) {
    const a = this.account(id);
    return a.funded ? a.cash : this.game.player.money;
  }

  canAfford(id, amount) {
    return this.cashOf(id) >= amount;
  }

  /** The balance changed in the owner's wallet: tell the HUD (a funded company's cash is not the wallet). */
  announce(id, delta) {
    const g = this.game;
    if (delta && !this.account(id).funded) g.bus.emit('money:changed', { delta, total: g.player.money });
  }

  /**
   * Money out. An unfunded company draws on the wallet whatever it holds (callers check first, as
   * they always did); a funded one pays only what it has. Returns whether the money moved.
   * `quiet` leaves the HUD notice to the caller (a batch of wages is one notice).
   * `owe` is for a bill that must be met (upkeep, a contract's costs): a funded company pays what
   * it has and the rest becomes ARREARS — a debt, paid first out of what next comes in — so that
   * nothing is ever received for nothing.
   */
  pay(id, amount, { cat = 'purchase', quiet = false, owe = false, actor = null } = {}) {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (amount === 0) return true;
    const a = this.account(id);
    const g = this.game;
    if (actor) this.noteActor(id, actor, amount);
    if (a.funded) {
      if (a.cash < amount && !owe) return false;
      const now = Math.min(amount, Math.max(0, a.cash));
      a.cash -= now;
      a.flowOut += now;
      if (now < amount) {
        a.arrears += amount - now;
        g.notify?.(`⚠ The ${id} company could not cover ${amount - now} obols and now owes them. Fund it or let its income clear the debt.`, 'warn');
      }
      amount = now;
      if (!amount) return true;
    } else {
      g.player.money -= amount;
      if (!quiet) g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    }
    post(a, g.clock.day, 'out', cat, amount);
    return true;
  }

  /** Who spent what from an account: a record kept for the managers of stage 7 (the owner's own spending has no actor). */
  noteActor(id, actor, amount) {
    if (!actor) return;
    const a = this.account(id);
    a.actors ||= {};
    a.actors[actor] = (a.actors[actor] || 0) + Math.round(amount);
    const keys = Object.keys(a.actors);
    if (keys.length > 60) delete a.actors[keys[0]];
  }

  /** Money in. */
  receive(id, amount, { cat = 'sales', quiet = false } = {}) {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (amount === 0) return true;
    const a = this.account(id);
    const g = this.game;
    if (a.funded) {
      a.cash += amount;
      a.flowIn += amount;
      post(a, g.clock.day, 'in', cat, amount);
      this.settleArrears(id);
      return true;
    }
    g.player.money += amount;
    if (!quiet) g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    post(a, g.clock.day, 'in', cat, amount);
    return true;
  }

  /** What a funded company owes and could not pay is cleared first from its cash. */
  settleArrears(id) {
    const a = this.account(id);
    const n = Math.min(a.arrears, Math.max(0, a.cash));
    if (n <= 0) return 0;
    a.arrears -= n;
    a.cash -= n;
    a.flowOut += n;
    post(a, this.game.clock.day, 'out', 'arrears', n);
    return n;
  }

  // ------------------------------------------------------------- the owner and the company
  /** Whether the owner has the business at all (an account can only be funded once there is one). */
  established(id) {
    const g = this.game;
    switch (id) {
      case 'arms': return Boolean(g.getFlag('arms_licence'));
      case 'shipping': return g.logistics.owned;
      case 'aerospace': return g.aero.owned;
      case 'farming': return g.farm.owned().length > 0;
      case 'parent': return Boolean(this.state.parent);
      default: return false;
    }
  }

  /**
   * The owner puts money into the company: out of the wallet, into its account, logged. The first
   * contribution funds it — from then on it pays from its own cash alone.
   */
  contribute(id, amount, memo = 'Capital contribution') {
    const g = this.game;
    amount = Math.floor(Number(amount));
    if (!ACCOUNT_IDS.includes(id)) return { ok: false, text: 'No such company.' };
    if (!this.established(id)) return { ok: false, text: id === 'parent' ? 'There is no parent company yet.' : 'You do not own that business yet.' };
    if (this.group.isSub(id)) return { ok: false, text: `${this.nameOf(id)} is a subsidiary: pay money into the parent company, then capitalise it from there.` };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, text: 'Enter an amount above zero.' };
    if (g.player.money < amount) return { ok: false, text: `You have ${g.player.money.toLocaleString()} obols.` };
    const a = this.account(id);
    g.player.money -= amount;
    a.funded = true; // (the parent's account is always funded)
    a.cash += amount;
    a.contributed += amount;
    logLine(a, { day: g.clock.day, type: 'contribution', amount, memo });
    g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    this.settleArrears(id);
    return { ok: true, text: `${amount.toLocaleString()} obols paid into the company's account.` };
  }

  /** The owner takes money out of a funded company (never more than it holds, and never while it owes). */
  distribute(id, amount, memo = 'Distribution to the owner') {
    const g = this.game;
    amount = Math.floor(Number(amount));
    if (!ACCOUNT_IDS.includes(id)) return { ok: false, text: 'No such company.' };
    if (this.group.isSub(id)) return { ok: false, text: `${this.nameOf(id)} is a subsidiary: its money goes to the parent company as a distribution, and from the parent to you.` };
    if (id === 'parent' && !this.state.parent) return { ok: false, text: 'There is no parent company.' };
    const a = this.account(id);
    if (!a.funded) return { ok: false, text: 'That company holds no money of its own.' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, text: 'Enter an amount above zero.' };
    if (a.arrears > 0) return { ok: false, text: `It owes ${a.arrears.toLocaleString()} obols — clear that first.` };
    if (a.cash < amount) return { ok: false, text: `The company holds ${a.cash.toLocaleString()} obols.` };
    a.cash -= amount;
    a.distributed += amount;
    g.player.money += amount;
    logLine(a, { day: g.clock.day, type: 'distribution', amount, memo });
    g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    return { ok: true, text: `${amount.toLocaleString()} obols taken out of the company.` };
  }

  /** Close the company's own account: whatever it holds goes to the owner, and it draws on the wallet again. */
  unfund(id) {
    if (id === 'parent') return { ok: false, text: 'The parent company\'s account cannot be closed; take its money out instead.' };
    if (this.group.isSub(id)) return { ok: false, text: `${this.nameOf(id)} is a subsidiary: take it out of the group first.` };
    const a = this.account(id);
    if (!a.funded) return { ok: false, text: 'That company holds no money of its own.' };
    if (a.arrears > 0) return { ok: false, text: `It owes ${a.arrears.toLocaleString()} obols — clear that first.` };
    if (a.cash > 0) { const r = this.distribute(id, a.cash, 'Account closed'); if (!r.ok) return r; }
    a.funded = false;
    // the cash story starts again, so a later funding reconciles from nothing
    a.contributed = 0; a.distributed = 0; a.flowIn = 0; a.flowOut = 0; a.xferIn = 0; a.xferOut = 0;
    logLine(a, { day: this.game.clock.day, type: 'closed', amount: 0, memo: 'Own account closed — the business draws on the owner again' });
    return { ok: true, text: 'The company\'s own account is closed.' };
  }

  /**
   * The owner buys a business, or an asset to found one, out of the wallet: the company has not the
   * cash to pay for itself, so it is equity in kind (an asset brought in at cost), not a company
   * expense. Money out of the wallet exactly once; the caller has checked the wallet.
   */
  found(id, amount, what) {
    const a = this.account(id);
    const g = this.game;
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (this.group.isSub(id)) return false; // a subsidiary is never paid for from the owner's wallet
    g.player.money -= amount;
    if (amount) g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    a.inKind += amount;
    logLine(a, { day: g.clock.day, type: 'in-kind', amount, memo: what || 'Acquisition' });
    this.ensureCompany(id, { fresh: true });
    return true;
  }

  /** Whether every funded account reconciles with its history (the invariant the tests check). */
  reconciles() {
    return Object.values(this.state.accounts).every(balanceOk);
  }

  /** After a new game or a load: a record for each business already owned, and the wider world (once). */
  afterLoad() {
    this.ensureCompanies();
    this.ensureWorld();
  }

  // ------------------------------------------------------------- identity
  /** The name a business carries until its owner renames it (shipping and aerospace keep the names they were bought with). */
  defaultName(id) {
    const g = this.game;
    if (id === 'shipping') return g.logistics.L.company;
    if (id === 'aerospace') return g.aero.A.firm.name;
    return PLAYER_COMPANIES[id].defaultName;
  }

  /**
   * A company's identity record, made when the business first exists. `fresh` (founded just now):
   * the owner is asked to name it. Otherwise (a save from before this existed) it keeps its
   * default name and nobody is asked.
   */
  ensureCompany(id, { fresh = false } = {}) {
    const st = this.state.companies;
    if (st[id]) return st[id];
    if (!this.established(id) && !fresh) return null;
    const g = this.game;
    const P = PLAYER_COMPANIES[id];
    const name = this.defaultName(id);
    const day = fresh ? g.clock.day : (id === 'shipping' ? g.logistics.state.boughtDay : id === 'aerospace' ? g.aero.state.boughtDay : null) ?? g.clock.day;
    st[id] = { id, sector: P.sector, name, named: !fresh, legacy: !fresh, founded: day, status: 'active', names: [{ day, name }] };
    if (fresh) g.bus.emit('corp:founded', { id });
    return st[id];
  }

  /** Make a record for every business the owner already has (a loaded save, or a day's tick). */
  ensureCompanies() {
    for (const id of COMPANY_IDS) if (this.established(id)) this.ensureCompany(id);
  }

  /** A business's name (its default until named). */
  nameOf(id) {
    if (id === 'parent') return this.state.parent?.name || this.group.defaultName();
    return this.state.companies[id]?.name || this.defaultName(id);
  }

  /** The principal facility of a business, read from the game. */
  hqOf(id) {
    const g = this.game;
    switch (id) {
      case 'arms': { const w = g.arms.ownedIds()[0]; return w ? g.arms.def(w).name : 'no works yet'; }
      case 'shipping': return g.logistics.owned ? g.logistics.port(g.logistics.L.homePort)?.name || '—' : '—';
      case 'aerospace': return g.aero.owned ? 'Starling Flats' : '—';
      case 'farming': { const p = g.farm.owned()[0]; return p ? g.farm.plotDef(p).name : '—'; }
      default: return '—';
    }
  }

  /** Every name in use, apart from one company's own — the names a new name must not repeat. */
  takenNames(exceptId = null) {
    const names = existingRows(this.game.content).map((r) => r.name);
    for (const c of Object.values(this.state.companies)) if (c.id !== exceptId) names.push(c.name);
    if (this.state.parent && exceptId !== 'parent') names.push(this.state.parent.name);
    for (const c of this.state.generated || []) names.push(c.name);
    return names;
  }

  /** Name or rename a business. The old name stays in its history. */
  rename(id, raw) {
    if (id === 'parent') return this.group.rename(raw);
    if (!COMPANY_IDS.includes(id)) return { ok: false, text: 'No such company.' };
    const c = this.ensureCompany(id);
    if (!c) return { ok: false, text: 'You do not own that business yet.' };
    const v = validateName(raw, this.takenNames(id));
    if (!v.ok) return { ok: false, text: v.error };
    const g = this.game;
    if (v.name === c.name) { c.named = true; return { ok: true, text: `It stays ${c.name}.`, name: c.name }; }
    c.name = v.name;
    c.named = true;
    c.names.push({ day: g.clock.day, name: v.name });
    if (c.names.length > 12) c.names.splice(1, c.names.length - 12);
    if (id === 'aerospace' && g.aero.roost) g.aero.roost.name = v.name; // the terminal and the tender board read it
    g.bus.emit('corp:renamed', { id, name: v.name });
    return { ok: true, text: `Now trading as ${v.name}.`, name: v.name };
  }

  /** Identity, for the tablet and the registry. */
  profile(id) {
    const c = this.ensureCompany(id);
    if (!c) return null;
    const a = this.account(id);
    return { ...c, kind: PLAYER_COMPANIES[id].kind, icon: PLAYER_COMPANIES[id].icon, sectorName: SECTORS[c.sector].name, hq: this.hqOf(id), funded: a.funded, cash: this.cashOf(id), ownCash: a.cash, arrears: a.arrears, contributed: a.contributed, distributed: a.distributed, inKind: a.inKind, country: 'home', countryName: countryName(this.game.content, 'home') };
  }

  // ------------------------------------------------------------- the wider world
  /**
   * The companies of the other countries: made once, from a seed kept in the save, with a history
   * before the game. A save that has them never makes them again.
   */
  ensureWorld() {
    const st = this.state;
    if (st.generated) return;
    const g = this.game;
    const salt = String(g.rng.state);
    const day = g.clock.day;
    const taken = new Set(this.takenNames().map((n) => n.toLowerCase()));
    for (const id of COMPANY_IDS) taken.add(this.defaultName(id).toLowerCase());
    const { world, N } = buildWorld(CORP, { salt, day, taken, countries: countryIds(g.content), poolExtra: this.poolExtra(day) });
    st.gen = { salt, nextId: world.nextId, lastDay: day - 1, news: [] };
    st.generated = world.companies;
    this.namer = N;
    advance(CORP, this.worldView(), day - CORP.warmupDays, day - 1, (d) => this.worldCtx(d, true), N, countryIds(g.content), []);
  }

  /** The saved companies as the simulation sees them (its id counter lives in the save). */
  worldView() {
    const st = this.state;
    return { salt: st.gen.salt, get nextId() { return st.gen.nextId; }, set nextId(v) { st.gen.nextId = v; }, get lastEntry() { return (st.gen.lastEntry ||= {}); }, companies: st.generated };
  }

  /** What the rest of the world's pools are read from: the real arms market. */
  poolExtra() {
    const g = this.game;
    const m = g.world.market; // read as it stands: the market's own getter would start it (and draw on the dice) earlier than it ever did
    if (!m?.countries) return {};
    const cs = Object.entries(m.countries || {});
    const inc = cs.reduce((a, [id]) => a + (g.content.arms.countries[id]?.income || 0), 0);
    return { armsIncome: inc, wars: (m.wars || []).length };
  }

  /** What the player's own businesses (and the older companies) sold a day over the last month: it comes off the top of each pool. */
  externalSales() {
    const g = this.game;
    const day = g.clock.day;
    const perDay = (id) => {
      if (!this.established(id)) return 0;
      const a = this.account(id);
      const m = monthTotals(a, Math.floor((day - 1) / 30));
      const p = monthTotals(a, Math.floor((day - 1) / 30) - 1);
      const days = Math.min(30, ((day - 1) % 30) + 1) + 30;
      return Math.max(0, (m.revenue + p.revenue) / days);
    };
    const ext = { arms: perDay('arms'), shipping: perDay('shipping'), agriculture: perDay('farming'), aerospace: perDay('aerospace') };
    if (g.aero.owned || g.aero.meridian) {
      const w = g.aero.statement?.(g.aero.meridian, 14);
      if (w) ext.aerospace += Math.max(0, w.revenue / 14);
    }
    return ext;
  }

  worldCtx(day, warm = false) {
    return { rate: CORP.baseRate, external: warm ? {} : this.externalSales(), poolExtra: this.poolExtra(day), cost: {} };
  }

  /** Once a day (a little after 06:00): the world's companies live the days since the last time — at most a month's worth. */
  dailyTick() {
    this.group.dailyTick(); // the group's monthly jobs (not held up by anything else)
    this.personnel.dailyTick(); // the market's week and the months' reviews (only once the market has been opened)
    this.management.dailyTick(); // managers' decisions (only once a budget has been set)
    this.generatedDay();
    this.exchange.dailyTick(); // prices and dividends of the listed (once the wider world exists)
  }

  /** The wider world's day. */
  generatedDay() {
    const st = this.state;
    if (!st.generated) return;
    const g = this.game;
    const day = g.clock.day;
    if (st.gen.lastDay >= day) return;
    const from = Math.max(st.gen.lastDay + 1, day - 30);
    const world = this.worldView();
    this.namer ||= rebuildNamer(CORP, world, this.takenNames());
    const news = [];
    advance(CORP, world, from, day, (d) => this.worldCtx(d), this.namer, countryIds(g.content), news);
    st.gen.lastDay = day;
    if ((day - 1) % 30 === 0) this.recordRanks();
    for (const n of news) st.gen.news.unshift({ day: n.day, text: n.text, kind: n.kind, sector: n.sector });
    if (st.gen.news.length > 40) st.gen.news.length = 40;
  }

  // ------------------------------------------------------------- figures, worth, rankings
  /**
   * One company's months as plain rows { m, revenue, cogs, opex, capex, interest, net } — read from
   * the books it already keeps. `basis` says how: 'books' (accrual books: aerospace), 'cash' (what
   * actually moved through the company's account: arms, shipping, farming), 'model' (a generated
   * company's own books), 'run-rate' (today's numbers for a month: Chuckie's Cheese), or 'none'.
   */
  rowsOf(r) {
    const g = this.game;
    if (r.kind === 'generated') {
      const c = (this.state.generated || []).find((x) => x.id === r.id);
      return { basis: 'model', rows: (c?.months || []).map((m) => ({ m: m[0], revenue: m[1], cogs: m[2], opex: m[3], interest: m[4], net: m[5], capex: m[6] })) };
    }
    if (r.kind === 'player') {
      if (r.playerId === 'aerospace') return { basis: 'books', rows: this.aeroRows(g.aero.roost) };
      const a = this.account(r.playerId);
      const rows = Object.keys(a.months).map(Number).sort((x, y) => x - y).map((m) => {
        const t = monthTotals(a, m);
        return { m, revenue: t.revenue, cogs: null, opex: t.opex, capex: t.capex, interest: 0, net: t.revenue - t.opex };
      });
      return { basis: 'cash', rows };
    }
    if (r.id === 'meridian') return { basis: 'books', rows: this.aeroRows(g.aero.meridian) };
    if (r.id === 'chuckies_cheese') {
      const n = g.dairy.numbers();
      return { basis: 'run-rate', rows: [{ m: Math.floor((g.clock.day - 1) / 30) - 1, revenue: n.revenue * 30, cogs: null, opex: n.costs * 30, capex: 0, interest: 0, net: n.profit * 30 }] };
    }
    return { basis: 'none', rows: [] };
  }

  aeroRows(co) {
    if (!co) return [];
    return this.game.aero.monthlyReport(co, 24).map((x) => ({ m: x.m, revenue: x.revenue, cogs: null, opex: x.costs, capex: x.acc?.cf_out_capital || 0, interest: 0, net: x.profit }));
  }

  /** What a company owns less what it owes, by its own accounts. `null` when its books do not say. */
  netAssetsOf(r) {
    const g = this.game;
    if (r.kind === 'generated') { const c = (this.state.generated || []).find((x) => x.id === r.id); return c ? Math.round(c.cash + c.plantValue - c.debt) : null; }
    if (r.kind === 'player') {
      const a = this.account(r.playerId);
      const own = a.funded ? a.cash - a.arrears - this.group.payableOf(r.playerId) : 0; // an unfunded company holds no cash of its own: the owner's wallet is the owner's; what it owes its parent comes off
      switch (r.playerId) {
        case 'aerospace': return Math.round(g.aero.balanceReport(g.aero.roost).net + own);
        case 'arms': return Math.round(g.arms.ownedIds().reduce((x, w) => x + g.arms.def(w).price * 0.6, 0) + own);
        case 'farming': return Math.round(g.farm.owned().reduce((x, id) => x + g.farm.plotDef(id).price, 0) + own); // land at cost
        case 'shipping': return Math.round(g.logistics.ownedPorts().reduce((x, id) => x + (g.logistics.portType(id)?.price || 0) * 0.6, 0) + g.logistics.vessels().reduce((x, v) => x + (g.logistics.model(v.model)?.price || 0) * 0.6 * (v.condition / 100), 0) + own);
        default: return null;
      }
    }
    if (r.id === 'meridian') { const m = g.aero.meridian; return m ? Math.round(g.aero.balanceReport(m).net + m.cash) : null; }
    return null;
  }

  /** The figures for one company over a period: 'month' (the last whole month), 'current' (the month so far), 'year' (the last twelve whole months). */
  metricsOf(r, period = 'month') {
    const day = this.game.clock.day;
    const cur = Math.floor((day - 1) / 30);
    const { basis, rows } = this.rowsOf(r);
    const span = { month: [cur - 1, cur - 1, cur - 2, cur - 2], current: [cur, cur, cur - 1, cur - 1], year: [cur - 12, cur - 1, cur - 24, cur - 13] }[period];
    const pick = (a, b) => rows.filter((x) => x.m >= a && x.m <= b);
    // a business of the owner's that sold nothing in a period has sold nothing — zero, not "not available"
    const nothing = r.kind === 'player' ? { revenue: 0, cogs: null, opex: 0, capex: 0, interest: 0, net: 0 } : null;
    const now = figures(pick(span[0], span[1])) || (nothing && figures([nothing]) && { ...figures([nothing]), months: 0 });
    const before = figures(pick(span[2], span[3]));
    // a year's profit, from the whole months so far (up to six, a month with no entry counting as nothing) — and trusted only as far as it has been shown: one good month is a sixth of the way there
    const first = rows.length ? Math.min(...rows.map((x) => x.m)) : cur;
    const from = Math.max(cur - 6, first);
    const n = Math.max(0, cur - from);
    const annualProfit = rows.length && n ? (rows.filter((x) => x.m >= from && x.m < cur).reduce((a, x) => a + (x.net ?? 0), 0) / n) * 12 * Math.min(1, n / 6) : null;
    const netAssets = this.netAssetsOf(r);
    const val = netAssets === null ? null : worth(CORP, r.sector, { netAssets, annualProfit });
    let cash = null;
    let debt = null;
    if (r.kind === 'generated') { const c = (this.state.generated || []).find((x) => x.id === r.id); cash = c ? Math.round(c.cash) : null; debt = c ? Math.round(c.debt) : null; }
    else if (r.kind === 'player') { const a = this.account(r.playerId); cash = a.funded ? Math.round(a.cash) : 0; debt = Math.round(a.arrears); }
    else if (r.id === 'meridian') { const m = this.game.aero.meridian; cash = m ? Math.round(Math.max(0, m.cash)) : null; debt = m ? Math.round(Math.max(0, -m.cash)) : null; }
    return {
      key: r.id, name: r.name, sector: r.sector, country: r.country, kind: r.kind, ticker: r.ticker || null, status: r.status || 'active', basis, period,
      revenue: now ? now.revenue : null, operating: now ? now.operating : null, net: now ? now.net : null, margin: now ? now.margin : null, capex: now ? now.capex : null,
      growth: now && before ? growth(now.revenue, before.revenue) : null, months: now ? now.months : 0,
      cash, debt, netAssets, annualProfit, valuation: val,
    };
  }

  /** Every tracked company of a sector, ranked by a figure ('revenue' | 'net' | 'margin' | 'growth' | 'valuation' | 'share'). Companies without the figure are listed after, unranked. */
  sectorTable(sector, { by = 'revenue', period = 'month' } = {}) {
    const rows = this.registry().filter((r) => r.sector === sector && r.status !== 'closed' && r.status !== 'merged');
    const ms = rows.map((r) => this.metricsOf(r, period));
    const sh = shares(ms.map((m) => ({ id: m.key, revenue: m.revenue })));
    for (const m of ms) m.share = sh[m.key];
    const player = new Set(this.registry().filter((r) => r.kind === 'player').map((r) => r.id));
    const ranked = rankBy(ms, (m) => m[by]);
    return ranked.map((m) => ({ ...m, mine: player.has(m.key), of: ms.filter((x) => Number.isFinite(x[by])).length }));
  }

  /** A player company's place in its sector by each figure: { revenue: { rank, of }, … }. */
  placeOf(playerId, period = 'month') {
    const r = this.registry().find((x) => x.playerId === playerId);
    if (!r) return null;
    const out = {};
    for (const by of ['revenue', 'net', 'margin', 'growth', 'valuation', 'share']) {
      const t = this.sectorTable(r.sector, { by, period });
      const me = t.find((x) => x.key === r.id);
      out[by] = { rank: me?.rank ?? null, of: me?.of ?? 0 };
    }
    return out;
  }

  /** Why one company is above or below another: figure by figure. */
  compare(aKey, bKey, period = 'month') {
    const reg = this.registry();
    const a = reg.find((r) => r.id === aKey);
    const b = reg.find((r) => r.id === bKey);
    if (!a || !b) return null;
    const A = this.metricsOf(a, period);
    const B = this.metricsOf(b, period);
    const lines = [];
    for (const [k, label] of [['revenue', 'Revenue'], ['net', 'Net income'], ['margin', 'Net margin'], ['growth', 'Revenue growth'], ['valuation', 'Estimated value'], ['cash', 'Cash'], ['debt', 'Debt']]) {
      lines.push({ key: k, label, a: A[k], b: B[k], lead: A[k] === null || B[k] === null ? null : A[k] === B[k] ? 0 : A[k] > B[k] ? 1 : -1 });
    }
    return { a: A, b: B, lines };
  }

  /** On each month's first morning, note where each of the player's companies stood for the month just ended. */
  recordRanks() {
    const st = this.state;
    const cur = Math.floor((this.game.clock.day - 1) / 30);
    st.rankHistory ||= {};
    for (const id of COMPANY_IDS) {
      if (!this.established(id)) continue;
      const h = (st.rankHistory[id] ||= []);
      if (h.at(-1)?.m === cur - 1 || cur < 1) continue;
      const p = this.placeOf(id, 'month');
      h.push({ m: cur - 1, rank: p?.revenue.rank ?? null, of: p?.revenue.of ?? 0 });
      while (h.length > 24) h.shift();
    }
  }

  /** The registry: the four businesses, the companies that were already in the game, and the generated ones. */
  registry() {
    const rows = [];
    for (const id of COMPANY_IDS) {
      const p = this.profile(id);
      if (p) rows.push({ id: `player_${id}`, name: p.name, sector: p.sector, country: 'home', kind: 'player', source: id, playerId: id });
    }
    rows.push(...existingRows(this.game.content));
    for (const c of this.state.generated || []) rows.push({ id: c.id, name: c.name, sector: c.sector, country: c.country, kind: 'generated', ticker: c.ticker, status: c.status, source: 'generated' });
    return rows;
  }
}
