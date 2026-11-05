// Unrest (v0.97.0): demonstrations, the police response and what you may do about them. Added to the Politics service.
//
// A demonstration is a record (src/politics/unrest.js): a cause (a bloc against a policy in force, the war, or the cuts), a size, an anger, organisers. Each government day it
// may begin (a hash chance that grows with the country's tension), and each active one moves a step: it ends peacefully (most do), is cleared by the police, or escalates into a
// riot. The police response comes from the policies in force and the officers on duty. The visible crowd (the opposition's organiser and press, a couple of officers) appears on the
// Crown Quarter's demonstration ground only while you are there; elsewhere a demonstration is only a record. Nothing here raises Wanted on you: you are never wanted for being there;
// funding it in secret is an illicit offer, recorded and found out like the others. No random draw anywhere.
import { UNREST as U } from '../content/unrest.js';
import { POLICIES } from '../content/policies.js';
import { STAFF_BY_PARTY } from '../content/capital.js';
import { tensionOf, startChance, causeOf, policeLevel, newDemo, stepDemo, hooksOf, unit } from '../politics/unrest.js';
import { INFLUENCE as I } from '../content/influence.js';
import { OTHER_PARTY } from '../politics/model.js';

export const unrestMethods = {
  ensureUnrest(s) {
    if (s.unrest) return s.unrest;
    s.unrest = { v: 1, salt: String(this.g.rng.state), demos: [], history: [], nextId: 1, lastStart: -99, heat: 0, lastDay: this.day - 1 };
    return s.unrest;
  },

  /** What the country's tension is made of, today (read from polls and the books: no hidden number is shown). */
  tensionNow(s, u = this.ensureUnrest(s)) {
    const m = this.budgetNow(s);
    const active = s.policies.filter((p) => p.state === 'active').map((p) => POLICIES[p.key]);
    let dislike = 0;
    for (const p of active) for (const v of Object.values(p.blocs || {})) if (v < 0) dislike = Math.max(dislike, -v / 2);
    return tensionOf({ approval: this.approval(s), deficitRatio: m.deficit / m.revenue, wars: this.wars(), embargoes: this.embargoes(), scandal: this.scandalNow(s, s.government.partyId), dislike, heat: u.heat });
  },

  /** How the police are set to respond today: the level and its name, and how much surveillance helps them see it coming. */
  policing(s) {
    const active = s.policies.filter((p) => p.state === 'active').map((p) => p.key);
    const officers = this.g.police?.activeOfficers?.().length ?? U.police.staffBaseline;
    return { ...policeLevel({ active, officers }), intelligence: active.includes('surveil_up') ? 1 : active.includes('surveil_down') ? -0.5 : 0 };
  },

  activeDemos(s = this.ensure()) { return (s.unrest?.demos || []).filter((d) => d.stage !== 'ended'); },

  /** One government day: demonstrations begin and move on. Idempotent per day (called from governmentStep). */
  unrestStep(s, day) {
    const u = this.ensureUnrest(s);
    const tension = this.tensionNow(s, u);
    const police = this.policing(s);
    // the heat the country feels from what is going on (opinion reads it)
    let heat = u.heat * (1 - U.heat.fade);
    for (const d of this.activeDemos(s)) heat += d.stage === 'riot' ? 0 : U.heat.perDemo * Math.min(1, d.size / 400) * (0.5 + d.anger);
    for (const d of this.activeDemos(s)) {
      const r = stepDemo(d, day, { salt: u.salt, tension, police, intelligence: police.intelligence });
      Object.assign(d, r.demo);
      for (const e of r.events) this.unrestEvent(s, u, d, e, day);
      if (r.events.some((e) => e.kind === 'riot')) heat += U.heat.perRiot;
    }
    u.heat = Math.round(Math.min(U.heat.cap, heat) * 1000) / 1000;
    // a new one?
    if (this.activeDemos(s).length < U.start.max && day - u.lastStart >= U.start.cooldown && unit(`${u.salt}|start|${day}`) < startChance(tension)) {
      const active = s.policies.filter((p) => p.state === 'active').map((p) => POLICIES[p.key]);
      const m = this.budgetNow(s);
      const key = `${u.salt}|new|${u.nextId}`;
      const cause = causeOf(active, key, { wars: this.wars(), deficit: m.deficit / m.revenue });
      const d = newDemo({ id: u.nextId++, day, key, cause, tension });
      u.demos.push(d); u.lastStart = day;
      this.log(s, `A demonstration in Sovereign Square: ${cause.text} (about ${d.size} people).`);
      this.news(`📣 Demonstration in Sovereign Square: ${cause.text}. About ${d.size} people.`, 'verified');
    }
    // keep the record small: the newest, plus anything still going
    u.history = u.history.slice(-U.log);
    const done = u.demos.filter((d) => d.stage === 'ended');
    if (done.length > U.kept) u.demos = u.demos.filter((d) => d.stage !== 'ended' || done.indexOf(d) >= done.length - U.kept);
    u.lastDay = day;
  },

  unrestEvent(s, u, d, e, day) {
    const where = 'in Sovereign Square';
    let text;
    if (e.kind === 'riot') {
      text = `Trouble ${where}: the demonstration (${d.cause.text}) has turned into a riot.`;
      this.news(`🔥 ${text}`, 'verified');
      this.g.bus.emit('politics:riot', { id: d.id });
    } else if (e.kind === 'cleared') {
      text = `The police clear the demonstration ${where} (${d.cause.text}).`;
      this.news(`🚔 ${text}`, 'verified');
    } else if (e.kind === 'ended') {
      text = `The riot ${where} burns out.`;
      this.news(`📰 ${text}`, 'verified');
    } else {
      text = `The demonstration ${where} ends peacefully (${d.cause.text}).`;
    }
    u.history.push({ day, id: d.id, kind: e.kind, text });
    this.log(s, text);
  },

  // ---------------------------------------------------------------- the visible crowd
  /** Every half hour, while you are on the Crown Quarter in the afternoon, the organisers and the press come to the demonstration ground and officers are sent. Never otherwise. */
  crowdTick() {
    const s = this.peek();
    const g = this.g;
    if (!s?.unrest || g.player.map !== 'crown_quarter') return;
    const m = g.clock.minuteOfDay;
    if (m % 30 !== 0 || m < U.crowd.from * 60 || m >= U.crowd.to * 60) return;
    const demos = this.activeDemos(s);
    if (!demos.length) return;
    const map = g.maps.get('crown_quarter');
    const spot = map?.spotPx(U.crowd.spot);
    if (!spot) return;
    const opp = OTHER_PARTY(s.government.partyId);
    const gov = s.government.partyId;
    const who = [STAFF_BY_PARTY[opp]?.organiser, STAFF_BY_PARTY[opp]?.communications, STAFF_BY_PARTY[opp]?.press_secretary, STAFF_BY_PARTY[gov]?.press_secretary].filter(Boolean);
    for (const id of who) { const npc = g.npcs.get(id); if (npc && !npc.pursuit && npc.map === 'crown_quarter') g.sendOnErrand(npc, { spot: `crown_quarter:${U.crowd.spot}`, activity: 'demonstration', minutes: U.crowd.errandMinutes }); }
    const level = this.policing(s).name;
    const want = U.crowd.officers[level] || 0;
    let sent = 0;
    for (const o of (g.police?.activeOfficers?.() || [])) {
      if (sent >= want) break;
      if (o.intent?.source === 'dispatch' || o.pursuit || o.activity === 'sleep') continue;
      g.police.dispatch(o, 'crown_quarter', spot.x, spot.y, null); sent++;
    }
  },

  // ---------------------------------------------------------------- what you may do
  /** An open donation to the organisers: it swells the crowd and sharpens the mood a little; public and recorded. */
  supportDemo(id, amount) {
    const s = this.ensure(); const u = this.ensureUnrest(s); const inf = this.ensureInfluence(s);
    const d = u.demos.find((x) => x.id === id);
    if (!d || d.stage === 'ended') return { ok: false, text: 'That demonstration is over.' };
    amount = Math.floor(Number(amount) || 0);
    const S = U.support;
    if (amount < S.min) return { ok: false, text: `The organisers will take at least ${S.min} obols.` };
    if (d.supported + amount > S.cap) return { ok: false, text: `The organisers cannot take more than ${S.cap.toLocaleString('en-US')} obols from one person for this.` };
    if (this.g.player.money < amount) return { ok: false, text: 'You can\'t afford that.' };
    this.charge(amount);
    d.supported += amount;
    d.size = Math.round(d.size * (1 + (amount / 1000) * S.sizePer / 100));
    d.anger = Math.min(1, Math.round((d.anger + S.angerPer * (amount / S.cap)) * 1000) / 1000);
    this.record(inf, { kind: 'support', party: OTHER_PARTY(s.government.partyId), amount, outcome: 'given', public: true, note: d.cause.text });
    return { ok: true, text: `You gave ${amount.toLocaleString('en-US')} obols to the organisers (${d.cause.text}). It is public and recorded; it will not make the government think better of you.` };
  },

  /** Speak for talks: free, once a day per demonstration; may calm it, may make you look like a meddler. Decided by a hash of the demonstration and the day. */
  speakDemo(id) {
    const s = this.ensure(); const u = this.ensureUnrest(s);
    const d = u.demos.find((x) => x.id === id);
    if (!d || d.stage === 'ended') return { ok: false, text: 'That demonstration is over.' };
    if (d.spoke === this.day) return { ok: false, text: 'You have said your piece today.' };
    d.spoke = this.day;
    const Sp = U.speak;
    const rel = this.standing().relations;
    const p = Math.max(0.1, Math.min(0.85, Sp.base + Sp.perRep * this.repNow() + Sp.perRel * rel));
    const yes = unit(`${u.salt}|speak|${d.id}|${this.day}`) < p;
    if (yes) { d.anger = Math.max(0, Math.round((d.anger + Sp.anger) * 1000) / 1000); this.g.adjustReputation(I.repFaction, Sp.rep); return { ok: true, text: 'You speak for talks and the crowd listens. The mood eases.' }; }
    d.anger = Math.min(1, Math.round((d.anger + Sp.fail) * 1000) / 1000); this.g.adjustReputation(I.repFaction, -Sp.rep);
    return { ok: true, text: 'You speak for talks. Nobody wants a stranger\'s advice: the crowd mutters and you are marked as a meddler.' };
  },

  /** Secret money to the organisers: swells and angers the crowd; recorded as an illicit offer and found out like one. */
  fundDemo(id) {
    const s = this.ensure(); const u = this.ensureUnrest(s); const inf = this.ensureInfluence(s);
    const d = u.demos.find((x) => x.id === id);
    if (!d || d.stage === 'ended') return { ok: false, text: 'That demonstration is over.' };
    if (d.funded) return { ok: false, text: 'You have already paid them.' };
    const F = U.fund;
    if (this.g.player.money < F.price) return { ok: false, text: `They want ${F.price.toLocaleString('en-US')} obols, in cash.` };
    this.charge(F.price);
    d.funded = true; d.size = Math.round(d.size * F.size); d.anger = Math.min(1, Math.round((d.anger + F.anger) * 1000) / 1000);
    inf.heat += F.heat * this.heatFactor();
    this.record(inf, { kind: 'unrest', party: OTHER_PARTY(s.government.partyId), amount: F.price, illicit: true, outcome: 'accepted', public: false, note: d.cause.text });
    return { ok: true, text: `The organisers take ${F.price.toLocaleString('en-US')} obols and say nothing. It is recorded, whether or not anyone ever finds out.` };
  },

  // ---------------------------------------------------------------- views
  /** What the World page's "at home" section shows, and the read-only hooks. */
  unrest() {
    const s = this.ensure(); const u = this.ensureUnrest(s);
    const t = this.tensionNow(s, u); const pol = this.policing(s);
    const el = s.elections?.history?.at(-1);
    const hooks = hooksOf({ approval: this.approval(s), tension: t, heat: u.heat, margin: el ? el.margin : 0, demos: this.activeDemos(s).length, wars: this.wars() });
    const view = (d) => ({ id: d.id, day: d.day, cause: d.cause.text, size: d.size, anger: d.anger, stage: d.stage, organisers: d.organisers, supported: d.supported, funded: d.funded, canSpeak: d.spoke !== this.day, days: this.day - d.day });
    return { tension: Math.round(t * 100) / 100, police: pol.name, active: this.activeDemos(s).map(view), recent: [...u.history].reverse().slice(0, 6), heat: u.heat, hooks, supportCap: U.support.cap, fundPrice: U.fund.price };
  },
};
