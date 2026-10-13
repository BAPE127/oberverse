// Knowledge boundaries. Characters (and the player) only know facts they
// acquired through a plausible channel: witnessing, being told, reading,
// hearing, occupation (innate), or public notices. Second-hand information is
// stored as a rumor with reduced confidence.
export class Knowledge {
  constructor(bus, facts) {
    this.bus = bus;
    this.facts = facts; // fact registry from content
  }
  knows(entity, factId) {
    return Boolean(entity?.knowledge?.[factId]);
  }
  entry(entity, factId) {
    return entity?.knowledge?.[factId] || null;
  }
  /**
   * @returns {boolean} true when the fact is new to this entity (or upgraded from rumor to fact)
   */
  learn(entity, factId, { kind = 'fact', source = 'innate', at = 0, confidence = 1 } = {}) {
    if (!this.facts[factId]) return false;
    entity.knowledge = entity.knowledge || {};
    const prev = entity.knowledge[factId];
    if (prev && (prev.kind === 'fact' || kind === 'rumor')) return false;
    entity.knowledge[factId] = { kind, source, at, confidence: Math.max(0, Math.min(1, confidence)) };
    this.bus?.emit('fact:learned', { who: entity.id, factId, kind, source, upgraded: Boolean(prev) });
    return true;
  }
  /**
   * One character tells another something they know. Personality decides
   * whether the speaker volunteers anything at all.
   * @returns {string|null} the shared fact id
   */
  gossip(speaker, listener, rng, now) {
    const sociability = speaker.profile?.personality?.sociability ?? 0.5;
    const discretion = speaker.profile?.personality?.discretion ?? 0.3;
    if (!rng.chance(0.2 + sociability * 0.6 - discretion * 0.3)) return null;
    const candidates = [];
    for (const [factId, k] of Object.entries(speaker.knowledge || {})) {
      const def = this.facts[factId];
      if (!def || def.spread === false || this.knows(listener, factId)) continue;
      if (def.secretOf === speaker.id && discretion > 0.4) continue;
      const age = Math.max(1, (now - k.at) / 60);
      candidates.push({ factId, k, weight: (def.importance ?? 3) * k.confidence / Math.sqrt(age) });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.weight - a.weight);
    const pick = candidates[0];
    const learned = this.learn(listener, pick.factId, {
      kind: 'rumor',
      source: `told:${speaker.id}`,
      at: now,
      confidence: pick.k.confidence * 0.85,
    });
    return learned ? pick.factId : null;
  }
  /** Every entity in `entities` learns a public fact (e.g. a notice is posted). */
  broadcast(entities, factId, source, at) {
    for (const e of entities) this.learn(e, factId, { kind: 'fact', source, at });
  }
}
