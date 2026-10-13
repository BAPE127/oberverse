// Dialogue engine: authored, condition-driven, topic-based conversations.
// No external AI. Characters respond from authored lines, structured
// personality data and what they actually know. See docs/DIALOGUE.md.
import { check } from '../sim/conditions.js';
import { remember } from '../sim/memory.js';
import { interpolate, clamp } from '../core/util.js';
import { hashString } from '../core/rng.js';

const RECENT_LINES = 10;
export const STATS = ['charm', 'wits', 'grit', 'finesse'];

export class DialogueSession {
  constructor(game, npcId) {
    this.game = game;
    this.npc = game.npcs.get(npcId);
    this.profile = this.npc.profile;
    this.dlg = game.content.dialogues[this.profile.dialogue] || { greetings: [], topics: [] };
    this.mode = 'menu';
    this.currentTopic = null;
    this.ended = false;
  }

  // ------------------------------------------------------------ text utils
  vars() {
    const g = this.game;
    const pun = g.dailyPun ? g.dailyPun() : {};
    const pol = g.police;
    return { player: g.player.name, name: this.profile.shortName, time: g.clock.timeString, day: g.clock.weekday, pun: pun.setup, punchline: pun.punchline, bribe: pol?.bribePrice(), fine: pol?.finePrice(), bribedUntil: g.world.police?.bribedUntilDay, record: g.world.police?.record ?? 0, ...this.gangVars() };
  }

  /** Order details for customers; tribute for Arthur. */
  gangVars() {
    const g = this.game;
    if (!g.gang) return {};
    const c = g.gang.customer(this.npc.id);
    const o = c?.order;
    const f = g.factory;
    const fx = f ? { made: f.state.made, smallPrice: g.content.deliveries?.small?.price, largePrice: g.content.deliveries?.large?.price, contract: f.state.contract ? g.content.deliveries[f.state.contract].name.toLowerCase() : 'none', deliveryTo: f.deliveryTarget() ? f.def(f.deliveryTarget()).name : 'your warehouse' } : {};
    const a = g.arms;
    const st = a?.state.staff.find((x) => x.id === this.npc.id);
    if (a) Object.assign(fx, { lucasBudget: a.lucasBudgetLeft() });
    if (st) Object.assign(fx, { staffMain: st.main, staffWage: st.wage, staffMorale: Math.round(st.morale), staffQuirk: st.quirk ? a.cfg.quirks[st.quirk].name : 'none', staffStation: st.assigned ? a.cfg.stations[a.findEntity(st.assigned)?.kind]?.name || 'nothing' : 'nothing' });
    const out = { ...fx, tribute: g.gang.tributePrice(), anger: g.world.gang?.anger ?? 0, truceUntil: g.world.gang?.truceUntilDay ?? 0 };
    if (o) Object.assign(out, { orderQty: o.qty, orderName: g.content.items[`item_calc_${o.type}`]?.name, orderPrice: o.price, orderTotal: o.qty * o.price });
    if (this.profile.customer) out.favourite = g.content.items[`item_calc_${this.profile.customer.favourite}`]?.name;
    return out;
  }

  /** Resolve a "say" (array of pages; pages may be conditional objects). Runs page effects. */
  say(pages, out) {
    for (const page of pages || []) {
      if (typeof page === 'string') out.pages.push(interpolate(page, this.vars()));
      else if (check(page.if, this.game, this.npc)) {
        if (page.text) out.pages.push(interpolate(page.text, this.vars()));
        if (page.effects) this.effects(page.effects, out);
      }
    }
  }

  /** Pick one of several alternative "says", avoiding recently used lines. */
  pickVariant(variants) {
    if (!variants?.length) return [];
    const recent = this.npc.recentLines || (this.npc.recentLines = []);
    const keyed = variants.map((v) => ({ v, k: hashString(JSON.stringify(v)) }));
    const fresh = keyed.filter((x) => !recent.includes(x.k));
    const chosen = fresh.length ? fresh[Math.floor(this.game.rng.next() * fresh.length)] : keyed[Math.floor(this.game.rng.next() * keyed.length)];
    recent.push(chosen.k);
    if (recent.length > RECENT_LINES) recent.shift();
    return chosen.v;
  }

  effects(list, out) {
    const res = this.game.applyEffects(list, this.npc);
    for (const a of res.actions) {
      if (a.type === 'end') out.end = true;
      else out.action = a;
    }
  }

  node(extra = {}) {
    return {
      speaker: { id: this.npc.id, name: this.profile.shortName, fullName: this.profile.name },
      pages: [],
      options: [],
      action: null,
      end: false,
      mood: this.game.moodOf(this.npc),
      relation: this.game.relationships.label(this.npc, 'player'),
      ...extra,
    };
  }

  // ----------------------------------------------------------------- flow
  start() {
    const g = this.game;
    const out = this.node();
    const entry = (this.dlg.greetings || []).find((gr) => check(gr.if, g, this.npc));
    if (entry) {
      this.say(entry.variants ? this.pickVariant(entry.variants) : entry.say, out);
      if (entry.effects) this.effects(entry.effects, out);
    } else {
      out.pages.push(`${this.profile.shortName} nods at you.`);
    }
    if (!this.npc.met) {
      this.npc.met = true;
      remember(this.npc, { text: `Met ${g.player.name}.`, tag: 'met_player', about: 'player', importance: 5 }, g.clock.total);
    }
    this.npc.lastTalkedAt = g.clock.total;
    g.bus.emit('npc:talked', { npcId: this.npc.id });
    return this.finish(out);
  }

  finish(out) {
    if (out.end) {
      this.ended = true;
      out.options = [];
      return out;
    }
    if (!out.options.length) out.options = this.menuOptions();
    return out;
  }

  availableTopics() {
    const used = this.npc.topicsUsed || {};
    return (this.dlg.topics || []).filter((t) => !(t.once && used[t.id]) && check(t.if, this.game, this.npc));
  }

  menuOptions() {
    this.mode = 'menu';
    const opts = this.availableTopics().map((t) => ({ id: `topic:${t.id}`, label: interpolate(t.label, this.vars()), tag: t.tag || null, fresh: !(this.npc.topicsUsed || {})[t.id] }));
    if (this.profile.mechanics?.gossipBroker) opts.push({ id: 'gossip', label: '"Heard anything interesting?"', tag: 'gossip' });
    if (this.giftables().length) opts.push({ id: 'gift', label: 'Give a gift…', tag: 'gift' });
    opts.push({ id: 'ask', label: 'Ask about…', tag: 'ask' });
    opts.push({ id: 'bye', label: 'Goodbye.', tag: 'bye' });
    return opts;
  }

  choose(optionId) {
    if (this.ended) return null;
    const out = this.node();
    if (optionId === 'bye') return this.farewell(out);
    if (optionId === 'back') return this.finish(out);
    if (optionId === 'gift') return this.giftMenu(out);
    if (optionId === 'ask') {
      out.input = 'ask';
      out.pages.push(this.pickVariant(this.dlg.askPrompt || [['What do you want to know about?']])[0]);
      out.options = [{ id: 'back', label: 'Never mind.' }];
      return out;
    }
    if (optionId === 'gossip') return this.gossipMenu(out);
    if (optionId.startsWith('gift:')) return this.giveGift(optionId.slice(5), out);
    if (optionId.startsWith('tell:')) return this.tellFact(optionId.slice(5), out);
    if (optionId.startsWith('topic:')) return this.runTopic(optionId.slice(6), out);
    if (optionId.startsWith('choice:')) return this.runChoice(optionId.slice(7), out);
    return this.finish(out);
  }

  farewell(out) {
    const entry = (this.dlg.farewells || []).find((f) => check(f.if, this.game, this.npc));
    if (entry) this.say(entry.variants ? this.pickVariant(entry.variants) : entry.say, out);
    out.end = true;
    this.ended = true;
    return out;
  }

  topicById(id) {
    return (this.dlg.topics || []).find((t) => t.id === id) || null;
  }

  runTopic(id, out) {
    const t = this.topicById(id);
    if (!t || !check(t.if, this.game, this.npc)) {
      out.pages.push('...');
      return this.finish(out);
    }
    const used = this.npc.topicsUsed || (this.npc.topicsUsed = {});
    const repeat = used[id] && t.repeat;
    used[id] = (used[id] || 0) + 1;
    this.say(repeat ? this.pickVariant(t.repeat) : t.variants ? this.pickVariant(t.variants) : t.say, out);
    if (!repeat || t.effectsOnRepeat) this.effects(t.effects, out);
    if (t.end) out.end = true;
    if (t.choices && !out.end) {
      this.currentTopic = t;
      out.options = this.choiceOptions(t);
    }
    return this.finish(out);
  }

  successChance(chk) {
    const g = this.game;
    const statVal = g.stat ? g.stat(chk.stat) : g.player.stats[chk.stat] ?? 2;
    let p = (chk.base ?? 0.4) + (statVal - 2) * 0.08;
    const rel = g.relationships.get(this.npc, 'player');
    for (const [dim, k] of Object.entries(chk.relScale || {})) p += (rel[dim] || 0) * k;
    p += g.moodModifier(this.npc);
    for (const m of chk.mods || []) if (check(m.if, g, this.npc)) p += m.add;
    return clamp(p, 0.05, 0.95);
  }

  choiceOptions(t) {
    const opts = [];
    for (const c of t.choices) {
      if (c.if && !check(c.if, this.game, this.npc)) continue;
      const locked = c.require && !check(c.require, this.game, this.npc);
      let label = interpolate(c.label, this.vars());
      if (c.check && !locked) label += ` [${cap(c.check.stat)} ${Math.round(this.successChance(c.check) * 100)}%]`;
      opts.push({ id: `choice:${c.id}`, label, disabled: Boolean(locked), hint: locked ? c.lockedHint || 'Not available.' : null, tag: c.check ? 'check' : null });
    }
    opts.push({ id: 'back', label: t.backLabel || 'Something else…' });
    return opts;
  }

  runChoice(choiceId, out) {
    const t = this.currentTopic;
    const c = t?.choices?.find((x) => x.id === choiceId);
    if (!c || (c.if && !check(c.if, this.game, this.npc)) || (c.require && !check(c.require, this.game, this.npc))) return this.finish(out);
    let success = true;
    if (c.check) {
      const p = this.successChance(c.check);
      success = this.game.rng.next() < p;
      out.checkResult = { stat: c.check.stat, chance: p, success };
      this.game.bus.emit('dialogue:check', { npcId: this.npc.id, success });
    }
    const branch = success ? c : c.fail || {};
    this.say(branch.variants ? this.pickVariant(branch.variants) : branch.say, out);
    this.effects(branch.effects, out);
    if (branch.next && !out.end) return this.runTopic(branch.next, out);
    if (branch.end) out.end = true;
    if (branch.stay && !out.end) out.options = this.choiceOptions(t);
    return this.finish(out);
  }

  // ---------------------------------------------------------------- gifts
  giftables() {
    return this.game.inventory.list().filter((e) => e.def.category !== 'key' && e.def.category !== 'quest');
  }

  giftMenu(out) {
    out.pages.push(`What will you give ${this.profile.shortName}?`);
    out.options = this.giftables().map((e) => ({ id: `gift:${e.id}`, label: `${e.def.name}${e.count > 1 ? ` ×${e.count}` : ''}` }));
    out.options.push({ id: 'back', label: 'Never mind.' });
    return out;
  }

  giftValue(itemId) {
    const prefs = this.profile.giftPrefs || {};
    if (prefs[itemId] !== undefined) return prefs[itemId];
    const def = this.game.content.items[itemId];
    let v = 1;
    for (const tag of def?.tags || []) if (prefs.tags?.[tag] !== undefined) v = Math.max(v, prefs.tags[tag]);
    for (const tag of def?.tags || []) if ((prefs.tags?.[tag] ?? 0) < 0) v = Math.min(v, prefs.tags[tag]);
    return v;
  }

  giveGift(itemId, out) {
    const g = this.game;
    if (!g.inventory.count(itemId)) return this.finish(out);
    const npc = this.npc;
    const day = g.clock.day;
    if (!npc.gifts || npc.gifts.day !== day) npc.gifts = { day, count: 0 };
    const value = this.giftValue(itemId);
    const lines = this.dlg.gift || {};
    g.inventory.remove(itemId, 1);
    if (g.player.stolen[itemId] === npc.id) {
      // Giving someone their own stolen property back as a "gift".
      this.say(this.pickVariant(lines.ownStolen || [['That\'s... mine. That is mine.']]), out);
      g.relationships.adjust(npc, 'player', { suspicion: 15, trust: -5 }, 'gift_stolen');
      return this.finish(out);
    }
    const scale = npc.gifts.count === 0 ? 1 : npc.gifts.count === 1 ? 0.5 : 0.15;
    npc.gifts.count++;
    const amount = Math.round(value * scale);
    let key = value >= 8 ? 'loved' : value >= 3 ? 'liked' : value >= 0 ? 'neutral' : 'disliked';
    if (scale < 0.3 && value > 0) key = 'tooMany';
    this.say(this.pickVariant(lines[key] || lines.neutral || [['Oh. Thank you.']]), out);
    g.relationships.adjust(npc, 'player', { affection: amount, trust: Math.round(amount / 3) }, 'gift');
    remember(npc, { text: `${g.player.name} gave me a ${g.content.items[itemId].name}.`, tag: `gift:${itemId}`, about: 'player', importance: value >= 8 ? 6 : 3 }, g.clock.total);
    g.bus.emit('npc:gift', { npcId: npc.id, itemId, value });
    return this.finish(out);
  }

  // --------------------------------------------------------------- gossip
  /** Mags-style gossip broker: she tells you something, or you tell her. */
  gossipMenu(out) {
    const g = this.game;
    const k = g.knowledge;
    const theirs = Object.entries(this.npc.knowledge || {})
      .filter(([id]) => {
        const def = g.content.facts[id];
        return def && def.spread !== false && !def.aboutPlayer && !k.knows(g.player, id);
      })
      .sort((a, b) => (g.content.facts[b[0]].importance ?? 0) - (g.content.facts[a[0]].importance ?? 0));
    if (theirs.length) {
      const [factId, entry] = theirs[0];
      this.say([this.factLine(factId, entry)], out);
      k.learn(g.player, factId, { kind: 'rumor', source: `told:${this.npc.id}`, at: g.clock.total, confidence: entry.confidence * 0.85 });
    } else {
      this.say(this.pickVariant(this.dlg.gossipEmpty || [['Nothing new, I\'m afraid.']]), out);
    }
    const tellable = this.tellableFacts();
    out.options = tellable.slice(0, 5).map((id) => ({ id: `tell:${id}`, label: `Tell: "${g.content.facts[id].text}"`, tag: 'tell' }));
    out.options.push({ id: 'back', label: 'Something else…' });
    return out;
  }

  tellableFacts() {
    const g = this.game;
    return Object.keys(g.player.knowledge || {}).filter((id) => {
      const def = g.content.facts[id];
      return def && !def.aboutPlayer && def.spread !== false && (def.importance ?? 0) < 7 && !g.knowledge.knows(this.npc, id);
    });
  }

  tellFact(factId, out) {
    const g = this.game;
    if (!this.tellableFacts().includes(factId)) return this.finish(out);
    g.knowledge.learn(this.npc, factId, { kind: 'rumor', source: 'told:player', at: g.clock.total, confidence: 0.85 });
    g.relationships.adjust(this.npc, 'player', { affection: 3, trust: 1 }, 'gossip');
    this.say(this.pickVariant(this.dlg.gossipThanks || [['Is that so? Thank you for telling me.']]), out);
    return this.finish(out);
  }

  factLine(factId, entry) {
    const def = this.game.content.facts[factId];
    const sp = this.profile.speech || {};
    const prefix = entry?.kind === 'fact' ? sp.factPrefix || 'I know that' : sp.rumorPrefix || 'I heard that';
    return `${prefix}… ${def.text}`;
  }

  // ------------------------------------------------------------ ask about
  /** Bounded keyword matching. Never invents facts. */
  ask(text) {
    const g = this.game;
    const out = this.node();
    const q = String(text || '').toLowerCase().trim();
    if (!q) return this.finish(out);
    const has = (kw) => q.includes(kw.toLowerCase());

    // 1. Authored topics with keywords
    const topic = this.availableTopics().find((t) => (t.keywords || []).some(has));
    if (topic) return this.runTopic(topic.id, out);

    // 2. Authored ask-about entries
    const entry = (this.dlg.askAbout || []).find((a) => a.keywords.some(has) && check(a.if, g, this.npc));
    if (entry) {
      this.say(entry.variants ? this.pickVariant(entry.variants) : entry.say, out);
      this.effects(entry.effects, out);
      return this.finish(out);
    }

    // 3. Other characters by name -> opinion shaped by the relationship
    for (const other of g.npcs.values()) {
      if (other.id === this.npc.id) continue;
      const names = [other.profile.shortName, ...other.profile.name.split(/[\s"]+/)].filter((n) => n.length > 2);
      if (names.some(has)) {
        const op = this.profile.opinions?.[other.id];
        const aff = g.relationships.get(this.npc, other.id).affection;
        out.pages.push(op ? (aff >= 10 ? op.warm : op.cool) : `${other.profile.shortName}? We've not had much to do with each other.`);
        return this.finish(out);
      }
    }

    // 4. Facts this character actually knows
    for (const [factId, k] of Object.entries(this.npc.knowledge || {})) {
      const def = g.content.facts[factId];
      if (!def || !(def.keywords || []).some(has)) continue;
      const trust = g.relationships.get(this.npc, 'player').trust;
      const secret = def.spread === false || def.secretOf === this.npc.id;
      if (secret && trust < 40) {
        out.pages.push(this.profile.speech?.refuse || 'That\'s not something I\'ll share.');
        return this.finish(out);
      }
      out.pages.push(this.factLine(factId, k));
      g.knowledge.learn(g.player, factId, { kind: 'rumor', source: `told:${this.npc.id}`, at: g.clock.total, confidence: k.confidence * 0.85 });
      return this.finish(out);
    }

    // 5. Unknown subject — stay in character, admit ignorance.
    this.say(this.pickVariant(this.dlg.unknown || [['I don\'t know anything about that.']]), out);
    return this.finish(out);
  }
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
