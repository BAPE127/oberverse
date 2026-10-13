// Relationship dimensions between characters (and toward the player).
// Values are clamped to [-100, 100]. Only dimensions that drive behaviour or
// dialogue are tracked; see docs/ARCHITECTURE.md#relationships.
export const DIMENSIONS = ['trust', 'affection', 'respect', 'suspicion'];

const clampRel = (v) => Math.max(-100, Math.min(100, Math.round(v)));

export class Relationships {
  constructor(bus) {
    this.bus = bus;
  }
  get(npc, targetId) {
    if (!npc.relationships[targetId]) npc.relationships[targetId] = { trust: 0, affection: 0, respect: 0, suspicion: 0 };
    return npc.relationships[targetId];
  }
  adjust(npc, targetId, deltas, reason = '') {
    const rel = this.get(npc, targetId);
    const applied = {};
    for (const [dim, d] of Object.entries(deltas || {})) {
      if (!DIMENSIONS.includes(dim) || !d) continue;
      const before = rel[dim] ?? 0;
      rel[dim] = clampRel(before + d);
      applied[dim] = rel[dim] - before;
    }
    if (Object.keys(applied).length) this.bus?.emit('rel:changed', { npcId: npc.id, targetId, applied, reason });
    return applied;
  }
  /** Overall disposition score used by shops, persuasion and greetings. */
  disposition(npc, targetId) {
    const r = this.get(npc, targetId);
    return r.trust * 0.4 + r.affection * 0.4 + r.respect * 0.2 - r.suspicion * 0.5;
  }
  label(npc, targetId) {
    const d = this.disposition(npc, targetId);
    if (d <= -40) return 'Hostile';
    if (d <= -12) return 'Wary';
    if (d < 8) return 'Stranger';
    if (d < 22) return 'Acquaintance';
    if (d < 45) return 'Friendly';
    return 'Close';
  }
}
