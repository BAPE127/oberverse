// The war update's service (v0.98.0): game.war. A thin facade over the record (src/war/state.js), the protection gate (protection.js), the damage gate (damage.js) and the
// checker (check.js). Later releases add the company, construction, transfers and battles here; none of them may write what the gates guard.
import { ensureMilitary, peekMilitary } from './state.js';
import { baseProtected, setCoupState, settle } from './protection.js';
import { register as registerStructure, apply as applyDamage, repair as repairStructure, view as structureView } from './damage.js';
import { checkMilitary } from './check.js';
import { commission as commissionFacility, dailyTick as facilityDay, facilityState as facilityStateOf, lotOwned as lotOwnedOf, capacity as baseCapacity, view as facilityView, repair as repairFacility, repairCost as facilityRepairCost, quote as facilityQuote } from './facilities.js';

export class War {
  constructor(game) { this.game = game; }
  get g() { return this.game; }

  /** The record, made on first use. */
  state() { return ensureMilitary(this.g); }
  peek() { return peekMilitary(this.g); }

  baseProtected() { return baseProtected(this.g); }
  setCoup(state, why) { return setCoupState(this.g, state, why); }
  settle(how) { return settle(this.g, how); }

  register(id, o) { return registerStructure(this.g, id, o); }
  hit(id, amount, source) { return applyDamage(this.g, id, amount, source); }
  repair(id, amount, source) { return repairStructure(this.g, id, amount, source); }
  structures() { return structureView(this.g); }

  check() { return checkMilitary(this.peek()); }

  // ---- the company's construction (v0.98.0). `pay` is the company's way of paying; stage 3 makes it the company's own account.
  company() { return this.peek()?.company || null; }
  lotOwned() { return lotOwnedOf(this.g); }
  facilityState(id) { return facilityStateOf(this.g, id); }
  facilities() { return facilityView(this.g); }
  quote(id) { return facilityQuote(this.g, id); }
  commission(id) { return commissionFacility(this.g, id, (amount, note) => this.pay(amount, note)); }
  repairFacility(id) { return repairFacility(this.g, id, (amount, note) => this.pay(amount, note)); }
  repairCost(id) { return facilityRepairCost(this.g, id); }
  capacity() { return baseCapacity(this.g); }
  dailyTick() { facilityDay(this.g); }
  /** Pay for something the company buys. (Stage 3 of this release moves it to the company's own account; until then, your wallet.) */
  pay(amount, note) {
    const g = this.g;
    if (g.player.money < amount) return { ok: false, text: `That costs ${amount.toLocaleString('en-US')} obols.` };
    g.player.money -= amount;
    g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
    return { ok: true };
  }

  summary() {
    const m = this.peek();
    if (!m) return 'No military record yet (nothing has made one). The base is protected.';
    const s = this.structures();
    return `Coup: ${m.coup.state}. Base ${baseProtected(this.g) ? 'PROTECTED' : 'VULNERABLE'} (${m.protection.reason}). ${s.length} structures (${s.filter((x) => x.state !== 'intact').length} hurt). ${this.check().length} problems.`;
  }
}
