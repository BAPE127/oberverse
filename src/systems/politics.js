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
import { STAFF_BY_PARTY } from '../content/capital.js';
import { POLICIES, GOVERNMENT as G } from '../content/policies.js';
import { vote } from '../politics/assembly.js';
import { monthly } from '../politics/budget.js';
import { chooseProposals, advance, inProgress } from '../politics/policy.js';
import { compute, poll as takePoll } from '../politics/opinion.js';
import { POLLSTERS, OPINION as OP } from '../content/opinion.js';

const PRESIDENT = new WeakMap(); // a leader's content schedule → the same leader's schedule as President (built once, so identity is stable)

/** The leader's day as President: the same home life, and the working day in Halver House (the President's office, the cabinet room, the steps for a public appearance). */
function presidentSchedule(base) {
  if (PRESIDENT.has(base)) return PRESIDENT.get(base);
  const sleep = base[0]; const breakfast = base[1]; const lunch = base[3]; const evening = base[base.length - 1];
  const out = [
    sleep, breakfast,
    { from: breakfast.to, to: '12:00', activity: 'work', spot: 'halver_president:entry', label: 'at the President\'s desk' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: lunch.spot, label: 'a working lunch by the fountain' },
    { from: '13:00', to: '15:00', activity: 'work', spot: 'halver_cabinet:entry', label: 'in the cabinet room' },
    { from: '15:00', to: evening.from, activity: 'work', spot: 'crown_quarter:halver_house_steps', label: 'a public appearance on the steps of Halver House' },
    evening,
  ];
  PRESIDENT.set(base, out);
  return out;
}

export class Politics {
  constructor(game) {
    this.game = game;
  }

  get g() { return this.game; }
  get day() { return this.dayOverride ?? this.g.clock.day; }
  cfg() { return P; }
  peek() { return this.g.world.politics || null; }

  /** The record, made on first use. Which party governs first is a fixed function of the world's seed state, so a reload never changes it. */
  ensure() {
    const w = this.g.world;
    if (!w.politics) {
      const governs = hashUnit(`politics|first|${this.g.rng.state}`) < 0.5 ? 'order' : 'liberty';
      w.politics = freshPolitics(P, { day: this.day, governs });
    }
    this.fillStaff(w.politics);
    this.ensureGovernment(w.politics);
    return w.politics;
  }

  // ------------------------------------------------------------- the government (v0.94.0)
  /** The government's records (policies, books, decisions) with their defaults; a record made by 0.93.x gains them. The governing party starts with its best-fitting policies in force. */
  ensureGovernment(s) {
    if (s.policies) return;
    Object.assign(s, { policies: [], budget: { debt: G.budget.startingDebt, last: null, lastWindow: 0, squeeze: false }, decisions: [], polls: [], series: [], nextPoll: 1, pollSalt: String(this.g.rng.state), lastGovDay: Math.max(0, this.day - 1), lastCabinet: 0, nextPolicy: 1 });
    const ctx = this.context(s);
    for (const r of chooseProposals({ ...ctx, headroom: 9999 }, [], G.starting)) {
      s.policies.push({ id: s.nextPolicy++, key: r.policy.id, state: 'active', since: this.day, by: s.government.partyId, votes: null, note: 'in force from the start of the game' });
    }
    this.log(s, `${this.party(s.government.partyId).name} begins with ${s.policies.length} policies in force.`);
    this.takePoll(s, 'courier', this.day);
  }

  // ------------------------------------------------------------- opinion and polls (v0.94.0)
  /** The truth of public opinion today, from the policies in force, the books and the world. Internal: the player sees only polls of it. */
  opinionTruth(s = this.ensure()) {
    const m = this.budgetNow(s);
    return compute({ gov: s.government.partyId, platforms: this.platforms(s), policies: s.policies.filter((p) => p.state === 'active').map((p) => POLICIES[p.key]), deficitRatio: m.deficit / m.revenue, wars: this.wars(), embargoes: this.embargoes() });
  }

  /** What the administration believes about its standing: the latest poll's approval (it reads polls, not the truth); 0.5 before any. */
  approval(s) { return s.polls?.length ? s.polls[s.polls.length - 1].approval : 0.5; }

  /** One poll by `pollsterId`, published today (fieldwork a few days earlier), of the truth now, with the pollster's house effect and sampling error. Keyed by its number, so a reload cannot change it. */
  takePoll(s, pollsterId, day) {
    const P_ = POLLSTERS[pollsterId];
    const id = s.nextPoll++;
    const key = `${s.pollSalt}|poll|${id}`;
    const sample = P_.sample[0] + Math.floor(hashUnit(`${key}|n`) * (P_.sample[1] - P_.sample[0]));
    const r = takePoll(this.opinionTruth(s), { pollster: P_, sample, key });
    s.polls.push({ id, day, fieldwork: day - P_.delay, pollster: pollsterId, name: P_.name, ...r, gov: s.government.partyId });
    while (s.polls.length > OP.logKept) s.polls.shift();
  }

  /** Each pollster publishes on its own rhythm; the truth is also kept as a short series for the systems that follow (never shown). */
  pollDay(s, day) {
    for (const [id, P_] of Object.entries(POLLSTERS)) if (day >= P_.offset && (day - P_.offset) % P_.every === 0 && !s.polls.some((p) => p.day === day && p.pollster === id)) this.takePoll(s, id, day);
    const t = this.opinionTruth(s);
    s.series.push({ day, approval: Math.round(t.approval * 1000) / 1000, order: Math.round(t.support.order * 1000) / 1000, liberty: Math.round(t.support.liberty * 1000) / 1000 });
    while (s.series.length > OP.seriesKept) s.series.shift();
  }

  /** What the Polls page shows: the newest poll in full, the history, and the state-by-state picture of the newest. Dates and margins always. */
  polls() {
    const s = this.ensure();
    const list = [...s.polls].reverse();
    const latest = list[0] || null;
    return { latest, list: list.slice(0, 8), count: s.polls.length, govName: this.party(s.government.partyId).name };
  }

  log(s, text) { s.decisions.push({ day: this.day, text }); while (s.decisions.length > 80) s.decisions.shift(); }
  platforms(s) { return Object.fromEntries(Object.entries(s.parties).map(([id, p]) => [id, p.platform])); }
  wars() { return this.g.world.market?.wars?.length || 0; }
  embargoes() { return Object.values(this.g.world.market?.countries || {}).filter((c) => c.embargo).length; }
  rate() { try { return this.g.corp.bank.rate(); } catch { return 0.03; } }

  /** What the administration weighs at a window: its platform, the budget's headroom, the calendar, and (when opinion exists) the President's approval. */
  context(s) {
    const gov = s.government.partyId;
    const month = this.budgetNow(s);
    const cal = phaseOf(this.day, s.constitution);
    return { platform: s.parties[gov].platform, headroom: month.headroom, campaign: cal !== 'term', approval: this.approval ? this.approval(s) : 0.5, weights: G.weights };
  }

  /** This month's budget from what is in force today. */
  budgetNow(s) {
    const active = s.policies.filter((p) => p.state === 'active').map((p) => POLICIES[p.key]);
    return monthly(G.budget, { policies: active, wars: this.wars(), embargoes: this.embargoes(), debt: s.budget.debt, rate: this.rate() });
  }

  /** One government day: policies in progress move on (the Assembly votes when review ends); every seventh day the cabinet proposes; every thirtieth the budget window closes. Idempotent per day. */
  governmentDay(s) {
    const day = this.day;
    if (s.lastGovDay >= day) return;
    for (let d = s.lastGovDay + 1; d <= day && d <= s.lastGovDay + 150; d++) this.governmentStep(s, d);
    s.lastGovDay = day;
  }

  governmentStep(s, day) {
    const saved = this.dayOverride; this.dayOverride = day;
    for (const p of s.policies.filter(inProgress).sort((a, b) => a.id - b.id)) {
      const next = advance(p, day, G);
      if (!next) continue;
      const def = POLICIES[p.key];
      if (next === 'review') { p.state = 'review'; p.since = day; this.log(s, `${def.name}: sent to the Assembly's committee.`); }
      else if (next === 'vote') {
        const v = vote(def, { seats: s.constitution.assemblySeats, platforms: this.platforms(s), governing: s.government.partyId, discipline: G.discipline });
        p.votes = { yes: v.yes, no: v.no, seats: v.seats, day, byParty: v.byParty };
        if (v.passed) { p.state = 'approved'; p.since = day; this.log(s, `${def.name}: the Assembly passed it, ${v.yes} to ${v.no}.`); }
        else { p.state = 'ended'; p.since = day; p.note = 'rejected by the Assembly'; this.log(s, `${def.name}: the Assembly rejected it, ${v.no} to ${v.yes}.`); }
      } else if (next === 'implementing') { p.state = 'implementing'; p.since = day; }
      else if (next === 'active') this.activate(s, p, day);
    }
    this.pollDay(s, day);
    if (day - s.lastCabinet >= G.cabinetEvery) { s.lastCabinet = day; this.cabinet(s, day); }
    if (day - s.budget.lastWindow >= G.budgetEvery) { s.budget.lastWindow = day; this.budgetWindow(s, day); }
    this.dayOverride = saved;
  }

  /** A policy comes into force: its opposite (if in force) is repealed, and the least-fitting is retired if the government would hold more than it may. */
  activate(s, p, day) {
    const def = POLICIES[p.key];
    p.state = 'active'; p.since = day;
    const opp = s.policies.find((q) => q.key === def.opposes && inProgress(q));
    if (opp) { opp.state = 'ended'; opp.since = day; opp.note = `repealed by "${def.name}"`; }
    this.log(s, `${def.name} comes into force${opp ? `, repealing "${POLICIES[opp.key].name}"` : ''}.`);
    const active = s.policies.filter((q) => q.state === 'active');
    if (active.length > G.maxActive) {
      const plat = s.parties[s.government.partyId].platform;
      const weakest = active.filter((q) => q !== p).sort((a, b) => (plat[POLICIES[a.key].issue] || 0) * POLICIES[a.key].dir - (plat[POLICIES[b.key].issue] || 0) * POLICIES[b.key].dir || a.id - b.id)[0];
      if (weakest) { weakest.state = 'ended'; weakest.since = day; weakest.note = 'lapsed: the government may hold only so many programmes'; this.log(s, `${POLICIES[weakest.key].name} lapses.`); }
    }
  }

  /** The cabinet (every seventh day, a Thornday): the administration weighs the catalogue and proposes the best it believes in. */
  cabinet(s, day) {
    const ctx = this.context(s);
    const picks = chooseProposals(ctx, s.policies, G.proposals);
    for (const r of picks) {
      s.policies.push({ id: s.nextPolicy++, key: r.policy.id, state: 'proposed', since: day, by: s.government.partyId, votes: null, score: Math.round(r.score * 100) / 100 });
      this.log(s, `The cabinet proposes "${r.policy.name}"${r.repeals ? ` (it would repeal "${POLICIES[r.repeals].name}")` : ''}.`);
    }
    if (!picks.length) this.log(s, 'The cabinet meets and proposes nothing: nothing it believes in is affordable or worth the fight.');
  }

  /** The monthly window: the books close, the deficit joins (or the surplus pays down) the debt, and a deficit above the limit puts the Treasury on notice. */
  budgetWindow(s, day) {
    const m = this.budgetNow(s);
    s.budget.debt = Math.max(0, s.budget.debt + m.deficit);
    s.budget.last = { day, revenue: m.revenue, spending: m.spending.total, deficit: m.deficit, debt: s.budget.debt };
    s.budget.squeeze = m.headroom < 0;
    this.log(s, m.deficit > 0 ? `The month closes ${m.deficit}k in deficit; the debt stands at ${s.budget.debt}k.${s.budget.squeeze ? ' That is over the limit: the Treasury asks for savings.' : ''}` : `The month closes ${-m.deficit}k in surplus; the debt stands at ${s.budget.debt}k.`);
  }

  /** What the Government page shows. */
  government() {
    const s = this.ensure();
    const now = this.budgetNow(s);
    const row = (p) => ({ ...p, def: POLICIES[p.key], daysLeft: p.state === 'active' || p.state === 'ended' ? null : Math.max(0, (G.days[p.state] || 0) - (this.day - p.since)) });
    const mine = s.policies.map(row);
    return {
      governing: s.government.partyId, budget: { ...now, debt: s.budget.debt, last: s.budget.last, squeeze: s.budget.squeeze },
      active: mine.filter((p) => p.state === 'active'), coming: mine.filter((p) => ['proposed', 'review', 'approved', 'implementing'].includes(p.state)),
      ended: mine.filter((p) => p.state === 'ended').slice(-6).reverse(), decisions: s.decisions.slice(-10).reverse(), cabinetIn: Math.max(0, G.cabinetEvery - (this.day - s.lastCabinet)),
    };
  }

  /** The leader in office works at Halver House; the other works the capital from party headquarters. Each game keeps its own copy of a leader's profile (the content is shared). Idempotent. */
  syncLeaders() {
    const s = this.ensure();
    for (const pid of PARTY_IDS) {
      const id = P.parties[pid].leader;
      const npc = this.g.npcs.get(id);
      const base = this.g.content.characters[id];
      if (!npc || !base) continue;
      const want = pid === s.government.partyId ? presidentSchedule(base.schedule) : base.schedule;
      if (npc.profile.schedule !== want) npc.profile = want === base.schedule ? base : { ...base, schedule: want };
    }
  }

  /** The parties' staff records name their people (v0.94.0): a vacant record gains the person the content gives that role. Idempotent; a record a later release has filled is left alone. */
  fillStaff(s) {
    for (const [pid, party] of Object.entries(s.parties)) for (const rec of party.staff) if (!rec.personId && STAFF_BY_PARTY[pid]?.[rec.role]) rec.personId = STAFF_BY_PARTY[pid][rec.role];
  }

  /** Once a day: the term rolls over when its last day has passed (the same government continues until elections exist). Idempotent. */
  dailyTick() {
    const s = this.ensure();
    this.syncLeaders();
    this.governmentDay(s);
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
