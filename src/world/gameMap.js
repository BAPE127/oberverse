// Runtime representation of a map: tile grid, buildings, doors, props, named
// spots and named areas. Pure logic (no DOM) so it can be tested headlessly.
import { TILE_TYPES } from './tiles.js';
import { TILE } from '../core/util.js';

export class GameMap {
  /**
   * @param {object} def map definition from src/content/maps
   * @param {object} propTypes prop type registry (content/props.js)
   */
  constructor(def, propTypes = {}) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.kind = def.kind || 'outdoor';
    this.music = def.music || null;
    this.ambience = def.ambience || null;
    this.height = def.tiles.length;
    this.width = def.tiles[0].length;
    this.grid = def.tiles.map((row) => row.split(''));
    this.spots = { ...(def.spots || {}) };
    this.areas = def.areas || [];
    this.buildings = def.buildings || [];
    this.doors = [];
    this.doorIndex = new Map();
    this.props = [];
    this.propBlock = new Set();
    this.propIndex = new Map();

    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.grid[y][x] = 'B';
      if (b.door) {
        this.addDoor({ id: `door_${b.id}`, building: b.id, label: b.name, ...b.door });
      }
    }
    for (const d of def.doors || []) this.addDoor(d);

    for (const p of def.props || []) {
      const type = propTypes[p.type] || {};
      const prop = { w: 1, h: 1, ...type.defaults, ...p, solid: p.solid ?? type.solid ?? false };
      this.props.push(prop);
      this.propIndex.set(prop.id, prop);
      // Props that only appear under conditions (e.g. future derricks) never block movement.
      if (prop.solid && !prop.hiddenUnless) {
        for (let y = prop.y; y < prop.y + prop.h; y++)
          for (let x = prop.x; x < prop.x + prop.w; x++) this.propBlock.add(y * this.width + x);
      }
    }
  }

  /** Add a building at runtime (finished properties). */
  addBuilding(b) {
    if (this.buildings.some((x) => x.id === b.id)) return;
    this.buildings = [...this.buildings, b];
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.grid[y][x] = 'B';
    if (b.door) this.addDoor({ id: `door_${b.id}`, building: b.id, label: b.name, ...b.door });
  }

  addDoor(d) {
    const door = { ...d };
    if (!door.keepTile) this.grid[door.y][door.x] = 'D';
    this.doors.push(door);
    this.doorIndex.set(door.y * this.width + door.x, door);
  }

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  tileAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.grid[ty][tx] : 'x';
  }

  tileType(tx, ty) {
    return TILE_TYPES[this.tileAt(tx, ty)] || TILE_TYPES.x;
  }

  doorAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.doorIndex.get(ty * this.width + tx) || null : null;
  }

  /**
   * @param {object} [actor] object with optional canPass(door) used for locked doors
   */
  blockedTile(tx, ty, actor) {
    if (!this.inBounds(tx, ty)) return true;
    const door = this.doorAt(tx, ty);
    if (door) return actor?.canPass ? !actor.canPass(door) : false;
    if (TILE_TYPES[this.grid[ty][tx]]?.solid) return true;
    return this.propBlock.has(ty * this.width + tx);
  }

  /** Axis-aligned pixel rectangle collision against the tile grid. */
  rectBlocked(px, py, w, h, actor) {
    const x0 = Math.floor(px / TILE);
    const y0 = Math.floor(py / TILE);
    const x1 = Math.floor((px + w - 0.001) / TILE);
    const y1 = Math.floor((py + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.blockedTile(tx, ty, actor)) return true;
    return false;
  }

  spot(name) {
    return this.spots[name] || null;
  }

  /** Pixel coordinates of a spot's centre (feet position). */
  spotPx(name) {
    const s = this.spot(name);
    return s ? { x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE, facing: s.facing } : null;
  }

  areaAt(tx, ty) {
    for (const a of this.areas) if (tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return a;
    return null;
  }

  prop(id) {
    return this.propIndex.get(id) || null;
  }

  /** Clear line of sight between two tile coordinates (walls/buildings block; props do not). */
  lineOfSight(ax, ay, bx, by) {
    let x = ax;
    let y = ay;
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 512; guard++) {
      if (x === bx && y === by) return true;
      const ch = this.tileAt(x, y);
      if ((x !== ax || y !== ay) && (ch === 'B' || ch === 'W' || ch === 'x')) return false;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return false;
  }
}
