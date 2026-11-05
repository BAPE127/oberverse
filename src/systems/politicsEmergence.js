// Emergence (v0.97.0): optional offers that turn up because of the world, a weekly forecast or opinion piece, and truth labels on every politics news item. Added to the Politics service.
//
// Nothing is mandatory and nothing gates any system. An offer is a condition on the world (a farm inspection fee and a farm of yours; a Space Office customer and an aerospace
// firm; a scandal; a warm country; a demonstration), shown with the person who asks and the way to answer; an unanswered one ends, with a reason, when its time is up or the world
// moves on. Rewards are reputation, trust and a country's regard: never cash. Every chance is a hash (no random draw). News carries a truth label: verified, alleged, forecast or opinion.
import { EMERGENCE as EM } from '../content/emergence.js';
import { POLICIES } from '../content/policies.js';
import { INFLUENCE as I } from '../content/influence.js';
import { PARTY_IDS } from '../politics/model.js';
import { unit } from '../politics/diplomacy.js';
import { bandOf } from '../politics/diplomacy.js';

const TRUTH = { verified: '✔ verified', alleged: '❓ alleged', forecast: '📈 forecast', opinion: '💬 opinion' };
const fill = (t, p) => t.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '');

export const emergenceMethods = {
  /** Put a truth label on a news line. */
  labelled(text, truth = 'verified') { return `${TRUTH[truth] || TRUTH.verified} · ${text}`; },

  ensureEmergence(s) {
    if (s.emergence) return s.emergence;
    s.emergence = { v: 1, offers: [], nextId: 1, last: {}, lastNews: -99 };
    return s.emergence;
  },

  /** Does the world say this offer should exist now? Returns the parameters for its text, or null. */
  emergenceCheck(tpl, s) {
    const g = this.g;
    if (tpl === 'farmer_fee') return this.fx().farmFee > 0 && (g.farm?.owned?.().length || 0) > 0 ? {} : null;
    if (tpl === 'contractor_meeting') return g.aero?.owned && this.contact('npc_min_defence', s) ? {} : null;
    if (tpl === 'journalist_lead') {
      const el = this.ensureElections(s);
      const sc = el.scandals.filter((x) => this.day - x.day <= 20 && !x.leadTold).sort((a, b) => b.severity * b.credibility - a.severity * a.credibility)[0];
      return sc && sc.severity * sc.credibility * sc.attention > 0.12 ? { party: this.party(sc.party).name, scandal: sc.id } : null;
    }
    if (tpl === 'embassy_talks') {
      const d = s.diplomacy;
      const ms = g.world.market;
      if (!d || !ms) return null;
      const c = Object.entries(d.relations).filter(([id, r]) => r.score >= 12 && !ms.countries[id]?.embargo && !ms.wars.some((w) => w.a === 'sund' || w.b === 'sund')).sort((a, b) => b[1].score - a[1].score || (a[0] < b[0] ? -1 : 1))[0];
      return c ? { country: this.name(c[0]), id: c[0] } : null;
    }
    if (tpl === 'organisers_invite') {
      const d = this.activeDemos(s).find((x) => x.stage !== 'riot');
      return d ? { cause: d.cause.text, demo: d.id } : null;
    }
    return null;
  },

  /** Has an accepted offer been answered? (Looks at what you have done since it was made.) */
  emergenceDone(o, s) {
    const inf = s.influence;
    if (!inf) return false;
    const since = (e) => e.day >= o.day;
    if (o.tpl === 'farmer_fee') return inf.ledger.some((e) => e.kind === 'offer' && e.contact === 'npc_min_agriculture' && e.request === 'push' && e.policy === 'farm_down' && since(e));
    if (o.tpl === 'contractor_meeting') return inf.ledger.some((e) => e.kind === 'meeting' && e.contact === 'npc_min_defence' && e.outcome === 'granted' && since(e));
    if (o.tpl === 'organisers_invite') { const d = s.unrest?.demos.find((x) => x.id === o.params.demo); return Boolean(d && (d.spoke >= o.day || d.supported > 0)); }
    return false;
  },

  reward(o, kind = 'good') {
    const R = EM.reward;
    const g = this.g;
    g.adjustReputation(I.repFaction, kind === 'good' ? R.rep : 0);
    if (o.tpl === 'contractor_meeting' || o.tpl === 'farmer_fee') { const npc = g.npcs.get(o.tpl === 'farmer_fee' ? 'npc_min_agriculture' : 'npc_min_defence'); if (npc) g.relationships.adjust(npc, 'player', { trust: R.trust }, 'emergence'); }
  },

  /** The weekly step: offers end (answered, or with a stated reason); a new one may turn up; a forecast or opinion piece may be written. Idempotent per day (hash-only). */
  emergenceStep(s, day) {
    const e = this.ensureEmergence(s);
    for (const o of e.offers.filter((x) => x.state === 'open' || x.state === 'accepted')) {
      const def = EM.templates[o.tpl];
      if (o.state === 'accepted' && this.emergenceDone(o, s)) { o.state = 'done'; o.reason = def.done; this.reward(o); continue; }
      const live = this.emergenceCheck(o.tpl, s);
      if (!live) { o.state = 'expired'; o.reason = def.gone; continue; }
      if (day > o.expires) { o.reason = o.state === 'accepted' ? 'You did not get to it in time.' : 'Nobody waits for ever: the moment has passed.'; o.state = 'expired'; }
    }
    if (day % EM.every === EM.offset && e.offers.filter((x) => x.state === 'open' || x.state === 'accepted').length < EM.maxOpen) {
      for (const tpl of Object.keys(EM.templates).sort()) {
        if (e.offers.filter((x) => x.state === 'open' || x.state === 'accepted').length >= EM.maxOpen) break;
        if (day - (e.last[tpl] ?? -999) < EM.cooldown) continue;
        const params = this.emergenceCheck(tpl, s);
        if (!params || unit(`${this.ensureElections(s).salt}|emergence|${tpl}|${day}`) >= EM.chance) continue;
        e.offers.push({ id: e.nextId++, tpl, day, expires: day + EM.expiresIn, state: 'open', params, reason: null });
        e.last[tpl] = day;
      }
    }
    e.offers = e.offers.filter((o) => o.state === 'open' || o.state === 'accepted' || day - o.day < 60).slice(-EM.kept - 4);
    if (day % EM.news.every === EM.news.offset) this.weeklyNews(s, e, day);
  },

  /** At most one forecast or opinion piece a week, and only when there is something to say. */
  weeklyNews(s, e, day) {
    const salt = this.ensureElections(s).salt;
    const m = this.budgetNow(s);
    const cands = [];
    if (m.deficit / m.revenue > 0.1) cands.push({ truth: 'forecast', text: `Treasury officials expect the month to close ${Math.round(m.deficit)}k in deficit; the debt stands at ${Math.round(s.budget.debt)}k.` });
    const cal = this.calendar();
    const latest = s.polls[s.polls.length - 1];
    if (cal.phase === 'campaign' && latest) { const lead = latest.results.order - latest.results.liberty; cands.push({ truth: 'forecast', text: `With ${cal.daysToPolling} days to the vote, ${Math.abs(lead) < latest.margin ? 'the race is within the polls\' margin of error' : `${this.party(lead > 0 ? 'order' : 'liberty').name} lead the latest poll`}.` }); }
    const active = s.policies.filter((p) => p.state === 'active');
    if (active.length) { const p = active[Math.floor(unit(`${salt}|col|${day}`) * active.length)]; cands.push({ truth: 'opinion', text: EM.columnists[Math.floor(unit(`${salt}|colt|${day}`) * EM.columnists.length)].replace('{policy}', POLICIES[p.key].name) }); }
    if (!cands.length || unit(`${salt}|newsday|${day}`) > 0.8) return;
    const c = cands[Math.floor(unit(`${salt}|newspick|${day}`) * cands.length)];
    this.news(c.text, c.truth);
    e.lastNews = day;
  },

  // ---------------------------------------------------------------- answering
  acceptOffer(id) {
    const s = this.ensure(); const e = this.ensureEmergence(s);
    const o = e.offers.find((x) => x.id === id);
    if (!o || o.state !== 'open') return { ok: false, text: 'That offer has passed.' };
    const def = EM.templates[o.tpl];
    if (def.kind === 'choice') return { ok: false, text: 'Choose yes or no.' };
    o.state = 'accepted'; o.day = this.day; o.expires = this.day + EM.expiresIn;
    return { ok: true, text: `Noted. ${def.where || ''}` };
  },

  declineOffer(id) {
    const s = this.ensure(); const e = this.ensureEmergence(s);
    const o = e.offers.find((x) => x.id === id);
    if (!o || (o.state !== 'open' && o.state !== 'accepted')) return { ok: false, text: 'That offer has passed.' };
    o.state = 'declined'; o.reason = 'You said no, and nothing came of it.';
    return { ok: true, text: 'You said no. That is allowed.' };
  },

  /** A "choice" offer: yes does the thing at once. */
  answerOffer(id, yes) {
    const s = this.ensure(); const e = this.ensureEmergence(s);
    const o = e.offers.find((x) => x.id === id);
    if (!o || o.state !== 'open') return { ok: false, text: 'That offer has passed.' };
    const def = EM.templates[o.tpl];
    if (def.kind !== 'choice') return { ok: false, text: 'That one is answered where it happens.' };
    if (!yes) return this.declineOffer(id);
    if (!this.emergenceCheck(o.tpl, s)) { o.state = 'expired'; o.reason = def.gone; return { ok: false, text: def.gone }; }
    let text;
    if (o.tpl === 'journalist_lead') {
      const el = this.ensureElections(s);
      const sc = el.scandals.find((x) => x.id === o.params.scandal);
      if (sc) { sc.attention = Math.min(1, Math.round((sc.attention + 0.1) * 100) / 100); sc.leadTold = true; }
      this.news(`A journalist has a document that, if genuine, touches ${o.params.party}. It has not been checked.`, 'alleged');
      this.reward(o); text = def.done;
    } else if (o.tpl === 'embassy_talks') {
      const d = this.ensureDiplomacy(s); const rel = d.relations[o.params.id];
      const ok = unit(`${d.salt}|talks|${o.id}`) < Math.max(0.35, Math.min(0.9, 0.7 + 0.01 * this.repNow()));
      if (rel) rel.bonus = (rel.bonus || 0) + (ok ? EM.reward.regard : -3);
      if (ok) this.reward(o, 'good');
      text = fill(ok ? def.done : def.fail, { country: o.params.country });
    }
    o.state = 'done'; o.reason = text;
    return { ok: true, text };
  },

  /** What the Overview's "for you" list shows. */
  emergence() {
    const s = this.ensure(); const e = this.ensureEmergence(s);
    const row = (o) => { const def = EM.templates[o.tpl]; return { id: o.id, icon: def.icon, title: def.title, text: fill(def.text, o.params), kind: def.kind, yes: def.yes || null, no: def.no || null, where: def.where || null, state: o.state, daysLeft: Math.max(0, o.expires - this.day), reason: o.reason }; };
    return { open: e.offers.filter((o) => o.state === 'open' || o.state === 'accepted').map(row), recent: e.offers.filter((o) => !['open', 'accepted'].includes(o.state)).slice(-4).reverse().map(row) };
  },
};
