// Police patrol beats (v0.32.0): turn each beat's rough waypoints into spots
// on the pavement, so officers walk a real loop instead of standing at one
// point. Runs once at content load, after the roads are widened.
const WALKABLE = new Set([',', 'm', ':', 'g', 'u', '.']);

function snap(def, x, y) {
  const solid = (tx, ty) => (def.props || []).some((p) => p.solid !== false && ['streetlamp', 'tree', 'bench', 'hydrant', 'statue', 'fountain', 'bigsign', 'trafficlight', 'busstop', 'sign', 'noticeboard', 'flagpole', 'bush', 'pine'].includes(p.type) && tx >= p.x && tx < p.x + (p.w || 1) && ty >= p.y && ty < p.y + (p.h || 1));
  for (let r = 0; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = x + dx;
      const ty = y + dy;
      if (WALKABLE.has(def.tiles[ty]?.[tx]) && !solid(tx, ty)) return { x: tx, y: ty };
    }
  }
  return null;
}

/** Adds spots patrol_<beat>_<i> to the maps; returns { beatId: ['map:spot', ...] }. Mutates `maps`. */
export function buildPatrols(maps, patrols) {
  const out = {};
  for (const [id, beat] of Object.entries(patrols)) {
    out[id] = beat.points.map((pt, i) => {
      if (typeof pt === 'string') return pt;
      const def = maps[beat.map];
      const s = def && snap(def, pt[0], pt[1]);
      if (!s) return `${beat.map}:__missing_${id}_${i}`;
      def.spots = { ...def.spots, [`patrol_${id}_${i}`]: { x: s.x, y: s.y, facing: 'down' } };
      return `${beat.map}:patrol_${id}_${i}`;
    });
  }
  return out;
}
