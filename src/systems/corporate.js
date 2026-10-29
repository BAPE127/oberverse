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

export const COMPANY_IDS = ['arms', 'shipping', 'aerospace', 'farming'];

export class Corporate {
  constructor(game) {
    this.game = game;
  }

  get state() {
    const w = this.game.world;
    if (!w.corp) w.corp = { v: 1, accounts: {} };
    w.corp.accounts ||= {};
    return w.corp;
  }

  /** A company's account (created on first use). */
  account(id) {
    if (!COMPANY_IDS.includes(id)) throw new Error(`Unknown company ${id}`);
    const a = this.state.accounts;
    if (!a[id]) a[id] = freshAccount(id);
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
   */
  pay(id, amount, { cat = 'purchase', quiet = false } = {}) {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (amount === 0) return true;
    const a = this.account(id);
    const g = this.game;
    if (a.funded) {
      if (a.cash < amount) return false;
      a.cash -= amount;
      a.flowOut += amount;
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
    } else {
      g.player.money += amount;
      if (!quiet) g.bus.emit('money:changed', { delta: amount, total: g.player.money });
    }
    post(a, g.clock.day, 'in', cat, amount);
    return true;
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
    return true;
  }

  /** Whether every funded account reconciles with its history (the invariant the tests check). */
  reconciles() {
    return Object.values(this.state.accounts).every(balanceOk);
  }
}
