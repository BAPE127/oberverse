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
import { existingRows, countryName } from '../corp/registry.js';

export const COMPANY_IDS = ['arms', 'shipping', 'aerospace', 'farming'];

export class Corporate {
  constructor(game) {
    this.game = game;
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
    if (!COMPANY_IDS.includes(id)) throw new Error(`Unknown company ${id}`);
    const a = this.state.accounts;
    if (!a[id]) a[id] = freshAccount(id);
    a[id].arrears ??= 0; // saves from before arrears existed
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
  pay(id, amount, { cat = 'purchase', quiet = false, owe = false } = {}) {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (amount === 0) return true;
    const a = this.account(id);
    const g = this.game;
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
    if (!COMPANY_IDS.includes(id)) return { ok: false, text: 'No such company.' };
    if (!this.established(id)) return { ok: false, text: 'You do not own that business yet.' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, text: 'Enter an amount above zero.' };
    if (g.player.money < amount) return { ok: false, text: `You have ${g.player.money.toLocaleString()} obols.` };
    const a = this.account(id);
    g.player.money -= amount;
    a.funded = true;
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
    if (!COMPANY_IDS.includes(id)) return { ok: false, text: 'No such company.' };
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
    const a = this.account(id);
    if (!a.funded) return { ok: false, text: 'That company holds no money of its own.' };
    if (a.arrears > 0) return { ok: false, text: `It owes ${a.arrears.toLocaleString()} obols — clear that first.` };
    if (a.cash > 0) { const r = this.distribute(id, a.cash, 'Account closed'); if (!r.ok) return r; }
    a.funded = false;
    // the cash story starts again, so a later funding reconciles from nothing
    a.contributed = 0; a.distributed = 0; a.flowIn = 0; a.flowOut = 0;
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
    for (const c of this.state.generated || []) names.push(c.name);
    return names;
  }

  /** Name or rename a business. The old name stays in its history. */
  rename(id, raw) {
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

  /** The registry: the four businesses, the companies that were already in the game, and the generated ones. */
  registry() {
    const rows = [];
    for (const id of COMPANY_IDS) {
      const p = this.profile(id);
      if (p) rows.push({ id: `player_${id}`, name: p.name, sector: p.sector, country: 'home', kind: 'player', source: id, playerId: id });
    }
    rows.push(...existingRows(this.game.content));
    for (const c of this.state.generated || []) rows.push(c);
    return rows;
  }
}
