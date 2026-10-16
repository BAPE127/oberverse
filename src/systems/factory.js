// Calculator production (v0.12.0): warehouses, hand-crafting, and a grid
// factory of machines, conveyor belts and inserter arms, Factorio-style.
//
//   buy a warehouse (FOR SALE sign at the docks) ─▶ its door unlocks
//   parts: buy from Sal and carry them in, or (after 10 made) a daily delivery
//          into the input bay at 07:00
//   hand-craft at the workbench: core, shell, blank, tune  (slow, uses game time)
//   after 5 made, Sal sells machinery; press B in a warehouse to build:
//     machine (2×2): pulls its recipe's inputs, makes one output every N minutes
//     belt (1×1, facing): moves one item a minute to the next tile; at its end
//          it feeds straight into a machine or crate that will take the item
//     inserter (1×1, facing): moves one item a minute from the tile behind it
//          (crate, belt, machine output) to the tile in front, if that wants it
//     generator (2×2): powers four more machines (the wall socket powers the
//          first `basePower`)
//   v0.37.0, more Factorio:
//     inserters and sorters are walk-through (for you and the workers); belts
//          carry whoever stands on them
//     storage chest (1×1, wooden 100 / iron 300 items): placeable storage — inserters
//          and belts fill and empty it like the fixed crates; E opens it
//     filter inserter: an inserter set (E) to move only one item
//     sorter (1×1, facing, belt-like): an item matching its filter turns off to
//          its right; everything else carries straight on. Unfiltered, it
//          splits — alternating right and straight.
//
// Factory entities are runtime props on the warehouse maps (GameMap.addProp),
// so they draw, block and take E like any prop. State: game.world.factory.
// The simulation advances one step per game minute — on or off the map, and
// while time is skipped.
import { TILE, clamp } from '../core/util.js';
import { CALC_TYPES } from './calculators.js';

export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];
const MACHINE_BUFFER = 4; // ×recipe need, per input
export const OUTPUT_CAP = 10;
const DELIVERY_MINUTE = 7 * 60;
const WALKABLE = new Set(['belt', 'inserter', 'sorter']);
const BELT_PUSH = 56; // px/s: a belt carries whoever stands on it
export const CALC_ITEM = (t) => `item_calc_${t}`;

export function freshFactory(content) {
  const warehouses = {};
  for (const id of Object.keys(content.warehouses || {})) warehouses[id] = { entities: [], nextId: 1 };
  return { warehouses, made: 0, contract: null, contractTo: null, lastDelivery: 0 };
}

export class Factory {
  /**
   * @param {object} game
   * @param {object} [cfg] which world state, warehouse registry and interact kind this works on
   *   (the calculator factory uses the defaults; the arms works subclass passes its own).
   */
  constructor(game, cfg = {}) {
    this.game = game;
    this.cache = new Map();
    this.stateKey = cfg.stateKey || 'factory';
    this.defsKey = cfg.defsKey || 'warehouses';
    this.kind = cfg.kind || 'factory';
    this.domain = cfg.domain || 'calc';
    game.bus.on('maps:rebuilt', () => this.install());
  }

  defs() {
    return this.game.content[this.defsKey] || {};
  }

  fresh() {
    return freshFactory(this.game.content);
  }

  get state() {
    const g = this.game;
    if (!g.world[this.stateKey]) g.world[this.stateKey] = this.fresh();
    const st = g.world[this.stateKey];
    for (const id of Object.keys(this.defs())) if (!st.warehouses[id]) st.warehouses[id] = { entities: [], nextId: 1 };
    return st;
  }

  def(id) {
    return this.defs()[id];
  }

  /** The recipe a machine is running (null if none is set). */
  recipeOf(e) {
    return this.game.content.recipes[e.kind] || null;
  }

  /** Work done per game minute at this machine (staffing, skills, morale…). */
  rate() {
    return 1;
  }

  /** A machine finished one output. */
  produced(whId, m) {
    if (m.kind === 'tuner') this.madeOne();
  }

  owns(id) {
    return Boolean(this.game.getFlag(this.def(id)?.flag));
  }

  ownedIds() {
    return Object.keys(this.defs()).filter((id) => this.owns(id));
  }

  /** The warehouse whose interior this map is, if any. */
  warehouseForMap(mapId) {
    return Object.entries(this.defs()).find(([, w]) => w.map === mapId)?.[0] || null;
  }

  /** Deliveries go to the biggest warehouse you own. */
  deliveryTarget() {
    const ids = this.ownedIds();
    return ids.length ? ids.reduce((a, b) => (this.def(b).price > this.def(a).price ? b : a)) : null;
  }

  // ---------------------------------------------------------------- props
  /** Put every saved entity back on its map (after a new game, a load, or a map rebuild). */
  install() {
    const g = this.game;
    if (!g.world) return;
    this.cache.clear();
    for (const [id, wh] of Object.entries(this.state.warehouses)) {
      const map = g.maps.get(this.def(id)?.map);
      if (!map) continue;
      for (const e of wh.entities) {
        if (WALKABLE.has(e.type)) e.solid = false; // v0.37.0: older saves' inserters
        map.addProp(e);
      }
    }
  }

  /** Cell lookup for a warehouse: "x,y" → entity or a fixed crate. */
  cells(whId) {
    if (this.cache.has(whId)) return this.cache.get(whId);
    const def = this.def(whId);
    const map = this.game.maps.get(def.map);
    const cells = new Map();
    for (const p of map.props) {
      const crate = p.interact?.kind === 'container' && (p.interact.container === def.inBay || p.interact.container === def.outCrate) ? { chest: true, container: p.interact.container, out: p.interact.container === def.outCrate } : null;
      const ent = p.fx ? p : crate;
      if (!ent) continue;
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) cells.set(`${x},${y}`, ent);
    }
    const ents = this.state.warehouses[whId].entities;
    const belts = ents.filter((e) => e.type === 'belt');
    // downstream-first order: a belt's distance to the end of its line
    const dist = new Map();
    const distOf = (b0) => {
      const seen = new Set();
      let b = b0;
      let d = 0;
      while (b && !seen.has(b)) {
        if (dist.has(b)) { d += dist.get(b); break; }
        seen.add(b);
        const next = cells.get(`${b.x + DX[b.dir]},${b.y + DY[b.dir]}`);
        if (next?.type !== 'belt') break;
        b = next;
        d += 1;
      }
      return d;
    };
    for (const b of belts) dist.set(b, distOf(b));
    const out = {
      cells,
      belts: [...belts].sort((a, b) => dist.get(a) - dist.get(b)),
      inserters: ents.filter((e) => e.type === 'inserter'),
      sorters: ents.filter((e) => e.type === 'sorter'),
      machines: ents.filter((e) => e.type === 'machine'),
      generators: ents.filter((e) => e.type === 'generator'),
    };
    this.cache.set(whId, out);
    return out;
  }

  at(whId, x, y) {
    return this.cells(whId).cells.get(`${x},${y}`) || null;
  }

  // ------------------------------------------------------------- building
  /** Why you can't place a w×h thing at (x, y), or null if you can. */
  blockReason(whId, x, y, w, h) {
    const g = this.game;
    const def = this.def(whId);
    const map = g.maps.get(def.map);
    const keep = map.def.keepClear || [];
    const ptx = Math.floor(g.player.x / TILE);
    const pty = Math.floor(g.player.y / TILE);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!map.inBounds(xx, yy) || map.grid[yy][xx] !== 'g') return 'Not on the warehouse floor.';
        if (keep.some(([kx, ky]) => kx === xx && ky === yy)) return 'Keep the doorway clear.';
        if (map.props.some((p) => xx >= p.x && xx < p.x + p.w && yy >= p.y && yy < p.y + p.h)) return 'Something is already there.';
        if (xx === ptx && yy === pty) return 'You\'re standing there.';
      }
    }
    return null;
  }

  /** Place a machine/belt/inserter/generator item from your inventory. */
  place(whId, itemId, x, y, dir = 0) {
    const g = this.game;
    const item = g.content.items[itemId];
    if (!item?.build) return { ok: false, text: 'You can\'t build that.' };
    if (!this.owns(whId)) return { ok: false, text: 'This isn\'t your warehouse.' };
    if (!g.inventory.count(itemId)) return { ok: false, text: `You don't have a ${item.name}.` };
    const { type, kind, w = 1, h = 1, cap, filter } = item.build;
    const domain = item.build.domain || (type === 'machine' ? 'calc' : null);
    if (domain && domain !== this.domain) return { ok: false, text: domain === 'arms' ? 'Arms machinery goes in an arms works.' : 'That belongs in a calculator warehouse.' };
    const why = this.blockReason(whId, x, y, w, h);
    if (why) return { ok: false, text: why };
    const wh = this.state.warehouses[whId];
    const e = {
      id: `fx_${whId}_${wh.nextId++}`, fx: true, type, x, y, w, h, dir: ((dir % 4) + 4) % 4, item: itemId,
      solid: !WALKABLE.has(type), // v0.37.0: belts, inserters and sorters are walked through
      label: item.name,
    };
    if (type === 'storage') {
      Object.assign(e, { chest: true, container: `ct_${e.id}`, cap, interact: { kind: 'container', container: `ct_${e.id}` } });
      g.world.containers[e.container] = { items: {}, money: 0 };
    }
    if (filter || type === 'sorter') Object.assign(e, { filter: null, filterable: true, interact: { kind: this.kind, action: 'entity', warehouse: whId, name: item.name.toLowerCase() } });
    if (type === 'sorter') e.carry = null;
    if (type === 'machine') Object.assign(e, { kind, in: {}, out: {}, progress: 0, setting: this.initialSetting(kind), interact: { kind: this.kind, action: 'entity', warehouse: whId, name: item.name.toLowerCase() } });
    if (type === 'generator') e.interact = { kind: this.kind, action: 'entity', warehouse: whId, name: 'generator' };
    if (type === 'belt') e.carry = null;
    g.inventory.remove(itemId, 1);
    wh.entities.push(e);
    g.maps.get(this.def(whId).map).addProp(e);
    this.cache.delete(whId);
    g.bus.emit('factory:built', { warehouse: whId, id: e.id, type });
    return { ok: true, entity: e, text: `Placed: ${item.name}.` };
  }

  initialSetting(kind) {
    return kind === 'tuner' ? null : undefined;
  }

  /** Pick up whatever is at (x, y); its item and anything it held go back to your pockets. */
  remove(whId, x, y) {
    const g = this.game;
    const e = this.at(whId, x, y);
    if (!e || !e.fx) return { ok: false, text: 'Nothing to pick up there.' };
    const wh = this.state.warehouses[whId];
    wh.entities = wh.entities.filter((q) => q !== e);
    g.maps.get(this.def(whId).map).removeProp(e.id);
    this.cache.delete(whId);
    g.inventory.add(e.item, 1, { silent: true });
    const back = [];
    if (e.carry) back.push([e.carry, 1]);
    if (e.chest) { for (const [id, n] of Object.entries(g.world.containers[e.container]?.items || {})) if (n > 0) back.push([id, n]); delete g.world.containers[e.container]; }
    for (const buf of [e.in, e.out]) for (const [id, n] of Object.entries(buf || {})) if (n > 0) back.push([id, n]);
    for (const [id, n] of back) g.inventory.add(id, n, { silent: true });
    return { ok: true, text: `Picked up the ${g.content.items[e.item].name}${back.length ? ' and what was in it' : ''}.` };
  }

  /** Rotate a belt or inserter in place. */
  rotate(whId, x, y) {
    const e = this.at(whId, x, y);
    if (!e?.fx || !WALKABLE.has(e.type)) return { ok: false, text: 'Only belts, arms and sorters rotate.' };
    e.dir = (e.dir + 1) % 4;
    return { ok: true, text: '' };
  }

  setTuner(entityId, type) {
    const e = this.findEntity(entityId);
    if (!e || e.kind !== 'tuner' || !CALC_TYPES.includes(type)) return { ok: false, text: '' };
    e.setting = type;
    return { ok: true, text: `The tuning bench will make ${this.game.content.items[CALC_ITEM(type)].name}s.` };
  }

  findEntity(id) {
    for (const wh of Object.values(this.state.warehouses)) {
      const e = wh.entities.find((q) => q.id === id);
      if (e) return e;
    }
    return null;
  }

  whOf(entityId) {
    return Object.entries(this.state.warehouses).find(([, wh]) => wh.entities.some((q) => q.id === entityId))?.[0] || null;
  }

  // --------------------------------------------------------------- power
  power(whId) {
    const c = this.cells(whId);
    const capacity = (this.def(whId).basePower || 0) + 4 * c.generators.length;
    return { capacity, used: Math.min(capacity, c.machines.length), machines: c.machines.length };
  }

  powered(whId, e) {
    const c = this.cells(whId);
    return c.machines.indexOf(e) < this.power(whId).capacity;
  }

  // ---------------------------------------------------------- simulation
  recipeOut(e) {
    const r = this.recipeOf(e);
    if (e.kind === 'tuner') return e.setting ? CALC_ITEM(e.setting) : null;
    return r?.out || null;
  }

  /** Does this cell want this item right now? */
  accepts(target, itemId) {
    if (!target) return false;
    if (target.chest) {
      if (!target.cap) return true;
      const items = this.game.world.containers[target.container]?.items || {};
      return Object.values(items).reduce((a, b) => a + b, 0) < target.cap;
    }
    if (target.type === 'belt' || target.type === 'sorter') return !target.carry;
    if (target.type === 'machine') {
      const r = this.recipeOf(target);
      const need = r?.in[itemId];
      return Boolean(need) && (target.in[itemId] || 0) < need * MACHINE_BUFFER;
    }
    return false;
  }

  give(target, itemId) {
    const g = this.game;
    if (target.chest) {
      const st = g.world.containers[target.container];
      st.items[itemId] = (st.items[itemId] || 0) + 1;
    } else if (target.type === 'belt' || target.type === 'sorter') { target.carry = itemId; target.arrived = g.clock.total; }
    else if (target.type === 'machine') target.in[itemId] = (target.in[itemId] || 0) + 1;
  }

  /** Items a source cell can hand out (an inserter takes from the tile behind it). */
  offers(src) {
    const g = this.game;
    if (!src) return [];
    if (src.chest) return Object.entries(g.world.containers[src.container]?.items || {}).filter(([, n]) => n > 0).map(([id]) => id);
    if (src.type === 'belt' || src.type === 'sorter') return src.carry ? [src.carry] : [];
    if (src.type === 'machine') return Object.entries(src.out).filter(([, n]) => n > 0).map(([id]) => id);
    return [];
  }

  take(src, itemId) {
    const g = this.game;
    if (src.chest) g.world.containers[src.container].items[itemId] -= 1;
    else if (src.type === 'belt' || src.type === 'sorter') src.carry = null;
    else if (src.type === 'machine') src.out[itemId] -= 1;
  }

  /** One game minute of one warehouse. */
  step(whId) {
    const c = this.cells(whId);
    // belts: carry items forward one tile; the end of a line feeds a machine or crate
    // one pass, downstream first, so a moving line advances as a whole (and compresses)
    const moved = new Set();
    for (const b of c.belts) {
      if (!b.carry || moved.has(b)) continue;
      const next = this.at(whId, b.x + DX[b.dir], b.y + DY[b.dir]);
      if (!next || next === b || moved.has(next)) continue;
      if (next.type === 'belt' ? !next.carry : this.accepts(next, b.carry)) {
        this.give(next, b.carry);
        if (next.type === 'belt' || next.type === 'sorter') moved.add(next);
        b.carry = null;
        moved.add(b);
      }
    }
    // sorters: what matches the filter turns right; the rest goes straight on (unfiltered: alternate)
    for (const s of c.sorters) {
      if (!s.carry || moved.has(s)) continue;
      const right = (s.dir + 1) % 4;
      const straight = this.at(whId, s.x + DX[s.dir], s.y + DY[s.dir]);
      const side = this.at(whId, s.x + DX[right], s.y + DY[right]);
      const ok = (t) => t && t !== s && !moved.has(t) && this.accepts(t, s.carry);
      let out = null;
      if (s.filter) out = s.carry === s.filter ? side : straight;
      else {
        const first = s.flip ? side : straight;
        const other = s.flip ? straight : side;
        out = ok(first) ? first : other;
      }
      if (!ok(out)) continue;
      this.give(out, s.carry);
      if (out.type === 'belt' || out.type === 'sorter') moved.add(out);
      s.carry = null;
      s.flip = !s.flip;
      moved.add(s);
    }
    // inserters: one item a minute, behind → in front (a filter inserter: only its item)
    for (const ins of c.inserters) {
      const src = this.at(whId, ins.x - DX[ins.dir], ins.y - DY[ins.dir]);
      const dst = this.at(whId, ins.x + DX[ins.dir], ins.y + DY[ins.dir]);
      ins.busy = false;
      if (!src || !dst || src === dst) continue;
      if (ins.filterable && !ins.filter) continue; // a filter inserter with no filter set waits
      const item = this.offers(src).find((id) => (!ins.filter || id === ins.filter) && this.accepts(dst, id));
      if (!item) continue;
      this.take(src, item);
      this.give(dst, item);
      ins.busy = true;
    }
    // machines
    const cap = this.power(whId).capacity;
    c.machines.forEach((m, i) => {
      m.powered = i < cap;
      if (m.powered) this.stepMachine(whId, m);
    });
  }

  /** One game minute of one powered machine. */
  stepMachine(whId, m) {
    const r = this.recipeOf(m);
    if (!r) return;
    m.minutes = r.minutes;
    const out = this.recipeOut(m);
    if (!out) return;
    const rate = this.rate(whId, m);
    m.working = rate > 0;
    if (rate <= 0) return;
    if (m.progress > 0) {
      m.progress += rate;
      if (m.progress > r.minutes) {
        m.out[out] = (m.out[out] || 0) + 1;
        m.progress = 0;
        this.produced(whId, m, out);
      }
    }
    const outTotal = Object.values(m.out).reduce((a, b) => a + b, 0);
    if (m.progress === 0 && outTotal < OUTPUT_CAP && Object.entries(r.in).every(([id, n]) => (m.in[id] || 0) >= n)) {
      for (const [id, n] of Object.entries(r.in)) m.in[id] -= n;
      m.progress = 1;
    }
  }

  madeOne(n = 1) {
    const s = this.state;
    const before = s.made;
    s.made += n;
    const u = this.game.content.unlocks;
    if (before < u.machines && s.made >= u.machines) this.game.notify(`You've made ${s.made} calculators. Sal will sell you machinery now.`, 'quest');
    if (before < u.deliveries && s.made >= u.deliveries) this.game.notify(`You've made ${s.made} calculators. Sal will sign a delivery contract now.`, 'quest');
  }

  minuteTick() {
    const g = this.game;
    const s = this.state;
    for (const id of this.ownedIds()) if (s.warehouses[id].entities.length) this.step(id);
    if (this.domain === 'calc' && s.contract && g.clock.minuteOfDay === DELIVERY_MINUTE && s.lastDelivery < g.clock.day) this.deliver();
  }

  deliver() {
    const g = this.game;
    const s = this.state;
    s.lastDelivery = g.clock.day;
    const to = this.deliveryTarget();
    const d = g.content.deliveries[s.contract];
    if (!to || !d) return;
    if (g.player.money < d.price) {
      g.notify(`Sal's ${d.name.toLowerCase()} came — but you couldn't pay ${d.price} obols, so it went back on the van.`, 'warn');
      return;
    }
    g.player.money -= d.price;
    g.bus.emit('money:changed', { delta: -d.price, total: g.player.money });
    const st = g.world.containers[this.def(to).inBay];
    for (const [id, n] of Object.entries(d.items)) st.items[id] = (st.items[id] || 0) + n;
    g.notify(`🚚 Sal's ${d.name.toLowerCase()} was delivered to ${this.def(to).name}'s input bay. (−${d.price} obols)`, 'info');
    g.bus.emit('factory:delivery', { warehouse: to, contract: s.contract });
  }

  setContract(size) {
    const s = this.state;
    if (size && !this.game.content.deliveries[size]) return { ok: false, text: '' };
    s.contract = size || null;
    const to = this.deliveryTarget();
    return { ok: true, text: size ? `Delivery contract: ${this.game.content.deliveries[size].name}, every morning at 07:00 to ${this.def(to)?.name}.` : 'Deliveries cancelled.' };
  }

  // ---------------------------------------------------------- warehouses
  buyPrompt(whId) {
    const def = this.def(whId);
    if (this.owns(whId)) return { type: 'message', text: `${def.name} is yours. (The FOR SALE sign now says SOLD.)` };
    return {
      type: 'choices', title: def.name, text: `FOR SALE: ${def.name}, ${def.price} obols. Concrete floor, power for ${def.basePower} machines, an input bay and an output crate. "Enquiries: Port Authority. Or just leave the money under the door."`,
      options: [{ label: `Buy it for ${def.price} obols`, call: ['factory', 'buy', whId] }, { label: 'Not now', call: ['factory', 'noop'] }],
    };
  }

  noop() {
    return { ok: true, text: '' };
  }

  buy(whId) {
    const g = this.game;
    const def = this.def(whId);
    if (this.owns(whId)) return { ok: false, text: 'You already own it.' };
    if (g.player.money < def.price) return { ok: false, text: `${def.name} costs ${def.price} obols. You have ${g.player.money}.` };
    g.player.money -= def.price;
    g.bus.emit('money:changed', { delta: -def.price, total: g.player.money });
    g.setFlag(def.flag, true);
    g.bus.emit('factory:bought', { warehouse: whId });
    return { ok: true, text: `${def.name} is yours. Buy parts from Sal's Surplus down the quay, then craft at the workbench inside.` };
  }

  // ------------------------------------------------------------ crafting
  /** Count of an item in your pockets plus the warehouse's input bay. */
  have(whId, itemId) {
    const bay = this.game.world.containers[this.def(whId).inBay]?.items || {};
    return this.game.inventory.count(itemId) + (bay[itemId] || 0);
  }

  spend(whId, itemId, n) {
    const g = this.game;
    const fromPockets = Math.min(n, g.inventory.count(itemId));
    if (fromPockets) g.inventory.remove(itemId, fromPockets);
    const rest = n - fromPockets;
    if (rest) g.world.containers[this.def(whId).inBay].items[itemId] -= rest;
  }

  canCraft(whId, key) {
    const r = this.game.content.recipes[key];
    return Math.min(...Object.entries(r.in).map(([id, n]) => Math.floor(this.have(whId, id) / n)));
  }

  workbench(prop) {
    const g = this.game;
    const whId = prop.interact.warehouse;
    if (!this.owns(whId)) return { type: 'message', text: 'Not your workbench.' };
    const options = [];
    for (const key of ['solderer', 'press', 'assembler']) {
      const r = g.content.recipes[key];
      const n = this.canCraft(whId, key);
      const parts = Object.keys(r.in).map((id) => g.content.items[id].name).join(' + ');
      if (n > 0) {
        options.push({ label: `${r.verb} (${parts}) — ${r.handMinutes} min`, call: ['factory', 'craft', whId, key, null, 1] });
        if (n > 1) options.push({ label: `${r.verb} ×${n} — ${r.handMinutes * n} min`, call: ['factory', 'craft', whId, key, null, n] });
      }
    }
    const blanks = this.canCraft(whId, 'tuner');
    if (blanks > 0) {
      for (const t of CALC_TYPES) {
        const name = g.content.items[CALC_ITEM(t)].name;
        options.push({ label: `Tune ${blanks > 1 ? `all ${blanks} blanks` : 'a blank'} into ${name} — ${g.content.recipes.tuner.handMinutes * blanks} min`, call: ['factory', 'craft', whId, 'tuner', t, blanks] });
      }
    }
    options.push({ label: 'Build machinery (B)', call: ['factory', 'buildHint'] });
    options.push({ label: 'Done', call: ['factory', 'noop'] });
    const have = ['item_part_casing', 'item_part_keypad', 'item_part_screen', 'item_part_board', 'item_part_battery', 'item_calc_core', 'item_calc_shell', 'item_calc_blank']
      .map((id) => [g.content.items[id].name, this.have(whId, id)]).filter(([, n]) => n > 0).map(([nm, n]) => `${nm} ${n}`).join(' · ');
    return {
      type: 'choices', title: 'Workbench',
      text: `${have ? `On hand (pockets + input bay): ${have}.` : 'You have no parts. Sal\'s Surplus, down the quay, sells them.'} Made so far: ${this.state.made}.`,
      options,
    };
  }

  buildHint() {
    return { ok: true, text: 'Press B to build: pick a machine from the bar, R rotates, click to place, right-click to pick up. Buy machinery from Sal once you\'ve made five by hand.' };
  }

  /** Hand-craft n of a recipe (tuner: into `setting`). Takes game time. */
  craft(whId, key, setting, n = 1) {
    const g = this.game;
    const r = g.content.recipes[key];
    n = Math.min(n, this.canCraft(whId, key));
    if (n <= 0) return { ok: false, text: 'You don\'t have the parts.' };
    if (key === 'tuner' && !CALC_TYPES.includes(setting)) return { ok: false, text: '' };
    for (const [id, k] of Object.entries(r.in)) this.spend(whId, id, k * n);
    const out = key === 'tuner' ? CALC_ITEM(setting) : r.out;
    g.skipTime(r.handMinutes * n);
    g.inventory.add(out, n, { silent: true });
    if (key === 'tuner') this.madeOne(n);
    g.bus.emit('factory:crafted', { recipe: key, out, n });
    return { ok: true, text: `${n}× ${g.content.items[out].name} made by hand (${r.handMinutes * n} minutes).` };
  }

  // ------------------------------------------------------------ machines
  entityPrompt(prop) {
    const g = this.game;
    const e = prop;
    const whId = prop.interact.warehouse;
    if (e.filterable) return this.filterPrompt(whId, e);
    if (e.type === 'generator') {
      const p = this.power(whId);
      return { type: 'message', text: `Generator, humming. Power: ${p.machines} of ${p.capacity} machines.` };
    }
    const r = this.recipeOf(e);
    const out = this.recipeOut(e);
    const fmt = (buf) => Object.entries(buf).filter(([, n]) => n > 0).map(([id, n]) => `${g.content.items[id].name} ${n}`).join(', ') || 'empty';
    const status = !this.powered(whId, e) ? 'NO POWER — place a generator.' : !out ? 'Idle — choose what to make.' : this.statusExtra(whId, e) || (e.progress > 0 ? `Working: ${Math.round(((e.progress - 1) / r.minutes) * 100)}%.` : 'Waiting for inputs.');
    const options = [...this.settingOptions(e)];
    const outN = Object.values(e.out).reduce((a, b) => a + b, 0);
    if (outN) options.push({ label: `Collect output (${fmt(e.out)})`, call: [this.kind, 'collect', e.id] });
    const loadable = Object.keys(r?.in || {}).filter((id) => g.inventory.count(id));
    if (loadable.length) options.push({ label: 'Load inputs from your pockets', call: [this.kind, 'load', e.id] });
    options.push({ label: 'Done', call: [this.kind, 'noop'] });
    return { type: 'choices', title: g.content.items[e.item].name, text: `${status} Inputs: ${fmt(e.in)}. Output: ${fmt(e.out)}.`, options };
  }

  /** v0.37.0: set a filter inserter's or a sorter's item — from what this warehouse uses and holds. */
  filterPrompt(whId, e) {
    const g = this.game;
    const name = (id) => g.content.items[id]?.name || id;
    const options = this.filterCandidates(whId).map((id) => ({ label: `${name(id)}${e.filter === id ? ' (current)' : ''}`, call: [this.kind, 'setFilter', e.id, id] }));
    options.push({ label: e.type === 'sorter' ? 'No filter (split evenly)' : 'No filter (stop)', call: [this.kind, 'setFilter', e.id, null] });
    const what = e.type === 'sorter' ? 'Items matching the filter turn off to the right; everything else carries straight on.' : 'Moves only the filtered item.';
    return { type: 'choices', title: g.content.items[e.item].name, text: `${what} Filter: ${e.filter ? name(e.filter) : 'none'}.`, options };
  }

  /** Items worth filtering on here: every placed machine's inputs and outputs, and whatever the chests and crates hold. */
  filterCandidates(whId) {
    const g = this.game;
    const set = new Set();
    for (const m of this.cells(whId).machines) {
      const r = this.recipeOf(m);
      for (const id of Object.keys(r?.in || {})) set.add(id);
      const out = this.recipeOut(m);
      if (out) set.add(out);
    }
    const def = this.def(whId);
    const chests = [def.inBay, def.outCrate, ...this.state.warehouses[whId].entities.filter((x) => x.chest).map((x) => x.container)];
    for (const c of chests) for (const [id, n] of Object.entries(g.world.containers[c]?.items || {})) if (n > 0) set.add(id);
    return [...set].filter((id) => g.content.items[id]).sort();
  }

  setFilter(entityId, itemId) {
    const e = this.findEntity(entityId);
    if (!e?.filterable) return { ok: false, text: '' };
    e.filter = itemId || null;
    return { ok: true, text: itemId ? `Filter: ${this.game.content.items[itemId].name}.` : 'Filter cleared.' };
  }

  /** v0.37.0: a belt carries whoever stands on it (call each frame; the player only, on foot). */
  carryPlayer(dt) {
    const g = this.game;
    const p = g.player;
    const whId = this.warehouseForMap(p.map);
    if (!whId || p.driving) return;
    const e = this.at(whId, Math.floor(p.x / TILE), Math.floor((p.y - 2) / TILE));
    if (!e || (e.type !== 'belt' && e.type !== 'sorter')) return;
    const map = g.maps.get(p.map);
    const nx = p.x + DX[e.dir] * BELT_PUSH * dt;
    const ny = p.y + DY[e.dir] * BELT_PUSH * dt;
    if (!map.rectBlocked(nx - 8, ny - 6, 16, 8, g.playerActor())) { p.x = nx; p.y = ny; }
  }

  /** Recipe choices shown in a machine's panel. */
  settingOptions(e) {
    if (e.kind !== 'tuner') return [];
    return CALC_TYPES.map((t) => ({ label: `Make ${this.game.content.items[CALC_ITEM(t)].name}${e.setting === t ? ' (current)' : ''}`, call: ['factory', 'setTuner', e.id, t] }));
  }

  /** Extra status line (e.g. who's staffing the station); null for the default. */
  statusExtra() {
    return null;
  }

  collect(entityId) {
    const g = this.game;
    const e = this.findEntity(entityId);
    if (!e) return { ok: false, text: '' };
    let n = 0;
    for (const [id, k] of Object.entries(e.out)) if (k > 0) { g.inventory.add(id, k, { silent: true }); n += k; e.out[id] = 0; }
    return { ok: true, text: `Collected ${n} item${n === 1 ? '' : 's'}.` };
  }

  load(entityId) {
    const g = this.game;
    const e = this.findEntity(entityId);
    if (!e) return { ok: false, text: '' };
    const r = this.recipeOf(e);
    let n = 0;
    for (const [id, need] of Object.entries(r?.in || {})) {
      const room = need * MACHINE_BUFFER - (e.in[id] || 0);
      const k = clamp(g.inventory.count(id), 0, room);
      if (k > 0) { g.inventory.remove(id, k); e.in[id] = (e.in[id] || 0) + k; n += k; }
    }
    return { ok: true, text: n ? `Loaded ${n} item${n === 1 ? '' : 's'}.` : 'It\'s full.' };
  }

  interact(prop) {
    const act = prop.interact;
    if (act.action === 'buy') return this.buyPrompt(act.warehouse);
    if (act.action === 'workbench') return this.workbench(prop);
    if (act.action === 'entity') return this.entityPrompt(prop);
    return { type: 'none' };
  }
}
