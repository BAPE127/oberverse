// Elections and campaigns (v0.95.0): the daily steps and the views, added to the Politics service (src/systems/politics.js).
//
// A term is 120 days; the election falls in its last 30 (the campaign) and the last day is polling day. Each day of the government's step (idempotent per day):
//   · each party raises funds; in the campaign each spends a share of what it holds, by channel (advertising, rallies, organisers), with diminishing returns;
//   · the press may find a scandal (a hash of the day, never a random draw);
//   · the one debate is held a few days before the vote;
//   · on polling day the vote is worked out from opinion, the campaign, scandals, promises kept and how long the government has held office, and sealed;
//   · results are announced at 22:00 that night (election night: the leaders and their staff gather in Sovereign Square);
//   · on the first day of the next term the winner takes office: President, Assembly seats, the policies on their way, the leaders' schedules.
// Everything is keyed by the term, so a reload can neither repeat a result nor re-roll it, and nothing here reads a random number.
import { ELECTIONS as E } from '../content/elections.js';
import { POLICIES } from '../content/policies.js';
import { POLITICS as P } from '../content/politics.js';
import { termOf, phaseOf } from '../politics/calendar.js';
import { OTHER_PARTY, PARTY_IDS } from '../politics/model.js';
import { inProgress } from '../politics/policy.js';
import { staffStrength, campaignEffect, scandalWeight, manifestoOf, promisesKept, debate, tally, hashUnit } from '../politics/election.js';

const round = (v) => Math.round(v * 10000) / 10000;
const range = (a, u) => a[0] + u * (a[1] - a[0]);
const emptySpend = () => ({ ads: 0, rallies: 0, ground: 0 });
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export const electionMethods = {
  /** The election record, made on first use (a save from 0.94.x gains it): the manifestos, the scandal log and who has held office for how long. */
  ensureElections(s) {
    if (s.elections) return s.elections;
    s.elections = { salt: String(this.g.rng.state), history: [], pending: null, campaign: null, scandals: [], nextScandal: 1, manifesto: {}, holder: { party: s.government.partyId, terms: 1 } };
    this.setManifestos(s);
    return s.elections;
  },

  /** Each party's promises for the term that is beginning: the policies it believes in most that are not already in force or on their way. Fixed for the term. */
  setManifestos(s) {
    const have = s.policies.filter(inProgress).map((p) => p.key);
    for (const id of PARTY_IDS) s.elections.manifesto[id] = manifestoOf(s.parties[id].platform, POLICIES, E.manifesto, have);
  },

  staff(s, party, roles) { return staffStrength(s.parties[party], roles); },
  pressStrength(s, party) { return this.staff(s, party, ['press_secretary']); },

  /** The campaign of the term whose election is next: spending by channel, funds raised, the debate. Made on the first campaign day. */
  campaignOf(s) {
    const el = this.ensureElections(s);
    const t = termOf(this.day, s.constitution);
    if (!el.campaign || el.campaign.term !== t.index) {
      el.campaign = { term: t.index, spent: { order: emptySpend(), liberty: emptySpend() }, raised: { order: 0, liberty: 0 }, debate: null, started: this.day };
    }
    return el.campaign;
  },

  // ---------------------------------------------------------------- the daily steps
  electionStep(s, day) {
    const el = this.ensureElections(s);
    this.raiseFunds(s);
    this.scandalStep(s, el, day);
    const phase = phaseOf(day, s.constitution);
    const t = termOf(day, s.constitution);
    if (phase !== 'term') {
      const camp = this.campaignOf(s);
      if (phase === 'campaign') {
        this.spendCampaign(s, camp);
        if (day === t.electionDay - E.debate.daysBefore && !camp.debate) this.holdDebate(s, el, camp, day);
      }
      if (phase === 'polling' && !el.pending) this.conclude(s, el, camp, day, t);
    }
    if (day === t.start && t.index > 0 && el.pending) this.transition(s, el, day, t);
  },

  /** Each party raises money every day (a fundraising director raises more; the governing party a little more still). */
  raiseFunds(s) {
    for (const id of PARTY_IDS) {
      const party = s.parties[id];
      const gain = E.funds.perDay + (party.staff.some((x) => x.role === 'fundraising' && x.personId) ? E.funds.fundraiser : 0) + (id === s.government.partyId ? E.funds.governing : 0);
      party.funds += gain;
      if (s.elections.campaign && phaseOf(this.day, s.constitution) !== 'term') s.elections.campaign.raised[id] += gain;
    }
  },

  /** In the campaign each party spends a share of what it holds every day, split by channel. */
  spendCampaign(s, camp) {
    for (const id of PARTY_IDS) {
      const party = s.parties[id];
      const amount = Math.floor(party.funds * E.funds.spendRate);
      if (amount <= 0) continue;
      party.funds -= amount;
      for (const [ch, share] of Object.entries(E.funds.split)) camp.spent[id][ch] += Math.round(amount * share);
    }
  },

  /** The press find a scandal now and then (a hash of the day and the party). It has a severity, a credibility and the attention it gets; it fades. */
  scandalStep(s, el, day) {
    for (const id of PARTY_IDS) {
      const key = `${el.salt}|scandal|${day}|${id}`;
      if (hashUnit(key) >= E.scandals.chance) continue;
      if (el.scandals.some((x) => x.day === day && x.party === id)) continue;
      this.addScandal(s, el, { party: id, day, severity: range(E.scandals.severity, hashUnit(`${key}|s`)), credibility: range(E.scandals.credibility, hashUnit(`${key}|c`)), attention: range(E.scandals.attention, hashUnit(`${key}|a`)), source: 'press', text: SCANDALS[Math.floor(hashUnit(`${key}|t`) * SCANDALS.length)] });
    }
  },

  addScandal(s, el, x) {
    const row = { id: el.nextScandal++, quieted: false, ...x, severity: round(x.severity), credibility: round(x.credibility), attention: round(x.attention) };
    el.scandals.push(row);
    while (el.scandals.length > E.scandals.kept) el.scandals.shift();
    const name = this.party(row.party).name;
    this.log(s, `A scandal for ${name}: ${row.text}`);
    if (row.day >= this.day - 1) this.news(`📰 ${name}: ${row.text}`);
    return row;
  },

  /** What a party's scandals weigh on the vote today. */
  scandalNow(s, party, day = this.day) {
    return scandalWeight(this.ensureElections(s).scandals, party, day, this.pressStrength(s, party));
  },

  /** The one debate: who won, and a small swing to the winner (it counts in the campaign's total). */
  holdDebate(s, el, camp, day) {
    const standing = {}; const comms = {};
    const truth = this.opinionTruth(s);
    for (const id of PARTY_IDS) { standing[id] = id === s.government.partyId ? truth.approval : 1 - truth.approval * 0.85; comms[id] = this.staff(s, id, ['communications', 'press_secretary']); }
    const r = debate({ standing, comms, key: `${el.salt}|debate|${camp.term}` });
    camp.debate = { day, winner: r.winner, margin: round(r.margin) };
    this.log(s, `The debate: ${this.party(r.winner).name} was judged to have won it.`);
    this.news(`🎙️ The debate: ${this.leaderName(r.winner)} (${this.party(r.winner).short}) was judged the winner.`);
  },

  /** What each party's campaign has bought so far: the swing of its spending (with its staff) and the debate. */
  campaignSwing(s, camp) {
    const out = {};
    for (const id of PARTY_IDS) {
      const e = campaignEffect(camp.spent[id], s.parties[id]);
      out[id] = { ...e, debate: camp.debate?.winner === id ? E.debate.swing : 0 };
      out[id].sum = e.total + out[id].debate;
    }
    return out;
  },

  /** Polling day: the vote is worked out and sealed until the announcement. */
  conclude(s, el, camp, day, t) {
    const truth = this.opinionTruth(s);
    const swing = this.campaignSwing(s, camp);
    const gov = s.government.partyId;
    const promises = promisesKept(el.manifesto[gov], s.policies);
    const scandals = { order: this.scandalNow(s, 'order', day), liberty: this.scandalNow(s, 'liberty', day) };
    const r = tally({ key: `${el.salt}|election|${t.index}`, truth, campaign: { order: swing.order.sum, liberty: swing.liberty.sum }, scandals, promises, terms: el.holder.terms });
    el.pending = {
      id: t.index + 1, term: t.index, day, gov, incumbentTerms: el.holder.terms, announced: false,
      winner: r.winner, national: roundAll(r.national), turnout: round(r.turnout), seats: r.seats, margin: round(r.margin),
      regions: Object.fromEntries(Object.entries(r.regions).map(([k, v]) => [k, roundAll(v)])),
      parts: roundAll(r.parts), promises: round(promises), scandals: roundAll(scandals),
      campaign: { order: { spent: sum(camp.spent.order), swing: round(swing.order.sum) }, liberty: { spent: sum(camp.spent.liberty), swing: round(swing.liberty.sum) } },
      debate: camp.debate,
    };
  },

  /** 22:00 on polling day (or the first moment after it): the result is announced. Idempotent. */
  announce(s, el) {
    const r = el.pending;
    if (!r || r.announced) return;
    r.announced = true;
    const win = this.party(r.winner);
    const pct = (v) => `${(v * 100).toFixed(1)}%`;
    const changed = r.winner !== r.gov;
    const text = `${win.name} wins the election${changed ? ', and the government changes hands' : ' and stays in office'}: Order ${pct(r.national.order)}, Liberty ${pct(r.national.liberty)}, others ${pct(r.national.other)}; turnout ${pct(r.turnout)}. Seats: Order ${r.seats.order}, Liberty ${r.seats.liberty}, others ${r.seats.other}.`;
    this.log(s, text);
    s.history.push({ day: r.day, kind: 'election', text });
    while (s.history.length > 60) s.history.shift();
    for (const old of el.history) delete old.regions; // the by-state figures are kept for the latest vote only
    el.history.push({ ...r, announcedDay: this.day });
    while (el.history.length > E.logKept) el.history.shift();
    this.news(`🗳️ ELECTION NIGHT — ${text}`);
    const g = this.g;
    g.bus.emit('politics:election', { id: r.id, winner: r.winner, changed });
    g.notify(`🗳️ Election night: ${win.name} wins${changed ? ' — a change of government' : ''}.`, 'event');
    const leader = g.npcs.get(P.parties[r.winner].leader);
    if (leader) g.bark(leader, changed ? 'We did it. Thank you, Sund.' : 'Thank you. Back to work in the morning.');
    const loser = g.npcs.get(P.parties[OTHER_PARTY(r.winner)].leader);
    if (loser) g.bark(loser, 'The people have spoken. We will be back.');
  },

  /** Taking office on the first day of the term: President, Assembly, the policies on their way, the leaders' schedules. Idempotent (the result is spent). */
  transition(s, el, day, t) {
    if (!el.pending.announced) this.announce(s, el);
    const r = el.pending;
    const changed = r.winner !== s.government.partyId;
    s.government = { partyId: r.winner, presidentId: P.parties[r.winner].leader, term: t.index, termStart: t.start, termEnd: t.end };
    s.constitution.assemblySeats = { ...r.seats };
    s.constitution.electionsHeld = true;
    el.holder = changed ? { party: r.winner, terms: 1 } : { party: r.winner, terms: el.holder.terms + 1 };
    for (const p of s.policies) {
      if (p.state === 'active') p.owner = r.winner;
      else if (changed && ['proposed', 'review', 'approved', 'implementing'].includes(p.state)) { p.state = 'ended'; p.since = day; p.note = 'withdrawn by the new government'; }
    }
    const win = this.party(r.winner);
    s.history.push({ day, kind: 'term', text: changed ? `A new term begins: ${win.name} take office; ${this.leaderName(r.winner)} is President.` : `A new term begins: ${win.name} continue in office (term ${el.holder.terms}).` });
    while (s.history.length > 60) s.history.shift();
    this.log(s, changed ? `${win.name} take office. The new government withdraws the programmes still on their way.` : `${win.name} are returned to office.`);
    el.pending = null;
    this.setManifestos(s);
    this.syncLeaders();
  },

  // ---------------------------------------------------------------- election night
  /** Each minute: the night's crowd gathers at 19:30 and the announcement comes at 22:00 on polling day (or at once if the day has gone by). */
  minuteTick() {
    const s = this.peek();
    const el = s?.elections;
    if (!el?.pending) return;
    const r = el.pending;
    const now = this.g.clock;
    if (!r.announced && (now.day > r.day || (now.day === r.day && now.minuteOfDay >= minutes(E.night.announce)))) this.announce(s, el);
    if (now.day === r.day && now.minuteOfDay === minutes(E.night.gather)) this.gatherCrowd(s);
  },

  gatherCrowd(s) {
    const g = this.g;
    for (const pid of PARTY_IDS) {
      const people = [P.parties[pid].leader, ...s.parties[pid].staff.map((x) => x.personId)].filter(Boolean);
      for (const id of people) {
        const npc = g.npcs.get(id);
        if (!npc || npc.pursuit) continue;
        g.sendOnErrand(npc, { spot: id === P.parties[pid].leader ? E.night.spots.leaders : E.night.spots[pid], activity: 'election night', minutes: E.night.crowdMinutes });
      }
    }
  },

  news(text) { try { this.g.tablet.post('news', text, 'event'); } catch { /* the tablet may not exist in a bare test game */ } },

  // ---------------------------------------------------------------- views
  /** What the Campaign page shows. The sealed result is never shown before the announcement. */
  campaign() {
    const s = this.ensure();
    const el = this.ensureElections(s);
    const cal = this.calendar();
    const gov = s.government.partyId;
    const camp = cal.phase === 'term' ? null : this.campaignOf(s);
    const swing = camp ? this.campaignSwing(s, camp) : null;
    const party = (id) => ({
      id, name: this.party(id).name, short: this.party(id).short, leader: this.leaderName(id), funds: s.parties[id].funds,
      spent: camp ? sum(camp.spent[id]) : 0, swing: swing ? round(swing[id].sum) : 0, byChannel: camp ? camp.spent[id] : emptySpend(),
      staff: { communications: this.staff(s, id, ['communications', 'press_secretary']), organisers: this.staff(s, id, ['organiser', 'campaign_manager']), rallies: this.staff(s, id, ['campaign_manager']), press: this.pressStrength(s, id), fundraising: s.parties[id].staff.some((x) => x.role === 'fundraising' && x.personId) },
      scandal: round(this.scandalNow(s, id)), manifesto: el.manifesto[id].map((k) => ({ id: k, name: POLICIES[k].name, kept: gov === id ? promisesKept([k], s.policies) : null })),
    });
    const last = el.history[el.history.length - 1] || null;
    return {
      calendar: cal, phase: cal.phase, governing: gov, parties: PARTY_IDS.map(party), debate: camp?.debate || null,
      pending: Boolean(el.pending && !el.pending.announced), last, history: [...el.history].reverse(),
      scandals: el.scandals.filter((x) => this.day - x.day <= 60).reverse().slice(0, 6), holder: el.holder, channels: E.channels,
    };
  },
};

const SCANDALS = [
  'a donor list that was not meant to be read aloud', 'an expenses claim for a boat that nobody can find', 'a leaked memo about "managing" the polls',
  'a minister caught with a ledger and no explanation', 'a candidate\'s old speech, newly discovered and badly aged', 'a campaign bus that charged the taxpayer for the driver\'s holiday',
  'a staffer who sold the party\'s schedule to a newspaper', 'a contract awarded, on a napkin, to a cousin',
];

function sum(o) { return Object.values(o).reduce((a, v) => a + v, 0); }
function roundAll(o) { return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v])); }
