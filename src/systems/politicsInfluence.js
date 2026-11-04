// Influence (v0.95.0): relationships and access, donations, lobbying, promises, offers and the record of them all. Added to the Politics service.
//
// Fictional game mechanics, with costs. Money, reputation, relationships and political support are four separate things; a door needs the right mix and
// money alone opens none. A donation is public, capped and recorded; it buys support and a hearing (a favour), never a vote. Lobbying costs favours. An offer
// (a bribe) is shown with its price and its odds before any money moves, charged before it resolves, and recorded whatever the outcome; repeats cost more, and
// an official's favours for a term are finite. The record feeds a "heat" that investigators and journalists can find: exposure means a scandal for the recipient's
// party, a fine for you (paid to the state, which reduces its debt), a hit to your reputation and the trust of those you dealt with.
// Every outcome is fixed by a hash of the offer's own number, so a reload can neither repeat an offer nor re-roll it.
import { INFLUENCE as I } from '../content/influence.js';
import { POLICIES } from '../content/policies.js';
import { ESTATE_DEFS } from '../content/estates.js';
import { STAFF_BY_PARTY } from '../content/capital.js';
import { POLITICS as P } from '../content/politics.js';
import { phaseOf, termOf } from '../politics/calendar.js';
import { OTHER_PARTY, PARTY_IDS } from '../politics/model.js';
import { fitOf, inProgress } from '../politics/policy.js';
import { standingScore, tierOf, accessOpen, needsText, priceOf, takeOdds, outcomes, pickOutcome, band, unit, mayAsk } from '../politics/influence.js';

const ESTATE_OF = Object.fromEntries(Object.values(ESTATE_DEFS).map((e) => [e.party, e]));
const FLAGS = ['halver_appointment', ...Object.values(ESTATE_DEFS).map((e) => e.flag)];
const round = (v) => Math.round(v * 100) / 100;
const OUTCOME_TEXT = {
  accepted: 'accepted', half: 'half done', delayed: 'delayed', refused: 'refused', counter: 'a counter-offer', reported: 'reported',
};

export const influenceMethods = {
  /** The influence record (a save from 0.94.x gains it). */
  ensureInfluence(s) {
    if (s.influence) return s.influence;
    s.influence = { nextId: 1, ledger: [], heat: 0, support: { order: 0, liberty: 0 }, favours: { order: 0, liberty: 0 }, donated: {}, used: {}, obligations: [], counters: [], pushes: [], meetings: {}, exposures: 0 };
    return s.influence;
  },

  // ---------------------------------------------------------------- who is who
  /** The people behind the contacts, today (the President and the opposition change with the vote). */
  contactDefs(s = this.ensure()) {
    const gov = s.government.partyId;
    const opp = OTHER_PARTY(gov);
    return Object.entries(I.contacts).map(([key, c]) => {
      const party = c.side === 'gov' ? gov : opp;
      const npcId = key === 'president' ? P.parties[gov].leader : key === 'opposition' ? P.parties[opp].leader : key === 'opposition_chief' ? STAFF_BY_PARTY[opp]?.chief_of_staff : c.id;
      return { ...c, key, party, npcId };
    });
  },
  contact(key, s = this.ensure()) { return this.contactDefs(s).find((c) => c.key === key) || null; },
  npcOf(c) { return this.g.npcs.get(c.npcId) || null; },
  relOf(c) { const npc = this.npcOf(c); return npc ? this.g.relationships.disposition(npc, 'player') : 0; },
  repNow() { return this.g.player.reputation?.[I.repFaction] || 0; },

  /** Your standing: one reading from four things kept apart. */
  standing() {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const cs = this.contactDefs(s);
    const rel = cs.length ? cs.reduce((a, c) => a + Math.max(0, this.relOf(c)), 0) / cs.length : 0;
    const support = Math.max(inf.support.order, inf.support.liberty);
    const rep = this.repNow();
    const score = standingScore({ rep, support, rel, heat: inf.heat });
    const term = termOf(this.day, s.constitution).index;
    return { score: round(score), tier: tierOf(score), rep, support: { ...inf.support }, favours: { ...inf.favours }, relations: round(rel), heat: round(inf.heat), donated: { order: inf.donated[`${term}|order`] || 0, liberty: inf.donated[`${term}|liberty`] || 0 }, cap: I.donation.cap, term };
  },

  // ---------------------------------------------------------------- donations and promises
  /** A donation to a party: public, capped per term, recorded. The money is the party's; it earns support, a hearing (favours) and the leader's trust. */
  donate(partyId, amount) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const D = I.donation;
    amount = Math.floor(Number(amount) || 0);
    if (!PARTY_IDS.includes(partyId)) return { ok: false, text: 'Nobody by that name is standing.' };
    if (amount < D.min) return { ok: false, text: `The smallest donation the party will record is ${D.min} obols.` };
    const key = `${termOf(this.day, s.constitution).index}|${partyId}`;
    const given = inf.donated[key] || 0;
    if (given + amount > D.cap) return { ok: false, text: `Donations are capped at ${D.cap.toLocaleString('en-US')} obols per donor each term. You have given ${given.toLocaleString('en-US')} to ${this.party(partyId).name}.` };
    if (this.g.player.money < amount) return { ok: false, text: 'You can\'t afford that.' };
    this.charge(amount);
    inf.donated[key] = given + amount;
    s.parties[partyId].funds += amount;
    if (s.elections?.campaign && phaseOf(this.day, s.constitution) !== 'term') s.elections.campaign.raised[partyId] += amount;
    inf.support[partyId] += amount / D.supportPer;
    inf.favours[partyId] = Math.min(D.favourCap, inf.favours[partyId] + amount / D.favourPer);
    const leader = this.g.npcs.get(P.parties[partyId].leader);
    if (leader) this.g.relationships.adjust(leader, 'player', { trust: Math.min(D.trustCap, amount / D.trustPer) }, 'donation');
    const entry = this.record(inf, { kind: 'donation', party: partyId, amount, outcome: 'recorded', public: true });
    inf.obligations.push({ id: entry.id, party: partyId, day: this.day, amount, due: this.day + I.obligation.days, status: 'open', extended: false });
    return { ok: true, text: `You gave ${amount.toLocaleString('en-US')} obols to ${this.party(partyId).name}. It is public and recorded. A donation earns a hearing, never a vote.` };
  },

  /** Pay out of your own cash. */
  charge(amount) {
    const g = this.g;
    g.player.money -= amount;
    g.bus.emit('money:changed', { delta: -amount, total: g.player.money });
  },

  record(inf, row) {
    const entry = { id: inf.nextId++, day: this.day, exposed: false, ...row };
    inf.ledger.push(entry);
    while (inf.ledger.length > I.ledger.kept) inf.ledger.shift();
    return entry;
  },

  // ---------------------------------------------------------------- access
  /** The door: open or closed, and what it needs. */
  access(c) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const x = { rel: this.relOf(c), support: inf.support[c.party] || 0, rep: this.repNow() };
    return { open: accessOpen(c, x), needs: needsText(c), x };
  },

  /** Ask for a meeting. Free; may be refused, and a refusal says why. Once a day per person. A meeting is the appointment the door lists ask for. */
  askMeeting(key) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const c = this.contact(key, s);
    if (!c) return { ok: false, text: 'Nobody by that name.' };
    const a = this.access(c);
    if (!a.open) return { ok: false, text: `${this.nameOf(c)}\'s office says there is no space in the diary: it takes ${a.needs}.` };
    if (inf.meetings[key]?.day === this.day) return { ok: inf.meetings[key].ok, text: inf.meetings[key].text };
    const campaign = phaseOf(this.day, s.constitution) !== 'term' ? 0.15 : 0;
    const p = Math.max(0.1, Math.min(0.95, 0.55 + 0.01 * a.x.rel + 0.004 * a.x.support + 0.01 * a.x.rep - campaign - (inf.heat > 6 ? 0.2 : 0)));
    const yes = unit(`${s.elections?.salt || s.pollSalt}|meet|${key}|${this.day}`) < p;
    const why = inf.heat > 6 ? 'There are questions about you, and the diary is full.' : campaign ? 'The campaign has eaten the diary.' : 'The diary is full this week.';
    const res = yes
      ? { ok: true, text: `${this.nameOf(c)} will see you.${c.side === 'gov' ? ' You are on the list at Halver House for two days.' : ' You are expected at the house.'}` }
      : { ok: false, text: `${this.nameOf(c)} cannot see you. ${why}` };
    inf.meetings[key] = { day: this.day, ok: res.ok, text: res.text };
    if (yes) {
      if (c.side === 'gov') this.g.setFlag('halver_appointment', this.day);
      else if (key === 'opposition' && ESTATE_OF[c.party]) this.g.setFlag(ESTATE_OF[c.party].flag, this.day);
      const npc = this.npcOf(c);
      if (npc) this.g.relationships.adjust(npc, 'player', { trust: I.meeting.rel }, 'meeting');
    }
    this.record(inf, { kind: 'meeting', contact: key, party: c.party, amount: 0, outcome: yes ? 'granted' : 'refused', public: false });
    return res;
  },

  nameOf(c) { return this.npcOf(c)?.profile.name || c.role; },

  // ---------------------------------------------------------------- offers
  /** The offers made to a contact in the last two months (they make the next one cost more). */
  repeats(inf, key) { return inf.ledger.filter((e) => e.contact === key && e.kind === 'offer' && e.illicit && this.day - e.day <= I.repeatWindow).length; },

  /** An offer, quoted plainly before any money moves: the request, the price, the odds, and what happens if it is found out. Changes nothing. */
  quote(key, requestId, { policy = null, illicit = false } = {}) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const c = this.contact(key, s);
    const r = I.requests[requestId];
    if (!c || !r) return { ok: false, text: 'No such request.' };
    if (!r.sides.includes(c.side)) return { ok: false, text: 'That is not something they can do.' };
    if (illicit ? !r.illicit : !r.legit) return { ok: false, text: illicit ? 'There is no offer to make for that.' : 'That cannot be asked for openly.' };
    const a = this.access(c);
    if (!a.open) return { ok: false, text: `The door is closed: it takes ${a.needs}.` };
    const def = policy ? POLICIES[policy] : null;
    if (r.needsPolicy && !def) return { ok: false, text: 'Name the policy.' };
    if (def && !mayAsk(c, def)) return { ok: false, text: `${this.nameOf(c)} has nothing to do with ${def.name.toLowerCase()}.` };
    const gov = s.government.partyId;
    if (requestId === 'push') {
      if (s.policies.some((p) => p.key === policy && inProgress(p))) return { ok: false, text: 'It is already in progress.' };
      if (inf.pushes.some((p) => p.policy === policy && p.until >= this.day)) return { ok: false, text: 'The cabinet has already been asked.' };
    }
    if (requestId === 'stall' && !s.policies.some((p) => p.key === policy && ['proposed', 'review', 'approved', 'implementing'].includes(p.state))) return { ok: false, text: 'It is not on its way: there is nothing to delay.' };
    const term = termOf(this.day, s.constitution).index;
    const used = inf.used[`${term}|${key}`] || 0;
    if (used >= c.favours) return { ok: false, text: `${this.nameOf(c)} has no favours left this term.` };
    const repeats = this.repeats(inf, key);
    const price = illicit ? priceOf(r, c, repeats) : 0;
    const favours = illicit ? 0 : r.favours;
    if (!illicit && favours > (inf.favours[c.party] || 0)) return { ok: false, text: `Lobbying costs a favour with ${this.party(c.party).name}, and you have none. A donation earns them.` };
    const fit = def && c.side === 'gov' ? fitOf(s.parties[gov].platform, def) : 0;
    const approval = this.approval(s);
    const pressure = Math.max(0, Math.min(1, (c.side === 'gov' ? (0.5 - approval) * 1.2 : 0) + (phaseOf(this.day, s.constitution) !== 'term' ? 0.2 : 0) + inf.heat / 25));
    const chief = this.contactDefs(s).find((x) => x.side === c.side && (x.key === 'chief' || x.key === 'opposition_chief'));
    const gatekeeper = c.key === chief?.key ? 0 : chief && !this.access(chief).open ? 1 : 0;
    let p = takeOdds({ rel: a.x.rel, support: a.x.support, rep: a.x.rep, repeats, pressure, gatekeeper, favours: inf.favours[c.party] || 0, illicit, contact: c });
    if ((requestId === 'push') && fit < 0) p = 0.06; // never against everything the party stands for
    return {
      ok: true, contact: c, request: r, requestId, policy, policyName: def?.name || null, illicit, price, favours, p: round(p), band: band(p), odds: outcomes(p, illicit), repeats, fit, against: requestId === 'push' && fit < 0,
      found: illicit ? 'If it is found out: an investigation, a scandal for them, a fine of twice the sum and your name in the papers.' : null,
      text: `${r.name}${def ? `: ${def.name}` : ''}`,
    };
  },

  /** Make the offer. Charged first, recorded whatever the outcome, resolved by a hash of its number. */
  offer(key, requestId, opts = {}) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const q = this.quote(key, requestId, opts);
    if (!q.ok) return q;
    const { contact: c, request: r, illicit } = q;
    if (illicit && this.g.player.money < q.price) return { ok: false, text: `You haven\'t got ${q.price.toLocaleString('en-US')} obols.` };
    const id = inf.nextId;
    if (illicit) this.charge(q.price);
    else inf.favours[c.party] = Math.max(0, inf.favours[c.party] - q.favours);
    const term = termOf(this.day, s.constitution).index;
    const roll = unit(`${s.elections?.salt || s.pollSalt}|offer|${id}`);
    const o = pickOutcome(q.odds, roll);
    const entry = this.record(inf, { kind: 'offer', contact: key, party: c.party, request: requestId, policy: q.policy, amount: q.price, illicit, outcome: o, public: false });
    if (illicit) inf.heat += I.heat.illicit + (o === 'reported' ? I.heat.reported : 0);
    let note = '';
    if (['accepted', 'half', 'delayed'].includes(o)) {
      inf.used[`${term}|${key}`] = (inf.used[`${term}|${key}`] || 0) + 1;
      note = this.apply(s, inf, c, requestId, q.policy, o);
    } else if (o === 'counter') {
      const price = illicit ? Math.round((q.price * I.split.counterRise) / 100) * 100 : 0;
      inf.counters.push({ id: entry.id, contact: key, request: requestId, policy: q.policy, illicit, price, favours: illicit ? 0 : q.favours + 1, until: this.day + I.split.counterDays });
      note = illicit ? `They want ${price.toLocaleString('en-US')} instead. The offer stands for ${I.split.counterDays} days.` : 'They would do it for one more favour. The offer stands for three days.';
    } else if (o === 'reported') {
      this.expose(s, inf, entry, 'reported');
      note = 'They reported it.';
    }
    const who = this.nameOf(c);
    const text = o === 'accepted' ? `${who} agrees. ${note}` : o === 'half' ? `${who} will do part of it. ${note}` : o === 'delayed' ? `${who} will see to it, in time. ${note}` : o === 'counter' ? `${who}: "Not at that price." ${note}` : o === 'reported' ? `${who} has reported you. ${note}` : `${who} refuses.`;
    return { ok: true, outcome: o, label: OUTCOME_TEXT[o], text: `${text}${illicit ? ' (It is recorded, whether it works or not.)' : ''}`.trim(), price: q.price, entry };
  },

  /** Accept a counter-offer: charged at its new price, and it resolves as agreed (no second roll). */
  acceptCounter(id) {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const k = inf.counters.find((x) => x.id === id);
    if (!k || k.until < this.day) return { ok: false, text: 'That offer has lapsed.' };
    const c = this.contact(k.contact, s);
    if (!c) return { ok: false, text: 'They are gone.' };
    if (k.illicit && this.g.player.money < k.price) return { ok: false, text: `You haven\'t got ${k.price.toLocaleString('en-US')} obols.` };
    if (!k.illicit && (inf.favours[c.party] || 0) < k.favours) return { ok: false, text: 'You have not the favours.' };
    inf.counters = inf.counters.filter((x) => x !== k);
    if (k.illicit) this.charge(k.price); else inf.favours[c.party] -= k.favours;
    const term = termOf(this.day, s.constitution).index;
    inf.used[`${term}|${k.contact}`] = (inf.used[`${term}|${k.contact}`] || 0) + 1;
    if (k.illicit) inf.heat += I.heat.illicit;
    const entry = this.record(inf, { kind: 'offer', contact: k.contact, party: c.party, request: k.request, policy: k.policy, amount: k.price, illicit: k.illicit, outcome: 'accepted', public: false, counter: true });
    const note = this.apply(s, inf, c, k.request, k.policy, 'accepted');
    return { ok: true, outcome: 'accepted', label: 'accepted', text: `${this.nameOf(c)} agrees at the new price. ${note}`, price: k.price, entry };
  },

  /** What an accepted request does. Only what exists: a policy asked of the cabinet, a delay, a story given less attention or more. */
  apply(s, inf, c, requestId, policy, outcome) {
    const day = this.day;
    const k = outcome === 'accepted' ? 1 : outcome === 'half' ? 0.5 : 1;
    const wait = outcome === 'delayed' ? 7 : 0;
    if (requestId === 'push') {
      inf.pushes.push({ policy, from: day + wait, until: day + wait + 21, bonus: k * 2.2, by: c.key });
      this.log(s, `${POLICIES[policy].name} has been put to the cabinet by someone with a hearing.`);
      return `The cabinet will weigh "${POLICIES[policy].name}" at its next window${wait ? ' after next week' : ''}${outcome === 'half' ? ' (with less weight than you hoped)' : ''}.`;
    }
    if (requestId === 'stall') {
      const days = outcome === 'half' ? 7 : 14;
      for (const p of s.policies.filter((q) => q.key === policy && ['proposed', 'review', 'approved', 'implementing'].includes(q.state))) { p.since += days; p.note = `delayed ${days} days at a request`; }
      this.log(s, `${POLICIES[policy].name} is delayed.`);
      return `"${POLICIES[policy].name}" waits ${days} more days.`;
    }
    if (requestId === 'quiet') {
      const el = this.ensureElections(s);
      const target = [...el.scandals].reverse().find((x) => x.party === c.party && !x.quieted);
      if (!target) return 'There is nothing to keep quiet at the moment; they take the money anyway.';
      target.quieted = true; target.attention = round(target.attention * (outcome === 'half' ? 0.8 : 0.5));
      return 'The story gets less attention.';
    }
    if (requestId === 'leak') {
      const el = this.ensureElections(s);
      const target = OTHER_PARTY(c.party);
      const sev = outcome === 'half' ? 0.2 : 0.35;
      this.addScandal(s, el, { party: target, day: day + wait, severity: sev, credibility: 0.55, attention: 0.7, source: 'leak', text: 'a leaked file nobody will own, and everybody has read' });
      return 'The story is out. Nobody says where it came from.';
    }
    return '';
  },

  // ---------------------------------------------------------------- the daily step
  /** Heat fades; donors' expectations come due; the investigators may find something; appointments lapse. Idempotent per day (called once per government day). */
  influenceStep(s, day) {
    const inf = this.ensureInfluence(s);
    inf.heat = Math.max(0, inf.heat - I.heat.decay);
    inf.pushes = inf.pushes.filter((p) => p.until >= day);
    inf.counters = inf.counters.filter((c) => c.until >= day);
    for (const o of inf.obligations.filter((x) => x.status === 'open' && x.due <= day)) this.settle(s, inf, o, day);
    inf.obligations = inf.obligations.filter((o) => o.status === 'open' || day - o.due < 30);
    if (inf.heat >= I.heat.exposeFrom) {
      const p = Math.min(I.heat.cap, (inf.heat - I.heat.exposeFrom + 1) * I.heat.chancePer);
      const entry = inf.ledger.find((e) => e.illicit && !e.exposed);
      if (entry && unit(`${s.elections?.salt || s.pollSalt}|expose|${day}`) < p) this.expose(s, inf, entry, 'investigators');
    }
  },

  /** A donor's expectation comes due: honoured (the favour stays), delayed once, reinterpreted (half the favour) or broken (the favour is gone and the leader's trust with you drops). Keyed by the donation. */
  settle(s, inf, o, day) {
    const u = unit(`${s.elections?.salt || s.pollSalt}|promise|${o.id}`);
    const gov = o.party === s.government.partyId;
    const honour = 0.55 + (gov ? 0.1 : 0) - Math.min(0.2, o.amount / 400000);
    if (u < honour) { o.status = 'honoured'; return; }
    if (u < honour + 0.15 && !o.extended) { o.extended = true; o.due = day + I.obligation.extend; return; }
    if (u < honour + 0.3) { o.status = 'reinterpreted'; inf.favours[o.party] = Math.max(0, inf.favours[o.party] * 0.5); return; }
    o.status = 'broken';
    inf.favours[o.party] = Math.max(0, inf.favours[o.party] - o.amount / I.donation.favourPer);
    const leader = this.g.npcs.get(P.parties[o.party].leader);
    if (leader) this.g.relationships.adjust(leader, 'player', { trust: -4 }, 'broken promise');
    this.news(`🗞️ ${this.party(o.party).name} are said to have forgotten a donor. It is not the first time.`);
  },

  /** An offer comes out: a scandal for the recipient's party, a fine for you (paid to the state), a hit to your reputation and the trust of those you dealt with. */
  expose(s, inf, entry, how) {
    const el = this.ensureElections(s);
    entry.exposed = true; inf.exposures++;
    const E = I.exposure;
    const taken = ['accepted', 'half', 'delayed'].includes(entry.outcome);
    this.addScandal(s, el, { party: entry.party, day: this.day, severity: taken ? E.severity.taken : E.severity.tried, credibility: 1, attention: E.attention, source: 'exposure', text: `an offer to ${this.nameOf(this.contact(entry.contact, s) || { role: 'an official' })} comes out: "${I.requests[entry.request]?.name || 'a favour'}"` });
    const fine = Math.max(E.fineMin, entry.amount * E.fineTimes);
    const paid = Math.min(fine, Math.max(0, this.g.player.money));
    if (paid > 0) { this.charge(paid); s.budget.debt = Math.max(0, s.budget.debt - paid / 1000); }
    this.g.adjustReputation(I.repFaction, -E.repLoss * (paid < fine ? 1.5 : 1));
    for (const c of this.contactDefs(s)) { const npc = this.npcOf(c); if (npc && c.key === entry.contact) this.g.relationships.adjust(npc, 'player', { trust: -E.trustLoss, suspicion: 8 }, 'exposed'); }
    inf.heat *= I.heat.after;
    this.log(s, `Investigators found an offer: ${how}.`);
    this.news(`🔎 ${how === 'reported' ? 'An official reported an offer' : 'Investigators have found an offer'} made to ${this.nameOf(this.contact(entry.contact, s) || { role: 'a minister' })}. A fine of ${paid.toLocaleString('en-US')} obols has been paid to the state. The party concerned says it knew nothing.`);
  },

  /** Appointments and invitations made by meetings lapse after a couple of days (the steward's own invitations, set once, stay). */
  expireAppointments() {
    for (const f of FLAGS) {
      const v = this.g.getFlag(f);
      if (typeof v === 'number' && this.day - v > I.meeting.daysOpen) this.g.setFlag(f, false);
    }
  },

  /** The bonus the cabinet gives a policy it has been lobbied for (read by the cabinet's score). */
  pushBonus(s) {
    const out = {};
    for (const p of this.ensureInfluence(s).pushes) if (p.from <= this.day && p.until >= this.day) out[p.policy] = Math.max(out[p.policy] || 0, p.bonus);
    return out;
  },

  // ---------------------------------------------------------------- views
  /** What the Influence page shows. */
  influence() {
    const s = this.ensure();
    const inf = this.ensureInfluence(s);
    const term = termOf(this.day, s.constitution).index;
    const rows = this.contactDefs(s).map((c) => {
      const a = this.access(c);
      const requests = Object.entries(I.requests).filter(([, r]) => r.sides.includes(c.side)).map(([id, r]) => ({ id, name: r.name, blurb: r.blurb, legit: r.legit, illicit: r.illicit, needsPolicy: Boolean(r.needsPolicy) }));
      return { key: c.key, npcId: c.npcId, name: this.nameOf(c), role: c.role, party: c.party, side: c.side, open: a.open, needs: a.needs, likes: c.likes, favoursLeft: c.favours - (inf.used[`${term}|${c.key}`] || 0), requests, rel: Math.round(a.x.rel) };
    });
    return {
      standing: this.standing(), contacts: rows, ledger: [...inf.ledger].reverse().slice(0, 12), counters: inf.counters.map((k) => ({ ...k, contactName: this.nameOf(this.contact(k.contact, s) || { role: '?' }), policyName: k.policy ? POLICIES[k.policy].name : null })),
      obligations: inf.obligations.filter((o) => o.status === 'open'), pushes: inf.pushes.filter((p) => p.until >= this.day), exposures: inf.exposures,
    };
  },

  /** Policies that may be asked of a contact (for the offer screen). */
  askable(key, requestId) {
    const s = this.ensure();
    const c = this.contact(key, s);
    if (!c) return [];
    return Object.values(POLICIES).filter((p) => mayAsk(c, p)).filter((p) => (requestId === 'push' ? !s.policies.some((q) => q.key === p.id && inProgress(q)) : s.policies.some((q) => q.key === p.id && ['proposed', 'review', 'approved', 'implementing'].includes(q.state))));
  },
};
