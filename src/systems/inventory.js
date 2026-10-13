// Player inventory: item id -> count, with a parallel record of which stacks
// were obtained illegally (stolenFrom) so NPCs can react to stolen goods.
export class Inventory {
  constructor(game) {
    this.game = game;
  }
  get player() {
    return this.game.player;
  }
  def(id) {
    return this.game.content.items[id] || null;
  }
  count(id) {
    return this.player.inventory[id] || 0;
  }
  hasTag(tag) {
    return this.list().some((e) => e.def.tags?.includes(tag));
  }
  add(id, n = 1, { stolenFrom = null, silent = false } = {}) {
    if (!this.def(id) || n <= 0) return false;
    const inv = this.player.inventory;
    inv[id] = (inv[id] || 0) + n;
    if (stolenFrom) this.player.stolen[id] = stolenFrom;
    this.game.bus.emit('item:acquired', { id, count: n, total: inv[id], stolenFrom, silent });
    return true;
  }
  remove(id, n = 1) {
    const inv = this.player.inventory;
    if ((inv[id] || 0) < n) return false;
    inv[id] -= n;
    if (inv[id] <= 0) {
      delete inv[id];
      delete this.player.stolen[id];
    }
    this.game.bus.emit('item:removed', { id, count: n });
    return true;
  }
  list() {
    return Object.entries(this.player.inventory)
      .filter(([, c]) => c > 0)
      .map(([id, count]) => ({ id, count, def: this.def(id), stolenFrom: this.player.stolen[id] || null }))
      .filter((e) => e.def)
      .sort((a, b) => (a.def.category || '').localeCompare(b.def.category || '') || a.def.name.localeCompare(b.def.name));
  }
  /** Use a consumable. Returns a message describing the result. */
  use(id) {
    const def = this.def(id);
    if (!def || !this.count(id)) return { ok: false, text: 'You do not have that.' };
    if (!def.use) return { ok: false, text: def.examine || `You turn the ${def.name} over in your hands.` };
    this.remove(id, 1);
    if (def.use.calc) {
      const r = this.game.calculators.consume(def.use.calc, def);
      this.game.bus.emit('item:used', { id });
      return r;
    }
    const p = this.player;
    if (def.use.energy) p.energy = Math.min(100, p.energy + def.use.energy);
    if (def.use.health) p.health = Math.min(100, p.health + def.use.health);
    this.game.bus.emit('item:used', { id });
    return { ok: true, text: def.use.text || `You use the ${def.name}.` };
  }
}
