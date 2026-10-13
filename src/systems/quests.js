// Quest and job tracking. Quests are declarative (src/content/quests.js):
// stages with journal text and objectives, data-driven triggers that react to
// game events, and named outcomes with effects. Jobs are daily repeatables.
import { check } from '../sim/conditions.js';
import { MINUTES_PER_DAY, inWindow } from '../world/clock.js';

export class QuestSystem {
  constructor(game) {
    this.game = game;
    const bus = game.bus;
    for (const evt of ['map:entered', 'item:acquired', 'fact:learned', 'flag:set', 'npc:talked', 'prop:used', 'quest:completed']) {
      bus.on(evt, (payload) => this.onEvent(evt, payload));
    }
  }
  get defs() {
    return this.game.content.quests;
  }
  get states() {
    return this.game.questState;
  }
  state(id) {
    return this.states[id] || { state: 'not_started' };
  }

  matches(q) {
    const st = this.state(q.id);
    if (q.state) {
      const want = Array.isArray(q.state) ? q.state : [q.state];
      if (!want.includes(st.state)) return false;
    }
    if (q.stage) {
      const want = Array.isArray(q.stage) ? q.stage : [q.stage];
      if (st.state !== 'active' || !want.includes(st.stage)) return false;
    }
    if (q.outcome && st.outcome !== q.outcome) return false;
    return true;
  }

  doneToday(id) {
    const st = this.state(id);
    return (st.completedDays || []).includes(this.game.clock.day);
  }

  start(id) {
    const def = this.defs[id];
    if (!def) return false;
    const st = this.state(id);
    if (st.state === 'active') return false;
    if (st.state === 'completed' && def.kind !== 'job') return false;
    if (def.kind === 'job' && this.doneToday(id)) return false;
    this.states[id] = {
      ...st,
      state: 'active',
      stage: def.start,
      outcome: null,
      startedAt: this.game.clock.total,
      day: this.game.clock.day,
      notes: [...(st.notes || []), { at: this.game.clock.total, text: def.stages[def.start].journal }],
    };
    this.game.bus.emit('quest:started', { id, title: def.title });
    this.game.applyEffects(def.onStart);
    return true;
  }

  setStage(id, stage) {
    const def = this.defs[id];
    const st = this.states[id];
    if (!def || !st || st.state !== 'active' || !def.stages[stage] || st.stage === stage) return false;
    st.stage = stage;
    st.notes.push({ at: this.game.clock.total, text: def.stages[stage].journal });
    this.game.bus.emit('quest:stage', { id, stage, title: def.title, text: def.stages[stage].journal });
    this.game.applyEffects(def.stages[stage].onEnter);
    return true;
  }

  complete(id, outcome = 'default') {
    const def = this.defs[id];
    const st = this.states[id];
    if (!def || !st || st.state !== 'active') return false;
    const out = def.outcomes?.[outcome] || {};
    st.state = 'completed';
    st.outcome = outcome;
    st.stage = null;
    st.completedAt = this.game.clock.total;
    if (def.kind === 'job') st.completedDays = [...(st.completedDays || []), this.game.clock.day].slice(-14);
    if (out.journal) st.notes.push({ at: this.game.clock.total, text: out.journal });
    this.game.bus.emit('quest:completed', { id, outcome, title: def.title, text: out.journal });
    this.game.applyEffects(out.effects);
    return true;
  }

  fail(id, reason = 'failed') {
    const def = this.defs[id];
    const st = this.states[id];
    if (!def || !st || st.state !== 'active') return false;
    const out = def.failures?.[reason] || {};
    st.state = 'failed';
    st.outcome = reason;
    st.stage = null;
    if (def.kind === 'job') st.completedDays = [...(st.completedDays || []), this.game.clock.day].slice(-14);
    if (out.journal) st.notes.push({ at: this.game.clock.total, text: out.journal });
    this.game.bus.emit('quest:failed', { id, reason, title: def.title, text: out.journal });
    this.game.applyEffects(out.effects);
    // Jobs return to "available" the next day; story quests stay failed but
    // may define `retry` so mistakes are recoverable.
    return true;
  }

  onEvent(evt, payload) {
    for (const [id, def] of Object.entries(this.defs)) {
      for (const trig of def.triggers || []) {
        if (trig.event !== evt) continue;
        if (trig.where && !Object.entries(trig.where).every(([k, v]) => payload[k] === v)) continue;
        if (trig.stage && !this.matches({ id, stage: trig.stage })) continue;
        if (trig.notStarted && this.state(id).state !== 'not_started') continue;
        if (trig.if && !check(trig.if, this.game)) continue;
        if (trig.start) this.start(id);
        if (trig.advance) this.setStage(id, trig.advance);
        if (trig.complete) this.complete(id, trig.complete);
        if (trig.effects) this.game.applyEffects(trig.effects);
      }
    }
  }

  /** Called every game minute: handles job expiry windows. */
  tick() {
    const now = this.game.clock;
    for (const [id, def] of Object.entries(this.defs)) {
      const st = this.states[id];
      if (!st || st.state !== 'active' || !def.expires) continue;
      const pastDay = Math.floor(now.total / MINUTES_PER_DAY) + 1 > st.day;
      const pastTime = !inWindow(now.minuteOfDay, '00:00', def.expires.at);
      if (pastDay || pastTime) this.fail(id, 'expired');
    }
  }

  /** Visible objectives & hints for the journal. */
  journal() {
    const out = [];
    for (const [id, def] of Object.entries(this.defs)) {
      const st = this.state(id);
      if (st.state === 'not_started') continue;
      const stage = st.state === 'active' ? def.stages[st.stage] : null;
      out.push({
        id,
        title: def.title,
        kind: def.kind || 'quest',
        state: st.state,
        outcome: st.outcome,
        summary: def.summary,
        objectives: (stage?.objectives || []).filter((o) => !o.if || check(o.if, this.game)),
        hints: (stage?.hints || []).filter((h) => check(h.if, this.game)).map((h) => h.text),
        notes: st.notes || [],
      });
    }
    const order = { active: 0, completed: 1, failed: 2 };
    return out.sort((a, b) => order[a.state] - order[b.state]);
  }
}
