// Holes blown in walls in the open world (v0.106.0; content and rules in src/content/destruction.js). A heavy-weapons blast or a vehicle
// ramming at speed opens the wall tiles of a building it reaches. A hole is a pair of seamless portal doors, one on the street (the
// building's footprint tile) and one in the room (its wall tile), so people walk through it exactly as through a front door; rubble lies
// outside it. Holes are kept in `world.breaches` and laid again on every load (maps are rebuilt from content, then this state is applied,
// the v0.88 pattern). Mason's Os bricks a hole up for a fee. Buildings never collapse.
//
// Every hole is first put to the damage gate (src/war/damage.js) under the building's structure id; the gate refuses an imported
// character's building always, a government building while no coup has been staged, and the core of your base while it is protected.
import { TILE } from '../core/util.js';
import { BREACH, GOVERNMENT_STREETS, GOVERNMENT_BUILDINGS } from '../content/destruction.js';
import { register, apply as damageApply } from '../war/damage.js';
import { isProtected } from './combat.js';

const sid = (street, b) => `bld:${street}:${b.id}`;

export class Breaches {
  constructor(game) { this.game = game; this.importedMaps = null; }

  get list() { const w = this.game.world; if (!w.breaches) w.breaches = []; return w.breaches; }

  afterLoad() { this.importedMaps = null; for (const r of this.list) this.open(r); }

  /** Map ids where an imported character lives or works (schedule blocks of work and sleep, and their home): their buildings are never damaged. */
  imported() {
    if (this.importedMaps) return this.importedMaps;
    const g = this.game; const out = new Set();
    for (const npc of g.npcs?.values?.() || []) {
      if (!isProtected(npc)) continue;
      for (const blk of npc.profile.schedule || []) { if (!['work', 'sleep', 'home'].includes(blk.activity)) continue; const m = String(blk.spot || '').split(':')[0]; if (m) out.add(m); } // (where they live and work, not every café they eat in)
      const home = g.homes?.homeOf?.(npc.id); if (home?.map) out.add(home.map);
    }
    this.importedMaps = out; return out;
  }

  /** Whose a building is, for the gate: 'imported', 'government', 'company' or 'civil'. */
  ownerOf(street, b) {
    if (this.imported().has(b.interior)) return 'imported';
    if (GOVERNMENT_STREETS.includes(street) || GOVERNMENT_BUILDINGS.includes(b.id)) return 'government';
    if (b.facility || street === 'hollowmoor_lot') return 'company';
    return 'civil';
  }

  /** The gate's record for a building (made on first use). */
  structure(street, b) {
    const owner = this.ownerOf(street, b);
    return register(this.game, sid(street, b), { owner, core: owner === 'company', hp: BREACH.hp, name: b.name || b.mapLabel || 'a building' });
  }

  /** The outward step of a wall tile of a building's room (x, y in room tiles), or null for a corner or an inner tile. */
  static normal(b, ix, iy) {
    const edgeX = ix === 0 ? -1 : ix === b.w - 1 ? 1 : 0; const edgeY = iy === 0 ? -1 : iy === b.h - 1 ? 1 : 0;
    if ((edgeX && edgeY) || (!edgeX && !edgeY)) return null;
    return { x: edgeX, y: edgeY };
  }

  /** The wall tiles of street `S`'s buildings a blast at world px (x, y) on S with radius R px can open, nearest first. */
  candidates(S, x, y, R) {
    const g = this.game; const out = [];
    for (const b of S.buildings || []) {
      if (!b.interior) continue; const I = g.maps.get(b.interior); if (!I) continue;
      const cx = Math.max(b.x * TILE, Math.min(x, (b.x + b.w) * TILE)); const cy = Math.max(b.y * TILE, Math.min(y, (b.y + b.h) * TILE));
      if (Math.hypot(cx - x, cy - y) > R) continue;
      for (let iy = 0; iy < b.h; iy++) for (let ix = 0; ix < b.w; ix++) {
        const n = Breaches.normal(b, ix, iy); if (!n) continue;
        if (I.tileAt(ix, iy) !== 'W') continue; // (already open, a window, the front door)
        const tx = b.x + ix; const ty = b.y + iy; const ox = tx + n.x; const oy = ty + n.y;
        if (S.blockedTile(ox, oy)) continue; // (against another building, water, a fence: no way out there)
        if (b.door && Math.abs(b.door.x - tx) + Math.abs(b.door.y - ty) <= 1) continue;
        const d = Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y); if (d > R) continue;
        out.push({ b, ix, iy, tx, ty, ox, oy, d });
      }
    }
    return out.sort((a, c) => a.d - c.d);
  }

  /** The street a map belongs to (itself, or the street a room is laid in) and the offset of `mapId`'s px in it. */
  streetOf(mapId) {
    const g = this.game; const m = g.maps.get(mapId); if (!m) return null;
    if (m.kind !== 'interior') return { S: m, ox: 0, oy: 0 };
    for (const n of g.neighbors(mapId)) if (n.map.kind !== 'interior') { const off = g.mapOffset(n.map.id, mapId); if (off) return { S: n.map, ox: off.x, oy: off.y }; }
    return null;
  }

  /** A blast of `radiusTiles` and `damage` at px (x, y) on `mapId`: opens up to BREACH.perBlast wall tiles. Returns how many opened. */
  blast(mapId, x, y, radiusTiles, damage, source = 'explosion') {
    if (!(damage >= BREACH.minDamage)) return 0;
    const st = this.streetOf(mapId); if (!st) return 0;
    const R = radiusTiles * TILE * BREACH.reach; const px = x + st.ox; const py = y + st.oy;
    let n = 0; const refused = new Set();
    for (const c of this.candidates(st.S, px, py, R)) {
      if (n >= BREACH.perBlast) break;
      if (refused.has(c.b.id)) continue;
      const r = this.make(st.S, c, source);
      if (r === 'refused') refused.add(c.b.id); else if (r) n++;
    }
    if (n) this.game.bus.emit('sfx', { id: 'sfx_explosion' });
    return n;
  }

  /** A vehicle at px (x, y) on `mapId` hit a wall moving at `speed` px a second towards (dx, dy): opens the tile it hit. */
  ram(mapId, x, y, dx, dy, speed) {
    if (!(speed >= BREACH.ramSpeed)) return 0;
    const st = this.streetOf(mapId); if (!st) return 0;
    const ahead = { x: x + st.ox + Math.sign(dx) * TILE * 0.8, y: y + st.oy + Math.sign(dy) * TILE * 0.8 };
    const c = this.candidates(st.S, ahead.x, ahead.y, TILE * 0.9)[0]; if (!c) return 0;
    return this.make(st.S, c, 'vehicle') === true ? 1 : 0;
  }

  /** Open one wall tile, if the gate allows it. Returns true, 'refused' or false. */
  make(S, c, source) {
    const g = this.game; this.structure(S.id, c.b);
    const r = damageApply(g, sid(S.id, c.b), BREACH.hpPerTile, source);
    if (!r.ok && r.refused && this.ownerOf(S.id, c.b) === 'government') g.army?.raise('an attack on a government building', true); // v0.106.0: the 4th star
    if (!r.ok) { if (r.refused && !this.warned?.has(c.b.id)) { (this.warned ||= new Set()).add(c.b.id); g.notify?.(r.text, 'info'); } return r.refused ? 'refused' : false; }
    const rec = { street: S.id, b: c.b.id, x: c.tx, y: c.ty, ix: c.ix, iy: c.iy, ox: c.ox, oy: c.oy, day: g.clock.day };
    this.list.push(rec); this.open(rec);
    while (this.list.length > BREACH.keep) this.close(this.list[0], false);
    g.reportCrime?.({ fact: 'fact_player_explosion', map: S.id, x: (c.tx + 0.5) * TILE, y: (c.ty + 0.5) * TILE, radius: 12 });
    return true;
  }

  /** Lay a hole into the maps: the two portal doors, the rubble outside, the room's wall tile gone. */
  open(rec) {
    const g = this.game; const S = g.maps.get(rec.street); const b = S?.buildings.find((q) => q.id === rec.b); const I = b && g.maps.get(b.interior);
    if (!S || !I) return false;
    const id = `breach_${rec.b}_${rec.x}_${rec.y}`; const spot = `${id}_out`;
    if (S.doorIndex.has(rec.y * S.width + rec.x) && S.doorAt(rec.x, rec.y)?.id === id) return true; // (already laid)
    S.spots[spot] = { x: rec.ox, y: rec.oy, facing: 'down' };
    S.addDoor({ id, x: rec.x, y: rec.y, building: b.id, breach: true, seamless: true, portal: true, label: 'a hole in the wall', to: { map: I.id, spot: 'entry' } });
    for (const p of [...I.props]) if (rec.ix >= p.x && rec.ix < p.x + (p.w || 1) && rec.iy >= p.y && rec.iy < p.y + (p.h || 1) && (p.w || 1) === 1 && (p.h || 1) === 1) I.removeProp(p.id); // (a window or a picture on that bit of wall)
    I.addDoor({ id: `${id}_in`, x: rec.ix, y: rec.iy, breach: true, seamless: true, portal: true, label: 'a hole in the wall', to: { map: S.id, spot } });
    S.addProp({ id: `${id}_rubble`, type: 'rubble', x: rec.ox, y: rec.oy, w: 1, h: 1, examine: 'Broken brick and plaster where a wall used to be.', interact: { kind: 'breach_repair', breach: id } });
    return true;
  }

  /** Brick a hole up (Mason's Os's work, or its owner's when there are too many): the doors and the rubble go, the wall comes back. */
  close(rec, notify = true) {
    const g = this.game; const S = g.maps.get(rec.street); const b = S?.buildings.find((q) => q.id === rec.b); const I = b && g.maps.get(b.interior);
    const id = `breach_${rec.b}_${rec.x}_${rec.y}`;
    if (S) { S.removeDoor(id); S.grid[rec.y][rec.x] = 'B'; S.removeProp(`${id}_rubble`); delete S.spots[`${id}_out`]; }
    if (I) { I.removeDoor(`${id}_in`); I.grid[rec.iy][rec.ix] = 'W'; }
    const i = this.list.indexOf(rec); if (i >= 0) this.list.splice(i, 1);
    if (notify) g.notify?.(`Mason's Os have bricked up the hole in ${b?.name || 'the wall'}.`, 'info');
  }

  byId(id) { return this.list.find((r) => `breach_${r.b}_${r.x}_${r.y}` === id) || null; }

  /** Hire Mason's Os to brick up a hole: paid from your wallet. */
  repair(id) {
    const g = this.game; const rec = this.byId(id); if (!rec) return { ok: false, text: 'There is no hole there now.' };
    const p = g.player; const cost = BREACH.repairCost;
    if (p.money < cost) return { ok: false, text: `Mason's Os would brick this up for ${cost} obols. You have ${p.money}.` };
    const pl = g.player; const S = g.maps.get(rec.street);
    if (pl.map === rec.street && Math.floor(pl.x / TILE) === rec.x && Math.floor(pl.y / TILE) === rec.y) return { ok: false, text: 'Step out of the hole first.' };
    void S;
    p.money -= cost; g.bus.emit('money:changed', { delta: -cost, total: p.money });
    this.close(rec);
    return { ok: true, text: `Mason's Os bricked it up for ${cost} obols. "A wall-to-wall service," says the foreman.` };
  }
}
