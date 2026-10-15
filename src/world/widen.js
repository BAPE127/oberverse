// Wider roads (v0.20.0). Maps are authored with 2-tile roads; at load every
// listed road row/column is doubled to 4 tiles (one full lane each way) by
// duplicating it, and everything after it moves along. Buildings keep their
// place in their blocks; areas and crosswalks stretch to span the new width.
//
//   widenMap(def, { rows, cols, by }) → { def, fx, fy }
//     rows / cols: the FIRST row/column of each 2-tile road (as authored)
//     fx / fy: authored coordinate → widened coordinate (fractions allowed)

/** Prop types that span a road and so stretch with it. */
const STRETCH = new Set(['crosswalk']);

export function shiftFn(starts, by) {
  const at = [...starts].sort((a, b) => a - b).map((s) => s + 1); // inserted just after the road's first line
  return (v) => {
    let n = 0;
    for (const p of at) if (v >= p) n++;
    return v + n * by;
  };
}

/** A rectangle [x, x+w) mapped: it grows by `by` for each insertion strictly inside it. */
function spanFn(f) {
  return (x, w) => {
    const nx = f(x);
    return { x: nx, w: f(x + w - 1) + 1 - nx };
  };
}

export function widenMap(def, { rows = [], cols = [], by = 2 }) {
  const fx = shiftFn(cols, by);
  const fy = shiftFn(rows, by);
  const sx = spanFn(fx);
  const sy = spanFn(fy);
  const colSet = new Set(cols);
  const rowSet = new Set(rows);
  // tiles
  const out = [];
  for (let y = 0; y < def.tiles.length; y++) {
    const src = def.tiles[y];
    let line = '';
    for (let x = 0; x < src.length; x++) line += colSet.has(x) ? src[x].repeat(by + 1) : src[x];
    out.push(line);
    if (rowSet.has(y)) for (let k = 0; k < by; k++) out.push(line);
  }
  const pt = (o) => ({ ...o, x: fx(o.x), y: fy(o.y) });
  const rect = (o) => {
    const a = sx(o.x, o.w ?? 1);
    const b = sy(o.y, o.h ?? 1);
    return { ...o, x: a.x, y: b.x, ...(o.w !== undefined ? { w: a.w } : {}), ...(o.h !== undefined ? { h: b.w } : {}) };
  };
  // doors: a door on a widened road line (a gate) is copied across the new lines
  const doors = [];
  for (const d of def.doors || []) {
    const base = pt(d);
    doors.push(base);
    if (colSet.has(d.x)) for (let k = 1; k <= by; k++) doors.push({ ...base, id: `${d.id}_w${k}`, x: base.x + k });
    if (rowSet.has(d.y)) for (let k = 1; k <= by; k++) doors.push({ ...base, id: `${d.id}_w${k}`, y: base.y + k });
  }
  const widened = {
    ...def,
    tiles: out,
    doors,
    buildings: (def.buildings || []).map((b) => ({ ...rect({ ...b, w: b.w, h: b.h }), door: b.door ? pt(b.door) : b.door })),
    spots: Object.fromEntries(Object.entries(def.spots || {}).map(([k, s]) => [k, pt(s)])),
    areas: (def.areas || []).map(rect),
    props: (def.props || []).map((p) => {
      const q = STRETCH.has(p.type) ? rect(p) : pt(p);
      if (p.sortRow !== undefined) q.sortRow = fy(p.sortRow);
      return q;
    }),
    keepClear: (def.keepClear || []).map(([x, y]) => [fx(x), fy(y)]),
  };
  return { def: widened, fx, fy };
}

/** Which roads each outdoor map widens (the first line of each 2-tile road, as authored). */
export const ROADS = {
  halvermouth: { rows: [1, 12, 36, 60, 71], cols: [14, 38, 62, 86] },
  lanternside: { rows: [12], cols: [30] },
  westbrook: { rows: [12] },
  ober_fields: { rows: [12] },
  yards: { cols: [40] },
};

/**
 * Widen every listed map in place (MAPS by id). Returns per-map coordinate
 * shifts { [mapId]: { fx, fy } } for content authored in the old coordinates.
 */
export function widenAll(maps, roads = ROADS) {
  const shifts = {};
  for (const [id, r] of Object.entries(roads)) {
    if (!maps[id]) continue;
    const { def, fx, fy } = widenMap(maps[id], r);
    maps[id] = def;
    shifts[id] = { fx, fy };
  }
  return shifts;
}

/** Shift a content point { map, x, y } authored in old coordinates. */
export function shiftPoint(shifts, p) {
  const s = shifts[p.map];
  return s ? { ...p, x: s.fx(p.x), y: s.fy(p.y) } : p;
}
