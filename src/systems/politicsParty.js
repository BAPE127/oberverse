// Your own party (v0.97.0): the record and what you may do with it. Added to the Politics service.
//
// A foundation, not a destination (src/content/party.js): the record lives in `world.politics.myParty`, never in `parties`, and it is read by nothing in the election or in
// opinion, so it cannot change a result. Its funds come only from what you give it; wages come out of its funds (staff leave when it cannot pay); the registration fee is paid
// to the state (`collectLevy`). One party per player. Its name is checked like a company's, against every company and party name.
import { PARTY as P } from '../content/party.js';
import { POLITICS as POL } from '../content/politics.js';
import { validateName } from '../corp/identity.js';
import { needsOf, considerShare, staffName } from '../politics/party.js';

export const partyMethods = {
  myParty() { return this.peek()?.myParty || null; },

  taken() {
    const a = [...P.name.taken, ...Object.values(POL.parties).flatMap((p) => [p.name, p.short])];
    try { a.push(...this.g.corp.takenNames()); } catch { /* a bare game has no companies */ }
    return a;
  },

  officeTier() { const h = this.g.hq; return h?.owns('tower') ? 'tower' : h?.owns('mid') ? 'mid' : null; },

  /** Found a party record (a name and a colour): one per player. It is not registered until every need is met. */
  foundParty(raw, colour) {
    const s = this.ensure();
    if (s.myParty) return { ok: false, text: `You already lead ${s.myParty.name}. One party each.` };
    const v = validateName(raw, this.taken());
    if (!v.ok) return { ok: false, text: v.error };
    s.myParty = { name: v.name, colour: P.colours.includes(colour) ? colour : P.colours[0], platform: {}, funds: 0, staff: [], paidFee: false, registered: false, foundedDay: this.day, registeredDay: null, log: [], nextStaff: 1 };
    this.partyNote(s.myParty, `${v.name} is founded.`);
    return { ok: true, text: `${v.name} is founded. It is not registered yet: see what it needs.` };
  },

  partyNote(m, text) { m.log.unshift({ day: this.day, text }); m.log = m.log.slice(0, 10); },

  /** Put your own money into the party's funds (its only income). */
  fundParty(amount) {
    const m = this.myParty();
    if (!m) return { ok: false, text: 'You have no party.' };
    amount = Math.floor(Number(amount) || 0);
    if (amount < P.give.min) return { ok: false, text: `Give at least ${P.give.min} obols.` };
    if (this.g.player.money < amount) return { ok: false, text: 'You can\'t afford that.' };
    this.charge(amount); m.funds += amount;
    this.partyNote(m, `You gave the party ${amount.toLocaleString('en-US')} obols.`);
    return { ok: true, text: `${amount.toLocaleString('en-US')} obols are the party's now. They come back only if you disband it.` };
  },

  /** Choose a priority: a stance on an issue (−2 … +2, 0 to drop it). At most four. Each choice pleases some voters and costs you others (see the voters' reaction in the view). */
  setPlatform(issue, stance) {
    const m = this.myParty();
    if (!m) return { ok: false, text: 'You have no party.' };
    if (!POL.issues[issue]) return { ok: false, text: 'No such issue.' };
    stance = Math.max(-2, Math.min(2, Math.round(Number(stance) || 0)));
    const others = Object.entries(m.platform).filter(([k, v]) => v && k !== issue).length;
    if (stance && others >= P.platform.maxIssues) return { ok: false, text: `A platform has at most ${P.platform.maxIssues} priorities.` };
    if (stance) m.platform[issue] = stance; else delete m.platform[issue];
    if (m.registered) return { ok: true, text: 'The platform is changed; the party stays registered.' };
    return { ok: true, text: stance ? `${POL.issues[issue].name}: ${stance > 0 ? 'for' : 'against'}.` : `${POL.issues[issue].name} is no longer a priority.` };
  },

  /** Take someone on: a fee and then a daily wage out of the party's funds. */
  hireStaff(role) {
    const m = this.myParty();
    if (!m) return { ok: false, text: 'You have no party.' };
    const def = P.staff.roles.find((r) => r.id === role);
    if (!def) return { ok: false, text: 'No such role.' };
    if (m.staff.some((x) => x.role === role)) return { ok: false, text: `${def.name} is already filled.` };
    if (m.funds < P.staff.hire) return { ok: false, text: `The party needs ${P.staff.hire.toLocaleString('en-US')} obols in its funds to take someone on.` };
    m.funds -= P.staff.hire;
    const name = staffName(m.nextStaff++, `${this.ensureElections(this.ensure()).salt}|${m.foundedDay}`);
    m.staff.push({ role, name, since: this.day });
    this.partyNote(m, `${name} joins as ${def.name.toLowerCase()}.`);
    return { ok: true, text: `${name} joins as ${def.name.toLowerCase()}: ${P.staff.wage} obols a day from the party's funds.` };
  },

  dismissStaff(role) {
    const m = this.myParty();
    const i = m?.staff.findIndex((x) => x.role === role) ?? -1;
    if (i < 0) return { ok: false, text: 'Nobody holds that role.' };
    const [x] = m.staff.splice(i, 1);
    this.partyNote(m, `${x.name} leaves.`);
    return { ok: true, text: `${x.name} leaves the party's service.` };
  },

  /** The registration fee: paid by you, to the state (its debt falls by it). */
  payFee() {
    const m = this.myParty();
    if (!m) return { ok: false, text: 'You have no party.' };
    if (m.paidFee) return { ok: false, text: 'The fee is paid.' };
    const fee = P.needs.fee;
    if (this.g.player.money < fee) return { ok: false, text: `The fee is ${fee.toLocaleString('en-US')} obols.` };
    this.charge(fee); this.collectLevy(fee, 'party registration'); m.paidFee = true;
    this.partyNote(m, 'The registration fee is paid.');
    return { ok: true, text: `You paid the ${fee.toLocaleString('en-US')} obol registration fee to the state.` };
  },

  /** The founding needs, and whether the party can be registered. */
  partyNeeds() {
    const m = this.myParty();
    return needsOf({ office: this.officeTier(), rep: this.repNow(), platform: m?.platform, staff: m?.staff.length || 0, paidFee: m?.paidFee });
  },

  register() {
    const m = this.myParty();
    if (!m) return { ok: false, text: 'You have no party.' };
    if (m.registered) return { ok: false, text: 'It is registered.' };
    const n = this.partyNeeds();
    if (!n.ready) return { ok: false, text: `${n.total - n.met} of the five needs are still unmet.` };
    m.registered = true; m.registeredDay = this.day;
    this.partyNote(m, 'The party is registered.');
    this.news(`🏳️ ${m.name} is registered as a political party.`, 'verified');
    return { ok: true, text: `${m.name} is registered. It cannot stand in an election yet: that is a later release.` };
  },

  /** Wind it up: what is left in its funds comes back to you (the fee does not). The name is free again. */
  disbandParty() {
    const s = this.ensure(); const m = s.myParty;
    if (!m) return { ok: false, text: 'You have no party.' };
    const back = m.funds;
    this.g.player.money += back; this.g.bus.emit('money:changed', { delta: back, total: this.g.player.money });
    s.myParty = null;
    return { ok: true, text: `The party is wound up. ${back.toLocaleString('en-US')} obols come back to you.` };
  },

  /** Each day: staff are paid out of the party's funds; if it cannot pay, the last hired leaves. Called from the government's day. */
  partyDay(s) {
    const m = s.myParty;
    if (!m) return;
    for (let i = m.staff.length - 1; i >= 0; i--) {
      if (m.funds >= P.staff.wage * (m.staff.length)) break;
      const [x] = m.staff.splice(i, 1);
      this.partyNote(m, `${x.name} leaves: the party could not pay.`);
    }
    m.funds -= Math.min(m.funds, P.staff.wage * m.staff.length);
  },

  /** What the party screen shows. */
  party() {
    const m = this.myParty();
    const needs = this.partyNeeds();
    const issues = Object.entries(POL.issues).map(([id, d]) => ({ id, name: d.name, stance: m?.platform[id] || 0 }));
    return {
      has: Boolean(m), name: m?.name || null, colour: m?.colour || null, registered: Boolean(m?.registered), funds: m?.funds || 0, platform: m?.platform || {}, issues,
      staff: P.staff.roles.map((r) => ({ ...r, held: m?.staff.find((x) => x.role === r.id) || null })), needs, log: m?.log || [],
      consider: m ? considerShare(m.platform) : 0, wage: P.staff.wage, hire: P.staff.hire, fee: P.needs.fee, candidacy: P.candidacy, colours: P.colours,
    };
  },
};
