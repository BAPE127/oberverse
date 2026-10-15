// The world layout (v0.15.1; shared since v0.17.0): every outdoor map placed
// in one world space, in tiles. Seamless regions keep their offsets; regions
// joined by gateways sit side by side with ROAD_GAP tiles of open road between
// the gates. Used by the world map and by everything that travels between
// regions (the bus and traffic, src/systems/transit.js). Cached on the game.
import { TILE } from '../core/util.js';

export const ROAD_GAP = 10;

/**
 * Every outdoor map placed in one world space (tiles). Seamless regions keep
 * their offsets; regions joined by gateways are set side by side with a road
 * between the gates. Cached: the layout never changes in a session.
 */
export function worldLayout(g) {
  if (g.layoutCache) return g.layoutCache;
  const regions = Object.entries(g.content.regions || {});
  const regionOf = (id) => regions.find(([, r]) => r.maps[id]);
  const pos = {};
  const roads = [];
  const placeRegion = (rid, anchorMap, ax, ay) => {
    const r = g.content.regions[rid];
    const o = r.maps[anchorMap];
    for (const [id, m] of Object.entries(r.maps)) if (g.maps.has(id)) pos[id] = { x: ax + m.x - o.x, y: ay + m.y - o.y };
  };
  const start = regionOf(g.content.startingMap) || regions[0];
  placeRegion(start[0], Object.keys(start[1].maps)[0], 0, 0);
  const queue = Object.keys(pos);
  while (queue.length) {
    const id = queue.shift();
    const M = g.maps.get(id);
    for (const d of M.doors) {
      if (!d.gateway || !d.to?.map || pos[d.to.map] || !g.maps.has(d.to.map)) continue;
      const T = g.maps.get(d.to.map);
      const back = T.doors.find((e) => e.gateway && e.to?.map && regionOf(e.to.map)?.[0] === regionOf(id)?.[0]) || { x: d.x === 0 ? T.width - 1 : 0, y: d.y };
      // v0.29.0: gates on the top or bottom edge (Lariat, north of Halvermouth) stack regions vertically
      const north = d.y === 0 && d.x > 0 && d.x < M.width - 1;
      const south = d.y === M.height - 1 && d.x > 0 && d.x < M.width - 1;
      const before = new Set(Object.keys(pos));
      const rr = regionOf(T.id);
      if (north || south) {
        const tx = pos[id].x + d.x - back.x;
        const ty = north ? pos[id].y - T.height - ROAD_GAP : pos[id].y + M.height + ROAD_GAP;
        if (rr) placeRegion(rr[0], T.id, tx, ty); else pos[T.id] = { x: tx, y: ty };
        roads.push({ x1: pos[id].x + d.x + 1, y1: pos[id].y + d.y + (north ? 0 : 1), x2: tx + back.x + 1, y2: ty + back.y + (north ? 1 : 0) });
      } else {
        const west = d.x === 0;
        const tx = west ? pos[id].x - T.width - ROAD_GAP : pos[id].x + M.width + ROAD_GAP;
        const ty = pos[id].y + d.y - back.y;
        if (rr) placeRegion(rr[0], T.id, tx, ty); else pos[T.id] = { x: tx, y: ty };
        roads.push({ x1: pos[id].x + d.x + (west ? 0 : 1), y1: pos[id].y + d.y + 1, x2: tx + back.x + (west ? 1 : 0), y2: ty + back.y + 1 });
      }
      for (const k of Object.keys(pos)) if (!before.has(k)) queue.push(k);
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [id, p] of Object.entries(pos)) {
    const m = g.maps.get(id);
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + m.width); maxY = Math.max(maxY, p.y + m.height);
  }
  const regionBoxes = regions.map(([rid, r]) => {
    const ids = Object.keys(r.maps).filter((id) => pos[id]);
    if (!ids.length) return null;
    const xs = ids.map((id) => [pos[id].x, pos[id].x + g.maps.get(id).width]).flat();
    const ys = ids.map((id) => [pos[id].y, pos[id].y + g.maps.get(id).height]).flat();
    return { id: rid, name: r.name, maps: ids, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }).filter(Boolean);
  g.layoutCache = { pos, roads, regions: regionBoxes, bounds: { x: minX - 6, y: minY - 6, w: maxX - minX + 12, h: maxY - minY + 12 } };
  return g.layoutCache;
}

/** World tiles → { map, x, y } in that map's pixels (null between regions). */
export function worldToMap(g, wx, wy) {
  const L = worldLayout(g);
  for (const [id, o] of Object.entries(L.pos)) {
    const m = g.maps.get(id);
    if (wx >= o.x && wx < o.x + m.width && wy >= o.y && wy < o.y + m.height) return { map: id, x: (wx - o.x) * TILE, y: (wy - o.y) * TILE };
  }
  return null;
}

/** A map's pixels → world tiles. */
export function mapToWorld(g, mapId, x, y) {
  const o = worldLayout(g).pos[mapId];
  return o ? { x: o.x + x / TILE, y: o.y + y / TILE } : null;
}
