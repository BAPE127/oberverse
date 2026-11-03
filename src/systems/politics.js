// The political system (v0.93.0): game.politics — the record `world.politics` and the read-only views the Politics app shows.
//
// This release is foundations only: two parties and their leaders (Josiah Vegas for the Order Party, Susan for the Liberty League), a government,
// a term of 120 game days with an election date, and an overview. Nothing here changes any price, cost, police or war: policies, the Assembly,
// opinion, elections and influence come in later releases. The record is made the first time anything reads it (no random draw: which party
// governs first comes from the world's own seed state), saved with the game, and an older save simply gains it.
import { POLITICS as P } from '../content/politics.js';
import { termOf, phaseOf, daysTo } from '../politics/calendar.js';
import { freshPolitics, OTHER_PARTY, stanceDistance, PARTY_IDS } from '../politics/model.js';
import { hashUnit } from '../aero/config.js';

export class Politics {
  constructor(game) {
    this.game = game;
  }

  get g() { return this.game; }
  get day() { return this.g.clock.day; }
  cfg() { return P; }
  peek() { return this.g.world.politics || null; }

  /** The record, made on first use. Which party governs first is a fixed function of the world's seed state, so a reload never changes it. */
  ensure() {
    const w = this.g.world;
    if (!w.politics) {
      const governs = hashUnit(`politics|first|${this.g.rng.state}`) < 0.5 ? 'order' : 'liberty';
      w.politics = freshPolitics(P, { day: this.day, governs });
    }
    return w.politics;
  }

  /** Once a day: the term rolls over when its last day has passed (the same government continues until elections exist). Idempotent. */
  dailyTick() {
    const s = this.ensure();
    const t = termOf(this.day, s.constitution);
    if (t.index !== s.government.term) {
      s.government.term = t.index; s.government.termStart = t.start; s.government.termEnd = t.end;
      s.history.push({ day: this.day, kind: 'term', text: `A new term begins: ${this.party(s.government.partyId).name} continues in office (no election is held yet).` });
      while (s.history.length > 60) s.history.shift();
    }
  }

  party(id) { return P.parties[id]; }
  partyRecord(id) { return this.ensure().parties[id]; }
  governingId() { return this.ensure().government.partyId; }
  oppositionId() { return OTHER_PARTY(this.governingId()); }
  calendar() { const c = this.ensure().constitution; return { ...termOf(this.day, c), phase: phaseOf(this.day, c), daysToPolling: daysTo(this.day, c) }; }
  leaderName(id) { return this.g.content.characters[P.parties[id].leader]?.name || P.parties[id].leader; }
  leader(id) { return this.g.content.characters[P.parties[id].leader] || null; }

  /** The read-only overview the tablet shows: who governs, the term, the opposition and where the platforms differ most. */
  overview() {
    const s = this.ensure();
    const gov = this.governingId();
    const opp = this.oppositionId();
    const cal = this.calendar();
    const a = P.parties[gov].platform;
    const b = P.parties[opp].platform;
    const issues = Object.entries(P.issues).map(([id, def]) => ({ id, name: def.name, blurb: def.blurb, gov: a[id], opp: b[id], gap: Math.abs(a[id] - b[id]) })).sort((x, y) => y.gap - x.gap);
    const row = (id) => ({ id, name: P.parties[id].name, short: P.parties[id].short, colour: P.parties[id].colour, leaderId: P.parties[id].leader, leader: this.leaderName(id), blurb: P.parties[id].blurb, seats: s.constitution.assemblySeats[id], funds: s.parties[id].funds, staffFilled: s.parties[id].staff.filter((x) => x.personId).length, staffRoles: s.parties[id].staff.length });
    return {
      king: P.constitution.king,
      governing: row(gov), opposition: row(opp),
      seats: { ...s.constitution.assemblySeats },
      calendar: cal,
      termDay: this.day - cal.start + 1, termDays: s.constitution.termDays,
      electionsHeld: s.constitution.electionsHeld,
      issues, apart: stanceDistance(a, b, P.issues),
      history: s.history.slice(-8).reverse(),
    };
  }
}

export { PARTY_IDS };
