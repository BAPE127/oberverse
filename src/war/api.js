// The war update's service (v0.98.0): game.war. A thin facade over the record (src/war/state.js), the protection gate (protection.js), the damage gate (damage.js) and the
// checker (check.js). Later releases add the company, construction, transfers and battles here; none of them may write what the gates guard.
import { ensureMilitary, peekMilitary } from './state.js';
import { baseProtected, setCoupState, settle } from './protection.js';
import * as damage from './damage.js';
import { checkMilitary } from './check.js';

export class War {
  constructor(game) { this.game = game; }
  get g() { return this.game; }

  /** The record, made on first use. */
  state() { return ensureMilitary(this.g); }
  peek() { return peekMilitary(this.g); }

  baseProtected() { return baseProtected(this.g); }
  setCoup(state, why) { return setCoupState(this.g, state, why); }
  settle(how) { return settle(this.g, how); }

  register(id, o) { return damage.register(this.g, id, o); }
  hit(id, amount, source) { return damage.apply(this.g, id, amount, source); }
  repair(id, amount, source) { return damage.repair(this.g, id, amount, source); }
  structures() { return damage.view(this.g); }

  check() { return checkMilitary(this.peek()); }

  summary() {
    const m = this.peek();
    if (!m) return 'No military record yet (nothing has made one). The base is protected.';
    const s = this.structures();
    return `Coup: ${m.coup.state}. Base ${baseProtected(this.g) ? 'PROTECTED' : 'VULNERABLE'} (${m.protection.reason}). ${s.length} structures (${s.filter((x) => x.state !== 'intact').length} hurt). ${this.check().length} problems.`;
  }
}
