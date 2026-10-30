// Corporate milestones (v0.80.0): game.corp.milestones — awarded each morning from the game's own records (src/corp/milestones.js), never from
// opening a screen, hiring someone or pressing a button, and never promised from a war. Each is awarded once, with the day and what the records said.
// State: world.corp.milestones = { earned: { id: { day, have } } }, created when the first is earned.
import { MILESTONES, evaluate } from '../corp/milestones.js';
import { recordsOf } from './milestonesRecords.js';

export class Milestones {
  constructor(corp) {
    this.K = corp;
  }

  get g() { return this.K.game; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.milestones || null; }
  earned() { return this.peek()?.earned || {}; }

  /** What the game's records say, in the shape the rules read. */
  records() { return recordsOf(this.K); }

  /** Every milestone with its state: earned (when), or not (and how near). */
  view() {
    const rec = this.records();
    const now = Object.fromEntries(evaluate(rec, this.earned()).map((x) => [x.id, x]));
    return MILESTONES.map((m) => ({ id: m.id, name: m.name, text: m.text, earned: this.earned()[m.id] || null, have: now[m.id]?.have ?? this.earned()[m.id]?.have ?? '' }));
  }

  /** Each morning, after the group's and the managers' day: award what the records now meet, once. */
  dailyTick() {
    if (!this.K.registry().some((r) => r.kind === 'player')) return;
    const rec = this.records();
    for (const r of evaluate(rec, this.earned())) {
      if (!r.met) continue;
      const m = MILESTONES.find((x) => x.id === r.id);
      const st = (this.K.state.milestones ||= { v: 1, earned: {} });
      if (st.earned[r.id]) continue; // once
      st.earned[r.id] = { day: this.day, have: r.have };
      this.g.tablet.post('milestones', `Milestone: ${m.name} — ${m.text}`, 'good');
    }
  }
}
