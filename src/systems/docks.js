// The Mill Road Yards berths, life-size (v0.27.0). Each berth shows one of
// your ports (Logistics.berth); its first two ships in port are moored
// either side of the pier, drawn full size, and you can walk up the gangway
// onto their decks — generated from each ship's design (src/world/shipDeck.js),
// with its fittings where they were placed — and down into the rooms below.
//
// Nothing here is saved: the decks are rebuilt from the fleet whenever what's
// moored changes (checked every game minute and whenever the maps are
// rebuilt, e.g. after loading). If a ship casts off with you aboard, you step
// back onto the pier.
import { TILE } from '../core/util.js';
import { deckPlan, belowDecks } from '../world/shipDeck.js';
import { GameMap } from '../world/gameMap.js';

const YARDS = 'yards';
const KEY = 'docks';

export class Docks {
  constructor(logistics) {
    this.L = logistics;
    this.sig = null;
    this.moored = []; // [{ vessel id, slot, side, x0, y0, plan, look, name }]
    this.added = { props: [], doors: [], spots: [], maps: [] };
    this.planCache = new Map();
    this.game.bus.on('maps:rebuilt', () => { this.sig = null; this.added = { props: [], doors: [], spots: [], maps: [] }; this.sync(); });
  }

  get game() {
    return this.L.game;
  }

  get yards() {
    return this.game.maps?.get(YARDS) || null;
  }

  /** The plan for a model, cached by what it looks like. */
  plan(model) {
    const k = JSON.stringify([model.look, model.tags, model.kind, model.bonuses]);
    if (!this.planCache.has(k)) this.planCache.set(k, deckPlan(model));
    return this.planCache.get(k);
  }

  /** What should be moored where, right now. */
  wanted() {
    const map = this.yards;
    const B = map?.def.berths;
    if (!B || !this.L.owned) return [];
    const out = [];
    B.piers.forEach((pier, slot) => {
      const b = this.L.berth(slot);
      if (!b) return;
      b.ships.slice(0, 2).forEach((v, side) => {
        const model = this.L.model(v.model);
        if (!model) return;
        const plan = this.plan(model);
        // side 0 lies west of the pier (its gangway on its east rail), side 1 east
        const x0 = side === 0 ? pier - 1 - plan.Bt : pier + 3;
        out.push({ id: v.id, name: v.name, slot, side, pier, x0, y0: B.row, plan, look: model.look, model });
      });
    });
    return out;
  }

  /** The ships moored at a berth (for drawing). */
  at(slot) {
    const b = this.L.berth(slot);
    if (!b) return null;
    return { name: b.name, more: Math.max(0, b.ships.length - 2), empty: !b.ships.length, ships: this.moored.filter((m) => m.slot === slot) };
  }

  /** Bring the berths up to date. Cheap when nothing has changed. */
  sync() {
    const map = this.yards;
    if (!map) return;
    const want = this.wanted();
    const sig = JSON.stringify(want.map((w) => [w.id, w.name, w.slot, w.side, w.plan.Lt, w.plan.Bt, w.look]));
    if (sig === this.sig) return;
    const leaving = this.moored.filter((m) => !want.some((w) => w.id === m.id && w.slot === m.slot && w.side === m.side));
    this.clear();
    this.sig = sig;
    this.moored = want;
    for (const m of want) this.moor(m);
    this.rescue(leaving);
  }

  clear() {
    const map = this.yards;
    if (!map) return;
    for (const id of this.added.props) map.removeProp(id);
    for (const id of this.added.doors) map.removeDoor(id);
    for (const id of this.added.spots) delete map.spots[id];
    for (const id of this.added.maps) if (this.game.player?.map !== id) this.game.maps.delete(id);
    map.setWalkable(KEY, null);
    this.added = { props: [], doors: [], spots: [], maps: [] };
    this.moored = [];
  }

  /** Tie one ship up: its deck becomes walkable; its fittings, gangway and doors appear. */
  moor(m) {
    const map = this.yards;
    const g = this.game;
    const { plan, x0, y0, side, id } = m;
    const v = this.L.vessel(id);
    const X = (c) => x0 + c;
    const Y = (a) => y0 + a;
    const idx = (x, y) => y * map.width + x;
    const walk = new Set(map.walkOver.get(KEY) || []);
    for (let a = 1; a < plan.Lt - 1; a++) {
      const [c0, c1] = plan.rows[a];
      for (let c = c0 + 1; c < c1; c++) if (map.inBounds(X(c), Y(a))) walk.add(idx(X(c), Y(a)));
    }
    // the gangway: through the rail, over the gap to the pier
    const ga = plan.gangwayRow;
    const rail = side === 0 ? plan.rows[ga][1] : plan.rows[ga][0];
    const gx0 = Math.min(X(rail), m.pier + (side === 0 ? 0 : 1));
    const gx1 = Math.max(X(rail), m.pier + (side === 0 ? 0 : 1));
    for (let x = gx0; x <= gx1; x++) walk.add(idx(x, Y(ga)));
    map.setWalkable(KEY, walk);
    const add = (p) => { map.addProp(p); this.added.props.push(p.id); };
    add({ id: `dk_${id}_gangway`, type: 'gangway', x: Math.min(X(rail), side === 0 ? X(rail) : m.pier + 2), y: Y(ga), w: Math.abs(X(rail) - (side === 0 ? m.pier : m.pier + 1)), h: 1, solid: false, name: `${m.name}'s gangway`, examine: `The ${m.name}'s gangway. It bounces a little.` });
    // the deckhouse, its door and the rooms below
    const look = m.look;
    const comps = this.L.cfg.components;
    const inside = `ship_${id}`;
    const deckSpot = `deck_${id}`;
    if (plan.house) {
      const h = plan.house;
      add({ id: `dk_${id}_house`, type: 'deckhouse', x: X(h.c0), y: Y(h.a0), w: h.c1 - h.c0 + 1, h: h.a1 - h.a0 + 1, solid: true, look, face: h.face, family: plan.family, name: `${m.name}'s bridge`, examine: `The ${m.name}'s bridge. The door's on the ${h.face === 'fore' ? 'forward' : 'aft'} side.` });
      const outside = h.face === 'fore' ? { x: X(h.door.c), y: Y(h.door.a + 1), facing: 'up' } : { x: X(h.door.c), y: Y(h.door.a - 1), facing: 'down' };
      map.spots[deckSpot] = outside;
      map.addDoor({ id: `dk_${id}_door`, x: X(h.door.c), y: Y(h.door.a), keepTile: true, label: `the ${m.name}`, to: { map: inside, spot: 'entry' } });
    } else {
      // a sailing ship (or an open boat): the wheel on deck aft, a companionway down
      add({ id: `dk_${id}_wheel`, type: 'shipwheel', x: X(plan.wheel.c), y: Y(plan.wheel.a), w: 1, h: 1, solid: true, name: 'Ship\'s wheel', interact: { kind: 'logistics', action: 'wheel', vessel: id, name: 'ship\'s wheel' }, examine: `The ${m.name}'s wheel.` });
      add({ id: `dk_${id}_hatch`, type: 'companionway', x: X(plan.hatch.c), y: Y(plan.hatch.a), w: 1, h: 1, solid: false, name: 'Companionway' });
      map.spots[deckSpot] = { x: X(plan.hatch.c), y: Y(plan.hatch.a + 1), facing: 'down' };
      map.addDoor({ id: `dk_${id}_door`, x: X(plan.hatch.c), y: Y(plan.hatch.a), keepTile: true, label: `below decks on the ${m.name}`, to: { map: inside, spot: 'entry' } });
    }
    this.added.doors.push(`dk_${id}_door`);
    this.added.spots.push(deckSpot);
    // every fitted part, where it was placed
    for (const p of plan.parts) {
      const c = comps[p.id];
      add({ id: `dk_${id}_p${p.slot}`, type: 'deckpart', key: p.key, comp: p.id, x: X(p.c0), y: Y(p.a0), w: p.c1 - p.c0 + 1, h: p.a1 - p.a0 + 1, solid: true, look, slot: p.slot, name: c?.name || 'Fitting', examine: c ? `${c.name}. ${c.text}` : '' });
    }
    plan.cannons.forEach((q, k) => add({ id: `dk_${id}_gun${k}`, type: 'deckpart', key: 'cannon', comp: 'c_cannon', x: X(q.c), y: Y(q.a), w: 1, h: 1, solid: true, look, east: q.c > plan.Bt / 2, name: 'Cannon', examine: 'A cannon on its carriage, run out and lashed. Polished, loaded with nothing but pride.' }));
    // below decks
    if (v) {
      const def = belowDecks(v, m.model, { map: YARDS, spot: deckSpot });
      g.maps.set(inside, new GameMap(def, g.content.propTypes));
      this.added.maps.push(inside);
    }
  }

  /** Anyone left standing where a ship was steps back onto the pier. */
  rescue(leaving) {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    for (const m of leaving) {
      const onDeck = p.map === YARDS && p.x >= m.x0 * TILE && p.x < (m.x0 + m.plan.Bt) * TILE && p.y >= m.y0 * TILE && p.y < (m.y0 + m.plan.Lt) * TILE;
      const below = p.map === `ship_${m.id}`;
      if (!onDeck && !below) continue;
      if (below) g.maps.delete(`ship_${m.id}`);
      const pier = { x: (m.pier + 0.5) * TILE, y: (m.y0 + m.plan.gangwayRow + 0.5) * TILE };
      if (p.map !== YARDS) g.changeMap(YARDS, null, pier);
      else Object.assign(p, pier);
      g.notify(`The ${m.name} casts off — you hop back onto the pier.`, 'event');
    }
    // a stale "below decks" map with nobody in it
    for (const id of [...g.maps.keys()]) if (id.startsWith('ship_') && !this.added.maps.includes(id) && p.map !== id) g.maps.delete(id);
  }
}
