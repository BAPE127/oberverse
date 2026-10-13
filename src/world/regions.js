// Region helpers: stitch side-by-side outdoor maps into one continuous space.
import { TILE_TYPES } from './tiles.js';

function solidPropAt(def, propTypes, x, y) {
  return (def.props || []).some((p) => {
    const t = propTypes[p.type] || {};
    const solid = p.solid ?? t.solid;
    const w = p.w ?? t.defaults?.w ?? 1;
    const h = p.h ?? t.defaults?.h ?? 1;
    return solid && !p.hiddenUnless && x >= p.x && x < p.x + w && y >= p.y && y < p.y + h;
  });
}

function walkable(def, propTypes, x, y) {
  const ch = def.tiles[y]?.[x];
  if (ch === undefined || TILE_TYPES[ch]?.solid) return false;
  for (const b of def.buildings || []) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return false;
  return !solidPropAt(def, propTypes, x, y);
}

/**
 * Adds seamless doors to map definitions along shared seam columns.
 * Mutates `maps` (definitions, before GameMap construction). Idempotent.
 */
export function addSeams(maps, regions, propTypes) {
  for (const region of Object.values(regions)) {
    const entries = Object.entries(region.maps);
    for (const [aId, a] of entries) {
      for (const [bId, b] of entries) {
        const A = maps[aId];
        const B = maps[bId];
        if (!A || !B || aId === bId) continue;
        const wA = A.tiles[0].length;
        if (b.x !== a.x + wA - 1) continue; // only horizontal seams (B to the east of A)
        const ax = wA - 1;
        A.doors = (A.doors || []).filter((d) => !(d.seamless && d.to.map === bId));
        B.doors = (B.doors || []).filter((d) => !(d.seamless && d.to.map === aId));
        for (let gy = Math.max(a.y, b.y); gy < Math.min(a.y + A.tiles.length, b.y + B.tiles.length); gy++) {
          const ya = gy - a.y;
          const yb = gy - b.y;
          if (!walkable(A, propTypes, ax, ya) || !walkable(B, propTypes, 0, yb)) continue;
          A.doors.push({ id: `seam_${aId}_${bId}_${gy}`, x: ax, y: ya, keepTile: true, seamless: true, label: `Toward ${region.name}`, to: { map: bId, spot: b.fallbackSpot } });
          B.doors.push({ id: `seam_${bId}_${aId}_${gy}`, x: 0, y: yb, keepTile: true, seamless: true, label: `Toward ${region.name}`, to: { map: aId, spot: a.fallbackSpot } });
        }
      }
    }
  }
  return maps;
}

/** Pixel offset of map `otherId` relative to `mapId` (null if not in the same region). */
export function regionOffsetPx(regions, mapId, otherId, tile) {
  for (const region of Object.values(regions)) {
    const a = region.maps[mapId];
    const b = region.maps[otherId];
    if (a && b) return { x: (b.x - a.x) * tile, y: (b.y - a.y) * tile };
  }
  return null;
}

/** The region a map belongs to, with its id. */
export function regionOf(regions, mapId) {
  for (const [id, region] of Object.entries(regions)) if (region.maps[mapId]) return { id, ...region };
  return null;
}
