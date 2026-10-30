// Mason's Os: day shifts on the Westbrook construction site and the crew's
// goodwill towards the player. State lives in game.world.construction (saved).
// Goodwill earned by careful work makes property contracts cheaper and faster
// (see src/systems/properties.js). Unlike the refinery, rushing is never
// rewarded — and nobody here ever shouts about it.
import { clamp } from '../core/util.js';
import { INCOME } from '../content/income.js';

export const SITE_STATIONS = {
  trench: { name: 'Trench', proper: 'You dig to the string line, square the sides and shore them. (40 min)', rush: 'You scoop out roughly a trench-shaped hole. (10 min)' },
  bricks: { name: 'Brick stack', proper: 'You lay a true course: buttered, levelled, pointed. (40 min)', rush: 'You stack bricks in a way that is technically a wall. (10 min)' },
  mixer: { name: 'Cement mixer', proper: 'You measure sand, cement and water to Dee\'s recipe. (40 min)', rush: 'You eyeball it and add water until it looks like porridge. (10 min)' },
};

export const SITE_WAGE = INCOME.shift.construction; // was 6 (v0.82.0)
export const MAX_GOODWILL = 30;

export function freshConstruction() {
  return { goodwill: 0, shiftsWorked: 0, rushDay: -1, rushCount: 0 };
}

export class Construction {
  constructor(game) {
    this.game = game;
  }

  get state() {
    if (!this.game.world.construction) this.game.world.construction = freshConstruction();
    return this.game.world.construction;
  }

  /** Fraction off property contracts (0–0.25) from crew goodwill. */
  discount() {
    return Math.min(0.25, this.state.goodwill / 120);
  }

  /** Days shaved off a build: one at 15 goodwill, two at 30. */
  speedup() {
    return this.state.goodwill >= 30 ? 2 : this.state.goodwill >= 15 ? 1 : 0;
  }

  addGoodwill(n) {
    this.state.goodwill = clamp(this.state.goodwill + n, 0, MAX_GOODWILL);
    this.game.bus.emit('construction:goodwill', { goodwill: this.state.goodwill });
  }

  stationPrompt(prop) {
    const g = this.game;
    const station = prop.interact.station;
    const def = SITE_STATIONS[station];
    if (!g.quests.matches({ id: 'job_construction_shift', stage: 'work' })) {
      return { type: 'message', text: `A hand-painted sign on the ${def.name.toLowerCase()}: "CREW ONLY — see Dee for a shift. (She's the one with the clipboard and the laugh.)"` };
    }
    if (g.getFlag(`site_${station}`) === g.clock.day) return { type: 'message', text: `You've already done the ${def.name.toLowerCase()} today. It looks great. Probably.` };
    return {
      type: 'choices',
      title: def.name,
      text: 'How do you want to do this?',
      options: [
        { label: `Do it properly — ${def.proper}`, call: ['construction', 'work', prop.id, 'proper'] },
        { label: `Rush it — ${def.rush}`, call: ['construction', 'work', prop.id, 'rush'] },
      ],
    };
  }

  work(propId, mode) {
    const g = this.game;
    const prop = g.currentMap().prop(propId);
    if (!prop) return { ok: false, text: 'Nothing to work on.' };
    const station = prop.interact.station;
    const s = this.state;
    g.skipTime(mode === 'proper' ? 40 : 10);
    g.setFlag(`site_${station}`, g.clock.day);
    if (mode === 'rush') {
      s.rushCount = s.rushDay === g.clock.day ? s.rushCount + 1 : 1;
      s.rushDay = g.clock.day;
      g.setFlag('site_rushed', g.clock.day);
      const dee = g.npcs.get('npc_dee');
      if (dee && dee.map === g.player.map && dee.activity !== 'sleep' && g.canSee(dee, g.player.x, g.player.y, g.currentMap(), 10)) {
        g.knowledge.learn(dee, 'fact_player_rushed_site', { kind: 'fact', source: 'witnessed', at: g.clock.total });
        g.bark(dee, 'Easy, pal — a wall is only as good as its worst brick!');
      }
    }
    const done = Object.keys(SITE_STATIONS).every((st) => g.getFlag(`site_${st}`) === g.clock.day);
    if (done) g.quests.setStage('job_construction_shift', 'report');
    const def = SITE_STATIONS[station];
    return { ok: true, text: (mode === 'proper' ? def.proper : def.rush).replace(/\s*\(.*\)$/, '') };
  }

  rushedToday() {
    return this.state.rushDay === this.game.clock.day ? this.state.rushCount : 0;
  }

  /** Paid by Dee on report: a fair flat wage. Careful work earns goodwill. */
  payShift() {
    const g = this.game;
    const s = this.state;
    const rushed = this.rushedToday();
    g.player.money += SITE_WAGE;
    g.bus.emit('money:changed', { delta: SITE_WAGE, total: g.player.money });
    s.shiftsWorked += 1;
    this.addGoodwill(rushed ? -rushed : 2);
    return SITE_WAGE;
  }
}
