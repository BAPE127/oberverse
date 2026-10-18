// Seamless buildings, part 2 (v0.47.0): every building's interior is laid over its footprint in
// world space. The interior stays its own map (so shops, homes, the works, quests and schedules
// all keep working), but it joins its street's region at the building's position, and the front
// door becomes a seamless crossing ("portal"): you walk in and out without a scene change, and
// from the street you see straight in — furniture, people and all.
//
// Buildings that never had an interior get one here (a room furnished for what the place is),
// locked as before if the building was closed. Round buildings (the lighthouse) keep their door.
import { roomTiles } from './mapBuilder.js';

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The interior of building `b` on street map `S`: { def, ex } (an existing map or null). */
export function realInterior(maps, S, b) {
  const to = b.door?.to?.map;
  const I = to && maps[to];
  if (!I || I.kind !== 'interior' || b.round) return null;
  const exit = (I.doors || []).find((d) => d.to?.map === S.id);
  if (!exit || exit.y !== I.tiles.length - 1) return null;
  return { def: I, exit };
}

/** What kind of room a building without an interior gets. */
function trade(b) {
  const name = `${b.sign || ''} ${b.name || ''} ${b.mapLabel || ''} ${b.id}`;
  if (b.shabby) return 'shack';
  if (/house|home|residence|cottage|boarding/i.test(name)) return 'house';
  if (/barn|elevator|silo/i.test(name)) return 'barn';
  if (/diner|cafe|bar\b|star|saloon|grill|lucky/i.test(name)) return 'diner';
  if (/church|mission|chapel/i.test(name)) return 'church';
  if (/school/i.test(name)) return 'school';
  if (/hotel/i.test(name)) return 'hotel';
  if (b.tower || /bank|bail|office|exchange|trust|insurance|hall|post|land|mutual|ledger|herald|telephone|ironclad|securities/i.test(name)) return 'office';
  if (/storage|cold|port|wh\d|depot|garage|repair|tractor|warehouse|gate|works/i.test(name)) return 'storage';
  if (/rialto|cinema|picture/i.test(name)) return 'cinema';
  return 'shop';
}

const FLOOR = { shack: 'f', house: 'f', barn: 'g', diner: 't', church: 'f', school: 'f', hotel: 'c', office: 'c', storage: 'g', cinema: 'c', shop: 't' };

/** Furniture for a room W×H (walls included) with its door at column dx, by trade. */
function furnish(kind, W, H, dx, idp, seed) {
  const props = [];
  const taken = new Set();
  const free = (x, y, w, h) => {
    if (x < 1 || y < 1 || x + w > W - 1 || y + h > H - 1) return false;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (taken.has(yy * W + xx)) return false;
      if (Math.abs(xx - dx) <= 1 && yy >= H - 3) return false; // the way in
    }
    return true;
  };
  const put = (type, x, y, w = 1, h = 1, extra = {}) => {
    if (!free(x, y, w, h)) return false;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) taken.add(yy * W + xx);
    props.push({ id: `${idp}_${type}_${x}_${y}`, type, x, y, ...(w > 1 ? { w } : {}), ...(h > 1 ? { h } : {}), ...extra });
    return true;
  };
  const iw = W - 2;
  const ih = H - 2;
  const rows = (fn, from = 3, step = 3) => { for (let y = from; y < H - 2; y += step) fn(y); };
  switch (kind) {
    case 'shack':
      put('cot', 1, 1, 1, 2); put('barrel', W - 2, 1); put('crate', W - 2, H - 3); put('rug', 2, Math.max(1, H - 3), Math.min(2, iw - 2), 1, { color: '#6a5a3a' });
      break;
    case 'house':
      put('bed', 1, 1, 1, 2, { color: ['#6f8fb5', '#b56f6f', '#7fa86a'][Math.floor(seed * 3)] }); put('wardrobe', 3, 1); put('stove', W - 2, 1);
      put('table', W - 3, Math.min(3, ih), 1, 1); put('chair', W - 4, Math.min(3, ih)); put('rug', 3, 3, 2, 2, { color: '#8e5a6e' }); put('plant', 1, H - 2);
      break;
    case 'barn':
      for (let x = 1; x < W - 1; x += 3) put('crate', x, 1);
      rows((y) => { for (let x = 2; x < W - 2; x += 4) put(hash(x, y + seed) > 0.5 ? 'barrel' : 'crate', x, y); });
      break;
    case 'diner':
      put('counter', 2, 1, Math.max(2, Math.min(iw - 3, 6)), 1); put('stove', W - 2, 1);
      rows((y) => { for (let x = 2; x < W - 3; x += 4) { put('table', x, y); put('chair', x + 1, y); } });
      put('plant', 1, H - 2); put('plant', W - 2, H - 2);
      break;
    case 'church':
      put('lectern', Math.floor(W / 2) - 1, 1, 2, 1);
      rows((y) => { put('bench', 2, y, Math.max(1, Math.floor(iw / 2) - 2), 1); put('bench', Math.floor(W / 2) + 1, y, Math.max(1, Math.floor(iw / 2) - 2), 1); }, 3, 2);
      break;
    case 'school':
      put('desk', 2, 1, 2, 1); put('cabinet', W - 2, 1);
      rows((y) => { for (let x = 2; x < W - 2; x += 3) { put('desk', x, y); put('chair', x, y + 1); } }, 3, 3);
      break;
    case 'hotel':
      put('counter', 2, 1, Math.min(4, iw - 2), 1); put('plant', W - 2, 1); put('rug', Math.floor(W / 2) - 1, 3, 3, 2, { color: '#6a1a24' });
      rows((y) => { put('chair', 2, y); put('table', 3, y); put('chair', W - 3, y); }, 3, 3);
      break;
    case 'office':
      for (let x = 1; x < W - 1; x += 2) put('cabinet', x, 1);
      rows((y) => { for (let x = 2; x < W - 2; x += 4) { put('desk', x, y); put('chair', x + 1, y); } });
      put('plant', 1, H - 2); put('plant', W - 2, H - 2);
      break;
    case 'storage':
      rows((y) => { for (let x = 2; x < W - 2; x += 3) if (hash(x * 3, y + seed) > 0.25) put(hash(x, y) > 0.6 ? 'barrel' : 'crate', x, y); }, 2, 2);
      put('workbench', W - 4, H - 3, 2, 1);
      break;
    case 'cinema':
      rows((y) => { for (let x = 2; x < W - 2; x++) put('chair', x, y); }, 3, 2);
      put('counter', 1, H - 3, 2, 1);
      break;
    default: // a shop
      for (let x = 1; x + 2 <= W - 1; x += 3) put('shelf', x, 1, 2, 1);
      rows((y) => { for (let x = 2; x + 2 <= W - 2; x += 5) put('display', x, y, 2, 1); }, 3, 3);
      put('counter', W - 4, H - 3, 2, 1);
  }
  return props;
}

/** A room for a building that never had one, the size of its footprint. */
function generatedInterior(S, b) {
  const W = b.w;
  const H = b.h;
  const dx = b.door ? b.door.x - b.x : -1;
  const id = `${S.id}__${b.id}`;
  const kind = trade(b);
  const tiles = roomTiles(W, H, FLOOR[kind], dx >= 0 ? dx : 0);
  if (dx < 0) tiles[H - 1] = 'W'.repeat(W);
  const def = {
    id, name: b.name || b.mapLabel || 'A building', kind: 'interior', ambience: 'amb_indoor', generated: true, shell: b.id, dwelling: kind === 'house' || kind === 'shack',
    tiles,
    doors: dx >= 0 ? [{ id: `door_${id}_exit`, x: dx, y: H - 1, to: { map: S.id, spot: `${b.id}_out` } }] : [],
    spots: {},
    props: furnish(kind, W, H, dx, id, hash(b.x, b.y)),
  };
  // where you'd stand: inside the door, or (a room with no door) the first clear floor
  const covered = (x, y) => def.props.some((p) => x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1));
  let entry = dx >= 0 ? { x: dx, y: H - 2, facing: 'up' } : null;
  for (let y = 1; !entry && y < H - 1; y++) for (let x = 1; !entry && x < W - 1; x++) if (!covered(x, y)) entry = { x, y, facing: 'down' };
  def.spots.entry = entry || { x: 1, y: 1, facing: 'down' };
  return { def, exit: def.doors[0] || null };
}

/**
 * Lay every building's interior over it. Mutates `maps` (adds generated interiors, resizes
 * buildings, turns doors into portals) and `regions` (interiors join their street's region).
 */
export function placeInteriors(maps, regions, streetIds) {
  const placed = [];
  for (const sid of streetIds) {
    const S = maps[sid];
    const region = Object.values(regions).find((r) => r.maps[sid]);
    if (!region) continue;
    const at = region.maps[sid];
    const grid = S.tiles.map((row) => row.split(''));
    for (const b of S.buildings || []) {
      if (b.round) continue;
      let I = realInterior(maps, S, b);
      if (!I) {
        if (b.door?.to?.map) continue; // a door to somewhere that isn't simply this building's room
        I = generatedInterior(S, b);
        maps[I.def.id] = I.def;
      }
      const W = I.def.tiles[0].length;
      const H = I.def.tiles.length;
      const ox = b.door ? b.door.x - I.exit.x : b.x;
      const oy = b.y + b.h - H;
      // the footprint becomes exactly the room; anything left over is yard
      const yard = yardTile(grid, b);
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        if (x < ox || x >= ox + W || y < oy || y >= oy + H) grid[y][x] = yard;
      }
      for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) {
        if (grid[y]?.[x] === '=') throw new Error(`interiors: ${I.def.id} would sit on the road at ${sid} ${x},${y}`);
        if (grid[y]) grid[y][x] = 'B';
      }
      Object.assign(b, { x: ox, y: oy, w: W, h: H, interior: I.def.id });
      if (b.door) {
        b.door = { ...b.door, seamless: true, portal: true, to: { ...(b.door.to || {}), map: I.def.id, spot: b.door.to?.spot || 'entry' } };
        S.spots = { ...S.spots, [`${b.id}_out`]: S.spots?.[`${b.id}_out`] || { x: b.door.x, y: b.door.y + 1, facing: 'down' } };
        I.exit.seamless = true;
        I.exit.portal = true;
        I.exit.keepTile = false;
      }
      region.maps[I.def.id] = { x: at.x + ox, y: at.y + oy, inside: sid };
      placed.push(I.def.id);
    }
    S.tiles = grid.map((r) => r.join(''));
    clearDoorsteps(S, grid);
  }
  return placed;
}

/** Nothing stands on a doorstep: a lamp or sign in front of a door moves a step aside. */
function clearDoorsteps(S, grid) {
  const at = (x, y) => (S.props || []).some((p) => x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1));
  for (const b of S.buildings || []) {
    if (!b.door) continue;
    for (const p of S.props || []) {
      if ((p.w || 1) > 1 || (p.h || 1) > 1) continue;
      if (Math.abs(p.x - b.door.x) > 0 || p.y < b.door.y + 1 || p.y > b.door.y + 2) continue;
      for (const dx of [2, -2, 3, -3]) {
        const x = p.x + dx;
        if (grid[p.y]?.[x] && !'B=W~'.includes(grid[p.y][x]) && !at(x, p.y)) { p.x = x; break; }
      }
    }
  }
}

/** The ground around a building (what its leftover footprint becomes). */
function yardTile(grid, b) {
  const n = {};
  for (let x = b.x - 1; x <= b.x + b.w; x++) for (const y of [b.y - 1, b.y + b.h]) {
    const ch = grid[y]?.[x];
    if (ch && !'B=WDx~'.includes(ch)) n[ch] = (n[ch] || 0) + 1;
  }
  for (let y = b.y; y < b.y + b.h; y++) for (const x of [b.x - 1, b.x + b.w]) {
    const ch = grid[y]?.[x];
    if (ch && !'B=WDx~'.includes(ch)) n[ch] = (n[ch] || 0) + 1;
  }
  return Object.keys(n).sort((a, c) => n[c] - n[a])[0] || ',';
}
